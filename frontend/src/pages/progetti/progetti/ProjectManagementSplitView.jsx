import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Users,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  X,
  Plus,
  Eye,
  PieChart,
  CheckCircle2,
  TriangleAlert,
  ListTodo,
  Info,
  Layout,
  Package,
  ArrowLeft,
  Circle,
} from "lucide-react";
import ProjectEditModalWithTemplate from "./ProjectEditModalWithTemplate";
import useProjectActions from "../../../hooks/useProjectManagementActions";
import { CustomerSearchSelect } from "./ProjectComponents";
import TasksKanban from "./ProjectTasksKanban";
import ProjectGanttView from "./ProjectGanttView";
import {
  hasAdminPermission,
  canEditMemberRole,
} from "@/lib/taskPermissionsUtils";
import ProjectTasksTableImproved from "./ProjectTasksTable";
import TasksViewToggler from "./TasksViewToggler";
import TasksLegend from "./TasksLegend";
import TeamMemberWithRole from "./TeamMemberWithRole";
import useProjectCustomersActions from "../../../hooks/useProjectCustomersActions";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import NewTaskForm from "./NewTaskForm";
import TaskDetailsDialog from "./TaskDetailsDialog";
import ProjectArticlesTab from "./articoli/ProjectArticlesTab";
import ProjectAttachmentsTab from "./ProjectAttachmentsTab";
import ProjectTeamSection from "./ProjectTeamSection";
import ProjectAnalyticsTab from "./analytics/ProjectAnalyticsTab";
import useUsers from "../../../hooks/useUsersActions";
import { swal } from "../../../lib/common";

// Mini-componente per le statistiche in dashboard
const StatisticCard = ({
  title,
  value,
  color = "text-gray-900",
  icon: Icon,
}) => (
  <div className="bg-gray-100 p-3 rounded-md flex items-center justify-between">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-gray-600" />}
      <span className="text-xs text-gray-600">{title}</span>
    </div>
    <span className={`text-base font-semibold ${color}`}>{value}</span>
  </div>
);

// TeamMember component (unchanged)
const TeamMember = ({ member, onRemove, checkAdminPermission, project }) => (
  <div className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50">
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {member.userName && (
          <span className="text-gray-600 flex items-center gap-1">
            <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
              {member.userName?.charAt(0).toUpperCase()}
            </span>
          </span>
        )}
      </div>
      <div>
        <p className="font-medium">{member.userName}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-600 text-sm">{member.Role}</span>
      </div>
    </div>
    {checkAdminPermission(project) && (
      <Button
        variant="ghost"
        size="sm"
        className="text-red-500 hover:text-red-700 hover:bg-red-50"
        onClick={() => onRemove(member.ProjectMemberID)}
      >
        Rimuovi
      </Button>
    )}
  </div>
);

