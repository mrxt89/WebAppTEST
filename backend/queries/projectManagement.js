const sql = require('mssql');
const config = require('../config');

// Nuova funzione: Ottieni stati progetto
const getProjectStatuses = async () => {
    try {
        console.log('[PROJECT_MANAGEMENT] Getting project statuses');
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .execute('MA_GetProjectStatuses');
        console.log(`[PROJECT_MANAGEMENT] Retrieved ${result.recordset.length} project statuses`);
        return result.recordset;
    } catch (err) {
        console.error('[PROJECT_MANAGEMENT] Error getting project statuses:', err);
        throw err;
    }
};

// Ottieni progetti con paginazione e filtri
const getPaginatedProjects = async (page = 0, pageSize = 100, filters = {}, userId) => {
    try {
        console.log(`[PROJECT_MANAGEMENT] Getting paginated projects for user: ${userId}`, { page, pageSize, filters });
        
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request()
            .input('Page', sql.Int, page)
            .input('PageSize', sql.Int, pageSize)
            .input('UserId', sql.Int, userId);

        // Status - ora supporta array
        if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
            request.input('Status', sql.NVarChar(sql.MAX), JSON.stringify(filters.status));
        } else if (filters.status && typeof filters.status === 'string' && filters.status !== 'all') {
            request.input('Status', sql.NVarChar(sql.MAX), JSON.stringify([filters.status]));
        } else {
            request.input('Status', sql.NVarChar(sql.MAX), null);
        }

        // CategoryId - mantieni come stringhe
        if (filters.categoryId && Array.isArray(filters.categoryId) && filters.categoryId.length > 0) {
            request.input('CategoryId', sql.NVarChar(sql.MAX), JSON.stringify(filters.categoryId));
        } else if (filters.categoryId && typeof filters.categoryId === 'string' && filters.categoryId !== '0') {
            request.input('CategoryId', sql.NVarChar(sql.MAX), JSON.stringify([filters.categoryId]));
        } else {
            request.input('CategoryId', sql.NVarChar(sql.MAX), null);
        }

        // CustSupp - rimane singolo
        if (filters.custSupp && filters.custSupp !== '0') {
            request.input('CustSupp', sql.Int, parseInt(filters.custSupp));
        } else {
            request.input('CustSupp', sql.Int, null);
        }

        // SearchText
        if (filters.searchText && filters.searchText.trim() !== '') {
            request.input('SearchText', sql.NVarChar(100), filters.searchText.trim());
        } else {
            request.input('SearchText', sql.NVarChar(100), null);
        }

        // EndDate
        if (filters.dueDate && filters.dueDate.trim() !== '') {
            request.input('EndDate', sql.Date, new Date(filters.dueDate));
        } else {
            request.input('EndDate', sql.Date, null);
        }

        // ProjectErpID
        if (filters.projectErpId && filters.projectErpId.trim() !== '') {
            request.input('ProjectErpID', sql.NVarChar(20), filters.projectErpId.trim());
        } else {
            request.input('ProjectErpID', sql.NVarChar(20), null);
        }

        // TaskAssignedTo - MANTIENI COME STRINGHE
        if (filters.taskAssignedTo && Array.isArray(filters.taskAssignedTo) && filters.taskAssignedTo.length > 0) {
            // NON convertire in numeri, mantieni come stringhe
            const jsonString = JSON.stringify(filters.taskAssignedTo);
            request.input('TaskAssignedTo', sql.NVarChar(sql.MAX), jsonString);
        } else if (filters.taskAssignedTo && typeof filters.taskAssignedTo === 'string' && filters.taskAssignedTo !== '0') {
            const jsonString = JSON.stringify([filters.taskAssignedTo]);
            request.input('TaskAssignedTo', sql.NVarChar(sql.MAX), jsonString);
        } else {
            request.input('TaskAssignedTo', sql.NVarChar(sql.MAX), null);
        }

        // StartDate
        request.input('StartDate', sql.Date, null);


        // Esegui la stored procedure
        console.log('[PROJECT_MANAGEMENT] Executing MA_GetPaginatedProjects stored procedure');
        const result = await request.execute('MA_GetPaginatedProjects');

        const totalRecords = result.recordset.length > 0 ? result.recordset[0].TotalRecords : 0;
        const totalPages = Math.ceil(totalRecords / pageSize);
        
        console.log(`[PROJECT_MANAGEMENT] Retrieved ${result.recordset.length} projects, total: ${totalRecords}, pages: ${totalPages}`);

        return {
            items: result.recordset,
            total: totalRecords,
            page,
            pageSize,
            totalPages: totalPages
        };
    } catch (err) {
        console.error('[PROJECT_MANAGEMENT] Error in getPaginatedProjects:', err);
        throw err;
    }
};

