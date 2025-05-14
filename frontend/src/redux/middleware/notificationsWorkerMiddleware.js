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
      
      // Non inizializzare se esplicitamente richiesto di saltare
      if (action.meta?.skipWorkerInit) {
        return next(action);
      }
      
      // Se è una finestra standalone ma non è l'inizializzazione forzata, salta
      if (isStandalone && !action.meta?.forceWorkerInit && isMasterActive) {
        return next(action);
      }
      
      // Se un worker esiste già, fermalo e creane uno nuovo
      if (worker) {
        worker.postMessage({ type: 'stop' });
        worker.terminate();
        worker = null;
      }
      
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
              try {
                // Controlli di sicurezza
                if (!notificationId) {
                  console.error('ID notifica non valido per nuovo messaggio');
                  return;
                }
                
                // Fetch notifica dallo state Redux
                const state = store.getState();
                
                // Controlla se ci sono i dati necessari nello state
                if (!state?.notifications?.notifications) {
                  console.warn('Stato Redux incompleto, impossibile inviare notifica');
                  return;
                }
                
                // Trova la notifica negli stati
                const notification = state.notifications.notifications?.find(n => n.notificationId === parseInt(notificationId));
                
                // Titolo e contenuto per la notifica
                const notificationTitle = notification?.title || 'Nuovo messaggio';
                console.log('DEBUG: Notifica:', notification);
                const notificationBody = `Hai ricevuto ${newMessageCount > 1 ? `${newMessageCount} nuovi messaggi` : 'un nuovo messaggio'}`;
                
                // Callback per il click sulla notifica
                const handleNotificationClick = () => {
                  if (window.openChatModal) {
                    window.openChatModal(notificationId);
                  }
                };
                
                // IMPLEMENTAZIONE DIRETTA - Bypass NotificationService
                // Accedi direttamente all'API Notification del browser
                if (window.Notification && Notification.permission === 'granted') {
                  try {
                    console.log('DEBUG: Creazione notifica diretta per:', notificationTitle);
                    
                    const desktopNotification = new Notification(notificationTitle, {
                      body: notificationBody,
                      icon: '/icons/app-icon.png'
                    });
                    
                    desktopNotification.onclick = () => {
                      window.focus();
                      handleNotificationClick();
                      desktopNotification.close();
                    };
                    
                    setTimeout(() => desktopNotification.close(), 8000);
                    
                    console.log('DEBUG: Notifica desktop creata con successo');
                  } catch (e) {
                    console.error('Errore nella creazione della notifica desktop:', e);
                    
                    // FALLBACK - Se fallisce l'implementazione diretta, tenta con NotificationService
                    if (window.notificationService) {
                      try {
                        window.notificationService.notifySystem(
                          notificationTitle,
                          notificationBody,
                          handleNotificationClick
                        );
                      } catch (nse) {
                        console.error('Errore anche nel fallback NotificationService:', nse);
                      }
                    }
                  }
                } else {
                  console.log('DEBUG: Impossibile mostrare notifica desktop. Permesso:', 
                            Notification?.permission);
                            
                  // Se non abbiamo i permessi e NotificationService è disponibile, prova con quello
                  if (window.notificationService) {
                    window.notificationService.notifySystem(
                      notificationTitle,
                      notificationBody,
                      handleNotificationClick
                    );
                  }
                }
                
                // Emetti eventi per aggiornare UI e contatori
                document.dispatchEvent(new CustomEvent('unread-count-changed', {
                  detail: {
                    notificationId,
                    newMessageCount,
                    timestamp: Date.now()
                  }
                }));
                
                document.dispatchEvent(new CustomEvent('new-message-received', {
                  detail: {
                    notificationId,
                    newMessageCount
                  }
                }));
                
                // Aggiorna la notifica nello store Redux
                store.dispatch(fetchNotificationById(notificationId));
                
              } catch (e) {
                console.error('Errore elaborazione nuovo messaggio:', e);
              }
            }
            break;
            case 'ready':
              break;
              
            case 'pong':
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