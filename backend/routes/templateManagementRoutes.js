// src/routes/templateManagementRoutes.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../authenticateToken');
const {
    getTemplates,
    addUpdateTemplate,
    addUpdateTemplateDetail,
    toggleTemplateStatus,
    deleteTemplateDetail,
    getFilteredTemplates 
} = require('../queries/templateManagement');

// Ottieni tutti i template
router.get('/projectsTemplates/templates', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.UserId;
      const templates = await getTemplates(userId);
      res.json(templates);
    } catch (err) {
      console.error('Error fetching templates:', err);
      res.status(500).send('Internal server error');
    }
  });
  

// Ottieni template filtrati per categoria e sottocategoria
router.get('/projectsTemplates/filtered', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.UserId;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId) : null;
      const detailLine = req.query.detailLine ? parseInt(req.query.detailLine) : null;
      
      const templates = await getFilteredTemplates(userId, categoryId, detailLine);
      res.json(templates);
    } catch (err) {
      console.error('Error fetching filtered templates:', err);
      res.status(500).send('Internal server error');
    }
  });

// Add or update template
router.post('/projectsTemplates/templates', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.UserId;
        const templateData = {
            ...req.body,
            CreatedBy: userId
        };
        const result = await addUpdateTemplate(templateData);
        res.json(result);
    } catch (err) {
        console.error('Error saving template:', err);
        res.status(500).json({
            success: 0,
            msg: 'Error saving template'
        });
    }
});

// Add or update template detail
router.post('/projectsTemplates/templates/details', authenticateToken, async (req, res) => {
    try {
        const result = await addUpdateTemplateDetail(req.body);
        res.json(result);
    } catch (err) {
        console.error('Error saving template detail:', err);
        res.status(500).json({
            success: 0,
            msg: 'Error saving template detail'
        });
    }
});

// Toggle template status
router.patch('/projectsTemplates/templates/:id/toggle', authenticateToken, async (req, res) => {
    try {
        const templateId = parseInt(req.params.id);
        const result = await toggleTemplateStatus(templateId);
        res.json(result);
    } catch (err) {
        console.error('Error toggling template status:', err);
        res.status(500).json({
            success: 0,
            msg: 'Error toggling template status'
        });
    }
});

// Delete template detail
router.delete('/projectsTemplates/templates/details/:id', authenticateToken, async (req, res) => {
    try {
        const templateDetailId = parseInt(req.params.id);
        const result = await deleteTemplateDetail(templateDetailId);
        res.json(result);
    } catch (err) {
        console.error('Error deleting template detail:', err);
        res.status(500).json({
            success: 0,
            msg: 'Error deleting template detail'
        });
    }
});

module.exports = router;