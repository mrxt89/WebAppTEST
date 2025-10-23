-- =====================================================
-- Script: Fix route Documentazione per aprire Wiki
-- Versione: 2.0
-- Data: 2025-10-23
-- Descrizione: Apre wiki in nuova finestra via nginx
-- =====================================================

USE [WebAppTEST]
GO

-- Aggiorna la pagina Documentazione
UPDATE AR_Pages
SET
    pageRoute = '/wiki',  -- Punta a nginx /wiki (si apre in nuova finestra)
    pageComponent = NULL,  -- NULL = apri in nuova finestra (logica in handleNavigate)
    pageDescription = N'Documentazione e knowledge base aziendale'
WHERE pageName = 'Documentazione'
GO

-- Verifica modifica
SELECT
    pageId,
    pageName,
    pageRoute,
    pageComponent,
    disabled
FROM AR_Pages
WHERE pageName = 'Documentazione'
GO

PRINT ''
PRINT '=============================================='
PRINT 'Route aggiornata a /wiki (nginx)'
PRINT 'pageComponent = NULL'
PRINT ''
PRINT 'COMPORTAMENTO:'
PRINT 'Click su Documentazione -> window.open("/wiki")'
PRINT 'Si apre in NUOVA FINESTRA/TAB'
PRINT '=============================================='
GO
