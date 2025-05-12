// src/components/chat/PopoutButton.jsx
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useNotifications } from '../../redux/features/notifications/notificationsHooks';

const PopoutButton = ({ notificationId, title }) => {
  const dispatch = useDispatch();
  const { registerStandaloneChat } = useNotifications();
  
  const handlePopout = () => {
    // Registra questa chat come aperta in una finestra esterna
    registerStandaloneChat(notificationId);
    
    // Genera URL con parametri per la nuova finestra
    const url = `/standalone-chat/${notificationId}`;
    
    // Apri nuova finestra con dimensioni ottimali
    const width = Math.min(window.innerWidth * 0.8, 1200);
    const height = Math.min(window.innerHeight * 0.8, 800);
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const windowFeatures = [
      `width=${Math.floor(width)}`,
      `height=${Math.floor(height)}`,
      `left=${Math.floor(left)}`,
      `top=${Math.floor(top)}`,
      'resizable=yes',
      'scrollbars=yes',
      'status=yes',
      'location=yes',
      'toolbar=no',
      'menubar=no'
    ].join(',');
    
    const newWindow = window.open(
      url, 
      `chat_${notificationId}`,
      windowFeatures
    );
    
    // Dopo un breve ritardo, prova a impostare il focus sulla nuova finestra
    setTimeout(() => {
      if (newWindow) {
        newWindow.focus();
      }
    }, 100);
  };
  
  return (
    <button
      onClick={handlePopout}
      className="p-2 rounded-full hover:bg-gray-200 transition-colors"
      title="Apri in finestra separata"
    >
      <ExternalLink className="w-4 h-4 text-gray-600" />
    </button>
  );
};

export default PopoutButton;