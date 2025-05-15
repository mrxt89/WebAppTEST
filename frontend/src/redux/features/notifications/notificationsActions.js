// src/redux/features/notifications/notificationsActions.js
import axios from 'axios';
import { config } from '../../../config';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { setAttachmentsLoading, setNotificationAttachments, fetchNotificationById, sendNotification  } from './notificationsSlice';

// ActionCreator per inizializzare il worker
export const initializeNotificationsWorker = () => ({
  type: 'notifications/initialize'
});

// ActionCreator per forzare ricaricamento
export const reloadNotifications = (highPriority = false) => ({
  type: 'notifications/reload',
  payload: { highPriority }
});

// ActionCreator per fermare il worker
export const stopNotificationsWorker = () => ({
  type: 'notifications/stopWorker'
});

// Thunk per gestire gli allegati
export const fetchNotificationAttachments = createAsyncThunk(
  'notifications/fetchAttachments',
  async (notificationId, { dispatch, getState }) => {
    try {
      // Controlla se gli allegati sono già in cache
      const state = getState();
      const attachments = state.notifications.notificationAttachments[notificationId];
      
      if (attachments) {
        return attachments;
      }
      
      dispatch(setAttachmentsLoading(true));
      
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${config.API_BASE_URL}/notifications/${notificationId}/attachments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.data) {
        // Organizzare gli allegati per messageId
        const attachmentsByMessageId = {};
        
        response.data.forEach(att => {
          if (att.MessageID) {
            attachmentsByMessageId[att.MessageID] = attachmentsByMessageId[att.MessageID] || [];
            attachmentsByMessageId[att.MessageID].push(att);
          }
        });
        
        // Memorizzare i risultati
        dispatch(setNotificationAttachments({
          notificationId,
          attachments: attachmentsByMessageId
        }));
        
        return attachmentsByMessageId;
      }
      
      return {};
    } catch (error) {
      console.error('Error fetching notification attachments:', error);
      throw new Error('Errore nel recupero degli allegati');
    } finally {
      dispatch(setAttachmentsLoading(false));
    }
  }
);

export const uploadNotificationAttachment = createAsyncThunk(
  'notifications/uploadAttachment',
  async ({ notificationId, file, messageId = null }, { dispatch }) => {
    console.log('uploadNotificationAttachment called', { notificationId, file }); // Sposta qui
    try {
      dispatch(setAttachmentsLoading(true));
      
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      
      if (messageId !== null) {
        formData.append('messageId', messageId);
      }
      
      const response = await axios.post(
        `${config.API_BASE_URL}/notifications/${notificationId}/attachments`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      // Aggiornare gli allegati
      await dispatch(refreshAttachments(notificationId));
      
      return response.data;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw new Error('Errore nel caricamento dell\'allegato');
    } finally {
      dispatch(setAttachmentsLoading(false));
    }
  }
);

export const refreshAttachments = createAsyncThunk(
  'notifications/refreshAttachments',
  async (notificationId, { dispatch }) => {
    try {
      dispatch(setAttachmentsLoading(true));
      
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${config.API_BASE_URL}/notifications/${notificationId}/attachments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response && response.data) {
        // Organizza gli allegati per messageId
        const attachmentsByMessageId = {};
        
        response.data.forEach(att => {
          if (att.MessageID) {
            attachmentsByMessageId[att.MessageID] = attachmentsByMessageId[att.MessageID] || [];
            attachmentsByMessageId[att.MessageID].push(att);
          }
        });
        
        // Aggiorna lo stato
        dispatch(setNotificationAttachments({
          notificationId,
          attachments: attachmentsByMessageId
        }));
        
        // Emetti un evento per notificare i componenti
        const refreshEvent = new CustomEvent('attachments-refreshed', {
          detail: { notificationId, attachments: attachmentsByMessageId }
        });
        document.dispatchEvent(refreshEvent);
        
        return attachmentsByMessageId;
      }
      
      return null;
    } catch (error) {
      console.error('Error refreshing attachments:', error);
      return null;
    } finally {
      dispatch(setAttachmentsLoading(false));
    }
  }
);

