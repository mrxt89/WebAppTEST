// src/queries/templateManagement.js
const sql = require('mssql');
const config = require('../config');

// Get all templates with details
const getTemplates = async (userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT 
                    t.TemplateID,
                    t.Description,
                    t.Notes,
                    t.ProjectCategoryId,
                    t.ProjectCategoryDetailLine,
                    t.IsActive,
                    t.UseStages,
                    t.TBCreated,
                    pc.Description AS CategoryName,
                    pcd.Description AS SubCategoryName,
                    (
                        SELECT 
                            td.TemplateDetailID, 
                            td.TaskSequence, 
                            td.Title, 
                            td.Description, 
                            td.DefaultAssignedTo,
                            u.firstName + ' ' + u.lastName AS AssigneeName,
                            td.DefaultGroupId,
                            g.description AS GroupName,
                            td.Priority, 
                            td.StandardDays,
                            td.PredecessorDetailID,
                            pred.Title AS PredecessorTitle,
                            tts.StageTemplateID,
                            st.StageName AS StageName
                        FROM MA_TasksTemplatesDetail td
                        LEFT JOIN AR_Users u ON td.DefaultAssignedTo = u.userId
                        LEFT JOIN AR_Groups g ON td.DefaultGroupId = g.groupId
                        LEFT JOIN MA_TasksTemplatesDetail pred ON td.PredecessorDetailID = pred.TemplateDetailID
                        LEFT JOIN MA_TaskTemplateStages tts ON td.TemplateDetailID = tts.TemplateDetailID
                        LEFT JOIN MA_StageTemplates st ON tts.StageTemplateID = st.StageTemplateID
                        WHERE td.TemplateID = t.TemplateID
                        ORDER BY td.TaskSequence
                        FOR JSON PATH
                    ) AS Details
                FROM MA_TasksTemplates t
                LEFT JOIN MA_ProjectCategories pc ON t.ProjectCategoryId = pc.ProjectCategoryId
                LEFT JOIN MA_ProjectCategoriesDetail pcd ON t.ProjectCategoryId = pcd.ProjectCategoryId AND t.ProjectCategoryDetailLine = pcd.Line
                WHERE t.CompanyId = (SELECT CompanyId FROM AR_Users WHERE userId = @UserId)
                ORDER BY t.Description
            `);

        const templates = result.recordset.map(template => ({
            ...template,
            Details: template.Details ? JSON.parse(template.Details) : [],
            IsActive: template.IsActive == '1'
        }));

        return templates;
    } catch (err) {
        console.error('Error in getTemplates:', err);
        throw err;
    }
};

// Ottieni template filtrati per categoria e sottocategoria
const getFilteredTemplates = async (userId, categoryId = null, detailLine = null) => {
    try {
      let pool = await sql.connect(config.dbConfig);
      let query = `
        SELECT 
            t.TemplateID,
            t.Description,
            t.Notes,
            t.ProjectCategoryId,
            t.ProjectCategoryDetailLine,
            t.IsActive,
            t.UseStages,
            t.TBCreated,
            pc.Description AS CategoryName,
            pcd.Description AS SubCategoryName,
            (SELECT COUNT(*) FROM MA_TasksTemplatesDetail WHERE TemplateID = t.TemplateID) AS TaskCount
        FROM MA_TasksTemplates t
        LEFT JOIN MA_ProjectCategories pc ON t.ProjectCategoryId = pc.ProjectCategoryId
        LEFT JOIN MA_ProjectCategoriesDetail pcd ON t.ProjectCategoryId = pcd.ProjectCategoryId 
            AND t.ProjectCategoryDetailLine = pcd.Line
        WHERE t.CompanyId = (SELECT CompanyId FROM AR_Users WHERE userId = @UserId)
            AND t.IsActive = 1
      `;
  
      const request = pool.request()
        .input('UserId', sql.Int, userId);
  
      // Aggiungi filtri se specificati
      if (categoryId) {
        query += " AND t.ProjectCategoryId = @CategoryId";
        request.input('CategoryId', sql.Int, categoryId);
      }
  
      if (detailLine) {
        query += " AND t.ProjectCategoryDetailLine = @DetailLine";
        request.input('DetailLine', sql.Int, detailLine);
      }
  
      query += " ORDER BY t.Description";
  
      const result = await request.query(query);
  
      return result.recordset;
    } catch (err) {
      console.error('Error in getFilteredTemplates:', err);
      throw err;
    }
  };

// Add or update template
const addUpdateTemplate = async (templateData) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TemplateID', sql.Int, templateData.TemplateID || null)
            .input('Description', sql.NVarChar, templateData.Description)
            .input('Notes', sql.NVarChar, templateData.Notes || null)
            .input('ProjectCategoryId', sql.Int, templateData.ProjectCategoryId || null)
            .input('ProjectCategoryDetailLine', sql.Int, templateData.ProjectCategoryDetailLine || null)
            .input('CreatedBy', sql.Int, templateData.CreatedBy)
            .input('IsActive', sql.Bit, templateData.IsActive !== undefined ? templateData.IsActive : 1)
            .input('CompanyId', sql.Int, templateData.CompanyId || null)
            .execute('MA_AddUpdateTaskTemplate');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in addUpdateTemplate:', err);
        throw err;
    }
};

// Add or update template detail
const addUpdateTemplateDetail = async (detailData) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TemplateDetailID', sql.Int, detailData.TemplateDetailID || null)
            .input('TemplateID', sql.Int, detailData.TemplateID)
            .input('TaskSequence', sql.Int, detailData.TaskSequence)
            .input('Title', sql.NVarChar, detailData.Title)
            .input('Description', sql.NVarChar, detailData.Description || null)
            .input('DefaultAssignedTo', sql.Int, detailData.DefaultAssignedTo || null)
            .input('DefaultGroupId', sql.Int, detailData.DefaultGroupId || null)
            .input('Priority', sql.VarChar(10), detailData.Priority || 'MEDIA')
            .input('StandardDays', sql.Int, detailData.StandardDays || 1)
            .input('PredecessorDetailID', sql.Int, detailData.PredecessorDetailID || null)
            .execute('MA_AddUpdateTaskTemplateDetail');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in addUpdateTemplateDetail:', err);
        throw err;
    }
};

// Toggle template status
const toggleTemplateStatus = async (templateId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TemplateID', sql.Int, templateId)
            .query(`
                UPDATE MA_TasksTemplates 
                SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END 
                WHERE TemplateID = @TemplateID;
                SELECT 1 as success;
            `);

        return result.recordset[0];
    } catch (err) {
        console.error('Error in toggleTemplateStatus:', err);
        throw err;
    }
};

// Delete template detail
const deleteTemplateDetail = async (templateDetailId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        // Prima verifica se questo dettaglio è referenziato come predecessore
        const checkResult = await pool.request()
            .input('TemplateDetailID', sql.Int, templateDetailId)
            .query(`
                SELECT COUNT(*) AS referenceCount
                FROM MA_TasksTemplatesDetail
                WHERE PredecessorDetailID = @TemplateDetailID
            `);
        
        if (checkResult.recordset[0].referenceCount > 0) {
            return { 
                success: 0, 
                msg: 'Impossibile eliminare: questa attività è utilizzata come predecessore per altre attività' 
            };
        }
        
        // Se non ci sono riferimenti, procedi con l'eliminazione
        const result = await pool.request()
            .input('TemplateDetailID', sql.Int, templateDetailId)
            .query(`
                DELETE FROM MA_TasksTemplatesDetail 
                WHERE TemplateDetailID = @TemplateDetailID;
                SELECT 1 as success, 'Attività eliminata con successo' as msg;
            `);

        return result.recordset[0];
    } catch (err) {
        console.error('Error in deleteTemplateDetail:', err);
        throw err;
    }
};

// ===== NUOVE FUNZIONI PER STAGES =====

// Get stage templates
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

// Add/Update stage template
const addUpdateStageTemplate = async (stageData, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('StageTemplateID', sql.Int, stageData.StageTemplateID || null)
            .input('TemplateID', sql.Int, stageData.TemplateID)
            .input('StageName', sql.NVarChar(255), stageData.StageName)
            .input('StageDescription', sql.NVarChar(sql.MAX), stageData.StageDescription || null)
            .input('StageSequence', sql.Int, stageData.StageSequence)
            .input('HexColor', sql.VarChar(7), stageData.HexColor || '#3B82F6')
            .input('Notes', sql.NVarChar(sql.MAX), stageData.Notes || null)
            .input('IsGateRequired', sql.Bit, stageData.IsGateRequired !== false)
            .input('UserId', sql.Int, userId)
            .execute('MA_AddUpdateStageTemplate');
        
        return result.recordset[0];
    } catch (err) {
        console.error('Error in addUpdateStageTemplate:', err);
        throw err;
    }
};

// Delete stage template
const deleteStageTemplate = async (stageTemplateId, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('StageTemplateID', sql.Int, stageTemplateId)
            .input('UserId', sql.Int, userId)
            .execute('MA_DeleteStageTemplate');
        
        return result.recordset[0];
    } catch (err) {
        console.error('Error in deleteStageTemplate:', err);
        throw err;
    }
};

// Reorder stage templates
const reorderStageTemplates = async (templateId, stageOrders, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TemplateID', sql.Int, templateId)
            .input('StageOrders', sql.NVarChar(sql.MAX), JSON.stringify(stageOrders))
            .input('UserId', sql.Int, userId)
            .execute('MA_ReorderStageTemplates');
        
        return result.recordset[0];
    } catch (err) {
        console.error('Error in reorderStageTemplates:', err);
        throw err;
    }
};

// Add/Update stage checklist template
const addUpdateStageChecklistTemplate = async (checklistData, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('ChecklistTemplateID', sql.Int, checklistData.ChecklistTemplateID || null)
            .input('StageTemplateID', sql.Int, checklistData.StageTemplateID)
            .input('CheckItemText', sql.NVarChar(500), checklistData.CheckItemText)
            .input('CheckItemDescription', sql.NVarChar(sql.MAX), checklistData.CheckItemDescription || null)
            .input('IsRequired', sql.Bit, checklistData.IsRequired !== false)
            .input('ItemSequence', sql.Int, checklistData.ItemSequence || null)
            .input('UserId', sql.Int, userId)
            .execute('MA_AddUpdateStageChecklistTemplate');
        
        return result.recordset[0];
    } catch (err) {
        console.error('Error in addUpdateStageChecklistTemplate:', err);
        throw err;
    }
};

// Delete checklist template
const deleteStageChecklistTemplate = async (checklistTemplateId, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('ChecklistTemplateID', sql.Int, checklistTemplateId)
            .input('UserId', sql.Int, userId)
            .execute('MA_DeleteStageChecklistTemplate');
        
        return result.recordset[0];
    } catch (err) {
        console.error('Error in deleteStageChecklistTemplate:', err);
        throw err;
    }
};

// Assign task template to stage
const assignTaskTemplateToStage = async (templateDetailId, stageTemplateId, taskSequenceInStage, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TemplateDetailID', sql.Int, templateDetailId)
            .input('StageTemplateID', sql.Int, stageTemplateId || null)
            .input('TaskSequenceInStage', sql.Int, taskSequenceInStage || null)
            .input('UserId', sql.Int, userId)
            .execute('MA_AssignTaskTemplateToStage');
        
        return result.recordset[0];
    } catch (err) {
        console.error('Error in assignTaskTemplateToStage:', err);
        throw err;
    }
};

// Toggle template use stages
const toggleTemplateUseStages = async (templateId, useStages, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('TemplateID', sql.Int, templateId)
            .input('UseStages', sql.Bit, useStages)
            .input('UserId', sql.Int, userId)
            .execute('MA_ToggleTemplateUseStages');
        
        return result.recordset[0];
    } catch (err) {
        console.error('Error in toggleTemplateUseStages:', err);
        throw err;
    }
};

module.exports = {
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
};