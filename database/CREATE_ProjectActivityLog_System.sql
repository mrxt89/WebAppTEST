USE [WebAppTEST]
GO

-- =============================================
-- Sistema di Tracciabilità Attività Progetti
-- =============================================
-- Questo sistema traccia tutte le modifiche importanti ai progetti,
-- articoli, BOM, costificazioni, esportazioni, allegati, ecc.
-- =============================================

-- 1. Tabella principale per i log delle attività
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MA_ProjectActivityLog]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[MA_ProjectActivityLog](
        [LogId] [bigint] IDENTITY(1,1) NOT NULL,
        [CompanyId] [int] NOT NULL,
        [ProjectID] [int] NULL,  -- NULL se l'azione non è legata a un progetto specifico
        [UserId] [int] NOT NULL,
        [UserName] [nvarchar](255) NULL,  -- Cache del nome utente per performance
        [ActivityType] [varchar](50) NOT NULL,  -- Tipo di attività (es: 'ITEM_CREATE', 'BOM_UPDATE', 'COSTING_CALCULATE', ecc.)
        [EntityType] [varchar](50) NOT NULL,  -- Tipo di entità (es: 'Project', 'Item', 'BOM', 'Attachment', ecc.)
        [EntityId] [bigint] NULL,  -- ID dell'entità modificata (ItemId, BOMId, ecc.)
        [EntityCode] [varchar](100) NULL,  -- Codice dell'entità (ItemCode, BOMCode, ecc.)
        [Action] [varchar](50) NOT NULL,  -- Azione eseguita (CREATE, UPDATE, DELETE, EXPORT, IMPORT, LINK, UNLINK, ecc.)
        [Description] [nvarchar](max) NULL,  -- Descrizione dettagliata dell'azione
        [OldValues] [nvarchar](max) NULL,  -- JSON con i valori precedenti (per UPDATE)
        [NewValues] [nvarchar](max) NULL,  -- JSON con i valori nuovi (per UPDATE/CREATE)
        [Metadata] [nvarchar](max) NULL,  -- JSON con metadati aggiuntivi (parametri costificazione, dettagli esportazione, ecc.)
        [IPAddress] [varchar](50) NULL,  -- IP dell'utente (opzionale)
        [UserAgent] [nvarchar](500) NULL,  -- User agent del browser (opzionale)
        [Timestamp] [datetime2](7) NOT NULL DEFAULT GETDATE(),
        [IsDeleted] [bit] NOT NULL DEFAULT 0,  -- Soft delete per log
        CONSTRAINT [PK_MA_ProjectActivityLog] PRIMARY KEY CLUSTERED ([LogId] ASC)
    ) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY];
    
    -- Indici per performance
    CREATE NONCLUSTERED INDEX [IX_ProjectActivityLog_ProjectID] 
        ON [dbo].[MA_ProjectActivityLog] ([ProjectID] ASC, [Timestamp] DESC);
    
    CREATE NONCLUSTERED INDEX [IX_ProjectActivityLog_CompanyId] 
        ON [dbo].[MA_ProjectActivityLog] ([CompanyId] ASC, [Timestamp] DESC);
    
    CREATE NONCLUSTERED INDEX [IX_ProjectActivityLog_UserId] 
        ON [dbo].[MA_ProjectActivityLog] ([UserId] ASC, [Timestamp] DESC);
    
    CREATE NONCLUSTERED INDEX [IX_ProjectActivityLog_ActivityType] 
        ON [dbo].[MA_ProjectActivityLog] ([ActivityType] ASC, [Timestamp] DESC);
    
    CREATE NONCLUSTERED INDEX [IX_ProjectActivityLog_EntityType_EntityId] 
        ON [dbo].[MA_ProjectActivityLog] ([EntityType] ASC, [EntityId] ASC, [Timestamp] DESC);
    
    CREATE NONCLUSTERED INDEX [IX_ProjectActivityLog_Timestamp] 
        ON [dbo].[MA_ProjectActivityLog] ([Timestamp] DESC);
END
GO

-- 2. Stored Procedure per loggare le attività
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LogProjectActivity]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[LogProjectActivity];
GO

