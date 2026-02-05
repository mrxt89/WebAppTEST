const express = require('express');
const router = express.Router();
const authenticateToken = require('../authenticateToken');
const { logActivity, getRequestInfo } = require('../queries/projectActivityLog');
const {
    addUpdateItem,
    addUpdateBOM,
    getBOMData,
    manageReferences,
    getItemStatuses,
    getPaginatedItems,
    getItemById,
    getERPBOMs,
    getERPItemsAndBOMs,
    getProjectItemsAndBOMs,
    getReferenceBOMs,
    reorderBOMComponents,
    getAvailableItems,
    getERPItems,
    importERPItem,
    linkItemToProject,
    copyBOMFromItem,
    replaceComponent,
    replaceWithNewComponent,
    unlinkItemFromProject,
    disableTemporaryItem,
    canDisableItem,
    getWorkCenters,
    getOperations,
    getSuppliers,
    getBOMVersions,
    reorderBOMRoutings,
    getUnitsOfMeasure,
    updateItemDetails,
    saveTechnicalCharacteristics,
    importERPItemWithSelection,
    getERPItemsPaginated,
    validateItemCode,
    checkItemCodeExists,
    updateItemDetailsWithValidation,
    searchSimilarArticles,
    getArticleBOMTree,
    getComponentAttachments,
    // Intercompany functions
    getIntercompanyComponents,
    syncIntercompanySharing,
    syncIntercompanyComponents,
    getBOMIntercompanySummary,
    getIntercompanyRequests,
    approveRejectReference,
    getReferenceAttachments,
    updateReferenceNotes,
    // NEW: Intercompany supplier functions
    checkItemInGestionale,
    getSuppliersWithIntercompanyFlag,
    // NEW: Intercompany with projects
    approveIntercompanyReferenceWithProject,
    getTemporaryIntercompanyItems,
    replaceTemporaryItem,
    getReferenceWithProjects,
    updateRoutingCheckOperation
} = require('../queries/projectArticlesManagement');

// Ottieni stati degli articoli di progetto
router.get('/projectArticles/statuses', authenticateToken, async (req, res) => {
    try {
        const statuses = await getItemStatuses();
        res.json(statuses);
    } catch (err) {
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Ottieni articoli di progetto con paginazione e filtri
router.get('/projectArticles/items/paginated', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const page = parseInt(req.query.page) || 0;
        const pageSize = parseInt(req.query.pageSize) || 50;
        const filters = req.query.filters ? JSON.parse(req.query.filters) : {};
        
        const result = await getPaginatedItems(companyId, page, pageSize, filters);
        res.json(result);
    } catch (err) {
        console.error('Error fetching paginated items:', err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Rimuove l'associazione tra un articolo e un progetto
router.delete('/projectArticles/items/:itemId/project/:projectId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const itemId = parseInt(req.params.itemId);
        const projectId = parseInt(req.params.projectId);
        
        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'ID articolo non valido' 
            });
        }
        
        if (!projectId || isNaN(projectId)) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'ID progetto non valido' 
            });
        }
        
        const result = await unlinkItemFromProject(companyId, projectId, itemId);
        
        // LOGGING: Traccia lo scollegamento articolo da progetto
        if (result.success) {
            const userId = req.user.UserId;
            const requestInfo = getRequestInfo(req);
            await logActivity({
                companyId,
                projectId,
                userId,
                activityType: 'ITEM_UNLINK_PROJECT',
                entityType: 'Item',
                entityId: itemId,
                action: 'UNLINK',
                description: `Scollegato articolo ${itemId} dal progetto ${projectId}`,
                metadata: {
                    itemId: itemId,
                    projectId: projectId
                },
                ...requestInfo
            }).catch(err => {
                console.warn('Errore nel logging attività unlink articolo:', err);
            });
        }
        
        return res.json(result);
    } catch (err) {
        console.error('Error unlinking item from project:', err);
        return res.status(500).json({ 
            success: 0, 
            msg: err.message || 'Errore durante la rimozione dell\'articolo dal progetto' 
        });
    }
});

// Disabilita un articolo temporaneo
router.put('/projectArticles/items/:itemId/disable', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const itemId = parseInt(req.params.itemId);
        
        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'ID articolo non valido' 
            });
        }
        
        const result = await disableTemporaryItem(companyId, itemId);
        
        return res.json(result);
    } catch (err) {
        console.error('Error disabling temporary item:', err);
        return res.status(500).json({ 
            success: 0, 
            msg: err.message || 'Errore durante la disabilitazione dell\'articolo temporaneo' 
        });
    }
});

// Verifica se un articolo può essere disabilitato
router.get('/projectArticles/items/:itemId/canDisable', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const itemId = parseInt(req.params.itemId);
        
        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'ID articolo non valido' 
            });
        }
        
        const result = await canDisableItem(companyId, itemId);
        
        return res.json(result);
    } catch (err) {
        console.error('Error checking if item can be disabled:', err);
        return res.status(500).json({ 
            success: 0, 
            msg: err.message || 'Errore durante la verifica' 
        });
    }
});

