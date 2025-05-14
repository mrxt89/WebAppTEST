const sql = require('mssql');
const config = require('../config');
const { get } = require('../routes/notificationsRoutes');

async function getNotifications() {
  try {
    let pool = await sql.connect(config.dbConfig);
    let result = await pool.request().execute('GetNotifications');
    return result.recordset;
  } catch (err) {
    console.error('Error fetching notifications:', err);
    throw err;
  }
}

async function getUserNotifications(userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    let result = await pool.request()
      .input('userId', sql.Int, userId)
      .execute('GetUserNotifications');
    return result.recordset;
  } catch (err) {
    console.error('Error fetching user notifications:', err);
    throw err;
  }
}

async function getNotificationById(userId, notificationId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    let result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('notificationId', sql.Int, notificationId)
      .execute('GetUserNotifications');
    if (result.recordset.length === 0) {
      return null;
    }
    const notification = result.recordset[0];
    notification.messages = JSON.parse(notification.messages);
    notification.membersInfo = JSON.parse(notification.membersInfo);
    return notification;
  } catch (err) {
    console.error('Error fetching notification:', err);
    throw err;
  }
}

async function getNotificationResponseOptions() {
  try {
    let pool = await sql.connect(config.dbConfig);
    let result = await pool.request()
      .query(`
SELECT DISTINCT 
    T0.notificationCategoryId
    , T1.reply
    , T1.type
    , T0.defaultTitle
    , (SELECT defaultValue FROM AR_Notifications_ResponseOptions WHERE id = T1.id FOR JSON AUTO) AS valuesJSON
	  , ISNULL((  SELECT  TB.userId
                        , TB.username
                        , TB.firstName
                        , TB.lastName 
                FROM  AR_NotificationCategoryUsers (NOLOCK) TA 
                JOIN  AR_Users (NOLOCK) TB ON TA.userId = TB.userId AND TB.userDisabled = 0 AND TA.notificationCategoryId = T0.notificationCategoryId FOR JSON AUTO
                ),'[]') AS recipientsJSON
FROM AR_NotificationCategory (NOLOCK) T0 
JOIN AR_Notifications_ResponseOptions (NOLOCK) T1 
ON T1.id = T0.defaultResponseOptionId 
      `);
    return result.recordset;
  } catch (err) {
    console.error('Error fetching notification response options:', err);
    throw err;  // This throws an error back to the router, resulting in a 500 response
  }
}



async function markNotificationAsReceived(notificationId, userId, messageId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .input('userId', sql.Int, userId)
      .input('messageId', sql.Int, messageId)
      .query(`
        UPDATE AR_NotificationDetails
        SET received = 1
        WHERE notificationId = @notificationId AND receiverId = @userId AND messageId <= @messageId
      `);
  } catch (err) {
    console.error('Error marking message as received:', err);
    throw err;
  }
}

async function markNotificationAsRead(notificationId, userId, isReadByUser) {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .input('userId', sql.Int, userId)
      .input('isReadByUser', sql.Bit, isReadByUser)
      .query(`
        DISABLE TRIGGER [dbo].[TR_AR_NotificationDetails_Changes] ON [dbo].[AR_NotificationDetails];

        UPDATE  AR_NotificationDetails
        SET     isReadByUser = @isReadByUser
                , isReadByReceiver = CASE WHEN @isReadByUser = 1 AND isReadByReceiver = 0 THEN 1 ELSE isReadByReceiver END
                , ReceiverReadedDate = CASE WHEN @isReadByUser = 1 AND isReadByReceiver = 0 THEN GETDATE() ELSE ReceiverReadedDate END
                , received = 1
        WHERE   notificationId = @notificationId AND receiverId = @userId

        UPDATE  AR_NotificationsView
        SET     isReadByUser = @isReadByUser
        WHERE   notificationId = @notificationId AND userId = @userId

        UPDATE AR_Users SET LastOnline = GETDATE() WHERE UserId = @UserId;

        ENABLE TRIGGER [dbo].[TR_AR_NotificationDetails_Changes] ON [dbo].[AR_NotificationDetails];
      `);
  } catch (err) {
    console.error('Error marking notification as read:', err);
    throw err;
  }
}

async function togglePinned(notificationId, userId, pinned) {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .input('userId', sql.Int, userId)
      .input('pinned', sql.Bit, pinned)
      .query(`
        DISABLE TRIGGER [dbo].[TR_AR_NotificationDetails_Changes] ON [dbo].[AR_NotificationDetails];

        UPDATE AR_NotificationDetails
        SET pinned = @pinned
        WHERE notificationId = @notificationId AND receiverId = @userId

        UPDATE AR_NotificationsView
        SET pinned = @pinned
        WHERE notificationId = @notificationId AND userId = @userId;

        ENABLE TRIGGER [dbo].[TR_AR_NotificationDetails_Changes] ON [dbo].[AR_NotificationDetails];
      `);
  } catch (err) {
    console.error('Error toggling pinned:', err);
    throw err;
  }
}

async function toggleFavorite(notificationId, userId, favorite) {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .input('userId', sql.Int, userId)
      .input('favorite', sql.Bit, favorite)
      .query(`
        DISABLE TRIGGER [dbo].[TR_AR_NotificationDetails_Changes] ON [dbo].[AR_NotificationDetails];

        UPDATE AR_NotificationDetails
        SET favorite = @favorite
        WHERE notificationId = @notificationId AND receiverId = @userId

        UPDATE AR_NotificationsView
        SET favorite = @favorite
        WHERE notificationId = @notificationId AND userId = @userId;

        ENABLE TRIGGER [dbo].[TR_AR_NotificationDetails_Changes] ON [dbo].[AR_NotificationDetails];


      `);
  } catch (err) {
    console.error('Error toggling favorite:', err);
    throw err;
  }
}

