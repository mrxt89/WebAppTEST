-- ===============================================================================
-- 20260204_00: Crea tabella tipo MA_CodingRules_ItemsToRecode
-- ===============================================================================
-- DESCRIZIONE:
-- Crea la tabella tipo (User-Defined Table Type) MA_CodingRules_ItemsToRecode
-- utilizzata come parametro READONLY nelle stored procedure di ricodifica batch.
--
-- NOTA: Questo file va eseguito PRIMA del file 20260204_03
-- ===============================================================================

USE [WebAppTEST]
GO

PRINT '========================================'
PRINT '20260204_00: Crea TYPE MA_CodingRules_ItemsToRecode'
PRINT '========================================'
PRINT ''

-- Elimina le stored procedure che usano il TYPE (devono essere ricreate dopo)
-- NOTA: Le stored procedure verranno ricreate manualmente con le modifiche necessarie
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'MA_CodingRules_ApplyBatch')
BEGIN
    PRINT 'Elimino stored procedure MA_CodingRules_ApplyBatch (usa il TYPE)...'
    DROP PROCEDURE [dbo].[MA_CodingRules_ApplyBatch];
    PRINT '✓ Stored procedure eliminata'
    PRINT ''
END

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'MA_CodingRules_ApplySimplifiedBatch')
BEGIN
    PRINT 'Elimino stored procedure MA_CodingRules_ApplySimplifiedBatch (usa il TYPE)...'
    DROP PROCEDURE [dbo].[MA_CodingRules_ApplySimplifiedBatch];
    PRINT '✓ Stored procedure eliminata'
    PRINT ''
END

-- Elimina il TYPE se esiste già (per ricrearlo)
IF EXISTS (SELECT 1 FROM sys.types WHERE name = 'MA_CodingRules_ItemsToRecode' AND is_table_type = 1)
BEGIN
    PRINT 'Elimino TYPE esistente...'
    DROP TYPE [dbo].[MA_CodingRules_ItemsToRecode];
    PRINT '✓ TYPE eliminato'
    PRINT ''
END

-- Crea il TYPE
PRINT 'Creo TYPE MA_CodingRules_ItemsToRecode...'

CREATE TYPE [dbo].[MA_CodingRules_ItemsToRecode] AS TABLE (
    [ItemId] BIGINT NOT NULL,
    [OldCode] VARCHAR(64) NULL,
    [NewCode] VARCHAR(64) NULL,
    [NewDescription] NVARCHAR(128) NULL,
    [MacroFamilyId] BIGINT NULL,
    [FamilyId] BIGINT NULL,
    [TypeId] BIGINT NULL,
    [AliasId] BIGINT NULL,
    [Measures] VARCHAR(2) NULL,
    [Sequential] INT NULL,
    [UseExistingArticleId] BIGINT NULL,
    [ReplaceWithExisting] BIT NULL,
    [TechnicalCharacteristicsJSON] NVARCHAR(MAX) NULL  -- NUOVO: Campo JSON per caratteristiche tecniche
);
GO

PRINT '✓ TYPE MA_CodingRules_ItemsToRecode creato con successo'
PRINT ''
PRINT '========================================'
PRINT 'Colonne del TYPE:'
PRINT '========================================'
PRINT '  - ItemId (BIGINT)'
PRINT '  - OldCode (VARCHAR(64))'
PRINT '  - NewCode (VARCHAR(64))'
PRINT '  - NewDescription (NVARCHAR(128))'
PRINT '  - MacroFamilyId (BIGINT)'
PRINT '  - FamilyId (BIGINT)'
PRINT '  - TypeId (BIGINT)'
PRINT '  - AliasId (BIGINT)'
PRINT '  - Measures (VARCHAR(2))'
PRINT '  - Sequential (INT)'
PRINT '  - UseExistingArticleId (BIGINT)'
PRINT '  - ReplaceWithExisting (BIT)'
PRINT '  - TechnicalCharacteristicsJSON (NVARCHAR(MAX)) ← NUOVO'
PRINT ''
PRINT '========================================'
PRINT 'COMPLETATO'
PRINT '========================================'
PRINT ''
PRINT '⚠️  ATTENZIONE IMPORTANTE:'
PRINT '========================================'
PRINT 'Le stored procedure seguenti sono state eliminate:'
PRINT '  - MA_CodingRules_ApplyBatch'
PRINT '  - MA_CodingRules_ApplySimplifiedBatch'
PRINT ''
PRINT 'RICREALE usando i file:'
PRINT '  - 20260204_06_RecreateMA_CodingRules_ApplyBatch_Complete.sql'
PRINT '  - 20260204_07_RecreateMA_CodingRules_ApplySimplifiedBatch_Complete.sql'
PRINT ''
PRINT 'Ora puoi eseguire i file 06 e 07 per ricreare le stored procedure'
PRINT ''
GO
