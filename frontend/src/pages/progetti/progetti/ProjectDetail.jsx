import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Users, AlertCircle, PieChartIcon, Info, Layout, Package, ArrowLeft, Circle} from 'lucide-react';
import { swal } from '../../../lib/common';
import TasksKanban from './ProjectTasksKanban';
import ProjectGanttView from './ProjectGanttView'; 
import { hasAdminPermission, canEditMemberRole } from '@/lib/taskPermissionsUtils';
import ProjectTasksTableImproved from './ProjectTasksTable'; // Importa il componente tabella
import TasksViewToggler from './TasksViewToggler'; // Importa il componente toggles
import TasksLegend from './TasksLegend'; // Importa il componente legenda
import ProjectEditModalWithTemplate from './ProjectEditModalWithTemplate';
import TeamMemberWithRole from './TeamMemberWithRole';
import useProjectActions from '../../../hooks/useProjectManagementActions';
import NewTaskForm from './NewTaskForm'; 
import TaskDetailsDialog from './TaskDetailsDialog';
import ProjectEditModal from './ProjectEditModal';
import ProjectArticlesTab from './articoli/ProjectArticlesTab';
import ProjectAttachmentsTab from './ProjectAttachmentsTab';
import ProjectTeamSection from './ProjectTeamSection';
import ProjectAnalyticsTab from './analytics/ProjectAnalyticsTab';
import useUsers from '../../../hooks/useUsersActions';

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
                  <div  className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: project.StatusColor || '#CCCCCC' }}
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
                <div className="text-sm font-medium text-gray-500">Categoria</div>
                <div className="flex items-center gap-2 mt-1">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: project.CategoryColor || '#000000' }}
                  />
                  <span className="text-sm">
                    {project.CategoryDescription}
                    {project.SubCategoryDescription && (
                      <span className="text-gray-500 ml-1">
                        {'› '}{project.SubCategoryDescription}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div>
              <div className="text-sm font-medium text-gray-500">Data inizio</div>
              <div className="text-sm flex items-center gap-1 mt-1">
                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                {new Date(project.StartDate).toLocaleDateString()}
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-gray-500">Data scadenza</div>
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
                </Badge>
                {' '}
                {project.TaskCompletate > 0 && (
                  <Badge variant="" className="bg-green-100 text-green-800 ml-1">
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
              <div className="text-sm font-medium text-gray-500">Membri team</div>
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

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [editedProject, setEditedProject] = useState(null);
  const [newMember, setNewMember] = useState({ userId: '', role: 'USER' });
  const { users, loading: loadingUsers, fetchUsers } = useUsers();
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // Inizia con la panoramica
  // Stato per gestire la vista delle attività (kanban o tabella)
  const [tasksViewMode, setTasksViewMode] = useState("kanban");
  
  // Aggiungiamo i refs necessari
  const isMounted = useRef(true);
  const refreshInProgress = useRef(false);
  const preventDialogOpen = useRef(false); // Per evitare l'apertura del dialog durante modifiche in-line

  const handleBack = () => {
    navigate('/progetti/dashboard');
  };

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
      const userString = localStorage.getItem('user');
      if (userString) {
        const userData = JSON.parse(userString);
        return userData.userId;
      }
      return null;
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      return null;
    }
  });

  const loadProject = useCallback(async (callback) => {
    if (!isMounted.current || refreshInProgress.current) return;
    
    try {
      refreshInProgress.current = true;
      
      // Salva lo stato attuale dei task prima di aggiornare
      const currentTaskStates = {};
      if (project?.tasks) {
        project.tasks.forEach(task => {
          currentTaskStates[task.TaskID] = {
            Status: task.Status,
            // Altri stati che potremmo voler preservare visivamente
            isUpdating: task.isUpdating || false
          };
        });
      }
      
      const projectData = await getProjectById(parseInt(projectId));
      if (!isMounted.current) return;
  
      // Aggiorna il progetto ma mantiene lo stato delle attività esistenti per evitare 
      // rimontaggi del componente che potrebbero causare problemi con gli eventi UI
      setProject(prevProject => {
        // Se è il primo caricamento, usa direttamente i dati
        if (!prevProject) return projectData;
  
        // Se siamo in visualizzazione Gantt o Kanban e abbiamo già delle attività,
        // mantieni riferimenti alle attività esistenti per evitare rimontaggio inutile
        if ((activeTab === "tasks" && 
            (tasksViewMode === "gantt" || tasksViewMode === "kanban")) && 
            prevProject.tasks?.length > 0) {
          
          // Verifica se le attività sono cambiate in modo significativo (nuove attività o rimosse)
          const prevTaskIds = new Set(prevProject.tasks.map(t => t.TaskID));
          const newTaskIds = new Set(projectData.tasks.map(t => t.TaskID));
          
          // Confronta gli insiemi per vedere se ci sono differenze
          const hasNewTasks = [...newTaskIds].some(id => !prevTaskIds.has(id));
          const hasRemovedTasks = [...prevTaskIds].some(id => !newTaskIds.has(id));
          
          // Se sono state aggiunte o rimosse attività, aggiorna completamente
          if (hasNewTasks || hasRemovedTasks) {
            console.log("Attività aggiunte o rimosse, aggiorno completamente il progetto");
            return projectData;
          }
          
          // Altrimenti, fai un aggiornamento "intelligente" che preserva i riferimenti
          // per le attività che non sono cambiate di stato
          console.log("Aggiornamento intelligente delle attività per evitare scatti nel kanban/gantt");
          
          // Crea una mappa delle nuove attività per facile accesso
          const newTasksMap = {};
          projectData.tasks.forEach(task => {
            newTasksMap[task.TaskID] = task;
          });
          
          // Aggiorna selettivamente le attività esistenti
          const updatedTasks = prevProject.tasks.map(prevTask => {
            const newTask = newTasksMap[prevTask.TaskID];
            if (!newTask) return prevTask; // Questo non dovrebbe accadere dato il controllo precedente
            
            const prevStatus = prevTask.Status;
            const newStatus = newTask.Status;
            
            // Se lo stato non è cambiato, mantieni alcune proprietà dell'interfaccia utente
            // per evitare scatti visivi durante gli aggiornamenti
            if (prevStatus === newStatus && currentTaskStates[prevTask.TaskID]?.isUpdating) {
              return {
                ...newTask,
                // Preserva proprietà di state UI che non vogliamo perdere
                isUpdating: currentTaskStates[prevTask.TaskID].isUpdating
              };
            }
            
            // Se lo stato è cambiato, usa completamente la nuova versione
            return newTask;
          });
          
          // Restituisci la versione aggiornata del progetto con le attività aggiornate
          return {
            ...projectData,
            tasks: updatedTasks
          };
        }
        
        // Per altre visualizzazioni o se non abbiamo ancora attività, aggiorna tutto
        return projectData;
      });
      
      // Se c'è un task selezionato, aggiornalo con i nuovi dati
      if (selectedTask) {
        const updatedTask = projectData.tasks.find(t => t.TaskID === selectedTask.TaskID);
        if (updatedTask) {
          setSelectedTask(updatedTask);
        }
      }
      
      // Esegui la callback opzionale passata
      if (typeof callback === 'function') {
        callback();
      }
    } catch (error) {
      if (isMounted.current) {
        console.error('Error loading project:', error);
        swal.fire('Errore', 'Errore nel caricamento del progetto', 'error');
      }
    } finally {
      // Ritarda il reset del flag per dare tempo al browser di processare gli eventi UI
      setTimeout(() => {
        if (isMounted.current) {
          refreshInProgress.current = false;
        }
      }, 300);
    }
  }, [projectId, selectedTask, activeTab, tasksViewMode, project]);
  
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
    loadProject();
  }, [projectId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleProjectUpdate = async () => {
    try {
        // Puliamo i dati prima di inviarli
        const cleanedProject = {
            ProjectID: editedProject.ProjectID,
            Name: editedProject.Name,
            Description: editedProject.Description || '',
            StartDate: editedProject.StartDate?.split('T')[0],
            EndDate: editedProject.EndDate?.split('T')[0],
            Status: editedProject.Status,
            ProjectCategoryId: parseInt(editedProject.ProjectCategoryId) || 0,
            ProjectCategoryDetailLine: parseInt(editedProject.ProjectCategoryDetailLine) || 0,
            Disabled: parseInt(editedProject.Disabled) || 0,
            CustSupp: Array.isArray(editedProject.CustSupp) ? 
                (editedProject.CustSupp[0] || 0) : 
                (parseInt(editedProject.CustSupp) || 0),
            TBCreatedId: editedProject.TBCreatedId,
            ProjectErpID: editedProject.ProjectErpID || ''
        };
        
        const result = await addUpdateProject(cleanedProject);
        if (result.success) {
            setProject(editedProject);
            setIsEditMode(false);
            setIsEditModalOpen(false);
            swal.fire('Successo', 'Progetto aggiornato con successo', 'success');
        }
    } catch (error) {
        console.error('Error updating project:', error);
        swal.fire('Errore', 'Errore nell\'aggiornamento del progetto', 'error');
    }
};

  const handleDisableProject = async () => {
    const disabledProject = {
      ...project,
      Disabled: 1
    };
    try {
      const result = await addUpdateProject(disabledProject);
      if (result.success) {
        setProject(disabledProject);
        setEditedProject(disabledProject);
        swal.fire('Successo', 'Progetto disabilitato con successo', 'success');
        navigate('/progetti/dashboard');
      }
    } catch (error) {
      console.error('Error disabling project:', error);
      swal.fire('Errore', 'Errore nella disabilitazione del progetto', 'error');
    }
  };

  const handleAddTask = async (taskData) => {
    try {
      const formattedTask = {
        ...taskData,
        ProjectID: parseInt(projectId),
        AssignedTo: parseInt(taskData.AssignedTo),
        AdditionalAssignees: taskData.AdditionalAssignees
      };
      
      const result = await addUpdateProjectTask(formattedTask);
      if (result.success) {
        setIsAddTaskDialogOpen(false);
        await loadProject(); // Usa loadProject invece di getProjectById
        swal.fire('Successo', 'Attività aggiunta con successo', 'success');
      }
    } catch (error) {
      console.error('Error adding task:', error);
      swal.fire('Errore', 'Errore nell\'aggiunta dell\'attività', 'error');
    }
  };

  const handleTaskUpdate = useCallback(async (taskData, shouldCloseModal = false) => {
    if (!isMounted.current) return { success: false };
    
    try {
      preventDialogOpen.current = true; // Previeni l'apertura del modale durante l'aggiornamento
      
      // Prepariamo i dati per l'API assicurandoci di avere tutti i campi necessari
      const completeTaskData = {
        ...taskData,
        ProjectID: parseInt(projectId)
      };
      
      // Assicuriamoci che AssignedTo sia un numero
      if (typeof completeTaskData.AssignedTo === 'string') {
        completeTaskData.AssignedTo = parseInt(completeTaskData.AssignedTo);
      }
      
      // Assicuriamoci che tutti i campi siano nel formato corretto
      if (completeTaskData.DueDate && typeof completeTaskData.DueDate === 'string') {
        // Manteniamo il formato corretto della data
        if (!completeTaskData.DueDate.includes('T')) {
          completeTaskData.DueDate = completeTaskData.DueDate + 'T00:00:00';
        }
      }
      
      // Log dei dati che stiamo inviando
      console.log('ProjectDetail invia:', completeTaskData);
      
      const result = await addUpdateProjectTask(completeTaskData);
      console.log('ProjectDetail riceve:', result);
      
      if (result.success && isMounted.current) {
        // Prima aggiorna il progetto localmente
        setProject(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => 
            t.TaskID === completeTaskData.TaskID ? { ...t, ...completeTaskData } : t
          )
        }));
        
        // Gestisci la chiusura del modale e l'aggiornamento del task selezionato
        if (shouldCloseModal || completeTaskData.Status !== selectedTask?.Status) {
          setIsTaskDialogOpen(false);
          setSelectedTask(null);
        } else if (selectedTask?.TaskID === completeTaskData.TaskID) {
          // Se non chiudiamo il modale, aggiorna il task selezionato
          setSelectedTask(prev => ({ ...prev, ...completeTaskData }));
        }
  
        // Mostra una notifica di successo solo se richiesta
        if (shouldCloseModal) {
          swal.fire({
            title: 'Successo',
            text: 'Attività aggiornata con successo',
            icon: 'success',
            timer: 1500,
            timerProgressBar: true,
            showConfirmButton: false
          });
        }
  
        // Aggiorna il progetto in background solo dopo aver gestito l'UI
        await loadProject();
  
        // Restituisci un oggetto di successo con il task aggiornato
        return { success: true, task: { ...completeTaskData } };
      }
      return { success: false };
    } catch (error) {
      if (isMounted.current) {
        console.error('Error updating task:', error);
        swal.fire('Errore', 'Errore nell\'aggiornamento dell\'attività', 'error');
      }
      return { success: false };
    } finally {
      setTimeout(() => {
        preventDialogOpen.current = false; // Riabilita l'apertura del modale dopo l'aggiornamento
      }, 300);
    }
  }, [projectId, selectedTask, addUpdateProjectTask, loadProject]);

