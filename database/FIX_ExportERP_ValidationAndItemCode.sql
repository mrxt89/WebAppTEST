USE [WebAppTEST]
GO

-- ===============================================================================
-- FIX: Validazione codici 15 caratteri e uso codice Item per BOM
-- ===============================================================================
-- Modifiche:
-- 1. Aggiunto controllo che tutti i codici siano esattamente 15 caratteri
-- 2. Modificato per usare il codice Item invece del codice BOM
-- 3. Verifica che il codice Item non esista già come BOM nell'ERP
-- ===============================================================================

/****** Object:  StoredProcedure [dbo].[MA_ExportItemToERP]    Script Date: 29/10/2025 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ===============================================================================
-- Stored Procedure: MA_ExportItemToERP
-- Esporta un articolo da WebApp al gestionale
-- MODIFICATO: Aggiunta validazione lunghezza codice = 15 caratteri
-- ===============================================================================
ALTER PROCEDURE [dbo].[MA_ExportItemToERP]
    @CompanyId INT,
    @ItemId BIGINT,
    @UserId INT,
    @Success BIT OUTPUT,
    @Message NVARCHAR(MAX) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @ErrorMessage NVARCHAR(4000)
    DECLARE @DatabaseName NVARCHAR(50)
    DECLARE @SQL NVARCHAR(MAX)
    DECLARE @ItemCode VARCHAR(64)
    DECLARE @ItemExists BIT = 0
    DECLARE @Parameters NVARCHAR(MAX)

    -- Variabili per i dati dell'articolo
    DECLARE @Description VARCHAR(128)
    DECLARE @Nature INT
    DECLARE @BaseUoM VARCHAR(8)
    DECLARE @Notes VARCHAR(MAX)
    DECLARE @DescriptionExtension VARCHAR(512)
    DECLARE @offset_acquisto VARCHAR(16)
    DECLARE @offset_autoconsumo VARCHAR(16)
    DECLARE @offset_vendita VARCHAR(16)

    -- Inizializza output
    SET @Success = 0
    SET @Message = ''

    BEGIN TRY
        BEGIN TRANSACTION

        -- Recupera il nome del database dalla CompanyId
        SELECT @DatabaseName = dbName
        FROM AR_Companies
        WHERE CompanyId = @CompanyId

        IF @DatabaseName IS NULL
        BEGIN
            SET @Message = 'Database non trovato per CompanyId: ' + CAST(@CompanyId AS VARCHAR(10))
            RAISERROR(@Message, 16, 1)
        END

        -- Recupera i dati dell'articolo da esportare
        SELECT
            @ItemCode = Item,
            @Description = Description,
            @Nature = ISNULL(Nature, 22413312), -- Default Semilavorato
            @BaseUoM = ISNULL(BaseUoM, 'PZ'),
            @Notes = CAST(Notes AS VARCHAR(MAX)),
            @DescriptionExtension = DescriptionExtension,
            @offset_acquisto = ISNULL(offset_acquisto, ''),
            @offset_autoconsumo = ISNULL(offset_autoconsumo, ''),
            @offset_vendita = ISNULL(offset_vendita, '')
        FROM MA_ProjectArticles_Items
        WHERE Id = @ItemId AND CompanyId = @CompanyId

        IF @ItemCode IS NULL
        BEGIN
            SET @Message = 'Articolo non trovato. ItemId: ' + CAST(@ItemId AS VARCHAR(20))
            RAISERROR(@Message, 16, 1)
        END

        -- NUOVO CONTROLLO: Verifica che il codice sia esattamente 15 caratteri
        IF LEN(@ItemCode) != 15
        BEGIN
            SET @Message = 'Il codice articolo deve essere esattamente di 15 caratteri. Codice: ' + @ItemCode + ' (lunghezza: ' + CAST(LEN(@ItemCode) AS VARCHAR(10)) + ')'
            RAISERROR(@Message, 16, 1)
        END

        -- Prepara i parametri per il log
        SET @Parameters = (
            SELECT
                @CompanyId AS CompanyId,
                @ItemId AS ItemId,
                @UserId AS UserId,
                @ItemCode AS ItemCode
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        )

        -- Verifica se l'articolo esiste già nel gestionale
        SET @SQL = N'
        SELECT @ItemExists = CASE WHEN EXISTS(
            SELECT 1 FROM [' + @DatabaseName + '].[dbo].[MA_Items]
            WHERE Item = @ItemCode
        ) THEN 1 ELSE 0 END'

        EXEC sp_executesql @SQL,
            N'@ItemCode VARCHAR(64), @ItemExists BIT OUTPUT',
            @ItemCode, @ItemExists OUTPUT

        IF @ItemExists = 1
        BEGIN
            SET @Success = 1
            SET @Message = 'Articolo già esistente nel gestionale: ' + @ItemCode

            -- Log operazione
            INSERT INTO MA_ExportLog (CompanyId, UserId, OperationType, ObjectType, ObjectCode, Success, ErrorMessage, Parameters)
            VALUES (@CompanyId, @UserId, 'EXPORT_ITEM', 'Item', @ItemCode, @Success, @Message, @Parameters)

            COMMIT TRANSACTION
            RETURN
        END

        -- Inserimento in MA_Items del gestionale
        SET @SQL = N'
        INSERT INTO [' + @DatabaseName + '].[dbo].[MA_Items] (
            Item, Description, BaseUoM, Nature,
            DescriptionExtension, Notes,
            UnitCost, UnitNetWeight, UnitGrossWeight,
            Disabled, InProduction, CreationDate,
            TBCreated, TBModified, TBCreatedID, TBModifiedID,
            offset_acquisto, offset_autoconsumo, offset_vendita
        )
        VALUES (
            @ItemCode, @Description, @BaseUoM, @Nature,
            @DescriptionExtension, LEFT(@Notes, 1024),
            0, 0, 0,
            0, 1, GETDATE(),
            GETDATE(), GETDATE(), @UserId, @UserId,
            @offset_acquisto, @offset_autoconsumo, @offset_vendita
        )'

        EXEC sp_executesql @SQL,
            N'@ItemCode VARCHAR(64), @Description VARCHAR(128), @BaseUoM VARCHAR(8), @Nature INT,
              @DescriptionExtension VARCHAR(512), @Notes VARCHAR(MAX), @UserId INT,
              @offset_acquisto VARCHAR(16), @offset_autoconsumo VARCHAR(16), @offset_vendita VARCHAR(16)',
            @ItemCode, @Description, @BaseUoM, @Nature,
            @DescriptionExtension, @Notes, @UserId,
            @offset_acquisto, @offset_autoconsumo, @offset_vendita

        -- Aggiorna stato sincronizzazione in WebApp
        UPDATE MA_ProjectArticles_Items
        SET stato_erp = 1,
            data_sync_erp = GETDATE()
        WHERE Id = @ItemId AND CompanyId = @CompanyId

        SET @Success = 1
        SET @Message = 'Articolo esportato con successo: ' + @ItemCode

        -- Log operazione
        INSERT INTO MA_ExportLog (CompanyId, UserId, OperationType, ObjectType, ObjectCode, Success, ErrorMessage, Parameters)
        VALUES (@CompanyId, @UserId, 'EXPORT_ITEM', 'Item', @ItemCode, @Success, @Message, @Parameters)

        COMMIT TRANSACTION

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION

        SET @Success = 0
        SET @ErrorMessage = ERROR_MESSAGE()
        SET @Message = 'Errore durante l''esportazione: ' + @ErrorMessage

        -- Log errore
        INSERT INTO MA_ExportLog (CompanyId, UserId, OperationType, ObjectType, ObjectCode, Success, ErrorMessage, Parameters)
        VALUES (@CompanyId, @UserId, 'EXPORT_ITEM', 'Item', ISNULL(@ItemCode, ''), @Success, @ErrorMessage, @Parameters)

        RAISERROR(@ErrorMessage, 16, 1)
    END CATCH
END
GO

/****** Object:  StoredProcedure [dbo].[MA_ExportBOMToERP]    Script Date: 29/10/2025 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ===============================================================================
-- Stored Procedure: MA_ExportBOMToERP
-- Esporta una distinta base da WebApp al gestionale
-- MODIFICHE:
-- 1. Usa il codice Item invece del codice BOM
-- 2. Verifica che tutti i codici componenti siano di 15 caratteri
-- 3. Verifica che il codice Item non esista già come BOM nell'ERP
-- ===============================================================================
ALTER PROCEDURE [dbo].[MA_ExportBOMToERP]
    @CompanyId INT,
    @BOMId BIGINT,
    @Version INT,
    @UserId INT,
    @CheckRecursive BIT = 1,
    @Success BIT OUTPUT,
    @Message NVARCHAR(MAX) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @ErrorMessage NVARCHAR(4000)
    DECLARE @DatabaseName NVARCHAR(50)
    DECLARE @SQL NVARCHAR(MAX)
    DECLARE @BOMCode VARCHAR(50)
    DECLARE @BOMExists BIT = 0
    DECLARE @Parameters NVARCHAR(MAX)
    DECLARE @ItemId BIGINT
    DECLARE @ItemCode VARCHAR(64)  -- NUOVO: codice dell'item collegato

    -- Tabella temporanea per componenti da processare
    CREATE TABLE #ComponentsToProcess (
        ComponentId BIGINT,
        ComponentCode VARCHAR(64),
        Level INT,
        Processed BIT DEFAULT 0
    )

    -- Inizializza output
    SET @Success = 0
    SET @Message = ''

    BEGIN TRY
        BEGIN TRANSACTION

        -- Recupera il nome del database dalla CompanyId
        SELECT @DatabaseName = dbName
        FROM AR_Companies
        WHERE CompanyId = @CompanyId

        IF @DatabaseName IS NULL
        BEGIN
            SET @Message = 'Database non trovato per CompanyId: ' + CAST(@CompanyId AS VARCHAR(10))
            RAISERROR(@Message, 16, 1)
        END

        -- Recupera i dati della distinta base E il codice Item collegato
        DECLARE @Description NVARCHAR(255)
        DECLARE @UoM VARCHAR(8)
        DECLARE @Notes NVARCHAR(MAX)

        SELECT
            @BOMCode = BOM,  -- Lo teniamo per referenza ma non lo usiamo per l'export
            @Description = Description,
            @ItemId = ItemId,
            @UoM = ISNULL(UoM, 'PZ'),
            @Notes = Notes
        FROM MA_ProjectArticles_BillOfMaterials
        WHERE Id = @BOMId AND CompanyId = @CompanyId AND Version = @Version

        IF @BOMCode IS NULL
        BEGIN
            SET @Message = 'Distinta base non trovata. BOMId: ' + CAST(@BOMId AS VARCHAR(20)) + ', Version: ' + CAST(@Version AS VARCHAR(10))
            RAISERROR(@Message, 16, 1)
        END

        -- NUOVO: Recupera il codice dell'Item collegato
        SELECT @ItemCode = Item
        FROM MA_ProjectArticles_Items
        WHERE Id = @ItemId AND CompanyId = @CompanyId

        IF @ItemCode IS NULL
        BEGIN
            SET @Message = 'Articolo collegato alla distinta non trovato. ItemId: ' + CAST(@ItemId AS VARCHAR(20))
            RAISERROR(@Message, 16, 1)
        END

        -- NUOVO CONTROLLO: Verifica che il codice Item sia esattamente 15 caratteri
        IF LEN(@ItemCode) != 15
        BEGIN
            SET @Message = 'Il codice articolo della distinta deve essere esattamente di 15 caratteri. Codice: ' + @ItemCode + ' (lunghezza: ' + CAST(LEN(@ItemCode) AS VARCHAR(10)) + ')'
            RAISERROR(@Message, 16, 1)
        END

        -- CONTROLLO CRITICO: Verifica che non esista già una versione esportata per questo ItemId
        IF EXISTS (
            SELECT 1 FROM MA_ProjectArticles_BillOfMaterials
            WHERE ItemId = @ItemId
            AND CompanyId = @CompanyId
            AND stato_erp = 1
            AND Id != @BOMId
        )
        BEGIN
            SET @Message = 'Esiste già una versione esportata per questo articolo (ItemId: ' + CAST(@ItemId AS VARCHAR(20)) + '). ' +
                           'Per esportare una nuova versione, creare prima un nuovo codice articolo.'
            RAISERROR(@Message, 16, 1)
        END

        -- Prepara i parametri per il log
        SET @Parameters = (
            SELECT
                @CompanyId AS CompanyId,
                @BOMId AS BOMId,
                @Version AS Version,
                @UserId AS UserId,
                @ItemCode AS ItemCode,
                @BOMCode AS BOMCodeOriginal,
                @CheckRecursive AS CheckRecursive
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        )

        -- MODIFICATO: Verifica se la distinta esiste già nel gestionale usando il codice Item
        SET @SQL = N'
        SELECT @BOMExists = CASE WHEN EXISTS(
            SELECT 1 FROM [' + @DatabaseName + '].[dbo].[MA_BillOfMaterials]
            WHERE BOM = @ItemCode
        ) THEN 1 ELSE 0 END'

        EXEC sp_executesql @SQL,
            N'@ItemCode VARCHAR(50), @BOMExists BIT OUTPUT',
            @ItemCode, @BOMExists OUTPUT

        IF @BOMExists = 1
        BEGIN
            SET @Success = 1
            SET @Message = 'Distinta base già esistente nel gestionale con codice: ' + @ItemCode

            -- Log operazione
            INSERT INTO MA_ExportLog (CompanyId, UserId, OperationType, ObjectType, ObjectCode, Success, ErrorMessage, Parameters)
            VALUES (@CompanyId, @UserId, 'EXPORT_BOM', 'BOM', @ItemCode, @Success, @Message, @Parameters)

            COMMIT TRANSACTION
            RETURN
        END

        -- Prima di esportare la distinta, verifica che l'articolo padre esista
        DECLARE @ItemSuccess BIT
        DECLARE @ItemMessage NVARCHAR(MAX)

        EXEC MA_ExportItemToERP
            @CompanyId = @CompanyId,
            @ItemId = @ItemId,
            @UserId = @UserId,
            @Success = @ItemSuccess OUTPUT,
            @Message = @ItemMessage OUTPUT

        -- Raccogli tutti i componenti da processare
        IF @CheckRecursive = 1
        BEGIN
            -- Ricorsivamente trova tutti i componenti
            WITH BOMHierarchy AS (
                -- Componenti di primo livello
                SELECT
                    c.ComponentId,
                    i.Item AS ComponentCode,
                    1 AS Level
                FROM MA_ProjectArticles_BOMComponents c
                INNER JOIN MA_ProjectArticles_Items i ON c.ComponentId = i.Id AND i.CompanyId = @CompanyId
                WHERE c.BOMId = @BOMId
                    AND c.CompanyId = @CompanyId

                UNION ALL

                -- Componenti ricorsivi
                SELECT
                    c.ComponentId,
                    i.Item AS ComponentCode,
                    h.Level + 1
                FROM BOMHierarchy h
                INNER JOIN MA_ProjectArticles_Items pai ON h.ComponentCode = pai.Item AND pai.CompanyId = @CompanyId
                INNER JOIN MA_ProjectArticles_BillOfMaterials bom ON pai.Id = bom.ItemId AND bom.CompanyId = @CompanyId AND bom.Version = @Version
                INNER JOIN MA_ProjectArticles_BOMComponents c ON bom.Id = c.BOMId AND c.CompanyId = @CompanyId
                INNER JOIN MA_ProjectArticles_Items i ON c.ComponentId = i.Id AND i.CompanyId = @CompanyId
            )
            INSERT INTO #ComponentsToProcess (ComponentId, ComponentCode, Level)
            SELECT DISTINCT ComponentId, ComponentCode, MIN(Level)
            FROM BOMHierarchy
            GROUP BY ComponentId, ComponentCode
        END
        ELSE
        BEGIN
            -- Solo componenti di primo livello
            INSERT INTO #ComponentsToProcess (ComponentId, ComponentCode, Level)
            SELECT
                c.ComponentId,
                i.Item AS ComponentCode,
                1 AS Level
            FROM MA_ProjectArticles_BOMComponents c
            INNER JOIN MA_ProjectArticles_Items i ON c.ComponentId = i.Id AND i.CompanyId = @CompanyId
            WHERE c.BOMId = @BOMId
                AND c.CompanyId = @CompanyId
        END

        -- NUOVO CONTROLLO: Verifica che tutti i componenti abbiano codici di 15 caratteri
        DECLARE @InvalidComponents NVARCHAR(MAX)
        SELECT @InvalidComponents = STRING_AGG(ComponentCode + ' (' + CAST(LEN(ComponentCode) AS VARCHAR(10)) + ' caratteri)', ', ')
        FROM #ComponentsToProcess
        WHERE LEN(ComponentCode) != 15

        IF @InvalidComponents IS NOT NULL
        BEGIN
            SET @Message = 'I seguenti componenti non hanno codici di 15 caratteri: ' + @InvalidComponents
            RAISERROR(@Message, 16, 1)
        END

        -- Esporta tutti i componenti prima della distinta
        DECLARE @ComponentId BIGINT
        DECLARE @ComponentCode VARCHAR(64)

        DECLARE component_cursor CURSOR FOR
        SELECT ComponentId, ComponentCode
        FROM #ComponentsToProcess
        ORDER BY Level DESC, ComponentCode

        OPEN component_cursor
        FETCH NEXT FROM component_cursor INTO @ComponentId, @ComponentCode

        WHILE @@FETCH_STATUS = 0
        BEGIN
            EXEC MA_ExportItemToERP
                @CompanyId = @CompanyId,
                @ItemId = @ComponentId,
                @UserId = @UserId,
                @Success = @ItemSuccess OUTPUT,
                @Message = @ItemMessage OUTPUT

            FETCH NEXT FROM component_cursor INTO @ComponentId, @ComponentCode
        END

        CLOSE component_cursor
        DEALLOCATE component_cursor

        -- MODIFICATO: Inserimento in MA_BillOfMaterials del gestionale usando ItemCode
        SET @SQL = N'
        INSERT INTO [' + @DatabaseName + '].[dbo].[MA_BillOfMaterials] (
            BOM, Description, UoM, InProduction,
            Notes, Disabled, CreationDate,
            TBCreated, TBModified, TBCreatedID, TBModifiedID
        )
        VALUES (
            @ItemCode, @Description, @UoM, 1,
            LEFT(@Notes, 64), 0, GETDATE(),
            GETDATE(), GETDATE(), @UserId, @UserId
        )'

        EXEC sp_executesql @SQL,
            N'@ItemCode VARCHAR(50), @Description VARCHAR(128), @UoM VARCHAR(8), @Notes NVARCHAR(MAX), @UserId INT',
            @ItemCode, @Description, @UoM, @Notes, @UserId

        -- Crea tabella temporanea per i componenti
        CREATE TABLE #BOMComponents (
            Line INT,
            Component VARCHAR(64),
            ComponentType INT,
            Description VARCHAR(128),
            Quantity DECIMAL(18,5),
            UoM VARCHAR(10),
            Notes NVARCHAR(MAX)
        )

        -- Carica i componenti nella tabella temporanea
        INSERT INTO #BOMComponents
        SELECT
            ROW_NUMBER() OVER (ORDER BY c.Line) AS Line,
            i.Item,
            ISNULL(c.ComponentType, 7798784),
            i.Description,
            c.Quantity,
            ISNULL(c.UoM, i.BaseUoM),
            c.Notes
        FROM MA_ProjectArticles_BOMComponents c
        INNER JOIN MA_ProjectArticles_Items i ON c.ComponentId = i.Id AND i.CompanyId = @CompanyId
        WHERE c.BOMId = @BOMId
            AND c.CompanyId = @CompanyId
        ORDER BY c.Line

        -- MODIFICATO: Inserimento componenti usando ItemCode per BOM
        SET @SQL = N'
        INSERT INTO [' + @DatabaseName + '].[dbo].[MA_BillOfMaterialsComp] (
            BOM, Line, Component, ComponentType, Description,
            Qty, UoM, Notes, NotPostable,
            ValidityStartingDate, ValidityEndingDate,
            TBCreated, TBModified, TBCreatedID, TBModifiedID
        )
        SELECT
            @ItemCode,
            Line,
            Component,
            ComponentType,
            Description,
            Quantity,
            UoM,
            LEFT(ISNULL(Notes, ''''), 64),
            0,
            ''17991231'',
            ''17991231'',
            GETDATE(), GETDATE(), @UserId, @UserId
        FROM #BOMComponents
        ORDER BY Line'

        EXEC sp_executesql @SQL,
            N'@ItemCode VARCHAR(50), @UserId INT',
            @ItemCode, @UserId

        -- Se ci sono cicli di lavorazione, esportali
        IF EXISTS (SELECT 1 FROM MA_ProjectArticles_BOMRouting WHERE BOMId = @BOMId AND CompanyId = @CompanyId)
        BEGIN
            -- Crea tabella temporanea per i routing
            CREATE TABLE #BOMRouting (
                RtgStep SMALLINT,
                Operation VARCHAR(21),
                Notes VARCHAR(1024),
                WC VARCHAR(8),
                ProcessingTime INT,
                SetupTime INT,
                Supplier VARCHAR(12),
                SubId INT,
                NoOfProcessingWorkers SMALLINT,
                NoOfSetupWorkers SMALLINT
            )

            -- Carica i routing nella tabella temporanea
            INSERT INTO #BOMRouting
            SELECT
                r.RtgStep,
                ISNULL(r.Operation, ''),
                ISNULL(r.Notes, ''),
                ISNULL(r.WC, ''),
                ISNULL(r.ProcessingTime, 0),
                ISNULL(r.SetupTime, 0),
                ISNULL(r.Supplier, ''),
                ISNULL(r.SubId, 0),
                ISNULL(r.NoOfProcessingWorkers, 0),
                ISNULL(r.NoOfSetupWorkers, 0)
            FROM MA_ProjectArticles_BOMRouting r
            WHERE r.BOMId = @BOMId AND r.CompanyId = @CompanyId
            ORDER BY r.RtgStep

            SET @SQL = N'
            INSERT INTO [' + @DatabaseName + '].[dbo].[MA_BillOfMaterialsRouting] (
                BOM, RtgStep, Alternate, AltRtgStep,
                Operation, Notes, WC, ProcessingTime,
                SetupTime, Supplier, SubId,
                NoOfProcessingWorkers, NoOfSetupWorkers,
                TBCreated, TBModified, TBCreatedID, TBModifiedID
            )
            SELECT
                @ItemCode,
                RtgStep,
                '''',
                0,
                Operation,
                LEFT(Notes, 1024),
                WC,
                ProcessingTime,
                SetupTime,
                Supplier,
                SubId,
                NoOfProcessingWorkers,
                NoOfSetupWorkers,
                GETDATE(), GETDATE(), @UserId, @UserId
            FROM #BOMRouting
            ORDER BY RtgStep'

            EXEC sp_executesql @SQL,
                N'@ItemCode VARCHAR(50), @UserId INT',
                @ItemCode, @UserId

            -- Cleanup tabella temporanea routing
            DROP TABLE #BOMRouting
        END

        -- Cleanup tabella temporanea componenti
        DROP TABLE #BOMComponents

        -- Aggiorna stato sincronizzazione in WebApp
        UPDATE MA_ProjectArticles_BillOfMaterials
        SET stato_erp = 1,
            data_sync_erp = GETDATE()
        WHERE Id = @BOMId AND CompanyId = @CompanyId AND Version = @Version

        SET @Success = 1
        SET @Message = 'Distinta base esportata con successo con codice: ' + @ItemCode + ' (BOM originale: ' + @BOMCode + ')'

        -- Log operazione
        INSERT INTO MA_ExportLog (CompanyId, UserId, OperationType, ObjectType, ObjectCode, Success, ErrorMessage, Parameters)
        VALUES (@CompanyId, @UserId, 'EXPORT_BOM', 'BOM', @ItemCode, @Success, @Message, @Parameters)

        -- Cleanup
        DROP TABLE #ComponentsToProcess

        COMMIT TRANSACTION

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION

        -- Cleanup in caso di errore
        IF OBJECT_ID('tempdb..#ComponentsToProcess') IS NOT NULL
            DROP TABLE #ComponentsToProcess
        IF OBJECT_ID('tempdb..#BOMComponents') IS NOT NULL
            DROP TABLE #BOMComponents
        IF OBJECT_ID('tempdb..#BOMRouting') IS NOT NULL
            DROP TABLE #BOMRouting

        SET @Success = 0
        SET @ErrorMessage = ERROR_MESSAGE()
        SET @Message = 'Errore durante l''esportazione: ' + @ErrorMessage

        -- Log errore
        INSERT INTO MA_ExportLog (CompanyId, UserId, OperationType, ObjectType, ObjectCode, Success, ErrorMessage, Parameters)
        VALUES (@CompanyId, @UserId, 'EXPORT_BOM', 'BOM', ISNULL(@ItemCode, ISNULL(@BOMCode, '')), @Success, @ErrorMessage, @Parameters)

        RAISERROR(@ErrorMessage, 16, 1)
    END CATCH
END
GO

PRINT 'Stored procedures aggiornate con successo!'
PRINT '- MA_ExportItemToERP: Aggiunta validazione codice 15 caratteri'
PRINT '- MA_ExportBOMToERP: Usa codice Item + validazione 15 caratteri per tutti i componenti'
GO
