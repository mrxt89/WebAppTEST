-- Test manuale della stored procedure MA_ProjectArticles_ImportWithSelection
-- Questo script esegue la SP con i dati dell'importazione fallita per vedere i messaggi PRINT

USE WebApp;
GO

-- Pulisci eventuali test precedenti
IF OBJECT_ID('tempdb..#TestComponents') IS NOT NULL DROP TABLE #TestComponents;
GO

-- Crea una tabella temporanea con i componenti di test (primi 3 per semplicità)
DECLARE @Components SelectedComponentsTableType;

INSERT INTO @Components (ComponentItemCode, Level, Path, UseOriginalCode, Quantity, ComponentType, Nature, UoM)
VALUES
    ('CDADESA30430010', 1, '873.3469', 0, 16, 7798784, 22413312, 'NR'),
    ('CTAPTOR31626010', 1, '873.3521', 0, 1, 7798784, 22413312, 'NR'),
    ('BTONTRA31620040', 2, '873.3521.4088', 0, 1, 7798784, 22413312, 'NR');

-- Variabili di output
DECLARE @ReturnItemId BIGINT;
DECLARE @ReturnBOMId BIGINT;
DECLARE @ImportedComponents INT;
DECLARE @ErrorCode INT;
DECLARE @ErrorMessage NVARCHAR(4000);

-- Parametri di input (usa gli stessi valori dei log)
DECLARE @CompanyId INT = 1;
DECLARE @UserId INT = 0;
DECLARE @ProjectId INT = 651;
DECLARE @SourceItem NVARCHAR(64) = 'GC16V01DRI25010';
DECLARE @SourceItemDescription NVARCHAR(128) = 'Gas Collettore 16 bombole Singola 01 Valvola Dritto - D 26,67 Sp 5,56 L 793 ND CC 301334 Air Liquide';
DECLARE @CreateNewBOM BIT = 1;

-- Abilita la stampa dei messaggi
SET NOCOUNT OFF;

PRINT '=== INIZIO TEST STORED PROCEDURE ===';
PRINT 'CompanyId: ' + CAST(@CompanyId AS VARCHAR);
PRINT 'UserId: ' + CAST(@UserId AS VARCHAR);
PRINT 'ProjectId: ' + CAST(@ProjectId AS VARCHAR);
PRINT 'SourceItem: ' + @SourceItem;
PRINT 'CreateNewBOM: ' + CAST(@CreateNewBOM AS VARCHAR);
PRINT '';

-- Esegui la stored procedure
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

-- Stampa i risultati
PRINT '';
PRINT '=== RISULTATI ===';
PRINT 'ReturnItemId: ' + ISNULL(CAST(@ReturnItemId AS VARCHAR), 'NULL');
PRINT 'ReturnBOMId: ' + ISNULL(CAST(@ReturnBOMId AS VARCHAR), 'NULL');
PRINT 'ImportedComponents: ' + CAST(@ImportedComponents AS VARCHAR);
PRINT 'ErrorCode: ' + CAST(@ErrorCode AS VARCHAR);
PRINT 'ErrorMessage: ' + ISNULL(@ErrorMessage, '(vuoto)');
PRINT '';

-- Verifica se sono stati creati articoli/BOM
IF @ReturnItemId IS NOT NULL
BEGIN
    PRINT '=== ARTICOLO CREATO ===';
    SELECT TOP 1 Id, Item, Description, Nature, BaseUoM
    FROM MA_ProjectArticles_Items
    WHERE Id = @ReturnItemId;
END
ELSE
BEGIN
    PRINT 'NESSUN ARTICOLO CREATO!';
END

IF @ReturnBOMId IS NOT NULL
BEGIN
    PRINT '=== BOM CREATA ===';
    SELECT TOP 1 Id, BOM, Description, Version
    FROM MA_ProjectArticles_BillOfMaterials
    WHERE Id = @ReturnBOMId;

    PRINT '=== COMPONENTI INSERITI ===';
    SELECT ComponentId, Line, Quantity, UoM
    FROM MA_ProjectArticles_BOMComponents
    WHERE BOMId = @ReturnBOMId;
END
ELSE
BEGIN
    PRINT 'NESSUNA BOM CREATA!';
END

-- Verifica articolo sorgente
PRINT '';
PRINT '=== VERIFICA ARTICOLO SORGENTE ===';
IF EXISTS (SELECT 1 FROM MA_Items WHERE Item = @SourceItem AND CompanyId = @CompanyId)
BEGIN
    PRINT 'Articolo trovato in MA_Items (gestionale ERP)';
    SELECT TOP 1 Item, Description, Nature, BaseUoM
    FROM MA_Items
    WHERE Item = @SourceItem AND CompanyId = @CompanyId;
END
ELSE IF EXISTS (SELECT 1 FROM MA_ProjectArticles_Items WHERE Item = @SourceItem AND CompanyId = @CompanyId)
BEGIN
    PRINT 'Articolo trovato in MA_ProjectArticles_Items (sistema progetti)';
    SELECT TOP 1 Item, Description, Nature, BaseUoM
    FROM MA_ProjectArticles_Items
    WHERE Item = @SourceItem AND CompanyId = @CompanyId;
END
ELSE
BEGIN
    PRINT 'ATTENZIONE: Articolo sorgente NON trovato né in MA_Items né in MA_ProjectArticles_Items!';
    PRINT 'Questo potrebbe essere il problema!';
END

PRINT '=== FINE TEST ===';
