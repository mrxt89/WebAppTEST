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
let lastDataHash = null; // NUOVO: Per controllare se i dati sono effettivamente cambiati

// Constants
const POLLING_INTERVAL = 15000; // 15 secondi per il polling normale
const FORCED_REFRESH_INTERVAL = 1000; // 1 secondo per refresh forzati
const REQUEST_TIMEOUT = 30000;
const MIN_INTERVAL_BETWEEN_REQUESTS = 5000; // Minimo 5 secondi tra richieste

let lastRequestTime = 0;

function logError(...args) {
  const timestamp = new Date().toISOString();
  console.error(`[NotificationWorker ERROR ${timestamp}]`, ...args);
}

function logDebug(...args) {
  if (debugEnabled) {
    const timestamp = new Date().toISOString();
    console.log(`[NotificationWorker DEBUG ${timestamp}]`, ...args);
  }
}

// Funzione per creare un hash semplice dei dati per confronto
function createDataHash(data) {
  if (!data) return null;
  
  if (data.notifications && data.unreadCount !== undefined) {
    // Per dati paginati
    const key = `${data.unreadCount}_${data.notifications.length}`;
    const firstNotifs = data.notifications.slice(0, 5).map(n => 
      `${n.notificationId}_${n.lastMessage}_${n.messageCount}_${n.isReadByUser}`
    ).join('|');
    return `${key}_${firstNotifs}`;
  } else if (Array.isArray(data)) {
    // Per array di notifiche
    return data.slice(0, 5).map(n => 
      `${n.notificationId}_${n.lastMessage}_${n.messageCount}_${n.isReadByUser}`
    ).join('|');
  }
  
  return null;
}

// MODIFICA: Gestione migliorata per i cambiamenti
function haveNotificationsChanged(newData) {
  // Crea hash dei nuovi dati
  const newHash = createDataHash(newData);
  
  // Se l'hash è uguale, non ci sono cambiamenti
  if (lastDataHash && newHash === lastDataHash) {
    logDebug("Nessun cambiamento rilevato (hash identico)");
    return false;
  }
  
  // Salva il nuovo hash
  lastDataHash = newHash;
  
  // Se è una risposta paginata
  if (newData.notifications && newData.unreadCount !== undefined) {
    // Controlla il contatore unread
    if (lastUnreadCount !== null && lastUnreadCount !== newData.unreadCount) {
      logDebug(`UnreadCount cambiato: ${lastUnreadCount} -> ${newData.unreadCount}`);
      lastUnreadCount = newData.unreadCount;
      return true;
    }
    
    // Prima volta
    if (lastUnreadCount === null) {
      lastUnreadCount = newData.unreadCount;
      return true;
    }
    
    // Controlla cambiamenti nelle notifiche
    const newNotifications = newData.notifications || [];
    
    if (!notificationCache || notificationCache.length === 0) {
      return true;
    }
    
    // Controlla solo cambiamenti strutturali importanti
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
  
  // Per array di notifiche (singola notifica)
  return true; // Sempre aggiorna per singole notifiche
}

async function fetchNotifications(notificationIdToFetch = null) {
  if (!isWorkerActive) {
    logDebug("Worker non attivo, skip fetch");
    return;
  }

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  // Controllo throttling più rigoroso
  if (timeSinceLastRequest < MIN_INTERVAL_BETWEEN_REQUESTS && !notificationIdToFetch && !forcedRefreshRequested) {
    logDebug(`Throttling: solo ${timeSinceLastRequest}ms dall'ultima richiesta`);
    scheduleNextFetch(POLLING_INTERVAL);
    return;
  }

  if (isRequestInProgress) {
    logDebug("Richiesta già in corso, skip");
    scheduleNextFetch(POLLING_INTERVAL);
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

    // Reset forced refresh flag
    forcedRefreshRequested = false;
    highPriorityUpdate = false;

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
    // Pianifica il prossimo fetch con l'intervallo normale
    scheduleNextFetch(POLLING_INTERVAL);
  }
}

function handlePaginatedUpdate(data) {
  if (!data.success) {
    throw new Error(data.error || "Failed to fetch notifications");
  }

  // Invia sempre il contatore unread
  self.postMessage({
    type: "unread_count_update",
    unreadCount: data.unreadCount,
    timestamp: Date.now(),
  });

  // Controlla se ci sono cambiamenti
  const hasChanges = haveNotificationsChanged(data);
  
  if (hasChanges) {
    logDebug("Cambiamenti rilevati, invio aggiornamento");
    
    if (data.notifications && data.notifications.length > 0) {
      // Controlla per nuovi messaggi
      checkForNewMessages(data.notifications);
      
      // Aggiorna cache
      notificationCache = data.notifications.slice(0, 20);
      
      // Invia aggiornamento
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
  
  // Sempre invia aggiornamenti per singole notifiche
  self.postMessage({
    type: "notifications",
    notifications: notifications,
    updateTime: Date.now(),
  });
}

function checkForNewMessages(notifications) {
  notificationsWithNewMessages.clear();
  
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
    }
  });
  
  if (notificationsWithNewMessages.size > 0) {
    handleNewMessages(notifications);
  }
}

function handleNewMessages(notifications) {
  const closedChatMessages = [];

  notifications
    .filter(notification => notificationsWithNewMessages.has(notification.notificationId))
    .forEach(notification => {
      // Skip se è una chat aperta
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

      // Skip messaggi propri
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
    self.postMessage({
      type: "new_message",
      newMessagesInfo: closedChatMessages,
      timestamp: Date.now(),
    });
  }
}

function scheduleNextFetch(interval = POLLING_INTERVAL) {
  if (!isWorkerActive) {
    logDebug("Worker non attivo, no scheduling");
    return;
  }

  // Cancella timeout esistente
  if (pollingTimeout) {
    clearTimeout(pollingTimeout);
    pollingTimeout = null;
  }

  // Usa l'intervallo appropriato
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

        logDebug("Worker inizializzato con userId:", currentUserId);

        // Prima fetch immediata
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

        // Fetch immediata per reload
        if (pollingTimeout) {
          clearTimeout(pollingTimeout);
        }
        fetchNotifications();
        break;

      case "fetch_notification":
        token = data.token || token;
        apiBaseUrl = data.apiBaseUrl || apiBaseUrl;
        currentUserId = data.userId || currentUserId;

        // Fetch immediata per notifica specifica
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
          currentUserId: currentUserId
        });
        break;

      default:
        logError("Unknown message type:", type);
    }
  }
};

self.postMessage({ type: "ready", timestamp: Date.now() });