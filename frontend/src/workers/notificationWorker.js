// src/workers/notificationWorker.js

// Worker state
let token = null;
let apiBaseUrl = null;
let currentUserId = null;
let isRequestInProgress = false;
let pollingTimeout = null;
let lastUpdateTime = Date.now();
let notificationCache = [];
let forcedRefreshRequested = false;
let highPriorityUpdate = false;
let debugEnabled = false;
let isWorkerActive = true;
let openChatIds = new Set();
let recentNotifications = new Set();
let notificationsWithNewMessages = new Set();
let lastUnreadCount = null;
let lastDataHash = null;

// IMPORTANTE: Aggiungi variabile per tracciare l'ultimo unreadCount valido
let lastValidUnreadCount = 0;

// Constants
const POLLING_INTERVAL = 15000;
const FORCED_REFRESH_INTERVAL = 1000;
const REQUEST_TIMEOUT = 30000;
const MIN_INTERVAL_BETWEEN_REQUESTS = 5000;

let lastRequestTime = 0;

function logError(...args) {
  const timestamp = new Date().toISOString();
  console.error(`[Worker ${timestamp}]`, ...args);
}

function logDebug(...args) {
  if (debugEnabled) {
    const timestamp = new Date().toISOString();
  }
}

// Funzione per creare un hash semplice dei dati per confronto
function createDataHash(data) {
  if (!data) return null;
  
  if (data.notifications && data.unreadCount !== undefined) {
    const key = `${data.unreadCount}_${data.notifications.length}`;
    const firstNotifs = data.notifications.slice(0, 5).map(n => 
      `${n.notificationId}_${n.lastMessage}_${n.messageCount}_${n.isReadByUser}`
    ).join('|');
    return `${key}_${firstNotifs}`;
  } else if (Array.isArray(data)) {
    return data.slice(0, 5).map(n => 
      `${n.notificationId}_${n.lastMessage}_${n.messageCount}_${n.isReadByUser}`
    ).join('|');
  }
  
  return null;
}

// MODIFICA: Gestione migliorata per i cambiamenti
function haveNotificationsChanged(newData) {
  const newHash = createDataHash(newData);
  
  if (lastDataHash && newHash === lastDataHash) {
    logDebug("Nessun cambiamento rilevato (hash identico)");
    return false;
  }
  
  lastDataHash = newHash;
  
  if (newData.notifications && newData.unreadCount !== undefined) {
    // IMPORTANTE: Salva sempre l'ultimo unreadCount valido
    if (typeof newData.unreadCount === 'number' && newData.unreadCount >= 0) {
      lastValidUnreadCount = newData.unreadCount;
    }
    
    if (lastUnreadCount !== null && lastUnreadCount !== newData.unreadCount) {
      logDebug(`UnreadCount cambiato: ${lastUnreadCount} -> ${newData.unreadCount}`);
      lastUnreadCount = newData.unreadCount;
      return true;
    }
    
    if (lastUnreadCount === null) {
      lastUnreadCount = newData.unreadCount;
      return true;
    }
    
    const newNotifications = newData.notifications || [];
    
    if (!notificationCache || notificationCache.length === 0) {
      return true;
    }
    
    for (let i = 0; i < Math.min(10, newNotifications.length); i++) {
      const newNotif = newNotifications[i];
      const cachedNotif = notificationCache[i];
      
      if (!cachedNotif || cachedNotif.notificationId !== newNotif.notificationId) {
        return true;
      }
      
      if (newNotif.lastMessage !== cachedNotif.lastMessage ||
          newNotif.messageCount !== cachedNotif.messageCount) {
        return true;
      }
    }
    
    return false;
  }
  
  return true;
}

