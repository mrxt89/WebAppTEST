-- Script per aggiungere la colonna Region alla tabella MA_ProjectCustomers
-- Eseguire questo script sul database per sistemare la gestione clienti

USE [YourDatabaseName]  -- Sostituire con il nome del database
GO

-- Verifica se la colonna esiste già
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[MA_ProjectCustomers]')
    AND name = 'Region'
)
BEGIN
    -- Aggiunge la colonna Region dopo Country
    ALTER TABLE [dbo].[MA_ProjectCustomers]
    ADD [Region] [varchar](32) NULL;

    PRINT 'Colonna Region aggiunta con successo!';
END
ELSE
BEGIN
    PRINT 'La colonna Region esiste già.';
END
GO

-- Aggiunge il default per la colonna Region
IF NOT EXISTS (
    SELECT * FROM sys.default_constraints
    WHERE parent_object_id = OBJECT_ID(N'[dbo].[MA_ProjectCustomers]')
    AND col_name(parent_object_id, parent_column_id) = 'Region'
)
BEGIN
    ALTER TABLE [dbo].[MA_ProjectCustomers]
    ADD DEFAULT ('') FOR [Region];

    PRINT 'Default per Region aggiunto con successo!';
END
ELSE
BEGIN
    PRINT 'Il default per Region esiste già.';
END
GO

-- Verifica finale
SELECT
    c.name AS ColumnName,
    t.name AS DataType,
    c.max_length AS MaxLength,
    c.is_nullable AS IsNullable,
    dc.definition AS DefaultValue
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
WHERE c.object_id = OBJECT_ID(N'[dbo].[MA_ProjectCustomers]')
AND c.name IN ('Country', 'Region', 'City', 'County')
ORDER BY c.column_id;

PRINT 'Verifica completata!';
GO
