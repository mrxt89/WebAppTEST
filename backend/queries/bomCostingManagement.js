const sql = require('mssql');
const config = require('../config');

/**
 * Modulo per la gestione della costificazione BOM
 * Implementa le funzionalità di calcolo automatico dei costi delle distinte base
 */

// Inizializza i parametri di costificazione per una company
const initializeBOMCostingParameters = async (companyId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .execute('SP_InitializeBOMCostingParameters');
        
        return {
            success: true,
            message: 'Parametri di costificazione inizializzati',
            data: result.recordset
        };
    } catch (err) {
        console.error('Error in initializeBOMCostingParameters:', err);
        throw err;
    }
};

// Ottieni tutti i parametri di costificazione
const getBOMCostingParameters = async (companyId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .query(`
                SELECT 
                    Id,
                    ParameterName,
                    ParameterValue,
                    Description,
                    IsActive,
                    TBCreated,
                    TBModified
                FROM MA_BOMCostingParameters 
                WHERE CompanyId = @CompanyId
                ORDER BY ParameterName
            `);
        
        return result.recordset;
    } catch (err) {
        console.error('Error in getBOMCostingParameters:', err);
        throw err;
    }
};

// Aggiorna parametri di costificazione
const updateBOMCostingParameter = async (companyId, parameterId, parameterValue, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('Id', sql.BigInt, parameterId)
            .input('ParameterValue', sql.Float, parameterValue)
            .input('UserId', sql.Int, userId)
            .query(`
                UPDATE MA_BOMCostingParameters 
                SET 
                    ParameterValue = @ParameterValue,
                    TBModified = GETDATE(),
                    TBModifiedId = @UserId
                WHERE CompanyId = @CompanyId AND Id = @Id;
                
                SELECT 
                    Id,
                    ParameterName,
                    ParameterValue,
                    Description,
                    IsActive
                FROM MA_BOMCostingParameters 
                WHERE CompanyId = @CompanyId AND Id = @Id;
            `);
        
        if (result.recordset.length === 0) {
            throw new Error('Parametro non trovato');
        }
        
        return {
            success: true,
            message: 'Parametro aggiornato con successo',
            data: result.recordset[0]
        };
    } catch (err) {
        console.error('Error in updateBOMCostingParameter:', err);
        throw err;
    }
};

// Calcola la costificazione di una BOM
const calculateBOMCosting = async (companyId, bomId, options = {}) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const {
            orderQuantity = null,
            scrapPercentage = null,
            useGranularMarkups = true, // Default a true per le nuove regole
            useKnownData = true, // Default a true per usare dati noti quando disponibili
            updateBOMRecord = true, // Default a true per aggiornare il record
            userId = null, // ID dell'utente per audit
            debug = false,
            version = null // Nuovo parametro per specificare la versione
        } = options;
        
        // Se è specificata una versione, prima verifichiamo che esista
        if (version !== null) {
            const versionCheck = await pool.request()
                .input('CompanyId', sql.Int, companyId)
                .input('BOMId', sql.BigInt, bomId)
                .input('Version', sql.Int, version)
                .query(`
                    SELECT COUNT(*) as VersionExists
                    FROM MA_ProjectArticles_BillOfMaterials
                    WHERE CompanyId = @CompanyId AND Id = @BOMId AND Version = @Version
                `);
            
            if (versionCheck.recordset[0].VersionExists === 0) {
                throw new Error(`Versione ${version} non trovata per la BOM ${bomId}`);
            }
        }
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('BOMId', sql.BigInt, bomId)
            .input('Debug', sql.Bit, debug ? 1 : 0)
            .input('UseGranularMarkups', sql.Bit, useGranularMarkups ? 1 : 0)
            .input('UseKnownData', sql.Bit, useKnownData ? 1 : 0)
            .input('UpdateBOMRecord', sql.Bit, updateBOMRecord ? 1 : 0)
            .input('UserId', sql.Int, userId);
        
        if (orderQuantity !== null) {
            request.input('OrderQuantity', sql.Decimal(18, 5), orderQuantity);
        }
        
        if (scrapPercentage !== null) {
            request.input('ScrapPercentage', sql.Float, scrapPercentage);
        }
        
        if (version !== null) {
            request.input('Version', sql.Int, version);
        }
        
        const result = await request.execute('SP_CalculateBOMCosting');
        
        if (result.recordset && result.recordset.length > 0) {
            const costingResult = result.recordset[0];
            
            // Se è richiesto il debug, include anche il dettaglio componenti
            let componentDetails = null;
            if (debug && result.recordsets && result.recordsets.length > 1) {
                componentDetails = result.recordsets[1];
            }
            
            return {
                success: true,
                message: 'Costificazione calcolata con successo',
                data: {
                    costing: costingResult,
                    components: componentDetails,
                    calculation_timestamp: new Date().toISOString(),
                    version_used: version
                }
            };
        } else {
            throw new Error('Nessun risultato dalla procedura di costificazione');
        }
    } catch (err) {
        console.error('Error in calculateBOMCosting:', err);
        
        // Se l'errore contiene un messaggio specifico dalla stored procedure
        if (err.message && err.message.includes('BOM non trovata')) {
            throw new Error('BOM non trovata con l\'ID specificato');
        }
        
        if (err.message && err.message.includes('versione non trovata')) {
            throw new Error(err.message);
        }
        
        throw err;
    }
};

