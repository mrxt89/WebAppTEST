// /src/services/notifications/NotificationService.js
class NotificationService {
  constructor() {
    this.audioUrl = "/audio/notificationReceived.wav";
    this.audioBuffer = null;
    this.audioContext = null;
    this.decodedAudioData = null;
    this.audioInitialized = false;
    this.pendingNotifications = [];
    this.notificationsEnabled = this.getNotificationSetting();
    if (localStorage.getItem('notificationsEnabled') === null) {
      localStorage.setItem('notificationsEnabled', 'true');
      this.notificationsEnabled = true;
    }
    this.soundEnabled = this.getSoundSetting();
    this.webNotificationsEnabled = this.getWebNotificationSetting();
    this.lastNotificationTime = Date.now();
    this.notificationsThrottleMs = 3000;
    this.focusedTabTitle = document.title;
    this.unreadCount = 0;
    this.isWindowFocused = document.hasFocus();
    this.titleInterval = null;
    this.soundInitPromise = null;
    this.doNotDisturbEnabled = this.getDoNotDisturbSetting();
    this.notificationTimeoutMs = 15000;
    this.activeNotifications = new Map();
    this.notifiedChatIds = new Set();
    this.dndNotifiedChatIds = new Set();
    
    // NUOVO: Struttura per aggregare notifiche multiple per chat
    this.pendingNotificationsByChat = new Map();
    this.notificationAggregationTimeout = null;
    this.NOTIFICATION_AGGREGATION_DELAY = 2000; // 2 secondi per aggregare messaggi

    this.resetNotifiedChatsInterval = setInterval(() => {
      this.notifiedChatIds.clear();
    }, 60000);

    window.addEventListener("focus", this.handleWindowFocus);
    window.addEventListener("blur", this.handleWindowBlur);

    document.addEventListener("click", this.initAudio.bind(this), {
      once: true,
    });
    document.addEventListener("keydown", this.initAudio.bind(this), {
      once: true,
    });
    document.addEventListener("touchstart", this.initAudio.bind(this), {
      once: true,
    });

    this.soundInitPromise = this.preloadSound();

    this.processPendingInterval = setInterval(() => {
      this.processPendingNotifications();
    }, 2000);

    this.initAudioViaInteraction();

    if (this.webNotificationsEnabled) {
      this.requestNotificationPermission();
    }

    document.addEventListener(
      "doNotDisturbChanged",
      this.handleDndChange.bind(this),
    );
  }

  handleDndChange(event) {
    const { enabled } = event.detail;

    if (!enabled) {
      this.dndNotifiedChatIds.clear();
      this.notifiedChatIds.clear();

      const resetEvent = new CustomEvent("forceNotificationReset");
      document.dispatchEvent(resetEvent);
    }
  }

  getNotificationSetting() {
    return localStorage.getItem("notificationsEnabled") !== "false";
  }

  getSoundSetting() {
    return localStorage.getItem("soundEnabled") !== "false";
  }

  getWebNotificationSetting() {
    return localStorage.getItem("webNotificationsEnabled") === "true";
  }

  setNotificationSetting(enabled) {
    localStorage.setItem("notificationsEnabled", enabled);
    this.notificationsEnabled = enabled;
  }

  setSoundSetting(enabled) {
    localStorage.setItem("soundEnabled", enabled);
    this.soundEnabled = enabled;
  }

  setWebNotificationSetting(enabled) {
    localStorage.setItem("webNotificationsEnabled", enabled);
    this.webNotificationsEnabled = enabled;

    if (
      enabled &&
      "Notification" in window &&
      Notification.permission !== "granted"
    ) {
      this.requestNotificationPermission();
    }

    const event = new CustomEvent("webNotificationSettingChanged", {
      detail: { enabled },
    });
    document.dispatchEvent(event);

    return enabled;
  }

  getDoNotDisturbSetting() {
    return localStorage.getItem("doNotDisturbEnabled") === "true";
  }

  setDoNotDisturbSetting(enabled) {
    localStorage.setItem("doNotDisturbEnabled", enabled);
    this.doNotDisturbEnabled = enabled;

    const event = new CustomEvent("doNotDisturbChanged", {
      detail: { enabled },
    });
    document.dispatchEvent(event);

    return enabled;
  }

  isInDoNotDisturbMode() {
    return this.doNotDisturbEnabled;
  }

