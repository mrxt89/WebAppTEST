-- =============================================
-- 02 - Create SP MA_CreateTemporaryIntercompanyItem
-- Crea un codice articolo temporaneo per Intercompany quando non esiste
-- Author: Claude Code
-- Date: 2025-10-25
-- =============================================

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Drop della stored procedure se esiste già
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MA_CreateTemporaryIntercompanyItem]') AND type in (N'P', N'PC'))
DROP PROCEDURE [dbo].[MA_CreateTemporaryIntercompanyItem]
GO

CREATE PROCEDURE [dbo].[MA_CreateTemporaryIntercompanyItem]
    @SourceItemId BIGINT,                          -- ID dell'articolo sorgente
    @SourceCompanyId INT,                          -- ID azienda sorgente
    @TargetCompanyId INT,                          -- ID azienda target
    @UserId INT,                                   -- ID utente che crea l'articolo
    @NewItemId BIGINT OUTPUT,                      -- ID del nuovo articolo creato
    @NewItemCode VARCHAR(64) OUTPUT,               -- Codice del nuovo articolo creato
    @ErrorCode INT OUTPUT,                         -- Codice di errore (0 = successo)
    @ErrorMessage NVARCHAR(4000) OUTPUT            -- Messaggio di errore
AS
BEGIN
    SET NOCOUNT ON;

    -- Inizializzazione variabili di output
    SET @ErrorCode = 0;
    SET @ErrorMessage = N'';
    SET @NewItemId = NULL;
    SET @NewItemCode = NULL;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Validazione parametri
        IF @SourceItemId IS NULL OR @SourceItemId <= 0
        BEGIN
            SET @ErrorCode = 1;
            SET @ErrorMessage = N'SourceItemId non valido.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        IF @SourceCompanyId IS NULL OR @SourceCompanyId <= 0
        BEGIN
            SET @ErrorCode = 2;
            SET @ErrorMessage = N'SourceCompanyId non valido.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        IF @TargetCompanyId IS NULL OR @TargetCompanyId <= 0
        BEGIN
            SET @ErrorCode = 3;
            SET @ErrorMessage = N'TargetCompanyId non valido.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- Recupera informazioni sull'articolo sorgente
        DECLARE @SourceItemCode VARCHAR(64),
                @SourceItemDescription VARCHAR(128),
                @SourceItemDescriptionExt VARCHAR(512),
                @SourceItemDiameter FLOAT,
                @SourceItemBxh VARCHAR(11),
                @SourceItemDepth FLOAT,
                @SourceItemLength FLOAT,
                @SourceItemMediumRadius FLOAT,
                @SourceItemBaseUoM VARCHAR(3);

        SELECT
            @SourceItemCode = Item,
            @SourceItemDescription = Description,
            @SourceItemDescriptionExt = DescriptionExtension,
            @SourceItemDiameter = Diameter,
            @SourceItemBxh = Bxh,
            @SourceItemDepth = Depth,
            @SourceItemLength = Length,
            @SourceItemMediumRadius = MediumRadius,
            @SourceItemBaseUoM = BaseUoM
        FROM MA_ProjectArticles_Items
        WHERE Id = @SourceItemId AND CompanyId = @SourceCompanyId;

        IF @SourceItemCode IS NULL
        BEGIN
            SET @ErrorCode = 4;
            SET @ErrorMessage = N'Articolo sorgente non trovato.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- Recupera informazioni sulla company sorgente
        DECLARE @SourceCompanyCode VARCHAR(50),
                @SourceCompanyName VARCHAR(200);

        SELECT
            @SourceCompanyCode = CompanyCode,
            @SourceCompanyName = Description
        FROM AR_Companies
        WHERE CompanyId = @SourceCompanyId;

        -- Genera codice temporaneo univoco
        DECLARE @TempCode VARCHAR(64);
        DECLARE @DateSuffix VARCHAR(8) = CONVERT(VARCHAR(8), GETDATE(), 112); -- YYYYMMDD
        DECLARE @Counter INT = 1;
        DECLARE @MaxAttempts INT = 100;

        -- Prova a generare un codice univoco
        WHILE @Counter <= @MaxAttempts
        BEGIN
            SET @TempCode = 'IC_TEMP_' + ISNULL(@SourceCompanyCode, CAST(@SourceCompanyId AS VARCHAR(10))) + '_' +
                           @SourceItemCode + '_' + @DateSuffix +
                           CASE WHEN @Counter > 1 THEN '_' + CAST(@Counter AS VARCHAR(3)) ELSE '' END;

            -- Verifica se il codice esiste già
            IF NOT EXISTS (SELECT 1 FROM MA_ProjectArticles_Items WHERE Item = @TempCode AND CompanyId = @TargetCompanyId)
            BEGIN
                BREAK;
            END

            SET @Counter = @Counter + 1;
        END

        IF @Counter > @MaxAttempts
        BEGIN
            SET @ErrorCode = 5;
            SET @ErrorMessage = N'Impossibile generare un codice temporaneo univoco dopo ' + CAST(@MaxAttempts AS NVARCHAR(10)) + ' tentativi.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        SET @NewItemCode = @TempCode;

        -- Genera descrizione per l'articolo temporaneo
        DECLARE @TempDescription VARCHAR(128);
        DECLARE @TempDescriptionExt VARCHAR(512);

        SET @TempDescription = 'INTERCOMPANY - ' + ISNULL(@SourceCompanyName, 'IC') + ' - ' + @SourceItemCode;
        SET @TempDescriptionExt = 'Articolo temporaneo per Intercompany. Sorgente: ' +
                                  ISNULL(@SourceCompanyName, '') + ' (' + @SourceItemCode + ') - ' +
                                  ISNULL(@SourceItemDescription, '') + '. ' +
                                  'ATTENZIONE: Codice temporaneo da sostituire con codice definitivo.';

        -- Recupera CategoryId e StatusId di default per la target company
        -- (assumo che esistano valori di default, altrimenti dovranno essere passati come parametri)
        DECLARE @DefaultCategoryId BIGINT = 1;  -- TODO: verificare valore di default appropriato
        DECLARE @DefaultStatusId BIGINT = 1;     -- TODO: verificare valore di default appropriato

        -- Genera nuovo ID per l'articolo
        DECLARE @MaxId BIGINT;
        SELECT @MaxId = ISNULL(MAX(Id), 0) FROM MA_ProjectArticles_Items WHERE CompanyId = @TargetCompanyId;
        SET @NewItemId = @MaxId + 1;

        -- Crea nuovo articolo temporaneo
        INSERT INTO MA_ProjectArticles_Items (
            Id,
            CompanyId,
            TBCreatedId,
            TBCreated,
            TBModifiedId,
            TBModified,
            Item,
            Description,
            DescriptionExtension,
            Diameter,
            Bxh,
            Depth,
            Length,
            MediumRadius,
            Notes,
            CategoryId,
            Nature,
            StatusId,
            fscodice,
            Disabled,
            BaseUoM
        )
        VALUES (
            @NewItemId,
            @TargetCompanyId,
            ISNULL(@UserId, 0),
            GETDATE(),
            ISNULL(@UserId, 0),
            GETDATE(),
            @NewItemCode,
            @TempDescription,
            @TempDescriptionExt,
            @SourceItemDiameter,
            @SourceItemBxh,
            @SourceItemDepth,
            @SourceItemLength,
            @SourceItemMediumRadius,
            N'CODICE TEMPORANEO INTERCOMPANY - Da sostituire con codice definitivo',
            @DefaultCategoryId,
            22413313,  -- Nature = Prodotto Finito
            @DefaultStatusId,
            'IC',      -- fscodice per Intercompany
            0,         -- Non disabilitato
            ISNULL(@SourceItemBaseUoM, 'NR')
        );

        COMMIT TRANSACTION;

        SET @ErrorMessage = N'Articolo temporaneo creato con successo: ' + @NewItemCode;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        SET @ErrorCode = ERROR_NUMBER();
        SET @ErrorMessage = ERROR_MESSAGE();
    END CATCH

    RETURN @ErrorCode;
END;
GO

PRINT 'Stored Procedure MA_CreateTemporaryIntercompanyItem creata con successo';
GO
