// src/components/NotificationConsentModal.jsx
import React, { useState, useEffect } from 'react';
import { Bell, Volume2, X } from 'lucide-react';
import notificationService from '../services/notifications/NotificationService';

const NotificationConsentModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(notificationService.audioInitialized);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    Notification.permission === "granted"
  );

  useEffect(() => {
    // Controlla se l'utente ha già concesso o negato esplicitamente i permessi
    const hasInteractedWithNotifications = 
      localStorage.getItem('notificationPermissionRequested') === 'true';
    
    if (!hasInteractedWithNotifications) {
      // Mostra il modal solo se non è già stato mostrato in precedenza
      setTimeout(() => {
        setShowModal(true);
      }, 1000); // Ritardo breve dopo il caricamento della pagina
    }
  }, []);

  const handleInitAudio = () => {
    // Inizializza l'audio
    notificationService.initAudio().then(success => {
      setAudioInitialized(success);
      
      // Se l'inizializzazione ha avuto successo, riproduci un suono di test
      if (success) {
        setTimeout(() => {
          notificationService.playNotificationSound();
        }, 500);
      }
    });
  };

  const handleRequestNotifications = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        setNotificationsEnabled(permission === 'granted');
        // Imposta il flag che indica che l'utente ha interagito con la richiesta
        localStorage.setItem('notificationPermissionRequested', 'true');
        // Aggiorna l'impostazione nel servizio
        notificationService.setWebNotificationSetting(permission === 'granted');
      });
    }
  };

  const handleClose = () => {
    setShowModal(false);
    localStorage.setItem('notificationPermissionRequested', 'true');
  };

  if (!showModal) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-lg p-4 w-80 border border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium">Attiva notifiche</h3>
        <button 
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={18} />
        </button>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">
        Per ricevere notifiche anche quando l'app è in background, abilita le seguenti funzionalità:
      </p>
      
      <div className="space-y-2 mb-3">
        <button 
          onClick={handleInitAudio}
          className={`w-full p-2 flex items-center justify-between border rounded-md 
            ${audioInitialized ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'}`}
        >
          <div className="flex items-center">
            <Volume2 className="h-4 w-4 mr-2 text-gray-700" />
            <span className="text-sm">Suoni di notifica</span>
          </div>
          {audioInitialized && (
            <span className="text-green-600 text-xs font-medium">✓</span>
          )}
        </button>
        
        <button 
          onClick={handleRequestNotifications}
          className={`w-full p-2 flex items-center justify-between border rounded-md 
            ${notificationsEnabled ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'}`}
        >
          <div className="flex items-center">
            <Bell className="h-4 w-4 mr-2 text-gray-700" />
            <span className="text-sm">Notifiche desktop</span>
          </div>
          {notificationsEnabled && (
            <span className="text-green-600 text-xs font-medium">✓</span>
          )}
        </button>
      </div>
      
      <button
        onClick={handleClose}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-2 rounded transition-colors"
      >
        Continua
      </button>
    </div>
  );
};

export default NotificationConsentModal;