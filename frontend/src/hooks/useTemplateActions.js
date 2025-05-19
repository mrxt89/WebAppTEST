// src/hooks/useTemplateActions.js
import { useState, useCallback } from "react";
import { config } from "../config";

const useTemplateActions = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Funzione per caricare tutti i template
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/projectsTemplates/templates`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Error fetching templates");
      }

      const data = await response.json();
      setTemplates(data);
      return data;
    } catch (error) {
      console.error("Error fetching templates:", error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Funzione per caricare template filtrati per categoria e sottocategoria
  const fetchFilteredTemplates = useCallback(
    async (categoryId, detailLine = null) => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        let url = `${config.API_BASE_URL}/projectsTemplates/filtered?categoryId=${categoryId}`;

        if (detailLine) {
          url += `&detailLine=${detailLine}`;
        }

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Error fetching filtered templates");
        }

        const data = await response.json();
        setTemplates(data);
        return data;
      } catch (error) {
        console.error("Error fetching filtered templates:", error);
        setError(error.message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Add/Update template
  const addUpdateTemplate = async (templateData) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/projectsTemplates/templates`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(templateData),
        },
      );

      if (!response.ok) {
        throw new Error("Error saving template");
      }

      const result = await response.json();
      await fetchTemplates(); // Refresh templates after update
      return result;
    } catch (error) {
      console.error("Error saving template:", error);
      throw error;
    }
  };

  // Add/Update template detail (task)
  const addUpdateTemplateDetail = async (templateDetailData) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/projectsTemplates/templates/details`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(templateDetailData),
        },
      );

      if (!response.ok) {
        throw new Error("Error saving template detail");
      }

      const result = await response.json();
      await fetchTemplates(); // Refresh templates after update
      return result;
    } catch (error) {
      console.error("Error saving template detail:", error);
      throw error;
    }
  };

  // Toggle template status (enable/disable)
  const toggleTemplateStatus = async (templateId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/projectsTemplates/templates/${templateId}/toggle`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Error toggling template status");
      }

      const result = await response.json();
      await fetchTemplates(); // Refresh templates after update
      return result;
    } catch (error) {
      console.error("Error toggling template status:", error);
      throw error;
    }
  };

  // Delete template detail
  const deleteTemplateDetail = async (templateDetailId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/projectsTemplates/templates/details/${templateDetailId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Error deleting template detail");
      }

      const result = await response.json();
      await fetchTemplates(); // Refresh templates after update
      return result;
    } catch (error) {
      console.error("Error deleting template detail:", error);
      throw error;
    }
  };

  // Fetch categories for dropdown
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

      if (!response.ok) {
        throw new Error("Error fetching categories");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  }, []);

  // Fetch users for dropdown
  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Error fetching users");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  }, []);

  // Fetch groups for dropdown (new function)
  const fetchGroups = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/groups`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Error fetching groups");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching groups:", error);
      return [];
    }
  }, []);

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    fetchFilteredTemplates,
    addUpdateTemplate,
    addUpdateTemplateDetail,
    toggleTemplateStatus,
    deleteTemplateDetail,
    fetchCategories,
    fetchUsers,
    fetchGroups,
  };
};

export default useTemplateActions;
