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

// Nuova funzione per notifiche paginate
async function getUserNotificationsPaginated(userId, options = {}) {
  const {
    pageNumber = 1,
    pageSize = 20,
    searchText = null,
    filterArchived = false,
    filterFavorites = false,
    filterMuted = false,
    filterUnreadOnly = false,
    categoryId = null,
    filterMentioned = false,
    filterMessagesSent = false,
    filterLeftChats = false,
    completedFilter = 'all' // completed, all, active
  } = options;

  try {
    let pool = await sql.connect(config.dbConfig);
    let request = pool.request()
      .input('userId', sql.Int, userId)
      .input('PageNumber', sql.Int, pageNumber)
      .input('PageSize', sql.Int, pageSize)
      .input('SearchText', sql.NVarChar(255), searchText)
      .input('FilterArchived', sql.Bit, filterArchived)
      .input('FilterFavorites', sql.Bit, filterFavorites)
      .input('FilterMuted', sql.Bit, filterMuted)
      .input('FilterUnreadOnly', sql.Bit, filterUnreadOnly)
      .input('CategoryId', sql.Int, categoryId)
      .input('FilterMentioned', sql.Bit, filterMentioned)
      .input('FilterMessagesSent', sql.Bit, filterMessagesSent)
      .input('FilterLeftChats', sql.Bit, filterLeftChats)
      .input('CompletedFilter', sql.NVarChar(255), completedFilter);
    
    let result = await request.execute('GetUserNotificationsPaginated');
    
    // Estrai i tre set di risultati
    const unreadCount = result.recordsets[0][0].totalUnreadCount;
    const notifications = result.recordsets[1].map(notification => {
      if (notification.messages) {
        notification.messages = typeof notification.messages === 'string' 
          ? JSON.parse(notification.messages) 
          : notification.messages;
      }
      return notification;
    });
    const metadata = result.recordsets[2][0];
    
    return {
      unreadCount,
      notifications,
      metadata
    };
  } catch (err) {
    console.error('Error fetching paginated notifications:', err);
    throw err;
  }
}

async function getUserNotifications(userId, searchText = null) {
  try {
    let pool = await sql.connect(config.dbConfig);
    let request = pool.request()
      .input('userId', sql.Int, userId)
      .input('notificationId', sql.Int, 0)
      .input('OpenChat', sql.Bit, 0);
    
    // Aggiungi searchText se fornito
    if (searchText && searchText.trim() !== '') {
      request.input('SearchText', sql.NVarChar(255), searchText.trim());
    }
    
    let result = await request.execute('GetUserNotificationsWithMessages');
    
    // Parsa i JSON fields per ogni notifica
    return result.recordset.map(notification => {
      if (notification.messages) {
        notification.messages = typeof notification.messages === 'string' 
          ? JSON.parse(notification.messages) 
          : notification.messages;
      }
      if (notification.membersInfo) {
        notification.membersInfo = typeof notification.membersInfo === 'string' 
          ? JSON.parse(notification.membersInfo) 
          : notification.membersInfo;
      }
      return notification;
    });
  } catch (err) {
    console.error('Error fetching user notifications:', err);
    throw err;
  }
}

