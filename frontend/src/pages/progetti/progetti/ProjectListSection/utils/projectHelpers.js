export const getFilteredAndSortedProjects = (
  projects,
  filters,
  sortConfig,
  columnFilters,
  pinnedProjects
) => {
  let filteredProjects = [...projects];

  // Applica filtri principali (ora con supporto array)
  if (filters.status && filters.status.length > 0) {
    filteredProjects = filteredProjects.filter(p => 
      filters.status.includes(p.Status)
    );
  }

  if (filters.categoryId && filters.categoryId.length > 0) {
    filteredProjects = filteredProjects.filter(p => 
      filters.categoryId.includes(p.ProjectCategoryId.toString())
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

  // RIMUOVI IL FILTRO taskAssignedTo - questo filtro è già applicato lato backend
  // Non dovremmo filtrare nuovamente qui perché il backend ha già filtrato i progetti
  // che hanno task assegnate agli utenti selezionati
  /*
  if (filters.taskAssignedTo && filters.taskAssignedTo.length > 0) {
    filteredProjects = filteredProjects.filter(p =>
      p.tasks?.some(task => 
        filters.taskAssignedTo.includes(task.AssignedTo.toString())
      )
    );
  }
  */

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

  if (columnFilters.status && columnFilters.status.length > 0) {
    filteredProjects = filteredProjects.filter(p => 
      columnFilters.status.includes(p.Status)
    );
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

  if (columnFilters.description) {
    filteredProjects = filteredProjects.filter(p =>
      p.Description?.toLowerCase().includes(columnFilters.description.toLowerCase())
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
};

export const applyFilters = async (
  filters,
  fetchProjects,
  getUserProjectStatistics,
  setPinnedProjects,
  setStatistics
) => {
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
    
    await getUserProjectStatistics(cleanedFilters).then(setStatistics);
  } catch (error) {
    console.error("Error applying filters:", error);
  }
};