// Hook useDocumentLinks.js aggiornato
import { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { config } from '../config';

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
     const token = localStorage.getItem('token');
     const response = await axios.get(
       `${config.API_BASE_URL}/notifications/${notificationId}/documents`,
       { headers: { Authorization: `Bearer ${token}` } }
     );
     
     if (response.data.success) {
       const newDocuments = response.data.data || [];
       setDocuments(newDocuments);
       return newDocuments;
     } else {
       throw new Error(response.data.message || 'Errore nel caricamento dei documenti');
     }
   } catch (error) {
     console.error('Error fetching linked documents:', error);
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
     const token = localStorage.getItem('token');
     const response = await axios.get(
       `${config.API_BASE_URL}/documents/search?documentType=${encodeURIComponent(documentType)}&searchTerm=${encodeURIComponent(searchTerm)}`,
       { headers: { Authorization: `Bearer ${token}` } }
     );
     
     if (response.data.success) {
       return response.data.data || [];
     } else {
       throw new Error(response.data.message || 'Errore nella ricerca dei documenti');
     }
   } catch (error) {
     console.error('Error searching documents:', error);
     setError(error.message);
     return [];
   } finally {
     setLoading(false);
   }
 }, []);

 // Collega un documento a una notifica (VERSIONE CORRETTA)
 const linkDocument = useCallback(async (notificationId, documentType, documentParams) => {
   if (!notificationId || !documentType) {
     console.error('Missing required parameters for linking document');
     return false;
   }
   
   try {
     setLoading(true);
     const token = localStorage.getItem('token');
     
     // Prepara i dati nel formato corretto per il backend
     const requestData = {
       documentType: documentType,
       ...documentParams
     };
     
     console.log('Sending document link request with data:', requestData);
     
     const response = await axios.post(
       `${config.API_BASE_URL}/notifications/${notificationId}/documents`,
       requestData,
       { headers: { Authorization: `Bearer ${token}` } }
     );
     
     if (response.data.success) {
       // Aggiorna la lista dei documenti collegati
       await getLinkedDocuments(notificationId);
       return true;
     } else {
       throw new Error(response.data.message || 'Errore nel collegamento del documento');
     }
   } catch (error) {
     console.error('Error linking document:', error);
     setError(error.message);
     return false;
   } finally {
     setLoading(false);
   }
 }, [getLinkedDocuments]);

 // Scollega un documento da una notifica
 const unlinkDocument = useCallback(async (notificationId, linkId) => {
   if (!notificationId || !linkId) {
     console.error('Missing required parameters for unlinking document');
     return false;
   }
   
   try {
     setLoading(true);
     const token = localStorage.getItem('token');
     const response = await axios.delete(
       `${config.API_BASE_URL}/notifications/${notificationId}/documents/${linkId}`,
       { headers: { Authorization: `Bearer ${token}` } }
     );
     
     if (response.data.success) {
       // Aggiorna lo stato locale rimuovendo il documento
       setDocuments(docs => docs.filter(doc => doc.LinkId !== linkId));
       return true;
     } else {
       throw new Error(response.data.message || 'Errore nello scollegamento del documento');
     }
   } catch (error) {
     console.error('Error unlinking document:', error);
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
   unlinkDocument,
   resetDocuments
 };
};

export default useDocumentLinks;