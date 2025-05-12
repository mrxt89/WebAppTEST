// documentLinks.js
const sql = require('mssql');
const config = require('../config');

// Ottiene i documenti collegati a una notifica
async function getLinkedDocuments(notificationId, companyId) {
  try {
    const pool = await sql.connect(config.database);
    const result = await pool.request()
      .input('NotificationId', sql.Int, notificationId)
      .input('CompanyId', sql.Int, companyId)
      .execute('GetNotificationLinkedDocuments');
    
    return { success: true, data: result.recordset };
  } catch (error) {
    console.error('Errore nel recupero dei documenti collegati:', error);
    return { success: false, error: error.message };
  }
}

// Collega un documento a una notifica
async function linkDocumentToNotification(params) {
  try {
    const { 
      notificationId, companyId, documentType, 
      bom, projectId, taskId, moId, saleOrdId, serialNo,
      purchaseOrdId, saleDocId, purchaseDocId, 
      itemCode, custSuppType, custSuppCode 
    } = params;
    
    const pool = await sql.connect(config.database);
    const result = await pool.request()
      .input('NotificationId', sql.Int, notificationId)
      .input('CompanyId', sql.Int, companyId)
      .input('DocumentType', sql.VarChar(50), documentType)
      .input('BOM', sql.VarChar(50), bom || null)
      .input('ProjectID', sql.Int, projectId || 0)
      .input('TaskID', sql.Int, taskId || 0)
      .input('MOId', sql.Int, moId || 0)
      .input('SaleOrdId', sql.Int, saleOrdId || 0)
      .input('SerialNo', sql.VarChar(50), serialNo || null)
      .input('PurchaseOrdId', sql.Int, purchaseOrdId || 0)
      .input('SaleDocId', sql.Int, saleDocId || 0)
      .input('PurchaseDocId', sql.Int, purchaseDocId || 0)
      .input('ItemCode', sql.VarChar(21), itemCode || null)
      .input('CustSuppType', sql.Int, custSuppType || 0)
      .input('CustSuppCode', sql.VarChar(12), custSuppCode || null)
      .execute('LinkDocumentToNotification');
    
    return { 
      success: true, 
      message: 'Documento collegato con successo',
      linkId: result.recordset[0].LinkId 
    };
  } catch (error) {
    console.error('Errore nel collegamento del documento:', error);
    return { success: false, error: error.message };
  }
}

// Scollega un documento da una notifica
async function unlinkDocumentFromNotification(params) {
  try {
    const { 
      notificationId, companyId, documentType, linkId,
      bom, moId, saleOrdId, purchaseOrdId, 
      saleDocId, purchaseDocId, itemCode, 
      custSuppType, custSuppCode 
    } = params;
    
    const pool = await sql.connect(config.database);
    const result = await pool.request()
      .input('NotificationId', sql.Int, notificationId)
      .input('CompanyId', sql.Int, companyId)
      .input('DocumentType', sql.VarChar(50), documentType)
      .input('LinkId', sql.Int, linkId || null)
      .input('BOM', sql.VarChar(50), bom || null)
      .input('MOId', sql.Int, moId || 0)
      .input('SaleOrdId', sql.Int, saleOrdId || 0)
      .input('PurchaseOrdId', sql.Int, purchaseOrdId || 0)
      .input('SaleDocId', sql.Int, saleDocId || 0)
      .input('PurchaseDocId', sql.Int, purchaseDocId || 0)
      .input('ItemCode', sql.VarChar(21), itemCode || null)
      .input('CustSuppType', sql.Int, custSuppType || 0)
      .input('CustSuppCode', sql.VarChar(12), custSuppCode || null)
      .execute('UnlinkDocumentFromNotification');
    
    // Verifica il risultato corretto
    if (result.recordset && result.recordset[0] && result.recordset[0].Success) {
      return { 
        success: true, 
        message: result.recordset[0].Message,
        documentsUnlinked: result.recordset[0].DocumentsUnlinked || 1
      };
    } else {
      return { 
        success: false, 
        message: 'Nessun documento scollegato. Verifica che i parametri siano corretti.'
      };
    }
  } catch (error) {
    console.error('Errore nello scollegamento del documento:', error);
    return { success: false, error: error.message };
  }
}


