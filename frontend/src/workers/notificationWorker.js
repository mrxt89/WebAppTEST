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

// Set per prevenire notifiche duplicate ravvicinate
let recentNotifications = new Set();

// Constants
const POLLING_INTERVAL = 10000; // 10 seconds
const FORCED_REFRESH_INTERVAL = 300; // 300ms for forced refresh (reduced from 2000ms)
const REQUEST_TIMEOUT = 30000; // 30 seconds timeout for requests
const THROTTLE_INTERVAL = 2000; // Minimo tempo tra richieste consecutive

// Tracking per limitare le richieste troppo frequenti
let lastRequestTime = 0;

// Log function with timestamps
function log(...args) {
  if (debugEnabled) {
    const timestamp = new Date().toISOString();
    console.log(`[NotificationWorker ${timestamp}]`, ...args);
  }
}

// Log errors even when debug is disabled
function logError(...args) {
  const timestamp = new Date().toISOString();
  console.error(`[NotificationWorker ERROR ${timestamp}]`, ...args);
}

// Check if notifications have changed by comparing with cache
function haveNotificationsChanged(newNotifications) {
  if (!notificationCache || notificationCache.length === 0) {
    log("No cache available, considering changed");
    return true; // No cache, consider it changed
  }
  
  if (newNotifications.length !== notificationCache.length) {
    log(`Different notification count: new=${newNotifications.length}, cached=${notificationCache.length}`);
    return true; // Different number of notifications
  }
  
  // Compare each notification for changes
  for (let i = 0; i < newNotifications.length; i++) {
    const newNotif = newNotifications[i];
    const cachedNotif = notificationCache.find(n => n.notificationId === newNotif.notificationId);
    
    if (!cachedNotif) {
      log(`New notification found: ID=${newNotif.notificationId}`);
      return true; // New notification found
    }
    
    // Check for message count changes
    const newMsgCount = getMsgCount(newNotif.messages);
    const cachedMsgCount = getMsgCount(cachedNotif.messages);
    
    if (newMsgCount !== cachedMsgCount) {
      log(`Message count changed for ID=${newNotif.notificationId}: new=${newMsgCount}, cached=${cachedMsgCount}`);
      return true; // Message count changed
    }
    
    // Check for read status changes
    if (newNotif.isReadByUser !== cachedNotif.isReadByUser) {
      log(`Read status changed for ID=${newNotif.notificationId}: ${newNotif.isReadByUser}`);
      return true; // Read status changed
    }
    
    // Check for other changes (pin, archive, etc)
    if (newNotif.pinned !== cachedNotif.pinned || 
        newNotif.favorite !== cachedNotif.favorite ||
        newNotif.archived !== cachedNotif.archived ||
        newNotif.isClosed !== cachedNotif.isClosed) {
      log(`Status changed for ID=${newNotif.notificationId}`);
      return true; // Status changed
    }
  }
  
  // If forcedRefreshRequested is true, consider it changed regardless
  if (forcedRefreshRequested) {
    log("Forced refresh requested, considering changed");
    forcedRefreshRequested = false; // Reset the flag
    return true;
  }
  
  log("No changes detected");
  return false; // No changes detected
}

// Helper to get message count safely
function getMsgCount(messages) {
  if (!messages) return 0;
  if (Array.isArray(messages)) return messages.length;
  if (typeof messages === 'string') {
    try {
      return JSON.parse(messages).length;
    } catch (err) {
      logError('Error parsing messages:', err);
      return 0;
    }
  }
  return 0;
}

