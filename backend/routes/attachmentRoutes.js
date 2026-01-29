const express = require('express');
const router = express.Router();
const multer = require('multer');
const archiver = require('archiver');
const path = require('path');
const FileService = require('../services/fileService');
const authenticateToken = require('../authenticateToken');
const fs = require('fs').promises;
const { simpleParser } = require('mailparser');
const { getEmailWorkerPool } = require('../workers/emailWorker');
const MsgReader = require('@kenjiuno/msgreader').default;
const sql = require('mssql');
const config = require('../config');

const {
    getProjectIdByTaskId,
    getAttachments,
    addAttachment,
    deleteAttachment,
    getAttachmentById,
    updateAttachmentVersion,
    addAttachmentVersion,
    verifyAttachmentBelongsToTask,
    verifyAttachmentBelongsToProject,
    createAttachmentLock,
    releaseAttachmentLock,
    forceReleaseAttachmentLock,
    getAttachmentLockInfo
} = require('../queries/attachmentQueries');

const fileService = new FileService();

// Configurazione dello storage di multer
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

const ALLOWED_MIME_TYPES = [
    // Formati esistenti
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
    
    // Formati Email esistenti
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
    
    // Formati MIME specifici per CAD e 3D (quelli noti)
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
    'application/octet-stream'  // Fallback per formati binari sconosciuti
];

// Aggiorna il controllo aggiuntivo basato sull'estensione per file CAD e 3D
const upload = multer({ 
    storage: storage,  // IMPORTANTE: usa lo storage definito sopra
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
            // Estensioni esistenti
            '.dxf', '.dwg', '.step', '.stp', '.iges', '.igs', '.stl', '.ipt', '.iam', '.idw', '.sldprt', '.sldasm', '.slddrw',
            
            // Nuove estensioni
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
            '.prt', '.prt.*', // NX/Unigraphics
            '.sat', '.sab', // ACIS
            '.vda',        // VDA-FS
            '.neu',        // NEU
            '.cgr',        // CATIA Graphic Representation
            '.iv',         // Inventor
            '.x_t', '.xmt_txt', // Parasolid
            '.prc',        // Product Representation Compact
            '.creo', '.prt.*', // PTC Creo/ProE
            '.neu',        // Neutral file format
            '.pln',        // ArchiCAD 
            '.3dm',        // Rhino
            '.stl',        // Stereolithography
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

// NUOVI ENDPOINT

// Ottieni allegati (task)
router.get('/attachments/:projectId/:taskId?', authenticateToken, async (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId);
        const taskId = req.params.taskId ? parseInt(req.params.taskId) : 0;
        const attachments = await getAttachments(projectId, taskId, notificationId = null, itemCode = null, companyId = null);
        res.json(attachments);
    } catch (error) {
        console.error('Error fetching attachments:', error);
        res.status(500).json({ success: 0, message: 'Error fetching attachments' });
    }
});

// Ottieni allegati di tutto il progetto
router.get('/attachments/:projectId', authenticateToken, async (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId);
        const attachments = await getAttachments(projectId, taskId = null, notificationId = null, itemCode = null, companyId = null);
        res.json(attachments);
    } catch (error) {
        console.error('Error fetching attachments:', error);
        res.status(500).json({ success: 0, message: 'Error fetching attachments' });
    }
});

// Allegati dei codici temporanei
router.post('/attachments/itemCode', authenticateToken, async (req, res) => {
    try {
        const { itemCode } = req.body;  // Get itemCode from request body
        
        // Ensure itemCode is not empty
        if (!itemCode) {
            return res.status(400).json({ error: 'ItemCode is required' });
        }
        
        const attachments = await getAttachments(
            null, // projectId
            null, // taskId
            null, // notificationId
            itemCode, // itemCode
            req.user.CompanyId // companyId
        );
        
        res.json(attachments);
    } catch (err) {
        console.error('Error fetching item attachments:', err);
        res.status(500).json({ error: 'Error fetching attachments' });
    }
});

// Carica un nuovo allegato
router.post('/attachments/:projectId/:taskId?', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId);
        const taskId = req.params.taskId ? parseInt(req.params.taskId) : null;  // Usa null invece di 0
        const userId = req.user.UserId;

        if (!req.file) {
            return res.status(400).json({ success: 0, message: 'No file uploaded' });
        }

        const fileInfo = await fileService.saveFile(req.file, projectId, taskId);
        const result = await addAttachment({
            ProjectID: projectId,
            TaskID: taskId,  // Sarà null per gli allegati del progetto
            FileName: fileInfo.originalName,
            FilePath: fileInfo.filePath,
            FileType: fileInfo.fileType,
            FileSizeKB: fileInfo.fileSizeKB,
            UploadedBy: userId
        });

        res.json(result);
    } catch (error) {
        console.error('Error uploading attachment:', error);
        res.status(500).json({ success: 0, message: 'Error uploading attachment' });
    }
});

// ENDPOINT DI COMPATIBILITÀ PER I TASK

