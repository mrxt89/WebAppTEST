// backend/routes/projectActivityLogRoutes.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../authenticateToken');
const { 
  getProjectLogs, 
  getEntityLogs, 
  getProjectStats 
} = require('../queries/projectActivityLog');

// Recupera i log di attività di un progetto
router.get('/projects/:projectId/logs', authenticateToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const companyId = req.user.CompanyId;
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    
    const filters = {
      activityType: req.query.activityType || null,
      entityType: req.query.entityType || null,
      startDate: req.query.startDate ? new Date(req.query.startDate) : null,
      endDate: req.query.endDate ? new Date(req.query.endDate) : null,
      userId: req.query.userId ? parseInt(req.query.userId) : null
    };
    
    const result = await getProjectLogs(projectId, companyId, filters, pageNumber, pageSize);
    
    res.json(result);
  } catch (error) {
    console.error('Errore nel recupero log progetto:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nel recupero dei log',
      error: error.message 
    });
  }
});

// Recupera i log di un'entità specifica (articolo, BOM, ecc.)
router.get('/entities/:entityType/:entityId/logs', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.CompanyId;
    const entityType = req.params.entityType;
    const entityId = parseInt(req.params.entityId);
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    
    const result = await getEntityLogs(companyId, entityType, entityId, pageNumber, pageSize);
    
    res.json(result);
  } catch (error) {
    console.error('Errore nel recupero log entità:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nel recupero dei log',
      error: error.message 
    });
  }
});

// Recupera statistiche attività di un progetto
router.get('/projects/:projectId/stats', authenticateToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const companyId = req.user.CompanyId;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    
    const result = await getProjectStats(projectId, companyId, startDate, endDate);
    
    res.json(result);
  } catch (error) {
    console.error('Errore nel recupero statistiche progetto:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nel recupero delle statistiche',
      error: error.message 
    });
  }
});

module.exports = router;
