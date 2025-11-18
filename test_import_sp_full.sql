-- Test con 36 componenti per capire dove fallisce la stored procedure
USE WebApp;
GO

-- Crea TVP con tutti i 36 componenti
DECLARE @Components SelectedComponentsTableType;

INSERT INTO @Components (ComponentItemCode, Level, Path, UseOriginalCode, Quantity, ComponentType, Nature, UoM)
VALUES
    ('CDADESA30430010', 1, '873.3469', 0, 16, 7798784, 22413312, 'NR'),
    ('CTAPTOR31626010', 1, '873.3521', 0, 1, 7798784, 22413312, 'NR'),
    ('BTONTRA31620040', 2, '873.3521.4088', 0, 0.02, 7798784, 22413314, 'MT'),
    ('CTCV4P931602020', 1, '873.3585', 0, 4, 7798784, 22413312, 'NR'),
    ('ASALTDC31602011', 2, '873.3585.5582', 0, 1, 7798784, 22413312, 'NR'),
    ('CCOD00031610010', 3, '873.3585.5582.3468', 0, 1, 7798784, 22413312, 'NR'),
    ('CTTGDRI31602031', 3, '873.3585.5582.5585', 0, 1, 7798784, 22413312, 'NR'),
    ('TTONSSS31602010', 4, '873.3585.5582.5585.5325', 0, 0.75, 7798784, 22413314, 'NR'),
    ('CTCV4P931602022', 1, '873.3586', 0, 4, 7798784, 22413312, 'NR'),
    ('ASALTDC31602011', 2, '873.3586.5582', 0, 1, 7798784, 22413312, 'NR'),
    ('CCOD00031610010', 3, '873.3586.5582.3468', 0, 1, 7798784, 22413312, 'NR'),
    ('CTTGDRI31602031', 3, '873.3586.5582.5585', 0, 1, 7798784, 22413312, 'NR'),
    ('TTONSSS31602010', 4, '873.3586.5582.5585.5325', 0, 0.75, 7798784, 22413314, 'NR'),
    ('CTCV5P931602010', 1, '873.3587', 0, 2, 7798784, 22413312, 'NR'),
    ('ASALTDC31602010', 2, '873.3587.3341', 0, 1, 7798784, 22413312, 'NR'),
    ('CCOD00031610010', 3, '873.3587.3341.3468', 0, 1, 7798784, 22413312, 'NR'),
    ('CTTGDRI31602031', 3, '873.3587.3341.5585', 0, 1, 7798784, 22413312, 'NR'),
    ('TTONSSS31602010', 4, '873.3587.3341.5585.5325', 0, 0.75, 7798784, 22413314, 'NR'),
    ('CTCV5P931602012', 1, '873.3588', 0, 2, 7798784, 22413312, 'NR'),
    ('ASALTDC31602010', 2, '873.3588.3341', 0, 1, 7798784, 22413312, 'NR'),
    ('CCOD00031610010', 3, '873.3588.3341.3468', 0, 1, 7798784, 22413312, 'NR'),
    ('CTTGDRI31602031', 3, '873.3588.3341.5585', 0, 1, 7798784, 22413312, 'NR'),
    ('TTONSSS31602010', 4, '873.3588.3341.5585.5325', 0, 0.75, 7798784, 22413314, 'NR'),
    ('CTCV5P931602014', 1, '873.3589', 0, 2, 7798784, 22413312, 'NR'),
    ('ASALTDC31602010', 2, '873.3589.3341', 0, 1, 7798784, 22413312, 'NR'),
    ('CCOD00031610010', 3, '873.3589.3341.3468', 0, 1, 7798784, 22413312, 'NR'),
    ('CTTGDRI31602031', 3, '873.3589.3341.5585', 0, 1, 7798784, 22413312, 'NR'),
    ('TTONSSS31602010', 4, '873.3589.3341.5585.5325', 0, 0.75, 7798784, 22413314, 'NR'),
    ('CTCV5P931602016', 1, '873.3590', 0, 2, 7798784, 22413312, 'NR'),
    ('ASALTDC31602010', 2, '873.3590.3341', 0, 1, 7798784, 22413312, 'NR'),
    ('CCOD00031610010', 3, '873.3590.3341.3468', 0, 1, 7798784, 22413312, 'NR'),
    ('CTTGDRI31602031', 3, '873.3590.3341.5585', 0, 1, 7798784, 22413312, 'NR'),
    ('TTONSSS31602010', 4, '873.3590.3341.5585.5325', 0, 0.75, 7798784, 22413314, 'NR'),
    ('CTFRDRI31625020', 1, '873.3678', 0, 1, 7798784, 22413312, 'NR'),
    ('TTONSSS31625010', 2, '873.3678.5362', 0, 0.86, 7798784, 22413314, 'NR'),
    ('CBLKPRV31660010', 1, '873.4137', 0, 1, 7798784, 22413314, 'NR');

