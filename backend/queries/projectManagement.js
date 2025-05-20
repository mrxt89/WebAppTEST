const sql = require('mssql');
const config = require('../config');

// Nuova funzione: Ottieni stati progetto
const getProjectStatuses = async () => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .execute('MA_GetProjectStatuses');
        return result.recordset;
    } catch (err) {
        console.error('Error getting project statuses:', err);
        throw err;
    }
};

// Ottieni progetti con paginazione e filtri
const getPaginatedProjects = async (page = 0, pageSize = 50, filters = {}, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request()
            .input('Page', sql.Int, page)
            .input('PageSize', sql.Int, pageSize)
            .input('UserId', sql.Int, userId);

        // Aggiunta parametri dai filtri - Status è ora VARCHAR(5) invece di VARCHAR(20)
        if (filters.status && filters.status !== 'all') {
            request.input('Status', sql.VarChar(5), filters.status);
        } else {
            request.input('Status', sql.VarChar(5), null);
        }

        // Aggiunta filtro per categoria
        if (filters.categoryId && filters.categoryId !== '0') {
            request.input('CategoryId', sql.Int, parseInt(filters.categoryId));
        } else {
            request.input('CategoryId', sql.Int, null);
        }

        // Aggiunta filtro per cliente
        if (filters.custSupp && filters.custSupp !== '0') {
            request.input('CustSupp', sql.Int, parseInt(filters.custSupp));
        } else {
            request.input('CustSupp', sql.Int, null);
        }

        // Aggiunta filtro di ricerca testo
        if (filters.searchText && filters.searchText.trim() !== '') {
            request.input('SearchText', sql.NVarChar(100), filters.searchText.trim());
        } else {
            request.input('SearchText', sql.NVarChar(100), null);
        }

        // Se c'è una data di scadenza nel filtro, la usiamo come EndDate
        if (filters.dueDate && filters.dueDate.trim() !== '') {
            request.input('EndDate', sql.Date, new Date(filters.dueDate));
        } else {
            request.input('EndDate', sql.Date, null);
        }

        // Filtro ID Progetto su ERP aziendale "ProjectErpID" VARCHAR(20)
        if (filters.projectErpId && filters.projectErpId.trim() !== '') {
            request.input('ProjectErpID', sql.NVarChar(20), filters.projectErpId.trim());
        } else {
            request.input('ProjectErpID', sql.NVarChar(20), null);
        }

        // Filtro utente assegnato a una attività @TaskAssignedTo INT
        if (filters.taskAssignedTo && filters.taskAssignedTo !== '0') {
            request.input('TaskAssignedTo', sql.Int, parseInt(filters.taskAssignedTo));
        } else {
            request.input('TaskAssignedTo', sql.Int, null);
        }

        // StartDate non è nei filtri ma è previsto dalla SP
        request.input('StartDate', sql.Date, null);

        // Esegui la stored procedure
        const result = await request.execute('MA_GetPaginatedProjects');

        return {
            items: result.recordset,
            total: result.recordset.length > 0 ? result.recordset[0].TotalRecords : 0,
            page,
            pageSize,
            totalPages: Math.ceil((result.recordset.length > 0 ? result.recordset[0].TotalRecords : 0) / pageSize)
        };
    } catch (err) {
        console.error('Error in getPaginatedProjects:', err);
        throw err;
    }
};

// Ottieni dettagli progetto con task e membri
const getProjectById = async (projectId, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('ProjectID', sql.Int, projectId)
            .input('UserId', sql.Int, userId)
            .execute('MA_GetProjectById');

        // La SP restituisce 3 result set: project, members, tasks
        const project = result.recordsets[0][0];
        if (project) {
            project.members = result.recordsets[1];
            project.tasks = result.recordsets[2];
        }
        
        return project;
    } catch (err) {
        console.error('Error in getProjectById:', err);
        throw err;
    }
};

// Crea o aggiorna progetto
const addUpdateProject = async (projectData, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request();

        // Mapping dei campi con i tipi SQL
        const fieldMappings = {
            ProjectID: { type: sql.Int },
            Name: { type: sql.NVarChar },
            Description: { type: sql.NVarChar },
            StartDate: { type: sql.Date },
            EndDate: { type: sql.Date },
            Status: { type: sql.VarChar(5) }, // Aggiornato a VARCHAR(5)
            UserId: { type: sql.Int },
            ProjectCategoryId: { type: sql.Int },
            ProjectCategoryDetailLine: { type: sql.Int },
            Disabled : { type: sql.Int },
            CustSupp : { type: sql.Int },
            ProjectErpID : { type: sql.NVarChar },
            TemplateID : { type: sql.Int }
        };

        // Aggiunge i parametri per i campi presenti
        Object.keys(projectData).forEach(key => {
            if (fieldMappings[key]) {
                request.input(key, fieldMappings[key].type, projectData[key]);
            }
        });

        request.input('UserId', sql.Int, userId);

        const result = await request.execute('MA_AddUpdateProject');
        return result.recordset[0];
    } catch (err) {
        console.error('Error in addUpdateProject:', err);
        throw err;
    }
};

