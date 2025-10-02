# 🚀 Deploy: Ricarichi Custom BOM-Specific

## ✅ Obiettivo
Permettere ad ogni BOM di avere ricarichi personalizzati che sovrascrivono i parametri globali.

---

## 📋 Files Modificati/Creati

### Database
- ✅ `database/ALTER_MA_BOMCostingHistory_AddMarkups.sql` - Aggiunge colonne per ricarichi custom
- ✅ `database/SP_SaveBOMCostingHistory_v2.sql` - Salva ricarichi custom
- ✅ `database/SP_GetBOMCostingHistory_v2.sql` - Recupera ricarichi custom

### Backend
- ✅ `backend/queries/bomCostingManagement.js` - Funzione `saveBOMCostingHistory` aggiornata

### Frontend
- ⏳ `frontend/src/pages/progetti/progetti/articoli/BOMViewer/components/BOMDetailPanel/BOMCostingParameters.jsx` - Da aggiornare

---

## 🛠️ Step Deploy (ESEGUIRE NELL'ORDINE)

### **Step 1: Database** (5 min)

Aprire SQL Server Management Studio e connettersi al database `WebAppTEST`.

Eseguire gli script nell'ordine:

```sql
-- 1. ALTER tabella per aggiungere colonne ricarichi
-- File: database/ALTER_MA_BOMCostingHistory_AddMarkups.sql
-- Esegui tutto il contenuto del file

-- 2. Aggiorna SP salvataggio (v2)
-- File: database/SP_SaveBOMCostingHistory_v2.sql
-- Esegui tutto il contenuto del file

-- 3. Aggiorna SP recupero (v2)
-- File: database/SP_GetBOMCostingHistory_v2.sql
-- Esegui tutto il contenuto del file
```

**Verifica:**
```sql
-- Verifica colonne aggiunte
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'MA_BOMCostingHistory'
AND COLUMN_NAME LIKE 'Custom%';

-- Verifica stored procedures aggiornate
SELECT
    ROUTINE_NAME,
    CREATED,
    LAST_ALTERED
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_NAME IN ('SP_SaveBOMCostingHistory', 'SP_GetBOMCostingHistory');
```

### **Step 2: Backend** (GIÀ FATTO)

✅ Il file `backend/queries/bomCostingManagement.js` è già aggiornato.

**Restart backend:**
```bash
pm2 restart backend
# oppure
systemctl restart webapp-backend
```

### **Step 3: Frontend** (DA COMPLETARE)

Modificare `BOMCostingParameters.jsx` per:
1. Caricare ricarichi custom se presenti per la BOM
2. Permettere di modificare i ricarichi
3. Salvare i ricarichi custom insieme agli altri parametri

```bash
cd frontend
npm run build
```

---

## 📊 Struttura Ricarichi Custom

### Colonne Aggiunte a MA_BOMCostingHistory

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| `CustomMarkupRM` | float | Ricarico materie prime generale |
| `CustomMarkupRMPurchase` | float | Ricarico MP acquisto |
| `CustomMarkupRMProduction` | float | Ricarico MP produzione |
| `CustomMarkupOperations` | float | Ricarico lavorazioni generale |
| `CustomMarkupInternalOps` | float | Ricarico lavorazioni interne |
| `CustomMarkupExternalOps` | float | Ricarico lavorazioni esterne |
| `CustomMarkupOverhead` | float | Ricarico generale/overhead |
| `CustomMarkupsJSON` | nvarchar(MAX) | JSON per ricarichi aggiuntivi |

### Logica di Applicazione

```
Per ogni BOM:
  1. Se esistono ricarichi custom → USA quelli
  2. Altrimenti → USA ricarichi globali da MA_BOMCostingParameters
```

---

## 🧪 Test Post-Deploy

### 1. Test Database

```sql
-- Test ALTER table
SELECT TOP 1 *
FROM MA_BOMCostingHistory
WHERE CustomMarkupRM IS NOT NULL;

-- Test SP salvataggio con ricarichi custom
EXEC SP_SaveBOMCostingHistory
    @CompanyId = 1,
    @BOMId = 123,
    @OrderQuantity = 100,
    @ScrapPercentage = 5,
    @CalculatedBy = 1,
    @CustomMarkupRM = 1.25,
    @CustomMarkupOperations = 1.35,
    @Notes = 'Test ricarichi custom';

-- Verifica record salvato
SELECT TOP 1 *
FROM MA_BOMCostingHistory
WHERE BOMId = 123
ORDER BY Id DESC;

-- Test SP recupero
EXEC SP_GetBOMCostingHistory
    @CompanyId = 1,
    @BOMId = 123,
    @Top = 5;
```

### 2. Test Backend API

