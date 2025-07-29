const sql = require('mssql');
const config = require('../config');

/**
 * Export single article to ERP with automatic sync
 * @param {number} companyId - Company ID
 * @param {number} itemId - Item ID to export
 * @param {number} userId - User performing the operation
 * @param {boolean} autoSync - Automatically sync after export (default: true)
 * @returns {Promise<{success: boolean, message: string}>} Operation result
 */
const exportItemToERP = async (companyId, itemId, userId, autoSync = true) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request();

        request.input('CompanyId', sql.Int, companyId);
        request.input('ItemId', sql.BigInt, itemId);
        request.input('UserId', sql.Int, userId);
        request.output('Success', sql.Bit);
        request.output('Message', sql.NVarChar(sql.MAX));

        // Use the combined procedure if autoSync is true
        const procedureName = autoSync ? 'MA_ExportAndSyncItemToERP' : 'MA_ExportItemToERP';
        await request.execute(procedureName);
        
        return {
            success: request.parameters.Success.value === true,
            message: request.parameters.Message.value || ''
        };
    } catch (err) {
        console.error('Error exporting item to ERP:', err);
        throw err;
    }
};

/**
 * Export BOM to ERP with automatic sync
 * @param {number} companyId - Company ID
 * @param {number} bomId - BOM ID to export
 * @param {number} version - BOM version
 * @param {number} userId - User performing the operation
 * @param {boolean} checkRecursive - Export recursively (default: true)
 * @param {boolean} autoSync - Automatically sync after export (default: true)
 * @returns {Promise<{success: boolean, message: string}>} Operation result
 */
const exportBOMToERP = async (companyId, bomId, version, userId, checkRecursive = true, autoSync = true) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request();

        request.input('CompanyId', sql.Int, companyId);
        request.input('BOMId', sql.BigInt, bomId);
        request.input('Version', sql.Int, version);
        request.input('UserId', sql.Int, userId);
        request.input('CheckRecursive', sql.Bit, checkRecursive ? 1 : 0);
        request.output('Success', sql.Bit);
        request.output('Message', sql.NVarChar(sql.MAX));

        // Use the combined procedure if autoSync is true
        const procedureName = autoSync ? 'MA_ExportAndSyncBOMToERP' : 'MA_ExportBOMToERP';
        await request.execute(procedureName);
        
        return {
            success: request.parameters.Success.value === true,
            message: request.parameters.Message.value || ''
        };
    } catch (err) {
        console.error('Error exporting BOM to ERP:', err);
        throw err;
    }
};

/**
 * Export multiple items to ERP in batch with automatic sync
 * @param {number} companyId - Company ID
 * @param {Array<number>} itemIds - Array of item IDs to export
 * @param {number} userId - User performing the operation
 * @param {boolean} autoSync - Automatically sync after export (default: true)
 * @returns {Promise<{success: boolean, successCount: number, errorCount: number, results: Array}>} Operation result
 */
const exportItemsBatch = async (companyId, itemIds, userId, autoSync = true) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const results = [];
        let successCount = 0;
        let errorCount = 0;

        // Process each item
        for (const itemId of itemIds) {
            try {
                const result = await exportItemToERP(companyId, itemId, userId, autoSync);
                
                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
                
                results.push({
                    itemId: itemId,
                    success: result.success,
                    message: result.message
                });
            } catch (err) {
                errorCount++;
                results.push({
                    itemId: itemId,
                    success: false,
                    message: err.message || 'Errore durante l\'esportazione'
                });
            }
        }

        return {
            success: errorCount === 0,
            successCount: successCount,
            errorCount: errorCount,
            results: results,
            message: `Esportati ${successCount} articoli su ${itemIds.length}. ${errorCount} errori.`
        };
    } catch (err) {
        console.error('Error in batch export:', err);
        throw err;
    }
};

/**
 * Export multiple BOMs to ERP in batch with automatic sync
 * @param {number} companyId - Company ID
 * @param {Array<{bomId: number, version: number}>} boms - Array of BOMs to export
 * @param {number} userId - User performing the operation
 * @param {boolean} checkRecursive - Export recursively (default: true)
 * @param {boolean} autoSync - Automatically sync after export (default: true)
 * @returns {Promise<{success: boolean, successCount: number, errorCount: number, results: Array}>} Operation result
 */
