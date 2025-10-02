const sql = require('mssql');
const config = require('../config');

// ========================================
// GESTIONE DATI NOTI - QUERY FUNCTIONS
// ========================================

/**
 * Ottiene tutti i dati noti per una company
 */
const getAllKnownData = async (companyId, dataType = null) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        let query = `
            SELECT 
                kd.Id,
                kd.CompanyId,
                kd.ItemCode,
                kd.ItemDescription,
                kd.DataType,
                kd.ParameterName,
                kd.ParameterValue,
                kd.UnitOfMeasure,
                kd.Description,
                kd.IsActive,
                kd.TBCreated,
                kd.TBModified,
                kd.TBCreatedID,
                kd.TBModifiedID,
                f.FormulaName,
                f.FormulaExpression,
                f.ResultUnit,
                mr.MatchingType,
                mr.MatchingValue,
                mr.Priority
            FROM MA_BOMCostingKnownData kd
            LEFT JOIN MA_BOMCostingFormulas f ON kd.CompanyId = f.CompanyId 
                AND kd.ItemCode = f.ItemCode 
                AND kd.DataType = f.DataType
                AND f.IsActive = 1
            LEFT JOIN MA_BOMCostingMatchingRules mr ON kd.CompanyId = mr.CompanyId 
                AND kd.ItemCode = mr.ItemCode
                AND mr.IsActive = 1
            WHERE kd.CompanyId = @CompanyId
        `;
        
        if (dataType) {
            query += ` AND kd.DataType = @DataType`;
        }
        
        query += ` ORDER BY kd.DataType, kd.ItemCode, kd.ParameterName`;
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId);
            
        if (dataType) {
            request.input('DataType', sql.VarChar(20), dataType);
        }
        
        const result = await request.query(query);
        
        return {
            success: true,
            message: 'Dati noti recuperati con successo',
            data: result.recordset
        };
        
    } catch (error) {
        console.error('Errore nel recupero dei dati noti:', error);
        return {
            success: false,
            message: 'Errore nel recupero dei dati noti',
            error: error.message
        };
    }
};

/**
 * Ottiene i dati noti per un singolo articolo/operazione
 */
const getKnownDataForItem = async (companyId, itemCode, dataType) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('ItemCode', sql.VarChar(64), itemCode)
            .input('DataType', sql.VarChar(20), dataType);
        
        const result = await request.execute('SP_GetKnownDataForItem');
        
        return {
            success: true,
            message: 'Dati noti per articolo recuperati con successo',
            data: result.recordset
        };
        
    } catch (error) {
        console.error('Errore nel recupero dei dati noti per articolo:', error);
        return {
            success: false,
            message: 'Errore nel recupero dei dati noti per articolo',
            error: error.message
        };
    }
};

/**
 * Crea un nuovo parametro per i dati noti
 */
const createKnownDataParameter = async (companyId, parameterData, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('ItemCode', sql.VarChar(64), parameterData.itemCode)
            .input('ItemDescription', sql.NVarChar(255), parameterData.itemDescription)
            .input('DataType', sql.VarChar(20), parameterData.dataType)
            .input('ParameterName', sql.VarChar(50), parameterData.parameterName)
            .input('ParameterValue', sql.Decimal(18,6), parameterData.parameterValue)
            .input('UnitOfMeasure', sql.VarChar(20), parameterData.unitOfMeasure)
            .input('Description', sql.NVarChar(255), parameterData.description)
            .input('IsActive', sql.Bit, parameterData.isActive !== false)
            .input('UserId', sql.Int, userId);
        
        const result = await request.execute('SP_CreateKnownDataParameter');
        
        return {
            success: true,
            message: 'Parametro creato con successo',
            data: result.recordset[0]
        };
        
    } catch (error) {
        console.error('Errore nella creazione del parametro:', error);
        return {
            success: false,
            message: 'Errore nella creazione del parametro',
            error: error.message
        };
    }
};

/**
 * Aggiorna un parametro esistente
 */
