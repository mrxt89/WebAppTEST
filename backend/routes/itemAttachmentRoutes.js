// Backend/routes/itemAttachmentRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const archiver = require('archiver');
const path = require('path');
const FileService = require('../services/fileService');
const authenticateToken = require('../authenticateToken');
const fs = require('fs').promises;
const sql = require('mssql');
const config = require('../config');

const {
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
} = require('../queries/itemAttachmentQueries');

const fileService = new FileService();

// Configurazione multer (riutilizzando la stessa configurazione degli altri allegati)
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'image/tiff',
    'image/webp',
    'image/x-icon',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    'audio/x-aac',
    'video/mp4',
    'video/ogg',
    'video/webm',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-tar',
    'application/dxf',
    'application/dwg',
    'application/step',
    'application/stp',
    'application/iges',
    'application/igs',
    'application/vnd.ms-pki.stl',
    'application/stl',
    'application/vnd.autodesk.inventor.part',
    'application/vnd.autodesk.inventor.assembly',
    'application/vnd.autodesk.inventor.drawing',
    'application/vnd.solidworks.part',
    'application/vnd.solidworks.assembly',
    'application/vnd.solidworks.drawing',
    // Formati email
    'message/rfc822',
    'application/vnd.ms-outlook',
    'application/x-outlook-msg',
    'application/mbox',
    'application/x-mbox',
    'application/vnd.ms-outlook-pst',
    'application/x-ole-storage',
    'text/x-eml',
    'message/partial',
    'application/x-emlx',
];

// Configurazione multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensure the directory exists
        const uploadDir = path.join(process.cwd(), 'temp', 'uploads');
        fs.mkdir(uploadDir, { recursive: true })
            .then(() => {
                cb(null, uploadDir);
            })
            .catch(err => {
                console.error(`Error creating temp upload directory: ${err}`);
                cb(err);
            });
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    },
    fileFilter: (req, file, cb) => {
        // Check MIME type
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
            return;
        }

        // Controllo aggiuntivo basato sull'estensione per file CAD e tecnici
        const cadExtensions = ['.dxf', '.dwg', '.step', '.stp', '.iges', '.igs', '.stl', '.ipt', '.iam', '.idw', '.sldprt', '.sldasm', '.slddrw'];
        const emailExtensions = ['.eml', '.msg', '.mbox', '.pst', '.emlx'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (cadExtensions.includes(ext) || emailExtensions.includes(ext)) {
            cb(null, true);
            return;
        }

        cb(new Error('Tipo di file non consentito'));
    }
});

// ENDPOINT PER ALLEGATI ARTICOLI

// Ottieni gli allegati di un articolo per codice
router.get('/item-attachments/item-code/:itemCode', authenticateToken, async (req, res) => {
    try {
        const itemCode = req.params.itemCode;
        const companyId = req.user.CompanyId;
        const includeShared = req.query.includeShared !== 'false'; // default true
        const isErpAttachment = req.query.isErpAttachment === 'true' ? true : 
                              req.query.isErpAttachment === 'false' ? false : null;

        const attachments = await getItemAttachments(
            itemCode, 
            null, // projectItemId
            companyId, 
            includeShared, 
            isErpAttachment
        );

        // Se non ci sono allegati, restituisci un messaggio di errore
        if (!attachments || attachments.length === 0) {
            return res.status(404).json({ success: 0, message: 'Nessun allegato trovato' });
        }
        
        res.json(attachments);
    } catch (error) {
        console.error('Error fetching item attachments:', error);
        res.status(500).json({ success: 0, message: 'Errore nel recupero degli allegati dell\'articolo' });
    }
});

// Ottieni gli allegati di un articolo progetto per ID
router.get('/item-attachments/project-item/:projectItemId', authenticateToken, async (req, res) => {
    try {
        const projectItemId = parseInt(req.params.projectItemId);
        const companyId = req.user.CompanyId;
        const includeShared = req.query.includeShared !== 'false'; // default true
        const isErpAttachment = req.query.isErpAttachment === 'true' ? true : 
                              req.query.isErpAttachment === 'false' ? false : null;

        const attachments = await getItemAttachments(
            null, // itemCode
            projectItemId, 
            companyId, 
            includeShared, 
            isErpAttachment
        );
        
        res.json(attachments);
    } catch (error) {
        console.error('Error fetching project item attachments:', error);
        res.status(500).json({ success: 0, message: 'Errore nel recupero degli allegati dell\'articolo progetto' });
    }
});

