// Worker state
let token = null;
let apiBaseUrl = null;
let isRequestInProgress = false;
let pollingTimeout = null;
let lastUpdateTime = Date.now();
let notificationCache = []; // Cache to track changes
let forcedRefreshRequested = false;
let highPriorityUpdate = false; // Flag per gli aggiornamenti ad alta priorità
let debugEnabled = true; // Set to true to enable extensive logging
let isOpenChat = false; // Flag per indicare se stiamo caricando per una chat aperta

// Set per prevenire notifiche duplicate ravvicinate
let recentNotifications = new Set();
// Tracking per identificare quali notifiche hanno nuovi messaggi in un ciclo
let notificationsWithNewMessages = new Set();

// Constants
const POLLING_INTERVAL = 10000; // 10 seconds
const FORCED_REFRESH_INTERVAL = 300; // 300ms for forced refresh
const REQUEST_TIMEOUT = 30000; // 30 seconds timeout for requests
const THROTTLE_INTERVAL = 2000; // Minimo tempo tra richieste consecutive

// Tracking per limitare le richieste troppo frequenti
let lastRequestTime = 0;

// Log errors even when debug is disabled
function logError(...args) {
  const timestamp = new Date().toISOString();
  console.error(`[NotificationWorker ERROR ${timestamp}]`, ...args);
}

// Check if notifications have changed by comparing with cache
function haveNotificationsChanged(newNotifications) {
  // Reset the set tracking which notifications have new messages
  notificationsWithNewMessages.clear();

  if (!notificationCache || notificationCache.length === 0) {
    return true; // No cache, consider it changed
  }

  if (newNotifications.length !== notificationCache.length) {
    return true; // Different number of notifications
  }

  let hasChanges = false;

  // Compare each notification for changes
  for (let i = 0; i < newNotifications.length; i++) {
    const newNotif = newNotifications[i];
    const cachedNotif = notificationCache.find(
      (n) => n.notificationId === newNotif.notificationId,
    );

    if (!cachedNotif) {
      hasChanges = true; // New notification found
      continue;
    }

    // Check for messages using messageCount field
    const newMsgCount = newNotif.messageCount || 0;
    const cachedMsgCount = cachedNotif.messageCount || 0;

    // Prendo dalla cche data ora dell'ultimo messaggio ricevuto (lastMessage)
    const newLastMessageDate = new Date(newNotif.lastMessage);
    const cachedLastMessageDate = new Date(cachedNotif.lastMessage);

    // Se la data dell'ultimo messaggio è più recente di quella in cache, allora ho un nuovo messaggio
    if (newLastMessageDate > cachedLastMessageDate) {
      hasChanges = true;
    }

    // Track which notifications have new messages
    if (newMsgCount > cachedMsgCount) {
      notificationsWithNewMessages.add(newNotif.notificationId);
      hasChanges = true;
    }

    // Check for read status changes
    if (newNotif.isReadByUser !== cachedNotif.isReadByUser) {
      hasChanges = true; // Read status changed
    }

    // Check for other status changes
    if (
      newNotif.pinned !== cachedNotif.pinned ||
      newNotif.favorite !== cachedNotif.favorite ||
      newNotif.archived !== cachedNotif.archived ||
      newNotif.isClosed !== cachedNotif.isClosed ||
      newNotif.isMuted !== cachedNotif.isMuted ||
      newNotif.lastMessage !== cachedNotif.lastMessage
    ) {
      hasChanges = true; // Status changed
    }
  }

  // If forcedRefreshRequested is true, consider it changed regardless
  if (forcedRefreshRequested) {
    forcedRefreshRequested = false; // Reset the flag
    return true;
  }

  return hasChanges;
}

// Extract last message text for notification preview
function extractLastMessagePreview(messages) {
  try {
    const parsedMessages = Array.isArray(messages)
      ? messages
      : JSON.parse(messages);
    if (parsedMessages && parsedMessages.length > 0) {
      const lastMessage = parsedMessages[parsedMessages.length - 1];
      return lastMessage.message || "";
    }
  } catch (e) {
    logError("Error extracting message preview:", e);
  }
  return "Nuovo messaggio";
}

