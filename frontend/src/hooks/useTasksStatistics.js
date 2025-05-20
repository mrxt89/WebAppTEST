import { useState, useCallback } from "react";
import { config } from "../config";

/**
 * Hook personalizzato per ottenere statistiche sulle attività con filtri dinamici
 */
const useTasksStatistics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(null);

  /**
   * Recupera statistiche delle attività filtrate
   * @param {Object} filters - Filtri da applicare (opzionali)
   */
  const getTasksStatistics = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Costruisci i parametri della query dai filtri
      const queryParams = new URLSearchParams();

      if (filters.searchText)
        queryParams.append("searchText", filters.searchText);
      if (filters.priority && filters.priority !== "all")
        queryParams.append("priority", filters.priority);
      if (filters.status && filters.status !== "all")
        queryParams.append("status", filters.status);
      if (filters.projectId && filters.projectId !== "all")
        queryParams.append("projectId", filters.projectId);
      if (filters.dueDate && filters.dueDate !== "all")
        queryParams.append("dueDate", filters.dueDate);
      if (filters.assignedTo)
        queryParams.append("assignedTo", filters.assignedTo);

      // Ottieni token di autenticazione
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Utente non autenticato");
      }

      // Esegui la richiesta API
      const response = await fetch(
        `${config.API_BASE_URL}/tasks/statistics?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          "Errore nel recupero delle statistiche: " + response.statusText,
        );
      }

      const data = await response.json();
      setStatistics(data);
      return data;
    } catch (err) {
      console.error("Errore in getTasksStatistics:", err);
      setError(
        err.message ||
          "Si è verificato un errore durante il recupero delle statistiche",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Costruisci statistiche locali basate su un array di tasks
   * Utile quando vuoi statistiche in tempo reale senza fare chiamate API
   * @param {Array} tasks - Lista di attività da analizzare
   * @returns {Object} Statistiche calcolate
   */
  const calculateLocalStatistics = useCallback((tasks = []) => {
    if (!tasks || tasks.length === 0) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        delayedTasks: 0,
        upcomingTasks: 0,
        byStatus: {},
        byPriority: {},
        byAssignee: {},
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    // Statistiche di base
    const stats = {
      totalTasks: tasks.length,
      completedTasks: 0,
      inProgressTasks: 0,
      delayedTasks: 0,
      upcomingTasks: 0,
      byStatus: {},
      byPriority: {},
      byAssignee: {},
    };

    // Analisi delle attività
    tasks.forEach((task) => {
      // Statistiche per stato
      stats.byStatus[task.Status] = (stats.byStatus[task.Status] || 0) + 1;

      // Statistiche per priorità
      stats.byPriority[task.Priority] =
        (stats.byPriority[task.Priority] || 0) + 1;

      // Statistiche per assegnatario
      if (task.AssignedToName) {
        stats.byAssignee[task.AssignedToName] =
          (stats.byAssignee[task.AssignedToName] || 0) + 1;
      }

      // Conteggi specifici
      if (task.Status === "COMPLETATA") {
        stats.completedTasks++;
      } else if (task.Status === "IN ESECUZIONE") {
        stats.inProgressTasks++;
      }

      // Attività in ritardo
      if (task.Status !== "COMPLETATA" && task.DueDate) {
        const dueDate = new Date(task.DueDate);
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate < today) {
          stats.delayedTasks++;
        } else if (dueDate <= nextWeek) {
          stats.upcomingTasks++;
        }
      }
    });

    return stats;
  }, []);

  return {
    getTasksStatistics,
    calculateLocalStatistics,
    loading,
    error,
    statistics,
  };
};

export default useTasksStatistics;
