// src/redux/features/notifications/notificationsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { enableMapSet } from "immer";
import axios from "axios";
import { config } from "../../../config";
import { removeUserFromChat, fetchChatParticipants } from "./notificationsActions";

// Abilita il supporto per Map e Set in Immer
enableMapSet();

let openChatModalRef = null;

// Funzione helper per il parsing dei messaggi
const parseMessages = (messages) => {
  if (!messages) return [];
  if (typeof messages === "string") {
    try {
      return JSON.parse(messages);
    } catch (error) {
      console.error("Error parsing messages:", error);
      return [];
    }
  }
  return messages;
};

// Funzione helper per ottenere l'ID utente corrente
const getUserId = () => {
  const user = localStorage.getItem("user");
  if (user) {
    try {
      return JSON.parse(user).UserId;
    } catch (e) {
      console.error("Error parsing user from localStorage", e);
    }
  }
  return null;
};

// Funzione per registrare la callback per l'apertura della chat
export const registerOpenChatModal = (callback) => {
  openChatModalRef = callback;
};

// Funzione per chiamare openChatModal
export const callOpenChatModal = (notificationId) => {
  if (openChatModalRef && typeof openChatModalRef === 'function') {
    openChatModalRef(notificationId);
  } else {
    console.error('openChatModal non è stato registrato');
  }
};

// Async thunks per le operazioni asincrone
export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return rejectWithValue("No token available");

      const response = await axios.get(`${config.API_BASE_URL}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
         "Cache-Control": "no-cache",
        },
      });

     if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
       console.warn("Nessuna notifica ricevuta dal server, verifica il backend.");
      }

      return response.data;
    } catch (error) {
      console.error("Errore in fetchNotifications:", error);
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", error.response.data);
      }

     if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        return rejectWithValue({
          type: "auth_error",
          message: "Session expired",
        });
      }
      return rejectWithValue(error.message);
    }
  },
);

export const fetchNotificationById = createAsyncThunk(
  "notifications/fetchNotificationById",
  async (notificationId, { rejectWithValue, getState }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("Token mancante per fetchNotificationById");
        return rejectWithValue("No token available");
      }

      if (!notificationId) {
        console.error("ID notifica mancante per fetchNotificationById");
        return rejectWithValue("No notification ID provided");
      }

      // IMPORTANTE: Usa sempre openChat=1 per ottenere TUTTI i messaggi
      const timestamp = Date.now();
      const response = await axios.get(
        `${config.API_BASE_URL}/notifications/${notificationId}?t=${timestamp}&openChat=1&allMessages=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache, no-store",
            Pragma: "no-cache",
          },
        },
      );

      if (response.data) {
        const event = new CustomEvent("notification-updated", {
          detail: {
            notificationId,
            timestamp: new Date().toISOString(),
            isOpenChat: true
          },
        });
        document.dispatchEvent(event);

        const hasMessages = Array.isArray(response.data.messages) || 
          (typeof response.data.messages === "string" && response.data.messages);

        if (!hasMessages) {
          console.warn(`Notifica ${notificationId} ricevuta senza messaggi`, response.data);
        }

        // Log per debug
        const messageCount = Array.isArray(response.data.messages) 
          ? response.data.messages.length 
          : (typeof response.data.messages === "string" ? JSON.parse(response.data.messages || "[]").length : 0);
        
        console.log(`✅ fetchNotificationById: Caricati ${messageCount} messaggi per chat ${notificationId}`);

        return response.data;
      }

      console.error(`Notifica ${notificationId} non trovata o risposta vuota`);
      return rejectWithValue("Notification not found");
    } catch (error) {
      console.error("Error fetching notification:", error);
      return rejectWithValue(error.message || "Error fetching notification");
    }
  },
);

