// src/redux/middleware/notificationsWorkerMiddleware.js
import NotificationWorker from "../../workers/notificationWorker.js?worker";
import { config } from "../../config";
import {
  fetchNotifications,
  fetchNotificationById,
  addUnreadMessage,
} from "../features/notifications/notificationsSlice";

let worker = null;
let isWorkerInitialized = false;
let lastNotificationUpdate = 0;
const UPDATE_THROTTLE_MS = 3000; // Aumentato da 2000 a 3000 ms

/**
 * Verifica se ci sono cambiamenti significativi tra le notifiche attuali e quelle nuove
 * per evitare aggiornamenti non necessari che causano sfarfallio
 *
 * @param {Array} currentNotifications - Le notifiche attualmente nello store
 * @param {Array} newNotifications - Le nuove notifiche ricevute dal worker
 * @return {Boolean} true se ci sono cambiamenti significativi, false altrimenti
 */
function hasNotificationChanges(currentNotifications, newNotifications) {
  // Se le lunghezze sono diverse, c'è sicuramente un cambiamento
  if (currentNotifications.length !== newNotifications.length) {
    return true;
  }

  // Crea una mappa delle notifiche attuali per una ricerca veloce
  const currentMap = new Map();
  currentNotifications.forEach((notification) => {
    if (notification && notification.notificationId) {
      // Memorizziamo solo i campi che ci interessano per il confronto
      currentMap.set(notification.notificationId, {
        isReadByUser: notification.isReadByUser,
        isClosed: notification.isClosed,
        pinned: notification.pinned,
        favorite: notification.favorite,
        isMuted: notification.isMuted,
        archived: notification.archived,
        chatLeft: notification.chatLeft,
        lastMessage: notification.lastMessage,
        // Contiamo il numero di messaggi per verificare se ce ne sono di nuovi
        messagesCount: Array.isArray(notification.messages)
          ? notification.messages.length
          : typeof notification.messages === "string"
            ? JSON.parse(notification.messages || "[]").length
            : 0,
      });
    }
  });

  // Verifica se c'è almeno una notifica modificata
  return newNotifications.some((notification) => {
    if (!notification || !notification.notificationId) return false;

    const current = currentMap.get(notification.notificationId);

    // Se la notifica non esiste nello stato corrente, è nuova
    if (!current) return true;

    // Contiamo i messaggi nella nuova notifica
    const newMessagesCount = Array.isArray(notification.messages)
      ? notification.messages.length
      : typeof notification.messages === "string"
        ? JSON.parse(notification.messages || "[]").length
        : 0;

    // Controlla se ci sono cambiamenti significativi
    return (
      current.isReadByUser !== notification.isReadByUser ||
      current.isClosed !== notification.isClosed ||
      current.pinned !== notification.pinned ||
      current.favorite !== notification.favorite ||
      current.isMuted !== notification.isMuted ||
      current.archived !== notification.archived ||
      current.chatLeft !== notification.chatLeft ||
      current.lastMessage !== notification.lastMessage ||
      current.messagesCount !== newMessagesCount
    );
  });
}

/**
 * Funzione di cleanup completo delle risorse del worker
 * @returns {boolean} True se il cleanup è stato eseguito, false altrimenti
 */
function cleanupWorkerResources() {
  try {
    if (worker) {
      // Invia messaggio di terminazione al worker
      worker.postMessage({ type: "stop" });
      
      // Termina il worker
      worker.terminate();
      worker = null;
      isWorkerInitialized = false;
      
      // Verifica se esistono altre risorse da pulire
      if (window.notificationWorker) {
        delete window.notificationWorker;
      }
      
      console.log("[NotificationsWorker] Worker terminated successfully");
      return true;
    }
    return false;
  } catch (error) {
    console.error("[NotificationsWorker] Error during cleanup:", error);
    return false;
  }
}

