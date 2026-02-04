-- ===============================================================================
-- 20260204_07: Ricrea MA_CodingRules_ApplySimplifiedBatch con supporto TechnicalCharacteristicsJSON
-- ===============================================================================
-- DESCRIZIONE:
-- Ricrea la stored procedure MA_CodingRules_ApplySimplifiedBatch con supporto
-- per TechnicalCharacteristicsJSON (opzionale, per coerenza con ApplyBatch)
--
-- NOTA: Esegui questo file DOPO aver eseguito 20260204_00 (creazione TYPE)
-- ===============================================================================

USE [WebAppTEST]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Elimina la stored procedure se esiste
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'MA_CodingRules_ApplySimplifiedBatch')
BEGIN
    DROP PROCEDURE [dbo].[MA_CodingRules_ApplySimplifiedBatch];
    PRINT 'Stored procedure MA_CodingRules_ApplySimplifiedBatch eliminata';
END
GO

CREATE PROCEDURE [dbo].[MA_CodingRules_ApplySimplifiedBatch]
    @CompanyId INT,
    @UserId INT,
    @Items MA_CodingRules_ItemsToRecode READONLY,
    @SuccessCount INT OUTPUT,
    @ErrorCount INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ItemId BIGINT;
    DECLARE @OldCode VARCHAR(64);
    DECLARE @NewCode VARCHAR(64);
    DECLARE @NewDescription NVARCHAR(128);
    DECLARE @TechnicalCharacteristicsJSON NVARCHAR(MAX);  -- NUOVO: JSON caratteristiche tecniche
    DECLARE @MacroFamilyId BIGINT;
    DECLARE @FamilyId BIGINT;
    DECLARE @TypeId BIGINT;
    DECLARE @AliasId BIGINT;
    DECLARE @CategoryId BIGINT;
    DECLARE @UseExistingArticleId BIGINT;
    DECLARE @ReplaceWithExisting BIT;
    DECLARE @ErrorMessage NVARCHAR(500);
    DECLARE @ExistingCode VARCHAR(64);

    -- Tabella temporanea per errori
    CREATE TABLE #Errors (
        ItemId BIGINT,
        OldCode VARCHAR(64),
        ErrorMessage NVARCHAR(500)
    );

    SET @SuccessCount = 0;
    SET @ErrorCount = 0;

    -- Cursor per iterare items
    DECLARE item_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT
            ItemId,
            OldCode,
            NewCode,
            NewDescription,
            TechnicalCharacteristicsJSON,  -- NUOVO: Include JSON nel CURSOR
            MacroFamilyId,
            FamilyId,
            TypeId,
            AliasId,
            UseExistingArticleId,
            ReplaceWithExisting
        FROM @Items;

    OPEN item_cursor;

    FETCH NEXT FROM item_cursor INTO
        @ItemId, @OldCode, @NewCode, @NewDescription,
        @TechnicalCharacteristicsJSON,  -- NUOVO: Legge JSON dal CURSOR
        @MacroFamilyId, @FamilyId, @TypeId, @AliasId,
        @UseExistingArticleId, @ReplaceWithExisting;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        BEGIN TRANSACTION;
        BEGIN TRY
            -- MODALITÀ 1: Sostituisci con articolo esistente
            IF @ReplaceWithExisting = 1 AND @UseExistingArticleId IS NOT NULL
            BEGIN
                -- Aggiorna riferimenti nei componenti BOM
                UPDATE MA_ProjectArticles_BOMComponents
                SET ComponentId = @UseExistingArticleId
                WHERE CompanyId = @CompanyId
                    AND ComponentId = @ItemId;

                -- Aggiorna riferimenti in progetti
                UPDATE MA_ProjectsItems
                SET ItemId = @UseExistingArticleId
                WHERE CompanyId = @CompanyId
                    AND ItemId = @ItemId;

                -- Disabilita articolo vecchio
                UPDATE MA_ProjectArticles_Items
                SET Disabled = 1
                WHERE CompanyId = @CompanyId
                    AND Id = @ItemId;

                -- Log in history
                INSERT INTO MA_CodingRules_History (
                    CompanyId, ItemId, OldCode, NewCode,
                    UseExistingArticleId, UserId, ChangeDate, ChangeReason
                )
                VALUES (
                    @CompanyId, @ItemId, @OldCode, @NewCode,
                    @UseExistingArticleId, @UserId, GETDATE(), 'Simplified Logic - Replace with existing'
                );
            END
            -- MODALITÀ 2: Ricodifica normale
            ELSE
            BEGIN
                -- Verifica unicità codice
                SELECT @ExistingCode = Item
                FROM MA_ProjectArticles_Items
                WHERE CompanyId = @CompanyId
                    AND Item = @NewCode
                    AND Id != @ItemId;

                IF @ExistingCode IS NOT NULL
                BEGIN
                    SET @ErrorMessage = 'Codice già esistente: ' + @NewCode;
                    INSERT INTO #Errors (ItemId, OldCode, ErrorMessage)
                    VALUES (@ItemId, @OldCode, @ErrorMessage);

                    ROLLBACK TRANSACTION;
                    SET @ErrorCount = @ErrorCount + 1;

                    FETCH NEXT FROM item_cursor INTO
                        @ItemId, @OldCode, @NewCode, @NewDescription,
                        @TechnicalCharacteristicsJSON,  -- NUOVO: Include JSON nel FETCH
                        @MacroFamilyId, @FamilyId, @TypeId, @AliasId,
                        @UseExistingArticleId, @ReplaceWithExisting;
                    CONTINUE;
                END

                -- Aggiorna articolo
                UPDATE MA_ProjectArticles_Items
                SET
                    Item = @NewCode,
                    Description = ISNULL(@NewDescription, Description),
                    MacrofamilyId = ISNULL(@MacroFamilyId, MacrofamilyId),
                    FamilyId = ISNULL(@FamilyId, FamilyId),
                    ItemTypeId = ISNULL(@TypeId, ItemTypeId),
                    AliasId = ISNULL(@AliasId, AliasId),
                    TechnicalCharacteristicsJSON = ISNULL(@TechnicalCharacteristicsJSON, TechnicalCharacteristicsJSON),  -- NUOVO: Salva JSON
                    TBModified = GETDATE(),
                    TBModifiedId = @UserId
                WHERE CompanyId = @CompanyId
                    AND Id = @ItemId;

                -- NUOVO: Sincronizza campi hardcoded dal JSON
                IF @TechnicalCharacteristicsJSON IS NOT NULL AND LEN(@TechnicalCharacteristicsJSON) > 2
                BEGIN
                    EXEC MA_SyncTechnicalCharacteristicsFromJSON @ItemId = @ItemId, @CompanyId = @CompanyId;
                END

                -- Aggiorna BOM header se è root
                UPDATE MA_ProjectArticles_BillOfMaterials
                SET BOM = 'BOM_' + @NewCode
                WHERE CompanyId = @CompanyId
                    AND ItemId = @ItemId;

                -- Log in history
                INSERT INTO MA_CodingRules_History (
                    CompanyId, ItemId, OldCode, NewCode,
                    MacroFamilyId, FamilyId, TypeId, AliasId,
                    UserId, ChangeDate, ChangeReason
                )
                VALUES (
                    @CompanyId, @ItemId, @OldCode, @NewCode,
                    @MacroFamilyId, @FamilyId, @TypeId, @AliasId,
                    @UserId, GETDATE(), 'Simplified Logic - Batch recoding'
                );
            END

            COMMIT TRANSACTION;
            SET @SuccessCount = @SuccessCount + 1;

        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            SET @ErrorMessage = ERROR_MESSAGE();
            INSERT INTO #Errors (ItemId, OldCode, ErrorMessage)
            VALUES (@ItemId, @OldCode, @ErrorMessage);

            SET @ErrorCount = @ErrorCount + 1;
        END CATCH

        FETCH NEXT FROM item_cursor INTO
            @ItemId, @OldCode, @NewCode, @NewDescription,
            @TechnicalCharacteristicsJSON,  -- NUOVO: Include JSON nel FETCH finale
            @MacroFamilyId, @FamilyId, @TypeId, @AliasId,
            @UseExistingArticleId, @ReplaceWithExisting;
    END

    CLOSE item_cursor;
    DEALLOCATE item_cursor;

    -- Restituisce errori
    SELECT * FROM #Errors;

    DROP TABLE #Errors;
END
GO

PRINT '========================================'
PRINT 'Stored Procedure MA_CodingRules_ApplySimplifiedBatch ricreata con successo'
PRINT 'Supporta TechnicalCharacteristicsJSON'
PRINT '========================================'
GO
