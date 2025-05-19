const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const FileService = require('../services/fileService');
const { getNotifications
        , getUserNotifications
        , getNotificationById
        , getNotificationResponseOptions
        , markNotificationAsReceived
        , markNotificationAsRead
        , togglePinned
        , toggleFavorite
        , closeChat
        , reopenChat
        , leaveChat
        , sendNotification
        , createDBNotificationsView 
        , setMessageColor
        , clearMessageColor
        , filterMessages
        , addConversationHighlight
        , removeConversationHighlight
        , getConversationHighlights
        , generateConversationSummary
        , createPoll
        , votePoll
        , getPoll
        , getNotificationPolls
        , closePoll
        , archiveChat
        , unarchiveChat
        , updateChatTitle
        , editMessage
        , getMessageVersionHistory
        , toggleMuteChat
        , toggleDoNotDisturb
        , getDoNotDisturbStatus
        , getRelatedMessageIds
        , getMessageReactions 
        , addMessageReaction
        , getReactionInfo
        , removeMessageReaction
        , getNotificationIdForMessage
        , deleteMessage 
        , getBatchReactions
        , getBatchPolls
        , removeUserFromChat
      } = require('../queries/notificationsManagement');

const {
        getAttachments,
        addAttachment,
        deleteAttachment,
        getAttachmentById
    } = require('../queries/attachmentQueries');

const authenticateToken = require('../authenticateToken');
const fileService = new FileService();

router.get('/get-notifications', async (req, res) => {
  try {
    const notifications = await getNotifications();
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).send('Server error');
  }
});