// Carica un nuovo allegato per articolo
router.post('/item-attachments/item-code/:itemCode/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const itemCode = req.params.itemCode;
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        
        // Controllo di sicurezza
        const isPublic = req.body && req.body.isPublic === 'true' ? true : false;
        const isErpAttachment = req.body && req.body.isErpAttachment === 'true' ? true : false;
        const description = req.body ? req.body.description : null;
        const categoryIds = req.body ? req.body.categoryIds : null;
        const tags = req.body ? req.body.tags : null;

        if (!req.file) {
            return res.status(400).json({ success: 0, message: 'Nessun file caricato' });
        }

        // Percorso specifico per gli allegati articoli
        const fileInfo = await fileService.saveFile(
            req.file,
            null, // projectId
            null, // taskId
            null, // notificationId
            itemCode, // itemCode
            companyId // companyId
        );

        // Aggiungi l'allegato
        const result = await addItemAttachment({
            ProjectItemId: null, // Per articoli ERP
            CompanyId: companyId,
            ItemCode: itemCode,
            FileName: fileInfo.originalName,
            FilePath: fileInfo.filePath,
            FileType: fileInfo.fileType,
            FileSizeKB: fileInfo.fileSizeKB,
            UploadedBy: userId,
            Description: description,
            IsPublic: isPublic ? 1 : 0,
            StorageLocation: fileInfo.storageType || 'local',
            IsErpAttachment: isErpAttachment ? 1 : 0,
            Tags: tags,
            CategoryIDs: categoryIds
        });

        res.json({ success: 1, data: result });
    } catch (error) {
        console.error('Error uploading item attachment:', error);
        res.status(500).json({ success: 0, message: 'Errore nel caricamento dell\'allegato' });
    }
});

// Carica un nuovo allegato per articolo progetto
router.post('/item-attachments/project-item/:projectItemId/upload', authenticateToken, (req, res, next) => {
    next();
}, upload.single('file'), async (req, res) => {
    try {
        const projectItemId = parseInt(req.params.projectItemId);
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        
        // Controllo di sicurezza
        const isPublic = req.body && req.body.isPublic === 'true' ? true : false;
        const description = req.body ? req.body.description : null;
        const itemCode = req.body ? req.body.itemCode : null;
        const categoryIds = req.body ? req.body.categoryIds : null;
        const tags = req.body ? req.body.tags : null;

        if (!req.file) {
            return res.status(400).json({ success: 0, message: 'Nessun file caricato' });
        }

        // Se non è fornito itemCode, ottienilo dalla tabella progetti articoli
        let actualItemCode = itemCode;
        if (!actualItemCode) {
            // Query per ottenere il codice articolo dal projectItemId
            let pool = await sql.connect(config.database);
            const result = await pool.request()
                .input('ProjectItemId', sql.BigInt, projectItemId)
                .input('CompanyId', sql.Int, companyId)
                .query('SELECT Item FROM MA_ProjectArticles_Items WHERE Id = @ProjectItemId AND CompanyId = @CompanyId');
            
            if (result.recordset.length > 0) {
                actualItemCode = result.recordset[0].Item;
            } else {
                return res.status(404).json({ success: 0, message: 'Articolo progetto non trovato' });
            }
        }

        // Percorso specifico per gli allegati articoli progetto
        const fileInfo = await fileService.saveFile(
            req.file,
            null, // projectId
            null, // taskId
            null, // notificationId
            actualItemCode, // itemCode
            companyId // companyId
        );

        // Aggiungi l'allegato
        const result = await addItemAttachment({
            ProjectItemId: projectItemId,
            CompanyId: companyId,
            ItemCode: actualItemCode,
            FileName: fileInfo.originalName,
            FilePath: fileInfo.filePath,
            FileType: fileInfo.fileType,
            FileSizeKB: fileInfo.fileSizeKB,
            UploadedBy: userId,
            Description: description,
            IsPublic: isPublic ? 1 : 0,
            StorageLocation: fileInfo.storageType || 'local',
            IsErpAttachment: 0, // Non è un allegato ERP
            Tags: tags,
            CategoryIDs: categoryIds
        });

        res.json({ success: 1, data: result });
    } catch (error) {
        console.error('Error uploading project item attachment:', error);
        res.status(500).json({ success: 0, message: 'Errore nel caricamento dell\'allegato', error: error.toString() });
    }
});

