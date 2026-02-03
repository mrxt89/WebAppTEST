USE [WebAppTEST]
GO

-- =============================================
-- Fix per le stored procedures di collegamento documenti
-- per includere anche gli articoli dei progetti
-- =============================================

-- 1. LinkDocumentToNotification: Aggiungi supporto per ItemId (articoli progetti)
-- =============================================
ALTER PROCEDURE [dbo].[LinkDocumentToNotification]
    @NotificationId int,
    @CompanyId int,
    @DocumentType varchar(50),
    @BOM varchar(50) = NULL,
    @ProjectID int = 0,
    @TaskID int = 0,
    @MOId int = 0,
    @SaleOrdId int = 0,
    @SerialNo varchar(50) = NULL,
    @PurchaseOrdId int = 0,
    @SaleDocId int = 0,
    @PurchaseDocId int = 0,
    @ItemCode varchar(21) = NULL,
    @ItemId bigint = NULL,  -- NUOVO: per articoli progetti
    @CustSuppType int = 0,
    @CustSuppCode varchar(12) = NULL,
    @ReferenceId int = 0,
    @ComponentCode varchar(50) = NULL,
    @SourceCompanyId int = 0,
    @TargetCompanyId int = 0
AS
BEGIN
    SET NOCOUNT ON;

    -- Verificare se la notifica esiste
    IF NOT EXISTS (SELECT 1 FROM AR_Notifications WHERE notificationId = @NotificationId)
    BEGIN
        RAISERROR('Notifica non trovata', 16, 1);
        RETURN;
    END

    -- Verificare se l'azienda esiste
    IF NOT EXISTS (SELECT 1 FROM AR_Companies WHERE CompanyId = @CompanyId AND IsActive = 1)
    BEGIN
        RAISERROR('Azienda non trovata o non attiva', 16, 1);
        RETURN;
    END

    -- Se ItemId è specificato ma ItemCode no, recupera l'ItemCode dall'ItemId
    IF @DocumentType = 'Item' AND @ItemId IS NOT NULL AND @ItemId > 0 AND @ItemCode IS NULL
    BEGIN
        SELECT @ItemCode = Item
        FROM MA_ProjectArticles_Items
        WHERE Id = @ItemId AND CompanyId = @CompanyId;
        
        IF @ItemCode IS NULL
        BEGIN
            RAISERROR('Articolo progetto non trovato con ItemId specificato', 16, 1);
            RETURN;
        END
    END

    -- Verifica che almeno un identificatore di documento sia specificato
    IF @DocumentType = 'MO' AND @MOId = 0
        RAISERROR('Per documenti di tipo MO, specificare un MOId valido', 16, 1);
    ELSE IF @DocumentType = 'SaleOrd' AND @SaleOrdId = 0
        RAISERROR('Per documenti di tipo SaleOrd, specificare un SaleOrdId valido', 16, 1);
    ELSE IF @DocumentType = 'PurchaseOrd' AND @PurchaseOrdId = 0
        RAISERROR('Per documenti di tipo PurchaseOrd, specificare un PurchaseOrdId valido', 16, 1);
    ELSE IF @DocumentType = 'SaleDoc' AND @SaleDocId = 0
        RAISERROR('Per documenti di tipo SaleDoc, specificare un SaleDocId valido', 16, 1);
    ELSE IF @DocumentType = 'PurchaseDoc' AND @PurchaseDocId = 0
        RAISERROR('Per documenti di tipo PurchaseDoc, specificare un PurchaseDocId valido', 16, 1);
    ELSE IF @DocumentType = 'Item' AND @ItemCode IS NULL AND @ItemId IS NULL
        RAISERROR('Per documenti di tipo Item, specificare un ItemCode o ItemId valido', 16, 1);
    ELSE IF @DocumentType = 'CustSupp' AND (@CustSuppCode IS NULL OR @CustSuppType = 0)
        RAISERROR('Per documenti di tipo CustSupp, specificare CustSuppCode e CustSuppType validi', 16, 1);
    ELSE IF @DocumentType = 'BillOfMaterials' AND @BOM IS NULL
        RAISERROR('Per documenti di tipo BillOfMaterials, specificare un BOM valido', 16, 1);
    ELSE IF @DocumentType = 'Task' AND @TaskID = 0
        RAISERROR('Per documenti di tipo Task, specificare un TaskID valido', 16, 1);
    ELSE IF @DocumentType = 'Project' AND @ProjectID = 0
        RAISERROR('Per documenti di tipo Project, specificare un ProjectID valido', 16, 1);
    ELSE IF @DocumentType = 'IntercompanyReference' AND @ReferenceId = 0
        RAISERROR('Per documenti di tipo IntercompanyReference, specificare un ReferenceId valido', 16, 1);

    -- Dichiarazione variabili per gestire il risultato
    DECLARE @LinkId int;
    DECLARE @ProjectLinked bit = 0;
    DECLARE @ActualProjectID int;

    -- Se stiamo collegando una Task, verifichiamo se dobbiamo collegare anche il progetto
    IF @DocumentType = 'Task' AND @TaskID > 0
    BEGIN
        -- Recupera il ProjectID della task se non è stato passato
        IF @ProjectID = 0
        BEGIN
            SELECT @ActualProjectID = ProjectID
            FROM MA_ProjectTasks
            WHERE TaskID = @TaskID;
        END
        ELSE
        BEGIN
            SET @ActualProjectID = @ProjectID;
        END

        -- Verifica se il progetto è già collegato alla notifica
        IF @ActualProjectID IS NOT NULL AND @ActualProjectID > 0
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM AR_NotificationLinks
                WHERE NotificationID = @NotificationId
                  AND CompanyId = @CompanyId
                  AND DocumentType = 'Project'
                  AND ProjectID = @ActualProjectID
            )
            BEGIN
                -- Il progetto non è collegato, lo colleghiamo
                INSERT INTO AR_NotificationLinks (
                    NotificationID, CompanyId, DocumentType, BOM, ProjectID, TaskID,
                    MOId, SaleOrdId, SerialNo, PurchaseOrdId, SaleDocId, PurchaseDocId,
                    ItemCode, CustSuppType, CustSuppCode,
                    ReferenceId, ComponentCode, SourceCompanyId, TargetCompanyId
                )
                VALUES (
                    @NotificationId, @CompanyId, 'Project', NULL, @ActualProjectID, 0,
                    0, 0, NULL, 0, 0, 0,
                    NULL, 0, NULL,
                    NULL, NULL, NULL, NULL
                );

                SET @ProjectLinked = 1;
            END
        END

        -- Aggiorna il @ProjectID per il collegamento della task
        SET @ProjectID = @ActualProjectID;
    END

    -- Inserisci il collegamento principale
    INSERT INTO AR_NotificationLinks (
        NotificationID, CompanyId, DocumentType, BOM, ProjectID, TaskID,
        MOId, SaleOrdId, SerialNo, PurchaseOrdId, SaleDocId, PurchaseDocId,
        ItemCode, CustSuppType, CustSuppCode,
        ReferenceId, ComponentCode, SourceCompanyId, TargetCompanyId
    )
    VALUES (
        @NotificationId, @CompanyId, @DocumentType, @BOM, @ProjectID, @TaskID,
        @MOId, @SaleOrdId, @SerialNo, @PurchaseOrdId, @SaleDocId, @PurchaseDocId,
        @ItemCode, @CustSuppType, @CustSuppCode,
        @ReferenceId, @ComponentCode, @SourceCompanyId, @TargetCompanyId
    );

    SET @LinkId = SCOPE_IDENTITY();

    -- Restituisci lo stato di successo e il LinkId appena creato
    IF @ProjectLinked = 1
    BEGIN
        SELECT
            1 AS Success,
            'Documento collegato con successo. Anche il progetto associato è stato collegato.' AS Message,
            @LinkId AS LinkId,
            @ProjectLinked AS ProjectAutoLinked;
    END
    ELSE
    BEGIN
        SELECT
            1 AS Success,
            'Documento collegato con successo' AS Message,
            @LinkId AS LinkId,
            @ProjectLinked AS ProjectAutoLinked;
    END