// Cerca documenti per tipo
async function searchDocuments(companyId, documentType, searchTerm) {
  try {
    const pool = await sql.connect(config.database);
    const result = await pool.request()
      .input('CompanyId', sql.Int, companyId)
      .input('DocumentType', sql.VarChar(50), documentType)
      .input('SearchTerm', sql.VarChar(100), searchTerm)
      .execute('SearchDocuments');
    
    return { success: true, data: result.recordset };
  } catch (error) {
    console.error('Errore nella ricerca dei documenti:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cerca chat collegate a documenti specifici
 * @param {number} companyId - ID dell'azienda
 * @param {string} searchType - Tipo di ricerca ('Customer', 'SaleOrd', ecc.)
 * @param {string} searchValue - Valore di ricerca (opzionale)
 * @param {number} userId - ID dell'utente che effettua la ricerca
 * @returns {Promise<Object>} - Risultato dell'operazione
 */
async function searchChatsByDocument(companyId, searchType, searchValue, userId) {
  try {
    const pool = await sql.connect(config.database);
    const result = await pool.request()
      .input('CompanyId', sql.Int, companyId)
      .input('SearchType', sql.VarChar(50), searchType)
      .input('SearchValue', sql.VarChar(100), searchValue || '')
      .input('UserId', sql.Int, userId)
      .execute('SearchChatsByDocumentInfo');
    
    return { success: true, data: result.recordset };
  } catch (error) {
    console.error('Errore nella ricerca delle chat per documenti:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Aggiunge un utente come osservatore in sola lettura a una chat
 * L'osservatore può vedere i messaggi ma non è considerato un membro finché non interagisce
 * @param {number} notificationId - ID della notifica/chat
 * @param {number} userId - ID dell'utente
 * @returns {Promise<Object>} - Risultato dell'operazione
 */
async function addReadOnlyAccessToChat(notificationId, userId) {
  try {
    const pool = await sql.connect(config.database);
    
    // Prima verifica se l'utente ha già accesso
    const accessCheck = await pool.request()
      .input('NotificationId', sql.Int, notificationId)
      .input('UserId', sql.Int, userId)
      .query(`
        SELECT COUNT(*) as hasAccess 
        FROM AR_NotificationDetails 
        WHERE notificationId = @NotificationId AND receiverId = @UserId
      `);
    
    const hasAccess = accessCheck.recordset[0].hasAccess > 0;
    
    if (hasAccess) {
      return { 
        success: true, 
        message: 'Utente già ha accesso alla chat',
        alreadyHasAccess: true
      };
    }
    
    // Ottieni l'ID dell'ultima notifica per determinare se l'utente è stato aggiunto dopo l'inizio della chat
    const lastMessageCheck = await pool.request()
      .input('NotificationId', sql.Int, notificationId)
      .query(`
        SELECT MAX(messageId) as lastMessageId
        FROM AR_NotificationDetails
        WHERE notificationId = @NotificationId
      `);
    
    const lastMessageId = lastMessageCheck.recordset[0].lastMessageId;
    
    // Aggiungi l'utente come osservatore (copia i messaggi esistenti per lui)
    await pool.request()
      .input('NotificationId', sql.Int, notificationId)
      .input('UserId', sql.Int, userId)
      .query(`
        -- Ottieni tutte le informazioni necessarie dalla chat
        DECLARE @Messages TABLE (
          SenderId int,
          Message nvarchar(max),
          TbCreated datetime,
          ReplyToMessageId int,
          EventId int,
          ResponseOptionId int,
          PollId int, 
          MessageColor nvarchar(10)
        )
        
        -- Inserisci tutti i messaggi esistenti nella tabella temporanea
        INSERT INTO @Messages (SenderId, Message, TbCreated, ReplyToMessageId, EventId, ResponseOptionId, PollId, MessageColor)
        SELECT SenderId, Message, TbCreated, ReplyToMessageId, EventId, ResponseOptionId, PollId, MessageColor
        FROM AR_NotificationDetails
        WHERE NotificationId = @NotificationId AND Cancelled = 0
        ORDER BY TbCreated
        
        -- Ora inserisci i messaggi per il nuovo osservatore, senza specificare messageId (è un campo IDENTITY)
        INSERT INTO AR_NotificationDetails (
          NotificationId, SenderId, ReceiverId, Message, TbCreated, IsReadByUser, 
          IsReadByReceiver, ReplyToMessageId, EventId, ResponseOptionId, PollId,
          MessageColor
        )
        SELECT 
          @NotificationId, SenderId, @UserId, Message, TbCreated, 1, -- Imposta come già letto
          1, ReplyToMessageId, EventId, ResponseOptionId, PollId,
          MessageColor
        FROM @Messages
      `);
      
    // Aggiorna la vista delle notifiche
    await pool.request()
      .input('UserId', sql.Int, userId)
      .input('NotificationId', sql.Int, notificationId)
      .input('AllNotificationsByUser', sql.Int, 0)
      .execute('CreateNotificationsView');
    
    // Inserisci un messaggio di sistema visibile solo agli utenti originali, per notificare l'accesso in sola lettura
    // Facciamo una query completamente separata per evitare problemi con @LastMessageId
    await pool.request()
      .input('NotificationId', sql.Int, notificationId)
      .input('UserId', sql.Int, userId)
      .input('LastMessageId', sql.Int, lastMessageId || 0)
      .query(`
        -- Ottieni il nome dell'utente
        DECLARE @UserName nvarchar(max)
        SELECT @UserName = FirstName + ' ' + LastName FROM AR_Users WHERE UserId = @UserId
        
        -- Inserisci il messaggio di sistema solo se non esiste già
        IF NOT EXISTS (
          SELECT 1 FROM AR_NotificationDetails 
          WHERE NotificationId = @NotificationId 
            AND Message LIKE '%' + @UserName + '%sta osservando questa chat%'
            AND SenderId = 0
        )
        BEGIN
          -- Ottieni tutti i destinatari attuali (escludendo l'osservatore)
          INSERT INTO AR_NotificationDetails (
            NotificationId, SenderId, ReceiverId, Message, IsReadByUser, IsReadByReceiver, TbCreated
          )
          SELECT DISTINCT
            @NotificationId, 
            0, -- Sistema
            ReceiverId, 
            'L''utente ' + @UserName + ' sta osservando questa chat in modalità sola lettura',
            1, 
            0,
            GETDATE()
          FROM AR_NotificationDetails
          WHERE NotificationId = @NotificationId 
            AND Cancelled = 0 
            AND ReceiverId <> @UserId
            AND ReceiverId IN (
              -- Membri originali della chat (che hanno avuto i messaggi fin dall'inizio)
              SELECT DISTINCT ReceiverId
              FROM AR_NotificationDetails
              WHERE NotificationId = @NotificationId
              GROUP BY ReceiverId
              HAVING MIN(MessageId) < (@LastMessageId - 5) -- Margine di tolleranza
            )
          GROUP BY ReceiverId
        END
      `);
    
    return { 
      success: true, 
      message: 'Accesso in modalità osservatore aggiunto con successo' 
    };
  } catch (error) {
    console.error('Errore nell\'aggiungere accesso in modalità osservatore:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Converte un utente da osservatore a partecipante attivo della chat
 * Questo avviene quando un osservatore invia un messaggio o interagisce con la chat
 * @param {number} notificationId - ID della notifica/chat
 * @param {number} userId - ID dell'utente
 * @returns {Promise<Object>} - Risultato dell'operazione
 */
async function convertToActiveParticipant(notificationId, userId) {
  try {
    const pool = await sql.connect(config.database);
    
    // Verifica se l'utente è già un partecipante attivo della categoria
    const participantCheck = await pool.request()
      .input('NotificationId', sql.Int, notificationId)
      .input('UserId', sql.Int, userId)
      .query(`
        DECLARE @CategoryId int
        SELECT @CategoryId = notificationCategoryId FROM AR_Notifications WHERE notificationId = @NotificationId
        
        SELECT COUNT(*) as isActiveParticipant
        FROM AR_NotificationCategoryUsers
        WHERE notificationCategoryId = @CategoryId AND userId = @UserId
      `);
    
    const isAlreadyActive = participantCheck.recordset[0].isActiveParticipant > 0;
    
    if (isAlreadyActive) {
      return { 
        success: true, 
        message: 'L\'utente è già un partecipante attivo',
        alreadyActive: true
      };
    }
    
    // Aggiungi l'utente alla categoria della notifica (diventa ufficialmente un membro)
    await pool.request()
      .input('NotificationId', sql.Int, notificationId)
      .input('UserId', sql.Int, userId)
      .query(`
        -- Ottieni la categoria della notifica
        DECLARE @CategoryId int
        SELECT @CategoryId = notificationCategoryId FROM AR_Notifications WHERE notificationId = @NotificationId
        
        -- Aggiungi l'utente come membro ufficiale della categoria
        INSERT INTO AR_NotificationCategoryUsers (notificationCategoryId, userId)
        VALUES (@CategoryId, @UserId)
      `);
    
    // Inserisci un messaggio di sistema per notificare che l'osservatore ora è un partecipante attivo
    await pool.request()
      .input('NotificationId', sql.Int, notificationId)
      .input('UserId', sql.Int, userId)
      .query(`
        -- Ottieni il nome dell'utente
        DECLARE @UserName nvarchar(max)
        SELECT @UserName = FirstName + ' ' + LastName FROM AR_Users WHERE UserId = @UserId
        
        -- Inserisci il messaggio di sistema per tutti i partecipanti
        INSERT INTO AR_NotificationDetails (
          NotificationId, SenderId, ReceiverId, Message, IsReadByUser, IsReadByReceiver, TbCreated
        )
        SELECT DISTINCT
          @NotificationId, 
          0, -- Sistema
          ReceiverId, 
          'L''utente ' + @UserName + ' si è unito alla conversazione',
          CASE WHEN ReceiverId = @UserId THEN 1 ELSE 0 END, -- Già letto per l'utente stesso
          0,
          GETDATE()
        FROM AR_NotificationDetails
        WHERE NotificationId = @NotificationId AND Cancelled = 0 
        GROUP BY ReceiverId
      `);
    
    return { 
      success: true, 
      message: 'Utente convertito a partecipante attivo con successo' 
    };
  } catch (error) {
    console.error('Errore nella conversione a partecipante attivo:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Esporta le funzioni
module.exports = {
  getLinkedDocuments,
  linkDocumentToNotification,
  unlinkDocumentFromNotification,
  searchDocuments,
  searchChatsByDocument,
  addReadOnlyAccessToChat,
  convertToActiveParticipant
};