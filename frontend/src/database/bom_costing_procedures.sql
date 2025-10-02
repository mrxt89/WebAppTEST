-- =============================================
-- Stored Procedures per Costificazione BOM
-- Creato: 19/09/2025
-- Descrizione: Modulo completo per calcolo costi distinte base
-- =============================================

-- Tabella per parametri di costificazione
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MA_BOMCostingParameters' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[MA_BOMCostingParameters](
        [CompanyId] [int] NOT NULL,
        [Id] [bigint] IDENTITY(1,1) NOT NULL,
        [ParameterName] [varchar](50) NOT NULL,
        [ParameterValue] [float] NOT NULL,
        [Description] [nvarchar](255) NULL,
        [IsActive] [bit] NOT NULL DEFAULT 1,
        [TBCreated] [datetime] NOT NULL DEFAULT GETDATE(),
        [TBModified] [datetime] NOT NULL DEFAULT GETDATE(),
        [TBCreatedId] [int] NOT NULL DEFAULT 0,
        [TBModifiedId] [int] NOT NULL DEFAULT 0,
        CONSTRAINT [PK_MA_BOMCostingParameters] PRIMARY KEY CLUSTERED (
            [CompanyId] ASC,
            [Id] ASC
        ),
        CONSTRAINT [UQ_BOMCostingParameters_Name] UNIQUE (
            [CompanyId] ASC,
            [ParameterName] ASC
        )
    )
END
GO

-- Tabella per log delle costificazioni
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MA_BOMCostingLog' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[MA_BOMCostingLog](
        [CompanyId] [int] NOT NULL,
        [Id] [bigint] IDENTITY(1,1) NOT NULL,
        [BOMId] [bigint] NOT NULL,
        [LogLevel] [varchar](20) NOT NULL, -- INFO, WARNING, ERROR
        [LogMessage] [nvarchar](max) NOT NULL,
        [Details] [nvarchar](max) NULL,
        [TBCreated] [datetime] NOT NULL DEFAULT GETDATE(),
        [TBCreatedId] [int] NOT NULL DEFAULT 0,
        CONSTRAINT [PK_MA_BOMCostingLog] PRIMARY KEY CLUSTERED (
            [CompanyId] ASC,
            [Id] ASC
        )
    )
END
GO

-- =============================================
-- Procedura: Inizializza parametri di default
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[SP_InitializeBOMCostingParameters]
    @CompanyId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Parametri di default per i ricarichi
    DECLARE @DefaultParams TABLE (
        ParameterName VARCHAR(50),
        ParameterValue FLOAT,
        Description NVARCHAR(255)
    );
    
    INSERT INTO @DefaultParams VALUES
        ('RICARICO_MP', 0.15, 'Ricarico materia prima (15%) - solo per codici di materia prima'),
        ('RICARICO_OPE', 0.15, 'Ricarico operazioni (15%) - non si considerano i costi fissi'),
        ('RICARICO_TRASPORTO', 0.02, 'Ricarico trasporto (2%) - su somma costi variabili'),
        ('RICARICO_SCARTO', 0.04, 'Ricarico scarto (4%) - su somma costi variabili'),
        ('RICARICO_TOTALE', 0.20, 'Ricarico totale (20%) - su (costi variabili + ricarichi)'),
        ('RICARICO_SCONTO', 0.00, 'Ricarico sconto (0%) - su (costi variabili + ricarichi)'),
        ('COSTO_ORARIO_STANDARD', 25.00, 'Costo orario standard per operazioni'),
        ('MARKUP_GENERALE', 0.30, 'Markup generale per vendita (30%)');
    
    -- Inserisci parametri solo se non esistono
    INSERT INTO MA_BOMCostingParameters (CompanyId, ParameterName, ParameterValue, Description)
    SELECT @CompanyId, dp.ParameterName, dp.ParameterValue, dp.Description
    FROM @DefaultParams dp
    WHERE NOT EXISTS (
        SELECT 1 FROM MA_BOMCostingParameters bcp 
        WHERE bcp.CompanyId = @CompanyId 
        AND bcp.ParameterName = dp.ParameterName
    );
    
    SELECT 'Parametri inizializzati correttamente' AS Result;
END
GO

-- =============================================
-- Procedura: Ottieni parametro di costificazione
-- =============================================
CREATE OR ALTER FUNCTION [dbo].[FN_GetBOMCostingParameter]
(
    @CompanyId INT,
    @ParameterName VARCHAR(50),
    @DefaultValue FLOAT = 0
)
RETURNS FLOAT
AS
BEGIN
    DECLARE @Value FLOAT = @DefaultValue;
    
    SELECT @Value = ParameterValue 
    FROM MA_BOMCostingParameters 
    WHERE CompanyId = @CompanyId 
    AND ParameterName = @ParameterName 
    AND IsActive = 1;
    
    RETURN ISNULL(@Value, @DefaultValue);
END
GO

-- =============================================
-- Procedura: Log delle costificazioni
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[SP_LogBOMCosting]
    @CompanyId INT,
    @BOMId BIGINT,
    @LogLevel VARCHAR(20),
    @LogMessage NVARCHAR(MAX),
    @Details NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO MA_BOMCostingLog (CompanyId, BOMId, LogLevel, LogMessage, Details)
    VALUES (@CompanyId, @BOMId, @LogLevel, @LogMessage, @Details);
END
GO

-- =============================================
-- Procedura Principale: Costificazione BOM (Versione con Regole Corrette)
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[SP_CalculateBOMCosting]
    @CompanyId INT,
    @BOMId BIGINT,
    @OrderQuantity DECIMAL(18,5) = NULL,
    @ScrapPercentage FLOAT = NULL,
    @UseGranularMarkups BIT = 1, -- 1 = ricarichi granulari secondo le nuove regole
    @UseKnownData BIT = 1, -- 1 = usa dati noti quando disponibili, 0 = usa solo UnitCost
    @UpdateBOMRecord BIT = 1, -- 1 = aggiorna il record BOM con i costi calcolati, 0 = solo calcolo
    @UserId INT = NULL, -- ID dell'utente che esegue l'aggiornamento (per audit)
    @Debug BIT = 0,
    @Version INT = NULL -- Nuovo parametro per specificare la versione della BOM
