import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  PieChart,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { swal } from "../../../lib/common";
import useProjectActions from "../../../hooks/useProjectManagementActions";
import useProjectCustomersActions from "../../../hooks/useProjectCustomersActions";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import useUsers from "../../../hooks/useUsersActions";
import ProjectDetailContainer from "./ProjectDetailContainer";
import ProjectListSection from "./ProjectListSection/ProjectListSection";

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
  
  const {
    projects,
    loading: projectsLoading,
    fetchProjects,
    addUpdateProject,
    getUserProjectStatistics,
    categories,
    fetchCategories,
    projectStatuses,
    fetchProjectStatuses,
    manageProjectPin,
  } = useProjectActions();

  const {
    projectCustomers,
    loading: loadingCustomers,
    fetchProjectCustomers,
  } = useProjectCustomersActions();

  const { users, loading: loadingUsers, fetchUsers: fetchAllUsers } = useUsers();

  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(
    projectId && !isNaN(parseInt(projectId)) ? parseInt(projectId) : null,
  );
  const [statistics, setStatistics] = useState({
    activeProjects: 0,
    activeTasks: 0,
    delayedProjects: 0,
    delayedTasks: 0,
  });
  const [pinnedProjects, setPinnedProjects] = useState(new Set());

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

        // Carica anche gli utenti con l'hook useUsers
        await fetchAllUsers();

        await getUserProjectStatistics().then(setStatistics);

        const projectsData = await fetchProjects(0, 100, {});
        
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

  // Funzione per forzare un refresh completo dei progetti
  const refreshAllProjects = useCallback(async () => {
    try {
      setLoading(true);
      const projectsData = await fetchProjects(0, 100, {});
      
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
  }, [fetchProjects, getUserProjectStatistics]);

  // Funzione per resettare il progetto selezionato
  const resetSelectedProject = useCallback(() => {
    setSelectedProjectId(null);
  }, []);

// Evento per gestire apertura task dalle chat
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

    // Carica anche gli utenti con l'hook useUsers
    await fetchAllUsers();

    await getUserProjectStatistics().then(setStatistics);

    const projectsData = await fetchProjects(0, 100, {});
    
    if (projectsData && projectsData.items) {
      const pinned = new Set(
        projectsData.items.filter(p => p.IsPinned).map(p => p.ProjectID)
      );
      setPinnedProjects(pinned);
    }

    if (urlProjectId && !isNaN(parseInt(urlProjectId))) {
      selectProject(parseInt(urlProjectId));
      
      // NUOVA PARTE: Gestisci openTaskId se presente
      const openTaskId = searchParams.get('openTaskId');
      if (openTaskId && !isNaN(parseInt(openTaskId))) {
        // Salva l'ID della task da aprire
        sessionStorage.setItem('pendingTaskToOpen', openTaskId);
      }
      
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
          left: isLeftPanelCollapsed ? '-10px' : `calc(${leftPanelWidth}% - 40px)`,
          top: '50%',
          
        }}
      >
        {isLeftPanelCollapsed ? (
          <PanelLeft className="h-5 w-5 text-black-50" />
        ) : (
          <PanelLeftClose className="h-5 w-5 text-black-50" />
        )}
      </Button>

      {/* Sezione sinistra (resizable) */}
      <ProjectListSection
        isLeftPanelCollapsed={isLeftPanelCollapsed}
        leftPanelWidth={leftPanelWidth}
        projects={projects}
        projectStatuses={projectStatuses}
        categories={categories}
        customers={projectCustomers}
        users={users}
        loading={loading}
        loadingCustomers={loadingCustomers}
        selectedProjectId={selectedProjectId}
        pinnedProjects={pinnedProjects}
        setPinnedProjects={setPinnedProjects}
        statistics={statistics}
        onSelectProject={selectProject}
        onProjectCreated={refreshAllProjects}
        addUpdateProject={addUpdateProject}
        fetchProjects={fetchProjects}
        getUserProjectStatistics={getUserProjectStatistics}
        manageProjectPin={manageProjectPin}
        setStatistics={setStatistics}
      />

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
            users={users}
            loadingUsers={loadingUsers}
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