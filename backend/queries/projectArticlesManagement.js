const sql = require('mssql');
const config = require('../config');

// Gestione articoli di progetto
const addUpdateItem = async (action, companyId, itemData, userId, projectId = null, sourceItemId = null) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        // Parametri obbligatori
        request.input('Action', sql.NVarChar(50), action); // 'ADD', 'UPDATE', 'COPY'
        request.input('CompanyId', sql.Int, companyId);
        request.input('UserId', sql.Int, userId);
        
        // Parametri opzionali in base all'azione
        if (action === 'UPDATE' || action === 'COPY') {
            request.input('Id', sql.BigInt, itemData.Id || null);
        }
        
        if (action === 'ADD' || action === 'COPY') {
            request.input('ProjectID', sql.Int, projectId);
        }

        if (action === 'COPY') {
            request.input('SourceItemId', sql.BigInt, sourceItemId);
        }

        // Altri parametri dell'articolo
        if (itemData.Item) request.input('Item', sql.VarChar(64), itemData.Item);
        if (itemData.Description) request.input('Description', sql.VarChar(128), itemData.Description);
        if (itemData.CustomerItemReference) request.input('CustomerItemReference', sql.VarChar(64), itemData.CustomerItemReference);
        if (itemData.Diameter) request.input('Diameter', sql.Float, itemData.Diameter);
        if (itemData.Bxh) request.input('Bxh', sql.VarChar(11), itemData.Bxh);
        if (itemData.Depth) request.input('Depth', sql.Float, itemData.Depth);
        if (itemData.Length) request.input('Length', sql.Float, itemData.Length);
        if (itemData.MediumRadius) request.input('MediumRadius', sql.Float, itemData.MediumRadius);
        if (itemData.Notes) request.input('Notes', sql.Text, itemData.Notes);
        if (itemData.CategoryId) request.input('CategoryId', sql.BigInt, itemData.CategoryId);
        if (itemData.FamilyId) request.input('FamilyId', sql.BigInt, itemData.FamilyId);
        if (itemData.MacrofamilyId) request.input('MacrofamilyId', sql.BigInt, itemData.MacrofamilyId);
        if (itemData.ItemTypeId) request.input('ItemTypeId', sql.BigInt, itemData.ItemTypeId);
        if (itemData.Nature) request.input('Nature', sql.Int, itemData.Nature);
        if (itemData.StatusId) request.input('StatusId', sql.BigInt, itemData.StatusId);
        if (itemData.fscodice) request.input('fscodice', sql.VarChar(10), itemData.fscodice);
        if (itemData.DescriptionExtension) request.input('DescriptionExtension', sql.VarChar(512), itemData.DescriptionExtension);
        if (itemData.BaseUoM) request.input('BaseUoM', sql.VarChar(3), itemData.BaseUoM);
        if (itemData.offset_acquisto) request.input('offset_acquisto', sql.VarChar(16), itemData.offset_acquisto);
        if (itemData.offset_autoconsumo) request.input('offset_autoconsumo', sql.VarChar(16), itemData.offset_autoconsumo);
        if (itemData.offset_vendita) request.input('offset_vendita', sql.VarChar(16), itemData.offset_vendita);

        // Parametri di output
        request.output('ReturnValue', sql.BigInt);
        request.output('ErrorCode', sql.Int);
        request.output('ErrorMessage', sql.NVarChar(4000));
        request.output('CreatedComponentCode', sql.VarChar(64)); // NUOVO parametro per il codice generato

        
        // Esecuzione della stored procedure
        await request.execute('MA_ProjectArticles_AddUpdateItem');

        // Controllo errori
        const errorCode = request.parameters.ErrorCode.value ? request.parameters.ErrorCode.value : 0;
        if (errorCode !== 0) {
            throw new Error(request.parameters.ErrorMessage.value || `Error code: ${errorCode}`);
        }

        const result = {
            success: 1,
            itemId: request.parameters.ReturnValue.value,
            msg: `Item ${action.toLowerCase()} operation completed successfully`
        };
        
        // NUOVO: Aggiungi CreatedComponentCode al risultato se disponibile
        if (request.parameters.CreatedComponentCode && request.parameters.CreatedComponentCode.value) {
            result.createdComponentCode = request.parameters.CreatedComponentCode.value;
        }
        
        return result;

    } catch (err) {
        console.error(`Error in ${action.toLowerCase()} item:`, err);
        throw err;
    }
};

// Gestione distinte base
const addUpdateBOM = async (action, companyId, bomData, userId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        // DEBUG: Verifica se la BOM esiste per ADD_COMPONENT
        if (action === 'ADD_COMPONENT' && bomData.Id) {
            console.log(`[DEBUG] Verificando esistenza BOM ${bomData.Id} per CompanyId ${companyId}`);
            
            const bomCheck = await pool.request()
                .input('CompanyId', sql.Int, companyId)
                .input('BOMId', sql.BigInt, bomData.Id)
                .query(`
                    SELECT Id, MainRefBOMId, BOM, Description, ItemId, Version
                    FROM dbo.MA_ProjectArticles_BillOfMaterials
                    WHERE CompanyId = @CompanyId AND Id = @BOMId
                `);
            
            if (bomCheck.recordset.length === 0) {
                console.error(`[ERROR] BOM ${bomData.Id} non trovata per CompanyId ${companyId}`);
                throw new Error(`BOM ${bomData.Id} non trovata`);
            }
            
            const bomInfo = bomCheck.recordset[0];
            console.log(`[DEBUG] BOM trovata:`, {
                Id: bomInfo.Id,
                MainRefBOMId: bomInfo.MainRefBOMId,
                BOM: bomInfo.BOM,
                Description: bomInfo.Description,
                ItemId: bomInfo.ItemId,
                Version: bomInfo.Version
            });
        }

        // Parametri obbligatori
        request.input('Action', sql.NVarChar(50), action);
        request.input('CompanyId', sql.Int, companyId);
        request.input('UserId', sql.Int, userId);

        // Gestione dei parametri in base all'azione
        // IMPORTANTE: Gestisci prima i casi specifici, poi quelli generici
        if (bomData.MainRefBOMId !== undefined) {
            request.input('MainRefBOMId', sql.BigInt, bomData.MainRefBOMId);
        }
        
        // CASO 1: REPLACE_WITH_NEW_COMPONENT - Gestito per primo per evitare conflitti
        if (action === 'REPLACE_WITH_NEW_COMPONENT') {
            request.input('Id', sql.BigInt, bomData.Id);
            request.input('ComponentLine', sql.Int, bomData.ComponentLine);
            
            // NUOVO: Supporto per la creazione di componenti temporanei
            if (bomData.CreateTempComponent) {
                request.input('CreateTempComponent', sql.Bit, true);
                
                // Parametri opzionali per il nuovo componente temporaneo
                if (bomData.TempComponentPrefix) {
                    request.input('TempComponentPrefix', sql.VarChar(10), bomData.TempComponentPrefix);
                }

                if (bomData.SourceComponentId) {
                    request.input('SourceComponentId', sql.BigInt, bomData.SourceComponentId);
                }

                if (bomData.SourceBOMId) {
                    request.input('SourceBOMId', sql.BigInt, bomData.SourceBOMId);
                }

                if (bomData.SourceItemCode) {
                    request.input('SourceItemCode', sql.VarChar(21), bomData.SourceItemCode);
                }
            }
            
            // Parametri per il nuovo componente
            if (bomData.NewCompItem) request.input('NewCompItem', sql.VarChar(64), bomData.NewCompItem);
            if (bomData.NewCompDescription) request.input('NewCompDescription', sql.VarChar(128), bomData.NewCompDescription);
            if (bomData.NewCompNature) request.input('NewCompNature', sql.Int, bomData.NewCompNature);
            if (bomData.NewCompBaseUoM) request.input('NewCompBaseUoM', sql.VarChar(3), bomData.NewCompBaseUoM);
            
            // Parametro per la quantità
            if (bomData.ComponentQuantity !== undefined) {
                request.input('ComponentQuantity', sql.Decimal(18, 5), bomData.ComponentQuantity);
            }
            
            // Nuovo parametro per indicare se copiare la distinta
            if (bomData.CopyBOM !== undefined) {
                request.input('CopyBOM', sql.Bit, bomData.CopyBOM);
            }
        }
        // CASO 2: ADD
        else if (action === 'ADD') {
            request.input('ItemId', sql.BigInt, bomData.ItemId);
            // NOTA: NON aggiungere il parametro BOM qui, verrà aggiunto più avanti
        } 
        // CASO 3: UPDATE
        else if (action === 'UPDATE') {
            request.input('Id', sql.BigInt, bomData.Id);
        }
        // CASO 4: COPY
        else if (action === 'COPY') {
            request.input('ItemId', sql.BigInt, bomData.ItemId);
            request.input('SourceBOMId', sql.BigInt, bomData.SourceBOMId);
            request.input('CopyComponents', sql.Bit, bomData.CopyComponents !== false);
            request.input('CopyRouting', sql.Bit, bomData.CopyRouting !== false);
            request.input('VerifyComponents', sql.Bit, bomData.VerifyComponents !== false);
        } 
        // CASO 5: REORDER_COMPONENTS
        else if (action === 'REORDER_COMPONENTS') {
            request.input('Id', sql.BigInt, bomData.Id);
            // Passaggio dell'array di componenti da riordinare
            const componentsTable = new sql.Table();
            componentsTable.columns.add('Line', sql.Int);
            componentsTable.columns.add('NewOrder', sql.Int);
            
            bomData.Components.forEach(comp => {
                componentsTable.rows.add(comp.Line, comp.NewOrder);
            });
            
            request.input('ComponentsOrder', componentsTable);
        }
        // CASO 6: Azioni relative ai componenti (ADD_COMPONENT, UPDATE_COMPONENT, DELETE_COMPONENT)
        else if (action.includes('COMPONENT')) {
            console.log(`[${action}] Processing component action with data:`, {
                Id: bomData.Id,
                Line: bomData.Line,
                ComponentId: bomData.ComponentId,
                ComponentCode: bomData.ComponentCode,
                bomData: bomData
            });
            
            request.input('Id', sql.BigInt, bomData.Id);
            request.input('ComponentAction', sql.NVarChar(50), action.replace('_COMPONENT', ''));
            
            if (action === 'ADD_COMPONENT' || action === 'UPDATE_COMPONENT') {
                // MODIFICATO: Supporto sia per ComponentId che per ComponentCode
                if (bomData.ComponentId && !bomData.CreateTempComponent) {
                    request.input('ComponentId', sql.Int, bomData.ComponentId);
                } else if (bomData.ComponentCode && !bomData.CreateTempComponent) {
                    request.input('ComponentCode', sql.VarChar(21), bomData.ComponentCode);
                }

                // NUOVO: Supporto per la creazione di componenti temporanei
                if (bomData.CreateTempComponent) {
                    request.input('CreateTempComponent', sql.Bit, true);
                    
                    // Parametri opzionali per il nuovo componente temporaneo
                    if (bomData.TempComponentPrefix) {
                        request.input('TempComponentPrefix', sql.VarChar(10), bomData.TempComponentPrefix);
                    }

                    if (bomData.SourceComponentId) {
                        request.input('SourceComponentId', sql.BigInt, bomData.SourceComponentId);
                    }

                    if (bomData.SourceBOMId) {
                        request.input('SourceBOMId', sql.BigInt, bomData.SourceBOMId);
                    }

                    if (bomData.SourceItemCode) {
                        request.input('SourceItemCode', sql.VarChar(21), bomData.SourceItemCode);
                    }
                }

                // ComponentDescription (opzionale)
                if (bomData.ComponentDescription) {
                    request.input('ComponentDescription', sql.VarChar(128), bomData.Description);
                }

                // Natura del componente (opzionale)
                if (bomData.Nature) {
                    request.input('ComponentNatureValue', sql.Int, bomData.Nature);
                }
                
                // Nuovo supporto per ParentComponentId
                if (bomData.ParentComponentId) {
                    request.input('ParentComponentId', sql.Int, bomData.ParentComponentId);
                }
                
                // Parametri opzionali aggiuntivi
                if (bomData.ImportBOM !== undefined) {
                    request.input('ImportBOM', sql.Bit, bomData.ImportBOM);
                }
                
                if (bomData.MaxLevels !== undefined) {
                    request.input('MaxLevels', sql.Int, bomData.MaxLevels);
                }
                
                // Altri parametri rimangono invariati
                if (bomData.ComponentType !== undefined) {
                    request.input('ComponentType', sql.Int, bomData.ComponentType);
                }
                
                if (bomData.Quantity !== undefined) {
                    request.input('ComponentQuantity', sql.Decimal(18, 5), bomData.Quantity);
                }
                
                if (bomData.UnitCost !== undefined) {
                    request.input('ComponentUnitCost', sql.Float, bomData.UnitCost);
                }
                
                if (bomData.TotalCost !== undefined) {
                    console.log(`[${action}] Setting ComponentTotalCost:`, bomData.TotalCost);
                    request.input('ComponentTotalCost', sql.Float, bomData.TotalCost);
                }
                
                if (bomData.FixedCost !== undefined) {
                    request.input('ComponentFixedCost', sql.Float, bomData.FixedCost);
                }
                
                if (bomData.UoM) {
                    request.input('ComponentUoM', sql.VarChar(10), bomData.UoM);
                }
                
                if (bomData.Details) {
                    request.input('ComponentDetails', sql.NVarChar(sql.MAX), bomData.Details);
                }
                
                if (bomData.Notes) {
                    request.input('ComponentNotes', sql.NVarChar(sql.MAX), bomData.Notes);
                }

                // NUOVO: Parametri fornitore Intercompany per componenti temporanei
                if (bomData.TempSupplierId !== undefined) {
                    request.input('TempSupplierId', sql.VarChar(12), bomData.TempSupplierId);
                }

                if (bomData.TempIntercompanyTargetId !== undefined) {
                    request.input('TempIntercompanyTargetId', sql.Int, bomData.TempIntercompanyTargetId);
                }

                if (bomData.TempSupplierNotes !== undefined) {
                    request.input('TempSupplierNotes', sql.NVarChar(255), bomData.TempSupplierNotes);
                }

                // Flag per indicare se aggiornare i dati fornitore (solo se almeno uno è presente)
                if (bomData.TempSupplierId !== undefined || bomData.TempIntercompanyTargetId !== undefined || bomData.TempSupplierNotes !== undefined) {
                    request.input('UpdateSupplierData', sql.Bit, 1);
                }
            }

            if (action === 'UPDATE_COMPONENT' || action === 'DELETE_COMPONENT') {
                request.input('ComponentLine', sql.Int, bomData.Line);
            }
        }
        // CASO 7: Azioni relative ai cicli (ADD_ROUTING, UPDATE_ROUTING, DELETE_ROUTING)
        else if (action.includes('ROUTING')) {
            request.input('Id', sql.BigInt, bomData.Id);
            request.input('RoutingAction', sql.NVarChar(50), action.replace('_ROUTING', ''));
            request.input('RtgStep', sql.SmallInt, bomData.RtgStep);
            
            if (action === 'ADD_ROUTING' || action === 'UPDATE_ROUTING') {
                request.input('Operation', sql.VarChar(21), bomData.Operation);
                request.input('Notes', sql.VarChar(1024), bomData.Notes);
                request.input('WC', sql.VarChar(8), bomData.WC);
                request.input('ProcessingTime', sql.Int, bomData.ProcessingTime);
                request.input('SetupTime', sql.Int, bomData.SetupTime);
                request.input('NoOfProcessingWorkers', sql.SmallInt, bomData.NoOfProcessingWorkers);
                request.input('NoOfSetupWorkers', sql.SmallInt, bomData.NoOfSetupWorkers);
                request.input('SubId', sql.Int, bomData.SubId);
                request.input('Supplier', sql.VarChar(12), bomData.Supplier);
                request.input('Qty', sql.Float, bomData.Qty);
            }
        }

        // Parametri per la testata della distinta (applicabile solo per ADD, UPDATE, COPY)
        if (['ADD', 'UPDATE', 'COPY'].includes(action)) {
            if (bomData.BOM) request.input('BOM', sql.VarChar(50), bomData.BOM);
            if (bomData.Description) request.input('Description', sql.NVarChar(255), bomData.Description);
            if (bomData.Version) request.input('Version', sql.Int, bomData.Version);
            if (bomData.UoM) request.input('UoM', sql.VarChar(8), bomData.UoM);
            if (bomData.BOMStatus) request.input('BOMStatus', sql.VarChar(50), bomData.BOMStatus);
            if (bomData.ProductionLot !== undefined) request.input('ProductionLot', sql.Int, bomData.ProductionLot);
            
            // Campi di costo
            if (bomData.RMCost !== undefined) request.input('RMCost', sql.Float, bomData.RMCost);
            if (bomData.ProcessingCost !== undefined) request.input('ProcessingCost', sql.Float, bomData.ProcessingCost);
            if (bomData.RMRefillCost !== undefined) request.input('RMRefillCost', sql.Float, bomData.RMRefillCost);
            if (bomData.ProcessingRefillCost !== undefined) request.input('ProcessingRefillCost', sql.Float, bomData.ProcessingRefillCost);
            if (bomData.TotalCost !== undefined) request.input('TotalCost', sql.Float, bomData.TotalCost);
            if (bomData.TotalPrice !== undefined) request.input('TotalPrice', sql.Float, bomData.TotalPrice);
            if (bomData.RefillWaste !== undefined) request.input('RefillWaste', sql.Float, bomData.RefillWaste);
            if (bomData.RefillDiscount !== undefined) request.input('RefillDiscount', sql.Float, bomData.RefillDiscount);
            if (bomData.TotalRefill !== undefined) request.input('TotalRefill', sql.Float, bomData.TotalRefill);
            if (bomData.TransportRefill !== undefined) request.input('TransportRefill', sql.Float, bomData.TransportRefill);
            if (bomData.Details) request.input('Details', sql.NVarChar(sql.MAX), bomData.Details);
            if (bomData.Notes) request.input('Notes', sql.NVarChar(sql.MAX), bomData.Notes);
        }

        // Parametri di output
        request.output('ReturnValue', sql.BigInt);
        request.output('ErrorCode', sql.Int);
        request.output('ErrorMessage', sql.NVarChar(4000));
        request.output('CreatedComponentCode', sql.VarChar(21)); 

        // Esecuzione della stored procedure
        await request.execute('MA_ProjectArticles_AddUpdateBOM');

        // Controllo errori
        const errorCode = request.parameters.ErrorCode.value ? request.parameters.ErrorCode.value : 0;
        if (errorCode !== 0) {
            throw new Error(request.parameters.ErrorMessage.value || `Error code: ${errorCode}`);
        }

        // DEBUG: Controlla il ReturnValue
        const returnValue = request.parameters.ReturnValue.value;
        console.log(`[DEBUG] ReturnValue dalla stored procedure:`, returnValue);
        console.log(`[DEBUG] Tipo ReturnValue:`, typeof returnValue);
        
        const result = {
            success: 1,
            bomId: returnValue,
            msg: `BOM ${action} operation completed successfully`
        };
        
        // DEBUG: Se bomId è null, proviamo a recuperarlo dal database
        if (returnValue === null && action === 'ADD_COMPONENT' && bomData.Id) {
            console.log(`[DEBUG] ReturnValue è null, proviamo a recuperare l'ID dal database`);
            console.log(`[DEBUG] ParentComponentId:`, bomData.ParentComponentId);
            
            // Se c'è un ParentComponentId, potrebbe essere stata creata una nuova BOM per il padre
            if (bomData.ParentComponentId) {
                console.log(`[DEBUG] Verificando se è stata creata una BOM per il componente padre ${bomData.ParentComponentId}`);
                
                const parentBomCheck = await pool.request()
                    .input('CompanyId', sql.Int, companyId)
                    .input('ParentComponentId', sql.BigInt, bomData.ParentComponentId)
                    .query(`
                        SELECT Id, MainRefBOMId, BOM, Description
                        FROM dbo.MA_ProjectArticles_BillOfMaterials
                        WHERE CompanyId = @CompanyId AND ItemId = @ParentComponentId
                        ORDER BY Id DESC
                    `);
                
                if (parentBomCheck.recordset.length > 0) {
                    const parentBomInfo = parentBomCheck.recordset[0];
                    result.bomId = parentBomInfo.Id;
                    console.log(`[DEBUG] Trovata BOM per componente padre:`, parentBomInfo);
                }
            }
            
            // Fallback: usa l'ID originale se non troviamo nulla
            if (!result.bomId) {
                const bomCheck = await pool.request()
                    .input('CompanyId', sql.Int, companyId)
                    .input('BOMId', sql.BigInt, bomData.Id)
                    .query(`
                        SELECT Id, MainRefBOMId
                        FROM dbo.MA_ProjectArticles_BillOfMaterials
                        WHERE CompanyId = @CompanyId AND Id = @BOMId
                    `);
                
                if (bomCheck.recordset.length > 0) {
                    const bomInfo = bomCheck.recordset[0];
                    result.bomId = bomInfo.Id;
                    console.log(`[DEBUG] Recuperato BOM ID originale dal database:`, bomInfo.Id);
                }
            }
        }

        // NUOVO: Aggiungi CreatedComponentCode al risultato se disponibile
        if (request.parameters.CreatedComponentCode && request.parameters.CreatedComponentCode.value) {
            result.createdComponentCode = request.parameters.CreatedComponentCode.value;
        }

        return result;
    } catch (err) {
        console.error(`Error in BOM ${action} operation:`, err);
        throw err;
    }
};

