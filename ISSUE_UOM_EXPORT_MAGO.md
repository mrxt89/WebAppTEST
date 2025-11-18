# 🐛 ISSUE: Unità di Misura (UoM) Disallineata nell'Export verso Mago

**Data**: 2025-01-15
**Status**: ✅ RISOLTO (Frontend) + ⚠️ DA APPLICARE (Database)
**Priorità**: ALTA

---

## 📋 PROBLEMA ORIGINALE

### Sintomi
1. Crei una nuova BOM nel progetto
2. Aggiungi un componente (materia prima) con **UM = "MT"**
3. Esporti la distinta in Mago (ERP)
4. **Risultato**:
   - ✅ `MA_BillOfMaterialsComp.UoM = "MT"` → **Corretto**
   - ❌ `MA_Items.BaseUoM = "NR"` → **SBAGLIATO!**

### Impatto
- Quando crei ODP con UM diversa da quella attesa → **ERRORE in Mago**
- Dati disallineati tra BOM e anagrafica articoli

---

## 🔍 CAUSA ROOT

### Problema 1: Frontend - Naming inconsistente
**File**: `frontend/src/pages/progetti/progetti/articoli/BOMViewer/components/BOMHeader.jsx`

```javascript
// PRIMA (SBAGLIATO) ❌
const result = await addComponent({
  uom: "PZ",  // ← minuscolo! Backend non lo riconosce!
});

// Backend cerca:
if (bomData.UoM) {  // ← maiuscolo!
    request.input('ComponentUoM', sql.VarChar(10), bomData.UoM);
}
// Risultato: parametro NON passato alla stored procedure
```

### Problema 2: Stored Procedure - Parametro NULL
**File**: `database/WebApp.sql` (linea 3503)

```sql
-- PRIMA (SBAGLIATO) ❌
EXEC MA_ProjectArticles_SyncComponent
    @ComponentUoM = NULL,  -- ← Non passa l'UoM!
    ...

-- La stored usa fallback ma può essere NULL o sbagliato
```

### Problema 3: UPDATE_COMPONENT - Non aggiorna BaseUoM
**File**: `database/WebApp.sql` (linea 4286)

Quando modifichi l'UoM di un componente nella BOM:
```sql
-- Aggiorna SOLO la BOM ✅
UPDATE MA_ProjectArticles_BOMComponents
SET UoM = @ComponentUoM
WHERE ...

-- MA NON aggiorna l'articolo ❌
-- MA_ProjectArticles_Items.BaseUoM rimane invariato!
```

**Scenario problematico**:
1. Copi componente esistente con `BaseUoM = "NR"`
2. Crei componente temporaneo → `MA_ProjectArticles_Items.BaseUoM = "NR"`
3. Modifichi UoM nella BOM a "MT" → `MA_ProjectArticles_BOMComponents.UoM = "MT"`
4. **Disallineamento**: BOM dice "MT", articolo dice "NR"
5. Export in Mago → prende `BaseUoM = "NR"` dall'articolo ❌

### Problema 4: Frontend - Confronti strict type
**File**: `frontend/src/pages/progetti/progetti/articoli/BOMViewer/components/BOMHeaderEdit.jsx`

```javascript
// PRIMA ❌
{bom?.stato_erp !== 1 && (  // strict comparison
  <Button>Esporta in ERP</Button>
)}

// Backend ritorna stato_erp come STRINGA "1" invece di numero 1
// "1" !== 1 → TRUE → pulsante rimane visibile anche dopo export!
```

---

## ✅ SOLUZIONI APPLICATE

### 1. Frontend - BOMHeader.jsx ✅ FATTO

**File**: `frontend/src/pages/progetti/progetti/articoli/BOMViewer/components/BOMHeader.jsx`

#### Correzione 1: Naming UoM (linee 525, 585, 652)
```javascript
// PRIMA ❌
const result = await addComponent({
  uom: "PZ",
});

// DOPO ✅
const result = await addComponent({
  UoM: "PZ",
});
```

#### Correzione 2: Passa UoM per articoli selezionati (linea 703)
```javascript
// PRIMA ❌
const result = await addComponent({
  ComponentId: componentId,
  Quantity: 1,
  // ← Manca UoM!
});

// DOPO ✅
const result = await addComponent({
  ComponentId: componentId,
  Quantity: 1,
  UoM: item.BaseUoM || "PZ",  // ← Aggiunto!
});
```

---

### 2. Frontend - BOMHeaderEdit.jsx ✅ FATTO

**File**: `frontend/src/pages/progetti/progetti/articoli/BOMViewer/components/BOMHeaderEdit.jsx`