export const deleteNotificationAttachment = createAsyncThunk(
  'notifications/deleteAttachment',
  async ({ attachmentId, notificationId }, { dispatch }) => {
    try {
      dispatch(setAttachmentsLoading(true));
      
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${config.API_BASE_URL}/notifications/attachments/${attachmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      // Aggiorna gli allegati dopo l'eliminazione
      if (notificationId) {
        await dispatch(refreshAttachments(notificationId));
      }
      
      return response.data;
    } catch (error) {
      console.error('Error deleting attachment:', error);
      throw new Error('Errore nell\'eliminazione dell\'allegato');
    } finally {
      dispatch(setAttachmentsLoading(false));
    }
  }
);

export const downloadNotificationAttachment = createAsyncThunk(
  'notifications/downloadAttachment',
  async ({ attachmentId, fileName }, { dispatch }) => {
    try {
      dispatch(setAttachmentsLoading(true));
      
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${config.API_BASE_URL}/notifications/attachments/${attachmentId}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob',
        }
      );

      // Crea un URL per il blob e avvia il download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error downloading attachment:', error);
      throw new Error('Errore nel download dell\'allegato');
    } finally {
      dispatch(setAttachmentsLoading(false));
    }
  }
);

export const sendNotificationWithAttachments = createAsyncThunk(
  'notifications/sendNotificationWithAttachments',
  async ({ notificationData, attachments = [] }, { dispatch }) => {
    try {
      // Set loading state
      dispatch(setAttachmentsLoading(true));
      
      // First send the base message
      let response;
      let notificationId = notificationData.notificationId;
      
      // Send message using the existing action
      response = await dispatch(sendNotification(notificationData)).unwrap();
      
      // If it was a new notification, update the ID
      if (notificationData.notificationId === 0 && response && response.notificationId) {
        notificationId = response.notificationId;
      }
      
      // If there are attachments, upload them one by one WITHOUT reloading notifications after each
      if (attachments && attachments.length > 0) {
        const uploadPromises = attachments.map(file => {
          return dispatch(uploadNotificationAttachment({
            notificationId,
            file
          }));
        });
        
        // Wait for all uploads to complete
        await Promise.all(uploadPromises);
        
        // After uploading all attachments, update the attachments list
        await dispatch(refreshAttachments(notificationId));
      }
      
      // Update the notification list ONCE after successful upload of all attachments
      if (notificationId > 0) {
        await dispatch(fetchNotificationById(notificationId));
      }
      
      return {
        success: true,
        notificationId: notificationId
      };
    } catch (error) {
      console.error('Error sending notification with attachments:', error);
      return {
        success: false,
        error: error.message || 'An error occurred while sending the message'
      };
    } finally {
      dispatch(setAttachmentsLoading(false));
    }
  }
);

export const removeUserFromChat = createAsyncThunk(
  'notifications/removeUserFromChat',
  async ({ notificationId, userToRemoveId }, { rejectWithValue, dispatch }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return rejectWithValue('No token available');
      
      const res = await axios.post(
        `${config.API_BASE_URL}/remove-user-from-chat`,
        { notificationId, userToRemoveId },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!res.data.success) {
        return rejectWithValue(res.data.message || 'Failed to remove user from chat');
      }

      // Aggiorna la notifica per riflettere i cambiamenti
      await dispatch(fetchNotificationById(notificationId));
      
      // Notifica altri componenti del cambiamento
      document.dispatchEvent(new CustomEvent('user-removed-from-chat', {
        detail: { 
          notificationId, 
          removedUserId: userToRemoveId,
          removedUserName: res.data.removedUserName,
          timestamp: new Date().getTime()
        }
      }));
      
      return {
        success: true,
        notificationId,
        removedUserId: userToRemoveId,
        message: res.data.message
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to remove user from chat');
    }
  }
);

// Aggiungi qui altre action creator per funzionalità avanzate