// backend/queries/projectActivityLog.js
const sql = require('mssql');
const config = require('../config');

/**
 * Helper per loggare le attività sui progetti
 * Questo modulo fornisce funzioni per tracciare tutte le modifiche importanti
 */

/**
 * Logga un'attività su un progetto
 * @param {Object} logData - Dati del log
 * @param {number} logData.companyId - ID azienda
 * @param {number} logData.projectId - ID progetto (opzionale)
 * @param {number} logData.userId - ID utente
 * @param {string} logData.activityType - Tipo attività (es: 'ITEM_CREATE', 'BOM_UPDATE')
 * @param {string} logData.entityType - Tipo entità (es: 'Item', 'BOM', 'Project')
 * @param {number} logData.entityId - ID entità (opzionale)
 * @param {string} logData.entityCode - Codice entità (opzionale)
 * @param {string} logData.action - Azione (CREATE, UPDATE, DELETE, EXPORT, ecc.)
 * @param {string} logData.description - Descrizione
 * @param {Object} logData.oldValues - Valori precedenti (opzionale, sarà convertito in JSON)
 * @param {Object} logData.newValues - Valori nuovi (opzionale, sarà convertito in JSON)
 * @param {Object} logData.metadata - Metadati aggiuntivi (opzionale, sarà convertito in JSON)
 * @param {string} logData.ipAddress - IP utente (opzionale)
 * @param {string} logData.userAgent - User agent (opzionale)
 * @returns {Promise<Object>} Risultato dell'operazione
 */
const logActivity = async (logData) => {
  try {
    const {
      companyId,
      projectId = null,
      userId,
      activityType,
      entityType,
      entityId = null,
      entityCode = null,
      action,
      description = null,
      oldValues = null,
      newValues = null,
      metadata = null,
      ipAddress = null,
      userAgent = null
    } = logData;

    // Validazione parametri obbligatori
    // NOTA: userId può essere 0 (utente amministratore), quindi controlliamo con !== null/undefined
    if (!companyId || userId === null || userId === undefined || !activityType || !entityType || !action) {
      console.warn('LogActivity: parametri mancanti', logData);
      return { success: false, message: 'Parametri obbligatori mancanti' };
    }

    const pool = await sql.connect(config.database);
    const result = await pool.request()
      .input('CompanyId', sql.Int, companyId)
      .input('ProjectID', sql.Int, projectId)
      .input('UserId', sql.Int, userId)
      .input('ActivityType', sql.VarChar(50), activityType)
      .input('EntityType', sql.VarChar(50), entityType)
      .input('EntityId', sql.BigInt, entityId)
      .input('EntityCode', sql.VarChar(100), entityCode)
      .input('Action', sql.VarChar(50), action)
      .input('Description', sql.NVarChar(sql.MAX), description)
      .input('OldValues', sql.NVarChar(sql.MAX), oldValues ? JSON.stringify(oldValues) : null)
      .input('NewValues', sql.NVarChar(sql.MAX), newValues ? JSON.stringify(newValues) : null)
      .input('Metadata', sql.NVarChar(sql.MAX), metadata ? JSON.stringify(metadata) : null)
      .input('IPAddress', sql.VarChar(50), ipAddress)
      .input('UserAgent', sql.NVarChar(500), userAgent)
      .execute('LogProjectActivity');

    const logId = result.recordset[0]?.LogId;

    return {
      success: true,
      logId: logId
    };
  } catch (error) {
    console.error('Errore nel logging attività:', error);
    console.error('Dettagli errore logging:', {
      message: error.message,
      code: error.code,
      number: error.number,
      originalError: error.originalError,
      logData: {
        companyId,
        projectId,
        userId,
        activityType,
        entityType,
        action
      }
    });
    // Non bloccare il flusso se il logging fallisce
    return { success: false, error: error.message };
  }
};

/**
 * Recupera i log di attività di un progetto
 * @param {number} projectId - ID progetto
 * @param {number} companyId - ID azienda
 * @param {Object} filters - Filtri opzionali
 * @param {string} filters.activityType - Tipo attività
 * @param {string} filters.entityType - Tipo entità
 * @param {Date} filters.startDate - Data inizio
 * @param {Date} filters.endDate - Data fine
 * @param {number} filters.userId - ID utente
 * @param {number} pageNumber - Numero pagina (default: 1)
 * @param {number} pageSize - Dimensione pagina (default: 50)
 * @returns {Promise<Object>} Lista log e totale
 */
