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


  // Funzione helper per costruire i parametri di collegamento documento
  const buildDocumentLinkParams = useCallback((notificationId) => {
    const params = {
      documentType,
      notificationId
    };

    // Aggiungi i parametri specifici in base al tipo di documento
    switch (documentType) {
      case 'Task':
        params.taskId = documentId;
        if (documentData.projectId) {
          params.projectId = documentData.projectId;
        }
        break;
      
      case 'MO':
        params.moId = documentId;
        break;
      
      case 'SaleOrd':
        params.saleOrdId = documentId;
        break;
      
      case 'PurchaseOrd':
        params.purchaseOrdId = documentId;
        break;
      
      case 'SaleDoc':
        params.saleDocId = documentId;
        break;
      
      case 'PurchaseDoc':
        params.purchaseDocId = documentId;
        break;
      
      case 'Item':
        params.itemCode = documentId;
        break;
      
      case 'BOM':
      case 'BillOfMaterials':
        params.bom = documentId;
        break;
      
      case 'Customer':
        params.custSuppCode = documentId;
        params.custSuppType = 3211265; // Cliente
        break;
      
      case 'Supplier':
        params.custSuppCode = documentId;
        params.custSuppType = 3211264; // Fornitore
        break;
      
      case 'Ticket':
        params.ticketId = documentId;
        break;
      
      case 'IntercompanyReference':
        params.referenceId = documentId;
        if (documentData.componentCode) {
          params.componentCode = documentData.componentCode;
        }
        if (documentData.sourceCompanyId) {
          params.sourceCompanyId = documentData.sourceCompanyId;
        }
        if (documentData.targetCompanyId) {
          params.targetCompanyId = documentData.targetCompanyId;
        }
        break;
      
      default:
        // Per tipi di documento personalizzati, passa tutti i dati disponibili
        Object.assign(params, documentData);
    }

    return params;
  }, [documentType, documentId, documentData]);

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

      if (documentType === 'Ticket') {
        searchValue = documentId.toString();
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
      
      const linkParams = buildDocumentLinkParams(notificationId);
      
      const result = await linkDocument(linkParams);

      if (result) {
        await swal.fire({
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
      await swal.fire({
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
  }, [buildDocumentLinkParams, linkDocument, loadChats]);

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
        // Collega automaticamente la chat al documento
        const linkParams = buildDocumentLinkParams(result.notificationId);
        
        await linkDocument(linkParams);

        await swal.fire({
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
      await swal.fire({
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
  }, [documentType, documentId, buildDocumentLinkParams, sendNotification, linkDocument, loadChats, onChatCreated]);

  // Scollega una chat dal documento
  const unlinkChat = useCallback(async (chat) => {
    try {
      const { value: confirm } = await swal.fire({
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
        await swal.fire({
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
      await swal.fire({
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
  }, [unlinkDocument, loadChats, onChatUnlinked]);

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
      await swal.fire({
        title: "Errore",
        text: "Errore nell'apertura della chat",
        icon: "error",
        customClass: {
          container: 'swal-high-zindex'
        }
      });
    }
  }, [openChat, openChatInReadOnlyMode]);

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