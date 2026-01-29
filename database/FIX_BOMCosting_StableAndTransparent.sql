/*
  Fix definitivo (costificazione):
  1) Stabilizza i "ricarichi effettivi" evitando che calcoli di sola lettura / preview
     modifichino implicitamente i ricarichi usati (perché SP_GetEffectiveBOMMarkups pescava
     sempre l'ULTIMO record in MA_BOMCostingHistory).
     -> Ora i ricarichi CUSTOM vengono presi SOLO dall'ultimo storico con UpdateBOMRecord = 1
        (cioè un calcolo "ufficiale" che ha aggiornato la BOM).

  2) Trasparenza: in SP_GetBOMCostingDetails aggiunge un recordset con i ricarichi effettivi
     (ParameterName, MarkupPercentage, Source) così in UI/export puoi vedere cosa è stato usato.

  3) Trasparenza su DetailsJSON: in SP_CalculateBOMCosting, quando UpdateBOMRecord = 1,
     nel campo Details (DetailsJSON) della BOM vengono salvati anche:
     - quantita_lotto (Quantità LOTTO per divisione costi fissi)
     - ricarico_mp_pct, ricarico_ope_pct, ricarico_trasporto_pct, ricarico_scarto_pct,
       ricarico_totale_pct, ricarico_sconto_pct (% di ricarico previste, anche in export).

  NOTE:
  - Questo script usa ALTER PROCEDURE diretto per SP_GetEffectiveBOMMarkups (breve).
  - Per SP_GetBOMCostingDetails e SP_CalculateBOMCosting, applica patch testuali sul modulo.
*/

SET NOCOUNT ON;
GO

/* ============================================================
   1) SP_GetEffectiveBOMMarkups: usa solo storico "ufficiale"
   ============================================================ */
ALTER PROCEDURE [dbo].[SP_GetEffectiveBOMMarkups]
    @CompanyId INT,
    @BOMId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- Variabili per i ricarichi custom (solo da calcoli "ufficiali")
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

        /* 1) CUSTOM: ultimo storico "ufficiale" (UpdateBOMRecord = 1) */
        SELECT TOP 1
            @CustomMarkupRM = CustomMarkupRM,
            @CustomMarkupOperations = CustomMarkupOperations,
            @CustomMarkupTrasporto = CustomMarkupExternalOps, -- Mappa a trasporto
            @CustomMarkupScarto = CustomMarkupInternalOps,     -- Mappa a scarto
            @CustomMarkupTotale = CustomMarkupOverhead,       -- Mappa a totale
            @CustomMarkupSconto = CustomMarkupSconto
        FROM MA_BOMCostingHistory
        WHERE CompanyId = @CompanyId
          AND BOMId = @BOMId
          AND ISNULL(UpdateBOMRecord, 0) = 1
        ORDER BY CostingDate DESC;

        /* 2) GLOBALI */
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

        /* 3) Output: EFFETTIVI (Custom se presente, altrimenti Global) */
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

/* ============================================================
   2) SP_GetBOMCostingDetails: esponi ricarichi effettivi (non solo parametri globali)
   ============================================================ */
DECLARE @ProcName SYSNAME = N'SP_GetBOMCostingDetails';
DECLARE @SchemaName SYSNAME = N'dbo';

DECLARE @Definition NVARCHAR(MAX);
SELECT @Definition = m.definition
FROM sys.sql_modules m
INNER JOIN sys.objects o ON o.object_id = m.object_id
INNER JOIN sys.schemas s ON s.schema_id = o.schema_id
WHERE o.type = 'P'
  AND o.name = @ProcName
  AND s.name = @SchemaName;

IF @Definition IS NULL
BEGIN
  RAISERROR(N'Procedura %s.%s non trovata in sys.sql_modules.', 16, 1, @SchemaName, @ProcName);
  RETURN;
END

DECLARE @OldBlock NVARCHAR(MAX) = N'
        -- Ottieni parametri di costificazione utilizzati
        SELECT 
            param.ParameterName,
            param.ParameterValue,
            param.Description,
            param.IsActive
        FROM MA_BOMCostingParameters param
        WHERE param.CompanyId = @CompanyId AND param.IsActive = 1
        ORDER BY param.ParameterName;
';

DECLARE @NewBlock NVARCHAR(MAX) = N'
        -- Ricarichi effettivi usati (Custom/Global)
        -- NB: dopo la patch SP_GetEffectiveBOMMarkups usa solo storico "ufficiale" (UpdateBOMRecord=1)
        EXEC SP_GetEffectiveBOMMarkups @CompanyId = @CompanyId, @BOMId = @BOMId;

        -- Parametri globali (solo per riferimento)
        SELECT 
            param.ParameterName,
            param.ParameterValue,
            param.Description,
            param.IsActive
        FROM MA_BOMCostingParameters param
        WHERE param.CompanyId = @CompanyId AND param.IsActive = 1
        ORDER BY param.ParameterName;
