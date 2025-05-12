import React from 'react';
import { X, MessageSquare } from 'lucide-react';

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
      <div className="window-dock flex-row">
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
      
      {/* Stile locale per sovrascrivere gli stili globali */}
      <style jsx>{`
        .window-dock {
          padding: 8px;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(5px);
          border-radius: 999px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: row; /* Orizzontale invece di column */
          gap: 4px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          z-index: 100000;
          transition: opacity 0.2s ease;
          opacity: 0.7;
        }
        
        .window-dock:hover {
          opacity: 1;
        }

        .minimized-chat-icon {
          transition: transform 0.2s ease, opacity 0.2s ease, background-color 0.2s ease;
        }
        
        .minimized-chat-icon.unread-pulse {
          animation: pulse-red 2s infinite;
          background-color: rgba(254, 226, 226, 0.8);
        }
        
        @keyframes pulse-red {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 0 5px rgba(239, 68, 68, 0);
            transform: scale(1.05);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default MinimizedChatsDock;