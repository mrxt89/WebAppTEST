const express = require('express');
const router = express.Router();
const authenticateToken = require('../authenticateToken');
const {
    getCodingHierarchy,
    getNextSequential,
    validateCode,
    applyBatchRecoding,
    getCodingConfig,
    getCodesPreview,
    getRecodingHistory,
    searchSimilarForRecoding
} = require('../queries/codingRulesManagement');

// Get coding configuration for company
router.get('/codingRules/config', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        
        const config = await getCodingConfig(companyId);
        res.json(config);
    } catch (err) {
        console.error('Error fetching coding config:', err);
        res.status(500).json({ 
            success: 0, 
            msg: err.message || 'Errore nel recupero della configurazione' 
        });
    }
});

// Get coding hierarchy based on parent selection
router.get('/codingRules/hierarchy', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const categoryId = req.query.categoryId ? parseInt(req.query.categoryId) : null;
        const macroFamilyId = req.query.macroFamilyId ? parseInt(req.query.macroFamilyId) : null;
        const familyId = req.query.familyId ? parseInt(req.query.familyId) : null;
        const typeId = req.query.typeId ? parseInt(req.query.typeId) : null;
        
        const result = await getCodingHierarchy(
            companyId, 
            categoryId, 
            macroFamilyId, 
            familyId, 
            typeId
        );
        
        res.json(result);
    } catch (err) {
        console.error('Error fetching coding hierarchy:', err);
        res.status(500).json({ 
            success: 0, 
            msg: err.message || 'Errore nel recupero della gerarchia' 
        });
    }
});

// Get next sequential for a specific code root
router.post('/codingRules/getNextSequential', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { macroFamilyCode, familyCode, typeCode, aliasCode } = req.body;
        
        // Validation
        if (!macroFamilyCode || macroFamilyCode.length !== 1) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'Codice macrofamiglia deve essere 1 carattere' 
            });
        }
        
        if (!familyCode || familyCode.length !== 3) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'Codice famiglia deve essere 3 caratteri' 
            });
        }
        
        if (!typeCode || typeCode.length !== 3) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'Codice tipo deve essere 3 caratteri' 
            });
        }
        
        if (!aliasCode || aliasCode.length !== 3) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'Codice alias deve essere 3 caratteri' 
            });
        }
        
        const sequential = await getNextSequential(
            companyId,
            macroFamilyCode,
            familyCode,
            typeCode,
            aliasCode
        );
        
        res.json({ 
            success: 1, 
            sequential: sequential 
        });
    } catch (err) {
        console.error('Error getting next sequential:', err);
        res.status(500).json({ 
            success: 0, 
            msg: err.message || 'Errore nel calcolo del sequenziale' 
        });
    }
});

// Validate a code
router.post('/codingRules/validate', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { itemCode } = req.body;
        
        if (!itemCode || itemCode.trim() === '') {
            return res.status(400).json({
                success: 0,
                msg: 'Codice articolo richiesto'
            });
        }
        
        const result = await validateCode(companyId, itemCode.trim());
        
        res.json({
            success: 1,
            isValid: result.isValid,
            message: result.errorMessage
        });
    } catch (err) {
        console.error('Error validating code:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante la validazione del codice'
        });
    }
});

// Get preview of codes for multiple items
router.post('/codingRules/preview', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { items } = req.body;
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: 0,
                msg: 'Lista articoli richiesta'
            });
        }
        
        const itemsWithPreview = await getCodesPreview(companyId, items);
        
        res.json({
            success: 1,
            items: itemsWithPreview
        });
    } catch (err) {
        console.error('Error getting codes preview:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante la generazione dell\'anteprima'
        });
    }
});

// Apply batch recoding
router.post('/codingRules/apply', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const { items } = req.body;
        
        // Validation
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: 0,
                msg: 'Nessun articolo da ricodificare'
            });
        }
        
        // Validate each item - MODIFICA QUI
        const invalidItems = items.filter(item => {
            // Se stiamo sostituendo con un articolo esistente
            if (item.ReplaceWithExisting && item.UseExistingArticleId) {
                // Verifica solo che abbia ItemId e UseExistingArticleId
                return !item.ItemId || !item.UseExistingArticleId;
            } else {
                // Altrimenti verifica che abbia ItemId e newCode
                return !item.ItemId || !item.NewCode || item.NewCode.trim() === '';
            }
        });
        
        if (invalidItems.length > 0) {
            return res.status(400).json({
                success: 0,
                msg: `${invalidItems.length} articoli non hanno dati validi per la ricodifica`
            });
        }
        
        // Apply recoding
        const result = await applyBatchRecoding(companyId, userId, items);
        
        res.json(result);
    } catch (err) {
        console.error('Error applying batch recoding:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante la ricodifica'
        });
    }
});

