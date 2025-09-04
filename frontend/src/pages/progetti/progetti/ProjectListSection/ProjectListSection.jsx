import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Plus, FileDown, X } from "lucide-react";
import { swal } from "../../../../lib/common";
import ProjectEditModalWithTemplate from "../ProjectEditModalWithTemplate";
import ProjectTable from "./components/ProjectTable";
import ProjectFilters from "./components/ProjectFilters";
import { 
  getFilteredAndSortedProjects, 
  applyFilters 
} from "./utils/projectHelpers";
import {
  exportToCSV,
  exportToPrintableHTML,
  exportToPDF
} from "./utils/projectExport";
import { DEFAULT_PROJECT, DEFAULT_FILTERS } from "./constants/projectConstants";

const ProjectListSection = ({
  isLeftPanelCollapsed,
  leftPanelWidth,
  projects,
  projectStatuses,
  categories,
  customers,
  users,
  loading,
  loadingCustomers,
  selectedProjectId,
  pinnedProjects,
  setPinnedProjects,
  statistics,
  onSelectProject,
  onProjectCreated,
  addUpdateProject,
  fetchProjects,
  getUserProjectStatistics,
  manageProjectPin,
  setStatistics,
}) => {
  const scrollContainerRef = useRef(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [newProject, setNewProject] = useState(DEFAULT_PROJECT);
  const [sortConfig, setSortConfig] = useState({
    key: "Name",
    direction: "ascending",
  });
  const [columnFilters, setColumnFilters] = useState({
    name: "",
    company: "",
    status: [],
    endDate: "",
    erpId: "",
  });
  const [exportLoading, setExportLoading] = useState(false);

  // Effetto per i filtri
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      applyFilters(filters, fetchProjects, getUserProjectStatistics, setPinnedProjects, setStatistics);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [filters, fetchProjects, getUserProjectStatistics, setPinnedProjects, setStatistics]);

  // Callback per filtrare e ordinare i progetti
  const filteredAndSortedProjects = useCallback(() => {
    return getFilteredAndSortedProjects(
      projects,
      filters,
      sortConfig,
      columnFilters,
      pinnedProjects
    );
  }, [projects, filters, sortConfig, columnFilters, pinnedProjects]);

  // Gestisce la creazione di un nuovo progetto
  const handleCreateProject = async () => {
    const validationErrors = {};
    if (!newProject.Name?.trim()) validationErrors.Name = "Campo obbligatorio";
    if (!newProject.StartDate) validationErrors.StartDate = "Campo obbligatorio";

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
        setNewProject(DEFAULT_PROJECT);
        setFormErrors({});
        swal.fire("Successo", "Progetto creato con successo", "success");

        if (result.projectId) {
          onSelectProject(result.projectId);
        }
        
        if (onProjectCreated) {
          onProjectCreated();
        }
      }
    } catch (error) {
      console.error("Error creating project:", error);
      swal.fire("Errore", "Errore nella creazione del progetto", "error");
    }
  };

  // Gestisce l'esportazione
  const handleExport = useCallback((type) => {
    const filteredProjects = filteredAndSortedProjects();
    
    if (filteredProjects.length === 0) {
      toast({
        title: "Nessun progetto da esportare",
        description: "Applica dei filtri per selezionare i progetti da esportare",
        variant: "warning",
      });
      return;
    }

    setExportLoading(true);
    
    try {
      switch (type) {
        case 'csv':
          exportToCSV(filteredProjects, filters, projectStatuses, categories, customers, users);
          break;
        case 'html':
          exportToPrintableHTML(filteredProjects, filters, projectStatuses, categories, customers, users);
          break;
        case 'pdf':
          exportToPDF(filteredProjects, filters, projectStatuses, categories, customers, users);
          break;
      }
      
      toast({
        title: "Export completato",
        description: `${filteredProjects.length} progetti esportati`,
        variant: "success",
      });
    } catch (error) {
      console.error("Error exporting:", error);
      toast({
        title: "Errore nell'export",
        description: "Si è verificato un errore durante l'esportazione",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  }, [filteredAndSortedProjects, filters, projectStatuses, categories, customers, users]);

  // Reset dei filtri
  const resetFilters = async () => {
    setFilters(DEFAULT_FILTERS);
    setColumnFilters({
      name: "",
      company: "",
      status: [],
      endDate: "",
      erpId: "",
    });
    
    // Applica automaticamente i filtri dopo il reset
    try {
      const projectsData = await fetchProjects(0, 100, {});
      
      if (projectsData && projectsData.items) {
        const pinned = new Set(
          projectsData.items.filter(p => p.IsPinned).map(p => p.ProjectID)
        );
        setPinnedProjects(pinned);
      }
      
      await getUserProjectStatistics().then(setStatistics);
    } catch (error) {
      console.error("Error applying filters after reset:", error);
    }
  };

  return (
    <div 
      className={`h-full flex flex-col p-2 transition-all duration-300 ${
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
            onProjectUpdated={onProjectCreated}
          />
        </Dialog>
      </div>

      <ProjectFilters
        filters={filters}
        setFilters={setFilters}
        columnFilters={columnFilters}
        setColumnFilters={setColumnFilters}
        filtersExpanded={filtersExpanded}
        setFiltersExpanded={setFiltersExpanded}
        projectStatuses={projectStatuses}
        categories={categories}
        customers={customers}
        users={users}
        loadingCustomers={loadingCustomers}
        onReset={resetFilters}
        onExport={handleExport}
        exportLoading={exportLoading}
        projectsCount={filteredAndSortedProjects().length}
        fetchProjects={fetchProjects}
        getUserProjectStatistics={getUserProjectStatistics}
        setPinnedProjects={setPinnedProjects}
        setStatistics={setStatistics}
      />

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
        ) : filteredAndSortedProjects().length === 0 ? (
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
          <ProjectTable
            projects={filteredAndSortedProjects()}
            scrollContainerRef={scrollContainerRef}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
            columnFilters={columnFilters}
            setColumnFilters={setColumnFilters}
            selectedProjectId={selectedProjectId}
            pinnedProjects={pinnedProjects}
            projectStatuses={projectStatuses}
            onSelectProject={onSelectProject}
            manageProjectPin={manageProjectPin}
            setPinnedProjects={setPinnedProjects}
            fetchProjects={fetchProjects}
            filters={filters}
          />
        )}
      </Card>
    </div>
  );
};

export default ProjectListSection;