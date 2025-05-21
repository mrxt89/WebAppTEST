// src/redux/features/notifications/NotificationProvider.jsx
import React, { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useNotifications } from "./notificationsHooks";
import notificationService from "../../../services/notifications/NotificationService";
import { store } from "../../../redux/store";

/**
 * Proper NotificationProvider that initializes and connects the notification system
 */
export const NotificationProvider = ({ children }) => {
  const dispatch = useDispatch();
  const { 
    initializeWorker, 
    reloadNotifications, 
    forceLoadNotifications,
    stopNotificationWorker  // Ottieni lo stopNotificationWorker da useNotifications
  } = useNotifications();
  
  // Riferimenti per timeout e interval
  const timeoutIdRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const audioInitializedRef = useRef(false);

  // Inizializza il contesto delle notifiche prima di tutto
  useEffect(() => {
    if (!window.notificationsContext) {
      window.notificationsContext = {
        notifications: [],
        isNotificationMuted: (notification) => notification?.isMuted || false,
        markMessageAsReceived: (notificationId, messageId) => {
          if (store?.dispatch) {
            store.dispatch({
              type: "notifications/markMessageAsReceived",
              payload: { notificationId, messageId },
            });
            console.log(
              "[DEBUG] NotificationProvider: Marked message as received",
              { notificationId, messageId },
            );
          }
        },
      };
    }
  }, []); // Esegui solo al mount

  // Initialize audio system through user interaction - dichiarato fuori dagli useEffect
  const initAudioOnInteraction = () => {
    if (audioInitializedRef.current) return;
    
    notificationService.initAudio().then((success) => {
      if (success) {
        audioInitializedRef.current = true;
        // Remove event listeners after successful initialization
        document.removeEventListener("click", initAudioOnInteraction);
        document.removeEventListener("keydown", initAudioOnInteraction);
        document.removeEventListener("touchstart", initAudioOnInteraction);
      }
    });
  };

  // Handler for new messages - dichiarato fuori dagli useEffect
  const handleNewMessage = (event) => {
    const { notificationId, newMessageCount } = event.detail || {};

    if (notificationId && newMessageCount > 0) {
      forceLoadNotifications();
    }
  };

  // Cleanup function - dichiarata fuori dagli useEffect
  const handleCleanup = () => {
    // Pulisci contesto globale
    if (window.notificationsContext) {
      window.notificationsContext = null;
    }
    
    // Ferma i worker
    if (stopNotificationWorker) {
      stopNotificationWorker();
    }
    
    // Pulisci eventuali interval o timeout
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    // Rimuovi tutti gli event listener
    document.removeEventListener("click", initAudioOnInteraction);
    document.removeEventListener("keydown", initAudioOnInteraction);
    document.removeEventListener("touchstart", initAudioOnInteraction);
    document.removeEventListener("new-message-received", handleNewMessage);
    
    // Reset dello stato
    audioInitializedRef.current = false;
  };

  // Listen for cleanup events
  useEffect(() => {
    document.addEventListener("notifications-cleanup", handleCleanup);
    
    return () => {
      document.removeEventListener("notifications-cleanup", handleCleanup);
    };
  }, []);

  // Initialize the notification worker on component mount
  useEffect(() => {
    initializeWorker();

    // Force reload notifications after a short delay to ensure initial data
    timeoutIdRef.current = setTimeout(() => {
      reloadNotifications(true); // high priority
    }, 1000);

    // Add event listeners for audio initialization
    document.addEventListener("click", initAudioOnInteraction, { once: false });
    document.addEventListener("keydown", initAudioOnInteraction, {
      once: false,
    });
    document.addEventListener("touchstart", initAudioOnInteraction, {
      once: false,
    });

    // Cleanup on unmount
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      document.removeEventListener("click", initAudioOnInteraction);
      document.removeEventListener("keydown", initAudioOnInteraction);
      document.removeEventListener("touchstart", initAudioOnInteraction);
    };
  }, [initializeWorker, reloadNotifications, forceLoadNotifications]);

  // Listen for new-message-received events
  useEffect(() => {
    document.addEventListener("new-message-received", handleNewMessage);

    return () => {
      document.removeEventListener("new-message-received", handleNewMessage);
    };
  }, [forceLoadNotifications]);

  return <>{children}</>;
};

export default NotificationProvider;