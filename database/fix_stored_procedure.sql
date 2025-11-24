-- Fix per MA_ApproveIntercompanyReference
-- Il problema è che @TargetProjectId viene recuperato dalla tabella temporanea
-- ma potrebbe essere NULL se la stored procedure MA_AddUpdateProject non restituisce dati

-- DROP e RICREA la stored procedure con il fix
USE [WebApp]
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MA_ApproveIntercompanyReference]') AND type in (N'P', N'PC'))
DROP PROCEDURE [dbo].[MA_ApproveIntercompanyReference]
GO

CREATE PROCEDURE [dbo].[MA_ApproveIntercompanyReference]
    @ReferenceID INT,                              -- ID della reference da approvare
    @UserId INT,                                   -- ID utente che approva
    @ResponseNotes NVARCHAR(MAX) = NULL,           -- Note di risposta
    @TargetItemCode VARCHAR(64) = NULL,            -- Codice articolo target (se già esiste, altrimenti NULL per creazione automatica)
    @CreateTemporaryIfMissing BIT = 1,             -- Se 1, crea codice temporaneo se @TargetItemCode è NULL
    @TargetProjectId INT OUTPUT,                   -- ID del progetto target creato/utilizzato
    @TargetItemId BIGINT OUTPUT,                   -- ID dell'articolo target creato/utilizzato
    @ErrorCode INT OUTPUT,                         -- Codice di errore (0 = successo)
    @ErrorMessage NVARCHAR(4000) OUTPUT            -- Messaggio di errore
