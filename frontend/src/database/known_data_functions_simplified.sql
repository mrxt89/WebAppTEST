-- =============================================
-- Funzioni Semplificate per Dati Noti (Senza TRY/CATCH)
-- =============================================

-- Funzione per trovare il match migliore per un articolo
CREATE OR ALTER FUNCTION FN_FindBestKnownDataMatch(
    @CompanyId INT,
    @ItemCode VARCHAR(64),
    @ItemDescription NVARCHAR(255),
    @DataType VARCHAR(20)
)
RETURNS VARCHAR(64)
AS
BEGIN
    DECLARE @BestMatch VARCHAR(64) = NULL;
    DECLARE @BestPriority INT = -1;
    
    -- Cerca match per priorità (più specifico = priorità più alta)
    SELECT TOP 1 
        @BestMatch = ItemCode,
        @BestPriority = Priority
    FROM MA_BOMCostingMatchingRules
    WHERE CompanyId = @CompanyId
    AND DataType = @DataType
    AND IsActive = 1
    AND (
        -- Match esatto per codice
        (MatchingType = 'EXACT' AND ItemCode = @ItemCode)
        OR
        -- Match per contenuto nella descrizione
        (MatchingType = 'CONTAINS' AND @ItemDescription LIKE '%' + MatchingValue + '%')
        OR
        -- Match per tag specifico
        (MatchingType = 'TAG' AND @ItemDescription LIKE '%' + MatchingValue + '%')
    )
    ORDER BY Priority DESC, Id ASC;
    
    RETURN @BestMatch;
END
GO

