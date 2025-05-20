import { useState, useCallback } from "react";
import { config } from "../config";
import useApiRequest from "./useApiRequest";

const useProjectActions = () => {
  const [projects, setProjects] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unitsOfMeasure, setUnitsOfMeasure] = useState([]);
  const [costCategories, setCostCategories] = useState([]);
  const { makeRequest } = useApiRequest();
  const [categories, setCategories] = useState([]);
  const [projectStatuses, setProjectStatuses] = useState([]);
  // Check if user has admin permission for a project
  const checkAdminPermission = useCallback((projectData) => {
    return projectData?.AdminPermission == 1;
  }, []);

  // Check if task belongs to user
  const isOwnTask = useCallback((taskData) => {
    return taskData?.OwnTask === 1;
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/projectsCategories/categories`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) throw new Error("Error fetching project categories");
      const data = await response.json();
      setCategories(data);
      return data;
    } catch (error) {
      console.error("Error fetching project categories:", error);
      return [];
    }
  }, []);

  const fetchUnitsOfMeasure = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/uom`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Error fetching units of measure");
      const data = await response.json();
      setUnitsOfMeasure(data);
      return data;
    } catch (error) {
      console.error("Error fetching units of measure:", error);
      return [];
    }
  }, []);

  const fetchCostCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/costCategories`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Error fetching cost categories");
      const data = await response.json();
      setCostCategories(data);
      return data;
    } catch (error) {
      console.error("Error fetching cost categories:", error);
      return [];
    }
  }, []);

  const fetchProjects = useCallback(
    async (page = 0, pageSize = 50, filters = {}) => {
      try {
        setLoading(true);
        const url = `${config.API_BASE_URL}/projects/paginated?page=${page}&pageSize=${pageSize}&filters=${encodeURIComponent(JSON.stringify(filters))}`;

        const data = await makeRequest(url);

        if (data) {
          setProjects(data.items);
          return {
            items: data.items,
            total: data.total,
            totalPages: data.totalPages,
          };
        }
        return { items: [], total: 0, totalPages: 0 };
      } catch (error) {
        console.error("Error fetching projects:", error);
        setProjects([]);
        if (!error.message.includes("aborted")) {
          console.error("Error fetching projects:", error);
        }
        return { items: [], total: 0, totalPages: 0 };
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  const getProjectById = async (projectId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/projects/${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) throw new Error("Error fetching project details");

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching project details:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const addUpdateProject = useCallback(
    async (projectData) => {
      try {
        const cleanedData = {
          ProjectID: parseInt(projectData.ProjectID) || null,
          Name: projectData.Name?.trim(),
          Description: projectData.Description?.trim() || "",
          StartDate: projectData.StartDate || null,
          EndDate: projectData.EndDate || null,
          Status: projectData.Status?.toUpperCase(),
          ProjectCategoryId: parseInt(projectData.ProjectCategoryId) || 0,
          ProjectCategoryDetailLine:
            parseInt(projectData.ProjectCategoryDetailLine) || 0,
          Disabled: parseInt(projectData.Disabled) || 0,
          CustSupp: parseInt(projectData.CustSupp) || 0,
          TBCreatedId: parseInt(projectData.TBCreatedId) || null,
          ProjectErpID: projectData.ProjectErpID?.trim() || "",
          TemplateID: projectData.TemplateID
            ? parseInt(projectData.TemplateID)
            : null, // Aggiunto TemplateID
        };
        const url = `${config.API_BASE_URL}/projects`;
        return await makeRequest(url, {
          method: "POST",
          body: JSON.stringify(cleanedData),
        });
      } catch (error) {
        console.error("Error saving project:", error);
        throw error;
      }
    },
    [makeRequest],
  );

  const updateProjectMembers = async (projectId, members) => {
    try {
      // Fetch project first to check permissions
      const project = await getProjectById(projectId);
      if (!checkAdminPermission(project)) {
        throw new Error("Unauthorized: Insufficient permissions");
      }

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/projects/${projectId}/members`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ members }),
        },
      );

      if (!response.ok) throw new Error("Error updating project members");

      return await response.json();
    } catch (error) {
      console.error("Error updating project members:", error);
      throw error;
    }
  };

  // Aggiorna il ruolo di un membro del progetto
  const updateProjectMemberRole = async (projectId, memberId, role) => {
    try {
      // Usa makeRequest per mantenere coerenza con il resto delle chiamate API
      const url = `${config.API_BASE_URL}/projects/${projectId}/members/${memberId}/role`;
      return await makeRequest(url, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
    } catch (error) {
      console.error("Error updating member role:", error);
      throw error;
    }
  };

  // Aggiungi o aggiorna task
  const addUpdateProjectTask = async (taskData) => {
    try {
      // Get project to check permissions
      const project = await getProjectById(taskData.ProjectID);

      // Allow task creation only for admins
      if (!taskData.TaskID && !checkAdminPermission(project)) {
        throw new Error("Unauthorized: Cannot create new tasks");
      }

      // For updates, check if admin or own task
      if (
        taskData.TaskID &&
        !checkAdminPermission(project) &&
        !isOwnTask(taskData)
      ) {
        throw new Error("Unauthorized: Cannot modify this task");
      }

      const cleanTaskData = {
        ...taskData,
        ProjectID: parseInt(taskData.ProjectID),
        AssignedTo: taskData.AssignedTo ? parseInt(taskData.AssignedTo) : null,
        DueDate: taskData.DueDate || null,
      };

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/projects/${cleanTaskData.ProjectID}/tasks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cleanTaskData),
        },
      );

      if (!response.ok) throw new Error("Error saving task");

      return await response.json();
    } catch (error) {
      console.error("Error saving task:", error);
      throw error;
    }
  };

  const updateTaskStatus = async (taskData) => {
    try {
      // Get project to check permissions
      const project = await getProjectById(taskData.ProjectID);

      // Allow status update only for admins or own tasks
      if (!checkAdminPermission(project) && !isOwnTask(taskData)) {
        throw new Error("Unauthorized: Cannot modify this task");
      }

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/projects/tasks/${taskData.TaskID}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: taskData.Status }),
        },
      );

      if (!response.ok) throw new Error("Error updating task status");

      return await response.json();
    } catch (error) {
      console.error("Error updating task status:", error);
      throw error;
    }
  };

  const addTaskComment = async (taskId, comment) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/projects/tasks/${taskId}/comments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ comment, taskId }),
        },
      );

      if (!response.ok) throw new Error("Error adding comment");

      return await response.json();
    } catch (error) {
      console.error("Error adding comment:", error);
      throw error;
    }
  };

  const getUserProjectStatistics = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/projects/statistics/user`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) throw new Error("Error fetching project statistics");

      return await response.json();
    } catch (error) {
      console.error("Error fetching project statistics:", error);
      throw error;
    }
  };

  const getTaskHistory = async (taskId) => {
    try {
      const response = await fetch(
        `${config.API_BASE_URL}/projects/tasks/${taskId}/history`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching task history:", error);
      throw error;
    }
  };

  const getTaskCosts = async (taskId) => {
    try {
      const response = await fetch(
        `${config.API_BASE_URL}/projects/tasks/${taskId}/costs`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching task costs:", error);
      throw error;
    }
  };

  const addCost = async (taskId, costData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/projects/tasks/${taskId}/costs`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...costData,
            uom: costData.uom, // Assicurati di includere UoM
          }),
        },
      );

      if (!response.ok) throw new Error("Error adding cost");
      return await response.json();
    } catch (error) {
      console.error("Error adding cost:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateCost = async (taskId, lineId, costData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/projects/tasks/${taskId}/costs/${lineId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(costData),
        },
      );

      if (!response.ok) throw new Error("Error updating cost");
      return await response.json();
    } catch (error) {
      console.error("Error updating cost:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteCost = async (taskId, lineId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/projects/tasks/${taskId}/costs/${lineId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) throw new Error("Error deleting cost");
      return await response.json();
    } catch (error) {
      console.error("Error deleting cost:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarEvent = async (taskId, participants) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/calendar/tasks/${taskId}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ participants }),
        },
      );

      if (!response.ok) {
        throw new Error("Error creating calendar event");
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating calendar event:", error);
      throw error;
    }
  };

  const updateTaskSequence = async (taskId, projectId, newSequence) => {
    try {
      // Aggiunta di un timestamp per evitare caching della richiesta
      const timestamp = Date.now();
      const url = `${config.API_BASE_URL}/projects/tasks/${taskId}/sequence?t=${timestamp}`;

      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId, newSequence }),
      });

      if (!response.ok) {
        console.error("updateTaskSequence: Errore nella risposta API", {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(
          `Errore HTTP: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();

      // Ritorna l'intero risultato, inclusi eventuali task aggiornati dalla stored procedure
      return result;
    } catch (error) {
      console.error(
        "updateTaskSequence: Errore nell'aggiornamento sequenza:",
        error,
      );
      throw error;
    }
  };

  const getUserTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/projects/tasks/user`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) throw new Error("Error fetching user tasks");

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // New function to fetch project statuses
  const fetchProjectStatuses = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/projectsStatuses`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Error fetching project statuses");
      const data = await response.json();
      setProjectStatuses(data);
      return data;
    } catch (error) {
      console.error("Error fetching project statuses:", error);
      return [];
    }
  }, []);

  const getUserMemberProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/projects/user/member`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) throw new Error("Error fetching user member projects");

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching user member projects:", error);
      throw error;
    }
  };

  return {
    projects,
    loading,
    totalPages,
    totalRecords,
    fetchProjects,
    getProjectById,
    addUpdateProject,
    updateProjectMembers,
    addUpdateProjectTask,
    updateTaskStatus,
    addTaskComment,
    getUserProjectStatistics,
    checkAdminPermission,
    isOwnTask,
    addCost,
    updateCost,
    deleteCost,
    getTaskCosts,
    getTaskHistory,
    unitsOfMeasure,
    costCategories,
    fetchUnitsOfMeasure,
    fetchCostCategories,
    handleCalendarEvent,
    fetchCategories,
    categories,
    updateTaskSequence,
    getUserTasks,
    updateProjectMemberRole,
    projectStatuses,
    fetchProjectStatuses,
    getUserMemberProjects,
  };
};

export default useProjectActions;
