-- =============================================
-- Integrazione Dati Noti con SP_CalculateBOMCosting
-- =============================================

-- Modifica della sezione di calcolo costi componenti in SP_CalculateBOMCosting
-- Sostituire la sezione esistente con questa logica:

/*
-- Sezione da sostituire in SP_CalculateBOMCosting
-- Calcolo costi variabili materia prima con dati noti
SELECT @VariableCostsMP = ISNULL(SUM(
    CASE 
        WHEN ComponentNature = 22413314 OR UnitCost > 0 THEN
            -- Prova prima con dati noti, poi fallback a UnitCost
            CASE 
                WHEN dbo.FN_CalculateKnownDataCost(@CompanyId, ComponentItemCode, ComponentDescription, 'MATERIAL', 
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
), 0)
FROM #BOMExplosionCorrect 
WHERE IsLoop = 0;
*/

-- Stored procedure per testare i dati noti
CREATE OR ALTER PROCEDURE SP_TestKnownDataCalculation
    @CompanyId INT,
    @ItemCode VARCHAR(64),
    @ItemDescription NVARCHAR(255),
    @DataType VARCHAR(20),
    @L DECIMAL(18,5),
    @QTA DECIMAL(18,5)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @MatchedItemCode VARCHAR(64);
    DECLARE @KnownDataCost DECIMAL(18,6);
    DECLARE @Formula VARCHAR(MAX);
    DECLARE @FormulaResult VARCHAR(MAX);
    
    -- Trova il match
    SET @MatchedItemCode = dbo.FN_FindBestKnownDataMatch(@CompanyId, @ItemCode, @ItemDescription, @DataType);
    
    -- Calcola il costo
    SET @KnownDataCost = dbo.FN_CalculateKnownDataCost(@CompanyId, @ItemCode, @ItemDescription, @DataType, @L, @QTA);
    
    -- Mostra i risultati
    SELECT 
        @ItemCode as InputItemCode,
        @ItemDescription as InputItemDescription,
        @DataType as InputDataType,
        @L as InputL,
        @QTA as InputQTA,
        @MatchedItemCode as MatchedItemCode,
        @KnownDataCost as CalculatedCost,
        CASE 
            WHEN @KnownDataCost > 0 THEN 'USED_KNOWN_DATA'
            ELSE 'FALLBACK_TO_UNITCOST'
        END as CalculationMethod;
    
    -- Mostra i dati noti utilizzati
    SELECT 
        kd.ParameterName,
        kd.ParameterValue,
        kd.UnitOfMeasure,
        kd.Description
    FROM MA_BOMCostingKnownData kd
    WHERE kd.CompanyId = @CompanyId
    AND kd.ItemCode = @MatchedItemCode
    AND kd.DataType = @DataType
    AND kd.IsActive = 1;
    
    -- Mostra la formula utilizzata
    SELECT 
        f.FormulaName,
        f.FormulaExpression,
        f.ResultUnit,
        f.Description
    FROM MA_BOMCostingFormulas f
    WHERE f.CompanyId = @CompanyId
    AND f.ItemCode = @MatchedItemCode
    AND f.DataType = @DataType
    AND f.IsActive = 1;
END
GO

