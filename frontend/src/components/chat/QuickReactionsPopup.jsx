import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile, Loader2, Plus, Search, X } from "lucide-react";
import "@/styles/QuickReactions.css";

// Evento personalizzato per gestire l'apertura dei popup
const QUICK_REACTIONS_EVENT = 'quick-reactions-popup-opened';

// Reazioni rapide predefinite
const QuickReactions = [
  { emoji: "👍", title: "Mi piace", color: "#3b82f6" },
  { emoji: "❤️", title: "Cuore", color: "#ef4444" },
  { emoji: "😂", title: "Divertente", color: "#f59e0b" },
  { emoji: "✅", title: "Fatto!", color: "#8b5cf6" },
  { emoji: "😢", title: "Triste", color: "#06b6d4" },
  { emoji: "🙏", title: "Grazie", color: "#10b981" },
  { emoji: "+", title: "Altre emoji", color: "#6b7280", isCustom: true },
];

// Array esteso di emoji per il picker
const AllEmojis = {
  "Faccine": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😊", "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔"],
  "Gesti": ["👋", "🤚", "🖐", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏"],
  "Cuori": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝"],
  "Oggetti": ["🎈", "🎉", "🎊", "🎁", "🎀", "🏆", "🥇", "🥈", "🥉", "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🎱", "🎲", "🎯", "🎪", "🎭", "🎨", "🎬", "🎤", "🎧", "🎼", "🎵", "🎶"],
  "Cibo": ["🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍑", "🍐", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶", "🌽", "🥕", "🍔", "🍟", "🍕", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "☕", "🍵", "🍺", "🍻", "🥂", "🍷"],
  "Animali": ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐴", "🦄", "🐝", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐬", "🐳", "🐋", "🦈"],
  "Simboli": ["⭐", "🌟", "✨", "⚡", "🔥", "🌈", "☀️", "⛅", "☁️", "❄️", "☃️", "💨", "💧", "💦", "☂️", "🌊", "🌴", "🌵", "🌲", "🌳", "🌿", "☘️", "🍀", "🌸", "🌺", "🌻", "🌹", "🌷", "🌼", "🌾", "💐"]
};

const QuickReactionsPopup = ({
  isOpen,
  onClose,
  onReactionSelect,
  position = "bottom",
  disabled = false,
  loadingReactions = {},
  messageId,
  isOwnMessage,
}) => {
  const popupRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Faccine");
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: position });
  
  // Calcola la posizione ottimale del popup per evitare overflow
  useEffect(() => {
    if (!isOpen || !popupRef.current) return;
    
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
      
      let yPosition = position;
      const popupHeight = showEmojiPicker ? 350 : 80; // Altezza approssimativa del popup
      const margin = 20; // Margine maggiore per evitare che tocchi i bordi
      
      // Controlla overflow verticale
      if (position === "bottom" && buttonRect.bottom + popupHeight > chatRect.bottom - margin) {
        yPosition = "top";
      } else if (position === "top" && buttonRect.top - popupHeight < chatRect.top + margin) {
        yPosition = "bottom";
      }
      
      // Non spostare orizzontalmente - il popup rimane centrato sotto il pulsante
      setAdjustedPosition({ x: 0, y: yPosition });
    };
    
    // Calcola immediatamente e dopo un breve delay per assicurarsi che il DOM sia pronto
    calculatePosition();
    const timer = setTimeout(calculatePosition, 10);
    
    return () => clearTimeout(timer);
  }, [isOpen, position, isOwnMessage, showEmojiPicker]);

  // Gestisci l'apertura e chiusura di altri popup
  useEffect(() => {
    const handleOtherPopupOpened = (event) => {
      // Se un altro popup si apre e questo è diverso dal corrente, chiudi questo
      if (event.detail.messageId !== messageId && isOpen) {
        onClose();
        setShowEmojiPicker(false);
        setSearchTerm("");
      }
    };

    // Ascolta gli eventi di apertura di altri popup
    document.addEventListener(QUICK_REACTIONS_EVENT, handleOtherPopupOpened);

    return () => {
      document.removeEventListener(QUICK_REACTIONS_EVENT, handleOtherPopupOpened);
    };
  }, [isOpen, messageId, onClose]);

  // Notifica l'apertura di questo popup
  useEffect(() => {
    if (isOpen) {
      // Dispatches un evento per notificare l'apertura di questo popup
      const event = new CustomEvent(QUICK_REACTIONS_EVENT, {
        detail: { messageId }
      });
      document.dispatchEvent(event);
    }
  }, [isOpen, messageId]);

  // Chiudi il popup quando si clicca fuori o si preme ESC
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        // Non chiudere se stiamo cliccando sul bottone che apre il popup
        const quickReactionButton = event.target.closest('.quick-reactions-button');
        if (!quickReactionButton) {
          onClose();
          setShowEmojiPicker(false);
          setSearchTerm("");
        }
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        setShowEmojiPicker(false);
        setSearchTerm("");
      }
    };

    if (isOpen) {
      // Usa un timeout per evitare che si chiuda immediatamente all'apertura
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
      }, 100);
      
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  // Gestisci la selezione di una reazione
  const handleReactionClick = async (reaction) => {
    if (disabled || loadingReactions[reaction.emoji]) return;
    
    if (reaction.isCustom) {
      setShowEmojiPicker(true);
      // Il posizionamento viene gestito automaticamente dall'useEffect sopra
    } else {
      await onReactionSelect(reaction.emoji);
      onClose();
    }
  };

  // Gestisci selezione emoji dal picker esteso
  const handleEmojiSelect = async (emoji) => {
    if (disabled) return;
    
    await onReactionSelect(emoji);
    onClose();
    setShowEmojiPicker(false);
  };

  // Filtra emoji in base alla ricerca
  const getFilteredEmojis = () => {
    if (!searchTerm) {
      return AllEmojis[selectedCategory] || [];
    }
    
    // Cerca in tutte le categorie
    const allEmojis = Object.values(AllEmojis).flat();
    return allEmojis;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={popupRef}
        className="absolute"
        style={{
          zIndex: 9999, // Z-index molto alto per stare sopra la chat
          [adjustedPosition.y === "top" ? "bottom" : "top"]: "100%",
          left: "20%",
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
        {/* Popup emoji picker esteso */}
        {showEmojiPicker ? (
          <div 
            className="bg-white rounded-2xl shadow-xl p-2" 
            style={{ 
              width: '350px',
              // Assicura che non esca dai bordi
              maxWidth: 'calc(100vw - 40px)',
              zIndex: 10000, // Z-index ancora più alto per il picker esteso
              position: 'relative',
            }}
          >
              <button
                onClick={() => {
                  setShowEmojiPicker(false);
                  setSearchTerm("");
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>

            
            {/* Categorie */}
            {!searchTerm && (
              <div className="flex gap-1 mb-3 overflow-x-auto pb-2">
                {Object.keys(AllEmojis).map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === category
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
            
            {/* Griglia emoji */}
            <div className="grid grid-cols-7 gap-1 max-h-[250px] overflow-y-auto">
              {getFilteredEmojis().map((emoji, index) => (
                <motion.button
                  key={`${emoji}-${index}`}
                  className="p-2 rounded hover:bg-gray-100 transition-colors text-xl"
                  onClick={() => handleEmojiSelect(emoji)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  disabled={disabled}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          /* Popup reazioni rapide */
          <div 
            className="rounded-2xl shadow-xl p-2 quick-reactions-popup"
            style={{
              // Assicura che non esca dai bordi
              maxWidth: 'calc(100vw - 40px)',
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <div className="flex items-center gap-2">
              {QuickReactions.map((reaction) => (
                <motion.button
                  key={reaction.emoji}
                  className={`relative p-2 rounded-full reaction-emoji-container ${
                    loadingReactions[reaction.emoji]
                      ? "cursor-not-allowed opacity-50"
                      : reaction.isCustom
                      ? "cursor-pointer custom-reaction"
                      : "cursor-pointer hover:bg-gray-50 reaction-emoji"
                  }`}
                  onClick={() => handleReactionClick(reaction)}
                  disabled={disabled || loadingReactions[reaction.emoji]}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  title={reaction.title}
                >
                  {loadingReactions[reaction.emoji] ? (
                    <Loader2 className="h-5 w-5 reaction-loading text-gray-400" />
                  ) : reaction.isCustom ? (
                    <Plus className="h-5 w-5 text-gray-600" />
                  ) : (
                    <span className="text-xl">{reaction.emoji}</span>
                  )}
                  
                  {/* Effetto hover con colore */}
                  <motion.div
                    className="absolute inset-0 rounded-full opacity-0"
                    style={{ backgroundColor: reaction.color }}
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 0.1 }}
                  />
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default QuickReactionsPopup;