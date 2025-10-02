import { useState, useCallback } from 'react';
import axios from '@/lib/axios';
import { swal } from '@/lib/common';

/**
 * Hook personalizzato per la gestione delle costificazioni BOM
 * Fornisce funzioni per calcolare, gestire parametri e esportare risultati
 */
const useBOMCosting = (companyId) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Headers comuni per le richieste
  const getHeaders = useCallback(() => ({
    'x-company-id': companyId,
    'x-user-id': 1 // TODO: Ottenere da context utente
  }), [companyId]);

  // Gestione errori
  const handleError = useCallback((error, defaultMessage = 'Si è verificato un errore') => {
    console.error('BOM Costing Error:', error);
    
    let errorMessage = defaultMessage;
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    setError(errorMessage);
    return errorMessage;
  }, []);

  // Ottieni BOM disponibili
  const getAvailableBOMs = useCallback(async (filters = {}) => {
    if (!companyId) return [];
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/bom-costing/available-boms', {
        params: filters,
        headers: getHeaders()
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Risposta non valida dal server');
    } catch (error) {
      const errorMsg = handleError(error, 'Errore nel caricamento delle BOM disponibili');
      swal.fire({
        title: 'Errore',
        text: errorMsg,
        icon: 'error'
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [companyId, getHeaders, handleError]);


  // Calcola costificazione singola BOM
  const calculateBOMCosting = useCallback(async (bomId, options = {}) => {
    if (!companyId || !bomId) {
      throw new Error('CompanyId e BOMId sono richiesti');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Default per le nuove regole
      const defaultOptions = {
        useGranularMarkups: true,
        updateBOMRecord: true,
        userId: null, // L'ID utente viene gestito dal backend
        debug: false,
        ...options
      };
      
      const response = await axios.post(`/api/bom-costing/calculate/${bomId}`, defaultOptions, {
        headers: getHeaders()
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Risposta non valida dal server');
    } catch (error) {
      const errorMsg = handleError(error, 'Errore nel calcolo della costificazione');
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [companyId, getHeaders, handleError]);

  // Calcola costificazione per multiple BOM
  const batchCalculateBOMCosting = useCallback(async (bomIds, options = {}) => {
    if (!companyId || !bomIds || bomIds.length === 0) {
      throw new Error('CompanyId e lista BOMIds sono richiesti');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Default per le nuove regole
      const defaultOptions = {
        updateBOMRecord: true,
        userId: null, // L'ID utente viene gestito dal backend
        ...options
      };
      
      const response = await axios.post('/api/bom-costing/calculate/batch', {
        bomIds,
        ...defaultOptions
      }, {
        headers: getHeaders()
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Risposta non valida dal server');
    } catch (error) {
      const errorMsg = handleError(error, 'Errore nel calcolo batch delle costificazioni');
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [companyId, getHeaders, handleError]);

  // Ottieni parametri di costificazione
  const getBOMCostingParameters = useCallback(async () => {
    if (!companyId) return [];
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/bom-costing/parameters', {
        headers: getHeaders()
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Risposta non valida dal server');
    } catch (error) {
      const errorMsg = handleError(error, 'Errore nel caricamento dei parametri');
      return [];
    } finally {
      setLoading(false);
    }
  }, [companyId, getHeaders, handleError]);

  // Inizializza parametri di default
  const initializeBOMCostingParameters = useCallback(async () => {
    if (!companyId) return false;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('/api/bom-costing/parameters/initialize', {}, {
        headers: getHeaders()
      });
      
      if (response.data.success) {
        swal.fire({
          title: 'Successo',
          text: 'Parametri inizializzati con successo',
          icon: 'success',
          timer: 2000
        });
        return true;
      }
      
      throw new Error('Risposta non valida dal server');
    } catch (error) {
      const errorMsg = handleError(error, 'Errore nell\'inizializzazione dei parametri');
      swal.fire({
        title: 'Errore',
        text: errorMsg,
        icon: 'error'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [companyId, getHeaders, handleError]);

  // Aggiorna parametro
  const updateBOMCostingParameter = useCallback(async (parameterId, parameterValue) => {
    if (!companyId || !parameterId) return false;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.put(`/api/bom-costing/parameters/${parameterId}`, {
        parameterValue: parseFloat(parameterValue)
      }, {
        headers: getHeaders()
      });
      
      if (response.data.success) {
        swal.fire({
          title: 'Successo',
          text: 'Parametro aggiornato con successo',
          icon: 'success',
          timer: 2000
        });
        return response.data.data;
      }
      
      throw new Error('Risposta non valida dal server');
    } catch (error) {
      const errorMsg = handleError(error, 'Errore nell\'aggiornamento del parametro');
      swal.fire({
        title: 'Errore',
        text: errorMsg,
        icon: 'error'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [companyId, getHeaders, handleError]);

  // Ottieni log delle costificazioni
  const getBOMCostingLogs = useCallback(async (filters = {}) => {
    if (!companyId) return [];
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/bom-costing/logs', {
        params: { limit: 50, ...filters },
        headers: getHeaders()
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Risposta non valida dal server');
    } catch (error) {
      const errorMsg = handleError(error, 'Errore nel caricamento dei log');
      return [];
    } finally {
      setLoading(false);
    }
  }, [companyId, getHeaders, handleError]);

  // Esporta risultato costificazione
  const exportBOMCostingResult = useCallback(async (bomId, format = 'json') => {
    if (!companyId || !bomId) {
      throw new Error('CompanyId e BOMId sono richiesti');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`/api/bom-costing/export/${bomId}`, {
        params: { format },
        headers: getHeaders()
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Risposta non valida dal server');
    } catch (error) {
      const errorMsg = handleError(error, 'Errore nell\'export del risultato');
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [companyId, getHeaders, handleError]);

  // Scarica file di export
  const downloadExportFile = useCallback(async (bomId, bomCode, format = 'json') => {
    try {
      const exportData = await exportBOMCostingResult(bomId, format);
      
      // Crea e scarica file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `bom_costing_${bomCode}_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      swal.fire({
        title: 'Successo',
        text: 'File esportato con successo',
        icon: 'success',
        timer: 2000
      });
      
      return true;
    } catch (error) {
      swal.fire({
        title: 'Errore',
        text: error.message,
        icon: 'error'
      });
      return false;
    }
  }, [exportBOMCostingResult]);

  // Funzioni di utilità per formattazione
  const formatCurrency = useCallback((value) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value || 0);
  }, []);

  const formatPercentage = useCallback((value) => {
    return `${((value || 0) * 100).toFixed(2)}%`;
  }, []);

  const formatNumber = useCallback((value, decimals = 2) => {
    return new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value || 0);
  }, []);

  // Test di calcolo (per validazione)
  const testCalculation = useCallback(async () => {
    if (!companyId) return null;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/bom-costing/test-calculation', {
        headers: getHeaders()
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Risposta non valida dal server');
    } catch (error) {
      const errorMsg = handleError(error, 'Errore nel test di calcolo');
      return null;
    } finally {
      setLoading(false);
    }
  }, [companyId, getHeaders, handleError]);

  return {
    // Stati
    loading,
    error,
    
    // Funzioni principali
    getAvailableBOMs,
    calculateBOMCosting,
    batchCalculateBOMCosting,
    
    // Gestione parametri
    getBOMCostingParameters,
    initializeBOMCostingParameters,
    updateBOMCostingParameter,
    
    // Log e export
    getBOMCostingLogs,
    exportBOMCostingResult,
    downloadExportFile,
    
    // Utilità
    formatCurrency,
    formatPercentage,
    formatNumber,
    testCalculation,
    
    // Test calcolo con esempio
    testBOMCostingExample: useCallback(async () => {
      if (!companyId) {
        throw new Error('CompanyId è richiesto');
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get('/api/bom-costing/test-calculation', {
          headers: getHeaders()
        });
        
        if (response.data.success) {
          return response.data.data;
        }
        
        throw new Error('Risposta non valida dal server');
      } catch (error) {
        const errorMsg = handleError(error, 'Errore nel test di calcolo');
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    }, [companyId, getHeaders, handleError]),
    
    // Reset errori
    clearError: () => setError(null)
  };
};

export default useBOMCosting;
