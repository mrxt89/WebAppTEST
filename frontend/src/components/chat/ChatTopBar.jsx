// Frontend/src/components/chat/ChatTopBar.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Minimize2,
  Info,
  Users,
  Clock,
  Calendar,
  Mail,
  Phone,
  UserCircle,
  UserPlus,
  Search,
  Plus,
  Check,
  Filter,
  MessageCircle,
  Paperclip,
  ArrowLeftRight,
  MessageSquareText,
  Bell,
  Globe,
  Building,
  ChevronDown,
  Loader2,
  LogOut,
  Trash2,
  CheckCircle,
  XCircle,
  CheckSquare,
  XSquare,
  AlertOctagon,
  Archive,
  ArchiveX,
  MoreVertical,
  ChevronLeft,
  BarChart,
  Edit2,
  Link,
  Maximize2,
  Square,
  Minus,
  Proportions,
  UserMinus,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import axios from "axios";
import { config } from "@/config";
import PollButton from "./PollButton";
import PollFilter from "./PollFilter";
import DocumentLinker from "./DocumentLinker";
import ImprovedSearchBar from "./ImprovedSearchBar";
import { swal } from "@/lib/common";
import PopoutButton from "./PopoutButton";

const ChatTopBar = ({
  title,
  setTitle,
  closeChat,
  onMinimize,
  onMaximize,
  isMaximized,
  membersInfo = [],
  updateReceiversList,
  users = [],
  isNewMessage = false,
  currentUser,
  notificationId,
  notificationCategoryId,
  notificationCategoryName,
  hexColor,
  tbCreated,
  receiversList = "",
  onUpdateCategoryId,
  leaveChat,
  hasLeftChat = false,
  isArchived = false,
  archiveChat = null,
  unarchiveChat = null,
  renderExtraButtons = null,
  isStandalone = false,
  onRequestClose = null,
  refreshParticipants = null,
  disableTitleEdit = false, // NUOVO: per disabilitare modifica titolo
}) => {
  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [searchTerm, setSearchTerm] = useState("");
  const [messageSearchTerm, setMessageSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState(
    typeof receiversList === "string"
      ? receiversList.split("-").filter(Boolean)
      : [],
  );
  const [channelSearchTerm, setChannelSearchTerm] = useState("");
  const [notificationChannels, setNotificationChannels] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [activeRecipientTab, setActiveRecipientTab] = useState("users");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [waitingForMembersUpdate, setWaitingForMembersUpdate] = useState(false);

  const {
    notifications,
    filterMessages,
    updateChatTitle,
    fetchNotificationById,
    removeUserFromChat,
    fetchChatParticipants,
  } = useNotifications();
  const infoDropdownRef = useRef(null);
  const infoButtonRef = useRef(null);
  const moreMenuRef = useRef(null);

  const [currentFilter, setCurrentFilter] = useState("all");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title || "");
  const titleInputRef = useRef(null);

  const [isDocumentLinkerOpen, setIsDocumentLinkerOpen] = useState(false);
  const documents = [];

  const [activeFilters, setActiveFilters] = useState({
    color: null,
    messageType: "all",
    searchText: "",
  });

  // Funzione per caricare i partecipanti
  const loadParticipants = useCallback(async () => {
    if (!notificationId) return;
    
    try {
      await fetchNotificationById(notificationId, true);
      
      if (typeof refreshParticipants === "function") {
        refreshParticipants(notificationId);
      }
    } catch (error) {
      console.error("Errore nel caricamento dei partecipanti:", error);
    }
  }, [notificationId, fetchNotificationById, refreshParticipants]);

  // useEffect per impostare il titolo modificato
  useEffect(() => {
    setEditedTitle(title || "");
  }, [title]);

  // Controlla se siamo su un dispositivo mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  // IMPORTANTE: Rimuovi il loop problematico
  useEffect(() => {
    // NON fare console.log continuamente per membersInfo
    // Questo useEffect dovrebbe essere rimosso o modificato per non causare loop
    
    if (waitingForMembersUpdate && membersInfo.length > 0) {
      setSelectedUsers([]);
      if (typeof updateReceiversList === "function") {
        updateReceiversList("");
      }
      setWaitingForMembersUpdate(false);
    }
  }, [membersInfo.length, waitingForMembersUpdate, updateReceiversList]);

  // Aggiungi listener per l'evento di messaggio inviato
  useEffect(() => {
    const handleMessageSent = (event) => {
      const { notificationId: eventNotificationId } = event.detail;
      
      if (eventNotificationId === notificationId && !isNewMessage) {
        setWaitingForMembersUpdate(true);
      }
    };

    document.addEventListener("chat-message-sent", handleMessageSent);
    
    return () => {
      document.removeEventListener("chat-message-sent", handleMessageSent);
    };
  }, [notificationId, isNewMessage]);

  // Ottieni il colore della categoria o usa un valore predefinito
  const getCategoryColor = () => {
    if (hexColor) return hexColor;

    if (notificationId && notifications && notifications.length > 0) {
      const notification = notifications.find(
        (n) => n.notificationId === notificationId,
      );
      if (notification && notification.hexColor) {
        return notification.hexColor;
      }
    }

    return "#3b82f6";
  };

  const categoryColor = getCategoryColor();

  // Aggiungi listener per chiudere il dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isInfoVisible &&
        infoDropdownRef.current &&
        !infoDropdownRef.current.contains(event.target) &&
        infoButtonRef.current &&
        !infoButtonRef.current.contains(event.target)
      ) {
        setIsInfoVisible(false);
      }

      if (
        isMoreMenuOpen &&
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target)
      ) {
        setIsMoreMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isInfoVisible, isMoreMenuOpen]);

  // Focus automatico sull'input del titolo quando si apre una nuova chat
  useEffect(() => {
    if (isNewMessage && titleInputRef.current && !disableTitleEdit) {
      titleInputRef.current.focus();
    }
  }, [isNewMessage, disableTitleEdit]);

  // Aggiorna i receivers selezionati quando cambia receiversList
  useEffect(() => {
    if (receiversList !== undefined) {
      setSelectedUsers(receiversList ? receiversList.split("-").filter(Boolean) : []);
    }
  }, [receiversList]);

  // Carica i canali di notifica quando si attiva la tab appropriata
  useEffect(() => {
    const fetchNotificationChannels = async () => {
      try {
        setLoadingChannels(true);
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${config.API_BASE_URL}/notifications-channels`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const channelsData = response.data.map((channel) => ({
          ...channel,
          members:
            typeof channel.membersJson === "string"
              ? JSON.parse(channel.membersJson || "[]")
              : channel.membersJson || [],
        }));

        setNotificationChannels(channelsData);
      } catch (error) {
        console.error("Error fetching notification channels:", error);
      } finally {
        setLoadingChannels(false);
      }
    };

    if (
      isInfoVisible &&
      activeTab === "add" &&
      activeRecipientTab === "channels" &&
      !hasLeftChat
    ) {
      fetchNotificationChannels();
    }
  }, [isInfoVisible, activeTab, activeRecipientTab, hasLeftChat]);

  useEffect(() => {
    const handleReceiversUpdated = (event) => {
      const { notificationId: eventNotificationId, receiversList: newReceiversList } = event.detail;
      
      if (eventNotificationId === notificationId) {
        setSelectedUsers(newReceiversList ? newReceiversList.split("-").filter(Boolean) : []);
        
        if (activeTab === "add" && !newReceiversList) {
          setActiveTab("info");
        }
      }
    };
  
    document.addEventListener("receivers-updated", handleReceiversUpdated);
    
    return () => {
      document.removeEventListener("receivers-updated", handleReceiversUpdated);
    };
  }, [notificationId, activeTab]);

  useEffect(() => {
    const handleUserRemovedFromChat = (event) => {
      const { notificationId: eventNotificationId } = event.detail;
      
      if (eventNotificationId === notificationId) {
        loadParticipants();
      }
    };
    
    const handleChatStatusChanged = (event) => {
      const { notificationId: eventNotificationId, action } = event.detail;
      
      if (eventNotificationId === notificationId && action === 'left') {
        loadParticipants();
      }
    };
    
    const handleMessageSent = (event) => {
      const { notificationId: eventNotificationId } = event.detail;
      
      if (eventNotificationId === notificationId && !isNewMessage) {
        if (isInfoVisible && activeTab === "members") {
          setTimeout(() => {
            loadParticipants();
          }, 1000);
        }
      }
    };
    
    const handleRefreshParticipants = (event) => {
      const { notificationId: eventNotificationId } = event.detail;
      
      if (eventNotificationId === notificationId || !eventNotificationId) {
        loadParticipants();
      }
    };
  
    document.addEventListener("user-removed-from-chat", handleUserRemovedFromChat);
    document.addEventListener("chat-status-changed", handleChatStatusChanged);
    document.addEventListener("chat-message-sent", handleMessageSent);
    document.addEventListener("refresh-participants", handleRefreshParticipants);
    
    return () => {
      document.removeEventListener("user-removed-from-chat", handleUserRemovedFromChat);
      document.removeEventListener("chat-status-changed", handleChatStatusChanged);
      document.removeEventListener("chat-message-sent", handleMessageSent);
      document.removeEventListener("refresh-participants", handleRefreshParticipants);
    };
  }, [notificationId, isInfoVisible, activeTab, loadParticipants, isNewMessage]);

  // Aggiungo useEffect per aggiornare i partecipanti quando si apre la topbar
  useEffect(() => {
    if (isInfoVisible && notificationId && !isNewMessage) {
      fetchChatParticipants(notificationId);
    }
  }, [isInfoVisible, notificationId, fetchChatParticipants, isNewMessage]);

  // Funzione per controllare lo stato online di un utente
  const getOnlineStatus = (user) => {
    if (!user || !user.lastOnline) return "offline";

    const lastOnline = new Date(user.lastOnline);
    const now = new Date();
    const diffMinutes = Math.floor((now - lastOnline) / 60000);

    if (diffMinutes <= 5) return "online";
    if (diffMinutes <= 30) return "away";
    return "offline";
  };

  // Calcola il tempo dall'ultima attività
  const getLastActiveTime = (dateString) => {
    if (!dateString) return "Mai connesso";

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMinutes = Math.floor((now - date) / 60000);

      if (diffMinutes < 1) return "Adesso";
      if (diffMinutes < 60) return `${diffMinutes} minuti fa`;

      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} ore fa`;

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} giorni fa`;

      return format(date, "d MMM yyyy HH:mm", { locale: it });
    } catch (error) {
      return "Data non valida";
    }
  };

  // Funzione per gestire la modifica del titolo
  const handleTitleEdit = () => {
    if (hasLeftChat || disableTitleEdit) return;
    setIsEditingTitle(true);

    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
        titleInputRef.current.select();
      }
    }, 0);
  };

  // Funzione per salvare il titolo modificato
  const handleTitleSave = async () => {
    if (!editedTitle.trim()) {
      setEditedTitle(title);
      setIsEditingTitle(false);
      return;
    }

    if (editedTitle !== title) {
      const success = await updateChatTitle(notificationId, editedTitle);
      if (success && typeof setTitle === "function") {
        setTitle(editedTitle);
        await fetchNotificationById(notificationId, true);
      }
    }

    setIsEditingTitle(false);
  };

  // Funzione per gestire il tasto Invio
  const handleTitleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditedTitle(title);
      setIsEditingTitle(false);
    }
  };

  // Gestisce la selezione/deselezione degli utenti
  const handleUserSelect = (userId) => {
    if (hasLeftChat) return;

    setSelectedUsers((prevSelected) => {
      const updatedList = prevSelected.includes(userId)
        ? prevSelected.filter((id) => id !== userId)
        : [...prevSelected, userId];

      if (typeof updateReceiversList === "function") {
        updateReceiversList(updatedList.join("-"));
      }
      return updatedList;
    });
  };

  // Gestisce la selezione di un canale
  const handleChannelSelect = (channelId) => {
    if (hasLeftChat) return;

    const selectedChannel = notificationChannels.find(
      (c) => c.notificationCategoryId == channelId,
    );

    if (selectedChannel) {
      const channelUserIds = selectedChannel.members
        .map((member) => {
          if (member.userId) return member.userId.toString();
          if (member.TB) return member.TB[0].userId.toString();
          return null;
        })
        .filter(Boolean);

      setSelectedUsers(channelUserIds);
      updateReceiversList(channelUserIds.join("-"));

      if (isNewMessage) {
        if (typeof onUpdateCategoryId === "function") {
          onUpdateCategoryId(selectedChannel.notificationCategoryId);
        }
      }
    }
  };

  // Filtra gli utenti disponibili per la ricerca
  const filteredUsers = users.filter((user) => {
    const searchMatch =
      (user.firstName?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ) ||
      (user.lastName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user.username?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user.role?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user.companyName?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      );

    if (activeTab === "add") {
      return searchMatch && !user.userDisabled;
    }

    return searchMatch && !user.userDisabled;
  });

  // Filtra i canali in base al termine di ricerca
  const filteredChannels = notificationChannels.filter(
    (channel) =>
      (channel.name?.toLowerCase() || "").includes(
        channelSearchTerm.toLowerCase(),
      ) ||
      (channel.description?.toLowerCase() || "").includes(
        channelSearchTerm.toLowerCase(),
      ),
  );

  // Rimuove tutti i destinatari selezionati
  const handleClearAll = () => {
    if (hasLeftChat) return;

    setSelectedUsers([]);
    updateReceiversList("");
  };

  // Modifico la funzione handleFilterMessages per gestire tutti i tipi di filtri
  const handleFilterMessages = async (filters) => {
    if (!notificationId) return;
  
    try {
      setActiveFilters((prev) => ({
        ...prev,
        ...filters,
      }));
  
      const filterParams = {
        ...activeFilters,
        ...filters,
      };
  
      const result = await filterMessages(notificationId, filterParams);
  
      if (result) {
        const event = new CustomEvent("chat-filter-applied", {
          detail: {
            messageIds: result.filteredMessages 
              ? result.filteredMessages.map((m) => m.messageId)
              : result.map((m) => m.messageId),
            totalFound: result.totalFound || result.length,
            targetNotificationId: parseInt(notificationId),
            activeFilters: filterParams,
          },
        });
        document.dispatchEvent(event);
      }
    } catch (error) {
      console.error("Errore nel filtraggio dei messaggi:", error);
      swal.fire({
        icon: "error",
        title: "Errore nella ricerca",
        text: "Si è verificato un errore durante la ricerca dei messaggi. Riprova più tardi.",
        timer: 3000,
        showConfirmButton: false,
      });
    }
  };

  // Modifico la funzione handleResetFilters per resettare tutti i filtri
  const handleResetFilters = () => {
    setActiveFilters({
      color: null,
      messageType: "all",
      searchText: "",
    });
    setMessageSearchTerm("");

    const event = new CustomEvent("chat-reset-filters", {
      detail: {
        targetNotificationId: notificationId,
      },
    });
    document.dispatchEvent(event);
  };

  // Modifico la funzione handleFilterTypeChange per gestire i filtri dei sondaggi
  const handleFilterTypeChange = (type) => {
    handleFilterMessages({ messageType: type });
  };

  // Toggle per mostrare/nascondere la barra di ricerca
  const toggleSearch = () => {
    setIsSearchVisible(!isSearchVisible);
    setIsMoreMenuOpen(false);
    if (isInfoVisible && isMobile) {
      setIsInfoVisible(false);
    }
  };

  // Gestisce il click su un risultato della ricerca
  const handleSearchResultSelected = (messageId) => {
    const event = new CustomEvent("chat-search-result-selected", {
      detail: { messageId },
    });
    document.dispatchEvent(event);
  };

  const handlePollCreated = (poll, messageResult) => {
    if (messageResult && messageResult.notificationId) {
      fetchNotificationById(messageResult.notificationId);
    }
  };

  // Funzione per gestire l'archiviazione della chat
  const handleArchiveChat = async () => {
    if (!archiveChat || !notificationId) return;

    try {
      setIsMoreMenuOpen(false);
      setIsInfoVisible(false);
      await archiveChat(notificationId);
    } catch (error) {
      console.error("Errore durante l'archiviazione della chat:", error);
    }
  };

  // Funzione per gestire la rimozione dall'archivio della chat
  const handleUnarchiveChat = async () => {
    if (!unarchiveChat || !notificationId) return;

    try {
      setIsMoreMenuOpen(false);
      setIsInfoVisible(false);
      await unarchiveChat(notificationId);
    } catch (error) {
      console.error("Errore durante la rimozione dall'archivio:", error);
    }
  };

  // Funzione per gestire l'abbandono della chat dal menu "More"
  const handleLeaveChat = async () => {
    if (!leaveChat || !notificationId) return;

    try {
      setIsMoreMenuOpen(false);
      setIsInfoVisible(false);

      swal.fire({
        title: "Abbandono in corso...",
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          swal.showLoading();
        },
      });

      const result = await leaveChat(notificationId);

      if (result) {
        if (typeof fetchNotificationData === "function") {
          await fetchNotificationData(notificationId);
        }

        setHasLeftChat(true);

        swal.fire({
          icon: "success",
          title: "Chat abbandonata",
          text: "Hai abbandonato questa conversazione",
          timer: 2000,
          showConfirmButton: false,
        });

        document.dispatchEvent(
          new CustomEvent("chat-status-changed", {
            detail: {
              notificationId,
              action: "left",
              timestamp: new Date().getTime(),
            },
          }),
        );
      }
    } catch (error) {
      console.error("Errore durante l'abbandono della chat:", error);
      swal.fire({
        icon: "error",
        title: "Errore",
        text:
          error.message ||
          "Si è verificato un errore durante l'abbandono della chat",
      });
    }
  };

  useEffect(() => {
    const updateUIForChatStatus = () => {
      setIsMoreMenuOpen(false);
      setIsInfoVisible(false);
    };

    updateUIForChatStatus();
  }, [hasLeftChat, isArchived]);

  return (
    <div
      className="relative flex flex-col shadow-sm"
      style={{
        background: `${categoryColor}15`,
        borderBottom: `1px solid ${categoryColor}40`,
        zIndex: 1000,
        position: 'relative'
      }}
    >
      {/* Top row with responsive layout */}
      <div className="flex items-center justify-between px-2 py-2 md:px-4">
        {/* Left section - Back button (mobile) or Category name */}
        <div className="flex items-center min-w-[100px]">
          {isMobile ? (
            <button
              onClick={closeChat}
              className="p-2 rounded-full hover:bg-gray-200 transition-colors mr-1"
              title="Chiudi chat"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            notificationCategoryName && (
              <span
                className="text-xs font-medium px-2 py-1 rounded-full hidden md:inline-block"
                style={{
                  backgroundColor: `${categoryColor}20`,
                  color: categoryColor,
                }}
              >
                {notificationCategoryName}
              </span>
            )
          )}
        </div>

        {/* Center section - Title */}
        <div className="flex-1 min-w-0 px-2">
          {isNewMessage && !disableTitleEdit ? (
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.target.focus();
              }}
              onFocus={(e) => {
                e.target.select();
              }}
              placeholder="Inserisci il titolo..."
              className="bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none w-full text-center font-medium px-1 cursor-text"
              style={{ 
                cursor: 'text',
                userSelect: 'text',
                WebkitUserSelect: 'text',
                MozUserSelect: 'text'
              }}
            />
          ) : isEditingTitle && !disableTitleEdit ? (
            <div className="relative">
              <input
                ref={titleInputRef}
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className="bg-white border border-blue-300 focus:border-blue-500 outline-none rounded-md w-full text-center font-medium px-2 py-1 text-base md:text-lg"
                placeholder="Inserisci il titolo..."
              />
              <p className="text-xs text-gray-500 text-center mt-1">
                Premi Invio per salvare, Esc per annullare
              </p>
            </div>
          ) : (
            <h2
              className={`font-medium text-base md:text-lg truncate text-center ${
                disableTitleEdit ? '' : 'cursor-pointer group'
              } relative`}
              onClick={disableTitleEdit ? undefined : handleTitleEdit}
              title={disableTitleEdit ? title : "Clicca per modificare il titolo"}
            >
              {title}
              {isArchived && (
                <span className="ml-1 text-xs bg-gray-100 text-purple-600 rounded-full px-1 py-0.5 inline-block align-middle">
                  Archiviata
                </span>
              )}
              {!disableTitleEdit && (
                <span className="hidden group-hover:inline-block absolute left-full ml-1 text-xs text-blue-500">
                  <Edit2 className="h-3 w-3" />
                </span>
              )}
            </h2>
          )}
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center space-x-1 min-w-[200px] justify-end">
          {/* Desktop: Mostra tutti i pulsanti */}
          {!isMobile && (
            <>
              {/* Pulsanti dei sondaggi e archivio */}
              {!hasLeftChat && notificationId > 0 && (
                <PollButton
                  notificationId={notificationId}
                  onPollCreated={handlePollCreated}
                  currentUserId={currentUser?.userId}
                />
              )}
              {/* PopoutButton solo se non è già modalità standalone */}
              {!isStandalone &&
                !hasLeftChat &&
                notificationId > 0 &&
                !isNewMessage && (
                  <PopoutButton
                    notificationId={notificationId}
                    title={title}
                    onSuccess={closeChat}
                  />
                )}

              {!hasLeftChat &&
                notificationId > 0 &&
                !isNewMessage &&
                (isArchived ? (
                  <button
                    onClick={handleUnarchiveChat}
                    className="p-2 rounded-full hover:bg-gray-200 transition-colors text-purple-600"
                    title="Rimuovi dall'archivio"
                  >
                    <ArchiveX className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleArchiveChat}
                    className="p-2 rounded-full hover:bg-gray-200 transition-colors text-purple-600"
                    title="Archivia chat"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                ))}

              {/* Altri pulsanti personalizzati */}
              {renderExtraButtons && renderExtraButtons()}

              <button
                ref={infoButtonRef}
                onClick={() => {
                  setIsInfoVisible(!isInfoVisible);
                  setIsMoreMenuOpen(false);
                }}
                className={`p-2 rounded-full transition-colors ${isInfoVisible ? "bg-blue-100 text-blue-600" : "hover:bg-gray-200"}`}
                title="Informazioni chat"
                data-info-button
                disabled={hasLeftChat}
                style={{ opacity: hasLeftChat ? 0.5 : 1 }}
              >
                <Info className="w-4 h-4" />
              </button>

              {!isNewMessage && (
                <button
                  onClick={onMinimize}
                  className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                  title="Minimizza"
                >
                  <Minus className="w-4 h-4 text-gray-600" />
                </button>
              )}
              {/* Aggiungi bottone di massimizzazione se disponibile */}
              {typeof onMaximize === "function" && (
                <button
                  onClick={onMaximize}
                  className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                  title={isMaximized ? "Ripristina" : "Massimizza"}
                >
                  {isMaximized ? (
                    <Proportions className="w-4 h-4 text-gray-600" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              )}

              <button
                onClick={closeChat}
                className="p-2 rounded-full hover:bg-red-100 transition-colors group"
                title="Chiudi chat"
              >
                <X className="w-4 h-4 text-gray-600 group-hover:text-red-500" />
              </button>
            </>
          )}
          {/* Mobile: Mostra solo pulsanti essenziali + menu "More" */}
          {isMobile && (
            <>
              {/* Pulsante di ricerca sempre visibile */}
              <button
                onClick={toggleSearch}
                className={`p-2 rounded-full transition-colors ${
                  isSearchVisible
                    ? "bg-blue-100 text-blue-600"
                    : "hover:bg-gray-200"
                }`}
                title="Cerca nei messaggi"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Minimize button for mobile view */}
              <button
                onClick={onMinimize}
                className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                title="Minimizza"
              >
                <Minimize2 className="w-4 h-4" />
              </button>

              {/* Menu "More" con pulsanti aggiuntivi */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(!isMoreMenuOpen);
                    setIsInfoVisible(false);
                  }}
                  className={`p-2 rounded-full transition-colors ${isMoreMenuOpen ? "bg-gray-200" : "hover:bg-gray-200"}`}
                  title="Altre opzioni"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Menu dropdown "More" */}
                <AnimatePresence>
                  {isMoreMenuOpen && (
                    <motion.div
                      ref={moreMenuRef}
                      className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg overflow-hidden z-30"
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                        width: "180px",
                      }}
                    >
                      <div className="py-1">
                        {/* Informazioni chat */}
                        <button
                          onClick={() => {
                            setIsInfoVisible(true);
                            setIsMoreMenuOpen(false);
                            setActiveTab("info");
                          }}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          disabled={hasLeftChat}
                        >
                          <Info className="w-4 h-4 mr-2" />
                          <span>Informazioni</span>
                        </button>

                        {/* Partecipanti */}
                        <button
                          onClick={() => {
                            setIsInfoVisible(true);
                            setIsMoreMenuOpen(false);
                            setActiveTab("members");
                          }}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          disabled={hasLeftChat}
                        >
                          <Users className="w-4 h-4 mr-2" />
                          <span>Partecipanti</span>
                        </button>

                        {/* Aggiungi partecipanti */}
                        {!hasLeftChat && (
                          <button
                            onClick={() => {
                              setIsInfoVisible(true);
                              setIsMoreMenuOpen(false);
                              setActiveTab("add");
                            }}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            <span>Aggiungi</span>
                          </button>
                        )}

                        {/* Crea sondaggio */}
                        {!hasLeftChat && notificationId > 0 && (
                          <button
                            onClick={() => {
                              document.dispatchEvent(
                                new CustomEvent("show-poll-modal"),
                              );
                              setIsMoreMenuOpen(false);
                            }}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          >
                            <BarChart className="w-4 h-4 mr-2" />
                            <span>Crea sondaggio</span>
                          </button>
                        )}

                        {/* Archivia/Rimuovi dall'archivio */}
                        {!hasLeftChat &&
                          notificationId > 0 &&
                          !isNewMessage &&
                          (isArchived ? (
                            <button
                              onClick={handleUnarchiveChat}
                              className="flex items-center px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 w-full text-left"
                            >
                              <ArchiveX className="w-4 h-4 mr-2" />
                              <span>Rimuovi dall'archivio</span>
                            </button>
                          ) : (
                            <button
                              onClick={handleArchiveChat}
                              className="flex items-center px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 w-full text-left"
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              <span>Archivia chat</span>
                            </button>
                          ))}

                        {/* Abbandona chat */}
                        {!hasLeftChat && (
                          <button
                            onClick={handleLeaveChat}
                            className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left border-t border-gray-100"
                            disabled={hasLeftChat}
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            <span>Abbandona chat</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile: Category tag in seconda riga */}
      {isMobile && notificationCategoryName && (
        <div className="flex justify-center pb-1">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${categoryColor}20`,
              color: categoryColor,
            }}
          >
            {notificationCategoryName}
          </span>
        </div>
      )}

      {/* Componente ImprovedSearchBar visualizzato quando isSearchVisible è true */}
      {isSearchVisible && (
        <ImprovedSearchBar
          notificationId={notificationId}
          onResultSelected={handleSearchResultSelected}
          onClose={() => setIsSearchVisible(false)}
        />
      )}

      {/* Dropdown with chat info - con animazione */}
      <AnimatePresence>
        {isInfoVisible && !hasLeftChat && (
          <motion.div
              ref={infoDropdownRef}
              className={`absolute ${isMobile ? "left-0 right-0 mx-2" : "right-8"} top-full mt-1 bg-white rounded-lg shadow-lg overflow-hidden`}
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                border: "1px solid rgba(0,0,0,0.05)",
                width: isMobile ? "calc(100% - 16px)" : "350px",
                maxHeight: "85vh",
                zIndex: 1050
              }}
            >
            {/* Tabs bar for navigation */}
            <div className="flex border-b">
              <button
                className={`flex-1 px-3 py-2 text-sm transition-colors ${
                  activeTab === "info"
                    ? "border-b-2 font-medium text-blue-600"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
                style={{
                  borderColor:
                    activeTab === "info" ? categoryColor : "transparent",
                }}
                onClick={() => setActiveTab("info")}
              >
                Info
              </button>
              <button
                className={`flex-1 px-3 py-2 text-sm transition-colors ${
                  activeTab === "members"
                    ? "border-b-2 font-medium text-blue-600"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
                style={{
                  borderColor:
                    activeTab === "members" ? categoryColor : "transparent",
                }}
                onClick={() => setActiveTab("members")}
              >
                Partecipanti
              </button>
              <button
                className={`flex-1 px-3 py-2 text-sm transition-colors ${
                  activeTab === "add"
                    ? "border-b-2 font-medium text-blue-600"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
                style={{
                  borderColor:
                    activeTab === "add" ? categoryColor : "transparent",
                }}
                onClick={() => setActiveTab("add")}
              >
                Aggiungi
              </button>
              <button
                className={`flex-1 px-3 py-2 text-sm transition-colors ${
                  activeTab === "search"
                    ? "border-b-2 font-medium text-blue-600"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
                style={{
                  borderColor:
                    activeTab === "search" ? categoryColor : "transparent",
                }}
                onClick={() => setActiveTab("search")}
              >
                Cerca
              </button>
            </div>

            {/* Tab content container */}
            <div className="overflow-y-auto" style={{ maxHeight: "50vh" }}>
              {/* INFO TAB */}
              {activeTab === "info" && (
                <div className="p-4">
                  <div className="mb-4">
                    <h3
                      className="font-medium text-sm mb-1"
                      style={{ color: categoryColor }}
                    >
                      Dettagli conversazione
                    </h3>
                    <p className="text-sm font-medium break-words">{title}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-medium flex items-center text-gray-500">
                      <Users className="w-3 h-3 mr-1" />
                      Partecipanti recenti
                    </h4>

                    <div className="space-y-1.5">
                      {membersInfo.slice(0, 3).map((member, index) => (
                        <div key={index} className="flex items-center py-1">
                          <div className="relative">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs mr-2 flex-shrink-0"
                              style={{
                                backgroundColor: `hsl(${(index * 55) % 360}, 70%, 50%)`,
                              }}
                            >
                              {member.firstName?.charAt(0).toUpperCase() || ""}
                              {member.lastName?.charAt(0).toUpperCase() || ""}
                            </div>
                            <div
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                getOnlineStatus(member) === "online"
                                  ? "bg-green-500"
                                  : getOnlineStatus(member) === "away"
                                    ? "bg-yellow-500"
                                    : "bg-gray-400"
                              }`}
                            ></div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {getLastActiveTime(member.lastOnline)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {membersInfo.length > 3 && (
                      <button
                        className="text-xs text-blue-600 hover:underline flex items-center"
                        onClick={() => setActiveTab("members")}
                      >
                        Mostra tutti i partecipanti ({membersInfo.length})
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-3 h-3 ml-1"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h4.59l-2.1 1.95a.75.75 0 001.02 1.1l3.5-3.25a.75.75 0 000-1.1l-3.5-3.25a.75.75 0 10-1.02 1.1l2.1 1.95H6.75z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Pulsanti per le azioni sulla chat */}
                  <div className="mt-5 pt-3 border-t border-gray-200 space-y-2">
                    {!hasLeftChat ? (
                      <>
                        <button
                          onClick={() => setIsDocumentLinkerOpen(true)}
                          className="relative flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                          title="Documenti collegati"
                        >
                          <Link className="h-4 w-4" />
                          {documents.length > 0 && (
                            <span className="absolute top-0 right-0 bg-blue-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">
                              {documents.length}
                            </span>
                          )}
                        </button>
                        {isArchived ? (
                          <button
                            onClick={handleUnarchiveChat}
                            className="w-full py-2 px-3 flex items-center justify-center gap-2 rounded bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                          >
                            <ArchiveX className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Rimuovi dall'archivio
                            </span>
                          </button>
                        ) : (
                          <button
                            onClick={handleArchiveChat}
                            className="w-full py-2 px-3 flex items-center justify-center gap-2 rounded bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                          >
                            <Archive className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Archivia chat
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => leaveChat && leaveChat(notificationId)}
                          className="w-full py-2 px-3 flex items-center justify-center gap-2 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Abbandona chat
                          </span>
                        </button>
                      </>
                    ) : (
                      <div className="p-2 bg-yellow-50 rounded-lg text-yellow-800 text-center text-sm">
                        <AlertOctagon className="h-4 w-4 mb-1 mx-auto" />
                        Hai abbandonato questa chat
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MEMBERS TAB */}
              {activeTab === "members" && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3
                      className="font-medium text-sm"
                      style={{ color: categoryColor }}
                    >
                      Partecipanti ({membersInfo.length})
                    </h3>

                    {!hasLeftChat && (
                      <button
                        className="text-xs flex items-center text-blue-600 hover:underline"
                        onClick={() => setActiveTab("add")}
                      >
                        <UserPlus className="w-3 h-3 mr-1" /> Aggiungi
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 mt-3">
                    {membersInfo.map((member, index) => (
                      <div
                        key={index}
                        className="flex border-b border-gray-100 pb-3"
                      >
                        <div className="relative">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm mr-3 flex-shrink-0"
                            style={{
                              backgroundColor: `hsl(${(index * 55) % 360}, 70%, 50%)`,
                            }}
                          >
                            {member.firstName?.charAt(0).toUpperCase() || ""}
                            {member.lastName?.charAt(0).toUpperCase() || ""}
                          </div>
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                              getOnlineStatus(member) === "online"
                                ? "bg-green-500"
                                : getOnlineStatus(member) === "away"
                                  ? "bg-yellow-500"
                                  : "bg-gray-400"
                            }`}
                            title={
                              getOnlineStatus(member) === "online"
                                ? "Online"
                                : getOnlineStatus(member) === "away"
                                  ? "Recentemente attivo"
                                  : "Offline"
                            }
                          ></div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {member.role || ""}
                                {member.companyName && (
                                  <span className="ml-1 text-gray-400 text-indigo-500">
                                    - {member.companyName}
                                  </span>
                                )}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {getLastActiveTime(member.lastOnline)}
                            </span>
                          </div>

                          <div className="flex flex-col space-y-1 mt-1">
                            {member.email && (
                              <div className="flex items-center text-xs text-gray-600">
                                <Mail className="h-3 w-3 mr-1 text-gray-400" />
                                <span className="truncate">{member.email}</span>
                              </div>
                            )}
                            {member.phoneNumber && (
                              <div className="flex items-center text-xs text-gray-600">
                                <Phone className="h-3 w-3 mr-1 text-gray-400" />
                                <span>{member.phoneNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Aggiungiamo il pulsante di rimozione */}
                        {!hasLeftChat && (
                          <div className="flex items-center ml-2">
                              <button
                                onClick={async () => {
                                  const result = await removeUserFromChat(notificationId, member.userId);
                                  if (result) {
                                    document.dispatchEvent(
                                      new CustomEvent("refresh-participants", {
                                        detail: { notificationId }
                                      })
                                    );
                                  }
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                title="Rimuovi dalla chat"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ADD USERS/CHANNELS TAB */}
              {activeTab === "add" && (
                <div className="p-3">
                  {/* Inner Tabs for Users/Channels */}
                  <div className="flex border-b border-gray-200 mb-3">
                    <button
                      className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
                        activeRecipientTab === "users"
                          ? "border-b-2 text-blue-600"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                      style={{
                        borderColor:
                          activeRecipientTab === "users"
                            ? categoryColor
                            : "transparent",
                      }}
                      onClick={() => setActiveRecipientTab("users")}
                    >
                      <div className="flex items-center justify-center">
                        <Users className="h-3.5 w-3.5 mr-1" />
                        Utenti
                      </div>
                    </button>
                    <button
                      className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
                        activeRecipientTab === "channels"
                          ? "border-b-2 text-blue-600"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                      style={{
                        borderColor:
                          activeRecipientTab === "channels"
                            ? categoryColor
                            : "transparent",
                      }}
                      onClick={() => setActiveRecipientTab("channels")}
                    >
                      <div className="flex items-center justify-center">
                        <Bell className="h-3.5 w-3.5 mr-1" />
                        Canali
                      </div>
                    </button>
                  </div>

                  {/* Destinatari selezionati */}
                  {selectedUsers.length > 0 && (
                    <div className="py-2 px-3 bg-blue-50 rounded-lg mb-3">
                      <div className="flex items-center justify-between text-xs text-blue-700 mb-2">
                        <span>
                          Destinatari selezionati ({selectedUsers.length})
                        </span>
                        <button className="underline" onClick={handleClearAll}>
                          Cancella tutto
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedUsers.slice(0, 5).map((userId) => {
                          const user = users.find((u) => u.userId == userId);
                          if (!user) return null;

                          return (
                            <div
                              key={userId}
                              className="bg-white text-blue-800 text-xs px-2 py-1 rounded-full flex items-center border border-blue-200"
                            >
                              <span className="truncate max-w-[100px]">
                                {user.firstName} {user.lastName}
                              </span>
                              <button
                                className="ml-1 text-gray-400 hover:text-red-500"
                                onClick={() => handleUserSelect(userId)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                        {selectedUsers.length > 5 && (
                          <div className="bg-gray-100 text-gray-700 rounded-full px-2 py-1 text-xs">
                            +{selectedUsers.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* USERS TAB CONTENT */}
                  {activeRecipientTab === "users" && (
                    <>
                      <div className="mb-3">
                        <div className="relative">
                          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Cerca utenti..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                          {searchTerm && (
                            <button
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              onClick={() => setSearchTerm("")}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {filteredUsers.length === 0 ? (
                          <div className="text-center text-gray-500 py-4">
                            {searchTerm
                              ? "Nessun utente trovato"
                              : "Nessun utente disponibile"}
                          </div>
                        ) : (
                          filteredUsers.map((user) => (
                            <div
                              key={user.userId}
                              className={`flex items-center p-2 rounded-lg transition-colors cursor-pointer ${
                                selectedUsers.includes(user.userId.toString())
                                  ? "bg-blue-50"
                                  : "hover:bg-gray-100"
                              }`}
                              onClick={() =>
                                handleUserSelect(user.userId.toString())
                              }
                            >
                              <div className="relative flex-shrink-0">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    selectedUsers.includes(
                                      user.userId.toString(),
                                    )
                                      ? "bg-blue-500 text-white"
                                      : "bg-gray-200 text-gray-700"
                                  }`}
                                >
                                  {selectedUsers.includes(
                                    user.userId.toString(),
                                  ) ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <span>
                                      {user.firstName?.charAt(0)}
                                      {user.lastName?.charAt(0)}
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                    getOnlineStatus(user) === "online"
                                      ? "bg-green-500"
                                      : getOnlineStatus(user) === "away"
                                        ? "bg-yellow-500"
                                        : "bg-gray-400"
                                  }`}
                                ></div>
                              </div>

                              <div className="ml-3 min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">
                                  {user.firstName} {user.lastName}
                                </p>
                                <div className="flex items-center text-xs text-gray-500">
                                  <span className="truncate">
                                    {user.role ||
                                      user.username ||
                                      user.email ||
                                      ""}
                                  </span>
                                  {user.companyName && (
                                    <span className="ml-1 text-gray-400 text-indigo-500">
                                      - {user.companyName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}

                  {/* CHANNELS TAB CONTENT */}
                  {activeRecipientTab === "channels" && (
                    <>
                      <div className="mb-3">
                        <div className="relative">
                          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Cerca canali..."
                            value={channelSearchTerm}
                            onChange={(e) => setChannelSearchTerm(e.target.value)}
                            onFocus={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                          {channelSearchTerm && (
                            <button
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              onClick={() => setChannelSearchTerm("")}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                       {loadingChannels ? (
                         <div className="px-4 py-6 text-center">
                           <div className="inline-block animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                           <p className="mt-2 text-sm text-gray-500">
                             Caricamento canali...
                           </p>
                         </div>
                       ) : filteredChannels.length === 0 ? (
                         <div className="px-4 py-6 text-center text-gray-500">
                           {channelSearchTerm
                             ? "Nessun canale trovato"
                             : "Nessun canale disponibile"}
                         </div>
                       ) : (
                         filteredChannels.map((channel) => {
                           const memberCount = channel.members?.length || 0;
                           const isIntercompany =
                             channel.intercompany === 1 ||
                             channel.intercompany === true;

                           return (
                             <div
                               key={channel.notificationCategoryId}
                               className="px-3 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                               onClick={() =>
                                 handleChannelSelect(
                                   channel.notificationCategoryId,
                                 )
                               }
                             >
                               <div className="flex items-start">
                                 <div className="flex-shrink-0 mr-3">
                                   <div
                                     className="w-8 h-8 rounded-full flex items-center justify-center"
                                     style={{
                                       backgroundColor:
                                         channel.hexColor || "#3b82f6",
                                     }}
                                   >
                                     {isIntercompany ? (
                                       <Globe className="h-4 w-4 text-white" />
                                     ) : (
                                       <Bell className="h-4 w-4 text-white" />
                                     )}
                                   </div>
                                 </div>
                                 <div className="flex-grow min-w-0">
                                   <div className="flex items-center justify-between">
                                     <p className="text-sm font-medium text-gray-900 truncate">
                                       {channel.name}
                                     </p>
                                     {isIntercompany && (
                                       <span className="ml-2 text-xs bg-purple-100 text-purple-800 rounded-full px-2 py-0.5">
                                         Intercompany
                                       </span>
                                     )}
                                   </div>
                                   <p className="text-xs text-gray-500 truncate">
                                     {channel.description}
                                   </p>
                                   <div className="mt-1 flex items-center">
                                     <Users className="h-3 w-3 text-gray-400 mr-1" />
                                     <span className="text-xs text-gray-500">
                                       {memberCount}{" "}
                                       {memberCount === 1
                                         ? "membro"
                                         : "membri"}
                                     </span>
                                   </div>
                                 </div>
                               </div>
                             </div>
                           );
                         })
                       )}
                     </div>
                   </>
                 )}
               </div>
             )}

             {/* SEARCH TAB */}
             {activeTab === "search" && (
               <div className="p-4">
                 <h3
                   className="font-medium text-sm mb-3"
                   style={{ color: categoryColor }}
                 >
                   Cerca nei messaggi
                 </h3>

                 <div className="space-y-4">
                   {/* Filtri attivi */}
                   {(activeFilters.color ||
                     activeFilters.messageType !== "all" ||
                     activeFilters.searchText) && (
                     <div className="flex flex-wrap gap-2 p-2 bg-blue-50 rounded-lg">
                       {activeFilters.color && (
                         <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full text-sm">
                           <span
                             className="w-3 h-3 rounded-full"
                             style={{ backgroundColor: activeFilters.color }}
                           />
                           <span>Colore</span>
                           <button
                             onClick={() =>
                               handleFilterMessages({ color: null })
                             }
                             className="text-gray-400 hover:text-gray-600"
                           >
                             <X className="h-3 w-3" />
                           </button>
                         </div>
                       )}

                       {activeFilters.messageType !== "all" && (
                         <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full text-sm">
                           <BarChart className="h-3 w-3 text-blue-500" />
                           <span>Sondaggi</span>
                           <button
                             onClick={() =>
                               handleFilterMessages({ messageType: "all" })
                             }
                             className="text-gray-400 hover:text-gray-600"
                           >
                             <X className="h-3 w-3" />
                           </button>
                         </div>
                       )}

                       {activeFilters.searchText && (
                         <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full text-sm">
                           <Search className="h-3 w-3 text-blue-500" />
                           <span>{activeFilters.searchText}</span>
                           <button
                             onClick={() => {
                               setMessageSearchTerm("");
                               handleFilterMessages({ searchText: "" });
                             }}
                             className="text-gray-400 hover:text-gray-600"
                           >
                             <X className="h-3 w-3" />
                           </button>
                         </div>
                       )}
                     </div>
                   )}

                   <div className="space-y-2">
                     <label className="text-xs text-gray-500">
                       Parola chiave
                     </label>
                     <div className="relative">
                       <input
                         type="text"
                         placeholder="Cerca nei messaggi..."
                         value={messageSearchTerm}
                         onChange={(e) => setMessageSearchTerm(e.target.value)}
                         onKeyDown={(e) => {
                           if (e.key === "Enter" && messageSearchTerm.trim()) {
                             handleFilterMessages({
                               searchText: messageSearchTerm.trim(),
                             });
                           } else if (e.key === "Escape") {
                             setMessageSearchTerm("");
                             handleResetFilters();
                           }
                         }}
                         className="w-full py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-blue-300"
                         autoFocus
                       />
                       <button
                         className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-md ${
                           messageSearchTerm.trim()
                             ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                             : "bg-gray-50 text-gray-400 cursor-not-allowed"
                         }`}
                         onClick={() =>
                           messageSearchTerm.trim() &&
                           handleFilterMessages({
                             searchText: messageSearchTerm.trim(),
                           })
                         }
                         disabled={!messageSearchTerm.trim()}
                       >
                         <Search className="h-4 w-4" />
                       </button>
                       {messageSearchTerm && (
                         <button
                           className="absolute right-10 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                           onClick={() => {
                             setMessageSearchTerm("");
                             handleFilterMessages({ searchText: "" });
                           }}
                         >
                           <X className="h-4 w-4" />
                         </button>
                       )}
                     </div>
                   </div>

                   <div className="space-y-2">
                     <label className="text-xs text-gray-500">
                       Filtra per colore
                     </label>
                     <div className="flex flex-wrap gap-2">
                       {[
                         { color: "#d62828", name: "Rosso" },
                         { color: "#fad02c", name: "Giallo" },
                         { color: "#00a14b", name: "Verde" },
                         { color: "#6ccff6", name: "Azzurro" },
                         { color: "#e5e9ec", name: "Grigio" },
                       ].map(({ color, name }) => (
                         <button
                           key={color}
                           className={`w-8 h-8 rounded-full transition-all ${
                             activeFilters.color === color
                               ? "ring-2 ring-offset-2 ring-blue-500 scale-110"
                               : "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
                           }`}
                           style={{
                             backgroundColor: color,
                             boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                           }}
                           onClick={() =>
                             handleFilterMessages({
                               color:
                                 activeFilters.color === color ? null : color,
                             })
                           }
                           title={`Cerca messaggi con colore ${name}`}
                         />
                       ))}
                     </div>
                   </div>

                   <div className="space-y-2">
                     <label className="text-xs text-gray-500">
                       Filtra per tipo
                     </label>
                     <div className="flex gap-2">
                       <button
                         className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                           activeFilters.messageType === "all"
                             ? "bg-blue-100 text-blue-700"
                             : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                         }`}
                         onClick={() =>
                           handleFilterMessages({ messageType: "all" })
                         }
                       >
                         Tutti
                       </button>
                       <button
                         className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                           activeFilters.messageType === "polls"
                             ? "bg-blue-100 text-blue-700"
                             : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                         }`}
                         onClick={() =>
                           handleFilterMessages({ messageType: "polls" })
                         }
                       >
                         <BarChart className="h-4 w-4" />
                         Sondaggi
                       </button>
                     </div>
                   </div>

                   <div className="pt-2 border-t border-gray-100">
                     <button
                       className="w-full py-2 px-3 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                       onClick={handleResetFilters}
                     >
                       Mostra tutti i messaggi
                     </button>
                   </div>
                 </div>
               </div>
             )}
           </div>
         </motion.div>
       )}
     </AnimatePresence>
     <DocumentLinker
       notificationId={notificationId}
       isOpen={isDocumentLinkerOpen}
       onClose={() => setIsDocumentLinkerOpen(false)}
     />
   </div>
 );
};

export default ChatTopBar;     