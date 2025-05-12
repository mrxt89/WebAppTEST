// src/queries/categoryManagement.js
const sql = require('mssql');
const config = require('../config');

// Get all categories with details
const getCategories = async (userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
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
const addUpdateCategory = async (categoryData) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('ProjectCategoryId', sql.Int, categoryData.ProjectCategoryId)
            .input('Description', sql.NVarChar, categoryData.Description)
            .input('HexColor', sql.VarChar(7), categoryData.HexColor)
            .input('UserId', sql.Int, categoryData.UserId)
            .execute('MA_AddUpdateProjectCategory');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in addUpdateCategory:', err);
        throw err;
    }
};

// Add or update category detail
const addUpdateCategoryDetail = async (detailData) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('ProjectCategoryId', sql.Int, detailData.ProjectCategoryId)
            .input('Line', sql.Int, detailData.Line)
            .input('Description', sql.NVarChar, detailData.Description)
            .execute('MA_AddUpdateProjectCategoryDetail');

        return result.recordset[0];
    } catch (err) {
        console.error('Error in addUpdateCategoryDetail:', err);
        throw err;
    }
};

// Toggle category status
const toggleCategoryStatus = async (categoryId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const result = await pool.request()
            .input('ProjectCategoryId', sql.Int, categoryId)
            .query(`
                UPDATE MA_ProjectCategories 
                SET Disabled = CASE WHEN Disabled = 0 THEN 1 ELSE 0 END 
                WHERE ProjectCategoryId = @ProjectCategoryId;
                SELECT 1 as success;
            `);

        return result.recordset[0];
    } catch (err) {
        console.error('Error in toggleCategoryStatus:', err);
        throw err;
    }
};

// Toggle subcategory status
const toggleSubcategoryStatus = async (categoryId, line) => {
    try {
        let pool = await sql.connect(config.dbConfig);
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