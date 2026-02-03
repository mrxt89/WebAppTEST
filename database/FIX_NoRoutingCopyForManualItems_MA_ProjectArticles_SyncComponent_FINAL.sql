-- Fix: Non copiare cicli/fasi quando si crea un nuovo codice manuale con ImportBOM = false
-- Il problema è che quando si crea un nuovo componente manuale, vengono copiati i cicli del codice principale
-- anche se ImportBOM = false.
-- 
-- Il problema è nella stored procedure MA_ProjectArticles_SyncComponent (chiamata da MA_ProjectArticles_AddUpdateBOM)
-- che chiama MA_ProjectArticles_ImportBOMFromERP anche quando @ImportBOM = 0 se @ValidateBOM = 1.
-- 
-- La correzione è verificare che MA_ProjectArticles_ImportBOMFromERP venga chiamata solo se @ImportBOM = 1.

USE [WebAppTEST]
GO

PRINT '========================================'
PRINT 'FIX: Non copiare cicli quando ImportBOM = false'
PRINT '========================================'
PRINT ''
PRINT 'PROBLEMA IDENTIFICATO:'
PRINT 'Alla riga 4610 di MA_ProjectArticles_SyncComponent, quando @ValidateBOM = 1,'
PRINT 'viene chiamata MA_ProjectArticles_ImportBOMFromERP anche se @ImportBOM = 0.'
PRINT 'Questo può copiare i cicli anche quando non dovrebbe.'
PRINT ''
PRINT 'CORREZIONE NECESSARIA:'
PRINT 'Modificare il controllo alla riga 4610 da:'
PRINT '  IF @ValidateBOM = 1 AND @BOMExists = 1'
PRINT 'in:'
PRINT '  IF @ValidateBOM = 1 AND @ImportBOM = 1 AND @BOMExists = 1'
PRINT ''
PRINT 'Questo impedisce la chiamata a MA_ProjectArticles_ImportBOMFromERP'
PRINT 'quando @ImportBOM = 0, anche se @ValidateBOM = 1.'
PRINT ''
PRINT 'NOTA: La validazione dovrebbe solo verificare se la BOM è sincronizzata,'
PRINT 'non importarla. Se @ImportBOM = 0, non dovremmo importare i cicli.'
PRINT ''
PRINT '========================================'
PRINT 'ISTRUZIONI PER APPLICARE IL FIX:'
PRINT '========================================'
PRINT '1. Aprire la stored procedure MA_ProjectArticles_SyncComponent in SQL Server Management Studio'
PRINT '2. Cercare la riga che contiene: IF @ValidateBOM = 1 AND @BOMExists = 1'
PRINT '3. Modificarla in: IF @ValidateBOM = 1 AND @ImportBOM = 1 AND @BOMExists = 1'
PRINT '4. Salvare e eseguire la stored procedure modificata'
PRINT ''
PRINT 'OPPURE:'
PRINT 'Eseguire lo script ALTER PROCEDURE completo che modifica solo questa parte specifica.'
PRINT ''
GO

-- Script per modificare automaticamente la stored procedure
-- NOTA: Questo script richiede che la stored procedure esista e che il codice alla riga 4610
-- contenga esattamente il pattern specificato.

DECLARE @ProcedureName NVARCHAR(128) = 'MA_ProjectArticles_SyncComponent';
DECLARE @OldPattern NVARCHAR(MAX) = 'IF @ValidateBOM = 1 AND @BOMExists = 1';
DECLARE @NewPattern NVARCHAR(MAX) = 'IF @ValidateBOM = 1 AND @ImportBOM = 1 AND @BOMExists = 1';

-- Verifica se la stored procedure esiste
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[' + @ProcedureName + ']') AND type in (N'P', N'PC'))
BEGIN
    PRINT 'Stored procedure ' + @ProcedureName + ' trovata.'
    PRINT ''
    PRINT 'ATTENZIONE: La modifica automatica richiede che il codice della stored procedure'
    PRINT 'sia letto, modificato e poi riscritto. Questo è complesso e può causare errori.'
    PRINT ''
    PRINT 'RACCOMANDAZIONE: Applicare la modifica manualmente come descritto sopra.'
    PRINT ''
    PRINT 'Se vuoi procedere con la modifica automatica, decommentare il codice qui sotto'
    PRINT 'e verificare che funzioni correttamente.'
    /*
    -- Leggi la definizione della stored procedure
    DECLARE @ProcedureDefinition NVARCHAR(MAX);
    SELECT @ProcedureDefinition = OBJECT_DEFINITION(OBJECT_ID(N'[dbo].[' + @ProcedureName + ']'));
    
    -- Verifica se il pattern esiste
    IF CHARINDEX(@OldPattern, @ProcedureDefinition) > 0
    BEGIN
        -- Sostituisci il pattern
        SET @ProcedureDefinition = REPLACE(@ProcedureDefinition, @OldPattern, @NewPattern);
        
        -- Esegui la modifica
        EXEC sp_executesql @ProcedureDefinition;
        
        PRINT 'Modifica applicata con successo!'
    END
    ELSE
    BEGIN
        PRINT 'ERRORE: Pattern non trovato nella stored procedure.'
        PRINT 'Verificare che il codice alla riga 4610 contenga esattamente:'
        PRINT @OldPattern
    END
    */
END
ELSE
BEGIN
    PRINT 'ERRORE: Stored procedure ' + @ProcedureName + ' non trovata!'
END
GO
