// /src/services/notifications/NotificationService.js
class NotificationService {
  constructor() {
    this.audioUrl = '/audio/notificationReceived.wav';
    this.audioBuffer = null;
    this.audioContext = null;
    this.decodedAudioData = null;
    this.audioInitialized = false;
    this.pendingNotifications = []; // Coda per notifiche prima dell'inizializzazione
    this.notificationsEnabled = this.getNotificationSetting();
    this.soundEnabled = this.getSoundSetting();
    this.webNotificationsEnabled = this.getWebNotificationSetting();
    this.lastNotificationTime = Date.now();
    this.notificationsThrottleMs = 3000; // Non notificare più spesso di ogni 3 secondi
    this.focusedTabTitle = document.title;
    this.unreadCount = 0;
    this.isWindowFocused = document.hasFocus();
    this.titleInterval = null;
    this.soundInitPromise = null; // Promise per tracciare l'inizializzazione audio
    this.doNotDisturbEnabled = this.getDoNotDisturbSetting();
    this.notificationTimeoutMs = 15000; // Timeout di 15 secondi per le notifiche push
    this.activeNotifications = new Map(); // Mappa per tracciare le notifiche attive e i loro timer
    
    // Aggiungi questo per la gestione delle notifiche multiple
    this.notifiedChatIds = new Set(); // Set per tenere traccia delle chat già notificate
    
    // NUOVO: Set per tenere traccia delle notifiche ricevute durante "Non disturbare"
    this.dndNotifiedChatIds = new Set();
    
    this.resetNotifiedChatsInterval = setInterval(() => {
      this.notifiedChatIds.clear(); // Resetta ogni minuto
    
    }, 60000);
    
    // Imposta gli event listeners per il focus della finestra
    window.addEventListener('focus', this.handleWindowFocus);
    window.addEventListener('blur', this.handleWindowBlur);
    
    // Inizializza l'audio su più eventi per aumentare la probabilità di successo
    document.addEventListener('click', this.initAudio.bind(this), { once: true });
    document.addEventListener('keydown', this.initAudio.bind(this), { once: true });
    document.addEventListener('touchstart', this.initAudio.bind(this), { once: true });
    
    // Precarica il suono subito (anche se non potrà essere riprodotto finché l'utente non interagisce)
    this.soundInitPromise = this.preloadSound();
    
    // Verifica ogni 2 secondi se ci sono notifiche in coda
    this.processPendingInterval = setInterval(() => {
      this.processPendingNotifications();
    }, 2000);
    
    // Inizializzazione del suono tramite interazione con la pagina
    this.initAudioViaInteraction();
    
    // Richiedi il permesso per le notifiche web se non già fatto
    if (this.webNotificationsEnabled) {
      this.requestNotificationPermission();
    }
    
    // NUOVO: Ascolta l'evento di modifica dello stato "Non disturbare"
    document.addEventListener('doNotDisturbChanged', this.handleDndChange.bind(this));
  }

  // NUOVO: Handler per gli eventi di cambiamento di "Non disturbare"
  handleDndChange(event) {
    const { enabled } = event.detail;
    
    // Se stiamo disattivando la modalità "Non disturbare"
    if (!enabled) {
      console.log('Disattivazione modalità "Non disturbare". Pulizia delle notifiche bloccate...');
      
      // Pulisci l'elenco delle chat notificate durante questo periodo
      this.dndNotifiedChatIds.clear();
      
      // Per sicurezza, pulisci anche la lista delle notifiche normali
      this.notifiedChatIds.clear();
      
      // Notifica altri componenti che possono essere interessati
      const resetEvent = new CustomEvent('forceNotificationReset');
      document.dispatchEvent(resetEvent);
    }
  }

  // Getter e setter per le impostazioni memorizzate in localStorage
  getNotificationSetting() {
    return localStorage.getItem('notificationsEnabled') !== 'false';
  }

  getSoundSetting() {
    return localStorage.getItem('soundEnabled') !== 'false';
  }
  
  getWebNotificationSetting() {
    return localStorage.getItem('webNotificationsEnabled') === 'true';
  }