CREATE PROCEDURE [dbo].[LogProjectActivity]
    @CompanyId int,
    @ProjectID int = NULL,
    @UserId int,
    @ActivityType varchar(50),  -- Es: 'ITEM_CREATE', 'BOM_UPDATE', 'COSTING_CALCULATE', 'EXPORT_ITEM', ecc.
    @EntityType varchar(50),  -- Es: 'Project', 'Item', 'BOM', 'Attachment', 'Costing', 'Export', ecc.
    @EntityId bigint = NULL,
    @EntityCode varchar(100) = NULL,
    @Action varchar(50),  -- CREATE, UPDATE, DELETE, EXPORT, IMPORT, LINK, UNLINK, CALCULATE, ecc.
    @Description nvarchar(max) = NULL,
    @OldValues nvarchar(max) = NULL,  -- JSON string
    @NewValues nvarchar(max) = NULL,  -- JSON string
    @Metadata nvarchar(max) = NULL,  -- JSON string
    @IPAddress varchar(50) = NULL,
    @UserAgent nvarchar(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @UserName nvarchar(255);
    
    -- Recupera il nome utente (cache per performance)
    SELECT @UserName = FirstName + ' ' + LastName
    FROM AR_Users
    WHERE userId = @UserId;
    
    -- Inserisci il log
    INSERT INTO [dbo].[MA_ProjectActivityLog] (
        CompanyId,
        ProjectID,
        UserId,
        UserName,
        ActivityType,
        EntityType,
        EntityId,
        EntityCode,
        Action,
        Description,
        OldValues,
        NewValues,
        Metadata,
        IPAddress,
        UserAgent,
        Timestamp
    )
    VALUES (
        @CompanyId,
        @ProjectID,
        @UserId,
        @UserName,
        @ActivityType,
        @EntityType,
        @EntityId,
        @EntityCode,
        @Action,
        @Description,
        @OldValues,
        @NewValues,
        @Metadata,
        @IPAddress,
        @UserAgent,
        GETDATE()
    );
    
    -- Restituisci l'ID del log creato
    SELECT SCOPE_IDENTITY() AS LogId;
END
GO

-- 3. Stored Procedure per recuperare i log di un progetto
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[GetProjectActivityLogs]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[GetProjectActivityLogs];
GO

CREATE PROCEDURE [dbo].[GetProjectActivityLogs]
    @ProjectID int,
    @CompanyId int,
    @ActivityType varchar(50) = NULL,  -- Filtro opzionale per tipo di attività
    @EntityType varchar(50) = NULL,  -- Filtro opzionale per tipo di entità
    @StartDate datetime2 = NULL,  -- Filtro data inizio
    @EndDate datetime2 = NULL,  -- Filtro data fine
    @UserId int = NULL,  -- Filtro per utente
    @PageNumber int = 1,
    @PageSize int = 50
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset int = (@PageNumber - 1) * @PageSize;
    
    -- Query principale con filtri
    SELECT 
        l.LogId,
        l.CompanyId,
        l.ProjectID,
        l.UserId,
        l.UserName,
        l.ActivityType,
        l.EntityType,
        l.EntityId,
        l.EntityCode,
        l.Action,
        l.Description,
        l.OldValues,
        l.NewValues,
        l.Metadata,
        l.IPAddress,
        l.UserAgent,
        l.Timestamp,
        -- Informazioni aggiuntive
        p.Name AS ProjectName,
        CASE 
            WHEN l.EntityType = 'Item' THEN i.Item + ' - ' + i.Description
            WHEN l.EntityType = 'BOM' THEN bom.BOM + ' - ' + bom.Description
            WHEN l.EntityType = 'Task' THEN t.Title
            WHEN l.EntityType = 'Attachment' THEN att.FileName
            ELSE l.EntityCode
        END AS EntityDisplayName
    FROM [dbo].[MA_ProjectActivityLog] l
    LEFT JOIN [dbo].[MA_Projects] p ON l.ProjectID = p.ProjectID
    LEFT JOIN [dbo].[MA_ProjectArticles_Items] i ON l.EntityType = 'Item' AND l.EntityId = i.Id AND l.CompanyId = i.CompanyId
    LEFT JOIN [dbo].[MA_ProjectArticles_BillOfMaterials] bom ON l.EntityType = 'BOM' AND l.EntityId = bom.Id AND l.CompanyId = bom.CompanyId
    LEFT JOIN [dbo].[MA_ProjectTasks] t ON l.EntityType = 'Task' AND l.EntityId = t.TaskID
    LEFT JOIN [dbo].[MA_ItemAttachments] att ON l.EntityType = 'Attachment' AND l.EntityId = att.Id
    WHERE l.ProjectID = @ProjectID
      AND l.CompanyId = @CompanyId
      AND l.IsDeleted = 0
      AND (@ActivityType IS NULL OR l.ActivityType = @ActivityType)
      AND (@EntityType IS NULL OR l.EntityType = @EntityType)
      AND (@StartDate IS NULL OR l.Timestamp >= @StartDate)
      AND (@EndDate IS NULL OR l.Timestamp <= @EndDate)
      AND (@UserId IS NULL OR l.UserId = @UserId)
    ORDER BY l.Timestamp DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
    
    -- Conteggio totale per paginazione
    SELECT COUNT(*) AS TotalCount
    FROM [dbo].[MA_ProjectActivityLog] l
    WHERE l.ProjectID = @ProjectID
      AND l.CompanyId = @CompanyId
      AND l.IsDeleted = 0
      AND (@ActivityType IS NULL OR l.ActivityType = @ActivityType)
      AND (@EntityType IS NULL OR l.EntityType = @EntityType)
      AND (@StartDate IS NULL OR l.Timestamp >= @StartDate)
      AND (@EndDate IS NULL OR l.Timestamp <= @EndDate)
      AND (@UserId IS NULL OR l.UserId = @UserId);
END
GO

-- 4. Stored Procedure per recuperare i log di un'entità specifica (es: articolo, BOM)
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[GetEntityActivityLogs]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[GetEntityActivityLogs];
GO

CREATE PROCEDURE [dbo].[GetEntityActivityLogs]
    @CompanyId int,
    @EntityType varchar(50),
    @EntityId bigint,
    @PageNumber int = 1,
    @PageSize int = 50
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset int = (@PageNumber - 1) * @PageSize;
    
    SELECT 
        l.LogId,
        l.CompanyId,
        l.ProjectID,
        l.UserId,
        l.UserName,
        l.ActivityType,
        l.EntityType,
        l.EntityId,
        l.EntityCode,
        l.Action,
        l.Description,
        l.OldValues,
        l.NewValues,
        l.Metadata,
        l.IPAddress,
        l.UserAgent,
        l.Timestamp,
        p.Name AS ProjectName
    FROM [dbo].[MA_ProjectActivityLog] l
    LEFT JOIN [dbo].[MA_Projects] p ON l.ProjectID = p.ProjectID
    WHERE l.CompanyId = @CompanyId
      AND l.EntityType = @EntityType
      AND l.EntityId = @EntityId
      AND l.IsDeleted = 0
    ORDER BY l.Timestamp DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
    
    -- Conteggio totale
    SELECT COUNT(*) AS TotalCount
    FROM [dbo].[MA_ProjectActivityLog] l
    WHERE l.CompanyId = @CompanyId
      AND l.EntityType = @EntityType
      AND l.EntityId = @EntityId
      AND l.IsDeleted = 0;
END
GO

-- 5. Stored Procedure per statistiche attività progetto
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[GetProjectActivityStats]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[GetProjectActivityStats];
GO

CREATE PROCEDURE [dbo].[GetProjectActivityStats]
    @ProjectID int,
    @CompanyId int,
    @StartDate datetime2 = NULL,
    @EndDate datetime2 = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Statistiche per tipo di attività
    SELECT 
        ActivityType,
        COUNT(*) AS ActivityCount,
        COUNT(DISTINCT UserId) AS UniqueUsers,
        MIN(Timestamp) AS FirstActivity,
        MAX(Timestamp) AS LastActivity
    FROM [dbo].[MA_ProjectActivityLog]
    WHERE ProjectID = @ProjectID
      AND CompanyId = @CompanyId
      AND IsDeleted = 0
      AND (@StartDate IS NULL OR Timestamp >= @StartDate)
      AND (@EndDate IS NULL OR Timestamp <= @EndDate)
    GROUP BY ActivityType
    ORDER BY ActivityCount DESC;
    
    -- Statistiche per tipo di entità
    SELECT 
        EntityType,
        COUNT(*) AS EntityCount,
        COUNT(DISTINCT EntityId) AS UniqueEntities
    FROM [dbo].[MA_ProjectActivityLog]
    WHERE ProjectID = @ProjectID
      AND CompanyId = @CompanyId
      AND IsDeleted = 0
      AND (@StartDate IS NULL OR Timestamp >= @StartDate)
      AND (@EndDate IS NULL OR Timestamp <= @EndDate)
    GROUP BY EntityType
    ORDER BY EntityCount DESC;
    
    -- Statistiche per utente
    SELECT 
        UserId,
        UserName,
        COUNT(*) AS ActivityCount,
        MIN(Timestamp) AS FirstActivity,
        MAX(Timestamp) AS LastActivity
    FROM [dbo].[MA_ProjectActivityLog]
    WHERE ProjectID = @ProjectID
      AND CompanyId = @CompanyId
      AND IsDeleted = 0
      AND (@StartDate IS NULL OR Timestamp >= @StartDate)
      AND (@EndDate IS NULL OR Timestamp <= @EndDate)
    GROUP BY UserId, UserName
    ORDER BY ActivityCount DESC;
END
GO

-- 6. Tabella di configurazione per tipi di attività (opzionale, per standardizzazione)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MA_ActivityTypes]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[MA_ActivityTypes](
        [ActivityType] [varchar](50) NOT NULL,
        [Description] [nvarchar](255) NOT NULL,
        [Category] [varchar](50) NULL,  -- Es: 'Item', 'BOM', 'Project', 'Costing', 'Export', ecc.
        [IsActive] [bit] NOT NULL DEFAULT 1,
        CONSTRAINT [PK_MA_ActivityTypes] PRIMARY KEY CLUSTERED ([ActivityType] ASC)
    );
    
    -- Inserisci tipi di attività standard
    INSERT INTO [dbo].[MA_ActivityTypes] (ActivityType, Description, Category) VALUES
        -- Progetti
        ('PROJECT_CREATE', 'Creazione progetto', 'Project'),
        ('PROJECT_UPDATE', 'Modifica progetto', 'Project'),
        ('PROJECT_DELETE', 'Eliminazione progetto', 'Project'),
        ('PROJECT_STATUS_CHANGE', 'Cambio stato progetto', 'Project'),
        
        -- Articoli
        ('ITEM_CREATE', 'Creazione articolo', 'Item'),
        ('ITEM_UPDATE', 'Modifica articolo', 'Item'),
        ('ITEM_DELETE', 'Eliminazione articolo', 'Item'),
        ('ITEM_IMPORT', 'Importazione articolo da ERP', 'Item'),
        ('ITEM_EXPORT', 'Esportazione articolo a ERP', 'Item'),
        ('ITEM_LINK_PROJECT', 'Collegamento articolo a progetto', 'Item'),
        ('ITEM_UNLINK_PROJECT', 'Scollegamento articolo da progetto', 'Item'),
        ('ITEM_DISABLE', 'Disabilitazione articolo', 'Item'),
        
        -- Distinte Base
        ('BOM_CREATE', 'Creazione distinta base', 'BOM'),
        ('BOM_UPDATE', 'Modifica distinta base', 'BOM'),
        ('BOM_DELETE', 'Eliminazione distinta base', 'BOM'),
        ('BOM_COMPONENT_ADD', 'Aggiunta componente a BOM', 'BOM'),
        ('BOM_COMPONENT_UPDATE', 'Modifica componente BOM', 'BOM'),
        ('BOM_COMPONENT_DELETE', 'Rimozione componente da BOM', 'BOM'),
        ('BOM_COMPONENT_REPLACE', 'Sostituzione componente BOM', 'BOM'),
        ('BOM_VERSION_CREATE', 'Creazione nuova versione BOM', 'BOM'),
        ('BOM_COPY', 'Copia distinta base', 'BOM'),
        
        -- Costificazione
        ('COSTING_CALCULATE', 'Calcolo costificazione', 'Costing'),
        ('COSTING_PARAMS_UPDATE', 'Aggiornamento parametri costificazione', 'Costing'),
        ('COSTING_PARAMS_SAVE', 'Salvataggio parametri costificazione custom', 'Costing'),
        
        -- Esportazioni
        ('EXPORT_ITEM', 'Esportazione articolo', 'Export'),
        ('EXPORT_BOM', 'Esportazione distinta base', 'Export'),
        ('EXPORT_BATCH', 'Esportazione batch articoli/BOM', 'Export'),
        
        -- Allegati
        ('ATTACHMENT_ADD', 'Aggiunta allegato', 'Attachment'),
        ('ATTACHMENT_UPDATE', 'Modifica allegato', 'Attachment'),
        ('ATTACHMENT_DELETE', 'Eliminazione allegato', 'Attachment'),
        ('ATTACHMENT_VERSION_ADD', 'Aggiunta versione allegato', 'Attachment'),
        
        -- Attività/Task
        ('TASK_CREATE', 'Creazione attività', 'Task'),
        ('TASK_UPDATE', 'Modifica attività', 'Task'),
        ('TASK_DELETE', 'Eliminazione attività', 'Task'),
        ('TASK_STATUS_CHANGE', 'Cambio stato attività', 'Task'),
        
        -- Clienti/Fornitori
        ('CUSTOMER_ADD', 'Aggiunta cliente a progetto', 'Customer'),
        ('CUSTOMER_UPDATE', 'Modifica cliente progetto', 'Customer'),
        ('CUSTOMER_REMOVE', 'Rimozione cliente da progetto', 'Customer'),
        
        -- Intercompany
        ('INTERCOMPANY_REFERENCE_CREATE', 'Creazione riferimento intercompany', 'Intercompany'),
        ('INTERCOMPANY_REFERENCE_APPROVE', 'Approvazione riferimento intercompany', 'Intercompany'),
        ('INTERCOMPANY_REFERENCE_REJECT', 'Rifiuto riferimento intercompany', 'Intercompany');
END
GO