// Main function to fetch notifications
async function fetchNotifications(notificationIdToFetch = null) {
  // Rate limit check - evita richieste troppo frequenti
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (
    timeSinceLastRequest < THROTTLE_INTERVAL &&
    !highPriorityUpdate &&
    !notificationIdToFetch
  ) {
    // Riprogramma per quando sarà passato l'intervallo minimo
    const waitTime = THROTTLE_INTERVAL - timeSinceLastRequest;
    if (pollingTimeout) {
      clearTimeout(pollingTimeout);
    }
    pollingTimeout = setTimeout(fetchNotifications, waitTime);
    return;
  }

  if (isRequestInProgress) {
    scheduleNextFetch();
    return;
  }

  // Aggiorna timestamp della richiesta
  lastRequestTime = now;
  isRequestInProgress = true;

  try {
    let url = `${apiBaseUrl}/notifications`;

    // Se è richiesta una notifica specifica, modifica l'URL
    if (notificationIdToFetch) {
      url = `${apiBaseUrl}/notifications/${notificationIdToFetch}?openChat=${isOpenChat ? "true" : "false"}`;
    }

    // Request with timeout
    const fetchPromise = fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store",
        Pragma: "no-cache",
      },
    });

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), REQUEST_TIMEOUT);
    });

    // Race between fetch and timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        logError(`Auth error: ${response.status}`);
        self.postMessage({
          type: "auth_error",
          error: "Session expired",
        });
        return;
      }
      throw new Error(`Network response was not ok: ${response.status}`);
    }

    let notifications;

    if (notificationIdToFetch) {
      // Se abbiamo richiesto una notifica specifica, otteniamo un oggetto singolo
      const notification = await response.json();
      notifications = [notification]; // Lo convertiamo in array per compatibilità
    } else {
      // Altrimenti otteniamo l'array completo
      notifications = await response.json();
    }

    // Sort notifications by pin and date
    notifications.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.lastMessage) - new Date(a.lastMessage);
    });

    // Check if notifications have changed and track which ones have new messages
    const hasChanges = haveNotificationsChanged(notifications);

    if (hasChanges || highPriorityUpdate || notificationIdToFetch) {
      if (highPriorityUpdate) {
        highPriorityUpdate = false; // Reset flag
      }

      // Track last update time
      lastUpdateTime = Date.now();

      // Solo se ci sono nuovi messaggi, emetti un unico evento batch
      // per evitare duplicazioni delle notifiche
      if (notificationsWithNewMessages.size > 0) {
        // Crea informazioni sulle notifiche con nuovi messaggi
        const newMessagesInfo = notifications
          .filter((notification) =>
            notificationsWithNewMessages.has(notification.notificationId),
          )
          .map((notification) => {
            // Trova la notifica in cache
            const cachedNotification = notificationCache.find(
              (n) => n.notificationId === notification.notificationId,
            );

            // Calcola incremento messaggi
            const newMsgCount = notification.messageCount || 0;
            const cachedMsgCount = cachedNotification
              ? cachedNotification.messageCount || 0
              : 0;
            const increment = newMsgCount - cachedMsgCount;

            // Estrai preview e sender
            let senderName = "Unknown";
            let messagePreview = "Nuovo messaggio";

            try {
              const messages = Array.isArray(notification.messages)
                ? notification.messages
                : JSON.parse(notification.messages || "[]");

              if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                senderName =
                  lastMessage.senderName || notification.title || "Unknown";
                messagePreview = lastMessage.message || "Nuovo messaggio";
              }
            } catch (e) {
              logError(`Error getting sender and preview:`, e);
            }

            // Controlla se questa notifica è stata mostrata di recente
            const notificationKey = `${notification.notificationId}_${Math.floor(Date.now() / 30000)}`;
            const isRecent = recentNotifications.has(notificationKey);

            // Se non è recente, registrala
            if (!isRecent) {
              recentNotifications.add(notificationKey);

              // Limita dimensioni del set
              if (recentNotifications.size > 100) {
                const oldKeys = Array.from(recentNotifications).slice(0, 50);
                oldKeys.forEach((key) => recentNotifications.delete(key));
              }
            }

            return {
              notificationId: notification.notificationId,
              newMessageCount: increment,
              senderName,
              messagePreview,
              isRecent,
            };
          });

        // Invia un solo evento con tutte le informazioni sui nuovi messaggi
        if (newMessagesInfo.length > 0) {
          self.postMessage({
            type: "new_message",
            newMessagesInfo,
            timestamp: Date.now(),
          });

          // Richiedi aggiornamento allegati per le notifiche con nuovi messaggi
          const notificationIdsToUpdate = Array.from(
            notificationsWithNewMessages,
          );
          if (notificationIdsToUpdate.length > 0) {
            self.postMessage({
              type: "attachments_update",
              notificationIds: notificationIdsToUpdate.slice(0, 5), // Limita a 5 per non sovraccaricare
              updateTime: Date.now(),
            });
          }
        }
      }

      // Update cache with deep copy
      notificationCache = JSON.parse(JSON.stringify(notifications));

      // Send updates to main thread
      self.postMessage({
        type: "notifications",
        notifications: notifications,
        updateTime: lastUpdateTime,
      });

      // Invia richiesta di aggiornamento allegati
      // solo se non abbiamo già inviato aggiornamenti specifici
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
    // Notify the React component of the error
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

