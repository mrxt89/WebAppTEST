-- Script di test per eseguire MA_ProjectArticles_AddUpdateBOM con ADD_COMPONENT
-- Parametri dal frontend:
-- action: "ADD_COMPONENT"
-- bomData: {Id: "18976", ComponentCode: "vbbvvg e", ComponentDescription: "rrhmry", ComponentType: 7798784, ...}
-- ImportBOM: false
-- Nature: 22413312
-- Quantity: 1
-- createTempComponent: false
-- parentComponentId: null

USE [WebAppTEST]
GO

-- Variabili di output
DECLARE @ReturnValue BIGINT;
DECLARE @ErrorCode INT;
DECLARE @ErrorMessage NVARCHAR(4000);
DECLARE @CreatedComponentCode VARCHAR(20);

-- Parametri dal frontend
DECLARE @Action NVARCHAR(50) = 'ADD_COMPONENT';
DECLARE @CompanyId INT = 1;  -- MODIFICARE SE NECESSARIO
DECLARE @Id BIGINT = 18976;  -- BOMId
DECLARE @ComponentCode VARCHAR(21) = 'vbbvvg e';
DECLARE @ComponentDescription VARCHAR(128) = 'rrhmry';
DECLARE @ComponentType INT = 7798784;
DECLARE @ComponentNatureValue INT = 22413312;
DECLARE @ComponentQuantity DECIMAL(18, 5) = 1;
DECLARE @ImportBOM BIT = 0;  -- false
DECLARE @CreateTempComponent BIT = 0;  -- false
DECLARE @ParentComponentId BIGINT = NULL;  -- null
DECLARE @UserId INT = 0;  -- MODIFICARE SE NECESSARIO (0 = WebApp/System)

PRINT '========================================';
PRINT 'TEST: MA_ProjectArticles_AddUpdateBOM';
PRINT '========================================';
PRINT '';
PRINT 'Parametri:';
PRINT '  @Action: ' + @Action;
PRINT '  @CompanyId: ' + CAST(@CompanyId AS VARCHAR(10));
PRINT '  @Id (BOMId): ' + CAST(@Id AS VARCHAR(20));
PRINT '  @ComponentCode: ' + @ComponentCode;
PRINT '  @ComponentDescription: ' + @ComponentDescription;
PRINT '  @ComponentType: ' + CAST(@ComponentType AS VARCHAR(10));
PRINT '  @ComponentNatureValue: ' + CAST(@ComponentNatureValue AS VARCHAR(10));
PRINT '  @ComponentQuantity: ' + CAST(@ComponentQuantity AS VARCHAR(20));
PRINT '  @ImportBOM: ' + CAST(@ImportBOM AS VARCHAR(1)) + ' (false)';
PRINT '  @CreateTempComponent: ' + CAST(@CreateTempComponent AS VARCHAR(1)) + ' (false)';
PRINT '  @ParentComponentId: ' + ISNULL(CAST(@ParentComponentId AS VARCHAR(20)), 'NULL');
PRINT '  @UserId: ' + CAST(@UserId AS VARCHAR(10));
PRINT '';
PRINT '========================================';
PRINT 'Esecuzione stored procedure...';
PRINT '========================================';
PRINT '';

