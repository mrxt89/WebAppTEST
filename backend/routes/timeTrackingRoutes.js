const express = require('express');
const router = express.Router();
const authenticateToken = require('../authenticateToken');
const { 
  getUserTimeWeekly, 
  getUserAvailableTasks, 
  manageTimeEntry, 
  getProjectTimeSummary, 
  getTaskTimeSummary,
  getUserTimeReport,
  exportTimeReport
} = require('../queries/timeTrackingManagement');

/**
 * Middleware per verificare i permessi di amministrazione
 */
const checkAdminPermission = (req, res, next) => {
  
  // Nel tuo sistema, sembra che gli utenti con ruolo 'IT' abbiano permessi di amministrazione
  const adminRoles = ['ADMIN', 'IT', 'RESPONSABILI PROGETTI'];
  const userRole = req.user.role ? req.user.role.toUpperCase() : '';
  
  // Controlla se l'utente ha un ruolo amministrativo
  const isAdmin = adminRoles.includes(userRole);
  
  // Imposta req.isAdmin per usarlo in altri middleware o handler
  req.isAdmin = isAdmin;
  
  // Passa sempre al prossimo middleware
  next();
};

/**
 * Middleware per verificare i permessi di visualizzazione per un utente specifico
 */
const checkUserViewPermission = (req, res, next) => {
  const targetUserId = parseInt(req.params.userId);
  const currentUserId = req.user.UserId;
  
  // Se l'utente sta cercando di vedere i propri dati, procedi
  if (targetUserId === currentUserId) {
    next();
    return;
  }
  
  // Se l'utente è admin basato sul controllo precedente, procedi
  if (req.isAdmin === true) {
    next();
    return;
  }
  
  // Se siamo qui, l'utente non ha i permessi necessari
  return res.status(403).json({ 
    success: 0, 
    msg: 'Non hai i permessi per visualizzare i dati di questo utente'
  });
};

// Ottieni le registrazioni di ore settimanali per un utente
router.get('/timetracking/weekly/:userId', authenticateToken, checkAdminPermission, checkUserViewPermission, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const weekStartDate = req.query.weekStartDate || null;
    
    const result = await getUserTimeWeekly(userId, weekStartDate);
    res.json(result);
  } catch (err) {
    console.error('Error getting weekly time entries:', err);
    res.status(500).json({ success: 0, msg: err.message });
  }
});

// Ottieni le attività disponibili per un utente
router.get('/timetracking/tasks/:userId', authenticateToken, checkAdminPermission, checkUserViewPermission, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    const tasks = await getUserAvailableTasks(userId);
    res.json(tasks);
  } catch (err) {
    console.error('Error getting available tasks:', err);
    res.status(500).json({ success: 0, msg: err.message });
  }
});

// Aggiungi una nuova registrazione di ore
router.post('/timetracking/entries', authenticateToken, checkAdminPermission, async (req, res) => {
  try {
    const timeEntry = req.body;
    const loggedInUserId = req.user.UserId;
    
    // Verifica che l'utente possa registrare ore per questo utente
    // Solo l'utente stesso o un admin può aggiungere ore
    if (timeEntry.UserID !== loggedInUserId && !req.isAdmin) {
      return res.status(403).json({ 
        success: 0, 
        msg: 'Non hai i permessi per registrare ore per questo utente' 
      });
    }
    
    const result = await manageTimeEntry('INSERT', null, timeEntry, loggedInUserId);
    res.json(result);
  } catch (err) {
    console.error('Error adding time entry:', err);
    res.status(500).json({ success: 0, msg: err.message });
  }
});

