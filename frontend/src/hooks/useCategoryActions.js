// src/hooks/useCategoryActions.js
import { useState, useCallback } from 'react';
import { config } from '../config';

const useCategoryActions = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch categories
    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_BASE_URL}/projectsCategories/categories`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Error fetching categories');
            }

            const data = await response.json();
            setCategories(data);
            return data;
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // Add/Update category
    const addUpdateCategory = async (categoryData) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_BASE_URL}/projectsCategories/categories`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(categoryData)
            });

            if (!response.ok) {
                throw new Error('Error saving category');
            }

            const result = await response.json();
            await fetchCategories(); // Refresh categories after update
            return result;
        } catch (error) {
            console.error('Error saving category:', error);
            throw error;
        }
    };

    // Add/Update subcategory
    const addUpdateSubcategory = async (subcategoryData) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_BASE_URL}/projectsCategories/categories/details`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(subcategoryData)
            });

            if (!response.ok) {
                throw new Error('Error saving subcategory');
            }

            const result = await response.json();
            await fetchCategories(); // Refresh categories after update
            return result;
        } catch (error) {
            console.error('Error saving subcategory:', error);
            throw error;
        }
    };

    // Toggle category status (enable/disable)
    const toggleCategoryStatus = async (categoryId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_BASE_URL}/projectsCategories/categories/${categoryId}/toggle`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Error toggling category status');
            }

            const result = await response.json();
            await fetchCategories(); // Refresh categories after update
            return result;
        } catch (error) {
            console.error('Error toggling category status:', error);
            throw error;
        }
    };

    // Toggle subcategory status
    const toggleSubcategoryStatus = async (categoryId, line) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${config.API_BASE_URL}/projectsCategories/categories/${categoryId}/details/${line}/toggle`, 
                {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Error toggling subcategory status');
            }

            const result = await response.json();
            await fetchCategories(); // Refresh categories after update
            return result;
        } catch (error) {
            console.error('Error toggling subcategory status:', error);
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
        toggleSubcategoryStatus
    };
};

export default useCategoryActions;