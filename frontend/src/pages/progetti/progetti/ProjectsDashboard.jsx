import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, AlertCircle } from 'lucide-react';
import ProjectEditModalWithTemplate from './ProjectEditModalWithTemplate';
import useProjectActions from '../../../hooks/useProjectManagementActions';
import { ProjectCard, CustomerSearchSelect } from './ProjectComponents';
import CollapsibleFilters from './CollapsibleFilters';
import useProjectCustomersActions, { CUSTOMER_TYPE } from "../../../hooks/useProjectCustomersActions";
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';
import { swal } from '../../../lib/common';
import { config } from '../../../config';
import { delay } from 'lodash';

// Componente per le statistiche
const StatisticCard = ({ title, value, color = "text-gray-900", icon: Icon }) => (
  <Card className="bg-gray-100 h-full">
    <CardHeader className="pb-2 space-y-0">
      <CardTitle className="text-sm sm:text-base text-gray-500 font-medium flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className={`text-xl sm:text-3xl font-bold ${color}`}>{value}</div>
    </CardContent>
  </Card>
);

const ProjectsList = ({ projects, loading, onViewDetails }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-gray-500">Caricamento...</span>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          Nessun progetto trovato.
        </AlertDescription>
      </Alert>
    );
  }

  return projects.map(project => (
    <ProjectCard
      key={project.ProjectID}
      project={project}
      onViewDetails={onViewDetails}
      tasks = {project.Tasks}
    />
  ));
};

// Hook personalizzato per la memorizzazione degli utenti
const useMemoizedUsers = (initialUsers = []) => {
  const [users, setUsers] = useState(initialUsers);
  const lastValidUsersRef = useRef(initialUsers);
  const usersLoadedRef = useRef(false);
  const lastUsersFetchTimeRef = useRef(0);
  const MIN_FETCH_INTERVAL = 30000; // 30 secondi

  const updateUsers = useCallback((newUsers) => {
    if (Array.isArray(newUsers) && newUsers.length > 0) {
      setUsers(newUsers);
      lastValidUsersRef.current = newUsers;
      usersLoadedRef.current = true;
      lastUsersFetchTimeRef.current = Date.now();
    }
  }, []);

  const getUsers = useCallback(() => {
    return users.length > 0 ? users : lastValidUsersRef.current;
  }, [users]);

  const shouldFetchUsers = useCallback(() => {
    return !usersLoadedRef.current || 
           (Date.now() - lastUsersFetchTimeRef.current > MIN_FETCH_INTERVAL);
  }, []);

  return {
    users: getUsers(),
    updateUsers,
    shouldFetchUsers,
    usersLoaded: usersLoadedRef.current
  };
};

