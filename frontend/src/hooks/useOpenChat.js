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
  replaceTemporaryMessage,
  // NUOVO: Aggiungi questi import
  removeMessageFromOpenChat,
  updateMessageColorInOpenChat,
  updateMessageInOpenChat
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
  
  // IMPORTANTE: Usa direttamente i dati da Redux invece di mantenerli localmente
  const chatData = useSelector(state => selectOpenChatData(state, parseInt(notificationId)));
  const hasFullData = useSelector(state => selectHasFullChatData(state, parseInt(notificationId)));
  
  // Stati per tracciare nuovi messaggi
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [newMessagesStartIndex, setNewMessagesStartIndex] = useState(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const lastReadMessageIdRef = useRef(null);
  const lastKnownMessageCountRef = useRef(0);
  const previousMessageCountRef = useRef(0);
  
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
  
  // CORREZIONE: Parse dei messaggi direttamente da Redux
  const messages = useMemo(() => {
    if (!chatData?.messages) {
      console.log(`[useOpenChat] Nessun messaggio in chatData per ${notificationId}`);
      return [];
    }
    
    const parsedMessages = Array.isArray(chatData.messages) 
      ? chatData.messages 
      : JSON.parse(chatData.messages || "[]");
    
    console.log(`[useOpenChat] Messaggi parsati per chat ${notificationId}:`, parsedMessages.length);
    return parsedMessages;
  }, [chatData?.messages, notificationId]);
  
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

  // NUOVO: Funzione per rimuovere un messaggio localmente
  const removeMessageLocally = useCallback((messageId) => {
    console.log(`[useOpenChat] Rimuovendo messaggio ${messageId} localmente`);
    dispatch(removeMessageFromOpenChat({ 
      notificationId: parseInt(notificationId), 
      messageId: parseInt(messageId) 
    }));
  }, [dispatch, notificationId]);
  
  // NUOVO: Funzione per aggiornare il colore localmente
  const updateMessageColorLocally = useCallback((messageId, color) => {
    console.log(`[useOpenChat] Aggiornando colore messaggio ${messageId} a ${color} localmente`);
    dispatch(updateMessageColorInOpenChat({ 
      notificationId: parseInt(notificationId), 
      messageId: parseInt(messageId),
      color 
    }));
  }, [dispatch, notificationId]);

  // NUOVO: Funzione per aggiornare un messaggio localmente
  const updateMessageLocally = useCallback((messageId, updatedMessage) => {
    console.log(`[useOpenChat] Aggiornando messaggio ${messageId} localmente`);
    dispatch(updateMessageInOpenChat({ 
      notificationId: parseInt(notificationId), 
      messageId: parseInt(messageId),
      updatedMessage 
    }));
  }, [dispatch, notificationId]);

  // Modifica refreshData per aggiungere un delay opzionale
  const refreshData = useCallback(async (options = {}) => {
    const { force = false, delay = 0, playSound = false } = options;
    
    // Se c'è un delay, aspetta prima di fare il refresh
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Implementa throttling per evitare refresh troppo frequenti
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
    
    if (!force && timeSinceLastRefresh < 1000) {
      console.log('Refresh skipped: too soon since last refresh');
      return;
    }
    
    if (isRefreshing && !force) return;
    
    setIsRefreshing(true);
    lastRefreshTimeRef.current = now;
    
    try {
      console.log(`[useOpenChat] Refresh dati per chat ${notificationId}`);
      
      const updatedData = await dispatch(
        fetchNotificationById(parseInt(notificationId), true)
      ).unwrap();
      
      if (updatedData) {
        console.log(`[useOpenChat] Dati aggiornati ricevuti:`, {
          messageCount: updatedData.messageCount,
          lastMessage: updatedData.lastMessage
        });
        
        // I dati sono già stati aggiornati in Redux tramite fetchNotificationById
        // Non serve fare altro qui
        
        // Se richiesto, riproduci il suono di notifica
        if (playSound && window.notificationWorker) {
          window.notificationWorker.postMessage({
            type: "play_sound",
            data: { soundType: "new_message" }
          });
        }
        
        return updatedData;
      }
    } catch (error) {
      console.error('Error refreshing chat data:', error);
      setError(error.message || 'Errore nell\'aggiornamento della chat');
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatch, notificationId, isRefreshing]);

  // Rileva cambiamenti nei messaggi
  useEffect(() => {
    const currentMessageCount = messages.length;
    
    if (currentMessageCount > previousMessageCountRef.current) {
      console.log(`[useOpenChat] Nuovi messaggi rilevati: ${previousMessageCountRef.current} -> ${currentMessageCount}`);
      
      // Trova il primo nuovo messaggio
      const newStartIndex = previousMessageCountRef.current;
      setNewMessagesStartIndex(newStartIndex);
      
      // Determina se sono messaggi da altri utenti
      const newMessages = messages.slice(newStartIndex);
      const hasOtherUserMessages = newMessages.some(msg => 
        msg.selectedUser !== "1" && 
        !msg._isTemporary && 
        msg.senderId !== getCurrentUser()?.userId
      );
      
      if (hasOtherUserMessages && !userHasInteracted) {
        setHasNewMessages(true);
        setUnreadMessagesCount(newMessages.length);
      }
    }
    
    previousMessageCountRef.current = currentMessageCount;
  }, [messages, userHasInteracted]);

  // Refresh dei partecipanti
  const refreshParticipants = useCallback(async () => {
    if (!notificationId) return;
    
    try {
      const result = await dispatch(fetchChatParticipants(notificationId)).unwrap();
      console.log("useOpenChat - Aggiornamento partecipanti:", result);
      if (result && result.participants) {
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
      console.log(`[useOpenChat] Caricamento iniziale dati per chat ${notificationId}`);
      
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
        console.log(`[useOpenChat] Dati iniziali ricevuti:`, {
          messageCount: response.data.messageCount,
          hasMessages: !!response.data.messages
        });
        
        dispatch(setOpenChatData({
          notificationId: parseInt(notificationId),
          data: {
            ...response.data,
            _isInitialLoad: true,
            lastFullUpdate: Date.now()
          }
        }));
        
        // Salva il conteggio iniziale
        lastKnownMessageCountRef.current = response.data.messageCount || 0;
        previousMessageCountRef.current = Array.isArray(response.data.messages) 
          ? response.data.messages.length 
          : (typeof response.data.messages === 'string' ? JSON.parse(response.data.messages || "[]").length : 0);
        
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
        notificationId: parseInt(notificationId),
        lastMessageId: messageStats.oldestMessageId,
        pageSize: 25
      })).unwrap();
      
      if (result?.newMessages) {
        dispatch(appendMessagesToChat({
          notificationId: parseInt(notificationId),
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
  
  // Gestione invio messaggi
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
        _isTemporary: true,
        selectedUser: "1"
      };
      
      // Aggiungi messaggio temporaneo
      dispatch(addMessageToOpenChat({ 
        notificationId: parseInt(notificationId), 
        message: tempMessage 
      }));
      
      // Prepara dati notifica
      const notificationData = {
        notificationId: parseInt(notificationId),
        message: message.trim(),
        responseOptionId: 3,
        eventId: 0,
        title: chatData?.title || '',
        notificationCategoryId: chatData?.notificationCategoryId || 1,
        receiversList: receiversList || '',
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
            notificationId: parseInt(notificationId),
            tempMessageId,
            realMessage: {
              ...result.lastMessage,
              messageId: result.realMessageId,
              senderId: currentUser?.userId || result.lastMessage.senderId,
              senderName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : result.lastMessage.senderName,
              isReadByUser: true,
              selectedUser: "1"
            }
          }));
          
          // Aggiorna conteggio messaggi
          lastKnownMessageCountRef.current = result.messages?.length || lastKnownMessageCountRef.current + 1;
          
          // Se ci sono allegati, aggiorna dopo un po'
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
           message.senderId?.toString() === currentUser.userId?.toString() ||
           message.selectedUser === "1" ||
           message._isTemporary === true;
  }, [getCurrentUser]);
  
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
    //document.addEventListener('reload-open-chat', handleReloadChat);
    document.addEventListener('chat-message-sent', handleMessageSent);
    
    return () => {
      document.removeEventListener('new_message', handleNewMessage);
      document.removeEventListener('open-chat-new-message', handleOpenChatNewMessage);
      //document.removeEventListener('reload-open-chat', handleReloadChat);
      document.removeEventListener('chat-message-sent', handleMessageSent);
      
      if (newMessageTimeoutRef.current) {
        clearTimeout(newMessageTimeoutRef.current);
      }
    };
  }, [notificationId, refreshData]);
  
  // Effect per registrare la chat come aperta
  useEffect(() => {
    dispatch(registerOpenChat(parseInt(notificationId)));
    
    // Informa il worker che questa chat è aperta
    if (window.notificationWorker) {
      const openChatIds = new Set();
      openChatIds.add(parseInt(notificationId));
      
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
      dispatch(unregisterOpenChat(parseInt(notificationId)));
      
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
  
  // Effect per gestire il focus della finestra e il caricamento dei messaggi
  useEffect(() => {
    const handleFocus = async () => {
      if (!isRefreshing && !isLoadingMore) {
        // Prima carica i messaggi precedenti se necessario
        if (messageStats.hasMoreMessages && !isLoadingMore) {
          await loadMore();
        }
        // Poi aggiorna i dati
        await refreshData();
      }
    };
    
    const handleVisibilityChange = async () => {
      if (!document.hidden && !isRefreshing && !isLoadingMore) {
        // Prima carica i messaggi precedenti se necessario
        if (messageStats.hasMoreMessages && !isLoadingMore) {
          await loadMore();
        }
        // Poi aggiorna i dati
        await refreshData();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshData, isRefreshing, isLoadingMore, messageStats, loadMore]);
  
  // Funzioni per gestione chat
  const chatActions = useMemo(() => ({
    togglePin: (pinned) => dispatch(togglePin({ notificationId: parseInt(notificationId), pinned })),
    toggleFavorite: (favorite) => dispatch(toggleFavorite({ notificationId: parseInt(notificationId), favorite })),
    toggleMute: (isMuted, duration) => dispatch(toggleMuteChat({ notificationId: parseInt(notificationId), isMuted, duration })),
    updateTitle: (newTitle) => dispatch(updateChatTitle({ notificationId: parseInt(notificationId), newTitle })),
    archive: () => dispatch(archiveChat(parseInt(notificationId))),
    unarchive: () => dispatch(unarchiveChat(parseInt(notificationId))),
    leave: () => dispatch(leaveChat(parseInt(notificationId))),
    reopen: () => dispatch(reopenChat(parseInt(notificationId))),
    close: () => dispatch(closeChat(parseInt(notificationId))),
    removeUser: (userId) => dispatch(removeUserFromChat({ notificationId: parseInt(notificationId), userToRemoveId: userId })),
    uploadAttachment: (file, messageId) => dispatch(uploadNotificationAttachment({ notificationId: parseInt(notificationId), file, messageId })),
    refreshAttachments: () => dispatch(refreshAttachments(parseInt(notificationId)))
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
    
    // NUOVO: Esporta queste funzioni
    removeMessageLocally,
    updateMessageColorLocally,
    updateMessageLocally,
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