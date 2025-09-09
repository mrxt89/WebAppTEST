// src/components/chat/ChatBottomBar.jsx
import { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import {
  SendHorizontal,
  ThumbsUp,
  RefreshCcw,
  SquareCheck,
  Paperclip,
  X,
  Reply,
  FileIcon,
  Users,
  AlertOctagon,
  Image,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import EmojiPicker from "./Emoji-picker";
import { swal } from "@/lib/common";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import { debounce } from "lodash";
import "@/styles/chat-components.css";

const ChatBottomBar = ({
  notificationId,
  title,
  notificationCategoryId,
  hexColor,
  disabled = false,
  setSending,
  onSend,
  replyToMessage,
  setReplyToMessage,
  users = [],
  responseOptions = [],
  receiversList = "",
  updateReceiversList,
  uploadNotificationAttachment,
  captureAndUploadPhoto,
  reopenChat,
  closeChat,
  isClosed,
  closingUser_Name,
  closingDate,
  isNewMessage,
  onRequestClose,
  openChatModal,
}) => {
  const [message, setMessage] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionIndex, setMentionIndex] = useState(null);
  const [cursorPosition, setCursorPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUpdatingContentEditable, setIsUpdatingContentEditable] = useState(false);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  
  // IMPORTANTE: Stato locale per tracciare i destinatari menzionati
  const [localReceiversList, setLocalReceiversList] = useState(receiversList || "");

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachMenuRef = useRef(null);
  const dropZoneTimeoutRef = useRef(null);
  const lastSelectionRef = useRef(null);

  // Use functions from context
  const { 
    getNotificationAttachments, 
    sendNotificationWithAttachments,
    sendNotification,
    fetchNotificationById,
    refreshAttachments,
    ...contextFunctions 
  } = useNotifications();
  
  // Ensure we have upload functions either from props or context
  const uploadAttachment = uploadNotificationAttachment || contextFunctions.uploadNotificationAttachment;
  const capture = captureAndUploadPhoto || contextFunctions.captureAndUploadPhoto;

  const categoryColor = hexColor || "#3b82f6";

  // Sincronizza receiversList prop con stato locale - CORRETTO
  useEffect(() => {
    setLocalReceiversList(receiversList || "");
  }, [receiversList]);

  // IMPORTANTE: Inizializzazione immediata per nuovi messaggi
  useEffect(() => {
    if (isNewMessage && receiversList && !localReceiversList) {
      setLocalReceiversList(receiversList);
    }
  }, [isNewMessage, receiversList, localReceiversList]);

  // Gestione drag & drop
  const handleDragEnter = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (dropZoneTimeoutRef.current) {
      clearTimeout(dropZoneTimeoutRef.current);
    }
    
    setIsDraggingOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    dropZoneTimeoutRef.current = setTimeout(() => {
      setIsDraggingOver(false);
    }, 100);
  }, [disabled]);

  const handleDragOver = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (dropZoneTimeoutRef.current) {
      clearTimeout(dropZoneTimeoutRef.current);
    }
    
    setIsDraggingOver(true);
  }, [disabled]);

  const handleDrop = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (dropZoneTimeoutRef.current) {
      clearTimeout(dropZoneTimeoutRef.current);
    }
    
    setIsDraggingOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setAttachments(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  }, [disabled]);

  // Gestione selezione e cursore
  const saveSelection = useCallback(() => {
    if (!inputRef.current) return null;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;
    
    const range = selection.getRangeAt(0);
    if (!inputRef.current.contains(range.commonAncestorContainer)) return null;
    
    return {
      range: range.cloneRange(),
      start: getCaretPosition(inputRef.current),
      end: getCaretPosition(inputRef.current),
    };
  }, []);

  const getCaretPosition = (element) => {
    let position = 0;
    const selection = window.getSelection();
    
    if (!selection.rangeCount) return 0;
    
    const range = selection.getRangeAt(0).cloneRange();
    range.setStart(element, 0);
    range.setEnd(selection.anchorNode, selection.anchorOffset);
    
    position = range.toString().length;
    
    return position;
  };

  const restoreSelection = useCallback((savedSelection) => {
    if (!savedSelection || !inputRef.current) return;
    
    try {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelection.range);
    } catch (error) {
      console.error("Errore nel ripristino della selezione:", error);
    }
  }, []);

  // Gestione input
  const handleInputChange = useCallback((event) => {
    if (disabled) return;
    
    lastSelectionRef.current = saveSelection();
    
    let value = "";
    const htmlContent = event.target.innerHTML || "";
    
    if (htmlContent) {
      value = htmlContent
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<div[^>]*>(.*?)<\/div>/gi, "\n$1")
        .replace(/<[^>]*>/g, "");
      
      const textarea = document.createElement("textarea");
      textarea.innerHTML = value;
      value = textarea.value;
      
      value = value.replace(/^\n/, "");
    }
    
    setPlaceholderVisible(value.length === 0 && !isFocused);
    setMessage(value);
    
    // Calcola dinamicamente l'altezza dell'input in base al contenuto
    if (inputRef.current && isFocused) {
      const scrollHeight = inputRef.current.scrollHeight;
      const containerHeight = Math.min(Math.max(scrollHeight + 16, 32), 150); // 16px per padding
      
      // Aggiorna l'altezza del contenitore se necessario
      if (containerHeight > 32) {
        const container = inputRef.current.parentElement.parentElement;
        if (container) {
          container.style.height = `${containerHeight}px`;
        }
      }
    }
    
    // Se il messaggio è vuoto e non è focalizzato, resetta l'altezza
    if (!value && !isFocused) {
      const container = inputRef.current?.parentElement?.parentElement;
      if (container) {
        container.style.height = "32px";
      }
    }
    
    // Gestione menzioni
    const mentionTriggerIndex = value.lastIndexOf("@", value.length - 1);
    if (mentionTriggerIndex > -1) {
      const mentionQuery = value.slice(mentionTriggerIndex + 1).toLowerCase();
      if (mentionQuery) {
        const filteredUsers = users.filter((user) =>
          user.username?.toLowerCase().startsWith(mentionQuery)
        );
        setMentionSuggestions(filteredUsers);
        setMentionIndex(mentionTriggerIndex);
      } else {
        setMentionSuggestions([]);
        setMentionIndex(null);
      }
    } else {
      setMentionSuggestions([]);
      setMentionIndex(null);
    }
  }, [disabled, isFocused, users, saveSelection]);

  // Gestione menzioni - AGGIORNATA
  const handleMentionClick = useCallback((user) => {
    if (disabled || mentionIndex === null) return;

    // Salva la selezione corrente
    lastSelectionRef.current = saveSelection();

    // Ottieni il testo della query dopo il simbolo @
    const queryText = message.slice(mentionIndex).split(/\s+/)[0];

    // Calcola il nuovo messaggio con la menzione
    const beforeMention = message.slice(0, mentionIndex);
    const afterMention = message.slice(mentionIndex + queryText.length);
    const mention = `@${user.username} `;
    const newMessage = beforeMention + mention + afterMention;

    // Calcola la nuova posizione del cursore
    const newPosition = mentionIndex + mention.length;

    // Imposta il messaggio senza aggiornare il DOM direttamente
    setMessage(newMessage);

    // Update placeholder visibility
    setPlaceholderVisible(false);

    // Imposta il flag per aggiornare il contentEditable nel prossimo tick
    setIsUpdatingContentEditable(true);

    // Configura la nuova posizione del cursore da ripristinare dopo l'aggiornamento del DOM
    setCursorPosition({
      start: newPosition,
      end: newPosition,
      isAtEnd: false,
    });

    // Reimposta i suggerimenti di menzione
    setMentionSuggestions([]);
    setMentionIndex(null);

    // IMPORTANTE: Aggiorna la lista dei destinatari
    const currentReceivers = localReceiversList.split("-").filter(Boolean);
    const userIdStr = user.userId?.toString() || "";

    if (userIdStr && !currentReceivers.includes(userIdStr)) {
      currentReceivers.push(userIdStr);
      const newReceiversList = currentReceivers.join("-");
      
      // Aggiorna stato locale
      setLocalReceiversList(newReceiversList);
      
      // Aggiorna anche il componente padre
      if (typeof updateReceiversList === "function") {
        updateReceiversList(newReceiversList);
      }
      
    }
  }, [disabled, mentionIndex, message, localReceiversList, updateReceiversList, saveSelection]);

  // IMPORTANTE: Funzione per gestire l'invio con allegati - AGGIORNATA

  const handleSendWithAttachments = async () => {
    if (disabled) return;
  

  
    // Verifica per nuovi messaggi - MODIFICATA per essere più robusta
    if (isNewMessage && !localReceiversList && notificationCategoryId <= 1) {

      swal.fire("Errore", "Assicurati di aver selezionato almeno un destinatario", "error");
      return;
    }
  
    if (isNewMessage && !title) {
      swal.fire("Errore", "Attenzione: il titolo è obbligatorio", "error");
      return;
    }
  
    // Consenti l'invio se c'è un testo O almeno un allegato
    if (message.trim() || attachments.length > 0) {
      // Crea e mostra lo spinner
      const spinner = document.createElement('div');
      spinner.id = 'message-sending-spinner';
      spinner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        flex-direction: column;
        color: white;
        font-size: 1.2rem;
      `;
      
      spinner.innerHTML = `
        <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mb-4"></div>
        <div>Invio messaggio in corso...</div>
      `;
      
      document.body.appendChild(spinner);
      document.body.style.overflow = 'hidden';
  
      const notificationData = {
        notificationId,
        message: message.trim() || (attachments.length > 0 ? "Ha condiviso allegati" : ""),
        responseOptionId: 3,
        eventId: 0,
        title,
        notificationCategoryId,
        receiversList: localReceiversList,
        replyToMessageId: replyToMessage ? replyToMessage.messageId : 0,
      };
  
  
      if (typeof setSending === "function") {
        setSending(true);
      }
      setLoading(true);
  
      try {
        let result;
  
        result = await sendNotificationWithAttachments(notificationData, attachments);
  
        if (result && (result.success || result.notificationId)) {
          // IMPORTANTE: Reset SOLO dopo invio riuscito per chat esistenti
          if (!isNewMessage) {
            if (typeof updateReceiversList === "function") {
              updateReceiversList("");
            }
            setLocalReceiversList("");
          }
          
          setMessage("");
          setIsUpdatingContentEditable(true);
          setAttachments([]);
  
          if (typeof setReplyToMessage === "function") {
            setReplyToMessage(null);
          }
  
          setPlaceholderVisible(true);
  
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
  
          if (inputRef.current) {
            inputRef.current.focus();
          }
  
          if (isNewMessage && (result.notificationId > 0 || result.Success)) {
            if (typeof updateReceiversList === "function") {
              updateReceiversList("");
            }
            setLocalReceiversList("");
            
            if (onRequestClose) {
              onRequestClose();
              setTimeout(() => {
                if (openChatModal) openChatModal(result.notificationId || result.id);
              }, 100);
            }
          }
  
          // MODIFICHE QUI - Emetti eventi per aggiornare la sidebar
          document.dispatchEvent(
            new CustomEvent("chat-message-sent", {
              detail: {
                notificationId: result.notificationId || notificationData.notificationId,
                highPriority: true,
                hasAttachments: attachments.length > 0  // AGGIUNTO
              },
            }),
          );
  
          // AGGIUNTO - Evento specifico per allegati
          if (attachments.length > 0) {
            document.dispatchEvent(
              new CustomEvent("attachment-uploaded", {
                detail: {
                  notificationId: result.notificationId || notificationId
                },
              }),
            );
          }
  
          document.dispatchEvent(
            new CustomEvent("reload-open-chat", {
              detail: {
                notificationId: result.notificationId || notificationId,
                reason: "message-sent",
                forceComplete: true
              },
            }),
          );
          
          // MODIFICATO - Chiama refreshAttachments solo se ci sono allegati
          if (refreshAttachments && attachments.length > 0) {
            setTimeout(() => {
              refreshAttachments(result.notificationId || notificationId);
            }, 500);
          }
        }
  
        return result;
      } catch (error) {
        console.error("Error sending message with attachments:", error);
        swal.fire("Errore", "Impossibile inviare il messaggio", "error");
      } finally {
        // Rimuovi lo spinner
        const spinner = document.getElementById('message-sending-spinner');
        if (spinner) {
          spinner.remove();
        }
        document.body.style.overflow = '';
  
        if (typeof setSending === "function") {
          setSending(false);
        }
        setLoading(false);
      }
    }
  };


  // Invio messaggio normale o con allegati - AGGIORNATA
  const handleSend = useCallback(async (msg = message) => {
    if (disabled) return;
    
    // Se ci sono allegati, usa il metodo con allegati
    if (attachments.length > 0) {
      return handleSendWithAttachments();
    }

   

    // Validazioni per messaggi senza allegati
    if (isNewMessage && !title) {
      swal.fire("Errore", "Attenzione: il titolo è obbligatorio", "error");
      return;
    }
    if (isNewMessage && !msg) {
      swal.fire("Errore", "Attenzione: il messaggio è obbligatorio", "error");
      return;
    }
    if (isNewMessage && !localReceiversList && notificationCategoryId <= 1) {

      swal.fire("Errore", "Assicurati di aver selezionato almeno un destinatario", "error");
      return;
    }

    if (msg.trim()) {
      // Crea e mostra lo spinner
      const spinner = document.createElement('div');
      spinner.id = 'message-sending-spinner';
      spinner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        flex-direction: column;
        color: white;
        font-size: 1.2rem;
      `;
      
      spinner.innerHTML = `
        <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mb-4"></div>
        <div>Invio messaggio in corso...</div>
      `;
      
      document.body.appendChild(spinner);
      document.body.style.overflow = 'hidden';

      const notificationData = {
        notificationId,
        message: msg,
        responseOptionId: 3,
        eventId: 0,
        title,
        notificationCategoryId,
        receiversList: localReceiversList,
        replyToMessageId: replyToMessage ? replyToMessage.messageId : 0,
      };

      if (typeof setSending === "function") {
        setSending(true);
      }
      setLoading(true);

      try {
        let result;

        if (typeof onSend === "function") {
          result = await onSend(notificationData);
        } else {
          result = await sendNotification(notificationData);
        }

        if (result) {
          if (typeof updateReceiversList === "function") {
            updateReceiversList("");
          }
          setLocalReceiversList("");
          setMessage("");
          setIsUpdatingContentEditable(true);

          if (typeof setReplyToMessage === "function") {
            setReplyToMessage(null);
          }

          setPlaceholderVisible(true);

          if (inputRef.current) {
            inputRef.current.focus();
          }

          if (fetchNotificationById) {
            setTimeout(() => {
              fetchNotificationById(notificationId, true);
            }, 100);
          }
        }

        return result;
      } catch (error) {
        console.error("Error sending message:", error);
        swal.fire("Errore", "Impossibile inviare il messaggio", "error");
      } finally {
        // Rimuovi lo spinner
        const spinner = document.getElementById('message-sending-spinner');
        if (spinner) {
          spinner.remove();
        }
        document.body.style.overflow = '';

        if (typeof setSending === "function") {
          setSending(false);
        }
        setLoading(false);
      }
    }
  }, [disabled, message, attachments, isNewMessage, title, localReceiversList, notificationCategoryId, 
      replyToMessage, setSending, onSend, sendNotification, updateReceiversList, 
      setReplyToMessage, notificationId, fetchNotificationById, handleSendWithAttachments]);

  const handleThumbsUp = useCallback(async () => {
    if (disabled) return;
    
    const notificationData = {
      notificationId,
      message: "👍",
      responseOptionId: 3,
      eventId: 0,
      title,
      notificationCategoryId,
      receiversList: localReceiversList, // USA LO STATO LOCALE
    };

    if (typeof setSending === "function") {
      setSending(true);
    }
    setLoading(true);

    try {
      let result;

      if (typeof onSend === "function") {
        result = await onSend(notificationData);
      } else {
        result = await sendNotification(notificationData);
      }

      if (result) {
        if (typeof updateReceiversList === "function") {
          updateReceiversList("");
        }
        setLocalReceiversList(""); // Reset stato locale
        setMessage("");
        setIsUpdatingContentEditable(true);
        setPlaceholderVisible(true);

        document.dispatchEvent(
          new CustomEvent("chat-message-sent", {
            detail: {
              notificationId: notificationData.notificationId,
            },
          }),
        );
      }

      return result;
    } catch (error) {
      console.error("Error sending thumbs up:", error);
      swal.fire("Errore", "Impossibile inviare il messaggio", "error");
    } finally {
      if (typeof setSending === "function") {
        setSending(false);
      }
      setLoading(false);
    }
  }, [disabled, notificationId, title, notificationCategoryId, localReceiversList, 
      setSending, onSend, sendNotification, updateReceiversList]);

  const handleKeyPress = useCallback((event) => {
    if (disabled) return;
    
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      handleSend();
    }
    
    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      
      const sel = window.getSelection();
      if (!sel || !sel.getRangeAt || sel.rangeCount === 0) return;
      
      const range = sel.getRangeAt(0);
      const br = document.createElement("br");
      range.deleteContents();
      range.insertNode(br);
      
      const newRange = document.createRange();
      newRange.setStartAfter(br);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      
      setMessage(inputRef.current?.innerText || "");
      setPlaceholderVisible(false);
    }
  }, [disabled, handleSend, localReceiversList]);

  // Gestione allegati
  const handleFileSelect = useCallback((input) => {
    if (disabled || !input?.target?.files || input?.target?.files.length === 0) return;
    
    try {
      const newFiles = Array.from(input.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
      setShowAttachMenu(false);
      
      if (inputRef.current) {
        setTimeout(() => inputRef.current.focus(), 0);
      }
    } catch (error) {
      console.error("Error selecting files:", error);
      swal.fire("Errore", "Errore nella selezione dei file", "error");
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [disabled]);

  const removeAttachment = useCallback((index) => {
    if (disabled) return;
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, [disabled]);

  // Effects
  useEffect(() => {
    return () => {
      if (dropZoneTimeoutRef.current) {
        clearTimeout(dropZoneTimeoutRef.current);
      }
    };
  }, []);

  // Listener per click fuori dalla bottombar
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Controlla se il click è fuori dalla bottombar
      const bottomBar = document.querySelector('.chat-bottom-bar-container');
      if (bottomBar && !bottomBar.contains(event.target)) {
        // Se non c'è testo, rimuovi il focus e riduci l'altezza
        if (!message) {
          setIsFocused(false);
          setPlaceholderVisible(true);
          // Reset dell'altezza
          if (inputRef.current?.parentElement?.parentElement) {
            inputRef.current.parentElement.parentElement.style.height = "32px";
          }
        }
      }
    };

    // Aggiungi il listener solo se l'input è focalizzato
    if (isFocused) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isFocused, message]);

  useEffect(() => {
    const handlePaste = (e) => {
      if (disabled) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      let hasImage = false;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          hasImage = true;
          const blob = items[i].getAsFile();
          
          const clipboardFile = new File(
            [blob],
            `clipboard_image_${Date.now()}.png`,
            { type: blob.type || "image/png" }
          );
          
          setAttachments(prev => [...prev, clipboardFile]);
          e.preventDefault();
          break;
        }
      }
      
      if (!hasImage) {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
      }
    };
    
    if (inputRef.current) {
      inputRef.current.addEventListener("paste", handlePaste);
      return () => {
        if (inputRef.current) {
          inputRef.current.removeEventListener("paste", handlePaste);
        }
      };
    }
  }, [disabled]);

  useLayoutEffect(() => {
    if (isUpdatingContentEditable && inputRef.current) {
      requestAnimationFrame(() => {
        inputRef.current.innerHTML = "";
        inputRef.current.textContent = message;
        setPlaceholderVisible(!message && !isFocused);
        
        if (lastSelectionRef.current) {
          restoreSelection(lastSelectionRef.current);
        }
        
        setIsUpdatingContentEditable(false);
      });
    }
  }, [isUpdatingContentEditable, message, isFocused, restoreSelection]);

  // Formattazione data
  const formatDate = (dateString) => {
    // Controlla se la data è valida
    if (!dateString) {
      return "Data non disponibile";
    }
    
    try {
      const date = new Date(dateString);
      
      // Verifica se la data è valida
      if (isNaN(date.getTime())) {
        return "Data non valida";
      }
      
      const options = {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      };
      return new Intl.DateTimeFormat("it-IT", options).format(date);
    } catch (error) {
      console.error("Errore nella formattazione della data:", error);
      return "Data non valida";
    }
  };

  // Rendering stati speciali
  if (disabled) {
    return (
      <div className="w-full bg-gray-50 border-t border-gray-200 px-4 py-3 text-gray-500 text-sm flex items-center">
        <AlertOctagon className="text-yellow-500 h-4 w-4 mr-2" />
        <p>Hai abbandonato questa chat. Non puoi più inviare messaggi.</p>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="flex justify-between w-full items-center gap-2 border-t border-gray-200 px-4 py-3 bg-gray-50">
        <div className="flex-1 text-center">
          <p className="text-gray-600 text-sm">
            La chat è stata chiusa da{" "}
            <span className="font-medium">{closingUser_Name}</span> il{" "}
            {formatDate(closingDate)}
          </p>
        </div>
        <button
          onClick={reopenChat}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-sm"
        >
          <RefreshCcw className="h-4 w-4" />
          <span>Riapri</span>
        </button>
      </div>
    );
  }

  // Rendering principale
  return (
    <div
      className="w-full bg-white border-t border-gray-200 chat-bottom-bar-container"
      style={{
        maxHeight: isNewMessage ? "150px" : "180px",
        overflowY: "visible",
        position: "relative",
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Overlay drag & drop */}
      {isDraggingOver && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <Paperclip className="drag-overlay-icon" />
            <p className="drag-overlay-text">
              Rilascia qui per allegare il file
            </p>
          </div>
        </div>
      )}

      <div className="p-2 flex flex-col">
        <div className="relative">
          {/* Reply e allegati sopra l'input */}
          <div className="absolute bottom-full left-0 w-full mb-1 z-10">
            {/* Reply preview */}
            <AnimatePresence>
              {replyToMessage && (
                <motion.div
                  className="flex items-center justify-between p-2 rounded-lg bg-white shadow-sm border border-gray-100 mb-1"
                  style={{
                    backgroundColor: `${categoryColor}10`,
                    borderLeft: `3px solid ${categoryColor}`,
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <div className="flex items-start flex-1 min-w-0 gap-2">
                    <Reply className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: categoryColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium" style={{ color: categoryColor }}>
                        Risposta a: {replyToMessage.senderName}
                      </p>
                      <p className="text-xs text-gray-700 truncate">
                        {replyToMessage.message}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setReplyToMessage(null)}
                    className="p-1 rounded-full hover:bg-gray-200"
                  >
                    <X className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Attachments preview */}
            <AnimatePresence>
              {attachments.length > 0 && (
                <motion.div
                  className="flex flex-wrap gap-1.5 p-2 bg-white rounded-lg shadow-sm border border-gray-100"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center bg-gray-100 rounded-full pl-2 pr-1 py-1 text-gray-700 border border-gray-200"
                    >
                      {file.type.startsWith("image/") ? (
                        <Image className="h-3 w-3 text-blue-500 mr-1" />
                      ) : (
                        <FileIcon className="h-3 w-3 text-gray-500 mr-1" />
                      )}
                      <span className="text-xs truncate max-w-[80px]">
                        {file.name}
                      </span>
                      <button
                        className="ml-1 p-0.5 rounded-full hover:bg-gray-200"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Area input principale */}
          <div className="flex items-center w-full gap-2 bg-white py-1">
            {/* Menu allegati */}
            <div className="flex gap-1">
              <div className="relative flex-shrink-0" ref={attachMenuRef}>
                <button
                  className={`p-2 rounded-full ${
                    showAttachMenu ? "bg-gray-200" : "hover:bg-gray-100"
                  }`}
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  disabled={loading}
                >
                  <Paperclip className="h-5 w-5" />
                </button>

                <AnimatePresence>
                  {showAttachMenu && (
                    <motion.div
                      className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg z-20"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      style={{ width: "150px" }}
                    >
                      <button
                        className="flex items-center w-full px-3 py-2 text-left hover:bg-gray-100 text-sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        <span>Carica file</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

                        {/* Input area */}
            <div 
              className="flex-1 bg-gray-100 rounded-xl transition-all duration-300 ease-in-out"
              style={{ 
                height: isFocused ? "150px" : "32px"
              }}
              onMouseEnter={() => setIsFocused(true)}
              onMouseLeave={() => {
                // Controlla se l'input è realmente focalizzato dal DOM
                const isInputFocused = inputRef.current?.matches(':focus');
                
                // Controlla se il mouse è su una delle icone
                const activeElement = document.activeElement;
                const bottomBar = document.querySelector('.chat-bottom-bar-container');
                const isFocusOnIcon = bottomBar && bottomBar.contains(activeElement);
                
                // Se non c'è testo, non è focalizzato e non è su un'icona, riduci l'altezza
                if (!message && !isInputFocused && !isFocusOnIcon) {
                  setIsFocused(false);
                  // Reset dell'altezza
                  const container = inputRef.current?.parentElement?.parentElement;
                  if (container) {
                    container.style.height = "32px";
                  }
                }
              }}
            >
              <div className="relative h-full">
                <div
                  contentEditable
                  ref={inputRef}
                  onInput={handleInputChange}
                  onKeyDown={handleKeyPress}
                  onFocus={() => {
                    setIsFocused(true);
                    setPlaceholderVisible(false);
                  }}
                  onBlur={() => {
                    // Usa setTimeout per controllare se il nuovo focus è su una delle icone
                    setTimeout(() => {
                      const activeElement = document.activeElement;
                      const bottomBar = document.querySelector('.chat-bottom-bar-container');
                      
                      // Controlla se il nuovo focus è dentro la bottombar (icone)
                      const isFocusOnIcon = bottomBar && bottomBar.contains(activeElement);
                      
                      // Controlla se c'è del testo prima di rimuovere il focus
                      if (!message && !isFocusOnIcon) {
                        setIsFocused(false);
                        setPlaceholderVisible(true);
                        // Reset dell'altezza quando non c'è testo
                        if (inputRef.current?.parentElement?.parentElement) {
                          inputRef.current.parentElement.parentElement.style.height = "32px";
                        }
                      }
                    }, 0);
                  }}
                  className="py-1.5 px-3 w-full outline-none rounded-xl transition-all duration-300 ease-in-out"
                  style={{
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                    minHeight: "32px",
                    height: "100%",
                    maxHeight: "100%",
                    overflowY: "auto",
                    resize: "none"
                  }}
                  suppressContentEditableWarning={true}
                />

                {placeholderVisible && (
                  <div className="absolute inset-0 pointer-events-none flex items-center px-3 py-1.5 text-gray-400">
                    {isNewMessage ? "Scrivi un messaggio..." : "Rispondi..."}
                  </div>
                )}
              </div>

              {/* Suggerimenti menzioni */}
              {mentionSuggestions.length > 0 && (
                <div className="absolute bottom-full left-0 w-full bg-white rounded-lg shadow-lg z-10 mb-2 max-h-48 overflow-y-auto">
                  {mentionSuggestions.map((user) => (
                    <div
                      key={user.userId}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleMentionClick(user)}
                    >
                      <div className="font-medium">{user.username}</div>
                      <div className="text-xs text-gray-500">{user.role}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Input file nascosto */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.*,text/plain"
              multiple
            />

            {/* Pulsanti a destra */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Emoji picker */}
              <EmojiPicker
                className="text-gray-500 hover:bg-gray-100 rounded-full p-2"
                onChange={(value) => {
                  lastSelectionRef.current = saveSelection();
                  const currentPosition = lastSelectionRef.current?.start || message.length;
                  const beforeEmoji = message.substring(0, currentPosition);
                  const afterEmoji = message.substring(currentPosition);
                  const newMessage = beforeEmoji + value + afterEmoji;
                  
                  setMessage(newMessage);
                  setPlaceholderVisible(false);
                  setIsUpdatingContentEditable(true);
                  
                  setCursorPosition({
                    start: currentPosition + value.length,
                    end: currentPosition + value.length,
                  });
                  
                  if (inputRef.current) {
                    inputRef.current.focus();
                  }
                }}
              />

              {/* Pulsante invio */}
              <button
                className={`p-2 rounded-full ${
                  message.trim() || attachments.length > 0
                    ? "text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
                style={{
                  backgroundColor: message.trim() || attachments.length > 0 ? categoryColor : "transparent",
                }}
                onClick={() => message.trim() || attachments.length > 0 ? handleSend() : handleThumbsUp()}
                disabled={loading}
              >
                {message.trim() || attachments.length > 0 ? (
                  <SendHorizontal className="h-5 w-5" />
                ) : (
                  <ThumbsUp className="h-5 w-5" />
                )}
              </button>

              {/* Pulsante chiudi chat */}
              <button
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
                onClick={() => closeChat(notificationId)}
                title="Chiudi conversazione"
              >
                <SquareCheck className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Suggerimenti */}
        <div className="flex items-center justify-between pt-0.5">


          {localReceiversList && (
            <p className="text-xs text-blue-600 flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {localReceiversList.split("-").filter(Boolean).length} destinatari
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBottomBar;