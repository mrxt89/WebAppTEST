import React from 'react';
import { X, MessageSquare } from 'lucide-react';
import '@/styles/chat-components.css';

/**
 * Dock di chat minimizzate disposte orizzontalmente
 * 
 * @param {Array} minimizedChats - Array di chat minimizzate
 * @param {Function} onRestoreChat - Funzione per ripristinare una chat
 * @param {Function} onCloseChat - Funzione per chiudere una chat
 * @param {Array} notifications - Array completo di notifiche per controllare i messaggi non letti
 */
const MinimizedChatsDock = ({ 
  minimizedChats = [], 
  onRestoreChat, 
  onCloseChat,
  notifications = []
}) => {
  // Non renderizzare nulla se non ci sono chat minimizzate
  if (!minimizedChats || minimizedChats.length === 0) {
    return null;
  }

  // Funzione per verificare se una chat ha messaggi non letti
  const hasUnreadMessages = (notificationId) => {
    if (!notifications || !notificationId) return false;
    
    const notification = notifications.find(n => n.notificationId === notificationId);
    return notification && !notification.isReadByUser;
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 minimized-chat-dock pointer-events-auto z-[1000]">
      <div className="window-dock">
        {minimizedChats.map((chat) => (
          <div 
            key={`minimized-chat-${chat.notificationId}`}
            className={`minimized-chat-icon relative mx-1 rounded-full bg-white p-2 cursor-pointer ${
              hasUnreadMessages(chat.notificationId) ? 'unread-pulse' : ''
            }`}
            data-notification-id={chat.notificationId}
            style={{
              borderLeft: `3px solid ${chat.hexColor || '#6366f1'}`
            }}
          >
            {/* Icona della chat */}
            <div 
              className="flex items-center"
              onClick={() => onRestoreChat(chat)}
              title={chat.title}
            >
              <div className="w-8 h-8 flex items-center justify-center">
                <MessageSquare 
                  className={`w-4 h-4 ${
                    hasUnreadMessages(chat.notificationId) 
                      ? 'text-red-500' 
                      : 'text-gray-600'
                  }`} 
                />
              </div>
              <span 
                  className="ml-2 font-medium truncate max-w-[120px]"
                  style={{fontSize: '0.575rem'}}
                  >
                {chat.title}
              </span>
            </div>
            
            {/* Pulsante per chiudere */}
            <button
              className="absolute -top-1 -right-1 bg-white rounded-full border border-gray-200 shadow-sm p-0.5 hover:bg-gray-100"
              onClick={() => onCloseChat(chat.notificationId)}
              title="Chiudi chat"
            >
              <X className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MinimizedChatsDock;