import { useState, useCallback } from 'react';
import { swal } from '@/lib/common';
import { config } from '@/config';
import useProjectArticlesActions from './useProjectArticlesActions';

/**
 * Hook personalizzato per gestire l'espansione BOM degli articoli
 */
const useArticleBOMExpansion = () => {
  const [loading, setLoading] = useState(false);
  const [bomData, setBomData] = useState({});
  const [expandedRows, setExpandedRows] = useState({});
  
  // Usa il hook esistente per le azioni sui progetti
  const { getBOMData } = useProjectArticlesActions();

  // Carica la struttura BOM per un articolo usando l'endpoint esistente
  const loadBOMTree = useCallback(async (itemId, maxLevel = 3, includeAttachments = true) => {
    try {
      setLoading(true);
      
      // Usa getBOMData con l'endpoint esistente che funziona
      const data = await getBOMData(
        "GET_BOM_MULTILEVEL",
        null, // id (non abbiamo BOM ID, usiamo itemId)
        itemId, // itemId
        null, // version
        {
          maxLevel: maxLevel,
          includeRouting: false, // Disabilitato per performance
          expandPhantoms: true,
          includeDisabled: false
        }
      );

      if (data) {
        setBomData(prev => ({
          ...prev,
          [itemId]: data
        }));
        return data;
      } else {
        throw new Error('Nessun dato BOM trovato');
      }
    } catch (error) {
      console.error('Error loading BOM tree:', error);
      swal.fire('Errore', error.message, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getBOMData]);

  // Carica gli allegati per un componente specifico
  const loadComponentAttachments = useCallback(async (componentId, isProjectItem = true) => {
    try {
      const response = await fetch(
        `${config.API_BASE_URL}/projectArticles/component/${componentId}/attachments?isProjectItem=${isProjectItem}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Errore nel caricamento degli allegati');
      }

      const result = await response.json();
      // Il backend restituisce direttamente l'array degli allegati
      return result || [];
    } catch (error) {
      console.error('Error loading component attachments:', error);
      throw error;
    }
  }, []);

  // Carica gli allegati per un articolo usando il codice articolo
  const loadItemAttachments = useCallback(async (itemCode) => {
    try {
      const response = await fetch(
        `${config.API_BASE_URL}/item-attachments/item-code/${encodeURIComponent(itemCode)}?includeShared=true`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Errore nel caricamento degli allegati');
      }

      const result = await response.json();
      // Il backend restituisce direttamente l'array degli allegati
      return result || [];
    } catch (error) {
      console.error('Error loading item attachments:', error);
      throw error;
    }
  }, []);

  // Gestisce l'espansione/contrazione di una riga
  const toggleRowExpansion = useCallback((itemId) => {
    setExpandedRows(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));

    // Se stiamo espandendo e non abbiamo ancora i dati BOM, caricali
    if (!expandedRows[itemId] && !bomData[itemId]) {
      loadBOMTree(itemId, 3, true); // maxLevel=3, includeAttachments=true
    }
  }, [expandedRows, bomData, loadBOMTree]);

  // Verifica se una riga è espansa
  const isRowExpanded = useCallback((itemId) => {
    return expandedRows[itemId] || false;
  }, [expandedRows]);

  // Ottiene i dati BOM per un articolo
  const getBOMDataForItem = useCallback((itemId) => {
    return bomData[itemId] || null;
  }, [bomData]);

  // Reset dello stato
  const resetState = useCallback(() => {
    setBomData({});
    setExpandedRows({});
  }, []);

  // Chiude tutte le righe espanse
  const collapseAllRows = useCallback(() => {
    setExpandedRows({});
  }, []);

  // Espande tutte le righe (carica i dati se necessario)
  const expandAllRows = useCallback(async (itemIds) => {
    const promises = itemIds.map(itemId => {
      if (!bomData[itemId]) {
        return loadBOMTree(itemId);
      }
      return Promise.resolve();
    });

    await Promise.all(promises);
    
    const expandedState = {};
    itemIds.forEach(itemId => {
      expandedState[itemId] = true;
    });
    setExpandedRows(expandedState);
  }, [bomData, loadBOMTree]);

  return {
    loading,
    bomData,
    expandedRows,
    loadBOMTree,
    loadComponentAttachments,
    loadItemAttachments,
    toggleRowExpansion,
    isRowExpanded,
    getBOMData: getBOMDataForItem,
    resetState,
    collapseAllRows,
    expandAllRows
  };
};

export default useArticleBOMExpansion;