';

DECLARE @Patched NVARCHAR(MAX) = REPLACE(@Definition, @OldBlock, @NewBlock);

IF @Patched = @Definition
BEGIN
  PRINT N'Patch non applicata su SP_GetBOMCostingDetails: blocco target non trovato (potrebbe essere già aggiornato).';
  RETURN;
END

SET @Patched = REPLACE(@Patched, N'CREATE   PROCEDURE', N'ALTER PROCEDURE');
SET @Patched = REPLACE(@Patched, N'CREATE PROCEDURE', N'ALTER PROCEDURE');

EXEC sp_executesql @Patched;
PRINT N'Patch applicata con successo a ' + QUOTENAME(@SchemaName) + N'.' + QUOTENAME(@ProcName) + N'.';
GO

/* ============================================================
   3) SP_CalculateBOMCosting: salva in DetailsJSON Lotto e % ricarichi effettivi
      (per trasparenza e export: "Quantità LOTTO" e "% di ricarico previste")
   ============================================================ */
DECLARE @ProcName2 SYSNAME = N'SP_CalculateBOMCosting';
DECLARE @SchemaName2 SYSNAME = N'dbo';

DECLARE @Def2 NVARCHAR(MAX);
SELECT @Def2 = m.definition
FROM sys.sql_modules m
INNER JOIN sys.objects o ON o.object_id = m.object_id
INNER JOIN sys.schemas s ON s.schema_id = o.schema_id
WHERE o.type = 'P'
  AND o.name = @ProcName2
  AND s.name = @SchemaName2;

IF @Def2 IS NULL
BEGIN
  PRINT N'Procedura ' + QUOTENAME(@SchemaName2) + N'.' + QUOTENAME(@ProcName2) + N' non trovata. Salta patch DetailsJSON.';
END
ELSE
BEGIN
  DECLARE @OldDetailsBlock NVARCHAR(MAX) = N'
        SET @DetailsJSON = (
            SELECT @TotalPricePerLot / @ProductionLot as prezzo, @VariableCostsMP as costo_mp,
                @VariableCostsOPE as costo_ope, @FixedCostsPerLot as costi_fissi,
                @RicaricoMPAmount as ricarico_mp, @RicaricoOPEAmount as ricarico_op,
                @RicaricoTrasportoAmount as ricarico_tr, @FinalUnitCost as costo_totale,
                @RicaricoScartoAmount as ricarico_scarto, @RicaricoScontoAmount as ricarico_sconto,
                @RicaricoTotaleAmount as ricarico_totale
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );';

  DECLARE @NewDetailsBlock NVARCHAR(MAX) = N'
        SET @DetailsJSON = (
            SELECT @TotalPricePerLot / @ProductionLot as prezzo, @VariableCostsMP as costo_mp,
                @VariableCostsOPE as costo_ope, @FixedCostsPerLot as costi_fissi,
                @RicaricoMPAmount as ricarico_mp, @RicaricoOPEAmount as ricarico_op,
                @RicaricoTrasportoAmount as ricarico_tr, @FinalUnitCost as costo_totale,
                @RicaricoScartoAmount as ricarico_scarto, @RicaricoScontoAmount as ricarico_sconto,
                @RicaricoTotaleAmount as ricarico_totale,
                @ProductionLot as quantita_lotto,
                @EffectiveRicaricoMP * 100 as ricarico_mp_pct,
                @EffectiveRicaricoOPE * 100 as ricarico_ope_pct,
                @EffectiveRicaricoTrasporto * 100 as ricarico_trasporto_pct,
                @EffectiveRicaricoScarto * 100 as ricarico_scarto_pct,
                @EffectiveRicaricoTotale * 100 as ricarico_totale_pct,
                @EffectiveRicaricoSconto * 100 as ricarico_sconto_pct
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );';

  DECLARE @Patched2 NVARCHAR(MAX) = REPLACE(@Def2, @OldDetailsBlock, @NewDetailsBlock);

  IF @Patched2 = @Def2
  BEGIN
    PRINT N'Patch DetailsJSON non applicata su SP_CalculateBOMCosting: blocco target non trovato (potrebbe essere già aggiornato).';
  END
  ELSE
  BEGIN
    SET @Patched2 = REPLACE(@Patched2, N'CREATE   PROCEDURE', N'ALTER PROCEDURE');
    SET @Patched2 = REPLACE(@Patched2, N'CREATE PROCEDURE', N'ALTER PROCEDURE');
    EXEC sp_executesql @Patched2;
    PRINT N'Patch DetailsJSON applicata con successo a ' + QUOTENAME(@SchemaName2) + N'.' + QUOTENAME(@ProcName2) + N'.';
  END
END
GO

