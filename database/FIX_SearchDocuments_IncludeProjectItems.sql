USE [WebAppTEST]
GO

-- Fix per includere anche gli articoli dei progetti nella ricerca
-- Gli articoli dei progetti sono in MA_ProjectArticles_Items (database WebAppTEST)
-- Gli articoli dal gestionale sono in MA_Items (database aziendale)

ALTER PROCEDURE [dbo].[SearchDocuments]
    @CompanyId int,
    @DocumentType varchar(50),
    @SearchTerm varchar(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Ottiene il nome del database per l'azienda specificata
    DECLARE @DatabaseName varchar(50)
    SELECT @DatabaseName = dbName 
    FROM AR_Companies 
    WHERE CompanyId = @CompanyId AND IsActive = 1
    
    IF @DatabaseName IS NULL
    BEGIN
        RAISERROR('Database aziendale non trovato o azienda non attiva', 16, 1);
        RETURN;
    END
    
    -- Prepara e esegue la query appropriata in base al tipo di documento
    DECLARE @SQL nvarchar(max)
   
    IF @DocumentType = 'MO' -- Ordini di produzione
    BEGIN
        SET @SQL = N'
        SELECT 
            MOId AS DocumentId,
            MONo AS DocumentNumber,
            BOM AS DocumentReference,
            CreationDate AS DocumentDate,
            ''MO'' AS DocumentType,
			'''' AS Status
        FROM ' + QUOTENAME(@DatabaseName) + '.dbo.MA_MO
        WHERE ( (MONo LIKE ''%'' + @SearchTerm + ''%'' 
            OR BOM LIKE ''%'' + @SearchTerm + ''%'') )
			AND MOStatus != 20578306
        ORDER BY CreationDate DESC';
    END
	    ELSE IF @DocumentType = 'PurchaseOrd' -- Ordini di acquisto
    BEGIN
        SET @SQL = N'
        SELECT 
            so.PurchaseOrdId AS DocumentId,
            so.InternalOrdNo AS DocumentNumber,
            cs.CompanyName AS DocumentReference,
            so.OrderDate AS DocumentDate,
            ''SaleOrd'' AS DocumentType,
			'''' AS Status
        FROM ' + QUOTENAME(@DatabaseName) + '.dbo.MA_PurchaseOrd so
        JOIN ' + QUOTENAME(@DatabaseName) + '.dbo.MA_CustSupp cs ON so.Supplier = cs.CustSupp AND cs.CustSuppType = 3211264
        WHERE (so.InternalOrdNo LIKE ''%'' + @SearchTerm + ''%'' 
            OR cs.CompanyName LIKE ''%'' + @SearchTerm + ''%''
            OR so.Supplier LIKE ''%'' + @SearchTerm + ''%'')
            AND so.Cancelled = 0 -- Escludi annullati
        ORDER BY so.OrderDate DESC';
    END
    ELSE IF @DocumentType = 'SaleOrd' -- Ordini di vendita
    BEGIN
        SET @SQL = N'
        SELECT 
            so.SaleOrdId AS DocumentId,
            so.InternalOrdNo AS DocumentNumber,
            cs.CompanyName AS DocumentReference,
            so.OrderDate AS DocumentDate,
            ''SaleOrd'' AS DocumentType,
			'''' AS Status
        FROM ' + QUOTENAME(@DatabaseName) + '.dbo.MA_SaleOrd so
        JOIN ' + QUOTENAME(@DatabaseName) + '.dbo.MA_CustSupp cs ON so.Customer = cs.CustSupp AND cs.CustSuppType = 3211265
        WHERE (so.InternalOrdNo LIKE ''%'' + @SearchTerm + ''%'' 
            OR cs.CompanyName LIKE ''%'' + @SearchTerm + ''%''
            OR so.Customer LIKE ''%'' + @SearchTerm + ''%'')
            AND so.Cancelled = 0 -- Escludi annullati
        ORDER BY so.OrderDate DESC';
    END
    ELSE IF @DocumentType = 'SaleDoc' -- Documenti di vendita
    BEGIN
        SET @SQL = N'
        SELECT 
            sd.SaleDocId AS DocumentId,
            sd.DocNo AS DocumentNumber,
            cs.CompanyName AS DocumentReference,
            sd.DocumentDate AS DocumentDate,
            ''SaleDoc'' AS DocumentType,
			'''' AS Status
        FROM ' + QUOTENAME(@DatabaseName) + '.dbo.MA_SaleDoc sd
        LEFT JOIN ' + QUOTENAME(@DatabaseName) + '.dbo.MA_CustSupp cs ON sd.CustSupp = cs.CustSupp AND cs.CustSuppType = sd.CustSuppType
        WHERE (sd.DocNo LIKE ''%'' + @SearchTerm + ''%'' 
            OR cs.CompanyName LIKE ''%'' + @SearchTerm + ''%''
            OR sd.CustSupp LIKE ''%'' + @SearchTerm + ''%'')
        ORDER BY sd.DocumentDate DESC';
    END
    ELSE IF @DocumentType = 'Item' -- Articoli (dal gestionale E dai progetti)
    BEGIN
        -- UNION tra articoli dal gestionale e articoli dai progetti
        SET @SQL = N'
        -- Articoli dal gestionale (database aziendale)
        SELECT 
            CAST(Item AS varchar(50)) AS DocumentId,
            Item AS DocumentNumber,
            Description AS DocumentReference,
            CreationDate AS DocumentDate,
            ''Item'' AS DocumentType,
            ''ERP'' AS Status,
            NULL AS ItemId  -- NULL per articoli ERP (non hanno ItemId)
        FROM ' + QUOTENAME(@DatabaseName) + '.dbo.MA_Items
        WHERE ( (Item LIKE ''%'' + @SearchTerm + ''%'' 
					OR Description LIKE ''%'' + @SearchTerm + ''%'') )
			AND Disabled = 0
        
        UNION ALL
        
        -- Articoli dai progetti (database WebAppTEST)
        SELECT 
            CAST(Id AS varchar(50)) AS DocumentId,  -- ItemId come DocumentId per articoli progetti
            Item AS DocumentNumber,
            Description AS DocumentReference,
            TBCreated AS DocumentDate,
            ''Item'' AS DocumentType,
            CASE 
                WHEN stato_erp = 1 THEN ''Esportato''
                ELSE ''Temporaneo''
            END AS Status,
            Id AS ItemId  -- ItemId per articoli progetti
        FROM dbo.MA_ProjectArticles_Items
        WHERE CompanyId = @CompanyId
            AND ( (Item LIKE ''%'' + @SearchTerm + ''%'' 
                    OR Description LIKE ''%'' + @SearchTerm + ''%''
                    OR CustomerItemReference LIKE ''%'' + @SearchTerm + ''%'') )
            AND Disabled = 0
        
        ORDER BY DocumentNumber';
    END
    ELSE IF @DocumentType = 'CustSupp' -- Clienti/Fornitori
    BEGIN
        SET @SQL = N'
        SELECT 
            CustSupp AS DocumentId,
            CustSupp AS DocumentNumber,
            CompanyName AS DocumentReference,
            NULL AS DocumentDate,
            ''CustSupp'' AS DocumentType,
            CASE CustSuppType
                WHEN 3211264 THEN ''Fornitore''
                WHEN 3211265 THEN ''Cliente''
                ELSE ''Altro''
            END AS Status
        FROM ' + QUOTENAME(@DatabaseName) + '.dbo.MA_CustSupp
        WHERE (CustSupp LIKE ''%'' + @SearchTerm + ''%'' 
            OR CompanyName LIKE ''%'' + @SearchTerm + ''%'')
            AND Disabled = ''0''
        ORDER BY CompanyName';
    END
	ELSE IF @DocumentType = 'Customer' -- Clienti
    BEGIN
        SET @SQL = N'
        SELECT 
            CustSupp AS DocumentId,
            CustSupp AS DocumentNumber,
            CompanyName AS DocumentReference,
            NULL AS DocumentDate,
            ''CustSupp'' AS DocumentType,
            CASE CustSuppType
                WHEN 3211264 THEN ''Fornitore''
                WHEN 3211265 THEN ''Cliente''
                ELSE ''Altro''
            END AS Status
        FROM ' + QUOTENAME(@DatabaseName) + '.dbo.MA_CustSupp
        WHERE (CustSupp LIKE ''%'' + @SearchTerm + ''%'' 
            OR CompanyName LIKE ''%'' + @SearchTerm + ''%'')
            AND Disabled = ''0''
			AND CustSuppType = 3211265
        ORDER BY CompanyName';
    END
	ELSE IF @DocumentType = 'Supplier' -- Fornitori
    BEGIN
        SET @SQL = N'
        SELECT 
            CustSupp AS DocumentId,
            CustSupp AS DocumentNumber,
            CompanyName AS DocumentReference,
            NULL AS DocumentDate,
            ''CustSupp'' AS DocumentType,
            CASE CustSuppType
                WHEN 3211264 THEN ''Fornitore''
                WHEN 3211265 THEN ''Cliente''
                ELSE ''Altro''
            END AS Status
        FROM ' + QUOTENAME(@DatabaseName) + '.dbo.MA_CustSupp
        WHERE (CustSupp LIKE ''%'' + @SearchTerm + ''%'' 
            OR CompanyName LIKE ''%'' + @SearchTerm + ''%'')
            AND Disabled = ''0''
			AND CustSuppType = 3211264
        ORDER BY CompanyName';
    END
    ELSE IF @DocumentType = 'BillOfMaterials' -- Distinte base
    BEGIN
        SET @SQL = N'
        SELECT 
            BOM AS DocumentId,
            BOM AS DocumentNumber,
            Description AS DocumentReference,
            CreationDate AS DocumentDate,
            ''BillOfMaterials'' AS DocumentType,
            '''' AS Status
        FROM ' + QUOTENAME(@DatabaseName) + '.dbo.MA_BillOfMaterials
        WHERE (BOM LIKE ''%'' + @SearchTerm + ''%'' 
            OR Description LIKE ''%'' + @SearchTerm + ''%'')
        ORDER BY BOM';
    END
    ELSE IF @DocumentType = 'Task' -- Attività
    BEGIN
        SET @SQL = N'
        SELECT 
            PT.TaskID AS DocumentId,
            PT.Title AS DocumentNumber,
            P.Name AS DocumentReference,
            PT.TBCreated AS DocumentDate,
            ''Task'' AS DocumentType,
            PT.Status AS Status
        FROM	MA_ProjectTasks PT
		JOIN	MA_Projects P ON P.ProjectId = PT.ProjectId
        WHERE	(	PT.Title LIKE ''%'' + @SearchTerm + ''%'' 
					OR PT.Description LIKE ''%'' + @SearchTerm + ''%''
					OR P.Name  LIKE ''%'' + @SearchTerm + ''%''
				)
        ORDER BY P.ProjectId, PT.TaskID';
    END
	ELSE IF @DocumentType = 'Project' -- Progetti
    BEGIN
        SET @SQL = N'
        SELECT 
            T0.ProjectID AS DocumentId,
            T0.ProjectERPId AS DocumentNumber,
            T0.Name AS DocumentReference,
            T0.TBCreated AS DocumentDate,
            ''Project'' AS DocumentType,
            T1.StatusDescription AS Status
        FROM	MA_Projects T0
		JOIN	MA_ProjectStatus T1 ON T1.Id = T0.Status AND T0.Disabled = 0
        WHERE (T0.Name LIKE ''%'' + @SearchTerm + ''%'' 
            OR T0.Description LIKE ''%'' + @SearchTerm + ''%'')
			OR T0.ProjectERPId = @SearchTerm 
        ORDER BY T0.ProjectID';
    END
    ELSE
    BEGIN
        RAISERROR('SQL STORED PROCEDURE SearchDocuments: Tipo di documento non supportato', 16, 1);
        RETURN;
    END
    
    -- Esegui la query
    EXEC sp_executesql @SQL, N'@SearchTerm varchar(100), @CompanyId int', @SearchTerm, @CompanyId;
END
GO