AS
BEGIN
    SET NOCOUNT ON;

    -- Inizializzazione variabili di output
    SET @ErrorCode = 0;
    SET @ErrorMessage = N'';
    SET @TargetProjectId = NULL;
    SET @TargetItemId = NULL;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Validazione parametri
        IF @ReferenceID IS NULL OR @ReferenceID <= 0
        BEGIN
            SET @ErrorCode = 1;
            SET @ErrorMessage = N'ReferenceID non valido.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- Recupera informazioni sulla reference
        DECLARE @SourceProjectItemId INT,
                @SourceCompanyId INT,
                @SourceProjectId INT,
                @TargetCompanyId INT,
                @CurrentStatus VARCHAR(20),
                @Nature INT,
                @ExistingTargetProjectId INT,
                @ExistingTargetItemId INT;

        SELECT
            @SourceProjectItemId = SourceProjectItemId,
            @SourceCompanyId = SourceCompanyId,
            @SourceProjectId = SourceProjectId,
            @TargetCompanyId = TargetCompanyId,
            @CurrentStatus = Status,
            @Nature = Nature,
            @ExistingTargetProjectId = TargetProjectId,
            @ExistingTargetItemId = TargetProjectItemId
        FROM MA_ProjectArticles_References
        WHERE ReferenceID = @ReferenceID;

        IF @SourceProjectItemId IS NULL
        BEGIN
            SET @ErrorCode = 2;
            SET @ErrorMessage = N'Reference non trovata.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- Verifica che lo stato sia PENDING
        IF @CurrentStatus <> 'PENDING'
        BEGIN
            SET @ErrorCode = 3;
            SET @ErrorMessage = N'Solo le richieste in stato PENDING possono essere approvate. Stato attuale: ' + @CurrentStatus;
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- Verifica che SourceProjectId sia popolato
        IF @SourceProjectId IS NULL
        BEGIN
            SET @ErrorCode = 4;
            SET @ErrorMessage = N'SourceProjectId non presente nella reference. Impossibile procedere.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- =================================================================
        -- STEP 1: Verifica/Crea il progetto target
        -- =================================================================

        -- Verifica se esiste già un progetto target per questo SourceProjectId
        SELECT TOP 1 @TargetProjectId = TargetProjectId
        FROM MA_ProjectArticles_References
        WHERE SourceProjectId = @SourceProjectId
          AND TargetCompanyId = @TargetCompanyId
          AND TargetProjectId IS NOT NULL
          AND Status <> 'REJECTED';

        IF @TargetProjectId IS NULL
        BEGIN
            -- Crea nuovo progetto target

            -- Recupera informazioni sul progetto sorgente
            DECLARE @SourceProjectName NVARCHAR(255),
                    @SourceProjectDescription NVARCHAR(MAX),
                    @SourceProjectStartDate DATE,
                    @SourceProjectCategoryId INT,
                    @SourceProjectCategoryDetailLine INT;

            SELECT
                @SourceProjectName = Name,
                @SourceProjectDescription = Description,
                @SourceProjectStartDate = StartDate,
                @SourceProjectCategoryId = ProjectCategoryId,
                @SourceProjectCategoryDetailLine = ProjectCategoryDetailLine
            FROM MA_Projects
            WHERE ProjectID = @SourceProjectId AND CompanyId = @SourceCompanyId;

            -- Recupera informazioni sulla company sorgente
            DECLARE @SourceCompanyName VARCHAR(200);
            SELECT @SourceCompanyName = Description
            FROM AR_Companies
            WHERE CompanyId = @SourceCompanyId;

            -- Trova il cliente Intercompany (fornitore nella company sorgente che rappresenta la company target)
            DECLARE @IntercompanyCustomerCode VARCHAR(12);
            SELECT TOP 1 @IntercompanyCustomerCode = CustSupp
            FROM MA_CustSupp
            WHERE CompanyId = @TargetCompanyId
              AND CustSuppType = 3211264  -- Cliente
              AND IntercompanyId = @SourceCompanyId;

            IF @IntercompanyCustomerCode IS NULL
            BEGIN
                SET @ErrorCode = 5;
                SET @ErrorMessage = N'Cliente Intercompany non trovato per ' + ISNULL(@SourceCompanyName, 'la company sorgente') +
                                    N' nella company target. Verificare la configurazione in MA_CustSupp.';
                ROLLBACK TRANSACTION;
                RETURN;
            END

            -- Genera nome per il nuovo progetto
            DECLARE @NewProjectName NVARCHAR(255);
            SET @NewProjectName = N'IC - ' + ISNULL(@SourceCompanyName, '') + ' - ' + ISNULL(@SourceProjectName, 'Progetto');

            -- Trova il CustSupp ID (chiave della tabella MA_CustSupp)
            DECLARE @CustSuppId INT;
            SELECT @CustSuppId = CustSupp
            FROM MA_CustSupp
            WHERE CustSupp = @IntercompanyCustomerCode AND CompanyId = @TargetCompanyId;


            -- 🔧 FIX: Usa una tabella variabile invece di table variable per catturare il risultato
            DECLARE @ProjectResultTable TABLE (
                ProjectID INT,
                success INT,
                msg NVARCHAR(MAX)
            );

            -- Esegui la SP e cattura il risultato nel recordset
            INSERT INTO @ProjectResultTable (ProjectID, success, msg)
            EXEC MA_AddUpdateProject
                @ProjectID = NULL,                                    -- NULL per creazione
                @Name = @NewProjectName,                              -- 🔧 FIX: Usa il nome generato invece di NULL
                @Description = @SourceProjectDescription,
                @StartDate = @SourceProjectStartDate,
                @EndDate = NULL,
                @Status = 'BO',                                       -- Stato iniziale
                @UserId = @UserId,
                @ProjectCategoryId = @SourceProjectCategoryId,
                @ProjectCategoryDetailLine = @SourceProjectCategoryDetailLine,
                @Disabled = 0,
                @CustSupp = @CustSuppId,
                @CompanyId = @TargetCompanyId,
                @UseStages = 0;

            -- ⭐ Recupera l'ID del progetto dalla tabella temporanea
            SELECT @TargetProjectId = ProjectID
            FROM @ProjectResultTable;

            -- 🔧 FIX: Aggiungi logging per debug
            PRINT '🔍 DEBUG: ProjectID dalla tabella temporanea: ' + ISNULL(CAST(@TargetProjectId AS NVARCHAR(10)), 'NULL');

            -- Verifica che il progetto sia stato creato correttamente
            IF @TargetProjectId IS NULL OR @TargetProjectId <= 0
            BEGIN
                DECLARE @ProjectCreationMsg NVARCHAR(MAX);
                DECLARE @ProjectCreationSuccess INT;

                SELECT
                    @ProjectCreationMsg = msg,
                    @ProjectCreationSuccess = success
                FROM @ProjectResultTable;

                SET @ErrorCode = 6;
                SET @ErrorMessage = N'Errore nella creazione del progetto target. ' +
                                  N'ProjectID: ' + ISNULL(CAST(@TargetProjectId AS NVARCHAR(10)), 'NULL') +
                                  N', Success: ' + ISNULL(CAST(@ProjectCreationSuccess AS NVARCHAR(10)), 'NULL') +
                                  N', Msg: ' + ISNULL(@ProjectCreationMsg, 'N/A');
                ROLLBACK TRANSACTION;
                RETURN;
            END

            -- Aggiunge il membro principale (utente che approva) al progetto
            IF NOT EXISTS (SELECT 1 FROM MA_ProjectMembers WHERE ProjectID = @TargetProjectId AND UserID = @UserId)
            BEGIN
                INSERT INTO MA_ProjectMembers (ProjectID, UserID, Role, TBCreated)
                VALUES (@TargetProjectId, @UserId, 'ADMIN', GETDATE());
            END
        END

        -- =================================================================
        -- STEP 2: Verifica/Crea l'articolo target
        -- =================================================================

        -- Se è stato fornito un codice articolo, verificalo
        IF @TargetItemCode IS NOT NULL AND @TargetItemCode <> ''
        BEGIN
            -- Cerca l'articolo esistente
            SELECT @TargetItemId = Id
            FROM MA_ProjectArticles_Items
            WHERE Item = @TargetItemCode AND CompanyId = @TargetCompanyId;

            IF @TargetItemId IS NULL
            BEGIN
                SET @ErrorCode = 7;
                SET @ErrorMessage = N'Codice articolo target specificato (' + @TargetItemCode + N') non trovato.';
                ROLLBACK TRANSACTION;
                RETURN;
            END
        END
        ELSE
        BEGIN
            -- Codice articolo non fornito
            IF @CreateTemporaryIfMissing = 1
            BEGIN
                -- Crea codice temporaneo
                DECLARE @NewItemCode VARCHAR(64);
                DECLARE @TempErrorCode INT;
                DECLARE @TempErrorMessage NVARCHAR(4000);

                EXEC @TempErrorCode = MA_CreateTemporaryIntercompanyItem
                    @SourceItemId = @SourceProjectItemId,
                    @SourceCompanyId = @SourceCompanyId,
                    @TargetCompanyId = @TargetCompanyId,
                    @UserId = @UserId,
                    @NewItemId = @TargetItemId OUTPUT,
                    @NewItemCode = @NewItemCode OUTPUT,
                    @ErrorCode = @TempErrorCode OUTPUT,
                    @ErrorMessage = @TempErrorMessage OUTPUT;

                IF @TempErrorCode <> 0
                BEGIN
                    SET @ErrorCode = @TempErrorCode;
                    SET @ErrorMessage = N'Errore nella creazione dell''articolo temporaneo: ' + @TempErrorMessage;
                    ROLLBACK TRANSACTION;
                    RETURN;
                END

                SET @TargetItemCode = @NewItemCode;
            END
            ELSE
            BEGIN
                SET @ErrorCode = 8;
                SET @ErrorMessage = N'Codice articolo target non fornito e creazione automatica disabilitata.';
                ROLLBACK TRANSACTION;
                RETURN;
            END
        END

        -- =================================================================
        -- STEP 3: Associa l'articolo al progetto target
        -- =================================================================

        IF NOT EXISTS (SELECT 1 FROM MA_ProjectsItems WHERE ProjectID = @TargetProjectId AND ItemId = @TargetItemId AND CompanyId = @TargetCompanyId)
        BEGIN
            INSERT INTO MA_ProjectsItems (ProjectID, ItemId, CompanyId, TBCreated)
            VALUES (@TargetProjectId, @TargetItemId, @TargetCompanyId, GETDATE());
        END

        -- =================================================================
        -- STEP 3B: Copia allegati condivisi nel progetto target
        -- =================================================================
        DECLARE @AttachmentsCopied INT = 0;

        INSERT INTO MA_ProjectAttachments (
            ProjectID,
            FileName,
            FilePath,
            FileType,
            FileSizeKB,
            UploadedBy,
            UploadedAt
        )
        SELECT
            @TargetProjectId,
            ia.FileName,
            ia.FilePath,
            ia.FileType,
            ia.FileSizeKB,
            ia.UploadedBy,
            GETDATE()
        FROM MA_ItemAttachments ia
        INNER JOIN MA_ItemAttachmentSharing ias
            ON ia.AttachmentID = ias.AttachmentID
        WHERE ia.ProjectItemId = @SourceProjectItemId
            AND ia.CompanyId = @SourceCompanyId
            AND ias.TargetCompanyId = @TargetCompanyId
            AND ia.IsVisible = 1
            AND NOT EXISTS (
                SELECT 1
                FROM MA_ProjectAttachments pa
                WHERE pa.ProjectID = @TargetProjectId
                    AND pa.FilePath = ia.FilePath
            );

        SET @AttachmentsCopied = @@ROWCOUNT;

        -- =================================================================
        -- STEP 4: Aggiorna la reference con ACCEPTED e i riferimenti al progetto/articolo target
        -- =================================================================

        UPDATE MA_ProjectArticles_References
        SET
            Status = 'ACCEPTED',
            ResponseDate = GETDATE(),
            ResponseNotes = ISNULL(@ResponseNotes, N'Richiesta approvata'),
            TargetProjectId = @TargetProjectId,
            TargetProjectItemId = @TargetItemId,
            TargetProjectItemCode = @TargetItemCode,
            TBModified = GETDATE(),
            TBModifiedId = @UserId
        WHERE ReferenceID = @ReferenceID;

        -- Log dell'operazione
        INSERT INTO MA_ProjectArticles_ReferencesLog (
            ReferenceID,
            Action,
            SourceProjectItemId,
            SourceCompanyId,
            TargetProjectItemId,
            TargetCompanyId,
            Nature,
            UserId,
            ActionDate
        )
        VALUES (
            @ReferenceID,
            'ACCEPT',
            @SourceProjectItemId,
            @SourceCompanyId,
            @TargetItemId,
            @TargetCompanyId,
            @Nature,
            @UserId,
            GETDATE()
        );

        COMMIT TRANSACTION;

        SET @ErrorMessage = N'Richiesta approvata con successo. Progetto: ' + CAST(@TargetProjectId AS NVARCHAR(10)) +
                           N', Articolo: ' + ISNULL(@TargetItemCode, '') +
                           N', Allegati copiati: ' + CAST(@AttachmentsCopied AS NVARCHAR(10));

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
