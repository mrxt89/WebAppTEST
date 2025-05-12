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
                            pred.Title AS PredecessorTitle
                        FROM MA_TasksTemplatesDetail td
                        LEFT JOIN AR_Users u ON td.DefaultAssignedTo = u.userId
                        LEFT JOIN AR_Groups g ON td.DefaultGroupId = g.groupId
                        LEFT JOIN MA_TasksTemplatesDetail pred ON td.PredecessorDetailID = pred.TemplateDetailID
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

module.exports = {
    getTemplates,
    addUpdateTemplate,
    addUpdateTemplateDetail,
    toggleTemplateStatus,
    deleteTemplateDetail,
    getFilteredTemplates
};