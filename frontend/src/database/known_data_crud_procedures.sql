-- ========================================
-- STORED PROCEDURES PER CRUD DATI NOTI
-- ========================================

-- Procedura per ottenere i dati noti di un articolo/operazione
CREATE OR ALTER PROCEDURE [dbo].[SP_GetKnownDataForItem]
    @CompanyId INT,
    @ItemCode VARCHAR(64),
    @DataType VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        kd.Id,
        kd.CompanyId,
        kd.ItemCode,
        kd.ItemDescription,
        kd.DataType,
        kd.ParameterName,
        kd.ParameterValue,
        kd.UnitOfMeasure,
        kd.Description,
        kd.IsActive,
        kd.TBCreated,
        kd.TBModified,
        kd.TBCreatedID,
        kd.TBModifiedID,
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
    AND kd.ItemCode = dbo.FN_FindBestKnownDataMatch(@CompanyId, @ItemCode, '', @DataType)
    AND kd.DataType = @DataType
    AND kd.IsActive = 1
    ORDER BY kd.ParameterName;
END
GO

-- Procedura per creare un nuovo parametro
CREATE OR ALTER PROCEDURE [dbo].[SP_CreateKnownDataParameter]
    @CompanyId INT,
    @ItemCode VARCHAR(64) = NULL, -- Può essere NULL per match solo su descrizione
    @ItemDescription NVARCHAR(255),
    @DataType VARCHAR(20),
    @ParameterName VARCHAR(50),
    @ParameterValue DECIMAL(18,6),
    @UnitOfMeasure VARCHAR(20),
    @Description NVARCHAR(255),
    @IsActive BIT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @NewId BIGINT;
    
    INSERT INTO MA_BOMCostingKnownData (
        CompanyId,
        ItemCode,
        ItemDescription,
        DataType,
        ParameterName,
        ParameterValue,
        UnitOfMeasure,
        Description,
        IsActive,
        TBCreated,
        TBModified,
        TBCreatedID,
        TBModifiedID
    )
    VALUES (
        @CompanyId,
        @ItemCode,
        @ItemDescription,
        @DataType,
        @ParameterName,
        @ParameterValue,
        @UnitOfMeasure,
        @Description,
        @IsActive,
        GETDATE(),
        GETDATE(),
        @UserId,
        @UserId
    );
    
    SET @NewId = SCOPE_IDENTITY();
    
    SELECT 
        Id,
        CompanyId,
        ItemCode,
        ItemDescription,
        DataType,
        ParameterName,
        ParameterValue,
        UnitOfMeasure,
        Description,
        IsActive,
        TBCreated,
        TBModified,
        TBCreatedID,
        TBModifiedID
    FROM MA_BOMCostingKnownData
    WHERE Id = @NewId;
END
GO

-- Procedura per aggiornare un parametro esistente
CREATE OR ALTER PROCEDURE [dbo].[SP_UpdateKnownDataParameter]
    @CompanyId INT,
    @ParameterId BIGINT,
    @ItemCode VARCHAR(64) = NULL, -- Può essere NULL per match solo su descrizione
    @ItemDescription NVARCHAR(255),
    @DataType VARCHAR(20),
    @ParameterName VARCHAR(50),
    @ParameterValue DECIMAL(18,6),
    @UnitOfMeasure VARCHAR(20),
    @Description NVARCHAR(255),
    @IsActive BIT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE MA_BOMCostingKnownData
    SET 
        ItemCode = @ItemCode,
        ItemDescription = @ItemDescription,
        DataType = @DataType,
        ParameterName = @ParameterName,
        ParameterValue = @ParameterValue,
        UnitOfMeasure = @UnitOfMeasure,
        Description = @Description,
        IsActive = @IsActive,
        TBModified = GETDATE(),
        TBModifiedID = @UserId
    WHERE Id = @ParameterId
    AND CompanyId = @CompanyId;
    
    SELECT 
        Id,
        CompanyId,
        ItemCode,
        ItemDescription,
        DataType,
        ParameterName,
        ParameterValue,
        UnitOfMeasure,
        Description,
        IsActive,
        TBCreated,
        TBModified,
        TBCreatedID,
        TBModifiedID
    FROM MA_BOMCostingKnownData
    WHERE Id = @ParameterId
    AND CompanyId = @CompanyId;
