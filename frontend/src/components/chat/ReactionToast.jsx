// src/components/chat/ReactionToast.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, ArrowRight } from 'lucide-react';

/**
 * Toast elegante per mostrare notifiche di reazioni quando si apre una chat
 * Stile moderno e minimal con animazione smooth
 */
const ReactionToast = ({ notifications, onClose, onMessageClick }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const startTimeRef = React.useRef(Date.now());

  // Auto-dismiss dopo esattamente 5 secondi
  useEffect(() => {
    if (notifications && notifications.length > 0 && isVisible) {
      const elapsed = Date.now() - startTimeRef.current;
      const remainingTime = Math.max(0, 5000 - elapsed);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Aspetta che l'animazione finisca
      }, remainingTime);

      return () => clearTimeout(timer);
    }
  }, [notifications, isVisible, onClose]);

  // Se ci sono multiple notifiche, mostra la prossima ogni 2 secondi
  useEffect(() => {
    if (notifications && notifications.length > 1 && currentIndex < notifications.length - 1) {
      const timer = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [notifications, currentIndex]);

  if (!notifications || notifications.length === 0) return null;

  const currentNotification = notifications[currentIndex];

  // Estrae l'emoji e il nome dalla stringa "Nome ha reagito con 😊"
  const extractReactionInfo = (message) => {
    const match = message.match(/(.+?)\s+ha reagito con\s+(.+)/);
    if (match) {
      return {
        userName: match[1],
        emoji: match[2]
      };
    }
    return {
      userName: 'Qualcuno',
      emoji: '❤️'
    };
  };

  const { userName, emoji } = extractReactionInfo(currentNotification.message);
  const originalMessage = currentNotification.originalMessage || 'il tuo messaggio';

  // Tronca il messaggio originale se troppo lungo
  const truncatedMessage = originalMessage.length > 50
    ? originalMessage.substring(0, 50) + '...'
    : originalMessage;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleToastClick = () => {
    // Chiama la funzione per scrollare al messaggio
    if (onMessageClick && currentNotification.originalMessageId) {
      onMessageClick(currentNotification.originalMessageId);
      handleClose();
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] max-w-md w-full mx-4"
        >
          <div
            className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-2xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={handleToastClick}
            title="Clicca per andare al messaggio"
          >
            {/* Header con gradiente */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5">
                  <Heart className="h-4 w-4 text-white" />
                </div>
                <span className="text-white font-medium text-sm">Nuova reazione</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Previene il click sul toast
                  handleClose();
                }}
                className="text-white/80 hover:text-white transition-colors rounded-full hover:bg-white/20 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contenuto */}
            <div className="px-4 py-3">
              <div className="flex items-start gap-3">
                {/* Emoji grande */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full flex items-center justify-center text-2xl">
                    {emoji}
                  </div>
                </div>

                {/* Testo */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold text-blue-600">{userName}</span>
                    {' '}ha reagito con {emoji}
                  </p>
                  {originalMessage && (
                    <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">
                      "{truncatedMessage}"
                    </p>
                  )}
                </div>
              </div>

              {/* Indicatore multiple notifiche */}
              {notifications.length > 1 && (
                <div className="flex items-center justify-center gap-1 mt-3">
                  {notifications.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === currentIndex
                          ? 'w-6 bg-blue-500'
                          : index < currentIndex
                          ? 'w-1.5 bg-gray-300'
                          : 'w-1.5 bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Barra di progresso */}
            <motion.div
              className="h-1 bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear', delay: 0 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReactionToast;