-- Variabili
DECLARE @ReturnItemId BIGINT;
DECLARE @ReturnBOMId BIGINT;
DECLARE @ImportedComponents INT;
DECLARE @ErrorCode INT;
DECLARE @ErrorMessage NVARCHAR(4000);

DECLARE @CompanyId INT = 1;
DECLARE @UserId INT = 0;
DECLARE @ProjectId INT = 651;
DECLARE @SourceItem NVARCHAR(64) = 'GC16V01DRI25010';
DECLARE @SourceItemDescription NVARCHAR(128) = 'Gas Collettore 16 bombole Singola 01 Valvola Dritto - D 26,67 Sp 5,56 L 793 ND CC 301334 Air Liquide';
DECLARE @CreateNewBOM BIT = 1;

SET NOCOUNT OFF;

PRINT '==========================================================';
PRINT '=== TEST CON 36 COMPONENTI ===';
PRINT '==========================================================';
PRINT 'CompanyId: ' + CAST(@CompanyId AS VARCHAR);
PRINT 'ProjectId: ' + CAST(@ProjectId AS VARCHAR);
PRINT 'SourceItem: ' + @SourceItem;
PRINT 'Componenti nel TVP: 36';
PRINT '';
PRINT 'Esecuzione stored procedure...';
PRINT '';

-- Cattura l'ora di inizio
DECLARE @StartTime DATETIME = GETDATE();

-- Esegui la SP
BEGIN TRY
    EXEC dbo.MA_ProjectArticles_ImportWithSelection
        @CompanyId = @CompanyId,
        @UserId = @UserId,
        @ProjectId = @ProjectId,
        @SourceItem = @SourceItem,
        @SourceItemDescription = @SourceItemDescription,
        @CreateNewBOM = @CreateNewBOM,
        @SelectedComponents = @Components,
        @ReturnItemId = @ReturnItemId OUTPUT,
        @ReturnBOMId = @ReturnBOMId OUTPUT,
        @ImportedComponents = @ImportedComponents OUTPUT,
        @ErrorCode = @ErrorCode OUTPUT,
        @ErrorMessage = @ErrorMessage OUTPUT;
END TRY
BEGIN CATCH
    PRINT '';
    PRINT '=== ERRORE DURANTE L''ESECUZIONE ===';
    PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS VARCHAR);
    PRINT 'Error Message: ' + ERROR_MESSAGE();
    PRINT 'Error Line: ' + CAST(ERROR_LINE() AS VARCHAR);
    PRINT 'Error Procedure: ' + ISNULL(ERROR_PROCEDURE(), 'N/A');

    SET @ErrorCode = ERROR_NUMBER();
    SET @ErrorMessage = ERROR_MESSAGE();
END CATCH

-- Calcola tempo di esecuzione
DECLARE @ElapsedSeconds INT = DATEDIFF(SECOND, @StartTime, GETDATE());

