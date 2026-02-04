# 20260204: Implementazione TechnicalCharacteristicsJSON

## 📋 Panoramica

Implementazione di un sistema JSON per gestire le caratteristiche tecniche durante la ricodifica, eliminando l'hardcoding nel frontend.

### Architettura

```
┌─────────────────────────────────────────┐
│  MA_ProjectArticles_Items              │
├─────────────────────────────────────────┤
│  TechnicalCharacteristicsJSON (NVARCHAR)│ ← FONTE PRIMARIA
│  {                                      │
│    "DIAMETRO": "20",                    │
│    "RAGGIOM": "15",                     │
│    "SPESSORE": "2"                      │
│  }                                      │
├─────────────────────────────────────────┤
│  Diameter, Bxh, Depth, ... (legacy)     │ ← Sincronizzati dal JSON
└─────────────────────────────────────────┘
```

### Flusso

1. **Durante ricodifica**: Utente inserisce caratteristiche → Salva in JSON → Sincronizza campi hardcoded
2. **Riapertura modale**: Leggi JSON → Ripopola campi → Mostra all'utente
3. **Generazione descrizione**: Leggi JSON → Converti per SP → Genera descrizione normalizzata

---

## 📁 File SQL - Ordine di Esecuzione

### 0. `20260204_00_CreateMA_CodingRules_ItemsToRecode_Type.sql` ⚠️ **IMPORTANTE**
**Cosa fa**: Crea (o ricrea) la tabella tipo `MA_CodingRules_ItemsToRecode` con la colonna `TechnicalCharacteristicsJSON`

**Esegui PER PRIMO**: ✅

**NOTA**: Se il TYPE esiste già, viene eliminato e ricreato. Non è possibile fare ALTER TABLE su un TYPE.

```sql
-- Crea TYPE con tutti i campi + TechnicalCharacteristicsJSON
```

---

### 1. `20260204_01_AddTechnicalCharacteristicsJSON_MA_ProjectArticles_Items.sql`
**Cosa fa**: Aggiunge il campo `TechnicalCharacteristicsJSON` alla tabella `MA_ProjectArticles_Items`

**Esegui PRIMA**: ✅

```sql
-- Aggiunge colonna TechnicalCharacteristicsJSON NVARCHAR(MAX) NULL
```

---

### 2. `20260204_02_SyncTechnicalCharacteristicsFromJSON_StoredProcedure.sql`
**Cosa fa**: Crea la stored procedure `MA_SyncTechnicalCharacteristicsFromJSON` per sincronizzare i campi hardcoded dal JSON

**Esegui DOPO il file 01**: ✅

**Mapping automatico**:
- `DIAMETRO`/`DIAMETER` → `Diameter`
- `BxH`/`BXH` → `Bxh`
- `PROFONDITA`/`DEPTH` → `Depth`
- `LUNGHEZZA`/`LENGTH` → `Length`
- `RAGGIO`/`RAGGIO_MEDIO`/`RAGGIOM`/`RADIUS` → `MediumRadius`

**Uso**:
```sql
-- Sincronizza un articolo specifico
EXEC MA_SyncTechnicalCharacteristicsFromJSON @ItemId = 12345;

-- Sincronizza tutti gli articoli con JSON
EXEC MA_SyncTechnicalCharacteristicsFromJSON;
```

---

### 3. `20260204_06_RecreateMA_CodingRules_ApplyBatch_Complete.sql`
**Cosa fa**: Ricrea completamente `MA_CodingRules_ApplyBatch` con supporto JSON già integrato

**Esegui DOPO il file 00**: ✅

**NOTA**: File completo, pronto all'uso. Include tutte le modifiche per `TechnicalCharacteristicsJSON`.

---

### 4. `20260204_07_RecreateMA_CodingRules_ApplySimplifiedBatch_Complete.sql`
**Cosa fa**: Ricrea completamente `MA_CodingRules_ApplySimplifiedBatch` con supporto JSON

**Esegui DOPO il file 00**: ✅ (Opzionale, se usi questa SP)

**NOTA**: File completo, pronto all'uso.

**Modifiche richieste**:
1. Aggiungi variabile `@TechnicalCharacteristicsJSON`
2. Aggiungi `TechnicalCharacteristicsJSON` al CURSOR SELECT
3. Aggiungi `@TechnicalCharacteristicsJSON` al FETCH NEXT iniziale
4. Aggiungi `TechnicalCharacteristicsJSON` all'UPDATE `MA_ProjectArticles_Items`
5. Aggiungi chiamata `MA_SyncTechnicalCharacteristicsFromJSON` dopo UPDATE
6. Aggiungi `@TechnicalCharacteristicsJSON` al FETCH NEXT finale