async function getNotificationById(userId, notificationId, isOpenChat = true, pageSize = null, lastMessageId = null, searchText = null) {
  try {
    let pool = await sql.connect(config.dbConfig);
    let request = pool.request()
      .input('userId', sql.Int, userId)
      .input('notificationId', sql.Int, notificationId)
      .input('OpenChat', sql.Bit, isOpenChat ? 1 : 0);
    
    // Aggiungi parametri di paginazione se forniti
    if (pageSize !== null && pageSize !== undefined) {
      request.input('PageSize', sql.Int, pageSize);
    }
    
    if (lastMessageId !== null && lastMessageId !== undefined) {
      request.input('LastMessageId', sql.Int, lastMessageId);
    }
    
    // Aggiungi searchText se fornito
    if (searchText && searchText.trim() !== '') {
      request.input('SearchText', sql.NVarChar(255), searchText.trim());
    }
    
    let result = await request.execute('GetUserNotificationsWithMessages');
    
    if (result.recordset.length === 0) {
      return null;
    }
    
    const notification = result.recordset[0];
    
    // Parsa i JSON fields
    if (notification.messages) {
      notification.messages = typeof notification.messages === 'string' 
        ? JSON.parse(notification.messages) 
        : notification.messages;
    }
    if (notification.membersInfo) {
      notification.membersInfo = typeof notification.membersInfo === 'string' 
        ? JSON.parse(notification.membersInfo) 
        : notification.membersInfo;
    }
    
    // Processa anche i campi nelle reazioni dei messaggi se presenti
    if (notification.messages && Array.isArray(notification.messages)) {
      notification.messages = notification.messages.map(msg => {
        if (msg.reactions && typeof msg.reactions === 'string') {
          try {
            msg.reactions = JSON.parse(msg.reactions);
          } catch (e) {
            msg.reactions = [];
          }
        }
        if (msg.readByUsers && typeof msg.readByUsers === 'string') {
          try {
            msg.readByUsers = JSON.parse(msg.readByUsers);
          } catch (e) {
            msg.readByUsers = [];
          }
        }
        return msg;
      });
    }
    
    return notification;
  } catch (err) {
    console.error('Error fetching notification:', err);
    throw err;
  }
}

