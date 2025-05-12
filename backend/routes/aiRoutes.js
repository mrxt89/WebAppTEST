const express = require('express');
const router = express.Router();
const authenticateToken = require('../authenticateToken');
const aiService = require('../services/aiService');

/**
 * @route POST /api/ai/summarize
 * @desc Genera un riepilogo automatico della conversazione
 * @access Private
 */
router.post('/summarize', authenticateToken, async (req, res) => {
  try {
    const { conversationText, notificationId, userId } = req.body;
    
    if (!conversationText || !notificationId || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'I parametri conversationText, notificationId e userId sono obbligatori' 
      });
    }

    // Chiama il servizio AI per generare il riepilogo
    const summaryPoints = await aiService.summarizeConversation(
      conversationText, 
      notificationId, 
      userId
    );
    
    res.json({ 
      success: true, 
      highlights: summaryPoints 
    });
  } catch (error) {
    console.error('Error in /api/ai/summarize:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Errore nella generazione del riepilogo' 
    });
  }
});

/**
 * @route GET /api/ai/messages/:notificationId
 * @desc Ottiene i messaggi di una notifica per l'analisi
 * @access Private
 */
router.get('/messages/:notificationId', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    const userId = req.user.UserId;
    
    if (!notificationId) {
      return res.status(400).json({ 
        success: false, 
        error: 'NotificationId è obbligatorio' 
      });
    }
    
    // Richiedi al database i messaggi della notifica
    const sql = require('mssql');
    const config = require('../config');
    let pool = await sql.connect(config.database);
    
    const result = await pool.request()
      .input('NotificationID', sql.Int, notificationId)
      .query(`
        SELECT DISTINCT
         nd.Message,
          u.FirstName + ' ' + u.LastName AS SenderName,
          nd.tbCreated,
          CASE WHEN nd.SenderId = @UserID THEN 1 ELSE 0 END AS IsFromCurrentUser
        FROM 
          AR_NotificationDetails nd
        JOIN
          AR_Users u ON nd.SenderId = u.UserID
        WHERE
          nd.NotificationID = @NotificationID
          AND nd.cancelled = 0
          AND nd.Message IS NOT NULL
          AND nd.Message <> ''
        ORDER BY
          nd.tbCreated ASC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching messages for AI analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Errore nel recupero dei messaggi per l\'analisi' 
    });
  }
});

/**
 * @route POST /api/ai/sentiment
 * @desc Analizza il sentiment di un testo
 * @access Private
 */
router.post('/sentiment', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        success: false, 
        error: 'Il parametro text è obbligatorio' 
      });
    }

    // Chiama il servizio AI per analizzare il sentiment
    const sentiment = await aiService.analyzeSentiment(text);
    
    res.json({ 
      success: true, 
      sentiment 
    });
  } catch (error) {
    console.error('Error in /api/ai/sentiment:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Errore nell\'analisi del sentiment' 
    });
  }
});

/**
 * @route POST /api/ai/suggest-reply
 * @desc Suggerisce una risposta in base al contesto della conversazione
 * @access Private
 */
router.post('/suggest-reply', authenticateToken, async (req, res) => {
  try {
    const { notificationId, lastMessage } = req.body;
    
    if (!notificationId || !lastMessage) {
      return res.status(400).json({ 
        success: false, 
        error: 'I parametri notificationId e lastMessage sono obbligatori' 
      });
    }

    // Chiama il servizio AI per suggerire una risposta
    const suggestedReply = await aiService.suggestReply(notificationId, lastMessage);
    
    res.json({ 
      success: true, 
      suggestedReply 
    });
  } catch (error) {
    console.error('Error in /api/ai/suggest-reply:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Errore nella generazione della risposta suggerita' 
    });
  }
});

/**
 * @route GET /api/ai/status
 * @desc Verifica lo stato delle configurazioni AI
 * @access Private
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const config = require('../config');
    
    // Verifica se le chiavi API sono configurate
    const claudeConfigured = !!config.ai.claude.apiKey;
    const openaiConfigured = !!config.ai.openai.apiKey;
    
    // Se l'utente è admin, mostra più dettagli sulla configurazione
    const isAdmin = req.user.role === 'admin';
    
    const response = {
      success: true,
      status: {
        claude: {
          configured: claudeConfigured,
          model: config.ai.claude.model
        },
        openai: {
          configured: openaiConfigured,
          model: config.ai.openai.model
        },
        fallbackStrategy: config.ai.fallbackStrategy
      }
    };
    
    // Se l'utente è admin, aggiungi informazioni sensibili
    if (isAdmin) {
      response.config = {
        claude: {
          apiKey: claudeConfigured ? '****' + config.ai.claude.apiKey.slice(-4) : null,
          apiVersion: config.ai.claude.apiVersion
        },
        openai: {
          apiKey: openaiConfigured ? '****' + config.ai.openai.apiKey.slice(-4) : null
        },
        summaryOptions: config.summaryOptions
      };
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error checking AI status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nel controllo dello stato dell\'AI' 
    });
  }
});

/**
 * @route POST /api/ai/generate-highlights/:notificationId
 * @desc Genera automaticamente punti importanti per una notifica
 * @access Private
 */
router.post('/generate-highlights/:notificationId', authenticateToken, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.notificationId);
      const userId = req.user.UserId;
      
      if (!notificationId) {
        return res.status(400).json({
          success: false,
          error: 'NotificationId è obbligatorio'
        });
      }
      
      // 1. Recupera i messaggi della notifica
      const sql = require('mssql');
      const config = require('../config');
      let pool = await sql.connect(config.database);
      
      const messagesResult = await pool.request()
        .input('NotificationID', sql.Int, notificationId)
        .input('UserID', sql.Int, userId)
        .query(`
          SELECT DISTINCT
            nd.Message,
            u.FirstName + ' ' + u.LastName AS SenderName,
            nd.tbCreated
          FROM 
            AR_NotificationDetails nd
          JOIN
            AR_Users u ON nd.SenderId = u.UserID
          WHERE
            nd.NotificationID = @NotificationID
            AND nd.cancelled = 0
            AND nd.Message IS NOT NULL
            AND nd.Message <> ''
          ORDER BY
            nd.tbCreated ASC
        `);
      
      if (!messagesResult.recordset || messagesResult.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Nessun messaggio trovato per questa notifica'
        });
      }
      
      // 2. Formatta i messaggi per l'analisi
      const conversationText = messagesResult.recordset
        .map(msg => `${msg.SenderName}: ${msg.Message}`)
        .join('\n');

        
      
      // 3. Chiama il servizio AI per generare i punti importanti
      // E ottieni direttamente i punti generati
      const generatedHighlights = await aiService.summarizeConversation(
        conversationText,
        notificationId,
        userId
      );
      
      // 4. OPZIONALE: Recupera tutti i punti salvati (inclusi quelli generati automaticamente e quelli manuali)
      // Se vuoi mostrare tutti i punti, non solo quelli appena generati
      const highlightsResult = await pool.request()
        .input('NotificationID', sql.Int, notificationId)
        .input('UserID', sql.Int, userId)
        .query(`
          SELECT 
            HighlightID,
            HighlightText,
            IsAutoGenerated,
            HighlightCreated
          FROM 
            AR_ConversationHighlights
          WHERE 
            NotificationID = @NotificationID
            AND UserID = @UserID
          ORDER BY 
            HighlightCreated DESC
        `);
      
      // 5. Restituisci sia i risultati generati che i risultati salvati
      res.json({
        success: true,
        generatedHighlights: generatedHighlights, // I punti appena generati dall'AI
        savedHighlights: highlightsResult.recordset // Tutti i punti salvati nel database
      });
    } catch (error) {
      console.error('Error generating highlights:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Errore nella generazione dei punti importanti'
      });
    }
  });

module.exports = router;