router.get('/notifications', authenticateToken, async (req, res) => {
  const userId = req.user.UserId;
  try {
    const notifications = await getUserNotifications(userId);
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching user notifications:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/notifications/:notificationId', authenticateToken, async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user.UserId;

  try {
    const notification = await getNotificationById(userId, notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(notification);
  } catch (err) {
    console.error('Error fetching notification:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/notification-response-options', async (req, res) => {
  try {
    const responseOptions = await getNotificationResponseOptions();
    res.json(responseOptions);
  } catch (err) {
    console.error('Error fetching notification response options:', err);
    res.status(500).send('Server error');
  }
});

router.post('/mark-as-received', authenticateToken, async (req, res) => {
  const { notificationId, messageId } = req.body;
  const userId = req.user.UserId;
  try {
    await markNotificationAsReceived(notificationId, userId, messageId);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error marking message as received:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/mark-as-read', authenticateToken, async (req, res) => {
  const { notificationId, isReadByUser } = req.body;
  const userId = req.user.UserId;
  try {
    await markNotificationAsRead(notificationId, userId, isReadByUser);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/toggle-pin', authenticateToken, async (req, res) => {
  const { notificationId, pinned } = req.body;
  const userId = req.user.UserId;
  try {
    await togglePinned(notificationId, userId, pinned);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error toggling pinned:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/toggle-favorite', authenticateToken, async (req, res) => {
  const { notificationId, favorite } = req.body;
  const userId = req.user.UserId;
  try {
    await toggleFavorite(notificationId, userId, favorite);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error toggling favorite:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/close-chat', authenticateToken, async (req, res) => {
  const { notificationId } = req.body;
  const userId = req.user.UserId;
  try {
    await closeChat(notificationId, userId);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error closing chat:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/reopen-chat', authenticateToken, async (req, res) => {
  const { notificationId } = req.body;
  const userId = req.user.UserId;
  try {
    await reopenChat(notificationId, userId);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error reopening chat:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/send-notification', authenticateToken, async (req, res) => {
  const { notificationId, message, responseOptionId, eventId, title, notificationCategoryId, receiversList, replyToMessageId } = req.body;
  const userId = req.user.UserId;
  try {
    const result = await sendNotification({ notificationId, message, responseOptionId, eventId, title, notificationCategoryId, receiversList, userId, replyToMessageId });
    res.status(200).json(result);
  } catch (err) {
    console.error('Error sending notification:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/DBNotificationsView', authenticateToken, async (req, res) => {
  const userId = req.user.UserId;
  try {
    const result = await createDBNotificationsView(userId);
    res.json(result);
  } catch (err) {
    console.error('Error creating DB notifications view:', err);
    res.status(500).send('Internal server error');
  }
});

// Configurazione multer per le stesse tipologie di file supportate per i progetti
const upload = multer({
  dest: 'temp/uploads/',
  limits: {
      fileSize: 20 * 1024 * 1024 // 20MB
  },
  fileFilter: (req, file, cb) => {
      // Usa lo stesso filtro per i tipi MIME definito in attachmentRoutes.js
      const ALLOWED_MIME_TYPES = [
        // Formati standard esistenti
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

        // Formati Email
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

      if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
          return;
      }

      // Controllo estensioni CAD, tecniche e 3D
      const cadExtensions = [
        // Estensioni base
        '.dxf', '.dwg', '.step', '.stp', '.iges', '.igs', '.stl', '.ipt', 
        '.iam', '.idw', '.sldprt', '.sldasm', '.slddrw',
        
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
        '.prc',        // Product Representation Compact
        '.creo', '.prt.*', // PTC Creo/ProE
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

      // Controllo estensioni email come in attachmentRoutes.js
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

      cb(new Error('File type not allowed'));
  }
});

// Ottieni allegati di una notifica
router.get('/notifications/:notificationId/attachments', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    // Usa getAttachments dalla funzione unificata, passando null per projectId e taskId
    const attachments = await getAttachments(null, null, notificationId);
    res.json(attachments);
  } catch (error) {
    console.error('Error fetching notification attachments:', error);
    res.status(500).json({ success: 0, message: 'Error fetching attachments' });
  }
});

// Carica un nuovo allegato per una notifica
router.post('/notifications/:notificationId/attachments', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    const userId = req.user.UserId;
    const messageId = req.body.messageId ? parseInt(req.body.messageId) : null;

    if (!req.file) {
      return res.status(400).json({ success: 0, message: 'No file uploaded' });
    }

    const fileInfo = await fileService.saveFile(req.file, null, 0, notificationId);
    // Usa addAttachment dalla funzione unificata
    const result = await addAttachment({
      ProjectID: null,
      TaskID: null,
      NotificationID: notificationId,
      MessageID: messageId,
      FileName: fileInfo.originalName,
      FilePath: fileInfo.filePath,
      FileType: fileInfo.fileType,
      FileSizeKB: fileInfo.fileSizeKB,
      UploadedBy: userId
    });

    res.json(result);
  } catch (error) {
    console.error('Error uploading notification attachment:', error);
    res.status(500).json({ success: 0, message: 'Error uploading attachment' });
  }
});

// Carica più allegati per una notifica
router.post('/notifications/:notificationId/attachments/multiple', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    const userId = req.user.UserId;
    const messageId = req.body.messageId ? parseInt(req.body.messageId) : null;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: 0, message: 'No files uploaded' });
    }

    const results = [];
    
    for (const file of req.files) {
      const fileInfo = await fileService.saveFile(file, null, 0, notificationId);
      // Usa addAttachment dalla funzione unificata
      const result = await addAttachment({
        ProjectID: null,
        TaskID: null,
        NotificationID: notificationId,
        MessageID: messageId,
        FileName: fileInfo.originalName,
        FilePath: fileInfo.filePath,
        FileType: fileInfo.fileType,
        FileSizeKB: fileInfo.fileSizeKB,
        UploadedBy: userId
      });
      
      results.push(result.data);
    }

    res.json({ success: 1, data: results });
  } catch (error) {
    console.error('Error uploading notification attachments:', error);
    res.status(500).json({ success: 0, message: 'Error uploading attachments' });
  }
});

// Elimina un allegato
router.delete('/notifications/attachments/:attachmentId', authenticateToken, async (req, res) => {
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

// Download di un allegato
router.get('/notifications/attachments/:attachmentId/download', authenticateToken, async (req, res) => {
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

// Imposta il colore di un messaggio
router.post('/set-message-color', authenticateToken, async (req, res) => {
  const { messageId, color } = req.body;
  const userId = req.user.UserId;
  
  try {
    // Verifica che i parametri necessari siano presenti
    if (!messageId || !color) {
      return res.status(400).json({ success: false, error: 'MessageId e color sono campi obbligatori' });
    }
    
    // Verifica che il formato del colore sia corretto
    if (!color.startsWith('#') || color.length !== 7) {
      return res.status(400).json({ success: false, error: 'Formato colore non valido. Deve essere in formato #RRGGBB' });
    }
    
    const result = await setMessageColor(messageId, userId, color);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error setting message color:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Rimuovi il colore di un messaggio
router.post('/clear-message-color', authenticateToken, async (req, res) => {
  const { messageId } = req.body;
  const userId = req.user.UserId;
  
  try {
    // Verifica che i parametri necessari siano presenti
    if (!messageId) {
      return res.status(400).json({ success: false, error: 'MessageId è obbligatorio' });
    }
    
    const result = await clearMessageColor(messageId, userId);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error clearing message color:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Filtra i messaggi per colore o testo
router.get('/filter-messages', authenticateToken, async (req, res) => {
  const { notificationId, color, searchText } = req.query;
  const userId = req.user.UserId;
  
  try {
    // Verifica che i parametri necessari siano presenti
    if (!notificationId) {
      return res.status(400).json({ success: false, error: 'NotificationId è obbligatorio' });
    }
    
    const results = await filterMessages(notificationId, userId, color, searchText);
    res.json(results);
  } catch (err) {
    console.error('Error filtering messages:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Route per aggiungere un punto importante
router.post('/highlights', authenticateToken, async (req, res) => {
  try {
    const { notificationId, highlightText, isAutoGenerated } = req.body;
    const userId = req.user.UserId;
    
    if (!notificationId || !highlightText) {
      return res.status(400).json({ 
        success: false, 
        message: 'NotificationId e HighlightText sono campi obbligatori' 
      });
    }
    
    const result = await addConversationHighlight(
      notificationId, 
      userId, 
      highlightText, 
      isAutoGenerated || false
    );
    res.json(result);
  } catch (error) {
    console.error('Error adding highlight:', error);
    res.status(500).json({ success: false, message: 'Errore durante l\'aggiunta del punto importante' });
  }
});

// Route per eliminare un punto importante
router.delete('/highlights/:highlightId', authenticateToken, async (req, res) => {
  try {
    const highlightId = parseInt(req.params.highlightId);
    const userId = req.user.UserId;
    
    if (!highlightId) {
      return res.status(400).json({ 
        success: false, 
        message: 'HighlightId è obbligatorio' 
      });
    }
    
    const result = await removeConversationHighlight(highlightId, userId);
    res.json(result);
  } catch (error) {
    console.error('Error removing highlight:', error);
    res.status(500).json({ success: false, message: 'Errore durante la rimozione del punto importante' });
  }
});

// Route per ottenere i punti importanti di una conversazione
router.get('/highlights/:notificationId', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    const userId = req.user.UserId;
    
    if (!notificationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'NotificationId è obbligatorio' 
      });
    }
    
    const highlights = await getConversationHighlights(notificationId, userId);
    res.json(highlights);
  } catch (error) {
    console.error('Error fetching highlights:', error);
    res.status(500).json({ success: false, message: 'Errore durante il recupero dei punti importanti' });
  }
});

// Route per generare automaticamente i punti importanti di una conversazione
router.post('/highlights/generate/:notificationId', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    const userId = req.user.UserId;
    
    if (!notificationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'NotificationId è obbligatorio' 
      });
    }
    
    const highlights = await generateConversationSummary(notificationId, userId);
    res.json(highlights);
  } catch (error) {
    console.error('Error generating conversation summary:', error);
    res.status(500).json({ success: false, message: 'Errore durante la generazione del riepilogo della conversazione' });
  }
});

// Poi aggiungi questa route API nel file notificationsRoutes.js
router.post('/leave-chat', authenticateToken, async (req, res) => {
  const { notificationId } = req.body;
  const userId = req.user.UserId;
  try {
    const result = await leaveChat(notificationId, userId);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error leaving chat:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Crea un nuovo sondaggio
router.post('/polls', authenticateToken, async (req, res) => {
  try {
    const { notificationId, question, options, allowMultipleAnswers, expirationDate } = req.body;
    const userId = req.user.UserId;
    
    // Verifica parametri base
    if (!notificationId || !question || !options || !Array.isArray(options)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parametri mancanti o non validi' 
      });
    }
    
    // 1. Crea un messaggio per il sondaggio
    const pollMessage = `📊 **Sondaggio creato**: "${question}"`;
    
   
    // Chiamata a sendNotification
    const messageResult = await sendNotification({ 
      notificationId, 
      message: pollMessage,
      responseOptionId: 3,
      eventId: 0,
      userId
    });
    
   
    
    if (!messageResult) {
      throw new Error('Risposta vuota da sendNotification');
    }
    
    // Estrai il messageId dal risultato
    let createdMessageId;
    
    // Se messages è una stringa JSON, parsala
    if (typeof messageResult.messages === 'string') {
      try {
        const messages = JSON.parse(messageResult.messages);
        
        if (Array.isArray(messages) && messages.length > 0) {
          // Cerca il messaggio con il testo del sondaggio
          const pollMsg = messages.find(m => m.message && m.message.includes('**Sondaggio creato**'));
          
          if (pollMsg && pollMsg.messageId) {
            createdMessageId = pollMsg.messageId;
        
          } else {
            // Usa l'ID dell'ultimo messaggio
            createdMessageId = messages[messages.length - 1].messageId;
           
          }
        }
      } catch (e) {
        console.error('Errore nel parsing dei messaggi:', e);
      }
    } 
    // Se messages è già un array
    else if (Array.isArray(messageResult.messages) && messageResult.messages.length > 0) {
      const pollMsg = messageResult.messages.find(m => m.message && m.message.includes('**Sondaggio creato**'));
      
      if (pollMsg && pollMsg.messageId) {
        createdMessageId = pollMsg.messageId;
      } else {
        createdMessageId = messageResult.messages[messageResult.messages.length - 1].messageId;
      }

    }
    
    // Se ancora non abbiamo un ID, facciamo un'ultima ricerca
    if (!createdMessageId) {
      // Cerca l'ID più recente dalla notifica
     
      // In una situazione reale, potremmo eseguire una query al database
      // Ma per ora, generiamo un errore più descrittivo
      throw new Error('Impossibile trovare il messageId nella risposta. Controlla la struttura della risposta di sendNotification');
    }
    
    // 2. Crea il sondaggio collegato al messaggio
    const formattedOptions = options.map((option, index) => ({
      text: option,
      order: index + 1
    }));
    
  
    
    const poll = await createPoll(
      notificationId, 
      createdMessageId, 
      question, 
      formattedOptions, 
      allowMultipleAnswers || false, 
      userId, 
      expirationDate
    );
 
    res.json({ success: true, poll, messageId: createdMessageId });
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore durante la creazione del sondaggio: ' + error.message
    });
  }
});

// Vota in un sondaggio
router.post('/polls/:pollId/vote', authenticateToken, async (req, res) => {
  try {
    const { optionId } = req.body;
    const userId = req.user.UserId;
    
    if (!optionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'OptionId è obbligatorio' 
      });
    }
    
    const results = await votePoll(optionId, userId);
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error voting in poll:', error);
    res.status(500).json({ success: false, message: 'Errore durante il voto' });
  }
});

// Ottieni un sondaggio specifico
router.get('/polls/:pollId', authenticateToken, async (req, res) => {
  try {
    const pollId = parseInt(req.params.pollId);
    const userId = req.user.UserId;
    
    const poll = await getPoll(pollId, userId);
    
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Sondaggio non trovato' });
    }
    
    res.json({ success: true, poll });
  } catch (error) {
    console.error('Error getting poll:', error);
    res.status(500).json({ success: false, message: 'Errore durante il recupero del sondaggio' });
  }
});

// Ottieni tutti i sondaggi di una notifica
router.get('/notifications/:notificationId/polls', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    const userId = req.user.UserId;
    
    const polls = await getNotificationPolls(notificationId, userId);
    res.json({ success: true, polls });
  } catch (error) {
    console.error('Error getting notification polls:', error);
    res.status(500).json({ success: false, message: 'Errore durante il recupero dei sondaggi' });
  }
});

// Chiudi un sondaggio
router.post('/polls/:pollId/close', authenticateToken, async (req, res) => {
  try {
    const pollId = parseInt(req.params.pollId);
    const userId = req.user.UserId;
    
    const poll = await closePoll(pollId, userId);
    res.json({ success: true, poll });
  } catch (error) {
    console.error('Error closing poll:', error);
    // Come messaggio ritorna il messaggio presente in poll.message se presente altrimenti ritorna un messaggio generico

    res.status(500).json({ success: false, message: error.message || 'Errore durante la chiusura del sondaggio' });
  }
});

// Route per archiviare una chat
router.post('/archive-chat', authenticateToken, async (req, res) => {
  const { notificationId } = req.body;
  const userId = req.user.UserId;
  try {
    const result = await archiveChat(notificationId, userId);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error archiving chat:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Aggiungiamo la rotta per rimuovere una chat dall'archivio
router.post('/unarchive-chat', authenticateToken, async (req, res) => {
  const { notificationId } = req.body;
  const userId = req.user.UserId;
  try {
    const result = await unarchiveChat(notificationId, userId);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error unarchiving chat:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Route per aggiornare il titolo di una chat
router.post('/update-chat-title', authenticateToken, async (req, res) => {
  const { notificationId, title } = req.body;
  const userId = req.user.UserId;
  
  if (!notificationId || !title) {
    return res.status(400).json({ 
      success: false, 
      message: 'NotificationId e titolo sono campi obbligatori' 
    });
  }
  
  try {
    const result = await updateChatTitle(notificationId, userId, title);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error updating chat title:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Route per modificare un messaggio
router.post('/messages/:messageId/edit', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { newMessage } = req.body;
    const userId = req.user.UserId;
    
    // Validazione input
    if (!newMessage || !newMessage.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Il messaggio non può essere vuoto' 
      });
    }
    
    // Chiama la funzione per modificare il messaggio
    const result = await editMessage(messageId, userId, newMessage);
    
    res.json(result);
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore durante la modifica del messaggio' 
    });
  }
});

// Route per ottenere la cronologia delle versioni di un messaggio
router.get('/messages/:messageId/versions', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.UserId;
    
    // Chiama la funzione per ottenere la cronologia
    const result = await getMessageVersionHistory(messageId, userId);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching message versions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore durante il recupero della cronologia del messaggio' 
    });
  }
});

// Route per silenziare/riattivare le notifiche di una chat
router.post('/toggle-mute-chat', authenticateToken, async (req, res) => {
  const { notificationId, isMuted, duration } = req.body;
  const userId = req.user.UserId;
  
  try {
    // Calcola la data di scadenza in base alla durata selezionata
    let expiryDate = null;
    if (isMuted && duration) {
      const now = new Date();
      switch (duration) {
        case '8h':
          expiryDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
          break;
        case '1d':
          expiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case '7d':
          expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'forever':
          expiryDate = null; // Silenziato per sempre
          break;
      }
    }
    
    const result = await toggleMuteChat(notificationId, userId, isMuted, expiryDate);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error toggling mute status:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Route per attivare/disattivare la modalità "Non disturbare"
router.post('/do-not-disturb/toggle', authenticateToken, async (req, res) => {
  const { enabled } = req.body;
  const userId = req.user.UserId;
  
  try {
    const result = await toggleDoNotDisturb(userId, enabled);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error toggling Do Not Disturb:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Route per ottenere lo stato della modalità "Non disturbare"
router.get('/do-not-disturb/status', authenticateToken, async (req, res) => {
  const userId = req.user.UserId;
  
  try {
    const status = await getDoNotDisturbStatus(userId);
    res.status(200).json({ success: true, ...status });
  } catch (err) {
    console.error('Error getting Do Not Disturb status:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 1. Route per ottenere tutte le reazioni di un messaggio
router.get('/messages/:messageId/reactions', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    if (!messageId || isNaN(parseInt(messageId))) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID messaggio non valido' 
      });
    }
    
    // Chiama la funzione dal file delle query
    const reactions = await getMessageReactions(parseInt(messageId));
    
    res.json({ 
      success: true, 
      reactions,
      message: `Trovate ${reactions.length} reazioni` 
    });
  } catch (error) {
    console.error('Errore nel recupero delle reazioni:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nel recupero delle reazioni',
      error: error.message 
    });
  }
});

// 2. Route per aggiungere/rimuovere una reazione a un messaggio
router.post('/messages/:messageId/reactions', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reactionType } = req.body;
    const userId = req.user.UserId;
    
    // Validazione parametri
    if (!messageId || isNaN(parseInt(messageId))) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID messaggio non valido' 
      });
    }
    
    if (!reactionType || typeof reactionType !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo reazione è obbligatorio e deve essere una stringa' 
      });
    }
    
    // Chiama la funzione dal file delle query
    const result = await addMessageReaction(parseInt(messageId), userId, reactionType);
    
    // Recupera l'ID della notifica per includerlo nella risposta
    const notification = await getNotificationIdForMessage(parseInt(messageId));
    const notificationId = notification ? notification.notificationId : null;
    
    res.json({
      ...result,
      notificationId
    });
  } catch (error) {
    console.error('Errore nella gestione della reazione:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nell\'elaborazione della reazione',
      error: error.message 
    });
  }
});

