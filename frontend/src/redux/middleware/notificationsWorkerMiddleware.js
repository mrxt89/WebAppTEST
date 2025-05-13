// src/redux/middleware/notificationsWorkerMiddleware.js
import NotificationWorker from '../../workers/notificationWorker.js?worker';
import { config } from '../../config';
import {
  fetchNotifications,
  fetchNotificationById,
  addUnreadMessage
} from '../features/notifications/notificationsSlice';

let worker = null;
let isWorkerInitialized = false;
let lastNotificationUpdate = 0;
const UPDATE_THROTTLE_MS = 2000; // Limitazione aggiornamenti: 2 secondi

// Middleware per gestire il worker delle notifiche
const notificationsWorkerMiddleware = store => {
  return next => action => {
    // Inizializza il worker quando l'app carica
    if (action.type === 'notifications/initialize') {
      // Per evitare duplicazione worker tra finestre, determina se questa finestra è standalone
      const isStandalone = window.location.pathname.startsWith('/standalone-chat/');
      const isMaster = localStorage.getItem('chat_master_window') === window.WINDOW_ID;
      const masterHeartbeat = parseInt(localStorage.getItem('chat_master_heartbeat') || '0');
      const isMasterActive = Date.now() - masterHeartbeat < 10000; // 10 secondi
      
      console.log(`[NotificationWorker] Window context: isStandalone=${isStandalone}, isMaster=${isMaster}, isMasterActive=${isMasterActive}`);
      
      // Non inizializzare se esplicitamente richiesto di saltare
      if (action.meta?.skipWorkerInit) {
        console.log('[NotificationWorker] Skipping worker initialization as requested');
        return next(action);
      }
      
      // Se è una finestra standalone ma non è l'inizializzazione forzata, salta
      if (isStandalone && !action.meta?.forceWorkerInit && isMasterActive) {
        console.log('[NotificationWorker] Skipping worker initialization in standalone window');
        return next(action);
      }
      
      // Se un worker esiste già, fermalo e creane uno nuovo
      if (worker) {
        console.log('[NotificationWorker] Stopping existing worker before creating a new one');
        worker.postMessage({ type: 'stop' });
        worker.terminate();
        worker = null;
      }
      
      console.log('[NotificationWorker] Creating new notification worker');
      
      // Crea un nuovo worker
      worker = new NotificationWorker();
      isWorkerInitialized = true;
      const token = localStorage.getItem('token');
      
      if (token) {
        // Inizializza il worker
        worker.postMessage({
          type: 'init',
          data: {
            token,
            apiBaseUrl: config.API_BASE_URL,
            debug: true, // Abilita logs per debugging avanzato
            isStandalone: isStandalone,
            windowId: window.WINDOW_ID || Date.now().toString(36)
          }
        });
        
        // Gestisci i messaggi del worker
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
              // Gestisci errori di autenticazione (sessione scaduta)
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              // Dispatch navigation action or emit event
              document.dispatchEvent(new CustomEvent('session-expired'));
              break;
              
            case 'notifications':
              // Limita aggiornamenti troppo frequenti per evitare problemi di performance
              const now = Date.now();
              if (now - lastNotificationUpdate < UPDATE_THROTTLE_MS) {
                console.log('[NotificationWorker] Throttling updates, skipping this update');
                return;
              }
              
              lastNotificationUpdate = now;
              
              if (newNotifications) {
                // Dispatch action per aggiornare le notifiche nello store
                store.dispatch({
                  type: 'notifications/updateFromWorker',
                  payload: newNotifications
                });
                
                // Emetti un evento per notificare altri componenti
                document.dispatchEvent(new CustomEvent('notifications-updated', {
                  detail: { 
                    timestamp: Date.now(),
                    source: 'worker'
                  }
                }));
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
                // Gestione sicura per finestre standalone
                try {
                  setTimeout(() => {
                    const state = store.getState();
                    
                    // Controlla se ci sono i dati necessari nello state
                    if (!state?.notifications) {
                      console.warn('Stato Redux incompleto, impossibile inviare notifica');
                      return;
                    }
                    
                    // Trova la notifica negli stati
                    const notification = state.notifications.notifications?.find(n => n.notificationId === notificationId);
                    if (!notification) {
                      console.log(`Notifica ${notificationId} non trovata nello stato Redux, aggiornamento richiesto`);
                      // Aggiorna la notifica specifica
                      store.dispatch(fetchNotificationById(notificationId));
                      return;
                    }
                    
                    // Controlla se la chat è aperta (sia standalone che normale)
                    const isStandaloneChat = (state.notifications.standaloneChats || new Set()).has(parseInt(notificationId));
                    const isOpenChat = (state.notifications.openChatIds || new Set()).has(parseInt(notificationId));
                    
                    // Prepara il callback per click notifica
                    const handleNotificationClick = () => {
                      if (isStandaloneChat) {
                        // Focus sulla finestra esistente o apri nuova
                        const windowName = `chat_${notificationId}`;
                        const standaloneWindow = window.open('', windowName);
                        
                        if (standaloneWindow && !standaloneWindow.closed) {
                          standaloneWindow.focus();
                        } else {
                          // Se la finestra non è più disponibile, apri una nuova
                          window.open(`/standalone-chat/${notificationId}`, windowName);
                        }
                      } else if (window.openChatModal) {
                        window.openChatModal(notificationId);
                      }
                    };
                    
                    // Invia notifica usando il servizio appropriato
                    if (window.notificationService) {
                      window.notificationService.notifySystem(
                        notification?.title || 'Nuovo messaggio', 
                        `Hai ricevuto ${newMessageCount > 1 ? `${newMessageCount} nuovi messaggi` : 'un nuovo messaggio'}`,
                        handleNotificationClick
                      );
                    } 
                    // Fallback a Notification API
                    else if (window.Notification && Notification.permission === 'granted') {
                      const webNotification = new Notification('Nuovo messaggio', {
                        body: `Hai ricevuto ${newMessageCount > 1 ? `${newMessageCount} nuovi messaggi` : 'un nuovo messaggio'}`,
                        icon: '/icons/app-icon.png'
                      });
                      
                      webNotification.onclick = () => {
                        window.focus();
                        handleNotificationClick();
                        webNotification.close();
                      };
                    }
                    
                    // Forza un aggiornamento del contatore tramite eventi
                    document.dispatchEvent(new CustomEvent('unread-count-changed', {
                      detail: {
                        notificationId,
                        newMessageCount,
                        timestamp: Date.now()
                      }
                    }));
                    
                    // Emetti eventi standard per nuovi messaggi
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
                        timestamp: Date.now()
                      }
                    }));
                    
                    // Fetch della notifica aggiornata
                    store.dispatch(fetchNotificationById(notificationId));
                    
                    // Messaggio non letto (solo se necessario)
                    if (!isOpenChat && !isStandaloneChat) {
                      store.dispatch(addUnreadMessage({
                        notificationId,
                        messageId: Date.now(), // Placeholder
                        title: notification.title,
                        message: 'Nuovo messaggio' // Messaggio generico
                      }));
                    }
                  }, 0);
                } catch (e) {
                  console.error('Errore elaborazione nuovo messaggio:', e);
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
        
        // Trigger di un fetch iniziale
        worker.postMessage({
          type: 'reload',
          data: {
            token,
            apiBaseUrl: config.API_BASE_URL
          }
        });
      }
    }
    
    // Gestisci reload delle notifiche
    else if (action.type === 'notifications/reload') {
      if (!worker || !isWorkerInitialized) {
        console.warn('[NotificationWorker] Cannot reload: worker not initialized');
        return next(action);
      }
      
      console.log('[NotificationWorker] Reloading notifications', action.payload?.highPriority ? 'with high priority' : '');
      
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
    
    // Gestisci lo stop del worker
    else if (action.type === 'notifications/stopWorker') {
      if (worker) {
        console.log('[NotificationWorker] Stopping worker');
        worker.postMessage({ type: 'stop' });
        worker.terminate();
        worker = null;
        isWorkerInitialized = false;
      }
    }
    
    // Gestisci ping per verificare lo stato del worker
    else if (action.type === 'notifications/pingWorker') {
      if (worker) {
        worker.postMessage({ type: 'ping' });
      }
    }
    
    // Processa l'azione normalmente
    return next(action);
  };
};

export default notificationsWorkerMiddleware;