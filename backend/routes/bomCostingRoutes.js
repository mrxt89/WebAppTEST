const express = require('express');
const router = express.Router();
const authenticateToken = require('../authenticateToken');
const bomCostingQueries = require('../queries/bomCostingManagement');

/**
 * Routes per la gestione della costificazione BOM
 * Endpoint per calcolo automatico dei costi delle distinte base
 */

// GET /api/bom-costing/parameters - Ottieni parametri di costificazione
router.get('/parameters', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const parameters = await bomCostingQueries.getBOMCostingParameters(companyId);
        
        res.json({
            success: true,
            message: 'Parametri recuperati con successo',
            data: parameters
        });
    } catch (error) {
        console.error('Error getting BOM costing parameters:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei parametri di costificazione',
            error: error.message
        });
    }
});

// GET /api/bom-costing/versions/:itemId - Ottieni tutte le versioni di una BOM per un articolo
router.get('/versions/:itemId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { itemId } = req.params;
        
        const versions = await bomCostingQueries.getBOMVersions(companyId, parseInt(itemId));
        
        res.json({
            success: true,
            message: 'Versioni BOM recuperate con successo',
            data: versions,
            count: versions.length
        });
    } catch (error) {
        console.error('Error getting BOM versions:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle versioni BOM',
            error: error.message
        });
    }
});

// POST /api/bom-costing/parameters/initialize - Inizializza parametri di default
router.post('/parameters/initialize', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const result = await bomCostingQueries.initializeBOMCostingParameters(companyId);
        
        res.json({
            success: true,
            message: 'Parametri inizializzati con successo',
            data: result
        });
    } catch (error) {
        console.error('Error initializing BOM costing parameters:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'inizializzazione dei parametri',
            error: error.message
        });
    }
});

// PUT /api/bom-costing/parameters/:parameterId - Aggiorna parametro
router.put('/parameters/:parameterId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const { parameterId } = req.params;
        const { parameterValue } = req.body;
        
        if (parameterValue === undefined || parameterValue === null) {
            return res.status(400).json({
                success: false,
                message: 'parameterValue è richiesto nel body della richiesta'
            });
        }
        
        const result = await bomCostingQueries.updateBOMCostingParameter(
            companyId,
            parseInt(parameterId),
            parseFloat(parameterValue),
            userId
        );
        
        res.json(result);
    } catch (error) {
        console.error('Error updating BOM costing parameter:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento del parametro',
            error: error.message
        });
    }
});

// GET /api/bom-costing/available-boms - Lista BOM disponibili per costificazione con paginazione
router.get('/available-boms', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const filters = {
            bomStatus: req.query.bomStatus,
            nature: req.query.nature ? parseInt(req.query.nature) : null,
            searchText: req.query.searchText
        };
        
        const pagination = {
            page: parseInt(req.query.page) || 1,
            pageSize: parseInt(req.query.pageSize) || 50
        };
        
        const result = await bomCostingQueries.getAvailableBOMs(companyId, filters, pagination);
        
        res.json({
            success: true,
            message: 'BOM recuperate con successo',
            data: result.data,
            pagination: result.pagination,
            count: result.data.length
        });
    } catch (error) {
        console.error('Error getting available BOMs:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle BOM disponibili',
            error: error.message
        });
    }
});

// POST /api/bom-costing/calculate/:bomId - Calcola costificazione singola BOM
router.post('/calculate/:bomId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { bomId } = req.params;
        const {
            orderQuantity,
            scrapPercentage,
            useGranularMarkups = true, // Default a true per le nuove regole
            updateBOMRecord = true, // Default a true per aggiornare il record
            debug = false,
            version = null // Nuovo parametro per specificare la versione
        } = req.body;
        
        const userId = req.user?.UserId || req.user?.Id || null; // ID utente per audit
        
        const options = {
            orderQuantity: orderQuantity ? parseFloat(orderQuantity) : null,
            scrapPercentage: scrapPercentage ? parseFloat(scrapPercentage) : null,
            useGranularMarkups: Boolean(useGranularMarkups),
            updateBOMRecord: Boolean(updateBOMRecord),
            userId: userId,
            debug: Boolean(debug),
            version: version ? parseInt(version) : null // Aggiungi versione alle opzioni
        };
        
        const result = await bomCostingQueries.calculateBOMCosting(
            companyId,
            parseInt(bomId),
            options
        );
        
        res.json(result);
    } catch (error) {
        console.error('Error calculating BOM costing:', error);
        
        // Gestione errori specifici
        if (error.message.includes('BOM non trovata')) {
            return res.status(404).json({
                success: false,
                message: 'BOM non trovata',
                error: error.message
            });
        }
        
        if (error.message.includes('versione non trovata')) {
            return res.status(404).json({
                success: false,
                message: 'Versione BOM non trovata',
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Errore nel calcolo della costificazione',
            error: error.message
        });
    }
});

