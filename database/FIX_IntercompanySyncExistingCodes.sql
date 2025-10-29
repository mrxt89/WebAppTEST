-- ================================================================================
-- FIX INTERCOMPANY - SINCRONIZZAZIONE CODICI ESISTENTI
-- ================================================================================
-- Questo script sincronizza tutti i codici articolo esistenti che potrebbero
-- essere disallineati tra MA_ProjectArticles_Items e MA_ProjectArticles_References
--
-- IMPORTANTE: Esegui questo script DOPO aver creato il trigger
-- ================================================================================

USE [WebAppTEST]
GO

PRINT '================================================================================';
PRINT 'INIZIO SINCRONIZZAZIONE CODICI ARTICOLO ESISTENTI';
PRINT '================================================================================';
PRINT '';

-- Conta quante references sono disallineate
DECLARE @DisallineateCount INT;

SELECT @DisallineateCount = COUNT(*)
FROM MA_ProjectArticles_References ref
INNER JOIN MA_ProjectArticles_Items item
    ON ref.TargetProjectItemId = item.Id
    AND ref.TargetCompanyId = item.CompanyId
WHERE ref.TargetProjectItemCode <> item.Item
    OR (ref.TargetProjectItemCode IS NULL AND item.Item IS NOT NULL);

PRINT 'References disallineate trovate: ' + CAST(@DisallineateCount AS VARCHAR(10));
PRINT '';

IF @DisallineateCount > 0
BEGIN
    PRINT 'Procedo con la sincronizzazione...';
    PRINT '';

    -- Mostra le references che verranno aggiornate (per log)
    PRINT 'Dettaglio references da aggiornare:';
    PRINT '----------------------------------------';

    SELECT
        ref.ReferenceID,
        ref.TargetProjectItemCode AS [Codice Vecchio],
        item.Item AS [Codice Nuovo],
        item.Description AS [Descrizione],
        sourceComp.Description AS [Azienda Source],
        targetComp.Description AS [Azienda Target]
    FROM MA_ProjectArticles_References ref
    INNER JOIN MA_ProjectArticles_Items item
        ON ref.TargetProjectItemId = item.Id
        AND ref.TargetCompanyId = item.CompanyId
    LEFT JOIN AR_Companies sourceComp ON ref.SourceCompanyId = sourceComp.CompanyId
    LEFT JOIN AR_Companies targetComp ON ref.TargetCompanyId = targetComp.CompanyId
    WHERE ref.TargetProjectItemCode <> item.Item
        OR (ref.TargetProjectItemCode IS NULL AND item.Item IS NOT NULL);

    PRINT '';
    PRINT 'Eseguo aggiornamento...';

    -- Aggiorna tutte le references disallineate
    UPDATE ref
    SET
        ref.TargetProjectItemCode = item.Item,
        ref.TBModified = GETDATE(),
        ref.TBModifiedId = 0 -- Sistema = 0
    FROM MA_ProjectArticles_References ref
    INNER JOIN MA_ProjectArticles_Items item
        ON ref.TargetProjectItemId = item.Id
        AND ref.TargetCompanyId = item.CompanyId
    WHERE ref.TargetProjectItemCode <> item.Item
        OR (ref.TargetProjectItemCode IS NULL AND item.Item IS NOT NULL);

    DECLARE @UpdatedCount INT = @@ROWCOUNT;

    PRINT '';
    PRINT 'References aggiornate: ' + CAST(@UpdatedCount AS VARCHAR(10));
END
ELSE
BEGIN
    PRINT 'Nessuna reference disallineata trovata. Tutto sincronizzato!';
END

PRINT '';
PRINT '================================================================================';
PRINT 'SINCRONIZZAZIONE COMPLETATA CON SUCCESSO!';
PRINT '================================================================================';
GO