END
GO

-- Procedura per eliminare un parametro
CREATE OR ALTER PROCEDURE [dbo].[SP_DeleteKnownDataParameter]
    @CompanyId INT,
    @ParameterId BIGINT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Hard delete: elimina fisicamente il record
    DELETE FROM MA_BOMCostingKnownData
    WHERE Id = @ParameterId
    AND CompanyId = @CompanyId;
    
    -- Restituisce il numero di record eliminati
    SELECT @@ROWCOUNT AS DeletedCount;
END
GO

-- Procedura per eliminare tutti i parametri di un articolo
CREATE OR ALTER PROCEDURE [dbo].[SP_DeleteKnownDataParametersByItem]
    @CompanyId INT,
    @ItemCode VARCHAR(64),
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Elimina tutti i parametri per l'articolo specificato
    DELETE FROM MA_BOMCostingKnownData
    WHERE CompanyId = @CompanyId
    AND ItemCode = @ItemCode;
    
    -- Restituisce il numero di record eliminati
    SELECT @@ROWCOUNT AS DeletedCount;
END
GO

-- Procedura per creare una nuova formula
CREATE OR ALTER PROCEDURE [dbo].[SP_CreateFormula]
    @CompanyId INT,
    @ItemCode VARCHAR(64),
    @ItemDescription NVARCHAR(255),
    @DataType VARCHAR(20),
    @FormulaName NVARCHAR(100),
    @FormulaExpression NVARCHAR(MAX),
    @ResultUnit VARCHAR(20),
    @Description NVARCHAR(255),
    @IsActive BIT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @NewId BIGINT;
    
    INSERT INTO MA_BOMCostingFormulas (
        CompanyId,
        ItemCode,
        ItemDescription,
        DataType,
        FormulaName,
        FormulaExpression,
        ResultUnit,
        Description,
        IsActive,
        TBCreated,
        TBModified,
        TBCreatedID,
        TBModifiedID
    )
    VALUES (
        @CompanyId,
        @ItemCode,
        @ItemDescription,
        @DataType,
        @FormulaName,
        @FormulaExpression,
        @ResultUnit,
        @Description,
        @IsActive,
        GETDATE(),
        GETDATE(),
        @UserId,
        @UserId
    );
    
    SET @NewId = SCOPE_IDENTITY();
    
    SELECT 
        Id,
        CompanyId,
        ItemCode,
        ItemDescription,
        DataType,
        FormulaName,
        FormulaExpression,
        ResultUnit,
        Description,
        IsActive,
        TBCreated,
        TBModified,
        TBCreatedID,
        TBModifiedID
    FROM MA_BOMCostingFormulas
    WHERE Id = @NewId;
END
GO

-- Procedura per aggiornare una formula esistente
CREATE OR ALTER PROCEDURE [dbo].[SP_UpdateFormula]
    @CompanyId INT,
    @FormulaId BIGINT,
    @ItemCode VARCHAR(64),
    @ItemDescription NVARCHAR(255),
    @DataType VARCHAR(20),
    @FormulaName NVARCHAR(100),
    @FormulaExpression NVARCHAR(MAX),
    @ResultUnit VARCHAR(20),
    @Description NVARCHAR(255),
    @IsActive BIT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE MA_BOMCostingFormulas
    SET 
        ItemCode = @ItemCode,
        ItemDescription = @ItemDescription,
        DataType = @DataType,
        FormulaName = @FormulaName,
        FormulaExpression = @FormulaExpression,
        ResultUnit = @ResultUnit,
        Description = @Description,
        IsActive = @IsActive,
        TBModified = GETDATE(),
        TBModifiedID = @UserId
    WHERE Id = @FormulaId
    AND CompanyId = @CompanyId;
    
    SELECT 
        Id,
        CompanyId,
        ItemCode,
        ItemDescription,
        DataType,
        FormulaName,
        FormulaExpression,
        ResultUnit,
        Description,
        IsActive,
        TBCreated,
        TBModified,
        TBCreatedID,
        TBModifiedID
    FROM MA_BOMCostingFormulas
    WHERE Id = @FormulaId
    AND CompanyId = @CompanyId;
