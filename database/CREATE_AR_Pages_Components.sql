-- ================================================================
-- Tabella: AR_Pages_Components
-- Descrizione: Gestisce la mappatura tra pagine webapp e componenti wiki
-- Autore: Sistema Wiki Integration
-- Data: 2025-10-24
-- ================================================================

-- Verifica se la tabella esiste già
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AR_Pages_Components' AND type = 'U')
BEGIN
    CREATE TABLE AR_Pages_Components (
        componentId INT IDENTITY(1,1) PRIMARY KEY,
        pageId INT NOT NULL,
        parentComponentId INT NULL,
        componentKey NVARCHAR(100) NOT NULL,
        componentName NVARCHAR(200) NOT NULL,
        componentDescription NVARCHAR(500),
        wikiSlug NVARCHAR(500),
        sequence INT DEFAULT 0,
        iconName NVARCHAR(50),
        isActive BIT DEFAULT 1,

        -- Foreign Keys
        CONSTRAINT FK_AR_Pages_Components_Page
            FOREIGN KEY (pageId) REFERENCES AR_Pages(pageId) ON DELETE CASCADE,

        CONSTRAINT FK_AR_Pages_Components_Parent
            FOREIGN KEY (parentComponentId) REFERENCES AR_Pages_Components(componentId),

        -- Unique constraint: stessa chiave non può esistere due volte per la stessa pagina
        CONSTRAINT UK_PageComponent UNIQUE (pageId, componentKey)
    );

    PRINT 'Tabella AR_Pages_Components creata con successo';
END
ELSE
BEGIN
    PRINT 'Tabella AR_Pages_Components esiste già';
END;

-- Crea indici per migliorare le performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AR_Pages_Components_PageId' AND object_id = OBJECT_ID('AR_Pages_Components'))
BEGIN
    CREATE INDEX IX_AR_Pages_Components_PageId ON AR_Pages_Components(pageId);
    PRINT 'Indice IX_AR_Pages_Components_PageId creato';
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AR_Pages_Components_ParentId' AND object_id = OBJECT_ID('AR_Pages_Components'))
BEGIN
    CREATE INDEX IX_AR_Pages_Components_ParentId ON AR_Pages_Components(parentComponentId);
    PRINT 'Indice IX_AR_Pages_Components_ParentId creato';
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AR_Pages_Components_Sequence' AND object_id = OBJECT_ID('AR_Pages_Components'))
BEGIN
    CREATE INDEX IX_AR_Pages_Components_Sequence ON AR_Pages_Components(pageId, sequence);
    PRINT 'Indice IX_AR_Pages_Components_Sequence creato';
END;

-- Query di verifica
SELECT
    'AR_Pages_Components' AS TableName,
    COUNT(*) AS TotalRows
FROM AR_Pages_Components;

PRINT 'Script completato con successo';