// Ottieni dettagli progetto con task e membri
const getProjectById = async (projectId, userId, includeDisabled = false) => {
    try {
        console.log(`[PROJECT_MANAGEMENT] Getting project by ID: ${projectId} for user: ${userId}, includeDisabled: ${includeDisabled}`);
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('ProjectID', sql.Int, projectId)
            .input('UserId', sql.Int, userId)
            .input('IncludeDisabled', sql.Bit, includeDisabled)  // Nuovo parametro
            .execute('MA_GetProjectById');
        
        if (result.recordset.length === 0) {
            console.log(`[PROJECT_MANAGEMENT] Project not found: ${projectId}`);
        } else {
            console.log(`[PROJECT_MANAGEMENT] Project found: ${result.recordset[0].Title}`);
        }
        
        return result.recordset[0];
    } catch (err) {
        console.error('[PROJECT_MANAGEMENT] Error getting project by ID:', err);
        throw err;
    }
};

// Disabilita/abilita task
const toggleTaskDisabled = async (taskId, userId, disable = true) => {
    try {
        console.log(`[PROJECT_MANAGEMENT] Toggling task disabled: ${taskId} -> ${disable ? 'disabled' : 'enabled'} by user: ${userId}`);
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TaskID', sql.Int, taskId)
            .input('UserId', sql.Int, userId)
            .input('Disabled', sql.Bit, disable)
            .execute('MA_ToggleTaskDisabled');
        
        console.log(`[PROJECT_MANAGEMENT] Task disabled status updated. Rows affected: ${result.rowsAffected[0]}`);
        return result.recordset[0];
    } catch (err) {
        console.error('[PROJECT_MANAGEMENT] Error toggling task disabled:', err);
        throw err;
    }
};

// Aggiungi o aggiorna progetto
const addUpdateProject = async (projectData, userId) => {
    try {
        const action = projectData.ProjectID ? 'UPDATE' : 'INSERT';
        console.log(`[PROJECT_MANAGEMENT] ${action} project for user: ${userId}`, { 
            projectId: projectData.ProjectID, 
            title: projectData.Title,
            status: projectData.Status 
        });
        
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request();
        
        // Mappatura dei parametri
        request.input('ProjectID', sql.Int, projectData.ProjectID || null);
        request.input('Title', sql.NVarChar, projectData.Title);
        request.input('Description', sql.NVarChar(sql.MAX), projectData.Description);
        request.input('Status', sql.VarChar, projectData.Status);
        request.input('StartDate', sql.Date, projectData.StartDate ? new Date(projectData.StartDate) : null);
        request.input('EndDate', sql.Date, projectData.EndDate ? new Date(projectData.EndDate) : null);
        request.input('CustSupp', sql.Int, projectData.CustSupp || null);
        request.input('CategoryId', sql.Int, projectData.CategoryId || null);
        request.input('UserId', sql.Int, userId);
        request.input('ProjectErpID', sql.NVarChar(20), projectData.ProjectErpID || null);
        request.input('Budget', sql.Decimal(18, 2), projectData.Budget || null);
        request.input('Priority', sql.VarChar(20), projectData.Priority || 'Medium');
        request.input('ManagerId', sql.Int, projectData.ManagerId || null);

        const result = await request.execute('MA_AddUpdateProject');
        
        console.log(`[PROJECT_MANAGEMENT] Project ${action.toLowerCase()}d successfully. Project ID: ${result.recordset[0].ProjectID}`);
        return result.recordset[0];
    } catch (err) {
        console.error('[PROJECT_MANAGEMENT] Error adding/updating project:', err);
        throw err;
    }
};