async function closeChat(notificationId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE  AR_Notifications
        SET     isClosed = 1
                , closingUser = @userId
                , closingDate = GETDATE()
        WHERE   notificationId = @notificationId

        INSERT INTO AR_NotificationDetails (notificationId, senderId, receiverId, isReadByUser, isReadByReceiver, message, pinned, tbCreated)
        SELECT	DISTINCT
            notificationId
            , @userId AS senderId
            , receiverId
            , CASE WHEN receiverId = @userId THEN 1 ELSE 0 END AS isReadByUser
            , 0 AS isReadByReceiver
            , 'La chat è stata chiusa' AS message
            , ISNULL((SELECT TOP(1) pinned FROM AR_NotificationDetails (NOLOCK) WHERE notificationId = @notificationId AND receiverId = T0.receiverId ORDER BY pinned DESC),0) AS pinned
            , GETDATE() AS tbCreated
        FROM	AR_NotificationDetails (NOLOCK) T0
        WHERE	cancelled = 0 AND notificationId = @notificationId
      `);
  } catch (err) {
    console.error('Error closing chat:', err);
    throw err;
  }
}

async function reopenChat(notificationId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE  AR_Notifications
        SET     isClosed = 0
        WHERE   notificationId = @notificationId

        INSERT INTO AR_NotificationDetails (notificationId, senderId, receiverId, isReadByUser, isReadByReceiver, message, pinned, tbCreated)
        SELECT	DISTINCT
            notificationId
            , @userId AS senderId
            , receiverId
            , CASE WHEN receiverId = @userId THEN 1 ELSE 0 END AS isReadByUser
            , 0 AS isReadByReceiver
            , 'La chat è stata riaperta' AS message
            , ISNULL((SELECT TOP(1) pinned FROM AR_NotificationDetails (NOLOCK) WHERE notificationId = @notificationId AND receiverId = T0.receiverId ORDER BY pinned DESC),0) AS pinned
            , GETDATE() AS tbCreated
        FROM	AR_NotificationDetails (NOLOCK) T0
        WHERE	cancelled = 0 AND notificationId = @notificationId
      `);
  } catch (err) {
    console.error('Error reopening chat:', err);
    throw err;
  }
}

async function sendNotification(data) {
  const { notificationId, message, responseOptionId, eventId, title, notificationCategoryId, receiversList, userId, replyToMessageId, pollId } = data;
  try {
    let pool = await sql.connect(config.dbConfig);
    // Prima di inviare i dati al server
    const cleanMessage = message.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    let request = pool.request()
    .input('userId', sql.Int, userId)
    .input('notificationId', sql.Int, notificationId)
    .input('message', sql.NVarChar(sql.MAX), cleanMessage)
    .input('responseOptionId', sql.Int, responseOptionId)
    .input('eventId', sql.Int, eventId)
    .input('replyToMessageId', sql.Int, replyToMessageId)
    .input('SkipReturnInfo', sql.Int, 0);  // Assicurati che ritorni sempre i dati completi
    
    // Aggiungi parametri opzionali solo se sono presenti
    if (title) request.input('title', sql.NVarChar(sql.MAX), title);
    if (notificationCategoryId) request.input('notificationCategoryId', sql.Int, notificationCategoryId);
    if (receiversList) request.input('receiversList', sql.VarChar, receiversList);
    if (pollId) request.input('pollId', sql.Int, pollId); // Nuovo parametro per messaggi con sondaggio
    
    console.log('Executing SendNotification procedure with message:', cleanMessage.substring(0, 50) + '...');
    let result = await request.execute('SendNotification');

    const record = result.recordset[0];
    console.log('SendNotification result received');
    
    // Gestione sicura del parsing dei messaggi
    let parsedMessages;
    try {
      parsedMessages = typeof record.messages === 'string' 
        ? JSON.parse(record.messages) 
        : record.messages;
    } catch (err) {
      console.error('Error parsing messages:', err);
      parsedMessages = [];
    }
    
    // Gestione sicura del parsing dei membri
    let parsedMembersInfo;
    try {
      parsedMembersInfo = typeof record.membersInfo === 'string' 
        ? JSON.parse(record.membersInfo) 
        : record.membersInfo;
    } catch (err) {
      console.error('Error parsing membersInfo:', err);
      parsedMembersInfo = [];
    }

    return {
      success: true,
      msg: record.msg,
      notificationId: record.notificationId ?? 0,
      notificationCategoryId: record.notificationCategoryId ?? 0,
      title: record.title ?? '',
      messages: parsedMessages,
      membersInfo: parsedMembersInfo,
      isClosed: record.isClosed,
      closingUser: record.closingUser,
      closingDate: record.closingDate,
      serverTimestamp: new Date().toISOString() // Aggiungi timestamp server per debugging
    };
  } catch (err) {
    console.error('Error sending notification:', err);
    throw err;
  }
}

async function createDBNotificationsView(userId) {
  try {
    const pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('EXEC CreateNotificationsView @userId = @userId, @notificationId = 0, @allNotificationsByUser = 1; EXEC GetUserNotifications @userId = @userId, @notificationId =0');
    return result.recordset;
  } catch (err) {
    console.error('Error creating DB notifications view:', err);
    throw err;
  }
}

/**
 * Imposta il colore di un messaggio specifico
 * @param {number} messageId - ID del messaggio da colorare
 * @param {number} userId - ID dell'utente che sta impostando il colore
 * @param {string} color - Codice esadecimale del colore
 */
