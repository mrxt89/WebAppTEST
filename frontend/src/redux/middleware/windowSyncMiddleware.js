// src/redux/middleware/windowSyncMiddleware.js
import { config } from '../../config';

// Identificatore univoco per questa istanza di finestra
const WINDOW_ID = Date.now().toString(36) + Math.random().toString(36).substring(2);
let isMaster = false;
let masterHeartbeatTimeout = null;

const checkMasterStatus = () => {
  const currentMaster = localStorage.getItem('chat_master_window');
  
  // Se non c'è master o è scaduto, diventa master
  if (!currentMaster || Date.now() - parseInt(localStorage.getItem('chat_master_heartbeat') || 0) > 5000) {
    localStorage.setItem('chat_master_window', WINDOW_ID);
    localStorage.setItem('chat_master_heartbeat', Date.now().toString());
    isMaster = true;
    return true;
  }
  
  return currentMaster === WINDOW_ID;
};

// Azioni da sincronizzare tra finestre
const SYNC_ACTIONS = [
  'notifications/updateFromWorker',
  'notifications/sendNotification',
  'notifications/toggleReadUnread',
  'notifications/archiveChat',
  'notifications/unarchiveChat',
  'notifications/closeChat',
  'notifications/reopenChat',
  'notifications/leaveChat',
  'notifications/togglePin',
  'notifications/toggleFavorite',
  'notifications/updateChatTitle',
  'notifications/toggleMuteChat'
];

const windowSyncMiddleware = store => {
  // Inizializza come master se necessario
  isMaster = checkMasterStatus();
  
  // Configura heartbeat periodico se è master
  if (isMaster) {
    masterHeartbeatTimeout = setInterval(() => {
      localStorage.setItem('chat_master_heartbeat', Date.now().toString());
    }, 1000);
    
    console.log('[WindowSync] This window is the master window');
  } else {
    console.log('[WindowSync] This window is a slave window');
  }
  
  // Listener per gli eventi storage
  const handleStorageChange = (event) => {
    if (event.key === 'redux_window_sync' && event.newValue) {
      try {
        const syncData = JSON.parse(event.newValue);
        
        // Ignora eventi che provengono da questa finestra
        if (syncData.source === WINDOW_ID) return;
        
        console.log(`[WindowSync] Received sync action: ${syncData.action.type}`);
        
        // Applica l'azione sincronizzata
        store.dispatch({
          type: syncData.action.type,
          payload: syncData.action.payload,
          meta: { ...syncData.action.meta, isFromSync: true }
        });
      } catch (err) {
        console.error('[WindowSync] Error processing window sync:', err);
      }
    }
    
    // Controlla lo stato master quando cambia
    if (event.key === 'chat_master_window' || event.key === 'chat_master_heartbeat') {
      const wasMaster = isMaster;
      isMaster = checkMasterStatus();
      
      // Se lo stato master è cambiato
      if (wasMaster !== isMaster) {
        console.log(`[WindowSync] Master status changed: ${isMaster ? 'became master' : 'no longer master'}`);
        
        // Se è diventato master, inizializza il heartbeat
        if (isMaster) {
          masterHeartbeatTimeout = setInterval(() => {
            localStorage.setItem('chat_master_heartbeat', Date.now().toString());
          }, 1000);
          
          // Forza un aggiornamento quando diventa master
          store.dispatch({ 
            type: 'notifications/reload', 
            payload: { highPriority: true },
            meta: { newMaster: true }
          });
        } else if (masterHeartbeatTimeout) {
          // Se non è più master, ferma il heartbeat
          clearInterval(masterHeartbeatTimeout);
          masterHeartbeatTimeout = null;
        }
      }
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  // Gestisce ritorno online con reconnect
  window.addEventListener('online', () => {
    if (isMaster) {
      console.log('[WindowSync] Connection restored, forcing refresh');
      // Forza un aggiornamento quando la connessione torna
      store.dispatch({ 
        type: 'notifications/reload', 
        payload: { highPriority: true } 
      });
    }
  });
  
  // Pulisci quando la finestra viene chiusa
  window.addEventListener('beforeunload', () => {
    if (isMaster) {
      localStorage.removeItem('chat_master_window');
      if (masterHeartbeatTimeout) {
        clearInterval(masterHeartbeatTimeout);
      }
    }
  });
  
  // Esporta funzioni utili per il debugging
  window.chatSyncDebug = {
    isMaster: () => isMaster,
    forceReload: () => {
      store.dispatch({ 
        type: 'notifications/reload', 
        payload: { highPriority: true } 
      });
    },
    becomeMaster: () => {
      localStorage.setItem('chat_master_window', WINDOW_ID);
      localStorage.setItem('chat_master_heartbeat', Date.now().toString());
    }
  };
  
  return next => action => {
    // Gestione speciale per azioni worker (solo il master deve eseguire il polling)
    if (action.type === 'notifications/initialize' && !isMaster && !action.meta?.forceWorkerInit) {
      console.log('[WindowSync] Skipping worker initialization in non-master window');
      return next({
        ...action,
        meta: { ...action.meta, skipWorkerInit: true }
      });
    }
    
    // Se è un reload forzato da una nuova finestra master
    if (action.type === 'notifications/reload' && action.meta?.newMaster && isMaster) {
      console.log('[WindowSync] New master window forcing reload');
      // Assicurati che sia trattato come prioritario
      action.payload = { ...action.payload, highPriority: true };
    }
    
    // Esegui l'azione normalmente
    const result = next(action);
    
    // Verifica se l'azione dovrebbe essere sincronizzata
    const shouldSync = SYNC_ACTIONS.includes(action.type) && 
                      !action.meta?.isFromSync && 
                      !action.meta?.noSync;
    
    // Se necessario, sincronizza l'azione con altre finestre
    if (shouldSync) {
      console.log(`[WindowSync] Syncing action: ${action.type}`);
      
      const syncData = {
        source: WINDOW_ID,
        timestamp: Date.now(),
        action: {
          type: action.type,
          payload: action.payload,
          meta: action.meta || {}
        }
      };
      
      localStorage.setItem('redux_window_sync', JSON.stringify(syncData));
      
      // Rimuovi immediatamente per consentire eventi futuri con lo stesso valore
      setTimeout(() => {
        if (localStorage.getItem('redux_window_sync') === JSON.stringify(syncData)) {
          localStorage.removeItem('redux_window_sync');
        }
      }, 50);
    }
    
    return result;
  };
};

export default windowSyncMiddleware;