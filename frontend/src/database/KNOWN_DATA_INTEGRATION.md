# Integrazione del Sistema "Dati Noti" nella Costificazione BOM

Questo documento descrive l'integrazione del sistema "Dati Noti" nelle stored procedure di costificazione delle Distinte Basi (BOM).

## Obiettivo

L'obiettivo principale è permettere al sistema di calcolare i costi dei materiali e delle operazioni utilizzando formule e parametri predefiniti ("dati noti") quando il `UnitCost` o `HourlyCost` standard non sono sufficienti o non disponibili, con una logica di priorità chiara.

## Modifiche Principali

### 1. `SP_CalculateBOMCosting`

La stored procedure principale `SP_CalculateBOMCosting` è stata modificata per includere un nuovo parametro e per integrare la logica di calcolo dei "dati noti" per i costi variabili di materiali e operazioni.

#### Nuovo Parametro: `@UseKnownData`

È stato aggiunto un nuovo parametro per controllare l'attivazione del sistema "dati noti":

- `@UseKnownData BIT = 1`: Se impostato a `1`, il sistema tenterà di calcolare i costi utilizzando i "dati noti" quando applicabile. Se impostato a `0`, il sistema ignorerà i "dati noti" e userà solo i costi standard (`UnitCost`, `HourlyCost`).

#### Logica di Integrazione per Costi Variabili Materia Prima (`@VariableCostsMP`)

La sezione che calcola `@VariableCostsMP` è stata aggiornata per includere la chiamata alla funzione `dbo.FN_CalculateKnownDataCost`.

**Logica:**
- Per ogni componente, se `@UseKnownData` è `1` e `dbo.FN_CalculateKnownDataCost` restituisce un valore maggiore di `0`, quel valore viene utilizzato come costo del componente.
- Altrimenti, viene utilizzato il `UnitCost` standard del componente moltiplicato per `CalculatedQty`.
- La priorità è data al `UnitCost` se già presente e valido, come richiesto dall'utente. La funzione `FN_CalculateKnownDataCost` viene chiamata solo se `UnitCost` è 0 o NULL.

**Snippet di Codice:**
```sql
-- 1a. Costi variabili materia prima (con supporto dati noti)
SELECT @VariableCostsMP = ISNULL(SUM(
    CASE 
        WHEN ComponentNature = 22413314 OR UnitCost > 0 
        THEN 
            -- Prova prima con dati noti (se abilitati), poi fallback a UnitCost
            CASE 
                WHEN @UseKnownData = 1 AND dbo.FN_CalculateKnownDataCost(@CompanyId, ComponentItemCode, ComponentDescription, 'MATERIAL', 
                    ISNULL((SELECT SUM(rt.Qty) FROM MA_ProjectArticles_BOMRouting rt 
                           WHERE rt.BOMId = (SELECT TOP 1 bom.Id FROM MA_ProjectArticles_BillOfMaterials bom 
                                            WHERE bom.ItemId = ComponentId AND bom.CompanyId = @CompanyId)
                           AND rt.CompanyId = @CompanyId), 1), CalculatedQty) > 0 THEN
                    -- Usa costo calcolato dai dati noti
                    dbo.FN_CalculateKnownDataCost(@CompanyId, ComponentItemCode, ComponentDescription, 'MATERIAL', 
                        ISNULL((SELECT SUM(rt.Qty) FROM MA_ProjectArticles_BOMRouting rt 
                               WHERE rt.BOMId = (SELECT TOP 1 bom.Id FROM MA_ProjectArticles_BillOfMaterials bom 
                                                WHERE bom.ItemId = ComponentId AND bom.CompanyId = @CompanyId)
                               AND rt.CompanyId = @CompanyId), 1), CalculatedQty)
                ELSE
                    -- Fallback a UnitCost normale
                    CalculatedQty * UnitCost
            END
        ELSE 0 
    END
), 0)
FROM #BOMExplosionCorrect 
WHERE IsLoop = 0;
```

#### Logica di Integrazione per Costi Variabili Operazioni (`@VariableCostsOPE`)

La sezione che calcola `@VariableCostsOPE` è stata aggiornata per includere la chiamata alla funzione `dbo.FN_CalculateKnownDataCost`.

**Logica:**
- Per ogni operazione, se `@UseKnownData` è `1` e `dbo.FN_CalculateKnownDataCost` restituisce un valore maggiore di `0`, quel valore viene utilizzato come costo dell'operazione.
- Altrimenti, viene utilizzato il costo orario del centro di lavoro (`wc.HourlyCost`) o il costo orario standard di fallback, moltiplicato per il `ProcessingTime` e `CalculatedQty`.
- La priorità è data a `op.UnitCost` se presente, poi a `wc.HourlyCost`, e infine ai "dati noti" o al parametro di default.

