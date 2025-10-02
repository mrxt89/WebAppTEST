-- =============================================
-- Creazione tabelle per Dati Noti e Formule
-- =============================================

-- Tabella per i dati noti (parametri di calcolo)
DROP TABLE IF EXISTS MA_BOMCostingKnownData
CREATE TABLE MA_BOMCostingKnownData (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    CompanyId INT NOT NULL,
    ItemCode VARCHAR(64) NULL, -- Codice articolo/operazione (può essere NULL per match solo su descrizione)
    ItemDescription NVARCHAR(255), -- Descrizione per riferimento
    DataType VARCHAR(20) NOT NULL, -- 'MATERIAL' o 'OPERATION'
    ParameterName VARCHAR(50) NOT NULL, -- '€/kg', 'kg/mt', '€/mm', etc.
    ParameterValue DECIMAL(18,6) NOT NULL,
    UnitOfMeasure VARCHAR(10), -- '€/kg', 'kg/mt', 'mm', etc.
    Description NVARCHAR(255), -- Descrizione del parametro
    IsActive BIT DEFAULT 1,
    TBCreated DATETIME2 DEFAULT GETDATE(),
    TBModified DATETIME2 DEFAULT GETDATE(),
    TBCreatedID INT,
    TBModifiedID INT,
    
    -- Indici per performance
    INDEX IX_MA_BOMCostingKnownData_Company_Item (CompanyId, ItemCode),
    INDEX IX_MA_BOMCostingKnownData_Company_Type (CompanyId, DataType)
);

-- Tabella per le formule di calcolo
DROP TABLE IF EXISTS MA_BOMCostingFormulas
CREATE TABLE MA_BOMCostingFormulas (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    CompanyId INT NOT NULL,
    ItemCode VARCHAR(64) NULL, -- Codice articolo/operazione (può essere NULL per match solo su descrizione)
    ItemDescription NVARCHAR(255), -- Descrizione per riferimento
    DataType VARCHAR(20) NOT NULL, -- 'MATERIAL' o 'OPERATION'
    FormulaName VARCHAR(100) NOT NULL, -- 'TUBO_COST', 'SALDATURA_COST', etc.
    FormulaExpression VARCHAR(MAX) NOT NULL, -- '€/kg * kg/mt * L * QTA'
    ResultUnit VARCHAR(10) NOT NULL, -- '€', '€/mt', '€/pz', etc.
    Description NVARCHAR(255), -- Descrizione della formula
    IsActive BIT DEFAULT 1,
    TBCreated DATETIME2 DEFAULT GETDATE(),
    TBModified DATETIME2 DEFAULT GETDATE(),
    TBCreatedID INT,
    TBModifiedID INT,
    
    -- Indici per performance
    INDEX IX_MA_BOMCostingFormulas_Company_Item (CompanyId, ItemCode),
    INDEX IX_MA_BOMCostingFormulas_Company_Type (CompanyId, DataType)
);

-- Tabella per le regole di matching (per gestire match parziali e tag)
DROP TABLE IF EXISTS MA_BOMCostingMatchingRules
CREATE TABLE MA_BOMCostingMatchingRules (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    CompanyId INT NOT NULL,
    ItemCode VARCHAR(64) NULL, -- Codice specifico (può essere NULL per match solo su descrizione)
    ItemDescription NVARCHAR(255), -- Descrizione completa
    DataType VARCHAR(20) NOT NULL, -- 'MATERIAL' o 'OPERATION' - AGGIUNTO
    MatchingType VARCHAR(20) NOT NULL, -- 'EXACT', 'CONTAINS', 'TAG'
    MatchingValue VARCHAR(255) NOT NULL, -- Valore per il match
    Priority INT DEFAULT 0, -- Priorità (più alto = più specifico)
    IsActive BIT DEFAULT 1,
    TBCreated DATETIME2 DEFAULT GETDATE(),
    TBModified DATETIME2 DEFAULT GETDATE(),
    TBCreatedID INT,
    TBModifiedID INT,
    
    -- Indici per performance
    INDEX IX_MA_BOMCostingMatchingRules_Company_Type (CompanyId, MatchingType),
    INDEX IX_MA_BOMCostingMatchingRules_Company_Priority (CompanyId, Priority DESC)
);

