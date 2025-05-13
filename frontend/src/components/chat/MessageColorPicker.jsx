// Frontend/src/components/chat/MessageColorPicker.jsx
import React from 'react';
import { X } from 'lucide-react';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';

const MessageColorPicker = ({ messageId, onClose }) => {
  const { setMessageColor, clearMessageColor } = useNotifications();
  
  // Colori predefiniti
  const colors = [
    '#d62828', // Rosso
    '#fad02c', // Yellow
    '#00a14b', // Verde
    '#6ccff6', // Blu
    '#e5e9ec', // Grigio
  ];
  
  const handleColorSelect = async (color) => {
    try {
      await setMessageColor(messageId, color);
      onClose();
    } catch (error) {
      console.error('Errore nell\'impostazione del colore:', error);
    }
  };
  
  const handleClearColor = async () => {
    try {
      await clearMessageColor(messageId);
      onClose();
    } catch (error) {
      console.error('Errore nella rimozione del colore:', error);
    }
  };
  
  return (
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white rounded-lg shadow-lg z-50 p-2 flex flex-col gap-2">
      {colors.map((color) => (
        <button
          key={color}
          className="w-6 h-6 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{ backgroundColor: color }}
          onClick={() => handleColorSelect(color)}
          aria-label={`Imposta colore ${color}`}
        />
      ))}
      <button
        className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-red-500 hover:bg-gray-100"
        onClick={handleClearColor}
        aria-label="Rimuovi colore"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default MessageColorPicker;