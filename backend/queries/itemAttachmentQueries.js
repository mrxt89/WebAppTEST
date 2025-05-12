// Backend/queries/itemAttachmentQueries.js
const sql = require('mssql');
const config = require('../config');

/**
 * Ottiene gli allegati di un articolo in base ai parametri forniti.
 * Può cercare per codice articolo o per ID articolo progetto.
 * @param {string} itemCode - Codice articolo (opzionale)
 * @param {number} projectItemId - ID articolo progetto (opzionale)
 * @param {number} companyId - ID dell'azienda
 * @param {boolean} includeShared - Include allegati condivisi da altre aziende
 * @param {boolean} isErpAttachment - Filtra per allegati ERP (null = tutti)
 */
const getItemAttachments = async (itemCode = null, projectItemId = null, companyId, includeShared = true, isErpAttachment = null) => {
    try {
        if (itemCode === null && projectItemId === null) {
            throw new Error('Deve essere fornito almeno uno tra itemCode e projectItemId');
        }

        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('ItemCode', sql.VarChar(64), itemCode)
            .input('ProjectItemId', sql.BigInt, projectItemId)
            .input('CompanyId', sql.Int, companyId)
            .input('IncludeShared', sql.Bit, includeShared ? 1 : 0)
            .input('IsErpAttachment', sql.Bit, isErpAttachment)
            .execute('MA_GetItemAttachments');
        
        return result.recordset;
    } catch (err) {
        console.error('Error in getItemAttachments:', err);
        throw err;
    }
};

/**
 * Aggiunge un nuovo allegato per un articolo.
 * @param {Object} attachmentData - Dati dell'allegato
 * @param {number} attachmentData.ProjectItemId - ID dell'articolo in MA_ProjectArticles_Items (può essere null)
 * @param {number} attachmentData.CompanyId - ID dell'azienda
 * @param {string} attachmentData.ItemCode - Codice articolo
 * @param {string} attachmentData.FileName - Nome originale del file
 * @param {string} attachmentData.FilePath - Percorso relativo del file
 * @param {string} attachmentData.FileType - Tipo MIME del file
 * @param {number} attachmentData.FileSizeKB - Dimensione in KB
 * @param {number} attachmentData.UploadedBy - ID utente che carica
 * @param {string} attachmentData.Description - Descrizione opzionale
 * @param {boolean} attachmentData.IsPublic - Se l'allegato è pubblico
 * @param {string} attachmentData.StorageLocation - 'local' o 'remote'
 * @param {boolean} attachmentData.IsErpAttachment - Se è un allegato ERP
 * @param {string} attachmentData.Tags - Tag per categorizzare
 * @param {string} attachmentData.CategoryIDs - Lista di ID categorie separate da virgola
 */
const addItemAttachment = async (attachmentData) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('ProjectItemId', sql.BigInt, attachmentData.ProjectItemId || null)
            .input('CompanyId', sql.Int, attachmentData.CompanyId)
            .input('ItemCode', sql.VarChar(64), attachmentData.ItemCode)
            .input('FileName', sql.NVarChar(255), attachmentData.FileName)
            .input('FilePath', sql.NVarChar(sql.MAX), attachmentData.FilePath)
            .input('FileType', sql.NVarChar(sql.MAX), attachmentData.FileType)
            .input('FileSizeKB', sql.Int, attachmentData.FileSizeKB)
            .input('UploadedBy', sql.Int, attachmentData.UploadedBy)
            .input('Description', sql.NVarChar(512), attachmentData.Description || null)
            .input('IsPublic', sql.Bit, attachmentData.IsPublic || 0)
            .input('StorageLocation', sql.VarChar(10), attachmentData.StorageLocation || 'local')
            .input('IsErpAttachment', sql.Bit, attachmentData.IsErpAttachment || 0)
            .input('Tags', sql.NVarChar(255), attachmentData.Tags || null)
            .input('CategoryIDs', sql.NVarChar(sql.MAX), attachmentData.CategoryIDs || null)
            .execute('MA_AddItemAttachment');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in addItemAttachment:', err);
        throw err;
    }
};

/**
 * Elimina un allegato (soft delete)
 * @param {number} attachmentId - ID dell'allegato
 * @param {number} userId - ID dell'utente
 * @param {number} companyId - ID dell'azienda
 * @param {boolean} hardDelete - Se eseguire eliminazione fisica (solo per admin)
 */
const deleteItemAttachment = async (attachmentId, userId, companyId, hardDelete = false) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('UserId', sql.Int, userId)
            .input('CompanyId', sql.Int, companyId)
            .input('HardDelete', sql.Bit, hardDelete ? 1 : 0)
            .execute('MA_DeleteItemAttachment');

        return { success: 1, message: 'Allegato eliminato con successo' };
    } catch (err) {
        console.error('Error in deleteItemAttachment:', err);
        throw err;
    }
};

