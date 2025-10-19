-- =============================================================================
-- FIX DEFINITIVO: Modifica GET_BOM_INTERCOMPANY_SUMMARY
-- =============================================================================
-- Creato: 2025-01-16
-- Descrizione: Aggiorna la sezione GET_BOM_INTERCOMPANY_SUMMARY della stored
--              procedure MA_ProjectArticles_GetBOMDatas per usare la funzione
--              fn_GetComponentSupplier e considerare anche i fornitori temporanei
-- =============================================================================

USE [WebApp]
GO

-- =============================================================================
-- ISTRUZIONI PER L'APPLICAZIONE MANUALE
-- =============================================================================
-- 1. Apri SQL Server Management Studio
-- 2. Apri la stored procedure MA_ProjectArticles_GetBOMDatas in modalità modifica
-- 3. Trova la sezione: ELSE IF @Action = 'GET_BOM_INTERCOMPANY_SUMMARY'
-- 4. Sostituisci ENTRAMBE le CTE PurchaseIntercompany e PurchaseIntercompany2
--    con le versioni qui sotto
-- 5. Salva ed esegui ALTER PROCEDURE
-- =============================================================================

/*

-- =============================================================================
-- VERSIONE AGGIORNATA DELLA SEZIONE GET_BOM_INTERCOMPANY_SUMMARY
-- =============================================================================
-- Sostituire da riga ~3273 a riga ~3472 nel file contestoDataBase.sql
-- =============================================================================

ELSE IF @Action = 'GET_BOM_INTERCOMPANY_SUMMARY'
BEGIN
    -- Recupera il MainRefBOMId per la logica duale
    DECLARE @SummaryMainRefBOMId BIGINT;
    SELECT @SummaryMainRefBOMId = ISNULL(MainRefBOMId, Id)
    FROM dbo.MA_ProjectArticles_BillOfMaterials
    WHERE Id = @Id AND CompanyId = @CompanyId;

    -- =============================================================================
    -- CTE AGGIORNATA: PurchaseIntercompany
    -- Usa fn_GetComponentSupplier per logica duale (gestionale OR temporaneo)
    -- =============================================================================
    WITH PurchaseIntercompany AS (
        SELECT
            comp.ComponentId,
            item.Item AS ComponentCode,
            item.Description AS ComponentDescription,
            supplier.IntercompanyTargetId AS TargetCompanyId,
            targetComp.Description AS TargetCompanyName,
            'ACQUISTO' AS Type,
            supplier.SupplierId AS SupplierCode,
            cs.CompanyName AS SupplierName
        FROM dbo.MA_ProjectArticles_BOMComponents comp
        INNER JOIN dbo.MA_ProjectArticles_Items item
            ON comp.ComponentId = item.Id AND comp.CompanyId = item.CompanyId
        -- USA LA FUNZIONE per ottenere il fornitore (gestionale o temporaneo)
        CROSS APPLY dbo.fn_GetComponentSupplier(item.Id, item.CompanyId) supplier
        -- Join per ottenere il nome dell'azienda target
        LEFT JOIN dbo.AR_Companies targetComp
            ON supplier.IntercompanyTargetId = targetComp.CompanyId
        -- Join per ottenere il nome del fornitore
        LEFT JOIN dbo.MA_CustSupp cs
            ON supplier.SupplierId = cs.CustSupp
            AND item.CompanyId = cs.CompanyId
            AND cs.CustSuppType = 3211265
        WHERE comp.BOMId = @Id
          AND comp.CompanyId = @CompanyId
          AND item.Nature = 22413314  -- Solo Acquisti
          AND supplier.IntercompanyTargetId IS NOT NULL  -- Solo Intercompany
    ),

    -- =============================================================================
    -- CTE INVARIATA: SubcontractingIntercompany
    -- (Rimane come prima perché il conto lavoro usa i cicli dal gestionale)
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
    -- CTE AGGIORNATA: PurchaseIntercompany2 (per il count summary)
    -- Usa fn_GetComponentSupplier per logica duale
    -- =============================================================================
    WITH PurchaseIntercompany2 AS (
        SELECT
            supplier.IntercompanyTargetId AS TargetCompanyId,
            targetComp.Description AS TargetCompanyName,
            'ACQUISTO' AS Type
        FROM dbo.MA_ProjectArticles_BOMComponents comp
        INNER JOIN dbo.MA_ProjectArticles_Items item
            ON comp.ComponentId = item.Id AND comp.CompanyId = item.CompanyId
        -- USA LA FUNZIONE per ottenere il fornitore (gestionale o temporaneo)
        CROSS APPLY dbo.fn_GetComponentSupplier(item.Id, item.CompanyId) supplier
        -- Join per ottenere il nome dell'azienda target
        LEFT JOIN dbo.AR_Companies targetComp
            ON supplier.IntercompanyTargetId = targetComp.CompanyId
        WHERE comp.BOMId = @Id
          AND comp.CompanyId = @CompanyId
          AND item.Nature = 22413314  -- Solo Acquisti
          AND supplier.IntercompanyTargetId IS NOT NULL  -- Solo Intercompany
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
-- RIEPILOGO DELLE MODIFICHE
-- =============================================================================
-- 1. PurchaseIntercompany: Sostituiti tutti i LEFT JOIN al gestionale con
--    CROSS APPLY dbo.fn_GetComponentSupplier(item.Id, item.CompanyId)
--
-- 2. La funzione restituisce automaticamente:
--    - SupplierId (da gestionale o TempSupplierId)
--    - IntercompanyTargetId (da gestionale o TempIntercompanyTargetId)
--    - SupplierName
--    - IntercompanyTargetName
--    - DataSource ('GESTIONALE' o 'TEMPORANEO')
--
-- 3. Stessa logica applicata a PurchaseIntercompany2 per il count summary
--
-- 4. SubcontractingIntercompany rimane invariata (usa i cicli dal gestionale)
-- =============================================================================

PRINT '=============================================================================';
PRINT 'Script preparato per il fix di GET_BOM_INTERCOMPANY_SUMMARY';
PRINT '=============================================================================';
PRINT '';
PRINT 'PASSI DA SEGUIRE:';
PRINT '1. Apri SQL Server Management Studio';
PRINT '2. Connettiti al database WebApp';
PRINT '3. Trova e apri la stored procedure MA_ProjectArticles_GetBOMDatas';
PRINT '4. Cerca la sezione: ELSE IF @Action = ''GET_BOM_INTERCOMPANY_SUMMARY''';
PRINT '5. Sostituisci le CTE PurchaseIntercompany e PurchaseIntercompany2';
PRINT '   con le versioni commentate qui sopra';
PRINT '6. Esegui ALTER PROCEDURE per salvare';
PRINT '7. Testa con lo script TEST_IntercompanySummary.sql';
PRINT '';
PRINT 'BENEFICI:';
PRINT '- I componenti temporanei con TempSupplierId vengono considerati';
PRINT '- Logica centralizzata in fn_GetComponentSupplier';
PRINT '- Gestionale ha sempre priorità sui dati temporanei';
PRINT '- Il pannello Intercompany mostra correttamente tutti i componenti';
PRINT '=============================================================================';
GO
