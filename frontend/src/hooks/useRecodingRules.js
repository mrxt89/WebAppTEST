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
  const loadCategories = useCallback(async (companyId) => {
    try {
      setLoading(true);
      
      // Controlla cache
      if (hierarchyCache.categories.length > 0) {
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
  const loadMacroFamilies = useCallback(async (companyId, categoryId) => {
    try {
      setLoading(true);
      
      // Controlla cache
      const cacheKey = `${companyId}_${categoryId}`;
      if (hierarchyCache.macroFamilies[cacheKey]) {
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
  const loadFamilies = useCallback(async (companyId, macroFamilyId) => {
    try {
      setLoading(true);
      
      // Controlla cache
      const cacheKey = `${companyId}_${macroFamilyId}`;
      if (hierarchyCache.families[cacheKey]) {
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
  const loadTypes = useCallback(async (companyId, familyId) => {
    try {
      setLoading(true);
      
      // Controlla cache
      const cacheKey = `${companyId}_${familyId}`;
      if (hierarchyCache.types[cacheKey]) {
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
  const loadAliases = useCallback(async (companyId, typeId) => {
    try {
      setLoading(true);
      
      // Controlla cache
      const cacheKey = `${companyId}_${typeId}`;
      if (hierarchyCache.aliases[cacheKey]) {
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
      
      return {
        isValid: response?.isValid || false,
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
    resetHierarchyCache
  };
};

export default useRecodingRules;