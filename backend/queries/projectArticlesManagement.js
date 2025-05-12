const sql = require('mssql');
const config = require('../config');

// Gestione articoli di progetto
const addUpdateItem = async (action, companyId, itemData, userId, projectId = null, sourceItemId = null) => {
    try {
        let pool = await sql.connect(config.dbConfig);
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

        
        // Esecuzione della stored procedure
        await request.execute('MA_ProjectArticles_AddUpdateItem');

        console.log('Executing MA_ProjectArticles_AddUpdateItem:', request.parameters);

        // Controllo errori
        const errorCode = request.parameters.ErrorCode.value ? request.parameters.ErrorCode.value : 0;
        if (errorCode !== 0) {
            throw new Error(request.parameters.ErrorMessage.value || `Error code: ${errorCode}`);
        }

        const result = {
            success: 1,
            bomId: request.parameters.ReturnValue.value,
            msg: `BOM ${action} operation completed successfully`
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
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request();

        // Debug per vedere l'azione esatta e i dati ricevuti
        console.log('Action received:', action, 'Type:', typeof action);
        console.log('bomData received:', bomData);

        // Parametri obbligatori
        request.input('Action', sql.NVarChar(50), action);
        request.input('CompanyId', sql.Int, companyId);
        request.input('UserId', sql.Int, userId);

        // Gestione dei parametri in base all'azione
        // IMPORTANTE: Gestisci prima i casi specifici, poi quelli generici

        // CASO 1: REPLACE_WITH_NEW_COMPONENT - Gestito per primo per evitare conflitti
        if (action === 'REPLACE_WITH_NEW_COMPONENT') {
            console.log('Executing REPLACE_WITH_NEW_COMPONENT with data:', bomData);
            
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
            if (bomData.ProductionLot) request.input('ProductionLot', sql.Int, bomData.ProductionLot);
            
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

        // Debug
        console.log('Executing MA_ProjectArticles_AddUpdateBOM:', request.parameters);
        
        // Esecuzione della stored procedure
        await request.execute('MA_ProjectArticles_AddUpdateBOM');

        // debug con ReturnValue, ErrorCode e ErrorMessage
        console.log('MA_ProjectArticles_AddUpdateBOM results:', {
            ReturnValue: request.parameters.ReturnValue.value,
            ErrorCode: request.parameters.ErrorCode.value,
            ErrorMessage: request.parameters.ErrorMessage.value
        });

        // Controllo errori
        const errorCode = request.parameters.ErrorCode.value ? request.parameters.ErrorCode.value : 0;
        if (errorCode !== 0) {
            throw new Error(request.parameters.ErrorMessage.value || `Error code: ${errorCode}`);
        }

        const result = {
            success: 1,
            bomId: request.parameters.ReturnValue.value,
            msg: `BOM ${action} operation completed successfully`
        };

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
        console.log('getBOMData called with:', { action, companyId, id, itemId, version, options });
        
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request();

        // Parametri obbligatori
        request.input('Action', sql.NVarChar(50), action);
        request.input('CompanyId', sql.Int, companyId);
        
        // Parametri ID (o Id o ItemId)
        if (id) {
            request.input('Id', sql.BigInt, id);
            console.log('Using Id for BOM lookup:', id);
        } else if (itemId) {
            request.input('ItemId', sql.BigInt, itemId);
            console.log('Using ItemId for BOM lookup:', itemId);
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

        console.log('Executing MA_ProjectArticles_GetBOMDatas with params:', request.parameters);
        
        // Esecuzione della stored procedure
        const result = await request.execute('MA_ProjectArticles_GetBOMDatas');
        console.log('SP execution complete');

        // Controllo errori
        const errorCode = request.parameters.ErrorCode.value ? request.parameters.ErrorCode.value : 0;
        if (errorCode !== 0) {
            const errorMsg = request.parameters.ErrorMessage.value || `Error code: ${errorCode}`;
            console.error('Error returned from SP:', errorMsg);
            throw new Error(errorMsg);
        }
        
        // Debug result recordsets
        console.log('Result recordsets count:', result.recordsets ? result.recordsets.length : 0);
        if (result.recordsets && result.recordsets.length > 0) {
            result.recordsets.forEach((rs, i) => {
                console.log(`Recordset ${i}: ${rs.length} records`);
                if (rs.length > 0) {
                    console.log('First record sample keys:', Object.keys(rs[0]));
                }
            });
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
                   
                        processedResult = {
                            components: result.recordsets[0] || [],
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
        
        console.log('Processed result type:', processedResult ? typeof processedResult : 'null');
        if (processedResult) {
            if (Array.isArray(processedResult)) {
                console.log('Result is array with length:', processedResult.length);
            } else if (typeof processedResult === 'object') {
                console.log('Result is object with keys:', Object.keys(processedResult));
                if (processedResult.components) {
                    console.log('Components count:', processedResult.components.length);
                    if (processedResult.components.length > 0) {
                        console.log('First component sample:', 
                            JSON.stringify({
                                Level: processedResult.components[0].Level,
                                ComponentId: processedResult.components[0].ComponentId,
                                ItemId: processedResult.components[0].ItemId,
                                Path: processedResult.components[0].Path,
                                ComponentItemCode: processedResult.components[0].ComponentItemCode
                            })
                        );
                    }
                }
                if (processedResult.routing) {
                    console.log('Routing count:', processedResult.routing.length);
                }
            }
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
        let pool = await sql.connect(config.dbConfig);
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
        let pool = await sql.connect(config.dbConfig);
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
        let pool = await sql.connect(config.dbConfig);
        
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
        let pool = await sql.connect(config.dbConfig);
        // debug
        console.log('getItemById:', { companyId, itemId });
        
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
        
        console.log('Item result rows:', itemResult.recordset.length);
        
        if (itemResult.recordset.length === 0) {
            console.log(`Item with ID ${itemId} not found for company ${companyId}`);
            return null;
        }
        
        const item = itemResult.recordset[0];
        console.log('Item basic data:', {
            Id: item.Id,
            Item: item.Item,
            Description: item.Description
        });
        
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
            console.log('Projects count:', item.projects.length);
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
            console.log('BOMs count:', item.boms.length);
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
                        CASE 
                            WHEN r.Nature = 22413314 THEN 'Acquisto'
                            WHEN r.Nature = 22413312 THEN 'Conto Lavoro'
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
            console.log('References count:', item.references.length);
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
const getERPBOMs = async (companyId, searchText = '') => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        // Query corretta per recuperare le distinte dal gestionale Mago
        // includendo ItemId e BOMId se già presenti nelle tabelle di progetto
        let query = `
            SELECT 
                T0.BOM, 
                T0.Description, 
                T0.UoM,
                T0.CreationDate,
                T1.Id AS ItemId,
                T2.Id AS BOMId
            FROM 
                dbo.MA_BillOfMaterials T0
            LEFT JOIN 
                MA_ProjectArticles_Items T1 ON T1.Item = T0.BOM AND T1.CompanyId = T0.CompanyId
            LEFT JOIN 
                MA_ProjectArticles_BillOfMaterials T2 ON T2.ItemId = T1.Id
            WHERE 
                T0.CompanyId = @CompanyId
                AND T0.Disabled = 0
        `;
        
        // Aggiungi filtro di ricerca se specificato
        if (searchText) {
            query += ` AND (T0.BOM LIKE @SearchText OR T0.Description LIKE @SearchText)`;
        }
        
        // Ordina per BOM e limita i risultati
        query += ` ORDER BY T0.BOM OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY`;
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId);
        
        if (searchText) {
            request.input('SearchText', sql.VarChar(100), `%${searchText}%`);
        }
        
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
        
        console.log('bomsWithComponents:', bomsWithComponents);
        return bomsWithComponents;
    } catch (err) {
        console.error('Error in getERPBOMs:', err);
        throw err;
    }
};

// Nuova funzione: ottenere distinte base di riferimento
const getReferenceBOMs = async (companyId, filters = {}, pagination = { page: 1, pageSize: 10 }) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
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
        console.log('REORDER_COMPONENTS - Parametri:', {
            companyId, bomId, components, userId
        });
        
        let pool = await sql.connect(config.dbConfig);
        
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
                
                console.log(`Componente ${oldLine} spostato temporaneamente a linea ${tempLine}`);
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
                
                console.log(`Componente temporaneo ${tempLine} spostato definitivamente a linea ${newOrder}`);
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
        let pool = await sql.connect(config.dbConfig);
        
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('ProjectId', sql.Int, projectId)
            .query(`
                SELECT i.*
                FROM dbo.MA_ProjectArticles_Items i
                WHERE i.CompanyId = @CompanyId 
                AND i.Disabled = 0
                AND NOT EXISTS (
                    SELECT 1 
                    FROM dbo.MA_ProjectsItems p 
                    WHERE p.ItemId = i.Id 
                    AND p.ProjectID = @ProjectId
                )
                AND ( i.stato_erp = 0 OR i.stato_erp IS NULL )
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
        let pool = await sql.connect(config.dbConfig);
        
        // Query di base per articoli dal gestionale
        let query = `
            SELECT TOP	300
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
        let pool = await sql.connect(config.dbConfig);
        
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
        
        console.log('Request parameters before execution:', request.parameters);
        
        // Esecuzione della stored procedure con gestione appropriata del risultato
        const result = await request.execute('MA_AddUpdateItemProjectFromERP');
        
        console.log('Stored procedure execution result:', result);
        console.log('Request parameters after execution:', request.parameters);
        
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
        console.log('Return value:', returnValue);
        
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
        let pool = await sql.connect(config.dbConfig);
        
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
        console.log('REPLACE_COMPONENT - Parametri:', {
            companyId, bomId, componentLine, newComponentId, newComponentCode, userId
        });
        
        let pool = await sql.connect(config.dbConfig);
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
        
        // Debug - mostra tutti i parametri passati
        console.log('Parametri della richiesta:', request.parameters);
        
        // Execute the stored procedure
        const result = await request.execute('MA_ProjectArticles_AddUpdateBOM');
        
        // Debug - mostra i risultati completi
        console.log('Risultato completo della stored procedure:', JSON.stringify(result, null, 2));
        console.log('Parametri dopo l\'esecuzione:', request.parameters);
        
        // Controllo valori dei parametri di output
        const returnValue = request.parameters.ReturnValue.value || 0;
        const errorCode = request.parameters.ErrorCode.value || 0;
        const errorMessage = request.parameters.ErrorMessage.value || '';
        
        console.log('Risultati della sostituzione:', {
            returnValue,
            errorCode,
            errorMessage
        });
        
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
            console.log('Verifica componente dopo sostituzione:', checkResult.recordset);
            
            if (checkResult.recordset && checkResult.recordset.length > 0) {
                const componentIdAfterReplace = checkResult.recordset[0].ComponentId;
                console.log('ComponentId dopo sostituzione:', componentIdAfterReplace);
                
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
        let pool = await sql.connect(config.dbConfig);
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
        
        // Debug
        console.log('Request parameters before execution:', request.parameters);

        // Execute the stored procedure
        const spResult = await request.execute('MA_ProjectArticles_AddUpdateBOM');
        
        // Debug
        console.log('Stored procedure execution result:', spResult);
        console.log('Output parameters after execution:', {
            ReturnValue: request.parameters.ReturnValue.value,
            ErrorCode: request.parameters.ErrorCode.value, 
            ErrorMessage: request.parameters.ErrorMessage.value,
            CreatedComponentCode: request.parameters.CreatedComponentCode.value
        });
        
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
        let pool = await sql.connect(config.dbConfig);
        
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
        let pool = await sql.connect(config.dbConfig);
        
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
        let pool = await sql.connect(config.dbConfig);
        
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
      let pool = await sql.connect(config.dbConfig);
      
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
      let pool = await sql.connect(config.dbConfig);
      
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
      let pool = await sql.connect(config.dbConfig);
      
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
      let pool = await sql.connect(config.dbConfig);
      
      const result = await pool.request()
        .input('CompanyId', sql.Int, companyId)
        .input('ItemId', sql.BigInt, itemId)
        .query(`
          SELECT 
            Id, BOM, Version, Description
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
      let pool = await sql.connect(config.dbConfig);
      
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
      let pool = await sql.connect(config.dbConfig);
      
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
      let pool = await sql.connect(config.dbConfig);
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
    updateItemDetails
};