// src/hooks/useCategoryActions.js
import { useState, useCallback } from "react";
import axiosInstance from "@/lib/axios";

const useCategoryActions = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        `/projectsCategories/categories`,
      );
      
      if (response.status !== 200) {
        throw new Error("Error fetching categories");
      }

      setCategories(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Add/Update category
  const addUpdateCategory = async (categoryData) => {
    try {
      const response = await axiosInstance.post(
        `/projectsCategories/categories`,
        categoryData,
      );

      return response.data;
    } catch (error) {
      console.error("Error saving category:", error);
      throw error;
    }
  };

  // Add/Update subcategory
  const addUpdateSubcategory = async (subcategoryData) => {
    try {
      const response = await axiosInstance.post(
        `/projectsCategories/categories/details`,
        subcategoryData,
      );

      const result = await response.json();
      await fetchCategories(); // Refresh categories after update
      return result;
    } catch (error) {
      console.error("Error saving subcategory:", error);
      throw error;
    }
  };

  // Toggle category status (enable/disable)
  const toggleCategoryStatus = async (categoryId) => {
    try {
      const response = await axiosInstance.patch(
        `/projectsCategories/categories/${categoryId}/toggle`,
      );

      const result = await response.json();
      await fetchCategories(); // Refresh categories after update
      return result;
    } catch (error) {
      console.error("Error toggling category status:", error);
      throw error;
    }
  };

  // Toggle subcategory status
  const toggleSubcategoryStatus = async (categoryId, line) => {
    try {
      const response = await axiosInstance.patch(
        `/projectsCategories/categories/${categoryId}/details/${line}/toggle`,
      );

      const result = await response.json();
      await fetchCategories(); // Refresh categories after update
      return result;
    } catch (error) {
      console.error("Error toggling subcategory status:", error);
      throw error;
    }
  };

  return {
    categories,
    loading,
    fetchCategories,
    addUpdateCategory,
    addUpdateSubcategory,
    toggleCategoryStatus,
    toggleSubcategoryStatus,
  };
};

export default useCategoryActions;
