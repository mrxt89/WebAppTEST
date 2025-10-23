-- =====================================================
-- WikiJS - Configurazione Locale e Editor
-- WebAppTEST Documentation
-- =====================================================

USE [WikiJS]
GO

-- Inserimento Locale Italiano
INSERT INTO [dbo].[locales] (
    [code], 
    [strings], 
    [isRTL], 
    [name], 
    [nativeName], 
    [availability], 
    [createdAt], 
    [updatedAt]
) VALUES (
    'it', 
    '{"common":{"save":"Salva","cancel":"Annulla","edit":"Modifica","delete":"Elimina","create":"Crea","search":"Cerca","loading":"Caricamento..."},"page":{"title":"Titolo","content":"Contenuto","description":"Descrizione","tags":"Tag","created":"Creato","updated":"Aggiornato"},"navigation":{"home":"Home","pages":"Pagine","assets":"Risorse","users":"Utenti","groups":"Gruppi","settings":"Impostazioni"}}', 
    0, 
    'Italian', 
    'Italiano', 
    100, 
    '2025-01-23T10:00:00.000Z', 
    '2025-01-23T10:00:00.000Z'
);

-- Inserimento Editor Markdown
INSERT INTO [dbo].[editors] (
    [key], 
    [isEnabled], 
    [config]
) VALUES (
    'markdown', 
    1, 
    '{"toolbar":{"bold":true,"italic":true,"strikethrough":true,"heading":true,"quote":true,"unorderedlist":true,"orderedlist":true,"tasklist":true,"code":true,"codespan":true,"link":true,"image":true,"table":true,"datetime":true,"emoji":true,"hr":true,"toc":true},"spellcheck":true,"autosave":true}'
);

-- Inserimento Renderer Markdown
INSERT INTO [dbo].[renderers] (
    [key], 
    [isEnabled], 
    [config]
) VALUES (
    'markdown', 
    1, 
    '{"breaks":true,"linkify":true,"typographer":true,"toc":{"permalink":true,"permalinkClass":"header-anchor","permalinkSymbol":"#"}}'
);

-- Inserimento Autenticazione Locale
INSERT INTO [dbo].[authentication] (
    [key], 
    [isEnabled], 
    [config], 
    [selfRegistration], 
    [domainWhitelist], 
    [autoEnrollGroups], 
    [order], 
    [strategyKey], 
    [displayName]
) VALUES (
    'local', 
    1, 
    '{"passwordMinLength":8,"passwordRequireUppercase":true,"passwordRequireLowercase":true,"passwordRequireNumbers":true,"passwordRequireSpecialChars":false}', 
    0, 
    '[]', 
    '[]', 
    1, 
    'local', 
    'Autenticazione Locale'
);

PRINT 'Configurazione locale e editor WikiJS completata!'
