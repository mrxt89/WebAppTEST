const sql = require('mssql');
const config = require('../config');

/**
 * Get coding hierarchy based on parent selection
 * @param {number} companyId - Company ID
 * @param {number} categoryId - Category ID (optional)
 * @param {number} macroFamilyId - MacroFamily ID (optional)
 * @param {number} familyId - Family ID (optional)
 * @param {number} typeId - Type ID (optional)
 * @returns {Promise<Array>} Hierarchy items
 */
const getCodingHierarchy = async (companyId, categoryId = null, macroFamilyId = null, familyId = null, typeId = null) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        request.input('CompanyId', sql.Int, companyId);
        request.input('CategoryId', sql.BigInt, categoryId);
        request.input('MacroFamilyId', sql.BigInt, macroFamilyId);
        request.input('FamilyId', sql.BigInt, familyId);
        request.input('TypeId', sql.BigInt, typeId);

        const result = await request.execute('MA_CodingRules_GetHierarchy');
        
        return result.recordset;
    } catch (err) {
        console.error('Error getting coding hierarchy:', err);
        throw err;
    }
};

/**
 * Get next sequential number for a specific root code
 * @param {number} companyId - Company ID
 * @param {string} macroFamilyCode - MacroFamily code (1 char)
 * @param {string} familyCode - Family code (3 chars)
 * @param {string} typeCode - Type code (3 chars)
 * @param {string} aliasCode - Alias code (3 chars)
 * @returns {Promise<number>} Next sequential number
 */
const getNextSequential = async (companyId, macroFamilyCode, familyCode, typeCode, aliasCode) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        request.input('CompanyId', sql.Int, companyId);
        request.input('MacroFamilyCode', sql.VarChar(1), macroFamilyCode);
        request.input('FamilyCode', sql.VarChar(3), familyCode);
        request.input('TypeCode', sql.VarChar(3), typeCode);
        request.input('AliasCode', sql.VarChar(3), aliasCode);
        request.output('NextSequential', sql.Int);

        await request.execute('MA_CodingRules_GetNextSequential');
        
        return request.parameters.NextSequential.value;
    } catch (err) {
        console.error('Error getting next sequential:', err);
        throw err;
    }
};

/**
 * Validate a code
 * @param {number} companyId - Company ID
 * @param {string} itemCode - Item code to validate
 * @returns {Promise<{isValid: boolean, errorMessage: string}>} Validation result
 */
const validateCode = async (companyId, itemCode) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        request.input('CompanyId', sql.Int, companyId);
        request.input('ItemCode', sql.VarChar(64), itemCode);
        request.output('IsValid', sql.Bit);
        request.output('ErrorMessage', sql.NVarChar(500));

        const result = await request.execute('MA_CodingRules_ValidateCode');
        
        // Accedi ai parametri di output dal risultato
        const outputParams = result.output;
        const isValid = outputParams.IsValid;
        const errorMessage = outputParams.ErrorMessage;
        
        // Se ancora null, prova con un approccio alternativo
        if (isValid === null || isValid === undefined) {
            // Prova a fare una query diretta
            const queryRequest = pool.request();
            queryRequest.input('CompanyId', sql.Int, companyId);
            queryRequest.input('ItemCode', sql.VarChar(64), itemCode);
            
            const queryResult = await queryRequest.query(`
                DECLARE @IsValid BIT;
                DECLARE @ErrorMessage NVARCHAR(500);
                
                EXEC dbo.MA_CodingRules_ValidateCode
                    @CompanyId = @CompanyId,
                    @ItemCode = @ItemCode,
                    @IsValid = @IsValid OUTPUT,
                    @ErrorMessage = @ErrorMessage OUTPUT;
                    
                SELECT @IsValid AS IsValid, @ErrorMessage AS ErrorMessage;
            `);
            

            
            if (queryResult.recordset && queryResult.recordset.length > 0) {
                const row = queryResult.recordset[0];
                return {
                    isValid: row.IsValid === true || row.IsValid === 1,
                    errorMessage: row.ErrorMessage || ""
                };
            }
        }
        
        return {
            isValid: isValid === true || isValid === 1,
            errorMessage: errorMessage || ""
        };
    } catch (err) {
        console.error('Error validating code:', err);
        throw err;
    }
};

/**
 * Apply batch recoding
 * @param {number} companyId - Company ID
 * @param {number} userId - User ID performing the operation
 * @param {Array} items - Array of items to recode
 * @returns {Promise<{success: number, successCount: number, errorCount: number, msg: string}>} Operation result
 */
const applyBatchRecoding = async (companyId, userId, items) => {
    try {
        let pool = await sql.connect(config.database);
        

        
        // Create TVP (Table-Valued Parameter)
        const tvp = new sql.Table('MA_CodingRules_ItemsToRecode');
        tvp.columns.add('ItemId', sql.BigInt);
        tvp.columns.add('OldCode', sql.VarChar(64));
        tvp.columns.add('NewCode', sql.VarChar(64));
        tvp.columns.add('NewDescription', sql.NVarChar(128));
        tvp.columns.add('MacroFamilyId', sql.BigInt);
        tvp.columns.add('FamilyId', sql.BigInt);
        tvp.columns.add('TypeId', sql.BigInt);
        tvp.columns.add('AliasId', sql.BigInt);
        tvp.columns.add('Measures', sql.VarChar(2));
        tvp.columns.add('Sequential', sql.Int);
        tvp.columns.add('UseExistingArticleId', sql.BigInt);
        tvp.columns.add('ReplaceWithExisting', sql.Bit);
        tvp.columns.add('TechnicalCharacteristicsJSON', sql.NVarChar(sql.MAX)); // NUOVO: JSON caratteristiche tecniche

        // Add rows to TVP
        items.forEach(item => {
            const useExistingArticleId = item.UseExistingArticleId ? 
                (typeof item.UseExistingArticleId === 'string' ? 
                    parseInt(item.UseExistingArticleId) : 
                    item.UseExistingArticleId) : 
                null;



            // Prepara TechnicalCharacteristicsJSON: se presente come oggetto, convertilo in JSON string
            let technicalCharacteristicsJSON = null;
            if (item.TechnicalCharacteristicsJSON) {
                if (typeof item.TechnicalCharacteristicsJSON === 'string') {
                    // Già una stringa JSON
                    technicalCharacteristicsJSON = item.TechnicalCharacteristicsJSON;
                } else if (typeof item.TechnicalCharacteristicsJSON === 'object') {
                    // Converti oggetto in JSON string
                    technicalCharacteristicsJSON = JSON.stringify(item.TechnicalCharacteristicsJSON);
                }
            }

            tvp.rows.add(
                item.ItemId,
                item.OldCode,
                item.NewCode || item.OldCode,
                item.NewDescription || null,
                item.MacroFamilyId || null,
                item.FamilyId || null,
                item.TypeId || null,
                item.AliasId || null,
                item.Measures || null,
                item.Sequential || null,
                useExistingArticleId,
                item.ReplaceWithExisting ? 1 : 0,
                technicalCharacteristicsJSON // NUOVO: JSON caratteristiche tecniche
            );
        });



        const request = pool.request();
        request.input('CompanyId', sql.Int, companyId);
        request.input('UserId', sql.Int, userId);
        request.input('Items', tvp);
        request.output('SuccessCount', sql.Int);
        request.output('ErrorCount', sql.Int);

        // Esegui la stored procedure
        const result = await request.execute('MA_CodingRules_ApplyBatch');
        
        // Recupera i parametri di output
        let successCount = request.parameters.SuccessCount.value || 0;
        let errorCount = request.parameters.ErrorCount.value || 0;
        
        // Se abbiamo 0 successi e 0 errori ma abbiamo items, verifica manualmente
        if (successCount === 0 && errorCount === 0 && items.length > 0) {
            
            // Conta manualmente i successi verificando le modifiche nel database
            let manualSuccessCount = 0;
            
            for (const item of items) {
                try {
                    const checkRequest = pool.request();
                    checkRequest.input('CompanyId', sql.Int, companyId);
                    checkRequest.input('ItemId', sql.BigInt, item.ItemId);
                    
                    if (item.ReplaceWithExisting && item.UseExistingArticleId) {
                        // Verifica se ci sono componenti che puntano al nuovo articolo
                        checkRequest.input('NewComponentId', sql.BigInt, item.UseExistingArticleId);
                        
                        const checkResult = await checkRequest.query(`
                            SELECT COUNT(*) as Count
                            FROM MA_ProjectArticles_BOMComponents 
                            WHERE ComponentId = @NewComponentId 
                            AND CompanyId = @CompanyId
                        `);
                        
                        if (checkResult.recordset[0].Count > 0) {
                            manualSuccessCount++;
                        }
                    } else {
                        // Verifica se il codice è stato aggiornato
                        checkRequest.input('NewCode', sql.VarChar(64), item.NewCode);
                        
                        const checkResult = await checkRequest.query(`
                            SELECT COUNT(*) as Count
                            FROM MA_ProjectArticles_Items 
                            WHERE Id = @ItemId 
                            AND Item = @NewCode 
                            AND CompanyId = @CompanyId
                        `);
                        
                        if (checkResult.recordset[0].Count > 0) {
                            manualSuccessCount++;
                        }
                    }
                } catch (checkError) {
                    console.error(`Errore nel controllo manuale per item ${item.ItemId}:`, checkError);
                }
            }
            
            // Se abbiamo trovato successi manualmente, usa questi contatori
            if (manualSuccessCount > 0) {
                successCount = manualSuccessCount;
                errorCount = items.length - manualSuccessCount;
            }
        }
        
        // Restituisci il risultato anche se ci sono contatori a zero
        // (potrebbero essere tutte sostituzioni con articoli esistenti)
        return {
            success: 1,
            successCount: successCount,
            errorCount: errorCount,
            totalItems: items.length,
            msg: successCount > 0 
                ? `Ricodifica completata: ${successCount} articoli aggiornati, ${errorCount} errori`
                : errorCount > 0 
                    ? `Ricodifica fallita: ${errorCount} errori`
                    : items.length > 0 
                        ? 'Ricodifica completata'
                        : 'Nessun elemento da processare'
        };
        
    } catch (err) {
        console.error('Error applying batch recoding:', err);
        
        // Se la stored procedure non esiste, proviamo l'approccio alternativo
        if (err.message.includes('Could not find stored procedure')) {
            return await applyBatchRecodingAlternative(companyId, userId, items);
        }
        
        throw err;
    }
};