// Aggiorna membri progetto
const updateProjectMembers = async (projectId, userId, members) => {
    try {
        console.log(`[PROJECT_MANAGEMENT] Updating project members for project: ${projectId} by user: ${userId}`, { memberCount: members.length });
        
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request();
        request.input('ProjectID', sql.Int, projectId);
        request.input('UserId', sql.Int, userId);
        request.input('Members', sql.NVarChar(sql.MAX), JSON.stringify(members));

        const result = await request.execute('MA_UpdateProjectMembers');
        
        console.log(`[PROJECT_MANAGEMENT] Project members updated successfully. Rows affected: ${result.rowsAffected[0]}`);
        return result.recordset[0];
    } catch (err) {
        console.error('[PROJECT_MANAGEMENT] Error updating project members:', err);
        throw err;
    }
};

// Aggiungi o aggiorna task progetto
const addUpdateProjectTask = async (taskData, userId) => {
    try {
        const action = taskData.TaskID ? 'UPDATE' : 'INSERT';
        console.log(`[PROJECT_MANAGEMENT] ${action} project task for user: ${userId}`, { 
            taskId: taskData.TaskID, 
            projectId: taskData.ProjectID,
            title: taskData.Title,
            status: taskData.Status 
        });
        
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request();

        // Mappatura dei parametri con controlli di tipo
        request.input('TaskID', sql.Int, taskData.TaskID || null);
        request.input('ProjectID', sql.Int, taskData.ProjectID);
        request.input('Title', sql.NVarChar, taskData.Title);
        request.input('Description', sql.NVarChar(sql.MAX), taskData.Description);
        request.input('AssignedTo', sql.Int, taskData.AssignedTo || null);
        request.input('Priority', sql.VarChar, taskData.Priority);
        request.input('Status', sql.VarChar, taskData.Status);
        request.input('DueDate', sql.Date, taskData.DueDate ? new Date(taskData.DueDate) : null);
        request.input('StartDate', sql.Date, taskData.StartDate ? new Date(taskData.StartDate) : null);
        request.input('PredecessorTaskID', sql.Int, taskData.PredecessorTaskID || null);
        request.input('UserId', sql.Int, userId);
        request.input('AdditionalAssignees', sql.NVarChar(sql.MAX), taskData.AdditionalAssignees ? taskData.AdditionalAssignees : null);
        request.input('PredecessorTasks', sql.NVarChar(sql.MAX), taskData.PredecessorTasks ? taskData.PredecessorTasks : null); // Nuovo parametro

        const result = await request.execute('MA_AddUpdateProjectTask');
        
        console.log(`[PROJECT_MANAGEMENT] Task ${action.toLowerCase()}d successfully. Task ID: ${result.recordset[0].TaskID}`);
        return result.recordset[0];
    } catch (err) {
        console.error('[PROJECT_MANAGEMENT] Error in addUpdateProjectTask:', err);
        throw err;
    }
};

// Aggiorna status task
const updateTaskStatus = async (taskId, status, userId) => {
    try {
        console.log(`[PROJECT_MANAGEMENT] Updating task status: ${taskId} -> ${status} by user: ${userId}`);
        
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TaskID', sql.Int, taskId)
            .input('Status', sql.VarChar, status)
            .input('UserId', sql.Int, userId)
            .execute('MA_UpdateTaskStatus');
        
        console.log(`[PROJECT_MANAGEMENT] Task status updated successfully. Rows affected: ${result.rowsAffected[0]}`);
        return result.recordset[0];
    } catch (err) {
        console.error('[PROJECT_MANAGEMENT] Error updating task status:', err);
        throw err;
    }
};

// Aggiungi commento task
const addTaskComment = async (commentData) => {
    try {
        console.log(`[PROJECT_MANAGEMENT] Adding task comment for task: ${commentData.TaskID} by user: ${commentData.UserId}`);
        
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TaskID', sql.Int, commentData.TaskID)
            .input('Comment', sql.NVarChar(sql.MAX), commentData.Comment)
            .input('UserId', sql.Int, commentData.UserId)
            .execute('MA_AddTaskComment');
        
        console.log(`[PROJECT_MANAGEMENT] Task comment added successfully. Comment ID: ${result.recordset[0].CommentID}`);
        return result.recordset[0];
    } catch (err) {
        console.error('[PROJECT_MANAGEMENT] Error adding task comment:', err);
        throw err;
    }
};