-- Stored procedure per gestire i dati noti (CRUD)
CREATE OR ALTER PROCEDURE SP_ManageKnownData
    @CompanyId INT,
    @Action VARCHAR(20), -- 'INSERT', 'UPDATE', 'DELETE', 'SELECT'
    @Id BIGINT = NULL,
    @ItemCode VARCHAR(64) = NULL,
    @ItemDescription NVARCHAR(255) = NULL,
    @DataType VARCHAR(20) = NULL,
    @ParameterName VARCHAR(50) = NULL,
    @ParameterValue DECIMAL(18,6) = NULL,
    @UnitOfMeasure VARCHAR(10) = NULL,
    @Description NVARCHAR(255) = NULL,
    @FormulaName VARCHAR(100) = NULL,
    @FormulaExpression VARCHAR(MAX) = NULL,
    @ResultUnit VARCHAR(10) = NULL,
    @MatchingType VARCHAR(20) = NULL,
    @MatchingValue VARCHAR(255) = NULL,
    @Priority INT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @Action = 'SELECT'
    BEGIN
        -- Seleziona tutti i dati noti
        SELECT 
            kd.Id,
            kd.ItemCode,
            kd.ItemDescription,
            kd.DataType,
            kd.ParameterName,
            kd.ParameterValue,
            kd.UnitOfMeasure,
            kd.Description as ParameterDescription,
            f.FormulaName,
            f.FormulaExpression,
            f.ResultUnit,
            f.Description as FormulaDescription,
            mr.MatchingType,
            mr.MatchingValue,
            mr.Priority,
            kd.IsActive,
            kd.TBCreated,
            kd.TBModified
        FROM MA_BOMCostingKnownData kd
        LEFT JOIN MA_BOMCostingFormulas f ON kd.CompanyId = f.CompanyId 
            AND kd.ItemCode = f.ItemCode 
            AND kd.DataType = f.DataType
        LEFT JOIN MA_BOMCostingMatchingRules mr ON kd.CompanyId = mr.CompanyId 
            AND kd.ItemCode = mr.ItemCode
        WHERE kd.CompanyId = @CompanyId
        ORDER BY kd.ItemCode, kd.DataType, kd.ParameterName;
    END
    ELSE IF @Action = 'INSERT'
    BEGIN
        -- Inserisci nuovo dato noto
        INSERT INTO MA_BOMCostingKnownData 
        (CompanyId, ItemCode, ItemDescription, DataType, ParameterName, ParameterValue, UnitOfMeasure, Description)
        VALUES 
        (@CompanyId, @ItemCode, @ItemDescription, @DataType, @ParameterName, @ParameterValue, @UnitOfMeasure, @Description);
        
        -- Inserisci formula se fornita
        IF @FormulaExpression IS NOT NULL
        BEGIN
            INSERT INTO MA_BOMCostingFormulas 
            (CompanyId, ItemCode, ItemDescription, DataType, FormulaName, FormulaExpression, ResultUnit, Description)
            VALUES 
            (@CompanyId, @ItemCode, @ItemDescription, @DataType, @FormulaName, @FormulaExpression, @ResultUnit, @Description);
        END
        
        -- Inserisci regola di matching se fornita
        IF @MatchingValue IS NOT NULL
        BEGIN
            INSERT INTO MA_BOMCostingMatchingRules 
            (CompanyId, ItemCode, ItemDescription, MatchingType, MatchingValue, Priority)
            VALUES 
            (@CompanyId, @ItemCode, @ItemDescription, @MatchingType, @MatchingValue, @Priority);
        END
        
        SELECT 'SUCCESS' as Result, 'Dati noti inseriti con successo' as Message;
    END
    ELSE IF @Action = 'UPDATE'
    BEGIN
        -- Aggiorna dato noto esistente
        UPDATE MA_BOMCostingKnownData 
        SET 
            ItemCode = @ItemCode,
            ItemDescription = @ItemDescription,
            DataType = @DataType,
            ParameterName = @ParameterName,
            ParameterValue = @ParameterValue,
            UnitOfMeasure = @UnitOfMeasure,
            Description = @Description,
            TBModified = GETDATE()
        WHERE Id = @Id AND CompanyId = @CompanyId;
        
        SELECT 'SUCCESS' as Result, 'Dati noti aggiornati con successo' as Message;
    END
    ELSE IF @Action = 'DELETE'
    BEGIN
        -- Elimina dato noto (soft delete)
        UPDATE MA_BOMCostingKnownData 
        SET IsActive = 0, TBModified = GETDATE()
        WHERE Id = @Id AND CompanyId = @CompanyId;
        
        SELECT 'SUCCESS' as Result, 'Dati noti eliminati con successo' as Message;
    END
END
GO

PRINT 'Integrazione dati noti completata!';
PRINT 'Stored procedures create per gestione e test.';
