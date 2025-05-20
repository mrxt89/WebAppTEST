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

const UpdatedProjectTasksTable = ({
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
  const { users } = useNotifications(); // Ottieni tutti gli utenti dal contesto

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Ottieni il ruolo dell'utente corrente per autorizzazioni
  const isAdminOrManager = useMemo(() => {
    return hasAdminOrManagerPermission(project, currentUserId);
  }, [project, currentUserId]);

  // Aggiorniamo immediatamente i task locali quando l'utente ne modifica uno
  const updateLocalTask = (updatedTask) => {
    setLocalTasks((prev) =>
      prev.map((task) =>
        task.TaskID === updatedTask.TaskID ? { ...task, ...updatedTask } : task,
      ),
    );
  };

  // Versione modificata della funzione onTaskUpdate che controlla i permessi
  const handleTaskUpdate = async (taskData) => {
    try {
      setIsRefreshing(true);

      // Verifica permessi in base al campo che si sta aggiornando
      const task = localTasks.find((t) => t.TaskID === taskData.TaskID);
      const canEdit = canEditTask(project, task, currentUserId);

      if (!canEdit) {
        console.error("Permission denied: User cannot edit this task");
        return { success: false, error: "Permission denied" };
      }

      // Controlli specifici per campi sensibili
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

      // Assicuriamoci che formattedTaskData.ProjectID sia definito
      const formattedTaskData = {
        ...taskData,
        ProjectID: project.ProjectID,
      };

      // Assicuriamoci che AssignedTo sia un numero
      if (
        formattedTaskData.AssignedTo &&
        typeof formattedTaskData.AssignedTo === "string"
      ) {
        formattedTaskData.AssignedTo = parseInt(formattedTaskData.AssignedTo);
      }

      // Log dei dati che stiamo inviando
      console.log("UpdatedProjectTasksTable invia:", formattedTaskData);

      // Aggiorna immediatamente il task locale per un feedback più veloce
      updateLocalTask(formattedTaskData);

      // Chiama la funzione onTaskUpdate del componente padre
      const result = await onTaskUpdate(formattedTaskData);

      if (result && result.success) {
        console.log("Aggiornamento riuscito:", result);

        // Aggiorna nuovamente i dati locali con i dati ritornati
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

  // Verifica se una task è in ritardo
  const isTaskDelayed = (task) => {
    if (task.Status === "COMPLETATA") return false;
    const dueDate = new Date(task.DueDate);
    dueDate.setHours(23, 59, 59);
    return dueDate < new Date();
  };

  // Funzione per ordinare i task
  const sortedAndFilteredTasks = useMemo(() => {
    let result = [...localTasks];

    // Filtra per task in ritardo se checkbox selezionata
    if (showDelayedOnly) {
      result = result.filter((task) => isTaskDelayed(task));
    }

    // Filtra per testo di ricerca
    if (filter.trim()) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(
        (task) =>
          task.Title?.toLowerCase().includes(lowerFilter) ||
          task.Description?.toLowerCase().includes(lowerFilter) ||
          task.AssignedToName?.toLowerCase().includes(lowerFilter),
      );
    }

    // Ordina
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

  // Funzione per gestire il click sulla intestazione di colonna per ordinare
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Calcola il numero di task in ritardo
  const delayedTasksCount = localTasks.filter(isTaskDelayed).length;

  return (
    <div className="space-y-4">
      {/* Legenda con filtro di ricerca integrato */}
      <TasksLegend
        tasks={localTasks}
        searchValue={filter}
        onSearchChange={setFilter}
      />

      {/* Checkbox per filtrare le attività in ritardo */}
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

      {/* Indicatore di aggiornamento */}
      {isRefreshing && (
        <div className="flex items-center justify-center py-2">
          <span className="text-sm text-blue-500">Aggiornamento...</span>
        </div>
      )}

      {/* Tabella */}
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-gray-50">
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
                project={{ ...project, allUsers: users }} // Passa il progetto con tutti gli utenti
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
  );
};

export default UpdatedProjectTasksTable;
