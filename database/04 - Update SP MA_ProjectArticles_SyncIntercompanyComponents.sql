-- =============================================
-- 04 - Update SP MA_ProjectArticles_SyncIntercompanyComponents
-- Aggiorna la stored procedure per tracciare SourceProjectId e gestire componenti già sincronizzati
-- Author: Claude Code
-- Date: 2025-10-25
-- =============================================

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Drop e ricreazione della stored procedure
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MA_ProjectArticles_SyncIntercompanyComponents]') AND type in (N'P', N'PC'))
DROP PROCEDURE [dbo].[MA_ProjectArticles_SyncIntercompanyComponents]
GO

CREATE PROCEDURE [dbo].[MA_ProjectArticles_SyncIntercompanyComponents]
    @CompanyId INT,                                                -- ID dell'azienda
    @ProjectId INT,                                                -- ID del progetto sorgente (NUOVO PARAMETRO)
    @UserId INT = NULL,                                            -- ID utente che esegue la sincronizzazione
    @Components NVARCHAR(MAX),                                     -- JSON con componenti selezionati
    @SyncAttachments BIT = 1,                                      -- Flag per sincronizzare anche gli allegati
    @ErrorCode INT OUTPUT,                                         -- Codice di errore (0 = successo)
    @ErrorMessage NVARCHAR(4000) OUTPUT                           -- Messaggio di errore
