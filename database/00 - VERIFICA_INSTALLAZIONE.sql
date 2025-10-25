-- =============================================
-- VERIFICA INSTALLAZIONE INTERCOMPANY PROGETTI
-- Esegui questo script per verificare che tutto sia stato installato correttamente
-- =============================================

PRINT '====================================='
PRINT 'VERIFICA INSTALLAZIONE INTERCOMPANY'
PRINT '====================================='
PRINT ''

-- 1. Verifica campi nella tabella MA_ProjectArticles_References
PRINT '1. Verifico campi SourceProjectId e TargetProjectId...'
IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'MA_ProjectArticles_References'
      AND COLUMN_NAME = 'SourceProjectId'
)
    PRINT '   ✓ Campo SourceProjectId presente'
ELSE
    PRINT '   ✗ ERRORE: Campo SourceProjectId NON presente - Esegui script 01'

IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'MA_ProjectArticles_References'
      AND COLUMN_NAME = 'TargetProjectId'
)
    PRINT '   ✓ Campo TargetProjectId presente'
ELSE
    PRINT '   ✗ ERRORE: Campo TargetProjectId NON presente - Esegui script 01'

PRINT ''

-- 2. Verifica Stored Procedure MA_CreateTemporaryIntercompanyItem
PRINT '2. Verifico SP MA_CreateTemporaryIntercompanyItem...'
IF OBJECT_ID('MA_CreateTemporaryIntercompanyItem', 'P') IS NOT NULL
    PRINT '   ✓ SP MA_CreateTemporaryIntercompanyItem presente'
ELSE
    PRINT '   ✗ ERRORE: SP MA_CreateTemporaryIntercompanyItem NON presente - Esegui script 02'

PRINT ''

-- 3. Verifica Stored Procedure MA_ApproveIntercompanyReference
PRINT '3. Verifico SP MA_ApproveIntercompanyReference...'
IF OBJECT_ID('MA_ApproveIntercompanyReference', 'P') IS NOT NULL
    PRINT '   ✓ SP MA_ApproveIntercompanyReference presente'
ELSE
    PRINT '   ✗ ERRORE: SP MA_ApproveIntercompanyReference NON presente - Esegui script 03'

PRINT ''

-- 4. Verifica Stored Procedure MA_ProjectArticles_SyncIntercompanyComponents
PRINT '4. Verifico SP MA_ProjectArticles_SyncIntercompanyComponents...'
IF OBJECT_ID('MA_ProjectArticles_SyncIntercompanyComponents', 'P') IS NOT NULL
BEGIN
    PRINT '   ✓ SP MA_ProjectArticles_SyncIntercompanyComponents presente'

    -- Verifica che accetti il parametro @ProjectId
    DECLARE @HasProjectIdParam BIT = 0
    IF EXISTS (
        SELECT 1
        FROM sys.parameters p
        JOIN sys.objects o ON p.object_id = o.object_id
        WHERE o.name = 'MA_ProjectArticles_SyncIntercompanyComponents'
          AND p.name = '@ProjectId'
    )
    BEGIN
        SET @HasProjectIdParam = 1
        PRINT '   ✓ SP accetta parametro @ProjectId'
    END
    ELSE
    BEGIN
        PRINT '   ✗ ERRORE: SP NON accetta parametro @ProjectId - Esegui script 04'
    END
END
ELSE
    PRINT '   ✗ ERRORE: SP MA_ProjectArticles_SyncIntercompanyComponents NON presente - Esegui script 04'

PRINT ''
PRINT '====================================='
PRINT 'RIEPILOGO TABELLE E DATI'
PRINT '====================================='
PRINT ''

-- 5. Conta references con progetti
PRINT '5. References con progetti collegati:'
SELECT
    COUNT(*) AS TotaleReferences,
    SUM(CASE WHEN SourceProjectId IS NOT NULL THEN 1 ELSE 0 END) AS ConSourceProject,
    SUM(CASE WHEN TargetProjectId IS NOT NULL THEN 1 ELSE 0 END) AS ConTargetProject,
    SUM(CASE WHEN Status = 'PENDING' THEN 1 ELSE 0 END) AS Pending,
    SUM(CASE WHEN Status = 'ACCEPTED' THEN 1 ELSE 0 END) AS Accepted,
    SUM(CASE WHEN Status = 'REJECTED' THEN 1 ELSE 0 END) AS Rejected
FROM MA_ProjectArticles_References
PRINT ''

-- 6. Articoli temporanei
PRINT '6. Articoli temporanei creati:'
SELECT
    COUNT(*) AS TotaleTemporanei,
    SUM(CASE WHEN Disabled = 0 THEN 1 ELSE 0 END) AS Attivi,
    SUM(CASE WHEN Disabled = 1 THEN 1 ELSE 0 END) AS Disabilitati
FROM MA_ProjectArticles_Items
WHERE Item LIKE 'IC_TEMP_%'
PRINT ''

-- 7. Progetti intercompany
PRINT '7. Progetti intercompany creati:'
SELECT
    COUNT(*) AS TotaleProgettiIC,
    CompanyId,
    c.Description AS CompanyName
FROM MA_Projects p
JOIN AR_Companies c ON p.CompanyId = c.CompanyId
WHERE p.Name LIKE 'IC - %'
GROUP BY CompanyId, c.Description
ORDER BY CompanyId
PRINT ''

-- 8. Ultimi 5 articoli temporanei
PRINT '8. Ultimi 5 articoli temporanei creati:'
SELECT TOP 5
    Id,
    Item AS CodiceTemporaneo,
    Description,
    c.Description AS Company,
    TBCreated AS DataCreazione
FROM MA_ProjectArticles_Items i
JOIN AR_Companies c ON i.CompanyId = c.CompanyId
WHERE Item LIKE 'IC_TEMP_%'
ORDER BY TBCreated DESC
PRINT ''

-- 9. Ultime 5 references
PRINT '9. Ultime 5 references intercompany:'
SELECT TOP 5
    r.ReferenceId,
    srcComp.Description AS DaCompany,
    tgtComp.Description AS ACompany,
    srcProj.Name AS ProgettoSorgente,
    tgtProj.Name AS ProgettoTarget,
    comp.Item AS Componente,
    r.Status,
    r.RequestDate
FROM MA_ProjectArticles_References r
JOIN AR_Companies srcComp ON r.SourceCompanyId = srcComp.CompanyId
JOIN AR_Companies tgtComp ON r.TargetCompanyId = tgtComp.CompanyId
LEFT JOIN MA_ProjectArticles_Items comp ON r.SourceProjectItemId = comp.Id AND comp.CompanyId = r.SourceCompanyId
LEFT JOIN MA_Projects srcProj ON r.SourceProjectId = srcProj.ProjectID AND srcProj.CompanyId = r.SourceCompanyId
LEFT JOIN MA_Projects tgtProj ON r.TargetProjectId = tgtProj.ProjectID AND tgtProj.CompanyId = r.TargetCompanyId
ORDER BY r.RequestDate DESC
PRINT ''

PRINT '====================================='
PRINT 'VERIFICA COMPLETATA'
PRINT '====================================='
PRINT ''
PRINT 'Se tutti i controlli sono OK (✓), l''installazione è completa.'
PRINT 'Se vedi errori (✗), esegui gli script indicati nei messaggi.'
PRINT ''
