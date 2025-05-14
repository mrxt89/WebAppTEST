import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios'; 
import { useAuth } from '../../context/AuthContext';
import NotificationSidebar from '../NotificationSidebar';
import MainContainer from './MainContainer';
import ChatWindow from '../chat/ChatWindow';
import MinimizedChatsDock from '../chat/MinimizedChatsDock';
import WindowManagerMenu from '../chat/WindowManagerMenu';
import { useToast } from '../ui/use-toast';
import { Toaster } from '../ui/toaster';
// Importiamo il nostro hook Redux invece del Context
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';
import NewMessageModal from '../chat/NewMessageModal';
import { config } from '../../config';
import Header from './Header';
import NotificationConsentModal from '../NotificationConsentModal';
import DoNotDisturbIndicator from '../chat/DoNotDisturbIndicator';
import useWindowManager from '../../hooks/useWindowManager';

// Import dei componenti Wiki
import { WikiProvider, WikiHelper } from '../wiki';

const MainPage = () => {
  const { user, logout, isDBNotificationsViewExecuted, setIsDBNotificationsViewExecuted } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Utilizziamo il nostro hook Redux per accedere alle azioni e allo stato
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
    forceLoadNotifications
  } = useNotifications();

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
    windowStates
  } = windowManager;
  
  const notificationServiceInitialized = useRef(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const menuRef = useRef(null);
  const dropdownRef = useRef(null); // Ref for dropdown menu
  const [menuItems, setMenuItems] = useState([]);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [isPageComponent, setIsPageComponent] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [currentLevelItems, setCurrentLevelItems] = useState([]);
  const [openChats, setOpenChats] = useState([]);
  const [minimizedChats, setMinimizedChats] = useState([]);
  const [windowManagerMenuOpen, setWindowManagerMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Inizializza il worker Redux all'avvio
  useEffect(() => {
    initializeWorker();
    
    // Forza il ricaricamento delle notifiche dopo un breve ritardo
    setTimeout(() => {
      reloadNotifications(true); // Imposta highPriority a true
    }, 1000);
  }, [initializeWorker, reloadNotifications]);

  // useEffect per richiedere esplicitamente i permessi di notifica
  useEffect(() => {
    if (window.Notification && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  // Aggiungi - esponi notificationService alla window
  useEffect(() => {
    // Inizializza il servizio di notifica
    import('@/services/notifications/NotificationService')
      .then(module => {
        window.notificationService = module.default;
        
        // Inizializza esplicitamente il servizio
        if (window.notificationService) {
          // Forza l'inizializzazione dell'audio alla prima interazione
          const initAudioOnce = () => {
            window.notificationService.initAudio()
              .then(success => {
                if (success) {
                  notificationServiceInitialized.current = true;
                  // Rimuovi gli event listener se l'inizializzazione ha successo
                  document.removeEventListener('click', initAudioOnce);
                  document.removeEventListener('keydown', initAudioOnce);
                  document.removeEventListener('touchstart', initAudioOnce);
                }
              });
          };
          
          // Aggiungi listener per eventi che possono sbloccare l'audio
          document.addEventListener('click', initAudioOnce, { once: false });
          document.addEventListener('keydown', initAudioOnce, { once: false });
          document.addEventListener('touchstart', initAudioOnce, { once: false });
          
          // Richiedi permessi per le notifiche (solo se non già negati)
          if (Notification.permission !== 'denied') {
            window.notificationService.requestNotificationPermission();
          }
        }
      })
      .catch(error => {
        console.error('Errore nell\'inizializzazione del servizio di notifica:', error);
      });
      
    return () => {
      // Pulizia: rimuovi il riferimento globale e chiama cleanup
      if (window.notificationService) {
        window.notificationService.cleanup ? window.notificationService.cleanup() : 
          (window.notificationService.destroy ? window.notificationService.destroy() : null);
        delete window.notificationService;
      }
    };
  }, []);

  // Helper per parsing messaggio
  const parseMessages = (messages) => {
    if (!messages) return [];
    if (typeof messages === 'string') {
      try {
        return JSON.parse(messages);
      } catch (error) {
        console.error('Error parsing messages:', error);
        return [];
      }
    }
    return messages;
  };

  // Evento listener per l'apertura del modale nuovo messaggio
  useEffect(() => {
    const handleOpenNewMessageModal = () => {
      setIsModalOpen(true);
    };
    
    document.addEventListener('openNewMessageModal', handleOpenNewMessageModal);
    
    return () => {
      document.removeEventListener('openNewMessageModal', handleOpenNewMessageModal);
    };
  }, []);

  // Enhanced open chat modal function
  const openChatModal = async (notificationId) => {
    // Validazione dell'input
    if (!notificationId) {
      console.error('openChatModal chiamato senza un ID notifica valido');
      return;
    }
    
    try {
      // Uso direttamente fetchNotificationById per assicurarmi di avere dati aggiornati
      const notification = await fetchNotificationById(notificationId);
      
      if (notification) {
        // Mark as read immediately
        toggleReadUnread(notificationId, true);
        
        // Registra la chat come aperta nello store Redux
        registerOpenChat(notificationId);
        
        // Check if this chat is already in minimized state
        const isMinimized = minimizedChats.some(chat => chat.notificationId === notification.notificationId);
        
        // Se la chat è già nel window manager, attivala
        if (windowManager?.windowStates?.[notification.notificationId]) {
          windowManager.activateWindow(notification.notificationId);
        } else {
          // Altrimenti, crea una nuova finestra nel window manager
          const defaultPos = {
            x: Math.max(0, (window.innerWidth - 900) / 2),
            y: 0,
            width: 900,
            height: 700
          };
          
          // Crea la finestra nel window manager
          if (windowManager?.createWindow) {
            windowManager.createWindow(
              notification.notificationId,
              notification.notificationTitle || 'Nuova Chat',
              defaultPos
            );
          }
        }
        
        // If the chat is minimized, we need to restore it properly
        if (isMinimized) {
          // Restore it (toggle minimized state to false in window manager)
          if (toggleMinimize) {
            toggleMinimize(notification.notificationId);
          }
          
          // Remove from minimized chats
          setMinimizedChats(prevMinimized => 
            prevMinimized.filter(chat => chat.notificationId !== notification.notificationId)
          );
        }
        
        // Make sure it's in the open chats list
        setOpenChats(prevChats => {
          if (!prevChats.some(chat => chat.notificationId === notification.notificationId)) {
            return [...prevChats, notification];
          }
          return prevChats.map(chat => 
            chat.notificationId === notification.notificationId ? notification : chat
          );
        });
        
        // Activate this window (bring to front)
        if (windowManager?.activateWindow) {
          windowManager.activateWindow(notification.notificationId);
        }
      }
    } catch (error) {
      console.error('Errore durante l\'apertura della chat:', error);
    }
  };

// Gestisci l'evento di nuovo messaggio
useEffect(() => {
  const handleNewMessage = (event) => {
    const { notificationId, newMessageCount } = event.detail || {};
    
    if (notificationId && newMessageCount) {
      // Trova la notifica corrispondente
      const notification = notifications.find(n => n.notificationId === parseInt(notificationId));
      
      // Bypass NotificationService per garantire la notifica
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const title = notification?.title || 'Nuovo messaggio';
          const message = `Hai ricevuto nuovi messaggi`;
          
          const webNotification = new Notification(title, {
            body: message,
            icon: '/icons/app-icon.png'
          });
          
          webNotification.onclick = () => {
            window.focus();
            openChatModal(notificationId);
            webNotification.close();
          };
          
          // Auto-chiusura dopo 8 secondi
          setTimeout(() => webNotification.close(), 120000);
        } catch (e) {
          console.error('Error showing direct notification:', e);
        }
      }
      
      // Comunque tenta anche l'aggiornamento normale
      fetchNotificationById(notificationId);
    }
  };
  
  document.addEventListener('new-message-received', handleNewMessage);
  
  return () => {
    document.removeEventListener('new-message-received', handleNewMessage);
  };
}, [notifications, fetchNotificationById, openChatModal]);

  // Ascolta specificamente eventuali errori di notifica per debug
  useEffect(() => {
    const handleNotificationError = (error) => {
      console.error('Notification error:', error);
    };
    
    // Intercetta eventuali errori globali relativi alle notifiche
    window.addEventListener('error', (event) => {
      if (event.message && (
        event.message.includes('notification') || 
        event.message.includes('Notification') || 
        event.message.includes('permission')
      )) {
        handleNotificationError(event);
      }
    });
    
    return () => {
      window.removeEventListener('error', handleNotificationError);
    };
  }, []);

  // Ascolta specificamente l'evento unread-count-changed per aggiornare il contatore
  useEffect(() => {
    const handleUnreadCountChanged = () => {
      // Forza il ricaricamento delle notifiche immediatamente
      forceLoadNotifications();
    };
    
    document.addEventListener('unread-count-changed', handleUnreadCountChanged);
    return () => {
      document.removeEventListener('unread-count-changed', handleUnreadCountChanged);
    };
  }, [forceLoadNotifications]);

  useEffect(() => {
    // Handler per gestire gli aggiornamenti di stato delle chat (archiviate, abbandonate, ecc.)
    const handleChatStatusChange = async (event) => {
      const { notificationId, action, timestamp } = event.detail || {};
      
      if (!notificationId) return;
      
      try {
        // Forza l'aggiornamento della notifica dal server per essere sicuri di avere dati freschi
        await fetchNotificationById(notificationId);
        
        // Se la chat è aperta, forzane l'aggiornamento
        const openChat = openChats.find(chat => chat.notificationId === notificationId);
        if (openChat) {
          // Questo forzerà un re-render della finestra di chat
          setOpenChats(prevChats => {
            return prevChats.map(chat => 
              chat.notificationId === notificationId 
                ? { 
                    ...chat, 
                    // Aggiorna gli stati in base all'azione
                    archived: action === 'archived' ? 1 : (action === 'unarchived' ? 0 : chat.archived),
                    chatLeft: action === 'left' ? 1 : chat.chatLeft,
                    // Aggiungi un timestamp per forzare il rerendering anche se altri valori non cambiano
                    _lastUpdate: timestamp || Date.now()
                  }
                : chat
            );
          });
        }
      } catch (error) {
        console.error('[MainPage] Error handling chat status change:', error);
      }
    };
    
    // Aggiungi il listener per l'evento
    document.addEventListener('chat-status-changed', handleChatStatusChange);
    
    // Cleanup
    return () => {
      document.removeEventListener('chat-status-changed', handleChatStatusChange);
    };
  }, [openChats, fetchNotificationById]);

  // Minimize chat function
  const minimizeChat = (notification) => {
    // Validazione dell'input
    if (!notification || !notification.notificationId) {
      console.error('minimizeChat chiamato con parametri non validi:', notification);
      return;
    }

    // Aggiorna lo stato nel window manager
    if (windowManager?.toggleMinimize) {
      windowManager.toggleMinimize(notification.notificationId);
    }
    
    // Aggiorna lo stato delle chat minimizzate
    setMinimizedChats(prevMinimized => {
      // Se la chat non è già minimizzata, aggiungila
      if (!prevMinimized.some(chat => chat.notificationId === notification.notificationId)) {
        return [...prevMinimized, notification];
      }
      return prevMinimized;
    });

    // Assicurati che la chat rimanga in openChats
    setOpenChats(prevChats => {
      if (!prevChats.some(chat => chat.notificationId === notification.notificationId)) {
        return [...prevChats, notification];
      }
      return prevChats;
    });
  };

  // Restore chat from minimized state
  const restoreChat = (notification) => {
    // Validazione dell'input
    if (!notification || !notification.notificationId) {
      console.error('restoreChat chiamato con parametri non validi:', notification);
      return;
    }

    // Aggiorna lo stato nel window manager
    if (windowManager?.toggleMinimize) {
      windowManager.toggleMinimize(notification.notificationId);
    }
    
    // Rimuovi la chat dalle chat minimizzate
    setMinimizedChats(prevMinimized => {
      return prevMinimized.filter(chat => chat.notificationId !== notification.notificationId);
    });
    
    // Assicurati che la chat sia in openChats
    setOpenChats(prevChats => {
      if (!prevChats.some(chat => chat.notificationId === notification.notificationId)) {
        return [...prevChats, notification];
      }
      return prevChats.map(chat => 
        chat.notificationId === notification.notificationId ? notification : chat
      );
    });
    
    // Attiva la finestra (porta in primo piano)
    if (windowManager?.activateWindow) {
      windowManager.activateWindow(notification.notificationId);
    }
  };

  // Close chat function
  const closeChatModal = (notificationId) => {
    // Validazione dell'input 
    if (!notificationId) {
      console.error('closeChatModal chiamato senza un ID notifica valido');
      return;
    }

    // Chiudi la finestra nel window manager
    if (windowManager?.closeWindow) {
      windowManager.closeWindow(notificationId);
    }
    
    // Rimuovi la chat dallo store Redux
    if (unregisterOpenChat) {
      unregisterOpenChat(notificationId);
    }
    
    // Rimuovi la chat da openChats
    setOpenChats(prevChats => {
      const newChats = prevChats.filter(chat => chat.notificationId !== notificationId);
      return newChats;
    });
    
    // Rimuovi la chat da minimizedChats se presente
    setMinimizedChats(prevMinimized => {
      const newMinimized = prevMinimized.filter(chat => chat.notificationId !== notificationId);
      return newMinimized;
    });
  };

  // Close all chats function
  const closeAllChats = () => {
    // Close each open chat
    openChats.forEach(chat => {
      closeChatModal(chat.notificationId);
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Funzione aggiornata per gestire la visibilità della sidebar
  const toggleSidebar = (showSidebar) => {
    if (showSidebar === true) {
      // Se stiamo esplicitamente mostrando la sidebar, nascondiamo il dropdown
      if (dropdownVisible) {
        setDropdownVisible(false);
      }
      setSidebarVisible(true);
    } else if (showSidebar === false) {
      // Se stiamo esplicitamente nascondendo la sidebar
      setSidebarVisible(false);
    } else {
      // Se non è specificato, alterna lo stato
      setSidebarVisible(!sidebarVisible);
    }
  };

  // Funzione aggiornata per gestire la visibilità del dropdown
  const toggleDropdown = () => {
    // Se stiamo aprendo il dropdown, chiudiamo la sidebar
    if (!dropdownVisible && sidebarVisible) {
      setSidebarVisible(false);
    }
    // Alterna lo stato del dropdown
    setDropdownVisible(!dropdownVisible);
  };

  const handleClickOutside = (event) => {
    const sidebarElement = document.querySelector('.notification-sidebar');
    const userDropdownButton = document.querySelector('.user-dropdown-button');
    
    // Verifica se il click è sul pulsante wiki o un suo elemento figlio
    const isWikiButtonClick = (() => {
      let target = event.target;
      while (target) {
        if (target.getAttribute && target.getAttribute('aria-label') === 'Aiuto e Wiki') {
          return true;
        }
        target = target.parentElement;
      }
      return false;
    })();
    
    // Verifica se il click è in un elemento del modal Wiki
    const isWikiModalClick = (() => {
      let target = event.target;
      while (target) {
        if (
          target.classList && (
            target.classList.contains('DialogContent') || 
            target.classList.contains('DialogOverlay') ||
            target.classList.contains('wiki-modal-content') ||
            target.classList.contains('tour-tooltip') ||
            target.id === 'wiki-modal' ||
            target.getAttribute && target.getAttribute('role') === 'dialog'
          )
        ) {
          return true;
        }
        target = target.parentElement;
      }
      return false;
    })();
  
    // Verifica se il click è in un elemento di una chat aperta o nella sidebar stessa
    const isMessageClick = (() => {
      let target = event.target;
      while (target) {
        if (
          target.classList && (
            target.classList.contains('ReactModal__Content') ||
            target.classList.contains('chat-page') ||
            target.classList.contains('chat-layout') ||
            target.classList.contains('chat-message') ||
            target.classList.contains('notification-item') ||
            target.id === 'notification-sidebar' ||
            target.closest('#notification-sidebar') || // Controlla se è un discendente di notification-sidebar
            target.closest('.chat-window') // Include le nuove chat windows
          )
        ) {
          return true;
        }
        target = target.parentElement;
      }
      return false;
    })();
    
    // Verifica se il click è nel menu di organizzazione finestre
    const isWindowManagerClick = (() => {
      let target = event.target;
      while (target) {
        if (target.id === 'window-manager-menu' || target.closest('#window-manager-menu-button')) {
          return true;
        }
        target = target.parentElement;
      }
      return false;
    })();
  
    // Gestione dropdown username
    if (dropdownVisible && dropdownRef.current && !dropdownRef.current.contains(event.target) && !userDropdownButton?.contains(event.target)) {
      setDropdownVisible(false);
    }
  
    // Gestione sidebar delle notifiche
    if (sidebarVisible && sidebarElement && !sidebarElement.contains(event.target)) {
      const notificationButton = document.querySelector('#notification-button');
      
      // Non chiudere la sidebar nei seguenti casi:
      // 1. Se il click è sul pulsante wiki o nel modal wiki
      // 2. Se il click è su un messaggio o elementi correlati
      // 3. Se il click è all'interno della sidebar stessa
      if (isWikiButtonClick || isWikiModalClick || isMessageClick || sidebarElement.contains(event.target) || notificationButton?.contains(event.target)) {
        return;
      }
      
      const chatModals = document.querySelectorAll('.ReactModal__Content');
      const hasOpenNonMinimizedChats = openChats.length > 0 && openChats.some(chat => 
        !minimizedChats.find(min => min.notificationId === chat.notificationId)
      );
      const clickedInChatModal = Array.from(chatModals).some(modal => modal?.contains(event.target));

      if (!hasOpenNonMinimizedChats && !clickedInChatModal) {
        setSidebarVisible(false);
      }
    }
    
    // Gestione menu organizzazione finestre
    if (windowManagerMenuOpen && !isWindowManagerClick) {
      setWindowManagerMenuOpen(false);
    }
  };
  
  // Effect to handle auto-close dropdown after 5 seconds and click outside
  useEffect(() => {
    let timeout;

    if (dropdownVisible) {
      // Set timeout to close dropdown after 5 seconds
      timeout = setTimeout(() => {
        setDropdownVisible(false);
      }, 5000);

      // Add event listener for clicks outside
      document.addEventListener('mousedown', handleClickOutside);

      // Clean up timeout and event listener on unmount
      return () => {
        clearTimeout(timeout);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [dropdownVisible, windowManagerMenuOpen]);

  useEffect(() => {
    if (location?.state?.pageComponent !== undefined) {
      setIsPageComponent(location.state.pageComponent);
      if (location.state.breadcrumb) {
        setBreadcrumb(location.state.breadcrumb);
      }
      if (location.state.selectedOrder) {
        setPageTitle('Avanzamento ODP');
      }
    }
  }, [location]);

  useEffect(() => {
    if (!isDBNotificationsViewExecuted) {
      const initializeNotifications = async () => {
        await DBNotificationsView();
        setIsDBNotificationsViewExecuted(true);
      };
      initializeNotifications();
    }
  }, [isDBNotificationsViewExecuted, DBNotificationsView, setIsDBNotificationsViewExecuted]);
  
  useEffect(() => {
    const executeDBNotificationsView = async () => {
      if (user && !isDBNotificationsViewExecuted) {
        await DBNotificationsView();
        setIsDBNotificationsViewExecuted(true);
      }
    };

    executeDBNotificationsView();
  }, [user, isDBNotificationsViewExecuted, DBNotificationsView, setIsDBNotificationsViewExecuted]);

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${config.API_BASE_URL}/menu`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const items = response.data;
        setMenuItems(items);
        setCurrentLevelItems(items.filter((item) => item.pageParent === null));
      } catch (error) {
        console.error('Error fetching menu items:', error);
      }
    };
    fetchMenuItems();
  }, []);

  const handleNavigate = (item, state = {}) => { 
    const newBreadcrumb = [...breadcrumb, item];
    setBreadcrumb(newBreadcrumb);
    setPageTitle(item.pageName);
    setIsPageComponent(!!item.pageComponent);
    
    // Log the filtered items
    const filteredItems = menuItems.filter((menuItem) => menuItem.pageParent === item.pageId);
    setCurrentLevelItems(filteredItems);
    
    if (item.pageComponent) {
      navigate(item.pageRoute, {
        state: {
          ...state,
          pageComponent: true,
          breadcrumb: newBreadcrumb
        }
      });
    }
  };

  const handleBreadcrumbClick = (index) => {
    const newBreadcrumb = breadcrumb.slice(0, index + 1);
    const lastItem = newBreadcrumb[newBreadcrumb.length - 1];
    setBreadcrumb(newBreadcrumb);
    setPageTitle(lastItem.pageName);
    setIsPageComponent(!!lastItem.pageComponent);
    setCurrentLevelItems(menuItems.filter((item) => item.pageParent === lastItem.pageId));
    if (lastItem.pageComponent) {
      navigate(lastItem.pageRoute);
    }
  };

  const handleHomeClick = () => {
    setBreadcrumb([]);
    setCurrentLevelItems(menuItems.filter((item) => item.pageParent === null));
    setPageTitle('WebApp');
    setIsPageComponent(false);
    navigate('/');
  };

  const navigateToPreviousLevel = () => {
    const newBreadcrumb = breadcrumb.slice(0, -1);
    setBreadcrumb(newBreadcrumb);
    if (newBreadcrumb.length === 0) {
      setCurrentLevelItems(menuItems.filter((item) => item.pageParent === null));
      setPageTitle('');
      setIsPageComponent(false);
      navigate('/');
    } else {
      const lastItem = newBreadcrumb[newBreadcrumb.length - 1];
      setCurrentLevelItems(menuItems.filter((item) => item.pageParent === lastItem.pageId));
      setPageTitle(lastItem.pageName);
      setIsPageComponent(!!lastItem.pageComponent);
      navigate(lastItem.pageRoute || '/');
    }
  };

  const handleToastClick = (notificationId, messageId) => {
    const notification = notifications.find((n) => n.notificationId === notificationId);
    toggleReadUnread(notificationId, true);
    openChatModal(notificationId);
    markMessageAsReceived(notificationId, messageId);
  };

  const handleOpenChat = async (notificationId) => {
    // Chiudi il modale del nuovo messaggio se è aperto
    if (isModalOpen) {
      setIsModalOpen(false);
    }
    
    // Piccolo timeout per assicurarsi che il modale del nuovo messaggio sia chiuso
    setTimeout(async () => {
      try {
        const notification = await fetchNotificationById(notificationId);
        
        if (notification) {
          openChatModal(notification.notificationId);
        } else {
          console.error('Notifica non trovata:', notificationId);
        }
      } catch (error) {
        console.error('Errore apertura chat:', error);
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
          className: 'custom-toast',
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
  
  // Toggle window manager menu
  const toggleWindowManagerMenu = () => {
    setWindowManagerMenuOpen(!windowManagerMenuOpen);
  };

  // Gestisci la chiusura del modale dei nuovi messaggi
  const closeNewMessageModal = () => {
    setIsModalOpen(false);
    // Forza il reset dopo un breve timeout
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('reset-new-message-modal'));
    }, 100);
  };

  // Only show window management UI if there are open chats
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
          {/* Chat Windows - rendered using Window Manager */}
          {Array.isArray(openChats) && openChats.length > 0 ? (
            openChats.map((chat) => {
              // Controllo aggiuntivo per assicurarsi che chat e notificationId esistano
              if (!chat || !chat.notificationId) {
                console.error('Chat mancante o senza notificationId:', chat);
                return null;
              }
              
              return (
                <ChatWindow
                  key={`chat-window-${chat.notificationId}`}
                  notification={chat}
                  onClose={closeChatModal}
                  onMinimize={minimizeChat}
                  windowManager={windowManager}
                />
              );
            })
          ) : (
            // Per debug, mostra un messaggio se non ci sono chat aperte
            <div style={{ display: 'none' }}>No open chats</div>
          )}
        </MainContainer>
        
        {/* Window arrangement menu button - only shown when there are open chats */}
        {showWindowControls && (
          <div className="fixed top-20 right-10 z-[10049]">
            <button
              id="window-manager-menu-button"
              className="bg-yellow-300 text-gray-700 p-2 rounded-full shadow-xl hover:bg-gray-100 transition-colors z-[2501]"
              onClick={toggleWindowManagerMenu}
              title="Gestione finestre"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
            </button>
            
            {/* Render the Window Manager Menu component with higher z-index */}
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

        {/* Minimized Chats Dock */}
        <MinimizedChatsDock 
          minimizedChats={minimizedChats}
          onRestoreChat={restoreChat}
          onCloseChat={closeChatModal}
          notifications={notifications}
        />
        
        <NewMessageModal
          isOpen={isModalOpen}
          onRequestClose={closeNewMessageModal}
          sidebarVisible={sidebarVisible}
          openChatModal={handleOpenChat}
        />

        {/* Componente Wiki Helper */}
        <WikiHelper />
        
        {/* Aggiungi il modale di consenso alle notifiche */}
        <NotificationConsentModal />
        <DoNotDisturbIndicator />
        <Toaster />
      </div>
    </WikiProvider>
  );
};

export default MainPage;