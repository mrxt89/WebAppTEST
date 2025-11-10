-- =====================================================
-- MIGRAZIONE: Logica Semplificata Ricodifica Articoli
-- Data: 2025-11-10
-- Descrizione: Aggiunge supporto per logica di ricodifica semplificata
--              mantenendo la logica gerarchica esistente
-- =====================================================

-- =====================================================
-- 1. TABELLA CONFIGURAZIONE LOGICA SEMPLIFICATA
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MA_CodingRules_SimplifiedConfig')
BEGIN
    CREATE TABLE MA_CodingRules_SimplifiedConfig (
        Id BIGINT IDENTITY(1,1) PRIMARY KEY,
        CompanyId INT NOT NULL,
        IsActive BIT NOT NULL DEFAULT 0, -- Se TRUE usa logica semplificata, se FALSE usa logica gerarchica
        CharactersToKeep INT NOT NULL DEFAULT 7, -- Numero caratteri da mantenere dal codice originale
        CreateDate DATETIME NOT NULL DEFAULT GETDATE(),
        EditDate DATETIME NULL,
        CreateUser INT NULL,
        EditUser INT NULL,

        CONSTRAINT UQ_SimplifiedConfig_CompanyId UNIQUE (CompanyId),
        CONSTRAINT FK_SimplifiedConfig_Company FOREIGN KEY (CompanyId)
            REFERENCES AR_Companies(CompanyId) ON DELETE CASCADE,
        CONSTRAINT CK_SimplifiedConfig_CharactersToKeep
            CHECK (CharactersToKeep >= 1 AND CharactersToKeep <= 14)
    );

    PRINT '✓ Tabella MA_CodingRules_SimplifiedConfig creata con successo';
END
ELSE
BEGIN
    PRINT '⚠ Tabella MA_CodingRules_SimplifiedConfig esiste già';
END
GO

-- =====================================================
-- 2. TABELLA SEQUENZIALI LOGICA SEMPLIFICATA
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MA_CodingRules_SimplifiedSequentials')
BEGIN
    CREATE TABLE MA_CodingRules_SimplifiedSequentials (
        Id BIGINT IDENTITY(1,1) PRIMARY KEY,
        CompanyId INT NOT NULL,
        Prefix VARCHAR(14) NOT NULL, -- Prefisso (es. "RCANCSP" con zeri fino a 14 caratteri max)
        LastSequential VARCHAR(10) NOT NULL DEFAULT '000', -- Ultimo sequenziale usato (numerico o alfanumerico)
        LastUsedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CreateDate DATETIME NOT NULL DEFAULT GETDATE(),

        CONSTRAINT UQ_SimplifiedSequentials_CompanyPrefix
            UNIQUE (CompanyId, Prefix),
        CONSTRAINT FK_SimplifiedSequentials_Company
            FOREIGN KEY (CompanyId) REFERENCES AR_Companies(CompanyId) ON DELETE CASCADE
    );

    CREATE INDEX IX_SimplifiedSequentials_CompanyId
        ON MA_CodingRules_SimplifiedSequentials(CompanyId);

    CREATE INDEX IX_SimplifiedSequentials_Prefix
        ON MA_CodingRules_SimplifiedSequentials(Prefix);

    PRINT '✓ Tabella MA_CodingRules_SimplifiedSequentials creata con successo';
END
ELSE
BEGIN
    PRINT '⚠ Tabella MA_CodingRules_SimplifiedSequentials esiste già';
END
GO

-- =====================================================
-- 3. STORED PROCEDURE: Ottieni Configurazione Semplificata
-- =====================================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'MA_CodingRules_GetSimplifiedConfig')
    DROP PROCEDURE MA_CodingRules_GetSimplifiedConfig;
GO

