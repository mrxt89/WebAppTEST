// hooks/useCalendar.js
import { useState, useCallback } from "react";
import axiosInstance from "@/lib/axios";

const useCalendar = () => {
  const [state, setState] = useState({
    loading: false,
    error: null,
    preferences: null,
    lastPreferencesFetch: null,
  });

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minuti

  const getTaskEvents = useCallback(async (taskId) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await axiosInstance.get(
        `/calendar/tasks/${taskId}/events`,
      );

      return response.data;
    } catch (err) {
      setState((prev) => ({ ...prev, error: err.message }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const syncCalendarEvent = useCallback(
    async (taskId, participants, reminderTime) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await axiosInstance.post(
          `/calendar/tasks/${taskId}/events`,
          {
            participants: participants.map((p) => ({
              ...p,
              reminderMinutes: parseInt(reminderTime),
            })),
            createdBy: parseInt(JSON.parse(atob(token.split(".")[1])).UserId), // Aggiungi l'userId dal token JWT
          },
        );

        return response.data;
      } catch (err) {
        setState((prev) => ({ ...prev, error: err.message }));
        throw err;
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [],
  );

  const removeCalendarEvent = useCallback(async (taskId, eventId) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await axiosInstance.delete(
        `/calendar/tasks/${taskId}/events/${eventId}`,
      );

      return response.data;
    } catch (err) {
      setState((prev) => ({ ...prev, error: err.message }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const getCalendarPreferences = useCallback(
    async (forceRefresh = false) => {
      try {
        // Check cache first
        if (
          !forceRefresh &&
          state.preferences &&
          state.lastPreferencesFetch &&
          Date.now() - state.lastPreferencesFetch < CACHE_DURATION
        ) {
          return state.preferences;
        }

        setState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await axiosInstance.get(
          `/calendar/preferences`,
        );

        const preferences = await response.json();
        setState((prev) => ({
          ...prev,
          preferences,
          lastPreferencesFetch: Date.now(),
        }));

        return preferences;
      } catch (err) {
        setState((prev) => ({ ...prev, error: err.message }));
        throw err;
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [state.preferences, state.lastPreferencesFetch],
  );

  const updateCalendarPreferences = useCallback(async (preferences) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await axiosInstance.put(
        `/calendar/preferences`,
        preferences,
      );

      const updatedPreferences = await response.json();
      setState((prev) => ({
        ...prev,
        preferences: updatedPreferences,
        lastPreferencesFetch: Date.now(),
      }));

      return updatedPreferences;
    } catch (err) {
      setState((prev) => ({ ...prev, error: err.message }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  return {
    ...state,
    getTaskEvents,
    syncCalendarEvent,
    removeCalendarEvent,
    getCalendarPreferences,
    updateCalendarPreferences,
  };
};

export default useCalendar;
