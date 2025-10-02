# Aggiornamento Sistema Costificazione BOM

## Panoramica
Sistema di costificazione BOM completamente rivisto per implementare le nuove regole di calcolo con ricarichi granulari e gestione separata di costi fissi e variabili.

## Modifiche Database

### Stored Procedures Aggiornate

#### 1. `SP_CalculateBOMCosting`
- **Nuovo parametro**: `@UpdateBOMRecord` (BIT) - controlla se aggiornare il record BOM
- **Logica riveduta**: Separazione chiara tra costi fissi e variabili
- **Ricarichi granulari**: Implementazione delle nuove regole di ricarico
- **Output JSON**: Salvataggio dettagli in formato JSON nel campo `Details`
- **Note strutturate**: Salvataggio riferimenti nel campo `Notes`

#### 2. `SP_TestBOMCostingExample`
- **Nuova procedura**: Test dei calcoli con valori di esempio
- **Verifica automatica**: Controllo correttezza dei calcoli
- **Output dettagliato**: Mostra tutti i passaggi del calcolo

#### 3. `SP_InitializeBOMCostingParameters`
- **Parametri aggiornati**: Nuovi valori di default per i ricarichi
- **Ricarico Sconto**: Impostato a 0% come richiesto

### Parametri di Costificazione

| Parametro | Valore Default | Descrizione |
|-----------|----------------|-------------|
| RICARICO_MP | 15% | Ricarico materia prima (solo per codici di materia prima) |
| RICARICO_OPE | 15% | Ricarico operazioni (non si considerano i costi fissi) |
| RICARICO_TRASPORTO | 2% | Ricarico trasporto (su somma costi variabili) |
| RICARICO_SCARTO | 4% | Ricarico scarto (su somma costi variabili) |
| RICARICO_TOTALE | 20% | Ricarico totale (su costi variabili + ricarichi) |
| RICARICO_SCONTO | 0% | Ricarico sconto (su costi variabili + ricarichi) |

### Regole di Calcolo Implementate

#### Costi Variabili
- **Materia Prima**: Solo `UnitCost` dei componenti (NO costi fissi)
- **Operazioni**: Solo tempi di lavorazione (NO setup time, NO costi fissi)

#### Costi Fissi
- **Componenti**: `FixedCost` diviso per lotto di produzione
- **Operazioni**: `FixedCost` + Setup Time (NON moltiplicato per quantità)

#### Ricarichi
1. **Ricarico MP**: `CostiVariabiliMP * 15%`
2. **Ricarico OPE**: `CostiVariabiliOPE * 15%`
3. **Ricarico Trasporto**: `CostiVariabiliTotali * 2%`
4. **Ricarico Scarto**: `CostiVariabiliTotali / (1 - 4%) - CostiVariabiliTotali`
5. **Ricarico Totale**: `(CostiVariabili + Ricarichi) * 20%`
6. **Ricarico Sconto**: `(CostiVariabili + Ricarichi) / (1 - 0%) - (CostiVariabili + Ricarichi)`

#### Formula Finale
```
Costo Unitario = CostiVariabili + CostiFissiPerLotto + SommaRicarichi + RicaricoTotale + RicaricoSconto
```

## Modifiche Backend

### File Aggiornati

#### 1. `backend/queries/bomCostingManagement.js`
- **Nuovo parametro**: `updateBOMRecord` nelle funzioni di calcolo
- **Default aggiornati**: `useGranularMarkups = true`, `updateBOMRecord = true`
- **Nuova funzione**: `testBOMCostingExample()` per testare i calcoli

#### 2. `backend/routes/bomCostingRoutes.js`
- **Route aggiornate**: Supporto per `updateBOMRecord` in tutte le route
- **Nuova route**: `GET /test-calculation` per testare i calcoli
- **Default corretti**: Valori di default allineati alle nuove regole

## Modifiche Frontend

### File Aggiornati

#### 1. `frontend/src/hooks/useBOMCosting.js`
- **Nuovo parametro**: Supporto per `updateBOMRecord`
- **Default aggiornati**: Allineati alle nuove regole
- **Nuova funzione**: `testBOMCostingExample()` per testare i calcoli

#### 2. `frontend/src/pages/progetti/progetti/articoli/BOMCosting.jsx`
- **Nuovo controllo**: Switch per `updateBOMRecord`
- **Pulsante test**: Test dei calcoli con esempio
- **Import utilità**: Funzioni per parsing JSON e formattazione