// Funzione alternativa che non usa stored procedure
const applyBatchRecodingAlternative = async (companyId, userId, items) => {
    
    let pool = await sql.connect(config.database);
    const transaction = new sql.Transaction(pool);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const processedItems = [];
    
    try {
        await transaction.begin();
        
        for (const item of items) {
            try {
                if (item.ReplaceWithExisting && item.UseExistingArticleId) {
                    // 1. Aggiorna tutti i riferimenti nelle distinte
                    const updateComponentsRequest = new sql.Request(transaction);
                    const updateResult = await updateComponentsRequest
                        .input('CompanyId', sql.Int, companyId)
                        .input('OldComponentId', sql.BigInt, item.ItemId)
                        .input('NewComponentId', sql.BigInt, item.UseExistingArticleId)
                        .query(`
                            UPDATE MA_ProjectArticles_BOMComponents
                            SET ComponentId = @NewComponentId,
                                TBModified = GETDATE(),
                                TBModifiedId = ${userId}
                            WHERE ComponentId = @OldComponentId 
                            AND CompanyId = @CompanyId
                        `);
                    
                    // 2. Aggiorna le associazioni progetti-articoli
                    const updateProjectsRequest = new sql.Request(transaction);
                    const projectsResult = await updateProjectsRequest
                        .input('CompanyId', sql.Int, companyId)
                        .input('OldItemId', sql.BigInt, item.ItemId)
                        .input('NewItemId', sql.BigInt, item.UseExistingArticleId)
                        .query(`
                            UPDATE MA_ProjectsItems
                            SET ItemId = @NewItemId
                            WHERE ItemId = @OldItemId 
                            AND CompanyId = @CompanyId
                        `);
                    
                    // 3. Disabilita l'articolo vecchio
                    const disableRequest = new sql.Request(transaction);
                    await disableRequest
                        .input('CompanyId', sql.Int, companyId)
                        .input('ItemId', sql.BigInt, item.ItemId)
                        .input('UserId', sql.Int, userId)
                        .query(`
                            UPDATE MA_ProjectArticles_Items
                            SET Disabled = 1,
                                TBModified = GETDATE(),
                                TBModifiedId = @UserId,
                                Notes = ISNULL(Notes, '') + 
                                    CHAR(13) + CHAR(10) + 
                                    '--- Sostituito con articolo ID ' + CAST(@ItemId AS VARCHAR) + 
                                    ' il ' + CONVERT(VARCHAR, GETDATE(), 120) + 
                                    ' da utente ' + CAST(@UserId AS VARCHAR) + ' ---'
                            WHERE Id = @ItemId 
                            AND CompanyId = @CompanyId
                        `);
                    
                    successCount++;
                    processedItems.push({
                        itemId: item.ItemId,
                        oldCode: item.OldCode,
                        newCode: item.NewCode,
                        status: 'success',
                        message: `Sostituito con articolo esistente ${item.UseExistingArticleId}`
                    });

                    // NUOVO: Aggiorna referenze Intercompany anche quando si sostituisce con esistente
                    try {
                        const updateIntercompanyRequest = new sql.Request(transaction);
                        const intercompanyResult = await updateIntercompanyRequest
                            .input('ItemId', sql.BigInt, item.ItemId)
                            .input('OldCode', sql.VarChar(64), item.OldCode)
                            .input('NewCode', sql.VarChar(64), item.NewCode)
                            .input('CompanyId', sql.Int, companyId)
                            .input('UserId', sql.Int, userId)
                            .query(`
                                -- Aggiorna TargetProjectItemCode quando l'item è il TARGET
                                UPDATE ref
                                SET ref.TargetProjectItemCode = @NewCode,
                                    ref.TBModified = GETDATE(),
                                    ref.TBModifiedId = @UserId
                                FROM MA_ProjectArticles_References ref
                                INNER JOIN MA_ProjectArticles_Items targetItem
                                    ON ref.TargetProjectItemId = targetItem.Id
                                    AND ref.TargetCompanyId = targetItem.CompanyId
                                WHERE targetItem.Id = @ItemId
                                    AND targetItem.CompanyId = @CompanyId;

                                -- Aggiorna quando l'item è SOURCE ma il codice è in TargetProjectItemCode
                                UPDATE ref
                                SET ref.TargetProjectItemCode = @NewCode,
                                    ref.TBModified = GETDATE(),
                                    ref.TBModifiedId = @UserId
                                FROM MA_ProjectArticles_References ref
                                INNER JOIN MA_ProjectArticles_Items sourceItem
                                    ON ref.SourceProjectItemId = sourceItem.Id
                                    AND ref.SourceCompanyId = sourceItem.CompanyId
                                WHERE sourceItem.Id = @ItemId
                                    AND sourceItem.CompanyId = @CompanyId
                                    AND ref.TargetProjectItemCode = @OldCode;

                                SELECT @@ROWCOUNT AS UpdatedCount;
                            `);

                        const intercompanyUpdatedCount = intercompanyResult.recordset[0]?.UpdatedCount || 0;
                        if (intercompanyUpdatedCount > 0) {
                            console.log(`Aggiornate ${intercompanyUpdatedCount} referenze Intercompany per item ${item.ItemId} (sostituzione con esistente)`);
                            // Aggiorna il messaggio di successo
                            const lastProcessed = processedItems[processedItems.length - 1];
                            if (lastProcessed && lastProcessed.itemId === item.ItemId) {
                                lastProcessed.message += ` (${intercompanyUpdatedCount} referenze Intercompany aggiornate)`;
                            }
                        }
                    } catch (intercompanyError) {
                        console.error('Errore nell\'aggiornamento referenze Intercompany (sostituzione):', intercompanyError);
                        // Non blocchiamo la ricodifica se fallisce l'aggiornamento Intercompany
                    }

                } else {
                    // Ricodifica normale
                    
                    // Prima verifica se il nuovo codice è già in uso
                    const checkRequest = new sql.Request(transaction);
                    const checkResult = await checkRequest
                        .input('CompanyId', sql.Int, companyId)
                        .input('NewCode', sql.VarChar(64), item.NewCode)
                        .input('ItemId', sql.BigInt, item.ItemId)
                        .query(`
                            SELECT COUNT(*) as Count
                            FROM MA_ProjectArticles_Items 
                            WHERE Item = @NewCode 
                            AND CompanyId = @CompanyId 
                            AND Id != @ItemId
                            AND Disabled = 0
                        `);
                    
                    if (checkResult.recordset[0].Count > 0) {
                        throw new Error(`Il codice ${item.NewCode} è già in uso`);
                    }
                    
                    // Aggiorna il codice articolo
                    const updateItemRequest = new sql.Request(transaction);
                    await updateItemRequest
                        .input('CompanyId', sql.Int, companyId)
                        .input('ItemId', sql.BigInt, item.ItemId)
                        .input('NewCode', sql.VarChar(64), item.NewCode)
                        .input('NewDescription', sql.NVarChar(128), item.NewDescription || null)
                        .input('MacroFamilyId', sql.BigInt, item.MacroFamilyId || null)
                        .input('FamilyId', sql.BigInt, item.FamilyId || null)
                        .input('TypeId', sql.BigInt, item.TypeId || null)
                        .input('AliasId', sql.BigInt, item.AliasId || null)
                        .input('UserId', sql.Int, userId)
                        .query(`
                            UPDATE MA_ProjectArticles_Items
                            SET Item = @NewCode,
                                Description = ISNULL(@NewDescription, Description),
                                MacrofamilyId = ISNULL(@MacroFamilyId, MacrofamilyId),
                                FamilyId = ISNULL(@FamilyId, FamilyId),
                                ItemTypeId = ISNULL(@TypeId, ItemTypeId),
                                AliasId = ISNULL(@AliasId, AliasId),
                                TBModified = GETDATE(),
                                TBModifiedId = @UserId
                            WHERE Id = @ItemId 
                            AND CompanyId = @CompanyId
                        `);
                    
                    // Aggiorna anche il codice BOM se esiste
                    const updateBomRequest = new sql.Request(transaction);
                    await updateBomRequest
                        .input('CompanyId', sql.Int, companyId)
                        .input('ItemId', sql.BigInt, item.ItemId)
                        .input('NewCode', sql.VarChar(64), item.NewCode)
                        .query(`
                            UPDATE MA_ProjectArticles_BillOfMaterials
                            SET BOM = @NewCode
                            WHERE ItemId = @ItemId 
                            AND CompanyId = @CompanyId
                        `);
                    
                    successCount++;
                    processedItems.push({
                        itemId: item.ItemId,
                        oldCode: item.OldCode,
                        newCode: item.NewCode,
                        status: 'success',
                        message: 'Ricodifica completata'
                    });
                }

                // NUOVO: Aggiorna referenze Intercompany dopo ricodifica
                try {
                    const updateIntercompanyRequest = new sql.Request(transaction);
                    const intercompanyResult = await updateIntercompanyRequest
                        .input('ItemId', sql.BigInt, item.ItemId)
                        .input('OldCode', sql.VarChar(64), item.OldCode)
                        .input('NewCode', sql.VarChar(64), item.NewCode)
                        .input('CompanyId', sql.Int, companyId)
                        .input('UserId', sql.Int, userId)
                        .query(`
                            -- Aggiorna TargetProjectItemCode quando l'item è il TARGET
                            UPDATE ref
                            SET ref.TargetProjectItemCode = @NewCode,
                                ref.TBModified = GETDATE(),
                                ref.TBModifiedId = @UserId
                            FROM MA_ProjectArticles_References ref
                            INNER JOIN MA_ProjectArticles_Items targetItem
                                ON ref.TargetProjectItemId = targetItem.Id
                                AND ref.TargetCompanyId = targetItem.CompanyId
                            WHERE targetItem.Id = @ItemId
                                AND targetItem.CompanyId = @CompanyId;

                            -- Aggiorna quando l'item è SOURCE ma il codice è in TargetProjectItemCode
                            UPDATE ref
                            SET ref.TargetProjectItemCode = @NewCode,
                                ref.TBModified = GETDATE(),
                                ref.TBModifiedId = @UserId
                            FROM MA_ProjectArticles_References ref
                            INNER JOIN MA_ProjectArticles_Items sourceItem
                                ON ref.SourceProjectItemId = sourceItem.Id
                                AND ref.SourceCompanyId = sourceItem.CompanyId
                            WHERE sourceItem.Id = @ItemId
                                AND sourceItem.CompanyId = @CompanyId
                                AND ref.TargetProjectItemCode = @OldCode;

                            SELECT @@ROWCOUNT AS UpdatedCount;
                        `);

                    const intercompanyUpdatedCount = intercompanyResult.recordset[0]?.UpdatedCount || 0;
                    if (intercompanyUpdatedCount > 0) {
                        console.log(`Aggiornate ${intercompanyUpdatedCount} referenze Intercompany per item ${item.ItemId}`);
                        // Aggiorna il messaggio di successo
                        const lastProcessed = processedItems[processedItems.length - 1];
                        if (lastProcessed && lastProcessed.itemId === item.ItemId) {
                            lastProcessed.message += ` (${intercompanyUpdatedCount} referenze Intercompany aggiornate)`;
                        }
                    }
                } catch (intercompanyError) {
                    console.error('Errore nell\'aggiornamento referenze Intercompany:', intercompanyError);
                    // Non blocchiamo la ricodifica se fallisce l'aggiornamento Intercompany
                }

                // Log history (se la tabella esiste)
                try {
                    const historyRequest = new sql.Request(transaction);
                    await historyRequest
                        .input('CompanyId', sql.Int, companyId)
                        .input('ItemId', sql.BigInt, item.ReplaceWithExisting ? item.UseExistingArticleId : item.ItemId)
                        .input('OldCode', sql.VarChar(64), item.OldCode)
                        .input('NewCode', sql.VarChar(64), item.NewCode)
                        .input('MacroFamilyId', sql.BigInt, item.MacroFamilyId || null)
                        .input('FamilyId', sql.BigInt, item.FamilyId || null)
                        .input('TypeId', sql.BigInt, item.TypeId || null)
                        .input('AliasId', sql.BigInt, item.AliasId || null)
                        .input('Measures', sql.VarChar(2), item.Measures || null)
                        .input('Sequential', sql.Int, item.Sequential || null)
                        .input('UserId', sql.Int, userId)
                        .input('ChangeReason', sql.NVarChar(500), 
                            item.ReplaceWithExisting 
                                ? `Articolo ${item.OldCode} sostituito con articolo esistente ID: ${item.UseExistingArticleId}`
                                : `Ricodifica batch da ${item.OldCode} a ${item.NewCode}`)
                        .query(`
                            IF OBJECT_ID('MA_CodingRules_History', 'U') IS NOT NULL
                            BEGIN
                                INSERT INTO MA_CodingRules_History (
                                    CompanyId, ItemId, OldCode, NewCode, 
                                    MacroFamilyId, FamilyId, TypeId, AliasId,
                                    Measures, Sequential,
                                    UserId, ChangeDate, ChangeReason
                                ) VALUES (
                                    @CompanyId, @ItemId, @OldCode, @NewCode,
                                    @MacroFamilyId, @FamilyId, @TypeId, @AliasId,
                                    @Measures, @Sequential,
                                    @UserId, GETDATE(), @ChangeReason
                                )
                            END
                        `);
                } catch (historyError) {
                    // Tabella history non trovata o errore nel log
                }
                
            } catch (itemError) {
                console.error(`Errore per item ${item.ItemId}:`, itemError);
                errorCount++;
                errors.push({
                    itemId: item.ItemId,
                    itemCode: item.OldCode,
                    message: itemError.message
                });
                processedItems.push({
                    itemId: item.ItemId,
                    oldCode: item.OldCode,
                    newCode: item.NewCode,
                    status: 'error',
                    message: itemError.message
                });
            }
        }
        
        await transaction.commit();
        
        return {
            success: 1,
            successCount: successCount,
            errorCount: errorCount,
            totalItems: items.length,
            errors: errors,
            processedItems: processedItems,
            msg: successCount > 0
                ? `Ricodifica completata: ${successCount} articoli aggiornati, ${errorCount} errori`
                : errorCount > 0
                    ? `Ricodifica fallita: tutti gli ${errorCount} articoli hanno generato errori`
                    : 'Nessun articolo processato'
        };
        
    } catch (err) {
        console.error('Errore globale nella ricodifica alternativa:', err);
        await transaction.rollback();
        throw err;
    }
};

