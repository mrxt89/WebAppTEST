// src/hooks/useNotificationsPagination.js
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  fetchPaginatedNotifications,
  resetPaginatedNotifications,
  setLoadingMore,
  selectUnreadCount,
  updatePaginatedNotification 
} from '@/redux/features/notifications/notificationsSlice';

export const useNotificationsPagination = () => {
  const dispatch = useDispatch();
  
  // Selettori dallo stato Redux
  const { 
    paginatedNotifications,
    notificationsPagination,
    loading,
    error 
  } = useSelector(state => state.notifications);
  
  // Selettore specifico per unreadCount
  const unreadCount = useSelector(selectUnreadCount);
  
  // Ref per tracciare se stiamo già caricando
  const isLoadingRef = useRef(false);
  
  // Ref per l'ultimo set di filtri usati
  const lastFiltersRef = useRef({});
  
  const updateSingleNotification = useCallback((notificationId, updates) => {
    dispatch(updatePaginatedNotification({ notificationId, updates }));
  }, [dispatch]);

  // Carica la prima pagina
  const loadFirstPage = useCallback((filters = {}) => {
    // Evita chiamate duplicate
    if (isLoadingRef.current) {
      console.log('[useNotificationsPagination] Già in caricamento, skip loadFirstPage');
      return Promise.resolve();
    }
    
    // Salva i filtri correnti
    lastFiltersRef.current = filters;
    isLoadingRef.current = true;
    
    // Reset delle notifiche paginate
    dispatch(resetPaginatedNotifications());
    
    // Fetch prima pagina
    return dispatch(fetchPaginatedNotifications({ 
      page: 1, 
      filters,
      append: false 
    })).finally(() => {
      isLoadingRef.current = false;
    });
  }, [dispatch]);

  // Carica la pagina successiva
  const loadNextPage = useCallback((filters = {}) => {
    // Verifica se possiamo caricare più pagine
    if (!notificationsPagination.hasMore || 
        notificationsPagination.isLoadingMore || 
        isLoadingRef.current) {
      console.log('[useNotificationsPagination] Skip loadNextPage:', {
        hasMore: notificationsPagination.hasMore,
        isLoadingMore: notificationsPagination.isLoadingMore,
        isLoading: isLoadingRef.current
      });
      return Promise.resolve();
    }
    
    // Usa gli ultimi filtri se non specificati
    const currentFilters = Object.keys(filters).length > 0 ? filters : lastFiltersRef.current;
    
    console.log('[useNotificationsPagination] Caricando pagina:', notificationsPagination.currentPage + 1);
    
    // Imposta loading state
    dispatch(setLoadingMore(true));
    
    // Fetch pagina successiva
    return dispatch(fetchPaginatedNotifications({ 
      page: notificationsPagination.currentPage + 1,
      filters: currentFilters,
      append: true 
    }));
  }, [dispatch, notificationsPagination]);

  // Ricarica mantenendo la posizione
  const refreshNotifications = useCallback((filters = {}) => {
    console.log('[useNotificationsPagination] Refresh notifiche con filtri:', filters);
    return loadFirstPage(filters);
  }, [loadFirstPage]);

  // Funzione per verificare se dobbiamo caricare più dati
  const shouldLoadMore = useCallback(() => {
    return notificationsPagination.hasMore && 
           !notificationsPagination.isLoadingMore && 
           !loading;
  }, [notificationsPagination, loading]);

  // Funzione per ottenere info sul caricamento
  const getLoadingState = useCallback(() => {
    return {
      isLoadingInitial: loading && paginatedNotifications.length === 0,
      isLoadingMore: notificationsPagination.isLoadingMore,
      isRefreshing: loading && paginatedNotifications.length > 0
    };
  }, [loading, notificationsPagination.isLoadingMore, paginatedNotifications.length]);

  // Funzione per ottenere statistiche
  const getStats = useCallback(() => {
    return {
      loadedCount: paginatedNotifications.length,
      totalCount: notificationsPagination.totalNotifications,
      currentPage: notificationsPagination.currentPage,
      totalPages: notificationsPagination.totalPages,
      pageSize: notificationsPagination.pageSize,
      percentLoaded: notificationsPagination.totalNotifications > 0 
        ? Math.round((paginatedNotifications.length / notificationsPagination.totalNotifications) * 100)
        : 0
    };
  }, [paginatedNotifications.length, notificationsPagination]);

  // Funzione helper per filtrare notifiche localmente
  const filterNotificationsLocally = useCallback((filterFn) => {
    if (typeof filterFn !== 'function') {
      console.error('[useNotificationsPagination] filterFn deve essere una funzione');
      return [];
    }
    
    return paginatedNotifications.filter(filterFn);
  }, [paginatedNotifications]);

  // Funzione per trovare una notifica specifica
  const findNotification = useCallback((notificationId) => {
    return paginatedNotifications.find(n => n.notificationId === parseInt(notificationId));
  }, [paginatedNotifications]);

  // Funzione per verificare se una notifica è già caricata
  const isNotificationLoaded = useCallback((notificationId) => {
    return paginatedNotifications.some(n => n.notificationId === parseInt(notificationId));
  }, [paginatedNotifications]);

  // Cleanup quando il componente si smonta
  useEffect(() => {
    return () => {
      // Reset ref quando il componente si smonta
      isLoadingRef.current = false;
      lastFiltersRef.current = {};
    };
  }, []);

  // Log per debug in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useNotificationsPagination] State update:', {
        notificationsCount: paginatedNotifications.length,
        pagination: notificationsPagination,
        unreadCount
      });
    }
  }, [paginatedNotifications.length, notificationsPagination, unreadCount]);

  return {
    // Dati
    notifications: paginatedNotifications,
    pagination: notificationsPagination,
    unreadCount,
    loading,
    error,
    
    // Funzioni principali
    updateSingleNotification, 
    loadFirstPage,
    loadNextPage,
    refreshNotifications,
    
    // Funzioni helper
    shouldLoadMore,
    getLoadingState,
    getStats,
    filterNotificationsLocally,
    findNotification,
    isNotificationLoaded,
    
    // Stati derivati
    hasNotifications: paginatedNotifications.length > 0,
    isEmpty: !loading && paginatedNotifications.length === 0,
    isInitialLoading: loading && paginatedNotifications.length === 0,
    isLoadingMore: notificationsPagination.isLoadingMore,
    hasMore: notificationsPagination.hasMore,
    
    // Metadati
    currentPage: notificationsPagination.currentPage,
    totalPages: notificationsPagination.totalPages,
    totalNotifications: notificationsPagination.totalNotifications,
    pageSize: notificationsPagination.pageSize
  };
};