// Ottieni allegati di un task (compatibilità)
router.get('/tasks/:taskId/attachments', authenticateToken, async (req, res) => {
    try {
        const taskId = parseInt(req.params.taskId);
        const projectId = await getProjectIdByTaskId(taskId);
        
        if (!projectId) {
            return res.status(404).json({ success: 0, message: 'Task not found' });
        }

        const attachments = await getAttachments(projectId, taskId, notificationId = null, itemCode = null, companyId = null);
        res.json(attachments);
    } catch (error) {
        console.error('Error fetching attachments:', error);
        res.status(500).json({ success: 0, message: 'Error fetching attachments' });
    }
});

// Upload per task (compatibilità)
router.post('/tasks/:taskId/attachments', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const taskId = parseInt(req.params.taskId);
        const userId = req.user.UserId;
        const projectId = await getProjectIdByTaskId(taskId);
        const notificationId = null;
        const itemCode = null;
        if (!projectId) {
            return res.status(404).json({ success: 0, message: 'Task not found' });
        }

        if (!req.file) {
            return res.status(400).json({ success: 0, message: 'No file uploaded' });
        }

        const fileInfo = await fileService.saveFile(req.file, projectId, taskId, notificationId, itemCode);
        const result = await addAttachment({
            ProjectID: projectId,
            TaskID: taskId,
            FileName: fileInfo.originalName,
            FilePath: fileInfo.filePath,
            FileType: fileInfo.fileType,
            FileSizeKB: fileInfo.fileSizeKB,
            UploadedBy: userId,
            ItemCode: null
        });

        res.json(result);
    } catch (error) {
        console.error('Error uploading attachment:', error);
        res.status(500).json({ success: 0, message: 'Error uploading attachment' });
    }
});

// upload per itemCode (aggiornato con la nuova struttura) 
router.post('/attachments/itemCode/upload/:itemCode', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const userId = req.user.UserId;
        const companyId = req.user.CompanyId;  // Ottieni il CompanyId dall'utente autenticato
        
        const itemCode = req.params.itemCode;
        
        if (!itemCode) {
            return res.status(400).json({ success: 0, message: 'ItemCode is required' });
        }
        
        if (!companyId) {
            return res.status(400).json({ success: 0, message: 'Company ID is required for itemCode attachments' });
        }
        
        if (!req.file) {
            return res.status(400).json({ success: 0, message: 'No file uploaded' });
        }

        // Usa valori espliciti per projectId e taskId, passando anche companyId
        const fileInfo = await fileService.saveFile(
            req.file,      // file
            null,          // projectId
            null,          // taskId
            null,          // notificationId
            itemCode,      // itemCode
            companyId      // companyId - nuovo parametro
        );
        
        const result = await addAttachment({
            ProjectID: null,
            TaskID: null,
            FileName: fileInfo.originalName,
            FilePath: fileInfo.filePath,
            FileType: fileInfo.fileType,
            FileSizeKB: fileInfo.fileSizeKB,
            UploadedBy: userId,
            ItemCode: itemCode,
            CompanyId: companyId
        });

        res.json(result);
    } catch (error) {
        console.error('Error uploading attachment:', error);
        res.status(500).json({ success: 0, message: 'Error uploading attachment' });
    }
});


// ENDPOINTS COMUNI

// Elimina un allegato (con supporto per entrambi i percorsi)
router.delete([ 
    '/attachments/:attachmentId'
    , '/item-attachments/:attachmentId'
    , '/projects/:projectId/attachments/:attachmentId'
    , '/tasks/:taskId/attachments/:attachmentId'], authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const attachment = await getAttachmentById(attachmentId);
        
        if (!attachment) {
            return res.status(404).json({ success: 0, message: 'Attachment not found' });
        }

        await fileService.deleteFile(attachment.FilePath);
        await deleteAttachment(attachmentId);
        res.json({ success: 1, message: 'Attachment deleted successfully' });
    } catch (error) {
        console.error('Error deleting attachment:', error);
        res.status(500).json({ success: 0, message: 'Error deleting attachment' });
    }
});

// Download di un allegato (con supporto per entrambi i percorsi)
router.get([
    '/attachments/:attachmentId/download'
    , '/tasks/:taskId/attachments/:attachmentId/download'
    , '/notifications/:notificationId/attachments/:attachmentId/download'
    , '/item-attachments/:attachmentId/download'
    , '/projects/:projectId/attachments/:attachmentId/download'
], authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const attachment = await getAttachmentById(attachmentId);
        
        if (!attachment) {
            return res.status(404).json({ success: 0, message: 'Attachment not found' });
        }

        const fileStream = await fileService.getFileStream(attachment.FilePath);
        res.setHeader('Content-Type', attachment.FileType);
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.FileName}"`);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error downloading attachment:', error);
        res.status(500).json({ success: 0, message: 'Error downloading attachment' });
    }
});

