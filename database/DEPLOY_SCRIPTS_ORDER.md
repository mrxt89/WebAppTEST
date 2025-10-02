# 📋 Ordine Esecuzione Script Database - Ricarichi Custom BOM

## 🎯 Obiettivo
Permettere ad ogni BOM di avere ricarichi personalizzati che sovrascrivono i parametri globali nel calcolo della costificazione.

---

## ⚠️ IMPORTANTE: Eseguire nell'ordine indicato

### 📝 Pre-requisiti
- Backup del database `WebAppTEST`
- Accesso SSMS come utente con permessi `db_owner` o `sysadmin`
- Connessione al database `WebAppTEST`

---

## 🔢 Script da Eseguire (IN ORDINE)

### **Script 1: Aggiungere Colonne Ricarichi Custom**
```sql
-- File: ALTER_MA_BOMCostingHistory_AddMarkups.sql
-- Durata: ~5 secondi
-- Descrizione: Aggiunge 8 colonne per ricarichi custom alla tabella MA_BOMCostingHistory
```

**Verifica:**
```sql
SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'MA_BOMCostingHistory'
AND COLUMN_NAME LIKE 'Custom%';
-- Dovrebbe restituire 8 righe
```

---

### **Script 2: Aggiornare SP Salvataggio**
```sql
-- File: SP_SaveBOMCostingHistory_v2.sql
-- Durata: ~2 secondi
-- Descrizione: Aggiorna SP per salvare ricarichi custom
```

**Verifica:**
```sql
SELECT ROUTINE_NAME, LAST_ALTERED
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_NAME = 'SP_SaveBOMCostingHistory';
-- LAST_ALTERED dovrebbe essere la data/ora attuale
```

---

### **Script 3: Aggiornare SP Recupero Storico**
```sql
-- File: SP_GetBOMCostingHistory_v2.sql
-- Durata: ~2 secondi
-- Descrizione: Aggiorna SP per recuperare ricarichi custom
```

**Verifica:**
```sql
SELECT ROUTINE_NAME, LAST_ALTERED
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_NAME = 'SP_GetBOMCostingHistory';
-- LAST_ALTERED dovrebbe essere la data/ora attuale
```

---

### **Script 4: Creare SP Ricarichi Effettivi**
```sql
-- File: SP_GetEffectiveBOMMarkups.sql
-- Durata: ~2 secondi
-- Descrizione: Crea nuova SP per ottenere ricarichi effettivi (custom o globali)
```

**Verifica:**
```sql
-- Test funzionalità
EXEC SP_GetEffectiveBOMMarkups @CompanyId = 1, @BOMId = 18822;
-- Dovrebbe restituire 7 righe con i ricarichi
```

---

### **Script 5: Integrare Ricarichi Custom nel Calcolo**
```sql
-- File: INTEGRATE_CustomMarkups_In_Calculation.sql
-- Durata: ~1 minuto (richiede modifica manuale)
-- Descrizione: Istruzioni per modificare SP_CalculateBOMCosting
```

**⚠️ IMPORTANTE - RICHIEDE MODIFICA MANUALE:**

1. **Backup SP esistente:**
   ```sql
   -- Salvare output in un file
   SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.SP_CalculateBOMCosting'));
   ```

2. **Eseguire lo script:**
   ```sql
   -- Esegui: INTEGRATE_CustomMarkups_In_Calculation.sql
   -- Lo script stampa istruzioni dettagliate
   ```

3. **Recuperare codice SP:**
   ```sql
   sp_helptext 'SP_CalculateBOMCosting'
   ```

4. **Modificare SP seguendo il template dello script**

5. **Eseguire ALTER PROCEDURE modificata**

**Verifica:**
```sql
-- Test calcolo con ricarichi custom
EXEC SP_CalculateBOMCosting
    @CompanyId = 1,
    @BOMId = 18822,
    @Debug = 1;
-- Verificare che usi ricarichi custom se presenti
```

---

## ✅ Checklist Post-Deploy

Dopo aver eseguito tutti gli script:

- [ ] Colonne custom aggiunte a MA_BOMCostingHistory
- [ ] SP_SaveBOMCostingHistory aggiornata (v2)
- [ ] SP_GetBOMCostingHistory aggiornata (v2)
- [ ] SP_GetEffectiveBOMMarkups creata
- [ ] SP_CalculateBOMCosting modificata per usare ricarichi custom
- [ ] Test salvata

ggio ricarichi custom OK
- [ ] Test recupero ricarichi custom OK
- [ ] Test calcolo con ricarichi custom OK

---

## 🧪 Test Completo

### Test 1: Salvataggio Ricarichi Custom