// Hook helper per gestire i filtri delle notifiche
export const useNotificationFilters = (initialFilters = {}) => {
  const [filters, setFilters] = useState({
    searchText: '',
    filterArchived: false,
    filterFavorites: false,
    filterMuted: false,
    filterUnreadOnly: false,
    filterMentioned: false,
    filterMessagesSent: false,
    filterLeftChats: false,
    completedFilter: 'all',
    categoryId: null,
    ...initialFilters
  });

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      searchText: '',
      filterArchived: false,
      filterFavorites: false,
      filterMuted: false,
      filterUnreadOnly: false,
      filterMentioned: false,
      filterMessagesSent: false,
      filterLeftChats: false,
      completedFilter: 'all',
      categoryId: null
    });
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'completedFilter' && value !== 'all') return true;
      if (key === 'searchText' && value.trim() !== '') return true;
      if (key === 'categoryId' && value !== null) return true;
      if (typeof value === 'boolean' && value === true) return true;
      return false;
    });
  }, [filters]);

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    hasActiveFilters
  };
};

// Hook helper per gestire la ricerca con debounce
export const useNotificationSearch = (onSearch, delay = 500) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setIsSearching(true);

    // Cancella il timeout precedente
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Se il valore è vuoto, cerca immediatamente
    if (!value || value.trim() === '') {
      setIsSearching(false);
      onSearch(value);
      return;
    }

    // Altrimenti applica il debounce
    searchTimeoutRef.current = setTimeout(() => {
      setIsSearching(false);
      onSearch(value);
    }, delay);
  }, [onSearch, delay]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setIsSearching(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    onSearch('');
  }, [onSearch]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    searchTerm,
    isSearching,
    handleSearch,
    clearSearch
  };
};

export default useNotificationsPagination;