// Nuova funzione per ricerca avanzata
async function searchInNotifications(userId, searchText, notificationId = null, pageSize = 50, lastMessageId = null) {
  try {
    if (!searchText || searchText.trim() === '') {
      throw new Error('SearchText è obbligatorio');
    }
    
    if (notificationId) {
      // Ricerca in una notifica specifica
      return await getNotificationById(userId, notificationId, true, pageSize, lastMessageId, searchText);
    } else {
      // Ricerca in tutte le notifiche
      return await getUserNotifications(userId, searchText);
    }
  } catch (err) {
    console.error('Error searching in notifications:', err);
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
    throw err;
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
        UPDATE AR_NotificationDetails WITH (ROWLOCK)
        SET received = 1
        WHERE notificationId = @notificationId 
          AND receiverId = @userId 
          AND messageId <= @messageId
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
        UPDATE AR_NotificationDetails WITH (ROWLOCK)
        SET   isReadByUser = @isReadByUser
              , isReadByReceiver = CASE 
                WHEN @isReadByUser = 1 AND isReadByReceiver = 0 THEN 1 
                ELSE isReadByReceiver 
                END
              , ReceiverReadedDate = CASE 
                WHEN @isReadByUser = 1 AND isReadByReceiver = 0 THEN GETDATE() 
                ELSE ReceiverReadedDate 
                END
              , received = 1
        WHERE notificationId = @notificationId 
          AND receiverId = @userId;

        UPDATE AR_Users 
        SET LastOnline = GETDATE() 
        WHERE UserId = @userId;
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
        UPDATE AR_NotificationDetails WITH (ROWLOCK)
        SET pinned = @pinned
        WHERE notificationId = @notificationId 
          AND receiverId = @userId
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
        UPDATE AR_NotificationDetails WITH (ROWLOCK)
        SET favorite = @favorite
        WHERE notificationId = @notificationId 
          AND receiverId = @userId
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
    const cleanMessage = message.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    let request = pool.request()
    .input('userId', sql.Int, userId)
    .input('notificationId', sql.Int, notificationId)
    .input('message', sql.NVarChar(sql.MAX), cleanMessage)
    .input('responseOptionId', sql.Int, responseOptionId)
    .input('eventId', sql.Int, eventId)
    .input('replyToMessageId', sql.Int, replyToMessageId)
    .input('SkipReturnInfo', sql.Int, 0);
    
    if (title) request.input('title', sql.NVarChar(sql.MAX), title);
    if (notificationCategoryId) request.input('notificationCategoryId', sql.Int, notificationCategoryId);
    if (receiversList) request.input('receiversList', sql.VarChar, receiversList);
    if (pollId) request.input('pollId', sql.Int, pollId);
    
    let result = await request.execute('SendNotification');

    // IMPORTANTE: Recupera il messageId appena creato
    const finalNotificationId = notificationId || result.recordset[0].notificationId;
    
    // Query per ottenere l'ultimo messaggio inviato dall'utente
    let messageResult = await pool.request()
      .input('notificationId', sql.Int, finalNotificationId)
      .input('userId', sql.Int, userId)
      .input('message', sql.NVarChar(sql.MAX), cleanMessage)
      .query(`
        SELECT TOP 1 
              messageId
              , message
              , senderId
              , (SELECT firstName + ' ' + lastName FROM AR_Users (NOLOCK) WHERE userId = T0.senderId) AS senderName
              , tbCreated
              , replyToMessageId
        FROM AR_NotificationDetails T0
        JOIN AR_Users T1 ON T0.senderId = T1.userId
        WHERE notificationId = @notificationId 
          AND senderId = @userId 
          AND message = @message
        ORDER BY messageId DESC
      `);

    let createdMessageId = null;
    let createdMessage = null;
    
    if (messageResult.recordset.length > 0) {
      createdMessageId = messageResult.recordset[0].messageId;
      createdMessage = messageResult.recordset[0];
    }

    // Recupera i dati aggiornati
    let updatedResult = await pool.request()
      .input('userId', sql.Int, userId)
      .input('notificationId', sql.Int, finalNotificationId)
      .input('OpenChat', sql.Bit, 1)
      .execute('GetUserNotificationsWithMessages');
    
    if (updatedResult.recordset.length > 0) {
      const notification = updatedResult.recordset[0];
      
      // Parsa i JSON fields
      let parsedMessages = [];
      try {
        parsedMessages = typeof notification.messages === 'string' 
          ? JSON.parse(notification.messages) 
          : notification.messages || [];
      } catch (err) {
        console.error('Error parsing messages:', err);
      }
      
      let parsedMembersInfo = [];
      try {
        parsedMembersInfo = typeof notification.membersInfo === 'string' 
          ? JSON.parse(notification.membersInfo) 
          : notification.membersInfo || [];
      } catch (err) {
        console.error('Error parsing membersInfo:', err);
      }

      return {
        success: true,
        msg: result.recordset[0].msg || 'Messaggio inviato',
        notificationId: notification.notificationId,
        notificationCategoryId: notification.notificationCategoryId,
        title: notification.title,
        messages: parsedMessages,
        membersInfo: parsedMembersInfo,
        isClosed: notification.isClosed,
        closingUser: notification.closingUser,
        closingDate: notification.closingDate,
        messageCount: parsedMessages.length,
        realMessageId: createdMessageId, // IMPORTANTE: Aggiungi il messageId reale
        lastMessage: createdMessage, // IMPORTANTE: Aggiungi il messaggio completo
        serverTimestamp: new Date().toISOString()
      };
    }
    
    // Fallback
    return {
      success: true,
      msg: result.recordset[0].msg || 'Messaggio inviato',
      notificationId: finalNotificationId,
      realMessageId: createdMessageId,
      lastMessage: createdMessage,
      serverTimestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('Error sending notification:', err);
    throw err;
  }
}

// DEPRECATA - Non più necessaria con la nuova vista
async function createDBNotificationsView(userId, notificationId = 0, allNotificationsByUser = 1, isOpenChat = false) {
  console.warn('createDBNotificationsView is deprecated. Use GetUserNotificationsWithMessages instead.');
  // Per retrocompatibilità, reindirizza a getUserNotifications
  try {
    if (notificationId && notificationId > 0) {
      // Se è richiesta una notifica specifica
      const notification = await getNotificationById(userId, notificationId, isOpenChat);
      return notification ? [notification] : [];
    } else {
      // Altrimenti ritorna tutte le notifiche
      return await getUserNotifications(userId);
    }
  } catch (err) {
    console.error('Error in createDBNotificationsView:', err);
    throw err;
  }
}

async function setMessageColor(messageId, userId, color) {
  try {
    if (!color || !color.startsWith('#') || color.length !== 7) {
      throw new Error('Formato colore non valido. Deve essere in formato #RRGGBB');
    }

    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('messageId', sql.Int, messageId)
      .input('userId', sql.Int, userId)
      .input('color', sql.NVarChar(7), color)
      .query(`
        UPDATE AR_NotificationDetails WITH (ROWLOCK)
        SET messageColor = @color
        WHERE messageId = @messageId 
          AND receiverId = @userId
      `);

    return { success: true };
  } catch (err) {
    console.error('Error setting message color:', err);
    throw err;
  }
}

async function clearMessageColor(messageId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('messageId', sql.Int, messageId)
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE AR_NotificationDetails WITH (ROWLOCK)
        SET messageColor = NULL
        WHERE messageId = @messageId 
          AND receiverId = @userId
      `);
    
    return { success: true };
  } catch (err) {
    console.error('Error clearing message color:', err);
    throw err;
  }
}

async function filterMessages(notificationId, userId, color, searchText) {
  try {
    if (!notificationId) {
      throw new Error('NotificationId è obbligatorio');
    }
    
    let pool = await sql.connect(config.dbConfig);
    let query = `
      SELECT nd.messageId, nd.message, nd.messageColor, nd.tbCreated, 
             u.firstName + ' ' + u.lastName AS senderName,
             CASE WHEN nd.senderId = @userId THEN 1 ELSE 0 END AS selectedUser
      FROM AR_NotificationDetails nd WITH (NOLOCK)
      JOIN AR_Users u WITH (NOLOCK) ON u.userId = nd.senderId
      WHERE nd.notificationId = @notificationId 
        AND nd.receiverId = @userId 
        AND nd.cancelled = 0
    `;
    
    const params = {
      notificationId: { type: sql.Int, value: notificationId },
      userId: { type: sql.Int, value: userId }
    };
    
    if (color && color.trim() !== '') {
      query += ` AND nd.messageColor = @color`;
      params.color = { type: sql.NVarChar(10), value: color };
    }
    
    if (searchText && searchText.trim() !== '') {
      query += ` AND (nd.message LIKE @searchText OR (u.firstName + ' ' + u.lastName) LIKE @searchText OR u.username LIKE @searchText)`;
      params.searchText = { type: sql.NVarChar(sql.MAX), value: `%${searchText}%` };
    }
    
    query += ` ORDER BY nd.tbCreated DESC`;
    
    const request = pool.request();
    
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

async function createPoll(notificationId, messageId, question, options, allowMultipleAnswers, userId, expirationDate) {
  try {
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
        UPDATE AR_NotificationDetails WITH (ROWLOCK)
        SET archived = 1
        WHERE notificationId = @notificationId 
          AND receiverId = @userId
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
        UPDATE AR_NotificationDetails WITH (ROWLOCK)
        SET archived = 0
        WHERE notificationId = @notificationId 
          AND receiverId = @userId
      `);

    return { success: true, message: 'Chat rimossa dall\'archivio con successo' };
  } catch (err) {
    console.error('Error unarchiving chat:', err);
    throw err;
  }
}

