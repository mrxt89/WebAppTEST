const sql = require('mssql');
const config = require('../config');

/**
 * Modulo per la gestione delle utility BOM
 * Centri di Lavoro e Operazioni
 */

// =============================================
// CENTRI DI LAVORO
// =============================================

// Ottieni tutti i centri di lavoro
const getWorkCenters = async (companyId) => {
    try {
        let pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .query(`
                SELECT 
                    wc.OriginalId,
                    wc.Code,
                    wc.Description,
                    wc.Outsourced,
                    wc.HourlyCost,
                    wc.WaitTime,
                    wc.TBCreated,
                    wc.TBModified,
                    COUNT(op.OriginalId) as OperationsCount
                FROM MA_ProjectArticles_BOMWorkCenters wc
                LEFT JOIN MA_ProjectArticles_BOMOperations op 
                    ON wc.OriginalId = op.WorkCenterId AND wc.CompanyId = op.CompanyId
                WHERE wc.CompanyId = @CompanyId
                GROUP BY 
                    wc.OriginalId,
                    wc.Code,
                    wc.Description,
                    wc.Outsourced,
                    wc.HourlyCost,
                    wc.WaitTime,
                    wc.TBCreated,
                    wc.TBModified
                ORDER BY wc.Code
            `);
        
        return result.recordset;
    } catch (err) {
        console.error('Error in getWorkCenters:', err);
        throw err;
    }
};

// Ottieni un centro di lavoro specifico
const getWorkCenter = async (companyId, originalId) => {
    try {
        let pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('OriginalId', sql.BigInt, originalId)
            .query(`
                SELECT 
                    OriginalId,
                    Code,
                    Description,
                    Outsourced,
                    HourlyCost,
                    WaitTime,
                    TBCreated,
                    TBModified
                FROM MA_ProjectArticles_BOMWorkCenters
                WHERE CompanyId = @CompanyId AND OriginalId = @OriginalId
            `);
        
        if (result.recordset.length === 0) {
            throw new Error('Centro di lavoro non trovato');
        }
        
        return result.recordset[0];
    } catch (err) {
        console.error('Error in getWorkCenter:', err);
        throw err;
    }
};

// Aggiorna solo i costi di un centro di lavoro
const updateWorkCenterCosts = async (companyId, originalId, workCenterData, userId) => {
    try {
        let pool = await sql.connect(config.database);
        
        const {
            hourlyCost,
            waitTime
        } = workCenterData;
        
        const result = await pool.request()
            .input('OriginalId', sql.BigInt, originalId)
            .input('CompanyId', sql.Int, companyId)
            .input('HourlyCost', sql.Decimal(6, 2), hourlyCost)
            .input('WaitTime', sql.Int, waitTime)
            .input('UserId', sql.Int, userId)
            .query(`
                UPDATE MA_ProjectArticles_BOMWorkCenters
                SET 
                    HourlyCost = @HourlyCost,
                    WaitTime = @WaitTime,
                    TBModified = GETDATE(),
                    TBModifiedID = @UserId
                WHERE CompanyId = @CompanyId AND OriginalId = @OriginalId;
                
                SELECT 
                    OriginalId,
                    Code,
                    Description,
                    HourlyCost,
                    WaitTime,
                    TBModified
                FROM MA_ProjectArticles_BOMWorkCenters
                WHERE CompanyId = @CompanyId AND OriginalId = @OriginalId;
            `);
        
        if (result.recordset.length === 0) {
            throw new Error('Centro di lavoro non trovato');
        }
        
        return {
            success: true,
            message: 'Costi centro di lavoro aggiornati con successo',
            data: result.recordset[0]
        };
    } catch (err) {
        console.error('Error in updateWorkCenterCosts:', err);
        throw err;
    }
};

// Elimina un centro di lavoro
const deleteWorkCenter = async (companyId, originalId) => {
    try {
        let pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('OriginalId', sql.BigInt, originalId)
            .input('CompanyId', sql.Int, companyId)
            .execute('SP_DeleteWorkCenter');
        
        return {
            success: true,
            message: 'Centro di lavoro eliminato con successo',
            data: result.recordset[0]
        };
    } catch (err) {
        console.error('Error in deleteWorkCenter:', err);
        throw err;
    }
};

// Verifica se un codice centro di lavoro esiste già
const checkWorkCenterCodeExists = async (companyId, code, excludeOriginalId = null) => {
    try {
        let pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('Code', sql.NVarChar(64), code)
            .input('ExcludeOriginalId', sql.BigInt, excludeOriginalId)
            .query(`
                SELECT dbo.FN_WorkCenterCodeExists(@CompanyId, @Code, @ExcludeOriginalId) as CodeExists
            `);
        
        return result.recordset[0].CodeExists === 1;
    } catch (err) {
        console.error('Error in checkWorkCenterCodeExists:', err);
        throw err;
    }
};

