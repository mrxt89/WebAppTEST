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
      if (window.notificationService && !notificationServiceInitialized.current) {
        window.notificationService.initAudio();
        window.notificationService.requestNotificationPermission()
          .then(permissionGranted => {
            if (permissionGranted) {
              notificationServiceInitialized.current = true;
            } else {
              console.warn('Permesso notifiche negato');
            }
          });
      }
    })
    .catch(error => {
      console.error('Errore nell\'inizializzazione del servizio di notifica:', error);
    });
    
  return () => {
    // Rimuovi il riferimento globale al servizio quando il componente viene smontato
    delete window.notificationService;
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
          activateWindow(notification.notificationId);
          return;
        }
        
        // Create or activate window in window manager
        createWindow(notification.notificationId, notification.title, {
          x: Math.max(0, (window.innerWidth - 550) / 2),
          y: 80 // Position below header
        });
        
        // Update open chats state - keep existing chats and add/update the current one
        setOpenChats(prevChats => {
          const existingChatIndex = prevChats.findIndex(chat => chat.notificationId === notification.notificationId);
          
          if (existingChatIndex !== -1) {
            // Replace existing chat with updated data
            const updatedChats = [...prevChats];
            updatedChats[existingChatIndex] = notification;
            return updatedChats;
          } else {
            // Add new chat
            return [...prevChats, notification];
          }
        });
        
        // If this chat was minimized, remove it from minimized state
        setMinimizedChats(prevMinimized => 
          prevMinimized.filter(chat => chat.notificationId !== notification.notificationId)
        );
        
        // Activate this window (bring to front)
        activateWindow(notification.notificationId);
      } else {
        console.error('Notification not found:', notificationId);
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
      console.log(`Nuovo messaggio ricevuto per notifica ${notificationId}`, event.detail);
      
      // Se la notifica non è già in una chat aperta, mostrala
      const isOpen = openChats.some(chat => chat.notificationId === notificationId);
      
      if (!isOpen) {
        // Forza una notifica anche tramite API nativa
        try {
          const notification = notifications.find(n => n.notificationId === notificationId);
          if (notification && window.Notification && Notification.permission === 'granted') {
            const n = new Notification(notification.title || 'Nuovo messaggio', {
              body: `Hai ${newMessageCount > 1 ? `${newMessageCount} nuovi messaggi` : 'un nuovo messaggio'}`,
              icon: '/icons/app-icon.png'
            });
            n.onclick = () => {
              window.focus();
              openChatModal(notificationId);
              n.close();
            };
          }
        } catch (e) {
          console.error('Error showing notification:', e);
        }
      }
      
      // Forza l'aggiornamento della notifica specifica
      fetchNotificationById(notificationId);
    }
  };
  
  document.addEventListener('new-message-received', handleNewMessage);
  
  return () => {
    document.removeEventListener('new-message-received', handleNewMessage);
  };
}, [notifications, openChats, openChatModal, fetchNotificationById]);


  // Expose openChatModal globally for notifications to use
  useEffect(() => {
    window.openChatModal = (notificationId) => {
      // Find the notification
      const notification = notifications.find(n => n.notificationId === notificationId);
      if (notification) {
        // Use the existing function to open the chat
        openChatModal(notificationId);
      }
    };
    
    return () => {
      delete window.openChatModal;
    };
  }, [notifications, openChatModal]);


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

  // Close chat function
  const closeChatModal = (notificationId) => {
    // Validazione dell'input 
    if (!notificationId) {
      console.error('closeChatModal chiamato senza un ID notifica valido');
      return;
    }
    
    // Close window in window manager
    if (closeWindow) {
      closeWindow(notificationId);
    }
    
    // Unregister chat from Redux store
    if (unregisterOpenChat) {
      unregisterOpenChat(notificationId);
    }
    
    // Remove from open chats state
    setOpenChats(prevChats => {
      const newChats = prevChats.filter(chat => chat.notificationId !== notificationId);
      return newChats;
    });
    
    // Also remove from minimized chats if it was there
    setMinimizedChats(prevMinimized => 
      prevMinimized.filter(chat => chat.notificationId !== notificationId)
    );
  };

  // Minimize chat function
  const minimizeChat = (notification) => {
    // Validazione dell'input
    if (!notification || !notification.notificationId) {
      console.error('minimizeChat chiamato con parametri non validi:', notification);
      return;
    }
 
    // Toggle minimize in window manager
    if (toggleMinimize) {
      toggleMinimize(notification.notificationId);
    }
    
    // Add to minimized chats if not already there
    setMinimizedChats(prevMinimized => {
      if (!prevMinimized.some(chat => chat.notificationId === notification.notificationId)) {
        return [...prevMinimized, notification];
      }
      return prevMinimized;
    });
  };

  // Restore chat from minimized state
  const restoreChat = (notification) => {
    // Validazione dell'input
    if (!notification || !notification.notificationId) {
      console.error('restoreChat chiamato con parametri non validi:', notification);
      return;
    }
 
    // Toggle minimize in window manager (un-minimize)
    if (toggleMinimize) {
      toggleMinimize(notification.notificationId);
    }
    
    // Remove from minimized chats
    setMinimizedChats(prevMinimized => 
      prevMinimized.filter(chat => chat.notificationId !== notification.notificationId)
    );
    
    // Make sure it's in the open chats
    setOpenChats(prevChats => {
      if (!prevChats.some(chat => chat.notificationId === notification.notificationId)) {
        return [...prevChats, notification];
      }
      return prevChats;
    });
    
    // Activate this window (bring to front)
    if (activateWindow) {
      activateWindow(notification.notificationId);
    }
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

  const toggleSidebar = () => {
    // Se la sidebar delle notifiche è già aperta, chiudi entrambe
    if (sidebarVisible) {
      setSidebarVisible(false);
    } else {
      // Se stiamo aprendo la sidebar delle notifiche, chiudi l'altra se è aperta
      setSidebarVisible(true);
    }
  };

  const toggleDropdown = () => {
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
      const notificationButton = document.querySelector('button[onClick="toggleSidebar"]');
      
      // Non chiudere la sidebar nei seguenti casi:
      // 1. Se il click è sul pulsante wiki o nel modal wiki
      // 2. Se il click è su un messaggio o elementi correlati
      // 3. Se il click è all'interno della sidebar stessa
      if (isWikiButtonClick || isWikiModalClick || isMessageClick || sidebarElement.contains(event.target)) {
        return;
      }
      if (!notificationButton?.contains(event.target)) {
        const chatModals = document.querySelectorAll('.ReactModal__Content');
        const hasOpenNonMinimizedChats = openChats.length > 0 && openChats.some(chat => 
          !minimizedChats.find(min => min.notificationId === chat.notificationId)
        );
        const clickedInChatModal = Array.from(chatModals).some(modal => modal?.contains(event.target));
  
        if (!hasOpenNonMinimizedChats && !clickedInChatModal) {
          setSidebarVisible(false);
        }
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
          closeSidebar={toggleSidebar}
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
          <div className="fixed top-20 right-20 z-[1050]">
            <button
              id="window-manager-menu-button"
              className="bg-yellow-300 text-gray-700 p-2 rounded-full shadow-xl hover:bg-gray-100 transition-colors z-50"
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
        
        {/* Global styles for windows */}
        <style jsx global>{`
          /* Chat window styles */
          .chat-window {
            transition: box-shadow 0.2s ease, border-color 0.2s ease;
          }
          
          .chat-window:hover {
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          }
          
          .chat-window-handle {
            touch-action: none;
            cursor: move;
          }
          
          /* Resizing handle styles */
          .react-resizable-handle {
            position: absolute;
            width: 20px;
            height: 20px;
            background-repeat: no-repeat;
            background-origin: content-box;
            box-sizing: border-box;
            background-position: bottom right;
            padding: 0 3px 3px 0;
          }
          
          .react-resizable-handle-se {
            bottom: 0;
            right: 0;
            cursor: se-resize;
            background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2IDYiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiNmZmZmZmYwMCIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI2cHgiIGhlaWdodD0iNnB4Ij48ZyBvcGFjaXR5PSIwLjMwMiI+PHBhdGggZD0iTSA2IDYgTCAwIDYgTCAwIDQuMiBMIDQgNC4yIEwgNC4yIDQuMiBMIDQuMiAwIEwgNiAwIEwgNiA2IEwgNiA2IFoiIGZpbGw9IiMwMDAwMDAiLz48L2c+PC9zdmc+');
            background-position: bottom right;
            background-repeat: no-repeat;
          }
          
          /* Animation for minimizing/maximizing */
          @keyframes slideInUp {
            from {
              transform: translate3d(0, 100%, 0);
              visibility: visible;
            }
            to {
              transform: translate3d(0, 0, 0);
            }
          }
          
          @keyframes slideOutDown {
            from {
              transform: translate3d(0, 0, 0);
            }
            to {
              visibility: hidden;
              transform: translate3d(0, 100%, 0);
            }
          }
          
          .minimized-chat-dock {
            animation: slideInUp 0.3s;
          }
          
          .minimized-chat-icon {
            position: relative;
            transition: transform 0.2s ease-in-out, box-shadow 0.2s ease;
          }
          
          .minimized-chat-icon.new-message::after {
            content: '';
          }
          
          .minimized-chat-icon:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          
          /* Dock styles */
          .window-dock {
            padding: 8px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(5px);
            border-radius: 999px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            gap: 8px;
            border: 1px solid rgba(0, 0, 0, 0.05);
            z-index: 1000;
          }
        `}</style>
      </div>
    </WikiProvider>
  );
};

export default MainPage;