-- Inserimento dati di esempio
PRINT 'Inserimento dati di esempio...';

-- Dati noti per TUBO
INSERT INTO MA_BOMCostingKnownData (CompanyId, ItemCode, ItemDescription, DataType, ParameterName, ParameterValue, UnitOfMeasure, Description) VALUES
(1, 'TUBO', 'TUBO GENERICO', 'MATERIAL', '€/kg', 6.00, '€/kg', 'Costo per chilogrammo del tubo'),
(1, 'TUBO', 'TUBO GENERICO', 'MATERIAL', 'kg/mt', 3.00, 'kg/mt', 'Peso per metro del tubo');

-- Formula per TUBO
INSERT INTO MA_BOMCostingFormulas (CompanyId, ItemCode, ItemDescription, DataType, FormulaName, FormulaExpression, ResultUnit, Description) VALUES
(1, 'TUBO', 'TUBO GENERICO', 'MATERIAL', 'TUBO_COST', '€/kg * kg/mt * L * QTA', '€/mt', 'Costo tubo per metro');

-- Dati noti per Saldatura
INSERT INTO MA_BOMCostingKnownData (CompanyId, ItemCode, ItemDescription, DataType, ParameterName, ParameterValue, UnitOfMeasure, Description) VALUES
(1, 'SALDATURA', 'SALDATURA GENERICA', 'OPERATION', '€/mm', 0.015, '€/mm', 'Costo per millimetro di saldatura');

-- Formula per Saldatura
INSERT INTO MA_BOMCostingFormulas (CompanyId, ItemCode, ItemDescription, DataType, FormulaName, FormulaExpression, ResultUnit, Description) VALUES
(1, 'SALDATURA', 'SALDATURA GENERICA', 'OPERATION', 'SALDATURA_COST', '€/mm * L * QTA', '€/pz', 'Costo saldatura per pezzo');

-- Dati noti per Barra
INSERT INTO MA_BOMCostingKnownData (CompanyId, ItemCode, ItemDescription, DataType, ParameterName, ParameterValue, UnitOfMeasure, Description) VALUES
(1, 'BARRA', 'BARRA GENERICA', 'MATERIAL', '€/kg', 4.00, '€/kg', 'Costo per chilogrammo della barra'),
(1, 'BARRA', 'BARRA GENERICA', 'MATERIAL', 'kg/mt', 1.2, 'kg/mt', 'Peso per metro della barra');

-- Formula per Barra
INSERT INTO MA_BOMCostingFormulas (CompanyId, ItemCode, ItemDescription, DataType, FormulaName, FormulaExpression, ResultUnit, Description) VALUES
(1, 'BARRA', 'BARRA GENERICA', 'MATERIAL', 'BARRA_COST', '€/kg * kg/mt * L * QTA', '€/mt', 'Costo barra per metro');

-- Regole di matching di esempio
INSERT INTO MA_BOMCostingMatchingRules (CompanyId, ItemCode, ItemDescription, DataType, MatchingType, MatchingValue, Priority) VALUES
(1, 'TUBO', 'TUBO GENERICO', 'MATERIAL', 'CONTAINS', 'TUBO', 10),
(1, 'TUBO_ACCIAIO_2MM', 'TUBO IN ACCIAIO SPESSORE 2MM', 'MATERIAL', 'TAG', 'TUBO_ACCIAIO_2MM', 20),
(1, 'SALDATURA', 'SALDATURA GENERICA', 'OPERATION', 'CONTAINS', 'SALDATURA', 10),
(1, 'BARRA', 'BARRA GENERICA', 'MATERIAL', 'CONTAINS', 'BARRA', 10);

PRINT 'Tabelle create con successo!';
PRINT 'Dati di esempio inseriti.';