// Componente principale Dashboard
const ProjectsDashboard = () => {
  const navigate = useNavigate();
  const { fetchUsers } = useNotifications();
  const { projects
          , loading: projectsLoading
          , fetchProjects
          , addUpdateProject
          , getUserProjectStatistics
          , checkAdminPermission
          , categories         
          , fetchCategories     
          , projectStatuses
          , fetchProjectStatuses 
          } = useProjectActions();

  const { projectCustomers, loading: loadingCustomers, fetchProjectCustomers } = useProjectCustomersActions();

  const [canCreateProjects, setCanCreateProjects] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formErrors, setFormErrors] = useState({});
  const [filters, setFilters] = useState({
    status: 'all',
    searchText: '',
    dueDate: '',
    categoryId: '',
    custSupp: null,  // Cambiato da '' a null
    projectErpId: '',
    taskAssignedTo: null
  });
  const [statistics, setStatistics] = useState({
    activeProjects: 0,
    activeTasks: 0,
    delayedProjects: 0,
    delayedTasks: 0,
  });
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    Name: '',
    Description: '',
    StartDate: new Date().toISOString().split('T')[0],
    EndDate: '',
    Status: projectStatuses?.length > 0 ? projectStatuses.find(s => s.IsActive === 1 && s.Sequence < 15)?.Id || '1A' : '1A',
    ProjectCategoryId: 0,
    ProjectCategoryDetailLine: 0,
    CustSupp: 0,
    ProjectErpID: ''
  });

  // Gestione robusta degli utenti
  const { users: memoizedUsers, updateUsers, shouldFetchUsers } = useMemoizedUsers([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Funzione dedicata per il caricamento degli utenti
  const loadUsers = useCallback(async () => {
    if (!shouldFetchUsers() || loadingUsers) return;

    try {
      setLoadingUsers(true);
      const fetchedUsers = await fetchUsers();
      if (Array.isArray(fetchedUsers) && fetchedUsers.length > 0) {
        updateUsers(fetchedUsers);
      }
    } catch (error) {
      console.error('Errore nel caricamento degli utenti:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, [fetchUsers, shouldFetchUsers, updateUsers, loadingUsers]);

  // Gestione filtri
  const applyFilters = async (currentFilters) => {
    try {
      setLoading(true);
      
      const cleanedFilters = Object.entries(currentFilters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== 'all' && value !== '') {
          if (key === 'custSupp') {
            if (value) {
              acc[key] = value;
            }
          } else if (key === 'categoryId') {
            const numValue = Number(value);
            if (!isNaN(numValue) && numValue > 0) {
              acc[key] = numValue;
            }
          } else if (key === 'projectErpId') { 
            const trimmed = value.trim();
            if (trimmed !== '') {
              acc[key] = trimmed;
            }
          } else if (key === 'taskAssignedTo') {  
            if (value !== null) {
              acc[key] = value;
            }
          } else if (key === 'searchText') {
            const trimmed = value.trim();
            if (trimmed !== '') {
              acc[key] = trimmed;
            }
          } else if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed !== '') {
              acc[key] = trimmed;
            }
          }
        }
        return acc;
      }, {});

      await fetchProjects(0, 50, cleanedFilters);
    } catch (error) {
      console.error('Error applying filters:', error);
      swal.fire('Errore', 'Errore nell\'applicazione dei filtri', 'error');
    } finally {
      setLoading(false);
    }
  };
  

  // Effetto per gestire il caricamento iniziale
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          loadUsers(),
          fetchProjectCustomers(),
          fetchCategories(), 
          fetchProjectStatuses(), 
          applyFilters(filters)
        ]);
      } catch (error) {
        console.error('Error:', error);
        swal.fire('Errore', 'Errore nel caricamento', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
    // Estrae le statistiche dell'utente
    getUserProjectStatistics().then(setStatistics);
  }, []);

  // Effetto per i filtri
  useEffect(() => {
    const timeoutId = setTimeout(() => {
    // Aggiorna progetti e statistiche
    Promise.all([
          applyFilters(filters),
          getUserProjectStatistics().then(setStatistics)  // Passo i filtri per ottenere le statistiche
      ]);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters]); // Solo quando i filtri cambiano

  // Effetto per resettare gli errori quando si chiude il modale
  useEffect(() => {
    if (!isNewProjectDialogOpen) {
      setFormErrors({});
    }
  }, [isNewProjectDialogOpen]);

  const resetFilters = () => {
    setFilters({
      status: 'all',
      searchText: '',
      dueDate: '',
      categoryId: '',
      custSupp: null,
      projectErpId: '',
      taskAssignedTo: null
    });
  };

  const hasActiveFilters = () => {
    return Object.entries(filters).some(([key, value]) => {
      if (value === null || value === undefined || value === '') return false;
      if (value === 'all') return false;
      if (key === 'custSupp' && !value) return false;
      if (key === 'categoryId' && (!value || value === '0')) return false;
      if (key === 'taskAssignedTo' && value === null) return false;
      return true;
    });
  };

  // Creazione nuovo progetto
  const handleCreateProject = async () => {
    // Inizializza gli errori di validazione
    const validationErrors = {};
    
    // Verifica i campi obbligatori
    if (!newProject.Name?.trim()) {
      validationErrors.Name = "Campo obbligatorio";
    }
    
    if (!newProject.StartDate) {
      validationErrors.StartDate = "Campo obbligatorio";
    }
    
    if (!newProject.EndDate) {
      validationErrors.EndDate = "Campo obbligatorio";
    }
    
    // Se ci sono errori di validazione, li mostra e blocca l'invio
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    try {
      const projectData = {
        ...newProject,
        CustSupp: newProject.CustSupp || 0,
        ProjectErpID: newProject.ProjectErpID?.trim() || ''
        // TemplateID sarà già incluso se è stato selezionato
      };

      const result = await addUpdateProject(projectData);
      if (result.success) {
        setIsNewProjectDialogOpen(false);
        await fetchProjects(0, 50, filters);
        setNewProject({
          Name: '',
          Description: '',
          StartDate: new Date().toISOString().split('T')[0],
          EndDate: '',
          Status: projectStatuses?.length > 0 ? projectStatuses.find(s => s.IsActive === 1 && s.Sequence < 15)?.Id || '1A' : '1A',
          ProjectCategoryId: 0,
          ProjectCategoryDetailLine: 0,
          CustSupp: 0,
          ProjectErpID: '',
          TemplateID: null
        });
        setFormErrors({});
        swal.fire('Successo', 'Progetto creato con successo', 'success');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      swal.fire('Errore', 'Errore nella creazione del progetto', 'error');
    }
  };

  const getFilteredProjects = (tabStatus) => {
    if (!projectStatuses || projectStatuses.length === 0) return [];
    
    switch (tabStatus) {
      case 'active':
        // Progetti con stati con Sequence < 15 (es. Preventivo, Nuovo, ecc.)
        return projects.filter(p => {
          const status = projectStatuses.find(s => s.Id === p.Status);
          return status && status.Sequence < 15 && !status.HideProject;
        });
      
      case 'completed':
        // Progetti con stati con 15 <= Sequence < 90 (es. Ordine, Prodotto, ecc.)
        return projects.filter(p => {
          const status = projectStatuses.find(s => s.Id === p.Status);
          return status && status.Sequence >= 15 && status.Sequence < 90 && !status.HideProject;
        });
      
      case 'archived':
        // Progetti con stati con Sequence >= 90 (es. Archiviato, ecc.)
        return projects.filter(p => {
          const status = projectStatuses.find(s => s.Id === p.Status);
          return status && status.Sequence >= 90 && !status.HideProject;
        });
        
      default:
        return projects;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
    {/* Header con filtri e nuovo progetto */}
    <CollapsibleFilters
        onResetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters()}
        filters={filters}
      >
      {/* Dialog per nuovo progetto */}
      <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
        <DialogTrigger asChild>
          <Button className="shrink-0">Nuovo Progetto</Button>
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

      {/* Filters section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="w-full">
          <Select 
            value={filters.status}
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            className={filters.status !== 'all' ? 'border-blue-500' : ''}
          >
            <SelectTrigger>
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              {projectStatuses.map(status => (
                <SelectItem 
                  key={status.Id} 
                  value={status.Id}
                >
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

        <div className="w-full">
          <CustomerSearchSelect
            value={filters.custSupp}
            onChange={(value) => setFilters(prev => ({ ...prev, custSupp: value }))}
            projectCustomers={projectCustomers}
            loading={loadingCustomers}
          />
        </div>

        <div className="w-full">
          <Select 
            value={filters.categoryId?.toString() || "0"}
            onValueChange={(value) => setFilters(prev => ({ ...prev, categoryId: value }))}
            className={filters.categoryId && filters.categoryId !== '0' ? 'border-blue-500' : ''} // Corretto qui
          >
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Tutte le categorie</SelectItem>
              {categories.map(category => (
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

        <div className="w-full">
          <Input 
            placeholder="Cerca in nome e descrizione"
            value={filters.searchText}
            onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
            className={filters.searchText ? 'border-blue-500' : ''}
          />
        </div>

        <div className="w-full">
          <Input 
            placeholder="ID ERP"
            value={filters.projectErpId}
            onChange={(e) => setFilters(prev => ({ ...prev, projectErpId: e.target.value }))}
            className={filters.projectErpId ? 'border-blue-500' : ''}
          />
        </div>

        <div className="w-full">
          <Select 
            value={filters.taskAssignedTo?.toString() || "0"}
            onValueChange={(value) => setFilters(prev => ({ 
              ...prev, 
              taskAssignedTo: value == '0' ? null : parseInt(value) 
            }))}
            className={filters.taskAssignedTo ? 'border-blue-500' : ''}
          >
            <SelectTrigger>
              <SelectValue placeholder="Assegnato a" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Tutti gli utenti</SelectItem>
              {memoizedUsers 
                .filter(user => user && user.userId !== 0)
                .map(user => (
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

        <div className="w-full">
          <Input
            type="date"
            value={filters.dueDate}
            onChange={(e) => setFilters(prev => ({ ...prev, dueDate: e.target.value }))}
            className={filters.dueDate ? 'border-blue-500' : ''}
            placeholder="Scadenza"
          />
        </div>
      </div>
    </CollapsibleFilters>

    {/* Statistiche */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6" id="projects-dashboard-stats">
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

    {/* Lista Progetti con layout flessibile */}
    <div className="flex-1 px-2 sm:px-6 pb-6 min-h-0">
      <Card className="h-full">
        <CardContent className="p-3 sm:p-6 h-full">
        <Tabs defaultValue="active" className="h-full flex flex-col" id="projects-dashboard-tabs">
          <TabsList className="mb-4 w-full justify-start overflow-x-auto">
            <TabsTrigger value="active">In Lavorazione</TabsTrigger>
            <TabsTrigger value="completed">Completati</TabsTrigger>
            <TabsTrigger value="archived">Archiviati</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 min-h-0">
            <TabsContent value="active" className="h-full mt-0">
              <div className="h-full overflow-y-auto px-1 space-y-4">
                <ProjectsList 
                  projects={getFilteredProjects('active')} 
                  loading={loading} 
                  onViewDetails={(id) => navigate(`/progetti/detail/${id}`)} 
                />
              </div>
            </TabsContent>

            <TabsContent value="completed" className="h-full mt-0">
              <div className="h-full overflow-y-auto px-1 space-y-4">
                <ProjectsList 
                  projects={getFilteredProjects('completed')} 
                  loading={loading} 
                  onViewDetails={(id) => navigate(`/progetti/detail/${id}`)} 
                />
              </div>
            </TabsContent>

            <TabsContent value="archived" className="h-full mt-0">
              <div className="h-full overflow-y-auto px-1 space-y-4">
                <ProjectsList 
                  projects={getFilteredProjects('archived')} 
                  loading={loading} 
                  onViewDetails={(id) => navigate(`/progetti/detail/${id}`)} 
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
        </CardContent>
      </Card>
    </div>
  </div>
  );
};

export default ProjectsDashboard;