// Aggiungi allegato task
const addTaskAttachment = async (attachmentData) => {
    try {
        console.log(`[PROJECT_MANAGEMENT] Adding task attachment for task: ${attachmentData.TaskID} by user: ${attachmentData.UserId}`);
        
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TaskID', sql.Int, attachmentData.TaskID)
            .input('FileName', sql.NVarChar(255), attachmentData.FileName)
            .input('FilePath', sql.NVarChar(sql.MAX), attachmentData.FilePath)
            .input('FileSize', sql.Int, attachmentData.FileSize)
            .input('UserId', sql.Int, attachmentData.UserId)
            .execute('MA_AddTaskAttachment');
        
        console.log(`[PROJECT_MANAGEMENT] Task attachment added successfully. Attachment ID: ${result.recordset[0].AttachmentID}`);
        return result.recordset[0];
    } catch (err) {
        console.error('[PROJECT_MANAGEMENT] Error adding task attachment:', err);
        throw err;
    }
};

// Ottieni statistiche progetto utente
const getUserProjectStatistics = async (userId, filters = {}) => {
    try {
        console.log(`[PROJECT_MANAGEMENT] Getting project statistics for user: ${userId}`, filters);
        
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request()
            .input('UserId', sql.Int, userId);

        // Applica filtri se forniti
        if (filters.status) {
            request.input('Status', sql.VarChar, filters.status);
        }
        if (filters.categoryId) {
            request.input('CategoryId', sql.Int, filters.categoryId);
        }
        if (filters.dateFrom) {
            request.input('DateFrom', sql.Date, new Date(filters.dateFrom));
        }
        if (filters.dateTo) {
            request.input('DateTo', sql.Date, new Date(filters.dateTo));
        }

        const result = await request.execute('MA_GetUserProjectStatistics');
        
        console.log(`[PROJECT_MANAGEMENT] Retrieved project statistics for user ${userId}`);
        return result.recordset[0];
    } catch (err) {
        console.error('[PROJECT_MANAGEMENT] Error getting user project statistics:', err);
        throw err;
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

// Ottieni cronologia task aggiornata con tutti i log
const getTaskHistory = async (taskId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TaskID', sql.Int, taskId)
            .execute('MA_GetTaskHistory');

        return result.recordset;
    } catch (err) {
        console.error('Error in getTaskHistory:', err);
        throw err;
    }
};

// Ottieni log dei costi di un task
const getTaskCostsLog = async (taskId, startDate = null, endDate = null) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request()
            .input('TaskID', sql.Int, taskId)
            .input('StartDate', sql.DateTime, startDate)
            .input('EndDate', sql.DateTime, endDate);

        const result = await request.execute('MA_GetTaskCostsLog');
        return result.recordset;
    } catch (err) {
        console.error('Error in getTaskCostsLog:', err);
        throw err;
    }
};

