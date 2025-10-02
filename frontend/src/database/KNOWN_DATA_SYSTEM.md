# 🔧 **Sistema Dati Noti per Costificazione BOM**

## 📋 **Panoramica**
Sistema completo per gestire "dati noti" (parametri di calcolo) per materiali e operazioni, con formule personalizzate per calcolare i costi delle distinte base.

## 🎯 **Obiettivo**
Permettere la definizione di parametri e formule personalizzate per calcolare i costi di materiali e operazioni, con priorità sui costi unitari standard.

## 🏗️ **Architettura del Sistema**

### **1. Tabelle Database**

#### **MA_BOMCostingKnownData**
```sql
-- Parametri di calcolo per articoli/operazioni
CREATE TABLE MA_BOMCostingKnownData (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    CompanyId INT NOT NULL,
    ItemCode VARCHAR(64) NOT NULL, -- Codice articolo/operazione
    ItemDescription NVARCHAR(255), -- Descrizione per riferimento
    DataType VARCHAR(20) NOT NULL, -- 'MATERIAL' o 'OPERATION'
    ParameterName VARCHAR(50) NOT NULL, -- '€/kg', 'kg/mt', '€/mm', etc.
    ParameterValue DECIMAL(18,6) NOT NULL,
    UnitOfMeasure VARCHAR(10), -- '€/kg', 'kg/mt', 'mm', etc.
    Description NVARCHAR(255), -- Descrizione del parametro
    IsActive BIT DEFAULT 1
);
```

#### **MA_BOMCostingFormulas**
```sql
-- Formule di calcolo per articoli/operazioni
CREATE TABLE MA_BOMCostingFormulas (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    CompanyId INT NOT NULL,
    ItemCode VARCHAR(64) NOT NULL,
    ItemDescription NVARCHAR(255),
    DataType VARCHAR(20) NOT NULL, -- 'MATERIAL' o 'OPERATION'
    FormulaName VARCHAR(100) NOT NULL, -- 'TUBO_COST', 'SALDATURA_COST', etc.
    FormulaExpression VARCHAR(MAX) NOT NULL, -- '€/kg * kg/mt * L * QTA'
    ResultUnit VARCHAR(10) NOT NULL, -- '€', '€/mt', '€/pz', etc.
    Description NVARCHAR(255),
    IsActive BIT DEFAULT 1
);
```

#### **MA_BOMCostingMatchingRules**
```sql
-- Regole di matching per articoli/operazioni
CREATE TABLE MA_BOMCostingMatchingRules (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    CompanyId INT NOT NULL,
    ItemCode VARCHAR(64) NOT NULL,
    ItemDescription NVARCHAR(255),
    MatchingType VARCHAR(20) NOT NULL, -- 'EXACT', 'CONTAINS', 'TAG'
    MatchingValue VARCHAR(255) NOT NULL, -- Valore per il match
    Priority INT DEFAULT 0, -- Priorità (più alto = più specifico)
    IsActive BIT DEFAULT 1
);
```

### **2. Funzioni di Calcolo**

#### **FN_FindBestKnownDataMatch**
```sql
-- Trova il match migliore per un articolo
CREATE FUNCTION FN_FindBestKnownDataMatch(
    @CompanyId INT,
    @ItemCode VARCHAR(64),
    @ItemDescription NVARCHAR(255),
    @DataType VARCHAR(20)
)
RETURNS VARCHAR(64)
```

#### **FN_CalculateKnownDataCost**
```sql
-- Calcola il costo usando dati noti
CREATE FUNCTION FN_CalculateKnownDataCost(
    @CompanyId INT,
    @ItemCode VARCHAR(64),
    @ItemDescription NVARCHAR(255),
    @DataType VARCHAR(20),
    @L DECIMAL(18,5), -- Lunghezza
    @QTA DECIMAL(18,5) -- Quantità
)
RETURNS DECIMAL(18,6)
```

#### **FN_EvaluateMathExpression**
```sql
-- Valuta espressioni matematiche semplici
CREATE FUNCTION FN_EvaluateMathExpression(@Expression VARCHAR(MAX))
RETURNS DECIMAL(18,6)
```

## 📊 **Esempi Pratici**

