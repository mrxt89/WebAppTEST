// Frontend/src/components/chat/MessageColorPicker.jsx
import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";

const MessageColorPicker = ({ messageId, notificationId, onClose, isOwnMessage = false }) => {
  const { setMessageColor, clearMessageColor } = useNotifications();
  const popupRef = useRef(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ y: isOwnMessage ? "top" : "bottom" });

  // Calcola la posizione ottimale del popup per evitare overflow
  useEffect(() => {
    if (!popupRef.current) return;
    
    const calculatePosition = () => {
      const popup = popupRef.current;
      const button = popup.parentElement; // Il container del pulsante
      const messageContainer = button.closest('[data-message-id]'); // Il container del messaggio
      const messageBubble = messageContainer?.querySelector('.message-bubble'); // Il bubble del messaggio
      
      if (!messageBubble) return;
      
      const buttonRect = button.getBoundingClientRect();
      const bubbleRect = messageBubble.getBoundingClientRect();
      // Trova il container della chat (priorità: chat-list-container, poi chat-window, poi body)
      const chatContainer = popup.closest('.chat-list-container') || 
                           popup.closest('.chat-window') || 
                           popup.closest('[class*="chat"]') ||
                           document.body;
      const chatRect = chatContainer.getBoundingClientRect();
      
      let yPosition = isOwnMessage ? "top" : "bottom";
      const popupHeight = 80; // Altezza approssimativa del popup
      const margin = 20; // Margine maggiore per evitare che tocchi i bordi
      
      // Controlla overflow verticale
      if (yPosition === "bottom" && buttonRect.bottom + popupHeight > chatRect.bottom - margin) {
        yPosition = "top";
      } else if (yPosition === "top" && buttonRect.top - popupHeight < chatRect.top + margin) {
        yPosition = "bottom";
      }
      
      // Aggiusta la posizione orizzontale per evitare overflow
      let xOffset = 0;
      const popupWidth = 280; // Larghezza approssimativa del popup
      
      // Per i messaggi propri (allineati a destra), sposta leggermente a sinistra
      if (isOwnMessage) {
        xOffset = -60; // Sposta 60px a sinistra per i messaggi propri
      }
      
      // Controlla overflow orizzontale
      const popupLeft = buttonRect.left + xOffset - popupWidth / 2;
      if (popupLeft < chatRect.left + margin) {
        xOffset += (chatRect.left + margin) - popupLeft;
      } else if (popupLeft + popupWidth > chatRect.right - margin) {
        xOffset -= (popupLeft + popupWidth) - (chatRect.right - margin);
      }
      
      setAdjustedPosition({ x: xOffset, y: yPosition });
    };
    
    // Calcola immediatamente e dopo un breve delay per assicurarsi che il DOM sia pronto
    calculatePosition();
    const timer = setTimeout(calculatePosition, 10);
    
    return () => clearTimeout(timer);
  }, [isOwnMessage]);

  // Chiudi il popup quando si clicca fuori o si preme ESC
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        // Non chiudere se stiamo cliccando sul bottone che apre il popup
        const colorPickerButton = event.target.closest('[data-color-picker-trigger]');
        if (!colorPickerButton) {
          onClose();
        }
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    // Usa un timeout per evitare che si chiuda immediatamente all'apertura
    setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }, 100);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Colori predefiniti
  const colors = [
    "#d62828", // Rosso
    "#fad02c", // Yellow
    "#00a14b", // Verde
    "#6ccff6", // Blu
    "#e5e9ec", // Grigio
  ];

  const handleColorSelect = async (color) => {
    try {
      await setMessageColor(messageId, color);
      
      // IMPORTANTE: Emetti evento con notificationId
      document.dispatchEvent(
        new CustomEvent('message-color-changed', {
          detail: {
            notificationId: parseInt(notificationId),
            messageId: messageId,
            color: color
          }
        })
      );
      
      // Forza il ricaricamento
      document.dispatchEvent(
        new CustomEvent('reload-open-chat', {
          detail: {
            notificationId: parseInt(notificationId),
            reason: 'message-color-changed',
            forceComplete: true
          }
        })
      );
      
      onClose();
    } catch (error) {
      console.error("Errore nell'impostazione del colore:", error);
    }
  };

  const handleClearColor = async () => {
    try {
      await clearMessageColor(messageId);
      
      // IMPORTANTE: Emetti evento con notificationId
      document.dispatchEvent(
        new CustomEvent('message-color-changed', {
          detail: {
            notificationId: parseInt(notificationId),
            messageId: messageId,
            color: null
          }
        })
      );
      
      // Forza il ricaricamento
      document.dispatchEvent(
        new CustomEvent('reload-open-chat', {
          detail: {
            notificationId: parseInt(notificationId),
            reason: 'message-color-cleared',
            forceComplete: true
          }
        })
      );
      
      onClose();
    } catch (error) {
      console.error("Errore nella rimozione del colore:", error);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={popupRef}
        className="absolute"
        style={{
          zIndex: 9999, // Z-index molto alto per stare sopra la chat
          [adjustedPosition.y === "top" ? "bottom" : "top"]: "100%",
          left: `calc(20% + ${adjustedPosition.x}px)`,
          transform: "translateX(-50%)",
          marginTop: adjustedPosition.y === "top" ? "0" : "8px",
          marginBottom: adjustedPosition.y === "top" ? "8px" : "0",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          borderRadius: "20px",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
        initial={{ opacity: 0, scale: 0.8, y: adjustedPosition.y === "top" ? 10 : -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: adjustedPosition.y === "top" ? 10 : -10 }}
        transition={{ 
          duration: 0.1, 
          ease: [0.4, 0, 0.2, 1],
          type: "spring",
          stiffness: 300,
          damping: 25
        }}
      >
        <div 
          className="rounded-2xl shadow-xl p-3"
          style={{
            maxWidth: 'calc(100vw - 40px)',
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <div className="flex items-center gap-2">
            {colors.map((color) => (
              <motion.button
                key={color}
                className="w-8 h-8 rounded-full border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                aria-label={`Imposta colore ${color}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              />
            ))}
            <motion.button
              className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-red-500 hover:bg-gray-100 transition-colors"
              onClick={handleClearColor}
              aria-label="Rimuovi colore"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MessageColorPicker;