async function setMessageColor(messageId, userId, color) {
  try {
    // Verificare che il formato del colore sia corretto (es. #FFFFFF)
    if (!color || !color.startsWith('#') || color.length !== 7) {
      throw new Error('Formato colore non valido. Deve essere in formato #RRGGBB');
    }

    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('messageId', sql.Int, messageId)
      .input('userId', sql.Int, userId)
      .input('color', sql.NVarChar(7), color)
      .query(`
        UPDATE AR_NotificationDetails
        SET messageColor = @color
        WHERE messageId = @messageId AND receiverId = @userId
      `);
    
    // Recupera l'ID della notifica associata al messaggio
    const notificationResult = await pool.request()
      .input('messageId', sql.Int, messageId)
      .query(`
        SELECT notificationId 
        FROM AR_NotificationDetails 
        WHERE messageId = @messageId
      `);
    
    if (notificationResult.recordset.length > 0) {
      const notificationId = notificationResult.recordset[0].notificationId;
      
      // Aggiorna la vista delle notifiche per l'utente
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('notificationId', sql.Int, notificationId)
        .input('allNotificationsByUser', sql.Int, 0)
        .execute('CreateNotificationsView');
    }

    return { success: true };
  } catch (err) {
    console.error('Error setting message color:', err);
    throw err;
  }
}

/**
 * Rimuove il colore di un messaggio specifico
 * @param {number} messageId - ID del messaggio
 * @param {number} userId - ID dell'utente
 */
