import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { Gantt, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { swal } from "../../../lib/common";
import {
  Search,
  Filter,
  AlertTriangle,
  Calendar,
  ArrowUp,
  X,
  ArrowDown,
  GitBranch,
  Link2,
  Loader2,
  GripVertical,
  Lock,
  ChevronDown,
  ChevronRight,
  Layers,
  CheckCircle2,
  Clock,
  Pause,
  XCircle,
  Circle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Costante per l'altezza delle righe
const ROW_HEIGHT = 90;

// Funzione di debounce per limitare chiamate ripetute
const debounce = (func, wait) => {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
};

/**
 * ProjectStagesGantt - Vista Gantt organizzata per fasi
 */
const ProjectStagesGantt = ({
  project,
  stages = [],
  unassignedTasks = [],
  onTaskClick,
  onTaskUpdate,
  checkAdminPermission,
  isOwnTask,
  refreshProject,
  users = [],
  calculateProjectDates,
}) => {
  // Usa tutte le task del progetto se disponibili
  const tasks = project?.tasks || [];
  // Refs per mantenere lo stato tra aggiornamenti
  const isTaskUpdating = useRef(false);
  const ganttContainerRef = useRef(null);
  const ganttWrapperRef = useRef(null);

  // Stato per loading overlay
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [optimisticTasks, setOptimisticTasks] = useState([]);

  // Stato per espansione/compressione stages con un key unico per forzare il re-render
  const [ganttKey, setGanttKey] = useState(0);
  const [expandedStages, setExpandedStages] = useState(() => {
    const saved = sessionStorage.getItem(`gantt-expandedStages-${project.ProjectID}`);
    const initialExpanded = saved ? JSON.parse(saved) : stages.map(s => s.StageID);
    
    // Aggiungi 'unassigned' se ci sono task non assegnate
    const hasUnassignedTasks = unassignedTasks && unassignedTasks.length > 0;
    if (hasUnassignedTasks && !initialExpanded.includes('unassigned')) {
      initialExpanded.push('unassigned');
    }
    
    return initialExpanded;
  });

  // Preservare lo stato attuale
  const [viewMode, setViewMode] = useState(() => {
    const saved = sessionStorage.getItem(`gantt-stages-viewMode-${project.ProjectID}`);
    return saved ? ViewMode[saved] : ViewMode.Week;
  });
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showDependencies, setShowDependencies] = useState(true);
  const [customZoomLevel, setCustomZoomLevel] = useState(1);

  // Stato per i filtri
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    assignedTo: null,
    search: "",
    showDelayed: false,
    stage: "all",
  });

  // Determina se l'utente è in modalità read-only
  const isReadOnly = useMemo(() => {
    const hasEditPermission = checkAdminPermission(project) || 
      tasks.some(task => isOwnTask(task));
    return !hasEditPermission;
  }, [checkAdminPermission, isOwnTask, project, tasks]);

  // Salva stato espansione quando cambia
  useEffect(() => {
    if (project?.ProjectID) {
      sessionStorage.setItem(
        `gantt-stages-expandedStages-${project.ProjectID}`, 
        JSON.stringify(expandedStages)
      );
    }
  }, [expandedStages, project?.ProjectID]);

  // Salva il viewMode quando cambia
  useEffect(() => {
    if (project?.ProjectID) {
      sessionStorage.setItem(
        `gantt-stages-viewMode-${project.ProjectID}`, 
        Object.keys(ViewMode).find(key => ViewMode[key] === viewMode)
      );
    }
  }, [viewMode, project?.ProjectID]);

  // Espandi automaticamente lo stage selezionato nel filtro
  useEffect(() => {
    if (filters.stage !== "all" && stages && stages.length > 0) {
      const selectedStageId = filters.stage === "unassigned" ? "unassigned" : parseInt(filters.stage);
      if (!expandedStages.includes(selectedStageId)) {
        // Se c'è un filtro per stage specifico, espandi solo quello e comprimi gli altri
        setExpandedStages([selectedStageId]);
        setGanttKey(prev => prev + 1); // Forza re-render
      }
    } else if (filters.stage === "all" && stages && stages.length > 0) {
      // Se il filtro è "tutte le fasi", ripristina l'espansione precedente o espandi tutto
      const savedExpanded = sessionStorage.getItem(`gantt-stages-expandedStages-${project?.ProjectID}`);
      if (savedExpanded) {
        try {
          const parsed = JSON.parse(savedExpanded);
          if (Array.isArray(parsed)) {
            setExpandedStages(parsed);
            setGanttKey(prev => prev + 1); // Forza re-render
          }
        } catch (e) {
          console.error('[ProjectStagesGantt] Error parsing saved expanded stages:', e);
          const allStages = stages.map(s => s.StageID);
          if (unassignedTasks && unassignedTasks.length > 0) {
            allStages.push('unassigned');
          }
          setExpandedStages(allStages);
          setGanttKey(prev => prev + 1); // Forza re-render
        }
      } else {
        const allStages = stages.map(s => s.StageID);
        if (unassignedTasks && unassignedTasks.length > 0) {
          allStages.push('unassigned');
        }
        setExpandedStages(allStages);
        setGanttKey(prev => prev + 1); // Forza re-render
      }
    }
  }, [filters.stage, stages, project?.ProjectID, unassignedTasks]);

  // Gestione del custom zoom con Ctrl + rotella del mouse
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey && ganttWrapperRef.current?.contains(e.target)) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setCustomZoomLevel(prev => {
          const newZoom = Math.max(0.5, Math.min(2, prev + delta));
          return newZoom;
        });
      }
    };

    const wrapper = ganttWrapperRef.current;
    if (wrapper) {
      wrapper.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (wrapper) {
        wrapper.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  // Toggle espansione stage - VERSIONE CORRETTA
  const toggleStageExpansion = useCallback((stageId) => {
    setExpandedStages(prev => {
      const newExpanded = prev.includes(stageId)
        ? prev.filter(id => id !== stageId)
        : [...prev, stageId];
      
      // Forza il re-render del Gantt cambiando la key
      setTimeout(() => {
        setGanttKey(prevKey => prevKey + 1);
      }, 0);
      
      return newExpanded;
    });
  }, []);

  // Funzioni helper per espandere/comprimere tutto
  const expandAllStages = useCallback(() => {
    const allStageIds = stages.map(s => s.StageID);
    if (unassignedTasks && unassignedTasks.length > 0) {
      allStageIds.unshift('unassigned');
    }
    setExpandedStages(allStageIds);
    setGanttKey(prev => prev + 1); // Forza re-render
  }, [stages, unassignedTasks]);

  const collapseAllStages = useCallback(() => {
    setExpandedStages([]);
    setGanttKey(prev => prev + 1); // Forza re-render
  }, []);

  // Parsing delle dipendenze
  const parseDependencies = (dependenciesData) => {
    if (!dependenciesData) return [];
    
    try {
      if (typeof dependenciesData === 'string') {
        return JSON.parse(dependenciesData);
      }
      return Array.isArray(dependenciesData) ? dependenciesData : [];
    } catch (e) {
      console.error('Error parsing dependencies:', e);
      return [];
    }
  };

  // Usa optimisticTasks se sono disponibili, altrimenti usa tasks normali
  const displayTasks = useMemo(() => {
    // Se abbiamo optimisticTasks, usali
    if (optimisticTasks.length > 0) {
      return optimisticTasks;
    }
    
    // Altrimenti, combina task da stages e unassignedTasks come fa ProjectStagesTable
    const allTasks = [];
    
    // Aggiungi task non assegnate
    if (unassignedTasks && unassignedTasks.length > 0) {
      unassignedTasks.forEach(task => {
        allTasks.push({ ...task, StageID: null, StageName: "Non assegnate" });
      });
    }
    
    // Aggiungi task dalle fasi
    if (stages && stages.length > 0) {
      stages.forEach(stage => {
        (stage.Tasks || []).forEach(task => {
          allTasks.push({ 
            ...task, 
            StageID: stage.StageID, 
            StageName: stage.StageName,
            StageColor: stage.HexColor 
          });
        });
      });
    }
    
    // Se non ci sono stages o unassignedTasks, ma ci sono task nel progetto, 
    // trattale come task non assegnate
    if (allTasks.length === 0 && tasks.length > 0) {
      tasks.forEach(task => {
        allTasks.push({ 
          ...task, 
          StageID: null, 
          StageName: "Non assegnate" 
        });
      });
    }
    
    return allTasks;
  }, [optimisticTasks, stages, unassignedTasks, tasks]);

  // Funzione per creare date sicure
  const createSafeDate = (dateInput) => {
    if (!dateInput) {
      return new Date();
    }
    
    // Se è già un oggetto Date, controlla se è valido
    if (dateInput instanceof Date) {
      if (isNaN(dateInput.getTime())) {
        return new Date();
      }
      return dateInput;
    }
    
    // Se è una stringa, prova a convertirla
    if (typeof dateInput === 'string') {
      try {
        const date = new Date(dateInput);
        
        if (isNaN(date.getTime())) {
          return new Date();
        }
        
        return date;
      } catch (e) {
        return new Date();
      }
    }
    
    // Per altri tipi, prova a convertire
    try {
      const date = new Date(dateInput);
      
      if (isNaN(date.getTime())) {
        return new Date();
      }
      
      return date;
    } catch (e) {
      return new Date();
    }
  };

  // Funzione per validare e creare date sicure per le task
  const validateTaskDates = (task) => {
    let startDate, dueDate;
    
    // Se StartDate è mancante ma DueDate è presente, usa DueDate come riferimento
    if (!task.StartDate && task.DueDate) {
      dueDate = createSafeDate(task.DueDate);
      // Imposta StartDate a 1 giorno prima di DueDate
      startDate = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
    }
    // Se DueDate è mancante ma StartDate è presente, usa StartDate come riferimento
    else if (task.StartDate && !task.DueDate) {
      startDate = createSafeDate(task.StartDate);
      // Imposta DueDate a 1 giorno dopo StartDate
      dueDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    }
    // Se entrambe sono mancanti, usa date di default
    else if (!task.StartDate && !task.DueDate) {
      const today = new Date();
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      dueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    }
    // Se entrambe sono presenti, valida che DueDate sia dopo StartDate
    else {
      startDate = createSafeDate(task.StartDate);
      dueDate = createSafeDate(task.DueDate);
      
      if (dueDate < startDate) {
        console.warn(`[ProjectStagesGantt] Task ${task.TaskID} has due date before start date, adjusting`);
        dueDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // +1 giorno
      }
    }
    
    return {
      ...task,
      StartDate: startDate,
      DueDate: dueDate
    };
  };

  // Costruisce le dipendenze per gantt-task-react
  const buildDependencies = useCallback((task) => {
    const predecessors = parseDependencies(task.Predecessors);
    if (!predecessors || predecessors.length === 0) return [];
    
    return predecessors
      .filter(dep => dep.dependencyType === 'FS')
      .map(dep => dep.taskId.toString());
  }, []);

  // Preparazione dei dati per la vista Gantt
  const prepareGanttData = useMemo(() => {
    const ganttTasks = [];
    const tasksList = [];
    
    // Se non ci sono stages, raggruppa tutto sotto uno stage generico
    const stagesData = stages && stages.length > 0 
      ? [...stages].sort((a, b) => a.Sequence - b.Sequence)
      : [{
          StageID: 0,
          StageName: "Attività",
          Sequence: 0
        }];
    
    // Aggiungi sezione per task non assegnate se ce ne sono
    const unassignedTasksData = displayTasks.filter(task => task.StageID === null);
    if (unassignedTasksData.length > 0) {
      stagesData.unshift({
        StageID: 'unassigned',
        StageName: "Non assegnate",
        Sequence: -1
      });
    }
    
    // Se non ci sono stages definiti e ci sono task, mostra tutte le task senza organizzazione per stages
    if ((!stages || stages.length === 0) && displayTasks.length > 0) {
      // Applica filtri alle task
      let filteredTasks = displayTasks;
      
      if (filters.status !== "all") {
        filteredTasks = filteredTasks.filter(task => task.Status === filters.status);
      }
      if (filters.priority !== "all") {
        filteredTasks = filteredTasks.filter(task => task.Priority === filters.priority);
      }
      if (filters.assignedTo) {
        filteredTasks = filteredTasks.filter(task => task.AssignedTo === filters.assignedTo);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredTasks = filteredTasks.filter(task =>
          task.Title?.toLowerCase().includes(searchLower) ||
          task.Description?.toLowerCase().includes(searchLower)
        );
      }
      if (filters.showDelayed) {
        filteredTasks = filteredTasks.filter(task => {
          const validatedTask = validateTaskDates(task);
          return validatedTask.DueDate < new Date() && task.Status !== "COMPLETATA";
        });
      }
      
      // Valida le date delle task
      const validatedTasks = filteredTasks.map(validateTaskDates);
      
      // Aggiungi tutte le task direttamente
      validatedTasks.forEach((task) => {
        const predecessors = parseDependencies(task.Predecessors);
        
        const taskGanttItem = {
          id: task.TaskID.toString(),
          name: task.Title,
          start: task.StartDate,
          end: task.DueDate,
          progress:
            task.Status === "COMPLETATA" ? 100 :
            task.Status === "IN ESECUZIONE" ? 50 :
            task.Status === "BLOCCATA" ? 0 :
            task.Status === "SOSPESA" ? 25 : 10,
          type: "task",
          dependencies: buildDependencies(task),
          hideChildren: false,
          displayOrder: ganttTasks.length + 1,
          isDisabled: isReadOnly || (!checkAdminPermission(project) && !isOwnTask(task)),
          originalTask: task,
          status: task.Status,
          priority: task.Priority,
          isDelayed: task.DueDate < new Date() && task.Status !== "COMPLETATA",
          assignedToName: task.AssignedToName,
          predecessorsData: predecessors,
          styles: {
            backgroundColor:
              task.Status === "COMPLETATA" ? "#10b981" :
              task.Status === "IN ESECUZIONE" ? "#3b82f6" :
              task.Status === "BLOCCATA" ? "#ef4444" :
              task.Status === "SOSPESA" ? "#f59e0b" : "#94a3b8",
            progressColor:
              task.Status === "COMPLETATA" ? "#10b981" :
              task.Status === "IN ESECUZIONE" ? "#3b82f6" :
              task.Status === "BLOCCATA" ? "#ef4444" :
              task.Status === "SOSPESA" ? "#f59e0b" : "#94a3b8",
            progressSelectedColor:
              task.Status === "COMPLETATA" ? "#10b981" :
              task.Status === "IN ESECUZIONE" ? "#3b82f6" :
              task.Status === "BLOCCATA" ? "#ef4444" :
              task.Status === "SOSPESA" ? "#f59e0b" : "#94a3b8",
          },
        };
        
        ganttTasks.push(taskGanttItem);
        tasksList.push({
          type: 'task',
          data: task,
          stage: null
        });
      });
      
      return { ganttTasks, tasksList };
    }
    
    // Processa ogni stage
    stagesData.forEach((stage) => {
      const stageIsExpanded = expandedStages.includes(stage.StageID);
      
      // Filtra task per stage
      let stageTasks = stages && stages.length > 0
        ? displayTasks.filter(task => {
            if (stage.StageID === 'unassigned') {
              return task.StageID === null;
            }
            return task.StageID === stage.StageID;
          })
        : displayTasks;
      
      // Applica filtri
      if (filters.stage !== "all") {
        if (filters.stage === "unassigned") {
          stageTasks = stageTasks.filter(task => task.StageID === null);
        } else {
          stageTasks = stageTasks.filter(task => task.StageID === parseInt(filters.stage));
        }
      }
      if (filters.status !== "all") {
        stageTasks = stageTasks.filter(task => task.Status === filters.status);
      }
      if (filters.priority !== "all") {
        stageTasks = stageTasks.filter(task => task.Priority === filters.priority);
      }
      if (filters.assignedTo) {
        stageTasks = stageTasks.filter(task => task.AssignedTo === filters.assignedTo);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        stageTasks = stageTasks.filter(task =>
          task.Title?.toLowerCase().includes(searchLower) ||
          task.Description?.toLowerCase().includes(searchLower)
        );
      }
      if (filters.showDelayed) {
        stageTasks = stageTasks.filter(task => {
          const validatedTask = validateTaskDates(task);
          return validatedTask.DueDate < new Date() && task.Status !== "COMPLETATA";
        });
      }
      
      // Ordina task per sequenza
      stageTasks.sort((a, b) => a.TaskSequence - b.TaskSequence);
      
      // Valida le date delle task
      const validatedStageTasks = stageTasks.map(validateTaskDates);
      
      // Calcola date stage in modo sicuro
      let stageStartDate, stageEndDate;
      
      if (validatedStageTasks.length > 0) {
        const startDates = validatedStageTasks.map(t => t.StartDate.getTime());
        const endDates = validatedStageTasks.map(t => t.DueDate.getTime());
        
        stageStartDate = new Date(Math.min(...startDates));
        stageEndDate = new Date(Math.max(...endDates));
      } else {
        // Se non ci sono task, usa date di default
        const today = new Date();
        stageStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        stageEndDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
      }
      
      // Calcola progresso stage
      const completedTasks = validatedStageTasks.filter(t => t.Status === "COMPLETATA").length;
      const stageProgress = validatedStageTasks.length > 0 
        ? Math.round((completedTasks / validatedStageTasks.length) * 100)
        : 0;
      
      // Determina se mostrare lo stage
      const hasActiveFilters = filters.status !== "all" || 
                              filters.priority !== "all" || 
                              filters.assignedTo || 
                              filters.search || 
                              filters.showDelayed ||
                              filters.stage !== "all";
      
      const shouldShowStage = !hasActiveFilters || stageTasks.length > 0;
      
      // Aggiungi stage come project type solo se ci sono stages definiti e se deve essere mostrato
      if (stages && stages.length > 0 && shouldShowStage) {
        const stageGanttItem = {
          id: `stage-${stage.StageID}`,
          name: stage.StageName,
          start: stageStartDate,
          end: stageEndDate,
          progress: stageProgress,
          type: "project",
          hideChildren: !stageIsExpanded,
          displayOrder: ganttTasks.length + 1,
          isDisabled: true,
          styles: {
            backgroundColor: stage.StageID === 'unassigned' ? "#f59e0b" :
                            stageProgress === 100 ? "#10b981" : 
                            stageProgress > 0 ? "#3b82f6" : "#94a3b8",
            progressColor: "#ffffff",
            progressSelectedColor: "#ffffff",
          },
        };
        
        ganttTasks.push(stageGanttItem);
        tasksList.push({
          type: 'stage',
          data: {
            ...stage,
            name: stage.StageName,
            tasks: stageTasks,
            startDate: stageStartDate,
            endDate: stageEndDate,
            isExpanded: stageIsExpanded,
          }
        });
        
        // Aggiungi task solo se lo stage è espanso
        if (stageIsExpanded && validatedStageTasks.length > 0) {
          validatedStageTasks.forEach((task) => {
            const predecessors = parseDependencies(task.Predecessors);
            
            const taskGanttItem = {
              id: task.TaskID.toString(),
              name: task.Title,
              start: task.StartDate,
              end: task.DueDate,
              progress:
                task.Status === "COMPLETATA" ? 100 :
                task.Status === "IN ESECUZIONE" ? 50 :
                task.Status === "BLOCCATA" ? 0 :
                task.Status === "SOSPESA" ? 25 : 10,
              type: "task",
              project: `stage-${stage.StageID}`,
              dependencies: buildDependencies(task),
              hideChildren: false,
              displayOrder: ganttTasks.length + 1,
              isDisabled: isReadOnly || (!checkAdminPermission(project) && !isOwnTask(task)),
              originalTask: task,
              status: task.Status,
              priority: task.Priority,
              isDelayed: task.DueDate < new Date() && task.Status !== "COMPLETATA",
              assignedToName: task.AssignedToName,
              predecessorsData: predecessors,
              styles: {
                backgroundColor:
                  task.Status === "COMPLETATA" ? "#10b981" :
                  task.Status === "IN ESECUZIONE" ? "#3b82f6" :
                  task.Status === "BLOCCATA" ? "#ef4444" :
                  task.Status === "SOSPESA" ? "#f59e0b" : "#94a3b8",
                progressColor:
                  task.Status === "COMPLETATA" ? "#10b981" :
                  task.Status === "IN ESECUZIONE" ? "#3b82f6" :
                  task.Status === "BLOCCATA" ? "#ef4444" :
                  task.Status === "SOSPESA" ? "#f59e0b" : "#94a3b8",
                progressSelectedColor:
                  task.Status === "COMPLETATA" ? "#10b981" :
                  task.Status === "IN ESECUZIONE" ? "#3b82f6" :
                  task.Status === "BLOCCATA" ? "#ef4444" :
                  task.Status === "SOSPESA" ? "#f59e0b" : "#94a3b8",
              },
            };
            
            ganttTasks.push(taskGanttItem);
            tasksList.push({
              type: 'task',
              data: task,
              stage: stage
            });
          });
        }
      }
    });
    
    return { ganttTasks, tasksList };
  }, [stages, displayTasks, expandedStages, filters, buildDependencies, checkAdminPermission, isOwnTask, project, isReadOnly, validateTaskDates]);

  // Handler per aggiornamento delle date tramite drag
  const handleTaskChange = async (task) => {
    if (isReadOnly || task.type === "project") return;

    const originalTask = displayTasks.find((t) => t.TaskID.toString() === task.id);
    if (!originalTask) return;

    if (!checkAdminPermission(project) && !isOwnTask(originalTask)) {
      swal.fire(
        "Attenzione",
        "Non hai i permessi per modificare questa attività",
        "warning"
      );
      return;
    }

    if (originalTask.Status === "COMPLETATA") {
      swal.fire(
        "Attenzione",
        "Non puoi modificare un'attività completata",
        "warning"
      );
      return;
    }

    const confirmation = await swal.fire({
      title: "Conferma modifica",
      text: "Vuoi modificare le date di questa attività?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sì, modifica",
      cancelButtonText: "Annulla",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    const updatedTask = {
      ...originalTask,
      StartDate: task.start,
      DueDate: task.end
    };

    // Valida le date prima di inviare
    const validatedUpdatedTask = validateTaskDates(updatedTask);

    setOptimisticTasks(prev => 
      prev.length > 0 
        ? prev.map(t => t.TaskID === originalTask.TaskID ? validatedUpdatedTask : t)
        : displayTasks.map(t => t.TaskID === originalTask.TaskID ? validatedUpdatedTask : t)
    );

    setIsLoading(true);
    setLoadingMessage("Aggiornamento date attività...");

    try {
      const result = await onTaskUpdate(validatedUpdatedTask);

      if (result && result.success) {
        await refreshProject(() => {
          setOptimisticTasks([]);
          setIsLoading(false);
        });
      } else {
        setOptimisticTasks([]);
        setIsLoading(false);
      }
    } catch (error) {
      setOptimisticTasks([]);
      setIsLoading(false);
      console.error("Error updating task:", error);
    }
  };

  // Gestisce il doppio click per aprire i dettagli
  const handleDoubleClick = (task) => {
    if (task.type === "project") return;
    
    const originalTask = displayTasks.find((t) => t.TaskID.toString() === task.id);
    if (originalTask) {
      onTaskClick(originalTask);
    }
  };

  // Funzione per resettare i filtri
  const resetFilters = () => {
    setFilters({
      status: "all",
      priority: "all",
      assignedTo: null,
      search: "",
      showDelayed: false,
      stage: "all",
    });
  };

  // Calcola quanti filtri sono attivi
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.status !== "all") count++;
    if (filters.priority !== "all") count++;
    if (filters.assignedTo) count++;
    if (filters.search) count++;
    if (filters.showDelayed) count++;
    if (filters.stage !== "all") count++;
    return count;
  }, [filters]);

  // Opzioni per i filtri
  const statusOptions = [
    { label: "Tutti gli stati", value: "all" },
    { label: "Da fare", value: "DA FARE" },
    { label: "In esecuzione", value: "IN ESECUZIONE" },
    { label: "Completate", value: "COMPLETATA" },
    { label: "Bloccate", value: "BLOCCATA" },
    { label: "Sospese", value: "SOSPESA" },
  ];

  const priorityOptions = [
    { label: "Tutte le priorità", value: "all" },
    { label: "Alta", value: "ALTA" },
    { label: "Media", value: "MEDIA" },
    { label: "Bassa", value: "BASSA" },
  ];

  // Formatta informazioni dipendenze
  const formatDependencyInfo = (predecessors) => {
    if (!predecessors || predecessors.length === 0) return null;
    
    return predecessors.map((dep, idx) => {
      const predTask = displayTasks.find(t => t.TaskID === dep.taskId);
      if (!predTask) return null;
      
      const typeLabel = {
        'FS': 'Fine-Inizio',
        'FF': 'Fine-Fine',
        'SS': 'Inizio-Inizio',
        'SF': 'Inizio-Fine'
      }[dep.dependencyType] || dep.dependencyType;
      
      return (
        <div key={idx} className="text-xs">
          <span className="font-medium">{predTask.Title}</span>
          <span className="text-gray-500 ml-1">({typeLabel})</span>
          {dep.lagDays !== 0 && (
            <span className="text-gray-500 ml-1">
              {dep.lagDays > 0 ? `+${dep.lagDays}` : dep.lagDays}g
            </span>
          )}
        </div>
      );
    }).filter(Boolean);
  };

  const { ganttTasks, tasksList } = prepareGanttData;

  if (!tasks || tasks.length === 0) {
    return (
      <Card className="border rounded-lg bg-white h-full">
        <CardContent className="p-6 text-center h-full flex items-center justify-center">
          <div className="text-gray-500">
            Nessuna attività presente nel progetto
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ height: 'calc(100vh - 110px - 60px - 48px - 40px - 40px)' }}>
      <Card className="border rounded-lg bg-white relative flex-1 flex flex-col">
        {/* Loading Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg"
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-gray-700">{loadingMessage || "Caricamento..."}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Controls */}
        <div className="border-b flex-none">
          <div className="flex flex-wrap items-center justify-between gap-2 p-2">
            <div className="flex items-center space-x-4">
              <Button
                variant={viewMode === ViewMode.Day ? "default" : "outline"}
                onClick={() => setViewMode(ViewMode.Day)}
                className="flex-shrink-0"
                disabled={isLoading}
              >
                Giorno
              </Button>
              <Button
                variant={viewMode === ViewMode.Week ? "default" : "outline"}
                onClick={() => setViewMode(ViewMode.Week)}
                className="flex-shrink-0"
                disabled={isLoading}
              >
                Settimana
              </Button>
              <Button
                variant={viewMode === ViewMode.Month ? "default" : "outline"}
                onClick={() => setViewMode(ViewMode.Month)}
                className="flex-shrink-0"
                disabled={isLoading}
              >
                Mese
              </Button>
              
              <div className="border-l pl-4">
                <Button
                  variant={showDependencies ? "default" : "outline"}
                  onClick={() => setShowDependencies(!showDependencies)}
                  className="flex-shrink-0"
                  size="sm"
                  disabled={isLoading}
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Dipendenze
                </Button>
              </div>

              {stages && stages.length > 0 && (
                <div className="border-l pl-4 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={expandAllStages}
                    className="flex-shrink-0"
                    size="sm"
                    disabled={isLoading}
                  >
                    Espandi tutto
                  </Button>
                  <Button
                    variant="outline"
                    onClick={collapseAllStages}
                    className="flex-shrink-0"
                    size="sm"
                    disabled={isLoading}
                  >
                    Comprimi tutto
                  </Button>
                </div>
              )}

              {isReadOnly && (
                <div className="border-l pl-4">
                  <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300">
                    <Lock className="h-3 w-3 mr-1" />
                    Sola lettura
                  </Badge>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 p-2">
              {stages && stages.length > 0 && (
                <Select
                  value={filters.stage}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, stage: value }))
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-8 w-[140px]">
                    <SelectValue placeholder="Fase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le fasi</SelectItem>
                    {unassignedTasks && unassignedTasks.length > 0 && (
                      <SelectItem value="unassigned">Non assegnate</SelectItem>
                    )}
                    {stages.map((stage) => (
                      <SelectItem key={stage.StageID} value={stage.StageID.toString()}>
                        {stage.StageName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
                disabled={isLoading}
              >
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.priority}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, priority: value }))
                }
                disabled={isLoading}
              >
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue placeholder="Priorità" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.assignedTo?.toString() || "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    assignedTo: value === "all" ? null : parseInt(value),
                  }))
                }
                disabled={isLoading}
              >
                <SelectTrigger className="h-8 w-[150px]">
                  <SelectValue placeholder="Assegnato a" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli utenti</SelectItem>
                  {users
                    .filter((user) =>
                      displayTasks.some((task) => task.AssignedTo === user.userId),
                    )
                    .map((user) => (
                      <SelectItem
                        key={user.userId}
                        value={user.userId.toString()}
                      >
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Input
                  placeholder="Cerca..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="h-8 w-[150px] pl-8 pr-2"
                  disabled={isLoading}
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={resetFilters}
                className="h-8 w-8"
                title="Resetta filtri"
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>

              {activeFiltersCount > 0 && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">
                  {activeFiltersCount} filtro{activeFiltersCount > 1 ? 'i' : ''} attivo{activeFiltersCount > 1 ? 'i' : ''}
                </Badge>
              )}

              <Button
                size="icon"
                variant={filters.showDelayed ? "default" : "outline"}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    showDelayed: !prev.showDelayed,
                  }))
                }
                className={`h-8 w-8 ${
                  filters.showDelayed ? "bg-amber-600 hover:bg-amber-700" : ""
                }`}
                title="Mostra attività in ritardo"
                disabled={isLoading}
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>

              {filters.showDelayed && (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-200"
                >
                  Solo attività in ritardo
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Leggenda colori */}
          <div className="p-2 border-b flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-gray-50 text-xs text-gray-600 flex-none">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {stages && stages.length > 0 && (
                <>
                  <div className="flex items-center gap-1">
                    <Layers className="h-3 w-3 text-indigo-600" />
                    <span>Fase</span>
                  </div>
                  <div className="border-l pl-4 flex items-center gap-1">
                    <span className="inline-block w-3 h-3 bg-gray-400 rounded-sm"></span>
                    <span>Da fare</span>
                  </div>
                </>
              )}
              {(!stages || stages.length === 0) && (
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 bg-gray-400 rounded-sm"></span>
                  <span>Da fare</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded-sm"></span>
                <span>In esecuzione</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-green-500 rounded-sm"></span>
                <span>Completata</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-red-500 rounded-sm"></span>
                <span>Bloccata</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-yellow-500 rounded-sm"></span>
                <span>Sospesa</span>
              </div>
              <div className="border-l pl-4 flex items-center gap-1">
                <GitBranch className="h-3 w-3 text-gray-600" />
                <span>Linee = Dipendenze</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Ctrl + Rotella per zoom</span>
              {customZoomLevel !== 1 && (
                <Badge variant="outline" className="text-xs">
                  Zoom: {Math.round(customZoomLevel * 100)}%
                </Badge>
              )}
            </div>
          </div>

          {/* Gantt Chart Container */}
          <div 
            ref={ganttWrapperRef}
            className="flex-1 relative overflow-hidden bg-gray-50"
            style={{
              minHeight: 0,
            }}
          >
            <div 
              className="gantt-container absolute inset-0 overflow-auto"
              style={{
                transform: `scale(${customZoomLevel})`,
                transformOrigin: 'top left',
                width: `${100 / customZoomLevel}%`,
                height: `${100 / customZoomLevel}%`,
                opacity: isLoading ? 0.5 : 1,
                transition: "opacity 0.3s ease",
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {ganttTasks.length > 0 ? (
                <div className="flex-1 flex flex-col" style={{ minHeight: '100%' }} key={ganttKey}>
                  <style>
                    {`
                      /* Forza il Gantt a occupare tutto lo spazio disponibile */
                      .gantt-container-wrapper {
                        height: 100% !important;
                        display: flex !important;
                        flex-direction: column !important;
                      }
                      
                      .gantt-container-wrapper > div {
                        flex: 1 !important;
                        height: 100% !important;
                      }
                      
                      /* Assicura che la griglia si espanda */
                      .gantt-container-wrapper svg {
                        height: 100% !important;
                        min-height: 100% !important;
                      }
                      
                      /* Background per le aree vuote */
                      .gantt-container-wrapper .gantt-grid-row:last-child {
                        height: 100% !important;
                      }
                      
                      /* Stile per il container della lista task */
                      .gantt-task-list-wrapper {
                        height: 100% !important;
                        background: white;
                      }
                      
                      /* Assicura che anche con poche task, il background riempia tutto */
                      .gantt-grid {
                        min-height: 100% !important;
                        background-image: 
                          linear-gradient(to right, #f3f4f6 1px, transparent 1px),
                          linear-gradient(to bottom, #f3f4f6 1px, transparent 1px);
                        background-size: 24px ${ROW_HEIGHT}px;
                      }
                    `}
                  </style>
                  <Gantt
                    id="gantt-container"
                    tasks={ganttTasks}
                    viewMode={viewMode}
                    rowHeight={ROW_HEIGHT}
                    onDateChange={isReadOnly ? undefined : handleTaskChange}
                    onDoubleClick={handleDoubleClick}
                    barCornerRadius={4}
                    barProgressColor={null}
                    barProgressSelectedColor={null}
                    projectProgressColor={null}
                    projectProgressSelectedColor={null}
                    arrow={showDependencies}
                    arrowColor="#6366f1"
                    arrowIndent={20}
                    ganttHeight={0}
                    rootStyle={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    wrapperClassName="gantt-container-wrapper"
                    TooltipContent={({ task }) => {
                      if (task.type === "project") {
                        // Tooltip per stage
                        const stage = stages.find(s => `stage-${s.StageID}` === task.id);
                        const stageTasks = displayTasks.filter(t => t.StageID === stage?.StageID);
                        
                        return (
                          <div className="p-3 bg-white shadow-lg rounded-lg border max-w-sm">
                            <div className="font-bold text-base mb-2 flex items-center gap-2">
                              <Layers className="h-4 w-4 text-indigo-600" />
                              {task.name}
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Progresso:</span>
                                <Badge 
                                  variant="outline"
                                  style={{ 
                                    backgroundColor: `${task.styles.backgroundColor}20`,
                                    borderColor: task.styles.backgroundColor,
                                    color: task.styles.backgroundColor
                                  }}
                                >
                                  {task.progress}%
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Attività:</span>
                                <span className="font-medium">{stageTasks.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Inizio:</span>
                                <span className="font-medium">
                                  {new Date(task.start).toLocaleDateString('it-IT')}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Fine:</span>
                                <span className="font-medium">
                                  {new Date(task.end).toLocaleDateString('it-IT')}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        // Tooltip per task
                        const originalTask = task.originalTask;
                        const status = originalTask.Status;
                        const priority = originalTask.Priority;
                        const assignedTo = originalTask.AssignedToName;
                        const predecessors = task.predecessorsData;

                        return (
                          <div className="p-3 bg-white shadow-lg rounded-lg border max-w-sm">
                            <div className="font-bold text-base mb-2">{task.name}</div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Inizio:</span>
                                <span className="font-medium">
                                  {new Date(task.start).toLocaleDateString('it-IT')}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Fine:</span>
                                <span className="font-medium">
                                  {new Date(task.end).toLocaleDateString('it-IT')}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Stato:</span>
                                <Badge 
                                  variant="outline"
                                  className={
                                    status === "COMPLETATA" ? "bg-green-50 text-green-700 border-green-300" :
                                    status === "IN ESECUZIONE" ? "bg-blue-50 text-blue-700 border-blue-300" :
                                    status === "BLOCCATA" ? "bg-red-50 text-red-700 border-red-300" :
                                    status === "SOSPESA" ? "bg-yellow-50 text-yellow-700 border-yellow-300" :
                                    "bg-gray-50 text-gray-700 border-gray-300"
                                  }
                                >
                                  {status}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Priorità:</span>
                                <Badge 
                                  variant="outline"
                                  className={
                                    priority === "ALTA" ? "bg-red-50 text-red-700 border-red-300" :
                                    priority === "MEDIA" ? "bg-yellow-50 text-yellow-700 border-yellow-300" :
                                    "bg-green-50 text-green-700 border-green-300"
                                  }
                                >
                                  {priority}
                                </Badge>
                              </div>
                              {assignedTo && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Assegnato a:</span>
                                  <span className="font-medium">{assignedTo}</span>
                                </div>
                              )}
                            </div>
                            
                            {predecessors && predecessors.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="text-sm font-medium mb-1 flex items-center gap-1">
                                  <GitBranch className="h-3 w-3" />
                                  Dipendenze:
                                </div>
                                <div className="space-y-1">
                                  {formatDependencyInfo(predecessors)}
                                </div>
                              </div>
                            )}
                            
                            {originalTask.Description && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="text-xs text-gray-600 font-medium mb-1">
                                  Descrizione:
                                </div>
                                <div className="text-sm text-gray-700 max-w-xs overflow-hidden whitespace-pre-wrap">
                                  {originalTask.Description.substring(0, 150)}
                                  {originalTask.Description.length > 150 ? "..." : ""}
                                </div>
                              </div>
                            )}
                            
                            {isReadOnly && (
                              <div className="mt-3 pt-3 border-t text-xs text-gray-500 flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Modalità di sola lettura
                              </div>
                            )}
                          </div>
                        );
                      }
                    }}
                    TaskListTable={({ 
                      rowHeight,
                      rowWidth,
                      tasks: ganttTasksFromLib,
                      fontFamily,
                      fontSize,
                      locale,
                      selectedTaskId,
                      setSelectedTask
                    }) => (
                      <div className="p-2 border-r h-full bg-white">
                        <div className="h-full flex flex-col">
                          <table className="w-full border-spacing-0 border-separate" style={{ fontFamily, fontSize }}>
                            <tbody>
                              {tasksList.map((item, index) => {
                                if (item.type === 'stage') {
                                  const stage = item.data;
                                  const stageProgress = stage.tasks?.length > 0
                                    ? Math.round((stage.tasks.filter(t => t.Status === "COMPLETATA").length / stage.tasks.length) * 100)
                                    : 0;

                                  return (
                                    <tr key={`stage-${stage.StageID}`} style={{ height: `${rowHeight}px` }} className="hover:bg-gray-50">
                                      <td className="p-2 border-b" style={{ height: `${rowHeight}px`, width: rowWidth }}>
                                        <div className="flex h-full items-center">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              toggleStageExpansion(stage.StageID);
                                            }}
                                            className="mr-3 p-2 rounded-md hover:bg-gray-200 transition-colors border border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
                                            title={stage.isExpanded ? "Comprimi fase" : "Espandi fase"}
                                          >
                                            {stage.isExpanded ? (
                                              <ChevronDown className="h-5 w-5 text-gray-600" />
                                            ) : (
                                              <ChevronRight className="h-5 w-5 text-gray-600" />
                                            )}
                                          </button>
                                          
                                          <div className="flex flex-col justify-center flex-1">
                                            <div className="flex items-center">
                                              <Layers className="h-4 w-4 mr-2 text-indigo-600" />
                                              <span className="font-semibold text-sm">{stage.name}</span>
                                              <Badge 
                                                variant="outline" 
                                                className="ml-2 text-xs"
                                                style={{ 
                                                  backgroundColor: `${stageProgress === 100 ? "#10b981" : stageProgress > 0 ? "#3b82f6" : "#94a3b8"}20`,
                                                  borderColor: stageProgress === 100 ? "#10b981" : stageProgress > 0 ? "#3b82f6" : "#94a3b8",
                                                  color: stageProgress === 100 ? "#10b981" : stageProgress > 0 ? "#3b82f6" : "#94a3b8"
                                                }}
                                              >
                                                {stageProgress}%
                                              </Badge>
                                            </div>
                                            
                                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                              <span>{stage.tasks?.length || 0} attività</span>
                                              {stage.startDate && stage.endDate && (
                                                <>
                                                  <span>•</span>
                                                  <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>
                                                      {new Date(stage.startDate).toLocaleDateString('it-IT', { 
                                                        day: '2-digit', 
                                                        month: 'short' 
                                                      })} - {new Date(stage.endDate).toLocaleDateString('it-IT', { 
                                                        day: '2-digit', 
                                                        month: 'short',
                                                        year: 'numeric'
                                                      })}
                                                    </span>
                                                  </div>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                } else if (item.type === 'task') {
                                  const task = item.data;
                                  const isDelayed = new Date(task.DueDate) < new Date() && task.Status !== "COMPLETATA";
                                  const hasDependencies = parseDependencies(task.Predecessors).length > 0;

                                  return (
                                    <tr key={`task-${task.TaskID}`} style={{ height: `${rowHeight}px` }} className="hover:bg-gray-50">
                                      <td className="p-2 border-b pl-12" style={{ height: `${rowHeight}px`, width: rowWidth }}>
                                        <div className="flex h-full items-center">
                                          <div className="flex flex-col justify-center flex-1">
                                            <div className="flex items-center">
                                              <span
                                                className="inline-block w-3 h-3 mr-2 rounded-full"
                                                style={{
                                                  backgroundColor:
                                                    task.Status === "COMPLETATA"
                                                      ? "#10b981"
                                                      : task.Status === "IN ESECUZIONE"
                                                        ? "#3b82f6"
                                                        : task.Status === "BLOCCATA"
                                                          ? "#ef4444"
                                                          : task.Status === "SOSPESA"
                                                            ? "#f59e0b"
                                                            : "#94a3b8",
                                                }}
                                              ></span>
                                              <span 
                                                className="font-medium text-sm truncate max-w-[200px] cursor-pointer"
                                                onClick={() => setSelectedTask(task.TaskID.toString())}
                                              >
                                                {task.Title}
                                              </span>

                                              {hasDependencies && (
                                                <TooltipProvider>
                                                  <Tooltip>
                                                    <TooltipTrigger>
                                                      <GitBranch className="w-3 h-3 ml-2 text-indigo-600" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                      <div className="text-xs">
                                                        {parseDependencies(task.Predecessors).length} dipendenz{parseDependencies(task.Predecessors).length > 1 ? 'e' : 'a'}
                                                      </div>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </TooltipProvider>
                                              )}

                                              {isDelayed && (
                                                <Badge className="ml-2 bg-amber-100 text-amber-700 border-amber-300 text-xs">
                                                  <AlertTriangle className="w-3 h-3" />
                                                </Badge>
                                              )}

                                              {isReadOnly && (
                                                <Lock className="w-3 h-3 ml-2 text-gray-400" />
                                              )}
                                            </div>

                                            {task.AssignedToName && (
                                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                <span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                                  {task.AssignedToName.charAt(0).toUpperCase()}
                                                </span>
                                                <span className="truncate max-w-[140px]">
                                                  {task.AssignedToName}
                                                </span>
                                              </div>
                                            )}

                                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                              <Calendar className="w-3 h-3" />
                                              <span className={isDelayed ? "text-red-500" : ""}>
                                                {new Date(task.StartDate).toLocaleDateString('it-IT', { 
                                                  day: '2-digit', 
                                                  month: 'short' 
                                                })} - {new Date(task.DueDate).toLocaleDateString('it-IT', { 
                                                  day: '2-digit', 
                                                  month: 'short',
                                                  year: 'numeric'
                                                })}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                }
                              })}
                            </tbody>
                          </table>
                          {/* Spacer per riempire lo spazio vuoto quando ci sono poche task */}
                          <div className="flex-1 bg-white border-b"></div>
                        </div>
                      </div>
                    )}
                    barFill={90}
                    handleWidth={8}
                    columnWidth={
                      viewMode === ViewMode.Month
                        ? 300
                        : viewMode === ViewMode.Week
                          ? 170
                          : 60
                    }
                    listCellWidth="100px"
                    todayColor="rgba(252, 165, 165, 0.5)"
                    TaskListHeader={() => (
                      <div className="sticky top-0 z-10 bg-white">
                        <table className="w-full h-full">
                          <thead>
                            <tr>
                              <th className="p-1 border-r">
                                {stages && stages.length > 0 ? "Fasi e Attività" : "Attività"}
                              </th>
                            </tr>
                          </thead>
                        </table>
                      </div>
                    )}
                    timeStep={10000}
                    fontFamily="Inter, system-ui, sans-serif"
                    fontSize="12px"
                    preStepsCount={1}
                    rtl={false}
                    locale="it-IT"
                  />
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  {(() => {
                    const hasActiveFilters = filters.status !== "all" || 
                                           filters.priority !== "all" || 
                                           filters.assignedTo || 
                                           filters.search || 
                                           filters.showDelayed ||
                                           filters.stage !== "all";
                    
                    if (hasActiveFilters) {
                      const selectedStage = filters.stage !== "all" && stages 
                        ? filters.stage === "unassigned" 
                          ? { StageName: "Non assegnate" }
                          : stages.find(s => s.StageID === parseInt(filters.stage))
                        : null;
                      
                      return (
                        <div className="space-y-2">
                          <p>
                            {selectedStage 
                              ? `Nessuna attività nella fase "${selectedStage.StageName}" corrispondente ai filtri selezionati`
                              : "Nessuna attività corrispondente ai filtri selezionati"
                            }
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={resetFilters}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Resetta filtri
                          </Button>
                        </div>
                      );
                    }
                    return "Nessuna attività presente nel progetto";
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Ottimizzazione per evitare re-render inutili
export default React.memo(ProjectStagesGantt, (prevProps, nextProps) => {
  const stagesUnchanged =
    prevProps.stages?.length === nextProps.stages?.length &&
    JSON.stringify(
      prevProps.stages?.map(s => ({
        id: s.StageID,
        seq: s.Sequence,
        name: s.StageName
      })) || []
    ) ===
    JSON.stringify(
      nextProps.stages?.map(s => ({
        id: s.StageID,
        seq: s.Sequence,
        name: s.StageName
      })) || []
    );

  const projectTasksUnchanged =
    prevProps.project?.tasks?.length === nextProps.project?.tasks?.length &&
    JSON.stringify(
      prevProps.project?.tasks?.map(t => ({
        id: t.TaskID,
        seq: t.TaskSequence,
        start: t.StartDate,
        end: t.DueDate,
        status: t.Status,
        stage: t.StageID,
        predecessors: t.Predecessors
      })) || []
    ) ===
    JSON.stringify(
      nextProps.project?.tasks?.map(t => ({
        id: t.TaskID,
        seq: t.TaskSequence,
        start: t.StartDate,
        end: t.DueDate,
        status: t.Status,
        stage: t.StageID,
        predecessors: t.Predecessors
      })) || []
    );

  const projectUnchanged =
    prevProps.project?.ProjectID === nextProps.project?.ProjectID;

  return stagesUnchanged && projectTasksUnchanged && projectUnchanged;
});