import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import {
  SendHorizontal,
  ThumbsUp,
  RefreshCcw,
  SquareCheck,
  Paperclip,
  Camera,
  X,
  Reply,
  FileIcon,
  Users,
  AlertOctagon,
  Image,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import EmojiPicker from "./Emoji-picker";
import { swal } from "../../lib/common";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import FileDropZone from "@/components/ui/FileDropZone";
import { debounce } from "lodash";
import { Margin } from "@mui/icons-material";
import "@/styles/chat-components.css";

const ChatBottomBar = ({
  notificationId,
  title,
  notificationCategoryId,
  reopenChat,
  closeChat,
  isClosed,
  closingUser_Name,
  closingDate,
  users,
  receiversList = "",
  updateReceiversList,
  setSending,
  onSend,
  isNewMessage,
  responseOptions = [],
  replyToMessage,
  setReplyToMessage,
  hexColor,
  onRequestClose,
  openChatModal,
  disabled = false, // Prop per disabilitare il componente (quando chatLeft = 1)
  uploadNotificationAttachment,
  captureAndUploadPhoto,
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
  const [clipboardImage, setClipboardImage] = useState(null);
  const [isUpdatingContentEditable, setIsUpdatingContentEditable] =
    useState(false);
  const [placeholderVisible, setPlaceholderVisible] = useState(true); // New state to control placeholder visibility

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachMenuRef = useRef(null);
  const containerRef = useRef(null);
  const dropZoneTimeoutRef = useRef(null);
  const lastSelectionRef = useRef(null);

  // Use functions from context
  const { getNotificationAttachments, ...contextFunctions } =
    useNotifications();
  // Ottieni riferimenti diretti alle funzioni
  const sendNotificationWithAttachments =
    contextFunctions.sendNotificationWithAttachments;
  const sendNotification = contextFunctions.sendNotification;

  // Ensure we have upload functions either from props or context
  const uploadAttachment =
    uploadNotificationAttachment ||
    contextFunctions.uploadNotificationAttachment;
  const capture =
    captureAndUploadPhoto || contextFunctions.captureAndUploadPhoto;

  const debouncedCursorUpdate = useRef(
    debounce((position) => {
      setCursorPosition(position);
    }, 10),
  ).current;

  // Ottieni il colore della categoria o usa un valore predefinito
  const categoryColor = hexColor || "#3b82f6";

  // Gestione del clic all'esterno del menu allegati per chiuderlo
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(event.target)
      ) {
        setShowAttachMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Gestione del clear-reply-message event per ChatWindow
  useEffect(() => {
    const handleClearReplyMessage = () => {
      if (replyToMessage) {
        setReplyToMessage(null);
      }
    };

    document.addEventListener("clear-reply-message", handleClearReplyMessage);
    return () => {
      document.removeEventListener(
        "clear-reply-message",
        handleClearReplyMessage,
      );
    };
  }, [replyToMessage, setReplyToMessage]);

  // Gestione di drag & drop più stabile
  const handleDragEnter = (e) => {
    if (disabled) return; // Non fare nulla se la chat è disabilitata

    e.preventDefault();
    e.stopPropagation();

    // Clear any existing timeouts
    if (dropZoneTimeoutRef.current) {
      clearTimeout(dropZoneTimeoutRef.current);
      dropZoneTimeoutRef.current = null;
    }

    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    if (disabled) return; // Non fare nulla se la chat è disabilitata

    e.preventDefault();
    e.stopPropagation();

    // Set a timeout to prevent flickering during drag over different child elements
    dropZoneTimeoutRef.current = setTimeout(() => {
      setIsDraggingOver(false);
    }, 100);
  };

  const handleDragOver = (e) => {
    if (disabled) return; // Non fare nulla se la chat è disabilitata

    e.preventDefault();
    e.stopPropagation();

    // Keep refreshing the dragging state
    if (dropZoneTimeoutRef.current) {
      clearTimeout(dropZoneTimeoutRef.current);
      dropZoneTimeoutRef.current = null;
    }

    setIsDraggingOver(true);
  };

  const handleDrop = (e) => {
    if (disabled) return; // Non fare nulla se la chat è disabilitata

    e.preventDefault();
    e.stopPropagation();

    // Clear any existing timeouts
    if (dropZoneTimeoutRef.current) {
      clearTimeout(dropZoneTimeoutRef.current);
      dropZoneTimeoutRef.current = null;
    }

    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setAttachments((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  // Cleanup dragover timeout on unmount
  useEffect(() => {
    return () => {
      if (dropZoneTimeoutRef.current) {
        clearTimeout(dropZoneTimeoutRef.current);
      }
    };
  }, []);

  // Listener per rilevare l'immagine dagli appunti
  useEffect(() => {
    const handleClipboardImage = (event) => {
      if (disabled) return;

      const imageBlob = event.detail?.image;
      if (imageBlob) {
        // Crea un oggetto File dall'immagine rilevata
        const clipboardFile = new File(
          [imageBlob],
          `clipboard_image_${Date.now()}.png`,
          {
            type: imageBlob.type || "image/png",
          },
        );

        // Aggiungi il file all'elenco degli allegati
        setAttachments((prev) => [...prev, clipboardFile]);
        setClipboardImage(URL.createObjectURL(clipboardFile));
      }
    };

    document.addEventListener("clipboard-image-ready", handleClipboardImage);

    return () => {
      document.removeEventListener(
        "clipboard-image-ready",
        handleClipboardImage,
      );
    };
  }, [disabled]);

  useEffect(() => {
    const handleCapturedPhoto = (event) => {
      if (disabled) return;

      const imageFile = event.detail?.image;
      if (imageFile) {
        // Aggiungi il file all'elenco degli allegati
        setAttachments((prev) => [...prev, imageFile]);
      }
    };

    document.addEventListener("captured-photo-ready", handleCapturedPhoto);

    return () => {
      document.removeEventListener("captured-photo-ready", handleCapturedPhoto);
    };
  }, [disabled]);

  // Gestione del paste direttamente nell'input
  useEffect(() => {
    const handlePaste = (e) => {
      if (disabled) return;

      // Aggiungi un flag all'evento per marcare che è già stato gestito
      if (e.clipboardHandled) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      let hasImage = false;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          hasImage = true;
          const blob = items[i].getAsFile();

          // Crea un oggetto File dall'immagine rilevata
          const clipboardFile = new File(
            [blob],
            `clipboard_image_${Date.now()}.png`,
            {
              type: blob.type || "image/png",
            },
          );

          // Aggiungi il file all'elenco degli allegati
          setAttachments((prev) => [...prev, clipboardFile]);
          setClipboardImage(URL.createObjectURL(clipboardFile));

          // Impedisci che l'immagine venga incollata nell'input
          e.preventDefault();

          // Marca l'evento come già gestito
          e.clipboardHandled = true;
          break;
        }
      }

      // Se non c'è un'immagine, continua normalmente
      return !hasImage;
    };

    if (inputRef.current) {
      inputRef.current.addEventListener("paste", handlePaste);

      return () => {
        if (inputRef.current) {
          inputRef.current.removeEventListener("paste", handlePaste);
        }
      };
    }
  }, [inputRef, disabled]);

  // Salva lo stato della selezione prima di ogni render
  const saveSelection = () => {
    if (!inputRef.current) return null;

    const selection = window.getSelection();
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    // Verifica che la selezione sia all'interno dell'input
    if (!inputRef.current.contains(range.commonAncestorContainer)) return null;

    return {
      range: range.cloneRange(),
      start: getCaretPosition(inputRef.current),
      end: getCaretPosition(inputRef.current),
      container: range.startContainer,
      offset: range.startOffset,
      textLength:
        range.startContainer.nodeType === Node.TEXT_NODE
          ? range.startContainer.length
          : 0,
    };
  };

  // Calcola la posizione del cursore all'interno dell'elemento
  const getCaretPosition = (element) => {
    let position = 0;
    const selection = window.getSelection();

    if (!selection.rangeCount) return 0;

    const range = selection.getRangeAt(0).cloneRange();
    range.setStart(element, 0);
    range.setEnd(selection.anchorNode, selection.anchorOffset);

    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    position = preCaretRange.toString().length;

    return position;
  };

  // Applica la selezione salvata
  const restoreSelection = (savedSelection) => {
    if (!savedSelection || !inputRef.current) return;

    try {
      const selection = window.getSelection();
      const range = savedSelection.range;

      // Verifica che il container sia ancora nel DOM
      if (!document.contains(range.startContainer)) {
        // Se non è più nel DOM, cerca di selezionare la posizione appropriata
        const allTextNodes = getAllTextNodes(inputRef.current);
        let remainingOffset = savedSelection.start;
        let targetNode = null;
        let targetOffset = 0;

        for (const node of allTextNodes) {
          if (remainingOffset <= node.length) {
            targetNode = node;
            targetOffset = remainingOffset;
            break;
          }
          remainingOffset -= node.length;
        }

        // Se non abbiamo trovato un nodo adatto, prova a usare l'ultimo nodo o crea un nuovo nodo di testo
        if (!targetNode) {
          if (allTextNodes.length > 0) {
            targetNode = allTextNodes[allTextNodes.length - 1];
            targetOffset = targetNode.length;
          } else {
            targetNode = document.createTextNode("");
            inputRef.current.appendChild(targetNode);
            targetOffset = 0;
          }
        }

        const newRange = document.createRange();
        newRange.setStart(targetNode, targetOffset);
        newRange.setEnd(targetNode, targetOffset);

        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // Se il container è ancora nel DOM, usiamo il range salvato
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (error) {
      console.error("Errore nel ripristino della selezione:", error);
    }
  };

  // Funzione migliorata per gestire il contentEditable
  useLayoutEffect(() => {
    if (isUpdatingContentEditable && inputRef.current) {
      // Aspetta che React termini di aggiornare il DOM
      requestAnimationFrame(() => {
        inputRef.current.innerHTML = ""; // Clear content first
        inputRef.current.textContent = message;

        // Hide placeholder if there's content or focus
        setPlaceholderVisible(!message && !isFocused);

        // Ripristina la selezione
        if (lastSelectionRef.current) {
          restoreSelection(lastSelectionRef.current);
        } else if (cursorPosition) {
          // Posiziona il cursore alla fine se non c'è selezione salvata
          const textNodes = getAllTextNodes(inputRef.current);
          if (textNodes.length > 0) {
            const lastNode = textNodes[textNodes.length - 1];
            const range = document.createRange();
            range.setStart(lastNode, lastNode.length);
            range.setEnd(lastNode, lastNode.length);

            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }

        setIsUpdatingContentEditable(false);
      });
    }
  }, [isUpdatingContentEditable, message]);

  // Cancella il messaggio di risposta quando l'utente clicca "Annulla"
  const handleReplyCancel = () => {
    // Add check for hasLeftChat from props rather than from global scope
    if (disabled) return; // Use disabled instead, which is already a prop
    if (typeof setReplyToMessage === "function") {
      setReplyToMessage(null);
    } else {
      // Emetti un evento personalizzato se setReplyToMessage non è disponibile
      document.dispatchEvent(new CustomEvent("clear-reply-message"));
    }
  };

  // Gestione della posizione del cursore
  useLayoutEffect(() => {
    if (cursorPosition !== null && inputRef.current && !disabled) {
      try {
        if (document.activeElement !== inputRef.current) {
          inputRef.current.focus();
        }

        const textNodes = getAllTextNodes(inputRef.current);
        let pos = cursorPosition.start;
        let currentNode = null;
        let currentOffset = 0;

        // Trova il nodo e l'offset corretti
        for (const node of textNodes) {
          if (pos <= node.length) {
            currentNode = node;
            currentOffset = pos;
            break;
          }
          pos -= node.length;
        }

        // Se abbiamo trovato una posizione valida, imposta il cursore
        if (currentNode) {
          const range = document.createRange();
          range.setStart(currentNode, currentOffset);
          range.setEnd(currentNode, currentOffset);

          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);

          // Aggiunta importante: scorrimento automatico alla posizione del cursore
          // Questo è importante per vedere dove si trova il cursore quando si aggiunge una nuova riga
          if (currentNode.parentNode) {
            currentNode.parentNode.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        } else if (textNodes.length > 0) {
          // Se non abbiamo trovato la posizione ma ci sono nodi di testo, vai alla fine
          const lastNode = textNodes[textNodes.length - 1];
          const range = document.createRange();
          range.setStart(lastNode, lastNode.length);
          range.setEnd(lastNode, lastNode.length);

          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        } else if (inputRef.current.childNodes.length === 0) {
          // Se non ci sono nodi, crea un nodo di testo vuoto
          const textNode = document.createTextNode("");
          inputRef.current.appendChild(textNode);

          const range = document.createRange();
          range.setStart(textNode, 0);
          range.setEnd(textNode, 0);

          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } catch (error) {
        console.error("Errore nell'impostazione del cursore:", error);
      }
    }
  }, [cursorPosition, disabled]);

  // Assicurarsi che il file input venga completamente resettato
  useEffect(() => {
    if (attachments.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [attachments]);

  // Aggiungi questo all'interno del componente ChatBottomBar
  useEffect(() => {
    const handlePaste = (e) => {
      if (disabled) return;

      // Previeni il comportamento predefinito solo se non è già stato gestito da altro handler
      if (!e.defaultPrevented) {
        e.preventDefault();

        // Ottieni il testo puro dagli appunti, senza formattazione
        const text = e.clipboardData.getData("text/plain");

        // Inserisci il testo senza formattazione nella posizione corrente
        document.execCommand("insertText", false, text);
      }
    };

    // Aggiungi il listener all'elemento di input
    if (inputRef.current) {
      inputRef.current.addEventListener("paste", handlePaste);
    }

    return () => {
      // Rimuovi il listener quando il componente viene smontato
      if (inputRef.current) {
        inputRef.current.removeEventListener("paste", handlePaste);
      }
    };
  }, [disabled, inputRef.current]); // Dipendenze per rieseguire l'effect

  const currentResponseOptions = Array.isArray(responseOptions)
    ? responseOptions.find(
        (option) => option.notificationCategoryId == notificationCategoryId,
      ) || {
        type: "text",
        reply: true,
      }
    : { type: "text", reply: true };

  const allowedResponses =
    currentResponseOptions.type === "option"
      ? JSON.parse(currentResponseOptions.valuesJSON || "[]").map(
          (opt) => opt.defaultValue,
        )
      : [];

  const allowReply = currentResponseOptions.reply;

  // Update placeholder visibility when the input changes
  const handleInputChange = (event) => {
    if (disabled) return;

    // Salva la selezione corrente prima di cambiare lo stato
    lastSelectionRef.current = saveSelection();

    // Ottieni il testo con i caratteri di nuova riga preservati
    // Sostituendo <br> o <div> con \n
    const htmlContent = event.target.innerHTML || "";
    let value = "";

    // Se utilizziamo contentEditable, dobbiamo estrarre il testo preservando i ritorno a capo
    if (htmlContent) {
      // Sostituisci <br> o <div> con nuove righe
      value = htmlContent
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<div[^>]*>(.*?)<\/div>/gi, "\n$1")
        .replace(/<[^>]*>/g, ""); // Rimuove tutti i tag HTML, compresi quelli di stile

      // Decodifica qualsiasi entità HTML che potrebbe essere nel testo
      const textarea = document.createElement("textarea");
      textarea.innerHTML = value;
      value = textarea.value;

      // Rimuovi la prima riga vuota se presente
      value = value.replace(/^\n/, "");
    } else {
      value = event.target.innerText || "";
    }

    // Update placeholder visibility based on content
    setPlaceholderVisible(value.length === 0 && !isFocused);

    // Aggiorna lo stato del messaggio
    setMessage(value);

    // Resto del codice per la gestione delle menzioni...
    const mentionTriggerIndex = value.lastIndexOf("@", value.length - 1);
    if (mentionTriggerIndex > -1) {
      const mentionQuery = value.slice(mentionTriggerIndex + 1).toLowerCase();
      if (mentionQuery) {
        const filteredUsers = users.filter((user) =>
          user.username?.toLowerCase().startsWith(mentionQuery),
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
  };

  // Funzione helper per ottenere tutti i nodi di testo in ordine
  const getAllTextNodes = (element) => {
    if (!element) return [];

    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false,
    );

    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    return textNodes;
  };

  const handleMentionClick = (user) => {
    if (disabled || mentionIndex === null) return;

    // Salva la selezione corrente
    lastSelectionRef.current = saveSelection();

    // Ottieni il testo della query dopo il simbolo @
    const queryText = message.slice(mentionIndex).split(/\s+/)[0];

    // Calcola il nuovo messaggio con la menzione
    // Rimuove la parte di query digitata (@ila) e la sostituisce con la menzione completa
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

    // Aggiorna la lista dei destinatari
    // FIX: Ensure receiversList is treated as a string, even if it's an array
    const currentReceivers = Array.isArray(receiversList)
      ? receiversList.join("-")
      : receiversList || "";

    // Then we can safely split it
    const receiversArray = currentReceivers.split("-").filter(Boolean);

    // Add the new user ID if not already in the list
    if (!receiversArray.includes(user.userId.toString())) {
      receiversArray.push(user.userId.toString());
    }

    // Call updateReceiversList with the joined string
    if (typeof updateReceiversList === "function") {
      updateReceiversList(receiversArray.join("-"));
    }
  };

  const handleSendWithAttachments = async () => {
    if (disabled) return; // Non fare nulla se la chat è disabilitata

    // Verifica per nuovi messaggi
    if (isNewMessage && !receiversList && notificationCategoryId <= 1) {
      swal.fire(
        "Errore",
        "Assicurati di aver selezionato almeno un destinatario",
        "error",
      );
      return;
    }

    // Se manca il titolo, avvisa l'utente ed esce
    if (isNewMessage && !title) {
      swal.fire("Errore", "Attenzione: il titolo è obbligatorio", "error");
      return;
    }

    // Consenti l'invio se c'è un testo O almeno un allegato
    if (message.trim() || attachments.length > 0) {
      // Trova l'utente corrente in modo sicuro
      const currentUser = users?.find((user) => user?.isCurrentUser);

      // Crea una copia temporanea del messaggio per feedback immediato
      const tempMessage = {
        messageId: `temp_${Date.now()}`,
        message:
          message.trim() ||
          (attachments.length > 0 ? "Ha condiviso allegati" : ""),
        senderId: currentUser?.userId || 0,
        senderName: currentUser
          ? `${currentUser.firstName} ${currentUser.lastName}`
          : "Tu",
        selectedUser: "1",
        tbCreated: new Date().toISOString(),
        replyToMessageId: replyToMessage ? replyToMessage.messageId : 0,
        // Aggiungi info temporanee sugli allegati
        tempAttachments: attachments.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      };

      const notificationData = {
        notificationId,
        message:
          message.trim() ||
          (attachments.length > 0 ? "Ha condiviso allegati" : ""),
        responseOptionId: 3,
        eventId: 0,
        title,
        notificationCategoryId,
        receiversList,
        replyToMessageId: replyToMessage ? replyToMessage.messageId : 0,
      };

      if (typeof setSending === "function") {
        setSending(true);
      }
      setLoading(true);

      try {
        let result;

        result = await sendNotificationWithAttachments(
          notificationData,
          attachments,
        );

        if (result && (result.success || result.notificationId)) {
          // Reset degli stati
          if (typeof updateReceiversList === "function") {
            updateReceiversList("");
          }
          setMessage("");
          setIsUpdatingContentEditable(true);
          setAttachments([]);

          // Resetta messaggio di risposta
          if (typeof setReplyToMessage === "function") {
            setReplyToMessage(null);
          } else {
            // Emetti un evento personalizzato
            document.dispatchEvent(new CustomEvent("clear-reply-message"));
          }

          setClipboardImage(null);
          setPlaceholderVisible(true);

          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }

          if (inputRef.current) {
            inputRef.current.focus();
          }

          // Se è un nuovo messaggio (notificationId è 0), allora usa la logica per aprire la nuova chat
          if (isNewMessage && (result.notificationId > 0 || result.Success)) {
            if (onRequestClose) {
              // Chiudi prima il modale
              onRequestClose();
              // Poi apri la nuova chat
              setTimeout(() => {
                if (openChatModal)
                  openChatModal(result.notificationId || result.id);
              }, 100);
            }
          }

          // Emetti un evento per forzare l'aggiornamento con alta priorità
          document.dispatchEvent(
            new CustomEvent("chat-message-sent", {
              detail: {
                notificationId:
                  result.notificationId || notificationData.notificationId,
                highPriority: true,
              },
            }),
          );

          // Aggiornamento diretto tramite context
          if (contextFunctions.fetchNotificationById) {
            setTimeout(() => {
              contextFunctions.fetchNotificationById(
                result.notificationId || notificationId,
                true,
              );
              // Aggiorna gli allegati
              getNotificationAttachments(
                result.notificationId || notificationId,
              )
                .then((data) => {
                  if (Array.isArray(data)) {
                    // Emetti un evento per aggiornare ChatSidebar
                    document.dispatchEvent(
                      new CustomEvent("attachments-updated", {
                        detail: {
                          notificationId:
                            result.notificationId || notificationId,
                          attachments: data,
                        },
                      }),
                    );
                  }
                })
                .catch((err) => {
                  console.error("Error refreshing attachments:", err);
                });
            }, 100);
          }
        } else {
          // Rimuovi il messaggio temporaneo in caso di errore
          document.dispatchEvent(
            new CustomEvent("temp-message-removed", {
              detail: {
                messageId: tempMessage.messageId,
                notificationId,
              },
            }),
          );
        }

        return result;
      } catch (error) {
        console.error("Error sending message with attachments:", error);
        swal.fire("Errore", "Impossibile inviare il messaggio", "error");

        // Rimuovi il messaggio temporaneo in caso di errore
        document.dispatchEvent(
          new CustomEvent("temp-message-removed", {
            detail: {
              messageId: tempMessage.messageId,
              notificationId,
            },
          }),
        );
      } finally {
        if (typeof setSending === "function") {
          setSending(false);
        }
        setLoading(false);
      }
    }
  };

  const handleSend = async (msg = message) => {
    if (disabled) return; // Non fare nulla se la chat è disabilitata

    // Se ci sono allegati, utilizziamo il metodo per inviare con allegati
    if (attachments.length > 0) {
      return handleSendWithAttachments();
    }

    // Validazioni...
    if (isNewMessage && !title) {
      swal.fire("Errore", "Attenzione: il titolo è obbligatorio", "error");
      return;
    }
    if (isNewMessage && !msg) {
      swal.fire("Errore", "Attenzione: il messaggio è obbligatorio", "error");
      return;
    }
    if (isNewMessage && !receiversList && notificationCategoryId <= 1) {
      swal.fire(
        "Errore",
        "Assicurati di aver selezionato almeno un destinatario",
        "error",
      );
      return;
    }

    if (msg.trim()) {
      // Aggiungiamo un feedback immediato all'utente creando una copia locale temporanea
      // del messaggio che sarà visibile immediatamente
      // Find current user safely
      const currentUser = users?.find((user) => user?.isCurrentUser);

      // Crea una copia temporanea del messaggio per visualizzazione immediata
      const tempMessage = {
        messageId: `temp_${Date.now()}`,
        message: msg,
        senderId: currentUser?.userId || 0,
        senderName: currentUser
          ? `${currentUser.firstName} ${currentUser.lastName}`
          : "Tu",
        selectedUser: "1",
        tbCreated: new Date().toISOString(),
        replyToMessageId: replyToMessage ? replyToMessage.messageId : 0,
      };

      // Preserva i ritorni a capo - non aggiungere manipolazioni extra al messaggio
      const notificationData = {
        notificationId,
        message: msg, // Usiamo il messaggio originale con i ritorni a capo
        responseOptionId: 3,
        eventId: 0,
        title,
        notificationCategoryId,
        receiversList,
        replyToMessageId: replyToMessage ? replyToMessage.messageId : 0,
      };

      if (typeof setSending === "function") {
        setSending(true);
      }
      setLoading(true);

      try {
        let result;

        // Usa la funzione onSend passata come prop se disponibile, altrimenti usa sendNotification dal contesto
        if (typeof onSend === "function") {
          result = await onSend(notificationData);
        } else {
          result = await sendNotification(notificationData);
        }

        // Resetta gli stati se l'invio è andato a buon fine
        if (result) {
          if (typeof updateReceiversList === "function") {
            updateReceiversList("");
          }
          setMessage("");
          setIsUpdatingContentEditable(true);

          // Resetta il messaggio di risposta
          if (typeof setReplyToMessage === "function") {
            setReplyToMessage(null);
          } else {
            // Emetti un evento personalizzato se setReplyToMessage non è disponibile
            document.dispatchEvent(new CustomEvent("clear-reply-message"));
          }

          setPlaceholderVisible(true);

          if (inputRef.current) {
            inputRef.current.focus();
          }

          // Forza un aggiornamento diretto delle notifiche con priorità alta
          if (contextFunctions.fetchNotificationById) {
            setTimeout(() => {
              contextFunctions.fetchNotificationById(notificationId, true); // true = alta priorità
            }, 100);
          } else if (contextFunctions.restartNotificationWorker) {
            setTimeout(() => {
              contextFunctions.restartNotificationWorker(true); // true = alta priorità
            }, 200);
          }
        }

        return result;
      } catch (error) {
        console.error("Error sending message:", error);
        swal.fire("Errore", "Impossibile inviare il messaggio", "error");

        // Rimuovi il messaggio temporaneo in caso di errore
        document.dispatchEvent(
          new CustomEvent("temp-message-removed", {
            detail: {
              messageId: tempMessage.messageId,
              notificationId: notificationId,
            },
          }),
        );
      } finally {
        if (typeof setSending === "function") {
          setSending(false);
        }
        setLoading(false);
      }
    }
  };

  const handleThumbsUp = async () => {
    if (disabled) return; // Non fare nulla se la chat è disabilitata

    const notificationData = {
      notificationId,
      message: "👍",
      responseOptionId: 3,
      eventId: 0,
      title,
      notificationCategoryId,
      receiversList,
    };

    if (typeof setSending === "function") {
      setSending(true);
    }
    setLoading(true);

    try {
      let result;

      // Usa la funzione onSend passata come prop se disponibile, altrimenti usa sendNotification dal contesto
      if (typeof onSend === "function") {
        result = await onSend(notificationData);
      } else {
        result = await sendNotification(notificationData);
      }

      // Resetta gli stati se l'invio è andato a buon fine
      if (result) {
        if (typeof updateReceiversList === "function") {
          updateReceiversList("");
        }
        setMessage("");
        setIsUpdatingContentEditable(true);
        setPlaceholderVisible(true);

        // Emetti un evento per forzare l'aggiornamento
        document.dispatchEvent(new CustomEvent("refreshNotifications"));

        // Emetti anche un evento specifico
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
  };

  const handleOptionClick = (option) => {
    if (disabled) return; // Non fare nulla se la chat è disabilitata

    // Update the message first, then call handleSend after it's updated
    setMessage(option);
    handleSend(option);
  };

  const handleKeyPress = (event) => {
    if (disabled) return; // Non fare nulla se la chat è disabilitata

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

      // Posiziona il cursore dopo il <br>
      const newRange = document.createRange();
      newRange.setStartAfter(br);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);

      setMessage(inputRef.current?.innerText || "");
      setPlaceholderVisible(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Intl.DateTimeFormat("it-IT", options).format(date);
  };

  // Funzione per gestire il caricamento di un file
  const handleFileSelect = (input) => {
    if (disabled || !input?.target?.files || input?.target?.files.length === 0)
      return;

    try {
      const newFiles = Array.from(input.target.files);
      setAttachments((prev) => [...prev, ...newFiles]);
      setShowAttachMenu(false); // Chiudi il menu dopo la selezione

      // Focus sull'area di input per una migliore esperienza utente
      if (inputRef.current) {
        setTimeout(() => {
          inputRef.current.focus();
        }, 0);
      }
    } catch (error) {
      console.error("Error selecting files:", error);
      swal.fire("Errore", "Errore nella selezione dei file", "error");

      // Reset dell'input anche in caso di errore
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Funzione per gestire il file rilasciato tramite drag & drop
  const handleDraggedFile = (file) => {
    if (disabled || !file) return;

    try {
      setAttachments((prev) => [...prev, file]);

      // Focus sull'area di input per una migliore esperienza utente
      if (inputRef.current) {
        setTimeout(() => {
          inputRef.current.focus();
        }, 0);
      }
    } catch (error) {
      console.error("Error with dragged file:", error);
      swal.fire("Errore", "Errore nella gestione del file", "error");
    }
  };

  const removeAttachment = (index) => {
    if (disabled) return; // Non fare nulla se la chat è disabilitata

    setAttachments((prev) => {
      // Crea una nuova array senza l'elemento all'indice specificato
      const updatedAttachments = prev.filter((_, i) => i !== index);

      // Se l'allegato rimosso era un'immagine degli appunti, resetta lo stato dell'immagine
      if (index === prev.length - 1 && clipboardImage) {
        setClipboardImage(null);
      }

      return updatedAttachments;
    });
  };

  // Funzione per catturare e caricare una foto
  const handleCapturePhoto = async () => {
    if (disabled) return; // Non fare nulla se la chat è disabilitata

    try {
      setLoading(true);
      setShowAttachMenu(false); // Chiudi il menu dopo la selezione

      // Usa la funzione captureAndUploadPhoto dal context o dalle props
      const captureFunc = capture || contextFunctions.captureAndUploadPhoto;

      const result = await captureFunc(notificationId);
      if (result) {
        swal.fire({
          icon: "success",
          text: "Foto caricata con successo",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
        });
      }
    } catch (error) {
      swal.fire("Errore", "Impossibile catturare o caricare la foto", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleAttachMenu = () => {
    if (disabled) return; // Non fare nulla se la chat è disabilitata

    setShowAttachMenu((prev) => !prev);
  };

  // Se la chat è stata abbandonata, mostra un messaggio informativo invece della barra di input
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

  return (
    <div
      ref={containerRef}
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
      {/* Overlay per drag & drop - visibile solo durante drag */}
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
        {/* Componenti dinamici (Reply e Allegati) posizionati in layer superiore */}
        <div className="relative">
          {/* Layer superiore per allegati e risposte che scorrono sopra l'input invece che spostarlo in giù */}
          <div className="absolute bottom-full left-0 w-full mb-1 z-10">
            {/* Reply preview */}
            <AnimatePresence>
              {replyToMessage && allowReply && (
                <motion.div
                  className="flex items-center justify-between p-2 rounded-lg bg-white shadow-sm border border-gray-100 mb-1"
                  style={{
                    backgroundColor: `${categoryColor}10`,
                    borderLeft: `3px solid ${categoryColor}`,
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-start flex-1 min-w-0 gap-2">
                    <Reply
                      className="h-4 w-4 mt-0.5 flex-shrink-0"
                      style={{ color: categoryColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-medium"
                        style={{ color: categoryColor }}
                      >
                        Risposta a: {replyToMessage.senderName}
                      </p>
                      <p className="text-xs text-gray-700 truncate">
                        {replyToMessage.message}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleReplyCancel}
                      className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Attachments preview */}
            <AnimatePresence>
              {(attachments.length > 0 || clipboardImage) && allowReply && (
                <motion.div
                  className="flex flex-wrap gap-1.5 p-2 bg-white rounded-lg shadow-sm border border-gray-100"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Mostra l'anteprima dell'immagine dagli appunti se presente */}
                  {clipboardImage && (
                    <div className="relative group">
                      <div className="w-16 h-16 rounded-md overflow-hidden border border-gray-200">
                        <img
                          src={clipboardImage}
                          alt="Immagine dagli appunti"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          // Trova l'indice dell'ultima immagine negli allegati
                          const index = attachments.length - 1;
                          if (index >= 0) removeAttachment(index);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {/* Mostra gli altri allegati */}
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center bg-gray-100 rounded-full pl-2 pr-1 py-1 text-gray-700 border border-gray-200"
                    >
                      {file.type.startsWith("image/") ? (
                        <Image className="h-3 w-3 text-blue-500 mr-1 flex-shrink-0" />
                      ) : (
                        <FileIcon className="h-3 w-3 text-gray-500 mr-1 flex-shrink-0" />
                      )}
                      <span className="text-xs truncate max-w-[80px]">
                        {file.name}
                      </span>
                      <button
                        className="ml-1 p-0.5 rounded-full hover:bg-gray-200 text-gray-500 hover:text-red-500"
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

          {/* Area principale input */}
          <div className="flex items-center w-full gap-2 bg-white py-1 relative">
            {/* Menu allegati e selettore destinatari - SPOSTATO A SINISTRA */}
            {allowedResponses.length === 0 && allowReply && (
              <div className="flex gap-1">
                {/* Menu allegati */}
                <div className="relative flex-shrink-0" ref={attachMenuRef}>
                  <button
                    className={`p-2 rounded-full ${
                      showAttachMenu
                        ? "bg-gray-200 text-gray-800"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                    onClick={toggleAttachMenu}
                    disabled={loading}
                    title="Allegati"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>

                  {/* Menu a tendina */}
                  <AnimatePresence>
                    {showAttachMenu && (
                      <motion.div
                        className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg z-20 overflow-hidden"
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        style={{ width: "150px" }}
                      >
                        <button
                          className="flex items-center w-full px-3 py-2 text-left hover:bg-gray-100 text-sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Paperclip className="h-4 w-4 mr-2 text-gray-500" />
                          <span>Carica file</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Main Input Area */}
            <div
              className="flex-1 bg-gray-100 rounded-xl"
              style={{ height: "48px" }}
            >
              {allowedResponses.length > 0 ? (
                <div className="flex flex-wrap gap-2 justify-center p-2">
                  {allowedResponses.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleOptionClick(option)}
                      className="px-3 py-1.5 bg-white shadow-sm hover:shadow text-sm rounded-lg border border-gray-200 transition-all"
                      style={{
                        borderLeft: `3px solid ${categoryColor}`,
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : allowReply ? (
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
                      setIsFocused(false);
                      setPlaceholderVisible(!message);
                    }}
                    className={`py-1.5 px-3 w-full outline-none rounded-xl ${disabled ? "bg-gray-200 cursor-not-allowed" : ""}`}
                    style={{
                      whiteSpace: "pre-wrap",
                      wordWrap: "break-word",
                      wordBreak: "break-word",
                      minHeight: "32px",
                      maxHeight: "48px",
                      overflowY: "auto",
                      overflowX: "hidden",
                      width: "100%",
                      display: "block",
                    }}
                    suppressContentEditableWarning={true}
                    aria-disabled={disabled}
                  ></div>

                  {/* Placeholder separato dal contenuto editabile */}
                  {placeholderVisible && (
                    <div className="absolute inset-0 pointer-events-none flex items-center px-3 py-1.5 text-gray-400">
                      {isNewMessage ? "Scrivi un messaggio..." : "Rispondi..."}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Mention Suggestions */}
              {mentionSuggestions.length > 0 && !disabled && (
                <div
                  className="absolute bottom-full left-0 w-full bg-white rounded-lg shadow-lg z-10 mb-2"
                  style={{
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                >
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

            {/* Bottoni a destra */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.*,text/plain"
                multiple
                disabled={disabled}
              />

              {/* Emoji Picker - SPOSTATO A DESTRA */}
              {allowedResponses.length === 0 && allowReply && !disabled && (
                <EmojiPicker
                  className="text-gray-500 hover:bg-gray-100 rounded-full p-2"
                  onChange={(value) => {
                    // Salva la selezione corrente
                    lastSelectionRef.current = saveSelection();

                    // Calcola la posizione per l'inserimento dell'emoji
                    const currentPosition =
                      lastSelectionRef.current?.start || message.length;
                    const beforeEmoji = message.substring(0, currentPosition);
                    const afterEmoji = message.substring(currentPosition);

                    // Aggiorna il messaggio con l'emoji
                    const newMessage = beforeEmoji + value + afterEmoji;
                    setMessage(newMessage);

                    // Nascondi il placeholder se si aggiunge un'emoji
                    setPlaceholderVisible(false);

                    // Imposta il flag per aggiornare il contentEditable nel prossimo tick
                    setIsUpdatingContentEditable(true);

                    // Configura la nuova posizione del cursore
                    setCursorPosition({
                      start: currentPosition + value.length,
                      end: currentPosition + value.length,
                      isAtEnd: false,
                    });

                    if (inputRef.current) {
                      inputRef.current.focus();
                    }
                  }}
                  disabled={disabled}
                />
              )}

              {/* Send/Like Button */}
              {allowedResponses.length === 0 && allowReply && !disabled && (
                <button
                  className={`p-2 rounded-full ${
                    message.trim() || attachments.length > 0
                      ? `text-white`
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                  style={{
                    backgroundColor:
                      message.trim() || attachments.length > 0
                        ? categoryColor
                        : "transparent",
                  }}
                  onClick={() =>
                    message.trim() || attachments.length > 0
                      ? attachments.length > 0
                        ? handleSendWithAttachments()
                        : handleSend()
                      : handleThumbsUp()
                  }
                  disabled={loading || disabled}
                  title={
                    message.trim() || attachments.length > 0
                      ? "Invia messaggio"
                      : "Mi piace"
                  }
                >
                  {message.trim() || attachments.length > 0 ? (
                    <SendHorizontal className="h-5 w-5" />
                  ) : (
                    <ThumbsUp className="h-5 w-5" />
                  )}
                </button>
              )}

              {/* Close Chat Button */}
              {!disabled && (
                <button
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
                  onClick={() => closeChat(notificationId)}
                  title="Chiudi conversazione"
                >
                  <SquareCheck className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Area suggerimenti - più compatta */}
        <div className="flex items-center justify-between pt-0.5">
          <p className="text-xs text-gray-400 leading-tight">
            Premi Invio per inviare, Shift+Invio per andare a capo
          </p>

          {receiversList && receiversList.split("-").length > 0 && (
            <p className="text-xs text-blue-600 flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {receiversList.split("-").length} destinatari selezionati
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBottomBar;