// 3. Route per ottenere l'ID notifica di un messaggio
router.get('/messages/:messageId/notification', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    if (!messageId || isNaN(parseInt(messageId))) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID messaggio non valido' 
      });
    }
    
    const result = await getNotificationIdForMessage(parseInt(messageId));
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Nessuna notifica trovata per questo messaggio'
      });
    }
    
    res.json({
      success: true,
      notificationId: result.notificationId
    });
  } catch (error) {
    console.error('Errore nel recupero dell\'ID notifica:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dell\'ID notifica',
      error: error.message
    });
  }
});

// 4. Route per ottenere informazioni su una specifica reazione
router.get('/reactions/:reactionId/info', authenticateToken, async (req, res) => {
  try {
    const { reactionId } = req.params;
    
    if (!reactionId || isNaN(parseInt(reactionId))) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID reazione non valido' 
      });
    }
    
    // Chiama la funzione dal file delle query
    const reactionInfo = await getReactionInfo(parseInt(reactionId));
    
    if (!reactionInfo) {
      return res.status(404).json({
        success: false,
        message: 'Reazione non trovata'
      });
    }
    
    res.json({
      success: true,
      ...reactionInfo
    });
  } catch (error) {
    console.error('Errore nel recupero delle informazioni sulla reazione:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle informazioni sulla reazione',
      error: error.message
    });
  }
});