async function updateChatTitle(notificationId, userId, title) {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .input('title', sql.NVarChar(500), title)
      .query(`
        UPDATE AR_Notifications WITH (ROWLOCK)
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

async function getMessageVersionHistory(messageId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('messageId', sql.Int, messageId)
      .input('userId', sql.Int, userId)
      .execute('GetMessageVersionHistory');
    
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

async function toggleMuteChat(notificationId, userId, isMuted, expiryDate = null) {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .input('userId', sql.Int, userId)
      .input('isMuted', sql.Bit, isMuted)
      .input('expiryDate', sql.DateTime, expiryDate)
      .query(`
        UPDATE AR_NotificationDetails WITH (ROWLOCK)
        SET isMuted = @isMuted,
            muteExpiryDate = @expiryDate
        WHERE notificationId = @notificationId 
          AND receiverId = @userId
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

async function toggleDoNotDisturb(userId, enabled) {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('enabled', sql.Bit, enabled)
      .query(`
        UPDATE AR_Users WITH (ROWLOCK)
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

async function getDoNotDisturbStatus(userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT DoNotDisturb FROM AR_Users WITH (NOLOCK)
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

async function getRelatedMessageIds(messageId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    const messageInfoResult = await pool.request()
      .input('messageId', sql.Int, messageId)
      .query(`
        SELECT notificationId, senderId, message, tbCreated
        FROM AR_NotificationDetails WITH (NOLOCK)
        WHERE messageId = @messageId
      `);
    
    if (messageInfoResult.recordset.length === 0) {
      console.error(`Message with ID ${messageId} not found`);
      return [messageId];
    }
    
    const messageInfo = messageInfoResult.recordset[0];
    
    const relatedIdsResult = await pool.request()
      .input('notificationId', sql.Int, messageInfo.notificationId)
      .input('senderId', sql.Int, messageInfo.senderId)
      .input('message', sql.NVarChar(sql.MAX), messageInfo.message)
      .input('tbCreated', sql.DateTime, messageInfo.tbCreated)
      .query(`
        SELECT messageId
        FROM AR_NotificationDetails WITH (NOLOCK)
        WHERE notificationId = @notificationId
          AND senderId = @senderId
          AND message = @message
          AND tbCreated = @tbCreated
      `);
    
    const relatedIds = relatedIdsResult.recordset.map(row => row.messageId);
    
    return relatedIds;
  } catch (err) {
    console.error('Error getting related message IDs:', err);
    return [messageId];
  }
}

async function getMessageReactions(messageId) {
  try {
    const relatedMessageIds = await getRelatedMessageIds(messageId);
    
    if (relatedMessageIds.length === 0) {
      return [];
    }
    
    let pool = await sql.connect(config.dbConfig);
    
    let query = `
      SELECT mr.ReactionID, mr.MessageID, mr.UserID, mr.ReactionType, mr.CreatedDate,
             u.firstName + ' ' + u.lastName AS UserName, u.email
      FROM AR_MessageReactions mr WITH (NOLOCK)
      JOIN AR_Users u WITH (NOLOCK) ON u.userId = mr.UserID
      WHERE mr.MessageID IN (${relatedMessageIds.join(',')})
      ORDER BY mr.CreatedDate ASC
    `;
    
    const result = await pool.request().query(query);
    
    return result.recordset;
  } catch (err) {
    console.error('Error getting message reactions:', err);
    return [];
  }
}

async function addMessageReaction(messageId, userId, reactionType) {
  try {
   
    if (!messageId || !reactionType) {
      throw new Error('MessageId, userId e reactionType sono campi obbligatori');
    }
    
    const relatedMessageIds = await getRelatedMessageIds(messageId);
    
    let pool = await sql.connect(config.dbConfig);
    
    let existingReactionQuery = `
      SELECT ReactionID, MessageID, ReactionType
      FROM AR_MessageReactions WITH (NOLOCK)
      WHERE UserID = @userId AND MessageID IN (${relatedMessageIds.join(',')})
    `;
    
    const existingReactionResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(existingReactionQuery);
    
    if (existingReactionResult.recordset.length > 0) {
      const existingReaction = existingReactionResult.recordset[0];
      
      if (existingReaction.ReactionType === reactionType) {
        await pool.request()
          .input('reactionId', sql.Int, existingReaction.ReactionID)
          .query(`
            DELETE FROM AR_MessageReactions
            WHERE ReactionID = @reactionId
          `);
        
        const notificationResult = await pool.request()
          .input('messageId', sql.Int, messageId)
          .query(`
            SELECT notificationId
            FROM AR_NotificationDetails WITH (NOLOCK)
            WHERE messageId = @messageId
          `);
        
        let notificationId = null;
        if (notificationResult.recordset.length > 0) {
          notificationId = notificationResult.recordset[0].notificationId;
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
    
    // Recupera info messaggio, notifica e mittente originale
    const messageInfoResult = await pool.request()
      .input('messageId', sql.Int, messageId)
      .query(`
        SELECT nd.notificationId, nd.senderId as originalSender
        FROM AR_NotificationDetails nd WITH (NOLOCK)
        WHERE nd.messageId = @messageId
      `);
    
    let notificationId = null;
    let originalSender = null;

    if (messageInfoResult.recordset.length > 0) {
      notificationId = messageInfoResult.recordset[0].notificationId;
      originalSender = messageInfoResult.recordset[0].originalSender;
    }

    // Ottieni nome dell'utente che ha reagito
    const userResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT firstName + ' ' + lastName as userName
        FROM AR_Users WITH (NOLOCK)
        WHERE userId = @userId
      `);

    const userWhoReacted = userResult.recordset.length > 0
      ? userResult.recordset[0].userName
      : 'Utente';

    // Crea una notifica "fantasma" che appare solo nella sidebar
    // senderId = -1 indica che è una notifica di reazione (verrà cancellata automaticamente quando si apre la chat)
    if (originalSender && originalSender !== userId && notificationId) {
      try {
        // Inserisci un messaggio speciale per notifica reazione
        await pool.request()
          .input('notificationId', sql.Int, notificationId)
          .input('senderId', sql.Int, -1) // -1 = notifica reazione (flag speciale)
          .input('receiverId', sql.Int, originalSender)
          .input('message', sql.NVarChar(sql.MAX), `${userWhoReacted} ha reagito con ${reactionType}`)
          .input('responseOptionId', sql.Int, 0)
          .input('isReadByReceiver', sql.Bit, false)
          .query(`
            INSERT INTO AR_NotificationDetails
            (notificationId, senderId, receiverId, message, responseOptionId, isReadByReceiver, ReceiverReadedDate, chatLeft, archived, isMuted)
            VALUES
            (@notificationId, @senderId, @receiverId, @message, @responseOptionId, @isReadByReceiver, GETDATE(), 0, 0, 0)
          `);
      } catch (notifErr) {
        console.warn('Could not create reaction notification:', notifErr);
        // Non lanciamo errore, la reazione è stata comunque aggiunta
      }
    }

    return {
      success: true,
      message: 'Reazione aggiunta con successo',
      action: 'added',
      notificationId,
      originalSender,
      userWhoReacted: userId
    };
  } catch (err) {
    console.error('Error adding/toggling message reaction:', err);
    throw err;
  }
}

async function getReactionInfo(reactionId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('reactionId', sql.Int, reactionId)
      .query(`
        SELECT mr.ReactionID, mr.MessageID, mr.UserID, mr.ReactionType, mr.CreatedDate,
               nd.notificationId
        FROM AR_MessageReactions mr WITH (NOLOCK)
        JOIN AR_NotificationDetails nd WITH (NOLOCK) ON nd.messageId = mr.MessageID
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

async function removeMessageReaction(reactionId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    const checkResult = await pool.request()
      .input('reactionId', sql.Int, reactionId)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT mr.MessageID, nd.notificationId
        FROM AR_MessageReactions mr WITH (NOLOCK)
        JOIN AR_NotificationDetails nd WITH (NOLOCK) ON nd.messageId = mr.MessageID
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
    
    await pool.request()
      .input('reactionId', sql.Int, reactionId)
      .query(`
        DELETE FROM AR_MessageReactions
        WHERE ReactionID = @reactionId
      `);
    
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

async function getNotificationIdForMessage(messageId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('messageId', sql.Int, messageId)
      .query(`
        SELECT notificationId 
        FROM AR_NotificationDetails WITH (NOLOCK)
        WHERE messageId = @messageId
      `);
    
    return result.recordset[0] || null;
  } catch (error) {
    console.error('Error getting notificationId for message:', error);
    return null;
  }
}

async function deleteMessage(messageId, userId) {
  try {
    if (!messageId) {
      throw new Error('MessageId e userId sono campi obbligatori');
    }
    
    const relatedMessageIds = await getRelatedMessageIds(messageId);
    
    let pool = await sql.connect(config.dbConfig);
    
    const checkOwnershipResult = await pool.request()
      .input('messageId', sql.Int, messageId)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT messageId, notificationId, senderId
        FROM AR_NotificationDetails WITH (NOLOCK)
        WHERE messageId = @messageId AND senderId = @userId
      `);
    
    if (checkOwnershipResult.recordset.length === 0) {
      return {
        success: false,
        message: 'Non hai il permesso di eliminare questo messaggio'
      };
    }
    
    const notificationId = checkOwnershipResult.recordset[0].notificationId;
    
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('messageIds', sql.NVarChar(sql.MAX), relatedMessageIds.join(','))
      .query(`
        UPDATE AR_NotificationDetails WITH (ROWLOCK)
        SET cancelled = 1,
            message = 'Messaggio eliminato dall''utente'
        WHERE messageId IN (
          SELECT value FROM STRING_SPLIT(@messageIds, ',')
        ) 
        AND senderId = @userId
      `);
    
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

async function getBatchReactions(messageIds, userId) {
  try {
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      throw new Error('Parametro messageIds non valido o vuoto');
    }
    
    const MAX_MESSAGES = 50;
    const messageIdsToProcess = messageIds.slice(0, MAX_MESSAGES);
    
    const reactionsMap = {};
    
    let pool = await sql.connect(config.dbConfig);
    
    const messageIdsString = messageIdsToProcess.join(',');
    
    const query = `
DECLARE @userId INT = ${userId};

WITH MessaggiConRowNo AS (
    SELECT  
        messageId,
        message,
        tbCreated,
        ROW_NUMBER() OVER(PARTITION BY message, tbCreated ORDER BY (CASE WHEN receiverId = @userId THEN 1 ELSE 0 END) DESC) AS RowNo
    FROM AR_NotificationDetails WITH (NOLOCK)
    WHERE tbCreated IN (
        SELECT tbCreated
        FROM AR_NotificationDetails WITH (NOLOCK)
		WHERE messageId IN (${messageIdsString})
    )
),
MessaggiChiave AS (
    SELECT 
        tbCreated,
        message,
        messageId AS chiaveMessageId
    FROM MessaggiConRowNo
    WHERE RowNo = 1
)

SELECT mr.ReactionID
		, groupedMessageId AS MessageID
		, mr.UserID
		, mr.ReactionType
		, mr.CreatedDate
		, u.firstName + ' ' + u.lastName AS UserName
		, u.email
FROM	AR_MessageReactions mr WITH (NOLOCK)
JOIN	AR_Users u WITH (NOLOCK) ON u.userId = mr.UserID
JOIN	(SELECT	m.messageId,
					m.message,
					m.tbCreated,
					m.RowNo,
					k.chiaveMessageId AS groupedMessageId
			FROM MessaggiConRowNo m
			JOIN MessaggiChiave k
			ON m.tbCreated = k.tbCreated AND m.message = k.message ) tmp ON tmp.messageId = mr.MessageID
    `;
    
    const result = await pool.request().query(query);
    
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

async function getReadReceipts(messageId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('messageId', sql.Int, messageId)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT	DISTINCT
          CONCAT(TC.firstName, ' ', TC.lastName) AS Name
            , TA.isReadByReceiver
            , TA.ReceiverReadedDate
        FROM	AR_NotificationDetails (NOLOCK) TA
        JOIN	(	SELECT	DISTINCT notificationId, message, tbCreated
              FROM	AR_NotificationDetails (NOLOCK) T0
              WHERE	messageId = @messageId
            ) TB
        ON		TB.message = TA.message AND TB.tbCreated = TA.tbCreated AND TB.notificationId = TA.notificationId
        JOIN	AR_Users (NOLOCK) TC ON TC.userId = TA.receiverId
        WHERE	TA.receiverId != @userId
      `);

    return result.recordset;
  } catch (error) {
    console.error('Error getting read receipts:', error);
    throw error;
  }
}

async function getBatchPolls(notificationId, messageIds, userId) {
  try {
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      throw new Error('Parametro messageIds non valido o vuoto');
    }
    
    const polls = await getNotificationPolls(notificationId, userId);
    
    if (!polls || polls.length === 0) {
      return {
        polls: {}
      };
    }
    
    const pollsMap = {};
    
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

async function getChatParticipants(notificationId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .query(`
        SELECT DISTINCT 
          u.userId,
          u.firstName,
          u.lastName,
          u.username,
          u.lastOnline,
          u.email,
          u.phoneNumber,
          u.role,
          c.Description as companyName
        FROM AR_NotificationDetails nd WITH (NOLOCK)
        JOIN AR_Users u WITH (NOLOCK) ON u.userId = nd.receiverId
        LEFT JOIN AR_Companies c WITH (NOLOCK) ON c.CompanyId = u.CompanyId 
        WHERE nd.notificationId = @notificationId
          AND nd.chatLeft = 0
          AND u.userDisabled = 0
        ORDER BY u.firstName, u.lastName
      `);
    
    return result.recordset;
  } catch (err) {
    console.error('Error fetching chat participants:', err);
    throw err;
  }
}

// Cancella le notifiche reazione quando si apre la chat
// Restituisce anche le notifiche che sta cancellando per mostrarle come toast
async function clearReactionNotifications(notificationId, userId) {
  try {
    let pool = await sql.connect(config.dbConfig);

    // Prima recupera le notifiche reazione che verranno cancellate
    const reactionNotifs = await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT
          nd.messageId,
          nd.message,
          nd.tbCreated,
          -- Cerca di trovare il messaggio originale a cui si riferisce la reazione
          (
            SELECT TOP 1 message
            FROM AR_NotificationDetails orig
            WHERE orig.notificationId = nd.notificationId
              AND orig.senderId != -1
              AND orig.senderId = @userId
              AND orig.tbCreated <= nd.tbCreated
            ORDER BY orig.tbCreated DESC
          ) as originalMessage,
          -- ID del messaggio originale per lo scroll
          (
            SELECT TOP 1 messageId
            FROM AR_NotificationDetails orig
            WHERE orig.notificationId = nd.notificationId
              AND orig.senderId != -1
              AND orig.senderId = @userId
              AND orig.tbCreated <= nd.tbCreated
            ORDER BY orig.tbCreated DESC
          ) as originalMessageId
        FROM AR_NotificationDetails nd
        WHERE nd.notificationId = @notificationId
          AND nd.receiverId = @userId
          AND nd.senderId = -1
        ORDER BY nd.tbCreated DESC
      `);

    // Poi cancella tutti i messaggi con senderId = -1 (notifiche reazione)
    const result = await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .input('userId', sql.Int, userId)
      .query(`
        DELETE FROM AR_NotificationDetails
        WHERE notificationId = @notificationId
          AND receiverId = @userId
          AND senderId = -1
      `);

    return {
      success: true,
      deletedCount: result.rowsAffected[0],
      reactionNotifications: reactionNotifs.recordset || []
    };
  } catch (err) {
    console.error('Error clearing reaction notifications:', err);
    return {
      success: false,
      error: err.message,
      reactionNotifications: []
    };
  }
}

module.exports = {
  getNotifications,
  getUserNotifications,
  getUserNotificationsPaginated,
  searchInNotifications,
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
  removeUserFromChat,
  getChatParticipants,
  getReadReceipts,
  clearReactionNotifications
};