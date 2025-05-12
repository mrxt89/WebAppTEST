import React, { useState, useRef, useEffect } from 'react';
import Modal from 'react-modal';
import ChatTopBar from './ChatTopBar';
import ChatBottomBar from './ChatBottomBar';
import ChatLayout from './ChatLayout';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';
import { useUserSettings } from '../../context/UserSettingsContext';
import { swal } from '../../lib/common'; 
import FileDropZone from '@/components/ui/FileDropZone';
import { AlertOctagon, CircleHelp, Search, Maximize2, Minimize2, X } from 'lucide-react';
import { useWikiContext } from '../wiki/WikiContext';
import InlineSearchBar from './InlineSearchBar';
import ImprovedSearchBar from './ImprovedSearchBar';
import EditMessageModal from './EditMessageModal';
import VersionHistoryModal from './VersionHistoryModal';

Modal.setAppElement('#root');

const ChatModal = ({
  isOpen,
  onRequestClose,
  notification,
  sidebarVisible,
  onMinimize,
  reopenChat,
  closeChat,
  windowMode = false, // New prop to determine if running in window mode
  windowManager = null // Optional window manager for advanced window management
}) => {
  const { openWiki } = useWikiContext();

  const [isMinimized, setIsMinimized] = useState(false);
  const [receiversList, setReceiversList] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [modalStyle, setModalStyle] = useState({});
  const [animationClass, setAnimationClass] = useState('');
  const [sending, setSending] = useState(false);
  // Stato per tenere traccia se il messaggio è già stato segnato come letto
  const [hasMarkedAsRead, setHasMarkedAsRead] = useState(false);
  const [fetchedNotifications, setFetchedNotifications] = useState([]);
  const [fetchedUsers, setFetchedUsers] = useState([]);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [attachmentsLoaded, setAttachmentsLoaded] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [localTitle, setLocalTitle] = useState('');
  
  // State for editing messages
  const [showEditModal, setShowEditModal] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedMessageVersions, setSelectedMessageVersions] = useState(null);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [animatedEditId, setAnimatedEditId] = useState(null);
  
  // Position and size state for draggable/resizable
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 550, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Ref per tenere traccia dell'ultimo stato di lettura della notifica
  const lastReadStateRef = useRef(false);
  
  // Ref per tenere traccia dell'ID della notifica per evitare di marcare come lette notifiche diverse
  const lastNotificationIdRef = useRef(null);

  // Ref for the chat list
  const chatListRef = useRef(null);
  // Ref for the modal
  const modalRef = useRef(null);
  // Ref for the scroll position
  const scrollPositionRef = useRef(0);
  // Ref for storing previous messages for comparison
  const prevMessagesRef = useRef([]);
  // Ref for the current notification ID to avoid unwanted updates
  const currentNotificationIdRef = useRef(null);
  // Ref for messages
  const messageRefs = useRef({});
  // Ref for draggable
  const nodeRef = useRef(null);
  // Ref for drag handle
  const dragHandleRef = useRef(null);
  
  const { 
    notifications,
    users,
    markMessageAsRead,
    sendNotification,
    fetchNotificationById,
    responseOptions,
    fetchUsers,
    fetchResponseOptions,
    getNotificationAttachments,
    refreshAttachments,
    registerOpenChat,
    unregisterOpenChat,
    leaveChat,
    archiveChat,
    unarchiveChat,
    editMessage,
    getMessageVersionHistory,
    getMessageReactions,
    toggleMessageReaction,
    uploadNotificationAttachment,
    captureAndUploadPhoto
  } = useNotifications();
  
  const { chatWidth, updateChatWidth } = useUserSettings();
  
  // Find the current notification using the ref to avoid unwanted updates
  const currentNotification = notifications.find((n) => 
    n.notificationId === notification?.notificationId
  ) || notification;

  useEffect(() => {
    if (currentNotification && currentNotification.title) {
      setLocalTitle(currentNotification.title);
    }
  }, [currentNotification]);

  // Combined useEffect for notification updates and attachment event listener
  useEffect(() => {
    // Update notification ID ref
    if (notification && notification.notificationId) {
      currentNotificationIdRef.current = notification.notificationId;
    }
    
    // Update title
    if (notification && notification.title) {
      setLocalTitle(notification.title);
    }
    
    // Handler for attachment updates
    const handleAttachmentsRefreshed = (event) => {
      const { notificationId: updatedNotificationId } = event.detail;
      
      // Only update if this is for the current notification
      if (notification && updatedNotificationId === notification.notificationId) {
        setAttachmentsLoaded(true); // Mark attachments as loaded
      }
    };

    // Add event listener
    document.addEventListener('attachments-refreshed', handleAttachmentsRefreshed);

    // Clean up
    return () => {
      document.removeEventListener('attachments-refreshed', handleAttachmentsRefreshed);
    };
  }, [notification]);

  if (!currentNotification) {
    return null;
  }

  const { notificationId, isClosed, closingUser, closingDate, membersInfo, chatLeft, archived } = currentNotification;
  const closingUser_Name = users.find(user => user.userId == closingUser)?.firstName + ' ' + users.find(user => user.userId == closingUser)?.lastName;
  const parsedMessages = Array.isArray(currentNotification.messages) ? currentNotification.messages : JSON.parse(currentNotification.messages || '[]');
  const parsedMembersInfo = Array.isArray(currentNotification.membersInfo) ? currentNotification.membersInfo : JSON.parse(currentNotification.membersInfo || '[]');
  const title = localTitle || currentNotification.title;
  // Determine if the user has left the chat
  const hasLeftChat = chatLeft === 1 || chatLeft === true;
  // Determine if the chat is archived
  const isArchived = archived === 1 || archived === true;

  // Handle modal style based on screen size
  useEffect(() => {
    const updateModalStyle = () => {
      const screenWidth = window.innerWidth;
      const isVeryNarrow = screenWidth <= 480;
      const isMobileDevice = screenWidth <= 768;
      setIsMobile(isMobileDevice);

      if (isVeryNarrow || isMobileDevice) {
        // Style for mobile devices and very narrow screens
        setModalStyle({
          overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 2000
          },
          content: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: 'none',
            background: '#fff',
            overflow: 'hidden',
            width: '100%',
            height: '100%',
            padding: 0,
            margin: 0,
            borderRadius: 0,
            transform: 'none'
          }
        });
      } else {
        // Style for desktop
        const sidebarOffset = sidebarVisible ? 350 : 0;
        const horizontalPadding = Math.min(150, screenWidth * 0.1);
        
        setModalStyle({
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 1000
          },
          content: {
            position: 'absolute',
            top: '50%',
            left: `${horizontalPadding}px`,
            right: `${sidebarOffset + horizontalPadding}px`,
            transform: 'translateY(-50%)',
            height: isMinimized ? '40px' : '80%',
            width: isMinimized ? '200px' : chatWidth,
            padding: '0',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(10px)',
            overflow: 'hidden',
            resize: isMinimized ? 'none' : 'horizontal'
          }
        });
      }
    };

    updateModalStyle();
    window.addEventListener('resize', updateModalStyle);
    return () => window.removeEventListener('resize', updateModalStyle);
  }, [sidebarVisible, isMinimized, chatWidth]);

  // Listener for message update event
  useEffect(() => {
    const handleMessageUpdated = (event) => {
      const { notificationId: updatedNotificationId, messageId } = event.detail;
      
      console.log(`Message-updated event received for notificationId: ${updatedNotificationId}, messageId: ${messageId}`);
      
      // Verify that the updated notification corresponds to the current one
      if (updatedNotificationId && notification && updatedNotificationId === notification.notificationId) {
        console.log('Reloading notification after message modification');
        
        // Reload notification data
        fetchNotificationById(updatedNotificationId)
          .then((updatedNotification) => {
            if (updatedNotification) {
              console.log('Notification successfully reloaded');
              
              // If needed, update other states or perform additional actions
              if (messageId) {
                setAnimatedEditId(messageId);
                
                // Remove highlighting after 3 seconds
                setTimeout(() => {
                  setAnimatedEditId(null);
                }, 3000);
                
                // Find the message element and scroll to it
                setTimeout(() => {
                  const messageElement = document.getElementById(`message-${messageId}`);
                  if (messageElement) {
                    messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }, 200);
              }
            }
          })
          .catch(error => {
            console.error('Error reloading notification:', error);
          });
      }
    };

    // Add listener to the custom event
    document.addEventListener('message-updated', handleMessageUpdated);

    // Cleanup when component unmounts
    return () => {
      document.removeEventListener('message-updated', handleMessageUpdated);
    };
  }, [notification, fetchNotificationById]);

  // Register chat as open when modal opens
  useEffect(() => {
    if (isOpen && notificationId) {
      // Register this chat as open
      registerOpenChat(notificationId);
      
      return () => {
        // When component unmounts, remove chat from list
        unregisterOpenChat(notificationId);
      };
    }
  }, [isOpen, notificationId, registerOpenChat, unregisterOpenChat]);

  // Main listener for all types of updates
useEffect(() => {
  // Gestore per aggiornamenti dello stato della chat
  const handleChatStatusChange = async (event) => {
    const { notificationId, action } = event.detail || {};
    
    // Verifica che questo evento sia per la chat corrente
    if (notificationId && notification && parseInt(notificationId) === parseInt(notification.notificationId)) {
      console.log(`Stato della chat ${notificationId} cambiato: ${action}`);
      
      // Ricarica i dati aggiornati
      const updatedNotification = await fetchNotificationById(notificationId);
      
      if (updatedNotification) {
        // Aggiorna gli stati locali in base all'azione
        if (action === 'left') {
          setHasLeftChat(true);
        } else if (action === 'archived') {
          setIsArchived(true);
        } else if (action === 'unarchived') {
          setIsArchived(false);
        }
      }
    }
  };
  
  // Aggiungi listener per l'evento
  document.addEventListener('chat-status-changed', handleChatStatusChange);
  
  // Aggiungi altri listener già esistenti
  document.addEventListener('refreshNotifications', handleNotificationUpdate);
  document.addEventListener('chat-message-sent', handleNotificationUpdate);
  document.addEventListener('message-reaction-updated', handleNotificationUpdate);
  document.addEventListener('message-updated', handleNotificationUpdate);
  document.addEventListener('message-deleted', handleNotificationUpdate);
  
  // Pulizia dei listener
  return () => {
    document.removeEventListener('chat-status-changed', handleChatStatusChange);
    document.removeEventListener('refreshNotifications', handleNotificationUpdate);
    document.removeEventListener('chat-message-sent', handleNotificationUpdate);
    document.removeEventListener('message-reaction-updated', handleNotificationUpdate);
    document.removeEventListener('message-updated', handleNotificationUpdate);
    document.removeEventListener('message-deleted', handleNotificationUpdate);
  };
}, [notification, fetchNotificationById, handleNotificationUpdate]);

  useEffect(() => {
    if (isOpen && notificationId && !attachmentsLoaded) {
      setLoading(true);
      
      // Async function to load data
      const loadData = async () => {
        try {
          // Load notifications if needed
          if (!notification || notification.notificationId !== notificationId) {
            await fetchNotificationById(notificationId);
          }
          
          // Load attachments (will use cache if available)
          await refreshAttachments(notificationId);
          setAttachmentsLoaded(true);
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
    }
  }, [isOpen, notificationId, attachmentsLoaded, fetchNotificationById, refreshAttachments]);

  // Add a scroll monitor to detect user scrolling
  useEffect(() => {
    if (chatListRef?.current) {
      let userHasScrolled = false;
      const chatListElement = chatListRef.current;
      
      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = chatListElement;
        
        // Considera l'utente "scrollato" solo se è almeno 200px dal fondo
        if (scrollTop + clientHeight < scrollHeight - 200) {
          userHasScrolled = true;
          console.log('[ChatModal] User has scrolled up');
        }
        
        // Se l'utente scorre fino in fondo, reimposta il flag
        if (scrollTop + clientHeight >= scrollHeight - 20) {
          userHasScrolled = false;
          console.log('[ChatModal] User has scrolled to bottom');
        }
      };
      
      const handleWheel = (e) => {
        // Se l'utente scorre verso l'alto, imposta il flag
        if (e.deltaY < 0) {
          userHasScrolled = true;
          console.log('[ChatModal] User is scrolling up with wheel');
        }
      };
      
      chatListElement.addEventListener('scroll', handleScroll, { passive: true });
      chatListElement.addEventListener('wheel', handleWheel, { passive: true });
      
      return () => {
        chatListElement.removeEventListener('scroll', handleScroll);
        chatListElement.removeEventListener('wheel', handleWheel);
      };
    }
  }, [chatListRef?.current]);

  // Load users and response options when chat opens
  useEffect(() => {
    if (isOpen) {
      // Always fetch users and response options when the chat opens
      fetchUsers();
      fetchResponseOptions();
      
      // Track already fetched items to avoid duplicate API calls
      if (!fetchedUsers.includes(notification.notificationId)) {
        setFetchedUsers(prev => [...prev, notification.notificationId]);
      }

      if (!fetchedNotifications.includes(notification.notificationId)) {
        setFetchedNotifications(prev => [...prev, notification.notificationId]);
      }
    }
  }, [isOpen, fetchUsers, fetchResponseOptions, notification?.notificationId]);

  // Miglioramento: gestione migliore dello stato "markAsRead" per evitare chiamate infinite
  useEffect(() => {
    if (isOpen && notification && notification.notificationId) {
      // Controlla se la notificationId è cambiata rispetto all'ultima volta
      const isNewNotification = lastNotificationIdRef.current !== notification.notificationId;
      
      // Controlla se lo stato di lettura è cambiato
      const readStateChanged = lastReadStateRef.current !== notification.isReadByUser;
      
      // Logging per debug
      console.log(`[ChatModal] Notification ${notification.notificationId}, isReadByUser: ${notification.isReadByUser}, hasMarkedAsRead: ${hasMarkedAsRead}, lastReadState: ${lastReadStateRef.current}`);
      
      // Se è una nuova notifica o lo stato di lettura è cambiato e la notifica non è letta
      // E non abbiamo già marcato questo messaggio come letto localmente
      if ((isNewNotification || readStateChanged) && !notification.isReadByUser && !hasMarkedAsRead) {
        console.log(`[ChatModal] Marking notification ${notification.notificationId} as read (previous state: ${lastReadStateRef.current})`);
        
        // Marca come letta solo se necessario
        markMessageAsRead(notification.notificationId);
        
        // Aggiorna lo stato locale per evitare chiamate multiple
        setHasMarkedAsRead(true);
        lastReadStateRef.current = true;
      }
      
      // Aggiorna sempre il riferimento all'ID della notifica corrente
      lastNotificationIdRef.current = notification.notificationId;
      
      // Se la notifica è letta, aggiorna anche il riferimento dello stato di lettura
      if (notification.isReadByUser) {
        lastReadStateRef.current = true;
      }
    }
    
    // Reset quando la modale viene chiusa
    if (!isOpen) {
      setHasMarkedAsRead(false);
      // Non resettiamo lastReadStateRef e lastNotificationIdRef per mantenere
      // la "memoria" delle notifiche già lette
    }
  }, [isOpen, notification, markMessageAsRead, hasMarkedAsRead]);

  // Opening animation
  useEffect(() => {
    if (isOpen) {
      setAnimationClass('chat-open');
    } else {
      setAnimationClass('chat-close');
    }
  }, [isOpen]);

  // Load attachments when chat opens
  useEffect(() => {
    if (isOpen && notificationId && !attachmentsLoaded && !hasLeftChat) {
      setLoading(true);
      
      // Load notifications only if needed
      if (!notification || notification.notificationId !== notificationId) {
        fetchNotificationById(notificationId).catch(console.error);
      }
      
      // Load attachments
      getNotificationAttachments(notificationId)
        .then(data => {
          if (data) {
            setAttachments(data);
            setAttachmentsLoaded(true);
          }
        })
        .catch(error => {
          console.error('Error loading attachments:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, notificationId, attachmentsLoaded, hasLeftChat]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAttachmentsLoaded(false);
      setIsSearchVisible(false);
    }
  }, [isOpen]);

  // Save scroll position when possible
  useEffect(() => {
    const saveScrollPosition = () => {
      if (chatListRef.current) {
        scrollPositionRef.current = chatListRef.current.scrollTop;
      }
    };

    // Save scroll position before update
    saveScrollPosition();

    // Also add a listener to save position during scrolling
    if (chatListRef.current) {
      chatListRef.current.addEventListener('scroll', saveScrollPosition);
      return () => {
        if (chatListRef.current) {
          chatListRef.current.removeEventListener('scroll', saveScrollPosition);
        }
      };
    }
  }, []);

// Compare current messages with previous ones and handle scrolling
useEffect(() => {
  // Protect against updates of irrelevant notifications
  if (notification && notification.notificationId !== currentNotificationIdRef.current) {
    return; // Do nothing if this is not the currently open chat
  }

  // Only run when chatListRef is available
  if (!chatListRef.current) return;

  // Process current messages
  const currentMessages = Array.isArray(parsedMessages) ? parsedMessages : [];
  const prevMessages = Array.isArray(prevMessagesRef.current) ? prevMessagesRef.current : [];

  // Determine if there are new messages
  const hasNewMessages = currentMessages.length > prevMessages.length;
  
  // IMPORTANTE: Controlliamo se l'ultimo messaggio è dell'utente corrente
  const isFromCurrentUser = hasNewMessages && 
    currentMessages.length > 0 && 
    prevMessages.length > 0 &&
    currentMessages[currentMessages.length - 1]?.selectedUser === '1';
  
  // IMPORTANTE: Non scrollare automaticamente a meno che non sia:
  // 1. Primo caricamento (prevMessages è vuoto)
  // 2. L'utente ha inviato un messaggio
  // Nessun altro caso dovrebbe forzare lo scrolling
  if (prevMessages.length === 0 || isFromCurrentUser) {
    console.log('[ChatModal] Scrolling to bottom - first load or user message');
    // First load or user's own message - always scroll to bottom
    requestAnimationFrame(() => {
      if (chatListRef.current) {
        chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
      }
    });
  }
  // In TUTTI gli altri casi, lascia che sia ModernChatList a gestire lo scrolling
  // basandosi sul suo stato interno userHasScrolled
  
  // Update reference to previous messages
  prevMessagesRef.current = [...currentMessages];
}, [parsedMessages, notification]);


// Add this effect to save scroll position during manual scrolling
useEffect(() => {
  const saveScrollPosition = (e) => {
    if (chatListRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatListRef.current;
      
      // Only save position if not at the bottom
      if (scrollTop + clientHeight < scrollHeight - 20) {
        scrollPositionRef.current = scrollTop;
      } else {
        scrollPositionRef.current = 0; // Reset if at bottom
      }
    }
  };

  if (chatListRef.current) {
    chatListRef.current.addEventListener('scroll', saveScrollPosition, { passive: true });
    return () => {
      if (chatListRef.current) {
        chatListRef.current.removeEventListener('scroll', saveScrollPosition);
      }
    };
  }
}, []);

  // Watch modal size to update chat width
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === modalRef.current) {
          // Potential update of chat width
          const newWidth = `${entry.contentRect.width}px`;
          // updateChatWidth can be called here if needed
        }
      }
    });

    if (modalRef.current) {
      resizeObserver.observe(modalRef.current);
    }

    return () => {
      if (modalRef.current) {
        resizeObserver.unobserve(modalRef.current);
      }
    };
  }, [chatWidth, updateChatWidth]);

  // Function to scroll to message when found in search
  const scrollToMessage = (messageId) => {
    console.log(`Scrolling to message ID: ${messageId}`);
    setSelectedMessageId(messageId);

    // Wait for refs to update
    setTimeout(() => {
      const messageElement = document.getElementById(`message-${messageId}`);
      if (messageElement) {
        // Make sure the message is visible with an offset
        messageElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Temporarily highlight the message
        messageElement.classList.add('highlight-message');
        messageElement.style.backgroundColor = 'rgba(59, 130, 246, 0.3)'; // Stronger color initially
        
        setTimeout(() => {
          messageElement.style.backgroundColor = '';
          setTimeout(() => {
            messageElement.classList.remove('highlight-message');
          }, 1000);
        }, 2000);
        
        console.log(`Message highlighted: ${messageId}`);
      } else {
        console.error(`Message not found: ${messageId}`);
      }
    }, 100);
  };

  

  const handleMinimize = () => {
    // Salva la posizione di scroll prima di minimizzare
    if (chatListRef?.current) {
      scrollPositionRef.current = chatListRef.current.scrollTop;
    }
    
    setIsMinimized(true);
    setAnimationClass('chat-minimize');
    onMinimize(notification); 
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
    if (windowManager && windowManager.toggleMaximize) {
      windowManager.toggleMaximize(notificationId);
    }
  };