// Extract last message text for notification preview
function extractLastMessagePreview(messages) {
  try {
    const parsedMessages = Array.isArray(messages) ? messages : JSON.parse(messages);
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
async function fetchNotifications() {
  // Rate limit check - evita richieste troppo frequenti
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < THROTTLE_INTERVAL && !highPriorityUpdate) {
    // Riprogramma per quando sarà passato l'intervallo minimo
    const waitTime = THROTTLE_INTERVAL - timeSinceLastRequest;
    log(`Rate limiting: waiting ${waitTime}ms before next request`);
    if (pollingTimeout) {
      clearTimeout(pollingTimeout);
    }
    pollingTimeout = setTimeout(fetchNotifications, waitTime);
    return;
  }
  
  if (isRequestInProgress) {
    log("Request already in progress, skipping");
    scheduleNextFetch();
    return;
  }

  // Aggiorna timestamp della richiesta
  lastRequestTime = now;
  isRequestInProgress = true;
  const fetchStartTime = now;
  
  log(`Starting fetch: priority=${highPriorityUpdate ? 'high' : 'normal'}`);

  // Request with timeout
  const fetchPromise = fetch(`${apiBaseUrl}/notifications`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store',
      'Pragma': 'no-cache'
    }
  });
  
  // Create timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT);
  });

  try {
    // Race between fetch and timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        logError(`Auth error: ${response.status}`);
        self.postMessage({ 
          type: 'auth_error',
          error: 'Session expired'
        });
        return;
      }
      throw new Error(`Network response was not ok: ${response.status}`);
    }

    const notifications = await response.json();
    const fetchEndTime = Date.now();
    log(`Fetch completed in ${fetchEndTime - fetchStartTime}ms, received ${notifications.length} notifications`);
    
    // Sort notifications by pin and date
    notifications.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.tbCreated) - new Date(a.tbCreated);
    });
    
    // Check if notifications have changed
    const hasChanges = haveNotificationsChanged(notifications);
    
    if (hasChanges || highPriorityUpdate) {
      log(`Changes detected or high priority update, processing...`);
      
      if (highPriorityUpdate) {
        highPriorityUpdate = false; // Reset flag
        log("High priority flag reset");
      }
      
      // Track last update time
      lastUpdateTime = Date.now();

      // Check for new messages by comparing with cache
      for (const notification of notifications) {
        // Find the notification in cache
        const cachedNotificationIndex = notificationCache.findIndex(n => n.notificationId === notification.notificationId);
        const cachedNotification = cachedNotificationIndex !== -1 ? notificationCache[cachedNotificationIndex] : null;
        
        if (cachedNotification) {
          // Check for new messages
          const newMsgCount = getMsgCount(notification.messages);
          const cachedMsgCount = getMsgCount(cachedNotification.messages);
          
          if (newMsgCount > cachedMsgCount) {
            log(`${newMsgCount - cachedMsgCount} new messages detected for chat ${notification.notificationId}`);
            
            // Get name of sender
            let senderName = 'Unknown';
            try {
              const messages = Array.isArray(notification.messages) ? 
                notification.messages : 
                JSON.parse(notification.messages || '[]');
              
              if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                senderName = lastMessage.senderName || notification.title || 'Unknown';
              }
            } catch (e) {
              logError(`Error getting sender name:`, e);
            }
            
            // Extract message preview for notification
            const messagePreview = extractLastMessagePreview(notification.messages);
            
            // Verifica se questa notifica è già stata inviata recentemente (30 secondi)
            const notificationKey = `${notification.notificationId}_${Math.floor(Date.now() / 30000)}`;
            if (recentNotifications.has(notificationKey)) {
              log(`Notifica duplicata ignorata per chat ${notification.notificationId}`);
              continue;
            }
            
            // Registra questa notifica
            recentNotifications.add(notificationKey);
            
            // Limita dimensioni del set
            if (recentNotifications.size > 100) {
              const oldKeys = Array.from(recentNotifications).slice(0, 50);
              oldKeys.forEach(key => recentNotifications.delete(key));
            }
            
            // Emit explicit message for each chat with new messages
            self.postMessage({ 
              type: 'new_message',
              notificationId: notification.notificationId,
              newMessageCount: newMsgCount - cachedMsgCount,
              senderName: senderName,
              messagePreview: messagePreview
            });
            
            log(`Emitted new_message event for chat ${notification.notificationId}`);
          }
        }
      }
      
      // Update cache with deep copy
      notificationCache = JSON.parse(JSON.stringify(notifications));
      log("Cache updated");
      
      // Send updates to main thread
      self.postMessage({ 
        type: 'notifications',
        notifications: notifications,
        updateTime: lastUpdateTime
      });
      
      log("Sent notifications to main thread");
    } else {
      log("No changes detected, skipping update");
    }

  } catch (error) {
    // Notify the React component of the error
    logError(`Error fetching notifications:`, error);
    self.postMessage({ 
      type: 'error',
      error: error.message 
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
  let interval = forcedRefreshRequested ? FORCED_REFRESH_INTERVAL : POLLING_INTERVAL;
  
  // Se è un aggiornamento ad alta priorità, riduci ulteriormente l'intervallo
  if (highPriorityUpdate) {
    interval = 100; // Praticamente immediato
  }

  log(`Scheduling next fetch in ${interval}ms`);
  pollingTimeout = setTimeout(fetchNotifications, interval);
}

// Handle messages from React component
self.onmessage = (event) => {
  if (event.data) {
    const { type, data } = event.data;

    switch (type) {
      case 'init':
        // Initialize worker with token and URL
        token = data.token;
        apiBaseUrl = data.apiBaseUrl;
        
        // Enable debug if requested
        if (data.debug) {
          debugEnabled = true;
        }
        
        log(`Worker initialized: API=${apiBaseUrl}, debug=${debugEnabled}`);
        
        // Start fetching immediately
        fetchNotifications();
        break;

      case 'stop':
        // Stop polling
        log("Stopping worker");
        if (pollingTimeout) {
          clearTimeout(pollingTimeout);
        }
        break;
        
      case 'reload':
        // Force immediate reload
        token = data.token || token;
        apiBaseUrl = data.apiBaseUrl || apiBaseUrl;
        
        // Set flag to force update regardless of change detection
        forcedRefreshRequested = true;
        
        // Imposta il flag di alta priorità se specificato
        highPriorityUpdate = data.highPriority || false;
        
        log(`Reload requested: forcedRefresh=true, highPriority=${highPriorityUpdate}`);
        
        // Cancel any pending fetch and start immediately
        if (pollingTimeout) {
          clearTimeout(pollingTimeout);
        }
        
        if (highPriorityUpdate) {
          // Esegui immediatamente senza ritardo
          log("High priority reload - executing immediately");
          fetchNotifications();
        } else {
          // Normale ritardo di aggiornamento forzato
          log(`Scheduling forced reload in ${FORCED_REFRESH_INTERVAL}ms`);
          pollingTimeout = setTimeout(fetchNotifications, FORCED_REFRESH_INTERVAL);
        }
        break;
        
      case 'debug':
        // Toggle debug mode
        debugEnabled = data.enabled;
        log(`Debug mode set to ${debugEnabled}`);
        break;
        
      case 'ping':
        // Ping to check worker is alive
        log("Ping received, sending pong");
        self.postMessage({
          type: 'pong',
          timestamp: Date.now(),
          lastUpdateTime
        });
        break;

      default:
        logError('Unknown message type:', type);
    }
  }
};

// Send initial ready message
log("Worker started");
self.postMessage({ type: 'ready', timestamp: Date.now() });