### **Esempio 1: TUBO**
```sql
-- Dati noti
INSERT INTO MA_BOMCostingKnownData VALUES
(1, 'TUBO', 'TUBO GENERICO', 'MATERIAL', '€/kg', 6.00, '€/kg', 'Costo per chilogrammo'),
(1, 'TUBO', 'TUBO GENERICO', 'MATERIAL', 'kg/mt', 3.00, 'kg/mt', 'Peso per metro');

-- Formula
INSERT INTO MA_BOMCostingFormulas VALUES
(1, 'TUBO', 'TUBO GENERICO', 'MATERIAL', 'TUBO_COST', '€/kg * kg/mt * L * QTA', '€/mt', 'Costo tubo per metro');

-- Regola di matching
INSERT INTO MA_BOMCostingMatchingRules VALUES
(1, 'TUBO', 'TUBO GENERICO', 'CONTAINS', 'TUBO', 10);

-- Calcolo
-- Input: L=650, QTA=0.75
-- Formula: 6 * 3 * 650 * 0.75 = 8775€
```

### **Esempio 2: Saldatura**
```sql
-- Dati noti
INSERT INTO MA_BOMCostingKnownData VALUES
(1, 'SALDATURA', 'SALDATURA GENERICA', 'OPERATION', '€/mm', 0.015, '€/mm', 'Costo per millimetro');

-- Formula
INSERT INTO MA_BOMCostingFormulas VALUES
(1, 'SALDATURA', 'SALDATURA GENERICA', 'OPERATION', 'SALDATURA_COST', '€/mm * L * QTA', '€/pz', 'Costo saldatura per pezzo');

-- Regola di matching
INSERT INTO MA_BOMCostingMatchingRules VALUES
(1, 'SALDATURA', 'SALDATURA GENERICA', 'CONTAINS', 'SALDATURA', 10);

-- Calcolo
-- Input: L=650, QTA=1
-- Formula: 0.015 * 650 * 1 = 9.75€
```

### **Esempio 3: Barra**
```sql
-- Dati noti
INSERT INTO MA_BOMCostingKnownData VALUES
(1, 'BARRA', 'BARRA GENERICA', 'MATERIAL', '€/kg', 4.00, '€/kg', 'Costo per chilogrammo'),
(1, 'BARRA', 'BARRA GENERICA', 'MATERIAL', 'kg/mt', 1.2, 'kg/mt', 'Peso per metro');

-- Formula
INSERT INTO MA_BOMCostingFormulas VALUES
(1, 'BARRA', 'BARRA GENERICA', 'MATERIAL', 'BARRA_COST', '€/kg * kg/mt * L * QTA', '€/mt', 'Costo barra per metro');

-- Regola di matching
INSERT INTO MA_BOMCostingMatchingRules VALUES
(1, 'BARRA', 'BARRA GENERICA', 'CONTAINS', 'BARRA', 10);

-- Calcolo
-- Input: L=650, QTA=1.5
-- Formula: 4 * 1.2 * 650 * 1.5 = 4680€
```

## 🔍 **Sistema di Matching**

### **Tipi di Matching**

#### **1. EXACT (Esatto)**
```sql
-- Match esatto per codice
MatchingType = 'EXACT'
MatchingValue = 'TUBO'
-- Match: ItemCode = 'TUBO'
```

#### **2. CONTAINS (Contiene)**
```sql
-- Match per contenuto nella descrizione
MatchingType = 'CONTAINS'
MatchingValue = 'TUBO'
-- Match: ItemDescription LIKE '%TUBO%'
-- Esempi: 'TUBO IN ACCIAIO', 'TUBO SPESSORE 2MM'
```

#### **3. TAG (Tag Specifico)**
```sql
-- Match per tag personalizzato
MatchingType = 'TAG'
MatchingValue = 'TUBO_ACCIAIO_2MM'
-- Match: ItemDescription LIKE '%TUBO_ACCIAIO_2MM%'
-- Esempio: 'TUBO IN ACCIAIO SPESSORE 2MM'
```

### **Priorità**
- **Priorità Alta**: Match più specifico (es. TAG)
- **Priorità Bassa**: Match più generico (es. CONTAINS)
- **Ordine**: Per priorità decrescente, poi per ID

## ⚠️ **Gestione Errori**

### **Casi di Errore**

#### **1. Articolo senza dati noti**
```sql
-- Input: VITE senza dati noti
-- Risultato: 0 (fallback a UnitCost normale)
```

#### **2. Formula mancante**
```sql
-- Input: TUBO con parametri ma senza formula
-- Risultato: 0 (fallback a UnitCost normale)
```

#### **3. Parametro mancante**
```sql
-- Input: Formula richiede €/kg ma non è definito
-- Risultato: 0 (fallback a UnitCost normale)
```

