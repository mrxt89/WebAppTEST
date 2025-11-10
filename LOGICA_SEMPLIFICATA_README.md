# 🎯 Logica Semplificata Ricodifica Articoli - Guida Implementazione

## 📋 Riepilogo Modifiche

È stata implementata una nuova logica di ricodifica articoli **semplificata** che affianca (senza sovrascrivere) la logica gerarchica esistente.

### ✅ Cosa è stato fatto

1. **Database** (2 nuove tabelle + 4 stored procedures)
   - `MA_CodingRules_SimplifiedConfig` - Configurazione per company
   - `MA_CodingRules_SimplifiedSequentials` - Tracciamento sequenziali per prefisso
   - SP per gestione sequenziali con supporto numerico/alfabetico (000-999, A00-Z99, etc.)

2. **Backend** (7 nuove funzioni + 6 nuovi endpoints)
   - Query management esteso con funzioni per logica semplificata
   - Endpoints REST per config, preview, apply batch

3. **Frontend** (1 nuovo componente + modifiche esistenti)
   - `SimplifiedRecodingSelector` - UI semplificata per preview codici
   - `RecodingWizard` - Rendering condizionale in base a configurazione
   - `RecodingTable` - Switch automatico tra le due logiche
   - Hook `useRecodingRules` esteso

---

## 🚀 Come Attivare la Nuova Logica

### Step 1: Eseguire lo script SQL

Apri SQL Server Management Studio e esegui lo script:

```bash
database/migrations/add_simplified_coding_logic.sql
```

Lo script:
- ✅ Crea le nuove tabelle
- ✅ Crea le stored procedures
- ✅ Inserisce configurazione di default per tutte le aziende (disattivata)

### Step 2: Attivare per una Company

Per attivare la logica semplificata per un'azienda specifica (es. CompanyId = 1):

```sql
UPDATE MA_CodingRules_SimplifiedConfig
SET
    IsActive = 1,           -- Attiva logica semplificata
    CharactersToKeep = 7    -- Numero caratteri da mantenere (1-14)
WHERE CompanyId = 1;
```

**Parametri configurabili:**
- `IsActive`: `0` = logica gerarchica (default), `1` = logica semplificata
- `CharactersToKeep`: Numero di caratteri da mantenere dal codice originale (1-14)

### Step 3: Verifica

Riavvia il backend (se necessario) e accedi al wizard di ricodifica.

Se attivata correttamente, vedrai:
- Badge **"Modalità Semplificata"** nel titolo del wizard
- Descrizione: "Mantieni N caratteri"
- UI semplificata senza selezioni gerarchiche

---

## 🎨 Comportamento Logica Semplificata

### Come Funziona

Quando copi una BOM o ricodifichi articoli:

#### Esempio con CharactersToKeep = 7:

**Input:**
```
RCANCSP31622060  (codice originale BOM)
CTCVU1831626030  (componente 1)
CTTGDRI31622222  (componente 2)
TTONSLD31622070  (componente 3)
```

**Output:**
```
RCANCSP00000000  (primi 7 caratteri + zeri + sequenziale 000)
CTCVU1800000001  (primi 7 caratteri + zeri + sequenziale 001)
CTTGDRI00000002  (primi 7 caratteri + zeri + sequenziale 002)
TTONSLD00000003  (primi 7 caratteri + zeri + sequenziale 003)
```

### Gestione Sequenziali

I sequenziali sono **per prefisso** e seguono questa logica:

1. **000-999**: Numerico puro (000, 001, 002... 999)
2. **A00-Z99**: Alfabetico con due cifre (A00, A01... A99, B00... Z99)
3. **0000+**: Overflow numerico (0000, 0001, 0002...)

#### Esempi:
```
RCANCSP00000000  (primo)
RCANCSP00000001  (secondo)
...
RCANCSP00000999  (1000°)
RCANCSP0000A00   (1001° - passa a alfabetico)
RCANCSP0000A01   (1002°)
...
RCANCSP0000Z99   (dopo esaurimento alfabeto)
RCANCSP000000000 (aggiunge cifra)
```

### Cosa Viene Mantenuto

**✅ Dalla logica originale:**
- Descrizione articolo (mantenuta tal quale)
- Campi gerarchia (`MacrofamilyId`, `FamilyId`, `ItemTypeId`, `AliasId`, `CategoryId`)
- Tutti gli altri attributi dell'articolo

**🆕 Generato dalla logica semplificata:**
- Solo il nuovo codice (primi N caratteri + zeri + sequenziale)

---

## 🔄 Switch tra le Due Logiche

### Toggle Logica

**Per disattivare la logica semplificata** e tornare a quella gerarchica:

```sql
UPDATE MA_CodingRules_SimplifiedConfig
SET IsActive = 0
WHERE CompanyId = 1;
```

**Per riattivarla:**

```sql
UPDATE MA_CodingRules_SimplifiedConfig
SET IsActive = 1
WHERE CompanyId = 1;
```

### Comportamento UI

- **Se `IsActive = 0`**: Wizard mostra `CodingHierarchySelector` (logica gerarchica)
- **Se `IsActive = 1`**: Wizard mostra `SimplifiedRecodingSelector` (logica semplificata)

Lo switch è **immediato** - non serve riavvio backend/frontend.

---

## 🧪 Testing

### Scenario di Test Consigliato

1. **Setup Database**
   ```sql
   -- Esegui script migrazione
   -- Attiva logica semplificata per CompanyId=1
   UPDATE MA_CodingRules_SimplifiedConfig
   SET IsActive = 1, CharactersToKeep = 7
   WHERE CompanyId = 1;
   ```