PRINT '';
PRINT '==========================================================';
PRINT '=== RISULTATI ===';
PRINT '==========================================================';
PRINT 'Tempo di esecuzione: ' + CAST(@ElapsedSeconds AS VARCHAR) + ' secondi';
PRINT 'ReturnItemId: ' + ISNULL(CAST(@ReturnItemId AS VARCHAR), 'NULL');
PRINT 'ReturnBOMId: ' + ISNULL(CAST(@ReturnBOMId AS VARCHAR), 'NULL');
PRINT 'ImportedComponents: ' + CAST(ISNULL(@ImportedComponents, 0) AS VARCHAR);
PRINT 'ErrorCode: ' + CAST(ISNULL(@ErrorCode, 0) AS VARCHAR);
PRINT 'ErrorMessage: ' + ISNULL(@ErrorMessage, '(vuoto)');
PRINT '';

-- Diagnostica dettagliata
IF @ReturnItemId IS NULL AND @ReturnBOMId IS NULL AND @ImportedComponents = 0 AND @ErrorCode = 0
BEGIN
    PRINT '==========================================================';
    PRINT '⚠️  IMPORTAZIONE FALLITA SILENZIOSAMENTE!';
    PRINT '==========================================================';
    PRINT 'La stored procedure è terminata senza errori ma senza creare nulla.';
    PRINT 'Questo indica un problema nella logica della SP.';
    PRINT '';
    PRINT 'Possibili cause:';
    PRINT '1. Il primo cursore (check_both_cursor) ha causato un errore non gestito';
    PRINT '2. Un GOTO ErrorHandler è stato chiamato senza settare @ErrorCode';
    PRINT '3. La SP è uscita prematuramente dal blocco TRY';
    PRINT '';
    PRINT 'Controlla i messaggi PRINT sopra per vedere dove si è fermata.';
    PRINT 'Cerca messaggi come:';
    PRINT '  - "Logica semplificata attiva: ..."';
    PRINT '  - "Codice articolo principale generato: ..."';
    PRINT '  - "STEP 1", "STEP 2", "STEP 3", ecc.';
END
ELSE IF @ImportedComponents > 0
BEGIN
    PRINT '✅ IMPORTAZIONE RIUSCITA!';
    PRINT '';

    -- Mostra l'articolo creato
    IF @ReturnItemId IS NOT NULL
    BEGIN
        PRINT '=== ARTICOLO CREATO ===';
        SELECT Id, Item, Description, Nature, BaseUoM, TBCreated
        FROM MA_ProjectArticles_Items
        WHERE Id = @ReturnItemId;
    END

    -- Mostra la BOM creata
    IF @ReturnBOMId IS NOT NULL
    BEGIN
        PRINT '';
        PRINT '=== BOM CREATA ===';
        SELECT Id, BOM, Description, Version, BOMStatus
        FROM MA_ProjectArticles_BillOfMaterials
        WHERE Id = @ReturnBOMId;

        PRINT '';
        PRINT '=== COMPONENTI INSERITI (primi 10) ===';
        SELECT TOP 10
            Line,
            i.Item AS ComponentCode,
            Quantity,
            UoM
        FROM MA_ProjectArticles_BOMComponents bc
        INNER JOIN MA_ProjectArticles_Items i ON bc.ComponentId = i.Id
        WHERE bc.BOMId = @ReturnBOMId
        ORDER BY Line;

        DECLARE @TotalComponents INT;
        SELECT @TotalComponents = COUNT(*)
        FROM MA_ProjectArticles_BOMComponents
        WHERE BOMId = @ReturnBOMId;

        PRINT '';
        PRINT 'Totale componenti inseriti nella BOM: ' + CAST(@TotalComponents AS VARCHAR);
    END
END
ELSE IF @ErrorCode <> 0
BEGIN
    PRINT '❌ ERRORE: ' + @ErrorMessage;
END

PRINT '';
PRINT '==========================================================';
PRINT '=== FINE TEST ===';
PRINT '==========================================================';
