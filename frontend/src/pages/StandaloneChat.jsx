// src/pages/StandaloneChat.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { useNotifications } from "../redux/features/notifications/notificationsHooks";
import ChatWindow from "../components/chat/ChatWindow";
import useWindowManager from "../hooks/useWindowManager";
import { CircleX } from "lucide-react";
import { swal } from "../lib/common";
import axios from "axios";
import { config } from "../config";
import { useSelector } from "react-redux";
import { selectNotifications } from "../redux/features/notifications/notificationsSlice";

// Aggiungi un identificatore univoco per la finestra
if (!window.WINDOW_ID) {
  window.WINDOW_ID =
    Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Loading screen component
const LoadingScreen = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
    <div className="text-center">
      <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
      <p className="text-gray-600">Caricamento chat in corso...</p>
    </div>
  </div>
);

// Error screen component
const ErrorScreen = ({ error, onClose, onRetry }) => (
  <div className="flex h-screen w-screen items-center justify-center bg-gray-100 flex-col p-4">
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
      <div className="flex items-center text-red-500 mb-4">
        <CircleX className="h-6 w-6 mr-2" />
        <h2 className="text-xl font-semibold">Errore</h2>
      </div>
      <p className="text-gray-700 mb-4">{error}</p>
      <div className="flex gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors"
          >
            Riprova
          </button>
        )}
        <button
          onClick={() => window.close()}
          className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
        >
          Chiudi finestra
        </button>
      </div>
    </div>
  </div>
);

