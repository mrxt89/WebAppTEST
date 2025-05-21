import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import axiosInstance from "../lib/axios";
import { swal } from "../lib/common";
import { config } from "../config";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
  const [userGroups, setUserGroups] = useState(() => {
    try {
      const storedGroups = localStorage.getItem("userGroups");
      if (!storedGroups) return [];

      const parsedGroups = JSON.parse(storedGroups);

      // Se parsedGroups è una stringa (già in formato JSON), parsala di nuovo
      if (typeof parsedGroups === "string") {
        return JSON.parse(parsedGroups);
      }

      // Altrimenti ritorna l'array di oggetti
      return parsedGroups;
    } catch (error) {
      console.error("Errore nel parsing dei gruppi utente:", error);
      return [];
    }
  });

  const [isDBNotificationsViewExecuted, setIsDBNotificationsViewExecuted] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const sessionTimeoutRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token && !user) {
      axiosInstance
        .get("/currentUser")
        .then((response) => {
          const userData = response.data.user;
          setUser(userData);
          setLoading(false);
          setSessionTimeout(userData.sessionDurationMinutes);

          // Store CompanyId in localStorage for persistence if it exists
          if (userData.CompanyId) {
            localStorage.setItem("companyId", userData.CompanyId);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch current user:", error);
          handleLogout();
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    return () => {
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
    };
  }, []);

  const setSessionTimeout = (minutes) => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }

    if (minutes) {
      const milliseconds = minutes * 60 * 1000;
      sessionTimeoutRef.current = setTimeout(async () => {
        await swal.fire({
          title: "Sessione scaduta",
          text: "La tua sessione è scaduta. Effettua nuovamente il login.",
          icon: "warning",
          confirmButtonText: "OK",
        });
        handleLogout();
      }, milliseconds);
    }
  };

  const resetSessionTimeout = () => {
    if (user?.sessionDurationMinutes) {
      setSessionTimeout(user.sessionDurationMinutes);
    }
  };

  const handleLogout = () => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    
    try {
      // 1. Chiudi tutte le chat aperte prima di stoppare i worker
      if (typeof window.closeAllChats === 'function') {
        window.closeAllChats();
      }
      
      // 2. Ferma il worker delle notifiche inviando l'evento specifico
      document.dispatchEvent(new CustomEvent("stop-notification-worker"));
      
      // 3. Termina esplicitamente il worker se accessibile
      if (window.notificationWorker) {
        try {
          window.notificationWorker.terminate();
          delete window.notificationWorker;
        } catch (e) {
          console.error("Error terminating notification worker:", e);
        }
      }
      
      // 4. Pulisci il contesto delle notifiche globale
      if (window.notificationsContext) {
        window.notificationsContext = null;
      }
      
      // 5. Pulisci il servizio notifiche, se è stato inizializzato
      if (window.notificationService) {
        if (typeof window.notificationService.cleanup === 'function') {
          window.notificationService.cleanup();
        }
        delete window.notificationService;
      }
      
      // 6. Emetti evento per la pulizia completa delle notifiche
      document.dispatchEvent(new CustomEvent("notifications-cleanup"));
      
      // 7. Emetti evento per resettare lo store Redux
      document.dispatchEvent(new CustomEvent("reset-redux-store"));
      
      // 8. Opzionale: Notifica al backend del logout
      const token = localStorage.getItem("token");
      if (token) {
        try {
          // Chiamata asincrona al backend per registrare il logout, ma non aspettiamo la risposta
          fetch(`${config.API_BASE_URL}/update-last-online`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'logout' })
          }).catch(err => console.error("Errore durante il logout sul server:", err));
        } catch (e) {
          console.error("Error during server logout notification:", e);
        }
      }
      
      // 9. Pulisci tutti i dati di localStorage relativi all'utente
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("companyId");
      localStorage.removeItem("userGroups");
      localStorage.removeItem("standalone_chats");
      localStorage.removeItem("mutedChats");
      localStorage.removeItem("chat_master_window");
      localStorage.removeItem("chat_master_heartbeat");
      localStorage.removeItem("notification_settings");
      
      // 10. Pulisci anche altri dati specifici delle notifiche
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('notification_') || 
            key.startsWith('chat_') || 
            key.startsWith('attachment_') ||
            key.includes('notif')
          )) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (e) {
        console.error("Error cleaning notification data from localStorage:", e);
      }
    } catch (error) {
      console.error("Error during logout cleanup:", error);
    } finally {
      // 11. Aggiorna lo stato del contesto
      setUser(null);
      setUserGroups([]);
      setIsDBNotificationsViewExecuted(false);
      
      // 12. Naviga alla pagina di login
      navigate("/login");
    }
  };

  // Updated login function to accept optional companyId parameter
  const login = async (username, password, companyId = null) => {
    try {
      const requestData = {
        username,
        password,
      };

      // Add companyId to request if provided
      if (companyId) {
        requestData.companyId = companyId;
      }

      const response = await axios.post(
        `${config.API_BASE_URL}/login`,
        requestData,
      );

      const { accessToken, user } = response.data;

      // Store user data including CompanyId
      localStorage.setItem("token", accessToken);
      localStorage.setItem("user", JSON.stringify(user));

      const groups =
        typeof user.groups === "string" ? JSON.parse(user.groups) : user.groups;
      setUserGroups(groups);
      
      // Salva anche i gruppi utente nel localStorage per persistenza
      localStorage.setItem("userGroups", JSON.stringify(groups));

      // Separately store CompanyId for easier access
      if (user.CompanyId) {
        localStorage.setItem("companyId", user.CompanyId);
      }

      setUser(user);
      setIsDBNotificationsViewExecuted(false);
      setSessionTimeout(user.sessionDurationMinutes);

      axiosInstance.defaults.headers.common["Authorization"] =
        `Bearer ${accessToken}`;

      // Notifica l'app che c'è stato un login completato con successo
      // Questo può essere intercettato per inizializzare il worker delle notifiche
      document.dispatchEvent(new CustomEvent("user-login-success"));

      return true;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const isAuthenticated = () => {
    const token = localStorage.getItem("token");
    return !!token && !!user;
  };

  // Function to get current CompanyId
  const getCompanyId = () => {
    return user?.CompanyId || localStorage.getItem("companyId") || null;
  };

  // NUOVA FUNZIONE: Get token per standalone pages
  const getToken = () => {
    return localStorage.getItem("token");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userGroups,
        login,
        logout: handleLogout,
        isAuthenticated,
        isDBNotificationsViewExecuted,
        setIsDBNotificationsViewExecuted,
        loading,
        resetSessionTimeout,
        getCompanyId, // Added new function to get CompanyId
        getToken, // Nuova funzione per ottenere il token
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;