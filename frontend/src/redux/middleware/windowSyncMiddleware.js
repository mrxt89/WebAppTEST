// src/redux/middleware/windowSyncMiddleware.js
import { config } from "../../config";

// Identificatore univoco per questa istanza di finestra
const WINDOW_ID =
  Date.now().toString(36) + Math.random().toString(36).substring(2);
let isMaster = false;
let masterHeartbeatTimeout = null;
let lastMasterPing = 0;

// Costante per tempo massimo senza heartbeat prima di assumere che il master sia morto
const MASTER_TIMEOUT_MS = 5000; // 5 secondi

// Gestione dello stato master
const checkMasterStatus = () => {
  const currentMaster = localStorage.getItem("chat_master_window");
  const lastHeartbeat = parseInt(
    localStorage.getItem("chat_master_heartbeat") || "0",
  );

  // Se non c'è master o è scaduto, diventa master
  if (!currentMaster || Date.now() - lastHeartbeat > MASTER_TIMEOUT_MS) {
    localStorage.setItem("chat_master_window", WINDOW_ID);
    localStorage.setItem("chat_master_heartbeat", Date.now().toString());
    isMaster = true;
    return true;
  }

  return currentMaster === WINDOW_ID;
};

// Azioni da sincronizzare tra finestre
const SYNC_ACTIONS = [
  "notifications/updateFromWorker",
  "notifications/sendNotification",
  "notifications/toggleReadUnread",
  "notifications/archiveChat",
  "notifications/unarchiveChat",
  "notifications/closeChat",
  "notifications/reopenChat",
  "notifications/leaveChat",
  "notifications/togglePin",
  "notifications/toggleFavorite",
  "notifications/updateChatTitle",
  "notifications/toggleMuteChat",
  // Aggiungi azioni per le chat standalone
  "notifications/registerStandaloneChat",
  "notifications/unregisterStandaloneChat",
  "notifications/initializeStandaloneChats",
  "notifications/cleanupStandaloneChats",
];

// Azioni che richiedono un refresh immediato dopo essere sincronizzate
const IMMEDIATE_REFRESH_ACTIONS = [
  "notifications/sendNotification",
  "notifications/registerStandaloneChat",
  "notifications/unregisterStandaloneChat",
];