END
GO

-- Procedura per eliminare una formula
CREATE OR ALTER PROCEDURE [dbo].[SP_DeleteFormula]
    @CompanyId INT,
    @FormulaId BIGINT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Soft delete: imposta IsActive = 0
    UPDATE MA_BOMCostingFormulas
    SET 
        IsActive = 0,
        TBModified = GETDATE(),
        TBModifiedID = @UserId
    WHERE Id = @FormulaId
    AND CompanyId = @CompanyId;
    
    SELECT 
        Id,
        CompanyId,
        ItemCode,
        ItemDescription,
        DataType,
        FormulaName,
        FormulaExpression,
        ResultUnit,
        Description,
        IsActive,
        TBCreated,
        TBModified,
        TBCreatedID,
        TBModifiedID
    FROM MA_BOMCostingFormulas
    WHERE Id = @FormulaId
    AND CompanyId = @CompanyId;
END
GO

-- Procedura per creare una regola di matching
CREATE OR ALTER PROCEDURE [dbo].[SP_CreateMatchingRule]
    @CompanyId INT,
    @ItemCode VARCHAR(64),
    @ItemDescription NVARCHAR(255),
    @DataType VARCHAR(20),
    @MatchingType VARCHAR(20),
    @MatchingValue VARCHAR(255),
    @Priority INT,
    @IsActive BIT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @NewId BIGINT;
    
    INSERT INTO MA_BOMCostingMatchingRules (
        CompanyId,
        ItemCode,
        ItemDescription,
        DataType,
        MatchingType,
        MatchingValue,
        Priority,
        IsActive,
        TBCreated,
        TBModified,
        TBCreatedID,
        TBModifiedID
    )
    VALUES (
        @CompanyId,
        @ItemCode,
        @ItemDescription,
        @DataType,
        @MatchingType,
        @MatchingValue,
        @Priority,
        @IsActive,
        GETDATE(),
        GETDATE(),
        @UserId,
        @UserId
    );
    
    SET @NewId = SCOPE_IDENTITY();
    
    SELECT 
        Id,
        CompanyId,
        ItemCode,
        ItemDescription,
        DataType,
        MatchingType,
        MatchingValue,
        Priority,
        IsActive,
        TBCreated,
        TBModified,
        TBCreatedID,
        TBModifiedID
    FROM MA_BOMCostingMatchingRules
    WHERE Id = @NewId;
END
GO

-- Procedura per aggiornare una regola di matching
CREATE OR ALTER PROCEDURE [dbo].[SP_UpdateMatchingRule]
    @CompanyId INT,
    @RuleId BIGINT,
    @ItemCode VARCHAR(64),
    @ItemDescription NVARCHAR(255),
    @DataType VARCHAR(20),
    @MatchingType VARCHAR(20),
    @MatchingValue VARCHAR(255),
    @Priority INT,
    @IsActive BIT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE MA_BOMCostingMatchingRules
    SET 
        ItemCode = @ItemCode,
        ItemDescription = @ItemDescription,
        DataType = @DataType,
        MatchingType = @MatchingType,
        MatchingValue = @MatchingValue,
        Priority = @Priority,
        IsActive = @IsActive,
        TBModified = GETDATE(),
        TBModifiedID = @UserId
    WHERE Id = @RuleId
    AND CompanyId = @CompanyId;
    
    SELECT 
        Id,
        CompanyId,
        ItemCode,
        ItemDescription,
        DataType,
        MatchingType,
        MatchingValue,
        Priority,
        IsActive,
        TBCreated,
        TBModified,
        TBCreatedID,
        TBModifiedID
    FROM MA_BOMCostingMatchingRules
    WHERE Id = @RuleId
    AND CompanyId = @CompanyId;
END
GO