#### 3. `frontend/src/lib/bomCostingUtils.js` (NUOVO)
- **Parsing JSON**: Funzioni per parsare dettagli costi e note
- **Formattazione**: Funzioni per formattare valute, percentuali e numeri
- **Validazione**: Controllo coerenza dei calcoli
- **Riepilogo**: Generazione riepilogo testuale della costificazione

## Utilizzo

### Inizializzazione
```sql
-- Inizializza parametri
EXEC SP_InitializeBOMCostingParameters @CompanyId = 1;
```

### Calcolo Singola BOM
```sql
-- Solo calcolo (senza aggiornare record)
EXEC SP_CalculateBOMCosting 
    @CompanyId = 1,
    @BOMId = 1,
    @UpdateBOMRecord = 0,
    @Debug = 1;

-- Calcolo con aggiornamento record
EXEC SP_CalculateBOMCosting 
    @CompanyId = 1,
    @BOMId = 1,
    @UpdateBOMRecord = 1;
```

### Test Calcoli
```sql
-- Test con esempio fornito
EXEC SP_TestBOMCostingExample @CompanyId = 1;
```

### Frontend
```javascript
// Calcolo con nuove opzioni
const result = await calculateBOMCosting(bomId, {
  useGranularMarkups: true,
  updateBOMRecord: true,
  debug: false
});

// Test calcoli
const testResult = await testBOMCostingExample();
```

## Struttura JSON Dettagli

```json
{
  "prezzo": 51.44,
  "costo_mp": 2.77,
  "costo_ope": 30.55,
  "costi_fissi": 300.0,
  "ricarico_mp": 0.41,
  "ricarico_op": 4.58,
  "ricarico_tr": 0.67,
  "costo_totale": 36.32,
  "ricarico_scarto": 1.39,
  "ricarico_sconto": 0.0,
  "ricarico_totale": 8.07
}
```

## Struttura Note

```
|| lotto(rif): 100 | Prezzo(rif): 51.44 | Costo(rif): 36.32 ||
```

## Test di Integrazione

Eseguire il file `test_integration_bom_costing.sql` per verificare:
1. Inizializzazione parametri
2. Test calcoli con esempio
3. Calcolo singola BOM
4. Aggiornamento record
5. Parsing JSON
6. Batch calculation
7. Log costificazioni
8. Dettaglio operazioni

## Compatibilità

- **Retrocompatibilità**: Mantenuta per le funzioni esistenti
- **Default aggiornati**: Nuove regole applicate di default
- **Parametri opzionali**: Tutti i nuovi parametri sono opzionali con default sensati

## Note Importanti

1. **Costi Fissi**: Ora correttamente divisi per lotto di produzione
2. **Setup Time**: Non moltiplicato per quantità (è un costo fisso)
3. **Ricarichi Granulari**: Applicati secondo le regole specificate
4. **JSON Storage**: Dettagli salvati in formato strutturato
5. **Controllo Aggiornamento**: Possibilità di calcolare senza aggiornare il database

## 🔧 **Correzioni Matching Centri di Lavoro**

### **Problema Identificato**
Il sistema utilizzava il matching tramite `op.WorkCenterId = wc.OriginalId`, ma la struttura corretta richiede il matching tramite `CompanyId` e `Code`.

### **Correzione Implementata**
```sql
-- PRIMA (errato)
LEFT JOIN MA_ProjectArticles_BOMWorkCenters wc ON op.WorkCenterId = wc.OriginalId AND wc.CompanyId = @CompanyId

-- DOPO (corretto)
LEFT JOIN MA_ProjectArticles_BOMWorkCenters wc ON rt.WC = wc.Code AND wc.CompanyId = @CompanyId
```

### **Logica di Matching Corretta**
1. **Routing** (`MA_ProjectArticles_BOMRouting`): Campo `WC` contiene il codice del centro di lavoro
2. **Work Centers** (`MA_ProjectArticles_BOMWorkCenters`): Campo `Code` contiene il codice del centro di lavoro
3. **Match**: `rt.WC = wc.Code AND wc.CompanyId = @CompanyId`

