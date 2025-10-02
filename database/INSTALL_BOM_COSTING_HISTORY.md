# Installazione Storico Parametri Costificazione BOM

## 📋 Descrizione
Questa funzionalità permette di memorizzare e gestire lo storico dei parametri di costificazione per ogni BOM. Ad ogni costificazione o modifica dei parametri, viene salvato uno snapshot completo dei parametri utilizzati.

## 🗄️ 1. Installazione Database

Eseguire gli script SQL nell'ordine seguente:

### Step 1: Creare la tabella storico
```sql
-- Eseguire: database/MA_BOMCostingHistory.sql
```

Questo crea la tabella `MA_BOMCostingHistory` con:
- Campi per parametri di costificazione (quantità ordine, scarto%, opzioni)
- Snapshot JSON dei parametri globali
- Risultati della costificazione (costi RM, lavorazione, totale)
- Audit trail completo (data, utente, note)
- Foreign key verso `MA_ProjectArticles_BillOfMaterials`

### Step 2: Creare stored procedure per salvare
```sql
-- Eseguire: database/SP_SaveBOMCostingHistory.sql
```

Questa SP:
- Salva i parametri di costificazione utilizzati
- Crea automaticamente snapshot dei parametri globali se non fornito
- Registra data, utente e risultati della costificazione

### Step 3: Creare stored procedure per recuperare
```sql
-- Eseguire: database/SP_GetBOMCostingHistory.sql
```

Questa SP permette di:
- Recuperare storico per una BOM specifica o per tutta la company
- Limitare il numero di record (`@Top`)
- Ordinare per data o costo (`@OrderBy`)
- Include info BOM e utente che ha eseguito la costificazione

## 🔧 2. Backend API

Le API sono già integrate in `/backend/routes/bomCostingRoutes.js`:

### Salvare storico parametri
```javascript
POST /api/bom-costing/history
Body: {
  bomId: 123,
  costingData: {
    orderQuantity: 100,
    scrapPercentage: 5,
    useGranularMarkups: true,
    updateBOMRecord: true,
    parametersSnapshot: "...", // JSON con parametri globali
    rmCost: 1500.50,
    processingCost: 800.00,
    totalCost: 2300.50,
    totalPrice: 3200.00,
    notes: "Costificazione Q1 2025"
  }
}
```

### Recuperare storico
```javascript
GET /api/bom-costing/history?bomId=123&top=10&orderBy=CostingDate DESC
```

## 🎨 3. Frontend UI

### Componente BOMCostingParameters
Posizione: `/frontend/src/pages/progetti/progetti/articoli/BOMViewer/components/BOMDetailPanel/BOMCostingParameters.jsx`

Funzionalità:
- ✅ Modifica parametri costificazione (quantità, scarto%, opzioni)
- ✅ Salvataggio parametri con note
- ✅ Visualizzazione storico con tabella navigabile
- ✅ Ripristino parametri da storico precedente
- ✅ Indicatori visivi per comprendere la funzionalità

### Integrazione in BOMViewer
1. Nuova tab "Parametri Costing" visibile quando si seleziona il sommario della BOM
2. Tab accessibile dal pannello centrale del BOMViewer
3. Icona `<Calculator />` per facile identificazione

## 📖 4. Come Usare

### Workflow Utente:

1. **Aprire BOMViewer**
   - Selezionare un articolo con BOM
   - Nel pannello centrale, cliccare sulla tab "Sommario"
   - Apparirà la nuova tab "Parametri Costing"

2. **Modificare Parametri**
   - Quantità Ordine: inserire la quantità per la quale calcolare il costo
   - Scarto %: percentuale di scarto da applicare
   - Ricarichi Granulari: attiva/disattiva ricarichi per categoria
   - Aggiorna Record BOM: salva i costi calcolati nel record BOM

3. **Salvare Parametri**
   - Cliccare "Salva Parametri"
   - I parametri vengono salvati nello storico
   - Viene creato uno snapshot automatico dei parametri globali

4. **Visualizzare Storico**
   - Cliccare "Mostra Storico"
   - Visualizzare tutte le costificazioni precedenti
   - Per ogni record: data, parametri usati, costi risultanti, utente

5. **Ripristinare Parametri Precedenti**
   - Nella tabella storico, cliccare l'icona freccia
   - I parametri di quella costificazione vengono caricati
   - Possibilità di modificare e ri-costificare

## 🔍 5. Funzionalità Avanzate

