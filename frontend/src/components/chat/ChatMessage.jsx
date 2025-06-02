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
  Loader2
} from 'lucide-react';
import FileViewer from '@/components/ui/fileViewer';
import { swal } from '@/lib/common';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';
import DOMPurify from 'dompurify';
import PollModal from './PollModal';
import MessageColorPicker from './MessageColorPicker';
import MessageActionsMenu from './MessageActionsMenu';
import MessageReactions from './MessageReactions';
import { FaFlag } from 'react-icons/fa';
import axios from 'axios';
import { config } from '@/config';

const ChatMessage = memo(({ 
  message,
  isNew = false,
  isFirstNew = false,
  currentUserId,
  users = [],
  messages = [], // Aggiungiamo messages per trovare il messaggio originale
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
  isFromCurrentUser = false // Nuovo prop per indicare se è un messaggio dell'utente corrente
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
  
  const messageRef = useRef(null);
  const actionsRef = useRef(null);
  const colorPickerRef = useRef(null);
  
  const { 
    downloadNotificationAttachment,
    notificationAttachments,
    setMessageColor,
    clearMessageColor,
    toggleMessageReaction
  } = useNotifications();

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
      // Aggiungi animazione di evidenziazione
      messageElement.classList.add("highlight-message");
      setTimeout(() => {
        messageElement.classList.remove("highlight-message");
      }, 2000);
    }
  }, []);

  const originalMessage = findOriginalMessage(message.replyToMessageId);  // Raggruppa le reazioni per tipo
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
  
  
  // CORREZIONE PRINCIPALE: Determina se il messaggio è dell'utente corrente
  // Controlliamo selectedUser == "1" (stringa) come nel vecchio codice
  // IMPORTANTE: Anche i messaggi temporanei devono essere riconosciuti come propri
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
      const now = new Date();
      const diffMinutes = differenceInMinutes(now, date);
      
      if (diffMinutes < 1) return 'Ora';
      if (diffMinutes < 60) return `${diffMinutes} min fa`;
      if (isToday(date)) return format(date, 'HH:mm');
      if (isYesterday(date)) return `Ieri alle ${format(date, 'HH:mm')}`;
      
      return format(date, 'dd/MM/yyyy HH:mm', { locale: it });
    } catch (error) {
      return '';
    }
  };
  
  // Gestione click esterno per nascondere azioni/reazioni
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setShowActions(false);
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
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
  
  // Gestione modifica messaggio - RIMOSSA perché gestita dal modal
  const handleEditMessage = async () => {
    // Non serve più, gestito dal modal
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
        console.log("🔄 ChatMessage: Risposta eliminazione messaggio. Response:", response)
        if (response.data && response.data.success) {
          swal.fire({
            icon: 'success',
            title: 'Eliminato!',
            text: 'Il messaggio è stato eliminato con successo.',
            timer: 1500,
            showConfirmButton: false,
          });
  
          // IMPORTANTE: Emetti evento con notificationId
          document.dispatchEvent(
            new CustomEvent('message-deleted', {
              detail: {
                notificationId: parseInt(notificationId),
                messageId: message.messageId
              }
            })
          );
  
          // Forza il ricaricamento
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
    try {
      setLoadingReactions(prev => ({ ...prev, [reactionType]: true }));
      await toggleMessageReaction(message.messageId, reactionType);
      
      // Trigger update event
      document.dispatchEvent(
        new CustomEvent('message-reaction-updated', {
          detail: { messageId: message.messageId, notificationId },
        })
      );

      // Forza il ricaricamento
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
    // Testo sempre nero
    return "#000000";
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#000000" : "#FFFFFF";
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
  
  return (
    <>
      {/* Indicatore "Nuovi messaggi" - NON mostrarlo se è dall'utente corrente */}

      
      {/* Messaggio */}
      <motion.div
        ref={messageRef}
        className={`flex p-2 mb-2 relative ${(isOwnMessage || isOwnMessage == '1') ? 'justify-end' : 'justify-start'} ${isSearchResult ? 'bg-yellow-50' : ''}`}
        initial={isNew ? { opacity: 0, y: 20 } : false}
        animate={isNew ? { opacity: 1, y: 0 } : false}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        id={`message-${message.messageId}`}
      >
        {/* Avatar per messaggi ricevuti */}
        {(!isOwnMessage || isOwnMessage == '0') && (
          <MessageAvatar senderName={message.senderName} />
        )}
        
        <div className="flex flex-col max-w-[70%]">
          {/* Reply preview - CORRETTO con click per scrollare */}
          {originalMessage && (
            <div 
              className="message-quote cursor-pointer mb-1" 
              onClick={() => handleReplyClick(originalMessage.messageId)}
            >
              <div className="text-sm font-semibold text-gray-700">
                {originalMessage.senderName}
              </div>
              <div className="text-xs text-gray-700 line-clamp-2">
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
            
            <div
              className={`message-bubble relative ${(isOwnMessage || isOwnMessage == '1') ? 'sent' : 'received'}`}
              style={
                message.messageColor && (!isOwnMessage || isOwnMessage == '0')
                  ? {
                      backgroundColor: message.messageColor + "15",
                      color: getContrastTextColor(message.messageColor),
                      boxShadow: `0 2px 8px ${message.messageColor}33`,
                    }
                  : {}
              }
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
                          // Chiama direttamente onEditMessage che aprirà il modal
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
              
              {/* Color picker */}
              <AnimatePresence>
                {showColorPicker && (
                  <div 
                    ref={colorPickerRef}
                    className={`absolute z-50 ${(!isOwnMessage || isOwnMessage == '0') ? "right-10" : "left-10"} top-2`}
                  >
                    <MessageColorPicker
                      messageId={message.messageId}
                      notificationId={notificationId} // IMPORTANTE: Passa notificationId
                      onClose={() => setShowColorPicker(false)}
                    />
                  </div>
                )}
              </AnimatePresence>
              
              {/* Contenuto messaggio - SENZA editing inline */}
              <div style={{ paddingTop: "15px", paddingBottom: "10px", fontSize: "1rem" }}>
                {isPollMessage ? (
                  <PollModal 
                    pollId={message.pollId} 
                    messageId={message.messageId}
                    currentUserId={currentUserId}
                  />
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
              
              {/* Usa MessageReactions component CON CACHE */}
              {message.reactions ? (
                <div className={`message-reactions flex flex-wrap gap-1 mt-1`}>
                  {Object.entries(groupReactionsByType(message.reactions)).map(([reactionType, reactors]) => {
                    const userReaction = reactors.find(r => r.UserID === currentUserId);
                    const hasCurrentUserReacted = !!userReaction;
                    const userNames = reactors.map(r => r.UserName).join(", ");
                    const isLoading = loadingReactions[reactionType];
                    
                    return (
                      <button
                        key={reactionType}
                        className={`reaction-badge flex items-center rounded-full px-1.5 py-0.5 text-xs ${
                          hasCurrentUserReacted
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 hover:bg-gray-200 text-black"
                        }`}
                        onClick={() => handleReaction(reactionType)}
                        title={userNames}
                        disabled={disabled || isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <span className="mr-1">{reactionType}</span>
                        )}
                        <span className="reaction-count">{reactors.length}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <MessageReactions
                  messageId={message.messageId}
                  notificationId={notificationId}
                  onReactionUpdated={() => {}}
                />
              )}
              
              {/* Indicatore messaggio letto (per messaggi propri) */}
              <div className="absolute bottom-1 right-2 text-xs text-gray-500">
                {( isOwnMessage || isOwnMessage == '1') && (
                  <>
                    {message.isReadByUser ? (
                      <CheckCheck className="h-3 w-3 text-white" title="Letto" />
                    ) : (
                      <Check className="h-3 w-3 text-white/70" title="Inviato" />
                    )}
                    
                  </>
                )}
              </div>
              
              {/* Indicatore messaggio temporaneo */}
              {message._isTemporary && (
                <div className="absolute -top-1 -right-1">
                  <Clock className="h-4 w-4 text-gray-400 animate-pulse" />
                </div>
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
          onClose={() => setSelectedAttachment(null)}
        />
      )}
    </>
  );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;