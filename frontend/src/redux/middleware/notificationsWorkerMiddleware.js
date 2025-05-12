// src/redux/middleware/notificationsWorkerMiddleware.js
import NotificationWorker from '../../workers/notificationWorker.js?worker';
import { config } from '../../config';
import {
  fetchNotifications,
  fetchNotificationById,
  addUnreadMessage
} from '../features/notifications/notificationsSlice';

let worker = null;

// Middleware to handle notifications worker
const notificationsWorkerMiddleware = store => {
  return next => action => {
    // Initialize the worker when the app loads
    if (action.type === 'notifications/initialize') {
      // Skip worker initialization if richiesto (per finestre non-master)
      if (action.meta?.skipWorkerInit) {
        console.log('[NotificationWorker] Skipping worker initialization in non-master window');
        return next(action);
      }
      
      if (worker) {
        // Stop existing worker
        worker.postMessage({ type: 'stop' });
        worker.terminate();
      }
      
      // Create a new worker
      worker = new NotificationWorker();
      const token = localStorage.getItem('token');
      
      if (token) {
        // Initialize the worker
        worker.postMessage({
          type: 'init',
          data: {
            token,
            apiBaseUrl: config.API_BASE_URL,
            debug: true // Abilita logs per debugging avanzato
          }
        });
        
        // Handle worker messages
        worker.onmessage = (event) => {
          const {
            type,
            notifications: newNotifications,
            error: workerError,
            notificationId,
            newMessageCount
          } = event.data;
          
          switch (type) {
            case 'auth_error':
              // Handle auth error (session expired)
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              // Dispatch navigation action or emit event
              document.dispatchEvent(new CustomEvent('session-expired'));
              break;
              
            case 'notifications':
              if (newNotifications) {
                // Dispatch action to update notifications in store
                store.dispatch({
                  type: 'notifications/updateFromWorker',
                  payload: newNotifications
                });
              }
              break;
              
            case 'error':
              console.error('Worker error:', workerError);
              store.dispatch({
                type: 'notifications/setError',
                payload: 'Errore nel caricamento delle notifiche'
              });
              break;
              
            case 'new_message':
              if (notificationId) {
                // Invia direttamente la notifica tramite notificationService se disponibile
                try {
                  setTimeout(() => {
                    if (window.notificationService) {
                      const state = store.getState();
                      const notification = state?.notifications?.notifications?.find(n => n.notificationId === notificationId);
                      
                      // Controlla se la chat è aperta in una finestra standalone
                      const standaloneChats = state?.notifications?.standaloneChats || new Set();
                      const isStandalone = standaloneChats.has(parseInt(notificationId));
                      
                      // Se è aperta in una finestra standalone, modifica il comportamento del click
                      const onClick = () => {
                        if (isStandalone) {
                          // Focus sulla finestra esistente
                          const standaloneWindow = window.open('', `chat_${notificationId}`);
                          if (standaloneWindow) {
                            standaloneWindow.focus();
                          } else {
                            // Se la finestra non è più disponibile, apri una nuova
                            window.open(`/standalone-chat/${notificationId}`, `chat_${notificationId}`);
                          }
                        } else if (window.openChatModal) {
                          window.openChatModal(notificationId);
                        }
                      };
                      
                      window.notificationService.notifySystem(
                        notification?.title || 'Nuovo messaggio', 
                        `Hai ricevuto ${newMessageCount > 1 ? `${newMessageCount} nuovi messaggi` : 'un nuovo messaggio'}`,
                        onClick
                      );
                    } else if (window.Notification && Notification.permission === 'granted') {
                      const notification = new Notification('Nuovo messaggio', {
                        body: `Hai ricevuto ${newMessageCount > 1 ? `${newMessageCount} nuovi messaggi` : 'un nuovo messaggio'}`,
                        icon: '/icons/app-icon.png'
                      });
                      notification.onclick = () => {
                        window.focus();
                        if (window.openChatModal) {
                          window.openChatModal(notificationId);
                        }
                        notification.close();
                      };
                    }
                  }, 0);
                } catch (e) {
                  console.error('Errore invio notifica push:', e);
                }
                
                // Forza un aggiornamento del contatore tramite un evento dedicato
                document.dispatchEvent(new CustomEvent('unread-count-changed', {
                  detail: {
                    notificationId,
                    newMessageCount,
                    timestamp: new Date().getTime()
                  }
                }));
                
                // Emit events
                document.dispatchEvent(new CustomEvent('new-message-received', {
                  detail: {
                    notificationId,
                    newMessageCount
                  }
                }));
                
                document.dispatchEvent(new CustomEvent('open-chat-new-message', {
                  detail: {
                    notificationId,
                    newMessageCount,
                    timestamp: new Date().getTime()
                  }
                }));
                
                // Fetch the updated notification
                store.dispatch(fetchNotificationById(notificationId));
                
                try {
                  // Check if the notification is for an unread message - più sicuro con controlli null
                  const state = store.getState();
                  if (state && state.notifications && state.notifications.notifications) {
                    const notifications = state.notifications.notifications;
                    const notification = notifications.find(n => n && n.notificationId === notificationId);
                    
                    // Controllo sicuro di openChatIds
                    const openChatIds = state.notifications.openChatIds || new Set();
                    
                    if (notification && !notification.isReadByUser) {
                      // We could add an unread message to state if needed
                      store.dispatch(addUnreadMessage({
                        notificationId,
                        messageId: Date.now(), // Placeholder
                        title: notification.title,
                        message: 'Nuovo messaggio' // Generic message
                      }));
                      
                      // Aggiungi notifica di sistema solo se la chat non è aperta
                      if (!openChatIds.has(parseInt(notificationId))) {
                        try {
                          // Usa il servizio di notifica se disponibile
                          if (window.notificationService) {
                            const title = notification.title || 'Nuovo messaggio';
                            const message = newMessageCount > 1 
                              ? `Hai ${newMessageCount} nuovi messaggi` 
                              : 'Nuovo messaggio';
                            
                            window.notificationService.notifySystem(title, message, () => {
                              // Quando si clicca sulla notifica, apri la chat
                              if (window.openChatModal) {
                                window.openChatModal(notificationId);
                              }
                            });
                          }
                        } catch (e) {
                          console.error('Errore invio notifica:', e);
                        }
                      }
                    }
                  }
                } catch (error) {
                  console.error('Error checking notification state:', error);
                }
              }
              break;
              
            case 'ready':
              console.log('[NotificationWorker] Worker is ready');
              break;
              
            case 'pong':
              console.log('[NotificationWorker] Received pong from worker');
              break;
          }
        };
        
        // Trigger an initial fetch
        worker.postMessage({
          type: 'reload',
          data: {
            token,
            apiBaseUrl: config.API_BASE_URL
          }
        });
      }
    }
    
    // Handle reloading notifications
    else if (action.type === 'notifications/reload') {
      console.log('[NotificationWorker] Reloading notifications', action.payload?.highPriority ? 'with high priority' : '');
      if (worker) {
        const token = localStorage.getItem('token');
        worker.postMessage({
          type: 'reload',
          data: {
            token,
            apiBaseUrl: config.API_BASE_URL,
            highPriority: action.payload?.highPriority
          }
        });
      }
    }
    
    // Handle stopping the worker
    else if (action.type === 'notifications/stopWorker') {
      if (worker) {
        worker.postMessage({ type: 'stop' });
        worker.terminate();
        worker = null;
      }
    }
    
    // Handle ping to check worker status
    else if (action.type === 'notifications/pingWorker') {
      if (worker) {
        worker.postMessage({ type: 'ping' });
      }
    }
    
    // Process the action normally
    return next(action);
  };
};

export default notificationsWorkerMiddleware;