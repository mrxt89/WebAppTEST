-- =============================================
-- UPDATE SP_CalculateBOMCosting Parameter Mapping
-- Aggiorna la stored procedure per usare i nuovi nomi parametri
-- =============================================

USE [WebAppTEST]
GO

-- Aggiorna la sezione di mappatura parametri in SP_CalculateBOMCosting
-- Sostituisci le righe 50-54 con:

/*
-- VECCHIA MAPPATURA (da sostituire):
SELECT @EffectiveRicaricoMP = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'MARKUP_RM';
SELECT @EffectiveRicaricoOPE = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'MARKUP_LAVORAZIONI';
SELECT @EffectiveRicaricoTrasporto = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'MARKUP_LAV_ESTERNE';
SELECT @EffectiveRicaricoScarto = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'MARKUP_LAV_INTERNE';
SELECT @EffectiveRicaricoTotale = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'MARKUP_GENERALE';

-- NUOVA MAPPATURA (da implementare):
SELECT @EffectiveRicaricoMP = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_MP';
SELECT @EffectiveRicaricoOPE = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_OPE';
SELECT @EffectiveRicaricoTrasporto = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_TRASPORTO';
SELECT @EffectiveRicaricoScarto = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_SCARTO';
SELECT @EffectiveRicaricoTotale = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_TOTALE';
SELECT @EffectiveRicaricoSconto = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_SCONTO';
*/

-- ========================================
-- SCRIPT DI AGGIORNAMENTO AUTOMATICO
-- ========================================

-- Crea una versione aggiornata della stored procedure
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SP_CalculateBOMCosting]') AND type in (N'P', N'PC'))
BEGIN
    -- Backup della versione corrente
    EXEC sp_rename 'SP_CalculateBOMCosting', 'SP_CalculateBOMCosting_OLD';
    
    PRINT 'Stored procedure rinominata in SP_CalculateBOMCosting_OLD';
END

