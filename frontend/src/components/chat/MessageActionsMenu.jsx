import React from 'react';
import { motion } from 'framer-motion';
import { 
  Reply, 
  Palette, 
  Edit, 
  History,
  Trash2
} from 'lucide-react';
import { FaRegSmile } from 'react-icons/fa';
import ReactionPicker from './ReactionPicker';

// Common quick reactions
const QuickReactions = [
    { emoji: '👍', title: 'Mi piace' },
    { emoji: '👎', title: 'Non mi piace' },
    { emoji: '🙏', title: 'Grazie'},
    { emoji: '❤️', title: 'Cuore' },
    { emoji: '😂', title: 'Divertente' }
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
  isCancelled = false
}) => {
  if (!isOpen) return null;

  // Function to handle reaction addition - with defensive check
  const handleAddReaction = (emoji) => {
    // Only call onAddReaction if it exists and chat isn't left
    if (typeof onAddReaction === 'function' && !hasLeftChat) {
      try {
        onAddReaction(emoji);
      } catch (error) {
        console.error('Error handling reaction in MessageActionsMenu:', error);
        // Optionally show a user-friendly error toast/notification here
      }
    } else if (!onAddReaction) {
      console.warn('onAddReaction function not provided to MessageActionsMenu');
    }
  };

  return (
    <motion.div 
      className="message-actions-menu absolute bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.15 }}
      style={{ minWidth: '200px', top: '33px', zIndex: 9999, left: isCurrentUserMessage ? 'auto' : '0', right: isCurrentUserMessage ? '0' : 'auto' }}
    >
      <div className="py-1 px-1"> 
        {/* Non mostrare le reazioni se il messaggio è stato eliminato */}
        {!hasLeftChat && !isCancelled && typeof onAddReaction === 'function' && (
          <div className="flex flex-col bg-gray-100 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
            <div className="mb-1 text-xs text-gray-500 font-medium">Reazioni rapide</div>
            <div className="flex flex-wrap gap-1">
              {QuickReactions.map(reaction => (
                <button 
                  key={reaction.emoji}
                  className="p-1.5 hover:bg-gray-200 rounded-full transition-colors" 
                  onClick={() => handleAddReaction(reaction.emoji)}
                  title={reaction.title}
                >
                  <span className="text-base">{reaction.emoji}</span>
                </button>
              ))}
              <ReactionPicker
                onReactionSelect={handleAddReaction}
                style={{ zIndex: 99999 }}
              />
            </div>
          </div>
        )}
        
        {/* Non mostrare l'opzione di risposta se il messaggio è stato eliminato */}
        {!hasLeftChat && !isCancelled && typeof onReply === 'function' && (
          <button
            className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            onClick={onReply}
          >
            <Reply className="h-4 w-4 mr-3 text-blue-500" />
            <span>Rispondi</span>
          </button>
        )}
        
        {/* Non mostrare l'opzione di colore se il messaggio è stato eliminato */}
        {!isCancelled && typeof onColorSelect === 'function' && (
          <button
            className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            onClick={onColorSelect}
          >
            <Palette className="h-4 w-4 mr-3 text-indigo-500" />
            <span>Colore messaggio</span>
          </button>
        )}
        
        {/* Non mostrare l'opzione di modifica se il messaggio è stato eliminato */}
        {canEdit && !hasLeftChat && !isCancelled && typeof onEdit === 'function' && (
          <button
            className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4 mr-3 text-green-500" />
            <span>Modifica messaggio</span>
          </button>
        )}
        
        {/* Non mostrare l'opzione di eliminazione se il messaggio è già stato eliminato */}
        {canEdit && !hasLeftChat && !isCancelled && typeof onDelete === 'function' && (
          <button
            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 mr-3 text-red-500" />
            <span>Elimina</span>
          </button>
        )}
       
        {/* Mostra l'opzione di cronologia versioni SOLO se il messaggio è stato modificato e non è stato eliminato */}
        {isEdited && !isCancelled && typeof onViewHistory === 'function' && (
          <button
            className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            onClick={onViewHistory}
          >
            <History className="h-4 w-4 mr-3 text-purple-500" />
            <span>Cronologia versioni</span>
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default MessageActionsMenu;