// Visualizzazione distinte base
// Correzione per la funzione getBOMData in projectArticlesManagement.js

const getBOMData = async (action, companyId, id, itemId = null, version = null, options = {}) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        // Parametri obbligatori
        request.input('Action', sql.NVarChar(50), action);
        request.input('CompanyId', sql.Int, companyId);
        
        // Parametri ID (o Id o ItemId)
        if (id) {
            request.input('Id', sql.BigInt, id);
        } else if (itemId) {
            request.input('ItemId', sql.BigInt, itemId);
            if (version) request.input('Version', sql.Int, version);
        } else {
            console.error('Neither Id nor ItemId provided for getBOMData');
            throw new Error('Either Id or ItemId must be provided');
        }

        // Parametri opzionali
        if (options.MaxLevel) request.input('MaxLevel', sql.Int, options.MaxLevel);
        if (options.IncludeDisabled !== undefined) request.input('IncludeDisabled', sql.Bit, options.IncludeDisabled);
        if (options.ExpandPhantoms !== undefined) request.input('ExpandPhantoms', sql.Bit, options.ExpandPhantoms);
        if (options.IncludeRouting !== undefined) request.input('IncludeRouting', sql.Bit, options.IncludeRouting);

        // Parametri di output
        request.output('ErrorCode', sql.Int);
        request.output('ErrorMessage', sql.NVarChar(4000));

        // Esecuzione della stored procedure
        const result = await request.execute('MA_ProjectArticles_GetBOMDatas');

        // Controllo errori
        const errorCode = request.parameters.ErrorCode.value ? request.parameters.ErrorCode.value : 0;
        if (errorCode !== 0) {
            const errorMsg = request.parameters.ErrorMessage.value || `Error code: ${errorCode}`;
            console.error('Error returned from SP:', errorMsg);
            throw new Error(errorMsg);
        }

        // Gestione dei risultati in base all'azione
        let processedResult;
        switch (action) {
            case 'GET_BOM':
                processedResult = result.recordset && result.recordset.length > 0 ? result.recordset[0] : null;
                break;
            case 'GET_BOM_COMPONENTS':
            case 'GET_BOM_ROUTING':
                processedResult = result.recordset || [];
                break;
            case 'GET_BOM_FULL':
                processedResult = {
                    header: result.recordsets && result.recordsets.length > 0 && result.recordsets[0].length > 0 
                        ? result.recordsets[0][0] 
                        : null,
                    components: result.recordsets && result.recordsets.length > 1 
                        ? result.recordsets[1] 
                        : [],
                    routing: result.recordsets && result.recordsets.length > 2 
                        ? result.recordsets[2] 
                        : [],
                    availableVersions: result.recordsets && result.recordsets.length > 3
                        ? result.recordsets[3]
                        : []
                };
                break;
            case 'GET_BOM_MULTILEVEL':
                // CORREZIONE: Per GET_BOM_MULTILEVEL dovremmo utilizzare recordsets[0] per i componenti
                // anche quando non includiamo il routing
                if (result.recordsets && result.recordsets.length > 0) {
                    let components = result.recordsets[0] || [];
                    
                    // Arricchisci i componenti con il ProductionLot dalla loro BOM
                    if (components && components.length > 0) {
                        // Raccogli tutti i BOMId univoci dai componenti (validati come BigInt)
                        const bomIds = [...new Set(components
                            .map(c => c.BOMId || c.ComponentBOMId)
                            .filter(id => id != null && !isNaN(parseInt(id)))
                            .map(id => BigInt(id))
                        )];
                        
                        if (bomIds.length > 0) {
                            // Recupera i ProductionLot per tutti i BOMId usando una query con valori validati
                            const bomIdsList = bomIds.map(id => id.toString()).join(',');
                            const bomProductionLotsQuery = `
                                SELECT Id, ProductionLot
                                FROM MA_ProjectArticles_BillOfMaterials
                                WHERE CompanyId = @CompanyId AND Id IN (${bomIdsList})
                            `;
                            
                            const bomLotsRequest = pool.request()
                                .input('CompanyId', sql.Int, companyId);
                            
                            const bomLotsResult = await bomLotsRequest.query(bomProductionLotsQuery);
                            const bomLotsMap = new Map();
                            bomLotsResult.recordset.forEach(row => {
                                bomLotsMap.set(row.Id.toString(), row.ProductionLot);
                            });
                            
                            // Aggiungi il ProductionLot a ogni componente
                            components = components.map(comp => {
                                const bomId = (comp.BOMId || comp.ComponentBOMId)?.toString();
                                return {
                                    ...comp,
                                    ProductionLot: bomId ? (bomLotsMap.get(bomId) || null) : null,
                                    BOMProductionLot: bomId ? (bomLotsMap.get(bomId) || null) : null
                                };
                            });
                        }
                    }
                    
                    processedResult = {
                        components: components,
                        routing: result.recordsets.length > 1 ? result.recordsets[1] : []
                    };
                } else {
                    // Nessun recordset restituito
                    processedResult = { components: [], routing: [], availableVersions: [] };
                }
                break;
            default:
                console.error(`Invalid action: ${action}`);
                throw new Error(`Invalid action: ${action}`);
        }
        
        return processedResult;
    } catch (err) {
        console.error(`Error in getBOMData (${action}):`, err);
        throw err;
    }
};

// Gestione riferimenti intercompany
const manageReferences = async (action, referenceData, userId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        // Parametri obbligatori
        request.input('Action', sql.NVarChar(50), action);
        request.input('UserId', sql.Int, userId);

        // Parametri in base all'azione
        if (action === 'ADD') {
            request.input('SourceProjectItemId', sql.Int, referenceData.SourceProjectItemId);
            request.input('SourceCompanyId', sql.Int, referenceData.SourceCompanyId);
            request.input('TargetCompanyId', sql.Int, referenceData.TargetCompanyId);
            request.input('Nature', sql.Int, referenceData.Nature);
            
            // Target è opzionale in fase di ADD, se non è ancora stato creato
            if (referenceData.TargetProjectItemId) {
                request.input('TargetProjectItemId', sql.Int, referenceData.TargetProjectItemId);
            }
        } else if (action === 'UPDATE' || action === 'DELETE') {
            request.input('ReferenceID', sql.Int, referenceData.ReferenceID);
            
            if (action === 'UPDATE') {
                if (referenceData.SourceProjectItemId) {
                    request.input('SourceProjectItemId', sql.Int, referenceData.SourceProjectItemId);
                }
                if (referenceData.SourceCompanyId) {
                    request.input('SourceCompanyId', sql.Int, referenceData.SourceCompanyId);
                }
                if (referenceData.TargetProjectItemId) {
                    request.input('TargetProjectItemId', sql.Int, referenceData.TargetProjectItemId);
                }
                if (referenceData.TargetCompanyId) {
                    request.input('TargetCompanyId', sql.Int, referenceData.TargetCompanyId);
                }
                if (referenceData.Nature) {
                    request.input('Nature', sql.Int, referenceData.Nature);
                }
            }
        } else if (action === 'GET') {
            // Per GET, almeno uno dei parametri deve essere specificato
            if (referenceData.ReferenceID) {
                request.input('ReferenceID', sql.Int, referenceData.ReferenceID);
            }
            if (referenceData.SourceProjectItemId) {
                request.input('SourceProjectItemId', sql.Int, referenceData.SourceProjectItemId);
            }
            if (referenceData.TargetProjectItemId) {
                request.input('TargetProjectItemId', sql.Int, referenceData.TargetProjectItemId);
            }
            if (referenceData.SourceCompanyId) {
                request.input('SourceCompanyId', sql.Int, referenceData.SourceCompanyId);
            }
            if (referenceData.TargetCompanyId) {
                request.input('TargetCompanyId', sql.Int, referenceData.TargetCompanyId);
            }
            if (referenceData.Nature) {
                request.input('Nature', sql.Int, referenceData.Nature);
            }
        }

        // Parametri di output
        request.output('ReturnValue', sql.Int);
        request.output('ErrorCode', sql.Int);
        request.output('ErrorMessage', sql.NVarChar(4000));

        // Esecuzione della stored procedure
        const result = await request.execute('MA_ProjectArticles_ManageReferences');

        // Controllo errori
        const errorCode = request.parameters.ErrorCode.value;
        if (errorCode !== 0) {
            throw new Error(request.parameters.ErrorMessage.value || `Error code: ${errorCode}`);
        }

        // Gestione dei risultati in base all'azione
        if (action === 'GET') {
            return result.recordset;
        } else {
            return {
                success: 1,
                referenceId: request.parameters.ReturnValue.value,
                msg: `Reference ${action === 'ADD' ? 'created' : action === 'UPDATE' ? 'updated' : 'deleted'} successfully`
            };
        }
    } catch (err) {
        console.error(`Error in manageReferences (${action}):`, err);
        throw err;
    }
};

// Ottieni stati degli articoli di progetto
const getItemStatuses = async () => {
    try {
        let pool = await sql.connect(config.database);
        const result = await pool.request()
            .query('SELECT Id, StatusCode, Description, Note FROM MA_ProjectsItemsStatus');
        return result.recordset;
    } catch (err) {
        console.error('Error getting item statuses:', err);
        throw err;
    }
};

// Recupera articoli di progetto con paginazione e filtri
const getPaginatedItems = async (companyId, page = 0, pageSize = 50, filters = {}) => {
    try {
        let pool = await sql.connect(config.database);
        
        // Get total count first
        let countQuery = `
            SELECT COUNT(*) AS TotalCount
            FROM dbo.MA_ProjectArticles_Items i
        `;
        
        // Add project join if needed
        if (filters.projectId && filters.projectId !== '0') {
            countQuery += ` JOIN dbo.MA_ProjectsItems ip ON i.Id = ip.ItemId AND i.CompanyId = ip.CompanyId `;
        }
        
        countQuery += ` WHERE i.CompanyId = @CompanyId `;
        
        // Build conditions
        const conditions = [];
        
        if (filters.statusId && filters.statusId !== '0') {
            conditions.push('i.StatusId = @StatusId');
        }
        
        if (filters.nature && filters.nature !== '0') {
            conditions.push('i.Nature = @Nature');
        }
        
        // Aggiungiamo un filtro per articoli dall'ERP, se presente
        if (filters.fromERP === 'true') {
            conditions.push('i.stato_erp = 1');  // CORREZIONE: usa stato_erp invece di fscodice
        } else if (filters.fromERP === 'false') {
            conditions.push('(i.stato_erp = 0 OR i.stato_erp IS NULL)');  // CORREZIONE: usa stato_erp invece di fscodice
        }
        
        if (filters.searchText && filters.searchText.trim() !== '') {
            conditions.push(`(
                i.Item LIKE @SearchText OR 
                i.Description LIKE @SearchText OR 
                i.CustomerItemReference LIKE @SearchText
            )`);
        }
        
        if (filters.projectId && filters.projectId !== '0') {
            conditions.push('ip.ProjectID = @ProjectId');
        }
        
        if (conditions.length > 0) {
            countQuery += ' AND ' + conditions.join(' AND ');
        }
        
        // Now create main data query
        let dataQuery = `
            SELECT TOP(@PageSize)
                i.Id, i.CompanyId, i.Item, i.Description, i.CustomerItemReference,
                i.Diameter, i.Bxh, i.Depth, i.Length, i.MediumRadius,
                i.CategoryId, i.FamilyId, i.MacrofamilyId, i.ItemTypeId,
                i.Nature, i.StatusId, i.fscodice, i.Disabled, i.stato_erp,
                s.StatusCode, s.Description AS StatusDescription,
                CASE 
                    WHEN i.Nature = 22413312 THEN 'Semilavorato'
                    WHEN i.Nature = 22413313 THEN 'Prodotto Finito'
                    WHEN i.Nature = 22413314 THEN 'Acquisto'
                    ELSE 'Altro'
                END AS NatureDescription,
                CASE WHEN i.stato_erp = 1 THEN 1 ELSE 0 END AS IsFromERP
            FROM dbo.MA_ProjectArticles_Items i
            LEFT JOIN dbo.MA_ProjectsItemsStatus s ON i.StatusId = s.Id
        `;
        
        // Add project join if needed
        if (filters.projectId && filters.projectId !== '0') {
            dataQuery = dataQuery.replace(
                'FROM dbo.MA_ProjectArticles_Items i',
                'FROM dbo.MA_ProjectArticles_Items i JOIN dbo.MA_ProjectsItems ip ON i.Id = ip.ItemId AND i.CompanyId = ip.CompanyId'
            );
        }
        
        dataQuery += ` WHERE i.CompanyId = @CompanyId `;
        
        // Add other conditions
        if (conditions.length > 0) {
            dataQuery += ' AND ' + conditions.join(' AND ');
        }
        
        // Add pagination using TOP with ORDER BY and skipping rows
        if (page > 0) {
            const offset = page * pageSize;
            dataQuery = `
                SELECT TOP(@PageSize) *
                FROM (
                    SELECT 
                        i.Id, i.CompanyId, i.Item, i.Description, i.CustomerItemReference,
                        i.Diameter, i.Bxh, i.Depth, i.Length, i.MediumRadius,
                        i.CategoryId, i.FamilyId, i.MacrofamilyId, i.ItemTypeId,
                        i.Nature, i.StatusId, i.fscodice, i.Disabled, i.stato_erp,
                        s.StatusCode, s.Description AS StatusDescription,
                        CASE 
                            WHEN i.Nature = 22413312 THEN 'Semilavorato'
                            WHEN i.Nature = 22413313 THEN 'Prodotto Finito'
                            WHEN i.Nature = 22413314 THEN 'Acquisto'
                            ELSE 'Altro'
                        END AS NatureDescription,
                        CASE WHEN i.stato_erp = 1 THEN 1 ELSE 0 END AS IsFromERP,
                        ROW_NUMBER() OVER (ORDER BY i.Item) AS RowNum
                    FROM dbo.MA_ProjectArticles_Items i
                    LEFT JOIN dbo.MA_ProjectsItemsStatus s ON i.StatusId = s.Id
            `;
            
            // Add project join if needed
            if (filters.projectId && filters.projectId !== '0') {
                dataQuery = dataQuery.replace(
                    'FROM dbo.MA_ProjectArticles_Items i',
                    'FROM dbo.MA_ProjectArticles_Items i JOIN dbo.MA_ProjectsItems ip ON i.Id = ip.ItemId AND i.CompanyId = ip.CompanyId'
                );
            }
            
            dataQuery += ` WHERE i.CompanyId = @CompanyId `;
            
            // Add other conditions
            if (conditions.length > 0) {
                dataQuery += ' AND ' + conditions.join(' AND ');
            }
            
            dataQuery += `) AS Paged WHERE RowNum > @Offset ORDER BY Item`;
        } else {
            dataQuery += ` ORDER BY i.Item`;
        }
        
        // Set up parameters
        const countRequest = pool.request()
            .input('CompanyId', sql.Int, companyId);
        
        const dataRequest = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('PageSize', sql.Int, pageSize);
            
        if (page > 0) {
            dataRequest.input('Offset', sql.Int, page * pageSize);
        }
            
        // Add filter parameters
        if (filters.statusId && filters.statusId !== '0') {
            countRequest.input('StatusId', sql.BigInt, parseInt(filters.statusId));
            dataRequest.input('StatusId', sql.BigInt, parseInt(filters.statusId));
        }
        
        if (filters.nature && filters.nature !== '0') {
            countRequest.input('Nature', sql.Int, parseInt(filters.nature));
            dataRequest.input('Nature', sql.Int, parseInt(filters.nature));
        }
        
        if (filters.searchText && filters.searchText.trim() !== '') {
            const searchText = `%${filters.searchText.trim()}%`;
            countRequest.input('SearchText', sql.NVarChar(100), searchText);
            dataRequest.input('SearchText', sql.NVarChar(100), searchText);
        }
        
        if (filters.projectId && filters.projectId !== '0') {
            countRequest.input('ProjectId', sql.Int, parseInt(filters.projectId));
            dataRequest.input('ProjectId', sql.Int, parseInt(filters.projectId));
        }
        
        // Execute queries
        const countResult = await countRequest.query(countQuery);
        const dataResult = await dataRequest.query(dataQuery);
        
        const totalCount = countResult.recordset[0].TotalCount;
        
        return {
            items: dataResult.recordset,
            total: totalCount,
            page,
            pageSize,
            totalPages: Math.ceil(totalCount / pageSize)
        };
    } catch (err) {
        console.error('Error in getPaginatedItems:', err);
        throw err;
    }
};

// Ottieni dettagli di un articolo di progetto
const getItemById = async (companyId, itemId) => {
    try {
        let pool = await sql.connect(config.database);

        if (!itemId) {
            console.error('getItemById: Missing itemId parameter');
            return null;
        }

        // Query per i dettagli dell'articolo
        const itemResult = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('Id', sql.BigInt, itemId)
            .query(`
                SELECT 
                    i.*, 
                    s.StatusCode, s.Description AS StatusDescription,
                    CASE 
                        WHEN i.Nature = 22413312 THEN 'Semilavorato'
                        WHEN i.Nature = 22413313 THEN 'Prodotto Finito'
                        WHEN i.Nature = 22413314 THEN 'Acquisto'
                        ELSE 'Altro'
                    END AS NatureDescription,
                    CASE WHEN i.stato_erp = 1 THEN 1 ELSE 0 END AS IsFromERP
                FROM dbo.MA_ProjectArticles_Items i
                LEFT JOIN dbo.MA_ProjectsItemsStatus s ON i.StatusId = s.Id
                WHERE i.CompanyId = @CompanyId AND i.Id = @Id
            `);
        
        if (itemResult.recordset.length === 0) {
            return null;
        }
        
        const item = itemResult.recordset[0];
        
        
        try {
            // Query per i progetti associati
            const projectsResult = await pool.request()
                .input('CompanyId', sql.Int, companyId)
                .input('ItemId', sql.BigInt, itemId)
                .query(`
                    SELECT 
                        ip.ProjectID, ip.CustomerItemReference,
                        p.Name AS ProjectName, p.Status AS ProjectStatus
                    FROM dbo.MA_ProjectsItems ip
                    JOIN dbo.MA_Projects p ON ip.ProjectID = p.ProjectID
                    WHERE ip.CompanyId = @CompanyId AND ip.ItemId = @ItemId
                `);
            
            item.projects = projectsResult.recordset;
        } catch (projErr) {
            console.error('Error fetching projects for item:', projErr);
            item.projects = [];
        }
        
        try {
            // Query per le distinte base
            const bomsResult = await pool.request()
                .input('CompanyId', sql.Int, companyId)
                .input('ItemId', sql.BigInt, itemId)
                .query(`
                    SELECT 
                        Id, BOM, Description, Version, UoM, BOMStatus,
                        ProductionLot, TotalCost, TotalPrice, TBCreated
                    FROM dbo.MA_ProjectArticles_BillOfMaterials
                    WHERE CompanyId = @CompanyId AND ItemId = @ItemId
                    ORDER BY Version DESC
                `);
            
            item.boms = bomsResult.recordset;
        } catch (bomErr) {
            console.error('Error fetching BOMs for item:', bomErr);
            item.boms = [];
        }
        
        try {
            // Query per le relazioni intercompany
            const referencesResult = await pool.request()
                .input('CompanyId', sql.Int, companyId)
                .input('ItemId', sql.BigInt, itemId)
                .query(`
                    SELECT 
                        r.ReferenceID, r.SourceProjectItemId, r.SourceCompanyId,
                        r.TargetProjectItemId, r.TargetCompanyId, r.Nature,
                        srcComp.Description AS SourceCompanyName,
                        tgtComp.Description AS TargetCompanyName,
                        srcItem.Item AS SourceItemCode,
                        srcItem.Description AS SourceItemDescription,
                        tgtItem.Item AS TargetItemCode,
                        tgtItem.Description AS TargetItemDescription,
                        tgtItem.Nature AS TargetItemNature,
                        CASE
                            WHEN ISNULL(tgtItem.Nature, r.Nature) = 22413314 THEN 'Acquisto'
                            WHEN ISNULL(tgtItem.Nature, r.Nature) = 22413312 THEN 'Conto Lavoro'
                            WHEN ISNULL(tgtItem.Nature, r.Nature) = 22413313 THEN 'Prodotto Finito'
                            ELSE 'Altro'
                        END AS NatureDescription
                    FROM dbo.MA_ProjectArticles_References r
                    JOIN AR_Companies srcComp ON r.SourceCompanyId = srcComp.CompanyId
                    JOIN AR_Companies tgtComp ON r.TargetCompanyId = tgtComp.CompanyId
                    LEFT JOIN dbo.MA_ProjectArticles_Items srcItem ON r.SourceProjectItemId = srcItem.Id AND r.SourceCompanyId = srcItem.CompanyId
                    LEFT JOIN dbo.MA_ProjectArticles_Items tgtItem ON r.TargetProjectItemId = tgtItem.Id AND r.TargetCompanyId = tgtItem.CompanyId
                    WHERE (r.SourceProjectItemId = @ItemId AND r.SourceCompanyId = @CompanyId)
                       OR (r.TargetProjectItemId = @ItemId AND r.TargetCompanyId = @CompanyId)
                `);
            
            item.references = referencesResult.recordset;
        } catch (refErr) {
            console.error('Error fetching references for item:', refErr);
            item.references = [];
        }
        
        return item;
    } catch (err) {
        console.error('Error in getItemById:', err);
        throw new Error(`Errore nella ricerca dell'articolo: ${err.message}`);
    }
};

