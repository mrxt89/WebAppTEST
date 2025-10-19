const express = require('express');
const router = express.Router();
const authenticateToken = require('../authenticateToken');
const {
    addUpdateItem,
    addUpdateBOM,
    getBOMData,
    manageReferences,
    getItemStatuses,
    getPaginatedItems,
    getItemById,
    getERPBOMs,
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
    getBOMIntercompanySummary,
    getIntercompanyRequests,
    approveRejectReference,
    getReferenceAttachments,
    updateReferenceNotes,
    // NEW: Intercompany supplier functions
    checkItemInGestionale,
    getSuppliersWithIntercompanyFlag
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
        if (action === 'ADD_COMPONENT' && bomData.createTempComponent === true) {
            // Converti i nomi dei parametri in camelCase a quelli attesi dalla funzione
            const processedData = {
                ...bomData,
                CreateTempComponent: true
            };
            
            if (bomData.tempComponentPrefix) {
                processedData.TempComponentPrefix = bomData.tempComponentPrefix;
            }
            
            // Chiama la funzione con il flag di creazione componente temporaneo
            const result = await addUpdateBOM(action, companyId, processedData, userId);
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
            // Per tutte le altre azioni, usiamo la funzione standard
            const result = await addUpdateBOM(action, companyId, bomData, userId);
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
        
        const result = await getERPBOMs(companyId, search);
        res.json(result);
    } catch (err) {
        console.error(`Error fetching ERP BOMs:`, err);
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
            pageSize: parseInt(req.query.pageSize) || 10
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
        const { action, notes = null } = req.body;

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

        const result = await approveRejectReference(referenceId, action, userId, notes);
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

module.exports = router;