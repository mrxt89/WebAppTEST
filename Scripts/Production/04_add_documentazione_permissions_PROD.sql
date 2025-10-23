-- =====================================================
-- Script: Assegna permessi pagina Documentazione - PRODUZIONE
-- Versione: 1.0 PROD
-- Data: 2025-10-23
-- Database: WebApp (PRODUZIONE)
-- Server: 192.168.42.117
-- Descrizione: Assegna permessi di accesso alla pagina Documentazione
-- =====================================================

USE [WebApp]
GO

-- Trova il pageId della pagina Documentazione
DECLARE @DocPageId INT
SELECT @DocPageId = pageId FROM AR_Pages WHERE pageName = 'Documentazione'

IF @DocPageId IS NULL
BEGIN
    PRINT 'ERRORE: Pagina Documentazione non trovata!'
    PRINT 'Esegui prima lo script 03_add_documentazione_page_PROD.sql'
    RETURN
END

PRINT 'Pagina Documentazione trovata con pageId: ' + CAST(@DocPageId AS VARCHAR(10))
PRINT ''

-- Trova tutti i gruppi attivi
PRINT 'Gruppi trovati nel sistema:'
SELECT groupId, groupName FROM AR_Groups
PRINT ''

-- Assegna permessi a TUTTI i gruppi (puoi modificare questo per essere più selettivo)
DECLARE @GroupId INT

DECLARE group_cursor CURSOR FOR
    SELECT groupId FROM AR_Groups

OPEN group_cursor
FETCH NEXT FROM group_cursor INTO @GroupId

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Verifica se il permesso esiste già
    IF NOT EXISTS (
        SELECT 1 FROM AR_GroupPages
        WHERE groupId = @GroupId AND pageId = @DocPageId
    )
    BEGIN
        -- Inserisci permesso
        INSERT INTO AR_GroupPages (groupId, pageId)
        VALUES (@GroupId, @DocPageId)

        PRINT 'Permesso aggiunto per groupId: ' + CAST(@GroupId AS VARCHAR(10))
    END
    ELSE
    BEGIN
        PRINT 'Permesso già esistente per groupId: ' + CAST(@GroupId AS VARCHAR(10))
    END

    FETCH NEXT FROM group_cursor INTO @GroupId
END

CLOSE group_cursor
DEALLOCATE group_cursor

PRINT ''
PRINT '=============================================='
PRINT 'Permessi assegnati con successo!'
PRINT '=============================================='
PRINT ''

-- Verifica permessi assegnati
PRINT 'Permessi attivi per la pagina Documentazione:'
SELECT
    g.groupId,
    g.groupName,
    p.pageName,
    p.pageRoute
FROM AR_GroupPages gp
INNER JOIN AR_Groups g ON gp.groupId = g.groupId
INNER JOIN AR_Pages p ON gp.pageId = p.pageId
WHERE p.pageName = 'Documentazione'
ORDER BY g.groupName

PRINT ''
PRINT '=============================================='
PRINT 'COMPLETATO!'
PRINT 'Ricarica la webapp per vedere il menu aggiornato'
PRINT '=============================================='
GO
