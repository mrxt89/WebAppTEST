-- =====================================================
-- Script: Export struttura pagine per creazione Wiki
-- Versione: 1.0
-- Data: 2025-10-23
-- Descrizione: Esporta struttura completa in formato JSON-like
-- =====================================================

USE [WebAppTEST]
GO

PRINT '=============================================='
PRINT 'EXPORT STRUTTURA PER WIKI.JS'
PRINT '=============================================='
PRINT ''

-- =====================================================
-- EXPORT COMPLETO PER CREAZIONE PAGINE
-- =====================================================

;WITH PageHierarchy AS (
    SELECT
        pageId,
        pageName,
        pageParent,
        pageLevel,
        pageDescription,
        pageRoute,
        pageComponent,
        wikiSlug,
        CAST(pageName AS NVARCHAR(500)) AS HierarchyPath,
        CAST('webapp' + wikiSlug AS NVARCHAR(500)) AS WikiPath
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
        p.pageDescription,
        p.pageRoute,
        p.pageComponent,
        p.wikiSlug,
        CAST(ph.HierarchyPath + ' > ' + p.pageName AS NVARCHAR(500)),
        CAST('webapp' + p.wikiSlug AS NVARCHAR(500))
    FROM AR_Pages p
    INNER JOIN PageHierarchy ph ON p.pageParent = ph.pageId
    WHERE p.disabled = 0
)
SELECT
    pageId AS [ID],
    pageName AS [Titolo],
    pageLevel AS [Livello],
    ISNULL(pageParent, 0) AS [ParentID],
    HierarchyPath AS [Percorso App],
    WikiPath AS [Path Wiki],
    ISNULL(pageDescription, 'Da documentare') AS [Descrizione],
    ISNULL(pageRoute, '') AS [Route App],
    ISNULL(pageComponent, '') AS [Componente],
    wikiSlug AS [Slug]
FROM PageHierarchy
ORDER BY HierarchyPath
GO

PRINT ''
PRINT '=============================================='
PRINT 'STRUTTURA PAGINE WIKI DA CREARE'
PRINT '=============================================='
PRINT ''
PRINT 'Formato: [Livello] Nome -> Path Wiki'
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
    REPLICATE('  ', pageLevel - 1) +
    '[L' + CAST(pageLevel AS VARCHAR(1)) + '] ' +
    pageName +
    ' -> /wiki/webapp' + wikiSlug AS [Struttura]
FROM PageHierarchy
ORDER BY HierarchyPath

PRINT ''
PRINT '=============================================='
PRINT 'TOTALE PAGINE DA CREARE NEL WIKI'
PRINT '=============================================='

SELECT COUNT(*) AS [Numero Pagine]
FROM AR_Pages
WHERE disabled = 0
  AND pageName <> 'Documentazione'

GO
