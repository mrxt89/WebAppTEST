-- =============================================
-- Author:      Claude Code
-- Create date: 2025-10-13
-- Description: Identifica tutti i componenti intercompany di una BOM
--              Distingue tra componenti di acquisto e componenti di conto lavoro
-- Version:     1.0
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[MA_ProjectArticles_GetIntercompanyComponents]
    @BOMId BIGINT,                      -- ID della distinta base
    @CompanyId INT,                     -- ID dell'azienda
    @ItemId BIGINT = NULL,              -- ID articolo (opzionale, usato se BOMId non specificato)
    @IncludeAttachments BIT = 0,        -- Flag per includere gli allegati condivisi
    @ErrorCode INT OUTPUT,              -- Codice di errore (0 = successo)
    @ErrorMessage NVARCHAR(4000) OUTPUT -- Messaggio di errore
AS
BEGIN
    SET NOCOUNT ON;

    -- Inizializzazione variabili di output
    SET @ErrorCode = 0;
    SET @ErrorMessage = N'';

    BEGIN TRY
        -- Validazione parametri
        IF @CompanyId IS NULL OR @CompanyId <= 0
        BEGIN
            SET @ErrorCode = 1;
            SET @ErrorMessage = N'CompanyId non valido.';
            RETURN;
        END

        -- Se non è stato fornito BOMId, cerca l'ultima versione per ItemId
        IF @BOMId IS NULL AND @ItemId IS NOT NULL
        BEGIN
            SELECT TOP 1 @BOMId = Id
            FROM dbo.MA_ProjectArticles_BillOfMaterials
            WHERE CompanyId = @CompanyId
              AND ItemId = @ItemId
            ORDER BY Version DESC;
        END

        IF @BOMId IS NULL
        BEGIN
            SET @ErrorCode = 2;
            SET @ErrorMessage = N'BOMId non specificato o ItemId non trovato.';
            RETURN;
        END

        -- Verifica che la BOM esista
        IF NOT EXISTS (SELECT 1 FROM dbo.MA_ProjectArticles_BillOfMaterials WHERE Id = @BOMId AND CompanyId = @CompanyId)
        BEGIN
            SET @ErrorCode = 3;
            SET @ErrorMessage = N'Distinta base non trovata.';
            RETURN;
        END

        -- Recupera il MainRefBOMId della BOM per la logica duale
        DECLARE @MainRefBOMId BIGINT;
        SELECT @MainRefBOMId = ISNULL(MainRefBOMId, Id)
        FROM dbo.MA_ProjectArticles_BillOfMaterials
        WHERE Id = @BOMId AND CompanyId = @CompanyId;

        -- =============================================
        -- PARTE 1: COMPONENTI DI ACQUISTO INTERCOMPANY
        -- =============================================
        -- Identifica i componenti che sono di natura acquisto (22413314)
        -- e che hanno come fornitore preferenziale un fornitore intercompany

        WITH PurchaseComponents AS (
            SELECT
                comp.ComponentId,
                comp.Line,
                comp.Quantity,
                comp.UoM,
                comp.UnitCost,
                comp.TotalCost,
                item.Item AS ComponentCode,
                item.Description AS ComponentDescription,
                item.Nature AS ComponentNature,
                itemSupp.Supplier AS PreferredSupplier,
                cs.CustSupp AS SupplierCode,
                cs.CompanyName AS SupplierName,
                cs.IntercompanyId AS TargetCompanyId,
                targetComp.Description AS TargetCompanyName,
                'ACQUISTO' AS IntercompanyType,
                itemSupp.SupplierCode AS SupplierItemCode,
                itemSupp.SupplierDescription AS SupplierItemDescription
            FROM dbo.MA_ProjectArticles_BOMComponents comp
            INNER JOIN dbo.MA_ProjectArticles_Items item
                ON comp.ComponentId = item.Id
                AND comp.CompanyId = item.CompanyId
            -- Join con MA_Items per verificare la natura acquisto
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
            WHERE
                comp.BOMId = @BOMId
                AND comp.CompanyId = @CompanyId
                AND maItem.Nature = 22413314  -- Natura = Acquisto
                AND cs.IntercompanyId IS NOT NULL  -- È un fornitore intercompany
        ),

        -- =============================================
        -- PARTE 2: COMPONENTI DI CONTO LAVORO INTERCOMPANY
        -- =============================================
        -- Identifica i componenti che hanno fasi di ciclo con centro di lavoro
        -- associato a un fornitore intercompany

        SubcontractingComponents AS (
            SELECT DISTINCT
                comp.ComponentId,
                comp.Line,
                comp.Quantity,
                comp.UoM,
                comp.UnitCost,
                comp.TotalCost,
                item.Item AS ComponentCode,
                item.Description AS ComponentDescription,
                item.Nature AS ComponentNature,
                wc.Supplier AS RoutingSupplier,
                cs.CustSupp AS SupplierCode,
                cs.CompanyName AS SupplierName,
                cs.IntercompanyId AS TargetCompanyId,
                targetComp.Description AS TargetCompanyName,
                'CONTO_LAVORO' AS IntercompanyType,
                routing.Operation AS OperationCode,
                routing.WC AS WorkCenter,
                wc.Description AS WorkCenterDescription
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
            -- Join con il routing della BOM del componente
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
            WHERE
                comp.BOMId = @BOMId
                AND comp.CompanyId = @CompanyId
                AND cs.IntercompanyId IS NOT NULL  -- È un fornitore intercompany
                AND wc.Supplier IS NOT NULL
                AND wc.Supplier <> ''
        ),

        -- =============================================
        -- UNIONE DEI DUE TIPI
        -- =============================================
        AllIntercompanyComponents AS (
            SELECT
                ComponentId,
                Line,
                Quantity,
                UoM,
                UnitCost,
                TotalCost,
                ComponentCode,
                ComponentDescription,
                ComponentNature,
                SupplierCode,
                SupplierName,
                TargetCompanyId,
                TargetCompanyName,
                IntercompanyType,
                PreferredSupplier AS SupplierReference,
                SupplierItemCode AS AdditionalInfo1,
                SupplierItemDescription AS AdditionalInfo2,
                NULL AS AdditionalInfo3,
                NULL AS AdditionalInfo4
            FROM PurchaseComponents

            UNION ALL

            SELECT
                ComponentId,
                Line,
                Quantity,
                UoM,
                UnitCost,
                TotalCost,
                ComponentCode,
                ComponentDescription,
                ComponentNature,
                SupplierCode,
                SupplierName,
                TargetCompanyId,
                TargetCompanyName,
                IntercompanyType,
                RoutingSupplier AS SupplierReference,
                OperationCode AS AdditionalInfo1,
                WorkCenter AS AdditionalInfo2,
                WorkCenterDescription AS AdditionalInfo3,
                NULL AS AdditionalInfo4
            FROM SubcontractingComponents
        )

        -- =============================================
        -- OUTPUT PRINCIPALE
        -- =============================================
        SELECT
            @BOMId AS BOMId,
            @CompanyId AS CompanyId,
            ic.ComponentId,
            ic.Line,
            ic.Quantity,
            ic.UoM,
            ic.UnitCost,
            ic.TotalCost,
            ic.ComponentCode,
            ic.ComponentDescription,
            ic.ComponentNature,
            CASE
                WHEN ic.ComponentNature = 22413314 THEN 'Acquisto'
                WHEN ic.ComponentNature = 22413312 THEN 'Semilavorato'
                WHEN ic.ComponentNature = 22413313 THEN 'Prodotto Finito'
                ELSE 'Altro'
            END AS NatureDescription,
            ic.SupplierCode,
            ic.SupplierName,
            ic.TargetCompanyId,
            ic.TargetCompanyName,
            ic.IntercompanyType,
            ic.SupplierReference,
            ic.AdditionalInfo1,
            ic.AdditionalInfo2,
            ic.AdditionalInfo3,
            -- Verifica se esiste già una relazione
            ref.ReferenceID AS ExistingReferenceId,
            ref.Status AS ReferenceStatus,
            ref.TargetProjectItemId AS LinkedTargetItemId,
            -- Verifica allegati condivisi (solo se richiesto)
            CASE
                WHEN @IncludeAttachments = 1 THEN (
                    SELECT COUNT(*)
                    FROM dbo.MA_ItemAttachments att
                    JOIN dbo.MA_ItemAttachmentSharing share
                        ON att.AttachmentID = share.AttachmentID
                    WHERE att.ItemCode = ic.ComponentCode
                        AND att.CompanyId = @CompanyId
                        AND share.TargetCompanyId = ic.TargetCompanyId
                )
                ELSE NULL
            END AS SharedAttachmentsCount
        FROM AllIntercompanyComponents ic
        LEFT JOIN dbo.MA_ProjectArticles_References ref
            ON ref.SourceProjectItemId = ic.ComponentId
            AND ref.SourceCompanyId = @CompanyId
            AND ref.TargetCompanyId = ic.TargetCompanyId
        ORDER BY ic.Line, ic.IntercompanyType;

        -- =============================================
        -- OUTPUT ALLEGATI (solo se richiesto)
        -- =============================================
        IF @IncludeAttachments = 1
        BEGIN
            SELECT
                att.AttachmentID,
                att.Item AS ComponentCode,
                att.CompanyId,
                att.FileName,
                att.FilePath,
                att.FileSize,
                att.FileType,
                att.UploadedAt,
                share.TargetCompanyId,
                share.SharedAt,
                share.AccessLevel,
                targetComp.CompanyName AS TargetCompanyName
            FROM AllIntercompanyComponents ic
            INNER JOIN dbo.MA_ItemAttachments att
                ON att.Item = ic.ComponentCode
                AND att.CompanyId = @CompanyId
            INNER JOIN dbo.MA_ItemAttachmentSharing share
                ON att.AttachmentID = share.AttachmentID
                AND share.TargetCompanyId = ic.TargetCompanyId
            LEFT JOIN dbo.AR_Companies targetComp
                ON share.TargetCompanyId = targetComp.CompanyId
            ORDER BY att.Item, share.TargetCompanyId;
        END

    END TRY
    BEGIN CATCH
        SET @ErrorCode = ERROR_NUMBER();
        SET @ErrorMessage = ERROR_MESSAGE();

        -- Log dell'errore (opzionale)
        -- INSERT INTO ErrorLog (ErrorCode, ErrorMessage, ProcedureName, ErrorDate)
        -- VALUES (@ErrorCode, @ErrorMessage, 'MA_ProjectArticles_GetIntercompanyComponents', GETDATE());

    END CATCH
END
GO