// Nuova funzione: ottenere distinte base dal gestionale Mago
const getERPBOMs = async (companyId, searchText = '', pagination = { page: 1, pageSize: 50 }) => {
    try {
        let pool = await sql.connect(config.database);
        
        // Query corretta per recuperare le distinte dal gestionale Mago
        // includendo ItemId, BOMId e Nature se già presenti nelle tabelle di progetto
        let query = `
            SELECT 
                T0.BOM, 
                T0.Description, 
                T0.UoM,
                T0.CreationDate,
                T1.Id AS ItemId,
                T2.Id AS BOMId,
                T3.Nature
            FROM 
                dbo.MA_BillOfMaterials T0
            LEFT JOIN 
                MA_ProjectArticles_Items T1 ON T1.Item = T0.BOM AND T1.CompanyId = T0.CompanyId
            LEFT JOIN 
                MA_ProjectArticles_BillOfMaterials T2 ON T2.ItemId = T1.Id
            LEFT JOIN 
                dbo.MA_Items T3 ON T3.Item = T0.BOM AND T3.CompanyId = T0.CompanyId
            WHERE 
                T0.CompanyId = @CompanyId
                AND T0.Disabled = 0
        `;
        
        // Aggiungi filtro di ricerca se specificato
        if (searchText) {
            query += ` AND (T0.BOM LIKE @SearchText OR T0.Description LIKE @SearchText)`;
        }
        
        // Calcola l'offset per la paginazione
        const offset = (pagination.page - 1) * pagination.pageSize;
        
        // Ordina per BOM e applica la paginazione
        query += ` ORDER BY T0.BOM OFFSET ${offset} ROWS FETCH NEXT ${pagination.pageSize} ROWS ONLY`;
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId);
        
        if (searchText) {
            request.input('SearchText', sql.VarChar(100), `%${searchText}%`);
        }
        
        // Prima eseguiamo la query di conteggio per il totale
        let countQuery = `
            SELECT COUNT(*) AS TotalCount
            FROM dbo.MA_BillOfMaterials T0
            WHERE T0.CompanyId = @CompanyId
            AND T0.Disabled = 0
        `;
        
        if (searchText) {
            countQuery += ` AND (T0.BOM LIKE @SearchText OR T0.Description LIKE @SearchText)`;
        }
        
        const countRequest = pool.request()
            .input('CompanyId', sql.Int, companyId);
        
        if (searchText) {
            countRequest.input('SearchText', sql.VarChar(100), `%${searchText}%`);
        }
        
        const countResult = await countRequest.query(countQuery);
        const totalItems = countResult.recordset[0].TotalCount;
        
        // Ora eseguiamo la query dei dati
        const result = await request.query(query);
        
        // Per ogni distinta, ottieni anche i componenti
        const bomsWithComponents = await Promise.all(
            result.recordset.map(async (bom) => {
                const componentsQuery = `
                    SELECT 
                        comp.Component,
                        comp.ComponentType,
                        comp.Description,
                        comp.UoM,
                        comp.Qty,
                        ISNULL(itm.Nature, 22413312) AS Nature,
                        proj.Id AS ItemId
                    FROM 
                        dbo.MA_BillOfMaterialsComp comp
                    LEFT JOIN 
                        dbo.MA_Items itm ON comp.Component = itm.Item AND comp.CompanyId = itm.CompanyId
                    LEFT JOIN
                        dbo.MA_ProjectArticles_Items proj ON proj.Item = comp.Component AND proj.CompanyId = comp.CompanyId
                    WHERE 
                        comp.BOM = @BOM
                        AND comp.CompanyId = @CompanyId
                    ORDER BY 
                        comp.Line
                `;
                
                const componentsRequest = pool.request()
                    .input('BOM', sql.VarChar(21), bom.BOM)
                    .input('CompanyId', sql.Int, companyId);
                
                const componentsResult = await componentsRequest.query(componentsQuery);
                
                return {
                    ...bom,
                    Components: componentsResult.recordset
                };
            })
        );
        
        // Calcola la paginazione
        const totalPages = Math.ceil(totalItems / pagination.pageSize);
        
        return {
            items: bomsWithComponents,
            pagination: {
                currentPage: pagination.page,
                pageSize: pagination.pageSize,
                totalItems,
                totalPages
            }
        };
    } catch (err) {
        console.error('Error in getERPBOMs:', err);
        throw err;
    }
};

// Nuova funzione: ottenere distinte base di riferimento
const getReferenceBOMs = async (companyId, filters = {}, pagination = { page: 1, pageSize: 50 }) => {
    try {
        let pool = await sql.connect(config.database);
        
        // Calcola l'offset per la paginazione
        const offset = (pagination.page - 1) * pagination.pageSize;
        
        // Costruisci la query per il conteggio totale
        let countQuery = `
            SELECT COUNT(*) AS TotalCount
            FROM dbo.MA_ProjectArticles_BillOfMaterials bom
            JOIN dbo.MA_ProjectArticles_Items itm ON bom.ItemId = itm.Id AND bom.CompanyId = itm.CompanyId
            WHERE bom.CompanyId = @CompanyId
        `;
        
        // Costruisci la query per i dati
        let dataQuery = `
            SELECT 
                bom.Id,
                bom.BOM,
                bom.Description,
                bom.ItemId,
                bom.Version,
                bom.UoM,
                bom.BOMStatus,
                bom.TotalCost,
                bom.ProductionLot,
                itm.Item AS ItemCode,
                itm.Description AS ItemDescription,
                itm.Nature
            FROM dbo.MA_ProjectArticles_BillOfMaterials bom
            JOIN dbo.MA_ProjectArticles_Items itm ON bom.ItemId = itm.Id AND bom.CompanyId = itm.CompanyId
            WHERE bom.CompanyId = @CompanyId
        `;
        
        // Aggiungi condizioni di filtro
        const conditions = [];
        
        // Filtro per categoria
        if (filters.category) {
            if (filters.category === 'prod_fin') {
                conditions.push('itm.Nature = 22413313'); // Prodotto finito
            } else if (filters.category === 'semilav') {
                conditions.push('itm.Nature = 22413312'); // Semilavorato
            } else if (filters.category === 'acquisto') {
                conditions.push('itm.Nature = 22413314'); // Acquisto
            }
        }
        
        // Filtro per natura dell'articolo
        if (filters.nature) {
            conditions.push('itm.Nature = @Nature');
        }
        
        // Filtro per testo di ricerca
        if (filters.search) {
            conditions.push(`(
                bom.BOM LIKE @Search OR 
                bom.Description LIKE @Search OR 
                itm.Item LIKE @Search OR 
                itm.Description LIKE @Search
            )`);
        }
        
        // Filtro per disponibilità
        if (filters.onlyAvailable) {
            conditions.push(`bom.BOMStatus IN ('BOZZA', 'IN PRODUZIONE')`);
        }
        
        // Aggiungi le condizioni alle query
        if (conditions.length > 0) {
            const whereClause = ' AND ' + conditions.join(' AND ');
            countQuery += whereClause;
            dataQuery += whereClause;
        }
        
        // Aggiungi l'ordinamento e la paginazione
        dataQuery += `
            ORDER BY bom.Id DESC
            OFFSET ${offset} ROWS
            FETCH NEXT ${pagination.pageSize} ROWS ONLY
        `;
        
        // Esegui la query di conteggio
        const countRequest = pool.request()
            .input('CompanyId', sql.Int, companyId);
            
        // Aggiungi i parametri per i filtri
        if (filters.nature) {
            countRequest.input('Nature', sql.Int, filters.nature);
        }
        
        if (filters.search) {
            countRequest.input('Search', sql.VarChar(100), `%${filters.search}%`);
        }
        
        const countResult = await countRequest.query(countQuery);
        const totalItems = countResult.recordset[0].TotalCount;
        
        // Esegui la query dei dati
        const dataRequest = pool.request()
            .input('CompanyId', sql.Int, companyId);
            
        // Aggiungi gli stessi parametri anche alla query dei dati
        if (filters.nature) {
            dataRequest.input('Nature', sql.Int, filters.nature);
        }
        
        if (filters.search) {
            dataRequest.input('Search', sql.VarChar(100), `%${filters.search}%`);
        }
        
        const dataResult = await dataRequest.query(dataQuery);
        
        // Per ogni distinta, ottieni anche i componenti
        const bomsWithComponents = await Promise.all(
            dataResult.recordset.map(async (bom) => {
                const componentsQuery = `
                    SELECT 
                        comp.Line,
                        comp.ComponentId,
                        comp.ComponentType,
                        comp.Quantity,
                        comp.UoM,
                        comp.UnitCost,
                        comp.TotalCost,
                        itm.Item AS ComponentCode,
                        itm.Description,
                        itm.Nature
                    FROM 
                        dbo.MA_ProjectArticles_BOMComponents comp
                    LEFT JOIN 
                        dbo.MA_ProjectArticles_Items itm ON comp.ComponentId = itm.Id AND comp.CompanyId = itm.CompanyId
                    WHERE 
                        comp.BOMId = @BOMId
                        AND comp.CompanyId = @CompanyId
                    ORDER BY 
                        comp.Line
                `;
                
                const componentsRequest = pool.request()
                    .input('BOMId', sql.BigInt, bom.Id)
                    .input('CompanyId', sql.Int, companyId);
                
                const componentsResult = await componentsRequest.query(componentsQuery);
                
                return {
                    ...bom,
                    Components: componentsResult.recordset
                };
            })
        );
        
        // Calcola la paginazione
        const totalPages = Math.ceil(totalItems / pagination.pageSize);
        
        return {
            items: bomsWithComponents,
            pagination: {
                currentPage: pagination.page,
                pageSize: pagination.pageSize,
                totalItems,
                totalPages
            }
        };
    } catch (err) {
        console.error('Error in getReferenceBOMs:', err);
        throw err;
    }
};

// Nuova implementazione della funzione reorderBOMComponents
const reorderBOMComponents = async (companyId, bomId, components, userId) => {
    try {
        let pool = await sql.connect(config.database);
        
        // Inizia una transazione
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // Per ogni componente, aggiorniamo la linea rispettando la numerazione dell'ordine
            for (let i = 0; i < components.length; i++) {
                const comp = components[i];
                const oldLine = comp.Line;
                const newOrder = comp.NewOrder;
                
                // Usa un valore temporaneo molto alto per evitare conflitti di chiave primaria
                // durante il riordinamento
                const tempLine = 10000 + i;
                
                // Prima modifica: vecchia linea -> linea temporanea
                const tempUpdateRequest = new sql.Request(transaction);
                tempUpdateRequest.input('CompanyId', sql.Int, companyId);
                tempUpdateRequest.input('BOMId', sql.BigInt, bomId);
                tempUpdateRequest.input('OldLine', sql.Int, oldLine);
                tempUpdateRequest.input('TempLine', sql.Int, tempLine);
                
                await tempUpdateRequest.query(`
                    UPDATE dbo.MA_ProjectArticles_BOMComponents
                    SET Line = @TempLine
                    WHERE CompanyId = @CompanyId AND BOMId = @BOMId AND Line = @OldLine
                `);
            }
            
            // Ora assegna le nuove linee definitive
            for (let i = 0; i < components.length; i++) {
                const comp = components[i];
                const newOrder = comp.NewOrder;
                const tempLine = 10000 + i;
                
                // Seconda modifica: linea temporanea -> nuovo ordine
                const finalUpdateRequest = new sql.Request(transaction);
                finalUpdateRequest.input('CompanyId', sql.Int, companyId);
                finalUpdateRequest.input('BOMId', sql.BigInt, bomId);
                finalUpdateRequest.input('TempLine', sql.Int, tempLine);
                finalUpdateRequest.input('NewOrder', sql.Int, newOrder);
                
                await finalUpdateRequest.query(`
                    UPDATE dbo.MA_ProjectArticles_BOMComponents
                    SET Line = @NewOrder
                    WHERE CompanyId = @CompanyId AND BOMId = @BOMId AND Line = @TempLine
                `);
            }
            
            // Commit della transazione
            await transaction.commit();
            
            return {
                success: 1,
                bomId: bomId,
                msg: 'Componenti riordinati con successo'
            };
        } catch (err) {
            // Rollback della transazione in caso di errore
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Error in reorderBOMComponents:', err);
        throw err;
    }
};


// Ottiene gli articoli temporanei disponibili (non già associati al progetto specificato)
const getAvailableItems = async (companyId, projectId) => {
    try {
        let pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('ProjectId', sql.Int, projectId)
            .query(`
                 SELECT i.*
FROM dbo.MA_ProjectArticles_Items i
WHERE i.CompanyId = @CompanyId 
AND i.Disabled = 0
AND NOT EXISTS ( SELECT * FROM MA_Items WHERE CompanyId = @CompanyId AND Item = i.Item)
ORDER BY i.Item
            `);
        
        return result.recordset;
    } catch (err) {
        console.error('Error getting available items:', err);
        throw err;
    }
};

// Ottiene gli articoli dal gestionale
const getERPItems = async (companyId, search = '') => {
    try {
        let pool = await sql.connect(config.database);
        
        // Query di base per articoli dal gestionale
        let query = `
            SELECT TOP	*
                        T0.Item
                        , T0.Description
                        , T0.Nature
                        , T0.BaseUoM
                        , T0.Department
                        , T1.Id AS ItemId
            FROM		dbo.MA_Items T0
            LEFT JOIN	MA_ProjectArticles_Items T1 ON T1.Item = T0.Item AND T1.CompanyId = T0.CompanyId 
            WHERE		T0.CompanyId = @CompanyId
            AND			T0.Disabled = 0
        `;
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId);
            
        // Aggiungi filtro di ricerca se specificato
        if (search) {
            query += ` AND (Item LIKE @Search OR Description LIKE @Search)`;
            request.input('Search', sql.VarChar(100), `%${search}%`);
        }
        
        // Aggiungi ordinamento
        query += ` ORDER BY Item`;
        
        const result = await request.query(query);
        
        return result.recordset;
    } catch (err) {
        console.error('Error getting ERP items:', err);
        throw err;
    }
};

// Importa un articolo dal gestionale come articolo temporaneo e lo associa al progetto
const importERPItem = async (companyId, userId, projectId, erpItem, importBOM = false, processMultilevelBOM = true, maxLevels = 10) => {
    try {
        let pool = await sql.connect(config.database);
        
        // Verifica che l'articolo esista nel gestionale
        const erpItemResult = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('Item', sql.VarChar(21), erpItem)
            .query(`
                SELECT *
                FROM dbo.MA_Items
                WHERE CompanyId = @CompanyId AND Item = @Item
            `);
            
        if (erpItemResult.recordset.length === 0) {
            return {
                success: 0,
                msg: 'Articolo non trovato nel gestionale'
            };
        }
        
        // Utilizziamo la stored procedure MA_AddUpdateItemProjectFromERP
        const request = pool.request();
        
        // Parametri di input
        request.input('erpItem', sql.VarChar(21), erpItem);
        request.input('companyId', sql.Int, companyId);
        request.input('userId', sql.Int, userId);
        request.input('projectId', sql.Int, projectId);
        
        // Parametri per la gestione della distinta base multilivello
        if (importBOM) {
            request.input('processMultilevelBOM', sql.Bit, processMultilevelBOM);
            request.input('maxLevels', sql.Int, maxLevels);
        } else {
            request.input('processMultilevelBOM', sql.Bit, false);
        }
        
        // Parametri di output
        request.output('ReturnValue', sql.BigInt);
        request.output('ErrorCode', sql.Int);
        request.output('ErrorMessage', sql.NVarChar(4000));
        
        // Esecuzione della stored procedure con gestione appropriata del risultato
        const result = await request.execute('MA_AddUpdateItemProjectFromERP');
        
        // Controllo errori
        const errorCode = request.parameters.ErrorCode.value || 0;
        if (errorCode !== 0) {
            return {
                success: 0,
                msg: request.parameters.ErrorMessage.value || `Errore codice: ${errorCode}`
            };
        }
        
        // Estrazione corretta del valore di ritorno
        const returnValue = request.parameters.ReturnValue.value;
        
        // Verifica esplicita del valore ritornato
        if (!returnValue || returnValue === 0) {
            // Tenta di recuperare l'ID direttamente dal database
            const itemQuery = await pool.request()
                .input('CompanyId', sql.Int, companyId)
                .input('ERP_Item', sql.VarChar(21), erpItem)
                .query(`
                    SELECT TOP 1 Id
                    FROM dbo.MA_ProjectArticles_Items
                    WHERE Item = @ERP_Item AND CompanyId = @CompanyId
                    ORDER BY Id DESC
                `);
            
            if (itemQuery.recordset && itemQuery.recordset.length > 0) {
                return {
                    success: 1,
                    itemId: itemQuery.recordset[0].Id,
                    msg: importBOM ? 
                        `Articolo importato con successo insieme alla distinta base` : 
                        `Articolo importato con successo`
                };
            }
            
            return {
                success: 0,
                msg: 'Operazione completata ma nessun ID articolo restituito'
            };
        }
    } catch (err) {
        console.error('Error importing ERP item:', err);
        return {
            success: 0,
            msg: err.message || 'Errore durante l\'importazione dell\'articolo'
        };
    }
};

