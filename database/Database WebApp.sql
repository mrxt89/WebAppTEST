


ALTER PROCEDURE [dbo].[MA_ProjectArticles_AddUpdateBOM]
    @Action NVARCHAR(50),                  -- 'ADD', 'UPDATE', 'COPY', 'ADD_COMPONENT', 'UPDATE_COMPONENT', 'DELETE_COMPONENT', 'ADD_ROUTING', 'UPDATE_ROUTING', 'DELETE_ROUTING'
    @CompanyId INT,                        -- ID dell'azienda
    @Id BIGINT = NULL,                     -- ID della distinta (NULL per nuove distinte)
    @BOM VARCHAR(50) = NULL,               -- Codice distinta
    @Description NVARCHAR(255) = NULL,     -- Descrizione distinta
    @ItemId BIGINT = NULL,                 -- ID articolo a cui si riferisce la distinta
    @Version INT = 1,                      -- Versione distinta
    @UoM VARCHAR(8) = 'PZ',                -- Unità di misura
    @BOMStatus VARCHAR(50) = 'BOZZA',      -- Stato distinta
    @ProductionLot INT = 1,                -- Lotto di produzione
    
    -- Parametri per componenti
    @ComponentAction NVARCHAR(20) = NULL,  -- 'ADD', 'UPDATE', 'DELETE' (per i componenti)
    @ComponentLine INT = NULL,             -- Numero di linea del componente
    @ComponentId INT = NULL,               -- ID del componente (BIGINT se da MA_ProjectArticles_Items)
    @ComponentCode VARCHAR(21) = NULL,     -- Codice articolo (da MA_Items se non passa ComponentId)
    @ComponentType INT = NULL,             -- Tipo di componente
    @ComponentQuantity DECIMAL(18, 5) = NULL, -- Quantità del componente
    @ComponentUnitCost FLOAT = NULL,       -- Costo unitario
    @ComponentTotalCost FLOAT = NULL,      -- Costo totale
    @ComponentFixedCost FLOAT = NULL,      -- Costo fisso
    @ComponentUoM VARCHAR(10) = NULL,      -- Unità di misura del componente
    @ComponentDetails NVARCHAR(MAX) = NULL, -- Dettagli del componente
    @ComponentDescription VARCHAR(128) = NULL, -- Descrizione componente per azione ADD_COMPONENT
    @ComponentNatureValue INT = NULL,      -- Natura del componente per azione ADD_COMPONENT
    @ComponentNotes NVARCHAR(MAX) = NULL,  -- Note del componente
    @ImportBOM BIT = 1,                    -- Flag per importare anche la distinta del componente
    @MaxLevels INT = 1,                    -- Profondità massima per l'importazione delle distinte (1 = solo primo livello)
    @ParentComponentId BIGINT = NULL,      -- ID del componente padre (se il componente deve essere aggiunto sotto un altro)
    @CreateTempComponent BIT = 0,          -- NUOVO: Flag per indicare se creare un codice temporaneo automatico
    @TempComponentPrefix VARCHAR(10) = NULL, -- NUOVO: Prefisso opzionale per il codice temporaneo
	@SourceComponentId BIGINT = NULL,       -- ID del componente sorgente per copiare la distinta
	@sourceItemCode VARCHAR(50) = NULL,		-- Codice articolo del componente da copiare, se non ancora presente in MA_ProjectArticles_Items
	-- NUOVI PARAMETRI per fornitore Intercompany (solo componenti temporanei)
	@TempSupplierId VARCHAR(12) = NULL,                      -- Fornitore temporaneo
	@TempIntercompanyTargetId INT = NULL,                    -- ID azienda Intercompany target
	@TempSupplierNotes NVARCHAR(255) = NULL,                 -- Note fornitore temporaneo
	@UpdateSupplierData BIT = 0,                             -- Flag per aggiornare dati fornitore in UPDATE
    -- Parametri per cicli
    @RoutingAction NVARCHAR(20) = NULL,    -- 'ADD', 'UPDATE', 'DELETE' (per i cicli)
    @RtgStep SMALLINT = NULL,              -- Fase del ciclo
    @Operation VARCHAR(21) = NULL,         -- Operazione
    @Notes VARCHAR(1024) = NULL,           -- Note
    @WC VARCHAR(8) = NULL,                 -- Centro di lavoro
    @ProcessingTime INT = NULL,            -- Tempo di lavorazione
    @SetupTime INT = NULL,                 -- Tempo di setup
    @NoOfProcessingWorkers SMALLINT = NULL, -- Numero operatori lavorazione
    @NoOfSetupWorkers SMALLINT = NULL,     -- Numero operatori setup
    @SubId INT = NULL,                     -- ID subfornitura
    @Supplier VARCHAR(12) = NULL,          -- Fornitore
    @Qty FLOAT = NULL,                     -- Quantità
    
    -- Parametri per copia
    @SourceBOMId BIGINT = NULL,            -- ID distinta sorgente per copia
    @CopyComponents BIT = 1,               -- Flag per copiare i componenti
    @CopyRouting BIT = 1,                  -- Flag per copiare i cicli
    @VerifyComponents BIT = 1,             -- Flag per verificare esistenza di tutti i componenti (anche sottolivelli)
    
    -- Parametri per costi
    @RMCost FLOAT = NULL,                  -- Costo materie prime
    @ProcessingCost FLOAT = NULL,          -- Costo lavorazione
    @RMRefillCost FLOAT = NULL,            -- Costo ricarico materie prime
    @ProcessingRefillCost FLOAT = NULL,    -- Costo ricarico lavorazione
    @TotalCost FLOAT = NULL,               -- Costo totale
    @TotalPrice FLOAT = NULL,              -- Prezzo totale
    @RefillWaste FLOAT = NULL,             -- Ricarico per sfrido
    @RefillDiscount FLOAT = NULL,          -- Sconto ricarico
    @TotalRefill FLOAT = NULL,             -- Ricarico totale
    @TransportRefill FLOAT = NULL,         -- Ricarico trasporto
    @Details NVARCHAR(MAX) = NULL,         -- Dettagli

    -- Parametri per sostituzione componenti
    @NewCompItem VARCHAR(64) = NULL,             -- Codice del nuovo componente temporaneo
    @NewCompDescription VARCHAR(128) = NULL,     -- Descrizione del nuovo componente temporaneo
    @NewCompNature INT = NULL,                   -- Natura del nuovo componente temporaneo
    @NewCompBaseUoM VARCHAR(3) = NULL,           -- UoM del nuovo componente temporaneo
	@CopyBOM INT = 0,
    
    @UserId INT = 0,                       -- ID dell'utente che esegue l'operazione
    @ReturnValue BIGINT OUTPUT,            -- ID della distinta creata/aggiornata
    @ErrorCode INT OUTPUT,                 -- Codice di errore (0 = successo)
    @ErrorMessage NVARCHAR(4000) OUTPUT,   -- Messaggio di errore
    @CreatedComponentCode VARCHAR(20) OUTPUT -- NUOVO: Codice del componente temporaneo creato
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Inizializzazione variabili di output
    SET @ErrorCode = 0;
    SET @ErrorMessage = N'';
    SET @ReturnValue = 0;
    SET @CreatedComponentCode = NULL;
    
    DECLARE @NewId BIGINT;
    DECLARE @TranCount INT = @@TRANCOUNT;
    DECLARE @NeedCommit BIT = 0;
    DECLARE @NextComponentLine INT = 0;

	-- Step 1: Sincronizza il componente base per la stored procedure del sync
    DECLARE @SyncErrorCode INT;
    DECLARE @SyncErrorMessage NVARCHAR(4000);
	DECLARE @RealComponentId BIGINT;
    DECLARE @ComponentItemCode VARCHAR(64);
    DECLARE @ComponentHasBOM BIT = 0;
    DECLARE @NeedBOMSync BIT = 0;
    DECLARE @ComponentBOMId BIGINT;
    
    -- Tabella temporanea per memorizzare i componenti già elaborati
    -- per evitare cicli infiniti e duplicazioni
    CREATE TABLE #ProcessedComponents (
        ComponentId BIGINT PRIMARY KEY,
        ComponentCode VARCHAR(21) NULL,
        IsProcessed BIT DEFAULT 0
    );
    
    -- Validazione dei parametri di input prima di avviare qualsiasi transazione
    IF @Action NOT IN ('ADD', 'UPDATE', 'COPY', 'ADD_COMPONENT', 'UPDATE_COMPONENT', 'DELETE_COMPONENT', 'ADD_ROUTING', 'UPDATE_ROUTING', 'DELETE_ROUTING', 'REPLACE_COMPONENT', 'REPLACE_WITH_NEW_COMPONENT')
    BEGIN
        SET @ErrorCode = 1;
        SET @ErrorMessage = N'Azione non valida.';
        GOTO ErrorHandler;
    END
    
    IF @CompanyId IS NULL OR @CompanyId <= 0
    BEGIN
        SET @ErrorCode = 2;
        SET @ErrorMessage = N'CompanyId non valido.';
        GOTO ErrorHandler;
    END
    
    -- Validazione per ADD
    IF @Action = 'ADD' AND @ItemId IS NULL 
    BEGIN
        SET @ErrorCode = 3;
        SET @ErrorMessage = N'ItemId richiesto per l''azione ADD.';
        GOTO ErrorHandler;
    END
    
    -- Validazione per UPDATE, ADD_COMPONENT, UPDATE_COMPONENT, DELETE_COMPONENT, ADD_ROUTING, UPDATE_ROUTING, DELETE_ROUTING
    IF @Action IN ('UPDATE', 'ADD_COMPONENT', 'UPDATE_COMPONENT', 'DELETE_COMPONENT', 'ADD_ROUTING', 'UPDATE_ROUTING', 'DELETE_ROUTING') 
       AND (@Id IS NULL OR @Id <= 0)
    BEGIN
        SET @ErrorCode = 4;
        SET @ErrorMessage = N'Id della distinta non valido.';
        GOTO ErrorHandler;
    END
    
    -- Validazione per COPY
    IF @Action = 'COPY' 
    BEGIN
        IF @ItemId IS NULL
        BEGIN
            SET @ErrorCode = 5;
            SET @ErrorMessage = N'ItemId richiesto per l''azione COPY.';
            GOTO ErrorHandler;
        END
        
        IF @SourceBOMId IS NULL OR @SourceBOMId <= 0
        BEGIN
            SET @ErrorCode = 6;
            SET @ErrorMessage = N'SourceBOMId non valido per l''azione COPY.';
            GOTO ErrorHandler;
        END
    END
    
    -- Validazione per ADD_COMPONENT e UPDATE_COMPONENT
    IF @Action IN ('ADD_COMPONENT')
    BEGIN
        -- Se @CreateTempComponent = 1, non serve validare ComponentId o ComponentCode
        IF @CreateTempComponent = 0 AND @ComponentId IS NULL AND @ComponentCode IS NULL
        BEGIN
            SET @ErrorCode = 7;
            SET @ErrorMessage = N'ComponentId o ComponentCode richiesto per l''azione ' + @Action;
            GOTO ErrorHandler;
        END
        
        IF @Action = 'UPDATE_COMPONENT' AND @ComponentLine IS NULL
        BEGIN
            SET @ErrorCode = 8;
            SET @ErrorMessage = N'ComponentLine richiesto per l''azione UPDATE_COMPONENT.';
            GOTO ErrorHandler;
        END
    END

	IF @Action IN ('UPDATE_COMPONENT')
    BEGIN
        -- Se @CreateTempComponent = 1, non serve validare ComponentId o ComponentCode
        IF @CreateTempComponent = 0 AND @ComponentId IS NULL AND @ComponentCode IS NULL AND @ComponentLine IS NULL
        BEGIN
            SET @ErrorCode = 7;
            SET @ErrorMessage = N'ComponentId o ComponentCode o @ComponentLine richiesto per l''azione ' + @Action;
            GOTO ErrorHandler;
        END
        
        IF @Action = 'UPDATE_COMPONENT' AND @ComponentLine IS NULL
        BEGIN
            SET @ErrorCode = 8;
            SET @ErrorMessage = N'ComponentLine richiesto per l''azione UPDATE_COMPONENT.';
            GOTO ErrorHandler;
        END
    END
    
    -- Validazione per DELETE_COMPONENT
    IF @Action = 'DELETE_COMPONENT' AND @ComponentLine IS NULL
    BEGIN
        SET @ErrorCode = 9;
        SET @ErrorMessage = N'ComponentLine richiesto per l''azione DELETE_COMPONENT.';
        GOTO ErrorHandler;
    END
    
    -- Validazione per ADD_ROUTING, UPDATE_ROUTING e DELETE_ROUTING
    IF @Action IN ('ADD_ROUTING', 'UPDATE_ROUTING', 'DELETE_ROUTING')
    BEGIN
        IF @RtgStep IS NULL
        BEGIN
            SET @ErrorCode = 10;
            SET @ErrorMessage = N'RtgStep richiesto per l''azione ' + @Action;
            GOTO ErrorHandler;
        END
        
        IF @Action IN ('ADD_ROUTING', 'UPDATE_ROUTING') AND @Operation IS NULL
        BEGIN
            SET @ErrorCode = 11;
            SET @ErrorMessage = N'Operation richiesto per l''azione ' + @Action;
            GOTO ErrorHandler;
        END
    END
    
    -- Validazione per REPLACE_WITH_NEW_COMPONENT
    IF @Action = 'REPLACE_WITH_NEW_COMPONENT'
    BEGIN
        IF @Id IS NULL OR @Id <= 0
        BEGIN
            SET @ErrorCode = 50;
            SET @ErrorMessage = N'Id distinta non valido';
            GOTO ErrorHandler;
        END

        IF @ComponentLine IS NULL
        BEGIN
            SET @ErrorCode = 51;
            SET @ErrorMessage = N'Linea componente non specificata';
            GOTO ErrorHandler;
        END

        IF ( @NewCompItem IS NULL OR @NewCompDescription IS NULL ) AND @Action NOT IN ('REPLACE_WITH_NEW_COMPONENT')
        BEGIN
            SET @ErrorCode = 52;
            SET @ErrorMessage = N'Dati nuovo componente insufficienti';
            GOTO ErrorHandler;
        END
    END
    
    -- Inizio transazione esplicita se non ne esiste già una
    IF @TranCount = 0
    BEGIN
        BEGIN TRANSACTION;
        SET @NeedCommit = 1;
    END
    
    BEGIN TRY
        -- Gestione del ParentComponentId per la struttura gerarchica
        DECLARE @ParentBOMId BIGINT = NULL;

        -- Se è stato specificato un ParentComponentId, lo verifichiamo.
        -- @ParentComponentId è l'id in MA_ProjectArticles_Items
        IF @ParentComponentId IS NOT NULL
        BEGIN
            -- Verifica che il componente esista in anagrafica MA_ProjectArticles_Items
            IF NOT EXISTS (
                SELECT 1 
                FROM dbo.MA_ProjectArticles_Items
                WHERE Id = @ParentComponentId AND CompanyId = @CompanyId
            )
            BEGIN
                SET @ErrorCode = 33;
                SET @ErrorMessage = N'Componente padre non trovato nell''anagrafica MA_ProjectArticles_Items';
                THROW 50033, @ErrorMessage, 1;
            END


            -- Verifica se il componente padre ha già una distinta
            SELECT    @ParentBOMId = BOM.Id
            FROM    dbo.MA_ProjectArticles_BillOfMaterials BOM
            WHERE    BOM.ItemId = @ParentComponentId AND BOM.CompanyId = @CompanyId;
    
            -- Se il componente padre non ha una distinta, creala
            IF @ParentBOMId IS NULL
            BEGIN
                -- Ottieni informazioni sul componente padre
                DECLARE @ParentItem VARCHAR(21);
                DECLARE @ParentDescription NVARCHAR(255);
                DECLARE @ParentUoM VARCHAR(8);
        
                SELECT 
                    @ParentItem = Item,
                    @ParentDescription = Description,
                    @ParentUoM = BaseUoM
                FROM dbo.MA_ProjectArticles_Items
                WHERE Id = @ParentComponentId AND CompanyId = @CompanyId;
        
                -- Genera un nuovo ID per la distinta del padre
                SET @ParentBOMId = dbo.GetNextProjectArticleBOMId(@CompanyId);
        
                -- Inserisci la nuova distinta per il padre
                INSERT INTO dbo.MA_ProjectArticles_BillOfMaterials (
                    CompanyId, Id, BOM, Description, ItemId, Version, UoM, BOMStatus,
                    ProductionLot, TBCreated, TBCreatedId, MainRefBOMId  
                ) VALUES (
                    @CompanyId, @ParentBOMId, @ParentItem, 
                    'Distinta per ' + @ParentDescription, 
                    @ParentComponentId, 1, @ParentUoM, 'BOZZA',
                    1, GETDATE(), @UserId, (SELECT ISNULL(MainRefBOMId, Id) FROM MA_ProjectArticles_BillOfMaterials WHERE Id = @Id AND CompanyId = @CompanyId)
                );
            END
    
            -- Utilizzeremo @ParentBOMId invece di @Id per aggiungere il componente
            SET @Id = @ParentBOMId;
        END

IF @CreateTempComponent = 1 AND @Action IN ('ADD_COMPONENT', 'UPDATE_COMPONENT', 'REPLACE_COMPONENT')
BEGIN
    DECLARE @TempItemCode VARCHAR(20);
    DECLARE @TempComponentId BIGINT;

    -- Genera un codice articolo temporaneo univoco
    SET @TempItemCode = dbo.GenerateTempItemCode(@CompanyId);

    -- Aggiunge il prefisso specifico se fornito
    IF @TempComponentPrefix IS NOT NULL AND @TempComponentPrefix <> ''
    BEGIN
        -- Assicuriamoci che il prefisso non faccia superare i 20 caratteri
        SET @TempItemCode = LEFT(@TempComponentPrefix + '_' + @TempItemCode, 20);
    END

    -- OTTIMIZZAZIONE: Per prima cosa, recuperiamo i dati del componente sorgente, se fornito
    DECLARE @SourceDescription NVARCHAR(255) = NULL;
    DECLARE @SourceDiameter FLOAT = NULL;
    DECLARE @SourceBxh VARCHAR(11) = NULL;
    DECLARE @SourceDepth FLOAT = NULL;
    DECLARE @SourceLength FLOAT = NULL;
    DECLARE @SourceMediumRadius FLOAT = NULL;
    DECLARE @SourceNotes NVARCHAR(MAX) = NULL;
    DECLARE @SourceCategoryId BIGINT = NULL;
    DECLARE @SourceFamilyId BIGINT = NULL;
    DECLARE @SourceMacrofamilyId BIGINT = NULL;
    DECLARE @SourceItemTypeId BIGINT = NULL;
    DECLARE @SourceNature INT = NULL;
    DECLARE @SourceStatusId BIGINT = NULL;
    DECLARE @SourceBaseUoM VARCHAR(3) = NULL;
    DECLARE @SourceOffset_acquisto VARCHAR(16) = NULL;
    DECLARE @SourceOffset_autoconsumo VARCHAR(16) = NULL;
    DECLARE @SourceOffset_vendita VARCHAR(16) = NULL;
    DECLARE @SourceDescriptionExtension NVARCHAR(512) = NULL;
    
    -- Se vogliamo copiare un componente non ancora presente in MA_ProjectArticles_Items eseguiamo prima un sync
    IF (@SourceComponentId IS NULL OR @SourceComponentId = 0) AND @sourceItemCode IS NOT NULL
    BEGIN
        -- NUOVA LOGICA: NON passa MainRefBOMId per sync di componenti temporanei
        EXEC MA_ProjectArticles_SyncComponent
            @CompanyId = @CompanyId, 	
            @ComponentId = NULL, 
            @ComponentCode = @sourceItemCode,
            @ComponentDescription = NULL,
            @ComponentNatureValue = NULL,
            @ComponentUoM = @ComponentUoM,
            @ImportBOM = 1,
            @ValidateBOM = 1,
            @MaxLevels = 1,
            @CreateIfNotExists = 1,
            @UserId = @UserId,
            @MainRefBOMId = NULL,  -- SEMPRE NULL per componenti temporanei
            @ReturnComponentId = @RealComponentId OUTPUT,
            @ErrorCode = @SyncErrorCode OUTPUT,
            @ErrorMessage = @SyncErrorMessage OUTPUT;

        IF @SyncErrorCode <> 0 OR @RealComponentId IS NULL
        BEGIN
            SET @ErrorCode = 30 + @SyncErrorCode;
            SET @ErrorMessage = N'Errore nella sincronizzazione del componente: ' + @SyncErrorMessage;
            THROW 50030, @ErrorMessage, 1;
        END

        SET @SourceComponentId = (SELECT Id FROM MA_ProjectArticles_Items 
                                 WHERE CompanyId = @CompanyId AND Item = @sourceItemCode);
    END
    
    -- Genera un nuovo ID per il componente
    SET @TempComponentId = dbo.GetNextProjectArticleItemId(@CompanyId);
    
    -- Se abbiamo un componente sorgente, otteniamo i suoi attributi in una sola query
    IF @SourceComponentId > 0
    BEGIN
        SELECT 
            @SourceDescription = Description,
            @SourceDiameter = Diameter,
            @SourceBxh = Bxh,
            @SourceDepth = Depth,
            @SourceLength = Length,
            @SourceMediumRadius = MediumRadius,
            @SourceNotes = Notes,
            @SourceCategoryId = CategoryId,
            @SourceFamilyId = FamilyId,
            @SourceMacrofamilyId = MacrofamilyId,
            @SourceItemTypeId = ItemTypeId,
            @SourceNature = Nature,
            @SourceStatusId = StatusId,
            @SourceBaseUoM = BaseUoM,
            @SourceOffset_acquisto = offset_acquisto,
            @SourceOffset_autoconsumo = offset_autoconsumo,
            @SourceOffset_vendita = offset_vendita,
            @SourceDescriptionExtension = DescriptionExtension
        FROM MA_ProjectArticles_Items
        WHERE Id = @SourceComponentId AND CompanyId = @CompanyId;
    END

    -- Imposta i valori di default o usa quelli del componente sorgente
    SET @ComponentDescription = ISNULL(@ComponentDescription, ISNULL(@SourceDescription, 'Componente temporaneo'));
    SET @ComponentNatureValue = ISNULL(@ComponentNatureValue, ISNULL(@SourceNature, 22413312)); -- Default Semilavorato
    SET @ComponentUoM = ISNULL(@ComponentUoM, ISNULL(@SourceBaseUoM, 'PZ'));

    -- Crea il nuovo componente temporaneo con i dati del componente sorgente
    INSERT INTO dbo.MA_ProjectArticles_Items (
        Id, CompanyId, TBCreatedId, TBCreated, TBModifiedId, TBModified,
        Item, Description, Nature, BaseUoM, stato_erp,
        -- Includiamo tutti gli altri campi del componente sorgente
        Diameter, Bxh, Depth, Length, MediumRadius, Notes, 
        CategoryId, FamilyId, MacrofamilyId, ItemTypeId, StatusId,
        Disabled, DescriptionExtension, offset_acquisto, 
        offset_autoconsumo, offset_vendita
    ) VALUES (
        @TempComponentId, @CompanyId, @UserId, GETDATE(), @UserId, GETDATE(),
        @TempItemCode, @ComponentDescription, @ComponentNatureValue, @ComponentUoM, 0,
        -- Utilizziamo i valori dal componente sorgente
        @SourceDiameter, @SourceBxh, @SourceDepth, @SourceLength, @SourceMediumRadius, @SourceNotes,
        @SourceCategoryId, @SourceFamilyId, @SourceMacrofamilyId, @SourceItemTypeId, @SourceStatusId,
        0, -- Non disabilitato
        @SourceDescriptionExtension, @SourceOffset_acquisto, 
        @SourceOffset_autoconsumo, @SourceOffset_vendita
    );

    -- Imposta i parametri per utilizzare il nuovo componente
    SET @ComponentId = @TempComponentId;
    SET @ComponentCode = @TempItemCode;
    SET @CreatedComponentCode = @TempItemCode;

    -- Se il componente è un semilavorato o prodotto finito e @ImportBOM = 1,
    -- creiamo una distinta base
    IF @ImportBOM = 1 AND @ComponentNatureValue IN (22413312, 22413313) 
    BEGIN
        DECLARE @TempBOMId BIGINT = dbo.GetNextProjectArticleBOMId(@CompanyId);

        -- NUOVA LOGICA: Crea distinta temporanea SEMPRE con MainRefBOMId = NULL
        INSERT INTO dbo.MA_ProjectArticles_BillOfMaterials (
            CompanyId, Id, BOM, Description, ItemId, Version, UoM, BOMStatus,
            ProductionLot, TBCreated, TBCreatedId, MainRefBOMId
        ) VALUES (
            @CompanyId, @TempBOMId, @TempItemCode, 
            'Distinta per ' + @ComponentDescription, 
            @TempComponentId, 
            1,  -- SEMPRE Version 1
            @ComponentUoM, 
            'BOZZA',
            1, 
            GETDATE(), 
            @UserId, 
            NULL  -- SEMPRE NULL per componenti temporanei
        );

        -- OTTIMIZZAZIONE: Priorità al SourceBOMId specificato esplicitamente se fornito
        DECLARE @SourceBOMId_0 BIGINT = NULL;

        -- Se è stato fornito esplicitamente SourceBOMId, usiamo quello
        IF @SourceBOMId IS NOT NULL AND @SourceBOMId > 0
        BEGIN
            SET @SourceBOMId_0 = @SourceBOMId;
        END
        -- Altrimenti, troviamo la Version 1 del componente sorgente se disponibile
        ELSE IF @SourceComponentId IS NOT NULL
        BEGIN
            -- NUOVA LOGICA: Cerca sempre Version 1 per la copia
            SELECT TOP(1) @SourceBOMId_0 = Id
            FROM dbo.MA_ProjectArticles_BillOfMaterials 
            WHERE ItemId = @SourceComponentId 
                AND CompanyId = @CompanyId 
                AND Version = 1  -- SEMPRE VERSION 1
            ORDER BY Id DESC;
        END

        -- Se abbiamo trovato una distinta sorgente, copiamo i componenti
        IF @SourceBOMId_0 IS NOT NULL
        BEGIN
            -- Copia i componenti dalla distinta sorgente
            INSERT INTO dbo.MA_ProjectArticles_BOMComponents (
                CompanyId, BOMId, Line, ComponentId, ComponentType, Quantity,
                UnitCost, TotalCost, FixedCost, UoM, Details, Notes, TBCreated, TBCreatedId
            )
            SELECT 
                @CompanyId, @TempBOMId, Line, ComponentId, ComponentType, Quantity,
                UnitCost, TotalCost, FixedCost, UoM, Details, Notes, GETDATE(), @UserId
            FROM dbo.MA_ProjectArticles_BOMComponents
            WHERE BOMId = @SourceBOMId_0 AND CompanyId = @CompanyId;

            -- Copia anche i cicli
            INSERT INTO dbo.MA_ProjectArticles_BOMRouting (
                CompanyId, RtgStep, BOMId, Operation, Notes, WC, ProcessingTime,
                SetupTime, NoOfProcessingWorkers, NoOfSetupWorkers, SubId, Supplier,
                Qty, TBCreated, TBModified, TBCreatedID, TBModifiedID
            )
            SELECT 
                @CompanyId, RtgStep, @TempBOMId, Operation, Notes, WC, ProcessingTime,
                SetupTime, NoOfProcessingWorkers, NoOfSetupWorkers, SubId, Supplier,
                Qty, GETDATE(), GETDATE(), @UserId, @UserId
            FROM dbo.MA_ProjectArticles_BOMRouting
            WHERE BOMId = @SourceBOMId_0 AND CompanyId = @CompanyId;
        END
    END
END
        -- Esecuzione dell'azione richiesta
        IF @Action = 'ADD'
        BEGIN
            -- Generazione nuovo ID specifico per questa azienda per la distinta
            SET @NewId = dbo.GetNextProjectArticleBOMId(@CompanyId);
            
            -- Se BOM non è specificato, generiamo un codice distinta base
            IF @BOM IS NULL
            BEGIN
                SET @BOM = 'TBOM_' + CAST(@NewId AS VARCHAR(20));
            END
            
            -- Inserimento nuova distinta base
            INSERT INTO dbo.MA_ProjectArticles_BillOfMaterials (
                CompanyId, Id, BOM, Description, ItemId, Version, UoM, BOMStatus,
                ProductionLot, RMCost, ProcessingCost, RMRefillCost, ProcessingRefillCost,
                TotalCost, TotalPrice, RefillWaste, RefillDiscount, TotalRefill,
                TransportRefill, Details, Notes, TBCreated, TBCreatedId, MainRefBOMId
            ) VALUES (
                @CompanyId, @NewId, @BOM, ISNULL(@Description, ''), @ItemId, @Version, @UoM, @BOMStatus,
                @ProductionLot, ISNULL(@RMCost, 0), ISNULL(@ProcessingCost, 0), ISNULL(@RMRefillCost, 0), ISNULL(@ProcessingRefillCost, 0),
                ISNULL(@TotalCost, 0), ISNULL(@TotalPrice, 0), ISNULL(@RefillWaste, 0), ISNULL(@RefillDiscount, 0), ISNULL(@TotalRefill, 0),
                ISNULL(@TransportRefill, 0), @Details, @Notes, GETDATE(), @UserId, (SELECT ISNULL(MainRefBOMId, Id) FROM MA_ProjectArticles_BillOfMaterials WHERE Id = @Id AND CompanyId = @CompanyId)
            );
            
            SET @ReturnValue = @NewId;
        END
        ELSE IF @Action = 'UPDATE'
        BEGIN
			
            -- Aggiornamento distinta base esistente
            UPDATE dbo.MA_ProjectArticles_BillOfMaterials
            SET 
                BOM = ISNULL(@BOM, BOM),
                Description = ISNULL(@Description, Description),
                Version = ISNULL(@Version, Version),
                UoM = ISNULL(@UoM, UoM),
                BOMStatus = ISNULL(@BOMStatus, BOMStatus),
                ProductionLot = ISNULL(@ProductionLot, ProductionLot),
                RMCost = ISNULL(@RMCost, RMCost),
                ProcessingCost = ISNULL(@ProcessingCost, ProcessingCost),
                RMRefillCost = ISNULL(@RMRefillCost, RMRefillCost),
                ProcessingRefillCost = ISNULL(@ProcessingRefillCost, ProcessingRefillCost),
                TotalCost = ISNULL(@TotalCost, TotalCost),
                TotalPrice = ISNULL(@TotalPrice, TotalPrice),
                RefillWaste = ISNULL(@RefillWaste, RefillWaste),
                RefillDiscount = ISNULL(@RefillDiscount, RefillDiscount),
                TotalRefill = ISNULL(@TotalRefill, TotalRefill),
                TransportRefill = ISNULL(@TransportRefill, TransportRefill),
                Details = ISNULL(@Details, Details),
                Notes = ISNULL(@Notes, Notes)
            WHERE Id = @Id AND CompanyId = @CompanyId AND Version = @Version
            
            IF @@ROWCOUNT = 0
            BEGIN
                SET @ErrorCode = 12;
                SET @ErrorMessage = N'Distinta base non trovata.';
                THROW 50012, @ErrorMessage, 1;
            END
            
            SET @ReturnValue = @Id;
        END
