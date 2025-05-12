const sql = require('mssql');
const config = require('../config');
const ExcelJS = require('exceljs');

/**
 * Ottieni le registrazioni di ore settimanali per un utente
 * @param {number} userId - ID dell'utente
 * @param {string} weekStartDate - Data di inizio settimana (formato YYYY-MM-DD)
 * @returns {Promise<Array>} - Array con i tre recordset (daily entries, weekly totals, daily totals)
 */
const getUserTimeWeekly = async (userId, weekStartDate) => {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    const request = pool.request()
      .input('UserID', sql.Int, userId)
      .input('WeekStartDate', sql.Date, weekStartDate);
    
    const result = await request.execute('MA_GetUserTimeWeekly');
    return result.recordsets;
  } catch (err) {
    console.error('Error in getUserTimeWeekly:', err);
    throw err;
  }
};

/**
 * Genera un report in formato Excel
 * @param {Object} reportData - Dati del report
 * @param {Object} user - Dettagli dell'utente
 * @param {string} timeBucket - Tipo di intervallo
 * @param {string} period - Periodo nel formato stringa
 * @returns {Buffer} - Buffer contenente il file Excel
 */
const generateExcelReport = async (reportData, user, timeBucket, period) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'WebApp TimeTracking';
    workbook.lastModifiedBy = 'Automated System';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Stili comuni
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };
    
    const subHeaderStyle = {
      font: { bold: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F0FF' } }
    };
    
    const titleStyle = {
      font: { bold: true, size: 14 },
      alignment: { horizontal: 'left' }
    };
    
    const sectionTitleStyle = {
      font: { bold: true, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEEFF' } },
      alignment: { horizontal: 'left' }
    };
    
    // Foglio di riepilogo
    const summarySheet = workbook.addWorksheet('Riepilogo');
    
    // Intestazione generale
    summarySheet.mergeCells('A1:E1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = `Report attività di ${user.firstName || ''} ${user.lastName || user.username}`;
    titleCell.style = titleStyle;
    
    summarySheet.mergeCells('A2:E2');
    const subTitleCell = summarySheet.getCell('A2');
    subTitleCell.value = `Periodo: ${timeBucket} ${period}`;
    subTitleCell.style = { font: { italic: true } };
    
    // Riepilogo generale - Sezione
    summarySheet.mergeCells('A4:E4');
    const sumTitleCell = summarySheet.getCell('A4');
    sumTitleCell.value = 'RIEPILOGO GENERALE';
    sumTitleCell.style = sectionTitleStyle;
    
    // Riepilogo - Intestazioni
    ['Ore totali', 'Ore target', 'Progetti attivi', 'Efficienza', 'Media giornaliera'].forEach((header, i) => {
      const cell = summarySheet.getCell(`${String.fromCharCode(65 + i)}5`);
      cell.value = header;
      cell.style = subHeaderStyle;
    });
    
    // Riepilogo - Dati
    const summary = reportData.summary;
    [
      summary.TotalHours, 
      summary.TargetHours,
      summary.ActiveProjects,
      `${summary.Efficiency}%`,
      summary.AverageDaily
    ].forEach((value, i) => {
      summarySheet.getCell(`${String.fromCharCode(65 + i)}6`).value = value;
    });
    
    // Distribuzione per progetto - Sezione
    summarySheet.mergeCells('A8:C8');
    const projTitleCell = summarySheet.getCell('A8');
    projTitleCell.value = 'DISTRIBUZIONE PER PROGETTO';
    projTitleCell.style = sectionTitleStyle;
    
    // Distribuzione per progetto - Intestazioni
    ['Progetto', 'Ore', 'Percentuale'].forEach((header, i) => {
      const cell = summarySheet.getCell(`${String.fromCharCode(65 + i)}9`);
      cell.value = header;
      cell.style = subHeaderStyle;
    });
    
    // Distribuzione per progetto - Dati
    reportData.projectDistribution.forEach((proj, rowIndex) => {
      summarySheet.getCell(`A${10 + rowIndex}`).value = proj.ProjectName;
      summarySheet.getCell(`B${10 + rowIndex}`).value = proj.HoursWorked;
      summarySheet.getCell(`C${10 + rowIndex}`).value = `${proj.Percentage}%`;
    });
    
    // Crea un foglio con la distribuzione giornaliera
    const dailySheet = workbook.addWorksheet('Andamento Giornaliero');
    
    // Distribuzione giornaliera - Intestazione
    dailySheet.mergeCells('A1:B1');
    const dailyTitleCell = dailySheet.getCell('A1');
    dailyTitleCell.value = 'DISTRIBUZIONE GIORNALIERA';
    dailyTitleCell.style = sectionTitleStyle;
    
    // Distribuzione giornaliera - Intestazioni colonne
    ['Data', 'Ore'].forEach((header, i) => {
      const cell = dailySheet.getCell(`${String.fromCharCode(65 + i)}2`);
      cell.value = header;
      cell.style = subHeaderStyle;
    });
    
    // Distribuzione giornaliera - Dati
    reportData.dailyDistribution.forEach((day, rowIndex) => {
      dailySheet.getCell(`A${3 + rowIndex}`).value = new Date(day.Date);
      dailySheet.getCell(`B${3 + rowIndex}`).value = day.HoursWorked;
    });
    
    // Formatta le celle delle date
    dailySheet.getColumn('A').numFmt = 'dd/mm/yyyy';
    
    // Crea un foglio con i dettagli per progetto e attività
    const detailsSheet = workbook.addWorksheet('Dettagli Progetti');
    
    // Dettagli progetti - Intestazione
    detailsSheet.mergeCells('A1:D1');
    const detailsTitleCell = detailsSheet.getCell('A1');
    detailsTitleCell.value = 'DETTAGLI PROGETTI E ATTIVITÀ';
    detailsTitleCell.style = sectionTitleStyle;
    
    // Dettagli progetti - Intestazioni colonne
    ['Progetto', 'Attività', 'Tipo', 'Ore'].forEach((header, i) => {
      const cell = detailsSheet.getCell(`${String.fromCharCode(65 + i)}2`);
      cell.value = header;
      cell.style = subHeaderStyle;
    });
    
    // Dettagli progetti - Dati
    let rowIndex = 3;
    reportData.projectDetails.forEach(proj => {
      proj.tasks.forEach(task => {
        detailsSheet.getCell(`A${rowIndex}`).value = proj.projectName;
        detailsSheet.getCell(`B${rowIndex}`).value = task.taskTitle;
        detailsSheet.getCell(`C${rowIndex}`).value = task.workType;
        detailsSheet.getCell(`D${rowIndex}`).value = task.hoursWorked;
        rowIndex++;
      });
    });
    
    // Se ci sono registrazioni dettagliate, crea un foglio dedicato
    if (reportData.timeEntries && reportData.timeEntries.length > 0) {
      const entriesSheet = workbook.addWorksheet('Registrazioni');
      
      // Registrazioni - Intestazione
      entriesSheet.mergeCells('A1:F1');
      const entriesTitleCell = entriesSheet.getCell('A1');
      entriesTitleCell.value = 'REGISTRAZIONI DETTAGLIATE';
      entriesTitleCell.style = sectionTitleStyle;
      
      // Registrazioni - Intestazioni colonne
      ['Data', 'Progetto', 'Attività', 'Tipo', 'Ore', 'Note'].forEach((header, i) => {
        const cell = entriesSheet.getCell(`${String.fromCharCode(65 + i)}2`);
        cell.value = header;
        cell.style = subHeaderStyle;
      });
      
      // Registrazioni - Dati
      reportData.timeEntries.forEach((entry, rowIndex) => {
        entriesSheet.getCell(`A${3 + rowIndex}`).value = new Date(entry.WorkDate);
        entriesSheet.getCell(`B${3 + rowIndex}`).value = entry.ProjectName;
        entriesSheet.getCell(`C${3 + rowIndex}`).value = entry.TaskTitle;
        entriesSheet.getCell(`D${3 + rowIndex}`).value = entry.WorkType;
        entriesSheet.getCell(`E${3 + rowIndex}`).value = entry.HoursWorked;
        entriesSheet.getCell(`F${3 + rowIndex}`).value = entry.Notes || '';
      });
      
      // Formatta le celle delle date
      entriesSheet.getColumn('A').numFmt = 'dd/mm/yyyy';
      
      // Ottimizza larghezza colonne
      entriesSheet.columns.forEach(column => {
        column.width = 15;
      });
      entriesSheet.getColumn('C').width = 30; // Attività
      entriesSheet.getColumn('F').width = 40; // Note
    }
    
    // Ottimizza larghezza colonne
    summarySheet.columns.forEach(column => {
      column.width = 20;
    });
    
    dailySheet.columns.forEach(column => {
      column.width = 15;
    });
    
    detailsSheet.columns.forEach(column => {
      column.width = 20;
    });
    detailsSheet.getColumn('B').width = 30; // Attività
    
    // Esportazione del workbook in buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (err) {
    console.error('Error generating Excel report:', err);
    throw err;
  }
};



/**
 * Ottieni le attività disponibili per un utente
 * @param {number} userId - ID dell'utente
 * @returns {Promise<Array>} - Array di attività disponibili
 */
const getUserAvailableTasks = async (userId) => {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT DISTINCT
          t.TaskID,
          t.Title AS TaskTitle,
          p.ProjectID,
          p.Name AS ProjectName
        FROM MA_ProjectTasks t
        JOIN MA_Projects p ON t.ProjectID = p.ProjectID
        WHERE 
          (
            -- L'utente è assegnato all'attività
            t.AssignedTo = @UserID
            
            -- L'utente è un assegnatario aggiuntivo dell'attività
            OR EXISTS (SELECT 1 FROM MA_ProjectTaskAssignees a WHERE a.TaskID = t.TaskID AND a.UserID = @UserID)
            
            -- L'utente è un membro del progetto
            OR EXISTS (SELECT 1 FROM MA_ProjectMembers m WHERE m.ProjectID = p.ProjectID AND m.UserID = @UserID)
          )
          -- Solo progetti attivi
          AND p.Status = 'ATTIVO'
          -- Solo attività che non sono state completate
          AND t.Status <> 'COMPLETATA'
        ORDER BY p.Name, t.Title
      `);
    
    return result.recordset;
  } catch (err) {
    console.error('Error in getUserAvailableTasks:', err);
    throw err;
  }
};

/**
 * Gestisce le operazioni CRUD sulle registrazioni di ore
 * @param {string} action - Azione da eseguire ('INSERT', 'UPDATE', 'DELETE', 'GET')
 * @param {number} entryId - ID della registrazione (per UPDATE, DELETE, GET)
 * @param {Object} entryData - Dati della registrazione (per INSERT, UPDATE)
 * @param {number} createdBy - ID dell'utente che esegue l'azione
 * @returns {Promise<Object|Array>} - Risultato dell'operazione
 */
const manageTimeEntry = async (action, entryId = null, entryData = null, createdBy) => {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    const request = pool.request()
      .input('Action', sql.VarChar(10), action)
      .input('EntryID', sql.Int, entryId)
      .input('CreatedBy', sql.Int, createdBy);
    
    // Aggiungi parametri solo se necessari per le azioni che li richiedono
    if (action === 'INSERT' || action === 'UPDATE') {
      request
        .input('UserID', sql.Int, entryData.UserID)
        .input('TaskID', sql.Int, entryData.TaskID)
        .input('WorkDate', sql.Date, entryData.WorkDate)
        .input('HoursWorked', sql.Decimal(5, 2), entryData.HoursWorked)
        .input('WorkType', sql.VarChar(20), entryData.WorkType)
        .input('Notes', sql.NVarChar(sql.MAX), entryData.Notes);
    }
    
    const result = await request.execute('MA_ManageUserTaskTime');
    
    // Per GET restituisci l'intero recordset, per le altre azioni solo il primo record
    if (action === 'GET') {
      return result.recordset;
    }
    
    return result.recordset[0];
  } catch (err) {
    console.error(`Error in manageTimeEntry (${action}):`, err);
    throw err;
  }
};

/**
 * Ottieni il riepilogo delle ore per un progetto
 * @param {number} projectId - ID del progetto
 * @param {number} userId - ID dell'utente che fa la richiesta (per controllo permessi)
 * @returns {Promise<Object>} - Riepilogo delle ore del progetto
 */
const getProjectTimeSummary = async (projectId, userId) => {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    // Prima verifica che l'utente abbia accesso a questo progetto
    const permissionCheck = await pool.request()
      .input('ProjectID', sql.Int, projectId)
      .input('UserID', sql.Int, userId)
      .query(`
        -- Verifica se l'utente è admin
        IF EXISTS (SELECT 1 FROM AR_Users WHERE userId = @UserID AND Role = 'ADMIN')
          SELECT 1 AS HasAccess
        -- Verifica se l'utente è membro del progetto
        ELSE IF EXISTS (SELECT 1 FROM MA_ProjectMembers WHERE ProjectID = @ProjectID AND UserID = @UserID)
          SELECT 1 AS HasAccess
        ELSE
          SELECT 0 AS HasAccess
      `);
    
    if (permissionCheck.recordset[0]?.HasAccess !== 1) {
      throw new Error('Non hai i permessi per visualizzare questo progetto');
    }
    
    // Ottieni riepilogo per progetto (ore totali, ripartizione per utente, ecc.)
    const result = await pool.request()
      .input('ProjectID', sql.Int, projectId)
      .input('UserId', sql.Int, userId)
      .execute('MA_GetProjectTimeSummary');
    
    return {
      projectSummary: result.recordsets[0][0] || { TotalHours: 0, TotalUsers: 0, TotalTasks: 0 },
      userBreakdown: result.recordsets[1] || [],
      taskBreakdown: result.recordsets[2] || []
    };
  } catch (err) {
    console.error('Error in getProjectTimeSummary:', err);
    throw err;
  }
};

/**
 * Ottieni il riepilogo delle ore per un'attività
 * @param {number} taskId - ID dell'attività
 * @param {number} userId - ID dell'utente che fa la richiesta (per controllo permessi)
 * @returns {Promise<Object>} - Riepilogo delle ore dell'attività
 */
const getTaskTimeSummary = async (taskId, userId) => {
  try {
    let pool = await sql.connect(config.dbConfig);
    
    // Prima verifica che l'utente abbia accesso a questa attività
    const permissionCheck = await pool.request()
      .input('TaskID', sql.Int, taskId)
      .input('UserID', sql.Int, userId)
      .query(`
        -- Verifica se l'utente è admin
        IF EXISTS (SELECT 1 FROM AR_Users WHERE userId = @UserID AND Role = 'ADMIN')
          SELECT 1 AS HasAccess
        -- Verifica se l'utente è assegnato all'attività
        ELSE IF EXISTS (SELECT 1 FROM MA_ProjectTasks WHERE TaskID = @TaskID AND AssignedTo = @UserID)
          SELECT 1 AS HasAccess
        -- Verifica se l'utente è membro del progetto
        ELSE IF EXISTS (
          SELECT 1 
          FROM MA_ProjectTasks t
          JOIN MA_ProjectMembers m ON t.ProjectID = m.ProjectID
          WHERE t.TaskID = @TaskID AND m.UserID = @UserID
        )
          SELECT 1 AS HasAccess
        ELSE
          SELECT 0 AS HasAccess
      `);
    
    if (permissionCheck.recordset[0]?.HasAccess !== 1) {
      throw new Error('Non hai i permessi per visualizzare questa attività');
    }
    
    // Ottieni riepilogo per attività
    const result = await pool.request()
      .input('TaskID', sql.Int, taskId)
      .input('UserId', sql.Int, userId)
      .execute('MA_GetTaskTimeSummary');
    
    return {
      taskSummary: result.recordsets[0][0] || null,
      userBreakdown: result.recordsets[1] || [],
      recentEntries: result.recordsets[2] || []
    };
  } catch (err) {
    console.error('Error in getTaskTimeSummary:', err);
    throw err;
  }
};

/**
 * Ottieni un report periodico delle ore lavorate
 * @param {number} userId - ID dell'utente
 * @param {string} timeBucket - Tipo di intervallo ('day', 'week', 'month', 'quarter', 'year')
 * @param {Object} options - Opzioni aggiuntive
 * @param {string} options.startDate - Data di inizio (formato YYYY-MM-DD)
 * @param {string} options.endDate - Data di fine (formato YYYY-MM-DD)
 * @param {boolean} options.includeDetails - Se includere dettagli delle registrazioni
 * @param {boolean} options.includeProjectDetails - Se includere dettagli dei progetti
 * @returns {Promise<Object>} - Report completo con vari set di dati
 */
const getUserTimeReport = async (userId, timeBucket = 'month', options = {}) => {
  try {
    const { 
      startDate = null, 
      endDate = null, 
      includeDetails = true,
      includeProjectDetails = true
    } = options;

    let pool = await sql.connect(config.dbConfig);
    
    const request = pool.request()
      .input('UserID', sql.Int, userId)
      .input('TimeBucket', sql.VarChar(20), timeBucket)
      .input('StartDate', sql.Date, startDate)
      .input('EndDate', sql.Date, endDate)
      .input('IncludeDetails', sql.Bit, includeDetails ? 1 : 0)
      .input('IncludeProjectDetails', sql.Bit, includeProjectDetails ? 1 : 0);
      
    const result = await request.execute('MA_GetUserTimeReport');
    
    // Costruisci l'oggetto di report con tutti i dati restituiti
    const reportData = {
      summary: result.recordsets[0][0] || null,
      projectDistribution: result.recordsets[1] || [],
      dailyDistribution: result.recordsets[2] || [],
      projectDetails: (includeProjectDetails && result.recordsets[3]) ? result.recordsets[3].reduce((acc, item) => {
        // Raggruppa i task per progetto
        const projectId = item.ProjectID;
        if (!acc[projectId]) {
          acc[projectId] = {
            projectId: projectId,
            projectName: item.ProjectName,
            totalHours: 0,
            tasks: []
          };
        }
        
        // Aggiorna le ore totali del progetto
        acc[projectId].totalHours += item.HoursWorked;
        
        // Aggiungi il task alla lista
        acc[projectId].tasks.push({
          taskId: item.TaskID,
          taskTitle: item.TaskTitle,
          workType: item.WorkType,
          hoursWorked: item.HoursWorked
        });
        
        return acc;
      }, {}) : {},
      timeEntries: (includeDetails && result.recordsets[includeProjectDetails ? 4 : 3]) || []
    };
    
    // Converti l'oggetto projectDetails in un array
    if (includeProjectDetails) {
      reportData.projectDetails = Object.values(reportData.projectDetails);
    }
    
    return reportData;
  } catch (err) {
    console.error('Error in getUserTimeReport:', err);
    throw err;
  }
};

/**
 * Genera ed esporta un report nel formato specificato
 * @param {number} userId - ID dell'utente
 * @param {string} timeBucket - Tipo di intervallo ('day', 'week', 'month', 'quarter', 'year')
 * @param {string} period - Valore dell'intervallo (es. '2023-05' per maggio 2023)
 * @param {string} format - Formato di esportazione ('csv', 'xlsx')
 * @returns {Promise<Buffer>} - Buffer contenente il file esportato
 */
const exportTimeReport = async (userId, timeBucket = 'month', period = null, format = 'csv') => {
  try {
    // Calcola le date di inizio e fine in base al periodo specificato
    let startDate = null;
    let endDate = null;
    
    if (period) {
      if (timeBucket === 'day') {
        // Formato period: 'YYYY-MM-DD'
        startDate = period;
        endDate = period;
      } else if (timeBucket === 'week') {
        // Formato period: 'YYYY-Www' (es. '2023-W01')
        const [year, week] = period.split('-W');
        const januaryFourth = new Date(parseInt(year), 0, 4);
        const startOfYear = new Date(januaryFourth);
        startOfYear.setDate(januaryFourth.getDate() - januaryFourth.getDay() + 1);
        
        startDate = new Date(startOfYear);
        startDate.setDate(startOfYear.getDate() + (parseInt(week) - 1) * 7);
        startDate = startDate.toISOString().split('T')[0];
        
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate = endDate.toISOString().split('T')[0];
      } else if (timeBucket === 'month') {
        // Formato period: 'YYYY-MM'
        const [year, month] = period.split('-');
        startDate = `${year}-${month}-01`;
        
        // Calcola l'ultimo giorno del mese
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        endDate = `${year}-${month}-${lastDay}`;
      } else if (timeBucket === 'quarter') {
        // Formato period: 'YYYY-Q1', 'YYYY-Q2', ecc.
        const [year, quarter] = period.split('-Q');
        const startMonth = (parseInt(quarter) - 1) * 3 + 1;
        startDate = `${year}-${startMonth.toString().padStart(2, '0')}-01`;
        
        const endMonth = startMonth + 2;
        const endMonthLastDay = new Date(parseInt(year), endMonth, 0).getDate();
        endDate = `${year}-${endMonth.toString().padStart(2, '0')}-${endMonthLastDay}`;
      } else if (timeBucket === 'year') {
        // Formato period: 'YYYY'
        startDate = `${period}-01-01`;
        endDate = `${period}-12-31`;
      }
    }
    
    // Ottieni i dati dal report
    const reportData = await getUserTimeReport(userId, timeBucket, {
      startDate,
      endDate,
      includeDetails: true,
      includeProjectDetails: true
    });
    
    // Ottieni i dettagli dell'utente
    let pool = await sql.connect(config.dbConfig);
    const userResult = await pool.request()
      .input('UserID', sql.Int, userId)
      .query('SELECT username, firstName, lastName, email FROM AR_Users WHERE userId = @UserID');
    
    const user = userResult.recordset[0] || { username: `User-${userId}` };
    
    // Formatta il periodo per il nome del file
    let periodStr = '';
    if (startDate && endDate) {
      if (startDate === endDate) {
        periodStr = startDate;
      } else {
        periodStr = `${startDate}_to_${endDate}`;
      }
    } else {
      periodStr = timeBucket;
    }
    
    // Esporta in base al formato richiesto
    if (format === 'csv') {
      return generateCSVReport(reportData, user, timeBucket, periodStr);
    } else if (format === 'xlsx') {
      return generateExcelReport(reportData, user, timeBucket, periodStr);
    } else {
      throw new Error(`Formato non supportato: ${format}`);
    }
  } catch (err) {
    console.error('Error in exportTimeReport:', err);
    throw err;
  }
};

/**
 * Genera un report in formato CSV
 * @param {Object} reportData - Dati del report
 * @param {Object} user - Dettagli dell'utente
 * @param {string} timeBucket - Tipo di intervallo
 * @param {string} period - Periodo nel formato stringa
 * @returns {Buffer} - Buffer contenente il CSV
 */
const generateCSVReport = async (reportData, user, timeBucket, period) => {
  try {
    let csvContent = '';
    
    // Intestazione
    csvContent += `"Report attività di ${user.firstName || ''} ${user.lastName || user.username}"\n`;
    csvContent += `"Periodo: ${timeBucket} ${period}"\n\n`;
    
    // Riepilogo generale
    csvContent += '"RIEPILOGO GENERALE"\n';
    csvContent += '"Ore totali","Ore target","Progetti attivi","Efficienza","Media giornaliera"\n';
    csvContent += `"${reportData.summary.TotalHours}","${reportData.summary.TargetHours}","${reportData.summary.ActiveProjects}","${reportData.summary.Efficiency}%","${reportData.summary.AverageDaily}"\n\n`;
    
    // Distribuzione per progetto
    csvContent += '"DISTRIBUZIONE PER PROGETTO"\n';
    csvContent += '"Progetto","Ore","Percentuale"\n';
    reportData.projectDistribution.forEach(proj => {
      csvContent += `"${proj.ProjectName}","${proj.HoursWorked}","${proj.Percentage}%"\n`;
    });
    csvContent += '\n';
    
    // Distribuzione giornaliera
    csvContent += '"DISTRIBUZIONE GIORNALIERA"\n';
    csvContent += '"Data","Ore"\n';
    reportData.dailyDistribution.forEach(day => {
      csvContent += `"${day.Date}","${day.HoursWorked}"\n`;
    });
    csvContent += '\n';
    
    // Dettagli progetti e attività
    csvContent += '"DETTAGLI PROGETTI E ATTIVITÀ"\n';
    csvContent += '"Progetto","Attività","Tipo","Ore"\n';
    reportData.projectDetails.forEach(proj => {
      proj.tasks.forEach(task => {
        csvContent += `"${proj.projectName}","${task.taskTitle}","${task.workType}","${task.hoursWorked}"\n`;
      });
    });
    csvContent += '\n';
    
    // Registrazioni individuali
    if (reportData.timeEntries && reportData.timeEntries.length > 0) {
      csvContent += '"REGISTRAZIONI DETTAGLIATE"\n';
      csvContent += '"Data","Progetto","Attività","Tipo","Ore","Note"\n';
      reportData.timeEntries.forEach(entry => {
        csvContent += `"${entry.WorkDate}","${entry.ProjectName}","${entry.TaskTitle}","${entry.WorkType}","${entry.HoursWorked}","${entry.Notes?.replace(/"/g, '""') || ''}"\n`;
      });
      csvContent += '\n';
    }
    
    return Buffer.from(csvContent, 'utf8');
  } catch (err) {
    console.error('Error generating CSV report:', err);
    throw err;
  }
};

module.exports = {
  getUserTimeWeekly,
  getUserAvailableTasks,
  manageTimeEntry,
  getProjectTimeSummary,
  getTaskTimeSummary,
  getUserTimeReport,
  exportTimeReport
};