const getProjectLogs = async (projectId, companyId, filters = {}, pageNumber = 1, pageSize = 50) => {
  try {
    const pool = await sql.connect(config.database);
    const result = await pool.request()
      .input('ProjectID', sql.Int, projectId)
      .input('CompanyId', sql.Int, companyId)
      .input('ActivityType', sql.VarChar(50), filters.activityType || null)
      .input('EntityType', sql.VarChar(50), filters.entityType || null)
      .input('StartDate', sql.DateTime2, filters.startDate || null)
      .input('EndDate', sql.DateTime2, filters.endDate || null)
      .input('UserId', sql.Int, filters.userId || null)
      .input('PageNumber', sql.Int, pageNumber)
      .input('PageSize', sql.Int, pageSize)
      .execute('GetProjectActivityLogs');

    // La stored procedure restituisce due recordset: dati e conteggio
    const logs = result.recordsets[0] || [];
    const totalCount = result.recordsets[1]?.[0]?.TotalCount || 0;

    return {
      success: true,
      logs: logs,
      totalCount: totalCount,
      pageNumber: pageNumber,
      pageSize: pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    };
  } catch (error) {
    console.error('Errore nel recupero log progetto:', error);
    throw error;
  }
};

/**
 * Recupera i log di attività di un'entità specifica (es: articolo, BOM)
 * @param {number} companyId - ID azienda
 * @param {string} entityType - Tipo entità
 * @param {number} entityId - ID entità
 * @param {number} pageNumber - Numero pagina
 * @param {number} pageSize - Dimensione pagina
 * @returns {Promise<Object>} Lista log e totale
 */
const getEntityLogs = async (companyId, entityType, entityId, pageNumber = 1, pageSize = 50) => {
  try {
    const pool = await sql.connect(config.database);
    const result = await pool.request()
      .input('CompanyId', sql.Int, companyId)
      .input('EntityType', sql.VarChar(50), entityType)
      .input('EntityId', sql.BigInt, entityId)
      .input('PageNumber', sql.Int, pageNumber)
      .input('PageSize', sql.Int, pageSize)
      .execute('GetEntityActivityLogs');

    const logs = result.recordsets[0] || [];
    const totalCount = result.recordsets[1]?.[0]?.TotalCount || 0;

    return {
      success: true,
      logs: logs,
      totalCount: totalCount,
      pageNumber: pageNumber,
      pageSize: pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    };
  } catch (error) {
    console.error('Errore nel recupero log entità:', error);
    throw error;
  }
};

/**
 * Recupera statistiche attività di un progetto
 * @param {number} projectId - ID progetto
 * @param {number} companyId - ID azienda
 * @param {Date} startDate - Data inizio (opzionale)
 * @param {Date} endDate - Data fine (opzionale)
 * @returns {Promise<Object>} Statistiche
 */
const getProjectStats = async (projectId, companyId, startDate = null, endDate = null) => {
  try {
    const pool = await sql.connect(config.database);
    const result = await pool.request()
      .input('ProjectID', sql.Int, projectId)
      .input('CompanyId', sql.Int, companyId)
      .input('StartDate', sql.DateTime2, startDate)
      .input('EndDate', sql.DateTime2, endDate)
      .execute('GetProjectActivityStats');

    // La stored procedure restituisce 3 recordset: per tipo attività, per tipo entità, per utente
    return {
      success: true,
      byActivityType: result.recordsets[0] || [],
      byEntityType: result.recordsets[1] || [],
      byUser: result.recordsets[2] || []
    };
  } catch (error) {
    console.error('Errore nel recupero statistiche progetto:', error);
    throw error;
  }
};

/**
 * Helper per estrarre IP e UserAgent dalla richiesta Express
 * @param {Object} req - Request Express
 * @returns {Object} { ipAddress, userAgent }
 */
const getRequestInfo = (req) => {
  const ipAddress = req.ip || 
                   req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.connection?.remoteAddress || 
                   null;
  const userAgent = req.headers['user-agent'] || null;
  
  return { ipAddress, userAgent };
};

module.exports = {
  logActivity,
  getProjectLogs,
  getEntityLogs,
  getProjectStats,
  getRequestInfo
};