// Calcola costificazione per multiple BOM
const batchCalculateBOMCosting = async (companyId, bomIds, options = {}) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const {
            orderQuantity = null,
            scrapPercentage = null,
            useKnownData = true, // Default a true per usare dati noti quando disponibili
            updateBOMRecord = true, // Default a true per aggiornare i record
            userId = null, // ID dell'utente per audit
            version = null // Nuovo parametro per specificare la versione
        } = options;
        
        const bomIdsString = Array.isArray(bomIds) ? bomIds.join(',') : bomIds;
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('BOMIds', sql.NVarChar(sql.MAX), bomIdsString)
            .input('UseKnownData', sql.Bit, useKnownData ? 1 : 0)
            .input('UpdateBOMRecord', sql.Bit, updateBOMRecord ? 1 : 0)
            .input('UserId', sql.Int, userId);
        
        if (orderQuantity !== null) {
            request.input('OrderQuantity', sql.Decimal(18, 5), orderQuantity);
        }
        
        if (scrapPercentage !== null) {
            request.input('ScrapPercentage', sql.Float, scrapPercentage);
        }
        
        if (version !== null) {
            request.input('Version', sql.Int, version);
        }
        
        const result = await request.execute('SP_BatchCalculateBOMCosting');
        
        return {
            success: true,
            message: 'Costificazione batch completata',
            data: {
                results: result.recordset,
                processed_count: result.recordset.length,
                success_count: result.recordset.filter(r => r.Status === 'SUCCESS').length,
                error_count: result.recordset.filter(r => r.Status === 'ERROR').length,
                version_used: version
            }
        };
    } catch (err) {
        console.error('Error in batchCalculateBOMCosting:', err);
        throw err;
    }
};

