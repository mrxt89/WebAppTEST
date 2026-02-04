# 📋 Status File 20260204 - TechnicalCharacteristicsJSON

## ✅ FILE DA TENERE (NECESSARI)

### 1. `20260204_00_CreateMA_CodingRules_ItemsToRecode_Type.sql` ✅
**STATO**: CORRETTO - TENERE
**Cosa fa**: Crea/ricrea il TYPE `MA_CodingRules_ItemsToRecode` con colonna `TechnicalCharacteristicsJSON`
**Esegui**: PRIMO

---

### 2. `20260204_01_AddTechnicalCharacteristicsJSON_MA_ProjectArticles_Items.sql` ✅
**STATO**: CORRETTO - TENERE
**Cosa fa**: Aggiunge colonna `TechnicalCharacteristicsJSON` alla tabella `MA_ProjectArticles_Items`
**Esegui**: Dopo file 00

---

### 3. `20260204_02_SyncTechnicalCharacteristicsFromJSON_StoredProcedure.sql` ✅
**STATO**: CORRETTO - TENERE
**Cosa fa**: Crea stored procedure `MA_SyncTechnicalCharacteristicsFromJSON` per sincronizzare campi hardcoded dal JSON
**Esegui**: Dopo file 01

---

### 4. `20260204_06_RecreateMA_CodingRules_ApplyBatch_Complete.sql` ✅
**STATO**: CORRETTO - TENERE
**Cosa fa**: Ricrea completamente `MA_CodingRules_ApplyBatch` con supporto JSON già integrato
**Esegui**: Dopo file 00 (prima di 01)

---

### 5. `20260204_07_RecreateMA_CodingRules_ApplySimplifiedBatch_Complete.sql` ✅
**STATO**: CORRETTO - TENERE (Opzionale)
**Cosa fa**: Ricrea completamente `MA_CodingRules_ApplySimplifiedBatch` con supporto JSON
**Esegui**: Dopo file 00 (opzionale, solo se usi questa SP)

---

## ❌ FILE DA ELIMINARE (DEPRECATI/RIDONDANTI)

### 6. `20260204_03_UpdateMA_CodingRules_ApplyBatch_WithJSON.sql` ❌
**STATO**: RIDONDANTE - ELIMINARE
**Motivo**: Tentava di aggiungere colonna al TYPE, ma il TYPE va ricreato (già fatto nel file 00)
**Sostituito da**: File 00 (che ricrea il TYPE completo)

---

### 7. `20260204_04_ExactChanges_MA_CodingRules_ApplyBatch.sql` ❌
**STATO**: DEPRECATO - ELIMINARE
**Motivo**: Conteneva istruzioni per modifiche manuali, ma ora abbiamo il file 06 completo
**Sostituito da**: File 06 (SP completa già pronta)

---

### 8. `20260204_05_RecreateStoredProcedures_AfterType.sql` ❌
**STATO**: DEPRECATO - ELIMINARE
**Motivo**: Conteneva solo istruzioni, ora abbiamo file 06 e 07 completi
**Sostituito da**: File 06 e 07 (SP complete già pronte)

---

## 📝 ORDINE DI ESECUZIONE FINALE

```
1. 20260204_00 → Crea/Ricrea TYPE (elimina SP, ricrea TYPE)
   ↓
2. 20260204_06 → Ricrea MA_CodingRules_ApplyBatch completa
   ↓
3. 20260204_07 → Ricrea MA_CodingRules_ApplySimplifiedBatch completa (OPZIONALE)
   ↓
4. 20260204_01 → Aggiunge colonna JSON a MA_ProjectArticles_Items
   ↓
5. 20260204_02 → Crea SP di sincronizzazione
```

**NOTA**: Il file 03 non serve più (era solo verifica, ora il TYPE è già completo nel file 00)

---

## 🔍 VERIFICA FILE 04 - Problemi trovati

Il file 04 contiene istruzioni per modifiche manuali che ora non servono più perché:
- Il file 06 contiene la SP completa già modificata
- Non serve più fare modifiche manuali

**Raccomandazione**: Elimina i file 03, 04, 05

---

## 📦 RIEPILOGO FINALE

**File da TENERE (5 file)**:
- ✅ 20260204_00
- ✅ 20260204_01
- ✅ 20260204_02
- ✅ 20260204_06
- ✅ 20260204_07 (opzionale)

**File da ELIMINARE (3 file)**:
- ❌ 20260204_03
- ❌ 20260204_04
- ❌ 20260204_05