  setNotificationSetting(enabled) {
    localStorage.setItem('notificationsEnabled', enabled);
    this.notificationsEnabled = enabled;
  }

  setSoundSetting(enabled) {
    localStorage.setItem('soundEnabled', enabled);
    this.soundEnabled = enabled;
  }
  
  // CORREZIONE: Implementazione completa di setWebNotificationSetting
setWebNotificationSetting(enabled) {
  console.log('NOTIFICATION DEBUG: setWebNotificationSetting chiamata con:', enabled);
  localStorage.setItem('webNotificationsEnabled', enabled);
  this.webNotificationsEnabled = enabled;
  
  // Se stiamo abilitando le notifiche web, verifica che abbiamo il permesso
  if (enabled && 'Notification' in window && Notification.permission !== 'granted') {
    console.log('NOTIFICATION DEBUG: Avvio richiesta permessi durante setWebNotificationSetting');
    this.requestNotificationPermission();
  }
  
  // Emetti un evento per notificare il cambiamento
  const event = new CustomEvent('webNotificationSettingChanged', {
    detail: { enabled }
  });
  document.dispatchEvent(event);
  
  return enabled;
}

  getDoNotDisturbSetting() {
    return localStorage.getItem('doNotDisturbEnabled') === 'true';
  }

  setDoNotDisturbSetting(enabled) {
    localStorage.setItem('doNotDisturbEnabled', enabled);
    this.doNotDisturbEnabled = enabled;
   
    // Emetti un evento per aggiornare l'UI
    const event = new CustomEvent('doNotDisturbChanged', {
      detail: { enabled }
    });
    document.dispatchEvent(event);
    
    return enabled;
  }

  // Verifica lo stato "Non disturbare" corrente
  isInDoNotDisturbMode() {
    return this.doNotDisturbEnabled;
  }

// Versione corretta e completa di resetService per NotificationService.js

/**
 * Resetta completamente il servizio di notifica
 * Da utilizzare quando si disattiva la modalità "Non disturbare" 
 */
resetService() {
  console.log('Resettando il servizio di notifica...');
  
  // Pulisci le chat notificate durante la modalità "Non disturbare"
  this.dndNotifiedChatIds = new Set();
  
  // Reset anche delle notifiche regolari per sicurezza
  this.notifiedChatIds = new Set();
  
  // Svuota la coda di notifiche pendenti
  this.pendingNotifications = [];
  
  // Ripristina altre impostazioni se necessario
  this.unreadCount = 0;
  
  // Riaggiorna il titolo della finestra
  this.resetTitle();
  
  // Riavvia l'audio se necessario
  if (this.audioContext && this.audioContext.state === 'suspended') {
    this.audioContext.resume().catch(err => {
      console.warn('Error resuming audio context:', err);
    });
  }
  
  // Forza il ricaricamento delle notifiche
  const refreshEvent = new CustomEvent('refreshNotifications', { 
    detail: { 
      timestamp: Date.now(),
      source: 'resetService'
    }
  });
  document.dispatchEvent(refreshEvent);
  
  // Emetti un evento per notificare l'avvenuto reset
  const resetEvent = new CustomEvent('notificationServiceReset', {
    detail: {
      timestamp: Date.now()
    }
  });
  document.dispatchEvent(resetEvent);
  
  return true;
}

/**
 * Versione corretta di requestNotificationPermission che evita la ricorsione infinita
 * Sostituisci il metodo esistente con questo
 */
requestNotificationPermission() {
  console.log('NOTIFICATION DEBUG: Richiesta permessi notifiche');
  console.log('NOTIFICATION DEBUG: Stato attuale permessi =', Notification.permission);
  if (!("Notification" in window)) {
    console.warn("NotificationService: This browser doesn't support desktop notifications");
    return Promise.resolve(false);
  }
  
  // Se il permesso è già concesso, non fare nulla di più
  if (Notification.permission === "granted") {
    // Imposta direttamente la variabile locale invece di chiamare il metodo
    this.webNotificationsEnabled = true;
    localStorage.setItem('webNotificationsEnabled', 'true');
    
    return Promise.resolve(true);
  }
  
  if (Notification.permission === "denied") {
    console.warn("NotificationService: User has denied notification permission");
    return Promise.resolve(false);
  }
  
  console.log("NotificationService: Requesting notification permission");
  return Notification.requestPermission().then(permission => {
    console.log(`NotificationService: Permission result: ${permission}`);
    
    const granted = permission === "granted";
    
    // Imposta direttamente la variabile locale invece di richiamare il metodo
    this.webNotificationsEnabled = granted;
    localStorage.setItem('webNotificationsEnabled', granted ? 'true' : 'false');
    
    if (granted) {
      // Mostra una notifica di test per confermare che tutto funziona
      setTimeout(() => {
        try {
          const notification = new Notification("Notifiche attivate", {
            body: "Le notifiche sono state attivate con successo!",
            icon: '/icons/app-icon.png'
          });
          
          // Auto-chiude dopo 3 secondi
          setTimeout(() => notification.close(), 3000);
        } catch (e) {
          console.error("NotificationService: Error showing test notification", e);
        }
      }, 1000);
    }
    
    return granted;
  });
}

