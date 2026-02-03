// frontend/src/hooks/useProjectActivityLog.js
import { useCallback, useState } from "react";
import axiosInstance from "@/lib/axios";

/**
 * Hook per gestire la lettura dei log attività progetto (audit trail).
 * Nota: la scrittura log avviene lato backend; qui ci limitiamo a leggere.
 */
const useProjectActivityLog = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Recupera i log di un progetto con filtri e paginazione.
   * @param {number} projectId
   * @param {Object} params
   * @returns {Promise<{success:boolean, logs:any[], totalCount:number, pageNumber:number, pageSize:number, totalPages:number}>}
   */
  const getProjectLogs = useCallback(async (projectId, params = {}) => {
    if (!projectId) {
      return {
        success: true,
        logs: [],
        totalCount: 0,
        pageNumber: 1,
        pageSize: params.pageSize || 50,
        totalPages: 0,
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get(
        `/project-activity/projects/${projectId}/logs`,
        { params },
      );
      return response.data;
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Errore nel recupero dei log";
      setError(msg);
      return { success: false, message: msg, logs: [], totalCount: 0 };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Recupera statistiche dei log (opzionale, utile per dashboard future).
   * @param {number} projectId
   * @param {Object} params
   */
  const getProjectActivityStats = useCallback(async (projectId, params = {}) => {
    if (!projectId) return { success: true };

    setIsLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get(
        `/project-activity/projects/${projectId}/stats`,
        { params },
      );
      return response.data;
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Errore nel recupero delle statistiche";
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    getProjectLogs,
    getProjectActivityStats,
  };
};

export default useProjectActivityLog;

