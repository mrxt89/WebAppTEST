-- =====================================================
-- Script: Fix route Documentazione per aprire Wiki - PRODUZIONE
-- Versione: 2.0 PROD
-- Data: 2025-10-23
-- Database: WebApp (PRODUZIONE)
-- Server: 192.168.42.117
-- Descrizione: Apre wiki in nuova finestra via nginx
-- =====================================================

USE [WebApp]
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