// Aggiorna una registrazione esistente
router.put('/timetracking/entries/:entryId', authenticateToken, checkAdminPermission, async (req, res) => {
  try {
    const entryId = parseInt(req.params.entryId);
    const timeEntry = req.body;
    const loggedInUserId = req.user.UserId;
    
    // Ottieni i dettagli dell'entry per verificare i permessi
    const existingEntry = await manageTimeEntry('GET', entryId, null, loggedInUserId);
    
    if (!existingEntry || existingEntry.length === 0) {
      return res.status(404).json({ 
        success: 0, 
        msg: 'Registrazione non trovata' 
      });
    }
    
    // Verifica che l'utente possa modificare questa registrazione
    if (existingEntry[0].UserID !== loggedInUserId && !req.isAdmin) {
      return res.status(403).json({ 
        success: 0, 
        msg: 'Non hai i permessi per modificare questa registrazione' 
      });
    }
    
    const result = await manageTimeEntry('UPDATE', entryId, timeEntry, loggedInUserId);
    res.json(result);
  } catch (err) {
    console.error('Error updating time entry:', err);
    res.status(500).json({ success: 0, msg: err.message });
  }
});

// Elimina una registrazione
router.delete('/timetracking/entries/:entryId', authenticateToken, checkAdminPermission, async (req, res) => {
  try {
    const entryId = parseInt(req.params.entryId);
    const loggedInUserId = req.user.UserId;
    
    // Ottieni i dettagli dell'entry per verificare i permessi
    const existingEntry = await manageTimeEntry('GET', entryId, null, loggedInUserId);
    
    if (!existingEntry || existingEntry.length === 0) {
      return res.status(404).json({ 
        success: 0, 
        msg: 'Registrazione non trovata' 
      });
    }
    
    // Verifica che l'utente possa eliminare questa registrazione
    if (existingEntry[0].UserID !== loggedInUserId && !req.isAdmin) {
      return res.status(403).json({ 
        success: 0, 
        msg: 'Non hai i permessi per eliminare questa registrazione' 
      });
    }
    
    const result = await manageTimeEntry('DELETE', entryId, null, loggedInUserId);
    res.json(result);
  } catch (err) {
    console.error('Error deleting time entry:', err);
    res.status(500).json({ success: 0, msg: err.message });
  }
});

// Ottieni il riepilogo delle ore per un progetto
router.get('/timetracking/projects/:projectId/summary', authenticateToken, checkAdminPermission, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const loggedInUserId = req.user.UserId;
    
    const result = await getProjectTimeSummary(projectId, loggedInUserId);
    res.json(result);
  } catch (err) {
    console.error('Error getting project time summary:', err);
    res.status(500).json({ success: 0, msg: err.message });
  }
});

// Ottieni il riepilogo delle ore per un'attività
router.get('/timetracking/tasks/:taskId/summary', authenticateToken, checkAdminPermission, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const loggedInUserId = req.user.UserId;
    
    const result = await getTaskTimeSummary(taskId, loggedInUserId);
    res.json(result);
  } catch (err) {
    console.error('Error getting task time summary:', err);
    res.status(500).json({ success: 0, msg: err.message });
  }
});

/**
 * Ottieni il report periodico delle ore per un utente
 * @route GET /timetracking/reports/:userId
 * @param {string} timeBucket - Tipo di intervallo ('day', 'week', 'month', 'quarter', 'year')
 * @param {string} period - Valore dell'intervallo (es. '2023-05' per maggio 2023)
 * @param {string} startDate - Data di inizio (opzionale, ha precedenza su period)
 * @param {string} endDate - Data di fine (opzionale)
 * @param {boolean} includeDetails - Se includere dettagli delle registrazioni
 */
