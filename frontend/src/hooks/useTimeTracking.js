import { useState, useCallback } from "react";
import { config } from "../config";
import useApiRequest from "./useApiRequest";
import { useAuth } from "@/context/AuthContext";

/**
 * Hook per gestire le operazioni di tracciamento del tempo
 * @returns {Object} Metodi e stati per il tracciamento del tempo
 */
const useTimeTracking = () => {
  const [loading, setLoading] = useState(false);
  const [timeEntries, setTimeEntries] = useState([]);
  const [availableTasks, setAvailableTasks] = useState([]);
  const { makeRequest } = useApiRequest();
  const { user, userGroups } = useAuth();

  /**
   * Verifica se l'utente è un amministratore o responsabile progetti
   * @returns {boolean} true se l'utente ha permessi di amministrazione
   */
  /**
   * Verifica se l'utente corrente ha permessi di amministrazione
   * @returns {boolean} True se l'utente è admin o responsabile progetti
   */
  const isUserAdmin = useCallback(() => {
    if (!userGroups) return false;
    const isAdmin = userGroups.some(
      (g) =>
        g.groupName.toUpperCase() === "ADMIN" ||
        g.groupName.toUpperCase() === "RESPONSABILI PROGETTI",
    );
    return isAdmin;
  }, [userGroups]);

  /**
   * Verifica se l'utente corrente può visualizzare i dati di un altro utente
   * @param {number} targetUserId - ID dell'utente di cui visualizzare i dati
   * @returns {boolean} True se l'utente ha i permessi necessari
   */
  const canViewUserData = useCallback(
    (targetUserId) => {
      // L'utente può sempre vedere i propri dati
      if (user && user.userId === targetUserId) return true;

      // Solo admin o responsabili progetti possono vedere i dati di altri utenti
      return isUserAdmin();
    },
    [user, isUserAdmin],
  );

  /**
   * Ottiene le registrazioni di ore settimanali per un utente
   * @param {number} userId - ID dell'utente
   * @param {Date|string} weekStartDate - Data di inizio settimana
   * @returns {Promise<Array>} Array con i tre recordset (daily entries, weekly totals, daily totals)
   * @throws {Error} Se l'utente non ha i permessi necessari
   */
  const getUserTimeWeekly = useCallback(
    async (userId, weekStartDate) => {
      try {
        // Verifica dei permessi
        if (!canViewUserData(userId)) {
          throw new Error(
            "Non hai i permessi per visualizzare i dati di questo utente",
          );
        }

        setLoading(true);
        // Formatta la data se necessario
        let formattedDate = "";
        if (weekStartDate) {
          if (weekStartDate instanceof Date) {
            formattedDate = weekStartDate.toISOString().split("T")[0];
          } else {
            formattedDate = weekStartDate;
          }
        }

        const url = `${config.API_BASE_URL}/timetracking/weekly/${userId}?weekStartDate=${formattedDate}`;
        const data = await makeRequest(url);

        if (data) {
          return data;
        }
        return [[], [], []];
      } catch (error) {
        console.error("Error fetching weekly time entries:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest, canViewUserData],
  );

  /**
   * Ottiene le attività disponibili per un utente
   * @param {number} userId - ID dell'utente
   * @returns {Promise<Array>} Array di attività disponibili
   * @throws {Error} Se l'utente non ha i permessi necessari
   */
  const getUserAvailableTasks = useCallback(
    async (userId) => {
      try {
        // Verifica dei permessi
        if (!canViewUserData(userId)) {
          throw new Error(
            "Non hai i permessi per visualizzare i dati di questo utente",
          );
        }

        setLoading(true);
        const url = `${config.API_BASE_URL}/timetracking/tasks/${userId}`;
        const data = await makeRequest(url);

        if (data) {
          setAvailableTasks(data);
          return data;
        }
        setAvailableTasks([]);
        return [];
      } catch (error) {
        console.error("Error fetching available tasks:", error);
        setAvailableTasks([]);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest, canViewUserData],
  );

  /**
   * Aggiunge una nuova registrazione di ore
   * @param {Object} entryData - Dati della registrazione
   * @returns {Promise<Object>} Risultato dell'operazione
   * @throws {Error} Se l'utente non ha i permessi necessari
   */
  const addTimeEntry = useCallback(
    async (entryData) => {
      try {
        // Verifica dei permessi
        if (entryData.UserID !== user?.userId && !isUserAdmin()) {
          throw new Error(
            "Non hai i permessi per registrare ore per questo utente",
          );
        }

        setLoading(true);
        const url = `${config.API_BASE_URL}/timetracking/entries`;
        return await makeRequest(url, {
          method: "POST",
          body: JSON.stringify(entryData),
        });
      } catch (error) {
        console.error("Error adding time entry:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest, user, isUserAdmin],
  );

  /**
   * Aggiorna una registrazione esistente
   * @param {number} entryId - ID della registrazione
   * @param {Object} entryData - Dati aggiornati della registrazione
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  const updateTimeEntry = useCallback(
    async (entryId, entryData) => {
      try {
        setLoading(true);
        const url = `${config.API_BASE_URL}/timetracking/entries/${entryId}`;
        return await makeRequest(url, {
          method: "PUT",
          body: JSON.stringify(entryData),
        });
      } catch (error) {
        console.error("Error updating time entry:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  /**
   * Elimina una registrazione
   * @param {number} entryId - ID della registrazione
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  const deleteTimeEntry = useCallback(
    async (entryId) => {
      try {
        setLoading(true);
        const url = `${config.API_BASE_URL}/timetracking/entries/${entryId}`;
        return await makeRequest(url, {
          method: "DELETE",
        });
      } catch (error) {
        console.error("Error deleting time entry:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  /**
   * Ottiene il riepilogo delle ore per un progetto
   * @param {number} projectId - ID del progetto
   * @returns {Promise<Object>} Riepilogo delle ore del progetto
   */
  const getProjectTimeSummary = useCallback(
    async (projectId) => {
      try {
        setLoading(true);
        const url = `${config.API_BASE_URL}/timetracking/projects/${projectId}/summary`;
        return await makeRequest(url);
      } catch (error) {
        console.error("Error fetching project time summary:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  /**
   * Ottiene il riepilogo delle ore per un'attività
   * @param {number} taskId - ID dell'attività
   * @returns {Promise<Object>} Riepilogo delle ore dell'attività
   */
  const getTaskTimeSummary = useCallback(
    async (taskId) => {
      try {
        setLoading(true);
        const url = `${config.API_BASE_URL}/timetracking/tasks/${taskId}/summary`;
        return await makeRequest(url);
      } catch (error) {
        console.error("Error fetching task time summary:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  /**
   * Ottiene il report mensile delle ore per un utente
   * @param {number} userId - ID dell'utente
   * @param {string} month - Mese in formato YYYY-MM
   * @returns {Promise<Object>} Report mensile delle ore
   */
  const getMonthlyTimeReport = useCallback(
    async (userId, month) => {
      try {
        setLoading(true);
        const url = `${config.API_BASE_URL}/timetracking/reports/monthly/${userId}?month=${month}`;
        return await makeRequest(url);
      } catch (error) {
        console.error("Error fetching monthly time report:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  /**
   * Esporta il report delle ore in formato CSV o Excel
   * @param {number} userId - ID dell'utente
   * @param {string} period - Periodo (month, quarter, year)
   * @param {string} value - Valore del periodo (YYYY-MM, YYYY-Q1, YYYY)
   * @param {string} format - Formato di esportazione (csv, excel)
   * @returns {Promise<Blob>} Blob con i dati esportati
   */
  const exportTimeReport = useCallback(
    async (userId, period, value, format = "csv") => {
      try {
        setLoading(true);
        const url = `${config.API_BASE_URL}/timetracking/reports/export/${userId}?period=${period}&value=${value}&format=${format}`;

        // Per download di file, non usiamo makeRequest ma fetch diretto
        const token = localStorage.getItem("token");
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("Error exporting time report");

        return await response.blob();
      } catch (error) {
        console.error("Error exporting time report:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    loading,
    timeEntries,
    availableTasks,
    getUserTimeWeekly,
    getUserAvailableTasks,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    getProjectTimeSummary,
    getTaskTimeSummary,
    getMonthlyTimeReport,
    exportTimeReport,
    isUserAdmin,
    canViewUserData,
    currentUserId: user?.userId,
  };
};

export default useTimeTracking;