/**
 * Ripristina un allegato eliminato (soft delete)
 * @param {number} attachmentId - ID dell'allegato
 * @param {number} userId - ID dell'utente
 * @param {number} companyId - ID dell'azienda
 */
const restoreItemAttachment = async (attachmentId, userId, companyId) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('UserId', sql.Int, userId)
            .input('CompanyId', sql.Int, companyId)
            .execute('MA_RestoreItemAttachment');

        return { success: 1, message: 'Allegato ripristinato con successo' };
    } catch (err) {
        console.error('Error in restoreItemAttachment:', err);
        throw err;
    }
};

/**
 * Ottiene un allegato per ID
 * @param {number} attachmentId - ID dell'allegato
 */
const getItemAttachmentById = async (attachmentId) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .query(`
                SELECT * FROM MA_ItemAttachments 
                WHERE AttachmentID = @AttachmentID AND IsVisible = 1
            `);
        
        return result.recordset[0];
    } catch (err) {
        console.error('Error in getItemAttachmentById:', err);
        throw err;
    }
};

/**
 * Condivide un allegato con un'altra azienda
 * @param {number} attachmentId - ID dell'allegato
 * @param {number} targetCompanyId - ID dell'azienda destinataria
 * @param {number} sharedBy - ID dell'utente che condivide
 * @param {string} accessLevel - Livello di accesso ('read', 'download', 'manage')
 */
const shareItemAttachment = async (attachmentId, targetCompanyId, sharedBy, accessLevel = 'read') => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('TargetCompanyId', sql.Int, targetCompanyId)
            .input('SharedBy', sql.Int, sharedBy)
            .input('AccessLevel', sql.VarChar(20), accessLevel)
            .execute('MA_ShareItemAttachment');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in shareItemAttachment:', err);
        throw err;
    }
};

/**
 * Rimuove la condivisione di un allegato
 * @param {number} attachmentId - ID dell'allegato
 * @param {number} targetCompanyId - ID dell'azienda destinataria
 * @param {number} userId - ID dell'utente che rimuove la condivisione
 */
const unshareItemAttachment = async (attachmentId, targetCompanyId, userId) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('TargetCompanyId', sql.Int, targetCompanyId)
            .input('UserId', sql.Int, userId)
            .execute('MA_UnshareItemAttachment');

        return { success: 1, message: 'Condivisione rimossa con successo' };
    } catch (err) {
        console.error('Error in unshareItemAttachment:', err);
        throw err;
    }
};

/**
 * Ottiene le aziende con cui è condiviso un allegato
 * @param {number} attachmentId - ID dell'allegato
 * @param {number} userId - ID dell'utente
 * @param {number} companyId - ID dell'azienda
 */
const getItemAttachmentSharing = async (attachmentId, userId, companyId) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('UserId', sql.Int, userId)
            .input('CompanyId', sql.Int, companyId)
            .execute('MA_GetItemAttachmentSharing');

        return result.recordset;
    } catch (err) {
        console.error('Error in getItemAttachmentSharing:', err);
        throw err;
    }
};

/**
 * Imposta le categorie di un allegato
 * @param {number} attachmentId - ID dell'allegato
 * @param {string} categoryIds - Lista di ID categorie separate da virgola
 * @param {number} userId - ID dell'utente
 * @param {number} companyId - ID dell'azienda
 */
const setItemAttachmentCategories = async (attachmentId, categoryIds, userId, companyId) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('CategoryIDs', sql.NVarChar(sql.MAX), categoryIds)
            .input('UserId', sql.Int, userId)
            .input('CompanyId', sql.Int, companyId)
            .execute('MA_SetItemAttachmentCategories');

        return result.recordset;
    } catch (err) {
        console.error('Error in setItemAttachmentCategories:', err);
        throw err;
    }
};

/**
 * Ottiene tutte le categorie di allegati per un'azienda
 * @param {number} companyId - ID dell'azienda
 */
const getItemAttachmentCategories = async (companyId) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .execute('MA_GetItemAttachmentCategories');

        return result.recordset;
    } catch (err) {
        console.error('Error in getItemAttachmentCategories:', err);
        throw err;
    }
};

/**
 * Aggiunge una nuova categoria di allegati
 * @param {number} companyId - ID dell'azienda
 * @param {string} categoryName - Nome della categoria
 * @param {string} description - Descrizione opzionale
 * @param {string} colorHex - Colore in formato esadecimale
 */
const addItemAttachmentCategory = async (companyId, categoryName, description = null, colorHex = '#1b263b') => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('CategoryName', sql.NVarChar(100), categoryName)
            .input('Description', sql.NVarChar(255), description)
            .input('ColorHex', sql.Char(7), colorHex)
            .execute('MA_AddItemAttachmentCategory');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in addItemAttachmentCategory:', err);
        throw err;
    }
};

