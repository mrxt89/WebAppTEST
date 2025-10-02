const express = require('express');
const router = express.Router();
const knownDataManagement = require('../queries/knownDataManagement');
const authenticateToken = require('../authenticateToken');

// ========================================
// ROUTE PER GESTIONE DATI NOTI
// ========================================

/**
 * GET /api/known-data
 * Ottiene tutti i dati noti per una company
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.query; // Prendi companyId dalla query string
        const { dataType } = req.query; // Opzionale: 'MATERIAL' o 'OPERATION'
        
        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'CompanyId mancante nella query string'
            });
        }
        
        const result = await knownDataManagement.getAllKnownData(parseInt(companyId), dataType);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Errore nella route GET /api/known-data:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error.message
        });
    }
});

/**
 * GET /api/known-data/item/:itemCode/:dataType
 * Ottiene i dati noti per un singolo articolo/operazione
 */
router.get('/item/:itemCode/:dataType', authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.query;
        const { itemCode, dataType } = req.params;
        
        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'CompanyId mancante nella query string'
            });
        }
        
        const result = await knownDataManagement.getKnownDataForItem(companyId, itemCode, dataType);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Errore nella route GET /api/known-data/item:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error.message
        });
    }
});

/**
 * POST /api/known-data/parameter
 * Crea un nuovo parametro per i dati noti
 */
router.post('/parameter', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const { companyId, ...parameterData } = req.body;
        
        // Debug log
        console.log('Known Data Parameter Creation:', {
            companyId,
            userId,
            parameterData
        });
        
        // Validazione companyId
        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'CompanyId mancante nel body della richiesta'
            });
        }
        
        // Assicurati che companyId sia un numero
        const numericCompanyId = parseInt(companyId);
        if (isNaN(numericCompanyId)) {
            return res.status(400).json({
                success: false,
                message: 'CompanyId non valido'
            });
        }
        
        // Validazione base - itemCode può essere vuoto se c'è itemDescription
        if (!parameterData.dataType || !parameterData.parameterName) {
            return res.status(400).json({
                success: false,
                message: 'Dati mancanti: dataType e parameterName sono obbligatori'
            });
        }
        
        // Se itemCode è vuoto, itemDescription deve essere presente
        if (!parameterData.itemCode && !parameterData.itemDescription) {
            return res.status(400).json({
                success: false,
                message: 'Dati mancanti: itemCode o itemDescription devono essere specificati'
            });
        }
        
        const result = await knownDataManagement.createKnownDataParameter(numericCompanyId, parameterData, userId);
        
        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Errore nella route POST /api/known-data/parameter:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error.message
        });
    }
});

/**
 * PUT /api/known-data/parameter/:parameterId
 * Aggiorna un parametro esistente
 */
router.put('/parameter/:parameterId', authenticateToken, async (req, res) => {
    try {
        const { companyId, userId } = req.user;
        const { parameterId } = req.params;
        const parameterData = req.body;
        
        // Validazione base
        if (!parameterData.itemCode || !parameterData.dataType || !parameterData.parameterName) {
            return res.status(400).json({
                success: false,
                message: 'Dati mancanti: itemCode, dataType e parameterName sono obbligatori'
            });
        }
        
        const result = await knownDataManagement.updateKnownDataParameter(companyId, parameterId, parameterData, userId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Errore nella route PUT /api/known-data/parameter:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error.message
        });
    }
});

/**
 * DELETE /api/known-data/parameter/:parameterId
 * Elimina un parametro
 */
router.delete('/parameter/:parameterId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const { companyId } = req.query;
        const { parameterId } = req.params;
        
        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'CompanyId mancante nella query string'
            });
        }
        
        const result = await knownDataManagement.deleteKnownDataParameter(companyId, parameterId, userId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Errore nella route DELETE /api/known-data/parameter:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error.message
        });
    }
});

/**
 * DELETE /api/known-data/parameter/by-item/:itemCode
 * Elimina tutti i parametri per un articolo specifico
 */
router.delete('/parameter/by-item/:itemCode', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const { companyId } = req.query;
        const { itemCode } = req.params;
        
        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'CompanyId mancante nella query string'
            });
        }
        
        const result = await knownDataManagement.deleteKnownDataParametersByItem(companyId, itemCode, userId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Errore nella route DELETE /api/known-data/parameter/by-item:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error.message
        });
    }
});

