import { useState, useEffect, useCallback, useRef } from "react";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import { swal } from "@/lib/common";

const useDocumentChats = ({
  documentType,
  documentId,
  documentData = {},
  autoLoad = true,
  onChatCreated,
  onChatUnlinked
}) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Ref per evitare chiamate duplicate
  const lastLoadRef = useRef({ type: null, id: null });

  const {
    searchChatsByDocument,
    linkDocument,
    unlinkDocument,
    openChat,
    openChatInReadOnlyMode,
    sendNotification
  } = useNotifications();

  // Helper per swal con z-index elevato quando siamo in un portal o modal
  const swalWithHighZIndex = useCallback((options) => {
    return swal.fire({
      ...options,
      didOpen: () => {
        // Trova il container di swal
        const swalContainer = swal.getContainer();
        if (swalContainer) {
          // Controlla se siamo in un modal o portal
          const hasModal = document.querySelector('[role="dialog"][data-state="open"]');
          const hasPortal = document.getElementById('chat-portal-root');
          
          if (hasModal || hasPortal) {
            // Imposta z-index molto alto
            swalContainer.style.zIndex = '20000';
            
            // Assicurati che anche il backdrop sia sopra
            const backdrop = swalContainer.querySelector('.swal2-backdrop');
            if (backdrop) {
              backdrop.style.zIndex = '19999';
            }
          }
        }
        
        // Chiama l'eventuale didOpen originale
        if (options.didOpen) {
          options.didOpen();
        }
      }
    });
  }, []);

  // Carica le chat collegate al documento
  const loadChats = useCallback(async () => {
    // Evita ricaricamenti inutili
    if (lastLoadRef.current.type === documentType && 
        lastLoadRef.current.id === documentId) {
      return;
    }

    if (!documentType || !documentId) {
      setChats([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Costruisci il valore di ricerca basato sul tipo di documento
      let searchValue = documentId;
      
      // Per Task necessita di gestione speciale
      if (documentType === 'Task' && documentData.projectId) {
        searchValue = {
          projectId: documentData.projectId,
          taskId: documentId
        };
      }

      const results = await searchChatsByDocument(documentType, searchValue);
      
      // Gestisci diversi formati di risposta
      if (results && results.results && Array.isArray(results.results)) {
        setChats(results.results);
      } else if (results && Array.isArray(results)) {
        setChats(results);
      } else {
        setChats([]);
      }

      lastLoadRef.current = { type: documentType, id: documentId };
    } catch (err) {
      console.error("Error loading document chats:", err);
      setError(err.message || "Errore nel caricamento delle chat");
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, [documentType, documentId, documentData.projectId, searchChatsByDocument]);

  // Collega una chat esistente al documento
  const linkExistingChat = useCallback(async (notificationId) => {
    try {
      setLoading(true);
      
      const result = await linkDocument(
        notificationId,
        documentId,
        documentType,
        documentData.projectId,
        documentData.taskId
      );

      if (result) {
        await swalWithHighZIndex({
          title: "Successo",
          text: "Chat collegata al documento",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
          customClass: {
            container: 'swal-high-zindex'
          }
        });

        await loadChats();
        return true;
      }
    } catch (err) {
      console.error("Error linking chat:", err);
      await swalWithHighZIndex({
        title: "Errore",
        text: "Errore nel collegamento della chat",
        icon: "error",
        customClass: {
          container: 'swal-high-zindex'
        }
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [documentType, documentId, documentData, linkDocument, loadChats, swalWithHighZIndex]);

  // Crea una nuova chat e la collega al documento
  const createAndLinkChat = useCallback(async ({
    title,
    message,
    participants = [],
    categoryId = 1
  }) => {
    try {
      setLoading(true);

      // Prepara i dati per la nuova chat
      const notificationData = {
        notificationId: 0, // Nuova chat
        title: title || `Chat per ${documentType} ${documentId}`,
        message: message || "Nuova discussione collegata al documento",
        notificationCategoryId: categoryId,
        receiversList: participants.join('-')
      };

      // Crea la chat
      const result = await sendNotification(notificationData);
      
      if (result && result.notificationId) {
        // Collega la chat al documento
        await linkDocument(
          result.notificationId,
          documentId,
          documentType,
          documentData.projectId,
          documentData.taskId
        );

        await swalWithHighZIndex({
          title: "Successo",
          text: "Chat creata e collegata al documento",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
          customClass: {
            container: 'swal-high-zindex'
          }
        });

        await loadChats();
        
        if (onChatCreated) {
          onChatCreated(result.notificationId);
        }

        return result.notificationId;
      }
    } catch (err) {
      console.error("Error creating and linking chat:", err);
      await swalWithHighZIndex({
        title: "Errore",
        text: "Errore nella creazione della chat",
        icon: "error",
        customClass: {
          container: 'swal-high-zindex'
        }
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [documentType, documentId, documentData, sendNotification, linkDocument, loadChats, onChatCreated, swalWithHighZIndex]);

  // Scollega una chat dal documento
  const unlinkChat = useCallback(async (chat) => {
    try {
      const { value: confirm } = await swalWithHighZIndex({
        title: "Conferma scollegamento",
        text: "Vuoi scollegare questa chat dal documento?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Scollega",
        cancelButtonText: "Annulla",
        customClass: {
          container: 'swal-high-zindex'
        }
      });

      if (!confirm) return false;

      setLoading(true);
      
      const result = await unlinkDocument(
        chat.notificationId,
        chat.LinkId
      );

      if (result) {
        await swalWithHighZIndex({
          title: "Successo", 
          text: "Chat scollegata dal documento",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
          customClass: {
            container: 'swal-high-zindex'
          }
        });

        await loadChats();
        
        if (onChatUnlinked) {
          onChatUnlinked(chat);
        }

        return true;
      }
    } catch (err) {
      console.error("Error unlinking chat:", err);
      await swalWithHighZIndex({
        title: "Errore",
        text: "Errore nello scollegamento della chat",
        icon: "error",
        customClass: {
          container: 'swal-high-zindex'
        }
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [unlinkDocument, loadChats, onChatUnlinked, swalWithHighZIndex]);

  // Apri una chat (gestisce automaticamente sola lettura)
  const openChatHandler = useCallback(async (chat) => {
    try {
      if (!chat.isUserMember) {
        // Apri in modalità sola lettura
        await openChatInReadOnlyMode(chat.notificationId);
      }
      
      // Apri la chat
      openChat(chat.notificationId);
    } catch (err) {
      console.error("Error opening chat:", err);
      await swalWithHighZIndex({
        title: "Errore",
        text: "Errore nell'apertura della chat",
        icon: "error",
        customClass: {
          container: 'swal-high-zindex'
        }
      });
    }
  }, [openChat, openChatInReadOnlyMode, swalWithHighZIndex]);

  // Effetto per caricare automaticamente le chat
  useEffect(() => {
    if (autoLoad) {
      loadChats();
    }
  }, [autoLoad, loadChats]);

  // Effetto per pulire quando il componente viene smontato
  useEffect(() => {
    return () => {
      lastLoadRef.current = { type: null, id: null };
    };
  }, []);

  return {
    chats,
    loading,
    error,
    loadChats,
    linkExistingChat,
    createAndLinkChat,
    unlinkChat,
    openChat: openChatHandler,
    refresh: loadChats
  };
};

export default useDocumentChats;