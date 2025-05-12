// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import notificationsReducer from './features/notifications/notificationsSlice';
import notificationsWorkerMiddleware from './middleware/notificationsWorkerMiddleware';
import { notificationSettingsSlice } from '../components/settings/NotificationSettings';

export const store = configureStore({
  reducer: {
    notifications: notificationsReducer,
    notificationSettings: notificationSettingsSlice.reducer,
    // Qui potrai aggiungere altri reducer in futuro
  },
  // Attiva devTools solo in development
  devTools: process.env.NODE_ENV !== 'production',
  // Aggiungiamo il middleware per gestire il worker delle notifiche
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: {
        // Ignora questi path durante la verifica di serializzabilità
        ignoredActions: ['notifications/updateFromWorker'],
        ignoredPaths: ['notifications.openChatIds']
      }
    }).concat(notificationsWorkerMiddleware)
});