// Salva lo storico dei parametri di costificazione con ricarichi custom BOM-specific
const saveBOMCostingHistory = async (companyId, bomId, costingData, userId) => {
    try {
        let pool = await sql.connect(config.dbConfig);

        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('BOMId', sql.BigInt, bomId)
            .input('OrderQuantity', sql.Decimal(18, 5), costingData.orderQuantity || null)
            .input('ScrapPercentage', sql.Float, costingData.scrapPercentage || null)
            .input('UseGranularMarkups', sql.Bit, costingData.useGranularMarkups ? 1 : 0)
            .input('UpdateBOMRecord', sql.Bit, costingData.updateBOMRecord ? 1 : 0)
            .input('ParametersSnapshot', sql.NVarChar(sql.MAX), costingData.parametersSnapshot || null)
            .input('RMCost', sql.Float, costingData.rmCost || null)
            .input('ProcessingCost', sql.Float, costingData.processingCost || null)
            .input('TotalCost', sql.Float, costingData.totalCost || null)
            .input('TotalPrice', sql.Float, costingData.totalPrice || null)
            .input('CalculatedBy', sql.Int, userId)
            .input('Notes', sql.NVarChar(sql.MAX), costingData.notes || null);

        // Aggiungi ricarichi custom BOM-specific se presenti
        if (costingData.customMarkups) {
            const cm = costingData.customMarkups;
            request
                .input('CustomMarkupRM', sql.Float, cm.markupRM || null)
                .input('CustomMarkupRMPurchase', sql.Float, cm.markupRMPurchase || null)
                .input('CustomMarkupRMProduction', sql.Float, cm.markupRMProduction || null)
                .input('CustomMarkupOperations', sql.Float, cm.markupOperations || null)
                .input('CustomMarkupInternalOps', sql.Float, cm.markupInternalOps || null)
                .input('CustomMarkupExternalOps', sql.Float, cm.markupExternalOps || null)
                .input('CustomMarkupOverhead', sql.Float, cm.markupOverhead || null)
                .input('CustomMarkupsJSON', sql.NVarChar(sql.MAX), cm.customMarkupsJSON || null);
        } else {
            // Se non ci sono ricarichi custom, passa NULL per tutti
            request
                .input('CustomMarkupRM', sql.Float, null)
                .input('CustomMarkupRMPurchase', sql.Float, null)
                .input('CustomMarkupRMProduction', sql.Float, null)
                .input('CustomMarkupOperations', sql.Float, null)
                .input('CustomMarkupInternalOps', sql.Float, null)
                .input('CustomMarkupExternalOps', sql.Float, null)
                .input('CustomMarkupOverhead', sql.Float, null)
                .input('CustomMarkupsJSON', sql.NVarChar(sql.MAX), null);
        }

        const result = await request.execute('SP_SaveBOMCostingHistory');

        return {
            success: true,
            message: 'Storico parametri salvato con successo',
            data: result.recordset[0]
        };
    } catch (err) {
        console.error('Error in saveBOMCostingHistory:', err);
        throw err;
    }
};

// Ottieni lo storico dei parametri di costificazione
const getBOMCostingParametersHistory = async (companyId, bomId = null, top = null, orderBy = 'CostingDate DESC') => {
    try {
        let pool = await sql.connect(config.dbConfig);

        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('OrderBy', sql.NVarChar(50), orderBy);

        if (bomId !== null) {
            request.input('BOMId', sql.BigInt, bomId);
        }

        if (top !== null) {
            request.input('Top', sql.Int, top);
        }

        const result = await request.execute('SP_GetBOMCostingHistory');

        return result.recordset;
    } catch (err) {
        console.error('Error in getBOMCostingParametersHistory:', err);
        throw err;
    }
};

// Ottieni log delle costificazioni
const getBOMCostingLogs = async (companyId, bomId = null, logLevel = null, limit = 100) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        let query = `
            SELECT TOP(@Limit)
                bcl.Id,
                bcl.BOMId,
                bom.BOM as BOMCode,
                bom.Description as BOMDescription,
                bcl.LogLevel,
                bcl.LogMessage,
                bcl.Details,
                bcl.TBCreated
            FROM MA_BOMCostingLog bcl
            LEFT JOIN MA_ProjectArticles_BillOfMaterials bom 
                ON bcl.BOMId = bom.Id AND bcl.CompanyId = bom.CompanyId
            WHERE bcl.CompanyId = @CompanyId
        `;
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('Limit', sql.Int, limit);
        
        if (bomId) {
            query += ` AND bcl.BOMId = @BOMId`;
            request.input('BOMId', sql.BigInt, bomId);
        }
        
        if (logLevel) {
            query += ` AND bcl.LogLevel = @LogLevel`;
            request.input('LogLevel', sql.VarChar(20), logLevel);
        }
        
        query += ` ORDER BY bcl.TBCreated DESC`;
        
        const result = await request.query(query);
        
        return result.recordset;
    } catch (err) {
        console.error('Error in getBOMCostingLogs:', err);
        throw err;
    }
};

