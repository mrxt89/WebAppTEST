// ModernChatList.jsx - Versione aggiornata con connessione diretta al context
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { debounce, throttle, isEqual } from "lodash";
import "@/styles/ModernChatList.css";
import {
  File,
  FileText,
  Image,
  Download,
  Reply,
  Palette,
  AlertOctagon,
  BarChart,
  Edit,
  Clock,
  MoreVertical,
  History,
  X,
  MessageSquare,
  User,
  Heart,
  ThumbsUp,
  Smile,
  ArrowBigDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import FileViewer from "../ui/fileViewer";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import { swal } from "../../lib/common";
import { motion, AnimatePresence } from "framer-motion";
import MessageColorPicker from "./MessageColorPicker";
import PollMessage from "./PollMessage";
import Modal from "react-modal";
import EditMessageModal from "./EditMessageModal";
import axios from "axios";
import { config } from "../../config";
import VersionHistoryModal from "./VersionHistoryModal";
import { FaFlag, FaRegSmile } from "react-icons/fa";
import ReactionPicker from "./ReactionPicker";
import MessageReactions from "./MessageReactions";
import MessageActionsMenu from "./MessageActionsMenu";

// Assicurati che il modal sia configurato per il tuo root element
Modal.setAppElement("#root");

// Componente di caricamento
const Spinner = () => (
  <div className="flex justify-center items-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
  </div>
);

const MIN_FETCH_INTERVAL = 5000; // 5 secondi tra un fetch e l'altro
const CHAT_REFRESH_INTERVAL = 5000;

// Funzione per generare un colore casuale in base al nome
const generateAvatarColor = (name) => {
  const colors = [
    "#D21312",
    "#2F58CD",
    "#790252",
    "#526D82",
    "#5C469C",
    "#576CBC",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Componente per gli avatar dei messaggi
const MessageAvatar = ({ senderName, onClick }) => {
  // Estrai le iniziali dal nome del mittente
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (
        parts[0][0].toUpperCase() + (parts[1] ? parts[1][0].toUpperCase() : "")
      );
    }
    return name.substring(0, 2).toUpperCase();
  };

  const avatarColor = generateAvatarColor(senderName);
  const initials = getInitials(senderName);

  return (
    <div
      className="flex flex-col items-center mr-2 cursor-pointer"
      onClick={onClick}
      title={`${senderName} - Clicca per altre opzioni`}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-md"
        style={{ backgroundColor: avatarColor }}
      >
        {initials}
      </div>
      <span className="text-xs mt-1 text-gray-600 max-w-[60px] truncate">
        {senderName.split(" ")[0]}
      </span>
    </div>
  );
};

const MessageAttachments = ({ attachments, onClick, onDownload }) => {
  if (!attachments || attachments.length === 0) return null;

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith("image/")) {
      return <Image className="h-5 w-5 text-blue-500" />;
    }
    if (fileType?.includes("pdf")) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    if (fileType?.includes("word") || fileType?.includes("document")) {
      return <FileText className="h-5 w-5 text-blue-700" />;
    }
    if (fileType?.includes("excel") || fileType?.includes("spreadsheet")) {
      return <FileText className="h-5 w-5 text-green-600" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="space-y-2 mt-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.AttachmentID}
          className="flex items-center p-2 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
          onClick={() => onClick(attachment)}
        >
          <div className="flex-shrink-0 mr-2">
            {getFileIcon(attachment.FileType)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {attachment.FileName}
            </p>
            <p className="text-xs text-gray-500">
              {Math.round((attachment.FileSizeKB / 1024) * 100) / 100} MB
            </p>
          </div>
          <button
            className="ml-2 text-blue-500 hover:text-blue-700"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(attachment);
            }}
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

const ModernChatList = ({
  notificationId,
  chatListRef,
  onReply,
  hasLeftChat = false,
  selectedMessageId,
  currentUser,
  users = [],
  animatedEditId,
  newMessage,
  onScrollToBottom,
}) => {
  // Ottieni direttamente l'accesso al context
  const {
    notifications,
    fetchNotificationById,
    downloadNotificationAttachment,
    getNotificationAttachments,
    getNotificationPolls,
    getMessageVersionHistory,
    getMessageReactions,
    toggleMessageReaction,
    restartNotificationWorker,
    registerOpenChat,
    unregisterOpenChat,
    toggleReadUnread,
  } = useNotifications();

  // Riferimenti al DOM e altri stati interni
  const messagesEndRef = useRef(null);
  const messageRefs = useRef({});
  const scrollingToBottomRef = useRef(false);
  const userHasScrolledRef = useRef(false);
  const pollRequestTimeoutRef = useRef(null);
  const pollsRequestedRef = useRef(false);
  const processedPollMessagesRef = useRef(new Set());
  const pendingReactionsRequestsRef = useRef({});
  const fetchedReactionsRef = useRef(new Set());
  const visibleMessagesRef = useRef(new Set());

  // Stati locali
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [localMessages, setLocalMessages] = useState([]);
  const [messageAttachments, setMessageAttachments] = useState({});
  const [polls, setPolls] = useState({});
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [messageReactionsCache, setMessageReactionsCache] = useState({});
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [colorPickerMessageId, setColorPickerMessageId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [avatarContextMenu, setAvatarContextMenu] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedMessageVersions, setSelectedMessageVersions] = useState(null);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const reactionBatchSize = 20;

  // Modifico lo stato per gestire solo gli ID dei messaggi da evidenziare
  const [highlightedMessageIds, setHighlightedMessageIds] = useState(new Set());
  const [isHighlightActive, setIsHighlightActive] = useState(false);

  // Aggiungo lo stato per tracciare l'indice corrente del messaggio evidenziato
  const [currentHighlightedIndex, setCurrentHighlightedIndex] = useState(0);

  // Creazione di un valore derivato per trovare la notifica corrente dal context
  const currentNotification = useMemo(() => {
    if (!notifications || !notificationId) return null;
    return notifications.find(
      (n) => n.notificationId === parseInt(notificationId),
    );
  }, [notifications, notificationId]);

  // Effetto per aggiornare i messaggi locali dal context quando la notifica corrente cambia
  useEffect(() => {
    if (currentNotification) {
      // Estrai i messaggi
      let notificationMessages = Array.isArray(currentNotification.messages)
        ? currentNotification.messages
        : typeof currentNotification.messages === "string"
          ? JSON.parse(currentNotification.messages || "[]")
          : [];

      // Aggiorna i messaggi locali
      setLocalMessages(notificationMessages);

      // Auto-scroll se necessario (solo se non c'è stato scrolling manuale)
      if (
        !userHasScrolledRef.current &&
        chatListRef.current &&
        !initialScrollDone
      ) {
        // Prevenzione loop degli eventi
        scrollingToBottomRef.current = true;

        // Scroll al fondo
        setTimeout(() => {
          if (chatListRef.current) {
            chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
          }

          // Reset flag
          setTimeout(() => {
            scrollingToBottomRef.current = false;
            setInitialScrollDone(true);
          }, 100);
        }, 100);
      }
    }
  }, [currentNotification, notificationId, chatListRef, initialScrollDone]);

  // Registra la chat come aperta o chiusa con il contesto
  useEffect(() => {
    if (notificationId && registerOpenChat) {
      // Registra la chat come aperta
      registerOpenChat(notificationId);

      // Pulizia quando il componente viene smontato
      return () => {
        if (unregisterOpenChat) {
          unregisterOpenChat(notificationId);
        }
      };
    }
  }, [notificationId, registerOpenChat, unregisterOpenChat]);

  // Aggiornamento periodico delle reazioni per i messaggi visibili
  useEffect(() => {
    if (!notificationId || hasLeftChat) return;

    // Funzione per aggiornare le reazioni dei messaggi visibili
    const refreshVisibleReactions = async () => {
      // Ottieni i messaggi attualmente visibili
      const visibleIds = Array.from(visibleMessagesRef.current);
      if (visibleIds.length === 0) return;

      // Svuota la cache delle reazioni per i messaggi visibili
      visibleIds.forEach((id) => {
        fetchedReactionsRef.current.delete(id);
        delete pendingReactionsRequestsRef.current[id];
      });

      // Ricarica le reazioni per i messaggi visibili
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        // Usa l'endpoint batch già presente
        const response = await axios.post(
          `${config.API_BASE_URL}/messages/batch-reactions`,
          {
            messageIds: visibleIds,
            userId: currentUser?.userId,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (response.data && response.data.success) {
          const freshReactions = response.data.reactions || {};

          // Aggiorna la cache con i dati freschi
          setMessageReactionsCache((prev) => ({
            ...prev,
            ...freshReactions,
          }));
        }
      } catch (error) {
        console.error("Error refreshing reactions:", error);
      }
    };

    // Esegui subito un refresh iniziale
    refreshVisibleReactions();

    // Imposta l'intervallo per gli aggiornamenti periodici (ogni 5 secondi)
    const intervalId = setInterval(refreshVisibleReactions, 5000);

    // Cleanup al dismount
    return () => clearInterval(intervalId);
  }, [notificationId, hasLeftChat, currentUser]);

  // Modifico l'effetto di scroll per includere la logica di lettura
  useEffect(() => {
    if (!chatListRef.current) return;

    const handleScroll = () => {
      // Ignora scrolling programmatico
      if (scrollingToBottomRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = chatListRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Se l'utente è in fondo alla chat (entro 50px) e ci sono nuovi messaggi non letti
      if (distanceFromBottom < 50 && notificationId && newMessage) {
        // Usa toggleReadUnread dal context per aggiornare sia il backend che il Redux
        toggleReadUnread(notificationId, true).then(() => {
          // Dopo aver aggiornato lo stato, forza un refresh della notifica
          fetchNotificationById(notificationId, true).then(() => {
            // Emetti un evento per aggiornare la sidebar
            document.dispatchEvent(
              new CustomEvent("notification-updated", {
                detail: { notificationId },
              }),
            );
            // Notifica il componente padre che siamo arrivati in fondo
            if (onScrollToBottom) {
              onScrollToBottom();
            }
          });
        });
      }

      // Se l'utente ha scrollato significativamente verso l'alto
      if (distanceFromBottom > 150 && !userHasScrolledRef.current) {
        userHasScrolledRef.current = true;
        setUserHasScrolled(true);
        setShowScrollButton(true);
      }
      // Se l'utente è tornato al fondo
      else if (distanceFromBottom < 50 && userHasScrolledRef.current) {
        userHasScrolledRef.current = false;
        setUserHasScrolled(false);
        setShowScrollButton(false);
        // Notifica il componente padre che siamo tornati in fondo
        if (onScrollToBottom) {
          onScrollToBottom();
        }
      }
    };

    // Listener per detect del mousewheel verso l'alto
    const handleWheel = (e) => {
      if (scrollingToBottomRef.current) return;

      // Scrolling verso l'alto
      if (e.deltaY < 0) {
        userHasScrolledRef.current = true;
        setUserHasScrolled(true);
        setShowScrollButton(true);
      }
    };

    // Aggiungi listeners
    chatListRef.current.addEventListener("scroll", handleScroll, {
      passive: true,
    });
    chatListRef.current.addEventListener("wheel", handleWheel, {
      passive: true,
    });

    return () => {
      if (chatListRef.current) {
        chatListRef.current.removeEventListener("scroll", handleScroll);
        chatListRef.current.removeEventListener("wheel", handleWheel);
      }
    };
  }, [
    chatListRef.current,
    newMessage,
    notificationId,
    toggleReadUnread,
    fetchNotificationById,
    onScrollToBottom,
  ]);

  // Funzione per determinare se un messaggio contiene un sondaggio
  const isPollMessage = (message) => {
    return (
      message &&
      ((message.message && message.message.startsWith("📊")) ||
        message.pollId !== undefined)
    );
  };

  // Carica gli allegati della notifica
  useEffect(() => {
    if (notificationId && !messageAttachments[notificationId] && !hasLeftChat) {
      setLoading(true);
      getNotificationAttachments(notificationId)
        .then((attachments) => {
          if (attachments) {
            // Organizza gli allegati per ID messaggio
            const attachmentsByMessageId = {};

            // Verifica che attachments sia un array prima di chiamare forEach
            if (Array.isArray(attachments)) {
              attachments.forEach((att) => {
                if (att.MessageID) {
                  attachmentsByMessageId[att.MessageID] =
                    attachmentsByMessageId[att.MessageID] || [];
                  attachmentsByMessageId[att.MessageID].push(att);
                }
              });
            } else if (typeof attachments === "object") {
              // Se attachments è un oggetto, converte in formato compatibile
              Object.entries(attachments).forEach(([messageId, atts]) => {
                if (Array.isArray(atts)) {
                  attachmentsByMessageId[messageId] = atts;
                }
              });
            }

            setMessageAttachments((prev) => ({
              ...prev,
              [notificationId]: attachmentsByMessageId,
            }));
          }
        })
        .catch((error) => {
          console.error("Error loading attachments:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [notificationId, hasLeftChat, getNotificationAttachments]);

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

        scheduleReactionsFetch();
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
  }, [chatListRef.current, localMessages]);

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
    }, 300),
    [messageReactionsCache],
  );

  // Carica le reazioni in batch
  const batchLoadReactions = useCallback(
    async (messageIds) => {
      if (!messageIds || messageIds.length === 0 || !getMessageReactions)
        return;

      const unrequestedIds = messageIds.filter(
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
                ),
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

  // Funzione per caricare i sondaggi
  const loadPolls = useCallback(
    debounce(async () => {
      if (pollsRequestedRef.current || !notificationId || loadingPolls) return;

      setLoadingPolls(true);
      pollsRequestedRef.current = true;

      try {
        const allPolls = await getNotificationPolls(notificationId);

        if (allPolls && allPolls.length > 0) {
          const pollsMap = {};

          localMessages.forEach((message) => {
            if (isPollMessage(message)) {
              if (message.pollId) {
                const poll = allPolls.find((p) => p.PollID === message.pollId);
                if (poll) {
                  pollsMap[message.messageId] = poll;
                }
              } else {
                let matchingPoll = allPolls.find(
                  (p) => p.MessageID === message.messageId,
                );

                if (!matchingPoll && message.message) {
                  const titleMatch = message.message.match(
                    /\*\*Sondaggio creato\*\*: "([^"]+)"/,
                  );
                  if (titleMatch && titleMatch[1]) {
                    const pollTitle = titleMatch[1];
                    matchingPoll = allPolls.find(
                      (p) => p.Question === pollTitle,
                    );
                  }
                }

                if (matchingPoll) {
                  pollsMap[message.messageId] = matchingPoll;
                }
              }
            }
          });

          setPolls(pollsMap);
        }
      } catch (error) {
        console.error("Error loading polls:", error);
      } finally {
        setLoadingPolls(false);
      }
    }, 300),
    [notificationId, localMessages, getNotificationPolls],
  );

  // Carica i sondaggi quando cambia la notifica
  useEffect(() => {
    if (notificationId) {
      pollsRequestedRef.current = false;
      processedPollMessagesRef.current = new Set();

      const hasPollMessages = localMessages.some((message) =>
        isPollMessage(message),
      );

      if (hasPollMessages && !pollsRequestedRef.current) {
        if (pollRequestTimeoutRef.current) {
          clearTimeout(pollRequestTimeoutRef.current);
        }

        pollRequestTimeoutRef.current = setTimeout(() => {
          loadPolls();
        }, 300);
      }
    }

    return () => {
      if (pollRequestTimeoutRef.current) {
        clearTimeout(pollRequestTimeoutRef.current);
      }
    };
  }, [notificationId, localMessages, loadPolls]);

  // Reset quando cambia la notifica
  useEffect(() => {
    processedPollMessagesRef.current = new Set();
    pollsRequestedRef.current = false;
    fetchedReactionsRef.current = new Set();
    setMessageReactionsCache({});
    pendingReactionsRequestsRef.current = {};
    visibleMessagesRef.current = new Set();
  }, [notificationId]);

  // Chiudi i menu contestuali quando si fa clic all'esterno
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        editingMessageId !== null &&
        !event.target.closest(".message-menu") &&
        !event.target.closest(".message-actions-menu")
      ) {
        setEditingMessageId(null);
      }

      if (
        avatarContextMenu !== null &&
        !event.target.closest(".avatar-context-menu")
      ) {
        setAvatarContextMenu(null);
      }

      if (
        colorPickerMessageId !== null &&
        !event.target.closest(".color-picker-area")
      ) {
        setColorPickerMessageId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editingMessageId, avatarContextMenu, colorPickerMessageId]);

  // Funzione per modificare localmente i messaggi
  const updateMessagesLocally = useCallback((messageId, updateFn) => {
    setLocalMessages((prevMessages) => {
      const messageIndex = prevMessages.findIndex(
        (msg) => msg.messageId === messageId,
      );
      if (messageIndex === -1) return prevMessages;

      const updatedMessages = [...prevMessages];
      updatedMessages[messageIndex] = updateFn(updatedMessages[messageIndex]);

      return updatedMessages;
    });
  }, []);

  // Funzione per gestire il click sull'avatar
  const handleAvatarClick = (userId, event) => {
    if (hasLeftChat) return;

    event.stopPropagation();

    const user = users.find((u) => u.userId === userId);
    if (!user) return;

    setAvatarContextMenu({
      user,
      position: {
        x: event.clientX,
        y: event.clientY,
      },
    });
  };

  // Funzione per avviare una nuova chat con un utente
  const handleStartChatWithUser = (userId) => {
    if (hasLeftChat) return;

    const event = new CustomEvent("start-chat-with-user", {
      detail: { userId },
    });
    document.dispatchEvent(event);

    setAvatarContextMenu(null);
  };

  // Funzione per menzionare un utente
  const handleMentionUser = (user) => {
    if (hasLeftChat) return;

    const event = new CustomEvent("mention-user", {
      detail: {
        userId: user.userId,
        username: `${user.firstName} ${user.lastName}`,
      },
    });
    document.dispatchEvent(event);

    setAvatarContextMenu(null);
  };

  // Funzione per rispondere a un messaggio
  const handleReplyClick = (message) => {
    if (hasLeftChat) return;

    if (onReply) {
      onReply(message);
    }
    setEditingMessageId(null);
  };

  // Funzione per scrollare a un messaggio citato
  const handlePreviewClick = (messageId) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Funzione per aprire il modal di modifica messaggio
  const handleEditMessage = (message) => {
    if (hasLeftChat) return;

    setMessageToEdit(message);
    setShowEditModal(true);
    setEditingMessageId(null);
  };

  // Funzione per visualizzare la cronologia delle versioni di un messaggio
  const handleViewVersionHistory = async (messageId) => {
    if (hasLeftChat) return; // Don't allow viewing history if user has left the chat

    try {
      setLoadingVersions(true);

      const result = await getMessageVersionHistory(messageId);

      if (result) {
        // Format the data to match what the component expects
        setSelectedMessageVersions({
          currentMessage: result.currentMessage || result,
          versionHistory: result.versionHistory || [],
        });

        setShowVersionHistory(true);
      } else {
        console.error("Error fetching message versions:", result);
        swal.fire(
          "Errore",
          "Impossibile recuperare la cronologia del messaggio",
          "error",
        );
      }
    } catch (error) {
      console.error("Error fetching message versions:", error);
      swal.fire(
        "Errore",
        "Impossibile recuperare la cronologia del messaggio",
        "error",
      );
    } finally {
      setLoadingVersions(false);
    }
  };

  // Funzione per eliminare un messaggio
  const handleDeleteMessage = async (messageId) => {
    if (hasLeftChat) return;

    try {
      const { isConfirmed } = await swal.fire({
        title: "Sei sicuro?",
        text: "Il messaggio verrà eliminato per tutti. Questa azione non può essere annullata.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sì, elimina!",
        cancelButtonText: "Annulla",
      });

      if (!isConfirmed) return;

      updateMessagesLocally(messageId, (msg) => ({
        ...msg,
        message: "Messaggio eliminato dall'utente",
        cancelled: "1",
      }));

      swal.fire({
        title: "Eliminazione in corso...",
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          swal.showLoading();
        },
      });

      const token = localStorage.getItem("token");
      const response = await axios.delete(
        `${config.API_BASE_URL}/messages/${messageId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.data && response.data.success) {
        setEditingMessageId(null);

        if (response.data.notificationId) {
          await fetchNotificationById(response.data.notificationId);
        }

        swal.fire({
          icon: "success",
          title: "Eliminato!",
          text: "Il messaggio è stato eliminato con successo.",
          timer: 1500,
          showConfirmButton: false,
        });

        document.dispatchEvent(
          new CustomEvent("message-deleted", {
            detail: {
              messageId,
              notificationId: response.data.notificationId,
            },
          }),
        );
      } else {
        throw new Error(
          response.data?.message ||
            "Errore durante l'eliminazione del messaggio",
        );
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      swal.fire({
        icon: "error",
        title: "Errore",
        text:
          error.message ||
          "Si è verificato un errore durante l'eliminazione del messaggio",
      });
    }
  };

  // Funzione per scaricare un allegato
  const handleAttachmentDownload = (attachment) => {
    if (hasLeftChat) return;

    try {
      downloadNotificationAttachment(
        attachment.AttachmentID,
        attachment.FileName,
      );
    } catch (error) {
      console.error("Error downloading attachment:", error);
      swal.fire({
        title: "Errore",
        text: "Impossibile scaricare il file",
        icon: "error",
        timer: 2000,
      });
    }
  };

  // Funzione per gestire il pulsante colore
  const handleColorButtonClick = (messageId, event) => {
    if (hasLeftChat) return;

    event.stopPropagation();
    setColorPickerMessageId(
      messageId === colorPickerMessageId ? null : messageId,
    );
    setEditingMessageId(null);
  };

  // Funzione per visualizzare le informazioni sui lettori di un messaggio
  const handleInfoClick = (messageId) => {
    const readers = readByUsers.find((readers) =>
      readers.some((reader) => reader.messageId === messageId),
    );
    if (readers) {
      const readerList = readers
        .map(
          (reader) =>
            `${reader.firstName} ${reader.lastName} - ${formatDate(
              reader.ReceiverReadedDate,
            )} ${formatTime(reader.ReceiverReadedDate)}`,
        )
        .join("<br/>");

      swal.fire({
        title: "Messaggio letto da:",
        html: readerList || "Nessuno ha letto questo messaggio.",
        icon: "info",
        confirmButtonText: "OK",
      });
    }
  };

  // Gestione aggiornamenti sondaggi
  const handlePollUpdate = async (updatedPoll) => {
    if (!updatedPoll || !updatedPoll.PollID) return;

    setPolls((prev) => ({
      ...prev,
      [updatedPoll.MessageID]: updatedPoll,
    }));
  };

  // Gestione delle reazioni ai messaggi
  const handleReactionSelect = async (messageId, emoji) => {
    if (hasLeftChat) return Promise.resolve(); // No reactions if user left chat

    try {
      // Salva la posizione di scroll corrente
      const currentScrollPosition = chatListRef.current
        ? chatListRef.current.scrollTop
        : 0;

      setLoading(true); // Show loading indicator while processing

      // Check if toggleMessageReaction exists before calling it
      if (!toggleMessageReaction) {
        console.error("toggleMessageReaction function not available");
        throw new Error("toggleMessageReaction function not available");
      }

      // Get the current message to update locally
      const currentMessage = localMessages.find(
        (msg) => msg.messageId === messageId,
      );
      if (currentMessage) {
        const currentReactions = messageReactionsCache[messageId] || [];

        const userHasReaction = currentReactions.some(
          (r) => r.UserID === currentUser?.userId && r.ReactionType === emoji,
        );

        // Update the local cache optimistically
        if (userHasReaction) {
          setMessageReactionsCache((prev) => ({
            ...prev,
            [messageId]: (prev[messageId] || []).filter(
              (r) =>
                !(r.UserID === currentUser?.userId && r.ReactionType === emoji),
            ),
          }));
        } else {
          setMessageReactionsCache((prev) => ({
            ...prev,
            [messageId]: [
              ...(prev[messageId] || []),
              {
                ReactionID: `temp_${Date.now()}`,
                UserID: currentUser?.userId,
                ReactionType: emoji,
                UserName: `${currentUser?.firstName} ${currentUser?.lastName}`,
              },
            ],
          }));
        }
      }

      // Toggle the reaction
      await toggleMessageReaction(messageId, emoji);

      // Trigger update event
      const event = new CustomEvent("message-reaction-updated", {
        detail: {
          messageId: messageId,
          notificationId: notificationId,
        },
      });
      document.dispatchEvent(event);

      // Ripristina la posizione di scroll dopo un breve ritardo
      setTimeout(() => {
        if (chatListRef.current) {
          chatListRef.current.scrollTop = currentScrollPosition;
        }
      }, 50);

      return Promise.resolve();
    } catch (error) {
      console.error("Error toggling reaction:", error);
      return Promise.reject(error);
    } finally {
      setLoading(false);
    }
  };

  // Funzione per lo scroll manuale al fondo
  const handleScrollToBottom = () => {
    if (chatListRef?.current) {
      scrollingToBottomRef.current = true;
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
      setShowScrollButton(false);
      setUserHasScrolled(false);
      userHasScrolledRef.current = false;

      // Aggiungo la logica per marcare i messaggi come letti
      if (notificationId && newMessage) {
        toggleReadUnread(notificationId, true).then(() => {
          fetchNotificationById(notificationId, true).then(() => {
            document.dispatchEvent(
              new CustomEvent("notification-updated", {
                detail: { notificationId },
              }),
            );
            // Notifica il componente padre che siamo arrivati in fondo
            if (onScrollToBottom) {
              onScrollToBottom();
            }
          });
        });
      }

      setTimeout(() => {
        scrollingToBottomRef.current = false;
      }, 100);
    }
  };

  // Trova il messaggio originale per una risposta
  const findOriginalMessage = (replyToMessageId) => {
    return localMessages.find(
      (message) => message.messageId == replyToMessageId,
    );
  };

  // Raggruppa le reazioni per tipo
  const groupReactionsByType = (reactions) => {
    const grouped = {};

    if (!reactions || !Array.isArray(reactions) || reactions.length === 0) {
      return {};
    }

    reactions.forEach((reaction) => {
      if (!grouped[reaction.ReactionType]) {
        grouped[reaction.ReactionType] = [];
      }
      grouped[reaction.ReactionType].push(reaction);
    });

    return grouped;
  };

  // Funzione per determinare il colore del testo in base al contrasto
  const getContrastTextColor = (bgColor) => {
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.5 ? "#000000" : "#FFFFFF";
  };

  // Funzione per renderizzare l'indicatore di messaggio modificato
  const renderEditedIndicator = (message, isCurrentUserMessage) => {
    if (!message.isEdited == "1") return null;

    return (
      <div
        className={`text-xs ${isCurrentUserMessage == "1" ? "text-white/70" : "text-gray-400"} mt-1 flex items-center`}
      >
        <Clock className="h-3 w-3 mr-1" />
        <span>
          Modificato
          {message.lastEditDate
            ? ` ${formatTimeAgo(message.lastEditDate)}`
            : ""}
          {message.editCount > 1 ? ` (${message.editCount} volte)` : ""}
        </span>
      </div>
    );
  };

  // Funzione per renderizzare il menu contestuale dell'avatar
  const renderAvatarContextMenu = () => {
    if (!avatarContextMenu) return null;

    const { user, position } = avatarContextMenu;

    return (
      <div
        className="avatar-context-menu absolute bg-white rounded-md shadow-lg z-50 p-2 min-w-[180px]"
        style={{
          top: `${position.y}px`,
          left: `${position.x}px`,
          transform: "translate(-50%, 10px)",
        }}
      >
        <div className="flex flex-col">
          <div className="flex items-center p-2 border-b border-gray-200">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{
                backgroundColor: generateAvatarColor(
                  `${user.firstName} ${user.lastName}`,
                ),
              }}
            >
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="ml-2">
              <div className="text-sm font-medium">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs text-gray-500">
                {user.email || "Nessuna email"}
              </div>
            </div>
          </div>

          <button
            className="flex items-center p-2 hover:bg-gray-100 rounded-md mt-1 text-sm"
            onClick={() => handleStartChatWithUser(user.userId)}
            title="Nuova chat"
          >
            <MessageSquare className="h-4 w-4 mr-2 text-blue-500" />
            <span>Nuova chat</span>
          </button>

          <button
            className="flex items-center p-2 hover:bg-gray-100 rounded-md text-sm"
            onClick={() => handleMentionUser(user)}
            title="Menziona nella risposta"
          >
            <User className="h-4 w-4 mr-2 text-green-500" />
            <span>Menziona</span>
          </button>
        </div>
      </div>
    );
  };

  // Funzione helper per evidenziare le menzioni nel testo
  const highlightMentions = (line, usernameMention) => {
    if (!line) return "";

    const words = line.split(" ");
    return words.map((word, index) => {
      if (word.startsWith("@")) {
        const mention = word.slice(1);
        const isCurrentUser = mention === usernameMention;
        return (
          <span
            key={index}
            style={{
              color: isCurrentUser ? "#ffa922" : "inherit",
            }}
          >
            {mention + (index < words.length - 1 ? " " : "")}
          </span>
        );
      }
      return word + (index < words.length - 1 ? " " : "");
    });
  };

  // Funzione per decodificare le entità HTML
  const decodeHTMLEntities = (text) => {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  };

  // Funzione per renderizzare il testo del messaggio con eventuali menzioni
  const renderMessageText = (messageText, usernameMention, isEdited) => {
    if (!messageText) return "";

    // Prima decodifica tutte le entità HTML nel testo del messaggio
    const decodedText = decodeHTMLEntities(messageText);

    // Poi dividi per interruzioni di riga e renderizza
    const renderedText = decodedText.split("\n").map((line, i) => {
      const processedLine = highlightMentions(line, usernameMention);

      return (
        <React.Fragment key={i}>
          {processedLine}
          {i < decodedText.split("\n").length - 1 && <br />}
        </React.Fragment>
      );
    });

    if (isEdited == "1") {
      return <div className="edited-message-content">{renderedText}</div>;
    }

    return renderedText;
  };

  // Funzione per raggruppare i messaggi per data
  const groupMessagesByDate = (messages) => {
    if (!Array.isArray(messages)) return {};

    const groups = {};
    messages.forEach((message) => {
      const dateKey = formatDate(message.tbCreated);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    return groups;
  };

  // Helper per formattare la data
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Helper per formattare l'ora
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Helper per formattare il tempo trascorso
  const formatTimeAgo = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffSec = Math.floor(diffMs / 1000);

      if (diffSec < 60) return "poco fa";

      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} min fa`;

      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours} ore fa`;

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "ieri";
      if (diffDays < 7) return `${diffDays} giorni fa`;

      return formatDate(dateString);
    } catch (e) {
      return "";
    }
  };

  // Componente per renderizzare l'intestazione della data
  const renderDate = (date) => {
    return (
      <div className="chat-date-separator sticky top-0 z-1 bg-white/80">
        <span>{date}</span>
      </div>
    );
  };

  // Estrai le informazioni sui lettori dai messaggi
  const readByUsers = localMessages.map((message) => {
    let users = [];
    try {
      if (
        typeof message.readedByUsers === "string" &&
        message.readedByUsers.trim() !== ""
      ) {
        let sanitizedData = message.readedByUsers
          .trim()
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

        if (sanitizedData.startsWith("{") && sanitizedData.includes("},{")) {
          sanitizedData = `[${sanitizedData}]`;
        }

        if (sanitizedData.startsWith("{") || sanitizedData.startsWith("[")) {
          const parsedData = JSON.parse(sanitizedData);

          if (Array.isArray(parsedData) && parsedData.length > 0) {
            users = parsedData.map((user) => ({
              ...user,
              messageId: message.messageId,
            }));
          } else if (parsedData && typeof parsedData === "object") {
            users = [
              {
                ...parsedData,
                messageId: message.messageId,
              },
            ];
          }
        }
      }
    } catch (e) {
      console.error(
        "Error parsing readByUsers JSON:",
        e,
        message.readedByUsers,
      );
    }
    return users;
  });

  // Gestisco l'evento di filtro per evidenziare i messaggi
  useEffect(() => {
    const handleFilterApplied = (event) => {
      const { messageIds } = event.detail;

      // Verifica che messageIds sia un array valido
      if (Array.isArray(messageIds)) {
        setHighlightedMessageIds(new Set(messageIds));
        setIsHighlightActive(true);
        setCurrentHighlightedIndex(0);

        if (onScrollToBottom) {
          onScrollToBottom();
        }
      }
    };

    const handleFilterReset = () => {
      setHighlightedMessageIds(new Set());
      setIsHighlightActive(false);
      setCurrentHighlightedIndex(0);
    };

    document.addEventListener("chat-filter-applied", handleFilterApplied);
    document.addEventListener("chat-reset-filters", handleFilterReset);

    return () => {
      document.removeEventListener("chat-filter-applied", handleFilterApplied);
      document.removeEventListener("chat-reset-filters", handleFilterReset);
    };
  }, []);

  // Aggiungo un nuovo effetto per gestire la selezione dei risultati di ricerca
  useEffect(() => {
    const handleSearchResultSelected = (event) => {
      const { messageId } = event.detail;

      if (messageId && chatListRef.current) {
        // Trova l'elemento del messaggio
        const messageElement = document.getElementById(`message-${messageId}`);

        if (messageElement) {
          // Calcola la posizione dell'elemento rispetto al container
          const containerRect = chatListRef.current.getBoundingClientRect();
          const messageRect = messageElement.getBoundingClientRect();

          // Calcola la posizione di scroll necessaria per centrare il messaggio
          // Tenendo conto della barra di navigazione (48px) e un po' di spazio extra
          const scrollTop =
            messageRect.top -
            containerRect.top +
            chatListRef.current.scrollTop -
            80;

          // Esegui lo scroll con animazione smooth
          chatListRef.current.scrollTo({
            top: scrollTop,
            behavior: "smooth",
          });

          // Aggiungi una classe temporanea per evidenziare il messaggio
          messageElement.classList.add("current-highlight");

          // Rimuovi la classe dopo l'animazione
          setTimeout(() => {
            messageElement.classList.remove("current-highlight");
          }, 2000);
        }
      }
    };

    document.addEventListener(
      "chat-search-result-selected",
      handleSearchResultSelected,
    );

    return () => {
      document.removeEventListener(
        "chat-search-result-selected",
        handleSearchResultSelected,
      );
    };
  }, []);

  // Mostra un banner informativo se l'utente ha abbandonato la chat
  if (hasLeftChat && localMessages.length > 0) {
    return (
      <div className="flex-1 flex flex-col relative" style={{ height: "100%" }}>
        <div
          className="flex-1 overflow-y-auto chat-list-container"
          ref={chatListRef}
        >
          <AnimatePresence>
            {/* Lista messaggi raggruppati per data in modalità sola lettura */}
            {Object.entries(groupMessagesByDate(localMessages)).map(
              ([date, dateMessages]) => (
                <React.Fragment key={date}>
                  {renderDate(date)}

                  {dateMessages.map((message, index) => {
                    const originalMessage = findOriginalMessage(
                      message.replyToMessageId,
                    );
                    const isCurrentUserMessage = message.selectedUser;
                    const senderName = isCurrentUserMessage
                      ? "Tu"
                      : message.senderName;
                    const messageColor = message.messageColor;
                    const containsPoll = isPollMessage(message);
                    const isHighlighted = highlightedMessageIds.has(
                      message.messageId,
                    );

                    return (
                      <motion.div
                        key={message.messageId}
                        ref={(el) =>
                          (messageRefs.current[message.messageId] = el)
                        }
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "flex p-2 mb-2 relative",
                          isCurrentUserMessage
                            ? "justify-end"
                            : "justify-start",
                          isHighlighted
                            ? "highlighted-message bg-yellow-50 border-l-4 border-yellow-400 shadow-sm"
                            : "",
                          message.messageId === animatedEditId
                            ? "just-edited"
                            : "",
                          containsPoll ? "poll-message" : "",
                        )}
                        id={`message-${message.messageId}`}
                      >
                        {/* Avatar per messaggi ricevuti */}
                        {!isCurrentUserMessage == "1" && (
                          <MessageAvatar
                            senderName={message.senderName}
                            onClick={(e) =>
                              handleAvatarClick(message.senderId, e)
                            }
                          />
                        )}

                        <div className="flex flex-col max-w-[70%]">
                          {/* Se è un messaggio con risposta, mostra la risposta */}
                          {originalMessage && (
                            <div
                              className="message-quote cursor-pointer mb-1"
                              onClick={() =>
                                handlePreviewClick(originalMessage.messageId)
                              }
                            >
                              <div className="text-sm font-semibold text-gray-700">
                                {originalMessage.senderName}
                              </div>
                              <div className="text-xs text-gray-700 line-clamp-2">
                                {originalMessage.message}
                              </div>
                            </div>
                          )}

                          {/* Bolla del messaggio */}
                          <div className="flex items-center gap-2">
                            {/* Bandierina a sinistra per ricevuti, a destra per inviati */}
                            {isCurrentUserMessage == "0" && messageColor && (
                              <span
                                className="message-flag animate-flag"
                                style={{ color: messageColor }}
                                title={
                                  messageColor
                                    ? `Colore: ${messageColor}`
                                    : "Nessun colore"
                                }
                              >
                                <FaFlag />
                              </span>
                            )}
                            <div
                              className={cn(
                                "message-bubble relative",
                                isCurrentUserMessage == "1"
                                  ? "sent"
                                  : "received",
                              )}
                              style={
                                messageColor
                                  ? {
                                      backgroundColor: messageColor + "15",
                                      color: getContrastTextColor(messageColor),
                                      boxShadow: `0 2px 8px ${messageColor}33`,
                                    }
                                  : {}
                              }
                            >
                              {/* Contenuto del messaggio */}
                              <div
                                style={{
                                  paddingTop: "15px",
                                  paddingBottom: "10px",
                                  fontSize: "1rem",
                                }}
                              >
                                {/* Verifica se è un messaggio di sondaggio */}
                                {isPollMessage(message) ? (
                                  <div className="message-with-poll">
                                    {polls[message.messageId] ? (
                                      <PollMessage
                                        poll={polls[message.messageId]}
                                        onUpdate={handlePollUpdate}
                                        showResults={false}
                                        currentUserId={currentUser?.userId}
                                      />
                                    ) : (
                                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
                                        <BarChart className="h-5 w-5 text-blue-500 mr-2 animate-pulse" />
                                        <span className="text-gray-500">
                                          Caricamento sondaggio...
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  // Usa renderMessageText per gestire i ritorni a capo
                                  renderMessageText(
                                    message.message,
                                    message.usernameMention,
                                    message.isEdited,
                                  )
                                )}
                              </div>

                              {/* Allegati del messaggio */}
                              {messageAttachments[notificationId]?.[
                                message.messageId
                              ] && (
                                <MessageAttachments
                                  attachments={
                                    messageAttachments[notificationId][
                                      message.messageId
                                    ]
                                  }
                                  onClick={(file) => setSelectedFile(file)}
                                  onDownload={handleAttachmentDownload}
                                />
                              )}

                              {/* Componente per le reazioni con cache migliorata */}
                              <div
                                className={`message-reactions flex flex-wrap gap-1 mt-1 ${loading ? "opacity-60" : ""}`}
                              >
                                {/* Ottieni le reazioni dalla cache invece di chiamare l'API ogni volta */}
                                {Object.entries(
                                  groupReactionsByType(
                                    getReactionsForMessage(message.messageId),
                                  ),
                                ).map(([reactionType, reactors]) => {
                                  // Trova la reazione dell'utente corrente, se presente
                                  const userReaction = reactors.find(
                                    (r) => r.UserID === currentUser?.userId,
                                  );
                                  const hasCurrentUserReacted = !!userReaction;

                                  // Crea una lista di utenti per il tooltip
                                  const userNames = reactors
                                    .map((r) => r.UserName)
                                    .join(", ");

                                  return (
                                    <button
                                      key={reactionType}
                                      className={`reaction-badge flex items-center rounded-full px-1.5 py-0.5 text-xs ${
                                        hasCurrentUserReacted
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-gray-100 hover:bg-gray-200 text-black"
                                      }`}
                                      onClick={() =>
                                        handleReactionSelect(
                                          message.messageId,
                                          reactionType,
                                        )
                                      }
                                      title={userNames}
                                      disabled={loading}
                                    >
                                      <span className="mr-1">
                                        {reactionType}
                                      </span>
                                      <span className="reaction-count">
                                        {reactors.length}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Indicatore di messaggi letti */}
                              {isCurrentUserMessage == "1" &&
                                readByUsers[index]?.length > 0 && (
                                  <div
                                    className="absolute bottom-1 right-2 text-xs text-gray-500 cursor-pointer"
                                    onClick={() =>
                                      handleInfoClick(message.messageId)
                                    }
                                  >
                                    <div className="bi bi- text-white"></div>
                                  </div>
                                )}
                            </div>
                            {isCurrentUserMessage == "1" && messageColor && (
                              <span
                                className="message-flag animate-flag"
                                style={{ color: messageColor }}
                                title={
                                  messageColor
                                    ? `Colore: ${messageColor}`
                                    : "Nessun colore"
                                }
                              >
                                <FaFlag />
                              </span>
                            )}
                          </div>

                          {/* Timestamp e stato modifica */}
                          <div
                            className={cn(
                              "message-timestamp",
                              isCurrentUserMessage == "1"
                                ? "text-right"
                                : "text-left",
                            )}
                          >
                            {formatTime(message.tbCreated)}
                            {message.isEdited == "1" && (
                              <span className="ml-1 text-gray-400 text-[10px]">
                                ✎
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </React.Fragment>
              ),
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative" style={{ height: "100%" }}>
      {isHighlightActive && (
        <div className="highlight-navigation">
          <div className="flex items-center justify-between w-full px-4">
            <span className="font-medium">
              {highlightedMessageIds.size} messaggi trovati
            </span>

            {highlightedMessageIds.size > 0 && (
              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm mx-auto">
                <button
                  onClick={() => {
                    const messageIdsArray = Array.from(highlightedMessageIds);
                    const newIndex =
                      (currentHighlightedIndex - 1 + messageIdsArray.length) %
                      messageIdsArray.length;
                    setCurrentHighlightedIndex(newIndex);
                    document.dispatchEvent(
                      new CustomEvent("chat-search-result-selected", {
                        detail: { messageId: messageIdsArray[newIndex] },
                      }),
                    );
                  }}
                  className="p-1 rounded-full hover:bg-blue-50 transition-colors"
                  title="Messaggio precedente (↑)"
                >
                  <ChevronDown className="h-4 w-4 text-blue-600" />
                </button>
                <span className="text-xs font-medium text-blue-700 min-w-[40px] text-center">
                  {currentHighlightedIndex + 1}/{highlightedMessageIds.size}
                </span>
                <button
                  onClick={() => {
                    const messageIdsArray = Array.from(highlightedMessageIds);
                    const newIndex =
                      (currentHighlightedIndex + 1) % messageIdsArray.length;
                    setCurrentHighlightedIndex(newIndex);
                    document.dispatchEvent(
                      new CustomEvent("chat-search-result-selected", {
                        detail: { messageId: messageIdsArray[newIndex] },
                      }),
                    );
                  }}
                  className="p-1 rounded-full hover:bg-blue-50 transition-colors"
                  title="Messaggio successivo (↓)"
                >
                  <ChevronUp className="h-4 w-4 text-blue-600" />
                </button>
              </div>
            )}

            <button
              onClick={() => {
                document.dispatchEvent(new CustomEvent("chat-reset-filters"));
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
            >
              Rimuovi evidenziazione
            </button>
          </div>
        </div>
      )}

      <div className="chat-list-container">
        {loading ? (
          <Spinner />
        ) : (
          <div
            className="flex-1 overflow-y-auto chat-list-container"
            ref={chatListRef}
          >
            <AnimatePresence>
              {localMessages.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">
                  Inizia una nuova conversazione!
                </div>
              ) : (
                Object.entries(groupMessagesByDate(localMessages)).map(
                  ([date, dateMessages]) => (
                    <React.Fragment key={date}>
                      {renderDate(date)}

                      {dateMessages.map((message, index) => {
                        const readers = readByUsers[index];
                        const originalMessage = findOriginalMessage(
                          message.replyToMessageId,
                        );
                        const isCurrentUserMessage = message.selectedUser; // Flag per verificare se il messaggio è dell'utente corrente
                        const senderName = isCurrentUserMessage
                          ? "Tu"
                          : message.senderName;
                        const messageColor = message.messageColor; // Il colore del messaggio
                        const isHighlighted = highlightedMessageIds.has(
                          message.messageId,
                        );
                        const containsPoll = isPollMessage(message);
                        // Aggiungi una classe se il messaggio è stato appena modificato
                        const isJustEdited =
                          animatedEditId === message.messageId;

                        return (
                          <motion.div
                            key={message.messageId}
                            ref={(el) =>
                              (messageRefs.current[message.messageId] = el)
                            }
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                              "flex p-2 mb-2 relative",
                              isCurrentUserMessage
                                ? "justify-end"
                                : "justify-start",
                              isHighlighted
                                ? "highlighted-message bg-yellow-50 border-l-4 border-yellow-400 shadow-sm"
                                : "",
                              message.messageId === animatedEditId
                                ? "just-edited"
                                : "",
                              containsPoll ? "poll-message" : "",
                            )}
                            id={`message-${message.messageId}`}
                          >
                            {/* Avatar per messaggi ricevuti */}
                            {isCurrentUserMessage == "0" && (
                              <MessageAvatar
                                senderName={message.senderName}
                                onClick={(e) =>
                                  handleAvatarClick(message.senderId, e)
                                }
                              />
                            )}

                            <div className="flex flex-col max-w-[70%]">
                              {/* Se è un messaggio con risposta, mostra la risposta */}
                              {originalMessage && (
                                <div
                                  className="message-quote cursor-pointer mb-1"
                                  onClick={() =>
                                    handlePreviewClick(
                                      originalMessage.messageId,
                                    )
                                  }
                                >
                                  <div className="text-sm font-semibold text-gray-700">
                                    {originalMessage.senderName}
                                  </div>

                                  <div className="text-xs text-gray-700 line-clamp-2">
                                    {originalMessage.message}
                                  </div>
                                </div>
                              )}

                              {/* Bolla del messaggio */}
                              <div className="flex items-center gap-2">
                                {/* Bandierina a sinistra per ricevuti, a destra per inviati */}
                                {isCurrentUserMessage == "0" &&
                                  messageColor && (
                                    <span
                                      className="message-flag animate-flag"
                                      style={{ color: messageColor }}
                                      title={
                                        messageColor
                                          ? `Colore: ${messageColor}`
                                          : "Nessun colore"
                                      }
                                    >
                                      <FaFlag />
                                    </span>
                                  )}

                                {/* Timestamp per messaggi dell'utente corrente */}
                                {isCurrentUserMessage == "1" && (
                                  <div
                                    className={cn(
                                      "message-timestamp",
                                      isCurrentUserMessage == "0"
                                        ? "text-right"
                                        : "text-left",
                                    )}
                                  >
                                    {formatTime(message.tbCreated)}
                                    {message.isEdited == "1" && (
                                      <span className="ml-1 text-gray-400 text-[10px]">
                                        ✎
                                      </span>
                                    )}
                                  </div>
                                )}

                                <div
                                  className={cn(
                                    "message-bubble relative",
                                    isCurrentUserMessage == "1"
                                      ? "sent"
                                      : "received",
                                  )}
                                  style={
                                    messageColor
                                      ? {
                                          backgroundColor: messageColor + "15",
                                          color:
                                            getContrastTextColor(messageColor),
                                          boxShadow: `0 2px 8px ${messageColor}33`,
                                        }
                                      : {}
                                  }
                                >
                                  {/* Menu button for message actions - improved and more visible */}
                                  <button
                                    className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${
                                      editingMessageId === message.messageId
                                        ? "bg-gray-200 text-gray-800"
                                        : isCurrentUserMessage == "1"
                                          ? "text-white/70 hover:text-white hover:bg-white/20"
                                          : "text-gray-500/70 hover:text-gray-700 hover:bg-gray-200/50"
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingMessageId(
                                        editingMessageId === message.messageId
                                          ? null
                                          : message.messageId,
                                      );
                                    }}
                                    title="Opzioni messaggio"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </button>

                                  {/* Message Actions Menu (Improved) */}
                                  <AnimatePresence>
                                    {editingMessageId === message.messageId && (
                                      <div
                                        className="relative"
                                        style={{ zIndex: 1000 }}
                                      >
                                        <MessageActionsMenu
                                          isOpen={true}
                                          onClose={() =>
                                            setEditingMessageId(null)
                                          }
                                          onReply={() =>
                                            handleReplyClick(message)
                                          }
                                          onColorSelect={(e) =>
                                            handleColorButtonClick(
                                              message.messageId,
                                              e,
                                            )
                                          }
                                          onEdit={() =>
                                            handleEditMessage(message)
                                          }
                                          onViewHistory={() =>
                                            handleViewVersionHistory(
                                              message.messageId,
                                            )
                                          }
                                          onDelete={() =>
                                            handleDeleteMessage(
                                              message.messageId,
                                            )
                                          }
                                          onAddReaction={(emoji) => {
                                            handleReactionSelect(
                                              message.messageId,
                                              emoji,
                                            );
                                            setEditingMessageId(null);
                                            // Forza un aggiornamento completo della chat
                                            setTimeout(() => {
                                              // Se hai una funzione per forzare l'aggiornamento completo
                                              if (
                                                typeof restartNotificationWorker ===
                                                "function"
                                              ) {
                                                restartNotificationWorker();
                                              } else {
                                                // Altrimenti, prova a ricaricare comunque la notifica
                                                fetchNotificationById(
                                                  notificationId,
                                                  true,
                                                );
                                              }
                                            }, 500); // Piccolo ritardo per assicurarsi che la reazione sia stata salvata
                                          }}
                                          canEdit={isCurrentUserMessage == "1"}
                                          isEdited={message.isEdited == "1"}
                                          hasLeftChat={hasLeftChat}
                                          isCurrentUserMessage={
                                            isCurrentUserMessage == "1"
                                          }
                                          isCancelled={message.cancelled == "1"}
                                        />
                                      </div>
                                    )}
                                  </AnimatePresence>

                                  {/* Contenuto del messaggio */}
                                  <div
                                    style={{
                                      paddingTop: "15px",
                                      paddingBottom: "10px",
                                      fontSize: "1rem",
                                    }}
                                  >
                                    {/* Verifica se è un messaggio di sondaggio */}
                                    {isPollMessage(message) ? (
                                      <div className="message-with-poll">
                                        {polls[message.messageId] ? (
                                          <PollMessage
                                            poll={polls[message.messageId]}
                                            onUpdate={handlePollUpdate}
                                            showResults={false}
                                            currentUserId={currentUser?.userId}
                                          />
                                        ) : (
                                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
                                            <BarChart className="h-5 w-5 text-blue-500 mr-2 animate-pulse" />
                                            <span className="text-gray-500">
                                              Caricamento sondaggio...
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      // Usa renderMessageText per gestire i ritorni a capo
                                      renderMessageText(
                                        message.message,
                                        message.usernameMention,
                                        message.isEdited,
                                      )
                                    )}
                                  </div>

                                  {/* Allegati del messaggio */}
                                  {messageAttachments[notificationId]?.[
                                    message.messageId
                                  ] && (
                                    <MessageAttachments
                                      attachments={
                                        messageAttachments[notificationId][
                                          message.messageId
                                        ]
                                      }
                                      onClick={(file) => setSelectedFile(file)}
                                      onDownload={handleAttachmentDownload}
                                    />
                                  )}

                                  {/* Componente per le reazioni con cache migliorata */}
                                  <div
                                    className={`message-reactions flex flex-wrap gap-1 mt-1 ${loading ? "opacity-60" : ""}`}
                                  >
                                    {/* Ottieni le reazioni dalla cache invece di chiamare l'API ogni volta */}
                                    {Object.entries(
                                      groupReactionsByType(
                                        getReactionsForMessage(
                                          message.messageId,
                                        ),
                                      ),
                                    ).map(([reactionType, reactors]) => {
                                      // Trova la reazione dell'utente corrente, se presente
                                      const userReaction = reactors.find(
                                        (r) => r.UserID === currentUser?.userId,
                                      );
                                      const hasCurrentUserReacted =
                                        !!userReaction;

                                      // Crea una lista di utenti per il tooltip
                                      const userNames = reactors
                                        .map((r) => r.UserName)
                                        .join(", ");

                                      return (
                                        <button
                                          key={reactionType}
                                          className={`reaction-badge flex items-center rounded-full px-1.5 py-0.5 text-xs ${
                                            hasCurrentUserReacted
                                              ? "bg-blue-100 text-blue-700"
                                              : "bg-gray-100 hover:bg-gray-200 text-black"
                                          }`}
                                          onClick={() =>
                                            handleReactionSelect(
                                              message.messageId,
                                              reactionType,
                                            )
                                          }
                                          title={userNames}
                                          disabled={loading}
                                        >
                                          <span className="mr-1">
                                            {reactionType}
                                          </span>
                                          <span className="reaction-count">
                                            {reactors.length}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* Color picker */}
                                  {colorPickerMessageId === message.messageId &&
                                    !hasLeftChat && (
                                      <div
                                        className={`absolute z-50 ${isCurrentUserMessage == "1" ? "right-10" : "left-10"} top-2 flex ${isCurrentUserMessage == "1" ? "flex-row-reverse" : "flex-row"} items-start color-picker-area`}
                                      >
                                        <MessageColorPicker
                                          messageId={message.messageId}
                                          onClose={() =>
                                            setColorPickerMessageId(null)
                                          }
                                          className="flex flex-col gap-2 shadow-lg bg-white rounded-xl p-2"
                                        />
                                      </div>
                                    )}

                                  {/* Indicatore di messaggi letti */}
                                  {isCurrentUserMessage == "1" &&
                                    readers?.length > 0 && (
                                      <div
                                        className="absolute bottom-1 right-2 text-xs text-gray-500 cursor-pointer"
                                        onClick={() =>
                                          handleInfoClick(message.messageId)
                                        }
                                      >
                                        <div className="bi bi-check-all text-white"></div>
                                      </div>
                                    )}

                                  {/* Indicatore di messaggio modificato */}
                                  {renderEditedIndicator(
                                    message,
                                    isCurrentUserMessage,
                                  )}
                                </div>

                                {/* Timestamp per utenti non correnti */}
                                {isCurrentUserMessage == "0" && (
                                  <div
                                    className={cn(
                                      "message-timestamp",
                                      isCurrentUserMessage == "0"
                                        ? "text-right"
                                        : "text-left",
                                    )}
                                  >
                                    {formatTime(message.tbCreated)}
                                    {message.isEdited == "1" && (
                                      <span className="ml-1 text-gray-400 text-[10px]">
                                        ✎
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Bandierina a destra per inviati */}
                                {isCurrentUserMessage == "1" &&
                                  messageColor && (
                                    <span
                                      className="message-flag animate-flag"
                                      style={{ color: messageColor }}
                                      title={
                                        messageColor
                                          ? `Colore: ${messageColor}`
                                          : "Nessun colore"
                                      }
                                    >
                                      <FaFlag />
                                    </span>
                                  )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </React.Fragment>
                  ),
                )
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Pulsante "Torna all'ultimo messaggio" */}
        {(showScrollButton || newMessage) && (
          <motion.button
            className={`absolute bottom-6 right-4 rounded-full p-2 shadow-lg transition-colors duration-200 flex items-center justify-center ${
              newMessage
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
            style={{
              zIndex: 1000,
              width: "50px",
              height: "50px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={handleScrollToBottom}
            aria-label={newMessage ? "Nuovo messaggio" : "Scorri fino in fondo"}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowBigDown className="h-6 w-6 flex-shrink-0" />
          </motion.button>
        )}

        {/* Renderizzo il menu contestuale dell'avatar se attivo */}
        {avatarContextMenu && renderAvatarContextMenu()}
      </div>

      {/* Visualizzatore file */}
      <FileViewer
        file={selectedFile}
        isOpen={!!selectedFile}
        onClose={() => setSelectedFile(null)}
      />

      {/* Modal per modifica messaggio */}
      <EditMessageModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        message={messageToEdit}
        users={users || []} // Assicurati che users sia un array anche se undefined
        messages={localMessages} // Passa i messaggi al modal
        onMessageUpdated={(updatedNotificationId) => {
          // Ricarica la notifica per aggiornare i messaggi
          const idToUpdate = updatedNotificationId || notificationId;
          if (idToUpdate) {
            // Forza high priority update
            fetchNotificationById(idToUpdate, true).catch((error) => {
              console.error("Errore nell'aggiornamento della notifica:", error);
            });
          }
        }}
      />

      {/* Modal per visualizzare la cronologia delle versioni */}
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
