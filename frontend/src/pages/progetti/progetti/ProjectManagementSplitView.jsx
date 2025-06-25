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
import { Checkbox } from "@/components/ui/checkbox";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  MoreVertical,
  Lock,
  Unlock,
  Pin,
  PinOff,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
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
import NewTaskPanel from "./NewTaskPanel";
import TaskDetailsPanel from "./TaskDetailsPanel";
import ProjectArticlesTab from "./articoli/ProjectArticlesTab";
import ProjectAttachmentsTab from "./ProjectAttachmentsTab";
import ProjectTeamSection from "./ProjectTeamSection";
import ProjectAnalyticsTab from "./analytics/ProjectAnalyticsTab";
import useUsers from "../../../hooks/useUsersActions";
import { swal } from "../../../lib/common";

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

// Componente per il filtro delle colonne
const ColumnFilter = ({ column, value, onChange, options = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value || "");

  const handleApply = () => {
    onChange(localValue);
    setIsOpen(false);
  };

  const handleClear = () => {
    setLocalValue("all");
    onChange("");
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 ml-1 hover:bg-gray-200"
        >
          <Filter className={`h-3 w-3 ${value ? "text-blue-600" : "text-gray-400"}`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        {column === "text" ? (
          <div className="space-y-2">
            <Input
              placeholder="Filtra..."
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              className="h-8"
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleApply} className="h-7 flex-1">
                Applica
              </Button>
              <Button size="sm" variant="outline" onClick={handleClear} className="h-7 flex-1">
                Cancella
              </Button>
            </div>
          </div>
        ) : column === "select" ? (
          <div className="space-y-2">
            <Select value={localValue} onValueChange={setLocalValue}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Seleziona..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleApply} className="h-7 flex-1">
                Applica
              </Button>
              <Button size="sm" variant="outline" onClick={handleClear} className="h-7 flex-1">
                Cancella
              </Button>
            </div>
          </div>
        ) : column === "date" ? (
          <div className="space-y-2">
            <Input
              type="date"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              className="h-8"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleApply} className="h-7 flex-1">
                Applica
              </Button>
              <Button size="sm" variant="outline" onClick={handleClear} className="h-7 flex-1">
                Cancella
              </Button>
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

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
const ProjectDetailContainer = ({ projectId, refreshAllProjects, resetSelectedProject, leftPanelWidth }) => {
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isAddTaskPanelOpen, setIsAddTaskPanelOpen] = useState(false);
  const [editedProject, setEditedProject] = useState(null);
  const [newMember, setNewMember] = useState({ userId: "", role: "USER" });
  const { users, loading: loadingUsers, fetchUsers } = useUsers();
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [taskPanelPosition, setTaskPanelPosition] = useState("right");
  const [taskPanelActiveTab, setTaskPanelActiveTab] = useState("information");
  const [activeTab, setActiveTab] = useState("overview");
  const [tasksViewMode, setTasksViewMode] = useState("kanban");
  const [showDisabledTasks, setShowDisabledTasks] = useState(false);
  const isMounted = useRef(true);
  const refreshInProgress = useRef(false);
  const preventDialogOpen = useRef(false);
  const lastLoadedProjectId = useRef(null);

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
    manageTaskDependencies,
    checkCircularDependencies,
    calculateProjectDates,
    toggleProjectLock,
    toggleTaskDisabled,
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
      if (typeof forceUpdate === 'function') {
        callback = forceUpdate;
        forceUpdate = false;
      }
      
      if (!isMounted.current || refreshInProgress.current) return;
  
      if (!forceUpdate && lastLoadedProjectId.current === projectId && project) return;
  
      try {
        refreshInProgress.current = true;
        lastLoadedProjectId.current = projectId;
  
        const currentTaskStates = {};
        if (project?.tasks) {
          project.tasks.forEach((task) => {
            currentTaskStates[task.TaskID] = {
              Status: task.Status,
              isUpdating: task.isUpdating || false,
            };
          });
        }
  
        const projectData = await getProjectById(parseInt(projectId), showDisabledTasks);
        if (!isMounted.current) return;
        
        setProject((prevProject) => {
          if (!prevProject) return projectData;
          return projectData;
        });
  
        if (selectedTask && isTaskPanelOpen) {
          const updatedTask = projectData.tasks.find(
            (t) => t.TaskID === selectedTask.TaskID,
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
    [
      projectId,
      showDisabledTasks,
      selectedTask,
      isTaskPanelOpen,
      activeTab,
      tasksViewMode,
      project,
      getProjectById,
      navigate,
    ],
  );

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
        
        // Aggiorna anche la lista dei progetti nella sezione sinistra
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
  
        if (
          completeTaskData.DueDate &&
          typeof completeTaskData.DueDate === "string"
        ) {
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
                : t,
            ),
          }));
  
          if (
            shouldCloseModal ||
            completeTaskData.Status !== selectedTask?.Status
          ) {
            setIsTaskPanelOpen(false);
            setSelectedTask(null);
          } else if (selectedTask?.TaskID === completeTaskData.TaskID) {
            setSelectedTask((prev) => ({ ...prev, ...completeTaskData }));
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
          swal.fire(
            "Errore",
            "Errore nell'aggiornamento dell'attività",
            "error",
          );
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

  const updateMemberRole = async (memberData) => {
    try {
      if (!hasAdminPermission(project, currentUserId)) {
        swal.fire(
          "Attenzione",
          "Non hai i permessi per modificare i ruoli",
          "warning",
        );
        return false;
      }

      if (memberData.userId === parseInt(currentUserId)) {
        swal.fire("Attenzione", "Non puoi modificare il tuo ruolo", "warning");
        return false;
      }

      const result = await updateProjectMemberRole(
        project.ProjectID,
        memberData.projectMemberId,
        memberData.role,
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

  const handleTaskClick = (task) => {
    if (preventDialogOpen.current) {
      console.log("Dialog opening prevented by flag");
      return;
    }
    
    setSelectedTask(task);
    setIsTaskPanelOpen(true);
  };

  const handleTaskPanelTabChange = (tabValue) => {
    setTaskPanelActiveTab(tabValue);
  };

  const handleAddComment = async (taskId, comment) => {
    try {
      const result = await addTaskComment(taskId, comment);
      if (result.success) {
        const updatedProject = await getProjectById(parseInt(projectId));
        setProject(updatedProject);

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

  const refreshProjectData = async () => {
    try {
      const updatedProject = await getProjectById(parseInt(projectId));
      setProject(updatedProject);
      setActiveTab("team");
    } catch (error) {
      console.error("Error refreshing project data:", error);
    }
  };

  handleAddMember.refresh = refreshProjectData;

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

  const getFilteredUsers = useCallback(() => {
    if (!project || !users) return [];

    return users
      .filter((user) => !project.members?.some((m) => m.UserID === user.userId))
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
  }, [users, project]);

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-gray-500">Caricamento...</span>
      </div>
    );
  }

  return (
    <div className=" flex flex-col p-2 gap-2" style={{ height: "calc(100vh - 105px)" }} id="project-management-split-view">
      <div className="flex items-center justify-between py-2 px-4 bg-[var(--primary)] text-white border rounded-md shadow-sm">
        <h1 className="text-lg font-medium truncate max-w-md mx-2">
          {project.Name} - {project.Description}
        </h1>

        <div className="flex items-center gap-2">
          <Button
            id="editProjectButton"
            variant=""
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            className="bg-white text-[var(--primary)]"
          >
            Modifica
          </Button>

          { (project.TBCreatedId == currentUserId || currentUserId == '0') && (
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

          <div className="flex-1 min-h-0 overflow-hidden" id="project-management-split-view-content2">
            <TabsContent value="overview" className="h-full overflow-hidden">
              <div className="h-full overflow-y-auto p-4">
                <ProjectOverview project={project} />
              </div>
            </TabsContent>

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

            <TabsContent value="articles" className="h-full overflow-auto" id="articles-tab">
                <ProjectArticlesTab project={project} canEdit={true} />
            </TabsContent>

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
      />

      <NewTaskPanel
        isOpen={isAddTaskPanelOpen}
        onClose={() => setIsAddTaskPanelOpen(false)}
        onTaskCreated={handleAddTask}
        projectTasks={project.tasks || []}
        projectId={projectId}
        position={taskPanelPosition}
        defaultWidth={500}
        refreshProject={(callback) => loadProject(true, callback)}
      />

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

// Componente principale
const ProjectManagementSplitView = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const location = useLocation();
  const { fetchUsers } = useNotifications();
  const [leftPanelWidth, setLeftPanelWidth] = useState(33.33);
  const [previousLeftPanelWidth, setPreviousLeftPanelWidth] = useState(33.33);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);
  const tableRef = useRef(null);
  const scrollContainerRef = useRef(null);
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
    toggleProjectLock,
    manageProjectPin,
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
  const [columnFilters, setColumnFilters] = useState({
    name: "",
    company: "",
    status: "",
    endDate: "",
    erpId: "",
  });
  
  // Stati per gestire i pin dei progetti
  const [pinnedProjects, setPinnedProjects] = useState(new Set());
  const [pinLoading, setPinLoading] = useState(null);
  
  // Stati per il ridimensionamento delle colonne
  const [columnWidths, setColumnWidths] = useState([
    250, // name
    300, // description
    200, // company
    120, // status
    120, // endDate
    150, // tasks
    80   // actions
  ]);
  const [isResizingColumn, setIsResizingColumn] = useState(null);

  // Estrai projectId e autoSelect dall'URL
  const searchParams = new URLSearchParams(location.search);
  const urlProjectId = searchParams.get('projectId');
  const autoSelect = searchParams.get('autoSelect') === 'true';

  // Funzione per gestire il toggle del pannello sinistro
  const toggleLeftPanel = () => {
    if (isLeftPanelCollapsed) {
      setLeftPanelWidth(previousLeftPanelWidth);
      setIsLeftPanelCollapsed(false);
    } else {
      setPreviousLeftPanelWidth(leftPanelWidth);
      setLeftPanelWidth(0);
      setIsLeftPanelCollapsed(true);
    }
  };

  // Funzione per gestire il resize
  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e) => {
    if (!isResizing || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    if (newWidth >= 20 && newWidth <= 80) {
      setLeftPanelWidth(newWidth);
      setIsLeftPanelCollapsed(false);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Gestisce il ridimensionamento delle colonne
  const handleColumnMouseDown = (e, index) => {
    e.preventDefault();
    setIsResizingColumn(index);
  };

  const handleColumnMouseMove = useCallback(
    (e) => {
      if (isResizingColumn === null || !scrollContainerRef.current) return;

      const table = scrollContainerRef.current.querySelector('table');
      if (!table) return;

      const ths = table.querySelectorAll('thead th');
      const startX = ths[isResizingColumn].getBoundingClientRect().left;
      const currentX = e.clientX;
      const diff = currentX - startX;
      
      setColumnWidths(prev => {
        const newWidths = [...prev];
        newWidths[isResizingColumn] = Math.max(80, diff);
        return newWidths;
      });
    },
    [isResizingColumn]
  );

  const handleColumnMouseUp = useCallback(() => {
    setIsResizingColumn(null);
  }, []);

  useEffect(() => {
    if (isResizingColumn !== null) {
      document.addEventListener('mousemove', handleColumnMouseMove);
      document.addEventListener('mouseup', handleColumnMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleColumnMouseMove);
      document.removeEventListener('mouseup', handleColumnMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingColumn, handleColumnMouseMove, handleColumnMouseUp]);

  // Gestisce il pin dei progetti
  const handlePinProject = async (projectId, isPinned) => {
    try {
      setPinLoading(projectId);
      const action = isPinned ? 'UNPIN' : 'PIN';
      const result = await manageProjectPin(projectId, action);
      
      if (result.success) {
        setPinnedProjects(prev => {
          const newSet = new Set(prev);
          if (isPinned) {
            newSet.delete(projectId);
          } else {
            newSet.add(projectId);
          }
          return newSet;
        });
        
        toast({
          title: isPinned ? "Pin rimosso" : "Progetto fissato",
          description: result.msg,
          variant: "success",
          duration: 2000,
        });
        
        // Ricarica i progetti per aggiornare l'ordine
        await fetchProjects(0, 100, filters);
      }
    } catch (error) {
      console.error("Error pinning project:", error);
      toast({
        title: "Errore",
        description: "Errore nella gestione del pin",
        variant: "destructive",
      });
    } finally {
      setPinLoading(null);
    }
  };

  // Caricamento iniziale
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);

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

        if (Array.isArray(usersResponse)) {
          setUsers(usersResponse);
        }

        await getUserProjectStatistics().then(setStatistics);

        const projectsData = await fetchProjects(0, 100, filters);
        
        if (projectsData && projectsData.items) {
          const pinned = new Set(
            projectsData.items.filter(p => p.IsPinned).map(p => p.ProjectID)
          );
          setPinnedProjects(pinned);
        }

        if (urlProjectId && !isNaN(parseInt(urlProjectId))) {
          selectProject(parseInt(urlProjectId));
          if (autoSelect) {
            navigate(`/progetti/dashboard?projectId=${urlProjectId}`, { replace: true });
          }
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        swal.fire("Errore", "Errore nel caricamento dei dati", "error");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [urlProjectId, autoSelect]);

  // Seleziona un progetto
  const selectProject = (id) => {
    if (!id || isNaN(id)) {
      console.warn("Invalid project ID:", id);
      return;
    }

    setSelectedProjectId(id);
  };

  // Filtra e ordina i progetti
  const getFilteredAndSortedProjects = useCallback(() => {
    let filteredProjects = [...projects];

    if (filters.status && filters.status !== "all") {
      filteredProjects = filteredProjects.filter(
        (p) => p.Status === filters.status,
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

    if (columnFilters.name) {
      filteredProjects = filteredProjects.filter((p) =>
        p.Name?.toLowerCase().includes(columnFilters.name.toLowerCase())
      );
    }

    if (columnFilters.company) {
      filteredProjects = filteredProjects.filter((p) =>
        p.CompanyName?.toLowerCase().includes(columnFilters.company.toLowerCase())
      );
    }

    if (columnFilters.status && columnFilters.status !== "all") {
      filteredProjects = filteredProjects.filter(
        (p) => p.Status === columnFilters.status
      );
    }

    if (columnFilters.endDate) {
      filteredProjects = filteredProjects.filter((p) => {
        if (!p.EndDate) return false;
        const projectDate = new Date(p.EndDate).toISOString().split('T')[0];
        return projectDate === columnFilters.endDate;
      });
    }

    if (columnFilters.erpId) {
      filteredProjects = filteredProjects.filter((p) =>
        p.ProjectErpID?.toLowerCase().includes(columnFilters.erpId.toLowerCase())
      );
    }
    
    const pinnedProjectsList = filteredProjects.filter(p => pinnedProjects.has(p.ProjectID));
    const unpinnedProjectsList = filteredProjects.filter(p => !pinnedProjects.has(p.ProjectID));

    pinnedProjectsList.sort((a, b) => (a.PinOrder || 0) - (b.PinOrder || 0));

    if (sortConfig.key) {
      unpinnedProjectsList.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }

    return [...pinnedProjectsList, ...unpinnedProjectsList];
  }, [projects, filters, sortConfig, columnFilters, pinnedProjects]);

  // Gestisce il clic sull'intestazione per l'ordinamento
  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Gestisce i filtri delle colonne
  const handleColumnFilter = (column, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
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

        const projectsData = await fetchProjects(0, 100, cleanedFilters);
        
        if (projectsData && projectsData.items) {
          const pinned = new Set(
            projectsData.items.filter(p => p.IsPinned).map(p => p.ProjectID)
          );
          setPinnedProjects(pinned);
        }
        
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
    setColumnFilters({
      name: "",
      company: "",
      status: "",
      endDate: "",
      erpId: "",
    });
  };

  // Funzione per forzare un refresh completo dei progetti
  const refreshAllProjects = useCallback(async () => {
    try {
      setLoading(true);
      const projectsData = await fetchProjects(0, 100, filters);
      
      if (projectsData && projectsData.items) {
        const pinned = new Set(
          projectsData.items.filter(p => p.IsPinned).map(p => p.ProjectID)
        );
        setPinnedProjects(pinned);
      }
      
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

  const statusOptions = projectStatuses?.map(status => ({
    value: status.Id,
    label: status.StatusDescription
  })) || [];

  // Rendering
  return (
    <div className="flex relative" style={{ height: "calc(100vh - 105px)" }} ref={containerRef}>
      {/* Pulsante toggle pannello sinistro */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLeftPanel}
        className={`absolute top-4 z-20 transition-all duration-300 ${
          isLeftPanelCollapsed ? 'left-2' : 'left-2'
        }`}
        style={{
          left: isLeftPanelCollapsed ? '8px' : `calc(${leftPanelWidth}% - 40px)`,
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      >
        {isLeftPanelCollapsed ? (
          <PanelLeft className="h-5 w-5 text-black-50" />
        ) : (
          <PanelLeftClose className="h-5 w-5 text-black-50" />
        )}
      </Button>

      {/* Sezione sinistra (resizable) */}
      <div 
        className={`h-full flex flex-col p-4 transition-all duration-300 ${
          isLeftPanelCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ 
          width: isLeftPanelCollapsed ? '0%' : `${leftPanelWidth}%`, 
          height: "calc(100vh - 105px)",
          marginLeft: isLeftPanelCollapsed ? '-20px' : '0'
        }}
      >
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
              onProjectUpdated={refreshAllProjects}
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
                {(Object.values(filters).some((v) => v && v !== "all") ||
                  Object.values(columnFilters).some((v) => v)) && (
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

        {/* Tabella stile Excel */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <span className="text-gray-500">Caricamento...</span>
            </div>
          ) : projects.length === 0 ? (
            <Alert className="m-4">
              <AlertDescription className="flex items-center justify-center">
                <span>Nessun progetto disponibile.</span>
              </AlertDescription>
            </Alert>
          ) : getFilteredAndSortedProjects().length === 0 ? (
            <Alert className="m-4">
              <AlertDescription className="flex items-center justify-between">
                <span>Nessun progetto trovato con i filtri selezionati.</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="ml-3 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Reset filtri
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex-1 flex flex-col min-h-0" id="project-table-div" ref={tableRef}>
              <div className="flex-1 overflow-auto overflow-x-auto" id="project-table-div2" ref={scrollContainerRef}>
                <Table
                 id="project-table"
                 className="min-w-full"
                 style={{ 
                   minWidth: `${columnWidths.reduce((sum, width) => sum + width, 0)}px` 
                 }}
                >
                  <TableHeader className="sticky top-0 bg-gray-100 z-10">
                    <TableRow>
                      <TableHead
                        style={{ width: `${columnWidths[0]}px`, position: 'relative' }}
                        className="cursor-pointer hover:bg-gray-200 whitespace-nowrap"
                        onClick={() => handleSort("Name")}
                      >
                        <div className="flex items-center">
                          Nome
                          {sortConfig.key === "Name" && (
                            <span className="ml-1">
                              {sortConfig.direction === "ascending" ? "↑" : "↓"}
                            </span>
                          )}
                          <ColumnFilter
                            column="text"
                            value={columnFilters.name}
                            onChange={(value) => handleColumnFilter("name", value)}
                          />
                        </div>
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleColumnMouseDown(e, 0)}
                        />
                      </TableHead>
                      <TableHead
                        style={{ width: `${columnWidths[1]}px`, position: 'relative' }}
                        className="cursor-pointer hover:bg-gray-200 whitespace-nowrap"
                        onClick={() => handleSort("Description")}
                      >
                        <div className="flex items-center">
                          Descrizione
                          {sortConfig.key === "Description" && (
                            <span className="ml-1">
                              {sortConfig.direction === "ascending" ? "↑" : "↓"}
                            </span>
                          )}
                          <ColumnFilter
                            column="text"
                            value={columnFilters.description}
                            onChange={(value) => handleColumnFilter("description", value)}
                          />
                        </div>
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleColumnMouseDown(e, 1)}
                        />
                      </TableHead>
                      <TableHead
                        style={{ width: `${columnWidths[2]}px`, position: 'relative' }}
                        className="cursor-pointer hover:bg-gray-200 whitespace-nowrap"
                        onClick={() => handleSort("CompanyName")}
                      >
                        <div className="flex items-center">
                          Cliente
                          {sortConfig.key === "CompanyName" && (
                            <span className="ml-1">
                              {sortConfig.direction === "ascending" ? "↑" : "↓"}
                            </span>
                          )}
                          <ColumnFilter
                            column="text"
                            value={columnFilters.company}
                            onChange={(value) => handleColumnFilter("company", value)}
                          />
                        </div>
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleColumnMouseDown(e, 2)}
                        />
                      </TableHead>
                      <TableHead style={{ width: `${columnWidths[3]}px`, position: 'relative' }} className="whitespace-nowrap">
                        <div className="flex items-center">
                          Stato
                          <ColumnFilter
                            column="select"
                            value={columnFilters.status}
                            onChange={(value) => handleColumnFilter("status", value)}
                            options={statusOptions}
                          />
                        </div>
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleColumnMouseDown(e, 3)}
                        />
                      </TableHead>
                      <TableHead
                        style={{ width: `${columnWidths[4]}px`, position: 'relative' }}
                        className="cursor-pointer hover:bg-gray-200 whitespace-nowrap"
                        onClick={() => handleSort("EndDate")}
                      >
                        <div className="flex items-center">
                          Scadenza
                          {sortConfig.key === "EndDate" && (
                            <span className="ml-1">
                              {sortConfig.direction === "ascending" ? "↑" : "↓"}
                            </span>
                          )}
                          <ColumnFilter
                            column="date"
                            value={columnFilters.endDate}
                            onChange={(value) => handleColumnFilter("endDate", value)}
                          />
                        </div>
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleColumnMouseDown(e, 4)}
                        />
                      </TableHead>
                      <TableHead style={{ width: `${columnWidths[5]}px`, position: 'relative' }} className="text-right whitespace-nowrap">
                        Attività
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleColumnMouseDown(e, 5)}
                        />
                      </TableHead>
                      <TableHead style={{ width: `${columnWidths[6]}px` }} className="text-center">
                        Azioni
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredAndSortedProjects().map((project) => {
                      const isPinned = pinnedProjects.has(project.ProjectID);
                      
                      return (
                        <TableRow
                          key={project.ProjectID}
                          className={`
                            relative
                            ${selectedProjectId === project.ProjectID
                              ? "bg-blue-50 hover:bg-blue-100"
                              : "hover:bg-gray-50"}
                            ${isPinned ? "bg-yellow-50 border-l-4 border-l-yellow-400" : ""}
                            cursor-pointer
                          `}
                          onClick={() => selectProject(project.ProjectID)}
                        >
                          <TableCell className="font-medium py-1 whitespace-nowrap">
                            <div className="flex items-start gap-1">
                              {isPinned && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Pin className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Progetto fissato</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <span className="truncate max-w-[120px]">
                                {project.Name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-1 text-sm text-gray-600 truncate max-w-[120px] whitespace-nowrap">
                            {project.Description || "-"}
                          </TableCell>
                          <TableCell className="py-1 text-sm text-gray-600 truncate max-w-[120px] whitespace-nowrap">
                            {project.CompanyName || "-"}
                          </TableCell>
                          <TableCell className="py-1 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                  backgroundColor: project.StatusColor || "#CCCCCC",
                                }}
                              />
                              <span className="text-xs truncate max-w-[80px]">
                                {project.StatusDescription}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-1 text-xs whitespace-nowrap">
                            {project.EndDate ? new Date(project.EndDate).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell className="py-1 text-right whitespace-nowrap">
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
                              {project.TaskAperteInRitardo > 0 && (
                                <div className="flex items-center px-1.5 py-0.5 rounded-md bg-red-100 text-red-700">
                                  <TriangleAlert className="w-3 h-3 mr-1" />
                                  <span className="text-xs font-medium">
                                    {project.TaskAperteInRitardo}
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-1 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectProject(project.ProjectID);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Visualizza
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePinProject(project.ProjectID, isPinned);
                                  }}
                                  disabled={pinLoading === project.ProjectID}
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
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Resize handle */}
      {!isLeftPanelCollapsed && (
        <div
          className={`w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors ${
            isResizing ? 'bg-blue-600' : 'bg-gray-200'
          }`}
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Sezione destra (resizable) */}
      <div 
        className="h-full flex flex-col overflow-hidden transition-all duration-300" 
        style={{ 
          width: isLeftPanelCollapsed ? '100%' : `${100 - leftPanelWidth}%`, 
          height: "calc(100vh - 105px)" 
        }}
      >
        {selectedProjectId ? (
          <ProjectDetailContainer 
            projectId={selectedProjectId} 
            refreshAllProjects={refreshAllProjects}
            resetSelectedProject={resetSelectedProject}
            leftPanelWidth={isLeftPanelCollapsed ? 0 : leftPanelWidth}
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