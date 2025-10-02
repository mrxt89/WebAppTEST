-- =============================================
-- SCRIPT: Integrazione Ricarichi Custom nel Calcolo BOM
-- Descrizione: Modifica la logica di calcolo per usare ricarichi custom BOM-specific
-- =============================================

USE [WebAppTEST]
GO

/*
IMPORTANTE: Questo script modifica SP_CalculateBOMCosting per usare ricarichi custom.

LOGICA:
1. Prima di calcolare, recupera i ricarichi effettivi con SP_GetEffectiveBOMMarkups
2. Usa quei ricarichi nel calcolo invece dei parametri globali
3. Se non ci sono ricarichi custom, usa i globali (comportamento attuale)

BACKUP CONSIGLIATO:
Prima di eseguire questo script, fare backup della SP esistente:

SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.SP_CalculateBOMCosting'))

OPPURE:

sp_helptext 'SP_CalculateBOMCosting'
*/

-- =============================================
-- Step 1: Creare una tabella temporanea per i ricarichi effettivi
-- =============================================

PRINT '=============================================';
PRINT 'IMPORTANTE: Integrazione Ricarichi Custom';
PRINT '=============================================';
PRINT '';
PRINT 'Questo script modifica SP_CalculateBOMCosting per usare ricarichi custom BOM-specific.';
PRINT '';
PRINT 'PRIMA DI PROCEDERE:';
PRINT '1. Fare BACKUP della SP esistente con:';
PRINT '   SELECT OBJECT_DEFINITION(OBJECT_ID(''dbo.SP_CalculateBOMCosting''))';
PRINT '';
PRINT '2. La nuova logica:';
PRINT '   - Chiama SP_GetEffectiveBOMMarkups per ottenere ricarichi effettivi';
PRINT '   - Se BOM ha ricarichi custom → usa quelli';
PRINT '   - Se BOM NON ha ricarichi custom → usa globali (default)';
PRINT '';
PRINT '3. Assicurarsi che SP_GetEffectiveBOMMarkups sia già stata creata';
PRINT '';
PRINT '=============================================';
PRINT '';

-- Verifica che SP_GetEffectiveBOMMarkups esista
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SP_GetEffectiveBOMMarkups]') AND type in (N'P', N'PC'))
BEGIN
    RAISERROR('ERRORE: SP_GetEffectiveBOMMarkups non trovata. Eseguire prima SP_GetEffectiveBOMMarkups.sql', 16, 1);
    RETURN;
END

PRINT 'OK: SP_GetEffectiveBOMMarkups trovata';
PRINT '';

-- =============================================
-- Step 2: Istruzioni per modificare SP_CalculateBOMCosting
-- =============================================