// Crea o aggiorna un articolo di progetto
router.post('/projectArticles/items', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const { action, itemData, projectId, sourceItemId } = req.body;
        
        // Validazione input
        if (!action || !['ADD', 'UPDATE', 'COPY'].includes(action)) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'Azione non valida. Utilizzare ADD, UPDATE o COPY.' 
            });
        }
        
        if (!itemData) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'Dati articolo mancanti'
            });
        }
        
        // Validazioni specifiche per azione
        if (action === 'ADD' && !projectId) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'ProjectId richiesto per l\'azione ADD'
            });
        }
        
        if (action === 'UPDATE' && (!itemData.Id || itemData.Id <= 0)) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'Id articolo richiesto per l\'azione UPDATE'
            });
        }
        
        if (action === 'COPY') {
            if (!projectId) {
                return res.status(400).json({ 
                    success: 0, 
                    msg: 'ProjectId richiesto per l\'azione COPY'
                });
            }
            
            if (!sourceItemId) {
                return res.status(400).json({ 
                    success: 0, 
                    msg: 'SourceItemId richiesto per l\'azione COPY'
                });
            }
        }
        
        const result = await addUpdateItem(action, companyId, itemData, userId, projectId, sourceItemId);
        
        // LOGGING: Traccia l'operazione solo se ha successo
        if (result.success) {
            const requestInfo = getRequestInfo(req);
            const activityType = action === 'ADD' ? 'ITEM_CREATE' : 
                               action === 'UPDATE' ? 'ITEM_UPDATE' : 
                               'ITEM_CREATE'; // COPY è considerato CREATE
            
            // Determina se è stato generato un nuovo codice
            const finalItemCode = itemData.Item || result.createdComponentCode;
            const isNewCodeGenerated = result.createdComponentCode && !itemData.Item;
            const descriptionText = isNewCodeGenerated 
                ? `${action === 'ADD' ? 'Creato' : action === 'UPDATE' ? 'Modificato' : 'Copiato'} articolo con nuovo codice generato: ${result.createdComponentCode}`
                : `${action === 'ADD' ? 'Creato' : action === 'UPDATE' ? 'Modificato' : 'Copiato'} articolo ${finalItemCode || itemData.Description || result.itemId}`;
            
            await logActivity({
                companyId,
                projectId: projectId || null,
                userId,
                activityType,
                entityType: 'Item',
                entityId: result.itemId,
                entityCode: finalItemCode || null,
                action: action === 'ADD' ? 'CREATE' : action === 'UPDATE' ? 'UPDATE' : 'CREATE',
                description: descriptionText,
                newValues: {
                    Item: finalItemCode,
                    Description: itemData.Description,
                    CategoryId: itemData.CategoryId,
                    StatusId: itemData.StatusId,
                    Nature: itemData.Nature,
                    CustomerItemReference: itemData.CustomerItemReference
                },
                metadata: {
                    sourceItemId: sourceItemId,
                    projectId: projectId,
                    action: action,
                    isNewCodeGenerated: isNewCodeGenerated,
                    generatedCode: result.createdComponentCode || null
                },
                ...requestInfo
            }).catch(err => {
                console.warn('Errore nel logging attività articolo:', err);
            });
        }
        
        res.json(result);
    } catch (err) {
        console.error(`Error in ${req.body.action || 'unknown'} item:`, err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Gestione distinte base
router.post('/projectArticles/boms', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const { action, bomData } = req.body;
        
        // Validazione input
        if (!action) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'Azione non specificata'
            });
        }
        
        if (!bomData) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'Dati distinta base mancanti'
            });
        }
        
        // Caso speciale per ADD_COMPONENT con creazione automatica di componente temporaneo
        // Supporta sia createTempComponent (camelCase) che CreateTempComponent (PascalCase)
        if (action === 'ADD_COMPONENT' && (bomData.createTempComponent === true || bomData.CreateTempComponent === true)) {
            // Normalizza i parametri per la funzione
            const processedData = {
                ...bomData,
                CreateTempComponent: true
            };
            
            // Mappa i parametri dal payload al formato atteso
            if (bomData.ComponentNatureValue !== undefined) {
                processedData.Nature = bomData.ComponentNatureValue;
            }
            
            if (bomData.ComponentUoM !== undefined) {
                processedData.UoM = bomData.ComponentUoM;
            }
            
            // Converte ParentComponentId da stringa a numero se necessario
            if (bomData.ParentComponentId !== undefined) {
                processedData.ParentComponentId = typeof bomData.ParentComponentId === 'string' 
                    ? parseInt(bomData.ParentComponentId, 10) 
                    : bomData.ParentComponentId;
            }
            
            if (bomData.tempComponentPrefix || bomData.TempComponentPrefix) {
                processedData.TempComponentPrefix = bomData.TempComponentPrefix || bomData.tempComponentPrefix;
            }
            
            // Chiama la funzione con il flag di creazione componente temporaneo
            const result = await addUpdateBOM(action, companyId, processedData, userId);
            
            // LOGGING: Traccia l'aggiunta del componente temporaneo
            if (result.success) {
                const requestInfo = getRequestInfo(req);
                // Converti Id a numero se è stringa
                let bomId = null;
                if (processedData.Id) {
                    bomId = typeof processedData.Id === 'string' ? parseInt(processedData.Id, 10) : processedData.Id;
                } else if (result.bomId) {
                    bomId = typeof result.bomId === 'string' ? parseInt(result.bomId, 10) : result.bomId;
                }
                
                if (!bomId || isNaN(bomId)) {
                    console.error('[LOG ERROR] bomId non valido per logging ADD_COMPONENT:', {
                        action,
                        processedDataId: processedData.Id,
                        resultBomId: result.bomId,
                        bomId
                    });
                    bomId = 0;
                }
                
                // Recupera il ComponentId e ComponentCode creati dal risultato
                let createdComponentId = result.createdComponentId || result.ComponentId;
                let createdComponentCode = result.createdComponentCode || result.ComponentCode;
                let componentLine = result.ComponentLine || result.Line;
                
                // Se non disponibili nel risultato, recuperali dal database
                if (!createdComponentId || !createdComponentCode) {
                    try {
                        const sql = require('mssql');
                        const config = require('../config');
                        const pool = await sql.connect(config.database);
                        
                        // Recupera l'ultimo componente aggiunto a questa BOM
                        const compInfo = await pool.request()
                            .input('CompanyId', sql.Int, companyId)
                            .input('BOMId', sql.BigInt, bomId)
                            .query(`
                                SELECT TOP 1 c.ComponentId, c.Line, i.Item, i.Description
                                FROM dbo.MA_ProjectArticles_BOMComponents c
                                LEFT JOIN dbo.MA_ProjectArticles_Items i ON c.ComponentId = i.Id AND c.CompanyId = i.CompanyId
                                WHERE c.CompanyId = @CompanyId AND c.BOMId = @BOMId
                                ORDER BY c.Line DESC
                            `);
                        
                        if (compInfo.recordset.length > 0) {
                            if (!createdComponentId) createdComponentId = compInfo.recordset[0].ComponentId;
                            if (!createdComponentCode) createdComponentCode = compInfo.recordset[0].Item || 'TMP (creato)';
                            if (!componentLine) componentLine = compInfo.recordset[0].Line;
                        }
                    } catch (err) {
                        console.warn('Errore nel recupero componente creato per logging:', err);
                    }
                }
                
                // Fallback se ancora non disponibili
                if (!createdComponentCode) createdComponentCode = 'TMP (creato)';
                
                // Recupera TUTTI i ProjectID che usano questa BOM
                let projectIds = [];
                if (bomId && !isNaN(bomId) && bomId > 0) {
                    try {
                        const sql = require('mssql');
                        const config = require('../config');
                        const pool = await sql.connect(config.database);
                        
                        const bomInfo = await pool.request()
                            .input('CompanyId', sql.Int, companyId)
                            .input('BOMId', sql.BigInt, bomId)
                            .query(`
                                SELECT bom.ItemId, bom.MainRefBOMId
                                FROM dbo.MA_ProjectArticles_BillOfMaterials bom
                                WHERE bom.CompanyId = @CompanyId AND bom.Id = @BOMId
                            `);
                        
                        if (bomInfo.recordset.length > 0) {
                            const mainRefBOMId = bomInfo.recordset[0].MainRefBOMId;
                            const itemId = bomInfo.recordset[0].ItemId;
                            
                            if (mainRefBOMId) {
                                // BOM condivisa
                                const allBOMs = await pool.request()
                                    .input('CompanyId', sql.Int, companyId)
                                    .input('MainRefBOMId', sql.BigInt, mainRefBOMId)
                                    .query(`
                                        SELECT DISTINCT bom.ItemId
                                        FROM dbo.MA_ProjectArticles_BillOfMaterials bom
                                        WHERE bom.CompanyId = @CompanyId 
                                          AND (bom.MainRefBOMId = @MainRefBOMId OR bom.Id = @MainRefBOMId)
                                    `);
                                
                                const itemIds = allBOMs.recordset.map(r => r.ItemId).filter(Boolean);
                                if (itemIds.length > 0) {
                                    const itemIdsStr = itemIds.join(',');
                                    const projectsResult = await pool.request()
                                        .query(`
                                            SELECT DISTINCT pi.ProjectID
                                            FROM dbo.MA_ProjectsItems pi
                                            WHERE pi.CompanyId = ${companyId}
                                              AND pi.ItemId IN (${itemIdsStr})
                                        `);
                                    projectIds = projectsResult.recordset.map(r => r.ProjectID).filter(Boolean);
                                }
                            } else if (itemId) {
                                // BOM non condivisa
                                const projectInfo = await pool.request()
                                    .input('CompanyId', sql.Int, companyId)
                                    .input('ItemId', sql.BigInt, itemId)
                                    .query(`
                                        SELECT DISTINCT pi.ProjectID
                                        FROM dbo.MA_ProjectsItems pi
                                        WHERE pi.CompanyId = @CompanyId AND pi.ItemId = @ItemId
                                    `);
                                projectIds = projectInfo.recordset.map(r => r.ProjectID).filter(Boolean);
                            }
                        }
                    } catch (err) {
                        console.error('Errore nel recupero progetti per logging ADD_COMPONENT:', err);
                    }
                }
                
                const projectsToLog = projectIds.length > 0 ? projectIds : [null];
                
                for (const projectId of projectsToLog) {
                    await logActivity({
                        companyId,
                        projectId: projectId,
                        userId,
                        activityType: 'BOM_COMPONENT_ADD',
                        entityType: 'BOMComponent',
                        entityId: createdComponentId,
                        entityCode: createdComponentCode,
                        action: 'CREATE',
                        description: `Aggiunto componente temporaneo ${createdComponentCode} alla BOM ${bomId}`,
                        oldValues: null,
                        newValues: {
                            ComponentCode: createdComponentCode,
                            ComponentId: createdComponentId,
                            ComponentDescription: processedData.ComponentDescription,
                            Quantity: processedData.Quantity,
                            UoM: processedData.ComponentUoM || processedData.UoM,
                            Nature: processedData.ComponentNatureValue || processedData.Nature,
                            ComponentLine: componentLine
                        },
                        metadata: {
                            BOMId: bomId,
                            ComponentId: createdComponentId,
                            ComponentCode: createdComponentCode,
                            ComponentLine: componentLine,
                            Quantity: processedData.Quantity,
                            action: 'ADD_COMPONENT',
                            CreateTempComponent: true,
                            affectedProjectsCount: projectIds.length > 0 ? projectIds.length : 0
                        },
                        ...requestInfo
                    }).catch(err => {
                        console.error('Errore nel logging attività ADD_COMPONENT:', err);
                    });
                }
            }
            
            return res.json(result);
        }
        
        // Gestione dei casi speciali
        if (action === 'COPY_FROM_ITEM') {
            // Copiare la distinta base da un articolo a un altro
            const { targetItemId, sourceItemId, sourceType } = bomData;
            
            if (!targetItemId) {
                return res.status(400).json({
                    success: 0,
                    msg: 'Articolo destinazione richiesto'
                });
            }
            
            const result = await copyBOMFromItem(
                companyId, 
                targetItemId, 
                sourceItemId || null, 
                sourceType || 'temporary',
                userId
            );
            
            return res.json(result);
        } 
        else {
            // Per DELETE_COMPONENT, recupera i dati del componente PRIMA dell'eliminazione
            let deletedComponentData = null;
            if (action === 'DELETE_COMPONENT' && bomData.Id && bomData.Line) {
                try {
                    const sql = require('mssql');
                    const config = require('../config');
                    const pool = await sql.connect(config.database);
                    // Converti Id a numero se è stringa
                    const bomIdNum = parseInt(bomData.Id);
                    const lineNum = parseInt(bomData.Line);
                    const compInfo = await pool.request()
                        .input('CompanyId', sql.Int, companyId)
                        .input('BOMId', sql.BigInt, bomIdNum)
                        .input('Line', sql.Int, lineNum)
                        .query(`
                            SELECT c.Quantity, c.UnitCost, c.FixedCost, c.UoM, c.ComponentId, i.Item, i.Description
                            FROM dbo.MA_ProjectArticles_BOMComponents c
                            LEFT JOIN dbo.MA_ProjectArticles_Items i ON c.ComponentId = i.Id AND c.CompanyId = i.CompanyId
                            WHERE c.CompanyId = @CompanyId AND c.BOMId = @BOMId AND c.Line = @Line
                        `);
                    if (compInfo.recordset.length > 0) {
                        deletedComponentData = {
                            ComponentCode: compInfo.recordset[0].Item,
                            ComponentDescription: compInfo.recordset[0].Description,
                            ComponentId: compInfo.recordset[0].ComponentId,
                            Quantity: compInfo.recordset[0].Quantity,
                            UnitCost: compInfo.recordset[0].UnitCost,
                            FixedCost: compInfo.recordset[0].FixedCost,
                            UoM: compInfo.recordset[0].UoM
                        };
                    }
                } catch (err) {
                    console.warn('Errore nel recupero dati componente prima eliminazione:', err);
                }
            }
            
            // Per tutte le altre azioni, usiamo la funzione standard
            const result = await addUpdateBOM(action, companyId, bomData, userId);
            
            // LOGGING: Traccia l'operazione BOM
            if (result.success) {
                const requestInfo = getRequestInfo(req);
                // Determina activityType e action in base all'azione
                let activityType, actionType, description;
                // Converti Id a numero se è stringa - IMPORTANTE: usa parseInt per convertire stringhe
                let bomId = null;
                if (bomData.Id) {
                    bomId = typeof bomData.Id === 'string' ? parseInt(bomData.Id, 10) : bomData.Id;
                } else if (result.bomId) {
                    bomId = typeof result.bomId === 'string' ? parseInt(result.bomId, 10) : result.bomId;
                }
                
                // Se bomId è ancora null o NaN, non possiamo loggare
                if (!bomId || isNaN(bomId)) {
                    console.error('[LOG ERROR] bomId non valido per logging:', {
                        action,
                        bomDataId: bomData.Id,
                        resultBomId: result.bomId,
                        bomId
                    });
                    // Logga comunque senza bomId specifico
                    bomId = 0; // Usa 0 come fallback per evitare errori SQL
                }
                
                // Debug logging
                console.log('[LOG DEBUG] BOM Operation:', {
                    action,
                    bomId,
                    bomDataId: bomData.Id,
                    resultBomId: result.bomId,
                    resultSuccess: result.success,
                    companyId,
                    userId
                });
                
                if (action === 'ADD') {
                    activityType = 'BOM_CREATE';
                    actionType = 'CREATE';
                    description = `Creata distinta base ${bomData.BOM || bomId}`;
                } else if (action === 'UPDATE') {
                    activityType = 'BOM_UPDATE';
                    actionType = 'UPDATE';
                    description = `Modificata distinta base ${bomData.BOM || bomId}`;
                } else if (action === 'ADD_COMPONENT') {
                    activityType = 'BOM_COMPONENT_ADD';
                    actionType = 'CREATE';
                    const componentInfo = bomData.ComponentCode || bomData.ComponentId || 'nuovo';
                    description = `Aggiunto componente ${componentInfo} alla BOM ${bomId}`;
                } else if (action === 'UPDATE_COMPONENT') {
                    activityType = 'BOM_COMPONENT_UPDATE';
                    actionType = 'UPDATE';
                    description = `Modificato componente nella BOM ${bomId}`;
                } else if (action === 'DELETE_COMPONENT') {
                    activityType = 'BOM_COMPONENT_DELETE';
                    actionType = 'DELETE';
                    // Usa i dati recuperati prima dell'eliminazione
                    const compCode = deletedComponentData?.ComponentCode || bomData.ComponentCode || bomData.ComponentId || `linea ${bomData.Line || bomData.ComponentLine}`;
                    description = `Rimosso componente ${compCode} dalla BOM ${bomId}`;
                } else if (action === 'REPLACE_COMPONENT') {
                    activityType = 'BOM_COMPONENT_REPLACE';
                    actionType = 'UPDATE';
                    description = `Sostituito componente nella BOM ${bomId}`;
                } else {
                    activityType = 'BOM_UPDATE';
                    actionType = 'UPDATE';
                    description = `Operazione ${action} sulla BOM ${bomId}`;
                }
                
                // Recupera TUTTI i ProjectID che usano questa BOM
                // Se la BOM ha MainRefBOMId, trova tutte le BOM con lo stesso MainRefBOMId
                // e logga su tutti i progetti che le usano
                let projectIds = [];
                if (bomId && !isNaN(bomId) && bomId > 0) {
                    try {
                        const sql = require('mssql');
                        const config = require('../config');
                        const pool = await sql.connect(config.database);
                        
                        // Prima recupera MainRefBOMId della BOM corrente
                        const bomInfo = await pool.request()
                            .input('CompanyId', sql.Int, companyId)
                            .input('BOMId', sql.BigInt, bomId)
                            .query(`
                                SELECT bom.ItemId, bom.MainRefBOMId
                                FROM dbo.MA_ProjectArticles_BillOfMaterials bom
                                WHERE bom.CompanyId = @CompanyId AND bom.Id = @BOMId
                            `);
                        
                        if (bomInfo.recordset.length > 0) {
                            const mainRefBOMId = bomInfo.recordset[0].MainRefBOMId;
                            const itemId = bomInfo.recordset[0].ItemId;
                            
                            if (mainRefBOMId) {
                                // BOM condivisa: trova tutte le BOM con lo stesso MainRefBOMId
                                const allBOMs = await pool.request()
                                    .input('CompanyId', sql.Int, companyId)
                                    .input('MainRefBOMId', sql.BigInt, mainRefBOMId)
                                    .query(`
                                        SELECT DISTINCT bom.ItemId
                                        FROM dbo.MA_ProjectArticles_BillOfMaterials bom
                                        WHERE bom.CompanyId = @CompanyId 
                                          AND (bom.MainRefBOMId = @MainRefBOMId OR bom.Id = @MainRefBOMId)
                                    `);
                                
                                const itemIds = allBOMs.recordset.map(r => r.ItemId).filter(Boolean);
                                if (itemIds.length > 0) {
                                    // Costruisci query con IN clause usando valori letterali (sicuro perché sono BigInt dal DB)
                                    const itemIdsStr = itemIds.join(',');
                                    const projectsResult = await pool.request()
                                        .query(`
                                            SELECT DISTINCT pi.ProjectID
                                            FROM dbo.MA_ProjectsItems pi
                                            WHERE pi.CompanyId = ${companyId}
                                              AND pi.ItemId IN (${itemIdsStr})
                                        `);
                                    
                                    projectIds = projectsResult.recordset.map(r => r.ProjectID).filter(Boolean);
                                }
                            } else if (itemId) {
                                // BOM non condivisa: recupera solo il progetto dell'articolo corrente
                                const projectInfo = await pool.request()
                                    .input('CompanyId', sql.Int, companyId)
                                    .input('ItemId', sql.BigInt, itemId)
                                    .query(`
                                        SELECT DISTINCT pi.ProjectID
                                        FROM dbo.MA_ProjectsItems pi
                                        WHERE pi.CompanyId = @CompanyId AND pi.ItemId = @ItemId
                                    `);
                                projectIds = projectInfo.recordset.map(r => r.ProjectID).filter(Boolean);
                            }
                        }
                    } catch (err) {
                        console.error('Errore nel recupero progetti per logging:', err);
                        console.error('Stack:', err.stack);
                    }
                } else {
                    console.warn('[LOG WARNING] bomId non valido per recupero progetti:', bomId);
                }
                
                // Prepara oldValues e newValues per UPDATE_COMPONENT e DELETE_COMPONENT
                let oldValues = null;
                let newValues = null;
                if (action === 'DELETE_COMPONENT' && deletedComponentData) {
                    // Per DELETE_COMPONENT, oldValues contiene i dati del componente eliminato
                    oldValues = {
                        ComponentCode: deletedComponentData.ComponentCode,
                        ComponentDescription: deletedComponentData.ComponentDescription,
                        ComponentId: deletedComponentData.ComponentId,
                        Quantity: deletedComponentData.Quantity,
                        UnitCost: deletedComponentData.UnitCost,
                        FixedCost: deletedComponentData.FixedCost,
                        UoM: deletedComponentData.UoM,
                        ComponentLine: bomData.Line || bomData.ComponentLine
                    };
                    newValues = null; // Nessun nuovo valore per DELETE
                } else if (action === 'UPDATE_COMPONENT') {
                    // Recupera valori precedenti per tracciare le modifiche
                    if (bomId && bomData.ComponentLine) {
                        try {
                            const sql = require('mssql');
                            const config = require('../config');
                            const pool = await sql.connect(config.database);
                            const oldComp = await pool.request()
                                .input('CompanyId', sql.Int, companyId)
                                .input('BOMId', sql.BigInt, bomId)
                                .input('Line', sql.Int, bomData.ComponentLine)
                                .query(`
                                    SELECT c.Quantity, c.UnitCost, c.FixedCost, c.UoM, c.ComponentId, i.Item
                                    FROM dbo.MA_ProjectArticles_BOMComponents c
                                    LEFT JOIN dbo.MA_ProjectArticles_Items i ON c.ComponentId = i.Id AND c.CompanyId = i.CompanyId
                                    WHERE c.CompanyId = @CompanyId AND c.BOMId = @BOMId AND c.Line = @Line
                                `);
                            if (oldComp.recordset.length > 0) {
                                oldValues = {
                                    Quantity: oldComp.recordset[0].Quantity,
                                    UnitCost: oldComp.recordset[0].UnitCost,
                                    FixedCost: oldComp.recordset[0].FixedCost,
                                    UoM: oldComp.recordset[0].UoM,
                                    ComponentCode: oldComp.recordset[0].Item
                                };
                                // Migliora la descrizione con i dettagli della modifica
                                const oldQty = oldComp.recordset[0].Quantity;
                                const newQty = bomData.ComponentQuantity;
                                const componentCode = oldComp.recordset[0].Item || bomData.ComponentCode;
                                if (newQty !== undefined && oldQty !== null && newQty !== oldQty) {
                                    description = `Modificata quantità componente ${componentCode} nella BOM ${bomId}: ${oldQty} → ${newQty}`;
                                } else {
                                    description = `Modificato componente ${componentCode} nella BOM ${bomId}`;
                                }
                            }
                        } catch (err) {
                            // Ignora errori
                        }
                    }
                    newValues = {
                        Quantity: bomData.ComponentQuantity,
                        UnitCost: bomData.UnitCost,
                        FixedCost: bomData.FixedCost,
                        UoM: bomData.UoM,
                        ComponentCode: bomData.ComponentCode
                    };
                } else {
                    newValues = {
                        BOM: bomData.BOM,
                        Description: bomData.Description,
                        Version: bomData.Version,
                        ProductionLot: bomData.ProductionLot
                    };
                }
                
                // Determina entityId e entityCode in base all'azione
                let entityId, entityCode;
                if (action === 'DELETE_COMPONENT' && deletedComponentData) {
                    entityId = deletedComponentData.ComponentId;
                    entityCode = deletedComponentData.ComponentCode;
                } else if (action.includes('COMPONENT')) {
                    entityId = bomData.ComponentId;
                    entityCode = bomData.ComponentCode;
                } else {
                    entityId = bomId;
                    entityCode = bomData.BOM;
                }
                
                // Logga su tutti i progetti che usano questa BOM
                // Se non ci sono progetti, logga comunque con projectId = null
                const projectsToLog = projectIds.length > 0 ? projectIds : [null];
                
                console.log('[LOG DEBUG] About to log:', {
                    action,
                    activityType,
                    bomId,
                    entityId,
                    entityCode,
                    projectsToLog,
                    projectIdsCount: projectIds.length
                });
                
                for (const projectId of projectsToLog) {
                    const logResult = await logActivity({
                        companyId,
                        projectId: projectId,
                        userId,
                        activityType,
                        entityType: action.includes('COMPONENT') ? 'BOMComponent' : 'BOM',
                        entityId: entityId,
                        entityCode: entityCode,
                        action: actionType,
                        description,
                        oldValues: oldValues,
                        newValues: newValues,
                        metadata: {
                            BOMId: bomId,
                            ComponentId: deletedComponentData?.ComponentId || bomData.ComponentId,
                            ComponentCode: deletedComponentData?.ComponentCode || bomData.ComponentCode,
                            ComponentLine: bomData.Line || bomData.ComponentLine,
                            Quantity: deletedComponentData?.Quantity || bomData.ComponentQuantity || bomData.Quantity,
                            action: action,
                            affectedProjectsCount: projectIds.length > 0 ? projectIds.length : 0
                        },
                        ...requestInfo
                    }).catch(err => {
                        console.error('Errore nel logging attività BOM:', err);
                        console.error('Dettagli errore:', {
                            message: err.message,
                            stack: err.stack,
                            logData: {
                                companyId,
                                projectId,
                                userId,
                                activityType,
                                entityType: action.includes('COMPONENT') ? 'BOMComponent' : 'BOM',
                                entityId,
                                entityCode,
                                action: actionType
                            }
                        });
                        return { success: false, error: err.message };
                    });
                    
                    console.log('[LOG DEBUG] Log result:', logResult);
                }
            }
            
            res.json(result);
        }
    } catch (err) {
        console.error(`Error in BOM operation:`, err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Ottieni dati distinta base
router.get('/projectArticles/boms/:id', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const bomId = parseInt(req.params.id);
        const action = req.query.action || 'GET_BOM_FULL';

        // Opzioni aggiuntive
        const options = {};
        if (req.query.maxLevel) options.MaxLevel = parseInt(req.query.maxLevel);
        if (req.query.includeDisabled) options.IncludeDisabled = req.query.includeDisabled === 'true';
        if (req.query.expandPhantoms) options.ExpandPhantoms = req.query.expandPhantoms === 'true';
        if (req.query.includeRouting) options.IncludeRouting = req.query.includeRouting === 'true';
        
        const result = await getBOMData(action, companyId, bomId, null, null, options);
        res.json(result);
    } catch (err) {
        console.error(`Error fetching BOM data:`, err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Ottieni distinta base per ItemId
router.get('/projectArticles/boms/item/:itemId', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const itemId = parseInt(req.params.itemId);
        const version = req.query.version ? parseInt(req.query.version) : null;
        const action = req.query.action || 'GET_BOM_FULL';

        // Opzioni aggiuntive
        const options = {};
        if (req.query.maxLevel) options.MaxLevel = parseInt(req.query.maxLevel);
        if (req.query.includeDisabled) options.IncludeDisabled = req.query.includeDisabled === 'true';
        if (req.query.expandPhantoms) options.ExpandPhantoms = req.query.expandPhantoms === 'true';
        if (req.query.includeRouting) options.IncludeRouting = req.query.includeRouting === 'true';
        
        const result = await getBOMData(action, companyId, null, itemId, version, options);
        res.json(result);
    } catch (err) {
        console.error(`Error fetching BOM data by itemId:`, err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Ottieni distinte dal gestionale ERP (Mago)
router.get('/projectArticles/erp-boms', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const search = req.query.search || '';
        
        // Parametri di paginazione
        const pagination = {
            page: parseInt(req.query.page) || 1,
            pageSize: parseInt(req.query.pageSize) || 50
        };
        
        // Filtro per natura (opzionale)
        let natureFilter = null;
        if (req.query.nature) {
            const natureValue = parseInt(req.query.nature);
            if (!isNaN(natureValue)) {
                natureFilter = natureValue;
            }
        }
        
        const result = await getERPBOMs(companyId, search, pagination, natureFilter);
        res.json(result);
    } catch (err) {
        console.error(`Error fetching ERP BOMs:`, err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Ottieni BOM e Item unificati dal gestionale ERP (Mago)
router.get('/projectArticles/erp-items-and-boms', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const search = req.query.search || '';
        
        // Parametri di paginazione
        const pagination = {
            page: parseInt(req.query.page) || 1,
            pageSize: parseInt(req.query.pageSize) || 50
        };
        
        // Filtro per natura (opzionale)
        let natureFilter = null;
        if (req.query.nature) {
            const natureValue = parseInt(req.query.nature);
            if (!isNaN(natureValue)) {
                natureFilter = natureValue;
            }
        }
        
        // Filtro per tipo (all, bom, item)
        const typeFilter = req.query.type || 'all';
        
        const result = await getERPItemsAndBOMs(companyId, search, pagination, natureFilter, typeFilter);
        res.json(result);
    } catch (err) {
        console.error(`Error fetching ERP items and BOMs:`, err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Ottieni BOM e Item unificati dai progetti
router.get('/projectArticles/project-items-and-boms', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const projectId = parseInt(req.query.projectId);
        const search = req.query.search || '';
        
        if (!projectId || isNaN(projectId)) {
            return res.status(400).json({ success: 0, msg: 'ProjectId richiesto e valido' });
        }
        
        // Parametri di paginazione
        const pagination = {
            page: parseInt(req.query.page) || 1,
            pageSize: parseInt(req.query.pageSize) || 50
        };
        
        // Filtro per natura (opzionale)
        let natureFilter = null;
        if (req.query.nature) {
            const natureValue = parseInt(req.query.nature);
            if (!isNaN(natureValue)) {
                natureFilter = natureValue;
            }
        }
        
        // Filtro per tipo (all, bom, item)
        const typeFilter = req.query.type || 'all';
        
        const result = await getProjectItemsAndBOMs(companyId, projectId, search, pagination, natureFilter, typeFilter);
        res.json(result);
    } catch (err) {
        console.error(`Error fetching project items and BOMs:`, err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Ottieni distinte di riferimento
router.get('/projectArticles/reference-boms', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        
        // Parametri di filtro
        const filters = {
            category: req.query.category || '',
            search: req.query.search || '',
            nature: req.query.nature ? parseInt(req.query.nature) : null,
            onlyAvailable: req.query.onlyAvailable === 'true'
        };
        
        // Parametri di paginazione
        const pagination = {
            page: parseInt(req.query.page) || 1,
            pageSize: parseInt(req.query.pageSize) || 50
        };
        
        const result = await getReferenceBOMs(companyId, filters, pagination);
        res.json(result);
    } catch (err) {
        console.error(`Error fetching reference BOMs:`, err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Riordina componenti distinta base
router.post('/projectArticles/boms/:id/reorder', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const bomId = parseInt(req.params.id);
        const { components } = req.body;
        
        if (!components || !Array.isArray(components)) {
            return res.status(400).json({
                success: 0,
                msg: 'Dati componenti mancanti o non validi'
            });
        }
        
        // Verifica che tutti i componenti abbiano Line e NewOrder
        const isValid = components.every(comp => 
            typeof comp.Line === 'number' && 
            typeof comp.NewOrder === 'number');
            
        if (!isValid) {
            return res.status(400).json({
                success: 0,
                msg: 'I componenti devono avere Line e NewOrder validi'
            });
        }
        
        // Usa la funzione corretta per il riordinamento
        const result = await reorderBOMComponents(companyId, bomId, components, userId);
        
        res.json(result);
    } catch (err) {
        console.error(`Error reordering components:`, err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Aggiorna flag CheckOperation per un ciclo
router.post('/projectArticles/boms/:id/routing/:rtgStep/check', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        let bomId = parseInt(req.params.id);
        const rtgStep = parseInt(req.params.rtgStep);
        const { checkOperation, ItemId, ComponentId } = req.body;

        if (isNaN(rtgStep)) {
            return res.status(400).json({
                success: 0,
                msg: 'Parametro rtgStep non valido'
            });
        }

        if (checkOperation === undefined) {
            return res.status(400).json({
                success: 0,
                msg: 'Valore checkOperation mancante'
            });
        }

        // FIX: Se bomId = 0, cerca la BOM per ItemId o ComponentId
        if ((!bomId || bomId === 0) && (ItemId || ComponentId)) {
            const targetItemId = ItemId || ComponentId;
            try {
                const sql = require('mssql');
                const config = require('../config');
                const pool = await sql.connect(config.database);
                
                const bomCheck = await pool.request()
                    .input('CompanyId', sql.Int, companyId)
                    .input('ItemId', sql.BigInt, targetItemId)
                    .query(`
                        SELECT TOP 1 Id
                        FROM dbo.MA_ProjectArticles_BillOfMaterials
                        WHERE CompanyId = @CompanyId AND ItemId = @ItemId
                        ORDER BY TBCreated DESC
                    `);
                
                if (bomCheck.recordset.length > 0) {
                    bomId = bomCheck.recordset[0].Id;
                    console.log(`[DEBUG] BOM trovata per ItemId ${targetItemId}: ${bomId}`);
                } else {
                    return res.status(404).json({
                        success: 0,
                        msg: `BOM non trovata per ItemId/ComponentId ${targetItemId}`
                    });
                }
            } catch (err) {
                console.error('Errore nel recupero BOM per ItemId/ComponentId:', err);
                return res.status(500).json({
                    success: 0,
                    msg: 'Errore nel recupero BOM'
                });
            }
        }

        if (isNaN(bomId) || bomId === 0) {
            return res.status(400).json({
                success: 0,
                msg: 'Parametro bomId non valido'
            });
        }

        const normalizedValue = parseInt(checkOperation, 10) === 1 ? 1 : 0;

        const result = await updateRoutingCheckOperation(
            companyId,
            bomId,
            rtgStep,
            normalizedValue,
            userId
        );

        if (result.success === 0) {
            return res.status(400).json(result);
        }

        // LOGGING: Traccia modifica operazione routing
        if (result.success === 1) {
            const requestInfo = getRequestInfo(req);
            // Recupera ProjectID dalla BOM
            let projectId = null;
            try {
                const sql = require('mssql');
                const config = require('../config');
                const pool = await sql.connect(config.database);
                const bomInfo = await pool.request()
                    .input('CompanyId', sql.Int, companyId)
                    .input('BOMId', sql.BigInt, bomId)
                    .query(`
                        SELECT bom.ItemId, pi.ProjectID
                        FROM dbo.MA_ProjectArticles_BillOfMaterials bom
                        LEFT JOIN dbo.MA_ProjectsItems pi ON bom.ItemId = pi.ItemId AND bom.CompanyId = pi.CompanyId
                        WHERE bom.CompanyId = @CompanyId AND bom.Id = @BOMId
                    `);
                if (bomInfo.recordset.length > 0) {
                    projectId = bomInfo.recordset[0].ProjectID;
                }
            } catch (err) {
                // Ignora errori
            }
            
            await logActivity({
                companyId,
                projectId,
                userId,
                activityType: 'BOM_ROUTING_UPDATE',
                entityType: 'BOMRouting',
                entityId: rtgStep,
                action: 'UPDATE',
                description: `${normalizedValue === 1 ? 'Abilitata' : 'Disabilitata'} operazione di controllo per ciclo ${rtgStep} nella BOM ${bomId}`,
                oldValues: {
                    checkOperation: normalizedValue === 1 ? 0 : 1
                },
                newValues: {
                    checkOperation: normalizedValue
                },
                metadata: {
                    BOMId: bomId,
                    rtgStep: rtgStep,
                    checkOperation: normalizedValue
                },
                ...requestInfo
            }).catch(err => {
                console.warn('Errore nel logging attività modifica routing:', err);
            });
        }

        res.json({
            success: 1,
            updated: result.updated,
            checkOperation: normalizedValue
        });
    } catch (err) {
        console.error(`Error updating routing check flag:`, err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Gestisci riferimenti intercompany
router.post('/projectArticles/references', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.UserId;
        const { action, referenceData } = req.body;
        
        // Validazione input
        if (!action || !['ADD', 'UPDATE', 'DELETE', 'GET'].includes(action)) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'Azione non valida. Utilizzare ADD, UPDATE, DELETE o GET.' 
            });
        }
        
        if (!referenceData) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'Dati riferimento mancanti'
            });
        }
        
        const result = await manageReferences(action, referenceData, userId);
        res.json(result);
    } catch (err) {
        console.error(`Error in references operation:`, err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Ottieni riferimenti per un articolo
router.get('/projectArticles/references/item/:companyId/:itemId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.UserId;
        const sourceCompanyId = parseInt(req.params.companyId);
        const sourceItemId = parseInt(req.params.itemId);
        
        const referenceData = {
            SourceCompanyId: sourceCompanyId,
            SourceProjectItemId: sourceItemId
        };
        
        const result = await manageReferences('GET', referenceData, userId);
        res.json(result);
    } catch (err) {
        console.error(`Error fetching item references:`, err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Ottiene gli articoli temporanei disponibili (esclusi quelli già associati al progetto)
router.get('/projectArticles/items/available', authenticateToken, async (req, res) => {
    try {
      const companyId = req.user.CompanyId;
      const projectId = parseInt(req.query.projectId);
      
      if (!projectId || isNaN(projectId)) {
        return res.status(400).json({ 
          success: 0, 
          msg: 'ProjectId non valido o mancante' 
        });
      }
      
      const result = await getAvailableItems(companyId, projectId);
      res.json(result);
    } catch (err) {
      console.error('Error fetching available items:', err);
      res.status(500).json({ success: 0, msg: err.message });
    }
  });

// Ottiene gli articoli dal gestionale
router.get('/projectArticles/erp-items', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const search = req.query.search || '';
        
        const result = await getERPItems(companyId, search);
        res.json(result);
    } catch (err) {
        console.error('Error fetching ERP items:', err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Importa un articolo dal gestionale come articolo temporaneo e lo associa al progetto
router.post('/projectArticles/items/import', authenticateToken, async (req, res) => {
    try {
        const { action, projectId, erpItem, importBOM, processMultilevelBOM, maxLevels } = req.body;
        const userId = req.user.UserId;
        const companyId = req.user.CompanyId;
        
        // Validazione input
        if (!action || action !== 'IMPORT') {
            return res.status(400).json({ 
                success: 0, 
                msg: 'Azione non valida. Utilizzare IMPORT.' 
            });
        }
        
        if (!projectId) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'ProjectId richiesto'
            });
        }
        
        if (!erpItem) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'erpItem richiesto'
            });
        }
        
        // Importa l'articolo utilizzando la nuova stored procedure
        const result = await importERPItem(
            companyId, 
            userId, 
            projectId, 
            erpItem, 
            importBOM === true, 
            processMultilevelBOM !== false,
            maxLevels || 10
        );
        
        // LOGGING: Traccia l'importazione
        if (result.success) {
            const requestInfo = getRequestInfo(req);
            await logActivity({
                companyId,
                projectId,
                userId,
                activityType: 'ITEM_IMPORT',
                entityType: 'Item',
                entityId: result.itemId || null,
                entityCode: erpItem?.Item || null,
                action: 'IMPORT',
                description: `Importato articolo ${erpItem?.Item || erpItem?.Description || 'da ERP'}${importBOM ? ' con BOM' : ''}`,
                metadata: {
                    erpItemCode: erpItem?.Item,
                    importBOM: importBOM === true,
                    processMultilevelBOM: processMultilevelBOM !== false,
                    maxLevels: maxLevels || 10,
                    itemId: result.itemId
                },
                ...requestInfo
            }).catch(err => {
                console.warn('Errore nel logging attività import articolo:', err);
            });
        }
        
        res.json(result);
    } catch (err) {
        console.error('Error importing item:', err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Associa un articolo temporaneo esistente a un progetto
router.post('/projectArticles/items/link', authenticateToken, async (req, res) => {
    try {
        const { action, projectId, itemId, importBOM } = req.body;
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        
        // Validazione input
        if (!action || action !== 'LINK') {
            return res.status(400).json({ 
                success: 0, 
                msg: 'Azione non valida. Utilizzare LINK.' 
            });
        }
        
        if (!projectId) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'ProjectId richiesto'
            });
        }
        
        if (!itemId) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'ItemId richiesto'
            });
        }
        
        // Associa l'articolo al progetto
        const result = await linkItemToProject(companyId, projectId, itemId);
        
        // LOGGING: Traccia il collegamento articolo a progetto
        if (result.success) {
            const requestInfo = getRequestInfo(req);
            await logActivity({
                companyId,
                projectId,
                userId,
                activityType: 'ITEM_LINK_PROJECT',
                entityType: 'Item',
                entityId: itemId,
                action: 'LINK',
                description: `Collegato articolo ${itemId} al progetto ${projectId}${importBOM ? ' con importazione BOM' : ''}`,
                metadata: {
                    itemId: itemId,
                    projectId: projectId,
                    importBOM: importBOM === true
                },
                ...requestInfo
            }).catch(err => {
                console.warn('Errore nel logging attività link articolo:', err);
            });
        }
        
        // Se l'associazione è avvenuta con successo e si richiede anche l'importazione della distinta base
        if (result.success && importBOM) {
            try {
                // Importa anche la distinta base
                const bomResult = await copyBOMFromItem(
                    companyId,
                    itemId,
                    itemId, // Per articoli temporanei, l'articolo sorgente e destinazione coincidono
                    'temporary',
                    userId
                );
                
                // Restituisci insieme i risultati di entrambe le operazioni
                return res.json({
                    success: result.success,
                    bomId: bomResult.success ? bomResult.bomId : null,
                    bomSuccess: bomResult.success,
                    bomMessage: bomResult.msg,
                    msg: result.msg + (bomResult.success ? `. ${bomResult.msg}` : '')
                });
            } catch (bomErr) {
                // In caso di errore nell'importazione della distinta, restituisci comunque i dati dell'articolo
                console.error('Error importing BOM during item link:', bomErr);
                return res.json({
                    success: result.success,
                    bomSuccess: 0,
                    bomMessage: bomErr.message || 'Errore durante l\'importazione della distinta base',
                    msg: result.msg + '. Errore durante l\'importazione della distinta base.'
                });
            }
        } else {
            // Restituisci solo i risultati dell'associazione dell'articolo
            res.json(result);
        }
    } catch (err) {
        console.error('Error linking item to project:', err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Ottieni dettagli di un articolo di progetto
router.get('/projectArticles/items/:id', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const itemId = parseInt(req.params.id);
        
        // Add validation for itemId
        if (!itemId || isNaN(itemId)) {
            console.error('Invalid item ID:', req.params.id);
            return res.status(400).json({ 
                success: 0, 
                msg: 'ID articolo non valido' 
            });
        }
        
        const item = await getItemById(companyId, itemId);
        
        if (!item) {
            return res.status(404).json({ 
                success: 0, 
                msg: 'Articolo non trovato'
            });
        }
        
        return res.json(item);
    } catch (err) {
        console.error('Error fetching item details:', err);
        return res.status(500).json({ 
            success: 0, 
            msg: err.message || 'Errore nel recupero dei dettagli articolo'
        });
    }
});

// Sostituisci un componente con un componente esistente
router.post('/projectArticles/boms/:id/replaceComponent', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const bomId = parseInt(req.params.id);
        const { componentLine, newComponentId, newComponentCode } = req.body;
        
        if (!bomId || !componentLine) {
            return res.status(400).json({
                success: 0,
                msg: 'Parametri mancanti per la sostituzione del componente'
            });
        }
        
        // Converti esplicitamente a numeri
        const result = await replaceComponent(
            companyId, 
            bomId, 
            parseInt(componentLine), 
            parseInt(newComponentId), 
            newComponentCode,
            userId
        );
        
        // LOGGING: Traccia sostituzione componente
        if (result.success) {
            const requestInfo = getRequestInfo(req);
            // Recupera ProjectID dalla BOM
            let projectId = null;
            let oldComponentCode = null;
            try {
                const sql = require('mssql');
                const config = require('../config');
                const pool = await sql.connect(config.database);
                const bomInfo = await pool.request()
                    .input('CompanyId', sql.Int, companyId)
                    .input('BOMId', sql.BigInt, bomId)
                    .query(`
                        SELECT bom.ItemId, pi.ProjectID
                        FROM dbo.MA_ProjectArticles_BillOfMaterials bom
                        LEFT JOIN dbo.MA_ProjectsItems pi ON bom.ItemId = pi.ItemId AND bom.CompanyId = pi.CompanyId
                        WHERE bom.CompanyId = @CompanyId AND bom.Id = @BOMId
                    `);
                if (bomInfo.recordset.length > 0) {
                    projectId = bomInfo.recordset[0].ProjectID;
                }
                // Recupera codice componente vecchio
                const oldComp = await pool.request()
                    .input('CompanyId', sql.Int, companyId)
                    .input('BOMId', sql.BigInt, bomId)
                    .input('Line', sql.Int, parseInt(componentLine))
                    .query(`
                        SELECT c.ComponentId, i.Item
                        FROM dbo.MA_ProjectArticles_BOMComponents c
                        LEFT JOIN dbo.MA_ProjectArticles_Items i ON c.ComponentId = i.Id AND c.CompanyId = i.CompanyId
                        WHERE c.CompanyId = @CompanyId AND c.BOMId = @BOMId AND c.Line = @Line
                    `);
                if (oldComp.recordset.length > 0) {
                    oldComponentCode = oldComp.recordset[0].Item;
                }
            } catch (err) {
                // Ignora errori
            }
            
            await logActivity({
                companyId,
                projectId,
                userId,
                activityType: 'BOM_COMPONENT_REPLACE',
                entityType: 'BOMComponent',
                entityId: parseInt(newComponentId),
                entityCode: newComponentCode,
                action: 'UPDATE',
                description: `Sostituito componente linea ${componentLine} nella BOM ${bomId}: ${oldComponentCode || 'vecchio'} → ${newComponentCode || newComponentId}`,
                oldValues: {
                    componentLine: parseInt(componentLine),
                    oldComponentCode: oldComponentCode
                },
                newValues: {
                    componentLine: parseInt(componentLine),
                    newComponentId: parseInt(newComponentId),
                    newComponentCode: newComponentCode
                },
                metadata: {
                    BOMId: bomId,
                    componentLine: parseInt(componentLine),
                    oldComponentId: null,
                    newComponentId: parseInt(newComponentId)
                },
                ...requestInfo
            }).catch(err => {
                console.warn('Errore nel logging attività sostituzione componente:', err);
            });
        }
        
        res.json(result);
    } catch (err) {
        console.error('Error replacing component:', err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Sostituisci un componente con un nuovo componente temporaneo
router.post('/projectArticles/boms/:id/replaceWithNewComponent', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const bomId = parseInt(req.params.id);
        const { componentLine, newComponentData, createTempComponent } = req.body;
        
        if (!bomId || !componentLine) {
            return res.status(400).json({
                success: 0,
                msg: 'Parametri mancanti per la sostituzione con nuovo componente'
            });
        }
        
        // Prepara i dati per la chiamata
        const bomDataParams = { 
            Id: bomId,
            ComponentLine: parseInt(componentLine)
        };
        
        // Se abbiamo createTempComponent, lo gestiamo con il nuovo parametro
        if (createTempComponent) {
            bomDataParams.CreateTempComponent = true;
            
            if (newComponentData.tempComponentPrefix) {
                bomDataParams.TempComponentPrefix = newComponentData.tempComponentPrefix;
            }
        } else {
            // Altrimenti usiamo il comportamento standard
            if (!newComponentData) {
                return res.status(400).json({
                    success: 0,
                    msg: 'newComponentData richiesto'
                });
            }
            
            bomDataParams.NewCompItem = newComponentData.Item;
            bomDataParams.NewCompDescription = newComponentData.Description;
            bomDataParams.NewCompNature = newComponentData.Nature;
            bomDataParams.NewCompBaseUoM = newComponentData.BaseUoM;
        }
        
        // Aggiungi i parametri opzionali
        if (newComponentData.Quantity !== undefined) {
            bomDataParams.ComponentQuantity = newComponentData.Quantity;
        }
        
        if (newComponentData.CopyBOM !== undefined) {
            bomDataParams.CopyBOM = newComponentData.CopyBOM;
        }
        
        const result = await addUpdateBOM(
            'REPLACE_WITH_NEW_COMPONENT',
            companyId,
            bomDataParams,
            userId
        );
        
        // LOGGING: Traccia sostituzione con nuovo componente
        if (result.success) {
            const requestInfo = getRequestInfo(req);
            // Recupera ProjectID dalla BOM
            let projectId = null;
            let newItemCode = null;
            if (result.createdComponentCode) {
                newItemCode = result.createdComponentCode;
            } else if (newComponentData?.Item) {
                newItemCode = newComponentData.Item;
            }
            
            try {
                const sql = require('mssql');
                const config = require('../config');
                const pool = await sql.connect(config.database);
                const bomInfo = await pool.request()
                    .input('CompanyId', sql.Int, companyId)
                    .input('BOMId', sql.BigInt, bomId)
                    .query(`
                        SELECT bom.ItemId, pi.ProjectID
                        FROM dbo.MA_ProjectArticles_BillOfMaterials bom
                        LEFT JOIN dbo.MA_ProjectsItems pi ON bom.ItemId = pi.ItemId AND bom.CompanyId = pi.CompanyId
                        WHERE bom.CompanyId = @CompanyId AND bom.Id = @BOMId
                    `);
                if (bomInfo.recordset.length > 0) {
                    projectId = bomInfo.recordset[0].ProjectID;
                }
            } catch (err) {
                // Ignora errori
            }
            
            await logActivity({
                companyId,
                projectId,
                userId,
                activityType: 'BOM_COMPONENT_REPLACE',
                entityType: 'BOMComponent',
                entityId: result.newComponentId || null,
                entityCode: newItemCode,
                action: 'CREATE',
                description: `Sostituito componente linea ${componentLine} nella BOM ${bomId} con nuovo componente ${newItemCode || 'temporaneo'}`,
                newValues: {
                    componentLine: parseInt(componentLine),
                    newComponentCode: newItemCode,
                    newComponentDescription: newComponentData?.Description,
                    quantity: newComponentData?.Quantity
                },
                metadata: {
                    BOMId: bomId,
                    componentLine: parseInt(componentLine),
                    createTempComponent: createTempComponent === true,
                    newComponentId: result.newComponentId,
                    copyBOM: newComponentData?.CopyBOM
                },
                ...requestInfo
            }).catch(err => {
                console.warn('Errore nel logging attività sostituzione con nuovo componente:', err);
            });
        }
        
        res.json(result);
    } catch (err) {
        console.error('Error replacing with new component:', err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});


// Ottieni centri di lavoro
router.get('/projectArticles/routing/workcenters', authenticateToken, async (req, res) => {
    try {
      const companyId = req.user.CompanyId;
      const data = await getWorkCenters(companyId);
      res.json(data);
    } catch (err) {
      console.error('Error fetching work centers:', err);
      res.status(500).json({ success: 0, msg: err.message });
    }
  });
  
  // Ottieni operazioni
  router.get('/projectArticles/routing/operations', authenticateToken, async (req, res) => {
    try {
      const companyId = req.user.CompanyId;
      const data = await getOperations(companyId);
      res.json(data);
    } catch (err) {
      console.error('Error fetching operations:', err);
      res.status(500).json({ success: 0, msg: err.message });
    }
  });
  
  // Ottieni fornitori
  router.get('/projectArticles/routing/suppliers', authenticateToken, async (req, res) => {
    try {
      const companyId = req.user.CompanyId;
      const data = await getSuppliers(companyId);
      res.json(data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      res.status(500).json({ success: 0, msg: err.message });
    }
  });

// Ottieni tutte le versioni di una distinta base per un articolo
router.get('/projectArticles/boms/versions/:itemId', authenticateToken, async (req, res) => {
    try {
      const companyId = req.user.CompanyId;
      const itemId = parseInt(req.params.itemId);
      
      if (!itemId || isNaN(itemId)) {
        return res.status(400).json({ 
          success: 0, 
          msg: 'ID articolo non valido' 
        });
      }
      
      const result = await getBOMVersions(companyId, itemId);
      res.json(result);
    } catch (err) {
      console.error(`Error fetching BOM versions:`, err);
      res.status(500).json({ success: 0, msg: err.message });
    }
  });

  // Nuovo endpoint per il riordinamento batch dei cicli
router.post('/projectArticles/boms/:id/reorderRoutings', authenticateToken, async (req, res) => {
    try {
      const companyId = req.user.CompanyId;
      const userId = req.user.UserId;
      const bomId = parseInt(req.params.id);
      const { cycles } = req.body;
      
      if (!bomId || !Array.isArray(cycles) || cycles.length === 0) {
        return res.status(400).json({
          success: 0,
          msg: 'Parametri non validi per il riordinamento dei cicli'
        });
      }
      
      // Chiama una nuova funzione nel backend che gestisce l'intera operazione in una transazione
      const result = await reorderBOMRoutings(companyId, bomId, cycles, userId);
      
      // LOGGING: Traccia riordino cicli/routing
      if (result.success) {
        const requestInfo = getRequestInfo(req);
        // Recupera ProjectID dalla BOM
        let projectId = null;
        try {
          const sql = require('mssql');
          const config = require('../config');
          const pool = await sql.connect(config.database);
          const bomInfo = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('BOMId', sql.BigInt, bomId)
            .query(`
              SELECT bom.ItemId, pi.ProjectID
              FROM dbo.MA_ProjectArticles_BillOfMaterials bom
              LEFT JOIN dbo.MA_ProjectsItems pi ON bom.ItemId = pi.ItemId AND bom.CompanyId = pi.CompanyId
              WHERE bom.CompanyId = @CompanyId AND bom.Id = @BOMId
            `);
          if (bomInfo.recordset.length > 0) {
            projectId = bomInfo.recordset[0].ProjectID;
          }
        } catch (err) {
          // Ignora errori
        }
        
        await logActivity({
          companyId,
          projectId,
          userId,
          activityType: 'BOM_ROUTING_REORDER',
          entityType: 'BOM',
          entityId: bomId,
          action: 'UPDATE',
          description: `Riordinati ${cycles.length} cicli/routing nella BOM ${bomId}`,
          metadata: {
            BOMId: bomId,
            cyclesCount: cycles.length,
            cycles: cycles.map(c => ({ rtgStep: c.rtgStep, newSequence: c.sequence }))
          },
          ...requestInfo
        }).catch(err => {
          console.warn('Errore nel logging attività riordino routing:', err);
        });
      }
      
      res.json(result);
    } catch (err) {
      console.error('Error reordering routings:', err);
      res.status(500).json({ success: 0, msg: err.message });
    }
  });

// Ottieni unità di misura
router.get('/projectArticles/unitsOfMeasure', authenticateToken, async (req, res) => {
    try {
      const data = await getUnitsOfMeasure();
      res.json(data);
    } catch (err) {
      console.error('Error fetching units of measure:', err);
      res.status(500).json({ success: 0, msg: err.message });
    }
  });
  
  // Salva solo caratteristiche tecniche (senza ricodificare)
  router.put('/projectArticles/items/:itemId/technical-characteristics', authenticateToken, async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const { technicalCharacteristicsJSON } = req.body;
      const userId = req.user.UserId;
      const companyId = req.user.CompanyId;
      const requestInfo = getRequestInfo(req);
      
      if (!itemId || isNaN(itemId)) {
        return res.status(400).json({ 
          success: 0, 
          msg: 'ID articolo non valido' 
        });
      }

      // Recupera lo stato attuale per poter loggare in History (OldValues/NewValues)
      // NB: getItemById include già anche la lista dei progetti associati DIRETTAMENTE all'articolo (MA_ProjectsItems)
      const beforeItem = await getItemById(companyId, itemId);
      const beforeJsonRaw = beforeItem?.TechnicalCharacteristicsJSON || null;
      let beforeJsonObj = null;
      try {
        if (typeof beforeJsonRaw === 'string' && beforeJsonRaw.trim() !== '') {
          beforeJsonObj = JSON.parse(beforeJsonRaw);
        } else if (beforeJsonRaw && typeof beforeJsonRaw === 'object') {
          beforeJsonObj = beforeJsonRaw;
        }
      } catch (e) {
        // Non blocchiamo il salvataggio se il JSON precedente è corrotto
        beforeJsonObj = null;
      }

      // IMPORTANTE:
      // Se stiamo modificando un componente "interno" a una BOM, spesso NON è linkato direttamente a un progetto.
      // Però il progetto usa la BOM principale che contiene quel componente.
      // Quindi, oltre ai progetti linkati direttamente all'articolo, risaliamo la gerarchia BOM e troviamo
      // tutti i progetti che usano una qualsiasi BOM/assiemi padre (anche a più livelli).
      let projectsFromBomParents = [];
      try {
        const sql = require('mssql');
        const config = require('../config');
        const pool = await sql.connect(config.database);

        // Risale i padri (ItemId) tramite BOMComponents, fino a 10 livelli
        const parentProjectsResult = await pool.request()
          .input('CompanyId', sql.Int, companyId)
          .input('ItemId', sql.BigInt, itemId)
          .query(`
            ;WITH Parents AS (
              SELECT 
                bom.ItemId AS ParentItemId,
                bom.Id AS ParentBOMId,
                1 AS Lvl
              FROM dbo.MA_ProjectArticles_BOMComponents bc
              INNER JOIN dbo.MA_ProjectArticles_BillOfMaterials bom
                ON bom.CompanyId = bc.CompanyId AND bom.Id = bc.BOMId
              WHERE bc.CompanyId = @CompanyId
                AND bc.ComponentId = @ItemId

              UNION ALL

              SELECT 
                bom2.ItemId AS ParentItemId,
                bom2.Id AS ParentBOMId,
                p.Lvl + 1 AS Lvl
              FROM Parents p
              INNER JOIN dbo.MA_ProjectArticles_BOMComponents bc2
                ON bc2.CompanyId = @CompanyId AND bc2.ComponentId = p.ParentItemId
              INNER JOIN dbo.MA_ProjectArticles_BillOfMaterials bom2
                ON bom2.CompanyId = bc2.CompanyId AND bom2.Id = bc2.BOMId
              WHERE p.Lvl < 10
            )
            SELECT DISTINCT pi.ProjectID
            FROM dbo.MA_ProjectsItems pi
            INNER JOIN (SELECT DISTINCT ParentItemId FROM Parents) x
              ON x.ParentItemId = pi.ItemId
            WHERE pi.CompanyId = @CompanyId
          `);

        projectsFromBomParents = (parentProjectsResult.recordset || [])
          .map(r => r.ProjectID)
          .filter(Boolean);
      } catch (e) {
        // Se questa query fallisce, non blocchiamo: continueremo a loggare solo i progetti linkati direttamente
        console.warn('Impossibile determinare progetti da BOM parents per logging caratteristiche:', e?.message || e);
        projectsFromBomParents = [];
      }
      
      const result = await saveTechnicalCharacteristics(itemId, technicalCharacteristicsJSON, userId);

      // LOGGING: Traccia modifica caratteristiche tecniche nella History del progetto
      // Usiamo activityType = ITEM_UPDATE (già standard) e descrizione specifica.
      if (result?.success) {
        try {
          const afterItem = await getItemById(companyId, itemId);
          const afterJsonRaw = afterItem?.TechnicalCharacteristicsJSON || null;
          let afterJsonObj = null;
          try {
            if (typeof afterJsonRaw === 'string' && afterJsonRaw.trim() !== '') {
              afterJsonObj = JSON.parse(afterJsonRaw);
            } else if (afterJsonRaw && typeof afterJsonRaw === 'object') {
              afterJsonObj = afterJsonRaw;
            }
          } catch (e) {
            afterJsonObj = null;
          }

          // Calcola differenze (chiavi cambiate) per una descrizione più utile
          const oldObj = (beforeJsonObj && typeof beforeJsonObj === 'object') ? beforeJsonObj : {};
          const newObj = (afterJsonObj && typeof afterJsonObj === 'object') ? afterJsonObj : {};
          const keys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
          const changed = keys
            .map(k => {
              const oldVal = oldObj[k] ?? null;
              const newVal = newObj[k] ?? null;
              // Normalizza stringhe vuote a null
              const o = (typeof oldVal === 'string' && oldVal.trim() === '') ? null : oldVal;
              const n = (typeof newVal === 'string' && newVal.trim() === '') ? null : newVal;
              if (String(o ?? '') !== String(n ?? '')) return { key: k, oldVal: o, newVal: n };
              return null;
            })
            .filter(Boolean);

          const itemCode = afterItem?.Item || beforeItem?.Item || String(itemId);

          // Descrizione compatta: elenca max 5 cambi (il resto in metadata)
          const changesPreview = changed
            .slice(0, 5)
            .map(c => `${c.key}: ${c.oldVal ?? '∅'} → ${c.newVal ?? '∅'}`)
            .join(', ');

          const description = changed.length > 0
            ? `Aggiornate caratteristiche tecniche articolo ${itemCode}: ${changesPreview}${changed.length > 5 ? ` (+${changed.length - 5} altre)` : ''}`
            : `Salvate caratteristiche tecniche articolo ${itemCode}`;

          // Logga su tutti i progetti collegati all’articolo.
          // Se non ci sono progetti, logga comunque con projectId = null (log entità).
          const directProjectIds = Array.isArray(beforeItem?.projects)
            ? beforeItem.projects.map(p => p.ProjectID).filter(Boolean)
            : [];

          // Unione: progetti linkati direttamente + progetti che usano un qualsiasi padre BOM
          const allProjectIds = Array.from(new Set([...(directProjectIds || []), ...(projectsFromBomParents || [])]))
            .filter(Boolean);

          // Se non ci sono progetti, logga comunque con projectId = null (log entità)
          const projectsToLog = allProjectIds.length > 0 ? allProjectIds : [null];

          for (const projectId of projectsToLog) {
            await logActivity({
              companyId,
              projectId,
              userId,
              activityType: 'ITEM_UPDATE',
              entityType: 'Item',
              entityId: itemId,
              entityCode: itemCode,
              action: 'UPDATE',
              description,
              oldValues: {
                TechnicalCharacteristicsJSON: oldObj
              },
              newValues: {
                TechnicalCharacteristicsJSON: newObj
              },
              metadata: {
                kind: 'TECHNICAL_CHARACTERISTICS',
                changedCount: changed.length,
                changedKeys: changed.map(c => c.key),
                directProjectCount: directProjectIds.length,
                bomParentsProjectCount: projectsFromBomParents.length
              },
              ...requestInfo
            }).catch(err => {
              console.warn('Errore nel logging attività caratteristiche tecniche:', err?.message || err);
            });
          }
        } catch (logErr) {
          // Non bloccare la risposta se il logging fallisce
          console.warn('Logging caratteristiche tecniche fallito:', logErr?.message || logErr);
        }
      }
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (err) {
      console.error('Error saving technical characteristics:', err);
      res.status(500).json({ success: 0, msg: err.message });
    }
  });

  // Aggiorna dettagli articolo
  router.put('/projectArticles/items/:itemId/details', authenticateToken, async (req, res) => {
    try {
        const itemId = parseInt(req.params.itemId);
        const itemData = req.body;
        
        if (!itemId || isNaN(itemId)) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'ID articolo non valido' 
            });
        }
        
        // Usa la funzione aggiornata con validazione
        const result = await updateItemDetailsWithValidation(itemId, itemData);
        
        // LOGGING: Traccia la modifica dettagli articolo
        if (result.success) {
            const companyId = req.user.CompanyId;
            const userId = req.user.UserId;
            const requestInfo = getRequestInfo(req);
            // Recupera ProjectID
            let projectId = null;
            let itemCode = null;
            try {
                const sql = require('mssql');
                const config = require('../config');
                const pool = await sql.connect(config.database);
                const itemInfo = await pool.request()
                    .input('CompanyId', sql.Int, companyId)
                    .input('ItemId', sql.BigInt, itemId)
                    .query(`
                        SELECT i.Item, pi.ProjectID
                        FROM dbo.MA_ProjectArticles_Items i
                        LEFT JOIN dbo.MA_ProjectsItems pi ON i.Id = pi.ItemId AND i.CompanyId = pi.CompanyId
                        WHERE i.CompanyId = @CompanyId AND i.Id = @ItemId
                    `);
                if (itemInfo.recordset.length > 0) {
                    itemCode = itemInfo.recordset[0].Item;
                    projectId = itemInfo.recordset[0].ProjectID;
                }
            } catch (err) {
                // Ignora errori
            }
            
            await logActivity({
                companyId,
                projectId,
                userId,
                activityType: 'ITEM_UPDATE',
                entityType: 'Item',
                entityId: itemId,
                entityCode: itemCode,
                action: 'UPDATE',
                description: `Modificati dettagli articolo ${itemCode || itemId}`,
                newValues: itemData,
                metadata: {
                    itemId: itemId,
                    itemCode: itemCode
                },
                ...requestInfo
            }).catch(err => {
                console.warn('Errore nel logging attività modifica dettagli articolo:', err);
            });
        }
        
        if (result.success && result.warning) {
            // Include l'avviso nella risposta
            result.msg += `. ${result.warning}`;
        }
        
        res.json(result);
    } catch (err) {
        console.error('Error updating item details:', err);
        res.status(500).json({ success: 0, msg: err.message });
    }
});

// Importa articolo ERP con selezione componenti
router.post('/projectArticles/items/import-with-selection', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const { action, projectId, sourceItem, createNewBOM, components } = req.body;
        
        // Validazione input
        if (!action || action !== 'IMPORT_WITH_SELECTION') {
            return res.status(400).json({ 
                success: 0, 
                msg: 'Azione non valida. Utilizzare IMPORT_WITH_SELECTION.' 
            });
        }
        
        if (!projectId || isNaN(parseInt(projectId))) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'ProjectId non valido o mancante' 
            });
        }
        
        if (!sourceItem || !sourceItem.Item) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'Articolo sorgente non specificato' 
            });
        }
        
        if (!components || !Array.isArray(components)) {
            return res.status(400).json({ 
                success: 0, 
                msg: 'Lista componenti non valida' 
            });
        }
        
        // Prepara i dati per l'importazione
        const importData = {
            sourceItem,
            createNewBOM: createNewBOM === true,
            components
        };
        
        // Chiama la funzione di importazione con selezione
        const result = await importERPItemWithSelection(
            companyId,
            userId,
            parseInt(projectId),
            importData
        );
        
        // LOGGING: Traccia importazione con selezione
        if (result.success) {
            const requestInfo = getRequestInfo(req);
            await logActivity({
                companyId,
                projectId: parseInt(projectId),
                userId,
                activityType: 'ITEM_IMPORT',
                entityType: 'Item',
                entityId: result.itemId || null,
                entityCode: sourceItem?.Item || null,
                action: 'IMPORT',
                description: `Importato articolo ${sourceItem?.Item || sourceItem?.Description} con selezione componenti (${components.length} componenti selezionati)`,
                metadata: {
                    sourceItemCode: sourceItem?.Item,
                    itemId: result.itemId,
                    createNewBOM: createNewBOM === true,
                    componentsCount: components.length,
                    componentsSelected: components.map(c => c.ComponentCode || c.Item).filter(Boolean)
                },
                ...requestInfo
            }).catch(err => {
                console.warn('Errore nel logging attività import con selezione:', err);
            });
        }
        
        res.json(result);
    } catch (err) {
        console.error('Error importing ERP item with selection:', err);
        res.status(500).json({ 
            success: 0, 
            msg: err.message || 'Errore durante l\'importazione con selezione' 
        });
    }
});

router.get('/projectArticles/erp-items/paginated', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const page = parseInt(req.query.page) || 0;
        const pageSize = parseInt(req.query.pageSize) || 50;
        const search = req.query.search || '';
        
        const result = await getERPItemsPaginated(companyId, page, pageSize, search);
        res.json(result);
    } catch (err) {
        console.error('Error fetching paginated ERP items:', err);
        res.status(500).json({ 
            success: 0, 
            msg: err.message || 'Errore durante il recupero degli articoli ERP' 
        });
    }
});

// Valida un codice articolo per unicità
router.post('/projectArticles/items/validate-code', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { itemCode, excludeItemId } = req.body;
        
        if (!itemCode || itemCode.trim() === '') {
            return res.status(400).json({
                success: 0,
                msg: 'Codice articolo richiesto'
            });
        }
        
        const result = await validateItemCode(companyId, itemCode.trim(), excludeItemId);
        
        res.json({
            success: 1,
            isValid: result.isValid,
            message: result.message,
            isWarning: result.isWarning || false
        });
    } catch (err) {
        console.error('Error validating item code:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante la validazione del codice'
        });
    }
});

