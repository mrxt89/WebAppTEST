-- =============================================================================
-- TEST: Chiamata diretta a MA_ProjectArticles_GetBOMDatas
-- =============================================================================
-- Simula la chiamata API:
-- GET https://localhost:3443/api/projectArticles/boms/18822/intercompany-summary
-- =============================================================================

USE [WebApp]
GO

-- Parametri della chiamata
DECLARE @BOMId BIGINT = 18822;
DECLARE @CompanyId INT = 1;  -- MODIFICA SE NECESSARIO con il tuo CompanyId
DECLARE @Action NVARCHAR(100) = 'GET_BOM_INTERCOMPANY_SUMMARY';

-- Parametri di output
DECLARE @ErrorCode INT;
DECLARE @ErrorMessage NVARCHAR(4000);

-- Esegui la stored procedure
EXEC dbo.MA_ProjectArticles_GetBOMDatas
    @Action = @Action,
    @CompanyId = @CompanyId,
    @Id = @BOMId,
    @ErrorCode = @ErrorCode OUTPUT,
    @ErrorMessage = @ErrorMessage OUTPUT;

-- Mostra gli errori (se presenti)
IF @ErrorCode <> 0
BEGIN
    PRINT 'ErrorCode: ' + CAST(@ErrorCode AS NVARCHAR(10));
    PRINT 'ErrorMessage: ' + @ErrorMessage;
END
ELSE
BEGIN
    PRINT 'Success! ErrorCode = 0';
    PRINT '';
    PRINT '=== RECORDSET 1: Dettaglio Componenti Intercompany ===';
    PRINT '(Dovrebbe essere già visualizzato sopra nella griglia dei risultati)';
    PRINT '';
    PRINT '=== RECORDSET 2: Summary per Tipo e Company ===';
    PRINT '(Dovrebbe essere già visualizzato sopra nella griglia dei risultati)';
END

GO

-- =============================================================================
-- QUERY DI VERIFICA: Controlla i componenti temporanei con fornitore Intercompany
-- =============================================================================

PRINT '';
PRINT '=============================================================================';
PRINT 'QUERY DI VERIFICA: Componenti temporanei con TempSupplierId impostato';
PRINT '=============================================================================';
PRINT '';

DECLARE @BOMId2 BIGINT = 18822;
DECLARE @CompanyId2 INT = 1;  -- MODIFICA SE NECESSARIO

SELECT
    comp.Line,
    item.Item AS ComponentCode,
    item.Description AS ComponentDescription,
    item.Nature,
    CASE
        WHEN item.Nature = 22413314 THEN 'Acquisto'
        WHEN item.Nature = 22413312 THEN 'Semilavorato'
        WHEN item.Nature = 22413313 THEN 'Prodotto Finito'
        ELSE 'Altro'
    END AS NatureDescription,
    item.stato_erp,
    CASE
        WHEN item.stato_erp = 1 THEN 'GESTIONALE'
        ELSE 'TEMPORANEO'
    END AS DataSource,

    -- Dati fornitore temporaneo
    item.TempSupplierId,
    tempSupp.CompanyName AS TempSupplierName,
    item.TempIntercompanyTargetId,
    tempTarget.Description AS TempIntercompanyTargetName,

    -- Dati fornitore dal gestionale
    goodsData.Supplier AS GestionaleSupplier,
    cs.CompanyName AS GestionaleSupplierName,
    cs.IntercompanyId AS GestionaleIntercompanyId,
    erpTarget.Description AS GestionaleIntercompanyTargetName,

    -- Funzione fn_GetComponentSupplier per vedere cosa restituisce
    supplier.SupplierId AS SelectedSupplier,
    supplier.SupplierName AS SelectedSupplierName,
    supplier.IntercompanyTargetId AS SelectedIntercompanyTargetId,
    supplier.IntercompanyTargetName AS SelectedIntercompanyTargetName,
    supplier.DataSource AS SelectedDataSource

FROM dbo.MA_ProjectArticles_BOMComponents comp
INNER JOIN dbo.MA_ProjectArticles_Items item
    ON comp.ComponentId = item.Id AND comp.CompanyId = item.CompanyId

-- Usa la funzione per ottenere il fornitore (gestionale o temporaneo)
CROSS APPLY dbo.fn_GetComponentSupplier(item.Id, item.CompanyId) supplier

-- Dati fornitore temporaneo
LEFT JOIN dbo.MA_CustSupp tempSupp
    ON item.TempSupplierId = tempSupp.CustSupp
    AND item.CompanyId = tempSupp.CompanyId
    AND tempSupp.CustSuppType = 3211265
LEFT JOIN dbo.AR_Companies tempTarget
    ON item.TempIntercompanyTargetId = tempTarget.CompanyId

-- Dati fornitore dal gestionale
LEFT JOIN dbo.MA_Items maItem
    ON item.Item = maItem.Item AND item.CompanyId = maItem.CompanyId
LEFT JOIN dbo.MA_ItemsGoodsData goodsData
    ON maItem.Item = goodsData.Item AND maItem.CompanyId = goodsData.CompanyId
LEFT JOIN dbo.MA_CustSupp cs
    ON goodsData.Supplier = cs.CustSupp
    AND goodsData.CompanyId = cs.CompanyId
    AND cs.CustSuppType = 3211265
LEFT JOIN dbo.AR_Companies erpTarget
    ON cs.IntercompanyId = erpTarget.CompanyId

WHERE comp.BOMId = @BOMId2
  AND comp.CompanyId = @CompanyId2
  AND item.Nature = 22413314  -- Solo Acquisti

ORDER BY comp.Line;

GO

-- =============================================================================
-- NOTES
-- =============================================================================
-- 1. Verifica che @CompanyId sia corretto per il tuo caso (solitamente 1)
-- 2. Il primo EXEC mostra i recordset che l'API restituisce al frontend
-- 3. La seconda query mostra tutti i componenti di acquisto con i dettagli
--    dei fornitori da entrambe le fonti (gestionale e temporaneo)
-- 4. Se vedi componenti con TempSupplierId impostato ma non compaiono
--    nel primo recordset, significa che la stored procedure deve essere
--    modificata per usare la funzione fn_GetComponentSupplier
-- =============================================================================
