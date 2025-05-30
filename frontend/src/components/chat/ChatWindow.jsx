// src/components/chat/ChatWindow.jsx
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Resizable } from "re-resizable";
import ChatTopBar from "./ChatTopBar";
import ChatLayout from "./ChatLayout";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import { debounce } from "lodash";
import { swal } from "@/lib/common";
import { useDispatch, useSelector } from "react-redux";
import { 
 selectOpenChatData, 
 setOpenChatData 
} from "@/redux/features/notifications/notificationsSlice";
import { loadMoreMessages } from "@/redux/features/notifications/notificationsActions";

// Variabile globale per tenere traccia dell'ultimo aggiornamento
let lastUpdateTime = 0;

const debouncedForceUpdate = debounce(
 (func) => {
   func();
 },
 1000,
 { leading: true, trailing: false },
);

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
   return (
     !usersLoadedRef.current ||
     Date.now() - lastUsersFetchTimeRef.current > MIN_FETCH_INTERVAL
   );
 }, []);

 return {
   users: getUsers(),
   updateUsers,
   shouldFetchUsers,
   usersLoaded: usersLoadedRef.current,
 };
};

// Main ChatWindow component
const ChatWindow = ({
 notification,
 onClose,
 onMinimize,
 windowManager,
 isStandalone = false,
 standaloneData = null,
}) => {
 const dispatch = useDispatch();
 
 // NUOVO: Usa openChatData invece di notification diretta
 const openChatData = useSelector(state => 
   selectOpenChatData(state, notification?.notificationId)
 );
 
 // NUOVO: Usa openChatData se disponibile, altrimenti notification
 const currentNotification = useMemo(() => 
   openChatData || notification, 
   [openChatData, notification]
 );

 const {
   toggleReadUnread,
   fetchNotificationById,
   sendNotification,
   users: hookUsers,
   responseOptions: hookResponseOptions,
   fetchUsers,
   fetchResponseOptions,
   registerOpenChat,
   unregisterOpenChat,
   leaveChat,
   archiveChat,
   unarchiveChat,
   uploadNotificationAttachment,
   captureAndUploadPhoto,
   reopenChat,
   closeChat,
   notifications,
   loadMoreMessages: loadMoreMessagesHook,
 } = useNotifications();

 // Aggiungo lo stato per il titolo della chat
 const [chatTitle, setChatTitle] = useState(currentNotification?.title || "");

 // Usa i dati standalone se disponibili, altrimenti usa quelli dall'hook
 const users = useMemo(() => 
   isStandalone && standaloneData?.users ? standaloneData.users : hookUsers,
   [isStandalone, standaloneData?.users, hookUsers]
 );
 
 const responseOptions = useMemo(() =>
   isStandalone && standaloneData?.responseOptions
     ? standaloneData.responseOptions
     : hookResponseOptions,
   [isStandalone, standaloneData?.responseOptions, hookResponseOptions]
 );

 const windowRef = useRef(null);
 const nodeRef = useRef(null);
 const dragHandleRef = useRef(null);
 const isDraggingRef = useRef(false);
 const sizeRef = useRef({ width: 900, height: 700 });
 const lastNotificationRef = useRef(null);
 const messageUpdateTimeoutRef = useRef(null);
 const chatListRef = useRef(null);
 const prevMessagesRef = useRef([]);

 // Nuovi ref per gestire lo scrolling
 const userHasScrolledRef = useRef(false);
 const scrollingToBottomRef = useRef(false);

 // IMPORTANT: Calculate initial position under the header - not at bottom of page
 const initialX = Math.max(0, Math.floor((window.innerWidth - 900) / 2));
 const initialY = Math.max(0, Math.floor(20)); // Posizione più in alto, appena sotto l'header

 // Local state for window position and size tracking during drag/resize
 const [position, setPosition] = useState(() => {
   const x = Number(initialX);
   const y = Number(initialY);
   return {
     x: isNaN(x) ? 0 : x,
     y: isNaN(y) ? 0 : y
   };
 });
 const [size, setSize] = useState({ width: 900, height: 700 });
 const [isDragging, setIsDragging] = useState(false);
 const [isResizing, setIsResizing] = useState(false);
 const [isMinimized, setIsMinimized] = useState(false);
 const [isMaximized, setIsMaximized] = useState(false);
 const [zIndex, setZIndex] = useState(1000);
 const [hasLeftChat, setHasLeftChat] = useState(false);
 const [isArchived, setIsArchived] = useState(false);
 const [initialLoaded, setInitialLoaded] = useState(false);
 const [lastMessageSentTime, setLastMessageSentTime] = useState(null);
 const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
 const [isUpdating, setIsUpdating] = useState(false);
 const [sending, setSending] = useState(false);
 const [replyToMessage, setReplyToMessage] = useState(null);
 const [receiversList, setReceiversList] = useState("");
 const [fetchedNotifications, setFetchedNotifications] = useState([]);
 const [fetchedUsers, setFetchedUsers] = useState([]);
 const updateInProgressRef = useRef(false);
 const updateQueuedRef = useRef(false);
 const isMountedRef = useRef(true);
 const positionUpdatedByUserRef = useRef(false);
 const sizeUpdatedByUserRef = useRef(false);
 const [initialScrollDone, setInitialScrollDone] = useState(false);
 const lastMessageIdRef = useRef(null);
 const previousMessagesRef = useRef([]);
 const [hasNewMessages, setHasNewMessages] = useState(false);
 const lastDataUpdateRef = useRef(null);
 const lastInitializedNotificationRef = useRef(null);
 const hasInitialLoadCompleted = useRef(false);
 const [hasMoreMessages, setHasMoreMessages] = useState(true);
const [isLoadingMore, setIsLoadingMore] = useState(false);
 
 // Stato specifico per gli utenti della chat
 const [chatUsers, setChatUsers] = useState([]);
 const {
   users: memoizedUsers,
   updateUsers,
   shouldFetchUsers,
 } = useMemoizedUsers(standaloneData?.users || hookUsers);

 // MODIFICA: Stato per i messaggi - usa currentNotification invece di openChatData direttamente
 const [parsedMessages, setParsedMessages] = useState(() => {
   if (currentNotification?.messages) {
     return Array.isArray(currentNotification.messages)
       ? currentNotification.messages
       : JSON.parse(currentNotification.messages || "[]");
   }
   return [];
 });

 const [parsedMembersInfo, setParsedMembersInfo] = useState([]);
 const [isLoadingComplete, setIsLoadingComplete] = useState(false);

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
     console.error("Errore nel caricamento degli utenti:", error);
   }
 }, [fetchUsers, shouldFetchUsers, updateUsers]);

 // Effetto per il caricamento iniziale dei dati
 useEffect(() => {
   if (!notification?.notificationId || hasInitialLoadCompleted.current) return;
   
   // Verifica se abbiamo già dati completi
   const existingData = openChatData || currentNotification;
   const hasFullData = existingData?.lastFullUpdate && 
                      Date.now() - existingData.lastFullUpdate < 60000;
   
   if (!hasFullData && !isLoadingComplete) {
     console.log(`🔄 ChatWindow: Richiesta caricamento completo per chat ${notification.notificationId}`);
     setIsLoadingComplete(true);
     hasInitialLoadCompleted.current = true;
     
     // Forza caricamento completo una sola volta
     forceUpdateFromServer(true)
       .then(() => {
         console.log(`✅ ChatWindow: Dati completi caricati per chat ${notification.notificationId}`);
       })
       .finally(() => {
         setIsLoadingComplete(false);
       });
   }
 }, [notification?.notificationId]);

 // funzione callback per gestire il caricamento di più messaggi:
