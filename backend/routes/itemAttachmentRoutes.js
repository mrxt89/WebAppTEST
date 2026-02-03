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
    addItemAttachmentVersion,
    getItemAttachmentByIdWithDetails,
    getItemAttachmentsWithHierarchy,
    getItemAttachmentVersionById,
    restoreItemAttachmentVersion
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
    'application/acad',
    'application/vnd.autodesk.dwg',
    'application/vnd.autodesk.step',
    'application/x-step',
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
    'application/x-solidedge-part',
    'application/x-solidedge-assembly',
    'application/x-solidedge-sheet',
    'application/vnd.siemens.plm.parasolid',
    'application/x-rhino3d',
    'application/x-3ds',
    'application/x-obj',
    'application/x-sketchup',
    'application/x-blend',
    'application/vnd.dassault.catia',
    'application/x-jt',
    'model/vrml',
    'model/x3d+xml',
    'model/obj',
    'application/3ds',
    'application/vnd.fusion360',
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
    'application/octet-stream'  // Fallback per formati binari sconosciuti
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
        fileSize: 400 * 1024 * 1024 // 400MB limit
    },
    fileFilter: (req, file, cb) => {
        // Check MIME type
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
            return;
        }

        // Controllo aggiuntivo basato sull'estensione per file CAD, tecnici e 3D
        const cadExtensions = [
            // Estensioni base
            '.dxf', '.dwg', '.step', '.stp', '.iges', '.igs', '.stl', '.ipt', '.iam', '.idw', '.sldprt', '.sldasm', '.slddrw',
            
            // Rhino
            '.3dm',
            
            // SolidEdge
            '.par', '.asm', '.psm', '.pwd', '.dft',
            
            // Parasolid
            '.x_t', '.x_b', '.xmt', '.xmt_txt',
            
            // CATIA
            '.CATPart', '.CATProduct', '.CATDrawing', '.cgr', '.3dxml',
            
            // Fusion 360
            '.f3d', '.f3z',
            
            // SketchUp
            '.skp', '.skb',
            
            // Blender
            '.blend',
            
            // Altri formati 3D
            '.jt',         // Siemens JT
            '.wrl',        // VRML
            '.obj',        // Wavefront OBJ
            '.fbx',        // Autodesk FBX
            '.dae',        // COLLADA
            '.3ds',        // 3D Studio
            '.max',        // 3ds Max
            '.c4d',        // Cinema 4D
            '.mb', '.ma',  // Maya
            '.x3d', '.x3dz', // X3D
            '.gltf', '.glb', // glTF
            '.usd', '.usda', '.usdc', '.usdz', // Universal Scene Description
            '.rvt', '.rfa', // Revit
            '.ifc',        // Industry Foundation Classes (BIM)
            '.prt',        // NX/Unigraphics (gestito separatamente per .prt.1, .prt.2, etc.)
            '.sat', '.sab', // ACIS
            '.vda',        // VDA-FS
            '.neu',        // NEU
            '.iv',         // Inventor
            '.prc',        // Product Representation Compact
            '.creo',       // PTC Creo/ProE
            '.pln',        // ArchiCAD 
            '.ply',        // Polygon File Format
            '.zpr',        // Z Corporation
            '.scad',       // OpenSCAD
            '.slc',        // SLC format
            '.vtk',        // Visualization Toolkit
            '.off',        // Object File Format
            '.amf',        // Additive Manufacturing File
            '.3mf'         // 3D Manufacturing Format
        ];
        
        const emailExtensions = ['.eml', '.msg', '.mbox', '.pst', '.emlx'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        // Aggiungi supporto per estensioni numeriche come .prt.1, .prt.2, etc.
        if (ext.match(/\.\d+$/) && file.originalname.includes('.prt.')) {
            cb(null, true);
            return;
        }
        
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

        // Restituisci sempre un array (vuoto se non ci sono allegati)
        res.json(attachments || []);
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

        // LOGGING: Traccia aggiunta allegato articolo (ERP o progetto)
        // result è l'oggetto con AttachmentID, FileName, ecc. dalla stored procedure
        const attachmentId = result.Id || result.AttachmentID || null;
        
        console.log('[LOG DEBUG] Upload allegato item-code:', {
            attachmentId: attachmentId,
            itemCode: itemCode,
            companyId: companyId,
            userId: userId,
            resultKeys: Object.keys(result || {}),
            resultId: result?.Id,
            resultAttachmentID: result?.AttachmentID,
            hasResult: !!result
        });
        
        if (result && attachmentId) {
            const { logActivity, getRequestInfo } = require('../queries/projectActivityLog');
            const requestInfo = getRequestInfo(req);
            
            // Recupera ProjectID dall'articolo (se è un articolo progetto)
            let projectId = null;
            let itemId = null;
            try {
                const sql = require('mssql');
                const config = require('../config');
                const pool = await sql.connect(config.database);
                
                // Prima verifica se è un articolo progetto
                const projectItemInfo = await pool.request()
                    .input('CompanyId', sql.Int, companyId)
                    .input('ItemCode', sql.VarChar(64), itemCode)
                    .query(`
                        SELECT i.Id, pi.ProjectID
                        FROM dbo.MA_ProjectArticles_Items i
                        LEFT JOIN dbo.MA_ProjectsItems pi ON i.Id = pi.ItemId AND i.CompanyId = pi.CompanyId
                        WHERE i.CompanyId = @CompanyId AND i.Item = @ItemCode
                    `);
                
                if (projectItemInfo.recordset.length > 0) {
                    itemId = projectItemInfo.recordset[0].Id;
                    projectId = projectItemInfo.recordset[0].ProjectID;
                }
            } catch (err) {
                console.warn('Errore nel recupero progetto per logging allegato item-code:', err);
            }
            
            await logActivity({
                companyId,
                projectId: projectId,
                userId,
                activityType: 'ATTACHMENT_CREATE',
                entityType: 'Attachment',
                entityId: attachmentId,
                entityCode: fileInfo.originalName,
                action: 'CREATE',
                description: `Aggiunto allegato ${fileInfo.originalName} all'articolo ${itemCode}${isErpAttachment ? ' (ERP)' : ''}`,
                newValues: {
                    AttachmentId: attachmentId,
                    FileName: fileInfo.originalName,
                    FileType: fileInfo.fileType,
                    FileSizeKB: fileInfo.fileSizeKB,
                    ItemCode: itemCode,
                    ItemId: itemId,
                    IsPublic: isPublic,
                    IsErpAttachment: isErpAttachment,
                    Description: description
                },
                metadata: {
                    attachmentId: attachmentId,
                    itemId: itemId,
                    itemCode: itemCode,
                    fileName: fileInfo.originalName,
                    fileSizeKB: fileInfo.fileSizeKB,
                    fileType: fileInfo.fileType,
                    isPublic: isPublic,
                    isErpAttachment: isErpAttachment
                },
                ...requestInfo
            }).catch(err => {
                console.error('Errore nel logging attività allegato item-code:', err);
                console.error('Dettagli errore logging:', {
                    message: err.message,
                    stack: err.stack,
                    logData: {
                        companyId,
                        projectId,
                        userId,
                        activityType: 'ATTACHMENT_CREATE',
                        entityType: 'Attachment',
                        entityId: attachmentId
                    }
                });
            });
        } else {
            console.warn('[LOG WARNING] Upload allegato item-code non loggato - risultato non valido:', {
                result: result,
                itemCode: itemCode,
                attachmentId: attachmentId
            });
        }

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

        // DEBUG: Log del risultato completo
        console.log('[LOG DEBUG] Risultato addItemAttachment:', JSON.stringify(result, null, 2));

        // LOGGING: Traccia aggiunta allegato articolo progetto
        // La funzione addItemAttachment restituisce result.recordset[0] che contiene i dati dell'allegato inserito
        // Quindi result è un oggetto con AttachmentID, Id, ecc. (non ha success)
        const attachmentId = result.Id || result.AttachmentID || (result.data && (result.data.Id || result.data.AttachmentID)) || null;
        
        console.log('[LOG DEBUG] Valori estratti:', {
            attachmentId: attachmentId,
            resultKeys: Object.keys(result || {}),
            resultId: result?.Id,
            resultAttachmentID: result?.AttachmentID,
            hasResult: !!result
        });
        
        // Se abbiamo un risultato (anche senza success esplicito), loggiamo
        if (result && attachmentId) {
            const { logActivity, getRequestInfo } = require('../queries/projectActivityLog');
            const requestInfo = getRequestInfo(req);
            
            // Recupera ProjectID e ItemId dall'articolo progetto
            let projectId = null;
            let itemId = projectItemId;
            try {
                const sql = require('mssql');
                const config = require('../config');
                const pool = await sql.connect(config.database);
                const itemInfo = await pool.request()
                    .input('CompanyId', sql.Int, companyId)
                    .input('ItemId', sql.BigInt, projectItemId)
                    .query(`
                        SELECT pi.ProjectID, pi.ItemId
                        FROM dbo.MA_ProjectsItems pi
                        WHERE pi.ItemId = @ItemId AND pi.CompanyId = @CompanyId
                    `);
                if (itemInfo.recordset.length > 0) {
                    projectId = itemInfo.recordset[0].ProjectID;
                    itemId = itemInfo.recordset[0].ItemId || projectItemId;
                }
            } catch (err) {
                console.warn('Errore nel recupero progetto per logging allegato:', err);
            }
            
            console.log('[LOG DEBUG] Upload allegato progetto:', {
                resultSuccess: result.success,
                attachmentId: attachmentId,
                projectItemId: projectItemId,
                itemCode: actualItemCode,
                projectId: projectId,
                companyId: companyId,
                userId: userId
            });
            
            await logActivity({
                companyId,
                projectId: projectId,
                userId,
                activityType: 'ATTACHMENT_CREATE',
                entityType: 'Attachment',
                entityId: attachmentId,
                entityCode: fileInfo.originalName,
                action: 'CREATE',
                description: `Aggiunto allegato ${fileInfo.originalName} all'articolo ${actualItemCode || projectItemId}`,
                newValues: {
                    AttachmentId: attachmentId,
                    FileName: fileInfo.originalName,
                    FileType: fileInfo.fileType,
                    FileSizeKB: fileInfo.fileSizeKB,
                    ItemCode: actualItemCode,
                    ItemId: itemId,
                    ProjectItemId: projectItemId,
                    IsPublic: isPublic,
                    Description: description
                },
                metadata: {
                    attachmentId: attachmentId,
                    itemId: itemId,
                    projectItemId: projectItemId,
                    itemCode: actualItemCode,
                    fileName: fileInfo.originalName,
                    fileSizeKB: fileInfo.fileSizeKB,
                    fileType: fileInfo.fileType,
                    isPublic: isPublic
                },
                ...requestInfo
            }).catch(err => {
                console.error('Errore nel logging attività allegato:', err);
                console.error('Dettagli errore logging:', {
                    message: err.message,
                    stack: err.stack,
                    logData: {
                        companyId,
                        projectId,
                        userId,
                        activityType: 'ATTACHMENT_CREATE',
                        entityType: 'Attachment',
                        entityId: attachmentId
                    }
                });
            });
        } else {
            console.warn('[LOG WARNING] Upload allegato non loggato - risultato non valido:', {
                result: result,
                projectItemId: projectItemId,
                actualItemCode: actualItemCode
            });
        }

        // La risposta deve essere coerente con quello che il frontend si aspetta
        // result è già l'oggetto con AttachmentID, FileName, ecc. dalla stored procedure
        res.json({ 
            success: 1, 
            data: result,
            // Mantieni compatibilità con il formato atteso dal frontend
            AttachmentID: result.AttachmentID || result.Id,
            FileName: result.FileName,
            FilePath: result.FilePath,
            FileSizeKB: result.FileSizeKB,
            FileType: result.FileType,
            UploadedAt: result.UploadedAt || result.UploadDate
        });
    } catch (error) {
        console.error('Error uploading project item attachment:', error);
        res.status(500).json({ success: 0, message: 'Errore nel caricamento dell\'allegato', error: error.toString() });
    }
});

