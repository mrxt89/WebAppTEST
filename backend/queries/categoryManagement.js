// src/queries/categoryManagement.js
const sql = require('mssql');
const config = require('../config');

// Get all categories with details
const getCategories = async (userId) => {
    try {
        let pool = await sql.connect(config.database);
        // ESEGUE LA PROCEDURA MA_GetProjectCategories PASSANDO L'ID DELL'UTENTE
        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .execute('MA_GetProjectCategories');

        const categories = result.recordset.map(category => ({
            ...category,
            details: category.Details ? JSON.parse(category.Details) : []
        }));

        return categories;
    } catch (err) {
        console.error('Error in getCategories:', err);
        throw err;
    }
};

// Add or update category
const addUpdateCategory = async (categoryData, userId, companyId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request()
            .input('ProjectCategoryId', sql.Int, categoryData.ProjectCategoryId || null)
            .input('Description', sql.NVarChar(sql.MAX), categoryData.Description)
            .input('HexColor', sql.VarChar(7), categoryData.HexColor || '#000000')
            .input('UserId', sql.Int, userId)
            .input('CompanyId', sql.Int, companyId);

        const result = await request.execute('MA_AddUpdateProjectCategory');

        return { success: 1, ...result.recordset[0] };
    } catch (err) {
        console.error('Error in addUpdateCategory:', err);
        throw err;
    }
};

// Add or update category detail
const addUpdateCategoryDetail = async (detailData) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('ProjectCategoryId', sql.Int, detailData.ProjectCategoryId)
            .input('Line', sql.Int, detailData.Line)
            .input('Description', sql.NVarChar(sql.MAX), detailData.Description)
            .execute('MA_AddUpdateProjectCategoryDetail');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in addUpdateCategoryDetail:', err);
        throw err;
    }
};

// Toggle category status
const toggleCategoryStatus = async (categoryId, userId) => {
    try {
        let pool = await sql.connect(config.database);
        
        // Prima otteniamo il CompanyId dell'utente
        const companyRequest = pool.request()
            .input('UserId', sql.Int, userId);
        
        const companyResult = await companyRequest.query('SELECT CompanyId FROM AR_Users WHERE userId = @UserId');
        const companyId = companyResult.recordset[0]?.CompanyId || 0;
        
        // Poi aggiorniamo solo la categoria del CompanyId corretto
        const result = await pool.request()
            .input('ProjectCategoryId', sql.Int, categoryId)
            .input('CompanyId', sql.Int, companyId)
            .query(`
                UPDATE MA_ProjectCategories 
                SET Disabled = CASE WHEN Disabled = 0 THEN 1 ELSE 0 END 
                WHERE ProjectCategoryId = @ProjectCategoryId AND CompanyId = @CompanyId;
                SELECT @@ROWCOUNT as rowsAffected, 1 as success;
            `);

        if (result.recordset[0].rowsAffected === 0) {
            return { success: 0, msg: 'Categoria non trovata o non autorizzata' };
        }

        return { success: 1, ...result.recordset[0] };
    } catch (err) {
        console.error('Error in toggleCategoryStatus:', err);
        throw err;
    }
};

// Toggle subcategory status
const toggleSubcategoryStatus = async (categoryId, line) => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('ProjectCategoryId', sql.Int, categoryId)
            .input('Line', sql.Int, line)
            .query(`
                UPDATE MA_ProjectCategoriesDetail 
                SET Disabled = CASE WHEN Disabled = 0 THEN 1 ELSE 0 END 
                WHERE ProjectCategoryId = @ProjectCategoryId AND Line = @Line;
                SELECT 1 as success;
            `);

        return result.recordset[0];
    } catch (err) {
        console.error('Error in toggleSubcategoryStatus:', err);
        throw err;
    }
};

module.exports = {
    getCategories,
    addUpdateCategory,
    addUpdateCategoryDetail,
    toggleCategoryStatus,
    toggleSubcategoryStatus
};