const StandaloneChat = () => {
  const { id } = useParams();
  const notificationId = parseInt(id);
  const windowManager = useWindowManager("standalone-");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [notification, setNotification] = useState(null);
  const [users, setUsers] = useState([]);
  const [responseOptions, setResponseOptions] = useState([]);
  const chatRegisteredRef = useRef(false);
  const initializationAttempted = useRef(false);

  // Extract functions from the hook
  const {
    fetchNotificationById,
    initializeWorker,
    unregisterStandaloneChat,
    registerOpenChat,
    toggleReadUnread,
    registerStandaloneChat,
    DBNotificationsView,
    reloadNotifications,
    restartNotificationWorker,
  } = useNotifications();

  // Aggiungi selettore per le notifiche
  const notifications = useSelector(selectNotifications);

  // Effect per monitorare le notifiche nello store
  useEffect(() => {
    if (notificationId && notifications.length > 0) {
      const foundNotification = notifications.find(
        (n) => n.notificationId === notificationId,
      );
      if (foundNotification && !loaded) {
        setNotification(foundNotification);
        setLoaded(true);
        document.title = `Chat: ${foundNotification.title || "Conversazione"}`;
      }
    }
  }, [notificationId, notifications, loaded]);

  // Miglioramento: funzione per recuperare il token e l'URL API in modo sicuro
  const getApiConfig = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Token non disponibile. Effettua nuovamente il login.");
    }
    return { token, apiBaseUrl: config.API_BASE_URL };
  };

  // Improved function to fetch users with retry mechanism
  const fetchUsers = async () => {
    try {
      const { token, apiBaseUrl } = getApiConfig();

      const response = await axios.get(`${apiBaseUrl}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache, no-store",
          Pragma: "no-cache",
        },
      });

      if (response.data) {
        setUsers(response.data);
        return response.data;
      }

      throw new Error("Risposta vuota dal server");
    } catch (error) {
      console.error("Errore caricamento utenti:", error);

      // Provide default users only in development
      if (process.env.NODE_ENV === "development") {
        const defaultUsers = [
          {
            userId: 1,
            firstName: "Utente",
            lastName: "Corrente",
            isCurrentUser: true,
          },
          { userId: 2, firstName: "Support", lastName: "Team" },
        ];
        setUsers(defaultUsers);
        return defaultUsers;
      }

      throw error;
    }
  };

  // Improved function to fetch response options
  const fetchResponseOptions = async () => {
    try {
      const { token, apiBaseUrl } = getApiConfig();

      const response = await axios.get(`${apiBaseUrl}/response-options`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache, no-store",
          Pragma: "no-cache",
        },
      });

      if (response.data) {
        setResponseOptions(response.data);
        return response.data;
      }

      throw new Error("Risposta vuota dal server");
    } catch (error) {
      console.error("Errore caricamento opzioni di risposta:", error);

      // Provide default options only in development
      if (process.env.NODE_ENV === "development") {
        const defaultOptions = [
          { id: 1, text: "Grazie per l'informazione" },
          { id: 2, text: "Capisco, procederò come indicato" },
          { id: 3, text: "Potrebbe fornirmi maggiori dettagli?" },
        ];
        setResponseOptions(defaultOptions);
        return defaultOptions;
      }

      // In production, rethrow to handle properly
      throw error;
    }
  };

  // Function to handle retries
  const handleRetry = useCallback(() => {
    setError(null);
    setRetryCount((prev) => prev + 1);
    setLoaded(false);
    initializationAttempted.current = false;

    // Force restart notifications worker on retry
    restartNotificationWorker(true);
  }, [restartNotificationWorker]);

  // Improved initialization function
  const initialize = useCallback(async () => {
    if (initializationAttempted.current) return;
    initializationAttempted.current = true;

    try {
      document.title = "Caricamento chat...";

      // Verify token
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Sessione scaduta, effettua il login");
      }

      if (!notificationId || isNaN(notificationId)) {
        throw new Error("ID chat non valido");
      }

      // Initialize redux worker with forceInit flag
      initializeWorker(true);

      // Ensure DB view is created
      await DBNotificationsView();

      // Aspetta che il worker sia pronto
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Carica la notifica con priorità alta
      await fetchNotificationById(notificationId, true);

      // Aspetta che lo store sia aggiornato
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Register this chat as open in redux store
      if (!chatRegisteredRef.current) {
        registerStandaloneChat(notificationId);
        registerOpenChat(notificationId);
        chatRegisteredRef.current = true;

        // Mark the notification as read
        await toggleReadUnread(notificationId, true);
      }
    } catch (error) {
      console.error("Errore inizializzazione:", error);
      setError(error.message || "Errore di caricamento");
      initializationAttempted.current = false;
      return null;
    }
  }, [
    notificationId,
    fetchNotificationById,
    initializeWorker,
    DBNotificationsView,
    reloadNotifications,
    registerStandaloneChat,
    registerOpenChat,
    toggleReadUnread,
    notifications,
  ]);

  // Initialization effect
  useEffect(() => {
    // Execute initialization
    initialize();

    // Set listener for window closing
    const handleBeforeUnload = () => {
      if (notificationId && chatRegisteredRef.current) {
        unregisterStandaloneChat(notificationId);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (notificationId && chatRegisteredRef.current) {
        unregisterStandaloneChat(notificationId);
      }
    };
  }, [notificationId, initialize, unregisterStandaloneChat, retryCount]);

  // Effect to handle notification updates from events
  useEffect(() => {
    const handleNotificationUpdate = (event) => {
      const { notificationId: updatedId } = event.detail || {};

      // Only update if it matches our notification
      if (updatedId && updatedId === notificationId && loaded) {
        fetchNotificationById(notificationId)
          .then((updatedNotification) => {
            if (updatedNotification) {
              setNotification(updatedNotification);
            }
          })
          .catch((err) =>
            console.error("Errore aggiornamento da evento:", err),
          );
      }
    };

    // Listen for various notification update events
    document.addEventListener(
      "notifications-updated",
      handleNotificationUpdate,
    );
    document.addEventListener("chat-message-sent", handleNotificationUpdate);
    document.addEventListener("message-updated", handleNotificationUpdate);
    document.addEventListener(
      "message-reaction-updated",
      handleNotificationUpdate,
    );
    document.addEventListener("new-message-received", handleNotificationUpdate);

    return () => {
      document.removeEventListener(
        "notifications-updated",
        handleNotificationUpdate,
      );
      document.removeEventListener(
        "chat-message-sent",
        handleNotificationUpdate,
      );
      document.removeEventListener("message-updated", handleNotificationUpdate);
      document.removeEventListener(
        "message-reaction-updated",
        handleNotificationUpdate,
      );
      document.removeEventListener(
        "new-message-received",
        handleNotificationUpdate,
      );
    };
  }, [notificationId, fetchNotificationById, loaded]);

  // Function to close the window
  const handleClose = useCallback(() => {
    // Before closing, unregister the chat
    if (notificationId && chatRegisteredRef.current) {
      unregisterStandaloneChat(notificationId);
      chatRegisteredRef.current = false;
    }

    // Close the window
    window.close();

    // If window doesn't close (browser might block), show a message
    setTimeout(() => {
      // Window is still open, show message
      swal.fire({
        title: "Chiusura finestra bloccata",
        text: "Il browser ha impedito la chiusura automatica della finestra. Chiudila manualmente.",
        icon: "info",
        confirmButtonText: "OK",
      });
    }, 500);
  }, [notificationId, unregisterStandaloneChat]);

  // If there was an error, show error message
  if (error) {
    return (
      <ErrorScreen error={error} onClose={handleClose} onRetry={handleRetry} />
    );
  }

  // If data is not loaded yet, show spinner
  if (!loaded || !notification) {
    return <LoadingScreen />;
  }

  // Render the chat
  return (
    <div className="h-screen w-screen bg-gray-100 overflow-hidden">
      <ChatWindow
        notification={notification}
        onClose={handleClose}
        onMinimize={() => window.blur()}
        windowManager={windowManager}
        isStandalone={true}
        // Pass users and response options directly as props
        standaloneData={{
          users: users,
          responseOptions: responseOptions,
        }}
      />
    </div>
  );
};

export default StandaloneChat;