const windowSyncMiddleware = (store) => {
  // Inizializza come master se necessario
  isMaster = checkMasterStatus();

  // Configura heartbeat periodico se è master
  if (isMaster) {
    masterHeartbeatTimeout = setInterval(() => {
      localStorage.setItem("chat_master_heartbeat", Date.now().toString());
    }, 1000);
  }

  // Verifica regolare dello stato master per ripristino in caso di master morto
  const masterCheckInterval = setInterval(() => {
    const wasMaster = isMaster;
    isMaster = checkMasterStatus();

    if (!wasMaster && isMaster) {
      // Avvia il heartbeat
      masterHeartbeatTimeout = setInterval(() => {
        localStorage.setItem("chat_master_heartbeat", Date.now().toString());
      }, 1000);

      // Forza un aggiornamento quando diventa master
      store.dispatch({
        type: "notifications/reload",
        payload: { highPriority: true },
        meta: { newMaster: true },
      });
    }
  }, 2000);

  // Listener per gli eventi storage
  const handleStorageChange = (event) => {
    if (event.key === "redux_window_sync" && event.newValue) {
      try {
        const syncData = JSON.parse(event.newValue);

        // Ignora eventi che provengono da questa finestra
        if (syncData.source === WINDOW_ID) return;

        // Applica l'azione sincronizzata
        store.dispatch({
          type: syncData.action.type,
          payload: syncData.action.payload,
          meta: { ...syncData.action.meta, isFromSync: true },
        });

        // Se l'azione richiede un refresh immediato, forza un reload
        if (IMMEDIATE_REFRESH_ACTIONS.includes(syncData.action.type)) {
          setTimeout(() => {
            store.dispatch({
              type: "notifications/reload",
              payload: { highPriority: true },
            });
          }, 300);
        }
      } catch (err) {
        console.error("[WindowSync] Error processing window sync:", err);
      }
    }

    // Controlla anche eventi di heartbeat del master
    if (event.key === "chat_master_heartbeat") {
      lastMasterPing = Date.now();
    }

    // Controlla lo stato master quando cambia
    if (
      event.key === "chat_master_window" ||
      event.key === "chat_master_heartbeat"
    ) {
      const wasMaster = isMaster;
      isMaster = checkMasterStatus();

      // Se lo stato master è cambiato
      if (wasMaster !== isMaster) {
        // Se è diventato master, inizializza il heartbeat
        if (isMaster) {
          masterHeartbeatTimeout = setInterval(() => {
            localStorage.setItem(
              "chat_master_heartbeat",
              Date.now().toString(),
            );
          }, 1000);

          // Forza un aggiornamento quando diventa master
          store.dispatch({
            type: "notifications/reload",
            payload: { highPriority: true },
            meta: { newMaster: true },
          });
        } else if (masterHeartbeatTimeout) {
          // Se non è più master, ferma il heartbeat
          clearInterval(masterHeartbeatTimeout);
          masterHeartbeatTimeout = null;
        }
      }
    }

    // Gestione degli eventi di sincronizzazione per chat standalone
    if (event.key === "standalone_chats" && event.newValue) {
      try {
        const standaloneChats = JSON.parse(event.newValue);

        // Forza l'inizializzazione delle chat standalone
        store.dispatch({
          type: "notifications/initializeStandaloneChats",
          payload: standaloneChats,
          meta: { isFromSync: true },
        });
      } catch (err) {
        console.error(
          "[WindowSync] Error processing standalone chats sync:",
          err,
        );
      }
    }
  };

  window.addEventListener("storage", handleStorageChange);

  // Gestisce ritorno online con reconnect
  window.addEventListener("online", () => {
    // Controlla se questa finestra dovrebbe essere master
    const shouldBeMaster = checkMasterStatus();

    if (shouldBeMaster !== isMaster) {
      if (shouldBeMaster) {
        isMaster = true;

        // Avvia heartbeat
        if (!masterHeartbeatTimeout) {
          masterHeartbeatTimeout = setInterval(() => {
            localStorage.setItem(
              "chat_master_heartbeat",
              Date.now().toString(),
            );
          }, 1000);
        }
      }
    }

    // Forza un aggiornamento per sincronizzare
    store.dispatch({
      type: "notifications/reload",
      payload: { highPriority: true },
    });
  });

  // Pulisci quando la finestra viene chiusa
  window.addEventListener("beforeunload", () => {
    // Pulisci gli intervalli
    if (masterHeartbeatTimeout) {
      clearInterval(masterHeartbeatTimeout);
      masterHeartbeatTimeout = null;
    }

    if (masterCheckInterval) {
      clearInterval(masterCheckInterval);
    }

    // Se è master, rimuovi lo stato master
    if (isMaster) {
      localStorage.removeItem("chat_master_window");
    }

    // Se è una finestra standalone, rimuovi e notifica le altre finestre
    const isStandalone = window.location.pathname.includes("/standalone-chat/");
    if (isStandalone) {
      try {
        // Estrai l'ID della chat dall'URL
        const pathParts = window.location.pathname.split("/");
        const chatId = parseInt(pathParts[pathParts.length - 1]);

        if (!isNaN(chatId)) {
          // Rimuovi questa chat dalla lista delle standalone
          const current = JSON.parse(
            localStorage.getItem("standalone_chats") || "[]",
          );
          const updated = current.filter((id) => id !== chatId);
          localStorage.setItem("standalone_chats", JSON.stringify(updated));

          // Dispatch dell'azione di cleanup (se c'è tempo)
          try {
            // Notify master window that this chat is now closed
            const syncData = {
              source: WINDOW_ID,
              timestamp: Date.now(),
              action: {
                type: "notifications/unregisterStandaloneChat",
                payload: chatId,
              },
            };

            localStorage.setItem("redux_window_sync", JSON.stringify(syncData));
          } catch (e) {
            console.error("Error notifying chat closure:", e);
          }
        }
      } catch (e) {
        console.error("Error cleaning up standalone chat:", e);
      }
    }
  });

  // Esporta funzioni utili per il debugging
  window.chatSyncDebug = {
    isMaster: () => isMaster,
    forceReload: () => {
      store.dispatch({
        type: "notifications/reload",
        payload: { highPriority: true },
      });
    },
    becomeMaster: () => {
      localStorage.setItem("chat_master_window", WINDOW_ID);
      localStorage.setItem("chat_master_heartbeat", Date.now().toString());
    },
    lastPing: () => lastMasterPing,
  };

  return (next) => (action) => {
    // Gestione speciale per azioni worker (solo il master deve eseguire il polling)
    if (
      action.type === "notifications/initialize" &&
      !isMaster &&
      !action.meta?.forceWorkerInit
    ) {
      return next({
        ...action,
        meta: { ...action.meta, skipWorkerInit: true },
      });
    }

    // Se è un reload forzato da una nuova finestra master
    if (
      action.type === "notifications/reload" &&
      action.meta?.newMaster &&
      isMaster
    ) {
      // Assicurati che sia trattato come prioritario
      action.payload = { ...action.payload, highPriority: true };
    }

    // Gestione speciale per la registrazione delle chat standalone
    if (
      action.type === "notifications/registerStandaloneChat" &&
      !action.meta?.isFromSync
    ) {
      // Salva anche in localStorage per persistenza tra refresh
      try {
        const current = JSON.parse(
          localStorage.getItem("standalone_chats") || "[]",
        );
        if (!current.includes(parseInt(action.payload))) {
          const updated = [...current, parseInt(action.payload)];
          localStorage.setItem("standalone_chats", JSON.stringify(updated));
        }
      } catch (e) {
        console.error("Error saving standalone chat to localStorage:", e);
      }
    }

    // Gestione speciale per la rimozione delle chat standalone
    if (
      action.type === "notifications/unregisterStandaloneChat" &&
      !action.meta?.isFromSync
    ) {
      // Aggiorna localStorage
      try {
        const current = JSON.parse(
          localStorage.getItem("standalone_chats") || "[]",
        );
        const updated = current.filter((id) => id !== parseInt(action.payload));
        localStorage.setItem("standalone_chats", JSON.stringify(updated));
      } catch (e) {
        console.error("Error removing standalone chat from localStorage:", e);
      }
    }

    // Esegui l'azione normalmente
    const result = next(action);

    // Verifica se l'azione dovrebbe essere sincronizzata
    const shouldSync =
      SYNC_ACTIONS.includes(action.type) &&
      !action.meta?.isFromSync &&
      !action.meta?.noSync;

    // Se necessario, sincronizza l'azione con altre finestre
    if (shouldSync) {
      const syncData = {
        source: WINDOW_ID,
        timestamp: Date.now(),
        action: {
          type: action.type,
          payload: action.payload,
          meta: action.meta || {},
        },
      };

      localStorage.setItem("redux_window_sync", JSON.stringify(syncData));

      // Rimuovi immediatamente per consentire eventi futuri con lo stesso valore
      setTimeout(() => {
        if (
          localStorage.getItem("redux_window_sync") === JSON.stringify(syncData)
        ) {
          localStorage.removeItem("redux_window_sync");
        }
      }, 50);
    }

    return result;
  };
};

export default windowSyncMiddleware;
