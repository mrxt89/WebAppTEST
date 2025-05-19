import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { swal } from "../../../lib/common";
import {
  Loader2,
  ListTodo,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  X,
  AlertTriangle,
  Clock,
  BarChart3,
  PieChart,
  Plus,
} from "lucide-react";
import TasksViewToggler from "./TasksViewToggler";
import useProjectActions from "../../../hooks/useProjectManagementActions";
import TaskDetailsDialog from "../progetti/TaskDetailsDialog";
import TimesheetTaskDialog from "./TimesheetTaskDialog";
import MyTasksFilters from "./MyTasksFilters";
import MyTasksList from "./MyTasksList";
import MyTasksKanban from "./MyTasksKanban";
import MyTasksTimelineView from "./MyTasksTimelineView";
import MyTasksTimeTracking from "./MyTasksTimeTracking";
import TasksStatistics from "./TasksStatistics";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import { useAuth } from "@/context/AuthContext";

const MyTasksPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [viewMode, setViewMode] = useState("list");
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false); // Nuovo stato per il dialog di creazione
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [preventDialogOpen, setPreventDialogOpen] = useState(false);
  const [columnFilters, setColumnFilters] = useState({});
  const { fetchUsers, users } = useNotifications();
  const [activeTab, setActiveTab] = useState("tasks");
  const { user, userGroups } = useAuth();

  const [filters, setFilters] = useState({
    searchText: "",
    priority: "all",
    status: "all",
    dueDate: "all",
    projectId: "all",
    involvedUser: null, // Nuovo filtro per utente coinvolto
    sortBy: "dueDate",
    sortDirection: "asc",
  });

  const {
    getUserTasks,
    addUpdateProjectTask,
    updateTaskStatus,
    addTaskComment,
    checkAdminPermission,
    isOwnTask,
  } = useProjectActions();

  // Verifica se l'utente è un amministratore
  const isUserAdmin = useMemo(() => {
    return userGroups.some(
      (g) =>
        g.groupName.toUpperCase() === "ADMIN" ||
        g.groupName.toUpperCase() === "RESPONSABILI PROGETTI",
    );
  }, [userGroups]);

  // Funzione per caricare le attività dell'utente
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const userTasks = await getUserTasks();
      setTasks(userTasks);
      applyFilters(userTasks, filters, columnFilters);
    } catch (error) {
      console.error("Error loading tasks:", error);
      swal.fire("Errore", "Errore nel caricamento delle attività", "error");
    } finally {
      setLoading(false);
    }
  }, [getUserTasks]);

  // Caricamento iniziale
  useEffect(() => {
    const init = async () => {
      await fetchUsers();
      await loadTasks();
    };

    init();
  }, []);

  // Applica i filtri e l'ordinamento alle attività
  const applyFilters = useCallback(
    (tasksList, mainFilters, colFilters = {}) => {
      let result = [...tasksList];

      // [Contenuto esistente della funzione applyFilters...]

      // Filtraggio con filtri principali
      if (mainFilters.searchText) {
        const searchLower = mainFilters.searchText.toLowerCase();
        result = result.filter(
          (task) =>
            task.Title?.toLowerCase().includes(searchLower) ||
            task.Description?.toLowerCase().includes(searchLower),
        );
      }

      if (mainFilters.priority !== "all") {
        result = result.filter(
          (task) => task.Priority === mainFilters.priority,
        );
      }

      if (mainFilters.status !== "all") {
        result = result.filter((task) => task.Status === mainFilters.status);
      }

      if (mainFilters.projectId !== "all") {
        result = result.filter(
          (task) => task.ProjectID.toString() === mainFilters.projectId,
        );
      }

      // Nuovo filtro per utente coinvolto
      if (mainFilters.involvedUser) {
        const involvedUserId = parseInt(mainFilters.involvedUser);
        result = result.filter((task) => {
          // Controlla se l'utente è l'assegnatario principale
          if (task.AssignedTo === involvedUserId) {
            return true;
          }

          // Controlla se l'utente è tra i partecipanti
          try {
            const participants = task.Participants
              ? typeof task.Participants === "string"
                ? JSON.parse(task.Participants)
                : task.Participants
              : [];

            return participants.some((p) => {
              const userId = typeof p === "object" ? p.userId : p;
              return userId === involvedUserId;
            });
          } catch (e) {
            console.error("Error parsing participants:", e);
            return false;
          }
        });
      }

      if (mainFilters.dueDate !== "all") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        result = result.filter((task) => {
          const dueDate = new Date(task.DueDate);
          dueDate.setHours(0, 0, 0, 0);

          switch (mainFilters.dueDate) {
            case "today":
              return dueDate.getTime() === today.getTime();
            case "tomorrow":
              return dueDate.getTime() === tomorrow.getTime();
            case "week":
              return dueDate > today && dueDate <= nextWeek;
            case "month":
              return dueDate > today && dueDate <= nextMonth;
            case "late":
              return dueDate < today && task.Status !== "COMPLETATA";
            default:
              return true;
          }
        });
      }

      // Filtraggio con filtri di colonna
      if (colFilters.title) {
        const titleFilter = colFilters.title.toLowerCase();
        result = result.filter((task) =>
          task.Title?.toLowerCase().includes(titleFilter),
        );
      }

      if (colFilters.project) {
        const projectFilter = colFilters.project.toLowerCase();
        result = result.filter((task) =>
          task.ProjectName?.toLowerCase().includes(projectFilter),
        );
      }

      if (colFilters.status) {
        result = result.filter((task) => task.Status === colFilters.status);
      }

      if (colFilters.priority) {
        result = result.filter((task) => task.Priority === colFilters.priority);
      }

      if (colFilters.dueDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        result = result.filter((task) => {
          if (!task.DueDate) return false;

          const dueDate = new Date(task.DueDate);
          dueDate.setHours(0, 0, 0, 0);

          switch (colFilters.dueDate) {
            case "inRitardo":
              return dueDate < today && task.Status !== "COMPLETATA";
            case "oggi":
              return dueDate.getTime() === today.getTime();
            case "domani":
              return dueDate.getTime() === tomorrow.getTime();
            case "settimana":
              return dueDate > today && dueDate <= nextWeek;
            case "mese":
              return dueDate > today && dueDate.getMonth() === today.getMonth();
            default:
              return true;
          }
        });
      }

      if (colFilters.assignedTo && isUserAdmin) {
        const assignedFilter = colFilters.assignedTo.toLowerCase();
        result = result.filter((task) =>
          task.AssignedToName?.toLowerCase().includes(assignedFilter),
        );
      }

      if (colFilters.participants && isUserAdmin) {
        const participantsFilter = colFilters.participants.toLowerCase();
        result = result.filter((task) => {
          if (!task.Participants) return false;

          try {
            const participants =
              typeof task.Participants === "string"
                ? JSON.parse(task.Participants)
                : task.Participants;

            return participants.some(
              (p) =>
                `${p.firstName} ${p.lastName}`
                  .toLowerCase()
                  .includes(participantsFilter) ||
                p.role?.toLowerCase().includes(participantsFilter),
            );
          } catch (e) {
            return false;
          }
        });
      }

      // Ordinamento
      const sortBy = colFilters.sortBy || mainFilters.sortBy || "dueDate";
      const sortDirection =
        colFilters.sortDirection || mainFilters.sortDirection || "asc";

      result.sort((a, b) => {
        let valueA, valueB;

        switch (sortBy) {
          case "dueDate":
            valueA = new Date(a.DueDate || 0).getTime();
            valueB = new Date(b.DueDate || 0).getTime();
            break;
          case "priority":
            const priorityWeight = { ALTA: 3, MEDIA: 2, BASSA: 1 };
            valueA = priorityWeight[a.Priority] || 0;
            valueB = priorityWeight[b.Priority] || 0;
            break;
          case "project":
            valueA = a.ProjectName || "";
            valueB = b.ProjectName || "";
            break;
          case "title":
            valueA = a.Title || "";
            valueB = b.Title || "";
            break;
          case "status":
            valueA = a.Status || "";
            valueB = b.Status || "";
            break;
          case "assignedTo":
            valueA = a.AssignedToName || "";
            valueB = b.AssignedToName || "";
            break;
          default:
            valueA = new Date(a.DueDate || 0).getTime();
            valueB = new Date(b.DueDate || 0).getTime();
        }

        // Per le stringhe
        if (typeof valueA === "string" && typeof valueB === "string") {
          return sortDirection === "asc"
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        }

        // Per numeri e date
        return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      });

      setFilteredTasks(result);
    },
    [isUserAdmin],
  );

  // Aggiorna i filtri e riapplica
  const handleFilterChange = (newFilters) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    applyFilters(tasks, updatedFilters, columnFilters);
  };

  // Gestione del filtro delle colonne
  const handleColumnFilterChange = (newFilters) => {
    setColumnFilters(newFilters);
    applyFilters(tasks, filters, newFilters);
  };

  // Reset dei filtri
  const resetFilters = () => {
    const defaultFilters = {
      searchText: "",
      priority: "all",
      status: "all",
      dueDate: "all",
      projectId: "all",
      involvedUser: null, // Reset anche del nuovo filtro
      sortBy: "dueDate",
      sortDirection: "asc",
    };
    setFilters(defaultFilters);
    setColumnFilters({});
    applyFilters(tasks, defaultFilters, {});
  };

  // Verifica se ci sono filtri attivi
  const hasActiveFilters = () => {
    return (
      filters.searchText !== "" ||
      filters.priority !== "all" ||
      filters.status !== "all" ||
      filters.dueDate !== "all" ||
      filters.projectId !== "all" ||
      filters.involvedUser !== null ||
      Object.keys(columnFilters).length > 0
    );
  };

  // Gestione del click su un'attività
  const handleTaskClick = (task) => {
    if (!preventDialogOpen) {
      setSelectedTask(task);
      setIsTaskDialogOpen(true);
    }
  };

  // Aggiornamento di un'attività
  const handleTaskUpdate = async (taskData, shouldCloseModal = false) => {
    try {
      setPreventDialogOpen(true);

      // Composizione dati per l'API
      const completeTaskData = {
        ...taskData,
        ProjectID: taskData.ProjectID,
      };

      // Conversione AssignedTo in numero se necessario
      if (typeof completeTaskData.AssignedTo === "string") {
        completeTaskData.AssignedTo = parseInt(completeTaskData.AssignedTo);
      }

      // Formattazione date
      if (
        completeTaskData.DueDate &&
        typeof completeTaskData.DueDate === "string"
      ) {
        if (!completeTaskData.DueDate.includes("T")) {
          completeTaskData.DueDate = completeTaskData.DueDate + "T00:00:00";
        }
      }

      const result = await addUpdateProjectTask(completeTaskData);

      if (result.success) {
        // Aggiornamento locale delle attività
        setTasks((prev) =>
          prev.map((t) =>
            t.TaskID === completeTaskData.TaskID
              ? { ...t, ...completeTaskData }
              : t,
          ),
        );

        // Aggiorna i filtri applicati
        applyFilters(
          tasks.map((t) =>
            t.TaskID === completeTaskData.TaskID
              ? { ...t, ...completeTaskData }
              : t,
          ),
          filters,
          columnFilters,
        );

        // Gestione modale
        if (
          shouldCloseModal ||
          completeTaskData.Status !== selectedTask?.Status
        ) {
          setIsTaskDialogOpen(false);
          setSelectedTask(null);
        } else if (selectedTask?.TaskID === completeTaskData.TaskID) {
          setSelectedTask((prev) => ({ ...prev, ...completeTaskData }));
        }

        // Notifica solo se richiesto
        if (shouldCloseModal) {
          swal.fire({
            title: "Successo",
            text: "Attività aggiornata con successo",
            icon: "success",
            timer: 1500,
            timerProgressBar: true,
            showConfirmButton: false,
          });
        }

        // Ricarica tutte le attività
        await loadTasks();

        return { success: true, task: { ...completeTaskData } };
      }
      return { success: false };
    } catch (error) {
      console.error("Error updating task:", error);
      swal.fire("Errore", "Errore nell'aggiornamento dell'attività", "error");
      return { success: false };
    } finally {
      setTimeout(() => {
        setPreventDialogOpen(false);
      }, 300);
    }
  };

  // Gestione commenti
  const handleAddComment = async (taskId, comment) => {
    try {
      const result = await addTaskComment(taskId, comment);
      if (result.success) {
        await loadTasks();

        // Aggiorna il task selezionato con i nuovi dati
        const updatedTask = tasks.find((t) => t.TaskID === taskId);
        if (updatedTask) {
          setSelectedTask(updatedTask);
        }
        return result;
      }
      return { success: false };
    } catch (error) {
      console.error("Error adding comment:", error);
      swal.fire("Errore", "Errore nell'aggiunta del commento", "error");
      return { success: false };
    }
  };

  // Estrai i progetti unici dalle attività per i filtri
  const getUniqueProjects = () => {
    const uniqueProjects = {};
    tasks.forEach((task) => {
      if (task.ProjectID && task.ProjectName) {
        uniqueProjects[task.ProjectID] = task.ProjectName;
      }
    });
    return Object.entries(uniqueProjects).map(([id, name]) => ({ id, name }));
  };

  // Funzione per mostrare/nascondere i filtri
  const toggleFilters = () => {
    setFiltersVisible(!filtersVisible);
  };

  return (
    <div className="p-6 mx-auto space-y-6">
      {/* Header con titolo, tabs e toggles */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Le mie attività</h1>

        {/* Pulsante "Crea attività" sempre visibile nella parte superiore della pagina */}
        <Button onClick={() => setIsCreateTaskDialogOpen(true)} className="">
          <Plus className="h-4 w-4 mr-2" />
          Crea nuova attività
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* Tabs per passare tra attività e timesheet */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
          id="tabs"
        >
          <div className="flex items-center justify-between" id="tabsList">
            <TabsList className="mb-4">
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                <span>Attività</span>
              </TabsTrigger>
              <TabsTrigger
                value="timesheet"
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                <span>Ore lavorate</span>
              </TabsTrigger>
            </TabsList>

            {activeTab === "tasks" && (
              <TasksViewToggler
                className="flex items-center gap-2"
                viewMode={viewMode}
                setViewMode={setViewMode}
                showFilters={filtersVisible}
                toggleFilters={toggleFilters}
              />
            )}
          </div>

          <TabsContent value="tasks" className="space-y-6">
            {/* Contenuto della tab attività */}
            {filtersVisible && (
              <MyTasksFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onResetFilters={resetFilters}
                hasActiveFilters={hasActiveFilters()}
                uniqueProjects={getUniqueProjects()}
                allUsers={users} // Passaggio degli utenti per il filtro coinvolgimento
              />
            )}

            {/* Visualizzazione attività (lista, kanban, timeline o statistiche) */}
            <Card className="flex-1">
              <CardContent className="p-4" id="tasksContent">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
                    <span className="text-gray-500">
                      Caricamento attività...
                    </span>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <ListTodo className="h-12 w-12 mb-4" />
                    <p className="text-lg font-medium">
                      Nessuna attività trovata
                    </p>
                    {hasActiveFilters() && (
                      <Button
                        variant="link"
                        onClick={resetFilters}
                        className="mt-2"
                      >
                        Rimuovi filtri
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {viewMode === "list" && (
                      <MyTasksList
                        tasks={filteredTasks}
                        onTaskClick={handleTaskClick}
                        onTaskUpdate={handleTaskUpdate}
                        checkAdminPermission={checkAdminPermission}
                        isOwnTask={isOwnTask}
                        filtersVisible={filtersVisible}
                        isAdmin={isUserAdmin}
                        columnFilters={columnFilters}
                        onFilterChange={handleColumnFilterChange}
                      />
                    )}

                    {viewMode === "kanban" && (
                      <MyTasksKanban
                        tasks={filteredTasks}
                        onTaskClick={handleTaskClick}
                        onTaskUpdate={handleTaskUpdate}
                        checkAdminPermission={checkAdminPermission}
                        isOwnTask={isOwnTask}
                      />
                    )}

                    {viewMode === "timeline" && (
                      <MyTasksTimelineView
                        tasks={filteredTasks}
                        onTaskClick={handleTaskClick}
                        onTaskUpdate={handleTaskUpdate}
                        checkAdminPermission={checkAdminPermission}
                        isOwnTask={isOwnTask}
                      />
                    )}

                    {viewMode === "statistics" && (
                      <TasksStatistics
                        tasks={filteredTasks}
                        isAdmin={isUserAdmin}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timesheet">
            {/* Contenuto del timesheet */}
            <MyTasksTimeTracking
              currentUserId={user.userId}
              isAdmin={isUserAdmin}
              users={users}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog per i dettagli del task */}
      {selectedTask && (
        <TaskDetailsDialog
          project={{
            ProjectID: selectedTask.ProjectID,
            AdminPermission: selectedTask.AdminPermission,
          }}
          task={selectedTask}
          tasks={tasks.filter((t) => t.ProjectID === selectedTask.ProjectID)}
          isOpen={isTaskDialogOpen}
          onClose={() => {
            setIsTaskDialogOpen(false);
            setSelectedTask(null);
            loadTasks();
          }}
          onAddComment={handleAddComment}
          onUpdate={handleTaskUpdate}
          assignableUsers={users}
          refreshProject={loadTasks}
        />
      )}

      {/* Dialog per la creazione di nuove attività */}
      <TimesheetTaskDialog
        isOpen={isCreateTaskDialogOpen}
        onClose={() => setIsCreateTaskDialogOpen(false)}
        onTaskCreated={loadTasks}
        users={users}
      />
    </div>
  );
};

export default MyTasksPage;
