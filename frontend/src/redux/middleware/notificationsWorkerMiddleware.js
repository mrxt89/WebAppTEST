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
            newMessageCount,
            senderName,
            messagePreview
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
                  const state = store.getState();
                  if (!state?.notifications?.notifications) {
                    return;
                  }
                  
                  // Trova la notifica attuale
                  const notification = state.notifications.notifications?.find(n => n.notificationId === parseInt(notificationId));
                  if (!notification) {
                    return;
                  }
                  
                  // Evita notifiche troppo frequenti usando la cache
                  const notificationCache = window._notificationCache = window._notificationCache || {};
                  const now = Date.now();
                  
                  // Se la notifica è già stata mostrata negli ultimi 30 secondi, ignora
                  if (notificationCache[notificationId] && (now - notificationCache[notificationId].timestamp < 30000)) {
                    return;
                  }
                  
                  // Ottieni ID utente corrente
                  let currentUserId = null;
                  try {
                    const userStr = localStorage.getItem('user');
                    if (userStr) {
                      const userData = JSON.parse(userStr);
                      currentUserId = userData.userId || userData.UserId || userData.id || userData.ID;
                    }
                  } catch (e) {
                    console.error('Errore recupero userId:', e);
                  }
                  
                  if (!currentUserId) {
                    currentUserId = -1;
                  }
                  
                  // SOLUZIONE OTTIMIZZATA
                  // Verifica se c'è stato un incremento di messaggi rispetto alla cache
                  let shouldNotify = false;
                  let latestMessagePreview = "Nuovo messaggio";
                  let latestMessageSender = notification.title || "Nuovo messaggio";
                  let messageId = null;
                  
                  try {
                    // Ottieni i messaggi
                    const messages = Array.isArray(notification.messages) ? 
                      notification.messages : JSON.parse(notification.messages || '[]');
                      
                    // Verifica se abbiamo una entry nella cache per questa notifica
                    if (notificationCache[notificationId]) {
                      // Contiamo i messaggi non inviati dall'utente corrente
                      const relevantMessages = messages.filter(msg => msg.senderId != currentUserId);
                      const lastCachedCount = notificationCache[notificationId].messageCount || 0;
                      const currentCount = relevantMessages.length;
                      
                      // Notifica solo se il conteggio è aumentato
                      if (currentCount > lastCachedCount) {
                        shouldNotify = true;
                        
                        // Ottieni l'ultimo messaggio per la preview
                        if (relevantMessages.length > 0) {
                          const latestMessage = relevantMessages[relevantMessages.length - 1];
                          latestMessagePreview = latestMessage.message || "Nuovo messaggio";
                          latestMessageSender = latestMessage.senderName || notification.title || "Nuovo messaggio";
                          messageId = latestMessage.messageId;
                        }
                      }
                    } else {
                      // Prima volta che vediamo questa notifica
                      // Considera tutti i messaggi non inviati dall'utente come nuovi
                      const relevantMessages = messages.filter(msg => msg.senderId != currentUserId);
                      
                      if (relevantMessages.length > 0) {
                        shouldNotify = true;
                        
                        // Ottieni l'ultimo messaggio per la preview
                        const latestMessage = relevantMessages[relevantMessages.length - 1];
                        latestMessagePreview = latestMessage.message || "Nuovo messaggio";
                        latestMessageSender = latestMessage.senderName || notification.title || "Nuovo messaggio";
                        messageId = latestMessage.messageId;
                      }
                    }
                    
                    // Aggiorna la cache con il nuovo conteggio
                    if (messages.length > 0) {
                      notificationCache[notificationId] = {
                        timestamp: now,
                        messageCount: messages.filter(msg => msg.senderId != currentUserId).length,
                        messageId: messageId
                      };
                    }
                  } catch (e) {
                    console.error('Errore nel confronto dei messaggi:', e);
                    shouldNotify = false;
                  }
                  
                  // Mostra la notifica solo se necessario
                  if (shouldNotify) {
                    // Usa il servizio di notifiche centralizzato
                    if (window.notificationService) {
                      window.notificationService.notifyNewMessage(
                        latestMessagePreview,
                        latestMessageSender,
                        notificationId
                      );
                    } else {
                      // Fallback: Notifica diretta se il servizio non è disponibile
                      console.warn('NotificationService non disponibile, utilizzo notifica diretta');
                      if ('Notification' in window && Notification.permission === 'granted') {
                        const webNotification = new Notification(latestMessageSender, {
                          body: latestMessagePreview,
                          icon: '/icons/app-icon.png',
                          requireInteraction: true
                        });
                        
                        webNotification.onclick = () => {
                          window.focus();
                          if (typeof window.openChatModal === 'function') {
                            window.openChatModal(notificationId);
                          }
                          webNotification.close();
                        };
                        
                        setTimeout(() => webNotification.close(), 120000);
                      }
                    }
                    
                    // Emetti eventi per aggiornare UI e contatori
                    document.dispatchEvent(new CustomEvent('unread-count-changed', {
                      detail: {
                        notificationId,
                        timestamp: now
                      }
                    }));
                    document.dispatchEvent(new CustomEvent('new-message-received', {
                      detail: {
                        notificationId
                      }
                    }));
                    
                    // Aggiorna la notifica nello store Redux
                    store.dispatch(fetchNotificationById(notificationId));
                  }
                  
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