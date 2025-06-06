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
  ZoomIn,
  ZoomOut,
  Calendar,
  ArrowUp,
  X,
  ArrowDown,
  MoveVertical,
  GitBranch,
  Link2,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
 * ProjectGanttView - Implementazione Gantt con dipendenze multiple e optimistic updates
 */
const ProjectGanttView = ({
  project,
  tasks = [],
  onTaskClick,
  onTaskUpdate,
  checkAdminPermission,
  isOwnTask,
  updateTaskSequence,
  getProjectById,
  refreshProject,
  users = [],
  manageTaskDependencies,
  checkCircularDependencies,
  calculateProjectDates,
}) => {
  // Contatori di debug
  const renderCount = useRef(0);
  const clickCount = useRef(0);

  // Refs per mantenere lo stato tra aggiornamenti
  const isTaskUpdating = useRef(false);
  const ganttContainerRef = useRef(null);
  const moveInProgress = useRef(false);
  const clickHandledRef = useRef(false);

  // Stato per loading overlay
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [optimisticTasks, setOptimisticTasks] = useState([]);

  // Preservare lo stato attuale
  const [viewMode, setViewMode] = useState(() => {
    // Recupera il viewMode salvato o usa Week come default
    const saved = sessionStorage.getItem(`gantt-viewMode-${project.ProjectID}`);
    return saved ? ViewMode[saved] : ViewMode.Week;
  });
  const [scrollPosition, setScrollPosition] = useState(0);
  const [visibleTimeStart, setVisibleTimeStart] = useState(null);
  const [visibleTimeEnd, setVisibleTimeEnd] = useState(null);
  const [showDependencies, setShowDependencies] = useState(true);

  // Stato per i filtri
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    assignedTo: null,
    search: "",
    showDelayed: false,
  });

  // Salva il viewMode quando cambia
  useEffect(() => {
    if (project?.ProjectID) {
      sessionStorage.setItem(`gantt-viewMode-${project.ProjectID}`, Object.keys(ViewMode).find(key => ViewMode[key] === viewMode));
    }
  }, [viewMode, project?.ProjectID]);

  // Monitora l'elemento del container
  useEffect(() => {
    ganttContainerRef.current = document.querySelector(".gantt-container");

    // Configurare l'observer per riapplicare la posizione di scroll dopo il rendering
    const observer = new MutationObserver(() => {
      if (!isLoading) {
        applyScrollPosition();
      }
    });

    if (ganttContainerRef.current) {
      observer.observe(ganttContainerRef.current, {
        childList: true,
        subtree: true,
      });
    }

    return () => observer.disconnect();
  }, [isLoading]);

  // Funzione per applicare la posizione di scroll
  const applyScrollPosition = useCallback(() => {
    if (ganttContainerRef.current && !isTaskUpdating.current) {
      const horizontalScroll = ganttContainerRef.current.querySelector(
        ".gantt-horizontal-scroll",
      );
      if (horizontalScroll && scrollPosition > 0) {
        horizontalScroll.scrollLeft = scrollPosition;
      }
    }
  }, [scrollPosition]);

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
    return optimisticTasks.length > 0 ? optimisticTasks : tasks;
  }, [optimisticTasks, tasks]);

  // Quando refreshProject viene chiamato, marca che stiamo aggiornando
  const handleTaskChangeWrapper = async (task) => {
    // Verifica se l'utente può modificare questo task
    const originalTask = displayTasks.find((t) => t.TaskID.toString() === task.id);
    if (!originalTask) return;

    if (!checkAdminPermission(project) && !isOwnTask(originalTask)) {
      swal.fire(
        "Attenzione",
        "Non hai i permessi per modificare questa attività",
        "warning",
      );
      return;
    }

    // No modifications for completed tasks
    if (originalTask.Status === "COMPLETATA") {
      swal.fire(
        "Attenzione",
        "Non puoi modificare un'attività completata",
        "warning",
      );
      return;
    }

    // Chiedi conferma prima di modificare il task
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

    try {
      isTaskUpdating.current = true;
      await handleTaskChange(task);
    } finally {
      setTimeout(() => {
        isTaskUpdating.current = false;
      }, 500);
    }
  };

  // Salva l'intervallo di tempo visibile
  const handleTimeChange = (start, end) => {
    setVisibleTimeStart(start);
    setVisibleTimeEnd(end);
  };

  // Filtra le task
  const filteredTasks = useMemo(() => {
    let result = [...displayTasks];

    // Status filter
    if (filters.status !== "all") {
      result = result.filter((task) => task.Status === filters.status);
    }

    // Priority filter
    if (filters.priority !== "all") {
      result = result.filter((task) => task.Priority === filters.priority);
    }

    // Assigned to filter
    if (filters.assignedTo) {
      result = result.filter((task) => task.AssignedTo === filters.assignedTo);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (task) =>
          task.Title?.toLowerCase().includes(searchLower) ||
          task.Description?.toLowerCase().includes(searchLower),
      );
    }

    // Delayed tasks filter
    if (filters.showDelayed) {
      result = result.filter((task) => {
        const dueDate = new Date(task.DueDate);
        return dueDate < new Date() && task.Status !== "COMPLETATA";
      });
    }

    // Verifica sempre che ogni task abbia date valide per evitare errori nel gantt
    return result.filter((task) => task.StartDate && task.DueDate);
  }, [displayTasks, filters]);

  // Costruisce le dipendenze per gantt-task-react
  const buildDependencies = useCallback((task) => {
    const predecessors = parseDependencies(task.Predecessors);
    if (!predecessors || predecessors.length === 0) return [];
    
    // gantt-task-react supporta solo dipendenze FS semplici
    // quindi prendiamo solo le dipendenze FS
    return predecessors
      .filter(dep => dep.dependencyType === 'FS')
      .map(dep => dep.taskId.toString());
  }, []);

  // Convertire le task nel formato richiesto dalla libreria
  const convertTasks = useCallback(
    (sourceTasks) => {
      return sourceTasks.map((task) => {
        const predecessors = parseDependencies(task.Predecessors);
        
        return {
          id: task.TaskID.toString(),
          name: task.Title,
          start: new Date(task.StartDate),
          end: new Date(task.DueDate),
          progress:
            task.Status === "COMPLETATA"
              ? 100
              : task.Status === "IN ESECUZIONE"
                ? 50
                : task.Status === "BLOCCATA"
                  ? 0
                  : task.Status === "SOSPESA"
                    ? 25
                    : 10, // Per "DA FARE"
          type: "task",
          project: project.ProjectID.toString(),
          dependencies: buildDependencies(task),
          hideChildren: false,
          displayOrder: task.TaskSequence,

          // Dati personalizzati per preservare tutte le informazioni originali
          originalTask: task,
          canInteract: checkAdminPermission(project) || isOwnTask(task),
          // Status dell'attività
          status: task.Status,
          priority: task.Priority,
          isDelayed:
            new Date(task.DueDate) < new Date() && task.Status !== "COMPLETATA",
          assignedToName: task.AssignedToName,
          predecessorsData: predecessors,
          // Stile in base allo stato
          styles: {
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
            progressColor:
              task.Status === "COMPLETATA"
                ? "#10b981"
                : task.Status === "IN ESECUZIONE"
                  ? "#3b82f6"
                  : task.Status === "BLOCCATA"
                    ? "#ef4444"
                    : task.Status === "SOSPESA"
                      ? "#f59e0b"
                      : "#94a3b8",
            progressSelectedColor:
              task.Status === "COMPLETATA"
                ? "#10b981"
                : task.Status === "IN ESECUZIONE"
                  ? "#3b82f6"
                  : task.Status === "BLOCCATA"
                    ? "#ef4444"
                    : task.Status === "SOSPESA"
                      ? "#f59e0b"
                      : "#94a3b8",
          },
        };
      });
    },
    [checkAdminPermission, isOwnTask, project, buildDependencies],
  );

  // Preparazione dei task per la libreria
  const ganttTasks = useMemo(() => {
    return convertTasks(filteredTasks);
  }, [filteredTasks, convertTasks]);

  // Handler per aggiornamento delle date tramite drag
  const handleTaskChange = async (task) => {
    // Trova il task originale
    const originalTask = displayTasks.find((t) => t.TaskID.toString() === task.id);
    if (!originalTask) return;

    // Controllo permessi
    if (!checkAdminPermission(project) && !isOwnTask(originalTask)) {
      swal.fire(
        "Attenzione",
        "Non hai i permessi per modificare questa attività",
        "warning",
      );
      return;
    }

    // No modifications for completed tasks
    if (originalTask.Status === "COMPLETATA") {
      swal.fire(
        "Attenzione",
        "Non puoi modificare un'attività completata",
        "warning",
      );
      return;
    }

    // Salva lo stato corrente del Gantt prima dell'aggiornamento
    const currentState = {
      scrollLeft: ganttContainerRef.current?.querySelector(".gantt-horizontal-scroll")?.scrollLeft || 0,
      viewMode: viewMode,
      showDependencies: showDependencies
    };

    // Crea oggetto aggiornato
    const startDate = task.start.toISOString().split("T")[0] + "T00:00:00";
    const dueDate = task.end.toISOString().split("T")[0] + "T00:00:00";

    const updatedTask = {
      ...originalTask,
      StartDate: startDate,
      DueDate: dueDate,
    };

    // Optimistic update: aggiorna immediatamente l'UI
    setOptimisticTasks(prev => 
      prev.length > 0 
        ? prev.map(t => t.TaskID === originalTask.TaskID ? updatedTask : t)
        : displayTasks.map(t => t.TaskID === originalTask.TaskID ? updatedTask : t)
    );

    // Mostra loading overlay
    setIsLoading(true);
    setLoadingMessage("Aggiornamento date attività...");

    try {
      // Chiamata aggiornamento
      const result = await onTaskUpdate(updatedTask);

      if (result && result.success) {
        // Forza il refresh mantenendo lo stato
        await refreshProject(() => {
          // Reset optimistic tasks
          setOptimisticTasks([]);
          setIsLoading(false);
          
          setTimeout(() => {
            // Ripristina la posizione di scroll
            if (ganttContainerRef.current) {
              const horizontalScroll = ganttContainerRef.current.querySelector(".gantt-horizontal-scroll");
              if (horizontalScroll) {
                horizontalScroll.scrollLeft = currentState.scrollLeft;
              }
            }
          }, 100);
        });
      } else {
        // Rollback in caso di errore
        setOptimisticTasks([]);
        setIsLoading(false);
      }
    } catch (error) {
      // Rollback in caso di errore
      setOptimisticTasks([]);
      setIsLoading(false);
      console.error("Error updating task:", error);
    }

    return true;
  };

  // Gestisce il doppio click per aprire i dettagli
  const handleDoubleClick = (task) => {
    const originalTask = displayTasks.find((t) => t.TaskID.toString() === task.id);
    if (originalTask) {
      // Salva la posizione corrente prima di aprire il modal
      if (ganttContainerRef.current) {
        const horizontalScroll = ganttContainerRef.current.querySelector(
          ".gantt-horizontal-scroll",
        );
        if (horizontalScroll) {
          setScrollPosition(horizontalScroll.scrollLeft);
        }
      }
      onTaskClick(originalTask);
    }
  };

  // Gestisce il click singolo
  const handleClick = (task) => {
    const originalTask = displayTasks.find((t) => t.TaskID.toString() === task.id);
    if (originalTask) {
      // Salva la posizione corrente prima di aprire il modal
      if (ganttContainerRef.current) {
        const horizontalScroll = ganttContainerRef.current.querySelector(
          ".gantt-horizontal-scroll",
        );
        if (horizontalScroll) {
          setScrollPosition(horizontalScroll.scrollLeft);
        }
      }
      onTaskClick(originalTask);
    }
  };

  // Funzione diretta per l'aggiornamento della sequenza senza debounce
  const executeTaskSequenceUpdate = async (taskId, projectId, newIndex) => {
    try {
      // Mostra loading overlay
      setIsLoading(true);
      setLoadingMessage("Riordinamento attività...");

      // Effettua la chiamata API direttamente
      const result = await updateTaskSequence(taskId, projectId, newIndex);

      // Se la chiamata ha avuto successo, aggiorna la UI
      if (result && result.success) {
        // Ricarica il progetto
        await refreshProject(() => {
          setIsLoading(false);
        });
        
        swal.fire({
          title: "Riordinamento completato",
          text: "La sequenza delle attività è stata aggiornata",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        setIsLoading(false);
      }

      return result;
    } catch (error) {
      console.error("[GANTT] Errore in executeTaskSequenceUpdate:", error);
      setIsLoading(false);
      return { success: false };
    }
  };

  // Callback per lo spostamento tramite drag (aggiorna la sequenza)
  const handleTaskMove = async (task, orderIndex) => {
    // Imposta la flag di elaborazione immediata
    clickHandledRef.current = true;
    moveInProgress.current = true;

    try {
      // Converti l'ID del task da stringa a numero se necessario
      const taskId = typeof task.id === "string" ? parseInt(task.id) : task.id;

      // Trova il task originale usando l'ID corretto
      const originalTask = displayTasks.find((t) => t.TaskID === taskId);
      if (!originalTask) {
        moveInProgress.current = false;
        clickHandledRef.current = false;
        return;
      }

      // Controllo permessi
      if (!checkAdminPermission(project) && !isOwnTask(originalTask)) {
        console.error("Permessi insufficienti");
        swal.fire(
          "Attenzione",
          "Non hai i permessi per spostare questa attività",
          "warning",
        );
        moveInProgress.current = false;
        clickHandledRef.current = false;
        return;
      }

      // Salva la posizione di scroll corrente
      if (ganttContainerRef.current) {
        const horizontalScroll = ganttContainerRef.current.querySelector(
          ".gantt-horizontal-scroll",
        );
        if (horizontalScroll) {
          setScrollPosition(horizontalScroll.scrollLeft);
        }
      }

      // Usa la funzione diretta invece di quella debounced
      const result = await executeTaskSequenceUpdate(
        taskId,
        project.ProjectID,
        orderIndex,
      );
    } catch (error) {
      console.error("[GANTT] Errore aggiornamento sequenza:", error);
      swal.fire(
        "Errore",
        "Non è stato possibile aggiornare la sequenza delle attività",
        "error",
      );
    } finally {
      // Ripristina i flag dopo un ritardo
      setTimeout(() => {
        moveInProgress.current = false;
        clickHandledRef.current = false;
      }, 800);
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
    });
  };

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

  // Showing loading screen when tasks are not available
  if (!tasks.length) {
    return (
      <Card className="border rounded-lg bg-white">
        <CardContent className="p-6 text-center">
          <div className="text-gray-500">
            Nessuna attività presente nel progetto
          </div>
        </CardContent>
      </Card>
    );
  }

  // Funzione per gestire il click sui pulsanti di riordinamento
  const handleMoveButtonClick = (e, task, direction) => {
    e.preventDefault();
    e.stopPropagation();

    // Verifica se è già in corso un'operazione di spostamento
    if (moveInProgress.current || clickHandledRef.current) {
      return;
    }

    const taskIndex = ganttTasks.findIndex((t) => t.id === task.id);

    if (taskIndex === -1) {
      return;
    }

    // Non fare nulla se primo elemento e si tenta di spostare su o ultimo e si tenta di spostare giù
    if (
      (direction === "up" && taskIndex === 0) ||
      (direction === "down" && taskIndex === ganttTasks.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? taskIndex - 1 : taskIndex + 1;

    // Imposta il flag di click elaborato immediatamente per evitare doppie elaborazioni
    clickHandledRef.current = true;

    // Mostra uno stato di "elaborazione" sui pulsanti
    moveInProgress.current = true;

    // Usa setTimeout per dare priorità alla UI
    setTimeout(() => {
      // Salva la posizione di scroll attuale
      if (ganttContainerRef.current) {
        const horizontalScroll = ganttContainerRef.current.querySelector(
          ".gantt-horizontal-scroll",
        );
        if (horizontalScroll) {
          setScrollPosition(horizontalScroll.scrollLeft);
        }
      }

      // Calcola il nuovo valore di sequenza
      const targetTask = ganttTasks[newIndex].originalTask;
      const newSequenceValue = parseInt(targetTask.TaskSequence);

      // Trasforma il task in un oggetto con TaskID numerico
      const taskId = parseInt(task.id);

      // Chiamata diretta all'API (senza debounce)
      executeTaskSequenceUpdate(taskId, project.ProjectID, newSequenceValue);
    }, 100);
  };

  // Funzione per formattare le dipendenze
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

  // Effetto per gestire il refresh esterno
  useEffect(() => {
    // Se riceviamo un aggiornamento esterno mentre non stiamo caricando,
    // mostra brevemente l'overlay
    if (tasks !== displayTasks && !isLoading && optimisticTasks.length === 0) {
      setIsLoading(true);
      setLoadingMessage("Aggiornamento vista...");
      
      const timer = setTimeout(() => {
        setIsLoading(false);
        applyScrollPosition();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [tasks]);

  return (
    <Card className="border rounded-lg bg-white relative">
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
      <div className="border-b">
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
          </div>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 p-2">
            <div className="flex-grow-0 flex-shrink-0 w-auto">
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
                disabled={isLoading}
              >
                <SelectTrigger className="h-8 min-w-[120px]">
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
            </div>

            <div className="flex-grow-0 flex-shrink-0 w-auto">
              <Select
                value={filters.priority}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, priority: value }))
                }
                disabled={isLoading}
              >
                <SelectTrigger className="h-8 min-w-[120px]">
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
            </div>

            <div className="flex-grow-0 flex-shrink-0 w-auto">
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
                <SelectTrigger className="h-8 min-w-[150px]">
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
            </div>

            <div className="flex-grow-0 flex-shrink-0 w-auto">
              <div className="relative">
                <Input
                  placeholder="Cerca..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="h-8 pl-8 pr-2"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex-grow-0 flex-shrink-0 w-auto">
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
            </div>

            <div className="flex-grow-0 flex-shrink-0 ml-auto">
              <div className="flex items-center gap-1">
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
          <div className="flex items-center gap-2 ">
            <Button
              size="sm"
              variant={filters.showDelayed ? "default" : "outline"}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  showDelayed: !prev.showDelayed,
                }))
              }
              className={
                filters.showDelayed ? "bg-amber-600 hover:bg-amber-700" : ""
              }
              disabled={isLoading}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              In ritardo
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-0">
        {/* Leggenda colori */}
        <div className="p-2 border-b flex flex-wrap items-center gap-x-4 gap-y-2 bg-gray-50 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-gray-400 rounded-sm"></span>
            <span>Da fare</span>
          </div>
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
            <span>Linee = Dipendenze (FS)</span>
          </div>
        </div>

        {/* Gantt Chart */}
        <div
          className="gantt-container"
          style={{
            height: "calc(90vh - 350px)",
            overflow: "auto",
            position: "relative",
            opacity: isLoading ? 0.5 : 1,
            transition: "opacity 0.3s ease",
          }}
        >
          {ganttTasks.length > 0 ? (
            <Gantt
              tasks={ganttTasks}
              viewMode={viewMode}
              rowHeight={90}
              onDateChange={handleTaskChangeWrapper}
              onDoubleClick={handleDoubleClick}
              onTaskMove={handleTaskMove}
              barCornerRadius={4}
              barProgressColor={null}
              barProgressSelectedColor={null}
              projectProgressColor={null}
              projectProgressSelectedColor={null}
              arrow={showDependencies}
              arrowColor="#6366f1"
              arrowIndent={20}
              TooltipContent={({ task }) => {
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
                        <div className="text-sm text-gray-700 max-w-xs overflow-hidden">
                          {originalTask.Description.substring(0, 150)}
                          {originalTask.Description.length > 150 ? "..." : ""}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }}
              TaskListTable={() => (
                <div className="p-2 border-r h-full">
                  <table className="w-full h-full border-spacing-0 border-separate">
                    <tbody>
                      {ganttTasks.map((task, index) => {
                        const isDelayed =
                          new Date(task.end) < new Date() &&
                          task.status !== "COMPLETATA";
                        const canMove =
                          checkAdminPermission(project) ||
                          isOwnTask(task.originalTask);
                        const hasDependencies = task.predecessorsData && task.predecessorsData.length > 0;

                        return (
                          <tr key={task.id} className="hover:bg-gray-50">
                            <td
                              className="p-2 border-b"
                              style={{ height: "75px" }}
                            >
                              <div className="flex flex-col h-[75px] justify-center">
                                <div className="flex items-center">
                                  <span
                                    className="inline-block w-3 h-3 mr-2 rounded-full"
                                    style={{
                                      backgroundColor:
                                        task.status === "COMPLETATA"
                                          ? "#10b981"
                                          : task.status === "IN ESECUZIONE"
                                            ? "#3b82f6"
                                            : task.status === "BLOCCATA"
                                              ? "#ef4444"
                                              : task.status === "SOSPESA"
                                                ? "#f59e0b"
                                                : "#94a3b8",
                                    }}
                                  ></span>
                                  <span className="font-medium truncate max-w-[150px]">
                                    {task.name}
                                  </span>

                                  {hasDependencies && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <GitBranch className="w-3 h-3 ml-2 text-indigo-600" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <div className="text-xs">
                                            {task.predecessorsData.length} dipendenz{task.predecessorsData.length > 1 ? 'e' : 'a'}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}

                                  {isDelayed && (
                                    <Badge className="ml-2 bg-amber-100 text-amber-700 border-amber-300">
                                      <AlertTriangle className="w-3 h-3" />
                                    </Badge>
                                  )}
                                </div>

                                {task.assignedToName && (
                                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                    <span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                      {task.assignedToName
                                        .charAt(0)
                                        .toUpperCase()}
                                    </span>
                                    <span className="truncate max-w-[140px]">
                                      {task.assignedToName}
                                    </span>
                                  </div>
                                )}

                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span
                                    className={isDelayed ? "text-red-500" : ""}
                                  >
                                    {new Date(task.start).toLocaleDateString('it-IT', { 
                                      day: '2-digit', 
                                      month: 'short' 
                                    })} - {new Date(task.end).toLocaleDateString('it-IT', { 
                                      day: '2-digit', 
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td
                              className="border-b w-10 text-center align-middle"
                              style={{ height: "75px" }}
                            >
                              {/* PULSANTI RIORDINAMENTO MIGLIORATI */}
                              {canMove && !isLoading && (
                                <div className="flex flex-col gap-1 items-center">
                                  {/* Pulsante SPOSTA SU */}
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleMoveButtonClick(e, task, "up")
                                    }
                                    className={`p-1 rounded bg-white hover:bg-gray-200 border border-gray-300 ${
                                      index === 0 ||
                                      moveInProgress.current ||
                                      clickHandledRef.current
                                        ? "opacity-30 cursor-not-allowed"
                                        : "hover:border-gray-400"
                                    }`}
                                    disabled={
                                      index === 0 ||
                                      moveInProgress.current ||
                                      clickHandledRef.current ||
                                      isLoading
                                    }
                                    title="Sposta su"
                                  >
                                    <ArrowUp className="h-4 w-4 text-gray-600" />
                                  </button>

                                  {/* Pulsante SPOSTA GIÙ */}
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleMoveButtonClick(e, task, "down")
                                    }
                                    className={`p-1 rounded bg-white hover:bg-gray-200 border border-gray-300 ${
                                      index === ganttTasks.length - 1 ||
                                      moveInProgress.current ||
                                      clickHandledRef.current
                                        ? "opacity-30 cursor-not-allowed"
                                        : "hover:border-gray-400"
                                    }`}
                                    disabled={
                                      index === ganttTasks.length - 1 ||
                                      moveInProgress.current ||
                                      clickHandledRef.current ||
                                      isLoading
                                    }
                                    title="Sposta giù"
                                  >
                                    <ArrowDown className="h-4 w-4 text-gray-600" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
              onTimeChange={handleTimeChange}
              TaskListHeader={() => (
                <div className="sticky top-0 z-10 bg-white">
                  <table className="w-full h-full">
                    <thead>
                      <tr>
                        <th className="p-1 border-r">Attività</th>
                      </tr>
                    </thead>
                  </table>
                </div>
              )}
              ganttHeight={0}
              timeStep={10000}
              fontFamily="Inter, system-ui, sans-serif"
              fontSize="12px"
              preStepsCount={1}
              rtl={false}
              locale="it-IT"
            />
          ) : (
            <div className="p-4 text-center text-gray-500">
              Nessuna attività corrispondente ai filtri selezionati
            </div>
          )}
        </div>

        {/* Stato operazione (visibile solo durante un'operazione) */}
        {moveInProgress.current && (
          <div className="p-2 border-t bg-blue-50 text-blue-700 text-sm flex items-center justify-center">
            <span className="animate-pulse">Aggiornamento in corso...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Ottimizzazione per evitare re-render inutili, ma garantendo aggiornamenti quando necessario
export default React.memo(ProjectGanttView, (prevProps, nextProps) => {
  // Controlla se le props principali sono cambiate
  // Verifica più completa includendo tutti i campi rilevanti dei task
  const tasksUnchanged =
    prevProps.tasks.length === nextProps.tasks.length &&
    JSON.stringify(
      prevProps.tasks.map((t) => ({
        id: t.TaskID,
        seq: t.TaskSequence,
        start: t.StartDate,
        end: t.DueDate,
        status: t.Status,
        predecessors: t.Predecessors
      }))
    ) ===
    JSON.stringify(
      nextProps.tasks.map((t) => ({
        id: t.TaskID,
        seq: t.TaskSequence,
        start: t.StartDate,
        end: t.DueDate,
        status: t.Status,
        predecessors: t.Predecessors
      }))
    );

  const projectUnchanged =
    prevProps.project.ProjectID === nextProps.project.ProjectID;

  // Se le props principali non sono cambiate, evita il re-render
  return tasksUnchanged && projectUnchanged;
});