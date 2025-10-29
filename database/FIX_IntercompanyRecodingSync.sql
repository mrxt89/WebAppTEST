USE [WebAppTEST]
GO

-- ===============================================================================
-- FIX: Sincronizzazione Referenze Intercompany durante Ricodifica
-- ===============================================================================
-- Quando un articolo viene ricodificato dal pannello BOM, aggiorna anche
-- le referenze Intercompany in MA_ProjectArticles_References
-- ===============================================================================

/****** Stored Procedure: MA_UpdateIntercompanyReferencesAfterRecoding ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[MA_UpdateIntercompanyReferencesAfterRecoding]
    @ItemId BIGINT,                     -- ID dell'articolo ricodificato
    @OldCode VARCHAR(64),               -- Vecchio codice articolo
    @NewCode VARCHAR(64),               -- Nuovo codice articolo
    @CompanyId INT,                     -- Company ID
    @UserId INT,                        -- User che ha fatto la ricodifica
    @UpdatedCount INT OUTPUT            -- Numero di referenze aggiornate
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ErrorMessage NVARCHAR(4000);

    -- Inizializza contatore
    SET @UpdatedCount = 0;

    BEGIN TRY
        -- =====================================================================
        -- AGGIORNA TargetProjectItemCode quando l'item è il TARGET
        -- =====================================================================
        -- Quando l'item ricodificato è il target di una reference Intercompany,
        -- aggiorna il campo TargetProjectItemCode con il nuovo codice

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

        -- Conta le righe aggiornate
        SET @UpdatedCount = @UpdatedCount + @@ROWCOUNT;

        -- =====================================================================
        -- AGGIORNA TargetProjectItemCode quando l'item è la SOURCE
        -- ma il codice è memorizzato nel campo TargetProjectItemCode
        -- =====================================================================
        -- Nota: Anche se l'item è source, TargetProjectItemCode potrebbe
        -- contenere il suo codice se è stato condiviso. Verifichiamo.

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
            AND ref.TargetProjectItemCode = @OldCode;  -- Solo se il campo contiene il vecchio codice

        -- Conta le righe aggiornate
        SET @UpdatedCount = @UpdatedCount + @@ROWCOUNT;

        -- =====================================================================
        -- LOG delle modifiche nella tabella ReferencesLog
        -- =====================================================================
        INSERT INTO MA_ProjectArticles_ReferencesLog (
            ReferenceID,
            Action,
            OldSourceProjectItemId,
            OldTargetProjectItemId,
            SourceProjectItemId,
            TargetProjectItemId,
            UserId,
            ActionDate
        )
        SELECT
            ref.ReferenceID,
            'RECODE',
            ref.SourceProjectItemId,
            ref.TargetProjectItemId,
            ref.SourceProjectItemId,
            ref.TargetProjectItemId,
            @UserId,
            GETDATE()
        FROM MA_ProjectArticles_References ref
        INNER JOIN MA_ProjectArticles_Items item
            ON (ref.TargetProjectItemId = item.Id OR ref.SourceProjectItemId = item.Id)
            AND (ref.TargetCompanyId = item.CompanyId OR ref.SourceCompanyId = item.CompanyId)
        WHERE item.Id = @ItemId
            AND item.CompanyId = @CompanyId;

        IF @UpdatedCount > 0
            PRINT 'Intercompany references updated: ' + CAST(@UpdatedCount AS VARCHAR);

    END TRY
    BEGIN CATCH
        SET @ErrorMessage = ERROR_MESSAGE();
        PRINT 'Error updating Intercompany references: ' + @ErrorMessage;
        -- Non rilanciamo l'errore per non bloccare la ricodifica
        SET @UpdatedCount = 0;
    END CATCH
END
GO

PRINT 'Stored procedure MA_UpdateIntercompanyReferencesAfterRecoding creata con successo!';
GO

-- ===============================================================================
-- MODIFICA della Stored Procedure MA_CodingRules_ApplyBatch
-- Aggiunge la chiamata per aggiornare le referenze Intercompany
-- ===============================================================================

ALTER PROCEDURE [dbo].[MA_CodingRules_ApplyBatch]
    @CompanyId INT,
    @UserId INT,
    @Items MA_CodingRules_ItemsToRecode READONLY,
    @SuccessCount INT OUTPUT,
    @ErrorCount INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Inizializza contatori
    SET @SuccessCount = 0;
    SET @ErrorCount = 0;

    DECLARE @TempResults TABLE (
        ItemId BIGINT,
        Success BIT,
        ErrorMessage NVARCHAR(500)
    );

    DECLARE @ItemId BIGINT;
    DECLARE @OldCode VARCHAR(64);
    DECLARE @NewCode VARCHAR(64);
    DECLARE @NewDescription NVARCHAR(128);
    DECLARE @MacroFamilyId BIGINT;
    DECLARE @FamilyId BIGINT;
    DECLARE @TypeId BIGINT;
    DECLARE @AliasId BIGINT;
    DECLARE @Measures VARCHAR(2);
    DECLARE @Sequential INT;
    DECLARE @UseExistingArticleId BIGINT;
    DECLARE @ReplaceWithExisting BIT;
    DECLARE @IntercompanyUpdatedCount INT; -- NUOVO: contatore per referenze Intercompany

    DECLARE item_cursor CURSOR FOR
    SELECT
        ItemId,
        OldCode,
        NewCode,
        NewDescription,
        MacroFamilyId,
        FamilyId,
        TypeId,
        AliasId,
        Measures,
        Sequential,
        UseExistingArticleId,
        ReplaceWithExisting
    FROM @Items;

    OPEN item_cursor;
    FETCH NEXT FROM item_cursor INTO
        @ItemId, @OldCode, @NewCode, @NewDescription,
        @MacroFamilyId, @FamilyId, @TypeId, @AliasId,
        @Measures, @Sequential, @UseExistingArticleId, @ReplaceWithExisting;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        BEGIN TRY
            BEGIN TRANSACTION;

            -- Debug
            PRINT 'Processing ItemId: ' + CAST(@ItemId AS VARCHAR) +
                  ', ReplaceWithExisting: ' + CAST(ISNULL(@ReplaceWithExisting, 0) AS VARCHAR) +
                  ', UseExistingArticleId: ' + CAST(ISNULL(@UseExistingArticleId, 0) AS VARCHAR);

            -- Se stiamo sostituendo con un articolo esistente
            IF @ReplaceWithExisting = 1 AND @UseExistingArticleId IS NOT NULL
            BEGIN
                PRINT 'Replacing with existing article ID: ' + CAST(@UseExistingArticleId AS VARCHAR);

                -- 1. Aggiorna tutti i componenti in distinta che puntano a questo articolo
                UPDATE MA_ProjectArticles_BOMComponents
                SET ComponentId = @UseExistingArticleId
                WHERE ComponentId = @ItemId
                AND CompanyId = @CompanyId;

                PRINT 'BOMComponents updated: ' + CAST(@@ROWCOUNT AS VARCHAR);

                -- 2. Aggiorna l'associazione progetti-articoli
                UPDATE MA_ProjectsItems
                SET ItemId = @UseExistingArticleId
                WHERE ItemId = @ItemId
                AND CompanyId = @CompanyId;

                PRINT 'ProjectsItems updated: ' + CAST(@@ROWCOUNT AS VARCHAR);

                -- 3. Disabilita l'articolo vecchio (non lo eliminiamo per mantenere lo storico)
                UPDATE MA_ProjectArticles_Items
                SET Disabled = 1,
                    TBModified = GETDATE(),
                    TBModifiedId = @UserId
                WHERE Id = @ItemId
                AND CompanyId = @CompanyId;

                PRINT 'Item disabled: ' + CAST(@@ROWCOUNT AS VARCHAR);

                -- NUOVO: 4. Aggiorna referenze Intercompany
                SET @IntercompanyUpdatedCount = 0;
                EXEC MA_UpdateIntercompanyReferencesAfterRecoding
                    @ItemId = @ItemId,
                    @OldCode = @OldCode,
                    @NewCode = @NewCode,
                    @CompanyId = @CompanyId,
                    @UserId = @UserId,
                    @UpdatedCount = @IntercompanyUpdatedCount OUTPUT;
            END
            ELSE
            BEGIN
                PRINT 'Normal recoding from ' + @OldCode + ' to ' + @NewCode;

                -- Prima verifica se il nuovo codice è già in uso
                IF EXISTS (
                    SELECT 1 FROM MA_ProjectArticles_Items
                    WHERE Item = @NewCode
                    AND CompanyId = @CompanyId
                    AND Id != @ItemId
                    AND Disabled = 0
                )
                BEGIN
                    -- Il codice è già in uso, trova il prossimo sequenziale libero
                    DECLARE @BaseCode VARCHAR(12) = LEFT(@NewCode, 12); -- Primi 12 caratteri (senza sequenziale)
                    DECLARE @NextSeq INT = 1;
                    DECLARE @TestCode VARCHAR(64);

                    WHILE 1 = 1
                    BEGIN
                        SET @TestCode = @BaseCode + RIGHT('000' + CAST(@NextSeq AS VARCHAR), 3);

                        IF NOT EXISTS (
                            SELECT 1 FROM MA_ProjectArticles_Items
                            WHERE Item = @TestCode
                            AND CompanyId = @CompanyId
                            AND Disabled = 0
                        )
                        BEGIN
                            SET @NewCode = @TestCode;
                            BREAK;
                        END

                        SET @NextSeq = @NextSeq + 1;

                        -- Sicurezza: evita loop infiniti
                        IF @NextSeq > 999
                        BEGIN
                            RAISERROR('Impossibile trovare un codice libero', 16, 1);
                        END
                    END
                END

                -- Aggiorna il codice articolo
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
                AND CompanyId = @CompanyId;

                PRINT 'Item updated: ' + CAST(@@ROWCOUNT AS VARCHAR);

                -- Aggiorna anche il codice BOM dove questo articolo è il principale
                UPDATE MA_ProjectArticles_BillOfMaterials
                SET BOM = @NewCode, Description = @NewDescription
                WHERE ItemId = @ItemId
                AND CompanyId = @CompanyId;

                PRINT 'BOM code updated: ' + CAST(@@ROWCOUNT AS VARCHAR);

                -- NUOVO: Aggiorna referenze Intercompany
                SET @IntercompanyUpdatedCount = 0;
                EXEC MA_UpdateIntercompanyReferencesAfterRecoding
                    @ItemId = @ItemId,
                    @OldCode = @OldCode,
                    @NewCode = @NewCode,
                    @CompanyId = @CompanyId,
                    @UserId = @UserId,
                    @UpdatedCount = @IntercompanyUpdatedCount OUTPUT;
            END

            COMMIT TRANSACTION;

            SET @SuccessCount = @SuccessCount + 1;

            INSERT INTO @TempResults (ItemId, Success, ErrorMessage)
            VALUES (@ItemId, 1, NULL);

        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            INSERT INTO @TempResults (ItemId, Success, ErrorMessage)
            VALUES (@ItemId, 0, ERROR_MESSAGE());

            SET @ErrorCount = @ErrorCount + 1;

            PRINT 'Error: ' + ERROR_MESSAGE();
        END CATCH

        FETCH NEXT FROM item_cursor INTO
            @ItemId, @OldCode, @NewCode, @NewDescription,
            @MacroFamilyId, @FamilyId, @TypeId, @AliasId,
            @Measures, @Sequential, @UseExistingArticleId, @ReplaceWithExisting;
    END

    CLOSE item_cursor;
    DEALLOCATE item_cursor;

    -- Log nella history solo i successi
    INSERT INTO MA_CodingRules_History (
        CompanyId, ItemId, OldCode, NewCode,
        MacroFamilyId, FamilyId, TypeId, AliasId, Measures, Sequential,
        UserId, ChangeDate, ChangeReason
    )
    SELECT
        @CompanyId,
        CASE
            WHEN i.ReplaceWithExisting = 1 THEN i.UseExistingArticleId
            ELSE i.ItemId
        END,
        i.OldCode,
        CASE
            WHEN i.ReplaceWithExisting = 1 THEN
                (SELECT Item FROM MA_ProjectArticles_Items WHERE Id = i.UseExistingArticleId AND CompanyId = @CompanyId)
            ELSE i.NewCode
        END,
        i.MacroFamilyId,
        i.FamilyId,
        i.TypeId,
        i.AliasId,
        i.Measures,
        i.Sequential,
        @UserId,
        GETDATE(),
        CASE
            WHEN i.ReplaceWithExisting = 1 THEN 'Articolo ' + i.OldCode + ' sostituito con articolo esistente ID: ' + CAST(i.UseExistingArticleId AS VARCHAR)
            ELSE 'Ricodifica batch da ' + i.OldCode + ' a ' + i.NewCode
        END
        -- NUOVO: Aggiunge info sulle referenze Intercompany se aggiornate
        + CASE
            WHEN ISNULL(@IntercompanyUpdatedCount, 0) > 0
            THEN ' (Aggiornate ' + CAST(@IntercompanyUpdatedCount AS VARCHAR) + ' referenze Intercompany)'
            ELSE ''
        END
    FROM @Items i
    JOIN @TempResults r ON i.ItemId = r.ItemId
    WHERE r.Success = 1;

    PRINT 'Final counts - Success: ' + CAST(@SuccessCount AS VARCHAR) + ', Errors: ' + CAST(@ErrorCount AS VARCHAR);

    -- Ritorna i risultati dettagliati
    SELECT
        i.ItemId,
        i.OldCode,
        CASE
            WHEN i.ReplaceWithExisting = 1 THEN
                (SELECT Item FROM MA_ProjectArticles_Items WHERE Id = i.UseExistingArticleId AND CompanyId = @CompanyId)
            ELSE i.NewCode
        END AS NewCode,
        r.Success,
        r.ErrorMessage
    FROM @Items i
    JOIN @TempResults r ON i.ItemId = r.ItemId
    ORDER BY r.Success DESC, i.ItemId;

END
GO

PRINT 'Stored procedure MA_CodingRules_ApplyBatch aggiornata con sincronizzazione Intercompany!';
PRINT '';
PRINT '============================================================';
PRINT 'RIEPILOGO MODIFICHE:';
PRINT '1. Creata MA_UpdateIntercompanyReferencesAfterRecoding';
PRINT '2. Modificata MA_CodingRules_ApplyBatch per chiamare la nuova SP';
PRINT '   - Dopo sostituzione con articolo esistente (linea ~234)';
PRINT '   - Dopo ricodifica normale (linea ~289)';
PRINT '3. Aggiunto @IntercompanyUpdatedCount nel logging della history';
PRINT '4. Ora la ricodifica aggiorna automaticamente le referenze Intercompany';
PRINT '============================================================';
GO