// POST /api/bom-costing/calculate/batch - Calcola costificazione per multiple BOM
router.post('/calculate/batch', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const {
            bomIds,
            orderQuantity,
            scrapPercentage,
            updateBOMRecord = true, // Default a true per aggiornare i record
            version = null // Nuovo parametro per specificare la versione (applicata a tutte le BOM)
        } = req.body;
        
        const userId = req.user?.UserId || req.user?.Id || null; // ID utente per audit
        
        if (!bomIds || !Array.isArray(bomIds) || bomIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'bomIds deve essere un array non vuoto'
            });
        }
        
        const options = {
            orderQuantity: orderQuantity ? parseFloat(orderQuantity) : null,
            scrapPercentage: scrapPercentage ? parseFloat(scrapPercentage) : null,
            updateBOMRecord: Boolean(updateBOMRecord),
            userId: userId,
            version: version ? parseInt(version) : null // Aggiungi versione alle opzioni
        };
        
        const result = await bomCostingQueries.batchCalculateBOMCosting(
            companyId,
            bomIds,
            options
        );
        
        res.json(result);
    } catch (error) {
        console.error('Error in batch BOM costing calculation:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel calcolo batch delle costificazioni',
            error: error.message
        });
    }
});

// GET /api/bom-costing/logs - Ottieni log delle costificazioni
router.get('/logs', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const {
            bomId,
            logLevel,
            limit = 100
        } = req.query;
        
        const logs = await bomCostingQueries.getBOMCostingLogs(
            companyId,
            bomId ? parseInt(bomId) : null,
            logLevel,
            parseInt(limit)
        );
        
        res.json({
            success: true,
            message: 'Log recuperati con successo',
            data: logs,
            count: logs.length
        });
    } catch (error) {
        console.error('Error getting BOM costing logs:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei log',
            error: error.message
        });
    }
});

// GET /api/bom-costing/export/:bomId - Esporta risultato costificazione
router.get('/export/:bomId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { bomId } = req.params;
        const { format = 'json' } = req.query;
        
        const result = await bomCostingQueries.exportBOMCostingResult(
            companyId,
            parseInt(bomId),
            format
        );
        
        if (format === 'json') {
            res.json(result);
        } else {
            // Per implementazioni future (Excel, PDF, etc.)
            res.json({
                success: false,
                message: `Formato ${format} non ancora supportato`,
                supportedFormats: ['json']
            });
        }
    } catch (error) {
        console.error('Error exporting BOM costing result:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'export del risultato',
            error: error.message
        });
    }
});

// GET /api/bom-costing/details/:bomId - Ottieni dettaglio costi per una BOM
router.get('/details/:bomId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { bomId } = req.params;
        const { 
            calculationId,
            updateBOMRecord = false, // Default a false per non aggiornare la BOM
            useKnownData = true,
            useGranularMarkups = true,
            orderQuantity,
            scrapPercentage,
            version
        } = req.query;
        
        const options = {
            calculationId: calculationId ? parseInt(calculationId) : null,
            updateBOMRecord: updateBOMRecord === 'true',
            useKnownData: useKnownData === 'true',
            useGranularMarkups: useGranularMarkups === 'true',
            orderQuantity: orderQuantity ? parseFloat(orderQuantity) : null,
            scrapPercentage: scrapPercentage ? parseFloat(scrapPercentage) : null,
            version: version ? parseInt(version) : null
        };
        
        const result = await bomCostingQueries.getBOMCostingDetails(
            companyId,
            parseInt(bomId),
            options
        );
        
        res.json(result);
    } catch (error) {
        console.error('Error getting BOM costing details:', error);
        
        if (error.message.includes('BOM non trovata')) {
            return res.status(404).json({
                success: false,
                message: 'BOM non trovata',
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del dettaglio costi',
            error: error.message
        });
    }
});

