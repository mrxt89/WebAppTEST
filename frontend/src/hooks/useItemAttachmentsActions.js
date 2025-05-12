// Frontend/src/hooks/useItemAttachmentsActions.js
import { useState, useCallback } from 'react';
import { config } from '../config';
import useApiRequest from './useApiRequest';
import { useAuth  } from '../context/AuthContext';
import { swal } from '../lib/common'; // Import della libreria per le notifiche

/**
 * Hook personalizzato per gestire le azioni sugli allegati degli articoli
 * @returns {Object} Funzioni e stati per gestire le operazioni sugli allegati
 */
const useItemAttachmentsActions = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [categories, setCategories] = useState([]);
    const { makeRequest } = useApiRequest();
    const auth = useAuth();

    // Funzioni helper per le notifiche
    const showSuccess = (message) => {
        // Usa swal per mostrare successo
        if (swal && swal.fire) {
            swal.fire('Successo', message, 'success');
        } else {
            console.log('Successo:', message);
        }
    };

    const showError = (message) => {
        // Usa swal per mostrare errore
        if (swal && swal.fire) {
            swal.fire('Errore', message, 'error');
        } else {
            console.error('Errore:', message);
        }
    };

    /**
     * Verifica se l'utente può modificare un allegato
     * @param {Object} attachment - L'allegato da verificare
     * @returns {boolean} - true se l'utente può modificare l'allegato
     */
    const canModifyAttachment = useCallback((attachment) => {
        if (!attachment || !auth.user) return false;
        return attachment.OwnerCompanyId === auth.user.CompanyId;
    }, [auth.user]);

    /**
     * Ottieni allegati per codice articolo
     * @param {string} itemCode - Codice articolo
     * @param {boolean} includeShared - Include allegati condivisi
     * @param {boolean|null} isErpAttachment - Filtra per allegati ERP
     * @returns {Promise<Array>} - Lista degli allegati
     */
    const getAttachmentsByItemCode = useCallback(async (itemCode, includeShared = true, isErpAttachment = null) => {
        try {
            setLoading(true);
            const query = new URLSearchParams();
            if (includeShared !== undefined) query.append('includeShared', includeShared);
            if (isErpAttachment !== null) query.append('isErpAttachment', isErpAttachment);

            const data = await makeRequest(`${config.API_BASE_URL}/item-attachments/item-code/${itemCode}?${query.toString()}`);
            
            if (data) {
                setAttachments(data);
            }
            return data;
        } catch (err) {
            setError(err.message);
            console.error('Error fetching attachments by item code:', err);
            showError('Errore nel recupero degli allegati per codice articolo');
            return [];
        } finally {
            setLoading(false);
        }
    }, [makeRequest]);

    /**
     * Ottieni allegati per articolo progetto
     * @param {number} projectItemId - ID dell'articolo progetto
     * @param {boolean} includeShared - Include allegati condivisi
     * @param {boolean|null} isErpAttachment - Filtra per allegati ERP
     * @returns {Promise<Array>} - Lista degli allegati
     */
    const getAttachmentsByProjectItemId = useCallback(async (projectItemId, includeShared = true, isErpAttachment = null) => {
        try {
            setLoading(true);
            const query = new URLSearchParams();
            if (includeShared !== undefined) query.append('includeShared', includeShared);
            if (isErpAttachment !== null) query.append('isErpAttachment', isErpAttachment);

            const data = await makeRequest(`${config.API_BASE_URL}/item-attachments/project-item/${projectItemId}?${query.toString()}`);
            
            if (data) {
                setAttachments(data);
            }
            return data;
        } catch (err) {
            setError(err.message);
            console.error('Error fetching attachments by project item ID:', err);
            showError('Errore nel recupero degli allegati per articolo progetto');
            return [];
        } finally {
            setLoading(false);
        }
    }, [makeRequest]);

    /**
     * Carica un allegato per codice articolo
     * @param {string} itemCode - Codice articolo
     * @param {File} file - File da caricare
     * @param {Object} metadata - Metadati dell'allegato
     * @returns {Promise<Object>} - Dati dell'allegato caricato
     */
    const uploadAttachmentByItemCode = useCallback(async (itemCode, file, metadata = {}) => {
        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('file', file);
            
            // Aggiungi metadati al formData, assicurandoti che i booleani siano stringhe
            if (metadata.description) formData.append('description', metadata.description);
            if (metadata.isPublic !== undefined) formData.append('isPublic', metadata.isPublic.toString());
            if (metadata.isErpAttachment !== undefined) formData.append('isErpAttachment', metadata.isErpAttachment.toString());
            if (metadata.isVisible !== undefined) formData.append('isVisible', metadata.isVisible.toString());
            if (metadata.categoryIds) formData.append('categoryIds', metadata.categoryIds);
            if (metadata.tags) formData.append('tags', metadata.tags);

            console.log("Sending form data:", Object.fromEntries(formData.entries()));

            const data = await makeRequest(`${config.API_BASE_URL}/item-attachments/item-code/${itemCode}/upload`, {
                method: 'POST',
                body: formData
                // Non includere Content-Type, il browser lo imposterà automaticamente con boundary
            });
            
            showSuccess('Allegato caricato con successo');
            return data;
        } catch (err) {
            setError(err.message);
            console.error('Error uploading attachment by item code:', err);
            showError('Errore nel caricamento dell\'allegato');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [makeRequest]);

    /**
     * Carica un allegato per articolo progetto
     * @param {number} projectItemId - ID dell'articolo progetto
     * @param {File} file - File da caricare
     * @param {Object} metadata - Metadati dell'allegato
     * @returns {Promise<Object>} - Dati dell'allegato caricato
     */
    const uploadAttachmentByProjectItemId = useCallback(async (projectItemId, file, metadata = {}) => {
        try {
            setLoading(true);
            const formData = new FormData();
            
            // Aggiungi il file come primo elemento
            formData.append('file', file);
            
            // Aggiungi metadati al formData, assicurandoti che i booleani siano stringhe
            if (metadata.description) formData.append('description', metadata.description);
            if (metadata.isPublic !== undefined) formData.append('isPublic', metadata.isPublic.toString());
            if (metadata.isVisible !== undefined) formData.append('isVisible', metadata.isVisible.toString());
            if (metadata.isErpAttachment !== undefined) formData.append('isErpAttachment', metadata.isErpAttachment.toString());
            if (metadata.itemCode) formData.append('itemCode', metadata.itemCode);
            if (metadata.categoryIds) formData.append('categoryIds', metadata.categoryIds);
            if (metadata.tags) formData.append('tags', metadata.tags);

            console.log("Sending form data:", Object.fromEntries(formData.entries()));
            
            const data = await makeRequest(`${config.API_BASE_URL}/item-attachments/project-item/${projectItemId}/upload`, {
                method: 'POST',
                body: formData
                // Non includere Content-Type, il browser lo imposterà automaticamente con boundary
            });
            
            showSuccess('Allegato caricato con successo');
            return data;
        } catch (err) {
            setError(err.message);
            console.error('Error uploading attachment by project item ID:', err);
            showError('Errore nel caricamento dell\'allegato');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [makeRequest]);

    /**
     * Download di un allegato
     * @param {number} attachmentId - ID dell'allegato
     * @param {string} fileName - Nome del file
     * @returns {Promise<boolean>} - true se il download è riuscito
     */
    const downloadAttachment = useCallback(async (attachmentId, fileName) => {
        try {
            setLoading(true);
            const response = await makeRequest(`${config.API_BASE_URL}/item-attachments/${attachmentId}/download`, {
                responseType: 'blob'
            });
            
            // Crea un URL per il blob e scatena il download
            const url = window.URL.createObjectURL(new Blob([response]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName || 'attachment');
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            return true;
        } catch (err) {
            setError(err.message);
            console.error('Error downloading attachment:', err);
            showError('Errore nel download dell\'allegato');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [makeRequest]);

    /**
     * Ottieni un allegato per ID
     * @param {number} attachmentId - ID dell'allegato
     * @returns {Promise<Object>} - Dati dell'allegato
     */
        const getItemAttachmentById = useCallback(async (attachmentId) => {
            try {
                setLoading(true);
                const data = await makeRequest(`${config.API_BASE_URL}/item-attachments/${attachmentId}`);
                return data;
            } catch (err) {
                setError(err.message);
                console.error('Error fetching attachment by ID:', err);
                showError('Errore nel recupero dell\'allegato');
                return null;
            } finally {
                setLoading(false);
            }
        }, [makeRequest]);

    /**
     * Elimina un allegato (soft delete)
     * @param {number} attachmentId - ID dell'allegato
     * @param {boolean} hardDelete - true per eliminazione fisica
     * @returns {Promise<boolean>} - true se l'eliminazione è riuscita
     */
    const deleteAttachment = useCallback(async (attachmentId, hardDelete = false) => {
        try {
            setLoading(true);
            
            // Ottieni prima i dettagli dell'allegato per verificare la proprietà
            const attachment = await getItemAttachmentById(attachmentId);
            
            // Se l'utente non appartiene alla stessa azienda proprietaria, mostra un errore
            if (attachment && !canModifyAttachment(attachment)) {
                showError('Non hai i permessi per eliminare questo allegato');
                return false;
            }
            
            await makeRequest(`${config.API_BASE_URL}/item-attachments/${attachmentId}?hardDelete=${hardDelete}`, {
                method: 'DELETE'
            });
            
            // Aggiorna la lista locale degli allegati
            setAttachments(prev => prev.map(a => {
                if (a.AttachmentID === attachmentId) {
                    return { ...a, IsVisible: false }; // Per soft delete aggiorniamo IsVisible
                }
                return a;
            }));
            
            showSuccess('Allegato eliminato con successo');
            return true;
        } catch (err) {
            setError(err.message);
            console.error('Error deleting attachment:', err);
            showError('Errore nell\'eliminazione dell\'allegato');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [makeRequest, canModifyAttachment, getItemAttachmentById]);

    /**
     * Ripristina un allegato eliminato (soft delete)
     * @param {number} attachmentId - ID dell'allegato
     * @returns {Promise<Object>} - Dati dell'allegato ripristinato
     */
    const restoreAttachment = useCallback(async (attachmentId) => {
        try {
            setLoading(true);
            
            // Ottieni prima i dettagli dell'allegato per verificare la proprietà
            const attachment = await getItemAttachmentById(attachmentId);
            
            // Se l'utente non appartiene alla stessa azienda proprietaria, mostra un errore
            if (attachment && !canModifyAttachment(attachment)) {
                showError('Non hai i permessi per ripristinare questo allegato');
                return null;
            }
            
            const data = await makeRequest(`${config.API_BASE_URL}/item-attachments/${attachmentId}/restore`, {
                method: 'POST',
                body: JSON.stringify({})
            });
            
            // Aggiorna la lista locale degli allegati
            setAttachments(prev => prev.map(a => {
                if (a.AttachmentID === attachmentId) {
                    return { ...a, IsVisible: true }; // Aggiorna IsVisible dopo il ripristino
                }
                return a;
            }));
            
            showSuccess('Allegato ripristinato con successo');
            return data;
        } catch (err) {
            setError(err.message);
            console.error('Error restoring attachment:', err);
            showError('Errore nel ripristino dell\'allegato');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [makeRequest, canModifyAttachment, getItemAttachmentById]);

    /**
     * Condividi un allegato con un'altra azienda
     * @param {number} attachmentId - ID dell'allegato
     * @param {number} targetCompanyId - ID dell'azienda destinataria
     * @param {string} accessLevel - Livello di accesso
     * @returns {Promise<Object>} - Dati della condivisione
     */
    const shareAttachment = useCallback(async (attachmentId, targetCompanyId, accessLevel = 'read') => {
        try {
            setLoading(true);
            
            // Ottieni prima i dettagli dell'allegato per verificare la proprietà
            const attachment = await getItemAttachmentById(attachmentId);
            
            // Se l'utente non appartiene alla stessa azienda proprietaria, mostra un errore
            if (attachment && !canModifyAttachment(attachment)) {
                showError('Non hai i permessi per condividere questo allegato');
                return null;
            }
            
            const data = await makeRequest(`${config.API_BASE_URL}/item-attachments/${attachmentId}/share`, {
                method: 'POST',
                body: JSON.stringify({
                    targetCompanyId,
                    accessLevel
                })
            });
            
            showSuccess('Allegato condiviso con successo');
            return data;
        } catch (err) {
            setError(err.message);
            console.error('Error sharing attachment:', err);
            showError('Errore nella condivisione dell\'allegato');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [makeRequest, canModifyAttachment, getItemAttachmentById]);

    /**
     * Rimuove la condivisione di un allegato
     * @param {number} attachmentId - ID dell'allegato
     * @param {number} targetCompanyId - ID dell'azienda destinataria
     * @returns {Promise<boolean>} - true se la rimozione è riuscita
     */
    const unshareAttachment = useCallback(async (attachmentId, targetCompanyId) => {
        try {
            setLoading(true);
            
            // Ottieni prima i dettagli dell'allegato per verificare la proprietà
            const attachment = await getItemAttachmentById(attachmentId);
            
            // Se l'utente non appartiene alla stessa azienda proprietaria, mostra un errore
            if (attachment && !canModifyAttachment(attachment)) {
                showError('Non hai i permessi per rimuovere la condivisione di questo allegato');
                return false;
            }
            
            await makeRequest(`${config.API_BASE_URL}/item-attachments/${attachmentId}/share/${targetCompanyId}`, {
                method: 'DELETE'
            });
            
            showSuccess('Condivisione rimossa con successo');
            return true;
        } catch (err) {
            setError(err.message);
            console.error('Error unsharing attachment:', err);
            showError('Errore nella rimozione della condivisione');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [makeRequest, canModifyAttachment, getItemAttachmentById]);

    /**
     * Ottieni le condivisioni di un allegato
     * @param {number} attachmentId - ID dell'allegato
     * @returns {Promise<Array>} - Lista delle condivisioni
     */
    const getAttachmentSharing = useCallback(async (attachmentId) => {
        try {
            setLoading(true);
            const data = await makeRequest(`${config.API_BASE_URL}/item-attachments/${attachmentId}/sharing`);
            
            return data;
        } catch (err) {
            setError(err.message);
            console.error('Error getting attachment sharing:', err);
            showError('Errore nel recupero delle condivisioni');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [makeRequest]);

    /**
     * Ottieni le categorie di allegati
     * @returns {Promise<Array>} - Lista delle categorie
     */
    const getAttachmentCategories = useCallback(async () => {
        try {
            setLoading(true);
            const data = await makeRequest(`${config.API_BASE_URL}/item-attachment-categories`);
            
            if (data) {
                setCategories(data);
            }
            return data;
        } catch (err) {
            setError(err.message);
            console.error('Error getting attachment categories:', err);
            showError('Errore nel recupero delle categorie');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [makeRequest]);

    /**
     * Aggiungi una nuova categoria
     * @param {string} categoryName - Nome della categoria
     * @param {string} description - Descrizione della categoria
     * @param {string} colorHex - Colore in formato esadecimale
     * @returns {Promise<Object>} - Dati della categoria creata
     */
    const addAttachmentCategory = useCallback(async (categoryName, description = null, colorHex = '#1b263b') => {
        try {
            setLoading(true);
            const data = await makeRequest(`${config.API_BASE_URL}/item-attachment-categories`, {
                method: 'POST',
                body: JSON.stringify({
                    categoryName,
                    description,
                    colorHex
                })
            });
            
            // Aggiorna la lista locale delle categorie
            if (data && data.data) {
                setCategories(prev => [...prev, data.data]);
            }
            
            showSuccess('Categoria aggiunta con successo');
            return data?.data;
        } catch (err) {
            setError(err.message);
            console.error('Error adding attachment category:', err);
            showError('Errore nell\'aggiunta della categoria');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [makeRequest]);

    /**
     * Ottieni allegati per categoria
     * @param {number} categoryId - ID della categoria
     * @returns {Promise<Array>} - Lista degli allegati
     */
    const getAttachmentsByCategory = useCallback(async (categoryId) => {
        try {
            setLoading(true);
            const data = await makeRequest(`${config.API_BASE_URL}/item-attachment-categories/${categoryId}/attachments`);
            
            return data;
        } catch (err) {
            setError(err.message);
            console.error('Error getting attachments by category:', err);
            showError('Errore nel recupero degli allegati per categoria');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [makeRequest]);

    /**
     * Imposta le categorie di un allegato
     * @param {number} attachmentId - ID dell'allegato
     * @param {string|Array} categoryIds - IDs delle categorie
     * @returns {Promise<Array>} - Lista delle categorie impostate
     */
    const setAttachmentCategories = useCallback(async (attachmentId, categoryIds) => {
        try {
            setLoading(true);
            
            // Ottieni prima i dettagli dell'allegato per verificare la proprietà
            const attachment = await getItemAttachmentById(attachmentId);
            
            // Se l'utente non appartiene alla stessa azienda proprietaria, mostra un errore
            if (attachment && !canModifyAttachment(attachment)) {
                showError('Non hai i permessi per modificare le categorie di questo allegato');
                return null;
            }
            
            const data = await makeRequest(`${config.API_BASE_URL}/item-attachments/${attachmentId}/categories`, {
                method: 'POST',
                body: JSON.stringify({
                    categoryIds: Array.isArray(categoryIds) ? categoryIds.join(',') : categoryIds
                })
            });
            
            showSuccess('Categorie impostate con successo');
            return data;
        } catch (err) {
            setError(err.message);
            console.error('Error setting attachment categories:', err);
            showError('Errore nell\'impostazione delle categorie');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [makeRequest, canModifyAttachment, getItemAttachmentById]);

    /**
     * Ottieni le versioni di un allegato
     * @param {number} attachmentId - ID dell'allegato
     * @returns {Promise<Array>} - Lista delle versioni
     */
    const getAttachmentVersions = useCallback(async (attachmentId) => {
        try {
            setLoading(true);
            const data = await makeRequest(`${config.API_BASE_URL}/item-attachments/${attachmentId}/versions`);
            
            return data;
        } catch (err) {
            setError(err.message);
            console.error('Error getting attachment versions:', err);
            showError('Errore nel recupero delle versioni');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [makeRequest]);

    /**
     * Aggiungi una nuova versione di un allegato
     * @param {number} attachmentId - ID dell'allegato
     * @param {File} file - File da caricare
     * @param {string} changeNotes - Note sul cambiamento
     * @returns {Promise<Object>} - Dati della versione creata
     */
    const addAttachmentVersion = useCallback(async (attachmentId, file, changeNotes = null) => {
        try {
            setLoading(true);
            
            // Ottieni prima i dettagli dell'allegato per verificare la proprietà
            const attachment = await getItemAttachmentById(attachmentId);
            
            // Se l'utente non appartiene alla stessa azienda proprietaria, mostra un errore
            if (attachment && !canModifyAttachment(attachment)) {
                showError('Non hai i permessi per aggiungere versioni a questo allegato');
                return null;
            }
            
            const formData = new FormData();
            formData.append('file', file);
            if (changeNotes) formData.append('changeNotes', changeNotes);

            const data = await makeRequest(`${config.API_BASE_URL}/item-attachments/${attachmentId}/versions`, {
                method: 'POST',
                body: formData
                // Non includere Content-Type, il browser lo imposterà automaticamente con boundary
            });
            
            showSuccess('Nuova versione aggiunta con successo');
            return data?.data;
        } catch (err) {
            setError(err.message);
            console.error('Error adding attachment version:', err);
            showError('Errore nell\'aggiunta della versione');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [makeRequest, canModifyAttachment, getItemAttachmentById]);

    /**
     * Aggiorna i metadati di un allegato
     * @param {number} attachmentId - ID dell'allegato
     * @param {Object} metadata - Metadati da aggiornare
     * @returns {Promise<Object>} - Dati dell'allegato aggiornati
     */
    const updateAttachment = useCallback(async (attachmentId, metadata) => {
        try {
            setLoading(true);
            
            console.log('Updating attachment:', attachmentId, 'with metadata:', metadata);
            
            const data = await makeRequest(`${config.API_BASE_URL}/item-attachments/${attachmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(metadata)
            });
            
            // Resto della funzione
            showSuccess('Allegato aggiornato con successo');
            return data?.data;
        } catch (err) {
            console.error('Error in updateAttachment:', err);
            showError('Errore nell\'aggiornamento dell\'allegato');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [makeRequest]);

    /**
     * Aggiorna il mapping del codice articolo di un allegato
     * @param {number} attachmentId - ID dell'allegato
     * @param {string} oldItemCode - Vecchio codice articolo
     * @param {string} newItemCode - Nuovo codice articolo
     * @returns {Promise<boolean>} - true se l'aggiornamento è riuscito
     */
    const updateAttachmentCodeMapping = useCallback(async (attachmentId, oldItemCode, newItemCode) => {
        try {
            setLoading(true);
            
            // Ottieni prima i dettagli dell'allegato per verificare la proprietà
            const attachment = await getItemAttachmentById(attachmentId);
            
            // Se l'utente non appartiene alla stessa azienda proprietaria, mostra un errore
            if (attachment && !canModifyAttachment(attachment)) {
                showError('Non hai i permessi per modificare il codice articolo di questo allegato');
                return false;
            }
            
            await makeRequest(`${config.API_BASE_URL}/item-attachments/${attachmentId}/code-mapping`, {
                method: 'PUT',
                body: JSON.stringify({
                    oldItemCode,
                    newItemCode
                })
            });
            
            // Aggiorna la lista locale degli allegati
            setAttachments(prev => 
                prev.map(a => a.AttachmentID === attachmentId ? {...a, ItemCode: newItemCode} : a)
            );
            
            showSuccess('Codice articolo aggiornato con successo');
            return true;
        } catch (err) {
            setError(err.message);
            console.error('Error updating attachment code mapping:', err);
            showError('Errore nell\'aggiornamento del codice articolo');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [makeRequest, canModifyAttachment, getItemAttachmentById]);

    /**
     * Download di più allegati come ZIP per codice articolo
     * @param {string} itemCode - Codice articolo
     * @returns {Promise<boolean>} - true se il download è riuscito
     */
    const downloadAllAttachmentsByItemCode = useCallback(async (itemCode) => {
        try {
            setLoading(true);
            const response = await makeRequest(`${config.API_BASE_URL}/item-attachments/item-code/${itemCode}/download-all`, {
                responseType: 'blob'
            });
            
            // Crea un URL per il blob e scatena il download
            const url = window.URL.createObjectURL(new Blob([response]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Item_${itemCode}_Attachments.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            return true;
        } catch (err) {
            setError(err.message);
            console.error('Error downloading all attachments by item code:', err);
            showError('Errore nel download degli allegati');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [makeRequest]);

    /**
     * Download di più allegati come ZIP per articolo progetto
     * @param {number} projectItemId - ID dell'articolo progetto
     * @returns {Promise<boolean>} - true se il download è riuscito
     */
    const downloadAllAttachmentsByProjectItemId = useCallback(async (projectItemId) => {
        try {
            setLoading(true);
            const response = await makeRequest(`${config.API_BASE_URL}/item-attachments/project-item/${projectItemId}/download-all`, {
                responseType: 'blob'
            });
            
            // Crea un URL per il blob e scatena il download
            const url = window.URL.createObjectURL(new Blob([response]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `ProjectItem_${projectItemId}_Attachments.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            return true;
        } catch (err) {
            setError(err.message);
            console.error('Error downloading all attachments by project item ID:', err);
            showError('Errore nel download degli allegati');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [makeRequest]);

    return {
        loading,
        error,
        attachments,
        categories,
        // Getter per allegati
        getAttachmentsByItemCode,
        getAttachmentsByProjectItemId,
        getItemAttachmentById,
        // Upload allegati
        uploadAttachmentByItemCode,
        uploadAttachmentByProjectItemId,
        // Operazioni su singolo allegato
        downloadAttachment,
        deleteAttachment,
        restoreAttachment,
        updateAttachment,
        // Operazioni su versioni
        getAttachmentVersions,
        addAttachmentVersion,
        // Operazioni su condivisioni
        shareAttachment,
        unshareAttachment,
        getAttachmentSharing,
        // Operazioni su categorie
        getAttachmentCategories,
        addAttachmentCategory,
        getAttachmentsByCategory,
        setAttachmentCategories,
        // Operazioni su codici articolo
        updateAttachmentCodeMapping,
        // Download multipli
        downloadAllAttachmentsByItemCode,
        downloadAllAttachmentsByProjectItemId,
        // Helper per verificare permessi
        canModifyAttachment
    };
};

export default useItemAttachmentsActions;