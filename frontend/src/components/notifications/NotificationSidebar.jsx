import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
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
  // Hook Redux
  const {
    notifications,
    toggleReadUnread,
    togglePin,
    toggleFavorite,
    archiveChat,
    unarchiveChat,
    toggleMuteChat,
    isNotificationMuted,
    forceLoadNotifications,
    fetchNotificationById,
    searchInNotifications,
  } = useNotifications();

  // Stati dei filtri
  const [filterMentioned, setFilterMentioned] = useState(false);
  const [filterMessagesSent, setFilterMessagesSent] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [completedFilter, setCompletedFilter] = useState("all");
  const [filterLeftChats, setFilterLeftChats] = useState(false);
  const [filterArchivedChats, setFilterArchivedChats] = useState(false);
  const [filterMutedChats, setFilterMutedChats] = useState(false);

  // Stati locali
  const [selectBackgroundColor, setSelectBackgroundColor] = useState("#ffffff");
  const [animatingItemId, setAnimatingItemId] = useState(null);
  const [animationPhase, setAnimationPhase] = useState(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isDocumentSearchVisible, setIsDocumentSearchVisible] = useState(false);
  const [archivedUnreadCount, setArchivedUnreadCount] = useState(0);

  // Stati per aggiornamenti ottimistici
  const [optimisticUpdates, setOptimisticUpdates] = useState({});

  // Stati per la ricerca documenti
  const [documentTab, setDocumentTab] = useState("customers");
  const [documentsSearchTerm, setDocumentsSearchTerm] = useState("");
  const [documentsSearchResults, setDocumentsSearchResults] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentChats, setDocumentChats] = useState([]);
  const [documentChatsLoading, setDocumentChatsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isDocTypesOpen, setIsDocTypesOpen] = useState(false);

  // Stati per gestire la ricerca API vs locale
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isApiSearch, setIsApiSearch] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Refs
  const animationTimeoutRef = useRef(null);
  const sidebarRef = useRef(null);
  const filterExpandedRef = useRef(null);
  const notificationBarRef = useRef(null);
  const scrollPositionRef = useRef(0);

  // Wiki context
  const { openWiki } = useWikiContext();

  // Document types
  const documentTypes = [
    { id: "customers", label: "Clienti", icon: <User size={16} /> },
    { id: "suppliers", label: "Fornitori", icon: <Truck size={16} /> },
    { id: "SaleOrd", label: "Ordini Cliente", icon: <ShoppingCart size={16} /> },
    { id: "SaleDoc", label: "Documenti Vendita", icon: <FileText size={16} /> },
    { id: "PurchaseOrd", label: "Ordini Fornitore", icon: <FileBox size={16} /> },
    { id: "PurchaseDoc", label: "Documenti Acquisto", icon: <FileText size={16} /> },
    { id: "MO", label: "Ordini Produzione", icon: <Clipboard size={16} /> },
    { id: "BOM", label: "Distinte Base", icon: <Link size={16} /> },
    { id: "Item", label: "Articoli", icon: <Tag size={16} /> },
    { id: "Task", label: "Attività", icon: <Clipboard size={16} /> },
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

  const stableSort = (array, comparator) => {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
  };

  // Applica gli aggiornamenti ottimistici alle notifiche
  const notificationsWithOptimisticUpdates = useMemo(() => {
    if (!notifications) return [];
    
    return notifications.map(notification => {
      const update = optimisticUpdates[notification.notificationId];
      if (update) {
        return { ...notification, ...update };
      }
      return notification;
    });
  }, [notifications, optimisticUpdates]);

  // DERIVAZIONE SINCRONA dei filtri - questa è la chiave!
  const filteredNotifications = useMemo(() => {
    if (!visible) return [];

    // Se stiamo utilizzando la ricerca API, usa i risultati
    if (isApiSearch && searchResults.length > 0) {
      return searchResults;
    }
    
    // Se stiamo utilizzando la ricerca API ma non ci sono risultati, mostra array vuoto
    if (isApiSearch && searchTerm.trim() !== "") {
      return [];
    }

    // Altrimenti usa la logica di filtro locale esistente
    const filtered = notificationsWithOptimisticUpdates.filter((notification) => {
      const isArchived = notification.archived === 1 || notification.archived === true;

      if (filterArchivedChats && !isArchived) return false;
      if (!filterArchivedChats && isArchived) return false;
      if (filterMentioned && !notification.isMentioned) return false;
      if (filterMessagesSent && !notification.messagesSent) return false;
      if (showUnreadOnly && notification.isReadByUser) return false;
      if (filterFavorites && !notification.favorite) return false;
      if (selectedCategory !== "all" && 
          notification.notificationCategoryId.toString() !== selectedCategory) return false;
      if (completedFilter === "completed" && !notification.isClosed) return false;
      if (completedFilter === "active" && notification.isClosed) return false;
      if (filterLeftChats && notification.chatLeft !== 1) return false;
      if (filterMutedChats && !isNotificationMuted(notification)) return false;

      // Per la ricerca locale, mantieni la logica esistente solo se non stiamo usando l'API
      if (searchTerm && !isApiSearch) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const messages = parseMessages(notification.messages);
        if (!notification.title.toLowerCase().includes(lowerSearchTerm) &&
            !messages.some(message => 
              message.message && 
              message.message.toLowerCase().includes(lowerSearchTerm)
            )) {
          return false;
        }
      }
      return true;
    });

    return stableSort([...filtered], (a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return parseFloat(b.lastMessage || 0) - parseFloat(a.lastMessage || 0);
    });
  }, [
    notificationsWithOptimisticUpdates,
    visible,
    isApiSearch,
    searchResults,
    searchTerm,
    filterArchivedChats,
    filterMentioned,
    filterMessagesSent,
    showUnreadOnly,
    filterFavorites,
    selectedCategory,
    completedFilter,
    filterLeftChats,
    filterMutedChats,
    isNotificationMuted
  ]);

  // Funzione per gestire la ricerca API
  const performApiSearch = useCallback(async (searchText) => {
    if (!searchText || searchText.trim().length < 2) {
      setIsApiSearch(false);
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    try {
      setIsSearching(true);
      setSearchError(null);
      setIsApiSearch(true);

      console.log(`🔍 Eseguendo ricerca API: "${searchText}"`);
      
      const results = await searchInNotifications(searchText);
      
      console.log(`✅ Ricerca completata: ${results?.length || 0} risultati`);
      
      if (results && Array.isArray(results)) {
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("❌ Errore nella ricerca:", error);
      setSearchError("Errore durante la ricerca. Riprova.");
      setIsApiSearch(false);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchInNotifications]);

  // Salva la posizione dello scroll prima di ogni aggiornamento
  const saveScrollPosition = useCallback(() => {
    if (notificationBarRef.current) {
      scrollPositionRef.current = notificationBarRef.current.scrollTop;
    }
  }, []);

  // Ripristina la posizione dello scroll
  const restoreScrollPosition = useCallback(() => {
    if (notificationBarRef.current) {
      notificationBarRef.current.scrollTop = scrollPositionRef.current;
    }
  }, []);

  // Handlers ottimizzati
  const handleNotificationClick = (notification, e) => {
    e.stopPropagation();
    
    if (notification && notification.notificationId && openChatModal) {
      saveScrollPosition();
      openChatModal(notification.notificationId);
      
      // Ripristina lo scroll dopo un breve delay
      setTimeout(restoreScrollPosition, 50);
    }
  };

  const handleToggleReadUnread = (notificationId, isRead, e) => {
    e.stopPropagation();
    saveScrollPosition();
    
    // Aggiornamento ottimistico immediato
    setOptimisticUpdates(prev => ({
      ...prev,
      [notificationId]: { isReadByUser: !isRead }
    }));
    
    toggleReadUnread(notificationId, !isRead)
      .then(() => {
        // Rimuovi l'aggiornamento ottimistico quando l'operazione è completata
        setOptimisticUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[notificationId];
          return newUpdates;
        });

        // Aggiorna il conteggio archiviate se necessario
        const notification = notifications.find(n => n.notificationId === notificationId);
        if (notification && (notification.archived === 1 || notification.archived === true)) {
          const newCount = !isRead ? archivedUnreadCount - 1 : archivedUnreadCount + 1;
          setArchivedUnreadCount(Math.max(0, newCount));
        }
        
        restoreScrollPosition();
      })
      .catch((error) => {
        console.error("Error toggling read status:", error);
        // Rimuovi l'aggiornamento ottimistico in caso di errore
        setOptimisticUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[notificationId];
          return newUpdates;
        });
      });
  };

  const handleToggleFavorite = (notificationId, currentFavoriteStatus, e) => {
    e.stopPropagation();
    saveScrollPosition();
    
    // Aggiornamento ottimistico immediato
    setOptimisticUpdates(prev => ({
      ...prev,
      [notificationId]: { favorite: !currentFavoriteStatus }
    }));
    
    toggleFavorite(notificationId, !currentFavoriteStatus)
      .then(() => {
        // Rimuovi l'aggiornamento ottimistico
        setOptimisticUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[notificationId];
          return newUpdates;
        });
        
        restoreScrollPosition();
      })
      .catch((error) => {
        console.error("Error toggling favorite:", error);
        // Rimuovi l'aggiornamento ottimistico in caso di errore
        setOptimisticUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[notificationId];
          return newUpdates;
        });
      });
  };

  const handleTogglePin = (notificationId, currentPinnedStatus, e) => {
    e.stopPropagation();
    saveScrollPosition();
    
    const newPinnedStatus = !currentPinnedStatus;

    if (newPinnedStatus) {
      // Animazione per il pin
      setAnimatingItemId(notificationId);
      setAnimationPhase("exit");

      animationTimeoutRef.current = setTimeout(() => {
        // Aggiornamento ottimistico
        setOptimisticUpdates(prev => ({
          ...prev,
          [notificationId]: { pinned: true }
        }));
        
        setAnimationPhase("enter");

        togglePin(notificationId, newPinnedStatus)
          .then(() => {
            animationTimeoutRef.current = setTimeout(() => {
              setAnimatingItemId(null);
              setAnimationPhase(null);
              
              // Rimuovi l'aggiornamento ottimistico
              setOptimisticUpdates(prev => {
                const newUpdates = { ...prev };
                delete newUpdates[notificationId];
                return newUpdates;
              });
              
              restoreScrollPosition();
            }, 600);
          })
          .catch((error) => {
            console.error("Error pinning notification:", error);
            setAnimatingItemId(null);
            setAnimationPhase(null);
            // Rimuovi l'aggiornamento ottimistico
            setOptimisticUpdates(prev => {
              const newUpdates = { ...prev };
              delete newUpdates[notificationId];
              return newUpdates;
            });
          });
      }, 400);
    } else {
      // Aggiornamento ottimistico per unpin
      setOptimisticUpdates(prev => ({
        ...prev,
        [notificationId]: { pinned: false }
      }));
      
      togglePin(notificationId, newPinnedStatus)
        .then(() => {
          // Rimuovi l'aggiornamento ottimistico
          setOptimisticUpdates(prev => {
            const newUpdates = { ...prev };
            delete newUpdates[notificationId];
            return newUpdates;
          });
          
          restoreScrollPosition();
        })
        .catch((error) => {
          console.error("Error unpinning notification:", error);
          // Rimuovi l'aggiornamento ottimistico
          setOptimisticUpdates(prev => {
            const newUpdates = { ...prev };
            delete newUpdates[notificationId];
            return newUpdates;
          });
        });
    }
  };

  const handleToggleMute = (notificationId, shouldMute, e) => {
    e.stopPropagation();

    if (shouldMute) {
      swal
        .fire({
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
        })
        .then((result) => {
          if (result.isConfirmed) {
            toggleMuteChat(notificationId, true, result.value);
          }
        });
    } else {
      toggleMuteChat(notificationId, false);
    }
  };

  const handleArchiveNotification = (notificationId, e) => {
    e.stopPropagation();
    saveScrollPosition();

    // Aggiornamento ottimistico
    setOptimisticUpdates(prev => ({
      ...prev,
      [notificationId]: { archived: 1 }
    }));

    archiveChat(notificationId).then((result) => {
      if (result && result.success) {
        // Rimuovi l'aggiornamento ottimistico
        setOptimisticUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[notificationId];
          return newUpdates;
        });
      }
    }).catch(() => {
      // Rimuovi l'aggiornamento ottimistico in caso di errore
      setOptimisticUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[notificationId];
        return newUpdates;
      });
    });
  };

  const handleUnarchiveNotification = (notificationId, e) => {
    e.stopPropagation();
    saveScrollPosition();

    // Aggiornamento ottimistico
    setOptimisticUpdates(prev => ({
      ...prev,
      [notificationId]: { archived: 0 }
    }));

    unarchiveChat(notificationId).then((result) => {
      if (result && result.success) {
        // Rimuovi l'aggiornamento ottimistico
        setOptimisticUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[notificationId];
          return newUpdates;
        });
      }
    }).catch(() => {
      // Rimuovi l'aggiornamento ottimistico in caso di errore
      setOptimisticUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[notificationId];
        return newUpdates;
      });
    });
  };

  const handleOpenNewMessageModal = () => {
    document.dispatchEvent(new CustomEvent("openNewMessageModal"));
  };

  const handleSearchChange = (event) => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);
    
    // Se il campo è vuoto, torna alla visualizzazione normale
    if (!newSearchTerm || newSearchTerm.trim() === "") {
      setIsApiSearch(false);
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    // Implementa debouncing per la ricerca API
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performApiSearch(newSearchTerm);
    }, 500); // Attendi 500ms prima di cercare
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setIsApiSearch(false);
    setSearchResults([]);
    setSearchError(null);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  // ref per il timeout della ricerca
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleDocumentsSearchChange = (event) => {
    setDocumentsSearchTerm(event.target.value);
  };

  const handleClearDocumentsSearch = () => {
    setDocumentsSearchTerm("");
    setDocumentsSearchResults([]);
  };

  const handleCategoryChange = (event) => {
    const selectedValue = event.target.value;
    setSelectedCategory(selectedValue);

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
    setCompletedFilter(value);
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
    setFilterArchivedChats(!filterArchivedChats);
  };

  const handleOpenWiki = (e) => {
    e.stopPropagation();
    openWiki("notifications", true);
  };

