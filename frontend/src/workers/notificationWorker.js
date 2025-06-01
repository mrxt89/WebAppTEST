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
let debugEnabled = true;
let isOpenChat = false;
let isWorkerActive = true;
let openChatIds = new Set();
let recentNotifications = new Set();
let notificationsWithNewMessages = new Set();

// Constants
const POLLING_INTERVAL = 15000;
const FORCED_REFRESH_INTERVAL = 500;
const REQUEST_TIMEOUT = 30000;
const THROTTLE_INTERVAL = 4000;

let lastRequestTime = 0;

function logError(...args) {
  const timestamp = new Date().toISOString();
  console.error(`[NotificationWorker ERROR ${timestamp}]`, ...args);
}

// MODIFICA: Migliorata la gestione dei cambiamenti per le chat aperte
function haveNotificationsChanged(newNotifications) {
  notificationsWithNewMessages.clear();

  if (!notificationCache || notificationCache.length === 0) {
    return true;
  }

  if (newNotifications.length !== notificationCache.length) {
    return true;
  }

  let hasChanges = false;

  for (let i = 0; i < newNotifications.length; i++) {
    const newNotif = newNotifications[i];
    const cachedNotif = notificationCache.find(
      (n) => n.notificationId === newNotif.notificationId,
    );

    if (!cachedNotif) {
      hasChanges = true;
      continue;
    }

    const newMsgCount = newNotif.messageCount || 0;
    const cachedMsgCount = cachedNotif.messageCount || 0;
    const newLastMessageDate = new Date(newNotif.lastMessage);
    const cachedLastMessageDate = new Date(cachedNotif.lastMessage);

    // IMPORTANTE: Se la chat è aperta, controlla sempre per nuovi messaggi
    if (openChatIds.has(newNotif.notificationId)) {
      if (newLastMessageDate > cachedLastMessageDate || newMsgCount > cachedMsgCount) {
        console.log(`[Worker] Nuovi messaggi rilevati per chat aperta ${newNotif.notificationId}`);
        notificationsWithNewMessages.add(newNotif.notificationId);
        hasChanges = true;
      }
      newNotif.isReadByUser = true;
    } else if (newLastMessageDate > cachedLastMessageDate) {
      notificationsWithNewMessages.add(newNotif.notificationId);
      hasChanges = true;
    }

    if (newMsgCount > cachedMsgCount) {
      notificationsWithNewMessages.add(newNotif.notificationId);
      hasChanges = true;
    }

    if (newNotif.isReadByUser !== cachedNotif.isReadByUser) {
      hasChanges = true;
    }

    if (
      newNotif.pinned !== cachedNotif.pinned ||
      newNotif.favorite !== cachedNotif.favorite ||
      newNotif.archived !== cachedNotif.archived ||
      newNotif.isClosed !== cachedNotif.isClosed ||
      newNotif.isMuted !== cachedNotif.isMuted ||
      newNotif.lastMessage !== cachedNotif.lastMessage
    ) {
      hasChanges = true;
    }
  }

  if (forcedRefreshRequested) {
    forcedRefreshRequested = false;
    return true;
  }

  return hasChanges;
}

