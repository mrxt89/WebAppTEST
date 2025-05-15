import { useEffect, useRef, useState, useCallback } from 'react';
import { Resizable } from 're-resizable';
import ChatTopBar from './ChatTopBar';
import ChatLayout from './ChatLayout';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';
import { debounce } from 'lodash'; 
import { swal } from '../../lib/common';
// Variabile globale per tenere traccia dell'ultimo aggiornamento
let lastUpdateTime = 0;

const debouncedForceUpdate = debounce((func) => {
  func();
}, 1000, { leading: true, trailing: false });

// Hook personalizzato per la memorizzazione degli utenti
const useMemoizedUsers = (initialUsers = []) => {
  const [users, setUsers] = useState(initialUsers);
  const lastValidUsersRef = useRef(initialUsers);
  const usersLoadedRef = useRef(false);
  const lastUsersFetchTimeRef = useRef(0);
  const MIN_FETCH_INTERVAL = 30000; // 30 secondi

  const updateUsers = useCallback((newUsers) => {
    if (Array.isArray(newUsers) && newUsers.length > 0) {
      setUsers(newUsers);
      lastValidUsersRef.current = newUsers;
      usersLoadedRef.current = true;
      lastUsersFetchTimeRef.current = Date.now();
    }
  }, []);

  const getUsers = useCallback(() => {
    return users.length > 0 ? users : lastValidUsersRef.current;
  }, [users]);

  const shouldFetchUsers = useCallback(() => {
    return !usersLoadedRef.current || 
           (Date.now() - lastUsersFetchTimeRef.current > MIN_FETCH_INTERVAL);
  }, []);

  return {
    users: getUsers(),
    updateUsers,
    shouldFetchUsers,
    usersLoaded: usersLoadedRef.current
  };
};

