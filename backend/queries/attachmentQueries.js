// Backend/queries/attachmentQueries.js
const sql = require('mssql');
const config = require('../config');

const getProjectIdByTaskId = async (taskId) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('TaskID', sql.Int, taskId)
            .query('SELECT ProjectID FROM MA_ProjectTasks WHERE TaskID = @TaskID');
        
        return result.recordset[0]?.ProjectID;
    } catch (err) {
        console.error('Error in getProjectIdByTaskId:', err);
        throw err;
    }
};

/**
 * Ottiene gli allegati in base ai parametri forniti.
 * Se fornito projectId, recupera gli allegati di progetto/task.
 * Se fornito notificationId, recupera gli allegati della notifica.
 * Se fornito itemCode, recupera gli allegati dell'articolo.
 * @param {number} currentUserId - ID dell'utente corrente per tracciare le visualizzazioni
 */
const getAttachments = async (projectId = null, taskId = null, notificationId = null, itemCode = null, companyId = null, currentUserId = null) => {
    try {
        // Check if at least one identifier is provided
        if (projectId === null && notificationId === null && itemCode === null) {
            throw new Error('At least one of projectId, notificationId, or itemCode must be provided');
        }

        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('ProjectID', sql.Int, projectId)
            .input('TaskID', sql.Int, taskId)
            .input('NotificationID', sql.Int, notificationId)
            .input('ItemCode', sql.NVarChar(50), itemCode)
            .input('CompanyId', sql.Int, companyId)
            .input('CurrentUserID', sql.Int, currentUserId) // Nuovo parametro
            .execute('MA_GetAttachments');
        return result.recordset;
    } catch (err) {
        console.error('Error in getAttachments:', err);
        throw err;
    }
};

/**
 * Registra la visualizzazione di un allegato da parte di un utente
 */
const recordAttachmentView = async (attachmentId, userId) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('UserID', sql.Int, userId)
            .execute('MA_RecordAttachmentView');
        
        return {
            success: true,
            data: result.recordset[0]
        };
    } catch (err) {
        console.error('Error in recordAttachmentView:', err);
        throw err;
    }
};

/**
 * Ottiene le statistiche di visualizzazione per un allegato
 */
const getAttachmentViewStats = async (attachmentId) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .query(`
                SELECT 
                    COUNT(DISTINCT UserID) as TotalViews,
                    MIN(FirstViewedAt) as FirstViewedAt,
                    MAX(LastViewedAt) as LastViewedAt,
                    (
                        SELECT 
                            u.firstName + ' ' + u.lastName as ViewerName,
                            av.FirstViewedAt,
                            av.LastViewedAt
                        FROM MA_AttachmentViews av
                        JOIN AR_Users u ON u.userId = av.UserID
                        WHERE av.AttachmentID = @AttachmentID
                        ORDER BY av.FirstViewedAt DESC
                        FOR JSON PATH
                    ) as ViewerDetails
                FROM MA_AttachmentViews
                WHERE AttachmentID = @AttachmentID
            `);
        
        return result.recordset[0] || {
            TotalViews: 0,
            FirstViewedAt: null,
            LastViewedAt: null,
            ViewerDetails: '[]'
        };
    } catch (err) {
        console.error('Error in getAttachmentViewStats:', err);
        throw err;
    }
};

/**
 * Aggiunge un nuovo allegato.
 * attachmentData può contenere:
 * - ProjectID, TaskID: per allegati di progetto/task
 * - NotificationID, MessageID: per allegati di notifica/messaggio
 * - ItemCode: per allegati di articoli
 * - Campi comuni: FileName, FilePath, FileType, FileSizeKB, UploadedBy
 */
const addAttachment = async (attachmentData) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('ProjectID', sql.Int, attachmentData.ProjectID || null)
            .input('TaskID', sql.Int, attachmentData.TaskID || null)
            .input('NotificationID', sql.Int, attachmentData.NotificationID || null)
            .input('MessageID', sql.Int, attachmentData.MessageID || null)
            .input('ItemCode', sql.NVarChar(50), attachmentData.ItemCode || null)
            .input('CompanyId', sql.Int, attachmentData.CompanyId || null)
            .input('FileName', sql.NVarChar(255), attachmentData.FileName)
            .input('FilePath', sql.NVarChar(sql.MAX), attachmentData.FilePath)
            .input('FileType', sql.NVarChar(sql.MAX), attachmentData.FileType)
            .input('FileSizeKB', sql.Int, attachmentData.FileSizeKB)
            .input('UploadedBy', sql.Int, attachmentData.UploadedBy)
            .input('StorageLocation', sql.VarChar(10), attachmentData.StorageLocation || 'local')
            .execute('MA_AddAttachment');

        return {
            success: 1,
            data: result.recordset[0]
        };
    } catch (err) {
        console.error('Error in addAttachment:', err);
        throw err;
    }
};

const deleteAttachment = async (attachmentId) => {
    try {
        let pool = await sql.connect(config.database);
        await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .execute('MA_DeleteAttachment');
        return { success: 1 };
    } catch (err) {
        console.error('Error in deleteAttachment:', err);
        throw err;
    }
};

const getAttachmentById = async (attachmentId) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .execute('MA_GetAttachmentById');
        return result.recordset[0];
    } catch (err) {
        console.error('Error in getAttachmentById:', err);
        throw err;
    }
};

module.exports = {
    getProjectIdByTaskId,
    getAttachments,
    addAttachment,
    deleteAttachment,
    getAttachmentById,
    recordAttachmentView,
    getAttachmentViewStats
};