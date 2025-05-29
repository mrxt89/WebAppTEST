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
      
      console.log("[NotificationsWorker] Worker globale terminato");
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
      console.log(`[NotificationsWorker] RefCount decrementato a ${globalWorkerRefCount}`);
    }
    
    if (globalWorkerRefCount === 0) {
      cleanupWorkerResources();
    }
  });
  
  document.addEventListener("reset-redux-store", () => {
    store.dispatch({ type: "notifications/resetState" });
  });

  const initWorker = () => {
    // IMPORTANTE: Non inizializzare il worker se siamo in una finestra standalone
    const isStandalone = window.location.pathname.includes('standalone-chat');
    
    if (isStandalone) {
      console.log("[NotificationsWorker] Standalone window - usando worker esistente");
      return;
    }

    // Se esiste già un worker globale, riusalo
    if (globalWorker && !globalWorker.terminated) {
      console.log("[NotificationsWorker] Riutilizzo worker esistente");
      worker = globalWorker;
      isWorkerInitialized = true;
      globalWorkerRefCount++;
      window.notificationWorker = worker;
      return;
    }

    // Crea nuovo worker solo se non esiste
    console.log("[NotificationsWorker] Creazione nuovo worker singleton");
    globalWorker = new NotificationWorker();
    worker = globalWorker;
    isWorkerInitialized = true;
    globalWorkerRefCount = 1;
    
    window.notificationWorker = worker;
    
    const token = localStorage.getItem("token");

    if (token) {
      worker.postMessage({
        type: "init",
        data: {
          token,
          apiBaseUrl: config.API_BASE_URL,
          debug: true,
          isStandalone: false,
          windowId: window.WINDOW_ID || Date.now().toString(36),
        },
      });

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
                const currentState = store.getState();
                const currentNotifications =
                  currentState.notifications?.notifications || [];

                const hasChanges = hasNotificationChanges(
                  currentNotifications,
                  newNotifications,
                );

                if (hasChanges) {
                  store.dispatch({
                    type: "notifications/updateFromWorker",
                    payload: newNotifications,
                    meta: {
                      source: "worker",
                      timestamp: Date.now(),
                    },
                  });

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
            if (localStorage.getItem("token")) {
              store.dispatch({
                type: "notifications/setError",
                payload: "Errore nel caricamento delle notifiche",
              });
            }
            break;

          case "new_message":
            console.log("🚨 NEW_MESSAGE EVENT RICEVUTO:", event.data);
            if (event.data.newMessagesInfo) {
              try {
                const state = store.getState();
                if (!state?.notifications?.notifications) {
                  return;
                }
          
                event.data.newMessagesInfo.forEach((messageInfo) => {
                  const {
                    notificationId,
                    newMessageCount,
                    senderName,
                    messagePreview,
                    isRecent,
                  } = messageInfo;
          
                  // MODIFICA CHIAVE: Se la chat è aperta, ricarica TUTTI i messaggi
                  if (state.notifications.openChatIds.has(parseInt(notificationId))) {
                    console.log(`🔄 Middleware: Chat ${notificationId} è aperta, ricaricando dati completi...`);
                    
                    // Usa fetchNotificationById per caricare tutti i messaggi
                    store.dispatch(fetchNotificationById(parseInt(notificationId), true));
                    
                    // Emetti anche l'evento per i componenti che ascoltano
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
                  }
          
                  const notification =
                    state.notifications.notifications?.find(
                      (n) => n.notificationId === parseInt(notificationId),
                    );
                  if (!notification) {
                    return;
                  }
          
                  const notificationCache = (window._notificationCache =
                    window._notificationCache || {});
                  const now = Date.now();
          
                  if (
                    notificationCache[notificationId] &&
                    now - notificationCache[notificationId].timestamp < 30000
                  ) {
                    return;
                  }
          
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
          
                  if (!isRecent) {
                    // Log per debug
                    console.log("🔔 Nuovo messaggio non recente, tentativo notifica:", {
                      notificationId,
                      senderName,
                      messagePreview,
                      hasNotificationService: !!window.notificationService,
                      permission: Notification.permission
                    });
                  
                    // SEMPRE tenta di mostrare una notifica web se i permessi sono OK
                    if ("Notification" in window && Notification.permission === "granted") {
                      // Controlla se le notifiche web sono abilitate
                      const webNotificationsEnabled = localStorage.getItem('webNotificationsEnabled') === 'true';
                      
                      if (webNotificationsEnabled) {
                        console.log("✅ Creazione notifica web...");
                        
                        try {
                          const webNotification = new Notification(senderName || "Nuovo messaggio", {
                            body: messagePreview || "Hai ricevuto un nuovo messaggio",
                            icon: "/icons/app-icon.png",
                            tag: `chat-${notificationId}`,
                            requireInteraction: true,
                            silent: false // Assicurati che non sia silenziosa
                          });
                  
                          webNotification.onclick = () => {
                            console.log("Notifica cliccata");
                            window.focus();
                            
                            // Prova prima openChatModal globale
                            if (typeof window.openChatModal === "function") {
                              window.openChatModal(notificationId);
                            } 
                            // Altrimenti usa callOpenChatModal
                            else {
                              import('../features/notifications/notificationsSlice').then(module => {
                                if (module.callOpenChatModal) {
                                  module.callOpenChatModal(notificationId);
                                }
                              });
                            }
                            
                            webNotification.close();
                          };
                  
                          // Chiudi dopo 2 minuti
                          setTimeout(() => {
                            try {
                              webNotification.close();
                            } catch (e) {
                              // Ignora errori
                            }
                          }, 120000);
                          
                          console.log("✅ Notifica web creata con successo");
                        } catch (error) {
                          console.error("❌ Errore creazione notifica web:", error);
                        }
                      } else {
                        console.log("⚠️ Notifiche web disabilitate nelle impostazioni");
                      }
                    } else {
                      console.log("⚠️ Permessi notifica non concessi o API non disponibile");
                    }
                  
                    // Usa anche NotificationService se disponibile (per suoni e notifiche in-app)
                    if (window.notificationService && typeof window.notificationService.notifyNewMessage === 'function') {
                      console.log("📢 Chiamata a NotificationService.notifyNewMessage");
                      window.notificationService.notifyNewMessage(
                        messagePreview,
                        senderName,
                        notificationId,
                      );
                    }
                  
                    // Aggiorna cache
                    notificationCache[notificationId] = {
                      timestamp: now,
                      messageCount: newMessageCount,
                    };
                  
                    // Emetti evento
                    document.dispatchEvent(
                      new CustomEvent("unread-count-changed", {
                        detail: {
                          notificationId,
                          timestamp: now,
                        },
                      }),
                    );
                  
                    // Fetch notifica se chat non aperta
                    if (!state.notifications.openChatIds.has(parseInt(notificationId))) {
                      store.dispatch(fetchNotificationById(notificationId));
                    }
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

      worker.onerror = (error) => {
        console.error("[NotificationsWorker] Worker error:", error);
        
        if (currentToken && isWorkerInitialized) {
          setTimeout(() => {
            if (localStorage.getItem("token")) {
              console.log("[NotificationsWorker] Attempting to restart worker after error");
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

    if (action.type === "notifications/reload") {
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
      
      worker.postMessage({
        type: "reload",
        data: {
          token,
          apiBaseUrl: config.API_BASE_URL,
          highPriority: action.payload?.highPriority,
        },
      });
    }

    else if (action.type === "notifications/stopWorker") {
      if (globalWorkerRefCount > 0) {
        globalWorkerRefCount--;
      }
      
      if (globalWorkerRefCount === 0) {
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