// Main ChatWindow component
const ChatWindow = ({ 
  notification, 
  onClose, 
  onMinimize, 
  windowManager,
  isStandalone = false, // prop per indicare se siamo in modalità standalone
  standaloneData = null // prop per dati in modalità standalone
}) => {
  const { 
    toggleReadUnread,
    fetchNotificationById, 
    sendNotification,
    users: hookUsers, // Rinominate per chiarezza
    responseOptions: hookResponseOptions, // Rinominate per chiarezza
    fetchUsers,
    fetchResponseOptions,
    registerOpenChat,
    unregisterOpenChat,
    leaveChat,       
    archiveChat,    
    unarchiveChat,
    uploadNotificationAttachment,
    captureAndUploadPhoto,
    notifications // Aggiungo questo per accedere direttamente alle notifiche dal Redux
  } = useNotifications();
  
  // Aggiungo lo stato per il titolo della chat
  const [chatTitle, setChatTitle] = useState(notification?.title || '');
  
  // Usa i dati standalone se disponibili, altrimenti usa quelli dall'hook
  const users = isStandalone && standaloneData?.users ? standaloneData.users : hookUsers;
  const responseOptions = isStandalone && standaloneData?.responseOptions 
    ? standaloneData.responseOptions 
    : hookResponseOptions;
    
  const windowRef = useRef(null);
  const nodeRef = useRef(null);
  const dragHandleRef = useRef(null);
  const isDraggingRef = useRef(false);
  const sizeRef = useRef({ width: 900, height: 700 });
  const lastNotificationRef = useRef(null);
  const messageUpdateTimeoutRef = useRef(null);
  const chatListRef = useRef(null);
  const prevMessagesRef = useRef([]); // Aggiunto questo ref che mancava

  // Nuovi ref per gestire lo scrolling
  const userHasScrolledRef = useRef(false);
  const scrollingToBottomRef = useRef(false);
  
  // IMPORTANT: Calculate initial position under the header - not at bottom of page
  const initialX = Math.max(0, Math.floor((window.innerWidth - 900) / 2));
  const initialY = Math.max(0, Math.floor(20)); // Posizione più in alto, appena sotto l'header
  
  // Local state for window position and size tracking during drag/resize
  const [position, setPosition] = useState(() => ({
    x: Number(initialX) || 0,
    y: Number(initialY) || 0
  }));
  const [size, setSize] = useState({ width: 900, height: 700 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [zIndex, setZIndex] = useState(1000);
  const [hasLeftChat, setHasLeftChat] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [parsedMessages, setParsedMessages] = useState([]);
  const [parsedMembersInfo, setParsedMembersInfo] = useState([]);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [lastMessageSentTime, setLastMessageSentTime] = useState(null);
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [receiversList, setReceiversList] = useState('');
  const [fetchedNotifications, setFetchedNotifications] = useState([]);
  const [fetchedUsers, setFetchedUsers] = useState([]);
  const updateInProgressRef = useRef(false);
  const updateQueuedRef = useRef(false);
  const isMountedRef = useRef(true);
  // Flag di controllo per l'aggiornamento della posizione
  const positionUpdatedByUserRef = useRef(false);
  const sizeUpdatedByUserRef = useRef(false);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const lastMessageIdRef = useRef(null);
  const previousMessagesRef = useRef([]);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  
  // Stato specifico per gli utenti della chat
  const [chatUsers, setChatUsers] = useState([]);
  const { users: memoizedUsers, updateUsers, shouldFetchUsers } = useMemoizedUsers(standaloneData?.users || hookUsers);

  // Aggiungo un ref per tenere traccia dell'ultimo conteggio dei messaggi dal Redux
  const lastReduxMessageCountRef = useRef(0);

  // Funzione dedicata per il caricamento degli utenti
  const loadUsers = useCallback(async () => {
    if (!shouldFetchUsers()) return;

    try {
      const fetchedUsers = await fetchUsers();
      if (Array.isArray(fetchedUsers) && fetchedUsers.length > 0) {
        updateUsers(fetchedUsers);
        setChatUsers(fetchedUsers);
      }
    } catch (error) {
      console.error('Errore nel caricamento degli utenti:', error);
    }
  }, [fetchUsers, shouldFetchUsers, updateUsers]);

  // Effetto per il caricamento iniziale degli utenti
  useEffect(() => {
    if (notification?.notificationId) {
      loadUsers();
    }
  }, [notification?.notificationId, loadUsers]);

  // Funzione di utilità per filtrare gli utenti disabilitati in modo sicuro
  const getFilteredUsers = useCallback(() => {
    const usersToFilter = chatUsers.length > 0 ? chatUsers : memoizedUsers;
    return Array.isArray(usersToFilter) 
      ? usersToFilter.filter(user => user && !user.userDisabled)
      : [];
  }, [chatUsers, memoizedUsers]);

  // Funzione di utilità per trovare l'utente corrente in modo sicuro
  const getCurrentUser = useCallback(() => {
    const usersToSearch = chatUsers.length > 0 ? chatUsers : memoizedUsers;
    return Array.isArray(usersToSearch) 
      ? usersToSearch.find(user => user && user.isCurrentUser)
      : null;
  }, [chatUsers, memoizedUsers]);
  
  // IMPORTANT: Define handler functions with useCallback at the component's top level
  // This ensures they maintain consistent identity between renders
  const handleMaximize = useCallback(() => {
    if (windowManager && windowManager.toggleMaximize && notification?.notificationId) {
      windowManager.toggleMaximize(notification.notificationId);
    }
  }, [windowManager, notification]);

  const handleMinimize = useCallback(() => {
    if (onMinimize && notification) {
      onMinimize(notification);
    }
  }, [onMinimize, notification]);

  const handleClose = useCallback(() => {
    if (onClose && notification?.notificationId) {
      onClose(notification.notificationId);
    }
  }, [onClose, notification]);

  const handleActivate = useCallback(() => {
    if (windowManager?.activateWindow && notification?.notificationId) {
      windowManager.activateWindow(notification.notificationId);
    }
  }, [windowManager, notification]);

  // Funzione per gestire la risposta a un messaggio
  const handleReply = useCallback((message) => {
    setReplyToMessage(message);
  }, []);
  
  // Funzione per aggiornare i messaggi localmente dal prop notification
  const updateMessagesFromNotification = useCallback(() => {
    if (!notification || !isMountedRef.current) return;
    
    try {
      // Ottieni la notifica aggiornata direttamente dal Redux store
      const updatedNotification = notifications?.find(n => n.notificationId === notification.notificationId);
      if (!updatedNotification) return;

      // Parse messages dalla notifica aggiornata del Redux
      const messages = Array.isArray(updatedNotification.messages) 
        ? updatedNotification.messages 
        : (typeof updatedNotification.messages === 'string' 
          ? JSON.parse(updatedNotification.messages || '[]') 
          : []);
      
      // Verifica se ci sono nuovi messaggi confrontando il conteggio dal Redux
      const lastMessage = messages[messages.length - 1];
      const hasNewMessagesReceived = 
        messages.length > lastReduxMessageCountRef.current || // Nuovo messaggio aggiunto (dal Redux)
        (lastMessage && (!lastMessageIdRef.current || lastMessage.messageId !== lastMessageIdRef.current)); // ID diverso
      
      if (lastMessage) {
        lastMessageIdRef.current = lastMessage.messageId;
      }
      lastReduxMessageCountRef.current = messages.length;
      previousMessagesRef.current = messages;
      
      // Aggiorna lo stato dei nuovi messaggi solo se l'utente ha scrollato verso l'alto
      if (hasNewMessagesReceived && userHasScrolledRef.current) {
        setHasNewMessages(true);
      } else if (!userHasScrolledRef.current) {
        setHasNewMessages(false);
      }
      
      // Aggiorna lo stato dei messaggi
      setParsedMessages(messages);
      
      // Parse members info dalla notifica aggiornata
      const membersInfo = Array.isArray(updatedNotification.membersInfo) 
        ? updatedNotification.membersInfo 
        : (typeof updatedNotification.membersInfo === 'string' 
          ? JSON.parse(updatedNotification.membersInfo || '[]') 
          : []);
      setParsedMembersInfo(membersInfo);
      
      // Set other states dalla notifica aggiornata
      setHasLeftChat(updatedNotification.chatLeft === 1 || updatedNotification.chatLeft === true);
      setIsArchived(updatedNotification.archived === 1 || updatedNotification.archived === true);

      // Se ci sono nuovi messaggi e l'utente non ha scrollato manualmente verso l'alto
      if (hasNewMessagesReceived && !userHasScrolledRef.current) {
        // Segnala che stiamo scrollando programmaticamente
        scrollingToBottomRef.current = true;
        
        // Usa setTimeout per assicurarsi che il DOM sia aggiornato
        setTimeout(() => {
          if (chatListRef.current && isMountedRef.current) {
            chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
            
            // Riattiva la rilevazione dello scroll dopo un breve ritardo
            setTimeout(() => {
              if (isMountedRef.current) {
                scrollingToBottomRef.current = false;
              }
            }, 500);
          }
        }, 100);

        toggleReadUnread(notification.notificationId, true).then(() => {
          // Dopo aver aggiornato lo stato, forza un refresh della notifica
          fetchNotificationById(notification.notificationId, true).then(() => {
            // Emetti un evento per aggiornare la sidebar
            document.dispatchEvent(new CustomEvent('notification-updated', {
              detail: { notificationId: notification.notificationId }
            }));
          });
        });
      }
    } catch (err) {
      console.error("Errore nell'aggiornamento dei messaggi da Redux:", err);
    }
  }, [notification, notifications]);
  
  // Funzione per aggiornare la lista dei destinatari
  const handleReceiversUpdate = useCallback((updatedList) => {
    setReceiversList(updatedList);
  }, []);
  
  // Funzione che forza un aggiornamento dal server e poi aggiorna i messaggi
  const forceUpdateFromServer = useCallback(async () => {
    if (!notification?.notificationId || isUpdating || !fetchNotificationById) return;
    
    // Evita aggiornamenti troppo frequenti
    if (Date.now() - lastUpdateTime < 5000) {
      debouncedForceUpdate(() => forceUpdateFromServer());
      return;
    }
    
    lastUpdateTime = Date.now();
    setIsUpdating(true);
    
    try {
      // Attempt to fetch updated notification data
      const updatedNotification = await fetchNotificationById(notification.notificationId);
      
      // If successful, update local state
      if (updatedNotification) {
        updateMessagesFromNotification();
      }
    } catch (error) {
      console.error("Errore durante l'aggiornamento forzato:", error);
    } finally {
      setIsUpdating(false);
    }
  }, [notification, fetchNotificationById, isUpdating, updateMessagesFromNotification]);

  // Funzione per inviare un messaggio
  const handleSendMessage = useCallback(async (notificationData) => {
    if (!notification?.notificationId || !sendNotification) return;
    
    try {
      // Memorizziamo se stiamo rispondendo a un messaggio prima di resettare lo stato
      const wasReplyingTo = replyToMessage;
      
      // Impostazione dello stato di invio
      setSending(true);
      
      // Find current user safely
      const currentUser = users?.find(user => user?.isCurrentUser);
      
      // Crea una copia temporanea del messaggio per visualizzazione immediata
      const tempMessage = {
        messageId: `temp_${Date.now()}`,
        message: notificationData.message,
        senderId: currentUser?.userId || 0,
        senderName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Tu',
        selectedUser: '1',
        tbCreated: new Date().toISOString(),
        replyToMessageId: notificationData.replyToMessageId || 0
      };
      
      // Aggiungi immediatamente il messaggio temporaneo alla lista per feedback visivo
      setParsedMessages(prev => [...prev, tempMessage]);
      
      // IMPORTANTE: indica che stiamo facendo uno scrolling forzato al fondo
      // per impedire interferenze con altri listener di scroll
      scrollingToBottomRef.current = true;
      
      // Scorri in basso per mostrare il nuovo messaggio
      setTimeout(() => {
        if (chatListRef.current) {

          chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
          
          // Resetta il flag userHasScrolled per permettere l'auto-scrolling dei prossimi messaggi
          userHasScrolledRef.current = false;
        }
        
        // Riattiva la rilevazione dello scrolling dell'utente dopo un breve ritardo
        setTimeout(() => {
          scrollingToBottomRef.current = false;
        }, 500);
      }, 50);
      
      // Invio il messaggio usando la funzione del contesto
      const result = await sendNotification(notificationData);
      
      // Se l'invio è andato a buon fine
      if (result) {
        // Resetta il messaggio di risposta
        if (wasReplyingTo) {
          setReplyToMessage(null);
        }
        
        // Imposta il timestamp dell'ultimo messaggio inviato
        setLastMessageSentTime(Date.now());
        
        // Incrementa il contatore per forzare un aggiornamento
        setForceUpdateCounter(prev => prev + 1);
        
        // Forza un aggiornamento dalla API dopo un breve ritardo
        // Pulisci eventuali timeout esistenti
        if (messageUpdateTimeoutRef.current) {
          clearTimeout(messageUpdateTimeoutRef.current);
        }
        
        messageUpdateTimeoutRef.current = setTimeout(() => {
          forceUpdateFromServer();
          
          // Emetti un evento per notificare altri componenti
          document.dispatchEvent(new CustomEvent('chat-message-sent', {
            detail: { 
              notificationId: notificationData.notificationId,
              messageId: result.messageId || tempMessage.messageId,
              isFromCurrentUser: true // Aggiungi questo flag per indicare che è dall'utente corrente
            }
          }));
          
          // Emetti anche un evento per forzare l'aggiornamento di tutti i componenti
          document.dispatchEvent(new CustomEvent('refreshNotifications'));
          
          messageUpdateTimeoutRef.current = null;
        }, 300);
      }
      
      return result;
    } catch (error) {
      console.error("Errore durante l'invio del messaggio:", error);
      // Rimuovi il messaggio temporaneo in caso di errore
      setParsedMessages(prev => prev.filter(msg => !msg.messageId.toString().startsWith('temp_')));
      throw error;
    } finally {
      // Sempre resetta lo stato di invio
      setSending(false);
    }
  }, [notification, sendNotification, replyToMessage, users, forceUpdateFromServer]);

  const handleNotificationUpdate = useCallback(async (event) => {
    // Ignora gli eventi se il componente è stato smontato
    if (!isMountedRef.current) return;
    
    const eventType = event.type;
    const detail = event.detail || {};
    
    // Estrai l'ID notifica dall'evento
    const eventNotificationId = detail.notificationId;
    
    // Se l'evento non è per questa chat, ignoralo
    if (eventNotificationId && notification && parseInt(eventNotificationId) !== parseInt(notification.notificationId)) {
      return;
    }
    
    // Forza alta priorità per gli aggiornamenti da eventi di nuovi messaggi
    const highPriority = eventType === 'open-chat-new-message' || eventType === 'chat-message-sent';
    
    // Evita aggiornamenti troppo frequenti
    if (updateInProgressRef.current) {
      updateQueuedRef.current = true;
      return;
    }
    
    updateInProgressRef.current = true;
    
    try {
      // Usa la nuova implementazione di fetchNotificationById
      await fetchNotificationById(notification.notificationId, highPriority);
      
      // Aggiorna i messaggi locali
      updateMessagesFromNotification();
    } catch (error) {
      console.error('Error updating notification:', error);
    } finally {
      updateInProgressRef.current = false;
      
      // Se ci sono aggiornamenti in coda, eseguili
      if (updateQueuedRef.current) {
        updateQueuedRef.current = false;
        setTimeout(() => {
          if (isMountedRef.current) {
            handleNotificationUpdate(event);
          }
        }, 100);
      }
    }
  }, [notification, fetchNotificationById, updateMessagesFromNotification]);

  useEffect(() => {
    const handleNotificationUpdate = async (event) => {
      // Ignora gli eventi se il componente è stato smontato
      if (!isMountedRef.current) return;
      
      const eventType = event.type;
      const detail = event.detail || {};
      
      // Estrai l'ID notifica dall'evento
      const eventNotificationId = detail.notificationId;
      
      // Se l'evento non è per questa chat, ignoralo
      if (eventNotificationId && notification && parseInt(eventNotificationId) !== parseInt(notification.notificationId)) {
        return;
      }
      
      // Forza alta priorità per gli aggiornamenti da eventi di nuovi messaggi
      const highPriority = eventType === 'open-chat-new-message' || eventType === 'chat-message-sent';
      
      // Evita aggiornamenti troppo frequenti
      if (updateInProgressRef.current) {
        updateQueuedRef.current = true;
        return;
      }
      
      updateInProgressRef.current = true;
      
      try {
        // Aggiorna con priorità alta per i nuovi messaggi
        const updatedNotification = await fetchNotificationById(notification.notificationId, highPriority);
        
        if (updatedNotification) {
          // Se è un nuovo messaggio e l'utente non ha scrollato manualmente verso l'alto,
          // scorri fino in fondo alla chat
          if ((eventType === 'open-chat-new-message' || eventType === 'chat-message-sent') && 
              !userHasScrolledRef.current) {
          
            // Segnala che stiamo scrollando programmaticamente
            scrollingToBottomRef.current = true;
            
            setTimeout(() => {
              if (chatListRef.current) {
                chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
              }
              
              // Riattiva la rilevazione dello scroll dopo un breve ritardo
              setTimeout(() => {
                scrollingToBottomRef.current = false;
              }, 500);
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error updating notification:', error);
      } finally {
        updateInProgressRef.current = false;
        
        // Se ci sono aggiornamenti in coda, pianificali
        if (updateQueuedRef.current) {
          updateQueuedRef.current = false;
          setTimeout(() => {
            if (isMountedRef.current) {
              handleNotificationUpdate(event);
            }
          }, 100);
        }
      }
    };

    // Add listeners for various update events
    document.addEventListener('refreshNotifications', handleNotificationUpdate);
    document.addEventListener('chat-message-sent', handleNotificationUpdate);
    document.addEventListener('message-reaction-updated', handleNotificationUpdate);
    document.addEventListener('message-updated', handleNotificationUpdate);
    document.addEventListener('message-deleted', handleNotificationUpdate);
    // Aggiungi un listener specifico per l'evento open-chat-new-message
    document.addEventListener('open-chat-new-message', handleNotificationUpdate);
    
    // Clean up listeners on unmount
    return () => {
      document.removeEventListener('refreshNotifications', handleNotificationUpdate);
      document.removeEventListener('chat-message-sent', handleNotificationUpdate);
      document.removeEventListener('message-reaction-updated', handleNotificationUpdate);
      document.removeEventListener('message-updated', handleNotificationUpdate);
      document.removeEventListener('message-deleted', handleNotificationUpdate);
      document.removeEventListener('open-chat-new-message', handleNotificationUpdate);
    };
  }, [notification, fetchNotificationById]);

  useEffect(() => {
    if (notification?.notificationId) {
      // Registra questa chat come aperta
      registerOpenChat(notification.notificationId);
      
      return () => {
        // Quando il componente viene smontato, rimuovi la chat dall'elenco
        unregisterOpenChat(notification.notificationId);
      };
    }
  }, [notification?.notificationId, registerOpenChat, unregisterOpenChat]);

  useEffect(() => {
    // Gestore per aggiornamenti dello stato della chat
    const handleChatStatusChange = async (event) => {
      const { notificationId, action } = event.detail || {};
      
      // Verifica che questo evento sia per la chat corrente
      if (notificationId && notification && notificationId === notification.notificationId) {
      
        // Ricarica i dati aggiornati
        await fetchNotificationById(notificationId);
        
        // Aggiorna gli stati locali in base all'azione
        if (action === 'left') {
          setHasLeftChat(true);
        } else if (action === 'archived') {
          setIsArchived(true);
        } else if (action === 'unarchived') {
          setIsArchived(false);
        }
      }
    };
    
    // Aggiungi listener per l'evento
    document.addEventListener('chat-status-changed', handleChatStatusChange);
    
    // Pulizia del listener
    return () => {
      document.removeEventListener('chat-status-changed', handleChatStatusChange);
    };
  }, [notification, fetchNotificationById]);

  const handleDragStart = useCallback((e) => {
    // Verifica se il trascinamento inizia dall'handle (barra superiore)
    const isHandleElement = e.target.closest('.chat-window-handle');
    if (!isHandleElement) {
      return; // Non procedere se non stiamo trascinando dall'handle
    }
    
    // Previeni il comportamento predefinito solo sui click, non sui drag
    if (e.type === 'mousedown') {
      e.preventDefault();
    }
    
    // Aggiorna stato e riferimento
    setIsDragging(true);
    isDraggingRef.current = true;
    
    // Attiva la finestra
    handleActivate();
    
    // Posizione iniziale del mouse
    const startX = e.clientX;
    const startY = e.clientY;
    
    // Assicuriamoci che nodeRef.current sia definito prima di iniziare
    if (!nodeRef.current) {
      console.error('nodeRef.current è null o non definito durante il trascinamento');
      setIsDragging(false);
      isDraggingRef.current = false;
      return;
    }
    
    // Posizione iniziale della finestra - leggiamo direttamente dallo stile corrente
    let startWindowX = position.x;
    let startWindowY = position.y;
    
    // Se i valori di posizione non sono validi, leggiamo direttamente dallo stile computato
    if (isNaN(startWindowX) || isNaN(startWindowY)) {
      const computedStyle = window.getComputedStyle(nodeRef.current);
      // Usiamo parseFloat per estrarre il valore numerico e rimuovere 'px'
      startWindowX = parseFloat(computedStyle.left);
      startWindowY = parseFloat(computedStyle.top);
      
      // Aggiorna lo stato con i valori corretti
      setPosition({
        x: startWindowX,
        y: startWindowY
      });
    }
    
    // Funzione di movimento
    const handleMouseMove = (moveEvent) => {
      if (!isDraggingRef.current || !nodeRef.current) return;
      
      // Calcola lo spostamento
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      // Nuova posizione
      const newX = startWindowX + deltaX;
      const newY = startWindowY + deltaY;
      
      // Limita il movimento all'interno del viewport
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - size.height;
      
      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));
      
      // Verifica che i valori siano numeri validi prima di applicarli
      if (!isNaN(boundedX) && !isNaN(boundedY)) {
        nodeRef.current.style.left = `${boundedX}px`;
        nodeRef.current.style.top = `${boundedY}px`;
      }
    };
    
    // Funzione di rilascio
    const handleMouseUp = () => {
      // Rimuovi i listener
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Aggiorna stato e riferimento
      setIsDragging(false);
      isDraggingRef.current = false;
      
      // Resetta il flag immediatamente dopo l'aggiornamento della posizione
      positionUpdatedByUserRef.current = true;
      
      // Leggi la posizione finale dal DOM
      if (nodeRef.current) {
        // Estrai i valori CSS e converti in numeri
        const computedStyle = window.getComputedStyle(nodeRef.current);
        const leftValue = computedStyle.left;
        const topValue = computedStyle.top;
        
        // Converti in numeri rimuovendo 'px' e verificando che siano validi
        let finalX = parseFloat(leftValue);
        let finalY = parseFloat(topValue);
        
        // Verifica aggiuntiva di validità
        if (isNaN(finalX) || isNaN(finalY)) {
          console.warn('Valori di posizione non validi dopo il trascinamento:', leftValue, topValue);
          finalX = position.x;
          finalY = position.y;
        }
        
        // Aggiorna lo stato React con la posizione finale
        setPosition({
          x: finalX,
          y: finalY
        });
        
        // Aggiorna il window manager
        if (windowManager && windowManager.updatePosition && notification?.notificationId) {
          windowManager.updatePosition(notification.notificationId, finalX, finalY);
        }
        
        // Imposta un timeout per resettare il flag dopo che tutte le altre operazioni sono completate
        setTimeout(() => {
          positionUpdatedByUserRef.current = false;
        }, 50);
      }
    };
    
    // Aggiungi listener
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [position, size.width, size.height, handleActivate, windowManager, notification]);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
    handleActivate();
  }, [handleActivate]);
  
  const handleResize = useCallback((e, direction, ref, d) => {
    // Calcola le nuove dimensioni
    const newWidth = sizeRef.current.width + d.width;
    const newHeight = sizeRef.current.height + d.height;
    
    // Limita le dimensioni ai massimi consentiti
    const maxWidth = window.innerWidth * 0.95;
    const maxHeight = window.innerHeight * 0.95;
    const minWidth = 400;
    const minHeight = 350;
    
    const constrainedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
    const constrainedHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
    
    // Aggiorna le dimensioni direttamente nel DOM per un feedback immediato
    if (ref) {
      ref.style.width = `${constrainedWidth}px`;
      ref.style.height = `${constrainedHeight}px`;
    }
    
    // Aggiorna lo stato React con le dimensioni limitate
    setSize({
      width: constrainedWidth,
      height: constrainedHeight
    });
  }, []);
  
  const handleResizeStop = useCallback((e, direction, ref, d) => {
    // Fine del ridimensionamento
    setIsResizing(false);
    
    // Imposta il flag per indicare che l'utente ha appena ridimensionato
    sizeUpdatedByUserRef.current = true;
    
    // Leggi le dimensioni finali dal DOM
    let finalWidth = ref ? parseFloat(ref.style.width) : (sizeRef.current.width + d.width);
    let finalHeight = ref ? parseFloat(ref.style.height) : (sizeRef.current.height + d.height);
    
    // Assicurati che non siano NaN
    if (isNaN(finalWidth)) finalWidth = size.width + d.width;
    if (isNaN(finalHeight)) finalHeight = size.height + d.height;
    
    // Aggiorna il riferimento
    sizeRef.current = {
      width: finalWidth,
      height: finalHeight
    };
    
    // Aggiorna lo stato React
    setSize({
      width: finalWidth,
      height: finalHeight
    });
    
    // Aggiorna il window manager
    if (windowManager && windowManager.updateSize && notification?.notificationId) {
      windowManager.updateSize(
        notification.notificationId, 
        finalWidth, 
        finalHeight
      );
    }
  }, [size, windowManager, notification]);

  // Register chat as open when modal opens
  useEffect(() => {
    if (notification?.notificationId && registerOpenChat) {
      registerOpenChat(notification.notificationId);
      
      return () => {
        if (unregisterOpenChat) {
          unregisterOpenChat(notification.notificationId);
        }
      };
    }
  }, [notification, registerOpenChat, unregisterOpenChat]);
  
  // Load users and response options when chat opens
  useEffect(() => {
    if (notification?.notificationId) {
      if (!fetchedUsers.includes(notification.notificationId) && fetchUsers) {
        fetchUsers();
        setFetchedUsers(prev => [...prev, notification.notificationId]);
      }

      if (!fetchedNotifications.includes(notification.notificationId) && fetchResponseOptions) {
        fetchResponseOptions();
        setFetchedNotifications(prev => [...prev, notification.notificationId]);
      }
    }
  }, [notification, fetchUsers, fetchResponseOptions, fetchedNotifications, fetchedUsers]);
  
  // Override della funzione sendNotification nel contesto per intercettare tutti gli invii
  useEffect(() => {
    if (!notification?.notificationId || !window?.notificationContext) return;
    
    // Salva la funzione originale
    const originalSendNotification = window.notificationContext?.sendNotification || sendNotification;
    
    // Funzione migliorata che forza l'aggiornamento dopo l'invio
    const enhancedSendNotification = async (...args) => {
      try {
        // Imposta lo stato di invio
        setSending(true);
        
        // Chiama la funzione originale
        const result = await originalSendNotification(...args);
        
        // Se l'invio è andato a buon fine, forza un aggiornamento
        if (result && (!result.notificationId || result.notificationId === notification.notificationId)) {
          // Imposta il timestamp dell'ultimo messaggio inviato
          setLastMessageSentTime(Date.now());
          
          // Forza un aggiornamento
          setTimeout(() => {
            forceUpdateFromServer();
          }, 300);
        }
        
        return result;
      } catch (error) {
        console.error("Errore durante l'intercettazione dell'invio:", error);
        throw error;
      } finally {
        // Reimposta lo stato di invio
        setSending(false);
      }
    };
    
    // Sostituisci la funzione nel contesto
    if (typeof window !== 'undefined' && window.notificationContext) {
      window.notificationContext.originalSendNotification = originalSendNotification;
      window.notificationContext.sendNotification = enhancedSendNotification;
    }
    
    // Ripristina la funzione originale alla pulizia
    return () => {
      if (typeof window !== 'undefined' && window.notificationContext?.originalSendNotification) {
        window.notificationContext.sendNotification = window.notificationContext.originalSendNotification;
        delete window.notificationContext.originalSendNotification;
      }
    };
  }, [notification?.notificationId, sendNotification, forceUpdateFromServer]);

  // Modifico l'effetto per la gestione degli eventi di aggiornamento
  useEffect(() => {
    isMountedRef.current = true;
    
    // Funzione per gestire tutti gli eventi di aggiornamento relativi alle chat
    const handleChatUpdate = (event) => {
      // Ignora gli eventi se il componente è stato smontato
      if (!isMountedRef.current) return;
      
      const detail = event.detail || {};
      
      // Estrai l'ID notifica dall'evento
      const eventNotificationId = detail.notificationId;
      
      // Se l'evento non è per questa chat, ignoralo
      if (eventNotificationId && notification && parseInt(eventNotificationId) !== parseInt(notification.notificationId)) {
        return;
      }
      
      // Imposta un flag per evitare aggiornamenti troppo frequenti
      if (updateInProgressRef.current) {
        updateQueuedRef.current = true;
        return;
      }
      
      updateInProgressRef.current = true;
      
      // Usa requestAnimationFrame per assicurarsi che il reducer sia completato
      requestAnimationFrame(() => {
        // Usa setTimeout per un ulteriore livello di sicurezza
        setTimeout(() => {
          forceUpdateFromServer()
            .finally(() => {
              if (!isMountedRef.current) return;
              
              updateInProgressRef.current = false;
              
              // Se ci sono aggiornamenti in coda, eseguili
              if (updateQueuedRef.current) {
                updateQueuedRef.current = false;
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    if (isMountedRef.current) {
                      forceUpdateFromServer();
                    }
                  }, 0);
                });
              }
            });
        }, 0);
      });
    };
    
    // Aggiungi il listener per l'evento
    document.addEventListener('notification-updated', handleChatUpdate);
    
    // Pulizia del listener
    return () => {
      document.removeEventListener('notification-updated', handleChatUpdate);
    };
  }, [notification, forceUpdateFromServer]);
  
  // Modifico anche l'effetto per la gestione degli eventi di chat
  useEffect(() => {
    isMountedRef.current = true;
    
    // Funzione per gestire tutti gli eventi di aggiornamento relativi alle chat
    const handleChatUpdate = (event) => {
      // Ignora gli eventi se il componente è stato smontato
      if (!isMountedRef.current) return;
      
      const detail = event.detail || {};
      
      // Estrai l'ID notifica dall'evento
      const eventNotificationId = detail.notificationId;
      
      // Se l'evento non è per questa chat, ignoralo
      if (eventNotificationId && notification && parseInt(eventNotificationId) !== parseInt(notification.notificationId)) {
        return;
      }
      
      // Imposta un flag per evitare aggiornamenti troppo frequenti
      if (updateInProgressRef.current) {
        updateQueuedRef.current = true;
        return;
      }
      
      updateInProgressRef.current = true;
      
      // Usa requestAnimationFrame per assicurarsi che il reducer sia completato
      requestAnimationFrame(() => {
        // Usa setTimeout per un ulteriore livello di sicurezza
        setTimeout(() => {
          forceUpdateFromServer()
            .finally(() => {
              if (!isMountedRef.current) return;
              
              updateInProgressRef.current = false;
              
              // Se ci sono aggiornamenti in coda, eseguili
              if (updateQueuedRef.current) {
                updateQueuedRef.current = false;
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    if (isMountedRef.current) {
                      forceUpdateFromServer();
                    }
                  }, 0);
                });
              }
            });
        }, 0);
      });
    };
    
    // Registra tutti gli eventi che richiedono un aggiornamento
    const eventTypes = [
      'chat-message-sent',
      'message-updated',
      'message-deleted',
      'message-reaction-updated',
      'attachment-updated',
      'poll-updated',
      'message-color-changed',
      'refreshNotifications'
    ];
    
    // Registra i listener per tutti gli eventi
    eventTypes.forEach(eventType => {
      document.addEventListener(eventType, handleChatUpdate);
    });
    
    // Cleanup
    return () => {
      isMountedRef.current = false;
      
      eventTypes.forEach(eventType => {
        document.removeEventListener(eventType, handleChatUpdate);
      });
      
      // Pulisci eventuali timeout
      if (messageUpdateTimeoutRef.current) {
        clearTimeout(messageUpdateTimeoutRef.current);
        messageUpdateTimeoutRef.current = null;
      }
    };
  }, [notification, forceUpdateFromServer]);
  
  // Effetto per inizializzare e aggiornare i messaggi quando cambia notificationId
  useEffect(() => {
    // Use a local flag to track if we've already marked this notification as read
    let hasMarkedAsReadLocally = false;
    
    // Controlla solo se l'ID della notifica è cambiato
    if (notification?.notificationId && 
        (!lastNotificationRef.current || 
        lastNotificationRef.current.notificationId !== notification.notificationId)) {
      
      // Aggiorna i messaggi quando cambia la notifica
      updateMessagesFromNotification();
      
      // Mark messages as read - but only once and only if needed
      if (!notification.isReadByUser && !hasMarkedAsReadLocally) {
        toggleReadUnread(notification.notificationId, true);
        hasMarkedAsReadLocally = true; // Set local flag to prevent multiple calls
      }
      
      // Aggiorna il riferimento all'ID
      lastNotificationRef.current = {
        notificationId: notification.notificationId,
        isReadByUser: notification.isReadByUser || hasMarkedAsReadLocally
      };
    } else if (notification?.notificationId && lastNotificationRef.current?.notificationId === notification.notificationId) {
      // Update the messages only if there are actual changes
      
      // Controlla se i messaggi sono cambiati
      const currentMessages = Array.isArray(notification.messages) 
        ? notification.messages 
        : (typeof notification.messages === 'string' 
          ? JSON.parse(notification.messages || '[]') 
          : []);
      
      // Usa updatedAt o un'altra proprietà per verificare se la notifica è stata effettivamente aggiornata
      const hasNewMessage = notification.lastUpdated !== lastNotificationRef.current.lastUpdated;
      
      // Se c'è una differenza significativa o è un nuovo messaggio, aggiorna
      if (hasNewMessage || (currentMessages.length !== parsedMessages.length)) {
        updateMessagesFromNotification();
        
        // Aggiorna anche il timestamp di lastUpdated per il prossimo confronto
        lastNotificationRef.current = {
          notificationId: notification.notificationId,
          lastUpdated: notification.lastUpdated || Date.now(),
          isReadByUser: notification.isReadByUser || hasMarkedAsReadLocally
        };
      }
    }
    
    // Note: We're not returning anything from this effect since we don't need cleanup
  }, [notification, updateMessagesFromNotification, parsedMessages.length]);
  
  // Effetto per aggiornare dopo l'invio di un messaggio
  useEffect(() => {
    if (lastMessageSentTime && notification?.notificationId) {
      // Aggiorna i messaggi dal server dopo un breve ritardo (solo una volta)
      if (messageUpdateTimeoutRef.current) {
        clearTimeout(messageUpdateTimeoutRef.current);
      }
      
      messageUpdateTimeoutRef.current = setTimeout(() => {
        forceUpdateFromServer();
        setLastMessageSentTime(null);
        messageUpdateTimeoutRef.current = null;
      }, 800); // Aumentato per dare più tempo al server
      
      return () => {
        if (messageUpdateTimeoutRef.current) {
          clearTimeout(messageUpdateTimeoutRef.current);
          messageUpdateTimeoutRef.current = null;
        }
      };
    }
  }, [lastMessageSentTime, notification?.notificationId, forceUpdateFromServer]);
  
  // Forza l'aggiornamento quando cambia il contatore (una sola volta)
  useEffect(() => {
    if (forceUpdateCounter > 0 && notification?.notificationId && !isUpdating) {
      // Usa setTimeout per evitare loop e dare tempo al server di elaborare
      const timerId = setTimeout(() => {
        forceUpdateFromServer();
      }, 800);
      
      return () => clearTimeout(timerId);
    }
  }, [forceUpdateCounter, notification?.notificationId, isUpdating, forceUpdateFromServer]);
  
  // Separate effect for initial position/size loading
  useEffect(() => {
    if (windowManager && notification && !initialLoaded) {
      const windowId = notification.notificationId;
      const windowState = windowManager.windowStates?.[windowId];
      
      if (windowState) {
        // Initialize position and size from window manager
        setPosition({ 
          x: windowState.x !== undefined ? windowState.x : initialX, 
          y: windowState.y !== undefined ? windowState.y : initialY
        });
        
        setSize({ 
          width: windowState.width || 900, 
          height: windowState.height || 700 
        });
        
        // Aggiorna anche il riferimento alle dimensioni
        sizeRef.current = { 
          width: windowState.width || 900, 
          height: windowState.height || 700 
        };
        
        // Set minimized and maximized states
        setIsMinimized(windowState.isMinimized || false);
        setIsMaximized(windowState.isMaximized || false);
        
        setInitialLoaded(true);
      }
      
      // Set z-index and activate window
      if (windowManager.getZIndex) {
        setZIndex(windowManager.getZIndex(windowId));
      }
      
      if (windowManager.activateWindow) {
        windowManager.activateWindow(windowId);
      }
    }
  }, [windowManager, notification, initialX, initialY, initialLoaded]);
  
