// hooks/useProjectStages.js
import { useState, useCallback } from "react";
import { config } from "../config";
import useApiRequest from "./useApiRequest";
import { toast } from "@/components/ui/use-toast";

const useProjectStages = () => {
  const [stages, setStages] = useState([]);
  const [unassignedTasks, setUnassignedTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const { makeRequest } = useApiRequest();

// Ottieni stages del progetto
const fetchProjectStages = useCallback(async (projectId) => {
    try {
      setLoading(true);
      const url = `${config.API_BASE_URL}/projects/${projectId}/stages`;
      const data = await makeRequest(url);
      
      if (data) {
        // Assicurati che ogni stage abbia un array Tasks valido
        const stagesWithTasks = (data.stages || []).map(stage => {
          // Parse JSON strings se necessario
          let tasks = stage.Tasks;
          let checklistItems = stage.ChecklistItems;
          
          // Se Tasks è una stringa JSON, parsala
          if (typeof tasks === 'string') {
            try {
              tasks = JSON.parse(tasks);
            } catch (e) {
              console.error('Error parsing Tasks JSON:', e);
              tasks = [];
            }
          }
          
          // Se ChecklistItems è una stringa JSON, parsala
          if (typeof checklistItems === 'string') {
            try {
              checklistItems = JSON.parse(checklistItems);
            } catch (e) {
              console.error('Error parsing ChecklistItems JSON:', e);
              checklistItems = [];
            }
          }
          
          return {
            ...stage,
            Tasks: Array.isArray(tasks) ? tasks : [],
            ChecklistItems: Array.isArray(checklistItems) ? checklistItems : []
          };
        });
        
        setStages(stagesWithTasks);
        setUnassignedTasks(data.unassignedTasks || []);
        return { stages: stagesWithTasks, unassignedTasks: data.unassignedTasks || [] };
      }
      return { stages: [], unassignedTasks: [] };
    } catch (error) {
      console.error("Error fetching project stages:", error);
      toast({
        title: "Errore",
        description: "Errore nel caricamento degli stage",
        variant: "destructive",
      });
      return { stages: [], unassignedTasks: [] };
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  // Crea/Modifica stage
  const addUpdateStage = useCallback(async (projectId, stageData) => {
    try {
      setLoading(true);
      const url = `${config.API_BASE_URL}/projects/${projectId}/stages`;
      const result = await makeRequest(url, {
        method: "POST",
        body: JSON.stringify(stageData),
      });
      
      if (result?.success) {
        toast({
          title: "Successo",
          description: result.msg || "Stage salvato con successo",
          variant: "success",
        });
        return result;
      }
      throw new Error(result?.msg || "Errore nel salvataggio dello stage");
    } catch (error) {
      console.error("Error saving stage:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore nel salvataggio dello stage",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  // Elimina stage
  const deleteStage = useCallback(async (stageId) => {
    try {
      setLoading(true);
      const url = `${config.API_BASE_URL}/stages/${stageId}`;
      const result = await makeRequest(url, {
        method: "DELETE",
      });
      
      if (result?.success) {
        toast({
          title: "Successo",
          description: "Stage eliminato con successo",
          variant: "success",
        });
        return result;
      }
      throw new Error(result?.msg || "Errore nell'eliminazione dello stage");
    } catch (error) {
      console.error("Error deleting stage:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore nell'eliminazione dello stage",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  // Riordina stages
  const reorderStages = useCallback(async (projectId, stageOrders) => {
    try {
      const url = `${config.API_BASE_URL}/projects/${projectId}/stages/reorder`;
      const result = await makeRequest(url, {
        method: "PUT",
        body: JSON.stringify({ stageOrders }),
      });
      
      if (result?.success) {
        return result;
      }
      throw new Error(result?.msg || "Errore nel riordinamento degli stage");
    } catch (error) {
      console.error("Error reordering stages:", error);
      toast({
        title: "Errore",
        description: "Errore nel riordinamento degli stage",
        variant: "destructive",
      });
      return { success: false };
    }
  }, [makeRequest]);

  // Assegna task a stage
  const assignTaskToStage = useCallback(async (taskId, stageId, taskSequenceInStage = null) => {
    try {
      const url = `${config.API_BASE_URL}/tasks/${taskId}/stage`;
      const result = await makeRequest(url, {
        method: "PUT",
        body: JSON.stringify({ stageId, taskSequenceInStage }),
      });
      
      if (result?.success) {
        return result;
      }
      throw new Error(result?.msg || "Errore nell'assegnazione del task");
    } catch (error) {
      console.error("Error assigning task to stage:", error);
      toast({
        title: "Errore",
        description: "Errore nell'assegnazione del task allo stage",
        variant: "destructive",
      });
      return { success: false };
    }
  }, [makeRequest]);

  // Gestione Checklist
  const addUpdateChecklistItem = useCallback(async (stageId, checklistData) => {
    try {
      setChecklistLoading(true);
      const url = `${config.API_BASE_URL}/stages/${stageId}/checklist`;
      const result = await makeRequest(url, {
        method: "POST",
        body: JSON.stringify(checklistData),
      });
      
      if (result?.success) {
        return result;
      }
      throw new Error(result?.msg || "Errore nel salvataggio dell'elemento");
    } catch (error) {
      console.error("Error saving checklist item:", error);
      toast({
        title: "Errore",
        description: "Errore nel salvataggio dell'elemento checklist",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setChecklistLoading(false);
    }
  }, [makeRequest]);

  // Aggiorna stato checklist
  const updateChecklistItemStatus = useCallback(async (checklistId, isChecked, checkNotes = null) => {
    try {
      const url = `${config.API_BASE_URL}/checklist/${checklistId}`;
      const result = await makeRequest(url, {
        method: "PATCH",
        body: JSON.stringify({ isChecked, checkNotes }),
      });
      
      if (result?.success) {
        return result;
      }
      throw new Error(result?.msg || "Errore nell'aggiornamento");
    } catch (error) {
      console.error("Error updating checklist item:", error);
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento dell'elemento",
        variant: "destructive",
      });
      return { success: false };
    }
  }, [makeRequest]);

  // Approva/Rifiuta Gate
  const manageGate = useCallback(async (stageId, action, notes = null) => {
    try {
      setLoading(true);
      const url = `${config.API_BASE_URL}/stages/${stageId}/gate`;
      const result = await makeRequest(url, {
        method: "POST",
        body: JSON.stringify({ action, notes }),
      });
      
      if (result?.success) {
        toast({
          title: "Successo",
          description: result.msg || `Gate ${action.toLowerCase()} con successo`,
          variant: "success",
        });
        return result;
      }
      throw new Error(result?.msg || "Errore nella gestione del gate");
    } catch (error) {
      console.error("Error managing gate:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore nella gestione del gate",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  // Template stages
  const fetchTemplateStages = useCallback(async (templateId) => {
    try {
      const url = `${config.API_BASE_URL}/templates/${templateId}/stages`;
      const data = await makeRequest(url);
      return data || [];
    } catch (error) {
      console.error("Error fetching template stages:", error);
      return [];
    }
  }, [makeRequest]);

  const addUpdateTemplateStage = useCallback(async (templateId, stageData) => {
    try {
      const url = `${config.API_BASE_URL}/templates/${templateId}/stages`;
      const result = await makeRequest(url, {
        method: "POST",
        body: JSON.stringify(stageData),
      });
      
      if (result?.success) {
        toast({
          title: "Successo",
          description: "Stage template salvato con successo",
          variant: "success",
        });
        return result;
      }
      throw new Error(result?.msg || "Errore nel salvataggio");
    } catch (error) {
      console.error("Error saving template stage:", error);
      toast({
        title: "Errore",
        description: "Errore nel salvataggio dello stage template",
        variant: "destructive",
      });
      return { success: false };
    }
  }, [makeRequest]);

  // Utility functions
  const canApproveGate = useCallback((stage) => {
    if (!stage.IsGateRequired) return true;
    
    const requiredItems = stage.ChecklistItems?.filter(item => item.IsRequired) || [];
    const checkedRequiredItems = requiredItems.filter(item => item.IsChecked);
    
    return requiredItems.length === checkedRequiredItems.length;
  }, []);

  const getStageProgress = useCallback((stage) => {
    if (!stage.Tasks || stage.Tasks.length === 0) return 0;
    
    const completedTasks = stage.Tasks.filter(task => task.Status === 'COMPLETATA').length;
    return Math.round((completedTasks / stage.Tasks.length) * 100);
  }, []);

  const getChecklistProgress = useCallback((stage) => {
    if (!stage.ChecklistItems || stage.ChecklistItems.length === 0) return 100;
    
    const checkedItems = stage.ChecklistItems.filter(item => item.IsChecked).length;
    return Math.round((checkedItems / stage.ChecklistItems.length) * 100);
  }, []);

  return {
    stages,
    unassignedTasks,
    loading,
    checklistLoading,
    fetchProjectStages,
    addUpdateStage,
    deleteStage,
    reorderStages,
    assignTaskToStage,
    addUpdateChecklistItem,
    updateChecklistItemStatus,
    manageGate,
    fetchTemplateStages,
    addUpdateTemplateStage,
    canApproveGate,
    getStageProgress,
    getChecklistProgress,
    setStages,
    setUnassignedTasks,
  };
};

export default useProjectStages;