// Ottieni log delle dipendenze di un task
const getTaskDependenciesLog = async (taskId, startDate = null, endDate = null) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request()
            .input('TaskID', sql.Int, taskId)
            .input('StartDate', sql.DateTime, startDate)
            .input('EndDate', sql.DateTime, endDate);

        const result = await request.execute('MA_GetTaskDependenciesLog');
        return result.recordset;
    } catch (err) {
        console.error('Error in getTaskDependenciesLog:', err);
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
SELECT		p.ProjectID
			, p.Name
			, p.Description
			, p.Status
			, ps.StatusDescription
			, ps.HexColor 
			, pm.Role
			, pm.ProjectMemberID
			, ISNULL(pc.Description,'') AS Category
			, ISNULL(pcd.Description,'') AS CategoryDetail
FROM		MA_Projects p
JOIN		MA_ProjectMembers pm ON p.ProjectID = pm.ProjectID
JOIN		MA_ProjectStatus ps ON ps.Id = p.Status
LEFT JOIN	MA_ProjectCategories pc ON pc.CompanyId = p.CompanyId AND pc.ProjectCategoryId = p.ProjectCategoryId
LEFT JOIN	MA_ProjectCategoriesDetail pcd ON pcd.ProjectCategoryId = pc.ProjectCategoryId AND pcd.Line = p.ProjectCategoryDetailLine
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

const getUserMemberProjectsPaginated = async (userId, page = 0, pageSize = 20, filters = {}) => {
    try {
      let pool = await sql.connect(config.dbConfig);
      const offset = page * pageSize;
      
      // Costruisci la query con filtri
      let whereClause = `
        WHERE pm.UserID = @UserId
        AND p.Disabled = 0
      `;
      
      const request = pool.request()
        .input('UserId', sql.Int, userId)
        .input('Offset', sql.Int, offset)
        .input('PageSize', sql.Int, pageSize);
      
      // Aggiungi filtri
      if (filters.status) {
        whereClause += ` AND ps.StatusDescription = @Status`;
        request.input('Status', sql.NVarChar(100), filters.status);
      }
      
      if (filters.category) {
        whereClause += ` AND pc.Description = @Category`;
        request.input('Category', sql.NVarChar(200), filters.category);
      }
      
      if (filters.categoryDetail) {
        whereClause += ` AND pcd.Description = @CategoryDetail`;
        request.input('CategoryDetail', sql.NVarChar(200), filters.categoryDetail);
      }
      
      if (filters.searchText) {
        whereClause += ` AND (p.Name LIKE @SearchText OR p.Description LIKE @SearchText)`;
        request.input('SearchText', sql.NVarChar(100), `%${filters.searchText}%`);
      }
      
      // Query per contare il totale
      const countQuery = `
        SELECT COUNT(*) as Total
        FROM MA_Projects p
        JOIN MA_ProjectMembers pm ON p.ProjectID = pm.ProjectID
        JOIN MA_ProjectStatus ps ON ps.Id = p.Status
        LEFT JOIN MA_ProjectCategories pc ON pc.CompanyId = p.CompanyId AND pc.ProjectCategoryId = p.ProjectCategoryId
        LEFT JOIN MA_ProjectCategoriesDetail pcd ON pcd.ProjectCategoryId = pc.ProjectCategoryId AND pcd.Line = p.ProjectCategoryDetailLine
        ${whereClause}
      `;
      
      // Query per i dati paginati
      const dataQuery = `
        SELECT p.ProjectID
          , p.Name
          , p.Description
          , p.Status
          , ps.StatusDescription
          , ps.HexColor 
          , pm.Role
          , pm.ProjectMemberID
          , ISNULL(pc.Description,'') AS Category
          , ISNULL(pcd.Description,'') AS CategoryDetail
        FROM MA_Projects p
        JOIN MA_ProjectMembers pm ON p.ProjectID = pm.ProjectID
        JOIN MA_ProjectStatus ps ON ps.Id = p.Status
        LEFT JOIN MA_ProjectCategories pc ON pc.CompanyId = p.CompanyId AND pc.ProjectCategoryId = p.ProjectCategoryId
        LEFT JOIN MA_ProjectCategoriesDetail pcd ON pcd.ProjectCategoryId = pc.ProjectCategoryId AND pcd.Line = p.ProjectCategoryDetailLine
        ${whereClause}
        ORDER BY p.Name
        OFFSET @Offset ROWS
        FETCH NEXT @PageSize ROWS ONLY
      `;
      
      // Esegui entrambe le query
      const countResult = await request.query(countQuery);
      const total = countResult.recordset[0].Total;
      
      const dataResult = await request.query(dataQuery);
      
      return {
        items: dataResult.recordset,
        total: total,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(total / pageSize)
      };
    } catch (err) {
      console.error('Error in getUserMemberProjectsPaginated:', err);
      throw err;
    }
  };
  
  // Gestisce le dipendenze dei task
const manageTaskDependencies = async (taskId, dependencies, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TaskID', sql.Int, taskId)
            .input('Dependencies', sql.NVarChar(sql.MAX), JSON.stringify(dependencies))
            .input('UserId', sql.Int, userId)
            .execute('MA_ManageTaskDependencies');
        
        return result.recordset[0];
    } catch (err) {
        console.error('Error in manageTaskDependencies:', err);
        throw err;
    }
};

