// notificationWorker.js - Improved Worker for Real-time Updates
// This worker handles fetching notifications and ensures real-time updates for chats

// Worker state
let token = null;
let apiBaseUrl = null;
let isRequestInProgress = false;
let pollingTimeout = null;
let lastUpdateTime = Date.now();
let notificationCache = []; // Cache to track changes
let forcedRefreshRequested = false;
let highPriorityUpdate = false; // Flag per gli aggiornamenti ad alta priorità
let debugEnabled = false;

// Constants
const POLLING_INTERVAL = 10000; // 10 seconds
const FORCED_REFRESH_INTERVAL = 300; // 300ms for forced refresh (reduced from 2000ms)
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
  if (!notificationCache || notificationCache.length === 0) {
    return true; // No cache, consider it changed
  }
  
  if (newNotifications.length !== notificationCache.length) {
    return true; // Different number of notifications
  }
  
  // Compare each notification for changes
  for (let i = 0; i < newNotifications.length; i++) {
    const newNotif = newNotifications[i];
    const cachedNotif = notificationCache.find(n => n.notificationId === newNotif.notificationId);
    
    if (!cachedNotif) {
      return true; // New notification found
    }
    
    // Check for message count changes
    const newMsgCount = getMsgCount(newNotif.messages);
    const cachedMsgCount = getMsgCount(cachedNotif.messages);
    
    if (newMsgCount !== cachedMsgCount) {
      return true; // Message count changed
    }
    
    // Check for read status changes
    if (newNotif.isReadByUser !== cachedNotif.isReadByUser) {
      return true; // Read status changed
    }
    
    // Check for other changes (pin, archive, etc)
    if (newNotif.pinned !== cachedNotif.pinned || 
        newNotif.favorite !== cachedNotif.favorite ||
        newNotif.archived !== cachedNotif.archived ||
        newNotif.isClosed !== cachedNotif.isClosed) {
      return true; // Status changed
    }
  }
  
  // If forcedRefreshRequested is true, consider it changed regardless
  if (forcedRefreshRequested) {
    forcedRefreshRequested = false; // Reset the flag
    return true;
  }
  
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
      return 0;
    }
  }
  return 0;
}

// Main function to fetch notifications
async function fetchNotifications() {
  // Rate limit check - evita richieste troppo frequenti
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < THROTTLE_INTERVAL && !highPriorityUpdate) {
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
  const fetchStartTime = now;

  // Request with timeout
// Request with timeout
const fetchPromise = fetch(`${apiBaseUrl}/notifications`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
 
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
    
    // Sort notifications by pin and date
    notifications.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.tbCreated) - new Date(a.tbCreated);
    });
    
    // Check if notifications have changed
    const hasChanges = haveNotificationsChanged(notifications);
    
    if (hasChanges || highPriorityUpdate) {
      if (highPriorityUpdate) {
        highPriorityUpdate = false; // Reset flag
      }
      
      // Update cache
      notificationCache = [...notifications];
      
      // Track last update time
      lastUpdateTime = Date.now();

      // Check for new messages
      for (const notification of notifications) {
        const cachedNotification = notificationCache.find(n => n.notificationId === notification.notificationId);
        if (cachedNotification) {
          const newMsgCount = getMsgCount(notification.messages);
          const cachedMsgCount = getMsgCount(cachedNotification.messages);
          
          if (newMsgCount > cachedMsgCount) {
            // Emetti messaggio esplicito per ogni chat con nuovi messaggi
            self.postMessage({ 
              type: 'new_message',
              notificationId: notification.notificationId,
              newMessageCount: newMsgCount - cachedMsgCount
            });
          }
        }
      }
      
      // Send updates to main thread
      self.postMessage({ 
        type: 'notifications',
        notifications: notifications,
        updateTime: lastUpdateTime
      });
    }

  } catch (error) {
    // Notify the React component of the error
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
        
        // Start fetching immediately
        fetchNotifications();
        break;

      case 'stop':
        // Stop polling
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
        
        // Cancel any pending fetch and start immediately
        if (pollingTimeout) {
          clearTimeout(pollingTimeout);
        }
        
        if (highPriorityUpdate) {
          // Esegui immediatamente senza ritardo
          fetchNotifications();
        } else {
          // Normale ritardo di aggiornamento forzato
          pollingTimeout = setTimeout(fetchNotifications, FORCED_REFRESH_INTERVAL);
        }
        break;
        
      case 'debug':
        // Toggle debug mode
        debugEnabled = data.enabled;
        break;
        
      case 'ping':
        // Ping to check worker is alive
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
self.postMessage({ type: 'ready', timestamp: Date.now() });