const handleRestore = () => {
  setIsMinimized(false);
  setAnimationClass('chat-maximize');
  
  // Ripristina la posizione di scroll dopo un breve ritardo
  setTimeout(() => {
    if (chatListRef?.current && scrollPositionRef.current > 0) {
      chatListRef.current.scrollTop = scrollPositionRef.current;
    }
  }, 100);
};

  const handleAnimationEnd = () => {
    if (!isOpen) {
      onRequestClose();
    }
  };

  const handleSend = async (notificationData) => {
    if (!notificationData.title || !notificationData.message) {
      swal.fire('Errore', 'Assicurati che tutti i campi siano compilati', 'error');
      return;
    }
  
    setSending(true);
    try {
      const res = await sendNotification(notificationData);
      if (res) {
        await fetchNotificationById(notificationData.notificationId);
        
        // NUOVO: Forza lo scroll in fondo dopo l'invio di un messaggio
        setTimeout(() => {
          if (chatListRef?.current) {
            // Ripristina la visibilità e scrolling
            if (chatListRef.current) {
              console.log('[ChatModal] Auto-scrolling after message sent');
              chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
            }
          }
        }, 100);
        
        // Emit event to update other components
        document.dispatchEvent(new CustomEvent('refreshNotifications'));
        document.dispatchEvent(new CustomEvent('chat-message-sent', { 
          detail: { 
            notificationId: notificationData.notificationId,
            isFromCurrentUser: true  // Aggiungi questo flag
          } 
        }));
      }
      return res;
    } catch (error) {
      console.error('Errore durante l\'invio della notifica:', error);
      return null;
    } finally {
      setSending(false);
    }
  };

  const handleReply = (message) => {
    setReplyToMessage(message);
  };

  const handleReceiversUpdate = (updatedList) => {
    const newList = Array.isArray(updatedList) ? updatedList : updatedList.split('-');
    setReceiversList(newList.join('-'));
  };

  // Function to show/hide search bar
  const toggleSearch = () => {
    setIsSearchVisible(!isSearchVisible);
  };

  // Handle chat archiving
