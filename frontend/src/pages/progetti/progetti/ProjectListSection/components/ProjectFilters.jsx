import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Filter, ChevronDown, ChevronUp, Search, X, FileDown } from "lucide-react";
import { CustomerSearchSelect } from "../../ProjectComponents";
import { MultiSelect } from "@/components/ui/multi-select";

const ProjectFilters = ({
  filters,
  setFilters,
  columnFilters,
  setColumnFilters,
  filtersExpanded,
  setFiltersExpanded,
  projectStatuses,
  categories,
  customers,
  users,
  loadingCustomers,
  onReset,
  onExport,
  exportLoading,
  projectsCount,
  fetchProjects,
  getUserProjectStatistics,
  setPinnedProjects,
  setStatistics
}) => {
  const isFiltered = Object.values(filters).some(v => 
    (Array.isArray(v) && v.length > 0) || (v && v !== "all" && v !== "")
  ) || Object.values(columnFilters).some(v => 
    (Array.isArray(v) && v.length > 0) || v
  );

  // Funzione per applicare i filtri immediatamente
  const applyFiltersImmediately = useCallback(async () => {
    try {
      const cleanedFilters = Object.entries(filters).reduce(
        (acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value) && value.length > 0) {
              acc[key] = value;
            } else if (!Array.isArray(value) && value !== "" && value !== "all") {
              acc[key] = value;
            }
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

  return (
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
            {isFiltered && (
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
              <MultiSelect
                options={projectStatuses?.map(status => ({
                  value: status.Id,
                  label: status.StatusDescription,
                  color: status.HexColor
                })) || []}
                value={filters.status}
                onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                placeholder="Seleziona stati..."
                renderOption={(option) => (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                    {option.label}
                  </div>
                )}
                searchable={true}
              />
            </div>
            <div>
              <MultiSelect
                options={categories.map(category => ({
                  value: category.ProjectCategoryId.toString(),
                  label: category.Description,
                  color: category.HexColor
                })) || []}
                value={filters.categoryId}
                onChange={(value) => setFilters(prev => ({ ...prev, categoryId: value }))}
                placeholder="Seleziona categorie..."
                renderOption={(option) => (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                    {option.label}
                  </div>
                )}
                searchable={true}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <CustomerSearchSelect
                value={filters.custSupp}
                onChange={(value) =>
                  setFilters(prev => ({ ...prev, custSupp: value }))
                }
                projectCustomers={customers}
                loading={loadingCustomers}
              />
            </div>
            <div>
                
              <MultiSelect
                options={users
                  .filter(user => user && user.userId !== 0 && user.userDisabled == '0')  
                  .map(user => ({
                    value: user.userId.toString(),
                    label: `${user.firstName} ${user.lastName}`
                  }))}
                value={filters.taskAssignedTo}
                onChange={(value) => setFilters(prev => ({ ...prev, taskAssignedTo: value }))}
                placeholder="Seleziona utenti..."
                searchable={true}
              />
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

          <div className="flex justify-between gap-2">
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    disabled={exportLoading || projectsCount === 0}
                  >
                    <FileDown className="h-3 w-3" />
                    Esporta
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => onExport('html')} disabled={exportLoading}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Scarica HTML
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport('pdf')} disabled={exportLoading}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Scarica PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport('csv')} disabled={exportLoading}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Scarica CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {projectsCount > 0 && (
                <Badge variant="" className="px-2 py-1 bg-green-200 text-gray-700">
                  {projectsCount} progetti
                </Badge>
              )}
            </div>

            <div className="flex gap-2">
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
                onClick={onReset}
                className="flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ProjectFilters;