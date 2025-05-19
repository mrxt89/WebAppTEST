import { useState, useCallback } from "react";
import axios from "axios";
import { swal } from "../lib/common";
import { config } from "../config";

/**
 * Hook per gestire le azioni di intelligenza artificiale nell'applicazione
 * @returns {Object} - Funzioni e stati per operazioni di IA
 */
const useAIActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiStatus, setAIStatus] = useState(null);

  /**
   * Controlla lo stato delle configurazioni dell'AI
   * @returns {Promise<Object>} - Stato delle configurazioni AI
   */
  const checkAIStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const response = await axios.get(`${config.API_BASE_URL}/ai/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setAIStatus(response.data.status);
        return response.data.status;
      } else {
        throw new Error(
          response.data.error || "Errore nel controllo dello stato dell'AI",
        );
      }
    } catch (error) {
      console.error("Error checking AI status:", error);
      setError(
        error.message ||
          "Si è verificato un errore durante il controllo dello stato dell'AI",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Genera un riepilogo automatico della conversazione
   * @param {number} notificationId - ID della notifica/conversazione
   * @param {number} userId - ID dell'utente
   * @returns {Promise<Array>} - Lista dei punti salienti generati
   */
  const generateConversationSummary = useCallback(
    async (notificationId, userId) => {
      try {
        setLoading(true);
        setError(null);

        // Chiamata diretta all'endpoint di generazione highlights
        const token = localStorage.getItem("token");
        const response = await axios.post(
          `${config.API_BASE_URL}/ai/generate-highlights/${notificationId}`,
          {}, // Body vuoto, tutti i parametri sono nell'URL e nell'autenticazione
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.data.success) {
          throw new Error(
            response.data.error || "Errore nella generazione del riepilogo",
          );
        }

        // Restituisce sia i punti salienti generati che quelli salvati
        return {
          generatedHighlights: response.data.generatedHighlights || [], // Punti appena generati dall'AI
          savedHighlights:
            response.data.savedHighlights || response.data.highlights || [], // Tutti i punti salvati
        };
      } catch (error) {
        console.error("Error in generateConversationSummary:", error);
        setError(
          error.message ||
            "Si è verificato un errore durante la generazione del riepilogo",
        );
        // Mostra un messaggio di errore all'utente
        swal.fire({
          title: "Errore",
          text:
            error.message ||
            "Impossibile generare il riepilogo della conversazione",
          icon: "error",
          timer: 3000,
        });
        return {
          generatedHighlights: [],
          savedHighlights: [],
        };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Analizza il sentiment di un messaggio
   * @param {string} text - Testo da analizzare
   * @returns {Promise<Object>} - Risultato dell'analisi del sentiment
   */
  const analyzeSentiment = useCallback(async (text) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${config.API_BASE_URL}/ai/sentiment`,
        { text },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.data.success) {
        throw new Error(
          response.data.error || "Errore nell'analisi del sentiment",
        );
      }

      return response.data.sentiment;
    } catch (error) {
      console.error("Error in analyzeSentiment:", error);
      setError(
        error.message ||
          "Si è verificato un errore durante l'analisi del sentiment",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Suggerisce una risposta in base al contesto della conversazione
   * @param {number} notificationId - ID della notifica/conversazione
   * @param {string} lastMessage - Ultimo messaggio ricevuto
   * @returns {Promise<string>} - Testo della risposta suggerita
   */
  const suggestReply = useCallback(async (notificationId, lastMessage) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${config.API_BASE_URL}/ai/suggest-reply`,
        {
          notificationId,
          lastMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.data.success) {
        throw new Error(
          response.data.error ||
            "Errore nella generazione della risposta suggerita",
        );
      }

      return response.data.suggestedReply;
    } catch (error) {
      console.error("Error in suggestReply:", error);
      setError(
        error.message ||
          "Si è verificato un errore durante la generazione della risposta suggerita",
      );
      return "";
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    aiStatus,
    checkAIStatus,
    generateConversationSummary,
    analyzeSentiment,
    suggestReply,
  };
};

export default useAIActions;