// Associa un articolo temporaneo esistente a un progetto
const linkItemToProject = async (companyId, projectId, itemId) => {
    try {
        let pool = await sql.connect(config.database);
        
        // Verifica che l'articolo esista
        const itemResult = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('ItemId', sql.BigInt, itemId)
            .query(`
                SELECT 1
                FROM dbo.MA_ProjectArticles_Items
                WHERE CompanyId = @CompanyId AND Id = @ItemId
            `);
            
        if (itemResult.recordset.length === 0) {
            return {
                success: 0,
                msg: 'Articolo temporaneo non trovato'
            };
        }
        
        // Verifica che l'articolo non sia già associato al progetto
        const associationResult = await pool.request()
            .input('ProjectID', sql.Int, projectId)
            .input('ItemId', sql.BigInt, itemId)
            .query(`
                SELECT 1
                FROM dbo.MA_ProjectsItems
                WHERE ProjectID = @ProjectID AND ItemId = @ItemId
            `);
            
        if (associationResult.recordset.length > 0) {
            return {
                success: 0,
                msg: 'Articolo già associato al progetto'
            };
        }
        
        // Associa l'articolo al progetto
        await pool.request()
            .input('ProjectID', sql.Int, projectId)
            .input('ItemId', sql.BigInt, itemId)
            .input('CompanyId', sql.Int, companyId)
            .query(`
                INSERT INTO dbo.MA_ProjectsItems (
                    ProjectID, ItemId, CompanyId, TBCreated
                ) VALUES (
                    @ProjectID, @ItemId, @CompanyId, GETDATE()
                )
            `);
        
        return {
            success: 1,
            msg: 'Articolo associato al progetto con successo'
        };
    } catch (err) {
        console.error('Error linking item to project:', err);
        throw err;
    }
};

/**
 * Copia una distinta base da un articolo sorgente a un articolo destinazione
 * @param {number} companyId - ID dell'azienda
 * @param {number} targetItemId - ID dell'articolo destinatario
 * @param {number} sourceItemId - ID dell'articolo sorgente (opzionale)
 * @param {string} sourceType - Tipo di sorgente ('temporary' o 'defined')
 * @param {number} userId - ID dell'utente che esegue l'operazione
 * @returns {Promise<Object>} - Risultato dell'operazione
 */
const copyBOMFromItem = async (companyId, targetItemId, sourceItemId = null, sourceType = 'temporary', userId) => {
    try {
        // Se abbiamo un sourceItemId e sourceType è 'temporary', cerchiamo la distinta base
        // nell'articolo temporaneo
        if (sourceItemId && sourceType === 'temporary') {
            // Ottieni la distinta base dell'articolo sorgente
            const sourceBom = await getBOMData('GET_BOM_FULL', companyId, null, sourceItemId, null, 
                { includeRouting: true });
            
            if (!sourceBom || !sourceBom.header) {
                return {
                    success: 0,
                    msg: "L'articolo sorgente non ha una distinta base"
                };
            }
            
            // Creiamo una nuova distinta per l'articolo target
            // Otteniamo prima i dettagli dell'articolo target per creare la distinta con i dati corretti
            const targetItem = await getItemById(companyId, targetItemId);
            
            if (!targetItem) {
                return {
                    success: 0,
                    msg: "Articolo destinazione non trovato"
                };
            }
            
            // Prepariamo i dati per la nuova distinta
            const newBomData = {
                ItemId: targetItemId,
                BOM: `BOM_${targetItem.Item || 'TEMP'}`,
                Description: `Distinta base di ${targetItem.Item || 'articolo temporaneo'}`,
                Version: 1,
                UoM: targetItem.BaseUoM || 'PZ',
                BOMStatus: 'BOZZA',
                ProductionLot: 1,
                SourceBOMId: sourceBom.header.Id,
                CopyComponents: true,
                CopyRouting: true
            };
            
            // Creiamo la distinta base copiandola dalla sorgente
            const result = await addUpdateBOM('COPY', companyId, newBomData, userId);
            
            return {
                success: result.success,
                bomId: result.bomId,
                msg: result.msg || "Distinta base copiata con successo"
            };
        } else if (sourceType === 'defined') {
            // Per articoli dal gestionale, dobbiamo cercare la distinta base nel gestionale
            // Otteniamo prima i dettagli dell'articolo target per trovare il suo codice ERP
            const targetItem = await getItemById(companyId, targetItemId);
            
            if (!targetItem) {
                return {
                    success: 0,
                    msg: "Articolo destinazione non trovato"
                };
            }
            
            // Cerchiamo la distinta base nel gestionale
            const erpBoms = await getERPBOMs(companyId, targetItem.Item);
            
            if (!erpBoms || erpBoms.length === 0) {
                return {
                    success: 0,
                    msg: "Nessuna distinta base trovata nel gestionale per questo articolo"
                };
            }
            
            // Creiamo una nuova distinta base con i dati dell'articolo
            const newBomData = {
                ItemId: targetItemId,
                BOM: `BOM_${targetItem.Item || 'TEMP'}`,
                Description: `Distinta base di ${targetItem.Item || 'articolo temporaneo'}`,
                Version: 1,
                UoM: targetItem.BaseUoM || 'PZ',
                BOMStatus: 'BOZZA',
                ProductionLot: 1
            };
            
            // Creiamo la distinta base
            const result = await addUpdateBOM('ADD', companyId, newBomData, userId);
            
            if (!result.success) {
                return result;
            }
            
            const newBomId = result.bomId;
            
            // Aggiungiamo i componenti dalla distinta base ERP
            const erpBom = erpBoms[0]; // Prendiamo la prima distinta trovata
            
            if (erpBom.Components && erpBom.Components.length > 0) {
                // Array per tenere traccia dei componenti aggiunti
                const addedComponents = [];
                
                for (const comp of erpBom.Components) {
                    try {
                        // Verifichiamo se il componente esiste già come articolo temporaneo
                        // altrimenti lo creiamo
                        let componentItemId;
                        
                        // Cerchiamo prima un articolo temporaneo con lo stesso codice ERP --> Cerca utilizzando stato_erp = 1 
                        const existingItemQuery = await pool.request()
                            .input('CompanyId', sql.Int, companyId)
                            .input('ERP_Code', sql.VarChar(21), comp.Component)
                            .query(`
                                SELECT Id FROM dbo.MA_ProjectArticles_Items
                                WHERE CompanyId = @CompanyId AND Item = @ERP_Code AND stato_erp = 1
                            `);
                            
                        if (existingItemQuery.recordset && existingItemQuery.recordset.length > 0) {
                            // Utilizziamo l'articolo temporaneo esistente
                            componentItemId = existingItemQuery.recordset[0].Id;
                        } else {
                            // Dobbiamo creare un nuovo articolo temporaneo
                            // Otteniamo prima i dettagli dal gestionale
                            const erpItemQuery = await pool.request()
                                .input('CompanyId', sql.Int, companyId)
                                .input('Item', sql.VarChar(21), comp.Component)
                                .query(`
                                    SELECT * FROM dbo.MA_Items
                                    WHERE CompanyId = @CompanyId AND Item = @Item
                                `);
                                
                            if (erpItemQuery.recordset && erpItemQuery.recordset.length > 0) {
                                const erpItem = erpItemQuery.recordset[0];
                                
                                // Dati per creare l'articolo temporaneo --> Imposta stato_erp = 1 
                                const newItemData = {
                                    Item: erpItem.Item,
                                    Description: erpItem.Description,
                                    Nature: erpItem.Nature || 22413314, // Default Acquisto
                                    StatusId: 1, // BOZZA
                                    BaseUoM: erpItem.BaseUoM || 'PZ',
                                    stato_erp: 1,
                                    data_sync_erp: new Date()
                                };
                                
                                // Creiamo l'articolo temporaneo
                                const newItem = await addUpdateItem('ADD', companyId, newItemData, userId);
                                
                                if (newItem.success) {
                                    componentItemId = newItem.itemId;
                                }
                            }
                        }
                        
                        // Aggiungiamo il componente alla distinta base solo se abbiamo trovato o creato l'articolo
                        if (componentItemId) {
                            const compData = {
                                Id: newBomId,
                                ComponentId: componentItemId,
                                ComponentType: comp.ComponentType || 0,
                                Quantity: comp.Qty || 1,
                                UoM: comp.UoM || 'PZ',
                                UnitCost: 0,
                                TotalCost: 0,
                                FixedCost: 0
                            };
                            
                            const addCompResult = await addUpdateBOM('ADD_COMPONENT', companyId, compData, userId);
                            
                            if (addCompResult.success) {
                                addedComponents.push(componentItemId);
                            }
                        }
                    } catch (compError) {
                        console.error('Error adding component from ERP:', compError);
                        // Continuiamo con il prossimo componente anche se questo fallisce
                    }
                }
                
                return {
                    success: 1,
                    bomId: newBomId,
                    componentsAdded: addedComponents.length,
                    msg: `Distinta base creata con ${addedComponents.length} componenti`
                };
            } else {
                return {
                    success: 1,
                    bomId: newBomId,
                    msg: "Distinta base creata senza componenti (nessun componente trovato nel gestionale)"
                };
            }
        } else {
            return {
                success: 0,
                msg: "Tipo di sorgente non valido o dati mancanti"
            };
        }
    } catch (err) {
        console.error('Error in copyBOMFromItem:', err);
        throw err;
    }
};

// Sostituisci un componente con un componente esistente
const replaceComponent = async (companyId, bomId, componentLine, newComponentId, newComponentCode, userId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();
        
        // Imposta un timeout più lungo per la stored procedure
        request.timeout = 30000; // 30 secondi
        
        // Parametri richiesti
        request.input('Action', sql.NVarChar(50), 'REPLACE_COMPONENT');
        request.input('CompanyId', sql.Int, companyId);
        request.input('Id', sql.BigInt, bomId);
        request.input('ComponentLine', sql.Int, componentLine);
        request.input('ComponentId', sql.Int, newComponentId);
        request.input('ComponentCode', sql.VarChar(64), newComponentCode);
        request.input('UserId', sql.Int, userId);
        // Di default @CreateTempComponent = 0
        request.input('CreateTempComponent', sql.Bit, 0);
        // Output parameters
        request.output('ReturnValue', sql.BigInt);
        request.output('ErrorCode', sql.Int);
        request.output('ErrorMessage', sql.NVarChar(4000));
        request.output('CreatedComponentCode', sql.VarChar(64));
        
        // Execute the stored procedure
        const result = await request.execute('MA_ProjectArticles_AddUpdateBOM');
        
        // Controllo valori dei parametri di output
        const returnValue = request.parameters.ReturnValue.value || 0;
        const errorCode = request.parameters.ErrorCode.value || 0;
        const errorMessage = request.parameters.ErrorMessage.value || '';
        
        // Check for errors
        if (errorCode !== 0) {
            throw new Error(errorMessage || `Error code: ${errorCode}`);
        }
        
        // Se arriviamo qui ma returnValue è null, c'è comunque un problema
        if (returnValue === null) {
            // Verifichiamo se l'operazione è stata eseguita controllando direttamente il database
            const checkQuery = `
                SELECT * FROM dbo.MA_ProjectArticles_BOMComponents 
                WHERE BOMId = @BOMId AND Line = @Line AND CompanyId = @CompanyId`;
            
            const checkRequest = pool.request()
                .input('BOMId', sql.BigInt, bomId)
                .input('Line', sql.Int, componentLine)
                .input('CompanyId', sql.Int, companyId);
                
            const checkResult = await checkRequest.query(checkQuery);
            
            if (checkResult.recordset && checkResult.recordset.length > 0) {
                const componentIdAfterReplace = checkResult.recordset[0].ComponentId;
                
                if (componentIdAfterReplace == newComponentId) {
                    // La sostituzione è avvenuta con successo nonostante i valori di ritorno null
                    return {
                        success: 1,
                        bomId: bomId,
                        msg: "Componente sostituito con successo (verificato nel database)"
                    };
                }
            }
            
            throw new Error("La stored procedure non ha restituito valori e la verifica nel database non ha confermato l'operazione");
        }
        
        return {
            success: 1,
            bomId: returnValue,
            msg: "Componente sostituito con successo"
        };
    } catch (err) {
        console.error('Error replacing component:', err);
        throw err;
    }
};

// Sostituisci un componente con un nuovo componente temporaneo
const replaceWithNewComponent = async (companyId, bomId, componentLine, newComponentData, userId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();
        
        // Parametri richiesti
        request.input('Action', sql.NVarChar(50), 'REPLACE_WITH_NEW_COMPONENT');
        request.input('CompanyId', sql.Int, companyId);
        request.input('Id', sql.BigInt, bomId);
        request.input('ComponentLine', sql.Int, componentLine);
        request.input('UserId', sql.Int, userId);
        
        // NUOVO: Gestione per la creazione di componenti temporanei
        if (newComponentData.createTempComponent) {
            request.input('CreateTempComponent', sql.Bit, true);
            
            // Parametri opzionali per il nuovo componente temporaneo
            if (newComponentData.tempComponentPrefix) {
                request.input('TempComponentPrefix', sql.VarChar(10), newComponentData.tempComponentPrefix);
            }
            
            // Dati del componente temporaneo
            request.input('NewCompDescription', sql.VarChar(128), newComponentData.Description);
            request.input('NewCompNature', sql.Int, newComponentData.Nature);
            request.input('NewCompBaseUoM', sql.VarChar(3), newComponentData.BaseUoM);
            request.input('ComponentQuantity', sql.Decimal(18, 5), newComponentData.Quantity);
        } else {
            // Comportamento originale per i codici manuali
            request.input('NewCompItem', sql.VarChar(64), newComponentData.Item);
            request.input('NewCompDescription', sql.VarChar(128), newComponentData.Description);
            request.input('NewCompNature', sql.Int, newComponentData.Nature);
            request.input('NewCompBaseUoM', sql.VarChar(3), newComponentData.BaseUoM);
            request.input('ComponentQuantity', sql.Decimal(18, 5), newComponentData.Quantity);
        }
        
        // Parametro per l'opzione di copia della distinta
        if (newComponentData.CopyBOM !== undefined) {
            request.input('CopyBOM', sql.Bit, newComponentData.CopyBOM);
        }
        
        // Output parameters
        request.output('ReturnValue', sql.BigInt);
        request.output('ErrorCode', sql.Int);
        request.output('ErrorMessage', sql.NVarChar(4000));
        request.output('CreatedComponentCode', sql.VarChar(64));

        // Execute the stored procedure
        const spResult = await request.execute('MA_ProjectArticles_AddUpdateBOM');
        
        // Check for errors
        const errorCode = request.parameters.ErrorCode.value;
        if (errorCode !== 0) {
            throw new Error(request.parameters.ErrorMessage.value || `Error code: ${errorCode}`);
        }
        
        const result = {
            success: 1,
            newComponentId: request.parameters.ReturnValue.value,
            msg: "Componente sostituito con successo"
        };
        
        // Aggiungi il codice generato al risultato se disponibile
        if (request.parameters.CreatedComponentCode && request.parameters.CreatedComponentCode.value) {
            result.createdComponentCode = request.parameters.CreatedComponentCode.value;
        }
        
        return result;
    } catch (err) {
        console.error('Error replacing with new component:', err);
        throw err;
    }
};

// Elimina un articolo dal progetto (rimuove solo l'associazione)
const unlinkItemFromProject = async (companyId, projectId, itemId) => {
    try {
        let pool = await sql.connect(config.database);
        
        // Verifica se l'associazione esiste
        const checkResult = await pool.request()
            .input('ProjectID', sql.Int, projectId)
            .input('ItemId', sql.BigInt, itemId)
            .query(`
                SELECT 1 FROM dbo.MA_ProjectsItems
                WHERE ProjectID = @ProjectID AND ItemId = @ItemId
            `);
            
        if (checkResult.recordset.length === 0) {
            return {
                success: 0,
                msg: 'Articolo non associato al progetto'
            };
        }
        
        // Elimina l'associazione
        await pool.request()
            .input('ProjectID', sql.Int, projectId)
            .input('ItemId', sql.BigInt, itemId)
            .query(`
                DELETE FROM dbo.MA_ProjectsItems
                WHERE ProjectID = @ProjectID AND ItemId = @ItemId
            `);
        
        return {
            success: 1,
            msg: 'Articolo rimosso dal progetto con successo'
        };
    } catch (err) {
        console.error('Error unlinking item from project:', err);
        throw err;
    }
};

// Disabilita un articolo temporaneo (lo marca come eliminato)
const disableTemporaryItem = async (companyId, itemId) => {
    try {
        let pool = await sql.connect(config.database);
        
        // Verifica che l'articolo esista
        const checkResult = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('Id', sql.BigInt, itemId)
            .query(`
                SELECT Item, Disabled, stato_erp FROM dbo.MA_ProjectArticles_Items
                WHERE CompanyId = @CompanyId AND Id = @Id
            `);
            
        if (checkResult.recordset.length === 0) {
            return {
                success: 0,
                msg: 'Articolo non trovato'
            };
        }
        
        // Verifica che l'articolo non sia già disabilitato
        const item = checkResult.recordset[0];
        if (item.Disabled === 1) {
            return {
                success: 0,
                msg: 'Articolo già disabilitato'
            };
        }
        
        // Verifica che l'articolo non sia dal gestionale
        if (item.stato_erp === 1) {
            return {
                success: 0,
                msg: 'Non è possibile disabilitare un articolo importato dal gestionale'
            };
        }
        
        // Disabilita l'articolo
        await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('Id', sql.BigInt, itemId)
            .query(`
                UPDATE dbo.MA_ProjectArticles_Items
                SET Disabled = 1
                WHERE CompanyId = @CompanyId AND Id = @Id
            `);
        
        return {
            success: 1,
            msg: 'Articolo disabilitato con successo'
        };
    } catch (err) {
        console.error('Error disabling temporary item:', err);
        throw err;
    }
};

// Controlla se un articolo può essere disabilitato
const canDisableItem = async (companyId, itemId) => {
    try {
        let pool = await sql.connect(config.database);
        
        // Verifica che l'articolo esista
        const itemResult = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('Id', sql.BigInt, itemId)
            .query(`
                SELECT Item, Disabled, stato_erp FROM dbo.MA_ProjectArticles_Items
                WHERE CompanyId = @CompanyId AND Id = @Id
            `);
            
        if (itemResult.recordset.length === 0) {
            return {
                canDisable: false,
                reason: 'Articolo non trovato'
            };
        }
        
        const item = itemResult.recordset[0];
        
        // Verifica che l'articolo non sia già disabilitato
        if (item.Disabled === 1) {
            return {
                canDisable: false,
                reason: 'Articolo già disabilitato'
            };
        }
        
        // Verifica che l'articolo non sia dal gestionale
        if (item.stato_erp === 1) {
            return {
                canDisable: false,
                reason: 'Non è possibile disabilitare un articolo importato dal gestionale'
            };
        }
        
        // Verifica se l'articolo è associato ad altri progetti
        const projectsResult = await pool.request()
            .input('ItemId', sql.BigInt, itemId)
            .query(`
                SELECT COUNT(*) AS ProjectCount FROM dbo.MA_ProjectsItems
                WHERE ItemId = @ItemId
            `);
            
        const projectCount = projectsResult.recordset[0].ProjectCount;
        
        // Verifica se l'articolo è componente in altre distinte
        const componentResult = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('ComponentId', sql.BigInt, itemId)
            .query(`
                SELECT COUNT(*) AS ComponentCount FROM dbo.MA_ProjectArticles_BOMComponents
                WHERE CompanyId = @CompanyId AND ComponentId = @ComponentId
            `);
            
        const componentCount = componentResult.recordset[0].ComponentCount;
        
        if (projectCount > 1 || componentCount > 0) {
            return {
                canDisable: false,
                reason: `Impossibile disabilitare l'articolo perché è ${projectCount > 1 ? 'associato ad altri progetti' : ''} ${projectCount > 1 && componentCount > 0 ? ' e ' : ''} ${componentCount > 0 ? 'utilizzato come componente in altre distinte' : ''}`
            };
        }
        
        return {
            canDisable: true
        };
    } catch (err) {
        console.error('Error checking if item can be disabled:', err);
        return {
            canDisable: false,
            reason: 'Errore durante la verifica'
        };
    }
};

// Ottieni centri di lavoro
const getWorkCenters = async (companyId) => {
    try {
      let pool = await sql.connect(config.database);
      
      const result = await pool.request()
        .input('CompanyId', sql.Int, companyId)
        .query(`
          SELECT 
            WC, 
            Description, 
            Supplier, 
            Outsourced, 
            HourlyCost,
            UnitCost,
            AdditionalCost,
            Template,
            Notes
          FROM dbo.MA_WorkCenters
          WHERE CompanyId = @CompanyId
          ORDER BY WC
        `);
      
      return result.recordset;
    } catch (err) {
      console.error('Error getting work centers:', err);
      throw err;
    }
  };