**Snippet di Codice:**
```sql
-- 1b. Costi variabili operazioni (con supporto dati noti)
SELECT @VariableCostsOPE = ISNULL(SUM(
    -- Solo costo basato su tempo di lavorazione (NO setup time, NO fixed cost)
    CASE 
        WHEN op.UnitCost > 0 THEN 
            -- Se l'operazione ha un costo unitario, usalo
            op.UnitCost * exp.CalculatedQty
        WHEN wc.HourlyCost > 0 THEN
            -- SOLO Processing time moltiplicato per quantità (NO setup time)
            -- Match tramite CompanyId e Code (rt.WC = wc.Code)
            ((ISNULL(rt.ProcessingTime, 0) / 3600.0) * wc.HourlyCost * exp.CalculatedQty)
        ELSE
            -- Prova prima con dati noti per operazioni (se abilitati), poi fallback al parametro di default
            CASE 
                WHEN @UseKnownData = 1 AND dbo.FN_CalculateKnownDataCost(@CompanyId, rt.Operation, ISNULL(op.Description, rt.Operation), 'OPERATION', 
                    ISNULL(rt.ProcessingTime, 0), rt.Qty * exp.CalculatedQty) > 0 THEN
                    -- Usa costo calcolato dai dati noti
                    dbo.FN_CalculateKnownDataCost(@CompanyId, rt.Operation, ISNULL(op.Description, rt.Operation), 'OPERATION', 
                        ISNULL(rt.ProcessingTime, 0), rt.Qty * exp.CalculatedQty)
                ELSE
                    -- Fallback al parametro di default
                    ((ISNULL(rt.ProcessingTime, 0) / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0) * exp.CalculatedQty)
            END
    END
), 0)
FROM #BOMExplosionCorrect exp
JOIN MA_ProjectArticles_BOMRouting rt ON rt.BOMId = exp.BOMId AND rt.CompanyId = @CompanyId
LEFT JOIN MA_ProjectArticles_BOMOperations op ON rt.Operation = op.Code AND op.CompanyId = @CompanyId AND op.Active = 1
LEFT JOIN MA_ProjectArticles_BOMWorkCenters wc ON rt.WC = wc.Code AND wc.CompanyId = @CompanyId
WHERE exp.IsLoop = 0 AND exp.BOMId IS NOT NULL;
```

### 2. `SP_BatchCalculateBOMCosting`

La stored procedure `SP_BatchCalculateBOMCosting` è stata aggiornata per passare il nuovo parametro `@UseKnownData` alla `SP_CalculateBOMCosting` per ogni BOM nel batch.

**Snippet di Codice:**
```sql
CREATE OR ALTER PROCEDURE [dbo].[SP_BatchCalculateBOMCosting]
    @CompanyId INT,
    @BOMIds NVARCHAR(MAX), -- Lista IDs separati da virgola
    @OrderQuantity DECIMAL(18,5) = NULL,
    @ScrapPercentage FLOAT = NULL,
    @UseKnownData BIT = 1, -- 1 = usa dati noti quando disponibili, 0 = usa solo UnitCost
    @UpdateBOMRecord BIT = 1, -- 1 = aggiorna i record BOM, 0 = solo calcolo
    @UserId INT = NULL -- ID dell'utente che esegue l'aggiornamento (per audit)
AS
BEGIN
    -- ...
    EXEC SP_CalculateBOMCosting @CompanyId, @BOMId, @OrderQuantity, @ScrapPercentage, 1, @UseKnownData, @UpdateBOMRecord, @UserId, 0;
    -- ...
END
```

### 3. Backend (`backend/queries/bomCostingManagement.js`)

Il file `bomCostingManagement.js` è stato aggiornato per includere il nuovo parametro `useKnownData` nelle funzioni `calculateBOMCosting` e `batchCalculateBOMCosting`.

**Snippet di Codice (`calculateBOMCosting`):**
```javascript
const calculateBOMCosting = async (companyId, bomId, options = {}) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const {
            orderQuantity = null,
            scrapPercentage = null,
            useGranularMarkups = true, // Default a true per le nuove regole
            useKnownData = true, // Default a true per usare dati noti quando disponibili
            updateBOMRecord = true, // Default a true per aggiornare il record
            userId = null, // ID dell'utente per audit
            debug = false
        } = options;
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('BOMId', sql.BigInt, bomId)
            .input('Debug', sql.Bit, debug ? 1 : 0)
            .input('UseGranularMarkups', sql.Bit, useGranularMarkups ? 1 : 0)
            .input('UseKnownData', sql.Bit, useKnownData ? 1 : 0) // Nuovo parametro
            .input('UpdateBOMRecord', sql.Bit, updateBOMRecord ? 1 : 0)
            .input('UserId', sql.Int, userId);
        // ...
    }
    // ...
};
```