ELSE IF @Action = 'COPY'
BEGIN
    -- Generazione nuovo ID specifico per questa azienda per la distinta
    SET @NewId = dbo.GetNextProjectArticleBOMId(@CompanyId);
    
    -- Se BOM non è specificato, generiamo un codice distinta base
    IF @BOM IS NULL
    BEGIN
        SET @BOM = ISNULL((SELECT TOP(1) BOM FROM dbo.MA_ProjectArticles_BillOfMaterials 
                          WHERE Id = @SourceBOMId AND CompanyId = @CompanyId),
                         CONCAT('DISTINTA ARTICOLO CON ID ', @NewId)) 
    END
    
    -- NUOVA LOGICA: Determina il MainRefBOMId per la nuova copia
    DECLARE @NewMainRefBOMId BIGINT;
    DECLARE @SourceItemId BIGINT;
    DECLARE @SourceMainRefBOMId BIGINT;
    
    -- Ottieni informazioni dalla BOM sorgente
    SELECT @SourceItemId = ItemId,
           @SourceMainRefBOMId = ISNULL(MainRefBOMId, Id)
    FROM dbo.MA_ProjectArticles_BillOfMaterials 
    WHERE Id = @SourceBOMId AND CompanyId = @CompanyId;
    
    -- LOGICA SEMPLIFICATA PER MainRefBOMId:
    -- Se copia su articolo diverso -> nuova famiglia (MainRefBOMId = @NewId)
    -- Se copia sullo stesso articolo -> mantieni famiglia originale
    IF @ItemId != @SourceItemId
    BEGIN
        -- Copia su articolo diverso: crea nuova famiglia
        SET @NewMainRefBOMId = @NewId;
    END
    ELSE
    BEGIN
        -- Copia sullo stesso articolo: mantieni la famiglia originale
        SET @NewMainRefBOMId = @SourceMainRefBOMId;
    END
    
    -- Calcola la versione corretta per la nuova distinta
    DECLARE @NewVersion INT;
    SELECT @NewVersion = ISNULL(MAX(Version), 0) + 1
    FROM dbo.MA_ProjectArticles_BillOfMaterials 
    WHERE ItemId = @ItemId AND CompanyId = @CompanyId;
    
    -- Copia distinta base esistente
    INSERT INTO dbo.MA_ProjectArticles_BillOfMaterials (
        CompanyId, Id, BOM, Description, ItemId, Version, UoM, BOMStatus,
        ProductionLot, RMCost, ProcessingCost, RMRefillCost, ProcessingRefillCost,
        TotalCost, TotalPrice, RefillWaste, RefillDiscount, TotalRefill,
        TransportRefill, Details, Notes, TBCreated, TBCreatedId, MainRefBOMId 
    )
    SELECT 
        @CompanyId, @NewId, @BOM, 
        ISNULL(@Description, Description), 
        @ItemId,
        ISNULL(@Version, @NewVersion), 
        ISNULL(@UoM, ISNULL(UoM,'PZ')), 
        ISNULL(@BOMStatus, ISNULL(BOMStatus,'BOZZA')),
        ISNULL(@ProductionLot, ISNULL(ProductionLot,0)),
        ISNULL(@RMCost, ISNULL(RMCost,0)), 
        ISNULL(@ProcessingCost, ISNULL(ProcessingCost,0)), 
        ISNULL(@RMRefillCost, ISNULL(RMRefillCost,0)), 
        ISNULL(@ProcessingRefillCost, ISNULL(ProcessingRefillCost,0)),
        ISNULL(@TotalCost, ISNULL(TotalCost,0)), 
        ISNULL(@TotalPrice, ISNULL(TotalPrice,0)), 
        ISNULL(@RefillWaste, ISNULL(RefillWaste,0)), 
        ISNULL(@RefillDiscount, ISNULL(RefillDiscount,0)), 
        ISNULL(@TotalRefill, ISNULL(TotalRefill,0)),
        ISNULL(@TransportRefill, ISNULL(TransportRefill,0)), 
        ISNULL(@Details, ISNULL(Details,'')), 
        ISNULL(@Notes, ISNULL(Notes,'')),
        GETDATE(), 
        @UserId,
        @NewMainRefBOMId  -- Usa la logica determinata sopra
    FROM dbo.MA_ProjectArticles_BillOfMaterials
    WHERE Id = @SourceBOMId AND CompanyId = @CompanyId;
    
    IF @@ROWCOUNT = 0
    BEGIN
        SET @ErrorCode = 13;
        SET @ErrorMessage = N'Distinta base sorgente non trovata.';
        THROW 50013, @ErrorMessage, 1;
    END;
    
    -- Tabelle temporanee per tracciare elaborazione (se necessario)
    CREATE TABLE #ProcessedBOMs (
        OldBOMId BIGINT,
        NewBOMId BIGINT,
        ItemId BIGINT,
        PRIMARY KEY (OldBOMId)
    );
    
    CREATE TABLE #BOMQueue (
        OldBOMId BIGINT,
        NewBOMId BIGINT,
        ItemId BIGINT,
        ProcessingLevel INT,
        Processed BIT DEFAULT 0
    );
    
    -- Se richiesto, verifica ricorsivamente che tutti i componenti esistano
    IF @VerifyComponents = 1 AND @CopyComponents = 1
    BEGIN
        -- NUOVA LOGICA: Verifica usando sempre Version 1 dei componenti
        WITH ComponentCTE AS (
            -- Query iniziale: ottiene tutti i componenti del primo livello
            SELECT 
                comp.ComponentId,
                comp.ComponentType,
                1 AS Level
            FROM dbo.MA_ProjectArticles_BOMComponents comp
            WHERE comp.BOMId = @SourceBOMId AND comp.CompanyId = @CompanyId
                  AND comp.ComponentType = 7798784 -- Solo componenti di tipo Articolo
            
            UNION ALL
            
            -- Query ricorsiva: ottiene i sottocomponenti SEMPRE da Version 1
            SELECT 
                child.ComponentId,
                child.ComponentType,
                parent.Level + 1
            FROM ComponentCTE parent
            -- IMPORTANTE: Usa sempre Version 1 per i componenti
            JOIN dbo.MA_ProjectArticles_BillOfMaterials bom 
                ON bom.ItemId = parent.ComponentId 
                AND bom.CompanyId = @CompanyId
                AND bom.Version = 1  -- SEMPRE VERSION 1
            JOIN dbo.MA_ProjectArticles_BOMComponents child 
                ON child.BOMId = bom.Id 
                AND child.CompanyId = @CompanyId
            WHERE child.ComponentType = 7798784 -- Solo componenti di tipo Articolo
                  AND NOT EXISTS (SELECT 1 FROM #ProcessedComponents WHERE ComponentId = child.ComponentId)
                  AND parent.Level < 10  -- Limite di profondità
        )
        -- Inserisce nella tabella temporanea per tracciare i componenti già elaborati
        INSERT INTO #ProcessedComponents (ComponentId)
        SELECT DISTINCT ComponentId 
        FROM ComponentCTE
        WHERE ComponentType = 7798784 -- Solo componenti di tipo Articolo
        OPTION (MAXRECURSION 100);

        -- Verifica quali componenti esistono già
        DECLARE @MissingComponents TABLE (
            ComponentId BIGINT PRIMARY KEY
        );
        
        -- Trova i componenti che non esistono nelle tabelle
        INSERT INTO @MissingComponents (ComponentId)
        SELECT pc.ComponentId
        FROM #ProcessedComponents pc
        WHERE NOT EXISTS (
            SELECT 1 
            FROM dbo.MA_ProjectArticles_Items 
            WHERE Id = pc.ComponentId AND CompanyId = @CompanyId
        );

        -- Crea i componenti mancanti
        DECLARE @CurrentComponentId BIGINT;
        DECLARE @ComponentItem VARCHAR(64);
        DECLARE @ComponentDesc VARCHAR(128);
        DECLARE @ComponentNature INT;
        DECLARE @ComponentBaseUoM VARCHAR(3);
        
        -- Cursor per processare i componenti mancanti
        DECLARE ComponentCursor CURSOR FOR
        SELECT mc.ComponentId
        FROM @MissingComponents mc;
        
        OPEN ComponentCursor;
        FETCH NEXT FROM ComponentCursor INTO @CurrentComponentId;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Cerca informazioni dall'anagrafica articoli
            SELECT 
                @ComponentItem = i.Item,
                @ComponentDesc = i.Description,
                @ComponentNature = i.Nature,
                @ComponentBaseUoM = i.BaseUoM
            FROM dbo.MA_Items i
            JOIN dbo.MA_ProjectArticles_Items pi ON i.Item = pi.Item
            WHERE pi.Id = @CurrentComponentId AND i.CompanyId = @CompanyId;
            
            -- Se non troviamo l'articolo, usiamo valori predefiniti
            IF @ComponentItem IS NULL
            BEGIN
                IF @CreateTempComponent = 1
                BEGIN
                    SET @ComponentItem = dbo.GenerateTempItemCode(@CompanyId);
                END
                ELSE
                BEGIN
                    SET @ComponentItem = 'TEMP_' + CAST(@CurrentComponentId AS VARCHAR(20));
                END
                
                SET @ComponentDesc = 'Articolo Temporaneo';
                SET @ComponentNature = 22413312; -- Semilavorato
                SET @ComponentBaseUoM = 'PZ';
            END
            
            -- Crea il componente mancante
            INSERT INTO dbo.MA_ProjectArticles_Items (
                Id, CompanyId, TBCreatedId, TBCreated, TBModifiedId, TBModified,
                Item, Description, Nature, BaseUoM, stato_erp
            ) VALUES (
                @CurrentComponentId, @CompanyId, @UserId, GETDATE(), @UserId, GETDATE(),
                @ComponentItem, @ComponentDesc, @ComponentNature, @ComponentBaseUoM, 0
            );
            
            FETCH NEXT FROM ComponentCursor INTO @CurrentComponentId;
        END
        
        CLOSE ComponentCursor;
        DEALLOCATE ComponentCursor;
    END

    -- NUOVA LOGICA SEMPLIFICATA: Copia componenti SENZA creare nuove versioni BOM
    IF @CopyComponents = 1
    BEGIN
        -- Copia diretta dei componenti dalla BOM sorgente
        -- NON crea nuove versioni delle BOM dei componenti
        INSERT INTO dbo.MA_ProjectArticles_BOMComponents (
            CompanyId, BOMId, Line, ComponentId, ComponentType, Quantity,
            UnitCost, TotalCost, FixedCost, UoM, Details, Notes, TBCreated, TBCreatedId
        )
        SELECT 
            @CompanyId, @NewId, Line, ComponentId, ComponentType, Quantity,
            UnitCost, TotalCost, FixedCost, UoM, Details, Notes, GETDATE(), @UserId
        FROM dbo.MA_ProjectArticles_BOMComponents
        WHERE BOMId = @SourceBOMId AND CompanyId = @CompanyId;
    END

    -- Copia cicli se richiesto
    IF @CopyRouting = 1
    BEGIN
        INSERT INTO dbo.MA_ProjectArticles_BOMRouting (
            CompanyId, RtgStep, BOMId, Operation, Notes, WC, ProcessingTime,
            SetupTime, NoOfProcessingWorkers, NoOfSetupWorkers, SubId, Supplier,
            Qty, TBCreated, TBModified, TBCreatedID, TBModifiedID
        )
        SELECT 
            @CompanyId, RtgStep, @NewId, Operation, Notes, WC, ProcessingTime,
            SetupTime, NoOfProcessingWorkers, NoOfSetupWorkers, SubId, Supplier,
            Qty, GETDATE(), GETDATE(), @UserId, @UserId
        FROM dbo.MA_ProjectArticles_BOMRouting
        WHERE BOMId = @SourceBOMId AND CompanyId = @CompanyId;
    END
    
    -- Cleanup
    DROP TABLE IF EXISTS #ProcessedBOMs;
    DROP TABLE IF EXISTS #BOMQueue;
    
    SET @ReturnValue = @NewId;
END


        ELSE IF @Action = 'ADD_COMPONENT'
BEGIN
    -- Verifica che la distinta base esista
    IF NOT EXISTS (SELECT 1 FROM dbo.MA_ProjectArticles_BillOfMaterials WHERE Id = @Id AND CompanyId = @CompanyId)
    BEGIN
        SET @ErrorCode = 14;
        SET @ErrorMessage = N'Distinta base non trovata.';
        THROW 50014, @ErrorMessage, 1;
    END

    -- Trova il prossimo numero di linea disponibile
    SELECT @NextComponentLine = ISNULL(MAX(Line), 0) + 1
    FROM dbo.MA_ProjectArticles_BOMComponents
    WHERE BOMId = @Id AND CompanyId = @CompanyId;
    
    -- NUOVA LOGICA DUALE: Determina se passare MainRefBOMId
    DECLARE @MainRefBOMId BIGINT;
    DECLARE @ComponentMainRefBOMId BIGINT = NULL;
    
    -- Ottieni il MainRefBOMId della BOM padre
    SELECT @MainRefBOMId = ISNULL(MainRefBOMId, Id) 
    FROM MA_ProjectArticles_BillOfMaterials 
    WHERE Id = @Id AND CompanyId = @CompanyId;
    
    -- Verifica se il componente ha già versioni con questo MainRef
    IF @ComponentCode IS NOT NULL OR @ComponentId IS NOT NULL
    BEGIN
        DECLARE @CheckComponentId BIGINT;
        
        -- Ottieni l'ID del componente se esiste
        IF @ComponentId IS NOT NULL
        BEGIN
            SET @CheckComponentId = @ComponentId;
        END
        ELSE IF @ComponentCode IS NOT NULL
        BEGIN
            SELECT @CheckComponentId = Id 
            FROM dbo.MA_ProjectArticles_Items 
            WHERE Item = @ComponentCode AND CompanyId = @CompanyId;
        END
        
        -- LOGICA DUALE: Verifica se esistono versioni del componente con il MainRef del padre
        IF @CheckComponentId IS NOT NULL
        BEGIN
            IF EXISTS (
                SELECT 1 
                FROM dbo.MA_ProjectArticles_BillOfMaterials
                WHERE ItemId = @CheckComponentId 
                    AND CompanyId = @CompanyId
                    AND MainRefBOMId = @MainRefBOMId
            )
            BEGIN
                -- Solo se esistono già versioni con questo MainRef, lo passiamo
                SET @ComponentMainRefBOMId = @MainRefBOMId;
            END
            -- Altrimenti @ComponentMainRefBOMId rimane NULL (userà Version 1)
        END
    END

    -- Chiama SyncComponent con il MainRef determinato dalla logica duale
    EXEC dbo.MA_ProjectArticles_SyncComponent
        @CompanyId = @CompanyId,
        @ComponentId = @ComponentId,
        @ComponentCode = @ComponentCode,
        @ComponentDescription = @ComponentDescription,
        @ComponentNatureValue = @ComponentNatureValue,
        @ComponentUoM = @ComponentUoM,
        @ImportBOM = @ImportBOM,
        @MaxLevels = @MaxLevels,
        @ValidateBOM = 1,
        @CreateIfNotExists = 1,
        @UserId = @UserId,
        @MainRefBOMId = @ComponentMainRefBOMId,  -- NULL o MainRef condizionale
        @ReturnComponentId = @RealComponentId OUTPUT,
        @ErrorCode = @SyncErrorCode OUTPUT,
        @ErrorMessage = @SyncErrorMessage OUTPUT;

    IF @SyncErrorCode <> 0 OR @RealComponentId IS NULL
    BEGIN
        SET @ErrorCode = 30 + @SyncErrorCode;
        SET @ErrorMessage = N'Errore nella sincronizzazione del componente: ' + @SyncErrorMessage;
        THROW 50030, @ErrorMessage, 1;
    END

    -- Ottieni il codice articolo del componente
    SELECT 
        @ComponentItemCode = Item,
        @ComponentType = ISNULL(@ComponentType, 7798784) -- Default Articolo
    FROM dbo.MA_ProjectArticles_Items
    WHERE Id = @RealComponentId AND CompanyId = @CompanyId;

    -- Step 2: Verifica se il componente ha una distinta nel gestionale (se @ImportBOM = 1)
    IF @ImportBOM = 1
    BEGIN
        -- Verifica se esiste già una distinta per questo componente nei progetti
        SELECT 
            @ComponentHasBOM = 1,
            @ComponentBOMId = Id
        FROM dbo.MA_ProjectArticles_BillOfMaterials
        WHERE ItemId = @RealComponentId 
            AND CompanyId = @CompanyId
            -- NUOVA LOGICA: Cerca la versione corretta basata sul MainRef
            AND (
                (@ComponentMainRefBOMId IS NOT NULL AND MainRefBOMId = @ComponentMainRefBOMId)
                OR 
                (@ComponentMainRefBOMId IS NULL AND Version = 1)
            );

        -- Verifica se esiste una distinta nel gestionale
        DECLARE @GestionaleBOMExists BIT = 0;

        SELECT @GestionaleBOMExists = 1
        FROM dbo.MA_BillOfMaterials
        WHERE BOM = @ComponentItemCode AND CompanyId = @CompanyId AND Disabled = 0;

        -- Se il componente ha una distinta nel gestionale, verifichiamo la sincronizzazione
        IF @GestionaleBOMExists = 1
        BEGIN
            IF @ComponentHasBOM = 1
            BEGIN
                -- La distinta esiste nei progetti, verifichiamo se è sincronizzata col gestionale
                -- Tabella per componenti da sincronizzare
                DECLARE @ComponentsToSync TABLE (
                    GestionaleLine INT,
                    GestionaleComponent VARCHAR(64),
                    GestionaleQty DECIMAL(18, 5),
                    ProjectLine INT NULL,
                    ProjectComponentId BIGINT NULL
                );

                -- Ottieni i componenti dalla distinta del gestionale
                INSERT INTO @ComponentsToSync (GestionaleLine, GestionaleComponent, GestionaleQty)
                SELECT 
                    Line,
                    Component,
                    Qty
                FROM dbo.MA_BillOfMaterialsComp
                WHERE BOM = @ComponentItemCode AND CompanyId = @CompanyId;

                -- Aggiorna con le informazioni dei componenti già presenti nei progetti
                UPDATE CS
                SET 
                    CS.ProjectLine = PC.Line,
                    CS.ProjectComponentId = PI.Id
                FROM @ComponentsToSync CS
                JOIN dbo.MA_ProjectArticles_BOMComponents PC ON PC.BOMId = @ComponentBOMId AND PC.CompanyId = @CompanyId
                JOIN dbo.MA_ProjectArticles_Items PI ON PC.ComponentId = PI.Id AND PI.CompanyId = @CompanyId AND PI.Item = CS.GestionaleComponent;

                -- Se ci sono componenti da sincronizzare, imposta il flag
                IF EXISTS (SELECT 1 FROM @ComponentsToSync WHERE ProjectComponentId IS NULL)
                BEGIN
                    SET @NeedBOMSync = 1;
                END
            END
            ELSE
            BEGIN
                -- La distinta non esiste nei progetti ma esiste nel gestionale, dobbiamo importarla
                SET @NeedBOMSync = 1;
            END

            -- Se necessario, sincronizza la distinta del componente
            IF @NeedBOMSync = 1
            BEGIN
                DECLARE @SyncBOMErrorCode INT;
                DECLARE @SyncBOMErrorMessage NVARCHAR(4000);
                DECLARE @NewBOMId BIGINT;

                -- Se la distinta già esiste, prima cancella tutti i componenti esistenti
                IF @ComponentHasBOM = 1
                BEGIN
                    DELETE FROM dbo.MA_ProjectArticles_BOMComponents
                    WHERE BOMId = @ComponentBOMId AND CompanyId = @CompanyId;
                END

                -- Importa la distinta dal gestionale con la logica MainRef corretta
                EXEC dbo.MA_ProjectArticles_ImportBOMFromERP
                    @CompanyId = @CompanyId,
                    @ItemCode = @ComponentItemCode,
                    @ItemId = @RealComponentId,
                    @MaxLevels = @MaxLevels,
                    @UserId = @UserId,
                    @MainRefBOMId = @ComponentMainRefBOMId,  -- Passa NULL o MainRef condizionale
                    @ReturnBOMId = @NewBOMId OUTPUT,
                    @ErrorCode = @SyncBOMErrorCode OUTPUT,
                    @ErrorMessage = @SyncBOMErrorMessage OUTPUT;

                IF @SyncBOMErrorCode <> 0
                BEGIN
                    -- In questo caso non interrompiamo, ma loghiamo l'avviso
                    SET @ErrorMessage = N'Avviso: Errore nella sincronizzazione della distinta del componente: ' + @SyncBOMErrorMessage;
                END
            END
        END
    END

    -- Se non abbiamo i dettagli del componente, otteniamoli dal componente sincronizzato
    IF @ComponentDetails IS NULL OR @ComponentUoM IS NULL
    BEGIN
        SELECT
            @ComponentDetails = ISNULL(@ComponentDetails, Description),
            @ComponentUoM = ISNULL(@ComponentUoM, BaseUoM)
        FROM dbo.MA_ProjectArticles_Items
        WHERE Id = @RealComponentId AND CompanyId = @CompanyId;
    END

    -- Inserimento nuovo componente
	  INSERT INTO dbo.MA_ProjectArticles_BOMComponents (
		  CompanyId, BOMId, Line, ComponentId, ComponentType, Quantity,
		  UnitCost, TotalCost, FixedCost, UoM, Details, Notes, TBCreated, TBCreatedId
	  ) VALUES (
		  @CompanyId, @Id, @NextComponentLine, @RealComponentId, @ComponentType, @ComponentQuantity,
		  @ComponentUnitCost, @ComponentTotalCost, @ComponentFixedCost, @ComponentUoM,
		  @ComponentDetails, @ComponentNotes, GETDATE(), @UserId
	  );

	-- NUOVO: Gestione dati fornitore Intercompany per componenti temporanei
		  IF @TempSupplierId IS NOT NULL OR @TempIntercompanyTargetId IS NOT NULL OR @TempSupplierNotes IS NOT NULL
		  BEGIN
			  DECLARE @ItemCodeCheck VARCHAR(64);
			  DECLARE @ExistsInMA_Items BIT = 0;

			  -- Verifica se il componente esiste in MA_Items (gestionale)
			  SELECT @ItemCodeCheck = Item
			  FROM MA_ProjectArticles_Items
			  WHERE Id = @RealComponentId AND CompanyId = @CompanyId;

			  IF EXISTS (
				  SELECT 1 FROM MA_Items
				  WHERE Item = @ItemCodeCheck AND CompanyId = @CompanyId
			  )
			  BEGIN
				  SET @ExistsInMA_Items = 1;
			  END

			  -- Aggiorna dati fornitore SOLO se componente NON esiste in gestionale
			  IF @ExistsInMA_Items = 0
			  BEGIN
				  UPDATE MA_ProjectArticles_Items
				  SET
					  TempSupplierId = @TempSupplierId,
					  TempIntercompanyTargetId = @TempIntercompanyTargetId,
					  TempSupplierNotes = @TempSupplierNotes,
					  TBModified = GETDATE(),
					  TBModifiedId = @UserId
				  WHERE Id = @RealComponentId AND CompanyId = @CompanyId;
			  END
			  -- Se esiste in gestionale, ignora i dati Temp* (la funzione fn_GetComponentSupplier leggerà da MA_Items)
		  END

		  SET @ReturnValue = @Id;
		  END


        ELSE IF @Action = 'UPDATE_COMPONENT'
        BEGIN
            -- Verifica che la distinta base esista
            IF NOT EXISTS (SELECT 1 FROM dbo.MA_ProjectArticles_BillOfMaterials WHERE Id = @Id AND CompanyId = @CompanyId)
            BEGIN
                SET @ErrorCode = 15;
                SET @ErrorMessage = N'Distinta base non trovata.';
                THROW 50015, @ErrorMessage, 1;
            END
            
            -- Verifica che il componente esista
            IF NOT EXISTS (SELECT 1 FROM dbo.MA_ProjectArticles_BOMComponents WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId)
            BEGIN
                SET @ErrorCode = 16;
                SET @ErrorMessage = N'Componente non trovato.';
                THROW 50016, @ErrorMessage, 1;
            END
            
            -- Se viene specificato un nuovo ComponentId, verifica che esista
            IF @ComponentId IS NOT NULL
            BEGIN
                -- Utilizziamo la stored procedure per sincronizzare il componente
                DECLARE @UpdateSyncErrorCode INT;
                DECLARE @UpdateSyncErrorMessage NVARCHAR(4000);
                DECLARE @UpdateRealComponentId BIGINT;
                
                EXEC dbo.MA_ProjectArticles_SyncComponent
                    @CompanyId = @CompanyId,
                    @ComponentId = @ComponentId,
                    @ComponentCode = @ComponentCode,
                    @ComponentDescription = @ComponentDescription,
                    @ComponentNatureValue = @ComponentNatureValue,
                    @ComponentUoM = @ComponentUoM,
                    @ImportBOM = 0, -- Non importiamo la distinta durante l'aggiornamento
                    @MaxLevels = 1,
                    @CreateIfNotExists = 1,
                    @UserId = @UserId,
                    @ReturnComponentId = @UpdateRealComponentId OUTPUT,
                    @ErrorCode = @UpdateSyncErrorCode OUTPUT,
                    @ErrorMessage = @UpdateSyncErrorMessage OUTPUT;
                
                IF @UpdateSyncErrorCode <> 0 OR @UpdateRealComponentId IS NULL
                BEGIN
                    SET @ErrorCode = 35 + @UpdateSyncErrorCode;
                    SET @ErrorMessage = N'Errore nella sincronizzazione del componente: ' + @UpdateSyncErrorMessage;
                    THROW 50035, @ErrorMessage, 1;
                END
                
                SET @ComponentId = @UpdateRealComponentId;
            END
            
            -- Aggiornamento componente
            UPDATE dbo.MA_ProjectArticles_BOMComponents
			  SET
				  ComponentId = ISNULL(@ComponentId, ComponentId),
				  ComponentType = ISNULL(@ComponentType, ComponentType),
				  Quantity = ISNULL(@ComponentQuantity, Quantity),
				  UnitCost = ISNULL(@ComponentUnitCost, UnitCost),
				  TotalCost = ISNULL(@ComponentTotalCost, TotalCost),
				  FixedCost = ISNULL(@ComponentFixedCost, FixedCost),
				  UoM = ISNULL(@ComponentUoM, UoM),
				  Details = ISNULL(@ComponentDetails, Details),
				  Notes = ISNULL(@ComponentNotes, Notes)
			  WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId;

				  -- NUOVO: Se l'UoM è stata modificata, aggiorna anche BaseUoM dell'articolo temporaneo
				IF @ComponentUoM IS NOT NULL
				BEGIN
					DECLARE @UpdatedComponentId BIGINT;

					-- Ottieni il ComponentId dalla BOM appena aggiornata
					SELECT @UpdatedComponentId = ComponentId
					FROM MA_ProjectArticles_BOMComponents
					WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId;

					-- Aggiorna BaseUoM SOLO se l'articolo è temporaneo (stato_erp = 0)
					-- Non modificare articoli già presenti nel gestionale!
					UPDATE MA_ProjectArticles_Items
					SET BaseUoM = @ComponentUoM
					WHERE Id = @UpdatedComponentId
						AND CompanyId = @CompanyId
						AND stato_erp = 0;  -- Solo articoli temporanei
				END


			  -- NUOVO: Gestione aggiornamento dati fornitore (solo se esplicitamente richiesto)
			  IF @UpdateSupplierData = 1 AND (
				  @TempSupplierId IS NOT NULL OR
				  @TempIntercompanyTargetId IS NOT NULL OR
				  @TempSupplierNotes IS NOT NULL
			  )
			  BEGIN
				  DECLARE @UpdateItemCodeCheck VARCHAR(64);
				  DECLARE @UpdateExistsInMA_Items BIT = 0;
				  DECLARE @UpdateCurrentComponentId BIGINT;

				  -- Ottieni ComponentId corrente
				  SELECT @UpdateCurrentComponentId = ComponentId
				  FROM MA_ProjectArticles_BOMComponents
				  WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId;

				  -- Verifica se esiste in gestionale
				  SELECT @UpdateItemCodeCheck = Item
				  FROM MA_ProjectArticles_Items
				  WHERE Id = @UpdateCurrentComponentId AND CompanyId = @CompanyId;

				  IF EXISTS (
					  SELECT 1 FROM MA_Items
					  WHERE Item = @UpdateItemCodeCheck AND CompanyId = @CompanyId
				  )
				  BEGIN
					  SET @UpdateExistsInMA_Items = 1;

					  -- Se esiste in gestionale, NON permettere modifica dati fornitore
					  SET @ErrorCode = 100;
					  SET @ErrorMessage = N'Impossibile modificare dati fornitore: codice ' + @UpdateItemCodeCheck + N'
			  esistente nel gestionale';
					  THROW 50100, @ErrorMessage, 1;
				  END

				  -- Aggiorna dati fornitore solo se componente temporaneo
				  IF @UpdateExistsInMA_Items = 0
				  BEGIN
					  UPDATE MA_ProjectArticles_Items
					  SET
						  TempSupplierId = ISNULL(@TempSupplierId, TempSupplierId),
						  TempIntercompanyTargetId = ISNULL(@TempIntercompanyTargetId, TempIntercompanyTargetId),
						  TempSupplierNotes = ISNULL(@TempSupplierNotes, TempSupplierNotes),
						  TBModified = GETDATE(),
						  TBModifiedId = @UserId
					  WHERE Id = @UpdateCurrentComponentId AND CompanyId = @CompanyId;
				  END
			  END

			  SET @ReturnValue = @Id;
			  END
        ELSE IF @Action = 'DELETE_COMPONENT'
        BEGIN
            -- Verifica che la distinta base esista
            IF NOT EXISTS (SELECT 1 FROM dbo.MA_ProjectArticles_BillOfMaterials WHERE Id = @Id AND CompanyId = @CompanyId)
            BEGIN
                SET @ErrorCode = 17;
                SET @ErrorMessage = N'Distinta base non trovata.';
                THROW 50017, @ErrorMessage, 1;
            END
            
            -- Eliminazione componente
            DELETE FROM dbo.MA_ProjectArticles_BOMComponents
            WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId;
            
            IF @@ROWCOUNT = 0
            BEGIN
                SET @ErrorCode = 18;
                SET @ErrorMessage = N'Componente non trovato.';
                THROW 50018, @ErrorMessage, 1;
            END
            
            SET @ReturnValue = @Id;
        END
        ELSE IF @Action = 'ADD_ROUTING'
        BEGIN
            -- Verifica che la distinta base esista
            IF NOT EXISTS (SELECT 1 FROM dbo.MA_ProjectArticles_BillOfMaterials WHERE Id = @Id AND CompanyId = @CompanyId)
            BEGIN
                SET @ErrorCode = 19;
                SET @ErrorMessage = N'Distinta base non trovata.';
                THROW 50019, @ErrorMessage, 1;
            END
            
            -- Verifica che la fase non esista già
            IF EXISTS (SELECT 1 FROM dbo.MA_ProjectArticles_BOMRouting WHERE BOMId = @Id AND RtgStep = @RtgStep AND CompanyId = @CompanyId)
            BEGIN
                SET @ErrorCode = 20;
                SET @ErrorMessage = N'Fase già esistente.';
                THROW 50020, @ErrorMessage, 1;
            END
            
            -- Inserimento nuova fase
            INSERT INTO dbo.MA_ProjectArticles_BOMRouting (
                CompanyId, RtgStep, BOMId, Operation, Notes, WC, ProcessingTime,
                SetupTime, NoOfProcessingWorkers, NoOfSetupWorkers, SubId, Supplier,
                Qty, TBCreated, TBModified, TBCreatedID, TBModifiedID
            ) VALUES (
                @CompanyId, @RtgStep, @Id, @Operation, @Notes, @WC, @ProcessingTime,
                @SetupTime, @NoOfProcessingWorkers, @NoOfSetupWorkers, @SubId, @Supplier,
                @Qty, GETDATE(), GETDATE(), @UserId, @UserId
            );
            
            SET @ReturnValue = @Id;
        END
        ELSE IF @Action = 'UPDATE_ROUTING'
        BEGIN
            -- Verifica che la distinta base esista
            IF NOT EXISTS (SELECT 1 FROM dbo.MA_ProjectArticles_BillOfMaterials WHERE Id = @Id AND CompanyId = @CompanyId)
            BEGIN
                SET @ErrorCode = 21;
                SET @ErrorMessage = N'Distinta base non trovata.';
                THROW 50021, @ErrorMessage, 1;
            END
            
            -- Aggiornamento fase esistente
            UPDATE dbo.MA_ProjectArticles_BOMRouting
            SET 
                Operation = ISNULL(@Operation, Operation),
                Notes = ISNULL(@Notes, Notes),
                WC = ISNULL(@WC, WC),
                ProcessingTime = ISNULL(@ProcessingTime, ProcessingTime),
                SetupTime = ISNULL(@SetupTime, SetupTime),
                NoOfProcessingWorkers = ISNULL(@NoOfProcessingWorkers, NoOfProcessingWorkers),
                NoOfSetupWorkers = ISNULL(@NoOfSetupWorkers, NoOfSetupWorkers),
                SubId = ISNULL(@SubId, SubId),
                Supplier = ISNULL(@Supplier, Supplier),
                Qty = ISNULL(@Qty, Qty),
                TBModified = GETDATE(),
                TBModifiedID = @UserId
            WHERE BOMId = @Id AND RtgStep = @RtgStep AND CompanyId = @CompanyId;
            
            IF @@ROWCOUNT = 0
            BEGIN
                SET @ErrorCode = 22;
                SET @ErrorMessage = N'Fase non trovata.';
                THROW 50022, @ErrorMessage, 1;
            END
            
            SET @ReturnValue = @Id;
        END
        ELSE IF @Action = 'DELETE_ROUTING'
        BEGIN
            -- Verifica che la distinta base esista
            IF NOT EXISTS (SELECT 1 FROM dbo.MA_ProjectArticles_BillOfMaterials WHERE Id = @Id AND CompanyId = @CompanyId)
            BEGIN
                SET @ErrorCode = 23;
                SET @ErrorMessage = N'Distinta base non trovata.';
                THROW 50023, @ErrorMessage, 1;
            END
            
            -- Eliminazione fase
            DELETE FROM dbo.MA_ProjectArticles_BOMRouting
            WHERE BOMId = @Id AND RtgStep = @RtgStep AND CompanyId = @CompanyId;
            
            IF @@ROWCOUNT = 0
            BEGIN
                SET @ErrorCode = 24;
                SET @ErrorMessage = N'Fase non trovata.';
                THROW 50024, @ErrorMessage, 1;
            END
            
            SET @ReturnValue = @Id;
        END     
        -- Per sostituire un componente con un altro esistente
ELSE IF @Action = 'REPLACE_COMPONENT'
BEGIN
    -- Verifica che la distinta esista
    IF NOT EXISTS (SELECT 1 FROM dbo.MA_ProjectArticles_BillOfMaterials WHERE Id = @Id AND CompanyId = @CompanyId)
    BEGIN
        SET @ErrorCode = 43;
        SET @ErrorMessage = N'Distinta base non trovata.';
        THROW 50043, @ErrorMessage, 1;
    END

    -- Verifica che il componente da sostituire esista
    IF NOT EXISTS (SELECT 1 FROM dbo.MA_ProjectArticles_BOMComponents WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId)
    BEGIN
        SET @ErrorCode = 44;
        SET @ErrorMessage = N'Componente da sostituire non trovato.';
        THROW 50044, @ErrorMessage, 1;
    END

    -- NUOVA LOGICA DUALE: Determina se passare MainRefBOMId
    DECLARE @ReplaceMainRefBOMId BIGINT = NULL;
    DECLARE @ParentMainRefForReplace BIGINT;
    
    -- Ottieni il MainRefBOMId della BOM padre
    SELECT @ParentMainRefForReplace = ISNULL(MainRefBOMId, Id) 
    FROM MA_ProjectArticles_BillOfMaterials 
    WHERE Id = @Id AND CompanyId = @CompanyId;
    
    -- Verifica se il nuovo componente ha già versioni con questo MainRef
    IF @ComponentCode IS NOT NULL OR @ComponentId IS NOT NULL
    BEGIN
        DECLARE @CheckReplaceComponentId BIGINT;
        
        -- Ottieni l'ID del componente se esiste
        IF @ComponentId IS NOT NULL
        BEGIN
            SET @CheckReplaceComponentId = @ComponentId;
        END
        ELSE IF @ComponentCode IS NOT NULL
        BEGIN
            SELECT @CheckReplaceComponentId = Id 
            FROM dbo.MA_ProjectArticles_Items 
            WHERE Item = @ComponentCode AND CompanyId = @CompanyId;
        END
        
        -- LOGICA DUALE: Verifica se esistono versioni del componente con il MainRef del padre
        IF @CheckReplaceComponentId IS NOT NULL
        BEGIN
            IF EXISTS (
                SELECT 1 
                FROM dbo.MA_ProjectArticles_BillOfMaterials
                WHERE ItemId = @CheckReplaceComponentId 
                    AND CompanyId = @CompanyId
                    AND MainRefBOMId = @ParentMainRefForReplace
            )
            BEGIN
                -- Solo se esistono già versioni con questo MainRef, lo passiamo
                SET @ReplaceMainRefBOMId = @ParentMainRefForReplace;
            END
            -- Altrimenti @ReplaceMainRefBOMId rimane NULL (userà Version 1)
        END
    END

    -- Sincronizza il nuovo componente con la logica MainRef corretta
    DECLARE @ReplaceCompSyncErrorCode INT;
    DECLARE @ReplaceCompSyncErrorMessage NVARCHAR(4000);
    DECLARE @ReplaceCompId BIGINT;
    
    EXEC dbo.MA_ProjectArticles_SyncComponent
        @CompanyId = @CompanyId,
        @ComponentId = @ComponentId,
        @ComponentCode = @ComponentCode,
        @ComponentDescription = NULL,
        @ComponentNatureValue = NULL,
        @ComponentUoM = @ComponentUoM,
        @ImportBOM = @ImportBOM,  -- Usa il flag ImportBOM passato
        @MaxLevels = @MaxLevels,
        @ValidateBOM = 1,
        @CreateIfNotExists = 1,
        @UserId = @UserId,
        @MainRefBOMId = @ReplaceMainRefBOMId,  -- NULL o MainRef condizionale
        @ReturnComponentId = @ReplaceCompId OUTPUT,
        @ErrorCode = @ReplaceCompSyncErrorCode OUTPUT,
        @ErrorMessage = @ReplaceCompSyncErrorMessage OUTPUT;
    
    IF @ReplaceCompSyncErrorCode <> 0 OR @ReplaceCompId IS NULL
    BEGIN
        SET @ErrorCode = 45;
        SET @ErrorMessage = N'Nuovo componente non trovato o errore nella sincronizzazione: ' + @ReplaceCompSyncErrorMessage;
        SET @CreatedComponentCode = '';
        THROW 50045, @ErrorMessage, 1;
    END

    -- Recupera i dati del componente da sostituire per mantenere alcuni valori
    DECLARE @OldQuantity DECIMAL(18, 5);
    DECLARE @OldUoM VARCHAR(10);
    DECLARE @OldUnitCost FLOAT;
    DECLARE @OldTotalCost FLOAT;
    DECLARE @OldFixedCost FLOAT;

    SELECT 
        @OldQuantity = Quantity,
        @OldUoM = UoM,
        @OldUnitCost = UnitCost,
        @OldTotalCost = TotalCost,
        @OldFixedCost = FixedCost
    FROM dbo.MA_ProjectArticles_BOMComponents
    WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId;

    -- Prima eliminiamo il vecchio componente
    DELETE FROM dbo.MA_ProjectArticles_BOMComponents
    WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId;

    -- Otteniamo i dati del nuovo componente
    DECLARE @NewComponentDescription VARCHAR(128);
    DECLARE @NewComponentNature INT;
    DECLARE @NewComponentBaseUoM VARCHAR(8);
    
    SELECT 
        @NewComponentDescription = Description,
        @NewComponentNature = Nature,
        @NewComponentBaseUoM = BaseUoM
    FROM dbo.MA_ProjectArticles_Items
    WHERE Id = @ReplaceCompId AND CompanyId = @CompanyId;

    -- Poi inseriamo il nuovo componente sulla stessa linea
    INSERT INTO dbo.MA_ProjectArticles_BOMComponents (
        CompanyId, BOMId, Line, ComponentId, ComponentType, Quantity,
        UnitCost, TotalCost, FixedCost, UoM, Details, Notes, 
        TBCreated, TBCreatedId
    ) VALUES (
        @CompanyId, 
        @Id, 
        @ComponentLine, 
        @ReplaceCompId, 
        ISNULL(@ComponentType, 7798784), -- ComponentType 7798784 = Articolo
        ISNULL(@ComponentQuantity, @OldQuantity),
        ISNULL(@ComponentUnitCost, @OldUnitCost),
        ISNULL(@ComponentTotalCost, @OldTotalCost),
        ISNULL(@ComponentFixedCost, @OldFixedCost),
        ISNULL(@ComponentUoM, ISNULL(@OldUoM, @NewComponentBaseUoM)),
        ISNULL(@ComponentDetails, @NewComponentDescription),
        @ComponentNotes,
        GETDATE(), 
        @UserId
    );

    -- Assicuriamoci di impostare sempre i valori di output
    SET @ReturnValue = @Id;
    SET @ErrorCode = 0;
    SET @ErrorMessage = N'';
END



        -- Per sostituire creando un nuovo componente temporaneo
ELSE IF @Action = 'REPLACE_WITH_NEW_COMPONENT'
BEGIN
    -- Verifica se la distinta esiste
    DECLARE @DistintaEsiste BIT = 0;
    IF EXISTS (SELECT 1 FROM dbo.MA_ProjectArticles_BillOfMaterials WHERE Id = @Id AND CompanyId = @CompanyId) 
        SET @DistintaEsiste = 1;
    
    -- Se CreateTempComponent = 1, generiamo un codice temporaneo
    IF @CreateTempComponent = 1
    BEGIN
        SET @NewCompItem = dbo.GenerateTempItemCode(@CompanyId);
        
        -- Aggiunge il prefisso specifico se fornito
        IF @TempComponentPrefix IS NOT NULL AND @TempComponentPrefix <> ''
        BEGIN
            -- Assicuriamoci che il prefisso non faccia superare i 20 caratteri
            SET @NewCompItem = LEFT(@TempComponentPrefix + '_' + @NewCompItem, 20);
        END
        
        -- Impostiamo il codice del componente creato nell'output
        SET @CreatedComponentCode = @NewCompItem;
    END
    
    -- Creiamo il nuovo componente in ogni caso
    DECLARE @NewCompId BIGINT;
    SET @NewCompId = dbo.GetNextProjectArticleItemId(@CompanyId);
    
    -- Recupera informazioni dal componente originale se esiste
    DECLARE @OriginalNature INT;
    DECLARE @OriginalBaseUoM VARCHAR(3);
    DECLARE @OriginalDescription NVARCHAR(128);
    
    IF @DistintaEsiste = 1 AND @ComponentLine IS NOT NULL
    BEGIN
        SELECT 
            @OriginalNature = T1.Nature,
            @OriginalBaseUoM = T1.BaseUoM,
            @OriginalDescription = T1.Description
        FROM MA_ProjectArticles_BOMComponents T0
        JOIN MA_ProjectArticles_Items T1 ON T1.Id = T0.ComponentId
        WHERE T0.BOMId = @Id 
            AND T0.Line = @ComponentLine
            AND T0.CompanyId = @CompanyId;
    END
    
    -- Crea il nuovo componente temporaneo
    INSERT INTO dbo.MA_ProjectArticles_Items (
        Id, CompanyId, TBCreatedId, TBCreated, TBModifiedId, TBModified,
        Item, Description, Nature, BaseUoM, stato_erp
    ) 
    VALUES (
        @NewCompId,
        @CompanyId,
        @UserId,
        GETDATE(),
        @UserId,
        GETDATE(),
        @NewCompItem,
        ISNULL(@NewCompDescription, ISNULL(@OriginalDescription, 'Componente temporaneo')),
        ISNULL(@NewCompNature, ISNULL(@OriginalNature, 22413312)), -- Default semilavorato
        ISNULL(@NewCompBaseUoM, ISNULL(@OriginalBaseUoM, 'PZ')),
        0  -- stato_erp sempre 0 per componenti temporanei
    );
    
    -- NUOVA LOGICA: Crea sempre una distinta vuota per il nuovo componente
    -- MA senza MainRefBOMId (componenti temporanei iniziano sempre come Version 1)
    DECLARE @NewCompBOMId BIGINT = dbo.GetNextProjectArticleBOMId(@CompanyId);
    
    -- Ottieni informazioni sul componente da sostituire
    DECLARE @OriginalComponentId BIGINT;
    DECLARE @OriginalComponentHasBOM BIT = 0;
    DECLARE @OriginalComponentBOMId BIGINT;

    -- Ottieni l'ID del componente originale da sostituire
    IF @DistintaEsiste = 1 AND @ComponentLine IS NOT NULL
    BEGIN
        SELECT @OriginalComponentId = ComponentId
        FROM dbo.MA_ProjectArticles_BOMComponents
        WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId;

        -- Verifica se il componente originale ha una distinta base
        IF @OriginalComponentId IS NOT NULL AND @CopyBOM = 1
        BEGIN
            -- NUOVA LOGICA: Cerca sempre la Version 1 del componente originale
            SELECT TOP 1 
                @OriginalComponentHasBOM = 1, 
                @OriginalComponentBOMId = Id
            FROM dbo.MA_ProjectArticles_BillOfMaterials
            WHERE ItemId = @OriginalComponentId 
                AND CompanyId = @CompanyId
                AND Version = 1  -- SEMPRE VERSION 1 per componenti temporanei
            ORDER BY Id DESC;
        END
    END
    
    -- Verifica se esiste già una distinta per questo componente
    IF NOT EXISTS (
        SELECT 1 FROM dbo.MA_ProjectArticles_BillOfMaterials
        WHERE ItemId = @NewCompId AND CompanyId = @CompanyId
    )
    BEGIN
        -- Crea una distinta base per il nuovo componente temporaneo
        -- IMPORTANTE: MainRefBOMId = NULL per componenti temporanei
        INSERT INTO dbo.MA_ProjectArticles_BillOfMaterials (
            CompanyId, Id, BOM, Description, ItemId, Version, UoM, BOMStatus,
            ProductionLot, TBCreated, TBCreatedId, MainRefBOMId
        ) VALUES (
            @CompanyId, 
            @NewCompBOMId, 
            @NewCompItem, 
            'Distinta per ' + ISNULL(@NewCompDescription, 'componente temporaneo'), 
            @NewCompId, 
            1,  -- SEMPRE Version 1
            ISNULL(@NewCompBaseUoM, 'PZ'), 
            'BOZZA',
            1, 
            GETDATE(), 
            @UserId, 
            NULL  -- SEMPRE NULL per componenti temporanei (no MainRef)
        );
        
        -- Se il componente originale ha una distinta e @CopyBOM = 1, copiamo i contenuti
        IF @OriginalComponentHasBOM = 1 AND @CopyBOM = 1
        BEGIN
            -- Copia componenti dalla Version 1 del componente originale
            INSERT INTO dbo.MA_ProjectArticles_BOMComponents (
                CompanyId, BOMId, Line, ComponentId, ComponentType, Quantity,
                UnitCost, TotalCost, FixedCost, UoM, Details, Notes, TBCreated, TBCreatedId
            )
            SELECT 
                @CompanyId, @NewCompBOMId, Line, ComponentId, ComponentType, Quantity,
                UnitCost, TotalCost, FixedCost, UoM, Details, Notes, GETDATE(), @UserId
            FROM dbo.MA_ProjectArticles_BOMComponents
            WHERE BOMId = @OriginalComponentBOMId AND CompanyId = @CompanyId;
            
            -- Copia cicli dalla Version 1 del componente originale
            INSERT INTO dbo.MA_ProjectArticles_BOMRouting (
                CompanyId, RtgStep, BOMId, Operation, Notes, WC, ProcessingTime,
                SetupTime, NoOfProcessingWorkers, NoOfSetupWorkers, SubId, Supplier,
                Qty, TBCreated, TBModified, TBCreatedID, TBModifiedID
            )
            SELECT 
                @CompanyId, RtgStep, @NewCompBOMId, Operation, Notes, WC, ProcessingTime,
                SetupTime, NoOfProcessingWorkers, NoOfSetupWorkers, SubId, Supplier,
                Qty, GETDATE(), GETDATE(), @UserId, @UserId
            FROM dbo.MA_ProjectArticles_BOMRouting
            WHERE BOMId = @OriginalComponentBOMId AND CompanyId = @CompanyId;
        END
    END
    
    -- Se la distinta esiste, sostituiamo il componente
    IF @DistintaEsiste = 1
    BEGIN
        -- Verifica che il componente da sostituire esista
        IF NOT EXISTS (SELECT 1 FROM dbo.MA_ProjectArticles_BOMComponents 
                      WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId)
        BEGIN
            SET @ErrorCode = 54;
            SET @ErrorMessage = N'Componente da sostituire non trovato.';
            THROW 50054, @ErrorMessage, 1;
        END
        
        -- Recupera i dati del componente da sostituire per mantenere alcuni valori
        DECLARE @ReplaceQuantity DECIMAL(18, 5);
        DECLARE @ReplaceUoM VARCHAR(10);
        DECLARE @ReplaceUnitCost FLOAT;
        DECLARE @ReplaceTotalCost FLOAT;
        DECLARE @ReplaceFixedCost FLOAT;
        
        SELECT 
            @ReplaceQuantity = Quantity,
            @ReplaceUoM = UoM,
            @ReplaceUnitCost = UnitCost,
            @ReplaceTotalCost = TotalCost,
            @ReplaceFixedCost = FixedCost
        FROM dbo.MA_ProjectArticles_BOMComponents
        WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId;
        
        -- Eliminiamo il vecchio componente
        DELETE FROM dbo.MA_ProjectArticles_BOMComponents
        WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId;
        
        -- Inseriamo il nuovo componente sulla stessa linea
        INSERT INTO dbo.MA_ProjectArticles_BOMComponents (
            CompanyId, BOMId, Line, ComponentId, ComponentType, Quantity,
            UnitCost, TotalCost, FixedCost, UoM, Details, Notes, 
            TBCreated, TBCreatedId
        ) VALUES (
            @CompanyId, 
            @Id, 
            @ComponentLine, 
            @NewCompId, 
            7798784, -- ComponentType 7798784 = Articolo
            ISNULL(@ComponentQuantity, @ReplaceQuantity),
            ISNULL(@ComponentUnitCost, @ReplaceUnitCost),
            ISNULL(@ComponentTotalCost, @ReplaceTotalCost),
            ISNULL(@ComponentFixedCost, @ReplaceFixedCost),
            ISNULL(@ComponentUoM, ISNULL(@ReplaceUoM, @NewCompBaseUoM)),
            ISNULL(@ComponentDetails, @NewCompDescription),
            ISNULL(@ComponentNotes, ''),
            GETDATE(), 
            @UserId
        );
    END
    ELSE -- Se la distinta non esiste, creiamo una nuova distinta e aggiungiamo il componente
    BEGIN
        -- Crea una nuova distinta per l'articolo principale
        DECLARE @NewReplaceBOMId BIGINT = dbo.GetNextProjectArticleBOMId(@CompanyId);
        DECLARE @NewBOMCode VARCHAR(50) = 'TBOM_' + CAST(@NewReplaceBOMId AS VARCHAR(20));
        
        INSERT INTO dbo.MA_ProjectArticles_BillOfMaterials (
            CompanyId, Id, BOM, Description, ItemId, Version, UoM, BOMStatus,
            ProductionLot, TBCreated, TBCreatedId, MainRefBOMId
        ) VALUES (
            @CompanyId, 
            @NewReplaceBOMId, 
            @NewBOMCode, 
            'Distinta Automatica', 
            @ItemId,  -- ItemId dell'articolo principale, non del componente
            1,  -- Version
            ISNULL(@UoM, 'PZ'),  -- UoM dell'articolo principale
            'BOZZA',  -- BOMStatus
            1,  -- ProductionLot
            GETDATE(), 
            @UserId, 
            NULL  -- MainRefBOMId NULL per nuove distinte
        );
        
        -- Aggiungiamo il componente temporaneo alla nuova distinta
        INSERT INTO dbo.MA_ProjectArticles_BOMComponents (
            CompanyId, BOMId, Line, ComponentId, ComponentType, Quantity,
            UoM, Details, Notes, TBCreated, TBCreatedId
        ) VALUES (
            @CompanyId, 
            @NewReplaceBOMId, 
            1,  -- Line 1 per il primo componente
            @NewCompId,  -- Il nuovo componente temporaneo
            7798784,  -- ComponentType 7798784 = Articolo
            ISNULL(@ComponentQuantity, 1),  -- Default quantity 1
            ISNULL(@ComponentUoM, @NewCompBaseUoM),
            @NewCompDescription,
            ISNULL(@ComponentNotes, ''),
            GETDATE(), 
            @UserId
        );
        
        -- Aggiorniamo l'ID della distinta per il valore di ritorno
        SET @Id = @NewReplaceBOMId;
    END
    
    -- Ritorniamo l'ID della distinta (esistente o nuova)
    SET @ReturnValue = @Id;
    SET @ErrorCode = 0;
    SET @ErrorMessage = N'';
END
        
        -- Commit della transazione se è stata iniziata qui
        IF @NeedCommit = 1 AND @TranCount = 0
            COMMIT TRANSACTION;
            
    END TRY
    BEGIN CATCH
        -- Rollback della transazione se è stata iniziata qui e c'è un errore
        IF @NeedCommit = 1 AND @TranCount = 0
            ROLLBACK TRANSACTION;
        
        -- Cattura informazioni sull'errore
        SET @ErrorCode = ERROR_NUMBER();
        SET @ErrorMessage = ERROR_MESSAGE();
        
        -- Restituisci informazioni di errore
        SET @ReturnValue = 0;
    END CATCH
    
    -- Goto punto di uscita normale
    GOTO ExitPoint;
    
ErrorHandler:
    -- Gestione degli errori durante la validazione (prima della transazione)
    SET @ReturnValue = 0;
    
ExitPoint:
    -- Pulizia
    DROP TABLE IF EXISTS #ProcessedComponents;
    
    RETURN @ErrorCode;
END; 



CREATE TABLE [dbo].[AR_Companies](
	[CompanyId] [int] IDENTITY(1,1) NOT NULL,
	[CompanyCode] [varchar](50) NULL,
	[Description] [varchar](200) NOT NULL,
	[Email] [varchar](150) NULL,
	[ContactPerson] [varchar](150) NULL,
	[IsActive] [bit] NULL,
	[CreatedAt] [datetime] NULL,
	[UpdatedAt] [datetime] NULL,
	[Notes] [varchar](max) NULL,
	[Licenses] [int] NULL,
	[ExpirationDate] [date] NULL,
	[w_PrimaryColor] [varchar](100) NULL,
	[w_SecondaryColor] [varchar](100) NULL,
	[dbName] [varchar](50) NOT NULL,
	[ProjectPrefix] [varchar](5) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[CompanyId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MA_CodingRules_Aliases]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MA_CodingRules_Aliases](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[CompanyId] [int] NOT NULL,
	[TypeId] [bigint] NOT NULL,
	[Code] [varchar](5) NOT NULL,
	[Description] [nvarchar](512) NULL,
	[IsUniversal] [bit] NOT NULL,
	[IsActive] [bit] NOT NULL,
	[CreateUser] [varchar](64) NOT NULL,
	[CreateDate] [datetime] NOT NULL,
	[EditUser] [varchar](64) NOT NULL,
	[EditDate] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Aliases] UNIQUE NONCLUSTERED 
(
	[CompanyId] ASC,
	[TypeId] ASC,
	[Code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MA_CodingRules_Categories]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MA_CodingRules_Categories](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[CompanyId] [int] NOT NULL,
	[Code] [varchar](3) NOT NULL,
	[Description] [nvarchar](512) NULL,
	[Color] [varchar](25) NULL,
	[NatureCode] [varchar](8) NULL,
	[IsActive] [bit] NOT NULL,
	[CreateUser] [varchar](64) NOT NULL,
	[CreateDate] [datetime] NOT NULL,
	[EditUser] [varchar](64) NOT NULL,
	[EditDate] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_CodingCategories] UNIQUE NONCLUSTERED 
(
	[CompanyId] ASC,
	[Code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MA_CodingRules_Config]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MA_CodingRules_Config](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[CompanyId] [int] NOT NULL,
	[CodingType] [varchar](20) NOT NULL,
	[TotalLength] [int] NOT NULL,
	[SequentialLength] [int] NOT NULL,
	[SequentialPadChar] [char](1) NOT NULL,
	[IsActive] [bit] NOT NULL,
	[Config] [nvarchar](max) NULL,
	[CreateDate] [datetime] NOT NULL,
	[EditDate] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[CompanyId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MA_CodingRules_Families]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MA_CodingRules_Families](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[CompanyId] [int] NOT NULL,
	[MacroFamilyId] [bigint] NOT NULL,
	[Code] [varchar](5) NOT NULL,
	[Description] [nvarchar](512) NULL,
	[IsUniversal] [bit] NOT NULL,
	[IsActive] [bit] NOT NULL,
	[CreateUser] [varchar](64) NOT NULL,
	[CreateDate] [datetime] NOT NULL,
	[EditUser] [varchar](64) NOT NULL,
	[EditDate] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Families] UNIQUE NONCLUSTERED 
(
	[CompanyId] ASC,
	[MacroFamilyId] ASC,
	[Code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MA_CodingRules_History]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MA_CodingRules_History](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[CompanyId] [int] NOT NULL,
	[ItemId] [bigint] NOT NULL,
	[OldCode] [varchar](64) NULL,
	[NewCode] [varchar](64) NULL,
	[MacroFamilyId] [bigint] NULL,
	[FamilyId] [bigint] NULL,
	[TypeId] [bigint] NULL,
	[AliasId] [bigint] NULL,
	[Measures] [varchar](2) NULL,
	[Sequential] [int] NULL,
	[UserId] [int] NOT NULL,
	[ChangeDate] [datetime] NOT NULL,
	[ChangeReason] [nvarchar](500) NULL,
	[UseExistingArticleId] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MA_CodingRules_MacroFamilies]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MA_CodingRules_MacroFamilies](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[CompanyId] [int] NOT NULL,
	[CategoryId] [bigint] NOT NULL,
	[Code] [varchar](3) NOT NULL,
	[Description] [nvarchar](512) NULL,
	[IsUniversal] [bit] NOT NULL,
	[IsActive] [bit] NOT NULL,
	[CreateUser] [varchar](64) NOT NULL,
	[CreateDate] [datetime] NOT NULL,
	[EditUser] [varchar](64) NOT NULL,
	[EditDate] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_MacroFamilies] UNIQUE NONCLUSTERED 
