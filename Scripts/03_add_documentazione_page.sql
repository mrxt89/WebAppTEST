-- =====================================================
-- Script: Aggiungi pagina Documentazione al menu
-- Versione: 1.0
-- Data: 2025-10-23
-- Descrizione: Inserisce la pagina Documentazione in AR_Pages
-- =====================================================


-- Verifica se la pagina esiste già
IF NOT EXISTS (SELECT 1 FROM AR_Pages WHERE pageRoute = '/documentazione')
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
        N'/documentazione',           -- pageRoute: Route React
        N'Documentazione',            -- pageComponent: Nome componente (senza .jsx)
        0,                            -- sequence: Ordine nel menu (0 = default)
        1                             -- inheritPermissions: 1 = eredita permessi
    )

    PRINT 'Pagina Documentazione aggiunta con pageId: ' + CAST(@NextPageId AS VARCHAR(10))
    PRINT 'Route: /documentazione'
    PRINT ''
    PRINT 'IMPORTANTE: Assegna i permessi ai gruppi in AR_GroupPages!'
END
ELSE
BEGIN
    PRINT 'La pagina Documentazione esiste già!'

    -- Mostra info pagina esistente
    SELECT
        pageId,
        pageName,
        pageRoute,
        disabled,
        pageDescription
    FROM AR_Pages
    WHERE pageRoute = '/documentazione'
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
WHERE pageRoute = '/documentazione'
GO

PRINT ''
PRINT '=============================================='
PRINT 'PROSSIMI PASSI:'
PRINT '=============================================='
PRINT '1. Assegna permessi in AR_GroupPages'
PRINT '2. Ricarica menu nella webapp'
PRINT '3. La pagina apparirà nel menu principale'
PRINT '=============================================='
GO