// Ottieni lista BOM disponibili per costificazione con paginazione
const getAvailableBOMs = async (companyId, filters = {}, pagination = {}) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        // Parametri di paginazione con default
        const page = parseInt(pagination.page) || 1;
        const pageSize = parseInt(pagination.pageSize) || 50;
        const offset = (page - 1) * pageSize;
        
        // Query per contare il totale dei record
        let countQuery = `
            SELECT COUNT(*) as TotalCount
            FROM MA_ProjectArticles_BillOfMaterials bom
            JOIN MA_ProjectArticles_Items itm ON bom.ItemId = itm.Id AND bom.CompanyId = itm.CompanyId
            WHERE bom.CompanyId = @CompanyId
        `;
        
        // Query principale per i dati
        let dataQuery = `
            SELECT 
                bom.Id,
                bom.BOM as BOMCode,
                bom.Description,
                bom.ItemId,
                itm.Item as ItemCode,
                itm.Description as ItemDescription,
                itm.Nature,
                CASE 
                    WHEN itm.Nature = 22413312 THEN 'Semilavorato'
                    WHEN itm.Nature = 22413313 THEN 'Prodotto Finito'
                    WHEN itm.Nature = 22413314 THEN 'Acquisto'
                    ELSE 'Altro'
                END as NatureDescription,
                bom.BOMStatus,
                bom.UoM,
                bom.ProductionLot,
                bom.TotalCost as LastCalculatedCost,
                bom.RMCost as LastMaterialCost,
                bom.ProcessingCost as LastProcessingCost,
                bom.Version,
                bom.stato_erp,
                CASE 
                    WHEN bom.stato_erp = 1 THEN 'Esportato'
                    ELSE 'Non Esportato'
                END as StatoERPDescription,
                (SELECT COUNT(*) FROM MA_ProjectArticles_BOMComponents comp 
                 WHERE comp.BOMId = bom.Id AND comp.CompanyId = bom.CompanyId) as ComponentCount,
                (SELECT COUNT(*) FROM MA_ProjectArticles_BOMRouting rt 
                 WHERE rt.BOMId = bom.Id AND rt.CompanyId = bom.CompanyId) as RoutingCount
            FROM MA_ProjectArticles_BillOfMaterials bom
            JOIN MA_ProjectArticles_Items itm ON bom.ItemId = itm.Id AND bom.CompanyId = itm.CompanyId
            WHERE bom.CompanyId = @CompanyId
        `;
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId);
        
        // Filtri opzionali (applicati a entrambe le query)
        let filterConditions = '';
        if (filters.bomStatus) {
            filterConditions += ` AND bom.BOMStatus = @BOMStatus`;
            request.input('BOMStatus', sql.VarChar(50), filters.bomStatus);
        }
        
        if (filters.nature) {
            filterConditions += ` AND itm.Nature = @Nature`;
            request.input('Nature', sql.Int, filters.nature);
        }
        
        if (filters.searchText) {
            filterConditions += ` AND (bom.BOM LIKE @SearchText OR bom.Description LIKE @SearchText OR itm.Item LIKE @SearchText)`;
            request.input('SearchText', sql.NVarChar(255), `%${filters.searchText}%`);
        }
        
        
        // Applica i filtri a entrambe le query
        countQuery += filterConditions;
        dataQuery += filterConditions;
        
        // Aggiungi paginazione e ordinamento alla query dei dati
        dataQuery += ` ORDER BY bom.BOM OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY`;
        request.input('Offset', sql.Int, offset);
        request.input('PageSize', sql.Int, pageSize);
        
        // Esegui entrambe le query
        const [countResult, dataResult] = await Promise.all([
            request.query(countQuery),
            request.query(dataQuery)
        ]);
        
        const totalCount = countResult.recordset[0].TotalCount;
        const totalPages = Math.ceil(totalCount / pageSize);
        
        return {
            data: dataResult.recordset,
            pagination: {
                page,
                pageSize,
                totalCount,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        };
    } catch (err) {
        console.error('Error in getAvailableBOMs:', err);
        throw err;
    }
};