// Verifica disponibilità di un codice articolo
router.get('/projectArticles/items/check-code/:itemCode', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { itemCode } = req.params;
        const excludeItemId = req.query.excludeItemId ? parseInt(req.query.excludeItemId) : null;
        
        if (!itemCode || itemCode.trim() === '') {
            return res.status(400).json({
                success: 0,
                msg: 'Codice articolo richiesto'
            });
        }
        
        const result = await checkItemCodeExists(companyId, itemCode.trim(), excludeItemId);
        
        res.json({
            success: 1,
            exists: {
                inProjects: result.existsInProjects,
                inERP: result.existsInERP
            },
            canUse: result.canUse,
            message: result.existsInProjects 
                ? 'Codice già utilizzato in un articolo di progetto'
                : result.existsInERP 
                    ? 'Codice esiste nel gestionale Mago'
                    : 'Codice disponibile'
        });
    } catch (err) {
        console.error('Error checking item code:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante la verifica del codice'
        });
    }
});

// Search similar articles by root code and description
router.get('/projectArticles/searchSimilar', authenticateToken, async (req, res) => {
    try {
        const { 
            rootCode = '', 
            description = '', 
            excludeId = null,
            limit = 10,
            erpOnly = false,
            tempOnly = false,
            searchTerm = ''
        } = req.query;

        // Get companyId from authenticated user
        const companyId = req.user.CompanyId;

        // Validation
        if (!companyId) {
            return res.status(400).json({
                success: 0,
                msg: 'CompanyId obbligatorio'
            });
        }

        // If neither rootCode nor description is provided, return empty array
        if (!rootCode && !description) {
            return res.json([]);
        }

        // Convert string boolean parameters to actual booleans
        const isErpOnly = erpOnly === 'true' || erpOnly === true;
        const isTempOnly = tempOnly === 'true' || tempOnly === true;

        // Call the stored procedure through the management function
        const results = await searchSimilarArticles(
            companyId,
            rootCode,
            description,
            excludeId ? parseInt(excludeId) : null,
            parseInt(limit) || 10,
            isErpOnly,
            isTempOnly
        );

        // If searchTerm is provided, apply additional filtering
        let filteredResults = results;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredResults = results.filter(item => 
                item.Item.toLowerCase().includes(term) ||
                item.Description.toLowerCase().includes(term)
            );
        }

        // Return the results
        res.json(filteredResults);

    } catch (error) {
        console.error('Error searching similar articles:', error);
        res.status(500).json({
            success: 0,
            msg: error.message || 'Errore durante la ricerca articoli simili'
        });
    }
});