(
	[CompanyId] ASC,
	[CategoryId] ASC,
	[Code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MA_CodingRules_Sequentials]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MA_CodingRules_Sequentials](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[CompanyId] [int] NOT NULL,
	[RootCode] [varchar](10) NOT NULL,
	[LastSequential] [int] NOT NULL,
	[LastUsedDate] [datetime] NULL,
	[CreateDate] [datetime] NOT NULL,
	[EditDate] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Sequentials] UNIQUE NONCLUSTERED 
(
	[CompanyId] ASC,
	[RootCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MA_CodingRules_SimplifiedConfig]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MA_CodingRules_SimplifiedConfig](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[CompanyId] [int] NOT NULL,
	[IsActive] [bit] NOT NULL,
	[CharactersToKeep] [int] NOT NULL,
	[CreateDate] [datetime] NOT NULL,
	[EditDate] [datetime] NULL,
	[CreateUser] [int] NULL,
	[EditUser] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_SimplifiedConfig_CompanyId] UNIQUE NONCLUSTERED 
(
	[CompanyId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MA_CodingRules_SimplifiedSequentials]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MA_CodingRules_SimplifiedSequentials](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[CompanyId] [int] NOT NULL,
	[Prefix] [varchar](14) NOT NULL,
	[LastSequential] [varchar](10) NOT NULL,
	[LastUsedDate] [datetime] NOT NULL,
	[CreateDate] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_SimplifiedSequentials_CompanyPrefix] UNIQUE NONCLUSTERED 
