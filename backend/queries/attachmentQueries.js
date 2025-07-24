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

/**
 * Aggiorna un allegato con una nuova versione del file
 */
const updateAttachmentVersion = async (attachmentId, filePath, fileSizeKB, modifiedBy) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('FilePath', sql.VarChar, filePath)
            .input('FileSizeKB', sql.Int, fileSizeKB)
            .input('ModifiedBy', sql.Int, modifiedBy)
            .query(`
                UPDATE MA_Attachments 
                SET FilePath = @FilePath,
                    FileSizeKB = @FileSizeKB,
                    ModifiedAt = GETDATE(),
                    ModifiedBy = @ModifiedBy
                WHERE AttachmentID = @AttachmentID
            `);
        
        return { success: 1, data: result };
    } catch (err) {
        console.error('Error in updateAttachmentVersion:', err);
        throw err;
    }
};

/**
 * Registra una nuova versione di un allegato nella tabella di versioning
 */
const addAttachmentVersion = async (attachmentId, versionNumber, filePath, fileSizeKB, changeNotes, uploadedBy) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('VersionNumber', sql.Int, versionNumber)
            .input('FilePath', sql.VarChar, filePath)
            .input('FileSizeKB', sql.Int, fileSizeKB)
            .input('ChangeNotes', sql.VarChar, changeNotes)
            .input('UploadedBy', sql.Int, uploadedBy)
            .query(`
                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES 
                          WHERE TABLE_NAME = 'MA_AttachmentVersions')
                BEGIN
                    INSERT INTO MA_AttachmentVersions (
                        AttachmentID, VersionNumber, FilePath, FileSizeKB,
                        ChangeNotes, UploadedBy, UploadedDate
                    ) VALUES (
                        @AttachmentID, @VersionNumber, @FilePath, @FileSizeKB,
                        @ChangeNotes, @UploadedBy, GETDATE()
                    )
                END
            `);
        
        return { success: 1, data: result };
    } catch (err) {
        console.error('Error in addAttachmentVersion:', err);
        throw err;
    }
};

/**
 * Verifica che un allegato appartenga a un task specifico
 */
const verifyAttachmentBelongsToTask = async (attachmentId, taskId) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('TaskID', sql.Int, taskId)
            .query(`
                SELECT COUNT(*) as count 
                FROM MA_Attachments 
                WHERE AttachmentID = @AttachmentID AND TaskID = @TaskID
            `);
        
        return result.recordset[0].count > 0;
    } catch (err) {
        console.error('Error in verifyAttachmentBelongsToTask:', err);
        throw err;
    }
};

/**
 * Verifica che un allegato appartenga a un progetto specifico
 */
const verifyAttachmentBelongsToProject = async (attachmentId, projectId) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('ProjectID', sql.Int, projectId)
            .query(`
                SELECT COUNT(*) as count 
                FROM MA_Attachments 
                WHERE AttachmentID = @AttachmentID AND ProjectID = @ProjectID
            `);
        
        return result.recordset[0].count > 0;
    } catch (err) {
        console.error('Error in verifyAttachmentBelongsToProject:', err);
        throw err;
    }
};

/**
 * Crea un lock su un allegato per l'editing
 */