/**
 * Get coding configuration for company
 * @param {number} companyId - Company ID
 * @returns {Promise<Object>} Configuration
 */
const getCodingConfig = async (companyId) => {
    try {
        let pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('CompanyId', sql.Int, companyId)
            .query(`
                SELECT 
                    CodingType,
                    TotalLength,
                    SequentialLength,
                    SequentialPadChar,
                    IsActive,
                    Config
                FROM MA_CodingRules_Config
                WHERE CompanyId = @CompanyId AND IsActive = 1
            `);
            
        if (result.recordset.length === 0) {
            throw new Error('Nessuna configurazione di codifica trovata per questa azienda');
        }
        
        const config = result.recordset[0];
        
        // Parse JSON config if present
        if (config.Config) {
            try {
                config.ConfigData = JSON.parse(config.Config);
            } catch (e) {
                config.ConfigData = {};
            }
        }
        
        return config;
    } catch (err) {
        console.error('Error getting coding config:', err);
        throw err;
    }
};

/**
 * Build complete code from components
 * @param {string} macroFamilyCode - MacroFamily code (1 char)
 * @param {string} familyCode - Family code (3 chars)
 * @param {string} typeCode - Type code (3 chars)
 * @param {string} aliasCode - Alias code (3 chars)
 * @param {string} measures - Measures (2 chars)
 * @param {number} sequential - Sequential number
 * @param {number} sequentialLength - Length for sequential (from config)
 * @param {string} padChar - Padding character (from config)
 * @returns {string} Complete code
 */