// Download di più allegati come ZIP (con supporto per entrambi i percorsi)
router.get([
        '/attachments/:projectId/:taskId?/download-all'
        , '/tasks/:taskId/attachments/download-all'
    ], authenticateToken, async (req, res) => {
    try {
        let projectId = req.params.projectId;
        let taskId = req.params.taskId || 0;

        // Se l'endpoint è il vecchio formato (/tasks/:taskId/attachments/download-all)
        if (!projectId && taskId) {
            projectId = await getProjectIdByTaskId(taskId);
            if (!projectId) {
                return res.status(404).json({ success: 0, message: 'Task not found' });
            }
        }

        const attachments = await getAttachments(projectId, taskId, notificationId = null, itemCode = null, companyId = null);
        if (!attachments || attachments.length === 0) {
            return res.status(404).json({ success: 0, message: 'No attachments found' });
        }

        const archive = archiver('zip', { zlib: { level: 9 } });
        const zipFileName = taskId > 0 ? 
            `Task_${taskId}_Attachments.zip` : 
            `Project_${projectId}_Attachments.zip`;
            
        res.attachment(zipFileName);
        archive.pipe(res);

        for (const attachment of attachments) {
            const filePath = path.join(fileService.baseUploadPath, attachment.FilePath);
            archive.file(filePath, { name: attachment.FileName });
        }

        await archive.finalize();
    } catch (error) {
        console.error('Error creating zip archive:', error);
        res.status(500).json({ success: 0, message: 'Error creating zip archive' });
    }
});

// Download di tutti gli allegati di un itemCode come ZIP
router.get('/attachments/itemCode/:itemCode/download-all', authenticateToken, async (req, res) => {
    try {
        const itemCode = req.params.itemCode;
        const companyId = req.user.CompanyId;

        if (!itemCode) {
            return res.status(400).json({ success: 0, message: 'ItemCode is required' });
        }

        const attachments = await getAttachments(null, null, null, itemCode, companyId);
        if (!attachments || attachments.length === 0) {
            return res.status(404).json({ success: 0, message: 'No attachments found' });
        }

        const archive = archiver('zip', { zlib: { level: 9 } });
        const zipFileName = `ItemCode_${itemCode}_Attachments.zip`;
            
        res.attachment(zipFileName);
        archive.pipe(res);

        for (const attachment of attachments) {
            const filePath = path.join(fileService.baseUploadPath, attachment.FilePath);
            archive.file(filePath, { name: attachment.FileName });
        }

        await archive.finalize();
    } catch (error) {
        console.error('Error creating zip archive:', error);
        res.status(500).json({ success: 0, message: 'Error creating zip archive' });
    }
});