/**
 * Ottiene gli allegati per categoria
 * @param {number} categoryId - ID della categoria
 * @param {number} companyId - ID dell'azienda
 * @param {number} userId - ID dell'utente
 */
const getItemAttachmentsByCategory = async (categoryId, companyId, userId) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('CategoryID', sql.Int, categoryId)
            .input('CompanyId', sql.Int, companyId)
            .input('UserId', sql.Int, userId)
            .execute('MA_GetItemAttachmentsByCategory');

        return result.recordset;
    } catch (err) {
        console.error('Error in getItemAttachmentsByCategory:', err);
        throw err;
    }
};

/**
 * Aggiorna i metadati di un allegato
 * @param {number} attachmentId - ID dell'allegato
 * @param {string} description - Nuova descrizione
 * @param {boolean} isPublic - Nuovo valore per IsPublic
 * @param {string} tags - Nuovi tag
 * @param {number} userId - ID dell'utente
 * @param {number} companyId - ID dell'azienda
 */
const updateItemAttachment = async (attachmentId, description = null, isPublic = null, tags = null, userId, companyId) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('Description', sql.NVarChar(512), description)
            .input('IsPublic', sql.Bit, isPublic)
            .input('Tags', sql.NVarChar(255), tags)
            .input('UserId', sql.Int, userId)
            .input('CompanyId', sql.Int, companyId)
            .execute('MA_UpdateItemAttachment');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in updateItemAttachment:', err);
        throw err;
    }
};

/**
 * Aggiorna il mapping del codice di un allegato
 * @param {number} attachmentId - ID dell'allegato
 * @param {string} oldItemCode - Vecchio codice articolo
 * @param {string} newItemCode - Nuovo codice articolo
 * @param {number} companyId - ID dell'azienda
 * @param {number} userId - ID dell'utente
 */
const updateItemAttachmentCodeMap = async (attachmentId, oldItemCode, newItemCode, companyId, userId) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('OldItemCode', sql.VarChar(64), oldItemCode)
            .input('NewItemCode', sql.VarChar(64), newItemCode)
            .input('CompanyId', sql.Int, companyId)
            .input('UserId', sql.Int, userId)
            .execute('MA_UpdateItemAttachmentCodeMap');

        return { success: 1, message: 'Mapping codice aggiornato con successo' };
    } catch (err) {
        console.error('Error in updateItemAttachmentCodeMap:', err);
        throw err;
    }
};

/**
 * Ottiene le versioni di un allegato
 * @param {number} attachmentId - ID dell'allegato
 * @param {number} userId - ID dell'utente
 * @param {number} companyId - ID dell'azienda
 */
const getItemAttachmentVersions = async (attachmentId, userId, companyId) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('UserId', sql.Int, userId)
            .input('CompanyId', sql.Int, companyId)
            .execute('MA_GetItemAttachmentVersions');

        return result.recordset;
    } catch (err) {
        console.error('Error in getItemAttachmentVersions:', err);
        throw err;
    }
};

/**
 * Aggiunge una nuova versione di un allegato
 * @param {number} attachmentId - ID dell'allegato
 * @param {string} fileName - Nome del file
 * @param {string} filePath - Percorso del file
 * @param {number} fileSizeKB - Dimensione in KB
 * @param {number} uploadedBy - ID dell'utente
 * @param {string} changeNotes - Note sul cambiamento
 * @param {number} companyId - ID dell'azienda
 */
const addItemAttachmentVersion = async (attachmentId, fileName, filePath, fileSizeKB, uploadedBy, changeNotes = null, companyId) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('FileName', sql.NVarChar(255), fileName)
            .input('FilePath', sql.NVarChar(sql.MAX), filePath)
            .input('FileSizeKB', sql.Int, fileSizeKB)
            .input('UploadedBy', sql.Int, uploadedBy)
            .input('ChangeNotes', sql.NVarChar(512), changeNotes)
            .input('CompanyId', sql.Int, companyId)
            .execute('MA_AddItemAttachmentVersion');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in addItemAttachmentVersion:', err);
        throw err;
    }
};

module.exports = {
    getItemAttachments,
    addItemAttachment,
    deleteItemAttachment,
    restoreItemAttachment,
    getItemAttachmentById,
    shareItemAttachment,
    unshareItemAttachment,
    getItemAttachmentSharing,
    setItemAttachmentCategories,
    getItemAttachmentCategories,
    addItemAttachmentCategory,
    getItemAttachmentsByCategory,
    updateItemAttachment,
    updateItemAttachmentCodeMap,
    getItemAttachmentVersions,
    addItemAttachmentVersion
};