// Download di un allegato
router.get('/item-attachments/:attachmentId/download', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const attachment = await getItemAttachmentById(attachmentId);
        
        if (!attachment) {
            return res.status(404).json({ success: 0, message: 'Allegato non trovato' });
        }

        const fileStream = await fileService.getFileStream(attachment.FilePath);
        res.setHeader('Content-Type', attachment.FileType);
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.FileName}"`);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error downloading attachment:', error);
        res.status(500).json({ success: 0, message: 'Errore nel download dell\'allegato' });
    }
});

// Eliminazione di un allegato
router.delete('/item-attachments/:attachmentId', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const userId = req.user.UserId;
        const companyId = req.user.CompanyId;
        const hardDelete = req.query.hardDelete === 'true';
        
        // Ottieni l'allegato prima di eliminarlo (per l'eliminazione fisica del file)
        const attachment = await getItemAttachmentById(attachmentId);
        if (!attachment) {
            return res.status(404).json({ success: 0, message: 'Allegato non trovato' });
        }

        // Elimina l'allegato dal database
        await deleteItemAttachment(attachmentId, userId, companyId, hardDelete);
        
        // Se è una eliminazione fisica, elimina anche il file
        if (hardDelete) {
            await fileService.deleteFile(attachment.FilePath);
        }
        
        res.json({ success: 1, message: 'Allegato eliminato con successo' });
    } catch (error) {
        console.error('Error deleting attachment:', error);
        res.status(500).json({ success: 0, message: 'Errore nell\'eliminazione dell\'allegato' });
    }
});

// Ripristino di un allegato
router.post('/item-attachments/:attachmentId/restore', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const userId = req.user.UserId;
        const companyId = req.user.CompanyId;
        
        await restoreItemAttachment(attachmentId, userId, companyId);
        
        res.json({ success: 1, message: 'Allegato ripristinato con successo' });
    } catch (error) {
        console.error('Error restoring attachment:', error);
        res.status(500).json({ success: 0, message: 'Errore nel ripristino dell\'allegato' });
    }
});

// Condivisione di un allegato con un'altra azienda
router.post('/item-attachments/:attachmentId/share', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const { targetCompanyId, accessLevel } = req.body;
        const userId = req.user.UserId;
        
        if (!targetCompanyId) {
            return res.status(400).json({ success: 0, message: 'ID azienda destinataria richiesto' });
        }
        
        const result = await shareItemAttachment(
            attachmentId,
            parseInt(targetCompanyId),
            userId,
            accessLevel || 'read'
        );
        
        res.json({ success: 1, data: result });
    } catch (error) {
        console.error('Error sharing attachment:', error);
        res.status(500).json({ success: 0, message: 'Errore nella condivisione dell\'allegato' });
    }
});

// Rimozione condivisione di un allegato
router.delete('/item-attachments/:attachmentId/share/:targetCompanyId', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const targetCompanyId = parseInt(req.params.targetCompanyId);
        const userId = req.user.UserId;
        
        await unshareItemAttachment(attachmentId, targetCompanyId, userId);
        
        res.json({ success: 1, message: 'Condivisione rimossa con successo' });
    } catch (error) {
        console.error('Error unsharing attachment:', error);
        res.status(500).json({ success: 0, message: 'Errore nella rimozione della condivisione' });
    }
});

// Ottieni le condivisioni di un allegato
router.get('/item-attachments/:attachmentId/sharing', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const userId = req.user.UserId;
        const companyId = req.user.CompanyId;
        
        const sharing = await getItemAttachmentSharing(attachmentId, userId, companyId);
        
        res.json(sharing);
    } catch (error) {
        console.error('Error getting attachment sharing:', error);
        res.status(500).json({ success: 0, message: 'Errore nel recupero delle condivisioni' });
    }
});

// GESTIONE CATEGORIE

