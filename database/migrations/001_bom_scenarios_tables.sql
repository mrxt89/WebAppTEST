-- =============================================
-- File   : 001_bom_scenarios_tables.sql
-- Scopo  : Crea le tabelle per la gestione degli scenari BOM
-- Note   : Ogni scenario è legato a un BOMId specifico (versione).
--          Non sono previste operazioni di aggiunta/rimozione componenti:
--          gli scenari consentono solo l'override di valori esistenti.
-- =============================================

-- =============================================
-- MA_BOM_Scenarios  –  testata dello scenario
-- =============================================
CREATE TABLE [dbo].[MA_BOM_Scenarios] (
    [Id]          BIGINT         IDENTITY(1,1) NOT NULL,
    [CompanyId]   INT            NOT NULL,
    [BOMId]       BIGINT         NOT NULL,         -- BOMId root (versione specifica)
    [Title]       NVARCHAR(200)  NOT NULL,
    [Description] NVARCHAR(MAX)  NULL,
    [CreatedBy]   INT            NULL,
    [CreatedAt]   DATETIME       NOT NULL
        CONSTRAINT [DF_MA_BOM_Scenarios_CreatedAt] DEFAULT GETDATE(),

    CONSTRAINT [PK_MA_BOM_Scenarios]
        PRIMARY KEY CLUSTERED ([Id] ASC)
);

CREATE NONCLUSTERED INDEX [IX_MA_BOM_Scenarios_BOMId]
    ON [dbo].[MA_BOM_Scenarios] ([CompanyId] ASC, [BOMId] ASC);

-- =============================================
-- MA_BOM_ScenarioDetails  –  righe di override dello scenario
--
-- RowType = 'C'  →  override componente
--                   AncestralPath identifica l'occorrenza nel multilevel
--                   (corrisponde al campo Path di SP_CalculateBOMCosting,
--                    es. "rootItemId.componentId.subComponentId")
--
-- RowType = 'R'  →  override operazione di routing
--                   BOMId_Rt + RtgStep identificano l'operazione
--
-- Tutti i campi di override accettano NULL = "usa il valore ufficiale della BOM"
-- =============================================
CREATE TABLE [dbo].[MA_BOM_ScenarioDetails] (
    [Id]                BIGINT         IDENTITY(1,1) NOT NULL,
    [ScenarioId]        BIGINT         NOT NULL,
    [CompanyId]         INT            NOT NULL,
    [RowType]           CHAR(1)        NOT NULL,    -- 'C' = componente, 'R' = routing

    -- Identificatore occorrenza componente nel multilevel (usato quando RowType = 'C')
    [AncestralPath]     NVARCHAR(500)  NULL,

    -- Identificatore operazione routing (usato quando RowType = 'R')
    [BOMId_Rt]          BIGINT         NULL,
    [RtgStep]           SMALLINT       NULL,

    -- Override componente (NULL = usa valore ufficiale BOM)
    [Quantity_Sc]       DECIMAL(18,5)  NULL,
    [UnitCost_Sc]       FLOAT          NULL,
    [FixedCost_Sc]      FLOAT          NULL,
    -- IsBuy = 1: tratta il semilavorato come acquistato; usa UnitCost_Sc come prezzo
    --            e azzera il contributo di tutti i sotto-componenti e routing del ramo
    [IsBuy]             BIT            NOT NULL
        CONSTRAINT [DF_MA_BOM_ScenarioDetails_IsBuy] DEFAULT 0,

    -- Override routing (NULL = usa valore ufficiale BOM)
    [ProcessingTime_Sc] INT            NULL,        -- secondi
    [SetupTime_Sc]      INT            NULL,        -- secondi
    [Qty_Sc]            FLOAT          NULL,

    [Notes]             NVARCHAR(MAX)  NULL,
    [ModifiedAt]        DATETIME       NOT NULL
        CONSTRAINT [DF_MA_BOM_ScenarioDetails_ModifiedAt] DEFAULT GETDATE(),

    CONSTRAINT [PK_MA_BOM_ScenarioDetails]
        PRIMARY KEY CLUSTERED ([Id] ASC),

    CONSTRAINT [FK_MA_BOM_ScenarioDetails_Scenario]
        FOREIGN KEY ([ScenarioId])
        REFERENCES [dbo].[MA_BOM_Scenarios] ([Id])
        ON DELETE CASCADE,

    CONSTRAINT [CHK_MA_BOM_ScenarioDetails_RowType]
        CHECK ([RowType] IN ('C', 'R'))
);

-- Indice unico filtrato per override componente (un override per occorrenza per scenario)
CREATE UNIQUE NONCLUSTERED INDEX [IX_MA_BOM_ScenarioDetails_Component]
    ON [dbo].[MA_BOM_ScenarioDetails] ([ScenarioId] ASC, [AncestralPath] ASC)
    WHERE [AncestralPath] IS NOT NULL;

-- Indice unico filtrato per override routing (un override per step per scenario)
CREATE UNIQUE NONCLUSTERED INDEX [IX_MA_BOM_ScenarioDetails_Routing]
    ON [dbo].[MA_BOM_ScenarioDetails] ([ScenarioId] ASC, [BOMId_Rt] ASC, [RtgStep] ASC)
    WHERE [BOMId_Rt] IS NOT NULL AND [RtgStep] IS NOT NULL;