AS
BEGIN
    SET NOCOUNT ON;

    -- Inizializzazione variabili di output
    SET @ErrorCode = 0;
    SET @ErrorMessage = N'';

    -- Variabili per contatori
    DECLARE @ReferencesCreated INT = 0;
    DECLARE @ReferencesUpdated INT = 0;
    DECLARE @ReferencesReset INT = 0;  -- Nuovo contatore per references resettate
    DECLARE @AttachmentsShared INT = 0;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Validazione parametri
        IF @CompanyId IS NULL OR @CompanyId <= 0
        BEGIN
            SET @ErrorCode = 1;
            SET @ErrorMessage = N'CompanyId non valido.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        IF @ProjectId IS NULL OR @ProjectId <= 0
        BEGIN
            SET @ErrorCode = 2;
            SET @ErrorMessage = N'ProjectId non valido.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        IF @Components IS NULL OR @Components = ''
        BEGIN
            SET @ErrorCode = 3;
            SET @ErrorMessage = N'Nessun componente selezionato per la sincronizzazione.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- Verifica che il progetto esista
        IF NOT EXISTS (SELECT 1 FROM MA_Projects WHERE ProjectID = @ProjectId AND CompanyId = @CompanyId)
        BEGIN
            SET @ErrorCode = 4;
            SET @ErrorMessage = N'Progetto non trovato.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- Recupera la data di creazione del progetto per confronti
        DECLARE @SourceProjectCreatedDate DATETIME;
        SELECT @SourceProjectCreatedDate = TBCreated
        FROM MA_Projects
        WHERE ProjectID = @ProjectId AND CompanyId = @CompanyId;

        -- Tabella temporanea per i componenti da sincronizzare
        DECLARE @ComponentsToSync TABLE (
            ComponentId BIGINT,
            ComponentCode VARCHAR(64),
            ComponentDescription NVARCHAR(255),
            TargetCompanyId INT,
            TargetCompanyName NVARCHAR(255),
            IntercompanyType VARCHAR(20),
            SupplierCode VARCHAR(20),
            Nature INT,
            ExistingReferenceId INT
        );

        -- Parsing JSON e inserimento nella tabella temporanea
        INSERT INTO @ComponentsToSync (
            ComponentId, ComponentCode, ComponentDescription, TargetCompanyId,
            TargetCompanyName, IntercompanyType, SupplierCode, Nature, ExistingReferenceId
        )
        SELECT
            CAST(JSON_VALUE(value, '$.ComponentId') AS BIGINT),
            JSON_VALUE(value, '$.ComponentCode'),
            JSON_VALUE(value, '$.ComponentDescription'),
            CAST(JSON_VALUE(value, '$.TargetCompanyId') AS INT),
            JSON_VALUE(value, '$.TargetCompanyName'),
            JSON_VALUE(value, '$.IntercompanyType'),
            JSON_VALUE(value, '$.SupplierCode'),
            CAST(JSON_VALUE(value, '$.Nature') AS INT),
            CAST(JSON_VALUE(value, '$.ExistingReferenceId') AS INT)
        FROM OPENJSON(@Components);

        -- =================================================================
        -- CREA/AGGIORNA REFERENCES
        -- =================================================================
        DECLARE @ComponentId BIGINT,
                @ComponentCode VARCHAR(64),
                @ComponentDesc NVARCHAR(255),
                @TargetCompanyId INT,
                @TargetCompanyName NVARCHAR(255),
                @IntercompanyType VARCHAR(20),
                @SupplierCode VARCHAR(20),
                @Nature INT,
                @ExistingRefId INT;

        DECLARE ComponentCursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT
            ComponentId, ComponentCode, ComponentDescription, TargetCompanyId,
            TargetCompanyName, IntercompanyType, SupplierCode, Nature, ExistingReferenceId
        FROM @ComponentsToSync;

        OPEN ComponentCursor;
        FETCH NEXT FROM ComponentCursor INTO
            @ComponentId, @ComponentCode, @ComponentDesc, @TargetCompanyId,
            @TargetCompanyName, @IntercompanyType, @SupplierCode, @Nature, @ExistingRefId;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Controlla se esiste già una reference per questa combinazione
            DECLARE @ExistingReferenceId INT = NULL;
            DECLARE @ExistingSourceProjectId INT = NULL;
            DECLARE @ExistingProjectCreatedDate DATETIME = NULL;
            DECLARE @ExistingStatus VARCHAR(20) = NULL;

            SELECT
                @ExistingReferenceId = ReferenceID,
                @ExistingSourceProjectId = SourceProjectId,
                @ExistingStatus = Status
            FROM dbo.MA_ProjectArticles_References
            WHERE SourceProjectItemId = @ComponentId
              AND SourceCompanyId = @CompanyId
              AND TargetCompanyId = @TargetCompanyId
              AND Status IN ('PENDING', 'ACCEPTED', 'REJECTED');

            -- Se esiste una reference e il progetto è diverso, verifica quale è più recente
            IF @ExistingReferenceId IS NOT NULL AND @ExistingSourceProjectId IS NOT NULL AND @ExistingSourceProjectId <> @ProjectId
            BEGIN
                -- Recupera la data di creazione del progetto esistente
                SELECT @ExistingProjectCreatedDate = TBCreated
                FROM MA_Projects
                WHERE ProjectID = @ExistingSourceProjectId AND CompanyId = @CompanyId;

                -- Se il progetto corrente è più recente, resetta la reference
                IF @SourceProjectCreatedDate > ISNULL(@ExistingProjectCreatedDate, '1900-01-01')
                BEGIN
                    -- Resetta la reference per il nuovo progetto
                    UPDATE dbo.MA_ProjectArticles_References
                    SET
                        SourceProjectId = @ProjectId,
                        TargetProjectId = NULL,  -- Resetta il progetto target
                        TargetProjectItemId = NULL,  -- Resetta l'articolo target
                        Status = 'PENDING',  -- Torna a PENDING
                        RequestDate = GETDATE(),
                        ResponseDate = NULL,
                        ResponseNotes = NULL,
                        RequestNotes = N'Richiesta aggiornata per nuovo progetto: ' +
                                      CAST(@ProjectId AS NVARCHAR(10)) +
                                      N' (precedente: ' + CAST(@ExistingSourceProjectId AS NVARCHAR(10)) + N')',
                        TBModified = GETDATE(),
                        TBModifiedId = ISNULL(@UserId, 0)
                    WHERE ReferenceID = @ExistingReferenceId;

                    SET @ReferencesReset = @ReferencesReset + 1;

                    -- Log dell'operazione
                    INSERT INTO MA_ProjectArticles_ReferencesLog (
                        ReferenceID, Action, SourceProjectItemId, SourceCompanyId,
                        TargetProjectItemId, TargetCompanyId, Nature, UserId, ActionDate
                    )
                    VALUES (
                        @ExistingReferenceId, 'RESET', @ComponentId, @CompanyId,
                        NULL, @TargetCompanyId, @Nature, ISNULL(@UserId, 0), GETDATE()
                    );

                    FETCH NEXT FROM ComponentCursor INTO
                        @ComponentId, @ComponentCode, @ComponentDesc, @TargetCompanyId,
                        @TargetCompanyName, @IntercompanyType, @SupplierCode, @Nature, @ExistingRefId;
                    CONTINUE;
                END
                ELSE
                BEGIN
                    -- Il progetto esistente è più recente, non fare nulla
                    FETCH NEXT FROM ComponentCursor INTO
                        @ComponentId, @ComponentCode, @ComponentDesc, @TargetCompanyId,
                        @TargetCompanyName, @IntercompanyType, @SupplierCode, @Nature, @ExistingRefId;
                    CONTINUE;
                END
            END

            -- Recupera il codice fornitore per l'articolo target
            DECLARE @TargetProjectItemCode VARCHAR(50) = NULL;
            DECLARE @IntercompanySupplierCode VARCHAR(10) = (SELECT TOP(1) CustSupp FROM MA_CustSupp WHERE CompanyId = @CompanyId AND CustSuppType = 3211265 AND IntercompanyId = @TargetCompanyId);

            SET @TargetProjectItemCode = ISNULL((
                SELECT TOP(1) T3.SupplierCode
                FROM MA_ProjectArticles_Items T0
                JOIN MA_Items T1 ON T1.CompanyId = T0.CompanyId AND T1.Item = T0.Item
                JOIN MA_ItemSuppliers T3 ON T3.CompanyId = T1.CompanyId AND T3.Item = T1.Item AND T3.Supplier = @IntercompanySupplierCode
                WHERE T0.CompanyId = @CompanyId
                  AND T0.Id = @ComponentId
            ), NULL);

            IF @ExistingReferenceId IS NULL
            BEGIN
                -- Crea nuova reference
                INSERT INTO dbo.MA_ProjectArticles_References (
                    SourceProjectItemId,
                    SourceCompanyId,
                    SourceProjectId,  -- NUOVO CAMPO
                    TargetProjectItemId,
                    TargetProjectItemCode,
                    TargetCompanyId,
                    TargetProjectId,  -- NUOVO CAMPO (NULL inizialmente)
                    Nature,
                    TBCreated,
                    TBCreatedId,
                    Status,
                    RequestDate,
                    ResponseDate,
                    RequestNotes,
                    Priority,
                    DueDate
                )
                VALUES (
                    @ComponentId,
                    @CompanyId,
                    @ProjectId,  -- NUOVO VALORE
                    ISNULL((SELECT TOP(1) id FROM MA_ProjectArticles_Items WHERE CompanyId = @TargetCompanyId AND Item = @TargetProjectItemCode ORDER BY Id), NULL),
                    @TargetProjectItemCode,
                    @TargetCompanyId,
                    NULL,  -- TargetProjectId inizialmente NULL
                    @Nature,
                    GETDATE(),
                    ISNULL(@UserId, 0),
                    'PENDING',  -- Status iniziale
                    GETDATE(),
                    NULL,
                    N'Condivisione automatica - Progetto: ' + CAST(@ProjectId AS NVARCHAR(10)) +
                    N' - Tipo: ' + @IntercompanyType +
                    N' - Fornitore: ' + @SupplierCode +
                    N' - Articolo: ' + @ComponentCode + N' - ' + @ComponentDesc,
                    1,  -- Priorità normale
                    NULL
                );

                SET @ReferencesCreated = @ReferencesCreated + 1;
            END
            ELSE
            BEGIN
                -- Aggiorna reference esistente se non è già ACCEPTED
                UPDATE dbo.MA_ProjectArticles_References
                SET
                    Nature = @Nature,
                    SourceProjectId = @ProjectId,  -- Aggiorna sempre il SourceProjectId
                    TBModified = GETDATE(),
                    TBModifiedId = ISNULL(@UserId, 0)
                WHERE ReferenceID = @ExistingReferenceId
                  AND Status IN ('PENDING', 'REJECTED');

                IF @@ROWCOUNT > 0
                    SET @ReferencesUpdated = @ReferencesUpdated + 1;

                -- Aggiorna reference del codice del fornitore sempre
                UPDATE dbo.MA_ProjectArticles_References
                SET
                    TargetProjectItemId = ISNULL((SELECT TOP(1) id FROM MA_ProjectArticles_Items WHERE CompanyId = @TargetCompanyId AND Item = @TargetProjectItemCode ORDER BY Id), NULL),
                    TargetProjectItemCode = @TargetProjectItemCode
                WHERE ReferenceID = @ExistingReferenceId;
            END

            FETCH NEXT FROM ComponentCursor INTO
                @ComponentId, @ComponentCode, @ComponentDesc, @TargetCompanyId,
                @TargetCompanyName, @IntercompanyType, @SupplierCode, @Nature, @ExistingRefId;
        END

        CLOSE ComponentCursor;
        DEALLOCATE ComponentCursor;

        -- =================================================================
        -- SINCRONIZZA ALLEGATI (opzionale)
        -- =================================================================
        IF @SyncAttachments = 1
        BEGIN
            -- Logica per sincronizzazione allegati
            -- (da implementare se necessario)
            SET @AttachmentsShared = 0;
        END

        COMMIT TRANSACTION;

        -- Imposta messaggio di successo
        SET @ErrorMessage = N'Sincronizzazione completata con successo. ' +
                           N'References create: ' + CAST(@ReferencesCreated AS NVARCHAR(10)) + N', ' +
                           N'References aggiornate: ' + CAST(@ReferencesUpdated AS NVARCHAR(10)) + N', ' +
                           N'References resettate: ' + CAST(@ReferencesReset AS NVARCHAR(10)) + N', ' +
                           N'Allegati condivisi: ' + CAST(@AttachmentsShared AS NVARCHAR(10));

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        SET @ErrorCode = ERROR_NUMBER();
        SET @ErrorMessage = ERROR_MESSAGE();

    END CATCH

    -- Output di riepilogo
    SELECT
        @ErrorCode AS ErrorCode,
        @ErrorMessage AS ErrorMessage,
        @ReferencesCreated AS ReferencesCreated,
        @ReferencesUpdated AS ReferencesUpdated,
        @ReferencesReset AS ReferencesReset,
        @AttachmentsShared AS AttachmentsShared;
END
GO

PRINT 'Stored Procedure MA_ProjectArticles_SyncIntercompanyComponents aggiornata con successo';
GO