const exportBOMsBatch = async (companyId, boms, userId, checkRecursive = true, autoSync = true) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const results = [];
        let successCount = 0;
        let errorCount = 0;

        // Process each BOM
        for (const bom of boms) {
            try {
                const result = await exportBOMToERP(
                    companyId, 
                    bom.bomId, 
                    bom.version, 
                    userId, 
                    checkRecursive,
                    autoSync
                );
                
                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
                
                results.push({
                    bomId: bom.bomId,
                    version: bom.version,
                    success: result.success,
                    message: result.message
                });
            } catch (err) {
                errorCount++;
                results.push({
                    bomId: bom.bomId,
                    version: bom.version,
                    success: false,
                    message: err.message || 'Errore durante l\'esportazione'
                });
            }
        }

        return {
            success: errorCount === 0,
            successCount: successCount,
            errorCount: errorCount,
            results: results,
            message: `Esportate ${successCount} distinte su ${boms.length}. ${errorCount} errori.`
        };
    } catch (err) {
        console.error('Error in batch BOM export:', err);
        throw err;
    }
};

/**
 * Get export log
 * @param {number} companyId - Company ID
 * @param {Object} filters - Filters for the log
 * @returns {Promise<Array>} Export log records
 */
const getExportLog = async (companyId, filters = {}) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request();

        request.input('CompanyId', sql.Int, companyId);
        request.input('UserId', sql.Int, filters.userId || null);
        request.input('OperationType', sql.VarChar(50), filters.operationType || null);
        request.input('DateFrom', sql.DateTime, filters.dateFrom || null);
        request.input('DateTo', sql.DateTime, filters.dateTo || null);
        request.input('OnlyErrors', sql.Bit, filters.onlyErrors ? 1 : 0);

        const result = await request.execute('MA_GetExportLog');
        
        return result.recordset || [];
    } catch (err) {
        console.error('Error getting export log:', err);
        throw err;
    }
};

/**
 * Check if item can be exported
 * @param {number} companyId - Company ID
 * @param {number} itemId - Item ID to check
 * @returns {Promise<{canExport: boolean, reason: string}>} Check result
 */
const checkItemExportability = async (companyId, itemId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        // Check if item exists and has required data
        const checkQuery = `
            SELECT 
                i.Id,
                i.Item,
                i.Description,
                i.Nature,
                i.stato_erp,
                CASE 
                    WHEN i.Item IS NULL OR i.Item = '' THEN 'Codice articolo mancante'
                    WHEN i.Description IS NULL OR i.Description = '' THEN 'Descrizione mancante'
                    WHEN i.Nature IS NULL THEN 'Natura articolo non definita'
                    WHEN i.stato_erp = 1 THEN 'Articolo già esportato'
                    WHEN i.Disabled = 1 THEN 'Articolo disabilitato'
                    ELSE NULL
                END as BlockingReason
            FROM MA_ProjectArticles_Items i
            WHERE i.Id = @ItemId AND i.CompanyId = @CompanyId
        `;
        
        const result = await pool.request()
            .input('ItemId', sql.BigInt, itemId)
            .input('CompanyId', sql.Int, companyId)
            .query(checkQuery);
        
        if (result.recordset.length === 0) {
            return {
                canExport: false,
                reason: 'Articolo non trovato'
            };
        }
        
        const item = result.recordset[0];
        
        return {
            canExport: item.BlockingReason === null,
            reason: item.BlockingReason || '',
            alreadyExported: item.stato_erp === 1
        };
    } catch (err) {
        console.error('Error checking item exportability:', err);
        throw err;
    }
};

/**
 * Check if BOM can be exported
 * @param {number} companyId - Company ID
 * @param {number} bomId - BOM ID to check
 * @param {number} version - BOM version
 * @returns {Promise<{canExport: boolean, reason: string, componentsInfo: Object}>} Check result
 */
