-- ================================================================================
-- FIX INTERCOMPANY - SINCRONIZZAZIONE AUTOMATICA CODICI ARTICOLO
-- ================================================================================
-- Questo script risolve il problema della sincronizzazione del codice articolo
-- tra MA_ProjectArticles_Items e MA_ProjectArticles_References
--
-- PROBLEMA:
-- Quando si modifica il codice di un articolo dalla dashboard (tab Articoli),
-- il campo TargetProjectItemCode in MA_ProjectArticles_References non viene
-- aggiornato automaticamente, causando una visualizzazione errata nella pagina
-- Intercompany.
--
-- SOLUZIONE:
-- Trigger che aggiorna automaticamente TargetProjectItemCode quando Item cambia
-- ================================================================================

USE [WebAppTEST]
GO

-- Elimina il trigger se esiste già
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_UpdateReferencesOnItemChange')
BEGIN
    DROP TRIGGER [dbo].[TR_UpdateReferencesOnItemChange];
    PRINT 'Trigger TR_UpdateReferencesOnItemChange eliminato';
END
GO

-- Crea il trigger
CREATE TRIGGER [dbo].[TR_UpdateReferencesOnItemChange]
ON [dbo].[MA_ProjectArticles_Items]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Controlla se il campo Item è stato modificato
    IF UPDATE(Item)
    BEGIN
        -- Aggiorna TargetProjectItemCode in tutte le References
        -- dove TargetProjectItemId corrisponde agli articoli modificati
        UPDATE ref
        SET
            ref.TargetProjectItemCode = i.Item,
            ref.TBModified = GETDATE(),
            ref.TBModifiedId = i.TBModifiedId
        FROM MA_ProjectArticles_References ref
        INNER JOIN inserted i ON ref.TargetProjectItemId = i.Id
                              AND ref.TargetCompanyId = i.CompanyId
        WHERE i.Item <> (SELECT Item FROM deleted d WHERE d.Id = i.Id AND d.CompanyId = i.CompanyId);

        -- Log per debug (opzionale)
        DECLARE @RowsAffected INT = @@ROWCOUNT;
        IF @RowsAffected > 0
        BEGIN
            PRINT 'Trigger TR_UpdateReferencesOnItemChange: ' + CAST(@RowsAffected AS VARCHAR(10)) + ' references aggiornate';
        END
    END
END
GO

PRINT 'Trigger TR_UpdateReferencesOnItemChange creato con successo';
PRINT '';
PRINT '================================================================================';
PRINT 'TRIGGER CREATO CON SUCCESSO!';
PRINT '';
PRINT 'Il trigger TR_UpdateReferencesOnItemChange ora sincronizzerà automaticamente';
PRINT 'il campo TargetProjectItemCode nelle References ogni volta che il codice';
PRINT 'di un articolo viene modificato in MA_ProjectArticles_Items';
PRINT '================================================================================';
GO