// Route ottimizzata che usa worker threads
router.get('/email-preview/:attachmentId', authenticateToken, async (req, res) => {
    let timeoutHandle;
    
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        
        const attachment = await getAttachmentById(attachmentId);
        if (!attachment) {
            return res.status(404).json({ error: 'Attachment not found' });
        }
    
        // Verifica che sia un file email
        if (!attachment.FileType.includes('message/') && 
            !attachment.FileName.toLowerCase().endsWith('.eml') && 
            !attachment.FileName.toLowerCase().endsWith('.msg')) {
            return res.status(400).json({ error: 'Not an email file' });
        }
    
        const filePath = path.join(fileService.baseUploadPath, attachment.FilePath);
        
        // Verifica esistenza file usando fs nativo
        try {
            await fs.access(filePath);
        } catch (err) {
            return res.status(404).json({ error: 'Email file not found' });
        }
        
        // Ottieni dimensione file
        const stats = await fs.stat(filePath);
        const fileSizeMB = stats.size / (1024 * 1024);
        
        console.log(`Email preview requested: ${attachment.FileName} (${fileSizeMB.toFixed(2)}MB)`);
        
        // Limite massimo assoluto
        const MAX_FILE_SIZE_MB = 100;
        
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
            return res.status(413).json({ 
                error: 'Email too large',
                message: `Il file email supera il limite massimo di ${MAX_FILE_SIZE_MB}MB`,
                fileSizeMB: fileSizeMB,
                maxSizeMB: MAX_FILE_SIZE_MB
            });
        }
        
        // Set response timeout basato sulla dimensione del file
        const timeoutMs = Math.min(30000 + (fileSizeMB * 2000), 120000); // Max 2 minuti
        const startTime = Date.now();
        
        timeoutHandle = setTimeout(() => {
            if (!res.headersSent) {
                res.status(504).json({
                    error: 'Processing timeout',
                    message: 'L\'elaborazione dell\'email ha richiesto troppo tempo',
                    fileSizeMB: fileSizeMB
                });
            }
        }, timeoutMs);
        
        // Usa worker pool per file > 1MB
        if (fileSizeMB > 1) {
            console.log('Using worker thread for large email');
            
            try {
                const workerPool = getEmailWorkerPool();
                const result = await workerPool.parseEmail(filePath, {
                    maxSizeMB: 50,
                    timeoutMs: timeoutMs - 5000 // 5 secondi meno del timeout HTTP
                });
                
                clearTimeout(timeoutHandle);
                
                // Aggiungi metadati
                result.processingMethod = 'worker';
                result.processingTimeMs = Date.now() - startTime;
                
                return res.json(result);
                
            } catch (workerError) {
                console.error('Worker processing failed:', workerError);
                clearTimeout(timeoutHandle);
                
                // Fallback a metodo base con limitazioni
                return res.json({
                    from: '',
                    to: '',
                    cc: '',
                    subject: 'Email non processabile',
                    date: new Date(),
                    textBody: `Il file email (${fileSizeMB.toFixed(2)}MB) non può essere processato. Scarica il file per visualizzarlo.`,
                    htmlBody: '',
                    attachments: [],
                    error: 'Processing failed',
                    fileSizeMB: fileSizeMB
                });
            }
        }
        
        // Per file piccoli usa il metodo standard nel thread principale
        console.log('Using main thread for small email');

        // Determina il tipo di file dall'estensione
        const isMsgFile = attachment.FileName.toLowerCase().endsWith('.msg');

        const emailFile = await fs.readFile(filePath);

        let response;

        if (isMsgFile) {
            // ===== PARSING FILE .MSG (Outlook) =====
            console.log('Parsing .msg file with msgreader in main thread');

            try {
                const msgReader = new MsgReader(emailFile);
                const fileData = msgReader.getFileData();

                // Estrai gli allegati e crea mappa CID → Base64
                const attachments = [];
                const cidMap = new Map();

                if (fileData.attachments && fileData.attachments.length > 0) {
                    for (const att of fileData.attachments) {
                        const attData = msgReader.getAttachment(att);
                        const content = attData && attData.content ? attData.content : null;
                        const filename = att.fileName || att.name || 'allegato';

                        attachments.push({
                            filename: filename,
                            contentType: att.mimeType || att.contentType || 'application/octet-stream',
                            size: content ? content.length : 0,
                            contentBase64: content ? content.toString('base64') : null
                        });

                        // Mappa CID per immagini embedded
                        if (content && filename.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i)) {
                            const cid = filename;
                            const mimeType = att.mimeType || 'image/png';
                            const base64 = content.toString('base64');
                            cidMap.set(cid, `data:${mimeType};base64,${base64}`);
                        }
                    }
                }

                // Converti CID → Base64 nell'HTML
                let htmlBody = fileData.bodyHtml || '';
                if (htmlBody && cidMap.size > 0) {
                    cidMap.forEach((dataUrl, cid) => {
                        // Sostituisci cid:filename
                        htmlBody = htmlBody.replace(new RegExp(`cid:${cid}`, 'gi'), dataUrl);
                        // Sostituisci anche src="filename" (caso alternativo)
                        htmlBody = htmlBody.replace(new RegExp(`src="${cid}"`, 'gi'), `src="${dataUrl}"`);
                    });
                }

                clearTimeout(timeoutHandle);

                // Costruisci la risposta
                response = {
                    from: fileData.senderName || fileData.senderEmail || '',
                    to: (fileData.recipients || []).map(r => r.name || r.email).join(', ') || '',
                    cc: (fileData.cc || []).map(r => r.name || r.email).join(', ') || '',
                    subject: fileData.subject || '',
                    date: fileData.creationTime || fileData.lastModificationTime || new Date(),
                    textBody: fileData.body || '',
                    htmlBody: htmlBody,
                    attachments: attachments,
                    fileSizeMB: fileSizeMB,
                    processingMethod: 'main',
                    processingTimeMs: Date.now() - startTime
                };

            } catch (msgError) {
                clearTimeout(timeoutHandle);
                console.error('Error parsing .msg file:', msgError);
                return res.status(500).json({
                    error: 'Failed to parse MSG file',
                    details: process.env.NODE_ENV === 'development' ? msgError.message : 'Internal error'
                });
            }

        } else {
            // ===== PARSING FILE .EML (Standard RFC822) =====
            console.log('Parsing .eml file with mailparser in main thread');

            // Parsing con opzioni ottimizzate
            const parsed = await simpleParser(emailFile, {
                skipHtmlToText: false,
                skipTextContent: false,
                skipImageLinks: true,
                streamAttachments: true,
                // Limiti per evitare memory issues
                maxHeaderLength: 1000000, // 1MB per headers
                strictlyMime: false
            });

            clearTimeout(timeoutHandle);

            // Costruisci risposta
            response = {
                from: parsed.from?.text || '',
                to: parsed.to?.text || '',
                cc: parsed.cc?.text || '',
                subject: parsed.subject || '',
                date: parsed.date || new Date(),
                textBody: parsed.text || '',
                htmlBody: parsed.html || '',
                attachments: (parsed.attachments || []).map(att => ({
                    filename: att.filename,
                    contentType: att.contentType,
                    size: att.size
                })),
                fileSizeMB: fileSizeMB,
                processingMethod: 'main',
                processingTimeMs: Date.now() - startTime
            };
        }

        res.json(response);
        
    } catch (error) {
        clearTimeout(timeoutHandle);
        console.error('Error parsing email:', error);
        
        // Errori specifici
        if (error.code === 'ENOENT') {
            return res.status(404).json({ 
                error: 'File not found',
                message: 'Il file email non è stato trovato sul server'
            });
        }
        
        if (error.message.includes('ENOMEM') || error.message.includes('heap')) {
            return res.status(507).json({ 
                error: 'Insufficient memory',
                message: 'Memoria insufficiente per processare l\'email. Il file è troppo grande o complesso.'
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to parse email', 
            details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
        });
    }
});

