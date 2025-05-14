import React, { useRef, useEffect, useState } from 'react';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';
import { Switch } from './ui/switch';
import { swal } from '../lib/common';
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
  ExternalLink
} from 'lucide-react';
import { useWikiContext } from './wiki/WikiContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import './ui/ui.css';
import DoNotDisturbToggle from './chat/DoNotDisturbToggle';
import axios from 'axios';
import { config } from '../config';

const NotificationSidebar = ({
  closeSidebar,
  visible,
  openChatModal,
}) => {
  // Utilizziamo il hook di Redux invece del context
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
  } = useNotifications();


  const [filterMentioned, setFilterMentioned] = useState(false);
  const [filterMessagesSent, setFilterMessagesSent] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [completedFilter, setCompletedFilter] = useState('all'); // 'all', 'completed', 'active'
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [selectBackgroundColor, setSelectBackgroundColor] = useState('#ffffff');
  const [animatingItemId, setAnimatingItemId] = useState(null);
  const [animationPhase, setAnimationPhase] = useState(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  // Filtro per le chat abbandonate
  const [filterLeftChats, setFilterLeftChats] = useState(false);
  // Filtro per le chat archiviate
  const [filterArchivedChats, setFilterArchivedChats] = useState(false);
  // Filtro per le chat silenziate
  const [filterMutedChats, setFilterMutedChats] = useState(false);
  // Stato per gestire la visibilità della sezione documenti
  const [isDocumentSearchVisible, setIsDocumentSearchVisible] = useState(false);
  // Conteggio delle notifiche archiviate non lette
  const [archivedUnreadCount, setArchivedUnreadCount] = useState(0);

  // Nuovi stati per la ricerca di chat legate a documenti
  const [documentTab, setDocumentTab] = useState('customers'); // Tipo di documento attivo
  const [documentsSearchTerm, setDocumentsSearchTerm] = useState('');
  const [documentsSearchResults, setDocumentsSearchResults] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentChats, setDocumentChats] = useState([]);
  const [documentChatsLoading, setDocumentChatsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isDocTypesOpen, setIsDocTypesOpen] = useState(false);

  // Tipi di documento disponibili per la ricerca
  const documentTypes = [
    { id: 'customers', label: 'Clienti', icon: <User size={16} /> },
    { id: 'suppliers', label: 'Fornitori', icon: <Truck size={16} /> }, 
    { id: 'SaleOrd', label: 'Ordini Cliente', icon: <ShoppingCart size={16} /> },
    { id: 'SaleDoc', label: 'Documenti Vendita', icon: <FileText size={16} /> },
    { id: 'PurchaseOrd', label: 'Ordini Fornitore', icon: <FileBox size={16} /> }, 
    { id: 'PurchaseDoc', label: 'Documenti Acquisto', icon: <FileText size={16} /> }, 
    { id: 'MO', label: 'Ordini Produzione', icon: <Clipboard size={16} /> },
    { id: 'BOM', label: 'Distinte Base', icon: <Link size={16} /> },
    { id: 'Item', label: 'Articoli', icon: <Tag size={16} /> }
  ];

  
  // Aggiungi un effetto per forzare il caricamento quando la sidebar diventa visibile
  useEffect(() => {
    // Forza il caricamento quando la sidebar diventa visibile
    if (visible === true) {
      forceLoadNotifications();
    }
  }, [visible]);

  // Effetto per calcolare il conteggio delle notifiche archiviate non lette
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const count = notifications.filter(notification => 
        (notification.archived === 1 || notification.archived === true) && 
        !notification.isReadByUser
      ).length;
      setArchivedUnreadCount(count);
    }
  }, [notifications]);

  // Funzione per filtrare le notifiche
  const filterNotifications = () => {
    // Prima filtra in base ai criteri di ricerca
    const filtered = (notifications || []).filter(notification => {
      // Gestione delle notifiche archiviate
      const isArchived = notification.archived === 1 || notification.archived === true;
      
      // Se filterArchivedChats è attivo, mostra SOLO le notifiche archiviate
      // Se filterArchivedChats NON è attivo, mostra SOLO le notifiche NON archiviate
      if (filterArchivedChats && !isArchived) {
        return false;
      }
      if (!filterArchivedChats && isArchived) {
        return false;
      }
      
      if (filterMentioned && !notification.isMentioned) {
        return false;
      }
      if (filterMessagesSent && !notification.messagesSent) {
        return false;
      }
      if (showUnreadOnly && notification.isReadByUser) {
        return false;
      }
      if (filterFavorites && !notification.favorite) {
        return false;
      }
      if (selectedCategory !== 'all' && notification.notificationCategoryId.toString() !== selectedCategory) {
        return false;
      }
      // Filtra per stato completato/chiuso
      if (completedFilter === 'completed' && !notification.isClosed) {
        return false;
      }
      if (completedFilter === 'active' && notification.isClosed) {
        return false;
      }
      // Filtro per chat abbandonate
      if (filterLeftChats && notification.chatLeft !== 1) {
        return false;
      }
      // Filtro per chat silenziate
      if (filterMutedChats && !isNotificationMuted(notification)) {
        return false;
      }
      
      if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const messages = parseMessages(notification.messages);
        if (!notification.title.toLowerCase().includes(lowerSearchTerm) &&
            !messages.some(message => message.message && message.message.toLowerCase().includes(lowerSearchTerm))) {
          return false;
        }
      }
      return true;
    });
  
    // Poi ordina il risultato: prima per pin, poi per data
    const sortedFiltered = [...filtered].sort((a, b) => {
      // Prima le notifiche con pin
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      
      // Poi per data di creazione/ultimo messaggio (più recenti in alto)
      // Ottieni l'ultima data di messaggio o usa la data di creazione
      const messagesA = parseMessages(a.messages);
      const messagesB = parseMessages(b.messages);
      
      const lastMessageA = messagesA.length > 0 ? messagesA[messagesA.length - 1] : null;
      const lastMessageB = messagesB.length > 0 ? messagesB[messagesB.length - 1] : null;
      
      const dateA = lastMessageA ? new Date(lastMessageA.tbCreated) : new Date(a.tbCreated || 0);
      const dateB = lastMessageB ? new Date(lastMessageB.tbCreated) : new Date(b.tbCreated || 0);
      
      return dateB - dateA; // Ordine discendente (più recenti prima)
    });
  
    // Aggiorna lo stato con le notifiche filtrate e ordinate
    setFilteredNotifications(sortedFiltered);
  };

  // Effetto per forzare il caricamento delle notifiche
  useEffect(() => {
    const handleNotificationsUpdated = () => {
      if (visible) {
        forceLoadNotifications();
        // Forza il ri-filtraggio dopo il caricamento
        setTimeout(filterNotifications, 300);
      }
    };
    
    // Ascolta anche i nuovi messaggi
    const handleNewMessage = (event) => {
      if (visible && event.detail && event.detail.notificationId) {
        fetchNotificationById(event.detail.notificationId)
          .then(() => {
            // Forza il ri-filtraggio delle notifiche
            filterNotifications();
          });
      }
    };
    
    document.addEventListener('notifications-updated', handleNotificationsUpdated);
    document.addEventListener('new-message-received', handleNewMessage);
    
    return () => {
      document.removeEventListener('notifications-updated', handleNotificationsUpdated);
      document.removeEventListener('new-message-received', handleNewMessage);
    };
  }, [visible, forceLoadNotifications, fetchNotificationById]);
  
  // Aggiungi un effetto per verificare la visibilità della sidebar
  useEffect(() => {
    const sidebarElement = document.querySelector('.notification-sidebar');
    if (sidebarElement) {
      // Verifica se le classi CSS corrispondono allo stato 'visible'
      const hasShowClass = sidebarElement.classList.contains('show');
      if (visible && !hasShowClass) {
        sidebarElement.classList.add('show');
        sidebarElement.classList.remove('hide');
      } else if (!visible && hasShowClass) {
        sidebarElement.classList.remove('show');
        sidebarElement.classList.add('hide');
      }
    }
  }, [visible]);
  
  const animationTimeoutRef = useRef(null);
  const sidebarRef = useRef(null);
  const filterExpandedRef = useRef(null); // Aggiungiamo ref per il pannello filtri espanso
  
  // Aggiungiamo l'hook per il contesto Wiki
  const { openWiki } = useWikiContext();

  // Inizializza le notifiche filtrate all'avvio
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      // All'inizio, mostra solo le notifiche NON archiviate
      const nonArchivedNotifications = notifications.filter(notification => 
        !(notification.archived === 1 || notification.archived === true)
      );
      setFilteredNotifications(nonArchivedNotifications);
    } else {
      setFilteredNotifications([]);
    }
  }, [notifications]);
  
  // Effetto per filtrare le notifiche ogni volta che cambiano o cambia un filtro
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const timer = setTimeout(() => {
        filterNotifications();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [
    notifications, 
    filterMentioned, 
    filterMessagesSent, 
    showUnreadOnly, 
    searchTerm, 
    selectedCategory, 
    filterFavorites,
    completedFilter,
    filterLeftChats,
    filterArchivedChats,
    filterMutedChats
  ]);

  // Effetto per gestire il click fuori dai filtri espansi e chiuderli
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Se i filtri sono espansi e il click è fuori dal pannello dei filtri
      if (isFilterExpanded && filterExpandedRef.current && !filterExpandedRef.current.contains(event.target)) {
        // Verifichiamo anche che non sia il pulsante dei filtri
        const filterToggleButton = document.getElementById('notification-filter-toggle');
        if (!filterToggleButton?.contains(event.target)) {
          setIsFilterExpanded(false);
        }
      }
      
      // Gestisci click fuori dai tipi documento
      if (isDocTypesOpen && !event.target.closest('.document-type-dropdown')) {
        setIsDocTypesOpen(false);
      }
    };

    // Aggiungi l'event listener solo quando i filtri sono espansi
    if (isFilterExpanded || isDocTypesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterExpanded, isDocTypesOpen]);

  // Effetto per chiudere i filtri quando la sidebar viene chiusa
  useEffect(() => {
    if (!visible && isFilterExpanded) {
      setIsFilterExpanded(false);
    }
    if (!visible && isDocumentSearchVisible) {
      setIsDocumentSearchVisible(false);
    }
  }, [visible]);


  // Aggiungi anche questo useEffect per gestire la chiusura del dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDocTypesOpen && !event.target.closest('.document-type-dropdown')) {
        setIsDocTypesOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDocTypesOpen]);

  // Handler per il pulsante Wiki nella sidebar
  const handleOpenWiki = (e) => {
    e.stopPropagation();
    openWiki('notifications', true); // Specifichiamo che stiamo aprendo dalla sidebar notifiche
  };
  
  const parseMessages = (messages) => {
    if (!messages) return [];
    if (typeof messages === 'string') {
      try {
        return JSON.parse(messages);
      } catch (error) {
        console.error('Error parsing messages:', error);
        return [];
      }
    }
    return messages;
  };

  // Funzione per cercare documenti in base al tipo e termine di ricerca
  const searchDocuments = async () => {
    if (!documentsSearchTerm.trim() || documentsSearchTerm.trim().length < 2) return;
    
    setDocumentsLoading(true);
    setDocumentsSearchResults([]);
    setSelectedDocument(null);
    
    try {
      const token = localStorage.getItem('token');
      const searchType = documentTab === 'customers' ? 'Customer' : 
                        documentTab === 'suppliers' ? 'Supplier' : documentTab;
      
      const response = await axios.get(
        `${config.API_BASE_URL}/documents/search?documentType=${searchType}&searchTerm=${encodeURIComponent(documentsSearchTerm)}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      if (response.data.success) {
        setDocumentsSearchResults(response.data.data || []);
      } else {
        console.warn('Document search failed:', response.data.message);
      }
    } catch (error) {
      console.error('Error searching documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };
  
  // Funzione per cercare chat legate a un documento
  const searchChatsByDocument = async (document) => {
    setSelectedDocument(document);
    setDocumentChatsLoading(true);
    setDocumentChats([]);
    
    try {
      const token = localStorage.getItem('token');
      const searchType = documentTab === 'customers' ? 'Customer' : 
                        documentTab === 'suppliers' ? 'Supplier' : documentTab;
      
      // Costruisci il valore di ricerca in base al tipo di documento
      let searchValue = '';
      if (documentTab === 'customers' || documentTab === 'suppliers') {
        searchValue = document.DocumentNumber; // CustSuppCode
      } else if (['SaleOrd', 'PurchaseOrd', 'SaleDoc', 'PurchaseDoc', 'MO'].includes(documentTab)) {
        searchValue = document.DocumentId.toString();
      } else if (documentTab === 'BOM') {
        searchValue = document.DocumentNumber; // BOM code
      } else if (documentTab === 'Item') {
        searchValue = document.DocumentNumber; // Item code
      }
      
      const response = await axios.get(
        `${config.API_BASE_URL}/chats/by-document?searchType=${searchType}&searchValue=${encodeURIComponent(searchValue)}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      if (response.data.success) {
        setDocumentChats(response.data.data || []);
      } else {
        console.warn('Chat search failed:', response.data.message);
      }
    } catch (error) {
      console.error('Error searching chats by document:', error);
    } finally {
      setDocumentChatsLoading(false);
    }
  };
  
  // Funzione per aprire una chat in modalità sola lettura
  const openChatInReadOnlyMode = async (notificationId) => {
    try {
      setDocumentChatsLoading(true);
      const token = localStorage.getItem('token');
      // Prima aggiungi l'utente in modalità sola lettura
      const response = await axios.post(
        `${config.API_BASE_URL}/chats/${notificationId}/read-only-access`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      if (response.data.success) {
        // Se l'utente è stato aggiunto con successo o già ha accesso
        // Poi apri la chat
        openChatModal(notificationId);
      } else {
        console.error('Failed to gain read-only access:', response.data.message);
      }
    } catch (error) {
      console.error('Error opening chat in read-only mode:', error);
    } finally {
      setDocumentChatsLoading(false);
    }
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

  const notificationBarRef = useRef(null);
  const scrollPosition = useRef(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (notificationBarRef.current) {
      scrollPosition.current = notificationBarRef.current.scrollTop;
    }

    const restoreScrollPosition = () => {
      if (notificationBarRef.current) {
        notificationBarRef.current.scrollTop = scrollPosition.current;
      }
    };

    setTimeout(restoreScrollPosition, 0);
  }, [filteredNotifications]);

  const handleOpenChat = (notificationId) => {
    // Solo se la notifica esiste
    if (notificationId) {
      // Non è necessario chiudere la sidebar quando si apre una chat
      // Questo permette di avere sia la sidebar che la chat aperte contemporaneamente
      openChatModal(notificationId);
    }
  };

  const handleNotificationClick = (notification, e) => {
    // Ferma la propagazione dell'evento per evitare che il click arrivi al document
    // e venga interpretato come un click outside
    e.stopPropagation();
    
    // Rendi la funzione più robusta
    if (notification && notification.notificationId && openChatModal) {
      // Prova con piccolo delay per assicurarti che eventuali altri eventi siano completati
      setTimeout(() => {
        openChatModal(notification.notificationId);
      }, 100);
    } else {
      console.error('Impossibile aprire la chat - parametri mancanti:', { 
        hasNotification: !!notification, 
        hasNotificationId: !!(notification && notification.notificationId), 
        hasOpenChatModal: !!openChatModal 
      });
    }
  };

  const handleOpenNewMessageModal = () => {
    setIsModalOpen(true);
    // Eventiamo un custom event che verrà gestito dal MainPage
    document.dispatchEvent(new CustomEvent('openNewMessageModal'));
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleDocumentsSearchChange = (event) => {
    setDocumentsSearchTerm(event.target.value);
  };

  const handleClearDocumentsSearch = () => {
    setDocumentsSearchTerm('');
    setDocumentsSearchResults([]);
  };

  const handleCategoryChange = (event) => {
    const selectedValue = event.target.value;
    setSelectedCategory(selectedValue);
    
    if (selectedValue === 'all') {
      setSelectBackgroundColor('#ffffff');
    } else {
      const selectedCategory = uniqueCategories.find(category => category.id.toString() === selectedValue);
      if (selectedCategory) {
        setSelectBackgroundColor(selectedCategory.color);
      }
    }
  };

  const handleCompletedFilterChange = (value) => {
    setCompletedFilter(value);
  };
  
  // Toggle between expanded and collapsed filter panel
  const toggleFilterExpansion = () => {
    setIsFilterExpanded(!isFilterExpanded);
  };

  // Toggle document search visibility
  const toggleDocumentSearch = () => {
    setIsDocumentSearchVisible(!isDocumentSearchVisible);
    if (!isDocumentSearchVisible) {
      // Reset document search when opening
      setDocumentsSearchTerm('');
      setDocumentsSearchResults([]);
      setSelectedDocument(null);
      setDocumentChats([]);
    }
  };

  // Handle archiving a notification
  const handleArchiveNotification = (notificationId, e) => {
    e.stopPropagation(); // Don't open the chat
    
    archiveChat(notificationId).then(result => {
      if (result && result.success) {
        // The state will be updated by Redux
      }
    });
  };

  // Handle unarchiving a notification
  const handleUnarchiveNotification = (notificationId, e) => {
    e.stopPropagation(); // Don't open the chat
    
    unarchiveChat(notificationId).then(result => {
      if (result && result.success) {
        // The state will be updated by Redux
      }
    });
  };

  // Ottieni le categorie uniche delle notifiche
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
    }, {})
  );

  // Funzione per gestire l'aggiornamento del pin
  const handleTogglePin = (notificationId, currentPinnedStatus, e) => {
    // Ferma la propagazione per evitare l'apertura della chat
    e.stopPropagation();
    
    // Ottimistic UI update
    const newPinnedStatus = !currentPinnedStatus;
    
    // Se stiamo pinnando (non spinnando), avviamo l'animazione
    if (newPinnedStatus) {
      // Prima fase: l'elemento esce verso destra
      setAnimatingItemId(notificationId);
      setAnimationPhase('exit');
      
      // Impostiamo un timer per la seconda fase (entrata da sinistra)
      animationTimeoutRef.current = setTimeout(() => {
        // Esegui il riordinamento
        togglePin(notificationId, newPinnedStatus)
          .then(() => {
            // Filtriamo e riordiniamo le notifiche
            filterNotifications();
            
            // Seconda fase: l'elemento entra da sinistra
            setAnimationPhase('enter');
            
            // Puliamo l'animazione dopo che è completata
            animationTimeoutRef.current = setTimeout(() => {
              setAnimatingItemId(null);
              setAnimationPhase(null);
            }, 600);
          })
          .catch((error) => {
            console.error('Error pinning notification:', error);
            setAnimatingItemId(null);
            setAnimationPhase(null);
            
            setFilteredNotifications((prevNotifications) =>
              prevNotifications.map((notification) =>
                notification.notificationId === notificationId
                  ? { ...notification, pinned: currentPinnedStatus }
                  : notification
              )
            );
          });
      }, 400);
    } else {
      setFilteredNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification.notificationId === notificationId
            ? { ...notification, pinned: newPinnedStatus }
            : notification
        )
      );
      
      togglePin(notificationId, newPinnedStatus)
        .then(() => {
          filterNotifications();
        })
        .catch(() => {
          setFilteredNotifications((prevNotifications) =>
            prevNotifications.map((notification) =>
              notification.notificationId === notificationId
                ? { ...notification, pinned: currentPinnedStatus }
                : notification
            )
          );
        });
    }
  };

  // Funzione per silenziare le notifiche
  const handleToggleMute = (notificationId, shouldMute, e) => {
    e.stopPropagation();
    
    if (shouldMute) {
      // Mostra dialog per scegliere la durata
      swal.fire({
        title: 'Silenzia notifiche',
        text: 'Per quanto tempo vuoi silenziare questa chat?',
        icon: 'question',
        showCancelButton: true,
        cancelButtonText: 'Annulla',
        confirmButtonText: 'Conferma',
        input: 'select',
        inputOptions: {
          '8h': '8 ore',
          '1d': '1 giorno',
          '7d': '7 giorni',
          'forever': 'Per sempre'
        },
        inputPlaceholder: 'Seleziona durata',
        inputValue: '8h'
      }).then((result) => {
        if (result.isConfirmed) {
          toggleMuteChat(notificationId, true, result.value);
        }
      });
    } else {
      // Togli il silenziamento direttamente
      toggleMuteChat(notificationId, false);
    }
  };

  // Gestisci il toggling di "preferiti" senza propagazione
  const handleToggleFavorite = (notificationId, currentFavoriteStatus, e) => {
    e.stopPropagation();
    toggleFavorite(notificationId, !currentFavoriteStatus);
  };

  // Gestisci il toggling di "letto/non letto" senza propagazione
  const handleToggleReadUnread = (notificationId, isRead, e) => {
    e.stopPropagation();
    
    // Instead of immediately applying the update to filtered notifications,
    // we should only update the specific notification's read status
    // while preserving the current filters
    
    // First find if the notification is in the current filtered set
    const notificationInView = filteredNotifications.find(
      notification => notification.notificationId === notificationId
    );
    
    // Only perform UI update if the notification is currently visible
    if (notificationInView) {
      // Update only that specific notification in the filtered set
      setFilteredNotifications(prevFilteredNotifications => 
        prevFilteredNotifications.map(notification => 
          notification.notificationId === notificationId
            ? { ...notification, isReadByUser: !isRead }
            : notification
        )
      );
    }
    
    // Then call the API to update the read status server-side
    toggleReadUnread(notificationId, !isRead).then(() => {
      // Aggiorna il conteggio delle notifiche archiviate non lette
      if (notifications && notifications.length > 0) {
        const notification = notifications.find(n => n.notificationId === notificationId);
        if (notification && (notification.archived === 1 || notification.archived === true)) {
          const newCount = !isRead 
            ? archivedUnreadCount - 1 
            : archivedUnreadCount + 1;
          setArchivedUnreadCount(Math.max(0, newCount));
        }
      }
    }).catch(error => {
      console.error('Error toggling read status:', error);
      
      // If there was an error, revert the local change only if it was in view
      if (notificationInView) {
        setFilteredNotifications(prevFilteredNotifications => 
          prevFilteredNotifications.map(notification => 
            notification.notificationId === notificationId
              ? { ...notification, isReadByUser: isRead }
              : notification
          )
        );
      }
    });
  };

  // Quando si cambia il filtro di archiviazione, invertiamo completamente la visualizzazione
  const handleToggleArchivedFilter = () => {
    setFilterArchivedChats(!filterArchivedChats);
    // Il filterNotifications() verrà chiamato attraverso l'useEffect che monitora filterArchivedChats
  };

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // Listener per l'aggiornamento del titolo della chat
  useEffect(() => {
    const handleTitleUpdate = (event) => {
      const { notificationId, newTitle } = event.detail;
      
      // Aggiorna il titolo nella lista delle notifiche
      setFilteredNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.notificationId === parseInt(notificationId)
            ? { ...notification, title: newTitle }
            : notification
        )
      );

      // Forza un aggiornamento del componente specifico dopo un breve timeout
      const notificationElement = document.getElementById(`notification-item-${notificationId}`);
      if (notificationElement) {
        // Aggiungi una classe temporanea per forzare il re-render
        notificationElement.classList.add('title-updating');
        
        // Rimuovi la classe dopo un breve timeout
        setTimeout(() => {
          notificationElement.classList.remove('title-updating');
          
          // Forza un aggiornamento del titolo specifico
          const titleElement = document.getElementById(`notification-title-${notificationId}`);
          if (titleElement) {
            titleElement.textContent = newTitle;
          }
        }, 100);
      }
    };
    
    // Aggiungi l'event listener
    document.addEventListener('chat-title-updated', handleTitleUpdate);
    
    // Pulizia
    return () => {
      document.removeEventListener('chat-title-updated', handleTitleUpdate);
    };
  }, []);

  // Aggiungi lo stile CSS per l'animazione
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .notification-item.title-updating {
        transition: background-color 0.1s ease-in-out;
        background-color: rgba(59, 130, 246, 0.05);
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div 
      className={`notification-sidebar ${visible ? 'show' : 'hide'}`} 
      id="notification-sidebar"
      ref={sidebarRef}
    >
      <div 
        className="header"
        style={{ height: isFilterExpanded ? '9rem' : '9rem' }}
      >
        <div className="flex justify-between items-center p-2">
          <div className="text-lg font-semibold" id="notification-sidebar-title">Notifiche</div>
          
          {/* Aggiungiamo il pulsante Wiki nella sidebar */}
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
          {/* Search bar */}
          <div className="px-2 mb-2 w-100">
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="Cerca notifiche..." 
                value={searchTerm} 
                onChange={handleSearchChange} 
                className="w-full p-2 pl-9 pr-9 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                id="notification-search-input"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none w-100 justify-content-end px-2.5">
                <Search className="w-4 h-4 text-gray-400" />
              </div>
              {searchTerm && (
                <button 
                  onClick={handleClearSearch} 
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  id="notification-search-clear"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Visible filters */}
          <div className="flex items-center justify-center w-100 z-50 px-2 mb-1">
            <div className="flex w-100 z-50 items-center space-x-2">
              <button
                className={`p-2 flex items-center justify-center ${isFilterExpanded ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-700'} border border-gray-200 rounded-lg hover:bg-gray-50`}
                style={{ zIndex: 100 }}
                onClick={toggleFilterExpansion}
                title="Filtri"
                id="notification-filter-toggle"
              >
                <Filter className="w-5 h-5" />
              </button>
              {/* Toggle button per la ricerca per documenti */}
              <button
                className={`archa-button z-50 flex items-center justify-center w-10 h-10 p-2 ${isDocumentSearchVisible ? 'text-blue-600 bg-blue-50' : 'text-gray-700 bg-white'} border border-gray-200 rounded-lg hover:bg-gray-50`}
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
          
          {/* Expanded filter options */}
          {isFilterExpanded && (
          <div 
            className="px-3 py-2 mb-2 bg-white rounded-lg mx-2 border border-gray-200 shadow-md" 
            id="notification-expanded-filters"
            ref={filterExpandedRef} // Aggiunto ref per controllare click fuori
            style={{ 
              zIndex: 100, 
              width: window.innerWidth < 768 ? '95vw' : 'calc(100% - 0.5rem)', 
              position: 'absolute',
              top: '95px',
              right: window.innerWidth < 768 ? '0px' : '340px',
              backgroundColor: '#ffffff',
              borderRadius: '0.5rem',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
          >
            {/* Header con titolo e pulsante di chiusura */}
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
            
            {/* Non disturbare */}
            <div className="mb-4">
              <DoNotDisturbToggle />
            </div>

            {/* Filtri di base - layout a griglia */}
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 mb-2">Filtri principali</h4>
              <div className="grid grid-cols-2 gap-2">
                {/* Filtro notifiche non lette - usando checkbox standard HTML */}
                <div 
                  className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                    showUnreadOnly ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
                  }`}
                  onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                >
                  <input 
                    type="checkbox"
                    id="notification-unread-switch"
                    checked={showUnreadOnly}
                    onChange={(e) => setShowUnreadOnly(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="notification-unread-switch" className="text-sm cursor-pointer">
                    Solo non lette
                  </label>
                </div>
                
                {/* Filtro preferiti */}
                <div 
                  className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                    filterFavorites ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' : 'hover:bg-gray-50 border border-transparent text-gray-700'
                  }`}
                  onClick={() => setFilterFavorites(!filterFavorites)}
                  id="notification-favorites-filter"
                >
                  <Star className={`w-4 h-4 ${filterFavorites ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                  <span className="text-sm">Preferiti</span>
                </div>
              </div>
            </div>
            
            {/* Filtri per tipo - layout a griglia */}
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 mb-2">Tipo di notifiche</h4>
              <div className="grid grid-cols-2 gap-2">
                {/* Filtro menzioni */}
                <div 
                  className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                    filterMentioned ? 'bg-indigo-50 border border-indigo-200 text-indigo-700' : 'hover:bg-gray-50 border border-transparent text-gray-700'
                  }`}
                  onClick={() => setFilterMentioned(!filterMentioned)}
                  id="notification-mentioned-filter"
                >
                  <AtSign className="w-4 h-4" />
                  <span className="text-sm">Menzioni</span>
                </div>
                
                {/* Filtro messaggi inviati */}
                <div 
                  className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                    filterMessagesSent ? 'bg-green-50 border border-green-200 text-green-700' : 'hover:bg-gray-50 border border-transparent text-gray-700'
                  }`}
                  onClick={() => setFilterMessagesSent(!filterMessagesSent)}
                  id="notification-sent-filter"
                >
                  <Send className="w-4 h-4" />
                  <span className="text-sm">Miei messaggi</span>
                </div>
              </div>
            </div>
            
            {/* Filtri per stato - layout a griglia */}
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 mb-2">Stato</h4>
              <div className="grid grid-cols-2 gap-2">
                {/* Filtro chat abbandonate */}
                <div 
                  className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                    filterLeftChats ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'hover:bg-gray-50 border border-transparent text-gray-700'
                  }`}
                  onClick={() => setFilterLeftChats(!filterLeftChats)}
                  id="notification-left-chats-filter"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Abbandonate</span>
                </div>
                
                {/* Filtro chat archiviate */}
                <div 
                  className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                    filterArchivedChats ? 'bg-purple-50 border border-purple-200 text-purple-700' : 'hover:bg-gray-50 border border-transparent text-gray-700'
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
                
                {/* Filtro chat silenziate */}
                <div 
                  className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
                    filterMutedChats ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'hover:bg-gray-50 border border-transparent text-gray-700'
                  }`}
                  onClick={() => setFilterMutedChats(!filterMutedChats)}
                  id="notification-muted-filter"
                >
                  <BellOff className="w-4 h-4" />
                  <span className="text-sm">Silenziate</span>
                </div>
              </div>
            </div>
            
            {/* Filtro stato completamento */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 mb-2 block">Stato completamento</label>
              <div className="flex justify-between bg-white border border-gray-200 rounded-lg p-0.5" id="notification-completion-filter">
                <button
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    completedFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => handleCompletedFilterChange('all')}
                  id="notification-filter-all"
                >
                  Tutte
                </button>
                <button
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    completedFilter === 'active' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => handleCompletedFilterChange('active')}
                  id="notification-filter-active"
                >
                  Attive
                </button>
                <button
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    completedFilter === 'completed' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => handleCompletedFilterChange('completed')}
                  id="notification-filter-completed"
                >
                  Completate
                </button>
              </div>
            </div>
            
            {/* Pulsante per reimpostare tutti i filtri */}
            <div className="mt-4 pt-3 border-t border-gray-100 text-center">
              <button 
                className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg"
                onClick={() => {
                  setShowUnreadOnly(false);
                  setFilterFavorites(false);
                  setFilterMentioned(false);
                  setFilterMessagesSent(false);
                  setSelectedCategory('all');
                  setSearchTerm('');
                  setCompletedFilter('all');
                  setFilterLeftChats(false);
                  setFilterArchivedChats(false);
                  setFilterMutedChats(false);
                }}
              >
                Reimposta tutti i filtri
              </button>
            </div>
          </div>
        )}
      </div>
    </div>


    {/* Document Search Section */}
    {isDocumentSearchVisible && (
      <div className="document-search-section bg-white border-b border-gray-200 p-3">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium">Cerca chat per documento</h3>
          <button 
            onClick={toggleDocumentSearch}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Document Type Dropdown */}
        <div className="mb-3 relative document-type-dropdown">
          <div 
            className="p-2 border rounded-lg flex justify-between items-center cursor-pointer bg-white hover:bg-gray-50"
            onClick={() => setIsDocTypesOpen(!isDocTypesOpen)}
          >
            <div className="flex items-center">
              {React.cloneElement(documentTypes.find(t => t.id === documentTab)?.icon || <Link />, { className: 'h-4 w-4 mr-2' })}
              <span className="text-sm">{documentTypes.find(t => t.id === documentTab)?.label || 'Seleziona categoria'}</span>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isDocTypesOpen ? 'rotate-180' : ''}`} />
          </div>
          
          {/* Dropdown menu */}
          {isDocTypesOpen && (
            <div className="absolute left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 document-type-menu max-h-48 overflow-y-auto">
              {documentTypes.map(type => (
                <button
                  key={type.id}
                  className={`w-full flex items-center py-2 px-3 text-sm hover:bg-gray-50 ${
                    documentTab === type.id ? 'bg-blue-50 text-blue-600 font-medium' : ''
                  }`}
                  onClick={() => {
                    setDocumentTab(type.id);
                    setDocumentsSearchResults([]);
                    setSelectedDocument(null);
                    setDocumentChats([]);
                    setIsDocTypesOpen(false);
                  }}
                >
                  {React.cloneElement(type.icon, { className: 'h-4 w-4 mr-2' })}
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Document Search Bar */}
        <div className="relative mb-3">
          <input 
            type="text" 
            placeholder={`Cerca ${documentTypes.find(t => t.id === documentTab)?.label.toLowerCase() || 'documenti'}...`} 
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
            'Cerca Documenti'
          )}
        </button>
        
        {/* Document Results and Chat List */}
        <div className="mt-3" style={{ height: '50vh', overflowY: 'auto' }}>
          {/* Document Search Results */}
          {documentsSearchResults.length > 0 && (
            <div className="mb-3" style={{ height: '50vh', overflowY: 'auto' }}>
              <h4 className="text-xs font-medium text-gray-600 mb-2">
                Documenti trovati ({documentsSearchResults.length})
              </h4>
              <div className="space-y-2 overflow-y-auto pr-1 documents-list">
                {documentsSearchResults.map(doc => (
                  <div 
                    key={`doc-${doc.DocumentType}-${doc.DocumentId}`}
                    className={`document-item p-2 border rounded-lg cursor-pointer transition-colors ${
                      selectedDocument?.DocumentId === doc.DocumentId
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => searchChatsByDocument(doc)}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-2 bg-gray-100 p-1.5 rounded-md">
                        {documentTypes.find(t => t.id === documentTab)?.icon}
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
                          <p className="text-xs text-gray-500 truncate">
                            {doc.DocumentReference}
                          </p>
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
                          selectedDocument?.DocumentId === doc.DocumentId ? 'rotate-180' : ''
                        }`} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Document-Related Chats */}
          {selectedDocument && (
            <div className="mt-4">
              <h4 className="text-xs font-medium text-gray-600 mb-2 flex items-center">
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                Chat legate a: 
                <span className="ml-1 font-semibold text-blue-600">
                  {selectedDocument.DocumentNumber}
                </span>
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
                          ? 'bg-white border-gray-200 hover:bg-gray-50' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => chat.isUserMember 
                        ? openChatModal(chat.notificationId) 
                        : openChatInReadOnlyMode(chat.notificationId)
                      }
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <span 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: chat.hexColor || '#6366f1' }}
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
          
          {/* Empty State for Document Search */}
          {!documentsSearchResults.length && !documentsLoading && !selectedDocument && documentsSearchTerm.length >= 2 && (
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg mt-3">
              <Link className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500 text-center">
                Nessun documento trovato. Prova a modificare i criteri di ricerca.
              </p>
            </div>
          )}
          
          {/* Help Text for Document Search */}
          {!documentsSearchResults.length && !documentsLoading && documentsSearchTerm.length < 2 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Suggerimento:</strong> Digita almeno 2 caratteri per cercare documenti. 
                Puoi cercare {documentTypes.find(t => t.id === documentTab)?.label.toLowerCase()} per codice, descrizione o altri dati rilevanti.
              </p>
            </div>
          )}
        </div>
      </div>
    )}

    <div className="notifications-list" ref={notificationBarRef} id="notification-list-container">
      {/* La sezione delle notifiche visibile solo quando non è attiva la ricerca per documenti */}
      {!isDocumentSearchVisible && (
        filteredNotifications && filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => {
            const messages = parseMessages(notification.messages);
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            const categoryColor = notification.hexColor;
            // Verifica se questa chat è stata abbandonata dall'utente
            const hasLeftChat = notification.chatLeft === 1 || notification.chatLeft === true;
            // Verifica se questa chat è stata archiviata dall'utente
            const isArchived = notification.archived === 1 || notification.archived === true;

            return (
              <div
                key={`notification-${notification.notificationId}-${lastMessage ? lastMessage.messageId : ''}`}
                className={`notification-item ${notification.isReadByUser ? 'read' : 'unread'} ${notification.isClosed ? 'isClosed' : ''} ${hasLeftChat ? 'chat-left' : ''} ${isArchived ? 'archived' : ''}
                          ${animatingItemId === notification.notificationId && animationPhase === 'exit' ? 'pin-exit-active' : ''}
                          ${animatingItemId === notification.notificationId && animationPhase === 'enter' ? 'pin-enter-active' : ''}`}
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
                  {/* Div per la prima colonna di icone */}
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
                      color: notification.mentionToRead ? 'red' : (notification.isMentioned ? 'black' : 'gray'), 
                      opacity: notification.isMentioned || notification.mentionToRead ? 1 : 0.5 
                    }}
                    id={`notification-mention-${notification.notificationId}`}
                    title={notification.isMentioned ? "Sei stato menzionato in questa notifica" : ""}
                  ></i>
                </div>
                {/* Div per la seconda colonna di icone */}
                <div className="notification-content1B">
                  {/* Aggiungi bottone di archiviazione */}
                  <i 
                    className={isArchived ? "bi bi-archive-fill text-purple-600" : "bi bi-archive text-gray-600"}
                    onClick={(e) => isArchived 
                      ? handleUnarchiveNotification(notification.notificationId, e)
                      : handleArchiveNotification(notification.notificationId, e)}
                    id={`notification-archive-${notification.notificationId}`}
                    title={isArchived ? "Rimuovi dall'archivio" : "Archivia"}
                    style={{ cursor: 'pointer' }}
                  ></i>
                  <i 
                    className={notification.isMuted ? "bi bi-bell-slash-fill text-gray-600" : "bi bi-bell text-gray-600"}
                    onClick={(e) => handleToggleMute(notification.notificationId, !notification.isMuted, e)}
                    id={`notification-mute-${notification.notificationId}`}
                    title={notification.isMuted ? "Riattiva notifiche" : "Silenzia notifiche"}
                    style={{ cursor: 'pointer' }}
                  ></i>
                </div>
  
                <div className="notification-content2">
                  <div className={`notification-header ${notification.isReadByUser ? '' : 'unread'}`}>
                    <span 
                      className={"notification-title " + (notification.isReadByUser ? '' : 'unread')}
                      id={`notification-title-${notification.notificationId}`}
                    >
                      {notification.title}
                      {hasLeftChat && <span className="text-yellow-600 text-xs ml-1">(abbandonata)</span>}
                      {isArchived && <span className="text-purple-600 text-xs ml-1">(archiviata)</span>}
                    </span>
                    <span 
                      className={`time`}
                      id={`notification-time-${notification.notificationId}`}
                    >{lastMessage ? timeSince(lastMessage.tbCreated) : ''}</span>
                  </div>
                  <span 
                    className="sender"
                    id={`notification-sender-${notification.notificationId}`}
                  >{lastMessage ? lastMessage.senderName : ''}</span>
                  <div 
                    className="last-message-preview"
                    id={`notification-preview-${notification.notificationId}`}
                  >{lastMessage ? lastMessage.message : ''}</div>
                </div>
                <div
                  className="read-indicator-wrapper"
                  style={{ backgroundColor: notification.isReadByUser ? '#e7e7e7' : 'rgb(224, 42, 42)' }}
                  onClick={(e) => handleToggleReadUnread(notification.notificationId, notification.isReadByUser, e)}
                  id={`notification-read-indicator-${notification.notificationId}`}
                  title={notification.isReadByUser ? "Segna come non letto" : "Segna come letto"}
                ></div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-gray-500" id="notification-empty-state">
            <div className="mb-3 w-16 h-16 flex items-center justify-center rounded-full bg-gray-100">
              <Filter className="w-8 h-8 text-gray-400" />
            </div>
            <p className="mb-2">Nessuna notifica corrisponde ai filtri selezionati</p>
            <button 
              className="mt-2 text-sm text-blue-600 hover:underline"
              onClick={() => {
                setShowUnreadOnly(false);
                setFilterFavorites(false);
                setFilterMentioned(false);
                setFilterMessagesSent(false);
                setSelectedCategory('all');
                setSearchTerm('');
                setCompletedFilter('all');
                setFilterLeftChats(false);
                setFilterArchivedChats(false); // Reset del filtro archiviati
                setIsDocumentSearchVisible(false); // Chiudi la ricerca per documenti
              }}
              id="notification-reset-filters"
            >
              Reimposta tutti i filtri
            </button>
          </div>
        ))
        }
      </div>

      {/* CSS per stilizzare le chat archiviate */}
      <style>
        {`
          .notification-item.archived .notification-title {
            color: #9333ea; /* text-purple-600 */
          }
          
          .notification-item.archived {
            background-color: rgba(147, 51, 234, 0.05); /* Sfondo leggermente viola */
          }
          
          .notification-item.muted .notification-title::after {
            content: " 🔕";
            font-size: 0.8em;
            opacity: 0.7;
          }
          
          .notification-item.muted {
            background-color: rgba(0, 0, 0, 0.02);
          }

          /* Stili per la sezione di ricerca documenti */
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

          /* Animazione di caricamento */
          .spin {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
        </style>
    </div>
  );
};

export default NotificationSidebar;