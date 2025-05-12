// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import notificationsReducer from './features/notifications/notificationsSlice';
import notificationsWorkerMiddleware from './middleware/notificationsWorkerMiddleware';
import windowSyncMiddleware from './middleware/windowSyncMiddleware'; // Nuovo middleware
import { notificationSettingsSlice } from '../components/settings/NotificationSettings';
import { enableMapSet } from 'immer';

// Abilita il supporto per Map e Set in Immer
enableMapSet();

export const store = configureStore({
  reducer: {
    notifications: notificationsReducer,
    notificationSettings: notificationSettingsSlice.reducer,
    // Qui potrai aggiungere altri reducer in futuro
  },
  // Attiva devTools solo in development
  devTools: process.env.NODE_ENV !== 'production',
  // Aggiungiamo i middleware per gestire il worker delle notifiche e la sincronizzazione tra finestre
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: {
        // Ignora questi path durante la verifica di serializzabilità
        ignoredActions: [
          'notifications/updateFromWorker',
          'notifications/registerStandaloneChat',
          'notifications/unregisterStandaloneChat',
          'notifications/initializeStandaloneChats'
        ],
        ignoredPaths: [
          'notifications.openChatIds', 
          'notifications.standaloneChats'
        ]
      }
    }).concat([
      notificationsWorkerMiddleware, 
      windowSyncMiddleware
    ])
});

// Esponi lo store per debugging
if (process.env.NODE_ENV !== 'production') {
  window.reduxStore = store;
}