// Aggiorna membri del progetto
const updateProjectMembers = async (projectId, userId, members) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('ProjectID', sql.Int, projectId)
            .input('UserId', sql.Int, userId)
            .input('MembersJson', sql.NVarChar(sql.MAX), JSON.stringify(members))
            .execute('MA_UpdateProjectMembers');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in updateProjectMembers:', err);
        throw err;
    }
};

// Aggiungi o aggiorna task
const addUpdateProjectTask = async (taskData, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request();

        // Mappatura dei parametri con controlli di tipo
        request.input('TaskID', sql.Int, taskData.TaskID || null);
        request.input('ProjectID', sql.Int, taskData.ProjectID);
        request.input('Title', sql.NVarChar, taskData.Title);
        request.input('Description', sql.NVarChar, taskData.Description);
        request.input('AssignedTo', sql.Int, taskData.AssignedTo || null);
        request.input('Priority', sql.VarChar, taskData.Priority);
        request.input('Status', sql.VarChar, taskData.Status);
        request.input('DueDate', sql.Date, taskData.DueDate ? new Date(taskData.DueDate) : null);
        request.input('StartDate', sql.Date, taskData.StartDate ? new Date(taskData.StartDate) : null);
        request.input('PredecessorTaskID', sql.Int, taskData.PredecessorTaskID || null);
        request.input('UserId', sql.Int, userId);
        request.input('AdditionalAssignees', sql.NVarChar(sql.MAX), taskData.AdditionalAssignees ? taskData.AdditionalAssignees : null);

        const result = await request.execute('MA_AddUpdateProjectTask');
        console.log("[DEBUG] Result:", result.recordset[0]);
        return result.recordset[0];
    } catch (err) {
        console.error('Error in addUpdateProjectTask:', err);
        throw err;
    }
};

// Aggiorna stato task
const updateTaskStatus = async (taskId, status, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TaskID', sql.Int, taskId)
            .input('Status', sql.VarChar, status)
            .input('UserId', sql.Int, userId)
            .execute('MA_UpdateTaskStatus');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in updateTaskStatus:', err);
        throw err;
    }
};

// Aggiungi commento
const addTaskComment = async (commentData) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TaskID', sql.Int, commentData.TaskId)
            .input('UserID', sql.Int, commentData.UserId)
            .input('Comment', sql.NVarChar, commentData.Comment)
            .execute('MA_AddTaskComment');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in addTaskComment:', err);
        throw err;
    }
};

// Aggiungi allegato
const addTaskAttachment = async (attachmentData) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TaskID', sql.Int, attachmentData.TaskID)
            .input('FileName', sql.NVarChar, attachmentData.FileName)
            .input('FilePath', sql.NVarChar, attachmentData.FilePath)
            .input('FileType', sql.NVarChar, attachmentData.FileType)
            .input('FileSizeKB', sql.Int, attachmentData.FileSizeKB)
            .input('UploadedBy', sql.Int, attachmentData.UploadedBy)
            .execute('MA_AddTaskAttachment');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in addTaskAttachment:', err);
        throw err;
    }
};

// Ottieni statistiche progetto per utente
const getUserProjectStatistics = async (userId, filters = {}) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request()
            .input('UserId', sql.Int, userId);

        // Aggiunta parametri dai filtri - Status è ora VARCHAR(5)
        if (filters.status && filters.status !== 'all') {
            request.input('Status', sql.VarChar(5), filters.status);
        } else {
            request.input('Status', sql.VarChar(5), null);
        }

        if (filters.categoryId && filters.categoryId !== '0') {
            request.input('CategoryId', sql.Int, parseInt(filters.categoryId));
        } else {
            request.input('CategoryId', sql.Int, null);
        }

        if (filters.custSupp) {
            request.input('CustSupp', sql.Int, filters.custSupp);
        } else {
            request.input('CustSupp', sql.Int, null);
        }

        if (filters.searchText?.trim()) {
            request.input('SearchText', sql.NVarChar(100), filters.searchText.trim());
        } else {
            request.input('SearchText', sql.NVarChar(100), null);
        }

        if (filters.projectErpId?.trim()) {
            request.input('ProjectErpID', sql.NVarChar(20), filters.projectErpId.trim());
        } else {
            request.input('ProjectErpID', sql.NVarChar(20), null);
        }

        if (filters.taskAssignedTo) {
            request.input('TaskAssignedTo', sql.Int, filters.taskAssignedTo);
        } else {
            request.input('TaskAssignedTo', sql.Int, null);
        }

        const result = await request.execute('MA_GetUserProjectStatistics');

        // Ora riceviamo un singolo recordset con tutte le statistiche
        return {
            activeProjects: result.recordset[0].ActiveProjects,
            activeTasks: result.recordset[0].ActiveTasks,
            delayedProjects: result.recordset[0].DelayedProjects,
            delayedTasks: result.recordset[0].DelayedTasks
        };
    } catch (err) {
        console.error('Error in getUserProjectStatistics:', err);
        throw new Error('Error fetching project statistics');
    }
};

