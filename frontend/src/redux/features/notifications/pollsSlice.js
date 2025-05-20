// src/redux/features/notifications/pollsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { config } from "../../../config";
import { fetchNotificationById } from "./notificationsSlice";

// Async thunk for creating a poll
export const createPoll = createAsyncThunk(
  "polls/createPoll",
  async (
    {
      notificationId,
      messageId,
      question,
      options,
      allowMultipleAnswers,
      expirationDate,
    },
    { rejectWithValue, dispatch },
  ) => {
    try {
      if (!notificationId || !messageId) {
        return rejectWithValue("Invalid notification or message ID");
      }

      if (
        !question ||
        !options ||
        !Array.isArray(options) ||
        options.length < 2
      ) {
        return rejectWithValue(
          "Invalid poll data: question and at least 2 options are required",
        );
      }

      const token = localStorage.getItem("token");
      if (!token) {
        return rejectWithValue("No authentication token available");
      }

      const response = await axios.post(
        `${config.API_BASE_URL}/polls`,
        {
          notificationId,
          messageId,
          question,
          options,
          allowMultipleAnswers,
          expirationDate,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data && response.data.success) {
        // Update the notification to include the new poll
        dispatch(fetchNotificationById(notificationId));

        // Emit an event for other components
        const event = new CustomEvent("poll-created", {
          detail: {
            pollId: response.data.poll?.id,
            notificationId,
            messageId,
          },
        });
        document.dispatchEvent(event);

        return {
          success: true,
          poll: response.data.poll,
          notificationId,
          messageId,
        };
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to create poll",
        );
      }
    } catch (error) {
      console.error("Error creating poll:", error);
      return rejectWithValue(error.message || "Failed to create poll");
    }
  },
);

// Async thunk for voting in a poll
export const votePoll = createAsyncThunk(
  "polls/votePoll",
  async (optionId, { rejectWithValue, dispatch }) => {
    try {
      if (!optionId) {
        return rejectWithValue("Invalid option ID");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        return rejectWithValue("No authentication token available");
      }

      const response = await axios.post(
        `${config.API_BASE_URL}/polls/${optionId}/vote`,
        { optionId },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data && response.data.success) {
        // If the response includes notification ID, update it
        if (response.data.notificationId) {
          dispatch(fetchNotificationById(response.data.notificationId));
        }

        // Emit an event for other components
        const event = new CustomEvent("poll-voted", {
          detail: {
            pollId: response.data.pollId,
            optionId,
            results: response.data.results,
          },
        });
        document.dispatchEvent(event);

        return {
          success: true,
          pollId: response.data.pollId,
          optionId,
          results: response.data.results,
        };
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to vote in poll",
        );
      }
    } catch (error) {
      console.error("Error voting in poll:", error);
      return rejectWithValue(error.message || "Failed to vote in poll");
    }
  },
);

