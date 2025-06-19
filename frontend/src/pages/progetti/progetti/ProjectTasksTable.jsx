import React, { useState, useEffect, useMemo } from "react";
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
import TasksLegend from "./TasksLegend";
import TaskRow from "./TaskRow";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import {
  hasAdminOrManagerPermission,
  canEditTask,
} from "@/lib/taskPermissionsUtils";

const ProjectTasksTableImproved = ({
  project,
  tasks = [],
  onTaskClick,
  onTaskUpdate,
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { users } = useNotifications();

  useEffect(() => {
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

  const isTaskDelayed = (task) => {
    if (task.Status === "COMPLETATA") return false;
    const dueDate = new Date(task.DueDate);
    dueDate.setHours(23, 59, 59);
    return dueDate < new Date();
  };

  const sortedAndFilteredTasks = useMemo(() => {
    let result = [...localTasks];

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

    if (sortConfig.key) {
      result.sort((a, b) => {
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

    return result;
  }, [localTasks, sortConfig, filter, showDelayedOnly]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const delayedTasksCount = localTasks.filter(isTaskDelayed).length;

  return (
    <div className="h-full flex flex-col space-y-2">
      {/* Legenda con filtro di ricerca integrato */}
      <div className="flex-shrink-0">
        <TasksLegend
          tasks={localTasks}
          searchValue={filter}
          onSearchChange={setFilter}
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
      >
        <div className="relative w-full h-full overflow-auto">
          <Table id="tasks-table" className="w-full">
            <TableHeader className="sticky top-0 z-10 bg-gray-50">
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort("Title")}
                >
                  Titolo{" "}
                  {sortConfig.key === "Title" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort("AssignedToName")}
                >
                  Responsabile{" "}
                  {sortConfig.key === "AssignedToName" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort("Status")}
                >
                  Stato{" "}
                  {sortConfig.key === "Status" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort("DueDate")}
                >
                  Scadenza{" "}
                  {sortConfig.key === "DueDate" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort("Priority")}
                >
                  Priorità{" "}
                  {sortConfig.key === "Priority" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead className="text-center">Commenti</TableHead>
                <TableHead className="text-center">Allegati</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredTasks.map((task) => (
                <TaskRow
                  key={task.TaskID}
                  task={task}
                  onTaskClick={onTaskClick}
                  onTaskUpdate={handleTaskUpdate}
                  canEdit={canEditTask(project, task, currentUserId)}
                  isAdminOrManager={isAdminOrManager}
                  project={{ ...project, allUsers: users }}
                  editingCell={editingCell}
                  setEditingCell={setEditingCell}
                  currentUserId={currentUserId}
                />
              ))}

              {sortedAndFilteredTasks.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
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