2. **Test Frontend**
   - Accedi al progetto
   - Apri BOM Viewer
   - Copia una BOM con componenti temporanei (stato_erp=0)
   - Seleziona componenti e click "Ricodifica Componenti"
   - Verifica che appaia la UI semplificata
   - Espandi una riga → vedrai preview automatica
   - Click "Applica Ricodifica"
   - Verifica codici generati

3. **Test Switch Logica**
   ```sql
   -- Disattiva logica semplificata
   UPDATE MA_CodingRules_SimplifiedConfig
   SET IsActive = 0
   WHERE CompanyId = 1;
   ```
   - Riapri wizard ricodifica
   - Verifica che appaia la UI gerarchica tradizionale

4. **Test Sequenziali**
   ```sql
   -- Verifica sequenziali generati
   SELECT * FROM MA_CodingRules_SimplifiedSequentials
   WHERE CompanyId = 1;
   ```

### Casi Edge da Testare

- ✅ Articoli bloccati (stato_erp=1) → non ricodificabili
- ✅ Codice duplicato → gestito automaticamente con prossimo sequenziale
- ✅ Prefissi diversi → sequenziali indipendenti
- ✅ Overflow sequenziali (>999) → passa ad alfabetico
- ✅ Descrizione → mantenuta da originale

---

## 📁 File Modificati/Creati

### Database
```
database/migrations/add_simplified_coding_logic.sql (NUOVO)
```

### Backend
```
backend/queries/codingRulesManagement.js (MODIFICATO)
backend/routes/codingRulesRoutes.js (MODIFICATO)
```

### Frontend
```
frontend/src/hooks/useRecodingRules.js (MODIFICATO)
frontend/src/pages/progetti/progetti/articoli/BOMViewer/components/codingRules/
├── SimplifiedRecodingSelector.jsx (NUOVO)
├── RecodingWizard.jsx (MODIFICATO)
└── RecodingTable.jsx (MODIFICATO)
```

---

## 🔧 Configurazione Avanzata

### Modifica Numero Caratteri

Se vuoi cambiare il numero di caratteri da mantenere (es. da 7 a 10):

```sql
UPDATE MA_CodingRules_SimplifiedConfig
SET CharactersToKeep = 10
WHERE CompanyId = 1;
```

**Nota:** Il cambiamento è immediato e si applica alle nuove ricodifiche.

### Configurazioni Multiple Aziende

Ogni azienda può avere una configurazione diversa:

```sql
-- RICOS: Logica semplificata con 7 caratteri
UPDATE MA_CodingRules_SimplifiedConfig
SET IsActive = 1, CharactersToKeep = 7
WHERE CompanyId = 1;

-- Altra azienda: Logica gerarchica
UPDATE MA_CodingRules_SimplifiedConfig
SET IsActive = 0
WHERE CompanyId = 2;
```

---

## 📊 Monitoraggio

### Query Utili

**Verifica configurazione corrente:**
```sql
SELECT
    c.CompanyName,
    sc.IsActive,
    sc.CharactersToKeep,
    sc.EditDate
FROM MA_CodingRules_SimplifiedConfig sc
JOIN MA_Companies c ON c.CompanyId = sc.CompanyId;
```

**Sequenziali in uso:**
```sql
SELECT
    Prefix,
    LastSequential,
    LastUsedDate,
    CASE
        WHEN LastSequential NOT LIKE '%[A-Z]%' AND LEN(LastSequential) = 3 THEN 'Numerico'
        WHEN LastSequential LIKE '[A-Z][0-9][0-9]' THEN 'Alfabetico'
        ELSE 'Overflow'
    END AS TipoSequenziale
FROM MA_CodingRules_SimplifiedSequentials
WHERE CompanyId = 1
ORDER BY LastUsedDate DESC;
```

**Statistiche utilizzo:**
```sql
SELECT
    COUNT(*) AS TotaleRicodifiche,
    COUNT(DISTINCT SUBSTRING(NewCode, 1, 7)) AS PrefissiUnici
FROM MA_CodingRules_History
WHERE CompanyId = 1
    AND ChangeReason LIKE '%Simplified%'
    AND ChangeDate >= DATEADD(day, -30, GETDATE());
```

---

## 🐛 Troubleshooting

### Problema: Non vedo la nuova UI

**Soluzione:**
1. Verifica config database:
   ```sql
   SELECT * FROM MA_CodingRules_SimplifiedConfig WHERE CompanyId = 1;
   ```
2. Controlla browser console per errori
3. Verifica che backend stia chiamando l'endpoint corretto

### Problema: Errore "Codice già esistente"

**Causa:** Collision con codice esistente
**Soluzione:** Automatica - il sistema trova il prossimo sequenziale disponibile

### Problema: Sequenziali non incrementano

**Soluzione:**
```sql
-- Verifica lock su tabella
SELECT * FROM MA_CodingRules_SimplifiedSequentials WITH (NOLOCK)
WHERE CompanyId = 1;

-- Reset sequenziale per un prefisso (se necessario)
UPDATE MA_CodingRules_SimplifiedSequentials
SET LastSequential = '000'
WHERE CompanyId = 1 AND Prefix = 'RCANCSP';
```

---

## 📞 Supporto

Per domande o problemi:
1. Verifica i log backend (console)
2. Controlla browser console (Network tab)
3. Query di debug database (vedi sezione Monitoraggio)

---

## 🎉 Prossimi Passi

1. ✅ Esegui script SQL
2. ✅ Attiva per una company di test
3. ✅ Testa flusso completo copia BOM + ricodifica
4. ✅ Verifica switch tra logiche
5. ✅ Se tutto OK, attiva in produzione

Buon testing! 🚀
