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
import { Button } from "@/components/ui/button";
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
import TasksLegend from "./TasksLegend";
import TaskRow from "./TaskRow";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import {
  hasAdminOrManagerPermission,
  canEditTask,
} from "@/lib/taskPermissionsUtils";
import { MoreVertical, Eye, Ban, CheckCircle2, Pin, PinOff, Users, FileSymlink } from "lucide-react";
import useProjectActions from "../../../hooks/useProjectManagementActions";
import { toast } from "@/components/ui/use-toast";

const ProjectTasksTableImproved = ({
  project,
  tasks = [],
  onTaskClick,
  onTaskUpdate,
  onTaskDisable,
  currentUserId,
}) => {
  const [localTasks, setLocalTasks] = useState([]);
  const [editingCell, setEditingCell] = useState({ taskId: null, field: null });
  const [sortConfig, setSortConfig] = useState({
    key: "TaskSequence",
    direction: "asc",
  });
  const [filter, setFilter] = useState("");
  const [showDelayedOnly, setShowDelayedOnly] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { users } = useNotifications();
  const { manageTaskPin } = useProjectActions();

  // Stati per gestire i pin
  const [pinnedTasks, setPinnedTasks] = useState(new Set());
  const [pinLoading, setPinLoading] = useState(null);

  // Stati per il ridimensionamento delle colonne
  const [columnWidths, setColumnWidths] = useState([
    250, // title
    200, // responsible
    150, // participants
    150, // status
    120, // dueDate
    100, // priority
    80,  // comments
    80,  // attachments
    60   // actions
  ]);
  const [isResizing, setIsResizing] = useState(null);
  const tableRef = useRef(null);

  useEffect(() => {
    // Estrai i task già pinnati dai dati
    const pinned = new Set(
      tasks.filter(task => task.IsPinned).map(task => task.TaskID)
    );
    setPinnedTasks(pinned);
    setLocalTasks(tasks);
  }, [tasks]);

  const isAdminOrManager = useMemo(() => {
    return hasAdminOrManagerPermission(project, currentUserId);
  }, [project, currentUserId]);

  const updateLocalTask = (updatedTask) => {
    setLocalTasks((prev) =>
      prev.map((task) =>
        task.TaskID === updatedTask.TaskID ? { ...task, ...updatedTask } : task,
      ),
    );
  };

  const handleTaskUpdate = async (taskData, shouldCloseModal = false) => {
    try {
      setIsRefreshing(true);

      const task = localTasks.find((t) => t.TaskID === taskData.TaskID);
      const canEdit = canEditTask(project, task, currentUserId);

      if (!canEdit) {
        console.error("Permission denied: User cannot edit this task");
        return { success: false, error: "Permission denied" };
      }

      if (taskData.AssignedTo !== task.AssignedTo && !isAdminOrManager) {
        console.error(
          "Permission denied: Only admin/manager can change task assignee",
        );
        return { success: false, error: "Permission denied" };
      }

      if (taskData.Priority !== task.Priority && !isAdminOrManager) {
        console.error(
          "Permission denied: Only admin/manager can change task priority",
        );
        return { success: false, error: "Permission denied" };
      }

      if (
        (taskData.Title !== task.Title ||
          taskData.Description !== task.Description) &&
        !isAdminOrManager
      ) {
        console.error(
          "Permission denied: Only admin/manager can change task title/description",
        );
        return { success: false, error: "Permission denied" };
      }

      const formattedTaskData = {
        ...taskData,
        ProjectID: project.ProjectID,
      };

      if (
        formattedTaskData.AssignedTo &&
        typeof formattedTaskData.AssignedTo === "string"
      ) {
        formattedTaskData.AssignedTo = parseInt(formattedTaskData.AssignedTo);
      }

      console.log("ProjectTasksTableImproved invia:", formattedTaskData);

      updateLocalTask(formattedTaskData);

      const result = await onTaskUpdate(formattedTaskData);

      if (result && result.success) {
        console.log("Aggiornamento riuscito:", result);

        if (result.task) {
          updateLocalTask(result.task);
        }

        return result;
      } else {
        console.error("Aggiornamento non riuscito:", result);
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
        
        // Aggiorna lo stato locale del task
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

  const isTaskDelayed = (task) => {
    if (task.Status === "COMPLETATA" || task.TaskDisabled) return false;
    const dueDate = new Date(task.DueDate);
    dueDate.setHours(23, 59, 59);
    return dueDate < new Date();
  };

  const sortedAndFilteredTasks = useMemo(() => {
    let result = [...localTasks];

    // Filtro per stati selezionati
    if (selectedStatuses.length > 0) {
      result = result.filter((task) => selectedStatuses.includes(task.Status));
    }

    if (showDelayedOnly) {
      result = result.filter((task) => isTaskDelayed(task));
    }

    if (filter.trim()) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(
        (task) =>
          task.Title?.toLowerCase().includes(lowerFilter) ||
          task.Description?.toLowerCase().includes(lowerFilter) ||
          task.AssignedToName?.toLowerCase().includes(lowerFilter),
      );
    }

    // Separa i task pinnati da quelli non pinnati
    const pinnedTasksList = result.filter(task => pinnedTasks.has(task.TaskID));
    const unpinnedTasksList = result.filter(task => !pinnedTasks.has(task.TaskID));

    // Ordina i task pinnati per PinOrder
    pinnedTasksList.sort((a, b) => (a.PinOrder || 0) - (b.PinOrder || 0));

    // Ordina i task non pinnati secondo il criterio selezionato
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

    // Combina prima i pinnati, poi i non pinnati
    return [...pinnedTasksList, ...unpinnedTasksList];
  }, [localTasks, sortConfig, filter, showDelayedOnly, selectedStatuses, pinnedTasks]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const delayedTasksCount = localTasks.filter(isTaskDelayed).length;

  // Gestione del ridimensionamento delle colonne
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

  return (
    <div className="h-full flex flex-col space-y-2">
      {/* Legenda con filtro di ricerca integrato */}
      <div className="flex-shrink-0">
        <TasksLegend
          tasks={localTasks}
          searchValue={filter}
          onSearchChange={setFilter}
          selectedStatuses={selectedStatuses}
          onStatusFilterChange={setSelectedStatuses}
        />
      </div>

      {/* Checkbox per filtrare le attività in ritardo */}
      {delayedTasksCount > 0 && (
        <div className="flex items-center gap-2 flex-shrink-0">
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

      {/* Indicatore di aggiornamento */}
      {isRefreshing && (
        <div className="flex items-center justify-center py-2 flex-shrink-0">
          <span className="text-sm text-blue-500">Aggiornamento...</span>
        </div>
      )}

      {/* Contenitore tabella con altezza calcolata dinamicamente */}
      <div 
        className="border rounded-md flex-1 min-h-0 overflow-hidden" 
        id="tasks-table-container"
        style={{ 
          height: 'calc(100vh - 105px - 60px - 48px - 40px - 180px)' 
        }}
        ref={tableRef}
      >
        <div className="relative w-full h-full overflow-auto">
          <Table id="tasks-table" className="w-full">
            <TableHeader className="sticky top-0 z-10 bg-gray-50">
              <TableRow>
                <TableHead
                  style={{ width: `${columnWidths[0]}px`, position: 'relative' }}
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort("Title")}
                >
                  Titolo{" "}
                  {sortConfig.key === "Title" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown(e, 0)}
                  />
                </TableHead>
                <TableHead
                  style={{ width: `${columnWidths[1]}px`, position: 'relative' }}
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort("AssignedToName")}
                >
                  Responsabile{" "}
                  {sortConfig.key === "AssignedToName" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown(e, 1)}
                  />
                </TableHead>
                <TableHead
                  style={{ width: `${columnWidths[2]}px`, position: 'relative' }}
                  className="hover:bg-gray-100"
                >
                  Partecipanti
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
              {sortedAndFilteredTasks.map((task) => {
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
                    <TaskRow
                      task={task}
                      onTaskClick={onTaskClick}
                      onTaskUpdate={handleTaskUpdate}
                      canEdit={canManageTask && !task.TaskDisabled}
                      isAdminOrManager={isAdminOrManager}
                      project={{ ...project, allUsers: users }}
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
                          
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              const prj = encodeURIComponent(project?.Name || task.ProjectName || "");
                              const stp = task.TaskSequence != null ? task.TaskSequence : "";
                              const ute = currentUserId ?? "";
                              const url = `http://192.168.42.118/ricos/webapp/wap_01.asp?prj=${prj}&stp=${stp}&ute=${ute}`;
                              window.open(url, "_blank", "noopener");
                            }}
                          >
                            <FileSymlink className="mr-2 h-4 w-4" />
                            Apri in gestione fasi
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
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

              {sortedAndFilteredTasks.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-10 text-gray-500"
                  >
                    {filter
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

export default ProjectTasksTableImproved;