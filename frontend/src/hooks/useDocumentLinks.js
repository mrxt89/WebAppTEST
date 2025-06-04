// Hook useDocumentLinks.js aggiornato
import { useState, useRef, useCallback } from "react";
import axiosInstance from "@/lib/axios";

const useDocumentLinks = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Usa useRef per tenere traccia dell'ultimo notificationId richiesto
  const lastNotificationIdRef = useRef(null);
  // Timestamp dell'ultima richiesta per evitare richieste troppo frequenti
  const lastRequestTimeRef = useRef(0);

  // Ottiene i documenti collegati a una notifica
  const getLinkedDocuments = useCallback(async (notificationId) => {
    // Evita richieste duplicate per lo stesso notificationId in un breve periodo
    const now = Date.now();
    if (
      lastNotificationIdRef.current === notificationId &&
      documents.length > 0 &&
      now - lastRequestTimeRef.current < 2000 // Throttle di 2 secondi
    ) {
      return documents;
    }

    // Aggiorna il timestamp e l'ID dell'ultima richiesta
    lastRequestTimeRef.current = now;
    lastNotificationIdRef.current = notificationId;

    try {
      setLoading(true);
      const response = await axiosInstance.get(
        `/notifications/${notificationId}/documents`
      );

      if (response.data.success) {
        const newDocuments = response.data.data || [];
        setDocuments(newDocuments);
        return newDocuments;
      } else {
        throw new Error(
          response.data.message || "Errore nel caricamento dei documenti",
        );
      }
    } catch (error) {
      console.error("Error fetching linked documents:", error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []); // Nessuna dipendenza per evitare ricostruzioni inutili

  // Cerca documenti per tipo e termine
  const searchDocuments = useCallback(async (documentType, searchTerm) => {
    if (!documentType || !searchTerm || searchTerm.trim().length === 0) {
      return [];
    }

    try {
      setLoading(true);
      const response = await axiosInstance.get(
        `/documents/search?documentType=${encodeURIComponent(documentType)}&searchTerm=${encodeURIComponent(searchTerm)}`
      );

      if (response.data.success) {
        return response.data.data || [];
      } else {
        throw new Error(
          response.data.message || "Errore nella ricerca dei documenti",
        );
      }
    } catch (error) {
      console.error("Error searching documents:", error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Funzione helper per costruire i parametri del documento
  const buildDocumentParams = useCallback((documentType, documentData) => {
    const params = {
      documentType
    };

    switch (documentType) {
      case 'Task':
        if (typeof documentData === 'object') {
          params.taskId = documentData.taskId || documentData.TaskID;
          params.projectId = documentData.projectId || documentData.ProjectID;
        } else {
          params.taskId = documentData;
        }
        break;

      case 'MO':
        params.moId = typeof documentData === 'object' ? documentData.moId : documentData;
        break;

      case 'SaleOrd':
        params.saleOrdId = typeof documentData === 'object' ? documentData.saleOrdId : documentData;
        break;

      case 'PurchaseOrd':
        params.purchaseOrdId = typeof documentData === 'object' ? documentData.purchaseOrdId : documentData;
        break;

      case 'SaleDoc':
        params.saleDocId = typeof documentData === 'object' ? documentData.saleDocId : documentData;
        break;

      case 'PurchaseDoc':
        params.purchaseDocId = typeof documentData === 'object' ? documentData.purchaseDocId : documentData;
        break;

      case 'Item':
        params.itemCode = typeof documentData === 'object' ? documentData.itemCode : documentData;
        break;

      case 'BOM':
      case 'BillOfMaterials':
        params.bom = typeof documentData === 'object' ? documentData.bom : documentData;
        break;

      case 'Customer':
        params.custSuppCode = typeof documentData === 'object' ? documentData.custSuppCode : documentData;
        params.custSuppType = 3211265; // Cliente
        break;

      case 'Supplier':
        params.custSuppCode = typeof documentData === 'object' ? documentData.custSuppCode : documentData;
        params.custSuppType = 3211264; // Fornitore
        break;

      default:
        // Per tipi personalizzati, passa tutti i dati
        if (typeof documentData === 'object') {
          Object.assign(params, documentData);
        }
    }

    return params;
  }, []);

  // Collega un documento a una notifica (VERSIONE GENERALIZZATA)
  const linkDocument = useCallback(
    async (notificationId, documentType, documentData) => {
      if (!notificationId || !documentType) {
        console.error("Missing required parameters for linking document");
        return false;
      }

      try {
        setLoading(true);

        // Costruisci i parametri usando la funzione helper
        const requestData = buildDocumentParams(documentType, documentData);

        console.log("Linking document with params:", requestData);

        const response = await axiosInstance.post(
          `/notifications/${notificationId}/documents`,
          requestData
        );

        if (response.data.success) {
          // Aggiorna la lista dei documenti collegati
          await getLinkedDocuments(notificationId);
          return true;
        } else {
          throw new Error(
            response.data.message || "Errore nel collegamento del documento",
          );
        }
      } catch (error) {
        console.error("Error linking document:", error);
        setError(error.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [getLinkedDocuments, buildDocumentParams],
  );

  // Versione semplificata per compatibilità con componenti esistenti
  const linkDocumentSimple = useCallback(
    async (notificationId, documentParams) => {
      if (!notificationId || !documentParams) {
        console.error("Missing required parameters for linking document");
        return false;
      }

      try {
        setLoading(true);

        const response = await axiosInstance.post(
          `/notifications/${notificationId}/documents`,
          documentParams
        );

        if (response.data.success) {
          // Aggiorna la lista dei documenti collegati
          await getLinkedDocuments(notificationId);
          return true;
        } else {
          throw new Error(
            response.data.message || "Errore nel collegamento del documento",
          );
        }
      } catch (error) {
        console.error("Error linking document:", error);
        setError(error.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [getLinkedDocuments],
  );

  // Scollega un documento da una notifica
  const unlinkDocument = useCallback(async (notificationId, linkId) => {
    if (!notificationId || !linkId) {
      console.error("Missing required parameters for unlinking document");
      return false;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.delete(
        `/notifications/${notificationId}/documents/${linkId}`
      );

      if (response.data.success) {
        // Aggiorna lo stato locale rimuovendo il documento
        setDocuments((docs) => docs.filter((doc) => doc.LinkId !== linkId));
        return true;
      } else {
        throw new Error(
          response.data.message || "Errore nello scollegamento del documento",
        );
      }
    } catch (error) {
      console.error("Error unlinking document:", error);
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Resetta lo stato quando necessario (ad esempio quando si cambia chat)
  const resetDocuments = useCallback(() => {
    setDocuments([]);
    setError(null);
    lastNotificationIdRef.current = null;
    lastRequestTimeRef.current = 0;
  }, []);

  return {
    documents,
    loading,
    error,
    getLinkedDocuments,
    searchDocuments,
    linkDocument,
    linkDocumentSimple, // Per compatibilità
    unlinkDocument,
    resetDocuments,
  };
};

export default useDocumentLinks;