### **Struttura Tabella Work Centers**
```sql
CREATE TABLE [dbo].[MA_ProjectArticles_BOMWorkCenters](
    [CompanyId] [int] NOT NULL,
    [OriginalId] [bigint] NOT NULL,
    [Code] [nvarchar](128) NOT NULL,        -- ← CODICE PER MATCH
    [Description] [nvarchar](1024) NOT NULL,
    [Outsourced] [varchar](5) NOT NULL,
    [HourlyCost] [numeric](6, 2) NOT NULL,  -- ← COSTO ORARIO
    [WaitTime] [int] NOT NULL,              -- ← NON UTILIZZATO
    [TBCreated] [datetime2](7) NOT NULL,
    [TBModified] [datetime2](7) NOT NULL,
    [TBCreatedID] [int] NOT NULL,
    [TBModifiedID] [int] NOT NULL
)
```

### **Test di Verifica**
Eseguire il file `test_workcenter_matching.sql` per verificare:
1. Struttura tabelle
2. Matching corretto tramite Code
3. Calcolo costi con nuovo matching
4. Verifica che il vecchio matching non funzioni più

## 💰 **Correzione Costi per Singolo Pezzo**

### **Problema Identificato**
I campi `TotalCost` e `TotalPrice` nella tabella `MA_ProjectArticles_BillOfMaterials` venivano salvati con i valori per lotto, ma devono rappresentare il **costo per singolo pezzo**.

### **Correzione Implementata**
```sql
-- PRIMA (errato)
TotalCost = @TotalCostPerLot,        -- Valore per lotto
TotalPrice = @TotalPricePerLot,      -- Valore per lotto

-- DOPO (corretto)
TotalCost = @FinalUnitCost,          -- Valore per singolo pezzo
TotalPrice = @TotalPricePerLot / @ProductionLot,  -- Valore per singolo pezzo
```

### **Logica Corretta**
1. **`@FinalUnitCost`**: Costo totale per singolo pezzo (costi variabili + costi fissi per lotto + ricarichi)
2. **`@TotalPricePerLot`**: Prezzo totale per lotto
3. **`TotalCost`**: `@FinalUnitCost` (costo per singolo pezzo)
4. **`TotalPrice`**: `@TotalPricePerLot / @ProductionLot` (prezzo per singolo pezzo)

### **JSON Dettagli**
Il JSON nel campo `Details` contiene tutti i valori per singolo pezzo:
```json
{
  "prezzo": 51.44,           // Prezzo per singolo pezzo
  "costo_totale": 36.32,     // Costo per singolo pezzo
  "costo_mp": 2.77,          // Costo materia prima per singolo pezzo
  "costo_ope": 30.55,        // Costo operazioni per singolo pezzo
  "costi_fissi": 300.0,      // Costi fissi totali (da dividere per lotto)
  "ricarico_mp": 0.41,       // Ricarico MP per singolo pezzo
  "ricarico_op": 4.58,       // Ricarico operazioni per singolo pezzo
  "ricarico_tr": 0.67,       // Ricarico trasporto per singolo pezzo
  "ricarico_scarto": 1.39,   // Ricarico scarto per singolo pezzo
  "ricarico_sconto": 0.0,    // Ricarico sconto per singolo pezzo
  "ricarico_totale": 8.07    // Ricarico totale per singolo pezzo
}
```

### **Test di Verifica**
Eseguire il file `test_unit_cost_verification.sql` per verificare:
1. Calcolo costi per singolo pezzo
2. Salvataggio corretto in `TotalCost` e `TotalPrice`
3. Coerenza tra valori salvati e JSON
4. Verifica calcoli manuali

## 🔍 **Colonne di Audit per Costificazione**

### **Nuove Colonne Aggiunte**
Sono state aggiunte due colonne alla tabella `MA_ProjectArticles_BillOfMaterials` per tracciare l'audit della costificazione:

```sql
-- Colonna per l'utente che ha eseguito l'ultimo aggiornamento costi
[LastCostingUpdatedBy] [int] NULL

-- Colonna per la data/ora dell'ultimo aggiornamento costi  
[LastCostingUpdatedAt] [datetime2](7) NULL
```

### **Utilizzo nelle Stored Procedures**
Le stored procedures sono state aggiornate per utilizzare le colonne di audit:

```sql
-- SP_CalculateBOMCosting
CREATE OR ALTER PROCEDURE [dbo].[SP_CalculateBOMCosting]
    @CompanyId INT,
    @BOMId BIGINT,
    @OrderQuantity DECIMAL(18,5) = NULL,
    @ScrapPercentage FLOAT = NULL,
    @UseGranularMarkups BIT = 1,
    @UpdateBOMRecord BIT = 1,
    @UserId INT = NULL, -- NUOVO: ID utente per audit
    @Debug BIT = 0

-- Aggiornamento record con audit
UPDATE MA_ProjectArticles_BillOfMaterials
SET 
    -- ... altri campi ...
    LastCostingUpdatedBy = @UserId,  -- NUOVO
    LastCostingUpdatedAt = GETDATE() -- NUOVO
WHERE CompanyId = @CompanyId AND Id = @BOMId;
```

