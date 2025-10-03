-- =============================================
-- FIX BOM COSTING PARAMETER MAPPING
-- Corregge la mappatura tra parametri frontend e stored procedure
-- =============================================

USE [WebAppTEST]
GO

-- ========================================
-- 1. AGGIORNA NOMI PARAMETRI PER CORRISPONDERE AL FRONTEND
-- ========================================

-- Aggiorna i parametri esistenti per usare i nomi del frontend
UPDATE MA_BOMCostingParameters 
SET ParameterName = 'RICARICO_MP'
WHERE ParameterName = 'MARKUP_RM' AND CompanyId IN (SELECT CompanyId FROM MA_Companies);

UPDATE MA_BOMCostingParameters 
SET ParameterName = 'RICARICO_OPE'
WHERE ParameterName = 'MARKUP_LAVORAZIONI' AND CompanyId IN (SELECT CompanyId FROM MA_Companies);

UPDATE MA_BOMCostingParameters 
SET ParameterName = 'RICARICO_TRASPORTO'
WHERE ParameterName = 'MARKUP_LAV_ESTERNE' AND CompanyId IN (SELECT CompanyId FROM MA_Companies);

UPDATE MA_BOMCostingParameters 
SET ParameterName = 'RICARICO_SCARTO'
WHERE ParameterName = 'MARKUP_LAV_INTERNE' AND CompanyId IN (SELECT CompanyId FROM MA_Companies);

UPDATE MA_BOMCostingParameters 
SET ParameterName = 'RICARICO_TOTALE'
WHERE ParameterName = 'MARKUP_GENERALE' AND CompanyId IN (SELECT CompanyId FROM MA_Companies);

-- Aggiungi RICARICO_SCONTO se mancante
INSERT INTO MA_BOMCostingParameters (CompanyId, ParameterName, ParameterValue, Description, IsActive, TBCreated, TBModified)
SELECT 
    c.CompanyId,
    'RICARICO_SCONTO',
    0.00, -- 0% default
    'Ricarico percentuale sconto (%)',
    1,
    GETDATE(),
    GETDATE()
FROM MA_Companies c
WHERE NOT EXISTS (
    SELECT 1 FROM MA_BOMCostingParameters p 
    WHERE p.CompanyId = c.CompanyId AND p.ParameterName = 'RICARICO_SCONTO'
);

-- ========================================
-- 2. AGGIORNA SP_GetEffectiveBOMMarkups
-- ========================================

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SP_GetEffectiveBOMMarkups]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[SP_GetEffectiveBOMMarkups]
GO