  // Inizializzazione tramite interazione con la pagina
  initAudioViaInteraction() {
    // Crea un element invisibile che cattura l'interazione
    const interactionElement = document.createElement('div');
    interactionElement.style.position = 'fixed';
    interactionElement.style.top = '0';
    interactionElement.style.left = '0';
    interactionElement.style.width = '100%';
    interactionElement.style.height = '100%';
    interactionElement.style.zIndex = '999999';
    interactionElement.style.opacity = '0';
    interactionElement.style.cursor = 'pointer';
    
    // Aggiungi event handler che inizializza l'audio
    const handleInteraction = () => {
      this.initAudio();
      document.body.removeChild(interactionElement);
     
    };
    
    interactionElement.addEventListener('click', handleInteraction);
    interactionElement.addEventListener('touchstart', handleInteraction);
    
    // Aggiungi l'elemento al body solo dopo che la pagina è completamente caricata
    if (document.readyState === 'complete') {
      document.body.appendChild(interactionElement);
    } else {
      window.addEventListener('load', () => {
        document.body.appendChild(interactionElement);
      });
    }
    
    // Rimuovi automaticamente dopo 10 secondi se l'utente non interagisce
    setTimeout(() => {
      if (document.body.contains(interactionElement)) {
        document.body.removeChild(interactionElement);
      }
    }, 10000);
  }

  // Gestisce il focus della finestra
  handleWindowFocus = () => {
    this.isWindowFocused = true;
    this.resetTitle();
    this.unreadCount = 0;
    if (this.titleInterval) {
      clearInterval(this.titleInterval);
      this.titleInterval = null;
    }
  }

  handleWindowBlur = () => {
    this.isWindowFocused = false;
  }

  // Ripristina il titolo originale della finestra
  resetTitle() {
    document.title = this.focusedTabTitle;
  }

  // Modifica il titolo della finestra per mostrare i nuovi messaggi
  startTitleNotification() {
    if (this.titleInterval) return;
    
    this.titleInterval = setInterval(() => {
      if (document.title === this.focusedTabTitle) {
        document.title = `(${this.unreadCount}) Nuovo messaggio`;
      } else {
        document.title = this.focusedTabTitle;
      }
    }, 1000);
  }

/**
 * Fixed initAudio method for proper audio initialization
 */
async initAudio() {
  if (this.audioInitialized) return Promise.resolve(true);
  
  try {
    // Create a new AudioContext
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.warn('Web Audio API not supported in this browser');
      return Promise.resolve(false);
    }
    
    this.audioContext = new AudioContext();
    
    // Resume context if needed (autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('NotificationService: AudioContext resumed');
    }
    
    // If we've already loaded the buffer, decode it
    if (this.audioBuffer) {
      await this.decodeBuffer();
    } else {
      // Otherwise reload the sound
      await this.preloadSound();
    }
    
    this.audioInitialized = true;
    // Process any notifications in queue
    this.processPendingNotifications();
    
