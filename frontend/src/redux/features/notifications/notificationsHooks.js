// src/redux/features/notifications/notificationsHooks.js
import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { swal } from '../../../lib/common';
import {
  fetchNotifications,
  fetchNotificationById,
  createDBNotificationsView,
  sendNotification,
  toggleReadUnread,
  togglePin,
  toggleFavorite,
  archiveChat,
  unarchiveChat,
  reopenChat,
  closeChat,
  leaveChat,
  toggleMuteChat,
  updateChatTitle,
  registerOpenChat,
  unregisterOpenChat,
  markMessageAsReceived,
  resetNotificationError,
  isNotificationMuted,
  selectNotifications,
  selectUnreadCount,
  selectLoading,
  selectSending,
  selectError,
  selectUnreadMessages,
  selectOpenChatIds,
  selectDbViewCreated,
  selectHighlights,
  selectLoadingHighlights,
  selectAttachmentsLoading,
  selectNotificationAttachments,
} from './notificationsSlice';

// Import additional actions
import {
  initializeNotificationsWorker,
  reloadNotifications,
  stopNotificationsWorker,
  fetchNotificationAttachments,
  uploadNotificationAttachment,
  refreshAttachments,
  deleteNotificationAttachment,
  downloadNotificationAttachment,
  sendNotificationWithAttachments
} from './notificationsActions';

