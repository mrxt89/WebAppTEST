# Integrazione Sistema di Logging Attività Progetti

## Panoramica

Il sistema di logging traccia tutte le modifiche importanti ai progetti, articoli, BOM, costificazioni, esportazioni, allegati, ecc.

## Struttura

- **Tabella**: `MA_ProjectActivityLog` - contiene tutti i log
- **Stored Procedure**: 
  - `LogProjectActivity` - per inserire log
  - `GetProjectActivityLogs` - per recuperare log progetto
  - `GetEntityActivityLogs` - per recuperare log entità
  - `GetProjectActivityStats` - per statistiche
- **Backend Helper**: `backend/queries/projectActivityLog.js`
- **API Routes**: `backend/routes/projectActivityLogRoutes.js`

## Come Integrare il Logging

### 1. Importa il modulo di logging

```javascript
const { logActivity, getRequestInfo } = require('../queries/projectActivityLog');
```

### 2. Chiama logActivity dopo operazioni importanti

Il logging **NON deve bloccare** il flusso principale, quindi usa `await` ma gestisci gli errori senza propagarli.

### Esempi di Integrazione

#### Esempio 1: Creazione/Modifica Articolo

```javascript
// backend/queries/projectArticlesManagement.js
const { logActivity, getRequestInfo } = require('./projectActivityLog');

const addUpdateItem = async (action, companyId, itemData, userId, projectId = null, sourceItemId = null, req = null) => {
    try {
        // ... codice esistente ...
        
        const result = {
            success: 1,
            itemId: request.parameters.ReturnValue.value,
            msg: `Item ${action.toLowerCase()} operation completed successfully`
        };
        
        // LOGGING: Traccia l'operazione
        const requestInfo = req ? getRequestInfo(req) : {};
        const activityType = action === 'ADD' ? 'ITEM_CREATE' : 
                           action === 'UPDATE' ? 'ITEM_UPDATE' : 
                           action === 'COPY' ? 'ITEM_CREATE' : 'ITEM_UPDATE';
        
        await logActivity({
            companyId,
            projectId,
            userId,
            activityType,
            entityType: 'Item',
            entityId: result.itemId,
            entityCode: itemData.Item || request.parameters.CreatedComponentCode?.value,
            action: action === 'ADD' ? 'CREATE' : action === 'UPDATE' ? 'UPDATE' : 'CREATE',
            description: `${action === 'ADD' ? 'Creato' : action === 'UPDATE' ? 'Modificato' : 'Copiato'} articolo ${itemData.Item || itemData.Description || result.itemId}`,
            newValues: {
                Item: itemData.Item,
                Description: itemData.Description,
                CategoryId: itemData.CategoryId,
                StatusId: itemData.StatusId,
                // ... altri campi rilevanti
            },
            metadata: {
                sourceItemId: sourceItemId,
                projectId: projectId
            },
            ...requestInfo
        }).catch(err => {
            // Non bloccare se il logging fallisce
            console.warn('Errore nel logging attività articolo:', err);
        });
        
        return result;
    } catch (err) {
        // ... gestione errori esistente ...
    }
};
```

#### Esempio 2: Modifica BOM