CREATE PROCEDURE MA_CodingRules_GetSimplifiedConfig
    @CompanyId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Restituisce configurazione logica semplificata per azienda
    SELECT
        Id,
        CompanyId,
        IsActive,
        CharactersToKeep,
        CreateDate,
        EditDate,
        CreateUser,
        EditUser
    FROM MA_CodingRules_SimplifiedConfig
    WHERE CompanyId = @CompanyId;

    -- Se non esiste, restituisce config di default (disattivata)
    IF @@ROWCOUNT = 0
    BEGIN
        SELECT
            NULL AS Id,
            @CompanyId AS CompanyId,
            0 AS IsActive,
            7 AS CharactersToKeep,
            NULL AS CreateDate,
            NULL AS EditDate,
            NULL AS CreateUser,
            NULL AS EditUser;
    END
END
GO

PRINT '✓ Stored Procedure MA_CodingRules_GetSimplifiedConfig creata';
GO

-- =====================================================
-- 4. STORED PROCEDURE: Calcola Prossimo Sequenziale Semplificato
-- =====================================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'MA_CodingRules_GetNextSimplifiedSequential')
    DROP PROCEDURE MA_CodingRules_GetNextSimplifiedSequential;
GO

CREATE PROCEDURE MA_CodingRules_GetNextSimplifiedSequential
    @CompanyId INT,
    @Prefix VARCHAR(14),
    @NextSequential VARCHAR(10) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CurrentSequential VARCHAR(10);
    DECLARE @NumericPart INT;
    DECLARE @AlphaPart CHAR(1);
    DECLARE @NewSequential VARCHAR(10);

    BEGIN TRANSACTION;
    BEGIN TRY
        -- Ottieni sequenziale corrente con lock
        SELECT @CurrentSequential = LastSequential
        FROM MA_CodingRules_SimplifiedSequentials WITH (UPDLOCK, ROWLOCK)
        WHERE CompanyId = @CompanyId AND Prefix = @Prefix;

        -- Se non esiste, inizializza a 000
        IF @CurrentSequential IS NULL
        BEGIN
            SET @NewSequential = '000';

            INSERT INTO MA_CodingRules_SimplifiedSequentials
                (CompanyId, Prefix, LastSequential, LastUsedDate)
            VALUES
                (@CompanyId, @Prefix, @NewSequential, GETDATE());
        END
        ELSE
        BEGIN
            -- Logica incremento sequenziale
            -- Formati supportati:
            -- 000-999 (numerico puro)
            -- A00-A99, B00-B99... Z99 (lettera + due cifre)
            -- 0000-9999... (overflow numerico)

            -- Controlla se è formato numerico puro (000-999)
            IF @CurrentSequential NOT LIKE '%[A-Z]%' AND LEN(@CurrentSequential) = 3
            BEGIN
                SET @NumericPart = CAST(@CurrentSequential AS INT);

                IF @NumericPart < 999
                BEGIN
                    -- Incrementa numerico
                    SET @NewSequential = RIGHT('000' + CAST(@NumericPart + 1 AS VARCHAR), 3);
                END
                ELSE
                BEGIN
                    -- Passa a formato alfabetico A00
                    SET @NewSequential = 'A00';
                END
            END
            -- Formato alfabetico (A00-Z99)
            ELSE IF @CurrentSequential LIKE '[A-Z][0-9][0-9]'
            BEGIN
                SET @AlphaPart = LEFT(@CurrentSequential, 1);
                SET @NumericPart = CAST(RIGHT(@CurrentSequential, 2) AS INT);

                IF @NumericPart < 99
                BEGIN
                    -- Incrementa parte numerica
                    SET @NewSequential = @AlphaPart + RIGHT('00' + CAST(@NumericPart + 1 AS VARCHAR), 2);
                END
                ELSE IF @AlphaPart < 'Z'
                BEGIN
                    -- Passa alla lettera successiva
                    SET @NewSequential = CHAR(ASCII(@AlphaPart) + 1) + '00';
                END
                ELSE
                BEGIN
                    -- Esauriti alfabetici, passa a 4 cifre
                    SET @NewSequential = '0000';
                END
            END
            -- Formato numerico lungo (0000+)
            ELSE
            BEGIN
                SET @NumericPart = CAST(@CurrentSequential AS INT);
                SET @NewSequential = RIGHT('000000000' + CAST(@NumericPart + 1 AS VARCHAR), LEN(@CurrentSequential));

                -- Se overflow, aggiungi una cifra
                IF LEN(@NewSequential) > LEN(@CurrentSequential)
                BEGIN
                    SET @NewSequential = CAST(@NumericPart + 1 AS VARCHAR);
                END
            END

            -- Aggiorna record
            UPDATE MA_CodingRules_SimplifiedSequentials
            SET LastSequential = @NewSequential,
                LastUsedDate = GETDATE()
            WHERE CompanyId = @CompanyId AND Prefix = @Prefix;
        END

        SET @NextSequential = @NewSequential;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

