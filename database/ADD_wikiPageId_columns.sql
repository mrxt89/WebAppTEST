-- ================================================================
-- Script per aggiungere colonna wikiPageId alla tabella AR_Pages_Components
-- Migrazione da wikiSlug (path manuale) a wikiPageId (ID immutabile dal DB WikiJS)
-- ================================================================

USE [WebAppTEST];
GO

-- 1. Aggiunta colonna wikiPageId alla tabella AR_Pages_Components
-- ================================================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AR_Pages_Components') AND name = 'wikiPageId')
BEGIN
    ALTER TABLE AR_Pages_Components
    ADD wikiPageId INT NULL;

    PRINT 'Colonna wikiPageId aggiunta alla tabella AR_Pages_Components';
END
ELSE
BEGIN
    PRINT 'Colonna wikiPageId già esistente nella tabella AR_Pages_Components';
END
GO

-- 2. Verifica risultato
-- ================================================================
SELECT
    'AR_Pages_Components' AS Tabella,
    name AS Colonna,
    TYPE_NAME(user_type_id) AS Tipo,
    is_nullable AS Nullable
FROM sys.columns
WHERE object_id = OBJECT_ID('AR_Pages_Components') AND name IN ('wikiSlug', 'wikiPageId')
ORDER BY Colonna;
GO

-- ================================================================
-- NOTE:
-- - wikiSlug viene mantenuto per retrocompatibilità (può essere rimosso in futuro)
-- - wikiPageId fa riferimento all'ID della pagina nel database WikiJS.dbo.pages
-- - Se wikiPageId è NULL, si usa il fallback su wikiSlug (comportamento precedente)
-- - wikiPageId è presente SOLO in AR_Pages_Components (ogni componente può avere la sua pagina wiki)
-- ================================================================