async function clearMessageColor(messageId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('messageId', sql.Int, messageId)
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE AR_NotificationDetails
        SET messageColor = NULL
        WHERE messageId = @messageId AND receiverId = @userId
      `);
    
    // Recupera l'ID della notifica associata al messaggio
    const notificationResult = await pool.request()
      .input('messageId', sql.Int, messageId)
      .query(`
        SELECT notificationId 
        FROM AR_NotificationDetails 
        WHERE messageId = @messageId
      `);
    
    if (notificationResult.recordset.length > 0) {
      const notificationId = notificationResult.recordset[0].notificationId;
      
      // Aggiorna la vista delle notifiche per l'utente
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('notificationId', sql.Int, notificationId)
        .input('allNotificationsByUser', sql.Int, 0)
        .execute('CreateNotificationsView');
    }
    
    return { success: true };
  } catch (err) {
    console.error('Error clearing message color:', err);
    throw err;
  }
}

/**
 * Filtra i messaggi per colore o testo
 * @param {number} notificationId - ID della notifica
 * @param {number} userId - ID dell'utente
 * @param {string} color - Codice colore opzionale
 * @param {string} searchText - Testo da cercare opzionale
 */
async function filterMessages(notificationId, userId, color, searchText) {
  try {
    // Verifica che i parametri necessari siano presenti
    if (!notificationId) {
      throw new Error('NotificationId è obbligatorio');
    }
    
    let pool = await sql.connect(config.dbConfig);
    let query = `
      SELECT nd.messageId, nd.message, nd.messageColor, nd.tbCreated, 
             u.firstName + ' ' + u.lastName AS senderName,
             CASE WHEN nd.senderId = @userId THEN 1 ELSE 0 END AS selectedUser
      FROM AR_NotificationDetails nd
      JOIN AR_Users u ON u.userId = nd.senderId
      WHERE nd.notificationId = @notificationId 
        AND nd.receiverId = @userId 
        AND nd.cancelled = 0
    `;
    
    // Aggiungi filtri opzionali
    const params = {
      notificationId: { type: sql.Int, value: notificationId },
      userId: { type: sql.Int, value: userId }
    };
    
    // Modifica qui per gestire correttamente il colore
    if (color && color.trim() !== '') {
      query += ` AND nd.messageColor = @color`;
      params.color = { type: sql.NVarChar(10), value: color };
    }
    
    if (searchText && searchText.trim() !== '') {
      query += ` AND nd.message LIKE @searchText`;
      params.searchText = { type: sql.NVarChar(sql.MAX), value: `%${searchText}%` };
    }
    
    
    query += ` ORDER BY nd.tbCreated DESC`;
    
    const request = pool.request();
    
    // Aggiungi tutti i parametri alla request
    Object.entries(params).forEach(([key, param]) => {
      request.input(key, param.type, param.value);
    });
    
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    console.error('Error filtering messages:', err);
    throw err;
  }
}

/**
 * Aggiunge un punto importante alla conversazione
 * @param {number} notificationId - ID della notifica
 * @param {number} userId - ID dell'utente
 * @param {string} highlightText - Testo del punto importante
 * @param {boolean} isAutoGenerated - Indica se è stato generato automaticamente
 * @returns {Promise<Object>} - Risultato dell'operazione
 */
async function addConversationHighlight(notificationId, userId, highlightText, isAutoGenerated = false) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('NotificationID', sql.Int, notificationId)
      .input('UserID', sql.Int, userId)
      .input('HighlightText', sql.NVarChar(500), highlightText)
      .input('IsAutoGenerated', sql.Bit, isAutoGenerated)
      .execute('AddConversationHighlight');
    
    return result.recordset[0];
  } catch (err) {
    console.error('Error adding conversation highlight:', err);
    throw err;
  }
}

/**
 * Rimuove un punto importante
 * @param {number} highlightId - ID del punto importante
 * @param {number} userId - ID dell'utente
 * @returns {Promise<Object>} - Risultato dell'operazione
 */
async function removeConversationHighlight(highlightId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('HighlightID', sql.Int, highlightId)
      .input('UserID', sql.Int, userId)
      .execute('RemoveConversationHighlight');
    
    return result.recordset[0];
  } catch (err) {
    console.error('Error removing conversation highlight:', err);
    throw err;
  }
}

/**
 * Ottiene i punti importanti di una conversazione
 * @param {number} notificationId - ID della notifica
 * @param {number} userId - ID dell'utente
 * @returns {Promise<Array>} - Lista dei punti importanti
 */
async function getConversationHighlights(notificationId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('NotificationID', sql.Int, notificationId)
      .input('UserID', sql.Int, userId)
      .execute('GetConversationHighlights');
    
    return result.recordset;
  } catch (err) {
    console.error('Error getting conversation highlights:', err);
    throw err;
  }
}

/**
 * Genera automaticamente un riepilogo della conversazione
 * @param {number} notificationId - ID della notifica
 * @param {number} userId - ID dell'utente
 * @returns {Promise<Array>} - Lista dei punti importanti generati
 */
async function generateConversationSummary(notificationId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('NotificationID', sql.Int, notificationId)
      .input('UserID', sql.Int, userId)
      .execute('GenerateConversationSummary');
    
    return result.recordset;
  } catch (err) {
    console.error('Error generating conversation summary:', err);
    throw err;
  }
}


/**
 * Permette a un utente di abbandonare una chat
 * @param {number} notificationId - ID della notifica/chat da abbandonare
 * @param {number} userId - ID dell'utente che vuole abbandonare la chat
 * @returns {Promise<Object>} - Risultato dell'operazione
 */
async function leaveChat(notificationId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .input('userId', sql.Int, userId)
      .execute('LeaveChat');
    
    return result.recordset[0];
  } catch (err) {
    console.error('Error leaving chat:', err);
    throw err;
  }
}

/**
 * Crea un nuovo sondaggio
 * @param {number} notificationId - ID della notifica
 * @param {number} messageId - ID del messaggio
 * @param {string} question - Domanda del sondaggio
 * @param {Array} options - Opzioni di risposta
 * @param {boolean} allowMultipleAnswers - Permetti risposte multiple
 * @param {number} userId - ID dell'utente creatore
 * @param {Date} expirationDate - Data di scadenza (opzionale)
 * @returns {Promise<Object>} - Sondaggio creato
 */
async function createPoll(notificationId, messageId, question, options, allowMultipleAnswers, userId, expirationDate) {
  try {
    // Verifiche di sicurezza
    if (!notificationId || !messageId || !question || !options || !Array.isArray(options) || options.length < 2) {
      throw new Error('Parametri mancanti o non validi per la creazione del sondaggio');
    }

    
    const optionsJson = JSON.stringify(options);
    
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('NotificationID', sql.Int, notificationId)
      .input('MessageID', sql.Int, messageId)
      .input('Question', sql.NVarChar(500), question)
      .input('Options', sql.NVarChar(sql.MAX), optionsJson)
      .input('AllowMultipleAnswers', sql.Bit, allowMultipleAnswers ? 1 : 0)
      .input('CreatedBy', sql.Int, userId)
      .input('ExpirationDate', sql.DateTime, expirationDate || null)
      .execute('CreatePoll');
    
    
    
    return result.recordset[0];
  } catch (err) {
    console.error('Error creating poll:', err);
    throw err;
  }
}

/**
 * Vota in un sondaggio
 * @param {number} optionId - ID dell'opzione selezionata
 * @param {number} userId - ID dell'utente votante
 * @returns {Promise<Object>} - Risultati aggiornati del sondaggio
 */
async function votePoll(optionId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('OptionID', sql.Int, optionId)
      .input('UserID', sql.Int, userId)
      .execute('VotePoll');
    
    return result.recordset[0];
  } catch (err) {
    console.error('Error voting in poll:', err);
    throw err;
  }
}

/**
 * Ottieni un sondaggio specifico con i suoi risultati
 * @param {number} pollId - ID del sondaggio
 * @param {number} userId - ID dell'utente
 * @returns {Promise<Object>} - Dettagli e risultati del sondaggio
 */
async function getPoll(pollId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('PollID', sql.Int, pollId)
      .input('UserID', sql.Int, userId)
      .execute('GetPoll');
    
    return result.recordset[0];
  } catch (err) {
    console.error('Error getting poll:', err);
    throw err;
  }
}

/**
 * Ottieni tutti i sondaggi di una notifica
 * @param {number} notificationId - ID della notifica
 * @param {number} userId - ID dell'utente
 * @returns {Promise<Array>} - Lista dei sondaggi con risultati
 */
async function getNotificationPolls(notificationId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('NotificationID', sql.Int, notificationId)
      .input('UserID', sql.Int, userId)
      .execute('GetNotificationPolls');
    
    return result.recordset;
  } catch (err) {
    console.error('Error getting notification polls:', err);
    throw err;
  }
}

/**
 * Chiudi un sondaggio
 * @param {number} pollId - ID del sondaggio
 * @param {number} userId - ID dell'utente (deve essere il creatore)
 * @returns {Promise<Object>} - Sondaggio aggiornato
 */
async function closePoll(pollId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('PollID', sql.Int, pollId)
      .input('UserID', sql.Int, userId)
      .execute('ClosePoll');
    
    return result.recordset[0];
  } catch (err) {
    console.error('Error closing poll:', err);
    throw err;
  }
}

async function archiveChat(notificationId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .input('userId', sql.Int, userId)
      .query(`
        DISABLE TRIGGER [dbo].[TR_AR_NotificationDetails_Changes] ON [dbo].[AR_NotificationDetails];

        -- Imposta il flag cancelled a 1 solo per questo utente su AR_NotificationDetails
        UPDATE AR_NotificationDetails
        SET archived = 1
        WHERE notificationId = @notificationId 
        AND receiverId = @userId;

        -- Imposta il flag cancelled a 1 solo per questo utente su AR_NotificationsView
        UPDATE AR_NotificationsView
        SET archived = 1
        WHERE notificationId = @notificationId
        AND userId = @userId;

        ENABLE TRIGGER [dbo].[TR_AR_NotificationDetails_Changes] ON [dbo].[AR_NotificationDetails];

      `);

    return { success: true, message: 'Chat archiviata con successo' };
  } catch (err) {
    console.error('Error archiving chat:', err);
    throw err;
  }
}

async function unarchiveChat(notificationId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .input('userId', sql.Int, userId)
      .query(`
        DISABLE TRIGGER [dbo].[TR_AR_NotificationDetails_Changes] ON [dbo].[AR_NotificationDetails];

        -- Imposta il flag archived a 0 per questo utente su AR_NotificationDetails
        UPDATE AR_NotificationDetails
        SET archived = 0
        WHERE notificationId = @notificationId 
        AND receiverId = @userId;

        -- Imposta il flag archived a 0 per questo utente su AR_NotificationsView
        UPDATE AR_NotificationsView
        SET archived = 0
        WHERE notificationId = @notificationId
        AND userId = @userId;

        ENABLE TRIGGER [dbo].[TR_AR_NotificationDetails_Changes] ON [dbo].[AR_NotificationDetails];
      `);

    return { success: true, message: 'Chat rimossa dall\'archivio con successo' };
  } catch (err) {
    console.error('Error unarchiving chat:', err);
    throw err;
  }
}

/**
 * Aggiorna il titolo di una chat
 * @param {number} notificationId - ID della notifica/chat da aggiornare
 * @param {number} userId - ID dell'utente che sta aggiornando il titolo
 * @param {string} title - Nuovo titolo della chat
 * @returns {Promise<Object>} - Risultato dell'operazione
 */
async function updateChatTitle(notificationId, userId, title) {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    // Aggiorna il titolo nella tabella AR_Notifications
    await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .input('title', sql.NVarChar(500), title)
      .query(`
        UPDATE AR_Notifications
        SET title = @title
        WHERE notificationId = @notificationId
      `);
    
    return { 
      success: true, 
      message: 'Titolo aggiornato con successo',
      title: title
    };
  } catch (err) {
    console.error('Error updating chat title:', err);
    throw err;
  }
}

/**
 * Modifica un messaggio esistente
 * @param {number} messageId - ID del messaggio da modificare
 * @param {number} userId - ID dell'utente che sta modificando il messaggio
 * @param {string} newMessage - Nuovo testo del messaggio
 * @returns {Promise<Object>} - Risultato dell'operazione
 */
async function editMessage(messageId, userId, newMessage) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('messageId', sql.Int, messageId)
      .input('userId', sql.Int, userId)
      .input('newMessage', sql.NVarChar(sql.MAX), newMessage)
      .execute('EditMessage');
    
    return result.recordset[0];
  } catch (err) {
    console.error('Error editing message:', err);
    throw err;
  }
}

/**
 * Ottiene la cronologia delle versioni di un messaggio
 * @param {number} messageId - ID del messaggio
 * @param {number} userId - ID dell'utente che richiede la cronologia
 * @returns {Promise<Object>} - Cronologia delle versioni
 */
async function getMessageVersionHistory(messageId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('messageId', sql.Int, messageId)
      .input('userId', sql.Int, userId)
      .execute('GetMessageVersionHistory');
    
    // La stored procedure restituisce due resultset:
    // 1. Versione corrente
    // 2. Cronologia delle versioni precedenti
    
    const currentMessage = result.recordset[0] || null;
    const versionHistory = result.recordsets[1] || [];
    
    return {
      success: true,
      currentMessage,
      versionHistory
    };
  } catch (err) {
    console.error('Error getting message version history:', err);
    throw err;
  }
}

// Funzione per silenziare/annullare silenziamento di una chat
async function toggleMuteChat(notificationId, userId, isMuted, expiryDate = null) {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .input('userId', sql.Int, userId)
      .input('isMuted', sql.Bit, isMuted)
      .input('expiryDate', sql.DateTime, expiryDate)
      .query(`
        DISABLE TRIGGER [dbo].[TR_AR_NotificationDetails_Changes] ON [dbo].[AR_NotificationDetails];
        
        -- Imposta il flag isMuted e la data di scadenza per il silenziamento per AR_NotificationDetails
        UPDATE AR_NotificationDetails
        SET isMuted = @isMuted,
            muteExpiryDate = @expiryDate
        WHERE notificationId = @notificationId AND receiverId = @userId;

        -- Imposta il flag isMuted e la data di scadenza per il silenziamento per AR_NotificationsView
        UPDATE AR_NotificationsView
        SET isMuted = @isMuted,
            muteExpiryDate = @expiryDate
        WHERE notificationId = @notificationId AND userId = @userId;

        ENABLE TRIGGER [dbo].[TR_AR_NotificationDetails_Changes] ON [dbo].[AR_NotificationDetails];

      `);
    
    return { 
      success: true, 
      message: isMuted ? 'Chat silenziata con successo' : 'Silenziamento rimosso con successo' 
    };
  } catch (err) {
    console.error('Error toggling mute status:', err);
    throw err;
  }
}

// Funzione per attivare/disattivare la modalità "Non disturbare"
async function toggleDoNotDisturb(userId, enabled) {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('enabled', sql.Bit, enabled)
      .query(`
        UPDATE AR_Users
        SET DoNotDisturb = @enabled
        WHERE userId = @userId
      `);
    
    return { 
      success: true, 
      enabled,
      message: enabled ? 'Modalità "Non disturbare" attivata' : 'Modalità "Non disturbare" disattivata' 
    };
  } catch (err) {
    console.error('Error toggling Do Not Disturb:', err);
    throw err;
  }
}

// Funzione per verificare lo stato della modalità "Non disturbare"
async function getDoNotDisturbStatus(userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT DoNotDisturb FROM AR_Users
        WHERE userId = @userId
      `);
    
    if (result.recordset.length > 0) {
      return {
        enabled: result.recordset[0].DoNotDisturb === true
      };
    }
    
    return { enabled: false };
  } catch (err) {
    console.error('Error getting Do Not Disturb status:', err);
    throw err;
  }
}


