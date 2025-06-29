import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import {
  Filter, ChevronDown, ChevronUp, Search, X, Plus, Eye, MoreVertical,
  Pin, PinOff, CheckCircle2, ListTodo, TriangleAlert
} from "lucide-react";
import { swal } from "../../../lib/common";
import ProjectEditModalWithTemplate from "./ProjectEditModalWithTemplate";
import { CustomerSearchSelect } from "./ProjectComponents";

// Componente per il filtro delle colonne
const ColumnFilter = ({ column, value, onChange, options = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value || "");

  // Sincronizza il valore locale quando cambia il valore esterno
  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

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
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

const ProjectListSection = ({
  isLeftPanelCollapsed,
  leftPanelWidth,
  projects,
  projectStatuses,
  categories,
  projectCustomers,
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
  const [filters, setFilters] = useState({
    status: "all",
    searchText: "",
    categoryId: "",
    custSupp: null,
    projectErpId: "",
    taskAssignedTo: null,
  });
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
  const [pinLoading, setPinLoading] = useState(null);
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

  // Filtra e ordina i progetti
  const getFilteredAndSortedProjects = useCallback(() => {
    let filteredProjects = [...projects];

    // Applica tutti i filtri
    if (filters.status && filters.status !== "all") {
      filteredProjects = filteredProjects.filter(p => p.Status === filters.status);
    }

    if (filters.categoryId && filters.categoryId !== "0") {
      filteredProjects = filteredProjects.filter(
        p => p.ProjectCategoryId === parseInt(filters.categoryId)
      );
    }

    if (filters.custSupp) {
      filteredProjects = filteredProjects.filter(p => p.CustSupp === filters.custSupp);
    }

    if (filters.projectErpId) {
      filteredProjects = filteredProjects.filter(p =>
        p.ProjectErpID?.includes(filters.projectErpId)
      );
    }

    if (filters.taskAssignedTo) {
      filteredProjects = filteredProjects.filter(p =>
        p.tasks?.some(task => task.AssignedTo === filters.taskAssignedTo)
      );
    }

    // Applica filtri delle colonne
    if (columnFilters.name) {
      filteredProjects = filteredProjects.filter(p =>
        p.Name?.toLowerCase().includes(columnFilters.name.toLowerCase())
      );
    }

    if (columnFilters.company) {
      filteredProjects = filteredProjects.filter(p =>
        p.CompanyName?.toLowerCase().includes(columnFilters.company.toLowerCase())
      );
    }

    if (columnFilters.status && columnFilters.status !== "all") {
      filteredProjects = filteredProjects.filter(p => p.Status === columnFilters.status);
    }

    if (columnFilters.endDate) {
      filteredProjects = filteredProjects.filter(p => {
        if (!p.EndDate) return false;
        const projectDate = new Date(p.EndDate).toISOString().split('T')[0];
        return projectDate === columnFilters.endDate;
      });
    }

    if (columnFilters.erpId) {
      filteredProjects = filteredProjects.filter(p =>
        p.ProjectErpID?.toLowerCase().includes(columnFilters.erpId.toLowerCase())
      );
    }
    
    // Separa progetti fissati e non fissati
    const pinnedProjectsList = filteredProjects.filter(p => pinnedProjects.has(p.ProjectID));
    const unpinnedProjectsList = filteredProjects.filter(p => !pinnedProjects.has(p.ProjectID));

    // Ordina progetti fissati per PinOrder
    pinnedProjectsList.sort((a, b) => (a.PinOrder || 0) - (b.PinOrder || 0));

    // Ordina progetti non fissati
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
      }
    };

    const timeoutId = setTimeout(applyFilters, 300);
    return () => clearTimeout(timeoutId);
  }, [filters, fetchProjects, getUserProjectStatistics, setPinnedProjects, setStatistics]);

  // Funzione per applicare immediatamente i filtri (usata per il tasto Invio)
  const applyFiltersImmediately = useCallback(async () => {
    try {
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
    }
  }, [filters, fetchProjects, getUserProjectStatistics, setPinnedProjects, setStatistics]);

  // Creazione nuovo progetto
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
        setNewProject({
          Name: "",
          Description: "",
          StartDate: new Date().toISOString().split("T")[0],
          EndDate: "",
          Status:
            projectStatuses?.length > 0
              ? projectStatuses.find(s => s.IsActive === 1 && s.Sequence < 15)?.Id || "1A"
              : "1A",
          ProjectCategoryId: 0,
          ProjectCategoryDetailLine: 0,
          CustSupp: 0,
          ProjectErpID: "",
        });
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

  const statusOptions = projectStatuses?.map(status => ({
    value: status.Id,
    label: status.StatusDescription
  })) || [];

  return (
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
            onProjectUpdated={onProjectCreated}
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
              {(Object.values(filters).some(v => v && v !== "all") ||
                Object.values(columnFilters).some(v => v)) && (
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
                    setFilters(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    {projectStatuses?.map(status => (
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
                    setFilters(prev => ({ ...prev, categoryId: value }))
                  }
                >
                  <SelectTrigger className="h-8">
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
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <CustomerSearchSelect
                  value={filters.custSupp}
                  onChange={(value) =>
                    setFilters(prev => ({ ...prev, custSupp: value }))
                  }
                  projectCustomers={projectCustomers}
                  loading={loadingCustomers}
                />
              </div>
              <div>
                <Select
                  value={filters.taskAssignedTo?.toString() || "0"}
                  onValueChange={(value) =>
                    setFilters(prev => ({
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
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Cerca..."
                  className="pl-8 h-8"
                  value={filters.searchText}
                  onChange={(e) =>
                    setFilters(prev => ({
                      ...prev,
                      searchText: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyFiltersImmediately();
                    }
                  }}
                />
              </div>
              <div>
                <Input
                  placeholder="ID ERP"
                  className="h-8"
                  value={filters.projectErpId}
                  onChange={(e) =>
                    setFilters(prev => ({
                      ...prev,
                      projectErpId: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyFiltersImmediately();
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={applyFiltersImmediately}
                className="flex items-center gap-1"
              >
                <Filter className="h-3 w-3" />
                Applica filtri
              </Button>
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
          <div className="flex-1 flex flex-col min-h-0" id="project-table-div">
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
                  {getFilteredAndSortedProjects().map(project => {
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
                        onClick={() => onSelectProject(project.ProjectID)}
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
                                  onSelectProject(project.ProjectID);
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
  );
};

export default ProjectListSection;