### **Utilizzo nel Backend**
Il backend è stato aggiornato per passare l'ID utente:

```javascript
// Route: POST /api/bom-costing/calculate/:bomId
const userId = req.user?.UserId || req.user?.Id || null;

const options = {
    // ... altri parametri ...
    userId: userId
};
```

### **Utilizzo nel Frontend**
Il frontend supporta automaticamente le nuove colonne di audit:

```javascript
// Hook: useBOMCosting.js
const defaultOptions = {
    useGranularMarkups: true,
    updateBOMRecord: true,
    userId: null, // Gestito automaticamente dal backend
    debug: false,
    ...options
};
```

### **Query di Audit Utili**

#### **Trovare BOM aggiornate da un utente specifico**
```sql
SELECT 
    Id, BOM, Description,
    LastCostingUpdatedBy,
    LastCostingUpdatedAt,
    TotalCost, TotalPrice
FROM MA_ProjectArticles_BillOfMaterials 
WHERE CompanyId = 1 
AND LastCostingUpdatedBy = @UserId
ORDER BY LastCostingUpdatedAt DESC;
```

#### **Trovare BOM aggiornate negli ultimi N giorni**
```sql
SELECT 
    Id, BOM, Description,
    LastCostingUpdatedBy,
    LastCostingUpdatedAt,
    TotalCost, TotalPrice
FROM MA_ProjectArticles_BillOfMaterials 
WHERE CompanyId = 1 
AND LastCostingUpdatedAt >= DATEADD(DAY, -7, GETDATE())
ORDER BY LastCostingUpdatedAt DESC;
```

#### **Statistiche di aggiornamento per utente**
```sql
SELECT 
    LastCostingUpdatedBy as UserId,
    COUNT(*) as BOMUpdated,
    MIN(LastCostingUpdatedAt) as FirstUpdate,
    MAX(LastCostingUpdatedAt) as LastUpdate
FROM MA_ProjectArticles_BillOfMaterials 
WHERE CompanyId = 1 
AND LastCostingUpdatedBy IS NOT NULL
GROUP BY LastCostingUpdatedBy
ORDER BY BOMUpdated DESC;
```

### **Test di Verifica**
Eseguire il file `test_audit_columns.sql` per verificare:
1. Esistenza delle colonne di audit
2. Aggiornamento corretto con ID utente
3. Timestamp di aggiornamento
4. Funzionamento con batch calculation
5. Query di audit

## 💡 **Logica di Costificazione Semplificata**

### **Approccio Corretto**
La costificazione utilizza un approccio semplice ed efficiente:

1. **Esplosione BOM Completa**: La tabella `#BOMExplosionCorrect` esplode automaticamente tutti i livelli della BOM
2. **Costi Componenti**: I costi dei materiali sono già memorizzati in `MA_ProjectArticles_BOMComponents.UnitCost`
3. **Somma Diretta**: Si sommano semplicemente i costi esistenti senza ricorsività

### **Logica di Calcolo**
```sql
-- Costi variabili materia prima (solo UnitCost, NO FixedCost)
SELECT @VariableCostsMP = ISNULL(SUM(
    CASE 
        WHEN ComponentNature = 22413314 OR UnitCost > 0 
        THEN CalculatedQty * UnitCost 
        ELSE 0 
    END
), 0)
FROM #BOMExplosionCorrect 
WHERE IsLoop = 0;
```

### **Vantaggi dell'Approccio Semplificato**

✅ **Performance**: Nessuna chiamata ricorsiva, calcolo diretto
✅ **Semplicità**: Logica lineare e facile da mantenere
✅ **Affidabilità**: Meno punti di errore, più stabile
✅ **Efficienza**: Utilizza i costi già calcolati e memorizzati
✅ **Manutenibilità**: Codice più pulito e comprensibile

### **Gestione dei Costi dei Materiali**
I costi dei materiali di acquisto devono essere gestiti a monte:
- **Aggiornamento Manuale**: I costi vengono aggiornati manualmente in `MA_ProjectArticles_BOMComponents.UnitCost`
- **Sincronizzazione**: I costi possono essere sincronizzati da `MA_Items` tramite procedure dedicate
- **Tracciabilità**: I costi sono sempre tracciabili e modificabili