// Ottieni tutte le categorie
router.get('/item-attachment-categories', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        
        const categories = await getItemAttachmentCategories(companyId);
        
        res.json(categories);
    } catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({ success: 0, message: 'Errore nel recupero delle categorie' });
    }
});

// Aggiungi una nuova categoria
router.post('/item-attachment-categories', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { categoryName, description, colorHex } = req.body;
        
        if (!categoryName) {
            return res.status(400).json({ success: 0, message: 'Nome categoria richiesto' });
        }
        
        const result = await addItemAttachmentCategory(
            companyId,
            categoryName,
            description,
            colorHex
        );
        
        res.json({ success: 1, data: result });
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({ success: 0, message: 'Errore nell\'aggiunta della categoria' });
    }
});

// Ottieni allegati per categoria
router.get('/item-attachment-categories/:categoryId/attachments', authenticateToken, async (req, res) => {
    try {
        const categoryId = parseInt(req.params.categoryId);
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        
        const attachments = await getItemAttachmentsByCategory(categoryId, companyId, userId);
        
        res.json(attachments);
    } catch (error) {
        console.error('Error getting attachments by category:', error);
        res.status(500).json({ success: 0, message: 'Errore nel recupero degli allegati per categoria' });
    }
});

// Imposta le categorie di un allegato
router.post('/item-attachments/:attachmentId/categories', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const { categoryIds } = req.body;
        const userId = req.user.UserId;
        const companyId = req.user.CompanyId;
        
        const categories = await setItemAttachmentCategories(
            attachmentId,
            categoryIds,
            userId,
            companyId
        );
        
        res.json(categories);
    } catch (error) {
        console.error('Error setting attachment categories:', error);
        res.status(500).json({ success: 0, message: 'Errore nell\'impostazione delle categorie' });
    }
});

// GESTIONE VERSIONI

// Ottieni le versioni di un allegato
router.get('/item-attachments/:attachmentId/versions', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const userId = req.user.UserId;
        const companyId = req.user.CompanyId;
        
        const versions = await getItemAttachmentVersions(attachmentId, userId, companyId);
        
        res.json(versions);
    } catch (error) {
        console.error('Error getting attachment versions:', error);
        res.status(500).json({ success: 0, message: 'Errore nel recupero delle versioni' });
    }
});

// Aggiungi una nuova versione di un allegato
router.post('/item-attachments/:attachmentId/versions', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const userId = req.user.UserId;
        const companyId = req.user.CompanyId;
        const { changeNotes } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ success: 0, message: 'Nessun file caricato' });
        }
        
        // Ottieni l'allegato originale
        const originalAttachment = await getItemAttachmentById(attachmentId);
        if (!originalAttachment) {
            return res.status(404).json({ success: 0, message: 'Allegato non trovato' });
        }
        
        // Percorso per la nuova versione
        const fileInfo = await fileService.saveFile(
            req.file,
            null, // projectId
            null, // taskId
            null, // notificationId
            originalAttachment.ItemCode, // itemCode
            companyId // companyId
        );
        
        // Aggiungi la nuova versione
        const result = await addItemAttachmentVersion(
            attachmentId,
            fileInfo.originalName,
            fileInfo.filePath,
            fileInfo.fileSizeKB,
            userId,
            changeNotes,
            companyId
        );
        
        res.json({ success: 1, data: result });
    } catch (error) {
        console.error('Error adding attachment version:', error);
        res.status(500).json({ success: 0, message: 'Errore nell\'aggiunta della versione' });
    }
});

// Aggiornamento dei metadati di un allegato
router.put('/item-attachments/:attachmentId', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const userId = req.user.UserId;
        const companyId = req.user.CompanyId;
        
        // Controllo di sicurezza sul body
        if (!req.body) {
            return res.status(400).json({ 
                success: 0, 
                message: 'Corpo della richiesta mancante' 
            });
        }
        
        // Estrai i dati con default values
        const description = req.body.description || null;
        const isPublic = req.body.isPublic !== undefined ? req.body.isPublic : null;
        const isVisible = req.body.isVisible !== undefined ? req.body.isVisible : null;
        const isErpAttachment = req.body.isErpAttachment !== undefined ? req.body.isErpAttachment : null;
        
        // Gestisci correttamente il parametro tags per evitare stringhe vuote
        const tags = req.body.tags === "" ? null : req.body.tags;
        
        // Chiamata al database per aggiornare l'allegato
        const result = await updateItemAttachment(
            attachmentId,
            description,
            isPublic,
            tags, // ora passiamo null invece di stringa vuota
            userId,
            companyId
        );
        
        res.json({ success: 1, data: result });
    } catch (error) {
        console.error('Error updating attachment:', error);
        res.status(500).json({ 
            success: 0, 
            message: 'Errore nell\'aggiornamento dell\'allegato',
            error: error.toString(),
            stack: error.stack
        });
    }
});

