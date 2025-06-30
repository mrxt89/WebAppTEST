// src/pages/progetti/progetti/ProjectListSection/components/ProjectTable.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, ListTodo, TriangleAlert, Pin } from "lucide-react";
import ColumnFilter from "./ColumnFilter";
import ProjectActions from "./ProjectActions";
import { DEFAULT_COLUMN_WIDTHS } from "../constants/projectConstants";

const ProjectTable = ({
  projects,
  scrollContainerRef,
  sortConfig,
  setSortConfig,
  columnFilters,
  setColumnFilters,
  selectedProjectId,
  pinnedProjects,
  projectStatuses,
  onSelectProject,
  manageProjectPin,
  setPinnedProjects,
  fetchProjects,
  filters
}) => {
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);
  const [isResizingColumn, setIsResizingColumn] = useState(null);

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
    [isResizingColumn, scrollContainerRef]
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

  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const handleColumnFilter = (column, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const statusOptions = projectStatuses?.map(status => ({
    value: status.Id,
    label: status.StatusDescription
  })) || [];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-auto overflow-x-auto" ref={scrollContainerRef}>
        <Table
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
                    column="multiselect"
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
            {projects.map(project => {
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
                    <ProjectActions
                      project={project}
                      isPinned={isPinned}
                      onSelectProject={onSelectProject}
                      manageProjectPin={manageProjectPin}
                      setPinnedProjects={setPinnedProjects}
                      fetchProjects={fetchProjects}
                      filters={filters}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ProjectTable;