// Middleware per gestire il worker delle notifiche
const notificationsWorkerMiddleware = (store) => {
  // Aggiungi un event listener globale per gestire il logout
  document.addEventListener("stop-notification-worker", () => {
    cleanupWorkerResources();
  });
  
  // Aggiungi un event listener per il reset dello store Redux
  document.addEventListener("reset-redux-store", () => {
    // Resetta lo stato delle notifiche nello store
    store.dispatch({ type: "notifications/resetState" });
  });

  return (next) => (action) => {
    // Inizializza il worker quando l'app carica
    if (action.type === "notifications/initialize") {
      // Per evitare duplicazione worker tra finestre, determina se questa finestra è standalone
      const isStandalone =
        window.location.pathname.startsWith("/standalone-chat/");
      const isMaster =
        localStorage.getItem("chat_master_window") === window.WINDOW_ID;
      const masterHeartbeat = parseInt(
        localStorage.getItem("chat_master_heartbeat") || "0",
      );
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
        cleanupWorkerResources();
      }

      // Crea un nuovo worker
      try {
        worker = new NotificationWorker();
        isWorkerInitialized = true;
        
        // Mantieni un riferimento globale al worker per il cleanup durante il logout
        window.notificationWorker = worker;
        
        const token = localStorage.getItem("token");

        if (token) {
          // Inizializza il worker
          worker.postMessage({
            type: "init",
            data: {
              token,
              apiBaseUrl: config.API_BASE_URL,
              debug: true, // Abilita logs per debugging avanzato
              isStandalone: isStandalone,
              windowId: window.WINDOW_ID || Date.now().toString(36),
            },
          });

          // Gestisci i messaggi del worker
          worker.onmessage = (event) => {
            // Verifica se il token è ancora valido prima di elaborare i messaggi
            const currentToken = localStorage.getItem("token");
            if (!currentToken) {
              // Se il token non è più presente, ferma il worker
              cleanupWorkerResources();
              return;
            }
            
            const {
              type,
              notifications: newNotifications,
              error: workerError,
              notificationId,
              newMessageCount,
              senderName,
              messagePreview,
            } = event.data;
            
            switch (type) {
              case "auth_error":
                // Gestisci errori di autenticazione (sessione scaduta)
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                // Dispatch navigation action or emit event
                document.dispatchEvent(new CustomEvent("session-expired"));
                break;

              case "notifications":
                // Limita aggiornamenti troppo frequenti per evitare problemi di performance
                const now = Date.now();
                if (now - lastNotificationUpdate < UPDATE_THROTTLE_MS) {
                  return;
                }

                lastNotificationUpdate = now;

                if (newNotifications) {
                  try {
                    // Ottieni lo stato corrente prima dell'aggiornamento
                    const currentState = store.getState();
                    const currentNotifications =
                      currentState.notifications?.notifications || [];

                    // Trova le notifiche nuove o modificate (evita aggiornamenti non necessari)
                    const hasChanges = hasNotificationChanges(
                      currentNotifications,
                      newNotifications,
                    );

                    // Esegui l'aggiornamento solo se ci sono effettivamente cambiamenti
                    if (hasChanges) {
                      // Dispatch action per aggiornare le notifiche nello store
                      store.dispatch({
                        type: "notifications/updateFromWorker",
                        payload: newNotifications,
                        meta: {
                          // Aggiungi un flag per indicare l'origine dell'aggiornamento
                          source: "worker",
                          timestamp: Date.now(),
                        },
                      });

                      // Emetti un evento per notificare altri componenti
                      document.dispatchEvent(
                        new CustomEvent("notifications-updated", {
                          detail: {
                            timestamp: Date.now(),
                            source: "worker",
                            hasChanges: true,
                          },
                        }),
                      );
                    }
                  } catch (error) {
                    console.error("Error processing notification update:", error);
                  }
                }
                break;

              case "error":
                console.error("Worker error:", workerError);
                // Solo se l'errore non è causato da problemi di autenticazione o logout
                if (localStorage.getItem("token")) {
                  store.dispatch({
                    type: "notifications/setError",
                    payload: "Errore nel caricamento delle notifiche",
                  });
                }
                break;

              case "new_message":
                if (event.data.newMessagesInfo) {
                  try {
                    // Controlli di sicurezza
                    const state = store.getState();
                    if (!state?.notifications?.notifications) {
                      return;
                    }

                    // Processa ogni notifica con nuovi messaggi
                    event.data.newMessagesInfo.forEach((messageInfo) => {
                      const {
                        notificationId,
                        newMessageCount,
                        senderName,
                        messagePreview,
                        isRecent,
                      } = messageInfo;

                      // Trova la notifica attuale
                      const notification =
                        state.notifications.notifications?.find(
                          (n) => n.notificationId === parseInt(notificationId),
                        );
                      if (!notification) {
                        return;
                      }

                      // Evita notifiche troppo frequenti usando la cache
                      const notificationCache = (window._notificationCache =
                        window._notificationCache || {});
                      const now = Date.now();

                      // Se la notifica è già stata mostrata negli ultimi 30 secondi, ignora
                      if (
                        notificationCache[notificationId] &&
                        now - notificationCache[notificationId].timestamp < 30000
                      ) {
                        return;
                      }

                      // Ottieni ID utente corrente
                      let currentUserId = null;
                      try {
                        const userStr = localStorage.getItem("user");
                        if (userStr) {
                          const userData = JSON.parse(userStr);
                          currentUserId =
                            userData.userId ||
                            userData.UserId ||
                            userData.id ||
                            userData.ID;
                        }
                      } catch (e) {
                        console.error("Errore recupero userId:", e);
                      }

                      if (!currentUserId) {
                        currentUserId = -1;
                      }

                      // Mostra la notifica solo se non è recente
                      if (!isRecent) {
                        // Usa il servizio di notifiche centralizzato
                        if (window.notificationService) {
                          window.notificationService.notifyNewMessage(
                            messagePreview,
                            senderName,
                            notificationId,
                          );
                        } else {
                          // Fallback: Notifica diretta se il servizio non è disponibile
                          console.warn(
                            "NotificationService non disponibile, utilizzo notifica diretta",
                          );
                          if (
                            "Notification" in window &&
                            Notification.permission === "granted"
                          ) {
                            const webNotification = new Notification(senderName, {
                              body: messagePreview,
                              icon: "/icons/app-icon.png",
                              requireInteraction: true,
                            });

                            webNotification.onclick = () => {
                              window.focus();
                              if (typeof window.openChatModal === "function") {
                                window.openChatModal(notificationId);
                              }
                              webNotification.close();
                            };

                            setTimeout(() => webNotification.close(), 120000);
                          }
                        }

                        // Aggiorna la cache
                        notificationCache[notificationId] = {
                          timestamp: now,
                          messageCount: newMessageCount,
                        };

                        // Emetti eventi per aggiornare UI e contatori
                        document.dispatchEvent(
                          new CustomEvent("unread-count-changed", {
                            detail: {
                              notificationId,
                              timestamp: now,
                            },
                          }),
                        );

                        // Aggiorna la notifica nello store Redux
                        store.dispatch(fetchNotificationById(notificationId));
                      }
                    });
                  } catch (e) {
                    console.error("Errore elaborazione nuovi messaggi:", e);
                  }
                }
                break;
              case "ready":
                console.log("[NotificationsWorker] Worker ready and initialized");
                break;

              case "pong":
                console.log("[NotificationsWorker] Received pong response");
                break;
            }
          };

          // Imposta un gestore di errori per il worker
          worker.onerror = (error) => {
            console.error("[NotificationsWorker] Worker error:", error);
            
            // Se è un errore fatale, prova a riavviare il worker dopo un breve timeout
            if (currentToken && isWorkerInitialized) {
              setTimeout(() => {
                if (localStorage.getItem("token")) {
                  console.log("[NotificationsWorker] Attempting to restart worker after error");
                  store.dispatch({
                    type: "notifications/initialize",
                    meta: { forceWorkerInit: true }
                  });
                }
              }, 10000); // Attendi 10 secondi prima di tentare il riavvio
            }
          };

          // Trigger di un fetch iniziale
          worker.postMessage({
            type: "reload",
            data: {
              token,
              apiBaseUrl: config.API_BASE_URL,
            },
          });
        } else {
          console.warn("[NotificationsWorker] No token available, worker not initialized");
          cleanupWorkerResources();
        }
      } catch (error) {
        console.error("[NotificationsWorker] Error creating worker:", error);
        cleanupWorkerResources();
      }
    }

    // Gestisci reload delle notifiche
    else if (action.type === "notifications/reload") {
      if (!worker || !isWorkerInitialized) {
        console.warn(
          "[NotificationWorker] Cannot reload: worker not initialized",
        );
        return next(action);
      }

      const token = localStorage.getItem("token");
      
      // Verifica se il token è ancora valido prima di inviare il messaggio
      if (!token) {
        console.warn("[NotificationWorker] Cannot reload: token not available");
        cleanupWorkerResources();
        return next(action);
      }
      
      worker.postMessage({
        type: "reload",
        data: {
          token,
          apiBaseUrl: config.API_BASE_URL,
          highPriority: action.payload?.highPriority,
        },
      });
    }

    // Gestisci lo stop del worker
    else if (action.type === "notifications/stopWorker") {
      cleanupWorkerResources();
    }

    // Gestisci ping per verificare lo stato del worker
    else if (action.type === "notifications/pingWorker") {
      if (worker && isWorkerInitialized) {
        worker.postMessage({ type: "ping" });
      } else {
        console.warn("[NotificationWorker] Cannot ping: worker not initialized");
      }
    }
    
    // Gestisci ripristino dopo logout/login
    else if (action.type === "notifications/resetState") {
      return next({
        type: "notifications/RESET_STATE"
      });
    }

    // Processa l'azione normalmente
    return next(action);
  };
};

export default notificationsWorkerMiddleware;