// Ottieni la struttura BOM ad albero per l'espansione nella lista articoli
router.get('/projectArticles/:itemId/bom-tree', authenticateToken, async (req, res) => {
    try {
        const { itemId } = req.params;
        const { maxLevel = 3, includeAttachments = 'true' } = req.query;
        const companyId = req.user.CompanyId;

        if (!itemId) {
            return res.status(400).json({
                success: 0,
                msg: 'ID articolo richiesto'
            });
        }

        const bomTree = await getArticleBOMTree(
            companyId, 
            parseInt(itemId), 
            parseInt(maxLevel), 
            includeAttachments === 'true'
        );

        res.json({
            success: 1,
            data: bomTree
        });
    } catch (error) {
        console.error('Error getting article BOM tree:', error);
        res.status(500).json({
            success: 0,
            msg: error.message || 'Errore durante il recupero della struttura BOM'
        });
    }
});

// Ottieni gli allegati per un componente specifico
router.get('/projectArticles/component/:componentId/attachments', authenticateToken, async (req, res) => {
    try {
        const { componentId } = req.params;
        const { isProjectItem = 'true' } = req.query;
        const companyId = req.user.CompanyId;

        if (!componentId) {
            return res.status(400).json({
                success: 0,
                msg: 'ID componente richiesto'
            });
        }

        const attachments = await getComponentAttachments(
            companyId, 
            componentId, 
            isProjectItem === 'true'
        );

        res.json({
            success: 1,
            data: attachments
        });
    } catch (error) {
        console.error('Error getting component attachments:', error);
        res.status(500).json({
            success: 0,
            msg: error.message || 'Errore durante il recupero degli allegati'
        });
    }
});

