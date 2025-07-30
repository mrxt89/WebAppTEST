import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Layers,
  AlertCircle,
  Clock,
  MessageSquare,
  Paperclip,
  Calendar,
  Users,
  MoreVertical,
  Eye,
  Ban,
  CheckCircle2,
  Pin,
  PinOff,
  Lock,
  Search,
  AlertTriangle,
} from "lucide-react";
import TaskRow from "./TaskRow";
import TasksLegend from "./TasksLegend";
import { hasAdminOrManagerPermission, canEditTask } from "@/lib/taskPermissionsUtils";
import useProjectActions from "../../../hooks/useProjectManagementActions";
import useProjectStages from "../../../hooks/useProjectStages";
import { toast } from "@/components/ui/use-toast";

const ProjectStagesTable = ({
  project,
  stages,
  unassignedTasks,
  onTaskClick,
  onTaskUpdate,
  onTaskDisable,
  checkAdminPermission,
  isOwnTask,
  currentUserId,
}) => {
  // Stati locali
  const [localTasks, setLocalTasks] = useState([]);
  const [expandedStages, setExpandedStages] = useState({});
  const [editingCell, setEditingCell] = useState({ taskId: null, field: null });
  const [sortConfig, setSortConfig] = useState({
    key: "TaskSequence",
    direction: "asc",
  });
  const [filter, setFilter] = useState("");
  const [showDelayedOnly, setShowDelayedOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pinnedTasks, setPinnedTasks] = useState(new Set());
  const [pinLoading, setPinLoading] = useState(null);
  const [selectedStageFilter, setSelectedStageFilter] = useState("all");
  
  // Refs
  const tableRef = useRef(null);
  
  // Hooks
  const { manageTaskPin } = useProjectActions();
  const { assignTaskToStage } = useProjectStages();

  // Stati per il ridimensionamento colonne
  const [columnWidths, setColumnWidths] = useState([
    40,   // expand
    250,  // title
    200,  // responsible
    150,  // status
    120,  // dueDate
    100,  // priority
    80,   // comments
    80,   // attachments
    60    // actions
  ]);
  const [isResizing, setIsResizing] = useState(null);

  // Effetto per inizializzare i task
  useEffect(() => {
    // Combina tutti i task da tutte le fasi e i non assegnati
    const allTasks = [];
    
    // Aggiungi task non assegnati
    unassignedTasks.forEach(task => {
      allTasks.push({ ...task, StageID: null, StageName: "Non assegnate" });
    });
    
    // Aggiungi task dalle fasi
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
    
    // Estrai task pinnati
    const pinned = new Set(
      allTasks.filter(task => task.IsPinned).map(task => task.TaskID)
    );
    setPinnedTasks(pinned);
    
    setLocalTasks(allTasks);
  }, [stages, unassignedTasks]);

  // Effetto per espandere di default le fasi con task
  useEffect(() => {
    const expanded = { unassigned: unassignedTasks.length > 0 };
    stages.forEach(stage => {
      if (stage.Tasks && stage.Tasks.length > 0) {
        expanded[stage.StageID] = true;
      }
    });
    setExpandedStages(expanded);
  }, [stages, unassignedTasks]);

  // Verifica se è admin o manager
  const isAdminOrManager = useMemo(() => {
    return hasAdminOrManagerPermission(project, currentUserId);
  }, [project, currentUserId]);

  // Funzione per verificare se un task è in ritardo
  const isTaskDelayed = (task) => {
    if (task.Status === "COMPLETATA" || task.TaskDisabled) return false;
    const dueDate = new Date(task.DueDate);
    const today = new Date();
    return dueDate < today;
  };

  // Toggle espansione fase
  const toggleStage = (stageId) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }));
  };

  // Gestione pin task
  const handlePinTask = async (taskId, isPinned) => {
    try {
      setPinLoading(taskId);
      const action = isPinned ? 'UNPIN' : 'PIN';
      const result = await manageTaskPin(taskId, action);
      
      if (result.success) {
        setPinnedTasks(prev => {
          const newSet = new Set(prev);
          if (isPinned) {
            newSet.delete(taskId);
          } else {
            newSet.add(taskId);
          }
          return newSet;
        });
        
        setLocalTasks(prev => prev.map(task => 
          task.TaskID === taskId 
            ? { ...task, IsPinned: !isPinned, PinOrder: isPinned ? null : Date.now() }
            : task
        ));
        
        toast({
          title: isPinned ? "Pin rimosso" : "Attività fissata",
          description: result.msg,
          variant: "success",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Error pinning task:", error);
      toast({
        title: "Errore",
        description: "Errore nella gestione del pin",
        variant: "destructive",
      });
    } finally {
      setPinLoading(null);
    }
  };

  // Aggiorna task locale
  const updateLocalTask = (updatedTask) => {
    setLocalTasks((prev) =>
      prev.map((task) =>
        task.TaskID === updatedTask.TaskID ? { ...task, ...updatedTask } : task
      )
    );
  };

  // Gestione aggiornamento task
  const handleTaskUpdate = async (taskData, shouldCloseModal = false) => {
    try {
      setIsRefreshing(true);

      const task = localTasks.find((t) => t.TaskID === taskData.TaskID);
      const canEdit = canEditTask(project, task, currentUserId);

      if (!canEdit) {
        console.error("Permission denied: User cannot edit this task");
        return { success: false, error: "Permission denied" };
      }

      const formattedTaskData = {
        ...taskData,
        ProjectID: project.ProjectID,
      };

      updateLocalTask(formattedTaskData);

      const result = await onTaskUpdate(formattedTaskData);

      if (result && result.success) {
        if (result.task) {
          updateLocalTask(result.task);
        }
        return result;
      } else {
        return { success: false };
      }
    } catch (error) {
      console.error("Error updating task in table:", error);
      return { success: false };
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  };

  // Gestione spostamento task tra fasi
  const handleMoveTaskToStage = async (taskId, targetStageId) => {
    try {
      setIsRefreshing(true);
      const result = await assignTaskToStage(taskId, targetStageId);
      
      if (result.success) {
        // Refresh del progetto per ricaricare i dati
        window.location.reload(); // Semplice refresh per ora
        
        toast({
          title: "Attività spostata",
          description: targetStageId 
            ? `L'attività è stata assegnata alla fase selezionata`
            : "L'attività è stata rimossa dalla fase",
          variant: "success",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Error moving task:", error);
      toast({
        title: "Errore",
        description: "Errore nello spostamento dell'attività",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtra e ordina task
  const getFilteredAndSortedTasks = (tasks) => {
    let result = [...tasks];

    // Filtro per task in ritardo
    if (showDelayedOnly) {
      result = result.filter((task) => isTaskDelayed(task));
    }

    // Filtro di ricerca
    if (filter.trim()) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(
        (task) =>
          task.Title?.toLowerCase().includes(lowerFilter) ||
          task.Description?.toLowerCase().includes(lowerFilter) ||
          task.AssignedToName?.toLowerCase().includes(lowerFilter)
      );
    }

    // Separa task pinnati e non pinnati
    const pinnedTasksList = result.filter(task => pinnedTasks.has(task.TaskID));
    const unpinnedTasksList = result.filter(task => !pinnedTasks.has(task.TaskID));

    // Ordina i task pinnati per PinOrder
    pinnedTasksList.sort((a, b) => (a.PinOrder || 0) - (b.PinOrder || 0));

    // Ordina i task non pinnati
    if (sortConfig.key) {
      unpinnedTasksList.sort((a, b) => {
        if (a[sortConfig.key] === null) return 1;
        if (b[sortConfig.key] === null) return -1;

        if (sortConfig.key === "DueDate" || sortConfig.key === "StartDate") {
          return sortConfig.direction === "asc"
            ? new Date(a[sortConfig.key]) - new Date(b[sortConfig.key])
            : new Date(b[sortConfig.key]) - new Date(a[sortConfig.key]);
        }

        if (typeof a[sortConfig.key] === "string") {
          return sortConfig.direction === "asc"
            ? a[sortConfig.key].localeCompare(b[sortConfig.key])
            : b[sortConfig.key].localeCompare(a[sortConfig.key]);
        }

        return sortConfig.direction === "asc"
          ? a[sortConfig.key] - b[sortConfig.key]
          : b[sortConfig.key] - a[sortConfig.key];
      });
    }

    return [...pinnedTasksList, ...unpinnedTasksList];
  };

  // Richiedi ordinamento
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Conteggio task in ritardo
  const delayedTasksCount = localTasks.filter(isTaskDelayed).length;

  // Gestione ridimensionamento colonne
  const handleMouseDown = (e, index) => {
    e.preventDefault();
    setIsResizing(index);
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (isResizing === null) return;

      const table = tableRef.current?.querySelector('table');
      if (!table) return;

      const ths = table.querySelectorAll('thead th');
      const startX = ths[isResizing].getBoundingClientRect().left;
      const currentX = e.clientX;
      const diff = currentX - startX;
      
      setColumnWidths(prev => {
        const newWidths = [...prev];
        newWidths[isResizing] = Math.max(50, diff);
        return newWidths;
      });
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (isResizing !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Filtra task per fase selezionata
  const filteredTasksByStage = useMemo(() => {
    if (selectedStageFilter === "all") {
      return localTasks;
    } else if (selectedStageFilter === "unassigned") {
      return localTasks.filter(task => !task.StageID);
    } else {
      return localTasks.filter(task => task.StageID === parseInt(selectedStageFilter));
    }
  }, [localTasks, selectedStageFilter]);

  // Raggruppa task per fase
  const tasksByStage = useMemo(() => {
    const grouped = {
      unassigned: filteredTasksByStage.filter(task => !task.StageID)
    };
    
    stages.forEach(stage => {
      grouped[stage.StageID] = filteredTasksByStage.filter(
        task => task.StageID === stage.StageID
      );
    });
    
    return grouped;
  }, [filteredTasksByStage, stages]);

  return (
    <div className="h-full flex flex-col space-y-2">
      {/* Header con filtri */}
      <div className="flex-shrink-0 px-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            {/* Filtro per fase */}
            <Select value={selectedStageFilter} onValueChange={setSelectedStageFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tutte le fasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le fasi</SelectItem>
                <SelectItem value="unassigned">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    Non assegnate
                  </div>
                </SelectItem>
                {stages.map(stage => (
                  <SelectItem key={stage.StageID} value={stage.StageID.toString()}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.HexColor }}
                      />
                      {stage.StageName}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Ricerca */}
            <div className="relative">
              <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Cerca attività..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-8 w-[250px]"
              />
            </div>
          </div>

          {/* Checkbox per task in ritardo */}
          {delayedTasksCount > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-delayed"
                checked={showDelayedOnly}
                onCheckedChange={setShowDelayedOnly}
                className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
              />
              <Label
                htmlFor="show-delayed"
                className="text-sm font-medium cursor-pointer flex items-center gap-2"
              >
                Mostra solo attività in ritardo
                <Badge variant="destructive" className="ml-1">
                  {delayedTasksCount}
                </Badge>
              </Label>
            </div>
          )}
        </div>

        {/* Legenda */}
        <TasksLegend tasks={filteredTasksByStage} />
      </div>

      {/* Indicatore aggiornamento */}
      {isRefreshing && (
        <div className="flex items-center justify-center py-2 flex-shrink-0">
          <span className="text-sm text-blue-500">Aggiornamento...</span>
        </div>
      )}

      {/* Tabella */}
      <div 
        className="border rounded-md flex-1 min-h-0 overflow-hidden mx-4" 
        ref={tableRef}
        style={{ height: 'calc(100vh - 105px - 60px - 48px - 40px - 240px)' }}
      >
        <div className="relative w-full h-full overflow-auto">
          <Table className="w-full">
            <TableHeader className="sticky top-0 z-10 bg-gray-50">
              <TableRow>
                <TableHead style={{ width: `${columnWidths[0]}px` }}></TableHead>
                <TableHead
                  style={{ width: `${columnWidths[1]}px`, position: 'relative' }}
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort("Title")}
                >
                  Titolo{" "}
                  {sortConfig.key === "Title" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown(e, 1)}
                  />
                </TableHead>
                <TableHead
                  style={{ width: `${columnWidths[2]}px`, position: 'relative' }}
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort("AssignedToName")}
                >
                  Responsabile{" "}
                  {sortConfig.key === "AssignedToName" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown(e, 2)}
                  />
                </TableHead>
                <TableHead
                  style={{ width: `${columnWidths[3]}px`, position: 'relative' }}
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort("Status")}
                >
                  Stato{" "}
                  {sortConfig.key === "Status" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown(e, 3)}
                  />
                </TableHead>
                <TableHead
                  style={{ width: `${columnWidths[4]}px`, position: 'relative' }}
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort("DueDate")}
                >
                  Scadenza{" "}
                  {sortConfig.key === "DueDate" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown(e, 4)}
                  />
                </TableHead>
                <TableHead
                  style={{ width: `${columnWidths[5]}px`, position: 'relative' }}
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort("Priority")}
                >
                  Priorità{" "}
                  {sortConfig.key === "Priority" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown(e, 5)}
                  />
                </TableHead>
                <TableHead 
                  style={{ width: `${columnWidths[6]}px`, position: 'relative' }}
                  className="text-center"
                >
                  Commenti
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown(e, 6)}
                  />
                </TableHead>
                <TableHead 
                  style={{ width: `${columnWidths[7]}px`, position: 'relative' }}
                  className="text-center"
                >
                  Allegati
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown(e, 7)}
                  />
                </TableHead>
                <TableHead style={{ width: `${columnWidths[8]}px` }} className="text-center">
                  Azioni
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Task non assegnati */}
              {tasksByStage.unassigned.length > 0 && (selectedStageFilter === "all" || selectedStageFilter === "unassigned") && (
                <>
                  <TableRow className="bg-orange-50 hover:bg-orange-100">
                    <TableCell colSpan={9} className="py-2">
                      <Collapsible
                        open={expandedStages['unassigned']}
                        onOpenChange={() => toggleStage('unassigned')}
                      >
                        <CollapsibleTrigger className="flex items-center gap-2 w-full">
                          {expandedStages['unassigned'] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                          <span className="font-semibold">Attività da assegnare</span>
                          <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-800 border-orange-300">
                            {tasksByStage.unassigned.length}
                          </Badge>
                        </CollapsibleTrigger>
                      </Collapsible>
                    </TableCell>
                  </TableRow>
                  {expandedStages['unassigned'] && getFilteredAndSortedTasks(tasksByStage.unassigned).map((task) => {
                    const canManageTask = canEditTask(project, task, currentUserId);
                    const isPinned = pinnedTasks.has(task.TaskID);
                    
                    return (
                      <TableRow 
                        key={task.TaskID}
                        className={`
                          relative
                          ${task.TaskDisabled ? 'opacity-50 bg-gray-50' : ''}
                          ${isPinned ? 'bg-yellow-50 border-l-4 border-l-yellow-400' : ''}
                        `}
                        onClick={() => onTaskClick(task)}
                      >
                        <TableCell />
                        <TaskRow
                          task={task}
                          onTaskClick={onTaskClick}
                          onTaskUpdate={handleTaskUpdate}
                          canEdit={canManageTask && !task.TaskDisabled}
                          isAdminOrManager={isAdminOrManager}
                          project={{ ...project, allUsers: project.members }}
                          editingCell={editingCell}
                          setEditingCell={setEditingCell}
                          currentUserId={currentUserId}
                        />
                        
                        {/* Colonna azioni */}
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTaskClick(task);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizza
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              {/* Opzione per assegnare a fase */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Layers className="mr-2 h-4 w-4" />
                                    Assegna a fase
                                  </DropdownMenuItem>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  {stages.map(stage => (
                                    <DropdownMenuItem
                                      key={stage.StageID}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveTaskToStage(task.TaskID, stage.StageID);
                                      }}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-3 h-3 rounded-full"
                                          style={{ backgroundColor: stage.HexColor }}
                                        />
                                        {stage.StageName}
                                      </div>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePinTask(task.TaskID, isPinned);
                                }}
                                disabled={pinLoading === task.TaskID}
                              >
                                {isPinned ? (
                                  <>
                                    <PinOff className="mr-2 h-4 w-4" />
                                    Rimuovi pin
                                  </>
                                ) : (
                                  <>
                                    <Pin className="mr-2 h-4 w-4" />
                                    Fissa in alto
                                  </>
                                )}
                              </DropdownMenuItem>
                              
                              {canManageTask && onTaskDisable && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onTaskDisable(task);
                                    }}
                                    className={task.TaskDisabled ? "text-green-600" : "text-red-600"}
                                  >
                                    {task.TaskDisabled ? (
                                      <>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Riabilita
                                      </>
                                    ) : (
                                      <>
                                        <Ban className="mr-2 h-4 w-4" />
                                        Disabilita
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        
                        {/* Badge disabilitata sovrapposto */}
                        {task.TaskDisabled && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Badge 
                              variant="secondary" 
                              className="bg-red-100 text-red-700 border-red-200"
                            >
                              Disabilitata
                            </Badge>
                          </div>
                        )}
                        
                        {/* Indicatore pin */}
                        {isPinned && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Pin className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-600" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Attività fissata</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableRow>
                    );
                  })}
                </>
              )}

              {/* Task per fase */}
              {stages.map(stage => {
                if (tasksByStage[stage.StageID].length === 0) return null;
                if (selectedStageFilter !== "all" && selectedStageFilter !== stage.StageID.toString()) return null;
                
                return (
                  <React.Fragment key={stage.StageID}>
                    <TableRow 
                      className={`
                        hover:bg-gray-50
                        ${stage.GateStatus === "APPROVED" ? "bg-green-50" : "bg-gray-50"}
                      `}
                    >
                      <TableCell colSpan={9} className="py-2">
                        <Collapsible
                          open={expandedStages[stage.StageID]}
                          onOpenChange={() => toggleStage(stage.StageID)}
                        >
                          <CollapsibleTrigger className="flex items-center gap-2 w-full">
                            {expandedStages[stage.StageID] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: stage.HexColor }}
                            />
                            <Layers className="h-4 w-4 text-gray-600" />
                            <span className="font-semibold">{stage.StageName}</span>
                            <Badge variant="outline" className="ml-2">
                              {tasksByStage[stage.StageID].length}
                            </Badge>
                            {stage.IsGateRequired && stage.GateStatus === "APPROVED" && (
                              <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">
                                <Lock className="h-3 w-3 mr-1" />
                                Approvata
                              </Badge>
                            )}
                          </CollapsibleTrigger>
                        </Collapsible>
                      </TableCell>
                    </TableRow>
                    
                    {expandedStages[stage.StageID] && getFilteredAndSortedTasks(tasksByStage[stage.StageID]).map((task) => {
                      const canManageTask = canEditTask(project, task, currentUserId);
                      const isPinned = pinnedTasks.has(task.TaskID);
                      
                      return (
                        <TableRow 
                          key={task.TaskID}
                          className={`
                            relative
                            ${task.TaskDisabled ? 'opacity-50 bg-gray-50' : ''}
                            ${isPinned ? 'bg-yellow-50 border-l-4 border-l-yellow-400' : ''}
                          `}
                          onClick={() => onTaskClick(task)}
                        >
                          <TableCell />
                          <TaskRow
                            task={task}
                            onTaskClick={onTaskClick}
                            onTaskUpdate={handleTaskUpdate}
                            canEdit={canManageTask && !task.TaskDisabled}
                            isAdminOrManager={isAdminOrManager}
                            project={{ ...project, allUsers: project.members }}
                            editingCell={editingCell}
                            setEditingCell={setEditingCell}
                            currentUserId={currentUserId}
                          />
                          
                          {/* Colonna azioni */}
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTaskClick(task);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Visualizza
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                
                                {/* Opzione per cambiare fase */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <Layers className="mr-2 h-4 w-4" />
                                      Sposta in fase
                                    </DropdownMenuItem>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    {stages.filter(s => s.StageID !== stage.StageID).map(targetStage => (
                                      <DropdownMenuItem
                                        key={targetStage.StageID}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveTaskToStage(task.TaskID, targetStage.StageID);
                                        }}
                                      >
                                        <div className="flex items-center gap-2">
                                          <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: targetStage.HexColor }}
                                          />
                                          {targetStage.StageName}
                                        </div>
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveTaskToStage(task.TaskID, null);
                                      }}
                                    >
                                      <AlertCircle className="mr-2 h-4 w-4 text-orange-600" />
                                      Rimuovi da fase
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePinTask(task.TaskID, isPinned);
                                  }}
                                  disabled={pinLoading === task.TaskID}
                                >
                                  {isPinned ? (
                                    <>
                                      <PinOff className="mr-2 h-4 w-4" />
                                      Rimuovi pin
                                    </>
                                  ) : (
                                    <>
                                      <Pin className="mr-2 h-4 w-4" />
                                      Fissa in alto
                                    </>
                                  )}
                                </DropdownMenuItem>
                                
                                {canManageTask && onTaskDisable && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onTaskDisable(task);
                                      }}
                                      className={task.TaskDisabled ? "text-green-600" : "text-red-600"}
                                    >
                                      {task.TaskDisabled ? (
                                        <>
                                          <CheckCircle2 className="mr-2 h-4 w-4" />
                                          Riabilita
                                        </>
                                      ) : (
                                        <>
                                          <Ban className="mr-2 h-4 w-4" />
                                          Disabilita
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          
                          {/* Badge disabilitata sovrapposto */}
                          {task.TaskDisabled && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <Badge 
                                variant="secondary" 
                                className="bg-red-100 text-red-700 border-red-200"
                              >
                                Disabilitata
                              </Badge>
                            </div>
                          )}
                          
                          {/* Indicatore pin */}
                          {isPinned && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Pin className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-600" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Attività fissata</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {filteredTasksByStage.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-10 text-gray-500"
                  >
                    {filter || showDelayedOnly || selectedStageFilter !== "all"
                      ? "Nessuna attività corrisponde ai criteri di ricerca"
                      : "Nessuna attività disponibile per questo progetto"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default ProjectStagesTable;