#### **4. Divisione per zero**
```sql
-- Input: L=0 in formula
-- Risultato: 0 (fallback a UnitCost normale)
```

#### **5. Formula malformata**
```sql
-- Input: Formula con sintassi errata
-- Risultato: 0 (fallback a UnitCost normale)
```

## 🔧 **Stored Procedures**

### **SP_TestKnownDataCalculation**
```sql
-- Testa il calcolo per un articolo specifico
EXEC SP_TestKnownDataCalculation 
    @CompanyId = 1,
    @ItemCode = 'TUBO',
    @ItemDescription = 'TUBO IN ACCIAIO SPESSORE 2MM',
    @DataType = 'MATERIAL',
    @L = 650,
    @QTA = 0.75;
```

### **SP_ManageKnownData**
```sql
-- Gestisce i dati noti (CRUD)
EXEC SP_ManageKnownData 
    @CompanyId = 1,
    @Action = 'INSERT', -- 'INSERT', 'UPDATE', 'DELETE', 'SELECT'
    @ItemCode = 'TUBO',
    @ItemDescription = 'TUBO GENERICO',
    @DataType = 'MATERIAL',
    @ParameterName = '€/kg',
    @ParameterValue = 6.00,
    @UnitOfMeasure = '€/kg',
    @Description = 'Costo per chilogrammo del tubo',
    @FormulaName = 'TUBO_COST',
    @FormulaExpression = '€/kg * kg/mt * L * QTA',
    @ResultUnit = '€/mt',
    @MatchingType = 'CONTAINS',
    @MatchingValue = 'TUBO',
    @Priority = 10;
```

## 🚀 **Integrazione con SP_CalculateBOMCosting**

### **Logica di Integrazione**
```sql
-- Calcolo costi con dati noti
CASE 
    WHEN dbo.FN_CalculateKnownDataCost(@CompanyId, ComponentItemCode, ComponentDescription, 'MATERIAL', L, CalculatedQty) > 0 THEN
        -- Usa costo calcolato dai dati noti
        dbo.FN_CalculateKnownDataCost(@CompanyId, ComponentItemCode, ComponentDescription, 'MATERIAL', L, CalculatedQty)
    ELSE
        -- Fallback a UnitCost normale
        CalculatedQty * UnitCost
END
```

### **Priorità**
1. **Dati Noti**: Se disponibili e validi
2. **UnitCost**: Se dati noti non disponibili o errati

## 🧪 **Test del Sistema**

### **File di Test**
- `test_known_data_system.sql`: Test completo del sistema

### **Test Inclusi**
1. **Test Matching**: Verifica matching per codici e descrizioni
2. **Test Calcolo**: Verifica calcoli con formule
3. **Test Errori**: Verifica gestione errori
4. **Test Gestione**: Verifica CRUD operations
5. **Test Formule**: Verifica formule complesse

### **Come Eseguire i Test**
```sql
-- Esegui i test
EXEC SP_TestKnownDataCalculation @CompanyId = 1, @ItemCode = 'TUBO', @ItemDescription = 'TUBO IN ACCIAIO', @DataType = 'MATERIAL', @L = 650, @QTA = 0.75;

-- Risultato atteso: 8775€
```

## 📁 **File del Sistema**

- ✅ `create_known_data_tables.sql` - Creazione tabelle
- ✅ `known_data_functions.sql` - Funzioni di calcolo
- ✅ `integrate_known_data_costing.sql` - Integrazione con costificazione
- ✅ `test_known_data_system.sql` - Test completo
- ✅ `KNOWN_DATA_SYSTEM.md` - Documentazione (NUOVO)

## 🎯 **Benefici del Sistema**

### **1. Flessibilità**
- ✅ **Formule Personalizzate**: Definizione libera di formule di calcolo
- ✅ **Parametri Dinamici**: Parametri configurabili per ogni articolo
- ✅ **Matching Intelligente**: Supporto per codici e descrizioni

### **2. Robustezza**
- ✅ **Gestione Errori**: Fallback automatico a UnitCost
- ✅ **Validazione**: Controllo formule e parametri
- ✅ **Priorità**: Sistema di priorità per matching

### **3. Usabilità**
- ✅ **Interfaccia Web**: Gestione tramite interfaccia web
- ✅ **Test Integrati**: Test automatici per verificare funzionamento
- ✅ **Documentazione**: Documentazione completa del sistema

---

**🎯 Obiettivo Raggiunto**: Sistema completo per gestire dati noti con formule personalizzate, matching intelligente e gestione errori robusta, integrato con il sistema di costificazione BOM esistente.
