// src/components/chat/ChatMessage.jsx
import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday, differenceInMinutes } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  MoreVertical,
  Reply,
  Edit2,
  Trash2,
  Copy,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  File,
  Download,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Paperclip,
  Loader2,
  Info,
  Smile
} from 'lucide-react';
import FileViewer from '@/components/ui/fileViewer';
import { swal } from '@/lib/common';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';
import { useSelector } from 'react-redux';
import { selectMessageReactions } from '@/redux/features/notifications/messageReactionsSlice';
import DOMPurify from 'dompurify';
import PollModal from './PollModal';
import MessageColorPicker from './MessageColorPicker';
import MessageActionsMenu from './MessageActionsMenu';
import QuickReactionsPopup from './QuickReactionsPopup';
import { FaFlag } from 'react-icons/fa';
import axios from 'axios';
import { config } from '@/config';

const ChatMessage = memo(({ 
  message,
  isNew = false,
  isFirstNew = false,
  currentUserId,
  users = [],
  messages = [],
  onReply,
  onEditMessage,
  onViewVersionHistory,
  onMessageSelect,
  categoryColor = '#3b82f6',
  isSearchResult = false,
  searchHighlight = '',
  isColorFiltered = false,
  filterColor = null,
  notificationId,
  disabled = false,
  isFromCurrentUser = false
}) => {
  // Se il messaggio non ha un ID, non renderizziamo nulla
  if (!message || !message.messageId) {
    return null;
  }

  const [showActions, setShowActions] = useState(false);
  const [showAttachments, setShowAttachments] = useState(true);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [loadingReactions, setLoadingReactions] = useState({});
  const [showReadInfo, setShowReadInfo] = useState(false);
  const [readInfo, setReadInfo] = useState(null);
  const [loadingReadInfo, setLoadingReadInfo] = useState(false);
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState(null);
  
  const messageRef = useRef(null);
  const actionsRef = useRef(null);
  const colorPickerRef = useRef(null);
  const readInfoRef = useRef(null);
  
  const { 
    downloadNotificationAttachment,
    notificationAttachments,
    setMessageColor,
    clearMessageColor,
    toggleMessageReaction,
    loadMessageReactions
  } = useNotifications();

  // Ottieni le reazioni dal Redux store
  const reactionsFromStore = useSelector(state => selectMessageReactions(state, message.messageId));
  

  // Trova il messaggio originale per una risposta
  const findOriginalMessage = useCallback((replyToMessageId) => {
    if (!replyToMessageId || replyToMessageId === "0") return null;
    return messages?.find(msg => msg.messageId == replyToMessageId);
  }, [messages]);

  // Gestione click su messaggio quotato
  const handleReplyClick = useCallback((messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      messageElement.classList.add("highlight-message");
      setTimeout(() => {
        messageElement.classList.remove("highlight-message");
      }, 2000);
    }
  }, []);

  // Gestione reazioni rapide
  const handleQuickReaction = useCallback(async (emoji) => {
    if (disabled) return;
    
    try {
      setLoadingReactions(prev => ({ ...prev, [emoji]: true }));
      
      await toggleMessageReaction(message.messageId, emoji);
      
      // Aggiungi effetto di feedback
      const button = document.querySelector(`[data-message-id="${message.messageId}"] .quick-reactions-button`);
      if (button) {
        button.classList.add('reaction-feedback');
        setTimeout(() => {
          button.classList.remove('reaction-feedback');
        }, 600);
      }
      
      // Ricarica immediatamente le reazioni per questo messaggio per ottenere lo stato corretto
      await loadMessageReactions([message.messageId]);
      
      // Emetti evento per aggiornare le reazioni
      document.dispatchEvent(
        new CustomEvent("message-reaction-updated", {
          detail: { messageId: message.messageId }
        })
      );
    } catch (error) {
      console.error("Errore nell'aggiunta della reazione:", error);
    } finally {
      setLoadingReactions(prev => ({ ...prev, [emoji]: false }));
    }
  }, [disabled, message.messageId, toggleMessageReaction, loadMessageReactions]);

  const originalMessage = findOriginalMessage(message.replyToMessageId);
  
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
  
  // Determina se il messaggio è dell'utente corrente
  const isOwnMessage = message.selectedUser == "1" || 
                      message._isTemporary === true || 
                      (message.senderId && message.senderId === currentUserId) ||
                      (message.senderId && message.senderId.toString() === currentUserId?.toString());
  
  // Trova l'utente che ha inviato il messaggio
  const sender = users.find(u => 
    u.userId === message.senderId || 
    u.userId?.toString() === message.senderId?.toString()
  ) || { 
    firstName: message.senderName?.split(' ')[0] || 'Utente',
    lastName: message.senderName?.split(' ')[1] || '',
    username: message.senderName || 'Sconosciuto'
  };
  
  // Genera colore avatar basato sul nome
  const generateAvatarColor = (name) => {
    const colors = ["#D21312", "#2F58CD", "#790252", "#526D82", "#5C469C", "#576CBC"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };
  
  // Ottieni iniziali dal nome
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return parts[0][0].toUpperCase() + (parts[1] ? parts[1][0].toUpperCase() : "");
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  // Formatta il timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return format(date, 'dd/MM/yy HH:mm', { locale: it });
    } catch (error) {
      return '';
    }
  };

  // Carica informazioni di lettura
  const loadReadInfo = useCallback(async () => {
    if (!message.messageId || loadingReadInfo) return;

    setLoadingReadInfo(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${config.API_BASE_URL}/messages/${message.messageId}/read-receipts`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data && response.data.success) {
        setReadInfo(response.data.readReceipts);
      }
    } catch (error) {
      console.error('Error loading read info:', error);
    } finally {
      setLoadingReadInfo(false);
    }
  }, [message.messageId, loadingReadInfo]);

  // Handler per mostrare/nascondere info lettura
  const handleToggleReadInfo = useCallback(async () => {
    if (!showReadInfo && !readInfo) {
      await loadReadInfo();
    }
    setShowReadInfo(!showReadInfo);
  }, [showReadInfo, readInfo, loadReadInfo]);
  
  // Gestione click esterno per nascondere azioni/reazioni/readInfo
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setShowActions(false);
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
      }
      if (readInfoRef.current && !readInfoRef.current.contains(event.target)) {
        setShowReadInfo(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Sanitizza e processa il messaggio
  const processMessage = (text) => {
    if (!text) return '';
    
    // Sanitizza HTML
    let processed = DOMPurify.sanitize(text, { 
      ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'br'],
      ALLOWED_ATTR: []
    });
    
    // Converti menzioni in link
    processed = processed.replace(/@(\w+)/g, '<span class="text-blue-600 font-medium cursor-pointer hover:underline">@$1</span>');
    
    // Converti URL in link
    processed = processed.replace(
      /(https?:\/\/[^\s]+)/g, 
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>'
    );
    
    // Evidenzia termine di ricerca
    if (searchHighlight) {
      const regex = new RegExp(`(${searchHighlight})`, 'gi');
      processed = processed.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>');
    }
    
    return processed;
  };
  
  // Gestione eliminazione messaggio
  const handleDeleteMessage = async () => {
    const result = await swal.fire({
      title: 'Eliminare il messaggio?',
      text: 'Questa azione non può essere annullata',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Elimina',
      cancelButtonText: 'Annulla'
    });
    
    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.delete(
          `${config.API_BASE_URL}/messages/${message.messageId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        
        if (response.data && response.data.success) {
          swal.fire({
            icon: 'success',
            title: 'Eliminato!',
            text: 'Il messaggio è stato eliminato con successo.',
            timer: 1500,
            showConfirmButton: false,
          });
  
          document.dispatchEvent(
            new CustomEvent('message-deleted', {
              detail: {
                notificationId: parseInt(notificationId),
                messageId: message.messageId
              }
            })
          );
  
          document.dispatchEvent(
            new CustomEvent('reload-open-chat', {
              detail: {
                notificationId: parseInt(notificationId),
                reason: 'message-deleted',
                forceComplete: true
              }
            })
          );
        }
      } catch (error) {
        console.error('Error deleting message:', error);
        swal.fire({
          icon: 'error',
          title: 'Errore',
          text: 'Si è verificato un errore durante l\'eliminazione del messaggio'
        });
      }
    }
  };
  
  // Gestione reazioni
  const handleReaction = async (reactionType) => {
    if (disabled) return;
    
    try {
      setLoadingReactions(prev => ({ ...prev, [reactionType]: true }));
      
      await toggleMessageReaction(message.messageId, reactionType);
      
      // Aggiungi effetto di feedback
      const button = document.querySelector(`[data-message-id="${message.messageId}"] .reaction-badge`);
      if (button) {
        button.classList.add('reaction-feedback');
        setTimeout(() => {
          button.classList.remove('reaction-feedback');
        }, 600);
      }
      
      // Ricarica immediatamente le reazioni per questo messaggio per ottenere lo stato corretto
      await loadMessageReactions([message.messageId]);
      
      // Emetti evento per aggiornare le reazioni
      document.dispatchEvent(
        new CustomEvent("message-reaction-updated", {
          detail: { messageId: message.messageId }
        })
      );

      document.dispatchEvent(
        new CustomEvent('reload-open-chat', {
          detail: {
            notificationId: parseInt(notificationId),
            reason: 'reaction-toggled',
            forceComplete: true
          }
        })
      );
    } catch (error) {
      console.error('Error toggling reaction:', error);
    } finally {
      setLoadingReactions(prev => ({ ...prev, [reactionType]: false }));
    }
  };
  
  // Copia messaggio negli appunti
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.message);
    swal.fire({
      icon: 'success',
      title: 'Copiato!',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500
    });
    setShowActions(false);
  };
  
  // Download allegato
  const handleAttachmentDownload = (attachment) => {
    try {
      downloadNotificationAttachment(attachment.AttachmentID, attachment.FileName);
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

  // Ottieni allegati per questo messaggio
  const messageAttachments = notificationAttachments?.[notificationId]?.[message.messageId] || [];


  // Gestione click su messaggio con allegato
  const handleAttachmentMessageClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (messageAttachments.length === 1) {
      // Se c'è un solo allegato, aprilo direttamente
      setSelectedAttachment(messageAttachments[0]);
    } else if (messageAttachments.length > 1) {
      // Se ce ne sono più, mostra/nascondi la lista
      setShowAttachments(!showAttachments);
    } else {
      // Fallback: se messageAttachments è vuoto, cerca nella lista completa
      const allAttachments = notificationAttachments?.[notificationId];

      if (allAttachments) {
        // Ottieni tutti gli allegati come array piatto
        let allAttachmentsArray = [];
        if (Array.isArray(allAttachments)) {
          allAttachmentsArray = allAttachments;
        } else if (typeof allAttachments === 'object') {
          allAttachmentsArray = Object.values(allAttachments).flat();
        }

        // Cerca per MessageID
        let attachmentsForThisMessage = allAttachmentsArray.filter(att =>
          att.MessageID === message.messageId
        );

        // Se non trova per MessageID, cerca per nome file nel messaggio
        if (attachmentsForThisMessage.length === 0 && message.message) {
          const fileNameMatch = message.message.match(/Ha condiviso:\s*(.+)/i);
          if (fileNameMatch) {
            const fileName = fileNameMatch[1].trim();
            attachmentsForThisMessage = allAttachmentsArray.filter(att =>
              att.FileName === fileName || att.FileName?.includes(fileName)
            );
          }
        }

        if (attachmentsForThisMessage.length === 1) {
          setSelectedAttachment(attachmentsForThisMessage[0]);
        } else if (attachmentsForThisMessage.length > 1) {
          setShowAttachments(!showAttachments);
        } else {
          // Nessun allegato trovato - apri la sidebar allegati
          document.dispatchEvent(new CustomEvent('open-attachments-sidebar', {
            detail: { notificationId }
          }));
        }
      } else {
        document.dispatchEvent(new CustomEvent('open-attachments-sidebar', {
          detail: { notificationId }
        }));
      }
    }
  };

  // Funzione per renderizzare il messaggio con link cliccabile per allegati
  const renderAttachmentMessage = () => {
    const messageText = message.message || "";

    // Pattern per "Ha condiviso: nomefile.ext" o "Ha condiviso N allegati"
    const singleFilePattern = /Ha condiviso:\s*(.+)/i;
    const multiFilePattern = /Ha condiviso\s+(\d+)\s+allegati/i;

    const singleMatch = messageText.match(singleFilePattern);
    const multiMatch = messageText.match(multiFilePattern);


    if (singleMatch) {
      // Caso: singolo file - mostra sempre il link anche se messageAttachments è vuoto
      const fileName = singleMatch[1];
      return (
        <div className="flex items-center gap-2">
          <span>Ha condiviso: </span>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAttachmentMessageClick(e);
            }}
            className="text-black hover:text-gray-700 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
            style={{
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none"
            }}
          >
            <Paperclip className="h-3.5 w-3.5" />
            {fileName}
          </button>
        </div>
      );
    } else if (multiMatch) {
      // Caso: multipli file
      const count = multiMatch[1];
      return (
        <div className="flex items-center gap-2">
          <span>Ha condiviso </span>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAttachmentMessageClick(e);
            }}
            className="text-black hover:text-gray-700 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
            style={{
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none"
            }}
          >
            <Paperclip className="h-3.5 w-3.5" />
            {count} allegati
          </button>
        </div>
      );
    }

    // Fallback: messaggio normale
    return renderMessageText(messageText, message.usernameMention, message.isEdited);
  };
  
  // Componente Avatar
  const MessageAvatar = ({ senderName, onClick }) => {
    const avatarColor = generateAvatarColor(senderName);
    const initials = getInitials(senderName);
    
    return (
      <div className="flex flex-col items-center mr-2 cursor-pointer" onClick={onClick}>
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
  
  // Verifica se è un messaggio di sondaggio
  const isPollMessage = message.pollId || 
                       (message.message && message.message.includes('**Sondaggio creato**'));
  
  // Ottieni il colore del testo in base al contrasto
  const getContrastTextColor = (bgColor) => {
    if (!bgColor) return "#000000";
    return "#000000";
  };

  // Helper per evidenziare le menzioni nel testo
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

    const decodedText = decodeHTMLEntities(messageText);

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
  
  return (
    <>
      {/* CSS per effetti di feedback */}
      <style jsx>{`
        .reaction-feedback {
          animation: reactionPulse 0.6s ease-in-out;
        }
        
        @keyframes reactionPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
      
      {/* Messaggio */}
      <motion.div
        ref={messageRef}
        className={`flex p-2 mx-2 mb-2 relative ${(isOwnMessage || isOwnMessage == '1') ? 'justify-end' : 'justify-start'} ${isSearchResult ? 'bg-yellow-50' : ''}`}
        style={{
          userSelect: "text",
          WebkitUserSelect: "text",
          MozUserSelect: "text",
          msUserSelect: "text"
        }}
        initial={isNew ? { opacity: 0, y: 20 } : false}
        animate={isNew ? { opacity: 1, y: 0 } : false}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        id={`message-${message.messageId}`}
        data-message-id={message.messageId}
      >
        {/* Avatar per messaggi ricevuti */}
        {(!isOwnMessage || isOwnMessage == '0') && (
          <MessageAvatar senderName={message.senderName} />
        )}
        
        <div className="flex flex-col max-w-[70%]">
          {/* Reply preview */}
          {originalMessage && (
            <div 
              className="message-quote cursor-pointer mb-1" 
              onClick={() => handleReplyClick(originalMessage.messageId)}
            >
              <div className="text-sm font-medium text-gray-700">
                {originalMessage.senderName}
              </div>
              <div className="text-xs font-normal text-gray-700 line-clamp-2">
                {originalMessage.message}
              </div>
            </div>
          )}
          
            {/* Bubble messaggio */}
           <div className="flex items-center gap-2">
             {/* Bandierina per messaggi colorati */}
             { message.messageColor && (
               <span
                 className="message-flag animate-flag"
                 style={{ color: message.messageColor }}
                 title={`Colore: ${message.messageColor}`}
               >
                 <FaFlag />
               </span>
             )}
             
             {/* Icona emoji per reazioni rapide - solo per messaggi degli altri utenti */}
             {!disabled && !message._isTemporary && !isOwnMessage && (
               <div className={`relative ${isOwnMessage ? 'order-first' : 'order-last'}`}>
                 <button
                   className={`p-1.5 rounded-full quick-reactions-button ${
                     showQuickReactions ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-600"
                   } ${message.reactions && Object.keys(message.reactions).length > 0 ? "message-with-reactions" : ""}`}
                   onClick={(e) => {
                     e.stopPropagation();
                     setShowQuickReactions(!showQuickReactions);
                     setShowActions(false); // Chiudi il menu azioni se aperto
                   }}
                   title="Reazioni rapide"
                 >
                   <Smile className="h-4 w-4" />
                 </button>
               </div>
             )}
            
            <div
              className={`message-bubble relative ${(isOwnMessage || isOwnMessage == '1') ? 'sent' : 'received'}`}
              style={{
                userSelect: "text",
                WebkitUserSelect: "text",
                MozUserSelect: "text",
                msUserSelect: "text",
                marginBottom: (message.reactions || reactionsFromStore.length > 0) ? '20px' : '0px', // Spazio per le reazioni
                ...(message.messageColor && (!isOwnMessage || isOwnMessage == '0')
                  ? {
                      backgroundColor: message.messageColor + "15",
                      color: getContrastTextColor(message.messageColor),
                      boxShadow: `0 2px 8px ${message.messageColor}33`,
                    }
                  : {})
              }}
            >
              {/* Menu actions */}
              {!disabled && !message._isTemporary && (
                <button
                  className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${
                    showActions
                      ? "bg-gray-200 text-gray-800"
                      : (!isOwnMessage)
                        ? "hover:bg-white/20"
                        : "text-white-500/70 hover:text-white-700 hover:bg-gray-200/50"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActions(!showActions);
                  }}
                  title="Opzioni messaggio"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              )}
              
              {/* Usa MessageActionsMenu esistente */}
              <AnimatePresence>
                {showActions && (
                  <div
                    ref={actionsRef}
                    className="relative"
                    style={{ zIndex: 1000 }}
                  >
                    <MessageActionsMenu
                      isOpen={true}
                      onClose={() => setShowActions(false)}
                      onReply={() => {
                        onReply(message);
                        setShowActions(false);
                      }}
                      onColorSelect={() => setShowColorPicker(!showColorPicker)}
                      onEdit={() => {
                        if (onEditMessage) {
                          onEditMessage(message.messageId, message.message);
                          setShowActions(false);
                        }
                      }}
                      onViewHistory={() => {
                        onViewVersionHistory(message.messageId);
                        setShowActions(false);
                      }}
                      onDelete={handleDeleteMessage}
                      onAddReaction={handleReaction}
                      canEdit={isOwnMessage}
                      isEdited={message.isEdited == "1"}
                      hasLeftChat={disabled}
                      isCurrentUserMessage={isOwnMessage}
                      isCancelled={message.cancelled == "1"}
                    />
                  </div>
                )}
              </AnimatePresence>
              
              {/* Color picker - posizionato relativamente al bubble */}
              <AnimatePresence>
                {showColorPicker && (
                  <MessageColorPicker
                    messageId={message.messageId}
                    notificationId={notificationId}
                    onClose={() => setShowColorPicker(false)}
                    isOwnMessage={isOwnMessage}
                  />
                )}
              </AnimatePresence>
              
              
              {/* Contenuto messaggio */}
              <div
                style={{
                  paddingTop: "15px",
                  paddingBottom: "10px",
                  fontSize: "1rem",
                  userSelect: "text",
                  WebkitUserSelect: "text",
                  MozUserSelect: "text",
                  msUserSelect: "text"
                }}
              >
                {isPollMessage ? (
                  <PollModal
                    pollId={message.pollId}
                    messageId={message.messageId}
                    notificationId={notificationId}
                    currentUserId={currentUserId}
                  />
                ) : (message.message?.includes("Ha condiviso") || message.message?.includes("ha condiviso")) ? (
                  // Messaggio con allegato - solo il nome file è cliccabile
                  renderAttachmentMessage()
                ) : (
                  renderMessageText(
                    message.message,
                    message.usernameMention,
                    message.isEdited
                  )
                )}
              </div>
              
              {/* Allegati */}
              {messageAttachments.length > 0 && (
                <div className="space-y-2 mt-2">
                  <button
                    onClick={() => setShowAttachments(!showAttachments)}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-800 mb-1"
                  >
                    <Paperclip className="h-4 w-4 mr-1" />
                    {messageAttachments.length} {messageAttachments.length === 1 ? 'allegato' : 'allegati'}
                    {showAttachments ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                  </button>
                  
                  <AnimatePresence>
                    {showAttachments && messageAttachments.map((attachment) => (
                      <div
                        key={attachment.AttachmentID}
                        className="flex items-center p-2 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
                        onClick={() => setSelectedAttachment(attachment)}
                      >
                        <div className="flex-shrink-0 mr-2">
                          {attachment.FileType?.startsWith("image/") ? (
                            <ImageIcon className="h-5 w-5 text-blue-500" />
                          ) : (
                            <File className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.FileName}</p>
                          <p className="text-xs text-gray-500">
                            {Math.round((attachment.FileSizeKB / 1024) * 100) / 100} MB
                          </p>
                        </div>
                        <button
                          className="ml-2 text-blue-500 hover:text-blue-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAttachmentDownload(attachment);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
              
              {/* Reazioni - posizionate fuori dal bubble come WhatsApp */}
              {(message.reactions || reactionsFromStore.length > 0) && (
                <motion.div 
                  className={`absolute -bottom-1 ${
                    (isOwnMessage || isOwnMessage == '1') 
                      ? '-left-2 flex-row-reverse' 
                      : '-right-2'
                  } flex items-center gap-0.5 max-w-[120px]`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  style={{ zIndex: 10 }}
                >
                  {Object.entries(groupReactionsByType(message.reactions || reactionsFromStore))
                    .slice(0, 3) // Mostra max 3 reazioni diverse
                    .map(([reactionType, reactors]) => {
                      const userReaction = reactors.find(r => r.UserID === currentUserId);
                      const hasCurrentUserReacted = !!userReaction;
                      const userNames = reactors.map(r => r.UserName || r.UserID || 'Utente sconosciuto').join(", ");
                      const isLoading = loadingReactions[reactionType];
                      const showTooltip = hoveredReaction === reactionType;

                      return (
                        <motion.button
                          key={reactionType}
                          className={`relative group reaction-badge flex items-center rounded-full px-1 py-0.5 text-xs transition-all duration-200 hover:scale-110 ${
                            hasCurrentUserReacted
                              ? "bg-blue-500 text-white shadow-md"
                              : "bg-white border border-gray-200 text-gray-700 shadow-sm hover:shadow-md"
                          }`}
                          onClick={() => handleReaction(reactionType)}
                          onMouseEnter={() => setHoveredReaction(reactionType)}
                          onMouseLeave={() => setHoveredReaction(null)}
                          disabled={disabled || isLoading}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            transform: isLoading ? 'scale(0.9)' : 'scale(1)',
                            opacity: isLoading ? 0.7 : 1
                          }}
                        >
                          {isLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <span className="text-sm">{reactionType}</span>
                              {reactors.length > 1 && (
                                <span className="ml-0.5 text-xs font-medium">
                                  {reactors.length}
                                </span>
                              )}
                            </>
                          )}

                          {/* Tooltip con nomi utenti - visibile solo su hover */}
                          {userNames && userNames.trim() && showTooltip && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              transition={{ duration: 0.15 }}
                              className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-[9999] max-w-xs"
                            >
                              <div className="font-medium">{userNames}</div>
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  
                  {/* Indicatore per reazioni aggiuntive */}
                  {Object.keys(groupReactionsByType(message.reactions || reactionsFromStore)).length > 3 && (
                    <div className="flex items-center justify-center w-5 h-5 bg-gray-100 border border-gray-200 rounded-full text-xs font-medium text-gray-600">
                      +{Object.keys(groupReactionsByType(message.reactions || reactionsFromStore)).length - 3}
                    </div>
                  )}
                </motion.div>
              )}
              
              {/* Indicatore messaggio letto con click per info dettagliate */}
              <div className="absolute bottom-1 right-2 text-xs text-gray-500">
                {(isOwnMessage || isOwnMessage == '1') && (
                  <div className="relative">
                    <button
                      onClick={handleToggleReadInfo}
                      className="hover:bg-white/20 rounded p-0.5 transition-colors"
                      title="Clicca per vedere chi ha letto"
                    >
                      {message.isReadByUser ? (
                        <CheckCheck className="h-3 w-3 text-white" />
                      ) : (
                        <Check className="h-3 w-3 text-white/70" />
                      )}
                    </button>
                    
                    {/* Popup info lettura */}
                    <AnimatePresence>
                      {showReadInfo && (
                        <motion.div
                          ref={readInfoRef}
                          initial={{ opacity: 0, scale: 0.95, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 5 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[200px] w-fit max-w-[300px] z-50"
                        >
                          <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Letto da:
                          </div>
                          
                          {loadingReadInfo ? (
                            <div className="flex items-center justify-center py-2">
                              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            </div>
                          ) : readInfo && readInfo.length > 0 ? (
                            <div className="space-y-1 max-h-[200px] overflow-y-auto">
                              {readInfo.map((reader, index) => (
                                <div key={index} className="flex items-center justify-between text-xs whitespace-nowrap">
                                  <span className="text-gray-700 font-medium">
                                    {reader.Name || 'Utente'}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {reader.isReadByReceiver ? (
                                      <>
                                        <CheckCheck className="h-3 w-3 text-green-500" />
                                        <span className="text-gray-500">
                                          {formatTimestamp(reader.ReceiverReadedDate)}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-gray-400 italic">Non letto</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 italic">
                              Nessuno ha ancora letto
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              
              {/* Indicatore messaggio temporaneo */}
              {message._isTemporary && (
                <div className="absolute -top-1 -right-1">
                  <Clock className="h-4 w-4 text-gray-400 animate-pulse" />
                </div>
              )}
              
              {/* Popup reazioni rapide - solo per messaggi degli altri utenti */}
              {!disabled && !message._isTemporary && !isOwnMessage && (
                <QuickReactionsPopup
                  isOpen={showQuickReactions}
                  onClose={() => setShowQuickReactions(false)}
                  onReactionSelect={handleQuickReaction}
                  position={isOwnMessage ? "top" : "bottom"}
                  disabled={disabled}
                  loadingReactions={loadingReactions}
                  messageId={message.messageId}
                  isOwnMessage={isOwnMessage}
                />
              )}
            </div>
            
          </div>
          
          {/* Timestamp e indicatore modificato */}
          <div className={`message-timestamp ${(!isOwnMessage || isOwnMessage == '0') ? "text-right" : "text-left"}`}>
            {formatTimestamp(message.tbCreated)}
            {message.isEdited == "1" && (
              <span className="ml-1 text-gray-400 text-[10px]">✎</span>
            )}
          </div>
        </div>
      </motion.div>
      
      {/* File viewer modal */}
      {selectedAttachment && (
        <FileViewer
          file={selectedAttachment}
          isOpen={!!selectedAttachment}
          onClose={() => setSelectedAttachment(null)}
        />
      )}
    </>
  );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;