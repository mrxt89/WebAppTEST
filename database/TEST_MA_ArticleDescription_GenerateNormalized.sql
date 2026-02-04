-- Test stored procedure MA_ArticleDescription_GenerateNormalized
-- Payload di test con caratteristiche tecniche

USE [WebAppTEST]
GO

DECLARE @CompanyId INT = 1;
DECLARE @BaseDescription NVARCHAR(512) = N'Assieme - Mandrinato';
DECLARE @MacroFamilyId BIGINT = 89;
DECLARE @FamilyId BIGINT = 313;
DECLARE @TypeId BIGINT = NULL;
DECLARE @TechnicalDataJSON NVARCHAR(MAX) = N'{"DIAMETRO":"15","RAGGIOM":"21"}';
DECLARE @NormalizedDescription NVARCHAR(512);

PRINT '========================================';
PRINT 'TEST MA_ArticleDescription_GenerateNormalized';
PRINT '========================================';
PRINT '';
PRINT 'Parametri di input:';
PRINT '  CompanyId: ' + CAST(@CompanyId AS VARCHAR(10));
PRINT '  BaseDescription: ' + @BaseDescription;
PRINT '  MacroFamilyId: ' + CAST(@MacroFamilyId AS VARCHAR(20));
PRINT '  FamilyId: ' + CAST(@FamilyId AS VARCHAR(20));
PRINT '  TypeId: ' + ISNULL(CAST(@TypeId AS VARCHAR(20)), 'NULL');
PRINT '  TechnicalDataJSON: ' + @TechnicalDataJSON;
PRINT '';

-- Verifica che le caratteristiche esistano nel database
PRINT 'Verifica caratteristiche attive nel database:';
SELECT 
    CharacteristicCode,
    DisplayOrder,
    FormatTemplate,
    IsActive
FROM MA_ArticleTechnicalCharacteristics
WHERE CompanyId = @CompanyId 
    AND IsActive = 1
    AND (CharacteristicCode = 'DIAMETRO' OR CharacteristicCode = 'RAGGIOM')
ORDER BY DisplayOrder;
PRINT '';

-- Esegui la stored procedure
PRINT 'Esecuzione stored procedure...';
EXEC [dbo].[MA_ArticleDescription_GenerateNormalized]
    @CompanyId = @CompanyId,
    @BaseDescription = @BaseDescription,
    @MacroFamilyId = @MacroFamilyId,
    @FamilyId = @FamilyId,
    @TypeId = @TypeId,
    @TechnicalDataJSON = @TechnicalDataJSON,
    @NormalizedDescription = @NormalizedDescription OUTPUT;

PRINT '';
PRINT '========================================';
PRINT 'RISULTATO:';
PRINT '========================================';
PRINT 'NormalizedDescription: ' + ISNULL(@NormalizedDescription, 'NULL');
PRINT 'Lunghezza: ' + CAST(ISNULL(LEN(@NormalizedDescription), 0) AS VARCHAR(10));
PRINT '';

-- Mostra anche in formato tabella
SELECT 
    @NormalizedDescription AS NormalizedDescription,
    LEN(@NormalizedDescription) AS DescriptionLength,
    CASE 
        WHEN @NormalizedDescription IS NULL THEN 'NULL'
        WHEN @NormalizedDescription = '' THEN 'VUOTO'
        WHEN @NormalizedDescription = @BaseDescription THEN 'UGUALE A BASE (caratteristiche non aggiunte)'
        ELSE 'OK (caratteristiche aggiunte)'
    END AS Status;

GO
