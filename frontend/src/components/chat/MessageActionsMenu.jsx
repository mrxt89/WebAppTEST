import React, { useState } from "react";
import { motion } from "framer-motion";
import { Reply, Palette, Edit, History, Trash2, Loader2 } from "lucide-react";
import { FaRegSmile } from "react-icons/fa";
import ReactionPicker from "./ReactionPicker";

// Common quick reactions (ora gestite dal popup dedicato)
const QuickReactions = [
  { emoji: "👍", title: "Mi piace" },
  { emoji: "👎", title: "Non mi piace" },
  { emoji: "🙏", title: "Grazie" },
  { emoji: "❤️", title: "Cuore" },
  { emoji: "😂", title: "Divertente" },
];

const MessageActionsMenu = ({
  isOpen,
  onClose,
  onReply,
  onColorSelect,
  onEdit,
  onViewHistory,
  onAddReaction,
  onDelete,
  canEdit,
  isEdited,
  hasLeftChat = false,
  isCurrentUserMessage,
  isCancelled = false,
}) => {
  const [loadingReactions, setLoadingReactions] = useState({});

  if (!isOpen) return null;

  // Controlla se ci sono azioni disponibili
  const hasAvailableActions = 
    (!hasLeftChat && !isCancelled && typeof onReply === "function") ||
    (!isCancelled && typeof onColorSelect === "function") ||
    (canEdit && !hasLeftChat && !isCancelled && typeof onEdit === "function") ||
    (canEdit && !hasLeftChat && !isCancelled && typeof onDelete === "function") ||
    (isEdited && !isCancelled && typeof onViewHistory === "function");

  // Se non ci sono azioni disponibili, non mostrare il menu
  if (!hasAvailableActions) return null;

  // Function to handle reaction addition - with defensive check
  const handleAddReaction = async (emoji) => {
    // Only call onAddReaction if it exists and chat isn't left
    if (typeof onAddReaction === "function" && !hasLeftChat) {
      try {
        setLoadingReactions(prev => ({ ...prev, [emoji]: true }));
        await onAddReaction(emoji);
        onClose(); // Chiudi il menu dopo l'aggiunta della reazione
      } catch (error) {
        console.error("Error handling reaction in MessageActionsMenu:", error);
      } finally {
        setLoadingReactions(prev => ({ ...prev, [emoji]: false }));
      }
    } else if (!onAddReaction) {
      console.warn("onAddReaction function not provided to MessageActionsMenu");
    }
  };

  return (
         <motion.div
       className="message-actions-menu absolute backdrop-blur-md overflow-hidden"
       initial={{ opacity: 0, scale: 0.95, y: -10 }}
       animate={{ opacity: 1, scale: 1, y: 0 }}
       exit={{ opacity: 0, scale: 0.95, y: -10 }}
       transition={{ 
         duration: 0.2,
         ease: [0.4, 0, 0.2, 1]
       }}
       style={{
         minWidth: "200px",
         top: "33px",
         zIndex: 9999,
         left: isCurrentUserMessage ? "auto" : "0",
         right: isCurrentUserMessage ? "0" : "auto",
         backgroundColor: "rgba(255, 255, 255, 0.425)",
         borderRadius: "20px",
         boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
       }}
     >
      <div className="py-2 px-2">
        {/* Risposta */}
        <motion.button
          className={`flex items-center w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-200 ${(!hasLeftChat && !isCancelled && typeof onReply === "function") ? 'visible' : 'hidden'}`}
          onClick={onReply}
          whileHover={{ scale: 1.02, x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          <Reply className="h-4 w-4 mr-3 text-blue-500" />
          <span>Rispondi</span>
        </motion.button>

        {/* Colore */}
        <motion.button
          className={`flex items-center w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-all duration-200 ${(!isCancelled && typeof onColorSelect === "function") ? 'visible' : 'hidden'}`}
          onClick={() => {
            onColorSelect();
            onClose();
          }}
          whileHover={{ scale: 1.02, x: 2 }}
          whileTap={{ scale: 0.98 }}
          data-color-picker-trigger
        >
          <Palette className="h-4 w-4 mr-3 text-indigo-500" />
          <span>Colore</span>
        </motion.button>

        {/* Modifica */}
        <motion.button
          className={`flex items-center w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-all duration-200 ${(canEdit && !hasLeftChat && !isCancelled && typeof onEdit === "function") ? 'visible' : 'hidden'}`}
          onClick={onEdit}
          whileHover={{ scale: 1.02, x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          <Edit className="h-4 w-4 mr-3 text-green-500" />
          <span>Modifica</span>
        </motion.button>

        {/* Elimina */}
        <motion.button
          className={`flex items-center w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-all duration-200 ${(canEdit && !hasLeftChat && !isCancelled && typeof onDelete === "function") ? 'visible' : 'hidden'}`}
          onClick={onDelete}
          whileHover={{ scale: 1.02, x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          <Trash2 className="h-4 w-4 mr-3 text-red-500" />
          <span>Elimina</span>
        </motion.button>

        {/* Cronologia versioni */}
        <motion.button
          className={`flex items-center w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-all duration-200 ${(isEdited && !isCancelled && typeof onViewHistory === "function") ? 'visible' : 'hidden'}`}
          onClick={onViewHistory}
          whileHover={{ scale: 1.02, x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          <History className="h-4 w-4 mr-3 text-purple-500" />
          <span>Cronologia</span>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default MessageActionsMenu;