// Ottieni operazioni
const getOperations = async (companyId) => {
    try {
      let pool = await sql.connect(config.database);
      
      const result = await pool.request()
        .input('CompanyId', sql.Int, companyId)
        .query(`
          SELECT 
            Operation, 
            Description, 
            WC, 
            Notes
          FROM dbo.MA_Operations
          WHERE CompanyId = @CompanyId
          ORDER BY Operation
        `);
      
      return result.recordset;
    } catch (err) {
      console.error('Error getting operations:', err);
      throw err;
    }
  };
  
// Ottieni fornitori
const getSuppliers = async (companyId) => {
    try {
      let pool = await sql.connect(config.database);
      
      const result = await pool.request()
        .input('CompanyId', sql.Int, companyId)
        .input('CustSuppType', sql.Int, 3211265) // Filtro solo fornitori
        .query(`
          SELECT 
            CustSupp, 
            CompanyName, 
            ContactPerson,
            EMail,
            Telephone1,
            IntercompanyId,
            CASE WHEN IntercompanyId IS NOT NULL THEN 1 ELSE 0 END AS IsIntercompany
          FROM dbo.MA_CustSupp
          WHERE CompanyId = @CompanyId AND CustSuppType = @CustSuppType AND Disabled = 0
          ORDER BY CompanyName
        `);
      
      return result.recordset;
    } catch (err) {
      console.error('Error getting suppliers:', err);
      throw err;
    }
  };

  // Ottiene tutte le versioni di una distinta base per un articolo
const getBOMVersions = async (companyId, itemId) => {
    try {
      let pool = await sql.connect(config.database);
      
      const result = await pool.request()
        .input('CompanyId', sql.Int, companyId)
        .input('ItemId', sql.BigInt, itemId)
        .query(`
          SELECT 
            Id, BOM, Version, Description, BOMStatus,
            TotalCost as LastCalculatedCost,
            TBCreated as CreatedDate,
            TBCreated as ModifiedDate
          FROM dbo.MA_ProjectArticles_BillOfMaterials
          WHERE CompanyId = @CompanyId AND ItemId = @ItemId
          ORDER BY Version DESC
        `);
      
      return result.recordset;
    } catch (err) {
      console.error('Error getting BOM versions:', err);
      throw err;
    }
  };

  // Riordinamento in batch dei cicli di una distinta
const reorderBOMRoutings = async (companyId, bomId, cycles, userId) => {
    try {
      let pool = await sql.connect(config.database);
      
      // Inizia una transazione
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      
      try {
        // Assegna numeri temporanei molto alti per evitare conflitti
        for (let i = 0; i < cycles.length; i++) {
          const cycle = cycles[i];
          const originalRtgStep = cycle.RtgStep;
          const tempRtgStep = 1000 + i; // Numero molto alto e unico
          
          const tempUpdateRequest = new sql.Request(transaction);
          tempUpdateRequest.input('CompanyId', sql.Int, companyId);
          tempUpdateRequest.input('BOMId', sql.BigInt, bomId);
          tempUpdateRequest.input('OldRtgStep', sql.SmallInt, originalRtgStep);
          tempUpdateRequest.input('NewRtgStep', sql.SmallInt, tempRtgStep);
          
          // Prima modifica in numeri temporanei alti
          await tempUpdateRequest.query(`
            UPDATE dbo.MA_ProjectArticles_BOMRouting
            SET RtgStep = @NewRtgStep
            WHERE CompanyId = @CompanyId AND BOMId = @BOMId AND RtgStep = @OldRtgStep
          `);
        }
        
        // Ora assegna i numeri finali
        for (let i = 0; i < cycles.length; i++) {
          const cycle = cycles[i];
          const tempRtgStep = 1000 + i; // Lo stesso usato sopra
          const finalRtgStep = (i + 1) * 10; // Numeri finali in incrementi di 10
          
          const finalUpdateRequest = new sql.Request(transaction);
          finalUpdateRequest.input('CompanyId', sql.Int, companyId);
          finalUpdateRequest.input('BOMId', sql.BigInt, bomId);
          finalUpdateRequest.input('TempRtgStep', sql.SmallInt, tempRtgStep);
          finalUpdateRequest.input('FinalRtgStep', sql.SmallInt, finalRtgStep);
          
          // Aggiorna dal numero temporaneo al numero finale
          await finalUpdateRequest.query(`
            UPDATE dbo.MA_ProjectArticles_BOMRouting
            SET RtgStep = @FinalRtgStep
            WHERE CompanyId = @CompanyId AND BOMId = @BOMId AND RtgStep = @TempRtgStep
          `);
        }
        
        // Commit della transazione
        await transaction.commit();
        
        return {
          success: 1,
          bomId,
          msg: `Cicli riordinati con successo`
        };
      } catch (err) {
        // Rollback in caso di errore
        await transaction.rollback();
        throw err;
      }
    } catch (err) {
      console.error('Error in reorderBOMRoutings:', err);
      throw err;
    }
  };

// funzione per ottenere le unità di misura
const getUnitsOfMeasure = async () => {
    try {
      let pool = await sql.connect(config.database);
      
      const result = await pool.request()
        .query(`
          SELECT 
            BaseUoM, 
            Description 
          FROM MA_UnitsOfMeasure 
          ORDER BY BaseUoM
        `);
      
      return result.recordset;
    } catch (err) {
      console.error('Error getting units of measure:', err);
      throw err;
    }
  };
  
  // funzione per aggiornare i dettagli dell'articolo
const updateItemDetails = async (itemId, itemData) => {
    try {
      let pool = await sql.connect(config.database);
      const request = pool.request();
      
      // Parametri obbligatori
      request.input('Id', sql.BigInt, itemId);
      
      // Parametri opzionali in base ai dati forniti
      if (itemData.Code !== undefined) request.input('Item', sql.VarChar(128), itemData.Code);
      if (itemData.Description !== undefined) request.input('Description', sql.VarChar(128), itemData.Description);
      if (itemData.Nature !== undefined) request.input('Nature', sql.Int, itemData.Nature);
      if (itemData.Diameter !== undefined) request.input('Diameter', sql.Float, itemData.Diameter);
      if (itemData.Bxh !== undefined) request.input('Bxh', sql.VarChar(11), itemData.Bxh);
      if (itemData.Depth !== undefined) request.input('Depth', sql.Float, itemData.Depth);
      if (itemData.Length !== undefined) request.input('Length', sql.Float, itemData.Length);
      if (itemData.MediumRadius !== undefined) request.input('MediumRadius', sql.Float, itemData.MediumRadius);
      if (itemData.CustomerItemReference !== undefined) request.input('CustomerItemReference', sql.VarChar(64), itemData.CustomerItemReference);
      
      
      // Costruisci la query di aggiornamento in base ai campi forniti
      let updateFields = [];
      
      if (itemData.Code !== undefined) updateFields.push('Item = @Item');
      if (itemData.Description !== undefined) updateFields.push('Description = @Description');
      if (itemData.Nature !== undefined) updateFields.push('Nature = @Nature');
      if (itemData.Diameter !== undefined) updateFields.push('Diameter = @Diameter');
      if (itemData.Bxh !== undefined) updateFields.push('Bxh = @Bxh');
      if (itemData.Depth !== undefined) updateFields.push('Depth = @Depth');
      if (itemData.Length !== undefined) updateFields.push('Length = @Length');
      if (itemData.MediumRadius !== undefined) updateFields.push('MediumRadius = @MediumRadius');
      if (itemData.CustomerItemReference !== undefined) updateFields.push('CustomerItemReference = @CustomerItemReference');

      
      // Se non ci sono campi da aggiornare, esci
      if (updateFields.length === 0) {
        return { success: 1, msg: "Nessun campo da aggiornare" };
      }
      
      // Esegui la query di aggiornamento
      const result = await request.query(`
        UPDATE MA_ProjectArticles_Items
        SET ${updateFields.join(', ')}
        WHERE Id = @Id
      `);
      
      return { 
        success: 1, 
        rowsAffected: result.rowsAffected[0], 
        msg: `Dettagli articolo aggiornati con successo` 
      };
    } catch (err) {
      console.error('Error updating item details:', err);
      return { success: 0, msg: err.message };
    }
  };

// Importa un articolo dal gestionale con selezione dei componenti
const importERPItemWithSelection = async (companyId, userId, projectId, importData) => {
    let pool;
    
    try {
        pool = await sql.connect(config.database);

        // NON usare transazioni esterne - la stored procedure gestisce le proprie transazioni
        const request = pool.request();

        // IMPORTANTE: Aumenta timeout per gestire BOM con molti componenti
        // Default: 120 secondi (2 minuti) - troppo poco per BOM grandi
        // Nuovo: 300 secondi (5 minuti) - gestisce fino a ~100 componenti
        request.timeout = 300000; // 5 minuti in millisecondi
        
        // Estrai il codice articolo dal sourceItem
        const sourceItemCode = importData.sourceItem.Item || importData.sourceItem.BOM || '';
        const sourceItemDescription = importData.sourceItem.Description || '';
        
        // Estrai le informazioni della versione BOM selezionata
        const sourceBOMId = importData.sourceBOMId || null;
        const sourceBOMVersion = importData.sourceBOMVersion || null;
        
        const componentsCount = importData.components?.length || 0;

        console.log('Import data:', {
            sourceItemCode,
            sourceItemDescription,
            sourceBOMId,
            sourceBOMVersion,
            createNewBOM: importData.createNewBOM,
            componentsCount
        });

        // AVVISO: Numero componenti elevato
        if (componentsCount > 50) {
            console.warn(`⚠️ ATTENZIONE: Importazione con ${componentsCount} componenti. Potrebbe richiedere diversi minuti.`);
        }
        if (componentsCount > 100) {
            console.warn(`🔴 ALERT: ${componentsCount} componenti potrebbero causare timeout! Considerare split in batch più piccoli.`);
        }

        // DEBUG: Log dei primi 3 componenti ricevuti
        if (importData.components && importData.components.length > 0) {
            console.log('DEBUG: Primi 3 componenti ricevuti:',
                importData.components.slice(0, 3).map(c => ({
                    code: c.ComponentItemCode,
                    level: c.Level,
                    path: c.Path,
                    useOriginal: c.UseOriginalCode
                }))
            );
        } else {
            console.log('ATTENZIONE: Nessun componente nell\'array importData.components!');
        }

        // IMPORTANTE: Definisci il tipo di tabella TVP
        const tvp = new sql.Table('SelectedComponentsTableType');

        // Definisci le colonne del TVP nell'ordine esatto della definizione SQL
        tvp.columns.add('ComponentItemCode', sql.VarChar(64));
        tvp.columns.add('Level', sql.Int);
        tvp.columns.add('Path', sql.NVarChar(sql.MAX));
        tvp.columns.add('UseOriginalCode', sql.Bit);
        tvp.columns.add('Quantity', sql.Decimal(18, 5));
        tvp.columns.add('ComponentType', sql.Int);
        tvp.columns.add('Nature', sql.Int);
        tvp.columns.add('UoM', sql.VarChar(10));

        // Aggiungi i componenti alla tabella
        let addedRowsCount = 0;
        importData.components.forEach((comp, index) => {
            try {
                tvp.rows.add(
                    comp.ComponentItemCode || comp.Component,
                    comp.Level || 0,
                    comp.Path || '',
                    comp.UseOriginalCode ? 1 : 0,  // IMPORTANTE: Converti boolean in bit
                    comp.Quantity || 1,
                    comp.ComponentType || 7798784,
                    comp.Nature || 22413312,
                    comp.UoM || 'NR'  // CORRETTO da 'PZ' a 'NR'
                );
                addedRowsCount++;
            } catch (err) {
                console.error(`Errore aggiungendo componente ${index}:`, err.message, comp);
            }
        });

        console.log(`DEBUG: Righe aggiunte al TVP: ${addedRowsCount} su ${importData.components.length}`);


        
        // Parametri di input
        request.input('CompanyId', sql.Int, companyId);
        request.input('UserId', sql.Int, userId);
        request.input('ProjectId', sql.Int, projectId);
        request.input('SourceItem', sql.NVarChar(64), sourceItemCode);
        request.input('SourceItemDescription', sql.NVarChar(128), sourceItemDescription);
        request.input('CreateNewBOM', sql.Bit, importData.createNewBOM ? 1 : 0);
        request.input('SelectedComponents', tvp);
        
        // Aggiungi i parametri per la versione BOM selezionata
        if (sourceBOMId) {
            request.input('SourceBOMId', sql.BigInt, sourceBOMId);
        }
        if (sourceBOMVersion) {
            request.input('SourceBOMVersion', sql.Int, sourceBOMVersion);
        }
        
        // Parametri di output
        request.output('ReturnItemId', sql.BigInt);
        request.output('ReturnBOMId', sql.BigInt);
        request.output('ImportedComponents', sql.Int);
        request.output('ErrorCode', sql.Int);
        request.output('ErrorMessage', sql.NVarChar(4000));

        // DEBUG: Log parametri prima dell'esecuzione
        console.log('DEBUG: Parametri SP prima dell\'esecuzione:', {
            CompanyId: companyId,
            UserId: userId,
            ProjectId: projectId,
            SourceItem: sourceItemCode,
            CreateNewBOM: importData.createNewBOM ? 1 : 0,
            TVPRowsCount: tvp.rows.length
        });

        // IMPORTANTE: Cattura i messaggi PRINT dalla stored procedure
        // Questo ci permette di vedere dove si ferma la SP quando fallisce
        let spPrintMessages = [];
        request.on('info', info => {
            const msg = info.message;
            console.log('SQL PRINT:', msg);
            spPrintMessages.push(msg);
        });

        // Esegui la stored procedure
        console.log('DEBUG: Esecuzione MA_ProjectArticles_ImportWithSelection...');
        const result = await request.execute('MA_ProjectArticles_ImportWithSelection');
        console.log('DEBUG: SP eseguita, estrazione parametri di output...');
        console.log('DEBUG: Messaggi PRINT ricevuti dalla SP:', spPrintMessages.length);

        // Estrai i valori di output
        const returnItemId = request.parameters.ReturnItemId.value;
        const returnBOMId = request.parameters.ReturnBOMId.value;
        const importedComponents = request.parameters.ImportedComponents.value || 0;
        const errorCode = request.parameters.ErrorCode.value || 0;
        const errorMessage = request.parameters.ErrorMessage.value || '';

        // DEBUG: Log parametri di output con maggiori dettagli
        console.log('DEBUG: Parametri di output dalla SP:', {
            returnItemId: returnItemId,
            returnItemIdType: typeof returnItemId,
            returnBOMId: returnBOMId,
            returnBOMIdType: typeof returnBOMId,
            importedComponents: importedComponents,
            importedComponentsType: typeof importedComponents,
            errorCode: errorCode,
            errorMessage: errorMessage || '(nessun errore)'
        });

        // DEBUG: Log dei parametri raw
        console.log('DEBUG: Parametri RAW:', {
            returnItemIdRaw: request.parameters.ReturnItemId.value,
            returnBOMIdRaw: request.parameters.ReturnBOMId.value,
            importedComponentsRaw: request.parameters.ImportedComponents.value
        });

        // Controllo errori
        if (errorCode !== 0) {
            console.error('SP Error:', {
                errorCode,
                errorMessage
            });

            return {
                success: 0,
                msg: errorMessage || `Errore durante l'importazione. Codice errore: ${errorCode}`
            };
        }

        // CONTROLLO MIGLIORATO: Verifica se l'importazione ha avuto successo
        // Un'importazione è considerata riuscita se:
        // 1. Non ci sono errori (errorCode === 0) E
        // 2. ALMENO UNO tra:
        //    - returnItemId è valorizzato (articolo creato)
        //    - returnBOMId è valorizzato (BOM creata)
        const selectedComponentsCount = importData.components?.length || 0;
        const hasItemId = returnItemId !== null && returnItemId !== undefined;
        const hasBOMId = returnBOMId !== null && returnBOMId !== undefined;
        const hasImportedComponents = importedComponents > 0;

        console.log('DEBUG: Controllo successo importazione:', {
            selectedComponentsCount,
            hasItemId,
            hasBOMId,
            hasImportedComponents,
            importazioneRiuscita: hasItemId || hasBOMId
        });

        // SOLO se NIENTE è stato creato, allora fallisci
        if (selectedComponentsCount > 0 && !hasItemId && !hasBOMId && errorCode === 0) {
            console.error('ATTENZIONE: Importazione fallita silenziosamente!', {
                componenteSelezionati: selectedComponentsCount,
                componenteImportati: importedComponents,
                hasItemId,
                hasBOMId,
                errorCode
            });

            // Stampa gli ultimi messaggi PRINT dalla SP per diagnostica
            if (spPrintMessages.length > 0) {
                console.error('Ultimi messaggi dalla SP:');
                spPrintMessages.slice(-10).forEach((msg, i) => {
                    console.error(`  [${i + 1}] ${msg}`);
                });
            } else {
                console.error('NESSUN messaggio PRINT ricevuto dalla SP - possibile crash o exit precoce');
            }

            return {
                success: 0,
                msg: `Nessun componente importato (${selectedComponentsCount} selezionati). ` +
                     `Possibile timeout o problema di performance. ` +
                     `Prova a selezionare meno componenti (max consigliato: 50).`
            };
        }

        // Se non abbiamo un ID articolo valido, c'è stato un problema
        if (!returnItemId) {
            
            // Prima di fallire, proviamo a recuperare l'articolo appena creato
            try {
                const checkQuery = `
                    SELECT TOP 1 Id 
                    FROM dbo.MA_ProjectArticles_Items 
                    WHERE CompanyId = @CompanyId 
                    AND (Item LIKE 'PROJ_%' OR Item = @SourceItem)
                    ORDER BY Id DESC`;
                
                const checkRequest = pool.request()
                    .input('CompanyId', sql.Int, companyId)
                    .input('SourceItem', sql.NVarChar(64), sourceItemCode);
                    
                const checkResult = await checkRequest.query(checkQuery);
                
                if (checkResult.recordset && checkResult.recordset.length > 0) {
                    const recoveredItemId = checkResult.recordset[0].Id;
                    
                    // Continua con l'ID recuperato
                    return await completeImportResult(
                        pool, 
                        companyId, 
                        recoveredItemId, 
                        returnBOMId, 
                        importedComponents,
                        sourceItemCode
                    );
                }
            } catch (checkErr) {
                console.error('Error trying to recover ItemId:', checkErr);
            }
            
            return {
                success: 0,
                msg: 'Errore durante l\'importazione: nessun articolo creato.'
            };
        }
        
        // Completa il risultato con i dettagli
        return await completeImportResult(
            pool, 
            companyId, 
            returnItemId, 
            returnBOMId, 
            importedComponents,
            sourceItemCode
        );
        
    } catch (err) {
        console.error('Error in importERPItemWithSelection:', err);
        console.error('Error stack:', err.stack);
        
        return {
            success: 0,
            msg: err.message || 'Errore durante l\'importazione con selezione'
        };
    }
};

// Funzione helper per completare il risultato dell'importazione
async function completeImportResult(pool, companyId, itemId, bomId, importedComponents, sourceItemCode) {
    // Ottieni i dettagli dell'articolo importato
    let itemDetails = null;
    try {
        itemDetails = await getItemById(companyId, itemId);

    } catch (err) {
        console.error('Error getting item details:', err);
    }
    
    // Se abbiamo creato componenti, recupera anche loro
    let componentsDetails = [];
    if (importedComponents > 0 && bomId) {
        try {
            const componentsQuery = await pool.request()
                .input('BOMId', sql.BigInt, bomId)
                .input('CompanyId', sql.Int, companyId)
                .query(`
                    SELECT 
                        bc.Line,
                        bc.ComponentId,
                        bc.Quantity,
                        bc.UoM,
                        i.Item as ComponentCode,
                        i.Description as ComponentDescription,
                        i.Nature as ComponentNature
                    FROM dbo.MA_ProjectArticles_BOMComponents bc
                    INNER JOIN dbo.MA_ProjectArticles_Items i 
                        ON bc.ComponentId = i.Id AND bc.CompanyId = i.CompanyId
                    WHERE bc.BOMId = @BOMId AND bc.CompanyId = @CompanyId
                    ORDER BY bc.Line
                `);
            
            componentsDetails = componentsQuery.recordset;

        } catch (err) {
            console.error('Error getting components details:', err);
        }
    }
    
    // Risultato
    return {
        success: 1,
        item: itemDetails || { Id: itemId },
        bomId: bomId,
        importedComponents: importedComponents,
        components: componentsDetails,
        msg: `Articolo ${itemDetails?.Item || sourceItemCode} e ${importedComponents} componenti importati con successo`
    };
}