const handleLoadMoreMessages = useCallback(async () => {
  if (!notification?.notificationId) return null;
  
  // Trova il messaggio più vecchio attualmente caricato
  const oldestMessage = parsedMessages.length > 0 
    ? parsedMessages.reduce((oldest, current) => 
        new Date(oldest.tbCreated) < new Date(current.tbCreated) ? oldest : current
      )
    : null;
    
  if (!oldestMessage) return null;
  
  try {
    console.log(`📜 ChatWindow: Caricando messaggi precedenti per chat ${notification.notificationId}`);
    
    // Se abbiamo loadMoreMessagesHook dall'hook, usalo
    if (loadMoreMessagesHook) {
      const result = await loadMoreMessagesHook({
        notificationId: notification.notificationId,
        lastMessageId: oldestMessage.messageId,
        pageSize: 25
      });
      
      if (result && result.newMessages) {
        // Aggiungi i nuovi messaggi all'inizio mantenendo l'ordine cronologico
        setParsedMessages(prevMessages => {
          const existingIds = new Set(prevMessages.map(m => m.messageId));
          const uniqueNewMessages = result.newMessages.filter(m => !existingIds.has(m.messageId));
          
          // Combina e ordina per data crescente (più vecchi prima)
          const combined = [...uniqueNewMessages, ...prevMessages];
          return combined.sort((a, b) => new Date(a.tbCreated) - new Date(b.tbCreated));
        });
        
        return {
          hasMore: result.hasMoreMessages,
          loadedCount: result.newMessages.length
        };
      }
    } else {
      // Fallback: usa dispatch diretto
      const result = await dispatch(loadMoreMessages({
        notificationId: notification.notificationId,
        lastMessageId: oldestMessage.messageId,
        pageSize: 25
      })).unwrap();
      
      if (result && result.newMessages) {
        setParsedMessages(prevMessages => {
          const existingIds = new Set(prevMessages.map(m => m.messageId));
          const uniqueNewMessages = result.newMessages.filter(m => !existingIds.has(m.messageId));
          
          const combined = [...uniqueNewMessages, ...prevMessages];
          return combined.sort((a, b) => new Date(a.tbCreated) - new Date(b.tbCreated));
        });
        
        return {
          hasMore: result.hasMoreMessages,
          loadedCount: result.newMessages.length
        };
      }
    }
  } catch (error) {
    console.error("Errore nel caricamento dei messaggi precedenti:", error);
    return null;
  }
}, [notification?.notificationId, parsedMessages, loadMoreMessagesHook, dispatch]);