**Posizione modifiche**:
- **Riga ~2341**: Aggiungi `DECLARE @TechnicalCharacteristicsJSON NVARCHAR(MAX);`
- **Riga ~2343**: Aggiungi `TechnicalCharacteristicsJSON` al SELECT del CURSOR
- **Riga ~2360**: Aggiungi `@TechnicalCharacteristicsJSON` al FETCH NEXT iniziale
- **Riga ~2460**: Aggiungi `TechnicalCharacteristicsJSON = ISNULL(@TechnicalCharacteristicsJSON, TechnicalCharacteristicsJSON)` all'UPDATE
- **Riga ~2472**: Aggiungi chiamata `MA_SyncTechnicalCharacteristicsFromJSON` dopo `PRINT 'Item updated'`
- **Riga ~2513**: Aggiungi `@TechnicalCharacteristicsJSON` al FETCH NEXT finale

---

## 🔄 Ordine di Esecuzione Completo

```
1. 20260204_00 → Crea/Ricrea TYPE con colonna JSON ⚠️ PRIMO
   ↓ (Elimina SP che usano il TYPE, poi ricrea TYPE)
2. 20260204_06 → Ricrea MA_CodingRules_ApplyBatch completa ✅
   ↓
3. 20260204_07 → Ricrea MA_CodingRules_ApplySimplifiedBatch completa ✅ (Opzionale)
   ↓
4. 20260204_01 → Aggiunge colonna JSON a MA_ProjectArticles_Items
   ↓
5. 20260204_02 → Crea SP di sincronizzazione
```

---

## ✅ Checklist Post-Implementazione

- [ ] Eseguito file 00: TYPE creato con colonna JSON
- [ ] Eseguito file 06: MA_CodingRules_ApplyBatch ricreata
- [ ] Eseguito file 07: MA_CodingRules_ApplySimplifiedBatch ricreata (opzionale)
- [ ] Eseguito file 01: Colonna JSON aggiunta a MA_ProjectArticles_Items
- [ ] Eseguito file 02: SP di sincronizzazione creata
- [ ] Testato salvataggio ricodifica con caratteristiche tecniche
- [ ] Verificato sincronizzazione campi hardcoded
- [ ] Testato riaprire modale e vedere caratteristiche precompilate
- [ ] Verificato generazione descrizione normalizzata dal JSON

---

## 🧪 Test

### Test 1: Salvataggio JSON
```sql
-- Verifica che il JSON venga salvato
SELECT Id, Item, TechnicalCharacteristicsJSON
FROM MA_ProjectArticles_Items
WHERE TechnicalCharacteristicsJSON IS NOT NULL;
```

### Test 2: Sincronizzazione
```sql
-- Sincronizza un articolo di test
EXEC MA_SyncTechnicalCharacteristicsFromJSON @ItemId = [ID_TEST];

-- Verifica che i campi hardcoded siano aggiornati
SELECT Id, Item, Diameter, Length, MediumRadius, TechnicalCharacteristicsJSON
FROM MA_ProjectArticles_Items
WHERE Id = [ID_TEST];
```

### Test 3: Ricodifica completa
1. Apri modale ricodifica
2. Inserisci caratteristiche tecniche (es. Diametro: 20, Raggio Medio: 15)
3. Salva ricodifica
4. Verifica JSON salvato
5. Verifica campi hardcoded sincronizzati
6. Riapri modale → Verifica caratteristiche precompilate

---

## 📝 Note Importanti

1. **Disallineamento consapevole**: Se aggiorni manualmente i campi hardcoded senza toccare il JSON, il disallineamento è accettato.

2. **Retrocompatibilità**: I campi hardcoded rimangono per compatibilità con stored procedure esistenti.

3. **Performance**: I campi hardcoded possono essere usati per query/filtri veloci, il JSON per edit/display.

4. **Flessibilità**: Il JSON può contenere qualsiasi caratteristica, anche quelle non mappate ai campi hardcoded.

---

## 🐛 Troubleshooting

### Problema: JSON non viene salvato
- Verifica che la colonna esista: `SELECT * FROM sys.columns WHERE name = 'TechnicalCharacteristicsJSON'`
- Verifica che `MA_CodingRules_ApplyBatch` sia stata modificata correttamente

### Problema: Campi hardcoded non si sincronizzano
- Verifica che `MA_SyncTechnicalCharacteristicsFromJSON` sia stata creata
- Controlla che il JSON abbia il formato corretto: `{"DIAMETRO": "20", ...}`
- Verifica i log della SP per errori

### Problema: Caratteristiche non appaiono nel modale
- Verifica che il frontend legga dal campo `TechnicalCharacteristicsJSON`
- Controlla che il JSON sia nel formato corretto

---

## 📚 Prossimi Passi (Backend/Frontend)

Dopo aver eseguito i file SQL, modificare:

1. **Backend**: Aggiornare `MA_CodingRules_ApplyBatch` per passare `TechnicalCharacteristicsJSON`
2. **Backend**: Modificare route ricodifica per includere JSON nel payload
3. **Frontend**: Salvare caratteristiche tecniche nel JSON durante ricodifica
4. **Frontend**: Leggere JSON quando si riapre il modale per precompilare campi
5. **Frontend**: Usare JSON per generare descrizione normalizzata