// File: notificationsManagement.js

/**
 * Per ottenere tutti i messageId che corrispondono allo stesso messaggio logico
 * 
 * @param {number} messageId - ID del messaggio di riferimento
 * @returns {Promise<Array<number>>} - Array di tutti i messageId correlati
 */
async function getRelatedMessageIds(messageId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    // Prima otteniamo le informazioni sul messaggio di riferimento
    const messageInfoResult = await pool.request()
      .input('messageId', sql.Int, messageId)
      .query(`
        SELECT notificationId, senderId, message, tbCreated
        FROM AR_NotificationDetails
        WHERE messageId = @messageId
      `);
    
    if (messageInfoResult.recordset.length === 0) {
      console.error(`Message with ID ${messageId} not found`);
      return [messageId]; // Ritorna almeno l'ID originale
    }
    
    const messageInfo = messageInfoResult.recordset[0];
    
    // Ora cerchiamo tutti i messageId che corrispondono allo stesso messaggio logico
    // utilizzando notificationId, senderId, message e tbCreated come criteri
    const relatedIdsResult = await pool.request()
      .input('notificationId', sql.Int, messageInfo.notificationId)
      .input('senderId', sql.Int, messageInfo.senderId)
      .input('message', sql.NVarChar(sql.MAX), messageInfo.message)
      .input('tbCreated', sql.DateTime, messageInfo.tbCreated)
      .query(`
        SELECT messageId
        FROM AR_NotificationDetails
        WHERE notificationId = @notificationId
          AND senderId = @senderId
          AND message = @message
          AND tbCreated = @tbCreated
      `);
    
    // Estrai gli ID in un array
    const relatedIds = relatedIdsResult.recordset.map(row => row.messageId);
    
    return relatedIds;
  } catch (err) {
    console.error('Error getting related message IDs:', err);
    return [messageId]; // In caso di errore, ritorna almeno l'ID originale
  }
}

