const express = require('express');
const router = express.Router();
const authenticateToken = require('../authenticateToken');
const {
    exportItemToERP,
    exportBOMToERP,
    exportItemsBatch,
    exportBOMsBatch,
    getExportLog,
    checkItemExportability,
    checkBOMExportability,
    getBOMComponentsStatus,
    getExportStatistics,
    syncItemsFromERP,
    syncBOMsFromERP,
    syncAllFromERP
} = require('../queries/erpExportManagement');

// Export single item to ERP
router.post('/erp/export/item', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const { itemId, autoSync = true } = req.body;
        
        if (!itemId) {
            return res.status(400).json({
                success: 0,
                msg: 'ID articolo richiesto'
            });
        }
        
        // Check if item can be exported
        const checkResult = await checkItemExportability(companyId, itemId);
        
        if (!checkResult.canExport) {
            return res.status(400).json({
                success: 0,
                msg: checkResult.reason,
                alreadyExported: checkResult.alreadyExported || false
            });
        }
        
        // Export the item
        const result = await exportItemToERP(companyId, itemId, userId, autoSync);
        
        res.json({
            success: result.success ? 1 : 0,
            msg: result.message
        });
    } catch (err) {
        console.error('Error exporting item:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante l\'esportazione dell\'articolo'
        });
    }
});

// Export BOM to ERP
router.post('/erp/export/bom', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const { bomId, version, checkRecursive = true, autoSync = true } = req.body;
        
        if (!bomId || version === undefined) {
            return res.status(400).json({
                success: 0,
                msg: 'ID distinta e versione richiesti'
            });
        }
        
        // Check if BOM can be exported
        const checkResult = await checkBOMExportability(companyId, bomId, version);
        
        if (!checkResult.canExport) {
            return res.status(400).json({
                success: 0,
                msg: checkResult.reason,
                componentsInfo: checkResult.componentsInfo,
                alreadyExported: checkResult.alreadyExported || false
            });
        }
        
        // Export the BOM
        const result = await exportBOMToERP(companyId, bomId, version, userId, checkRecursive, autoSync);
        
        res.json({
            success: result.success ? 1 : 0,
            msg: result.message,
            note: checkResult.note || null
        });
    } catch (err) {
        console.error('Error exporting BOM:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante l\'esportazione della distinta'
        });
    }
});

// Export multiple items in batch
router.post('/erp/export/items/batch', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const { itemIds, autoSync = true } = req.body;
        
        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            return res.status(400).json({
                success: 0,
                msg: 'Lista articoli richiesta'
            });
        }
        
        // Limit batch size
        if (itemIds.length > 100) {
            return res.status(400).json({
                success: 0,
                msg: 'Massimo 100 articoli per batch'
            });
        }
        
        // Export items
        const result = await exportItemsBatch(companyId, itemIds, userId, autoSync);
        
        res.json({
            success: result.success ? 1 : 0,
            successCount: result.successCount,
            errorCount: result.errorCount,
            results: result.results,
            msg: result.message
        });
    } catch (err) {
        console.error('Error in batch export:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante l\'esportazione batch'
        });
    }
});

// Export multiple BOMs in batch
router.post('/erp/export/boms/batch', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const { boms, checkRecursive = true, autoSync = true } = req.body;
        
        if (!boms || !Array.isArray(boms) || boms.length === 0) {
            return res.status(400).json({
                success: 0,
                msg: 'Lista distinte richiesta'
            });
        }
        
        // Validate BOM data
        const invalidBoms = boms.filter(bom => !bom.bomId || bom.version === undefined);
        if (invalidBoms.length > 0) {
            return res.status(400).json({
                success: 0,
                msg: 'Ogni distinta deve avere bomId e version'
            });
        }
        
        // Limit batch size
        if (boms.length > 50) {
            return res.status(400).json({
                success: 0,
                msg: 'Massimo 50 distinte per batch'
            });
        }
        
        // Export BOMs
        const result = await exportBOMsBatch(companyId, boms, userId, checkRecursive, autoSync);
        
        res.json({
            success: result.success ? 1 : 0,
            successCount: result.successCount,
            errorCount: result.errorCount,
            results: result.results,
            msg: result.message
        });
    } catch (err) {
        console.error('Error in batch BOM export:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante l\'esportazione batch delle distinte'
        });
    }
});