const handleArchiveChat = async () => {
  try {
    console.log(`Attempting to archive chat with ID: ${notificationId}`);
    
    // Show loading indicator for immediate feedback
    swal.fire({
      title: 'Archiviazione in corso...',
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => {
        swal.showLoading();
      }
    });
    
    if (!archiveChat) {
      throw new Error('archiveChat function not available');
    }
    
    const result = await archiveChat(notificationId);
    console.log('Archive result:', result);
    
    if (result && result.success) {
      // Importante: Ricarica i dati aggiornati della chat
      await fetchNotificationById(notificationId);
      
      // Aggiorna lo stato locale immediatamente
      setIsArchived(true);
      
      swal.fire({
        icon: 'success',
        title: 'Chat archiviata',
        text: 'La chat è stata archiviata con successo',
        timer: 2000,
        showConfirmButton: false
      });
      
      // Emetti un evento per notificare altri componenti
      document.dispatchEvent(new CustomEvent('chat-status-changed', {
        detail: { 
          notificationId,
          action: 'archived',
          timestamp: new Date().getTime()
        }
      }));
    } else {
      throw new Error(result?.message || 'Cannot archive chat');
    }
  } catch (error) {
    console.error('Error archiving chat:', error);
    swal.fire({
      icon: 'error',
      title: 'Errore',
      text: error.message || 'Could not archive chat'
    });
  }
};

  // Handle unarchiving chat