/**
 * Recupera tutte le reazioni per un messaggio, considerando tutti gli ID correlati
 * 
 * @param {number} messageId - ID del messaggio
 * @returns {Promise<Array>} - Lista delle reazioni
 */
async function getMessageReactions(messageId) {
  try {
    // Ottieni tutti gli ID correlati per questo messaggio
    const relatedMessageIds = await getRelatedMessageIds(messageId);
    
    // Se non ci sono ID correlati, ritorna un array vuoto
    if (relatedMessageIds.length === 0) {
      return [];
    }
    
    let pool = await sql.connect(config.dbConfig);
    
    // Costruisci la query dinamicamente per includere tutti gli ID correlati
    let query = `
      SELECT mr.ReactionID, mr.MessageID, mr.UserID, mr.ReactionType, mr.CreatedDate,
             u.firstName + ' ' + u.lastName AS UserName, u.email
      FROM AR_MessageReactions mr
      JOIN AR_Users u ON u.userId = mr.UserID
      WHERE mr.MessageID IN (${relatedMessageIds.join(',')})
      ORDER BY mr.CreatedDate ASC
    `;
    
    const result = await pool.request().query(query);
    
    return result.recordset;
  } catch (err) {
    console.error('Error getting message reactions:', err);
    return []; // Ritorna array vuoto in caso di errore
  }
}

/**
 * Aggiunge o rimuove una reazione a un messaggio, gestendo gli ID correlati
 * 
 * @param {number} messageId - ID del messaggio
 * @param {number} userId - ID dell'utente
 * @param {string} reactionType - Tipo di reazione (emoji)
 * @returns {Promise<Object>} - Risultato dell'operazione
 */
async function addMessageReaction(messageId, userId, reactionType) {
  try {
    // Verifica parametri
    if (!messageId || !userId || !reactionType) {
      throw new Error('MessageId, userId e reactionType sono campi obbligatori');
    }
    
    // Ottieni tutti gli ID correlati per questo messaggio
    const relatedMessageIds = await getRelatedMessageIds(messageId);
    
    let pool = await sql.connect(config.dbConfig);
    
    // Cerca se esiste già una reazione dell'utente su uno qualsiasi degli ID correlati
    let existingReactionQuery = `
      SELECT ReactionID, MessageID, ReactionType
      FROM AR_MessageReactions
      WHERE UserID = @userId AND MessageID IN (${relatedMessageIds.join(',')})
    `;
    
    const existingReactionResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(existingReactionQuery);
    
    // Se l'utente ha già una reazione su uno qualsiasi degli ID correlati
    if (existingReactionResult.recordset.length > 0) {
      const existingReaction = existingReactionResult.recordset[0];
      
      // Se sta cercando di aggiungere la stessa reazione, rimuovila (toggle)
      if (existingReaction.ReactionType === reactionType) {
        
        await pool.request()
          .input('reactionId', sql.Int, existingReaction.ReactionID)
          .query(`
            DELETE FROM AR_MessageReactions
            WHERE ReactionID = @reactionId
          `);
        
        // Ottieni l'ID della notifica associata al messaggio
        const notificationResult = await pool.request()
          .input('messageId', sql.Int, messageId)
          .query(`
            SELECT notificationId
            FROM AR_NotificationDetails
            WHERE messageId = @messageId
          `);
        
        let notificationId = null;
        if (notificationResult.recordset.length > 0) {
          notificationId = notificationResult.recordset[0].notificationId;
          
          // Aggiorna la vista delle notifiche
          await pool.request()
            .input('userId', sql.Int, userId)
            .input('notificationId', sql.Int, notificationId)
            .input('allNotificationsByUser', sql.Int, 0)
            .execute('CreateNotificationsView');
        }
        
        return {
          success: true,
          message: 'Reazione rimossa con successo',
          action: 'removed',
          notificationId
        };
      } else {
        
        await pool.request()
          .input('reactionId', sql.Int, existingReaction.ReactionID)
          .query(`
            DELETE FROM AR_MessageReactions
            WHERE ReactionID = @reactionId
          `);
      }
    }
    
    
    await pool.request()
      .input('messageId', sql.Int, messageId)
      .input('userId', sql.Int, userId)
      .input('reactionType', sql.NVarChar(10), reactionType)
      .query(`
        INSERT INTO AR_MessageReactions (MessageID, UserID, ReactionType)
        VALUES (@messageId, @userId, @reactionType)
      `);
    
    // Ottieni l'ID della notifica associata al messaggio per aggiornare la vista
    const notificationResult = await pool.request()
      .input('messageId', sql.Int, messageId)
      .query(`
        SELECT notificationId
        FROM AR_NotificationDetails
        WHERE messageId = @messageId
      `);
    
    let notificationId = null;
    if (notificationResult.recordset.length > 0) {
      notificationId = notificationResult.recordset[0].notificationId;
      
      // Aggiorna la vista delle notifiche
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('notificationId', sql.Int, notificationId)
        .input('allNotificationsByUser', sql.Int, 0)
        .execute('CreateNotificationsView');
    }
    
    return {
      success: true,
      message: 'Reazione aggiunta con successo',
      action: 'added',
      notificationId
    };
  } catch (err) {
    console.error('Error adding/toggling message reaction:', err);
    throw err;
  }
}