const manageTaskCosts = async (action, taskId, userId, costData, lineId = null) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request()
            .input('Action', sql.VarChar(10), action)
            .input('TaskID', sql.Int, taskId)
            .input('UserID', sql.Int, userId)
            .input('LineID', sql.Int, lineId)
            .input('CategoryID', sql.Int, costData?.categoryId)  // Cambiato in Int e categoryId
            .input('Description', sql.NVarChar(sql.Max), costData?.description)
            .input('Notes', sql.NVarChar(sql.Max), costData?.notes)
            .input('Qty', sql.Float, costData?.qty)
            .input('UnitCost', sql.Float, costData?.unitCost)
            .input('UoM', sql.NVarChar(20), costData?.uom);

        const result = await request.execute('MA_ManageTaskCosts');
        if (action === 'GET') {
            return result.recordset;
        }
        return result.recordset[0];
    } catch (err) {
        console.error(`Error in ${action} cost:`, err);
        throw err;
    }
};

const getUnitsOfMeasure = async () => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .query(`
                SELECT BaseUoM, Description, Symbol, Notes
                FROM MA_UnitsOfMeasure
                ORDER BY Description
            `);
        return result.recordset;
    } catch (err) {
        console.error('Error getting units of measure:', err);
        throw err;
    }
};

const getCostCategories = async () => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .query(`
                SELECT CategoryID, Description, UoM, Name
                FROM MA_ProjectCostsCategory
                ORDER BY Description
            `);
        return result.recordset;
    } catch (err) {
        console.error('Error getting cost categories:', err);
        throw err;
    }
};

// Ottieni cronologia task
const getTaskHistory = async (taskId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TaskID', sql.Int, taskId)
            .query(`
                SELECT  T0.*
                        , CONCAT(T1.firstName, ' ', T1.lastName ) AS Name
                        , ISNULL(T2.Title,'') AS PredecessorTaskTitle
                        , CONCAT(T3.firstName, ' ', T3.lastName ) AS AssignedToName
                FROM    MA_ProjectTasks_Log (NOLOCK) T0
                JOIN    AR_Users (NOLOCK) T1 ON T1.userId = T0.UserId
                LEFT JOIN    MA_ProjectTasks (NOLOCK) T2 ON T2.TaskID = T0.PredecessorTaskID
                JOIN    AR_Users (NOLOCK) T3 ON T3.userId = T0.AssignedTo
                WHERE   T0.TaskID = @TaskID
                ORDER BY T0.TBCreated DESC
            `);

        return result.recordset;
    } catch (err) {
        console.error('Error in getTaskHistory:', err);
        throw err;
    }
};

const updateTaskSequence = async (taskId, projectId, newSequence) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TaskID', sql.Int, taskId)
            .input('ProjectID', sql.Int, projectId)
            .input('NewSequence', sql.Int, newSequence)
            .execute('MA_UpdateTaskSequence');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in updateTaskSequence:', err);
        throw err;
    }
};

// funzione getUserTasks che chiama la stored procedure : MA_GetUserTasks
const getUserTasks = async (userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .execute('MA_GetUserTasks');

        return result.recordset;
    } catch (err) {
        console.error('Error in getUserTasks:', err);
        throw err;
    }
};

// Aggiorna il ruolo di un membro del progetto
const updateProjectMemberRole = async (memberId, role, userId) => {
    try {
      let pool = await sql.connect(config.dbConfig);
      const result = await pool.request()
        .input('ProjectMemberID', sql.Int, memberId)
        .input('Role', sql.VarChar(20), role)
        .input('UserID', sql.Int, userId)
        .query(`
          UPDATE MA_ProjectMembers
          SET Role = @Role,
              TBCreated = GETDATE()
          WHERE ProjectMemberID = @ProjectMemberID;
          
          SELECT 1 as success, 'Ruolo aggiornato con successo' as msg;
        `);
      
      return result.recordset[0];
    } catch (err) {
      console.error('Error in updateProjectMemberRole:', err);
      throw err;
    }
  };

// Ottieni progetti di cui l'utente è membro
const getUserMemberProjects = async (userId) => {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request()
      .input('UserId', sql.Int, userId)
      .query(`
        SELECT p.ProjectID, p.Name, p.Description, p.Status, 
              pm.Role, pm.ProjectMemberID
        FROM MA_Projects p
        JOIN MA_ProjectMembers pm ON p.ProjectID = pm.ProjectID
        WHERE pm.UserID = @UserId
          AND p.Disabled = 0
        ORDER BY p.Name
      `);
    
    return result.recordset;
  } catch (err) {
    console.error('Error in getUserMemberProjects:', err);
    throw err;
  }
};

module.exports = {
    getPaginatedProjects,
    getProjectById,
    addUpdateProject,
    updateProjectMembers,
    addUpdateProjectTask,
    updateTaskStatus,
    addTaskComment,
    addTaskAttachment,
    getUserProjectStatistics,
    manageTaskCosts,
    getTaskHistory,
    getUnitsOfMeasure,
    getCostCategories,
    updateTaskSequence,
    getUserTasks,
    updateProjectMemberRole,
    getProjectStatuses,
    getUserMemberProjects
};