import { useState, useEffect, useCallback } from "react";
import axiosInstance from "@/lib/axios";
import { toast } from "sonner";

const useWikiManagement = () => {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(false);

  /**
   * Carica tutti i componenti di una pagina specifica
   */
  const fetchComponentsByPage = useCallback(async (pageId) => {
    if (!pageId) {
      setComponents([]);
      return [];
    }

    setLoading(true);
    try {
      const response = await axiosInstance.get(`/wiki/components/page/${pageId}`);
      setComponents(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching page components:", error);
      toast.error("Errore nel caricamento dei componenti");
      setComponents([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Carica tutti i componenti di tutte le pagine
   */
  const fetchAllComponents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/wiki/components/all`);
      setComponents(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching all components:", error);
      toast.error("Errore nel caricamento dei componenti");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Ottiene i componenti disponibili come parent per una pagina
   */
  const fetchAvailableParents = useCallback(async (pageId, excludeComponentId = null) => {
    try {
      const url = excludeComponentId
        ? `/wiki/components/page/${pageId}/available-parents/${excludeComponentId}`
        : `/wiki/components/page/${pageId}/available-parents`;

      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching available parents:", error);
      toast.error("Errore nel caricamento dei parent disponibili");
      return [];
    }
  }, []);

  /**
   * Crea un nuovo componente
   */
  const createComponent = useCallback(async (componentData) => {
    try {
      const response = await axiosInstance.post(`/wiki/components`, componentData);
      toast.success("Componente creato con successo");
      return response.data;
    } catch (error) {
      console.error("Error creating component:", error);

      if (error.response?.status === 400) {
        toast.error("Esiste già un componente con questa chiave per questa pagina");
      } else {
        toast.error("Errore nella creazione del componente");
      }

      throw error;
    }
  }, []);

  /**
   * Aggiorna un componente esistente
   */
  const updateComponent = useCallback(async (componentId, componentData) => {
    try {
      const response = await axiosInstance.put(`/wiki/components/${componentId}`, componentData);
      toast.success("Componente aggiornato con successo");
      return response.data;
    } catch (error) {
      console.error("Error updating component:", error);

      if (error.response?.status === 400) {
        toast.error("Esiste già un componente con questa chiave per questa pagina");
      } else if (error.response?.status === 404) {
        toast.error("Componente non trovato");
      } else {
        toast.error("Errore nell'aggiornamento del componente");
      }

      throw error;
    }
  }, []);

  /**
   * Elimina un componente (e tutti i suoi figli ricorsivamente)
   */
  const deleteComponent = useCallback(async (componentId) => {
    try {
      await axiosInstance.delete(`/wiki/components/${componentId}`);
      toast.success("Componente eliminato con successo");
      return true;
    } catch (error) {
      console.error("Error deleting component:", error);
      toast.error("Errore nell'eliminazione del componente");
      throw error;
    }
  }, []);

  /**
   * Risolve l'URL wiki per una pagina e componente
   */
  const resolveWikiUrl = useCallback(async (pageId, componentKey = null) => {
    try {
      const url = componentKey
        ? `/wiki/resolve/${pageId}/${componentKey}`
        : `/wiki/resolve/${pageId}`;

      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn("No wiki documentation found for this page/component");
        return null;
      }

      console.error("Error resolving wiki URL:", error);
      toast.error("Errore nella risoluzione dell'URL wiki");
      return null;
    }
  }, []);

  /**
   * Refresh dei dati della pagina corrente
   */
  const refreshComponents = useCallback(async (pageId) => {
    if (pageId) {
      await fetchComponentsByPage(pageId);
    }
  }, [fetchComponentsByPage]);

  /**
   * Carica tutte le pagine wiki dal database WikiJS
   */
  const fetchWikiPages = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`/wiki/pages`);
      return response.data;
    } catch (error) {
      console.error("Error fetching wiki pages:", error);
      toast.error("Errore nel caricamento delle pagine wiki");
      return [];
    }
  }, []);

  /**
   * Ottiene il path di una pagina wiki dato il suo ID
   */
  const getWikiPagePath = useCallback(async (wikiPageId) => {
    try {
      const response = await axiosInstance.get(`/wiki/pages/${wikiPageId}/path`);
      return response.data;
    } catch (error) {
      console.error("Error getting wiki page path:", error);
      return null;
    }
  }, []);

  return {
    // State
    components,
    loading,

    // Actions
    fetchComponentsByPage,
    fetchAllComponents,
    fetchAvailableParents,
    createComponent,
    updateComponent,
    deleteComponent,
    resolveWikiUrl,
    refreshComponents,
    fetchWikiPages,
    getWikiPagePath,
  };
};

export default useWikiManagement;
