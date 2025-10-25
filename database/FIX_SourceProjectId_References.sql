-- =============================================
-- FIX: Popola SourceProjectId nelle References Esistenti
-- Questo script trova automaticamente i progetti sorgente e li associa alle references
-- =============================================

SET NOCOUNT ON;

PRINT '========================================='
PRINT 'FIX SOURCEPROJECTID - REFERENCES'
PRINT '========================================='
PRINT ''

-- Step 1: Identifica references senza SourceProjectId
PRINT 'Step 1: Identifico references senza SourceProjectId...'
SELECT
    r.ReferenceId,
    r.SourceProjectItemId AS ComponentId,
    i.Item AS ComponentCode,
    r.SourceCompanyId,
    c.Description AS SourceCompany,
    r.TargetCompanyId,
    tc.Description AS TargetCompany,
    r.Status
FROM MA_ProjectArticles_References r
JOIN AR_Companies c ON r.SourceCompanyId = c.CompanyId
JOIN AR_Companies tc ON r.TargetCompanyId = tc.CompanyId
LEFT JOIN MA_ProjectArticles_Items i ON r.SourceProjectItemId = i.Id AND i.CompanyId = r.SourceCompanyId
WHERE r.SourceProjectId IS NULL

PRINT ''
PRINT 'Step 2: Cerco i progetti sorgente per ogni reference...'
PRINT ''

-- Step 2: Crea una tabella temporanea con il mapping reference -> progetto
CREATE TABLE #ReferencesToFix (
    ReferenceId INT,
    SourceProjectItemId BIGINT,
    SourceCompanyId INT,
    ProjectID INT,
    ProjectName NVARCHAR(255),
    Confidence VARCHAR(20)
)

-- Trova progetti che contengono l'articolo
INSERT INTO #ReferencesToFix (ReferenceId, SourceProjectItemId, SourceCompanyId, ProjectID, ProjectName, Confidence)
SELECT
    r.ReferenceId,
    r.SourceProjectItemId,
    r.SourceCompanyId,
    pi.ProjectID,
    p.Name,
    'HIGH' -- L'articolo è nel progetto
FROM MA_ProjectArticles_References r
JOIN MA_ProjectsItems pi ON pi.ItemId = r.SourceProjectItemId AND pi.CompanyId = r.SourceCompanyId
JOIN MA_Projects p ON pi.ProjectID = p.ProjectID AND pi.CompanyId = p.CompanyId
WHERE r.SourceProjectId IS NULL
  AND p.Disabled = 0

-- Mostra i risultati trovati
PRINT 'Progetti trovati:'
SELECT
    ReferenceId,
    ProjectID,
    ProjectName,
    Confidence
FROM #ReferencesToFix
ORDER BY ReferenceId

PRINT ''

-- Step 3: Aggiorna le references
DECLARE @UpdatedCount INT = 0

IF EXISTS (SELECT 1 FROM #ReferencesToFix)
BEGIN
    PRINT 'Step 3: Aggiorno le references con SourceProjectId...'
    PRINT ''

    UPDATE r
    SET r.SourceProjectId = f.ProjectID
    FROM MA_ProjectArticles_References r
    INNER JOIN #ReferencesToFix f ON r.ReferenceId = f.ReferenceId

    SET @UpdatedCount = @@ROWCOUNT

    PRINT 'References aggiornate: ' + CAST(@UpdatedCount AS VARCHAR(10))
    PRINT ''
END
ELSE
BEGIN
    PRINT '⚠ ATTENZIONE: Nessun progetto trovato per le references!'
    PRINT '   Possibili cause:'
    PRINT '   1. Gli articoli non sono associati a nessun progetto in MA_ProjectsItems'
    PRINT '   2. I progetti sono disabilitati'
    PRINT ''
    PRINT '   SOLUZIONE: Elimina le references vecchie e ricrea la sincronizzazione dal BOMViewer'
    PRINT ''
END

-- Step 4: Verifica finale
PRINT 'Step 4: Verifica finale...'
PRINT ''

SELECT
    r.ReferenceId,
    r.SourceProjectId,
    p.Name AS ProjectName,
    i.Item AS ComponentCode,
    r.Status
FROM MA_ProjectArticles_References r
LEFT JOIN MA_Projects p ON r.SourceProjectId = p.ProjectID AND p.CompanyId = r.SourceCompanyId
LEFT JOIN MA_ProjectArticles_Items i ON r.SourceProjectItemId = i.Id AND i.CompanyId = r.SourceCompanyId
WHERE r.ReferenceId IN (SELECT ReferenceId FROM #ReferencesToFix)
ORDER BY r.ReferenceId

PRINT ''

IF @UpdatedCount > 0
BEGIN
    PRINT '✓ FIX COMPLETATO'
    PRINT '  References aggiornate con successo!'
    PRINT '  Ora puoi provare ad approvare le richieste dalla Dashboard Intercompany.'
END
ELSE IF NOT EXISTS (SELECT 1 FROM #ReferencesToFix)
BEGIN
    PRINT '✗ FIX NON APPLICABILE'
    PRINT '  Non è stato possibile trovare progetti per le references.'
    PRINT ''
    PRINT '  CONSIGLIO: Elimina le references vecchie e ricrea la sincronizzazione:'
    PRINT ''
    PRINT '  -- Elimina references vecchie'
    PRINT '  DELETE FROM MA_ProjectArticles_ReferencesLog WHERE ReferenceID IN (2008, 2009)'
    PRINT '  DELETE FROM MA_ProjectArticles_References WHERE ReferenceId IN (2008, 2009)'
    PRINT ''
    PRINT '  Poi dal frontend:'
    PRINT '  1. Vai al BOMViewer del progetto Ricos'
    PRINT '  2. Click "Sincronizza Intercompany"'
    PRINT '  3. Seleziona i componenti'
    PRINT '  4. Le nuove references avranno SourceProjectId popolato automaticamente'
END

-- Cleanup
DROP TABLE #ReferencesToFix

PRINT ''
PRINT '========================================='
PRINT 'FINE SCRIPT'
PRINT '========================================='
