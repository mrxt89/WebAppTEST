// src/components/notifications/NotificationsIndicator.jsx
import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../redux/features/notifications/notificationsHooks';
import { Bell, MessageSquare, ExternalLink } from 'lucide-react';

const NotificationsIndicator = () => {
  const { 
    unreadCount, 
    standaloneChats, 
    notifications, 
    fetchNotifications 
  } = useNotifications();
  
  const [hasStandaloneChats, setHasStandaloneChats] = useState(false);
  
  // Controllo periodico per verificare se ci sono chat in finestre separate
  useEffect(() => {
    setHasStandaloneChats(standaloneChats.length > 0);
    
    // Aggiorna le notifiche ogni 30 secondi per conteggio accurato
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [standaloneChats, fetchNotifications]);
  
  // Restituisci il componente UI
  return (
    <div className="relative">
      <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
        <Bell className="h-5 w-5 text-gray-600" />
        
        {/* Badge per notifiche non lette */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        
        {/* Indicatore per chat in finestre separate */}
        {hasStandaloneChats && (
          <span className="absolute -bottom-1 -right-1 bg-blue-100 text-blue-600 text-xs p-0.5 rounded-full">
            <ExternalLink className="h-3 w-3" />
          </span>
        )}
      </button>
    </div>
  );
};

export default NotificationsIndicator;