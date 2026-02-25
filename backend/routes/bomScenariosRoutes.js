const express = require('express');
const router  = express.Router();
const authenticateToken = require('../authenticateToken');
const {
    getScenariosByBOM,
    getScenarioWithDetails,
    createScenario,
    updateScenario,
    deleteScenario,
    upsertScenarioDetail,
    deleteScenarioDetail,
    calculateScenarioCost,
} = require('../queries/bomScenariosManagement');

// =============================================
// GET /api/bom-scenarios/bom/:bomId
// Tutti gli scenari di un BOMId
// =============================================
router.get('/bom/:bomId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const bomId     = parseInt(req.params.bomId);

        if (!bomId) return res.status(400).json({ success: 0, msg: 'bomId non valido' });

        const scenarios = await getScenariosByBOM(companyId, bomId);
        res.json({ success: 1, data: scenarios });
    } catch (err) {
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// =============================================
// GET /api/bom-scenarios/:scenarioId
// Scenario con tutti i dettagli di override
// =============================================
router.get('/:scenarioId', authenticateToken, async (req, res) => {
    try {
        const companyId  = req.user.CompanyId;
        const scenarioId = parseInt(req.params.scenarioId);

        const scenario = await getScenarioWithDetails(companyId, scenarioId);
        if (!scenario) return res.status(404).json({ success: 0, msg: 'Scenario non trovato' });

        res.json({ success: 1, data: scenario });
    } catch (err) {
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// =============================================
// POST /api/bom-scenarios
// Crea un nuovo scenario
// Body: { bomId, title, description? }
// =============================================
router.post('/', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId    = req.user.UserId;
        const { bomId, title, description, pathsSnapshot } = req.body;

        if (!bomId)  return res.status(400).json({ success: 0, msg: 'bomId obbligatorio' });
        if (!title)  return res.status(400).json({ success: 0, msg: 'title obbligatorio' });

        // pathsSnapshot può essere un array (vecchio formato) o un oggetto {c:[...], r:[...]}
        const snapshotStr = pathsSnapshot == null
            ? null
            : (typeof pathsSnapshot === 'string' ? pathsSnapshot : JSON.stringify(pathsSnapshot));

        const result = await createScenario(companyId, userId, bomId, title, description, snapshotStr);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// =============================================
// PUT /api/bom-scenarios/:scenarioId
// Aggiorna titolo e descrizione dello scenario
// Body: { title, description? }
// =============================================
router.put('/:scenarioId', authenticateToken, async (req, res) => {
    try {
        const companyId  = req.user.CompanyId;
        const scenarioId = parseInt(req.params.scenarioId);
        const { title, description } = req.body;

        if (!title) return res.status(400).json({ success: 0, msg: 'title obbligatorio' });

        const result = await updateScenario(companyId, scenarioId, title, description);
        if (!result.success) return res.status(404).json(result);

        res.json(result);
    } catch (err) {
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// =============================================
// DELETE /api/bom-scenarios/:scenarioId
// Elimina uno scenario (cascade sui dettagli)
// =============================================
router.delete('/:scenarioId', authenticateToken, async (req, res) => {
    try {
        const companyId  = req.user.CompanyId;
        const scenarioId = parseInt(req.params.scenarioId);

        const result = await deleteScenario(companyId, scenarioId);
        if (!result.success) return res.status(404).json(result);

        res.json(result);
    } catch (err) {
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// =============================================
// PUT /api/bom-scenarios/:scenarioId/details
// Salva (INSERT o UPDATE) un override di componente o routing.
// Auto-elimina la riga se tutti i valori sono NULL/default.
//
// Body componente (RowType = 'C'):
//   { RowType, AncestralPath, Quantity_Sc?, UnitCost_Sc?,
//     FixedCost_Sc?, IsBuy?, Notes? }
//
// Body routing (RowType = 'R'):
//   { RowType, BOMId_Rt, RtgStep, ProcessingTime_Sc?,
//     SetupTime_Sc?, Qty_Sc?, Notes? }
// =============================================
router.put('/:scenarioId/details', authenticateToken, async (req, res) => {
    try {
        const companyId  = req.user.CompanyId;
        const scenarioId = parseInt(req.params.scenarioId);
        const detail     = req.body;

        if (!detail.RowType || !['C', 'R'].includes(detail.RowType)) {
            return res.status(400).json({ success: 0, msg: 'RowType non valido (usa C o R)' });
        }
        if (detail.RowType === 'C' && !detail.AncestralPath) {
            return res.status(400).json({ success: 0, msg: 'AncestralPath obbligatorio per RowType C' });
        }
        if (detail.RowType === 'R' && (!detail.BOMId_Rt || detail.RtgStep == null)) {
            return res.status(400).json({ success: 0, msg: 'BOMId_Rt e RtgStep obbligatori per RowType R' });
        }

        const result = await upsertScenarioDetail(companyId, scenarioId, detail);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// =============================================
// DELETE /api/bom-scenarios/:scenarioId/details/:detailId
// Elimina un singolo override per Id
// =============================================
router.delete('/:scenarioId/details/:detailId', authenticateToken, async (req, res) => {
    try {
        const companyId  = req.user.CompanyId;
        const scenarioId = parseInt(req.params.scenarioId);
        const detailId   = parseInt(req.params.detailId);

        const result = await deleteScenarioDetail(companyId, scenarioId, detailId);
        if (!result.success) return res.status(404).json(result);

        res.json(result);
    } catch (err) {
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// =============================================
// POST /api/bom-scenarios/:scenarioId/calculate
// Calcola la costificazione BOM con gli override dello scenario.
// Non aggiorna mai la BOM ufficiale.
//
// Body: { bomId, orderQuantity?, scrapPercentage?, useKnownData?, debug? }
// =============================================
router.post('/:scenarioId/calculate', authenticateToken, async (req, res) => {
    try {
        const companyId  = req.user.CompanyId;
        const scenarioId = parseInt(req.params.scenarioId);
        const {
            bomId,
            orderQuantity   = null,
            scrapPercentage = null,
            useKnownData    = true,
            debug           = false,
        } = req.body;

        if (!bomId) return res.status(400).json({ success: 0, msg: 'bomId obbligatorio' });

        const result = await calculateScenarioCost(companyId, bomId, scenarioId, {
            orderQuantity,
            scrapPercentage,
            useKnownData,
            debug,
        });
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: 0, msg: err.message });
    }
});

module.exports = router;