// Componente per la panoramica del progetto
const ProjectOverview = ({ project }) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Informazioni generali</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div>
              <div className="text-sm font-medium text-gray-500">Stato</div>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: project.StatusColor || "#CCCCCC" }}
                />
                <span className="text-sm">{project.StatusDescription}</span>
              </div>
            </div>

            {project.ProjectErpID && (
              <div>
                <div className="text-sm font-medium text-gray-500">ID ERP</div>
                <div className="text-sm">
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 mt-1"
                  >
                    {project.ProjectErpID}
                  </Badge>
                </div>
              </div>
            )}

            {project.CompanyName && (
              <div>
                <div className="text-sm font-medium text-gray-500">Cliente</div>
                <div className="text-sm">{project.CompanyName}</div>
              </div>
            )}

            {project.CategoryDescription && (
              <div>
                <div className="text-sm font-medium text-gray-500">
                  Categoria
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      backgroundColor: project.CategoryColor || "#000000",
                    }}
                  />
                  <span className="text-sm">
                    {project.CategoryDescription}
                    {project.SubCategoryDescription && (
                      <span className="text-gray-500 ml-1">
                        {"› "}
                        {project.SubCategoryDescription}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <div className="text-sm font-medium text-gray-500">
                Data inizio
              </div>
              <div className="text-sm flex items-center gap-1 mt-1">
                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                {new Date(project.StartDate).toLocaleDateString()}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-500">
                Data scadenza
              </div>
              <div className="text-sm flex items-center gap-1 mt-1">
                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                {new Date(project.EndDate).toLocaleDateString()}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-500">Attività</div>
              <div className="text-sm mt-1">
                <Badge variant="" className="bg-gray-200 text-gray-800">
                  {project.tasks?.length || 0} totali
                </Badge>{" "}
                {project.TaskCompletate > 0 && (
                  <Badge
                    variant=""
                    className="bg-green-100 text-green-800 ml-1"
                  >
                    {project.TaskCompletate} completate
                  </Badge>
                )}
                {project.TaskAperteInRitardo > 0 && (
                  <Badge variant="" className="bg-red-100 text-red-800 ml-1">
                    {project.TaskAperteInRitardo} in ritardo
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-500">
                Membri team
              </div>
              <div className="text-sm mt-1">
                <Badge variant="" className="bg-gray-200 text-gray-800">
                  {project.members?.length || 0} utenti
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Descrizione</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-700 whitespace-pre-line">
          {project.Description || "Nessuna descrizione disponibile."}
        </p>
      </CardContent>
    </Card>
  </div>
);

// Componente per il dettaglio del progetto incorporato
const ProjectDetailContainer = ({ projectId, refreshAllProjects, resetSelectedProject }) => {
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [editedProject, setEditedProject] = useState(null);
  const [newMember, setNewMember] = useState({ userId: "", role: "USER" });
  const { users, loading: loadingUsers, fetchUsers } = useUsers();
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // Inizia con la panoramica
  // Stato per gestire la vista delle attività (kanban o tabella)
  const [tasksViewMode, setTasksViewMode] = useState("kanban");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Aggiungiamo i refs necessari
  const isMounted = useRef(true);
  const refreshInProgress = useRef(false);
  const preventDialogOpen = useRef(false); // Per evitare l'apertura del dialog durante modifiche in-line
  const lastLoadedProjectId = useRef(null); // Per evitare caricamenti ripetuti dello stesso progetto

  const {
    loading,
    getProjectById,
    addUpdateProject,
    updateProjectMembers,
    addUpdateProjectTask,
    updateTaskStatus,
    addTaskComment,
    checkAdminPermission,
    isOwnTask,
    updateProjectMemberRole,
    updateTaskSequence,
  } = useProjectActions();

  // Get the current user ID from localStorage
  const [currentUserId, setCurrentUserId] = useState(() => {
    try {
      const userString = localStorage.getItem("user");
      if (userString) {
        const userData = JSON.parse(userString);
        return userData.userId;
      }
      return null;
    } catch (error) {
      console.error("Error parsing user data from localStorage:", error);
      return null;
    }
  });

  const loadProject = useCallback(
    async (forceUpdate = false, callback) => {
      // Supporto per callback come primo parametro (retrocompatibilità)
      if (typeof forceUpdate === 'function') {
        callback = forceUpdate;
        forceUpdate = false;
      }
      
      if (!isMounted.current || refreshInProgress.current) return;

      // Evita di ricaricare lo stesso progetto se è già in corso e non è forzato
      if (!forceUpdate && lastLoadedProjectId.current === projectId && project) return;

      try {
        refreshInProgress.current = true;
        lastLoadedProjectId.current = projectId;

        // Salva lo stato attuale dei task prima di aggiornare
        const currentTaskStates = {};
        if (project?.tasks) {
          project.tasks.forEach((task) => {
            currentTaskStates[task.TaskID] = {
              Status: task.Status,
              // Altri stati che potremmo voler preservare visivamente
              isUpdating: task.isUpdating || false,
            };
          });
        }

        const projectData = await getProjectById(parseInt(projectId));
        if (!isMounted.current) return;
        
        // Aggiorna il progetto ma mantiene lo stato delle attività esistenti per evitare
        // rimontaggi del componente che potrebbero causare problemi con gli eventi UI
        setProject((prevProject) => {
          // Se è il primo caricamento, usa direttamente i dati
          if (!prevProject) return projectData;

          // Se siamo in visualizzazione Gantt o Kanban e abbiamo già delle attività,
          // mantieni riferimenti alle attività esistenti per evitare rimontaggio inutile
          if (
            activeTab === "tasks" &&
            (tasksViewMode === "gantt" || tasksViewMode === "kanban") &&
            prevProject.tasks?.length > 0
          ) {
            // Verifica se le attività sono cambiate in modo significativo (nuove attività o rimosse)
            const prevTaskIds = new Set(prevProject.tasks.map((t) => t.TaskID));
            const newTaskIds = new Set(projectData.tasks.map((t) => t.TaskID));

            // Confronta gli insiemi per vedere se ci sono differenze
            const hasNewTasks = [...newTaskIds].some(
              (id) => !prevTaskIds.has(id),
            );
            const hasRemovedTasks = [...prevTaskIds].some(
              (id) => !newTaskIds.has(id),
            );

            // Se sono state aggiunte o rimosse attività, aggiorna completamente
            if (hasNewTasks || hasRemovedTasks) {
              return projectData;
            }

            // Altrimenti, fai un aggiornamento "intelligente" che preserva i riferimenti
            // per le attività che non sono cambiate di stato

            // Crea una mappa delle nuove attività per facile accesso
            const newTasksMap = {};
            projectData.tasks.forEach((task) => {
              newTasksMap[task.TaskID] = task;
            });

            // Aggiorna selettivamente le attività esistenti
            const updatedTasks = prevProject.tasks.map((prevTask) => {
              const newTask = newTasksMap[prevTask.TaskID];
              if (!newTask) return prevTask; // Questo non dovrebbe accadere dato il controllo precedente

              const prevStatus = prevTask.Status;
              const newStatus = newTask.Status;

              // Se lo stato non è cambiato, mantieni alcune proprietà dell'interfaccia utente
              // per evitare scatti visivi durante gli aggiornamenti
              if (
                prevStatus === newStatus &&
                currentTaskStates[prevTask.TaskID]?.isUpdating
              ) {
                return {
                  ...newTask,
                  // Preserva proprietà di state UI che non vogliamo perdere
                  isUpdating: currentTaskStates[prevTask.TaskID].isUpdating,
                };
              }

              // Se lo stato è cambiato, usa completamente la nuova versione
              return newTask;
            });

            // Restituisci la versione aggiornata del progetto con le attività aggiornate
            return {
              ...projectData,
              tasks: updatedTasks,
            };
          }

          // Per altre visualizzazioni o se non abbiamo ancora attività, aggiorna tutto
          return projectData;
        });

        // Se c'è un task selezionato, aggiornalo con i nuovi dati
        if (selectedTask) {
          const updatedTask = projectData.tasks.find(
            (t) => t.TaskID === selectedTask.TaskID,
          );
          if (updatedTask) {
            setSelectedTask(updatedTask);
          }
        }

        // Esegui la callback opzionale passata
        if (typeof callback === "function") {
          callback();
        }
      } catch (error) {
        if (isMounted.current) {
          console.error("Error loading project:", error);
          swal.fire("Errore", "Errore nel caricamento del progetto", "error");
        }
      } finally {
        // Ritarda il reset del flag per dare tempo al browser di processare gli eventi UI
        setTimeout(() => {
          if (isMounted.current) {
            refreshInProgress.current = false;
          }
        }, 300);
      }
    },
    [
      projectId,
      selectedTask,
      activeTab,
      tasksViewMode,
      project,
      getProjectById,
      navigate,
    ],
  );

  // Cleanup effect
  useEffect(() => {
    return () => {
      refreshInProgress.current = false;
    };
  }, []);

  // Carica il progetto all'avvio
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId, loadProject]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleProjectUpdate = async () => {
    try {
      // Puliamo i dati prima di inviarli
      const cleanedProject = {
        ProjectID: editedProject.ProjectID,
        Name: editedProject.Name,
        Description: editedProject.Description || "",
        StartDate: editedProject.StartDate?.split("T")[0],
        EndDate: editedProject.EndDate?.split("T")[0] || null,
        Status: editedProject.Status,
        ProjectCategoryId: parseInt(editedProject.ProjectCategoryId) || 0,
        ProjectCategoryDetailLine:
          parseInt(editedProject.ProjectCategoryDetailLine) || 0,
        Disabled: parseInt(editedProject.Disabled) || 0,
        CustSupp: Array.isArray(editedProject.CustSupp)
          ? editedProject.CustSupp[0] || 0
          : parseInt(editedProject.CustSupp) || 0,
        TBCreatedId: editedProject.TBCreatedId,
        ProjectErpID: editedProject.ProjectErpID || "",
      };

      const result = await addUpdateProject(cleanedProject);
      if (result.success) {
        setProject(editedProject);
        setIsEditMode(false);
        setIsEditModalOpen(false);
        swal.fire("Successo", "Progetto aggiornato con successo", "success");
      }
    } catch (error) {
      console.error("Error updating project:", error);
      swal.fire("Errore", "Errore nell'aggiornamento del progetto", "error");
    }
  };

  const handleDisableProject = async (projectId) => {
    const disabledProject = {
      ...project,
      Disabled: 1,
    };
    try {
      const result = await addUpdateProject(disabledProject);
      if (result.success) {
        // Resettiamo completamente il progetto e il suo stato
        setProject(null);
        setEditedProject(null);
        setIsEditModalOpen(false);
        
        // Reset della selezione nel componente padre
        if (resetSelectedProject) {
          resetSelectedProject();
        }
        
        // Aggiorniamo la lista dei progetti nel componente padre
        if (refreshAllProjects) {
          await refreshAllProjects();
        }
        
        swal.fire({
          title: "Successo",
          text: "Progetto disabilitato con successo",
          icon: "success",
          timer: 1500,
        });
      }
    } catch (error) {
      console.error("Error disabling project:", error);
      swal.fire("Errore", "Errore nella disabilitazione del progetto", "error");
    }
  };

  const handleAddTask = async (taskData) => {
    try {
      const formattedTask = {
        ...taskData,
        ProjectID: parseInt(projectId),
        AssignedTo: parseInt(taskData.AssignedTo),
        AdditionalAssignees: taskData.AdditionalAssignees,
      };

      const result = await addUpdateProjectTask(formattedTask);
      if (result.success) {
        setIsAddTaskDialogOpen(false);
        await loadProject();
        swal.fire("Successo", "Attività aggiunta con successo", "success");
      }
    } catch (error) {
      console.error("Error adding task:", error);
      swal.fire("Errore", "Errore nell'aggiunta dell'attività", "error");
    }
  };

  const handleTaskUpdate = useCallback(
    async (taskData, shouldCloseModal = false) => {
      if (!isMounted.current) return { success: false };

      try {
        preventDialogOpen.current = true; // Previeni l'apertura del modale durante l'aggiornamento

        // Prepariamo i dati per l'API assicurandoci di avere tutti i campi necessari
        const completeTaskData = {
          ...taskData,
          ProjectID: parseInt(projectId),
        };

        // Assicuriamoci che AssignedTo sia un numero
        if (typeof completeTaskData.AssignedTo === "string") {
          completeTaskData.AssignedTo = parseInt(completeTaskData.AssignedTo);
        }

        // Assicuriamoci che tutti i campi siano nel formato corretto
        if (
          completeTaskData.DueDate &&
          typeof completeTaskData.DueDate === "string"
        ) {
          // Manteniamo il formato corretto della data
          if (!completeTaskData.DueDate.includes("T")) {
            completeTaskData.DueDate = completeTaskData.DueDate + "T00:00:00";
          }
        }

        const result = await addUpdateProjectTask(completeTaskData);

        if (result.success && isMounted.current) {
          // Prima aggiorna il progetto localmente
          setProject((prev) => ({
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.TaskID === completeTaskData.TaskID
                ? { ...t, ...completeTaskData }
                : t,
            ),
          }));

          // Gestisci la chiusura del modale e l'aggiornamento del task selezionato
          if (
            shouldCloseModal ||
            completeTaskData.Status !== selectedTask?.Status
          ) {
            setIsTaskDialogOpen(false);
            setSelectedTask(null);
          } else if (selectedTask?.TaskID === completeTaskData.TaskID) {
            // Se non chiudiamo il modale, aggiorna il task selezionato
            setSelectedTask((prev) => ({ ...prev, ...completeTaskData }));
          }

          // Mostra una notifica di successo solo se richiesta
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

          // Aggiorna il progetto in background solo dopo aver gestito l'UI
          await loadProject(true);

          // Restituisci un oggetto di successo con il task aggiornato
          return { success: true, task: { ...completeTaskData } };
        }
        return { success: false };
      } catch (error) {
        if (isMounted.current) {
          console.error("Error updating task:", error);
          swal.fire(
            "Errore",
            "Errore nell'aggiornamento dell'attività",
            "error",
          );
        }
        return { success: false };
      } finally {
        setTimeout(() => {
          preventDialogOpen.current = false; // Riabilita l'apertura del modale dopo l'aggiornamento
        }, 300);
      }
    },
    [projectId, selectedTask, addUpdateProjectTask, loadProject],
  );

  const updateMemberRole = async (memberData) => {
    try {
      // Verifica che l'utente corrente sia un admin del progetto
      if (!hasAdminPermission(project, currentUserId)) {
        swal.fire(
          "Attenzione",
          "Non hai i permessi per modificare i ruoli",
          "warning",
        );
        return false;
      }

      // Verifica che l'utente non stia modificando il proprio ruolo
      if (memberData.userId === parseInt(currentUserId)) {
        swal.fire("Attenzione", "Non puoi modificare il tuo ruolo", "warning");
        return false;
      }

      // Ensure updateProjectMemberRole is properly destructured from the hook
      const result = await updateProjectMemberRole(
        project.ProjectID,
        memberData.projectMemberId,
        memberData.role,
      );

      if (result && result.success) {
        // Aggiorna i membri del progetto
        await loadProject();
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error updating member role:", error);
      swal.fire("Errore", "Errore nella modifica del ruolo", "error");
      return false;
    }
  };

  const handleTaskClick = (task) => {
    // Usa preventDialogOpen per evitare l'apertura non voluta durante le modifiche inline
    if (!preventDialogOpen.current) {
      setSelectedTask(task);
      setIsTaskDialogOpen(true);
    }
  };

  const handleAddComment = async (taskId, comment) => {
    try {
      const result = await addTaskComment(taskId, comment);
      if (result.success) {
        // Ricarica i dati del progetto
        const updatedProject = await getProjectById(parseInt(projectId));
        setProject(updatedProject);

        // Aggiorna il task selezionato con i nuovi dati
        const updatedTask = updatedProject.tasks.find(
          (t) => t.TaskID === taskId,
        );
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

  const handleAddMember = async () => {
    try {
      if (!newMember.userId) {
        swal.fire("Attenzione", "Seleziona un utente", "warning");
        return;
      }

      // Prendo tutti i membri esistenti e aggiungo quello nuovo
      const allMembers = [
        ...project.members.map((m) => ({
          userId: m.UserID.toString(),
          role: m.Role,
        })),
        {
          userId: newMember.userId.toString(),
          role: newMember.role,
        },
      ];

      const result = await updateProjectMembers(projectId, allMembers);

      if (result.success) {
        const updatedProject = await getProjectById(parseInt(projectId));
        setProject(updatedProject);
        setIsAddMemberDialogOpen(false);
        setNewMember({ userId: "", role: "USER" });
        setActiveTab("team"); // Mantiene la tab team attiva
        swal.fire("Successo", "Utente aggiunto con successo", "success");
      }
    } catch (error) {
      console.error("Error adding member:", error);
      swal.fire("Errore", "Errore nell'aggiunta del utente", "error");
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      // Swal di conferma
      const askResult = await swal.fire({
        title: "Sei sicuro?",
        text: "Questa azione rimuoverà l'utente dal progetto",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Rimuovi",
        confirmButtonColor: "red",
        cancelButtonText: "Annulla",
      });

      if (!askResult.isConfirmed) return;

      // Prendo tutti i membri TRANNE quello da rimuovere
      const remainingMembers = project.members
        .filter((m) => m.ProjectMemberID !== memberId)
        .map((m) => ({
          userId: m.UserID.toString(),
          role: m.Role,
        }));

      const result = await updateProjectMembers(projectId, remainingMembers);

      if (result.success) {
        const updatedProject = await getProjectById(parseInt(projectId));
        setProject(updatedProject);
        setActiveTab("team"); // Mantiene la tab team attiva
        swal.fire("Successo", "utente rimosso con successo", "success");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      swal.fire("Errore", "Errore nella rimozione del utente", "error");
    }
  };

  const taskComment = async (taskId, comment) => {
    try {
      const result = await addTaskComment(taskId, comment);
      if (result.success) {
        const updatedProject = await getProjectById(parseInt(projectId));
        setProject(updatedProject);
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      swal.fire("Errore", "Errore nell'aggiunta del commento", "error");
    }
  };

  // Funzione per filtrare gli utenti in base alla ricerca
  const getFilteredUsers = useCallback(() => {
    if (!project || !users) return [];

    return users
      .filter((user) => !project.members?.some((m) => m.UserID === user.userId))
      .filter((user) => {
        if (!userSearchQuery) return true;
        const searchLower = userSearchQuery.toLowerCase();
        return (
          user.firstName?.toLowerCase().includes(searchLower) ||
          user.lastName?.toLowerCase().includes(searchLower) ||
          `${user.firstName} ${user.lastName}`
            .toLowerCase()
            .includes(searchLower)
        );
      })
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
  }, [users, project, userSearchQuery]);

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-gray-500">Caricamento...</span>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-4 gap-4">
      {/* Header minimalista con dashboard, titolo e modifica */}
      <div className="flex items-center justify-between py-2 px-4 bg-[var(--primary)] text-white border rounded-md shadow-sm">
        <h1 className="text-lg font-medium truncate max-w-md mx-2">
          {project.Name}
        </h1>

        {
          <Button
            id="editProjectButton"
            variant=""
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            className="bg-white text-[var(--primary)]"
          >
            Modifica
          </Button>
        }
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full flex flex-col"
        >
          <div className="flex-none">
            <TabsList>
              <TabsTrigger value="overview" id="project-overview-tab">
                <Info className="h-4 w-4 mr-2" />
                Panoramica
              </TabsTrigger>
              <TabsTrigger value="tasks" id="project-tasks-tab">
                <Layout className="h-4 w-4 mr-2" />
                Attività
                {project.tasks?.length > 0 && (
                  <Badge
                    variant=""
                    className="ml-2 bg-gray-200 text-gray-800 fst-italic"
                  >
                    {project.tasks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="team" id="project-team-tab">
                <Users className="h-4 w-4 mr-2" />
                Utenti
                {project.members?.length > 0 && (
                  <Badge
                    variant=""
                    className="ml-2 bg-gray-200 text-gray-800 fst-italic"
                  >
                    {project.members.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="attachments" id="project-attachments-tab">
                Allegati
                {project.AttachmentsCount > 0 && (
                  <Badge
                    variant=""
                    className="ml-2 bg-gray-200 text-gray-800 fst-italic"
                  >
                    {project.AttachmentsCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="articles" id="project-articles-tab">
                <Package className="h-4 w-4 mr-2" />
                Articoli
              </TabsTrigger>
              <TabsTrigger value="analytics" id="project-analytics-tab">
                <PieChart className="h-4 w-4 mr-2" />
                Statistiche
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Panoramica */}
          <TabsContent value="overview" className="flex-1 mt-2 overflow-auto">
            <ProjectOverview project={project} />
          </TabsContent>

          {/* Tab Attività */}
          <TabsContent value="tasks" className="flex-1 flex flex-col mt-2">
            <div className="flex justify-between items-center mb-1">
              {
                <Dialog
                  open={isAddTaskDialogOpen}
                  onOpenChange={setIsAddTaskDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button>Aggiungi Attività</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nuova Attività</DialogTitle>
                    </DialogHeader>
                    <NewTaskForm
                      onSubmit={handleAddTask}
                      onCancel={() => setIsAddTaskDialogOpen(false)}
                      projectTasks={project.tasks || []}
                    />
                  </DialogContent>
                  {/* Componente per cambiare vista */}
                  <TasksViewToggler
                    viewMode={tasksViewMode}
                    setViewMode={setTasksViewMode}
                    tasks={project.tasks || []}
                  />
                </Dialog>
              }
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Visualizzazione condizionale in base al viewMode */}
              {tasksViewMode === "kanban" && (
                <TasksKanban
                  project={project}
                  projectId={projectId}
                  tasks={project.tasks}
                  onTaskUpdate={handleTaskUpdate}
                  onTaskClick={handleTaskClick}
                  refreshProject={(callback) => loadProject(true, callback)}
                />
              )}
              {tasksViewMode === "table" && (
                <ProjectTasksTableImproved
                  project={project}
                  tasks={project.tasks}
                  onTaskClick={handleTaskClick}
                  onTaskUpdate={handleTaskUpdate}
                  checkAdminPermission={checkAdminPermission}
                  isOwnTask={isOwnTask}
                  currentUserId={currentUserId}
                />
              )}
              {tasksViewMode === "gantt" && (
                <ProjectGanttView
                  project={project}
                  tasks={project.tasks || []}
                  onTaskClick={handleTaskClick}
                  onTaskUpdate={handleTaskUpdate}
                  checkAdminPermission={checkAdminPermission}
                  isOwnTask={isOwnTask}
                  updateTaskSequence={updateTaskSequence}
                  getProjectById={getProjectById}
                  refreshProject={(callback) => loadProject(true, callback)}
                  users={users}
                />
              )}
            </div>
          </TabsContent>

          {/* Tab Team */}
          <TabsContent value="team" className="flex-1 mt-2">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-none flex flex-row items-center justify-between">
                {
                  <Dialog
                    open={isAddMemberDialogOpen}
                    onOpenChange={setIsAddMemberDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" className="flex items-center gap-2">
                        Aggiungi Utente
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Aggiungi utente al Team</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <Label htmlFor="userSearch">Cerca utente</Label>
                          <Input
                            id="userSearch"
                            placeholder="Cerca per nome o cognome..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="mb-2"
                          />
                          <Label htmlFor="userId">Utente</Label>
                          <Select
                            value={newMember.userId}
                            onValueChange={(value) =>
                              setNewMember({ ...newMember, userId: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona utente" />
                            </SelectTrigger>
                            <SelectContent>
                              {getFilteredUsers().map((user) => (
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
                        <div>
                          <Label htmlFor="role">Ruolo</Label>
                          <Select
                            value={newMember.role}
                            onValueChange={(value) =>
                              setNewMember({ ...newMember, role: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona ruolo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="MANAGER">Manager</SelectItem>
                              <SelectItem value="USER">User</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={handleAddMember}
                          className="w-full"
                          disabled={!newMember.userId || !project}
                        >
                          Aggiungi al Team
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                }
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0">
                <div className="space-y-3">
                  {project.members?.length > 0 ? (
                    project.members.map((member) => (
                      <TeamMemberWithRole
                        key={member.ProjectMemberID}
                        member={member}
                        onRemove={
                          checkAdminPermission(project)
                            ? handleRemoveMember
                            : handleRemoveMember
                        }
                        onRoleUpdate={updateMemberRole}
                        canEditRole={canEditMemberRole(
                          project,
                          currentUserId,
                          member.UserID,
                        )}
                        currentUserId={currentUserId}
                      />
                    ))
                  ) : (
                    <Alert>
                      <AlertDescription>
                        Nessun utente nel team.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Allegati */}
          <TabsContent value="attachments" className="flex-1 mt-2">
            <Card className="h-full flex flex-col">
              <CardContent className="flex-1 mt-4 overflow-hidden">
                <ProjectAttachmentsTab
                  project={project}
                  canEdit={true}
                  onAttachmentChange={(callback) => loadProject(true, callback)}
                />
              </CardContent>
            </Card>
          </TabsContent>
          {/* Tab Articoli */}
          <TabsContent value="articles" className="flex-1 mt-2">
            <ProjectArticlesTab project={project} canEdit={true} />
          </TabsContent>
          {/* Tab Statistiche */}
          <TabsContent value="analytics" className="flex-1 mt-2">
            <ProjectAnalyticsTab
              project={project}
              refreshProject={(callback) => loadProject(true, callback)}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <TaskDetailsDialog
        project={project}
        task={selectedTask}
        tasks={project.tasks}
        isOpen={isTaskDialogOpen}
        onClose={() => {
          setIsTaskDialogOpen(false);
          setSelectedTask(null);
          loadProject(true);
        }}
        onAddComment={handleAddComment}
        onUpdate={handleTaskUpdate}
        assignableUsers={users}
        refreshProject={(callback) => loadProject(true, callback)}
      />

      <ProjectEditModalWithTemplate
        project={project}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onChange={setEditedProject}
        onSave={handleProjectUpdate}
        onDisable={handleDisableProject}
      />
    </div>
  );
};

// Componente principale
const ProjectManagementSplitView = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { fetchUsers } = useNotifications();
  const {
    projects,
    loading: projectsLoading,
    fetchProjects,
    addUpdateProject,
    getUserProjectStatistics,
    getProjectById,
    categories,
    fetchCategories,
    projectStatuses,
    fetchProjectStatuses,
  } = useProjectActions();

  const {
    projectCustomers,
    loading: loadingCustomers,
    fetchProjectCustomers,
  } = useProjectCustomersActions();

  const [loading, setLoading] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(
    projectId && !isNaN(parseInt(projectId)) ? parseInt(projectId) : null,
  );
  const [formErrors, setFormErrors] = useState({});
  const [filters, setFilters] = useState({
    status: "all",
    searchText: "",
    categoryId: "",
    custSupp: null,
    projectErpId: "",
    taskAssignedTo: null,
  });
  const [statistics, setStatistics] = useState({
    activeProjects: 0,
    activeTasks: 0,
    delayedProjects: 0,
    delayedTasks: 0,
  });
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    Name: "",
    Description: "",
    StartDate: new Date().toISOString().split("T")[0],
    EndDate: "",
    Status: "1A",
    ProjectCategoryId: 0,
    ProjectCategoryDetailLine: 0,
    CustSupp: 0,
    ProjectErpID: "",
  });
  const [users, setUsers] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: "Name",
    direction: "ascending",
  });

  // Caricamento iniziale
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);

        // Carica tutte le informazioni necessarie
        const [
          usersResponse,
          customersResponse,
          categoriesResponse,
          statusesResponse,
        ] = await Promise.all([
          fetchUsers(),
          fetchProjectCustomers(),
          fetchCategories(),
          fetchProjectStatuses(),
        ]);

        // Aggiorna lo stato degli utenti
        if (Array.isArray(usersResponse)) {
          setUsers(usersResponse);
        }

        // Aggiorna le statistiche
        await getUserProjectStatistics().then(setStatistics);

        // Carica i progetti con i filtri attuali
        await fetchProjects(0, 100, filters);

        // Carica il progetto selezionato se esiste un ID nell'URL
        if (projectId && !isNaN(parseInt(projectId))) {
          selectProject(parseInt(projectId));
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        swal.fire("Errore", "Errore nel caricamento dei dati", "error");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Seleziona un progetto
  const selectProject = (id) => {
    if (!id || isNaN(id)) {
      console.warn("Invalid project ID:", id);
      return;
    }

    // Aggiorniamo solo lo stato del progetto selezionato
    setSelectedProjectId(id);
  };

  // Filtra e ordina i progetti
  const getFilteredAndSortedProjects = useCallback(() => {
    // Filtra i progetti
    let filteredProjects = [...projects];

    // Applica filtri
    if (filters.status && filters.status !== "all") {
      filteredProjects = filteredProjects.filter(
        (p) => p.Status === filters.status,
      );
    }

    if (filters.searchText) {
      const search = filters.searchText.toLowerCase();
      filteredProjects = filteredProjects.filter(
        (p) =>
          p.Name?.toLowerCase().includes(search) ||
          p.Description?.toLowerCase().includes(search),
      );
    }

    if (filters.categoryId && filters.categoryId !== "0") {
      filteredProjects = filteredProjects.filter(
        (p) => p.ProjectCategoryId === parseInt(filters.categoryId),
      );
    }

    if (filters.custSupp) {
      filteredProjects = filteredProjects.filter(
        (p) => p.CustSupp === filters.custSupp,
      );
    }

    if (filters.projectErpId) {
      filteredProjects = filteredProjects.filter((p) =>
        p.ProjectErpID?.includes(filters.projectErpId),
      );
    }

    if (filters.taskAssignedTo) {
      filteredProjects = filteredProjects.filter((p) =>
        p.tasks?.some((task) => task.AssignedTo === filters.taskAssignedTo),
      );
    }

    // Ordina i progetti
    if (sortConfig.key) {
      filteredProjects.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredProjects;
  }, [projects, filters, sortConfig]);

  // Gestisce il clic sull'intestazione per l'ordinamento
  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Effetto per i filtri
  useEffect(() => {
    const applyFilters = async () => {
      try {
        setLoading(true);
        const cleanedFilters = Object.entries(filters).reduce(
          (acc, [key, value]) => {
            if (
              value !== undefined &&
              value !== null &&
              value !== "all" &&
              value !== ""
            ) {
              acc[key] = value;
            }
            return acc;
          },
          {},
        );

        await fetchProjects(0, 100, cleanedFilters);
        await getUserProjectStatistics().then(setStatistics);
      } catch (error) {
        console.error("Error applying filters:", error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(applyFilters, 300);
    return () => clearTimeout(timeoutId);
  }, [filters]);

  // Creazione nuovo progetto
  const handleCreateProject = async () => {
    // Validazione
    const validationErrors = {};
    if (!newProject.Name?.trim()) validationErrors.Name = "Campo obbligatorio";
    if (!newProject.StartDate)
      validationErrors.StartDate = "Campo obbligatorio";

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    try {
      const projectData = {
        ...newProject,
        CustSupp: newProject.CustSupp || 0,
        ProjectErpID: newProject.ProjectErpID?.trim() || "",
      };

      const result = await addUpdateProject(projectData);
      if (result.success) {
        setIsNewProjectDialogOpen(false);
        await fetchProjects(0, 100, filters);
        setNewProject({
          Name: "",
          Description: "",
          StartDate: new Date().toISOString().split("T")[0],
          EndDate: "",
          Status:
            projectStatuses?.length > 0
              ? projectStatuses.find((s) => s.IsActive === 1 && s.Sequence < 15)
                  ?.Id || "1A"
              : "1A",
          ProjectCategoryId: 0,
          ProjectCategoryDetailLine: 0,
          CustSupp: 0,
          ProjectErpID: "",
        });
        setFormErrors({});
        swal.fire("Successo", "Progetto creato con successo", "success");

        // Seleziona il nuovo progetto
        if (result.projectId) {
          selectProject(result.projectId);
        }
      }
    } catch (error) {
      console.error("Error creating project:", error);
      swal.fire("Errore", "Errore nella creazione del progetto", "error");
    }
  };

  // Reset dei filtri
  const resetFilters = () => {
    setFilters({
      status: "all",
      searchText: "",
      categoryId: "",
      custSupp: null,
      projectErpId: "",
      taskAssignedTo: null,
    });
  };

  // Funzione per forzare un refresh completo dei progetti
  const refreshAllProjects = useCallback(async () => {
    try {
      setLoading(true);
      await fetchProjects(0, 100, filters);
      await getUserProjectStatistics().then(setStatistics);
    } catch (error) {
      console.error("Error refreshing projects:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchProjects, getUserProjectStatistics, filters]);

  // Funzione per resettare il progetto selezionato
  const resetSelectedProject = useCallback(() => {
    setSelectedProjectId(null);
  }, []);

  // Rendering
  return (
    <div className="flex" style={{ height: "calc(100vh - 150px)" }}>
      {/* Sezione sinistra (1/3) - Dashboard */}
      <div className="w-1/3 border-r h-full flex flex-col p-4 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Progetti</h2>
          <Dialog
            open={isNewProjectDialogOpen}
            onOpenChange={setIsNewProjectDialogOpen}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Nuovo
              </Button>
            </DialogTrigger>
            <ProjectEditModalWithTemplate
              project={newProject}
              isOpen={isNewProjectDialogOpen}
              onClose={() => setIsNewProjectDialogOpen(false)}
              onChange={setNewProject}
              onSave={handleCreateProject}
              formErrors={formErrors}
            />
          </Dialog>
        </div>

        {/* Filtri collassabili */}
        <Collapsible
          open={filtersExpanded}
          onOpenChange={setFiltersExpanded}
          className="mb-4 border rounded-md"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex justify-between items-center p-2 border-b"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Filtri</span>
                {Object.values(filters).some((v) => v && v !== "all") && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-600 border-blue-200"
                  >
                    Attivi
                  </Badge>
                )}
              </div>
              {filtersExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-3 space-y-3">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Stato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti gli stati</SelectItem>
                      {projectStatuses?.map((status) => (
                        <SelectItem key={status.Id} value={status.Id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: status.HexColor }}
                            />
                            {status.StatusDescription}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select
                    value={filters.categoryId?.toString() || "0"}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, categoryId: value }))
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Tutte le categorie</SelectItem>
                      {categories.map((category) => (
                        <SelectItem
                          key={category.ProjectCategoryId}
                          value={category.ProjectCategoryId.toString()}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.HexColor }}
                            />
                            {category.Description}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <CustomerSearchSelect
                    value={filters.custSupp}
                    onChange={(value) =>
                      setFilters((prev) => ({ ...prev, custSupp: value }))
                    }
                    projectCustomers={projectCustomers}
                    loading={loadingCustomers}
                  />
                </div>
                <div>
                  <Select
                    value={filters.taskAssignedTo?.toString() || "0"}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        taskAssignedTo: value === "0" ? null : parseInt(value),
                      }))
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Assegnato a" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Tutti gli utenti</SelectItem>
                      {users
                        .filter((user) => user && user.userId !== 0)
                        .map((user) => (
                          <SelectItem
                            key={user.userId}
                            value={user.userId.toString()}
                          >
                            {`${user.firstName} ${user.lastName}`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Cerca..."
                    className="pl-8 h-8"
                    value={filters.searchText}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        searchText: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Input
                    placeholder="ID ERP"
                    className="h-8"
                    value={filters.projectErpId}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        projectErpId: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Reset
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Statistiche */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatisticCard
            title="Progetti Attivi"
            value={statistics.activeProjects}
            icon={Users}
          />
          <StatisticCard
            title="Progetti in Ritardo"
            value={statistics.delayedProjects}
            color="text-red-600"
            icon={AlertCircle}
          />
          <StatisticCard
            title="Attività in Corso"
            value={statistics.activeTasks}
            icon={Calendar}
          />
          <StatisticCard
            title="Attività in Ritardo"
            value={statistics.delayedTasks}
            color="text-red-600"
            icon={AlertCircle}
          />
        </div>

        {/* Tabella stile Excel */}
        <Card className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <span className="text-gray-500">Caricamento...</span>
              </div>
            ) : getFilteredAndSortedProjects().length === 0 ? (
              <Alert className="m-4">
                <AlertDescription>
                  Nessun progetto trovato con i filtri selezionati.
                </AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-gray-100">
                  <TableRow>
                    <TableHead className="w-10 text-center"></TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort("Name")}
                    >
                      Nome
                      {sortConfig.key === "Name" && (
                        <span className="ml-1">
                          {sortConfig.direction === "ascending" ? "↑" : "↓"}
                        </span>
                      )}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort("CompanyName")}
                    >
                      Cliente
                      {sortConfig.key === "CompanyName" && (
                        <span className="ml-1">
                          {sortConfig.direction === "ascending" ? "↑" : "↓"}
                        </span>
                      )}
                    </TableHead>
                    <TableHead className="w-24">Stato</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-200 w-28"
                      onClick={() => handleSort("EndDate")}
                    >
                      Scadenza
                      {sortConfig.key === "EndDate" && (
                        <span className="ml-1">
                          {sortConfig.direction === "ascending" ? "↑" : "↓"}
                        </span>
                      )}
                    </TableHead>
                    <TableHead className="w-20 text-right">Attività</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredAndSortedProjects().map((project) => (
                    <TableRow
                      key={project.ProjectID}
                      className={
                        selectedProjectId === project.ProjectID
                          ? "bg-blue-50 hover:bg-blue-100"
                          : "hover:bg-gray-50"
                      }
                      onClick={() => selectProject(project.ProjectID)}
                    >
                      <TableCell className="font-medium py-1">
                        <div className="flex items-start gap-1">
                          <span className="truncate max-w-[120px]">
                            {project.Name}
                          </span>
                          {project.ProjectErpID && (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                            >
                              {project.ProjectErpID}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-1 text-sm text-gray-600 truncate max-w-[120px]">
                        {project.CompanyName || "-"}
                      </TableCell>
                      <TableCell className="py-1">
                        <div className="flex items-center gap-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: project.StatusColor || "#CCCCCC",
                            }}
                          />
                          <span className="text-xs truncate max-w-[80px]">
                            {project.StatusDescription}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-1 text-xs">
                        {new Date(project.EndDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="py-1 text-right">
                        <div className="flex justify-end gap-1 items-center">
                          <div className="flex items-center px-1.5 py-0.5 rounded-md bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            <span className="text-xs font-medium">
                              {project.TaskCompletate || 0}
                            </span>
                          </div>
                          <div className="flex items-center px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-700">
                            <ListTodo className="w-3 h-3 mr-1" />
                            <span className="text-xs font-medium">
                              {project.TaskAperteNonRitardo || 0}
                            </span>
                          </div>
                          <div className="flex items-center px-1.5 py-0.5 rounded-md bg-red-100 text-red-700">
                            <TriangleAlert className="w-3 h-3 mr-1" />
                            <span className="text-xs font-medium">
                              {project.TaskAperteInRitardo || 0}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </Card>
      </div>

      {/* Sezione destra (2/3) - Dettaglio progetto */}
      <div className="w-2/3 h-full overflow-hidden">
        {selectedProjectId ? (
          <ProjectDetailContainer 
            projectId={selectedProjectId} 
            refreshAllProjects={refreshAllProjects}
            resetSelectedProject={resetSelectedProject}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <PieChart className="h-16 w-16 mb-4 text-gray-300" />
            <h3 className="text-xl font-medium mb-2">
              Nessun progetto selezionato
            </h3>
            <p className="text-sm max-w-md text-center">
              Seleziona un progetto dalla lista a sinistra per visualizzarne i
              dettagli.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectManagementSplitView;