/**
 * Ottiene informazioni su una specifica reazione
 * 
 * @param {number} reactionId - ID della reazione
 * @returns {Promise<Object|null>} - Informazioni sulla reazione o null se non trovata
 */
async function getReactionInfo(reactionId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('reactionId', sql.Int, reactionId)
      .query(`
        SELECT mr.ReactionID, mr.MessageID, mr.UserID, mr.ReactionType, mr.CreatedDate,
               nd.notificationId
        FROM AR_MessageReactions mr
        JOIN AR_NotificationDetails nd ON nd.messageId = mr.MessageID
        WHERE mr.ReactionID = @reactionId
      `);
    
    if (result.recordset.length === 0) {
      return null;
    }
    
    const reactionInfo = result.recordset[0];
    
    return {
      reactionId: reactionInfo.ReactionID,
      messageId: reactionInfo.MessageID,
      userId: reactionInfo.UserID,
      reactionType: reactionInfo.ReactionType,
      createdDate: reactionInfo.CreatedDate,
      notificationId: reactionInfo.notificationId
    };
  } catch (err) {
    console.error('Error getting reaction info:', err);
    return null;
  }
}

/**
 * Rimuove una reazione specifica
 * 
 * @param {number} reactionId - ID della reazione da rimuovere
 * @param {number} userId - ID dell'utente che sta rimuovendo la reazione
 * @returns {Promise<Object>} - Risultato dell'operazione
 */
async function removeMessageReaction(reactionId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    // Verifica che la reazione appartenga all'utente
    const checkResult = await pool.request()
      .input('reactionId', sql.Int, reactionId)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT mr.MessageID, nd.notificationId
        FROM AR_MessageReactions mr
        JOIN AR_NotificationDetails nd ON nd.messageId = mr.MessageID
        WHERE mr.ReactionID = @reactionId AND mr.UserID = @userId
      `);
    
    if (checkResult.recordset.length === 0) {
      return { 
        success: false, 
        message: 'Non hai il permesso di rimuovere questa reazione'
      };
    }
    
    const messageId = checkResult.recordset[0].MessageID;
    const notificationId = checkResult.recordset[0].notificationId;
    
    // Rimuovi la reazione
    await pool.request()
      .input('reactionId', sql.Int, reactionId)
      .query(`
        DELETE FROM AR_MessageReactions
        WHERE ReactionID = @reactionId
      `);
    
    // Aggiorna la vista notifiche
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('notificationId', sql.Int, notificationId)
      .input('allNotificationsByUser', sql.Int, 0)
      .execute('CreateNotificationsView');
    
    return {
      success: true,
      message: 'Reazione rimossa con successo',
      messageId,
      notificationId
    };
  } catch (err) {
    console.error('Error removing message reaction:', err);
    return { 
      success: false, 
      message: 'Errore durante la rimozione della reazione: ' + err.message 
    };
  }
}

/**
 * Helper per ottenere l'ID della notifica associata a un messaggio
 * 
 * @param {number} messageId - ID del messaggio
 * @returns {Promise<Object|null>} - Oggetto con notificationId o null
 */
async function getNotificationIdForMessage(messageId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('messageId', sql.Int, messageId)
      .query(`
        SELECT notificationId 
        FROM AR_NotificationDetails 
        WHERE messageId = @messageId
      `);
    
    return result.recordset[0] || null;
  } catch (error) {
    console.error('Error getting notificationId for message:', error);
    return null;
  }
}

/**
 * Elimina un messaggio (imposta cancelled = 1)
 * 
 * @param {number} messageId - ID del messaggio da eliminare
 * @param {number} userId - ID dell'utente che sta eliminando il messaggio
 * @returns {Promise<Object>} - Risultato dell'operazione
 */
async function deleteMessage(messageId, userId) {
  try {
    // Verifica parametri
    if (!messageId || !userId) {
      throw new Error('MessageId e userId sono campi obbligatori');
    }
    
    // Ottieni tutti gli ID correlati per questo messaggio
    const relatedMessageIds = await getRelatedMessageIds(messageId);
    
    let pool = await sql.connect(config.dbConfig);
    
    // Prima controlla che il messaggio appartenga all'utente
    const checkOwnershipResult = await pool.request()
      .input('messageId', sql.Int, messageId)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT messageId, notificationId, senderId
        FROM AR_NotificationDetails
        WHERE messageId = @messageId AND senderId = @userId
      `);
    
    if (checkOwnershipResult.recordset.length === 0) {
      return {
        success: false,
        message: 'Non hai il permesso di eliminare questo messaggio'
      };
    }
    
    const notificationId = checkOwnershipResult.recordset[0].notificationId;
    
    // Ora marca tutti i messaggi correlati come cancellati
    // E imposta un testo standard per i messaggi cancellati
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('messageIds', sql.NVarChar(sql.MAX), relatedMessageIds.join(','))
      .query(`
        UPDATE AR_NotificationDetails
        SET cancelled = 1,
            message = 'Messaggio eliminato dall''utente'
        WHERE messageId IN (
          SELECT value FROM STRING_SPLIT(@messageIds, ',')
        ) 
        AND senderId = @userId
      `);
    
    // Aggiorna la vista delle notifiche
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('notificationId', sql.Int, notificationId)
      .input('allNotificationsByUser', sql.Int, 0)
      .execute('CreateNotificationsView');
    
    return {
      success: true,
      message: 'Messaggio eliminato con successo',
      notificationId,
      messageId
    };
  } catch (err) {
    console.error('Error deleting message:', err);
    return {
      success: false,
      message: 'Errore durante l\'eliminazione del messaggio: ' + err.message
    };
  }
}

