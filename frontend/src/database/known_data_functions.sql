-- =============================================
-- Funzioni per Dati Noti e Calcolo Formule
-- =============================================

-- Funzione per trovare il match migliore per un articolo
CREATE OR ALTER FUNCTION FN_FindBestKnownDataMatch(
    @CompanyId INT,
    @ItemCode VARCHAR(64) = NULL, -- Può essere NULL per match solo su descrizione
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
        -- Match esatto per codice (se ItemCode non è NULL)
        (MatchingType = 'EXACT' AND @ItemCode IS NOT NULL AND ItemCode = @ItemCode)
        OR
        -- Match per contenuto nella descrizione
        (MatchingType = 'CONTAINS' AND @ItemDescription LIKE '%' + MatchingValue + '%')
        OR
        -- Match per tag specifico
        (MatchingType = 'TAG' AND @ItemDescription LIKE '%' + MatchingValue + '%')
    )
    ORDER BY Priority DESC, Id ASC;
    
    -- Se non troviamo match nelle regole, cerchiamo direttamente nei dati noti
    IF @BestMatch IS NULL
    BEGIN
        SELECT TOP 1 
            @BestMatch = ItemCode
        FROM MA_BOMCostingKnownData
        WHERE CompanyId = @CompanyId
        AND DataType = @DataType
        AND IsActive = 1
        AND (
            -- Match esatto per codice (se ItemCode non è NULL)
            (@ItemCode IS NOT NULL AND ItemCode = @ItemCode)
            OR
            -- Match per contenuto nella descrizione (se ItemCode è NULL)
            (@ItemCode IS NULL AND @ItemDescription LIKE '%' + ISNULL(ItemDescription, '') + '%')
        )
        ORDER BY 
            CASE WHEN @ItemCode IS NOT NULL AND ItemCode = @ItemCode THEN 1 ELSE 2 END,
            Id ASC;
    END
    
    RETURN @BestMatch;
END
GO

-- Funzione per calcolare il costo usando dati noti
CREATE OR ALTER FUNCTION FN_CalculateKnownDataCost(
    @CompanyId INT,
    @ItemCode VARCHAR(64) = NULL, -- Può essere NULL per match solo su descrizione
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
    DECLARE @FormulaResult VARCHAR(MAX);
    
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
    
    -- Sostituisci i parametri nella formula
    SET @FormulaResult = @Formula;
    
    -- Sostituisci i parametri con i valori effettivi
    DECLARE @ParamValue DECIMAL(18,6);
    
    -- Sostituisci €/kg
    SELECT @ParamValue = ParameterValue 
    FROM MA_BOMCostingKnownData 
    WHERE CompanyId = @CompanyId 
    AND ItemCode = @MatchedItemCode 
    AND ParameterName = '€/kg' 
    AND IsActive = 1;
    
    IF @ParamValue IS NOT NULL
        SET @FormulaResult = REPLACE(@FormulaResult, '€/kg', CAST(@ParamValue AS VARCHAR(50)));
    ELSE
        SET @FormulaResult = REPLACE(@FormulaResult, '€/kg', '0');
    
    -- Sostituisci kg/mt
    SELECT @ParamValue = ParameterValue 
    FROM MA_BOMCostingKnownData 
    WHERE CompanyId = @CompanyId 
    AND ItemCode = @MatchedItemCode 
    AND ParameterName = 'kg/mt' 
    AND IsActive = 1;
    
    IF @ParamValue IS NOT NULL
        SET @FormulaResult = REPLACE(@FormulaResult, 'kg/mt', CAST(@ParamValue AS VARCHAR(50)));
    ELSE
        SET @FormulaResult = REPLACE(@FormulaResult, 'kg/mt', '0');
    
    -- Sostituisci €/mm
    SELECT @ParamValue = ParameterValue 
    FROM MA_BOMCostingKnownData 
    WHERE CompanyId = @CompanyId 
    AND ItemCode = @MatchedItemCode 
    AND ParameterName = '€/mm' 
    AND IsActive = 1;
    
    IF @ParamValue IS NOT NULL
        SET @FormulaResult = REPLACE(@FormulaResult, '€/mm', CAST(@ParamValue AS VARCHAR(50)));
    ELSE
        SET @FormulaResult = REPLACE(@FormulaResult, '€/mm', '0');
    
    -- Sostituisci L e QTA
    SET @FormulaResult = REPLACE(@FormulaResult, 'L', CAST(@L AS VARCHAR(50)));
    SET @FormulaResult = REPLACE(@FormulaResult, 'QTA', CAST(@QTA AS VARCHAR(50)));
    
    -- Esegui il calcolo della formula (semplificato senza TRY/CATCH)
    -- Per ora restituisce 0 se la formula non è valida
    -- In una implementazione reale, servirebbe un parser più sofisticato
    SET @Result = 0;
    
    RETURN @Result;
END
GO

-- Funzione per valutare espressioni matematiche semplici
CREATE OR ALTER FUNCTION FN_EvaluateMathExpression(@Expression VARCHAR(MAX))
RETURNS DECIMAL(18,6)
AS
BEGIN
    DECLARE @Result DECIMAL(18,6) = 0;
    
    -- Semplificazione: per ora supporta solo operazioni base
    -- In una implementazione reale, servirebbe un parser più sofisticato
    
    -- Rimuovi spazi
    SET @Expression = REPLACE(@Expression, ' ', '');
    
    -- Per ora restituisce 0 (implementazione semplificata)
    -- In una implementazione reale, servirebbe un parser più sofisticato
    SET @Result = 0;
    
    RETURN @Result;
END
GO

-- Funzione per ottenere tutti i dati noti di un articolo
CREATE OR ALTER FUNCTION FN_GetKnownDataForItem(
    @CompanyId INT,
    @ItemCode VARCHAR(64) = NULL, -- Può essere NULL per match solo su descrizione
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

PRINT 'Funzioni per dati noti create con successo!';