const createAttachmentLock = async (attachmentId, lockedBy) => {
    try {
        let pool = await sql.connect(config.database);
        
        // Prima verifica se esiste già un lock attivo
        const existingLock = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .query(`
                SELECT LockID, LockedBy, LockedAt, 
                       u.firstName + ' ' + u.lastName as LockedByName
                FROM MA_AttachmentLocks al
                JOIN AR_Users u ON u.UserId = al.LockedBy
                WHERE al.AttachmentID = @AttachmentID 
                AND al.ReleasedAt IS NULL
            `);
        
        if (existingLock.recordset.length > 0) {
            const lock = existingLock.recordset[0];
            if (lock.LockedBy === lockedBy) {
                // L'utente ha già il lock, aggiorna la data
                await pool.request()
                    .input('LockID', sql.Int, lock.LockID)
                    .query(`
                        UPDATE MA_AttachmentLocks 
                        SET LockedAt = GETDATE()
                        WHERE LockID = @LockID
                    `);
                return { success: true, lockId: lock.LockID, message: 'Lock aggiornato' };
            } else {
                // File già bloccato da altro utente
                throw {
                    code: 'FILE_LOCKED',
                    message: `File già in modifica da ${lock.LockedByName}`,
                    lockedBy: lock.LockedBy,
                    lockedByName: lock.LockedByName,
                    lockedAt: lock.LockedAt
                };
            }
        }
        
        // Crea nuovo lock
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('LockedBy', sql.Int, lockedBy)
            .query(`
                INSERT INTO MA_AttachmentLocks (AttachmentID, LockedBy, LockedAt)
                OUTPUT INSERTED.LockID
                VALUES (@AttachmentID, @LockedBy, GETDATE())
            `);
        
        return { 
            success: true, 
            lockId: result.recordset[0].LockID,
            message: 'Lock creato con successo'
        };
    } catch (err) {
        if (err.code === 'FILE_LOCKED') {
            throw err;
        }
        console.error('Error in createAttachmentLock:', err);
        throw err;
    }
};

/**
 * Rilascia un lock su un allegato
 */
const releaseAttachmentLock = async (attachmentId, lockedBy) => {
    try {
        let pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('LockedBy', sql.Int, lockedBy)
            .query(`
                UPDATE MA_AttachmentLocks 
                SET ReleasedAt = GETDATE()
                WHERE AttachmentID = @AttachmentID 
                AND LockedBy = @LockedBy 
                AND ReleasedAt IS NULL
            `);
        
        return { 
            success: true, 
            rowsAffected: result.rowsAffected[0],
            message: 'Lock rilasciato con successo'
        };
    } catch (err) {
        console.error('Error in releaseAttachmentLock:', err);
        throw err;
    }
};

/**
 * Force release di un lock (per admin)
 */
const forceReleaseAttachmentLock = async (attachmentId) => {
    try {
        let pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .query(`
                UPDATE MA_AttachmentLocks 
                SET ReleasedAt = GETDATE()
                WHERE AttachmentID = @AttachmentID 
                AND ReleasedAt IS NULL
            `);
        
        return { 
            success: true, 
            rowsAffected: result.rowsAffected[0],
            message: 'Lock forzato rilasciato'
        };
    } catch (err) {
        console.error('Error in forceReleaseAttachmentLock:', err);
        throw err;
    }
};

/**
 * Ottiene informazioni sui lock attivi per un allegato
 */
const getAttachmentLockInfo = async (attachmentId) => {
    try {
        let pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .query(`
                SELECT al.LockID, al.LockedBy, al.LockedAt,
                       u.firstName + ' ' + u.lastName as LockedByName,
                       u.username as LockedByUsername
                FROM MA_AttachmentLocks al
                JOIN AR_Users u ON u.UserId = al.LockedBy
                WHERE al.AttachmentID = @AttachmentID 
                AND al.ReleasedAt IS NULL
            `);
        
        return result.recordset[0] || null;
    } catch (err) {
        console.error('Error in getAttachmentLockInfo:', err);
        throw err;
    }
};

/**
 * Pulisce i lock scaduti (più di 2 ore)
 */
const cleanupExpiredLocks = async () => {
    try {
        let pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .query(`
                UPDATE MA_AttachmentLocks 
                SET ReleasedAt = GETDATE()
                WHERE ReleasedAt IS NULL 
                AND LockedAt < DATEADD(HOUR, -2, GETDATE())
            `);
        
        return { 
            success: true, 
            rowsAffected: result.rowsAffected[0],
            message: `${result.rowsAffected[0]} lock scaduti puliti`
        };
    } catch (err) {
        console.error('Error in cleanupExpiredLocks:', err);
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
    getAttachmentViewStats,
    updateAttachmentVersion,
    addAttachmentVersion,
    verifyAttachmentBelongsToTask,
    verifyAttachmentBelongsToProject,
    createAttachmentLock,
    releaseAttachmentLock,
    forceReleaseAttachmentLock,
    getAttachmentLockInfo,
    cleanupExpiredLocks
};