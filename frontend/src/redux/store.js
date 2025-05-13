// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import notificationsReducer from './features/notifications/notificationsSlice';
import messageReactionsReducer from './features/notifications/messageReactionsSlice';
import messageManagementReducer from './features/notifications/messageManagementSlice';
import pollsReducer from './features/notifications/pollsSlice';
import highlightsReducer from './features/notifications/highlightsSlice';
import documentLinksReducer from './features/notifications/documentLinksSlice';
import notificationsWorkerMiddleware from './middleware/notificationsWorkerMiddleware';
import windowSyncMiddleware from './middleware/windowSyncMiddleware';
import notificationSettingsReducer from './features/notifications/notificationSettingsSlice';
import { enableMapSet } from 'immer';

// Abilita il supporto per Map e Set in Immer
enableMapSet();

export const store = configureStore({
  reducer: {
    notifications: notificationsReducer,
    notificationSettings: notificationSettingsReducer,
    // Nuovi reducer per le funzionalità aggiuntive
    messageReactions: messageReactionsReducer,
    messageManagement: messageManagementReducer,
    polls: pollsReducer,
    highlights: highlightsReducer,
    documentLinks: documentLinksReducer,
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