const updateKnownDataParameter = async (companyId, parameterId, parameterData, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('ParameterId', sql.BigInt, parameterId)
            .input('ItemCode', sql.VarChar(64), parameterData.itemCode)
            .input('ItemDescription', sql.NVarChar(255), parameterData.itemDescription)
            .input('DataType', sql.VarChar(20), parameterData.dataType)
            .input('ParameterName', sql.VarChar(50), parameterData.parameterName)
            .input('ParameterValue', sql.Decimal(18,6), parameterData.parameterValue)
            .input('UnitOfMeasure', sql.VarChar(20), parameterData.unitOfMeasure)
            .input('Description', sql.NVarChar(255), parameterData.description)
            .input('IsActive', sql.Bit, parameterData.isActive !== false)
            .input('UserId', sql.Int, userId);
        
        const result = await request.execute('SP_UpdateKnownDataParameter');
        
        return {
            success: true,
            message: 'Parametro aggiornato con successo',
            data: result.recordset[0]
        };
        
    } catch (error) {
        console.error('Errore nell\'aggiornamento del parametro:', error);
        return {
            success: false,
            message: 'Errore nell\'aggiornamento del parametro',
            error: error.message
        };
    }
};

/**
 * Elimina un parametro
 */
const deleteKnownDataParameter = async (companyId, parameterId, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('ParameterId', sql.BigInt, parameterId)
            .input('UserId', sql.Int, userId);
        
        const result = await request.execute('SP_DeleteKnownDataParameter');
        
        const deletedCount = result.recordset[0]?.DeletedCount || 0;
        
        if (deletedCount === 0) {
            return {
                success: false,
                message: 'Parametro non trovato o già eliminato'
            };
        }
        
        return {
            success: true,
            message: 'Parametro eliminato con successo',
            deletedCount: deletedCount
        };
        
    } catch (error) {
        console.error('Errore nell\'eliminazione del parametro:', error);
        return {
            success: false,
            message: 'Errore nell\'eliminazione del parametro',
            error: error.message
        };
    }
};

/**
 * Elimina tutti i parametri per un articolo specifico
 */
const deleteKnownDataParametersByItem = async (companyId, itemCode, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('ItemCode', sql.VarChar(64), itemCode)
            .input('UserId', sql.Int, userId);
        
        const result = await request.execute('SP_DeleteKnownDataParametersByItem');
        
        return {
            success: true,
            message: 'Parametri eliminati con successo',
            data: result.recordset
        };
        
    } catch (error) {
        console.error('Errore nell\'eliminazione dei parametri per articolo:', error);
        return {
            success: false,
            message: 'Errore nell\'eliminazione dei parametri per articolo',
            error: error.message
        };
    }
};

/**
 * Crea una nuova formula
 */
const createFormula = async (companyId, formulaData, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('ItemCode', sql.VarChar(64), formulaData.itemCode)
            .input('ItemDescription', sql.NVarChar(255), formulaData.itemDescription)
            .input('DataType', sql.VarChar(20), formulaData.dataType)
            .input('FormulaName', sql.NVarChar(100), formulaData.formulaName)
            .input('FormulaExpression', sql.NVarChar(MAX), formulaData.formulaExpression)
            .input('ResultUnit', sql.VarChar(20), formulaData.resultUnit)
            .input('Description', sql.NVarChar(255), formulaData.description)
            .input('IsActive', sql.Bit, formulaData.isActive !== false)
            .input('UserId', sql.Int, userId);
        
        const result = await request.execute('SP_CreateFormula');
        
        return {
            success: true,
            message: 'Formula creata con successo',
            data: result.recordset[0]
        };
        
    } catch (error) {
        console.error('Errore nella creazione della formula:', error);
        return {
            success: false,
            message: 'Errore nella creazione della formula',
            error: error.message
        };
    }
};

/**
 * Aggiorna una formula esistente
 */
const updateFormula = async (companyId, formulaId, formulaData, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('FormulaId', sql.BigInt, formulaId)
            .input('ItemCode', sql.VarChar(64), formulaData.itemCode)
            .input('ItemDescription', sql.NVarChar(255), formulaData.itemDescription)
            .input('DataType', sql.VarChar(20), formulaData.dataType)
            .input('FormulaName', sql.NVarChar(100), formulaData.formulaName)
            .input('FormulaExpression', sql.NVarChar(MAX), formulaData.formulaExpression)
            .input('ResultUnit', sql.VarChar(20), formulaData.resultUnit)
            .input('Description', sql.NVarChar(255), formulaData.description)
            .input('IsActive', sql.Bit, formulaData.isActive !== false)
            .input('UserId', sql.Int, userId);
        
        const result = await request.execute('SP_UpdateFormula');
        
        return {
            success: true,
            message: 'Formula aggiornata con successo',
            data: result.recordset[0]
        };
        
    } catch (error) {
        console.error('Errore nell\'aggiornamento della formula:', error);
        return {
            success: false,
            message: 'Errore nell\'aggiornamento della formula',
            error: error.message
        };
    }
};

/**
 * Elimina una formula
 */
