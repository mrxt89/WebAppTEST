-- Fix: Non copiare cicli/fasi quando si crea un nuovo codice manuale con ImportBOM = false
-- Il problema è che quando si crea un nuovo componente manuale, vengono copiati i cicli del codice principale
-- anche se ImportBOM = false.
-- 
-- Il problema è nella stored procedure MA_ProjectArticles_SyncComponent (chiamata da MA_ProjectArticles_AddUpdateBOM)
-- che imposta @NeedBOMSync = 1 anche quando @ImportBOM = 0 se esiste una BOM nel gestionale.
-- 
-- La correzione è verificare che @NeedBOMSync venga impostato solo se @ImportBOM = 1.

USE [WebAppTEST]
GO

-- Verifica se la stored procedure esiste
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MA_ProjectArticles_SyncComponent]') AND type in (N'P', N'PC'))
BEGIN
    PRINT 'Stored procedure MA_ProjectArticles_SyncComponent trovata.'
    PRINT 'Il problema è che @NeedBOMSync viene impostato anche quando @ImportBOM = 0.'
    PRINT 'Verificare che il codice alla riga 5515 venga eseguito solo se @ImportBOM = 1.'
    PRINT ''
    PRINT 'CORREZIONE NECESSARIA:'
    PRINT 'Il blocco che imposta @NeedBOMSync = 1 (righe 5507-5516) deve essere dentro il controllo IF @ImportBOM = 1.'
    PRINT 'Oppure deve essere aggiunto un controllo aggiuntivo: IF @ImportBOM = 1 AND @NeedBOMSync = 1'
    PRINT ''
    PRINT 'La correzione dovrebbe essere:'
    PRINT '  - Alla riga 5512-5516, aggiungere controllo: IF @ImportBOM = 1'
    PRINT '  - Oppure modificare la riga 5519 per verificare anche @ImportBOM = 1'
END
ELSE
BEGIN
    PRINT 'ERRORE: Stored procedure MA_ProjectArticles_SyncComponent non trovata!'
    PRINT 'La stored procedure potrebbe essere definita in un altro file o con un nome diverso.'
END
GO