CREATE PROCEDURE [dbo].[SP_GetEffectiveBOMMarkups]
    @CompanyId INT,
    @BOMId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- Variabili per i ricarichi custom
        DECLARE @CustomMarkupRM FLOAT = NULL;
        DECLARE @CustomMarkupOperations FLOAT = NULL;
        DECLARE @CustomMarkupTrasporto FLOAT = NULL;
        DECLARE @CustomMarkupScarto FLOAT = NULL;
        DECLARE @CustomMarkupTotale FLOAT = NULL;
        DECLARE @CustomMarkupSconto FLOAT = NULL;

        -- Variabili per i ricarichi globali
        DECLARE @GlobalMarkupRM FLOAT = NULL;
        DECLARE @GlobalMarkupOperations FLOAT = NULL;
        DECLARE @GlobalMarkupTrasporto FLOAT = NULL;
        DECLARE @GlobalMarkupScarto FLOAT = NULL;
        DECLARE @GlobalMarkupTotale FLOAT = NULL;
        DECLARE @GlobalMarkupSconto FLOAT = NULL;

        -- 1. Carica ricarichi CUSTOM dall'ultimo record storico per questa BOM
        SELECT TOP 1
            @CustomMarkupRM = CustomMarkupRM,
            @CustomMarkupOperations = CustomMarkupOperations,
            @CustomMarkupTrasporto = CustomMarkupExternalOps, -- Mappa a trasporto
            @CustomMarkupScarto = CustomMarkupInternalOps,     -- Mappa a scarto
            @CustomMarkupTotale = CustomMarkupOverhead,       -- Mappa a totale
            @CustomMarkupSconto = 0.00                        -- Default per sconto
        FROM MA_BOMCostingHistory
        WHERE CompanyId = @CompanyId
          AND BOMId = @BOMId
        ORDER BY CostingDate DESC;

        -- 2. Carica ricarichi GLOBALI con i nuovi nomi
        SELECT
            @GlobalMarkupRM = MAX(CASE WHEN ParameterName = 'RICARICO_MP' THEN ParameterValue END),
            @GlobalMarkupOperations = MAX(CASE WHEN ParameterName = 'RICARICO_OPE' THEN ParameterValue END),
            @GlobalMarkupTrasporto = MAX(CASE WHEN ParameterName = 'RICARICO_TRASPORTO' THEN ParameterValue END),
            @GlobalMarkupScarto = MAX(CASE WHEN ParameterName = 'RICARICO_SCARTO' THEN ParameterValue END),
            @GlobalMarkupTotale = MAX(CASE WHEN ParameterName = 'RICARICO_TOTALE' THEN ParameterValue END),
            @GlobalMarkupSconto = MAX(CASE WHEN ParameterName = 'RICARICO_SCONTO' THEN ParameterValue END)
        FROM MA_BOMCostingParameters
        WHERE CompanyId = @CompanyId
          AND IsActive = 1;

        -- 3. Restituisci ricarichi EFFETTIVI (Custom se presente, altrimenti Globale)
        --    Converti da percentuale decimale (es: 0.25) a percentuale (es: 25)
        SELECT
            'RICARICO_MP' as ParameterName,
            ISNULL(@CustomMarkupRM, @GlobalMarkupRM) * 100 as MarkupPercentage,
            CASE WHEN @CustomMarkupRM IS NOT NULL THEN 'Custom' ELSE 'Global' END as Source
        UNION ALL
        SELECT
            'RICARICO_OPE' as ParameterName,
            ISNULL(@CustomMarkupOperations, @GlobalMarkupOperations) * 100 as MarkupPercentage,
            CASE WHEN @CustomMarkupOperations IS NOT NULL THEN 'Custom' ELSE 'Global' END as Source
        UNION ALL
        SELECT
            'RICARICO_TRASPORTO' as ParameterName,
            ISNULL(@CustomMarkupTrasporto, @GlobalMarkupTrasporto) * 100 as MarkupPercentage,
            CASE WHEN @CustomMarkupTrasporto IS NOT NULL THEN 'Custom' ELSE 'Global' END as Source
        UNION ALL
        SELECT
            'RICARICO_SCARTO' as ParameterName,
            ISNULL(@CustomMarkupScarto, @GlobalMarkupScarto) * 100 as MarkupPercentage,
            CASE WHEN @CustomMarkupScarto IS NOT NULL THEN 'Custom' ELSE 'Global' END as Source
        UNION ALL
        SELECT
            'RICARICO_TOTALE' as ParameterName,
            ISNULL(@CustomMarkupTotale, @GlobalMarkupTotale) * 100 as MarkupPercentage,
            CASE WHEN @CustomMarkupTotale IS NOT NULL THEN 'Custom' ELSE 'Global' END as Source
        UNION ALL
        SELECT
            'RICARICO_SCONTO' as ParameterName,
            ISNULL(@CustomMarkupSconto, @GlobalMarkupSconto) * 100 as MarkupPercentage,
            CASE WHEN @CustomMarkupSconto IS NOT NULL THEN 'Custom' ELSE 'Global' END as Source;

    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(MAX) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

-- ========================================
-- 3. AGGIORNA SP_CalculateBOMCosting
-- ========================================

-- Aggiorna la mappatura nella stored procedure principale
-- (Questo richiede di modificare SP_CalculateBOMCosting_v2_WithCustomMarkups.sql)

-- ========================================
-- 4. VERIFICA RISULTATO
-- ========================================

SELECT 
    p.CompanyId,
    c.CompanyName,
    p.ParameterName,
    p.ParameterValue,
    p.Description,
    p.IsActive
FROM MA_BOMCostingParameters p
JOIN MA_Companies c ON p.CompanyId = c.CompanyId
WHERE p.ParameterName IN (
    'RICARICO_MP',
    'RICARICO_OPE', 
    'RICARICO_TRASPORTO',
    'RICARICO_SCARTO',
    'RICARICO_TOTALE',
    'RICARICO_SCONTO'
)
ORDER BY p.CompanyId, p.ParameterName;

PRINT '✅ Mappatura parametri BOM Costing corretta!';
PRINT '';
PRINT 'Parametri aggiornati:';
PRINT '- RICARICO_MP (ex MARKUP_RM)';
PRINT '- RICARICO_OPE (ex MARKUP_LAVORAZIONI)';
PRINT '- RICARICO_TRASPORTO (ex MARKUP_LAV_ESTERNE)';
PRINT '- RICARICO_SCARTO (ex MARKUP_LAV_INTERNE)';
PRINT '- RICARICO_TOTALE (ex MARKUP_GENERALE)';
PRINT '- RICARICO_SCONTO (nuovo)';
PRINT '';
PRINT 'SP_GetEffectiveBOMMarkups aggiornata per usare i nuovi nomi';
GO