/**
 * POST /api/known-data/formula
 * Crea una nuova formula
 */
router.post('/formula', authenticateToken, async (req, res) => {
    try {
        const { companyId, userId } = req.user;
        const formulaData = req.body;
        
        // Validazione base
        if (!formulaData.itemCode || !formulaData.dataType || !formulaData.formulaExpression) {
            return res.status(400).json({
                success: false,
                message: 'Dati mancanti: itemCode, dataType e formulaExpression sono obbligatori'
            });
        }
        
        const result = await knownDataManagement.createFormula(companyId, formulaData, userId);
        
        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Errore nella route POST /api/known-data/formula:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error.message
        });
    }
});

/**
 * PUT /api/known-data/formula/:formulaId
 * Aggiorna una formula esistente
 */
router.put('/formula/:formulaId', authenticateToken, async (req, res) => {
    try {
        const { companyId, userId } = req.user;
        const { formulaId } = req.params;
        const formulaData = req.body;
        
        // Validazione base
        if (!formulaData.itemCode || !formulaData.dataType || !formulaData.formulaExpression) {
            return res.status(400).json({
                success: false,
                message: 'Dati mancanti: itemCode, dataType e formulaExpression sono obbligatori'
            });
        }
        
        const result = await knownDataManagement.updateFormula(companyId, formulaId, formulaData, userId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Errore nella route PUT /api/known-data/formula:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error.message
        });
    }
});

/**
 * DELETE /api/known-data/formula/:formulaId
 * Elimina una formula
 */
router.delete('/formula/:formulaId', authenticateToken, async (req, res) => {
    try {
        const { companyId, userId } = req.user;
        const { formulaId } = req.params;
        
        const result = await knownDataManagement.deleteFormula(companyId, formulaId, userId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Errore nella route DELETE /api/known-data/formula:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error.message
        });
    }
});

/**
 * POST /api/known-data/matching-rule
 * Crea una regola di matching
 */
router.post('/matching-rule', authenticateToken, async (req, res) => {
    try {
        const { companyId, userId } = req.user;
        const ruleData = req.body;
        
        // Validazione base
        if (!ruleData.itemCode || !ruleData.dataType || !ruleData.matchingType || !ruleData.matchingValue) {
            return res.status(400).json({
                success: false,
                message: 'Dati mancanti: itemCode, dataType, matchingType e matchingValue sono obbligatori'
            });
        }
        
        const result = await knownDataManagement.createMatchingRule(companyId, ruleData, userId);
        
        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Errore nella route POST /api/known-data/matching-rule:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error.message
        });
    }
});

/**
 * PUT /api/known-data/matching-rule/:ruleId
 * Aggiorna una regola di matching
 */
router.put('/matching-rule/:ruleId', authenticateToken, async (req, res) => {
    try {
        const { companyId, userId } = req.user;
        const { ruleId } = req.params;
        const ruleData = req.body;
        
        // Validazione base
        if (!ruleData.itemCode || !ruleData.dataType || !ruleData.matchingType || !ruleData.matchingValue) {
            return res.status(400).json({
                success: false,
                message: 'Dati mancanti: itemCode, dataType, matchingType e matchingValue sono obbligatori'
            });
        }
        
        const result = await knownDataManagement.updateMatchingRule(companyId, ruleId, ruleData, userId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Errore nella route PUT /api/known-data/matching-rule:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error.message
        });
    }
});

/**
 * DELETE /api/known-data/matching-rule/:ruleId
 * Elimina una regola di matching
 */
router.delete('/matching-rule/:ruleId', authenticateToken, async (req, res) => {
    try {
        const { companyId, userId } = req.user;
        const { ruleId } = req.params;
        
        const result = await knownDataManagement.deleteMatchingRule(companyId, ruleId, userId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Errore nella route DELETE /api/known-data/matching-rule:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error.message
        });
    }
});

/**
 * POST /api/known-data/test-calculation
 * Testa il calcolo di un dato noto
 */
router.post('/test-calculation', authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.user;
        const testData = req.body;
        
        // Validazione base
        if (!testData.itemCode || !testData.dataType || testData.L === undefined || testData.QTA === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Dati mancanti: itemCode, dataType, L e QTA sono obbligatori'
            });
        }
        
        const result = await knownDataManagement.testKnownDataCalculation(companyId, testData);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Errore nella route POST /api/known-data/test-calculation:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error.message
        });
    }
});

module.exports = router;