async function fetchNotifications(notificationIdToFetch = null) {
  if (!isWorkerActive) {
    logDebug("Worker non attivo, skip fetch");
    return;
  }

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_INTERVAL_BETWEEN_REQUESTS && !notificationIdToFetch && !forcedRefreshRequested) {
    logDebug(`Throttling: solo ${timeSinceLastRequest}ms dall'ultima richiesta`);
    // Non programmare il prossimo fetch se siamo in throttling
    return;
  }

  if (isRequestInProgress) {
    logDebug("Richiesta già in corso, skip");
    // Non programmare il prossimo fetch se c'è già una richiesta in corso
    return;
  }

  lastRequestTime = now;
  isRequestInProgress = true;

  try {
    let url = `${apiBaseUrl}/notifications`;

    if (notificationIdToFetch) {
      url = `${apiBaseUrl}/notifications/${notificationIdToFetch}?openChat=true&allMessages=true&t=${Date.now()}`;
      logDebug(`Caricando chat specifica ${notificationIdToFetch}`);
    } else {
      url = `${apiBaseUrl}/notifications/paginated?page=1&pageSize=20`;
      logDebug("Caricando notifiche paginate");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store",
        Pragma: "no-cache",
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        logError(`Auth error: ${response.status}`);
        self.postMessage({
          type: "auth_error",
          error: "Session expired",
        });
        isWorkerActive = false;
        return;
      }
      throw new Error(`Network response was not ok: ${response.status}`);
    }

    const data = await response.json();

    if (notificationIdToFetch) {
      handleSingleNotificationUpdate(data, notificationIdToFetch);
    } else {
      handlePaginatedUpdate(data);
    }

    // Reset dei flag solo se la richiesta è andata a buon fine
    if (isWorkerActive) {
      forcedRefreshRequested = false;
      highPriorityUpdate = false;
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      logDebug('Request timeout');
    } else {
      logError('Error fetching notifications:', error);
    }
    
    self.postMessage({
      type: "error",
      error: error.message,
    });
  } finally {
    isRequestInProgress = false;
    
    // Solo se il worker è ancora attivo e non c'è un refresh forzato in corso
    if (isWorkerActive && !forcedRefreshRequested) {
      scheduleNextFetch(POLLING_INTERVAL);
    }
  }
}

function handlePaginatedUpdate(data) {
  if (!data.success) {
    throw new Error(data.error || "Failed to fetch notifications");
  }

  // IMPORTANTE: Il backend ritorna sempre il contatore totale corretto
  // Non dobbiamo ricalcolarlo localmente!
  if (typeof data.unreadCount === 'number' && data.unreadCount >= 0) {
    lastValidUnreadCount = data.unreadCount;
    
    // Invia sempre il contatore unread aggiornato
    self.postMessage({
      type: "unread_count_update",
      unreadCount: data.unreadCount,
      timestamp: Date.now(),
    });
    
    logDebug(`UnreadCount aggiornato a: ${data.unreadCount}`);
  } else {
    logError(`UnreadCount non valido ricevuto: ${data.unreadCount}, usando ultimo valido: ${lastValidUnreadCount}`);
    
    // Usa l'ultimo valore valido
    self.postMessage({
      type: "unread_count_update",
      unreadCount: lastValidUnreadCount,
      timestamp: Date.now(),
    });
  }

  const hasChanges = haveNotificationsChanged(data);
  
  if (hasChanges) {
    logDebug("Cambiamenti rilevati, invio aggiornamento");
    
    if (data.notifications && data.notifications.length > 0) {
      // IMPORTANTE: Non ricalcolare il contatore qui!
      // Il backend già fornisce il contatore totale corretto
      checkForNewMessages(data.notifications, false); // Passa false per non ricalcolare
      notificationCache = data.notifications.slice(0, 20);
      
      self.postMessage({
        type: "partial_notifications_update", 
        notifications: data.notifications,
        metadata: data.metadata,
        updateTime: Date.now(),
      });
    }
  } else {
    logDebug("Nessun cambiamento, skip aggiornamento");
  }
}

