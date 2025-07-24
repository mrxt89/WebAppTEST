// src/components/main/MainPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { swal } from "@/lib/common";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import NotificationSidebar from "../notifications/NotificationSidebar";
import MainContainer from "./MainContainer";
import ChatWindow from "../chat/ChatWindow";
import MinimizedChatsDock from "../chat/MinimizedChatsDock";
import WindowManagerMenu from "../chat/WindowManagerMenu";
import { useToast } from "../ui/use-toast";
import { Toaster } from "../ui/toaster";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import NewMessageWindow from "../chat/NewMessageWindow";
import { config } from "../../config";
import Header from "./Header";
import NotificationConsentModal from "../notifications/NotificationConsentModal";
import DoNotDisturbIndicator from "../chat/DoNotDisturbIndicator";
import useWindowManager from "../../hooks/useWindowManager";
import { useDispatch } from "react-redux";
import { fetchNotificationAttachments } from "@/redux/features/notifications/notificationsActions";
import { registerOpenChatModal, initChatPagination, setOpenChatData  } from "@/redux/features/notifications/notificationsSlice";
import { WikiProvider, WikiHelper } from "../wiki";

const MainPage = () => {
  const dispatch = useDispatch();
  const {
    user,
    logout,
    isDBNotificationsViewExecuted,
    setIsDBNotificationsViewExecuted,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    notifications,
    unreadCount,
    toggleReadUnread,
    togglePin,
    toggleFavorite,
    reopenChat,
    closeChat,
    unreadMessages,
    markMessageAsRead,
    markMessageAsReceived,
    fetchNotificationById,
    DBNotificationsView,
    initializeWorker,
    registerOpenChat,
    unregisterOpenChat,
    reloadNotifications,
    restartNotificationWorker,
    loadNotifications,
    forceLoadNotifications,
  } = useNotifications();

  const [newMessageWindows, setNewMessageWindows] = useState([]);
  
  // Window manager hook
  const windowManager = useWindowManager();
  const {
    createWindow,
    activateWindow,
    toggleMaximize,
    toggleMinimize,
    closeWindow,
    arrangeWindowsGrid,
    tileWindowsHorizontally,
    tileWindowsVertically,
    cascadeWindows,
    getMinimizedWindows,
    getVisibleWindows,
    windowStates,
  } = windowManager;

  const notificationServiceInitialized = useRef(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const menuRef = useRef(null);
  const dropdownRef = useRef(null);
  const [menuItems, setMenuItems] = useState([]);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [isPageComponent, setIsPageComponent] = useState(false);
  const [pageTitle, setPageTitle] = useState("");
  const [currentLevelItems, setCurrentLevelItems] = useState([]);
  const [openChats, setOpenChats] = useState([]);
  const [minimizedChats, setMinimizedChats] = useState([]);
  const [windowManagerMenuOpen, setWindowManagerMenuOpen] = useState(false);


  // Inizializza il worker Redux all'avvio
  useEffect(() => {
    initializeWorker();
    setTimeout(() => {
      reloadNotifications(true);
    }, 1000);
  }, [initializeWorker, reloadNotifications]);

  // Richiedi permessi di notifica
  useEffect(() => {
    if (
      window.Notification &&
      Notification.permission !== "granted" &&
      Notification.permission !== "denied"
    ) {
      Notification.requestPermission();
    }
  }, []);

  // Inizializza il servizio di notifica
  useEffect(() => {
    import("@/services/notifications/NotificationService")
      .then((module) => {
        window.notificationService = module.default;

        if (window.notificationService) {
          const initAudioOnce = () => {
            window.notificationService.initAudio().then((success) => {
              if (success) {
                notificationServiceInitialized.current = true;
                document.removeEventListener("click", initAudioOnce);
                document.removeEventListener("keydown", initAudioOnce);
                document.removeEventListener("touchstart", initAudioOnce);
              }
            });
          };

          document.addEventListener("click", initAudioOnce, { once: false });
          document.addEventListener("keydown", initAudioOnce, { once: false });
          document.addEventListener("touchstart", initAudioOnce, {
            once: false,
          });

          if (Notification.permission !== "denied") {
            window.notificationService.requestNotificationPermission();
          }
        }
      })
      .catch((error) => {
        console.error(
          "Errore nell'inizializzazione del servizio di notifica:",
          error,
        );
      });

    return () => {
      if (window.notificationService) {
        window.notificationService.cleanup
          ? window.notificationService.cleanup()
          : window.notificationService.destroy
            ? window.notificationService.destroy()
            : null;
        delete window.notificationService;
      }
    };
  }, []);

  // Helper per parsing messaggio
  const parseMessages = (messages) => {
    if (!messages) return [];
    if (typeof messages === "string") {
      try {
        return JSON.parse(messages);
      } catch (error) {
        console.error("Error parsing messages:", error);
        return [];
      }
    }
    return messages;
  };

  // Evento listener per l'apertura del modale nuovo messaggio
  useEffect(() => {
    const handleOpenNewMessageModal = (event) => {
      const props = event.detail || {};
      
      console.log("MainPage - Evento openNewMessageModal ricevuto:", props);
      
      const newWindowId = `new-message-${Date.now()}`;
      
      // Crea la finestra nel window manager
      if (windowManager?.createWindow) {
        windowManager.createWindow(
          newWindowId,
          props.defaultTitle || "Nuovo messaggio",
          { 
            x: 150 + (newMessageWindows.length * 30), 
            y: 150 + (newMessageWindows.length * 30), 
            width: 900, 
            height: 700 
          }
        );
      }
      
      // Aggiungi la finestra alla lista con tutti i dati necessari
      setNewMessageWindows(prev => [...prev, { 
        id: newWindowId,
        ...props 
      }]);
    };
  
    document.addEventListener("openNewMessageModal", handleOpenNewMessageModal);
  
    return () => {
      document.removeEventListener("openNewMessageModal", handleOpenNewMessageModal);
    };
  }, [newMessageWindows.length, windowManager]);

  // NUOVO: Effect per gestire reload delle chat aperte
useEffect(() => {
  const handleReloadOpenChat = async (event) => {
    const { notificationId } = event.detail;
    
    // Trova la chat aperta
    const openChat = openChats.find(
      chat => chat.notificationId === notificationId
    );
    
    if (openChat) {
      // Ricarica dati completi
      const fullData = await fetchNotificationById(notificationId, true);
      
      if (fullData) {
        // Aggiorna la chat aperta con i nuovi dati
        setOpenChats(prevChats => 
          prevChats.map(chat => 
            chat.notificationId === notificationId ? fullData : chat
          )
        );
        
        // Carica anche allegati se necessario
        try {
          await dispatch(fetchNotificationAttachments(notificationId)).unwrap();
        } catch (error) {
          console.error("Errore caricamento allegati:", error);
        }
      }
    }
  };

  document.addEventListener("reload-open-chat", handleReloadOpenChat);
  
  return () => {
    document.removeEventListener("reload-open-chat", handleReloadOpenChat);
  };
}, [openChats, fetchNotificationById, dispatch]);



// Enhanced open chat modal function
const openChatModal = async (notificationId) => {
  if (!notificationId) {
    console.error("openChatModal chiamato senza un ID notifica valido");
    return;
  }

  try {
    console.log(`🔄 MainPage: Caricando prima pagina di messaggi per chat ${notificationId}`);
    
    // Inizializza la paginazione PRIMA di caricare i dati
    dispatch(initChatPagination({ 
      notificationId,
      hasMoreMessages: true,
      isLoadingMore: false,
      pageSize: 25
    }));
    
    // Carica la prima pagina di messaggi con parametro openChat=1 per ottenere il conteggio totale
    const response = await axios.get(
      `${config.API_BASE_URL}/notifications/${notificationId}?pageSize=25&openChat=1`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    const initialData = response.data;

    if (initialData) {
      // Log per debug
      console.log(`📥 Dati iniziali ricevuti:`, {
        messageCount: initialData.messageCount,
        totalMessageCount: initialData.totalMessageCount,
        hasMoreMessages: initialData.hasMoreMessages,
        messagesLength: Array.isArray(initialData.messages) 
          ? initialData.messages.length 
          : (typeof initialData.messages === 'string' ? JSON.parse(initialData.messages || "[]").length : 0)
      });

      // Salva i dati iniziali in openChatData con info di paginazione
      dispatch(setOpenChatData({
        notificationId,
        data: {
          ...initialData,
          _isInitialLoad: true,
          hasMoreMessages: initialData.hasMoreMessages,
          totalMessageCount: initialData.totalMessageCount || initialData.messageCount
        }
      }));

      // Carica allegati
      try {
        await dispatch(fetchNotificationAttachments(notificationId)).unwrap();
      } catch (error) {
        console.error("Errore nel caricamento degli allegati:", error);
      }

      // Registra e apri la chat
      toggleReadUnread(notificationId, true);
      registerOpenChat(notificationId);

      // Gestione finestra
      const isMinimized = minimizedChats.some(
        (chat) => chat.notificationId === initialData.notificationId,
      );

      if (windowManager?.windowStates?.[initialData.notificationId]) {
        windowManager.activateWindow(initialData.notificationId);
      } else {
        const defaultPos = {
          x: Math.max(0, (window.innerWidth - 900) / 2),
          y: 0,
          width: 900,
          height: 700,
        };

        if (windowManager?.createWindow) {
          windowManager.createWindow(
            initialData.notificationId,
            initialData.title || "Nuova Chat",
            defaultPos,
          );
        }
      }

      // Aggiungi a openChats
      setOpenChats((prevChats) => {
        const existingChat = prevChats.find(
          (chat) => chat.notificationId === initialData.notificationId
        );
        
        if (!existingChat) {
          return [...prevChats, initialData];
        }
        
        return prevChats.map((chat) =>
          chat.notificationId === initialData.notificationId
            ? initialData
            : chat,
        );
      });

      // Rimuovi dalle chat minimizzate se presente
      setMinimizedChats((prevMinimized) => 
        prevMinimized.filter(
          (chat) => chat.notificationId !== initialData.notificationId
        )
      );

      console.log(`✅ MainPage: Chat ${notificationId} aperta con ${initialData.messages?.length || 0} messaggi iniziali`);
    }
  } catch (error) {
    console.error("Errore durante l'apertura della chat:", error);
    
    // Mostra un messaggio di errore all'utente
    if (error.response?.status === 404) {
      swal.fire({
        icon: "error",
        title: "Chat non trovata",
        text: "La chat richiesta non esiste o non hai i permessi per accedervi.",
      });
    } else {
      swal.fire({
        icon: "error",
        title: "Errore",
        text: "Si è verificato un errore durante l'apertura della chat.",
      });
    }
  }
};

  // Registra openChatModal in Redux quando il componente è montato
  useEffect(() => {
    registerOpenChatModal(openChatModal);
    
    return () => {
      registerOpenChatModal(null);
    };
  }, [openChatModal]);

  // Gestisci l'evento di nuovo messaggio
  useEffect(() => {
    const handleNewMessage = (event) => {
      const { notificationId, newMessageCount } = event.detail || {};

      if (notificationId && newMessageCount) {
        const notification = notifications.find(
          (n) => n.notificationId === parseInt(notificationId),
        );

        if ("Notification" in window && Notification.permission === "granted") {
          try {
            const title = notification?.title || "Nuovo messaggio";
            const message = `Hai ricevuto nuovi messaggi`;

            const webNotification = new Notification(title, {
              body: message,
              icon: "/icons/app-icon.png",
            });

            webNotification.onclick = () => {
              window.focus();
              openChatModal(notificationId);
              webNotification.close();
            };

            setTimeout(() => webNotification.close(), 120000);
          } catch (e) {
            console.error("Error showing direct notification:", e);
          }
        }

        fetchNotificationById(notificationId, true);
      }
    };

    document.addEventListener("new-message-received", handleNewMessage);

    return () => {
      document.removeEventListener("new-message-received", handleNewMessage);
    };
  }, [notifications, fetchNotificationById]);

  // Ascolta eventuali errori di notifica per debug
  useEffect(() => {
    const handleNotificationError = (error) => {
      console.error("Notification error:", error);
    };

    window.addEventListener("error", (event) => {
      if (
        event.message &&
        (event.message.includes("notification") ||
          event.message.includes("Notification") ||
          event.message.includes("permission"))
      ) {
        handleNotificationError(event);
      }
    });

    return () => {
      window.removeEventListener("error", handleNotificationError);
    };
  }, []);



  // Handler per gestire gli aggiornamenti di stato delle chat
  useEffect(() => {
    const handleChatStatusChange = async (event) => {
      const { notificationId, action, timestamp } = event.detail || {};

      if (!notificationId) return;

      try {
        await fetchNotificationById(notificationId, true);

        const openChat = openChats.find(
          (chat) => chat.notificationId === notificationId,
        );
        if (openChat) {
          setOpenChats((prevChats) => {
            return prevChats.map((chat) =>
              chat.notificationId === notificationId
                ? {
                    ...chat,
                    archived:
                      action === "archived"
                        ? 1
                        : action === "unarchived"
                          ? 0
                          : chat.archived,
                    chatLeft: action === "left" ? 1 : chat.chatLeft,
                    _lastUpdate: timestamp || Date.now(),
                  }
                : chat,
            );
          });
        }
      } catch (error) {
        console.error("[MainPage] Error handling chat status change:", error);
      }
    };

    document.addEventListener("chat-status-changed", handleChatStatusChange);

    return () => {
      document.removeEventListener(
        "chat-status-changed",
        handleChatStatusChange,
      );
    };
  }, [openChats, fetchNotificationById]);

  // Minimize chat function
  const minimizeChat = (notification) => {
    if (!notification || !notification.notificationId) {
      console.error(
        "minimizeChat chiamato con parametri non validi:",
        notification,
      );
      return;
    }

    console.log(`[MainPage] Minimizzando chat ${notification.notificationId}`);

    // 1. Prima di tutto, aggiorna il window manager
    if (windowManager?.toggleMinimize) {
      windowManager.toggleMinimize(notification.notificationId);
      console.log(`[MainPage] WindowManager minimizzazione completata per ${notification.notificationId}`);
    }

    // 2. Aggiungi alle chat minimizzate se non è già presente
    setMinimizedChats((prevMinimized) => {
      const isAlreadyMinimized = prevMinimized.some(
        (chat) => chat.notificationId === notification.notificationId,
      );
      
      if (!isAlreadyMinimized) {
        console.log(`[MainPage] Aggiunta chat ${notification.notificationId} alle minimizzate`);
        return [...prevMinimized, notification];
      }
      
      console.log(`[MainPage] Chat ${notification.notificationId} già nelle minimizzate`);
      return prevMinimized;
    });

    // 3. Assicurati che rimanga in openChats (necessario per il rendering)
    setOpenChats((prevChats) => {
      const existingChat = prevChats.find(
        (chat) => chat.notificationId === notification.notificationId,
      );
      
      if (!existingChat) {
        console.log(`[MainPage] Aggiunta chat ${notification.notificationId} alle aperte`);
        return [...prevChats, notification];
      }
      
      console.log(`[MainPage] Chat ${notification.notificationId} già nelle aperte`);
      return prevChats;
    });
  };

  // Restore chat from minimized state
  const restoreChat = (notification) => {
    if (!notification || !notification.notificationId) {
      console.error(
        "restoreChat chiamato con parametri non validi:",
        notification,
      );
      return;
    }

    console.log(`[MainPage] Ripristinando chat ${notification.notificationId}`);

    // 1. Prima di tutto, aggiorna il window manager
    if (windowManager?.toggleMinimize) {
      windowManager.toggleMinimize(notification.notificationId);
      console.log(`[MainPage] WindowManager ripristino completato per ${notification.notificationId}`);
    }

    // 2. Rimuovi dalle chat minimizzate
    setMinimizedChats((prevMinimized) => {
      const filtered = prevMinimized.filter(
        (chat) => chat.notificationId !== notification.notificationId,
      );
      console.log(`[MainPage] Chat ${notification.notificationId} rimossa dalle minimizzate`);
      return filtered;
    });

    // 3. Assicurati che sia in openChats e aggiornata
    setOpenChats((prevChats) => {
      const existingChatIndex = prevChats.findIndex(
        (chat) => chat.notificationId === notification.notificationId,
      );
      
      if (existingChatIndex !== -1) {
        // Aggiorna la chat esistente
        const updatedChats = [...prevChats];
        updatedChats[existingChatIndex] = notification;
        console.log(`[MainPage] Chat ${notification.notificationId} aggiornata nelle aperte`);
        return updatedChats;
      } else {
        // Aggiungi se non esiste
        console.log(`[MainPage] Chat ${notification.notificationId} aggiunta alle aperte`);
        return [...prevChats, notification];
      }
    });

    // 4. Attiva la finestra
    if (windowManager?.activateWindow) {
      setTimeout(() => {
        windowManager.activateWindow(notification.notificationId);
        console.log(`[MainPage] Finestra ${notification.notificationId} attivata`);
      }, 100);
    }
  };

  // Close chat function
  const closeChatModal = (notificationId) => {
    if (!notificationId) {
      console.error("closeChatModal chiamato senza un ID notifica valido");
      return;
    }
  
    console.log(`🔒 Chiudendo chat ${notificationId}`);
  
    // 1. Chiudi la finestra se esiste
    if (windowManager?.closeWindow) {
      windowManager.closeWindow(notificationId);
    }
  
    // 2. IMPORTANTE: Annulla la registrazione PRIMA di rimuovere dai state
    if (unregisterOpenChat) {
      unregisterOpenChat(notificationId);
      console.log(`✅ Chat ${notificationId} rimossa da openChatIds`);
    }
  
    // 3. Rimuovi dagli state locali
    setOpenChats((prevChats) => {
      const newChats = prevChats.filter(
        (chat) => chat.notificationId !== notificationId,
      );
      console.log(`📊 Chat aperte rimanenti: ${newChats.map(c => c.notificationId).join(', ')}`);
      return newChats;
    });
  
    setMinimizedChats((prevMinimized) => {
      const newMinimized = prevMinimized.filter(
        (chat) => chat.notificationId !== notificationId,
      );
      return newMinimized;
    });
  
    // 4. Forza un aggiornamento del worker
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent("sync-open-chats"));
    }, 100);
  };
  
  // Close all chats function
  const closeAllChats = () => {
    openChats.forEach((chat) => {
      closeChatModal(chat.notificationId);
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Funzione aggiornata per gestire la visibilità della sidebar
  const toggleSidebar = (showSidebar) => {
    if (showSidebar === true) {
      if (dropdownVisible) {
        setDropdownVisible(false);
      }
      setSidebarVisible(true);
    } else if (showSidebar === false) {
      setSidebarVisible(false);
    } else {
      setSidebarVisible(!sidebarVisible);
    }
  };

  // Funzione aggiornata per gestire la visibilità del dropdown
  const toggleDropdown = () => {
    if (!dropdownVisible && sidebarVisible) {
      setSidebarVisible(false);
    }
    setDropdownVisible(!dropdownVisible);
  };

  const handleClickOutside = (event) => {
    const sidebarElement = document.querySelector(".notification-sidebar");
    const userDropdownButton = document.querySelector(".user-dropdown-button");

    const isWikiButtonClick = (() => {
      let target = event.target;
      while (target) {
        if (
          target.getAttribute &&
          target.getAttribute("aria-label") === "Aiuto e Wiki"
        ) {
          return true;
        }
        target = target.parentElement;
      }
      return false;
    })();

    const isWikiModalClick = (() => {
      let target = event.target;
      while (target) {
        if (
          target.classList &&
          (target.classList.contains("DialogContent") ||
            target.classList.contains("DialogOverlay") ||
            target.classList.contains("wiki-modal-content") ||
            target.classList.contains("tour-tooltip") ||
            target.id === "wiki-modal" ||
            (target.getAttribute && target.getAttribute("role") === "dialog"))
        ) {
          return true;
        }
        target = target.parentElement;
      }
      return false;
    })();

    const isMessageClick = (() => {
      let target = event.target;
      while (target) {
        if (
          target.classList &&
          (target.classList.contains("ReactModal__Content") ||
            target.classList.contains("chat-page") ||
            target.classList.contains("chat-layout") ||
            target.classList.contains("chat-message") ||
            target.classList.contains("notification-item") ||
            target.id === "notification-sidebar" ||
            target.closest("#notification-sidebar") ||
            target.closest(".chat-window"))
        ) {
          return true;
        }
        target = target.parentElement;
      }
      return false;
    })();

    const isWindowManagerClick = (() => {
      let target = event.target;
      while (target) {
        if (
          target.id === "window-manager-menu" ||
          target.closest("#window-manager-menu-button")
        ) {
          return true;
        }
        target = target.parentElement;
      }
      return false;
    })();

    if (
      dropdownVisible &&
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target) &&
      !userDropdownButton?.contains(event.target)
    ) {
      setDropdownVisible(false);
    }

    if (
      sidebarVisible &&
      sidebarElement &&
      !sidebarElement.contains(event.target)
    ) {
      const notificationButton = document.querySelector("#notification-button");

      if (
        isWikiButtonClick ||
        isWikiModalClick ||
        isMessageClick ||
        sidebarElement.contains(event.target) ||
        notificationButton?.contains(event.target)
      ) {
        return;
      }

      const chatModals = document.querySelectorAll(".ReactModal__Content");
      const hasOpenNonMinimizedChats =
        openChats.length > 0 &&
        openChats.some(
          (chat) =>
            !minimizedChats.find(
              (min) => min.notificationId === chat.notificationId,
            ),
        );
      const clickedInChatModal = Array.from(chatModals).some((modal) =>
        modal?.contains(event.target),
      );

      if (!hasOpenNonMinimizedChats && !clickedInChatModal) {
        setSidebarVisible(false);
      }
    }

    if (windowManagerMenuOpen && !isWindowManagerClick) {
      setWindowManagerMenuOpen(false);
    }
  };

  // Effect to handle auto-close dropdown after 5 seconds and click outside
  useEffect(() => {
    let timeout;

    if (dropdownVisible) {
      timeout = setTimeout(() => {
        setDropdownVisible(false);
      }, 5000);

      document.addEventListener("mousedown", handleClickOutside);

      return () => {
        clearTimeout(timeout);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [dropdownVisible, windowManagerMenuOpen]);

  useEffect(() => {
    if (!isDBNotificationsViewExecuted) {
      const initializeNotifications = async () => {
        await DBNotificationsView();
        setIsDBNotificationsViewExecuted(true);
      };
      initializeNotifications();
    }
  }, [
    isDBNotificationsViewExecuted,
    DBNotificationsView,
    setIsDBNotificationsViewExecuted,
  ]);

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${config.API_BASE_URL}/menu`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const items = response.data;
        setMenuItems(items);
        setCurrentLevelItems(items.filter((item) => item.pageParent === null));
      } catch (error) {
        console.error("Error fetching menu items:", error);
      }
    };
    fetchMenuItems();
  }, []);


  const handleNavigate = (item, state = {}) => {
    const newBreadcrumb = [...breadcrumb, item];
    setBreadcrumb(newBreadcrumb);
    setPageTitle(item.pageName);
    setIsPageComponent(!!item.pageComponent);
  
    const filteredItems = menuItems.filter(
      (menuItem) => menuItem.pageParent === item.pageId,
    );
    setCurrentLevelItems(filteredItems);
  
    if (item.pageComponent) {
      // Costruisci l'URL con i parametri se presenti nello state
      let route = item.pageRoute;
      const params = new URLSearchParams();
      
      if (state.projectId) {
        params.append('projectId', state.projectId);
        params.append('autoSelect', 'true');
      }
      
      if (state.openTaskId) {
        params.append('openTaskId', state.openTaskId);
      }
      
      if (params.toString()) {
        route = `${route}?${params.toString()}`;
      }
      
      navigate(route, {
        state: {
          ...state,
          pageComponent: true,
          breadcrumb: newBreadcrumb,
        },
      });
    }
  };


useEffect(() => {
  // Handler per messaggi da finestre standalone
  const handleMessageFromStandalone = (event) => {
    // Verifica sicurezza: stesso dominio
    if (event.origin !== window.location.origin) return;
    
    if (event.data) {
      // Gestione navigazione progetto
      if (event.data.type === 'navigate-to-project') {
        const { projectId } = event.data;
        
        const progettiItem = menuItems.find(
          item => item.pageRoute === '/progetti/dashboard'
        );
        
        if (progettiItem) {
          handleNavigate(progettiItem, { 
            projectId: projectId
          });
        }
      }
      // Gestione navigazione task
      else if (event.data.type === 'navigate-to-task') {
        const { projectId, taskId } = event.data;
        
        const progettiItem = menuItems.find(
          item => item.pageRoute === '/progetti/dashboard'
        );
        
        if (progettiItem) {
          handleNavigate(progettiItem, { 
            projectId: projectId,
            openTaskId: taskId,
            autoSelect: true
          });
        }
      }
    }
  };
  
  // Handler per navigazione progetto
  const handleNavigateToProject = (event) => {
    const { projectId } = event.detail;
    
    const progettiItem = menuItems.find(
      item => item.pageRoute === '/progetti/dashboard'
    );
    
    if (progettiItem) {
      handleNavigate(progettiItem, { 
        projectId: projectId
      });
    }
  };
  
  // Handler per navigazione task
  const handleNavigateToTask = (event) => {
    const { projectId, taskId } = event.detail;
    
    const progettiItem = menuItems.find(
      item => item.pageRoute === '/progetti/dashboard'
    );
    
    if (progettiItem) {
      handleNavigate(progettiItem, { 
        projectId: projectId,
        openTaskId: taskId,
        autoSelect: true
      });
    }
  };
  
  // Aggiungi tutti i listener
  window.addEventListener('message', handleMessageFromStandalone);
  document.addEventListener('navigate-to-project', handleNavigateToProject);
  document.addEventListener('navigate-to-task', handleNavigateToTask);
  
  // Cleanup
  return () => {
    window.removeEventListener('message', handleMessageFromStandalone);
    document.removeEventListener('navigate-to-project', handleNavigateToProject);
    document.removeEventListener('navigate-to-task', handleNavigateToTask);
  };
}, [menuItems, handleNavigate]);

  // Gestione navigazione da componenti figli
  useEffect(() => {
    const handleNavigateToProject = (event) => {
      const { projectId } = event.detail;
      
      const progettiItem = menuItems.find(
        item => item.pageRoute === '/progetti/dashboard'
      );
      
      if (progettiItem) {
        // Passa projectId nello state
        handleNavigate(progettiItem, { 
          projectId: projectId
        });
      }
    };
    
    document.addEventListener('navigate-to-project', handleNavigateToProject);
    
    return () => {
      document.removeEventListener('navigate-to-project', handleNavigateToProject);
    };
  }, [menuItems, handleNavigate]);

  const handleBreadcrumbClick = (index) => {
    const newBreadcrumb = breadcrumb.slice(0, index + 1);
    const lastItem = newBreadcrumb[newBreadcrumb.length - 1];
    setBreadcrumb(newBreadcrumb);
    setPageTitle(lastItem.pageName);
    setIsPageComponent(!!lastItem.pageComponent);
    setCurrentLevelItems(
      menuItems.filter((item) => item.pageParent === lastItem.pageId),
    );
    if (lastItem.pageComponent) {
      navigate(lastItem.pageRoute);
    }
  };

  const handleHomeClick = () => {
    setBreadcrumb([]);
    setCurrentLevelItems(menuItems.filter((item) => item.pageParent === null));
    setPageTitle("WebApp");
    setIsPageComponent(false);
    navigate("/");
  };

  const navigateToPreviousLevel = () => {
    const newBreadcrumb = breadcrumb.slice(0, -1);
    setBreadcrumb(newBreadcrumb);
    if (newBreadcrumb.length === 0) {
      setCurrentLevelItems(
        menuItems.filter((item) => item.pageParent === null),
      );
      setPageTitle("");
      setIsPageComponent(false);
      navigate("/");
    } else {
      const lastItem = newBreadcrumb[newBreadcrumb.length - 1];
      setCurrentLevelItems(
        menuItems.filter((item) => item.pageParent === lastItem.pageId),
      );
      setPageTitle(lastItem.pageName);
      setIsPageComponent(!!lastItem.pageComponent);
      navigate(lastItem.pageRoute || "/");
    }
  };

  const handleToastClick = (notificationId, messageId) => {
    toggleReadUnread(notificationId, true);
    openChatModal(notificationId);
    markMessageAsReceived(notificationId, messageId);
  };

  const handleOpenChat = async (notificationId) => {
    // Rimuovi completamente il check per isModalOpen
    
    setTimeout(async () => {
      try {
        openChatModal(notificationId);
      } catch (error) {
        console.error("Errore apertura chat:", error);
      }
    }, 100);
  };

  const { toast } = useToast();
  const [seenMessageIds, setSeenMessageIds] = useState(new Set());

  useEffect(() => {
    const newSeenMessageIds = new Set(seenMessageIds);
    unreadMessages.forEach((message) => {
      if (!newSeenMessageIds.has(message.messageId)) {
        toast({
          className: "custom-toast",
          title: message.title,
          description: message.message,
          action: (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToastClick(message.notificationId, message.messageId);
              }}
            >
              Apri chat
            </button>
          ),
        });
        markMessageAsReceived(message.notificationId, message.messageId);
        newSeenMessageIds.add(message.messageId);
      }
    });
    setSeenMessageIds(newSeenMessageIds);
  }, [unreadMessages, toast, seenMessageIds, markMessageAsReceived]);

  const toggleWindowManagerMenu = () => {
    setWindowManagerMenuOpen(!windowManagerMenuOpen);
  };


  const showWindowControls = openChats.length > 0;

  return (
    <WikiProvider>
      <div className="min-h-screen flex flex-col relative">
        <Header
          user={user}
          unreadCount={unreadCount}
          toggleSidebar={toggleSidebar}
          toggleDropdown={toggleDropdown}
          handleHomeClick={handleHomeClick}
          dropdownVisible={dropdownVisible}
          handleLogout={handleLogout}
          dropdownRef={dropdownRef}
          setIsPageComponent={setIsPageComponent}
          setBreadcrumb={setBreadcrumb}
          setPageTitle={setPageTitle}
        />

        <NotificationSidebar
          closeSidebar={() => toggleSidebar(false)}
          visible={sidebarVisible}
          openChatModal={handleOpenChat}
        />

        <MainContainer
          menuItems={menuItems}
          breadcrumb={breadcrumb}
          handleNavigate={handleNavigate}
          handleBreadcrumbClick={handleBreadcrumbClick}
          handleHomeClick={handleHomeClick}
          isPageComponent={isPageComponent}
          pageTitle={pageTitle}
          navigateToPreviousLevel={navigateToPreviousLevel}
          currentLevelItems={currentLevelItems}
        >
          {Array.isArray(openChats) && openChats.length > 0 ? (
            openChats.map((chat) => {
              if (!chat || !chat.notificationId) {
                console.error("Chat mancante o senza notificationId:", chat);
                return null;
              }

              return (
                <ChatWindow
                  key={`chat-window-${chat.notificationId}`}
                  notification={chat}
                  onClose={closeChatModal}
                  onMinimize={minimizeChat}
                  windowManager={windowManager}
                  navigate={navigate}
                />
              );
            })
          ) : (
            <div style={{ display: "none" }}>No open chats</div>
          )}
        </MainContainer>

        {showWindowControls && (
          <div className="fixed top-20 right-10 z-[10049]">
            <button
              id="window-manager-menu-button"
              className="bg-yellow-300 text-gray-700 p-2 rounded-full shadow-xl hover:bg-gray-100 transition-colors z-[2501]"
              onClick={toggleWindowManagerMenu}
              title="Gestione finestre"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
            </button>

            <WindowManagerMenu
              isOpen={windowManagerMenuOpen}
              onClose={() => setWindowManagerMenuOpen(false)}
              windowManager={windowManager}
              onCloseAll={closeAllChats}
              openChats={openChats}
              minimizedChats={minimizedChats}
              onMinimizeChat={minimizeChat}
              restoreChat={restoreChat}
            />
          </div>
        )}

          <MinimizedChatsDock
            minimizedChats={minimizedChats}
            onRestoreChat={restoreChat}
            onCloseChat={closeChatModal}
            notifications={notifications}
            newMessageWindows={newMessageWindows.filter(w => 
              windowManager?.windowStates?.[w.id]?.isMinimized
            )}
            onRestoreNewMessage={(windowId) => {
              if (windowManager?.toggleMinimize) {
                windowManager.toggleMinimize(windowId);
              }
            }}
            onCloseNewMessage={(windowId) => {
              if (windowManager?.closeWindow) {
                windowManager.closeWindow(windowId);
              }
              setNewMessageWindows(prev => prev.filter(w => w.id !== windowId));
            }}
          />

        {Array.isArray(newMessageWindows) && newMessageWindows.length > 0 && (
          newMessageWindows.map((window) => (
            <NewMessageWindow
              key={window.id}
              windowId={window.id}
              onClose={() => {
                if (windowManager?.closeWindow) {
                  windowManager.closeWindow(window.id);
                }
                setNewMessageWindows(prev => prev.filter(w => w.id !== window.id));
              }}
              onMinimize={() => {
                if (windowManager?.toggleMinimize) {
                  windowManager.toggleMinimize(window.id);
                }
              }}
              windowManager={windowManager}
              openChatModal={handleOpenChat}
              type={window.type}
              notificationCategoryId={window.notificationCategoryId}
              defaultTitle={window.defaultTitle}
              defaultReceivers={window.defaultReceivers}
              metadata={window.metadata}
            />
          ))
        )}

        <WikiHelper />
        <NotificationConsentModal />
        <DoNotDisturbIndicator />
        <Toaster />
      </div>
    </WikiProvider>
  );
};

export default MainPage;