// Verifica dipendenze circolari
const checkCircularDependencies = async (taskId, predecessorTaskId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TaskID', sql.Int, taskId)
            .input('PredecessorTaskID', sql.Int, predecessorTaskId)
            .execute('MA_CheckCircularDependencies');
        
        return result.recordset[0];
    } catch (err) {
        console.error('Error in checkCircularDependencies:', err);
        throw err;
    }
};

// Calcola le date basate sulle dipendenze
const calculateTaskDates = async (projectId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('ProjectID', sql.Int, projectId)
            .execute('MA_CalculateTaskDates');
        
        return result.recordset;
    } catch (err) {
        console.error('Error in calculateTaskDates:', err);
        throw err;
    }
};

// Gestisce i pin delle attività
const manageTaskPin = async (taskId, userId, action, newOrder = null) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request()
            .input('TaskID', sql.Int, taskId)
            .input('UserID', sql.Int, userId)
            .input('Action', sql.VarChar(10), action)
            .input('NewOrder', sql.Int, newOrder);

        const result = await request.execute('MA_ManageTaskPin');
        return result.recordset[0];
    } catch (err) {
        console.error('Error managing task pin:', err);
        throw err;
    }
};

const toggleProjectLock = async (projectId, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('ProjectID', sql.Int, projectId)
            .input('UserId', sql.Int, userId)
            .execute('MA_ToggleProjectLock');
        
        return result.recordset[0];
    } catch (err) {
        console.error('Error toggling project lock:', err);
        throw err;
    }
};

// Gestisce i pin dei progetti
const manageProjectPin = async (projectId, userId, action, newOrder = null) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request()
            .input('ProjectID', sql.Int, projectId)
            .input('UserID', sql.Int, userId)
            .input('Action', sql.VarChar(10), action)
            .input('NewOrder', sql.Int, newOrder);

        const result = await request.execute('MA_ManageProjectPin');
        return result.recordset[0];
    } catch (err) {
        console.error('Error managing project pin:', err);
        throw err;
    }
};

/********** STAGING **********/
// Gestione Stage
const addUpdateProjectStage = async (stageData, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request()
            .input('StageID', sql.Int, stageData.StageID || null)
            .input('ProjectID', sql.Int, stageData.ProjectID)
            .input('StageName', sql.NVarChar(255), stageData.StageName)
            .input('StageDescription', sql.NVarChar(sql.MAX), stageData.StageDescription || null)
            .input('StageSequence', sql.Int, stageData.StageSequence)
            .input('HexColor', sql.VarChar(7), stageData.HexColor || '#3B82F6')
            .input('Notes', sql.NVarChar(sql.MAX), stageData.Notes || null)
            .input('IsGateRequired', sql.Bit, stageData.IsGateRequired !== false)
            .input('UserId', sql.Int, userId);

        const result = await request.execute('MA_AddUpdateProjectStage');
        return result.recordset[0];
    } catch (err) {
        console.error('Error in addUpdateProjectStage:', err);
        throw err;
    }
};

// Ottieni stage del progetto
const getProjectStages = async (projectId, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('ProjectID', sql.Int, projectId)
            .input('UserId', sql.Int, userId)
            .execute('MA_GetProjectStages');

        return {
            stages: result.recordsets[0] || [],
            unassignedTasks: result.recordsets[1] || []
        };
    } catch (err) {
        console.error('Error in getProjectStages:', err);
        throw err;
    }
};

// Assegna task a stage
const assignTaskToStage = async (taskId, stageId, taskSequenceInStage, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TaskID', sql.Int, taskId)
            .input('StageID', sql.Int, stageId || null)
            .input('TaskSequenceInStage', sql.Int, taskSequenceInStage || null)
            .input('UserId', sql.Int, userId)
            .execute('MA_AssignTaskToStage');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in assignTaskToStage:', err);
        throw err;
    }
};