// MODIFICA: Migliore gestione delle chat aperte
async function fetchNotifications(notificationIdToFetch = null) {
  if (!isWorkerActive) {
    console.log("[Worker] Worker non attivo, skip fetch");
    return;
  }

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (
    timeSinceLastRequest < THROTTLE_INTERVAL &&
    !highPriorityUpdate &&
    !notificationIdToFetch
  ) {
    const waitTime = THROTTLE_INTERVAL - timeSinceLastRequest;
    if (pollingTimeout) {
      clearTimeout(pollingTimeout);
    }
    pollingTimeout = setTimeout(() => {
      if (isWorkerActive) {
        fetchNotifications();
      }
    }, waitTime);
    return;
  }

  if (isRequestInProgress) {
    scheduleNextFetch();
    return;
  }

  lastRequestTime = now;
  isRequestInProgress = true;

  try {
    let url = `${apiBaseUrl}/notifications`;

    if (notificationIdToFetch) {
      url = `${apiBaseUrl}/notifications/${notificationIdToFetch}?openChat=true&allMessages=true&t=${Date.now()}`;
      console.log(`🔄 Worker: Caricando dati completi per chat ${notificationIdToFetch}`);
    }

    const fetchPromise = fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store",
        Pragma: "no-cache",
      },
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), REQUEST_TIMEOUT);
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

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

    let notifications;

    if (notificationIdToFetch) {
      const notification = await response.json();
      const messageCount = Array.isArray(notification.messages) 
        ? notification.messages.length 
        : (typeof notification.messages === "string" ? JSON.parse(notification.messages || "[]").length : 0);
      
      console.log(`📨 Worker: Ricevuti ${messageCount} messaggi per chat ${notificationIdToFetch} (messageCount: ${notification.messageCount})`);
      
      notifications = [notification];
    } else {
      notifications = await response.json();
    }

    notifications.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.lastMessage) - new Date(a.lastMessage);
    });

    const hasChanges = haveNotificationsChanged(notifications);

    if (hasChanges || highPriorityUpdate || notificationIdToFetch) {
      if (highPriorityUpdate) {
        highPriorityUpdate = false;
      }

      lastUpdateTime = Date.now();

      // MODIFICA: Gestione migliorata per chat aperte
      if (notificationsWithNewMessages.size > 0) {
        const openChatMessages = [];
        const closedChatMessages = [];

        const newMessagesInfo = notifications
          .filter((notification) =>
            notificationsWithNewMessages.has(notification.notificationId),
          )
          .map((notification) => {
            const cachedNotification = notificationCache.find(
              (n) => n.notificationId === notification.notificationId,
            );

            const newMsgCount = notification.messageCount || 0;
            const cachedMsgCount = cachedNotification
              ? cachedNotification.messageCount || 0
              : 0;
            const increment = newMsgCount - cachedMsgCount;

            let senderName = "Unknown";
            let messagePreview = "Nuovo messaggio";
            let senderId = null;

            try {
              const messages = Array.isArray(notification.messages)
                ? notification.messages
                : JSON.parse(notification.messages || "[]");

              if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                senderName = lastMessage.senderName || lastMessage.SenderName || notification.title || "Unknown";
                messagePreview = lastMessage.message || "Nuovo messaggio";
                senderId = lastMessage.senderId || lastMessage.SenderId || null;
              }
            } catch (e) {
              logError(`Error parsing messages for notification ${notification.notificationId}:`, e);
            }

            const isOwnMessage = currentUserId && senderId && 
                                (senderId === currentUserId || 
                                 senderId.toString() === currentUserId.toString() ||
                                 parseInt(senderId) === parseInt(currentUserId));

            if (isOwnMessage) {
              console.log(`[Worker] Skipping own message notification for chat ${notification.notificationId}`);
              return null;
            }

            const notificationKey = `${notification.notificationId}_${Math.floor(Date.now() / 30000)}`;
            const isRecent = recentNotifications.has(notificationKey);

            if (!isRecent) {
              recentNotifications.add(notificationKey);
              if (recentNotifications.size > 100) {
                const oldKeys = Array.from(recentNotifications).slice(0, 50);
                oldKeys.forEach((key) => recentNotifications.delete(key));
              }
            }

            const info = {
              notificationId: notification.notificationId,
              newMessageCount: increment,
              senderName,
              messagePreview,
              isRecent,
              senderId,
              isOpenChat: openChatIds.has(notification.notificationId)
            };

            if (info.isOpenChat) {
              openChatMessages.push(info);
            } else {
              closedChatMessages.push(info);
            }

            return info;
          })
          .filter(info => info !== null);

        // IMPORTANTE: Invia prima gli aggiornamenti per le chat aperte
        if (openChatMessages.length > 0) {
          console.log(`[Worker] Inviando aggiornamenti per ${openChatMessages.length} chat aperte`);
          self.postMessage({
            type: "open_chat_update",
            updates: openChatMessages,
            timestamp: Date.now(),
          });
        }

        // Poi invia le notifiche per le chat chiuse
        if (closedChatMessages.length > 0) {
          self.postMessage({
            type: "new_message",
            newMessagesInfo: closedChatMessages,
            timestamp: Date.now(),
          });
        }

        // Richiedi aggiornamento allegati
        const notificationIdsToUpdate = Array.from(notificationsWithNewMessages);
        if (notificationIdsToUpdate.length > 0) {
          self.postMessage({
            type: "attachments_update",
            notificationIds: notificationIdsToUpdate.slice(0, 5),
            updateTime: Date.now(),
          });
        }
      }

      notificationCache = JSON.parse(JSON.stringify(notifications));

      self.postMessage({
        type: "notifications",
        notifications: notifications,
        updateTime: lastUpdateTime,
      });

      if (
        notificationsWithNewMessages.size === 0 &&
        notifications &&
        notifications.length > 0
      ) {
        const notificationsToUpdate = notifications
          .filter((notification, index) => index < 5)
          .map((notification) => notification.notificationId);

        if (notificationsToUpdate.length > 0) {
          self.postMessage({
            type: "attachments_update",
            notificationIds: notificationsToUpdate,
            updateTime: lastUpdateTime,
          });
        }
      }
    }
  } catch (error) {
    logError(`Error fetching notifications:`, error);
    self.postMessage({
      type: "error",
      error: error.message,
    });
  } finally {
    isRequestInProgress = false;
    scheduleNextFetch();
  }
}