```sql
-- Salva ricarichi custom per BOM 18822
EXEC SP_SaveBOMCostingHistory
    @CompanyId = 1,
    @BOMId = 18822,
    @OrderQuantity = 100,
    @ScrapPercentage = 5,
    @CustomMarkupRM = 0.30,          -- 30%
    @CustomMarkupOperations = 0.40,  -- 40%
    @CalculatedBy = 1,
    @Notes = 'Test ricarichi custom';

-- Verifica salvataggio
SELECT TOP 1 * FROM MA_BOMCostingHistory
WHERE BOMId = 18822
ORDER BY Id DESC;
-- CustomMarkupRM dovrebbe essere 0.30
-- CustomMarkupOperations dovrebbe essere 0.40
```

### Test 2: Recupero Ricarichi Effettivi

```sql
-- Recupera ricarichi effettivi (dovrebbe usare custom)
EXEC SP_GetEffectiveBOMMarkups
    @CompanyId = 1,
    @BOMId = 18822;

-- Verifica output:
-- MARKUP_RM: 30 (Source: Custom)
-- MARKUP_LAVORAZIONI: 40 (Source: Custom)
-- Altri: valori globali (Source: Global)
```

### Test 3: Calcolo con Ricarichi Custom

```sql
-- Calcola BOM con ricarichi custom
EXEC SP_CalculateBOMCosting
    @CompanyId = 1,
    @BOMId = 18822,
    @OrderQuantity = 100,
    @Debug = 1;

-- Verificare nel result set:
-- ricarico_mp_pct dovrebbe essere 0.30 (30%)
-- ricarico_ope_pct dovrebbe essere 0.40 (40%)
```

### Test 4: Calcolo Senza Ricarichi Custom (Fallback)

```sql
-- Elimina ricarichi custom
DELETE FROM MA_BOMCostingHistory
WHERE BOMId = 18822;

-- Ricalcola (dovrebbe usare globali)
EXEC SP_CalculateBOMCosting
    @CompanyId = 1,
    @BOMId = 18822,
    @OrderQuantity = 100,
    @Debug = 1;

-- Verificare nel result set:
-- ricarico_mp_pct dovrebbe usare valore globale (es: 0.10 = 10%)
-- ricarico_ope_pct dovrebbe usare valore globale (es: 0.10 = 10%)
```

---

## 🔄 Rollback

Se necessario fare rollback:

```sql
-- 1. Rollback SP_CalculateBOMCosting (usare backup salvato)
-- ALTER PROCEDURE ... (codice backup)

-- 2. Droppare SP nuova
DROP PROCEDURE IF EXISTS SP_GetEffectiveBOMMarkups;

-- 3. Ripristinare SP precedenti (se hai backup)
-- ...

-- 4. Rimuovere colonne (ATTENZIONE: perdi dati!)
ALTER TABLE MA_BOMCostingHistory
DROP COLUMN CustomMarkupRM,
    CustomMarkupRMPurchase,
    CustomMarkupRMProduction,
    CustomMarkupOperations,
    CustomMarkupInternalOps,
    CustomMarkupExternalOps,
    CustomMarkupOverhead,
    CustomMarkupsJSON;
```

---

## 📊 Riepilogo Modifiche

| Componente | Tipo | Descrizione |
|------------|------|-------------|
| MA_BOMCostingHistory | ALTER TABLE | +8 colonne ricarichi custom |
| SP_SaveBOMCostingHistory | ALTER PROC | Salva ricarichi custom |
| SP_GetBOMCostingHistory | ALTER PROC | Recupera ricarichi custom |
| SP_GetEffectiveBOMMarkups | CREATE PROC | Nuova - Ricarichi effettivi |
| SP_CalculateBOMCosting | ALTER PROC | Usa ricarichi custom nel calcolo |

---

## 🎯 Risultato Atteso

Dopo il deploy:
1. ✅ Ogni BOM può avere ricarichi personalizzati
2. ✅ Ricarichi custom sovrascrivono globali nel calcolo
3. ✅ Se non ci sono custom → usa globali (backwards compatible)
4. ✅ Storico completo con tutti i ricarichi usati
5. ✅ Frontend permette di editare ricarichi custom per BOM

---

## 📞 Supporto

**Errori comuni:**

1. **"SP_GetEffectiveBOMMarkups non trovata"**
   - Eseguire prima `SP_GetEffectiveBOMMarkups.sql`

2. **"Invalid column name 'CustomMarkupRM'"**
   - Eseguire prima `ALTER_MA_BOMCostingHistory_AddMarkups.sql`

3. **"Calcolo usa ancora parametri globali"**
   - Verificare modifica di `SP_CalculateBOMCosting`
   - Controllare che chiami `SP_GetEffectiveBOMMarkups`

---

**Tempo totale stimato: 15-20 minuti** (inclusa modifica manuale SP_CalculateBOMCosting)