PRINT '✓ Stored Procedure MA_CodingRules_GetNextSimplifiedSequential creata';
GO

-- =====================================================
-- 5. STORED PROCEDURE: Applica Ricodifica Semplificata Batch
-- =====================================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'MA_CodingRules_ApplySimplifiedBatch')
    DROP PROCEDURE MA_CodingRules_ApplySimplifiedBatch;
GO

CREATE PROCEDURE MA_CodingRules_ApplySimplifiedBatch
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
                    AliasId = ISNULL(@AliasId, AliasId)
                WHERE CompanyId = @CompanyId
                    AND Id = @ItemId;

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

PRINT '✓ Stored Procedure MA_CodingRules_ApplySimplifiedBatch creata';
GO

-- =====================================================
-- 6. STORED PROCEDURE: Genera Preview Codici Semplificati
-- =====================================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'MA_CodingRules_GenerateSimplifiedPreview')
    DROP PROCEDURE MA_CodingRules_GenerateSimplifiedPreview;
GO

CREATE PROCEDURE MA_CodingRules_GenerateSimplifiedPreview
    @CompanyId INT,
    @OriginalCode VARCHAR(64),
    @CharactersToKeep INT,
    @PreviewCode VARCHAR(64) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Prefix VARCHAR(14);
    DECLARE @ZeroPadding VARCHAR(14);
    DECLARE @NextSequential VARCHAR(10);
    DECLARE @TotalLength INT = 15;

    -- Estrai prefisso (primi N caratteri)
    SET @Prefix = LEFT(@OriginalCode, @CharactersToKeep);

    -- Calcola quanti zeri servono per arrivare a lunghezza totale - spazio per sequenziale
    DECLARE @ZeroLength INT = @TotalLength - @CharactersToKeep;

    -- Ottieni prossimo sequenziale per questo prefisso
    EXEC MA_CodingRules_GetNextSimplifiedSequential
        @CompanyId = @CompanyId,
        @Prefix = @Prefix,
        @NextSequential = @NextSequential OUTPUT;

    -- Calcola padding zeri
    SET @ZeroPadding = REPLICATE('0', @ZeroLength - LEN(@NextSequential));

    -- Costruisci codice finale
    SET @PreviewCode = @Prefix + @ZeroPadding + @NextSequential;
END
GO

PRINT '✓ Stored Procedure MA_CodingRules_GenerateSimplifiedPreview creata';
GO

-- =====================================================
-- 7. INSERIMENTO CONFIGURAZIONE DI DEFAULT
-- =====================================================
-- Inserisce config di default per tutte le aziende esistenti (disattivata)
INSERT INTO MA_CodingRules_SimplifiedConfig (CompanyId, IsActive, CharactersToKeep)
SELECT
    CompanyId,
    0 AS IsActive, -- Disattivata di default
    7 AS CharactersToKeep
FROM AR_Companies
WHERE CompanyId NOT IN (
    SELECT CompanyId FROM MA_CodingRules_SimplifiedConfig
);

PRINT '✓ Configurazione di default inserita per tutte le aziende';
GO


-- ATTIVAZIONE NUOVA LOGICA
UPDATE MA_CodingRules_SimplifiedConfig
SET
    IsActive = 1,           -- Attiva logica semplificata
    CharactersToKeep = 7    -- Numero caratteri da mantenere (1-14)
WHERE CompanyId = 1;