// Route alternativa per info base senza parsing completo
router.get('/email-info/:attachmentId', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        
        const attachment = await getAttachmentById(attachmentId);
        if (!attachment) {
            return res.status(404).json({ error: 'Attachment not found' });
        }
        
        // Verifica che sia un file email
        if (!attachment.FileType.includes('message/') && 
            !attachment.FileName.toLowerCase().endsWith('.eml') && 
            !attachment.FileName.toLowerCase().endsWith('.msg')) {
            return res.status(400).json({ error: 'Not an email file' });
        }
        
        const filePath = path.join(fileService.baseUploadPath, attachment.FilePath);
        const stats = await fs.stat(filePath);
        
        // Leggi solo i primi 100KB per estrarre headers base
        const HEADER_READ_SIZE = 100 * 1024; // 100KB
        const buffer = Buffer.alloc(HEADER_READ_SIZE);
        const fileHandle = await fs.open(filePath, 'r');
        
        try {
            await fileHandle.read(buffer, 0, HEADER_READ_SIZE, 0);
            const headerText = buffer.toString('utf8');
            
            // Estrai headers base con regex
            const extractHeader = (name) => {
                const regex = new RegExp(`^${name}:\\s*(.+)$`, 'mi');
                const match = headerText.match(regex);
                return match ? match[1].trim() : '';
            };
            
            res.json({
                fileName: attachment.FileName,
                fileSizeMB: stats.size / (1024 * 1024),
                from: extractHeader('From'),
                to: extractHeader('To'),
                subject: extractHeader('Subject'),
                date: extractHeader('Date'),
                messageId: extractHeader('Message-ID'),
                canPreview: stats.size < 50 * 1024 * 1024, // Can preview if < 50MB
                uploadedAt: attachment.UploadedAt
            });
            
        } finally {
            await fileHandle.close();
        }
        
    } catch (error) {
        console.error('Error getting email info:', error);
        res.status(500).json({ error: 'Failed to get email info' });
    }
});

// Route alternativa per info base senza parsing completo
router.get('/email-info/:attachmentId', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        
        const attachment = await getAttachmentById(attachmentId);
        if (!attachment) {
            return res.status(404).json({ error: 'Attachment not found' });
        }
        
        // Verifica che sia un file email
        if (!attachment.FileType.includes('message/') && 
            !attachment.FileName.toLowerCase().endsWith('.eml') && 
            !attachment.FileName.toLowerCase().endsWith('.msg')) {
            return res.status(400).json({ error: 'Not an email file' });
        }
        
        const filePath = path.join(fileService.baseUploadPath, attachment.FilePath);
        const stats = await fs.stat(filePath);
        
        // Leggi solo i primi 100KB per estrarre headers base
        const HEADER_READ_SIZE = 100 * 1024; // 100KB
        const buffer = Buffer.alloc(HEADER_READ_SIZE);
        const fileHandle = await fs.open(filePath, 'r');
        
        try {
            await fileHandle.read(buffer, 0, HEADER_READ_SIZE, 0);
            const headerText = buffer.toString('utf8');
            
            // Estrai headers base con regex
            const extractHeader = (name) => {
                const regex = new RegExp(`^${name}:\\s*(.+)$`, 'mi');
                const match = headerText.match(regex);
                return match ? match[1].trim() : '';
            };
            
            res.json({
                fileName: attachment.FileName,
                fileSizeMB: stats.size / (1024 * 1024),
                from: extractHeader('From'),
                to: extractHeader('To'),
                subject: extractHeader('Subject'),
                date: extractHeader('Date'),
                messageId: extractHeader('Message-ID'),
                canPreview: stats.size < 50 * 1024 * 1024, // Can preview if < 50MB
                uploadedAt: attachment.UploadedAt
            });
            
        } finally {
            await fileHandle.close();
        }
        
    } catch (error) {
        console.error('Error getting email info:', error);
        res.status(500).json({ error: 'Failed to get email info' });
    }
});

// Funzione helper per parsing streaming di email grandi
async function parseEmailStreaming(filePath, fileName) {
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath, { 
            highWaterMark: 64 * 1024 // 64KB chunks
        });
        
        let headers = {};
        let bodyText = '';
        let bodyHtml = '';
        let attachments = [];
        let headersParsed = false;
        let buffer = '';
        let linesProcessed = 0;
        const MAX_LINES = 10000; // Limita il numero di righe processate
        const MAX_BODY_LENGTH = 500000; // 500KB max per corpo del messaggio
        
        stream.on('data', (chunk) => {
            buffer += chunk.toString('utf8');
            const lines = buffer.split('\n');
            
            // Mantieni l'ultima riga incompleta nel buffer
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                linesProcessed++;
                
                // Interrompi se abbiamo processato troppe righe
                if (linesProcessed > MAX_LINES) {
                    stream.destroy();
                    break;
                }
                
                // Parsing degli headers
                if (!headersParsed) {
                    if (line.trim() === '') {
                        headersParsed = true;
                        continue;
                    }
                    
                    const headerMatch = line.match(/^(From|To|Cc|Subject|Date):\s*(.+)$/i);
                    if (headerMatch) {
                        headers[headerMatch[1].toLowerCase()] = headerMatch[2];
                    }
                } else {
                    // Parsing del body (limitato)
                    if (bodyText.length < MAX_BODY_LENGTH) {
                        // Semplice estrazione del testo (rimuovi HTML tags basilari)
                        const textLine = line.replace(/<[^>]*>/g, '').trim();
                        if (textLine) {
                            bodyText += textLine + '\n';
                        }
                    }
                    
                    // Cerca allegati nel contenuto
                    if (line.includes('Content-Disposition: attachment')) {
                        attachments.push({
                            filename: 'Allegato',
                            contentType: 'application/octet-stream',
                            size: 0
                        });
                    }
                }
            }
        });
        
        stream.on('end', () => {
            resolve({
                from: headers.from || '',
                to: headers.to || '',
                cc: headers.cc || '',
                subject: headers.subject || '',
                date: headers.date ? new Date(headers.date) : new Date(),
                textBody: bodyText.substring(0, MAX_BODY_LENGTH) + (bodyText.length > MAX_BODY_LENGTH ? '\n\n[... contenuto troncato ...]' : ''),
                htmlBody: '', // Non processare HTML per file grandi
                attachments: attachments,
                metadata: {
                    linesProcessed: linesProcessed,
                    truncated: linesProcessed >= MAX_LINES || bodyText.length >= MAX_BODY_LENGTH
                }
            });
        });
        
        stream.on('error', reject);
        
        // Timeout di sicurezza
        setTimeout(() => {
            stream.destroy();
            resolve({
                from: headers.from || '',
                to: headers.to || '',
                cc: headers.cc || '',
                subject: headers.subject || '',
                date: new Date(),
                textBody: 'Email troppo grande: anteprima limitata disponibile',
                htmlBody: '',
                attachments: [],
                error: 'Timeout durante il parsing'
            });
        }, 15000); // 15 secondi timeout per lo streaming
    });
}