// Ottieni la struttura BOM multilivello per un articolo ERP
const getERPBOMStructure = async (companyId, itemCode) => {
    try {
        let pool = await sql.connect(config.database);
        
        // Query ricorsiva per ottenere la struttura completa della distinta dall'ERP
        const query = `
            WITH BOMHierarchy AS (
                -- Ancoraggio: articolo root
                SELECT 
                    0 as Level,
                    @ItemCode as ParentItem,
                    @ItemCode as Component,
                    CAST(@ItemCode AS NVARCHAR(MAX)) as Path,
                    CAST(1 AS DECIMAL(18,5)) as Quantity,
                    i.Nature,
                    i.Description,
                    i.BaseUoM as UoM,
                    7798784 as ComponentType,
                    0 as Line
                FROM MA_Items i
                WHERE i.Item = @ItemCode AND i.CompanyId = @CompanyId
                
                UNION ALL
                
                -- Ricorsione: componenti
                SELECT 
                    bh.Level + 1,
                    bc.BOM as ParentItem,
                    bc.Component,
                    bh.Path + '.' + CAST(bc.Component AS NVARCHAR(MAX)),
                    bc.Qty * bh.Quantity,
                    ISNULL(ci.Nature, 22413312),
                    ISNULL(ci.Description, bc.Description),
                    ISNULL(bc.UoM, 'PZ'),
                    bc.ComponentType,
                    bc.Line
                FROM BOMHierarchy bh
                JOIN MA_BillOfMaterialsComp bc ON bc.BOM = bh.Component AND bc.CompanyId = @CompanyId
                LEFT JOIN MA_Items ci ON bc.Component = ci.Item AND ci.CompanyId = @CompanyId
                WHERE bh.Level < 10 -- Limite di sicurezza
            )
            SELECT 
                Level,
                ParentItem,
                Component as ComponentItemCode,
                Component as Item,
                Path,
                Quantity,
                Nature as ComponentNature,
                Description as ComponentItemDescription,
                UoM,
                ComponentType,
                Line,
                -- Aggiungi un ID univoco per il frontend
                ROW_NUMBER() OVER (ORDER BY Path) as ComponentId
            FROM BOMHierarchy
            WHERE Level > 0 -- Escludi il root
            ORDER BY Path`;
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('ItemCode', sql.VarChar(64), itemCode);
            
        const result = await request.query(query);
        
        // Ottieni anche i cicli per tutti i componenti
        const routingQuery = `
            SELECT 
                br.BOM,
                br.RtgStep,
                br.Operation,
                br.WC,
                br.ProcessingTime,
                br.SetupTime,
                br.Notes
            FROM MA_BillOfMaterialsRouting br
            WHERE br.CompanyId = @CompanyId
            AND br.BOM IN (
                SELECT DISTINCT Component 
                FROM MA_BillOfMaterialsComp 
                WHERE BOM = @ItemCode AND CompanyId = @CompanyId
            )`;
            
        const routingRequest = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('ItemCode', sql.VarChar(64), itemCode);
            
        const routingResult = await routingRequest.query(routingQuery);
        
        return {
            components: result.recordset || [],
            routing: routingResult.recordset || []
        };
    } catch (err) {
        console.error('Error getting ERP BOM structure:', err);
        throw err;
    }
};

// Verifica se un articolo ERP ha una distinta base
const checkERPItemHasBOM = async (companyId, itemCode) => {
    try {
        let pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('ItemCode', sql.VarChar(64), itemCode)
            .query(`
                SELECT COUNT(*) as HasBOM
                FROM MA_BillOfMaterials
                WHERE BOM = @ItemCode 
                AND CompanyId = @CompanyId 
                AND Disabled = 0
            `);
            
        return result.recordset[0].HasBOM > 0;
    } catch (err) {
        console.error('Error checking ERP item BOM:', err);
        return false;
    }
};

// Ottiene gli articoli dal gestionale con paginazione
const getERPItemsPaginated = async (companyId, page = 0, pageSize = 50, search = '') => {
    try {
        let pool = await sql.connect(config.database);
        
        // Query per il conteggio totale
        let countQuery = `
            SELECT COUNT(*) as total
            FROM dbo.MA_Items T0
            WHERE T0.CompanyId = @CompanyId
            AND T0.Disabled = 0
        `;
        
        // Query principale per gli articoli
        let query = `
            SELECT 
                T0.Item,
                T0.Description,
                T0.Nature,
                T0.BaseUoM,
                T0.Department,
                T1.Id AS ItemId
            FROM dbo.MA_Items T0
            LEFT JOIN MA_ProjectArticles_Items T1 
                ON T1.Item = T0.Item 
                AND T1.CompanyId = T0.CompanyId 
            WHERE T0.CompanyId = @CompanyId
            AND T0.Disabled = 0
        `;
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId);
            
        // Aggiungi filtro di ricerca se specificato
        if (search) {
            const searchParam = `%${search}%`;
            countQuery += ` AND (T0.Item LIKE @Search OR T0.Description LIKE @Search)`;
            query += ` AND (T0.Item LIKE @Search OR T0.Description LIKE @Search)`;
            request.input('Search', sql.VarChar(100), searchParam);
        }
        
        // Esegui query per il conteggio
        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0].total;
        
        // Aggiungi paginazione alla query principale
        query += ` ORDER BY Item
                  OFFSET @Offset ROWS
                  FETCH NEXT @PageSize ROWS ONLY`;
                  
        request.input('Offset', sql.Int, page * pageSize)
               .input('PageSize', sql.Int, pageSize);
        
        // Esegui query principale
        const result = await request.query(query);
        
        return {
            items: result.recordset,
            total: total,
            totalPages: Math.ceil(total / pageSize)
        };
    } catch (err) {
        console.error('Error getting paginated ERP items:', err);
        throw err;
    }
};

// Valida l'unicità del codice articolo
const validateItemCode = async (companyId, itemCode, excludeItemId = null) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();
        
        // Parametri di input
        request.input('CompanyId', sql.Int, companyId);
        request.input('ItemCode', sql.VarChar(64), itemCode);
        
        if (excludeItemId) {
            request.input('ExcludeItemId', sql.BigInt, excludeItemId);
        }
        
        // Parametri di output
        request.output('IsValid', sql.Int); 
        request.output('ErrorMessage', sql.NVarChar(255));
        
        // Esecuzione della stored procedure
        const result = await request.execute('MA_ProjectArticles_ValidateItemCode');
        
        const isValid = result.output.IsValid;
        const errorMessage = result.output.ErrorMessage || '';
        
        return {
            isValid: isValid == 1,
            message: errorMessage,
            isWarning: errorMessage.startsWith('AVVISO:')
        };
    } catch (err) {
        console.error('Error validating item code:', err);
        return {
            isValid: false,
            message: 'Errore durante la validazione del codice',
            isWarning: false
        };
    }
};

// Verifica se un codice articolo è già utilizzato
const checkItemCodeExists = async (companyId, itemCode, excludeItemId = null) => {
    try {
        let pool = await sql.connect(config.database);
        
        // Query per verificare esistenza in MA_ProjectArticles_Items
        let query = `
            SELECT COUNT(*) as Count
            FROM dbo.MA_ProjectArticles_Items
            WHERE CompanyId = @CompanyId 
            AND Item = @ItemCode 
            AND Disabled = 0
        `;
        
        if (excludeItemId) {
            query += ` AND Id != @ExcludeItemId`;
        }
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('ItemCode', sql.VarChar(64), itemCode);
            
        if (excludeItemId) {
            request.input('ExcludeItemId', sql.BigInt, excludeItemId);
        }
        
        const result = await request.query(query);
        const existsInProjects = result.recordset[0].Count > 0;
        
        // Verifica anche in MA_Items (gestionale)
        const erpQuery = `
            SELECT COUNT(*) as Count
            FROM dbo.MA_Items
            WHERE CompanyId = @CompanyId 
            AND Item = @ItemCode 
            AND Disabled = 0
        `;
        
        const erpRequest = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('ItemCode', sql.VarChar(64), itemCode);
            
        const erpResult = await erpRequest.query(erpQuery);
        const existsInERP = erpResult.recordset[0].Count > 0;
        
        return {
            existsInProjects,
            existsInERP,
            canUse: !existsInProjects // Può essere usato se non esiste nei progetti
        };
    } catch (err) {
        console.error('Error checking item code existence:', err);
        return {
            existsInProjects: true, // Per sicurezza, considera come esistente
            existsInERP: false,
            canUse: false
        };
    }
};

const updateItemDetailsWithValidation = async (itemId, itemData) => {
    try {
        let pool = await sql.connect(config.database);
        
        // Variabile per memorizzare il risultato della validazione
        let validationResult = null;
        
        // Se viene modificato il codice, prima validalo
        if (itemData.Code !== undefined) {
            // Ottieni CompanyId dell'articolo
            const itemQuery = await pool.request()
                .input('Id', sql.BigInt, itemId)
                .query('SELECT CompanyId FROM MA_ProjectArticles_Items WHERE Id = @Id');
                
            if (itemQuery.recordset.length === 0) {
                return { success: 0, msg: "Articolo non trovato" };
            }
            
            const companyId = itemQuery.recordset[0].CompanyId;
            
            // Valida il nuovo codice
            validationResult = await validateItemCode(companyId, itemData.Code, itemId);
            
            if (!validationResult.isValid) {
                return { 
                    success: 0, 
                    msg: validationResult.message,
                    field: 'Code'
                };
            }
            
            // Se c'è un avviso, includilo nella risposta
            if (validationResult.isWarning) {
                // Log dell'avviso ma continua
                console.warn(`Code validation warning for item ${itemId}: ${validationResult.message}`);
            }
        }
        
        // Procedi con l'aggiornamento normale usando la funzione esistente
        const request = pool.request();
        
        // Parametri obbligatori
        request.input('Id', sql.BigInt, itemId);
        
        // Parametri opzionali in base ai dati forniti
        if (itemData.Code !== undefined) request.input('Item', sql.VarChar(64), itemData.Code);
        if (itemData.Description !== undefined) request.input('Description', sql.VarChar(128), itemData.Description);
        if (itemData.Nature !== undefined) request.input('Nature', sql.Int, itemData.Nature);
        if (itemData.Diameter !== undefined) request.input('Diameter', sql.Float, itemData.Diameter);
        if (itemData.Bxh !== undefined) request.input('Bxh', sql.VarChar(11), itemData.Bxh);
        if (itemData.Depth !== undefined) request.input('Depth', sql.Float, itemData.Depth);
        if (itemData.Length !== undefined) request.input('Length', sql.Float, itemData.Length);
        if (itemData.MediumRadius !== undefined) request.input('MediumRadius', sql.Float, itemData.MediumRadius);
        if (itemData.CustomerItemReference !== undefined) request.input('CustomerItemReference', sql.VarChar(64), itemData.CustomerItemReference);
        
        // Costruisci la query di aggiornamento in base ai campi forniti
        let updateFields = [];
        
        if (itemData.Code !== undefined) updateFields.push('Item = @Item');
        if (itemData.Description !== undefined) updateFields.push('Description = @Description');
        if (itemData.Nature !== undefined) updateFields.push('Nature = @Nature');
        if (itemData.Diameter !== undefined) updateFields.push('Diameter = @Diameter');
        if (itemData.Bxh !== undefined) updateFields.push('Bxh = @Bxh');
        if (itemData.Depth !== undefined) updateFields.push('Depth = @Depth');
        if (itemData.Length !== undefined) updateFields.push('Length = @Length');
        if (itemData.MediumRadius !== undefined) updateFields.push('MediumRadius = @MediumRadius');
        if (itemData.CustomerItemReference !== undefined) updateFields.push('CustomerItemReference = @CustomerItemReference');
        
        // Se non ci sono campi da aggiornare, esci
        if (updateFields.length === 0) {
            return { success: 1, msg: "Nessun campo da aggiornare" };
        }
        
        // Aggiungi timestamp di modifica
        updateFields.push('TBModified = GETDATE()');
        
        // Esegui la query di aggiornamento
        const result = await request.query(`
            UPDATE MA_ProjectArticles_Items
            SET ${updateFields.join(', ')}
            WHERE Id = @Id
        `);
        
        return { 
            success: 1, 
            rowsAffected: result.rowsAffected[0], 
            msg: `Dettagli articolo aggiornati con successo`,
            warning: validationResult && validationResult.isWarning ? validationResult.message : null
        };
    } catch (err) {
        console.error('Error updating item details with validation:', err);
        return { success: 0, msg: err.message };
    }
};

// Aggiungere alla fine del file projectArticlesManagement.js esistente

/**
 * Search for similar articles based on root code and description
 * @param {number} companyId - Company ID
 * @param {string} rootCode - Root code to search (optional)
 * @param {string} description - Description to search (optional)
 * @param {number} excludeId - Article ID to exclude from results (optional)
 * @param {number} limit - Maximum number of results (default 10)
 * @param {boolean} erpOnly - Show only ERP articles
 * @param {boolean} tempOnly - Show only temporary articles
 * @returns {Promise<Array>} Array of similar articles with similarity scores
 */
const searchSimilarArticles = async (companyId, rootCode = '', description = '', excludeId = null, limit = 10, erpOnly = false, tempOnly = false) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        // Set parameters
        request.input('CompanyId', sql.Int, companyId);
        request.input('RootCode', sql.VarChar(10), rootCode || '');
        request.input('Description', sql.NVarChar(128), description || '');
        request.input('ExcludeId', sql.BigInt, excludeId);
        request.input('Limit', sql.Int, limit);
        request.input('ErpOnly', sql.Bit, erpOnly);
        request.input('TempOnly', sql.Bit, tempOnly);

        // Execute stored procedure
        const result = await request.execute('MA_ProjectArticles_SearchSimilar');
        
        // Process results to add client-side calculations if needed
        const articles = result.recordset.map(article => ({
            ...article,
            // Calculate similarity percentage
            similarityScore: Math.round((article.TotalScore / 200) * 100), // Max score is 200 (100 code + 100 desc)
            canModify: article.stato_erp !== 1,
            isErp: article.stato_erp === 1,
            // Add formatted date
            syncDate: article.data_sync_erp ? new Date(article.data_sync_erp).toLocaleDateString('it-IT') : null
        }));
        
        return articles;
    } catch (err) {
        console.error('Error searching similar articles:', err);
        throw err;
    }
};

// Ottiene la struttura BOM ad albero per l'espansione nella lista articoli
const getArticleBOMTree = async (companyId, itemId, maxLevel = 3, includeAttachments = true) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        // Parametri per la stored procedure esistente
        request.input('Action', sql.NVarChar(50), 'GET_BOM_MULTILEVEL');
        request.input('CompanyId', sql.Int, companyId);
        request.input('ItemId', sql.BigInt, itemId);
        request.input('MaxLevel', sql.Int, maxLevel);
        request.input('IncludeDisabled', sql.Bit, 0);
        request.input('ExpandPhantoms', sql.Bit, 1);
        request.input('IncludeRouting', sql.Bit, 0); // Disabilitato per performance
        request.output('ErrorCode', sql.Int);
        request.output('ErrorMessage', sql.NVarChar(4000));

        console.log('BOM Tree Query Parameters:', {
            companyId,
            itemId,
            maxLevel,
            includeAttachments
        });

        // Esecuzione della stored procedure esistente
        console.log('Executing stored procedure MA_ProjectArticles_GetBOMDatas...');
        const result = await request.execute('MA_ProjectArticles_GetBOMDatas');
        console.log('Stored procedure executed successfully');

        // Controllo errori
        const errorCode = request.parameters.ErrorCode.value || 0;
        const errorMsg = request.parameters.ErrorMessage.value;
        console.log('Stored procedure result:', {
            errorCode,
            errorMessage: errorMsg,
            recordsetsCount: result.recordsets.length
        });

        if (errorCode !== 0) {
            console.log('Stored procedure failed, trying fallback query...');
            return await getArticleBOMTreeFallback(companyId, itemId, maxLevel, includeAttachments);
        }

        console.log('BOM Tree Query Result:', {
            recordsetsCount: result.recordsets.length,
            firstRecordsetLength: result.recordsets[0]?.length || 0,
            firstRecord: result.recordsets[0]?.[0] || null
        });

        // Organizza i risultati in una struttura ad albero
        // Per GET_BOM_MULTILEVEL, recordsets[0] contiene i componenti
        const treeData = organizeBOMTreeData([result.recordsets[0] || [], [], []]);

        // Se richiesto, carica gli allegati per ogni componente
        if (includeAttachments && treeData.components.length > 0) {
            console.log('Loading attachments for components...');
            await loadAttachmentsForComponents(pool, companyId, treeData.components);
        }

        console.log('Organized BOM Tree Data:', {
            componentsCount: treeData.components.length,
            totalComponents: treeData.totalComponents
        });

        return treeData;
    } catch (err) {
        console.error('Error getting article BOM tree:', err);
        // Se anche la stored procedure fallisce, prova il fallback
        console.log('Trying fallback query...');
        return await getArticleBOMTreeFallback(companyId, itemId, maxLevel, includeAttachments);
    }
};

// Carica gli allegati per tutti i componenti in modo ricorsivo
const loadAttachmentsForComponents = async (pool, companyId, components) => {
    for (const component of components) {
        try {
            // Carica allegati per il componente corrente
            if (component.ComponentItemCode) {
                const attachments = await getComponentAttachments(companyId, component.ComponentId, true);
                component.attachments = attachments || [];
            }
            
            // Carica allegati per i componenti figli ricorsivamente
            if (component.children && component.children.length > 0) {
                await loadAttachmentsForComponents(pool, companyId, component.children);
            }
        } catch (err) {
            console.error(`Error loading attachments for component ${component.ComponentId}:`, err);
            component.attachments = [];
        }
    }
};

// Funzione di fallback per ottenere la struttura BOM
const getArticleBOMTreeFallback = async (companyId, itemId, maxLevel = 3, includeAttachments = true) => {
    try {
        let pool = await sql.connect(config.database);
        
        // Query semplificata per ottenere solo i componenti di primo livello
        const query = `
            SELECT 
                1 as Level,
                comp.ComponentId,
                @ItemId as ParentId,
                bom.Id as BOMId,
                bom.Id as ParentBOMId,
                comp.Line,
                comp.ComponentType,
                CAST(@ItemId AS NVARCHAR(MAX)) + '.' + CAST(comp.ComponentId AS NVARCHAR(MAX)) as Path,
                comp.Quantity,
                comp.Quantity as CalculatedQty,
                comp.UoM,
                comp.UnitCost,
                comp.TotalCost,
                comp.FixedCost,
                -- Informazioni articolo
                COALESCE(item.Item, erp.Item) AS ComponentItemCode,
                COALESCE(item.Description, erp.Description) AS ComponentItemDescription,
                COALESCE(item.Nature, erp.Nature) AS ComponentNature,
                'ACTIVE' AS StatusCode,
                'Attivo' AS StatusDescription,
                COALESCE(item.stato_erp, erp.stato_erp, 0) AS stato_erp,
                -- Flag per indicare se ha figli
                CASE WHEN EXISTS (
                    SELECT 1 FROM MA_ProjectArticles_BillOfMaterials childBOM 
                    WHERE childBOM.ItemId = comp.ComponentId AND childBOM.CompanyId = @CompanyId
                ) THEN 1 ELSE 0 END AS HasChildren
            FROM MA_ProjectArticles_BillOfMaterials bom
            JOIN MA_ProjectArticles_BOMComponents comp ON comp.BOMId = bom.Id AND comp.CompanyId = @CompanyId
            LEFT JOIN MA_ProjectArticles_Items item ON item.Id = comp.ComponentId AND item.CompanyId = @CompanyId
            LEFT JOIN MA_Items erp ON erp.Item = item.Item AND erp.CompanyId = @CompanyId
            WHERE bom.ItemId = @ItemId 
            AND bom.CompanyId = @CompanyId
            AND comp.ComponentId IS NOT NULL
            ORDER BY comp.Line
        `;

        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('ItemId', sql.BigInt, itemId)
            .input('MaxLevel', sql.Int, maxLevel);

        console.log('Fallback query parameters:', {
            companyId,
            itemId,
            maxLevel
        });

        const result = await request.query(query);

        console.log('Fallback query result:', {
            recordCount: result.recordset.length,
            firstRecord: result.recordset[0] || null
        });

        // Organizza i risultati in una struttura ad albero
        const treeData = organizeBOMTreeData([result.recordset, [], []]);

        // Se richiesto, carica gli allegati per ogni componente
        if (includeAttachments && treeData.components.length > 0) {
            console.log('Loading attachments for fallback components...');
            await loadAttachmentsForComponents(pool, companyId, treeData.components);
        }

        console.log('Fallback organized BOM Tree Data:', {
            componentsCount: treeData.components.length,
            totalComponents: treeData.totalComponents
        });

        return treeData;
    } catch (err) {
        console.error('Error in fallback query:', err);
        throw err;
    }
};