AS
BEGIN
    SET NOCOUNT ON;
    
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
    DECLARE @DetailsJSON NVARCHAR(MAX) = '';
    DECLARE @Notes NVARCHAR(MAX) = '';
    
    -- Verifica esistenza BOM (con controllo versione se specificata)
    DECLARE @BOMExists BIT = 0;
    IF @Version IS NULL
    BEGIN
        -- Se non è specificata versione, usa la versione più recente
        SELECT @BOMExists = 1
        FROM MA_ProjectArticles_BillOfMaterials 
        WHERE CompanyId = @CompanyId AND Id = @BOMId;
    END
    ELSE
    BEGIN
        -- Se è specificata versione, verifica che esista
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
        RETURN -1;
    END
    
    -- Ottieni informazioni BOM (con versione specifica se indicata)
    IF @Version IS NULL
    BEGIN
        -- Usa la versione più recente
        SELECT @ProductionLot = ISNULL(ProductionLot, 1)
        FROM MA_ProjectArticles_BillOfMaterials 
        WHERE CompanyId = @CompanyId AND Id = @BOMId
        ORDER BY Version DESC;
    END
    ELSE
    BEGIN
        -- Usa la versione specificata
        SELECT @ProductionLot = ISNULL(ProductionLot, 1)
        FROM MA_ProjectArticles_BillOfMaterials 
        WHERE CompanyId = @CompanyId AND Id = @BOMId AND Version = @Version;
    END
    
    -- Determina percentuale scarto
    SET @ScrapPct = ISNULL(@ScrapPercentage, dbo.FN_GetBOMCostingParameter(@CompanyId, 'SCARTO_DEFAULT', 0.05));
    
    -- Log inizio calcolo
    DECLARE @LogMessage NVARCHAR(MAX) = 'OrderQty: ' + ISNULL(CAST(@OrderQuantity AS NVARCHAR(50)), '0') + ', ScrapPct: ' + ISNULL(CAST(@ScrapPct AS NVARCHAR(50)), '0');
    EXEC SP_LogBOMCosting @CompanyId, @BOMId, 'INFO', 'Inizio calcolo costificazione BOM', @LogMessage;
    
    -- Tabella temporanea per esplosione BOM corretta
    CREATE TABLE #BOMExplosionCorrect (
        Level INT,
        ItemId BIGINT,
        ComponentId BIGINT,
        ParentId BIGINT,
        BOMId BIGINT,
        ParentBOMId BIGINT,
        Line INT,
        ComponentType INT,
        Path NVARCHAR(MAX),
        Quantity DECIMAL(18,5),
        CalculatedQty DECIMAL(18,5),
        UoM VARCHAR(10),
        UnitCost FLOAT,
        TotalCost FLOAT,
        FixedCost FLOAT,
        ComponentNature INT,
        ComponentItemCode VARCHAR(64),
        ComponentDescription NVARCHAR(255),
        IsLoop BIT DEFAULT 0
    );
    
    -- Implementazione diretta dell'esplosione ricorsiva (basata su MA_ProjectArticles_GetBOMDatas)
    DECLARE @RootItemId BIGINT;
    DECLARE @RootBOMId BIGINT = @BOMId;
    
    -- Ottieni l'ItemId della distinta base
    SELECT @RootItemId = ItemId
    FROM MA_ProjectArticles_BillOfMaterials
    WHERE Id = @BOMId AND CompanyId = @CompanyId;
    
    IF @RootItemId IS NULL
    BEGIN
        EXEC SP_LogBOMCosting @CompanyId, @BOMId, 'ERROR', 'Distinta base non trovata';
        SELECT 'Distinta base non trovata' AS ErrorMessage;
        RETURN -1;
    END
    
    -- Inserisci il nodo root
    INSERT INTO #BOMExplosionCorrect (
        Level, ItemId, ComponentId, ParentId, BOMId, ParentBOMId, Line, ComponentType,
        Path, Quantity, CalculatedQty, UoM, UnitCost, TotalCost, FixedCost,
        ComponentNature, ComponentItemCode, ComponentDescription
    )
    SELECT 
        0, -- Level 0 per il nodo radice
        item.Id, -- ItemId
        item.Id, -- ComponentId (stesso dell'ItemId per il root)
        NULL, -- ParentId (NULL perché è la radice)
        @RootBOMId, -- BOMId
        NULL, -- ParentBOMId (NULL perché è la radice)
        0, -- Line
        7798784, -- ComponentType (Articolo)
        CAST(item.Id AS NVARCHAR(MAX)), -- Path
        CAST(1 AS DECIMAL(18,5)), -- Quantity
        CAST(1 AS DECIMAL(18,5)), -- CalculatedQty
        bom.UoM, -- UoM dalla distinta
        CAST(0 AS FLOAT), -- UnitCost
        CAST(0 AS FLOAT), -- TotalCost
        CAST(0 AS FLOAT), -- FixedCost
        item.Nature,
        item.Item,
        item.Description
    FROM MA_ProjectArticles_Items item
    JOIN MA_ProjectArticles_BillOfMaterials bom ON bom.ItemId = item.Id AND bom.CompanyId = item.CompanyId
    WHERE item.Id = @RootItemId AND item.CompanyId = @CompanyId AND bom.Id = @RootBOMId;
    
    -- Esplosione ricorsiva con WHILE loop (come nella stored originale)
    DECLARE @Level INT = 0;
    DECLARE @MaxIterations INT = 10;
    
    WHILE @Level < @MaxIterations
    BEGIN
        INSERT INTO #BOMExplosionCorrect (
            Level, ItemId, ComponentId, ParentId, BOMId, ParentBOMId, Line, ComponentType,
            Path, Quantity, CalculatedQty, UoM, UnitCost, TotalCost, FixedCost,
            ComponentNature, ComponentItemCode, ComponentDescription
        )
        SELECT 
            t.Level + 1, -- Level
            comp.ComponentId, -- ItemId (il ComponentId diventa l'ItemId al livello successivo)
            comp.ComponentId, -- ComponentId
            t.ItemId, -- ParentId (il nodo genitore è l'ItemId del livello corrente)
            -- Cerchiamo la distinta del componente se è un semilavorato
            (SELECT TOP 1 bom.Id 
             FROM MA_ProjectArticles_BillOfMaterials bom 
             WHERE bom.ItemId = comp.ComponentId AND bom.CompanyId = @CompanyId
             ORDER BY bom.Version DESC), -- BOMId
            t.BOMId, -- ParentBOMId (la distinta del padre)
            comp.Line, -- Line
            comp.ComponentType, -- ComponentType
            t.Path + '.' + CAST(comp.ComponentId AS NVARCHAR(MAX)), -- Path
            comp.Quantity, -- Quantity
            t.CalculatedQty * comp.Quantity, -- CalculatedQty
            comp.UoM, -- UoM
            comp.UnitCost, -- UnitCost
            comp.TotalCost, -- TotalCost
            comp.FixedCost, -- FixedCost
            item.Nature,
            item.Item,
            item.Description
        FROM #BOMExplosionCorrect t
        JOIN MA_ProjectArticles_BOMComponents comp ON t.BOMId = comp.BOMId AND comp.CompanyId = @CompanyId
        JOIN MA_ProjectArticles_Items item ON comp.ComponentId = item.Id AND comp.CompanyId = @CompanyId
        WHERE 
            t.Level = @Level
            AND item.Disabled = 0 -- Escludi articoli disabilitati
            AND comp.ComponentType <> 7798787 -- Escludi fantasmi
            AND NOT EXISTS (
                SELECT 1 FROM #BOMExplosionCorrect t2 
                WHERE t2.ComponentId = comp.ComponentId AND t2.Path LIKE t.Path + '%'
            ); -- Evita cicli infiniti
        
        -- Se non sono stati aggiunti nuovi record, esci dal ciclo
        IF @@ROWCOUNT = 0
            BREAK;
        
        SET @Level = @Level + 1;
    END;
    
    -- Rileva loop ciclici
    UPDATE #BOMExplosionCorrect 
    SET IsLoop = 1
    WHERE EXISTS (
        SELECT 1 FROM #BOMExplosionCorrect t2 
        WHERE t2.ComponentId = #BOMExplosionCorrect.ComponentId 
        AND t2.Level < #BOMExplosionCorrect.Level
        AND t2.Path LIKE #BOMExplosionCorrect.Path + '%'
    );
    
    -- Log warning per loop ciclici
    IF EXISTS (SELECT 1 FROM #BOMExplosionCorrect WHERE IsLoop = 1)
    BEGIN
        DECLARE @LoopItems NVARCHAR(MAX) = '';
        SELECT @LoopItems = @LoopItems + ISNULL(ComponentItemCode, '') + ', ' 
        FROM #BOMExplosionCorrect WHERE IsLoop = 1;
        IF LEN(@LoopItems) > 0
            SET @LoopItems = LEFT(@LoopItems, LEN(@LoopItems) - 2);
        EXEC SP_LogBOMCosting @CompanyId, @BOMId, 'WARNING', 'Rilevati loop ciclici nella BOM', @LoopItems;
    END
    
    -- =============================================
    -- NUOVA LOGICA DI CALCOLO SECONDO LE REGOLE SPECIFICATE
    -- =============================================
    
    -- 1. COSTI VARIABILI (Materia Prima + Operazioni senza costi fissi)
    DECLARE @VariableCosts FLOAT = 0;
    DECLARE @VariableCostsMP FLOAT = 0;  -- Costi variabili materia prima
    DECLARE @VariableCostsOPE FLOAT = 0; -- Costi variabili operazioni
    
    -- 1a. Costi variabili materia prima (con supporto dati noti)
    -- Calcoliamo i costi per ogni componente separatamente per evitare problemi con SUM annidati
    DECLARE @ComponentCosts TABLE (
        ComponentId BIGINT,
        CalculatedCost DECIMAL(18,6)
    );
    
    -- Calcola i costi per ogni componente
    INSERT INTO @ComponentCosts (ComponentId, CalculatedCost)
    SELECT 
        ComponentId,
        CASE 
            WHEN ComponentNature = 22413314 OR UnitCost > 0 
            THEN 
                -- Prova prima con dati noti (se abilitati), poi fallback a UnitCost
                CASE 
                    WHEN @UseKnownData = 1 AND dbo.FN_CalculateKnownDataCost(@CompanyId, ComponentItemCode, ComponentDescription, 'MATERIAL', 
                        ISNULL((SELECT SUM(rt.Qty) FROM MA_ProjectArticles_BOMRouting rt 
                               WHERE rt.BOMId = (SELECT TOP 1 bom.Id FROM MA_ProjectArticles_BillOfMaterials bom 
                                                WHERE bom.ItemId = ComponentId AND bom.CompanyId = @CompanyId)
                               AND rt.CompanyId = @CompanyId), 1), CalculatedQty) > 0 THEN
                        -- Usa costo calcolato dai dati noti
                        dbo.FN_CalculateKnownDataCost(@CompanyId, ComponentItemCode, ComponentDescription, 'MATERIAL', 
                            ISNULL((SELECT SUM(rt.Qty) FROM MA_ProjectArticles_BOMRouting rt 
                                   WHERE rt.BOMId = (SELECT TOP 1 bom.Id FROM MA_ProjectArticles_BillOfMaterials bom 
                                                    WHERE bom.ItemId = ComponentId AND bom.CompanyId = @CompanyId)
                                   AND rt.CompanyId = @CompanyId), 1), CalculatedQty)
                    ELSE
                        -- Fallback a UnitCost normale
                        CalculatedQty * UnitCost
                END
            ELSE 0 
        END
    FROM #BOMExplosionCorrect 
    WHERE IsLoop = 0;
    
    -- Somma tutti i costi dei componenti
    SELECT @VariableCostsMP = ISNULL(SUM(CalculatedCost), 0)
    FROM @ComponentCosts;
    
    -- Pulisci la tabella temporanea
    DELETE FROM @ComponentCosts;
    
    -- 1b. Costi variabili operazioni (con supporto dati noti)
    SELECT @VariableCostsOPE = ISNULL(SUM(
        -- Solo costo basato su tempo di lavorazione (NO setup time, NO fixed cost)
        CASE 
            WHEN op.UnitCost > 0 THEN 
                -- Se l'operazione ha un costo unitario, usalo
                op.UnitCost * exp.CalculatedQty
            WHEN wc.HourlyCost > 0 THEN
                -- SOLO Processing time moltiplicato per quantità (NO setup time)
                -- Match tramite CompanyId e Code (rt.WC = wc.Code)
                ((ISNULL(rt.ProcessingTime, 0) / 3600.0) * wc.HourlyCost * exp.CalculatedQty)
            ELSE
                -- Prova prima con dati noti per operazioni (se abilitati), poi fallback al parametro di default
                CASE 
                    WHEN @UseKnownData = 1 AND dbo.FN_CalculateKnownDataCost(@CompanyId, rt.Operation, ISNULL(op.Description, rt.Operation), 'OPERATION', 
                        ISNULL(rt.ProcessingTime, 0), rt.Qty * exp.CalculatedQty) > 0 THEN
                        -- Usa costo calcolato dai dati noti
                        dbo.FN_CalculateKnownDataCost(@CompanyId, rt.Operation, ISNULL(op.Description, rt.Operation), 'OPERATION', 
                            ISNULL(rt.ProcessingTime, 0), rt.Qty * exp.CalculatedQty)
                    ELSE
                        -- Fallback al parametro di default
                        ((ISNULL(rt.ProcessingTime, 0) / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0) * exp.CalculatedQty)
                END
        END
    ), 0)
    FROM #BOMExplosionCorrect exp
    JOIN MA_ProjectArticles_BOMRouting rt ON rt.BOMId = exp.BOMId AND rt.CompanyId = @CompanyId
    LEFT JOIN MA_ProjectArticles_BOMOperations op ON rt.Operation = op.Code AND op.CompanyId = @CompanyId AND op.Active = 1
    LEFT JOIN MA_ProjectArticles_BOMWorkCenters wc ON rt.WC = wc.Code AND wc.CompanyId = @CompanyId
    WHERE exp.IsLoop = 0 AND exp.BOMId IS NOT NULL;
    
    SET @VariableCosts = @VariableCostsMP + @VariableCostsOPE;
    
    -- 2. COSTI FISSI (FixedCost + Setup Time)
    DECLARE @FixedCosts FLOAT = 0;
    
    -- 2a. Costi fissi da componenti
    SELECT @FixedCosts = ISNULL(SUM(
        CASE 
            WHEN FixedCost > 0 AND @ProductionLot > 0
            THEN (FixedCost / @ProductionLot) * CalculatedQty  -- Converti costo fisso per lotto in unitario
            ELSE 0 
        END
    ), 0)
    FROM #BOMExplosionCorrect 
    WHERE IsLoop = 0;
    
    -- 2b. Costi fissi da operazioni (FixedCost + Setup Time)
    DECLARE @FixedCostsOperations FLOAT = 0;
    SELECT @FixedCostsOperations = ISNULL(SUM(
        -- Setup time (costo fisso) + FixedCost delle operazioni
        CASE 
            WHEN wc.HourlyCost > 0 THEN
                -- Setup time NON moltiplicato per quantità (è un costo fisso)
                -- Match tramite CompanyId e Code (rt.WC = wc.Code)
                ((ISNULL(rt.SetupTime, 0) / 3600.0) * wc.HourlyCost) + ISNULL(op.FixedCost, 0)
            ELSE
                -- Fallback al parametro di default
                ((ISNULL(rt.SetupTime, 0) / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0)) + ISNULL(op.FixedCost, 0)
        END
    ), 0)
    FROM #BOMExplosionCorrect exp
    JOIN MA_ProjectArticles_BOMRouting rt ON rt.BOMId = exp.BOMId AND rt.CompanyId = @CompanyId
    LEFT JOIN MA_ProjectArticles_BOMOperations op ON rt.Operation = op.Code AND op.CompanyId = @CompanyId AND op.Active = 1
    LEFT JOIN MA_ProjectArticles_BOMWorkCenters wc ON rt.WC = wc.Code AND wc.CompanyId = @CompanyId
    WHERE exp.IsLoop = 0 AND exp.BOMId IS NOT NULL;
    
    SET @FixedCosts = @FixedCosts + @FixedCostsOperations;
    
    -- 3. COSTI FISSI SU LOTTO (divisi per lotto di produzione)
    DECLARE @FixedCostsPerLot FLOAT = 0;
    IF @ProductionLot > 0
        SET @FixedCostsPerLot = @FixedCosts / @ProductionLot;
    
    -- Mantieni compatibilità con variabili esistenti
    SET @MaterialCost = @VariableCostsMP;
    SET @OperationsCost = @VariableCostsOPE;
    SET @FixedCost = @FixedCostsPerLot;
    
    -- Costo base totale (costi variabili + costi fissi per lotto)
    SET @BaseCost = @VariableCosts + @FixedCostsPerLot;
    
    -- Log warning per costi zero
    IF @BaseCost = 0
    BEGIN
        DECLARE @WarningMessage NVARCHAR(MAX) = 'MaterialCost: ' + ISNULL(CAST(@MaterialCost AS NVARCHAR(50)), '0') + ', OperationsCost: ' + ISNULL(CAST(@OperationsCost AS NVARCHAR(50)), '0') + ', FixedCost: ' + ISNULL(CAST(@FixedCost AS NVARCHAR(50)), '0');
        EXEC SP_LogBOMCosting @CompanyId, @BOMId, 'WARNING', 'Costo base calcolato è zero', @WarningMessage;
    END
    
    -- Applicazione scarto
    IF @ScrapPct > 0 AND @ScrapPct < 1
    BEGIN
        SET @AdjustedCost = @BaseCost / (1.0 - @ScrapPct);
    END
    ELSE
    BEGIN
        SET @AdjustedCost = @BaseCost;
    END
    
    -- =============================================
    -- APPLICAZIONE RICARICHI SECONDO LE NUOVE REGOLE
    -- =============================================
    
    -- Ottieni parametri ricarichi
    DECLARE @RicaricoMP FLOAT = dbo.FN_GetBOMCostingParameter(@CompanyId, 'RICARICO_MP', 0.15);
    DECLARE @RicaricoOPE FLOAT = dbo.FN_GetBOMCostingParameter(@CompanyId, 'RICARICO_OPE', 0.15);
    DECLARE @RicaricoTrasporto FLOAT = dbo.FN_GetBOMCostingParameter(@CompanyId, 'RICARICO_TRASPORTO', 0.02);
    DECLARE @RicaricoScarto FLOAT = dbo.FN_GetBOMCostingParameter(@CompanyId, 'RICARICO_SCARTO', 0.04);
    DECLARE @RicaricoTotale FLOAT = dbo.FN_GetBOMCostingParameter(@CompanyId, 'RICARICO_TOTALE', 0.20);
    DECLARE @RicaricoSconto FLOAT = dbo.FN_GetBOMCostingParameter(@CompanyId, 'RICARICO_SCONTO', 0.44);
    
    -- Calcola ricarichi secondo le regole specificate
    DECLARE @RicaricoMPAmount FLOAT = @VariableCostsMP * @RicaricoMP;
    DECLARE @RicaricoOPEAmount FLOAT = @VariableCostsOPE * @RicaricoOPE;
    DECLARE @RicaricoTrasportoAmount FLOAT = @VariableCosts * @RicaricoTrasporto;
    DECLARE @RicaricoScartoAmount FLOAT = @VariableCosts / (1 - @RicaricoScarto) - @VariableCosts;
    
    -- Somma dei ricarichi (MP + OPE + Trasporto + Scarto)
    DECLARE @SommaRicarichi FLOAT = @RicaricoMPAmount + @RicaricoOPEAmount + @RicaricoTrasportoAmount + @RicaricoScartoAmount;
    
    -- Ricarico totale: (Somma costi variabili + Somma ricarichi) * coefficiente
    DECLARE @RicaricoTotaleAmount FLOAT = (@VariableCosts + @SommaRicarichi) * @RicaricoTotale;
    
    -- Ricarico sconto: (Somma costi variabili + Somma ricarichi) / (1 - Coeff) - (Somma costi variabili + Somma ricarichi)
    DECLARE @RicaricoScontoAmount FLOAT = (@VariableCosts + @SommaRicarichi) / (1 - @RicaricoSconto) - (@VariableCosts + @SommaRicarichi);
    
    -- Costo finale unitario
    SET @FinalUnitCost = @VariableCosts + @FixedCostsPerLot + @SommaRicarichi + @RicaricoTotaleAmount + @RicaricoScontoAmount;
    
    -- Per compatibilità con il codice esistente
    SET @FinalMarkup = @RicaricoTotale;
    
    -- Calcolo costo totale ordine
    IF @OrderQuantity IS NOT NULL AND @OrderQuantity > 0
    BEGIN
        SET @TotalOrderCost = @FinalUnitCost * @OrderQuantity;
    END
    
    -- Calcola costi e prezzi per lotto economico
    SET @TotalCostPerLot = @FinalUnitCost * @ProductionLot;
    SET @TotalPricePerLot = @TotalCostPerLot * (1 + ISNULL(@FinalMarkup, dbo.FN_GetBOMCostingParameter(@CompanyId, 'RICARICO_TOTALE', 0.20)));
    
    -- Aggiorna la tabella BOM con i costi calcolati (se richiesto)
    IF @UpdateBOMRecord = 1
    BEGIN
        -- Calcola i costi per lotto di riferimento (se diverso dal lotto economico)
        DECLARE @RefillLot INT = @ProductionLot; -- Per ora usiamo lo stesso lotto
        DECLARE @RefillCost FLOAT = @FinalUnitCost * @RefillLot;
        DECLARE @RefillPrice FLOAT = @RefillCost * (1 + ISNULL(@FinalMarkup, dbo.FN_GetBOMCostingParameter(@CompanyId, 'RICARICO_TOTALE', 0.20)));
        
        -- Crea il JSON con i dettagli della costificazione (tutti i valori per singolo pezzo)
        SET @DetailsJSON = (
            SELECT 
                @TotalPricePerLot / @ProductionLot as prezzo,  -- Prezzo per singolo pezzo
                @VariableCostsMP as costo_mp,
                @VariableCostsOPE as costo_ope,
                @FixedCostsPerLot as costi_fissi,
                @RicaricoMPAmount as ricarico_mp,
                @RicaricoOPEAmount as ricarico_op,
                @RicaricoTrasportoAmount as ricarico_tr,
                @FinalUnitCost as costo_totale,  -- Costo per singolo pezzo
                @RicaricoScartoAmount as ricarico_scarto,
                @RicaricoScontoAmount as ricarico_sconto,
                @RicaricoTotaleAmount as ricarico_totale
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );
        
        -- Crea le note con i riferimenti
        SET @Notes = ' || lotto(rif): ' + CAST(@RefillLot AS VARCHAR(10)) + 
                    ' | Prezzo(rif): ' + CAST(ROUND(@RefillPrice / @RefillLot, 2) AS VARCHAR(20)) + 
                    ' | Costo(rif): ' + CAST(ROUND(@RefillCost / @RefillLot, 2) AS VARCHAR(20)) + ' ||';
        
        UPDATE MA_ProjectArticles_BillOfMaterials
        SET 
            ProductionLot = @ProductionLot,
            RMCost = @VariableCostsMP,
            ProcessingCost = @VariableCostsOPE,
            RMRefillCost = @RicaricoMPAmount,
            ProcessingRefillCost = @RicaricoOPEAmount,
            TotalCost = @FinalUnitCost,      -- COSTO PER SINGOLO PEZZO
            TotalPrice = @TotalPricePerLot / @ProductionLot,  -- PREZZO PER SINGOLO PEZZO
            RefillWaste = @RicaricoScartoAmount,
            RefillDiscount = @RicaricoScontoAmount,
            TotalRefill = @SommaRicarichi,
            TransportRefill = @RicaricoTrasportoAmount,
            Details = @DetailsJSON,
            Notes = @Notes,
            LastCostingUpdatedBy = @UserId,  -- NUOVO: Utente che ha eseguito l'aggiornamento
            LastCostingUpdatedAt = GETDATE() -- NUOVO: Data/ora dell'aggiornamento
        WHERE CompanyId = @CompanyId AND Id = @BOMId;
        
        -- Log aggiornamento (valori per singolo pezzo)
		DECLARE @TextNotes VARCHAR(MAX) = 'TotalCost (per pezzo): ' + CAST(@FinalUnitCost AS VARCHAR(20)) + ', TotalPrice (per pezzo): ' + CAST(@TotalPricePerLot / @ProductionLot AS VARCHAR(20))
        EXEC SP_LogBOMCosting @CompanyId, @BOMId, 'INFO', 'Record BOM aggiornato con i costi calcolati', @TextNotes;
    END
    
    -- Log completamento
    DECLARE @CompletionMessage NVARCHAR(MAX) = 'BaseCost: ' + ISNULL(CAST(@BaseCost AS NVARCHAR(50)), '0') + ', FinalCost: ' + ISNULL(CAST(@FinalUnitCost AS NVARCHAR(50)), '0');
    EXEC SP_LogBOMCosting @CompanyId, @BOMId, 'INFO', 'Calcolo costificazione completato', @CompletionMessage;
    
    -- Output risultato con dettaglio ricarichi
    SELECT 
        @BOMId as bom_id,
        bom.BOM as bom_code,
        bom.Description as bom_description,
        itm.Item as item_code,
        itm.Description as item_description,
        
        -- Costi base
        @VariableCostsMP as variable_costs_material,
        @VariableCostsOPE as variable_costs_operations,
        @FixedCostsOperations as fixed_costs_operations,
        (@VariableCostsOPE + @FixedCostsOperations) as total_operations_cost,
        @VariableCosts as total_variable_costs,
        @FixedCosts as total_fixed_costs,
        @FixedCostsPerLot as fixed_costs_per_lot,
        @BaseCost as base_cost,
        @ScrapPct as scarto_pct,
        @AdjustedCost as adjusted_cost,
        
        -- Dettaglio ricarichi
        @RicaricoMP as ricarico_mp_pct,
        @RicaricoMPAmount as ricarico_mp_amount,
        @RicaricoOPE as ricarico_ope_pct,
        @RicaricoOPEAmount as ricarico_ope_amount,
        @RicaricoTrasporto as ricarico_trasporto_pct,
        @RicaricoTrasportoAmount as ricarico_trasporto_amount,
        @RicaricoScarto as ricarico_scarto_pct,
        @RicaricoScartoAmount as ricarico_scarto_amount,
        @SommaRicarichi as somma_ricarichi,
        @RicaricoTotale as ricarico_totale_pct,
        @RicaricoTotaleAmount as ricarico_totale_amount,
        @RicaricoSconto as ricarico_sconto_pct,
        @RicaricoScontoAmount as ricarico_sconto_amount,
        
        -- Lotto economico
        @ProductionLot as production_lot,
        
        -- Costi unitari finali
        @FinalUnitCost as unit_cost_final,
        @TotalPricePerLot / @ProductionLot as unit_price_final,
        
        -- Costi per lotto economico
        @TotalCostPerLot as total_cost_per_lot,
        @TotalPricePerLot as total_price_per_lot,
        
        -- Costi ordine
        @TotalOrderCost as total_cost_order,
        ISNULL(@OrderQuantity, 0) as order_quantity,
        
        -- Informazioni aggiuntive
        bom.Version as bom_version,
        bom.UoM as unit_of_measure,
        GETDATE() as calculation_timestamp,
        (SELECT COUNT(*) FROM #BOMExplosionCorrect WHERE IsLoop = 0) as components_count,
        (SELECT COUNT(*) FROM #BOMExplosionCorrect WHERE IsLoop = 1) as loops_detected,
        CASE 
            WHEN @BaseCost = 0 THEN 'WARNING: Costo base zero'
            WHEN EXISTS (SELECT 1 FROM #BOMExplosionCorrect WHERE IsLoop = 1) THEN 'WARNING: Loop rilevati'
            ELSE 'OK'
        END as status_note
    FROM MA_ProjectArticles_BillOfMaterials bom
    JOIN MA_ProjectArticles_Items itm ON bom.ItemId = itm.Id AND bom.CompanyId = itm.CompanyId
    WHERE bom.CompanyId = @CompanyId AND bom.Id = @BOMId
    AND (@Version IS NULL OR bom.Version = @Version);
    
    -- Output dettaglio componenti se richiesto
    IF @Debug = 1
    BEGIN
        -- Dettaglio componenti dalla tabella principale (come in SP_GetBOMCostingDetails)
        SELECT 
            comp.ComponentId as ComponentId,
            comp.Line as ComponentLine,
            comp.ComponentId as ItemId,
            itm.Item as ItemCode,
            itm.Description as ItemDescription,
            comp.Quantity,
            comp.UoM,
            comp.UnitCost,
            comp.FixedCost,
            comp.TotalCost,
            comp.ComponentType,
            CASE 
                WHEN comp.ComponentType = 22413312 THEN 'Semilavorato'
                WHEN comp.ComponentType = 22413313 THEN 'Prodotto Finito'
                WHEN comp.ComponentType = 22413314 THEN 'Acquisto'
                WHEN comp.ComponentType = 22413315 THEN 'Operazione'
                ELSE 'Altro'
            END as ComponentTypeDescription,
            -- Calcola il costo totale per questo componente
            (comp.Quantity * ISNULL(comp.UnitCost, 0)) + ISNULL(comp.FixedCost, 0) as CalculatedTotalCost
        FROM MA_ProjectArticles_BOMComponents comp
        LEFT JOIN MA_ProjectArticles_Items itm ON comp.ComponentId = itm.Id AND comp.CompanyId = itm.CompanyId
        WHERE comp.BOMId = @BOMId AND comp.CompanyId = @CompanyId
        ORDER BY comp.Line;
        
        -- Dettaglio esplosione multilivello (se necessario)
        SELECT 
            Level,
            ComponentItemCode,
            ComponentDescription,
            ComponentType,
            CASE ComponentNature
                WHEN 22413312 THEN 'Semilavorato'
                WHEN 22413313 THEN 'Prodotto Finito'  
                WHEN 22413314 THEN 'Acquisto'
                ELSE 'Altro'
            END as ComponentNature,
            Quantity,
            CalculatedQty,
            UoM,
            UnitCost,
            FixedCost,
            TotalCost,
            IsLoop
        FROM #BOMExplosionCorrect
        ORDER BY Level, ComponentItemCode;
    END
    
    -- Cleanup
    DROP TABLE #BOMExplosionCorrect;
    
    RETURN 0;
END
GO

-- =============================================
-- Procedura: Costificazione batch multipli BOM
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[SP_BatchCalculateBOMCosting]
    @CompanyId INT,
    @BOMIds NVARCHAR(MAX), -- Lista IDs separati da virgola
    @OrderQuantity DECIMAL(18,5) = NULL,
    @ScrapPercentage FLOAT = NULL,
    @UseKnownData BIT = 1, -- 1 = usa dati noti quando disponibili, 0 = usa solo UnitCost
    @UpdateBOMRecord BIT = 1, -- 1 = aggiorna i record BOM, 0 = solo calcolo
    @UserId INT = NULL, -- ID dell'utente che esegue l'aggiornamento (per audit)
    @Version INT = NULL -- Nuovo parametro per specificare la versione (applicata a tutte le BOM)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @BOMId BIGINT;
    DECLARE @Results TABLE (
        BOMId BIGINT,
        Status VARCHAR(20),
        FinalCost FLOAT,
        ErrorMessage NVARCHAR(MAX)
    );
    
    -- Tabella temporanea per split BOM IDs
    CREATE TABLE #BOMIds (
        BOMId BIGINT
    );
    
    -- Split manuale della stringa BOM IDs
    DECLARE @CurrentPos INT = 1;
    DECLARE @NextPos INT;
    DECLARE @CurrentBOMId NVARCHAR(50);
    
    WHILE @CurrentPos <= LEN(@BOMIds)
    BEGIN
        SET @NextPos = CHARINDEX(',', @BOMIds, @CurrentPos);
        IF @NextPos = 0
            SET @NextPos = LEN(@BOMIds) + 1;
        
        SET @CurrentBOMId = LTRIM(RTRIM(SUBSTRING(@BOMIds, @CurrentPos, @NextPos - @CurrentPos)));
        
        IF @CurrentBOMId <> ''
        BEGIN
            INSERT INTO #BOMIds (BOMId) VALUES (CAST(@CurrentBOMId AS BIGINT));
        END
        
        SET @CurrentPos = @NextPos + 1;
    END
    
    -- Cursore per processare ogni BOM
    DECLARE bom_cursor CURSOR FOR
    SELECT BOMId FROM #BOMIds;
    
    OPEN bom_cursor;
    FETCH NEXT FROM bom_cursor INTO @BOMId;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        BEGIN TRY
            EXEC SP_CalculateBOMCosting @CompanyId, @BOMId, @OrderQuantity, @ScrapPercentage, 1, @UseKnownData, @UpdateBOMRecord, @UserId, 0, @Version;
            INSERT INTO @Results VALUES (@BOMId, 'SUCCESS', 0, NULL);
        END TRY
        BEGIN CATCH
            INSERT INTO @Results VALUES (@BOMId, 'ERROR', 0, ERROR_MESSAGE());
        END CATCH
        
        FETCH NEXT FROM bom_cursor INTO @BOMId;
    END
    
    CLOSE bom_cursor;
    DEALLOCATE bom_cursor;
    
    -- Cleanup
    DROP TABLE #BOMIds;
    
    SELECT * FROM @Results;
END
GO

-- =============================================
-- Stored Procedure: SP_GetBOMCostingDetails
-- Descrizione: Ottiene il dettaglio dei calcoli di costificazione per una BOM
-- =============================================
CREATE OR ALTER PROCEDURE SP_GetBOMCostingDetails
    @CompanyId INT,
    @BOMId BIGINT,
    @CalculationId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Verifica che la BOM esista
        IF NOT EXISTS (
            SELECT 1 FROM MA_ProjectArticles_BillOfMaterials 
            WHERE Id = @BOMId AND CompanyId = @CompanyId
        )
        BEGIN
            RAISERROR('BOM non trovata con l''ID specificato', 16, 1);
            RETURN;
        END
        
        -- Se non viene fornito CalculationId, usa l'ultimo calcolo
        IF @CalculationId IS NULL
        BEGIN
            SELECT TOP 1 @CalculationId = Id 
            FROM MA_BOMCostingLog 
            WHERE BOMId = @BOMId AND CompanyId = @CompanyId 
            AND LogLevel = 'INFO' 
            AND LogMessage LIKE '%Costificazione completata%'
            ORDER BY TBCreated DESC;
        END
        
        -- Ottieni informazioni base della BOM con dettagli completi
        SELECT 
            bom.Id as BOMId,
            bom.BOM as BOMCode,
            bom.Description as BOMDescription,
            itm.Item as ItemCode,
            itm.Description as ItemDescription,
            bom.UoM as UnitOfMeasure,
            bom.TotalCost as LastCalculatedCost,
            bom.RMCost as LastMaterialCost,
            bom.ProcessingCost as LastProcessingCost,
            bom.ProductionLot,
            bom.RMRefillCost as LastMaterialRefillCost,
            bom.ProcessingRefillCost as LastProcessingRefillCost,
            bom.RefillWaste as LastWasteRefillCost,
            bom.RefillDiscount as LastDiscountRefillCost,
            bom.TotalRefill as LastTotalRefillCost,
            bom.TransportRefill as LastTransportRefillCost,
            bom.Details as CostingDetailsJSON,
            bom.Notes as CostingNotes,
            bom.LastCostingUpdatedBy,
            bom.LastCostingUpdatedAt
        FROM MA_ProjectArticles_BillOfMaterials bom
        JOIN MA_ProjectArticles_Items itm ON bom.ItemId = itm.Id AND bom.CompanyId = itm.CompanyId
        WHERE bom.Id = @BOMId AND bom.CompanyId = @CompanyId;
        
        -- Crea tabella temporanea per esplosione BOM completa (come in SP_CalculateBOMCosting)
        CREATE TABLE #BOMExplosionForDetails (
            Level INT,
            ItemId BIGINT,
            ComponentId BIGINT,
            ParentId BIGINT,
            BOMId BIGINT,
            ParentBOMId BIGINT,
            Line INT,
            ComponentType INT,
            Path NVARCHAR(MAX),
            Quantity DECIMAL(18,5),
            CalculatedQty DECIMAL(18,5),
            UoM VARCHAR(10),
            UnitCost FLOAT,
            TotalCost FLOAT,
            FixedCost FLOAT,
            ComponentNature INT,
            ComponentItemCode VARCHAR(64),
            ComponentDescription NVARCHAR(255),
            IsLoop BIT DEFAULT 0
        );
        
        -- Implementazione esplosione ricorsiva (stessa logica di SP_CalculateBOMCosting)
        DECLARE @RootItemId BIGINT;
        DECLARE @RootBOMId BIGINT = @BOMId;
        DECLARE @Level INT = 0;
        DECLARE @MaxIterations INT = 10; -- Limite per evitare loop infiniti
        
        -- Ottieni l'ItemId della distinta base
        SELECT @RootItemId = ItemId
        FROM MA_ProjectArticles_BillOfMaterials
        WHERE Id = @BOMId AND CompanyId = @CompanyId;
        
        -- Inserisci il nodo root
        INSERT INTO #BOMExplosionForDetails (
            Level, ItemId, ComponentId, ParentId, BOMId, ParentBOMId, Line, ComponentType,
            Path, Quantity, CalculatedQty, UoM, UnitCost, TotalCost, FixedCost,
            ComponentNature, ComponentItemCode, ComponentDescription
        )
        SELECT 
            0, -- Level 0 per il nodo radice
            bom.ItemId, -- ItemId
            bom.ItemId, -- ComponentId (per il root è lo stesso)
            NULL, -- ParentId (root non ha padre)
            bom.Id, -- BOMId
            NULL, -- ParentBOMId (root non ha padre)
            0, -- Line (root ha linea 0)
            0, -- ComponentType (root)
            CAST(bom.ItemId AS NVARCHAR(MAX)), -- Path
            1, -- Quantity (root ha quantità 1)
            1, -- CalculatedQty (root ha quantità calcolata 1)
            bom.UoM, -- UoM
            0, -- UnitCost (root non ha costo unitario)
            0, -- TotalCost (root non ha costo totale)
            0, -- FixedCost (root non ha costo fisso)
            itm.Nature, -- ComponentNature
            itm.Item, -- ComponentItemCode
            itm.Description -- ComponentDescription
        FROM MA_ProjectArticles_BillOfMaterials bom
        JOIN MA_ProjectArticles_Items itm ON bom.ItemId = itm.Id AND bom.CompanyId = itm.CompanyId
        WHERE bom.Id = @BOMId AND bom.CompanyId = @CompanyId;
        
        -- Espandi ricorsivamente tutti i livelli
        WHILE @Level < @MaxIterations
        BEGIN
            INSERT INTO #BOMExplosionForDetails (
                Level, ItemId, ComponentId, ParentId, BOMId, ParentBOMId, Line, ComponentType,
                Path, Quantity, CalculatedQty, UoM, UnitCost, TotalCost, FixedCost,
                ComponentNature, ComponentItemCode, ComponentDescription
            )
            SELECT 
                t.Level + 1, -- Level
                comp.ComponentId, -- ItemId
                comp.ComponentId, -- ComponentId
                t.ItemId, -- ParentId
                (SELECT TOP 1 bom.Id 
                 FROM MA_ProjectArticles_BillOfMaterials bom 
                 WHERE bom.ItemId = comp.ComponentId AND bom.CompanyId = @CompanyId
                 ORDER BY bom.Version DESC), -- BOMId
                t.BOMId, -- ParentBOMId
                comp.Line, -- Line
                comp.ComponentType, -- ComponentType
                t.Path + '.' + CAST(comp.ComponentId AS NVARCHAR(MAX)), -- Path
                comp.Quantity, -- Quantity
                t.CalculatedQty * comp.Quantity, -- CalculatedQty
                comp.UoM, -- UoM
                comp.UnitCost, -- UnitCost
                comp.TotalCost, -- TotalCost
                comp.FixedCost, -- FixedCost
                item.Nature, -- ComponentNature
                item.Item, -- ComponentItemCode
                item.Description -- ComponentDescription
            FROM #BOMExplosionForDetails t
            JOIN MA_ProjectArticles_BOMComponents comp ON t.BOMId = comp.BOMId AND comp.CompanyId = @CompanyId
            JOIN MA_ProjectArticles_Items item ON comp.ComponentId = item.Id AND comp.CompanyId = @CompanyId
            WHERE 
                t.Level = @Level
                AND item.Disabled = 0
                AND comp.ComponentType <> 7798787 -- Esclude operazioni
                AND NOT EXISTS (
                    SELECT 1 FROM #BOMExplosionForDetails t2 
                    WHERE t2.ComponentId = comp.ComponentId AND t2.Path LIKE t.Path + '%'
                );
            
            IF @@ROWCOUNT = 0
                BREAK;
            
            SET @Level = @Level + 1;
        END;
        
        -- Rileva loop
        UPDATE #BOMExplosionForDetails 
        SET IsLoop = 1
        WHERE EXISTS (
            SELECT 1 FROM #BOMExplosionForDetails t2 
            WHERE t2.ComponentId = #BOMExplosionForDetails.ComponentId 
            AND t2.Path <> #BOMExplosionForDetails.Path
            AND #BOMExplosionForDetails.Path LIKE t2.Path + '%'
        );
        
        -- Ottieni dettaglio componenti con esplosione completa e costificazione
        SELECT 
            Level,
            ComponentId,
            Line as ComponentLine,
            ItemId,
            ComponentItemCode as ItemCode,
            ComponentDescription as ItemDescription,
            ComponentNature as ItemNature,
            Quantity,
            CalculatedQty,
            UoM,
            UnitCost,
            FixedCost,
            TotalCost,
            ComponentType,
            CASE 
                WHEN ComponentType = 22413312 THEN 'Semilavorato'
                WHEN ComponentType = 22413313 THEN 'Prodotto Finito'
                WHEN ComponentType = 22413314 THEN 'Acquisto'
                WHEN ComponentType = 22413315 THEN 'Operazione'
                ELSE 'Altro'
            END as ComponentTypeDescription,
            -- Calcola il costo unitario del componente (per unità di misura)
            CASE 
                WHEN ComponentType IN (22413312, 22413313) THEN
                    -- Per semilavorati e prodotti finiti, calcola il costo dalla loro BOM
                    ISNULL((
                        SELECT 
                            (bom_comp.TotalCost / NULLIF(bom_comp.ProductionLot, 0))
                        FROM MA_ProjectArticles_BillOfMaterials bom_comp
                        WHERE bom_comp.ItemId = ComponentId 
                        AND bom_comp.CompanyId = @CompanyId
                        AND bom_comp.TotalCost > 0
                    ), UnitCost)
                ELSE 
                    -- Per acquisti, usa il costo unitario diretto
                    UnitCost
            END as CalculatedUnitCost,
            -- Calcola il costo totale per questo componente (costo unitario * quantità calcolata)
            CASE 
                WHEN ComponentType IN (22413312, 22413313) THEN
                    -- Per semilavorati e prodotti finiti: (costo per pezzo dalla BOM * quantità calcolata) + costi fissi
                    (CalculatedQty * ISNULL((
                        SELECT 
                            (bom_comp.TotalCost / NULLIF(bom_comp.ProductionLot, 0))
                        FROM MA_ProjectArticles_BillOfMaterials bom_comp
                        WHERE bom_comp.ItemId = ComponentId 
                        AND bom_comp.CompanyId = @CompanyId
                        AND bom_comp.TotalCost > 0
                    ), UnitCost)) + ISNULL(FixedCost, 0)
                ELSE 
                    -- Per acquisti: (costo per unità * quantità calcolata) + costi fissi
                    (CalculatedQty * ISNULL(UnitCost, 0)) + ISNULL(FixedCost, 0)
            END as CalculatedTotalCost,
            -- Calcola il costo unitario effettivo (costo totale / quantità calcolata)
            CASE 
                WHEN CalculatedQty > 0 THEN 
                    CASE 
                        WHEN ComponentType IN (22413312, 22413313) THEN
                            -- Per semilavorati: costo per pezzo dalla BOM + (costi fissi / quantità calcolata)
                            ISNULL((
                                SELECT 
                                    (bom_comp.TotalCost / NULLIF(bom_comp.ProductionLot, 0))
                                FROM MA_ProjectArticles_BillOfMaterials bom_comp
                                WHERE bom_comp.ItemId = ComponentId 
                                AND bom_comp.CompanyId = @CompanyId
                                AND bom_comp.TotalCost > 0
                            ), UnitCost) + (ISNULL(FixedCost, 0) / CalculatedQty)
                        ELSE 
                            -- Per acquisti: costo per unità + (costi fissi / quantità calcolata)
                            UnitCost + (ISNULL(FixedCost, 0) / CalculatedQty)
                    END
                ELSE 0
            END as EffectiveUnitCost,
            -- Indica se il componente ha un costo valido
            CASE 
                WHEN (ComponentType IN (22413312, 22413313) AND EXISTS (
                    SELECT 1 FROM MA_ProjectArticles_BillOfMaterials bom_comp
                    WHERE bom_comp.ItemId = ComponentId 
                    AND bom_comp.CompanyId = @CompanyId
                    AND bom_comp.TotalCost > 0
                )) OR (ComponentType = 22413314 AND UnitCost > 0) OR FixedCost > 0 THEN 1
                ELSE 0
            END as HasValidCost,
            -- Indica se il costo è stato calcolato dalla BOM del componente
            CASE 
                WHEN ComponentType IN (22413312, 22413313) AND EXISTS (
                    SELECT 1 FROM MA_ProjectArticles_BillOfMaterials bom_comp
                    WHERE bom_comp.ItemId = ComponentId 
                    AND bom_comp.CompanyId = @CompanyId
                    AND bom_comp.TotalCost > 0
                ) THEN 1
                ELSE 0
            END as CostFromBOM,
            Path,
            IsLoop
        FROM #BOMExplosionForDetails
        WHERE Level > 0 -- Esclude il nodo root
        ORDER BY Level, Path, Line;
        
        -- Ottieni dettaglio operazioni/routing con costi reali e breakdown dettagliato
        -- Include operazioni di tutti i livelli dell'esplosione BOM
        WITH AllOperations AS (
            -- Operazioni di tutti i livelli dell'esplosione
            SELECT 
                rt.RtgStep + (exp.Level * 1000) as RoutingId, -- Offset per livello
                rt.RtgStep as CycleNumber,
                rt.Operation as OperationCode,
                ISNULL(op.Description, rt.Operation) as OperationDescription,
                rt.WC as WorkCenterCode,
                ISNULL(wc.Description, rt.WC) as WorkCenterDescription,
                rt.Qty * exp.CalculatedQty as Quantity, -- Moltiplica per quantità calcolata
                'PZ' as UoM,
                ISNULL(wc.HourlyCost, 0.0) as HourlyCost,
                ISNULL(op.UnitCost, 0.0) as UnitCost,
                ISNULL(op.FixedCost, 0.0) as AdditionalCost,
                ISNULL(rt.SetupTime, 0) / 3600.0 as SetupTimeHours,
                ISNULL(rt.ProcessingTime, 0) / 3600.0 as ProcessingTimeHours,
                -- Costi separati per setup e processing
                CASE 
                    WHEN wc.HourlyCost > 0 THEN (ISNULL(rt.SetupTime, 0) / 3600.0) * wc.HourlyCost
                    ELSE (ISNULL(rt.SetupTime, 0) / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0)
                END as SetupCost,
                CASE 
                    WHEN wc.HourlyCost > 0 THEN (ISNULL(rt.ProcessingTime, 0) / 3600.0) * wc.HourlyCost * rt.Qty * exp.CalculatedQty
                    ELSE (ISNULL(rt.ProcessingTime, 0) / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0) * rt.Qty * exp.CalculatedQty
                END as ProcessingCost,
                -- Costo totale dell'operazione
                CASE 
                    WHEN op.UnitCost > 0 THEN op.UnitCost * rt.Qty * exp.CalculatedQty + ISNULL(op.FixedCost, 0)
                    WHEN wc.HourlyCost > 0 THEN
                        ((ISNULL(rt.SetupTime, 0) / 3600.0) * wc.HourlyCost) + 
                        ((ISNULL(rt.ProcessingTime, 0) / 3600.0) * wc.HourlyCost * rt.Qty * exp.CalculatedQty) + 
                        ISNULL(op.FixedCost, 0)
                    ELSE
                        ((ISNULL(rt.SetupTime, 0) / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0)) +
                        ((ISNULL(rt.ProcessingTime, 0) / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0) * rt.Qty * exp.CalculatedQty) +
                        ISNULL(op.FixedCost, 0)
                END as CalculatedTotalCost,
                CASE 
                    WHEN op.UnitCost > 0 OR wc.HourlyCost > 0 OR op.FixedCost > 0 THEN 1
                    ELSE 0
                END as HasValidCost,
                exp.Level, -- Livello dell'esplosione
                exp.ComponentItemCode as ComponentCode,
                exp.ComponentDescription as ComponentDescription,
                exp.Path,
                CASE 
                    WHEN exp.Level = 1 THEN 0 -- BOM principale
                    ELSE 1 -- Componenti
                END as IsComponentOperation
            FROM #BOMExplosionForDetails exp
            LEFT JOIN MA_ProjectArticles_BOMRouting rt ON exp.BOMId = rt.BOMId AND rt.CompanyId = @CompanyId
            LEFT JOIN MA_ProjectArticles_BOMOperations op ON rt.Operation = op.Code AND op.CompanyId = @CompanyId AND op.Active = 1
            LEFT JOIN MA_ProjectArticles_BOMWorkCenters wc ON rt.WC = wc.Code AND wc.CompanyId = @CompanyId
            WHERE exp.Level > -1 -- Considera anche il nodo root
            AND rt.RtgStep IS NOT NULL -- Solo se ci sono operazioni
        )
        SELECT 
            RoutingId,
            CycleNumber,
            OperationCode,
            OperationDescription,
            WorkCenterCode,
            WorkCenterDescription,
            Quantity,
            UoM,
            HourlyCost,
            UnitCost,
            AdditionalCost,
            SetupTimeHours,
            ProcessingTimeHours,
            SetupCost,
            ProcessingCost,
            CalculatedTotalCost,
            HasValidCost,
            Level,
            IsComponentOperation,
            ComponentCode,
            ComponentDescription,
            Path
        FROM AllOperations
        ORDER BY Level, Path, CycleNumber;
        
        -- Ottieni parametri di costificazione utilizzati
        SELECT 
            param.ParameterName,
            param.ParameterValue,
            param.Description,
            param.IsActive
        FROM MA_BOMCostingParameters param
        WHERE param.CompanyId = @CompanyId AND param.IsActive = 1
        ORDER BY param.ParameterName;
        
        -- Ottieni log dell'ultimo calcolo se disponibile
        IF @CalculationId IS NOT NULL
        BEGIN
            SELECT 
                log.LogLevel,
                log.LogMessage,
                log.Details,
                log.TBCreated
            FROM MA_BOMCostingLog log
            WHERE log.Id = @CalculationId AND log.CompanyId = @CompanyId
            ORDER BY log.TBCreated DESC;
        END
        
        -- Cleanup tabella temporanea
        DROP TABLE #BOMExplosionForDetails;
        
    END TRY
    BEGIN CATCH
        -- Cleanup in caso di errore
        IF OBJECT_ID('tempdb..#BOMExplosionForDetails') IS NOT NULL
            DROP TABLE #BOMExplosionForDetails;
            
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

-- =============================================
-- Stored Procedure: SP_GetBOMCostingHistory
-- Descrizione: Ottiene la cronologia dei costi calcolati per una BOM
-- =============================================
CREATE OR ALTER PROCEDURE SP_GetBOMCostingHistory
    @CompanyId INT,
    @BOMCode VARCHAR(50) = NULL,
    @BOMId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Se viene fornito BOMCode, trova il BOMId
        IF @BOMCode IS NOT NULL AND @BOMId IS NULL
        BEGIN
            SELECT @BOMId = Id 
            FROM MA_ProjectArticles_BillOfMaterials 
            WHERE CompanyId = @CompanyId AND BOM = @BOMCode;
            
            IF @BOMId IS NULL
            BEGIN
                RAISERROR('BOM non trovata con il codice specificato', 16, 1);
                RETURN;
            END
        END
        
        -- Verifica che la BOM esista
        IF NOT EXISTS (
            SELECT 1 FROM MA_ProjectArticles_BillOfMaterials 
            WHERE Id = @BOMId AND CompanyId = @CompanyId
        )
        BEGIN
            RAISERROR('BOM non trovata con l''ID specificato', 16, 1);
            RETURN;
        END
        
        -- Ottieni informazioni base della BOM
        SELECT 
            bom.Id as BOMId,
            bom.BOM as BOMCode,
            bom.Description as BOMDescription,
            itm.Item as ItemCode,
            itm.Description as ItemDescription,
            bom.UoM as UnitOfMeasure,
            bom.TotalCost as LastCalculatedCost,
            bom.RMCost as LastMaterialCost,
            bom.ProcessingCost as LastProcessingCost,
            bom.ProductionLot,
            bom.BOMStatus,
            bom.TBCreated as LastModified
        FROM MA_ProjectArticles_BillOfMaterials bom
        JOIN MA_ProjectArticles_Items itm ON bom.ItemId = itm.Id AND bom.CompanyId = itm.CompanyId
        WHERE bom.Id = @BOMId AND bom.CompanyId = @CompanyId;
        
        -- Ottieni dettaglio componenti con costi attuali
        SELECT 
            comp.ComponentId as ComponentId,
            comp.Line as ComponentLine,
            comp.ComponentId as ItemId,
            itm.Item as ItemCode,
            itm.Description as ItemDescription,
            comp.Quantity,
            comp.UoM,
            comp.UnitCost,
            comp.FixedCost,
            comp.TotalCost,
            comp.ComponentType,
            CASE 
                WHEN comp.ComponentType = 22413312 THEN 'Semilavorato'
                WHEN comp.ComponentType = 22413313 THEN 'Prodotto Finito'
                WHEN comp.ComponentType = 22413314 THEN 'Acquisto'
                WHEN comp.ComponentType = 22413315 THEN 'Operazione'
                ELSE 'Altro'
            END as ComponentTypeDescription,
            -- Calcola il costo totale per questo componente
            (comp.Quantity * ISNULL(comp.UnitCost, 0)) + ISNULL(comp.FixedCost, 0) as CalculatedTotalCost
        FROM MA_ProjectArticles_BOMComponents comp
        LEFT JOIN MA_ProjectArticles_Items itm ON comp.ComponentId = itm.Id AND comp.CompanyId = itm.CompanyId
        WHERE comp.BOMId = @BOMId AND comp.CompanyId = @CompanyId
        ORDER BY comp.Line;
        
        -- Ottieni dettaglio operazioni/routing con costi attuali
        SELECT 
            rt.RtgStep as RoutingId,
            rt.RtgStep as CycleNumber,
            rt.Operation as OperationCode,
            ISNULL(op.Description, rt.Operation) as OperationDescription,
            rt.WC as WorkCenterCode,
            ISNULL(wc.Description, rt.WC) as WorkCenterDescription,
            rt.Qty as Quantity,
            'PZ' as UoM,
            rt.ProcessingTime,
            rt.SetupTime,
            rt.NoOfProcessingWorkers,
            rt.NoOfSetupWorkers,
            ISNULL(wc.HourlyCost, 0.0) as HourlyCost,
            ISNULL(op.UnitCost, 0.0) as UnitCost,
            ISNULL(op.FixedCost, 0.0) as AdditionalCost,
            -- Calcola il costo totale per questa operazione basato sui tempi
            CASE 
                WHEN op.UnitCost > 0 THEN op.UnitCost * rt.Qty + ISNULL(op.FixedCost, 0)
                WHEN wc.HourlyCost > 0 THEN
                    ((ISNULL(rt.ProcessingTime, 0) + ISNULL(rt.SetupTime, 0)) / 3600.0) * wc.HourlyCost * rt.Qty + ISNULL(op.FixedCost, 0)
                ELSE
                    ((ISNULL(rt.ProcessingTime, 0) + ISNULL(rt.SetupTime, 0)) / 3600.0) * 
                    dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0) * rt.Qty + ISNULL(op.FixedCost, 0)
            END as CalculatedTotalCost
        FROM MA_ProjectArticles_BOMRouting rt
        LEFT JOIN MA_ProjectArticles_BOMOperations op ON rt.Operation = op.Code AND op.CompanyId = @CompanyId AND op.Active = 1
        LEFT JOIN MA_ProjectArticles_BOMWorkCenters wc ON rt.WC = wc.Code AND wc.CompanyId = @CompanyId
        WHERE rt.BOMId = @BOMId AND rt.CompanyId = @CompanyId
        ORDER BY rt.RtgStep;
        
        -- Ottieni log delle costificazioni per questa BOM
        SELECT 
            log.Id as LogId,
            log.LogLevel,
            log.LogMessage,
            log.Details,
            log.TBCreated as CalculationDate
        FROM MA_BOMCostingLog log
        WHERE log.BOMId = @BOMId AND log.CompanyId = @CompanyId
        ORDER BY log.TBCreated DESC;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

-- =============================================
-- Procedura: Dettaglio costi operazioni per BOM
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[SP_GetBOMOperationsCostBreakdown]
    @CompanyId INT,
    @BOMId BIGINT,
    @IncludeMultilevel BIT = 1  -- 1 = include esplosione multilivello, 0 = solo livello corrente
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Verifica esistenza BOM
        IF NOT EXISTS (SELECT 1 FROM MA_ProjectArticles_BillOfMaterials WHERE CompanyId = @CompanyId AND Id = @BOMId)
        BEGIN
            SELECT 'BOM non trovata' AS ErrorMessage;
            RETURN;
        END
        
        -- Tabella temporanea per esplosione BOM (se richiesta)
        IF @IncludeMultilevel = 1
        BEGIN
            CREATE TABLE #BOMExplosionForOps (
                Level INT,
                ItemId BIGINT,
                ComponentId BIGINT,
                ParentId BIGINT,
                BOMId BIGINT,
                ParentBOMId BIGINT,
                Line INT,
                ComponentType INT,
                Path NVARCHAR(MAX),
                Quantity DECIMAL(18,5),
                CalculatedQty DECIMAL(18,5),
                UoM VARCHAR(10),
                ComponentItemCode VARCHAR(64),
                ComponentDescription NVARCHAR(255)
            );
            
            -- Implementazione esplosione ricorsiva (stessa logica di SP_CalculateBOMCosting)
            DECLARE @RootItemId BIGINT;
            DECLARE @RootBOMId BIGINT = @BOMId;
            
            SELECT @RootItemId = ItemId
            FROM MA_ProjectArticles_BillOfMaterials
            WHERE Id = @BOMId AND CompanyId = @CompanyId;
            
            -- Inserisci il nodo root
            INSERT INTO #BOMExplosionForOps (
                Level, ItemId, ComponentId, ParentId, BOMId, ParentBOMId, Line, ComponentType,
                Path, Quantity, CalculatedQty, UoM, ComponentItemCode, ComponentDescription
            )
            SELECT 
                0, -- Level 0 per il nodo radice
                item.Id, -- ItemId
                item.Id, -- ComponentId (stesso dell'ItemId per il root)
                NULL, -- ParentId (NULL perché è la radice)
                @RootBOMId, -- BOMId
                NULL, -- ParentBOMId (NULL perché è la radice)
                0, -- Line
                7798784, -- ComponentType (Articolo)
                CAST(item.Id AS NVARCHAR(MAX)), -- Path
                CAST(1 AS DECIMAL(18,5)), -- Quantity
                CAST(1 AS DECIMAL(18,5)), -- CalculatedQty
                bom.UoM, -- UoM dalla distinta
                item.Item,
                item.Description
            FROM MA_ProjectArticles_Items item
            JOIN MA_ProjectArticles_BillOfMaterials bom ON bom.ItemId = item.Id AND bom.CompanyId = item.CompanyId
            WHERE item.Id = @RootItemId AND item.CompanyId = @CompanyId AND bom.Id = @RootBOMId;
            
            -- Esplosione ricorsiva
            DECLARE @Level INT = 0;
            DECLARE @MaxIterations INT = 10;
            
            WHILE @Level < @MaxIterations
            BEGIN
                INSERT INTO #BOMExplosionForOps (
                    Level, ItemId, ComponentId, ParentId, BOMId, ParentBOMId, Line, ComponentType,
                    Path, Quantity, CalculatedQty, UoM, ComponentItemCode, ComponentDescription
                )
                SELECT 
                    t.Level + 1, -- Level
                    comp.ComponentId, -- ItemId
                    comp.ComponentId, -- ComponentId
                    t.ItemId, -- ParentId
                    (SELECT TOP 1 bom.Id 
                     FROM MA_ProjectArticles_BillOfMaterials bom 
                     WHERE bom.ItemId = comp.ComponentId AND bom.CompanyId = @CompanyId
                     ORDER BY bom.Version DESC), -- BOMId
                    t.BOMId, -- ParentBOMId
                    comp.Line, -- Line
                    comp.ComponentType, -- ComponentType
                    t.Path + '.' + CAST(comp.ComponentId AS NVARCHAR(MAX)), -- Path
                    comp.Quantity, -- Quantity
                    t.CalculatedQty * comp.Quantity, -- CalculatedQty
                    comp.UoM, -- UoM
                    item.Item,
                    item.Description
                FROM #BOMExplosionForOps t
                JOIN MA_ProjectArticles_BOMComponents comp ON t.BOMId = comp.BOMId AND comp.CompanyId = @CompanyId
                JOIN MA_ProjectArticles_Items item ON comp.ComponentId = item.Id AND comp.CompanyId = @CompanyId
                WHERE 
                    t.Level = @Level
                    AND item.Disabled = 0
                    AND comp.ComponentType <> 7798787
                    AND NOT EXISTS (
                        SELECT 1 FROM #BOMExplosionForOps t2 
                        WHERE t2.ComponentId = comp.ComponentId AND t2.Path LIKE t.Path + '%'
                    );
                
                IF @@ROWCOUNT = 0
                    BREAK;
                
                SET @Level = @Level + 1;
            END;
        END
        
        -- Query principale: dettaglio costi operazioni
        SELECT 
            -- Informazioni BOM e livello
            ISNULL(exp.Level, 0) as BOMLevel,
            ISNULL(exp.ComponentItemCode, bom.BOM) as BOMCode,
            ISNULL(exp.ComponentDescription, bom.Description) as BOMDescription,
            ISNULL(exp.Path, 'ROOT') as BOMPath,
            
            -- Informazioni operazione
            rt.RtgStep as OperationStep,
            rt.Operation as OperationCode,
            ISNULL(op.Description, rt.Operation) as OperationDescription,
            
            -- Informazioni centro di lavoro
            rt.WC as WorkCenterCode,
            ISNULL(wc.Description, rt.WC) as WorkCenterDescription,
            ISNULL(wc.HourlyCost, 0.0) as WorkCenterHourlyCost,
            ISNULL(wc.Outsourced, 0) as IsOutsourced,
            
            -- Quantità e tempi (ATTENZIONE: i tempi sono in SECONDI, non minuti!)
            rt.Qty as OperationQuantity,
            ISNULL(rt.ProcessingTime, 0) as ProcessingTimeSeconds,
            ISNULL(rt.SetupTime, 0) as SetupTimeSeconds,
            ISNULL(rt.ProcessingTime, 0) + ISNULL(rt.SetupTime, 0) as TotalTimeSeconds,
            (ISNULL(rt.ProcessingTime, 0) + ISNULL(rt.SetupTime, 0)) / 60.0 as TotalTimeMinutes,
            (ISNULL(rt.ProcessingTime, 0) + ISNULL(rt.SetupTime, 0)) / 3600.0 as TotalTimeHours,
            
            -- Costi operazione
            ISNULL(op.UnitCost, 0.0) as OperationUnitCost,
            ISNULL(op.FixedCost, 0.0) as OperationFixedCost,
            
            -- Calcoli costi
            CASE 
                WHEN op.UnitCost > 0 THEN op.UnitCost * rt.Qty
                ELSE 0.0
            END as UnitCostTotal,
            
            CASE 
                WHEN wc.HourlyCost > 0 THEN
                    -- IMPORTANTE: Setup time NON moltiplicato per quantità, Processing time SÌ
                    -- Se Qty è 0, usa default 1
                    ((ISNULL(rt.SetupTime, 0) / 3600.0) * wc.HourlyCost) + 
                    ((ISNULL(rt.ProcessingTime, 0) / 3600.0) * wc.HourlyCost * CASE WHEN rt.Qty = 0 THEN 1 ELSE rt.Qty END)
                ELSE
                    -- Fallback al parametro di default
                    -- Se Qty è 0, usa default 1
                    ((ISNULL(rt.SetupTime, 0) / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0)) +
                    ((ISNULL(rt.ProcessingTime, 0) / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0) * CASE WHEN rt.Qty = 0 THEN 1 ELSE rt.Qty END)
            END as TimeBasedCost,
            
            ISNULL(op.FixedCost, 0.0) as FixedCostAmount,
            
            -- Costo totale per questa operazione
            CASE 
                WHEN op.UnitCost > 0 THEN 
                    -- Se Qty è 0, usa default 1
                    (op.UnitCost * CASE WHEN rt.Qty = 0 THEN 1 ELSE rt.Qty END) + ISNULL(op.FixedCost, 0.0)
                WHEN wc.HourlyCost > 0 THEN
                    -- IMPORTANTE: Setup time NON moltiplicato per quantità, Processing time SÌ
                    -- Se Qty è 0, usa default 1
                    (((ISNULL(rt.SetupTime, 0) / 3600.0) * wc.HourlyCost) + 
                     ((ISNULL(rt.ProcessingTime, 0) / 3600.0) * wc.HourlyCost * CASE WHEN rt.Qty = 0 THEN 1 ELSE rt.Qty END)) + ISNULL(op.FixedCost, 0.0)
                ELSE
                    -- Fallback al parametro di default
                    -- Se Qty è 0, usa default 1
                    (((ISNULL(rt.SetupTime, 0) / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0)) +
                     ((ISNULL(rt.ProcessingTime, 0) / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0) * CASE WHEN rt.Qty = 0 THEN 1 ELSE rt.Qty END)) + ISNULL(op.FixedCost, 0.0)
            END as TotalOperationCost,
            
            -- Moltiplicatore per esplosione multilivello
            ISNULL(exp.CalculatedQty, 1.0) as BOMQuantityMultiplier,
            
            -- Lotto economico della BOM
            ISNULL(bom.ProductionLot, 1) as BOMProductionLot,
            
            -- Costo totale considerando la quantità della BOM
            CASE 
                WHEN op.UnitCost > 0 THEN 
                    -- Se Qty è 0, usa default 1
                    ((op.UnitCost * CASE WHEN rt.Qty = 0 THEN 1 ELSE rt.Qty END) + ISNULL(op.FixedCost, 0.0)) * ISNULL(exp.CalculatedQty, 1.0)
                WHEN wc.HourlyCost > 0 THEN
                    -- IMPORTANTE: Setup time NON moltiplicato per quantità, Processing time SÌ
                    -- Se Qty è 0, usa default 1
                    ((((ISNULL(rt.SetupTime, 0) / 3600.0) * wc.HourlyCost) + 
                      ((ISNULL(rt.ProcessingTime, 0) / 3600.0) * wc.HourlyCost * CASE WHEN rt.Qty = 0 THEN 1 ELSE rt.Qty END)) + ISNULL(op.FixedCost, 0.0)) * ISNULL(exp.CalculatedQty, 1.0)
                ELSE
                    -- Fallback al parametro di default
                    -- Se Qty è 0, usa default 1
                    ((((ISNULL(rt.SetupTime, 0) / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0)) +
                      ((ISNULL(rt.ProcessingTime, 0) / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0) * CASE WHEN rt.Qty = 0 THEN 1 ELSE rt.Qty END)) + ISNULL(op.FixedCost, 0.0)) * ISNULL(exp.CalculatedQty, 1.0)
            END as FinalOperationCost,
            
            -- Costo per lotto economico (IMPORTANTE: Setup e FixedCost NON moltiplicati per lotto!)
            CASE 
                WHEN op.UnitCost > 0 THEN 
                    -- Per UnitCost: moltiplica tutto per lotto
                    -- Se Qty è 0, usa default 1
                    ((op.UnitCost * CASE WHEN rt.Qty = 0 THEN 1 ELSE rt.Qty END) + ISNULL(op.FixedCost, 0.0)) * ISNULL(exp.CalculatedQty, 1.0) * ISNULL(bom.ProductionLot, 1)
                WHEN wc.HourlyCost > 0 THEN
                    -- IMPORTANTE: Setup time e FixedCost NON moltiplicati per lotto, solo Processing time
                    -- Se Qty è 0, usa default 1
                    (((ISNULL(rt.SetupTime, 0) / 3600.0) * wc.HourlyCost) + 
                     ((ISNULL(rt.ProcessingTime, 0) / 3600.0) * wc.HourlyCost * CASE WHEN rt.Qty = 0 THEN 1 ELSE rt.Qty END * ISNULL(bom.ProductionLot, 1)) + 
                     ISNULL(op.FixedCost, 0.0)) * ISNULL(exp.CalculatedQty, 1.0)
                ELSE
                    -- Fallback al parametro di default
                    -- Se Qty è 0, usa default 1
                    (((ISNULL(rt.SetupTime, 0) / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0)) +
                     ((ISNULL(rt.ProcessingTime, 0) / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0) * CASE WHEN rt.Qty = 0 THEN 1 ELSE rt.Qty END * ISNULL(bom.ProductionLot, 1)) + 
                     ISNULL(op.FixedCost, 0.0)) * ISNULL(exp.CalculatedQty, 1.0)
            END as FinalOperationCostPerLot,
            
            -- Metodo di calcolo utilizzato
            CASE 
                WHEN op.UnitCost > 0 THEN 'UnitCost'
                WHEN wc.HourlyCost > 0 THEN 'WorkCenterHourly'
                ELSE 'DefaultParameter'
            END as CostCalculationMethod,
            
            -- Informazioni aggiuntive
            rt.Notes as OperationNotes,
            rt.Supplier as SupplierCode,
            ISNULL(op.Active, 1) as OperationActive
            
        FROM MA_ProjectArticles_BOMRouting rt
        LEFT JOIN MA_ProjectArticles_BOMOperations op ON rt.Operation = op.Code AND op.CompanyId = @CompanyId AND op.Active = 1
        LEFT JOIN MA_ProjectArticles_BOMWorkCenters wc ON rt.WC = wc.Code AND wc.CompanyId = @CompanyId
        LEFT JOIN MA_ProjectArticles_BillOfMaterials bom ON rt.BOMId = bom.Id AND bom.CompanyId = @CompanyId
        LEFT JOIN MA_ProjectArticles_Items itm ON bom.ItemId = itm.Id AND itm.CompanyId = @CompanyId
        
        -- Join con esplosione se richiesta
        LEFT JOIN #BOMExplosionForOps exp ON rt.BOMId = exp.BOMId
        
        WHERE rt.CompanyId = @CompanyId 
        AND (@IncludeMultilevel = 0 OR exp.BOMId IS NOT NULL OR rt.BOMId = @BOMId)
        AND (@IncludeMultilevel = 1 OR rt.BOMId = @BOMId)
        
        ORDER BY 
            ISNULL(exp.Level, 0),
            ISNULL(exp.Path, 'ROOT'),
            rt.RtgStep;
        
        -- Cleanup
        IF @IncludeMultilevel = 1
        BEGIN
            DROP TABLE #BOMExplosionForOps;
        END
        
    END TRY
    BEGIN CATCH
        SELECT 
            ERROR_NUMBER() AS ErrorNumber,
            ERROR_MESSAGE() AS ErrorMessage,
            ERROR_SEVERITY() AS ErrorSeverity,
            ERROR_STATE() AS ErrorState;
    END CATCH
