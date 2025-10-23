-- =====================================================
-- Script: Aggiungi pagina Documentazione al menu - PRODUZIONE
-- Versione: 1.0 PROD
-- Data: 2025-10-23
-- Database: WebApp (PRODUZIONE)
-- Server: 192.168.42.117
-- Descrizione: Inserisce la pagina Documentazione in AR_Pages
-- =====================================================

USE [WebApp]
GO

-- Verifica se la pagina esiste già
IF NOT EXISTS (SELECT 1 FROM AR_Pages WHERE pageName = 'Documentazione')
BEGIN
    PRINT 'Inserimento pagina Documentazione...'

    -- Trova il prossimo pageId disponibile
    DECLARE @NextPageId INT
    SELECT @NextPageId = ISNULL(MAX(pageId), 0) + 1 FROM AR_Pages

    -- Inserisci la pagina Documentazione
    INSERT INTO AR_Pages (
        pageName,
        pageParent,
        pageLevel,
        disabled,
        pageDescription,
        pageRoute,
        pageComponent,
        sequence,
        inheritPermissions
    )
    VALUES (
        N'Documentazione',            -- pageName: Nome visualizzato nel menu
        NULL,                         -- pageParent: NULL = pagina principale (livello 1)
        1,                            -- pageLevel: 1 = primo livello
        0,                            -- disabled: 0 = abilitata
        N'Knowledge base e documentazione aziendale',  -- pageDescription
        N'/wiki',                     -- pageRoute: Punta a nginx /wiki
        NULL,                         -- pageComponent: NULL = apri in nuova finestra
        0,                            -- sequence: Ordine nel menu (0 = default)
        1                             -- inheritPermissions: 1 = eredita permessi
    )

    PRINT 'Pagina Documentazione aggiunta con pageId: ' + CAST(@NextPageId AS VARCHAR(10))
    PRINT 'Route: /wiki (si apre in nuova finestra)'
    PRINT ''
    PRINT 'IMPORTANTE: Assegna i permessi ai gruppi con lo script 04!'
END
ELSE
BEGIN
    PRINT 'La pagina Documentazione esiste già!'

    -- Mostra info pagina esistente
    SELECT
        pageId,
        pageName,
        pageRoute,
        pageComponent,
        disabled,
        pageDescription
    FROM AR_Pages
    WHERE pageName = 'Documentazione'
END
GO

-- Verifica risultato
SELECT
    pageId,
    pageName,
    pageParent,
    pageLevel,
    disabled,
    pageRoute,
    pageComponent,
    sequence
FROM AR_Pages
WHERE pageName = 'Documentazione'
GO

PRINT ''
PRINT '=============================================='
PRINT 'PROSSIMI PASSI:'
PRINT '=============================================='
PRINT '1. Esegui script 04 per assegnare permessi'
PRINT '2. Ricarica menu nella webapp'
PRINT '3. Click su Documentazione aprirà Wiki in nuova finestra'
PRINT '=============================================='
GO
