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

// Helper function for logging with timestamp
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
    return true; // No cache, consider it changed
  }
  
  if (newNotifications.length !== notificationCache.length) {
    log('Notification count changed:', notificationCache.length, '->', newNotifications.length);
    return true; // Different number of notifications
  }
  
  // Compare each notification for changes
  for (let i = 0; i < newNotifications.length; i++) {
    const newNotif = newNotifications[i];
    const cachedNotif = notificationCache.find(n => n.notificationId === newNotif.notificationId);
    
    if (!cachedNotif) {
      log('New notification found:', newNotif.notificationId);
      return true; // New notification found
    }
    
    // Check for message count changes
    const newMsgCount = getMsgCount(newNotif.messages);
    const cachedMsgCount = getMsgCount(cachedNotif.messages);
    
    if (newMsgCount !== cachedMsgCount) {
      log(`Messages changed for notification ${newNotif.notificationId}: ${cachedMsgCount} -> ${newMsgCount}`);
      return true; // Message count changed
    }
    
    // Check for read status changes
    if (newNotif.isReadByUser !== cachedNotif.isReadByUser) {
      log(`Read status changed for notification ${newNotif.notificationId}: ${cachedNotif.isReadByUser} -> ${newNotif.isReadByUser}`);
      return true; // Read status changed
    }
    
    // Check for other changes (pin, archive, etc)
    if (newNotif.pinned !== cachedNotif.pinned || 
        newNotif.favorite !== cachedNotif.favorite ||
        newNotif.archived !== cachedNotif.archived ||
        newNotif.isClosed !== cachedNotif.isClosed) {
      log(`Status changed for notification ${newNotif.notificationId}`);
      return true; // Status changed
    }
  }
  
  // If forcedRefreshRequested is true, consider it changed regardless
  if (forcedRefreshRequested) {
    log('Forced refresh requested, returning true regardless');
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
    log(`Skipping notification fetch: too soon (${timeSinceLastRequest}ms since last request)`);
    
    // Riprogramma per quando sarà passato l'intervallo minimo
    const waitTime = THROTTLE_INTERVAL - timeSinceLastRequest;
    log(`Rescheduling fetch in ${waitTime}ms`);
    
    if (pollingTimeout) {
      clearTimeout(pollingTimeout);
    }
    pollingTimeout = setTimeout(fetchNotifications, waitTime);
    return;
  }
  
  if (isRequestInProgress) {
    log('Skipping notification fetch: previous request still in progress');
    scheduleNextFetch();
    return;
  }

  // Aggiorna timestamp della richiesta
  lastRequestTime = now;
  isRequestInProgress = true;
  const fetchStartTime = now;
  log('Starting notification fetch');

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
        log('Authentication error:', response.status);
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
    log(`Fetched ${notifications.length} notifications in ${fetchEndTime - fetchStartTime}ms`);
    
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
        log('High priority update, forcing update regardless of changes');
        highPriorityUpdate = false; // Reset flag
      } else {
        log('Changes detected, updating main thread');
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
            log(`Rilevato nuovo messaggio per notifica ${notification.notificationId}: ${cachedMsgCount} -> ${newMsgCount}`);
            
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
    } else {
      log('No changes detected, skipping update');
    }

  } catch (error) {
    // Notify the React component of the error
    logError('Error fetching notifications:', error);
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
  
  log(`Scheduling next fetch in ${interval/1000} seconds`);
  pollingTimeout = setTimeout(fetchNotifications, interval);
}

// Handle messages from React component
self.onmessage = (event) => {
  if (event.data) {
    const { type, data } = event.data;

    switch (type) {
      case 'init':
        // Initialize worker with token and URL
        log('Initializing worker', data);
        token = data.token;
        apiBaseUrl = data.apiBaseUrl;
        
        // Enable debug if requested
        if (data.debug) {
          debugEnabled = true;
          log('Debug mode enabled');
        }
        
        // Start fetching immediately
        fetchNotifications();
        break;

      case 'stop':
        // Stop polling
        log('Stopping worker');
        if (pollingTimeout) {
          clearTimeout(pollingTimeout);
        }
        break;
        
      case 'reload':
        // Force immediate reload
        log('Forced reload requested');
        token = data.token || token;
        apiBaseUrl = data.apiBaseUrl || apiBaseUrl;
        
        // Set flag to force update regardless of change detection
        forcedRefreshRequested = true;
        
        // Imposta il flag di alta priorità se specificato
        highPriorityUpdate = data.highPriority || false;
        
        if (highPriorityUpdate) {
          log('High priority update requested - executing immediately');
        }
        
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
        log('Debug mode ' + (debugEnabled ? 'enabled' : 'disabled'));
        break;
        
      case 'ping':
        // Ping to check worker is alive
        log('Ping received, sending pong');
        self.postMessage({
          type: 'pong',
          timestamp: Date.now(),
          lastUpdateTime
        });
        break;

      default:
        log('Unknown message type:', type);
    }
  }
};

// Send initial ready message
self.postMessage({ type: 'ready', timestamp: Date.now() });
log('Notification worker initialized and ready');