// Gestione checklist
const addUpdateStageChecklist = async (checklistData, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('ChecklistID', sql.Int, checklistData.ChecklistID || null)
            .input('StageID', sql.Int, checklistData.StageID)
            .input('CheckItemText', sql.NVarChar(500), checklistData.CheckItemText)
            .input('CheckItemDescription', sql.NVarChar(sql.MAX), checklistData.CheckItemDescription || null)
            .input('IsRequired', sql.Bit, checklistData.IsRequired !== false)
            .input('ItemSequence', sql.Int, checklistData.ItemSequence || null)
            .input('UserId', sql.Int, userId)
            .execute('MA_AddUpdateStageChecklist');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in addUpdateStageChecklist:', err);
        throw err;
    }
};

// Aggiorna stato checklist
const updateChecklistItem = async (checklistId, isChecked, checkNotes, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('ChecklistID', sql.Int, checklistId)
            .input('IsChecked', sql.Bit, isChecked)
            .input('CheckNotes', sql.NVarChar(sql.MAX), checkNotes || null)
            .input('UserId', sql.Int, userId)
            .execute('MA_UpdateChecklistItem');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in updateChecklistItem:', err);
        throw err;
    }
};

// Approva/Rifiuta Gate
const approveRejectStageGate = async (stageId, action, notes, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('StageID', sql.Int, stageId)
            .input('Action', sql.VarChar(20), action) // APPROVED, REJECTED, REOPENED
            .input('Notes', sql.NVarChar(sql.MAX), notes || null)
            .input('UserId', sql.Int, userId)
            .execute('MA_ApproveRejectStageGate');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in approveRejectStageGate:', err);
        throw err;
    }
};

// Elimina stage
const deleteProjectStage = async (stageId, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('StageID', sql.Int, stageId)
            .input('UserId', sql.Int, userId)
            .execute('MA_DeleteProjectStage');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in deleteProjectStage:', err);
        throw err;
    }
};

// Riordina stages
const reorderProjectStages = async (projectId, stageOrders, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('ProjectID', sql.Int, projectId)
            .input('StageOrders', sql.NVarChar(sql.MAX), JSON.stringify(stageOrders))
            .input('UserId', sql.Int, userId)
            .execute('MA_ReorderProjectStages');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in reorderProjectStages:', err);
        throw err;
    }
};

// Template stages
const getStageTemplates = async (templateId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TemplateID', sql.Int, templateId)
            .execute('MA_GetStageTemplates');

        return result.recordset;
    } catch (err) {
        console.error('Error in getStageTemplates:', err);
        throw err;
    }
};

const addUpdateStageTemplate = async (stageTemplateData, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request()
            .input('StageTemplateID', sql.Int, stageTemplateData.StageTemplateID || null)
            .input('TemplateID', sql.Int, stageTemplateData.TemplateID)
            .input('StageName', sql.NVarChar(255), stageTemplateData.StageName)
            .input('StageDescription', sql.NVarChar(sql.MAX), stageTemplateData.StageDescription || null)
            .input('StageSequence', sql.Int, stageTemplateData.StageSequence)
            .input('HexColor', sql.VarChar(7), stageTemplateData.HexColor || '#3B82F6')
            .input('Notes', sql.NVarChar(sql.MAX), stageTemplateData.Notes || null)
            .input('IsGateRequired', sql.Bit, stageTemplateData.IsGateRequired !== false)
            .input('UserId', sql.Int, userId);

        const result = await request.execute('MA_AddUpdateStageTemplate');
        return result.recordset[0];
    } catch (err) {
        console.error('Error in addUpdateStageTemplate:', err);
        throw err;
    }
};

/********** STAGING **********/

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
    getUserMemberProjects,
    getUserMemberProjectsPaginated,
    manageTaskDependencies,
    checkCircularDependencies,
    calculateTaskDates,
    getTaskCostsLog,
    getTaskDependenciesLog,
    toggleTaskDisabled,
    manageTaskPin,
    toggleProjectLock,
    manageProjectPin,
    addUpdateProjectStage,
    getProjectStages,
    assignTaskToStage,
    addUpdateStageChecklist,
    updateChecklistItem,
    approveRejectStageGate,
    deleteProjectStage,
    reorderProjectStages,
    getStageTemplates,
    addUpdateStageTemplate
};