// 5. Route per eliminare una specifica reazione tramite il suo ID
router.delete('/reactions/:reactionId', authenticateToken, async (req, res) => {
  try {
    const { reactionId } = req.params;
    const userId = req.user.UserId;
    
    if (!reactionId || isNaN(parseInt(reactionId))) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID reazione non valido' 
      });
    }
    
    // Chiama la funzione dal file delle query
    const result = await removeMessageReaction(parseInt(reactionId), userId);
    
    if (!result.success) {
      return res.status(403).json({
        success: false,
        message: result.message || 'Non hai il permesso di rimuovere questa reazione'
      });
    }
    
    res.json({
      success: true,
      message: 'Reazione rimossa con successo',
      messageId: result.messageId,
      notificationId: result.notificationId
    });
  } catch (error) {
    console.error('Errore nella rimozione della reazione:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella rimozione della reazione',
      error: error.message
    });
  }
});

// Route per eliminare un messaggio
router.delete('/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.UserId;
    
    if (!messageId || isNaN(parseInt(messageId))) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID messaggio non valido' 
      });
    }
    
    // Chiama la funzione dal file delle query
    const result = await deleteMessage(parseInt(messageId), userId);
    
    if (!result.success) {
      return res.status(403).json({
        success: false,
        message: result.message || 'Non hai il permesso di eliminare questo messaggio'
      });
    }
    
    res.json({
      success: true,
      message: 'Messaggio eliminato con successo',
      notificationId: result.notificationId,
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Errore nell\'eliminazione del messaggio:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione del messaggio',
      error: error.message
    });
  }
});