// =============================================
// OPERAZIONI
// =============================================

// Ottieni tutte le operazioni
const getOperations = async (companyId) => {
    try {
        let pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .query(`
                SELECT 
                    op.OriginalId,
                    op.Code,
                    op.Description,
                    op.UnitCost,
                    op.FixedCost,
                    op.WorkCenterId,
                    op.WaitTime,
                    op.SetupTime,
                    op.ProductionTime,
                    op.Active,
                    op.TBCreated,
                    op.TBModified,
                    wc.Code as WorkCenterCode,
                    wc.Description as WorkCenterDescription,
                    wc.HourlyCost as WorkCenterHourlyCost,
                    COUNT(rt.RtgStep) as RoutingUsageCount
                FROM MA_ProjectArticles_BOMOperations op
                LEFT JOIN MA_ProjectArticles_BOMWorkCenters wc 
                    ON op.WorkCenterId = wc.OriginalId AND wc.CompanyId = op.CompanyId
                LEFT JOIN MA_ProjectArticles_BOMRouting rt 
                    ON op.Code = rt.Operation AND op.CompanyId = rt.CompanyId
                WHERE op.CompanyId = @CompanyId
                GROUP BY 
                    op.OriginalId,
                    op.Code,
                    op.Description,
                    op.UnitCost,
                    op.FixedCost,
                    op.WorkCenterId,
                    op.WaitTime,
                    op.SetupTime,
                    op.ProductionTime,
                    op.Active,
                    op.TBCreated,
                    op.TBModified,
                    wc.Code,
                    wc.Description,
                    wc.HourlyCost
                ORDER BY op.Code
            `);
        
        return result.recordset;
    } catch (err) {
        console.error('Error in getOperations:', err);
        throw err;
    }
};

// Ottieni un'operazione specifica
const getOperation = async (companyId, originalId) => {
    try {
        let pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('OriginalId', sql.BigInt, originalId)
            .query(`
                SELECT 
                    op.OriginalId,
                    op.Code,
                    op.Description,
                    op.UnitCost,
                    op.FixedCost,
                    op.WorkCenterId,
                    op.WaitTime,
                    op.SetupTime,
                    op.ProductionTime,
                    op.Active,
                    op.TBCreated,
                    op.TBModified,
                    wc.Code as WorkCenterCode,
                    wc.Description as WorkCenterDescription
                FROM MA_ProjectArticles_BOMOperations op
                LEFT JOIN MA_ProjectArticles_BOMWorkCenters wc 
                    ON op.WorkCenterId = wc.OriginalId AND wc.CompanyId = op.CompanyId
                WHERE op.CompanyId = @CompanyId AND op.OriginalId = @OriginalId
            `);
        
        if (result.recordset.length === 0) {
            throw new Error('Operazione non trovata');
        }
        
        return result.recordset[0];
    } catch (err) {
        console.error('Error in getOperation:', err);
        throw err;
    }
};

// Aggiorna solo i costi di un'operazione
const updateOperationCosts = async (companyId, originalId, operationData, userId) => {
    try {
        let pool = await sql.connect(config.database);
        
        const {
            unitCost,
            fixedCost,
            waitTime,
            setupTime,
            productionTime,
            active
        } = operationData;
        
        const result = await pool.request()
            .input('OriginalId', sql.BigInt, originalId)
            .input('CompanyId', sql.Int, companyId)
            .input('UnitCost', sql.Decimal(16, 2), unitCost)
            .input('FixedCost', sql.Decimal(16, 2), fixedCost)
            .input('WaitTime', sql.Float, waitTime)
            .input('SetupTime', sql.Float, setupTime)
            .input('ProductionTime', sql.Float, productionTime)
            .input('Active', sql.VarChar(5), active)
            .input('UserId', sql.Int, userId)
            .query(`
                UPDATE MA_ProjectArticles_BOMOperations
                SET 
                    UnitCost = @UnitCost,
                    FixedCost = @FixedCost,
                    WaitTime = @WaitTime,
                    SetupTime = @SetupTime,
                    ProductionTime = @ProductionTime,
                    Active = @Active,
                    TBModified = GETDATE(),
                    TBModifiedID = @UserId
                WHERE CompanyId = @CompanyId AND OriginalId = @OriginalId;
                
                SELECT 
                    op.OriginalId,
                    op.Code,
                    op.Description,
                    op.UnitCost,
                    op.FixedCost,
                    op.WaitTime,
                    op.SetupTime,
                    op.ProductionTime,
                    op.Active,
                    op.TBModified,
                    wc.Code as WorkCenterCode,
                    wc.Description as WorkCenterDescription
                FROM MA_ProjectArticles_BOMOperations op
                LEFT JOIN MA_ProjectArticles_BOMWorkCenters wc 
                    ON op.WorkCenterId = wc.OriginalId AND wc.CompanyId = op.CompanyId
                WHERE op.CompanyId = @CompanyId AND op.OriginalId = @OriginalId;
            `);
        
        if (result.recordset.length === 0) {
            throw new Error('Operazione non trovata');
        }
        
        return {
            success: true,
            message: 'Costi operazione aggiornati con successo',
            data: result.recordset[0]
        };
    } catch (err) {
        console.error('Error in updateOperationCosts:', err);
        throw err;
    }
};