BEGIN TRY
    EXEC [dbo].[MA_ProjectArticles_AddUpdateBOM]
        @Action = @Action,
        @CompanyId = @CompanyId,
        @Id = @Id,
        @BOM = NULL,
        @Description = NULL,
        @ItemId = NULL,
        @Version = 1,
        @UoM = 'NR',
        @BOMStatus = 'BOZZA',
        @ProductionLot = 1,
        @ComponentAction = NULL,
        @ComponentLine = NULL,
        @ComponentId = NULL,
        @ComponentCode = @ComponentCode,
        @ComponentBOMId = NULL,
        @ComponentType = @ComponentType,
        @ComponentQuantity = @ComponentQuantity,
        @ComponentUnitCost = NULL,
        @ComponentTotalCost = NULL,
        @ComponentFixedCost = NULL,
        @ComponentUoM = NULL,
        @ComponentDetails = NULL,
        @ComponentDescription = @ComponentDescription,
        @ComponentNatureValue = @ComponentNatureValue,
        @ComponentNotes = NULL,
        @ImportBOM = @ImportBOM,
        @MaxLevels = 1,
        @ParentComponentId = @ParentComponentId,
        @CreateTempComponent = @CreateTempComponent,
        @TempComponentPrefix = NULL,
        @SourceComponentId = NULL,
        @sourceItemCode = NULL,
        @TempSupplierId = NULL,
        @TempIntercompanyTargetId = NULL,
        @TempSupplierNotes = NULL,
        @UpdateSupplierData = 0,
        @RoutingAction = NULL,
        @RtgStep = NULL,
        @Operation = NULL,
        @Notes = NULL,
        @WC = NULL,
        @ProcessingTime = NULL,
        @SetupTime = NULL,
        @NoOfProcessingWorkers = NULL,
        @NoOfSetupWorkers = NULL,
        @SubId = NULL,
        @Supplier = NULL,
        @Qty = NULL,
        @SourceBOMId = NULL,
        @CopyComponents = 1,
        @CopyRouting = 1,
        @VerifyComponents = 1,
        @RMCost = NULL,
        @ProcessingCost = NULL,
        @RMRefillCost = NULL,
        @ProcessingRefillCost = NULL,
        @TotalCost = NULL,
        @TotalPrice = NULL,
        @RefillWaste = NULL,
        @RefillDiscount = NULL,
        @TotalRefill = NULL,
        @TransportRefill = NULL,
        @Details = NULL,
        @NewCompItem = NULL,
        @NewCompDescription = NULL,
        @NewCompNature = NULL,
        @NewCompBaseUoM = NULL,
        @CopyBOM = 0,
        @UserId = @UserId,
        @ReturnValue = @ReturnValue OUTPUT,
        @ErrorCode = @ErrorCode OUTPUT,
        @ErrorMessage = @ErrorMessage OUTPUT,
        @CreatedComponentCode = @CreatedComponentCode OUTPUT;

    PRINT '========================================';
    PRINT 'RISULTATO:';
    PRINT '========================================';
    PRINT 'ReturnValue: ' + ISNULL(CAST(@ReturnValue AS VARCHAR(20)), 'NULL');
    PRINT 'ErrorCode: ' + CAST(@ErrorCode AS VARCHAR(10));
    PRINT 'ErrorMessage: ' + ISNULL(@ErrorMessage, 'NULL');
    PRINT 'CreatedComponentCode: ' + ISNULL(@CreatedComponentCode, 'NULL');
    PRINT '';
    
    IF @ErrorCode = 0
    BEGIN
        PRINT 'SUCCESSO! Componente aggiunto correttamente.';
        PRINT '';
        PRINT 'Verifica se i cicli/routing sono stati eliminati:';
        PRINT 'SELECT * FROM dbo.MA_ProjectArticles_BOMRouting';
        PRINT 'WHERE BOMId IN (';
        PRINT '    SELECT Id FROM dbo.MA_ProjectArticles_BillOfMaterials';
        PRINT '    WHERE ItemId IN (';
        PRINT '        SELECT Id FROM dbo.MA_ProjectArticles_Items';
        PRINT '        WHERE Item = ''' + @ComponentCode + ''' AND CompanyId = ' + CAST(@CompanyId AS VARCHAR(10));
        PRINT '    )';
        PRINT '    AND CompanyId = ' + CAST(@CompanyId AS VARCHAR(10));
        PRINT ')';
    END
    ELSE
    BEGIN
        PRINT 'ERRORE! Codice: ' + CAST(@ErrorCode AS VARCHAR(10));
        PRINT 'Messaggio: ' + ISNULL(@ErrorMessage, 'Nessun messaggio');
    END
END TRY
BEGIN CATCH
    PRINT '========================================';
    PRINT 'ERRORE SQL:';
    PRINT '========================================';
    PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS VARCHAR(10));
    PRINT 'Error Message: ' + ERROR_MESSAGE();
    PRINT 'Error Severity: ' + CAST(ERROR_SEVERITY() AS VARCHAR(10));
    PRINT 'Error State: ' + CAST(ERROR_STATE() AS VARCHAR(10));
    PRINT 'Error Line: ' + CAST(ERROR_LINE() AS VARCHAR(10));
    PRINT 'Error Procedure: ' + ISNULL(ERROR_PROCEDURE(), 'NULL');
END CATCH
GO