function scheduleNextFetch() {
  if (!isWorkerActive) {
    console.log("[Worker] Worker non attivo, skip scheduling");
    return;
  }

  if (pollingTimeout) {
    clearTimeout(pollingTimeout);
  }

  let interval = forcedRefreshRequested
    ? FORCED_REFRESH_INTERVAL
    : POLLING_INTERVAL;

  if (highPriorityUpdate) {
    interval = 100;
  }

  pollingTimeout = setTimeout(() => {
    if (isWorkerActive) {
      fetchNotifications();
    }
  }, interval);
}

self.onmessage = (event) => {
  if (event.data) {
    const { type, data } = event.data;

    switch (type) {
      case "init":
        token = data.token;
        apiBaseUrl = data.apiBaseUrl;
        currentUserId = data.userId;
        isWorkerActive = true;

        if (data.debug) {
          debugEnabled = true;
        }

        isOpenChat = data.isOpenChat || false;

        console.log("[Worker] Inizializzato e attivo con userId:", currentUserId);

        fetchNotifications();
        break;

      case "update_open_chats":
        if (data.openChatIds) {
          openChatIds = new Set(data.openChatIds);
          console.log("[Worker] Chat aperte aggiornate:", Array.from(openChatIds));
        }
        break;

      case "stop":
        console.log("[Worker] Ricevuto comando stop");
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

        isOpenChat = data.isOpenChat || false;
        forcedRefreshRequested = true;
        highPriorityUpdate = data.highPriority || false;

        if (pollingTimeout) {
          clearTimeout(pollingTimeout);
        }

        pollingTimeout = setTimeout(() => {
          if (isWorkerActive) {
            fetchNotifications();
          }
        }, FORCED_REFRESH_INTERVAL);
        
        break;

      case "fetch_notification":
        token = data.token || token;
        apiBaseUrl = data.apiBaseUrl || apiBaseUrl;
        currentUserId = data.userId || currentUserId;

        isOpenChat = data.isOpenChat || true;

        if (pollingTimeout) {
          clearTimeout(pollingTimeout);
        }

        fetchNotifications(data.notificationId);
        break;

      case "update_user":
        currentUserId = data.userId;
        console.log("[Worker] UserId aggiornato a:", currentUserId);
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