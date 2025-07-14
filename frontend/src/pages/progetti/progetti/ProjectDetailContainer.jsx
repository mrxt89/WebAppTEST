import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Info,
  Layout,
  Package,
  PieChart,
  Lock,
  Unlock,
  Building2,
  Calendar,
  Layers,
  LayoutDashboard,
  List,
  GanttChartSquare,
  RefreshCw,
} from "lucide-react";
import { swal } from "../../../lib/common";
import ProjectEditModalWithTemplate from "./ProjectEditModalWithTemplate";
import useProjectActions from "../../../hooks/useProjectManagementActions";
import TasksKanban from "./ProjectTasksKanban";
import ProjectGanttView from "./ProjectGanttView";
import { hasAdminPermission } from "@/lib/taskPermissionsUtils";
import ProjectTasksTableImproved from "./ProjectTasksTable";
import TasksViewToggler from "./TasksViewToggler";
import NewTaskPanel from "./NewTaskPanel";
import TaskDetailsPanel from "./TaskDetailsPanel";
import ProjectArticlesTab from "./articoli/ProjectArticlesTab";
import ProjectAttachmentsTab from "./ProjectAttachmentsTab";
import ProjectTeamSection from "./ProjectTeamSection";
import ProjectAnalyticsTab from "./analytics/ProjectAnalyticsTab";
import ProjectStagesView from "./ProjectStagesView";
import ProjectStagesKanban from "./ProjectStagesKanban";
import ProjectStagesTable from "./ProjectStagesTable";
import ProjectStagesGantt from "./ProjectStagesGantt";
import useUsers from "../../../hooks/useUsersActions";
import useProjectStages from "../../../hooks/useProjectStages";

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
                <div className="text-sm flex items-center gap-1 mt-1">
                  <Building2 className="h-3.5 w-3.5 text-gray-500" />
                  {project.CompanyName}
                </div>
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
              <div className="text-sm font-medium text-gray-500">
                {project.UseStages ? "Fasi di lavoro" : "Attività"}
              </div>
              <div className="text-sm mt-1">
                {project.UseStages ? (
                  <Badge variant="" className="bg-purple-100 text-purple-800">
                    Con fasi di lavoro
                  </Badge>
                ) : (
                  <>
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
                  </>
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

const ProjectDetailContainer = ({ 
  projectId, 
  refreshAllProjects, 
  resetSelectedProject, 
  leftPanelWidth 
}) => {
  const navigate = useNavigate();
  
  // State del progetto
  const [project, setProject] = useState(null);
  const [editedProject, setEditedProject] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDisabledTasks, setShowDisabledTasks] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // State per membri team
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({ userId: "", role: "USER" });
  
  // State per task
  const [isAddTaskPanelOpen, setIsAddTaskPanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);
  const [taskPanelPosition, setTaskPanelPosition] = useState("right");
  const [taskPanelActiveTab, setTaskPanelActiveTab] = useState("information");
  
  // State per UI
  const [activeTab, setActiveTab] = useState("overview");
  const [tasksViewMode, setTasksViewMode] = useState("kanban");
  const [stagesViewMode, setStagesViewMode] = useState("phases");
  
  // Refs
  const isMounted = useRef(true);
  const refreshInProgress = useRef(false);
  const preventDialogOpen = useRef(false);
  const lastLoadedProjectId = useRef(null);

  // Hooks
  const { users, loading: loadingUsers, fetchUsers } = useUsers();
  const { fetchProjectStages, stages, unassignedTasks, setStages, setUnassignedTasks } = useProjectStages();
  const {
    loading,
    getProjectById,
    addUpdateProject,
    updateProjectMembers,
    addUpdateProjectTask,
    addTaskComment,
    checkAdminPermission,
    isOwnTask,
    updateProjectMemberRole,
    updateTaskSequence,
    manageTaskDependencies,
    checkCircularDependencies,
    calculateProjectDates,
    toggleProjectLock,
    toggleTaskDisabled,
  } = useProjectActions();

  // Get current user ID
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

  // Funzione principale per caricare il progetto
  const loadProject = useCallback(
    async (forceUpdate = false, callback) => {
      if (typeof forceUpdate === 'function') {
        callback = forceUpdate;
        forceUpdate = false;
      }
      
      if (!isMounted.current || refreshInProgress.current) return;
      if (!forceUpdate && lastLoadedProjectId.current === projectId && project) return;

      try {
        refreshInProgress.current = true;
        lastLoadedProjectId.current = projectId;

        const projectData = await getProjectById(parseInt(projectId), showDisabledTasks);
        if (!isMounted.current) return;
        
        setProject(projectData);

        // Se il progetto usa stages, carica anche gli stages
        if (projectData?.UseStages) {
          const stagesData = await fetchProjectStages(projectData.ProjectID);
        
          if (stagesData.stages && projectData.tasks) {
            const stagesWithCompleteTasks = stagesData.stages.map(stage => ({
              ...stage,
              Tasks: stage.Tasks.map(stageTask => {
                const completeTask = projectData.tasks.find(t => t.TaskID === stageTask.TaskID);
                return completeTask || stageTask;
              })
            }));
            
            setStages(stagesWithCompleteTasks);
            setUnassignedTasks(stagesData.unassignedTasks || []);
          }
        }

        // Aggiorna il task selezionato se presente
        if (selectedTask && isTaskPanelOpen) {
          const updatedTask = projectData.tasks.find(
            (t) => t.TaskID === selectedTask.TaskID
          );
          if (updatedTask) {
            setSelectedTask(updatedTask);
          }
        }

        if (typeof callback === "function") {
          callback();
        }
      } catch (error) {
        if (isMounted.current) {
          console.error("Error loading project:", error);
          swal.fire("Errore", "Errore nel caricamento del progetto", "error");
        }
      } finally {
        setTimeout(() => {
          if (isMounted.current) {
            refreshInProgress.current = false;
          }
        }, 300);
      }
    },
    [projectId, showDisabledTasks, selectedTask, isTaskPanelOpen, project, getProjectById, fetchProjectStages]
  );

  // Nuova funzione per il refresh manuale
  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      await loadProject(true);
      
      // Refresh anche i progetti nella lista se disponibile
      if (refreshAllProjects) {
        await refreshAllProjects();
      }
      
      swal.fire({
        title: "Aggiornato",
        text: "Dati del progetto aggiornati con successo",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error refreshing project:", error);
      swal.fire("Errore", "Errore nell'aggiornamento dei dati", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Gestione aggiornamento progetto
  const handleProjectUpdate = async () => {
    try {
      const cleanedProject = {
        ProjectID: editedProject.ProjectID,
        Name: editedProject.Name,
        Description: editedProject.Description || "",
        StartDate: editedProject.StartDate?.split("T")[0],
        EndDate: editedProject.EndDate?.split("T")[0] || null,
        Status: editedProject.Status,
        ProjectCategoryId: parseInt(editedProject.ProjectCategoryId) || 0,
        ProjectCategoryDetailLine: parseInt(editedProject.ProjectCategoryDetailLine) || 0,
        Disabled: parseInt(editedProject.Disabled) || 0,
        CustSupp: Array.isArray(editedProject.CustSupp)
          ? editedProject.CustSupp[0] || 0
          : parseInt(editedProject.CustSupp) || 0,
        TBCreatedId: editedProject.TBCreatedId,
        ProjectErpID: editedProject.ProjectErpID || "",
        UseStages: editedProject.UseStages || false,
      };
      
      const result = await addUpdateProject(cleanedProject);
      if (result.success) {
        setProject(editedProject);
        setIsEditModalOpen(false);
        
        if (refreshAllProjects) {
          await refreshAllProjects();
        }
        
        swal.fire("Successo", "Progetto aggiornato con successo", "success");
      }
    } catch (error) {
      console.error("Error updating project:", error);
      swal.fire("Errore", "Errore nell'aggiornamento del progetto", "error");
    }
  };

  // Gestione disabilitazione progetto
  const handleDisableProject = async (projectId) => {
    const disabledProject = {
      ...project,
      Disabled: 1,
    };
    
    try {
      const result = await addUpdateProject(disabledProject);
      if (result.success) {
        setProject(null);
        setEditedProject(null);
        setIsEditModalOpen(false);
        
        if (resetSelectedProject) {
          resetSelectedProject();
        }
        
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

  // Gestione aggiunta task
  const handleAddTask = async (taskData) => {
    try {
      const formattedTask = {
        ...taskData,
        ProjectID: parseInt(projectId),
        AssignedTo: parseInt(taskData.AssignedTo),
        AdditionalAssignees: taskData.AdditionalAssignees,
      };

      preventDialogOpen.current = true;

      const result = await addUpdateProjectTask(formattedTask);
      if (result.success) {
        setIsAddTaskPanelOpen(false);
        
        setTimeout(async () => {
          await loadProject(true);
          setTimeout(() => {
            preventDialogOpen.current = false;
          }, 1000);
        }, 200);
        
        return { success: true };
      }
      
      preventDialogOpen.current = false;
      return { success: false };
    } catch (error) {
      console.error("Error adding task:", error);
      preventDialogOpen.current = false;
      throw error;
    }
  };

  // Gestione disabilitazione task
  const handleDisableTask = async (task) => {
    try {
      const result = await swal.fire({
        title: task.TaskDisabled ? "Riabilitare attività?" : "Disabilitare attività?",
        text: task.TaskDisabled 
          ? `Vuoi riabilitare l'attività "${task.Title}"?`
          : `Vuoi disabilitare l'attività "${task.Title}"? L'attività non sarà più visibile di default.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: task.TaskDisabled ? "Riabilita" : "Disabilita",
        cancelButtonText: "Annulla",
        confirmButtonColor: task.TaskDisabled ? "#10B981" : "#EF4444",
      });

      if (result.isConfirmed) {
        const response = await toggleTaskDisabled(task.TaskID, !task.TaskDisabled);
        
        if (response.success) {
          await loadProject(true);
          swal.fire({
            title: "Successo",
            text: response.msg,
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
        } else {
          throw new Error(response.msg);
        }
      }
    } catch (error) {
      console.error("Error disabling task:", error);
      swal.fire("Errore", error.message || "Errore nella modifica dello stato dell'attività", "error");
    }
  };

  // Gestione aggiornamento task
  const handleTaskUpdate = useCallback(
    async (taskData, shouldCloseModal = false) => {
      if (!isMounted.current) return { success: false };

      try {
        preventDialogOpen.current = true;

        const completeTaskData = {
          ...taskData,
          ProjectID: parseInt(projectId),
        };

        if (typeof completeTaskData.AssignedTo === "string") {
          completeTaskData.AssignedTo = parseInt(completeTaskData.AssignedTo);
        }

        if (completeTaskData.DueDate && typeof completeTaskData.DueDate === "string") {
          if (!completeTaskData.DueDate.includes("T")) {
            completeTaskData.DueDate = completeTaskData.DueDate + "T00:00:00";
          }
        }

        const result = await addUpdateProjectTask(completeTaskData);

        if (result.success && isMounted.current) {
          setProject((prev) => ({
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.TaskID === completeTaskData.TaskID
                ? { ...t, ...completeTaskData }
                : t
            ),
          }));

          if (shouldCloseModal || completeTaskData.Status !== selectedTask?.Status) {
            setIsTaskPanelOpen(false);
            setSelectedTask(null);
          } else if (selectedTask?.TaskID === completeTaskData.TaskID) {
            setSelectedTask(completeTaskData);
          }

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

          await loadProject(true);

          return { success: true, task: { ...completeTaskData } };
        }
        return { success: false };
      } catch (error) {
        if (isMounted.current) {
          console.error("Error updating task:", error);
          swal.fire("Errore", "Errore nell'aggiornamento dell'attività", "error");
        }
        return { success: false };
      } finally {
        setTimeout(() => {
          preventDialogOpen.current = false;
        }, 300);
      }
    },
    [projectId, selectedTask, addUpdateProjectTask, loadProject]
  );

  // Gestione click su task
  const handleTaskClick = (task) => {
    if (preventDialogOpen.current) {
      return;
    }
    
    let completeTask = task;
    if (project?.UseStages && project?.tasks) {
      const fullTask = project.tasks.find(t => t.TaskID === task.TaskID);
      if (fullTask) {
        completeTask = fullTask;
      }
    }
    
    setSelectedTask(completeTask);
    setIsTaskPanelOpen(true);
  };

  // Gestione cambio tab nel pannello task
  const handleTaskPanelTabChange = (tabValue) => {
    setTaskPanelActiveTab(tabValue);
  };

  // Gestione aggiunta commento
  const handleAddComment = async (taskId, comment) => {
    try {
      const result = await addTaskComment(taskId, comment);
      if (result.success) {
        const updatedProject = await getProjectById(parseInt(projectId));
        setProject(updatedProject);

        const updatedTask = updatedProject.tasks.find(
          (t) => t.TaskID === taskId
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

  // Gestione aggiunta membro
  const handleAddMember = async () => {
    try {
      if (!newMember.userId) {
        swal.fire("Attenzione", "Seleziona un utente", "warning");
        return;
      }

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
        setActiveTab("team");
        swal.fire("Successo", "Utente aggiunto con successo", "success");
      }
    } catch (error) {
      console.error("Error adding member:", error);
      swal.fire("Errore", "Errore nell'aggiunta del utente", "error");
    }
  };

  // Gestione rimozione membro
  const handleRemoveMember = async (memberId) => {
    try {
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
        setActiveTab("team");
        swal.fire("Successo", "utente rimosso con successo", "success");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      swal.fire("Errore", "Errore nella rimozione del utente", "error");
    }
  };

  // Aggiornamento ruolo membro
  const updateMemberRole = async (memberData) => {
    try {
      if (!hasAdminPermission(project, currentUserId)) {
        swal.fire("Attenzione", "Non hai i permessi per modificare i ruoli", "warning");
        return false;
      }

      if (memberData.userId === parseInt(currentUserId)) {
        swal.fire("Attenzione", "Non puoi modificare il tuo ruolo", "warning");
        return false;
      }

      const result = await updateProjectMemberRole(
        project.ProjectID,
        memberData.projectMemberId,
        memberData.role
      );

      if (result && result.success) {
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

  // Funzione per ottenere utenti filtrati
  const getFilteredUsers = useCallback(() => {
    if (!project || !users) return [];

    return users
      .filter((user) => !project.members?.some((m) => m.UserID === user.userId))
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
  }, [users, project]);

  // Effects
  useEffect(() => {
    if (projectId) {
      loadProject(true);
    }
  }, [showDisabledTasks]);

  useEffect(() => {
    return () => {
      refreshInProgress.current = false;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const containerWidth = window.innerWidth;
      const leftPanelPixels = (leftPanelWidth / 100) * containerWidth;
      const rightPanelSpace = containerWidth - leftPanelPixels;
      
      if (rightPanelSpace < 700 || window.innerWidth < 1200) {
        setTaskPanelPosition("bottom");
      } else {
        setTaskPanelPosition("right");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [leftPanelWidth]);

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

  // Rendering
  if (loading || !project) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-gray-500">Caricamento...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-2 gap-2" style={{ height: "calc(100vh - 105px)" }} id="project-management-split-view">
      {/* Header */}
      <div className="flex items-center justify-between py-2 px-4 bg-[var(--primary)] text-white border rounded-md shadow-sm">
        <h1 className="text-lg font-medium truncate max-w-md mx-2">
          {project.Name} - {project.Description}
        </h1>

        <div className="flex items-center gap-2">
          <Button
            id="refreshProjectButton"
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="bg-white text-[var(--primary)] hover:bg-gray-100"
            title="Aggiorna dati progetto"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            id="editProjectButton"
            variant=""
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            className="bg-white text-[var(--primary)]"
          >
            Modifica
          </Button>

          {(project.TBCreatedId == currentUserId || currentUserId == '0') && (
            <Button
              id="lockProjectButton"
              variant="outline"
              size="sm"
              onClick={async () => {
                const result = await swal.fire({
                  title: project.IsLocked ? "Sbloccare il progetto?" : "Bloccare il progetto?",
                  text: project.IsLocked 
                    ? "Il progetto sarà visibile a tutti gli utenti autorizzati." 
                    : "Il progetto sarà visibile solo ai membri. Gli utenti USER vedranno solo le proprie attività.",
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonText: project.IsLocked ? "Sblocca" : "Blocca",
                  cancelButtonText: "Annulla",
                });

                if (result.isConfirmed) {
                  try {
                    const response = await toggleProjectLock(project.ProjectID);
                    if (response.success) {
                      await loadProject(true);
                      swal.fire({
                        title: "Successo",
                        text: response.msg,
                        icon: "success",
                        timer: 1500,
                        showConfirmButton: false,
                      });
                    } else {
                      throw new Error(response.msg);
                    }
                  } catch (error) {
                    swal.fire("Errore", error.message || "Errore nella gestione del lucchetto", "error");
                  }
                }
              }}
              className={project.IsLocked ? "bg-red-50 text-red-700 hover:bg-red-100 border-red-200" : "bg-white text-[var(--primary)]"}
            >
              {project.IsLocked ? (
                <>
                  <Lock className="h-4 w-4 mr-1" />
                  Bloccato
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-1" />
                  Aperto
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden" id="project-management-split-view-content1">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0 h-full"
          id="project-management-split-view"
        >
          <div className="flex-none">
            <TabsList>
              <TabsTrigger value="overview" id="project-overview-tab">
                <Info className="h-4 w-4 mr-2" />
                Panoramica
              </TabsTrigger>
              {project.UseStages ? (
                <TabsTrigger value="stages" id="project-stages-tab">
                  <Layers className="h-4 w-4 mr-2" />
                  Fasi di lavoro
                  {project.tasks?.length > 0 && (
                    <Badge
                      variant=""
                      className="ml-2 bg-purple-100 text-purple-800"
                    >
                      {project.tasks.length}
                    </Badge>
                  )}
                </TabsTrigger>
              ) : (
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
              )}
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

          <div className="flex-1 min-h-0 overflow-hidden" id="project-management-split-view-content2">
            {/* Overview Tab */}
            <TabsContent value="overview" className="h-full overflow-hidden">
              <div className="h-full overflow-y-auto p-4">
                <ProjectOverview project={project} />
              </div>
            </TabsContent>

            {/* Stages Tab - Modificato per includere le diverse viste */}
            {project.UseStages && (
              <TabsContent value="stages" className="h-full flex flex-col">
                <div className="flex justify-between items-center my-2 mx-4">
                  <div className="flex items-center gap-4">
                    <Button onClick={() => setIsAddTaskPanelOpen(true)}>
                      Aggiungi Attività
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        className="bg-primary"
                        id="showDisabled"
                        checked={showDisabledTasks}
                        onCheckedChange={setShowDisabledTasks}
                      />
                      <Label htmlFor="showDisabled" className="text-sm cursor-pointer select-none">
                        Mostra attività disabilitate
                      </Label>
                    </div>
                  </div>
                  
                  {/* Selettore vista per stages */}
                  <Select value={stagesViewMode} onValueChange={setStagesViewMode}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Seleziona vista" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phases">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          Vista Fasi
                        </div>
                      </SelectItem>
                      <SelectItem value="kanban">
                        <div className="flex items-center gap-2">
                          <LayoutDashboard className="h-4 w-4" />
                          Lavagna Kanban
                        </div>
                      </SelectItem>
                      <SelectItem value="table">
                        <div className="flex items-center gap-2">
                          <List className="h-4 w-4" />
                          Tabella
                        </div>
                      </SelectItem>
                      <SelectItem value="gantt">
                        <div className="flex items-center gap-2">
                          <GanttChartSquare className="h-4 w-4" />
                          Gantt
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden" style={{ height: "calc(100vh - 105px)" }} id="project-management-split-view-content3">
                  {stagesViewMode === "phases" && (
                    <div className="h-full overflow-y-auto p-4">
                      <ProjectStagesView 
                        project={project}
                        onTaskClick={handleTaskClick}
                        canEdit={checkAdminPermission(project)}
                        refreshProject={(callback) => loadProject(true, callback)}
                      />
                    </div>
                  )}
                  {stagesViewMode === "kanban" && (
                    <ProjectStagesKanban
                      project={project}
                      stages={stages}
                      unassignedTasks={unassignedTasks}
                      onTaskUpdate={handleTaskUpdate}
                      onTaskClick={handleTaskClick}
                      onTaskDisable={handleDisableTask}
                      refreshProject={(callback) => loadProject(true, callback)}
                    />
                  )}
                  {stagesViewMode === "table" && (
                    <ProjectStagesTable
                      project={project}
                      stages={stages}
                      unassignedTasks={unassignedTasks}
                      onTaskClick={handleTaskClick}
                      onTaskUpdate={handleTaskUpdate}
                      onTaskDisable={handleDisableTask}
                      checkAdminPermission={checkAdminPermission}
                      isOwnTask={isOwnTask}
                      currentUserId={currentUserId}
                    />
                  )}
                  {stagesViewMode === "gantt" && (
                    <ProjectStagesGantt
                      project={project}
                      stages={stages}
                      unassignedTasks={unassignedTasks}
                      onTaskClick={handleTaskClick}
                      onTaskUpdate={handleTaskUpdate}
                      checkAdminPermission={checkAdminPermission}
                      isOwnTask={isOwnTask}
                      updateTaskSequence={updateTaskSequence}
                      refreshProject={(callback) => loadProject(true, callback)}
                      users={users}
                      manageTaskDependencies={manageTaskDependencies}
                      checkCircularDependencies={checkCircularDependencies}
                      calculateProjectDates={calculateProjectDates}
                    />
                  )}
                </div>
              </TabsContent>
            )}

            {/* Tasks Tab - Mostrato solo quando UseStages è false */}
            {!project.UseStages && (
              <TabsContent value="tasks" className="h-full flex flex-col">
                <div className="flex justify-between items-center my-2 mx-4">
                  <div className="flex items-center gap-4">
                    <Button onClick={() => setIsAddTaskPanelOpen(true)}>
                      Aggiungi Attività
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        className="bg-primary"
                        id="showDisabled"
                        checked={showDisabledTasks}
                        onCheckedChange={setShowDisabledTasks}
                      />
                      <Label htmlFor="showDisabled" className="text-sm cursor-pointer select-none">
                        Mostra attività disabilitate
                      </Label>
                    </div>
                  </div>
                  
                  <TasksViewToggler
                    viewMode={tasksViewMode}
                    setViewMode={setTasksViewMode}
                    tasks={project.tasks || []}
                  />
                </div>

              <div className="flex-1 min-h-0 overflow-hidden" style={{ height: "calc(100vh - 105px)" }} id="project-management-split-view-content3">
                {tasksViewMode === "kanban" && (
                  <TasksKanban
                    project={project}
                    projectId={projectId}
                    tasks={project.tasks}
                    onTaskUpdate={handleTaskUpdate}
                    onTaskClick={handleTaskClick}
                    onTaskDisable={handleDisableTask}
                    refreshProject={(callback) => loadProject(true, callback)}
                  />
                )}
                {tasksViewMode === "table" && (
                  <ProjectTasksTableImproved
                    project={project}
                    tasks={project.tasks}
                    onTaskClick={handleTaskClick}
                    onTaskUpdate={handleTaskUpdate}
                    onTaskDisable={handleDisableTask}
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
                    manageTaskDependencies={manageTaskDependencies}
                    checkCircularDependencies={checkCircularDependencies}
                    calculateProjectDates={calculateProjectDates}
                  />
                )}
              </div>
            </TabsContent>
 )}

            {/* Team Tab */}
            <TabsContent value="team" className="h-full overflow-auto">
              <div className="h-full">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <ProjectTeamSection
                      project={project}
                      users={users}
                      isAddMemberDialogOpen={isAddMemberDialogOpen}
                      setIsAddMemberDialogOpen={setIsAddMemberDialogOpen}
                      newMember={newMember}
                      setNewMember={setNewMember}
                      handleAddMember={handleAddMember}
                      handleRemoveMember={handleRemoveMember}
                      updateMemberRole={updateMemberRole}
                      currentUserId={currentUserId}
                      getFilteredUsers={getFilteredUsers}
                    />
                  </CardHeader>
                </Card>
              </div>
            </TabsContent>

            {/* Attachments Tab */}
            <TabsContent value="attachments" className="h-full overflow-auto">
              <div className="h-full">
                <Card className="h-full flex flex-col">
                  <CardContent className="flex-1 overflow-hidden">
                    <ProjectAttachmentsTab
                      project={project}
                      canEdit={true}
                      onAttachmentChange={(callback) => loadProject(true, callback)}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Articles Tab */}
            <TabsContent value="articles" className="h-full overflow-auto" id="articles-tab">
              <ProjectArticlesTab project={project} canEdit={true} />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="h-full overflow-auto" id="analytics-tab">
              <div className="h-full">
                <ProjectAnalyticsTab
                  project={project}
                  refreshProject={(callback) => loadProject(true, callback)}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Task Details Panel */}
      <TaskDetailsPanel
        project={project}
        task={selectedTask}
        tasks={project.tasks}
        isOpen={isTaskPanelOpen}
        onClose={() => {
          setIsTaskPanelOpen(false);
          setSelectedTask(null);
          loadProject(true);
        }}
        onAddComment={handleAddComment}
        onUpdate={handleTaskUpdate}
        assignableUsers={users}
        refreshProject={(callback) => loadProject(true, callback)}
        activeTabOnReopen={taskPanelActiveTab}
        onTabChange={handleTaskPanelTabChange}
        position={taskPanelPosition}
        defaultWidth={600}
        minWidth={500}
        maxWidth={900}
        key={selectedTask?.TaskID}
      />

      {/* New Task Panel - Disponibile sempre, anche con stages */}
      <NewTaskPanel
        isOpen={isAddTaskPanelOpen}
        onClose={() => setIsAddTaskPanelOpen(false)}
        onTaskCreated={handleAddTask}
        projectTasks={project.tasks || []}
        projectId={projectId}
        position={taskPanelPosition}
        refreshProject={(callback) => loadProject(true, callback)}
        stages={project.UseStages ? stages : []}
        useStages={project.UseStages}
      />

      {/* Edit Project Modal */}
      <ProjectEditModalWithTemplate
        project={project}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onChange={setEditedProject}
        onSave={handleProjectUpdate}
        onDisable={handleDisableProject}
        onProjectUpdated={refreshAllProjects}
      />
    </div>
  );
};

export default ProjectDetailContainer;