// Separate effect for state changes from window manager
useEffect(() => {
  if (windowManager && notification && initialLoaded) {
    const windowId = notification.notificationId;
    const windowState = windowManager.windowStates?.[windowId];
    
    if (windowState) {
      // Only update minimized and maximized states from window manager
      setIsMinimized(windowState.isMinimized || false);
      setIsMaximized(windowState.isMaximized || false);
      
      // Update z-index
      if (windowManager.getZIndex) {
        setZIndex(windowManager.getZIndex(windowId));
      }
      
      // Only update position if not currently dragging and not updated by user
      if (!isDraggingRef.current && !positionUpdatedByUserRef.current) {
        setPosition({ 
          x: windowState.x !== undefined ? windowState.x : initialX, 
          y: windowState.y !== undefined ? windowState.y : initialY
        });
      }
      
      // Only update size if not currently resizing and not updated by user
      if (!isResizing && !sizeUpdatedByUserRef.current) {
        setSize({ 
          width: windowState.width || 900, 
          height: windowState.height || 700 
        });
        
        sizeRef.current = {
          width: windowState.width || 900, 
          height: windowState.height || 700
        };
      }
    }
  }
}, [windowManager, notification, initialX, initialY, initialLoaded, isResizing]);
  
  // MODIFICA: rimuovo il listener di scroll esistente e aggiungo uno che rispetta lo scrolling manuale
  useEffect(() => {
    if (chatListRef.current) {
      const handleScroll = () => {
        if (scrollingToBottomRef.current) {
          // Se stiamo scrollando programmicamente al fondo, ignora questo evento
          return;
        }
  
        const { scrollTop, scrollHeight, clientHeight } = chatListRef.current;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        
        // Se l'utente ha scrollato verso l'alto (almeno 100px dal fondo)
        if (distanceFromBottom > 100) {
          userHasScrolledRef.current = true;
        } 
        // Se l'utente è tornato al fondo
        else if (distanceFromBottom < 20) {
          userHasScrolledRef.current = false;
        }
      };
  
      // Aggiungi l'event listener per lo scroll
      chatListRef.current.addEventListener('scroll', handleScroll, { passive: true });
      
      // Aggiungi anche un listener specifico per il wheel per catturare più efficacemente
      // quando l'utente sta scrollando attivamente
      const handleWheel = (e) => {
        // Se l'utente sta scrollando verso l'alto con la rotella del mouse
        if (e.deltaY < 0) {
          userHasScrolledRef.current = true;
        }
      };
      
      chatListRef.current.addEventListener('wheel', handleWheel, { passive: true });
      
      return () => {
        // Clean up
        if (chatListRef.current) {
          chatListRef.current.removeEventListener('scroll', handleScroll);
          chatListRef.current.removeEventListener('wheel', handleWheel);
        }
      };
    }
  }, [chatListRef?.current]);
  
 
  useEffect(() => {
    // Implementazione semplificata che esegue solo lo scroll iniziale
    if (parsedMessages.length > 0 && !initialScrollDone) {
     
      // Timeout per assicurarsi che la chat sia completamente renderizzata
      setTimeout(() => {
        if (chatListRef?.current) {
          chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
          setInitialScrollDone(true);
        }
      }, 500);
    }
    
    // Manteniamo comunque aggiornato il riferimento per compatibilità
    prevMessagesRef.current = [...parsedMessages];
  }, [parsedMessages, initialScrollDone]);
  
  useEffect(() => {
    isMountedRef.current = true;
    
    // Funzione per gestire tutti gli eventi di aggiornamento relativi alle chat
    const handleChatUpdate = (event) => {
      // Ignora gli eventi se il componente è stato smontato
      if (!isMountedRef.current) return;
      
      const eventType = event.type;
      const detail = event.detail || {};
      
      // Estrai l'ID notifica dall'evento
      const eventNotificationId = detail.notificationId;
      
      // Se l'evento non è per questa chat, ignoralo
      if (eventNotificationId && notification && parseInt(eventNotificationId) !== parseInt(notification.notificationId)) {
        return;
      }
      
      // Imposta un flag per evitare aggiornamenti troppo frequenti
      if (updateInProgressRef.current) {
        updateQueuedRef.current = true;
        return;
      }
      
      updateInProgressRef.current = true;
      
      // Usa requestAnimationFrame per assicurarsi che il reducer sia completato
      requestAnimationFrame(() => {
        // Usa setTimeout per un ulteriore livello di sicurezza
        setTimeout(() => {
          forceUpdateFromServer()
            .finally(() => {
              if (!isMountedRef.current) return;
              
              updateInProgressRef.current = false;
              
              // Se ci sono aggiornamenti in coda, eseguili
              if (updateQueuedRef.current) {
                updateQueuedRef.current = false;
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    if (isMountedRef.current) {
                      forceUpdateFromServer();
                    }
                  }, 0);
                });
              }
            });
        }, 0);
      });
    };
    
    // Aggiungi il listener per l'evento
    document.addEventListener('notification-updated', handleChatUpdate);
    
    // Pulizia del listener
    return () => {
      document.removeEventListener('notification-updated', handleChatUpdate);
    };
  }, [notification, forceUpdateFromServer]);

  // Pulizia quando il componente viene smontato
  useEffect(() => {
    return () => {
      // Pulisci eventuali timeout
      if (messageUpdateTimeoutRef.current) {
        clearTimeout(messageUpdateTimeoutRef.current);
        messageUpdateTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
  const handleWindowResize = () => {
    // Resetta i flag di controllo per consentire l'adattamento automatico
    positionUpdatedByUserRef.current = false;
    sizeUpdatedByUserRef.current = false;
  };
  
  window.addEventListener('resize', handleWindowResize);
  
  return () => {
    window.removeEventListener('resize', handleWindowResize);
  };
}, []);
  
  
  const handleLeaveChat = useCallback(async (notificationId) => {
    if (!notification || !notificationId) return;
    
    try {
      // Mostra un indicatore di caricamento
      swal.fire({
        title: 'Abbandono in corso...',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          swal.showLoading();
        }
      });
      
      const result = await leaveChat(notificationId);
      
      if (result) {
        // Importante: Ricarica i dati aggiornati della chat
        await fetchNotificationById(notificationId);
        
        // Aggiorna lo stato locale
        setHasLeftChat(true);
        
        // Mostra un messaggio di conferma
        swal.fire({
          title: 'Chat abbandonata',
          text: 'Hai abbandonato questa conversazione',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        
        // Emetti un evento per notificare altri componenti
        document.dispatchEvent(new CustomEvent('chat-status-changed', {
          detail: { 
            notificationId,
            action: 'left',
            timestamp: new Date().getTime()
          }
        }));
      }
    } catch (error) {
      console.error('Errore nell\'abbandono della chat:', error);
      swal.fire({
        icon: 'error',
        title: 'Errore',
        text: error.message || 'Si è verificato un errore durante l\'abbandono della chat'
      });
    }
  }, [notification, fetchNotificationById, leaveChat]);

  const handleArchiveChat = useCallback(async () => {
    if (!notification?.notificationId) return;
    
    try {
    
      // Mostra un indicatore di caricamento
      swal.fire({
        title: 'Archiviazione in corso...',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          swal.showLoading();
        }
      });
      
      const result = await archiveChat(notification.notificationId);
      
      if (result && result.success) {
        // Importante: Ricarica i dati aggiornati della chat
        await fetchNotificationById(notification.notificationId);
        
        // Aggiorna lo stato locale
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
            notificationId: notification.notificationId,
            action: 'archived',
            timestamp: new Date().getTime()
          }
        }));
      } else {
        throw new Error(result?.message || 'Impossibile archiviare la chat');
      }
    } catch (error) {
      console.error('Error archiving chat:', error);
      swal.fire({
        icon: 'error',
        title: 'Errore',
        text: error.message || 'Si è verificato un errore durante l\'archiviazione'
      });
    }
  }, [notification, fetchNotificationById, archiveChat]);

  const handleUnarchiveChat = useCallback(async () => {
    if (!notification?.notificationId) return;
    
    try {
     
      // Mostra un indicatore di caricamento
      swal.fire({
        title: 'Rimozione dall\'archivio in corso...',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          swal.showLoading();
        }
      });
      
      const result = await unarchiveChat(notification.notificationId);
      
      if (result && result.success) {
        // Importante: Ricarica i dati aggiornati della chat
        await fetchNotificationById(notification.notificationId);
        
        // Aggiorna lo stato locale
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
            notificationId: notification.notificationId,
            action: 'unarchived',
            timestamp: new Date().getTime()
          }
        }));
      } else {
        throw new Error(result?.message || 'Impossibile rimuovere la chat dall\'archivio');
      }
    } catch (error) {
      console.error('Error unarchiving chat:', error);
      swal.fire({
        icon: 'error',
        title: 'Errore',
        text: error.message || 'Si è verificato un errore durante la rimozione dall\'archivio'
      });
    }
  }, [notification, fetchNotificationById, unarchiveChat]);

  useEffect(() => {
    // Gestore per aggiornamenti dello stato della chat
    const handleChatStatusChange = async (event) => {
      const { notificationId, action } = event.detail || {};
      
      // Verifica che questo evento sia per la chat corrente
      if (notificationId && notification && notificationId === notification.notificationId) {
    
        // Ricarica i dati aggiornati
        await fetchNotificationById(notificationId);
        
        // Aggiorna gli stati locali in base all'azione
        if (action === 'left') {
          setHasLeftChat(true);
        } else if (action === 'archived') {
          setIsArchived(true);
        } else if (action === 'unarchived') {
          setIsArchived(false);
        }
      }
    };
    
    // Aggiungi listener per l'evento
    document.addEventListener('chat-status-changed', handleChatStatusChange);
    
    // Pulizia del listener
    return () => {
      document.removeEventListener('chat-status-changed', handleChatStatusChange);
    };
  }, [notification, fetchNotificationById]);

  // Nel componente ChatWindow, aggiungo la funzione handleScrollToBottom
  const handleChatScrollToBottom = useCallback(() => {
    setHasNewMessages(false);
  }, []);

  // Modifica l'effetto dello scroll per gestire lo stato dei nuovi messaggi
  useEffect(() => {
    if (chatListRef.current) {
      const handleScroll = () => {
        if (scrollingToBottomRef.current) {
          return;
        }
  
        const { scrollTop, scrollHeight, clientHeight } = chatListRef.current;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        
        // Se l'utente ha scrollato verso l'alto (almeno 100px dal fondo)
        if (distanceFromBottom > 100) {
          userHasScrolledRef.current = true;
        } 
        // Se l'utente è tornato al fondo
        else if (distanceFromBottom < 20) {
          userHasScrolledRef.current = false;
          setHasNewMessages(false);
        }
      };
  
      chatListRef.current.addEventListener('scroll', handleScroll, { passive: true });
      
      const handleWheel = (e) => {
        if (e.deltaY < 0) {
          userHasScrolledRef.current = true;
        }
      };
      
      chatListRef.current.addEventListener('wheel', handleWheel, { passive: true });
      
      return () => {
        if (chatListRef.current) {
          chatListRef.current.removeEventListener('scroll', handleScroll);
          chatListRef.current.removeEventListener('wheel', handleWheel);
        }
      };
    }
  }, [chatListRef?.current]);

  // Aggiorna il titolo ogni volta che la notifica cambia
  useEffect(() => {
    if (notification && notification.title) {
      setChatTitle(notification.title);
    }
  }, [notification]);

  // Listener per l'aggiornamento del titolo della chat
  useEffect(() => {
    const handleTitleUpdate = (event) => {
      const { notificationId, newTitle } = event.detail;
      
      // Verifica che l'evento sia per questa chat
      if (notificationId && notification && notification.notificationId === parseInt(notificationId)) {
        // Aggiorna il titolo locale
        setChatTitle(newTitle);
        
        // Aggiorna anche il titolo nel windowManager se necessario
        if (windowManager && typeof windowManager.updateTitle === 'function') {
          windowManager.updateTitle(notificationId, newTitle);
        }
      }
    };
    
    // Aggiungi l'event listener
    document.addEventListener('chat-title-updated', handleTitleUpdate);
    
    // Pulizia
    return () => {
      document.removeEventListener('chat-title-updated', handleTitleUpdate);
    };
  }, [notification, windowManager]);

  // Don't render anything if component is unmounted or window is minimized
  if (!notification || isMinimized) {
    return null;
  }
  
  // Window content - same for maximized and normal mode
  const windowContent = (
    <div className="flex flex-col w-full h-full bg-white overflow-hidden">
      {/* Use the drag handle on the top bar */}
      <div 
        className={`${isStandalone ? '' : 'chat-window-handle cursor-move'}`}
        ref={dragHandleRef}
        onMouseDown={isStandalone ? null : handleDragStart}
      >
        <ChatTopBar 
          title={chatTitle}
          setTitle={setChatTitle}
          closeChat={handleClose}
          onMinimize={handleMinimize}
          onMaximize={isStandalone ? null : handleMaximize} // Disabilita per standalone
          isMaximized={isMaximized}
          membersInfo={parsedMembersInfo}
          users={getFilteredUsers()}
          currentUser={getCurrentUser()}
          notificationId={notification.notificationId}
          notificationCategoryId={notification.notificationCategoryId}
          notificationCategoryName={notification.notificationCategoryName}
          hexColor={notification.hexColor}
          tbCreated={notification.tbCreated}
          hasLeftChat={hasLeftChat}
          isArchived={isArchived}
          receiversList={receiversList}
          updateReceiversList={handleReceiversUpdate}
          leaveChat={handleLeaveChat}       
          archiveChat={handleArchiveChat}   
          unarchiveChat={handleUnarchiveChat}
          isStandalone={isStandalone} // Passa la prop isStandalone
        />
      </div>
      
      {/* Chat content area */}
      <div className="flex-1 overflow-hidden">
        <ChatLayout 
          messages={parsedMessages}
          sending={sending}
          notificationId={notification.notificationId}
          isReadByUser={notification.isReadByUser}
          markMessageAsRead={toggleReadUnread}
          chatListRef={chatListRef}
          membersInfo={parsedMembersInfo}
          users={getFilteredUsers()}
          currentUser={getCurrentUser()}
          updateReceiversList={handleReceiversUpdate}
          receivers={receiversList}
          onReply={handleReply}
          title={notification.title}
          createdAt={notification.tbCreated}
          notificationCategoryId={notification.notificationCategoryId}
          notificationCategoryName={notification.notificationCategoryName}
          hexColor={notification.hexColor}
          hasLeftChat={hasLeftChat}
          hasNewMessages={hasNewMessages}
          onScrollToBottom={handleChatScrollToBottom}
          replyToMessage={replyToMessage}
          setReplyToMessage={setReplyToMessage}
          setSending={setSending}
          onSend={handleSendMessage}
          responseOptions={responseOptions || []}
          uploadNotificationAttachment={uploadNotificationAttachment}
          captureAndUploadPhoto={captureAndUploadPhoto}
        />
      </div>
    </div>
  );
  
  // Render window based on isStandalone mode
  if (isStandalone) {
    // Standalone mode - full screen without Resizable
    return (
      <div 
        ref={nodeRef}
        className="chat-window standalone-chat"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          boxShadow: 'none',
          border: 'none',
          borderRadius: 0
        }}
      >
        {windowContent}
      </div>
    );
  }
  
  // Render maximized window
  if (isMaximized) {
    return (
      <div 
        className="fixed inset-0 z-[1100] bg-white"
        ref={windowRef}
        onClick={handleActivate}
      >
        {windowContent}
      </div>
    );
  }

  // Render normal draggable and resizable window
  return (
    <div
      ref={nodeRef}
      className="chat-window"
      style={{
        position: 'absolute',
        top: position.y,
        left: position.x,
        width: size.width,
        height: size.height,
        zIndex: zIndex,
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
    >
      <Resizable
        size={size}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeStop={handleResizeStop}
        minWidth={400}
        minHeight={350}
        maxWidth="95vw"
        maxHeight="95vh"
        enable={{
          top: true,
          right: true,
          bottom: true,
          left: true,
          topRight: true,
          bottomRight: true,
          bottomLeft: true,
          topLeft: true
        }}
        handleStyles={{
          topRight: { cursor: 'ne-resize' },
          bottomRight: { cursor: 'se-resize' },
          bottomLeft: { cursor: 'sw-resize' },
          topLeft: { cursor: 'nw-resize' }
        }}
        handleWrapperStyle={{ opacity: 1 }}
        resizeRatio={1}
      >
        <div 
          className="absolute overflow-hidden rounded-lg"
          onClick={handleActivate}
          style={{
            width: '100%',
            height: '100%',
            zIndex: zIndex,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            border: '1px solid #e5e7eb',
            transition: 'box-shadow 0.2s ease, border-color 0.2s ease'
          }}
        >
          {windowContent}
        </div>
      </Resizable>
    </div>
  );
};

export default ChatWindow;