// Get recoding history
router.get('/codingRules/history', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        
        // Build filters from query params
        const filters = {};
        
        if (req.query.itemId) {
            filters.itemId = parseInt(req.query.itemId);
        }
        
        if (req.query.dateFrom) {
            filters.dateFrom = new Date(req.query.dateFrom);
        }
        
        if (req.query.dateTo) {
            filters.dateTo = new Date(req.query.dateTo);
        }
        
        if (req.query.userId) {
            filters.userId = parseInt(req.query.userId);
        }
        
        const history = await getRecodingHistory(companyId, filters);
        
        res.json({
            success: 1,
            records: history
        });
    } catch (err) {
        console.error('Error fetching recoding history:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore nel recupero dello storico'
        });
    }
});

// Get all categories
router.get('/codingRules/categories', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        
        // Get categories (root level)
        const categories = await getCodingHierarchy(companyId, null, null, null, null);
        
        res.json({
            success: 1,
            categories: categories
        });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore nel recupero delle categorie'
        });
    }
});

// Get macrofamilies for a category
router.get('/codingRules/macrofamilies/:categoryId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const categoryId = parseInt(req.params.categoryId);
        
        if (!categoryId || isNaN(categoryId)) {
            return res.status(400).json({
                success: 0,
                msg: 'ID categoria non valido'
            });
        }
        
        const macroFamilies = await getCodingHierarchy(companyId, categoryId, null, null, null);
        
        res.json({
            success: 1,
            macroFamilies: macroFamilies
        });
    } catch (err) {
        console.error('Error fetching macrofamilies:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore nel recupero delle macrofamiglie'
        });
    }
});

// Get families for a macrofamily
router.get('/codingRules/families/:macroFamilyId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const macroFamilyId = parseInt(req.params.macroFamilyId);
        
        if (!macroFamilyId || isNaN(macroFamilyId)) {
            return res.status(400).json({
                success: 0,
                msg: 'ID macrofamiglia non valido'
            });
        }
        
        const families = await getCodingHierarchy(companyId, null, macroFamilyId, null, null);
        
        res.json({
            success: 1,
            families: families
        });
    } catch (err) {
        console.error('Error fetching families:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore nel recupero delle famiglie'
        });
    }
});

// Get types for a family
router.get('/codingRules/types/:familyId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const familyId = parseInt(req.params.familyId);
        
        if (!familyId || isNaN(familyId)) {
            return res.status(400).json({
                success: 0,
                msg: 'ID famiglia non valido'
            });
        }
        
        const types = await getCodingHierarchy(companyId, null, null, familyId, null);
        
        res.json({
            success: 1,
            types: types
        });
    } catch (err) {
        console.error('Error fetching types:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore nel recupero dei tipi'
        });
    }
});

// Get aliases for a type
router.get('/codingRules/aliases/:typeId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const typeId = parseInt(req.params.typeId);
        
        if (!typeId || isNaN(typeId)) {
            return res.status(400).json({
                success: 0,
                msg: 'ID tipo non valido'
            });
        }
        
        const aliases = await getCodingHierarchy(companyId, null, null, null, typeId);
        
        res.json({
            success: 1,
            aliases: aliases
        });
    } catch (err) {
        console.error('Error fetching aliases:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore nel recupero degli alias'
        });
    }
});

// Search similar articles during recoding process
router.get('/codingRules/searchSimilar', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const {
            rootCode = '',
            description = '',
            excludeId = null,
            limit = 10
        } = req.query;
        
        // Import the search function
        const { searchSimilarForRecoding } = require('../queries/codingRulesManagement');
        
        // Execute search
        const results = await searchSimilarForRecoding(
            companyId,
            rootCode,
            description,
            excludeId ? parseInt(excludeId) : null,
            {
                limit: parseInt(limit) || 10,
                erpOnly: req.query.erpOnly === 'true',
                tempOnly: req.query.tempOnly === 'true'
            }
        );
        
        res.json({
            success: 1,
            items: results,
            count: results.length
        });
    } catch (err) {
        console.error('Error searching similar articles:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante la ricerca articoli simili'
        });
    }
});

module.exports = router;