// =====================================================
// INTERCOMPANY ROUTES
// =====================================================

// 1. GET /projectArticles/boms/:id/intercompany-components - Ottieni componenti intercompany di una BOM
router.get('/projectArticles/boms/:id/intercompany-components', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const bomId = parseInt(req.params.id);
        const includeAttachments = req.query.includeAttachments === 'true';

        if (!bomId || isNaN(bomId)) {
            return res.status(400).json({
                success: 0,
                msg: 'ID BOM non valido'
            });
        }

        const result = await getIntercompanyComponents(bomId, companyId, includeAttachments);
        res.json(result);
    } catch (err) {
        console.error('Error fetching intercompany components:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante il recupero dei componenti intercompany'
        });
    }
});

// 2. POST /projectArticles/boms/:id/sync-intercompany - Sincronizza condivisioni intercompany
router.post('/projectArticles/boms/:id/sync-intercompany', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const bomId = parseInt(req.params.id);
        const { syncAttachments = true, autoCreateReferences = true } = req.body;

        if (!bomId || isNaN(bomId)) {
            return res.status(400).json({
                success: 0,
                msg: 'ID BOM non valido'
            });
        }

        const result = await syncIntercompanySharing(
            bomId,
            companyId,
            userId,
            syncAttachments,
            autoCreateReferences
        );

        // LOGGING: Traccia sincronizzazione intercompany
        if (result.success) {
            const requestInfo = getRequestInfo(req);
            // Recupera informazioni sulla BOM e progetti
            let projectIds = [];
            let entityCode = null;
            try {
                const sql = require('mssql');
                const config = require('../config');
                const pool = await sql.connect(config.database);
                const bomInfo = await pool.request()
                    .input('CompanyId', sql.Int, companyId)
                    .input('BOMId', sql.BigInt, bomId)
                    .query(`
                        SELECT bom.BOM, bom.ItemId, bom.MainRefBOMId
                        FROM dbo.MA_ProjectArticles_BillOfMaterials bom
                        WHERE bom.CompanyId = @CompanyId AND bom.Id = @BOMId
                    `);
                if (bomInfo.recordset.length > 0) {
                    entityCode = bomInfo.recordset[0].BOM;
                    const mainRefBOMId = bomInfo.recordset[0].MainRefBOMId;
                    const itemId = bomInfo.recordset[0].ItemId;
                    
                    if (mainRefBOMId) {
                        const allBOMs = await pool.request()
                            .input('CompanyId', sql.Int, companyId)
                            .input('MainRefBOMId', sql.BigInt, mainRefBOMId)
                            .query(`
                                SELECT DISTINCT bom.ItemId
                                FROM dbo.MA_ProjectArticles_BillOfMaterials bom
                                WHERE bom.CompanyId = @CompanyId 
                                  AND (bom.MainRefBOMId = @MainRefBOMId OR bom.Id = @MainRefBOMId)
                            `);
                        const itemIds = allBOMs.recordset.map(r => r.ItemId).filter(Boolean);
                        if (itemIds.length > 0) {
                            const itemIdsStr = itemIds.join(',');
                            const projectsResult = await pool.request()
                                .query(`
                                    SELECT DISTINCT pi.ProjectID
                                    FROM dbo.MA_ProjectsItems pi
                                    WHERE pi.CompanyId = ${companyId}
                                      AND pi.ItemId IN (${itemIdsStr})
                                `);
                            projectIds = projectsResult.recordset.map(r => r.ProjectID).filter(Boolean);
                        }
                    } else if (itemId) {
                        const projectInfo = await pool.request()
                            .input('CompanyId', sql.Int, companyId)
                            .input('ItemId', sql.BigInt, itemId)
                            .query(`
                                SELECT DISTINCT pi.ProjectID
                                FROM dbo.MA_ProjectsItems pi
                                WHERE pi.CompanyId = @CompanyId AND pi.ItemId = @ItemId
                            `);
                        projectIds = projectInfo.recordset.map(r => r.ProjectID).filter(Boolean);
                    }
                }
            } catch (err) {
                console.warn('Errore nel recupero progetti per logging sync intercompany:', err);
            }

            const projectsToLog = projectIds.length > 0 ? projectIds : [null];
            
            for (const projId of projectsToLog) {
                await logActivity({
                    companyId,
                    projectId: projId,
                    userId,
                    activityType: 'INTERCOMPANY_SYNC',
                    entityType: 'BOM',
                    entityId: bomId,
                    entityCode: entityCode,
                    action: 'SYNC',
                    description: `Sincronizzata condivisione intercompany per BOM ${entityCode || bomId}`,
                    newValues: {
                        BOMId: bomId,
                        BOMCode: entityCode,
                        SyncAttachments: syncAttachments,
                        AutoCreateReferences: autoCreateReferences,
                        ReferencesCreated: result.referencesCreated || 0,
                        ComponentsSynced: result.componentsSynced || 0
                    },
                    metadata: {
                        bomId: bomId,
                        bomCode: entityCode,
                        syncAttachments: syncAttachments,
                        autoCreateReferences: autoCreateReferences,
                        affectedProjectsCount: projectIds.length > 0 ? projectIds.length : 0
                    },
                    ...requestInfo
                }).catch(err => {
                    console.warn('Errore nel logging sincronizzazione intercompany:', err);
                });
            }
        }

        res.json(result);
    } catch (err) {
        console.error('Error syncing intercompany sharing:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante la sincronizzazione intercompany'
        });
    }
});

