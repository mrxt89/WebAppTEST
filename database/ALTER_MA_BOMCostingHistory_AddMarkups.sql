-- =============================================
-- ALTER: Aggiunge colonne per ricarichi BOM-specific
-- Questi ricarichi sovrascrivono i parametri globali quando presenti
-- =============================================

USE [WebAppTEST]
GO

-- Aggiungi colonne per ricarichi custom BOM-specific
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[MA_BOMCostingHistory]') AND name = 'CustomMarkupRM')
BEGIN
    ALTER TABLE [dbo].[MA_BOMCostingHistory]
    ADD
        -- Ricarichi custom BOM-specific (sovrascrivono i globali se presenti)
        [CustomMarkupRM] [float] NULL,                    -- Ricarico materie prime
        [CustomMarkupRMPurchase] [float] NULL,            -- Ricarico acquisti MP
        [CustomMarkupRMProduction] [float] NULL,          -- Ricarico produzione MP
        [CustomMarkupOperations] [float] NULL,            -- Ricarico lavorazioni
        [CustomMarkupInternalOps] [float] NULL,           -- Ricarico lavorazioni interne
        [CustomMarkupExternalOps] [float] NULL,           -- Ricarico lavorazioni esterne
        [CustomMarkupOverhead] [float] NULL,              -- Ricarico generale/overhead
        [CustomMarkupsJSON] [nvarchar](MAX) NULL          -- JSON per ricarichi aggiuntivi custom

    PRINT 'Colonne ricarichi custom aggiunte a MA_BOMCostingHistory'
END
ELSE
BEGIN
    PRINT 'Colonne ricarichi custom già esistenti in MA_BOMCostingHistory'
END
GO

-- Aggiungi indice per ricerca per BOMId con ricarichi custom
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[MA_BOMCostingHistory]') AND name = 'IX_BOMCostingHistory_CustomMarkups')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BOMCostingHistory_CustomMarkups]
    ON [dbo].[MA_BOMCostingHistory]
    (
        [BOMId] ASC,
        [CostingDate] DESC
    )
    INCLUDE ([CustomMarkupRM], [CustomMarkupOperations])
    WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)

    PRINT 'Indice IX_BOMCostingHistory_CustomMarkups creato'
END
ELSE
BEGIN
    PRINT 'Indice IX_BOMCostingHistory_CustomMarkups già esistente'
END
GO
