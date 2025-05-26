import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";
import NewTaskForm from "@/pages/progetti/progetti/NewTaskForm";
import useProjectActions from "@/hooks/useProjectManagementActions";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";

const TimesheetTaskDialog = ({
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const [loading, setLoading] = useState(false);
  const [userProjects, setUserProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState("all");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const { user } = useAuth();
  const projectActions = useProjectActions();
  const { fetchUsers } = useNotifications();

  // Carica gli utenti quando il dialog viene aperto
  useEffect(() => {
    if (isOpen && users.length === 0) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const fetchedUsers = await fetchUsers();
      console.log(fetchedUsers);  
      setUsers(fetchedUsers || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare gli utenti",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // Estrai valori unici per i filtri
  const uniqueStatuses = [...new Set(userProjects.map(p => p.StatusDescription))];
  const uniqueCategories = [...new Set(userProjects.map(p => p.Category).filter(Boolean))];
  const uniqueCategoryDetails = [...new Set(userProjects.map(p => p.CategoryDetail).filter(Boolean))];

  // Filtra i progetti in base ai criteri di ricerca
  const filteredProjects = userProjects.filter(project => {
    const matchesSearch = searchText === "" || 
      project.Description?.toLowerCase().includes(searchText.toLowerCase()) ||
      project.Name?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesStatus = selectedStatus === "all" || project.StatusDescription === selectedStatus;
    const matchesCategory = selectedCategory === "all" || project.Category === selectedCategory;
    const matchesCategoryDetail = selectedCategoryDetail === "all" || project.CategoryDetail === selectedCategoryDetail;

    return matchesSearch && matchesStatus && matchesCategory && matchesCategoryDetail;
  });

  // Reset dei filtri
  const resetFilters = () => {
    setSearchText("");
    setSelectedStatus("all");
    setSelectedCategory("all");
    setSelectedCategoryDetail("all");
  };

  // Effetto per reset dello stato quando il dialog viene chiuso
  useEffect(() => {
    if (!isOpen) {
      setShowForm(false);
      setSelectedProject(null);
      setProjectTasks([]);
      setInitialized(false);
    }
  }, [isOpen]);

  // Effetto per caricare i progetti solo una volta quando il dialog viene aperto
  useEffect(() => {
    // Previene il caricamento se il dialog è chiuso o se è già stato inizializzato
    if (!isOpen || initialized) return;

    const loadUserProjects = async () => {
      try {
        setLoading(true);
        const projects = await projectActions.getUserMemberProjects();

        // Filtra solo i progetti attivi in cui l'utente può creare attività
        const filteredProjects = projects.filter(
          (project) =>
            project.Status !== "COMPLETATO" &&
            (project.Role === "ADMIN" ||
              project.Role === "MANAGER" ||
              project.Role === "USER"),
        );

        setUserProjects(filteredProjects);
        // Imposta il flag di inizializzazione per evitare caricamenti ripetuti
        setInitialized(true);
      } catch (error) {
        console.error("Error loading user projects:", error);
        toast({
          title: "Errore",
          description: "Impossibile caricare i progetti",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserProjects();
  }, [isOpen, initialized, projectActions]);

  // Funzione per gestire la selezione del progetto
  const handleProjectSelect = async (projectId) => {
    try {
      setLoading(true);

      // Trova il progetto selezionato
      const project = userProjects.find(
        (p) => p.ProjectID === parseInt(projectId),
      );
      setSelectedProject(project);

      // Carica le attività del progetto
      const projectDetails = await projectActions.getProjectById(
        parseInt(projectId),
      );
      setProjectTasks(projectDetails?.tasks || []);

      // Mostra il form solo dopo aver caricato le attività
      setShowForm(true);
    } catch (error) {
      console.error("Error loading project details:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dettagli del progetto",
        variant: "destructive",
      });
      setShowForm(false);
    } finally {
      setLoading(false);
    }
  };

  // Gestisce la creazione di una nuova attività
  const handleCreateTask = async (taskData) => {
    try {
      if (!selectedProject) {
        toast({
          title: "Errore",
          description: "Seleziona un progetto prima di creare l'attività",
          variant: "destructive",
        });
        return;
      }

      // Aggiungi l'ID del progetto ai dati dell'attività
      const completeTaskData = {
        ...taskData,
        ProjectID: selectedProject.ProjectID,
      };

      const result =
        await projectActions.addUpdateProjectTask(completeTaskData);

      if (result.success) {
        toast({
          title: "Attività creata",
          description: "La nuova attività è stata creata con successo",
          style: { backgroundColor: "#2c7a7b", color: "#fff" },
        });

        // Notifica il componente padre
        if (onTaskCreated) {
          onTaskCreated();
        }

        // Chiudi il dialog
        onClose();
      } else {
        throw new Error("Errore nella creazione dell'attività");
      }
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Errore",
        description:
          error.message ||
          "Si è verificato un errore durante la creazione dell'attività",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Crea Nuova Attività</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-500">Caricamento in corso...</p>
          </div>
        ) : userProjects.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">
              Non sei membro di nessun progetto con permessi sufficienti per
              creare attività.
            </p>
          </div>
        ) : !showForm ? (
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">
              Seleziona un progetto per iniziare
            </h3>

            {/* Filtri */}
            <div className="space-y-4 mb-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Cerca per nome o descrizione..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={resetFilters}
                  title="Reset filtri"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    {uniqueStatuses.map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le categorie</SelectItem>
                    {uniqueCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCategoryDetail} onValueChange={setSelectedCategoryDetail}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sottocategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le sottocategorie</SelectItem>
                    {uniqueCategoryDetails.map(detail => (
                      <SelectItem key={detail} value={detail}>
                        {detail}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lista progetti filtrata */}
            <div className="space-y-4 h-[400px] overflow-y-auto pr-2">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  Nessun progetto trovato con i filtri selezionati
                </div>
              ) : (
                filteredProjects.map((project) => (
                  <Button
                    key={project.ProjectID}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3 px-4"
                    onClick={() => handleProjectSelect(project.ProjectID)}
                  >
                    <div>
                      <div className="font-medium">{project.Name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {project.Description && project.Description.length > 100
                          ? `${project.Description.substring(0, 100)}...`
                          : project.Description}
                      </div>
                      <div className="flex items-center mt-2 gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          {project.Role}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                          {project.Status}
                        </span>
                        {project.Category && (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                            {project.Category}
                          </span>
                        )}
                        {project.CategoryDetail && (
                          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                            {project.CategoryDetail}
                          </span>
                        )}
                      </div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </div>
        ) : (
          // Mostra il form di creazione attività
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">
                  Progetto selezionato:
                </div>
                <div className="font-medium">{selectedProject?.Name}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setSelectedProject(null);
                  setProjectTasks([]);
                }}
              >
                Cambia progetto
              </Button>
            </div>

            <NewTaskForm
              onSubmit={handleCreateTask}
              onCancel={onClose}
              projectTasks={projectTasks}
              projectId={selectedProject?.ProjectID}
              users={users}
              usersLoading={usersLoading}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TimesheetTaskDialog;