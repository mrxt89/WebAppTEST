-- =============================================================================
-- TEST: Chiamata diretta a MA_ProjectArticles_SyncIntercompanySharing
-- =============================================================================
-- Simula la chiamata API:
-- POST https://localhost:3443/api/projectArticles/boms/18822/sync-intercompany
-- Body: {syncAttachments: true, autoCreateReferences: true}
-- =============================================================================

USE [WebApp]
GO

-- Parametri della chiamata
DECLARE @BOMId BIGINT = 18822;
DECLARE @CompanyId INT = 1;  -- MODIFICA SE NECESSARIO con il tuo CompanyId
DECLARE @UserId INT = 1;     -- MODIFICA SE NECESSARIO con il tuo UserId
DECLARE @SyncAttachments BIT = 1;
DECLARE @AutoCreateReferences BIT = 1;

-- Parametri di output
DECLARE @ErrorCode INT;
DECLARE @ErrorMessage NVARCHAR(4000);
DECLARE @ReferencesCreated INT;
DECLARE @ReferencesUpdated INT;
DECLARE @AttachmentsShared INT;

PRINT '=============================================================================';
PRINT 'TEST: MA_ProjectArticles_SyncIntercompanySharing';
PRINT '=============================================================================';
PRINT 'BOMId: ' + CAST(@BOMId AS NVARCHAR(10));
PRINT 'CompanyId: ' + CAST(@CompanyId AS NVARCHAR(10));
PRINT 'UserId: ' + CAST(@UserId AS NVARCHAR(10));
PRINT 'SyncAttachments: ' + CAST(@SyncAttachments AS NVARCHAR(1));
PRINT 'AutoCreateReferences: ' + CAST(@AutoCreateReferences AS NVARCHAR(1));
PRINT '';

-- Esegui la stored procedure
EXEC dbo.MA_ProjectArticles_SyncIntercompanySharing
    @BOMId = @BOMId,
    @CompanyId = @CompanyId,
    @UserId = @UserId,
    @SyncAttachments = @SyncAttachments,
    @AutoCreateReferences = @AutoCreateReferences,
    @ErrorCode = @ErrorCode OUTPUT,
    @ErrorMessage = @ErrorMessage OUTPUT,
    @ReferencesCreated = @ReferencesCreated OUTPUT,
    @ReferencesUpdated = @ReferencesUpdated OUTPUT,
    @AttachmentsShared = @AttachmentsShared OUTPUT;

-- Mostra i risultati
PRINT '';
PRINT '=============================================================================';
PRINT 'RISULTATI:';
PRINT '=============================================================================';
PRINT 'ErrorCode: ' + CAST(@ErrorCode AS NVARCHAR(10));
PRINT 'ErrorMessage: ' + ISNULL(@ErrorMessage, '(nessun errore)');
PRINT 'ReferencesCreated: ' + CAST(ISNULL(@ReferencesCreated, 0) AS NVARCHAR(10));
PRINT 'ReferencesUpdated: ' + CAST(ISNULL(@ReferencesUpdated, 0) AS NVARCHAR(10));
PRINT 'AttachmentsShared: ' + CAST(ISNULL(@AttachmentsShared, 0) AS NVARCHAR(10));
PRINT '';

IF @ErrorCode <> 0
BEGIN
    PRINT '*** ERRORE RILEVATO ***';
END
ELSE IF @ReferencesCreated = 0 AND @ReferencesUpdated = 0
BEGIN
    PRINT '*** ATTENZIONE: Nessuna reference creata o aggiornata ***';
    PRINT 'Verifica che ci siano componenti Intercompany nella distinta';
END
ELSE
BEGIN
    PRINT '*** SINCRONIZZAZIONE COMPLETATA CON SUCCESSO ***';
END

GO

-- =============================================================================
-- QUERY DI DEBUG: Verifica componenti Intercompany PRIMA della sync
-- =============================================================================

PRINT '';
PRINT '=============================================================================';
PRINT 'DEBUG: Componenti Intercompany rilevati per questa BOM';
PRINT '=============================================================================';
PRINT '';