const checkBOMExportability = async (companyId, bomId, version) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        // Check if BOM exists
        const bomCheckQuery = `
            SELECT 
                b.Id,
                b.BOM,
                b.Description,
                b.ItemId,
                b.stato_erp,
                i.Item as ItemCode,
                i.stato_erp as ItemExported
            FROM MA_ProjectArticles_BillOfMaterials b
            INNER JOIN MA_ProjectArticles_Items i ON b.ItemId = i.Id AND i.CompanyId = @CompanyId
            WHERE b.Id = @BOMId AND b.CompanyId = @CompanyId AND b.Version = @Version
        `;
        
        const bomResult = await pool.request()
            .input('BOMId', sql.BigInt, bomId)
            .input('CompanyId', sql.Int, companyId)
            .input('Version', sql.Int, version)
            .query(bomCheckQuery);
        
        if (bomResult.recordset.length === 0) {
            return {
                canExport: false,
                reason: 'Distinta base non trovata',
                componentsInfo: {}
            };
        }
        
        const bom = bomResult.recordset[0];
        
        if (bom.stato_erp === 1) {
            return {
                canExport: false,
                reason: 'Distinta già esportata',
                componentsInfo: {},
                alreadyExported: true
            };
        }
        
        // Check components status (informativo, non bloccante)
        const componentsQuery = `
            SELECT 
                COUNT(*) as TotalComponents,
                SUM(CASE WHEN i.stato_erp = 1 THEN 1 ELSE 0 END) as ExportedComponents,
                SUM(CASE WHEN i.Item IS NULL OR i.Item = '' THEN 1 ELSE 0 END) as ComponentsWithoutCode,
                SUM(CASE WHEN i.stato_erp = 0 AND (i.Item IS NOT NULL AND i.Item != '') THEN 1 ELSE 0 END) as ComponentsToExport
            FROM MA_ProjectArticles_BOMComponents c
            INNER JOIN MA_ProjectArticles_Items i ON c.ComponentId = i.Id AND i.CompanyId = @CompanyId
            WHERE c.BOMId = @BOMId AND c.CompanyId = @CompanyId
        `;
        
        const componentsResult = await pool.request()
            .input('BOMId', sql.BigInt, bomId)
            .input('CompanyId', sql.Int, companyId)
            .query(componentsQuery);
        
        const componentsInfo = componentsResult.recordset[0] || {
            TotalComponents: 0,
            ExportedComponents: 0,
            ComponentsWithoutCode: 0,
            ComponentsToExport: 0
        };
        
        // Check only critical conditions
        if (componentsInfo.ComponentsWithoutCode > 0) {
            return {
                canExport: false,
                reason: `${componentsInfo.ComponentsWithoutCode} componenti senza codice articolo`,
                componentsInfo: componentsInfo
            };
        }
        
        // BOM can be exported - the stored procedure will handle missing components
        return {
            canExport: true,
            reason: '',
            componentsInfo: componentsInfo,
            note: componentsInfo.ComponentsToExport > 0 ? 
                `Verranno esportati automaticamente ${componentsInfo.ComponentsToExport} componenti` : null
        };
    } catch (err) {
        console.error('Error checking BOM exportability:', err);
        throw err;
    }
};

/**
 * Get detailed components status for a BOM
 * @param {number} companyId - Company ID
 * @param {number} bomId - BOM ID
 * @returns {Promise<Array>} Components list with status
 */
const getBOMComponentsStatus = async (companyId, bomId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const query = `
            SELECT 
                c.ComponentId,
                c.Line,
                i.Item as ComponentCode,
                i.Description,
                i.Nature,
                i.stato_erp as IsExported,
                c.Quantity,
                c.UoM,
                CASE 
                    WHEN i.Item IS NULL OR i.Item = '' THEN 'Codice mancante'
                    WHEN i.stato_erp = 0 THEN 'Da esportare'
                    ELSE 'Già esportato'
                END as Status
            FROM MA_ProjectArticles_BOMComponents c
            INNER JOIN MA_ProjectArticles_Items i ON c.ComponentId = i.Id AND i.CompanyId = @CompanyId
            WHERE c.BOMId = @BOMId AND c.CompanyId = @CompanyId
            ORDER BY c.Line
        `;
        
        const result = await pool.request()
            .input('BOMId', sql.BigInt, bomId)
            .input('CompanyId', sql.Int, companyId)
            .query(query);
        
        return result.recordset || [];
    } catch (err) {
        console.error('Error getting BOM components status:', err);
        throw err;
    }
};

/**
 * Get export statistics
 * @param {number} companyId - Company ID
 * @param {string} period - Period for statistics (today, week, month, all)
 * @returns {Promise<Object>} Export statistics
 */
