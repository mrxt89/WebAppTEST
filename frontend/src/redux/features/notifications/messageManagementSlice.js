// src/redux/features/notifications/messageManagementSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { config } from '../../../config';
import { fetchNotificationById } from './notificationsSlice';

// Async thunk for editing a message
export const editMessage = createAsyncThunk(
  'messageManagement/editMessage',
  async ({ messageId, newMessage }, { rejectWithValue, dispatch }) => {
    try {
      if (!messageId) {
        return rejectWithValue('Invalid messageId provided');
      }
      
      if (!newMessage || !newMessage.trim()) {
        return rejectWithValue('Message content cannot be empty');
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        return rejectWithValue('No authentication token available');
      }
      
      const response = await axios.post(
        `${config.API_BASE_URL}/messages/${messageId}/edit`,
        { newMessage },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data && response.data.Success) {
        // If operation succeeded, update the notification to show changes
        if (response.data.NotificationId) {
          dispatch(fetchNotificationById(response.data.NotificationId));
          
          // Emit an event for other components
          const event = new CustomEvent('message-edited', {
            detail: {
              messageId,
              notificationId: response.data.NotificationId,
              timestamp: new Date().toISOString()
            }
          });
          document.dispatchEvent(event);
        }
        
        return {
          success: true,
          message: response.data.Message || 'Message edited successfully',
          notificationId: response.data.NotificationId,
          messageId
        };
      } else {
        return rejectWithValue(response.data?.Message || 'Error editing message');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      return rejectWithValue(error.message || 'Failed to edit message');
    }
  }
);

// Async thunk for getting message version history
export const getMessageVersionHistory = createAsyncThunk(
  'messageManagement/getVersionHistory',
  async (messageId, { rejectWithValue }) => {
    try {
      if (!messageId) {
        return rejectWithValue('Invalid messageId provided');
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        return rejectWithValue('No authentication token available');
      }
      
      const response = await axios.get(
        `${config.API_BASE_URL}/messages/${messageId}/versions`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data && response.data.success) {
        return {
          messageId,
          currentMessage: response.data.currentMessage,
          versionHistory: response.data.versionHistory || []
        };
      } else {
        return rejectWithValue(response.data?.message || 'Error retrieving version history');
      }
    } catch (error) {
      console.error('Error fetching message versions:', error);
      return rejectWithValue(error.message || 'Failed to retrieve version history');
    }
  }
);

// Async thunk for deleting a message
export const deleteMessage = createAsyncThunk(
  'messageManagement/deleteMessage',
  async (messageId, { rejectWithValue, dispatch }) => {
    try {
      if (!messageId) {
        return rejectWithValue('Invalid messageId provided');
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        return rejectWithValue('No authentication token available');
      }
      
      const response = await axios.delete(
        `${config.API_BASE_URL}/messages/${messageId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data && response.data.success) {
        // If we have the notification ID, update the notification data
        if (response.data.notificationId) {
          dispatch(fetchNotificationById(response.data.notificationId));
          
          // Emit an event for other components
          const event = new CustomEvent('message-deleted', {
            detail: {
              messageId,
              notificationId: response.data.notificationId
            }
          });
          document.dispatchEvent(event);
        }
        
        return {
          success: true,
          messageId,
          notificationId: response.data.notificationId
        };
      } else {
        return rejectWithValue(response.data?.message || 'Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      return rejectWithValue(error.message || 'Failed to delete message');
    }
  }
);

// Async thunk for setting a message color
export const setMessageColor = createAsyncThunk(
  'messageManagement/setMessageColor',
  async ({ messageId, color }, { rejectWithValue, dispatch, getState }) => {
    try {
      if (!messageId) {
        return rejectWithValue('Invalid messageId provided');
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        return rejectWithValue('No authentication token available');
      }
      
      const response = await axios.post(
        `${config.API_BASE_URL}/set-message-color`,
        { messageId, color },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data && response.data.success) {
        // Find the notification containing this message
        let notificationId = null;
        const state = getState();
        
        if (state.notifications && state.notifications.notifications) {
          for (const notification of state.notifications.notifications) {
            // Check if the notification has messages
            if (!notification.messages) continue;
            
            // Parse messages if needed
            const messages = typeof notification.messages === 'string'
              ? JSON.parse(notification.messages)
              : notification.messages;
            
            // Check if this notification contains the message
            if (Array.isArray(messages) && messages.some(msg => msg.messageId === messageId)) {
              notificationId = notification.notificationId;
              break;
            }
          }
        }
        
        if (notificationId) {
          // Update the notification to reflect the color change
          dispatch(fetchNotificationById(notificationId));
          
          // Emit an event for other components
          const event = new CustomEvent('message-color-changed', {
            detail: {
              messageId,
              notificationId,
              color
            }
          });
          document.dispatchEvent(event);
        }
        
        return {
          success: true,
          messageId,
          color,
          notificationId
        };
      } else {
        return rejectWithValue(response.data?.message || 'Failed to set message color');
      }
    } catch (error) {
      console.error('Error setting message color:', error);
      return rejectWithValue(error.message || 'Failed to set message color');
    }
  }
);

// Async thunk for clearing a message color
export const clearMessageColor = createAsyncThunk(
  'messageManagement/clearMessageColor',
  async (messageId, { rejectWithValue, dispatch, getState }) => {
    try {
      if (!messageId) {
        return rejectWithValue('Invalid messageId provided');
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        return rejectWithValue('No authentication token available');
      }
      
      const response = await axios.post(
        `${config.API_BASE_URL}/clear-message-color`,
        { messageId },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data && response.data.success) {
        // Find the notification containing this message
        let notificationId = null;
        const state = getState();
        
        if (state.notifications && state.notifications.notifications) {
          for (const notification of state.notifications.notifications) {
            // Check if the notification has messages
            if (!notification.messages) continue;
            
            // Parse messages if needed
            const messages = typeof notification.messages === 'string'
              ? JSON.parse(notification.messages)
              : notification.messages;
            
            // Check if this notification contains the message
            if (Array.isArray(messages) && messages.some(msg => msg.messageId === messageId)) {
              notificationId = notification.notificationId;
              break;
            }
          }
        }
        
        if (notificationId) {
          // Update the notification to reflect the color change
          dispatch(fetchNotificationById(notificationId));
          
          // Emit an event for other components
          const event = new CustomEvent('message-color-changed', {
            detail: {
              messageId,
              notificationId,
              color: null
            }
          });
          document.dispatchEvent(event);
        }
        
        return {
          success: true,
          messageId,
          notificationId
        };
      } else {
        return rejectWithValue(response.data?.message || 'Failed to clear message color');
      }
    } catch (error) {
      console.error('Error clearing message color:', error);
      return rejectWithValue(error.message || 'Failed to clear message color');
    }
  }
);

// Async thunk for filtering messages by color or text
export const filterMessages = createAsyncThunk(
  'messageManagement/filterMessages',
  async ({ notificationId, color, searchText, messageType }, { rejectWithValue }) => {
    try {
      if (!notificationId) {
        return rejectWithValue('Invalid notificationId provided');
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        return rejectWithValue('No authentication token available');
      }
      
      let url = `${config.API_BASE_URL}/filter-messages?notificationId=${notificationId}`;
      
      if (color) {
        url += `&color=${encodeURIComponent(color)}`;
      }
      
      if (searchText) {
        url += `&searchText=${encodeURIComponent(searchText)}`;
      }

      if (messageType && messageType !== 'all') {
        url += `&messageType=${encodeURIComponent(messageType)}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data) {
        // Adattamento al nuovo formato dei messaggi
        const messages = Array.isArray(response.data) ? response.data : [];
        
        // Se stiamo filtrando per sondaggi, verifichiamo che i messaggi contengano effettivamente un sondaggio
        let filteredMessages = messages;
        if (messageType === 'polls') {
          filteredMessages = messages.filter(msg => {
            // Verifica se il messaggio contiene un sondaggio
            return msg.message && (
              msg.message.includes('**Sondaggio creato**') || 
              msg.pollId || 
              msg.messageType === 'poll'
            );
          });
        }
        
        return {
          notificationId,
          filteredMessages,
          totalFound: filteredMessages.length,
          filter: { color, searchText, messageType }
        };
      } else {
        return rejectWithValue('Failed to filter messages');
      }
    } catch (error) {
      console.error('Error filtering messages:', error);
      return rejectWithValue(error.message || 'Failed to filter messages');
    }
  }
);

// Message management slice
const messageManagementSlice = createSlice({
  name: 'messageManagement',
  initialState: {
    versionHistory: {}, // Organized by messageId
    filteredMessages: {}, // Organized by notificationId
    loading: false,
    error: null
  },
  reducers: {
    clearVersionHistory: (state, action) => {
      if (action.payload) {
        // Clear history for a specific message
        const messageId = action.payload;
        delete state.versionHistory[messageId];
      } else {
        // Clear all version history
        state.versionHistory = {};
      }
    },
    clearFilteredMessages: (state, action) => {
      if (action.payload) {
        // Clear filtered messages for a specific notification
        const notificationId = action.payload;
        delete state.filteredMessages[notificationId];
      } else {
        // Clear all filtered messages
        state.filteredMessages = {};
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Edit message
      .addCase(editMessage.pending, (state) => {
        state.loading = true;
      })
      .addCase(editMessage.fulfilled, (state, action) => {
        state.loading = false;
        // We don't update any state here directly, as we use fetchNotificationById
      })
      .addCase(editMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get message version history
      .addCase(getMessageVersionHistory.pending, (state) => {
        state.loading = true;
      })
      .addCase(getMessageVersionHistory.fulfilled, (state, action) => {
        state.loading = false;
        const { messageId, currentMessage, versionHistory } = action.payload;
        state.versionHistory[messageId] = {
          current: currentMessage,
          versions: versionHistory
        };
      })
      .addCase(getMessageVersionHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete message
      .addCase(deleteMessage.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteMessage.fulfilled, (state, action) => {
        state.loading = false;
        // We don't update any state here directly, as we use fetchNotificationById
      })
      .addCase(deleteMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Set message color
      .addCase(setMessageColor.pending, (state) => {
        state.loading = true;
      })
      .addCase(setMessageColor.fulfilled, (state, action) => {
        state.loading = false;
        // We don't update any state here directly, as we use fetchNotificationById
      })
      .addCase(setMessageColor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Clear message color
      .addCase(clearMessageColor.pending, (state) => {
        state.loading = true;
      })
      .addCase(clearMessageColor.fulfilled, (state, action) => {
        state.loading = false;
        // We don't update any state here directly, as we use fetchNotificationById
      })
      .addCase(clearMessageColor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Filter messages
      .addCase(filterMessages.pending, (state) => {
        state.loading = true;
      })
      .addCase(filterMessages.fulfilled, (state, action) => {
        state.loading = false;
        const { notificationId, filteredMessages, totalFound, filter } = action.payload;
        state.filteredMessages[notificationId] = {
          messages: filteredMessages,
          count: totalFound,
          filter
        };
      })
      .addCase(filterMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

// Export actions
export const { clearVersionHistory, clearFilteredMessages } = messageManagementSlice.actions;

// Export selectors
export const selectVersionHistory = (state, messageId) => 
  state.messageManagement.versionHistory[messageId] || null;
export const selectFilteredMessages = (state, notificationId) => 
  state.messageManagement.filteredMessages[notificationId] || null;
export const selectMessageManagementLoading = (state) => 
  state.messageManagement.loading;
export const selectMessageManagementError = (state) => 
  state.messageManagement.error;

export default messageManagementSlice.reducer;