-- Fix: Crea automaticamente la distinta base quando si aggiunge un ciclo a un componente nuovo
-- PROBLEMA:
-- Quando si aggiunge un ciclo a un componente nuovo che non ha ancora una distinta (BOMId = 0),
-- la stored procedure non crea automaticamente la distinta e quindi non inserisce il ciclo.
--
-- SOLUZIONE:
-- Se @Id = 0 e c'è un @ItemId o @ComponentId, verificare che l'articolo non sia di acquisto,
-- creare automaticamente la distinta se non esiste, poi inserire il ciclo ed eseguire la costificazione.

USE [WebAppTEST]
GO

PRINT '========================================'
PRINT 'FIX: Crea automaticamente BOM per routing'
PRINT '========================================'
PRINT ''
PRINT 'PROBLEMA:'
PRINT 'Quando si aggiunge un ciclo a un componente nuovo (BOMId = 0), la stored procedure'
PRINT 'non crea automaticamente la distinta e quindi non inserisce il ciclo.'
PRINT ''
PRINT 'SOLUZIONE:'
PRINT 'Modificare la sezione ADD_ROUTING per:'
PRINT '1. Se @Id = 0, verificare se c''è un @ItemId o @ComponentId'
PRINT '2. Verificare che l''articolo non sia di acquisto (Nature != 22413314)'
PRINT '3. Creare automaticamente la distinta se non esiste'
PRINT '4. Inserire il ciclo'
PRINT '5. Eseguire la costificazione'
PRINT ''
PRINT '========================================'
PRINT 'CODICE DA INSERIRE:'
PRINT '========================================'
PRINT ''
PRINT 'POSIZIONE:'
PRINT 'Sostituire il blocco ELSE IF @Action = ''ADD_ROUTING'' (riga 6307)'
PRINT 'con il codice seguente:'
PRINT ''
GO

