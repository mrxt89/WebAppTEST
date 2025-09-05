// src/components/chat/MinimizedChatsDock.jsx
import React from "react";
import { X, MessageSquare, Plus } from "lucide-react";
import "@/styles/chat-components.css";

/**
 * Dock di chat minimizzate disposte orizzontalmente
 *
 * @param {Array} minimizedChats - Array di chat minimizzate
 * @param {Function} onRestoreChat - Funzione per ripristinare una chat
 * @param {Function} onCloseChat - Funzione per chiudere una chat
 * @param {Array} notifications - Array completo di notifiche per controllare i messaggi non letti
 * @param {Array} newMessageWindows - Array di finestre nuovo messaggio minimizzate
 * @param {Function} onRestoreNewMessage - Funzione per ripristinare una finestra nuovo messaggio
 * @param {Function} onCloseNewMessage - Funzione per chiudere una finestra nuovo messaggio
 */
const MinimizedChatsDock = ({
  minimizedChats = [],
  onRestoreChat,
  onCloseChat,
  notifications = [],
  newMessageWindows = [],
  onRestoreNewMessage,
  onCloseNewMessage,
}) => {
  // Non renderizzare nulla se non ci sono chat minimizzate
  if ((!minimizedChats || minimizedChats.length === 0) && 
      (!newMessageWindows || newMessageWindows.length === 0)) {
    return null;
  }

  // Funzione per verificare se una chat ha messaggi non letti
  const hasUnreadMessages = (notificationId) => {
    if (!notifications || !notificationId) return false;

    const notification = notifications.find(
      (n) => n.notificationId === notificationId,
    );
    return notification && !notification.isReadByUser;
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 minimized-chat-dock pointer-events-auto z-[1000]">
      <div className="window-dock">
        <MessageSquare className="w-4 text-gray-600" />
        {/* Chat esistenti minimizzate */}
        {minimizedChats.map((chat) => (
          <div
            key={`minimized-chat-${chat.notificationId}`}
            className={`minimized-chat-icon relative mx-1 rounded-4 bg-white p-2 cursor-pointer ${
              hasUnreadMessages(chat.notificationId) ? "unread-pulse" : ""
            }`}
            data-notification-id={chat.notificationId}
            style={{
              borderLeft: `3px solid ${chat.hexColor || "#6366f1"}`,
            }}
          >
            {/* Icona della chat */}
            <div
              className="flex items-center"
              onClick={() => onRestoreChat(chat)}
              title={chat.title}
            >

              <span
                className="ml-2 font-medium truncate max-w-[120px]"
                style={{ fontSize: "0.575rem" }}
              >
                {chat.title}
              </span>
            </div>

            {/* Pulsante per chiudere */}
            <button
              className="absolute -top-1 -right-1 rounded-full p-0.5 hover:bg-gray-100"
              onClick={() => onCloseChat(chat.notificationId)}
              title="Chiudi chat"
            >
              <X className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        ))}

        {/* Finestre nuovo messaggio minimizzate */}
        {newMessageWindows.map((window) => (
          <div
            key={`minimized-new-message-${window.id}`}
            className="minimized-chat-icon relative mx-1 rounded-4 bg-white p-2 cursor-pointer"
            style={{
              borderLeft: `3px solid #3b82f6`,
            }}
          >
            {/* Icona nuovo messaggio */}
            <div
              className="flex items-center"
              onClick={() => onRestoreNewMessage(window.id)}
              title={window.defaultTitle || "Nuovo messaggio"}
            >
              <div className="w-8 flex items-center justify-center">
                <Plus
                  className="w-4 h-4 text-blue-600"
                />
              </div>
              <span
                className="ml-2 font-medium truncate max-w-[120px] text-blue-600"
                style={{ fontSize: "0.575rem" }}
              >
                {window.defaultTitle || "Nuovo messaggio"}
              </span>
            </div>

            {/* Pulsante per chiudere */}
            <button
              className="absolute -top-1 -right-1 rounded-full p-0.5 hover:bg-gray-100"
              onClick={() => onCloseNewMessage(window.id)}
              title="Chiudi"
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