// Nuovo thunk per caricare più messaggi
export const loadMoreMessages = createAsyncThunk(
  "notifications/loadMoreMessages",
  async ({ notificationId, lastMessageId, pageSize = 25 }, { rejectWithValue, getState }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return rejectWithValue("No token available");

      console.log(`📄 loadMoreMessages - Richiesta API:`, {
        url: `${config.API_BASE_URL}/notifications/${notificationId}?pageSize=${pageSize}&lastMessageId=${lastMessageId}&openChat=1`,
        notificationId,
        lastMessageId,
        pageSize
      });

      const response = await axios.get(
        `${config.API_BASE_URL}/notifications/${notificationId}?pageSize=${pageSize}&lastMessageId=${lastMessageId}&openChat=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
        },
      );

      console.log(`📥 loadMoreMessages - Risposta API:`, {
        status: response.status,
        dataKeys: Object.keys(response.data || {}),
        hasMessages: !!response.data?.messages
      });

      if (!response.data) {
        return rejectWithValue("No data received");
      }

      // Estrai i messaggi dalla risposta
      let messages = [];
      if (response.data.messages) {
        if (typeof response.data.messages === 'string') {
          try {
            messages = JSON.parse(response.data.messages);
            console.log(`📦 Parsed string messages: ${messages.length} messaggi`);
          } catch (e) {
            console.error('Error parsing messages:', e);
            messages = [];
          }
        } else if (Array.isArray(response.data.messages)) {
          messages = response.data.messages;
          console.log(`📦 Array messages: ${messages.length} messaggi`);
        }
      }

      console.log(`✅ loadMoreMessages - Risultato:`, {
        numeroMessaggi: messages.length,
        primoId: messages[0]?.messageId,
        ultimoId: messages[messages.length - 1]?.messageId,
        hasMoreMessages: response.data.hasMoreMessages,
        totalMessageCount: response.data.totalMessageCount
      });

      return {
        notificationId,
        newMessages: messages,
        hasMoreMessages: response.data.hasMoreMessages || false,
        totalMessageCount: response.data.totalMessageCount || 0
      };
    } catch (error) {
      console.error("❌ Error loading more messages:", error);
      return rejectWithValue(error.message || "Failed to load more messages");
    }
  },
);


export const createDBNotificationsView = createAsyncThunk(
  "notifications/createDBNotificationsView",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return rejectWithValue("No token available");

      const response = await axios.get(
        `${config.API_BASE_URL}/DBNotificationsView`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return response.data;
    } catch (error) {
      return rejectWithValue("Failed to create notifications view");
    }
  },
);

export const sendNotification = createAsyncThunk(
  "notifications/sendNotification",
  async (notificationData, { rejectWithValue, dispatch }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return rejectWithValue("No token available");

      const res = await axios.post(
        `${config.API_BASE_URL}/send-notification`,
        notificationData,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.data.success) {
        return rejectWithValue(res.data.msg || "Error sending notification");
      }

      // IMPORTANTE: Il backend ora restituisce i dati aggiornati inclusi i messaggi
      const result = res.data;
      
      // Se abbiamo i messaggi aggiornati, trova l'ultimo messaggio (quello appena inviato)
      if (result.messages && Array.isArray(result.messages) && result.messages.length > 0) {
        // Ordina i messaggi per data e prendi l'ultimo
        const sortedMessages = [...result.messages].sort((a, b) => 
          new Date(b.tbCreated) - new Date(a.tbCreated)
        );
        
        const lastMessage = sortedMessages[0];
        
        // Aggiungi il messageId reale al risultato
        result.realMessageId = lastMessage.messageId;
        result.lastMessage = lastMessage;
      }

      return result;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to send notification");
    }
  },
);

export const toggleReadUnread = createAsyncThunk(
  "notifications/toggleReadUnread",
  async ({ notificationId, isReadByUser }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return rejectWithValue("No token available");

      const res = await axios.post(
        `${config.API_BASE_URL}/mark-as-read`,
        { notificationId, isReadByUser },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.data.success) {
        return rejectWithValue("Failed to update read status");
      }

      // Se stiamo aprendo la chat e ci sono notifiche reazione, emetti evento
      if (isReadByUser && res.data.reactionNotifications && res.data.reactionNotifications.length > 0) {
        console.log(`🎯 [DEBUG] Frontend: Notifiche reazione ricevute da mark-as-read:`, res.data.reactionNotifications);
        
        // Emetti evento per il componente chat
        document.dispatchEvent(new CustomEvent('reaction-notifications-received', {
          detail: {
            notificationId,
            reactionNotifications: res.data.reactionNotifications
          }
        }));
      }

      return { 
        notificationId, 
        isReadByUser,
        reactionNotifications: res.data.reactionNotifications || []
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to toggle read status");
    }
  },
);

export const togglePin = createAsyncThunk(
  "notifications/togglePin",
  async ({ notificationId, pinned }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return rejectWithValue("No token available");

      const res = await axios.post(
        `${config.API_BASE_URL}/toggle-pin`,
        { notificationId, pinned },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.data.success) {
        return rejectWithValue("Failed to update pin status");
      }

      return { notificationId, pinned };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to toggle pin status");
    }
  },
);

export const toggleFavorite = createAsyncThunk(
  "notifications/toggleFavorite",
  async ({ notificationId, favorite }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return rejectWithValue("No token available");

      const res = await axios.post(
        `${config.API_BASE_URL}/toggle-favorite`,
        { notificationId, favorite },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.data.success) {
        return rejectWithValue("Failed to update favorite status");
      }

      return { notificationId, favorite };
    } catch (error) {
     return rejectWithValue(error.message || "Failed to toggle favorite status");
    }
  },
);

export const archiveChat = createAsyncThunk(
  "notifications/archiveChat",
  async (notificationId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return rejectWithValue("No token available");

      const res = await axios.post(
        `${config.API_BASE_URL}/archive-chat`,
        { notificationId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.data.success) {
        return rejectWithValue(res.data.message || "Failed to archive chat");
      }

      document.dispatchEvent(
        new CustomEvent("chat-status-changed", {
          detail: {
            notificationId: notificationId,
            action: "archived",
            timestamp: new Date().getTime(),
          },
        }),
      );

      return { notificationId, archived: 1 };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to archive chat");
    }
  },
);

export const unarchiveChat = createAsyncThunk(
  "notifications/unarchiveChat",
  async (notificationId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return rejectWithValue("No token available");

      const res = await axios.post(
        `${config.API_BASE_URL}/unarchive-chat`,
        { notificationId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.data.success) {
        return rejectWithValue(res.data.message || "Failed to unarchive chat");
      }

      document.dispatchEvent(
        new CustomEvent("chat-status-changed", {
          detail: {
            notificationId: notificationId,
            action: "unarchived",
            timestamp: new Date().getTime(),
          },
        }),
      );

      return { notificationId, archived: 0 };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to unarchive chat");
    }
  },
);

export const reopenChat = createAsyncThunk(
  "notifications/reopenChat",
  async (notificationId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return rejectWithValue("No token available");

      const res = await axios.post(
        `${config.API_BASE_URL}/reopen-chat`,
        { notificationId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.data.success) {
        return rejectWithValue("Failed to reopen chat");
      }

      return { notificationId, isClosed: false };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to reopen chat");
    }
  },
);

export const closeChat = createAsyncThunk(
  "notifications/closeChat",
  async (notificationId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return rejectWithValue("No token available");

      const res = await axios.post(
        `${config.API_BASE_URL}/close-chat`,
        { notificationId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.data.success) {
        return rejectWithValue("Failed to close chat");
      }

      return { notificationId, isClosed: true };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to close chat");
    }
  },
);

export const leaveChat = createAsyncThunk(
  "notifications/leaveChat",
  async (notificationId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return rejectWithValue("No token available");

      const res = await axios.post(
        `${config.API_BASE_URL}/leave-chat`,
        { notificationId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.data.Success) {
        return rejectWithValue("Failed to leave chat");
      }

      return { notificationId, chatLeft: 1 };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to leave chat");
    }
  },
);

export const toggleMuteChat = createAsyncThunk(
  "notifications/toggleMuteChat",
  async ({ notificationId, isMuted, duration }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return rejectWithValue("No token available");

      const res = await axios.post(
        `${config.API_BASE_URL}/toggle-mute-chat`,
        { notificationId, isMuted, duration },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.data.success) {
        return rejectWithValue("Failed to update mute status");
      }

      let muteExpiryDate = null;
      if (duration && isMuted) {
        const now = new Date();
        switch (duration) {
          case "8h":
            muteExpiryDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
            break;
          case "1d":
            muteExpiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            break;
          case "7d":
            muteExpiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
        }
      }

      try {
       const mutedChats = JSON.parse(localStorage.getItem("mutedChats") || "{}");

        if (isMuted) {
          mutedChats[notificationId] = {
            isMuted: true,
            expiryDate: muteExpiryDate,
          };
        } else {
          delete mutedChats[notificationId];
        }

        localStorage.setItem("mutedChats", JSON.stringify(mutedChats));
      } catch (e) {
        console.error("Error updating localStorage muted chats:", e);
      }

      return { notificationId, isMuted, muteExpiryDate };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to toggle mute status");
    }
  },
);

export const updateChatTitle = createAsyncThunk(
  "notifications/updateChatTitle",
  async ({ notificationId, newTitle }, { rejectWithValue, dispatch }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return rejectWithValue("No token available");

      if (!newTitle || !newTitle.trim()) {
        return rejectWithValue("Title cannot be empty");
      }

      if (!notificationId) {
        return rejectWithValue("Invalid notification ID");
      }

      const response = await axios.post(
        `${config.API_BASE_URL}/update-chat-title`,
        { notificationId, title: newTitle },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!response.data || !response.data.success) {
       return rejectWithValue(response.data?.message || "Failed to update title");
      }

      dispatch(fetchNotificationById(notificationId, true));

      document.dispatchEvent(
        new CustomEvent("chat-title-updated", {
          detail: {
            notificationId,
            newTitle,
          },
        }),
      );

      return { notificationId, title: newTitle };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to update chat title");
    }
  },
);

// Helper function to filter messages after leaving chat
const filterMessagesAfterLeaving = (messages, chatLeft) => {
 if (!chatLeft || !Array.isArray(messages) || messages.length === 0) {
   return messages;
 }

 const leaveIndex = messages.findIndex(
   (msg) =>
     msg.message &&
     msg.message.includes("ha lasciato la chat") &&
     msg.senderId === getUserId(),
 );

 if (leaveIndex !== -1) {
   return messages.slice(0, leaveIndex + 1);
 }

 return messages;
};

// Notifications slice
const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    notifications: [],
    paginatedNotifications: [],
    notificationsPagination: {
      currentPage: 1,
      pageSize: 20,
      totalPages: 0,
      totalNotifications: 0,
      hasMore: false,
      isLoadingMore: false
    },
    openChatData: {}, // NUOVO: Storage per dati completi delle chat aperte
    chatPagination: {},
    chatDrafts: {}, // NUOVO: Storage per i draft dei messaggi in composizione
    unreadCount: 0,
    pendingUnreadCount: null,
    unreadCountLastModified: null,
    loading: true,
    sending: false,
    error: null,
    unreadMessages: [],
    openChatIds: new Set(),
    standaloneChats: new Set(),
    dbViewCreated: false,
    highlights: {},
    loadingHighlights: false,
    attachmentsLoading: false,
    notificationAttachments: {},
    optimisticUpdateInProgress: false, // NUOVO: Flag per aggiornamenti ottimistici
  },
  reducers: {
    initChatPagination: (state, action) => {
      const { notificationId } = action.payload;
      state.chatPagination[notificationId] = {
        hasMoreMessages: true,
        isLoadingMore: false,
        oldestMessageId: null,
      };
    },
    setPendingUnreadCount: (state, action) => {
      state.pendingUnreadCount = action.payload.count;
      state.unreadCountLastModified = action.payload.timestamp;
    },
    
    clearPendingUnreadCount: (state) => {
      state.pendingUnreadCount = null;
      state.unreadCountLastModified = null;
    },
    
    updateUnreadCount: (state, action) => {
      // Se abbiamo una modifica pendente recente (< 5 secondi), ignora l'update del worker
      if (state.unreadCountLastModified && 
          Date.now() - state.unreadCountLastModified < 5000) {
        console.log('[Redux] Ignorando update del worker, modifica locale in corso');
        return;
      }
      state.unreadCount = action.payload;
    },
    appendPaginatedNotifications: (state, action) => {
      const { notifications, metadata } = action.payload;
      
      // Evita duplicati
      const existingIds = new Set(state.paginatedNotifications.map(n => n.notificationId));
      const newNotifications = notifications.filter(n => !existingIds.has(n.notificationId));
      
      state.paginatedNotifications = [...state.paginatedNotifications, ...newNotifications];
      state.notificationsPagination = {
        ...state.notificationsPagination,
        ...metadata,
        isLoadingMore: false
      };
    },
    updatePaginatedNotification: (state, action) => {
      const { notificationId, updates } = action.payload;
      
      // Trova e aggiorna la notifica nelle notifiche paginate
      const index = state.paginatedNotifications.findIndex(
        n => n.notificationId === notificationId
      );
      
      if (index !== -1) {
        state.paginatedNotifications[index] = {
          ...state.paginatedNotifications[index],
          ...updates
        };
      }
      
      // Aggiorna anche nelle notifiche normali se presente
      const normalIndex = state.notifications.findIndex(
        n => n.notificationId === notificationId
      );
      
      if (normalIndex !== -1) {
        state.notifications[normalIndex] = {
          ...state.notifications[normalIndex],
          ...updates
        };
      }
    },
    resetPaginatedNotifications: (state) => {
      state.paginatedNotifications = [];
      state.notificationsPagination = {
        currentPage: 1,
        pageSize: 20,
        totalPages: 0,
        totalNotifications: 0,
        hasMore: false,
        isLoadingMore: false
      };
    },
    
    setLoadingMore: (state, action) => {
      state.notificationsPagination.isLoadingMore = action.payload;
    },
    
    updateUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    
    setOptimisticUpdateInProgress: (state, action) => {
      state.optimisticUpdateInProgress = action.payload;
    },
    // NUOVO: Sostituisci messaggio temporaneo con quello reale
    replaceTemporaryMessage: (state, action) => {
      const { notificationId, tempMessageId, realMessage } = action.payload;
      
      if (state.openChatData[notificationId]) {
        const messages = Array.isArray(state.openChatData[notificationId].messages)
          ? state.openChatData[notificationId].messages
          : JSON.parse(state.openChatData[notificationId].messages || "[]");
        
        // Trova e sostituisci il messaggio temporaneo
        const messageIndex = messages.findIndex(m => m.messageId === tempMessageId);
        if (messageIndex !== -1) {
          messages[messageIndex] = {
            ...messages[messageIndex],
            ...realMessage,
            _isTemporary: false
          };
          state.openChatData[notificationId].messages = messages;
        }
      }
    },
    // NUOVO: Aggiorna messaggio modificato in openChatData
    updateMessageInOpenChat: (state, action) => {
      const { notificationId, messageId, updatedMessage } = action.payload;
      
      if (state.openChatData[notificationId]) {
        const messages = Array.isArray(state.openChatData[notificationId].messages)
          ? state.openChatData[notificationId].messages
          : JSON.parse(state.openChatData[notificationId].messages || "[]");
        
        // Trova e aggiorna il messaggio
        const messageIndex = messages.findIndex(m => m.messageId === messageId);
        if (messageIndex !== -1) {
          messages[messageIndex] = {
            ...messages[messageIndex],
            message: updatedMessage,
            isEdited: "1",
            lastEditedAt: new Date().toISOString()
          };
          
          // IMPORTANTE: Aggiorna openChatData con i messaggi modificati
          state.openChatData[notificationId] = {
            ...state.openChatData[notificationId],
            messages: messages,
            lastUpdate: Date.now() // Aggiungi timestamp di aggiornamento
          };
        }
      }
      
      // Aggiorna anche la notifica nella sidebar se necessario
      const notification = state.notifications.find(n => n.notificationId === notificationId);
      if (notification) {
        const messages = Array.isArray(notification.messages) 
          ? notification.messages 
          : (typeof notification.messages === 'string' ? JSON.parse(notification.messages || '[]') : []);
        
        const messageIndex = messages.findIndex(m => m.messageId === messageId);
        if (messageIndex !== -1) {
          messages[messageIndex] = {
            ...messages[messageIndex],
            message: updatedMessage,
            isEdited: "1",
            lastEditedAt: new Date().toISOString()
          };
          notification.messages = messages;
        }
      }
    },
    // NUOVO: Rimuovi messaggio da openChatData
    removeMessageFromOpenChat: (state, action) => {
      const { notificationId, messageId } = action.payload;
      
      if (state.openChatData[notificationId]) {
        const messages = Array.isArray(state.openChatData[notificationId].messages)
          ? state.openChatData[notificationId].messages
          : JSON.parse(state.openChatData[notificationId].messages || "[]");
        
        // Filtra via il messaggio eliminato
        const filteredMessages = messages.filter(m => m.messageId !== messageId);
        
        state.openChatData[notificationId].messages = filteredMessages;
        state.openChatData[notificationId].messageCount = filteredMessages.length;
        
        // Aggiorna anche il totalMessageCount
        if (state.openChatData[notificationId].totalMessageCount) {
          state.openChatData[notificationId].totalMessageCount--;
        }
      }
      
      // IMPORTANTE: Aggiorna anche la notifica nella sidebar
      const notification = state.notifications.find(n => n.notificationId === notificationId);
      if (notification) {
        // Aggiorna il conteggio messaggi
        if (notification.messageCount) {
          notification.messageCount--;
        }
        
        // Se il messaggio eliminato era l'ultimo, aggiorna lastMessage
        const messages = Array.isArray(notification.messages) 
          ? notification.messages 
          : (typeof notification.messages === 'string' ? JSON.parse(notification.messages || '[]') : []);
        
        const filteredSidebarMessages = messages.filter(m => m.messageId !== messageId);
        
        if (filteredSidebarMessages.length > 0) {
          const lastMsg = filteredSidebarMessages[filteredSidebarMessages.length - 1];
          notification.lastMessage = lastMsg.tbCreated;
        }
        
        // Mantieni solo gli ultimi 5 messaggi per la sidebar
        notification.messages = filteredSidebarMessages.slice(-5);
      }
    },
    
    // NUOVO: Aggiorna colore messaggio in openChatData
    updateMessageColorInOpenChat: (state, action) => {
      const { notificationId, messageId, color } = action.payload;
      
      if (state.openChatData[notificationId]) {
        const messages = Array.isArray(state.openChatData[notificationId].messages)
          ? state.openChatData[notificationId].messages
          : JSON.parse(state.openChatData[notificationId].messages || "[]");
        
        // Trova e aggiorna il messaggio
        const messageIndex = messages.findIndex(m => m.messageId === messageId);
        if (messageIndex !== -1) {
          messages[messageIndex].messageColor = color;
          state.openChatData[notificationId].messages = messages;
        }
      }
      
      // IMPORTANTE: Aggiorna anche la notifica nella sidebar se necessario
      const notification = state.notifications.find(n => n.notificationId === notificationId);
      if (notification) {
        const messages = Array.isArray(notification.messages) 
          ? notification.messages 
          : (typeof notification.messages === 'string' ? JSON.parse(notification.messages || '[]') : []);
        
        const messageIndex = messages.findIndex(m => m.messageId === messageId);
        if (messageIndex !== -1) {
          messages[messageIndex].messageColor = color;
          notification.messages = messages;
        }
      }
    },

   // NUOVO: Aggiorna dati completi per chat aperta
   setOpenChatData: (state, action) => {
    const { notificationId, data } = action.payload;
    
    if (!state.openChatData[notificationId] || data._isInitialLoad) {
      const messages = Array.isArray(data.messages) 
        ? data.messages 
        : (typeof data.messages === 'string' ? JSON.parse(data.messages || "[]") : []);
      
      // Calcola hasMoreMessages basandoti sul conteggio totale
      const totalCount = data.totalMessageCount || data.messageCount || messages.length;
      const hasMore = messages.length < totalCount;
      
      console.log(`📊 setOpenChatData - Inizializzazione paginazione:`, {
        notificationId,
        messagesLoaded: messages.length,
        totalCount,
        hasMore
      });
      
      state.openChatData[notificationId] = {
        ...data,
        messages: messages,
        lastFullUpdate: Date.now(),
        totalMessageCount: totalCount // Assicurati che questo sia salvato
      };
      
      // Inizializza paginazione con i dati corretti
      if (messages.length > 0) {
        const sortedMessages = [...messages].sort((a, b) => 
          new Date(a.tbCreated) - new Date(b.tbCreated)
        );
        
        const oldestMessage = sortedMessages[0];
        
        state.chatPagination[notificationId] = {
          hasMoreMessages: hasMore,
          isLoadingMore: false,
          oldestMessageId: oldestMessage.messageId,
          totalLoaded: messages.length,
          totalAvailable: totalCount
        };
        
        console.log(`✅ Paginazione inizializzata per chat ${notificationId}:`, state.chatPagination[notificationId]);
      }
    } else {
      // Aggiorna solo metadati
      state.openChatData[notificationId] = {
        ...state.openChatData[notificationId],
        ...data,
        messages: state.openChatData[notificationId].messages,
        lastFullUpdate: Date.now(),
      };
    }
  },
  appendMessagesToChat: (state, action) => {
    const { notificationId, messages, hasMoreMessages, totalMessageCount } = action.payload;
    
    if (state.openChatData[notificationId]) {
      const existingMessages = state.openChatData[notificationId].messages || [];
      const existingIds = new Set(existingMessages.map(m => m.messageId));
      
      // Filtra duplicati
      const newMessages = messages.filter(m => !existingIds.has(m.messageId));
      
      console.log(`🔄 Appending ${newMessages.length} nuovi messaggi a ${existingMessages.length} esistenti`);
      
      if (newMessages.length > 0) {
        // Combina i messaggi
        const allMessages = [...existingMessages, ...newMessages];
        
        // Ordina tutti i messaggi per data crescente (più vecchi prima)
        const sortedMessages = allMessages.sort((a, b) => 
          new Date(a.tbCreated) - new Date(b.tbCreated)
        );
        
        state.openChatData[notificationId].messages = sortedMessages;
        
        // Trova il nuovo messaggio più vecchio
        const newOldestMessage = sortedMessages[0];
        
        // Aggiorna paginazione
        state.chatPagination[notificationId] = {
          hasMoreMessages: hasMoreMessages || false,
          isLoadingMore: false,
          oldestMessageId: newOldestMessage.messageId,
          totalLoaded: sortedMessages.length,
          totalAvailable: totalMessageCount || sortedMessages.length
        };
        
        console.log(`✅ Paginazione aggiornata:`, {
          oldestMessageId: newOldestMessage.messageId,
          hasMoreMessages,
          totalLoaded: sortedMessages.length,
          totalAvailable: totalMessageCount
        });
      } else {
        // Nessun nuovo messaggio, ferma la paginazione
        state.chatPagination[notificationId] = {
          ...state.chatPagination[notificationId],
          hasMoreMessages: false,
          isLoadingMore: false
        };
        console.log(`⚠️ Nessun nuovo messaggio da aggiungere. Paginazione fermata.`);
      }
    }
  },
   // NUOVO: Rimuovi dati chat quando si chiude
   removeOpenChatData: (state, action) => {
     const notificationId = action.payload;
     delete state.openChatData[notificationId];
   },
   
   // NUOVO: Aggiungi nuovo messaggio a chat aperta
   addMessageToOpenChat: (state, action) => {
     const { notificationId, message } = action.payload;
     if (state.openChatData[notificationId]) {
       const messages = Array.isArray(state.openChatData[notificationId].messages)
         ? state.openChatData[notificationId].messages
         : JSON.parse(state.openChatData[notificationId].messages || "[]");
       
       if (!messages.find(m => m.messageId === message.messageId)) {
         messages.push(message);
         state.openChatData[notificationId].messages = messages;
         state.openChatData[notificationId].messageCount = messages.length;
       }
     }
   },

    registerOpenChat: (state, action) => {
     const notificationId = parseInt(action.payload);
     state.openChatIds.add(notificationId);
     
     // IMPORTANTE: Se la notifica non era letta, aggiorna il contatore
     const notification = state.notifications.find(n => n.notificationId === notificationId);
     if (notification && !notification.isReadByUser) {
       // Setta il flag di aggiornamento ottimistico
       state.optimisticUpdateInProgress = true;
       
       // Aggiorna la notifica come letta
       notification.isReadByUser = true;
       
       // Ricalcola il contatore
       const newUnreadCount = state.notifications.filter(
         (n) => n && n.isReadByUser === false && n.archived !== "1" && n.archived !== 1
       ).length;
       
       state.unreadCount = newUnreadCount;
       state.unreadCountLastModified = Date.now();
       
       // Reset del flag dopo 3 secondi
       setTimeout(() => {
         state.optimisticUpdateInProgress = false;
       }, 3000);
       
       console.log(`📊 Chat ${notificationId} aperta, unreadCount aggiornato a: ${newUnreadCount}`);
     }
     
     // Inizializza openChatData se non esiste
     if (!state.openChatData[notificationId]) {
       if (notification) {
         state.openChatData[notificationId] = {
           ...notification,
           lastFullUpdate: 0, // Forza caricamento completo
         };
       }
     }
   },

    unregisterOpenChat: (state, action) => {
     const notificationId = parseInt(action.payload);
     state.openChatIds.delete(notificationId);
     delete state.openChatData[notificationId];
    },

    markMessageAsReceived: (state, action) => {
      const { notificationId, messageId } = action.payload;
      document.dispatchEvent(
        new CustomEvent("message-received", {
          detail: { notificationId, messageId },
        }),
      );
    },

    resetNotificationError: (state) => {
      state.error = null;
    },

    addUnreadMessage: (state, action) => {
      state.unreadMessages.push(action.payload);
    },

    setAttachmentsLoading: (state, action) => {
      state.attachmentsLoading = action.payload;
    },

    setNotificationAttachments: (state, action) => {
      state.notificationAttachments = {
        ...state.notificationAttachments,
        [action.payload.notificationId]: action.payload.attachments,
      };
    },

    registerStandaloneChat: (state, action) => {
      state.standaloneChats.add(parseInt(action.payload));

      try {
       const current = JSON.parse(localStorage.getItem("standalone_chats") || "[]");
        if (!current.includes(parseInt(action.payload))) {
          localStorage.setItem(
            "standalone_chats",
            JSON.stringify([...current, parseInt(action.payload)]),
          );
        }
      } catch (e) {
        console.error("Error saving standalone chat to localStorage:", e);
      }

      state.openChatIds.add(parseInt(action.payload));
    },

    unregisterStandaloneChat: (state, action) => {
      state.standaloneChats.delete(parseInt(action.payload));

      try {
       const current = JSON.parse(localStorage.getItem("standalone_chats") || "[]");
        localStorage.setItem(
          "standalone_chats",
         JSON.stringify(current.filter((id) => id !== parseInt(action.payload))),
        );
      } catch (e) {
        console.error("Error removing standalone chat from localStorage:", e);
      }
    },

    initializeStandaloneChats: (state, action) => {
      try {
        if (action.payload && Array.isArray(action.payload)) {
         state.standaloneChats = new Set(action.payload.map((id) => parseInt(id)));
          return;
        }

       const storedChats = JSON.parse(localStorage.getItem("standalone_chats") || "[]");
        state.standaloneChats = new Set(storedChats.map((id) => parseInt(id)));
      } catch (e) {
        console.error("Error loading standalone chats from localStorage:", e);
        state.standaloneChats = new Set();
      }
    },

    cleanupStandaloneChats: (state, action) => {
      const toRemove = action.payload || [];
      toRemove.forEach((id) => {
        state.standaloneChats.delete(parseInt(id));
      });
    },

    // NUOVO: Salva draft del messaggio in composizione
    saveChatDraft: (state, action) => {
      const { notificationId, draft } = action.payload;
      const draftWithTimestamp = {
        ...draft,
        lastUpdated: Date.now()
      };

      // Salva in Redux
      state.chatDrafts[notificationId] = draftWithTimestamp;

      // Salva anche in localStorage per condividere tra finestre
      try {
        const allDrafts = JSON.parse(localStorage.getItem("chat_drafts") || "{}");
        allDrafts[notificationId] = draftWithTimestamp;
        localStorage.setItem("chat_drafts", JSON.stringify(allDrafts));
      } catch (e) {
        console.error("Errore nel salvare draft in localStorage:", e);
      }
    },

    // NUOVO: Recupera draft del messaggio
    getChatDraft: (state, action) => {
      const { notificationId } = action.payload;
      return state.chatDrafts[notificationId] || null;
    },

    // NUOVO: Cancella draft dopo l'invio
    clearChatDraft: (state, action) => {
      const notificationId = action.payload;
      delete state.chatDrafts[notificationId];

      // Rimuovi anche da localStorage
      try {
        const allDrafts = JSON.parse(localStorage.getItem("chat_drafts") || "{}");
        delete allDrafts[notificationId];
        localStorage.setItem("chat_drafts", JSON.stringify(allDrafts));
      } catch (e) {
        console.error("Errore nel rimuovere draft da localStorage:", e);
      }
    },
  },

  extraReducers: (builder) => {
    builder
    // Gestisci fetch paginato
    .addCase(fetchPaginatedNotifications.pending, (state, action) => {
      if (!action.meta.arg.append) {
        state.loading = true;
      }
    })
    .addCase(fetchPaginatedNotifications.fulfilled, (state, action) => {
      const { unreadCount, notifications, metadata, append } = action.payload;
      
      state.unreadCount = unreadCount;
      
      if (append) {
        // Aggiungi alle esistenti
        const existingIds = new Set(state.paginatedNotifications.map(n => n.notificationId));
        const newNotifications = notifications.filter(n => !existingIds.has(n.notificationId));
        state.paginatedNotifications = [...state.paginatedNotifications, ...newNotifications];
      } else {
        // Sostituisci
        state.paginatedNotifications = notifications;
      }
      
      state.notificationsPagination = {
        ...metadata,
        isLoadingMore: false
      };
      
      state.loading = false;
      state.error = null;
    })
    .addCase("notifications/updatePaginatedNotifications", (state, action) => {
      const { notifications: updatedNotifications, source } = action.payload;
      
      if (!updatedNotifications || !Array.isArray(updatedNotifications)) return;
      
      // Aggiorna le notifiche esistenti nelle paginatedNotifications
      updatedNotifications.forEach(updatedNotif => {
        const index = state.paginatedNotifications.findIndex(
          n => n.notificationId === updatedNotif.notificationId
        );
        
        if (index !== -1) {
          // Aggiorna la notifica esistente
          state.paginatedNotifications[index] = {
            ...state.paginatedNotifications[index],
            ...updatedNotif,
            // Assicurati che isReadByUser sia aggiornato correttamente
            isReadByUser: state.openChatIds.has(updatedNotif.notificationId) 
              ? true 
              : updatedNotif.isReadByUser
          };
        } else if (state.notificationsPagination.currentPage === 1) {
          // Se siamo alla prima pagina e la notifica non esiste, potrebbe essere una nuova
          // Inseriscila all'inizio
          state.paginatedNotifications.unshift({
            ...updatedNotif,
            isReadByUser: state.openChatIds.has(updatedNotif.notificationId) 
              ? true 
              : updatedNotif.isReadByUser
          });
          
          // Mantieni solo il numero massimo di notifiche per pagina
          if (state.paginatedNotifications.length > state.notificationsPagination.pageSize) {
            state.paginatedNotifications = state.paginatedNotifications.slice(
              0, 
              state.notificationsPagination.pageSize
            );
          }
        }
      });
      
      // Riordina le notifiche (pinned prima, poi per data)
      state.paginatedNotifications.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.lastMessage) - new Date(a.lastMessage);
      });
    })
    .addCase(fetchPaginatedNotifications.rejected, (state, action) => {
      state.loading = false;
      state.notificationsPagination.isLoadingMore = false;
      state.error = action.payload;
    })
    .addCase(loadMoreMessages.pending, (state, action) => {
        const notificationId = action.meta.arg.notificationId;
        if (state.chatPagination[notificationId]) {
          state.chatPagination[notificationId].isLoadingMore = true;
        }
      })
      .addCase(fetchChatParticipants.fulfilled, (state, action) => {
        const { notificationId, participants } = action.payload;
        
        // Aggiorna openChatData se esiste
        if (state.openChatData[notificationId]) {
          state.openChatData[notificationId].membersInfo = participants;
          state.openChatData[notificationId].participantsLastUpdate = Date.now();
        }
        
        // Aggiorna anche la notifica nella lista se esiste
        const notification = state.notifications.find(n => n.notificationId === notificationId);
        if (notification) {
          notification.membersInfo = participants;
        }
      })
      
      .addCase(loadMoreMessages.fulfilled, (state, action) => {
        const { notificationId, newMessages, hasMoreMessages } = action.payload;
        
        // Usa il reducer appendMessagesToChat
        notificationsSlice.caseReducers.appendMessagesToChat(state, {
          payload: { notificationId, messages: newMessages, hasMoreMessages }
        });
      })
      .addCase(loadMoreMessages.rejected, (state, action) => {
        const notificationId = action.meta.arg.notificationId;
        if (state.chatPagination[notificationId]) {
          state.chatPagination[notificationId].isLoadingMore = false;
        }
      })
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        try {
          const notifications = [...action.payload];
          const unreadCount = notifications.reduce((count, notification) => {
            return count + (notification.isReadByUser ? 0 : 1);
          }, 0);

          state.notifications = notifications;
          state.unreadCount = unreadCount;
          state.loading = false;
          state.error = null;

          if (state.unreadCount !== unreadCount) {
            requestAnimationFrame(() => {
              try {
                document.dispatchEvent(
                  new CustomEvent("unread-count-changed", {
                   detail: {
                     unreadCount,
                     timestamp: Date.now(),
                   },
                  }),
                );
              } catch (eventError) {
               console.error("Errore nell'emissione dell'evento unread-count-changed:", eventError);
              }
            });
          }
        } catch (error) {
          console.error("Errore nell'aggiornamento delle notifiche:", error);
          state.error = error.message;
          state.loading = false;
        }
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        if (action.payload && action.payload.type === "auth_error") {
          document.dispatchEvent(
            new CustomEvent("auth-error", {
              detail: { message: action.payload.message },
            }),
          );
        } else {
          state.error = action.payload || "Failed to fetch notifications";
        }
      })

      // Fetch single notification by ID
      .addCase(fetchNotificationById.fulfilled, (state, action) => {
        const notification = action.payload;
        const notificationId = notification.notificationId;
        
        // IMPORTANTE: Se la chat è aperta, marca SEMPRE come letta
        if (state.openChatIds.has(notificationId)) {
          notification.isReadByUser = true;
        }
        
        // GESTIONE MIGLIORATA PER CHAT APERTE
        if (state.openChatIds.has(notificationId)) {
          const existingOpenChat = state.openChatData[notificationId];
          
          // Estrai i messaggi dalla notifica
          let newMessages = [];
          if (typeof notification.messages === 'string') {
            try {
              newMessages = JSON.parse(notification.messages);
            } catch (e) {
              console.error('Error parsing messages:', e);
              newMessages = [];
            }
          } else if (Array.isArray(notification.messages)) {
            newMessages = notification.messages;
          }
          
          // Se abbiamo già dati aperti, confronta e aggiorna
          if (existingOpenChat && existingOpenChat.messages) {
            const existingMessages = Array.isArray(existingOpenChat.messages) 
              ? existingOpenChat.messages 
              : JSON.parse(existingOpenChat.messages || "[]");
            
            // Crea un Set di ID esistenti per evitare duplicati
            const existingIds = new Set(existingMessages.map(m => m.messageId));
            
            // Filtra solo i nuovi messaggi
            const messagesToAdd = newMessages.filter(m => !existingIds.has(m.messageId));
            
            if (messagesToAdd.length > 0) {
              console.log(`📩 Aggiungendo ${messagesToAdd.length} nuovi messaggi alla chat ${notificationId}`);
              
              // Combina i messaggi esistenti con i nuovi
              const allMessages = [...existingMessages, ...messagesToAdd];
              
              // Ordina per data
              const sortedMessages = allMessages.sort((a, b) => 
                new Date(a.tbCreated) - new Date(b.tbCreated)
              );
              
              // Aggiorna openChatData
              state.openChatData[notificationId] = {
                ...notification,
                messages: sortedMessages,
                messageCount: sortedMessages.length,
                totalMessageCount: notification.totalMessageCount || sortedMessages.length,
                lastFullUpdate: Date.now()
              };
            } else {
              // Solo aggiorna i metadati
              state.openChatData[notificationId] = {
                ...existingOpenChat,
                ...notification,
                messages: existingMessages, // Mantieni i messaggi esistenti
                lastFullUpdate: Date.now()
              };
            }
          } else {
            // Prima volta che carichiamo questa chat aperta
            state.openChatData[notificationId] = {
              ...notification,
              messages: newMessages,
              lastFullUpdate: Date.now()
            };
          }
          
          // Aggiorna anche la paginazione se necessario
          const totalCount = notification.totalMessageCount || notification.messageCount || newMessages.length;
          const loadedCount = Array.isArray(state.openChatData[notificationId].messages) 
            ? state.openChatData[notificationId].messages.length 
            : 0;
          
          if (state.chatPagination[notificationId]) {
            state.chatPagination[notificationId] = {
              ...state.chatPagination[notificationId],
              totalAvailable: totalCount,
              totalLoaded: loadedCount,
              hasMoreMessages: loadedCount < totalCount
            };
          }
        }
        
        // MODIFICA: Aggiorna la sidebar con riordinamento se necessario
        const index = state.notifications.findIndex(n => n.notificationId === notificationId);
        
        if (index !== -1) {
          const existingNotification = state.notifications[index];
          const existingLastMessage = new Date(existingNotification.lastMessage || 0);
          const newLastMessage = new Date(notification.lastMessage || 0);
          
          // Se il messaggio è più recente, riordina
          if (newLastMessage > existingLastMessage) {
            // Rimuovi dalla posizione corrente
            state.notifications.splice(index, 1);
            
            // Crea notifica aggiornata per sidebar
            const sidebarNotification = {
              ...notification,
              isReadByUser: state.openChatIds.has(notificationId) ? true : notification.isReadByUser,
              messages: Array.isArray(notification.messages) 
                ? notification.messages.slice(-5) 
                : (typeof notification.messages === "string" 
                  ? JSON.parse(notification.messages || "[]").slice(-5)
                  : [])
            };
            
            // Trova posizione corretta (dopo le pinned, in ordine di lastMessage)
            let insertIndex = 0;
            for (let i = 0; i < state.notifications.length; i++) {
              const currentNotif = state.notifications[i];
              
              // Se la notifica corrente è pinned e la nostra no, continua
              if (currentNotif.pinned && !sidebarNotification.pinned) {
                insertIndex = i + 1;
                continue;
              }
              
              // Se entrambe sono pinned o entrambe non lo sono, ordina per data
              if (currentNotif.pinned === sidebarNotification.pinned) {
                const currentDate = new Date(currentNotif.lastMessage || 0);
                if (newLastMessage > currentDate) {
                  break;
                }
                insertIndex = i + 1;
              }
            }
            
            // Inserisci nella posizione corretta
            state.notifications.splice(insertIndex, 0, sidebarNotification);
          } else {
            // Solo aggiorna i dati senza riordinare
            state.notifications[index] = {
              ...state.notifications[index],
              ...notification,
              isReadByUser: state.openChatIds.has(notificationId) ? true : notification.isReadByUser,
              messages: Array.isArray(notification.messages) 
                ? notification.messages.slice(-5) 
                : (typeof notification.messages === "string" 
                  ? JSON.parse(notification.messages || "[]").slice(-5)
                  : [])
            };
          }
        } else {
          // Nuova notifica - inserisci nella posizione corretta
          const sidebarNotification = {
            ...notification,
            isReadByUser: state.openChatIds.has(notificationId) ? true : notification.isReadByUser,
            messages: Array.isArray(notification.messages) 
              ? notification.messages.slice(-5) 
              : (typeof notification.messages === "string" 
                ? JSON.parse(notification.messages || "[]").slice(-5)
                : [])
          };
          
          // Trova posizione corretta
          let insertIndex = 0;
          const newLastMessage = new Date(notification.lastMessage || 0);
          
          for (let i = 0; i < state.notifications.length; i++) {
            const currentNotif = state.notifications[i];
            
            if (currentNotif.pinned && !sidebarNotification.pinned) {
              insertIndex = i + 1;
              continue;
            }
            
            if (currentNotif.pinned === sidebarNotification.pinned) {
              const currentDate = new Date(currentNotif.lastMessage || 0);
              if (newLastMessage > currentDate) {
                break;
              }
              insertIndex = i + 1;
            }
          }
          
          state.notifications.splice(insertIndex, 0, sidebarNotification);
        }
        
        // Ricalcola unreadCount
        try {
          state.unreadCount = state.notifications.filter(
            (n) => n && !n.isReadByUser && n.archived !== 1 && !state.openChatIds.has(n.notificationId)
          ).length;
        } catch (e) {
          console.error("Errore nel calcolo unreadCount:", e);
        }
      })
    
      .addCase(fetchNotificationById.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Create DB Notifications View
      .addCase(createDBNotificationsView.fulfilled, (state) => {
        state.dbViewCreated = true;
      })

      // Send notification
      .addCase(sendNotification.pending, (state) => {
        state.sending = true;
      })
      .addCase(sendNotification.fulfilled, (state, action) => {
        state.sending = false;
        const payload = action.payload || {};
        const { notificationId } = payload;
        
        if (!notificationId) return;
        
        // Se la chat è aperta, emetti evento per ricaricare
        if (state.openChatIds.has(notificationId)) {
          document.dispatchEvent(
            new CustomEvent("reload-open-chat", {
              detail: { 
                notificationId,
                isOwnMessage: true 
              },
            }),
          );
        }
        
        // IMPORTANTE: Aggiorna e riordina le notifiche
        const notificationIndex = state.notifications.findIndex(
          (n) => n && n.notificationId === notificationId,
        );
      
        if (notificationIndex !== -1) {
          // Estrai la notifica
          const notification = state.notifications[notificationIndex];
          
          // Aggiorna i metadati
          if (payload.lastMessage) {
            notification.lastMessage = new Date().toISOString(); // Usa timestamp corrente
          }
          if (payload.messageCount) {
            notification.messageCount = payload.messageCount;
          }
          
          // IMPORTANTE: Rimuovi la notifica dalla posizione corrente
          const updatedNotification = { ...notification };
          state.notifications.splice(notificationIndex, 1);
          
          // IMPORTANTE: Inserisci la notifica aggiornata all'inizio (dopo le pinned)
          // Trova l'indice dove inserire (dopo le notifiche pinned)
          let insertIndex = 0;
          for (let i = 0; i < state.notifications.length; i++) {
            if (!state.notifications[i].pinned) {
              insertIndex = i;
              break;
            }
          }
          
          // Se la notifica è pinned, inseriscila all'inizio
          if (updatedNotification.pinned) {
            state.notifications.unshift(updatedNotification);
          } else {
            // Altrimenti inseriscila dopo le pinned
            state.notifications.splice(insertIndex, 0, updatedNotification);
          }
        }
        
        // Emetti evento per altri componenti
        try {
          if (action.meta && action.meta.arg) {
            const event = new CustomEvent("chat-message-sent", {
              detail: {
                notificationId: notificationId,
                message: action.meta.arg.message || "",
                replyToMessageId: action.meta.arg.replyToMessageId || null,
                timestamp: new Date().getTime(),
              },
            });
            document.dispatchEvent(event);
          }
        } catch (eventError) {
          console.error("Errore nell'emissione dell'evento chat-message-sent:", eventError);
        }
      })
      .addCase(sendNotification.rejected, (state, action) => {
        state.sending = false;
        state.error = action.payload;
      })

      .addCase(removeUserFromChat.fulfilled, (state, action) => {
        const { notificationId, removedUserId } = action.payload;
        // Non dobbiamo aggiornare lo stato qui poiché fetchNotificationById verrà chiamato
      })
      .addCase(removeUserFromChat.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Toggle read/unread status
      .addCase(toggleReadUnread.fulfilled, (state, action) => {
        const { notificationId, isReadByUser } = action.payload;
      
        try {
          // Aggiorna openChatData se esiste
          if (state.openChatData[notificationId]) {
            state.openChatData[notificationId].isReadByUser = isReadByUser;
          }
      
          // Aggiorna notifications
          const notificationsCopy = [...state.notifications];
          const notificationIndex = notificationsCopy.findIndex(
            (n) => n && n.notificationId === notificationId,
          );
      
          if (notificationIndex !== -1) {
            notificationsCopy[notificationIndex] = {
              ...notificationsCopy[notificationIndex],
              isReadByUser,
            };
      
            const newUnreadCount = notificationsCopy.filter(
              (n) => n && typeof n === "object" && !n.isReadByUser && n.archived !== "1" && n.archived !== 1
            ).length;
      
            state.notifications = notificationsCopy;
            
            // IMPORTANTE: Aggiorna sempre il contatore dopo un toggle esplicito
            state.unreadCount = newUnreadCount;
            state.optimisticUpdateInProgress = false; // Reset del flag
            state.unreadCountLastModified = Date.now();
      
            if (isReadByUser) {
              state.unreadMessages = state.unreadMessages.filter(
                (message) => message.notificationId !== notificationId,
              );
            }
      
            const eventDetail = {
              notificationId,
              isReadByUser,
              unreadCount: state.unreadCount, // Usa il contatore corrente dello state
              timestamp: new Date().toISOString(),
            };
      
            // IMPORTANTE: Rimuovi o commenta l'evento read-status-changed
            // Questo evento sta causando interferenze con il contatore
            /*
            requestAnimationFrame(() => {
              try {
                document.dispatchEvent(
                  new CustomEvent("read-status-changed", {
                    detail: eventDetail,
                  }),
                );
              } catch (eventError) {
                console.error("Errore nell'emissione dell'evento read-status-changed:", eventError);
              }
            });
            */
          }
        } catch (error) {
          console.error("Errore nell'aggiornamento dello stato di lettura:", error);
          state.optimisticUpdateInProgress = false; // Reset del flag in caso di errore
        }
      })
      

      // Toggle pin status
      .addCase(togglePin.fulfilled, (state, action) => {
        const { notificationId, pinned } = action.payload;
       
       if (state.openChatData[notificationId]) {
         state.openChatData[notificationId].pinned = pinned;
       }
       
        const notification = state.notifications.find(
          (n) => n.notificationId === notificationId,
        );

        if (notification) {
          notification.pinned = pinned;
        }
      })

      // Toggle favorite status
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        const { notificationId, favorite } = action.payload;
       
       if (state.openChatData[notificationId]) {
         state.openChatData[notificationId].favorite = favorite;
       }
       
        const notification = state.notifications.find(
          (n) => n.notificationId === notificationId,
        );

        if (notification) {
          notification.favorite = favorite;
        }
      })

      // Archive/unarchive chat
      .addCase(archiveChat.fulfilled, (state, action) => {
        const { notificationId, archived } = action.payload;

        try {
         if (state.openChatData[notificationId]) {
           state.openChatData[notificationId].archived = archived;
         }

          const notificationsCopy = [...state.notifications];
          const notificationIndex = notificationsCopy.findIndex(
            (n) => n && n.notificationId === notificationId,
          );

          if (notificationIndex !== -1) {
            notificationsCopy[notificationIndex] = {
              ...notificationsCopy[notificationIndex],
              archived,
            };

            if (!notificationsCopy[notificationIndex].isReadByUser) {
              const newUnreadCount = notificationsCopy.filter(
               (n) => n && typeof n === "object" && !n.isReadByUser && n.archived !== "1",
              ).length;
              state.unreadCount = newUnreadCount;
            }

            state.notifications = notificationsCopy;
          }
        } catch (error) {
          console.error("Errore nell'archiviazione della chat:", error);
        }
      })
      .addCase(unarchiveChat.fulfilled, (state, action) => {
        const { notificationId, archived } = action.payload;

        try {
         if (state.openChatData[notificationId]) {
           state.openChatData[notificationId].archived = archived;
         }

          const notificationsCopy = [...state.notifications];
          const notificationIndex = notificationsCopy.findIndex(
            (n) => n && n.notificationId === notificationId,
          );

          if (notificationIndex !== -1) {
            notificationsCopy[notificationIndex] = {
              ...notificationsCopy[notificationIndex],
              archived,
            };

            if (!notificationsCopy[notificationIndex].isReadByUser) {
              const newUnreadCount = notificationsCopy.filter(
               (n) => n && typeof n === "object" && !n.isReadByUser && n.archived !== "1",
              ).length;
              state.unreadCount = newUnreadCount;
            }

            state.notifications = notificationsCopy;
          }
        } catch (error) {
          console.error("Errore nella riattivazione della chat:", error);
        }
      })

      // Reopen/close chat
      .addCase(reopenChat.fulfilled, (state, action) => {
        const { notificationId, isClosed } = action.payload;
       
       if (state.openChatData[notificationId]) {
         state.openChatData[notificationId].isClosed = isClosed;
       }
       
        const notification = state.notifications.find(
          (n) => n.notificationId === notificationId,
        );

        if (notification) {
          notification.isClosed = isClosed;
        }
      })
      .addCase(closeChat.fulfilled, (state, action) => {
        const { notificationId, isClosed } = action.payload;
       
       if (state.openChatData[notificationId]) {
         state.openChatData[notificationId].isClosed = isClosed;
       }
       
        const notification = state.notifications.find(
          (n) => n.notificationId === notificationId,
        );

        if (notification) {
          notification.isClosed = isClosed;
        }
      })

      // Leave chat
      .addCase(leaveChat.fulfilled, (state, action) => {
        const { notificationId, chatLeft } = action.payload;
       
       if (state.openChatData[notificationId]) {
         state.openChatData[notificationId].chatLeft = chatLeft;
         
         // Filter messages in openChatData
         const messages = parseMessages(state.openChatData[notificationId].messages);
         const filteredMessages = filterMessagesAfterLeaving(messages, chatLeft);
         state.openChatData[notificationId].messages = Array.isArray(state.openChatData[notificationId].messages)
           ? filteredMessages
           : JSON.stringify(filteredMessages);
       }
       
        const notification = state.notifications.find(
          (n) => n.notificationId === notificationId,
        );

        if (notification) {
          notification.chatLeft = chatLeft;

          const messages = parseMessages(notification.messages);
         const filteredMessages = filterMessagesAfterLeaving(messages, chatLeft);
          notification.messages = Array.isArray(notification.messages)
            ? filteredMessages
            : JSON.stringify(filteredMessages);
        }
      })

      // Toggle mute
      .addCase(toggleMuteChat.fulfilled, (state, action) => {
        const { notificationId, isMuted, muteExpiryDate } = action.payload;
       
       if (state.openChatData[notificationId]) {
         state.openChatData[notificationId].isMuted = isMuted;
         state.openChatData[notificationId].muteExpiryDate = muteExpiryDate;
       }
       
        const notification = state.notifications.find(
          (n) => n.notificationId === notificationId,
        );

        if (notification) {
          notification.isMuted = isMuted;
          notification.muteExpiryDate = muteExpiryDate;
        }
      })

      // Update chat title
      .addCase(updateChatTitle.fulfilled, (state, action) => {
        const { notificationId, title } = action.payload;
       
       if (state.openChatData[notificationId]) {
         state.openChatData[notificationId].title = title;
       }
       
        const notification = state.notifications.find(
          (n) => n.notificationId === notificationId,
        );

        if (notification) {
          notification.title = title;
        }
      })

     // MODIFICA updateFromWorker per NON toccare openChatData
     .addCase("notifications/updateFromWorker", (state, action) => {
      try {
        if (!action.payload || !Array.isArray(action.payload)) {
          return;
        }
    
        const newNotifications = [...action.payload];
        
        // PER OGNI NOTIFICA DAL WORKER
        newNotifications.forEach(workerNotif => {
          // SE LA CHAT È APERTA, FORZA isReadByUser = true
          if (state.openChatIds.has(workerNotif.notificationId)) {
            workerNotif.isReadByUser = true; // MODIFICA CHIAVE
            
            const openChat = state.openChatData[workerNotif.notificationId];
            
            if (openChat && openChat.lastFullUpdate) {
              console.log(`🚫 Worker: NON sovrascrivendo chat aperta ${workerNotif.notificationId}`);
              
              // Aggiorna SOLO i metadati, NON i messaggi
              openChat.isReadByUser = true; // ASSICURA che sia marcata come letta
              openChat.isClosed = workerNotif.isClosed;
              openChat.pinned = workerNotif.pinned;
              openChat.favorite = workerNotif.favorite;
              openChat.isMuted = workerNotif.isMuted;
              openChat.archived = workerNotif.archived;
              openChat.chatLeft = workerNotif.chatLeft;
              openChat.lastMessage = workerNotif.lastMessage;
              
              // Se ci sono nuovi messaggi, richiedi aggiornamento completo
              if (workerNotif.messageCount > (openChat.messageCount || 0)) {
                setTimeout(() => {
                  document.dispatchEvent(
                    new CustomEvent("reload-open-chat", {
                      detail: {
                        notificationId: workerNotif.notificationId,
                        reason: "new-messages"
                      },
                    }),
                  );
                }, 0);
              }
              
              return;
            }
          }
        });
        
        // Aggiorna notifications normalmente solo per chat NON aperte
        const updatedNotifications = state.notifications.map(existingNotif => {
          // Se la chat è aperta, mantieni la versione esistente MA con isReadByUser = true
          if (state.openChatIds.has(existingNotif.notificationId)) {
            return { ...existingNotif, isReadByUser: true };
          }
          
          // Altrimenti usa i dati del worker
          const workerNotif = newNotifications.find(n => n.notificationId === existingNotif.notificationId);
          return workerNotif || existingNotif;
        });
        
        // Aggiungi nuove notifiche che non esistevano prima
        newNotifications.forEach(workerNotif => {
          if (!updatedNotifications.find(n => n.notificationId === workerNotif.notificationId)) {
            // Se è una nuova notifica per una chat aperta, marcala come letta
            if (state.openChatIds.has(workerNotif.notificationId)) {
              workerNotif.isReadByUser = true;
            }
            updatedNotifications.push(workerNotif);
          }
        });
        
        state.notifications = updatedNotifications;
        
        // IMPORTANTE: Aggiorna il contatore solo se non c'è un aggiornamento ottimistico in corso
        if (!state.optimisticUpdateInProgress) {
          // CALCOLO CORRETTO di unreadCount escludendo le chat aperte
          const newUnreadCount = updatedNotifications.filter(
            (n) => n && n.isReadByUser === false && n.archived !== "1" && n.archived !== 1
          ).length;
          
          state.unreadCount = newUnreadCount;
          console.log(`📊 UnreadCount aggiornato dal worker: ${newUnreadCount}`);
        } else {
          console.log(`🚫 Worker: Ignorando aggiornamento contatore (aggiornamento ottimistico in corso)`);
        }
        
      } catch (error) {
        console.error("Errore in updateFromWorker:", error);
      }
    })
 },
});

// Selectors
export const selectNotifications = (state) => state.notifications.notifications;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectLoading = (state) => state.notifications.loading;
export const selectSending = (state) => state.notifications.sending;
export const selectError = (state) => state.notifications.error;
export const selectUnreadMessages = (state) => state.notifications.unreadMessages;
export const selectOpenChatIds = (state) => state.notifications.openChatIds;
export const selectDbViewCreated = (state) => state.notifications.dbViewCreated;
export const selectHighlights = (state) => state.notifications.highlights;
export const selectLoadingHighlights = (state) => state.notifications.loadingHighlights;
export const selectAttachmentsLoading = (state) => state.notifications.attachmentsLoading;
export const selectNotificationAttachments = (state) => state.notifications.notificationAttachments;
export const selectStandaloneChats = (state) => state.notifications.standaloneChats;

// NUOVO: Selettore per openChatData
export const selectOpenChatData = (state, notificationId) => 
 state.notifications.openChatData[notificationId];

// NUOVO: Selettore per verificare se una chat ha dati completi
export const selectHasFullChatData = (state, notificationId) =>
 state.notifications.openChatData[notificationId]?.lastFullUpdate > 0;

// NUOVO: Selettore per recuperare il draft di una chat
// Legge prima da Redux, poi da localStorage come fallback
export const selectChatDraft = (state, notificationId) => {
  // Prova prima da Redux
  if (state.notifications.chatDrafts[notificationId]) {
    return state.notifications.chatDrafts[notificationId];
  }

  // Se non è in Redux, prova da localStorage (utile per finestre standalone)
  try {
    const allDrafts = JSON.parse(localStorage.getItem("chat_drafts") || "{}");
    return allDrafts[notificationId] || null;
  } catch (e) {
    console.error("Errore nel recuperare draft da localStorage:", e);
    return null;
  }
};

// Check if notification is muted
export const isNotificationMuted = (notification) => {
  if (!notification.isMuted) return false;

  if (!notification.muteExpiryDate) return true;

  const now = new Date();
  const expiryDate = new Date(notification.muteExpiryDate);
  return now < expiryDate;
};

// Nuovo thunk per caricamento paginato
export const fetchPaginatedNotifications = createAsyncThunk(
  "notifications/fetchPaginated",
  async ({ page = 1, filters = {}, append = false }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return rejectWithValue("No token available");

      const params = new URLSearchParams({
        page,
        pageSize: 20,
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            acc[key] = value;
          }
          return acc;
        }, {})
      });

      const response = await axios.get(
        `${config.API_BASE_URL}/notifications/paginated?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
        }
      );

      return {
        ...response.data,
        append
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Export actions
export const {
 setOpenChatData,
 replaceTemporaryMessage,
 setPendingUnreadCount,
 clearPendingUnreadCount,
 updateUnreadCount,
 setOptimisticUpdateInProgress,
 initChatPagination,
 removeOpenChatData,
 appendMessagesToChat,
 addMessageToOpenChat,
  registerOpenChat,
  unregisterOpenChat,
  markMessageAsReceived,
  resetNotificationError,
  addUnreadMessage,
  setAttachmentsLoading,
  setNotificationAttachments,
  registerStandaloneChat,
  unregisterStandaloneChat,
  initializeStandaloneChats,
  cleanupStandaloneChats,
  removeMessageFromOpenChat,
  updateMessageColorInOpenChat,
  updateMessageInOpenChat,
  removeMessageLocally,
  updateMessageColorLocally,
  refreshData,
  appendPaginatedNotifications,
  resetPaginatedNotifications,
  setLoadingMore,
  updatePaginatedNotification,
  saveChatDraft,
  getChatDraft,
  clearChatDraft
} = notificationsSlice.actions;

export default notificationsSlice.reducer;