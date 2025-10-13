// src/components/chat/ModernChatList.jsx
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  memo,
} from "react";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";
import "@/styles/ModernChatList.css";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Reply,
} from "lucide-react";
import FileViewer from "@/components/ui/fileViewer";
import { swal } from "@/lib/common";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday } from "date-fns";
import { it } from "date-fns/locale";
import Modal from "react-modal";
import EditMessageModal from "./EditMessageModal";
import VersionHistoryModal from "./VersionHistoryModal";
import ChatMessage from "./ChatMessage";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import { useSelector, useDispatch } from "react-redux";
import { selectOpenChatData } from "@/redux/features/notifications/notificationsSlice";
import { loadMoreMessages } from "@/redux/features/notifications/notificationsActions";
import { 
  loadMessageReactions, 
  updateVisibleMessages, 
  invalidateReactionCache,
  selectReactionsExpired,
  selectVisibleMessages,
  selectMessageReactions
} from "@/redux/features/notifications/messageReactionsSlice";
import { store } from "@/redux/store";
import axios from 'axios';
import { config } from '@/config';
import { useOpenChat } from "@/hooks/useOpenChat";

Modal.setAppElement("#root");

// Componente per il divisore dei messaggi non letti
const UnreadMessagesDivider = memo(({ count, subtle = false, onClick }) => (
  <div 
    className={`new-messages-divider ${subtle ? 'subtle' : ''}`}
    onClick={onClick}
    style={{ cursor: 'pointer' }}
  >
    <div className="new-messages-divider-content">
      <span className="pulse-dot" />
      <span>
        {count === 1 
          ? '1 messaggio non letto' 
          : `${count} messaggi non letti`
        }
      </span>
    </div>
  </div>
));