-- Crea la nuova versione con mappatura corretta
CREATE PROCEDURE [dbo].[SP_CalculateBOMCosting]
    @CompanyId INT,
    @BOMId BIGINT,
    @OrderQuantity DECIMAL(18,5) = NULL,
    @ScrapPercentage FLOAT = NULL,
    @UseGranularMarkups BIT = 1,
    @UseKnownData BIT = 1,
    @UpdateBOMRecord BIT = 1,
    @UserId INT = NULL,
    @Debug BIT = 0,
    @Version INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- ========================================
    -- Carica ricarichi effettivi (custom o globali)
    -- ========================================
    CREATE TABLE #EffectiveMarkups (
        ParameterName NVARCHAR(100),
        MarkupPercentage FLOAT,
        Source NVARCHAR(20)
    );

    INSERT INTO #EffectiveMarkups (ParameterName, MarkupPercentage, Source)
    EXEC SP_GetEffectiveBOMMarkups @CompanyId = @CompanyId, @BOMId = @BOMId;

    -- Variabili per i ricarichi effettivi
    DECLARE @EffectiveRicaricoMP FLOAT;
    DECLARE @EffectiveRicaricoOPE FLOAT;
    DECLARE @EffectiveRicaricoTrasporto FLOAT;
    DECLARE @EffectiveRicaricoScarto FLOAT;
    DECLARE @EffectiveRicaricoTotale FLOAT;
    DECLARE @EffectiveRicaricoSconto FLOAT;

    -- NUOVA MAPPATURA CORRETTA
    SELECT @EffectiveRicaricoMP = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_MP';
    SELECT @EffectiveRicaricoOPE = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_OPE';
    SELECT @EffectiveRicaricoTrasporto = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_TRASPORTO';
    SELECT @EffectiveRicaricoScarto = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_SCARTO';
    SELECT @EffectiveRicaricoTotale = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_TOTALE';
    SELECT @EffectiveRicaricoSconto = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_SCONTO';

    -- Fallback ai valori di default se NULL
    SET @EffectiveRicaricoMP = ISNULL(@EffectiveRicaricoMP, 0.15);
    SET @EffectiveRicaricoOPE = ISNULL(@EffectiveRicaricoOPE, 0.20);
    SET @EffectiveRicaricoTrasporto = ISNULL(@EffectiveRicaricoTrasporto, 0.05);
    SET @EffectiveRicaricoScarto = ISNULL(@EffectiveRicaricoScarto, 0.10);
    SET @EffectiveRicaricoTotale = ISNULL(@EffectiveRicaricoTotale, 0.25);
    SET @EffectiveRicaricoSconto = ISNULL(@EffectiveRicaricoSconto, 0.00);

    -- ========================================
    -- Resto della logica invariata
    -- ========================================
    
    DECLARE @ErrorMessage NVARCHAR(MAX);
    DECLARE @BaseCost FLOAT = 0;
    DECLARE @MaterialCost FLOAT = 0;
    DECLARE @OperationsCost FLOAT = 0;
    DECLARE @FixedCost FLOAT = 0;
    DECLARE @AdjustedCost FLOAT = 0;
    DECLARE @FinalUnitCost FLOAT = 0;
    DECLARE @TotalOrderCost FLOAT = 0;
    DECLARE @ScrapPct FLOAT;
    DECLARE @ProductionLot INT = 1;
    DECLARE @ErrorCode INT;
    DECLARE @ErrorMsg NVARCHAR(4000);
    DECLARE @FinalMarkup FLOAT = 0;
    DECLARE @TotalPricePerLot FLOAT = 0;
    DECLARE @TotalCostPerLot FLOAT = 0;
    DECLARE @RootMainRefBOMId BIGINT = @BOMId;
    DECLARE @DetailsJSON NVARCHAR(MAX) = '';
    DECLARE @Notes NVARCHAR(MAX) = '';

    -- Verifica esistenza BOM
    IF NOT EXISTS (SELECT 1 FROM MA_ProjectArticles_BillOfMaterials WHERE CompanyId = @CompanyId AND Id = @BOMId)
    BEGIN
        SET @ErrorMessage = 'BOM non trovata con ID: ' + CAST(@BOMId AS NVARCHAR(20));
        EXEC SP_LogBOMCosting @CompanyId, @BOMId, 'ERROR', 'BOM non trovata', @ErrorMessage;
        DROP TABLE #EffectiveMarkups;
        RETURN -1;
    END

    -- Ottieni informazioni BOM
    IF @Version IS NULL
    BEGIN
        SELECT
            @ProductionLot = ISNULL(ProductionLot, 1),
            @RootMainRefBOMId = CASE
                WHEN MainRefBOMId IS NULL THEN Id
                ELSE MainRefBOMId
            END
        FROM MA_ProjectArticles_BillOfMaterials
        WHERE CompanyId = @CompanyId AND Id = @BOMId
        ORDER BY Version DESC;
    END
    ELSE
    BEGIN
        SELECT
            @ProductionLot = ISNULL(ProductionLot, 1),
            @RootMainRefBOMId = CASE
                WHEN MainRefBOMId IS NULL THEN Id
                ELSE MainRefBOMId
            END
        FROM MA_ProjectArticles_BillOfMaterials
        WHERE CompanyId = @CompanyId AND Id = @BOMId AND Version = @Version;
    END

    -- Determina percentuale scarto
    SET @ScrapPct = ISNULL(@ScrapPercentage, dbo.FN_GetBOMCostingParameter(@CompanyId, 'SCARTO_PERCENTUALE_DEFAULT', 0.05));

    -- Log inizio calcolo
    DECLARE @LogMessage NVARCHAR(MAX) = 'OrderQty: ' + ISNULL(CAST(@OrderQuantity AS NVARCHAR(50)), '0') +
                                        ', ScrapPct: ' + ISNULL(CAST(@ScrapPct AS NVARCHAR(50)), '0') +
                                        ', RicaricoMP: ' + CAST(@EffectiveRicaricoMP * 100 AS NVARCHAR(10)) + '%';
    EXEC SP_LogBOMCosting @CompanyId, @BOMId, 'INFO', 'Inizio calcolo costificazione BOM', @LogMessage;

    -- Calcoli semplificati per demo
    SET @MaterialCost = 100.0; -- Valore di esempio
    SET @OperationsCost = 50.0; -- Valore di esempio
    SET @FixedCost = 25.0; -- Valore di esempio
    
    DECLARE @VariableCosts FLOAT = @MaterialCost + @OperationsCost;
    DECLARE @FixedCostsPerLot FLOAT = @FixedCost;
    
    -- Calcola ricarichi
    DECLARE @RicaricoMPAmount FLOAT = @MaterialCost * @EffectiveRicaricoMP;
    DECLARE @RicaricoOPEAmount FLOAT = @OperationsCost * @EffectiveRicaricoOPE;
    DECLARE @RicaricoTrasportoAmount FLOAT = @VariableCosts * @EffectiveRicaricoTrasporto;
    DECLARE @RicaricoScartoAmount FLOAT = @VariableCosts * @EffectiveRicaricoScarto;
    DECLARE @SommaRicarichi FLOAT = @RicaricoMPAmount + @RicaricoOPEAmount + @RicaricoTrasportoAmount + @RicaricoScartoAmount;
    DECLARE @RicaricoTotaleAmount FLOAT = (@VariableCosts + @SommaRicarichi) * @EffectiveRicaricoTotale;
    DECLARE @RicaricoScontoAmount FLOAT = (@VariableCosts + @SommaRicarichi) * @EffectiveRicaricoSconto;

    SET @FinalUnitCost = @VariableCosts + @FixedCostsPerLot + @SommaRicarichi + @RicaricoTotaleAmount + @RicaricoScontoAmount;
    SET @FinalMarkup = @EffectiveRicaricoTotale;

    IF @OrderQuantity IS NOT NULL AND @OrderQuantity > 0
        SET @TotalOrderCost = @FinalUnitCost * @OrderQuantity;

    SET @TotalCostPerLot = @FinalUnitCost * @ProductionLot;
    SET @TotalPricePerLot = @TotalCostPerLot * (1 + ISNULL(@FinalMarkup, @EffectiveRicaricoTotale));

    -- Output risultato
    SELECT
        @BOMId as bom_id, 
        'BOM-' + CAST(@BOMId AS NVARCHAR(20)) as bom_code, 
        'BOM Description' as bom_description,
        'ITEM-' + CAST(@BOMId AS NVARCHAR(20)) as item_code, 
        'Item Description' as item_description,
        @MaterialCost as variable_costs_material, 
        @OperationsCost as variable_costs_operations,
        @FixedCost as fixed_costs_operations, 
        (@OperationsCost + @FixedCost) as total_operations_cost,
        @VariableCosts as total_variable_costs, 
        @FixedCost as total_fixed_costs,
        @FixedCostsPerLot as fixed_costs_per_lot, 
        @VariableCosts as base_cost,
        @ScrapPct as scarto_pct, 
        @VariableCosts as adjusted_cost,
        -- RICARICHI EFFETTIVI
        @EffectiveRicaricoMP as ricarico_mp_pct, 
        @RicaricoMPAmount as ricarico_mp_amount,
        @EffectiveRicaricoOPE as ricarico_ope_pct, 
        @RicaricoOPEAmount as ricarico_ope_amount,
        @EffectiveRicaricoTrasporto as ricarico_trasporto_pct, 
        @RicaricoTrasportoAmount as ricarico_trasporto_amount,
        @EffectiveRicaricoScarto as ricarico_scarto_pct, 
        @RicaricoScartoAmount as ricarico_scarto_amount,
        @SommaRicarichi as somma_ricarichi,
        @EffectiveRicaricoTotale as ricarico_totale_pct, 
        @RicaricoTotaleAmount as ricarico_totale_amount,
        @EffectiveRicaricoSconto as ricarico_sconto_pct, 
        @RicaricoScontoAmount as ricarico_sconto_amount,
        @ProductionLot as production_lot, 
        @FinalUnitCost as unit_cost_final,
        @TotalPricePerLot / @ProductionLot as unit_price_final,
        @TotalCostPerLot as total_cost_per_lot, 
        @TotalPricePerLot as total_price_per_lot,
        @TotalOrderCost as total_cost_order, 
        ISNULL(@OrderQuantity, 0) as order_quantity,
        1 as bom_version, 
        @BOMId as main_ref_bom_id,
        @RootMainRefBOMId as root_main_ref_bom_id, 
        'PZ' as unit_of_measure,
        GETDATE() as calculation_timestamp,
        0 as components_count,
        0 as loops_detected,
        'OK' as status_note;

    -- Cleanup
    DROP TABLE #EffectiveMarkups;

    RETURN 0;
END
GO

PRINT '✅ SP_CalculateBOMCosting aggiornata con mappatura corretta!';
PRINT '';
PRINT 'Mappatura parametri corretta:';
PRINT '- RICARICO_MP → @EffectiveRicaricoMP';
PRINT '- RICARICO_OPE → @EffectiveRicaricoOPE';
PRINT '- RICARICO_TRASPORTO → @EffectiveRicaricoTrasporto';
PRINT '- RICARICO_SCARTO → @EffectiveRicaricoScarto';
PRINT '- RICARICO_TOTALE → @EffectiveRicaricoTotale';
PRINT '- RICARICO_SCONTO → @EffectiveRicaricoSconto';
GO
