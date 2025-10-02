-- =============================================
-- Stored Procedure: SP_SaveBOMCostingHistory (v2)
-- Descrizione: Salva lo snapshot dei parametri di costificazione utilizzati
--              con supporto per ricarichi custom BOM-specific
-- =============================================

USE [WebAppTEST]
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SP_SaveBOMCostingHistory]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[SP_SaveBOMCostingHistory]
GO

CREATE PROCEDURE [dbo].[SP_SaveBOMCostingHistory]
    @CompanyId INT,
    @BOMId BIGINT,
    @OrderQuantity DECIMAL(18, 5) = NULL,
    @ScrapPercentage FLOAT = NULL,
    @UseGranularMarkups BIT = NULL,
    @UpdateBOMRecord BIT = NULL,
    @ParametersSnapshot NVARCHAR(MAX) = NULL,
    @RMCost FLOAT = NULL,
    @ProcessingCost FLOAT = NULL,
    @TotalCost FLOAT = NULL,
    @TotalPrice FLOAT = NULL,
    @CalculatedBy INT = NULL,
    @Notes NVARCHAR(MAX) = NULL,
    -- Nuovi parametri per ricarichi custom BOM-specific
    @CustomMarkupRM FLOAT = NULL,
    @CustomMarkupRMPurchase FLOAT = NULL,
    @CustomMarkupRMProduction FLOAT = NULL,
    @CustomMarkupOperations FLOAT = NULL,
    @CustomMarkupInternalOps FLOAT = NULL,
    @CustomMarkupExternalOps FLOAT = NULL,
    @CustomMarkupOverhead FLOAT = NULL,
    @CustomMarkupsJSON NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NewHistoryId BIGINT;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Se ParametersSnapshot non è fornito, crea uno snapshot dei parametri GLOBALI correnti
        -- (per riferimento/confronto con i custom)
        IF @ParametersSnapshot IS NULL
        BEGIN
            -- Recupera i parametri globali di costificazione
            SELECT @ParametersSnapshot = (
                SELECT
                    ParameterName,
                    ParameterValue,
                    Description
                FROM MA_BOMCostingParameters
                WHERE CompanyId = @CompanyId AND IsActive = 1
                FOR JSON PATH
            );
        END

        -- Inserisci il record storico con ricarichi custom
        INSERT INTO MA_BOMCostingHistory (
            CompanyId,
            BOMId,
            OrderQuantity,
            ScrapPercentage,
            UseGranularMarkups,
            UpdateBOMRecord,
            ParametersSnapshot,
            RMCost,
            ProcessingCost,
            TotalCost,
            TotalPrice,
            CostingDate,
            CalculatedBy,
            Notes,
            -- Ricarichi custom BOM-specific
            CustomMarkupRM,
            CustomMarkupRMPurchase,
            CustomMarkupRMProduction,
            CustomMarkupOperations,
            CustomMarkupInternalOps,
            CustomMarkupExternalOps,
            CustomMarkupOverhead,
            CustomMarkupsJSON,
            -- Audit
            TBCreated,
            TBCreatedId
        )
        VALUES (
            @CompanyId,
            @BOMId,
            @OrderQuantity,
            @ScrapPercentage,
            @UseGranularMarkups,
            @UpdateBOMRecord,
            @ParametersSnapshot,
            @RMCost,
            @ProcessingCost,
            @TotalCost,
            @TotalPrice,
            GETDATE(),
            @CalculatedBy,
            @Notes,
            -- Ricarichi custom
            @CustomMarkupRM,
            @CustomMarkupRMPurchase,
            @CustomMarkupRMProduction,
            @CustomMarkupOperations,
            @CustomMarkupInternalOps,
            @CustomMarkupExternalOps,
            @CustomMarkupOverhead,
            @CustomMarkupsJSON,
            -- Audit
            GETDATE(),
            @CalculatedBy
        );

        SET @NewHistoryId = SCOPE_IDENTITY();

        -- Restituisci il record appena creato con tutti i campi inclusi i ricarichi custom
        SELECT
            Id,
            CompanyId,
            BOMId,
            OrderQuantity,
            ScrapPercentage,
            UseGranularMarkups,
            UpdateBOMRecord,
            ParametersSnapshot,
            RMCost,
            ProcessingCost,
            TotalCost,
            TotalPrice,
            CostingDate,
            CalculatedBy,
            Notes,
            -- Ricarichi custom
            CustomMarkupRM,
            CustomMarkupRMPurchase,
            CustomMarkupRMProduction,
            CustomMarkupOperations,
            CustomMarkupInternalOps,
            CustomMarkupExternalOps,
            CustomMarkupOverhead,
            CustomMarkupsJSON,
            TBCreated,
            TBCreatedId
        FROM MA_BOMCostingHistory
        WHERE Id = @NewHistoryId;

        COMMIT TRANSACTION;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

PRINT 'Stored Procedure SP_SaveBOMCostingHistory (v2 con ricarichi custom) creata con successo'
GO