const ModernChatList = ({
  messages = [],
  notificationId,
  chatListRef,
  onReply,
  hasLeftChat = false,
  selectedMessageId,
  currentUserId,
  users = [],
  categoryColor = '#3b82f6',
  // Props da useOpenChat
  hasNewMessages,
  newMessagesStartIndex,
  onMarkAsInteracted,
}) => {
  const dispatch = useDispatch();
  const {
    removeMessageLocally,
    updateMessageColorLocally,
    updateMessageLocally,
    refreshData,
  } = useOpenChat(notificationId, {
    autoRefresh: false, // Disabilita auto-refresh perché è già gestito dal componente padre
  });
  // IMPORTANTE: Ottieni lo stato della paginazione da Redux
  const chatPaginationRaw = useSelector(state => 
    state.notifications.chatPagination[notificationId]
  );
  const chatPagination = useMemo(() => chatPaginationRaw || {}, [chatPaginationRaw]);

  // Ottieni dati completi da openChatData
  const openChatData = useSelector(state => 
    selectOpenChatData(state, parseInt(notificationId))
  );

  // Hook per funzionalità notifiche
  const {
    editMessage,
    getMessageVersionHistory,
    getMessageReactions,
    fetchNotificationById,
    toggleReadUnread,
  } = useNotifications();

  // Stati locali
  const [selectedFile, setSelectedFile] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [highlightedMessageIds, setHighlightedMessageIds] = useState(new Set());
  const [isHighlightActive, setIsHighlightActive] = useState(false);
  const [currentHighlightedIndex, setCurrentHighlightedIndex] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedMessageVersions, setSelectedMessageVersions] = useState(null);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [localHasNewMessages, setLocalHasNewMessages] = useState(false);
  
  // Stati per gestione reazioni intelligente
  const [pendingReactionRequests, setPendingReactionRequests] = useState(new Set());
  const [lastVisibleUpdate, setLastVisibleUpdate] = useState(0);
  const [pendingImmediateRequests, setPendingImmediateRequests] = useState(new Set());
  
  // Stati per il divisore dei messaggi non letti
  const [unreadMessagesDividerIndex, setUnreadMessagesDividerIndex] = useState(null);
  const [showUnreadDivider, setShowUnreadDivider] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Refs
  const messagesEndRef = useRef(null);
  const scrollingToBottomRef = useRef(false);
  const userHasScrolledRef = useRef(false);
  const visibleMessagesRef = useRef(new Set());
  const lastMessageCountRef = useRef(messages.length);
  const previousMessagesRef = useRef([]);
  const lastVisibleMessageRef = useRef(null);
  const reactionUpdateIntervalRef = useRef(null);
  const immediateReactionTimeoutRef = useRef(null);
  const scrollDebounceTimeoutRef = useRef(null);

  // Calcola il conteggio totale dei messaggi
  const totalMessageCount = useMemo(() => {
    return openChatData?.totalMessageCount || openChatData?.messageCount || messages.length;
  }, [openChatData, messages.length]);

  // Funzione per caricare più messaggi
  const handleLoadMoreMessages = useCallback(() => {
    const pagination = chatPagination || {};
    
    // Previeni chiamate multiple o se non ci sono più messaggi
    if (pagination.isLoadingMore) {
      console.log('⏸️ Caricamento già in corso, skip');
      return;
    }
    
    // CORREZIONE: Verifica più accurata se ci sono ancora messaggi da caricare
    const remainingMessages = totalMessageCount - messages.length;
    if (remainingMessages <= 0) {
      console.log('⏸️ Nessun altro messaggio da caricare (conteggio)', {
        total: totalMessageCount,
        current: messages.length,
        remaining: remainingMessages
      });
      return;
    }
    
    // Controlla anche hasMoreMessages ma con priorità al conteggio
    if (pagination.hasMoreMessages === false && remainingMessages <= 0) {
      console.log('⏸️ Nessun altro messaggio da caricare (flag + conteggio)');
      return;
    }
    
    // Usa oldestMessageId dalla paginazione se disponibile
    let oldestMessageId = pagination.oldestMessageId;
    
    // Se non c'è oldestMessageId nella paginazione, trovalo dai messaggi locali
    if (!oldestMessageId && messages.length > 0) {
      const sortedMessages = [...messages].sort((a, b) => 
        new Date(a.tbCreated) - new Date(b.tbCreated)
      );
      const oldestMessage = sortedMessages[0];
      
      if (oldestMessage) {
        oldestMessageId = oldestMessage.messageId;
      }
    }
    
    if (!oldestMessageId) {
      console.error('❌ Nessun messaggio trovato per determinare lastMessageId');
      return;
    }
    
    console.log(`📄 Caricando messaggi precedenti a messageId: ${oldestMessageId}`);
    
    dispatch(loadMoreMessages({
      notificationId: parseInt(notificationId),
      lastMessageId: oldestMessageId,
      pageSize: 25
    }));
  }, [dispatch, notificationId, chatPagination, messages, totalMessageCount]);

  // Effetto per gestire il divisore dei messaggi non letti
  useEffect(() => {
    if (!notificationId || !messages || messages.length === 0) return;
    
    // Recupera l'ultimo messaggio letto dal localStorage
    const lastRead = localStorage.getItem(`lastReadMessage_${notificationId}`);
    if (!lastRead) {
      // Se non c'è, salva l'ultimo messaggio come letto
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage._isTemporary) {
          localStorage.setItem(`lastReadMessage_${notificationId}`, lastMessage.messageId);
        }
      }
      return;
    }
    
    // Trova i messaggi non letti
    const lastReadIndex = messages.findIndex(msg => msg.messageId === parseInt(lastRead));
    if (lastReadIndex === -1 || lastReadIndex === messages.length - 1) {
      setShowUnreadDivider(false);
      return;
    }
    
    // Calcola quanti messaggi non letti ci sono (escludi i propri)
    const unreadMessages = messages.slice(lastReadIndex + 1).filter(msg => 
      msg.selectedUser !== "1" && 
      !msg._isTemporary && 
      msg.senderId !== currentUserId
    );
    
    if (unreadMessages.length > 0) {
      setUnreadMessagesDividerIndex(lastReadIndex + 1);
      setUnreadMessagesCount(unreadMessages.length);
      setShowUnreadDivider(true);
    } else {
      setShowUnreadDivider(false);
    }
  }, [messages, notificationId, currentUserId]);

  // Gestione click sul divisore per scrollare ai messaggi non letti
  const handleDividerClick = useCallback(() => {
    if (unreadMessagesDividerIndex !== null && chatListRef.current) {
      const firstUnreadMessage = document.getElementById(`message-${messages[unreadMessagesDividerIndex]?.messageId}`);
      if (firstUnreadMessage) {
        firstUnreadMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Aggiungi timer di 10 secondi prima di far scomparire il divisore
        setTimeout(() => {
          const divider = document.querySelector('.new-messages-divider');
          if (divider) {
            divider.classList.add('fade-out');
            setTimeout(() => {
              setShowUnreadDivider(false);
              setUnreadMessagesDividerIndex(null);
              setUnreadMessagesCount(0);
            }, 300);
          }
        }, 10000); // 10 secondi
      }
    }
  }, [unreadMessagesDividerIndex, messages]);

  // Mantieni la posizione dello scroll dopo il caricamento di nuovi messaggi
  useEffect(() => {
    // Salva l'altezza dello scroll prima di aggiungere nuovi messaggi
    const prevScrollHeight = chatListRef.current?.scrollHeight || 0;
    
    // Dopo che i messaggi sono stati aggiunti
    if (chatPagination.isLoadingMore === false && prevScrollHeight > 0) {
      const newScrollHeight = chatListRef.current?.scrollHeight || 0;
      const scrollDiff = newScrollHeight - prevScrollHeight;
      
      // Mantieni la posizione visiva aggiustando lo scroll
      if (scrollDiff > 0 && chatListRef.current) {
        chatListRef.current.scrollTop += scrollDiff;
      }
    }
  }, [messages.length, chatPagination.isLoadingMore]);

  // Debug per verificare lo stato della paginazione
  useEffect(() => {
    console.log('📊 ModernChatList - Stato paginazione dettagliato:', {
      notificationId,
      pagination: chatPagination,
      hasMoreMessages: chatPagination?.hasMoreMessages,
      isLoadingMore: chatPagination?.isLoadingMore,
      oldestMessageId: chatPagination?.oldestMessageId,
      messageCount: messages.length,
      totalAvailable: totalMessageCount,
      shouldLoadMore: chatPagination?.hasMoreMessages && !chatPagination?.isLoadingMore
    });
  }, [chatPagination, notificationId, messages.length, totalMessageCount]);

  // Funzione per salvare l'ultimo messaggio visibile
  const saveLastVisibleMessage = useCallback(() => {
    if (!chatListRef.current) return;
    
    const container = chatListRef.current;
    const messageElements = container.querySelectorAll('[id^="message-"]');
    
    for (const message of messageElements) {
      const rect = message.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      if (rect.top >= containerRect.top && rect.bottom <= containerRect.bottom) {
        lastVisibleMessageRef.current = message.id.replace('message-', '');
        break;
      }
    }
  }, []);

  // Funzione per ripristinare la posizione dello scroll
  const restoreScrollPosition = useCallback(() => {
    if (!chatListRef.current || !lastVisibleMessageRef.current) return;
    
    const messageElement = document.getElementById(`message-${lastVisibleMessageRef.current}`);
    if (messageElement) {
      messageElement.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, []);

  // Observer per tracciare i messaggi visibili con caricamento immediato reazioni
  useEffect(() => {
    if (!chatListRef?.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const now = Date.now();
        const newVisibleMessages = new Set(visibleMessagesRef.current);
        let hasNewVisibleMessages = false;

        entries.forEach((entry) => {
          const messageId = parseInt(entry.target.id.replace("message-", ""));

          if (entry.isIntersecting) {
            newVisibleMessages.add(messageId);
            // Se il messaggio è appena diventato visibile, programma il caricamento con debouncing
            if (!visibleMessagesRef.current.has(messageId)) {
              hasNewVisibleMessages = true;
              scheduleImmediateReactionLoad(messageId); // Usa debouncing per accorpare le richieste
            }
          } else {
            newVisibleMessages.delete(messageId);
          }
        });

        visibleMessagesRef.current = newVisibleMessages;
        
        // Aggiorna Redux con i messaggi visibili (array serializzabile)
        dispatch(updateVisibleMessages(Array.from(newVisibleMessages)));

        // Se ci sono nuovi messaggi visibili, aggiorna il timestamp
        if (hasNewVisibleMessages) {
          setLastVisibleUpdate(now);
        }
      },
      {
        root: chatListRef.current,
        rootMargin: "100px",
        threshold: 0.1,
      },
    );

    document.querySelectorAll('[id^="message-"]').forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [chatListRef.current, messages, dispatch]);

  // Funzione per caricare reazioni per un singolo messaggio
  const loadReactionsForMessage = useCallback(async (messageId, immediate = false) => {
    if (!messageId || pendingReactionRequests.has(messageId)) return;

    // Verifica se le reazioni sono già in cache e non sono scadute
    const state = store.getState();
    const isExpired = selectReactionsExpired(state, messageId, immediate ? 5 : 30);
    
    if (!isExpired) return; // Le reazioni sono ancora valide

    setPendingReactionRequests(prev => new Set(prev).add(messageId));

    try {
      await dispatch(loadMessageReactions([messageId])).unwrap();
    } catch (error) {
      console.error(`Error loading reactions for message ${messageId}:`, error);
    } finally {
      setPendingReactionRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  }, [dispatch, pendingReactionRequests]);

  // Funzione per gestire richieste immediate con debouncing (solo per scroll)
  const scheduleImmediateReactionLoad = useCallback((messageId) => {
    // Aggiungi alla lista delle richieste pendenti
    setPendingImmediateRequests(prev => new Set(prev).add(messageId));

    // Cancella il timeout precedente se esiste
    if (scrollDebounceTimeoutRef.current) {
      clearTimeout(scrollDebounceTimeoutRef.current);
    }

    // Imposta un nuovo timeout per accorpare le richieste
    scrollDebounceTimeoutRef.current = setTimeout(async () => {
      const currentPending = pendingImmediateRequests;
      if (currentPending.size === 0) return;

      // Filtra solo i messaggi che hanno reazioni scadute
      const state = store.getState();
      const expiredIds = Array.from(currentPending).filter(id => 
        selectReactionsExpired(state, id, 5)
      );

      if (expiredIds.length === 0) {
        setPendingImmediateRequests(new Set());
        return;
      }

      // Carica in batch di 5 per non sovraccaricare
      const batchSize = 5;
      for (let i = 0; i < expiredIds.length; i += batchSize) {
        const batch = expiredIds.slice(i, i + batchSize);
        try {
          await dispatch(loadMessageReactions(batch)).unwrap();
        } catch (error) {
          console.error('Error loading immediate batch reactions:', error);
        }
        
        // Piccola pausa tra i batch
        if (i + batchSize < expiredIds.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Pulisci le richieste pendenti
      setPendingImmediateRequests(new Set());
    }, 300); // 300ms di debounce per accorpare le richieste durante lo scroll
  }, [dispatch, pendingImmediateRequests]);

  // Funzione per caricamento immediato (senza debouncing) per azioni utente
  const loadReactionsImmediately = useCallback(async (messageId) => {
    if (!messageId || pendingReactionRequests.has(messageId)) return;

    // Verifica se le reazioni sono già in cache e non sono scadute
    const state = store.getState();
    const isExpired = selectReactionsExpired(state, messageId, 5);
    
    if (!isExpired) return; // Le reazioni sono ancora valide

    setPendingReactionRequests(prev => new Set(prev).add(messageId));

    try {
      await dispatch(loadMessageReactions([messageId])).unwrap();
    } catch (error) {
      console.error(`Error loading reactions for message ${messageId}:`, error);
    } finally {
      setPendingReactionRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  }, [dispatch, pendingReactionRequests]);

  // Funzione per caricare reazioni in batch per messaggi visibili
  const loadVisibleReactions = useCallback(async () => {
    const visibleIds = Array.from(visibleMessagesRef.current);
    if (visibleIds.length === 0) return;

    const state = store.getState();
    const expiredIds = visibleIds.filter(id => selectReactionsExpired(state, id, 30));
    
    if (expiredIds.length === 0) return;

    // Carica in batch di 10 per non sovraccaricare
    const batchSize = 10;
    for (let i = 0; i < expiredIds.length; i += batchSize) {
      const batch = expiredIds.slice(i, i + batchSize);
      try {
        await dispatch(loadMessageReactions(batch)).unwrap();
      } catch (error) {
        console.error('Error loading batch reactions:', error);
      }
      
      // Piccola pausa tra i batch
      if (i + batchSize < expiredIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }, [dispatch]);

  // Ottieni le reazioni per un messaggio specifico da Redux
  const getReactionsForMessage = useCallback(
    (messageId) => {
      const state = store.getState();
      return selectMessageReactions(state, messageId);
    },
    [],
  );


  // Ascolta gli eventi di aggiornamento reazioni
  useEffect(() => {
    const handleMessageReactionUpdated = (event) => {
      const { messageId } = event.detail || {};

      if (messageId) {
        // Invalida la cache per questo messaggio
        dispatch(invalidateReactionCache(messageId));
        
        // Se il messaggio è visibile, ricarica immediatamente (azione utente)
        if (visibleMessagesRef.current.has(parseInt(messageId))) {
          loadReactionsImmediately(parseInt(messageId));
        }
      }
    };

    document.addEventListener(
      "message-reaction-updated",
      handleMessageReactionUpdated,
    );

    return () => {
      document.removeEventListener(
        "message-reaction-updated",
        handleMessageReactionUpdated,
      );
    };
  }, [dispatch, loadReactionsForMessage]);

  // Aggiornamento periodico intelligente delle reazioni per i messaggi visibili
  useEffect(() => {
    if (!notificationId || hasLeftChat) return;

    // Avvia l'aggiornamento periodico solo per messaggi visibili
    const startPeriodicUpdate = () => {
      if (reactionUpdateIntervalRef.current) {
        clearInterval(reactionUpdateIntervalRef.current);
      }

      reactionUpdateIntervalRef.current = setInterval(() => {
        // Aggiorna solo se ci sono messaggi visibili
        if (visibleMessagesRef.current.size > 0) {
          loadVisibleReactions();
        }
      }, 5000); // 5 secondi
    };

    // Avvia subito l'aggiornamento periodico
    startPeriodicUpdate();

    return () => {
      if (reactionUpdateIntervalRef.current) {
        clearInterval(reactionUpdateIntervalRef.current);
      }
      if (scrollDebounceTimeoutRef.current) {
        clearTimeout(scrollDebounceTimeoutRef.current);
      }
    };
  }, [notificationId, hasLeftChat, loadVisibleReactions]);

  // Effetto per gestire i nuovi messaggi
  useEffect(() => {
    if (messages.length > previousMessagesRef.current.length) {
      const newMessages = messages.slice(previousMessagesRef.current.length);
      const hasOtherUserMessages = newMessages.some(msg => 
        msg.selectedUser !== "1" && 
        !msg._isTemporary && 
        msg.senderId !== currentUserId
      );
      
      // Mostra nuovi messaggi solo se NON sono tutti nostri
      if (hasOtherUserMessages) {
        setLocalHasNewMessages(true);
      }
      
      // Auto-scroll solo se non ha scrollato manualmente
      if (!userHasScrolledRef.current) {
        scrollingToBottomRef.current = true;
        setTimeout(() => {
          if (chatListRef.current) {
            chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
            setTimeout(() => {
              scrollingToBottomRef.current = false;
            }, 500);
          }
        }, 100);
      }
    }
    
    previousMessagesRef.current = messages;
  }, [messages, currentUserId]);

  // Gestione scroll
  useEffect(() => {
    if (!chatListRef.current) return;

    const handleScroll = () => {
      if (scrollingToBottomRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = chatListRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceFromBottom > 100) {
        userHasScrolledRef.current = true;
        setUserHasScrolled(true);
        setShowScrollButton(true);
      } else if (distanceFromBottom < 20) {
        userHasScrolledRef.current = false;
        setUserHasScrolled(false);
        setShowScrollButton(false);
        setLocalHasNewMessages(false);
        
        // IMPORTANTE: Quando arriviamo in fondo, aggiorna l'ultimo messaggio letto
        if (messages.length > 0 && showUnreadDivider) {
          const lastMessage = messages[messages.length - 1];
          if (!lastMessage._isTemporary) {
            localStorage.setItem(`lastReadMessage_${notificationId}`, lastMessage.messageId);
            
            // Aggiungi timer di 10 secondi prima di far scomparire il divisore
            setTimeout(() => {
              const divider = document.querySelector('.new-messages-divider');
              if (divider) {
                divider.classList.add('fade-out');
                setTimeout(() => {
                  setShowUnreadDivider(false);
                  setUnreadMessagesDividerIndex(null);
                  setUnreadMessagesCount(0);
                }, 300);
              }
            }, 10000); // 10 secondi
          }
        }
        
        // Marca come interagito quando arriviamo in fondo
        if (onMarkAsInteracted && (hasNewMessages || localHasNewMessages)) {
          onMarkAsInteracted();
        }
        
        // Marca come letto
        if (notificationId) {
          toggleReadUnread(notificationId, true);
        }
      }
    };

    const handleWheel = (e) => {
      if (e.deltaY < 0) {
        userHasScrolledRef.current = true;
        setUserHasScrolled(true);
        setShowScrollButton(true);
      }
    };

    chatListRef.current.addEventListener("scroll", handleScroll, { passive: true });
    chatListRef.current.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      if (chatListRef.current) {
        chatListRef.current.removeEventListener("scroll", handleScroll);
        chatListRef.current.removeEventListener("wheel", handleWheel);
      }
    };
  }, [hasNewMessages, localHasNewMessages, onMarkAsInteracted, notificationId, toggleReadUnread, showUnreadDivider, messages]);

  // Scroll iniziale
  useEffect(() => {
    if (messages.length > 0 && !initialScrollDone && chatListRef.current) {
      setTimeout(() => {
        if (chatListRef.current) {
          chatListRef.current.scrollTo({
            top: chatListRef.current.scrollHeight,
            behavior: 'smooth'
          });
          setInitialScrollDone(true);
        }
      }, 100);
    }
  }, [messages.length, initialScrollDone]);

  // Auto-scroll per nuovi messaggi
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const isMyMessage = lastMessage.selectedUser == "1" || 
                         lastMessage._isTemporary === true ||
                         lastMessage.senderId == currentUserId;
      
      // Se ho appena inviato un messaggio, scrolla SEMPRE in fondo
      if (isMyMessage && chatListRef.current) {
        scrollingToBottomRef.current = true;
        userHasScrolledRef.current = false;
        setUserHasScrolled(false);
        setShowScrollButton(false);
        setLocalHasNewMessages(false);
        
        setTimeout(() => {
          if (chatListRef.current) {
            chatListRef.current.scrollTo({
              top: chatListRef.current.scrollHeight,
              behavior: 'smooth'
            });
          }
          setTimeout(() => {
            scrollingToBottomRef.current = false;
          }, 1000);
        }, 50);
      }
      // Altrimenti scrolla solo se l'utente non ha scrollato manualmente
      else if ((hasNewMessages || localHasNewMessages) && !userHasScrolledRef.current && chatListRef.current) {
        scrollingToBottomRef.current = true;
        chatListRef.current.scrollTo({
          top: chatListRef.current.scrollHeight,
          behavior: 'smooth'
        });
        setTimeout(() => {
          scrollingToBottomRef.current = false;
        }, 1000);
      }
    }
  }, [hasNewMessages, localHasNewMessages, messages, currentUserId]);

  // Listener per chat-message-sent
  useEffect(() => {
    const handleMessageSent = (event) => {
      const { notificationId: eventNotificationId } = event.detail;
      
      if (eventNotificationId === parseInt(notificationId)) {
        // Forza sempre lo scroll in fondo quando invio un messaggio
        scrollingToBottomRef.current = true;
        userHasScrolledRef.current = false;
        setUserHasScrolled(false);
        setShowScrollButton(false);
        setLocalHasNewMessages(false);
        
        // Aggiorna l'ultimo messaggio letto
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          if (!lastMessage._isTemporary) {
            localStorage.setItem(`lastReadMessage_${notificationId}`, lastMessage.messageId);
          }
        }
        
        setTimeout(() => {
          if (chatListRef.current) {
            chatListRef.current.scrollTo({
              top: chatListRef.current.scrollHeight,
              behavior: 'smooth'
            });
          }
          setTimeout(() => {
            scrollingToBottomRef.current = false;
          }, 1000);
        }, 100);
      }
    };

    document.addEventListener("chat-message-sent", handleMessageSent);
    
    return () => {
      document.removeEventListener("chat-message-sent", handleMessageSent);
    };
  }, [notificationId, messages]);

  // Listener per reload-open-chat
  useEffect(() => {
    const handleReloadOpenChat = async (event) => {
      const { notificationId: eventNotificationId, reason } = event.detail;
      
      if (eventNotificationId === parseInt(notificationId)) {
        console.log(`Ricaricamento chat per: ${reason}`);
        
        // Salva la posizione corrente prima dell'aggiornamento
        saveLastVisibleMessage();
        
        // Forza il ricaricamento dei dati
        if (fetchNotificationById) {
          try {
            console.log(`📥 ModernChatList: Ricaricando dati per ${reason}...`);
            await fetchNotificationById(parseInt(notificationId), true);
            console.log(`✅ ModernChatList: Dati ricaricati con successo`);
          } catch (error) {
            console.error('Errore nel ricaricamento dati:', error);
          }
        }
        
        // Per modifiche messaggi, attendi un momento per permettere all'aggiornamento di completarsi
        if (reason === 'message-edited') {
          setTimeout(() => {
            restoreScrollPosition();
          }, 300);
        } else if (reason === 'new-message') {
          // Per nuovi messaggi, scorri in fondo se l'utente non ha scrollato
          setTimeout(() => {
            if (!userHasScrolledRef.current && chatListRef.current) {
              chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
            } else {
              // Altrimenti mostra l'indicatore di nuovi messaggi
              setLocalHasNewMessages(true);
            }
          }, 100);
        }
      }
    };

    document.addEventListener("reload-open-chat", handleReloadOpenChat);
    
    return () => {
      document.removeEventListener("reload-open-chat", handleReloadOpenChat);
    };
  }, [notificationId, saveLastVisibleMessage, restoreScrollPosition, fetchNotificationById]);

  // Listener per new-message-received
  useEffect(() => {
    const handleNewMessage = async (event) => {
      const { notificationId: eventNotificationId } = event.detail;
      
      if (eventNotificationId === parseInt(notificationId)) {
        console.log(`Nuovo messaggio ricevuto per chat ${notificationId}`);
        setLocalHasNewMessages(true);
        
        // Forza il ricaricamento della chat
        if (fetchNotificationById) {
          try {
            await fetchNotificationById(notificationId, true);
          } catch (error) {
            console.error("Errore nel caricamento del nuovo messaggio:", error);
          }
        }
      }
    };

    document.addEventListener("new-message-received", handleNewMessage);
    
    return () => {
      document.removeEventListener("new-message-received", handleNewMessage);
    };
  }, [notificationId, fetchNotificationById]);

  useEffect(() => {
    const handleOpenChatNewMessage = async (event) => {
      const { notificationId: eventNotificationId } = event.detail;
      
      if (parseInt(eventNotificationId) === parseInt(notificationId)) {
        console.log(`📨 ModernChatList: Nuovo messaggio ricevuto per questa chat`);
        
        // Salva la posizione corrente
        saveLastVisibleMessage();
        
        // IMPORTANTE: Forza il refresh dei dati
        if (fetchNotificationById) {
          try {
            console.log(`📥 ModernChatList: Caricando nuovo messaggio...`);
            await fetchNotificationById(parseInt(notificationId), true);
            console.log(`✅ ModernChatList: Nuovo messaggio caricato`);
            
            // Se l'utente non ha scrollato, vai in fondo
            if (!userHasScrolledRef.current) {
              setTimeout(() => {
                if (chatListRef.current) {
                  chatListRef.current.scrollTo({
                    top: chatListRef.current.scrollHeight,
                    behavior: 'smooth'
                  });
                }
              }, 100);
            } else {
              // Altrimenti mostra l'indicatore di nuovi messaggi
              setLocalHasNewMessages(true);
            }
          } catch (error) {
            console.error('Errore nel caricamento del nuovo messaggio:', error);
          }
        }
      }
    };
  
    document.addEventListener("open-chat-new-message", handleOpenChatNewMessage);
    
    return () => {
      document.removeEventListener("open-chat-new-message", handleOpenChatNewMessage);
    };
  }, [notificationId, fetchNotificationById, saveLastVisibleMessage]);

  // NUOVO: Listener per eventi di eliminazione messaggio
  useEffect(() => {
    const handleMessageDeleted = async (event) => {
      const { notificationId: eventNotificationId, messageId } = event.detail;
      
      if (eventNotificationId === parseInt(notificationId)) {
        console.log(`📥 ModernChatList: Messaggio ${messageId} eliminato`);
        
        // Usa la funzione da useOpenChat direttamente
        if (removeMessageLocally) {
          console.log("🔄 ModernChatList: Rimuovendo messaggio localmente");
          removeMessageLocally(messageId);
          
          // Forza un refresh dopo un delay per sincronizzare con il server
          setTimeout(() => {
            console.log("🔄 ModernChatList: Forzando refresh dopo eliminazione");
            refreshData({ force: true, delay: 1000 });
          }, 500);
        } else {
          console.error("❌ ModernChatList: removeMessageLocally non disponibile");
        }
      }
    };

    document.addEventListener("message-deleted", handleMessageDeleted);
    
    return () => {
      document.removeEventListener("message-deleted", handleMessageDeleted);
    };
  }, [notificationId, removeMessageLocally, refreshData]);

  // MODIFICA: Listener per eventi di cambio colore messaggio - usa useOpenChat direttamente
  useEffect(() => {
    const handleMessageColorChanged = async (event) => {
      const { notificationId: eventNotificationId, messageId, color } = event.detail;
      
      if (eventNotificationId === parseInt(notificationId)) {
        console.log(`📥 ModernChatList: Colore messaggio ${messageId} cambiato a ${color}`);
        
        // Usa la funzione da useOpenChat direttamente
        if (updateMessageColorLocally) {
          console.log("🔄 ModernChatList: Aggiornando colore localmente");
          updateMessageColorLocally(messageId, color);
          
          // Forza un refresh dopo un delay per sincronizzare con il server
          setTimeout(() => {
            console.log("🔄 ModernChatList: Forzando refresh dopo cambio colore");
            refreshData({ force: true, delay: 1000 });
          }, 500);
        } else {
          console.error("❌ ModernChatList: updateMessageColorLocally non disponibile");
        }
      }
    };

    document.addEventListener("message-color-changed", handleMessageColorChanged);
    
    return () => {
      document.removeEventListener("message-color-changed", handleMessageColorChanged);
    };
  }, [notificationId, updateMessageColorLocally, refreshData]);

   // NUOVO: Listener per l'evento message-updated
   useEffect(() => {
    const handleMessageUpdated = async (event) => {
      const { notificationId: eventNotificationId, messageId } = event.detail;
      
      if (eventNotificationId === parseInt(notificationId)) {
        console.log(`📥 ModernChatList: Messaggio ${messageId} aggiornato`);
        
        // Forza un refresh per ottenere i dati aggiornati dal server
        if (refreshData) {
          console.log("🔄 ModernChatList: Forzando refresh dopo modifica");
          refreshData({ force: true, delay: 500 });
        }
      }
    };

    document.addEventListener("message-updated", handleMessageUpdated);
    
    return () => {
      document.removeEventListener("message-updated", handleMessageUpdated);
    };
  }, [notificationId, refreshData]);

  

  // Gestione filtri
  useEffect(() => {
    const handleFilterApplied = (event) => {
      const { messageIds, targetNotificationId } = event.detail;
      
      // Verifica che l'evento sia per questa chat
      if (targetNotificationId !== parseInt(notificationId)) return;
      
      if (Array.isArray(messageIds)) {
        setHighlightedMessageIds(new Set(messageIds));
        setIsHighlightActive(true);
        setCurrentHighlightedIndex(0);
        
        // Scroll al primo risultato
        if (messageIds.length > 0) {
          setTimeout(() => {
            const firstMessageElement = document.getElementById(`message-${messageIds[0]}`);
            if (firstMessageElement) {
              firstMessageElement.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 100);
        }
      }
    };
  
    const handleFilterReset = () => {
      setHighlightedMessageIds(new Set());
      setIsHighlightActive(false);
      setCurrentHighlightedIndex(0);
    };
  
    const handleSearchResultSelected = (event) => {
      const { messageId } = event.detail;
  
      if (messageId && chatListRef.current) {
        // Assicurati che l'elemento esista
        const messageElement = document.getElementById(`message-${messageId}`);
  
        if (messageElement) {
          // Calcola la posizione di scroll
          const containerRect = chatListRef.current.getBoundingClientRect();
          const messageRect = messageElement.getBoundingClientRect();
  
          const scrollTop =
            messageRect.top -
            containerRect.top +
            chatListRef.current.scrollTop -
            containerRect.height / 2 +
            messageRect.height / 2;
  
          // Scrolla smooth al messaggio
          chatListRef.current.scrollTo({
            top: scrollTop,
            behavior: "smooth",
          });
  
          // Aggiungi classe di evidenziazione temporanea
          messageElement.classList.add("current-highlight");
          setTimeout(() => {
            messageElement.classList.remove("current-highlight");
          }, 2000);
        } else {
          console.warn(`Elemento con ID message-${messageId} non trovato`);
        }
      }
    };
  
    document.addEventListener("chat-filter-applied", handleFilterApplied);
    document.addEventListener("chat-reset-filters", handleFilterReset);
    document.addEventListener("chat-search-result-selected", handleSearchResultSelected);
  
    return () => {
      document.removeEventListener("chat-filter-applied", handleFilterApplied);
      document.removeEventListener("chat-reset-filters", handleFilterReset);
      document.removeEventListener("chat-search-result-selected", handleSearchResultSelected);
    };
  }, [notificationId]);

  // Funzione per scrollare a un messaggio specifico (per le risposte)
  const scrollToMessage = useCallback((targetMessageId) => {
    if (!chatListRef.current) return;

    const messageElement = document.getElementById(`message-${targetMessageId}`);
    if (messageElement) {
      const containerRect = chatListRef.current.getBoundingClientRect();
      const messageRect = messageElement.getBoundingClientRect();

      const scrollTop =
        messageRect.top -
        containerRect.top +
        chatListRef.current.scrollTop -
        80;

      chatListRef.current.scrollTo({
        top: scrollTop,
        behavior: "smooth",
      });

      // Evidenzia il messaggio temporaneamente
      messageElement.classList.add("highlight-reply-target");
      setTimeout(() => {
        messageElement.classList.remove("highlight-reply-target");
      }, 2000);
    }
  }, []);

  // Handler funzioni
  const handleScrollToBottom = useCallback(() => {
    if (chatListRef.current) {
      scrollingToBottomRef.current = true;
      
      // Scroll fluido e graduale verso il basso
      chatListRef.current.scrollTo({
        top: chatListRef.current.scrollHeight,
        behavior: 'smooth'
      });
      
      setUserHasScrolled(false);
      setShowScrollButton(false);
      setLocalHasNewMessages(false);
      
      // Aggiorna l'ultimo messaggio letto
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage._isTemporary) {
          localStorage.setItem(`lastReadMessage_${notificationId}`, lastMessage.messageId);
          setShowUnreadDivider(false);
          setUnreadMessagesDividerIndex(null);
          setUnreadMessagesCount(0);
        }
      }
      
      if (onMarkAsInteracted && (hasNewMessages || localHasNewMessages)) {
        onMarkAsInteracted();
      }
      
      // Aumenta il timeout per permettere lo scroll fluido di completarsi
      setTimeout(() => {
        scrollingToBottomRef.current = false;
      }, 1000);
    }
  }, [hasNewMessages, localHasNewMessages, onMarkAsInteracted, messages, notificationId]);

  const handleOpenEditModal = useCallback((messageId, messageText) => {
    const messageToEdit = messages.find(m => m.messageId === messageId);
    if (messageToEdit) {
      setMessageToEdit(messageToEdit);
      setShowEditModal(true);
    }
  }, [messages]);

  const handleMessageEdited = useCallback((notificationId) => {
    setShowEditModal(false);
    
    // Il messaggio è già stato aggiornato dal modal che ha emesso l'evento
    // Non c'è bisogno di fare nulla qui perché il listener sopra gestirà il refresh
  }, []);

  const handleViewVersionHistory = useCallback(async (messageId) => {
    setLoadingVersions(true);
    try {
      const result = await getMessageVersionHistory(messageId);
      if (result) {
        setSelectedMessageVersions({
          currentMessage: result.currentMessage || result,
          versionHistory: result.versionHistory || [],
        });
        setShowVersionHistory(true);
      }
    } catch (error) {
      console.error("Error fetching message versions:", error);
      swal.fire("Errore", "Impossibile recuperare la cronologia del messaggio", "error");
    } finally {
      setLoadingVersions(false);
    }
  }, [getMessageVersionHistory]);

  const handleMessageSelect = useCallback((messageId, messageText) => {
    console.log('Message selected:', messageId, messageText);
  }, []);

  // Raggruppa messaggi per data
  const groupMessagesByDate = useCallback((messages) => {
    if (!Array.isArray(messages)) return {};
    
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(a.tbCreated) - new Date(b.tbCreated)
    );
    
    const groups = {};
    sortedMessages.forEach((message) => {
      const date = new Date(message.tbCreated);
      const dateKey = isToday(date) ? 'Oggi' : 
                     isYesterday(date) ? 'Ieri' : 
                     format(date, 'dd MMMM yyyy', { locale: it });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  }, []);

  const renderDateSeparator = (date) => (
    <div className="chat-date-separator sticky top-0 z-10" style={{
    }}>
      <span
      className="border w-50"
      >{date}</span>
    </div>
  );

  // Trova il messaggio originale per una risposta
  const findOriginalMessage = useCallback((replyToMessageId) => {
    if (!replyToMessageId) return null;
    return messages.find(msg => msg.messageId === replyToMessageId);
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col relative h-full">
      {/* Barra di navigazione filtri */}
      {isHighlightActive && (
        <div className="highlight-navigation">
          <div className="flex items-center justify-between w-full px-4">
            <span className="font-medium">
              {highlightedMessageIds.size} messaggi trovati
            </span>

            {highlightedMessageIds.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const messageIdsArray = Array.from(highlightedMessageIds);
                    const newIndex = (currentHighlightedIndex - 1 + messageIdsArray.length) % messageIdsArray.length;
                    setCurrentHighlightedIndex(newIndex);
                    
                    const messageElement = document.getElementById(`message-${messageIdsArray[newIndex]}`);
                    messageElement?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className="p-1 rounded-full hover:bg-blue-50"
                >
                  <ChevronUp className="h-4 w-4 text-blue-600" />
                </button>
                
                <span className="text-xs font-medium text-blue-700">
                  {currentHighlightedIndex + 1}/{highlightedMessageIds.size}
                </span>
                
                <button
                  onClick={() => {
                    const messageIdsArray = Array.from(highlightedMessageIds);
                    const newIndex = (currentHighlightedIndex + 1) % messageIdsArray.length;
                    setCurrentHighlightedIndex(newIndex);
                    
                    const messageElement = document.getElementById(`message-${messageIdsArray[newIndex]}`);
                    messageElement?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className="p-1 rounded-full hover:bg-blue-50"
                >
                  <ChevronDown className="h-4 w-4 text-blue-600" />
                </button>
              </div>
            )}

            <button
              onClick={() => {
                document.dispatchEvent(new CustomEvent("chat-reset-filters"));
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Rimuovi evidenziazione
            </button>
          </div>
        </div>
      )}

      {/* Lista messaggi */}
      <div 
        className="flex-1 overflow-y-auto chat-list-container" 
        ref={chatListRef}
        style={{
          userSelect: "text",
          WebkitUserSelect: "text",
          MozUserSelect: "text",
          msUserSelect: "text"
        }}
      >
        {/* PULSANTE CARICA PIÙ MESSAGGI - USA REDUX */}
        {chatPagination.hasMoreMessages && !chatPagination.isLoadingMore && (
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm py-3 px-4 flex justify-center border-b border-gray-100">
            <button
              onClick={handleLoadMoreMessages}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95"
            >
              <ChevronUp className="h-4 w-4" />
              <span>
                Carica messaggi precedenti 
                {totalMessageCount && messages.length > 0 && ` (${totalMessageCount - messages.length} rimanenti)`}
              </span>
            </button>
          </div>
        )}

        {/* Indicatore caricamento in alto quando si caricano messaggi precedenti */}
        {chatPagination.isLoadingMore && (
          <div className="flex justify-center items-center py-4 bg-gray-50">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <span className="ml-2 text-sm text-gray-600">Caricamento messaggi precedenti...</span>
          </div>
        )}

        <AnimatePresence>
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              Inizia una nuova conversazione!
            </div>
          ) : (
            Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
              <React.Fragment key={date}>
                {renderDateSeparator(date)}
                
                {dateMessages.map((message, index) => {
                  const globalIndex = messages.indexOf(message);
                  
                  return (
                    <React.Fragment key={message.messageId}>
                      {/* Mostra il divisore se siamo all'indice giusto */}
                      {showUnreadDivider && globalIndex === unreadMessagesDividerIndex && (
                        <UnreadMessagesDivider 
                          count={unreadMessagesCount}
                          subtle={unreadMessagesCount <= 3}
                          onClick={handleDividerClick}
                        />
                      )}
                      
                      <div
                        id={`message-${message.messageId}`}
                        className={cn(
                          highlightedMessageIds.has(message.messageId) ? "highlighted-message bg-yellow-50" : ""
                        )}
                      >
                        <ChatMessage
                          message={{
                            ...message,
                            reactions: getReactionsForMessage(message.messageId)
                          }}
                          messages={messages}
                          isNew={globalIndex >= unreadMessagesDividerIndex && showUnreadDivider}
                          isFirstNew={false} // Non usiamo più questo
                          isFromCurrentUser={message.selectedUser == "1" || message._isTemporary === true || message.senderId == currentUserId}
                          currentUserId={currentUserId}
                          users={users}
                          onReply={onReply}
                          onEditMessage={handleOpenEditModal}
                          onViewVersionHistory={handleViewVersionHistory}
                          onMessageSelect={handleMessageSelect}
                          categoryColor={categoryColor}
                          isSearchResult={highlightedMessageIds.has(message.messageId)}
                          notificationId={notificationId}
                          disabled={hasLeftChat}
                          onReplyClick={scrollToMessage}
                        />
                      </div>
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            ))
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Pulsante scroll bottom con indicatore nuovi messaggi */}
      {(showScrollButton || (hasNewMessages || localHasNewMessages) && showUnreadDivider) && (
        <motion.button
          className={cn(
            "absolute bottom-6 right-4 rounded-full p-3 shadow-lg transition-all duration-200",
            ((hasNewMessages || localHasNewMessages) && showUnreadDivider)
              ? "bg-red-500 text-white hover:bg-red-600 ring-2 ring-red-300 ring-opacity-50"
              : "bg-blue-500 text-white hover:bg-blue-600 z-50"
          )}
          onClick={handleScrollToBottom}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronDown className="h-6 w-6" />
        </motion.button>
      )}

      {/* Visualizzatore file */}
      {selectedFile && (
        <FileViewer
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}

      {/* Modal modifica messaggio */}
      <EditMessageModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        message={messageToEdit}
        users={users}
        messages={messages}
        onMessageUpdated={handleMessageEdited}
        notificationId={notificationId}
      />

      {/* Modal cronologia versioni */}
      <VersionHistoryModal
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        versionData={selectedMessageVersions}
        loadingVersions={loadingVersions}
      />
    </div>
  );
};

export default ModernChatList;