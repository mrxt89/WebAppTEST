// src/redux/features/notifications/NotificationProvider.jsx
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNotifications } from './notificationsHooks';
import notificationService from '../../../services/notifications/NotificationService';

/**
 * Proper NotificationProvider that initializes and connects the notification system
 * This replaces the placeholder from notificationsHooks.js
 */
export const NotificationProvider = ({ children }) => {
  const dispatch = useDispatch();
  const {
    initializeWorker,
    reloadNotifications,
    forceLoadNotifications
  } = useNotifications();

  // Initialize the notification worker on component mount
  useEffect(() => {
    initializeWorker();
    
    // Force reload notifications after a short delay to ensure initial data
    const timeoutId = setTimeout(() => {
      reloadNotifications(true); // high priority
    }, 1000);
    
    // Initialize audio system through user interaction
    const initAudioOnInteraction = () => {
      notificationService.initAudio()
        .then(success => {
          if (success) {
            // Remove event listeners after successful initialization
            document.removeEventListener('click', initAudioOnInteraction);
            document.removeEventListener('keydown', initAudioOnInteraction);
            document.removeEventListener('touchstart', initAudioOnInteraction);
          }
        });
    };
    
    // Add event listeners for audio initialization
    document.addEventListener('click', initAudioOnInteraction, { once: false });
    document.addEventListener('keydown', initAudioOnInteraction, { once: false });
    document.addEventListener('touchstart', initAudioOnInteraction, { once: false });
    
    // Setup periodic notification refresh
    const refreshInterval = setInterval(() => {
      forceLoadNotifications();
    }, 30000); // Every 30 seconds
    
    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
      clearInterval(refreshInterval);
      document.removeEventListener('click', initAudioOnInteraction);
      document.removeEventListener('keydown', initAudioOnInteraction);
      document.removeEventListener('touchstart', initAudioOnInteraction);
    };
  }, [initializeWorker, reloadNotifications, forceLoadNotifications]);

  // Listen for new-message-received events
useEffect(() => {
  const handleNewMessage = (event) => {
    const { notificationId, newMessageCount } = event.detail || {};
    
    if (notificationId && newMessageCount > 0) {
      // Forza refresh notifications per aggiornare UI
      forceLoadNotifications();
    }
  };
  
  document.addEventListener('new-message-received', handleNewMessage);
  
  return () => {
    document.removeEventListener('new-message-received', handleNewMessage);
  };
}, [forceLoadNotifications]);


  return <>{children}</>;
};

export default NotificationProvider;