-- Procedura per eliminare una regola di matching
CREATE OR ALTER PROCEDURE [dbo].[SP_DeleteMatchingRule]
    @CompanyId INT,
    @RuleId BIGINT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Soft delete: imposta IsActive = 0
    UPDATE MA_BOMCostingMatchingRules
    SET 
        IsActive = 0,
        TBModified = GETDATE(),
        TBModifiedID = @UserId
    WHERE Id = @RuleId
    AND CompanyId = @CompanyId;
    
    SELECT 
        Id,
        CompanyId,
        ItemCode,
        ItemDescription,
        DataType,
        MatchingType,
        MatchingValue,
        Priority,
        IsActive,
        TBCreated,
        TBModified,
        TBCreatedID,
        TBModifiedID
    FROM MA_BOMCostingMatchingRules
    WHERE Id = @RuleId
    AND CompanyId = @CompanyId;
END
GO

-- Procedura per testare il calcolo di un dato noto
CREATE OR ALTER PROCEDURE [dbo].[SP_TestKnownDataCalculation]
    @CompanyId INT,
    @ItemCode VARCHAR(64),
    @ItemDescription NVARCHAR(255),
    @DataType VARCHAR(20),
    @L DECIMAL(18,5),
    @QTA DECIMAL(18,5)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @CalculatedCost DECIMAL(18,6);
    DECLARE @MatchedItemCode VARCHAR(64);
    DECLARE @FormulaExpression NVARCHAR(MAX);
    DECLARE @CurrentFormula NVARCHAR(MAX);
    
    -- Trova il match migliore
    SET @MatchedItemCode = dbo.FN_FindBestKnownDataMatch(@CompanyId, @ItemCode, @ItemDescription, @DataType);
    
    -- Recupera la formula associata
    SELECT TOP 1 @FormulaExpression = FormulaExpression
    FROM MA_BOMCostingFormulas
    WHERE CompanyId = @CompanyId
      AND DataType = @DataType
      AND ItemCode = @MatchedItemCode
      AND IsActive = 1
    ORDER BY Id DESC;
    
    IF @FormulaExpression IS NOT NULL
    BEGIN
        SET @CurrentFormula = @FormulaExpression;
        
        -- Sostituisci i parametri fissi (L, QTA)
        SET @CurrentFormula = REPLACE(@CurrentFormula, 'L', CAST(@L AS NVARCHAR(50)));
        SET @CurrentFormula = REPLACE(@CurrentFormula, 'QTA', CAST(@QTA AS NVARCHAR(50)));
        
        -- Cursore per sostituire i parametri dinamici
        DECLARE @ParamName VARCHAR(50);
        DECLARE @ParamValue DECIMAL(18,6);
        
        DECLARE param_cursor CURSOR FOR
        SELECT ParameterName, ParameterValue
        FROM MA_BOMCostingKnownData
        WHERE CompanyId = @CompanyId
          AND DataType = @DataType
          AND ItemCode = @MatchedItemCode
          AND IsActive = 1;
        
        OPEN param_cursor;
        FETCH NEXT FROM param_cursor INTO @ParamName, @ParamValue;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @CurrentFormula = REPLACE(@CurrentFormula, @ParamName, CAST(@ParamValue AS NVARCHAR(50)));
            FETCH NEXT FROM param_cursor INTO @ParamName, @ParamValue;
        END;
        
        CLOSE param_cursor;
        DEALLOCATE param_cursor;
        
        -- Valuta l'espressione matematica
        SET @CalculatedCost = dbo.FN_EvaluateMathExpression(@CurrentFormula);
    END
    ELSE
    BEGIN
        SET @CalculatedCost = 0;
    END;
    
    SELECT 
        @ItemCode as ItemCode,
        @ItemDescription as ItemDescription,
        @DataType as DataType,
        @L as L,
        @QTA as QTA,
        @MatchedItemCode as MatchedItemCode,
        @FormulaExpression as FormulaExpression,
        @CurrentFormula as EvaluatedFormula,
        @CalculatedCost as CalculatedCost,
        CASE 
            WHEN @CalculatedCost > 0 THEN 'SUCCESS'
            WHEN @MatchedItemCode IS NULL THEN 'NO_MATCH'
            WHEN @FormulaExpression IS NULL THEN 'NO_FORMULA'
            ELSE 'CALCULATION_ERROR'
        END as Status;
END
GO

PRINT 'Stored procedures per CRUD dati noti create con successo!';