function handleSingleNotificationUpdate(notification, notificationIdToFetch) {
  const messageCount = Array.isArray(notification.messages) 
    ? notification.messages.length 
    : (typeof notification.messages === "string" ? JSON.parse(notification.messages || "[]").length : 0);
  
  logDebug(`Ricevuti ${messageCount} messaggi per chat ${notificationIdToFetch}`);
  
  const notifications = [notification];
  
  self.postMessage({
    type: "notifications",
    notifications: notifications,
    updateTime: Date.now(),
  });
}

function checkForNewMessages(notifications, shouldRecalculateCount = true) {
  notificationsWithNewMessages.clear();
  
  // NON ricalcolare il contatore se non richiesto
  // Il backend fornisce già il contatore totale corretto
  if (!shouldRecalculateCount) {
    notifications.forEach(notification => {
      const cachedNotif = notificationCache.find(n => n.notificationId === notification.notificationId);
      
      if (cachedNotif) {
        const newMsgCount = notification.messageCount || 0;
        const cachedMsgCount = cachedNotif.messageCount || 0;
        const newLastMessage = new Date(notification.lastMessage);
        const cachedLastMessage = new Date(cachedNotif.lastMessage);
        
        if (newLastMessage > cachedLastMessage || newMsgCount > cachedMsgCount) {
          notificationsWithNewMessages.add(notification.notificationId);
        }
      } else {
        // Nuova notifica
        if (!notification.isReadByUser && !openChatIds.has(notification.notificationId)) {
          notificationsWithNewMessages.add(notification.notificationId);
        }
      }
    });
    
    if (notificationsWithNewMessages.size > 0) {
      handleNewMessages(notifications);
    }
    return;
  }
  
  // Codice originale per quando è richiesto il ricalcolo
  let newUnreadCount = 0;
  
  notifications.forEach(notification => {
    // Conta le notifiche non lette e non archiviate
    if (!notification.isReadByUser && notification.archived !== 1 && notification.archived !== "1") {
      newUnreadCount++;
    }
    
    const cachedNotif = notificationCache.find(n => n.notificationId === notification.notificationId);
    
    if (cachedNotif) {
      const newMsgCount = notification.messageCount || 0;
      const cachedMsgCount = cachedNotif.messageCount || 0;
      const newLastMessage = new Date(notification.lastMessage);
      const cachedLastMessage = new Date(cachedNotif.lastMessage);
      
      if (newLastMessage > cachedLastMessage || newMsgCount > cachedMsgCount) {
        notificationsWithNewMessages.add(notification.notificationId);
        
        // Se la notifica non era letta prima e ha nuovi messaggi, incrementa il contatore
        if (!notification.isReadByUser && !openChatIds.has(notification.notificationId)) {
          logDebug(`Nuovi messaggi per notifica non letta ${notification.notificationId}`);
        }
      }
    } else {
      // Nuova notifica
      if (!notification.isReadByUser && !openChatIds.has(notification.notificationId)) {
        notificationsWithNewMessages.add(notification.notificationId);
      }
    }
  });
  
  // Aggiorna il contatore unread se necessario
  if (newUnreadCount !== lastValidUnreadCount) {
    logDebug(`Aggiornamento unreadCount da checkForNewMessages: ${lastValidUnreadCount} -> ${newUnreadCount}`);
    lastValidUnreadCount = newUnreadCount;
    
    self.postMessage({
      type: "unread_count_update",
      unreadCount: newUnreadCount,
      timestamp: Date.now(),
    });
  }
  
  if (notificationsWithNewMessages.size > 0) {
    handleNewMessages(notifications);
  }
}

