-- Fix: Gestisci UPDATE_ROUTING quando BOMId = 0
-- PROBLEMA:
-- Quando viene chiamato UPDATE_ROUTING con BOMId = 0 (dopo che ADD_ROUTING ha creato la BOM),
-- la stored procedure non trova la BOM perché cerca con @Id = 0.
--
-- SOLUZIONE:
-- Se @Id = 0 e c'è un @ItemId o @ComponentId, cerca la BOM creata per quell'articolo.

USE [WebAppTEST]
GO

PRINT '========================================'
PRINT 'FIX: UPDATE_ROUTING con BOMId = 0'
PRINT '========================================'
PRINT ''
PRINT 'PROBLEMA:'
PRINT 'Quando viene chiamato UPDATE_ROUTING con BOMId = 0 (dopo ADD_ROUTING),'
PRINT 'la stored procedure non trova la BOM perché cerca con @Id = 0.'
PRINT ''
PRINT 'SOLUZIONE:'
PRINT 'Modificare la sezione UPDATE_ROUTING per cercare la BOM per ItemId/ComponentId'
PRINT 'quando @Id = 0.'
PRINT ''
PRINT '========================================'
PRINT 'CODICE DA INSERIRE:'
PRINT '========================================'
PRINT ''
PRINT 'POSIZIONE:'
PRINT 'Sostituire il blocco ELSE IF @Action = ''UPDATE_ROUTING'' (riga 6338)'
PRINT 'con il codice seguente:'
PRINT ''
GO

DECLARE @FixCode NVARCHAR(MAX) = N'
        ELSE IF @Action = ''UPDATE_ROUTING''
        BEGIN
            DECLARE @ActualBOMIdForUpdate BIGINT = @Id;
            
            -- Se @Id = 0, cerca la BOM per ItemId o ComponentId
            IF @Id IS NULL OR @Id = 0
            BEGIN
                DECLARE @TargetItemIdForUpdate BIGINT = NULL;
                
                -- Determina l''ItemId target
                IF @ItemId IS NOT NULL AND @ItemId > 0
                BEGIN
                    SET @TargetItemIdForUpdate = @ItemId;
                END
                ELSE IF @ComponentId IS NOT NULL AND @ComponentId > 0
                BEGIN
                    SET @TargetItemIdForUpdate = @ComponentId;
                END
                
                -- Se abbiamo un ItemId, cerca la BOM creata
                IF @TargetItemIdForUpdate IS NOT NULL
                BEGIN
                    SELECT TOP 1 @ActualBOMIdForUpdate = Id
                    FROM dbo.MA_ProjectArticles_BillOfMaterials
                    WHERE ItemId = @TargetItemIdForUpdate 
                        AND CompanyId = @CompanyId
                        AND Version = 1
                    ORDER BY TBCreated DESC;
                    
                    IF @ActualBOMIdForUpdate IS NULL
                    BEGIN
                        SET @ErrorCode = 21;
                        SET @ErrorMessage = N''BOM non trovata per ItemId/ComponentId '' + CAST(@TargetItemIdForUpdate AS VARCHAR(20)) + N''.'';
                        THROW 50021, @ErrorMessage, 1;
                    END
                    
                    PRINT ''BOM trovata per UPDATE_ROUTING: '' + CAST(@ActualBOMIdForUpdate AS VARCHAR(20));
                END
                ELSE
                BEGIN
                    SET @ErrorCode = 21;
                    SET @ErrorMessage = N''ItemId o ComponentId richiesto quando BOMId = 0 per UPDATE_ROUTING.'';
                    THROW 50021, @ErrorMessage, 1;
                END
            END
            ELSE
            BEGIN
                -- Verifica che la distinta base esista
                IF NOT EXISTS (SELECT 1 FROM dbo.MA_ProjectArticles_BillOfMaterials WHERE Id = @ActualBOMIdForUpdate AND CompanyId = @CompanyId)
                BEGIN
                    SET @ErrorCode = 21;
                    SET @ErrorMessage = N''Distinta base non trovata.'';
                    THROW 50021, @ErrorMessage, 1;
                END
            END
            
            -- Aggiornamento fase esistente
            UPDATE dbo.MA_ProjectArticles_BOMRouting
            SET 
                Operation = ISNULL(@Operation, Operation),
                Notes = ISNULL(@Notes, Notes),
                WC = ISNULL(@WC, WC),
                ProcessingTime = ISNULL(@ProcessingTime, ProcessingTime),
                SetupTime = ISNULL(@SetupTime, SetupTime),
                NoOfProcessingWorkers = ISNULL(@NoOfProcessingWorkers, NoOfProcessingWorkers),
                NoOfSetupWorkers = ISNULL(@NoOfSetupWorkers, NoOfSetupWorkers),
                SubId = ISNULL(@SubId, SubId),
                Supplier = ISNULL(@Supplier, Supplier),
                Qty = ISNULL(@Qty, Qty),
                TBModified = GETDATE(),
                TBModifiedID = @UserId
            WHERE BOMId = @ActualBOMIdForUpdate AND RtgStep = @RtgStep AND CompanyId = @CompanyId;
            
            IF @@ROWCOUNT = 0
            BEGIN
                SET @ErrorCode = 22;
                SET @ErrorMessage = N''Fase non trovata (BOMId: '' + CAST(@ActualBOMIdForUpdate AS VARCHAR(20)) + N'', RtgStep: '' + CAST(@RtgStep AS VARCHAR(10)) + N'').'';
                THROW 50022, @ErrorMessage, 1;
            END
            
            SET @ReturnValue = @ActualBOMIdForUpdate;
        END
';

PRINT @FixCode
PRINT ''
PRINT '========================================'
PRINT 'NOTA:'
PRINT '========================================'
PRINT 'Questo fix permette a UPDATE_ROUTING di funzionare anche quando BOMId = 0,'
PRINT 'cercando la BOM per ItemId/ComponentId.'
PRINT ''
GO