/**
 * Aggiorna il ruolo di un membro del progetto
 * @param {Object} memberData - Dati del membro (projectMemberId, userId, role)
 * @returns {Promise<Boolean>} - Promise che restituisce true se l'aggiornamento è andato a buon fine
 */
const updateMemberRole = async (memberData) => {
  try {
    // Verifica che l'utente corrente sia un admin del progetto
    if (!hasAdminPermission(project, currentUserId)) {
      swal.fire('Attenzione', 'Non hai i permessi per modificare i ruoli', 'warning');
      return false;
    }
    
    // Verifica che l'utente non stia modificando il proprio ruolo
    if (memberData.userId === parseInt(currentUserId)) {
      swal.fire('Attenzione', 'Non puoi modificare il tuo ruolo', 'warning');
      return false;
    }
    
    // Ensure updateProjectMemberRole is properly destructured from the hook
    const result = await updateProjectMemberRole(
      project.ProjectID, 
      memberData.projectMemberId, 
      memberData.role
    );
    
    if (result && result.success) {
      // Aggiorna i membri del progetto
      await loadProject();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error updating member role:', error);
    swal.fire('Errore', 'Errore nella modifica del ruolo', 'error');
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
        const updatedTask = updatedProject.tasks.find(t => t.TaskID === taskId);
        if (updatedTask) {
          setSelectedTask(updatedTask);
        }
        return result;
      }
      return { success: false };
    } catch (error) {
      console.error('Error adding comment:', error);
      swal.fire('Errore', 'Errore nell\'aggiunta del commento', 'error');
      return { success: false };
    }
  };

  const handleAddMember = async () => {
    try {
      if (!newMember.userId) {
        swal.fire('Attenzione', 'Seleziona un utente', 'warning');
        return;
      }
  
      // Prendo tutti i membri esistenti e aggiungo quello nuovo
      const allMembers = [
        ...project.members.map(m => ({
          userId: m.UserID.toString(),
          role: m.Role
        })),
        {
          userId: newMember.userId.toString(),
          role: newMember.role
        }
      ];

      const result = await updateProjectMembers(projectId, allMembers);
      
      if (result.success) {
        const updatedProject = await getProjectById(parseInt(projectId));
        setProject(updatedProject);
        setIsAddMemberDialogOpen(false);
        setNewMember({ userId: '', role: 'USER' });
        setActiveTab("team"); // Mantiene la tab team attiva
        swal.fire('Successo', 'Utente aggiunto con successo', 'success');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      swal.fire('Errore', 'Errore nell\'aggiunta del utente', 'error');
    }
  };
  
  const handleRemoveMember = async (memberId) => {
    try {
      // Swal di conferma
      const askResult = await swal.fire({
        title: 'Sei sicuro?',
        text: 'Questa azione rimuoverà l\'utente dal progetto',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Rimuovi',
        confirmButtonColor: 'red',
        cancelButtonText: 'Annulla'
      });

      if (!askResult.isConfirmed) return;

      // Prendo tutti i membri TRANNE quello da rimuovere
      const remainingMembers = project.members
        .filter(m => m.ProjectMemberID !== memberId)
        .map(m => ({
          userId: m.UserID.toString(),
          role: m.Role
        }));

      const result = await updateProjectMembers(projectId, remainingMembers);
      
      if (result.success) {
        const updatedProject = await getProjectById(parseInt(projectId));
        setProject(updatedProject);
        setActiveTab("team"); // Mantiene la tab team attiva
        swal.fire('Successo', 'utente rimosso con successo', 'success');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      swal.fire('Errore', 'Errore nella rimozione del utente', 'error');
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
      console.error('Error adding comment:', error);
      swal.fire('Errore', 'Errore nell\'aggiunta del commento', 'error');
    }
  };

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="text-gray-500">Caricamento...</span>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-4 gap-4">
      {/* Header minimalista con dashboard, titolo e modifica */}
      <div className="flex items-center justify-between py-2 px-4 bg-[var(--primary)] text-white border rounded-md shadow-sm"> 
        <Button 
          variant=""
          size="sm"
          onClick={() => navigate('/progetti/dashboard')}
          className="flex items-center gap-1 bg-white text-[var(--primary)]"
        >
          <ArrowLeft className="h-4 w-4" id = "backToDashboard"/>
          <span>Dashboard</span>
        </Button>
        
        <h1 className="text-lg font-medium truncate max-w-md mx-2">
          {project.Name}
        </h1>
        
        {checkAdminPermission(project) && (
          <Button 
            id = "editProjectButton"
            variant=""
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            className="bg-white text-[var(--primary)]"
          >
            Modifica
          </Button>
        )}
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
                  <Badge variant="" className="ml-2 bg-gray-200 text-gray-800 fst-italic">
                    {project.tasks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="team" id="project-team-tab">
                <Users className="h-4 w-4 mr-2" />
                Utenti
                {project.members?.length > 0 && (
                  <Badge variant="" className="ml-2 bg-gray-200 text-gray-800 fst-italic">
                    {project.members.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="attachments" id="project-attachments-tab">
                Allegati
                {project.AttachmentsCount > 0 && (
                  <Badge variant="" className="ml-2 bg-gray-200 text-gray-800 fst-italic">
                    {project.AttachmentsCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="articles" id="project-articles-tab">
                <Package className="h-4 w-4 mr-2" />
                Articoli
              </TabsTrigger>
              <TabsTrigger value="analytics" id="project-analytics-tab">
                <PieChartIcon className="h-4 w-4 mr-2" />
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
              
              {checkAdminPermission(project) && (
                <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
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
              )}
            </div>



            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Visualizzazione condizionale in base al viewMode */}
              {tasksViewMode === 'kanban' && (
                <TasksKanban
                  project={project}
                  projectId={projectId}
                  tasks={project.tasks}
                  onTaskUpdate={handleTaskUpdate}
                  onTaskClick={handleTaskClick}
                  refreshProject={loadProject}
                />
              )}
              {tasksViewMode === 'table' && (
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
              {tasksViewMode === 'gantt' && (
                <ProjectGanttView
                  project={project}
                  tasks={project.tasks || []}
                  onTaskClick={handleTaskClick}
                  onTaskUpdate={handleTaskUpdate}
                  checkAdminPermission={checkAdminPermission}
                  isOwnTask={isOwnTask}
                  updateTaskSequence={updateTaskSequence}
                  getProjectById={getProjectById}
                  refreshProject={loadProject}
                  users={users}
                />
              )}
            </div>
          </TabsContent>

          {/* Tab Team */}
          <TabsContent value="team" className="flex-1 mt-2">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-none flex flex-row items-center justify-between">
                {checkAdminPermission(project) && (
                  <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="flex items-center gap-2"
                      >Aggiungi Utente</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Aggiungi utente al Team</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <Label htmlFor="userId">Utente</Label>
                          <Select
                            value={newMember.userId}
                            onValueChange={(value) => setNewMember({ ...newMember, userId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona utente" />
                            </SelectTrigger>
                            <SelectContent>
                              {users
                                .filter(user => !project.members.some(m => m.UserID === user.userId))
                                .sort((a, b) => a.firstName.localeCompare(b.firstName))
                                .map(user => (
                                  <SelectItem key={user.userId} value={user.userId.toString()}>
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
                            onValueChange={(value) => setNewMember({ ...newMember, role: value })}
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
                          disabled={!newMember.userId}
                        >
                          Aggiungi al Team
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0">
                <div className="space-y-3">
                  {project.members?.length > 0 ? (
                    project.members.map((member) => (
                    <TeamMemberWithRole
                      key={member.ProjectMemberID}
                      member={member}
                      onRemove={checkAdminPermission(project) ? handleRemoveMember : null}
                      onRoleUpdate={updateMemberRole}
                      canEditRole={canEditMemberRole(project, currentUserId, member.UserID)}
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
              <CardHeader className="flex-none">
                <CardTitle className="text-lg">Allegati</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ProjectAttachmentsTab
                  project={project}
                  canEdit={checkAdminPermission(project)}
                  onAttachmentChange={loadProject}
                />
              </CardContent>
            </Card>
          </TabsContent>
          {/* Tab Articoli temporanei */}
          <TabsContent value="articles" className="flex-1 mt-2">
            <ProjectArticlesTab 
              project={project}
              canEdit={checkAdminPermission(project)}
            />
          </TabsContent>
          {/* Tab Statistiche */}
          <TabsContent value="analytics" className="flex-1 mt-2">
            <ProjectAnalyticsTab
              project={project}
              refreshProject={loadProject}
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
          loadProject(); // Aggiungi questa chiamata
        }}
        onAddComment={handleAddComment}
        onUpdate={handleTaskUpdate}
        assignableUsers={users}
        refreshProject={loadProject}  // Aggiungi questa prop
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

export default ProjectDetail;