  resetService() {
    this.dndNotifiedChatIds = new Set();
    this.notifiedChatIds = new Set();
    this.pendingNotifications = [];
    this.unreadCount = 0;
    this.resetTitle();

    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().catch((err) => {
        console.warn("Error resuming audio context:", err);
      });
    }

    const refreshEvent = new CustomEvent("refreshNotifications", {
      detail: {
        timestamp: Date.now(),
        source: "resetService",
      },
    });
    document.dispatchEvent(refreshEvent);

    const resetEvent = new CustomEvent("notificationServiceReset", {
      detail: {
        timestamp: Date.now(),
      },
    });
    document.dispatchEvent(resetEvent);

    return true;
  }

  requestNotificationPermission() {
    if (!("Notification" in window)) {
      console.warn(
        "NotificationService: This browser doesn't support desktop notifications",
      );
      return Promise.resolve(false);
    }

    if (Notification.permission === "granted") {
      this.webNotificationsEnabled = true;
      localStorage.setItem("webNotificationsEnabled", "true");
      return Promise.resolve(true);
    }

    if (Notification.permission === "denied") {
      console.warn(
        "NotificationService: User has denied notification permission",
      );
      return Promise.resolve(false);
    }

    return Notification.requestPermission().then((permission) => {
      const granted = permission === "granted";

      this.webNotificationsEnabled = granted;
      localStorage.setItem(
        "webNotificationsEnabled",
        granted ? "true" : "false",
      );

      if (granted) {
        setTimeout(() => {
          try {
            const notification = new Notification("Notifiche attivate", {
              body: "Le notifiche sono state attivate con successo!",
              icon: "/icons/app-icon.png",
            });

            setTimeout(() => notification.close(), 3000);
          } catch (e) {
            console.error(
              "NotificationService: Error showing test notification",
              e,
            );
          }
        }, 1000);
      }

      return granted;
    });
  }

  initAudioViaInteraction() {
    const interactionElement = document.createElement("div");
    interactionElement.style.position = "fixed";
    interactionElement.style.top = "0";
    interactionElement.style.left = "0";
    interactionElement.style.width = "100%";
    interactionElement.style.height = "100%";
    interactionElement.style.zIndex = "999999";
    interactionElement.style.opacity = "0";
    interactionElement.style.cursor = "pointer";

    const handleInteraction = () => {
      this.initAudio();
      document.body.removeChild(interactionElement);
    };

    interactionElement.addEventListener("click", handleInteraction);
    interactionElement.addEventListener("touchstart", handleInteraction);

    if (document.readyState === "complete") {
      document.body.appendChild(interactionElement);
    } else {
      window.addEventListener("load", () => {
        document.body.appendChild(interactionElement);
      });
    }

    setTimeout(() => {
      if (document.body.contains(interactionElement)) {
        document.body.removeChild(interactionElement);
      }
    }, 10000);
  }

  handleWindowFocus = () => {
    this.isWindowFocused = true;
    this.resetTitle();
    this.unreadCount = 0;
    if (this.titleInterval) {
      clearInterval(this.titleInterval);
      this.titleInterval = null;
    }
  };

  handleWindowBlur = () => {
    this.isWindowFocused = false;
  };

  resetTitle() {
    document.title = this.focusedTabTitle;
  }

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

  async initAudio() {
    if (this.audioInitialized) return Promise.resolve(true);

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        console.warn("Web Audio API not supported in this browser");
        return Promise.resolve(false);
      }

      this.audioContext = new AudioContext();

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      if (this.audioBuffer) {
        await this.decodeBuffer();
      } else {
        await this.preloadSound();
      }

      this.audioInitialized = true;
      this.processPendingNotifications();

      return true;
    } catch (e) {
      console.error("NotificationService: Failed to initialize audio:", e);
      return false;
    }
  }

  async preloadSound() {
    try {
      const response = await fetch(this.audioUrl);

      if (!response.ok) {
        throw new Error(`HTTP error loading audio! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = arrayBuffer;

      if (this.audioContext) {
        await this.decodeBuffer();
      }

      return true;
    } catch (e) {
      console.error("Error preloading audio:", e);
      return false;
    }
  }

  async decodeBuffer() {
    if (!this.audioContext || !this.audioBuffer) {
      console.warn("Cannot decode audio: context or buffer not available");
      return false;
    }

    try {
      this.decodedAudioData = await new Promise((resolve, reject) => {
        this.audioContext.decodeAudioData(
          this.audioBuffer.slice(0),
          (buffer) => resolve(buffer),
          (error) => reject(error),
        );
      });

      return true;
    } catch (error) {
      console.error("Error decoding audio:", error);
      return false;
    }
  }

  showInAppNotification(title, message, onClick) {
    const event = new CustomEvent("inAppNotification", {
      detail: {
        title,
        message,
        timestamp: new Date(),
        onClick,
      },
    });

    document.dispatchEvent(event);
  }

  restartNotificationSystem() {
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

    this.notifiedChatIds.clear();
    this.dndNotifiedChatIds.clear();

    this.pendingNotifications = [];

    this.unreadCount = 0;
    this.resetTitle();

    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().catch((e) => {
        console.warn("NotificationService: Error resuming audio context", e);
      });
    } else if (!this.audioInitialized) {
      this.preloadSound().then(() => {});
    }

    return true;
  }

  /**
   * NUOVO: Metodo per aggregare e mostrare notifiche
   */
  aggregateAndShowNotification(notificationId, senderName, messagePreview, senderId) {
    if (!notificationId) return;

    // Aggiungi alla mappa di aggregazione
    if (!this.pendingNotificationsByChat.has(notificationId)) {
      this.pendingNotificationsByChat.set(notificationId, {
        senderName,
        messages: [],
        lastSenderId: senderId,
        firstMessageTime: Date.now()
      });
    }

    const chatData = this.pendingNotificationsByChat.get(notificationId);
    chatData.messages.push(messagePreview);
    chatData.lastSenderId = senderId;

    // Cancella il timeout precedente se esiste
    if (this.notificationAggregationTimeout) {
      clearTimeout(this.notificationAggregationTimeout);
    }

    // Imposta un nuovo timeout per mostrare le notifiche aggregate
    this.notificationAggregationTimeout = setTimeout(() => {
      this.showAggregatedNotifications();
    }, this.NOTIFICATION_AGGREGATION_DELAY);
  }

  /**
   * NUOVO: Mostra le notifiche aggregate
   */
  showAggregatedNotifications() {
    this.pendingNotificationsByChat.forEach((chatData, notificationId) => {
      const messageCount = chatData.messages.length;
      let title, body;

      if (messageCount === 1) {
        title = `Nuovo messaggio da ${chatData.senderName}`;
        body = chatData.messages[0];
      } else {
        title = `${messageCount} nuovi messaggi da ${chatData.senderName}`;
        body = `${chatData.messages[chatData.messages.length - 1]}`;
      }

      // Mostra la notifica web aggregata
      this.showWebNotification(title, body, notificationId, messageCount);
    });

    // Pulisci la mappa dopo aver mostrato le notifiche
    this.pendingNotificationsByChat.clear();
  }

  /**
   * Versione migliorata di showWebNotification che gestisce l'aggregazione
   */
/**
 * Versione migliorata di showWebNotification che gestisce l'aggregazione
 */
showWebNotification(title, message, notificationId, messageCount = 1) {
  console.log("NOTIFICATION DEBUG: Tentativo di mostrare notifica", {
    title,
    message,
    notificationId,
    messageCount
  });

  if (!("Notification" in window)) {
    console.warn("NotificationService: Notifiche non supportate dal browser");
    return false;
  }

  if (Notification.permission !== "granted") {
    console.warn("NotificationService: Permesso notifiche non concesso");
    return false;
  }

  if (!this.webNotificationsEnabled) {
    console.warn(
      "NotificationService: Notifiche web disabilitate nelle impostazioni",
    );
    return false;
  }

  if (notificationId && this.isChatMuted(notificationId)) {
    console.log(
      `NotificationService: Notifica bloccata per chat silenziata: ${notificationId}`,
    );
    return false;
  }

  if (this.doNotDisturbEnabled) {
    console.log(
      "NotificationService: Modalità Non Disturbare attiva, notifica bloccata",
    );
    if (notificationId) {
      this.dndNotifiedChatIds.add(notificationId);
    }
    return false;
  }

  try {
    // Chiudi eventuali notifiche esistenti per la stessa chat
    const existingNotification = this.activeNotifications.get(notificationId);
    if (existingNotification) {
      // Cancella solo il timer, NON chiudere la notifica
      if (existingNotification.timerId) {
        clearTimeout(existingNotification.timerId);
      }
    }

    // Creazione della notifica con requireInteraction per mantenerla visibile
    const options = {
      body: message,
      icon: "/icons/app-icon.png",
      badge: "/icons/app-icon.png",
      tag: `chat-${notificationId}`,
      requireInteraction: true, // IMPORTANTE: La notifica resta finché non interagita
      silent: false, // Abilita il suono di sistema
      renotify: true, // Permette di ri-notificare con lo stesso tag
      vibrate: [200, 100, 200], // Vibrazione su dispositivi mobili
      data: {
        notificationId: notificationId,
        messageCount: messageCount,
        timestamp: Date.now()
      }
    };

    const notification = new Notification(title, options);

    // Gestione click sulla notifica
    notification.onclick = () => {
      console.log("Notifica cliccata per chat:", notificationId);
      
      try {
        // Focus sulla finestra
        window.focus();
        
        // Prova prima con la funzione globale se disponibile
        if (typeof window.openChatModal === "function") {
          window.openChatModal(notificationId);
        } else {
          // Altrimenti importa il modulo
          import('@/redux/features/notifications/notificationsSlice').then(module => {
            if (module.callOpenChatModal) {
              console.log("Apertura chat con callOpenChatModal");
              module.callOpenChatModal(notificationId);
            } else {
              // Fallback navigazione diretta
              window.location.href = `/chat/${notificationId}`;
            }
          }).catch(error => {
            console.error("Errore durante import:", error);
            window.location.href = `/chat/${notificationId}`;
          });
        }
        
      } catch (clickError) {
        console.error("Errore durante apertura chat:", clickError);
        window.location.href = `/chat/${notificationId}`;
      }
      
      // Chiudi la notifica dopo il click
      notification.close();
    };

    // Gestione chiusura notifica
    notification.onclose = () => {
      console.log("Notifica chiusa per chat:", notificationId);
      // Rimuovi dalla mappa delle notifiche attive
      this.activeNotifications.delete(notificationId);
    };

    // Gestione errore notifica
    notification.onerror = (error) => {
      console.error("Errore notifica:", error);
      this.activeNotifications.delete(notificationId);
    };

    // NON impostare NESSUN timeout automatico per la chiusura
    // La notifica rimarrà visibile finché l'utente non interagisce
    
    // Salva riferimento alla notifica attiva SENZA timer di chiusura automatica
    this.activeNotifications.set(notificationId, {
      notification,
      timestamp: Date.now()
      // NOTA: Nessun timerId qui! Non vogliamo chiusura automatica
    });

    console.log(
      `NotificationService: Notifica web mostrata con successo: ${title} (persistente)`,
    );
    return true;
  } catch (error) {
    console.error(
      "NotificationService: Errore durante la visualizzazione della notifica:",
      error,
    );
    return false;
  }
}

// IMPORTANTE: Modifica anche il metodo notifySystem per non chiudere automaticamente
notifySystem(title, message, onClick = null) {
  if (this.doNotDisturbEnabled) {
    return;
  }

  if (!this.notificationsEnabled) return;

  this.showInAppNotification(title, message, onClick);

  if (this.webNotificationsEnabled && Notification.permission === "granted") {
    try {
      const notification = new Notification(title, {
        body: message,
        icon: "/icons/app-icon.png",
        requireInteraction: true, // CAMBIATO: da false a true
        silent: false,
        vibrate: [200, 100, 200]
      });

      if (onClick && typeof onClick === "function") {
        notification.onclick = () => {
          window.focus();
          onClick();
          notification.close();
        };
      }

      // RIMOSSO: setTimeout per chiusura automatica
      // NON chiudere automaticamente dopo 8 secondi

      return true;
    } catch (error) {
      console.error(
        "NotificationService: Error showing web notification:",
        error,
      );
    }
  }

  return false;
}

  markNotificationAsReceived(notificationId) {
    if (!notificationId) return;

    try {
      if (
        window.notificationsContext &&
        typeof window.notificationsContext.markMessageAsReceived === "function"
      ) {
        const notification = window.notificationsContext.notifications.find(
          (n) => n.notificationId === parseInt(notificationId),
        );

        if (notification) {
          const messages = Array.isArray(notification.messages)
            ? notification.messages
            : typeof notification.messages === "string"
              ? JSON.parse(notification.messages)
              : [];

          if (messages.length > 0) {
            const latestMessage = messages[messages.length - 1];
            if (latestMessage && latestMessage.messageId) {
              window.notificationsContext.markMessageAsReceived(
                notificationId,
                latestMessage.messageId,
              );

              return true;
            }
          }
        }
      }

      console.warn(
        "Impossibile segnare il messaggio come ricevuto automaticamente: contesto non disponibile",
      );
      return false;
    } catch (error) {
      console.error(
        "Errore durante la marcatura del messaggio come ricevuto:",
        error,
      );
      return false;
    }
  }

  processPendingNotifications() {
    if (!this.pendingNotifications || this.pendingNotifications.length === 0) {
      return;
    }

    const nonMutedNotifications = this.pendingNotifications.filter((item) => {
      if (item.notificationId) {
        const isMuted = this.isChatMuted(item.notificationId);
        if (isMuted) {
          return false;
        }
        if (this.notifiedChatIds.has(item.notificationId)) {
          return false;
        }
        if (this.dndNotifiedChatIds.has(item.notificationId)) {
          return false;
        }
      }
      return true;
    });

    if (nonMutedNotifications.length === 0) {
      this.pendingNotifications = [];
      return;
    }

    nonMutedNotifications.forEach((item) => {
      if (item.notificationId) {
        this.notifiedChatIds.add(item.notificationId);
      }

      if (this.notificationsEnabled) {
        this.showInAppNotification(item.title, item.message, item.onClick);
      }

      if (this.webNotificationsEnabled && item.notificationId) {
        this.showWebNotification(item.title, item.message, item.notificationId);
      }
    });

    this.pendingNotifications = [];
  }

  isChatMuted(notificationId) {
    if (!notificationId) return false;

    const notifId = parseInt(notificationId);

    if (window.notificationsContext) {
      if (
        typeof window.notificationsContext.isNotificationMuted === "function"
      ) {
        try {
          const notification = window.notificationsContext.notifications.find(
            (n) => n.notificationId === notifId,
          );

          if (notification) {
            const isMuted =
              window.notificationsContext.isNotificationMuted(notification);

            return isMuted;
          }
        } catch (e) {
          console.error("Error using context isNotificationMuted function:", e);
        }
      }

      if (
        window.notificationsContext.notifications &&
        Array.isArray(window.notificationsContext.notifications)
      ) {
        const notification = window.notificationsContext.notifications.find(
          (n) => n.notificationId === notifId,
        );

        if (notification) {
          if (notification.isMuted) {
            if (!notification.muteExpiryDate) return true;

            const now = new Date();
            const expiryDate = new Date(notification.muteExpiryDate);

            if (now > expiryDate) {
              return false;
            }

            return true;
          } else {
            return false;
          }
        }
      }
    }

    try {
      const mutedChats = JSON.parse(localStorage.getItem("mutedChats") || "{}");

      const chatInfo = mutedChats[notificationId] || mutedChats[notifId];

      if (!chatInfo || !chatInfo.isMuted) {
        return false;
      }

      if (!chatInfo.expiryDate) {
        return true;
      }

      const now = new Date();
      const expiryDate = new Date(chatInfo.expiryDate);

      if (now > expiryDate) {
        delete mutedChats[notificationId];
        localStorage.setItem("mutedChats", JSON.stringify(mutedChats));
        return false;
      }

      return true;
    } catch (e) {
      console.error("Error checking muted status in localStorage:", e);
      return false;
    }
  }

  isNewMessage(message, notificationId) {
    if (!message || !message.timestamp || !notificationId) {
      return false;
    }

    try {
      const messageTime = new Date(message.timestamp);
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

      if (messageTime < tenMinutesAgo) {
        return false;
      }

      const notifiedKey = `notified_${notificationId}_${message.messageId}`;
      const alreadyNotified = localStorage.getItem(notifiedKey);

      if (alreadyNotified) {
        return false;
      }

      localStorage.setItem(notifiedKey, Date.now().toString());

      this.cleanUpOldNotifications();

      return true;
    } catch (e) {
      console.error("Errore nella verifica nuovo messaggio:", e);
      return false;
    }
  }

  cleanUpOldNotifications() {
    try {
      const notificationKeys = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("notified_")) {
          notificationKeys.push({
            key,
            time: parseInt(localStorage.getItem(key) || "0"),
          });
        }
      }

      notificationKeys.sort((a, b) => a.time - b.time);

      if (notificationKeys.length > 100) {
        const toRemove = notificationKeys.slice(
          0,
          notificationKeys.length - 100,
        );
        toRemove.forEach((item) => {
          localStorage.removeItem(item.key);
        });
      }
    } catch (e) {
      console.error("Errore nella pulizia notifiche:", e);
    }
  }

  /**
   * Metodo migliorato per notificare nuovi messaggi con aggregazione
   */
  notifyNewMessage(message, senderName, notificationId, senderId = null) {
    if (!message || !senderName || !notificationId) {
      return;
    }
  
    // Ottieni l'ID dell'utente corrente
    let currentUserId = null;
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        currentUserId = userData.userId || userData.UserId || userData.id || userData.ID;
      }
    } catch (e) {
      console.error("Error getting current user ID:", e);
    }
  
    // Se il senderId corrisponde all'utente corrente, non notificare
    if (senderId && currentUserId && 
        (senderId === currentUserId || senderId.toString() === currentUserId.toString())) {
      console.log("Skipping notification for own message");
      return;
    }

    if (this.isChatMuted(notificationId)) {
      return;
    }

    if (this.doNotDisturbEnabled) {
      this.dndNotifiedChatIds.add(notificationId);
      return;
    }

    const shouldShowVisualNotification = !this.isWindowFocused;

    this.unreadCount++;

    // Riproduci il suono se abilitato (solo una volta per sessione di notifiche)
    if (this.soundEnabled && this.audioInitialized && this.decodedAudioData && 
        !this.pendingNotificationsByChat.has(notificationId)) {
      try {
        const source = this.audioContext.createBufferSource();
        source.buffer = this.decodedAudioData;
        source.connect(this.audioContext.destination);
        source.start(0);
      } catch (error) {
        console.error("Errore nella riproduzione del suono:", error);
        this.initAudio();
      }
    }

    if (!this.isWindowFocused) {
      this.startTitleNotification();
    }

    const trimmedMessage =
      message.length > 60 ? message.substring(0, 60) + "..." : message;

    const onClick = () => {
      if (typeof window.openChatModal === "function") {
        window.openChatModal(notificationId);
      }
    };

    // Usa il sistema di aggregazione invece di mostrare subito la notifica
    this.aggregateAndShowNotification(notificationId, senderName, trimmedMessage, senderId);

    // Mostra sempre notifica in-app
    if (this.notificationsEnabled) {
      this.showInAppNotification(`Nuovo messaggio da ${senderName}`, trimmedMessage, onClick);
    }
  }

  notifySystem(title, message, onClick = null) {
    if (this.doNotDisturbEnabled) {
      return;
    }

    if (!this.notificationsEnabled) return;

    this.showInAppNotification(title, message, onClick);

    if (this.webNotificationsEnabled && Notification.permission === "granted") {
      try {
        const notification = new Notification(title, {
          body: message,
          icon: "/icons/app-icon.png",
          requireInteraction: false,
        });

        if (onClick && typeof onClick === "function") {
          notification.onclick = () => {
            window.focus();
            onClick();
            notification.close();
          };
        }

        setTimeout(() => notification.close(), 8000);

        return true;
      } catch (error) {
        console.error(
          "NotificationService: Error showing web notification:",
          error,
        );
      }
    }

    return false;
  }

  destroy() {
    window.removeEventListener("focus", this.handleWindowFocus);
    window.removeEventListener("blur", this.handleWindowBlur);

    if (this.titleInterval) {
      clearInterval(this.titleInterval);
      this.titleInterval = null;
    }

    if (this.processPendingInterval) {
      clearInterval(this.processPendingInterval);
      this.processPendingInterval = null;
    }

    if (this.resetNotifiedChatsInterval) {
      clearInterval(this.resetNotifiedChatsInterval);
      this.resetNotifiedChatsInterval = null;
    }

    if (this.notificationAggregationTimeout) {
      clearTimeout(this.notificationAggregationTimeout);
      this.notificationAggregationTimeout = null;
    }

    document.removeEventListener("doNotDisturbChanged", this.handleDndChange);

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch((err) => {
        console.error("Error closing AudioContext:", err);
      });
    }

    this.activeNotifications.forEach((data, id) => {
      if (data.timerId) {
        clearTimeout(data.timerId);
      }
      if (data.notification) {
        data.notification.close();
      }
    });

    this.activeNotifications.clear();
  }

  // NUOVO: Metodo helper per riprodurre il suono di test
  playNotificationSound() {
    if (!this.soundEnabled || !this.audioInitialized || !this.decodedAudioData) {
      console.warn("Cannot play sound: not initialized or disabled");
      return false;
    }

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = this.decodedAudioData;
      source.connect(this.audioContext.destination);
      source.start(0);
      return true;
    } catch (error) {
      console.error("Error playing notification sound:", error);
      return false;
    }
  }
}

// Crea un'istanza singleton del servizio
const notificationService = new NotificationService();
export default notificationService;