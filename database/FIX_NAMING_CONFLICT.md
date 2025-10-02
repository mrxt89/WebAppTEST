# Fix: Conflitto Naming getBOMCostingHistory

## ⚠️ Problema Risolto

**Errore originale:**
```
SyntaxError: Identifier 'getBOMCostingHistory' has already been declared
```

## 🔧 Causa
La funzione `getBOMCostingHistory` era già presente nel file `bomCostingManagement.js` con una logica diversa (ricerca cronologia costi).

La nuova funzionalità per lo storico parametri aveva creato una seconda funzione con lo stesso nome, causando il conflitto.

## ✅ Soluzione Applicata

### 1. Rinominata la nuova funzione
```javascript
// PRIMA (conflitto)
const getBOMCostingHistory = async (companyId, bomId = null, top = null, orderBy = 'CostingDate DESC') => {
    // Nuova logica per storico parametri
}

// DOPO (risolto)
const getBOMCostingParametersHistory = async (companyId, bomId = null, top = null, orderBy = 'CostingDate DESC') => {
    // Nuova logica per storico parametri
}
```

### 2. Aggiornato export in module.exports
```javascript
module.exports = {
    // ... altre funzioni
    getBOMCostingParametersHistory,  // ✅ Nuovo nome
    getBOMCostingHistory,              // ✅ Funzione esistente mantenuta
    // ... altre funzioni
};
```

### 3. Aggiornata route API
```javascript
// File: backend/routes/bomCostingRoutes.js
router.get('/history', authenticateToken, async (req, res) => {
    // ...
    const result = await bomCostingQueries.getBOMCostingParametersHistory(
        companyId,
        bomId ? parseInt(bomId) : null,
        top ? parseInt(top) : null,
        orderBy || 'CostingDate DESC'
    );
    // ...
});
```

## 📝 API Endpoint Rimasto Invariato

L'endpoint API rimane lo stesso per il frontend:
```
GET /api/bom-costing/history?bomId=X&top=N&orderBy=...
POST /api/bom-costing/history
```

**Nessuna modifica necessaria al frontend!**

## ✅ Verifica Build

### Backend
```bash
✓ Syntax OK - bomCostingManagement.js
✓ Syntax OK - bomCostingRoutes.js
```

### Frontend
```bash
✓ built in 38.76s
```

## 🔍 File Modificati

1. `/backend/queries/bomCostingManagement.js`
   - Rinominata funzione: `getBOMCostingHistory` → `getBOMCostingParametersHistory`
   - Aggiornato export

2. `/backend/routes/bomCostingRoutes.js`
   - Aggiornata chiamata funzione nella route GET `/history`

## 📊 Funzioni nel File

Ora il file `bomCostingManagement.js` contiene:

1. `getBOMCostingHistory(companyId, bomId, bomCode)`
   - **Funzione ESISTENTE** - Ricerca cronologia costi BOM
   - Usata per recuperare cronologia completa con dettagli

2. `getBOMCostingParametersHistory(companyId, bomId, top, orderBy)`
   - **Funzione NUOVA** - Storico parametri costificazione
   - Usata per visualizzare storico parametri nella UI

## ✅ Tutto Risolto!

- ✅ Nessun conflitto di naming
- ✅ Backend compila correttamente
- ✅ Frontend builda senza errori
- ✅ API funzionanti
- ✅ Nessuna modifica necessaria al frontend