#### Correzione: Confronti type-safe (7 occorrenze)
```javascript
// PRIMA ❌
if (item?.stato_erp === 1)      // strict
if (bom?.stato_erp !== 1)       // strict
if (bom?.stato_erp === 1)       // strict

// DOPO ✅
if (item?.stato_erp == 1)       // type coercion
if (bom?.stato_erp != 1)        // type coercion
if (bom?.stato_erp == 1)        // type coercion
```

**Motivo**: Backend ritorna `stato_erp` come stringa `"1"`, non numero `1`.

**Impatto**: Dopo export, il pulsante "Esporta in ERP" **ora sparisce correttamente**.

---

### 3. Database - WebApp.sql ⚠️ DA APPLICARE MANUALMENTE

#### Modifica 1: Linea 3503
```sql
-- PRIMA ❌
EXEC MA_ProjectArticles_SyncComponent
    @ComponentUoM = NULL,

-- DOPO ✅
EXEC MA_ProjectArticles_SyncComponent
    @ComponentUoM = @ComponentUoM,
```

#### Modifica 2: Dopo linea 4289
**Inserire questo blocco:**

```sql
-- NUOVO: Se l'UoM è stata modificata, aggiorna anche BaseUoM dell'articolo temporaneo
IF @ComponentUoM IS NOT NULL
BEGIN
    DECLARE @UpdatedComponentId BIGINT;

    -- Ottieni il ComponentId dalla BOM appena aggiornata
    SELECT @UpdatedComponentId = ComponentId
    FROM MA_ProjectArticles_BOMComponents
    WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId;

    -- Aggiorna BaseUoM SOLO se l'articolo è temporaneo (stato_erp = 0)
    -- Non modificare articoli già presenti nel gestionale!
    UPDATE MA_ProjectArticles_Items
    SET BaseUoM = @ComponentUoM
    WHERE Id = @UpdatedComponentId
        AND CompanyId = @CompanyId
        AND stato_erp = 0;  -- Solo articoli temporanei
END
```

**Posizione**:
- **DOPO**: `WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId;` (linea 4289)
- **PRIMA**: `-- NUOVO: Gestione aggiornamento dati fornitore` (linea 4291)

---

## 📊 FLUSSO CORRETTO DOPO IL FIX

### Scenario 1: Aggiunta Componente con UM="MT"

**PRIMA** ❌:
```
1. Frontend: addComponent({ uom: "MT" })  ← minuscolo
2. Backend: bomData.UoM → undefined
3. Stored: @ComponentUoM → NULL
4. Fallback: BaseUoM da articolo → "NR" o NULL
5. Export: MA_Items.BaseUoM = "NR"  ❌
```

**DOPO** ✅:
```
1. Frontend: addComponent({ UoM: "MT" })  ← maiuscolo
2. Backend: bomData.UoM = "MT"
3. Stored: @ComponentUoM = "MT"
4. DB: MA_ProjectArticles_Items.BaseUoM = "MT"
5. Export: MA_Items.BaseUoM = "MT"  ✅
```

---

### Scenario 2: Modifica UM Componente Temporaneo

**PRIMA** ❌:
```
1. Copia componente da esistente (BaseUoM = "NR")
2. Crea temp: MA_ProjectArticles_Items.BaseUoM = "NR"
3. Modifica BOM: MA_ProjectArticles_BOMComponents.UoM = "MT"
4. MA_ProjectArticles_Items.BaseUoM = "NR"  ← NON aggiornato!
5. Export: MA_Items.BaseUoM = "NR"  ❌
```

**DOPO** ✅:
```
1. Copia componente da esistente (BaseUoM = "NR")
2. Crea temp: MA_ProjectArticles_Items.BaseUoM = "NR"
3. Modifica BOM:
   a. MA_ProjectArticles_BOMComponents.UoM = "MT"
   b. MA_ProjectArticles_Items.BaseUoM = "MT"  ← AGGIORNATO!
4. Export: MA_Items.BaseUoM = "MT"  ✅
```

---

### Scenario 3: Pulsante "Esporta" dopo Export

**PRIMA** ❌:
```
1. Export BOM → stato_erp = "1" (stringa)
2. Frontend: bom?.stato_erp !== 1 → "1" !== 1 → TRUE
3. Pulsante "Esporta" → VISIBILE  ❌
4. Puoi cliccare di nuovo (ma non fa nulla)
```

**DOPO** ✅:
```
1. Export BOM → stato_erp = "1" (stringa)
2. Frontend: bom?.stato_erp != 1 → "1" != 1 → FALSE
3. Pulsante "Esporta" → NASCOSTO  ✅
4. Appare "Sincronizza da ERP"  ✅
```

---

## 🧪 TEST DA EFFETTUARE