// 3. GET /projectArticles/boms/:id/intercompany-summary - Ottieni riepilogo intercompany per sidebar
router.get('/projectArticles/boms/:id/intercompany-summary', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const bomId = parseInt(req.params.id);

        if (!bomId || isNaN(bomId)) {
            return res.status(400).json({
                success: 0,
                msg: 'ID BOM non valido'
            });
        }

        const result = await getBOMIntercompanySummary(bomId, companyId);
        res.json(result);
    } catch (err) {
        console.error('Error fetching BOM intercompany summary:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante il recupero del riepilogo intercompany'
        });
    }
});

// 4. GET /projectArticles/intercompany/requests - Ottieni richieste intercompany (inbox/outbox)
router.get('/projectArticles/intercompany/requests', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const direction = req.query.direction || 'IN'; // IN, OUT, BOTH
        const status = req.query.status || null; // PENDING, APPROVED, REJECTED, DRAFT, null

        // Validazione direction
        if (!['IN', 'OUT', 'BOTH'].includes(direction)) {
            return res.status(400).json({
                success: 0,
                msg: 'Direction deve essere IN, OUT o BOTH'
            });
        }

        const result = await getIntercompanyRequests(companyId, direction, status);
        res.json(result);
    } catch (err) {
        console.error('Error fetching intercompany requests:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante il recupero delle richieste intercompany'
        });
    }
});

