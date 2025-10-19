-- =============================================================================
-- FIX: Intercompany Summary per considerare fornitori temporanei
-- =============================================================================
-- Creato: 2025-01-16
-- Descrizione: Aggiorna GET_BOM_INTERCOMPANY_SUMMARY per considerare anche
--              i componenti temporanei con TempSupplierId e TempIntercompanyTargetId
-- Problema: L'endpoint /api/projectArticles/boms/:id/intercompany-summary
--           considera solo componenti già presenti nel gestionale, ignorando
--           i componenti temporanei con fornitori Intercompany impostati
-- Soluzione: Modificare le CTE per usare logica duale (gestionale OR temporaneo)
-- =============================================================================

USE [WebApp]
GO

-- Backup della versione corrente (opzionale - commentare se non necessario)
-- IF OBJECT_ID('dbo.MA_ProjectArticles_GetBOMDatas_BACKUP_20250116', 'P') IS NOT NULL
--     DROP PROCEDURE dbo.MA_ProjectArticles_GetBOMDatas_BACKUP_20250116;
-- GO
--
-- EXEC sp_rename 'dbo.MA_ProjectArticles_GetBOMDatas', 'MA_ProjectArticles_GetBOMDatas_BACKUP_20250116';
-- GO

-- Modifica la stored procedure esistente
-- NOTA: Questo script sostituisce SOLO la sezione GET_BOM_INTERCOMPANY_SUMMARY
--       La stored procedure completa deve essere ricreata o usare ALTER PROCEDURE

-- Per semplicità, fornisco solo le CTE modificate che devono essere integrate
-- nella stored procedure MA_ProjectArticles_GetBOMDatas

-- =============================================================================
-- SEZIONE DA SOSTITUIRE NELLA STORED PROCEDURE
-- =============================================================================
-- Trovare la sezione:
--   ELSE IF @Action = 'GET_BOM_INTERCOMPANY_SUMMARY'
-- E sostituire le CTE con le seguenti versioni aggiornate:
-- =============================================================================