const buildCompleteCode = (macroFamilyCode, familyCode, typeCode, aliasCode, measures, sequential, sequentialLength = 3, padChar = '0') => {
    // Validate inputs
    if (!macroFamilyCode || macroFamilyCode.length !== 1) {
        throw new Error('Codice macrofamiglia deve essere 1 carattere');
    }
    if (!familyCode || familyCode.length !== 3) {
        throw new Error('Codice famiglia deve essere 3 caratteri');
    }
    if (!typeCode || typeCode.length !== 3) {
        throw new Error('Codice tipo deve essere 3 caratteri');
    }
    if (!aliasCode || aliasCode.length !== 3) {
        throw new Error('Codice alias deve essere 3 caratteri');
    }
    if (!measures || measures.length !== 2) {
        throw new Error('Misure devono essere 2 caratteri');
    }
    
    // Pad sequential
    const sequentialStr = String(sequential).padStart(sequentialLength, padChar);
    
    // Build code
    return macroFamilyCode + familyCode + typeCode + aliasCode + measures + sequentialStr;
};

/**
 * Get preview of codes for multiple items
 * @param {number} companyId - Company ID
 * @param {Array} items - Array of items with coding components
 * @returns {Promise<Array>} Items with preview codes
 */
const getCodesPreview = async (companyId, items) => {
    try {
        let pool = await sql.connect(config.database);
        
        // Get configuration
        const config = await getCodingConfig(companyId);
        
        // Process each item
        const itemsWithPreview = await Promise.all(items.map(async (item) => {
            try {
                // Skip if missing required components
                if (!item.macroFamilyCode || !item.familyCode || !item.typeCode || !item.aliasCode) {
                    return {
                        ...item,
                        previewCode: '',
                        previewError: 'Componenti mancanti per generare il codice'
                    };
                }
                
                // Get next sequential
                const sequential = await getNextSequential(
                    companyId,
                    item.macroFamilyCode,
                    item.familyCode,
                    item.typeCode,
                    item.aliasCode
                );
                
                // Build code
                const previewCode = buildCompleteCode(
                    item.macroFamilyCode,
                    item.familyCode,
                    item.typeCode,
                    item.aliasCode,
                    item.measures || '00',
                    sequential,
                    config.SequentialLength,
                    config.SequentialPadChar
                );
                
                // Validate code
                const validation = await validateCode(companyId, previewCode);
                
                return {
                    ...item,
                    previewCode: previewCode,
                    sequential: sequential,
                    isValid: validation.isValid,
                    validationMessage: validation.errorMessage
                };
            } catch (err) {
                return {
                    ...item,
                    previewCode: '',
                    previewError: err.message
                };
            }
        }));
        
        return itemsWithPreview;
    } catch (err) {
        console.error('Error getting codes preview:', err);
        throw err;
    }
};

/**
 * Log recoding history
 * @param {number} companyId - Company ID
 * @param {number} userId - User ID
 * @param {Array} items - Items that were recoded
 */
const logRecodingHistory = async (companyId, userId, items) => {
    try {
        let pool = await sql.connect(config.database);
        
        // Prepare bulk insert
        const table = new sql.Table('MA_CodingRules_History');
        table.create = false;
        table.columns.add('CompanyId', sql.Int);
        table.columns.add('ItemId', sql.BigInt);
        table.columns.add('OldCode', sql.VarChar(64));
        table.columns.add('NewCode', sql.VarChar(64));
        table.columns.add('MacroFamilyId', sql.BigInt);
        table.columns.add('FamilyId', sql.BigInt);
        table.columns.add('TypeId', sql.BigInt);
        table.columns.add('AliasId', sql.BigInt);
        table.columns.add('Measures', sql.VarChar(2));
        table.columns.add('Sequential', sql.Int);
        table.columns.add('UserId', sql.Int);
        table.columns.add('ChangeDate', sql.DateTime);
        table.columns.add('ChangeReason', sql.NVarChar(500));
        
        const changeDate = new Date();
        
        items.forEach(item => {
            if (item.newCode && item.oldCode !== item.newCode) {
                table.rows.add(
                    companyId,
                    item.itemId,
                    item.oldCode,
                    item.newCode,
                    item.macroFamilyId || null,
                    item.familyId || null,
                    item.typeId || null,
                    item.aliasId || null,
                    item.measures || null,
                    item.sequential || null,
                    userId,
                    changeDate,
                    'Ricodifica batch'
                );
            }
        });
        
        if (table.rows.length > 0) {
            const request = pool.request();
            await request.bulk(table);
        }
    } catch (err) {
        console.error('Error logging history:', err);
        // Non rilanciamo l'errore per non bloccare l'operazione principale
    }
};

/**
 * Get recoding history
 * @param {number} companyId - Company ID
 * @param {Object} filters - Filters (itemId, dateFrom, dateTo, userId)
 * @returns {Promise<Array>} History records
 */
const getRecodingHistory = async (companyId, filters = {}) => {
    try {
        let pool = await sql.connect(config.database);
        
        let query = `
            SELECT 
                h.Id,
                h.ItemId,
                h.OldCode,
                h.NewCode,
                h.MacroFamilyId,
                h.FamilyId,
                h.TypeId,
                h.AliasId,
                h.Measures,
                h.Sequential,
                h.UserId,
                h.ChangeDate,
                h.ChangeReason,
                i.Description as ItemDescription,
                u.Username as UserName
            FROM MA_CodingRules_History h
            LEFT JOIN MA_ProjectArticles_Items i ON h.ItemId = i.Id AND h.CompanyId = i.CompanyId
            LEFT JOIN AR_Users u ON h.UserId = u.UserId
            WHERE h.CompanyId = @CompanyId
        `;
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId);
        
        // Apply filters
        if (filters.itemId) {
            query += ` AND h.ItemId = @ItemId`;
            request.input('ItemId', sql.BigInt, filters.itemId);
        }
        
        if (filters.dateFrom) {
            query += ` AND h.ChangeDate >= @DateFrom`;
            request.input('DateFrom', sql.DateTime, filters.dateFrom);
        }
        
        if (filters.dateTo) {
            query += ` AND h.ChangeDate <= @DateTo`;
            request.input('DateTo', sql.DateTime, filters.dateTo);
        }
        
        if (filters.userId) {
            query += ` AND h.UserId = @UserId`;
            request.input('UserId', sql.Int, filters.userId);
        }
        
        query += ` ORDER BY h.ChangeDate DESC`;
        
        const result = await request.query(query);
        
        return result.recordset;
    } catch (err) {
        console.error('Error getting recoding history:', err);
        throw err;
    }
};

/**
 * Search for similar articles when recoding
 * This is a wrapper that calls the projectArticlesManagement function
 * @param {number} companyId - Company ID
 * @param {string} rootCode - Root code to search
 * @param {string} description - Description to search
 * @param {number} excludeId - Article ID to exclude
 * @param {object} options - Additional options
 * @returns {Promise<Array>} Array of similar articles
 */
const searchSimilarForRecoding = async (companyId, rootCode, description, excludeId, options = {}) => {
    // Import della funzione dal modulo projectArticlesManagement
    const { searchSimilarArticles } = require('./projectArticlesManagement');
    
    try {
        // Chiama la funzione di ricerca con i parametri appropriati
        const results = await searchSimilarArticles(
            companyId,
            rootCode,
            description,
            excludeId,
            options.limit || 10,
            options.erpOnly || false,
            options.tempOnly || false
        );
        
        // Filtra solo gli articoli che possono essere utilizzati per la ricodifica
        const usableResults = results.filter(article => {
            // Gli articoli ERP possono essere suggeriti ma non modificati
            // Gli articoli temporanei possono essere sia suggeriti che modificati
            return true; // Tutti gli articoli possono essere suggeriti
        });
        
        return usableResults;
    } catch (err) {
        console.error('Error searching similar articles for recoding:', err);
        throw err;
    }
};

/**
 * Create a new category
 */
const createCategory = async (companyId, categoryData) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();
        
        request.input('CompanyId', sql.Int, companyId);
        request.input('Code', sql.VarChar(3), categoryData.code);
        request.input('Description', sql.NVarChar(512), categoryData.description);
        request.input('Color', sql.VarChar(25), categoryData.color || null);
        request.input('NatureCode', sql.VarChar(8), categoryData.natureCode || null);
        request.input('CreateUser', sql.VarChar(64), categoryData.createUser);
        
        const result = await request.query(`
            INSERT INTO MA_CodingRules_Categories 
            (CompanyId, Code, Description, Color, NatureCode, IsActive, CreateUser, CreateDate, EditUser, EditDate)
            OUTPUT INSERTED.*
            VALUES 
            (@CompanyId, @Code, @Description, @Color, @NatureCode, 1, @CreateUser, GETDATE(), @CreateUser, GETDATE())
        `);
        
        return {
            success: 1,
            data: result.recordset[0],
            msg: 'Categoria creata con successo'
        };
    } catch (err) {
        console.error('Error creating category:', err);
        if (err.message.includes('UQ_CodingCategories')) {
            throw new Error('Codice categoria già esistente');
        }
        throw err;
    }
};

