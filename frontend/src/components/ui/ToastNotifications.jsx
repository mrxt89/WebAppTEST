// ToastNotifications.jsx migliorato
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, MessageSquare } from "lucide-react";

// Componente Toast che mostra le notifiche in modo stratificato
const ToastNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [dismissing, setDismissing] = useState({});
  const audioRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Crea l'elemento audio una volta sola
    audioRef.current = new Audio(`${process.env.PUBLIC_URL}/audio/success.wav`);

    // Pre-carica l'audio
    audioRef.current.load();

    // Gestisce l'evento personalizzato inAppNotification
    const handleNotification = (event) => {
      const { title, message, timestamp, onClick } = event.detail;

      // Aggiungi una nuova notifica con ID unico
      const id = Date.now();
      setNotifications((prevNotifications) => [
        ...prevNotifications,
        { id, title, message, timestamp, onClick, isNew: true },
      ]);

      // Rimuovi il flag "isNew" dopo l'animazione
      setTimeout(() => {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isNew: false } : n)),
        );
      }, 300);

      // Tenta di riprodurre l'audio di notifica
      try {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.warn("Toast audio autoplay prevented:", error);
          });
        }
      } catch (error) {
        console.error("Error playing toast sound:", error);
      }

      // Auto-rimozione dopo un certo tempo
      setTimeout(() => {
        handleDismiss(id);
      }, 8000); // Aumentato a 8 secondi per maggiore visibilità

      // Rendi visibile tramite animazione CSS pulsante
      if (containerRef.current) {
        containerRef.current.classList.add("notification-pulse");
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.classList.remove("notification-pulse");
          }
        }, 1000);
      }
    };

    document.addEventListener("inAppNotification", handleNotification);

    return () => {
      document.removeEventListener("inAppNotification", handleNotification);
    };
  }, []);

  // Gestisce la rimozione di una notifica
  const handleDismiss = (id) => {
    // Imposta lo stato "in dismissing" per permettere l'animazione di uscita
    setDismissing((prev) => ({ ...prev, [id]: true }));

    // Rimuovi dopo che l'animazione è terminata
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setDismissing((prev) => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    }, 300);
  };

  // Gestisce il click sulla notifica
  const handleNotificationClick = (notification) => {
    if (typeof notification.onClick === "function") {
      notification.onClick();
    }
    handleDismiss(notification.id);
  };

  // Formatta l'orario della notifica
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Stile CSS per la pulsazione
  const pulseStyle = `
    @keyframes notification-pulse {
      0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
      100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
    }
    .notification-pulse {
      animation: notification-pulse 1s cubic-bezier(0.66, 0, 0, 1) forwards;
    }
  `;

  return (
    <>
      <style>{pulseStyle}</style>
      <div
        ref={containerRef}
        className="fixed top-4 right-4 z-50 flex flex-col items-end space-y-2 max-h-[80vh] overflow-auto pointer-events-none"
        style={{
          maxWidth: "90vw",
          scrollbarWidth: "none", // Firefox
          msOverflowStyle: "none", // IE/Edge
        }}
      >
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 300, scale: 0.8 }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                transition: { type: "spring", stiffness: 300, damping: 30 },
              }}
              exit={{
                opacity: 0,
                x: 300,
                transition: { duration: 0.2 },
              }}
              className={`
                pointer-events-auto flex items-start w-80 bg-white border rounded-lg shadow-xl overflow-hidden
                ${notification.isNew ? "ring-2 ring-blue-500" : ""}
                ${dismissing[notification.id] ? "opacity-70" : ""}
              `}
              style={{
                backdropFilter: "blur(10px)",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
              }}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex-shrink-0 p-4 bg-blue-100">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div className="p-4 flex-1">
                <div className="flex justify-between items-start">
                  <p className="font-medium text-gray-900 text-sm">
                    {notification.title}
                  </p>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-2">
                      {formatTime(notification.timestamp)}
                    </span>
                    <button
                      className="text-gray-400 hover:text-gray-600 focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(notification.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {notification.message}
                </p>
                <div className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center">
                  <span className="mr-1">Clicca per aprire</span>
                  <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Badge numeratore notifiche */}
        {notifications.length > 0 && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="fixed bottom-4 right-4 bg-blue-600 text-white rounded-full h-6 w-6 flex items-center justify-center font-medium text-xs pointer-events-auto shadow-lg"
          >
            {notifications.length}
          </motion.div>
        )}
      </div>
    </>
  );
};

export default ToastNotifications;
