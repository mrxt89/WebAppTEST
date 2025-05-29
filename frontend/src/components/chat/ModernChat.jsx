// src/components/chat/ModernChat.jsx
import React, { useState, useEffect, useRef } from "react";
import ChatTopBar from "./ChatTopBar";
import ChatBottomBar from "./ChatBottomBar";
import ModernChatList from "./ModernChatList";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import { useDispatch, useSelector } from "react-redux";
import { 
  selectOpenChatData, 
  setOpenChatData 
} from "@/redux/features/notifications/notificationsSlice";

const ModernChat = ({ notification, closeChat, onMinimize, isOpen }) => {
  const dispatch = useDispatch();
  
  // NUOVO: Usa openChatData invece di notification diretta
  const openChatData = useSelector(state => 
    selectOpenChatData(state, notification?.notificationId)
  );
  
  // NUOVO: Usa openChatData se disponibile, altrimenti notification
  const currentNotification = openChatData || notification;
  
  const [sending, setSending] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const chatListRef = useRef(null);
  const { 
    markMessageAsRead, 
    toggleMessageReaction,
    fetchNotificationById 
  } = useNotifications();
  const [hasMarkedAsRead, setHasMarkedAsRead] = useState(false);
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);

  // NUOVO: Effetto per caricare dati completi quando si apre la chat
  useEffect(() => {
    if (isOpen && notification?.notificationId) {
      const notificationId = notification.notificationId;
      
      // Rimuovo il controllo dei dati esistenti per forzare sempre il caricamento completo
      console.log(`🔄 ModernChat: Caricando dati completi per chat ${notificationId}...`);
      setIsLoadingComplete(true);
      
      // Carica TUTTI i messaggi con alta priorità
      fetchNotificationById(notificationId, true)
        .then((fullData) => {
          if (fullData) {
            console.log(`✅ ModernChat: Dati completi caricati per chat ${notificationId}:`, {
              messageCount: fullData.messageCount,
              messagesLength: Array.isArray(fullData.messages) 
                ? fullData.messages.length 
                : (typeof fullData.messages === "string" ? JSON.parse(fullData.messages || "[]").length : 0)
            });
            
            // Aggiorna openChatData nel Redux con priorità
            dispatch(setOpenChatData({
              notificationId: notificationId,
              data: {
                ...fullData,
                lastFullUpdate: Date.now(),
                _priority: true
              }
            }));
          }
        })
        .catch((error) => {
          console.error(`❌ ModernChat: Errore nel caricamento per chat ${notificationId}:`, error);
        })
        .finally(() => {
          setIsLoadingComplete(false);
        });
    }
  }, [isOpen, notification?.notificationId, fetchNotificationById, dispatch]);

// NUOVO: Effetto per gestire reload-open-chat con protezione
useEffect(() => {
  const handleReloadOpenChat = async (event) => {
    const { notificationId: eventNotificationId, reason, forceComplete } = event.detail;
    
    if (eventNotificationId === notification?.notificationId) {
      console.log(`🔄 ModernChat: Reload richiesto per chat ${eventNotificationId} (motivo: ${reason || 'unknown'})`);
      
      try {
        const shouldForceComplete = forceComplete || reason === 'message-sent';
        
        const fullData = await fetchNotificationById(eventNotificationId, true);
        
        if (fullData) {
          console.log(`✅ ModernChat: Reload completato per chat ${eventNotificationId}:`, {
            messageCount: fullData.messageCount,
            messagesLength: Array.isArray(fullData.messages) 
              ? fullData.messages.length 
              : (typeof fullData.messages === "string" ? JSON.parse(fullData.messages || "[]").length : 0)
          });
          
          dispatch(setOpenChatData({
            notificationId: eventNotificationId,
            data: {
              ...fullData,
              lastFullUpdate: Date.now(),
              _priority: true,
              _reloadReason: reason,
              _forceComplete: shouldForceComplete
            }
          }));
        }
      } catch (error) {
        console.error(`❌ ModernChat: Errore durante reload per chat ${eventNotificationId}:`, error);
      }
    }
  };

  document.addEventListener("reload-open-chat", handleReloadOpenChat);
  
  return () => {
    document.removeEventListener("reload-open-chat", handleReloadOpenChat);
  };
}, [notification?.notificationId, fetchNotificationById, dispatch]);

  // Effetto per segnare i messaggi come letti all'apertura
  useEffect(() => {
    if (isOpen && !hasMarkedAsRead && currentNotification) {
      if (currentNotification.notificationId && !currentNotification.isReadByUser) {
        markMessageAsRead(currentNotification.notificationId);
        setHasMarkedAsRead(true);
      }
    }
  }, [isOpen, currentNotification, markMessageAsRead, hasMarkedAsRead]);

  if (!currentNotification) {
    return <div className="flex items-center justify-center h-full">
      <div className="text-gray-500">Caricamento messaggi...</div>
    </div>;
  }

  // MODIFICA: Estrai le informazioni da currentNotification invece di notification
  const {
    title,
    messages,
    notificationId,
    notificationCategoryId,
    hexColor,
    chatLeft,
    users = [],
    membersInfo = []
  } = currentNotification;

  // Determina se l'utente ha abbandonato la chat
  const hasLeftChat = chatLeft === 1 || chatLeft === true;

  // MODIFICA: Assicurati che i messaggi siano in formato array - usa i dati completi
  const parsedMessages = Array.isArray(messages)
    ? messages
    : typeof messages === 'string' 
      ? JSON.parse(messages || "[]")
      : [];

  // Get current user from users array
  const currentUser = users.find && users.find((user) => user.isCurrentUser);

  // Gestisci la risposta a un messaggio
  const handleReply = (message) => {
    if (hasLeftChat) return;
    setReplyToMessage(message);
  };

  return (
    <div className="flex flex-col justify-between w-full h-full chat-page">
      <ChatTopBar
        title={title}
        closeChat={closeChat}
        onMinimize={onMinimize}
        notificationCategoryId={notificationCategoryId}
        hexColor={hexColor}
        hasLeftChat={hasLeftChat}
        membersInfo={membersInfo}
        users={users}
        currentUser={currentUser}
        notificationId={notificationId}
      />

      <div className="flex-1 overflow-hidden chat-background">
        <ModernChatList
          messages={parsedMessages}
          sending={sending}
          notificationId={notificationId}
          isReadByUser={currentNotification.isReadByUser || hasMarkedAsRead}
          markMessageAsRead={null}
          chatListRef={chatListRef}
          onReply={handleReply}
          categoryColor={hexColor}
          hasLeftChat={hasLeftChat}
          currentUser={currentUser}
          users={users || []}
          notification={currentNotification} // MODIFICA: Passa currentNotification
          toggleMessageReaction={toggleMessageReaction}
        />
      </div>

      {!hasLeftChat && (
        <ChatBottomBar
          notificationId={notificationId}
          title={title}
          notificationCategoryId={notificationCategoryId}
          hexColor={hexColor}
          setSending={setSending}
          replyToMessage={replyToMessage}
          setReplyToMessage={setReplyToMessage}
          hasLeftChat={hasLeftChat}
          users={users || []}
          notification={currentNotification} // MODIFICA: Passa currentNotification se necessario
        />
      )}

      {hasLeftChat && (
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center text-gray-500">
          <p>Hai abbandonato questa chat e non puoi più inviare messaggi.</p>
        </div>
      )}
    </div>
  );
};

export default ModernChat;