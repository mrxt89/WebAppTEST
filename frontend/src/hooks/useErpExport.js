// src/hooks/useErpExport.js

import { useState, useCallback } from "react";
import { config } from "@/config";
import useApiRequest from "./useApiRequest";

const useErpExport = () => {
  const { makeRequest } = useApiRequest();
  
  // Stati principali
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exportLog, setExportLog] = useState([]);
  const [statistics, setStatistics] = useState(null);

  /**
   * Export single item to ERP
   * @param {number} itemId - Item ID to export
   * @returns {Promise<{success: boolean, message: string}>}
   */
  const exportItem = useCallback(async (itemId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeRequest(
        `${config.API_BASE_URL}/erp/export/item`,
        {
          method: "POST",
          body: JSON.stringify({ itemId })
        }
      );
      
      return {
        success: response?.success === 1,
        message: response?.msg || ""
      };
    } catch (err) {
      setError(err.message);
      console.error("Error exporting item:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  /**
   * Export BOM to ERP
   * @param {number} bomId - BOM ID to export
   * @param {number} version - BOM version
   * @param {boolean} checkRecursive - Export recursively (default: true)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  const exportBOM = useCallback(async (bomId, version, checkRecursive = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeRequest(
        `${config.API_BASE_URL}/erp/export/bom`,
        {
          method: "POST",
          body: JSON.stringify({ 
            bomId, 
            version, 
            checkRecursive 
          })
        }
      );
      
      return {
        success: response?.success === 1,
        message: response?.msg || "",
        missingComponents: response?.missingComponents || []
      };
    } catch (err) {
      setError(err.message);
      console.error("Error exporting BOM:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  /**
   * Export multiple items in batch
   * @param {Array<number>} itemIds - Array of item IDs to export
   * @returns {Promise<Object>}
   */
  const exportItemsBatch = useCallback(async (itemIds) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeRequest(
        `${config.API_BASE_URL}/erp/export/items/batch`,
        {
          method: "POST",
          body: JSON.stringify({ itemIds })
        }
      );
      
      return {
        success: response?.success === 1,
        successCount: response?.successCount || 0,
        errorCount: response?.errorCount || 0,
        results: response?.results || [],
        message: response?.msg || ""
      };
    } catch (err) {
      setError(err.message);
      console.error("Error in batch export:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  /**
   * Export multiple BOMs in batch
   * @param {Array<{bomId: number, version: number}>} boms - Array of BOMs to export
   * @param {boolean} checkRecursive - Export recursively (default: true)
   * @returns {Promise<Object>}
   */
  const exportBOMsBatch = useCallback(async (boms, checkRecursive = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeRequest(
        `${config.API_BASE_URL}/erp/export/boms/batch`,
        {
          method: "POST",
          body: JSON.stringify({ 
            boms, 
            checkRecursive 
          })
        }
      );
      
      return {
        success: response?.success === 1,
        successCount: response?.successCount || 0,
        errorCount: response?.errorCount || 0,
        results: response?.results || [],
        message: response?.msg || ""
      };
    } catch (err) {
      setError(err.message);
      console.error("Error in batch BOM export:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  /**
   * Check if item can be exported
   * @param {number} itemId - Item ID to check
   * @returns {Promise<Object>}
   */
  const checkItemExportability = useCallback(async (itemId) => {
    try {
      const response = await makeRequest(
        `${config.API_BASE_URL}/erp/export/check/item/${itemId}`
      );
      
      return {
        canExport: response?.canExport || false,
        reason: response?.reason || "",
        alreadyExported: response?.alreadyExported || false
      };
    } catch (err) {
      console.error("Error checking item exportability:", err);
      return {
        canExport: false,
        reason: err.message || "Errore nel controllo",
        error: true
      };
    }
  }, [makeRequest]);

  /**
   * Check if BOM can be exported
   * @param {number} bomId - BOM ID to check
   * @param {number} version - BOM version
   * @returns {Promise<Object>}
   */
  const checkBOMExportability = useCallback(async (bomId, version) => {
    try {
      const response = await makeRequest(
        `${config.API_BASE_URL}/erp/export/check/bom/${bomId}/${version}`
      );
      
      return {
        canExport: response?.canExport || false,
        reason: response?.reason || "",
        missingComponents: response?.missingComponents || [],
        alreadyExported: response?.alreadyExported || false
      };
    } catch (err) {
      console.error("Error checking BOM exportability:", err);
      return {
        canExport: false,
        reason: err.message || "Errore nel controllo",
        missingComponents: [],
        error: true
      };
    }
  }, [makeRequest]);

  /**
   * Check multiple items exportability
   * @param {Array<number>} itemIds - Array of item IDs to check
   * @returns {Promise<Object>}
   */
  const checkItemsBatchExportability = useCallback(async (itemIds) => {
    try {
      const response = await makeRequest(
        `${config.API_BASE_URL}/erp/export/check/items/batch`,
        {
          method: "POST",
          body: JSON.stringify({ itemIds })
        }
      );
      
      return {
        results: response?.results || [],
        summary: response?.summary || {
          total: 0,
          exportable: 0,
          alreadyExported: 0,
          notExportable: 0
        }
      };
    } catch (err) {
      console.error("Error checking batch exportability:", err);
      throw err;
    }
  }, [makeRequest]);

  /**
   * Load export log
   * @param {Object} filters - Log filters
   * @returns {Promise<Array>}
   */
  const loadExportLog = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query string
      const params = new URLSearchParams();
      if (filters.userId) params.append("userId", filters.userId);
      if (filters.operationType) params.append("operationType", filters.operationType);
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      if (filters.onlyErrors) params.append("onlyErrors", "true");
      
      const url = `${config.API_BASE_URL}/erp/export/log${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      
      const response = await makeRequest(url);
      
      const log = response?.records || [];
      setExportLog(log);
      
      return log;
    } catch (err) {
      setError(err.message);
      console.error("Error loading export log:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  /**
   * Load export statistics
   * @param {string} period - Period for statistics (today, week, month, all)
   * @returns {Promise<Object>}
   */
  const loadStatistics = useCallback(async (period = "all") => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeRequest(
        `${config.API_BASE_URL}/erp/export/statistics?period=${period}`
      );
      
      const stats = response?.statistics || {
        TotalExports: 0,
        SuccessfulExports: 0,
        FailedExports: 0,
        UniqueItems: 0,
        UniqueBOMs: 0,
        UniqueUsers: 0,
        SuccessRate: 0
      };
      
      setStatistics(stats);
      
      return stats;
    } catch (err) {
      setError(err.message);
      console.error("Error loading statistics:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  /**
   * Sync items from ERP to WebApp
   * @param {string} itemCode - Item code to sync (null = sync all)
   * @param {boolean} onlyExported - Only sync already exported items (default: true)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  const syncItemsFromERP = useCallback(async (itemCode = null, onlyExported = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeRequest(
        `${config.API_BASE_URL}/erp/sync/items`,
        {
          method: "POST",
          body: JSON.stringify({ 
            itemCode,
            onlyExported
          })
        }
      );
      
      return {
        success: response?.success === 1,
        message: response?.msg || ""
      };
    } catch (err) {
      setError(err.message);
      console.error("Error syncing items:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  /**
   * Sync BOMs from ERP to WebApp
   * @param {string} bomCode - BOM code to sync (null = sync all)
   * @param {number} version - BOM version (null = all versions)
   * @param {boolean} onlyExported - Only sync already exported BOMs (default: true)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  const syncBOMsFromERP = useCallback(async (bomCode = null, version = null, onlyExported = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeRequest(
        `${config.API_BASE_URL}/erp/sync/boms`,
        {
          method: "POST",
          body: JSON.stringify({ 
            bomCode,
            version,
            onlyExported
          })
        }
      );
      
      return {
        success: response?.success === 1,
        message: response?.msg || ""
      };
    } catch (err) {
      setError(err.message);
      console.error("Error syncing BOMs:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  /**
   * Sync all data from ERP to WebApp
   * @param {Object} options - Sync options
   * @param {boolean} options.syncItems - Sync items (default: true)
   * @param {boolean} options.syncBOMs - Sync BOMs (default: true)
   * @param {boolean} options.onlyExported - Only sync already exported data (default: true)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  const syncAllFromERP = useCallback(async (options = {}) => {
    const {
      syncItems = true,
      syncBOMs = true,
      onlyExported = true
    } = options;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeRequest(
        `${config.API_BASE_URL}/erp/sync/all`,
        {
          method: "POST",
          body: JSON.stringify({ 
            syncItems,
            syncBOMs,
            onlyExported
          })
        }
      );
      
      return {
        success: response?.success === 1,
        message: response?.msg || ""
      };
    } catch (err) {
      setError(err.message);
      console.error("Error syncing all:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Helper function to determine export status
   * @param {Object} item - Item or BOM object
   * @returns {Object} Status info
   */
  const getExportStatus = useCallback((item) => {
    if (!item) return { status: "unknown", label: "Sconosciuto", color: "gray" };
    
    if (item.stato_erp === 1) {
      return {
        status: "exported",
        label: "Esportato",
        color: "green",
        icon: "check-circle"
      };
    }
    
    if (item.Disabled === 1) {
      return {
        status: "disabled",
        label: "Disabilitato",
        color: "gray",
        icon: "x-circle"
      };
    }
    
    if (!item.Item || !item.Description) {
      return {
        status: "incomplete",
        label: "Incompleto",
        color: "yellow",
        icon: "alert-circle"
      };
    }
    
    return {
      status: "ready",
      label: "Pronto",
      color: "blue",
      icon: "upload"
    };
  }, []);

  /**
   * Process export results for UI display
   * @param {Array} results - Raw results from batch export
   * @returns {Object} Processed results
   */
  const processExportResults = useCallback((results) => {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    // Group errors by type
    const errorGroups = {};
    failed.forEach(item => {
      const errorType = item.message || "Errore sconosciuto";
      if (!errorGroups[errorType]) {
        errorGroups[errorType] = [];
      }
      errorGroups[errorType].push(item);
    });
    
    return {
      successful,
      failed,
      errorGroups,
      hasErrors: failed.length > 0,
      allSuccessful: failed.length === 0
    };
  }, []);

  return {
    // Stati
    loading,
    error,
    exportLog,
    statistics,
    
    // Funzioni di esportazione
    exportItem,
    exportBOM,
    exportItemsBatch,
    exportBOMsBatch,
    
    // Funzioni di sincronizzazione
    syncItemsFromERP,
    syncBOMsFromERP,
    syncAllFromERP,
    
    // Funzioni di controllo
    checkItemExportability,
    checkBOMExportability,
    checkItemsBatchExportability,
    
    // Funzioni di caricamento dati
    loadExportLog,
    loadStatistics,
    
    // Utility
    clearError,
    getExportStatus,
    processExportResults
  };
};

export default useErpExport;