DECLARE @DebugBOMId BIGINT = 18822;
DECLARE @DebugCompanyId INT = 1;

-- Questa query dovrebbe mostrare gli stessi dati che la SP usa per creare le references
SELECT
    comp.Line,
    item.Id AS ComponentId,
    item.Item AS ComponentCode,
    item.Description AS ComponentDescription,
    item.Nature,
    CASE
        WHEN item.Nature = 22413314 THEN 'Acquisto'
        WHEN item.Nature = 22413312 THEN 'Semilavorato'
        WHEN item.Nature = 22413313 THEN 'Prodotto Finito'
        ELSE 'Altro'
    END AS NatureDescription,

    -- Dati fornitore usando la funzione
    supplier.SupplierId AS SupplierCode,
    supplier.SupplierName,
    supplier.IntercompanyTargetId AS TargetCompanyId,
    supplier.IntercompanyTargetName AS TargetCompanyName,
    supplier.DataSource,

    -- Verifica se esiste già una reference
    ref.Id AS ExistingReferenceId,
    ref.Status AS ExistingReferenceStatus

FROM dbo.MA_ProjectArticles_BOMComponents comp
INNER JOIN dbo.MA_ProjectArticles_Items item
    ON comp.ComponentId = item.Id AND comp.CompanyId = item.CompanyId

-- Usa la funzione per ottenere il fornitore
CROSS APPLY dbo.fn_GetComponentSupplier(item.Id, item.CompanyId) supplier

-- Verifica se esiste già una reference per questo componente
LEFT JOIN dbo.MA_ProjectArticles_IntercompanyReferences ref
    ON ref.SourceProjectItemId = item.Id
    AND ref.SourceCompanyId = item.CompanyId
    AND ref.TargetCompanyId = supplier.IntercompanyTargetId

WHERE comp.BOMId = @DebugBOMId
  AND comp.CompanyId = @DebugCompanyId
  AND item.Nature = 22413314  -- Solo Acquisti
  AND supplier.IntercompanyTargetId IS NOT NULL  -- Solo Intercompany

ORDER BY comp.Line;

PRINT '';
PRINT 'Se questa query non restituisce righe, significa che:';
PRINT '1. Non ci sono componenti di acquisto nella BOM';
PRINT '2. I componenti non hanno TempSupplierId o fornitore nel gestionale';
PRINT '3. Il fornitore non ha IntercompanyId impostato';
PRINT '';

GO

-- =============================================================================
-- QUERY DI DEBUG: Verifica dati conto lavoro
-- =============================================================================

PRINT '';
PRINT '=============================================================================';
PRINT 'DEBUG: Componenti con Conto Lavoro Intercompany';
PRINT '=============================================================================';
PRINT '';

DECLARE @DebugBOMId2 BIGINT = 18822;
DECLARE @DebugCompanyId2 INT = 1;

-- Recupera MainRefBOMId
DECLARE @MainRefBOMId BIGINT;
SELECT @MainRefBOMId = ISNULL(MainRefBOMId, Id)
FROM dbo.MA_ProjectArticles_BillOfMaterials
WHERE Id = @DebugBOMId2 AND CompanyId = @DebugCompanyId2;

SELECT
    comp.Line,
    item.Id AS ComponentId,
    item.Item AS ComponentCode,
    item.Description AS ComponentDescription,
    compBOM.BOMId AS ComponentBOMId,
    routing.RtgStep,
    routing.WC AS WorkCenter,
    wc.Description AS WorkCenterDescription,
    wc.Supplier AS WCSupplier,
    cs.CompanyName AS SupplierName,
    cs.IntercompanyId AS TargetCompanyId,
    targetComp.Description AS TargetCompanyName

FROM dbo.MA_ProjectArticles_BOMComponents comp
INNER JOIN dbo.MA_ProjectArticles_Items item
    ON comp.ComponentId = item.Id AND comp.CompanyId = item.CompanyId

