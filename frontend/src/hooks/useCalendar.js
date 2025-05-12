// hooks/useCalendar.js
import { useState, useCallback } from 'react';
import { config } from '../config';

const useCalendar = () => {
    const [state, setState] = useState({
        loading: false,
        error: null,
        preferences: null,
        lastPreferencesFetch: null
    });

    const CACHE_DURATION = 5 * 60 * 1000; // 5 minuti

    const getTaskEvents = useCallback(async (taskId) => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_BASE_URL}/calendar/tasks/${taskId}/events`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch calendar events');
            }
            
            return await response.json();
        } catch (err) {
            setState(prev => ({ ...prev, error: err.message }));
            throw err;
        } finally {
            setState(prev => ({ ...prev, loading: false }));
        }
    }, []);

    const syncCalendarEvent = useCallback(async (taskId, participants, reminderTime) => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_BASE_URL}/calendar/tasks/${taskId}/events`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    participants: participants.map(p => ({
                        ...p,
                        reminderMinutes: parseInt(reminderTime)
                    })),
                    createdBy: parseInt(JSON.parse(atob(token.split('.')[1])).UserId) // Aggiungi l'userId dal token JWT
                })
            });
    
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to sync calendar event');
            }
    
            return await response.json();
        } catch (err) {
            setState(prev => ({ ...prev, error: err.message }));
            throw err;
        } finally {
            setState(prev => ({ ...prev, loading: false }));
        }
    }, []);

    const removeCalendarEvent = useCallback(async (taskId, eventId) => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${config.API_BASE_URL}/calendar/tasks/${taskId}/events/${eventId}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete calendar event');
            }

            return await response.json();
        } catch (err) {
            setState(prev => ({ ...prev, error: err.message }));
            throw err;
        } finally {
            setState(prev => ({ ...prev, loading: false }));
        }
    }, []);

    const getCalendarPreferences = useCallback(async (forceRefresh = false) => {
        try {
            // Check cache first
            if (!forceRefresh && 
                state.preferences && 
                state.lastPreferencesFetch && 
                Date.now() - state.lastPreferencesFetch < CACHE_DURATION) {
                return state.preferences;
            }

            setState(prev => ({ ...prev, loading: true, error: null }));
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_BASE_URL}/calendar/preferences`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch calendar preferences');
            }

            const preferences = await response.json();
            setState(prev => ({ 
                ...prev, 
                preferences,
                lastPreferencesFetch: Date.now()
            }));

            return preferences;
        } catch (err) {
            setState(prev => ({ ...prev, error: err.message }));
            throw err;
        } finally {
            setState(prev => ({ ...prev, loading: false }));
        }
    }, [state.preferences, state.lastPreferencesFetch]);

    const updateCalendarPreferences = useCallback(async (preferences) => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_BASE_URL}/calendar/preferences`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(preferences)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update calendar preferences');
            }

            const updatedPreferences = await response.json();
            setState(prev => ({ 
                ...prev, 
                preferences: updatedPreferences,
                lastPreferencesFetch: Date.now()
            }));

            return updatedPreferences;
        } catch (err) {
            setState(prev => ({ ...prev, error: err.message }));
            throw err;
        } finally {
            setState(prev => ({ ...prev, loading: false }));
        }
    }, []);

    return {
        ...state,
        getTaskEvents,
        syncCalendarEvent,
        removeCalendarEvent,
        getCalendarPreferences,
        updateCalendarPreferences
    };
};

export default useCalendar;