// 5. POST /projectArticles/intercompany/references/:id/respond - Approva o rifiuta una richiesta
router.post('/projectArticles/intercompany/references/:id/respond', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.UserId;
        const referenceId = parseInt(req.params.id);
        const { action, notes = null, targetItemCode = null, createTemporaryIfMissing = true } = req.body;

        if (!referenceId || isNaN(referenceId)) {
            return res.status(400).json({
                success: 0,
                msg: 'ID reference non valido'
            });
        }

        // Validazione action
        if (!action || !['APPROVE', 'REJECT'].includes(action)) {
            return res.status(400).json({
                success: 0,
                msg: 'Action deve essere APPROVE o REJECT'
            });
        }

        // Valida che le note siano presenti per i rifiuti
        if (action === 'REJECT' && (!notes || notes.trim() === '')) {
            return res.status(400).json({
                success: 0,
                msg: 'Le note sono obbligatorie per i rifiuti'
            });
        }

        // Se è un'approvazione, usa la nuova funzione con gestione progetti
        let result;
        if (action === 'APPROVE') {
            result = await approveIntercompanyReferenceWithProject(
                referenceId,
                userId,
                notes,
                targetItemCode,
                createTemporaryIfMissing
            );
        } else {
            // Per i rifiuti usa la funzione vecchia (semplice UPDATE)
            result = await approveRejectReference(referenceId, action, userId, notes);
        }
        res.json(result);
    } catch (err) {
        console.error('Error responding to intercompany request:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante la risposta alla richiesta intercompany'
        });
    }
});