router.get('/timetracking/reports/:userId', authenticateToken, checkAdminPermission, checkUserViewPermission, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { 
      timeBucket = 'month', 
      period = null,
      startDate = null,
      endDate = null,
      includeDetails = 'true',
      includeProjectDetails = 'true'
    } = req.query;
    
    // Calcola date di inizio e fine in base al period se non sono fornite date esplicite
    let finalStartDate = startDate;
    let finalEndDate = endDate;
    
    if (!startDate && period) {
      if (timeBucket === 'day') {
        // Formato period: 'YYYY-MM-DD'
        finalStartDate = period;
        finalEndDate = period;
      } else if (timeBucket === 'week') {
        // Formato period: 'YYYY-Www' (es. '2023-W01')
        const [year, week] = period.split('-W');
        const januaryFourth = new Date(parseInt(year), 0, 4);
        const startOfYear = new Date(januaryFourth);
        startOfYear.setDate(januaryFourth.getDate() - januaryFourth.getDay() + 1);
        
        const startDate = new Date(startOfYear);
        startDate.setDate(startOfYear.getDate() + (parseInt(week) - 1) * 7);
        finalStartDate = startDate.toISOString().split('T')[0];
        
        const endDateObj = new Date(startDate);
        endDateObj.setDate(endDateObj.getDate() + 6);
        finalEndDate = endDateObj.toISOString().split('T')[0];
      } else if (timeBucket === 'month') {
        // Formato period: 'YYYY-MM'
        const [year, month] = period.split('-');
        finalStartDate = `${year}-${month}-01`;
        
        // Calcola l'ultimo giorno del mese
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        finalEndDate = `${year}-${month}-${lastDay}`;
      } else if (timeBucket === 'quarter') {
        // Formato period: 'YYYY-Q1', 'YYYY-Q2', ecc.
        const [year, quarter] = period.split('-Q');
        const startMonth = (parseInt(quarter) - 1) * 3 + 1;
        finalStartDate = `${year}-${startMonth.toString().padStart(2, '0')}-01`;
        
        const endMonth = startMonth + 2;
        const endMonthLastDay = new Date(parseInt(year), endMonth, 0).getDate();
        finalEndDate = `${year}-${endMonth.toString().padStart(2, '0')}-${endMonthLastDay}`;
      } else if (timeBucket === 'year') {
        // Formato period: 'YYYY'
        finalStartDate = `${period}-01-01`;
        finalEndDate = `${period}-12-31`;
      }
    }
    
    // Ottieni i dati del report
    const reportData = await getUserTimeReport(userId, timeBucket, {
      startDate: finalStartDate,
      endDate: finalEndDate,
      includeDetails: includeDetails === 'true',
      includeProjectDetails: includeProjectDetails === 'true'
    });
    
    res.json(reportData);
  } catch (err) {
    console.error('Error getting time report:', err);
    res.status(500).json({ success: 0, msg: err.message });
  }
});

/**
 * Esporta il report delle ore in formato CSV o Excel
 * @route GET /timetracking/reports/export/:userId
 * @param {string} timeBucket - Tipo di intervallo ('day', 'week', 'month', 'quarter', 'year')
 * @param {string} period - Valore dell'intervallo (es. '2023-05' per maggio 2023)
 * @param {string} format - Formato di esportazione ('csv', 'xlsx')
 */
router.get('/timetracking/reports/export/:userId', authenticateToken, checkAdminPermission, checkUserViewPermission, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { 
      timeBucket = 'month', 
      period = null, 
      format = 'csv'
    } = req.query;
    
    if (!period) {
      return res.status(400).json({ 
        success: 0, 
        msg: 'È necessario specificare il periodo' 
      });
    }
    
    // Verifica formato valido
    if (format !== 'csv' && format !== 'xlsx') {
      return res.status(400).json({ 
        success: 0, 
        msg: 'Formato non supportato. Utilizzare csv o xlsx.' 
      });
    }
    
    // Genera il report
    const fileBuffer = await exportTimeReport(userId, timeBucket, period, format);
    
    // Preparazione del nome file
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `timesheet_${userId}_${timeBucket}_${period.replace(/[/:]/g, '-')}_${dateStr}`;
    
    // Impostazione header per il download
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    } else {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    }
    
    // Invia il file
    res.send(fileBuffer);
  } catch (err) {
    console.error('Error exporting report:', err);
    res.status(500).json({ success: 0, msg: err.message });
  }
});

module.exports = router;