END
GO

-- =============================================
-- Stored Procedure: SP_SearchBOMCostingHistory
-- Descrizione: Cerca BOM per codice con costi già calcolati
-- =============================================
CREATE OR ALTER PROCEDURE SP_SearchBOMCostingHistory
    @CompanyId INT,
    @SearchText VARCHAR(50) = NULL,
    @Page INT = 1,
    @PageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        DECLARE @Offset INT = (@Page - 1) * @PageSize;
        
        -- Query per contare il totale
        DECLARE @CountQuery NVARCHAR(MAX) = '
            SELECT COUNT(*) as TotalCount
            FROM MA_ProjectArticles_BillOfMaterials bom
            JOIN MA_ProjectArticles_Items itm ON bom.ItemId = itm.Id AND bom.CompanyId = itm.CompanyId
            WHERE bom.CompanyId = @CompanyId
            AND (bom.TotalCost IS NOT NULL AND bom.TotalCost > 0)';
        
        IF @SearchText IS NOT NULL
        BEGIN
            SET @CountQuery = @CountQuery + ' AND (bom.BOM LIKE @SearchText OR bom.Description LIKE @SearchText OR itm.Item LIKE @SearchText)';
        END
        
        -- Query principale
        DECLARE @DataQuery NVARCHAR(MAX) = '
            SELECT 
                bom.Id as BOMId,
                bom.BOM as BOMCode,
                bom.Description as BOMDescription,
                itm.Item as ItemCode,
                itm.Description as ItemDescription,
                bom.UoM as UnitOfMeasure,
                bom.TotalCost as CalculatedCost,
                bom.RMCost as MaterialCost,
                bom.ProcessingCost as OperationsCost,
                bom.BOMStatus,
                bom.TBCreated as LastCalculated,
                (SELECT COUNT(*) FROM MA_ProjectArticles_BOMComponents comp 
                 WHERE comp.BOMId = bom.Id AND comp.CompanyId = bom.CompanyId) as ComponentCount,
                (SELECT COUNT(*) FROM MA_ProjectArticles_BOMRouting rt 
                 WHERE rt.BOMId = bom.Id AND rt.CompanyId = bom.CompanyId) as RoutingCount
            FROM MA_ProjectArticles_BillOfMaterials bom
            JOIN MA_ProjectArticles_Items itm ON bom.ItemId = itm.Id AND bom.CompanyId = itm.CompanyId
            WHERE bom.CompanyId = @CompanyId
            AND (bom.TotalCost IS NOT NULL AND bom.TotalCost > 0)';
        
        IF @SearchText IS NOT NULL
        BEGIN
            SET @DataQuery = @DataQuery + ' AND (bom.BOM LIKE @SearchText OR bom.Description LIKE @SearchText OR itm.Item LIKE @SearchText)';
        END
        
        SET @DataQuery = @DataQuery + ' ORDER BY bom.TBCreated DESC OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY';
        
        -- Esegui le query
        DECLARE @TotalCount INT;
        EXEC sp_executesql @CountQuery, N'@CompanyId INT, @SearchText VARCHAR(50)', @CompanyId, @SearchText;
        
        EXEC sp_executesql @DataQuery, N'@CompanyId INT, @SearchText VARCHAR(50), @Offset INT, @PageSize INT', 
                          @CompanyId, @SearchText, @Offset, @PageSize;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