### Snapshot Parametri Globali
Ogni volta che vengono salvati i parametri, viene creato uno snapshot JSON dei parametri di costificazione globali della company. Questo permette di:
- Tracciare eventuali modifiche ai parametri globali nel tempo
- Ricostruire esattamente come è stato calcolato un costo
- Audit trail completo per conformità

### Filtri e Ordinamento
Lo storico può essere:
- Filtrato per BOM specifica
- Limitato agli ultimi N record
- Ordinato per data o costo totale
- Ricercato per utente che ha eseguito la costificazione

## 🧪 6. Test

### Test Manuale:
1. Aprire una BOM nel BOMViewer
2. Andare su "Parametri Costing"
3. Inserire parametri di test (es. Qtà=100, Scarto%=5)
4. Salvare
5. Modificare parametri
6. Salvare nuovamente
7. Verificare che entrambe le versioni appaiano nello storico
8. Ripristinare la prima versione
9. Verificare che i parametri siano corretti

### Test SQL Diretti:
```sql
-- Verificare tabella creata
SELECT * FROM MA_BOMCostingHistory WHERE BOMId = 123 ORDER BY CostingDate DESC;

-- Testare SP salvataggio
EXEC SP_SaveBOMCostingHistory
  @CompanyId = 1,
  @BOMId = 123,
  @OrderQuantity = 100,
  @ScrapPercentage = 5,
  @CalculatedBy = 1;

-- Testare SP recupero
EXEC SP_GetBOMCostingHistory @CompanyId = 1, @BOMId = 123, @Top = 10;
```

## 🚨 7. Troubleshooting

### Problema: Tabella non si crea
- Verificare permessi utente SQL
- Controllare che non esista già una tabella con lo stesso nome
- Verificare foreign key verso `MA_ProjectArticles_BillOfMaterials`

### Problema: API ritorna errore 500
- Verificare che le SP siano create correttamente
- Controllare log backend per dettagli errore
- Verificare che `companyId` e `bomId` siano validi

### Problema: Tab non appare in BOMViewer
- Verificare che sia selezionato il sommario (non un nodo specifico)
- Controllare import del componente `TabCostingParameters`
- Verificare che l'utente abbia permessi di visualizzazione

## 📊 8. Struttura Dati

### Tabella MA_BOMCostingHistory
```
Id (PK)
CompanyId (FK)
BOMId (FK)
OrderQuantity
ScrapPercentage
UseGranularMarkups
UpdateBOMRecord
ParametersSnapshot (JSON)
RMCost
ProcessingCost
TotalCost
TotalPrice
CostingDate
CalculatedBy (FK -> AR_Users)
Notes
TBCreated
TBCreatedId
```

### Esempio ParametersSnapshot
```json
[
  {
    "ParameterName": "MARKUP_RM_ACQUISTO",
    "ParameterValue": 1.15,
    "Description": "Ricarico materie prime acquisto"
  },
  {
    "ParameterName": "MARKUP_LAVORAZIONI",
    "ParameterValue": 1.25,
    "Description": "Ricarico lavorazioni"
  }
]
```

## ✅ 9. Checklist Installazione

- [ ] Eseguito `MA_BOMCostingHistory.sql`
- [ ] Eseguito `SP_SaveBOMCostingHistory.sql`
- [ ] Eseguito `SP_GetBOMCostingHistory.sql`
- [ ] Verificato creazione tabella nel database
- [ ] Verificato creazione stored procedures
- [ ] Backend: verificato import funzioni in `bomCostingManagement.js`
- [ ] Backend: verificato route API in `bomCostingRoutes.js`
- [ ] Frontend: verificato componente `BOMCostingParameters.jsx`
- [ ] Frontend: verificato componente `TabCostingParameters.jsx`
- [ ] Frontend: verificato import in `BOMDetailPanel/index.jsx`
- [ ] Testato salvataggio parametri
- [ ] Testato visualizzazione storico
- [ ] Testato ripristino parametri

## 📝 10. Note di Versione

### Versione 1.0.0
- Creazione tabella MA_BOMCostingHistory
- Stored procedures per gestione storico
- API backend complete
- UI integrata in BOMViewer
- Storico navigabile e ripristinabile

### Funzionalità Future (Roadmap)
- Export storico in Excel/PDF
- Comparazione tra costificazioni diverse
- Alert su variazioni significative di costo
- Dashboard analytics storico costificazioni
- Integrazione con sistema di approvazione costi
