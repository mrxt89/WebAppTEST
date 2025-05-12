// documentLinkRoutes.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../authenticateToken');
const { 
  getLinkedDocuments, 
  linkDocumentToNotification,
  unlinkDocumentFromNotification,
  searchDocuments,
  searchChatsByDocument, 
  addReadOnlyAccessToChat,
  convertToActiveParticipant
} = require('../queries/documentLinks');

// Ottiene tutti i documenti collegati a una notifica
router.get('/notifications/:notificationId/documents', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    const companyId = req.user.CompanyId; // Prendi l'azienda dall'utente autenticato
    
    if (!notificationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID notifica mancante o non valido' 
      });
    }
    
    const result = await getLinkedDocuments(notificationId, companyId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Errore nella gestione della richiesta:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore durante il recupero dei documenti collegati',
      error: error.message
    });
  }
});

// funzione per collegare un documento a una notifica
router.post('/notifications/:notificationId/documents', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    const companyId = req.user.CompanyId;
    
    // Verifica il formato della richiesta - supporta entrambi i formati possibili
    let documentType, bom, projectId, taskId, moId, saleOrdId, serialNo,
        purchaseOrdId, saleDocId, purchaseDocId, itemCode, custSuppType, custSuppCode;
    
    if (req.body.documentType && typeof req.body.documentType === 'object' && req.body.documentType.documentType) {
      // Formato 1: il frontend invia tutto dentro documentType: { documentType: 'X', moId: 10, ... }
      ({ documentType, bom, projectId, taskId, moId, saleOrdId, serialNo,
         purchaseOrdId, saleDocId, purchaseDocId, itemCode, custSuppType, custSuppCode } = req.body.documentType);
    } else {
      // Formato 2: i parametri sono al primo livello nella richiesta { documentType: 'X', moId: 10, ... }
      ({ documentType, bom, projectId, taskId, moId, saleOrdId, serialNo,
         purchaseOrdId, saleDocId, purchaseDocId, itemCode, custSuppType, custSuppCode } = req.body);
    }
    
    // Validazione input
    if (!notificationId || !documentType) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID notifica e tipo documento sono campi obbligatori' 
      });
    }
    
    console.log('Parametri elaborati:', {
      documentType, bom, projectId, taskId, moId, saleOrdId, serialNo,
      purchaseOrdId, saleDocId, purchaseDocId, itemCode, custSuppType, custSuppCode
    });

    // Verifica che almeno un identificatore di documento sia specificato
    const hasDocumentId = bom || moId || saleOrdId || purchaseOrdId || 
                      saleDocId || purchaseDocId || itemCode || 
                      (custSuppCode && custSuppType);
                          
    if (!hasDocumentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Specificare almeno un identificatore di documento valido' 
      });
    }
    
    const result = await linkDocumentToNotification({
      notificationId, companyId, documentType, 
      bom, projectId, taskId, moId, saleOrdId, serialNo,
      purchaseOrdId, saleDocId, purchaseDocId, 
      itemCode, custSuppType, custSuppCode
    });
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Errore nella gestione della richiesta:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore durante il collegamento del documento',
      error: error.message
    });
  }
});

// Scollega un documento da una notifica
router.delete('/notifications/:notificationId/documents/:linkId', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    const linkId = parseInt(req.params.linkId);
    const companyId = req.user.CompanyId;
    
    if (!notificationId || !linkId) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID notifica e ID collegamento sono campi obbligatori' 
      });
    }
    
    const result = await unlinkDocumentFromNotification({
      notificationId,
      companyId,
      documentType: null, // Non necessario con linkId
      linkId
    });
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Errore nella gestione della richiesta:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore durante lo scollegamento del documento',
      error: error.message
    });
  }
});

// Ricerca documenti per tipo
router.get('/documents/search', authenticateToken, async (req, res) => {
  try {
    const { documentType, searchTerm } = req.query;
    const companyId = req.user.CompanyId;
    
    if (!documentType || !searchTerm) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo documento e termine di ricerca sono campi obbligatori' 
      });
    }
    
    const result = await searchDocuments(companyId, documentType, searchTerm);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Errore nella gestione della richiesta:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore durante la ricerca dei documenti',
      error: error.message
    });
  }
});

// Cerca chat collegate a documenti specifici
router.get('/chats/by-document', authenticateToken, async (req, res) => {
  try {
    const { searchType, searchValue } = req.query;
    const companyId = req.user.CompanyId;
    const userId = req.user.UserId;
    
    if (!searchType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo di ricerca mancante' 
      });
    }
    
    const result = await searchChatsByDocument(companyId, searchType, searchValue, userId);
    
    if (result.success) {
      res.json({ 
        success: true, 
        data: result.data 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Errore nella ricerca delle chat',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Errore nella gestione della richiesta:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nella ricerca delle chat',
      error: error.message
    });
  }
});

// Aggiungi un utente in sola lettura a una chat
router.post('/chats/:notificationId/read-only-access', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    const userId = req.user.UserId;
    
    if (!notificationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID notifica mancante o non valido' 
      });
    }
    
    const result = await addReadOnlyAccessToChat(notificationId, userId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Errore nell\'aggiungere accesso in sola lettura',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Errore nella gestione della richiesta:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nell\'aggiungere accesso in sola lettura',
      error: error.message
    });
  }
});

// Converti un utente da lettore in sola lettura a partecipante attivo
router.post('/chats/:notificationId/become-participant', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    const userId = req.user.UserId;
    
    if (!notificationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID notifica mancante o non valido' 
      });
    }
    
    const result = await convertToActiveParticipant(notificationId, userId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Errore nella conversione a partecipante attivo',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Errore nella gestione della richiesta:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nella conversione a partecipante attivo',
      error: error.message
    });
  }
});

module.exports = router;