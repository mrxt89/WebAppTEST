// ModernChat.jsx - Fixed version
import React, { useState, useEffect, useRef } from 'react';
import ChatTopBar from './ChatTopBar';
import ChatBottomBar from './ChatBottomBar';
import ModernChatList from './ModernChatList';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';

const ModernChat = ({ 
  notification, 
  closeChat, 
  onMinimize,
  isOpen
}) => {
  const [sending, setSending] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const chatListRef = useRef(null);
  const { users, markMessageAsRead } = useNotificationContext();
  const [hasMarkedAsRead, setHasMarkedAsRead] = useState(false);
  
  // Effetto per segnare i messaggi come letti all'apertura - IMPROVED VERSION
  useEffect(() => {
    if (isOpen && !hasMarkedAsRead && notification) {
      if (notification.notificationId && !notification.isReadByUser) {
        console.log(`[ModernChat] Marking notification ${notification.notificationId} as read`);
        markMessageAsRead(notification.notificationId);
        setHasMarkedAsRead(true);
      }
    }
  }, [isOpen, notification, markMessageAsRead, hasMarkedAsRead]);

  if (!notification) {
    return <div>Loading...</div>;
  }

  // Estrai le informazioni dalla notifica
  const { 
    title, 
    messages, 
    notificationId,
    notificationCategoryId,
    hexColor,
    chatLeft
  } = notification;

  // Determina se l'utente ha abbandonato la chat
  const hasLeftChat = chatLeft === 1 || chatLeft === true;
  
  // Assicurati che i messaggi siano in formato array
  const parsedMessages = Array.isArray(messages) ? messages : JSON.parse(messages || '[]');
  
  // Trova l'utente corrente
  const currentUser = users.find(user => user.isCurrentUser);

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
      />
      
      <div className="flex-1 overflow-hidden chat-background">
        <ModernChatList 
          messages={parsedMessages}
          sending={sending}
          notificationId={notificationId}
          isReadByUser={notification.isReadByUser || hasMarkedAsRead}
          markMessageAsRead={null} // Don't pass this function to avoid double marking
          chatListRef={chatListRef}
          onReply={handleReply}
          categoryColor={hexColor}
          hasLeftChat={hasLeftChat}
          currentUser={currentUser}
          users={users}
          notification={notification}
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