-- Trova la BOM del componente
LEFT JOIN (
    SELECT
        ItemId, Id AS BOMId, CompanyId,
        ROW_NUMBER() OVER(
            PARTITION BY ItemId
            ORDER BY CASE WHEN MainRefBOMId = @MainRefBOMId THEN 1 ELSE 2 END, Version DESC
        ) AS rn
    FROM dbo.MA_ProjectArticles_BillOfMaterials
    WHERE CompanyId = @DebugCompanyId2
      AND (MainRefBOMId = @MainRefBOMId OR Version = 1)
) compBOM
    ON compBOM.ItemId = comp.ComponentId
    AND compBOM.CompanyId = comp.CompanyId
    AND compBOM.rn = 1

-- Cicli del componente
LEFT JOIN dbo.MA_ProjectArticles_BOMRouting routing
    ON routing.BOMId = compBOM.BOMId AND routing.CompanyId = comp.CompanyId

-- Centro di lavoro
LEFT JOIN dbo.MA_WorkCenters wc
    ON routing.WC = wc.WC AND routing.CompanyId = wc.CompanyId

-- Fornitore del centro di lavoro
LEFT JOIN dbo.MA_CustSupp cs
    ON wc.Supplier = cs.CustSupp
    AND wc.CompanyId = cs.CompanyId
    AND cs.CustSuppType = 3211265

-- Azienda target intercompany
LEFT JOIN dbo.AR_Companies targetComp
    ON cs.IntercompanyId = targetComp.CompanyId

WHERE comp.BOMId = @DebugBOMId2
  AND comp.CompanyId = @DebugCompanyId2
  AND cs.IntercompanyId IS NOT NULL
  AND wc.Supplier IS NOT NULL
  AND wc.Supplier <> ''

ORDER BY comp.Line, routing.RtgStep;

PRINT '';
PRINT 'Se questa query non restituisce righe, significa che:';
PRINT '1. I componenti non hanno cicli di lavorazione';
PRINT '2. I centri di lavoro non hanno fornitore impostato';
PRINT '3. Il fornitore del centro di lavoro non ha IntercompanyId';
PRINT '';

GO

-- =============================================================================
-- QUERY: Verifica references già esistenti
-- =============================================================================

PRINT '';
PRINT '=============================================================================';
PRINT 'DEBUG: References Intercompany già esistenti';
PRINT '=============================================================================';
PRINT '';

DECLARE @DebugCompanyId3 INT = 1;

SELECT
    ref.Id AS ReferenceId,
    ref.SourceCompanyId,
    sourceComp.Description AS SourceCompanyName,
    ref.SourceProjectItemId,
    sourceItem.Item AS SourceItemCode,
    sourceItem.Description AS SourceItemDescription,
    ref.TargetCompanyId,
    targetComp.Description AS TargetCompanyName,
    ref.TargetProjectItemId,
    targetItem.Item AS TargetItemCode,
    targetItem.Description AS TargetItemDescription,
    ref.Status,
    CASE ref.Status
        WHEN 1 THEN 'DRAFT'
        WHEN 2 THEN 'PENDING'
        WHEN 3 THEN 'APPROVED'
        WHEN 4 THEN 'REJECTED'
        ELSE 'UNKNOWN'
    END AS StatusDescription,
    ref.CreatedAt,
    ref.UpdatedAt

FROM dbo.MA_ProjectArticles_IntercompanyReferences ref

LEFT JOIN dbo.AR_Companies sourceComp
    ON ref.SourceCompanyId = sourceComp.CompanyId

LEFT JOIN dbo.MA_ProjectArticles_Items sourceItem
    ON ref.SourceProjectItemId = sourceItem.Id
    AND ref.SourceCompanyId = sourceItem.CompanyId

LEFT JOIN dbo.AR_Companies targetComp
    ON ref.TargetCompanyId = targetComp.CompanyId

LEFT JOIN dbo.MA_ProjectArticles_Items targetItem
    ON ref.TargetProjectItemId = targetItem.Id
    AND ref.TargetCompanyId = targetItem.CompanyId

WHERE ref.SourceCompanyId = @DebugCompanyId3
   OR ref.TargetCompanyId = @DebugCompanyId3

ORDER BY ref.CreatedAt DESC;

GO

PRINT '';
PRINT '=============================================================================';
PRINT 'FINE TEST';
PRINT '=============================================================================';