// 6. GET /projectArticles/intercompany/references/:id/attachments - Allegati della reference
router.get('/projectArticles/intercompany/references/:id/attachments', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const referenceId = parseInt(req.params.id);
        if (!referenceId || isNaN(referenceId)) {
            return res.status(400).json({ success: 0, msg: 'ID reference non valido' });
        }
        const result = await getReferenceAttachments(referenceId, companyId);
        res.json(result);
    } catch (err) {
        console.error('Error fetching reference attachments:', err);
        res.status(500).json({ success: 0, msg: err.message || 'Errore nel recupero allegati' });
    }
});

// 7. POST /projectArticles/intercompany/references/:id/notes - Aggiorna note della reference
router.post('/projectArticles/intercompany/references/:id/notes', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const referenceId = parseInt(req.params.id);
        const { notes } = req.body || {};
        if (!referenceId || isNaN(referenceId)) {
            return res.status(400).json({ success: 0, msg: 'ID reference non valido' });
        }
        const result = await updateReferenceNotes(referenceId, companyId, notes);
        res.json(result);
    } catch (err) {
        console.error('Error updating reference notes:', err);
        res.status(500).json({ success: 0, msg: err.message || 'Errore aggiornamento note' });
    }
});

// =====================================================
// NUOVI ENDPOINT PER GESTIONE FORNITORI INTERCOMPANY
// =====================================================

// 8. GET /projectArticles/items/check-in-gestionale/:itemCode - Verifica se codice esiste nel gestionale
router.get('/projectArticles/items/check-in-gestionale/:itemCode', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const { itemCode } = req.params;

        if (!itemCode || itemCode.trim() === '') {
            return res.status(400).json({
                success: 0,
                msg: 'Codice articolo richiesto'
            });
        }

        const result = await checkItemInGestionale(companyId, itemCode.trim());
        res.json(result);
    } catch (err) {
        console.error('Error checking item in gestionale:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante la verifica del codice nel gestionale'
        });
    }
});

// 9. GET /projectArticles/suppliers/intercompany - Lista fornitori con flag Intercompany
router.get('/projectArticles/suppliers/intercompany', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const onlyIntercompany = req.query.onlyIntercompany === 'true';

        const result = await getSuppliersWithIntercompanyFlag(companyId, onlyIntercompany);
        res.json(result);
    } catch (err) {
        console.error('Error fetching suppliers with intercompany flag:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante il recupero dei fornitori'
        });
    }
});

// =============================================================================
// NUOVA ROUTE: Sincronizzazione selettiva componenti intercompany
// =============================================================================
router.post('/projectArticles/sync-intercompany-components', authenticateToken, async (req, res) => {
    try {
        const { components, projectId, syncAttachments = true } = req.body;
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;

        // Validazione input
        if (!components || !Array.isArray(components) || components.length === 0) {
            return res.status(400).json({
                success: 0,
                msg: 'Nessun componente selezionato per la sincronizzazione'
            });
        }

        if (!projectId || isNaN(projectId)) {
            return res.status(400).json({
                success: 0,
                msg: 'ProjectId richiesto per la sincronizzazione'
            });
        }

        console.log(`Syncing ${components.length} intercompany components for company ${companyId}, project ${projectId}`);

        // Chiama la funzione di sincronizzazione
        const result = await syncIntercompanyComponents(
            components,
            companyId,
            projectId,  // NUOVO PARAMETRO
            userId,
            syncAttachments
        );

        // LOGGING: Traccia sincronizzazione componenti intercompany
        if (result.success) {
            const requestInfo = getRequestInfo(req);
            await logActivity({
                companyId,
                projectId: projectId,
                userId,
                activityType: 'INTERCOMPANY_COMPONENTS_SYNC',
                entityType: 'BOM',
                entityId: null,
                entityCode: null,
                action: 'SYNC',
                description: `Sincronizzati ${components.length} componenti intercompany per progetto ${projectId}`,
                newValues: {
                    ComponentsCount: components.length,
                    SyncAttachments: syncAttachments,
                    ComponentsSynced: result.componentsSynced || 0,
                    ReferencesCreated: result.referencesCreated || 0
                },
                metadata: {
                    projectId: projectId,
                    componentsCount: components.length,
                    syncAttachments: syncAttachments,
                    componentIds: components.map(c => c.componentId || c.ComponentId).filter(Boolean)
                },
                ...requestInfo
            }).catch(err => {
                console.warn('Errore nel logging sincronizzazione componenti intercompany:', err);
            });
        }

        if (result.success) {
            return res.json({
                success: 1,
                msg: result.message,
                data: result.data
            });
        } else {
            return res.status(400).json({
                success: 0,
                msg: result.message,
                errorCode: result.errorCode
            });
        }

    } catch (err) {
        console.error('Error syncing intercompany components:', err);
        return res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante la sincronizzazione'
        });
    }
});

// =============================================================================
// NUOVE ROUTES INTERCOMPANY CON GESTIONE PROGETTI
// =============================================================================

// GET /projectArticles/intercompany/temporary-items - Recupera articoli temporanei
router.get('/projectArticles/intercompany/temporary-items', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;

        const result = await getTemporaryIntercompanyItems(companyId);

        res.json(result);
    } catch (err) {
        console.error('Error fetching temporary intercompany items:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore nel recupero degli articoli temporanei'
        });
    }
});

// POST /projectArticles/intercompany/temporary-items/:id/replace - Sostituisci articolo temporaneo
router.post('/projectArticles/intercompany/temporary-items/:id/replace', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const userId = req.user.UserId;
        const temporaryItemId = parseInt(req.params.id);
        const { definitiveItemCode } = req.body;

        if (!temporaryItemId || isNaN(temporaryItemId)) {
            return res.status(400).json({
                success: 0,
                msg: 'ID articolo temporaneo non valido'
            });
        }

        if (!definitiveItemCode || definitiveItemCode.trim() === '') {
            return res.status(400).json({
                success: 0,
                msg: 'Codice articolo definitivo richiesto'
            });
        }

        const result = await replaceTemporaryItem(
            temporaryItemId,
            definitiveItemCode,
            companyId,
            userId
        );

        // LOGGING: Traccia la ricodifica
        if (result.success) {
            const requestInfo = getRequestInfo(req);
            // Recupera informazioni sull'articolo ricodificato
            let projectId = null;
            let oldItemCode = null;
            try {
                const sql = require('mssql');
                const config = require('../config');
                const pool = await sql.connect(config.database);
                const itemInfo = await pool.request()
                    .input('CompanyId', sql.Int, companyId)
                    .input('ItemId', sql.BigInt, temporaryItemId)
                    .query(`
                        SELECT i.Item, i.Description, pi.ProjectID
                        FROM dbo.MA_ProjectArticles_Items i
                        LEFT JOIN dbo.MA_ProjectsItems pi ON i.Id = pi.ItemId AND i.CompanyId = pi.CompanyId
                        WHERE i.CompanyId = @CompanyId AND i.Id = @ItemId
                    `);
                if (itemInfo.recordset.length > 0) {
                    oldItemCode = itemInfo.recordset[0].Item;
                    projectId = itemInfo.recordset[0].ProjectID;
                }
            } catch (err) {
                console.warn('Errore nel recupero info articolo per logging ricodifica:', err);
            }

            await logActivity({
                companyId,
                projectId: projectId,
                userId,
                activityType: 'ITEM_RECODE',
                entityType: 'Item',
                entityId: temporaryItemId,
                entityCode: definitiveItemCode,
                action: 'UPDATE',
                description: `Ricodificato articolo da ${oldItemCode || temporaryItemId} a ${definitiveItemCode}`,
                oldValues: {
                    ItemCode: oldItemCode,
                    ItemId: temporaryItemId
                },
                newValues: {
                    ItemCode: definitiveItemCode,
                    ItemId: result.newItemId || temporaryItemId
                },
                metadata: {
                    oldItemCode: oldItemCode,
                    newItemCode: definitiveItemCode,
                    oldItemId: temporaryItemId,
                    newItemId: result.newItemId
                },
                ...requestInfo
            }).catch(err => {
                console.warn('Errore nel logging attività ricodifica:', err);
            });
        }

        res.json(result);
    } catch (err) {
        console.error('Error replacing temporary item:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore durante la sostituzione dell\'articolo temporaneo'
        });
    }
});

// GET /projectArticles/intercompany/references/:id/details - Dettagli reference con progetti
router.get('/projectArticles/intercompany/references/:id/details', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.CompanyId;
        const referenceId = parseInt(req.params.id);

        if (!referenceId || isNaN(referenceId)) {
            return res.status(400).json({
                success: 0,
                msg: 'ID reference non valido'
            });
        }

        const result = await getReferenceWithProjects(referenceId, companyId);

        res.json(result);
    } catch (err) {
        console.error('Error fetching reference details:', err);
        res.status(500).json({
            success: 0,
            msg: err.message || 'Errore nel recupero dei dettagli della reference'
        });
    }
});

module.exports = router;