(
	[CompanyId] ASC,
	[Prefix] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MA_CodingRules_Types]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MA_CodingRules_Types](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[CompanyId] [int] NOT NULL,
	[FamilyId] [bigint] NOT NULL,
	[Code] [varchar](5) NOT NULL,
	[Description] [nvarchar](512) NULL,
	[IsUniversal] [bit] NOT NULL,
	[IsActive] [bit] NOT NULL,
	[CreateUser] [varchar](64) NOT NULL,
	[CreateDate] [datetime] NOT NULL,
	[EditUser] [varchar](64) NOT NULL,
	[EditDate] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Types] UNIQUE NONCLUSTERED 
(
	[CompanyId] ASC,
	[FamilyId] ASC,
	[Code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MA_ProjectArticles_BillOfMaterials]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MA_ProjectArticles_BillOfMaterials](
	[CompanyId] [int] NOT NULL,
	[Id] [bigint] NOT NULL,
	[BOM] [varchar](50) NOT NULL,
	[Description] [nvarchar](255) NULL,
	[ItemId] [bigint] NOT NULL,
	[Version] [int] NULL,
	[UoM] [varchar](8) NULL,
	[BOMStatus] [varchar](50) NOT NULL,
	[stato_erp] [int] NULL,
	[data_sync_erp] [datetime] NULL,
	[ProductionLot] [int] NULL,
	[RMCost] [float] NULL,
	[ProcessingCost] [float] NULL,
	[RMRefillCost] [float] NULL,
	[ProcessingRefillCost] [float] NULL,
	[TotalCost] [float] NULL,
	[TotalPrice] [float] NULL,
	[RefillWaste] [float] NULL,
	[RefillDiscount] [float] NULL,
	[TotalRefill] [float] NULL,
	[TransportRefill] [float] NULL,
	[Details] [nvarchar](max) NULL,
	[Notes] [nvarchar](max) NULL,
	[TBCreated] [datetime] NULL,
	[TBCreatedId] [int] NULL,
	[MainRefBOMId] [bigint] NULL,
	[OriginalPostgresId] [bigint] NULL,
	[LastCostingUpdatedBy] [int] NULL,
	[LastCostingUpdatedAt] [datetime2](7) NULL,
 CONSTRAINT [PK_CompanyId_Id] PRIMARY KEY CLUSTERED 
(
	[CompanyId] ASC,
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_ItemId_Version] UNIQUE NONCLUSTERED 
(
	[CompanyId] ASC,
	[ItemId] ASC,
	[Version] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MA_ProjectArticles_BOMComponents]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MA_ProjectArticles_BOMComponents](
	[CompanyId] [int] NOT NULL,
	[BOMId] [int] NOT NULL,
	[Line] [int] NOT NULL,
	[ComponentId] [int] NOT NULL,
	[ComponentType] [int] NULL,
	[Quantity] [decimal](18, 5) NULL,
	[UnitCost] [float] NULL,
	[TotalCost] [float] NULL,
	[FixedCost] [float] NULL,
	[UoM] [varchar](10) NULL,
	[Details] [nvarchar](max) NULL,
	[Notes] [nvarchar](max) NULL,
	[TBCreated] [datetime] NULL,
	[TBCreatedId] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[CompanyId] ASC,
	[BOMId] ASC,
	[Line] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MA_ProjectArticles_BOMRouting]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MA_ProjectArticles_BOMRouting](
	[CompanyId] [int] NOT NULL,
	[RtgStep] [smallint] NOT NULL,
	[BOMId] [int] NOT NULL,
	[Operation] [varchar](21) NULL,
	[Notes] [varchar](1024) NULL,
	[WC] [varchar](8) NULL,
	[ProcessingTime] [int] NULL,
	[SetupTime] [int] NULL,
	[NoOfProcessingWorkers] [smallint] NULL,
	[NoOfSetupWorkers] [smallint] NULL,
	[SubId] [int] NULL,
	[Supplier] [varchar](12) NULL,
	[Qty] [float] NULL,
	[TBCreated] [datetime] NOT NULL,
	[TBModified] [datetime] NOT NULL,
	[TBCreatedID] [int] NOT NULL,
	[TBModifiedID] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[CompanyId] ASC,
	[BOMId] ASC,
	[RtgStep] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MA_ProjectArticles_Items]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MA_ProjectArticles_Items](
	[Id] [bigint] NOT NULL,
	[CompanyId] [int] NOT NULL,
	[TBCreatedId] [int] NOT NULL,
	[TBCreated] [datetime] NOT NULL,
	[TBModifiedId] [int] NOT NULL,
	[TBModified] [datetime] NOT NULL,
	[Item] [varchar](64) NOT NULL,
	[Description] [varchar](128) NOT NULL,
	[Diameter] [float] NULL,
	[Bxh] [varchar](11) NULL,
	[Depth] [float] NULL,
	[Length] [float] NULL,
	[MediumRadius] [float] NULL,
	[Notes] [text] NULL,
	[CustomerItemReference] [varchar](64) NULL,
	[AliasId] [bigint] NULL,
	[CategoryId] [bigint] NOT NULL,
	[FamilyId] [bigint] NULL,
	[MacrofamilyId] [bigint] NULL,
	[ItemTypeId] [bigint] NULL,
	[Nature] [int] NULL,
	[StatusId] [bigint] NOT NULL,
	[fscodice] [varchar](10) NOT NULL,
	[Disabled] [int] NOT NULL,
	[data_sync_erp] [datetime] NULL,
	[stato_erp] [int] NULL,
	[DescriptionExtension] [varchar](512) NULL,
	[BaseUoM] [varchar](3) NULL,
	[offset_acquisto] [varchar](16) NULL,
	[offset_autoconsumo] [varchar](16) NULL,
	[offset_vendita] [varchar](16) NULL,
	[TempSupplierId] [varchar](12) NULL,
	[TempIntercompanyTargetId] [int] NULL,
	[TempSupplierNotes] [nvarchar](255) NULL,
 CONSTRAINT [PK_CompanyId_ItemId] PRIMARY KEY CLUSTERED 
(
	[CompanyId] ASC,
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Id_Version] UNIQUE NONCLUSTERED 
(
	[CompanyId] ASC,
	[Item] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
ALTER TABLE [dbo].[AR_Companies] ADD  DEFAULT ('') FOR [CompanyCode]
GO
ALTER TABLE [dbo].[AR_Companies] ADD  DEFAULT ('') FOR [Email]
GO
ALTER TABLE [dbo].[AR_Companies] ADD  DEFAULT ('') FOR [ContactPerson]
GO
ALTER TABLE [dbo].[AR_Companies] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[AR_Companies] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[AR_Companies] ADD  DEFAULT (getdate()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[AR_Companies] ADD  DEFAULT ((5)) FOR [Licenses]
GO
ALTER TABLE [dbo].[AR_Companies] ADD  DEFAULT ('1799-12-31') FOR [ExpirationDate]
GO
ALTER TABLE [dbo].[AR_Companies] ADD  DEFAULT ('#1b263b') FOR [w_PrimaryColor]
GO
ALTER TABLE [dbo].[AR_Companies] ADD  DEFAULT ('#1b263b') FOR [w_SecondaryColor]
GO
ALTER TABLE [dbo].[AR_Companies] ADD  DEFAULT ('') FOR [dbName]
GO
ALTER TABLE [dbo].[AR_Companies] ADD  DEFAULT ('') FOR [ProjectPrefix]
GO
ALTER TABLE [dbo].[MA_CodingRules_Aliases] ADD  DEFAULT ((0)) FOR [IsUniversal]
GO
ALTER TABLE [dbo].[MA_CodingRules_Aliases] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[MA_CodingRules_Aliases] ADD  DEFAULT ('SYSTEM') FOR [CreateUser]
GO
ALTER TABLE [dbo].[MA_CodingRules_Aliases] ADD  DEFAULT (getdate()) FOR [CreateDate]
GO
ALTER TABLE [dbo].[MA_CodingRules_Aliases] ADD  DEFAULT ('SYSTEM') FOR [EditUser]
GO
ALTER TABLE [dbo].[MA_CodingRules_Aliases] ADD  DEFAULT (getdate()) FOR [EditDate]
GO
ALTER TABLE [dbo].[MA_CodingRules_Categories] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[MA_CodingRules_Categories] ADD  DEFAULT ('SYSTEM') FOR [CreateUser]
GO
ALTER TABLE [dbo].[MA_CodingRules_Categories] ADD  DEFAULT (getdate()) FOR [CreateDate]
GO
ALTER TABLE [dbo].[MA_CodingRules_Categories] ADD  DEFAULT ('SYSTEM') FOR [EditUser]
GO
ALTER TABLE [dbo].[MA_CodingRules_Categories] ADD  DEFAULT (getdate()) FOR [EditDate]
GO
ALTER TABLE [dbo].[MA_CodingRules_Config] ADD  DEFAULT ('0') FOR [SequentialPadChar]
GO
ALTER TABLE [dbo].[MA_CodingRules_Config] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[MA_CodingRules_Config] ADD  DEFAULT (getdate()) FOR [CreateDate]
GO
ALTER TABLE [dbo].[MA_CodingRules_Config] ADD  DEFAULT (getdate()) FOR [EditDate]
GO
ALTER TABLE [dbo].[MA_CodingRules_Families] ADD  DEFAULT ((0)) FOR [IsUniversal]
GO
ALTER TABLE [dbo].[MA_CodingRules_Families] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[MA_CodingRules_Families] ADD  DEFAULT ('SYSTEM') FOR [CreateUser]
GO
ALTER TABLE [dbo].[MA_CodingRules_Families] ADD  DEFAULT (getdate()) FOR [CreateDate]
GO
ALTER TABLE [dbo].[MA_CodingRules_Families] ADD  DEFAULT ('SYSTEM') FOR [EditUser]
GO
ALTER TABLE [dbo].[MA_CodingRules_Families] ADD  DEFAULT (getdate()) FOR [EditDate]
GO
ALTER TABLE [dbo].[MA_CodingRules_History] ADD  DEFAULT (getdate()) FOR [ChangeDate]
GO
ALTER TABLE [dbo].[MA_CodingRules_MacroFamilies] ADD  DEFAULT ((0)) FOR [IsUniversal]
GO
ALTER TABLE [dbo].[MA_CodingRules_MacroFamilies] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[MA_CodingRules_MacroFamilies] ADD  DEFAULT ('SYSTEM') FOR [CreateUser]
GO
ALTER TABLE [dbo].[MA_CodingRules_MacroFamilies] ADD  DEFAULT (getdate()) FOR [CreateDate]
GO
ALTER TABLE [dbo].[MA_CodingRules_MacroFamilies] ADD  DEFAULT ('SYSTEM') FOR [EditUser]
GO
ALTER TABLE [dbo].[MA_CodingRules_MacroFamilies] ADD  DEFAULT (getdate()) FOR [EditDate]
GO
ALTER TABLE [dbo].[MA_CodingRules_Sequentials] ADD  DEFAULT ((0)) FOR [LastSequential]
GO
ALTER TABLE [dbo].[MA_CodingRules_Sequentials] ADD  DEFAULT (getdate()) FOR [CreateDate]
GO
ALTER TABLE [dbo].[MA_CodingRules_Sequentials] ADD  DEFAULT (getdate()) FOR [EditDate]
GO
ALTER TABLE [dbo].[MA_CodingRules_SimplifiedConfig] ADD  DEFAULT ((0)) FOR [IsActive]
GO
ALTER TABLE [dbo].[MA_CodingRules_SimplifiedConfig] ADD  DEFAULT ((7)) FOR [CharactersToKeep]
GO
ALTER TABLE [dbo].[MA_CodingRules_SimplifiedConfig] ADD  DEFAULT (getdate()) FOR [CreateDate]
GO
ALTER TABLE [dbo].[MA_CodingRules_SimplifiedSequentials] ADD  DEFAULT ('000') FOR [LastSequential]
GO
ALTER TABLE [dbo].[MA_CodingRules_SimplifiedSequentials] ADD  DEFAULT (getdate()) FOR [LastUsedDate]
GO
ALTER TABLE [dbo].[MA_CodingRules_SimplifiedSequentials] ADD  DEFAULT (getdate()) FOR [CreateDate]
GO
ALTER TABLE [dbo].[MA_CodingRules_Types] ADD  DEFAULT ((0)) FOR [IsUniversal]
GO
ALTER TABLE [dbo].[MA_CodingRules_Types] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[MA_CodingRules_Types] ADD  DEFAULT ('SYSTEM') FOR [CreateUser]
GO
ALTER TABLE [dbo].[MA_CodingRules_Types] ADD  DEFAULT (getdate()) FOR [CreateDate]
GO
ALTER TABLE [dbo].[MA_CodingRules_Types] ADD  DEFAULT ('SYSTEM') FOR [EditUser]
GO
ALTER TABLE [dbo].[MA_CodingRules_Types] ADD  DEFAULT (getdate()) FOR [EditDate]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BillOfMaterials] ADD  DEFAULT ((1)) FOR [Version]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BillOfMaterials] ADD  DEFAULT ('BOZZA') FOR [BOMStatus]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BillOfMaterials] ADD  DEFAULT ((0)) FOR [stato_erp]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BillOfMaterials] ADD  DEFAULT ((1)) FOR [ProductionLot]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BillOfMaterials] ADD  DEFAULT ((0)) FOR [RMCost]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BillOfMaterials] ADD  DEFAULT ((0)) FOR [ProcessingCost]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BillOfMaterials] ADD  DEFAULT ((0)) FOR [RMRefillCost]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BillOfMaterials] ADD  DEFAULT ((0)) FOR [ProcessingRefillCost]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BillOfMaterials] ADD  DEFAULT ((0)) FOR [TotalCost]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BillOfMaterials] ADD  DEFAULT ((0)) FOR [TotalPrice]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BillOfMaterials] ADD  DEFAULT ((0)) FOR [RefillWaste]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BillOfMaterials] ADD  DEFAULT ((0)) FOR [RefillDiscount]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BillOfMaterials] ADD  DEFAULT ((0)) FOR [TotalRefill]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BillOfMaterials] ADD  DEFAULT ((0)) FOR [TransportRefill]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BillOfMaterials] ADD  DEFAULT (getdate()) FOR [TBCreated]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BillOfMaterials] ADD  DEFAULT ((0)) FOR [TBCreatedId]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BOMComponents] ADD  DEFAULT ((0)) FOR [UnitCost]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BOMComponents] ADD  DEFAULT ((0)) FOR [TotalCost]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BOMComponents] ADD  DEFAULT ((0)) FOR [FixedCost]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BOMComponents] ADD  DEFAULT (getdate()) FOR [TBCreated]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BOMComponents] ADD  DEFAULT ((0)) FOR [TBCreatedId]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BOMRouting] ADD  DEFAULT ((0)) FOR [CompanyId]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BOMRouting] ADD  DEFAULT (getdate()) FOR [TBCreated]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BOMRouting] ADD  DEFAULT (getdate()) FOR [TBModified]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BOMRouting] ADD  DEFAULT ((0)) FOR [TBCreatedID]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_BOMRouting] ADD  DEFAULT ((0)) FOR [TBModifiedID]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ((0)) FOR [TBCreatedId]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT (getdate()) FOR [TBCreated]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ((0)) FOR [TBModifiedId]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT (getdate()) FOR [TBModified]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ('') FOR [Description]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ((0)) FOR [Diameter]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ('') FOR [Bxh]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ((0)) FOR [Depth]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ((0)) FOR [Length]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ((0)) FOR [MediumRadius]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ('') FOR [Notes]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ('') FOR [CustomerItemReference]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ((0)) FOR [AliasId]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ((0)) FOR [CategoryId]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ((0)) FOR [FamilyId]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ((0)) FOR [MacrofamilyId]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ((0)) FOR [ItemTypeId]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ((22413312)) FOR [Nature]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ((0)) FOR [StatusId]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ('') FOR [fscodice]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ((0)) FOR [Disabled]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ((0)) FOR [stato_erp]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ('') FOR [DescriptionExtension]
GO
ALTER TABLE [dbo].[MA_ProjectArticles_Items] ADD  DEFAULT ('PZ') FOR [BaseUoM]
GO
ALTER TABLE [dbo].[MA_CodingRules_Aliases]  WITH CHECK ADD  CONSTRAINT [FK_Aliases_Type] FOREIGN KEY([TypeId])
REFERENCES [dbo].[MA_CodingRules_Types] ([Id])
GO
ALTER TABLE [dbo].[MA_CodingRules_Aliases] CHECK CONSTRAINT [FK_Aliases_Type]
GO
ALTER TABLE [dbo].[MA_CodingRules_Families]  WITH CHECK ADD  CONSTRAINT [FK_Families_MacroFamily] FOREIGN KEY([MacroFamilyId])
REFERENCES [dbo].[MA_CodingRules_MacroFamilies] ([Id])
GO
ALTER TABLE [dbo].[MA_CodingRules_Families] CHECK CONSTRAINT [FK_Families_MacroFamily]
GO
ALTER TABLE [dbo].[MA_CodingRules_MacroFamilies]  WITH CHECK ADD  CONSTRAINT [FK_MacroFamilies_Category] FOREIGN KEY([CategoryId])
REFERENCES [dbo].[MA_CodingRules_Categories] ([Id])
GO
ALTER TABLE [dbo].[MA_CodingRules_MacroFamilies] CHECK CONSTRAINT [FK_MacroFamilies_Category]
GO
ALTER TABLE [dbo].[MA_CodingRules_SimplifiedConfig]  WITH CHECK ADD  CONSTRAINT [FK_SimplifiedConfig_Company] FOREIGN KEY([CompanyId])
REFERENCES [dbo].[AR_Companies] ([CompanyId])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[MA_CodingRules_SimplifiedConfig] CHECK CONSTRAINT [FK_SimplifiedConfig_Company]
GO
ALTER TABLE [dbo].[MA_CodingRules_SimplifiedSequentials]  WITH CHECK ADD  CONSTRAINT [FK_SimplifiedSequentials_Company] FOREIGN KEY([CompanyId])
REFERENCES [dbo].[AR_Companies] ([CompanyId])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[MA_CodingRules_SimplifiedSequentials] CHECK CONSTRAINT [FK_SimplifiedSequentials_Company]
GO
ALTER TABLE [dbo].[MA_CodingRules_Types]  WITH CHECK ADD  CONSTRAINT [FK_Types_Family] FOREIGN KEY([FamilyId])
REFERENCES [dbo].[MA_CodingRules_Families] ([Id])
GO
ALTER TABLE [dbo].[MA_CodingRules_Types] CHECK CONSTRAINT [FK_Types_Family]
GO
ALTER TABLE [dbo].[MA_CodingRules_SimplifiedConfig]  WITH CHECK ADD  CONSTRAINT [CK_SimplifiedConfig_CharactersToKeep] CHECK  (([CharactersToKeep]>=(1) AND [CharactersToKeep]<=(14)))
GO
ALTER TABLE [dbo].[MA_CodingRules_SimplifiedConfig] CHECK CONSTRAINT [CK_SimplifiedConfig_CharactersToKeep]
GO
/****** Object:  StoredProcedure [dbo].[MA_CodingRules_ApplyBatch]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ===============================================================================
-- MODIFICA della Stored Procedure MA_CodingRules_ApplyBatch
-- Aggiunge la chiamata per aggiornare le referenze Intercompany
-- ===============================================================================

CREATE PROCEDURE [dbo].[MA_CodingRules_ApplyBatch]
    @CompanyId INT,
    @UserId INT,
    @Items MA_CodingRules_ItemsToRecode READONLY,
    @SuccessCount INT OUTPUT,
    @ErrorCount INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Inizializza contatori
    SET @SuccessCount = 0;
    SET @ErrorCount = 0;

    DECLARE @TempResults TABLE (
        ItemId BIGINT,
        Success BIT,
        ErrorMessage NVARCHAR(500)
    );

    DECLARE @ItemId BIGINT;
    DECLARE @OldCode VARCHAR(64);
    DECLARE @NewCode VARCHAR(64);
    DECLARE @NewDescription NVARCHAR(128);
    DECLARE @MacroFamilyId BIGINT;
    DECLARE @FamilyId BIGINT;
    DECLARE @TypeId BIGINT;
    DECLARE @AliasId BIGINT;
    DECLARE @Measures VARCHAR(2);
    DECLARE @Sequential INT;
    DECLARE @UseExistingArticleId BIGINT;
    DECLARE @ReplaceWithExisting BIT;
    DECLARE @IntercompanyUpdatedCount INT; -- NUOVO: contatore per referenze Intercompany

    DECLARE item_cursor CURSOR FOR
    SELECT
        ItemId,
        OldCode,
        NewCode,
        NewDescription,
        MacroFamilyId,
        FamilyId,
        TypeId,
        AliasId,
        Measures,
        Sequential,
        UseExistingArticleId,
        ReplaceWithExisting
    FROM @Items;

    OPEN item_cursor;
    FETCH NEXT FROM item_cursor INTO
        @ItemId, @OldCode, @NewCode, @NewDescription,
        @MacroFamilyId, @FamilyId, @TypeId, @AliasId,
        @Measures, @Sequential, @UseExistingArticleId, @ReplaceWithExisting;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        BEGIN TRY
            BEGIN TRANSACTION;

            -- Debug
            PRINT 'Processing ItemId: ' + CAST(@ItemId AS VARCHAR) +
                  ', ReplaceWithExisting: ' + CAST(ISNULL(@ReplaceWithExisting, 0) AS VARCHAR) +
                  ', UseExistingArticleId: ' + CAST(ISNULL(@UseExistingArticleId, 0) AS VARCHAR);

            -- Se stiamo sostituendo con un articolo esistente
            IF @ReplaceWithExisting = 1 AND @UseExistingArticleId IS NOT NULL
            BEGIN
                PRINT 'Replacing with existing article ID: ' + CAST(@UseExistingArticleId AS VARCHAR);

                -- 1. Aggiorna tutti i componenti in distinta che puntano a questo articolo
                UPDATE MA_ProjectArticles_BOMComponents
                SET ComponentId = @UseExistingArticleId
                WHERE ComponentId = @ItemId
                AND CompanyId = @CompanyId;

                PRINT 'BOMComponents updated: ' + CAST(@@ROWCOUNT AS VARCHAR);

                -- 2. Aggiorna l'associazione progetti-articoli
                UPDATE MA_ProjectsItems
                SET ItemId = @UseExistingArticleId
                WHERE ItemId = @ItemId
                AND CompanyId = @CompanyId;

                PRINT 'ProjectsItems updated: ' + CAST(@@ROWCOUNT AS VARCHAR);

                -- 3. Disabilita l'articolo vecchio (non lo eliminiamo per mantenere lo storico)
                UPDATE MA_ProjectArticles_Items
                SET Disabled = 1,
                    TBModified = GETDATE(),
                    TBModifiedId = @UserId
                WHERE Id = @ItemId
                AND CompanyId = @CompanyId;

                PRINT 'Item disabled: ' + CAST(@@ROWCOUNT AS VARCHAR);

                -- NUOVO: 4. Aggiorna referenze Intercompany
                SET @IntercompanyUpdatedCount = 0;
                EXEC MA_UpdateIntercompanyReferencesAfterRecoding
                    @ItemId = @ItemId,
                    @OldCode = @OldCode,
                    @NewCode = @NewCode,
                    @CompanyId = @CompanyId,
                    @UserId = @UserId,
                    @UpdatedCount = @IntercompanyUpdatedCount OUTPUT;
            END
            ELSE
            BEGIN
                PRINT 'Normal recoding from ' + @OldCode + ' to ' + @NewCode;

                -- Prima verifica se il nuovo codice è già in uso
                IF EXISTS (
                    SELECT 1 FROM MA_ProjectArticles_Items
                    WHERE Item = @NewCode
                    AND CompanyId = @CompanyId
                    AND Id != @ItemId
                    AND Disabled = 0
                )
                BEGIN
                    -- Il codice è già in uso, trova il prossimo sequenziale libero
                    DECLARE @BaseCode VARCHAR(12) = LEFT(@NewCode, 12); -- Primi 12 caratteri (senza sequenziale)
                    DECLARE @NextSeq INT = 1;
                    DECLARE @TestCode VARCHAR(64);

                    WHILE 1 = 1
                    BEGIN
                        SET @TestCode = @BaseCode + RIGHT('000' + CAST(@NextSeq AS VARCHAR), 3);

                        IF NOT EXISTS (
                            SELECT 1 FROM MA_ProjectArticles_Items
                            WHERE Item = @TestCode
                            AND CompanyId = @CompanyId
                            AND Disabled = 0
                        )
                        BEGIN
                            SET @NewCode = @TestCode;
                            BREAK;
                        END

                        SET @NextSeq = @NextSeq + 1;

                        -- Sicurezza: evita loop infiniti
                        IF @NextSeq > 999
                        BEGIN
                            RAISERROR('Impossibile trovare un codice libero', 16, 1);
                        END
                    END
                END

                -- Aggiorna il codice articolo
                UPDATE MA_ProjectArticles_Items
                SET Item = @NewCode,
                    Description = ISNULL(@NewDescription, Description),
                    MacrofamilyId = ISNULL(@MacroFamilyId, MacrofamilyId),
                    FamilyId = ISNULL(@FamilyId, FamilyId),
                    ItemTypeId = ISNULL(@TypeId, ItemTypeId),
                    AliasId = ISNULL(@AliasId, AliasId),
                    TBModified = GETDATE(),
                    TBModifiedId = @UserId
                WHERE Id = @ItemId
                AND CompanyId = @CompanyId;

                PRINT 'Item updated: ' + CAST(@@ROWCOUNT AS VARCHAR);

                -- Aggiorna anche il codice BOM dove questo articolo è il principale
                UPDATE MA_ProjectArticles_BillOfMaterials
                SET BOM = @NewCode, Description = @NewDescription
                WHERE ItemId = @ItemId
                AND CompanyId = @CompanyId;

                PRINT 'BOM code updated: ' + CAST(@@ROWCOUNT AS VARCHAR);

                -- NUOVO: Aggiorna referenze Intercompany
                SET @IntercompanyUpdatedCount = 0;
                EXEC MA_UpdateIntercompanyReferencesAfterRecoding
                    @ItemId = @ItemId,
                    @OldCode = @OldCode,
                    @NewCode = @NewCode,
                    @CompanyId = @CompanyId,
                    @UserId = @UserId,
                    @UpdatedCount = @IntercompanyUpdatedCount OUTPUT;
            END

            COMMIT TRANSACTION;

            SET @SuccessCount = @SuccessCount + 1;

            INSERT INTO @TempResults (ItemId, Success, ErrorMessage)
            VALUES (@ItemId, 1, NULL);

        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            INSERT INTO @TempResults (ItemId, Success, ErrorMessage)
            VALUES (@ItemId, 0, ERROR_MESSAGE());

            SET @ErrorCount = @ErrorCount + 1;

            PRINT 'Error: ' + ERROR_MESSAGE();
        END CATCH

        FETCH NEXT FROM item_cursor INTO
            @ItemId, @OldCode, @NewCode, @NewDescription,
            @MacroFamilyId, @FamilyId, @TypeId, @AliasId,
            @Measures, @Sequential, @UseExistingArticleId, @ReplaceWithExisting;
    END

    CLOSE item_cursor;
    DEALLOCATE item_cursor;

    -- Log nella history solo i successi
    INSERT INTO MA_CodingRules_History (
        CompanyId, ItemId, OldCode, NewCode,
        MacroFamilyId, FamilyId, TypeId, AliasId, Measures, Sequential,
        UserId, ChangeDate, ChangeReason
    )
    SELECT
        @CompanyId,
        CASE
            WHEN i.ReplaceWithExisting = 1 THEN i.UseExistingArticleId
            ELSE i.ItemId
        END,
        i.OldCode,
        CASE
            WHEN i.ReplaceWithExisting = 1 THEN
                (SELECT Item FROM MA_ProjectArticles_Items WHERE Id = i.UseExistingArticleId AND CompanyId = @CompanyId)
            ELSE i.NewCode
        END,
        i.MacroFamilyId,
        i.FamilyId,
        i.TypeId,
        i.AliasId,
        i.Measures,
        i.Sequential,
        @UserId,
        GETDATE(),
        CASE
            WHEN i.ReplaceWithExisting = 1 THEN 'Articolo ' + i.OldCode + ' sostituito con articolo esistente ID: ' + CAST(i.UseExistingArticleId AS VARCHAR)
            ELSE 'Ricodifica batch da ' + i.OldCode + ' a ' + i.NewCode
        END
        -- NUOVO: Aggiunge info sulle referenze Intercompany se aggiornate
        + CASE
            WHEN ISNULL(@IntercompanyUpdatedCount, 0) > 0
            THEN ' (Aggiornate ' + CAST(@IntercompanyUpdatedCount AS VARCHAR) + ' referenze Intercompany)'
            ELSE ''
        END
    FROM @Items i
    JOIN @TempResults r ON i.ItemId = r.ItemId
    WHERE r.Success = 1;

    PRINT 'Final counts - Success: ' + CAST(@SuccessCount AS VARCHAR) + ', Errors: ' + CAST(@ErrorCount AS VARCHAR);

    -- Ritorna i risultati dettagliati
    SELECT
        i.ItemId,
        i.OldCode,
        CASE
            WHEN i.ReplaceWithExisting = 1 THEN
                (SELECT Item FROM MA_ProjectArticles_Items WHERE Id = i.UseExistingArticleId AND CompanyId = @CompanyId)
            ELSE i.NewCode
        END AS NewCode,
        r.Success,
        r.ErrorMessage
    FROM @Items i
    JOIN @TempResults r ON i.ItemId = r.ItemId
    ORDER BY r.Success DESC, i.ItemId;

END
GO
/****** Object:  StoredProcedure [dbo].[MA_CodingRules_ApplySimplifiedBatch]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[MA_CodingRules_ApplySimplifiedBatch]
    @CompanyId INT,
    @UserId INT,
    @Items MA_CodingRules_ItemsToRecode READONLY,
    @SuccessCount INT OUTPUT,
    @ErrorCount INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ItemId BIGINT;
    DECLARE @OldCode VARCHAR(64);
    DECLARE @NewCode VARCHAR(64);
    DECLARE @NewDescription NVARCHAR(128);
    DECLARE @MacroFamilyId BIGINT;
    DECLARE @FamilyId BIGINT;
    DECLARE @TypeId BIGINT;
    DECLARE @AliasId BIGINT;
    DECLARE @CategoryId BIGINT;
    DECLARE @UseExistingArticleId BIGINT;
    DECLARE @ReplaceWithExisting BIT;
    DECLARE @ErrorMessage NVARCHAR(500);
    DECLARE @ExistingCode VARCHAR(64);

    -- Tabella temporanea per errori
    CREATE TABLE #Errors (
        ItemId BIGINT,
        OldCode VARCHAR(64),
        ErrorMessage NVARCHAR(500)
    );

    SET @SuccessCount = 0;
    SET @ErrorCount = 0;

    -- Cursor per iterare items
    DECLARE item_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT
            ItemId,
            OldCode,
            NewCode,
            NewDescription,
            MacroFamilyId,
            FamilyId,
            TypeId,
            AliasId,
            UseExistingArticleId,
            ReplaceWithExisting
        FROM @Items;

    OPEN item_cursor;

    FETCH NEXT FROM item_cursor INTO
        @ItemId, @OldCode, @NewCode, @NewDescription,
        @MacroFamilyId, @FamilyId, @TypeId, @AliasId,
        @UseExistingArticleId, @ReplaceWithExisting;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        BEGIN TRANSACTION;
        BEGIN TRY
            -- MODALITÀ 1: Sostituisci con articolo esistente
            IF @ReplaceWithExisting = 1 AND @UseExistingArticleId IS NOT NULL
            BEGIN
                -- Aggiorna riferimenti nei componenti BOM
                UPDATE MA_ProjectArticles_BOMComponents
                SET ComponentId = @UseExistingArticleId
                WHERE CompanyId = @CompanyId
                    AND ComponentId = @ItemId;

                -- Aggiorna riferimenti in progetti
                UPDATE MA_ProjectsItems
                SET ItemId = @UseExistingArticleId
                WHERE CompanyId = @CompanyId
                    AND ItemId = @ItemId;

                -- Disabilita articolo vecchio
                UPDATE MA_ProjectArticles_Items
                SET Disabled = 1
                WHERE CompanyId = @CompanyId
                    AND Id = @ItemId;

                -- Log in history
                INSERT INTO MA_CodingRules_History (
                    CompanyId, ItemId, OldCode, NewCode,
                    UseExistingArticleId, UserId, ChangeDate, ChangeReason
                )
                VALUES (
                    @CompanyId, @ItemId, @OldCode, @NewCode,
                    @UseExistingArticleId, @UserId, GETDATE(), 'Simplified Logic - Replace with existing'
                );
            END
            -- MODALITÀ 2: Ricodifica normale
            ELSE
            BEGIN
                -- Verifica unicità codice
                SELECT @ExistingCode = Item
                FROM MA_ProjectArticles_Items
                WHERE CompanyId = @CompanyId
                    AND Item = @NewCode
                    AND Id != @ItemId;

                IF @ExistingCode IS NOT NULL
                BEGIN
                    SET @ErrorMessage = 'Codice già esistente: ' + @NewCode;
                    INSERT INTO #Errors (ItemId, OldCode, ErrorMessage)
                    VALUES (@ItemId, @OldCode, @ErrorMessage);

                    ROLLBACK TRANSACTION;
                    SET @ErrorCount = @ErrorCount + 1;

                    FETCH NEXT FROM item_cursor INTO
                        @ItemId, @OldCode, @NewCode, @NewDescription,
                        @MacroFamilyId, @FamilyId, @TypeId, @AliasId,
                        @UseExistingArticleId, @ReplaceWithExisting;
                    CONTINUE;
                END

                -- Aggiorna articolo
                UPDATE MA_ProjectArticles_Items
                SET
                    Item = @NewCode,
                    Description = ISNULL(@NewDescription, Description),
                    MacrofamilyId = ISNULL(@MacroFamilyId, MacrofamilyId),
                    FamilyId = ISNULL(@FamilyId, FamilyId),
                    ItemTypeId = ISNULL(@TypeId, ItemTypeId),
                    AliasId = ISNULL(@AliasId, AliasId)
                WHERE CompanyId = @CompanyId
                    AND Id = @ItemId;

                -- Aggiorna BOM header se è root
                UPDATE MA_ProjectArticles_BillOfMaterials
                SET BOM = 'BOM_' + @NewCode
                WHERE CompanyId = @CompanyId
                    AND ItemId = @ItemId;

                -- Log in history
                INSERT INTO MA_CodingRules_History (
                    CompanyId, ItemId, OldCode, NewCode,
                    MacroFamilyId, FamilyId, TypeId, AliasId,
                    UserId, ChangeDate, ChangeReason
                )
                VALUES (
                    @CompanyId, @ItemId, @OldCode, @NewCode,
                    @MacroFamilyId, @FamilyId, @TypeId, @AliasId,
                    @UserId, GETDATE(), 'Simplified Logic - Batch recoding'
                );
            END

            COMMIT TRANSACTION;
            SET @SuccessCount = @SuccessCount + 1;

        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            SET @ErrorMessage = ERROR_MESSAGE();
            INSERT INTO #Errors (ItemId, OldCode, ErrorMessage)
            VALUES (@ItemId, @OldCode, @ErrorMessage);

            SET @ErrorCount = @ErrorCount + 1;
        END CATCH

        FETCH NEXT FROM item_cursor INTO
            @ItemId, @OldCode, @NewCode, @NewDescription,
            @MacroFamilyId, @FamilyId, @TypeId, @AliasId,
            @UseExistingArticleId, @ReplaceWithExisting;
    END

    CLOSE item_cursor;
    DEALLOCATE item_cursor;

    -- Restituisce errori
    SELECT * FROM #Errors;

    DROP TABLE #Errors;
END
GO
/****** Object:  StoredProcedure [dbo].[MA_CodingRules_GenerateSimplifiedPreview]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[MA_CodingRules_GenerateSimplifiedPreview]
    @CompanyId INT,
    @OriginalCode VARCHAR(64),
    @CharactersToKeep INT,
    @PreviewCode VARCHAR(64) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Prefix VARCHAR(14);
    DECLARE @ZeroPadding VARCHAR(14);
    DECLARE @NextSequential VARCHAR(10);
    DECLARE @TotalLength INT = 15;

    -- Estrai prefisso (primi N caratteri)
    SET @Prefix = LEFT(@OriginalCode, @CharactersToKeep);

    -- Calcola quanti zeri servono per arrivare a lunghezza totale - spazio per sequenziale
    DECLARE @ZeroLength INT = @TotalLength - @CharactersToKeep;

    -- Ottieni prossimo sequenziale per questo prefisso
    EXEC MA_CodingRules_GetNextSimplifiedSequential
        @CompanyId = @CompanyId,
        @Prefix = @Prefix,
        @NextSequential = @NextSequential OUTPUT;

    -- Calcola padding zeri
    SET @ZeroPadding = REPLICATE('0', @ZeroLength - LEN(@NextSequential));

    -- Costruisci codice finale
    SET @PreviewCode = @Prefix + @ZeroPadding + @NextSequential;
END
GO
/****** Object:  StoredProcedure [dbo].[MA_CodingRules_GetHierarchy]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 1. SP per ottenere la gerarchia completa
CREATE PROCEDURE [dbo].[MA_CodingRules_GetHierarchy]
    @CompanyId INT,
    @CategoryId BIGINT = NULL,
    @MacroFamilyId BIGINT = NULL,
    @FamilyId BIGINT = NULL,
    @TypeId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Se specificato CategoryId, ritorna macrofamiglie
    IF @CategoryId IS NOT NULL
    BEGIN
        SELECT Id, Code, Description, IsUniversal
        FROM MA_CodingRules_MacroFamilies
        WHERE CompanyId = @CompanyId 
        AND CategoryId = @CategoryId
        AND IsActive = 1
        ORDER BY Code;
        RETURN;
    END
    
    -- Se specificato MacroFamilyId, ritorna famiglie
    IF @MacroFamilyId IS NOT NULL
    BEGIN
        SELECT Id, Code, Description, IsUniversal
        FROM MA_CodingRules_Families
        WHERE CompanyId = @CompanyId 
        AND MacroFamilyId = @MacroFamilyId
        AND IsActive = 1
        ORDER BY Code;
        RETURN;
    END
    
    -- Se specificato FamilyId, ritorna tipi
    IF @FamilyId IS NOT NULL
    BEGIN
        SELECT Id, Code, Description, IsUniversal
        FROM MA_CodingRules_Types
        WHERE CompanyId = @CompanyId 
        AND FamilyId = @FamilyId
        AND IsActive = 1
        ORDER BY Code;
        RETURN;
    END
    
    -- Se specificato TypeId, ritorna alias
    IF @TypeId IS NOT NULL
    BEGIN
        SELECT Id, Code, Description, IsUniversal
        FROM MA_CodingRules_Aliases
        WHERE CompanyId = @CompanyId 
        AND TypeId = @TypeId
        AND IsActive = 1
        ORDER BY Code;
        RETURN;
    END
    
    -- Altrimenti ritorna categorie
    SELECT Id, Code, Description, Color, NatureCode
    FROM MA_CodingRules_Categories
    WHERE CompanyId = @CompanyId
    AND IsActive = 1
    ORDER BY Code;
END
GO
/****** Object:  StoredProcedure [dbo].[MA_CodingRules_GetNextSequential]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 3. Aggiorna anche la stored procedure per riflettere il cambio
CREATE PROCEDURE [dbo].[MA_CodingRules_GetNextSequential]
    @CompanyId INT,
    @MacroFamilyCode VARCHAR(1),
    @FamilyCode VARCHAR(3),
    @TypeCode VARCHAR(3),
    @AliasCode VARCHAR(3),
    @NextSequential INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- RootCode ora può essere fino a 10 caratteri
    DECLARE @RootCode VARCHAR(10) = @MacroFamilyCode + @FamilyCode + @TypeCode + @AliasCode;
    DECLARE @CurrentSeq INT;
    
    BEGIN TRANSACTION;
    
    -- Ottieni il sequenziale corrente con lock
    SELECT @CurrentSeq = LastSequential
    FROM MA_CodingRules_Sequentials WITH (UPDLOCK)
    WHERE CompanyId = @CompanyId AND RootCode = @RootCode;
    
    IF @CurrentSeq IS NULL
    BEGIN
        -- Primo sequenziale per questa radice
        SET @NextSequential = 1;
        
        INSERT INTO MA_CodingRules_Sequentials 
            (CompanyId, RootCode, LastSequential, LastUsedDate)
        VALUES 
            (@CompanyId, @RootCode, @NextSequential, GETDATE());
    END
    ELSE
    BEGIN
        -- Incrementa sequenziale
        SET @NextSequential = @CurrentSeq + 1;
        
        UPDATE MA_CodingRules_Sequentials
        SET LastSequential = @NextSequential,
            LastUsedDate = GETDATE(),
            EditDate = GETDATE()
        WHERE CompanyId = @CompanyId AND RootCode = @RootCode;
    END
    
    COMMIT TRANSACTION;
END
GO
/****** Object:  StoredProcedure [dbo].[MA_CodingRules_GetNextSimplifiedSequential]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[MA_CodingRules_GetNextSimplifiedSequential]
    @CompanyId INT,
    @Prefix VARCHAR(14),
    @NextSequential VARCHAR(10) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CurrentSequential VARCHAR(10);
    DECLARE @NumericPart INT;
    DECLARE @AlphaPart CHAR(1);
    DECLARE @NewSequential VARCHAR(10);

    BEGIN TRANSACTION;
    BEGIN TRY
        -- Ottieni sequenziale corrente con lock
        SELECT @CurrentSequential = LastSequential
        FROM MA_CodingRules_SimplifiedSequentials WITH (UPDLOCK, ROWLOCK)
        WHERE CompanyId = @CompanyId AND Prefix = @Prefix;

        -- Se non esiste, inizializza a 000
        IF @CurrentSequential IS NULL
        BEGIN
            SET @NewSequential = '000';

            INSERT INTO MA_CodingRules_SimplifiedSequentials
                (CompanyId, Prefix, LastSequential, LastUsedDate)
            VALUES
                (@CompanyId, @Prefix, @NewSequential, GETDATE());
        END
        ELSE
        BEGIN
            -- Logica incremento sequenziale
            -- Formati supportati:
            -- 000-999 (numerico puro)
            -- A00-A99, B00-B99... Z99 (lettera + due cifre)
            -- 0000-9999... (overflow numerico)

            -- Controlla se è formato numerico puro (000-999)
            IF @CurrentSequential NOT LIKE '%[A-Z]%' AND LEN(@CurrentSequential) = 3
            BEGIN
                SET @NumericPart = CAST(@CurrentSequential AS INT);

                IF @NumericPart < 999
                BEGIN
                    -- Incrementa numerico
                    SET @NewSequential = RIGHT('000' + CAST(@NumericPart + 1 AS VARCHAR), 3);
                END
                ELSE
                BEGIN
                    -- Passa a formato alfabetico A00
                    SET @NewSequential = 'A00';
                END
            END
            -- Formato alfabetico (A00-Z99)
            ELSE IF @CurrentSequential LIKE '[A-Z][0-9][0-9]'
            BEGIN
                SET @AlphaPart = LEFT(@CurrentSequential, 1);
                SET @NumericPart = CAST(RIGHT(@CurrentSequential, 2) AS INT);

                IF @NumericPart < 99
                BEGIN
                    -- Incrementa parte numerica
                    SET @NewSequential = @AlphaPart + RIGHT('00' + CAST(@NumericPart + 1 AS VARCHAR), 2);
                END
                ELSE IF @AlphaPart < 'Z'
                BEGIN
                    -- Passa alla lettera successiva
                    SET @NewSequential = CHAR(ASCII(@AlphaPart) + 1) + '00';
                END
                ELSE
                BEGIN
                    -- Esauriti alfabetici, passa a 4 cifre
                    SET @NewSequential = '0000';
                END
            END
            -- Formato numerico lungo (0000+)
            ELSE
            BEGIN
                SET @NumericPart = CAST(@CurrentSequential AS INT);
                SET @NewSequential = RIGHT('000000000' + CAST(@NumericPart + 1 AS VARCHAR), LEN(@CurrentSequential));

                -- Se overflow, aggiungi una cifra
                IF LEN(@NewSequential) > LEN(@CurrentSequential)
                BEGIN
                    SET @NewSequential = CAST(@NumericPart + 1 AS VARCHAR);
                END
            END

            -- Aggiorna record
            UPDATE MA_CodingRules_SimplifiedSequentials
            SET LastSequential = @NewSequential,
                LastUsedDate = GETDATE()
            WHERE CompanyId = @CompanyId AND Prefix = @Prefix;
        END

        SET @NextSequential = @NewSequential;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO
/****** Object:  StoredProcedure [dbo].[MA_CodingRules_GetSimplifiedConfig]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[MA_CodingRules_GetSimplifiedConfig]
    @CompanyId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Restituisce configurazione logica semplificata per azienda
    SELECT
        Id,
        CompanyId,
        IsActive,
        CharactersToKeep,
        CreateDate,
        EditDate,
        CreateUser,
        EditUser
    FROM MA_CodingRules_SimplifiedConfig
    WHERE CompanyId = @CompanyId;

    -- Se non esiste, restituisce config di default (disattivata)
    IF @@ROWCOUNT = 0
    BEGIN
        SELECT
            NULL AS Id,
            @CompanyId AS CompanyId,
            0 AS IsActive,
            7 AS CharactersToKeep,
            NULL AS CreateDate,
            NULL AS EditDate,
            NULL AS CreateUser,
            NULL AS EditUser;
    END
END
GO
/****** Object:  StoredProcedure [dbo].[MA_CodingRules_ReconstructDescriptionFromCode]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[MA_CodingRules_ReconstructDescriptionFromCode]
    @CompanyId INT,
    @CodePrefix VARCHAR(14),
    @CharactersToKeep INT,
    @ReconstructedDescription NVARCHAR(512) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Variabili per estrarre i codici
    DECLARE @MacroFamilyCode VARCHAR(3);
    DECLARE @FamilyCode VARCHAR(5);
    DECLARE @TypeCode VARCHAR(5);

    -- Variabili per le descrizioni
    DECLARE @MacroFamilyDesc NVARCHAR(512);
    DECLARE @FamilyDesc NVARCHAR(512);
    DECLARE @TypeDesc NVARCHAR(512);

    -- Variabili per gli ID
    DECLARE @MacroFamilyId BIGINT;
    DECLARE @FamilyId BIGINT;

    -- Tabella per costruire la descrizione
    DECLARE @DescriptionParts TABLE (
        PartOrder INT,
        PartDescription NVARCHAR(512)
    );

    -- =====================================================
    -- LOGICA DI ESTRAZIONE BASATA SU CharactersToKeep
    -- =====================================================

    -- Con 7 caratteri: MacroFamily(1) + Family(3) + Type(3)
    -- Con 10 caratteri: MacroFamily(1) + Family(3) + Type(3) + Alias(3)
    -- Con 4 caratteri: MacroFamily(1) + Family(3)

    IF @CharactersToKeep >= 1
    BEGIN
        -- Estrai MacroFamily (primo carattere)
        SET @MacroFamilyCode = LEFT(@CodePrefix, 1);
    END

    IF @CharactersToKeep >= 4
    BEGIN
        -- Estrai Family (caratteri 2-4)
        SET @FamilyCode = SUBSTRING(@CodePrefix, 2, 3);
    END

    IF @CharactersToKeep >= 7
    BEGIN
        -- Estrai Type (caratteri 5-7)
        SET @TypeCode = SUBSTRING(@CodePrefix, 5, 3);
    END

    -- =====================================================
    -- LOOKUP NELLE TABELLE
    -- =====================================================

    -- 1. Cerca MacroFamily
    IF @MacroFamilyCode IS NOT NULL
    BEGIN
        SELECT TOP 1
            @MacroFamilyId = mf.Id,
            @MacroFamilyDesc = mf.Description
        FROM MA_CodingRules_MacroFamilies mf
        INNER JOIN MA_CodingRules_Categories cat ON cat.Id = mf.CategoryId
        WHERE mf.CompanyId = @CompanyId
            AND cat.Code = @MacroFamilyCode
            AND mf.IsActive = 1
        ORDER BY mf.CreateDate DESC;

        -- Aggiungi descrizione se trovata
        IF @MacroFamilyDesc IS NOT NULL
        BEGIN
            INSERT INTO @DescriptionParts (PartOrder, PartDescription)
            VALUES (1, @MacroFamilyDesc);
        END
    END

    -- 2. Cerca Family (se abbiamo trovato MacroFamily)
    IF @MacroFamilyId IS NOT NULL AND @FamilyCode IS NOT NULL AND @FamilyCode != '000'
    BEGIN
        SELECT TOP 1
            @FamilyId = f.Id,
            @FamilyDesc = f.Description
        FROM MA_CodingRules_Families f
        WHERE f.CompanyId = @CompanyId
            AND f.MacroFamilyId = @MacroFamilyId
            AND f.Code = @FamilyCode
            AND f.IsActive = 1
        ORDER BY f.CreateDate DESC;

        -- Aggiungi descrizione se trovata
        IF @FamilyDesc IS NOT NULL
        BEGIN
            INSERT INTO @DescriptionParts (PartOrder, PartDescription)
            VALUES (2, @FamilyDesc);
        END
    END

    -- 3. Cerca Type (se abbiamo trovato Family)
    IF @FamilyId IS NOT NULL AND @TypeCode IS NOT NULL AND @TypeCode != '000'
    BEGIN
        SELECT TOP 1
            @TypeDesc = t.Description
        FROM MA_CodingRules_Types t
        WHERE t.CompanyId = @CompanyId
            AND t.FamilyId = @FamilyId
            AND t.Code = @TypeCode
            AND t.IsActive = 1
        ORDER BY t.CreateDate DESC;

        -- Aggiungi descrizione se trovata
        IF @TypeDesc IS NOT NULL
        BEGIN
            INSERT INTO @DescriptionParts (PartOrder, PartDescription)
            VALUES (3, @TypeDesc);
        END
    END

    -- =====================================================
    -- COSTRUZIONE DESCRIZIONE FINALE
    -- =====================================================

    -- Se abbiamo trovato almeno una parte, concatena con " - "
    IF EXISTS (SELECT 1 FROM @DescriptionParts)
    BEGIN
        SELECT @ReconstructedDescription = STRING_AGG(PartDescription, ' - ')
            WITHIN GROUP (ORDER BY PartOrder)
        FROM @DescriptionParts;
    END
    ELSE
    BEGIN
        -- Nessun match trovato, restituisci NULL
        -- Il backend userà la descrizione originale
        SET @ReconstructedDescription = NULL;
    END
END
GO
/****** Object:  StoredProcedure [dbo].[MA_CodingRules_ValidateCode]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 3. SP per validare un codice
CREATE PROCEDURE [dbo].[MA_CodingRules_ValidateCode]
    @CompanyId INT,
    @ItemCode VARCHAR(64),
    @IsValid BIT OUTPUT,
    @ErrorMessage NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    SET @IsValid = 1;
    SET @ErrorMessage = NULL;
    
    -- Verifica lunghezza in base alla configurazione
    DECLARE @ExpectedLength INT;
    SELECT @ExpectedLength = TotalLength
    FROM MA_CodingRules_Config
    WHERE CompanyId = @CompanyId AND IsActive = 1;
    
    IF LEN(@ItemCode) != @ExpectedLength
    BEGIN
        SET @IsValid = 0;
        SET @ErrorMessage = 'Lunghezza codice non valida. Attesi ' + CAST(@ExpectedLength AS VARCHAR) + ' caratteri';
        RETURN;
    END
    
    -- Verifica unicità (solo warning se già in uso)
    IF EXISTS (
        SELECT 1 FROM MA_ProjectArticles_Items 
        WHERE CompanyId = @CompanyId 
        AND Item = @ItemCode 
        AND Disabled = 0
    )
    BEGIN
        SET @ErrorMessage = 'AVVISO: Codice già utilizzato';
		SET @IsValid = 0
    END
END
GO
/****** Object:  StoredProcedure [dbo].[MA_ProjectArticles_GetBOMDatas]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[MA_ProjectArticles_GetBOMDatas]
    @Action NVARCHAR(100),              -- 'GET_BOM', 'GET_BOM_COMPONENTS', 'GET_BOM_ROUTING', 'GET_BOM_FULL', 'GET_BOM_MULTILEVEL'
    @CompanyId INT,                    -- ID dell'azienda
    @Id BIGINT = NULL,                 -- ID della distinta
    @ItemId BIGINT = NULL,             -- ID articolo (alternativa a @Id)
    @Version INT = NULL,               -- Versione della distinta (usato con @ItemId)
    @MaxLevel INT = 10,                -- Livello massimo per la visualizzazione multilivello
    @IncludeDisabled BIT = 0,          -- Flag per includere articoli disabilitati
    @ExpandPhantoms BIT = 1,           -- Flag per espandere articoli fantasma in multi-livello
    @IncludeRouting BIT = 1,           -- Flag per includere i cicli nella GET_BOM_MULTILEVEL
    @ErrorCode INT OUTPUT,             -- Codice di errore (0 = successo)
    @ErrorMessage NVARCHAR(4000) OUTPUT -- Messaggio di errore
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Inizializzazione variabili di output
    SET @ErrorCode = 0;
    SET @ErrorMessage = N'';
    
    -- Tabella temporanea per la distinta multilivello con gestione versioning
    IF OBJECT_ID('tempdb..#TempBOMMultilevel') IS NOT NULL
        DROP TABLE #TempBOMMultilevel;
        
    CREATE TABLE #TempBOMMultilevel (
        Level INT,
        ItemId BIGINT,           
        ComponentId BIGINT,      
        ParentId BIGINT,         
        BOMId BIGINT,            
        ParentBOMId BIGINT,      
        MainRefBOMId BIGINT,     
        Line INT,
        ComponentType INT,
        Path NVARCHAR(MAX),
        Quantity DECIMAL(18, 5),
        CalculatedQty DECIMAL(18, 5),
        UoM VARCHAR(10),
        UnitCost FLOAT,
        TotalCost FLOAT,
        FixedCost FLOAT
    );

    -- Tabella temporanea per gestire la selezione versioni BOM
    IF OBJECT_ID('tempdb..#TempBOMVersions') IS NOT NULL
        DROP TABLE #TempBOMVersions;
    
    CREATE TABLE #TempBOMVersions (
        ComponentId BIGINT,
        BOMId BIGINT,
        Version INT,
        BOMCode NVARCHAR(255),
        Priority INT  -- 1=stesso MainRef, 2=versione base
    );
    
    BEGIN TRY
        -- Validazione dei parametri di input
        IF @Action NOT IN ('GET_BOM', 'GET_BOM_COMPONENTS', 'GET_BOM_ROUTING', 'GET_BOM_FULL', 'GET_BOM_MULTILEVEL', 'GET_BOM_INTERCOMPANY_SUMMARY')
        BEGIN
            SET @ErrorCode = 1;
            SET @ErrorMessage = N'Azione non valida - ' + @Action;
            RETURN;
        END
        
        IF @CompanyId IS NULL OR @CompanyId <= 0
        BEGIN
            SET @ErrorCode = 2;
            SET @ErrorMessage = N'CompanyId non valido.';
            RETURN;
        END
        
        -- Se è stato fornito l'ItemId ma non l'Id, cerchiamo l'Id della distinta base
        IF @Id IS NULL AND @ItemId IS NOT NULL
        BEGIN
            IF @Version IS NULL
            BEGIN
                -- Prima cerca versione sincronizzata con ERP
                SELECT TOP 1 @Id = Id
                FROM dbo.MA_ProjectArticles_BillOfMaterials
                WHERE CompanyId = @CompanyId 
                  AND ItemId = @ItemId
                  AND stato_erp = 1  
                  AND MainRefBOMId IS NULL  
                ORDER BY Version DESC;
                
                -- Se non trova versione ufficiale, prendi l'ultima con MainRefBOMId NULL
                IF @Id IS NULL
                BEGIN
                    SELECT TOP 1 @Id = Id
                    FROM dbo.MA_ProjectArticles_BillOfMaterials
                    WHERE CompanyId = @CompanyId 
                      AND ItemId = @ItemId
                      AND MainRefBOMId IS NULL
                    ORDER BY Version DESC;
                END
                
                -- Se ancora non trova, prendi qualsiasi versione più recente
                IF @Id IS NULL
                BEGIN
                    SELECT TOP 1 @Id = Id
                    FROM dbo.MA_ProjectArticles_BillOfMaterials
                    WHERE CompanyId = @CompanyId 
                      AND ItemId = @ItemId
                    ORDER BY Version DESC;
                END
            END
            ELSE
            BEGIN
                -- Prendi la versione specificata
                SELECT @Id = Id
                FROM dbo.MA_ProjectArticles_BillOfMaterials
                WHERE CompanyId = @CompanyId AND ItemId = @ItemId AND Version = @Version;
            END
            
            IF @Id IS NULL
            BEGIN
                SET @ErrorCode = 3;
                SET @ErrorMessage = N'Distinta base non trovata per l''articolo specificato.';
                RETURN;
            END
        END
        
        -- Validazione Id distinta
        IF @Id IS NULL
        BEGIN
            SET @ErrorCode = 4;
            SET @ErrorMessage = N'Id della distinta non specificato.';
            RETURN;
        END
        
        -- Esecuzione dell'azione richiesta
        IF @Action = 'GET_BOM'
        BEGIN
            -- Query per recuperare i dati della testata della distinta base
            SELECT 
                bom.CompanyId,
                bom.Id,
                bom.BOM,
                bom.Description,
                bom.ItemId,
                bom.Version,
                bom.UoM,
                bom.BOMStatus,
                bom.stato_erp,
                bom.data_sync_erp,
                bom.ProductionLot,
                bom.RMCost,
                bom.ProcessingCost,
                bom.RMRefillCost,
                bom.ProcessingRefillCost,
                bom.TotalCost,
                bom.TotalPrice,
                bom.RefillWaste,
                bom.RefillDiscount,
                bom.TotalRefill,
                bom.TransportRefill,
                bom.Details,
                bom.Notes,
                bom.TBCreated,
                bom.TBCreatedId,
                bom.MainRefBOMId,
                item.Item AS ItemCode,
                item.Description AS ItemDescription,
                item.Nature AS ItemNature,
                item.BaseUoM AS ItemUoM
            FROM dbo.MA_ProjectArticles_BillOfMaterials bom
            LEFT JOIN dbo.MA_ProjectArticles_Items item ON bom.ItemId = item.Id AND bom.CompanyId = item.CompanyId
            WHERE bom.Id = @Id AND bom.CompanyId = @CompanyId;
        END
        ELSE IF @Action = 'GET_BOM_COMPONENTS'
        BEGIN
            -- Recupera il MainRefBOMId della BOM padre
            DECLARE @ParentMainRefBOMId BIGINT;
            SELECT @ParentMainRefBOMId = ISNULL(MainRefBOMId, Id)
            FROM dbo.MA_ProjectArticles_BillOfMaterials
            WHERE Id = @Id AND CompanyId = @CompanyId;
            
            -- NUOVA LOGICA DUALE
            -- Per ogni componente, verifica se esistono versioni con il MainRefBOMId del padre
            INSERT INTO #TempBOMVersions (ComponentId, BOMId, Version, BOMCode, Priority)
            SELECT 
                comp.ComponentId,
                bom.Id,
                bom.Version,
                bom.BOM,
                CASE 
                    -- Se trova versione con stesso MainRefBOMId, usa quella (priorità 1)
                    WHEN bom.MainRefBOMId = @ParentMainRefBOMId THEN 1
                    -- Altrimenti usa la versione base (priorità 2)
                    ELSE 2
                END AS Priority
            FROM dbo.MA_ProjectArticles_BOMComponents comp
            INNER JOIN dbo.MA_ProjectArticles_BillOfMaterials bom 
                ON bom.ItemId = comp.ComponentId 
                AND bom.CompanyId = comp.CompanyId
            WHERE comp.BOMId = @Id 
                AND comp.CompanyId = @CompanyId
                -- Include solo: versioni con stesso MainRefBOMId O versione base (Version = 1)
                AND (bom.MainRefBOMId = @ParentMainRefBOMId OR bom.Version = 1);
            
            -- Query per recuperare i componenti con la versione corretta della loro distinta
            WITH BOMSelection AS (
                SELECT 
                    ComponentId,
                    BOMId,
                    Version,
                    BOMCode,
                    ROW_NUMBER() OVER(PARTITION BY ComponentId ORDER BY Priority, Version DESC) AS rn
                FROM #TempBOMVersions
            )
	SELECT
				comp.CompanyId,
				comp.BOMId,
				comp.Line,
				comp.ComponentId,
				comp.ComponentType,
				comp.Quantity,
				comp.UnitCost,
				comp.TotalCost,
				comp.FixedCost,
				comp.UoM,
				comp.Details,
				comp.Notes,
				comp.TBCreated,
				comp.TBCreatedId,
				item.Item AS ComponentCode,
				item.Description AS ComponentDescription,
				item.Nature AS ComponentNature,
				CASE
					WHEN item.Nature = 22413314 THEN 'Acquisto'
					WHEN item.Nature = 22413312 THEN 'Semilavorato'
					WHEN item.Nature = 22413313 THEN 'Prodotto Finito'
					ELSE 'Altro'
				END AS NatureDescription,
				ISNULL(item.stato_erp, 0) AS stato_erp,
				bs.BOMId AS ComponentBOMId,
				bs.Version AS ComponentBOMVersion,
				bs.BOMCode AS ComponentBOMCode,

				-- AGGIUNGI QUESTI CAMPI FORNITORE usando la funzione
				supplier.SupplierId AS SupplierCode,
				supplier.IntercompanyTargetId AS IntercompanyTargetId,
				supplier.DataSource AS SupplierDataSource,
				cs.CompanyName AS SupplierName,
				CASE WHEN supplier.IntercompanyTargetId IS NOT NULL THEN 1 ELSE 0 END AS IsIntercompany,
				targetComp.Description AS IntercompanyTargetName,

				-- Campi temporanei (per debug/UI)
				item.TempSupplierId,
				item.TempIntercompanyTargetId,
				item.TempSupplierNotes

			FROM dbo.MA_ProjectArticles_BOMComponents comp
			LEFT JOIN dbo.MA_ProjectArticles_Items item
				ON comp.ComponentId = item.Id AND comp.CompanyId = item.CompanyId
			LEFT JOIN BOMSelection bs
				ON bs.ComponentId = comp.ComponentId AND bs.rn = 1

			-- USA LA FUNZIONE per ottenere fornitore
			CROSS APPLY dbo.fn_GetComponentSupplier(comp.ComponentId, comp.CompanyId) supplier

			-- Join per info fornitore
			LEFT JOIN dbo.MA_CustSupp cs
				ON supplier.SupplierId = cs.CustSupp
				AND comp.CompanyId = cs.CompanyId
				AND cs.CustSuppType = 3211265
			LEFT JOIN dbo.AR_Companies targetComp
				ON supplier.IntercompanyTargetId = targetComp.CompanyId

			WHERE comp.BOMId = @Id AND comp.CompanyId = @CompanyId
			ORDER BY comp.Line;
		END
        ELSE IF @Action = 'GET_BOM_ROUTING'
        BEGIN
            -- Query per recuperare i cicli della distinta base
            -- con identificazione corretta del conto lavoro intercompany

            SELECT DISTINCT
                routing.CompanyId,
                routing.BOMId,
                routing.RtgStep,
                routing.Operation,
                routing.Notes,
                routing.WC,
                routing.ProcessingTime,
                routing.SetupTime,
                routing.NoOfProcessingWorkers,
                routing.NoOfSetupWorkers,
                routing.SubId,
                routing.Supplier,
                routing.Qty,
                routing.TBCreated,
                routing.TBModified,
                routing.TBCreatedID,
                routing.TBModifiedID,
                op.Description AS OperationDescription,
                wc.Description AS WorkCenterDescription,
                wc.Supplier AS WCSupplier,
                cs.CompanyName AS SupplierName,
                CASE
                    WHEN cs.IntercompanyId IS NOT NULL THEN 'Sì'
                    ELSE 'No'
                END AS IsIntercompany,
                cs.IntercompanyId AS IntercompanyTargetId,
                targetComp.Description AS IntercompanyTargetName,
                CASE
                    WHEN cs.IntercompanyId IS NOT NULL AND wc.Supplier IS NOT NULL AND wc.Supplier <> '' THEN 'Sì'
                    ELSE 'No'
                END AS IsIntercompanySubcontracting
            FROM dbo.MA_ProjectArticles_BOMRouting routing
            LEFT JOIN dbo.MA_Operations op
                ON routing.Operation = op.Operation
                AND routing.CompanyId = op.CompanyId
            LEFT JOIN dbo.MA_WorkCenters wc
                ON routing.WC = wc.WC
                AND routing.CompanyId = wc.CompanyId
            LEFT JOIN dbo.MA_CustSupp cs
                ON wc.Supplier = cs.CustSupp
                AND wc.CompanyId = cs.CompanyId
                AND cs.CustSuppType = 3211265  -- Fornitore
            LEFT JOIN dbo.AR_Companies targetComp
                ON cs.IntercompanyId = targetComp.CompanyId
            WHERE routing.BOMId = @Id
              AND routing.CompanyId = @CompanyId
            ORDER BY routing.RtgStep;
        END
        ELSE IF @Action = 'GET_BOM_FULL'
        BEGIN
            -- Recupera il MainRefBOMId per la selezione componenti
            DECLARE @FullParentMainRefBOMId BIGINT;
            SELECT @FullParentMainRefBOMId = ISNULL(MainRefBOMId, Id)
            FROM dbo.MA_ProjectArticles_BillOfMaterials
            WHERE Id = @Id AND CompanyId = @CompanyId;
            
            -- Testata
            SELECT 
                bom.CompanyId,
                bom.Id,
                bom.BOM,
                bom.Description,
                bom.ItemId,
                bom.Version,
                bom.UoM,
                bom.BOMStatus,
                bom.stato_erp,
                bom.data_sync_erp,
                bom.ProductionLot,
                bom.RMCost,
                bom.ProcessingCost,
                bom.RMRefillCost,
                bom.ProcessingRefillCost,
                bom.TotalCost,
                bom.TotalPrice,
                bom.RefillWaste,
                bom.RefillDiscount,
                bom.TotalRefill,
                bom.TransportRefill,
                bom.Details,
                bom.Notes,
                bom.TBCreated,
                bom.TBCreatedId,
                bom.MainRefBOMId,
                item.Item AS ItemCode,
                item.Description AS ItemDescription,
                item.Nature AS ItemNature,
                item.BaseUoM AS ItemUoM
            FROM dbo.MA_ProjectArticles_BillOfMaterials bom
            LEFT JOIN dbo.MA_ProjectArticles_Items item ON bom.ItemId = item.Id AND bom.CompanyId = item.CompanyId
            WHERE bom.Id = @Id AND bom.CompanyId = @CompanyId;
            
            -- NUOVA LOGICA DUALE per componenti
            INSERT INTO #TempBOMVersions (ComponentId, BOMId, Version, BOMCode, Priority)
            SELECT 
                comp.ComponentId,
                bom.Id,
                bom.Version,
                bom.BOM,
                CASE 
                    WHEN bom.MainRefBOMId = @FullParentMainRefBOMId THEN 1
                    ELSE 2
                END AS Priority
            FROM dbo.MA_ProjectArticles_BOMComponents comp
            INNER JOIN dbo.MA_ProjectArticles_BillOfMaterials bom 
                ON bom.ItemId = comp.ComponentId 
                AND bom.CompanyId = comp.CompanyId
            WHERE comp.BOMId = @Id 
                AND comp.CompanyId = @CompanyId
                AND (bom.MainRefBOMId = @FullParentMainRefBOMId OR bom.Version = 1);
            
            WITH BOMSelection AS (
                SELECT 
                    ComponentId,
                    BOMId,
                    Version,
                    BOMCode,
                    ROW_NUMBER() OVER(PARTITION BY ComponentId ORDER BY Priority, Version DESC) AS rn
                FROM #TempBOMVersions
            )
            SELECT 
                comp.CompanyId,
                comp.BOMId,
                comp.Line,
                comp.ComponentId,
                comp.ComponentType,
                comp.Quantity,
                comp.UnitCost,
                comp.TotalCost,
                comp.FixedCost,
                comp.UoM,
                comp.Details,
                comp.Notes,
                comp.TBCreated,
                comp.TBCreatedId,
                item.Item AS ComponentCode,
                item.Description AS ComponentDescription,
                item.Nature AS ComponentNature,
                CASE 
                    WHEN item.Nature = 22413314 THEN 'Acquisto'
                    WHEN item.Nature = 22413312 THEN 'Semilavorato'
                    WHEN item.Nature = 22413313 THEN 'Prodotto Finito'
                    ELSE 'Altro'
                END AS NatureDescription,
                ISNULL(item.stato_erp,0) AS stato_erp,
                bs.BOMId AS ComponentBOMId,
                bs.Version AS ComponentBOMVersion,
                bs.BOMCode AS ComponentBOMCode
            FROM dbo.MA_ProjectArticles_BOMComponents comp
            LEFT JOIN dbo.MA_ProjectArticles_Items item 
                ON comp.ComponentId = item.Id AND comp.CompanyId = item.CompanyId
            LEFT JOIN BOMSelection bs 
                ON bs.ComponentId = comp.ComponentId AND bs.rn = 1
            WHERE comp.BOMId = @Id AND comp.CompanyId = @CompanyId
            ORDER BY comp.Line;
            
            -- Cicli
            SELECT DISTINCT
                routing.CompanyId,
                routing.BOMId,
                routing.RtgStep,
                routing.Operation,
                routing.Notes,
                routing.WC,
                routing.ProcessingTime,
                routing.SetupTime,
                routing.NoOfProcessingWorkers,
                routing.NoOfSetupWorkers,
                routing.SubId,
                routing.Supplier,
                routing.Qty,
                routing.TBCreated,
                routing.TBModified,
                routing.TBCreatedID,
                routing.TBModifiedID,
                op.Description AS OperationDescription,
                wc.Description AS WorkCenterDescription,
                cs.CompanyName AS SupplierName,
                CASE 
                    WHEN cs.IntercompanyId IS NOT NULL THEN 'Sì'
                    ELSE 'No'
                END AS IsIntercompany
            FROM dbo.MA_ProjectArticles_BOMRouting routing
            LEFT JOIN MA_Operations op ON routing.Operation = op.Operation AND routing.CompanyId = op.CompanyId
            LEFT JOIN MA_WorkCenters wc ON routing.WC = wc.WC AND routing.CompanyId = wc.CompanyId
            LEFT JOIN MA_CustSupp cs ON routing.Supplier = cs.CustSupp AND routing.CompanyId = cs.CompanyId AND cs.CustSuppType = 3211265
            WHERE routing.BOMId = @Id AND routing.CompanyId = @CompanyId
            ORDER BY routing.RtgStep;

            -- Versioni Distinte
            SELECT BOM, Version
            FROM MA_ProjectArticles_BillOfMaterials T1 
            WHERE CompanyId = @CompanyId
            AND ItemId = (SELECT TOP(1) ItemId FROM MA_ProjectArticles_BillOfMaterials WHERE Id = @Id)

        END

ELSE IF @Action = 'GET_BOM_INTERCOMPANY_SUMMARY'
BEGIN
    -- =============================================================================
    -- LOGICA MULTILEVEL: Esplosione ricorsiva per riepilogo intercompany
    -- Supporta: Acquisti + Conto Lavoro + Componenti Temporanei
    -- =============================================================================
    
    DROP TABLE IF EXISTS #TempBOMIntercompany;
    
    -- Creazione tabella temporanea per esplosione multilevel
    CREATE TABLE #TempBOMIntercompany (
        Level INT,
        BOMId BIGINT,
        ItemId BIGINT,
        ItemCode VARCHAR(64),
        ItemDescription NVARCHAR(255),
        Nature INT,
        Version INT,
        BOMCode VARCHAR(50),
        BOMDescription NVARCHAR(255),
        Path NVARCHAR(MAX),
        Quantity DECIMAL(18,5),
        CalculatedQuantity DECIMAL(18,5),
        UoM VARCHAR(8),
        MainRefBOMId BIGINT,
        ComponentType INT,
        SupplierId VARCHAR(20),
        SupplierName NVARCHAR(255),
        IntercompanyTargetId INT,
        IntercompanyTargetName NVARCHAR(255),
        DataSource VARCHAR(20)
    );
    
    -- Inserimento livello 0 (articolo principale)
    INSERT INTO #TempBOMIntercompany
    SELECT 
        0 AS Level,
        CAST(bom.Id AS BIGINT) AS BOMId,
        CAST(bom.ItemId AS BIGINT) AS ItemId,
        CAST(item.Item AS VARCHAR(64)) AS ItemCode,
        CAST(item.Description AS NVARCHAR(255)) AS ItemDescription,
        CAST(item.Nature AS INT) AS Nature,
        CAST(bom.Version AS INT) AS Version,
        CAST(bom.BOM AS VARCHAR(50)) AS BOMCode,
        CAST(bom.Description AS NVARCHAR(255)) AS BOMDescription,
        CAST(item.Item AS NVARCHAR(MAX)) AS Path,
        CAST(1.0 AS DECIMAL(18,5)) AS Quantity,
        CAST(1.0 AS DECIMAL(18,5)) AS CalculatedQuantity,
        CAST(item.BaseUoM AS VARCHAR(8)) AS UoM,
        CAST(bom.MainRefBOMId AS BIGINT) AS MainRefBOMId,
        CAST(0 AS INT) AS ComponentType,
        CAST('' AS VARCHAR(20)) AS SupplierId,
        CAST('' AS NVARCHAR(255)) AS SupplierName,
        CAST(0 AS INT) AS IntercompanyTargetId,
        CAST('' AS NVARCHAR(255)) AS IntercompanyTargetName,
        CAST('' AS VARCHAR(20)) AS DataSource
    FROM dbo.MA_ProjectArticles_BillOfMaterials bom
    INNER JOIN dbo.MA_ProjectArticles_Items item ON bom.ItemId = item.Id
    WHERE bom.Id = @Id AND bom.CompanyId = @CompanyId;
    
    -- Variabili per controllo ricorsione
    DECLARE @CurrentLevel INT = 0;
    DECLARE @MaxLevelSummary INT = 10; -- Limite di profondità per evitare cicli infiniti
    DECLARE @RowsInserted INT = 1;
    
    -- Ciclo ricorsivo per esplodere tutti i livelli
    WHILE @CurrentLevel < @MaxLevelSummary AND @RowsInserted > 0
    BEGIN
        SET @RowsInserted = 0;
        
        -- Inserimento componenti del livello successivo
        INSERT INTO #TempBOMIntercompany
        SELECT 
            @CurrentLevel + 1 AS Level,
            CAST(compBOM.Id AS BIGINT) AS BOMId,
            CAST(comp.ComponentId AS BIGINT) AS ItemId,
            CAST(compItem.Item AS VARCHAR(64)) AS ItemCode,
            CAST(compItem.Description AS NVARCHAR(255)) AS ItemDescription,
            CAST(compItem.Nature AS INT) AS Nature,
            CAST(compBOM.Version AS INT) AS Version,
            CAST(compBOM.BOM AS VARCHAR(50)) AS BOMCode,
            CAST(compBOM.Description AS NVARCHAR(255)) AS BOMDescription,
            tbi.Path + '.' + compItem.Item AS Path,
            CAST(comp.Quantity AS DECIMAL(18,5)) AS Quantity,
            CAST(tbi.CalculatedQuantity * comp.Quantity AS DECIMAL(18,5)) AS CalculatedQuantity,
            CAST(comp.UoM AS VARCHAR(8)) AS UoM,
            CAST(compBOM.MainRefBOMId AS BIGINT) AS MainRefBOMId,
            CAST(comp.ComponentType AS INT) AS ComponentType,
            CAST('' AS VARCHAR(20)) AS SupplierId,
            CAST('' AS NVARCHAR(255)) AS SupplierName,
            CAST(0 AS INT) AS IntercompanyTargetId,
            CAST('' AS NVARCHAR(255)) AS IntercompanyTargetName,
            CAST('' AS VARCHAR(20)) AS DataSource
        FROM #TempBOMIntercompany tbi
        INNER JOIN dbo.MA_ProjectArticles_BOMComponents comp 
            ON tbi.BOMId = comp.BOMId AND comp.CompanyId = @CompanyId
        INNER JOIN dbo.MA_ProjectArticles_Items compItem 
            ON comp.ComponentId = compItem.Id AND compItem.CompanyId = @CompanyId
        -- Logica duale per selezione versione BOM
        INNER JOIN dbo.MA_ProjectArticles_BillOfMaterials compBOM 
            ON compBOM.ItemId = comp.ComponentId 
            AND compBOM.CompanyId = @CompanyId
            AND (
                -- Prima verifica: esiste versione con stesso MainRefBOMId?
                (compBOM.MainRefBOMId = tbi.MainRefBOMId 
                 AND EXISTS(SELECT 1 FROM dbo.MA_ProjectArticles_BillOfMaterials b2 
                           WHERE b2.ItemId = comp.ComponentId 
                             AND b2.CompanyId = @CompanyId 
                             AND b2.MainRefBOMId = tbi.MainRefBOMId))
                OR 
                -- Se non esiste versione con stesso MainRef, usa versione base (Version = 1)
                (compBOM.Version = 1 
                 AND NOT EXISTS(SELECT 1 FROM dbo.MA_ProjectArticles_BillOfMaterials b2 
                               WHERE b2.ItemId = comp.ComponentId 
                                 AND b2.CompanyId = @CompanyId 
                                 AND b2.MainRefBOMId = tbi.MainRefBOMId))
            )
        WHERE tbi.Level = @CurrentLevel
          AND comp.ComponentType = 7798784  -- Solo componenti di tipo Articolo
          AND NOT EXISTS (
              -- Evita duplicati
              SELECT 1 FROM #TempBOMIntercompany tbi2 
              WHERE tbi2.ItemId = comp.ComponentId 
                AND tbi2.Level = @CurrentLevel + 1
          );
        
        SET @RowsInserted = @@ROWCOUNT;
        SET @CurrentLevel = @CurrentLevel + 1;
    END;
    
    -- =============================================================================
    -- AGGIORNAMENTO INFORMAZIONI FORNITORE PER TUTTI I TIPI
    -- =============================================================================
    
    -- A) COMPONENTI DI ACQUISTO INTERCOMPANY (MULTILEVEL)
    UPDATE tbi
    SET 
        SupplierId = ISNULL(cs.CustSupp, ''),
        SupplierName = ISNULL(cs.CompanyName, ''),
        IntercompanyTargetId = ISNULL(cs.IntercompanyId, 0),
        IntercompanyTargetName = ISNULL(targetComp.Description, ''),
        DataSource = 'ACQUISTO'
    FROM #TempBOMIntercompany tbi
    INNER JOIN dbo.MA_ProjectArticles_Items item
        ON tbi.ItemId = item.Id
        AND item.CompanyId = @CompanyId
    LEFT JOIN dbo.MA_Items maItem
        ON item.Item = maItem.Item
        AND item.CompanyId = maItem.CompanyId
    LEFT JOIN dbo.MA_ItemsGoodsData goodsData
        ON maItem.Item = goodsData.Item
        AND maItem.CompanyId = goodsData.CompanyId
    LEFT JOIN dbo.MA_ItemSuppliers itemSupp
        ON goodsData.Supplier = itemSupp.Supplier
        AND maItem.Item = itemSupp.Item
        AND maItem.CompanyId = itemSupp.CompanyId
    LEFT JOIN dbo.MA_CustSupp cs
        ON itemSupp.Supplier = cs.CustSupp
        AND itemSupp.CompanyId = cs.CompanyId
        AND cs.CustSuppType = 3211265  -- Fornitore
    LEFT JOIN dbo.AR_Companies targetComp
        ON cs.IntercompanyId = targetComp.CompanyId
    WHERE
        tbi.Level > 0  -- Esclude l'articolo principale
        AND maItem.Nature = 22413314  -- Natura = Acquisto
        AND cs.IntercompanyId IS NOT NULL
        AND tbi.DataSource = '';  -- Solo se non è già stato popolato
    
	-- B) COMPONENTI DI CONTO LAVORO INTERCOMPANY (MULTILEVEL) - VERSIONE SEMPLIFICATA
	UPDATE tbi
	SET 
		SupplierId = ISNULL(cs.CustSupp, ''),
		SupplierName = ISNULL(cs.CompanyName, ''),
		IntercompanyTargetId = ISNULL(cs.IntercompanyId, 0),
		IntercompanyTargetName = ISNULL(targetComp.Description, ''),
		DataSource = 'CONTO_LAVORO'
	FROM #TempBOMIntercompany tbi
	INNER JOIN dbo.MA_ProjectArticles_Items item
		ON tbi.ItemId = item.Id
		AND item.CompanyId = @CompanyId
	-- Usa sempre Version = 1 per semplicità
	LEFT JOIN dbo.MA_ProjectArticles_BillOfMaterials compBOM
		ON compBOM.ItemId = tbi.ItemId
		AND compBOM.CompanyId = @CompanyId
		AND compBOM.Version = 1
	LEFT JOIN dbo.MA_ProjectArticles_BOMRouting routing
		ON routing.BOMId = compBOM.Id
		AND routing.CompanyId = @CompanyId
	LEFT JOIN dbo.MA_WorkCenters wc
		ON routing.WC = wc.WC
		AND routing.CompanyId = wc.CompanyId
	LEFT JOIN dbo.MA_CustSupp cs
		ON wc.Supplier = cs.CustSupp
		AND wc.CompanyId = cs.CompanyId
		AND cs.CustSuppType = 3211265  -- Fornitore
	LEFT JOIN dbo.AR_Companies targetComp
		ON cs.IntercompanyId = targetComp.CompanyId
	WHERE
		tbi.Level > 0  -- Esclude l'articolo principale
		AND cs.IntercompanyId IS NOT NULL
		AND wc.Supplier IS NOT NULL
		AND wc.Supplier <> ''
		AND targetComp.Description IS NOT NULL
		AND tbi.DataSource = '';  -- Solo se non è già stato popolato
    
    -- C) COMPONENTI TEMPORANEI INTERCOMPANY (MULTILEVEL)
    UPDATE tbi
    SET 
        SupplierId = ISNULL(item.TempSupplierId, ''),
        SupplierName = ISNULL(custSupp.CompanyName, ''),
        IntercompanyTargetId = ISNULL(item.TempIntercompanyTargetId, 0),
        IntercompanyTargetName = ISNULL(targetComp.Description, ''),
        DataSource = 'TEMP_SUPPLIER'
    FROM #TempBOMIntercompany tbi
    INNER JOIN dbo.MA_ProjectArticles_Items item
        ON tbi.ItemId = item.Id
        AND item.CompanyId = @CompanyId
    LEFT JOIN dbo.MA_CustSupp custSupp
        ON item.TempSupplierId = custSupp.CustSupp
        AND custSupp.CompanyId = @CompanyId
    LEFT JOIN dbo.AR_Companies targetComp
        ON item.TempIntercompanyTargetId = targetComp.CompanyId
    WHERE
        tbi.Level > 0  -- Esclude l'articolo principale
        AND item.TempIntercompanyTargetId IS NOT NULL
        AND item.TempIntercompanyTargetId > 0
        AND item.TempSupplierId IS NOT NULL
        AND item.TempSupplierId != ''
        AND targetComp.Description IS NOT NULL
        AND tbi.DataSource = '';  -- Solo se non è già stato popolato
    
    -- =============================================================================
    -- RISULTATO FINALE
    -- =============================================================================
    
    -- CTE per componenti con fornitori intercompany
    WITH IntercompanyComponents AS (
        SELECT 
            tbi.ItemId,
            tbi.ItemCode,
            tbi.ItemDescription,
            tbi.Nature,
            tbi.Path,
            tbi.Level,
            tbi.CalculatedQuantity,
            tbi.UoM,
            tbi.SupplierId,
            tbi.SupplierName,
            tbi.IntercompanyTargetId,
            tbi.IntercompanyTargetName,
            tbi.DataSource,
            -- Informazioni fornitore temporaneo se disponibili
            tempItem.TempSupplierId,
            tempItem.TempIntercompanyTargetId,
            tempItem.TempSupplierNotes,
            -- Informazioni fornitore finale
            CASE 
                WHEN tbi.DataSource = 'TEMP_SUPPLIER' THEN tempItem.TempSupplierId
                ELSE tbi.SupplierId
            END AS FinalSupplierId,
            CASE 
                WHEN tbi.DataSource = 'TEMP_SUPPLIER' THEN tempItem.TempIntercompanyTargetId
                ELSE tbi.IntercompanyTargetId
            END AS FinalIntercompanyTargetId,
            CASE 
                WHEN tbi.DataSource = 'TEMP_SUPPLIER' THEN tempItem.TempSupplierNotes
                ELSE ''
            END AS FinalSupplierNotes
        FROM #TempBOMIntercompany tbi
        LEFT JOIN dbo.MA_ProjectArticles_Items tempItem 
            ON tbi.ItemId = tempItem.Id AND tempItem.CompanyId = @CompanyId
        WHERE tbi.Level > 0  -- Esclude l'articolo principale
          AND (
              -- Componenti con fornitore intercompany
              tbi.IntercompanyTargetId > 0 
              OR tempItem.TempIntercompanyTargetId > 0
          )
    ),
    -- CTE per riepilogo per fornitore
    SupplierSummary AS (
        SELECT 
            ic.FinalSupplierId AS SupplierId,
            ic.FinalIntercompanyTargetId AS IntercompanyTargetId,
            COUNT(*) AS ComponentCount,
            SUM(ic.CalculatedQuantity) AS TotalQuantity,
            STRING_AGG(ic.ItemCode + ' (' + CAST(ic.CalculatedQuantity AS VARCHAR(20)) + ' ' + ic.UoM + ')', ', ') AS ComponentsList
        FROM IntercompanyComponents ic
        WHERE ic.FinalSupplierId IS NOT NULL 
          AND ic.FinalSupplierId != ''
          AND ic.FinalIntercompanyTargetId > 0
        GROUP BY ic.FinalSupplierId, ic.FinalIntercompanyTargetId
    )
    -- Risultato finale
    SELECT DISTINCT
        ic.ItemId AS ComponentId,
		ic.ItemId,
        ic.ItemCode,
        ic.ItemDescription,
        CASE 
            WHEN ic.Nature = 22413312 THEN 'Semilavorato'
            WHEN ic.Nature = 22413313 THEN 'Prodotto Finito'
            WHEN ic.Nature = 22413314 THEN 'Acquisto'
            WHEN ic.Nature = 22413315 THEN 'Materia Prima'
            ELSE 'Altro'
        END AS NatureDescription,
		ic.Nature,
        ic.Level,
        ic.CalculatedQuantity,
        ic.UoM,
        ic.FinalSupplierId AS TempSupplierId,
        ic.FinalIntercompanyTargetId AS TempIntercompanyTargetId,
        ic.FinalSupplierNotes AS TempSupplierNotes,
        -- Informazioni fornitore
        custSupp.CustSupp AS CustSupp,
        custSupp.CompanyName,
        ic.FinalIntercompanyTargetId AS TargetCompanyId,  -- ← CORRETTO per frontend
        targetComp.Description AS TargetCompanyName,
        ic.DataSource,
        -- Codice articolo del fornitore (se disponibile tramite MA_ItemSuppliers)
		ISNULL((SELECT TOP(1) T3.SupplierCode
				FROM MA_ProjectArticles_Items T0
				JOIN MA_Items T1 ON T1.CompanyId = T0.CompanyId AND T1.Item = T0.Item
				JOIN MA_ItemSuppliers T3 ON T3.CompanyId = T1.CompanyId AND T3.Item = T1.Item 
					AND T3.Supplier = (SELECT TOP(1) CustSupp FROM MA_CustSupp WHERE CompanyId = @CompanyId AND CustSuppType = 3211265 AND IntercompanyId = ic.FinalIntercompanyTargetId)
				WHERE T0.CompanyId = @CompanyId AND T0.Id = ic.ItemId), NULL) AS TargetProjectItemCode,
		-- Informazioni riepilogo
        ss.ComponentCount,
        ss.TotalQuantity,
        ss.ComponentsList
    FROM IntercompanyComponents ic
    LEFT JOIN ( SELECT *, ROW_NUMBER()OVER(PARTITION BY IntercompanyId ORDER BY TBCreated DESC) AS RowNo FROM dbo.MA_CustSupp WHERE IntercompanyId > 0 AND CustSuppType = 3211264 AND CompanyId = @CompanyId ) custSupp 
        ON ic.FinalSupplierId = custSupp.CustSupp AND custSupp.RowNo = 1
    LEFT JOIN dbo.AR_Companies targetComp 
        ON ic.FinalIntercompanyTargetId = targetComp.CompanyId 
    LEFT JOIN SupplierSummary ss 
        ON ic.FinalSupplierId = ss.SupplierId 
        AND ic.FinalIntercompanyTargetId = ss.IntercompanyTargetId
    ORDER BY ic.Level;
    
    -- Pulizia tabella temporanea
    DROP TABLE #TempBOMIntercompany;
END

        ELSE IF @Action = 'GET_BOM_MULTILEVEL'
        BEGIN
            -- Ottieni l'ItemId e MainRefBOMId della distinta base
            DECLARE @RootItemId BIGINT;
            DECLARE @RootBOMId BIGINT = @Id;
            DECLARE @RootMainRefBOMId BIGINT;
            
            SELECT @RootItemId = ItemId, 
                   @RootMainRefBOMId = ISNULL(MainRefBOMId, Id)
            FROM dbo.MA_ProjectArticles_BillOfMaterials
            WHERE Id = @Id AND CompanyId = @CompanyId;
            
            IF @RootItemId IS NULL
            BEGIN
                SET @ErrorCode = 5;
                SET @ErrorMessage = N'Distinta base non trovata.';
                RETURN;
            END
           
            -- Inseriamo il nodo root nella tabella temporanea
            INSERT INTO #TempBOMMultilevel (
                Level, ItemId, ComponentId, ParentId, BOMId, ParentBOMId, MainRefBOMId, Line, ComponentType, 
                Path, Quantity, CalculatedQty, UoM, UnitCost, TotalCost, FixedCost
            )
            SELECT DISTINCT
                0,
                item.Id,
                item.Id,
                NULL,
                @RootBOMId,
                NULL,
                @RootMainRefBOMId,
                0,
                7798784,
                CAST(item.Id AS NVARCHAR(MAX)),
                CAST(1 AS DECIMAL(18, 5)),
                CAST(1 AS DECIMAL(18, 5)),
                bom.UoM,
                CAST(0 AS FLOAT),
                CAST(0 AS FLOAT),
                CAST(0 AS FLOAT)
            FROM dbo.MA_ProjectArticles_Items item
            JOIN dbo.MA_ProjectArticles_BillOfMaterials bom ON bom.ItemId = item.Id AND bom.CompanyId = item.CompanyId
            WHERE item.Id = @RootItemId AND item.CompanyId = @CompanyId AND bom.Id = @RootBOMId;

            -- Utilizziamo una tabella temporanea per evitare problemi di tipo nella CTE
            DECLARE @Level INT = 0;
            DECLARE @MaxIterations INT = @MaxLevel;

            WHILE @Level < @MaxIterations
            BEGIN
                -- NUOVA LOGICA DUALE per selezione versione componenti
                INSERT INTO #TempBOMMultilevel (
                    Level, ItemId, ComponentId, ParentId, BOMId, ParentBOMId, MainRefBOMId, Line, ComponentType, 
                    Path, Quantity, CalculatedQty, UoM, UnitCost, TotalCost, FixedCost
                )
                SELECT 
                    t.Level + 1,
                    comp.ComponentId,
                    comp.ComponentId,
                    t.ItemId,
                    compBOMCorrect.BOMId,
                    t.BOMId,
                    t.MainRefBOMId,
                    comp.Line,
                    comp.ComponentType,
                    t.Path + '.' + CAST(comp.ComponentId AS NVARCHAR(MAX)),
                    comp.Quantity,
                    t.CalculatedQty * comp.Quantity,
                    comp.UoM,
                    comp.UnitCost,
                    comp.TotalCost,
                    comp.FixedCost
                FROM #TempBOMMultilevel t
                JOIN dbo.MA_ProjectArticles_BOMComponents comp ON t.BOMId = comp.BOMId AND comp.CompanyId = @CompanyId
                JOIN dbo.MA_ProjectArticles_Items item ON comp.ComponentId = item.Id AND comp.CompanyId = item.CompanyId
                -- NUOVA LOGICA: Selezione versione corretta con logica duale
                OUTER APPLY (
                    SELECT TOP 1 Id AS BOMId
                    FROM dbo.MA_ProjectArticles_BillOfMaterials bom
                    WHERE bom.ItemId = comp.ComponentId 
                      AND bom.CompanyId = @CompanyId
                      AND (
                          -- Prima verifica: esiste versione con stesso MainRefBOMId?
                          (bom.MainRefBOMId = t.MainRefBOMId 
                           AND EXISTS(SELECT 1 FROM dbo.MA_ProjectArticles_BillOfMaterials b2 
                                     WHERE b2.ItemId = comp.ComponentId 
                                       AND b2.CompanyId = @CompanyId 
                                       AND b2.MainRefBOMId = t.MainRefBOMId))
                          OR 
                          -- Se non esiste versione con stesso MainRef, usa versione base (Version = 1)
                          (bom.Version = 1 
                           AND NOT EXISTS(SELECT 1 FROM dbo.MA_ProjectArticles_BillOfMaterials b2 
                                         WHERE b2.ItemId = comp.ComponentId 
                                           AND b2.CompanyId = @CompanyId 
                                           AND b2.MainRefBOMId = t.MainRefBOMId))
                      )
                    ORDER BY 
                        CASE 
                            WHEN bom.MainRefBOMId = t.MainRefBOMId THEN 1
                            WHEN bom.Version = 1 THEN 2
                            ELSE 3
                        END,
                        bom.Version DESC
                ) AS compBOMCorrect
                WHERE 
                    t.Level = @Level
                    AND (@IncludeDisabled = 1 OR item.Disabled = 0)
                    AND (@ExpandPhantoms = 1 OR comp.ComponentType <> 7798787)
                    AND NOT EXISTS (
                        SELECT 1 FROM #TempBOMMultilevel t2 
                        WHERE t2.ComponentId = comp.ComponentId AND t2.Path LIKE t.Path + '%'
                    );
    
                IF @@ROWCOUNT = 0
                    BREAK;

                SET @Level = @Level + 1;
            END;
            
            -- Query finale
            SELECT ml.Level, 
                ml.ItemId,
                ml.ComponentId,
                ml.BOMId,
                ml.ParentBOMId,
                ml.MainRefBOMId,
                ml.Line,
                ml.ComponentType,
                CASE 
                    WHEN ml.ComponentType = 7798784 THEN 'Articolo'
                    WHEN ml.ComponentType = 7798787 THEN 'Fantasma'
                    WHEN ml.ComponentType = 7798789 THEN 'Nota'
                    ELSE 'Altro'
                END AS ComponentTypeDescription,
                ml.Path,
                ml.Quantity,
                ml.CalculatedQty,
                ml.UoM,
                ml.UnitCost,
                ml.TotalCost,
                ml.FixedCost,
                parent.Item AS ParentItemCode,
                parent.Description AS ParentItemDescription,
                parentBOM.BOM AS ParentBOMCode,
                parentBOM.Description AS ParentBOMDescription,
                parentBOM.Version AS ParentBOMVersion,
                parentBOM.stato_erp AS parentBOMStato_erp,
                comp.Item AS ComponentItemCode,
                comp.Description AS ComponentItemDescription,
                comp.Nature AS ComponentNature,
                CASE 
                    WHEN comp.Nature = 22413314 THEN 'Acquisto'
                    WHEN comp.Nature = 22413312 THEN 'Semilavorato'
                    WHEN comp.Nature = 22413313 THEN 'Prodotto Finito'
                    ELSE 'Altro'
                END AS NatureDescription,
                comp.stato_erp AS stato_erp,
                compBOM.Id AS ComponentBOMId,
                compBOM.Version AS ComponentBOMVersion,
                compBOM.BOM AS ComponentBOMCode,
                compBOM.stato_erp AS ComponentBOMStato_erp
            FROM #TempBOMMultilevel ml
            LEFT JOIN dbo.MA_ProjectArticles_Items parent ON ml.ParentId = parent.Id AND parent.CompanyId = @CompanyId
            LEFT JOIN dbo.MA_ProjectArticles_BillOfMaterials parentBOM ON ml.ParentBOMId = parentBOM.Id AND parentBOM.CompanyId = @CompanyId
            LEFT JOIN dbo.MA_ProjectArticles_Items comp ON ml.ComponentId = comp.Id AND comp.CompanyId = @CompanyId
            LEFT JOIN dbo.MA_ProjectArticles_BillOfMaterials compBOM ON ml.BOMId = compBOM.Id AND compBOM.CompanyId = @CompanyId
            ORDER BY ml.Path;
            
            -- Se richiesto, includi anche i cicli per ogni componente semilavorato
            IF @IncludeRouting = 1
            BEGIN
                WITH UniqueBOMs AS (
                    SELECT DISTINCT 
                        ml.Level,
                        ml.ItemId,
                        ml.ComponentId,
                        ml.BOMId,
                        ml.Path
                    FROM #TempBOMMultilevel ml
                    JOIN MA_ProjectArticles_BillOfMaterials bm ON bm.Id = ml.BOMId AND bm.CompanyId = @CompanyId
                    JOIN MA_ProjectArticles_Items i ON i.Id = bm.ItemId AND i.CompanyId = bm.CompanyId
                    WHERE i.Nature != 22413314
                        AND ml.BOMId IS NOT NULL
                )
                SELECT DISTINCT
                    ub.Level,
                    ub.ItemId,
                    ub.ComponentId,
                    routing.BOMId,
                    routing.RtgStep,
                    routing.Operation,
                    routing.Notes,
                    routing.WC,
                    routing.ProcessingTime,
                    routing.SetupTime,
                    routing.NoOfProcessingWorkers,
                    routing.NoOfSetupWorkers,
                    routing.SubId,
                    routing.Supplier,
                    routing.Qty,
                    op.Description AS OperationDescription,
                    wc.Description AS WorkCenterDescription,
                    cs.CompanyName AS SupplierName,
                    CASE 
                        WHEN cs.IntercompanyId IS NOT NULL THEN 'Sì'
                        ELSE 'No'
                    END AS IsIntercompany
                FROM UniqueBOMs ub
                JOIN dbo.MA_ProjectArticles_BOMRouting routing ON ub.BOMId = routing.BOMId AND routing.CompanyId = @CompanyId
                LEFT JOIN MA_Operations op ON routing.Operation = op.Operation AND routing.CompanyId = op.CompanyId
                LEFT JOIN MA_WorkCenters wc ON routing.WC = wc.WC AND routing.CompanyId = wc.CompanyId
                LEFT JOIN MA_CustSupp cs ON routing.Supplier = cs.CustSupp AND routing.CompanyId = cs.CompanyId AND cs.CustSuppType = 3211265
                ORDER BY routing.RtgStep;

                -- Versioni Distinte
                SELECT BOM, Version
                FROM MA_ProjectArticles_BillOfMaterials T1 
                WHERE CompanyId = @CompanyId
                AND ItemId = (SELECT TOP(1) ItemId FROM MA_ProjectArticles_BillOfMaterials WHERE Id = @Id)
            END
        END
            
    END TRY
    BEGIN CATCH
        SET @ErrorCode = ERROR_NUMBER();
        SET @ErrorMessage = ERROR_MESSAGE();
    END CATCH
    
    -- Pulizia
    IF OBJECT_ID('tempdb..#TempBOMMultilevel') IS NOT NULL
        DROP TABLE #TempBOMMultilevel;
    
    IF OBJECT_ID('tempdb..#TempBOMVersions') IS NOT NULL
        DROP TABLE #TempBOMVersions;
    
    RETURN @ErrorCode;
END;
GO
/****** Object:  StoredProcedure [dbo].[MA_ProjectArticles_ImportWithSelection]    Script Date: 19/11/2025 07:46:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =====================================================
-- STORED PROCEDURE COMPLETA E SISTEMATA
-- MA_ProjectArticles_ImportWithSelection
--
-- Data: 2025-11-10
-- Descrizione: Integrazione logica semplificata per generazione codici
--              Mantiene TUTTA la funzionalità esistente
-- =====================================================

CREATE PROCEDURE [dbo].[MA_ProjectArticles_ImportWithSelection]
    @CompanyId INT,
    @UserId INT,
    @ProjectId INT,
    @SourceItem NVARCHAR(64),
    @SourceItemDescription NVARCHAR(128),
    @CreateNewBOM BIT,
    @SelectedComponents SelectedComponentsTableType READONLY,
    @SourceBOMId BIGINT = NULL,  -- NUOVO: BOMId della versione selezionata
    @SourceBOMVersion INT = NULL, -- NUOVO: Versione della BOM selezionata
    @ReturnItemId BIGINT OUTPUT,
    @ReturnBOMId BIGINT OUTPUT,
    @ImportedComponents INT OUTPUT,
    @ErrorCode INT OUTPUT,
    @ErrorMessage NVARCHAR(4000) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;


    DECLARE @CheckCode VARCHAR(64);
    DECLARE check_both_cursor CURSOR FOR
    SELECT DISTINCT ComponentItemCode FROM @SelectedComponents;

    OPEN check_both_cursor;
    FETCH NEXT FROM check_both_cursor INTO @CheckCode;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        DECLARE @CicliERP INT = 0;
        DECLARE @CicliProgetti INT = 0;

        -- Conta cicli in ERP
        SELECT @CicliERP = COUNT(*)
        FROM dbo.MA_BillOfMaterialsRouting
        WHERE BOM = @CheckCode AND CompanyId = @CompanyId;

        -- Conta cicli nel sistema progetti
        SELECT @CicliProgetti = COUNT(*)
        FROM dbo.MA_ProjectArticles_BOMRouting br
        INNER JOIN dbo.MA_ProjectArticles_BillOfMaterials bm ON br.BOMId = bm.Id AND br.CompanyId = bm.CompanyId
        INNER JOIN dbo.MA_ProjectArticles_Items i ON bm.ItemId = i.Id AND bm.CompanyId = i.CompanyId
        WHERE i.Item = @CheckCode AND i.CompanyId = @CompanyId;

        PRINT '  ' + @CheckCode + ': ' + CAST(@CicliERP AS VARCHAR) + ' cicli in ERP, ' + CAST(@CicliProgetti AS VARCHAR) + ' cicli in Progetti';

        FETCH NEXT FROM check_both_cursor INTO @CheckCode;
    END

    CLOSE check_both_cursor;
    DEALLOCATE check_both_cursor;

    -- Inizializzazione variabili di output
    SET @ErrorCode = 0;
    SET @ErrorMessage = N'';
    SET @ReturnItemId = NULL;
    SET @ReturnBOMId = NULL;
    SET @ImportedComponents = 0;

    -- Variabili locali
    DECLARE @MainItemId BIGINT;
    DECLARE @MainItemCode VARCHAR(64);
    DECLARE @ExistingItemId BIGINT;
    DECLARE @ExistingBOMId BIGINT;
    DECLARE @CurrentVersion INT;
    DECLARE @NewVersion INT;
    DECLARE @ItemNature INT;
    DECLARE @Description VARCHAR(128);
    DECLARE @ItemUoM VARCHAR(8);
    DECLARE @TranCount INT = @@TRANCOUNT;
    DECLARE @NeedCommit BIT = 0;

    -- ==== LOGICA SEMPLIFICATA: Nuove variabili ====
    DECLARE @UseSimplifiedLogic BIT = 0;
    DECLARE @CharactersToKeep INT = 7;

    -- Controlla configurazione logica semplificata
    SELECT @UseSimplifiedLogic = IsActive, @CharactersToKeep = CharactersToKeep
    FROM MA_CodingRules_SimplifiedConfig
    WHERE CompanyId = @CompanyId;

    IF @UseSimplifiedLogic IS NULL
    BEGIN
        SET @UseSimplifiedLogic = 0;
        SET @CharactersToKeep = 7;
    END

    PRINT 'Logica semplificata attiva: ' + CAST(@UseSimplifiedLogic AS VARCHAR);
    -- ==== FINE LOGICA SEMPLIFICATA ====

    -- Tabella temporanea per mappare i componenti creati
    CREATE TABLE #ComponentMapping (
        OriginalCode VARCHAR(64),
        NewItemId BIGINT,
        NewItemCode VARCHAR(64),
        Level INT,
        Path NVARCHAR(MAX),
        ParentPath NVARCHAR(MAX),
        BOMId BIGINT NULL,
        UseOriginalCode BIT
    );

    -- Tabella temporanea per gestire la gerarchia dei componenti
    CREATE TABLE #ComponentHierarchy (
        RowId INT IDENTITY(1,1),
        ComponentItemCode VARCHAR(64),
        Level INT,
        Path NVARCHAR(MAX),
        ParentPath NVARCHAR(MAX),
        UseOriginalCode BIT,
        Quantity DECIMAL(18, 5),
        ComponentType INT,
        Nature INT,
        UoM VARCHAR(10),
        ProcessOrder INT
    );

    BEGIN TRY
        -- Validazione parametri
        IF @CompanyId IS NULL OR @CompanyId <= 0
        BEGIN
            SET @ErrorCode = 1001;
            SET @ErrorMessage = N'CompanyId non valido';
            GOTO ErrorHandler;
        END

        IF @ProjectId IS NULL OR @ProjectId <= 0
        BEGIN
            SET @ErrorCode = 1002;
            SET @ErrorMessage = N'ProjectId non valido';
            GOTO ErrorHandler;
        END

        IF @SourceItem IS NULL OR @SourceItem = ''
        BEGIN
            SET @ErrorCode = 1003;
            SET @ErrorMessage = N'Codice articolo sorgente non valido';
            GOTO ErrorHandler;
        END

        -- Prepara la gerarchia dei componenti con il corretto ordine di elaborazione
        INSERT INTO #ComponentHierarchy (
            ComponentItemCode, Level, Path, ParentPath, UseOriginalCode,
            Quantity, ComponentType, Nature, UoM, ProcessOrder
        )
        SELECT
            ComponentItemCode,
            Level,
            Path,
            -- Estrai il ParentPath rimuovendo l'ultimo elemento dal Path
            CASE
                WHEN CHARINDEX('.', REVERSE(Path)) > 0
                THEN LEFT(Path, LEN(Path) - CHARINDEX('.', REVERSE(Path)))
                ELSE NULL
            END AS ParentPath,
            UseOriginalCode,
            Quantity,
            ComponentType,
            Nature,
            UoM,
            Level AS ProcessOrder
        FROM @SelectedComponents
        ORDER BY Level, Path;

        -- Inizio transazione se non ne esiste già una
        IF @TranCount = 0
        BEGIN
            BEGIN TRANSACTION;
            SET @NeedCommit = 1;
        END

        -- STEP 1: Gestione dell'articolo principale
        IF @CreateNewBOM = 1
        BEGIN
            -- Crea un nuovo articolo temporaneo
            SET @MainItemId = dbo.GetNextProjectArticleItemId(@CompanyId);

            -- ==== GENERAZIONE CODICE CONDIZIONALE (MAIN ITEM) ====
            IF @UseSimplifiedLogic = 1
            BEGIN
                -- LOGICA SEMPLIFICATA per articolo principale
                DECLARE @MainPrefix NVARCHAR(14);
                DECLARE @MainNextSequential NVARCHAR(10);
                DECLARE @MainZeroPadding NVARCHAR(14);

                SET @MainPrefix = LEFT(@SourceItem, @CharactersToKeep);

                EXEC MA_CodingRules_GetNextSimplifiedSequential
                    @CompanyId = @CompanyId,
                    @Prefix = @MainPrefix,
                    @NextSequential = @MainNextSequential OUTPUT;

                SET @MainZeroPadding = REPLICATE('0', 15 - @CharactersToKeep - LEN(@MainNextSequential));
                SET @MainItemCode = @MainPrefix + @MainZeroPadding + @MainNextSequential;

                PRINT 'Codice articolo principale generato (semplificato): ' + @SourceItem + ' -> ' + @MainItemCode;
            END
            ELSE
            BEGIN
                -- LOGICA TMP ORIGINALE per articolo principale
                SET @MainItemCode = dbo.GenerateTempItemCode(@CompanyId);
                PRINT 'Codice articolo principale generato (TMP): ' + @SourceItem + ' -> ' + @MainItemCode;
            END
            -- ==== FINE GENERAZIONE CODICE (MAIN ITEM) ====

            -- Recupera i dati dell'articolo dal gestionale
            SELECT
                @ItemNature = Nature,
                @ItemUoM = BaseUoM,
                @Description = Description
            FROM dbo.MA_Items
            WHERE Item = @SourceItem AND CompanyId = @CompanyId;

            -- Se non troviamo l'articolo nel gestionale, cerchiamo nella tabella MA_ProjectArticles_Items
            IF @ItemNature IS NULL
            BEGIN
                SELECT TOP(1)
                    @ItemNature = Nature,
                    @ItemUoM = BaseUoM,
                    @Description = Description
                FROM dbo.MA_ProjectArticles_Items
                WHERE Item = @SourceItem AND CompanyId = @CompanyId;
            END

            -- Se non troviamo nemmeno in MA_ProjectArticles_Items l'articolo, utilizziamo i valori di default
            IF @ItemNature IS NULL
            BEGIN
                SET @ItemNature = 22413313;  -- Prodotto Finito
                SET @ItemUoM = 'PZ';
                SET @Description = @SourceItemDescription
            END
			
            -- Inserisci il nuovo articolo temporaneo
            INSERT INTO dbo.MA_ProjectArticles_Items (
                Id, CompanyId, TBCreatedId, TBCreated, TBModifiedId, TBModified,
                Item, Description, Nature, BaseUoM, StatusId, stato_erp,
                CategoryId, FamilyId, MacrofamilyId, ItemTypeId, Disabled,
                Diameter, Bxh, Depth, Length, MediumRadius,
                Notes, CustomerItemReference, AliasId, fscodice, DescriptionExtension
            ) VALUES (
                @MainItemId, @CompanyId, @UserId, GETDATE(), @UserId, GETDATE(),
                @MainItemCode, @Description, @ItemNature, @ItemUoM, 1, 0,
                0, 0, 0, 0, 0,  -- Valori default per CategoryId, FamilyId, etc.
                0, '', 0, 0, 0,  -- Valori default per dimensioni
                '', '', 0, '', '' -- Valori default per altri campi
            );
		
            -- Associa l'articolo al progetto
            INSERT INTO dbo.MA_ProjectsItems (
                ProjectID, ItemId, CompanyId, TBCreated
            ) VALUES (
                @ProjectId, @MainItemId, @CompanyId, GETDATE()
            );
        END
        ELSE
        BEGIN
            -- Verifica se l'articolo esiste già nel sistema progetti
            SELECT @ExistingItemId = Id
            FROM dbo.MA_ProjectArticles_Items
            WHERE Item = @SourceItem AND CompanyId = @CompanyId;

            IF @ExistingItemId IS NULL
            BEGIN
                -- L'articolo non esiste, lo importiamo dal gestionale
                SET @MainItemId = dbo.GetNextProjectArticleItemId(@CompanyId);
                SET @MainItemCode = @SourceItem;

                -- Recupera i dati dal gestionale
                SELECT
                    @ItemNature = Nature,
                    @ItemUoM = BaseUoM,
                    @Description = Description
                FROM dbo.MA_Items
                WHERE Item = @SourceItem AND CompanyId = @CompanyId;

                IF @ItemNature IS NULL
                BEGIN
                    SET @ErrorCode = 1004;
                    SET @ErrorMessage = N'Articolo non trovato nel gestionale';
                    GOTO ErrorHandler;
                END
				
                -- Inserisci l'articolo
                INSERT INTO dbo.MA_ProjectArticles_Items (
                    Id, CompanyId, TBCreatedId, TBCreated, TBModifiedId, TBModified,
                    Item, Description, Nature, BaseUoM, StatusId, stato_erp, data_sync_erp,
                    CategoryId, FamilyId, MacrofamilyId, ItemTypeId, Disabled,
                    Diameter, Bxh, Depth, Length, MediumRadius,
                    Notes, CustomerItemReference, AliasId, fscodice, DescriptionExtension
                ) VALUES (
                    @MainItemId, @CompanyId, @UserId, GETDATE(), @UserId, GETDATE(),
                    @MainItemCode, @Description, @ItemNature, @ItemUoM, 1, 1, GETDATE(),
                    0, 0, 0, 0, 0,  -- Valori default per CategoryId, FamilyId, etc.
                    0, '', 0, 0, 0,  -- Valori default per dimensioni
                    '', '', 0, '', '' -- Valori default per altri campi
                );

                -- Associa al progetto
                IF NOT EXISTS (
                    SELECT 1 FROM dbo.MA_ProjectsItems
                    WHERE ProjectID = @ProjectId AND ItemId = @MainItemId
                )
                BEGIN
                    INSERT INTO dbo.MA_ProjectsItems (
                        ProjectID, ItemId, CompanyId, TBCreated
                    ) VALUES (
                        @ProjectId, @MainItemId, @CompanyId, GETDATE()
                    );
                END
            END
            ELSE
            BEGIN
                -- L'articolo esiste già
                SET @MainItemId = @ExistingItemId;
                SET @MainItemCode = @SourceItem;

				-- Aggiorna TBCreated, TBCreatedId, TBModified e TBModifiedId
                -- per riflettere che è stato "copiato/riutilizzato" ora
                UPDATE dbo.MA_ProjectArticles_Items
                SET TBCreatedId = @UserId,
                    TBCreated = GETDATE(),
                    TBModifiedId = @UserId,
                    TBModified = GETDATE()
                WHERE Id = @MainItemId AND CompanyId = @CompanyId;

                -- Verifica se è già associato al progetto
                IF NOT EXISTS (
                    SELECT 1 FROM dbo.MA_ProjectsItems
                    WHERE ProjectID = @ProjectId AND ItemId = @MainItemId
                )
                BEGIN
                    INSERT INTO dbo.MA_ProjectsItems (
                        ProjectID, ItemId, CompanyId, TBCreated
                    ) VALUES (
                        @ProjectId, @MainItemId, @CompanyId, GETDATE()
                    );
                END
            END
        END

        -- STEP 2: Gestione versioning della distinta base
        SELECT
            @CurrentVersion = ISNULL(MAX(Version), 0)
        FROM dbo.MA_ProjectArticles_BillOfMaterials
        WHERE ItemId = @MainItemId AND CompanyId = @CompanyId;

        -- Incrementa sempre la versione
        SET @NewVersion = @CurrentVersion + 1;

        -- Crea la nuova distinta base
        SET @ReturnBOMId = dbo.GetNextProjectArticleBOMId(@CompanyId);

        INSERT INTO dbo.MA_ProjectArticles_BillOfMaterials (
            CompanyId, Id, BOM, Description, ItemId, Version, UoM, BOMStatus,
            ProductionLot, TBCreated, TBCreatedId
        ) VALUES (
            @CompanyId, @ReturnBOMId, @MainItemCode,
            'Distinta importata da ' + @SourceItem + ' - Versione ' + CAST(@NewVersion AS VARCHAR(10)),
            @MainItemId, @NewVersion, @ItemUoM, 'BOZZA',
            1, GETDATE(), @UserId
        );

        -- Gestione corretta del path root
        DECLARE @RootPath NVARCHAR(MAX);
        -- Se abbiamo componenti, usa il primo elemento del loro path
        IF EXISTS (SELECT 1 FROM #ComponentHierarchy WHERE Level = 1)
        BEGIN
            SELECT TOP 1 @RootPath =
                CASE
                    WHEN CHARINDEX('.', Path) > 0
                    THEN LEFT(Path, CHARINDEX('.', Path) - 1)
                    ELSE Path
                END
            FROM #ComponentHierarchy
            WHERE Level = 1;
        END
        ELSE
        BEGIN
            -- Altrimenti usa l'ID dell'articolo principale
            SET @RootPath = CAST(@MainItemId AS NVARCHAR(MAX));
        END

        -- Aggiungi l'articolo principale alla tabella di mapping
        INSERT INTO #ComponentMapping (
            OriginalCode, NewItemId, NewItemCode, Level, Path, ParentPath, BOMId, UseOriginalCode
        ) VALUES (
            @SourceItem, @MainItemId, @MainItemCode, 0, @RootPath, NULL, @ReturnBOMId, 0
        );

        -- STEP 3: Elaborazione dei componenti in ordine gerarchico
        DECLARE @CurrentRowId INT;
        DECLARE @CurrentCode VARCHAR(64);
        DECLARE @CurrentLevel INT;
        DECLARE @CurrentPath NVARCHAR(MAX);
        DECLARE @CurrentParentPath NVARCHAR(MAX);
        DECLARE @UseOriginalCode BIT;
        DECLARE @CurrentQuantity DECIMAL(18, 5);
        DECLARE @CurrentComponentType INT;
        DECLARE @CurrentNature INT;
        DECLARE @CurrentUoM VARCHAR(10);
        DECLARE @NewComponentId BIGINT;
        DECLARE @NewComponentCode VARCHAR(64);
        DECLARE @ParentBOMId BIGINT;
        DECLARE @ComponentLine INT;

        -- Se il cursore esiste già, chiudilo e dealloca
        IF CURSOR_STATUS('global', 'component_cursor') >= -1
        BEGIN
            IF CURSOR_STATUS('global', 'component_cursor') >= 0
                CLOSE component_cursor;
            DEALLOCATE component_cursor;
        END;

        -- Cursore per processare i componenti in ordine
		DECLARE component_cursor CURSOR FOR
		SELECT
			RowId, ComponentItemCode, Level, Path, ParentPath, UseOriginalCode,
			Quantity, ComponentType, Nature, UoM
		FROM #ComponentHierarchy
		ORDER BY ProcessOrder, Path;

		OPEN component_cursor;
		FETCH NEXT FROM component_cursor INTO
			@CurrentRowId, @CurrentCode, @CurrentLevel, @CurrentPath, @CurrentParentPath,
			@UseOriginalCode, @CurrentQuantity, @CurrentComponentType, @CurrentNature,
			@CurrentUoM;

		WHILE @@FETCH_STATUS = 0
		BEGIN
			-- Gestione speciale per componenti di livello 1
			IF @CurrentLevel = 1
			BEGIN
				SET @ParentBOMId = @ReturnBOMId; -- Usa sempre la BOM principale per il livello 1
			END
			ELSE
			BEGIN
				-- Per livelli successivi, cerca il padre
				SELECT @ParentBOMId = BOMId
				FROM #ComponentMapping
				WHERE Path = @CurrentParentPath;

				IF @ParentBOMId IS NULL
				BEGIN
					-- Se non troviamo il padre, saltiamo questo componente
					FETCH NEXT FROM component_cursor INTO
						@CurrentRowId, @CurrentCode, @CurrentLevel, @CurrentPath, @CurrentParentPath,
						@UseOriginalCode, @CurrentQuantity, @CurrentComponentType, @CurrentNature,
						@CurrentUoM;
					CONTINUE;
				END
			END

			-- Gestione differenziata per UseOriginalCode
			DECLARE @ComponentBOMId BIGINT = NULL;

            IF @UseOriginalCode = 1
			BEGIN
				-- USA IL CODICE ORIGINALE - Non crea nuove distinte
				-- Verifica se l'articolo esiste già
				SELECT @NewComponentId = Id, @NewComponentCode = Item
				FROM dbo.MA_ProjectArticles_Items
				WHERE Item = @CurrentCode AND CompanyId = @CompanyId;

				IF @NewComponentId IS NULL
				BEGIN
					-- Crea l'articolo dal gestionale
					SET @NewComponentId = dbo.GetNextProjectArticleItemId(@CompanyId);
					SET @NewComponentCode = @CurrentCode;

					-- Recupera i dati dal gestionale
					DECLARE @CompDescription VARCHAR(128);
					DECLARE @CompNature INT;
					DECLARE @CompUoM VARCHAR(8);

					SELECT
						@CompDescription = Description,
						@CompNature = Nature,
						@CompUoM = BaseUoM
					FROM dbo.MA_Items
					WHERE Item = @CurrentCode AND CompanyId = @CompanyId;

					-- Se non troviamo nel gestionale, usa i valori passati
					IF @CompDescription IS NULL
					BEGIN
						SET @CompDescription = 'Componente ' + @CurrentCode;
						SET @CompNature = @CurrentNature;
						SET @CompUoM = @CurrentUoM;
					END
					
					INSERT INTO dbo.MA_ProjectArticles_Items (
						Id, CompanyId, TBCreatedId, TBCreated, TBModifiedId, TBModified,
						Item, Description, Nature, BaseUoM, StatusId, stato_erp, data_sync_erp,
						CategoryId, FamilyId, MacrofamilyId, ItemTypeId, Disabled,
						Diameter, Bxh, Depth, Length, MediumRadius,
						Notes, CustomerItemReference, AliasId, fscodice, DescriptionExtension
					) VALUES (
						@NewComponentId, @CompanyId, @UserId, GETDATE(), @UserId, GETDATE(),
						@CurrentCode, @CompDescription, @CompNature, @CompUoM, 1, 1, GETDATE(),
						0, 0, 0, 0, 0,  -- Valori default
						0, '', 0, 0, 0,  -- Valori default
						'', '', 0, '', '' -- Valori default
					);
				END
				ELSE
				BEGIN
					-- Articolo esistente: aggiorna TBCreated, TBCreatedId, TBModified e TBModifiedId
					-- per riflettere che è stato "copiato/riutilizzato" ora
					UPDATE dbo.MA_ProjectArticles_Items
					SET TBCreatedId = @UserId,
						TBCreated = GETDATE(),
						TBModifiedId = @UserId,
						TBModified = GETDATE()
					WHERE Id = @NewComponentId AND CompanyId = @CompanyId;
				END
				SET @ComponentBOMId = NULL;
			END
			ELSE
			BEGIN
				-- CREA CODICE TEMPORANEO - Può creare nuove distinte
				SET @NewComponentId = dbo.GetNextProjectArticleItemId(@CompanyId);

				-- ==== GENERAZIONE CODICE CONDIZIONALE (COMPONENTE) ====
				IF @UseSimplifiedLogic = 1
				BEGIN
					-- LOGICA SEMPLIFICATA per componenti
					DECLARE @SPPrefix NVARCHAR(14);
					DECLARE @SPNextSequential NVARCHAR(10);
					DECLARE @SPZeroPadding NVARCHAR(14);

					SET @SPPrefix = LEFT(@CurrentCode, @CharactersToKeep);

					EXEC MA_CodingRules_GetNextSimplifiedSequential
						@CompanyId = @CompanyId,
						@Prefix = @SPPrefix,
						@NextSequential = @SPNextSequential OUTPUT;

					SET @SPZeroPadding = REPLICATE('0', 15 - @CharactersToKeep - LEN(@SPNextSequential));
					SET @NewComponentCode = @SPPrefix + @SPZeroPadding + @SPNextSequential;

					PRINT 'Codice componente generato (semplificato): ' + @CurrentCode + ' -> ' + @NewComponentCode;
				END
				ELSE
				BEGIN
					-- LOGICA TMP ORIGINALE per componenti
					SET @NewComponentCode = dbo.GenerateTempItemCode(@CompanyId);
					PRINT 'Codice componente generato (TMP): ' + @CurrentCode + ' -> ' + @NewComponentCode;
				END
				-- ==== FINE GENERAZIONE CODICE (COMPONENTE) ====

                -- Usa la descrizione dall'articolo nel sistema progetti
				DECLARE @TempDescription VARCHAR(128);

				-- Prima cerca se l'articolo esiste già in MA_ProjectArticles_Items
				SELECT @TempDescription = Description
				FROM dbo.MA_ProjectArticles_Items
				WHERE Item = @CurrentCode AND CompanyId = @CompanyId;

				-- Se non lo troviamo nel sistema progetti, proviamo nel gestionale
				IF @TempDescription IS NULL
				BEGIN
					SELECT @TempDescription = Description
					FROM dbo.MA_Items
					WHERE Item = @CurrentCode AND CompanyId = @CompanyId;
				END

				-- Se ancora non abbiamo una descrizione, usa un default
				IF @TempDescription IS NULL
					SET @TempDescription = 'Componente temporaneo';

				-- Recupera tutti gli attributi dell'articolo originale
				DECLARE @OriginalDiameter FLOAT = NULL;
				DECLARE @OriginalBxh VARCHAR(11) = NULL;
				DECLARE @OriginalDepth FLOAT = NULL;
				DECLARE @OriginalLength FLOAT = NULL;
				DECLARE @OriginalMediumRadius FLOAT = NULL;
				DECLARE @OriginalNotes NVARCHAR(MAX) = NULL;
				DECLARE @OriginalCategoryId BIGINT = NULL;
				DECLARE @OriginalFamilyId BIGINT = NULL;
				DECLARE @OriginalMacrofamilyId BIGINT = NULL;
				DECLARE @OriginalItemTypeId BIGINT = NULL;
				DECLARE @OriginalDescriptionExtension VARCHAR(512) = NULL;

				-- Recupera gli attributi dall'articolo nel gestionale
				SELECT
					@OriginalDiameter = Diameter,
					@OriginalBxh = Bxh,
					@OriginalDepth = Depth,
					@OriginalLength = Length,
					@OriginalMediumRadius = MediumRadius,
					@OriginalNotes = CAST(Notes AS NVARCHAR(MAX)),
					@OriginalCategoryId = CategoryId,
					@OriginalFamilyId = FamilyId,
					@OriginalMacrofamilyId = MacrofamilyId,
					@OriginalItemTypeId = ItemTypeId,
					@OriginalDescriptionExtension = DescriptionExtension
				FROM dbo.MA_ProjectArticles_Items
				WHERE Item = @CurrentCode AND CompanyId = @CompanyId;
				
				IF NOT EXISTS ( SELECT * FROM MA_ProjectArticles_Items WHERE Item = @NewComponentCode AND CompanyId = @CompanyId )
					BEGIN
						-- Inserisci il componente temporaneo con tutti gli attributi
						INSERT INTO dbo.MA_ProjectArticles_Items (
							Id, CompanyId, TBCreatedId, TBCreated, TBModifiedId, TBModified,
							Item, Description, Nature, BaseUoM, StatusId, stato_erp,
							Diameter, Bxh, Depth, Length, MediumRadius, Notes,
							CategoryId, FamilyId, MacrofamilyId, ItemTypeId, DescriptionExtension,
							CustomerItemReference, AliasId, fscodice, Disabled
						) VALUES (
							@NewComponentId, @CompanyId, @UserId, GETDATE(), @UserId, GETDATE(),
							@NewComponentCode, @TempDescription, @CurrentNature, @CurrentUoM, 1, 0,
							ISNULL(@OriginalDiameter, 0),
							ISNULL(@OriginalBxh, ''),
							ISNULL(@OriginalDepth, 0),
							ISNULL(@OriginalLength, 0),
							ISNULL(@OriginalMediumRadius, 0),
							ISNULL(@OriginalNotes, ''),
							ISNULL(@OriginalCategoryId, 0),
							ISNULL(@OriginalFamilyId, 0),
							ISNULL(@OriginalMacrofamilyId, 0),
							ISNULL(@OriginalItemTypeId, 0),
							ISNULL(@OriginalDescriptionExtension, ''),
							'', 0, '', 0
						);
					END
				ELSE
				BEGIN  
					-- Componente esiste già, recupera il suo ID  <--- AGGIUNGI QUESTO
					SELECT @NewComponentId = Id  
					FROM dbo.MA_ProjectArticles_Items 
					WHERE Item = @NewComponentCode AND CompanyId = @CompanyId; 
        
					
				END 

				-- Per componenti temporanei, crea la distinta se ha figli
				IF @CurrentNature <> 22413314 AND EXISTS (SELECT 1 FROM #ComponentHierarchy WHERE ParentPath = @CurrentPath)
				BEGIN
					SET @ComponentBOMId = dbo.GetNextProjectArticleBOMId(@CompanyId);

					INSERT INTO dbo.MA_ProjectArticles_BillOfMaterials (
						CompanyId, Id, BOM, Description, ItemId, Version, UoM, BOMStatus,
						ProductionLot, TBCreated, TBCreatedId
					) VALUES (
						@CompanyId, @ComponentBOMId, @NewComponentCode,
						'Distinta per ' + @TempDescription,
						@NewComponentId, 1, @CurrentUoM, 'BOZZA',
						1, GETDATE(), @UserId
					);
				END
			END

            -- NUOVA SEZIONE: Recupera il costo per componenti di acquisto
			DECLARE @ImportComponentUnitCost DECIMAL(18,6) = 0;

			-- Verifica se il componente è di acquisto
			IF @CurrentNature = 22413314
			BEGIN
				-- Usa sempre il codice originale per recuperare il costo
				EXEC dbo.SP_GetERPItemCost
					@CompanyId = @CompanyId,
					@ItemCode = @CurrentCode, -- Codice originale del componente
					@Cost = @ImportComponentUnitCost OUTPUT;
			END
			-- FINE NUOVA SEZIONE

			-- Aggiungi il componente alla distinta del padre
			SELECT @ComponentLine = ISNULL(MAX(Line), 0) + 1
			FROM dbo.MA_ProjectArticles_BOMComponents
			WHERE BOMId = @ParentBOMId AND CompanyId = @CompanyId;

			INSERT INTO dbo.MA_ProjectArticles_BOMComponents (
				CompanyId, BOMId, Line, ComponentId, ComponentType, Quantity,
				UnitCost, UoM, Details, TBCreated, TBCreatedId
			) VALUES (
				@CompanyId, @ParentBOMId, @ComponentLine, @NewComponentId,
				@CurrentComponentType, @CurrentQuantity,
				@ImportComponentUnitCost, -- Usa il costo recuperato (0 se non è acquisto)
				@CurrentUoM,
				'Importato da ' + @CurrentCode, GETDATE(), @UserId
			);

			SET @ImportedComponents = @ImportedComponents + 1;

			-- Aggiungi alla tabella di mapping
				INSERT INTO #ComponentMapping (
					OriginalCode, NewItemId, NewItemCode, Level, Path, ParentPath, BOMId, UseOriginalCode
				) VALUES (
					@CurrentCode, @NewComponentId, @NewComponentCode,
					@CurrentLevel, @CurrentPath, @CurrentParentPath, @ComponentBOMId, @UseOriginalCode
				);

				FETCH NEXT FROM component_cursor INTO
					@CurrentRowId, @CurrentCode, @CurrentLevel, @CurrentPath, @CurrentParentPath,
					@UseOriginalCode, @CurrentQuantity, @CurrentComponentType, @CurrentNature,
					@CurrentUoM;
			END

			CLOSE component_cursor;
			DEALLOCATE component_cursor;

        -- STEP 4: Importazione cicli per l'articolo principale (LIVELLO 0)

        -- Prima verifica se ci sono cicli nell'ERP per l'articolo principale
        DECLARE @MainCyclesERP INT;
        SELECT @MainCyclesERP = COUNT(*)
        FROM dbo.MA_BillOfMaterialsRouting
        WHERE BOM = @SourceItem AND CompanyId = @CompanyId;

        IF @MainCyclesERP > 0
        BEGIN
            PRINT '  Trovati ' + CAST(@MainCyclesERP AS VARCHAR) + ' cicli in ERP per articolo principale';

            -- Importa i cicli dal gestionale ERP per l'articolo principale
            INSERT INTO dbo.MA_ProjectArticles_BOMRouting (
                CompanyId, RtgStep, BOMId, Operation, Notes, WC, ProcessingTime,
                SetupTime, SubId, Supplier, Qty, TBCreated, TBModified,
                TBCreatedID, TBModifiedID
            )
            SELECT
                @CompanyId,
                RtgStep,
                @ReturnBOMId,  -- BOM dell'articolo principale
                Operation,
                Notes,
                WC,
                ProcessingTime,
                SetupTime,
                SubId,
                Supplier,
                1,  -- Qty default
                GETDATE(),
                GETDATE(),
                @UserId,
                @UserId
            FROM dbo.MA_BillOfMaterialsRouting
            WHERE BOM = @SourceItem AND CompanyId = @CompanyId
            ORDER BY RtgStep;

            PRINT '  Cicli importati da ERP per articolo principale: ' + CAST(@@ROWCOUNT AS VARCHAR);
        END
        ELSE
        BEGIN
            -- Se non ci sono cicli nell'ERP, cerca nel sistema progetti
            DECLARE @MainSourceBOMId BIGINT;

            -- Trova la BOM sorgente nel sistema progetti per l'articolo principale
            SELECT TOP 1 @MainSourceBOMId = bm.Id
            FROM dbo.MA_ProjectArticles_BillOfMaterials bm
            INNER JOIN dbo.MA_ProjectArticles_Items i ON bm.ItemId = i.Id AND bm.CompanyId = i.CompanyId
            WHERE i.Item = @SourceItem AND i.CompanyId = @CompanyId
            AND EXISTS (
                SELECT 1 FROM dbo.MA_ProjectArticles_BOMRouting
                WHERE BOMId = bm.Id AND CompanyId = bm.CompanyId
            )
            ORDER BY bm.Version DESC;

            IF @MainSourceBOMId IS NOT NULL
            BEGIN
                PRINT '  Trovati cicli nel sistema progetti per articolo principale (BOMId: ' + CAST(@MainSourceBOMId AS VARCHAR) + ')';

                -- Copia i cicli dal sistema progetti per l'articolo principale
                INSERT INTO dbo.MA_ProjectArticles_BOMRouting (
                    CompanyId, RtgStep, BOMId, Operation, Notes, WC, ProcessingTime,
                    SetupTime, SubId, Supplier, Qty, TBCreated, TBModified,
                    TBCreatedID, TBModifiedID
                )
                SELECT
                    @CompanyId,
                    RtgStep,
                    @ReturnBOMId,  -- Nuova BOM di destinazione per l'articolo principale
                    Operation,
                    Notes,
                    WC,
                    ProcessingTime,
                    SetupTime,
                    SubId,
                    Supplier,
                    Qty,
                    GETDATE(),
                    GETDATE(),
                    @UserId,
                    @UserId
                FROM dbo.MA_ProjectArticles_BOMRouting
                WHERE BOMId = @MainSourceBOMId AND CompanyId = @CompanyId
                ORDER BY RtgStep;

				PRINT '  Cicli copiati dal sistema progetti per articolo principale: ' + CAST(@@ROWCOUNT AS VARCHAR);
            END
            ELSE
            BEGIN
                PRINT '  Nessun ciclo trovato né in ERP né nel sistema progetti per articolo principale';
            END
        END

        -- STEP 5: Importazione cicli per TUTTI i componenti (LIVELLO > 0)
        -- Cerca prima in MA_BillOfMaterialsRouting (ERP) poi in MA_ProjectArticles_BOMRouting
        DECLARE @ComponentOriginalCode VARCHAR(64);
        DECLARE @ComponentNewId BIGINT;
        DECLARE @ComponentNewCode VARCHAR(64);
        DECLARE @ComponentBOMIdForCycles BIGINT;

        -- Cursore per tutti i componenti mappati
        DECLARE cycles_cursor CURSOR FOR
        SELECT cm.OriginalCode, cm.NewItemId, cm.NewItemCode
        FROM #ComponentMapping cm
        WHERE cm.Level > 0  -- Solo i componenti, non l'articolo principale
        AND (
            -- Cerca cicli nell'ERP
            EXISTS (
                SELECT 1 FROM dbo.MA_BillOfMaterialsRouting
                WHERE BOM = cm.OriginalCode AND CompanyId = @CompanyId
            )
            OR
            -- Cerca cicli già importati nel sistema progetti
            EXISTS (
                SELECT 1
                FROM dbo.MA_ProjectArticles_BOMRouting br
                INNER JOIN dbo.MA_ProjectArticles_BillOfMaterials bm ON br.BOMId = bm.Id AND br.CompanyId = bm.CompanyId
                INNER JOIN dbo.MA_ProjectArticles_Items i ON bm.ItemId = i.Id AND bm.CompanyId = i.CompanyId
                WHERE i.Item = cm.OriginalCode AND i.CompanyId = @CompanyId
            )
        );

        OPEN cycles_cursor;
        FETCH NEXT FROM cycles_cursor INTO @ComponentOriginalCode, @ComponentNewId, @ComponentNewCode;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            PRINT '';
            PRINT 'Importazione cicli per componente:';
            PRINT '  Original: ' + @ComponentOriginalCode;
            PRINT '  New: ' + @ComponentNewCode;

            -- Verifica se il componente ha già una distinta
            SET @ComponentBOMIdForCycles = NULL;

            SELECT TOP 1 @ComponentBOMIdForCycles = Id
            FROM dbo.MA_ProjectArticles_BillOfMaterials
            WHERE ItemId = @ComponentNewId AND CompanyId = @CompanyId
            ORDER BY Version DESC;

            -- Se non ha una distinta, la creiamo
            IF @ComponentBOMIdForCycles IS NULL
            BEGIN
                SET @ComponentBOMIdForCycles = dbo.GetNextProjectArticleBOMId(@CompanyId);

                -- Recupera UoM del componente
                DECLARE @ComponentUoMForCycles VARCHAR(8);
                SELECT @ComponentUoMForCycles = BaseUoM
                FROM dbo.MA_ProjectArticles_Items
                WHERE Id = @ComponentNewId;

                INSERT INTO dbo.MA_ProjectArticles_BillOfMaterials (
                    CompanyId, Id, BOM, Description, ItemId, Version, UoM, BOMStatus,
                    ProductionLot, TBCreated, TBCreatedId
                ) VALUES (
                    @CompanyId, @ComponentBOMIdForCycles, @ComponentNewCode,
                    'Distinta con cicli importati da ' + @ComponentOriginalCode,
                    @ComponentNewId, 1, @ComponentUoMForCycles, 'BOZZA',
                    1, GETDATE(), @UserId
                );

                PRINT '  Creata nuova distinta con ID: ' + CAST(@ComponentBOMIdForCycles AS VARCHAR);
            END
            ELSE
            BEGIN
                PRINT '  Usa distinta esistente con ID: ' + CAST(@ComponentBOMIdForCycles AS VARCHAR);
            END

            -- Verifica se ci sono cicli nell'ERP
            DECLARE @CicliInERP INT;
            SELECT @CicliInERP = COUNT(*)
            FROM dbo.MA_BillOfMaterialsRouting
            WHERE BOM = @ComponentOriginalCode AND CompanyId = @CompanyId;

            IF @CicliInERP > 0
            BEGIN
                PRINT '  Trovati ' + CAST(@CicliInERP AS VARCHAR) + ' cicli in ERP';

                -- Importa i cicli dal gestionale ERP
                INSERT INTO dbo.MA_ProjectArticles_BOMRouting (
                    CompanyId, RtgStep, BOMId, Operation, Notes, WC, ProcessingTime,
                    SetupTime, SubId, Supplier, Qty, TBCreated, TBModified,
                    TBCreatedID, TBModifiedID
                )
                SELECT
                    @CompanyId,
                    RtgStep,
                    @ComponentBOMIdForCycles,
                    Operation,
                    Notes,
                    WC,
                    ProcessingTime,
                    SetupTime,
                    SubId,
                    Supplier,
                    1,  -- Qty default
                    GETDATE(),
                    GETDATE(),
                    @UserId,
                    @UserId
                FROM dbo.MA_BillOfMaterialsRouting
                WHERE BOM = @ComponentOriginalCode AND CompanyId = @CompanyId
                ORDER BY RtgStep;

                PRINT '  Cicli importati da ERP: ' + CAST(@@ROWCOUNT AS VARCHAR);
            END
            ELSE
            BEGIN
                -- Se non ci sono cicli nell'ERP, cerca nel sistema progetti

                -- Trova la BOM sorgente nel sistema progetti
                SELECT TOP 1 @SourceBOMId = bm.Id
                FROM dbo.MA_ProjectArticles_BillOfMaterials bm
                INNER JOIN dbo.MA_ProjectArticles_Items i ON bm.ItemId = i.Id AND bm.CompanyId = i.CompanyId
                WHERE i.Item = @ComponentOriginalCode AND i.CompanyId = @CompanyId
                AND EXISTS (
                    SELECT 1 FROM dbo.MA_ProjectArticles_BOMRouting
                    WHERE BOMId = bm.Id AND CompanyId = bm.CompanyId
                )
                ORDER BY bm.Version DESC;

                IF @SourceBOMId IS NOT NULL
                BEGIN
                    PRINT '  Trovati cicli nel sistema progetti (BOMId: ' + CAST(@SourceBOMId AS VARCHAR) + ')';

                    -- Copia i cicli dal sistema progetti
                    INSERT INTO dbo.MA_ProjectArticles_BOMRouting (
                        CompanyId, RtgStep, BOMId, Operation, Notes, WC, ProcessingTime,
                        SetupTime, SubId, Supplier, Qty, TBCreated, TBModified,
                        TBCreatedID, TBModifiedID
                    )
                    SELECT
                        @CompanyId,
                        RtgStep,
                        @ComponentBOMIdForCycles,  -- Nuova BOM di destinazione
                        Operation,
                        Notes,
                        WC,
                        ProcessingTime,
                        SetupTime,
                        SubId,
                        Supplier,
                        Qty,
                        GETDATE(),
                        GETDATE(),
                        @UserId,
                        @UserId
                    FROM dbo.MA_ProjectArticles_BOMRouting
                    WHERE BOMId = @SourceBOMId AND CompanyId = @CompanyId
                    ORDER BY RtgStep;

                    PRINT '  Cicli copiati dal sistema progetti: ' + CAST(@@ROWCOUNT AS VARCHAR);
                END
                ELSE
                BEGIN
                    PRINT '  Nessun ciclo trovato né in ERP né nel sistema progetti';
                END
            END

            FETCH NEXT FROM cycles_cursor INTO @ComponentOriginalCode, @ComponentNewId, @ComponentNewCode;
        END

        CLOSE cycles_cursor;
        DEALLOCATE cycles_cursor;

        -- STEP 6: Importazione dei cicli di lavorazione dal gestionale per articoli con codice originale
        -- Solo per articoli con codice originale che hanno già una BOM (questo è il vecchio codice per compatibilità)
        DECLARE @ImportItemCode VARCHAR(64);
        DECLARE @ImportBOMId BIGINT;

        -- Se abbiamo un BOMId specifico, usalo direttamente per caricare la struttura
        IF @SourceBOMId IS NOT NULL
        BEGIN
            -- Usa il BOMId specifico per caricare la struttura
            -- Questo bypassa la logica di selezione automatica della versione
            SET @ImportBOMId = @SourceBOMId;

            -- Verifica che il BOMId esista e appartenga alla company
            IF NOT EXISTS (
                SELECT 1 FROM dbo.MA_ProjectArticles_BillOfMaterials
                WHERE Id = @SourceBOMId AND CompanyId = @CompanyId
            )
            BEGIN
                SET @ErrorCode = 10;
                SET @ErrorMessage = N'BOMId specificato non trovato o non appartenente alla company.';
                RETURN;
            END

            -- Carica la struttura BOM usando il BOMId specifico
            -- (qui potresti aggiungere logica per caricare i componenti dalla versione specifica)
        END

        DECLARE routing_cursor CURSOR FOR
        SELECT DISTINCT cm.OriginalCode, cm.BOMId
        FROM #ComponentMapping cm
        WHERE cm.BOMId IS NOT NULL
        AND cm.Level > 0  -- Escludiamo l'articolo principale perché già gestito sopra
        AND EXISTS (
            SELECT 1 FROM dbo.MA_BillOfMaterialsRouting
            WHERE BOM = cm.OriginalCode AND CompanyId = @CompanyId
        );

        OPEN routing_cursor;
        FETCH NEXT FROM routing_cursor INTO @ImportItemCode, @ImportBOMId;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Verifica se non abbiamo già importato i cicli per questa BOM
            IF NOT EXISTS (
                SELECT 1 FROM dbo.MA_ProjectArticles_BOMRouting
                WHERE BOMId = @ImportBOMId AND CompanyId = @CompanyId
            )
            BEGIN
                -- Importa i cicli dal gestionale
                INSERT INTO dbo.MA_ProjectArticles_BOMRouting (
                    CompanyId, RtgStep, BOMId, Operation, Notes, WC, ProcessingTime,
                    SetupTime, SubId, Supplier, Qty, TBCreated, TBModified,
                    TBCreatedID, TBModifiedID
                )
                SELECT
                    @CompanyId,
                    RtgStep,
                    @ImportBOMId,
                    Operation,
                    Notes,
                    WC,
                    ProcessingTime,
                    SetupTime,
                    SubId,
                    Supplier,
                    1,
                    GETDATE(),
                    GETDATE(),
                    @UserId,
                    @UserId
                FROM dbo.MA_BillOfMaterialsRouting
                WHERE BOM = @ImportItemCode AND CompanyId = @CompanyId;
            END

            FETCH NEXT FROM routing_cursor INTO @ImportItemCode, @ImportBOMId;
        END

        CLOSE routing_cursor;
        DEALLOCATE routing_cursor;

        -- Imposta l'output dell'articolo principale
        SET @ReturnItemId = @MainItemId;



        -- Commit della transazione se l'abbiamo iniziata
        IF @NeedCommit = 1 AND @TranCount = 0
            COMMIT TRANSACTION;

    END TRY
    BEGIN CATCH
        -- Rollback in caso di errore
        IF @NeedCommit = 1 AND @TranCount = 0
            ROLLBACK TRANSACTION;

        -- Cattura l'errore
        SET @ErrorCode = ERROR_NUMBER();
        SET @ErrorMessage = ERROR_MESSAGE();
        SET @ReturnItemId = NULL;
        SET @ReturnBOMId = NULL;
        SET @ImportedComponents = 0;


    END CATCH

ErrorHandler:
    -- Pulizia tabelle temporanee
    DROP TABLE IF EXISTS #ComponentMapping;
    DROP TABLE IF EXISTS #ComponentHierarchy;

    RETURN @ErrorCode;
END;
GO
