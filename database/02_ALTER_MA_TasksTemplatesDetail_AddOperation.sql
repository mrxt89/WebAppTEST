-- Script per aggiungere il campo Operation alla tabella MA_TasksTemplatesDetail
-- Eseguire questo script per aggiungere il riferimento alle operazioni nei template delle attività

-- Verifica se la colonna esiste già
IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'MA_TasksTemplatesDetail'
    AND COLUMN_NAME = 'Operation'
)
BEGIN
    -- Aggiungi la colonna Operation
    ALTER TABLE [dbo].[MA_TasksTemplatesDetail]
    ADD [Operation] VARCHAR(21) NULL;

    PRINT 'Colonna Operation aggiunta con successo alla tabella MA_TasksTemplatesDetail';
END
ELSE
BEGIN
    PRINT 'La colonna Operation esiste già nella tabella MA_TasksTemplatesDetail';
END
GO

-- Opzionale: Crea un indice per migliorare le performance delle query che filtrano per Operation
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_MA_TasksTemplatesDetail_Operation'
    AND object_id = OBJECT_ID('dbo.MA_TasksTemplatesDetail')
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_MA_TasksTemplatesDetail_Operation]
    ON [dbo].[MA_TasksTemplatesDetail] ([Operation])
    INCLUDE ([TemplateDetailID], [TemplateID], [Title]);

    PRINT 'Indice IX_MA_TasksTemplatesDetail_Operation creato con successo';
END
ELSE
BEGIN
    PRINT 'L''indice IX_MA_TasksTemplatesDetail_Operation esiste già';
END
GO