// Organizza i dati della BOM in una struttura ad albero per il frontend
const organizeBOMTreeData = (recordsets) => {
    try {
        const [components, routing, attachments] = recordsets;

        // Crea una mappa per i componenti
        const componentMap = new Map();
        const rootComponents = [];

        // Processa i componenti
        if (components && components.length > 0) {
            components.forEach(comp => {
                const componentData = {
                    ...comp,
                    children: [],
                    routing: [],
                    attachments: [],
                    expanded: false,
                    hasChildren: false
                };
                componentMap.set(comp.ComponentId, componentData);

                // Se è un componente di primo livello, aggiungilo alla root
                if (comp.Level === 1) {
                    rootComponents.push(componentData);
                }
            });

            // Organizza la gerarchia
            components.forEach(comp => {
                if (comp.Level > 1) {
                    // Trova il componente padre
                    const parent = Array.from(componentMap.values())
                        .find(p => p.Level === comp.Level - 1 && 
                               comp.Path.startsWith(p.Path + '.'));
                    
                    if (parent) {
                        parent.children.push(componentMap.get(comp.ComponentId));
                        parent.hasChildren = true;
                    }
                }
            });
        }

        // Aggiungi i routing se presenti
        if (routing && routing.length > 0) {
            routing.forEach(rtg => {
                const component = componentMap.get(rtg.ComponentId);
                if (component) {
                    component.routing.push(rtg);
                }
            });
        }

        // Aggiungi gli allegati se presenti
        if (attachments && attachments.length > 0) {
            attachments.forEach(att => {
                const component = componentMap.get(att.ComponentId);
                if (component) {
                    component.attachments.push(att);
                }
            });
        }

        return {
            components: rootComponents,
            totalComponents: components ? components.length : 0,
            hasRouting: routing && routing.length > 0,
            hasAttachments: attachments && attachments.length > 0
        };
    } catch (err) {
        console.error('Error organizing BOM tree data:', err);
        return {
            components: [],
            totalComponents: 0,
            hasRouting: false,
            hasAttachments: false
        };
    }
};

// Ottiene gli allegati per un componente specifico
const getComponentAttachments = async (companyId, componentId, isProjectItem = true) => {
    try {
        let pool = await sql.connect(config.database);
        
        let query = `
            SELECT 
                att.AttachmentID,
                att.FileName,
                att.FilePath,
                att.FileType,
                att.FileSizeKB,
                att.Description,
                att.UploadedAt,
                att.IsPublic,
                att.IsVisible,
                u.FirstName + ' ' + u.LastName AS UploadedByName,
                cat.CategoryName
            FROM MA_ItemAttachments att
            LEFT JOIN AR_Users u ON att.UploadedBy = u.userId
            LEFT JOIN MA_ItemAttachmentCategoryMap map ON att.AttachmentID = map.AttachmentID
            LEFT JOIN MA_ItemAttachmentCategories cat ON map.CategoryID = cat.CategoryID
            WHERE att.CompanyId = @CompanyId
            AND att.IsVisible = 1
        `;

        const request = pool.request()
            .input('CompanyId', sql.Int, companyId);

        if (isProjectItem) {
            query += ` AND att.ProjectItemId = @ComponentId`;
            request.input('ComponentId', sql.BigInt, componentId);
        } else {
            query += ` AND att.ItemCode = @ItemCode`;
            request.input('ItemCode', sql.VarChar(64), componentId);
        }

        query += ` ORDER BY att.UploadedAt DESC`;

        const result = await request.query(query);
        return result.recordset || [];
    } catch (err) {
        console.error('Error getting component attachments:', err);
        throw err;
    }
};

// =====================================================
// INTERCOMPANY FUNCTIONS
// =====================================================

// 1. Ottiene i componenti intercompany di una BOM
const getIntercompanyComponents = async (bomId, companyId, includeAttachments = false) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        // Parametri input
        request.input('BOMId', sql.BigInt, bomId);
        request.input('CompanyId', sql.Int, companyId);
        request.input('IncludeAttachments', sql.Bit, includeAttachments);

        // Parametri output
        request.output('ErrorCode', sql.Int);
        request.output('ErrorMessage', sql.NVarChar(4000));

        // Esegui la stored procedure
        const result = await request.execute('MA_ProjectArticles_GetIntercompanyComponents');

        // Controlla errori
        const errorCode = request.parameters.ErrorCode.value || 0;
        if (errorCode !== 0) {
            throw new Error(request.parameters.ErrorMessage.value || `Error code: ${errorCode}`);
        }

        // Ottieni i recordset
        const components = result.recordsets[0] || [];
        const attachments = includeAttachments && result.recordsets.length > 1 ? result.recordsets[1] : [];

        return {
            success: 1,
            components: components,
            attachments: attachments,
            totalComponents: components.length,
            errorCode: 0,
            errorMessage: null
        };
    } catch (err) {
        console.error('Error in getIntercompanyComponents:', err);
        return {
            success: 0,
            components: [],
            attachments: [],
            totalComponents: 0,
            errorCode: -1,
            errorMessage: err.message || 'Errore nel recupero dei componenti intercompany'
        };
    }
};

// 2. Sincronizza le condivisioni intercompany per una BOM
const syncIntercompanySharing = async (bomId, companyId, userId, syncAttachments = true, autoCreateReferences = true) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        // Parametri input
        request.input('BOMId', sql.BigInt, bomId);
        request.input('CompanyId', sql.Int, companyId);
        request.input('UserId', sql.Int, userId);
        request.input('SyncAttachments', sql.Bit, syncAttachments);
        request.input('AutoCreateReferences', sql.Bit, autoCreateReferences);

        // Parametri output - SOLO ErrorCode e ErrorMessage sono OUTPUT parameters
        request.output('ErrorCode', sql.Int);
        request.output('ErrorMessage', sql.NVarChar(4000));

        // Esegui la stored procedure
        const result = await request.execute('MA_ProjectArticles_SyncIntercompanySharing');

        // La SP ritorna un recordset con i contatori (non output parameters)
        const resultData = result.recordset && result.recordset.length > 0 ? result.recordset[0] : {};

        const errorCode = resultData.ErrorCode || 0;
        const errorMessage = resultData.ErrorMessage || '';
        const referencesCreated = resultData.ReferencesCreated || 0;
        const referencesUpdated = resultData.ReferencesUpdated || 0;
        const attachmentsShared = resultData.AttachmentsShared || 0;

        if (errorCode !== 0) {
            throw new Error(errorMessage || `Error code: ${errorCode}`);
        }

        return {
            success: 1,
            msg: `Sincronizzazione completata: ${referencesCreated} references create, ${referencesUpdated} aggiornate, ${attachmentsShared} allegati condivisi`,
            referencesCreated: referencesCreated,
            referencesUpdated: referencesUpdated,
            attachmentsShared: attachmentsShared
        };
    } catch (err) {
        console.error('Error in syncIntercompanySharing:', err);
        return {
            success: 0,
            msg: err.message || 'Errore durante la sincronizzazione intercompany',
            referencesCreated: 0,
            referencesUpdated: 0,
            attachmentsShared: 0
        };
    }
};

// 3. Ottiene il riepilogo intercompany per la sidebar
const getBOMIntercompanySummary = async (bomId, companyId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        // Parametri input - ATTENZIONE: la SP usa @Id non @BOMId
        request.input('Action', sql.NVarChar(50), 'GET_BOM_INTERCOMPANY_SUMMARY');
        request.input('Id', sql.BigInt, bomId);  // Cambiato da BOMId a Id
        request.input('CompanyId', sql.Int, companyId);

        // Parametri output
        request.output('ErrorCode', sql.Int);
        request.output('ErrorMessage', sql.NVarChar(4000));

        // Esegui la stored procedure
        const result = await request.execute('MA_ProjectArticles_GetBOMDatas');

        // Controlla errori
        const errorCode = request.parameters.ErrorCode.value || 0;
        if (errorCode !== 0) {
            throw new Error(request.parameters.ErrorMessage.value || `Error code: ${errorCode}`);
        }

        // Ottieni i recordset
        // Recordset 0: Dettaglio componenti
        // Recordset 1: Summary per tipo e company
        const rawComponents = result.recordsets[0] || [];
        const summaryByType = result.recordsets.length > 1 ? result.recordsets[1] : [];

        // Filtra solo componenti intercompany validi (TargetCompanyId > 0) e mappa Type a IntercompanyType
        const components = rawComponents
            .filter(comp => comp.TargetCompanyId && comp.TargetCompanyId > 0)
            .map(comp => ({
                ...comp,
                IntercompanyType: comp.Type
            }));

        // Raggruppa il summary per company (aggregando acquisti e conto lavoro)
        // Filtra solo le righe con TargetCompanyId valido
        const summaryByCompany = [];
        const companyMap = new Map();

        summaryByType
            .filter(row => row.TargetCompanyId && row.TargetCompanyId > 0)
            .forEach(row => {
                const companyId = row.TargetCompanyId;
                if (!companyMap.has(companyId)) {
                    companyMap.set(companyId, {
                        TargetCompanyId: companyId,
                        TargetCompanyName: row.TargetCompanyName,
                        TotalComponents: 0,
                        PurchaseComponents: 0,
                        SubcontractingComponents: 0,
                        Suppliers: new Set()
                    });
                }

                const company = companyMap.get(companyId);
                company.TotalComponents += row.ComponentCount || 0;

                if (row.Type === 'ACQUISTO') {
                    company.PurchaseComponents += row.ComponentCount || 0;
                } else if (row.Type === 'CONTO_LAVORO') {
                    company.SubcontractingComponents += row.ComponentCount || 0;
                }
            });

        // Aggiungi fornitori dal dettaglio componenti
        components.forEach(comp => {
            if (companyMap.has(comp.TargetCompanyId) && comp.SupplierCode) {
                companyMap.get(comp.TargetCompanyId).Suppliers.add(comp.SupplierCode);
            }
        });

        // Converti Map in array e formatta Suppliers
        companyMap.forEach(company => {
            company.Suppliers = Array.from(company.Suppliers).join(', ');
            summaryByCompany.push(company);
        });

        // Calcola totali
        const totalIntercompanyComponents = components.length;
        const totalTargetCompanies = summaryByCompany.length;

        return {
            success: 1,
            summaryByCompany: summaryByCompany,
            components: components,
            totalIntercompanyComponents: totalIntercompanyComponents,
            totalTargetCompanies: totalTargetCompanies
        };
    } catch (err) {
        console.error('Error in getBOMIntercompanySummary:', err);
        return {
            success: 0,
            summaryByCompany: [],
            components: [],
            totalIntercompanyComponents: 0,
            totalTargetCompanies: 0,
            errorMessage: err.message || 'Errore nel recupero del riepilogo intercompany'
        };
    }
};

// 4. Ottiene le richieste intercompany (inbox/outbox)
const getIntercompanyRequests = async (companyId, direction = 'IN', status = null) => {
    try {
        let pool = await sql.connect(config.database);
        let query = `
            SELECT
                ref.ReferenceId,
                ref.SourceCompanyId,
                srcComp.Description AS SourceCompanyName,
                ref.TargetCompanyId,
                tgtComp.Description AS TargetCompanyName,
                -- Informazioni progetto sorgente
                ref.SourceProjectId,
                srcProj.Name AS SourceProjectName,
                srcProj.Description AS SourceProjectDescription,
                -- Informazioni progetto target
                ref.TargetProjectId,
                tgtProj.Name AS TargetProjectName,
                tgtProj.Description AS TargetProjectDescription,
                -- Informazioni componente
                ref.SourceProjectItemId AS ComponentId,
                comp.Item AS ComponentCode,
                comp.Description AS ComponentDescription,
                -- Codice articolo target (può essere temporaneo IC_TEMP_* o definitivo)
                ref.TargetProjectItemCode,
                -- Stato e date
                ref.Status,
                ref.RequestDate,
                ref.ResponseDate,
                ref.TBCreatedId AS RequestUserId,
                ref.RequestNotes AS Notes,
                ref.ResponseNotes,
                -- Determina tipo intercompany a partire dalla Nature dell'item TARGET
                -- Se non esiste ancora (codice temporaneo), fallback su ref.Nature o comp.Nature
                CASE
                    WHEN ISNULL(tgtItem.Nature, ISNULL(ref.Nature, comp.Nature)) = 22413314 THEN 'ACQUISTO'
                    WHEN ISNULL(tgtItem.Nature, ISNULL(ref.Nature, comp.Nature)) = 22413313 THEN 'PRODOTTO FINITO'
                    ELSE 'CONTO_LAVORO'
                END AS IntercompanyType
            FROM MA_ProjectArticles_References ref
            INNER JOIN AR_Companies srcComp ON ref.SourceCompanyId = srcComp.CompanyId
            INNER JOIN AR_Companies tgtComp ON ref.TargetCompanyId = tgtComp.CompanyId
            LEFT JOIN MA_ProjectArticles_Items comp ON comp.Id = ref.SourceProjectItemId AND comp.CompanyId = ref.SourceCompanyId
            LEFT JOIN MA_ProjectArticles_Items tgtItem ON tgtItem.Id = ref.TargetProjectItemId AND tgtItem.CompanyId = ref.TargetCompanyId
            LEFT JOIN MA_Projects srcProj ON ref.SourceProjectId = srcProj.ProjectID AND srcProj.CompanyId = ref.SourceCompanyId
            LEFT JOIN MA_Projects tgtProj ON ref.TargetProjectId = tgtProj.ProjectID AND tgtProj.CompanyId = ref.TargetCompanyId
            WHERE 1=1
        `;

        const request = pool.request();
        request.input('CompanyId', sql.Int, companyId);

        // Filtra per direzione
        if (direction === 'IN') {
            query += ` AND ref.TargetCompanyId = @CompanyId`;
        } else if (direction === 'OUT') {
            query += ` AND ref.SourceCompanyId = @CompanyId`;
        } else if (direction === 'BOTH') {
            query += ` AND (ref.SourceCompanyId = @CompanyId OR ref.TargetCompanyId = @CompanyId)`;
        }

        // Filtra per stato
        if (status && status !== 'all') {
            query += ` AND ref.Status = @Status`;
            request.input('Status', sql.NVarChar(20), status);
        }

        query += ` ORDER BY ref.RequestDate DESC`;

        const result = await request.query(query);

        return {
            success: 1,
            requests: result.recordset || [],
            totalRequests: result.recordset.length
        };
    } catch (err) {
        console.error('Error in getIntercompanyRequests:', err);
        return {
            success: 0,
            requests: [],
            totalRequests: 0,
            errorMessage: err.message || 'Errore nel recupero delle richieste intercompany'
        };
    }
};

// 5. Approva o rifiuta una reference intercompany
const approveRejectReference = async (referenceId, action, userId, notes = null) => {
    try {
        // Validazione action
        if (action !== 'APPROVE' && action !== 'REJECT') {
            throw new Error('Action deve essere APPROVE o REJECT');
        }

        let pool = await sql.connect(config.database);
        const request = pool.request();

        // Determina il nuovo status
        const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

        // Parametri
        request.input('ReferenceId', sql.BigInt, referenceId);
        request.input('Status', sql.NVarChar(20), newStatus);
        request.input('ResponseNotes', sql.NVarChar(4000), notes);

        // Query di update
        const query = `
            UPDATE MA_ProjectArticles_References
            SET
                Status = @Status,
                ResponseDate = GETDATE(),
                ResponseNotes = @ResponseNotes
            WHERE ReferenceId = @ReferenceId
        `;

        const result = await request.query(query);

        if (result.rowsAffected[0] === 0) {
            throw new Error('Reference non trovata o già processata');
        }

        return {
            success: 1,
            msg: action === 'APPROVE' ? 'Richiesta approvata con successo' : 'Richiesta rifiutata'
        };
    } catch (err) {
        console.error('Error in approveRejectReference:', err);
        return {
            success: 0,
            msg: err.message || 'Errore durante l\'elaborazione della richiesta'
        };
    }
};

// 6. Allegati collegati a una reference intercompany
const getReferenceAttachments = async (referenceId, companyId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();
        request.input('ReferenceId', sql.Int, referenceId);
        request.input('CompanyId', sql.Int, companyId);

        // Recupera la reference e valida che l'utente appartenga a source o target company
        const refQuery = `
            SELECT ReferenceID, SourceProjectItemId, SourceCompanyId, TargetCompanyId, 
                   RequestNotes, ResponseNotes
            FROM MA_ProjectArticles_References
            WHERE ReferenceID = @ReferenceId`;
        const refResult = await request.query(refQuery);
        const ref = refResult.recordset && refResult.recordset[0];
        if (!ref) {
            throw new Error('Reference non trovata');
        }
        if (ref.SourceCompanyId !== companyId && ref.TargetCompanyId !== companyId) {
            throw new Error('Accesso negato alla reference');
        }

        // Query per recuperare gli allegati seguendo la logica della stored procedure MA_GetItemAttachments
        const attachmentsQuery = `
            SELECT 
                att.AttachmentID,
                att.ProjectItemId,
                att.CompanyId AS OwnerCompanyId,
                att.ItemCode,
                att.FileName,
                att.FilePath,
                att.FileType,
                att.FileSizeKB,
                att.UploadedBy,
                att.UploadedAt,
                att.Description,
                att.IsPublic,
                att.StorageLocation,
                att.IsVisible,
                att.IsErpAttachment,
                att.Tags,
                u.username AS UploadedByUsername,
                u.firstName + ' ' + u.lastName AS UploadedByFullName,
                c.Description AS OwnerCompanyName,
                CASE 
                    WHEN att.CompanyId = @CompanyId THEN 'owner' 
                    ELSE COALESCE(shar.AccessLevel, 'read') 
                END AS AccessLevel,
                shar.SharedAt,
                shar.AccessLevel AS SharedAccessLevel
            FROM MA_ItemAttachments att
            LEFT JOIN AR_Users u ON att.UploadedBy = u.userId
            LEFT JOIN AR_Companies c ON att.CompanyId = c.CompanyId
            LEFT JOIN MA_ItemAttachmentSharing shar ON att.AttachmentID = shar.AttachmentID AND shar.TargetCompanyId = @CompanyId
            WHERE att.IsVisible = 1
            AND (
                -- Allegati dell'azienda proprietaria (source company) - funziona per entrambe le company
                (att.CompanyId = @SourceCompanyId AND att.ProjectItemId = @SourceProjectItemId)
                OR
                -- Allegati condivisi con l'azienda corrente (solo per target company)
                (att.CompanyId = @SourceCompanyId AND att.ItemCode = @ComponentCode AND shar.AttachmentID IS NOT NULL AND @CompanyId != @SourceCompanyId)
            )
            ORDER BY 
                CASE WHEN att.CompanyId = @CompanyId THEN 0 ELSE 1 END,
                COALESCE(shar.SharedAt, att.UploadedAt) DESC`;

        // Recupera il codice del componente per la ricerca per ItemCode
        const componentRequest = pool.request();
        componentRequest.input('SourceProjectItemId', sql.BigInt, ref.SourceProjectItemId);
        componentRequest.input('SourceCompanyId', sql.Int, ref.SourceCompanyId);
        
        const componentQuery = `
            SELECT Item FROM MA_ProjectArticles_Items 
            WHERE Id = @SourceProjectItemId AND CompanyId = @SourceCompanyId`;
        const componentResult = await componentRequest.query(componentQuery);
        const componentCode = componentResult.recordset && componentResult.recordset[0]?.Item;

        const attachmentsRequest = pool.request()
            .input('SourceProjectItemId', sql.BigInt, ref.SourceProjectItemId)
            .input('SourceCompanyId', sql.Int, ref.SourceCompanyId)
            .input('CompanyId', sql.Int, companyId)
            .input('ComponentCode', sql.VarChar(64), componentCode);

        // Debug log
        console.log('getReferenceAttachments Debug:', {
            referenceId,
            companyId,
            sourceCompanyId: ref.SourceCompanyId,
            targetCompanyId: ref.TargetCompanyId,
            sourceProjectItemId: ref.SourceProjectItemId,
            componentCode,
            isSourceCompany: companyId === ref.SourceCompanyId
        });

        const attachmentsResult = await attachmentsRequest.query(attachmentsQuery);
        
        return {
            success: 1,
            attachments: attachmentsResult.recordset || [],
            totalAttachments: attachmentsResult.recordset.length,
            reference: {
                ReferenceID: ref.ReferenceID,
                SourceCompanyId: ref.SourceCompanyId,
                TargetCompanyId: ref.TargetCompanyId,
                RequestNotes: ref.RequestNotes,
                ResponseNotes: ref.ResponseNotes
            }
        };
    } catch (err) {
        console.error('Error in getReferenceAttachments:', err);
        return {
            success: 0,
            attachments: [],
            totalAttachments: 0,
            errorMessage: err.message || 'Errore nel recupero degli allegati della reference'
        };
    }
};

