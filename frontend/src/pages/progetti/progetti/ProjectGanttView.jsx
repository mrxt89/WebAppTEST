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
} from "lucide-react";

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
 * ProjectGanttView - Implementazione Gantt tramite gantt-task-react
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
}) => {
  // Contatori di debug
  const renderCount = useRef(0);
  const clickCount = useRef(0);

  // Refs per mantenere lo stato tra aggiornamenti
  const isTaskUpdating = useRef(false);
  const ganttContainerRef = useRef(null);
  const moveInProgress = useRef(false);
  const clickHandledRef = useRef(false);

  // Preservare lo stato attuale
  const [viewMode, setViewMode] = useState(ViewMode.Week);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [visibleTimeStart, setVisibleTimeStart] = useState(null);
  const [visibleTimeEnd, setVisibleTimeEnd] = useState(null);

  // Stato per i filtri
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    assignedTo: null,
    search: "",
    showDelayed: false,
  });

  // Debug render count
  useEffect(() => {
    renderCount.current++;
    console.log(
      `[GANTT] Render #${renderCount.current} (Normal React lifecycle)`,
    );
    return () => {
      console.log(
        `[GANTT] Component unmounted after render #${renderCount.current}`,
      );
    };
  }, []);

  // Monitora l'elemento del container
  useEffect(() => {
    ganttContainerRef.current = document.querySelector(".gantt-container");

    // Configurare l'observer per riapplicare la posizione di scroll dopo il rendering
    const observer = new MutationObserver(() => {
      applyScrollPosition();
    });

    if (ganttContainerRef.current) {
      observer.observe(ganttContainerRef.current, {
        childList: true,
        subtree: true,
      });
    }

    return () => observer.disconnect();
  }, []);

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

  // Quando refreshProject viene chiamato, marca che stiamo aggiornando
  const handleTaskChangeWrapper = async (task) => {
    // Verifica se l'utente può modificare questo task
    const originalTask = tasks.find((t) => t.TaskID.toString() === task.id);
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
    let result = [...tasks];

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
  }, [tasks, filters]);

  // Convertire le task nel formato richiesto dalla libreria
  const convertTasks = useCallback(
    (sourceTasks) => {
      return sourceTasks.map((task) => ({
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
        dependencies: task.PredecessorTaskID
          ? [task.PredecessorTaskID.toString()]
          : [],
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
      }));
    },
    [checkAdminPermission, isOwnTask, project],
  );

  // Preparazione dei task per la libreria
  const ganttTasks = useMemo(() => {
    return convertTasks(filteredTasks);
  }, [filteredTasks, convertTasks]);

  // Handler per aggiornamento delle date tramite drag
  const handleTaskChange = async (task) => {
    // Trova il task originale
    const originalTask = tasks.find((t) => t.TaskID.toString() === task.id);
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

    // Crea oggetto aggiornato
    const startDate = task.start.toISOString().split("T")[0] + "T00:00:00";
    const dueDate = task.end.toISOString().split("T")[0] + "T00:00:00";

    const updatedTask = {
      ...originalTask,
      StartDate: startDate,
      DueDate: dueDate,
    };

    // Chiamata aggiornamento
    const result = await onTaskUpdate(updatedTask);

    // Dopo l'aggiornamento, aspetta un po' e poi applica lo scroll
    setTimeout(() => {
      applyScrollPosition();
    }, 300);

    return result;
  };

  // Gestisce il doppio click per aprire i dettagli
  const handleDoubleClick = (task) => {
    const originalTask = tasks.find((t) => t.TaskID.toString() === task.id);
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
    const originalTask = tasks.find((t) => t.TaskID.toString() === task.id);
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
      console.log(
        "[GANTT] Esecuzione della chiamata updateTaskSequence:",
        taskId,
        projectId,
        newIndex,
      );

      // Assicurati che updateTaskSequence sia una funzione
      if (typeof updateTaskSequence !== "function") {
        console.error("[GANTT] updateTaskSequence non è una funzione");
        return { success: false };
      }

      // Effettua la chiamata API direttamente
      const result = await updateTaskSequence(taskId, projectId, newIndex);
      console.log("[GANTT] Risultato updateTaskSequence:", result);

      // Se la chiamata ha avuto successo, aggiorna la UI
      if (result && result.success) {
        // Ricarica il progetto con un leggero ritardo
        setTimeout(() => {
          refreshProject();
        }, 300);
      }

      return result;
    } catch (error) {
      console.error("[GANTT] Errore in executeTaskSequenceUpdate:", error);
      return { success: false };
    }
  };

  // Callback per lo spostamento tramite drag (aggiorna la sequenza)
  const handleTaskMove = async (task, orderIndex) => {
    // Evita di processare se questo click è già stato gestito
    if (clickHandledRef.current) {
      console.log("[GANTT] Click già gestito, ignoro");
      return;
    }

    // Imposta la flag di elaborazione immediata
    clickHandledRef.current = true;
    moveInProgress.current = true;

    // Stampo immediatamente per verificare la chiamata
    clickCount.current++;
    console.log(
      `[GANTT] handleTaskMove #${clickCount.current} chiamato con:`,
      task,
      orderIndex,
    );

    try {
      // Converti l'ID del task da stringa a numero se necessario
      const taskId = typeof task.id === "string" ? parseInt(task.id) : task.id;
      console.log("[GANTT] TaskID convertito:", taskId);

      // Trova il task originale usando l'ID corretto
      const originalTask = tasks.find((t) => t.TaskID === taskId);
      if (!originalTask) {
        console.log("[GANTT] Task originale non trovato");
        moveInProgress.current = false;
        clickHandledRef.current = false;
        return;
      }

      // Controllo permessi
      if (!checkAdminPermission(project) && !isOwnTask(originalTask)) {
        console.log("[GANTT] Permessi insufficienti");
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

      console.log(
        "[GANTT] Chiamata diretta executeTaskSequenceUpdate con:",
        taskId,
        project.ProjectID,
        orderIndex,
      );

      // Usa la funzione diretta invece di quella debounced
      const result = await executeTaskSequenceUpdate(
        taskId,
        project.ProjectID,
        orderIndex,
      );
      console.log("[GANTT] Risultato executeTaskSequenceUpdate:", result);

      if (result && result.success) {
        // Mostra una notifica di successo temporanea
        swal.fire({
          title: "Riordinamento completato",
          text: "La sequenza delle attività è stata aggiornata",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }
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
        console.log(
          "[GANTT] Operazione di spostamento completata, flag ripristinati",
        );
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

  // Funzione per gestire il click sui pulsanti di riordinamento - Log aggiuntivi
  const handleMoveButtonClick = (e, task, direction) => {
    // Debug iniziale
    console.log("[GANTT] Button click:", direction, task.id);
    e.preventDefault();
    e.stopPropagation();

    // Verifica se è già in corso un'operazione di spostamento
    if (moveInProgress.current || clickHandledRef.current) {
      console.log(
        "[GANTT] Operazione di spostamento già in corso, ignoro la richiesta",
      );
      return;
    }

    const taskIndex = ganttTasks.findIndex((t) => t.id === task.id);
    console.log("[GANTT] Task index trovato:", taskIndex);

    if (taskIndex === -1) {
      console.log("[GANTT] Task non trovato nella lista");
      return;
    }

    // Non fare nulla se primo elemento e si tenta di spostare su o ultimo e si tenta di spostare giù
    if (
      (direction === "up" && taskIndex === 0) ||
      (direction === "down" && taskIndex === ganttTasks.length - 1)
    ) {
      console.log("[GANTT] Movimento non valido: ai confini della lista");
      return;
    }

    const newIndex = direction === "up" ? taskIndex - 1 : taskIndex + 1;
    console.log("[GANTT] Nuovo indice calcolato:", newIndex);

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
      // Ottieni il task precedente e successivo nella posizione desiderata
      const tasks = ganttTasks.map((t) =>
        parseInt(t.originalTask.TaskSequence),
      );

      // Calcola il nuovo valore di sequenza basato sulla posizione
      let newSequenceValue;
      if (direction === "up") {
        const targetTask = ganttTasks[newIndex].originalTask;
        newSequenceValue = parseInt(targetTask.TaskSequence);
      } else {
        const targetTask = ganttTasks[newIndex].originalTask;
        newSequenceValue = parseInt(targetTask.TaskSequence);
      }

      console.log("[GANTT] Valore della nuova sequenza:", newSequenceValue);
      console.log("[GANTT] Avvio spostamento effettivo verso", direction);

      // Trasforma il task in un oggetto con TaskID numerico
      const taskId = parseInt(task.id);

      // Chiamata diretta all'API (senza debounce)
      executeTaskSequenceUpdate(taskId, project.ProjectID, newSequenceValue);
    }, 100);
  };

  return (
    <Card className="border rounded-lg bg-white">
      {/* Header Controls */}
      <div className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-2 p-2">
          <div className="flex items-center space-x-4">
            <Button
              variant={viewMode === ViewMode.Day ? "default" : "outline"}
              onClick={() => setViewMode(ViewMode.Day)}
              className="flex-shrink-0"
            >
              Giorno
            </Button>
            <Button
              variant={viewMode === ViewMode.Week ? "default" : "outline"}
              onClick={() => setViewMode(ViewMode.Week)}
              className="flex-shrink-0"
            >
              Settimana
            </Button>
            <Button
              variant={viewMode === ViewMode.Month ? "default" : "outline"}
              onClick={() => setViewMode(ViewMode.Month)}
              className="flex-shrink-0"
            >
              Mese
            </Button>
          </div>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 p-2">
            <div className="flex-grow-0 flex-shrink-0 w-auto">
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
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
              >
                <SelectTrigger className="h-8 min-w-[150px]">
                  <SelectValue placeholder="Assegnato a" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli utenti</SelectItem>
                  {users
                    .filter((user) =>
                      tasks.some((task) => task.AssignedTo === user.userId),
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
        </div>

        {/* Gantt Chart */}
        <div
          className="gantt-container"
          style={{
            height: "calc(90vh - 300px)",
            overflow: "auto",
            position: "relative",
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
              TooltipContent={({ task }) => {
                const originalTask = task.originalTask;
                const status = originalTask.Status;
                const priority = originalTask.Priority;
                const assignedTo = originalTask.AssignedToName;

                return (
                  <div className="p-2 bg-white shadow-lg rounded border">
                    <div className="font-bold">{task.name}</div>
                    <div>
                      Inizio: {new Date(task.start).toLocaleDateString()}
                    </div>
                    <div>Fine: {new Date(task.end).toLocaleDateString()}</div>
                    <div>Stato: {status}</div>
                    <div>Priorità: {priority}</div>
                    {assignedTo && <div>Assegnato a: {assignedTo}</div>}
                    {originalTask.Description && (
                      <div className="mt-1 pt-1 border-t">
                        <div className="text-xs text-gray-600">
                          Descrizione:
                        </div>
                        <div className="text-sm max-w-xs overflow-hidden text-ellipsis">
                          {originalTask.Description.substring(0, 100)}
                          {originalTask.Description.length > 100 ? "..." : ""}
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
                                    {new Date(task.start).toLocaleDateString()}{" "}
                                    - {new Date(task.end).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td
                              className="border-b w-10 text-center align-middle"
                              style={{ height: "75px" }}
                            >
                              {/* PULSANTI RIORDINAMENTO MIGLIORATI */}
                              {canMove && (
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
                                      clickHandledRef.current
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
                                      clickHandledRef.current
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
              barFill={90} // Ridotto da 100 per evitare di riempire l'intera barra
              handleWidth={8} // Larghezza delle maniglie per il ridimensionamento
              columnWidth={
                viewMode === ViewMode.Month
                  ? 300
                  : viewMode === ViewMode.Week
                    ? 170
                    : 60
              }
              listCellWidth="100px"
              todayColor="rgba(252, 165, 165, 0.5)"
              onTimeChange={handleTimeChange} // Aggiungiamo questo evento per salvare la posizione
              TaskListHeader={() => (
                // Manteniamo lo stesso stile ma non scriviamo nulla dentro
                <div className="">
                  <table className="w-full h-full">
                    <thead>
                      <tr>
                        <th className="p-1 border-r">Attività</th>
                      </tr>
                    </thead>
                  </table>
                </div>
              )}
              ganttHeight={0} // Auto altezza
              arrowIndent={20} // Distanza per le frecce di dipendenza
              // Questo fa sì che le barre abbiano lo stile personalizzato
              ganttFullHeight={true}
              timeStep={10000} // Intervallo di tempo minimo per il drag
              fontFamily="Inter, system-ui, sans-serif"
              fontSize="12px"
              // Personalizzazione dello stile per ogni tipo di task
              preStepsCount={1} // Spazio prima della prima colonna
              rtl={false}
              // Usa style per ogni barra
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

// Ottimizzazione per evitare re-render inutili
export default React.memo(ProjectGanttView, (prevProps, nextProps) => {
  // Controlla se le props principali sono cambiate
  const tasksUnchanged =
    prevProps.tasks.length === nextProps.tasks.length &&
    JSON.stringify(
      prevProps.tasks.map((t) => t.TaskID + "-" + t.TaskSequence),
    ) ===
      JSON.stringify(
        nextProps.tasks.map((t) => t.TaskID + "-" + t.TaskSequence),
      );

  const projectUnchanged =
    prevProps.project.ProjectID === nextProps.project.ProjectID;

  // Se le props principali non sono cambiate, evita il re-render
  return tasksUnchanged && projectUnchanged;
});