/* Routes per la gestione dei file generica, dall'agent per la modifica e salvataggio */

// Aggiungi una nuova versione di un allegato generico
router.post('/attachments/:attachmentId/version', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const userId = req.user.UserId;
        const { changeNotes } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ success: 0, message: 'Nessun file caricato' });
        }
        
        // Ottieni l'allegato originale
        const attachment = await getAttachmentById(attachmentId);
        if (!attachment) {
            return res.status(404).json({ success: 0, message: 'Allegato non trovato' });
        }
        
        // Salva il nuovo file mantenendo la struttura delle cartelle
        const fileInfo = await fileService.saveFile(
            req.file,
            attachment.ProjectID,
            attachment.TaskID,
            attachment.NotificationID,
            attachment.ItemCode,
            attachment.CompanyId
        );
        
        // Backup del file vecchio (opzionale)
        try {
            const oldFilePath = path.join(fileService.baseUploadPath, attachment.FilePath);
            const backupDir = path.join(fileService.baseUploadPath, 'versions', attachmentId.toString());
            await fs.ensureDir(backupDir);
            const backupPath = path.join(backupDir, `${Date.now()}_${attachment.FileName}`);
            await fs.copy(oldFilePath, backupPath);
        } catch (backupError) {
            console.error('Error creating backup:', backupError);
            // Non bloccare l'operazione se il backup fallisce
        }
        
        // Aggiorna il database
        await updateAttachmentVersion(attachmentId, fileInfo.filePath, fileInfo.fileSizeKB, userId);
        
        // Se esiste una tabella di versioning, logga la modifica
        try {
            await addAttachmentVersion(
                attachmentId, 
                1, // VersionNumber - potresti voler incrementare questo
                fileInfo.filePath, 
                fileInfo.fileSizeKB, 
                changeNotes || 'Aggiornamento da Local Agent', 
                userId
            );
        } catch (versionError) {
            console.log('Version table not found or error:', versionError.message);
        }
        
        // Elimina il vecchio file
        try {
            const oldFilePath = path.join(fileService.baseUploadPath, attachment.FilePath);
            await fs.remove(oldFilePath);
        } catch (removeError) {
            console.error('Error removing old file:', removeError);
        }
        
        res.json({ 
            success: 1, 
            message: 'File aggiornato con successo',
            data: {
                attachmentId,
                newFilePath: fileInfo.filePath,
                fileSizeKB: fileInfo.fileSizeKB
            }
        });
        
    } catch (error) {
        console.error('Error updating attachment version:', error);
        res.status(500).json({ 
            success: 0, 
            message: 'Errore nell\'aggiornamento del file',
            error: error.toString() 
        });
    }
});

// Aggiungi versione per task attachments
router.post('/tasks/:taskId/attachments/:attachmentId/version', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const taskId = parseInt(req.params.taskId);
        const userId = req.user.UserId;
        const { changeNotes } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ success: 0, message: 'Nessun file caricato' });
        }
        
        // Verifica che l'attachment appartenga al task
        const attachment = await getAttachmentById(attachmentId);
        if (!attachment) {
            return res.status(404).json({ success: 0, message: 'Allegato non trovato' });
        }
        
        const belongsToTask = await verifyAttachmentBelongsToTask(attachmentId, taskId);
        if (!belongsToTask) {
            return res.status(403).json({ success: 0, message: 'Allegato non appartiene a questo task' });
        }
        
        // Usa la stessa logica della route generica
        const projectId = await getProjectIdByTaskId(taskId);
        const fileInfo = await fileService.saveFile(
            req.file,
            projectId,
            taskId,
            null, // notificationId
            null, // itemCode
            null  // companyId
        );
        
        // Aggiorna database
        await updateAttachmentVersion(attachmentId, fileInfo.filePath, fileInfo.fileSizeKB, userId);
        
        res.json({ 
            success: 1, 
            message: 'File aggiornato con successo',
            data: {
                attachmentId,
                taskId,
                newFilePath: fileInfo.filePath,
                fileSizeKB: fileInfo.fileSizeKB
            }
        });
        
    } catch (error) {
        console.error('Error updating task attachment version:', error);
        res.status(500).json({ 
            success: 0, 
            message: 'Errore nell\'aggiornamento del file' 
        });
    }
});

