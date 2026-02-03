-- Fix: Elimina cicli/routing quando si crea un componente manuale con ImportBOM = false
-- Soluzione "italianata" ma efficace: dopo la creazione del componente, se ImportBOM = 0,
-- eliminiamo eventuali cicli/routing che potrebbero essere stati copiati erroneamente.
--
-- PROBLEMA:
-- Quando si crea un nuovo componente manuale con ImportBOM = false, vengono comunque
-- copiati i cicli/routing dal codice principale o dal gestionale.
--
-- SOLUZIONE:
-- Dopo l'inserimento del componente nella BOM (riga 6140), se ImportBOM = 0 e 
-- CreateTempComponent = 0, eliminiamo tutti i cicli/routing dalla BOM del componente appena creato.

USE [WebAppTEST]
GO

PRINT '========================================'
PRINT 'FIX: Elimina cicli quando ImportBOM = false'
PRINT '========================================'
PRINT ''
PRINT 'PROBLEMA:'
PRINT 'Quando si crea un nuovo componente manuale con ImportBOM = false, vengono comunque'
PRINT 'copiati i cicli/routing dal codice principale o dal gestionale.'
PRINT ''
PRINT 'SOLUZIONE:'
PRINT 'Dopo l''inserimento del componente nella BOM (riga 6140), se ImportBOM = 0 e'
PRINT 'CreateTempComponent = 0, eliminiamo tutti i cicli/routing dalla BOM del componente appena creato.'
PRINT ''
PRINT '========================================'
PRINT 'ISTRUZIONI PER APPLICARE IL FIX:'
PRINT '========================================'
PRINT '1. Aprire la stored procedure MA_ProjectArticles_AddUpdateBOM in SQL Server Management Studio'
PRINT '2. Cercare la riga 6140 che contiene: SET @ReturnValue = @Id;'
PRINT '3. Aggiungere il seguente codice PRIMA della riga 6141 (END):'
PRINT ''
PRINT '-- FIX: Elimina cicli/routing se ImportBOM = 0 e componente manuale (non temporaneo)'
PRINT 'IF @Action = ''ADD_COMPONENT'' AND @ImportBOM = 0 AND @CreateTempComponent = 0 AND @RealComponentId IS NOT NULL'
PRINT 'BEGIN'
PRINT '    -- Trova la BOM del componente appena creato'
PRINT '    DECLARE @ComponentBOMIdToClean BIGINT;'
PRINT '    SELECT TOP 1 @ComponentBOMIdToClean = Id'
PRINT '    FROM dbo.MA_ProjectArticles_BillOfMaterials'
PRINT '    WHERE ItemId = @RealComponentId'
PRINT '        AND CompanyId = @CompanyId'
PRINT '        AND ('
PRINT '            (@ComponentMainRefBOMId IS NOT NULL AND MainRefBOMId = @ComponentMainRefBOMId)'
PRINT '            OR'
PRINT '            (@ComponentMainRefBOMId IS NULL AND Version = 1)'
PRINT '        )'
PRINT '    ORDER BY Version DESC;'
PRINT ''
PRINT '    -- Se esiste una BOM, elimina tutti i cicli/routing'
PRINT '    IF @ComponentBOMIdToClean IS NOT NULL'
PRINT '    BEGIN'
PRINT '        DELETE FROM dbo.MA_ProjectArticles_BOMRouting'
PRINT '        WHERE BOMId = @ComponentBOMIdToClean AND CompanyId = @CompanyId;'
PRINT '        '
PRINT '        PRINT ''Cicli/routing eliminati dalla BOM '' + CAST(@ComponentBOMIdToClean AS VARCHAR(20)) + '' per componente manuale con ImportBOM = false'';'
PRINT '    END'
PRINT 'END'
PRINT ''
PRINT '4. Salvare e eseguire la stored procedure modificata'
PRINT ''
GO

-- Script SQL completo per la modifica
-- NOTA: Questo script mostra esattamente dove inserire il codice

DECLARE @FixCode NVARCHAR(MAX) = N'
-- FIX: Elimina cicli/routing se ImportBOM = 0 e componente manuale (non temporaneo)
IF @Action = ''ADD_COMPONENT'' AND @ImportBOM = 0 AND @CreateTempComponent = 0 AND @RealComponentId IS NOT NULL
BEGIN
    -- Trova la BOM del componente appena creato
    DECLARE @ComponentBOMIdToClean BIGINT;
    SELECT TOP 1 @ComponentBOMIdToClean = Id
    FROM dbo.MA_ProjectArticles_BillOfMaterials
    WHERE ItemId = @RealComponentId
        AND CompanyId = @CompanyId
        AND (
            (@ComponentMainRefBOMId IS NOT NULL AND MainRefBOMId = @ComponentMainRefBOMId)
            OR
            (@ComponentMainRefBOMId IS NULL AND Version = 1)
        )
    ORDER BY Version DESC;
    
    -- Se esiste una BOM, elimina tutti i cicli/routing
    IF @ComponentBOMIdToClean IS NOT NULL
    BEGIN
        DELETE FROM dbo.MA_ProjectArticles_BOMRouting
        WHERE BOMId = @ComponentBOMIdToClean AND CompanyId = @CompanyId;
        
        PRINT ''Cicli/routing eliminati dalla BOM '' + CAST(@ComponentBOMIdToClean AS VARCHAR(20)) + '' per componente manuale con ImportBOM = false'';
    END
END
';

PRINT '========================================'
PRINT 'CODICE DA INSERIRE:'
PRINT '========================================'
PRINT @FixCode
PRINT ''
PRINT 'POSIZIONE:'
PRINT 'Dopo la riga 6140 (SET @ReturnValue = @Id;)'
PRINT 'Prima della riga 6141 (END)'
PRINT ''
GO