// Route per ottenere le reazioni di più messaggi in un'unica chiamata
router.post('/messages/batch-reactions', authenticateToken, async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user.UserId;
    // Verifica che messageIds sia un array valido
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Parametro messageIds non valido o vuoto'
      });
    }
    
    // Chiama la funzione dal file delle query
    const result = await getBatchReactions(messageIds, userId);
    
    // Restituisci la mappa delle reazioni
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting batch reactions:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle reazioni in batch',
      error: error.message
    });
  }
});

// Route per ottenere i sondaggi per più messaggi in un'unica chiamata
router.post('/notifications/:notificationId/batch-polls', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    const { messageIds } = req.body;
    const userId = req.user.UserId;
    
    // Verifica che messageIds sia un array valido
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Parametro messageIds non valido o vuoto'
      });
    }
    
    // Chiama la funzione dal file delle query
    const result = await getBatchPolls(notificationId, messageIds, userId);
    
    // Restituisci la mappa dei sondaggi
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting batch polls:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei sondaggi in batch',
      error: error.message
    });
  }
});

// Endpoint per recuperare tutti i messaggi di una notifica specifica
router.get('/notifications/:notificationId/messages', authenticateToken, async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user.UserId;
  
  try {
    // Prima verifica se la notifica esiste e appartiene all'utente
    const notification = await getNotificationById(userId, notificationId);
    
    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notifica non trovata o non hai accesso' 
      });
    }
    
    // Estrai i messaggi dalla notifica
    let messages = [];
    
    if (notification.messages) {
      if (typeof notification.messages === 'string') {
        try {
          messages = JSON.parse(notification.messages);
        } catch (e) {
          console.error('Error parsing messages JSON:', e);
          messages = [];
        }
      } else if (Array.isArray(notification.messages)) {
        messages = notification.messages;
      }
    }
    
    // Se la notifica non è stata letta, segnala come letta
    if (!notification.isReadByUser) {
      try {
        await markNotificationAsRead(notificationId, userId, true);
      } catch (e) {
        console.error('Error marking notification as read:', e);
      }
    }
    
    return res.json({
      success: true,
      messages: messages,
      notificationId: notificationId
    });
    
  } catch (error) {
    console.error('Error fetching notification messages:', error);
    res.status(500).json({ 
      success: false,
      message: 'Errore durante il recupero dei messaggi della notifica',
      error: error.message
    });
  }
});

// Route per rimuovere un utente da una chat
router.post('/remove-user-from-chat', authenticateToken, async (req, res) => {
  const { notificationId, userToRemoveId } = req.body;
  const adminUserId = req.user.UserId;
  
  try {
    // Verifica i parametri
    if (!notificationId || !userToRemoveId) {
      return res.status(400).json({
        success: false,
        message: 'ID notifica e ID utente da rimuovere sono campi obbligatori'
      });
    }
    
    const result = await removeUserFromChat(notificationId, adminUserId, userToRemoveId);
    
    if (!result.Success) {
      return res.status(400).json({
        success: false,
        message: result.Message || 'Errore durante la rimozione dell\'utente'
      });
    }
    
    res.status(200).json({
      success: true,
      message: result.Message,
      removedUserName: result.RemovedUserName
    });
  } catch (err) {
    console.error('Error removing user from chat:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;