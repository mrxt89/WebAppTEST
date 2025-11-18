-- PATCH: Commenta il primo cursore che causa problemi con molti componenti
-- Questo cursore serve SOLO per logging (PRINT) e non modifica dati
-- Commentandolo, la SP funzionerà anche con 36+ componenti

USE WebApp;
GO

-- Backup della stored procedure originale
IF OBJECT_ID('dbo.MA_ProjectArticles_ImportWithSelection_BACKUP', 'P') IS NOT NULL
    DROP PROCEDURE dbo.MA_ProjectArticles_ImportWithSelection_BACKUP;
GO

-- Crea backup
EXEC sp_rename 'dbo.MA_ProjectArticles_ImportWithSelection', 'MA_ProjectArticles_ImportWithSelection_BACKUP';
GO

PRINT 'Backup creato: MA_ProjectArticles_ImportWithSelection_BACKUP';
PRINT '';
PRINT 'Ora devi applicare manualmente la patch:';
PRINT '';
PRINT '1. Apri il file database/WebApp.sql';
PRINT '2. Cerca la stored procedure MA_ProjectArticles_ImportWithSelection (linea ~7034)';
PRINT '3. Trova il primo cursore (linee 7054-7084):';
PRINT '   DECLARE check_both_cursor CURSOR FOR';
PRINT '   ...';
PRINT '   DEALLOCATE check_both_cursor;';
PRINT '';
PRINT '4. Commenta TUTTO il blocco aggiungendo -- davanti a ogni linea:';
PRINT '';
PRINT '   -- DECLARE @CheckCode VARCHAR(64);';
PRINT '   -- DECLARE check_both_cursor CURSOR FOR';
PRINT '   -- SELECT DISTINCT ComponentItemCode FROM @SelectedComponents;';
PRINT '   -- ...';
PRINT '   -- CLOSE check_both_cursor;';
PRINT '   -- DEALLOCATE check_both_cursor;';
PRINT '';
PRINT '5. Salva il file e riesegui lo script SQL per ricreare la stored procedure';
PRINT '';
PRINT 'OPPURE copia il codice corretto qui sotto:';
GO