PRINT '=============================================';
PRINT 'ISTRUZIONI PER MODIFICARE SP_CalculateBOMCosting:';
PRINT '=============================================';
PRINT '';
PRINT 'Aggiungere questo codice ALL''INIZIO della SP (dopo SET NOCOUNT ON):';
PRINT '';
PRINT '-- Crea tabella temp per ricarichi effettivi';
PRINT 'CREATE TABLE #EffectiveMarkups (';
PRINT '    ParameterName NVARCHAR(100),';
PRINT '    MarkupPercentage FLOAT,';
PRINT '    Source NVARCHAR(20)';
PRINT ');';
PRINT '';
PRINT '-- Carica ricarichi effettivi (custom se presenti, altrimenti globali)';
PRINT 'INSERT INTO #EffectiveMarkups (ParameterName, MarkupPercentage, Source)';
PRINT 'EXEC SP_GetEffectiveBOMMarkups @CompanyId = @CompanyId, @BOMId = @BOMId;';
PRINT '';
PRINT '-- Variabili per i ricarichi da usare';
PRINT 'DECLARE @EffectiveMarkupRM FLOAT;';
PRINT 'DECLARE @EffectiveMarkupRMPurchase FLOAT;';
PRINT 'DECLARE @EffectiveMarkupRMProduction FLOAT;';
PRINT 'DECLARE @EffectiveMarkupOperations FLOAT;';
PRINT 'DECLARE @EffectiveMarkupInternalOps FLOAT;';
PRINT 'DECLARE @EffectiveMarkupExternalOps FLOAT;';
PRINT 'DECLARE @EffectiveMarkupOverhead FLOAT;';
PRINT '';
PRINT '-- Popola variabili dai ricarichi effettivi';
PRINT 'SELECT @EffectiveMarkupRM = MarkupPercentage FROM #EffectiveMarkups WHERE ParameterName = ''MARKUP_RM'';';
PRINT 'SELECT @EffectiveMarkupRMPurchase = MarkupPercentage FROM #EffectiveMarkups WHERE ParameterName = ''MARKUP_RM_ACQUISTO'';';
PRINT 'SELECT @EffectiveMarkupRMProduction = MarkupPercentage FROM #EffectiveMarkups WHERE ParameterName = ''MARKUP_RM_PRODUZIONE'';';
PRINT 'SELECT @EffectiveMarkupOperations = MarkupPercentage FROM #EffectiveMarkups WHERE ParameterName = ''MARKUP_LAVORAZIONI'';';
PRINT 'SELECT @EffectiveMarkupInternalOps = MarkupPercentage FROM #EffectiveMarkups WHERE ParameterName = ''MARKUP_LAV_INTERNE'';';
PRINT 'SELECT @EffectiveMarkupExternalOps = MarkupPercentage FROM #EffectiveMarkups WHERE ParameterName = ''MARKUP_LAV_ESTERNE'';';
PRINT 'SELECT @EffectiveMarkupOverhead = MarkupPercentage FROM #EffectiveMarkups WHERE ParameterName = ''MARKUP_GENERALE'';';
PRINT '';
PRINT '-- IMPORTANTE: Sostituire nel resto della SP tutte le referenze a parametri globali';
PRINT '-- con le variabili @EffectiveMarkup*';
PRINT '';
PRINT 'Esempio:';
PRINT '  PRIMA: ... WHERE ParameterName = ''MARKUP_RM'' ...';
PRINT '  DOPO:  ... @EffectiveMarkupRM ...';
PRINT '';
PRINT '=============================================';
PRINT '';

-- =============================================
-- Step 3: Template per la modifica
-- =============================================