// 7. Aggiorna le note della reference (request/response in base alla company)
const updateReferenceNotes = async (referenceId, companyId, notes) => {
    try {
        console.log('updateReferenceNotes', referenceId, companyId, notes);
        let pool = await sql.connect(config.database);
        const reqFetch = pool.request();
        reqFetch.input('ReferenceId', sql.Int, referenceId);
        const refRes = await reqFetch.query(`
            SELECT ReferenceID, SourceCompanyId, TargetCompanyId
            FROM MA_ProjectArticles_References
            WHERE ReferenceID = @ReferenceId`);
        const ref = refRes.recordset && refRes.recordset[0];
        if (!ref) {
            throw new Error('Reference non trovata');
        }

        const reqUpdate = pool.request();
        reqUpdate.input('ReferenceId', sql.Int, referenceId);
        reqUpdate.input('Notes', sql.NVarChar(sql.MAX), notes || null);
        console.log('ref', ref);
        let updateSql;
        if (companyId == ref.SourceCompanyId) {
            updateSql = `UPDATE MA_ProjectArticles_References SET RequestNotes = @Notes WHERE ReferenceID = @ReferenceId`;
            console.log('Updating RequestNotes for company', companyId);
        } else {
            updateSql = `UPDATE MA_ProjectArticles_References SET ResponseNotes = @Notes WHERE ReferenceID = @ReferenceId`;
            console.log('Updating ResponseNotes for company', companyId);
        }

        console.log('Executing SQL:', updateSql);
        console.log('Parameters:', { ReferenceId: referenceId, Notes: notes });
        
        const updateResult = await reqUpdate.query(updateSql);
        console.log('Update result rowsAffected:', updateResult.rowsAffected[0]);
        
        return { success: 1, msg: 'Note aggiornate' };
    } catch (err) {
        console.error('Error in updateReferenceNotes:', err);
        return { success: 0, msg: err.message || 'Errore aggiornamento note' };
    }
};

// Verifica se un codice articolo esiste nel gestionale e restituisce info fornitore/Intercompany
const checkItemInGestionale = async (companyId, itemCode) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        request.input('CompanyId', sql.Int, companyId);
        request.input('ItemCode', sql.VarChar(64), itemCode);

        // Parametri di output
        request.output('Exists', sql.Bit);
        request.output('SupplierId', sql.VarChar(12));
        request.output('SupplierName', sql.NVarChar(255));
        request.output('IsIntercompany', sql.Bit);
        request.output('IntercompanyTargetId', sql.Int);
        request.output('IntercompanyTargetName', sql.NVarChar(255));
        request.output('ErrorCode', sql.Int);
        request.output('ErrorMessage', sql.NVarChar(4000));

        await request.execute('MA_ProjectArticles_CheckItemInGestionale');

        const errorCode = request.parameters.ErrorCode.value || 0;
        if (errorCode !== 0) {
            throw new Error(request.parameters.ErrorMessage.value || `Error code: ${errorCode}`);
        }

        return {
            success: 1,
            exists: request.parameters.Exists.value,
            supplierId: request.parameters.SupplierId.value,
            supplierName: request.parameters.SupplierName.value,
            isIntercompany: request.parameters.IsIntercompany.value,
            intercompanyTargetId: request.parameters.IntercompanyTargetId.value,
            intercompanyTargetName: request.parameters.IntercompanyTargetName.value
        };
    } catch (err) {
        console.error('Error checking item in gestionale:', err);
        throw err;
    }
};

// Ottiene lista fornitori con flag Intercompany
const getSuppliersWithIntercompanyFlag = async (companyId, onlyIntercompany = false) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        request.input('CompanyId', sql.Int, companyId);
        request.input('OnlyIntercompany', sql.Bit, onlyIntercompany);
        request.output('ErrorCode', sql.Int);
        request.output('ErrorMessage', sql.NVarChar(4000));

        const result = await request.execute('MA_ProjectArticles_GetSuppliersWithIntercompanyFlag');

        const errorCode = request.parameters.ErrorCode.value || 0;
        if (errorCode !== 0) {
            throw new Error(request.parameters.ErrorMessage.value || `Error code: ${errorCode}`);
        }

        return {
            success: 1,
            suppliers: result.recordset
        };
    } catch (err) {
        console.error('Error getting suppliers with intercompany flag:', err);
        throw err;
    }
};

// =============================================================================
// NUOVA FUNZIONE: Sincronizzazione selettiva componenti intercompany
// =============================================================================
const syncIntercompanyComponents = async (components, companyId, projectId, userId = null, syncAttachments = true) => {
    try {
        console.log('=== SYNC INTERCOMPANY COMPONENTS FUNCTION ===');
        console.log('Input parameters:', { components, companyId, projectId, userId, syncAttachments });
        
        let pool = await sql.connect(config.database);
        const request = pool.request();

        // Parametri input
        request.input('CompanyId', sql.Int, companyId);
        request.input('ProjectId', sql.Int, projectId);  // NUOVO PARAMETRO
        request.input('UserId', sql.Int, userId);
        request.input('Components', sql.NVarChar(sql.MAX), JSON.stringify(components));
        request.input('SyncAttachments', sql.Bit, syncAttachments);

        // Parametri output
        request.output('ErrorCode', sql.Int);
        request.output('ErrorMessage', sql.NVarChar(4000));

        console.log('Executing stored procedure: MA_ProjectArticles_SyncIntercompanyComponents');
        
        // Esegui la stored procedure
        const result = await request.execute('MA_ProjectArticles_SyncIntercompanyComponents');
        
        console.log('Stored procedure executed successfully');
        console.log('Result recordsets:', result.recordsets);
        console.log('Output parameters:', {
            ErrorCode: request.parameters.ErrorCode.value,
            ErrorMessage: request.parameters.ErrorMessage.value
        });

        // Controlla errori
        const errorCode = request.parameters.ErrorCode.value || 0;
        if (errorCode !== 0) {
            throw new Error(request.parameters.ErrorMessage.value || `Error code: ${errorCode}`);
        }

        // Restituisci il risultato
        return {
            success: true,
            errorCode: errorCode,
            message: request.parameters.ErrorMessage.value,
            data: result.recordsets[0] || {}
        };

    } catch (error) {
        console.error('Errore durante sincronizzazione componenti intercompany:', error);
        return {
            success: false,
            errorCode: -1,
            message: error.message,
            data: null
        };
    }
};

// =============================================================================
// NUOVE FUNZIONI INTERCOMPANY PER GESTIONE PROGETTI
// =============================================================================

// 1. Approva reference con creazione progetto target
const approveIntercompanyReferenceWithProject = async (
    referenceId,
    userId,
    responseNotes = null,
    targetItemCode = null,
    createTemporaryIfMissing = true
) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        // Parametri input
        request.input('ReferenceID', sql.Int, referenceId);
        request.input('UserId', sql.Int, userId);
        request.input('ResponseNotes', sql.NVarChar(sql.MAX), responseNotes);
        request.input('TargetItemCode', sql.VarChar(64), targetItemCode);
        request.input('CreateTemporaryIfMissing', sql.Bit, createTemporaryIfMissing);

        // Parametri output
        request.output('TargetProjectId', sql.Int);
        request.output('TargetItemId', sql.BigInt);
        request.output('ErrorCode', sql.Int);
        request.output('ErrorMessage', sql.NVarChar(4000));

        console.log('Executing MA_ApproveIntercompanyReference with params:', {
            referenceId,
            userId,
            targetItemCode,
            createTemporaryIfMissing
        });

        // Esegui la stored procedure
        const result = await request.execute('MA_ApproveIntercompanyReference');

        // Recupera i parametri di output
        const errorCode = request.parameters.ErrorCode.value || 0;
        const errorMessage = request.parameters.ErrorMessage.value || '';
        const targetProjectId = request.parameters.TargetProjectId.value;
        const targetItemId = request.parameters.TargetItemId.value;

        console.log('MA_ApproveIntercompanyReference result:', {
            errorCode,
            errorMessage,
            targetProjectId,
            targetItemId
        });

        // ⚠️ Verifica critica: se targetProjectId è null ma errorCode è 0, c'è un problema
        if (errorCode === 0 && targetProjectId === null) {
            console.error('⚠️ WARNING: SP returned errorCode=0 but targetProjectId is NULL!');
            console.error('This usually means the SP exited early without setting output parameters correctly.');
            throw new Error('Errore interno: la stored procedure non ha restituito il targetProjectId. ' +
                          'Verifica che SourceProjectId sia popolato nella reference.');
        }

        if (errorCode !== 0) {
            throw new Error(errorMessage || `Errore SP (code: ${errorCode})`);
        }

        return {
            success: 1,
            msg: errorMessage || 'Richiesta approvata con successo',
            targetProjectId: targetProjectId,
            targetItemId: targetItemId,
            targetItemCode: targetItemCode
        };
    } catch (err) {
        console.error('Error in approveIntercompanyReferenceWithProject:', err);
        return {
            success: 0,
            msg: err.message || 'Errore durante l\'approvazione della richiesta',
            targetProjectId: null,
            targetItemId: null,
            targetItemCode: null
        };
    }
};

// 2. Recupera articoli temporanei intercompany
const getTemporaryIntercompanyItems = async (companyId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        request.input('CompanyId', sql.Int, companyId);

        const query = `
            SELECT
                i.Id,
                i.Item AS TemporaryCode,
                i.Description,
                i.DescriptionExtension,
                i.CompanyId,
                c.Description AS CompanyName,
                i.TBCreated AS CreatedDate,
                i.TBCreatedId AS CreatedBy,
                u.username AS CreatedByUsername,
                i.Notes,
                (SELECT COUNT(DISTINCT ProjectID)
                 FROM MA_ProjectsItems
                 WHERE ItemId = i.Id AND CompanyId = i.CompanyId) AS ProjectsCount,
                (SELECT COUNT(*)
                 FROM MA_ProjectArticles_References
                 WHERE TargetProjectItemId = i.Id
                   AND TargetCompanyId = i.CompanyId
                   AND Status = 'ACCEPTED') AS ReferencesCount
            FROM MA_ProjectArticles_Items i
            JOIN AR_Companies c ON i.CompanyId = c.CompanyId
            LEFT JOIN AR_Users u ON i.TBCreatedId = u.userId
            WHERE i.CompanyId = @CompanyId
              AND i.Item LIKE 'IC_TEMP_%'
              AND i.Disabled = 0
            ORDER BY i.TBCreated DESC
        `;

        const result = await request.query(query);

        return {
            success: 1,
            items: result.recordset || [],
            totalItems: result.recordset ? result.recordset.length : 0
        };
    } catch (err) {
        console.error('Error in getTemporaryIntercompanyItems:', err);
        return {
            success: 0,
            items: [],
            totalItems: 0,
            msg: err.message || 'Errore nel recupero degli articoli temporanei'
        };
    }
};

// 3. Sostituisci articolo temporaneo con definitivo
const replaceTemporaryItem = async (temporaryItemId, definitiveItemCode, companyId, userId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        // Prima valida il nuovo codice
        request.input('CompanyId', sql.Int, companyId);
        request.input('ItemCode', sql.VarChar(64), definitiveItemCode);
        request.input('ExcludeItemId', sql.BigInt, temporaryItemId);
        request.output('IsValid', sql.Int);
        request.output('ErrorMessage', sql.NVarChar(255));

        await request.execute('MA_ProjectArticles_ValidateItemCode');

        const isValid = request.parameters.IsValid.value;
        const errorMessage = request.parameters.ErrorMessage.value;

        if (isValid === 0) {
            throw new Error(errorMessage || `Codice ${definitiveItemCode} non valido`);
        }

        // Verifica che l'articolo temporaneo esista
        const checkTempQuery = `
            SELECT Id, Item, Description
            FROM MA_ProjectArticles_Items
            WHERE CompanyId = @CompanyId AND Id = @TemporaryItemId
        `;

        const request2 = pool.request();
        request2.input('CompanyId', sql.Int, companyId);
        request2.input('TemporaryItemId', sql.BigInt, temporaryItemId);
        const tempResult = await request2.query(checkTempQuery);

        if (!tempResult.recordset || tempResult.recordset.length === 0) {
            throw new Error(`Articolo temporaneo non trovato`);
        }

        const definitiveItemId = temporaryItemId; // Rinominiamo l'articolo temporaneo, non lo sostituiamo

        // Inizia transazione
        const transaction = pool.transaction();
        await transaction.begin();

        try {
            // 1. Rinomina l'articolo temporaneo con il nuovo codice
            const renameItemQuery = `
                UPDATE MA_ProjectArticles_Items
                SET
                    Item = @DefinitiveItemCode,
                    TBModified = GETDATE(),
                    TBModifiedId = @UserId,
                    Notes = CONCAT(ISNULL(Notes, ''), ' [RINOMINATO DA: ', Item, ' A: ', @DefinitiveItemCode, ' il ', CONVERT(VARCHAR, GETDATE(), 120), ']')
                WHERE Id = @TemporaryItemId AND CompanyId = @CompanyId
            `;

            const reqRename = transaction.request();
            reqRename.input('UserId', sql.Int, userId);
            reqRename.input('DefinitiveItemCode', sql.VarChar(64), definitiveItemCode);
            reqRename.input('TemporaryItemId', sql.BigInt, temporaryItemId);
            reqRename.input('CompanyId', sql.Int, companyId);
            await reqRename.query(renameItemQuery);

            // 2. Aggiorna le references con il nuovo codice
            // NOTA: Il trigger TR_UpdateReferencesOnItemChange si occuperà di questo automaticamente
            // ma lo facciamo comunque esplicitamente per sicurezza
            const updateReferencesQuery = `
                UPDATE MA_ProjectArticles_References
                SET
                    TargetProjectItemCode = @DefinitiveItemCode,
                    TBModified = GETDATE(),
                    TBModifiedId = @UserId
                WHERE TargetProjectItemId = @TemporaryItemId
                  AND TargetCompanyId = @CompanyId
            `;

            const reqRefs = transaction.request();
            reqRefs.input('DefinitiveItemCode', sql.VarChar(64), definitiveItemCode);
            reqRefs.input('UserId', sql.Int, userId);
            reqRefs.input('TemporaryItemId', sql.BigInt, temporaryItemId);
            reqRefs.input('CompanyId', sql.Int, companyId);
            await reqRefs.query(updateReferencesQuery);

            await transaction.commit();

            return {
                success: 1,
                msg: `Articolo rinominato in ${definitiveItemCode}`,
                definitiveItemId: definitiveItemId,
                definitiveItemCode: definitiveItemCode
            };
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Error in replaceTemporaryItem:', err);
        return {
            success: 0,
            msg: err.message || 'Errore durante la rinomina dell\'articolo'
        };
    }
};

// 4. Recupera dettagli reference con progetti
const getReferenceWithProjects = async (referenceId, companyId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        request.input('ReferenceId', sql.Int, referenceId);
        request.input('CompanyId', sql.Int, companyId);

        const query = `
            SELECT
                r.ReferenceID,
                r.SourceProjectItemId,
                r.SourceCompanyId,
                r.SourceProjectId,
                r.TargetProjectItemId,
                r.TargetCompanyId,
                r.TargetProjectId,
                r.Nature,
                r.Status,
                r.RequestDate,
                r.ResponseDate,
                r.RequestNotes,
                r.ResponseNotes,
                r.Priority,
                r.DueDate,
                r.TargetProjectItemCode,
                srcItem.Item AS SourceItemCode,
                srcItem.Description AS SourceItemDescription,
                tgtItem.Item AS TargetItemCode,
                tgtItem.Description AS TargetItemDescription,
                srcComp.Description AS SourceCompanyName,
                tgtComp.Description AS TargetCompanyName,
                srcProj.Name AS SourceProjectName,
                srcProj.Description AS SourceProjectDescription,
                srcProj.Status AS SourceProjectStatus,
                tgtProj.Name AS TargetProjectName,
                tgtProj.Description AS TargetProjectDescription,
                tgtProj.Status AS TargetProjectStatus,
                u.username AS CreatedByUsername,
                u.firstName + ' ' + u.lastName AS CreatedByFullName,
                CASE WHEN tgtItem.Item LIKE 'IC_TEMP_%' THEN 1 ELSE 0 END AS IsTemporaryCode
            FROM MA_ProjectArticles_References r
            LEFT JOIN MA_ProjectArticles_Items srcItem ON r.SourceProjectItemId = srcItem.Id AND r.SourceCompanyId = srcItem.CompanyId
            LEFT JOIN MA_ProjectArticles_Items tgtItem ON r.TargetProjectItemId = tgtItem.Id AND r.TargetCompanyId = tgtItem.CompanyId
            LEFT JOIN AR_Companies srcComp ON r.SourceCompanyId = srcComp.CompanyId
            LEFT JOIN AR_Companies tgtComp ON r.TargetCompanyId = tgtComp.CompanyId
            LEFT JOIN MA_Projects srcProj ON r.SourceProjectId = srcProj.ProjectID AND r.SourceCompanyId = srcProj.CompanyId
            LEFT JOIN MA_Projects tgtProj ON r.TargetProjectId = tgtProj.ProjectID AND r.TargetCompanyId = tgtProj.CompanyId
            LEFT JOIN AR_Users u ON r.TBCreatedId = u.userId
            WHERE r.ReferenceID = @ReferenceId
              AND (r.SourceCompanyId = @CompanyId OR r.TargetCompanyId = @CompanyId)
        `;

        const result = await request.query(query);

        if (!result.recordset || result.recordset.length === 0) {
            throw new Error('Reference non trovata o accesso negato');
        }

        return {
            success: 1,
            reference: result.recordset[0]
        };
    } catch (err) {
        console.error('Error in getReferenceWithProjects:', err);
        return {
            success: 0,
            reference: null,
            msg: err.message || 'Errore nel recupero della reference'
        };
    }
};

// Esporta tutte le funzioni
module.exports = {
    addUpdateItem,
    addUpdateBOM,
    getBOMData,
    manageReferences,
    getItemStatuses,
    getPaginatedItems,
    getItemById,
    reorderBOMComponents,
    getReferenceBOMs,
    getERPBOMs,
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
    updateItemDetails: updateItemDetailsWithValidation,
    importERPItemWithSelection,
    getERPBOMStructure,
    checkERPItemHasBOM,
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
    // Intercompany supplier helpers
    checkItemInGestionale,
    getSuppliersWithIntercompanyFlag,
    // Nuova funzione per sincronizzazione selettiva
    syncIntercompanyComponents,
    // NUOVE FUNZIONI INTERCOMPANY CON PROGETTI
    approveIntercompanyReferenceWithProject,
    getTemporaryIntercompanyItems,
    replaceTemporaryItem,
    getReferenceWithProjects
};