// effetto per inizializzare hasMoreMessages:
useEffect(() => {
  if (currentNotification) {
    const totalCount = currentNotification.totalMessageCount || 
                      currentNotification.messageCount || 0;
    const currentCount = parsedMessages.length;
    
    setHasMoreMessages(currentCount < totalCount);
  }
}, [currentNotification, parsedMessages.length]);

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
     ? usersToFilter.filter((user) => user && !user.userDisabled)
     : [];
 }, [chatUsers, memoizedUsers]);

 // Funzione di utilità per trovare l'utente corrente in modo sicuro
 const getCurrentUser = useCallback(() => {
   const usersToSearch = chatUsers.length > 0 ? chatUsers : memoizedUsers;
   return Array.isArray(usersToSearch)
     ? usersToSearch.find((user) => user && user.isCurrentUser)
     : null;
 }, [chatUsers, memoizedUsers]);

 // IMPORTANT: Define handler functions with useCallback at the component's top level
 const handleMaximize = useCallback(() => {
   if (
     windowManager &&
     windowManager.toggleMaximize &&
     notification?.notificationId
   ) {
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

 // MODIFICA: updateMessagesFromNotification per usare openChatData
 const updateMessagesFromNotification = useCallback(() => {
   if (!currentNotification || !isMountedRef.current) return;

   try {
     const messages = Array.isArray(currentNotification.messages)
       ? currentNotification.messages
       : typeof currentNotification.messages === "string"
         ? JSON.parse(currentNotification.messages || "[]")
         : [];

     setParsedMessages(messages);

     // Gestisci scroll
     const hasNewMessages = messages.length > previousMessagesRef.current.length;
     
     if (hasNewMessages && !userHasScrolledRef.current) {
       scrollingToBottomRef.current = true;
       setTimeout(() => {
         if (chatListRef.current && isMountedRef.current) {
           chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
           setTimeout(() => {
             scrollingToBottomRef.current = false;
           }, 500);
         }
       }, 100);
     }

     previousMessagesRef.current = messages;

     // Aggiorna altri stati
     const membersInfo = Array.isArray(currentNotification.membersInfo)
       ? currentNotification.membersInfo
       : typeof currentNotification.membersInfo === "string"
         ? JSON.parse(currentNotification.membersInfo || "[]")
         : [];
     setParsedMembersInfo(membersInfo);

     setHasLeftChat(
       currentNotification.chatLeft === 1 ||
       currentNotification.chatLeft === true,
     );
     setIsArchived(
       currentNotification.archived === 1 ||
       currentNotification.archived === true,
     );

   } catch (err) {
     console.error("Errore nell'aggiornamento dei messaggi:", err);
   }
 }, [currentNotification]);

 // Funzione per aggiornare la lista dei destinatari
 const handleReceiversUpdate = useCallback((updatedList) => {
   setReceiversList(updatedList);
 }, []);

 const forceUpdateFromServer = useCallback(async (forceComplete = false) => {
  if (!notification?.notificationId || isUpdating || !fetchNotificationById)
    return;

  if (!forceComplete && Date.now() - lastUpdateTime < 5000) {
    debouncedForceUpdate(() => forceUpdateFromServer(forceComplete));
    return;
  }

  lastUpdateTime = Date.now();
  setIsUpdating(true);

  try {
    const updatedNotification = await fetchNotificationById(
      notification.notificationId,
      true
    );

    if (updatedNotification) {
      console.log(`🔄 ChatWindow: Aggiornati messaggi per chat ${notification.notificationId}`);
      
      dispatch(setOpenChatData({
        notificationId: notification.notificationId,
        data: {
          ...updatedNotification,
          lastFullUpdate: Date.now(),
          _forceComplete: forceComplete
        }
      }));
    }
  } catch (error) {
    console.error("Errore durante l'aggiornamento forzato:", error);
  } finally {
    setIsUpdating(false);
  }
}, [notification, fetchNotificationById, isUpdating, dispatch]);

 // Funzione per inviare un messaggio
 const handleSendMessage = useCallback(
   async (notificationData) => {
     if (!notification?.notificationId || !sendNotification) return;

     try {
       const wasReplyingTo = replyToMessage;
       setSending(true);

       const currentUser = users?.find((user) => user?.isCurrentUser);

       const tempMessage = {
         messageId: `temp_${Date.now()}`,
         message: notificationData.message,
         senderId: currentUser?.userId || 0,
         senderName: currentUser
           ? `${currentUser.firstName} ${currentUser.lastName}`
           : "Tu",
         selectedUser: "1",
         tbCreated: new Date().toISOString(),
         replyToMessageId: notificationData.replyToMessageId || 0,
       };

       setParsedMessages((prev) => [...prev, tempMessage]);

       scrollingToBottomRef.current = true;

       setTimeout(() => {
         if (chatListRef.current) {
           chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
           userHasScrolledRef.current = false;
         }

         setTimeout(() => {
           scrollingToBottomRef.current = false;
         }, 500);
       }, 50);

       const result = await sendNotification(notificationData);

       if (result) {
         if (wasReplyingTo) {
           setReplyToMessage(null);
         }

         setLastMessageSentTime(Date.now());
         setForceUpdateCounter((prev) => prev + 1);

         if (messageUpdateTimeoutRef.current) {
           clearTimeout(messageUpdateTimeoutRef.current);
         }

         messageUpdateTimeoutRef.current = setTimeout(() => {
          forceUpdateFromServer(true); // Forza caricamento completo
        
          document.dispatchEvent(
            new CustomEvent("chat-message-sent", {
              detail: {
                notificationId: notificationData.notificationId,
                messageId: result.messageId || tempMessage.messageId,
                isFromCurrentUser: true,
              },
            }),
          );
        
          document.dispatchEvent(new CustomEvent("refreshNotifications"));
        
          messageUpdateTimeoutRef.current = null;
        }, 300);
       }

       return result;
     } catch (error) {
       console.error("Errore durante l'invio del messaggio:", error);
       setParsedMessages((prev) =>
         prev.filter((msg) => !msg.messageId.toString().startsWith("temp_")),
       );
       throw error;
     } finally {
       setSending(false);
     }
   },
   [
     notification,
     sendNotification,
     replyToMessage,
     users,
     forceUpdateFromServer,
   ],
 );

 // NUOVO: Effect ottimizzato per gestire aggiornamenti di openChatData
 useEffect(() => {
   if (!openChatData) return;
   
   // Usa timestamp per evitare aggiornamenti ridondanti
   const currentDataTimestamp = openChatData.lastFullUpdate || 0;
   
   // Solo se i dati sono effettivamente nuovi E non abbiamo già processato questo update
   if (currentDataTimestamp > 0 && 
       (!lastDataUpdateRef.current || currentDataTimestamp > lastDataUpdateRef.current)) {
     
     lastDataUpdateRef.current = currentDataTimestamp;
     
     // Aggiorna i messaggi solo se sono effettivamente cambiati
     const messages = Array.isArray(openChatData.messages)
       ? openChatData.messages
       : typeof openChatData.messages === "string"
         ? JSON.parse(openChatData.messages || "[]")
         : [];
     
     // Usa una comparazione più efficiente
     if (messages.length !== parsedMessages.length || 
         (messages.length > 0 && parsedMessages.length > 0 && 
          messages[0].messageId !== parsedMessages[0].messageId)) {
       setParsedMessages(messages);
     }

     // IMPORTANTE: Aggiorna hasMoreMessages basandoti sul conteggio totale
    const totalCount = openChatData.totalMessageCount || openChatData.messageCount || 0;
    setHasMoreMessages(messages.length < totalCount);
     
     // Aggiorna altri stati solo se necessario
     const membersInfo = Array.isArray(openChatData.membersInfo)
       ? openChatData.membersInfo
       : typeof openChatData.membersInfo === "string"
         ? JSON.parse(openChatData.membersInfo || "[]")
         : [];
     
     setParsedMembersInfo(membersInfo);
     
     // Aggiorna stati booleani solo se cambiati
     const newHasLeftChat = openChatData.chatLeft === 1 || openChatData.chatLeft === true;
     const newIsArchived = openChatData.archived === 1 || openChatData.archived === true;
     
     if (newHasLeftChat !== hasLeftChat) setHasLeftChat(newHasLeftChat);
     if (newIsArchived !== isArchived) setIsArchived(newIsArchived);
   }
 }, [openChatData?.lastFullUpdate]); // Dipende solo dal timestamp, non dall'intero oggetto

 // AGGIUNGI anche questo effetto per gestire il caricamento iniziale
 useEffect(() => {
   // Se non abbiamo openChatData ma abbiamo notification, inizializza
   if (!openChatData && notification?.notificationId) {
     const messages = Array.isArray(notification.messages)
       ? notification.messages
       : typeof notification.messages === "string"
         ? JSON.parse(notification.messages || "[]")
         : [];
     
     if (messages.length > 0 && parsedMessages.length === 0) {
       setParsedMessages(messages);
     }
     
     const membersInfo = Array.isArray(notification.membersInfo)
       ? notification.membersInfo
       : typeof notification.membersInfo === "string"
         ? JSON.parse(notification.membersInfo || "[]")
         : [];
     
     setParsedMembersInfo(membersInfo);
     setHasLeftChat(notification.chatLeft === 1 || notification.chatLeft === true);
     setIsArchived(notification.archived === 1 || notification.archived === true);
   }
 }, [notification?.notificationId, openChatData]);

 // NUOVO: Effect per gestire reload-open-chat
 useEffect(() => {
  const handleReloadOpenChat = async (event) => {
    const { notificationId: eventNotificationId, forceComplete } = event.detail;
    
    if (eventNotificationId === parseInt(notification.notificationId)) {
      console.log(`Ricaricando dati completi per chat ${notification.notificationId}...`);
      
      try {
        // Forza il ricaricamento completo con openChat=1
        const fullData = await fetchNotificationById(notification.notificationId, true);
        if (fullData) {
          console.log(`Dati completi ricaricati per chat ${notification.notificationId}:`, fullData);
          
          // Aggiorna i messaggi mantenendo quelli già caricati
          if (Array.isArray(fullData.messages)) {
            setParsedMessages(prevMessages => {
              const newMessages = [...prevMessages];
              fullData.messages.forEach(msg => {
                if (!newMessages.some(m => m.messageId === msg.messageId)) {
                  newMessages.push(msg);
                }
              });
              return newMessages.sort((a, b) => new Date(a.tbCreated) - new Date(b.tbCreated));
            });
          }
        }
      } catch (error) {
        console.error(`Errore nel ricaricamento per chat ${notification.notificationId}:`, error);
      }
    }
  };

  document.addEventListener("reload-open-chat", handleReloadOpenChat);
  
  return () => {
    document.removeEventListener("reload-open-chat", handleReloadOpenChat);
  };
}, [notification?.notificationId, fetchNotificationById]);

 // Effetto per gestire nuovi messaggi in arrivo
 useEffect(() => {
   const handleNewMessageEvent = async (event) => {
     if (!isMountedRef.current) return;

     const detail = event.detail || {};
     const eventNotificationId = detail.notificationId;

     if (
       eventNotificationId &&
       notification &&
       parseInt(eventNotificationId) === parseInt(notification.notificationId)
     ) {
       await forceUpdateFromServer();
     }
   };

   const events = [
     "chat-message-sent",
     "open-chat-new-message", 
     "new-message-received",
     "message-updated",
     "message-reaction-updated",
     "message-deleted"
   ];
   
   events.forEach(eventName => {
     document.addEventListener(eventName, handleNewMessageEvent);
   });

   return () => {
     events.forEach(eventName => {
       document.removeEventListener(eventName, handleNewMessageEvent);
     });
   };
 }, [notification, forceUpdateFromServer]);

 // Register chat as open
 useEffect(() => {
   if (notification?.notificationId) {
     registerOpenChat(notification.notificationId);

     return () => {
       unregisterOpenChat(notification.notificationId);
     };
   }
 }, [notification?.notificationId, registerOpenChat, unregisterOpenChat]);

 // Effect iniziale per segnare come letto
 useEffect(() => {
   if (notification?.notificationId && !notification.isReadByUser) {
     toggleReadUnread(notification.notificationId, true);
   }
 }, [notification?.notificationId]);

 // Gli altri effect rimangono gli stessi...
 // (continua con il resto del codice come nell'originale)

 const handleDragStart = useCallback(
   (e) => {
     const isHandleElement = e.target.closest(".chat-window-handle");
     if (!isHandleElement) {
       return;
     }

     if (e.type === "mousedown") {
       e.preventDefault();
     }

     setIsDragging(true);
     isDraggingRef.current = true;

     handleActivate();

     const startX = e.clientX;
     const startY = e.clientY;

     if (!nodeRef.current) {
       console.error(
         "nodeRef.current è null o non definito durante il trascinamento",
       );
       setIsDragging(false);
       isDraggingRef.current = false;
       return;
     }

     let startWindowX = position.x;
     let startWindowY = position.y;

     if (isNaN(startWindowX) || isNaN(startWindowY)) {
       const computedStyle = window.getComputedStyle(nodeRef.current);
       startWindowX = parseFloat(computedStyle.left);
       startWindowY = parseFloat(computedStyle.top);

       setPosition({
         x: startWindowX,
         y: startWindowY,
       });
     }

     const handleMouseMove = (moveEvent) => {
       if (!isDraggingRef.current || !nodeRef.current) return;

       const deltaX = moveEvent.clientX - startX;
       const deltaY = moveEvent.clientY - startY;

       const newX = startWindowX + deltaX;
       const newY = startWindowY + deltaY;

       const maxX = window.innerWidth - size.width;
       const maxY = window.innerHeight - size.height;

       const boundedX = Math.max(0, Math.min(newX, maxX));
       const boundedY = Math.max(0, Math.min(newY, maxY));

       if (!isNaN(boundedX) && !isNaN(boundedY)) {
         nodeRef.current.style.left = `${boundedX}px`;
         nodeRef.current.style.top = `${boundedY}px`;
       }
     };

     const handleMouseUp = () => {
       document.removeEventListener("mousemove", handleMouseMove);
       document.removeEventListener("mouseup", handleMouseUp);

       setIsDragging(false);
       isDraggingRef.current = false;

       positionUpdatedByUserRef.current = true;

       if (nodeRef.current) {
         const computedStyle = window.getComputedStyle(nodeRef.current);
         const leftValue = computedStyle.left;
         const topValue = computedStyle.top;

         let finalX = parseFloat(leftValue);
         let finalY = parseFloat(topValue);

         if (isNaN(finalX) || isNaN(finalY)) {
           console.warn(
             "Valori di posizione non validi dopo il trascinamento:",
             leftValue,
             topValue,
           );
           finalX = position.x;
           finalY = position.y;
         }

         setPosition({
           x: finalX,
           y: finalY,
         });

         if (
           windowManager &&
           windowManager.updatePosition &&
           notification?.notificationId
         ) {
           windowManager.updatePosition(
             notification.notificationId,
             finalX,
             finalY,
           );
         }

         setTimeout(() => {
           positionUpdatedByUserRef.current = false;
         }, 50);
       }
     };

     document.addEventListener("mousemove", handleMouseMove);
     document.addEventListener("mouseup", handleMouseUp);
   },
   [
     position,
     size.width,
     size.height,
     handleActivate,
     windowManager,
     notification,
   ],
 );

 const handleResizeStart = useCallback(() => {
   setIsResizing(true);
   handleActivate();
 }, [handleActivate]);

 const handleResize = useCallback((e, direction, ref, d) => {
   const newWidth = sizeRef.current.width + d.width;
   const newHeight = sizeRef.current.height + d.height;

   const maxWidth = window.innerWidth * 0.95;
   const maxHeight = window.innerHeight * 0.95;
   const minWidth = 400;
   const minHeight = 350;

   const constrainedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
   const constrainedHeight = Math.max(
     minHeight,
     Math.min(newHeight, maxHeight),
   );

   if (ref) {
     ref.style.width = `${constrainedWidth}px`;
     ref.style.height = `${constrainedHeight}px`;
   }

   setSize({
     width: constrainedWidth,
     height: constrainedHeight,
   });
 }, []);

 const handleResizeStop = useCallback(
   (e, direction, ref, d) => {
     setIsResizing(false);

     sizeUpdatedByUserRef.current = true;

     let finalWidth = ref
       ? parseFloat(ref.style.width)
       : sizeRef.current.width + d.width;
     let finalHeight = ref
       ? parseFloat(ref.style.height)
       : sizeRef.current.height + d.height;

     if (isNaN(finalWidth)) finalWidth = size.width + d.width;
     if (isNaN(finalHeight)) finalHeight = size.height + d.height;

     sizeRef.current = {
       width: finalWidth,
       height: finalHeight,
     };

     setSize({
       width: finalWidth,
       height: finalHeight,
     });

     if (
       windowManager &&
       windowManager.updateSize &&
       notification?.notificationId
     ) {
       windowManager.updateSize(
         notification.notificationId,
         finalWidth,
         finalHeight,
       );
     }
   },
   [size, windowManager, notification],
 );

 // Load users and response options when chat opens
 useEffect(() => {
   if (notification?.notificationId) {
     if (!fetchedUsers.includes(notification.notificationId) && fetchUsers) {
       fetchUsers();
       setFetchedUsers((prev) => [...prev, notification.notificationId]);
     }

     if (
       !fetchedNotifications.includes(notification.notificationId) &&
       fetchResponseOptions
     ) {
       fetchResponseOptions();
       setFetchedNotifications((prev) => [
         ...prev,
         notification.notificationId,
       ]);
     }
   }
 }, [
   notification,
   fetchUsers,
   fetchResponseOptions,
   fetchedNotifications,
   fetchedUsers,
 ]);

 // Separate effect for initial position/size loading
 useEffect(() => {
   if (windowManager && notification && !initialLoaded) {
     const windowId = notification.notificationId;
     const windowState = windowManager.windowStates?.[windowId];

     if (windowState) {
       setPosition({ 
         x: windowState.x !== undefined ? windowState.x : initialX, 
         y: windowState.y !== undefined ? windowState.y : initialY
       });

       setSize({
         width: windowState.width || 900,
         height: windowState.height || 700,
       });

       sizeRef.current = {
         width: windowState.width || 900,
         height: windowState.height || 700,
       };

       setIsMinimized(windowState.isMinimized || false);
       setIsMaximized(windowState.isMaximized || false);

       setInitialLoaded(true);
     }

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
       setIsMinimized(windowState.isMinimized || false);
       setIsMaximized(windowState.isMaximized || false);

       if (windowManager.getZIndex) {
         setZIndex(windowManager.getZIndex(windowId));
       }

       if (!isResizing && !sizeUpdatedByUserRef.current) {
         setSize({
           width: windowState.width || 900,
           height: windowState.height || 700,
         });

         sizeRef.current = {
           width: windowState.width || 900,
           height: windowState.height || 700,
         };
       }
     }
   }
 }, [
   windowManager,
   notification,
   initialX,
   initialY,
   initialLoaded,
   isResizing,
 ]);

 // Scroll handling
 useEffect(() => {
   if (chatListRef.current) {
     const handleScroll = () => {
       if (scrollingToBottomRef.current) {
         return;
       }

       const { scrollTop, scrollHeight, clientHeight } = chatListRef.current;
       const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

       if (distanceFromBottom > 100) {
         userHasScrolledRef.current = true;
       }
       else if (distanceFromBottom < 20) {
         userHasScrolledRef.current = false;
         setHasNewMessages(false);
       }
     };

     chatListRef.current.addEventListener("scroll", handleScroll, {
       passive: true,
     });

     const handleWheel = (e) => {
       if (e.deltaY < 0) {
         userHasScrolledRef.current = true;
       }
     };

     chatListRef.current.addEventListener("wheel", handleWheel, {
       passive: true,
     });

     return () => {
       if (chatListRef.current) {
         chatListRef.current.removeEventListener("scroll", handleScroll);
         chatListRef.current.removeEventListener("wheel", handleWheel);
       }
     };
   }
 }, [chatListRef?.current]);

 useEffect(() => {
   if (parsedMessages.length > 0 && !initialScrollDone) {
     setTimeout(() => {
       if (chatListRef?.current) {
         chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
         setInitialScrollDone(true);
       }
     }, 500);
   }

   prevMessagesRef.current = [...parsedMessages];
 }, [parsedMessages, initialScrollDone]);

 const handleLeaveChat = useCallback(
   async (notificationId) => {
     if (!notification || !notificationId) return;

     try {
       swal.fire({
         title: "Abbandono in corso...",
         allowOutsideClick: false,
         showConfirmButton: false,
         willOpen: () => {
           swal.showLoading();
         },
       });

       const result = await leaveChat(notificationId);

       if (result) {
         await fetchNotificationById(notificationId, true);
       
         setHasLeftChat(true);
       
         swal.fire({
           title: "Chat abbandonata",
           text: "Hai abbandonato questa conversazione",
           icon: "success",
           timer: 2000,
           showConfirmButton: false,
         });

         document.dispatchEvent(
           new CustomEvent("chat-status-changed", {
             detail: {
               notificationId,
               action: "left",
               timestamp: new Date().getTime(),
             },
           }),
         );
       }
     } catch (error) {
       console.error("Errore nell'abbandono della chat:", error);
       swal.fire({
         icon: "error",
         title: "Errore",
         text:
           error.message ||
           "Si è verificato un errore durante l'abbandono della chat",
       });
     }
   },
   [notification, fetchNotificationById, leaveChat],
 );

 const handleArchiveChat = useCallback(async () => {
   if (!notification?.notificationId) return;

   try {
     swal.fire({
       title: "Archiviazione in corso...",
       allowOutsideClick: false,
       showConfirmButton: false,
       willOpen: () => {
         swal.showLoading();
       },
     });

     const result = await archiveChat(notification.notificationId);

     if (result && result.success) {
       await fetchNotificationById(notification.notificationId, true);
     
       setIsArchived(true);
     
       swal.fire({
         icon: "success",
         title: "Chat archiviata",
         text: "La chat è stata archiviata con successo",
         timer: 2000,
         showConfirmButton: false,
       });

       document.dispatchEvent(
         new CustomEvent("chat-status-changed", {
           detail: {
             notificationId: notification.notificationId,
             action: "archived",
             timestamp: new Date().getTime(),
           },
         }),
       );
     } else {
       throw new Error(result?.message || "Impossibile archiviare la chat");
     }
   } catch (error) {
     console.error("Error archiving chat:", error);
     swal.fire({
       icon: "error",
       title: "Errore",
       text:
         error.message || "Si è verificato un errore durante l'archiviazione",
     });
   }
 }, [notification, fetchNotificationById, archiveChat]);

 const handleUnarchiveChat = useCallback(async () => {
   if (!notification?.notificationId) return;

   try {
     swal.fire({
       title: "Rimozione dall'archivio in corso...",
       allowOutsideClick: false,
       showConfirmButton: false,
       willOpen: () => {
         swal.showLoading();
       },
     });

     const result = await unarchiveChat(notification.notificationId);

     if (result && result.success) {
       await fetchNotificationById(notification.notificationId, true);
     
       setIsArchived(false);
     
       swal.fire({
         icon: "success",
         title: "Chat recuperata",
         text: "La chat è stata rimossa dall'archivio",
         timer: 2000,
         showConfirmButton: false,
       });

       document.dispatchEvent(
         new CustomEvent("chat-status-changed", {
           detail: {
             notificationId: notification.notificationId,
             action: "unarchived",
             timestamp: new Date().getTime(),
           },
         }),
       );
     } else {
       throw new Error(
         result?.message || "Impossibile rimuovere la chat dall'archivio",
       );
     }
   } catch (error) {
     console.error("Error unarchiving chat:", error);
     swal.fire({
       icon: "error",
       title: "Errore",
       text:
         error.message ||
         "Si è verificato un errore durante la rimozione dall'archivio",
     });
   }
 }, [notification, fetchNotificationById, unarchiveChat]);

 const handleChatScrollToBottom = useCallback(() => {
   setHasNewMessages(false);
 }, []);

 // funzione per gestire correttamente lo scroll iniziale:
useEffect(() => {
  // Scroll iniziale al fondo quando i messaggi sono caricati
  if (parsedMessages.length > 0 && !initialScrollDone && chatListRef.current) {
    setTimeout(() => {
      if (chatListRef.current) {
        chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
        setInitialScrollDone(true);
      }
    }, 100);
  }
}, [parsedMessages.length, initialScrollDone]);

 useEffect(() => {
   if (currentNotification && currentNotification.title) {
     setChatTitle(currentNotification.title);
   }
 }, [currentNotification]);

 useEffect(() => {
   const handleTitleUpdate = (event) => {
     const { notificationId, newTitle } = event.detail;

     if (
       notificationId &&
       notification &&
       notification.notificationId === parseInt(notificationId)
     ) {
       setChatTitle(newTitle);

       if (windowManager && typeof windowManager.updateTitle === "function") {
         windowManager.updateTitle(notificationId, newTitle);
       }
     }
   };

   document.addEventListener("chat-title-updated", handleTitleUpdate);

   return () => {
     document.removeEventListener("chat-title-updated", handleTitleUpdate);
   };
 }, [notification, windowManager]);

 const [isClosed, setIsClosed] = useState(currentNotification?.isClosed || false);

 if (!notification || isMinimized) {
   return null;
 }

 const windowContent = (
   <div className="flex flex-col w-full h-full bg-white overflow-hidden">
     <div
       className={`${isStandalone ? "" : "chat-window-handle cursor-move"}`}
       ref={dragHandleRef}
       onMouseDown={isStandalone ? null : handleDragStart}
     >
       <ChatTopBar
         title={chatTitle}
         setTitle={setChatTitle}
         closeChat={handleClose}
         onMinimize={handleMinimize}
         onMaximize={isStandalone ? null : handleMaximize}
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
         isStandalone={isStandalone}
       />
     </div>

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
         onScrollToBottom={handleChatScrollToBottom}
         replyToMessage={replyToMessage}
         setReplyToMessage={setReplyToMessage}
         setSending={setSending}
         onSend={handleSendMessage}
         responseOptions={responseOptions || []}
         uploadNotificationAttachment={uploadNotificationAttachment}
         captureAndUploadPhoto={captureAndUploadPhoto}
         isClosed={isClosed}
         closingUser_Name={notification.closingUser_Name}
         closingDate={notification.closingDate}

         onLoadMore={handleLoadMoreMessages}
          hasMoreMessages={hasMoreMessages}
          isLoadingMore={isLoadingMore}
          totalMessageCount={currentNotification?.totalMessageCount || currentNotification?.messageCount || parsedMessages.length}

         reopenChat={async () => {
           const res = await reopenChat(notification.notificationId);
           if (res) {
             const updatedNotification = await fetchNotificationById(
               notification.notificationId,
               true,
             );
             await new Promise((resolve) => setTimeout(resolve, 500));
             setIsClosed(updatedNotification?.isClosed || false);

             document.dispatchEvent(
               new CustomEvent("chat-status-changed", {
                 detail: {
                   notificationId: notification.notificationId,
                   action: "reopened",
                   timestamp: new Date().getTime(),
                 },
               }),
             );

             swal.fire({
               text: "Chat riaperta con successo",
               icon: "success",
               toast: true,
               position: "top-end",
               showConfirmButton: false,
               timer: 1500,
               timerProgressBar: true,
             });
           }
         }}
         closeChat={async () => {
           const res = await closeChat(notification.notificationId);
           if (res) {
             handleClose();
             swal.fire({
               text: "Chat chiusa con successo",
               icon: "success",
               toast: true,
               position: "top-end",
               showConfirmButton: false,
               timer: 1500,
               timerProgressBar: true,
             });
           }
         }}
       />
     </div>
   </div>
 );

 if (isStandalone) {
   return (
     <div
       ref={nodeRef}
       className="chat-window standalone-chat"
       style={{
         position: "fixed",
         top: 0,
         left: 0,
         width: "100vw",
         height: "100vh",
         zIndex: 9999,
         boxShadow: "none",
         border: "none",
         borderRadius: 0,
       }}
     >
       {windowContent}
     </div>
   );
 }

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

 return (
   <div
     ref={nodeRef}
     className="chat-window"
     style={{
       position: "absolute",
       top: position.y,
       left: position.x,
       width: size.width,
       height: size.height,
       zIndex: zIndex,
       cursor: isDragging ? "grabbing" : "auto",
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
         topLeft: true,
       }}
       handleStyles={{
         topRight: { cursor: "ne-resize" },
         bottomRight: { cursor: "se-resize" },
         bottomLeft: { cursor: "sw-resize" },
         topLeft: { cursor: "nw-resize" },
       }}
       handleWrapperStyle={{ opacity: 1 }}
       resizeRatio={1}
     >
       <div
         className="absolute overflow-hidden rounded-lg"
         onClick={handleActivate}
         style={{
           width: "100%",
           height: "100%",
           zIndex: zIndex,
           boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
           border: "1px solid #e5e7eb",
           transition: "box-shadow 0.2s ease, border-color 0.2s ease",
         }}
       >
         {windowContent}
       </div>
     </Resizable>
   </div>
 );
};

export default ChatWindow;