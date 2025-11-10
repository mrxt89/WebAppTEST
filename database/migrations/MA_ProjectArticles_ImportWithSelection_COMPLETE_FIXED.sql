-- =====================================================
-- STORED PROCEDURE COMPLETA E SISTEMATA
-- MA_ProjectArticles_ImportWithSelection
--
-- Data: 2025-11-10
-- Descrizione: Integrazione logica semplificata per generazione codici
--              Mantiene TUTTA la funzionalità esistente
-- =====================================================

ALTER PROCEDURE [dbo].[MA_ProjectArticles_ImportWithSelection]
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
