// src/redux/features/notifications/NotificationProvider.jsx
import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNotifications } from "./notificationsHooks";
import notificationService from "../../../services/notifications/NotificationService";
import { store } from "../../../redux/store";

/**
 * Proper NotificationProvider that initializes and connects the notification system
 */
export const NotificationProvider = ({ children }) => {
  const dispatch = useDispatch();
  const { initializeWorker, reloadNotifications, forceLoadNotifications } =
    useNotifications();

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

  // Initialize the notification worker on component mount
  useEffect(() => {
    initializeWorker();

    // Force reload notifications after a short delay to ensure initial data
    const timeoutId = setTimeout(() => {
      reloadNotifications(true); // high priority
    }, 1000);

    // Initialize audio system through user interaction
    const initAudioOnInteraction = () => {
      notificationService.initAudio().then((success) => {
        if (success) {
          // Remove event listeners after successful initialization
          document.removeEventListener("click", initAudioOnInteraction);
          document.removeEventListener("keydown", initAudioOnInteraction);
          document.removeEventListener("touchstart", initAudioOnInteraction);
        }
      });
    };

    // Add event listeners for audio initialization
    document.addEventListener("click", initAudioOnInteraction, { once: false });
    document.addEventListener("keydown", initAudioOnInteraction, {
      once: false,
    });
    document.addEventListener("touchstart", initAudioOnInteraction, {
      once: false,
    });

    // Setup periodic notification refresh
    const refreshInterval = setInterval(() => {
      forceLoadNotifications();
    }, 30000); // Every 30 seconds

    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
      clearInterval(refreshInterval);
      document.removeEventListener("click", initAudioOnInteraction);
      document.removeEventListener("keydown", initAudioOnInteraction);
      document.removeEventListener("touchstart", initAudioOnInteraction);
    };
  }, [initializeWorker, reloadNotifications, forceLoadNotifications]);

  // Listen for new-message-received events
  useEffect(() => {
    const handleNewMessage = (event) => {
      const { notificationId, newMessageCount } = event.detail || {};

      if (notificationId && newMessageCount > 0) {
        forceLoadNotifications();
      }
    };

    document.addEventListener("new-message-received", handleNewMessage);

    return () => {
      document.removeEventListener("new-message-received", handleNewMessage);
    };
  }, [forceLoadNotifications]);

  return <>{children}</>;
};

export default NotificationProvider;
