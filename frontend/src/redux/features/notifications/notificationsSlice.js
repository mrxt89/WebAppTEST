// src/redux/features/notifications/notificationsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { enableMapSet } from "immer";
import axios from "axios";
import { config } from "../../../config";
import { removeUserFromChat } from "./notificationsActions";
// Abilita il supporto per Map e Set in Immer
enableMapSet();

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
          "Cache-Control": "no-cache", // Evita la cache
        },
      });

      // Se la risposta è vuota o null, prova a utilizzare dei dati di test per debug
      if (
        !response.data ||
        (Array.isArray(response.data) && response.data.length === 0)
      ) {
        console.warn(
          "Nessuna notifica ricevuta dal server, verifica il backend.",
        );
      }

      return response.data;
    } catch (error) {
      console.error("Errore in fetchNotifications:", error);
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", error.response.data);
      }

      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        // Handle auth errors separately
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

      // Aggiungi timestamp per evitare cache
      const timestamp = Date.now();

      const response = await axios.get(
        `${config.API_BASE_URL}/notifications/${notificationId}?t=${timestamp}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache, no-store",
            Pragma: "no-cache",
          },
        },
      );

      if (response.data) {
        // Emit an event to notify other parts of the app
        const event = new CustomEvent("notification-updated", {
          detail: {
            notificationId,
            timestamp: new Date().toISOString(),
          },
        });
        document.dispatchEvent(event);

        // Aggiungi un controllo per i messaggi
        const hasMessages =
          Array.isArray(response.data.messages) ||
          (typeof response.data.messages === "string" &&
            response.data.messages);

        if (!hasMessages) {
          console.warn(
            `Notifica ${notificationId} ricevuta senza messaggi`,
            response.data,
          );
        }

        return response.data;
      }

      console.error(`Notifica ${notificationId} non trovata o risposta vuota`);
      return rejectWithValue("Notification not found");
    } catch (error) {
      console.error(
        `Errore in fetchNotificationById per ${notificationId}:`,
        error,
      );

      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", error.response.data);
      }

      return rejectWithValue(error.message || "Failed to fetch notification");
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
  async (notificationData, { rejectWithValue }) => {
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

      return res.data;
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

      return { notificationId, isReadByUser };
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
      return rejectWithValue(
        error.message || "Failed to toggle favorite status",
      );
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

      // Notify other components about the status change
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

      // Notify other components about the status change
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

      // Calculate expiry date based on duration
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
          // 'forever' leaves muteExpiryDate as null
        }
      }

      // Also update localStorage for fallback
      try {
        const mutedChats = JSON.parse(
          localStorage.getItem("mutedChats") || "{}",
        );

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

      // Validation
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
        return rejectWithValue(
          response.data?.message || "Failed to update title",
        );
      }

      // Reload the notification to get updated data
      dispatch(fetchNotificationById(notificationId));

      // Emetti un evento per notificare altre parti dell'app dell'aggiornamento del titolo
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

// Notifications slice
const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    notifications: [],
    unreadCount: 0,
    loading: true,
    sending: false,
    error: null,
    unreadMessages: [],
    openChatIds: new Set(),
    standaloneChats: new Set(), // Nuova proprietà per chat in finestre separate
    dbViewCreated: false,
    highlights: {}, // For tracking important points
    loadingHighlights: false,
    attachmentsLoading: false,
    notificationAttachments: {},
  },
  reducers: {
    registerOpenChat: (state, action) => {
      state.openChatIds.add(parseInt(action.payload));
    },
    unregisterOpenChat: (state, action) => {
      state.openChatIds.delete(parseInt(action.payload));
    },
    markMessageAsReceived: (state, action) => {
      const { notificationId, messageId } = action.payload;

      // Logic for marking message as received is handled by the server
      // We don't need to update state here

      // But we can emit an event if needed
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
    // Registra una chat come aperta in finestra separata
    registerStandaloneChat: (state, action) => {
      state.standaloneChats.add(parseInt(action.payload));

      // Salva anche in localStorage per persistenza tra refresh
      try {
        const current = JSON.parse(
          localStorage.getItem("standalone_chats") || "[]",
        );
        if (!current.includes(parseInt(action.payload))) {
          localStorage.setItem(
            "standalone_chats",
            JSON.stringify([...current, parseInt(action.payload)]),
          );
        }
      } catch (e) {
        console.error("Error saving standalone chat to localStorage:", e);
      }

      // Registra anche la chat come aperta nello stato Redux
      state.openChatIds.add(parseInt(action.payload));
    },

    // Rimuovi una chat dalla lista delle finestre separate
    unregisterStandaloneChat: (state, action) => {
      state.standaloneChats.delete(parseInt(action.payload));

      // Aggiorna localStorage
      try {
        const current = JSON.parse(
          localStorage.getItem("standalone_chats") || "[]",
        );
        localStorage.setItem(
          "standalone_chats",
          JSON.stringify(
            current.filter((id) => id !== parseInt(action.payload)),
          ),
        );
      } catch (e) {
        console.error("Error removing standalone chat from localStorage:", e);
      }
    },
    // All'inizializzazione, caricare le chat aperte in finestre separate da localStorage
    initializeStandaloneChats: (state, action) => {
      try {
        // Se l'azione contiene un payload, usalo direttamente
        if (action.payload && Array.isArray(action.payload)) {
          state.standaloneChats = new Set(
            action.payload.map((id) => parseInt(id)),
          );
          return;
        }

        // Altrimenti leggi da localStorage
        const storedChats = JSON.parse(
          localStorage.getItem("standalone_chats") || "[]",
        );
        state.standaloneChats = new Set(storedChats.map((id) => parseInt(id)));

        // Nessuna verifica finestre in questa fase, sarà gestita separatamente
        // per evitare problemi con accesso alle finestre durante l'inizializzazione
      } catch (e) {
        console.error("Error loading standalone chats from localStorage:", e);
        // Assicurati che il set esista comunque
        state.standaloneChats = new Set();
      }
    },

    // Pulizia delle chat in finestre separate che non esistono più
    cleanupStandaloneChats: (state, action) => {
      const toRemove = action.payload || [];
      toRemove.forEach((id) => {
        state.standaloneChats.delete(parseInt(id));
      });
    },
  },

  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        try {
          // Crea una copia locale delle notifiche dal payload
          const notifications = [...action.payload];

          // Calcola il conteggio dei messaggi non letti direttamente dal payload
          const unreadCount = notifications.reduce((count, notification) => {
            return count + (notification.isReadByUser ? 0 : 1);
          }, 0);

          // Aggiorna lo stato in modo immutabile
          state.notifications = notifications;
          state.unreadCount = unreadCount;
          state.loading = false;
          state.error = null;

          // Emetti l'evento solo se il conteggio è cambiato
          if (state.unreadCount !== unreadCount) {
            // Usa requestAnimationFrame per emettere l'evento in modo sicuro
            requestAnimationFrame(() => {
              try {
                document.dispatchEvent(
                  new CustomEvent("unread-count-changed", {
                    detail: eventDetail,
                  }),
                );
              } catch (eventError) {
                console.error(
                  "Errore nell'emissione dell'evento unread-count-changed:",
                  eventError,
                );
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
          // Handle auth errors - likely requires app-level handling
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
        const index = state.notifications.findIndex(
          (n) => n && n.notificationId === notification.notificationId,
        );
        if (index !== -1) {
          // Aggiorna la notifica esistente (in modo "immutabile")
          const newNotifications = [...state.notifications];
          newNotifications[index] = notification;
          state.notifications = newNotifications;
        } else {
          // Aggiungi la nuova notifica (in modo "immutabile")
          state.notifications = [...state.notifications, notification];
        }

        // Calcola il conteggio "unread" (in modo "immutabile") – cioè, crea un nuovo array (state.notifications) e filtra (senza accedere a state.notifications "proxy revocato") – così non si tenta di "get" su un proxy revocato.
        try {
          const newNotifications = [...state.notifications];
          state.unreadCount = newNotifications.filter(
            (n) => n && !n.isReadByUser && n.archived !== "1",
          ).length;
        } catch (e) {
          console.error(
            "Errore nel calcolo unreadCount (fetchNotificationById.fulfilled):",
            e,
          );
          // In caso di errore, mantieni il valore precedente (state.unreadCount)
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
        try {
          state.sending = false;

          // Estrai i dati dalla risposta, con controlli di sicurezza
          const payload = action.payload || {};
          const {
            notificationId,
            title,
            messages,
            membersInfo,
            isClosed,
            closingUser,
            closingDate,
            notificationCategoryId,
          } = payload;

          if (!notificationId) {
            console.error("ID notifica mancante nella risposta");
            return;
          }

          // Cerca in modo sicuro la notifica esistente
          let existingNotification = null;
          try {
            if (state.notifications && Array.isArray(state.notifications)) {
              existingNotification = state.notifications.find(
                (n) => n && n.notificationId === notificationId,
              );
            }
          } catch (findError) {
            console.error(
              "Errore nella ricerca della notifica esistente:",
              findError,
            );
          }

          // Determine if user has left the chat
          const chatLeft = existingNotification
            ? existingNotification.chatLeft
            : 0;

          // Process messages based on chatLeft state
          let processedMessages = messages;
          if (chatLeft && messages) {
            try {
              // If the user has left the chat, filter messages
              const messagesArray = Array.isArray(messages)
                ? [...messages] // crea una copia per sicurezza
                : JSON.parse(messages);

              const filteredMessages = filterMessagesAfterLeaving(
                messagesArray,
                chatLeft,
              );

              processedMessages = Array.isArray(messages)
                ? filteredMessages
                : JSON.stringify(filteredMessages);
            } catch (msgError) {
              console.error("Errore nel processing dei messaggi:", msgError);
              // In caso di errore, mantieni i messaggi originali
              processedMessages = messages;
            }
          }

          const updatedNotification = {
            notificationId,
            title: title || "Notifica senza titolo",
            messages: processedMessages || [],
            membersInfo: membersInfo || [],
            isClosed: isClosed || false,
            closingUser: closingUser || null,
            closingDate: closingDate || null,
            notificationCategoryId: notificationCategoryId || 0,
            chatLeft: chatLeft || 0,
            lastUpdated: new Date().toISOString(),
          };

          // Trova in modo sicuro l'indice della notifica
          let notificationIndex = -1;
          try {
            if (state.notifications && Array.isArray(state.notifications)) {
              notificationIndex = state.notifications.findIndex(
                (n) => n && n.notificationId === notificationId,
              );
            }
          } catch (findIndexError) {
            console.error(
              "Errore nella ricerca dell'indice della notifica:",
              findIndexError,
            );
          }

          if (notificationIndex !== -1) {
            // Update existing notification
            try {
              state.notifications[notificationIndex] = updatedNotification;
            } catch (updateError) {
              console.error(
                "Errore nell'aggiornamento della notifica esistente:",
                updateError,
              );
            }
          } else {
            // Add new notification
            try {
              state.notifications.push(updatedNotification);
            } catch (pushError) {
              console.error(
                "Errore nell'aggiunta della nuova notifica:",
                pushError,
              );
            }
          }

          // Emit an event to notify other components
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
            console.error(
              "Errore nell'emissione dell'evento chat-message-sent:",
              eventError,
            );
          }
        } catch (error) {
          console.error("Errore critico in sendNotification.fulfilled:", error);
          state.sending = false;
        }
      })
      .addCase(sendNotification.rejected, (state, action) => {
        state.sending = false;
        state.error = action.payload;
      })
      .addCase(removeUserFromChat.fulfilled, (state, action) => {
        const { notificationId, removedUserId } = action.payload;

        // Non dobbiamo aggiornare lo stato qui poiché fetchNotificationById verrà chiamato
        // e aggiornerà già lo stato con i dati più recenti

        // Eventualmente potremmo aggiungere un flag o un messaggio temporaneo
        // per indicare che un utente è stato rimosso
      })
      .addCase(removeUserFromChat.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Toggle read/unread status
      .addCase(toggleReadUnread.fulfilled, (state, action) => {
        const { notificationId, isReadByUser } = action.payload;

        try {
          // Crea una copia locale delle notifiche
          const notificationsCopy = [...state.notifications];
          const notificationIndex = notificationsCopy.findIndex(
            (n) => n && n.notificationId === notificationId,
          );

          if (notificationIndex !== -1) {
            // Aggiorna la notifica nella copia locale
            notificationsCopy[notificationIndex] = {
              ...notificationsCopy[notificationIndex],
              isReadByUser,
            };

            // Calcola il nuovo conteggio usando la copia locale
            const newUnreadCount = notificationsCopy.filter(
              (n) =>
                n &&
                typeof n === "object" &&
                !n.isReadByUser &&
                n.archived !== "1",
            ).length;

            // Aggiorna lo stato in modo sicuro
            state.notifications = notificationsCopy;
            state.unreadCount = newUnreadCount;

            // Aggiorna i messaggi non letti
            if (isReadByUser) {
              state.unreadMessages = state.unreadMessages.filter(
                (message) => message.notificationId !== notificationId,
              );
            }

            // Emetti evento per altri componenti usando i valori già calcolati
            const eventDetail = {
              notificationId,
              isReadByUser,
              unreadCount: newUnreadCount,
              timestamp: new Date().toISOString(),
            };

            requestAnimationFrame(() => {
              try {
                document.dispatchEvent(
                  new CustomEvent("read-status-changed", {
                    detail: eventDetail,
                  }),
                );
              } catch (eventError) {
                console.error(
                  "Errore nell'emissione dell'evento read-status-changed:",
                  eventError,
                );
              }
            });
          }
        } catch (error) {
          console.error(
            "Errore nell'aggiornamento dello stato di lettura:",
            error,
          );
        }
      })

      // Toggle pin status
      .addCase(togglePin.fulfilled, (state, action) => {
        const { notificationId, pinned } = action.payload;
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
          // Crea una copia locale delle notifiche
          const notificationsCopy = [...state.notifications];
          const notificationIndex = notificationsCopy.findIndex(
            (n) => n && n.notificationId === notificationId,
          );

          if (notificationIndex !== -1) {
            // Aggiorna la notifica nella copia locale
            notificationsCopy[notificationIndex] = {
              ...notificationsCopy[notificationIndex],
              archived,
            };

            // Se la notifica non era letta, ricalcola il conteggio
            if (!notificationsCopy[notificationIndex].isReadByUser) {
              const newUnreadCount = notificationsCopy.filter(
                (n) =>
                  n &&
                  typeof n === "object" &&
                  !n.isReadByUser &&
                  n.archived !== "1",
              ).length;
              state.unreadCount = newUnreadCount;
            }

            // Aggiorna lo stato in modo sicuro
            state.notifications = notificationsCopy;
          }
        } catch (error) {
          console.error("Errore nell'archiviazione della chat:", error);
        }
      })
      .addCase(unarchiveChat.fulfilled, (state, action) => {
        const { notificationId, archived } = action.payload;

        try {
          // Crea una copia locale delle notifiche
          const notificationsCopy = [...state.notifications];
          const notificationIndex = notificationsCopy.findIndex(
            (n) => n && n.notificationId === notificationId,
          );

          if (notificationIndex !== -1) {
            // Aggiorna la notifica nella copia locale
            notificationsCopy[notificationIndex] = {
              ...notificationsCopy[notificationIndex],
              archived,
            };

            // Se la notifica non era letta, ricalcola il conteggio
            if (!notificationsCopy[notificationIndex].isReadByUser) {
              const newUnreadCount = notificationsCopy.filter(
                (n) =>
                  n &&
                  typeof n === "object" &&
                  !n.isReadByUser &&
                  n.archived !== "1",
              ).length;
              state.unreadCount = newUnreadCount;
            }

            // Aggiorna lo stato in modo sicuro
            state.notifications = notificationsCopy;
          }
        } catch (error) {
          console.error("Errore nella riattivazione della chat:", error);
        }
      })

      // Reopen/close chat
      .addCase(reopenChat.fulfilled, (state, action) => {
        const { notificationId, isClosed } = action.payload;
        const notification = state.notifications.find(
          (n) => n.notificationId === notificationId,
        );

        if (notification) {
          notification.isClosed = isClosed;
        }
      })
      .addCase(closeChat.fulfilled, (state, action) => {
        const { notificationId, isClosed } = action.payload;
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
        const notification = state.notifications.find(
          (n) => n.notificationId === notificationId,
        );

        if (notification) {
          notification.chatLeft = chatLeft;

          // Filter messages after leaving
          const messages = parseMessages(notification.messages);
          const filteredMessages = filterMessagesAfterLeaving(
            messages,
            chatLeft,
          );
          notification.messages = Array.isArray(notification.messages)
            ? filteredMessages
            : JSON.stringify(filteredMessages);
        }
      })

      // Toggle mute
      .addCase(toggleMuteChat.fulfilled, (state, action) => {
        const { notificationId, isMuted, muteExpiryDate } = action.payload;
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
        const notification = state.notifications.find(
          (n) => n.notificationId === notificationId,
        );

        if (notification) {
          notification.title = title;
        }
      })

      // Gestione aggiornamenti dal worker
      .addCase("notifications/updateFromWorker", (state, action) => {
        try {
          // Verifica se il payload è valido
          if (!action.payload) {
            console.error(
              "Payload non valido in updateFromWorker (null/undefined)",
            );
            return;
          }

          if (!Array.isArray(action.payload)) {
            console.error(
              "Payload non valido in updateFromWorker (non è un array):",
              action.payload,
            );
            return;
          }

          // Salva il valore corrente per rilevare cambiamenti
          const previousUnreadCount = state.unreadCount;

          // Aggiorna solo se ci sono dati validi
          const newNotifications = [...action.payload]; // Crea una copia per evitare problemi con i proxy

          // Aggiorna le notifiche nello state in modo sicuro
          state.notifications = newNotifications;

          // Calcola in modo sicuro il conteggio non letti
          try {
            state.unreadCount = newNotifications.filter(
              (n) => n && n.isReadByUser === false && n.archived !== "1",
            ).length;
          } catch (countError) {
            console.error("Errore nel calcolo dei non letti:", countError);
            // Mantieni il valore precedente in caso di errore
          }

          // Controlla se il conteggio è cambiato
          const unreadCountChanged = previousUnreadCount !== state.unreadCount;

          // Emetti un evento in modo sicuro
          if (unreadCountChanged) {
            // Usa solo dati locali già presenti nello state, non accedere allo store
            const currentUnreadCount = state.unreadCount || 0;

            // Emetti l'evento in modo sincrono senza setTimeout
            try {
              document.dispatchEvent(
                new CustomEvent("notifications-updated", {
                  detail: {
                    timestamp: new Date().toISOString(),
                    unreadCount: currentUnreadCount,
                    unreadCountChanged: true,
                  },
                }),
              );
            } catch (eventError) {
              console.error(
                "Errore nell'emissione dell'evento notifications-updated:",
                eventError,
              );
            }
          }
        } catch (error) {
          console.error("Errore critico in updateFromWorker:", error);
          // Non propagare l'errore, ma registralo
        }
      });
  },
});

// Helper function to filter messages after leaving chat
const filterMessagesAfterLeaving = (messages, chatLeft) => {
  if (!chatLeft || !Array.isArray(messages) || messages.length === 0) {
    return messages;
  }

  // Find the message that indicates the user left the chat
  const leaveIndex = messages.findIndex(
    (msg) =>
      msg.message &&
      msg.message.includes("ha lasciato la chat") &&
      msg.senderId === getUserId(),
  );

  // If there's a leave message, show only messages up to that point
  if (leaveIndex !== -1) {
    return messages.slice(0, leaveIndex + 1);
  }

  return messages;
};

// Selectors
export const selectNotifications = (state) => state.notifications.notifications;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectLoading = (state) => state.notifications.loading;
export const selectSending = (state) => state.notifications.sending;
export const selectError = (state) => state.notifications.error;
export const selectUnreadMessages = (state) =>
  state.notifications.unreadMessages;
export const selectOpenChatIds = (state) => state.notifications.openChatIds;
export const selectDbViewCreated = (state) => state.notifications.dbViewCreated;
export const selectHighlights = (state) => state.notifications.highlights;
export const selectLoadingHighlights = (state) =>
  state.notifications.loadingHighlights;
export const selectAttachmentsLoading = (state) =>
  state.notifications.attachmentsLoading;
export const selectNotificationAttachments = (state) =>
  state.notifications.notificationAttachments;
export const selectStandaloneChats = (state) =>
  state.notifications.standaloneChats;

// Check if notification is muted
export const isNotificationMuted = (notification) => {
  if (!notification.isMuted) return false;

  // If there's no expiry date, it's muted forever
  if (!notification.muteExpiryDate) return true;

  // Check if the expiry date has passed
  const now = new Date();
  const expiryDate = new Date(notification.muteExpiryDate);
  return now < expiryDate;
};

// Export actions
export const {
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
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
