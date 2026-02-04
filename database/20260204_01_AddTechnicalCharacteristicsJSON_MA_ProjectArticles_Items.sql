-- ===============================================================================
-- 20260204_01: Aggiunge campo JSON per caratteristiche tecniche
-- ===============================================================================
-- DESCRIZIONE:
-- Aggiunge il campo TechnicalCharacteristicsJSON alla tabella MA_ProjectArticles_Items
-- per memorizzare tutte le caratteristiche tecniche inserite durante la ricodifica.
-- Questo campo diventa la fonte primaria per:
-- - Ripopolare il modale di ricodifica
-- - Generare la descrizione normalizzata
-- - Sincronizzare i campi hardcoded (Diameter, Bxh, Depth, Length, MediumRadius)
--
-- NOTA: I campi hardcoded rimangono per compatibilità con stored procedure esistenti
-- e vengono sincronizzati automaticamente dal JSON durante la ricodifica.
-- ===============================================================================

USE [WebAppTEST]
GO

PRINT '========================================'
PRINT '20260204_01: Aggiunge TechnicalCharacteristicsJSON'
PRINT '========================================'
PRINT ''

-- Verifica se la colonna esiste già
IF NOT EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.MA_ProjectArticles_Items') 
    AND name = 'TechnicalCharacteristicsJSON'
)
BEGIN
    PRINT 'Aggiungo colonna TechnicalCharacteristicsJSON...'
    
    ALTER TABLE [dbo].[MA_ProjectArticles_Items]
    ADD [TechnicalCharacteristicsJSON] NVARCHAR(MAX) NULL;
    
    PRINT '✓ Colonna TechnicalCharacteristicsJSON aggiunta con successo'
    PRINT ''
END
ELSE
BEGIN
    PRINT '⚠ Colonna TechnicalCharacteristicsJSON già esistente, skip'
    PRINT ''
END

-- Aggiungi commento alla colonna
EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'JSON con tutte le caratteristiche tecniche inserite durante la ricodifica. Formato: {"DIAMETRO": "20", "RAGGIOM": "15", ...}. Fonte primaria per ripopolare modale e generare descrizioni.', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'MA_ProjectArticles_Items', 
    @level2type = N'COLUMN', @level2name = N'TechnicalCharacteristicsJSON';

PRINT '✓ Commento aggiunto alla colonna'
PRINT ''
PRINT '========================================'
PRINT 'COMPLETATO'
PRINT '========================================'
GO
