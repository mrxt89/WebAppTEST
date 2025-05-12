// src/routes/categoryManagementRoutes.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../authenticateToken');
const {
    getCategories,
    addUpdateCategory,
    addUpdateCategoryDetail,
    toggleCategoryStatus,
    toggleSubcategoryStatus
} = require('../queries/categoryManagement');

// Get all categories
router.get('/projectsCategories/categories', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.UserId;
        const categories = await getCategories(userId);
        res.json(categories);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).send('Internal server error');
    }
});

// Add or update category
router.post('/projectsCategories/categories', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.UserId;
        const result = await addUpdateCategory(req.body, userId);
        res.json(result);
    } catch (err) {
        console.error('Error saving category:', err);
        res.status(500).json({
            success: 0,
            msg: 'Error saving category'
        });
    }
});

// Add or update category detail
router.post('/projectsCategories/categories/details', authenticateToken, async (req, res) => {
    try {
        const result = await addUpdateCategoryDetail(req.body);
        res.json(result);
    } catch (err) {
        console.error('Error saving category detail:', err);
        res.status(500).json({
            success: 0,
            msg: 'Error saving category detail'
        });
    }
});

// Toggle category status
router.patch('/projectsCategories/categories/:id/toggle', authenticateToken, async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id);
        const result = await toggleCategoryStatus(categoryId);
        res.json(result);
    } catch (err) {
        console.error('Error toggling category status:', err);
        res.status(500).json({
            success: 0,
            msg: 'Error toggling category status'
        });
    }
});

// Toggle subcategory status
router.patch('/projectsCategories/categories/:id/details/:line/toggle', authenticateToken, async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id);
        const line = parseInt(req.params.line);
        const result = await toggleSubcategoryStatus(categoryId, line);
        res.json(result);
    } catch (err) {
        console.error('Error toggling subcategory status:', err);
        res.status(500).json({
            success: 0,
            msg: 'Error toggling subcategory status'
        });
    }
});

module.exports = router;