// Download di un allegato
router.get('/item-attachments/:attachmentId/download', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        console.log('Download requested for attachment:', attachmentId);
        
        const attachment = await getItemAttachmentById(attachmentId);
        console.log('Attachment found:', attachment);
        
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
        
        // LOGGING: Traccia eliminazione allegato
        const { logActivity, getRequestInfo } = require('../queries/projectActivityLog');
        const requestInfo = getRequestInfo(req);
        
        // Recupera ProjectID dall'articolo
        let projectId = null;
        let itemCode = attachment.ItemCode;
        let itemId = attachment.ItemId;
        
        if (itemId) {
            try {
                const sql = require('mssql');
                const config = require('../config');
                const pool = await sql.connect(config.database);
                const itemInfo = await pool.request()
                    .input('CompanyId', sql.Int, companyId)
                    .input('ItemId', sql.BigInt, itemId)
                    .query(`
                        SELECT pi.ProjectID
                        FROM dbo.MA_ProjectsItems pi
                        WHERE pi.CompanyId = @CompanyId AND pi.ItemId = @ItemId
                    `);
                if (itemInfo.recordset.length > 0) {
                    projectId = itemInfo.recordset[0].ProjectID;
                }
            } catch (err) {
                console.warn('Errore nel recupero progetto per logging eliminazione allegato:', err);
            }
        }
        
        await logActivity({
            companyId,
            projectId: projectId,
            userId,
            activityType: 'ATTACHMENT_DELETE',
            entityType: 'Attachment',
            entityId: attachmentId,
            entityCode: attachment.FileName,
            action: 'DELETE',
            description: `Eliminato allegato ${attachment.FileName} dall'articolo ${itemCode || itemId || 'N/A'}`,
            oldValues: {
                AttachmentId: attachmentId,
                FileName: attachment.FileName,
                FileType: attachment.FileType,
                ItemCode: itemCode,
                ItemId: itemId,
                Description: attachment.Description
            },
            metadata: {
                attachmentId: attachmentId,
                fileName: attachment.FileName,
                fileType: attachment.FileType,
                itemCode: itemCode,
                itemId: itemId,
                hardDelete: hardDelete
            },
            ...requestInfo
        }).catch(err => {
            console.warn('Errore nel logging eliminazione allegato:', err);
        });
        
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

// Download di una versione specifica di un allegato
router.get('/item-attachments/versions/:versionId/download', authenticateToken, async (req, res) => {
    try {
        const versionId = parseInt(req.params.versionId);
        const userId = req.user.UserId;
        const companyId = req.user.CompanyId;

        console.log('Download requested for version:', versionId);

        // Ottieni i dettagli della versione
        const version = await getItemAttachmentVersionById(versionId, userId, companyId);

        if (!version) {
            return res.status(404).json({ success: 0, message: 'Versione non trovata o non accessibile' });
        }

        console.log('Version found:', version);

        // Crea lo stream del file dalla versione storica
        const fileStream = await fileService.getFileStream(version.FilePath);
        res.setHeader('Content-Type', version.FileType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${version.FileName}"`);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error downloading version:', error);
        res.status(500).json({ success: 0, message: 'Errore nel download della versione' });
    }
});

// Ripristina una versione specifica di un allegato
router.post('/item-attachments/:attachmentId/versions/:versionId/restore', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const versionId = parseInt(req.params.versionId);
        const userId = req.user.UserId;
        const companyId = req.user.CompanyId;

        console.log('Restore version requested:', { attachmentId, versionId, userId, companyId });

        // Ripristina la versione
        const result = await restoreItemAttachmentVersion(attachmentId, versionId, userId, companyId);

        res.json({ success: 1, data: result, message: 'Versione ripristinata con successo' });
    } catch (error) {
        console.error('Error restoring version:', error);
        res.status(500).json({ success: 0, message: 'Errore nel ripristino della versione', error: error.toString() });
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
        
        // Ottieni l'allegato prima della modifica per logging
        const attachmentBefore = await getItemAttachmentById(attachmentId);
        
        // Chiamata al database per aggiornare l'allegato
        const result = await updateItemAttachment(
            attachmentId,
            description,
            isPublic,
            tags, // ora passiamo null invece di stringa vuota
            userId,
            companyId
        );
        
        // LOGGING: Traccia modifica allegato
        if (attachmentBefore) {
            const { logActivity, getRequestInfo } = require('../queries/projectActivityLog');
            const requestInfo = getRequestInfo(req);
            
            // Recupera ProjectID dall'articolo
            let projectId = null;
            let itemCode = attachmentBefore.ItemCode;
            let itemId = attachmentBefore.ItemId;
            
            if (itemId) {
                try {
                    const sql = require('mssql');
                    const config = require('../config');
                    const pool = await sql.connect(config.database);
                    const itemInfo = await pool.request()
                        .input('CompanyId', sql.Int, companyId)
                        .input('ItemId', sql.BigInt, itemId)
                        .query(`
                            SELECT pi.ProjectID
                            FROM dbo.MA_ProjectsItems pi
                            WHERE pi.CompanyId = @CompanyId AND pi.ItemId = @ItemId
                        `);
                    if (itemInfo.recordset.length > 0) {
                        projectId = itemInfo.recordset[0].ProjectID;
                    }
                } catch (err) {
                    console.warn('Errore nel recupero progetto per logging modifica allegato:', err);
                }
            }
            
            await logActivity({
                companyId,
                projectId: projectId,
                userId,
                activityType: 'ATTACHMENT_UPDATE',
                entityType: 'Attachment',
                entityId: attachmentId,
                entityCode: attachmentBefore.FileName,
                action: 'UPDATE',
                description: `Modificato allegato ${attachmentBefore.FileName} dell'articolo ${itemCode || itemId || 'N/A'}`,
                oldValues: {
                    Description: attachmentBefore.Description,
                    IsPublic: attachmentBefore.IsPublic,
                    Tags: attachmentBefore.Tags
                },
                newValues: {
                    Description: description,
                    IsPublic: isPublic,
                    Tags: tags
                },
                metadata: {
                    attachmentId: attachmentId,
                    fileName: attachmentBefore.FileName,
                    itemCode: itemCode,
                    itemId: itemId
                },
                ...requestInfo
            }).catch(err => {
                console.warn('Errore nel logging modifica allegato:', err);
            });
        }
        
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

// Ottieni un singolo allegato per ID con tutti i dettagli
router.get('/item-attachments/:attachmentId', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const companyId = req.user.CompanyId;
        
        const attachment = await getItemAttachmentByIdWithDetails(attachmentId, companyId);
        
        if (!attachment) {
            return res.status(404).json({ 
                success: 0, 
                message: 'Allegato non trovato o non accessibile' 
            });
        }
        
        res.json(attachment);
    } catch (error) {
        console.error('Error fetching attachment by ID:', error);
        res.status(500).json({ 
            success: 0, 
            message: 'Errore nel recupero dell\'allegato' 
        });
    }
});

router.get('/item-attachments/bom/:bomId/hierarchy', authenticateToken, async (req, res) => {
    try {
        const bomId = parseInt(req.params.bomId);
        const companyId = req.user.CompanyId;
        const includeShared = req.query.includeShared !== 'false';
        const isErpAttachment = req.query.isErpAttachment === 'true' ? true : 
                              req.query.isErpAttachment === 'false' ? false : null;

        const attachments = await getItemAttachmentsWithHierarchy(
            bomId, 
            companyId, 
            includeShared, 
            isErpAttachment
        );

        res.json(attachments || []);
    } catch (error) {
        console.error('Error fetching hierarchical attachments:', error);
        res.status(500).json({ 
            success: 0, 
            message: 'Errore nel recupero degli allegati gerarchici' 
        });
    }
});

module.exports = router;