// Elimina un'operazione
const deleteOperation = async (companyId, originalId) => {
    try {
        let pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('OriginalId', sql.BigInt, originalId)
            .input('CompanyId', sql.Int, companyId)
            .execute('SP_DeleteOperation');
        
        return {
            success: true,
            message: 'Operazione eliminata con successo',
            data: result.recordset[0]
        };
    } catch (err) {
        console.error('Error in deleteOperation:', err);
        throw err;
    }
};

// Verifica se un codice operazione esiste già
const checkOperationCodeExists = async (companyId, code, excludeOriginalId = null) => {
    try {
        let pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('Code', sql.NVarChar(64), code)
            .input('ExcludeOriginalId', sql.BigInt, excludeOriginalId)
            .query(`
                SELECT dbo.FN_OperationCodeExists(@CompanyId, @Code, @ExcludeOriginalId) as CodeExists
            `);
        
        return result.recordset[0].CodeExists === 1;
    } catch (err) {
        console.error('Error in checkOperationCodeExists:', err);
        throw err;
    }
};

// Toggle stato attivo/inattivo di un'operazione
const toggleOperationActive = async (companyId, originalId, active, userId) => {
    try {
        let pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('OriginalId', sql.BigInt, originalId)
            .input('Active', sql.VarChar(5), active)
            .input('UserId', sql.Int, userId)
            .query(`
                UPDATE MA_ProjectArticles_BOMOperations
                SET 
                    Active = @Active,
                    TBModified = GETDATE(),
                    TBModifiedID = @UserId
                WHERE CompanyId = @CompanyId AND OriginalId = @OriginalId;
                
                SELECT 
                    OriginalId,
                    Code,
                    Description,
                    Active,
                    TBModified
                FROM MA_ProjectArticles_BOMOperations
                WHERE CompanyId = @CompanyId AND OriginalId = @OriginalId;
            `);
        
        if (result.recordset.length === 0) {
            throw new Error('Operazione non trovata');
        }
        
        return {
            success: true,
            message: `Operazione ${active === '1' ? 'attivata' : 'disattivata'} con successo`,
            data: result.recordset[0]
        };
    } catch (err) {
        console.error('Error in toggleOperationActive:', err);
        throw err;
    }
};

// =============================================
// FUNZIONI DI UTILITY
// =============================================

// Ottieni statistiche per dashboard
const getUtilityStats = async (companyId) => {
    try {
        let pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .query(`
                SELECT 
                    (SELECT COUNT(*) FROM MA_ProjectArticles_BOMWorkCenters WHERE CompanyId = @CompanyId) as TotalWorkCenters,
                    (SELECT COUNT(*) FROM MA_ProjectArticles_BOMOperations WHERE CompanyId = @CompanyId) as TotalOperations,
                    (SELECT COUNT(*) FROM MA_ProjectArticles_BOMOperations WHERE CompanyId = @CompanyId AND Active = '1') as ActiveOperations,
                    (SELECT COUNT(*) FROM MA_ProjectArticles_BOMOperations WHERE CompanyId = @CompanyId AND Active = '0') as InactiveOperations,
                    (SELECT COUNT(*) FROM MA_ProjectArticles_BOMWorkCenters wc 
                     WHERE wc.CompanyId = @CompanyId 
                     AND NOT EXISTS (SELECT 1 FROM MA_ProjectArticles_BOMOperations op WHERE op.WorkCenterId = wc.OriginalId AND op.CompanyId = wc.CompanyId)) as UnusedWorkCenters
            `);
        
        return result.recordset[0];
    } catch (err) {
        console.error('Error in getUtilityStats:', err);
        throw err;
    }
};

module.exports = {
    // Centri di Lavoro
    getWorkCenters,
    getWorkCenter,
    updateWorkCenterCosts,
    deleteWorkCenter,
    checkWorkCenterCodeExists,
    
    // Operazioni
    getOperations,
    getOperation,
    updateOperationCosts,
    deleteOperation,
    checkOperationCodeExists,
    toggleOperationActive,
    
    // Utility
    getUtilityStats
};