/**
 * Create a new macrofamily
 */
const createMacroFamily = async (companyId, macroFamilyData) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();
        
        request.input('CompanyId', sql.Int, companyId);
        request.input('CategoryId', sql.BigInt, macroFamilyData.categoryId);
        request.input('Code', sql.VarChar(3), macroFamilyData.code);
        request.input('Description', sql.NVarChar(512), macroFamilyData.description);
        request.input('IsUniversal', sql.Bit, macroFamilyData.isUniversal || 0);
        request.input('CreateUser', sql.VarChar(64), macroFamilyData.createUser);
        
        const result = await request.query(`
            INSERT INTO MA_CodingRules_MacroFamilies 
            (CompanyId, CategoryId, Code, Description, IsUniversal, IsActive, CreateUser, CreateDate, EditUser, EditDate)
            OUTPUT INSERTED.*
            VALUES 
            (@CompanyId, @CategoryId, @Code, @Description, @IsUniversal, 1, @CreateUser, GETDATE(), @CreateUser, GETDATE())
        `);
        
        return {
            success: 1,
            data: result.recordset[0],
            msg: 'Macrofamiglia creata con successo'
        };
    } catch (err) {
        console.error('Error creating macrofamily:', err);
        if (err.message.includes('UQ_MacroFamilies')) {
            throw new Error('Codice macrofamiglia già esistente per questa categoria');
        }
        throw err;
    }
};

/**
 * Create a new family
 */
const createFamily = async (companyId, familyData) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();
        
        request.input('CompanyId', sql.Int, companyId);
        request.input('MacroFamilyId', sql.BigInt, familyData.macroFamilyId);
        request.input('Code', sql.VarChar(5), familyData.code);
        request.input('Description', sql.NVarChar(512), familyData.description);
        request.input('IsUniversal', sql.Bit, familyData.isUniversal || 0);
        request.input('CreateUser', sql.VarChar(64), familyData.createUser);
        
        const result = await request.query(`
            INSERT INTO MA_CodingRules_Families 
            (CompanyId, MacroFamilyId, Code, Description, IsUniversal, IsActive, CreateUser, CreateDate, EditUser, EditDate)
            OUTPUT INSERTED.*
            VALUES 
            (@CompanyId, @MacroFamilyId, @Code, @Description, @IsUniversal, 1, @CreateUser, GETDATE(), @CreateUser, GETDATE())
        `);
        
        return {
            success: 1,
            data: result.recordset[0],
            msg: 'Famiglia creata con successo'
        };
    } catch (err) {
        console.error('Error creating family:', err);
        if (err.message.includes('UQ_Families')) {
            throw new Error('Codice famiglia già esistente per questa macrofamiglia');
        }
        throw err;
    }
};

/**
 * Create a new type
 */
const createType = async (companyId, typeData) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();
        
        request.input('CompanyId', sql.Int, companyId);
        request.input('FamilyId', sql.BigInt, typeData.familyId);
        request.input('Code', sql.VarChar(5), typeData.code);
        request.input('Description', sql.NVarChar(512), typeData.description);
        request.input('IsUniversal', sql.Bit, typeData.isUniversal || 0);
        request.input('CreateUser', sql.VarChar(64), typeData.createUser);
        
        const result = await request.query(`
            INSERT INTO MA_CodingRules_Types 
            (CompanyId, FamilyId, Code, Description, IsUniversal, IsActive, CreateUser, CreateDate, EditUser, EditDate)
            OUTPUT INSERTED.*
            VALUES 
            (@CompanyId, @FamilyId, @Code, @Description, @IsUniversal, 1, @CreateUser, GETDATE(), @CreateUser, GETDATE())
        `);
        
        return {
            success: 1,
            data: result.recordset[0],
            msg: 'Tipo creato con successo'
        };
    } catch (err) {
        console.error('Error creating type:', err);
        if (err.message.includes('UQ_Types')) {
            throw new Error('Codice tipo già esistente per questa famiglia');
        }
        throw err;
    }
};

/**
 * Create a new alias
 */
const createAlias = async (companyId, aliasData) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();
        
        request.input('CompanyId', sql.Int, companyId);
        request.input('TypeId', sql.BigInt, aliasData.typeId);
        request.input('Code', sql.VarChar(5), aliasData.code);
        request.input('Description', sql.NVarChar(512), aliasData.description);
        request.input('IsUniversal', sql.Bit, aliasData.isUniversal || 0);
        request.input('CreateUser', sql.VarChar(64), aliasData.createUser);
        
        const result = await request.query(`
            INSERT INTO MA_CodingRules_Aliases 
            (CompanyId, TypeId, Code, Description, IsUniversal, IsActive, CreateUser, CreateDate, EditUser, EditDate)
            OUTPUT INSERTED.*
            VALUES 
            (@CompanyId, @TypeId, @Code, @Description, @IsUniversal, 1, @CreateUser, GETDATE(), @CreateUser, GETDATE())
        `);
        
        return {
            success: 1,
            data: result.recordset[0],
            msg: 'Alias creato con successo'
        };
    } catch (err) {
        console.error('Error creating alias:', err);
        if (err.message.includes('UQ_Aliases')) {
            throw new Error('Codice alias già esistente per questo tipo');
        }
        throw err;
    }
};

/**
 * =====================================================
 * FUNZIONI PER LOGICA SEMPLIFICATA
 * =====================================================
 */

/**
 * Get simplified coding configuration for a company
 * @param {number} companyId - Company ID
 * @returns {Promise<Object>} Configuration object
 */
const getSimplifiedConfig = async (companyId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        request.input('CompanyId', sql.Int, companyId);

        const result = await request.execute('MA_CodingRules_GetSimplifiedConfig');

        return result.recordset[0] || {
            CompanyId: companyId,
            IsActive: false,
            CharactersToKeep: 7
        };
    } catch (err) {
        console.error('Error getting simplified config:', err);
        throw err;
    }
};

/**
 * Update simplified coding configuration
 * @param {number} companyId - Company ID
 * @param {Object} configData - Configuration data {isActive, charactersToKeep}
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated configuration
 */
const updateSimplifiedConfig = async (companyId, configData, userId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        request.input('CompanyId', sql.Int, companyId);
        request.input('IsActive', sql.Bit, configData.isActive);
        request.input('CharactersToKeep', sql.Int, configData.charactersToKeep);
        request.input('UserId', sql.Int, userId);

        const result = await request.query(`
            MERGE MA_CodingRules_SimplifiedConfig AS target
            USING (SELECT @CompanyId AS CompanyId) AS source
            ON target.CompanyId = source.CompanyId
            WHEN MATCHED THEN
                UPDATE SET
                    IsActive = @IsActive,
                    CharactersToKeep = @CharactersToKeep,
                    EditDate = GETDATE(),
                    EditUser = @UserId
            WHEN NOT MATCHED THEN
                INSERT (CompanyId, IsActive, CharactersToKeep, CreateUser, CreateDate)
                VALUES (@CompanyId, @IsActive, @CharactersToKeep, @UserId, GETDATE())
            OUTPUT INSERTED.*;
        `);

        return result.recordset[0];
    } catch (err) {
        console.error('Error updating simplified config:', err);
        throw err;
    }
};

/**
 * Get next simplified sequential for a prefix
 * @param {number} companyId - Company ID
 * @param {string} prefix - Code prefix (e.g., "RCANCSP")
 * @returns {Promise<string>} Next sequential (e.g., "000", "001", "A00", etc.)
 */
const getNextSimplifiedSequential = async (companyId, prefix) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        request.input('CompanyId', sql.Int, companyId);
        request.input('Prefix', sql.VarChar(14), prefix);
        request.output('NextSequential', sql.VarChar(10));

        await request.execute('MA_CodingRules_GetNextSimplifiedSequential');

        return request.parameters.NextSequential.value;
    } catch (err) {
        console.error('Error getting next simplified sequential:', err);
        throw err;
    }
};

/**
 * Reconstruct description from code prefix using coding rules tables
 * @param {number} companyId - Company ID
 * @param {string} codePrefix - Code prefix (e.g., "RCANCSP")
 * @param {number} charactersToKeep - Number of characters in prefix
 * @returns {Promise<string|null>} Reconstructed description or null if not found
 */
