-- =============================================
-- File   : 002_sp_calculate_bom_costing_scenario.sql
-- Scopo  : Modifica SP_CalculateBOMCosting per il supporto degli scenari BOM
--
-- Backward compatible: @ScenarioId = NULL → comportamento originale invariato
--
-- Modifiche rispetto all'originale (contrassegnate con "-- SCENARIO:"):
--   1. Nuovo parametro @ScenarioId BIGINT = NULL
--   2. IF @ScenarioId IS NOT NULL → forza @UpdateBOMRecord = 0
--      (il calcolo scenario non sovrascrive la costificazione ufficiale)
--   3. Colonna IsBuy BIT DEFAULT 0 aggiunta a #BOMExplosionCorrect
--   4. WHILE loop: LEFT JOIN su MA_BOM_ScenarioDetails per override di
--      Quantity, UnitCost, FixedCost, IsBuy.
--      Condizione AND t.IsBuy = 0 impedisce l'espansione dei figli IsBuy.
--   5. Costi materiali: CASE WHEN IsBuy = 1 bypassa FN_CalculateKnownDataCost
--      e usa direttamente CalculatedQty * UnitCost (prezzo d'acquisto manuale).
--   6. Costi operazioni variabili: LEFT JOIN per override ProcessingTime/Qty,
--      AND exp.IsBuy = 0 esclude i nodi IsBuy.
--   7. Costi fissi operazioni: LEFT JOIN per override SetupTime,
--      AND exp.IsBuy = 0 esclude i nodi IsBuy.
-- =============================================

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[SP_CalculateBOMCosting]
    @CompanyId              INT,
    @BOMId                  BIGINT,
    @OrderQuantity          DECIMAL(18,5) = NULL,
    @ScrapPercentage        FLOAT         = NULL,
    @UseGranularMarkups     BIT           = 1,
    @UseKnownData           BIT           = 1,
    @UpdateBOMRecord        BIT           = 1,
    @UserId                 INT           = NULL,
    @Debug                  BIT           = 0,
    @Version                INT           = NULL,
    -- SCENARIO: NULL = comportamento originale invariato
    @ScenarioId             BIGINT        = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- =============================================
    -- SCENARIO: forza @UpdateBOMRecord = 0
    --           Il calcolo scenario non deve sovrascrivere la
    --           costificazione ufficiale della BOM.
    -- =============================================
    IF @ScenarioId IS NOT NULL SET @UpdateBOMRecord = 0;

    -- =============================================
    -- Carica ricarichi effettivi (custom o globali)
    -- =============================================
    CREATE TABLE #EffectiveMarkups (
        ParameterName    NVARCHAR(100),
        MarkupPercentage FLOAT,
        Source           NVARCHAR(20)
    );

    INSERT INTO #EffectiveMarkups (ParameterName, MarkupPercentage, Source)
    EXEC SP_GetEffectiveBOMMarkups @CompanyId = @CompanyId, @BOMId = @BOMId;

    -- Variabili per i ricarichi effettivi
    DECLARE @EffectiveRicaricoMP        FLOAT;
    DECLARE @EffectiveRicaricoOPE       FLOAT;
    DECLARE @EffectiveRicaricoTrasporto FLOAT;
    DECLARE @EffectiveRicaricoScarto    FLOAT;
    DECLARE @EffectiveRicaricoTotale    FLOAT;
    DECLARE @EffectiveRicaricoSconto    FLOAT;

    -- Popola variabili dai ricarichi effettivi (dividi per 100 per convertire % in decimale)
    SELECT @EffectiveRicaricoMP        = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_MP';
    SELECT @EffectiveRicaricoOPE       = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_OPE';
    SELECT @EffectiveRicaricoTrasporto = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_TRASPORTO';
    SELECT @EffectiveRicaricoScarto    = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_SCARTO';
    SELECT @EffectiveRicaricoTotale    = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_TOTALE';
    SELECT @EffectiveRicaricoSconto    = MarkupPercentage / 100.0 FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_SCONTO';

    -- Imposta ricarico sconto come default se non trovato
    SET @EffectiveRicaricoSconto = ISNULL(@EffectiveRicaricoSconto, 0.44);

    -- Fallback ai valori di default se NULL
    SET @EffectiveRicaricoMP        = ISNULL(@EffectiveRicaricoMP,        0.15);
    SET @EffectiveRicaricoOPE       = ISNULL(@EffectiveRicaricoOPE,       0.20);
    SET @EffectiveRicaricoTrasporto = ISNULL(@EffectiveRicaricoTrasporto, 0.05);
    SET @EffectiveRicaricoScarto    = ISNULL(@EffectiveRicaricoScarto,    0.10);
    SET @EffectiveRicaricoTotale    = ISNULL(@EffectiveRicaricoTotale,    0.25);
    SET @EffectiveRicaricoSconto    = ISNULL(@EffectiveRicaricoSconto,    0.00);

    -- =============================================
    -- Resto della SP ORIGINALE (invariato dove non indicato)
    -- =============================================

    DECLARE @ErrorMessage   NVARCHAR(MAX);
    DECLARE @BaseCost       FLOAT = 0;
    DECLARE @MaterialCost   FLOAT = 0;
    DECLARE @OperationsCost FLOAT = 0;
    DECLARE @FixedCost      FLOAT = 0;
    DECLARE @AdjustedCost   FLOAT = 0;
    DECLARE @FinalUnitCost  FLOAT = 0;
    DECLARE @TotalOrderCost FLOAT = 0;
    DECLARE @ScrapPct       FLOAT;
    DECLARE @ProductionLot  INT   = 1;
    DECLARE @ErrorCode      INT;
    DECLARE @ErrorMsg       NVARCHAR(4000);
    DECLARE @FinalMarkup    FLOAT = 0;
    DECLARE @TotalPricePerLot FLOAT = 0;
    DECLARE @TotalCostPerLot  FLOAT = 0;
    DECLARE @DetailsJSON    NVARCHAR(MAX) = '';
    DECLARE @Notes          NVARCHAR(MAX) = '';

    -- NUOVO: Variabile per tracciare il MainRefBOMId
    DECLARE @RootMainRefBOMId BIGINT;

    -- Verifica esistenza BOM
    DECLARE @BOMExists BIT = 0;
    IF @Version IS NULL
    BEGIN
        SELECT @BOMExists = 1
        FROM MA_ProjectArticles_BillOfMaterials
        WHERE CompanyId = @CompanyId AND Id = @BOMId;
    END
    ELSE
    BEGIN
        SELECT @BOMExists = 1
        FROM MA_ProjectArticles_BillOfMaterials
        WHERE CompanyId = @CompanyId AND Id = @BOMId AND Version = @Version;
    END

    IF @BOMExists = 0
    BEGIN
        IF @Version IS NULL
            SET @ErrorMessage = 'BOM non trovata con ID: ' + CAST(@BOMId AS VARCHAR(20));
        ELSE
            SET @ErrorMessage = 'BOM non trovata con ID: ' + CAST(@BOMId AS VARCHAR(20)) + ' e versione: ' + CAST(@Version AS VARCHAR(10));
        EXEC SP_LogBOMCosting @CompanyId, @BOMId, 'ERROR', @ErrorMessage;
        SELECT @ErrorMessage AS ErrorMessage;
        DROP TABLE #EffectiveMarkups; -- CLEANUP
        RETURN -1;
    END

    -- Ottieni informazioni BOM e MainRefBOMId
    IF @Version IS NULL
    BEGIN
        SELECT
            @ProductionLot    = ISNULL(ProductionLot, 1),
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
            @ProductionLot    = ISNULL(ProductionLot, 1),
            @RootMainRefBOMId = CASE
                WHEN MainRefBOMId IS NULL THEN Id
                ELSE MainRefBOMId
            END
        FROM MA_ProjectArticles_BillOfMaterials
        WHERE CompanyId = @CompanyId AND Id = @BOMId AND Version = @Version;
    END

    -- Determina percentuale scarto
    SET @ScrapPct = ISNULL(@ScrapPercentage, dbo.FN_GetBOMCostingParameter(@CompanyId, 'SCARTO_DEFAULT', 0.05));

    -- Log inizio calcolo
    DECLARE @LogMessage NVARCHAR(MAX) =
        'OrderQty: '    + ISNULL(CAST(@OrderQuantity AS NVARCHAR(50)), '0') +
        ', ScrapPct: '  + ISNULL(CAST(@ScrapPct AS NVARCHAR(50)), '0') +
        ', MainRefBOMId: ' + CAST(@RootMainRefBOMId AS NVARCHAR(20)) +
        ', RicaricoMP: ' + CAST(@EffectiveRicaricoMP * 100 AS NVARCHAR(10)) + '% (' +
        (SELECT Source FROM #EffectiveMarkups WHERE ParameterName = 'RICARICO_MP') + ')';
    EXEC SP_LogBOMCosting @CompanyId, @BOMId, 'INFO', 'Inizio calcolo costificazione BOM', @LogMessage;

    -- =============================================
    -- Tabella temporanea per esplosione BOM
    -- SCENARIO: aggiunta colonna IsBuy BIT DEFAULT 0
    --           Quando @ScenarioId IS NULL IsBuy rimane sempre 0:
    --           nessun impatto sul comportamento originale.
    -- =============================================
    CREATE TABLE #BOMExplosionCorrect (
        Level                INT,
        ItemId               BIGINT,
        ComponentId          BIGINT,
        ParentId             BIGINT,
        BOMId                BIGINT,
        ParentBOMId          BIGINT,
        Line                 INT,
        ComponentType        INT,
        Path                 NVARCHAR(MAX),
        Quantity             DECIMAL(18,5),
        CalculatedQty        DECIMAL(18,5),
        UoM                  VARCHAR(10),
        UnitCost             FLOAT,
        TotalCost            FLOAT,
        FixedCost            FLOAT,
        ComponentNature      INT,
        ComponentItemCode    VARCHAR(64),
        ComponentDescription NVARCHAR(255),
        IsLoop               BIT DEFAULT 0,
        IsBuy                BIT DEFAULT 0   -- SCENARIO: componente trattato come acquisto nello scenario
    );

    -- Implementazione diretta dell'esplosione ricorsiva
    DECLARE @RootItemId BIGINT;
    DECLARE @RootBOMId  BIGINT = @BOMId;

    SELECT @RootItemId = ItemId
    FROM MA_ProjectArticles_BillOfMaterials
    WHERE Id = @BOMId AND CompanyId = @CompanyId;

    IF @RootItemId IS NULL
    BEGIN
        EXEC SP_LogBOMCosting @CompanyId, @BOMId, 'ERROR', 'Distinta base non trovata';
        SELECT 'Distinta base non trovata' AS ErrorMessage;
        DROP TABLE #EffectiveMarkups;
        RETURN -1;
    END

    -- Inserisce il nodo radice (IsBuy rimane 0 di default — non in column list)
    INSERT INTO #BOMExplosionCorrect (
        Level, ItemId, ComponentId, ParentId, BOMId, ParentBOMId, Line, ComponentType,
        Path, Quantity, CalculatedQty, UoM, UnitCost, TotalCost, FixedCost,
        ComponentNature, ComponentItemCode, ComponentDescription
    )
    SELECT
        0, item.Id, item.Id, NULL, @RootBOMId, NULL, 0, 7798784,
        CAST(item.Id AS NVARCHAR(MAX)), CAST(1 AS DECIMAL(18,5)), CAST(1 AS DECIMAL(18,5)),
        bom.UoM, CAST(0 AS FLOAT), CAST(0 AS FLOAT), CAST(0 AS FLOAT),
        item.Nature, item.Item, item.Description
    FROM MA_ProjectArticles_Items item
    JOIN MA_ProjectArticles_BillOfMaterials bom
        ON bom.ItemId = item.Id AND bom.CompanyId = item.CompanyId
    WHERE item.Id = @RootItemId AND item.CompanyId = @CompanyId AND bom.Id = @RootBOMId;


    DECLARE @Level         INT = 0;
    DECLARE @MaxIterations INT = 10;

    WHILE @Level < @MaxIterations
    BEGIN
        -- =============================================
        -- SCENARIO: modifiche al loop di esplosione
        --   • Aggiunto IsBuy nella column list
        --   • LEFT JOIN su MA_BOM_ScenarioDetails (alias sc_comp) per applicare
        --     gli override di Quantity, UnitCost, FixedCost e il flag IsBuy.
        --     Quando @ScenarioId IS NULL il join non produce mai match
        --     (NULL = NULL è UNKNOWN in SQL), quindi COALESCE restituisce sempre
        --     il valore originale: perfettamente backward compatible.
        --   • AND t.IsBuy = 0: impedisce l'espansione dei figli di un nodo IsBuy.
        --     I sotto-componenti di un articolo marcato come "acquisto" non vengono
        --     inseriti nell'esplosione, azzerando automaticamente il loro contributo.
        -- =============================================
        INSERT INTO #BOMExplosionCorrect (
            Level, ItemId, ComponentId, ParentId, BOMId, ParentBOMId, Line, ComponentType,
            Path, Quantity, CalculatedQty, UoM, UnitCost, TotalCost, FixedCost,
            ComponentNature, ComponentItemCode, ComponentDescription, IsBuy
        )
        SELECT
            t.Level + 1, comp.ComponentId, comp.ComponentId, t.ItemId,
            (SELECT TOP 1 bom.Id FROM MA_ProjectArticles_BillOfMaterials bom
              WHERE bom.ItemId = comp.ComponentId AND bom.CompanyId = @CompanyId
                    AND (
                            EXISTS (SELECT 1 FROM MA_ProjectArticles_BillOfMaterials b2
                                    WHERE b2.ItemId = comp.ComponentId AND b2.CompanyId = @CompanyId
                                    AND b2.MainRefBOMId = @RootMainRefBOMId)
                            AND bom.MainRefBOMId = @RootMainRefBOMId
                            OR
                            NOT EXISTS (SELECT 1 FROM MA_ProjectArticles_BillOfMaterials b2
                                            WHERE b2.ItemId = comp.ComponentId AND b2.CompanyId = @CompanyId
                                            AND b2.MainRefBOMId = @RootMainRefBOMId)
                            AND bom.Version = 1
                        )
              ORDER BY CASE WHEN bom.MainRefBOMId = @RootMainRefBOMId THEN 1
                             WHEN bom.Version = 1 THEN 2 ELSE 3 END, bom.Version DESC),
            t.BOMId, comp.Line, comp.ComponentType,
            t.Path + '.' + CAST(comp.ComponentId AS NVARCHAR(MAX)),
            COALESCE(sc_comp.Quantity_Sc,  comp.Quantity),
            t.CalculatedQty * COALESCE(sc_comp.Quantity_Sc, comp.Quantity),
            comp.UoM,
            COALESCE(sc_comp.UnitCost_Sc,  comp.UnitCost),
            comp.TotalCost,
            COALESCE(sc_comp.FixedCost_Sc, comp.FixedCost),
            item.Nature, item.Item, item.Description,
            ISNULL(sc_comp.IsBuy, 0)    -- SCENARIO: flag acquisto dallo scenario
        FROM #BOMExplosionCorrect t
        JOIN MA_ProjectArticles_BOMComponents comp
            ON t.BOMId = comp.BOMId AND comp.CompanyId = @CompanyId
        JOIN MA_ProjectArticles_Items item
            ON comp.ComponentId = item.Id AND comp.CompanyId = item.CompanyId
        -- SCENARIO: LEFT JOIN per override componenti (sc_comp.* è NULL quando @ScenarioId IS NULL)
        LEFT JOIN dbo.MA_BOM_ScenarioDetails sc_comp
            ON  sc_comp.ScenarioId    = @ScenarioId
            AND sc_comp.RowType       = 'C'
            AND sc_comp.AncestralPath = t.Path + '.' + CAST(comp.ComponentId AS NVARCHAR(MAX))
        WHERE t.Level          = @Level
            AND item.Disabled  = 0
            AND comp.ComponentType <> 7798787
            AND t.IsBuy        = 0    -- SCENARIO: non espandere i figli di nodi IsBuy
            AND NOT EXISTS (SELECT 1 FROM #BOMExplosionCorrect t2
                              WHERE t2.ComponentId = comp.ComponentId
                              AND   t2.BOMId       = t.BOMId
                              AND   t2.ParentBOMId = t.ParentBOMId
                              AND   t2.Line        = comp.Line);

        IF @@ROWCOUNT = 0 BREAK;
        SET @Level = @Level + 1;
    END;


    -- Calcola correttamente il TotalCost per ogni componente
    -- (Il costo fisso non contribuisce al singolo componente ma solo alla BOM finale)
    UPDATE #BOMExplosionCorrect
    SET TotalCost = (CalculatedQty * ISNULL(UnitCost, 0))
    WHERE IsLoop = 0;


    UPDATE #BOMExplosionCorrect SET IsLoop = 1
    WHERE EXISTS (SELECT 1 FROM #BOMExplosionCorrect t2
                      WHERE t2.ComponentId = #BOMExplosionCorrect.ComponentId
                      AND   t2.Level       < #BOMExplosionCorrect.Level
                      AND   t2.Path LIKE #BOMExplosionCorrect.Path + '%');

    IF EXISTS (SELECT 1 FROM #BOMExplosionCorrect WHERE IsLoop = 1)
    BEGIN
        DECLARE @LoopItems NVARCHAR(MAX) = '';
        SELECT @LoopItems = @LoopItems + ISNULL(ComponentItemCode, '') + ', '
        FROM #BOMExplosionCorrect WHERE IsLoop = 1;
        IF LEN(@LoopItems) > 0 SET @LoopItems = LEFT(@LoopItems, LEN(@LoopItems) - 2);
        EXEC SP_LogBOMCosting @CompanyId, @BOMId, 'WARNING', 'Rilevati loop ciclici nella BOM', @LoopItems;
    END

    -- =============================================
    -- Calcolo costi materiali e operazioni
    -- =============================================
    DECLARE @VariableCosts    FLOAT = 0;
    DECLARE @VariableCostsMP  FLOAT = 0;
    DECLARE @VariableCostsOPE FLOAT = 0;

    DECLARE @ComponentCosts TABLE (ComponentId BIGINT, CalculatedCost DECIMAL(18,6));

    -- =============================================
    -- SCENARIO: aggiunto CASE WHEN IsBuy = 1
    --   I componenti IsBuy usano direttamente CalculatedQty * UnitCost
    --   (UnitCost contiene già il COALESCE(UnitCost_Sc, comp.UnitCost))
    --   senza passare per FN_CalculateKnownDataCost, che non ha senso
    --   per un articolo trattato come acquisto.
    -- =============================================
    INSERT INTO @ComponentCosts (ComponentId, CalculatedCost)
    SELECT ComponentId,
        CASE
            -- SCENARIO IsBuy: prezzo d'acquisto manuale, bypass KnownData
            WHEN IsBuy = 1
                THEN CalculatedQty * ISNULL(UnitCost, 0)
            WHEN ComponentNature = 22413314 OR UnitCost > 0
            THEN CASE
                    WHEN @UseKnownData = 1
                         AND dbo.FN_CalculateKnownDataCost(@CompanyId, ComponentItemCode, ComponentDescription, 'MATERIAL',
                                 ISNULL((SELECT SUM(rt.Qty) FROM MA_ProjectArticles_BOMRouting rt
                                          WHERE rt.BOMId = (
                                              SELECT TOP 1 bom.Id FROM MA_ProjectArticles_BillOfMaterials bom
                                               WHERE bom.ItemId = ComponentId AND bom.CompanyId = @CompanyId
                                                     AND (EXISTS (SELECT 1 FROM MA_ProjectArticles_BillOfMaterials b2
                                                                   WHERE b2.ItemId = ComponentId AND b2.CompanyId = @CompanyId
                                                                   AND b2.MainRefBOMId = @RootMainRefBOMId)
                                                              AND bom.MainRefBOMId = @RootMainRefBOMId
                                                              OR
                                                              NOT EXISTS (SELECT 1 FROM MA_ProjectArticles_BillOfMaterials b2
                                                                           WHERE b2.ItemId = ComponentId AND b2.CompanyId = @CompanyId
                                                                           AND b2.MainRefBOMId = @RootMainRefBOMId)
                                                              AND bom.Version = 1)
                                               ORDER BY CASE WHEN bom.MainRefBOMId = @RootMainRefBOMId THEN 1
                                                             WHEN bom.Version = 1 THEN 2 ELSE 3 END, bom.Version DESC)
                                          AND rt.CompanyId = @CompanyId), 1), CalculatedQty) > 0
                    THEN dbo.FN_CalculateKnownDataCost(@CompanyId, ComponentItemCode, ComponentDescription, 'MATERIAL',
                                 ISNULL((SELECT SUM(rt.Qty) FROM MA_ProjectArticles_BOMRouting rt
                                          WHERE rt.BOMId = (
                                              SELECT TOP 1 bom.Id FROM MA_ProjectArticles_BillOfMaterials bom
                                               WHERE bom.ItemId = ComponentId AND bom.CompanyId = @CompanyId
                                                     AND (EXISTS (SELECT 1 FROM MA_ProjectArticles_BillOfMaterials b2
                                                                   WHERE b2.ItemId = ComponentId AND b2.CompanyId = @CompanyId
                                                                   AND b2.MainRefBOMId = @RootMainRefBOMId)
                                                              AND bom.MainRefBOMId = @RootMainRefBOMId
                                                              OR
                                                              NOT EXISTS (SELECT 1 FROM MA_ProjectArticles_BillOfMaterials b2
                                                                           WHERE b2.ItemId = ComponentId AND b2.CompanyId = @CompanyId
                                                                           AND b2.MainRefBOMId = @RootMainRefBOMId)
                                                              AND bom.Version = 1)
                                               ORDER BY CASE WHEN bom.MainRefBOMId = @RootMainRefBOMId THEN 1
                                                             WHEN bom.Version = 1 THEN 2 ELSE 3 END, bom.Version DESC)
                                          AND rt.CompanyId = @CompanyId), 1), CalculatedQty)
                    ELSE CalculatedQty * UnitCost
                 END
            ELSE 0
        END
    FROM #BOMExplosionCorrect WHERE IsLoop = 0;

    SELECT @VariableCostsMP = ISNULL(SUM(CalculatedCost), 0) FROM @ComponentCosts;
    DELETE FROM @ComponentCosts;

    -- =============================================
    -- SCENARIO: costi operazioni variabili
    --   • LEFT JOIN sc_rt per override di ProcessingTime e Qty
    --   • AND exp.IsBuy = 0: i nodi IsBuy non hanno routing
    -- =============================================
    SELECT @VariableCostsOPE = ISNULL(SUM(
            CASE
                WHEN op.UnitCost > 0
                    THEN op.UnitCost * exp.CalculatedQty
                WHEN wc.HourlyCost > 0
                    THEN ((ISNULL(COALESCE(sc_rt.ProcessingTime_Sc, rt.ProcessingTime), 0) / 3600.0) * wc.HourlyCost * exp.CalculatedQty)
                ELSE
                    CASE
                        WHEN @UseKnownData = 1
                             AND dbo.FN_CalculateKnownDataCost(@CompanyId, rt.Operation, ISNULL(op.Description, rt.Operation), 'OPERATION',
                                     ISNULL(COALESCE(sc_rt.ProcessingTime_Sc, rt.ProcessingTime), 0),
                                     COALESCE(sc_rt.Qty_Sc, rt.Qty) * exp.CalculatedQty) > 0
                        THEN dbo.FN_CalculateKnownDataCost(@CompanyId, rt.Operation, ISNULL(op.Description, rt.Operation), 'OPERATION',
                                     ISNULL(COALESCE(sc_rt.ProcessingTime_Sc, rt.ProcessingTime), 0),
                                     COALESCE(sc_rt.Qty_Sc, rt.Qty) * exp.CalculatedQty)
                        ELSE ((ISNULL(COALESCE(sc_rt.ProcessingTime_Sc, rt.ProcessingTime), 0) / 3600.0)
                              * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0)
                              * exp.CalculatedQty)
                    END
            END), 0)
    FROM #BOMExplosionCorrect exp
    JOIN  MA_ProjectArticles_BOMRouting     rt ON rt.BOMId     = exp.BOMId AND rt.CompanyId = @CompanyId
    LEFT JOIN MA_ProjectArticles_BOMOperations  op ON rt.Operation = op.Code  AND op.CompanyId = @CompanyId AND op.Active = 1
    LEFT JOIN MA_ProjectArticles_BOMWorkCenters wc ON rt.WC        = wc.Code  AND wc.CompanyId = @CompanyId
    -- SCENARIO: override routing (sc_rt.* è NULL quando @ScenarioId IS NULL)
    LEFT JOIN dbo.MA_BOM_ScenarioDetails sc_rt
        ON  sc_rt.ScenarioId = @ScenarioId
        AND sc_rt.RowType    = 'R'
        AND sc_rt.BOMId_Rt   = rt.BOMId
        AND sc_rt.RtgStep    = rt.RtgStep
    WHERE exp.IsLoop = 0 AND exp.BOMId IS NOT NULL
        AND exp.IsBuy = 0;    -- SCENARIO: escludi nodi IsBuy dal calcolo costi operazioni

    SET @VariableCosts = @VariableCostsMP + @VariableCostsOPE;


    DECLARE @FixedCosts FLOAT = 0;
    SELECT @FixedCosts = ISNULL(SUM(CASE WHEN FixedCost > 0 AND @ProductionLot > 0
                    --THEN (FixedCost / @ProductionLot) * CalculatedQty ELSE 0 END), 0)
                    THEN (FixedCost)    ELSE 0 END), 0)
    FROM #BOMExplosionCorrect WHERE IsLoop = 0;

    -- =============================================
    -- SCENARIO: costi fissi operazioni
    --   • LEFT JOIN sc_rt2 per override di SetupTime
    --   • AND exp.IsBuy = 0: i nodi IsBuy non hanno routing
    -- =============================================
    DECLARE @FixedCostsOperations FLOAT = 0;
    SELECT @FixedCostsOperations = ISNULL(SUM(
            CASE
                WHEN wc.HourlyCost > 0
                    THEN ((ISNULL(COALESCE(sc_rt2.SetupTime_Sc, rt.SetupTime), 0) / 3600.0) * wc.HourlyCost) + ISNULL(op.FixedCost, 0)
                ELSE
                    ((ISNULL(COALESCE(sc_rt2.SetupTime_Sc, rt.SetupTime), 0) / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0)) + ISNULL(op.FixedCost, 0)
            END), 0)
    FROM #BOMExplosionCorrect exp
    JOIN  MA_ProjectArticles_BOMRouting     rt ON rt.BOMId     = exp.BOMId AND rt.CompanyId = @CompanyId
    LEFT JOIN MA_ProjectArticles_BOMOperations  op ON rt.Operation = op.Code  AND op.CompanyId = @CompanyId AND op.Active = 1
    LEFT JOIN MA_ProjectArticles_BOMWorkCenters wc ON rt.WC        = wc.Code  AND wc.CompanyId = @CompanyId
    -- SCENARIO: override routing per SetupTime (sc_rt2.* è NULL quando @ScenarioId IS NULL)
    LEFT JOIN dbo.MA_BOM_ScenarioDetails sc_rt2
        ON  sc_rt2.ScenarioId = @ScenarioId
        AND sc_rt2.RowType    = 'R'
        AND sc_rt2.BOMId_Rt   = rt.BOMId
        AND sc_rt2.RtgStep    = rt.RtgStep
    WHERE exp.IsLoop = 0 AND exp.BOMId IS NOT NULL
        AND exp.IsBuy = 0;    -- SCENARIO: escludi nodi IsBuy dal calcolo costi fissi operazioni

    SET @FixedCosts = @FixedCosts + @FixedCostsOperations;

    DECLARE @FixedCostsPerLot FLOAT = 0;
    IF @ProductionLot > 0 SET @FixedCostsPerLot = @FixedCosts / @ProductionLot;


    SET @MaterialCost   = @VariableCostsMP;
    SET @OperationsCost = @VariableCostsOPE;
    SET @FixedCost      = @FixedCostsPerLot;
    SET @BaseCost       = @VariableCosts + @FixedCostsPerLot;

    IF @BaseCost = 0
    BEGIN
        DECLARE @WarningMessage NVARCHAR(MAX) =
            'MaterialCost: '   + ISNULL(CAST(@MaterialCost   AS NVARCHAR(50)), '0') +
            ', OperationsCost: ' + ISNULL(CAST(@OperationsCost AS NVARCHAR(50)), '0') +
            ', FixedCost: '    + ISNULL(CAST(@FixedCost      AS NVARCHAR(50)), '0');
        EXEC SP_LogBOMCosting @CompanyId, @BOMId, 'WARNING', 'Costo base calcolato è zero', @WarningMessage;
    END

    IF @ScrapPct > 0 AND @ScrapPct < 1
        SET @AdjustedCost = @BaseCost / (1.0 - @ScrapPct);
    ELSE
        SET @AdjustedCost = @BaseCost;

    -- Calcola ricarichi usando variabili @Effective*
    DECLARE @RicaricoMPAmount        FLOAT = @VariableCostsMP  * @EffectiveRicaricoMP;
    DECLARE @RicaricoOPEAmount       FLOAT = @VariableCostsOPE * @EffectiveRicaricoOPE;
    DECLARE @RicaricoTrasportoAmount FLOAT = @VariableCosts    * @EffectiveRicaricoTrasporto;
    DECLARE @RicaricoScartoAmount    FLOAT = @VariableCosts / (1 - @EffectiveRicaricoScarto) - @VariableCosts;

    DECLARE @SommaRicarichi FLOAT = @RicaricoMPAmount + @RicaricoOPEAmount + @RicaricoTrasportoAmount + @RicaricoScartoAmount;

    DECLARE @RicaricoTotaleAmount FLOAT = (@VariableCosts + @SommaRicarichi) * @EffectiveRicaricoTotale;
    DECLARE @RicaricoScontoAmount FLOAT = (@VariableCosts + @SommaRicarichi) / (1 - @EffectiveRicaricoSconto) - (@VariableCosts + @SommaRicarichi);

    SET @FinalUnitCost = @VariableCosts + @FixedCostsPerLot + @SommaRicarichi + @RicaricoTotaleAmount + @RicaricoScontoAmount;
    SET @FinalMarkup   = @EffectiveRicaricoTotale;

    IF @OrderQuantity IS NOT NULL AND @OrderQuantity > 0
        SET @TotalOrderCost = @FinalUnitCost * @OrderQuantity;

    SET @TotalCostPerLot  = @FinalUnitCost * @ProductionLot;
    SET @TotalPricePerLot = @TotalCostPerLot * (1 + ISNULL(@FinalMarkup, @EffectiveRicaricoTotale));

    -- Aggiorna la tabella BOM
    -- (per gli scenari @UpdateBOMRecord è già stato forzato a 0 in cima alla SP)
    IF @UpdateBOMRecord = 1
    BEGIN
        DECLARE @RefillLot   INT   = @ProductionLot;
        DECLARE @RefillCost  FLOAT = @FinalUnitCost * @RefillLot;
        DECLARE @RefillPrice FLOAT = @RefillCost * (1 + ISNULL(@FinalMarkup, @EffectiveRicaricoTotale));

        SET @DetailsJSON = (
            SELECT @TotalPricePerLot / @ProductionLot as prezzo, @VariableCostsMP as costo_mp,
                    @VariableCostsOPE as costo_ope, @FixedCostsPerLot as costi_fissi,
                    @RicaricoMPAmount as ricarico_mp, @RicaricoOPEAmount as ricarico_op,
                    @RicaricoTrasportoAmount as ricarico_tr, @FinalUnitCost as costo_totale,
                    @RicaricoScartoAmount as ricarico_scarto, @RicaricoScontoAmount as ricarico_sconto,
                    @RicaricoTotaleAmount as ricarico_totale,
                    @ProductionLot as quantita_lotto,
                    @EffectiveRicaricoMP        * 100 as ricarico_mp_pct,
                    @EffectiveRicaricoOPE       * 100 as ricarico_ope_pct,
                    @EffectiveRicaricoTrasporto * 100 as ricarico_trasporto_pct,
                    @EffectiveRicaricoScarto    * 100 as ricarico_scarto_pct,
                    @EffectiveRicaricoTotale    * 100 as ricarico_totale_pct,
                    @EffectiveRicaricoSconto    * 100 as ricarico_sconto_pct
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        SET @Notes = ' || lotto(rif): ' + CAST(@RefillLot AS VARCHAR(10)) +
                     ' | Prezzo(rif): ' + CAST(ROUND(@RefillPrice / @RefillLot, 2) AS VARCHAR(20)) +
                     ' | Costo(rif): '  + CAST(ROUND(@RefillCost  / @RefillLot, 2) AS VARCHAR(20)) + ' ||';

        UPDATE MA_ProjectArticles_BillOfMaterials
        SET ProductionLot          = @ProductionLot,        RMCost               = @VariableCostsMP,
            ProcessingCost         = @VariableCostsOPE,     RMRefillCost         = @RicaricoMPAmount,
            ProcessingRefillCost   = @RicaricoOPEAmount,    TotalCost            = @FinalUnitCost,
            TotalPrice             = @TotalPricePerLot / @ProductionLot,
            RefillWaste            = @RicaricoScartoAmount, RefillDiscount       = @RicaricoScontoAmount,
            TotalRefill            = @SommaRicarichi,       TransportRefill      = @RicaricoTrasportoAmount,
            Details                = @DetailsJSON,          Notes                = @Notes,
            LastCostingUpdatedBy   = @UserId,               LastCostingUpdatedAt = GETDATE()
        WHERE CompanyId = @CompanyId AND Id = @BOMId;

        DECLARE @TextNotes VARCHAR(MAX) =
            'TotalCost (per pezzo): '  + CAST(@FinalUnitCost AS VARCHAR(20)) +
            ', TotalPrice (per pezzo): ' + CAST(@TotalPricePerLot / @ProductionLot AS VARCHAR(20));
        EXEC SP_LogBOMCosting @CompanyId, @BOMId, 'INFO', 'Record BOM aggiornato con i costi calcolati', @TextNotes;
    END

    DECLARE @CompletionMessage NVARCHAR(MAX) =
        'BaseCost: '   + ISNULL(CAST(@BaseCost      AS NVARCHAR(50)), '0') +
        ', FinalCost: ' + ISNULL(CAST(@FinalUnitCost AS NVARCHAR(50)), '0');
    EXEC SP_LogBOMCosting @CompanyId, @BOMId, 'INFO', 'Calcolo costificazione completato', @CompletionMessage;

    -- Output risultato CON RICARICHI EFFETTIVI
    SELECT
        @BOMId as bom_id, bom.BOM as bom_code, bom.Description as bom_description,
        itm.Item as item_code, itm.Description as item_description,
        @VariableCostsMP  as variable_costs_material,   @VariableCostsOPE as variable_costs_operations,
        @FixedCostsOperations as fixed_costs_operations, (@VariableCostsOPE + @FixedCostsOperations) as total_operations_cost,
        @VariableCosts as total_variable_costs,          @FixedCosts as total_fixed_costs,
        @FixedCostsPerLot as fixed_costs_per_lot,        @BaseCost as base_cost,
        @ScrapPct as scarto_pct,                         @AdjustedCost as adjusted_cost,
        -- RICARICHI EFFETTIVI (custom o globali)
        @EffectiveRicaricoMP        as ricarico_mp_pct,        @RicaricoMPAmount        as ricarico_mp_amount,
        @EffectiveRicaricoOPE       as ricarico_ope_pct,       @RicaricoOPEAmount       as ricarico_ope_amount,
        @EffectiveRicaricoTrasporto as ricarico_trasporto_pct, @RicaricoTrasportoAmount as ricarico_trasporto_amount,
        @EffectiveRicaricoScarto    as ricarico_scarto_pct,    @RicaricoScartoAmount    as ricarico_scarto_amount,
        @SommaRicarichi as somma_ricarichi,
        @EffectiveRicaricoTotale    as ricarico_totale_pct,    @RicaricoTotaleAmount    as ricarico_totale_amount,
        @EffectiveRicaricoSconto    as ricarico_sconto_pct,    @RicaricoScontoAmount    as ricarico_sconto_amount,
        @ProductionLot as production_lot,                @FinalUnitCost as unit_cost_final,
        @TotalPricePerLot / @ProductionLot as unit_price_final,
        @TotalCostPerLot as total_cost_per_lot,          @TotalPricePerLot as total_price_per_lot,
        @TotalOrderCost as total_cost_order,             ISNULL(@OrderQuantity, 0) as order_quantity,
        bom.Version as bom_version,                      bom.MainRefBOMId as main_ref_bom_id,
        @RootMainRefBOMId as root_main_ref_bom_id,       bom.UoM as unit_of_measure,
        GETDATE() as calculation_timestamp,
        (SELECT COUNT(*) FROM #BOMExplosionCorrect WHERE IsLoop = 0) as components_count,
        (SELECT COUNT(*) FROM #BOMExplosionCorrect WHERE IsLoop = 1) as loops_detected,
        CASE WHEN @BaseCost = 0                                              THEN 'WARNING: Costo base zero'
             WHEN EXISTS (SELECT 1 FROM #BOMExplosionCorrect WHERE IsLoop = 1) THEN 'WARNING: Loop rilevato'
             ELSE 'OK' END as status_note
    FROM MA_ProjectArticles_BillOfMaterials bom
    JOIN MA_ProjectArticles_Items itm ON bom.ItemId = itm.Id AND bom.CompanyId = itm.CompanyId
    WHERE bom.CompanyId = @CompanyId AND bom.Id = @BOMId
    AND (@Version IS NULL OR bom.Version = @Version);

    -- OUTPUT DEBUG CON TotalCost CORRETTO
    IF @Debug = 1
    BEGIN
        SELECT exp.ComponentId, exp.Line as ComponentLine, exp.ComponentId as ItemId,
                exp.ComponentItemCode as ItemCode, exp.ComponentDescription as ItemDescription,
                exp.Quantity, exp.UoM, exp.UnitCost, exp.FixedCost, exp.TotalCost, exp.ComponentType,
                (exp.CalculatedQty * ISNULL(exp.UnitCost, 0))  as CalculatedTotalCost,
                exp.Path,
                exp.ParentBOMId
        FROM #BOMExplosionCorrect exp
        WHERE exp.IsLoop = 0 AND exp.Level > 0
        ORDER BY exp.Line;

        -- Mostra il TotalCost corretto dalla tabella temporanea
        SELECT Level, ComponentItemCode, ComponentDescription, ComponentType,
                CASE ComponentNature
                    WHEN 22413312 THEN 'Semilavorato' WHEN 22413313 THEN 'Prodotto Finito'
                    WHEN 22413314 THEN 'Acquisto'     ELSE 'Altro' END as ComponentNature,
                Quantity, CalculatedQty, UoM, UnitCost, FixedCost, TotalCost, IsLoop,
                BOMId, ParentBOMId, Path
        FROM #BOMExplosionCorrect ORDER BY Level, ComponentItemCode;

        SELECT rt.BOMId, rt.RtgStep, rt.Operation, op.Description as OperationDescription,
                rt.WC as WorkCenter, wc.Description as WorkCenterDescription,
                (rt.ProcessingTime * exp.CalculatedQty) AS ProcessingTime, rt.SetupTime,
                (rt.ProcessingTime / 3600.0) as ProcessingTimeHours,
                rt.SetupTime / 3600.0 as SetupTimeHours,
                rt.NoOfProcessingWorkers, rt.NoOfSetupWorkers,
                rt.SubId, rt.Supplier, exp.CalculatedQty AS Qty, rt.Notes,
                (CASE WHEN op.UnitCost > 0 THEN op.UnitCost
                       WHEN wc.HourlyCost > 0 THEN (rt.ProcessingTime / 3600.0) * wc.HourlyCost
                       ELSE (rt.ProcessingTime / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0)
                 END) as ProcessingCost,
                CASE WHEN wc.HourlyCost > 0 THEN (rt.SetupTime / 3600.0) * wc.HourlyCost
                     ELSE (rt.SetupTime / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0)
                END as SetupCost,
                ISNULL(op.FixedCost, 0) as FixedCost, bom.BOM as BOMCode, bom.Description as BOMDescription,
                itm.Item as ItemCode, itm.Description as ItemDescription
        FROM #BOMExplosionCorrect exp
        JOIN MA_ProjectArticles_BOMRouting rt ON rt.BOMId = exp.BOMId AND rt.CompanyId = @CompanyId
        JOIN MA_ProjectArticles_BillOfMaterials bom ON bom.Id = rt.BOMId AND bom.CompanyId = @CompanyId
        JOIN MA_ProjectArticles_Items itm ON bom.ItemId = itm.Id AND itm.CompanyId = @CompanyId
        LEFT JOIN MA_ProjectArticles_BOMOperations  op ON rt.Operation = op.Code AND op.CompanyId = @CompanyId AND op.Active = 1
        LEFT JOIN MA_ProjectArticles_BOMWorkCenters wc ON rt.WC        = wc.Code AND wc.CompanyId = @CompanyId
        WHERE exp.IsLoop = 0 AND exp.BOMId IS NOT NULL
        ORDER BY rt.BOMId, rt.RtgStep;

        SELECT exp.BOMId, bom.BOM as BOMCode, bom.Description as BOMDescription,
                COUNT(DISTINCT comp.ComponentId) as ComponentCount,
                SUM(comp.Quantity * ISNULL(comp.UnitCost, 0)) as TotalMaterialCost,
                SUM(ISNULL(comp.FixedCost, 0)) as TotalFixedCost,
                (SELECT COUNT(*) FROM MA_ProjectArticles_BOMRouting WHERE BOMId = exp.BOMId AND CompanyId = @CompanyId) as RoutingSteps,
                (SELECT SUM(ProcessingTime / 3600.0) FROM MA_ProjectArticles_BOMRouting WHERE BOMId = exp.BOMId AND CompanyId = @CompanyId) as TotalProcessingHours,
                (SELECT SUM(SetupTime / 3600.0) FROM MA_ProjectArticles_BOMRouting WHERE BOMId = exp.BOMId AND CompanyId = @CompanyId) as TotalSetupHours
        FROM #BOMExplosionCorrect exp
        JOIN MA_ProjectArticles_BillOfMaterials bom ON bom.Id = exp.BOMId AND bom.CompanyId = @CompanyId
        LEFT JOIN MA_ProjectArticles_BOMComponents comp ON comp.BOMId = exp.BOMId AND comp.CompanyId = @CompanyId
        WHERE exp.IsLoop = 0 AND exp.BOMId IS NOT NULL
        GROUP BY exp.BOMId, bom.BOM, bom.Description
        ORDER BY exp.BOMId;
    END

    -- Cleanup
    DROP TABLE IF EXISTS #BOMExplosionCorrect;
    DROP TABLE IF EXISTS #EffectiveMarkups;

    RETURN 0;
END
GO