const handleUnarchiveChat = async () => {
  try {
    console.log(`Attempting to unarchive chat with ID: ${notificationId}`);
    
    // Show loading indicator for immediate feedback
    swal.fire({
      title: 'Rimozione dall\'archivio in corso...',
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => {
        swal.showLoading();
      }
    });
    
    if (!unarchiveChat) {
      throw new Error('unarchiveChat function not available');
    }
    
    const result = await unarchiveChat(notificationId);
    console.log('Unarchive result:', result);
    
    if (result && result.success) {
      // Importante: Ricarica i dati aggiornati della chat
      await fetchNotificationById(notificationId);
      
      // Aggiorna lo stato locale immediatamente
      setIsArchived(false);
      
      swal.fire({
        icon: 'success',
        title: 'Chat recuperata',
        text: 'La chat è stata rimossa dall\'archivio',
        timer: 2000,
        showConfirmButton: false
      });
      
      // Emetti un evento per notificare altri componenti
      document.dispatchEvent(new CustomEvent('chat-status-changed', {
        detail: { 
          notificationId,
          action: 'unarchived',
          timestamp: new Date().getTime()
        }
      }));
    } else {
      throw new Error(result?.message || 'Cannot unarchive chat');
    }
  } catch (error) {
    console.error('Error unarchiving chat:', error);
    swal.fire({
      icon: 'error',
      title: 'Errore',
      text: error.message || 'Could not remove chat from archive'
    });
  }
};

  // Function to open the modal for editing a message
  const handleEditMessage = (message) => {
    if (hasLeftChat) return; // Don't allow editing if user has left the chat

    setMessageToEdit(message);
    setShowEditModal(true);
  };

  // Function to view the version history of a message
  const handleViewVersionHistory = async (messageId) => {
    if (hasLeftChat) return; // Don't allow viewing history if user has left the chat

    try {
      setLoadingVersions(true);
      
      const result = await getMessageVersionHistory(messageId);
      
      console.log("Version history result:", result);
      
      if (result && result.success) {
        // Make sure the data is in the correct format for the component
        setSelectedMessageVersions({
          currentMessage: result.currentMessage,
          versionHistory: result.versionHistory || []
        });
        
        setShowVersionHistory(true);
      } else {
        console.error('Error fetching message versions:', result);
        swal.fire('Errore', 'Impossibile recuperare la cronologia del messaggio', 'error');
      }
    } catch (error) {
      console.error('Error fetching message versions:', error);
      swal.fire('Errore', 'Impossibile recuperare la cronologia del messaggio', 'error');
    } finally {
      setLoadingVersions(false);
    }
  };

  // Function to handle message reactions
  const handleReactionSelect = async (messageId, emoji) => {
    if (hasLeftChat) return Promise.resolve(); // No reactions if user left chat

    try {
      setLoading(true); // Show loading indicator while processing
      
      // Toggle the reaction
      await toggleMessageReaction(messageId, emoji);
      console.log('Reaction toggled successfully:', emoji);
      
      if (notificationId) {
        await fetchNotificationById(notificationId);
        console.log('Notification data refreshed after reaction update');
      }
      
      // Notify about the reaction update using a custom event
      const event = new CustomEvent('message-reaction-updated', { 
        detail: { 
          messageId: messageId,
          notificationId: notificationId
        } 
      });
      document.dispatchEvent(event);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error toggling reaction:', error);
      swal.fire('Errore', 'Impossibile aggiungere la reazione', 'error');
      return Promise.reject(error);
    } finally {
      setLoading(false); // Hide loading indicator
    }
  };

  // Add search button to topbar
  const renderSearchButton = () => (
    <button 
      onClick={toggleSearch}
      className={`p-2 rounded-full transition-colors ${isSearchVisible ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
      title="Cerca nei messaggi"
    >
      <Search className="h-4 w-4" />
    </button>
  );

  // Drag handlers
  const handleDragStart = (e, data) => {
    setIsDragging(true);
    if (windowManager && windowManager.activateWindow) {
      windowManager.activateWindow(notificationId);
    }
  };

  const handleDrag = (e, data) => {
    setPosition({ x: data.x, y: data.y });
  };

  const handleDragStop = (e, data) => {
    setIsDragging(false);
    setPosition({ x: data.x, y: data.y });
    if (windowManager && windowManager.updatePosition) {
      windowManager.updatePosition(notificationId, data.x, data.y);
    }
  };

  // Resize handlers
  const handleResizeStart = () => {
    setIsResizing(true);
    if (windowManager && windowManager.activateWindow) {
      windowManager.activateWindow(notificationId);
    }
  };

  const handleResize = (e, direction, ref, d) => {
    setSize({
      width: size.width + d.width,
      height: size.height + d.height
    });
  };

  const handleResizeStop = (e, direction, ref, d) => {
    setIsResizing(false);
    setSize({
      width: size.width + d.width,
      height: size.height + d.height
    });
    if (windowManager && windowManager.updateSize) {
      windowManager.updateSize(notificationId, size.width + d.width, size.height + d.height);
    }
  };

  // Window content - same for maximized and normal mode
  const windowContent = (
    <div className="flex flex-col w-full h-full bg-white overflow-hidden">
      {/* Use the drag handle on the top bar */}
      <div 
        className="chat-window-handle cursor-move" 
        ref={dragHandleRef}
      >
        <ChatTopBar 
          title={notification.title}
          setTitle={setLocalTitle}
          closeChat={onRequestClose}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
          isMaximized={isMaximized}
          membersInfo={parsedMembersInfo}
          users={users.filter(user => !user.userDisabled)}
          currentUser={users.find(user => user.isCurrentUser)}
          notificationId={notification.notificationId}
          notificationCategoryId={notification.notificationCategoryId}
          notificationCategoryName={notification.notificationCategoryName}
          hexColor={notification.hexColor}
          tbCreated={notification.tbCreated}
          hasLeftChat={hasLeftChat}
          isArchived={isArchived}
          receiversList={receiversList}
          updateReceiversList={handleReceiversUpdate}
          archiveChat={handleArchiveChat}
          unarchiveChat={handleUnarchiveChat}
          leaveChat={async (notificationId) => {
            const result = await leaveChat(notificationId);
            if (result) {
              onRequestClose();
              swal.fire({
                title: 'Chat abbandonata',
                text: 'Hai abbandonato questa conversazione',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
              });
            }
          }}
          renderExtraButtons={renderSearchButton}
        />
      </div>
      
      {/* Banners for chat status */}
      <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200">
        {/* Banner for abandoned chat */}
        {hasLeftChat && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-2 flex items-center text-yellow-800 w-full">
            <AlertOctagon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="text-sm">Hai abbandonato questa chat. Puoi solo visualizzare i messaggi precedenti ma non puoi più interagire.</span>
          </div>
        )}
        
        {/* Banner for archived chat */}
        {isArchived && !hasLeftChat && (
          <div className="bg-purple-50 border-b border-purple-200 p-2 flex items-center text-purple-800 w-full">
            <AlertOctagon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="text-sm">Questa chat è archiviata. Puoi comunque interagire ma non apparirà nella lista principale.</span>
          </div>
        )}
      </div>
      
      <button 
        onClick={() => openWiki('chatmodal')}
        className="p-2 rounded-full hover:bg-gray-200 transition-colors"
        title="Guida Chat"
      >
        <CircleHelp className="w-4 h-4 text-gray-600" />
      </button>
      
      {/* Inline search component */}
      {isSearchVisible && (
        <ImprovedSearchBar 
          notificationId={notificationId}
          onResultSelected={scrollToMessage}
          onClose={() => setIsSearchVisible(false)}
        />
      )}
      
      {/* Chat content area */}
      <div className="flex-1 overflow-hidden">
        <ChatLayout 
          messages={parsedMessages}
          sending={sending}
          notificationId={notification.notificationId}
          isReadByUser={notification.isReadByUser || hasMarkedAsRead}
          markMessageAsRead={markMessageAsRead}
          chatListRef={chatListRef}
          membersInfo={parsedMembersInfo}
          users={users.filter(user => !user.userDisabled)}
          updateReceiversList={handleReceiversUpdate}
          currentUser={users.find(user => user.isCurrentUser)}
          receivers={receiversList}
          onReply={handleReply}
          title={title}
          createdAt={notification.tbCreated}
          notificationCategoryId={notification.notificationCategoryId}
          notificationCategoryName={notification.notificationCategoryName}
          hexColor={notification.hexColor}
          hasLeftChat={hasLeftChat}
          // Force attachments sidebar open at start
          initialSidebarOpen={true}
          selectedMessageId={selectedMessageId}
          onEditMessage={handleEditMessage}
          onViewVersionHistory={handleViewVersionHistory}
          onReactionSelect={handleReactionSelect}
        />
      </div>
      
      {/* Chat input area */}
      <div style={{ height: hasLeftChat ? 'auto' : '100px' }}>
        {hasLeftChat ? (
          <div className="p-4 bg-gray-50 border-t border-gray-200 text-center text-gray-500">
            <p>Hai abbandonato questa chat il {new Date().toLocaleDateString()} e non puoi più inviare messaggi.</p>
          </div>
        ) : (
          <ChatBottomBar
            notificationId={notificationId}
            isClosed={isClosed}
            title={title}
            notificationCategoryId={currentNotification.notificationCategoryId}
            responseOptions={responseOptions}
            reopenChat={async () => {
              const res = await reopenChat(notification.notificationId);
              if (res) {
                onRequestClose();
                swal.fire({
                  text: 'Chat riaperta con successo',
                  icon: 'success',
                  toast: true,
                  position: 'top-end',
                  showConfirmButton: false,
                  timer: 1500,
                  timerProgressBar: true
                });
              }
            }}
            closeChat={async () => {
              const res = await closeChat(notification.notificationId);
              if (res) {
                onRequestClose();
                swal.fire({
                  text: 'Chat chiusa con successo',
                  icon: 'success',
                  toast: true,
                  position: 'top-end',
                  showConfirmButton: false,
                  timer: 1500,
                  timerProgressBar: true
                });
              }
            }}
            closingUser_Name={closingUser_Name}
            closingDate={new Date(closingDate)}
            users={users.filter(user => !user.userDisabled)}
            receiversList={receiversList}
            updateReceiversList={handleReceiversUpdate}
            setSending={setSending}
            onSend={handleSend}
            replyToMessage={replyToMessage}
            setReplyToMessage={setReplyToMessage}
            hexColor={notification.hexColor}
            disabled={hasLeftChat}
            uploadNotificationAttachment={uploadNotificationAttachment}
            captureAndUploadPhoto={captureAndUploadPhoto}
            sendNotification={sendNotification}
          />
        )}
      </div>
      
      {/* Edit Message Modal */}
      <EditMessageModal 
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        message={messageToEdit}
        users={users || []} 
        messages={parsedMessages}
        onMessageUpdated={(updatedNotificationId) => {
          const idToUpdate = updatedNotificationId || notificationId;
          if (idToUpdate) {
            fetchNotificationById(idToUpdate)
              .then(result => {
                console.log("Notification updated successfully:", result);
                
                // Emit event to update other components
                document.dispatchEvent(new CustomEvent('message-updated', { 
                  detail: { 
                    notificationId: idToUpdate,
                    messageId: messageToEdit?.messageId
                  } 
                }));
              })
              .catch(error => {
                console.error("Error updating notification:", error);
              });
          }
        }}
      />
      
      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        versionData={selectedMessageVersions}
        loadingVersions={loadingVersions}
      />
    </div>
  );

  // Traditional modal implementation
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      shouldCloseOnOverlayClick={false}
      shouldCloseOnEsc={true}
      contentLabel="Chat Modal"
      style={modalStyle}
    >
      {!isMinimized ? (
        <div 
          ref={modalRef}
          className={'flex flex-col justify-between w-full h-full bg-white ' + animationClass}
          onAnimationEnd={handleAnimationEnd}
        >
          {windowContent}
        </div>
      ) : (
        <div className="flex items-center justify-between p-2 bg-gray-100 rounded-t-lg cursor-pointer" onClick={handleRestore}>
          <div className="flex items-center">
            <div 
              className="w-3 h-3 rounded-full mr-3"
              style={{ backgroundColor: currentNotification.hexColor || '#3b82f6' }}
            ></div>
            <span className="font-medium truncate max-w-[150px]">{title}</span>
          </div>
          <div className="flex items-center">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleRestore();
              }}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5 text-gray-700" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onRequestClose();
              }}
              className="p-1 hover:bg-gray-200 rounded-full ml-1 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-gray-700" />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ChatModal;