// Aggiungi versione per project attachments
router.post('/projects/:projectId/attachments/:attachmentId/version', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const projectId = parseInt(req.params.projectId);
        const userId = req.user.UserId;
        const { changeNotes } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ success: 0, message: 'Nessun file caricato' });
        }
        
        // Verifica che l'attachment appartenga al progetto
        const attachment = await getAttachmentById(attachmentId);
        if (!attachment) {
            return res.status(404).json({ success: 0, message: 'Allegato non trovato' });
        }
        
        const belongsToProject = await verifyAttachmentBelongsToProject(attachmentId, projectId);
        if (!belongsToProject) {
            return res.status(403).json({ success: 0, message: 'Allegato non appartiene a questo progetto' });
        }
        
        const fileInfo = await fileService.saveFile(
            req.file,
            projectId,
            null, // taskId
            null, // notificationId
            null, // itemCode
            null  // companyId
        );
        
        // Aggiorna database
        await updateAttachmentVersion(attachmentId, fileInfo.filePath, fileInfo.fileSizeKB, userId);
        
        res.json({ 
            success: 1, 
            message: 'File aggiornato con successo',
            data: {
                attachmentId,
                projectId,
                newFilePath: fileInfo.filePath,
                fileSizeKB: fileInfo.fileSizeKB
            }
        });
        
    } catch (error) {
        console.error('Error updating project attachment version:', error);
        res.status(500).json({ 
            success: 0, 
            message: 'Errore nell\'aggiornamento del file' 
        });
    }
});




// Scarica allegato embedded da email .msg
router.get('/email-preview/:attachmentId/embedded/:index', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const embeddedIndex = parseInt(req.params.index);

        const attachment = await getAttachmentById(attachmentId);
        if (!attachment) {
            return res.status(404).json({ error: 'Attachment not found' });
        }

        // Verifica che sia un file email
        if (!attachment.FileName.toLowerCase().endsWith('.msg')) {
            return res.status(400).json({ error: 'Not a MSG file' });
        }

        const filePath = path.join(fileService.baseUploadPath, attachment.FilePath);

        try {
            await fs.access(filePath);
        } catch (err) {
            return res.status(404).json({ error: 'Email file not found' });
        }

        // Leggi e parsa il file .msg
        const emailFile = await fs.readFile(filePath);
        const msgReader = new MsgReader(emailFile);
        const fileData = msgReader.getFileData();

        if (!fileData.attachments || embeddedIndex >= fileData.attachments.length || embeddedIndex < 0) {
            return res.status(404).json({ error: 'Embedded attachment not found' });
        }

        // Estrai l'allegato specifico
        const att = fileData.attachments[embeddedIndex];
        const attData = msgReader.getAttachment(att);

        if (!attData || !attData.content) {
            return res.status(404).json({ error: 'Attachment content not found' });
        }

        const filename = att.fileName || att.name || `allegato_${embeddedIndex}`;
        const contentType = att.mimeType || att.contentType || 'application/octet-stream';

        // Invia il file
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', attData.content.length);
        res.send(attData.content);

    } catch (error) {
        console.error('Error downloading embedded attachment:', error);
        res.status(500).json({
            error: 'Failed to download attachment',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
        });
    }
});

module.exports = router;

// ============================================
// ROUTES PER GESTIONE LOCK ALLEGATI
// ============================================

// Crea un lock su un allegato (quando si apre in editor)
router.post('/attachment-locks/:attachmentId', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const userId = req.user.UserId;

        // Verifica che l'allegato esista
        const attachment = await getAttachmentById(attachmentId);
        if (!attachment) {
            return res.status(404).json({ success: 0, message: 'Allegato non trovato' });
        }

        // Determina se è un ItemAttachment (ha ItemCode o ProjectItemId)
        const isItemAttachment = attachment.ItemCode || attachment.ProjectItemId;

        // Per ItemAttachment, non creare lock nel database (FK constraint problem)
        // ma restituisci comunque successo per permettere l'apertura del file
        if (isItemAttachment) {
            console.log(`ItemAttachment detected (ID: ${attachmentId}), skipping database lock`);
            return res.json({
                success: 1,
                message: 'Lock creato con successo',
                lockId: null, // Nessun lock reale nel DB
                isItemAttachment: true
            });
        }

        // Per Attachment normali, crea il lock nel database
        const result = await createAttachmentLock(attachmentId, userId);
        res.json(result);

    } catch (error) {
        if (error.code === 'FILE_LOCKED') {
            return res.status(409).json({
                success: 0,
                message: error.message,
                lockedBy: error.lockedBy,
                lockedByName: error.lockedByName,
                lockedAt: error.lockedAt
            });
        }

        console.error('Error creating attachment lock:', error);
        res.status(500).json({ success: 0, message: 'Errore nella creazione del lock' });
    }
});

