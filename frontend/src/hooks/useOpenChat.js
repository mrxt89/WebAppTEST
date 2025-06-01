// src/hooks/useOpenChat.js
import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectOpenChatData, 
  setOpenChatData,
  appendMessagesToChat,
  selectHasFullChatData,
  registerOpenChat,
  unregisterOpenChat,
  addMessageToOpenChat,
  // Sposta questi import da notificationsActions a notificationsSlice
  fetchNotificationById,
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
  replaceTemporaryMessage 
} from '@/redux/features/notifications/notificationsSlice';
import { 
  loadMoreMessages,
  removeUserFromChat,
  uploadNotificationAttachment,
  fetchNotificationAttachments,
  refreshAttachments,
  fetchChatParticipants
} from '@/redux/features/notifications/notificationsActions';
import notificationService from '@/services/notifications/NotificationService';
import { config } from '@/config';
import axios from 'axios';

export const useOpenChat = (notificationId, options = {}) => {
  const dispatch = useDispatch();
  const chatData = useSelector(state => selectOpenChatData(state, notificationId));
  // CORREZIONE: Usa useSelector invece di store.getState()
  const hasFullData = useSelector(state => selectHasFullChatData(state, notificationId));
  
  // Stati per tracciare nuovi messaggi
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [newMessagesStartIndex, setNewMessagesStartIndex] = useState(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const lastReadMessageIdRef = useRef(null);
  const lastKnownMessageCountRef = useRef(0);
  
  // Stati per il caricamento
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Stati per tracciare l'interazione utente
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [lastInteractionTime, setLastInteractionTime] = useState(null);
  
  // Ref per evitare duplicazioni
  const loadingRef = useRef(false);
  const refreshTimeoutRef = useRef(null);
  const newMessageTimeoutRef = useRef(null);
  const lastRefreshTimeRef = useRef(0);
  
  // Parse dei messaggi
  const messages = useMemo(() => {
    if (!chatData?.messages) return [];
    return Array.isArray(chatData.messages) 
      ? chatData.messages 
      : JSON.parse(chatData.messages || "[]");
  }, [chatData?.messages]);
  
  // Parse dei membri
  const membersInfo = useMemo(() => {
    console.log("useOpenChat - Membri:", chatData?.membersInfo);
    if (!chatData?.membersInfo) return [];
    
    // Se è già un array, usalo direttamente
    if (Array.isArray(chatData.membersInfo)) {
      return chatData.membersInfo;
    }
    
    // Se è un oggetto con participants, usa quello
    if (chatData.membersInfo?.participants) {
      return chatData.membersInfo.participants;
    }
    
    // Se è una stringa, prova a fare il parse
    if (typeof chatData.membersInfo === 'string') {
      try {
        const parsed = JSON.parse(chatData.membersInfo);
        return parsed.participants || parsed;
      } catch (e) {
        console.error('Error parsing membersInfo:', e);
        return [];
      }
    }
    
    return [];
  }, [chatData?.membersInfo]);

  // Refresh dei partecipanti
  const refreshParticipants = useCallback(async () => {
    if (!notificationId) return;
    
    try {
      const result = await dispatch(fetchChatParticipants(notificationId)).unwrap();
      console.log("useOpenChat - Aggiornamento partecipanti:", result);
      if (result && result.participants) {
        // I dati vengono automaticamente aggiornati nello store
        return result.participants;
      }
    } catch (error) {
      console.error('Error refreshing participants:', error);
      return null;
    }
  }, [dispatch, notificationId]);

  useEffect(() => {
    const handleParticipantsUpdate = (event) => {
      const { notificationId: eventNotificationId } = event.detail;
      
      if (parseInt(eventNotificationId) === parseInt(notificationId)) {
        console.log(`[useOpenChat] Aggiornamento partecipanti richiesto per chat ${notificationId}`);
        refreshParticipants();
      }
    };
    
    document.addEventListener('chat-participants-update', handleParticipantsUpdate);
    
    return () => {
      document.removeEventListener('chat-participants-update', handleParticipantsUpdate);
    };
  }, [notificationId, refreshParticipants]);
  
  // Calcola info sui messaggi
  const messageStats = useMemo(() => {
    const totalCount = chatData?.totalMessageCount || chatData?.messageCount || messages.length;
    const hasMore = messages.length < totalCount;
    const oldestMessageId = messages.length > 0 ? messages[0].messageId : null;
    const newestMessageId = messages.length > 0 ? messages[messages.length - 1].messageId : null;
    
    return {
      totalCount,
      loadedCount: messages.length,
      hasMoreMessages: hasMore,
      oldestMessageId,
      newestMessageId
    };
  }, [chatData, messages]);
  
  // Caricamento iniziale
  const loadInitialData = useCallback(async (forceRefresh = false) => {
    if (loadingRef.current || (!forceRefresh && hasFullData)) return;
    
    loadingRef.current = true;
    setIsLoadingInitial(true);
    setError(null);
    
    try {
      const response = await axios.get(
        `${config.API_BASE_URL}/notifications/${notificationId}?pageSize=25&openChat=1&t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Cache-Control": "no-cache"
          }
        }
      );
      
      if (response.data) {
        dispatch(setOpenChatData({
          notificationId,
          data: {
            ...response.data,
            _isInitialLoad: true,
            lastFullUpdate: Date.now()
          }
        }));
        
        // Salva il conteggio iniziale
        lastKnownMessageCountRef.current = response.data.messageCount || 0;
        
        // Marca come letto se necessario
        if (!response.data.isReadByUser) {
          dispatch(toggleReadUnread({ notificationId, isReadByUser: true }));
        }
        
        // Carica allegati
        dispatch(fetchNotificationAttachments(notificationId));
        
        return response.data;
      }
    } catch (error) {
      console.error('Error loading initial chat data:', error);
      setError(error.message || 'Errore nel caricamento della chat');
      throw error;
    } finally {
      loadingRef.current = false;
      setIsLoadingInitial(false);
    }
  }, [dispatch, notificationId, hasFullData]);
  
  // Carica più messaggi (paginazione)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !messageStats.hasMoreMessages || !messageStats.oldestMessageId) {
      return null;
    }
    
    setIsLoadingMore(true);
    setError(null);
    
    try {
      const result = await dispatch(loadMoreMessages({
        notificationId,
        lastMessageId: messageStats.oldestMessageId,
        pageSize: 25
      })).unwrap();
      
      if (result?.newMessages) {
        dispatch(appendMessagesToChat({
          notificationId,
          messages: result.newMessages,
          hasMoreMessages: result.hasMoreMessages,
          totalMessageCount: result.totalMessageCount
        }));
        
        return {
          loadedCount: result.newMessages.length,
          hasMore: result.hasMoreMessages
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error loading more messages:', error);
      setError(error.message || 'Errore nel caricamento dei messaggi');
      return null;
    } finally {
      setIsLoadingMore(false);
    }
  }, [dispatch, notificationId, isLoadingMore, messageStats]);
  
  // Refresh dei dati (per aggiornamenti real-time)
  const refreshData = useCallback(async (options = {}) => {
    // Implementa throttling per evitare refresh troppo frequenti
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
    
    if (!options.force && timeSinceLastRefresh < 1000) {
      console.log('Refresh skipped: too soon since last refresh');
      return;
    }
    
    if (isRefreshing && !options.force) return;
    
    setIsRefreshing(true);
    lastRefreshTimeRef.current = now;
    
    try {
      const updatedData = await dispatch(
        fetchNotificationById(notificationId, true)
      ).unwrap();
      
      if (updatedData) {
        // Controlla se ci sono nuovi messaggi
        const newMessageCount = updatedData.messageCount || 0;
        const previousCount = lastKnownMessageCountRef.current;
        
        if (newMessageCount > previousCount && !userHasInteracted) {
          // Ci sono nuovi messaggi
          setHasNewMessages(true);
          setUnreadMessagesCount(newMessageCount - previousCount);
          
          // Trova l'indice del primo nuovo messaggio
          const currentMessages = Array.isArray(updatedData.messages) 
            ? updatedData.messages 
            : JSON.parse(updatedData.messages || "[]");
          
          if (currentMessages.length > previousCount) {
            setNewMessagesStartIndex(previousCount);
          }
          
          // Notifica audio/browser se abilitato
          if (options.playSound !== false && notificationService) {
            const lastMessage = currentMessages[currentMessages.length - 1];
          }

        }
        console.log("useOpenChat - Aggiornamento dati:", updatedData);
        lastKnownMessageCountRef.current = newMessageCount;
        
        return updatedData;
      }
    } catch (error) {
      console.error('Error refreshing chat data:', error);
      setError(error.message || 'Errore nell\'aggiornamento della chat');
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatch, notificationId, isRefreshing, userHasInteracted]);
  
  // Gestione invio messaggi - AGGIORNATA per gestire receiversList
  const sendMessage = useCallback(async (messageData) => {
    const { message, attachments = [], replyToMessageId = null, receiversList = "" } = messageData;
    
    if (!message.trim() && attachments.length === 0) return null;
    
    try {
      // Crea messaggio temporaneo per feedback immediato
      const currentUser = getCurrentUser();
      const tempMessageId = `temp_${Date.now()}`;
      const tempMessage = {
        messageId: tempMessageId,
        message: message.trim() || (attachments.length > 0 ? "Ha condiviso allegati" : ""),
        senderId: currentUser?.userId || 0,
        senderName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Tu",
        tbCreated: new Date().toISOString(),
        replyToMessageId,
        _isTemporary: true
      };
      
      // Aggiungi messaggio temporaneo
      dispatch(addMessageToOpenChat({ notificationId, message: tempMessage }));
      
      // Prepara dati notifica - IMPORTANTE: includi receiversList
      const notificationData = {
        notificationId,
        message: message.trim(),
        responseOptionId: 3,
        eventId: 0,
        title: chatData?.title || '',
        notificationCategoryId: chatData?.notificationCategoryId || 1,
        receiversList: receiversList || '', // IMPORTANTE: usa il valore passato
        replyToMessageId
      };
      
      console.log('useOpenChat - Invio messaggio con dati:', notificationData);
      
      // Invia messaggio
      const result = await dispatch(sendNotification(notificationData)).unwrap();
      
      if (result && result.success) {
        // Se abbiamo il messaggio reale dal server, sostituisci quello temporaneo
        if (result.lastMessage && result.realMessageId) {
          console.log('Sostituendo messaggio temporaneo con ID reale:', result.realMessageId);
          
          dispatch(replaceTemporaryMessage({
            notificationId,
            tempMessageId,
            realMessage: {
              ...result.lastMessage,
              messageId: result.realMessageId,
              senderId: currentUser?.userId || result.lastMessage.senderId,
              senderName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : result.lastMessage.senderName,
              isReadByUser: true, // Il mittente ha sempre letto il proprio messaggio
              selectedUser: "1" // Marca come messaggio proprio
            }
          }));
          
          // Aggiorna conteggio messaggi
          lastKnownMessageCountRef.current = result.messages?.length || lastKnownMessageCountRef.current + 1;
          
          // NON fare refresh completo, abbiamo già i dati aggiornati
          // Solo se ci sono allegati, fai un refresh dopo un po'
          if (attachments.length > 0) {
            setTimeout(() => {
              dispatch(fetchNotificationAttachments(notificationId));
            }, 1000);
          }
        } else {
          // Fallback: se non abbiamo i dati completi, fai refresh
          setTimeout(() => {
            refreshData({ force: true, playSound: false });
          }, 500);
        }
        
        return result;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Rimuovi il messaggio temporaneo in caso di errore
      // Potresti voler aggiungere una action per questo
      throw error;
    }
  }, [dispatch, notificationId, chatData, refreshData]);
  
  // Marca chat come interagita
  const markAsInteracted = useCallback(() => {
    if (!hasNewMessages) return;
    
    setUserHasInteracted(true);
    setHasNewMessages(false);
    setNewMessagesStartIndex(null);
    setUnreadMessagesCount(0);
    setLastInteractionTime(Date.now());
    
    // Aggiorna ultimo messaggio letto
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      lastReadMessageIdRef.current = lastMessage.messageId;
    }
    
    // Emetti evento per altri componenti
    document.dispatchEvent(new CustomEvent(`chat-${notificationId}-interacted`, {
      detail: { timestamp: Date.now() }
    }));
  }, [hasNewMessages, messages, notificationId]);
  
  // Funzioni di utilità
  const getCurrentUser = useCallback(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        return {
          userId: userData.userId || userData.UserId || userData.id,
          firstName: userData.firstName || userData.FirstName,
          lastName: userData.lastName || userData.LastName,
          isCurrentUser: true
        };
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    return null;
  }, []);
  
  const isOwnMessage = useCallback((message) => {
    const currentUser = getCurrentUser();
    if (!currentUser || !message) return false;
    
    return message.senderId === currentUser.userId || 
           message.senderId?.toString() === currentUser.userId?.toString();
  }, []);
  
  // Effect per gestire eventi di nuovi messaggi
  useEffect(() => {
    const handleNewMessage = (event) => {
      const { notificationId: eventNotificationId, newMessagesInfo } = event.detail;
      
      if (parseInt(eventNotificationId) === parseInt(notificationId)) {
        if (newMessageTimeoutRef.current) {
          clearTimeout(newMessageTimeoutRef.current);
        }
        
        newMessageTimeoutRef.current = setTimeout(() => {
          refreshData({ playSound: true, force: true });
        }, 200);
      }
    };
    
    const handleOpenChatNewMessage = (event) => {
      const { notificationId: eventNotificationId } = event.detail;
      
      if (parseInt(eventNotificationId) === parseInt(notificationId)) {
        console.log(`[useOpenChat] Nuovo messaggio per chat aperta ${notificationId}`);
        
        // Refresh immediato per chat aperte
        refreshData({ force: true, playSound: false });
      }
    };
    
    useEffect(() => {
      const handleOpenChatNewMessage = (event) => {
        const { notificationId: eventNotificationId } = event.detail;
        
        if (parseInt(eventNotificationId) === parseInt(notificationId)) {
          console.log(`[useOpenChat] Nuovo messaggio per chat aperta ${notificationId}`);
          
          // Forza un refresh completo dei dati
          refreshData({ force: true, playSound: false }).then(() => {
            console.log(`[useOpenChat] Dati aggiornati dopo nuovo messaggio`);
          });
        }
      };
      
      document.addEventListener('open-chat-new-message', handleOpenChatNewMessage);
      
      return () => {
        document.removeEventListener('open-chat-new-message', handleOpenChatNewMessage);
      };
    }, [notificationId, refreshData]);
    
    const handleReloadChat = (event) => {
      const { notificationId: eventNotificationId } = event.detail;
      
      if (parseInt(eventNotificationId) === parseInt(notificationId)) {
        refreshData({ force: true });
      }
    };
    
    const handleMessageSent = (event) => {
      const { notificationId: eventNotificationId } = event.detail;
      
      if (parseInt(eventNotificationId) === parseInt(notificationId)) {
        refreshData({ force: true, playSound: false });
      }
    };
    
    document.addEventListener('new_message', handleNewMessage);
    document.addEventListener('open-chat-new-message', handleOpenChatNewMessage);
    document.addEventListener('reload-open-chat', handleReloadChat);
    document.addEventListener('chat-message-sent', handleMessageSent);
    
    return () => {
      document.removeEventListener('new_message', handleNewMessage);
      document.removeEventListener('open-chat-new-message', handleOpenChatNewMessage);
      document.removeEventListener('reload-open-chat', handleReloadChat);
      document.removeEventListener('chat-message-sent', handleMessageSent);
      
      if (newMessageTimeoutRef.current) {
        clearTimeout(newMessageTimeoutRef.current);
      }
    };
  }, [notificationId, refreshData]);
  
  // Effect per registrare la chat come aperta
  useEffect(() => {
    dispatch(registerOpenChat(notificationId));
    
    // Informa il worker che questa chat è aperta
    if (window.notificationWorker) {
      // Ottieni tutte le chat aperte
      const openChatIds = new Set();
      openChatIds.add(parseInt(notificationId));
      
      // Aggiungi altre chat aperte se ce ne sono
      const chatWindows = document.querySelectorAll('.chat-window');
      chatWindows.forEach(window => {
        const id = window.getAttribute('data-notification-id');
        if (id) openChatIds.add(parseInt(id));
      });
      
      window.notificationWorker.postMessage({
        type: "update_open_chats",
        data: { openChatIds: Array.from(openChatIds) }
      });
    }
    
    return () => {
      dispatch(unregisterOpenChat(notificationId));
      
      // Informa il worker che questa chat è stata chiusa
      if (window.notificationWorker) {
        const openChatIds = new Set();
        const chatWindows = document.querySelectorAll('.chat-window');
        chatWindows.forEach(window => {
          const id = window.getAttribute('data-notification-id');
          if (id && parseInt(id) !== parseInt(notificationId)) {
            openChatIds.add(parseInt(id));
          }
        });
        
        window.notificationWorker.postMessage({
          type: "update_open_chats",
          data: { openChatIds: Array.from(openChatIds) }
        });
      }
    };
  }, [dispatch, notificationId]);
  
  // Effect per auto-refresh periodico
  useEffect(() => {
    if (options.autoRefresh !== false) {
      const interval = setInterval(() => {
        if (!document.hidden && !isLoadingMore && !isRefreshing) {
          refreshData();
        }
      }, 30000); // 30 secondi
      
      return () => clearInterval(interval);
    }
  }, [refreshData, isLoadingMore, isRefreshing, options.autoRefresh]);
  
  // Effect per gestire il focus della finestra
  useEffect(() => {
    const handleFocus = () => {
      // Quando la finestra torna in focus, controlla se ci sono aggiornamenti
      if (!isRefreshing && !isLoadingMore) {
        refreshData();
      }
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden && !isRefreshing && !isLoadingMore) {
        refreshData();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshData, isRefreshing, isLoadingMore]);
  
  // Funzioni per gestione chat
  const chatActions = useMemo(() => ({
    togglePin: (pinned) => dispatch(togglePin({ notificationId, pinned })),
    toggleFavorite: (favorite) => dispatch(toggleFavorite({ notificationId, favorite })),
    toggleMute: (isMuted, duration) => dispatch(toggleMuteChat({ notificationId, isMuted, duration })),
    updateTitle: (newTitle) => dispatch(updateChatTitle({ notificationId, newTitle })),
    archive: () => dispatch(archiveChat(notificationId)),
    unarchive: () => dispatch(unarchiveChat(notificationId)),
    leave: () => dispatch(leaveChat(notificationId)),
    reopen: () => dispatch(reopenChat(notificationId)),
    close: () => dispatch(closeChat(notificationId)),
    removeUser: (userId) => dispatch(removeUserFromChat({ notificationId, userToRemoveId: userId })),
    uploadAttachment: (file, messageId) => dispatch(uploadNotificationAttachment({ notificationId, file, messageId })),
    refreshAttachments: () => dispatch(refreshAttachments(notificationId))
  }), [dispatch, notificationId]);
  
  return {
    // Dati chat
    chatData,
    messages,
    membersInfo,
    messageStats,
    hasFullData,
    refreshParticipants,

    // Stati nuovi messaggi
    hasNewMessages,
    newMessagesStartIndex,
    unreadMessagesCount,
    lastReadMessageId: lastReadMessageIdRef.current,
    
    // Stati caricamento
    isLoadingInitial,
    isLoadingMore,
    isRefreshing,
    error,
    
    // Funzioni principali
    loadInitialData,
    loadMore,
    refreshData,
    sendMessage,
    markAsInteracted,
    
    // Azioni chat
    ...chatActions,
    
    // Utilities
    getCurrentUser,
    isOwnMessage,
    
    // Stati interazione
    userHasInteracted,
    lastInteractionTime
  };
};

export default useOpenChat;