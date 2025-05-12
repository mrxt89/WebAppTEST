const sql = require('mssql');
const config = require('../config');

/**
 * Recupera le attività dell'utente con filtri avanzati
 * @param {number} userId - ID dell'utente
 * @param {string} searchText - Testo di ricerca (opzionale)
 * @param {string} priority - Filtro priorità (opzionale)
 * @param {string} status - Filtro stato (opzionale)
 * @param {number} projectId - Filtro progetto (opzionale)
 * @param {string} dueDate - Filtro data scadenza (opzionale)
 * @param {number} assignedTo - Filtro per assegnatario (opzionale)
 * @param {number} involvedUser - Filtro per utente coinvolto (opzionale)
 * @param {string} sortBy - Campo per ordinamento
 * @param {string} sortDirection - Direzione ordinamento
 * @returns {Array} Lista di attività filtrate
 */
const getUserTasksWithFilters = async (
  userId, 
  searchText = null,
  priority = null,
  status = null,
  projectId = null,
  dueDate = null,
  assignedTo = null,
  involvedUser = null,
  sortBy = 'DueDate',
  sortDirection = 'ASC'
) => {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    // Esegui la stored procedure con i filtri
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .input('SearchText', sql.NVarChar(100), searchText)
      .input('Priority', sql.VarChar(20), priority)
      .input('Status', sql.VarChar(20), status)
      .input('ProjectID', sql.Int, projectId)
      .input('DueDateFilter', sql.VarChar(20), dueDate)
      .input('AssignedTo', sql.Int, assignedTo)
      .input('InvolvedUserID', sql.Int, involvedUser)
      .input('SortBy', sql.VarChar(20), sortBy)
      .input('SortDirection', sql.VarChar(4), sortDirection)
      .execute('MA_GetUserTasksWithFilters');
    
    return result.recordset;
  } catch (err) {
    console.error('Error in getUserTasksWithFilters:', err);
    throw err;
  }
};

/**
 * Ottiene statistiche sulle attività con filtri applicati
 * @param {number} userId - ID dell'utente
 * @param {string} searchText - Testo di ricerca (opzionale)
 * @param {string} priority - Filtro priorità (opzionale)
 * @param {string} status - Filtro stato (opzionale)
 * @param {number} projectId - Filtro progetto (opzionale)
 * @param {string} dueDate - Filtro data scadenza (opzionale)
 * @param {number} assignedTo - Filtro per assegnatario (opzionale)
 * @param {number} involvedUser - Filtro per utente coinvolto (opzionale)
 * @returns {Object} Statistiche sulle attività
 */
const getTasksStatistics = async (
  userId, 
  searchText = null,
  priority = null,
  status = null,
  projectId = null,
  dueDate = null,
  assignedTo = null,
  involvedUser = null
) => {
  try {
    // Prima recupera le attività filtrate
    const filteredTasks = await getUserTasksWithFilters(
      userId, 
      searchText,
      priority,
      status,
      projectId,
      dueDate,
      assignedTo,
      involvedUser
    );
    
    // Calcola le statistiche
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    // Statistiche di base
    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(t => t.Status === 'COMPLETATA').length;
    const inProgressTasks = filteredTasks.filter(t => t.Status === 'IN ESECUZIONE').length;
    
    // Attività in ritardo
    const delayedTasks = filteredTasks.filter(t => {
      if (t.Status === 'COMPLETATA' || !t.DueDate) return false;
      const dueDate = new Date(t.DueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).length;
    
    // Attività in scadenza nei prossimi 7 giorni
    const upcomingTasks = filteredTasks.filter(t => {
      if (t.Status === 'COMPLETATA' || !t.DueDate) return false;
      const dueDate = new Date(t.DueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today && dueDate <= nextWeek;
    }).length;
    
    // Distribuzione per stato
    const byStatus = {};
    filteredTasks.forEach(task => {
      byStatus[task.Status] = (byStatus[task.Status] || 0) + 1;
    });
    
    // Distribuzione per priorità
    const byPriority = {};
    filteredTasks.forEach(task => {
      byPriority[task.Priority] = (byPriority[task.Priority] || 0) + 1;
    });
    
    // Distribuzione per assegnatario (top 10)
    const byAssignee = {};
    filteredTasks.forEach(task => {
      if (task.AssignedToName) {
        byAssignee[task.AssignedToName] = (byAssignee[task.AssignedToName] || 0) + 1;
      }
    });
    
    // Converte in array e ordina per numero di attività
    const topAssignees = Object.entries(byAssignee)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      delayedTasks,
      upcomingTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
      byPriority: Object.entries(byPriority).map(([name, value]) => ({ name, value })),
      topAssignees
    };
  } catch (err) {
    console.error('Error in getTasksStatistics:', err);
    throw err;
  }
};

module.exports = {
  getUserTasksWithFilters,
  getTasksStatistics
};