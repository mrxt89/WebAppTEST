-- =====================================================
-- Script: Estrazione Struttura Pagine per Documentazione Wiki
-- Versione: 1.0
-- Data: 2025-10-23
-- Descrizione: Estrae tutte le pagine NON disabilitate con gerarchia
-- =====================================================

USE [WebAppTEST]
GO

PRINT '=============================================='
PRINT 'STRUTTURA PAGINE WEBAPP - PER WIKI'
PRINT '=============================================='
PRINT ''

-- =====================================================
-- 1. PAGINE DI LIVELLO 1 (Menu Principale)
-- =====================================================
PRINT '--- LIVELLO 1: MENU PRINCIPALE ---'
PRINT ''

SELECT
    pageId,
    pageName,
    pageRoute,
    pageComponent,
    pageDescription,
    sequence
FROM AR_Pages
WHERE pageLevel = 1
  AND disabled = 0
  AND pageParent IS NULL
ORDER BY sequence, pageName
GO

PRINT ''
PRINT '=============================================='

-- =====================================================
-- 2. STRUTTURA GERARCHICA COMPLETA
-- =====================================================
PRINT ''
PRINT '--- STRUTTURA GERARCHICA COMPLETA ---'
PRINT ''

;WITH PageHierarchy AS (
    -- Livello 1: Pagine principali
    SELECT
        pageId,
        pageName,
        pageParent,
        pageLevel,
        pageRoute,
        pageComponent,
        pageDescription,
        sequence,
        disabled,
        CAST(pageName AS NVARCHAR(500)) AS HierarchyPath,
        CAST(pageName AS NVARCHAR(500)) AS DisplayPath,
        CAST(pageId AS NVARCHAR(500)) AS IdPath
    FROM AR_Pages
    WHERE pageParent IS NULL
      AND disabled = 0

    UNION ALL

    -- Livelli successivi: Pagine figlie
    SELECT
        p.pageId,
        p.pageName,
        p.pageParent,
        p.pageLevel,
        p.pageRoute,
        p.pageComponent,
        p.pageDescription,
        p.sequence,
        p.disabled,
        CAST(ph.HierarchyPath + '/' + p.pageName AS NVARCHAR(500)),
        CAST(REPLICATE('  ', p.pageLevel - 1) + '└─ ' + p.pageName AS NVARCHAR(500)),
        CAST(ph.IdPath + '/' + CAST(p.pageId AS NVARCHAR(10)) AS NVARCHAR(500))
    FROM AR_Pages p
    INNER JOIN PageHierarchy ph ON p.pageParent = ph.pageId
    WHERE p.disabled = 0
)
SELECT
    pageId,
    DisplayPath AS [Struttura],
    HierarchyPath AS [Path Completo],
    pageRoute AS [Route],
    pageComponent AS [Component],
    pageLevel AS [Livello],
    CASE
        WHEN pageComponent IS NULL AND pageRoute IS NOT NULL THEN 'Link Esterno (nuova finestra)'
        WHEN pageComponent IS NOT NULL THEN 'Componente: ' + pageComponent
        ELSE 'Menu/Folder'
    END AS [Tipo],
    pageDescription AS [Descrizione]
FROM PageHierarchy
ORDER BY HierarchyPath
GO

PRINT ''
PRINT '=============================================='

-- =====================================================
-- 3. STATISTICHE
-- =====================================================
PRINT ''
PRINT '--- STATISTICHE ---'
PRINT ''

SELECT
    pageLevel AS [Livello],
    COUNT(*) AS [Numero Pagine]
FROM AR_Pages
WHERE disabled = 0
GROUP BY pageLevel
ORDER BY pageLevel
GO

PRINT ''

SELECT
    CASE
        WHEN pageComponent IS NULL AND pageRoute IS NOT NULL THEN 'Link Esterno'
        WHEN pageComponent IS NOT NULL THEN 'Componente React'
        WHEN pageParent IS NULL THEN 'Menu Principale'
        ELSE 'Submenu/Folder'
    END AS [Tipo Pagina],
    COUNT(*) AS [Conteggio]
FROM AR_Pages
WHERE disabled = 0
GROUP BY
    CASE
        WHEN pageComponent IS NULL AND pageRoute IS NOT NULL THEN 'Link Esterno'
        WHEN pageComponent IS NOT NULL THEN 'Componente React'
        WHEN pageParent IS NULL THEN 'Menu Principale'
        ELSE 'Submenu/Folder'
    END
GO

PRINT ''
PRINT '=============================================='

-- =====================================================
-- 4. EXPORT PER CREAZIONE WIKI (formato CSV-like)
-- =====================================================
PRINT ''
PRINT '--- EXPORT PER WIKI (formato leggibile) ---'
PRINT ''
PRINT 'Formato: pageId | Level | Parent | Name | Description | Route'
PRINT ''

;WITH PageHierarchy AS (
    SELECT
        pageId,
        pageName,
        pageParent,
        pageLevel,
        pageRoute,
        pageComponent,
        pageDescription,
        CAST(pageName AS NVARCHAR(500)) AS HierarchyPath
    FROM AR_Pages
    WHERE pageParent IS NULL AND disabled = 0

    UNION ALL

    SELECT
        p.pageId,
        p.pageName,
        p.pageParent,
        p.pageLevel,
        p.pageRoute,
        p.pageComponent,
        p.pageDescription,
        CAST(ph.HierarchyPath + '/' + p.pageName AS NVARCHAR(500))
    FROM AR_Pages p
    INNER JOIN PageHierarchy ph ON p.pageParent = ph.pageId
    WHERE p.disabled = 0
)
SELECT
    pageId,
    pageLevel,
    ISNULL(pageParent, 0) AS parentId,
    pageName,
    ISNULL(pageDescription, '') AS description,
    ISNULL(pageRoute, '') AS route,
    ISNULL(pageComponent, '') AS component,
    HierarchyPath
FROM PageHierarchy
ORDER BY HierarchyPath
GO

PRINT ''
PRINT '=============================================='
PRINT 'ESTRAZIONE COMPLETATA!'
PRINT '=============================================='
PRINT ''
PRINT 'PROSSIMI PASSI:'
PRINT '1. Copia l''output della query "STRUTTURA GERARCHICA"'
PRINT '2. Useremo questi dati per creare la struttura nel wiki'
PRINT '3. Definiremo convenzione URL: /wiki/webapp/{slug-from-hierarchy}'
PRINT '=============================================='
GO
