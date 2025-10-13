const NotificationItem = ({
  notification,
  animatingItemId,
  animationPhase,
  onNotificationClick,
  onTogglePin,
  onToggleFavorite,
  onArchive,
  onUnarchive,
  onToggleMute,
  onToggleReadUnread,
  parseMessages,
  timeSince,
  isNotificationMuted,
}) => {
  const messages = parseMessages(notification.messages);
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const categoryColor = notification.hexColor;

  // Verifica se questa chat è stata abbandonata dall'utente
  const hasLeftChat = notification.chatLeft === 1 || notification.chatLeft === true;
  // Verifica se questa chat è stata archiviata dall'utente
  const isArchived = notification.archived === 1 || notification.archived === true;

  // Conta le notifiche reazione non lette (senderId = -1)
  const reactionNotificationsCount = messages.filter(msg => msg.senderId === -1).length;
  const hasUnreadReactions = reactionNotificationsCount > 0;

  return (
    <div
      key={`notification-${notification.notificationId}`}
      className={`notification-item ${notification.isReadByUser ? "read" : "unread"} ${notification.isClosed ? "isClosed" : ""} ${hasLeftChat ? "chat-left" : ""} ${isArchived ? "archived" : ""}
        ${animatingItemId === notification.notificationId && animationPhase === "exit" ? "pin-exit-active" : ""}
        ${animatingItemId === notification.notificationId && animationPhase === "enter" ? "pin-enter-active" : ""}`}
      onClick={(e) => onNotificationClick(notification, e)}
      id={`notification-item-${notification.notificationId}`}
      data-notification-id={notification.notificationId}
      data-is-read={notification.isReadByUser ? "true" : "false"}
      data-is-pinned={notification.pinned ? "true" : "false"}
      data-is-closed={notification.isClosed ? "true" : "false"}
      data-has-left={hasLeftChat ? "true" : "false"}
      data-is-archived={isArchived ? "true" : "false"}
    >
      <div
        className="category-vertical-bar"
        style={{ backgroundColor: categoryColor }}
        title={notification.notificationCategoryName}
        id={`notification-category-indicator-${notification.notificationId}`}
      ></div>
      
      {/* Div per la prima colonna di icone */}
      <div className="notification-content1A">
        <i
          className={`${notification.pinned ? "bi-pin-fill text-black" : "bi-pin-angle text-gray-600"} pin-icon`}
          onClick={(e) => {
            e.currentTarget.classList.add("pin-animation");
            setTimeout(() => {
              e.currentTarget.classList.remove("pin-animation");
            }, 600);
            onTogglePin(notification.notificationId, notification.pinned, e);
          }}
          id={`notification-pin-${notification.notificationId}`}
          title={notification.pinned ? "Rimuovi pin" : "Aggiungi pin"}
        ></i>
        <i
          className={notification.favorite ? "bi bi-star-fill" : "bi bi-star"}
          onClick={(e) =>
            onToggleFavorite(notification.notificationId, notification.favorite, e)
          }
          id={`notification-favorite-${notification.notificationId}`}
          title={
            notification.favorite
              ? "Rimuovi dai preferiti"
              : "Aggiungi ai preferiti"
          }
        ></i>
        <i
          className="bi bi-at"
          style={{
            color: notification.mentionToRead
              ? "red"
              : notification.isMentioned
                ? "black"
                : "gray",
            opacity:
              notification.isMentioned || notification.mentionToRead
                ? 1
                : 0.5,
          }}
          id={`notification-mention-${notification.notificationId}`}
          title={
            notification.isMentioned
              ? "Sei stato menzionato in questa notifica"
              : ""
          }
        ></i>
      </div>
      
      {/* Div per la seconda colonna di icone */}
      <div className="notification-content1B">
        {/* Bottone di archiviazione */}
        <i
          className={
            isArchived
              ? "bi bi-archive-fill text-purple-600"
              : "bi bi-archive text-gray-600"
          }
          onClick={(e) =>
            isArchived
              ? onUnarchive(notification.notificationId, e)
              : onArchive(notification.notificationId, e)
          }
          id={`notification-archive-${notification.notificationId}`}
          title={isArchived ? "Rimuovi dall'archivio" : "Archivia"}
          style={{ cursor: "pointer" }}
        ></i>
        <i
          className={
            isNotificationMuted(notification)
              ? "bi bi-bell-slash-fill text-gray-600"
              : "bi bi-bell text-gray-600"
          }
          onClick={(e) =>
            onToggleMute(
              notification.notificationId,
              !isNotificationMuted(notification),
              e,
            )
          }
          id={`notification-mute-${notification.notificationId}`}
          title={
            isNotificationMuted(notification)
              ? "Riattiva notifiche"
              : "Silenzia notifiche"
          }
          style={{ cursor: "pointer" }}
        ></i>
      </div>

      <div className="notification-content2">
        <div
          className={`notification-header ${notification.isReadByUser ? "" : "unread"}`}
        >
          <span
            className={
              "notification-title " +
              (notification.isReadByUser ? "" : "unread")
            }
            id={`notification-title-${notification.notificationId}`}
          >
            {notification.title}
            {hasUnreadReactions && (
              <span
                className="inline-flex items-center justify-center w-5 h-5 ml-1.5 text-xs bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full animate-pulse shadow-lg"
                title={`${reactionNotificationsCount} ${reactionNotificationsCount === 1 ? 'nuova reazione' : 'nuove reazioni'}`}
              >
                ❤️
              </span>
            )}
            {hasLeftChat && (
              <span className="text-yellow-600 text-xs ml-1">
                (abbandonata)
              </span>
            )}
            {isArchived && (
              <span className="text-purple-600 text-xs ml-1">
                (archiviata)
              </span>
            )}
          </span>
          <span
            className={`time`}
            id={`notification-time-${notification.notificationId}`}
          >
            {lastMessage ? timeSince(lastMessage.tbCreated) : ""}
          </span>
        </div>
        <span
          className="sender"
          id={`notification-sender-${notification.notificationId}`}
        >
          {lastMessage ? lastMessage.senderName : ""}
        </span>
        <div
          className="last-message-preview"
          id={`notification-preview-${notification.notificationId}`}
        >
          {lastMessage ? lastMessage.message : ""}
        </div>
      </div>
      
      <div
        className="read-indicator-wrapper"
        style={{
          backgroundColor: notification.isReadByUser
            ? "#e7e7e7"
            : "rgb(224, 42, 42)",
        }}
        onClick={(e) =>
          onToggleReadUnread(
            notification.notificationId,
            notification.isReadByUser,
            e,
          )
        }
        id={`notification-read-indicator-${notification.notificationId}`}
        title={
          notification.isReadByUser
            ? "Segna come non letto"
            : "Segna come letto"
        }
      ></div>
    </div>
  );
};

export default NotificationItem; 