### Test 1: Nuovo componente con UM="MT"
```
1. Crea nuova BOM
2. Aggiungi componente manuale:
   - Codice: MP-TEST-MT-001
   - Descrizione: Test Materia Prima
   - UM: MT
3. Salva BOM
4. Esporta in Mago
5. Verifica:
   ✅ MA_BillOfMaterialsComp.UoM = "MT"
   ✅ MA_Items.BaseUoM = "MT"  ← Deve essere MT!
```

### Test 2: Modifica UM componente temporaneo
```
1. Copia BOM da articolo esistente con componente UM="NR"
2. Crea componente temporaneo (flag "Crea nuovo codice")
3. Modifica UM del componente da "NR" a "MT"
4. Salva
5. Esporta in Mago
6. Verifica:
   ✅ MA_BillOfMaterialsComp.UoM = "MT"
   ✅ MA_Items.BaseUoM = "MT"  ← Deve essere aggiornato!
```

### Test 3: Pulsante Export dopo export
```
1. Crea BOM
2. Esporta in Mago
3. Verifica UI:
   ✅ Pulsante "Esporta in ERP" → NASCOSTO
   ✅ Pulsante "Sincronizza da ERP" → VISIBILE
   ✅ Badge "Presente in ERP" → VISIBILE
4. Esci da modalità edit
5. Riapri modalità edit
6. Verifica:
   ✅ Pulsante "Modifica" → DISABILITATO
   ✅ Tooltip: "Articolo bloccato" o simile
```

---

## 📁 FILE MODIFICATI

### ✅ Frontend (GIÀ APPLICATO)
```
frontend/src/pages/progetti/progetti/articoli/BOMViewer/components/
├── BOMHeader.jsx                ✅ Modificato (4 correzioni)
│   ├── Linea 525: uom → UoM
│   ├── Linea 585: uom → UoM
│   ├── Linea 652: uom → UoM
│   └── Linea 703: Aggiunto UoM: item.BaseUoM || "PZ"
│
└── BOMHeaderEdit.jsx            ✅ Modificato (7 correzioni)
    ├── Linea 125: === → ==
    ├── Linea 168: === → ==
    ├── Linea 193: !== → !=
    ├── Linea 783: === → ==
    ├── Linea 804: !== → !=
    ├── Linea 827: === → ==
    └── Linea 850: === → ==
```

### ⚠️ Database (DA APPLICARE MANUALMENTE)
```
database/
└── WebApp.sql                   ⚠️ DA MODIFICARE
    ├── Linea 3503: NULL → @ComponentUoM
    └── Dopo linea 4289: Inserire blocco UPDATE BaseUoM
```

---

## 📋 FILE DI RIFERIMENTO CREATO

**File**: `database/PATCH_UoM_Fix.sql`

Contiene:
- ✅ Istruzioni complete per applicare le modifiche
- ✅ Codice SQL pronto da copiare
- ✅ Verifiche post-applicazione
- ✅ Test funzionale
- ✅ Procedura di rollback

---

## 🎯 CHECKLIST COMPLETAMENTO

### Frontend ✅ COMPLETATO
- [x] BOMHeader.jsx - Correzione naming UoM (3 occorrenze)
- [x] BOMHeader.jsx - Aggiunto UoM per selezione articoli
- [x] BOMHeaderEdit.jsx - Correzione confronti stato_erp (7 occorrenze)
- [ ] Test: Aggiunta componente con UM="MT"
- [ ] Test: Modifica UM componente
- [ ] Test: UI dopo export

### Database ⚠️ DA FARE
- [ ] Backup database
- [ ] Modifica linea 3503 (NULL → @ComponentUoM)
- [ ] Inserimento blocco UPDATE BaseUoM (dopo linea 4289)
- [ ] Test stored procedure
- [ ] Verifica export in Mago
- [ ] Commit modifiche

---

## 📝 ISTRUZIONI APPLICAZIONE DATABASE

### Step 1: Backup
```sql
-- Esegui backup completo del database
BACKUP DATABASE [NomeDatabase] TO DISK = 'C:\Backup\WebApp_pre_UoM_fix.bak'
```

### Step 2: Apri file SQL
```
Apri: database/WebApp.sql
Editor: SQL Server Management Studio o VS Code
```

### Step 3: Modifica 1 (linea 3503)
**Trova**:
```sql
@ComponentUoM = NULL,
```

**Sostituisci con**:
```sql
@ComponentUoM = @ComponentUoM,
```

### Step 4: Modifica 2 (dopo linea 4289)
**Trova**:
```sql
WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId;

-- NUOVO: Gestione aggiornamento dati fornitore
```

