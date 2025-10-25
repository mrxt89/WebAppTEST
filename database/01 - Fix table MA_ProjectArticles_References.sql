-- =============================================
-- 01 - Fix table MA_ProjectArticles_References
-- Aggiunge i campi SourceProjectId e TargetProjectId per tracciare i progetti Intercompany
-- Author: Claude Code
-- Date: 2025-10-25
-- =============================================


    ALTER TABLE [dbo].[MA_ProjectArticles_References]
    ADD [SourceProjectId] INT NULL;



    ALTER TABLE [dbo].[MA_ProjectArticles_References]
    ADD [TargetProjectId] INT NULL;



-- Aggiunge foreign key constraints per garantire l'integrità referenziale
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_MA_ProjectArticles_References_SourceProject]') AND parent_object_id = OBJECT_ID(N'[dbo].[MA_ProjectArticles_References]'))
BEGIN
    ALTER TABLE [dbo].[MA_ProjectArticles_References]
    ADD CONSTRAINT [FK_MA_ProjectArticles_References_SourceProject]
    FOREIGN KEY ([SourceProjectId]) REFERENCES [dbo].[MA_Projects]([ProjectID]);

    PRINT 'Foreign Key FK_MA_ProjectArticles_References_SourceProject aggiunta';
END
ELSE
BEGIN
    PRINT 'Foreign Key FK_MA_ProjectArticles_References_SourceProject già esistente';
END
GO

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_MA_ProjectArticles_References_TargetProject]') AND parent_object_id = OBJECT_ID(N'[dbo].[MA_ProjectArticles_References]'))
BEGIN
    ALTER TABLE [dbo].[MA_ProjectArticles_References]
    ADD CONSTRAINT [FK_MA_ProjectArticles_References_TargetProject]
    FOREIGN KEY ([TargetProjectId]) REFERENCES [dbo].[MA_Projects]([ProjectID]);

    PRINT 'Foreign Key FK_MA_ProjectArticles_References_TargetProject aggiunta';
END
ELSE
BEGIN
    PRINT 'Foreign Key FK_MA_ProjectArticles_References_TargetProject già esistente';
END
GO

-- Aggiunge indici per migliorare le performance delle query
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[MA_ProjectArticles_References]') AND name = N'IX_MA_ProjectArticles_References_SourceProjectId')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_MA_ProjectArticles_References_SourceProjectId]
    ON [dbo].[MA_ProjectArticles_References] ([SourceProjectId])
    INCLUDE ([TargetProjectId], [Status], [SourceCompanyId], [TargetCompanyId]);

    PRINT 'Indice IX_MA_ProjectArticles_References_SourceProjectId creato';
END
ELSE
BEGIN
    PRINT 'Indice IX_MA_ProjectArticles_References_SourceProjectId già esistente';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[MA_ProjectArticles_References]') AND name = N'IX_MA_ProjectArticles_References_TargetProjectId')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_MA_ProjectArticles_References_TargetProjectId]
    ON [dbo].[MA_ProjectArticles_References] ([TargetProjectId])
    INCLUDE ([SourceProjectId], [Status]);

    PRINT 'Indice IX_MA_ProjectArticles_References_TargetProjectId creato';
END
ELSE
BEGIN
    PRINT 'Indice IX_MA_ProjectArticles_References_TargetProjectId già esistente';
END
GO

PRINT 'Script 01 - Fix table MA_ProjectArticles_References completato con successo';
GO