function handleNewMessages(notifications) {
  const closedChatMessages = [];

  notifications
    .filter(notification => notificationsWithNewMessages.has(notification.notificationId))
    .forEach(notification => {
      if (openChatIds.has(notification.notificationId)) {
        return;
      }

      let senderName = "Unknown";
      let messagePreview = "Nuovo messaggio";
      let senderId = null;

      try {
        const messages = Array.isArray(notification.messages)
          ? notification.messages
          : JSON.parse(notification.messages || "[]");

        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          senderName = lastMessage.senderName || notification.title || "Unknown";
          messagePreview = lastMessage.message || "Nuovo messaggio";
          senderId = lastMessage.senderId || null;
        }
      } catch (e) {
        logError(`Error parsing messages:`, e);
      }

      const isOwnMessage = currentUserId && senderId && 
                          (senderId === currentUserId || 
                           senderId.toString() === currentUserId.toString());

      if (!isOwnMessage) {
        closedChatMessages.push({
          notificationId: notification.notificationId,
          senderName,
          messagePreview,
          senderId
        });
      }
    });

  if (closedChatMessages.length > 0) {
    // IMPORTANTE: Quando ci sono nuovi messaggi, il backend ha già calcolato il nuovo unreadCount
    // Non dobbiamo incrementarlo noi, ma usare quello fornito dal backend
    logDebug(`Nuovi messaggi per ${closedChatMessages.length} chat chiuse. UnreadCount corrente: ${lastValidUnreadCount}`);
    
    self.postMessage({
      type: "new_message",
      newMessagesInfo: closedChatMessages,
      timestamp: Date.now(),
      // Rimuovi expectedUnreadCount - lascia che sia il backend a gestire il contatore
    });
  }
}

function scheduleNextFetch(interval = POLLING_INTERVAL) {
  if (!isWorkerActive) {
    logDebug("Worker non attivo, no scheduling");
    return;
  }

  if (pollingTimeout) {
    clearTimeout(pollingTimeout);
    pollingTimeout = null;
  }

  const actualInterval = forcedRefreshRequested ? FORCED_REFRESH_INTERVAL : interval;
  
  logDebug(`Prossimo fetch tra ${actualInterval}ms`);
  
  pollingTimeout = setTimeout(() => {
    if (isWorkerActive) {
      fetchNotifications();
    }
  }, actualInterval);
}

// Message handler
self.onmessage = (event) => {
  if (event.data) {
    const { type, data } = event.data;

    switch (type) {
      case "init":
        token = data.token;
        apiBaseUrl = data.apiBaseUrl;
        currentUserId = data.userId;
        isWorkerActive = true;
        debugEnabled = data.debug || false;
        
        // Reset dei contatori all'inizializzazione
        lastUnreadCount = null;
        lastValidUnreadCount = 0;

        logDebug("Worker inizializzato con userId:", currentUserId);

        fetchNotifications();
        break;

      case "update_open_chats":
        if (data.openChatIds) {
          openChatIds = new Set(data.openChatIds);
          logDebug("Chat aperte aggiornate:", Array.from(openChatIds));
        }
        break;

      case "stop":
        logDebug("Ricevuto comando stop");
        isWorkerActive = false;
        if (pollingTimeout) {
          clearTimeout(pollingTimeout);
          pollingTimeout = null;
        }
        break;

      case "reload":
        token = data.token || token;
        apiBaseUrl = data.apiBaseUrl || apiBaseUrl;
        currentUserId = data.userId || currentUserId;
        forcedRefreshRequested = true;
        highPriorityUpdate = data.highPriority || false;

        if (pollingTimeout) {
          clearTimeout(pollingTimeout);
        }
        fetchNotifications();
        break;

      case "fetch_notification":
        token = data.token || token;
        apiBaseUrl = data.apiBaseUrl || apiBaseUrl;
        currentUserId = data.userId || currentUserId;

        if (pollingTimeout) {
          clearTimeout(pollingTimeout);
        }
        fetchNotifications(data.notificationId);
        break;

      case "update_user":
        currentUserId = data.userId;
        logDebug("UserId aggiornato a:", currentUserId);
        break;

      case "debug":
        debugEnabled = data.enabled;
        break;

      case "ping":
        self.postMessage({
          type: "pong",
          timestamp: Date.now(),
          lastUpdateTime,
          isActive: isWorkerActive,
          currentUserId: currentUserId,
          currentUnreadCount: lastValidUnreadCount
        });
        break;

      default:
        logError("Unknown message type:", type);
    }
  }
};

self.postMessage({ type: "ready", timestamp: Date.now() });