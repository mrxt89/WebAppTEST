// src/redux/middleware/notificationsWorkerMiddleware.js
import NotificationWorker from "../../workers/notificationWorker.js?worker";
import { config } from "../../config";
import {
  fetchNotifications,
  fetchNotificationById,
  addUnreadMessage,
} from "../features/notifications/notificationsSlice";

// Worker singleton globale
let globalWorker = null;
let globalWorkerRefCount = 0;
let worker = null;
let isWorkerInitialized = false;
let lastNotificationUpdate = 0;
const UPDATE_THROTTLE_MS = 3000;

function hasNotificationChanges(currentNotifications, newNotifications) {
  if (currentNotifications.length !== newNotifications.length) {
    return true;
  }

  const currentMap = new Map();
  currentNotifications.forEach((notification) => {
    if (notification && notification.notificationId) {
      currentMap.set(notification.notificationId, {
        isReadByUser: notification.isReadByUser,
        isClosed: notification.isClosed,
        pinned: notification.pinned,
        favorite: notification.favorite,
        isMuted: notification.isMuted,
        archived: notification.archived,
        chatLeft: notification.chatLeft,
        lastMessage: notification.lastMessage,
        messagesCount: Array.isArray(notification.messages)
          ? notification.messages.length
          : typeof notification.messages === "string"
            ? JSON.parse(notification.messages || "[]").length
            : 0,
      });
    }
  });

  return newNotifications.some((notification) => {
    if (!notification || !notification.notificationId) return false;

    const current = currentMap.get(notification.notificationId);

    if (!current) return true;

    const newMessagesCount = Array.isArray(notification.messages)
      ? notification.messages.length
      : typeof notification.messages === "string"
        ? JSON.parse(notification.messages || "[]").length
        : 0;

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

function cleanupWorkerResources() {
  try {
    if (globalWorker) {
      globalWorker.postMessage({ type: "stop" });
      globalWorker.terminate();
      globalWorker = null;
      worker = null;
      globalWorkerRefCount = 0;
      isWorkerInitialized = false;
      
      if (window.notificationWorker) {
        delete window.notificationWorker;
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error("[NotificationsWorker] Errore durante cleanup:", error);
    return false;
  }
}

const notificationsWorkerMiddleware = (store) => {
  document.addEventListener("stop-notification-worker", () => {
    if (globalWorkerRefCount > 0) {
      globalWorkerRefCount--;
    }
    
    if (globalWorkerRefCount === 0) {
      cleanupWorkerResources();
    }
  });
  
  document.addEventListener("reset-redux-store", () => {
    store.dispatch({ type: "notifications/resetState" });
  });

  // MODIFICA: Funzione migliorata per aggiornare le chat aperte nel worker
  const updateWorkerOpenChats = () => {
    if (worker && isWorkerInitialized) {
      // Usa setTimeout per evitare di chiamare getState durante l'esecuzione del reducer
      setTimeout(() => {
        const state = store.getState();
        const openChatIds = Array.from(state.notifications?.openChatIds || []);
      
      
        worker.postMessage({
          type: "update_open_chats",
          data: {
            openChatIds: openChatIds
          }
        });
      }, 0);
    }
  };

  // NUOVO: Ascolta richieste di sincronizzazione manuale
  document.addEventListener("sync-open-chats", () => {
    updateWorkerOpenChats();
  });

  // NUOVO: Sincronizza periodicamente le chat aperte con il worker
  let syncInterval = null;

  const initWorker = () => {
    // IMPORTANTE: Non inizializzare il worker se siamo in una finestra standalone
    const isStandalone = window.location.pathname.includes('standalone-chat');
    
    if (isStandalone) {
      return;
    }

    // Se esiste già un worker globale, riusalo
    if (globalWorker && !globalWorker.terminated) {
      worker = globalWorker;
      isWorkerInitialized = true;
      globalWorkerRefCount++;
      window.notificationWorker = worker;
      
      // Aggiorna le chat aperte nel worker riutilizzato
      updateWorkerOpenChats();
      return;
    }

    // Crea nuovo worker solo se non esiste
    globalWorker = new NotificationWorker();
    worker = globalWorker;
    isWorkerInitialized = true;
    globalWorkerRefCount = 1;
    
    window.notificationWorker = worker;
    
    const token = localStorage.getItem("token");

    if (token) {
      // Ottieni l'userId
      let userId = null;
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const userData = JSON.parse(userStr);
          userId = userData.userId || userData.UserId || userData.id || userData.ID;
        }
      } catch (e) {
        console.error("Error getting userId for worker:", e);
      }

      // Log iniziale delle chat aperte

      worker.postMessage({
        type: "init",
        data: {
          token,
          apiBaseUrl: config.API_BASE_URL,
          debug: true,
          isStandalone: false,
          windowId: window.WINDOW_ID || Date.now().toString(36),
          userId: userId,
        },
      });

      // Invia subito le chat aperte al worker
      updateWorkerOpenChats();

      // NUOVO: Avvia sincronizzazione periodica
      if (syncInterval) {
        clearInterval(syncInterval);
      }
      syncInterval = setInterval(() => {
        updateWorkerOpenChats();
      }, 5000); // Ogni 5 secondi

      worker.onmessage = (event) => {
        const currentToken = localStorage.getItem("token");
        if (!currentToken) {
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
          unreadCount,
          metadata,
          updates,
          timestamp
        } = event.data;
        
        switch (type) {
          case "auth_error":
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            document.dispatchEvent(new CustomEvent("session-expired"));
            break;
      
          case "notifications":
            const now = Date.now();
            if (now - lastNotificationUpdate < UPDATE_THROTTLE_MS) {
              return;
            }
      
            lastNotificationUpdate = now;
      
            if (newNotifications) {
              try {
                // Usa setTimeout per evitare di chiamare getState durante l'esecuzione del reducer
                setTimeout(() => {
                  const currentState = store.getState();
                  const currentNotifications = currentState.notifications?.notifications || [];
                  const openChatIds = Array.isArray(currentState.notifications?.openChatIds)
                    ? currentState.notifications.openChatIds
                    : [];

                  const hasChanges = hasNotificationChanges(currentNotifications, newNotifications);

                  if (hasChanges) {
                    store.dispatch({
                      type: "notifications/updateFromWorker",
                      payload: newNotifications.map(notif => {
                        if (openChatIds.includes(notif.notificationId)) {
                          return {
                            ...notif,
                            messages: []
                          };
                        }
                        return notif;
                      }),
                      meta: {
                        source: "worker",
                        timestamp: Date.now(),
                      },
                    });
                  }
                }, 0);
              } catch (error) {
                console.error("Error processing notification update:", error);
              }
            }
            break;
      
            case "unread_count_update":
              // Usa setTimeout per evitare di chiamare getState durante l'esecuzione del reducer
              setTimeout(() => {
                const state = store.getState();
                const { pendingUnreadCount, unreadCountLastModified, optimisticUpdateInProgress } = state.notifications;
              
              // Se c'è una modifica locale recente o un aggiornamento ottimistico in corso, ignora l'update del worker
              if ((unreadCountLastModified && Date.now() - unreadCountLastModified < 5000) || optimisticUpdateInProgress) {
                console.log(`🚫 Worker: Ignorando aggiornamento contatore (modifica locale in corso o aggiornamento ottimistico)`);
                return;
              }
              
              // Altrimenti aggiorna normalmente
              store.dispatch({
                type: "notifications/updateUnreadCount",
                payload: unreadCount
              });
              
                // Emetti evento per aggiornare l'header
                document.dispatchEvent(
                  new CustomEvent("unread-count-changed", {
                    detail: {
                      unreadCount,
                      timestamp,
                      source: "worker-update"
                    },
                  }),
                );
              }, 0);
              break;
      
            case "partial_notifications_update":
              // NUOVO: Aggiornamento parziale per notifiche paginate
              if (metadata && newNotifications) {
                // Usa setTimeout per evitare di chiamare getState durante l'esecuzione del reducer
                setTimeout(() => {
                  const currentState = store.getState();
                  const currentPage = currentState.notifications?.notificationsPagination?.currentPage || 1;
                
                // MODIFICA: Aggiorna sempre le notifiche paginate, non solo alla prima pagina
                store.dispatch({
                  type: "notifications/updatePaginatedNotifications",
                  payload: {
                    notifications: newNotifications,
                    metadata,
                    source: "worker"
                  }
                });
                
                // NUOVO: Emetti un evento per forzare l'aggiornamento della sidebar
                if (newNotifications && newNotifications.length > 0) {
                  // Trova quali notifiche hanno nuovi messaggi
                  const notificationsWithNewMessages = newNotifications.filter(n => {
                    const currentNotif = currentState.notifications?.paginatedNotifications?.find(
                      pn => pn.notificationId === n.notificationId
                    );
                    return !currentNotif || 
                           n.messageCount > (currentNotif.messageCount || 0) ||
                           new Date(n.lastMessage) > new Date(currentNotif.lastMessage || 0);
                  });
                  
                    if (notificationsWithNewMessages.length > 0) {
                      document.dispatchEvent(
                        new CustomEvent("sidebar-notifications-update", {
                          detail: {
                            notifications: notificationsWithNewMessages,
                            timestamp: Date.now()
                          }
                        })
                      );
                    }
                  }
                }, 0);
              }
              break;
      
          case "open_chat_update":
            // Gestione aggiornamenti per chat aperte
            if (updates && updates.length > 0) {
              
              updates.forEach(update => {
                // Fetch completo per ogni chat aperta con nuovi messaggi
                store.dispatch(fetchNotificationById(parseInt(update.notificationId), true));
                
                // Emetti eventi per aggiornare UI
                document.dispatchEvent(
                  new CustomEvent("open-chat-new-message", {
                    detail: {
                      notificationId: parseInt(update.notificationId),
                      messageCount: update.newMessageCount,
                      hasNewMessages: true,
                      reason: "new-message"
                    },
                  }),
                );
              });
            }
            break;
      
          case "error":
            console.error("Worker error:", workerError);
            if (localStorage.getItem("token")) {
              store.dispatch({
                type: "notifications/setError",
                payload: "Errore nel caricamento delle notifiche",
              });
            }
            break;

            
            case "new_message":
              if (event.data.newMessagesInfo) {
                // Usa setTimeout per evitare di chiamare getState durante l'esecuzione del reducer
                setTimeout(() => {
                  try {
                    const state = store.getState();
                    if (!state?.notifications) {
                      return;
                    }

                    const doNotDisturbEnabled = localStorage.getItem("doNotDisturbEnabled") === "true";
                  
                    if (doNotDisturbEnabled) {
                      console.log("[Middleware] DND abilitato, skip notifica");
                    }

                    let currentUserId = null;
                    try {
                      const userStr = localStorage.getItem("user");
                      if (userStr) {
                        const userData = JSON.parse(userStr);
                        currentUserId = userData.userId || userData.UserId || userData.id;
                      }
                    } catch (e) {
                      console.error("Errore recupero userId:", e);
                    }

                    // IMPORTANTE: Marca che stiamo processando nuovi messaggi
                    // Questo previene interferenze con altri aggiornamenti del contatore
                    store.dispatch({
                      type: "notifications/setPendingUnreadCount",
                      payload: {
                        count: state.notifications.unreadCount,
                        timestamp: Date.now()
                      }
                    });

                    event.data.newMessagesInfo.forEach((messageInfo) => {
                      const {
                        notificationId,
                        newMessageCount,
                        senderName,
                        messagePreview,
                        isRecent,
                        isOwnMessage,
                        isOpenChat,
                        senderId
                      } = messageInfo;

                      if (isOwnMessage) {
                        console.log(`[Middleware] Skip messaggio proprio per chat ${notificationId}`);
                        return;
                      }

                      const isActuallyOpen = Array.isArray(state.notifications.openChatIds)
                        ? state.notifications.openChatIds.includes(parseInt(notificationId))
                        : false;
                      
                      console.log(`[Middleware] Nuovo messaggio per chat ${notificationId}, aperta: ${isActuallyOpen}`);

                      if (isActuallyOpen) {
                        console.log(`[Middleware] Chat ${notificationId} è aperta, aggiorno solo i dati`);
                        store.dispatch(fetchNotificationById(parseInt(notificationId), true));
                      
                      document.dispatchEvent(
                        new CustomEvent("open-chat-new-message", {
                          detail: {
                            notificationId: parseInt(notificationId),
                            messageCount: newMessageCount,
                            hasNewMessages: true,
                            reason: "new-message"
                          },
                        }),
                      );
                      
                      document.dispatchEvent(
                        new CustomEvent("reload-open-chat", {
                          detail: {
                            notificationId: parseInt(notificationId),
                            messageCount: newMessageCount,
                            hasNewMessages: true,
                            reason: "new-message"
                          },
                        }),
                      );
                      
                      return;
                    }

                    // IMPORTANTE: Cerca la notifica in TUTTI i possibili posti
                    let notification = null;
                    
                    // Prima cerca in paginatedNotifications
                    if (state.notifications.paginatedNotifications) {
                      notification = state.notifications.paginatedNotifications.find(
                        (n) => n.notificationId === parseInt(notificationId)
                      );
                    }
                    
                    // Se non trovata, cerca in notifications
                    if (!notification && state.notifications.notifications) {
                      notification = state.notifications.notifications.find(
                        (n) => n.notificationId === parseInt(notificationId)
                      );
                    }
                    
                    if (!notification) {
                      console.warn(`[Middleware] Notifica ${notificationId} non trovata nello store`);
                    }

                    const notificationCache = (window._notificationCache = window._notificationCache || {});
                    const now = Date.now();

                    if (
                      notificationCache[notificationId] &&
                      now - notificationCache[notificationId].timestamp < 30000
                    ) {
                      console.log(`[Middleware] Skip notifica duplicata per ${notificationId}`);
                      return;
                    }

                    if (!currentUserId) {
                      currentUserId = -1;
                    }

                    if (!doNotDisturbEnabled) {
                      // Usa SOLO il NotificationService per notifiche
                      if (window.notificationService && typeof window.notificationService.notifyNewMessage === 'function') {
                        console.log(`[Middleware] Invio notifica per chat ${notificationId}`);
                        window.notificationService.notifyNewMessage(
                          messagePreview,
                          senderName,
                          notificationId,
                          senderId
                        );
                      } else {
                        console.error("[Middleware] NotificationService non disponibile");
                      }
                    } else {
                      console.log(`[Middleware] DND attivo, notifica salvata per chat ${notificationId}`);
                      
                      if (window.notificationService && window.notificationService.dndNotifiedChatIds) {
                        window.notificationService.dndNotifiedChatIds.add(notificationId);
                      }
                    }

                    // Aggiorna cache notifiche
                    notificationCache[notificationId] = {
                      timestamp: now,
                      messageCount: newMessageCount,
                    };

                    // NON emettere eventi che possono interferire con il contatore
                    
                    // Aggiorna la notifica nello store
                    store.dispatch(fetchNotificationById(notificationId, false));
                  });
                    
                    // IMPORTANTE: Forza un reload delle notifiche per ottenere il contatore aggiornato
                    // con un delay leggermente maggiore per evitare race conditions
                    if (event.data.newMessagesInfo.length > 0) {
                      console.log("[Middleware] Forzando reload notifiche per aggiornare contatore...");
                      
                      // Delay maggiore per dare tempo al backend di aggiornare completamente
                      setTimeout(() => {
                        // Clear pending count prima del reload
                        store.dispatch({
                          type: "notifications/clearPendingUnreadCount"
                        });
                        
                        // Usa l'azione di reload del worker
                        store.dispatch({
                          type: "notifications/reload",
                          payload: { highPriority: true }
                        });
                      }, 1000); // Aumentato a 1 secondo
                    }
                    
                  } catch (e) {
                    console.error("Errore elaborazione nuovi messaggi:", e);
                  }
                }, 0);
              }
              break;

          case "ready":
           
            break;
      
          case "pong":
           
            break;
      
          case "attachments_update":
            // Gestione aggiornamento allegati
            if (event.data.notificationIds && Array.isArray(event.data.notificationIds)) {
              event.data.notificationIds.forEach(notificationId => {
                store.dispatch(fetchNotificationAttachments(notificationId));
              });
            }
            break;
      
          default:
            console.warn("[NotificationsWorker] Unknown message type:", type);
        }
      };

      worker.onerror = (error) => {
        console.error("[NotificationsWorker] Worker error:", error);
        
        if (currentToken && isWorkerInitialized) {
          setTimeout(() => {
            if (localStorage.getItem("token")) {
             
              globalWorker = null;
              globalWorkerRefCount = 0;
              store.dispatch({
                type: "notifications/initialize",
                meta: { forceWorkerInit: true }
              });
            }
          }, 10000);
        }
      };

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
  };

  return (next) => (action) => {
    // IMPORTANTE: Non inizializzare il worker se siamo in una finestra standalone
    const isStandalone = window.location.pathname.includes('standalone-chat');
    
    // Solo inizializza se non siamo in standalone e non è già inizializzato
    if (!isWorkerInitialized && !isStandalone && !globalWorker) {
      initWorker();
    }

    if (action.type === "notifications/sendNotification/fulfilled") {
      const result = next(action);
      
      // Forza un refresh ad alta priorità dopo l'invio del messaggio
      if (worker && isWorkerInitialized && action.payload?.notificationId) {
        // Ottieni l'userId
        let userId = null;
        try {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            const userData = JSON.parse(userStr);
            userId = userData.userId || userData.UserId || userData.id || userData.ID;
          }
        } catch (e) {
          console.error("Error getting userId for reload:", e);
        }

        setTimeout(() => {
          worker.postMessage({
            type: "reload",
            data: {
              token: localStorage.getItem("token"),
              apiBaseUrl: config.API_BASE_URL,
              highPriority: true,
              userId: userId,
            },
          });
        }, 100);
      }
      
      return result;
    }

    else if (action.type === "notifications/registerOpenChat") {
      const result = next(action);
      updateWorkerOpenChats();
      return result;
    }

    else if (action.type === "notifications/unregisterOpenChat") {
      const result = next(action);
      updateWorkerOpenChats(); // IMPORTANTE: aggiorna il worker
      return result;
    }

    // MODIFICA: Intercetta updateFromWorker per gestire le chat aperte
    else if (action.type === "notifications/updateFromWorker") {
      // Usa setTimeout per evitare di chiamare getState durante l'esecuzione del reducer
      setTimeout(() => {
        const state = store.getState();
        const openChatIds = Array.isArray(state.notifications?.openChatIds)
          ? state.notifications.openChatIds
          : [];

        // Marca come lette le notifiche delle chat aperte
        if (action.payload && Array.isArray(action.payload)) {
          action.payload = action.payload.map(notification => {
            if (openChatIds.includes(notification.notificationId)) {
              return { ...notification, isReadByUser: true };
            }
            return notification;
          });
        }

        return next(action);
      }, 0);
    }

    else if (action.type === "notifications/reload") {
      if (!worker || !isWorkerInitialized) {
        console.warn(
          "[NotificationWorker] Cannot reload: worker not initialized",
        );
        return next(action);
      }

      const token = localStorage.getItem("token");
      
      if (!token) {
        console.warn("[NotificationWorker] Cannot reload: token not available");
        cleanupWorkerResources();
        return next(action);
      }
      
      // Ottieni l'userId aggiornato
      let userId = null;
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const userData = JSON.parse(userStr);
          userId = userData.userId || userData.UserId || userData.id || userData.ID;
        }
      } catch (e) {
        console.error("Error getting userId for reload:", e);
      }

      worker.postMessage({
        type: "reload",
        data: {
          token,
          apiBaseUrl: config.API_BASE_URL,
          highPriority: action.payload?.highPriority,
          userId: userId,
        },
      });
      
      // Aggiorna anche le chat aperte dopo il reload
      updateWorkerOpenChats();
    }

    else if (action.type === "notifications/stopWorker") {
      if (globalWorkerRefCount > 0) {
        globalWorkerRefCount--;
      }
      
      if (globalWorkerRefCount === 0) {
        if (syncInterval) {
          clearInterval(syncInterval);
          syncInterval = null;
        }
        cleanupWorkerResources();
      }
    }

    else if (action.type === "notifications/pingWorker") {
      if (worker && isWorkerInitialized) {
        worker.postMessage({ type: "ping" });
      } else {
        console.warn("[NotificationWorker] Cannot ping: worker not initialized");
      }
    }
    
    else if (action.type === "notifications/resetState") {
      return next({
        type: "notifications/RESET_STATE"
      });
    }

    return next(action);
  };
};

export default notificationsWorkerMiddleware;