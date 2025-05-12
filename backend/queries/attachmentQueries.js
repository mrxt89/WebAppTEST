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
 */
const getAttachments = async (projectId = null, taskId = null, notificationId = null, itemCode = null, companyId = null) => {
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
            .execute('MA_GetAttachments');
        return result.recordset;
    } catch (err) {
        console.error('Error in getAttachments:', err);
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
    getAttachmentById
};