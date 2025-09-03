// src/components/notifications/NotificationSidebar.jsx
import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { useNotificationsPagination, useNotificationFilters } from "@/hooks/useNotificationsPagination";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import { useDispatch } from "react-redux";
import { 
  updatePaginatedNotification, 
  updateUnreadCount,
  setPendingUnreadCount,
  clearPendingUnreadCount,
  setOptimisticUpdateInProgress
} from "@/redux/features/notifications/notificationsSlice";
import { swal } from "@/lib/common";
import {
  Plus,
  Filter,
  Star,
  AtSign,
  Send,
  CheckSquare,
  X,
  Search,
  CircleHelp,
  LogOut,
  Archive,
  Volume2,
  VolumeX,
  BellOff,
  Bell,
  ChevronDown,
  ChevronUp,
  Link,
  FileText,
  Truck,
  ShoppingCart,
  Clipboard,
  Tag,
  User,
  Package,
  Eye,
  FileBox,
  MessageSquare,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { useWikiContext } from "../wiki/WikiContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import "@/components/ui/ui.css";
import DoNotDisturbToggle from "../chat/DoNotDisturbToggle";
import axios from "axios";
import { config } from "@/config";

const NotificationSidebar = ({ closeSidebar, visible, openChatModal }) => {
  const dispatch = useDispatch();
  
  // Hook per paginazione
  const {
    notifications,
    unreadCount,
    hasMore,
    isLoadingMore,
    isInitialLoading,
    loadFirstPage,
    loadNextPage,
    refreshNotifications,
    getStats,
    isEmpty,
    updateSingleNotification
  } = useNotificationsPagination();

  // Hook per i filtri
  const {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    hasActiveFilters
  } = useNotificationFilters();

  // MODIFICA: Gestione manuale della ricerca senza debounce automatico
  const [localSearchTerm, setLocalSearchTerm] = useState(filters.searchText || "");
  const [isSearching, setIsSearching] = useState(false);

  // Hook per le azioni sulle notifiche
  const {
    toggleReadUnread,
    togglePin,
    toggleFavorite,
    archiveChat,
    unarchiveChat,
    toggleMuteChat,
    isNotificationMuted,
    fetchNotificationById,
  } = useNotifications();

  // Stati locali
  const [selectBackgroundColor, setSelectBackgroundColor] = useState("#ffffff");
  const [animatingItemId, setAnimatingItemId] = useState(null);
  const [animationPhase, setAnimationPhase] = useState(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isDocumentSearchVisible, setIsDocumentSearchVisible] = useState(false);
  const [archivedUnreadCount, setArchivedUnreadCount] = useState(0);
  const [optimisticUpdates, setOptimisticUpdates] = useState({});
  const [updatingNotifications, setUpdatingNotifications] = useState(new Set());

  // Stati per la ricerca documenti
  const [documentTab, setDocumentTab] = useState("customers");
  const [documentsSearchTerm, setDocumentsSearchTerm] = useState("");
  const [documentsSearchResults, setDocumentsSearchResults] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentChats, setDocumentChats] = useState([]);
  const [documentChatsLoading, setDocumentChatsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isDocTypesOpen, setIsDocTypesOpen] = useState(false);

  // Refs
  const animationTimeoutRef = useRef(null);
  const sidebarRef = useRef(null);
  const filterExpandedRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const notificationPositionsRef = useRef(new Map());
  const searchInputRef = useRef(null);
  
  // IMPORTANTE: useRef per evitare chiamate duplicate
  const loadingRef = useRef(false);
  const hasLoadedInitial = useRef(false);

  // MODIFICA: Creiamo un div sentinel per l'intersection observer
  const [shouldObserve, setShouldObserve] = useState(true);
  const loadMoreSentinelRef = useRef(null);

  // MODIFICA: Usiamo useIntersectionObserver con il ref del sentinel
  const { isIntersecting } = useIntersectionObserver({
    ref: loadMoreSentinelRef,
    threshold: 0.1,
    rootMargin: '100px',
    root: scrollContainerRef.current
  });

  // Wiki context
  const { openWiki } = useWikiContext();

  // Document types
  const documentTypes = [
    { id: "Project", label: "Progetti", icon: <Clipboard size={16} /> },
    { id: "Task", label: "Attività", icon: <Clipboard size={16} /> },
    { id: "Item", label: "Articoli", icon: <Tag size={16} /> },
    { id: "BOM", label: "Distinte Base", icon: <Link size={16} /> },
    { id: "customers", label: "Clienti", icon: <User size={16} /> },
    { id: "suppliers", label: "Fornitori", icon: <Truck size={16} /> },
    { id: "SaleOrd", label: "Ordini Cliente", icon: <ShoppingCart size={16} /> },
    { id: "SaleDoc", label: "Documenti Vendita", icon: <FileText size={16} /> },
    { id: "PurchaseOrd", label: "Ordini Fornitore", icon: <FileBox size={16} /> },
    { id: "PurchaseDoc", label: "Documenti Acquisto", icon: <FileText size={16} /> },
    { id: "MO", label: "Ordini Produzione", icon: <Clipboard size={16} /> },
  ];

  // Helper functions
  const parseMessages = (messages) => {
    if (!messages) return [];
    if (typeof messages === "string") {
      try {
        return JSON.parse(messages);
      } catch (error) {
        console.error("Error parsing messages:", error);
        return [];
      }
    }
    return messages;
  };

  const timeSince = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diff = Math.abs(now - notificationDate) / 1000;
    const minutes = Math.floor(diff / 60);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        return `${days} giorni fa`;
      }
      return `${hours} ore fa`;
    }
    return `${minutes} minuti fa`;
  };

  // NUOVO: Funzione per salvare la posizione di una notifica
  const saveNotificationPosition = useCallback((notificationId) => {
    const element = document.getElementById(`notification-item-${notificationId}`);
    if (element && scrollContainerRef.current) {
      const rect = element.getBoundingClientRect();
      const containerRect = scrollContainerRef.current.getBoundingClientRect();
      const relativeTop = rect.top - containerRect.top + scrollContainerRef.current.scrollTop;
      notificationPositionsRef.current.set(notificationId, relativeTop);
    }
  }, []);

  // NUOVO: Funzione per ripristinare la posizione dopo un aggiornamento
  const restoreScrollToNotification = useCallback((notificationId) => {
    const savedPosition = notificationPositionsRef.current.get(notificationId);
    if (savedPosition && scrollContainerRef.current) {
      // Usa requestAnimationFrame per assicurarsi che il DOM sia aggiornato
      requestAnimationFrame(() => {
        const element = document.getElementById(`notification-item-${notificationId}`);
        if (element) {
          const containerRect = scrollContainerRef.current.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          const currentRelativeTop = elementRect.top - containerRect.top;
          const scrollAdjustment = savedPosition - currentRelativeTop - scrollContainerRef.current.scrollTop;
          
          scrollContainerRef.current.scrollTop += scrollAdjustment;
        }
      });
    }
  }, []);

  // SOLUZIONE: Funzione migliorata per aggiornare singola notifica
  const updateSingleNotificationInPlace = useCallback(async (notificationId) => {
    try {
      setUpdatingNotifications(prev => new Set(prev).add(notificationId));
      
      // Salva la posizione prima dell'aggiornamento
      saveNotificationPosition(notificationId);
      
      // Fetch solo i dati aggiornati per questa notifica
      const updatedNotification = await fetchNotificationById(notificationId, true);
      
      if (updatedNotification) {
        // Usa l'azione Redux per aggiornare solo questa notifica
        dispatch(updatePaginatedNotification({
          notificationId,
          updates: updatedNotification
        }));
        
        // Ripristina la posizione dopo l'aggiornamento
        setTimeout(() => {
          restoreScrollToNotification(notificationId);
        }, 50);
      }
    } catch (error) {
      console.error('Error updating single notification:', error);
    } finally {
      setUpdatingNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  }, [dispatch, fetchNotificationById, saveNotificationPosition, restoreScrollToNotification]);

  // NUOVO: Salva la posizione di scroll prima di qualsiasi azione
  const saveScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
  }, []);

  // NUOVO: Ripristina la posizione di scroll
  const restoreScrollPosition = useCallback(() => {
    if (scrollContainerRef.current && scrollPositionRef.current > 0) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, []);

  // MODIFICA: Funzione per eseguire la ricerca manualmente
  const executeSearch = useCallback(async () => {
    const trimmedSearchTerm = localSearchTerm.trim();
    
    // Se il termine di ricerca è vuoto, pulisci il filtro
    if (!trimmedSearchTerm) {
      updateFilter('searchText', '');
      return;
    }

    // Solo se c'è un termine di ricerca valido
    setIsSearching(true);
    hasLoadedInitial.current = false;
    loadingRef.current = true;
    setShouldObserve(false);
    
    // Aggiorna il filtro con il nuovo termine di ricerca
    updateFilter('searchText', trimmedSearchTerm);
    
    try {
      await loadFirstPage({ ...filters, searchText: trimmedSearchTerm });
    } finally {
      setIsSearching(false);
      loadingRef.current = false;
      hasLoadedInitial.current = true;
      setShouldObserve(true);
    }
  }, [localSearchTerm, filters, updateFilter, loadFirstPage]);

  // MODIFICA: Handler per il cambio del testo di ricerca (solo aggiorna lo stato locale)
  const handleSearchInputChange = useCallback((e) => {
    setLocalSearchTerm(e.target.value);
  }, []);

  // MODIFICA: Handler per il tasto Enter
  const handleSearchKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch();
    }
  }, [executeSearch]);

  // MODIFICA: Handler per il pulsante di clear
  const handleClearSearch = useCallback(() => {
    setLocalSearchTerm('');
    updateFilter('searchText', '');
    
    // Ricarica le notifiche senza filtro di ricerca
    hasLoadedInitial.current = false;
    loadingRef.current = true;
    setShouldObserve(false);
    
    loadFirstPage({ ...filters, searchText: '' }).finally(() => {
      loadingRef.current = false;
      hasLoadedInitial.current = true;
      setShouldObserve(true);
    });
  }, [filters, updateFilter, loadFirstPage]);

  // MODIFICA: Sincronizza localSearchTerm con filters.searchText quando cambiano i filtri
  useEffect(() => {
    setLocalSearchTerm(filters.searchText || '');
  }, [filters.searchText]);

  // SOLUZIONE PRINCIPALE: Ascolta nuovi messaggi e aggiorna la notifica specifica
  useEffect(() => {
    if (!visible) return;

    // Handler per nuovi messaggi
    const handleNewMessage = async (event) => {
      const { newMessagesInfo } = event.detail || {};
      
      if (newMessagesInfo && Array.isArray(newMessagesInfo)) {
      
        // Per ogni nuovo messaggio, aggiorna la notifica corrispondente
        for (const messageInfo of newMessagesInfo) {
          const { notificationId } = messageInfo;
          if (notificationId) {
            await updateSingleNotificationInPlace(notificationId);
          }
        }
      }
    };

    // Handler generico per aggiornamenti notifiche
    const handleNotificationUpdate = async (event) => {
      const { notificationId } = event.detail || {};
      if (notificationId) {
        await updateSingleNotificationInPlace(notificationId);
      }
    };

    const handleChatStatusChanged = async (event) => {
      const { notificationId } = event.detail || {};
      if (notificationId) {
        await updateSingleNotificationInPlace(notificationId);
      }
    };

    const handleReadStatusChanged = async (event) => {
      const { notificationId } = event.detail || {};
      if (notificationId) {
        await updateSingleNotificationInPlace(notificationId);
      }
    };

    const handleChatMessageSent = async (event) => {
      const { notificationId } = event.detail || {};
      if (notificationId) {
        await updateSingleNotificationInPlace(notificationId);
      }
    };

    // Ascolta tutti gli eventi che potrebbero modificare le notifiche
    document.addEventListener('new_message', handleNewMessage);
    document.addEventListener('notification-updated', handleNotificationUpdate);
    document.addEventListener('chat-status-changed', handleChatStatusChanged);
    document.addEventListener('new-message-received', handleNotificationUpdate);
    document.addEventListener('read-status-changed', handleReadStatusChanged);
    document.addEventListener('chat-message-sent', handleChatMessageSent);
    document.addEventListener('chat-title-updated', handleNotificationUpdate);

    return () => {
      document.removeEventListener('new_message', handleNewMessage);
      document.removeEventListener('notification-updated', handleNotificationUpdate);
      document.removeEventListener('chat-status-changed', handleChatStatusChanged);
      document.removeEventListener('new-message-received', handleNotificationUpdate);
      document.removeEventListener('read-status-changed', handleReadStatusChanged);
      document.removeEventListener('chat-message-sent', handleChatMessageSent);
      document.removeEventListener('chat-title-updated', handleNotificationUpdate);
    };
  }, [visible, updateSingleNotificationInPlace]);

  useEffect(() => {
    if (!visible) return;
  
    // Handler specifico per i nuovi messaggi dal worker
    const handleNewMessageFromWorker = async (event) => {
      const { newMessagesInfo } = event.detail || {};
      
      if (newMessagesInfo && Array.isArray(newMessagesInfo)) {
       
        // Per ogni nuovo messaggio, aggiorna la notifica specifica
        for (const messageInfo of newMessagesInfo) {
          const { notificationId } = messageInfo;
          
          // Verifica se questa notifica è attualmente visibile nella sidebar
          const notificationExists = notifications.some(n => n.notificationId === notificationId);
          
          if (notificationExists && notificationId) {
          
            // Salva la posizione prima dell'aggiornamento
            saveNotificationPosition(notificationId);
            
            try {
              // Fetch i dati aggiornati per questa notifica
              const updatedNotification = await fetchNotificationById(notificationId, true);
              
              if (updatedNotification) {
                // Usa l'azione per aggiornare solo questa notifica
                updateSingleNotification(notificationId, updatedNotification);
                
                // Ripristina la posizione dopo l'aggiornamento
                setTimeout(() => {
                  restoreScrollToNotification(notificationId);
                }, 50);
              }
            } catch (error) {
              console.error(`Errore aggiornamento notifica ${notificationId}:`, error);
            }
          }
        }
      }
    };
  
    // IMPORTANTE: Ascolta l'evento 'new_message' che viene emesso dal worker
    document.addEventListener('new_message', handleNewMessageFromWorker);
  
    return () => {
      document.removeEventListener('new_message', handleNewMessageFromWorker);
    };
  }, [visible, notifications, fetchNotificationById, updateSingleNotification, saveNotificationPosition, restoreScrollToNotification]);
  

  // Carica prima pagina quando la sidebar diventa visibile
  useEffect(() => {
    if (visible && !hasLoadedInitial.current) {
      hasLoadedInitial.current = true;
      loadingRef.current = true;
      loadFirstPage(filters).finally(() => {
        loadingRef.current = false;
      });
    }
  }, [visible]);

  // MODIFICA: Gestisci infinite scroll migliorato
  useEffect(() => {
    if (
      isIntersecting && 
      hasMore && 
      !isLoadingMore &&
      !loadingRef.current &&
      visible &&
      !isDocumentSearchVisible &&
      shouldObserve
    ) {
    
      loadingRef.current = true;
      
      loadNextPage(filters).finally(() => {
        loadingRef.current = false;
        setShouldObserve(true);
      });
    }
  }, [isIntersecting, hasMore, isLoadingMore, visible, filters, loadNextPage, isDocumentSearchVisible, shouldObserve]);

  // Ricarica quando cambiano i filtri (MA NON searchText che ora è gestito manualmente)
  useEffect(() => {
    if (!visible) return;
    
    // Reset quando cambiano i filtri
    hasLoadedInitial.current = false;
    loadingRef.current = true;
    setShouldObserve(false);
    
    loadFirstPage(filters).finally(() => {
      loadingRef.current = false;
      hasLoadedInitial.current = true;
      setShouldObserve(true);
    });
  }, [
    filters.filterArchived,
    filters.filterFavorites,
    filters.filterMuted,
    filters.filterUnreadOnly,
    filters.filterMentioned,
    filters.filterMessagesSent,
    filters.filterLeftChats,
    filters.completedFilter,
    filters.categoryId,
    visible
    // NOTA: NON includere filters.searchText qui
  ]);

  // NUOVO: Reset quando la sidebar viene chiusa
  useEffect(() => {
    if (!visible) {
      // Reset gli stati quando la sidebar viene chiusa
      hasLoadedInitial.current = false;
      setShouldObserve(true);
      setOptimisticUpdates({});
      scrollPositionRef.current = 0;
      notificationPositionsRef.current.clear();
    }
  }, [visible]);

  // Calcola categorie uniche dalle notifiche caricate
  const uniqueCategories = useMemo(() => {
    const categoriesMap = new Map();
    notifications.forEach(notification => {
      if (!categoriesMap.has(notification.notificationCategoryId)) {
        categoriesMap.set(notification.notificationCategoryId, {
          id: notification.notificationCategoryId,
          name: notification.notificationCategoryName,
          color: notification.hexColor,
        });
      }
    });
    return Array.from(categoriesMap.values());
  }, [notifications]);

  // Calcola contatore archiviate non lette
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const count = notifications.filter(
        (notification) =>
          (notification.archived === 1 || notification.archived === true) &&
          !notification.isReadByUser,
      ).length;
      setArchivedUnreadCount(count);
    }
  }, [notifications]);

  // Applica aggiornamenti ottimistici
  const notificationsWithOptimisticUpdates = useMemo(() => {
    return notifications.map(notification => {
      const update = optimisticUpdates[notification.notificationId];
      if (update) {
        return { ...notification, ...update };
      }
      return notification;
    });
  }, [notifications, optimisticUpdates]);

  // Handlers
  const handleNotificationClick = (notification, e) => {
    e.stopPropagation();
    // Non fare nulla con il singolo click
  };

  const handleNotificationDoubleClick = (notification, e) => {
    e.stopPropagation();
    
    if (notification && notification.notificationId && openChatModal) {
      saveScrollPosition();
      
      // Se la notifica non è letta, aggiornala immediatamente
      if (!notification.isReadByUser) {
        // IMPORTANTE: Setta il flag di aggiornamento ottimistico
        dispatch(setOptimisticUpdateInProgress(true));
        
        // Aggiornamento ottimistico immediato
        setOptimisticUpdates(prev => ({
          ...prev,
          [notification.notificationId]: { isReadByUser: true }
        }));
        
        // Aggiorna il contatore nell'header
        const newUnreadCount = Math.max(0, unreadCount - 1);
        document.dispatchEvent(
          new CustomEvent('unread-count-changed', {
            detail: {
              unreadCount: newUnreadCount,
              notificationId: parseInt(notification.notificationId),
              forced: true,
              source: 'sidebar-doubleclick-open'
            }
          })
        );
        
        // Aggiorna lo stato nel Redux store
        dispatch(updatePaginatedNotification({
          notificationId: notification.notificationId,
          updates: { isReadByUser: true }
        }));
        
        // Aggiorna il contatore globale
        dispatch(updateUnreadCount(newUnreadCount));
        
        // Reset del flag dopo 3 secondi
        setTimeout(() => {
          dispatch(setOptimisticUpdateInProgress(false));
        }, 3000);
        
        // Rimuovi l'aggiornamento ottimistico dopo un delay
        setTimeout(() => {
          setOptimisticUpdates(prev => {
            const newUpdates = { ...prev };
            delete newUpdates[notification.notificationId];
            return newUpdates;
          });
        }, 1000);
      }
      
      // Apri la chat
      openChatModal(notification.notificationId);
    }
  };

  const handleToggleReadUnread = async (notificationId, isRead, e) => {
    e.stopPropagation();
    
    saveNotificationPosition(notificationId);
    
    const newReadState = !isRead;
    
    // Aggiornamento ottimistico immediato
    setOptimisticUpdates(prev => ({
      ...prev,
      [notificationId]: { isReadByUser: newReadState }
    }));
    
    // Calcola il nuovo unreadCount
    let deltaCount = 0;
    const notification = notifications.find(n => n.notificationId === notificationId);
    
    if (notification && notification.archived !== 1 && notification.archived !== '1') {
      if (newReadState) {
        deltaCount = isRead ? 0 : -1;
      } else {
        deltaCount = isRead ? 1 : 0;
      }
    }
    
    const newUnreadCount = Math.max(0, unreadCount + deltaCount);
    
    // IMPORTANTE: Setta il flag di aggiornamento ottimistico
    dispatch(setOptimisticUpdateInProgress(true));
    
    // IMPORTANTE: Setta il contatore pendente in Redux
    dispatch(setPendingUnreadCount({ 
      count: newUnreadCount, 
      timestamp: Date.now() 
    }));
    
    // Aggiorna immediatamente Redux
    dispatch(updateUnreadCount(newUnreadCount));
    
    // Emetti evento per l'header con forced=true
    document.dispatchEvent(
      new CustomEvent('unread-count-changed', {
        detail: {
          unreadCount: newUnreadCount,
          notificationId: parseInt(notificationId),
          forced: true,
          source: 'sidebar-toggle-read',
          timestamp: Date.now()
        }
      })
    );
    
    try {
      await toggleReadUnread(notificationId, newReadState);
      
      // Aggiorna la notifica specifica
      dispatch(updatePaginatedNotification({
        notificationId,
        updates: { isReadByUser: newReadState }
      }));
      
      // Dopo 5 secondi, pulisci il pendingCount e reset del flag
      setTimeout(() => {
        dispatch(clearPendingUnreadCount());
        dispatch(setOptimisticUpdateInProgress(false));
      }, 5000);
      
      // Rimuovi ottimistico
      setTimeout(() => {
        setOptimisticUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[notificationId];
          return newUpdates;
        });
      }, 300);
      
    } catch (error) {
      console.error("Error toggling read status:", error);
      
      // In caso di errore, ripristina tutto
      dispatch(clearPendingUnreadCount());
      dispatch(setOptimisticUpdateInProgress(false)); // Reset del flag
      dispatch(updateUnreadCount(unreadCount)); // Ripristina valore originale
      
      setOptimisticUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[notificationId];
        return newUpdates;
      });
      
      // Ripristina contatore nell'header
      document.dispatchEvent(
        new CustomEvent('unread-count-changed', {
          detail: {
            unreadCount: unreadCount,
            notificationId: parseInt(notificationId),
            forced: true,
            source: 'sidebar-toggle-read-error',
            timestamp: Date.now()
          }
        })
      );
    }
  };

  const handleToggleFavorite = async (notificationId, currentFavoriteStatus, e) => {
    e.stopPropagation();
    
    saveNotificationPosition(notificationId);
    
    const newFavoriteStatus = !currentFavoriteStatus;
    
    // Aggiornamento ottimistico immediato
    setOptimisticUpdates(prev => ({
      ...prev,
      [notificationId]: { favorite: newFavoriteStatus }
    }));
    
    // Aggiorna immediatamente anche in Redux
    dispatch(updatePaginatedNotification({
      notificationId,
      updates: { favorite: newFavoriteStatus }
    }));
    
    try {
      // Chiamata API per persistere il cambiamento
      await toggleFavorite(notificationId, newFavoriteStatus);
      
      // Rimuovi l'aggiornamento ottimistico dopo un breve delay
      setTimeout(() => {
        setOptimisticUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[notificationId];
          return newUpdates;
        });
        
        // Ripristina la posizione dello scroll
        restoreScrollToNotification(notificationId);
      }, 300);
      
    } catch (error) {
      console.error("Error toggling favorite:", error);
      
      // In caso di errore, ripristina lo stato originale
      setOptimisticUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[notificationId];
        return newUpdates;
      });
      
      // Ripristina anche in Redux
      dispatch(updatePaginatedNotification({
        notificationId,
        updates: { favorite: currentFavoriteStatus }
      }));
    }
  };

  const handleTogglePin = async (notificationId, currentPinnedStatus, e) => {
    e.stopPropagation();
    
    const newPinnedStatus = !currentPinnedStatus;

    if (newPinnedStatus) {
      // Animazione per pin
      setAnimatingItemId(notificationId);
      setAnimationPhase("exit");

      animationTimeoutRef.current = setTimeout(async () => {
        setOptimisticUpdates(prev => ({
          ...prev,
          [notificationId]: { pinned: true }
        }));
        
        setAnimationPhase("enter");

        try {
          await togglePin(notificationId, newPinnedStatus);
          
          animationTimeoutRef.current = setTimeout(async () => {
            setAnimatingItemId(null);
            setAnimationPhase(null);
            
            setOptimisticUpdates(prev => {
              const newUpdates = { ...prev };
              delete newUpdates[notificationId];
              return newUpdates;
            });
            
            // Per il pin, ricarica tutta la lista perché cambia l'ordine
            saveScrollPosition();
            await refreshNotifications(filters);
            restoreScrollPosition();
          }, 600);
        } catch (error) {
          console.error("Error pinning notification:", error);
          setAnimatingItemId(null);
          setAnimationPhase(null);
          setOptimisticUpdates(prev => {
            const newUpdates = { ...prev };
            delete newUpdates[notificationId];
            return newUpdates;
          });
        }
      }, 400);
    } else {
      // Unpin senza animazione
      saveNotificationPosition(notificationId);
      
      setOptimisticUpdates(prev => ({
        ...prev,
        [notificationId]: { pinned: false }
      }));
      
      try {
        await togglePin(notificationId, newPinnedStatus);
        
        setOptimisticUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[notificationId];
          return newUpdates;
        });
        
        // Per l'unpin, ricarica tutta la lista perché cambia l'ordine
        saveScrollPosition();
        await refreshNotifications(filters);
        restoreScrollPosition();
      } catch (error) {
        console.error("Error unpinning notification:", error);
        setOptimisticUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[notificationId];
          return newUpdates;
        });
      }
    }
  };

  const handleToggleMute = async (notificationId, shouldMute, e) => {
    e.stopPropagation();

    if (shouldMute) {
      const result = await swal.fire({
        title: "Silenzia notifiche",
        text: "Per quanto tempo vuoi silenziare questa chat?",
        icon: "question",
        showCancelButton: true,
        cancelButtonText: "Annulla",
        confirmButtonText: "Conferma",
        input: "select",
        inputOptions: {
          "8h": "8 ore",
          "1d": "1 giorno",
          "7d": "7 giorni",
          forever: "Per sempre",
        },
        inputPlaceholder: "Seleziona durata",
        inputValue: "8h",
      });
      
      if (result.isConfirmed) {
        saveNotificationPosition(notificationId);
        await toggleMuteChat(notificationId, true, result.value);
        await updateSingleNotificationInPlace(notificationId);
      }
    } else {
      saveNotificationPosition(notificationId);
      await toggleMuteChat(notificationId, false);
      await updateSingleNotificationInPlace(notificationId);
    }
  };

  const handleArchiveNotification = async (notificationId, e) => {
    e.stopPropagation();
    
    saveScrollPosition();

    setOptimisticUpdates(prev => ({
      ...prev,
      [notificationId]: { archived: 1 }
    }));

    try {
      const result = await archiveChat(notificationId);
      
      if (result && result.success) {
        setOptimisticUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[notificationId];
          return newUpdates;
        });
        
        // L'archiviazione rimuove la notifica dalla lista corrente se non siamo nel filtro archiviate
        if (!filters.filterArchived) {
          // Ricarica per rimuovere dalla vista
          await refreshNotifications(filters);
          restoreScrollPosition();
        } else {
          // Altrimenti aggiorna solo la notifica
          await updateSingleNotificationInPlace(notificationId);
        }
      }
    } catch (error) {
      setOptimisticUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[notificationId];
        return newUpdates;
      });
    }
  };

  const handleUnarchiveNotification = async (notificationId, e) => {
    e.stopPropagation();
    
    saveScrollPosition();

    setOptimisticUpdates(prev => ({
      ...prev,
      [notificationId]: { archived: 0 }
    }));

    try {
      const result = await unarchiveChat(notificationId);
      
      if (result && result.success) {
        setOptimisticUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[notificationId];
          return newUpdates;
        });
        
        // Se siamo nel filtro archiviate, rimuovi dalla vista
        if (filters.filterArchived) {
          await refreshNotifications(filters);
          restoreScrollPosition();
        } else {
          // Altrimenti aggiorna solo la notifica
          await updateSingleNotificationInPlace(notificationId);
        }
      }
    } catch (error) {
      setOptimisticUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[notificationId];
        return newUpdates;
      });
    }
  };

  const handleOpenNewMessageModal = () => {
    document.dispatchEvent(new CustomEvent("openNewMessageModal"));
  };

  const handleCategoryChange = (event) => {
    const selectedValue = event.target.value;
    updateFilter('categoryId', selectedValue === "all" ? null : selectedValue);

    if (selectedValue === "all") {
      setSelectBackgroundColor("#ffffff");
    } else {
      const selectedCategoryObj = uniqueCategories.find(
        (category) => category.id.toString() === selectedValue,
      );
      if (selectedCategoryObj) {
        setSelectBackgroundColor(selectedCategoryObj.color);
      }
    }
  };

  const handleCompletedFilterChange = (value) => {
    updateFilter('completedFilter', value);
  };

  const toggleFilterExpansion = () => {
    setIsFilterExpanded(!isFilterExpanded);
  };

  const toggleDocumentSearch = () => {
    setIsDocumentSearchVisible(!isDocumentSearchVisible);
    if (!isDocumentSearchVisible) {
      setDocumentsSearchTerm("");
      setDocumentsSearchResults([]);
      setSelectedDocument(null);
      setDocumentChats([]);
    }
  };

  const handleToggleArchivedFilter = () => {
    updateFilter('filterArchived', !filters.filterArchived);
  };

  const handleOpenWiki = (e) => {
    e.stopPropagation();
    openWiki("notifications", true);
  };

  const handleDocumentsSearchChange = (event) => {
    setDocumentsSearchTerm(event.target.value);
  };

  const handleClearDocumentsSearch = () => {
    setDocumentsSearchTerm("");
    setDocumentsSearchResults([]);
  };

  // Document search functions (non modificate)
  const searchDocuments = async () => {
    if (!documentsSearchTerm.trim() || documentsSearchTerm.trim().length < 2) return;

    setDocumentsLoading(true);
    setDocumentsSearchResults([]);
    setSelectedDocument(null);

    try {
      const token = localStorage.getItem("token");
      const searchType =
        documentTab === "customers"
          ? "Customer"
          : documentTab === "suppliers"
            ? "Supplier"
            : documentTab;

      const response = await axios.get(
        `${config.API_BASE_URL}/documents/search?documentType=${searchType}&searchTerm=${encodeURIComponent(documentsSearchTerm)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        setDocumentsSearchResults(response.data.data || []);
      }
    } catch (error) {
      console.error("Error searching documents:", error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const searchChatsByDocument = async (document) => {
    console.log("searchChatsByDocument", document);
    setSelectedDocument(document);
    setDocumentChatsLoading(true);
    setDocumentChats([]);

    try {
      const token = localStorage.getItem("token");
      const searchType =
        documentTab === "customers"
          ? "Customer"
          : documentTab === "suppliers"
            ? "Supplier"
            : documentTab;
      console.log("documentTab", documentTab);
      let searchValue = "";
      if (documentTab === "customers" || documentTab === "suppliers") {
        searchValue = document.DocumentNumber;
      } else if (documentTab === "Project") {
        searchValue = document.DocumentId
      } else if (["SaleOrd", "PurchaseOrd", "SaleDoc", "PurchaseDoc", "MO"].includes(documentTab)) {
        searchValue = document.DocumentId.toString();
      } else if (documentTab === "BOM") {
        searchValue = document.DocumentNumber;
      } else if (documentTab === "Item") {
        searchValue = document.DocumentNumber;
      } else if (documentTab === "Task") {
        searchValue = document.DocumentId
      }

      const response = await axios.get(
        `${config.API_BASE_URL}/chats/by-document?searchType=${searchType}&searchValue=${encodeURIComponent(searchValue)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        setDocumentChats(response.data.data || []);
      }
    } catch (error) {
      console.error("Error searching chats by document:", error);
    } finally {
      setDocumentChatsLoading(false);
    }
  };

  const openChatInReadOnlyMode = async (notificationId) => {
    try {
      setDocumentChatsLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${config.API_BASE_URL}/chats/${notificationId}/read-only-access`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        openChatModal(notificationId);
      }
    } catch (error) {
      console.error("Error opening chat in read-only mode:", error);
    } finally {
      setDocumentChatsLoading(false);
    }
  };

  // Effects per gestione click esterni
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isFilterExpanded && filterExpandedRef.current && 
          !filterExpandedRef.current.contains(event.target)) {
        const filterToggleButton = document.getElementById("notification-filter-toggle");
        if (!filterToggleButton?.contains(event.target)) {
          setIsFilterExpanded(false);
        }
      }

      if (isDocTypesOpen && !event.target.closest(".document-type-dropdown")) {
        setIsDocTypesOpen(false);
      }
    };

    if (isFilterExpanded || isDocTypesOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterExpanded, isDocTypesOpen]);

  useEffect(() => {
    if (!visible && isFilterExpanded) {
      setIsFilterExpanded(false);
    }
    if (!visible && isDocumentSearchVisible) {
      setIsDocumentSearchVisible(false);
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // Debug stats
  useEffect(() => {
    if (visible) {
      const stats = getStats();
    }
  }, [notifications.length, hasMore, isLoadingMore, visible]);

  // Listener per aggiornamento stato letto/non letto
  useEffect(() => {
    const handleReadStatusChanged = async (event) => {
      const { notificationId, isRead } = event.detail;
      
      // Aggiorna lo stato locale usando updateSingleNotificationInPlace
      await updateSingleNotificationInPlace(notificationId);
    };

    document.addEventListener('notification-read-status-changed', handleReadStatusChanged);
    
    return () => {
      document.removeEventListener('notification-read-status-changed', handleReadStatusChanged);
    };
  }, [updateSingleNotificationInPlace]);

  return (
    <div
      className={`notification-sidebar ${visible ? "show" : "hide"}`}
      id="notification-sidebar"
      ref={sidebarRef}
    >
      <div className="header border-bottom rounded-4 shadow-sm" style={{ height: isFilterExpanded ? "9rem" : "9rem" }}>
        <div className="flex justify-between items-center p-2">
          <div className="text-lg font-semibold" id="notification-sidebar-title">
            Notifiche
            {unreadCount > 0 && (
              <span className="ml-2 text-sm text-red-500">
                ({unreadCount} non lette)
              </span>
            )}
          </div>
  
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleOpenWiki}
                  className="relative text-black hover:bg-gray-100 rounded-full transition-colors flex items-center"
                  aria-label="Aiuto e Wiki"
                  id="notification-sidebar-wiki-button"
                >
                  <CircleHelp className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Guida notifiche</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
  
        <div className="filterControls" id="notification-sidebar-filterControls">
          <div className="px-2 mb-2 w-100">
            <div className="relative w-full">
              <input
                ref={searchInputRef}
                type="text"
                placeholder={isSearching ? "Ricerca in corso..." : "Cerca notifiche..."}
                value={localSearchTerm}
                onChange={handleSearchInputChange}
                onKeyPress={handleSearchKeyPress}
                className={`w-full p-2.5 pl-10 pr-10 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                  isSearching ? "bg-gray-50" : "bg-white hover:border-gray-300"
                }`}
                id="notification-search-input"
                disabled={isSearching}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none w-100 justify-content-end px-2.5">
                {isSearching ? (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : !localSearchTerm ? (
                  <Search className="w-4 h-4 text-gray-400 transition-colors duration-200" />
                ) : null}
              </div>
              {localSearchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  id="notification-search-clear"
                  disabled={isSearching}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {localSearchTerm && localSearchTerm !== filters.searchText && (
              <div className="mt-1.5 text-xs text-gray-500 px-1 flex items-center">
                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-xs font-medium">
                  Premi Invio per cercare
                </span>
              </div>
            )}
          </div>
  
          <div 
              className="flex items-center justify-center w-100 z-50 px-2 mb-1">
            <div className="flex w-100 z-50 items-center space-x-2">
              <button
                className={`p-2 flex items-center justify-center ${isFilterExpanded ? "bg-blue-50 text-blue-600" : "bg-white text-gray-700"} border border-gray-200 rounded-lg hover:bg-gray-50`}
                style={{ zIndex: 100 }}
                onClick={toggleFilterExpansion}
                title="Filtri"
                id="notification-filter-toggle"
              >
                <Filter className="w-5 h-5" />
              </button>
  
              <button
                className={`archa-button z-50 flex items-center justify-center w-10 h-10 p-2 ${isDocumentSearchVisible ? "text-blue-600 bg-blue-50" : "text-gray-700 bg-white"} border border-gray-200 rounded-lg hover:bg-gray-50`}
                onClick={toggleDocumentSearch}
                title="Cerca chat per documento"
                id="notification-document-search-button"
              >
                <Link className="w-5 h-5" />
              </button>
  
              <select
                value={filters.categoryId || "all"}
                onChange={handleCategoryChange}
                id="notification-category-filter"
                className="h-10 w-100 p-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ backgroundColor: selectBackgroundColor, zIndex: 100 }}
              >
                <option value="all">Tutte le categorie</option>
                {uniqueCategories.map((category) => (
                  <option
                    key={`category-${category.id}`}
                    value={category.id}
                    style={{ backgroundColor: category.color }}
                    title={category.name}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
  
              <button
                className="archa-button z-50 flex items-center justify-center w-10 h-10 p-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                onClick={handleOpenNewMessageModal}
                title="Nuovo messaggio"
                id="notification-new-message-button"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
  
          {isFilterExpanded && (
            <div
              className="px-3 py-2 mb-2 bg-white rounded-lg mx-2 border border-gray-200 shadow-md"
              id="notification-expanded-filters"
              ref={filterExpandedRef}
              style={{
                zIndex: 100,
                width: window.innerWidth < 768 ? "95vw" : "calc(100% - 0.5rem)",
                position: "absolute",
                top: "85px",
                right: window.innerWidth < 768 ? "0px" : "345px",
                backgroundColor: "#ffffff",
                borderRadius: "0.5rem",
                maxHeight: "75vh",
                overflowY: "auto",
                backdropFilter: "blur(8px)",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)"
              }}
            >
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-800">Filtri notifiche</h3>
                <button
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
                  onClick={toggleFilterExpansion}
                  id="notification-filter-close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mb-3">
                <DoNotDisturbToggle />
              </div>

              <div className="mb-3">
                <h4 className="text-xs font-medium text-gray-600 mb-2">Filtri principali</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={`flex items-center space-x-1.5 p-1.5 rounded-md cursor-pointer transition-all duration-200 ${
                      filters.filterUnreadOnly ? "bg-blue-50 border border-blue-200 shadow-sm" : "hover:bg-gray-50 border border-transparent"
                    }`}
                    onClick={() => updateFilter('filterUnreadOnly', !filters.filterUnreadOnly)}
                  >
                    <input
                      type="checkbox"
                      id="notification-unread-switch"
                      checked={filters.filterUnreadOnly}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateFilter('filterUnreadOnly', e.target.checked);
                      }}
                      className="w-3.5 h-3.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 transition-colors duration-200"
                    />
                    <label
                      htmlFor="notification-unread-switch"
                      className="text-xs cursor-pointer font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Solo non lette
                    </label>
                  </div>

                  <div
                    className={`flex items-center space-x-1.5 p-1.5 rounded-md cursor-pointer transition-all duration-200 ${
                      filters.filterFavorites ? "bg-yellow-50 border border-yellow-200 text-yellow-700 shadow-sm" : "hover:bg-gray-50 border border-transparent text-gray-700"
                    }`}
                    onClick={() => updateFilter('filterFavorites', !filters.filterFavorites)}
                    id="notification-favorites-filter"
                  >
                    <Star className={`w-4 h-4 ${filters.filterFavorites ? "fill-yellow-500 text-yellow-500" : ""}`} />
                    <span className="text-sm font-medium">Preferiti</span>
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <h4 className="text-xs font-medium text-gray-600 mb-3">Tipo di notifiche</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`flex items-center space-x-2 p-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                      filters.filterMentioned ? "bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm" : "hover:bg-gray-50 border border-transparent text-gray-700"
                    }`}
                    onClick={() => updateFilter('filterMentioned', !filters.filterMentioned)}
                    id="notification-mentioned-filter"
                  >
                    <AtSign className="w-4 h-4" />
                    <span className="text-sm font-medium">Menzioni</span>
                  </div>

                  <div
                    className={`flex items-center space-x-2 p-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                      filters.filterMessagesSent ? "bg-green-50 border border-green-200 text-green-700 shadow-sm" : "hover:bg-gray-50 border border-transparent text-gray-700"
                    }`}
                    onClick={() => updateFilter('filterMessagesSent', !filters.filterMessagesSent)}
                    id="notification-sent-filter"
                  >
                    <Send className="w-4 h-4" />
                    <span className="text-sm font-medium">Miei messaggi</span>
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <h4 className="text-xs font-medium text-gray-600 mb-3">Stato</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`flex items-center space-x-2 p-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                      filters.filterLeftChats ? "bg-amber-50 border border-amber-200 text-amber-700 shadow-sm" : "hover:bg-gray-50 border border-transparent text-gray-700"
                    }`}
                    onClick={() => updateFilter('filterLeftChats', !filters.filterLeftChats)}
                    id="notification-left-chats-filter"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Abbandonate</span>
                  </div>

                  <div
                    className={`flex items-center space-x-2 p-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                      filters.filterArchived ? "bg-purple-50 border border-purple-200 text-purple-700 shadow-sm" : "hover:bg-gray-50 border border-transparent text-gray-700"
                    }`}
                    onClick={handleToggleArchivedFilter}
                    id="notification-archived-chats-filter"
                  >
                    <Archive className="w-4 h-4" />
                    <span className="text-sm font-medium">Archiviate</span>
                    {archivedUnreadCount > 0 && !filters.filterArchived && (
                      <span className="flex items-center justify-center ml-1 bg-red-500 text-white text-xs font-semibold h-5 w-5 rounded-full">
                        {archivedUnreadCount}
                      </span>
                    )}
                  </div>

                  <div
                    className={`flex items-center space-x-2 p-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                      filters.filterMuted ? "bg-rose-50 border border-rose-200 text-rose-700 shadow-sm" : "hover:bg-gray-50 border border-transparent text-gray-700"
                    }`}
                    onClick={() => updateFilter('filterMuted', !filters.filterMuted)}
                    id="notification-muted-filter"
                  >
                    <BellOff className="w-4 h-4" />
                    <span className="text-sm font-medium">Silenziate</span>
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <label className="text-xs font-medium text-gray-600 mb-3 block">Stato completamento</label>
                <div className="flex justify-between bg-white border border-gray-200 rounded-lg p-1" id="notification-completion-filter">
                  <button
                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                      filters.completedFilter === "all" ? "bg-blue-100 text-blue-700 shadow-sm" : "text-gray-600 hover:bg-gray-50"
                    }`}
                    onClick={() => handleCompletedFilterChange("all")}
                    id="notification-filter-all"
                  >
                    Tutte
                  </button>
                  <button
                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                      filters.completedFilter === "active" ? "bg-blue-100 text-blue-700 shadow-sm" : "text-gray-600 hover:bg-gray-50"
                    }`}
                    onClick={() => handleCompletedFilterChange("active")}
                    id="notification-filter-active"
                  >
                    Attive
                  </button>
                  <button
                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                      filters.completedFilter === "completed" ? "bg-blue-100 text-blue-700 shadow-sm" : "text-gray-600 hover:bg-gray-50"
                    }`}
                    onClick={() => handleCompletedFilterChange("completed")}
                    id="notification-filter-completed"
                  >
                    Completate
                  </button>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100 text-center">
                <button
                  className="w-full py-2.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  onClick={resetFilters}
                >
                  Reimposta tutti i filtri
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  
      {isDocumentSearchVisible && (
        <div className="document-search-section bg-white border-b border-gray-200 p-3">
          {/* Sezione 1: Ricerca documenti */}
          <div className="search-section mb-2">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium">Cerca chat per documento</h3>
              <button onClick={toggleDocumentSearch} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-3 relative document-type-dropdown">
              <div
                className="p-2 border rounded-lg flex justify-between items-center cursor-pointer bg-white hover:bg-gray-50"
                onClick={() => setIsDocTypesOpen(!isDocTypesOpen)}
              >
                <div className="flex items-center">
                  {React.cloneElement(
                    documentTypes.find((t) => t.id === documentTab)?.icon || <Link />,
                    { className: "h-4 w-4 mr-2" },
                  )}
                  <span className="text-sm">
                    {documentTypes.find((t) => t.id === documentTab)?.label || "Seleziona categoria"}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isDocTypesOpen ? "rotate-180" : ""}`} />
              </div>
      
              {isDocTypesOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 document-type-menu max-h-48 overflow-y-auto">
                  {documentTypes.map((type) => (
                    <button
                      key={type.id}
                      className={`w-full flex items-center py-2 px-3 text-sm hover:bg-gray-50 ${
                        documentTab === type.id ? "bg-blue-50 text-blue-600 font-medium" : ""
                      }`}
                      onClick={() => {
                        setDocumentTab(type.id);
                        setDocumentsSearchResults([]);
                        setSelectedDocument(null);
                        setDocumentChats([]);
                        setIsDocTypesOpen(false);
                      }}
                    >
                      {React.cloneElement(type.icon, { className: "h-4 w-4 mr-2" })}
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
      
            <div className="relative mb-3">
              <input
                type="text"
                placeholder={`Cerca ${documentTypes.find((t) => t.id === documentTab)?.label.toLowerCase() || "documenti"}...`}
                value={documentsSearchTerm}
                onChange={handleDocumentsSearchChange}
                className="w-full p-2 pl-9 pr-9 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2" />
              </div>
              {documentsSearchTerm && (
                <button
                  onClick={handleClearDocumentsSearch}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
      
            <button
              onClick={searchDocuments}
              className="w-full py-2 px-3 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={documentsSearchTerm.length < 2 || documentsLoading}
            >
              {documentsLoading ? (
                <span className="flex items-center justify-center">
                  <i className="bi bi-arrow-repeat spin mr-2"></i> Ricerca in corso...
                </span>
              ) : (
                "Cerca Documenti"
              )}
            </button>
          </div>

          {/* Sezione 2: Lista risultati documenti */}
          {documentsSearchResults.length > 0 && (
            <div className="results-section mb-2 border-t border-gray-100 pt-4">
              <h4 className="text-xs font-medium text-gray-600 mb-2">
                Documenti trovati ({documentsSearchResults.length})
              </h4>
              <div className="space-y-2 overflow-y-auto pr-1 documents-list max-h-[300px]">
                {documentsSearchResults.map((doc) => (
                  <div
                    key={`doc-${doc.DocumentType}-${doc.DocumentId}`}
                    className={`document-item p-2 border rounded-lg cursor-pointer transition-colors ${
                      selectedDocument?.DocumentId === doc.DocumentId
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => searchChatsByDocument(doc)}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-2 bg-gray-100 p-1.5 rounded-md">
                        {documentTypes.find((t) => t.id === documentTab)?.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {doc.DocumentNumber}
                          {doc.Status && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 bg-gray-100 rounded-full">
                              {doc.Status}
                            </span>
                          )}
                        </p>
                        {doc.DocumentReference && (
                          <p className="text-xs text-gray-500 truncate">{doc.DocumentReference}</p>
                        )}
                        <p className="text-xs text-gray-500 truncate">{doc.DocumentDescription}</p>
                        {doc.DocumentDate && (
                          <p className="text-xs text-gray-400 flex items-center mt-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(doc.DocumentDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-gray-400 transform transition-transform ${
                          selectedDocument?.DocumentId === doc.DocumentId ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sezione 3: Chat collegate */}
          {selectedDocument && (
            <div className="chats-section border-t border-gray-100 pt-4">
              <h4 className="text-xs font-medium text-gray-600 mb-2 flex items-center">
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                Chat legate a:
                <span className="ml-1 font-semibold text-blue-600">{selectedDocument.DocumentNumber}</span>
              </h4>

              {documentChatsLoading ? (
                <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                  <i className="bi bi-arrow-repeat spin mr-2"></i>
                  <span className="text-sm text-gray-500">Caricamento chat...</span>
                </div>
              ) : documentChats.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {documentChats.map((chat, index) => (
                    <div
                      key={`doc-chat-${chat.notificationId}-${index}`}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        chat.isUserMember
                          ? "bg-white border-gray-200 hover:bg-gray-50"
                          : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                      }`}
                      onClick={() =>
                        chat.isUserMember
                          ? openChatModal(chat.notificationId)
                          : openChatInReadOnlyMode(chat.notificationId)
                      }
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <span
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: chat.hexColor || "#6366f1" }}
                          ></span>
                          <h5 className="text-sm font-medium truncate">{chat.title}</h5>
                        </div>
                        {!chat.isUserMember && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full flex items-center">
                            <Eye className="h-3 w-3 mr-1" />
                            Sola lettura
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                        {chat.lastMessage || "Nessun messaggio"}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {chat.participantCount} partecipanti
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(chat.tbCreated).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
                  <MessageSquare className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 text-center">
                    Nessuna chat trovata per questo documento.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Messaggi di stato */}
          {!documentsSearchResults.length && !documentsLoading && !selectedDocument && documentsSearchTerm.length >= 2 && (
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg mt-3">
              <Link className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500 text-center">
                Nessun documento trovato. Prova a modificare i criteri di ricerca.
              </p>
            </div>
          )}

          {!documentsSearchResults.length && !documentsLoading && documentsSearchTerm.length < 2 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Suggerimento:</strong> Digita almeno 2 caratteri per cercare documenti. Puoi cercare{" "}
                {documentTypes.find((t) => t.id === documentTab)?.label.toLowerCase()} per codice, descrizione o altri dati rilevanti.
              </p>
            </div>
          )}
        </div>
      )}

      <div 
        className="notifications-list" 
        ref={scrollContainerRef} 
        id="notification-list-container"
      >
        {!isDocumentSearchVisible && (
          <>
            {isInitialLoading ? (
              <div className="flex items-center justify-center p-6">
                <i className="bi bi-arrow-repeat spin mr-2"></i>
                <span>Caricamento notifiche...</span>
              </div>
            ) : isEmpty ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-gray-500" id="notification-empty-state">
                <div className="mb-3 w-16 h-16 flex items-center justify-center rounded-full bg-gray-100">
                  <Filter className="w-8 h-8 text-gray-400" />
                </div>
                <p className="mb-2">
                  {hasActiveFilters 
                    ? "Nessuna notifica corrisponde ai filtri selezionati" 
                    : "Nessuna notifica disponibile"}
                </p>
                {hasActiveFilters && (
                  <button
                    className="mt-2 text-sm text-blue-600 hover:underline"
                    onClick={resetFilters}
                    id="notification-reset-filters"
                  >
                    Reimposta tutti i filtri
                  </button>
                )}
              </div>
            ) : (
              <>
                {notificationsWithOptimisticUpdates.map((notification) => {
                  const messages = parseMessages(notification.messages);
                  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
                  const categoryColor = notification.hexColor;
                  const hasLeftChat = notification.chatLeft === 1 || notification.chatLeft === true;
                  const isArchived = notification.archived === 1 || notification.archived === true;
                  const isUpdating = updatingNotifications.has(notification.notificationId);
    
                  return (
                    <div
                      key={`notification-${notification.notificationId}`}
                      className={`notification-item ${notification.isReadByUser ? "read" : "unread"} ${notification.isClosed ? "isClosed" : ""} ${hasLeftChat ? "chat-left" : ""} ${isArchived ? "archived" : ""}
                              ${animatingItemId === notification.notificationId && animationPhase === "exit" ? "pin-exit-active" : ""}
                              ${animatingItemId === notification.notificationId && animationPhase === "enter" ? "pin-enter-active" : ""}
                              ${isUpdating ? "updating" : ""}`}
                      onClick={(e) => handleNotificationClick(notification, e)}
                      onDoubleClick={(e) => handleNotificationDoubleClick(notification, e)}
                      id={`notification-item-${notification.notificationId}`}
                      data-notification-id={notification.notificationId}
                      data-is-read={notification.isReadByUser ? "true" : "false"}
                      data-is-pinned={notification.pinned ? "true" : "false"}
                      data-is-closed={notification.isClosed ? "true" : "false"}
                      data-has-left={hasLeftChat ? "true" : "false"}
                      data-is-archived={isArchived ? "true" : "false"}
                    >
                      {/* NUOVO: Indicatore di aggiornamento in corso */}
                      {isUpdating && (
                        <div className="updating-overlay">
                          <div className="updating-spinner"></div>
                        </div>
                      )}
                      
                      <div
                        className="category-vertical-bar"
                        style={{ backgroundColor: categoryColor }}
                        title={notification.notificationCategoryName}
                        id={`notification-category-indicator-${notification.notificationId}`}
                      ></div>
                      
                      <div className="notification-content1A">
                        <i
                          className={`${notification.pinned ? "bi-pin-fill text-black" : "bi-pin-angle text-gray-600"} pin-icon`}
                          onClick={(e) => {
                            e.currentTarget.classList.add("pin-animation");
                            setTimeout(() => {
                              e.currentTarget.classList.remove("pin-animation");
                            }, 600);
                            handleTogglePin(notification.notificationId, notification.pinned, e);
                          }}
                          id={`notification-pin-${notification.notificationId}`}
                          title={notification.pinned ? "Rimuovi pin" : "Aggiungi pin"}
                        ></i>
                        <i
                          className={notification.favorite ? "bi bi-star-fill" : "bi bi-star"}
                          onClick={(e) => handleToggleFavorite(notification.notificationId, notification.favorite, e)}
                          id={`notification-favorite-${notification.notificationId}`}
                          title={notification.favorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                        ></i>
                        <i
                          className="bi bi-at"
                          style={{
                            color: notification.mentionToRead ? "red" : notification.isMentioned ? "black" : "gray",
                            opacity: notification.isMentioned || notification.mentionToRead ? 1 : 0.5,
                          }}
                          id={`notification-mention-${notification.notificationId}`}
                          title={notification.isMentioned ? "Sei stato menzionato in questa notifica" : ""}
                        ></i>
                      </div>
                      
                      <div className="notification-content1B">
                        <i
                          className={isArchived ? "bi bi-archive-fill text-purple-600" : "bi bi-archive text-gray-600"}
                          onClick={(e) =>
                            isArchived
                              ? handleUnarchiveNotification(notification.notificationId, e)
                              : handleArchiveNotification(notification.notificationId, e)
                          }
                          id={`notification-archive-${notification.notificationId}`}
                          title={isArchived ? "Rimuovi dall'archivio" : "Archivia"}
                          style={{ cursor: "pointer" }}
                        ></i>
                        <i
                          className={notification.isMuted ? "bi bi-bell-slash-fill text-gray-600" : "bi bi-bell text-gray-600"}
                          onClick={(e) => handleToggleMute(notification.notificationId, !notification.isMuted, e)}
                          id={`notification-mute-${notification.notificationId}`}
                          title={notification.isMuted ? "Riattiva notifiche" : "Silenzia notifiche"}
                          style={{ cursor: "pointer" }}
                        ></i>
                      </div>

                      <div className="notification-content2">
                        <div className={`notification-header ${notification.isReadByUser ? "" : "unread"}`}>
                          <span
                            className={"notification-title " + (notification.isReadByUser ? "" : "unread")}
                            id={`notification-title-${notification.notificationId}`}
                          >
                            {notification.title}
                            {hasLeftChat && (
                              <span className="text-yellow-600 text-xs ml-1">(abbandonata)</span>
                            )}
                            {isArchived && (
                              <span className="text-purple-600 text-xs ml-1">(archiviata)</span>
                            )}
                          </span>
                          <span className={`time`} id={`notification-time-${notification.notificationId}`}>
                            {lastMessage ? timeSince(lastMessage.tbCreated) : ""}
                          </span>
                        </div>
                        <span className="sender" id={`notification-sender-${notification.notificationId}`}>
                          {lastMessage ? lastMessage.senderName : ""}
                        </span>
                        <div className="last-message-preview" id={`notification-preview-${notification.notificationId}`}>
                          {lastMessage ? lastMessage.message : ""}
                        </div>
                      </div>
                      
                      <div
                        className="read-indicator-wrapper"
                        style={{
                          backgroundColor: notification.isReadByUser ? "#e7e7e7" : "rgb(224, 42, 42)",
                        }}
                        onClick={(e) => handleToggleReadUnread(notification.notificationId, notification.isReadByUser, e)}
                        id={`notification-read-indicator-${notification.notificationId}`}
                        title={notification.isReadByUser ? "Segna come non letto" : "Segna come letto"}
                      />
                    </div>
                  );
                })}

                {/* MODIFICA: Elemento sentinel per intersection observer */}
                <div 
                  ref={loadMoreSentinelRef} 
                  className="load-more-sentinel"
                  style={{ 
                    height: '1px',
                    marginTop: '20px'
                  }}
                />

                {/* Loading indicator */}
                {isLoadingMore && (
                  <div className="flex items-center justify-center p-4">
                    <i className="bi bi-arrow-repeat spin mr-2"></i>
                    <span className="text-sm text-gray-500">
                      Caricamento altre notifiche...
                    </span>
                  </div>
                )}

                {/* Messaggio fine lista */}
                {!hasMore && notifications.length > 0 && (
                  <div className="flex items-center justify-center p-4 text-gray-500">
                    <p className="text-sm">
                      {getStats().totalNotifications > 0 
                        ? `Hai visualizzato tutte le ${getStats().totalNotifications} notifiche`
                        : "Fine delle notifiche"}
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <style>
        {`
          .notification-item.archived .notification-title {
            color: #9333ea;
          }
          
.notification-item {
            position: relative;
            transition: opacity 0.2s ease-out;
          }
	  
	  .notification-item {
            position: relative;
            transition: opacity 0.2s ease-out;
          }
          
          .notification-item.updating {
            opacity: 0.7;
          }
	  
          .notification-item.archived {
            background-color: rgba(147, 51, 234, 0.05);
          }
          
          .notification-item.muted .notification-title::after {
            content: " 🔕";
            font-size: 0.8em;
            opacity: 0.7;
          }
          
          .notification-item.muted {
            background-color: rgba(0, 0, 0, 0.02);
          }

          .document-search-section {
            max-height: 80vh;
            overflow-y: auto;
          }

          .documents-list::-webkit-scrollbar {
            width: 5px;
          }

          .documents-list::-webkit-scrollbar-thumb {
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: 3px;
          }

          .documents-list::-webkit-scrollbar-track {
            background-color: rgba(0, 0, 0, 0.05);
          }

          .document-item {
            transition: all 0.2s ease;
          }

          .document-item:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }

          .doc-type-tabs {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .doc-type-tabs::-webkit-scrollbar {
            display: none;
          }

          .spin {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          /* Animazioni per il pin */
          .pin-exit-active {
            animation: slideOutRight 0.4s ease-out forwards;
          }

          .pin-enter-active {
            animation: slideInLeft 0.6s ease-out forwards;
          }
	  
	  .updating-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
          }
          
          .updating-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #e5e7eb;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes slideOutRight {
            0% {
              transform: translateX(0);
              opacity: 1;
            }
            100% {
              transform: translateX(100%);
              opacity: 0;
            }
          }

          @keyframes slideInLeft {
            0% {
              transform: translateX(-100%);
              opacity: 0;
            }
            100% {
              transform: translateX(0);
              opacity: 1;
            }
          }

          .pin-animation {
            animation: pinRotate 0.6s ease-in-out;
          }

          @keyframes pinRotate {
            0% { transform: rotate(0deg); }
            50% { transform: rotate(20deg); }
            100% { transform: rotate(0deg); }
          }

          /* Fix per evitare sfarfallii durante gli aggiornamenti */
          .notifications-list {
            will-change: contents;
            overflow-y: auto;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
          }

          .notification-item {
            will-change: transform;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
          }

          /* Transizioni fluide per i filtri */
          .notification-item {
            transition: opacity 0.2s ease-out, transform 0.2s ease-out;
          }

          .notification-item.title-updating {
            transition: background-color 0.1s ease-in-out;
            background-color: rgba(59, 130, 246, 0.05);
          }

          /* Sentinel per infinite scroll */
          .load-more-sentinel {
            pointer-events: none;
          }
        `}
      </style>
    </div>
  );
};

export default NotificationSidebar;