```bash
# Test POST con ricarichi custom
curl -X POST "http://localhost:3000/api/bom-costing/history" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bomId": 123,
    "costingData": {
      "orderQuantity": 100,
      "scrapPercentage": 5,
      "notes": "Test ricarichi custom",
      "customMarkups": {
        "markupRM": 1.25,
        "markupOperations": 1.35,
        "markupOverhead": 1.15
      }
    }
  }'

# Test GET per verificare ricarichi salvati
curl -X GET "http://localhost:3000/api/bom-costing/history?bomId=123&top=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Test Frontend UI

1. **Aprire BOMViewer** → Selezionare BOM
2. **Andare su "Parametri Costing"**
3. **Verificare sezione ricarichi**:
   - Dovrebbero apparire i campi per editare ricarichi custom
   - Mostrare ricarichi globali come riferimento
4. **Modificare ricarichi** e salvare
5. **Verificare storico**:
   - Dovrebbero apparire i ricarichi custom salvati
   - Possibilità di ripristinare ricarichi precedenti

---

## 🔄 Workflow Utente

### 1. Visualizzare Ricarichi Attuali
- Aprire BOM → Tab "Parametri Costing"
- Vedere ricarichi globali (riferimento)
- Vedere ricarichi custom se già impostati

### 2. Impostare Ricarichi Custom
- Modificare valori ricarichi
- Cliccare "Salva Parametri"
- I ricarichi custom vengono salvati per quella BOM

### 3. Rimuovere Ricarichi Custom
- Lasciare campi vuoti
- Salvare → torna ad usare ricarichi globali

### 4. Storico
- Ogni salvataggio crea un record di storico
- Lo storico include i ricarichi custom usati
- Possibilità di ripristinare ricarichi precedenti

---

## 📝 Note Tecniche

### Priorità Ricarichi

```javascript
// Logica di applicazione ricarichi
function getEffectiveMarkup(bomHistory, globalParams, markupType) {
  // 1. Controlla se esiste ricarico custom per questa BOM
  if (bomHistory.customMarkups && bomHistory.customMarkups[markupType]) {
    return bomHistory.customMarkups[markupType];
  }

  // 2. Altrimenti usa ricarico globale
  return globalParams[markupType];
}
```

### Mapping Ricarichi

| Campo DB | Campo Frontend | Parametro Globale Equivalente |
|----------|----------------|-------------------------------|
| CustomMarkupRM | markupRM | MARKUP_RM |
| CustomMarkupRMPurchase | markupRMPurchase | MARKUP_RM_ACQUISTO |
| CustomMarkupRMProduction | markupRMProduction | MARKUP_RM_PRODUZIONE |
| CustomMarkupOperations | markupOperations | MARKUP_LAVORAZIONI |
| CustomMarkupInternalOps | markupInternalOps | MARKUP_LAV_INTERNE |
| CustomMarkupExternalOps | markupExternalOps | MARKUP_LAV_ESTERNE |
| CustomMarkupOverhead | markupOverhead | MARKUP_GENERALE |

---

## ⚠️ Considerazioni

### Performance
- Indice creato su `(BOMId, CostingDate DESC)` per query veloci
- I ricarichi custom sono opzionali (NULL se non impostati)

### Compatibilità
- Le BOM esistenti continuano a funzionare con ricarichi globali
- Nessun dato esistente viene perso
- La migrazione è backwards-compatible

### Sicurezza
- I ricarichi custom sono visibili solo agli utenti con permessi di modifica
- Lo storico traccia chi ha modificato i ricarichi

---

## 🐛 Troubleshooting

### Problema: Colonne non aggiunte
- Verificare permessi utente SQL
- Controllare se ALTER_MA_BOMCostingHistory_AddMarkups.sql è stato eseguito
- Verificare con query INFORMATION_SCHEMA

### Problema: SP non aggiornate
- Droppare manualmente le SP esistenti
- Rieseguire gli script v2
- Verificare versione con LAST_ALTERED date

### Problema: Backend non salva ricarichi
- Verificare struttura JSON `customMarkups` nel request body
- Controllare log backend per errori SQL
- Verificare mapping campi nel backend

---

## ✅ Checklist Completamento

- [ ] Eseguito `ALTER_MA_BOMCostingHistory_AddMarkups.sql`
- [ ] Eseguito `SP_SaveBOMCostingHistory_v2.sql`
- [ ] Eseguito `SP_GetBOMCostingHistory_v2.sql`
- [ ] Verificato colonne custom in tabella
- [ ] Verificato SP aggiornate
- [ ] Backend riavviato
- [ ] Frontend aggiornato con form ricarichi
- [ ] Frontend rebuilded
- [ ] Testato salvataggio ricarichi custom
- [ ] Testato recupero ricarichi custom
- [ ] Testato ripristino da storico
- [ ] Testato calcolo costificazione con ricarichi custom

---

## 🎯 Prossimi Step

1. **Completare frontend** - Form per editare ricarichi custom
2. **Modificare logica calcolo** - Usare ricarichi BOM-specific invece di globali
3. **Testing completo** - Verificare calcoli con ricarichi custom
4. **Documentazione utente** - Guida all'uso ricarichi custom

**Tempo stimato completamento: 2-3 ore**
