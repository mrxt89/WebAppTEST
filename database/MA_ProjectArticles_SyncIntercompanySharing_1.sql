-- =============================================
-- Author:      Claude Code
-- Create date: 2025-10-13
-- Description: Sincronizza automaticamente le relazioni intercompany e gli allegati
--              quando viene creata/modificata una BOM
--              Gestisce sia componenti di acquisto che di conto lavoro
-- Version:     1.0
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[MA_ProjectArticles_SyncIntercompanySharing]
    @BOMId BIGINT,                      -- ID della distinta base
    @CompanyId INT,                     -- ID dell'azienda
    @UserId INT = NULL,                 -- ID utente che esegue la sincronizzazione
    @SyncAttachments BIT = 1,           -- Flag per sincronizzare anche gli allegati
    @AutoCreateReferences BIT = 1,      -- Flag per creare automaticamente le references
    @ErrorCode INT OUTPUT,              -- Codice di errore (0 = successo)
    @ErrorMessage NVARCHAR(4000) OUTPUT -- Messaggio di errore
AS
BEGIN
    SET NOCOUNT ON;

    -- Inizializzazione variabili di output
    SET @ErrorCode = 0;
    SET @ErrorMessage = N'';

    -- Variabili per contatori
    DECLARE @ReferencesCreated INT = 0;
    DECLARE @ReferencesUpdated INT = 0;
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

        IF @BOMId IS NULL OR @BOMId <= 0
        BEGIN
            SET @ErrorCode = 2;
            SET @ErrorMessage = N'BOMId non valido.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- Verifica che la BOM esista
        DECLARE @ItemId BIGINT;
        SELECT @ItemId = ItemId
        FROM dbo.MA_ProjectArticles_BillOfMaterials
        WHERE Id = @BOMId AND CompanyId = @CompanyId;

        IF @ItemId IS NULL
        BEGIN
            SET @ErrorCode = 3;
            SET @ErrorMessage = N'Distinta base non trovata.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- Tabella temporanea per i componenti intercompany
        DECLARE @IntercompanyComponents TABLE (
            ComponentId BIGINT,
            ComponentCode VARCHAR(64),
            ComponentDescription VARCHAR(128),
            TargetCompanyId INT,
            TargetCompanyName VARCHAR(200),
            IntercompanyType VARCHAR(20),
            SupplierCode VARCHAR(12),
            Nature INT,
            ExistingReferenceId INT
        );

        -- =============================================
        -- STEP 1: IDENTIFICA COMPONENTI INTERCOMPANY
        -- =============================================
        DECLARE @MainRefBOMId BIGINT;
        SELECT @MainRefBOMId = ISNULL(MainRefBOMId, Id)
        FROM dbo.MA_ProjectArticles_BillOfMaterials
        WHERE Id = @BOMId AND CompanyId = @CompanyId;

        -- A) COMPONENTI DI ACQUISTO INTERCOMPANY
        INSERT INTO @IntercompanyComponents (
            ComponentId, ComponentCode, ComponentDescription, TargetCompanyId,
            TargetCompanyName, IntercompanyType, SupplierCode, Nature, ExistingReferenceId
        )
        SELECT DISTINCT
            comp.ComponentId,
            item.Item,
            item.Description,
            cs.IntercompanyId,
            targetComp.Description AS CompanyName,
            'ACQUISTO',
            cs.CustSupp,
            item.Nature,
            ref.ReferenceID
        FROM dbo.MA_ProjectArticles_BOMComponents comp
        INNER JOIN dbo.MA_ProjectArticles_Items item
            ON comp.ComponentId = item.Id
            AND comp.CompanyId = item.CompanyId
        LEFT JOIN dbo.MA_Items maItem
            ON item.Item = maItem.Item
            AND item.CompanyId = maItem.CompanyId
        LEFT JOIN dbo.MA_ItemsGoodsData goodsData
            ON maItem.Item = goodsData.Item
            AND maItem.CompanyId = goodsData.CompanyId
        LEFT JOIN dbo.MA_ItemSuppliers itemSupp
            ON goodsData.Supplier = itemSupp.Supplier
            AND maItem.Item = itemSupp.Item
            AND maItem.CompanyId = itemSupp.CompanyId
        LEFT JOIN dbo.MA_CustSupp cs
            ON itemSupp.Supplier = cs.CustSupp
            AND itemSupp.CompanyId = cs.CompanyId
            AND cs.CustSuppType = 3211265  -- Fornitore
        LEFT JOIN dbo.AR_Companies targetComp
            ON cs.IntercompanyId = targetComp.CompanyId
        LEFT JOIN dbo.MA_ProjectArticles_References ref
            ON ref.SourceProjectItemId = comp.ComponentId
            AND ref.SourceCompanyId = @CompanyId
            AND ref.TargetCompanyId = cs.IntercompanyId
        WHERE
            comp.BOMId = @BOMId
            AND comp.CompanyId = @CompanyId
            AND maItem.Nature = 22413314  -- Natura = Acquisto
            AND cs.IntercompanyId IS NOT NULL;

        -- B) COMPONENTI DI CONTO LAVORO INTERCOMPANY
        INSERT INTO @IntercompanyComponents (
            ComponentId, ComponentCode, ComponentDescription, TargetCompanyId,
            TargetCompanyName, IntercompanyType, SupplierCode, Nature, ExistingReferenceId
        )
        SELECT DISTINCT
            comp.ComponentId,
            item.Item,
            item.Description,
            cs.IntercompanyId,
            targetComp.Description AS CompanyName,
            'CONTO_LAVORO',
            cs.CustSupp,
            item.Nature,
            ref.ReferenceID
        FROM dbo.MA_ProjectArticles_BOMComponents comp
        INNER JOIN dbo.MA_ProjectArticles_Items item
            ON comp.ComponentId = item.Id
            AND comp.CompanyId = item.CompanyId
        -- Trova la BOM corretta del componente (logica duale)
        LEFT JOIN (
            SELECT
                ItemId,
                Id AS BOMId,
                CompanyId,
                ROW_NUMBER() OVER(
                    PARTITION BY ItemId
                    ORDER BY
                        CASE WHEN MainRefBOMId = @MainRefBOMId THEN 1 ELSE 2 END,
                        Version DESC
                ) AS rn
            FROM dbo.MA_ProjectArticles_BillOfMaterials
            WHERE CompanyId = @CompanyId
                AND (MainRefBOMId = @MainRefBOMId OR Version = 1)
        ) compBOM
            ON compBOM.ItemId = comp.ComponentId
            AND compBOM.CompanyId = comp.CompanyId
            AND compBOM.rn = 1
        LEFT JOIN dbo.MA_ProjectArticles_BOMRouting routing
            ON routing.BOMId = compBOM.BOMId
            AND routing.CompanyId = comp.CompanyId
        LEFT JOIN dbo.MA_WorkCenters wc
            ON routing.WC = wc.WC
            AND routing.CompanyId = wc.CompanyId
        LEFT JOIN dbo.MA_CustSupp cs
            ON wc.Supplier = cs.CustSupp
            AND wc.CompanyId = cs.CompanyId
            AND cs.CustSuppType = 3211265  -- Fornitore
        LEFT JOIN dbo.AR_Companies targetComp
            ON cs.IntercompanyId = targetComp.CompanyId
        LEFT JOIN dbo.MA_ProjectArticles_References ref
            ON ref.SourceProjectItemId = comp.ComponentId
            AND ref.SourceCompanyId = @CompanyId
            AND ref.TargetCompanyId = cs.IntercompanyId
        WHERE
            comp.BOMId = @BOMId
            AND comp.CompanyId = @CompanyId
            AND cs.IntercompanyId IS NOT NULL
            AND wc.Supplier IS NOT NULL
            AND wc.Supplier <> ''
            -- Evita duplicati con acquisti
            AND comp.ComponentId NOT IN (SELECT ComponentId FROM @IntercompanyComponents);

        -- =============================================
        -- STEP 2: CREA/AGGIORNA REFERENCES
        -- =============================================
        IF @AutoCreateReferences = 1
        BEGIN
            DECLARE @ComponentId BIGINT,
                    @ComponentCode VARCHAR(64),
                    @ComponentDesc VARCHAR(128),
                    @TargetCompanyId INT,
                    @TargetCompanyName VARCHAR(200),
                    @IntercompanyType VARCHAR(20),
                    @SupplierCode VARCHAR(12),
                    @Nature INT,
                    @ExistingRefId INT;

            DECLARE ComponentCursor CURSOR LOCAL FAST_FORWARD FOR
            SELECT DISTINCT
                ComponentId,
                ComponentCode,
                ComponentDescription,
                TargetCompanyId,
                TargetCompanyName,
                IntercompanyType,
                SupplierCode,
                Nature,
                ExistingReferenceId
            FROM @IntercompanyComponents;

            OPEN ComponentCursor;
            FETCH NEXT FROM ComponentCursor INTO
                @ComponentId, @ComponentCode, @ComponentDesc, @TargetCompanyId,
                @TargetCompanyName, @IntercompanyType, @SupplierCode, @Nature, @ExistingRefId;

            WHILE @@FETCH_STATUS = 0
            BEGIN
                IF @ExistingRefId IS NULL
                BEGIN
                    -- Crea nuova reference
                    INSERT INTO dbo.MA_ProjectArticles_References (
                        SourceProjectItemId,
                        SourceCompanyId,
                        TargetProjectItemId,
                        TargetCompanyId,
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
                        NULL,  -- Sarà popolato dalla company target
                        @TargetCompanyId,
                        @Nature,
                        GETDATE(),
                        ISNULL(@UserId, 0),
                        'PENDING',  -- Status iniziale
                        GETDATE(),
                        NULL,
                        N'Condivisione automatica - Tipo: ' + @IntercompanyType +
                        N' - Fornitore: ' + @SupplierCode +
                        N' - Articolo: ' + @ComponentCode + N' - ' + @ComponentDesc,
                        1,  -- Priorità normale
                        NULL
                    );

                    SET @ReferencesCreated = @ReferencesCreated + 1;
                END
                ELSE
                BEGIN
                    -- Aggiorna reference esistente se è in stato PENDING o DRAFT
                    UPDATE dbo.MA_ProjectArticles_References
                    SET
                        RequestNotes = N'Aggiornamento automatico - Tipo: ' + @IntercompanyType +
                                       N' - Fornitore: ' + @SupplierCode +
                                       N' - Articolo: ' + @ComponentCode + N' - ' + @ComponentDesc,
                        Nature = @Nature
                    WHERE ReferenceID = @ExistingRefId
                      AND Status IN ('PENDING', 'DRAFT');

                    IF @@ROWCOUNT > 0
                        SET @ReferencesUpdated = @ReferencesUpdated + 1;
                END

                FETCH NEXT FROM ComponentCursor INTO
                    @ComponentId, @ComponentCode, @ComponentDesc, @TargetCompanyId,
                    @TargetCompanyName, @IntercompanyType, @SupplierCode, @Nature, @ExistingRefId;
            END

            CLOSE ComponentCursor;
            DEALLOCATE ComponentCursor;
        END

        -- =============================================
        -- STEP 3: SINCRONIZZA ALLEGATI
        -- =============================================
        IF @SyncAttachments = 1
        BEGIN
            DECLARE @AttachmentCursor CURSOR;

            DECLARE @AttachmentId INT,
                    @AttComponentCode VARCHAR(64),
                    @AttTargetCompanyId INT;

            SET @AttachmentCursor = CURSOR LOCAL FAST_FORWARD FOR
            SELECT DISTINCT
                att.AttachmentID,
                ic.ComponentCode,
                ic.TargetCompanyId
            FROM @IntercompanyComponents ic
            INNER JOIN dbo.MA_ItemAttachments att
                ON att.ItemCode = ic.ComponentCode
                AND att.CompanyId = @CompanyId
            WHERE NOT EXISTS (
                SELECT 1
                FROM dbo.MA_ItemAttachmentSharing share
                WHERE share.AttachmentID = att.AttachmentID
                  AND share.TargetCompanyId = ic.TargetCompanyId
            );

            OPEN @AttachmentCursor;
            FETCH NEXT FROM @AttachmentCursor INTO
                @AttachmentId, @AttComponentCode, @AttTargetCompanyId;

            WHILE @@FETCH_STATUS = 0
            BEGIN
                -- Crea condivisione allegato
                INSERT INTO dbo.MA_ItemAttachmentSharing (
                    AttachmentID,
                    TargetCompanyId,
                    SharedBy,
                    SharedAt,
                    AccessLevel
                )
                VALUES (
                    @AttachmentId,
                    @AttTargetCompanyId,
                    ISNULL(@UserId, 0),
                    GETDATE(),
                    'READ'  -- Livello di accesso di default
                );

                SET @AttachmentsShared = @AttachmentsShared + 1;

                FETCH NEXT FROM @AttachmentCursor INTO
                    @AttachmentId, @AttComponentCode, @AttTargetCompanyId;
            END

            CLOSE @AttachmentCursor;
            DEALLOCATE @AttachmentCursor;
        END

        -- =============================================
        -- STEP 4: LOG OPERAZIONE (opzionale)
        -- =============================================
        -- Puoi inserire qui il log dell'operazione se hai una tabella di audit

        COMMIT TRANSACTION;

        -- Imposta messaggio di successo
        SET @ErrorMessage = N'Sincronizzazione completata con successo. ' +
                           N'References create: ' + CAST(@ReferencesCreated AS NVARCHAR(10)) + N', ' +
                           N'References aggiornate: ' + CAST(@ReferencesUpdated AS NVARCHAR(10)) + N', ' +
                           N'Allegati condivisi: ' + CAST(@AttachmentsShared AS NVARCHAR(10));

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        SET @ErrorCode = ERROR_NUMBER();
        SET @ErrorMessage = ERROR_MESSAGE();

        -- Log dell'errore (opzionale)
        -- INSERT INTO ErrorLog (ErrorCode, ErrorMessage, ProcedureName, ErrorDate)
        -- VALUES (@ErrorCode, @ErrorMessage, 'MA_ProjectArticles_SyncIntercompanySharing', GETDATE());

    END CATCH

    -- Output di riepilogo
    SELECT
        @ErrorCode AS ErrorCode,
        @ErrorMessage AS ErrorMessage,
        @ReferencesCreated AS ReferencesCreated,
        @ReferencesUpdated AS ReferencesUpdated,
        @AttachmentsShared AS AttachmentsShared;
END
GO
