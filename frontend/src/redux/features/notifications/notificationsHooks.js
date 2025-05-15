// src/redux/features/notifications/notificationsHooks.js
import { useCallback, useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { swal } from '../../../lib/common';
import axios from 'axios';
import { config } from '../../../config';

// Importa le azioni e i selettori dal notificationsSlice
import {
  fetchNotifications,
  fetchNotificationById,
  createDBNotificationsView,
  sendNotification,
  toggleReadUnread,
  togglePin,
  toggleFavorite,
  archiveChat,
  unarchiveChat,
  reopenChat,
  closeChat,
  leaveChat,
  toggleMuteChat,
  updateChatTitle,
  registerOpenChat,
  unregisterOpenChat,
  markMessageAsReceived,
  resetNotificationError,
  isNotificationMuted,
  selectNotifications,
  selectUnreadCount,
  selectLoading,
  selectSending,
  selectError,
  selectUnreadMessages,
  selectOpenChatIds,
  selectDbViewCreated,
  selectHighlights,
  selectLoadingHighlights,
  selectAttachmentsLoading,
  selectNotificationAttachments,
  // Nuovi selettori e azioni per chat in finestre separate
  selectStandaloneChats,
  registerStandaloneChat,
  unregisterStandaloneChat,
  initializeStandaloneChats,
  cleanupStandaloneChats
} from './notificationsSlice';

// Importa azioni worker e altre azioni
import {
  initializeNotificationsWorker,
  reloadNotifications,
  stopNotificationsWorker,
  fetchNotificationAttachments,
  uploadNotificationAttachment,
  refreshAttachments,
  deleteNotificationAttachment,
  downloadNotificationAttachment,
  sendNotificationWithAttachments,
  removeUserFromChat
} from './notificationsActions';

// Importa funzionalità da messageReactionsSlice
import {
  fetchMessageReactions,
  loadMessageReactions,
  toggleMessageReaction,
  removeMessageReaction,
  selectMessageReactions,
  selectReactionsLoading,
  
} from './messageReactionsSlice';

// Importa funzionalità da messageManagementSlice
import {
  editMessage,
  getMessageVersionHistory,
  deleteMessage,
  setMessageColor,
  clearMessageColor,
  filterMessages,
  selectVersionHistory,
  selectFilteredMessages,
  selectMessageManagementLoading
} from './messageManagementSlice';

// Importa funzionalità da pollsSlice
import {
  createPoll,
  votePoll,
  getPoll,
  getNotificationPolls,
  closePoll,
  selectPoll,
  selectNotificationPolls,
  selectMessagePoll,
  selectPollsLoading
} from './pollsSlice';

// Importa funzionalità da highlightsSlice
import {
  fetchHighlights as fetchHighlightsAction,
  addHighlight,
  removeHighlight,
  generateHighlights,
  selectHighlights as selectHighlightsData,
  selectHighlightsLoading as selectHighlightsDataLoading
} from './highlightsSlice';

// Importa funzionalità da documentLinksSlice
import {
  getLinkedDocuments,
  searchDocuments,
  linkDocument,
  unlinkDocument,
  searchChatsByDocument,
  openChatInReadOnlyMode,
  selectLinkedDocuments,
  selectDocumentSearchResults,
  selectChatsByDocument,
  selectDocumentLinksLoading
} from './documentLinksSlice';

// Hook to provide all notification-related state and actions
export const useNotifications = () => {
  const dispatch = useDispatch();
  
  // Selectors from notificationsSlice
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const loading = useSelector(selectLoading);
  const sending = useSelector(selectSending);
  const error = useSelector(selectError);
  const unreadMessages = useSelector(selectUnreadMessages);
  const openChatIds = useSelector(selectOpenChatIds);
  const dbViewCreated = useSelector(selectDbViewCreated);
  const highlights = useSelector(selectHighlights);
  const loadingHighlights = useSelector(selectLoadingHighlights);
  const attachmentsLoading = useSelector(selectAttachmentsLoading);
  const notificationAttachments = useSelector(selectNotificationAttachments);
  const standaloneChats = useSelector(selectStandaloneChats);
  
  // Selectors from new slices
  const reactionsLoading = useSelector(selectReactionsLoading);
  const messageManagementLoading = useSelector(selectMessageManagementLoading);
  const pollsLoading = useSelector(selectPollsLoading);
  const highlightsDataLoading = useSelector(selectHighlightsDataLoading);
  const documentLinksLoading = useSelector(selectDocumentLinksLoading);
  
  // Stato locale per tracciare l'ultima volta che è stato eseguito un aggiornamento
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  // Ref per tenere traccia delle operazioni in corso
  const pendingUpdatesRef = useRef(new Set());

  // Inizializza lo stato delle chat in finestre separate
  useEffect(() => {
    dispatch(initializeStandaloneChats());
  }, [dispatch]);

  // Worker management
  const initializeWorker = useCallback((forceInit = false) => {
    dispatch(initializeNotificationsWorker(forceInit ? { forceWorkerInit: true } : undefined));
  }, [dispatch]);

  const restartNotificationWorker = useCallback((highPriority = false) => {
    dispatch(stopNotificationsWorker());
    dispatch(initializeNotificationsWorker());
    dispatch(reloadNotifications(highPriority));
    return true;
  }, [dispatch]);
  
  // Basic notification actions
  const loadNotifications = useCallback(() => {
    const now = Date.now();
    // Evita aggiornamenti troppo frequenti (throttling)
    if (now - lastUpdateTime < 2000 && pendingUpdatesRef.current.has('load')) {
      return Promise.resolve(null);
    }
    
    pendingUpdatesRef.current.add('load');
    setLastUpdateTime(now);
    
    return dispatch(fetchNotifications())
      .finally(() => {
        pendingUpdatesRef.current.delete('load');
      });
  }, [dispatch, lastUpdateTime]);

  const handleNotificationUpdate = useCallback(async (notificationId, highPriority = false) => {
    if (!notificationId || pendingUpdatesRef.current.has(notificationId)) return;
    
    try {
      pendingUpdatesRef.current.add(notificationId);
      
      // Usa requestAnimationFrame per assicurarsi che il reducer sia completato
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // Aggiungi un piccolo delay per assicurarsi che il reducer sia completato
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Ora è sicuro chiamare fetchNotificationById
      await dispatch(fetchNotificationById(notificationId, highPriority)).unwrap();
      
    } catch (error) {
      console.error('Error updating notification:', error);
    } finally {
      pendingUpdatesRef.current.delete(notificationId);
    }
  }, [dispatch]);

  const getNotificationById = useCallback(async (notificationId, highPriority = false) => {
    if (!notificationId) return null;
    
    try {
      // Usa handleNotificationUpdate invece di dispatch direttamente
      await handleNotificationUpdate(notificationId, highPriority);
      
      // Ritorna la notifica dal selettore che è già disponibile
      return notifications.find(n => n.notificationId === parseInt(notificationId));
    } catch (error) {
      console.error('Error fetching notification by ID:', error);
      throw error;
    }
  }, [handleNotificationUpdate, notifications]);

  const DBNotificationsView = useCallback(() => {
    return dispatch(createDBNotificationsView()).unwrap();
  }, [dispatch]);

  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token available');
      
      const response = await axios.get(`${config.API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }, []);

  const fetchResponseOptions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token available');
      
      // According to backend routes, this is the endpoint for notification categories
      const response = await axios.get(`${config.API_BASE_URL}/notification-response-options`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching response options:', error);
      throw error;
    }
  }, []);

  const handleSendNotification = useCallback((notificationData, isNewMessage = false) => {
    return dispatch(sendNotification(notificationData))
      .unwrap()
      .then((result) => {
        // Additional logic if needed
        if (isNewMessage) {
          // Close new message modal or similar actions
          document.dispatchEvent(new CustomEvent('closeNewMessageModal'));
        }
        return result;
      })
      .catch((error) => {
        swal.fire('Errore', error, 'error');
        return false;
      });
  }, [dispatch]);

  // Message and notification status changes
  const handleToggleReadUnread = useCallback((notificationId, isReadByUser) => {
    return dispatch(toggleReadUnread({ notificationId, isReadByUser }))
      .unwrap()
      .catch((error) => {
        console.error('Error toggling read status:', error);
        throw error;
      });
  }, [dispatch]);

  const handleTogglePin = useCallback((notificationId, pinned) => {
    return dispatch(togglePin({ notificationId, pinned }))
      .unwrap()
      .catch((error) => {
        swal.fire('Errore', error, 'error');
        throw error;
      });
  }, [dispatch]);

  const handleToggleFavorite = useCallback((notificationId, favorite) => {
    return dispatch(toggleFavorite({ notificationId, favorite }))
      .unwrap()
      .catch((error) => {
        swal.fire('Errore', error, 'error');
        throw error;
      });
  }, [dispatch]);

  // Chat status management (archive, close, leave)
  const handleArchiveChat = useCallback((notificationId) => {
    return dispatch(archiveChat(notificationId))
      .unwrap()
      .then((result) => {
        return { success: true, message: 'Chat archiviata con successo' };
      })
      .catch((error) => {
        console.error('Error archiving chat:', error);
        throw error;
      });
  }, [dispatch]);

  const handleUnarchiveChat = useCallback((notificationId) => {
    return dispatch(unarchiveChat(notificationId))
      .unwrap()
      .then((result) => {
        return { success: true, message: 'Chat rimossa dall\'archivio con successo' };
      })
      .catch((error) => {
        console.error('Error unarchiving chat:', error);
        throw error;
      });
  }, [dispatch]);

  const handleReopenChat = useCallback(async (notificationId) => {
    try {
      const { value: confirm } = await swal.fire({
        title: 'Riapri la chat?',
        icon: 'question',
        showCancelButton: true,
        cancelButtonText: 'Annulla',
        confirmButtonText: 'Riapri',
      });
      
      if (!confirm) return false;

      await dispatch(reopenChat(notificationId)).unwrap();
      return true;
    } catch (error) {
      console.error('Error reopening chat:', error);
      swal.fire('Errore', error, 'error');
      return false;
    }
  }, [dispatch]);

  const handleCloseChat = useCallback(async (notificationId) => {
    try {
      const { value: confirm } = await swal.fire({
        title: 'Vuoi segnalare la conversazione come chiusa?',
        icon: 'question',
        showCancelButton: true,
        cancelButtonText: 'Annulla',
        confirmButtonText: 'Conferma',
      });
      
      if (!confirm) return false;

      await dispatch(closeChat(notificationId)).unwrap();
      return true;
    } catch (error) {
      console.error('Error closing chat:', error);
      swal.fire('Errore', error, 'error');
      return false;
    }
  }, [dispatch]);

  const handleLeaveChat = useCallback(async (notificationId) => {
    try {
      const { value: confirm } = await swal.fire({
        title: 'Abbandonare la chat?',
        text: 'Non potrai più inviare messaggi in questa conversazione',
        icon: 'warning',
        showCancelButton: true,
        cancelButtonText: 'Annulla',
        confirmButtonText: 'Abbandona',
      });
      
      if (!confirm) return false;

      await dispatch(leaveChat(notificationId)).unwrap();
      return true;
    } catch (error) {
      console.error('Error leaving chat:', error);
      swal.fire('Errore', error.message, 'error');
      return false;
    }
  }, [dispatch]);

  const handleToggleMuteChat = useCallback((notificationId, isMuted, duration = null) => {
    return dispatch(toggleMuteChat({ notificationId, isMuted, duration }))
      .unwrap()
      .catch((error) => {
        swal.fire('Errore', error, 'error');
        throw error;
      });
  }, [dispatch]);

const forceLoadNotifications = useCallback(() => {
  // Usa un flag per tracciare se un aggiornamento è già in corso
  if (pendingUpdatesRef.current.has('forceLoad')) {
    return Promise.resolve(null);
  }

  pendingUpdatesRef.current.add('forceLoad');
  
  // Usa una Promise per gestire l'aggiornamento in modo asincrono
  return new Promise((resolve) => {
    // Usa setTimeout per assicurarsi che nessun reducer sia in esecuzione
    setTimeout(() => {
      // Esegui l'aggiornamento in modo sicuro
      dispatch(fetchNotifications())
        .then(() => {
          // Configura l'event listener per i nuovi messaggi in modo sicuro
          const handleNewMessage = (event) => {
            const { notificationId } = event.detail || {};
            if (notificationId) {
              // Usa setTimeout per evitare chiamate durante l'esecuzione del reducer
              setTimeout(() => {
                dispatch(fetchNotificationById(notificationId));
              }, 0);
            }
          };
          
          // Rimuovi prima listener esistenti per evitare duplicati
          document.removeEventListener('new-message-received', handleNewMessage);
          document.addEventListener('new-message-received', handleNewMessage);
          
          resolve(null);
        })
        .catch(error => {
          console.error('Errore nel caricamento forzato:', error);
          resolve(null);
        })
        .finally(() => {
          pendingUpdatesRef.current.delete('forceLoad');
        });
    }, 0);
  });
}, [dispatch]);

  const handleUpdateChatTitle = useCallback(async (notificationId, newTitle) => {
    try {
      // Show loading indicator
      swal.fire({
        title: 'Aggiornamento in corso...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          swal.showLoading();
        }
      });
      
      await dispatch(updateChatTitle({ notificationId, newTitle })).unwrap();
      
      // Show success message
      swal.fire({
        icon: 'success',
        title: 'Titolo aggiornato',
        text: 'Il titolo della chat è stato aggiornato con successo',
        timer: 2000,
        showConfirmButton: false
      });
      
      return true;
    } catch (error) {
      console.error('Error updating chat title:', error);
      
      // Show error message
      swal.fire({
        icon: 'error',
        title: 'Errore',
        text: error || 'Non è stato possibile aggiornare il titolo'
      });
      
      return false;
    }
  }, [dispatch]);

  const handleRegisterOpenChat = useCallback((notificationId) => {
    dispatch(registerOpenChat(notificationId));
  }, [dispatch]);

  const handleUnregisterOpenChat = useCallback((notificationId) => {
    dispatch(unregisterOpenChat(notificationId));
  }, [dispatch]);

  const handleMarkMessageAsReceived = useCallback((notificationId, messageId) => {
    dispatch(markMessageAsReceived({ notificationId, messageId }));
  }, [dispatch]);

  const handleResetError = useCallback(() => {
    dispatch(resetNotificationError());
  }, [dispatch]);

  // Attachment management
  const getNotificationAttachments = useCallback((notificationId) => {
    return dispatch(fetchNotificationAttachments(notificationId)).unwrap();
  }, [dispatch]);

  const uploadAttachment = useCallback((notificationId, file, messageId = null) => {
    return dispatch(uploadNotificationAttachment({ notificationId, file, messageId })).unwrap();
  }, [dispatch]);

  const deleteAttachment = useCallback((attachmentId, notificationId) => {
    return dispatch(deleteNotificationAttachment({ attachmentId, notificationId })).unwrap();
  }, [dispatch]);

  const downloadAttachment = useCallback((attachmentId, fileName) => {
    return dispatch(downloadNotificationAttachment({ attachmentId, fileName })).unwrap();
  }, [dispatch]);

  const handleSendNotificationWithAttachments = useCallback((notificationData, attachments = []) => {
    console.log('Invio notifica con allegati:', notificationData, attachments);
    return dispatch(sendNotificationWithAttachments({ notificationData, attachments })).unwrap();
  }, [dispatch]);

  const handleRefreshAttachments = useCallback((notificationId) => {
    return dispatch(refreshAttachments(notificationId)).unwrap();
  }, [dispatch]);

  const handleReloadNotifications = useCallback((highPriority = false) => {
    return dispatch(reloadNotifications(highPriority));
  }, [dispatch]);

  // Gestione chat in finestre separate
  const handleRegisterStandaloneChat = useCallback((notificationId) => {
    dispatch(registerStandaloneChat(notificationId));
  }, [dispatch]);
  
  const handleUnregisterStandaloneChat = useCallback((notificationId) => {
    dispatch(unregisterStandaloneChat(notificationId));
  }, [dispatch]);
  
  const isStandaloneChat = useCallback((notificationId) => {
    return standaloneChats.has(parseInt(notificationId));
  }, [standaloneChats]);
  
  // Funzione per aprire una chat in una finestra separata
  const openChatInNewWindow = useCallback((notificationId, title, onSuccess = null) => {
    if (!notificationId) {
      console.error('openChatInNewWindow: notificationId mancante');
      return false;
    }
    
    try {
      // Verifica se la chat è già aperta in una finestra separata
      if (isStandaloneChat(notificationId)) {
        // Tenta di trovare e attivare la finestra esistente
        const windowName = `chat_${notificationId}`;
        const existingWindow = window.open('', windowName);
        
        if (existingWindow && !existingWindow.closed && existingWindow.location.href !== 'about:blank') {
          existingWindow.focus();
          
          // Se abbiamo una callback di successo, chiamala per chiudere il modale
          if (onSuccess && typeof onSuccess === 'function') {
            onSuccess();
          }
          
          return true;
        }
      }
      
      // Registra la chat come aperta in finestra separata prima di aprirla
      // Questo evita race condition se l'apertura è lenta
      dispatch(registerStandaloneChat(notificationId));
      
      // Prepara URL e dimensioni ottimali
      const url = `/standalone-chat/${notificationId}`;
      
      // Dimensiona la finestra in modo ottimale
      const width = Math.min(window.innerWidth * 0.8, 1200);
      const height = Math.min(window.innerHeight * 0.8, 800);
      
      // Centra la finestra rispetto alla finestra principale
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      // Configura il nome e parametri finestra
      const windowName = `chat_${notificationId}`;
      const windowFeatures = [
        `width=${Math.floor(width)}`,
        `height=${Math.floor(height)}`,
        `left=${Math.floor(left)}`,
        `top=${Math.floor(top)}`,
        'resizable=yes',
        'scrollbars=yes',
        'status=yes',
        'location=yes',
        'toolbar=no',
        'menubar=no'
      ].join(',');
      
      // Apri la nuova finestra
      const newWindow = window.open(url, windowName, windowFeatures);
      
      // Controlla se la finestra è stata bloccata dal browser
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        console.error('Apertura finestra bloccata dal browser');
        
        // Rimuovi la registrazione se la finestra non può essere aperta
        dispatch(unregisterStandaloneChat(notificationId));
        
        // Notifica all'utente
        swal.fire({
          icon: 'warning',
          title: 'Popup bloccato',
          text: 'Il browser ha bloccato l\'apertura della nuova finestra. Abilita i popup per questo sito.'
        });
        return false;
      }
      
      // Se l'apertura ha avuto successo e abbiamo una callback, chiamala (per chiudere il modale)
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess();
      }
      
      // Registra un evento di chiusura nella finestra principale
      // per ripulire quando la finestra viene chiusa esternamente
      const checkWindowInterval = setInterval(() => {
        if (newWindow.closed) {
          clearInterval(checkWindowInterval);
          dispatch(unregisterStandaloneChat(notificationId));
        }
      }, 5000);
      
      // Prova a impostare il focus sulla nuova finestra dopo un breve ritardo
      setTimeout(() => {
        if (newWindow && !newWindow.closed) {
          try {
            newWindow.focus();
          } catch (e) {
            console.warn('Errore durante il focus della finestra:', e);
          }
        }
      }, 300);
      
      return true;
    } catch (error) {
      console.error('Errore durante l\'apertura della finestra standalone:', error);
      
      // Ripulisci la registrazione in caso di errore
      try {
        dispatch(unregisterStandaloneChat(notificationId));
      } catch (e) {
        console.error('Errore durante la pulizia:', e);
      }
      
      return false;
    }
  }, [dispatch, isStandaloneChat]);
  
  // Funzione per verificare se una finestra separata è ancora aperta
  const isWindowStillOpen = useCallback((notificationId) => {
    if (!isStandaloneChat(notificationId)) {
      return false;
    }
    
    try {
      const windowName = `chat_${notificationId}`;
      const win = window.open('', windowName);
      
      // Controlli migliorati per determinare se la finestra è effettivamente aperta
      const isWindowOpen = win && 
                         !win.closed && 
                         win.location.href !== 'about:blank' &&
                         win.location.href.includes('standalone-chat');
      
      // Se la finestra non è più disponibile, annulla la registrazione
      if (!isWindowOpen) {
        dispatch(unregisterStandaloneChat(notificationId));
        return false;
      }
      
      // Chiudi il riferimento e ritorna true
      try {
        win.focus();
      } catch (e) {
        console.warn('Errore durante focus:', e);
        // Continua comunque, perché la finestra potrebbe essere comunque aperta
      }
      
      return true;
    } catch (e) {
      // In caso di errore (ad es. per cross-origin), assumiamo che la finestra sia chiusa
      console.error('Errore durante verifica finestra:', e);
      dispatch(unregisterStandaloneChat(notificationId));
      return false;
    }
  }, [dispatch, isStandaloneChat]);
  
  // Funzione per verificare e pulire le chat in finestre separate non più attive
  const cleanupStandaloneWindows = useCallback(() => {
    const toRemove = [];
    
    // Converti il Set in array
    const chats = Array.from(standaloneChats);
    
    for (const id of chats) {
      // Per ogni ID, verifica se la finestra è ancora aperta
      try {
        const windowName = `chat_${id}`;
        const win = window.open('', windowName);
        
        // Controlli più dettagliati
        if (!win || 
            win.closed || 
            win.location.href === 'about:blank' ||
            !win.location.href.includes('standalone-chat')) {
          
          toRemove.push(id);
        }
      } catch (e) {
        console.error(`Error checking window for chat ${id}:`, e);
        toRemove.push(id);
      }
    }
    
    // Esegui pulizia se necessario
    if (toRemove.length > 0) {
      dispatch(cleanupStandaloneChats(toRemove));
    }
    
    return toRemove.length;
  }, [dispatch, standaloneChats]);
  
  // Nuove funzioni per le reazioni ai messaggi
  const getMessageReactions = useCallback((messageId) => {
    return dispatch(fetchMessageReactions(messageId)).unwrap();
  }, [dispatch]);
  
  const loadBatchMessageReactions = useCallback((messageIds) => {
    return dispatch(loadMessageReactions(messageIds)).unwrap();
  }, [dispatch]);
  
  const handleToggleMessageReaction = useCallback((messageId, reactionType) => {
    return dispatch(toggleMessageReaction({ messageId, reactionType })).unwrap();
  }, [dispatch]);
  
  const handleRemoveMessageReaction = useCallback((reactionId) => {
    return dispatch(removeMessageReaction(reactionId)).unwrap();
  }, [dispatch]);
  
  // Nuove funzioni per la gestione dei messaggi
  const handleEditMessage = useCallback((messageId, newMessage) => {
    return dispatch(editMessage({ messageId, newMessage })).unwrap();
  }, [dispatch]);
  
  const handleGetMessageVersionHistory = useCallback((messageId) => {
    return dispatch(getMessageVersionHistory(messageId)).unwrap();
  }, [dispatch]);
  
  const handleDeleteMessage = useCallback((messageId) => {
    return dispatch(deleteMessage(messageId)).unwrap();
  }, [dispatch]);
  
  const handleSetMessageColor = useCallback((messageId, color) => {
    return dispatch(setMessageColor({ messageId, color })).unwrap();
  }, [dispatch]);
  
  const handleClearMessageColor = useCallback((messageId) => {
    return dispatch(clearMessageColor(messageId)).unwrap();
  }, [dispatch]);
  
  const handleFilterMessages = useCallback((notificationId, filter) => {
    return dispatch(filterMessages({ notificationId, ...filter })).unwrap();
  }, [dispatch]);
  
  // Nuove funzioni per i sondaggi
  const handleCreatePoll = useCallback((pollData) => {
    return dispatch(createPoll(pollData)).unwrap();
  }, [dispatch]);
  
  const handleVotePoll = useCallback((optionId) => {
    return dispatch(votePoll(optionId)).unwrap();
  }, [dispatch]);
  
  const handleGetPoll = useCallback((pollId) => {
    return dispatch(getPoll(pollId)).unwrap();
  }, [dispatch]);
  
  const handleGetNotificationPolls = useCallback((notificationId) => {
    return dispatch(getNotificationPolls(notificationId)).unwrap();
  }, [dispatch]);
  
  const handleClosePoll = useCallback((pollId) => {
    return dispatch(closePoll(pollId)).unwrap();
  }, [dispatch]);
  
  // Nuove funzioni per punti importanti
  const handleFetchHighlights = useCallback((notificationId) => {
    return dispatch(fetchHighlightsAction(notificationId)).unwrap();
  }, [dispatch]);
  
  const handleAddHighlight = useCallback((notificationId, highlightText, isAutoGenerated = false) => {
    return dispatch(addHighlight({ notificationId, highlightText, isAutoGenerated })).unwrap();
  }, [dispatch]);
  
  const handleRemoveHighlight = useCallback((highlightId, notificationId) => {
    return dispatch(removeHighlight({ highlightId, notificationId })).unwrap();
  }, [dispatch]);
  
  const handleGenerateHighlights = useCallback((notificationId) => {
    return dispatch(generateHighlights(notificationId)).unwrap();
  }, [dispatch]);
  
  // Nuove funzioni per collegamenti ai documenti
  const handleGetLinkedDocuments = useCallback((notificationId) => {
    return dispatch(getLinkedDocuments(notificationId)).unwrap();
  }, [dispatch]);
  
  const handleSearchDocuments = useCallback((searchQuery) => {
    return dispatch(searchDocuments(searchQuery)).unwrap();
  }, [dispatch]);
  
  const handleLinkDocument = useCallback((notificationId, documentId) => {
    return dispatch(linkDocument({ notificationId, documentId })).unwrap();
  }, [dispatch]);
  
  const handleUnlinkDocument = useCallback((notificationId, documentId) => {
    return dispatch(unlinkDocument({ notificationId, documentId })).unwrap();
  }, [dispatch]);
  
  const handleSearchChatsByDocument = useCallback((searchType, searchValue) => {
    return dispatch(searchChatsByDocument({ searchType, searchValue })).unwrap();
  }, [dispatch]);
  
  const handleOpenChatInReadOnlyMode = useCallback((notificationId) => {
    return dispatch(openChatInReadOnlyMode(notificationId)).unwrap();
  }, [dispatch]);
  
  // Pulizia automatica delle finestre non più attive
  useEffect(() => {
    // Esegui pulizia all'avvio
    cleanupStandaloneWindows();
    
    // Esegui pulizia periodica ogni 30 secondi
    const interval = setInterval(() => {
      cleanupStandaloneWindows();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [cleanupStandaloneWindows]);

  const handleRemoveUserFromChat = useCallback(async (notificationId, userToRemoveId) => {
  try {
    // Mostra una conferma all'utente
    const { isConfirmed } = await swal.fire({
      title: 'Rimuovere utente',
      text: 'Sei sicuro di voler rimuovere questo utente dalla chat?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sì, rimuovi',
      cancelButtonText: 'Annulla',
      confirmButtonColor: '#d33'
    });
    
    if (!isConfirmed) return false;
    
    const result = await dispatch(removeUserFromChat({ 
      notificationId, 
      userToRemoveId 
    })).unwrap();
    
    if (result.success) {
      // Mostra un messaggio di conferma
      swal.fire({
        title: 'Utente rimosso',
        text: 'L\'utente è stato rimosso dalla chat',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error removing user from chat:', error);
    swal.fire({
      title: 'Errore',
      text: error.message || 'Impossibile rimuovere l\'utente dalla chat',
      icon: 'error'
    });
    return false;
  }
}, [dispatch]);

  return {
    // State
    notifications,
    unreadCount,
    loading,
    sending,
    error,
    unreadMessages,
    openChatIds: Array.from(openChatIds), // Convert Set to Array
    dbViewCreated,
    highlights,
    loadingHighlights,
    attachmentsLoading,
    notificationAttachments,
    standaloneChats: Array.from(standaloneChats), // Convert Set to Array
    
    // Worker management
    initializeWorker,
    restartNotificationWorker,
    forceLoadNotifications,
    reloadNotifications: handleReloadNotifications,
    
    // Basic notification actions
    loadNotifications,
    fetchNotificationById: getNotificationById,
    DBNotificationsView,
    sendNotification: handleSendNotification,
    fetchUsers,
    fetchResponseOptions,
    
    
    // Message and notification status changes
    toggleReadUnread: handleToggleReadUnread,
    togglePin: handleTogglePin,
    toggleFavorite: handleToggleFavorite,
    markMessageAsReceived: handleMarkMessageAsReceived,
    
    // Chat status management
    archiveChat: handleArchiveChat,
    unarchiveChat: handleUnarchiveChat,
    reopenChat: handleReopenChat,
    closeChat: handleCloseChat,
    leaveChat: handleLeaveChat,
    toggleMuteChat: handleToggleMuteChat,
    updateChatTitle: handleUpdateChatTitle,
    removeUserFromChat: handleRemoveUserFromChat,

    // Open chat tracking
    registerOpenChat: handleRegisterOpenChat,
    unregisterOpenChat: handleUnregisterOpenChat,
    
    // Error handling
    resetError: handleResetError,
    
    // Attachments
    getNotificationAttachments,
    uploadNotificationAttachment: uploadAttachment,
    deleteNotificationAttachment: deleteAttachment,
    downloadNotificationAttachment: downloadAttachment,
    sendNotificationWithAttachments: handleSendNotificationWithAttachments,
    refreshAttachments: handleRefreshAttachments,
    
    // Utility functions
    isNotificationMuted,
    
    // Standalone chat management
    registerStandaloneChat: handleRegisterStandaloneChat,
    unregisterStandaloneChat: handleUnregisterStandaloneChat,
    isStandaloneChat,
    openChatInNewWindow,
    isWindowStillOpen,
    cleanupStandaloneWindows,
    
    // Message reactions (new)
    getMessageReactions,
    loadMessageReactions: loadBatchMessageReactions,
    toggleMessageReaction: handleToggleMessageReaction,
    removeMessageReaction: handleRemoveMessageReaction,
    
    // Message management (new)
    editMessage: handleEditMessage,
    getMessageVersionHistory: handleGetMessageVersionHistory,
    deleteMessage: handleDeleteMessage,
    setMessageColor: handleSetMessageColor,
    clearMessageColor: handleClearMessageColor,
    filterMessages: handleFilterMessages,
    
    // Polls (new)
    createPoll: handleCreatePoll,
    votePoll: handleVotePoll,
    getPoll: handleGetPoll,
    getNotificationPolls: handleGetNotificationPolls,
    closePoll: handleClosePoll,
    
    // Highlights (new)
    fetchHighlights: handleFetchHighlights,
    addHighlight: handleAddHighlight,
    removeHighlight: handleRemoveHighlight,
    generateHighlights: handleGenerateHighlights,
    
    // Document links (new)
    getLinkedDocuments: handleGetLinkedDocuments,
    searchDocuments: handleSearchDocuments,
    linkDocument: handleLinkDocument,
    unlinkDocument: handleUnlinkDocument,
    searchChatsByDocument: handleSearchChatsByDocument,
    openChatInReadOnlyMode: handleOpenChatInReadOnlyMode,
  };
};

export default useNotifications;