-- =============================================
-- Procedura: Test calcolo con esempio fornito
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[SP_TestBOMCostingExample]
    @CompanyId INT = 1
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Simula i valori dell'esempio fornito
    DECLARE @LottoProduzione INT = 100;
    DECLARE @CostiVariabiliTotali FLOAT = 33.32;
    DECLARE @CostiFissiTotali FLOAT = 300;
    DECLARE @CostiVariabiliOperazioni FLOAT = 30.55;
    DECLARE @CostiVariabiliMateriaPrima FLOAT = 2.7664;
    
    -- Parametri ricarichi di default
    DECLARE @RicaricoMP FLOAT = 0.15;
    DECLARE @RicaricoOPE FLOAT = 0.15;
    DECLARE @RicaricoTrasporto FLOAT = 0.02;
    DECLARE @RicaricoScarto FLOAT = 0.04;
    DECLARE @RicaricoTotale FLOAT = 0.20;
    DECLARE @RicaricoSconto FLOAT = 0.00;
    
    -- Calcoli secondo le regole
    DECLARE @RicaricoMPAmount FLOAT = @CostiVariabiliMateriaPrima * @RicaricoMP;
    DECLARE @RicaricoOPEAmount FLOAT = @CostiVariabiliOperazioni * @RicaricoOPE;
    DECLARE @RicaricoTrasportoAmount FLOAT = @CostiVariabiliTotali * @RicaricoTrasporto;
    DECLARE @RicaricoScartoAmount FLOAT = @CostiVariabiliTotali / (1 - @RicaricoScarto) - @CostiVariabiliTotali;
    DECLARE @SommaRicarichi FLOAT = @RicaricoMPAmount + @RicaricoOPEAmount + @RicaricoTrasportoAmount + @RicaricoScartoAmount;
    DECLARE @RicaricoTotaleAmount FLOAT = (@CostiVariabiliTotali + @SommaRicarichi) * @RicaricoTotale;
    DECLARE @CFSuLotto FLOAT = @CostiFissiTotali / @LottoProduzione;
    DECLARE @RicaricoScontoAmount FLOAT = (@CostiVariabiliTotali + @SommaRicarichi) / (1 - @RicaricoSconto) - (@CostiVariabiliTotali + @SommaRicarichi);
    
    DECLARE @TotaleCostoUnitario FLOAT = @CostiVariabiliTotali + @CFSuLotto + @SommaRicarichi + @RicaricoTotaleAmount + @RicaricoScontoAmount;
    
    -- Output risultati
    SELECT 
        'ESEMPIO CALCOLO COSTIFICAZIONE' as TestTitle,
        @LottoProduzione as LottoProduzione,
        @CostiVariabiliTotali as CostiVariabiliTotali,
        @CostiFissiTotali as CostiFissiTotali,
        @CostiVariabiliOperazioni as CostiVariabiliOperazioni,
        @CostiVariabiliMateriaPrima as CostiVariabiliMateriaPrima,
        
        -- Ricarichi calcolati
        @RicaricoMP as RicaricoMP_Pct,
        @RicaricoMPAmount as RicaricoMP_Amount,
        @RicaricoOPE as RicaricoOPE_Pct,
        @RicaricoOPEAmount as RicaricoOPE_Amount,
        @RicaricoTrasporto as RicaricoTrasporto_Pct,
        @RicaricoTrasportoAmount as RicaricoTrasporto_Amount,
        @RicaricoScarto as RicaricoScarto_Pct,
        @RicaricoScartoAmount as RicaricoScarto_Amount,
        @SommaRicarichi as SommaRicarichi,
        @RicaricoTotale as RicaricoTotale_Pct,
        @RicaricoTotaleAmount as RicaricoTotale_Amount,
        @CFSuLotto as CFSuLotto,
        @RicaricoSconto as RicaricoSconto_Pct,
        @RicaricoScontoAmount as RicaricoSconto_Amount,
        
        -- Risultato finale
        @TotaleCostoUnitario as TotaleCostoUnitario,
        'Calcolato con ricarico sconto 0%' as NotaRisultato;
        
    -- Verifica singoli calcoli
    SELECT 
        'VERIFICA CALCOLI' as TestType,
        CASE WHEN ABS(@RicaricoMPAmount - 0.41496) < 0.001 THEN 'OK' ELSE 'ERRORE' END as RicaricoMP_Check,
        CASE WHEN ABS(@RicaricoOPEAmount - 4.5825) < 0.001 THEN 'OK' ELSE 'ERRORE' END as RicaricoOPE_Check,
        CASE WHEN ABS(@RicaricoTrasportoAmount - 0.6664) < 0.001 THEN 'OK' ELSE 'ERRORE' END as RicaricoTrasporto_Check,
        CASE WHEN ABS(@RicaricoScartoAmount - 1.3883) < 0.001 THEN 'OK' ELSE 'ERRORE' END as RicaricoScarto_Check,
        CASE WHEN ABS(@CFSuLotto - 3) < 0.001 THEN 'OK' ELSE 'ERRORE' END as CFSuLotto_Check,
        CASE WHEN ABS(@RicaricoScontoAmount - 0) < 0.001 THEN 'OK' ELSE 'ERRORE' END as RicaricoSconto_Check;
END
GO

-- Inizializza parametri per la company di default (se non specificato diversamente)
-- EXEC SP_InitializeBOMCostingParameters 1;

PRINT 'Stored procedures per costificazione BOM create con successo!';