const getExportStatistics = async (companyId, period = 'all') => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        let dateFilter = '';
        const today = new Date();
        
        switch (period) {
            case 'today':
                dateFilter = `AND CreatedAt >= CAST(GETDATE() AS DATE)`;
                break;
            case 'week':
                const weekAgo = new Date(today.setDate(today.getDate() - 7));
                dateFilter = `AND CreatedAt >= '${weekAgo.toISOString()}'`;
                break;
            case 'month':
                const monthAgo = new Date(today.setMonth(today.getMonth() - 1));
                dateFilter = `AND CreatedAt >= '${monthAgo.toISOString()}'`;
                break;
            default:
                dateFilter = '';
        }
        
        const query = `
            SELECT 
                COUNT(*) as TotalExports,
                SUM(CASE WHEN Success = 1 THEN 1 ELSE 0 END) as SuccessfulExports,
                SUM(CASE WHEN Success = 0 THEN 1 ELSE 0 END) as FailedExports,
                COUNT(DISTINCT CASE WHEN OperationType = 'EXPORT_ITEM' THEN ObjectCode END) as UniqueItems,
                COUNT(DISTINCT CASE WHEN OperationType = 'EXPORT_BOM' THEN ObjectCode END) as UniqueBOMs,
                COUNT(DISTINCT UserId) as UniqueUsers
            FROM MA_ExportLog
            WHERE CompanyId = @CompanyId ${dateFilter}
        `;
        
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .query(query);
        
        const stats = result.recordset[0] || {
            TotalExports: 0,
            SuccessfulExports: 0,
            FailedExports: 0,
            UniqueItems: 0,
            UniqueBOMs: 0,
            UniqueUsers: 0
        };
        
        // Calculate success rate
        stats.SuccessRate = stats.TotalExports > 0 ? 
            Math.round((stats.SuccessfulExports / stats.TotalExports) * 100) : 0;
        
        return stats;
    } catch (err) {
        console.error('Error getting export statistics:', err);
        throw err;
    }
};

/**
 * Sync items from ERP to WebApp
 * @param {number} companyId - Company ID
 * @param {string} itemCode - Item code to sync (null = sync all)
 * @param {number} userId - User performing the operation
 * @param {boolean} onlyExported - Only sync already exported items (default: true)
 * @returns {Promise<{success: boolean, message: string}>} Operation result
 */
const syncItemsFromERP = async (companyId, itemCode, userId, onlyExported = true) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request();

        request.input('CompanyId', sql.Int, companyId);
        request.input('ItemCode', sql.VarChar(64), itemCode);
        request.input('UserId', sql.Int, userId);
        request.input('OnlyExported', sql.Bit, onlyExported ? 1 : 0);
        request.output('Success', sql.Bit);
        request.output('Message', sql.NVarChar(sql.MAX));

        await request.execute('MA_SyncItemFromERP');
        
        return {
            success: request.parameters.Success.value === true,
            message: request.parameters.Message.value || ''
        };
    } catch (err) {
        console.error('Error syncing items from ERP:', err);
        throw err;
    }
};

/**
 * Sync BOMs from ERP to WebApp
 * @param {number} companyId - Company ID
 * @param {string} bomCode - BOM code to sync (null = sync all)
 * @param {number} version - BOM version (null = all versions)
 * @param {number} userId - User performing the operation
 * @param {boolean} onlyExported - Only sync already exported BOMs (default: true)
 * @returns {Promise<{success: boolean, message: string}>} Operation result
 */
const syncBOMsFromERP = async (companyId, bomCode, version, userId, onlyExported = true) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request();

        request.input('CompanyId', sql.Int, companyId);
        request.input('BOMCode', sql.VarChar(50), bomCode);
        request.input('Version', sql.Int, version);
        request.input('UserId', sql.Int, userId);
        request.input('OnlyExported', sql.Bit, onlyExported ? 1 : 0);
        request.output('Success', sql.Bit);
        request.output('Message', sql.NVarChar(sql.MAX));

        await request.execute('MA_SyncBOMFromERP');
        
        return {
            success: request.parameters.Success.value === true,
            message: request.parameters.Message.value || ''
        };
    } catch (err) {
        console.error('Error syncing BOMs from ERP:', err);
        throw err;
    }
};

/**
 * Sync all data from ERP to WebApp
 * @param {number} companyId - Company ID
 * @param {number} userId - User performing the operation
 * @param {boolean} syncItems - Sync items (default: true)
 * @param {boolean} syncBOMs - Sync BOMs (default: true)
 * @param {boolean} onlyExported - Only sync already exported data (default: true)
 * @returns {Promise<{success: boolean, message: string}>} Operation result
 */
const syncAllFromERP = async (companyId, userId, syncItems = true, syncBOMs = true, onlyExported = true) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request();

        request.input('CompanyId', sql.Int, companyId);
        request.input('UserId', sql.Int, userId);
        request.input('SyncItems', sql.Bit, syncItems ? 1 : 0);
        request.input('SyncBOMs', sql.Bit, syncBOMs ? 1 : 0);
        request.input('OnlyExported', sql.Bit, onlyExported ? 1 : 0);
        request.output('Success', sql.Bit);
        request.output('Message', sql.NVarChar(sql.MAX));

        await request.execute('MA_SyncAllFromERP');
        
        return {
            success: request.parameters.Success.value === true,
            message: request.parameters.Message.value || ''
        };
    } catch (err) {
        console.error('Error syncing all from ERP:', err);
        throw err;
    }
};

// Export all functions
module.exports = {
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
};