// Rilascia un lock su un allegato (quando si chiude l'editor)
router.delete('/attachment-locks/:attachmentId', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const userId = req.user.UserId;

        // Verifica se è un ItemAttachment
        const attachment = await getAttachmentById(attachmentId);
        const isItemAttachment = attachment && (attachment.ItemCode || attachment.ProjectItemId);

        // Per ItemAttachment, non c'è lock da rilasciare nel DB
        if (isItemAttachment) {
            console.log(`ItemAttachment detected (ID: ${attachmentId}), no lock to release`);
            return res.json({
                success: 1,
                message: 'Lock rilasciato con successo',
                rowsAffected: 0,
                isItemAttachment: true
            });
        }

        const result = await releaseAttachmentLock(attachmentId, userId);
        res.json(result);

    } catch (error) {
        console.error('Error releasing attachment lock:', error);
        res.status(500).json({ success: 0, message: 'Errore nel rilascio del lock' });
    }
});

// Ottieni informazioni sul lock di un allegato
router.get('/attachment-locks/:attachmentId', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);

        // Verifica se è un ItemAttachment
        const attachment = await getAttachmentById(attachmentId);
        const isItemAttachment = attachment && (attachment.ItemCode || attachment.ProjectItemId);

        // Per ItemAttachment, non ci sono lock nel DB
        if (isItemAttachment) {
            return res.json({
                success: 1,
                hasLock: false,
                lockInfo: null,
                isItemAttachment: true
            });
        }

        const lockInfo = await getAttachmentLockInfo(attachmentId);
        res.json({
            success: 1,
            hasLock: !!lockInfo,
            lockInfo: lockInfo
        });

    } catch (error) {
        console.error('Error getting attachment lock info:', error);
        res.status(500).json({ success: 0, message: 'Errore nel recupero delle informazioni del lock' });
    }
});

// HEARTBEAT: Rinnova lock per mantenere sessione attiva
router.post('/attachment-locks/:attachmentId/keepalive', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const userId = req.user.userId;

        // Verifica se è un ItemAttachment (non ha lock)
        const attachment = await getAttachmentById(attachmentId);
        const isItemAttachment = attachment && (attachment.ItemCode || attachment.ProjectItemId);

        if (isItemAttachment) {
            return res.json({
                success: true,
                message: 'ItemAttachment non richiede keepalive',
                isItemAttachment: true
            });
        }

        let pool = await sql.connect(config.database);

        // Verifica che il lock appartenga a questo utente
        const lockCheck = await pool.request()
            .input('AttachmentID', sql.Int, attachmentId)
            .input('UserID', sql.Int, userId)
            .query(`
                SELECT LockID, LockedAt
                FROM MA_AttachmentLocks
                WHERE AttachmentID = @AttachmentID
                  AND LockedBy = @UserID
                  AND ReleasedAt IS NULL
            `);

        if (lockCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lock non trovato o non di tua proprietà',
                code: 'LOCK_NOT_FOUND'
            });
        }

        const lockId = lockCheck.recordset[0].LockID;
        const previousLockedAt = lockCheck.recordset[0].LockedAt;

        // Rinnova il lock aggiornando LockedAt (HEARTBEAT!)
        await pool.request()
            .input('LockID', sql.Int, lockId)
            .query(`
                UPDATE MA_AttachmentLocks
                SET LockedAt = GETDATE()
                WHERE LockID = @LockID
            `);

        const renewedAt = new Date();

        console.log(`Lock keepalive: AttachmentID=${attachmentId}, UserID=${userId}, LockID=${lockId}`);

        res.json({
            success: true,
            message: 'Lock rinnovato con successo',
            lockId: lockId,
            previousLockedAt: previousLockedAt,
            renewedAt: renewedAt
        });

    } catch (error) {
        console.error('Error in keepalive:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel rinnovo del lock',
            error: error.message
        });
    }
});

// Force release di un lock (solo per admin)
router.delete('/attachment-locks/:attachmentId/force', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        const userId = req.user.UserId;

        // Verifica che l'utente sia admin (implementa la tua logica di autorizzazione)
        // if (!req.user.isAdmin) {
        //     return res.status(403).json({ success: 0, message: 'Accesso negato' });
        // }

        // Verifica se è un ItemAttachment
        const attachment = await getAttachmentById(attachmentId);
        const isItemAttachment = attachment && (attachment.ItemCode || attachment.ProjectItemId);

        // Per ItemAttachment, non c'è lock da forzare
        if (isItemAttachment) {
            console.log(`ItemAttachment detected (ID: ${attachmentId}), no lock to force release`);
            return res.json({
                success: 1,
                message: 'Lock forzato rilasciato',
                rowsAffected: 0,
                isItemAttachment: true
            });
        }

        const result = await forceReleaseAttachmentLock(attachmentId);
        res.json(result);

    } catch (error) {
        console.error('Error force releasing attachment lock:', error);
        res.status(500).json({ success: 0, message: 'Errore nel force release del lock' });
    }
});

// Endpoint cleanup manuale RIMOSSO - Ridondante con SP_CleanupOldLocks
// La SP viene chiamata automaticamente ogni ora da server.js (linea 578)
// Timeout: 120 minuti + supporto heartbeat
// Se serve cleanup manuale, usare force release su lock specifici