// Schedule the next fetch based on current state
function scheduleNextFetch() {
  if (pollingTimeout) {
    clearTimeout(pollingTimeout);
  }

  // Use shorter interval for forced refreshes
  let interval = forcedRefreshRequested
    ? FORCED_REFRESH_INTERVAL
    : POLLING_INTERVAL;

  // Se è un aggiornamento ad alta priorità, riduci ulteriormente l'intervallo
  if (highPriorityUpdate) {
    interval = 100; // Praticamente immediato
  }

  pollingTimeout = setTimeout(fetchNotifications, interval);
}

// Handle messages from React component
self.onmessage = (event) => {
  if (event.data) {
    const { type, data } = event.data;

    switch (type) {
      case "init":
        // Initialize worker with token and URL
        token = data.token;
        apiBaseUrl = data.apiBaseUrl;

        // Enable debug if requested
        if (data.debug) {
          debugEnabled = true;
        }

        // Default to sidebar mode (isOpenChat = false)
        isOpenChat = data.isOpenChat || false;

        // Start fetching immediately
        fetchNotifications();
        break;

      case "stop":
        // Stop polling
        if (pollingTimeout) {
          clearTimeout(pollingTimeout);
        }
        break;

      case "reload":
        // Force immediate reload
        token = data.token || token;
        apiBaseUrl = data.apiBaseUrl || apiBaseUrl;

        // Imposta lo stato isOpenChat
        isOpenChat = data.isOpenChat || false;

        // Set flag to force update regardless of change detection
        forcedRefreshRequested = true;

        // Imposta il flag di alta priorità se specificato
        highPriorityUpdate = data.highPriority || false;

        // Cancel any pending fetch and start immediately
        if (pollingTimeout) {
          clearTimeout(pollingTimeout);
        }

        if (highPriorityUpdate) {
          // Esegui immediatamente senza ritardo
          fetchNotifications();
        } else {
          // Normale ritardo di aggiornamento forzato
          pollingTimeout = setTimeout(
            fetchNotifications,
            FORCED_REFRESH_INTERVAL,
          );
        }
        break;

      case "fetch_notification":
        // Fetch a specific notification with the full message history
        token = data.token || token;
        apiBaseUrl = data.apiBaseUrl || apiBaseUrl;

        // Imposta lo stato isOpenChat (di solito true per questa operazione)
        isOpenChat = data.isOpenChat || true;

        // Cancel any pending fetch
        if (pollingTimeout) {
          clearTimeout(pollingTimeout);
        }

        // Execute fetch immediately for the specified notification
        fetchNotifications(data.notificationId);
        break;

      case "debug":
        // Toggle debug mode
        debugEnabled = data.enabled;
        break;

      case "ping":
        // Ping to check worker is alive
        self.postMessage({
          type: "pong",
          timestamp: Date.now(),
          lastUpdateTime,
        });
        break;

      default:
        logError("Unknown message type:", type);
    }
  }
};

// Send initial ready message
self.postMessage({ type: "ready", timestamp: Date.now() });
