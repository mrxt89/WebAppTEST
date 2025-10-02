-- =============================================
-- Stored Procedure: SP_GetBOMCostingHistory (v2)
-- Descrizione: Recupera lo storico dei parametri di costificazione per una BOM
--              con supporto per ricarichi custom BOM-specific
-- =============================================

USE [WebAppTEST]
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SP_GetBOMCostingHistory]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[SP_GetBOMCostingHistory]
GO

CREATE PROCEDURE [dbo].[SP_GetBOMCostingHistory]
    @CompanyId INT,
    @BOMId BIGINT = NULL,
    @Top INT = NULL,
    @OrderBy NVARCHAR(50) = 'CostingDate DESC'
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- Query base comune
        ;WITH HistoryData AS (
            SELECT
                h.Id,
                h.CompanyId,
                h.BOMId,
                h.OrderQuantity,
                h.ScrapPercentage,
                h.UseGranularMarkups,
                h.UpdateBOMRecord,
                h.ParametersSnapshot,
                h.RMCost,
                h.ProcessingCost,
                h.TotalCost,
                h.TotalPrice,
                h.CostingDate,
                h.CalculatedBy,
                h.Notes,
                -- Ricarichi custom BOM-specific
                h.CustomMarkupRM,
                h.CustomMarkupRMPurchase,
                h.CustomMarkupRMProduction,
                h.CustomMarkupOperations,
                h.CustomMarkupInternalOps,
                h.CustomMarkupExternalOps,
                h.CustomMarkupOverhead,
                h.CustomMarkupsJSON,
                -- Audit
                h.TBCreated,
                h.TBCreatedId,
                -- Info BOM
                b.BOM AS BOMCode,
                b.Description AS BOMDescription,
                b.Version AS BOMVersion,
                -- Info utente
                ISNULL(u.firstName + ' ' + u.lastName, 'N/A') AS CalculatedByName
            FROM MA_BOMCostingHistory h
            INNER JOIN MA_ProjectArticles_BillOfMaterials b
                ON h.CompanyId = b.CompanyId AND h.BOMId = b.Id
            LEFT JOIN AR_Users u
                ON h.CalculatedBy = u.userId
            WHERE h.CompanyId = @CompanyId
              AND (@BOMId IS NULL OR h.BOMId = @BOMId)
        )
        SELECT *
        FROM HistoryData
        ORDER BY
            CASE WHEN @OrderBy = 'CostingDate DESC' THEN CostingDate END DESC,
            CASE WHEN @OrderBy = 'CostingDate ASC' THEN CostingDate END ASC,
            CASE WHEN @OrderBy = 'TotalCost DESC' THEN TotalCost END DESC,
            CASE WHEN @OrderBy = 'TotalCost ASC' THEN TotalCost END ASC
        OFFSET 0 ROWS
        FETCH NEXT ISNULL(@Top, 999999) ROWS ONLY;

    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

PRINT 'Stored Procedure SP_GetBOMCostingHistory (v2 con ricarichi custom) creata con successo'
GO