DECLARE @FixCode NVARCHAR(MAX) = N'
        ELSE IF @Action = ''ADD_ROUTING''
        BEGIN
            DECLARE @ActualBOMId BIGINT = @Id;
            DECLARE @TargetItemId BIGINT = NULL;
            DECLARE @TargetItemNature INT = NULL;
            DECLARE @TargetItemCode VARCHAR(64) = NULL;
            DECLARE @TargetItemDescription NVARCHAR(255) = NULL;
            DECLARE @BOMCreated BIT = 0;
            
            -- Se @Id = 0, dobbiamo creare la distinta automaticamente
            IF @Id IS NULL OR @Id = 0
            BEGIN
                -- Determina l''ItemId target
                IF @ItemId IS NOT NULL AND @ItemId > 0
                BEGIN
                    SET @TargetItemId = @ItemId;
                END
                ELSE IF @ComponentId IS NOT NULL AND @ComponentId > 0
                BEGIN
                    SET @TargetItemId = @ComponentId;
                END
                
                -- Se abbiamo un ItemId, verifica che l''articolo esista e non sia di acquisto
                IF @TargetItemId IS NOT NULL
                BEGIN
                    SELECT 
                        @TargetItemNature = Nature,
                        @TargetItemCode = Item,
                        @TargetItemDescription = Description
                    FROM dbo.MA_ProjectArticles_Items
                    WHERE Id = @TargetItemId AND CompanyId = @CompanyId AND Disabled = 0;
                    
                    -- Verifica che l''articolo esista
                    IF @TargetItemCode IS NULL
                    BEGIN
                        SET @ErrorCode = 19;
                        SET @ErrorMessage = N''Articolo non trovato (ItemId: '' + CAST(@TargetItemId AS VARCHAR(20)) + N'').'';
                        THROW 50019, @ErrorMessage, 1;
                    END
                    
                    -- Verifica che non sia di acquisto (Nature != 22413314)
                    IF @TargetItemNature = 22413314
                    BEGIN
                        SET @ErrorCode = 20;
                        SET @ErrorMessage = N''Impossibile creare distinta per articolo di acquisto ('' + @TargetItemCode + N'').'';
                        THROW 50020, @ErrorMessage, 1;
                    END
                    
                    -- Verifica se esiste già una distinta per questo articolo
                    SELECT TOP 1 @ActualBOMId = Id
                    FROM dbo.MA_ProjectArticles_BillOfMaterials
                    WHERE ItemId = @TargetItemId 
                        AND CompanyId = @CompanyId
                        AND Version = 1  -- Prendi la versione 1
                    ORDER BY Version DESC;
                    
                    -- Se non esiste, creala
                    IF @ActualBOMId IS NULL
                    BEGIN
                        -- Genera il codice BOM
                        DECLARE @NewBOMCode VARCHAR(50) = @TargetItemCode + ''-1-BOM'';
                        
                        -- Inserisci la nuova distinta
                        INSERT INTO dbo.MA_ProjectArticles_BillOfMaterials (
                            CompanyId, ItemId, BOM, Description, Version, UoM, Status, ProductionLot,
                            TBCreated, TBModified, TBCreatedID, TBModifiedID
                        ) VALUES (
                            @CompanyId, @TargetItemId, @NewBOMCode, 
                            ISNULL(@Description, N''BOM_'' + @TargetItemCode), 
                            1, ISNULL(@UoM, ''NR''), ISNULL(@BOMStatus, ''BOZZA''), 
                            ISNULL(@ProductionLot, 1),
                            GETDATE(), GETDATE(), @UserId, @UserId
                        );
                        
                        SET @ActualBOMId = SCOPE_IDENTITY();
                        SET @BOMCreated = 1;
                        
                        PRINT ''Distinta base creata automaticamente: '' + CAST(@ActualBOMId AS VARCHAR(20)) + '' ('' + @NewBOMCode + '')'';
                    END
                END
                ELSE
                BEGIN
                    SET @ErrorCode = 21;
                    SET @ErrorMessage = N''ItemId o ComponentId richiesto quando BOMId = 0.'';
                    THROW 50021, @ErrorMessage, 1;
                END
            END
            ELSE
            BEGIN
                -- Verifica che la distinta base esista
                IF NOT EXISTS (SELECT 1 FROM dbo.MA_ProjectArticles_BillOfMaterials WHERE Id = @ActualBOMId AND CompanyId = @CompanyId)
                BEGIN
                    SET @ErrorCode = 19;
                    SET @ErrorMessage = N''Distinta base non trovata.'';
                    THROW 50019, @ErrorMessage, 1;
                END
            END
            
            -- Verifica che la fase non esista già
            IF EXISTS (SELECT 1 FROM dbo.MA_ProjectArticles_BOMRouting WHERE BOMId = @ActualBOMId AND RtgStep = @RtgStep AND CompanyId = @CompanyId)
            BEGIN
                SET @ErrorCode = 20;
                SET @ErrorMessage = N''Fase già esistente.'';
                THROW 50020, @ErrorMessage, 1;
            END
            
            -- Inserimento nuova fase
            INSERT INTO dbo.MA_ProjectArticles_BOMRouting (
                CompanyId, RtgStep, BOMId, Operation, Notes, WC, ProcessingTime,
                SetupTime, NoOfProcessingWorkers, NoOfSetupWorkers, SubId, Supplier,
                Qty, TBCreated, TBModified, TBCreatedID, TBModifiedID, CheckOperation
            ) VALUES (
                @CompanyId, @RtgStep, @ActualBOMId, @Operation, @Notes, @WC, @ProcessingTime,
                @SetupTime, @NoOfProcessingWorkers, @NoOfSetupWorkers, @SubId, @Supplier,
                @Qty, GETDATE(), GETDATE(), @UserId, @UserId, 0
            );
            
            -- Se la BOM è stata creata automaticamente, esegui la costificazione
            IF @BOMCreated = 1 AND @ActualBOMId IS NOT NULL
            BEGIN
                -- Chiama la stored procedure di costificazione
                DECLARE @CostingErrorCode INT = 0;
                DECLARE @CostingErrorMessage NVARCHAR(4000) = N'''';
                
                BEGIN TRY
                    EXEC dbo.MA_ProjectArticles_CalculateBOMCosting
                        @CompanyId = @CompanyId,
                        @BOMId = @ActualBOMId,
                        @UserId = @UserId,
                        @ErrorCode = @CostingErrorCode OUTPUT,
                        @ErrorMessage = @CostingErrorMessage OUTPUT;
                    
                    IF @CostingErrorCode <> 0
                    BEGIN
                        PRINT ''Avviso: Errore durante la costificazione automatica: '' + @CostingErrorMessage;
                    END
                    ELSE
                    BEGIN
                        PRINT ''Costificazione eseguita automaticamente per BOM '' + CAST(@ActualBOMId AS VARCHAR(20));
                    END
                END TRY
                BEGIN CATCH
                    PRINT ''Avviso: Impossibile eseguire costificazione automatica: '' + ERROR_MESSAGE();
                END CATCH
            END
            
            SET @ReturnValue = @ActualBOMId;
        END
';

PRINT @FixCode
PRINT ''
PRINT '========================================'
PRINT 'MODIFICHE NECESSARIE:'
PRINT '========================================'
PRINT ''
PRINT '1. MODIFICARE LA VALIDAZIONE INIZIALE (riga 4969):'
PRINT '   Sostituire:'
PRINT '   IF @Action IN (''UPDATE'', ''ADD_COMPONENT'', ''UPDATE_COMPONENT'', ''DELETE_COMPONENT'', ''ADD_ROUTING'', ''UPDATE_ROUTING'', ''DELETE_ROUTING'')'
PRINT '       AND (@Id IS NULL OR @Id <= 0)'
PRINT ''
PRINT '   Con:'
PRINT '   IF @Action IN (''UPDATE'', ''ADD_COMPONENT'', ''UPDATE_COMPONENT'', ''DELETE_COMPONENT'', ''ADD_ROUTING'', ''UPDATE_ROUTING'', ''DELETE_ROUTING'')'
PRINT '       AND (@Id IS NULL OR @Id <= 0)'
PRINT '       AND NOT (@Action = ''ADD_ROUTING'' AND (@ItemId IS NOT NULL OR @ComponentId IS NOT NULL))'
PRINT ''
PRINT '2. SOSTITUIRE IL BLOCCO ADD_ROUTING (riga 6307) con il codice sopra.'
PRINT ''
PRINT '3. MODIFICARE IL FRONTEND/BACKEND:'
PRINT '   Quando si chiama ADD_ROUTING con BOMId = 0, passare anche ItemId o ComponentId'
PRINT '   nel payload bomData.'
PRINT ''
GO

-- Codice per modificare la validazione iniziale
DECLARE @ValidationFixCode NVARCHAR(MAX) = N'
    -- Validazione per UPDATE, ADD_COMPONENT, UPDATE_COMPONENT, DELETE_COMPONENT, ADD_ROUTING, UPDATE_ROUTING, DELETE_ROUTING
    IF @Action IN (''UPDATE'', ''ADD_COMPONENT'', ''UPDATE_COMPONENT'', ''DELETE_COMPONENT'', ''ADD_ROUTING'', ''UPDATE_ROUTING'', ''DELETE_ROUTING'') 
       AND (@Id IS NULL OR @Id <= 0)
       AND NOT (@Action = ''ADD_ROUTING'' AND (@ItemId IS NOT NULL OR @ComponentId IS NOT NULL))
    BEGIN
        SET @ErrorCode = 4;
        SET @ErrorMessage = N''Id della distinta non valido.'';
        GOTO ErrorHandler;
    END
';

PRINT '========================================'
PRINT 'CODICE PER MODIFICARE LA VALIDAZIONE:'
PRINT '========================================'
PRINT @ValidationFixCode
PRINT ''
GO