    return true;
  } catch (e) {
    console.error('NotificationService: Failed to initialize audio:', e);
    return false;
  }
}

  // Precarica il suono di notifica
  async preloadSound() {
    try {
      
      if (!response.ok) {
        throw new Error(`HTTP error loading audio! status: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = arrayBuffer;
      
      // Se l'AudioContext è già inizializzato, decodifica il buffer
      if (this.audioContext) {
        await this.decodeBuffer();
      }
      
      return true;
    } catch (e) {
      console.error('Error preloading audio:', e);
      return false;
    }
  }

  // Decodifica il buffer audio in formato utilizzabile
  async decodeBuffer() {
    if (!this.audioContext || !this.audioBuffer) {
      console.warn('Cannot decode audio: context or buffer not available');
      return false;
    }
    
    try {
      // Utilizzo di promisify per il metodo decodeAudioData
      this.decodedAudioData = await new Promise((resolve, reject) => {
        this.audioContext.decodeAudioData(
          this.audioBuffer.slice(0),
          (buffer) => resolve(buffer),
          (error) => reject(error)
        );
      });
      
    
      return true;
    } catch (error) {
      console.error('Error decoding audio:', error);
      return false;
    }
  }

  // Mostra una notifica "locale" all'interno dell'applicazione
  showInAppNotification(title, message, onClick) {
  
    // Implementazione di una notifica toast all'interno dell'app
    // Emette un evento personalizzato che può essere intercettato dai componenti React
    const event = new CustomEvent('inAppNotification', {
      detail: {
        title,
        message,
        timestamp: new Date(),
        onClick
      }
    });
    
    document.dispatchEvent(event);
    
  }

  /**
 * Metodo per riavviare il sistema di notifiche
 * Utile quando si verificano problemi
 */
restartNotificationSystem() {
  console.log('NotificationService: Restarting notification system');
  
  // Ripulisci le notifiche attive
  this.activeNotifications.forEach((data, id) => {
    clearTimeout(data.timerId);
    if (data.notification) {
      try {
        data.notification.close();
      } catch (e) {
        // Ignora errori di chiusura
      }
    }
  });
  this.activeNotifications.clear();
  
  // Reset tracciamento chat notificate
  this.notifiedChatIds.clear();
  this.dndNotifiedChatIds.clear();
  
  // Svuota la coda pending
  this.pendingNotifications = [];
  
  // Reset conteggio non letti
  this.unreadCount = 0;
  this.resetTitle();
  
  // Riprova a inizializzare l'audio
  if (this.audioContext && this.audioContext.state === 'suspended') {
    this.audioContext.resume().catch(e => {
      console.warn('NotificationService: Error resuming audio context', e);
    });
  } else if (!this.audioInitialized) {
    this.preloadSound().then(() => {
      console.log('NotificationService: Sound preloaded after restart');
    });
  }
  
  return true;
}

/**
 * Implementazione corretta di showWebNotification per garantire la visualizzazione delle notifiche
 */
showWebNotification(title, message, notificationId) {
  console.log('NOTIFICATION DEBUG: Tentativo di mostrare notifica', { title, message, notificationId });
  
  // Controllo basilare per permessi
  if (!('Notification' in window)) {
    console.warn('NotificationService: Notifiche non supportate dal browser');
    return false;
  }
  
  // Verifica permessi prima di continuare
  if (Notification.permission !== 'granted') {
    console.warn('NotificationService: Permesso notifiche non concesso');
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        // Richiama questa funzione se il permesso viene concesso
        this.showWebNotification(title, message, notificationId);
      }
    });
    return false;
  }
  
  // Verifica impostazioni interne
  if (!this.webNotificationsEnabled) {
    console.warn('NotificationService: Notifiche web disabilitate nelle impostazioni');
    return false;
  }
  
  // Controllo per chat mute
  if (notificationId && this.isChatMuted(notificationId)) {
    console.log(`NotificationService: Notifica bloccata per chat silenziata: ${notificationId}`);
    return false;
  }
  
  // Verifica modalità Non Disturbare
  if (this.doNotDisturbEnabled) {
    console.log('NotificationService: Modalità Non Disturbare attiva, notifica bloccata');
    if (notificationId) {
      this.dndNotifiedChatIds.add(notificationId);
    }
    return false;
  }
  
  try {
    // Creazione semplificata della notifica
    const notification = new Notification(title, {
      body: message,
      icon: '/icons/app-icon.png',
      silent: true // Gestiremo il suono separatamente
    });
    
    // Gestione click
    notification.onclick = () => {
      window.focus();
      
      if (typeof window.openChatModal === 'function' && notificationId) {
        try {
          window.openChatModal(notificationId);
        } catch (e) {
          console.error('Error opening chat:', e);
        }
      }
      
      notification.close();
    };
    
    // Auto-chiusura dopo 8 secondi
    setTimeout(() => notification.close(), 8000);
    
    console.log(`NotificationService: Notifica web mostrata con successo: ${title}`);
    return true;
  } catch (error) {
    console.error('NotificationService: Errore durante la visualizzazione della notifica:', error);
    return false;
  }
}


  // Nuovo metodo per segnare una notifica come ricevuta
  markNotificationAsReceived(notificationId) {
    if (!notificationId) return;
    
    try {
      // Cerca nel contesto globale delle notifiche per la funzione
      if (window.notificationsContext && typeof window.notificationsContext.markMessageAsReceived === 'function') {
        // Trova l'ID del messaggio più recente
        const notification = window.notificationsContext.notifications.find(
          n => n.notificationId === parseInt(notificationId)
        );
        
        if (notification) {
          const messages = Array.isArray(notification.messages) 
            ? notification.messages 
            : (typeof notification.messages === 'string' ? JSON.parse(notification.messages) : []);
          
          if (messages.length > 0) {
            const latestMessage = messages[messages.length - 1];
            if (latestMessage && latestMessage.messageId) {
              window.notificationsContext.markMessageAsReceived(notificationId, latestMessage.messageId);
              console.log(`Messaggio ID ${latestMessage.messageId} della chat ${notificationId} segnato come ricevuto automaticamente`);
              return true;
            }
          }
        }
      }
      
      // Se non troviamo la funzione nel contesto o non possiamo usarla, 
      // mettiamo un log per debug ma non blocchiamo il flusso
      console.warn('Impossibile segnare il messaggio come ricevuto automaticamente: contesto non disponibile');
      return false;
    } catch (error) {
      console.error('Errore durante la marcatura del messaggio come ricevuto:', error);
      return false;
    }
  }

  // Processa le notifiche in coda
  processPendingNotifications() {
  
    // Verifica che la coda non sia vuota
    if (!this.pendingNotifications || this.pendingNotifications.length === 0) {
    
      return;
    }
    
    // Filtra le notifiche in coda, rimuovendo quelle da chat silenziate
    const nonMutedNotifications = this.pendingNotifications.filter(item => {
      // Se c'è un notificationId, verifica se è silenziato
      if (item.notificationId) {
        const isMuted = this.isChatMuted(item.notificationId);
        if (isMuted) {
         
          return false;
        }
        // Se questa chat è già stata notificata, salta
        if (this.notifiedChatIds.has(item.notificationId)) {
         
          return false;
        }
        // NUOVO: Se questa chat è stata notificata durante "Non disturbare", salta
        if (this.dndNotifiedChatIds.has(item.notificationId)) {
        
          return false;
        }
      }
      return true;
    });
    
 
    // Se dopo il filtraggio non ci sono notifiche da processare, esci
    if (nonMutedNotifications.length === 0) {
     
      this.pendingNotifications = [];
      return;
    }
    
    // Processa tutte le notifiche non silenziate rimaste in coda
    nonMutedNotifications.forEach(item => {
    
      
      // Marca la chat come notificata
      if (item.notificationId) {
        this.notifiedChatIds.add(item.notificationId);
      }
      
      // Mostra notifica in-app
      if (this.notificationsEnabled) {
      
        this.showInAppNotification(
          item.title,
          item.message,
          item.onClick
        );
      }
      
      // Mostra anche come notifica web se abilitata
      if (this.webNotificationsEnabled && item.notificationId) {
       
        this.showWebNotification(
          item.title,
          item.message,
          item.notificationId
        );
      }
    });
    
    // Svuota la coda
    this.pendingNotifications = [];
  
  }

  // metodo per controllare se una chat è silenziata
  isChatMuted(notificationId) {
    if (!notificationId) return false;
    
    // Converte in numero se è una stringa
    const notifId = parseInt(notificationId);
    
    // Verifica nel contesto globale delle notifiche
    if (window.notificationsContext) {
      // Se c'è una funzione isNotificationMuted, usala direttamente
      if (typeof window.notificationsContext.isNotificationMuted === 'function') {
        try {
          // Cerca la notifica prima di passarla alla funzione
          const notification = window.notificationsContext.notifications.find(
            n => n.notificationId === notifId
          );
          
          // Se la notifica esiste, verifica il silenziamento
          if (notification) {
            const isMuted = window.notificationsContext.isNotificationMuted(notification);
            console.log(`Chat ${notifId} muted status from context function:`, isMuted);
            return isMuted;
          }
        } catch (e) {
          console.error('Error using context isNotificationMuted function:', e);
        }
      }
      
      // In alternativa cerca la notifica direttamente nell'array
      if (window.notificationsContext.notifications && Array.isArray(window.notificationsContext.notifications)) {
        const notification = window.notificationsContext.notifications.find(
          n => n.notificationId === notifId
        );
        
        if (notification) {
          // Controlla direttamente la proprietà isMuted
          if (notification.isMuted) {
            console.log(`Chat ${notifId} is muted in notificationsContext`);
            
            // Se non c'è data di scadenza, è silenziata per sempre
            if (!notification.muteExpiryDate) return true;
            
            // Controlla se la data di scadenza è passata
            const now = new Date();
            const expiryDate = new Date(notification.muteExpiryDate);
            
            if (now > expiryDate) {
              // La data di scadenza è passata
              return false;
            }
            
            return true;
          } else {
            console.log(`Chat ${notifId} is NOT muted in notificationsContext`);
            return false;
          }
        }
      }
    }
    
    // Fallback: controlla il localStorage
    try {
      const mutedChats = JSON.parse(localStorage.getItem('mutedChats') || '{}');
      
      // Controlla sia la versione stringa che quella numerica dell'ID
      const chatInfo = mutedChats[notificationId] || mutedChats[notifId];
      
      if (!chatInfo || !chatInfo.isMuted) {
        console.log(`Chat ${notifId} non è silenziata nel localStorage`);
        return false;
      }
      
      // Se non c'è data di scadenza, è silenziata per sempre
      if (!chatInfo.expiryDate) {
        console.log(`Chat ${notifId} è silenziata permanentemente`);
        return true;
      }
      
      // Controlla se la data di scadenza è passata
      const now = new Date();
      const expiryDate = new Date(chatInfo.expiryDate);
      
      if (now > expiryDate) {
        // La data di scadenza è passata, rimuovi dal localStorage
        console.log(`Chat ${notifId}: il silenziamento è scaduto`);
        delete mutedChats[notificationId];
        localStorage.setItem('mutedChats', JSON.stringify(mutedChats));
        return false;
      }
      
      console.log(`Chat ${notifId} è silenziata fino a ${expiryDate}`);
      return true;
    } catch (e) {
      console.error('Error checking muted status in localStorage:', e);
      return false;
    }
  }

/**
 * Fixed notifyNewMessage method to properly handle notifications
 */
notifyNewMessage(message, senderName, notificationId) {
  console.log('NotificationService: notifyNewMessage called', { message, senderName, notificationId });
  
  // Input validation
  if (!message || !senderName || !notificationId) {
    console.error('NotificationService: Missing parameters for notification');
    return;
  }
  
  // Check if this chat is muted
  const isMuted = this.isChatMuted(notificationId);
  if (isMuted) {
    console.log(`NotificationService: Chat ID ${notificationId} is muted, notification blocked`);
    return;
  }
  
  // Do Not Disturb handling
  if (this.doNotDisturbEnabled) {
    console.log('NotificationService: Do Not Disturb mode active, notification blocked');
    this.dndNotifiedChatIds.add(notificationId);
    return;
  }
  
  // Don't completely skip notifications if window is focused - still play sound
  // but skip visual notifications
  const shouldShowVisualNotification = !this.isWindowFocused;
  
  // Always register the chat as notified to limit repeated notifications
  this.notifiedChatIds.add(notificationId);
  
  // Increment unread counter
  this.unreadCount++;
  
  // Update window title for unread messages
  if (!this.isWindowFocused) {
    this.startTitleNotification();
  }
  
  // Prepare notification text
  const trimmedMessage = message.length > 60 ? message.substring(0, 60) + '...' : message;
  const title = `Nuovo messaggio da ${senderName}`;
  
  // Define onClick function
  const onClick = () => {
    if (typeof window.openChatModal === 'function') {
      window.openChatModal(notificationId);
    }
  };
  
  // Always try to play sound if enabled, regardless of window focus
  if (this.soundEnabled) {
    console.log('NotificationService: Attempting to play notification sound');
    if (!this.audioInitialized) {
      console.log('NotificationService: Audio not initialized, queueing notification');
      const notificationItem = {
        title,
        message: trimmedMessage,
        onClick,
        notificationId
      };
      
      this.pendingNotifications.push(notificationItem);
    } else {
      console.log('NotificationService: Playing notification sound');
    
    }
  }
  
  // Show visual notifications only if window is not focused
  if (shouldShowVisualNotification) {
    // Web notifications
    if (this.webNotificationsEnabled && Notification.permission === 'granted') {
      console.log('NotificationService: Showing web notification');
      this.showWebNotification(title, trimmedMessage, notificationId);
    } else {
      console.log('NotificationService: Web notifications disabled or permission denied');
    }
    
    // In-app notifications
    if (this.notificationsEnabled) {
      console.log('NotificationService: Showing in-app notification');
      this.showInAppNotification(title, trimmedMessage, onClick);
    }
  }
}

  // Gestisce notifiche di tipo sistema (non messaggi)
notifySystem(title, message, onClick = null) {
  // Controlli di sicurezza
  if (this.doNotDisturbEnabled) {
    console.log('NotificationService: Do Not Disturb mode active, notification blocked');
    return;
  }
  
  if (!this.notificationsEnabled) return;

  
  // Notifica in-app
  this.showInAppNotification(title, message, onClick);
  
  // Notifica desktop se abilitata
  if (this.webNotificationsEnabled && Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body: message,
        icon: '/icons/app-icon.png',
        requireInteraction: false
      });
      
      // Gestione click
      if (onClick && typeof onClick === 'function') {
        notification.onclick = () => {
          window.focus();
          onClick();
          notification.close();
        };
      }
      
      // Auto-chiusura
      setTimeout(() => notification.close(), 8000);
      
      return true;
    } catch (error) {
      console.error('NotificationService: Error showing web notification:', error);
    }
  }
  
  return false;
}
  
  // Pulisce le risorse quando il servizio viene eliminato
  destroy() {
    window.removeEventListener('focus', this.handleWindowFocus);
    window.removeEventListener('blur', this.handleWindowBlur);
    
    if (this.titleInterval) {
      clearInterval(this.titleInterval);
      this.titleInterval = null;
    }
    
    if (this.processPendingInterval) {
      clearInterval(this.processPendingInterval);
      this.processPendingInterval = null;
    }
    
    // Pulisci l'intervallo che resetta il set di chat notificate
    if (this.resetNotifiedChatsInterval) {
      clearInterval(this.resetNotifiedChatsInterval);
      this.resetNotifiedChatsInterval = null;
    }
    
    // Rimuovi l'event listener per doNotDisturbChanged
    document.removeEventListener('doNotDisturbChanged', this.handleDndChange);
    
    // Chiudi l'AudioContext se esiste
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(err => {
        console.error('Error closing AudioContext:', err);
      });
    }
    
    // Chiudi tutte le notifiche attive
    this.activeNotifications.forEach((data, id) => {
      clearTimeout(data.timerId);
      if (data.notification) {
        data.notification.close();
      }
    });
    
    this.activeNotifications.clear();
  }
}

// Crea un'istanza singleton del servizio
const notificationService = new NotificationService();
export default notificationService;