// Async thunk for getting a specific poll
export const getPoll = createAsyncThunk(
  "polls/getPoll",
  async (pollId, { rejectWithValue }) => {
    try {
      if (!pollId) {
        return rejectWithValue("Invalid poll ID");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        return rejectWithValue("No authentication token available");
      }

      const response = await axios.get(
        `${config.API_BASE_URL}/polls/${pollId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data && response.data.success) {
        return {
          pollId,
          poll: response.data.poll,
        };
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to retrieve poll",
        );
      }
    } catch (error) {
      console.error("Error getting poll:", error);
      return rejectWithValue(error.message || "Failed to retrieve poll");
    }
  },
);

// Async thunk for getting all polls for a notification
export const getNotificationPolls = createAsyncThunk(
  "polls/getNotificationPolls",
  async (notificationId, { rejectWithValue }) => {
    try {
      if (!notificationId) {
        return rejectWithValue("Invalid notification ID");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        return rejectWithValue("No authentication token available");
      }

      const response = await axios.get(
        `${config.API_BASE_URL}/notifications/${notificationId}/polls`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data && response.data.success) {
        // Convert array to a map indexed by messageId for easier lookup
        const pollsMap = {};
        if (response.data.polls && Array.isArray(response.data.polls)) {
          response.data.polls.forEach((poll) => {
            if (poll.MessageID) {
              pollsMap[poll.MessageID] = poll;
            }
          });
        }

        return {
          notificationId,
          polls: response.data.polls || [],
          pollsMap,
        };
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to retrieve polls",
        );
      }
    } catch (error) {
      console.error("Error getting notification polls:", error);
      return rejectWithValue(error.message || "Failed to retrieve polls");
    }
  },
);

// Async thunk for closing a poll
export const closePoll = createAsyncThunk(
  "polls/closePoll",
  async (pollId, { rejectWithValue, dispatch }) => {
    try {
      if (!pollId) {
        return rejectWithValue("Invalid poll ID");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        return rejectWithValue("No authentication token available");
      }

      const response = await axios.post(
        `${config.API_BASE_URL}/polls/${pollId}/close`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data && response.data.success) {
        // If the response includes notification ID, update it
        if (response.data.notificationId) {
          dispatch(fetchNotificationById(response.data.notificationId));
        }

        // Emit an event for other components
        const event = new CustomEvent("poll-closed", {
          detail: {
            pollId,
            poll: response.data.poll,
          },
        });
        document.dispatchEvent(event);

        return {
          success: true,
          pollId,
          poll: response.data.poll,
        };
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to close poll",
        );
      }
    } catch (error) {
      console.error("Error closing poll:", error);
      return rejectWithValue(error.message || "Failed to close poll");
    }
  },
);

// Polls slice
const pollsSlice = createSlice({
  name: "polls",
  initialState: {
    polls: {}, // Organized by pollId
    notificationPolls: {}, // Organized by notificationId -> messageId -> poll
    loading: false,
    error: null,
  },
  reducers: {
    clearPolls: (state, action) => {
      if (action.payload) {
        // Clear polls for a specific notification
        const notificationId = action.payload;
        delete state.notificationPolls[notificationId];
      } else {
        // Clear all polls
        state.polls = {};
        state.notificationPolls = {};
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Create poll
      .addCase(createPoll.pending, (state) => {
        state.loading = true;
      })
      .addCase(createPoll.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.poll) {
          const { poll, notificationId, messageId } = action.payload;
          // Store in polls by ID
          state.polls[poll.id] = poll;

          // Also store in notification polls
          if (!state.notificationPolls[notificationId]) {
            state.notificationPolls[notificationId] = {};
          }

          if (messageId) {
            state.notificationPolls[notificationId][messageId] = poll;
          }
        }
      })
      .addCase(createPoll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Vote in poll
      .addCase(votePoll.pending, (state) => {
        state.loading = true;
      })
      .addCase(votePoll.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.pollId && action.payload.results) {
          // Update poll with new results
          if (state.polls[action.payload.pollId]) {
            state.polls[action.payload.pollId].results = action.payload.results;
            state.polls[action.payload.pollId].userHasVoted = true;
          }
        }
      })
      .addCase(votePoll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get poll
      .addCase(getPoll.pending, (state) => {
        state.loading = true;
      })
      .addCase(getPoll.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.poll) {
          state.polls[action.payload.pollId] = action.payload.poll;
        }
      })
      .addCase(getPoll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get all polls for a notification
      .addCase(getNotificationPolls.pending, (state) => {
        state.loading = true;
      })
      .addCase(getNotificationPolls.fulfilled, (state, action) => {
        state.loading = false;
        const { notificationId, polls, pollsMap } = action.payload;

        // Store all polls by their ID
        if (polls && Array.isArray(polls)) {
          polls.forEach((poll) => {
            if (poll.id) {
              state.polls[poll.id] = poll;
            }
          });
        }

        // Store polls organized by notification and message
        state.notificationPolls[notificationId] = pollsMap || {};
      })
      .addCase(getNotificationPolls.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Close poll
      .addCase(closePoll.pending, (state) => {
        state.loading = true;
      })
      .addCase(closePoll.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.poll) {
          const { pollId, poll } = action.payload;
          // Update poll with closed status
          state.polls[pollId] = poll;

          // Also update in notification polls if possible
          if (poll.notificationId && poll.messageId) {
            if (state.notificationPolls[poll.notificationId]) {
              state.notificationPolls[poll.notificationId][poll.messageId] =
                poll;
            }
          }
        }
      })
      .addCase(closePoll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export actions
export const { clearPolls } = pollsSlice.actions;

// Export selectors
export const selectPoll = (state, pollId) => state.polls.polls[pollId] || null;
export const selectNotificationPolls = (state, notificationId) =>
  state.polls.notificationPolls[notificationId] || {};
export const selectMessagePoll = (state, notificationId, messageId) =>
  state.polls.notificationPolls[notificationId]?.[messageId] || null;
export const selectPollsLoading = (state) => state.polls.loading;
export const selectPollsError = (state) => state.polls.error;

export default pollsSlice.reducer;
