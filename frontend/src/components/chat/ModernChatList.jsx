// src/components/chat/ModernChatList.jsx
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";
import "@/styles/ModernChatList.css";
import {
  ArrowBigDown,
  ChevronUp,
  ChevronDown,
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
import axios from 'axios';
import { config } from '@/config';

Modal.setAppElement("#root");

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
  
  // IMPORTANTE: Ottieni lo stato della paginazione da Redux
  const chatPagination = useSelector(state => 
    state.notifications.chatPagination[notificationId] || {}
  );

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
  const [messageReactionsCache, setMessageReactionsCache] = useState({});
  const [localHasNewMessages, setLocalHasNewMessages] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const scrollingToBottomRef = useRef(false);
  const userHasScrolledRef = useRef(false);
  const visibleMessagesRef = useRef(new Set());
  const pendingReactionsRequestsRef = useRef({});
  const fetchedReactionsRef = useRef(new Set());
  const reactionBatchSize = 20;
  const lastMessageCountRef = useRef(messages.length);
  const previousMessagesRef = useRef([]);
  const lastVisibleMessageRef = useRef(null);

  // Calcola il conteggio totale dei messaggi
  const totalMessageCount = useMemo(() => {
    return openChatData?.totalMessageCount || openChatData?.messageCount || messages.length;
  }, [openChatData, messages.length]);

  // Funzione per caricare più messaggi
  const handleLoadMoreMessages = useCallback(() => {
    const pagination = chatPagination || {};
    
    console.log('🔍 handleLoadMoreMessages chiamato:', {
      notificationId,
      pagination,
      hasMessages: messages.length,
      totalMessageCount,
      localMessagesIds: messages.map(m => m.messageId).slice(0, 5)
    });
    
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

  // Observer per tracciare i messaggi visibili
  useEffect(() => {
    if (!chatListRef?.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const messageId = entry.target.id.replace("message-", "");

          if (entry.isIntersecting) {
            visibleMessagesRef.current.add(parseInt(messageId));
          } else {
            visibleMessagesRef.current.delete(parseInt(messageId));
          }
        });

        
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
  }, [chatListRef.current, messages]);

  // Funzione per pianificare il caricamento delle reazioni in batch
  const scheduleReactionsFetch = useCallback(
    debounce(() => {
      if (visibleMessagesRef.current.size === 0) return;

      const messageIds = Array.from(visibleMessagesRef.current).filter(
        (id) =>
          !messageReactionsCache[id] &&
          !pendingReactionsRequestsRef.current[id],
      );

      if (messageIds.length === 0) return;

      for (let i = 0; i < messageIds.length; i += reactionBatchSize) {
        const batch = messageIds.slice(i, i + reactionBatchSize);
        batchLoadReactions(batch);
      }
    }, 5000), // 5 secondi
    [messageReactionsCache],
  );

  // Carica le reazioni in batch
  const batchLoadReactions = useCallback(
    async (messageIds) => {
      if (!messageIds || messageIds.length === 0 || !getMessageReactions)
        return;
  
      // MODIFICA: Filtra solo i messageId validi (non temporanei e non null)
      const validMessageIds = messageIds.filter((id) => {
        // Escludi ID temporanei (che iniziano con "temp_")
        if (typeof id === 'string' && id.startsWith('temp_')) {
          return false;
        }
        // Escludi null, undefined, 0, o altri valori non validi
        if (!id || id === 0 || id === '0') {
          return false;
        }
        // Escludi se non è un numero valido
        const numericId = parseInt(id);
        if (isNaN(numericId) || numericId <= 0) {
          return false;
        }
        return true;
      });
  
      // Se non ci sono ID validi, esci
      if (validMessageIds.length === 0) {
        console.log('Nessun messageId valido per caricare le reazioni');
        return;
      }
  
      const unrequestedIds = validMessageIds.filter(
        (id) =>
          !fetchedReactionsRef.current.has(id) &&
          !pendingReactionsRequestsRef.current[id],
      );
  
      if (unrequestedIds.length === 0) return;
  
      unrequestedIds.forEach((id) => {
        pendingReactionsRequestsRef.current[id] = true;
        fetchedReactionsRef.current.add(id);
      });
  
      try {
        const token = localStorage.getItem("token");
  
        if (!token) {
          throw new Error("Token non disponibile per caricare le reazioni");
        }
  
        let newReactionsCache = {};
  
        try {
          // Prova a usare l'endpoint batch
          const batchResponse = await axios.post(
            `${config.API_BASE_URL}/messages/batch-reactions`,
            { messageIds: unrequestedIds },
            { headers: { Authorization: `Bearer ${token}` } },
          );
  
          if (batchResponse.data && batchResponse.data.success) {
            newReactionsCache = batchResponse.data.reactions || {};
          }
        } catch (err) {
          console.log('Endpoint batch non disponibile, uso richieste singole');
          const maxParallelRequests = 5;
  
          for (let i = 0; i < unrequestedIds.length; i += maxParallelRequests) {
            const batch = unrequestedIds.slice(i, i + maxParallelRequests);
  
            const responses = await Promise.all(
              batch.map((messageId) =>
                axios.get(
                  `${config.API_BASE_URL}/messages/${messageId}/reactions`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  },
                ).catch(error => {
                  // Gestisci errori per singolo messaggio
                  console.warn(`Errore nel caricamento reazioni per messaggio ${messageId}:`, error);
                  return { data: { success: false, reactions: [] } };
                }),
              ),
            );
  
            responses.forEach((response, index) => {
              const messageId = batch[index];
  
              if (response.data && response.data.success) {
                newReactionsCache[messageId] = response.data.reactions || [];
              } else {
                newReactionsCache[messageId] = [];
              }
            });
  
            if (i + maxParallelRequests < unrequestedIds.length) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }
        }
  
        if (Object.keys(newReactionsCache).length > 0) {
          setMessageReactionsCache((prev) => ({
            ...prev,
            ...newReactionsCache,
          }));
        }
      } catch (error) {
        console.error("Error batch loading reactions:", error);
      } finally {
        unrequestedIds.forEach((id) => {
          delete pendingReactionsRequestsRef.current[id];
        });
      }
    },
    [getMessageReactions],
  );

  // Ottieni le reazioni per un messaggio specifico
  const getReactionsForMessage = useCallback(
    (messageId) => {
      if (messageReactionsCache[messageId]) {
        return messageReactionsCache[messageId];
      }
      return [];
    },
    [messageReactionsCache],
  );

  // Ascolta gli eventi di aggiornamento reazioni
  useEffect(() => {
    const handleMessageReactionUpdated = (event) => {
      const { messageId } = event.detail || {};

      if (messageId) {
        fetchedReactionsRef.current.delete(messageId);
        delete pendingReactionsRequestsRef.current[messageId];

        setMessageReactionsCache((prevCache) => {
          const newCache = { ...prevCache };
          delete newCache[messageId];
          return newCache;
        });

        visibleMessagesRef.current.add(parseInt(messageId));
        scheduleReactionsFetch();
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
  }, [scheduleReactionsFetch]);

  // Aggiornamento periodico delle reazioni per i messaggi visibili
  useEffect(() => {
    if (!notificationId || hasLeftChat) return;

    const refreshVisibleReactions = async () => {
      const visibleIds = Array.from(visibleMessagesRef.current);
      if (visibleIds.length === 0) return;

      visibleIds.forEach((id) => {
        fetchedReactionsRef.current.delete(id);
        delete pendingReactionsRequestsRef.current[id];
      });

      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await axios.post(
          `${config.API_BASE_URL}/messages/batch-reactions`,
          {
            messageIds: visibleIds,
            userId: currentUserId,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (response.data && response.data.success) {
          const freshReactions = response.data.reactions || {};

          setMessageReactionsCache((prev) => ({
            ...prev,
            ...freshReactions,
          }));
        }
      } catch (error) {
        console.error("Error refreshing reactions:", error);
      }
    };

    refreshVisibleReactions();
    const intervalId = setInterval(refreshVisibleReactions, 5000);

    return () => clearInterval(intervalId);
  }, [notificationId, hasLeftChat, currentUserId]);

  // Effetto per gestire i nuovi messaggi
  useEffect(() => {
    if (messages.length > previousMessagesRef.current.length) {
      setLocalHasNewMessages(true);
      
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
  }, [messages]);

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
  }, [hasNewMessages, localHasNewMessages, onMarkAsInteracted, notificationId, toggleReadUnread]);

  // Scroll iniziale
  useEffect(() => {
    if (messages.length > 0 && !initialScrollDone && chatListRef.current) {
      setTimeout(() => {
        if (chatListRef.current) {
          chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
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
            chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
          }
          setTimeout(() => {
            scrollingToBottomRef.current = false;
          }, 500);
        }, 50);
      }
      // Altrimenti scrolla solo se l'utente non ha scrollato manualmente
      else if ((hasNewMessages || localHasNewMessages) && !userHasScrolledRef.current && chatListRef.current) {
        scrollingToBottomRef.current = true;
        chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
        setTimeout(() => {
          scrollingToBottomRef.current = false;
        }, 500);
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
        
        setTimeout(() => {
          if (chatListRef.current) {
            chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
          }
          setTimeout(() => {
            scrollingToBottomRef.current = false;
          }, 500);
        }, 100);
      }
    };

    document.addEventListener("chat-message-sent", handleMessageSent);
    
    return () => {
      document.removeEventListener("chat-message-sent", handleMessageSent);
    };
  }, [notificationId]);

  // Listener per reload-open-chat
  useEffect(() => {
    const handleReloadOpenChat = async (event) => {
      const { notificationId: eventNotificationId, reason } = event.detail;
      
      if (eventNotificationId === parseInt(notificationId)) {
        console.log(`Ricaricamento chat per: ${reason}`);
        
        // Salva la posizione corrente prima dell'aggiornamento
        console.log("ModernChatList - fetchNotificationById:", fetchNotificationById);
        saveLastVisibleMessage();
        
        // IMPORTANTE: Forza il ricaricamento dei dati
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
    const handleOpenChatNewMessage = (event) => {
      const { notificationId: eventNotificationId } = event.detail;
      
      if (parseInt(eventNotificationId) === parseInt(notificationId)) {
        console.log(`📨 ModernChatList: Nuovo messaggio ricevuto per questa chat`);
        
        // Salva la posizione corrente
        saveLastVisibleMessage();
        
        // Forza il refresh dei dati
        if (fetchNotificationById) {
          fetchNotificationById(notificationId, true).then(() => {
            // Se l'utente non ha scrollato, vai in fondo
            if (!userHasScrolledRef.current) {
              setTimeout(() => {
                if (chatListRef.current) {
                  chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
                }
              }, 100);
            } else {
              // Altrimenti mostra l'indicatore di nuovi messaggi
              setLocalHasNewMessages(true);
            }
          });
        }
      }
    };
  
    document.addEventListener("open-chat-new-message", handleOpenChatNewMessage);
    
    return () => {
      document.removeEventListener("open-chat-new-message", handleOpenChatNewMessage);
    };
  }, [notificationId, fetchNotificationById, saveLastVisibleMessage]);

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

  // Gestione filtri
  useEffect(() => {
    const handleFilterApplied = (event) => {
      const { messageIds } = event.detail;
      if (Array.isArray(messageIds)) {
        setHighlightedMessageIds(new Set(messageIds));
        setIsHighlightActive(true);
        setCurrentHighlightedIndex(0);
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
        const messageElement = document.getElementById(`message-${messageId}`);

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

          messageElement.classList.add("current-highlight");
          setTimeout(() => {
            messageElement.classList.remove("current-highlight");
          }, 2000);
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
  }, []);

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
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
      setUserHasScrolled(false);
      setShowScrollButton(false);
      setLocalHasNewMessages(false);
      
      if (onMarkAsInteracted && (hasNewMessages || localHasNewMessages)) {
        onMarkAsInteracted();
      }
      
      setTimeout(() => {
        scrollingToBottomRef.current = false;
      }, 500);
    }
  }, [hasNewMessages, localHasNewMessages, onMarkAsInteracted]);

  const handleOpenEditModal = useCallback((messageId, messageText) => {
    const messageToEdit = messages.find(m => m.messageId === messageId);
    if (messageToEdit) {
      setMessageToEdit(messageToEdit);
      setShowEditModal(true);
    }
  }, [messages]);

  const handleMessageEdited = useCallback((notificationId) => {
    setShowEditModal(false);
    // Il messaggio è già stato aggiornato tramite Redux
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
    <div className="chat-date-separator sticky top-0 z-10 bg-white/80 backdrop-blur-sm">
      <span>{date}</span>
    </div>
  );

  // Calcola se mostrare l'indicatore di nuovi messaggi
  const shouldShowNewIndicator = useCallback((message, index) => {
    // Non mostrare mai l'indicatore per i propri messaggi
    const isOwnMessage = message.selectedUser == "1" || 
                        message._isTemporary === true ||
                        message.senderId == currentUserId;
    
    if (isOwnMessage) return false;
    
    // Verifica che ci siano effettivamente nuovi messaggi da altri utenti
    const newMessagesFromOthers = messages.slice(newMessagesStartIndex || 0).filter(msg => 
      msg.selectedUser !== "1" && 
      !msg._isTemporary && 
      msg.senderId !== currentUserId
    );
    
    // Mostra solo se ci sono nuovi messaggi da altri e questo è il primo
    return (hasNewMessages || localHasNewMessages) && 
           newMessagesFromOthers.length > 0 && 
           index === newMessagesStartIndex;
  }, [hasNewMessages, localHasNewMessages, newMessagesStartIndex, currentUserId, messages]);

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
      <div className="flex-1 overflow-y-auto chat-list-container" ref={chatListRef}>
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
                  const showNewIndicator = shouldShowNewIndicator(message, globalIndex);
                  const originalMessage = findOriginalMessage(message.replyToMessageId);
                  
                  return (
                    <div key={message.messageId}>
                      {showNewIndicator && (
                        <div className="new-messages-indicator">
                          <span>Nuovi messaggi</span>
                        </div>
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
                          isNew={(hasNewMessages || localHasNewMessages) && globalIndex >= (newMessagesStartIndex || messages.length)}
                          isFirstNew={showNewIndicator}
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
                    </div>
                  );
                })}
              </React.Fragment>
            ))
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Pulsante scroll bottom con indicatore nuovi messaggi */}
      {(showScrollButton || hasNewMessages || localHasNewMessages) && (
        <motion.button
          className={cn(
            "absolute bottom-6 right-4 rounded-full p-3 shadow-lg transition-all duration-200",
            (hasNewMessages || localHasNewMessages)
              ? "bg-red-500 text-white hover:bg-red-600 ring-2 ring-red-300 ring-opacity-50"
              : "bg-blue-500 text-white hover:bg-blue-600"
          )}
          onClick={handleScrollToBottom}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ArrowBigDown className="h-6 w-6" />
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