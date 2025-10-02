-- =============================================
-- Stored Procedure: SP_GetEffectiveBOMMarkups
-- Descrizione: Recupera i ricarichi effettivi per una BOM
--              Priorità: Custom BOM > Globali
-- =============================================

USE [WebAppTEST]
GO

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
        DECLARE @CustomMarkupRMPurchase FLOAT = NULL;
        DECLARE @CustomMarkupRMProduction FLOAT = NULL;
        DECLARE @CustomMarkupOperations FLOAT = NULL;
        DECLARE @CustomMarkupInternalOps FLOAT = NULL;
        DECLARE @CustomMarkupExternalOps FLOAT = NULL;
        DECLARE @CustomMarkupOverhead FLOAT = NULL;

        -- Variabili per i ricarichi globali
        DECLARE @GlobalMarkupRM FLOAT = NULL;
        DECLARE @GlobalMarkupRMPurchase FLOAT = NULL;
        DECLARE @GlobalMarkupRMProduction FLOAT = NULL;
        DECLARE @GlobalMarkupOperations FLOAT = NULL;
        DECLARE @GlobalMarkupInternalOps FLOAT = NULL;
        DECLARE @GlobalMarkupExternalOps FLOAT = NULL;
        DECLARE @GlobalMarkupOverhead FLOAT = NULL;

        -- 1. Carica ricarichi CUSTOM dall'ultimo record storico per questa BOM
        SELECT TOP 1
            @CustomMarkupRM = CustomMarkupRM,
            @CustomMarkupRMPurchase = CustomMarkupRMPurchase,
            @CustomMarkupRMProduction = CustomMarkupRMProduction,
            @CustomMarkupOperations = CustomMarkupOperations,
            @CustomMarkupInternalOps = CustomMarkupInternalOps,
            @CustomMarkupExternalOps = CustomMarkupExternalOps,
            @CustomMarkupOverhead = CustomMarkupOverhead
        FROM MA_BOMCostingHistory
        WHERE CompanyId = @CompanyId
          AND BOMId = @BOMId
        ORDER BY CostingDate DESC;

        -- 2. Carica ricarichi GLOBALI
        SELECT
            @GlobalMarkupRM = MAX(CASE WHEN ParameterName = 'MARKUP_RM' THEN ParameterValue END),
            @GlobalMarkupRMPurchase = MAX(CASE WHEN ParameterName = 'MARKUP_RM_ACQUISTO' THEN ParameterValue END),
            @GlobalMarkupRMProduction = MAX(CASE WHEN ParameterName = 'MARKUP_RM_PRODUZIONE' THEN ParameterValue END),
            @GlobalMarkupOperations = MAX(CASE WHEN ParameterName = 'MARKUP_LAVORAZIONI' THEN ParameterValue END),
            @GlobalMarkupInternalOps = MAX(CASE WHEN ParameterName = 'MARKUP_LAV_INTERNE' THEN ParameterValue END),
            @GlobalMarkupExternalOps = MAX(CASE WHEN ParameterName = 'MARKUP_LAV_ESTERNE' THEN ParameterValue END),
            @GlobalMarkupOverhead = MAX(CASE WHEN ParameterName = 'MARKUP_GENERALE' THEN ParameterValue END)
        FROM MA_BOMCostingParameters
        WHERE CompanyId = @CompanyId
          AND IsActive = 1;

        -- 3. Restituisci ricarichi EFFETTIVI (Custom se presente, altrimenti Globale)
        --    Converti da percentuale decimale (es: 0.25) a percentuale (es: 25)
        SELECT
            'MARKUP_RM' as ParameterName,
            ISNULL(@CustomMarkupRM, @GlobalMarkupRM) * 100 as MarkupPercentage,
            CASE WHEN @CustomMarkupRM IS NOT NULL THEN 'Custom' ELSE 'Global' END as Source
        UNION ALL
        SELECT
            'MARKUP_RM_ACQUISTO' as ParameterName,
            ISNULL(@CustomMarkupRMPurchase, @GlobalMarkupRMPurchase) * 100 as MarkupPercentage,
            CASE WHEN @CustomMarkupRMPurchase IS NOT NULL THEN 'Custom' ELSE 'Global' END as Source
        UNION ALL
        SELECT
            'MARKUP_RM_PRODUZIONE' as ParameterName,
            ISNULL(@CustomMarkupRMProduction, @GlobalMarkupRMProduction) * 100 as MarkupPercentage,
            CASE WHEN @CustomMarkupRMProduction IS NOT NULL THEN 'Custom' ELSE 'Global' END as Source
        UNION ALL
        SELECT
            'MARKUP_LAVORAZIONI' as ParameterName,
            ISNULL(@CustomMarkupOperations, @GlobalMarkupOperations) * 100 as MarkupPercentage,
            CASE WHEN @CustomMarkupOperations IS NOT NULL THEN 'Custom' ELSE 'Global' END as Source
        UNION ALL
        SELECT
            'MARKUP_LAV_INTERNE' as ParameterName,
            ISNULL(@CustomMarkupInternalOps, @GlobalMarkupInternalOps) * 100 as MarkupPercentage,
            CASE WHEN @CustomMarkupInternalOps IS NOT NULL THEN 'Custom' ELSE 'Global' END as Source
        UNION ALL
        SELECT
            'MARKUP_LAV_ESTERNE' as ParameterName,
            ISNULL(@CustomMarkupExternalOps, @GlobalMarkupExternalOps) * 100 as MarkupPercentage,
            CASE WHEN @CustomMarkupExternalOps IS NOT NULL THEN 'Custom' ELSE 'Global' END as Source
        UNION ALL
        SELECT
            'MARKUP_GENERALE' as ParameterName,
            ISNULL(@CustomMarkupOverhead, @GlobalMarkupOverhead) * 100 as MarkupPercentage,
            CASE WHEN @CustomMarkupOverhead IS NOT NULL THEN 'Custom' ELSE 'Global' END as Source;

    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

PRINT 'Stored Procedure SP_GetEffectiveBOMMarkups creata con successo'
GO

-- Test della SP
-- EXEC SP_GetEffectiveBOMMarkups @CompanyId = 1, @BOMId = 18822;