END
GO

-- 2. UnlinkDocumentFromNotification: Aggiungi supporto per ItemId
-- =============================================
ALTER PROCEDURE [dbo].[UnlinkDocumentFromNotification]
    @NotificationId int,
    @CompanyId int,
    @DocumentType varchar(50) = NULL,
    @LinkId int = NULL,
    @BOM varchar(50) = NULL,
    @MOId int = 0,
    @SaleOrdId int = 0,
    @PurchaseOrdId int = 0,
    @SaleDocId int = 0,
    @PurchaseDocId int = 0,
    @ItemCode varchar(21) = NULL,
    @ItemId bigint = NULL,  -- NUOVO: per articoli progetti
    @CustSuppType int = 0,
    @CustSuppCode varchar(12) = NULL,
    @ProjectID int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Verificare se la notifica esiste
    IF NOT EXISTS (SELECT 1 FROM AR_Notifications WHERE notificationId = @NotificationId)
    BEGIN
        RAISERROR('Notifica non trovata', 16, 1);
        RETURN;
    END
    
    -- Se ItemId è specificato, recupera l'ItemCode
    IF @ItemId IS NOT NULL AND @ItemId > 0 AND @ItemCode IS NULL
    BEGIN
        SELECT @ItemCode = Item
        FROM MA_ProjectArticles_Items
        WHERE Id = @ItemId AND CompanyId = @CompanyId;
    END
    
    -- Verificare se esiste almeno un criterio di ricerca
    IF @LinkId IS NULL AND @DocumentType IS NULL AND
       @BOM IS NULL AND @MOId = 0 AND @SaleOrdId = 0 AND 
       @PurchaseOrdId = 0 AND @SaleDocId = 0 AND @PurchaseDocId = 0 AND
       @ItemCode IS NULL AND @CustSuppCode IS NULL AND @ProjectID IS NULL
    BEGIN
        RAISERROR('Specificare almeno un criterio per identificare il documento da scollegare', 16, 1);
        RETURN;
    END
    
    -- Costruisci la condizione di cancellazione
    DECLARE @DeletedCount int = 0;
    
    -- Se è stato specificato un LinkId (identificativo univoco del collegamento)
    IF @LinkId IS NOT NULL
    BEGIN
        DELETE FROM AR_NotificationLinks 
        WHERE LinkId = @LinkId AND NotificationID = @NotificationId AND CompanyId = @CompanyId;
        
        SET @DeletedCount = @@ROWCOUNT;
    END
    ELSE
    BEGIN
        -- Altrimenti usa le altre condizioni
        DELETE FROM AR_NotificationLinks 
        WHERE NotificationID = @NotificationId 
          AND CompanyId = @CompanyId
          AND (@DocumentType IS NULL OR DocumentType = @DocumentType)
          AND (@BOM IS NULL OR BOM = @BOM)
          AND (@MOId = 0 OR MOId = @MOId)
          AND (@SaleOrdId = 0 OR SaleOrdId = @SaleOrdId)
          AND (@PurchaseOrdId = 0 OR PurchaseOrdId = @PurchaseOrdId)
          AND (@SaleDocId = 0 OR SaleDocId = @SaleDocId)
          AND (@PurchaseDocId = 0 OR PurchaseDocId = @PurchaseDocId)
          AND (@ItemCode IS NULL OR ItemCode = @ItemCode)
          AND (@CustSuppCode IS NULL OR (CustSuppCode = @CustSuppCode AND CustSuppType = @CustSuppType))
          AND (@ProjectID IS NULL OR (ProjectID = @ProjectID))
        
        SET @DeletedCount = @@ROWCOUNT;
    END
    
    -- Restituisci lo stato di successo
    IF @DeletedCount > 0
        SELECT 1 AS Success, 'Documento scollegato con successo' AS Message, @DeletedCount AS DocumentsUnlinked;
    ELSE
        SELECT 0 AS Success, 'Nessun documento è stato scollegato. Verifica i criteri di ricerca.' AS Message, 0 AS DocumentsUnlinked;
