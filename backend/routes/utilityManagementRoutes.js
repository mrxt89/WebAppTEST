const express = require('express');
const router = express.Router();
const authenticateToken = require('../authenticateToken');
const utilityQueries = require('../queries/utilityManagement');

/**
 * Routes per la gestione delle utility BOM
 * Centri di Lavoro e Operazioni
 */

// =============================================
// CENTRI DI LAVORO
// =============================================

// GET /api/utility/work-centers - Ottieni tutti i centri di lavoro
router.get('/work-centers', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const workCenters = await utilityQueries.getWorkCenters(companyId);
        
        res.json({
            success: true,
            message: 'Centri di lavoro recuperati con successo',
            data: workCenters,
            count: workCenters.length
        });
    } catch (error) {
        console.error('Error getting work centers:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei centri di lavoro',
            error: error.message
        });
    }
});

// GET /api/utility/work-centers/:originalId - Ottieni un centro di lavoro specifico
router.get('/work-centers/:originalId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { originalId } = req.params;
        
        const workCenter = await utilityQueries.getWorkCenter(companyId, parseInt(originalId));
        
        res.json({
            success: true,
            message: 'Centro di lavoro recuperato con successo',
            data: workCenter
        });
    } catch (error) {
        console.error('Error getting work center:', error);
        
        if (error.message.includes('non trovato')) {
            return res.status(404).json({
                success: false,
                message: 'Centro di lavoro non trovato',
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del centro di lavoro',
            error: error.message
        });
    }
});

// POST /api/utility/work-centers - DISABILITATO (sincronizzazione ERP)
router.post('/work-centers', authenticateToken, async (req, res) => {
    res.status(403).json({
        success: false,
        message: 'Creazione centri di lavoro disabilitata: i dati vengono sincronizzati dal gestionale ERP'
    });
});

// PUT /api/utility/work-centers/:originalId - Aggiorna solo i costi di un centro di lavoro
router.put('/work-centers/:originalId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const { originalId } = req.params;
        const workCenterData = req.body;
        
        // Validazione campi obbligatori per i costi
        const { hourlyCost, waitTime } = workCenterData;
        
        if (hourlyCost === undefined || waitTime === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Campi obbligatori per l\'aggiornamento: hourlyCost, waitTime'
            });
        }
        
        const result = await utilityQueries.updateWorkCenterCosts(companyId, parseInt(originalId), workCenterData, userId);
        
        res.json(result);
    } catch (error) {
        console.error('Error updating work center costs:', error);
        
        if (error.message.includes('non trovato')) {
            return res.status(404).json({
                success: false,
                message: 'Centro di lavoro non trovato',
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento dei costi del centro di lavoro',
            error: error.message
        });
    }
});

// DELETE /api/utility/work-centers/:originalId - DISABILITATO (sincronizzazione ERP)
router.delete('/work-centers/:originalId', authenticateToken, async (req, res) => {
    res.status(403).json({
        success: false,
        message: 'Eliminazione centri di lavoro disabilitata: i dati vengono sincronizzati dal gestionale ERP'
    });
});

// =============================================
// OPERAZIONI
// =============================================

// GET /api/utility/operations - Ottieni tutte le operazioni
router.get('/operations', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const operations = await utilityQueries.getOperations(companyId);
        
        res.json({
            success: true,
            message: 'Operazioni recuperate con successo',
            data: operations,
            count: operations.length
        });
    } catch (error) {
        console.error('Error getting operations:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle operazioni',
            error: error.message
        });
    }
});

// GET /api/utility/operations/:originalId - Ottieni un'operazione specifica
router.get('/operations/:originalId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { originalId } = req.params;
        
        const operation = await utilityQueries.getOperation(companyId, parseInt(originalId));
        
        res.json({
            success: true,
            message: 'Operazione recuperata con successo',
            data: operation
        });
    } catch (error) {
        console.error('Error getting operation:', error);
        
        if (error.message.includes('non trovata')) {
            return res.status(404).json({
                success: false,
                message: 'Operazione non trovata',
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dell\'operazione',
            error: error.message
        });
    }
});

// POST /api/utility/operations - DISABILITATO (sincronizzazione ERP)
router.post('/operations', authenticateToken, async (req, res) => {
    res.status(403).json({
        success: false,
        message: 'Creazione operazioni disabilitata: i dati vengono sincronizzati dal gestionale ERP'
    });
});

// PUT /api/utility/operations/:originalId - Aggiorna solo i costi di un'operazione
router.put('/operations/:originalId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const { originalId } = req.params;
        const operationData = req.body;
        
        // Validazione campi obbligatori per i costi
        const { unitCost, fixedCost, waitTime, setupTime, productionTime, active } = operationData;
        
        if (unitCost === undefined || fixedCost === undefined || 
            waitTime === undefined || setupTime === undefined || productionTime === undefined || !active) {
            return res.status(400).json({
                success: false,
                message: 'Campi obbligatori per l\'aggiornamento: unitCost, fixedCost, waitTime, setupTime, productionTime, active'
            });
        }
        
        const result = await utilityQueries.updateOperationCosts(companyId, parseInt(originalId), operationData, userId);
        
        res.json(result);
    } catch (error) {
        console.error('Error updating operation costs:', error);
        
        if (error.message.includes('non trovata')) {
            return res.status(404).json({
                success: false,
                message: 'Operazione non trovata',
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento dei costi dell\'operazione',
            error: error.message
        });
    }
});

// DELETE /api/utility/operations/:originalId - DISABILITATO (sincronizzazione ERP)
router.delete('/operations/:originalId', authenticateToken, async (req, res) => {
    res.status(403).json({
        success: false,
        message: 'Eliminazione operazioni disabilitata: i dati vengono sincronizzati dal gestionale ERP'
    });
});

// PUT /api/utility/operations/:originalId/toggle-active - Toggle stato attivo/inattivo
router.put('/operations/:originalId/toggle-active', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const { originalId } = req.params;
        const { active } = req.body;
        
        if (active === undefined || (active !== '1' && active !== '0')) {
            return res.status(400).json({
                success: false,
                message: 'Il campo active deve essere "1" o "0"'
            });
        }
        
        const result = await utilityQueries.toggleOperationActive(companyId, parseInt(originalId), active, userId);
        
        res.json(result);
    } catch (error) {
        console.error('Error toggling operation active status:', error);
        
        if (error.message.includes('non trovata')) {
            return res.status(404).json({
                success: false,
                message: 'Operazione non trovata',
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Errore nel cambio stato dell\'operazione',
            error: error.message
        });
    }
});

// =============================================
// STATISTICHE E UTILITY
// =============================================

// GET /api/utility/stats - Ottieni statistiche per dashboard
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const stats = await utilityQueries.getUtilityStats(companyId);
        
        res.json({
            success: true,
            message: 'Statistiche recuperate con successo',
            data: stats
        });
    } catch (error) {
        console.error('Error getting utility stats:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle statistiche',
            error: error.message
        });
    }
});

module.exports = router;
