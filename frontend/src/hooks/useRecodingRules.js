// src/hooks/useRecodingRules.js

import { useState, useCallback, useRef, useEffect } from "react";
import { config } from "@/config";
import useApiRequest from "./useApiRequest";

const useRecodingRules = () => {
  const { makeRequest } = useApiRequest();
  
  // Stati principali
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Cache per le gerarchie
  const [hierarchyCache, setHierarchyCache] = useState({
    categories: [],
    macroFamilies: {},
    families: {},
    types: {},
    aliases: {}
  });
  
  // Cache per i sequenziali calcolati
  const sequentialCache = useRef({});
  
  // Reset cache quando cambia azienda
  useEffect(() => {
    return () => {
      sequentialCache.current = {};
    };
  }, []);

  /**
   * Carica le categorie (MP, PF, SL)
   */
  const loadCategories = useCallback(async (companyId, forceReload = false) => {
    try {
      setLoading(true);
      // Controlla cache
      if (!forceReload && hierarchyCache.categories.length > 0) {
        return hierarchyCache.categories;
      }
      const url = `${config.API_BASE_URL}/codingRules/hierarchy?companyId=${companyId}`;
      const data = await makeRequest(url);
      if (Array.isArray(data)) {
        setHierarchyCache(prev => ({
          ...prev,
          categories: data
        }));
        return data;
      }
      return [];
    } catch (err) {
      setError(err.message);
      console.error("Error loading categories:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [makeRequest, hierarchyCache.categories]);

  /**
   * Carica le macrofamiglie per una categoria
   */
  const loadMacroFamilies = useCallback(async (companyId, categoryId, forceReload = false) => {
    try {
      setLoading(true);
      const cacheKey = `${companyId}_${categoryId}`;
      if (!forceReload && hierarchyCache.macroFamilies[cacheKey]) {
        return hierarchyCache.macroFamilies[cacheKey];
      }
      const url = `${config.API_BASE_URL}/codingRules/hierarchy?companyId=${companyId}&categoryId=${categoryId}`;
      const data = await makeRequest(url);
      if (Array.isArray(data)) {
        setHierarchyCache(prev => ({
          ...prev,
          macroFamilies: {
            ...prev.macroFamilies,
            [cacheKey]: data
          }
        }));
        return data;
      }
      return [];
    } catch (err) {
      setError(err.message);
      console.error("Error loading macro families:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [makeRequest, hierarchyCache.macroFamilies]);

  /**
   * Carica le famiglie per una macrofamiglia
   */
  const loadFamilies = useCallback(async (companyId, macroFamilyId, forceReload = false) => {
    try {
      setLoading(true);
      const cacheKey = `${companyId}_${macroFamilyId}`;
      if (!forceReload && hierarchyCache.families[cacheKey]) {
        return hierarchyCache.families[cacheKey];
      }
      const url = `${config.API_BASE_URL}/codingRules/hierarchy?companyId=${companyId}&macroFamilyId=${macroFamilyId}`;
      const data = await makeRequest(url);
      if (Array.isArray(data)) {
        setHierarchyCache(prev => ({
          ...prev,
          families: {
            ...prev.families,
            [cacheKey]: data
          }
        }));
        return data;
      }
      return [];
    } catch (err) {
      setError(err.message);
      console.error("Error loading families:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [makeRequest, hierarchyCache.families]);

  /**
   * Carica i tipi per una famiglia
   */
  const loadTypes = useCallback(async (companyId, familyId, forceReload = false) => {
    try {
      setLoading(true);
      const cacheKey = `${companyId}_${familyId}`;
      if (!forceReload && hierarchyCache.types[cacheKey]) {
        return hierarchyCache.types[cacheKey];
      }
      const url = `${config.API_BASE_URL}/codingRules/hierarchy?companyId=${companyId}&familyId=${familyId}`;
      const data = await makeRequest(url);
      if (Array.isArray(data)) {
        setHierarchyCache(prev => ({
          ...prev,
          types: {
            ...prev.types,
            [cacheKey]: data
          }
        }));
        return data;
      }
      return [];
    } catch (err) {
      setError(err.message);
      console.error("Error loading types:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [makeRequest, hierarchyCache.types]);

  /**
   * Carica gli alias per un tipo
   */
  const loadAliases = useCallback(async (companyId, typeId, forceReload = false) => {
    try {
      setLoading(true);
      const cacheKey = `${companyId}_${typeId}`;
      if (!forceReload && hierarchyCache.aliases[cacheKey]) {
        return hierarchyCache.aliases[cacheKey];
      }
      const url = `${config.API_BASE_URL}/codingRules/hierarchy?companyId=${companyId}&typeId=${typeId}`;
      const data = await makeRequest(url);
      if (Array.isArray(data)) {
        setHierarchyCache(prev => ({
          ...prev,
          aliases: {
            ...prev.aliases,
            [cacheKey]: data
          }
        }));
        return data;
      }
      return [];
    } catch (err) {
      setError(err.message);
      console.error("Error loading aliases:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [makeRequest, hierarchyCache.aliases]);

  /**
   * Ottiene il prossimo sequenziale per una radice
   */
  const getNextSequential = useCallback(async (companyId, macroFamilyCode, familyCode, typeCode, aliasCode) => {
    try {
      // Crea la chiave di cache
      const cacheKey = `${companyId}_${macroFamilyCode}_${familyCode}_${typeCode}_${aliasCode}`;
      
      // Se abbiamo già un sequenziale in cache per questa radice, incrementalo
      if (sequentialCache.current[cacheKey]) {
        sequentialCache.current[cacheKey]++;
        return sequentialCache.current[cacheKey];
      }
      
      const response = await makeRequest(
        `${config.API_BASE_URL}/codingRules/getNextSequential`,
        {
          method: "POST",
          body: JSON.stringify({
            companyId,
            macroFamilyCode,
            familyCode,
            typeCode,
            aliasCode
          })
        }
      );
      
      if (response && response.sequential) {
        // Salva in cache
        sequentialCache.current[cacheKey] = response.sequential;
        return response.sequential;
      }
      
      return 1; // Default
    } catch (err) {
      console.error("Error getting next sequential:", err);
      return 1; // Default in caso di errore
    }
  }, [makeRequest]);

  /**
   * Valida un codice completo
   */
  const validateCode = useCallback(async (companyId, itemCode) => {
    try {
      const response = await makeRequest(
        `${config.API_BASE_URL}/codingRules/validate`,
        {
          method: "POST",
          body: JSON.stringify({
            companyId,
            itemCode
          })
        }
      );
      console.log('Risposta validateCode:', response);
      return {
        isValid: response?.isValid == '1',
        message: response?.message || ""
      };
    } catch (err) {
      console.error("Error validating code:", err);
      return {
        isValid: false,
        message: err.message || "Errore durante la validazione"
      };
    }
  }, [makeRequest]);

  /**
   * Genera preview del codice
   */
  const generateCodePreview = useCallback((macroFamilyCode, familyCode, typeCode, aliasCode, measures, sequential) => {
    console.log("generateCodePreview chiamato con:", {
      macroFamilyCode,
      familyCode,
      typeCode,
      aliasCode,
      measures,
      sequential
    });
    
    // Verifica che almeno la macrofamiglia sia presente
    if (!macroFamilyCode) {
      console.log("Macrofamiglia mancante, ritorno stringa vuota");
      return "";
    }
    
    // Se mancano campi, riempi con zeri
    const formattedMacroFamily = macroFamilyCode.padEnd(1, "0").substring(0, 1);
    const formattedFamily = (familyCode || "000").padEnd(3, "0").substring(0, 3);
    const formattedType = (typeCode || "000").padEnd(3, "0").substring(0, 3);
    const formattedAlias = (aliasCode || "000").padEnd(3, "0").substring(0, 3);
    
    // Formatta il sequenziale a 3 cifre
    const formattedSequential = String(sequential || "001").padStart(3, "0");
    
    // Formatta le misure a 2 caratteri (se vuote, usa "00" invece di spazi)
    const formattedMeasures = measures ? 
      measures.padEnd(2, "0").substring(0, 2) : 
      "00";
    
    // Costruisci il codice
    const code = `${formattedMacroFamily}${formattedFamily}${formattedType}${formattedAlias}${formattedMeasures}${formattedSequential}`;
    
    console.log("Codice generato:", code, "Lunghezza:", code.length);
    
    return code;
  }, []);

  /**
   * Ottiene anteprima batch dei codici
   */
  const getPreviewBatch = useCallback(async (companyId, items) => {
    try {
      setLoading(true);
      
      const response = await makeRequest(
        `${config.API_BASE_URL}/codingRules/preview`,
        {
          method: "POST",
          body: JSON.stringify({
            companyId,
            items
          })
        }
      );
      
      return response || [];
    } catch (err) {
      setError(err.message);
      console.error("Error getting preview batch:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  /**
   * Applica ricodifica batch
   */
  const applyBatchRecoding = useCallback(async (companyId, userId, items) => {
    try {
      setLoading(true);
      
      const response = await makeRequest(
        `${config.API_BASE_URL}/codingRules/apply`,
        {
          method: "POST",
          body: JSON.stringify({
            companyId,
            userId,
            items
          })
        }
      );
      
      return {
        success: response?.success || false,
        successCount: response?.successCount || 0,
        errorCount: response?.errorCount || 0,
        errors: response?.errors || [],
        msg: response?.msg || ""
      };
    } catch (err) {
      setError(err.message);
      console.error("Error applying batch recoding:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  /**
   * Reset cache gerarchie
   */
  const resetHierarchyCache = useCallback(() => {
    setHierarchyCache({
      categories: [],
      macroFamilies: {},
      families: {},
      types: {},
      aliases: {}
    });
    sequentialCache.current = {};
  }, []);

  /**
   * Carica gerarchia completa per un componente
   */
  const loadFullHierarchy = useCallback(async (companyId, categoryId, macroFamilyId, familyId, typeId) => {
    try {
      setLoading(true);
      
      const result = {
        categories: [],
        macroFamilies: [],
        families: [],
        types: [],
        aliases: []
      };
      
      // Carica categorie
      result.categories = await loadCategories(companyId);
      
      // Se abbiamo una categoria, carica macrofamiglie
      if (categoryId) {
        result.macroFamilies = await loadMacroFamilies(companyId, categoryId);
        
        // Se abbiamo una macrofamiglia, carica famiglie
        if (macroFamilyId) {
          result.families = await loadFamilies(companyId, macroFamilyId);
          
          // Se abbiamo una famiglia, carica tipi
          if (familyId) {
            result.types = await loadTypes(companyId, familyId);
            
            // Se abbiamo un tipo, carica alias
            if (typeId) {
              result.aliases = await loadAliases(companyId, typeId);
            }
          }
        }
      }
      
      return result;
    } catch (err) {
      setError(err.message);
      console.error("Error loading full hierarchy:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadCategories, loadMacroFamilies, loadFamilies, loadTypes, loadAliases]);

    /**
   * Crea un nuovo elemento nella gerarchia
   */
    const createElement = useCallback(async (type, data) => {
      try {
        const endpoints = {
          macroFamily: '/codingRules/macrofamilies',
          family: '/codingRules/families',
          type: '/codingRules/types',
          alias: '/codingRules/aliases'
        };
        
        const endpoint = endpoints[type];
        if (!endpoint) {
          throw new Error('Tipo elemento non valido');
        }
        
        const response = await makeRequest(
          `${config.API_BASE_URL}${endpoint}`,
          {
            method: "POST",
            body: JSON.stringify(data)
          }
        );
        
        if (response && response.success) {
          return response.data;
        } else {
          throw new Error(response?.msg || 'Errore nella creazione');
        }
      } catch (err) {
        console.error(`Error creating ${type}:`, err);
        throw err;
      }
    }, [makeRequest]);

  /**
   * =====================================================
   * FUNZIONI PER LOGICA SEMPLIFICATA
   * =====================================================
   */

  /**
   * Carica configurazione logica semplificata
   */
  const getSimplifiedConfig = useCallback(async () => {
    try {
      setLoading(true);
      const url = `${config.API_BASE_URL}/codingRules/simplified/config`;
      const data = await makeRequest(url);
      return data;
    } catch (err) {
      setError(err.message);
      console.error("Error getting simplified config:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  /**
   * Aggiorna configurazione logica semplificata
   */
  const updateSimplifiedConfig = useCallback(async (isActive, charactersToKeep) => {
    try {
      setLoading(true);
      const url = `${config.API_BASE_URL}/codingRules/simplified/config`;
      const response = await makeRequest(url, {
        method: 'POST',
        body: JSON.stringify({ isActive, charactersToKeep })
      });
      return response;
    } catch (err) {
      setError(err.message);
      console.error("Error updating simplified config:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  /**
   * Ottieni prossimo sequenziale semplificato per un prefisso
   */
  const getNextSimplifiedSequential = useCallback(async (prefix) => {
    try {
      const url = `${config.API_BASE_URL}/codingRules/simplified/getNextSequential`;
      const response = await makeRequest(url, {
        method: 'POST',
        body: JSON.stringify({ prefix })
      });
      if (response && response.success) {
        return response.sequential;
      }
      throw new Error(response?.msg || 'Errore nel calcolo sequenziale');
    } catch (err) {
      console.error("Error getting simplified sequential:", err);
      throw err;
    }
  }, [makeRequest]);

  /**
   * Genera preview codice semplificato
   */
  const generateSimplifiedPreview = useCallback(async (originalCode, charactersToKeep) => {
    try {
      const url = `${config.API_BASE_URL}/codingRules/simplified/preview`;
      const response = await makeRequest(url, {
        method: 'POST',
        body: JSON.stringify({ originalCode, charactersToKeep })
      });
      if (response && response.success) {
        return response.previewCode;
      }
      throw new Error(response?.msg || 'Errore generazione preview');
    } catch (err) {
      console.error("Error generating simplified preview:", err);
      throw err;
    }
  }, [makeRequest]);

  /**
   * Genera preview batch codici semplificati
   */
  const generateSimplifiedBatchPreview = useCallback(async (items, charactersToKeep) => {
    try {
      setLoading(true);
      const url = `${config.API_BASE_URL}/codingRules/simplified/previewBatch`;
      const response = await makeRequest(url, {
        method: 'POST',
        body: JSON.stringify({ items, charactersToKeep })
      });
      if (response && response.success) {
        return response.previews;
      }
      throw new Error(response?.msg || 'Errore generazione preview batch');
    } catch (err) {
      setError(err.message);
      console.error("Error generating simplified batch preview:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  /**
   * Applica ricodifica batch con logica semplificata
   */
  const applySimplifiedBatchRecoding = useCallback(async (items) => {
    try {
      setLoading(true);
      const url = `${config.API_BASE_URL}/codingRules/simplified/apply`;
      const response = await makeRequest(url, {
        method: 'POST',
        body: JSON.stringify({ items })
      });
      return response;
    } catch (err) {
      setError(err.message);
      console.error("Error applying simplified batch recoding:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  /**
   * Estrae le componenti di un codice articolo (per precompilare modale ricodifica)
   */
  const extractCodeComponents = useCallback(async (itemCode) => {
    try {
      setLoading(true);
      const url = `${config.API_BASE_URL}/codingRules/extractComponents`;
      const response = await makeRequest(url, {
        method: 'POST',
        body: JSON.stringify({ itemCode })
      });
      if (response && response.success) {
        return response.data;
      }
      throw new Error(response?.msg || 'Errore estrazione componenti');
    } catch (err) {
      setError(err.message);
      console.error("Error extracting code components:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  return {
    // Stati
    loading,
    error,
    hierarchyCache,

    // Funzioni di caricamento
    loadCategories,
    loadMacroFamilies,
    loadFamilies,
    loadTypes,
    loadAliases,
    loadFullHierarchy,

    // Funzioni di utility
    getNextSequential,
    validateCode,
    generateCodePreview,
    getPreviewBatch,
    applyBatchRecoding,
    resetHierarchyCache,

    // Funzione di creazione
    createElement,

    // Funzioni logica semplificata
    getSimplifiedConfig,
    updateSimplifiedConfig,
    getNextSimplifiedSequential,
    generateSimplifiedPreview,
    generateSimplifiedBatchPreview,
    applySimplifiedBatchRecoding,
    
    // Estrazione componenti
    extractCodeComponents,
  };
};

export default useRecodingRules;