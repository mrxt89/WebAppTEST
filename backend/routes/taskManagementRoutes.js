const express = require('express');
const router = express.Router();
const authenticateToken = require('../authenticateToken');
const { 
  getUserTasksWithFilters,
  getTasksStatistics
} = require('../queries/taskManagement');

/**
 * Ottiene l'elenco delle attività dell'utente con filtri applicati
 * @route GET /tasks
 * @param {string} searchText - Testo di ricerca opzionale
 * @param {string} priority - Filtro per priorità (ALTA, MEDIA, BASSA)
 * @param {string} status - Filtro per stato
 * @param {number} projectId - ID progetto da filtrare
 * @param {string} dueDate - Filtro per data di scadenza (today, tomorrow, week, month, late)
 * @param {number} assignedTo - Filtro per utente assegnato (solo per admin)
 * @param {number} involvedUser - Filtro per utente coinvolto (responsabile o collaboratore)
 * @param {string} sortBy - Campo per l'ordinamento
 * @param {string} sortDirection - Direzione ordinamento (ASC, DESC)
 */
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    
    // Estrai i parametri di query
    const {
      searchText,
      priority,
      status,
      projectId,
      dueDate,
      assignedTo,
      involvedUser,
      sortBy = 'DueDate',
      sortDirection = 'ASC'
    } = req.query;
    
    // Converti gli ID in numeri se presenti
    const projectIdNum = projectId && projectId !== 'all' ? parseInt(projectId) : null;
    const assignedToNum = assignedTo ? parseInt(assignedTo) : null;
    const involvedUserNum = involvedUser ? parseInt(involvedUser) : null;
    
    // Esegui la query con i filtri
    const tasks = await getUserTasksWithFilters(
      userId,
      searchText,
      priority,
      status,
      projectIdNum,
      dueDate,
      assignedToNum,
      involvedUserNum,
      sortBy,
      sortDirection
    );
    
    res.json(tasks);
  } catch (err) {
    console.error('Error fetching filtered tasks:', err);
    res.status(500).json({ 
      success: 0,
      msg: 'Errore nel recupero delle attività filtrate'
    });
  }
});

/**
 * Ottieni statistiche sulle attività con filtri applicati
 * @route GET /tasks/statistics
 */
router.get('/tasks/statistics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserId;
    
    // Estrai i parametri di query
    const {
      searchText,
      priority,
      status,
      projectId,
      dueDate,
      assignedTo,
      involvedUser
    } = req.query;
    
    // Converti gli ID in numeri se presenti
    const projectIdNum = projectId && projectId !== 'all' ? parseInt(projectId) : null;
    const assignedToNum = assignedTo ? parseInt(assignedTo) : null;
    const involvedUserNum = involvedUser ? parseInt(involvedUser) : null;
    
    // Ottieni le statistiche filtrate
    const statistics = await getTasksStatistics(
      userId,
      searchText,
      priority,
      status,
      projectIdNum,
      dueDate,
      assignedToNum,
      involvedUserNum
    );
    
    res.json(statistics);
  } catch (err) {
    console.error('Error fetching task statistics:', err);
    res.status(500).json({ 
      success: 0,
      msg: 'Errore nel recupero delle statistiche attività'
    });
  }
});

module.exports = router;