// GET /api/bom-costing/history/search - Cerca BOM con costi già calcolati
router.get('/history/search', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { searchText, page, pageSize } = req.query;
        
        const result = await bomCostingQueries.searchBOMCostingHistory(
            companyId,
            searchText || null,
            { page: parseInt(page) || 1, pageSize: parseInt(pageSize) || 50 }
        );
        
        res.json(result);
    } catch (error) {
        console.error('Error searching BOM costing history:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella ricerca della cronologia costi',
            error: error.message
        });
    }
});

// GET /api/bom-costing/history/:bomId - Ottieni dettaglio costi storici per una BOM
router.get('/history/:bomId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { bomId } = req.params;
        const { bomCode } = req.query;
        
        const result = await bomCostingQueries.getBOMCostingHistory(
            companyId,
            parseInt(bomId),
            bomCode || null
        );
        
        res.json(result);
    } catch (error) {
        console.error('Error getting BOM costing history:', error);
        
        if (error.message.includes('BOM non trovata')) {
            return res.status(404).json({
                success: false,
                message: 'BOM non trovata',
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero della cronologia costi',
            error: error.message
        });
    }
});

// GET /api/bom-costing/test-calculation - Test endpoint per validare i calcoli
router.get('/test-calculation', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const result = await bomCostingQueries.testBOMCostingExample(companyId);
        
        res.json(result);
    } catch (error) {
        console.error('Error in test calculation:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel test di calcolo',
            error: error.message
        });
    }
});

// =============================================
// Route: Breakdown dettagliato costi operazioni
// =============================================
router.get('/operations-breakdown/:bomId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { bomId } = req.params;
        const { includeMultilevel } = req.query;

        const result = await bomCostingQueries.getBOMOperationsCostBreakdown(
            companyId,
            parseInt(bomId),
            includeMultilevel === 'true'
        );

        res.json(result);
    } catch (error) {
        console.error('Error getting BOM operations cost breakdown:', error);
        if (error.message.includes('BOM non trovata')) {
            return res.status(404).json({
                success: false,
                message: 'BOM non trovata',
                error: error.message
            });
        }
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del breakdown costi operazioni',
            error: error.message
        });
    }
});

// =============================================
// Route: Salva storico parametri costificazione
// =============================================
router.post('/history', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const { bomId, costingData } = req.body;

        if (!bomId) {
            return res.status(400).json({
                success: false,
                message: 'bomId è richiesto'
            });
        }

        if (!costingData) {
            return res.status(400).json({
                success: false,
                message: 'costingData è richiesto'
            });
        }

        const result = await bomCostingQueries.saveBOMCostingHistory(
            companyId,
            parseInt(bomId),
            costingData,
            userId
        );

        res.json(result);
    } catch (error) {
        console.error('Error saving BOM costing history:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel salvataggio dello storico parametri',
            error: error.message
        });
    }
});

// =============================================
// Route: Ottieni storico parametri costificazione
// =============================================
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { bomId, top, orderBy } = req.query;

        const result = await bomCostingQueries.getBOMCostingParametersHistory(
            companyId,
            bomId ? parseInt(bomId) : null,
            top ? parseInt(top) : null,
            orderBy || 'CostingDate DESC'
        );

        res.json({
            success: true,
            message: 'Storico parametri recuperato con successo',
            data: result,
            count: result.length
        });
    } catch (error) {
        console.error('Error getting BOM costing parameters history:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dello storico parametri',
            error: error.message
        });
    }
});

// =============================================
// Route: Ottieni dati multilivello BOM per albero costi
// =============================================
router.get('/multilevel/:bomId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { bomId } = req.params;

        const projectArticlesManagement = require('../queries/projectArticlesManagement');

        const result = await projectArticlesManagement.getBOMData(
            companyId,
            'GET_BOM_MULTILEVEL',
            parseInt(bomId),
            null,
            null,
            {
                maxLevel: 10,
                includeRouting: true,
                expandPhantoms: true
            }
        );

        res.json({
            success: true,
            message: 'Dati multilivello recuperati con successo',
            data: result
        });
    } catch (error) {
        console.error('Error getting BOM multilevel data:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei dati multilivello',
            error: error.message
        });
    }
});

module.exports = router;