-- Funzione per calcolare il costo usando dati noti (versione semplificata)
CREATE OR ALTER FUNCTION FN_CalculateKnownDataCost(
    @CompanyId INT,
    @ItemCode VARCHAR(64),
    @ItemDescription NVARCHAR(255),
    @DataType VARCHAR(20),
    @L DECIMAL(18,5), -- Lunghezza
    @QTA DECIMAL(18,5) -- Quantità
)
RETURNS DECIMAL(18,6)
AS
BEGIN
    DECLARE @Result DECIMAL(18,6) = 0;
    DECLARE @MatchedItemCode VARCHAR(64);
    DECLARE @Formula VARCHAR(MAX);
    
    -- Trova il match migliore
    SET @MatchedItemCode = dbo.FN_FindBestKnownDataMatch(@CompanyId, @ItemCode, @ItemDescription, @DataType);
    
    -- Se non trova match, restituisce 0 (userà UnitCost normale)
    IF @MatchedItemCode IS NULL
        RETURN 0;
    
    -- Leggi la formula per l'articolo
    SELECT @Formula = FormulaExpression 
    FROM MA_BOMCostingFormulas 
    WHERE CompanyId = @CompanyId 
    AND ItemCode = @MatchedItemCode
    AND DataType = @DataType 
    AND IsActive = 1;
    
    -- Se non trova formula, restituisce 0 (userà UnitCost normale)
    IF @Formula IS NULL
        RETURN 0;
    
    -- Calcolo semplificato per formule comuni
    -- TUBO: €/kg * kg/mt * L * QTA
    IF @Formula = '€/kg * kg/mt * L * QTA'
    BEGIN
        DECLARE @EuroPerKg DECIMAL(18,6);
        DECLARE @KgPerMt DECIMAL(18,6);
        
        SELECT @EuroPerKg = ParameterValue 
        FROM MA_BOMCostingKnownData 
        WHERE CompanyId = @CompanyId 
        AND ItemCode = @MatchedItemCode 
        AND ParameterName = '€/kg' 
        AND IsActive = 1;
        
        SELECT @KgPerMt = ParameterValue 
        FROM MA_BOMCostingKnownData 
        WHERE CompanyId = @CompanyId 
        AND ItemCode = @MatchedItemCode 
        AND ParameterName = 'kg/mt' 
        AND IsActive = 1;
        
        IF @EuroPerKg IS NOT NULL AND @KgPerMt IS NOT NULL
            SET @Result = @EuroPerKg * @KgPerMt * @L * @QTA;
    END
    
    -- Saldatura: €/mm * L * QTA
    ELSE IF @Formula = '€/mm * L * QTA'
    BEGIN
        DECLARE @EuroPerMm DECIMAL(18,6);
        
        SELECT @EuroPerMm = ParameterValue 
        FROM MA_BOMCostingKnownData 
        WHERE CompanyId = @CompanyId 
        AND ItemCode = @MatchedItemCode 
        AND ParameterName = '€/mm' 
        AND IsActive = 1;
        
        IF @EuroPerMm IS NOT NULL
            SET @Result = @EuroPerMm * @L * @QTA;
    END
    
    -- Barra: €/kg * kg/mt * L * QTA (stessa formula del tubo)
    ELSE IF @Formula = '€/kg * kg/mt * L * QTA'
    BEGIN
        DECLARE @EuroPerKg2 DECIMAL(18,6);
        DECLARE @KgPerMt2 DECIMAL(18,6);
        
        SELECT @EuroPerKg2 = ParameterValue 
        FROM MA_BOMCostingKnownData 
        WHERE CompanyId = @CompanyId 
        AND ItemCode = @MatchedItemCode 
        AND ParameterName = '€/kg' 
        AND IsActive = 1;
        
        SELECT @KgPerMt2 = ParameterValue 
        FROM MA_BOMCostingKnownData 
        WHERE CompanyId = @CompanyId 
        AND ItemCode = @MatchedItemCode 
        AND ParameterName = 'kg/mt' 
        AND IsActive = 1;
        
        IF @EuroPerKg2 IS NOT NULL AND @KgPerMt2 IS NOT NULL
            SET @Result = @EuroPerKg2 * @KgPerMt2 * @L * @QTA;
    END
    
    -- Vite: €/pz * QTA
    ELSE IF @Formula = '€/pz * QTA'
    BEGIN
        DECLARE @EuroPerPz DECIMAL(18,6);
        
        SELECT @EuroPerPz = ParameterValue 
        FROM MA_BOMCostingKnownData 
        WHERE CompanyId = @CompanyId 
        AND ItemCode = @MatchedItemCode 
        AND ParameterName = '€/pz' 
        AND IsActive = 1;
        
        IF @EuroPerPz IS NOT NULL
            SET @Result = @EuroPerPz * @QTA;
    END
    
    RETURN @Result;
END
GO

-- Funzione per ottenere tutti i dati noti di un articolo
CREATE OR ALTER FUNCTION FN_GetKnownDataForItem(
    @CompanyId INT,
    @ItemCode VARCHAR(64),
    @ItemDescription NVARCHAR(255),
    @DataType VARCHAR(20)
)
RETURNS TABLE
AS
RETURN
(
    SELECT 
        kd.ParameterName,
        kd.ParameterValue,
        kd.UnitOfMeasure,
        kd.Description,
        f.FormulaName,
        f.FormulaExpression,
        f.ResultUnit,
        mr.MatchingType,
        mr.MatchingValue,
        mr.Priority
    FROM MA_BOMCostingKnownData kd
    LEFT JOIN MA_BOMCostingFormulas f ON kd.CompanyId = f.CompanyId 
        AND kd.ItemCode = f.ItemCode 
        AND kd.DataType = f.DataType
        AND f.IsActive = 1
    LEFT JOIN MA_BOMCostingMatchingRules mr ON kd.CompanyId = mr.CompanyId 
        AND kd.ItemCode = mr.ItemCode
        AND mr.IsActive = 1
    WHERE kd.CompanyId = @CompanyId
    AND kd.ItemCode = (SELECT dbo.FN_FindBestKnownDataMatch(@CompanyId, @ItemCode, @ItemDescription, @DataType))
    AND kd.DataType = @DataType
    AND kd.IsActive = 1
);
GO

PRINT 'Funzioni semplificate per dati noti create con successo!';