// Esporta risultato costificazione in formato Excel/JSON
const exportBOMCostingResult = async (companyId, bomId, format = 'json') => {
    try {
        // Prima calcola la costificazione con debug abilitato
        const costingResult = await calculateBOMCosting(companyId, bomId, { debug: true });
        
        if (!costingResult.success) {
            throw new Error('Errore nel calcolo della costificazione');
        }
        
        const { costing, components } = costingResult.data;
        
        // Prepara i dati per l'export
        const exportData = {
            summary: {
                bom_id: costing.bom_id,
                bom_code: costing.bom_code,
                bom_description: costing.bom_description,
                item_code: costing.item_code,
                item_description: costing.item_description,
                calculation_timestamp: costing.calculation_timestamp
            },
            costs: {
                material_cost_total: costing.material_cost_total,
                operations_cost_total: costing.operations_cost_total,
                fixed_cost_total: costing.fixed_cost_total,
                base_cost: costing.base_cost,
                scarto_pct: costing.scarto_pct,
                adjusted_cost: costing.adjusted_cost,
                markup_applied: costing.markup_applied,
                unit_cost_final: costing.unit_cost_final,
                total_cost_order: costing.total_cost_order,
                order_quantity: costing.order_quantity
            },
            components: components || [],
            metadata: {
                components_count: costing.components_count,
                loops_detected: costing.loops_detected,
                status_note: costing.status_note,
                unit_of_measure: costing.unit_of_measure
            }
        };
        
        if (format === 'excel') {
            // Per implementazioni future: convertire in Excel
            return {
                success: true,
                message: 'Export Excel non ancora implementato',
                data: exportData,
                format: 'json'
            };
        }
        
        return {
            success: true,
            message: 'Export completato con successo',
            data: exportData,
            format: 'json'
        };
    } catch (err) {
        console.error('Error in exportBOMCostingResult:', err);
        throw err;
    }
};

// Ottieni dettaglio costi per una BOM
const getBOMCostingDetails = async (companyId, bomId, options = {}) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const {
            calculationId = null,
            updateBOMRecord = false,
            useKnownData = true,
            useGranularMarkups = true,
            orderQuantity = null,
            scrapPercentage = null,
            version = null
        } = options;
        
        // Se updateBOMRecord è true, esegui prima il calcolo aggiornato
        if (updateBOMRecord) {
            const calculateOptions = {
                orderQuantity,
                scrapPercentage,
                useGranularMarkups,
                updateBOMRecord: false, // Non aggiornare la BOM, solo calcolare
                useKnownData,
                debug: false,
                version
            };
            
            // Esegui il calcolo per ottenere i costi aggiornati
            await calculateBOMCosting(companyId, bomId, calculateOptions);
        }
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('BOMId', sql.BigInt, bomId);
        
        if (calculationId) {
            request.input('CalculationId', sql.BigInt, calculationId);
        }
        
        const result = await request.execute('SP_GetBOMCostingDetails');
        
        // La stored procedure restituisce multiple recordset
        const [bomInfo, components, routing, parameters, logs] = result.recordsets;
        
        return {
            success: true,
            message: 'Dettaglio costi recuperato con successo',
            data: {
                bomInfo: bomInfo[0] || null,
                components: components || [],
                routing: routing || [],
                parameters: parameters || [],
                logs: logs || []
            }
        };
    } catch (err) {
        console.error('Error in getBOMCostingDetails:', err);
        throw err;
    }
};