// Check if item can be exported
router.get('/erp/export/check/item/:itemId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const itemId = parseInt(req.params.itemId);
        
        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({
                success: 0,
                msg: 'ID articolo non valido'
            });
        }
        
        const result = await checkItemExportability(companyId, itemId);
        
        res.json({
            success: 1,
            canExport: result.canExport,
            reason: result.reason,
            alreadyExported: result.alreadyExported || false
        });
    } catch (err) {
        console.error('Error checking item exportability:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante il controllo'
        });
    }
});

// Check if BOM can be exported
router.get('/erp/export/check/bom/:bomId/:version', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const bomId = parseInt(req.params.bomId);
        const version = parseInt(req.params.version);
        
        if (!bomId || isNaN(bomId) || version === undefined || isNaN(version)) {
            return res.status(400).json({
                success: 0,
                msg: 'ID distinta o versione non validi'
            });
        }
        
        const result = await checkBOMExportability(companyId, bomId, version);
        
        res.json({
            success: 1,
            canExport: result.canExport,
            reason: result.reason,
            componentsInfo: result.componentsInfo,
            note: result.note || null,
            alreadyExported: result.alreadyExported || false
        });
    } catch (err) {
        console.error('Error checking BOM exportability:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante il controllo'
        });
    }
});

// Get BOM components status
router.get('/erp/export/bom/:bomId/components', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const bomId = parseInt(req.params.bomId);
        
        if (!bomId || isNaN(bomId)) {
            return res.status(400).json({
                success: 0,
                msg: 'ID distinta non valido'
            });
        }
        
        const components = await getBOMComponentsStatus(companyId, bomId);
        
        res.json({
            success: 1,
            components: components,
            summary: {
                total: components.length,
                exported: components.filter(c => c.IsExported).length,
                toExport: components.filter(c => !c.IsExported && c.ComponentCode).length,
                withoutCode: components.filter(c => !c.ComponentCode || c.ComponentCode === 'N/A').length
            }
        });
    } catch (err) {
        console.error('Error fetching BOM components status:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore nel recupero dello stato dei componenti'
        });
    }
});

// Get export log
router.get('/erp/export/log', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        
        // Build filters from query params
        const filters = {};
        
        if (req.query.userId) {
            filters.userId = parseInt(req.query.userId);
        }
        
        if (req.query.operationType) {
            filters.operationType = req.query.operationType;
        }
        
        if (req.query.dateFrom) {
            filters.dateFrom = new Date(req.query.dateFrom);
        }
        
        if (req.query.dateTo) {
            filters.dateTo = new Date(req.query.dateTo);
        }
        
        if (req.query.onlyErrors === 'true') {
            filters.onlyErrors = true;
        }
        
        const log = await getExportLog(companyId, filters);
        
        res.json({
            success: 1,
            records: log
        });
    } catch (err) {
        console.error('Error fetching export log:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore nel recupero del log'
        });
    }
});

// Get export statistics
router.get('/erp/export/statistics', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const period = req.query.period || 'all'; // today, week, month, all
        
        const stats = await getExportStatistics(companyId, period);
        
        res.json({
            success: 1,
            statistics: stats
        });
    } catch (err) {
        console.error('Error fetching export statistics:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore nel recupero delle statistiche'
        });
    }
});