/*

ELSE IF @Action = 'GET_BOM_INTERCOMPANY_SUMMARY'
BEGIN
    -- Recupera il MainRefBOMId per la logica duale
    DECLARE @SummaryMainRefBOMId BIGINT;
    SELECT @SummaryMainRefBOMId = ISNULL(MainRefBOMId, Id)
    FROM dbo.MA_ProjectArticles_BillOfMaterials
    WHERE Id = @Id AND CompanyId = @CompanyId;

    -- =============================================================================
    -- CTE MODIFICATA: PurchaseIntercompany
    -- =============================================================================
    -- Considera ENTRAMBE le fonti:
    -- 1. Componenti già nel gestionale (MA_Items + MA_ItemsGoodsData + MA_ItemSuppliers)
    -- 2. Componenti temporanei con TempSupplierId e TempIntercompanyTargetId
    -- =============================================================================

    WITH PurchaseIntercompany AS (
        SELECT
            comp.ComponentId,
            item.Item AS ComponentCode,
            item.Description AS ComponentDescription,
            -- Usa TempIntercompanyTargetId se presente, altrimenti cs.IntercompanyId dal gestionale
            COALESCE(item.TempIntercompanyTargetId, cs.IntercompanyId) AS TargetCompanyId,
            -- Nome azienda target: prima da TempIntercompanyTargetId, poi da gestionale
            COALESCE(tempTargetComp.Description, targetComp.Description) AS TargetCompanyName,
            'ACQUISTO' AS Type,
            -- Codice fornitore: prima TempSupplierId, poi dal gestionale
            COALESCE(item.TempSupplierId, cs.CustSupp) AS SupplierCode,
            -- Nome fornitore: prima da TempSupplierId, poi dal gestionale
            COALESCE(tempSupp.CompanyName, cs.CompanyName) AS SupplierName
        FROM dbo.MA_ProjectArticles_BOMComponents comp
        INNER JOIN dbo.MA_ProjectArticles_Items item
            ON comp.ComponentId = item.Id AND comp.CompanyId = item.CompanyId
        -- Join al gestionale (LEFT perché il componente potrebbe essere solo temporaneo)
        LEFT JOIN dbo.MA_Items maItem
            ON item.Item = maItem.Item AND item.CompanyId = maItem.CompanyId
        LEFT JOIN dbo.MA_ItemsGoodsData goodsData
            ON maItem.Item = goodsData.Item AND maItem.CompanyId = goodsData.CompanyId
        LEFT JOIN dbo.MA_ItemSuppliers itemSupp
            ON goodsData.Supplier = itemSupp.Supplier
            AND maItem.Item = itemSupp.Item
            AND maItem.CompanyId = itemSupp.CompanyId
        LEFT JOIN dbo.MA_CustSupp cs
            ON itemSupp.Supplier = cs.CustSupp
            AND itemSupp.CompanyId = cs.CompanyId
            AND cs.CustSuppType = 3211265
        LEFT JOIN dbo.AR_Companies targetComp
            ON cs.IntercompanyId = targetComp.CompanyId
        -- Join per dati fornitore temporaneo
        LEFT JOIN dbo.MA_CustSupp tempSupp
            ON item.TempSupplierId = tempSupp.CustSupp
            AND item.CompanyId = tempSupp.CompanyId
            AND tempSupp.CustSuppType = 3211265
        LEFT JOIN dbo.AR_Companies tempTargetComp
            ON item.TempIntercompanyTargetId = tempTargetComp.CompanyId
        WHERE comp.BOMId = @Id
          AND comp.CompanyId = @CompanyId
          -- Natura Acquisto (verificata sia su maItem che su item)
          AND (maItem.Nature = 22413314 OR (maItem.Nature IS NULL AND item.Nature = 22413314))
          -- ALMENO UNO dei due deve avere IntercompanyId (gestionale O temporaneo)
          AND (cs.IntercompanyId IS NOT NULL OR item.TempIntercompanyTargetId IS NOT NULL)
    ),

    -- =============================================================================
    -- CTE INVARIATA: SubcontractingIntercompany
    -- =============================================================================
    -- Questa rimane invariata perché il conto lavoro si basa sui cicli,
    -- che fanno riferimento a MA_WorkCenters che hanno già il fornitore nel gestionale
    -- =============================================================================

    SubcontractingIntercompany AS (
        SELECT DISTINCT
            comp.ComponentId,
            item.Item AS ComponentCode,
            item.Description AS ComponentDescription,
            cs.IntercompanyId AS TargetCompanyId,
            targetComp.Description AS TargetCompanyName,
            'CONTO_LAVORO' AS Type,
            cs.CustSupp AS SupplierCode,
            cs.CompanyName AS SupplierName
        FROM dbo.MA_ProjectArticles_BOMComponents comp
        INNER JOIN dbo.MA_ProjectArticles_Items item
            ON comp.ComponentId = item.Id AND comp.CompanyId = item.CompanyId
        LEFT JOIN (
            SELECT
                ItemId, Id AS BOMId, CompanyId,
                ROW_NUMBER() OVER(
                    PARTITION BY ItemId
                    ORDER BY CASE WHEN MainRefBOMId = @SummaryMainRefBOMId THEN 1 ELSE 2 END, Version DESC
                ) AS rn
            FROM dbo.MA_ProjectArticles_BillOfMaterials
            WHERE CompanyId = @CompanyId
              AND (MainRefBOMId = @SummaryMainRefBOMId OR Version = 1)
        ) compBOM
            ON compBOM.ItemId = comp.ComponentId
            AND compBOM.CompanyId = comp.CompanyId
            AND compBOM.rn = 1
        LEFT JOIN dbo.MA_ProjectArticles_BOMRouting routing
            ON routing.BOMId = compBOM.BOMId AND routing.CompanyId = comp.CompanyId
        LEFT JOIN dbo.MA_WorkCenters wc
            ON routing.WC = wc.WC AND routing.CompanyId = wc.CompanyId
        LEFT JOIN dbo.MA_CustSupp cs
            ON wc.Supplier = cs.CustSupp
            AND wc.CompanyId = cs.CompanyId
            AND cs.CustSuppType = 3211265
        LEFT JOIN dbo.AR_Companies targetComp
            ON cs.IntercompanyId = targetComp.CompanyId
        WHERE comp.BOMId = @Id
          AND comp.CompanyId = @CompanyId
          AND cs.IntercompanyId IS NOT NULL
          AND wc.Supplier IS NOT NULL
          AND wc.Supplier <> ''
    ),

    -- Union dei due tipi
    AllIntercompany AS (
        SELECT
            ComponentId,
            ComponentCode,
            ComponentDescription,
            TargetCompanyId,
            TargetCompanyName,
            Type,
            SupplierCode,
            SupplierName
        FROM PurchaseIntercompany
        UNION
        SELECT
            ComponentId,
            ComponentCode,
            ComponentDescription,
            TargetCompanyId,
            TargetCompanyName,
            Type,
            SupplierCode,
            SupplierName
        FROM SubcontractingIntercompany
    )
    -- Prima query: dettaglio componenti
    SELECT
        ComponentId,
        ComponentCode,
        ComponentDescription,
        TargetCompanyId,
        TargetCompanyName,
        Type,
        SupplierCode,
        SupplierName
    FROM AllIntercompany
    ORDER BY Type, ComponentCode;

    -- =============================================================================
    -- CTE MODIFICATA: PurchaseIntercompany2 (per il count summary)
    -- =============================================================================

    WITH PurchaseIntercompany2 AS (
        SELECT
            -- Usa TempIntercompanyTargetId se presente, altrimenti cs.IntercompanyId dal gestionale
            COALESCE(item.TempIntercompanyTargetId, cs.IntercompanyId) AS TargetCompanyId,
            -- Nome azienda target: prima da TempIntercompanyTargetId, poi da gestionale
            COALESCE(tempTargetComp.Description, targetComp.Description) AS TargetCompanyName,
            'ACQUISTO' AS Type
        FROM dbo.MA_ProjectArticles_BOMComponents comp
        INNER JOIN dbo.MA_ProjectArticles_Items item
            ON comp.ComponentId = item.Id AND comp.CompanyId = item.CompanyId
        -- Join al gestionale (LEFT perché il componente potrebbe essere solo temporaneo)
        LEFT JOIN dbo.MA_Items maItem
            ON item.Item = maItem.Item AND item.CompanyId = maItem.CompanyId
        LEFT JOIN dbo.MA_ItemsGoodsData goodsData
            ON maItem.Item = goodsData.Item AND maItem.CompanyId = goodsData.CompanyId
        LEFT JOIN dbo.MA_ItemSuppliers itemSupp
            ON goodsData.Supplier = itemSupp.Supplier
            AND maItem.Item = itemSupp.Item
            AND maItem.CompanyId = itemSupp.CompanyId
        LEFT JOIN dbo.MA_CustSupp cs
            ON itemSupp.Supplier = cs.CustSupp
            AND itemSupp.CompanyId = cs.CompanyId
            AND cs.CustSuppType = 3211265
        LEFT JOIN dbo.AR_Companies targetComp
            ON cs.IntercompanyId = targetComp.CompanyId
        -- Join per azienda target temporanea
        LEFT JOIN dbo.AR_Companies tempTargetComp
            ON item.TempIntercompanyTargetId = tempTargetComp.CompanyId
        WHERE comp.BOMId = @Id
          AND comp.CompanyId = @CompanyId
          -- Natura Acquisto (verificata sia su maItem che su item)
          AND (maItem.Nature = 22413314 OR (maItem.Nature IS NULL AND item.Nature = 22413314))
          -- ALMENO UNO dei due deve avere IntercompanyId (gestionale O temporaneo)
          AND (cs.IntercompanyId IS NOT NULL OR item.TempIntercompanyTargetId IS NOT NULL)
    ),

    SubcontractingIntercompany2 AS (
        SELECT DISTINCT
            cs.IntercompanyId AS TargetCompanyId,
            targetComp.Description AS TargetCompanyName,
            'CONTO_LAVORO' AS Type
        FROM dbo.MA_ProjectArticles_BOMComponents comp
        INNER JOIN dbo.MA_ProjectArticles_Items item
            ON comp.ComponentId = item.Id AND comp.CompanyId = item.CompanyId
        LEFT JOIN (
            SELECT
                ItemId, Id AS BOMId, CompanyId,
                ROW_NUMBER() OVER(
                    PARTITION BY ItemId
                    ORDER BY CASE WHEN MainRefBOMId = @SummaryMainRefBOMId THEN 1 ELSE 2 END, Version DESC
                ) AS rn
            FROM dbo.MA_ProjectArticles_BillOfMaterials
            WHERE CompanyId = @CompanyId
              AND (MainRefBOMId = @SummaryMainRefBOMId OR Version = 1)
        ) compBOM
            ON compBOM.ItemId = comp.ComponentId
            AND compBOM.CompanyId = comp.CompanyId
            AND compBOM.rn = 1
        LEFT JOIN dbo.MA_ProjectArticles_BOMRouting routing
            ON routing.BOMId = compBOM.BOMId AND routing.CompanyId = comp.CompanyId
        LEFT JOIN dbo.MA_WorkCenters wc
            ON routing.WC = wc.WC AND routing.CompanyId = wc.CompanyId
        LEFT JOIN dbo.MA_CustSupp cs
            ON wc.Supplier = cs.CustSupp
            AND wc.CompanyId = cs.CompanyId
            AND cs.CustSuppType = 3211265
        LEFT JOIN dbo.AR_Companies targetComp
            ON cs.IntercompanyId = targetComp.CompanyId
        WHERE comp.BOMId = @Id
          AND comp.CompanyId = @CompanyId
          AND cs.IntercompanyId IS NOT NULL
          AND wc.Supplier IS NOT NULL
          AND wc.Supplier <> ''
    )
    SELECT
        Type,
        TargetCompanyId,
        TargetCompanyName,
        COUNT(*) AS ComponentCount
    FROM (
        SELECT Type, TargetCompanyId, TargetCompanyName FROM PurchaseIntercompany2
        UNION ALL
        SELECT Type, TargetCompanyId, TargetCompanyName FROM SubcontractingIntercompany2
    ) combined
    GROUP BY Type, TargetCompanyId, TargetCompanyName
    ORDER BY Type, TargetCompanyName;
END

*/

-- =============================================================================
-- ISTRUZIONI PER L'APPLICAZIONE
-- =============================================================================
-- 1. Aprire la stored procedure MA_ProjectArticles_GetBOMDatas in SSMS
-- 2. Trovare la sezione ELSE IF @Action = 'GET_BOM_INTERCOMPANY_SUMMARY'
-- 3. Sostituire le CTE PurchaseIntercompany e PurchaseIntercompany2
--    con le versioni modificate sopra
-- 4. Eseguire ALTER PROCEDURE per salvare le modifiche
-- =============================================================================

PRINT 'Script di fix per Intercompany Summary preparato.';
PRINT 'ATTENZIONE: Questo script contiene solo le istruzioni e le CTE modificate.';
PRINT 'È necessario applicare manualmente le modifiche alla stored procedure MA_ProjectArticles_GetBOMDatas.';
GO
