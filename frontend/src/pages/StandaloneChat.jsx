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
import { useSelector, useDispatch } from "react-redux";
import { 
  selectNotifications,
  selectOpenChatData,
  setOpenChatData,
  fetchNotificationById,
  removeOpenChatData
} from "../redux/features/notifications/notificationsSlice";

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
  const dispatch = useDispatch();
  const windowManager = useWindowManager("standalone-");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [notification, setNotification] = useState(null);
  const [users, setUsers] = useState([]);
  const [responseOptions, setResponseOptions] = useState([]);
  const chatRegisteredRef = useRef(false);
  const initializationCompleteRef = useRef(false);
  const dataFetchedRef = useRef(false);

  // Extract functions from the hook  
  const {
    unregisterStandaloneChat,
    registerOpenChat,
    toggleReadUnread,
    registerStandaloneChat,
  } = useNotifications();

  // Selettori Redux
  const notifications = useSelector(selectNotifications);
  const openChatData = useSelector(state => selectOpenChatData(state, notificationId));

  // Miglioramento: funzione per recuperare il token e l'URL API in modo sicuro
  const getApiConfig = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Token non disponibile. Effettua nuovamente il login.");
    }
    return { token, apiBaseUrl: config.API_BASE_URL };
  };

  // Funzione ottimizzata per caricare utenti e opzioni
  const loadInitialData = useCallback(async () => {
    // Previeni chiamate multiple
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    try {
      const { token, apiBaseUrl } = getApiConfig();

      // Carica utenti e opzioni in parallelo
      const [usersResponse, optionsResponse] = await Promise.all([
        axios.get(`${apiBaseUrl}/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
        }),
        axios.get(`${apiBaseUrl}/notification-response-options`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
        })
      ]);

      if (usersResponse.data) {
        setUsers(usersResponse.data);
      }

      if (optionsResponse.data) {
        setResponseOptions(optionsResponse.data);
      }
    } catch (error) {
      console.error("Errore caricamento dati iniziali:", error);
      
      // In sviluppo, usa dati di default
      if (process.env.NODE_ENV === "development") {
        setUsers([
          { userId: 1, firstName: "Utente", lastName: "Corrente", isCurrentUser: true },
          { userId: 2, firstName: "Support", lastName: "Team" },
        ]);
        setResponseOptions([
          { id: 1, text: "Grazie per l'informazione" },
          { id: 2, text: "Capisco, procederò come indicato" },
          { id: 3, text: "Potrebbe fornirmi maggiori dettagli?" },
        ]);
      }
    }
  }, []);

  // Function to handle retries
  const handleRetry = useCallback(() => {
    setError(null);
    setRetryCount((prev) => prev + 1);
    setLoaded(false);
    initializationCompleteRef.current = false;
    dataFetchedRef.current = false;
  }, []);

  // Funzione principale di inizializzazione
  const initialize = useCallback(async () => {
    // Previeni inizializzazioni multiple
    if (initializationCompleteRef.current) return;
    initializationCompleteRef.current = true;

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

      // Prima carica i dati statici (utenti e opzioni)
      await loadInitialData();

      // Controlla se abbiamo già i dati in Redux
      if (openChatData && openChatData.lastFullUpdate) {
        console.log(`✅ StandaloneChat: Usando dati esistenti da Redux per chat ${notificationId}`);
        setNotification(openChatData);
        setLoaded(true);
        document.title = `Chat: ${openChatData.title || "Conversazione"}`;
        
        // Register this chat as open se non già fatto
        if (!chatRegisteredRef.current) {
          registerStandaloneChat(notificationId);
          registerOpenChat(notificationId);
          chatRegisteredRef.current = true;
          
          // Mark as read
          if (!openChatData.isReadByUser) {
            toggleReadUnread(notificationId, true);
          }
        }
        
        return;
      }

      console.log(`🔄 StandaloneChat: Caricando dati completi per chat ${notificationId}...`);
      
      try {
        // Carica la notifica con TUTTI i messaggi
        const result = await dispatch(fetchNotificationById(notificationId)).unwrap();
        
        if (result) {
          console.log(`✅ StandaloneChat: Caricati dati completi per chat ${notificationId}`);
          
          setNotification(result);
          setLoaded(true);
          document.title = `Chat: ${result.title || "Conversazione"}`;
          
          // Register this chat as open se non già fatto
          if (!chatRegisteredRef.current) {
            registerStandaloneChat(notificationId);
            registerOpenChat(notificationId);
            chatRegisteredRef.current = true;
            
            // Mark as read
            if (!result.isReadByUser) {
              toggleReadUnread(notificationId, true);
            }
          }
        } else {
          throw new Error("Nessun dato ricevuto per la notifica");
        }
      } catch (error) {
        console.error(`Errore caricamento notifica ${notificationId}:`, error);
        throw error;
      }

    } catch (error) {
      console.error("Errore inizializzazione:", error);
      setError(error.message || "Errore di caricamento");
      initializationCompleteRef.current = false;
      return null;
    }
  }, [
    notificationId,
    openChatData,
    registerStandaloneChat,
    registerOpenChat,
    toggleReadUnread,
    dispatch,
    loadInitialData
  ]);

  // Initialization effect - esegui solo una volta
  useEffect(() => {
    initialize();
  }, [notificationId, retryCount]); // Rimuovi initialize dalle dipendenze per evitare loop

  // Cleanup effect
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (notificationId && chatRegisteredRef.current) {
        unregisterStandaloneChat(notificationId);
        dispatch(removeOpenChatData(notificationId));
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (notificationId && chatRegisteredRef.current) {
        unregisterStandaloneChat(notificationId);
        dispatch(removeOpenChatData(notificationId));
      }
    };
  }, [notificationId, unregisterStandaloneChat, dispatch]);

  // Effect per gestire aggiornamenti notifica
  useEffect(() => {
    if (!loaded) return;

    const handleNotificationUpdate = async (event) => {
      const { notificationId: updatedId, reason } = event.detail || {};

      if (updatedId && updatedId === notificationId) {
        console.log(`🔄 StandaloneChat: Ricaricando per evento ${reason}...`);
        
        try {
          const result = await dispatch(fetchNotificationById(notificationId)).unwrap();
          if (result) {
            setNotification(result);

            // Se è un nuovo messaggio, segna la chat come letta
            if (reason === 'new-message-received' || reason === 'chat-message-sent') {
              dispatch(toggleReadUnread({
                notificationId,
                isReadByUser: true
              }));
            }
          }
        } catch (error) {
          console.error(`Errore ricaricamento per evento:`, error);
        }
      }
    };

    // Ascolta eventi specifici per chat aperte
    const events = [
      "reload-open-chat",
      "chat-message-sent",
      "message-updated",
      "message-reaction-updated",
      "message-deleted",
      "new-message-received"
    ];

    events.forEach(eventName => {
      document.addEventListener(eventName, handleNotificationUpdate);
    });

    return () => {
      events.forEach(eventName => {
        document.removeEventListener(eventName, handleNotificationUpdate);
      });
    };
  }, [notificationId, loaded, dispatch]);

  // Function to close the window
  const handleClose = useCallback(() => {
    // Before closing, unregister the chat
    if (notificationId && chatRegisteredRef.current) {
      unregisterStandaloneChat(notificationId);
      dispatch(removeOpenChatData(notificationId));
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
  }, [notificationId, unregisterStandaloneChat, dispatch]);

  // Se OpenChatData è disponibile, usalo invece di notification
  const currentNotification = openChatData || notification;

  // If there was an error, show error message
  if (error) {
    return (
      <ErrorScreen error={error} onClose={handleClose} onRetry={handleRetry} />
    );
  }

  // If data is not loaded yet, show spinner
  if (!loaded || !currentNotification) {
    return <LoadingScreen />;
  }

  // Render the chat
  return (
    <div className="h-screen w-screen bg-gray-100 overflow-hidden">
      <ChatWindow
        notification={currentNotification}
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