const deleteFormula = async (companyId, formulaId, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('FormulaId', sql.BigInt, formulaId)
            .input('UserId', sql.Int, userId);
        
        const result = await request.execute('SP_DeleteFormula');
        
        return {
            success: true,
            message: 'Formula eliminata con successo',
            data: result.recordset[0]
        };
        
    } catch (error) {
        console.error('Errore nell\'eliminazione della formula:', error);
        return {
            success: false,
            message: 'Errore nell\'eliminazione della formula',
            error: error.message
        };
    }
};

/**
 * Crea una regola di matching
 */
const createMatchingRule = async (companyId, ruleData, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('ItemCode', sql.VarChar(64), ruleData.itemCode)
            .input('ItemDescription', sql.NVarChar(255), ruleData.itemDescription)
            .input('DataType', sql.VarChar(20), ruleData.dataType)
            .input('MatchingType', sql.VarChar(20), ruleData.matchingType)
            .input('MatchingValue', sql.VarChar(255), ruleData.matchingValue)
            .input('Priority', sql.Int, ruleData.priority || 0)
            .input('IsActive', sql.Bit, ruleData.isActive !== false)
            .input('UserId', sql.Int, userId);
        
        const result = await request.execute('SP_CreateMatchingRule');
        
        return {
            success: true,
            message: 'Regola di matching creata con successo',
            data: result.recordset[0]
        };
        
    } catch (error) {
        console.error('Errore nella creazione della regola di matching:', error);
        return {
            success: false,
            message: 'Errore nella creazione della regola di matching',
            error: error.message
        };
    }
};

/**
 * Aggiorna una regola di matching
 */
const updateMatchingRule = async (companyId, ruleId, ruleData, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('RuleId', sql.BigInt, ruleId)
            .input('ItemCode', sql.VarChar(64), ruleData.itemCode)
            .input('ItemDescription', sql.NVarChar(255), ruleData.itemDescription)
            .input('DataType', sql.VarChar(20), ruleData.dataType)
            .input('MatchingType', sql.VarChar(20), ruleData.matchingType)
            .input('MatchingValue', sql.VarChar(255), ruleData.matchingValue)
            .input('Priority', sql.Int, ruleData.priority || 0)
            .input('IsActive', sql.Bit, ruleData.isActive !== false)
            .input('UserId', sql.Int, userId);
        
        const result = await request.execute('SP_UpdateMatchingRule');
        
        return {
            success: true,
            message: 'Regola di matching aggiornata con successo',
            data: result.recordset[0]
        };
        
    } catch (error) {
        console.error('Errore nell\'aggiornamento della regola di matching:', error);
        return {
            success: false,
            message: 'Errore nell\'aggiornamento della regola di matching',
            error: error.message
        };
    }
};

/**
 * Elimina una regola di matching
 */
const deleteMatchingRule = async (companyId, ruleId, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('RuleId', sql.BigInt, ruleId)
            .input('UserId', sql.Int, userId);
        
        const result = await request.execute('SP_DeleteMatchingRule');
        
        return {
            success: true,
            message: 'Regola di matching eliminata con successo',
            data: result.recordset[0]
        };
        
    } catch (error) {
        console.error('Errore nell\'eliminazione della regola di matching:', error);
        return {
            success: false,
            message: 'Errore nell\'eliminazione della regola di matching',
            error: error.message
        };
    }
};

/**
 * Testa il calcolo di un dato noto
 */
const testKnownDataCalculation = async (companyId, testData) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('ItemCode', sql.VarChar(64), testData.itemCode)
            .input('ItemDescription', sql.NVarChar(255), testData.itemDescription)
            .input('DataType', sql.VarChar(20), testData.dataType)
            .input('L', sql.Decimal(18,5), testData.L)
            .input('QTA', sql.Decimal(18,5), testData.QTA);
        
        const result = await request.execute('SP_TestKnownDataCalculation');
        
        return {
            success: true,
            message: 'Test calcolo completato con successo',
            data: result.recordset[0]
        };
        
    } catch (error) {
        console.error('Errore nel test del calcolo:', error);
        return {
            success: false,
            message: 'Errore nel test del calcolo',
            error: error.message
        };
    }
};

module.exports = {
    getAllKnownData,
    getKnownDataForItem,
    createKnownDataParameter,
    updateKnownDataParameter,
    deleteKnownDataParameter,
    deleteKnownDataParametersByItem,
    createFormula,
    updateFormula,
    deleteFormula,
    createMatchingRule,
    updateMatchingRule,
    deleteMatchingRule,
    testKnownDataCalculation
};
