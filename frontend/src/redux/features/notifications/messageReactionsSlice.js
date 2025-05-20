// src/redux/features/notifications/messageReactionsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { config } from "../../../config";

// Async thunks for message reactions
export const fetchMessageReactions = createAsyncThunk(
  "messageReactions/fetchReactions",
  async (messageId, { rejectWithValue }) => {
    try {
      if (!messageId) {
        return rejectWithValue("Invalid messageId provided");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        return rejectWithValue("No authentication token available");
      }

      const response = await axios.get(
        `${config.API_BASE_URL}/messages/${messageId}/reactions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data && response.data.success) {
        return {
          messageId,
          reactions: response.data.reactions || [],
        };
      }

      return rejectWithValue("Unexpected response format from reactions API");
    } catch (error) {
      console.error("Error fetching message reactions:", error);
      return rejectWithValue(
        error.message || "Failed to fetch message reactions",
      );
    }
  },
);

export const loadMessageReactions = createAsyncThunk(
  "messageReactions/loadBatchReactions",
  async (messageIds = [], { rejectWithValue }) => {
    try {
      if (!messageIds || messageIds.length === 0) {
        return rejectWithValue("No message IDs provided");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        return rejectWithValue("No authentication token available");
      }

      // Try to use a batch endpoint if available
      try {
        const batchResponse = await axios.post(
          `${config.API_BASE_URL}/messages/batch-reactions`,
          { messageIds },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (batchResponse.data && batchResponse.data.success) {
          return batchResponse.data.reactions || {};
        }
      } catch (err) {
        console.log(
          "Batch reactions endpoint not available, falling back to separate requests",
        );
      }

      // Fallback: load with limited parallelism
      const MAX_PARALLEL = 5;
      const results = {};

      for (let i = 0; i < messageIds.length; i += MAX_PARALLEL) {
        const batch = messageIds.slice(i, i + MAX_PARALLEL);

        await Promise.all(
          batch.map(async (messageId) => {
            try {
              const response = await axios.get(
                `${config.API_BASE_URL}/messages/${messageId}/reactions`,
                { headers: { Authorization: `Bearer ${token}` } },
              );

              if (response.data && response.data.success) {
                results[messageId] = response.data.reactions || [];
              }
            } catch (error) {
              console.error(
                `Error loading reactions for message ${messageId}:`,
                error,
              );
            }
          }),
        );

        // Small pause between batches to not overload the server
        if (i + MAX_PARALLEL < messageIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return results;
    } catch (error) {
      console.error("Error loading batch message reactions:", error);
      return rejectWithValue(error.message || "Failed to load batch reactions");
    }
  },
);

export const toggleMessageReaction = createAsyncThunk(
  "messageReactions/toggleReaction",
  async ({ messageId, reactionType }, { rejectWithValue, dispatch }) => {
    try {
      if (!messageId || !reactionType) {
        return rejectWithValue("Invalid messageId or reactionType");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        return rejectWithValue("No authentication token available");
      }

      // Get the notification ID for this message first
      let notificationId = null;
      try {
        const notificationResult = await axios.get(
          `${config.API_BASE_URL}/messages/${messageId}/notification`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (notificationResult.data && notificationResult.data.success) {
          notificationId = notificationResult.data.notificationId;
        }
      } catch (err) {
        console.warn(
          "Could not pre-fetch notificationId, will try to extract from response",
          err,
        );
      }

      // Call API to add/remove the reaction
      const response = await axios.post(
        `${config.API_BASE_URL}/messages/${messageId}/reactions`,
        { reactionType },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.data || !response.data.success) {
        return rejectWithValue(
          response.data?.message || "Failed to toggle reaction",
        );
      }

      // Use the notification ID from response if we don't have it already
      if (!notificationId && response.data.notificationId) {
        notificationId = response.data.notificationId;
      }

      // If we have the notification ID, update the notification data
      if (notificationId) {
        dispatch({
          type: "notifications/fetchNotificationById",
          payload: notificationId,
        });

        // Emit an event to notify other components
        const event = new CustomEvent("message-reaction-updated", {
          detail: {
            messageId,
            notificationId,
            action: response.data.action || "modified",
          },
        });
        document.dispatchEvent(event);
      }

      return {
        messageId,
        reactionType,
        notificationId,
        action: response.data.action || "modified",
      };
    } catch (error) {
      console.error("Error toggling message reaction:", error);
      return rejectWithValue(error.message || "Failed to toggle reaction");
    }
  },
);

export const removeMessageReaction = createAsyncThunk(
  "messageReactions/removeReaction",
  async (reactionId, { rejectWithValue, dispatch }) => {
    try {
      if (!reactionId) {
        return rejectWithValue("Invalid reactionId provided");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        return rejectWithValue("No authentication token available");
      }

      // First get info about the reaction
      let messageId = null;
      let notificationId = null;

      try {
        const infoResponse = await axios.get(
          `${config.API_BASE_URL}/reactions/${reactionId}/info`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (infoResponse.data && infoResponse.data.success) {
          messageId = infoResponse.data.messageId;
          notificationId = infoResponse.data.notificationId;
        }
      } catch (err) {
        console.warn("Could not get reaction info before deletion", err);
      }

      // Now remove the reaction
      const response = await axios.delete(
        `${config.API_BASE_URL}/reactions/${reactionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.data || !response.data.success) {
        return rejectWithValue(
          response.data?.message || "Failed to remove reaction",
        );
      }

      // If we didn't get the notification ID before, use it from the response
      if (!notificationId && response.data.notificationId) {
        notificationId = response.data.notificationId;
      }

      // If we have the notification ID, update the UI
      if (notificationId) {
        dispatch({
          type: "notifications/fetchNotificationById",
          payload: notificationId,
        });

        // Emit an event to notify other components
        const event = new CustomEvent("message-reaction-updated", {
          detail: {
            messageId,
            notificationId,
            action: "removed",
            reactionId,
          },
        });
        document.dispatchEvent(event);
      }

      return {
        reactionId,
        messageId,
        notificationId,
        action: "removed",
      };
    } catch (error) {
      console.error("Error removing message reaction:", error);
      return rejectWithValue(error.message || "Failed to remove reaction");
    }
  },
);

// Message reactions slice
const messageReactionsSlice = createSlice({
  name: "messageReactions",
  initialState: {
    reactions: {}, // Organized by messageId
    loading: false,
    error: null,
  },
  reducers: {
    clearMessageReactions: (state, action) => {
      if (action.payload) {
        // Clear reactions for a specific message
        const messageId = action.payload;
        delete state.reactions[messageId];
      } else {
        // Clear all reactions
        state.reactions = {};
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch message reactions
      .addCase(fetchMessageReactions.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMessageReactions.fulfilled, (state, action) => {
        state.loading = false;
        const { messageId, reactions } = action.payload;
        state.reactions[messageId] = reactions;
      })
      .addCase(fetchMessageReactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Load batch message reactions
      .addCase(loadMessageReactions.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadMessageReactions.fulfilled, (state, action) => {
        state.loading = false;
        // Merge the batch results into the existing reactions
        state.reactions = {
          ...state.reactions,
          ...action.payload,
        };
      })
      .addCase(loadMessageReactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Toggle message reaction
      .addCase(toggleMessageReaction.pending, (state) => {
        state.loading = true;
      })
      .addCase(toggleMessageReaction.fulfilled, (state, action) => {
        state.loading = false;
        // We don't update the reactions directly here,
        // as we'll get the updated list from fetchNotificationById
      })
      .addCase(toggleMessageReaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Remove message reaction
      .addCase(removeMessageReaction.pending, (state) => {
        state.loading = true;
      })
      .addCase(removeMessageReaction.fulfilled, (state, action) => {
        state.loading = false;
        // We don't update the reactions directly here,
        // as we'll get the updated list from fetchNotificationById
      })
      .addCase(removeMessageReaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export actions
export const { clearMessageReactions } = messageReactionsSlice.actions;

// Export selectors
export const selectMessageReactions = (state, messageId) =>
  state.messageReactions.reactions[messageId] || [];
export const selectReactionsLoading = (state) => state.messageReactions.loading;
export const selectReactionsError = (state) => state.messageReactions.error;

export default messageReactionsSlice.reducer;