**Snippet di Codice (`batchCalculateBOMCosting`):**
```javascript
const batchCalculateBOMCosting = async (companyId, bomIds, options = {}) => {
    try {
        let pool = await sql.connect(config.dbConfig);
        
        const {
            orderQuantity = null,
            scrapPercentage = null,
            useKnownData = true, // Default a true per usare dati noti quando disponibili
            updateBOMRecord = true, // Default a true per aggiornare i record
            userId = null // ID dell'utente per audit
        } = options;
        
        const bomIdsString = Array.isArray(bomIds) ? bomIds.join(',') : bomIds;
        
        const request = pool.request()
            .input('CompanyId', sql.Int, companyId)
            .input('BOMIds', sql.NVarChar(sql.MAX), bomIdsString)
            .input('UseKnownData', sql.Bit, useKnownData ? 1 : 0) // Nuovo parametro
            .input('UpdateBOMRecord', sql.Bit, updateBOMRecord ? 1 : 0)
            .input('UserId', sql.Int, userId);
        // ...
    }
    // ...
};
```

## Logica di Priorità

Il sistema implementa una logica di priorità chiara per il calcolo dei costi:

### Per i Materiali:
1. **`UnitCost` esistente**: Se il componente ha un `UnitCost` > 0, viene utilizzato quello
2. **Dati Noti**: Se `@UseKnownData = 1` e `UnitCost` è 0 o NULL, viene tentato il calcolo con i "dati noti"
3. **Fallback**: Se i "dati noti" non restituiscono un valore valido, viene utilizzato `UnitCost = 0`

### Per le Operazioni:
1. **`op.UnitCost`**: Se l'operazione ha un costo unitario specifico, viene utilizzato quello
2. **`wc.HourlyCost`**: Se il centro di lavoro ha un costo orario, viene calcolato basandosi sul `ProcessingTime`
3. **Dati Noti**: Se `@UseKnownData = 1` e non ci sono costi standard, viene tentato il calcolo con i "dati noti"
4. **Parametro di Default**: Come ultimo fallback, viene utilizzato il parametro `COSTO_ORARIO_STANDARD`

## Parametri dei Dati Noti

I "dati noti" utilizzano i seguenti parametri per il calcolo:

### Per i Materiali:
- **L**: Lunghezza (sempre dalla BOM)
- **QTA**: Quantità (sempre dalla BOM)
- **€/kg**: Costo per chilogrammo (parametro configurato)
- **kg/mt**: Chilogrammi per metro (parametro configurato)
- **€/mm**: Costo per millimetro (parametro configurato)

### Per le Operazioni:
- **L**: Lunghezza (sempre dalla BOM)
- **QTA**: Quantità (sempre dalla BOM)
- **€/mm**: Costo per millimetro (parametro configurato)
- Altri parametri specifici per operazione

## Esempi di Utilizzo

### Esempio 1: TUBO con Dati Noti
```sql
-- Parametri configurati per TUBO:
-- €/kg = 6, kg/mt = 3
-- Formula: €/kg * kg/mt * L * QTA
-- Risultato: 6 * 3 * 650 * 0.75 = 8775€
```

### Esempio 2: Saldatura con Dati Noti
```sql
-- Parametri configurati per Saldatura:
-- €/mm = 0.015
-- Formula: €/mm * L * QTA
-- Risultato: 0.015 * 650 * 1 = 9.75€
```

## Testing

Per testare l'integrazione, utilizza il file `test_known_data_integration.sql` che include:

1. **Test con dati noti attivi**: Verifica che i "dati noti" vengano utilizzati quando disponibili
2. **Test con dati noti disattivi**: Verifica che il sistema utilizzi solo i costi standard
3. **Test con componenti senza dati noti**: Verifica il comportamento di fallback
4. **Test con operazioni senza dati noti**: Verifica il comportamento di fallback

## Note Importanti

1. **Compatibilità**: Il sistema è completamente compatibile con le versioni precedenti. Se `@UseKnownData = 0`, il comportamento è identico a prima.

2. **Performance**: L'utilizzo dei "dati noti" può avere un impatto minimo sulle performance a causa delle chiamate aggiuntive alle funzioni di calcolo.

3. **Debug**: Quando `@Debug = 1`, il sistema fornisce informazioni dettagliate sui calcoli, inclusi i valori utilizzati dai "dati noti".

4. **Audit**: Tutte le operazioni di costificazione continuano a essere tracciate nei log di audit, indipendentemente dall'utilizzo dei "dati noti".

## Prossimi Passi

1. **Interfaccia Web**: Implementare un'interfaccia web per la gestione dei "dati noti" (inserimento, modifica, eliminazione)
2. **Validazione**: Aggiungere validazione per le formule matematiche
3. **Cache**: Considerare l'implementazione di una cache per i "dati noti" per migliorare le performance
4. **Report**: Creare report specifici per analizzare l'utilizzo dei "dati noti" nella costificazione