-- =============================================
-- Script per aggiungere colonne di audit per la costificazione BOM
-- =============================================

USE [WebAppTEST]
GO

-- 1. Aggiungi colonne di audit alla tabella MA_ProjectArticles_BillOfMaterials
PRINT 'Aggiungendo colonne di audit per la costificazione...';

-- Colonna per l'utente che ha eseguito l'ultimo aggiornamento costi
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MA_ProjectArticles_BillOfMaterials') AND name = 'LastCostingUpdatedBy')
BEGIN
    ALTER TABLE [dbo].[MA_ProjectArticles_BillOfMaterials]
    ADD [LastCostingUpdatedBy] [int] NULL;
    PRINT 'Colonna LastCostingUpdatedBy aggiunta.';
END
ELSE
BEGIN
    PRINT 'Colonna LastCostingUpdatedBy già esistente.';
END

-- Colonna per la data/ora dell'ultimo aggiornamento costi
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MA_ProjectArticles_BillOfMaterials') AND name = 'LastCostingUpdatedAt')
BEGIN
    ALTER TABLE [dbo].[MA_ProjectArticles_BillOfMaterials]
    ADD [LastCostingUpdatedAt] [datetime2](7) NULL;
    PRINT 'Colonna LastCostingUpdatedAt aggiunta.';
END
ELSE
BEGIN
    PRINT 'Colonna LastCostingUpdatedAt già esistente.';
END

-- 2. Aggiungi commenti alle colonne
EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'ID dell''utente che ha eseguito l''ultimo aggiornamento della costificazione', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'MA_ProjectArticles_BillOfMaterials', 
    @level2type = N'COLUMN', @level2name = N'LastCostingUpdatedBy';

EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Data e ora dell''ultimo aggiornamento della costificazione', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'MA_ProjectArticles_BillOfMaterials', 
    @level2type = N'COLUMN', @level2name = N'LastCostingUpdatedAt';

PRINT 'Commenti alle colonne aggiunti.';

-- 3. Verifica struttura aggiornata
PRINT 'Verificando struttura aggiornata...';

SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    CHARACTER_MAXIMUM_LENGTH,
    NUMERIC_PRECISION,
    NUMERIC_SCALE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'MA_ProjectArticles_BillOfMaterials'
AND COLUMN_NAME IN ('LastCostingUpdatedBy', 'LastCostingUpdatedAt')
ORDER BY ORDINAL_POSITION;

PRINT 'Script completato con successo!';
