// TimesheetTaskPanel.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
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
  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState("all");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showContent, setShowContent] = useState(false);
  
  // Stati per paginazione
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalProjects, setTotalProjects] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Refs per evitare chiamate duplicate
  const loadingRef = useRef(false);
  const abortControllerRef = useRef(null);
  const scrollAreaRef = useRef(null);

  const { user } = useAuth();
  const projectActions = useProjectActions();
  const { fetchUsers } = useNotifications();

  const PAGE_SIZE = 20; // Numero di progetti per pagina

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
      // Annulla eventuali richieste in corso
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      setShowForm(false);
      setSelectedProject(null);
      setProjectTasks([]);
      setSearchText("");
      setSelectedStatus("all");
      setSelectedCategory("all");
      setSelectedCategoryDetail("all");
      setIsClosing(false);
      setCurrentPage(0);
      setUserProjects([]);
      setHasMore(true);
      setTotalPages(0);
      setTotalProjects(0);
      loadingRef.current = false;
    }
  }, [isOpen]);

  // Carica progetti all'apertura con paginazione
  const loadUserProjects = useCallback(async (page = 0, append = false) => {
    // Evita chiamate duplicate
    if (loadingRef.current) return;
    
    // Se non ci sono più pagine da caricare
    if (append && !hasMore) return;
    
    try {
      loadingRef.current = true;
      setLoading(!append);
      setLoadingMore(append);
      
      // Crea nuovo AbortController per questa richiesta
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      // Costruisci i filtri
      const filters = {
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        categoryDetail: selectedCategoryDetail !== "all" ? selectedCategoryDetail : undefined,
        searchText: searchText || undefined,
      };
      
      // Rimuovi i campi undefined
      Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);
      
      const result = await projectActions.getUserMemberProjectsPaginated(
        page, 
        PAGE_SIZE, 
        filters,
        abortControllerRef.current.signal
      );

      if (result) {
        const filteredProjects = result.items.filter(
          (project) =>
            project.Status !== "COMPLETATO" &&
            (project.Role === "ADMIN" ||
              project.Role === "MANAGER" ||
              project.Role === "USER"),
        );

        if (append) {
          setUserProjects(prev => [...prev, ...filteredProjects]);
        } else {
          setUserProjects(filteredProjects);
        }
        
        setCurrentPage(page);
        setTotalPages(result.totalPages);
        setTotalProjects(result.total);
        setHasMore(page < result.totalPages - 1);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Error loading user projects:", error);
        toast({
          title: "Errore",
          description: "Impossibile caricare i progetti",
          variant: "destructive",
        });
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedStatus, selectedCategory, selectedCategoryDetail, searchText, projectActions]);

  // Carica progetti quando si apre il pannello o cambiano i filtri
  useEffect(() => {
    if (isOpen && showContent) {
      loadUserProjects(0, false);
    }
  }, [isOpen, showContent, selectedStatus, selectedCategory, selectedCategoryDetail]);

  // Debounce per la ricerca
  useEffect(() => {
    if (!isOpen || !showContent) return;
    
    const debounceTimer = setTimeout(() => {
      loadUserProjects(0, false);
    }, 500);
    
    return () => clearTimeout(debounceTimer);
  }, [searchText]);

  // Gestione scroll infinito
  const handleScroll = useCallback((e) => {
    if (loadingMore || !hasMore) return;
    
    const element = e.target;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    // Se siamo vicini al fondo (100px), carica più progetti
    if (scrollHeight - scrollTop - clientHeight < 100) {
      loadUserProjects(currentPage + 1, true);
    }
  }, [loadingMore, hasMore, currentPage, loadUserProjects]);

  // Estrai valori unici per i filtri dai progetti caricati
  const uniqueStatuses = [...new Set(userProjects.map(p => p.StatusDescription).filter(Boolean))];
  const uniqueCategories = [...new Set(userProjects.map(p => p.Category).filter(Boolean))];
  const uniqueCategoryDetails = [...new Set(userProjects.map(p => p.CategoryDetail).filter(Boolean))];

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
        top: 80,
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
              className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-blue-50 to-white"
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
                      : `${totalProjects} progetti disponibili`
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
                {loading && userProjects.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
                      <p className="text-gray-500">Caricamento in corso...</p>
                    </div>
                  </div>
                ) : !showForm ? (
                  <div className="flex-1 flex flex-col h-full">
                    {/* Filtri */}
                    <div className="p-3 border-b bg-gray-50">
                      <div className="space-y-1">
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
                    <div className="flex-1 overflow-hidden">
                      <ScrollArea 
                        ref={scrollAreaRef}
                        className="h-full"
                        onScroll={handleScroll}
                      >
                        <div className="p-4 space-y-1">
                          {userProjects.length === 0 && !loading ? (
                            <div className="text-center py-8">
                              <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                              <p className="text-gray-500">
                                Nessun progetto trovato con i filtri selezionati
                              </p>
                            </div>
                          ) : (
                            <>
                              {userProjects.map((project) => (
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
                                    <CardContent className="p-2">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                          <h3 className="font-semibold text-lg">
                                            {project.Name}
                                            <Badge variant="" className="text-sm mx-3 bg-blue-100 text-blue-700" >{project.StatusDescription} </Badge>
                                          </h3>
                                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                            {project.Description}
                                          </p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                                      </div>
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              ))}
                              
                              {loadingMore && (
                                <div className="flex justify-center py-4">
                                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                </div>
                              )}
                              
                              {!hasMore && userProjects.length > 0 && (
                                <div className="text-center py-4 text-sm text-gray-500">
                                  Hai visualizzato tutti i progetti
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
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