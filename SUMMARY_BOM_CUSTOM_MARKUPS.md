# 📝 Summary: Ricarichi Custom BOM-Specific

## ✅ Implementazione Completata

### Obiettivo
Permettere ad ogni BOM di avere **ricarichi personalizzati** che sovrascrivono i parametri globali dell'azienda.

---

## 🗂️ Files Creati/Modificati

### 📊 Database (3 files)

1. **`database/ALTER_MA_BOMCostingHistory_AddMarkups.sql`**
   - Aggiunge 8 colonne alla tabella `MA_BOMCostingHistory`:
     - `CustomMarkupRM` - Ricarico materie prime
     - `CustomMarkupRMPurchase` - Ricarico acquisti MP
     - `CustomMarkupRMProduction` - Ricarico produzione MP
     - `CustomMarkupOperations` - Ricarico lavorazioni
     - `CustomMarkupInternalOps` - Ricarico lavorazioni interne
     - `CustomMarkupExternalOps` - Ricarico lavorazioni esterne
     - `CustomMarkupOverhead` - Ricarico generale/overhead
     - `CustomMarkupsJSON` - JSON per ricarichi aggiuntivi
   - Aggiunge indice per performance

2. **`database/SP_SaveBOMCostingHistory_v2.sql`**
   - Versione aggiornata della SP per salvare parametri
   - Include 8 nuovi parametri per ricarichi custom
   - Backwards compatible (ricarichi opzionali, NULL se non presenti)

3. **`database/SP_GetBOMCostingHistory_v2.sql`**
   - Versione aggiornata della SP per recuperare storico
   - Include ricarichi custom nel result set
   - Query ottimizzata con CTE

### 🔧 Backend (1 file)

4. **`backend/queries/bomCostingManagement.js`** - MODIFICATO
   - Funzione `saveBOMCostingHistory` aggiornata
   - Gestisce oggetto `customMarkups` nel `costingData`
   - Salva ricarichi custom solo se presenti (altrimenti NULL)

### 🎨 Frontend (2 files)

5. **`frontend/src/pages/progetti/progetti/articoli/BOMViewer/components/BOMDetailPanel/index.jsx`** - MODIFICATO
   - Condizione tab "Parametri Costing": visibile quando `selectedNode.level === 0`
   - Rimosso console.log debug

6. **`frontend/src/pages/progetti/progetti/articoli/BOMViewer/components/BOMDetailPanel/BOMCostingParameters.jsx`** - MODIFICATO
   - Aggiunto stato `customMarkups` per gestire ricarichi custom
   - Funzione `loadCustomMarkups()` - carica ricarichi dall'ultimo record storico
   - Funzione `handleSave()` aggiornata - salva ricarichi custom
   - UI completa con 7 campi editabili per ricarichi
   - Mostra valore globale come riferimento accanto ad ogni campo
   - Info box con istruzioni per l'utente

7. **`frontend/src/pages/progetti/progetti/articoli/BOMViewer/components/BOMDetailPanel/TabCostingParameters.jsx`** - MODIFICATO
   - Corretto: usa `bom` invece di `selectedBOM` dal context

### 📚 Documentazione (2 files)

8. **`DEPLOY_BOM_CUSTOM_MARKUPS.md`**
   - Guida completa deployment
   - Step-by-step per database, backend, frontend
   - Test procedures
   - Troubleshooting

9. **`SUMMARY_BOM_CUSTOM_MARKUPS.md`** (questo file)
   - Riassunto implementazione
   - Lista files modificati
   - Prossimi step

---

## 🚀 Come Funziona

### Logica Ricarichi

```
Per ogni BOM:
  1. Se esistono ricarichi custom → USA ricarichi custom
  2. Altrimenti → USA ricarichi globali da MA_BOMCostingParameters
```

### Workflow Utente

1. **Visualizza BOM** → Tab "Parametri Costing" (visibile solo su livello 0)
2. **Modifica ricarichi** → Ogni campo mostra valore globale come riferimento
3. **Salva parametri** → Ricarichi custom salvati nello storico
4. **Lascia vuoto** → Usa ricarico globale
5. **Storico** → Visualizza/ripristina ricarichi precedenti

### UI Dettagli

```javascript
// Esempio campo ricarico
Ricarico Materie Prime (%)  (Globale: 25%)
[___________]  ← campo editabile
placeholder: "Es: 25 (per 25%)"
```

- Se lasci vuoto → usa valore globale (25%)
- Se inserisci 30 → usa 30% per questa BOM
- Valore globale sempre visibile come riferimento

---

## 📋 TODO: Deployment

### Step Rimanenti

- [ ] **Database**: Eseguire 3 script SQL (5 min)
  - `ALTER_MA_BOMCostingHistory_AddMarkups.sql`
  - `SP_SaveBOMCostingHistory_v2.sql`
  - `SP_GetBOMCostingHistory_v2.sql`

- [ ] **Backend**: Restart servizio (1 min)
  - `pm2 restart backend` o `systemctl restart webapp-backend`

- [ ] **Frontend**: Build (2 min)
  - `cd frontend && npm run build`

- [ ] **Test**: Verificare funzionalità (10 min)
  - Salvare ricarichi custom per una BOM
  - Verificare storico con ricarichi
  - Ripristinare ricarichi precedenti

### ⚠️ IMPORTANTE: Logica Calcolo Costificazione

**TODO RIMASTO** - Modificare la logica di calcolo costificazione per:

1. Controllare se esistono ricarichi custom per la BOM
2. Se esistono → usare quelli
3. Altrimenti → usare ricarichi globali

**Files da modificare:**
- `backend/queries/bomCostingManagement.js` - funzione `calculateBOMCosting()`
- Probabilmente stored procedure di calcolo (se esiste)

**Logica pseudo-codice:**
```javascript
async function calculateBOMCosting(companyId, bomId, options) {
  // 1. Carica ricarichi custom per questa BOM (ultimo record storico)
  const customMarkups = await getLatestCustomMarkups(bomId);

  // 2. Carica ricarichi globali
  const globalMarkups = await getBOMCostingParameters(companyId);

  // 3. Merge: custom sovrascrive globali
  const effectiveMarkups = {
    ...globalMarkups,
    ...customMarkups // sovrascrive solo se presente
  };

  // 4. Usa effectiveMarkups nel calcolo
  const result = await calculateWithMarkups(bomId, effectiveMarkups, options);

  return result;
}
```

---

## 🧪 Testing

### Test Case 1: Salvataggio Ricarichi Custom

```
1. Aprire BOM → Tab "Parametri Costing"
2. Inserire ricarichi custom (es: RM=30, Operations=40)
3. Cliccare "Salva Parametri"
4. Verificare messaggio successo
5. Verificare in database:
   SELECT TOP 1 * FROM MA_BOMCostingHistory
   WHERE BOMId = [id] ORDER BY Id DESC;
```

**Risultato atteso:**
- `CustomMarkupRM` = 30
- `CustomMarkupOperations` = 40
- Altri campi NULL (usano globali)

### Test Case 2: Ripristino Storico

```
1. Cliccare "Mostra Storico"
2. Vedere record precedenti con ricarichi
3. Cliccare icona freccia su un record
4. Verificare ricarichi caricati nei campi
```

**Risultato atteso:**
- Tutti i campi popolati con valori dello storico
- Possibilità di modificare e ri-salvare

### Test Case 3: Calcolo con Ricarichi Custom

```
1. Impostare ricarichi custom per BOM
2. Eseguire costificazione
3. Verificare che usa ricarichi custom
```

**⚠️ Questo test richiede Step TODO "Logica Calcolo"**

---

## 📊 Struttura Dati

### Tabella MA_BOMCostingHistory (Nuove Colonne)

| Colonna | Tipo | Nullable | Descrizione |
|---------|------|----------|-------------|
| CustomMarkupRM | float | YES | Ricarico MP generale |
| CustomMarkupRMPurchase | float | YES | Ricarico MP acquisto |
| CustomMarkupRMProduction | float | YES | Ricarico MP produzione |
| CustomMarkupOperations | float | YES | Ricarico lavorazioni |
| CustomMarkupInternalOps | float | YES | Ricarico lav. interne |
| CustomMarkupExternalOps | float | YES | Ricarico lav. esterne |
| CustomMarkupOverhead | float | YES | Ricarico overhead |
| CustomMarkupsJSON | nvarchar(MAX) | YES | Ricarichi extra (JSON) |

### API Request Body

```json
{
  "bomId": 123,
  "costingData": {
    "orderQuantity": 100,
    "scrapPercentage": 5,
    "useGranularMarkups": true,
    "updateBOMRecord": true,
    "notes": "Costificazione custom",
    "customMarkups": {
      "markupRM": 30,
      "markupRMPurchase": 15,
      "markupOperations": 40,
      "markupOverhead": 12
    }
  }
}
```

### API Response

```json
{
  "success": true,
  "message": "Storico parametri salvato con successo",
  "data": {
    "Id": 456,
    "BOMId": 123,
    "CustomMarkupRM": 30,
    "CustomMarkupRMPurchase": 15,
    "CustomMarkupOperations": 40,
    "CustomMarkupOverhead": 12,
    "CostingDate": "2025-10-02T14:30:00",
    ...
  }
}
```

---

## 🎯 Vantaggi Implementazione

### ✅ Pro

1. **Flessibilità**: Ogni BOM può avere ricarichi personalizzati
2. **Backwards Compatible**: BOM esistenti continuano a funzionare
3. **Storico Completo**: Tutti i ricarichi salvati nello storico
4. **UI Intuitiva**: Valore globale sempre visibile come riferimento
5. **Performance**: Indice su (BOMId, CostingDate) per query veloci
6. **Opzionale**: NULL se non impostato → usa globali

### 📝 Note Tecniche

- **Priorità**: Custom > Globale
- **NULL handling**: Se campo NULL → usa valore globale
- **Validazione**: Input numerici con step 0.01
- **Storage**: ~64 bytes per record (8 float fields)

---

## 🔄 Prossimi Step (in ordine)

1. ✅ Implementazione database, backend, frontend - **COMPLETATO**
2. ⏳ Deployment script SQL - **TODO**
3. ⏳ Restart backend - **TODO**
4. ⏳ Build frontend - **TODO**
5. ⏳ **CRITICO**: Modificare logica calcolo costificazione - **TODO**
6. ⏳ Testing completo - **TODO**
7. ⏳ Documentazione utente - **TODO**

---

## 📞 Supporto

Per problemi durante il deployment, consultare:
- `DEPLOY_BOM_CUSTOM_MARKUPS.md` - Guida deployment completa
- `database/FIX_NAMING_CONFLICT.md` - Fix errori comuni
- Log backend: `pm2 logs backend`
- Console browser: F12 → Console

---

**Implementazione completata: 2025-10-02**
**Pronto per deployment e testing** 🚀