// Hook to provide all notification-related state and actions
export const useNotifications = () => {
  const dispatch = useDispatch();
  
  // Selectors
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const loading = useSelector(selectLoading);
  const sending = useSelector(selectSending);
  const error = useSelector(selectError);
  const unreadMessages = useSelector(selectUnreadMessages);
  const openChatIds = useSelector(selectOpenChatIds);
  const dbViewCreated = useSelector(selectDbViewCreated);
  const highlights = useSelector(selectHighlights);
  const loadingHighlights = useSelector(selectLoadingHighlights);
  const attachmentsLoading = useSelector(selectAttachmentsLoading);
  const notificationAttachments = useSelector(selectNotificationAttachments);

  // Worker management
  const initializeWorker = useCallback(() => {
    dispatch(initializeNotificationsWorker());
  }, [dispatch]);

  const restartNotificationWorker = useCallback((highPriority = false) => {
    dispatch(stopNotificationsWorker());
    dispatch(initializeNotificationsWorker());
    dispatch(reloadNotifications(highPriority));
    return true;
  }, [dispatch]);
  
  // Basic notification actions
  const loadNotifications = useCallback(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const getNotificationById = useCallback((notificationId) => {
    return dispatch(fetchNotificationById(notificationId)).unwrap();
  }, [dispatch]);

  const DBNotificationsView = useCallback(() => {
    return dispatch(createDBNotificationsView()).unwrap();
  }, [dispatch]);

  const handleSendNotification = useCallback((notificationData, isNewMessage = false) => {
    return dispatch(sendNotification(notificationData))
      .unwrap()
      .then((result) => {
        // Additional logic if needed
        if (isNewMessage) {
          // Close new message modal or similar actions
          document.dispatchEvent(new CustomEvent('closeNewMessageModal'));
        }
        return result;
      })
      .catch((error) => {
        swal.fire('Errore', error, 'error');
        return false;
      });
  }, [dispatch]);

  // Message and notification status changes
  const handleToggleReadUnread = useCallback((notificationId, isReadByUser) => {
    return dispatch(toggleReadUnread({ notificationId, isReadByUser }))
      .unwrap()
      .catch((error) => {
        console.error('Error toggling read status:', error);
        throw error;
      });
  }, [dispatch]);

  const handleTogglePin = useCallback((notificationId, pinned) => {
    return dispatch(togglePin({ notificationId, pinned }))
      .unwrap()
      .catch((error) => {
        swal.fire('Errore', error, 'error');
        throw error;
      });
  }, [dispatch]);

  const handleToggleFavorite = useCallback((notificationId, favorite) => {
    return dispatch(toggleFavorite({ notificationId, favorite }))
      .unwrap()
      .catch((error) => {
        swal.fire('Errore', error, 'error');
        throw error;
      });
  }, [dispatch]);

  // Chat status management (archive, close, leave)
  const handleArchiveChat = useCallback((notificationId) => {
    return dispatch(archiveChat(notificationId))
      .unwrap()
      .then((result) => {
        return { success: true, message: 'Chat archiviata con successo' };
      })
      .catch((error) => {
        console.error('Error archiving chat:', error);
        throw error;
      });
  }, [dispatch]);

  const handleUnarchiveChat = useCallback((notificationId) => {
    return dispatch(unarchiveChat(notificationId))
      .unwrap()
      .then((result) => {
        return { success: true, message: 'Chat rimossa dall\'archivio con successo' };
      })
      .catch((error) => {
        console.error('Error unarchiving chat:', error);
        throw error;
      });
  }, [dispatch]);

  const handleReopenChat = useCallback(async (notificationId) => {
    try {
      const { value: confirm } = await swal.fire({
        title: 'Riapri la chat?',
        icon: 'question',
        showCancelButton: true,
        cancelButtonText: 'Annulla',
        confirmButtonText: 'Riapri',
      });
      
      if (!confirm) return false;

      await dispatch(reopenChat(notificationId)).unwrap();
      return true;
    } catch (error) {
      console.error('Error reopening chat:', error);
      swal.fire('Errore', error, 'error');
      return false;
    }
  }, [dispatch]);

  const handleCloseChat = useCallback(async (notificationId) => {
    try {
      const { value: confirm } = await swal.fire({
        title: 'Vuoi segnalare la conversazione come chiusa?',
        icon: 'question',
        showCancelButton: true,
        cancelButtonText: 'Annulla',
        confirmButtonText: 'Conferma',
      });
      
      if (!confirm) return false;

      await dispatch(closeChat(notificationId)).unwrap();
      return true;
    } catch (error) {
      console.error('Error closing chat:', error);
      swal.fire('Errore', error, 'error');
      return false;
    }
  }, [dispatch]);

  const handleLeaveChat = useCallback(async (notificationId) => {
    try {
      const { value: confirm } = await swal.fire({
        title: 'Abbandonare la chat?',
        text: 'Non potrai più inviare messaggi in questa conversazione',
        icon: 'warning',
        showCancelButton: true,
        cancelButtonText: 'Annulla',
        confirmButtonText: 'Abbandona',
      });
      
      if (!confirm) return false;

      await dispatch(leaveChat(notificationId)).unwrap();
      return true;
    } catch (error) {
      console.error('Error leaving chat:', error);
      swal.fire('Errore', error.message, 'error');
      return false;
    }
  }, [dispatch]);

  const handleToggleMuteChat = useCallback((notificationId, isMuted, duration = null) => {
    return dispatch(toggleMuteChat({ notificationId, isMuted, duration }))
      .unwrap()
      .catch((error) => {
        swal.fire('Errore', error, 'error');
        throw error;
      });
  }, [dispatch]);

const forceLoadNotifications = useCallback(() => {
  console.log('Forzando il caricamento diretto delle notifiche...');
  
  // Usa setTimeout per evitare problemi con la chiamata durante un reducer
  setTimeout(() => {
    dispatch(fetchNotifications())
      .then(result => {
        console.log('Caricamento forzato completato, ricevute:', 
          result?.payload ? result.payload.length : 0, 'notifiche');
        
        // Configura l'event listener per i nuovi messaggi in un altro setTimeout
        // per assicurarsi che nessun reducer sia in esecuzione
        setTimeout(() => {
          const handleNewMessage = (event) => {
            const { notificationId } = event.detail || {};
            if (notificationId) {
              console.log('Nuovo messaggio ricevuto, aggiornamento forzato per:', notificationId);
              dispatch(fetchNotificationById(notificationId));
            }
          };
          
          // Rimuovi prima listener esistenti per evitare duplicati
          document.removeEventListener('new-message-received', handleNewMessage);
          document.addEventListener('new-message-received', handleNewMessage);
        }, 0);
      })
      .catch(error => {
        console.error('Errore nel caricamento forzato:', error);
      });
  }, 0);
  
  // Restituisci una promise già risolta per compatibilità
  return Promise.resolve(null);
}, [dispatch]);

  const handleUpdateChatTitle = useCallback(async (notificationId, newTitle) => {
    try {
      // Show loading indicator
      swal.fire({
        title: 'Aggiornamento in corso...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          swal.showLoading();
        }
      });
      
      await dispatch(updateChatTitle({ notificationId, newTitle })).unwrap();
      
      // Show success message
      swal.fire({
        icon: 'success',
        title: 'Titolo aggiornato',
        text: 'Il titolo della chat è stato aggiornato con successo',
        timer: 2000,
        showConfirmButton: false
      });
      
      return true;
    } catch (error) {
      console.error('Error updating chat title:', error);
      
      // Show error message
      swal.fire({
        icon: 'error',
        title: 'Errore',
        text: error || 'Non è stato possibile aggiornare il titolo'
      });
      
      return false;
    }
  }, [dispatch]);

  const handleRegisterOpenChat = useCallback((notificationId) => {
    dispatch(registerOpenChat(notificationId));
  }, [dispatch]);

  const handleUnregisterOpenChat = useCallback((notificationId) => {
    dispatch(unregisterOpenChat(notificationId));
  }, [dispatch]);

  const handleMarkMessageAsReceived = useCallback((notificationId, messageId) => {
    dispatch(markMessageAsReceived({ notificationId, messageId }));
  }, [dispatch]);

  const handleResetError = useCallback(() => {
    dispatch(resetNotificationError());
  }, [dispatch]);

  // Attachment management
  const getNotificationAttachments = useCallback((notificationId) => {
    return dispatch(fetchNotificationAttachments(notificationId)).unwrap();
  }, [dispatch]);

  const uploadAttachment = useCallback((notificationId, file, messageId = null) => {
    return dispatch(uploadNotificationAttachment({ notificationId, file, messageId })).unwrap();
  }, [dispatch]);

  const deleteAttachment = useCallback((attachmentId, notificationId) => {
    return dispatch(deleteNotificationAttachment({ attachmentId, notificationId })).unwrap();
  }, [dispatch]);

  const downloadAttachment = useCallback((attachmentId, fileName) => {
    return dispatch(downloadNotificationAttachment({ attachmentId, fileName })).unwrap();
  }, [dispatch]);

  const handleSendNotificationWithAttachments = useCallback((notificationData, attachments = []) => {
    return dispatch(sendNotificationWithAttachments({ notificationData, attachments })).unwrap();
  }, [dispatch]);

  const handleRefreshAttachments = useCallback((notificationId) => {
    return dispatch(refreshAttachments(notificationId)).unwrap();
  }, [dispatch]);

  const handleReloadNotifications = useCallback((highPriority = false) => {
  return dispatch(reloadNotifications(highPriority));
}, [dispatch]);

  return {
    // State
    notifications,
    unreadCount,
    loading,
    sending,
    error,
    unreadMessages,
    openChatIds: Array.from(openChatIds), // Convert Set to Array
    dbViewCreated,
    highlights,
    loadingHighlights,
    attachmentsLoading,
    notificationAttachments,
    
    // Worker management
    initializeWorker,
    restartNotificationWorker,
    forceLoadNotifications,
    reloadNotifications: handleReloadNotifications,
    
    // Basic notification actions
    loadNotifications,
    fetchNotificationById: getNotificationById,
    DBNotificationsView,
    sendNotification: handleSendNotification,
    
    // Message and notification status changes
    toggleReadUnread: handleToggleReadUnread,
    togglePin: handleTogglePin,
    toggleFavorite: handleToggleFavorite,
    markMessageAsReceived: handleMarkMessageAsReceived,
    
    // Chat status management
    archiveChat: handleArchiveChat,
    unarchiveChat: handleUnarchiveChat,
    reopenChat: handleReopenChat,
    closeChat: handleCloseChat,
    leaveChat: handleLeaveChat,
    toggleMuteChat: handleToggleMuteChat,
    updateChatTitle: handleUpdateChatTitle,
    
    // Open chat tracking
    registerOpenChat: handleRegisterOpenChat,
    unregisterOpenChat: handleUnregisterOpenChat,
    
    // Error handling
    resetError: handleResetError,
    
    // Attachments
    getNotificationAttachments,
    uploadNotificationAttachment: uploadAttachment,
    deleteNotificationAttachment: deleteAttachment,
    downloadNotificationAttachment: downloadAttachment,
    sendNotificationWithAttachments: handleSendNotificationWithAttachments,
    refreshAttachments: handleRefreshAttachments,
    
    // Utility functions
    isNotificationMuted,
  };
};

// Adding a simple dummy NotificationProvider export to fix the import error
// This doesn't actually provide any functionality but will make the import work
export const NotificationProvider = ({ children }) => {
  // In a real implementation, we would create a context provider here
  return children;
};

export default useNotifications;