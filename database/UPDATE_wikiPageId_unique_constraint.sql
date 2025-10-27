-- ================================================================
-- Script per modificare il vincolo UNIQUE in AR_Pages_Components
-- Da: (pageId, componentKey)
-- A: (pageId, wikiPageId)
-- ================================================================

USE [WebAppTEST];
GO

-- 1. Rimuovi il vecchio vincolo UNIQUE su (pageId, componentKey)
-- ================================================================
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UK_PageComponent' AND object_id = OBJECT_ID('AR_Pages_Components'))
BEGIN
    ALTER TABLE AR_Pages_Components
    DROP CONSTRAINT UK_PageComponent;
    PRINT 'Vincolo UK_PageComponent rimosso';
END
ELSE
BEGIN
    PRINT 'Vincolo UK_PageComponent non esistente';
END
GO

-- 2. Rendi componentKey nullable (non più obbligatorio)
-- ================================================================
IF EXISTS (SELECT 1 FROM sys.columns
           WHERE object_id = OBJECT_ID('AR_Pages_Components')
           AND name = 'componentKey'
           AND is_nullable = 0)
BEGIN
    ALTER TABLE AR_Pages_Components
    ALTER COLUMN componentKey NVARCHAR(100) NULL;
    PRINT 'Colonna componentKey resa nullable';
END
ELSE
BEGIN
    PRINT 'Colonna componentKey già nullable';
END
GO

-- 3. Crea nuovo vincolo UNIQUE su (pageId, wikiPageId)
-- ================================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UK_Page_WikiPage' AND object_id = OBJECT_ID('AR_Pages_Components'))
BEGIN
    ALTER TABLE AR_Pages_Components
    ADD CONSTRAINT UK_Page_WikiPage UNIQUE (pageId, wikiPageId);
    PRINT 'Vincolo UK_Page_WikiPage creato su (pageId, wikiPageId)';
END
ELSE
BEGIN
    PRINT 'Vincolo UK_Page_WikiPage già esistente';
END
GO

-- 4. Verifica risultato
-- ================================================================
SELECT
    i.name AS ConstraintName,
    COL_NAME(ic.object_id, ic.column_id) AS ColumnName,
    i.is_unique AS IsUnique,
    i.type_desc AS ConstraintType
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
WHERE i.object_id = OBJECT_ID('AR_Pages_Components')
    AND i.is_unique = 1
ORDER BY i.name, ic.key_ordinal;
GO

-- ================================================================
-- NOTE:
-- - Ora la chiave univoca è (pageId, wikiPageId)
-- - Non puoi collegare la stessa pagina wiki più volte alla stessa pagina webapp
-- - componentKey è opzionale e verrà auto-generato dal backend se non fornito
-- ================================================================