END
GO

-- 3. GetNotificationLinkedDocuments: Includi anche articoli progetti
-- =============================================
ALTER PROCEDURE [dbo].[GetNotificationLinkedDocuments]
    @NotificationId int,
    @CompanyId int
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Ottiene il nome del database per l'azienda specificata
    DECLARE @DatabaseName varchar(50)
    SELECT @DatabaseName = dbName 
    FROM AR_Companies 
    WHERE CompanyId = @CompanyId AND IsActive = 1
    
    -- Crea una tabella temporanea per i risultati
    CREATE TABLE #Results (
        LinkId int,
        NotificationID int,
        CompanyId int,
        DocumentType varchar(50),
        BOM varchar(50),
        ProjectID int,
        TaskID int,
        MOId int,
        SaleOrdId int,
        SerialNo varchar(50),
        PurchaseOrdId int,
        SaleDocId int,
        PurchaseDocId int,
        ItemCode varchar(21),
        CustSuppType int,
        CustSuppCode varchar(12),
        DocumentNumber varchar(100),
        DocumentDate datetime,
        DocumentDescription varchar(200)
    )
    
    -- Inserisci i dati base dalla tabella NotificationLinks
    INSERT INTO #Results (
        LinkId, NotificationID, CompanyId, DocumentType, BOM, ProjectID, TaskID,
        MOId, SaleOrdId, SerialNo, PurchaseOrdId, SaleDocId, PurchaseDocId,
        ItemCode, CustSuppType, CustSuppCode
    )
    SELECT 
        LinkId,
        NotificationID,
        CompanyId,
        DocumentType,
        BOM,
        ProjectID,
        TaskID,
        MOId,
        SaleOrdId,
        SerialNo,
        PurchaseOrdId,
        SaleDocId,
        PurchaseDocId,
        ItemCode,
        CustSuppType,
        CustSuppCode
    FROM 
        AR_NotificationLinks
    WHERE 
        NotificationID = @NotificationId
        AND CompanyId = @CompanyId
    
    -- Determina automaticamente il DocumentType per i record esistenti
    UPDATE #Results SET DocumentType = 'MO' WHERE DocumentType IS NULL AND MOId > 0
    UPDATE #Results SET DocumentType = 'SaleOrd' WHERE DocumentType IS NULL AND SaleOrdId > 0
    UPDATE #Results SET DocumentType = 'BillOfMaterials' WHERE DocumentType IS NULL AND BOM IS NOT NULL AND BOM <> ''
	
    -- Per ciascun tipo di documento, aggiorna i dettagli con query dinamiche
    IF @DatabaseName IS NOT NULL
    BEGIN
        -- Per ordini di produzione (MOId)
        IF EXISTS (SELECT 1 FROM #Results WHERE MOId > 0)
        BEGIN
            DECLARE @MOQuery nvarchar(max) = N'
            UPDATE r
            SET DocumentNumber = mo.MONo,
                DocumentDate = mo.CreationDate,
                DocumentDescription = ISNULL(it.Description, mo.BOM)
            FROM #Results r
            INNER JOIN ' + QUOTENAME(@DatabaseName) + '.dbo.MA_MO mo ON r.MOId = mo.MOId
            LEFT JOIN ' + QUOTENAME(@DatabaseName) + '.dbo.MA_Items it ON mo.BOM = it.Item
            WHERE r.MOId > 0;'
            
            BEGIN TRY
                EXEC sp_executesql @MOQuery;
            END TRY
            BEGIN CATCH
                PRINT 'Errore durante l''aggiornamento dei dati degli ordini di produzione: ' + ERROR_MESSAGE();
            END CATCH
        END
        
        -- Per ordini di vendita (SaleOrdId)
        IF EXISTS (SELECT 1 FROM #Results WHERE SaleOrdId > 0)
        BEGIN
            DECLARE @SaleOrdQuery nvarchar(max) = N'
            UPDATE r
            SET DocumentNumber = so.InternalOrdNo,
                DocumentDate = so.OrderDate,
                DocumentDescription = cs.CompanyName
            FROM #Results r
            INNER JOIN ' + QUOTENAME(@DatabaseName) + '.dbo.MA_SaleOrd so ON r.SaleOrdId = so.SaleOrdId
            LEFT JOIN ' + QUOTENAME(@DatabaseName) + '.dbo.MA_CustSupp cs ON so.Customer = cs.CustSupp AND cs.CustSuppType = 3211265
            WHERE r.SaleOrdId > 0;'
            
            BEGIN TRY
                EXEC sp_executesql @SaleOrdQuery;
            END TRY
            BEGIN CATCH
                PRINT 'Errore durante l''aggiornamento dei dati degli ordini di vendita: ' + ERROR_MESSAGE();
            END CATCH
        END
        
        -- Per ordini di acquisto (PurchaseOrdId)
        IF EXISTS (SELECT 1 FROM #Results WHERE PurchaseOrdId > 0)
        BEGIN
            DECLARE @PurchaseOrdQuery nvarchar(max) = N'
            UPDATE r
            SET DocumentNumber = po.InternalOrdNo,
                DocumentDate = po.OrderDate,
                DocumentDescription = cs.CompanyName
            FROM #Results r
            INNER JOIN ' + QUOTENAME(@DatabaseName) + '.dbo.MA_PurchaseOrd po ON r.PurchaseOrdId = po.PurchaseOrdId
            LEFT JOIN ' + QUOTENAME(@DatabaseName) + '.dbo.MA_CustSupp cs ON po.Supplier = cs.CustSupp AND cs.CustSuppType = 3211264
            WHERE r.PurchaseOrdId > 0;'
            
            BEGIN TRY
                EXEC sp_executesql @PurchaseOrdQuery;
            END TRY
            BEGIN CATCH
                PRINT 'Errore durante l''aggiornamento dei dati degli ordini di acquisto: ' + ERROR_MESSAGE();
            END CATCH
        END
        
        -- Per documenti di vendita (SaleDocId)
        IF EXISTS (SELECT 1 FROM #Results WHERE SaleDocId > 0)
        BEGIN
            DECLARE @SaleDocQuery nvarchar(max) = N'
            UPDATE r
            SET DocumentNumber = sd.DocNo,
                DocumentDate = sd.DocumentDate,
                DocumentDescription = CASE sd.DocumentType
                                         WHEN 3407873 THEN ''DDT - ''
                                         WHEN 3407874 THEN ''Fattura - ''
                                         WHEN 3407877 THEN ''Reso - ''
                                         WHEN 3407880 THEN ''C/Lavoro - ''
                                         ELSE ''''
                                      END + cs.CompanyName
            FROM #Results r
            INNER JOIN ' + QUOTENAME(@DatabaseName) + '.dbo.MA_SaleDoc sd ON r.SaleDocId = sd.SaleDocId
            LEFT JOIN ' + QUOTENAME(@DatabaseName) + '.dbo.MA_CustSupp cs ON sd.CustSupp = cs.CustSupp AND cs.CustSuppType = sd.CustSuppType
            WHERE r.SaleDocId > 0;'
            
            BEGIN TRY
                EXEC sp_executesql @SaleDocQuery;
            END TRY
            BEGIN CATCH
                PRINT 'Errore durante l''aggiornamento dei dati dei documenti di vendita: ' + ERROR_MESSAGE();
            END CATCH
        END
        
        -- Per articoli (ItemCode) - AGGIORNATO: Include sia articoli ERP che articoli progetti
        IF EXISTS (SELECT 1 FROM #Results WHERE ItemCode IS NOT NULL)
        BEGIN
            -- Prima prova a cercare negli articoli progetti (database WebAppTEST)
            UPDATE r
            SET DocumentNumber = it.Item,
                DocumentDescription = LEFT(it.Description, 200)
            FROM #Results r
            INNER JOIN MA_ProjectArticles_Items it ON r.ItemCode = it.Item AND r.CompanyId = it.CompanyId
            WHERE r.ItemCode IS NOT NULL
              AND EXISTS (SELECT 1 FROM MA_ProjectArticles_Items WHERE Item = r.ItemCode AND CompanyId = r.CompanyId);
            
            -- Poi aggiorna quelli non trovati cercando negli articoli ERP (database aziendale)
            DECLARE @ItemQuery nvarchar(max) = N'
            UPDATE r
            SET DocumentNumber = it.Item,
                DocumentDescription = LEFT(it.Description, 200)
            FROM #Results r
            INNER JOIN ' + QUOTENAME(@DatabaseName) + '.dbo.MA_Items it ON r.ItemCode = it.Item
            WHERE r.ItemCode IS NOT NULL
              AND r.DocumentNumber IS NULL;'
            
            BEGIN TRY
                EXEC sp_executesql @ItemQuery;
            END TRY
            BEGIN CATCH
                PRINT 'Errore durante l''aggiornamento dei dati degli articoli: ' + ERROR_MESSAGE();
            END CATCH
        END
        
        -- Per clienti/fornitori (CustSuppCode)
        IF EXISTS (SELECT 1 FROM #Results WHERE CustSuppCode IS NOT NULL)
        BEGIN
            DECLARE @CustSuppQuery nvarchar(max) = N'
            UPDATE r
            SET DocumentNumber = cs.CustSupp,
                DocumentDescription = LEFT(CONCAT((CASE WHEN cs.CustSuppType = 3211264 THEN ''Fornitore'' ELSE ''Cliente'' END), '' : '', cs.CompanyName),200)
            FROM #Results r
            INNER JOIN ' + QUOTENAME(@DatabaseName) + '.dbo.MA_CustSupp cs ON r.CustSuppCode COLLATE SQL_Latin1_General_CP1_CI_AS = cs.CustSupp AND r.CustSuppType = cs.CustSuppType
            WHERE r.CustSuppCode IS NOT NULL;'
            
            BEGIN TRY
                EXEC sp_executesql @CustSuppQuery;
            END TRY
            BEGIN CATCH
                PRINT 'Errore durante l''aggiornamento dei dati dei clienti/fornitori: ' + ERROR_MESSAGE();
            END CATCH
        END
        
        -- Per distinte base (BOM)
        IF EXISTS (SELECT 1 FROM #Results WHERE BOM IS NOT NULL AND BOM <> '')
        BEGIN
            DECLARE @BOMQuery nvarchar(max) = N'
            UPDATE r
            SET DocumentNumber = bom.BOM,
                DocumentDescription = LEFT(bom.Description,200)
            FROM #Results r
            INNER JOIN ' + QUOTENAME(@DatabaseName) + '.dbo.MA_BillOfMaterials bom ON r.BOM = bom.BOM
            WHERE r.BOM IS NOT NULL AND r.BOM <> '''';'
            
            BEGIN TRY
                EXEC sp_executesql @BOMQuery;
            END TRY
            BEGIN CATCH
                PRINT 'Errore durante l''aggiornamento dei dati delle distinte base: ' + ERROR_MESSAGE();
            END CATCH
        END
    END
    
    -- Progetti (database WebAppTEST)
    IF EXISTS (SELECT 1 FROM #Results WHERE ProjectID IS NOT NULL AND ProjectID > 0 AND TaskID = 0)
    BEGIN
        UPDATE r
        SET DocumentNumber = LEFT(PJ.Name, 100),
            DocumentDescription = LEFT(PJ.Description, 200),
            DocumentDate = PJ.EndDate
        FROM #Results r
        INNER JOIN MA_Projects PJ ON PJ.ProjectID = r.ProjectID
        INNER JOIN MA_ProjectStatus PS ON PS.Id = PJ.Status
        WHERE r.ProjectID IS NOT NULL AND r.ProjectID > 0 AND ISNULL(r.TaskID, 0) = 0;
    END
    
    -- Per Attività (Task) - database WebAppTEST
    IF EXISTS (SELECT 1 FROM #Results WHERE TaskID IS NOT NULL AND TaskID > 0)
    BEGIN
        UPDATE r
        SET DocumentNumber = LEFT(TK.Title, 200),
            DocumentDescription = CONCAT('Progetto: ', LEFT(PJ.Name, 90)),
            DocumentDate = TK.StartDate
        FROM #Results r
        INNER JOIN MA_ProjectTasks TK ON r.TaskID = TK.TaskID
        INNER JOIN MA_Projects PJ ON PJ.ProjectID = TK.ProjectID
        WHERE r.TaskID IS NOT NULL AND r.TaskID > 0;
    END
    
    -- Restituisci i risultati
    SELECT 
        LinkId,
        NotificationID, 
        CompanyId,
        DocumentType,
        BOM,
        ProjectID,
        TaskID,
        MOId,
        SaleOrdId,
        SerialNo,
        PurchaseOrdId,
        SaleDocId,
        PurchaseDocId,
        ItemCode,
        CustSuppType,
        CustSuppCode,
        DocumentNumber,
        DocumentDate,
        DocumentDescription
    FROM #Results;
    
    -- Elimina la tabella temporanea
    DROP TABLE #Results;
END
GO
