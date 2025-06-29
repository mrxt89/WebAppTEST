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
    getFilteredTemplates,
    // Nuove funzioni per stages
    getStageTemplates,
    addUpdateStageTemplate,
    deleteStageTemplate,
    reorderStageTemplates,
    addUpdateStageChecklistTemplate,
    deleteStageChecklistTemplate,
    assignTaskTemplateToStage,
    toggleTemplateUseStages
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

// ===== NUOVE ROUTE PER STAGES =====

// Get template stages
router.get('/templates/:templateId/stages', authenticateToken, async (req, res) => {
    try {
        const templateId = parseInt(req.params.templateId);
        const stages = await getStageTemplates(templateId);
        res.json(stages);
    } catch (err) {
        console.error('Error fetching template stages:', err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Add/Update stage template
router.post('/templates/:templateId/stages', authenticateToken, async (req, res) => {
    try {
        const templateId = parseInt(req.params.templateId);
        const userId = req.user.UserId;
        const stageData = {
            ...req.body,
            TemplateID: templateId
        };
        
        const result = await addUpdateStageTemplate(stageData, userId);
        res.json(result);
    } catch (err) {
        console.error('Error saving stage template:', err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Delete stage template
router.delete('/templates/stages/:stageTemplateId', authenticateToken, async (req, res) => {
    try {
        const stageTemplateId = parseInt(req.params.stageTemplateId);
        const userId = req.user.UserId;
        
        const result = await deleteStageTemplate(stageTemplateId, userId);
        res.json(result);
    } catch (err) {
        console.error('Error deleting stage template:', err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Reorder stage templates
router.put('/templates/:templateId/stages/reorder', authenticateToken, async (req, res) => {
    try {
        const templateId = parseInt(req.params.templateId);
        const { stageOrders } = req.body;
        const userId = req.user.UserId;
        
        const result = await reorderStageTemplates(templateId, stageOrders, userId);
        res.json(result);
    } catch (err) {
        console.error('Error reordering stage templates:', err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Add/Update stage checklist template
router.post('/templates/stages/:stageTemplateId/checklist', authenticateToken, async (req, res) => {
    try {
        const stageTemplateId = parseInt(req.params.stageTemplateId);
        const userId = req.user.UserId;
        const checklistData = {
            ...req.body,
            StageTemplateID: stageTemplateId
        };
        
        const result = await addUpdateStageChecklistTemplate(checklistData, userId);
        res.json(result);
    } catch (err) {
        console.error('Error saving checklist template:', err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Delete checklist template
router.delete('/templates/checklist/:checklistTemplateId', authenticateToken, async (req, res) => {
    try {
        const checklistTemplateId = parseInt(req.params.checklistTemplateId);
        const userId = req.user.UserId;
        
        const result = await deleteStageChecklistTemplate(checklistTemplateId, userId);
        res.json(result);
    } catch (err) {
        console.error('Error deleting checklist template:', err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Assign task template to stage
router.put('/templates/tasks/:templateDetailId/stage', authenticateToken, async (req, res) => {
    try {
        const templateDetailId = parseInt(req.params.templateDetailId);
        const { stageTemplateId, taskSequenceInStage } = req.body;
        const userId = req.user.UserId;
        
        const result = await assignTaskTemplateToStage(
            templateDetailId,
            stageTemplateId ? parseInt(stageTemplateId) : null,
            taskSequenceInStage,
            userId
        );
        res.json(result);
    } catch (err) {
        console.error('Error assigning task to stage:', err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Toggle template use stages
router.patch('/projectsTemplates/templates/:templateId/use-stages', authenticateToken, async (req, res) => {
    try {
        const templateId = parseInt(req.params.templateId);
        const { useStages } = req.body;
        const userId = req.user.UserId;
        
        const result = await toggleTemplateUseStages(templateId, useStages, userId);
        res.json(result);
    } catch (err) {
        console.error('Error toggling template use stages:', err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

module.exports = router;