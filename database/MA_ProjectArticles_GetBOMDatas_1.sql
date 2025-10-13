
ALTER PROCEDURE [dbo].[MA_ProjectArticles_GetBOMDatas]
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
            -- Recupera il MainRefBOMId per la logica duale
            DECLARE @SummaryMainRefBOMId BIGINT;
            SELECT @SummaryMainRefBOMId = ISNULL(MainRefBOMId, Id)
            FROM dbo.MA_ProjectArticles_BillOfMaterials
            WHERE Id = @Id AND CompanyId = @CompanyId;

            -- Summary dei componenti intercompany (acquisto)
            WITH PurchaseIntercompany AS (
                SELECT
                    comp.ComponentId,
                    item.Item AS ComponentCode,
                    item.Description AS ComponentDescription,
                    cs.IntercompanyId AS TargetCompanyId,
                    targetComp.Description AS TargetCompanyName,
                    'ACQUISTO' AS Type,
                    cs.CustSupp AS SupplierCode,
                    cs.CompanyName AS SupplierName
                FROM dbo.MA_ProjectArticles_BOMComponents comp
                INNER JOIN dbo.MA_ProjectArticles_Items item
                    ON comp.ComponentId = item.Id AND comp.CompanyId = item.CompanyId
                LEFT JOIN dbo.MA_Items maItem
                    ON item.Item = maItem.Item AND item.CompanyId = maItem.CompanyId
                LEFT JOIN dbo.MA_ItemsGoodsData goodsData
                    ON maItem.Item = goodsData.Item AND maItem.CompanyId = goodsData.CompanyId
                LEFT JOIN dbo.MA_ItemSuppliers itemSupp
                    ON goodsData.Supplier = itemSupp.Supplier
                    AND maItem.Item = itemSupp.Item
                    AND maItem.CompanyId = itemSupp.CompanyId
                LEFT JOIN dbo.MA_CustSupp cs
                    ON itemSupp.Supplier = cs.CustSupp
                    AND itemSupp.CompanyId = cs.CompanyId
                    AND cs.CustSuppType = 3211265
                LEFT JOIN dbo.AR_Companies targetComp
                    ON cs.IntercompanyId = targetComp.CompanyId
                WHERE comp.BOMId = @Id
                  AND comp.CompanyId = @CompanyId
                  AND maItem.Nature = 22413314
                  AND cs.IntercompanyId IS NOT NULL
            ),
            -- Summary delle fasi di conto lavoro intercompany
            SubcontractingIntercompany AS (
                SELECT DISTINCT
                    comp.ComponentId,
                    item.Item AS ComponentCode,
                    item.Description AS ComponentDescription,
                    cs.IntercompanyId AS TargetCompanyId,
                    targetComp.Description AS TargetCompanyName,
                    'CONTO_LAVORO' AS Type,
                    cs.CustSupp AS SupplierCode,
                    cs.CompanyName AS SupplierName
                FROM dbo.MA_ProjectArticles_BOMComponents comp
                INNER JOIN dbo.MA_ProjectArticles_Items item
                    ON comp.ComponentId = item.Id AND comp.CompanyId = item.CompanyId
                LEFT JOIN (
                    SELECT
                        ItemId, Id AS BOMId, CompanyId,
                        ROW_NUMBER() OVER(
                            PARTITION BY ItemId
                            ORDER BY CASE WHEN MainRefBOMId = @SummaryMainRefBOMId THEN 1 ELSE 2 END, Version DESC
                        ) AS rn
                    FROM dbo.MA_ProjectArticles_BillOfMaterials
                    WHERE CompanyId = @CompanyId
                      AND (MainRefBOMId = @SummaryMainRefBOMId OR Version = 1)
                ) compBOM
                    ON compBOM.ItemId = comp.ComponentId
                    AND compBOM.CompanyId = comp.CompanyId
                    AND compBOM.rn = 1
                LEFT JOIN dbo.MA_ProjectArticles_BOMRouting routing
                    ON routing.BOMId = compBOM.BOMId AND routing.CompanyId = comp.CompanyId
                LEFT JOIN dbo.MA_WorkCenters wc
                    ON routing.WC = wc.WC AND routing.CompanyId = wc.CompanyId
                LEFT JOIN dbo.MA_CustSupp cs
                    ON wc.Supplier = cs.CustSupp
                    AND wc.CompanyId = cs.CompanyId
                    AND cs.CustSuppType = 3211265
                LEFT JOIN dbo.AR_Companies targetComp
                    ON cs.IntercompanyId = targetComp.CompanyId
                WHERE comp.BOMId = @Id
                  AND comp.CompanyId = @CompanyId
                  AND cs.IntercompanyId IS NOT NULL
                  AND wc.Supplier IS NOT NULL
                  AND wc.Supplier <> ''
            ),
            -- Union dei due tipi
            AllIntercompany AS (
                SELECT
                    ComponentId,
                    ComponentCode,
                    ComponentDescription,
                    TargetCompanyId,
                    TargetCompanyName,
                    Type,
                    SupplierCode,
                    SupplierName
                FROM PurchaseIntercompany
                UNION
                SELECT
                    ComponentId,
                    ComponentCode,
                    ComponentDescription,
                    TargetCompanyId,
                    TargetCompanyName,
                    Type,
                    SupplierCode,
                    SupplierName
                FROM SubcontractingIntercompany
            )
            -- Prima query: dettaglio componenti
            SELECT
                ComponentId,
                ComponentCode,
                ComponentDescription,
                TargetCompanyId,
                TargetCompanyName,
                Type,
                SupplierCode,
                SupplierName
            FROM AllIntercompany
            ORDER BY Type, ComponentCode;

            -- Seconda query: count summary per tipo (ridefinisce le CTE)
            WITH PurchaseIntercompany2 AS (
                SELECT
                    cs.IntercompanyId AS TargetCompanyId,
                    targetComp.Description AS TargetCompanyName,
                    'ACQUISTO' AS Type
                FROM dbo.MA_ProjectArticles_BOMComponents comp
                INNER JOIN dbo.MA_ProjectArticles_Items item
                    ON comp.ComponentId = item.Id AND comp.CompanyId = item.CompanyId
                LEFT JOIN dbo.MA_Items maItem
                    ON item.Item = maItem.Item AND item.CompanyId = maItem.CompanyId
                LEFT JOIN dbo.MA_ItemsGoodsData goodsData
                    ON maItem.Item = goodsData.Item AND maItem.CompanyId = goodsData.CompanyId
                LEFT JOIN dbo.MA_ItemSuppliers itemSupp
                    ON goodsData.Supplier = itemSupp.Supplier
                    AND maItem.Item = itemSupp.Item
                    AND maItem.CompanyId = itemSupp.CompanyId
                LEFT JOIN dbo.MA_CustSupp cs
                    ON itemSupp.Supplier = cs.CustSupp
                    AND itemSupp.CompanyId = cs.CompanyId
                    AND cs.CustSuppType = 3211265
                LEFT JOIN dbo.AR_Companies targetComp
                    ON cs.IntercompanyId = targetComp.CompanyId
                WHERE comp.BOMId = @Id
                  AND comp.CompanyId = @CompanyId
                  AND maItem.Nature = 22413314
                  AND cs.IntercompanyId IS NOT NULL
            ),
            SubcontractingIntercompany2 AS (
                SELECT DISTINCT
                    cs.IntercompanyId AS TargetCompanyId,
                    targetComp.Description AS TargetCompanyName,
                    'CONTO_LAVORO' AS Type
                FROM dbo.MA_ProjectArticles_BOMComponents comp
                INNER JOIN dbo.MA_ProjectArticles_Items item
                    ON comp.ComponentId = item.Id AND comp.CompanyId = item.CompanyId
                LEFT JOIN (
                    SELECT
                        ItemId, Id AS BOMId, CompanyId,
                        ROW_NUMBER() OVER(
                            PARTITION BY ItemId
                            ORDER BY CASE WHEN MainRefBOMId = @SummaryMainRefBOMId THEN 1 ELSE 2 END, Version DESC
                        ) AS rn
                    FROM dbo.MA_ProjectArticles_BillOfMaterials
                    WHERE CompanyId = @CompanyId
                      AND (MainRefBOMId = @SummaryMainRefBOMId OR Version = 1)
                ) compBOM
                    ON compBOM.ItemId = comp.ComponentId
                    AND compBOM.CompanyId = comp.CompanyId
                    AND compBOM.rn = 1
                LEFT JOIN dbo.MA_ProjectArticles_BOMRouting routing
                    ON routing.BOMId = compBOM.BOMId AND routing.CompanyId = comp.CompanyId
                LEFT JOIN dbo.MA_WorkCenters wc
                    ON routing.WC = wc.WC AND routing.CompanyId = wc.CompanyId
                LEFT JOIN dbo.MA_CustSupp cs
                    ON wc.Supplier = cs.CustSupp
                    AND wc.CompanyId = cs.CompanyId
                    AND cs.CustSuppType = 3211265
                LEFT JOIN dbo.AR_Companies targetComp
                    ON cs.IntercompanyId = targetComp.CompanyId
                WHERE comp.BOMId = @Id
                  AND comp.CompanyId = @CompanyId
                  AND cs.IntercompanyId IS NOT NULL
                  AND wc.Supplier IS NOT NULL
                  AND wc.Supplier <> ''
            )
            SELECT
                Type,
                TargetCompanyId,
                TargetCompanyName,
                COUNT(*) AS ComponentCount
            FROM (
                SELECT Type, TargetCompanyId, TargetCompanyName FROM PurchaseIntercompany2
                UNION ALL
                SELECT Type, TargetCompanyId, TargetCompanyName FROM SubcontractingIntercompany2
            ) combined
            GROUP BY Type, TargetCompanyId, TargetCompanyName
            ORDER BY Type, TargetCompanyName;
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