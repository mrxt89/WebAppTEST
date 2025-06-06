// TimesheetTaskPanel.jsx
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FolderOpen,
  CheckCircle,
  Info,
  AlertCircle,
  Briefcase,
  Tag,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import NewTaskForm from "@/pages/progetti/progetti/NewTaskForm";
import useProjectActions from "@/hooks/useProjectManagementActions";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";

const TimesheetTaskPanel = ({
  isOpen,
  onClose,
  onTaskCreated,
  position = "right",
  defaultWidth = 600,
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
  const [isClosing, setIsClosing] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const { user } = useAuth();
  const projectActions = useProjectActions();
  const { fetchUsers } = useNotifications();

  // Carica gli utenti quando il pannello viene aperto
  useEffect(() => {
    if (isOpen && users.length === 0) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const fetchedUsers = await fetchUsers();
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

  // Effetto per mostrare contenuto con delay
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  // Reset stato quando si chiude
  useEffect(() => {
    if (!isOpen) {
      setShowForm(false);
      setSelectedProject(null);
      setProjectTasks([]);
      setInitialized(false);
      setSearchText("");
      setSelectedStatus("all");
      setSelectedCategory("all");
      setSelectedCategoryDetail("all");
      setIsClosing(false);
    }
  }, [isOpen]);

  // Carica progetti all'apertura
  useEffect(() => {
    if (!isOpen || initialized) return;

    const loadUserProjects = async () => {
      try {
        setLoading(true);
        const projects = await projectActions.getUserMemberProjects();

        const filteredProjects = projects.filter(
          (project) =>
            project.Status !== "COMPLETATO" &&
            (project.Role === "ADMIN" ||
              project.Role === "MANAGER" ||
              project.Role === "USER"),
        );

        setUserProjects(filteredProjects);
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

  // Estrai valori unici per i filtri
  const uniqueStatuses = [...new Set(userProjects.map(p => p.StatusDescription))];
  const uniqueCategories = [...new Set(userProjects.map(p => p.Category).filter(Boolean))];
  const uniqueCategoryDetails = [...new Set(userProjects.map(p => p.CategoryDetail).filter(Boolean))];

  // Filtra progetti
  const filteredProjects = userProjects.filter(project => {
    const matchesSearch = searchText === "" || 
      project.Description?.toLowerCase().includes(searchText.toLowerCase()) ||
      project.Name?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesStatus = selectedStatus === "all" || project.StatusDescription === selectedStatus;
    const matchesCategory = selectedCategory === "all" || project.Category === selectedCategory;
    const matchesCategoryDetail = selectedCategoryDetail === "all" || project.CategoryDetail === selectedCategoryDetail;

    return matchesSearch && matchesStatus && matchesCategory && matchesCategoryDetail;
  });

  // Reset filtri
  const resetFilters = () => {
    setSearchText("");
    setSelectedStatus("all");
    setSelectedCategory("all");
    setSelectedCategoryDetail("all");
  };

  // Seleziona progetto
  const handleProjectSelect = async (projectId) => {
    try {
      setLoading(true);

      const project = userProjects.find(
        (p) => p.ProjectID === parseInt(projectId),
      );
      setSelectedProject(project);

      const projectDetails = await projectActions.getProjectById(
        parseInt(projectId),
      );
      setProjectTasks(projectDetails?.tasks || []);

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

  // Crea task
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

      const completeTaskData = {
        ...taskData,
        ProjectID: selectedProject.ProjectID,
      };

      const result = await projectActions.addUpdateProjectTask(completeTaskData);

      if (result.success) {
        toast({
          title: "Attività creata",
          description: "La nuova attività è stata creata con successo",
          variant: "success",
        });

        if (onTaskCreated) {
          onTaskCreated();
        }

        handleClose();
      } else {
        throw new Error("Errore nella creazione dell'attività");
      }
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la creazione dell'attività",
        variant: "destructive",
      });
    }
  };

  // Chiudi pannello
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Torna alla selezione progetto
  const handleBackToProjects = () => {
    setShowForm(false);
    setSelectedProject(null);
    setProjectTasks([]);
  };

  // Calcola stili pannello
  const getPanelStyles = () => {
    if (position === "right") {
      return {
        position: "fixed",
        top: 100,
        right: 0,
        bottom: 0,
        width: defaultWidth,
        height: "100%",
        zIndex: 1040,
      };
    }

    return {
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: "85vh",
      width: "100%",
      zIndex: 1040,
    };
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            style={{ zIndex: 1039 }}
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            initial={{
              x: position === "right" ? "100%" : 0,
              y: position === "bottom" ? "100%" : 0,
              opacity: 0,
            }}
            animate={{
              x: isClosing && position === "right" ? "100%" : 0,
              y: isClosing && position === "bottom" ? "100%" : 0,
              opacity: 1,
            }}
            exit={{
              x: position === "right" ? "100%" : 0,
              y: position === "bottom" ? "100%" : 0,
              opacity: 0,
            }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`
              bg-white shadow-2xl flex flex-col overflow-hidden
              ${position === "right" ? "border-l" : "border-t"}
            `}
            style={getPanelStyles()}
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-white"
            >
              <div className="flex items-center gap-3">
                {showForm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBackToProjects}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {showForm ? "Nuova Attività" : "Seleziona Progetto"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {showForm 
                      ? `Crea attività in: ${selectedProject?.Name}`
                      : "Scegli un progetto per creare una nuova attività"
                    }
                  </p>
                </div>
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClose}
                      className="h-8 w-8 hover:bg-red-100 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Chiudi</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>

            {/* Content */}
            {showContent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex-1 overflow-hidden flex flex-col"
              >
                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
                      <p className="text-gray-500">Caricamento in corso...</p>
                    </div>
                  </div>
                ) : userProjects.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        Non sei membro di nessun progetto con permessi sufficienti per creare attività.
                      </p>
                    </div>
                  </div>
                ) : !showForm ? (
                  <div className="flex-1 flex flex-col">
                    {/* Filtri */}
                    <div className="p-4 border-b bg-gray-50">
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input
                              placeholder="Cerca per nome o descrizione..."
                              value={searchText}
                              onChange={(e) => setSearchText(e.target.value)}
                              className="pl-10"
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
                    </div>

                    {/* Lista progetti */}
                    <ScrollArea className="flex-1">
                      <div className="p-4 space-y-3">
                        {filteredProjects.length === 0 ? (
                          <div className="text-center py-8">
                            <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">
                              Nessun progetto trovato con i filtri selezionati
                            </p>
                          </div>
                        ) : (
                          filteredProjects.map((project) => (
                            <motion.div
                              key={project.ProjectID}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Card
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => handleProjectSelect(project.ProjectID)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h3 className="font-semibold text-lg">
                                        {project.Name}
                                      </h3>
                                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                        {project.Description}
                                      </p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-400 mt-1" />
                                  </div>

                                  <div className="flex flex-wrap gap-2 mt-3">
                                    <Badge
                                      variant="secondary"
                                      className="bg-blue-100 text-blue-700"
                                    >
                                      <Hash className="h-3 w-3 mr-1" />
                                      {project.Role}
                                    </Badge>
                                    
                                    <Badge
                                      variant="secondary"
                                      className="bg-gray-100 text-gray-700"
                                    >
                                      {project.Status}
                                    </Badge>
                                    
                                    {project.Category && (
                                      <Badge
                                        variant="secondary"
                                        className="bg-green-100 text-green-700"
                                      >
                                        <Tag className="h-3 w-3 mr-1" />
                                        {project.Category}
                                      </Badge>
                                    )}
                                    
                                    {project.CategoryDetail && (
                                      <Badge
                                        variant="secondary"
                                        className="bg-purple-100 text-purple-700"
                                      >
                                        {project.CategoryDetail}
                                      </Badge>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="flex-1 overflow-hidden">
                    <NewTaskForm
                      onSubmit={handleCreateTask}
                      onCancel={handleClose}
                      projectTasks={projectTasks}
                      projectId={selectedProject?.ProjectID}
                      users={users}
                      usersLoading={usersLoading}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TimesheetTaskPanel;