/**
 * Recupera le reazioni di più messaggi in batch
 * @param {Array<number>} messageIds - Array di ID dei messaggi
 * @returns {Promise<Object>} - Mappa delle reazioni per messageId
 */
async function getBatchReactions(messageIds) {
  try {
    // Verifica che messageIds sia un array valido
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      throw new Error('Parametro messageIds non valido o vuoto');
    }
    
    // Limita il numero di messaggi per evitare richieste troppo pesanti
    const MAX_MESSAGES = 50;
    const messageIdsToProcess = messageIds.slice(0, MAX_MESSAGES);
    
    // Crea una mappa per i risultati
    const reactionsMap = {};
    
    // Utilizza una singola query per ottenere le reazioni di tutti i messaggi
    let pool = await sql.connect(config.dbConfig);
    
    // Crea la query con IN clause
    const messageIdsString = messageIdsToProcess.join(',');
    
    const query = `
      SELECT mr.ReactionID, mr.MessageID, mr.UserID, mr.ReactionType, mr.CreatedDate,
             u.firstName + ' ' + u.lastName AS UserName, u.email
      FROM AR_MessageReactions mr
      JOIN AR_Users u ON u.userId = mr.UserID
      WHERE mr.MessageID IN (${messageIdsString})
      ORDER BY mr.CreatedDate ASC
    `;
    
    const result = await pool.request().query(query);
    
    // Organizza i risultati per messageId
    if (result.recordset && result.recordset.length > 0) {
      result.recordset.forEach(reaction => {
        const messageId = reaction.MessageID;
        
        if (!reactionsMap[messageId]) {
          reactionsMap[messageId] = [];
        }
        
        reactionsMap[messageId].push(reaction);
      });
    }
    
    return {
      reactions: reactionsMap,
      processedCount: messageIdsToProcess.length,
      totalRequested: messageIds.length
    };
  } catch (error) {
    console.error('Error getting batch reactions:', error);
    throw error;
  }
}

/**
 * Recupera i sondaggi per più messaggi in batch
 * @param {number} notificationId - ID della notifica
 * @param {Array<number>} messageIds - Array di ID dei messaggi
 * @param {number} userId - ID dell'utente
 * @returns {Promise<Object>} - Mappa dei sondaggi per messageId
 */
async function getBatchPolls(notificationId, messageIds, userId) {
  try {
    // Verifica che messageIds sia un array valido
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      throw new Error('Parametro messageIds non valido o vuoto');
    }
    
    // Ottieni tutti i sondaggi per questa notifica
    const polls = await getNotificationPolls(notificationId, userId);
    
    if (!polls || polls.length === 0) {
      return {
        polls: {}
      };
    }
    
    // Crea una mappa di sondaggi per messageId
    const pollsMap = {};
    
    // Filtra i sondaggi richiesti
    polls.forEach(poll => {
      if (messageIds.includes(poll.MessageID)) {
        pollsMap[poll.MessageID] = poll;
      }
    });
    
    return {
      polls: pollsMap
    };
  } catch (error) {
    console.error('Error getting batch polls:', error);
    throw error;
  }
}

/**
 * Rimuove un utente da una chat
 * @param {number} notificationId - ID della notifica/chat
 * @param {number} adminUserId - ID dell'utente che sta rimuovendo
 * @param {number} userToRemoveId - ID dell'utente da rimuovere
 * @returns {Promise<Object>} - Risultato dell'operazione
 */
async function removeUserFromChat(notificationId, adminUserId, userToRemoveId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .input('adminUserId', sql.Int, adminUserId)
      .input('userToRemoveId', sql.Int, userToRemoveId)
      .execute('RemoveUserFromChat');
    
    return result.recordset[0];
  } catch (err) {
    console.error('Error removing user from chat:', err);
    throw err;
  }
}

module.exports = {
  getNotifications,
  getUserNotifications,
  getNotificationById,
  getNotificationResponseOptions,
  markNotificationAsReceived,
  markNotificationAsRead,
  togglePinned,
  toggleFavorite, 
  closeChat,
  reopenChat,
  leaveChat,
  sendNotification,
  createDBNotificationsView,
  setMessageColor,
  clearMessageColor,
  filterMessages,
  addConversationHighlight,
  removeConversationHighlight,
  getConversationHighlights,
  generateConversationSummary,
  createPoll,
  votePoll,
  getPoll,
  getNotificationPolls,
  closePoll,
  archiveChat,
  unarchiveChat,
  updateChatTitle,
  editMessage,
  getMessageVersionHistory,
  toggleMuteChat,
  toggleDoNotDisturb,
  getDoNotDisturbStatus,
  getRelatedMessageIds,
  getMessageReactions,
  addMessageReaction,
  getReactionInfo,
  removeMessageReaction,
  getNotificationIdForMessage,
  deleteMessage,
  getBatchReactions,
  getBatchPolls,
  removeUserFromChat
  

};