// Check multiple items exportability
router.post('/erp/export/check/items/batch', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { itemIds } = req.body;
        
        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            return res.status(400).json({
                success: 0,
                msg: 'Lista articoli richiesta'
            });
        }
        
        const results = await Promise.all(
            itemIds.map(async (itemId) => {
                try {
                    const checkResult = await checkItemExportability(companyId, itemId);
                    return {
                        itemId: itemId,
                        canExport: checkResult.canExport,
                        reason: checkResult.reason,
                        alreadyExported: checkResult.alreadyExported || false
                    };
                } catch (err) {
                    return {
                        itemId: itemId,
                        canExport: false,
                        reason: err.message || 'Errore nel controllo',
                        error: true
                    };
                }
            })
        );
        
        const exportableCount = results.filter(r => r.canExport).length;
        const alreadyExportedCount = results.filter(r => r.alreadyExported).length;
        
        res.json({
            success: 1,
            results: results,
            summary: {
                total: itemIds.length,
                exportable: exportableCount,
                alreadyExported: alreadyExportedCount,
                notExportable: itemIds.length - exportableCount - alreadyExportedCount
            }
        });
    } catch (err) {
        console.error('Error checking batch exportability:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante il controllo batch'
        });
    }
});

// Check multiple BOMs exportability
router.post('/erp/export/check/boms/batch', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { boms } = req.body;
        
        if (!boms || !Array.isArray(boms) || boms.length === 0) {
            return res.status(400).json({
                success: 0,
                msg: 'Lista distinte richiesta'
            });
        }
        
        // Validate BOM data
        const invalidBoms = boms.filter(bom => !bom.bomId || bom.version === undefined);
        if (invalidBoms.length > 0) {
            return res.status(400).json({
                success: 0,
                msg: 'Ogni distinta deve avere bomId e version'
            });
        }
        
        const results = await Promise.all(
            boms.map(async (bom) => {
                try {
                    const checkResult = await checkBOMExportability(companyId, bom.bomId, bom.version);
                    return {
                        bomId: bom.bomId,
                        version: bom.version,
                        canExport: checkResult.canExport,
                        reason: checkResult.reason,
                        componentsInfo: checkResult.componentsInfo,
                        note: checkResult.note || null,
                        alreadyExported: checkResult.alreadyExported || false
                    };
                } catch (err) {
                    return {
                        bomId: bom.bomId,
                        version: bom.version,
                        canExport: false,
                        reason: err.message || 'Errore nel controllo',
                        error: true
                    };
                }
            })
        );
        
        const exportableCount = results.filter(r => r.canExport).length;
        const alreadyExportedCount = results.filter(r => r.alreadyExported).length;
        
        res.json({
            success: 1,
            results: results,
            summary: {
                total: boms.length,
                exportable: exportableCount,
                alreadyExported: alreadyExportedCount,
                notExportable: boms.length - exportableCount - alreadyExportedCount
            }
        });
    } catch (err) {
        console.error('Error checking batch BOM exportability:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante il controllo batch delle distinte'
        });
    }
});

// Sync items from ERP to WebApp
router.post('/erp/sync/items', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const { itemCode = null, onlyExported = true } = req.body;
        
        const result = await syncItemsFromERP(companyId, itemCode, userId, onlyExported);
        
        res.json({
            success: result.success ? 1 : 0,
            msg: result.message
        });
    } catch (err) {
        console.error('Error syncing items:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante la sincronizzazione degli articoli'
        });
    }
});

// Sync BOMs from ERP to WebApp
router.post('/erp/sync/boms', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const { bomCode = null, version = null, onlyExported = true } = req.body;
        
        const result = await syncBOMsFromERP(companyId, bomCode, version, userId, onlyExported);
        
        res.json({
            success: result.success ? 1 : 0,
            msg: result.message
        });
    } catch (err) {
        console.error('Error syncing BOMs:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante la sincronizzazione delle distinte'
        });
    }
});

// Sync all from ERP to WebApp
router.post('/erp/sync/all', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const { 
            syncItems = true, 
            syncBOMs = true, 
            onlyExported = true 
        } = req.body;
        
        const result = await syncAllFromERP(companyId, userId, syncItems, syncBOMs, onlyExported);
        
        res.json({
            success: result.success ? 1 : 0,
            msg: result.message
        });
    } catch (err) {
        console.error('Error syncing all:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante la sincronizzazione completa'
        });
    }
});

module.exports = router;