const reconstructDescriptionFromCode = async (companyId, codePrefix, charactersToKeep) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        request.input('CompanyId', sql.Int, companyId);
        request.input('CodePrefix', sql.VarChar(14), codePrefix);
        request.input('CharactersToKeep', sql.Int, charactersToKeep);
        request.output('ReconstructedDescription', sql.NVarChar(512));

        await request.execute('MA_CodingRules_ReconstructDescriptionFromCode');

        return request.parameters.ReconstructedDescription.value;
    } catch (err) {
        console.error('Error reconstructing description from code:', err);
        // Fallback silenzioso: se c'è errore, restituisci null
        return null;
    }
};

/**
 * Estrae le componenti di un codice articolo (MacroFamily, Family, Type, Alias, ecc.)
 * @param {number} companyId - Company ID
 * @param {string} itemCode - Codice articolo da analizzare
 * @returns {Promise<Object>} Oggetto con le componenti estratte e i relativi ID
 */
const extractCodeComponents = async (companyId, itemCode) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        request.input('CompanyId', sql.Int, companyId);
        request.input('ItemCode', sql.VarChar(64), itemCode);

        const result = await request.execute('MA_CodingRules_ExtractCodeComponents');
        
        if (result.recordset && result.recordset.length > 0) {
            return result.recordset[0];
        }
        
        return {
            CategoryId: null,
            MacroFamilyId: null,
            MacroFamilyCode: null,
            FamilyId: null,
            FamilyCode: null,
            TypeId: null,
            TypeCode: null,
            AliasId: null,
            AliasCode: null,
            Measures: null,
            Sequential: null
        };
    } catch (err) {
        console.error('Error extracting code components:', err);
        throw err;
    }
};

// =====================================================
// DESCRIPTION NORMALIZATION FUNCTIONS
// =====================================================

/**
 * Get technical characteristics for a company
 */
const getTechnicalCharacteristics = async (companyId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();
        request.input('CompanyId', sql.Int, companyId);
        const result = await request.execute('MA_ArticleDescription_GetCharacteristics');
        return result.recordset;
    } catch (err) {
        console.error('Error getting technical characteristics:', err);
        throw err;
    }
};

/**
 * Create a new technical characteristic
 */
const createTechnicalCharacteristic = async (companyId, characteristicData, userId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();
        
        request.input('CompanyId', sql.Int, companyId);
        request.input('CharacteristicCode', sql.VarChar(50), characteristicData.CharacteristicCode);
        request.input('CharacteristicName', sql.NVarChar(100), characteristicData.CharacteristicName);
        request.input('FormatTemplate', sql.NVarChar(50), characteristicData.FormatTemplate);
        request.input('UnitOfMeasure', sql.VarChar(10), characteristicData.UnitOfMeasure || null);
        request.input('DisplayOrder', sql.Int, characteristicData.DisplayOrder || 0);
        request.input('IsActive', sql.Bit, characteristicData.IsActive !== false);
        request.input('CreateUser', sql.VarChar(64), userId || 'SYSTEM');
        
        const result = await request.query(`
            INSERT INTO MA_ArticleTechnicalCharacteristics 
                (CompanyId, CharacteristicCode, CharacteristicName, FormatTemplate, UnitOfMeasure, DisplayOrder, IsActive, CreateUser, CreateDate)
            VALUES 
                (@CompanyId, @CharacteristicCode, @CharacteristicName, @FormatTemplate, @UnitOfMeasure, @DisplayOrder, @IsActive, @CreateUser, GETDATE());
            SELECT SCOPE_IDENTITY() AS Id;
        `);
        
        return { success: 1, id: result.recordset[0].Id };
    } catch (err) {
        console.error('Error creating technical characteristic:', err);
        throw err;
    }
};

/**
 * Update a technical characteristic
 */
const updateTechnicalCharacteristic = async (id, companyId, characteristicData, userId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();
        
        request.input('Id', sql.BigInt, id);
        request.input('CompanyId', sql.Int, companyId);
        request.input('CharacteristicName', sql.NVarChar(100), characteristicData.CharacteristicName);
        request.input('FormatTemplate', sql.NVarChar(50), characteristicData.FormatTemplate);
        request.input('UnitOfMeasure', sql.VarChar(10), characteristicData.UnitOfMeasure || null);
        request.input('DisplayOrder', sql.Int, characteristicData.DisplayOrder || 0);
        request.input('IsActive', sql.Bit, characteristicData.IsActive !== false);
        request.input('EditUser', sql.VarChar(64), userId || 'SYSTEM');
        
        await request.query(`
            UPDATE MA_ArticleTechnicalCharacteristics 
            SET CharacteristicName = @CharacteristicName,
                FormatTemplate = @FormatTemplate,
                UnitOfMeasure = @UnitOfMeasure,
                DisplayOrder = @DisplayOrder,
                IsActive = @IsActive,
                EditUser = @EditUser,
                EditDate = GETDATE()
            WHERE Id = @Id AND CompanyId = @CompanyId;
        `);
        
        return { success: 1 };
    } catch (err) {
        console.error('Error updating technical characteristic:', err);
        throw err;
    }
};

/**
 * Delete a technical characteristic
 */
const deleteTechnicalCharacteristic = async (id, companyId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();
        
        request.input('Id', sql.BigInt, id);
        request.input('CompanyId', sql.Int, companyId);
        
        await request.query(`
            DELETE FROM MA_ArticleTechnicalCharacteristics 
            WHERE Id = @Id AND CompanyId = @CompanyId;
        `);
        
        return { success: 1 };
    } catch (err) {
        console.error('Error deleting technical characteristic:', err);
        throw err;
    }
};

// Funzioni rimosse: getTechnicalCharacteristicsByHierarchy, getCharacteristicHierarchyAssociations, updateCharacteristicHierarchyAssociations
// Le caratteristiche sono ora disponibili per tutte le gerarchie senza associazioni

/**
 * Get description rules for a company and hierarchy
 */
const getDescriptionRules = async (companyId, macroFamilyId = null, familyId = null, typeId = null) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();
        
        request.input('CompanyId', sql.Int, companyId);
        request.input('MacroFamilyId', sql.BigInt, macroFamilyId);
        request.input('FamilyId', sql.BigInt, familyId);
        request.input('TypeId', sql.BigInt, typeId);
        
        const result = await request.execute('MA_ArticleDescription_GetRules');
        return result.recordset;
    } catch (err) {
        console.error('Error getting description rules:', err);
        throw err;
    }
};

/**
 * Create a new description rule
 */
const createDescriptionRule = async (companyId, ruleData, userId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();
        
        request.input('CompanyId', sql.Int, companyId);
        request.input('MacroFamilyId', sql.BigInt, ruleData.MacroFamilyId || null);
        request.input('FamilyId', sql.BigInt, ruleData.FamilyId || null);
        request.input('TypeId', sql.BigInt, ruleData.TypeId || null);
        request.input('CharacteristicCode', sql.VarChar(50), ruleData.CharacteristicCode);
        request.input('AppendOrder', sql.Int, ruleData.AppendOrder);
        request.input('Separator', sql.VarChar(10), ruleData.Separator || ' - ');
        request.input('IsActive', sql.Bit, ruleData.IsActive !== false);
        request.input('CreateUser', sql.VarChar(64), userId || 'SYSTEM');
        
        const result = await request.query(`
            INSERT INTO MA_ArticleDescriptionRules 
                (CompanyId, MacroFamilyId, FamilyId, TypeId, CharacteristicCode, AppendOrder, Separator, IsActive, CreateUser, CreateDate)
            VALUES 
                (@CompanyId, @MacroFamilyId, @FamilyId, @TypeId, @CharacteristicCode, @AppendOrder, @Separator, @IsActive, @CreateUser, GETDATE());
            SELECT SCOPE_IDENTITY() AS Id;
        `);
        
        return { success: 1, id: result.recordset[0].Id };
    } catch (err) {
        console.error('Error creating description rule:', err);
        throw err;
    }
};

/**
 * Update a description rule
 */
const updateDescriptionRule = async (id, companyId, ruleData, userId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();
        
        request.input('Id', sql.BigInt, id);
        request.input('CompanyId', sql.Int, companyId);
        request.input('MacroFamilyId', sql.BigInt, ruleData.MacroFamilyId || null);
        request.input('FamilyId', sql.BigInt, ruleData.FamilyId || null);
        request.input('TypeId', sql.BigInt, ruleData.TypeId || null);
        request.input('CharacteristicCode', sql.VarChar(50), ruleData.CharacteristicCode);
        request.input('AppendOrder', sql.Int, ruleData.AppendOrder);
        request.input('Separator', sql.VarChar(10), ruleData.Separator || ' - ');
        request.input('IsActive', sql.Bit, ruleData.IsActive !== false);
        request.input('EditUser', sql.VarChar(64), userId || 'SYSTEM');
        
        await request.query(`
            UPDATE MA_ArticleDescriptionRules 
            SET MacroFamilyId = @MacroFamilyId,
                FamilyId = @FamilyId,
                TypeId = @TypeId,
                CharacteristicCode = @CharacteristicCode,
                AppendOrder = @AppendOrder,
                Separator = @Separator,
                IsActive = @IsActive,
                EditUser = @EditUser,
                EditDate = GETDATE()
            WHERE Id = @Id AND CompanyId = @CompanyId;
        `);
        
        return { success: 1 };
    } catch (err) {
        console.error('Error updating description rule:', err);
        throw err;
    }
};