```javascript
// backend/queries/projectArticlesManagement.js
const addUpdateBOM = async (action, companyId, bomData, userId, req = null) => {
    try {
        // ... codice esistente ...
        
        const result = {
            success: 1,
            bomId: request.parameters.ReturnValue.value,
            msg: `BOM ${action.toLowerCase()} operation completed successfully`
        };
        
        // LOGGING: Traccia l'operazione
        const requestInfo = req ? getRequestInfo(req) : {};
        let activityType, actionType, description;
        
        if (action === 'ADD') {
            activityType = 'BOM_CREATE';
            actionType = 'CREATE';
            description = `Creata distinta base ${bomData.BOM || result.bomId}`;
        } else if (action === 'UPDATE') {
            activityType = 'BOM_UPDATE';
            actionType = 'UPDATE';
            description = `Modificata distinta base ${bomData.BOM || bomData.Id}`;
        } else if (action === 'ADD_COMPONENT') {
            activityType = 'BOM_COMPONENT_ADD';
            actionType = 'CREATE';
            description = `Aggiunto componente ${bomData.ComponentId || bomData.ComponentCode} alla BOM ${bomData.Id}`;
        } else if (action === 'UPDATE_COMPONENT') {
            activityType = 'BOM_COMPONENT_UPDATE';
            actionType = 'UPDATE';
            description = `Modificato componente ${bomData.ComponentId || bomData.ComponentCode} nella BOM ${bomData.Id}`;
        } else if (action === 'DELETE_COMPONENT') {
            activityType = 'BOM_COMPONENT_DELETE';
            actionType = 'DELETE';
            description = `Rimosso componente dalla BOM ${bomData.Id}`;
        }
        
        // Recupera ProjectID dalla BOM se disponibile
        let projectId = null;
        if (bomData.Id) {
            try {
                const bomInfo = await pool.request()
                    .input('CompanyId', sql.Int, companyId)
                    .input('BOMId', sql.BigInt, bomData.Id)
                    .query(`
                        SELECT bom.ItemId, i.ProjectID
                        FROM dbo.MA_ProjectArticles_BillOfMaterials bom
                        LEFT JOIN dbo.MA_ProjectsItems pi ON bom.ItemId = pi.ItemId
                        WHERE bom.CompanyId = @CompanyId AND bom.Id = @BOMId
                    `);
                if (bomInfo.recordset.length > 0) {
                    projectId = bomInfo.recordset[0].ProjectID;
                }
            } catch (err) {
                // Ignora errori nel recupero ProjectID
            }
        }
        
        await logActivity({
            companyId,
            projectId,
            userId,
            activityType,
            entityType: action.includes('COMPONENT') ? 'BOMComponent' : 'BOM',
            entityId: action.includes('COMPONENT') ? bomData.ComponentId : (bomData.Id || result.bomId),
            entityCode: action.includes('COMPONENT') ? bomData.ComponentCode : bomData.BOM,
            action: actionType,
            description,
            newValues: {
                BOM: bomData.BOM,
                Description: bomData.Description,
                Version: bomData.Version,
                ProductionLot: bomData.ProductionLot,
                // ... altri campi rilevanti
            },
            metadata: {
                BOMId: bomData.Id || result.bomId,
                ComponentId: bomData.ComponentId,
                ComponentCode: bomData.ComponentCode,
                Quantity: bomData.Quantity
            },
            ...requestInfo
        }).catch(err => {
            console.warn('Errore nel logging attività BOM:', err);
        });
        
        return result;
    } catch (err) {
        // ... gestione errori esistente ...
    }
};
```

#### Esempio 3: Costificazione

```javascript
// backend/queries/bomCostingManagement.js
const { logActivity, getRequestInfo } = require('./projectActivityLog');

const calculateBOMCosting = async (companyId, bomId, productionLot, userId, req = null) => {
    try {
        // ... codice esistente per calcolo costificazione ...
        
        const result = {
            success: true,
            bomId: bomId,
            // ... altri dati ...
        };
        
        // LOGGING: Traccia il calcolo costificazione
        const requestInfo = req ? getRequestInfo(req) : {};
        
        // Recupera ProjectID dalla BOM
        let projectId = null;
        try {
            const bomInfo = await pool.request()
                .input('CompanyId', sql.Int, companyId)
                .input('BOMId', sql.BigInt, bomId)
                .query(`
                    SELECT bom.ItemId, pi.ProjectID
                    FROM dbo.MA_ProjectArticles_BillOfMaterials bom
                    LEFT JOIN dbo.MA_ProjectsItems pi ON bom.ItemId = pi.ItemId
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
            activityType: 'COSTING_CALCULATE',
            entityType: 'BOM',
            entityId: bomId,
            action: 'CALCULATE',
            description: `Calcolata costificazione per BOM ${bomId} con lotto produzione ${productionLot}`,
            metadata: {
                bomId: bomId,
                productionLot: productionLot,
                // ... altri parametri costificazione ...
            },
            ...requestInfo
        }).catch(err => {
            console.warn('Errore nel logging attività costificazione:', err);
        });
        
        return result;
    } catch (error) {
        // ... gestione errori esistente ...
    }
};
```

#### Esempio 4: Esportazione Articolo

```javascript
// backend/queries/erpExportManagement.js
const { logActivity, getRequestInfo } = require('./projectActivityLog');

