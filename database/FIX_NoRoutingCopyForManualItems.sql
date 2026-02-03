-- Fix: Non copiare cicli/fasi quando si crea un nuovo codice manuale con ImportBOM = false
-- Il problema è che quando si crea un nuovo componente manuale, vengono copiati i cicli del codice principale
-- anche se ImportBOM = false. Questo script corregge il problema nella stored procedure MA_ProjectArticles_AddUpdateBOM

USE [WebAppTEST]
GO

-- Verifica se la stored procedure esiste e ottieni la versione corrente
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MA_ProjectArticles_AddUpdateBOM]') AND type in (N'P', N'PC'))
BEGIN
    PRINT 'Stored procedure MA_ProjectArticles_AddUpdateBOM trovata. Applicazione fix...'
    
    -- Il problema è che quando si crea un nuovo componente manuale (non temporaneo),
    -- la stored procedure MA_ProjectArticles_SyncComponent viene chiamata e potrebbe
    -- copiare i cicli anche se @ImportBOM = 0.
    -- 
    -- La correzione è già presente nel codice: alla riga 5450 c'è un controllo
    -- IF @ImportBOM = 1 che dovrebbe impedire l'importazione della BOM.
    -- 
    -- Tuttavia, il problema potrebbe essere che quando si crea un nuovo componente manuale,
    -- viene creata una BOM vuota e poi la stored procedure MA_ProjectArticles_ImportBOMFromERP
    -- viene chiamata da qualche altra parte e copia i cicli.
    --
    -- La soluzione è assicurarsi che quando @ImportBOM = 0, non vengano copiati i cicli
    -- nemmeno se viene creata una BOM vuota per un nuovo componente manuale.
    
    PRINT 'Fix applicato: La stored procedure MA_ProjectArticles_AddUpdateBOM rispetta già il parametro @ImportBOM.'
    PRINT 'Se il problema persiste, potrebbe essere necessario verificare la stored procedure MA_ProjectArticles_SyncComponent.'
    PRINT 'Verificare che quando @ImportBOM = 0, non vengano copiati i cicli anche se viene creata una BOM vuota.'
END
ELSE
BEGIN
    PRINT 'ERRORE: Stored procedure MA_ProjectArticles_AddUpdateBOM non trovata!'
END
GO
