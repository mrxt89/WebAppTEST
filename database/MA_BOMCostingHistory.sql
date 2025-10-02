-- =============================================
-- Tabella per lo storico dei parametri di costificazione BOM
-- Ogni volta che viene eseguita una costificazione o modificati i parametri,
-- viene salvato uno snapshot dei parametri utilizzati
-- =============================================

USE [WebAppTEST]
GO

-- Crea la tabella per lo storico dei parametri di costificazione
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MA_BOMCostingHistory]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[MA_BOMCostingHistory](
        [Id] [bigint] IDENTITY(1,1) NOT NULL,
        [CompanyId] [int] NOT NULL,
        [BOMId] [bigint] NOT NULL,

        -- Parametri di costificazione salvati
        [OrderQuantity] [decimal](18, 5) NULL,
        [ScrapPercentage] [float] NULL,
        [UseGranularMarkups] [bit] NULL,
        [UpdateBOMRecord] [bit] NULL,

        -- Parametri globali di costificazione (snapshot)
        [ParametersSnapshot] [nvarchar](MAX) NULL, -- JSON con tutti i parametri al momento del calcolo

        -- Risultati della costificazione
        [RMCost] [float] NULL,
        [ProcessingCost] [float] NULL,
        [TotalCost] [float] NULL,
        [TotalPrice] [float] NULL,

        -- Metadati
        [CostingDate] [datetime2](7) NOT NULL DEFAULT GETDATE(),
        [CalculatedBy] [int] NULL, -- UserId
        [Notes] [nvarchar](MAX) NULL,

        -- Audit
        [TBCreated] [datetime] NOT NULL DEFAULT GETDATE(),
        [TBCreatedId] [int] NULL,

        CONSTRAINT [PK_MA_BOMCostingHistory] PRIMARY KEY CLUSTERED
        (
            [Id] ASC
        ) WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],

        -- Foreign Key verso BOM
        CONSTRAINT [FK_BOMCostingHistory_BOM] FOREIGN KEY([CompanyId], [BOMId])
            REFERENCES [dbo].[MA_ProjectArticles_BillOfMaterials] ([CompanyId], [Id])
            ON DELETE CASCADE
    ) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]

    -- Indici per performance
    CREATE NONCLUSTERED INDEX [IX_BOMCostingHistory_BOMId] ON [dbo].[MA_BOMCostingHistory]
    (
        [CompanyId] ASC,
        [BOMId] ASC,
        [CostingDate] DESC
    ) WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

    PRINT 'Tabella MA_BOMCostingHistory creata con successo'
END
ELSE
BEGIN
    PRINT 'Tabella MA_BOMCostingHistory già esistente'
END
GO
