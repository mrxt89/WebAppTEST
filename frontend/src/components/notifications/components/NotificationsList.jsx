import React, { useRef, useEffect } from "react";
import { Filter } from "lucide-react";
import NotificationItem from "./NotificationItem";

const NotificationsList = ({
  filteredNotifications,
  isDocumentSearchVisible,
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
  resetAllFilters,
}) => {
  const notificationBarRef = useRef(null);
  const scrollPosition = useRef(0);

  // Effetto per mantenere la posizione di scorrimento durante gli aggiornamenti
  useEffect(() => {
    if (notificationBarRef.current) {
      scrollPosition.current = notificationBarRef.current.scrollTop;
    }

    const restoreScrollPosition = () => {
      if (notificationBarRef.current) {
        notificationBarRef.current.scrollTop = scrollPosition.current;
      }
    };

    setTimeout(restoreScrollPosition, 0);
  }, [filteredNotifications]);

  // Effetto per mantenere la posizione di scorrimento durante gli aggiornamenti
  useEffect(() => {
    const handleScrollRestore = () => {
      if (notificationBarRef.current && scrollPosition.current > 0) {
        notificationBarRef.current.scrollTop = scrollPosition.current;
      }
    };

    // Aggiungiamo un listener per ripristinare la posizione dopo che il DOM è stato aggiornato
    const observer = new MutationObserver(handleScrollRestore);

    if (notificationBarRef.current) {
      observer.observe(notificationBarRef.current, {
        childList: true,
        subtree: true,
      });

      // Salva la posizione durante lo scorrimento
      const handleScroll = () => {
        scrollPosition.current = notificationBarRef.current.scrollTop;
      };

      notificationBarRef.current.addEventListener("scroll", handleScroll, {
        passive: true,
      });

      return () => {
        observer.disconnect();
        if (notificationBarRef.current) {
          notificationBarRef.current.removeEventListener("scroll", handleScroll);
        }
      };
    }
  }, []);

  // Se la ricerca documenti è visibile, non mostrare le notifiche
  if (isDocumentSearchVisible) {
    return null;
  }

  return (
    <div
      className="notifications-list"
      ref={notificationBarRef}
      id="notification-list-container"
    >
      {filteredNotifications && filteredNotifications.length > 0 ? (
        (() => {
          // Rimuovi i duplicati usando un Set per tracciare gli ID già visti
          const uniqueIds = new Set();
          const uniqueNotifications = filteredNotifications.filter(
            (notification) => {
              if (uniqueIds.has(notification.notificationId)) {
                return false;
              }
              uniqueIds.add(notification.notificationId);
              return true;
            },
          );

          return uniqueNotifications.map((notification) => (
            <NotificationItem
              key={`notification-${notification.notificationId}`}
              notification={notification}
              animatingItemId={animatingItemId}
              animationPhase={animationPhase}
              onNotificationClick={onNotificationClick}
              onTogglePin={onTogglePin}
              onToggleFavorite={onToggleFavorite}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              onToggleMute={onToggleMute}
              onToggleReadUnread={onToggleReadUnread}
              parseMessages={parseMessages}
              timeSince={timeSince}
              isNotificationMuted={isNotificationMuted}
            />
          ));
        })()
      ) : (
        <div
          className="flex flex-col items-center justify-center p-6 text-center text-gray-500"
          id="notification-empty-state"
        >
          <div className="mb-3 w-16 h-16 flex items-center justify-center rounded-full bg-gray-100">
            <Filter className="w-8 h-8 text-gray-400" />
          </div>
          <p className="mb-2">
            Nessuna notifica corrisponde ai filtri selezionati
          </p>
          <button
            className="mt-2 text-sm text-blue-600 hover:underline"
            onClick={resetAllFilters}
            id="notification-reset-filters"
          >
            Reimposta tutti i filtri
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsList; 