// Aggiornamento del codice articolo associato all'allegato
router.put('/item-attachments/:attachmentId/code-mapping', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const userId = req.user.UserId;
        const companyId = req.user.CompanyId;
        const { oldItemCode, newItemCode } = req.body;
        
        if (!oldItemCode || !newItemCode) {
            return res.status(400).json({ success: 0, message: 'Codici articolo vecchio e nuovo richiesti' });
        }
        
        await updateItemAttachmentCodeMap(
            attachmentId,
            oldItemCode,
            newItemCode,
            companyId,
            userId
        );
        
        res.json({ success: 1, message: 'Mapping codice aggiornato con successo' });
    } catch (error) {
        console.error('Error updating code mapping:', error);
        res.status(500).json({ success: 0, message: 'Errore nell\'aggiornamento del mapping codice' });
    }
});

// Download di più allegati di un articolo come ZIP
router.get('/item-attachments/item-code/:itemCode/download-all', authenticateToken, async (req, res) => {
    try {
        const itemCode = req.params.itemCode;
        const companyId = req.user.CompanyId;
        const includeShared = req.query.includeShared !== 'false'; // default true
        
        const attachments = await getItemAttachments(
            itemCode,
            null,
            companyId,
            includeShared,
            null // isErpAttachment
        );
        
        if (!attachments || attachments.length === 0) {
            return res.status(404).json({ success: 0, message: 'Nessun allegato trovato' });
        }
        
        const archive = archiver('zip', { zlib: { level: 9 } });
        const zipFileName = `Item_${itemCode}_Attachments.zip`;
        
        res.attachment(zipFileName);
        archive.pipe(res);
        
        for (const attachment of attachments) {
            const filePath = path.join(fileService.baseUploadPath, attachment.FilePath);
            archive.file(filePath, { name: attachment.FileName });
        }
        
        await archive.finalize();
    } catch (error) {
        console.error('Error creating zip archive:', error);
        res.status(500).json({ success: 0, message: 'Errore nella creazione dell\'archivio zip' });
    }
});

// Download di più allegati di un articolo progetto come ZIP
router.get('/item-attachments/project-item/:projectItemId/download-all', authenticateToken, async (req, res) => {
    try {
        const projectItemId = parseInt(req.params.projectItemId);
        const companyId = req.user.CompanyId;
        const includeShared = req.query.includeShared !== 'false'; // default true
        
        const attachments = await getItemAttachments(
            null,
            projectItemId,
            companyId,
            includeShared,
            null // isErpAttachment
        );
        
        if (!attachments || attachments.length === 0) {
            return res.status(404).json({ success: 0, message: 'Nessun allegato trovato' });
        }
        
        // Ottieni il codice articolo per il nome del file zip
        let itemCode = 'Unknown';
        if (attachments.length > 0 && attachments[0].ItemCode) {
            itemCode = attachments[0].ItemCode;
        }
        
        const archive = archiver('zip', { zlib: { level: 9 } });
        const zipFileName = `ProjectItem_${projectItemId}_${itemCode}_Attachments.zip`;
        
        res.attachment(zipFileName);
        archive.pipe(res);
        
        for (const attachment of attachments) {
            const filePath = path.join(fileService.baseUploadPath, attachment.FilePath);
            archive.file(filePath, { name: attachment.FileName });
        }
        
        await archive.finalize();
    } catch (error) {
        console.error('Error creating zip archive:', error);
        res.status(500).json({ success: 0, message: 'Errore nella creazione dell\'archivio zip' });
    }
});

module.exports = router;