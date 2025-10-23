-- =====================================================
-- Script: Aggiungi campo wikiSlug per link documentazione
-- Versione: 1.0
-- Data: 2025-10-23
-- Descrizione: Aggiunge campo wikiSlug e lo popola automaticamente
-- =====================================================

USE [WebAppTEST]
GO

-- =====================================================
-- 1. AGGIUNGI CAMPO wikiSlug
-- =====================================================

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('AR_Pages')
    AND name = 'wikiSlug'
)
BEGIN
    PRINT 'Aggiunta campo wikiSlug...'

    ALTER TABLE AR_Pages
    ADD wikiSlug NVARCHAR(500) NULL

    PRINT 'Campo wikiSlug aggiunto con successo!'
END
ELSE
BEGIN
    PRINT 'Campo wikiSlug esiste già!'
END
GO

-- =====================================================
-- 2. FUNZIONE PER GENERARE SLUG DA TESTO
-- =====================================================

-- Funzione helper per convertire testo in slug URL-friendly
-- Esempio: "Dashboard Progetti" -> "dashboard-progetti"

IF OBJECT_ID('dbo.fn_GenerateSlug', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_GenerateSlug
GO

CREATE FUNCTION dbo.fn_GenerateSlug(@text NVARCHAR(500))
RETURNS NVARCHAR(500)
AS
BEGIN
    DECLARE @result NVARCHAR(500)

    -- Converti in minuscolo
    SET @result = LOWER(@text)

    -- Sostituisci caratteri accentati
    SET @result = REPLACE(@result, N'à', 'a')
    SET @result = REPLACE(@result, N'è', 'e')
    SET @result = REPLACE(@result, N'é', 'e')
    SET @result = REPLACE(@result, N'ì', 'i')
    SET @result = REPLACE(@result, N'ò', 'o')
    SET @result = REPLACE(@result, N'ù', 'u')

    -- Sostituisci spazi con trattini
    SET @result = REPLACE(@result, ' ', '-')

    -- Rimuovi caratteri speciali
    SET @result = REPLACE(@result, '.', '')
    SET @result = REPLACE(@result, ',', '')
    SET @result = REPLACE(@result, '/', '-')
    SET @result = REPLACE(@result, '''', '')
    SET @result = REPLACE(@result, '"', '')

    -- Rimuovi trattini multipli
    WHILE CHARINDEX('--', @result) > 0
        SET @result = REPLACE(@result, '--', '-')

    -- Rimuovi trattini iniziali/finali
    SET @result = LTRIM(RTRIM(@result))
    IF LEFT(@result, 1) = '-'
        SET @result = SUBSTRING(@result, 2, LEN(@result))
    IF RIGHT(@result, 1) = '-'
        SET @result = SUBSTRING(@result, 1, LEN(@result) - 1)

    RETURN @result
END
GO

PRINT 'Funzione fn_GenerateSlug creata!'
GO

-- =====================================================
-- 3. GENERA SLUG AUTOMATICI PER TUTTE LE PAGINE
-- =====================================================

PRINT ''
PRINT 'Generazione slug automatici...'
PRINT ''

;WITH PageHierarchy AS (
    -- Livello 1: Pagine principali
    SELECT
        pageId,
        pageName,
        pageParent,
        pageLevel,
        disabled,
        dbo.fn_GenerateSlug(pageName) AS slug,
        '/' + dbo.fn_GenerateSlug(pageName) AS wikiSlugPath
    FROM AR_Pages
    WHERE pageParent IS NULL
      AND disabled = 0
      AND pageName <> 'Documentazione'  -- Escludiamo Documentazione

    UNION ALL

    -- Livelli successivi: Pagine figlie
    SELECT
        p.pageId,
        p.pageName,
        p.pageParent,
        p.pageLevel,
        p.disabled,
        dbo.fn_GenerateSlug(p.pageName) AS slug,
        ph.wikiSlugPath + '/' + dbo.fn_GenerateSlug(p.pageName) AS wikiSlugPath
    FROM AR_Pages p
    INNER JOIN PageHierarchy ph ON p.pageParent = ph.pageId
    WHERE p.disabled = 0
)
UPDATE p
SET wikiSlug = ph.wikiSlugPath
FROM AR_Pages p
INNER JOIN PageHierarchy ph ON p.pageId = ph.pageId

PRINT 'Slug generati!'
GO

-- =====================================================
-- 4. VERIFICA RISULTATI
-- =====================================================

PRINT ''
PRINT '=============================================='
PRINT 'VERIFICA SLUG GENERATI'
PRINT '=============================================='
PRINT ''

;WITH PageHierarchy AS (
    SELECT
        pageId,
        pageName,
        pageParent,
        pageLevel,
        wikiSlug,
        CAST(pageName AS NVARCHAR(500)) AS HierarchyPath
    FROM AR_Pages
    WHERE pageParent IS NULL
      AND disabled = 0
      AND pageName <> 'Documentazione'

    UNION ALL

    SELECT
        p.pageId,
        p.pageName,
        p.pageParent,
        p.pageLevel,
        p.wikiSlug,
        CAST(ph.HierarchyPath + ' > ' + p.pageName AS NVARCHAR(500))
    FROM AR_Pages p
    INNER JOIN PageHierarchy ph ON p.pageParent = ph.pageId
    WHERE p.disabled = 0
)
SELECT
    pageId,
    HierarchyPath AS [Percorso],
    '/wiki/webapp' + wikiSlug AS [URL Wiki Completo],
    wikiSlug AS [Slug]
FROM PageHierarchy
ORDER BY HierarchyPath
GO

PRINT ''
PRINT '=============================================='
PRINT 'COMPLETATO!'
PRINT '=============================================='
PRINT ''
PRINT 'Ora ogni pagina ha il suo wikiSlug.'
PRINT 'URL completo wiki: /wiki/webapp + wikiSlug'
PRINT ''
PRINT 'Esempio:'
PRINT 'Dashboard -> /wiki/webapp/dashboard'
PRINT 'Progetti/Intercompany -> /wiki/webapp/progetti/intercompany'
PRINT '=============================================='
GO