const resetAllFilters = () => {
    setFilterMentioned(false);
    setFilterMessagesSent(false);
    setShowUnreadOnly(false);
    setSearchTerm("");
    setSelectedCategory("all");
    setFilterFavorites(false);
    setCompletedFilter("all");
    setFilterLeftChats(false);
    setFilterArchivedChats(false);
    setFilterMutedChats(false);
    
    // Reset anche la ricerca API
    setIsApiSearch(false);
    setSearchResults([]);
    setSearchError(null);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  // Document search functions
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

      let searchValue = "";
      if (documentTab === "customers" || documentTab === "suppliers") {
        searchValue = document.DocumentNumber;
      } else if (["SaleOrd", "PurchaseOrd", "SaleDoc", "PurchaseDoc", "MO"].includes(documentTab)) {
        searchValue = document.DocumentId.toString();
      } else if (documentTab === "BOM") {
        searchValue = document.DocumentNumber;
      } else if (documentTab === "Item") {
        searchValue = document.DocumentNumber;
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

  // Effects
  useEffect(() => {
    if (visible === true) {
      forceLoadNotifications();
    }
  }, [visible]);

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

  // Ripristina lo scroll dopo gli aggiornamenti
  useEffect(() => {
    restoreScrollPosition();
  }, [filteredNotifications]);

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
    const handleNotificationsUpdated = () => {
      if (visible) {
        forceLoadNotifications();
      }
    };

    const handleNewMessage = (event) => {
      if (visible && event.detail && event.detail.notificationId) {
        fetchNotificationById(event.detail.notificationId);
      }
    };

    document.addEventListener("notifications-updated", handleNotificationsUpdated);
    document.addEventListener("new-message-received", handleNewMessage);

    return () => {
      document.removeEventListener("notifications-updated", handleNotificationsUpdated);
      document.removeEventListener("new-message-received", handleNewMessage);
    };
  }, [visible, forceLoadNotifications, fetchNotificationById]);

  useEffect(() => {
    const handleTitleUpdate = (event) => {
      const { notificationId, newTitle } = event.detail;

      // Usa aggiornamento ottimistico per il titolo
      setOptimisticUpdates(prev => ({
        ...prev,
        [parseInt(notificationId)]: { title: newTitle }
      }));

      // Dopo un breve delay rimuovi l'aggiornamento ottimistico
      // (quando Redux avrà aggiornato lo stato)
      setTimeout(() => {
        setOptimisticUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[parseInt(notificationId)];
          return newUpdates;
        });
      }, 1000);
    };

    document.addEventListener("chat-title-updated", handleTitleUpdate);

    return () => {
      document.removeEventListener("chat-title-updated", handleTitleUpdate);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // Ottieni le categorie uniche
  const uniqueCategories = Object.values(
    notifications.reduce((acc, notification) => {
      if (!acc[notification.notificationCategoryId]) {
        acc[notification.notificationCategoryId] = {
          id: notification.notificationCategoryId,
          name: notification.notificationCategoryName,
          color: notification.hexColor,
        };
      }
      return acc;
    }, {}),
  );

  return (
    <div
      className={`notification-sidebar ${visible ? "show" : "hide"}`}
      id="notification-sidebar"
      ref={sidebarRef}
    >
      <div className="header" style={{ height: isFilterExpanded ? "9rem" : "9rem" }}>
        <div className="flex justify-between items-center p-2">
          <div className="text-lg font-semibold" id="notification-sidebar-title">
            Notifiche
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
                type="text"
                placeholder={isSearching ? "Ricerca in corso..." : "Cerca notifiche..."}
                value={searchTerm}
                onChange={handleSearchChange}
                className={`w-full p-2 pl-9 pr-9 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isSearching ? "bg-gray-50" : ""
                } ${searchError ? "border-red-500" : ""}`}
                id="notification-search-input"
                disabled={isSearching}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none w-100 justify-content-end px-2.5">
                {isSearching ? (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-gray-400" />
                )}
              </div>
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  id="notification-search-clear"
                  disabled={isSearching}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* NUOVO: Mostra indicatori di stato della ricerca */}
            {isApiSearch && (
              <div className="text-xs mt-1 px-1">
                {searchError ? (
                  <span className="text-red-600 flex items-center">
                    <X className="w-3 h-3 mr-1" />
                    {searchError}
                  </span>
                ) : (
                  <span className="text-blue-600 flex items-center">
                    <Search className="w-3 h-3 mr-1" />
                    {isSearching ? "Ricerca in corso..." : 
                     `${searchResults.length} risultati per "${searchTerm}"`}
                  </span>
                )}
              </div>
            )}
          </div>
  
          <div className="flex items-center justify-center w-100 z-50 px-2 mb-1">
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
                value={selectedCategory}
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
                top: "95px",
                right: window.innerWidth < 768 ? "0px" : "340px",
                backgroundColor: "#ffffff",
                borderRadius: "0.5rem",
                maxHeight: "80vh",
                overflowY: "auto",
              }}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b">
                <h3 className="text-sm font-semibold">Filtri notifiche</h3>
                <button
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  onClick={toggleFilterExpansion}
                  id="notification-filter-close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
  
              <div className="mb-4">
                <DoNotDisturbToggle />
              </div>
  
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-500 mb-2">Filtri principali</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                      showUnreadOnly ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50 border border-transparent"
                    }`}
                    onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                  >
                    <input
                      type="checkbox"
                      id="notification-unread-switch"
                      checked={showUnreadOnly}
                      onChange={(e) => {
                        e.stopPropagation();
                        setShowUnreadOnly(e.target.checked);
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor="notification-unread-switch"
                      className="text-sm cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Solo non lette
                    </label>
                  </div>
  
                  <div
                    className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                      filterFavorites ? "bg-yellow-50 border border-yellow-200 text-yellow-700" : "hover:bg-gray-50 border border-transparent text-gray-700"
                    }`}
                    onClick={() => setFilterFavorites(!filterFavorites)}
                    id="notification-favorites-filter"
                  >
                    <Star className={`w-4 h-4 ${filterFavorites ? "fill-yellow-500 text-yellow-500" : ""}`} />
                    <span className="text-sm">Preferiti</span>
                  </div>
                </div>
              </div>
  
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-500 mb-2">Tipo di notifiche</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                      filterMentioned ? "bg-indigo-50 border border-indigo-200 text-indigo-700" : "hover:bg-gray-50 border border-transparent text-gray-700"
                    }`}
                    onClick={() => setFilterMentioned(!filterMentioned)}
                    id="notification-mentioned-filter"
                  >
                    <AtSign className="w-4 h-4" />
                    <span className="text-sm">Menzioni</span>
                  </div>
  
                  <div
                    className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                      filterMessagesSent ? "bg-green-50 border border-green-200 text-green-700" : "hover:bg-gray-50 border border-transparent text-gray-700"
                    }`}
                    onClick={() => setFilterMessagesSent(!filterMessagesSent)}
                    id="notification-sent-filter"
                  >
                    <Send className="w-4 h-4" />
                    <span className="text-sm">Miei messaggi</span>
                  </div>
                </div>
              </div>
  
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-500 mb-2">Stato</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                      filterLeftChats ? "bg-amber-50 border border-amber-200 text-amber-700" : "hover:bg-gray-50 border border-transparent text-gray-700"
                    }`}
                    onClick={() => setFilterLeftChats(!filterLeftChats)}
                    id="notification-left-chats-filter"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Abbandonate</span>
                  </div>
  
                  <div
                    className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                      filterArchivedChats ? "bg-purple-50 border border-purple-200 text-purple-700" : "hover:bg-gray-50 border border-transparent text-gray-700"
                    }`}
                    onClick={handleToggleArchivedFilter}
                    id="notification-archived-chats-filter"
                  >
                    <Archive className="w-4 h-4" />
                    <span className="text-sm">Archiviate</span>
                    {archivedUnreadCount > 0 && !filterArchivedChats && (
                      <span className="flex items-center justify-center ml-1 bg-red-500 text-white text-xs font-semibold h-5 w-5 rounded-full">
                        {archivedUnreadCount}
                      </span>
                    )}
                  </div>
  
                  <div
                    className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                      filterMutedChats ? "bg-rose-50 border border-rose-200 text-rose-700" : "hover:bg-gray-50 border border-transparent text-gray-700"
                    }`}
                    onClick={() => setFilterMutedChats(!filterMutedChats)}
                    id="notification-muted-filter"
                  >
                    <BellOff className="w-4 h-4" />
                    <span className="text-sm">Silenziate</span>
                  </div>
                </div>
              </div>
  
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 mb-2 block">Stato completamento</label>
                <div className="flex justify-between bg-white border border-gray-200 rounded-lg p-0.5" id="notification-completion-filter">
                  <button
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      completedFilter === "all" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                    }`}
                    onClick={() => handleCompletedFilterChange("all")}
                    id="notification-filter-all"
                  >
                    Tutte
                  </button>
                  <button
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      completedFilter === "active" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                    }`}
                    onClick={() => handleCompletedFilterChange("active")}
                    id="notification-filter-active"
                  >
                    Attive
                  </button>
                  <button
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      completedFilter === "completed" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                    }`}
                    onClick={() => handleCompletedFilterChange("completed")}
                    id="notification-filter-completed"
                  >
                    Completate
                  </button>
                </div>
              </div>
  
              <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                <button
                  className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg"
                  onClick={resetAllFilters}
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
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
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
  
          <div className="mt-3" style={{ height: "50vh", overflowY: "auto" }}>
            {documentsSearchResults.length > 0 && (
              <div className="mb-3" style={{ height: "50vh", overflowY: "auto" }}>
                <h4 className="text-xs font-medium text-gray-600 mb-2">
                  Documenti trovati ({documentsSearchResults.length})
                </h4>
                <div className="space-y-2 overflow-y-auto pr-1 documents-list">
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
  
            {selectedDocument && (
              <div className="mt-4">
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
        </div>
      )}
  
      <div className="notifications-list" ref={notificationBarRef} id="notification-list-container">
        {!isDocumentSearchVisible &&
          (filteredNotifications && filteredNotifications.length > 0 ? (
            (() => {
              const uniqueIds = new Set();
              const uniqueNotifications = filteredNotifications.filter(notification => {
                if (uniqueIds.has(notification.notificationId)) {
                  console.error(`Trovata notifica duplicata con ID: ${notification.notificationId}`);
                  return false;
                }
                uniqueIds.add(notification.notificationId);
                return true;
              });
              
              return uniqueNotifications.map((notification) => {
                const messages = parseMessages(notification.messages);
                const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
                const categoryColor = notification.hexColor;
                const hasLeftChat = notification.chatLeft === 1 || notification.chatLeft === true;
                const isArchived = notification.archived === 1 || notification.archived === true;
  
                return (
                  <div
                    key={`notification-${notification.notificationId}`}
                    className={`notification-item ${notification.isReadByUser ? "read" : "unread"} ${notification.isClosed ? "isClosed" : ""} ${hasLeftChat ? "chat-left" : ""} ${isArchived ? "archived" : ""}
                            ${animatingItemId === notification.notificationId && animationPhase === "exit" ? "pin-exit-active" : ""}
                            ${animatingItemId === notification.notificationId && animationPhase === "enter" ? "pin-enter-active" : ""}`}
                    onClick={(e) => handleNotificationClick(notification, e)}
                    id={`notification-item-${notification.notificationId}`}
                    data-notification-id={notification.notificationId}
                    data-is-read={notification.isReadByUser ? "true" : "false"}
                    data-is-pinned={notification.pinned ? "true" : "false"}
                    data-is-closed={notification.isClosed ? "true" : "false"}
                    data-has-left={hasLeftChat ? "true" : "false"}
                    data-is-archived={isArchived ? "true" : "false"}
                  >
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
                    ></div>
                  </div>
                );
              });
            })()
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-gray-500" id="notification-empty-state">
              <div className="mb-3 w-16 h-16 flex items-center justify-center rounded-full bg-gray-100">
                <Filter className="w-8 h-8 text-gray-400" />
              </div>
              <p className="mb-2">Nessuna notifica corrisponde ai filtri selezionati</p>
              <button
                className="mt-2 text-sm text-blue-600 hover:underline"
                onClick={resetAllFilters}
                id="notification-reset-filters"
              >
                Reimposta tutti i filtri
              </button>
            </div>
          ))}
      </div>

      <style>
        {`
          .notification-item.archived .notification-title {
            color: #9333ea;
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
        `}
      </style>
    </div>
  );
};

export default NotificationSidebar;