PRINT '=============================================';
PRINT 'TEMPLATE SQL DA COPIARE E MODIFICARE:';
PRINT '=============================================';
PRINT '';
PRINT '/* INIZIO TEMPLATE - Copia da qui */';
PRINT '';
PRINT 'ALTER PROCEDURE [dbo].[SP_CalculateBOMCosting]';
PRINT '    @CompanyId INT,';
PRINT '    @BOMId BIGINT,';
PRINT '    @OrderQuantity DECIMAL(18,5) = NULL,';
PRINT '    @ScrapPercentage FLOAT = NULL,';
PRINT '    @UseGranularMarkups BIT = 1,';
PRINT '    @UpdateBOMRecord BIT = 0,';
PRINT '    @UserId INT = NULL,';
PRINT '    @Debug BIT = 0,';
PRINT '    @Version INT = NULL';
PRINT 'AS';
PRINT 'BEGIN';
PRINT '    SET NOCOUNT ON;';
PRINT '    ';
PRINT '    -- ========================================';
PRINT '    -- NUOVO: Carica ricarichi effettivi (custom o globali)';
PRINT '    -- ========================================';
PRINT '    CREATE TABLE #EffectiveMarkups (';
PRINT '        ParameterName NVARCHAR(100),';
PRINT '        MarkupPercentage FLOAT,';
PRINT '        Source NVARCHAR(20)';
PRINT '    );';
PRINT '    ';
PRINT '    INSERT INTO #EffectiveMarkups (ParameterName, MarkupPercentage, Source)';
PRINT '    EXEC SP_GetEffectiveBOMMarkups @CompanyId = @CompanyId, @BOMId = @BOMId;';
PRINT '    ';
PRINT '    DECLARE @EffectiveMarkupRM FLOAT;';
PRINT '    DECLARE @EffectiveMarkupRMPurchase FLOAT;';
PRINT '    DECLARE @EffectiveMarkupRMProduction FLOAT;';
PRINT '    DECLARE @EffectiveMarkupOperations FLOAT;';
PRINT '    DECLARE @EffectiveMarkupInternalOps FLOAT;';
PRINT '    DECLARE @EffectiveMarkupExternalOps FLOAT;';
PRINT '    DECLARE @EffectiveMarkupOverhead FLOAT;';
PRINT '    ';
PRINT '    SELECT @EffectiveMarkupRM = MarkupPercentage FROM #EffectiveMarkups WHERE ParameterName = ''MARKUP_RM'';';
PRINT '    SELECT @EffectiveMarkupRMPurchase = MarkupPercentage FROM #EffectiveMarkups WHERE ParameterName = ''MARKUP_RM_ACQUISTO'';';
PRINT '    SELECT @EffectiveMarkupRMProduction = MarkupPercentage FROM #EffectiveMarkups WHERE ParameterName = ''MARKUP_RM_PRODUZIONE'';';
PRINT '    SELECT @EffectiveMarkupOperations = MarkupPercentage FROM #EffectiveMarkups WHERE ParameterName = ''MARKUP_LAVORAZIONI'';';
PRINT '    SELECT @EffectiveMarkupInternalOps = MarkupPercentage FROM #EffectiveMarkups WHERE ParameterName = ''MARKUP_LAV_INTERNE'';';
PRINT '    SELECT @EffectiveMarkupExternalOps = MarkupPercentage FROM #EffectiveMarkups WHERE ParameterName = ''MARKUP_LAV_ESTERNE'';';
PRINT '    SELECT @EffectiveMarkupOverhead = MarkupPercentage FROM #EffectiveMarkups WHERE ParameterName = ''MARKUP_GENERALE'';';
PRINT '    ';
PRINT '    -- ========================================';
PRINT '    -- Qui continua il resto della SP esistente';
PRINT '    -- SOSTITUENDO i parametri globali con @EffectiveMarkup*';
PRINT '    -- ========================================';
PRINT '    ';
PRINT '    -- ... (resto della SP esistente) ...';
PRINT '    ';
PRINT '    -- ALLA FINE, prima di chiudere:';
PRINT '    DROP TABLE #EffectiveMarkups;';
PRINT 'END';
PRINT 'GO';
PRINT '';
PRINT '/* FINE TEMPLATE */';
PRINT '';

PRINT '=============================================';
PRINT 'PROSSIMI PASSI:';
PRINT '=============================================';
PRINT '';
PRINT '1. Eseguire: sp_helptext ''SP_CalculateBOMCosting''';
PRINT '   per vedere il codice attuale della SP';
PRINT '';
PRINT '2. Copiare il codice in un editor';
PRINT '';
PRINT '3. Aggiungere il template sopra all''inizio (dopo SET NOCOUNT ON)';
PRINT '';
PRINT '4. Sostituire tutte le referenze ai parametri globali con @EffectiveMarkup*';
PRINT '   Esempio:';
PRINT '   - Cercare: SELECT ParameterValue FROM MA_BOMCostingParameters WHERE ParameterName = ''MARKUP_RM''';
PRINT '   - Sostituire con: @EffectiveMarkupRM';
PRINT '';
PRINT '5. Aggiungere DROP TABLE #EffectiveMarkups; alla fine della SP';
PRINT '';
PRINT '6. Eseguire la ALTER PROCEDURE modificata';
PRINT '';
PRINT '7. Testare con: EXEC SP_CalculateBOMCosting @CompanyId = 1, @BOMId = 18822';
PRINT '';
PRINT '=============================================';

GO