const exportItemToERP = async (companyId, itemId, userId, autoSync = true, req = null) => {
    try {
        // ... codice esistente per esportazione ...
        
        const result = {
            success: true,
            itemId: itemId,
            // ... altri dati ...
        };
        
        // LOGGING: Traccia l'esportazione
        const requestInfo = req ? getRequestInfo(req) : {};
        
        // Recupera ProjectID e ItemCode
        let projectId = null;
        let itemCode = null;
        try {
            const itemInfo = await pool.request()
                .input('CompanyId', sql.Int, companyId)
                .input('ItemId', sql.BigInt, itemId)
                .query(`
                    SELECT i.Item, pi.ProjectID
                    FROM dbo.MA_ProjectArticles_Items i
                    LEFT JOIN dbo.MA_ProjectsItems pi ON i.Id = pi.ItemId
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
            activityType: 'EXPORT_ITEM',
            entityType: 'Item',
            entityId: itemId,
            entityCode: itemCode,
            action: 'EXPORT',
            description: `Esportato articolo ${itemCode || itemId} a ERP${autoSync ? ' (con sincronizzazione automatica)' : ''}`,
            metadata: {
                itemId: itemId,
                itemCode: itemCode,
                autoSync: autoSync,
                // ... altri dettagli esportazione ...
            },
            ...requestInfo
        }).catch(err => {
            console.warn('Errore nel logging attività esportazione:', err);
        });
        
        return result;
    } catch (error) {
        // ... gestione errori esistente ...
    }
};
```

#### Esempio 5: Modifica Progetto

```javascript
// backend/queries/projectManagement.js
const { logActivity, getRequestInfo } = require('./projectActivityLog');

const addUpdateProject = async (projectData, userId, companyId, req = null) => {
    try {
        // ... codice esistente ...
        
        const result = await request.execute('MA_AddUpdateProject');
        const projectId = result.recordset[0]?.ProjectID || projectData.ProjectID;
        
        // LOGGING: Traccia la modifica progetto
        const requestInfo = req ? getRequestInfo(req) : {};
        const isUpdate = projectData.ProjectID && projectData.ProjectID > 0;
        
        await logActivity({
            companyId,
            projectId: projectId,
            userId,
            activityType: isUpdate ? 'PROJECT_UPDATE' : 'PROJECT_CREATE',
            entityType: 'Project',
            entityId: projectId,
            action: isUpdate ? 'UPDATE' : 'CREATE',
            description: `${isUpdate ? 'Modificato' : 'Creato'} progetto ${projectData.Name || projectId}`,
            oldValues: isUpdate ? {
                Name: projectData.oldName,
                Description: projectData.oldDescription,
                Status: projectData.oldStatus,
                // ... altri campi precedenti ...
            } : null,
            newValues: {
                Name: projectData.Name,
                Description: projectData.Description,
                Status: projectData.Status,
                StartDate: projectData.StartDate,
                EndDate: projectData.EndDate,
                // ... altri campi nuovi ...
            },
            ...requestInfo
        }).catch(err => {
            console.warn('Errore nel logging attività progetto:', err);
        });
        
        return result;
    } catch (error) {
        // ... gestione errori esistente ...
    }
};
```

## Tipi di Attività Supportati

Vedi tabella `MA_ActivityTypes` per la lista completa. I principali sono:

- **Progetti**: `PROJECT_CREATE`, `PROJECT_UPDATE`, `PROJECT_DELETE`, `PROJECT_STATUS_CHANGE`
- **Articoli**: `ITEM_CREATE`, `ITEM_UPDATE`, `ITEM_DELETE`, `ITEM_IMPORT`, `ITEM_EXPORT`, `ITEM_LINK_PROJECT`, `ITEM_UNLINK_PROJECT`
- **BOM**: `BOM_CREATE`, `BOM_UPDATE`, `BOM_DELETE`, `BOM_COMPONENT_ADD`, `BOM_COMPONENT_UPDATE`, `BOM_COMPONENT_DELETE`, `BOM_COMPONENT_REPLACE`
- **Costificazione**: `COSTING_CALCULATE`, `COSTING_PARAMS_UPDATE`, `COSTING_PARAMS_SAVE`
- **Esportazioni**: `EXPORT_ITEM`, `EXPORT_BOM`, `EXPORT_BATCH`
- **Allegati**: `ATTACHMENT_ADD`, `ATTACHMENT_UPDATE`, `ATTACHMENT_DELETE`, `ATTACHMENT_VERSION_ADD`
- **Task**: `TASK_CREATE`, `TASK_UPDATE`, `TASK_DELETE`, `TASK_STATUS_CHANGE`

## Note Importanti

1. **Il logging NON deve bloccare il flusso principale**: usa sempre `.catch()` per gestire errori
2. **Recupera ProjectID quando possibile**: per tracciare le attività nel contesto del progetto
3. **Usa getRequestInfo(req)**: per tracciare IP e UserAgent quando disponibile
4. **Includi metadati rilevanti**: informazioni aggiuntive utili per il debug/audit
5. **OldValues/NewValues**: usa per tracciare i cambiamenti nei campi (soprattutto per UPDATE)

## API Endpoints

- `GET /api/project-activity/projects/:projectId/logs` - Recupera log progetto
- `GET /api/project-activity/entities/:entityType/:entityId/logs` - Recupera log entità
- `GET /api/project-activity/projects/:projectId/stats` - Statistiche attività progetto

## Prossimi Passi

1. Eseguire lo script SQL `database/CREATE_ProjectActivityLog_System.sql`
2. Integrare il logging nelle funzioni principali (vedi esempi sopra)
3. Creare componente frontend per visualizzare i log
4. Aggiungere pulsante "Log Attività" nella pagina progetto