**Inserisci TRA le due righe**:
```sql
WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId;

-- NUOVO: Se l'UoM è stata modificata, aggiorna anche BaseUoM dell'articolo temporaneo
IF @ComponentUoM IS NOT NULL
BEGIN
    DECLARE @UpdatedComponentId BIGINT;

    SELECT @UpdatedComponentId = ComponentId
    FROM MA_ProjectArticles_BOMComponents
    WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId;

    UPDATE MA_ProjectArticles_Items
    SET BaseUoM = @ComponentUoM
    WHERE Id = @UpdatedComponentId
        AND CompanyId = @CompanyId
        AND stato_erp = 0;
END

-- NUOVO: Gestione aggiornamento dati fornitore
```

### Step 5: Deploy
```sql
-- Opzione A: Deploy completo stored procedure
USE [NomeDatabase]
GO

-- Drop stored procedure esistente
DROP PROCEDURE IF EXISTS [dbo].[MA_ProjectArticles_AddUpdateBOM]
GO

-- Esegui script completo (con modifiche)
-- (incolla stored procedure modificata)
```

```sql
-- Opzione B: Modifica in-place (più rischioso)
ALTER PROCEDURE [dbo].[MA_ProjectArticles_AddUpdateBOM]
...
```

### Step 6: Verifica
```sql
-- Test 1: Verifica sintassi
SELECT OBJECT_DEFINITION(OBJECT_ID('MA_ProjectArticles_AddUpdateBOM'))
WHERE OBJECT_DEFINITION(OBJECT_ID('MA_ProjectArticles_AddUpdateBOM')) LIKE '%@ComponentUoM = @ComponentUoM%'

-- Test 2: Verifica blocco UPDATE
SELECT OBJECT_DEFINITION(OBJECT_ID('MA_ProjectArticles_AddUpdateBOM'))
WHERE OBJECT_DEFINITION(OBJECT_ID('MA_ProjectArticles_AddUpdateBOM')) LIKE '%UPDATE MA_ProjectArticles_Items%BaseUoM%'
```

---

## 🚨 ROLLBACK (Se necessario)

```sql
-- Ripristina dal backup
RESTORE DATABASE [NomeDatabase] FROM DISK = 'C:\Backup\WebApp_pre_UoM_fix.bak'
WITH REPLACE;
```

---

## 🔧 TROUBLESHOOTING

### Problema: UM ancora sbagliata dopo fix
```
1. Verifica che le modifiche frontend siano deployate
2. Svuota cache browser (Ctrl+Shift+R)
3. Verifica nel Network tab che UoM sia maiuscolo
4. Controlla log backend per conferma parametro
```

### Problema: Pulsante "Esporta" ancora visibile
```
1. Verifica che BOMHeaderEdit.jsx sia stato modificato
2. Ricarica componente React
3. Controlla valore stato_erp nel Redux/Context
4. Verifica query che ritorna la BOM
```

### Problema: BaseUoM non si aggiorna
```
1. Verifica che modifica database sia stata applicata
2. Controlla che articolo sia temporaneo (stato_erp = 0)
3. Verifica che @ComponentUoM non sia NULL
4. Controlla log SQL per UPDATE statement
```

---

## 📞 SUPPORTO

### Query diagnostica
```sql
-- Verifica UoM componenti vs articoli
SELECT
    bc.Line,
    bc.UoM as BOM_UoM,
    i.BaseUoM as Item_BaseUoM,
    i.Item as ItemCode,
    i.stato_erp,
    CASE
        WHEN bc.UoM = i.BaseUoM THEN 'OK'
        ELSE 'DISALLINEATO'
    END as Stato
FROM MA_ProjectArticles_BOMComponents bc
INNER JOIN MA_ProjectArticles_Items i ON bc.ComponentId = i.Id
WHERE bc.BOMId = [BOM_ID]
ORDER BY bc.Line;
```

### Log frontend
```javascript
// In BOMHeader.jsx, linea ~698
console.log('Adding component:', {
    ComponentId: componentId,
    UoM: item.BaseUoM || "PZ",  // ← Deve essere maiuscolo!
    ...
});
```

---

## 📚 RIFERIMENTI

### Coding Standards
- **Frontend**: Usa sempre `UoM` (maiuscolo) per unità di misura
- **Backend**: Valida che `bomData.UoM` esista prima di usarlo
- **Database**: Sincronizza sempre `BaseUoM` con `BOMComponents.UoM` per articoli temporanei

### Type Coercion vs Strict Comparison
```javascript
// Type coercion (==, !=)
"1" == 1   // true
"1" != 1   // false

// Strict comparison (===, !==)
"1" === 1  // false
"1" !== 1  // true

// Usare == quando il backend può ritornare stringhe o numeri
```

---

**Ultimo aggiornamento**: 2025-01-15
**Prossima revisione**: Dopo applicazione modifiche database e test