// Cerca BOM con costi già calcolati
const searchBOMCostingHistory = async (companyId, searchText = null, pagination = {}) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const page = parseInt(pagination.page) || 1;
        const pageSize = parseInt(pagination.pageSize) || 50;
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('Page', sql.Int, page)
            .input('PageSize', sql.Int, pageSize);
        
        if (searchText) {
            request.input('SearchText', sql.VarChar(50), `%${searchText}%`);
        }
        
        const result = await request.execute('SP_SearchBOMCostingHistory');
        
        // La stored procedure restituisce due recordset: count e data
        const [countResult, dataResult] = result.recordsets;
        const totalCount = countResult[0]?.TotalCount || 0;
        const totalPages = Math.ceil(totalCount / pageSize);
        
        return {
            success: true,
            message: 'Ricerca cronologia costi completata',
            data: dataResult || [],
            pagination: {
                page,
                pageSize,
                totalCount,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        };
    } catch (err) {
        console.error('Error in searchBOMCostingHistory:', err);
        throw err;
    }
};

// Ottieni dettaglio costi storici per una BOM
const getBOMCostingHistory = async (companyId, bomId = null, bomCode = null) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId);
        
        if (bomId) {
            request.input('BOMId', sql.BigInt, bomId);
        }
        
        if (bomCode) {
            request.input('BOMCode', sql.VarChar(50), bomCode);
        }
        
        const result = await request.execute('SP_GetBOMCostingHistory');
        
        // La stored procedure restituisce multiple recordset
        const [bomInfo, components, routing, logs] = result.recordsets;
        
        return {
            success: true,
            message: 'Cronologia costi recuperata con successo',
            data: {
                bomInfo: bomInfo[0] || null,
                components: components || [],
                routing: routing || [],
                logs: logs || []
            }
        };
    } catch (err) {
        console.error('Error in getBOMCostingHistory:', err);
        throw err;
    }
};

module.exports = {
    initializeBOMCostingParameters,
    getBOMCostingParameters,
    updateBOMCostingParameter,
    calculateBOMCosting,
    batchCalculateBOMCosting,
    getBOMCostingLogs,
    getAvailableBOMs,
    exportBOMCostingResult,
    getBOMCostingDetails,
    searchBOMCostingHistory,
    getBOMCostingHistory
};

// =============================================
// Funzione: Ottieni breakdown dettagliato costi operazioni
// =============================================
const getBOMOperationsCostBreakdown = async (companyId, bomId, includeMultilevel = true) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('BOMId', sql.BigInt, bomId)
            .input('IncludeMultilevel', sql.Bit, includeMultilevel);
        
        const result = await request.execute('SP_GetBOMOperationsCostBreakdown');
        
        return {
            success: true,
            message: 'Breakdown costi operazioni recuperato con successo',
            data: result.recordset || []
        };
    } catch (err) {
        console.error('Error in getBOMOperationsCostBreakdown:', err);
        throw err;
    }
};

module.exports = {
    getBOMCostingParameters,
    updateBOMCostingParameter,
    calculateBOMCosting,
    batchCalculateBOMCosting,
    getBOMCostingLogs,
    getAvailableBOMs,
    exportBOMCostingResult,
    getBOMCostingDetails,
    searchBOMCostingHistory,
    getBOMCostingHistory,
    getBOMOperationsCostBreakdown
};

// Test calcolo con esempio fornito
const testBOMCostingExample = async (companyId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .execute('SP_TestBOMCostingExample');
        
        return {
            success: true,
            message: 'Test calcolo completato',
            data: result.recordset
        };
    } catch (err) {
        console.error('Error in testBOMCostingExample:', err);
        throw err;
    }
};

// Ottieni tutte le versioni di una BOM per un articolo
const getBOMVersions = async (companyId, itemId) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
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

module.exports = {
    initializeBOMCostingParameters,
    getBOMCostingParameters,
    updateBOMCostingParameter,
    calculateBOMCosting,
    batchCalculateBOMCosting,
    saveBOMCostingHistory,
    getBOMCostingParametersHistory,
    getBOMCostingHistory,
    getBOMCostingLogs,
    getAvailableBOMs,
    exportBOMCostingResult,
    getBOMCostingDetails,
    searchBOMCostingHistory,
    getBOMOperationsCostBreakdown,
    testBOMCostingExample,
    getBOMVersions
};