/**
 * Delete a description rule
 */
const deleteDescriptionRule = async (id, companyId) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();
        
        request.input('Id', sql.BigInt, id);
        request.input('CompanyId', sql.Int, companyId);
        
        await request.query(`
            DELETE FROM MA_ArticleDescriptionRules 
            WHERE Id = @Id AND CompanyId = @CompanyId;
        `);
        
        return { success: 1 };
    } catch (err) {
        console.error('Error deleting description rule:', err);
        throw err;
    }
};

/**
 * Generate normalized description
 */
const generateNormalizedDescription = async (companyId, baseDescription, technicalData, hierarchyData) => {
    try {
        let pool = await sql.connect(config.database);
        
        // Carica tutte le caratteristiche attive per questa company per creare il mapping dinamico
        const charRequest = pool.request();
        charRequest.input('CompanyId', sql.Int, companyId);
        const charResult = await charRequest.query(`
            SELECT CharacteristicCode 
            FROM MA_ArticleTechnicalCharacteristics 
            WHERE CompanyId = @CompanyId AND IsActive = 1
        `);
        
        console.log('Active characteristics in DB:', charResult.recordset.map(r => r.CharacteristicCode));
        
        // NUOVO APPROCCIO: Usa direttamente CharacteristicCode dal JSON, senza mapping!
        let characteristicMapping = {};
        
        // Verifica se technicalData è già in formato JSON con CharacteristicCode
        // (es. {"DIAMETRO":"14","RAGGIOM":"21"})
        const isAlreadyJSONFormat = technicalData && typeof technicalData === 'object' && 
            !technicalData.hasOwnProperty('Diameter') && 
            !technicalData.hasOwnProperty('Bxh') && 
            !technicalData.hasOwnProperty('Depth') && 
            !technicalData.hasOwnProperty('Length') && 
            !technicalData.hasOwnProperty('MediumRadius') && 
            !technicalData.hasOwnProperty('Thickness');
        
        console.log('Is already JSON format?', isAlreadyJSONFormat);
        console.log('Technical data keys:', Object.keys(technicalData || {}));
        
        if (isAlreadyJSONFormat) {
            // Formato nuovo: usa direttamente CharacteristicCode dal JSON
            // Verifica che i CharacteristicCode esistano nel database
            const activeCodes = charResult.recordset.map(r => r.CharacteristicCode);
            console.log('Active codes in DB:', activeCodes);
            console.log('Technical data codes:', Object.keys(technicalData));
            
            // Mapping per varianti comuni (se il codice esatto non esiste, prova varianti)
            const variantMap = {
                'DIAMETRO': ['DIAMETER'],
                'DIAMETER': ['DIAMETRO'],
                'SPESSORE': ['THICKNESS'],
                'THICKNESS': ['SPESSORE'],
                'PROFONDITA': ['DEPTH'],
                'DEPTH': ['PROFONDITA'],
                'LUNGHEZZA': ['LENGTH'],
                'LENGTH': ['LUNGHEZZA'],
                'RAGGIO': ['RADIUS', 'RAGGIO_MEDIO', 'RAGGIOM'],
                'RAGGIO_MEDIO': ['RADIUS', 'RAGGIO', 'RAGGIOM'],
                'RAGGIOM': ['RADIUS', 'RAGGIO', 'RAGGIO_MEDIO'],
                'RADIUS': ['RAGGIO', 'RAGGIO_MEDIO', 'RAGGIOM'],
                'BXH': ['BxH'],
                'BxH': ['BXH']
            };
            
            Object.keys(technicalData).forEach(code => {
                const value = technicalData[code];
                if (value === undefined || value === null || value === '') {
                    console.log(`Skipped ${code}: empty value`);
                    return;
                }
                
                // Prova prima con il codice esatto
                if (activeCodes.includes(code)) {
                    characteristicMapping[code] = String(value);
                    console.log(`Added to mapping (exact match): ${code} = ${value}`);
                } else {
                    // Prova con varianti
                    const variants = variantMap[code] || [];
                    let found = false;
                    for (const variant of variants) {
                        if (activeCodes.includes(variant)) {
                            characteristicMapping[variant] = String(value);
                            console.log(`Added to mapping (variant ${code} -> ${variant}): ${variant} = ${value}`);
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        console.log(`Skipped ${code}: not found in DB and no matching variant`);
                    }
                }
            });
        } else {
            // Formato vecchio (retrocompatibilità): usa mapping per convertire nomi campo -> CharacteristicCode
            const fieldToCodeMap = {
                'Diameter': ['DIAMETER', 'DIAMETRO'],
                'Bxh': ['BxH', 'BXH'],
                'Depth': ['DEPTH', 'PROFONDITA'],
                'Length': ['LENGTH', 'LUNGHEZZA'],
                'MediumRadius': ['RADIUS', 'RAGGIO', 'RAGGIO_MEDIO', 'RAGGIOM'],
                'Thickness': ['THICKNESS', 'SPESSORE']
            };
            
            // Per ogni caratteristica nel database, cerca il valore corrispondente
            charResult.recordset.forEach(char => {
                const code = char.CharacteristicCode;
                
                // Cerca il valore nel technicalData usando il mapping
                for (const [fieldName, codes] of Object.entries(fieldToCodeMap)) {
                    if (codes.includes(code)) {
                        const value = technicalData?.[fieldName];
                        if (value !== null && value !== undefined && value !== '') {
                            characteristicMapping[code] = String(value);
                            break;
                        }
                    }
                }
            });
        }
        
        // Debug: log del mapping creato
        console.log('Technical data received:', JSON.stringify(technicalData));
        console.log('Is JSON format:', isAlreadyJSONFormat);
        console.log('Characteristic mapping:', characteristicMapping);
        
        // Converti in JSON per passarlo alla stored procedure
        const technicalDataJSON = JSON.stringify(characteristicMapping);
        console.log('JSON sent to SP:', technicalDataJSON);
        console.log('JSON length:', technicalDataJSON.length);
        
        const request = pool.request();
        request.input('CompanyId', sql.Int, companyId);
        request.input('BaseDescription', sql.NVarChar(512), baseDescription || '');
        request.input('MacroFamilyId', sql.BigInt, hierarchyData?.MacroFamilyId || null);
        request.input('FamilyId', sql.BigInt, hierarchyData?.FamilyId || null);
        request.input('TypeId', sql.BigInt, hierarchyData?.TypeId || null);
        request.input('TechnicalDataJSON', sql.NVarChar(sql.MAX), technicalDataJSON || '{}');
        request.output('NormalizedDescription', sql.NVarChar(512));
        
        console.log('Executing SP with params:', {
            CompanyId: companyId,
            BaseDescription: baseDescription,
            MacroFamilyId: hierarchyData?.MacroFamilyId,
            FamilyId: hierarchyData?.FamilyId,
            TypeId: hierarchyData?.TypeId,
            TechnicalDataJSON: technicalDataJSON
        });
        
        await request.execute('MA_ArticleDescription_GenerateNormalized');
        
        // Leggi l'output - verifica che esista
        const outputParam = request.parameters.NormalizedDescription;
        console.log('Output parameter:', {
            exists: !!outputParam,
            value: outputParam?.value,
            type: typeof outputParam?.value,
            isNull: outputParam?.value === null,
            isEmpty: outputParam?.value === '',
            length: outputParam?.value?.length
        });
        
        let normalizedDescription = outputParam?.value;
        
        // Se la stored procedure restituisce NULL o stringa vuota, ma abbiamo caratteristiche,
        // significa che la stored procedure non ha gestito correttamente il caso BaseDescription vuoto
        // In questo caso, costruiamo la descrizione solo con le caratteristiche
        if ((!normalizedDescription || normalizedDescription.trim() === '') && characteristicMapping && Object.keys(characteristicMapping).length > 0) {
            console.log('SP returned empty, but we have characteristics. Building description from characteristics only.');
            
            // Carica le caratteristiche con i loro template per costruire la descrizione manualmente
            const codes = Object.keys(characteristicMapping);
            const codesPlaceholder = codes.map((_, i) => `@Code${i}`).join(', ');
            
            const charDetailsRequest = pool.request();
            charDetailsRequest.input('CompanyId', sql.Int, companyId);
            
            // Aggiungi i parametri per i codici
            codes.forEach((code, i) => {
                charDetailsRequest.input(`Code${i}`, sql.VarChar(50), code);
            });
            
            const charDetails = await charDetailsRequest.query(`
                SELECT CharacteristicCode, DisplayOrder, FormatTemplate
                FROM MA_ArticleTechnicalCharacteristics
                WHERE CompanyId = @CompanyId AND IsActive = 1
                AND CharacteristicCode IN (${codesPlaceholder})
                ORDER BY DisplayOrder
            `);
            
            const parts = [];
            // Se abbiamo una baseDescription, aggiungila prima
            if (baseDescription && baseDescription.trim() !== '') {
                parts.push(baseDescription);
            }
            
            // Aggiungi le caratteristiche formattate
            charDetails.recordset.forEach(char => {
                const value = characteristicMapping[char.CharacteristicCode];
                if (value && char.FormatTemplate) {
                    const formatted = char.FormatTemplate.replace(/{value}/g, value).replace(/{Vvalue}/g, value);
                    parts.push(formatted);
                }
            });
            
            normalizedDescription = parts.join(' - ');
            console.log('Built description from characteristics:', normalizedDescription);
        }
        
        // Fallback alla baseDescription se ancora vuoto
        if (!normalizedDescription || normalizedDescription.trim() === '') {
            normalizedDescription = baseDescription || '';
        }
        
        console.log('SP returned description:', normalizedDescription);
        console.log('Final normalized description length:', normalizedDescription?.length);
        
        return { 
            success: 1, 
            normalizedDescription: normalizedDescription
        };
    } catch (err) {
        console.error('Error generating normalized description:', err);
        throw err;
    }
};

/**
 * Generate simplified code preview
 * @param {number} companyId - Company ID
 * @param {string} originalCode - Original article code
 * @param {number} charactersToKeep - Number of characters to keep from original
 * @returns {Promise<string>} Preview code (e.g., "RCANCSP00000001")
 */
const generateSimplifiedPreview = async (companyId, originalCode, charactersToKeep) => {
    try {
        let pool = await sql.connect(config.database);
        const request = pool.request();

        request.input('CompanyId', sql.Int, companyId);
        request.input('OriginalCode', sql.VarChar(64), originalCode);
        request.input('CharactersToKeep', sql.Int, charactersToKeep);
        request.output('PreviewCode', sql.VarChar(64));

        await request.execute('MA_CodingRules_GenerateSimplifiedPreview');

        return request.parameters.PreviewCode.value;
    } catch (err) {
        console.error('Error generating simplified preview:', err);
        throw err;
    }
};

/**
 * Generate preview for multiple items
 * @param {number} companyId - Company ID
 * @param {Array} items - Array of items with {itemId, originalCode, originalDescription}
 * @param {number} charactersToKeep - Number of characters to keep
 * @returns {Promise<Array>} Array of items with preview codes and descriptions
 */
const generateSimplifiedBatchPreview = async (companyId, items, charactersToKeep) => {
    try {
        const results = [];

        for (const item of items) {
            const previewCode = await generateSimplifiedPreview(
                companyId,
                item.originalCode,
                charactersToKeep
            );

            // Estrai prefisso per ricostruire descrizione
            const codePrefix = item.originalCode.substring(0, charactersToKeep);

            // Prova a ricostruire la descrizione dalle tabelle
            const reconstructedDescription = await reconstructDescriptionFromCode(
                companyId,
                codePrefix,
                charactersToKeep
            );

            // Fallback silenzioso alla descrizione originale se non trovata
            const finalDescription = reconstructedDescription || item.originalDescription;

            results.push({
                itemId: item.itemId,
                originalCode: item.originalCode,
                originalDescription: item.originalDescription,
                previewCode: previewCode,
                previewDescription: finalDescription,
                descriptionReconstructed: reconstructedDescription !== null // Flag per debugging
            });
        }

        return results;
    } catch (err) {
        console.error('Error generating simplified batch preview:', err);
        throw err;
    }
};

/**
 * Apply simplified batch recoding
 * @param {number} companyId - Company ID
 * @param {number} userId - User ID
 * @param {Array} items - Array of items to recode
 * @returns {Promise<Object>} Result with success/error counts
 */
const applySimplifiedBatchRecoding = async (companyId, userId, items) => {
    try {
        let pool = await sql.connect(config.database);

        // Crea TVP (Table Valued Parameter)
        const tvp = new sql.Table();
        tvp.columns.add('ItemId', sql.BigInt);
        tvp.columns.add('OldCode', sql.VarChar(64));
        tvp.columns.add('NewCode', sql.VarChar(64));
        tvp.columns.add('NewDescription', sql.NVarChar(128));
        tvp.columns.add('MacroFamilyId', sql.BigInt);
        tvp.columns.add('FamilyId', sql.BigInt);
        tvp.columns.add('TypeId', sql.BigInt);
        tvp.columns.add('AliasId', sql.BigInt);
        tvp.columns.add('Measures', sql.VarChar(2));
        tvp.columns.add('Sequential', sql.Int);
        tvp.columns.add('UseExistingArticleId', sql.BigInt);
        tvp.columns.add('ReplaceWithExisting', sql.Bit);
        tvp.columns.add('TechnicalCharacteristicsJSON', sql.NVarChar(sql.MAX)); // NUOVO: JSON caratteristiche tecniche

        // Popola TVP
        items.forEach(item => {
            // Prepara TechnicalCharacteristicsJSON: se presente come oggetto, convertilo in JSON string
            let technicalCharacteristicsJSON = null;
            if (item.TechnicalCharacteristicsJSON) {
                if (typeof item.TechnicalCharacteristicsJSON === 'string') {
                    // Già una stringa JSON
                    technicalCharacteristicsJSON = item.TechnicalCharacteristicsJSON;
                } else if (typeof item.TechnicalCharacteristicsJSON === 'object') {
                    // Converti oggetto in JSON string
                    technicalCharacteristicsJSON = JSON.stringify(item.TechnicalCharacteristicsJSON);
                }
            }

            tvp.rows.add(
                item.ItemId,
                item.OldCode,
                item.NewCode,
                item.NewDescription || null,
                item.MacroFamilyId || null,
                item.FamilyId || null,
                item.TypeId || null,
                item.AliasId || null,
                item.Measures || null,
                item.Sequential || null,
                item.UseExistingArticleId || null,
                item.ReplaceWithExisting || 0,
                technicalCharacteristicsJSON // NUOVO: JSON caratteristiche tecniche
            );
        });

        const request = pool.request();
        request.input('CompanyId', sql.Int, companyId);
        request.input('UserId', sql.Int, userId);
        request.input('Items', tvp);
        request.output('SuccessCount', sql.Int);
        request.output('ErrorCount', sql.Int);

        const result = await request.execute('MA_CodingRules_ApplySimplifiedBatch');

        const successCount = result.output.SuccessCount;
        const errorCount = result.output.ErrorCount;
        const errors = result.recordset || [];

        return {
            success: true,
            successCount: successCount,
            errorCount: errorCount,
            errors: errors.map(err => ({
                itemId: err.ItemId,
                oldCode: err.OldCode,
                errorMessage: err.ErrorMessage
            }))
        };
    } catch (err) {
        console.error('Error applying simplified batch recoding:', err);
        throw err;
    }
};

/**
 * Build simplified code manually (without DB call)
 * @param {string} originalCode - Original code
 * @param {number} charactersToKeep - Characters to keep
 * @param {string} sequential - Sequential part (e.g., "000", "A12")
 * @returns {string} Complete simplified code
 */
const buildSimplifiedCode = (originalCode, charactersToKeep, sequential) => {
    const prefix = originalCode.substring(0, charactersToKeep);
    const totalLength = 15;
    const zeroPadding = '0'.repeat(totalLength - charactersToKeep - sequential.length);

    return prefix + zeroPadding + sequential;
};

// Export all functions
module.exports = {
    getCodingHierarchy,
    getNextSequential,
    validateCode,
    applyBatchRecoding,
    getCodingConfig,
    buildCompleteCode,
    getCodesPreview,
    getRecodingHistory,
    searchSimilarForRecoding,
    applyBatchRecodingAlternative,
    logRecodingHistory,
    createCategory,
    createMacroFamily,
    createFamily,
    createType,
    createAlias,
    // Simplified logic functions
    getSimplifiedConfig,
    updateSimplifiedConfig,
    getNextSimplifiedSequential,
    generateSimplifiedPreview,
    generateSimplifiedBatchPreview,
    applySimplifiedBatchRecoding,
    buildSimplifiedCode,
    reconstructDescriptionFromCode,
    extractCodeComponents,
    // Description normalization functions
    getTechnicalCharacteristics,
    createTechnicalCharacteristic,
    updateTechnicalCharacteristic,
    deleteTechnicalCharacteristic,
    getDescriptionRules,
    createDescriptionRule,
    updateDescriptionRule,
    deleteDescriptionRule,
    generateNormalizedDescription
};