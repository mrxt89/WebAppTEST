# 🔧 Fix Approvazione Intercompany e Nomi Progetti

**Data**: 2025-10-25
**Problema**: L'approvazione non funziona - rimane PENDING e non crea progetti

---

## ❌ Problema Identificato

Dalla richiesta di approvazione:
```json
{
  "success": 1,
  "msg": "Richiesta approvata con successo",
  "targetItemCode": "MARCO01",
  "targetItemId": null,           // ❌ DOVREBBE ESSERE POPOLATO
  "targetProjectId": null          // ❌ DOVREBBE ESSERE POPOLATO
}
```

E dalla lista richieste:
- Stato rimane `PENDING` invece di diventare `ACCEPTED`
- Non viene creato alcun progetto target

**CAUSA**: Le stored procedures SQL non sono state eseguite nel database!

---

## ✅ Soluzione: Eseguire gli Script SQL

### 1. Verifica se le Stored Procedures Esistono

Esegui questa query in SQL Server Management Studio o altro tool SQL:

```sql
SELECT
    OBJECT_ID('MA_ApproveIntercompanyReference') AS SP_Approve,
    OBJECT_ID('MA_CreateTemporaryIntercompanyItem') AS SP_TempItem,
    OBJECT_ID('MA_ProjectArticles_SyncIntercompanyComponents') AS SP_Sync
```

**Se i risultati sono NULL** → Le stored procedures NON esistono, devi eseguire gli script.

**Se i risultati sono numeri** → Le stored procedures esistono. Vai al punto 3 per debug.

---

### 2. Esegui gli Script SQL in Ordine

Esegui questi file SQL **nell'ordine esatto**:

#### Script 1: Aggiungi Campi alla Tabella
```sql
-- File: database/01 - Fix table MA_ProjectArticles_References.sql
```
Questo script aggiunge `SourceProjectId` e `TargetProjectId` alla tabella.

Verifica dopo l'esecuzione:
```sql
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'MA_ProjectArticles_References'
  AND COLUMN_NAME IN ('SourceProjectId', 'TargetProjectId')
```

Dovresti vedere 2 righe.

---

#### Script 2: Crea SP per Codici Temporanei
```sql
-- File: database/02 - Create SP MA_CreateTemporaryIntercompanyItem.sql
```

Verifica:
```sql
SELECT OBJECT_ID('MA_CreateTemporaryIntercompanyItem')
-- Deve tornare un numero, non NULL
```

---

#### Script 3: Crea SP per Approvazione (IMPORTANTE!)
```sql
-- File: database/03 - Create SP MA_ApproveIntercompanyReference.sql
```

Verifica:
```sql
SELECT OBJECT_ID('MA_ApproveIntercompanyReference')
-- Deve tornare un numero, non NULL
```

**QUESTA È LA STORED PROCEDURE PRINCIPALE** che crea il progetto target e gestisce l'approvazione.

---

#### Script 4: Aggiorna SP di Sincronizzazione
```sql
-- File: database/04 - Update SP MA_ProjectArticles_SyncIntercompanyComponents.sql
```

Verifica:
```sql
-- Controlla che la SP accetti il parametro @ProjectId
EXEC sp_helptext 'MA_ProjectArticles_SyncIntercompanyComponents'
```

Cerca nella definizione: `@ProjectId INT`

---

### 3. Test dell'Approvazione

Dopo aver eseguito gli script, testa l'approvazione:

#### 3.1 Approva una richiesta dal frontend
1. Vai alla Dashboard Intercompany
2. Seleziona una richiesta PENDING
3. Click "Approva"
4. Scegli "Crea codice temporaneo automaticamente"
5. Conferma

#### 3.2 Verifica nel Database

```sql
-- Controlla che lo stato sia cambiato
SELECT
    ReferenceId,
    Status,                    -- Deve essere 'ACCEPTED'
    TargetProjectId,           -- Deve avere un ID, non NULL
    TargetProjectItemId,       -- Deve avere un ID, non NULL
    TargetProjectItemCode,     -- Deve essere IC_TEMP_* o il codice manuale
    SourceProjectId,
    ResponseNotes
FROM MA_ProjectArticles_References
WHERE ReferenceId = 2009  -- Usa l'ID della tua richiesta
```

#### 3.3 Verifica Progetto Creato

```sql
-- Controlla che sia stato creato il progetto target
SELECT
    p.ProjectID,
    p.Name,
    p.Description,
    p.CompanyId,
    c.Description AS CompanyName,
    p.CustSupp AS ClienteIntercompanyCode
FROM MA_Projects p
JOIN AR_Companies c ON p.CompanyId = c.CompanyId
WHERE p.Name LIKE 'IC - %'
ORDER BY p.TBCreated DESC
```

Dovresti vedere un progetto con nome tipo: `IC - Ricos - [NomeProgettoOriginale]`

#### 3.4 Verifica Articolo Temporaneo (se creato)

```sql
-- Controlla articoli temporanei creati
SELECT
    Id,
    Item,                      -- Deve essere IC_TEMP_*
    Description,
    CompanyId,
    TBCreated,
    Notes
FROM MA_ProjectArticles_Items
WHERE Item LIKE 'IC_TEMP_%'
ORDER BY TBCreated DESC
```

---

## 📊 Nomi Progetti nella Dashboard (COMPLETATO)

Ho aggiornato il backend per mostrare i nomi dei progetti invece degli ID.

### Modifiche Backend

**File**: `backend/queries/projectArticlesManagement.js`
**Funzione**: `getIntercompanyRequests` (linea ~3523)

**Campi Aggiunti alla Query**:
```sql
-- Progetto Sorgente
ref.SourceProjectId,
srcProj.Name AS SourceProjectName,
srcProj.Description AS SourceProjectDescription,

-- Progetto Target
ref.TargetProjectId,
tgtProj.Name AS TargetProjectName,
tgtProj.Description AS TargetProjectDescription,

-- Codice Articolo Target
ref.TargetProjectItemCode
```

**JOIN Aggiunti**:
```sql
LEFT JOIN MA_Projects srcProj
  ON ref.SourceProjectId = srcProj.ProjectID
  AND srcProj.CompanyId = ref.SourceCompanyId

LEFT JOIN MA_Projects tgtProj
  ON ref.TargetProjectId = tgtProj.ProjectID
  AND tgtProj.CompanyId = ref.TargetCompanyId
```

### Dati Disponibili nel Frontend

Ora nell'array `requests` ogni richiesta include:

```javascript
{
  ReferenceId: 2009,
  ComponentCode: "PSQU00000000001",
  ComponentDescription: "Piastra Squadrata",
  Status: "ACCEPTED",

  // ⭐ NUOVI CAMPI PROGETTI
  SourceProjectId: 123,
  SourceProjectName: "Progetto Pompa XYZ",
  SourceProjectDescription: "Sviluppo nuova pompa",

  TargetProjectId: 456,
  TargetProjectName: "IC - Ricos - Progetto Pompa XYZ",
  TargetProjectDescription: "Progetto intercompany",

  TargetProjectItemCode: "IC_TEMP_RICOS_PSQU00000000001_20251025"
}
```

### Frontend - Mostrare i Nomi Progetti

Per mostrare i nomi nella tabella della Dashboard, puoi aggiungere una colonna:

**File**: `frontend/src/pages/progetti/intercompany/IntercompanyDashboard.jsx`

Nella funzione `renderRequestTable`, nella `<TableHeader>`:

```jsx
<TableRow>
  <TableHead>Componente</TableHead>
  <TableHead>Tipo</TableHead>
  <TableHead>{direction === 'IN' ? 'Da Company' : 'A Company'}</TableHead>
  <TableHead>Progetto Sorgente</TableHead>  {/* ⭐ NUOVO */}
  <TableHead>Stato</TableHead>
  <TableHead>Data</TableHead>
  {direction === 'IN' && <TableHead className="text-right">Azioni</TableHead>}
</TableRow>
```

E nel `<TableBody>`:

```jsx
<TableCell>
  <div className="text-sm">
    {request.SourceProjectName || '-'}
  </div>
  <div className="text-xs text-gray-500">
    ID: {request.SourceProjectId || 'N/A'}
  </div>
</TableCell>
```

---

## 🧪 Testing Completo

### Test 1: Sincronizzazione da Ricos
1. ✅ Apri progetto Ricos nel BOMViewer
2. ✅ Click "Sincronizza Intercompany"
3. ✅ Seleziona componenti
4. ✅ Conferma sincronizzazione
5. ✅ **Verifica**: Nel database, le references devono avere `SourceProjectId` popolato

```sql
SELECT
    ReferenceId,
    SourceProjectId,    -- Deve essere popolato con l'ID del progetto Ricos
    SourceProjectItemId,
    TargetCompanyId,
    Status              -- Deve essere 'PENDING'
FROM MA_ProjectArticles_References
ORDER BY TBCreated DESC
```

### Test 2: Approvazione da CBL con Codice Temporaneo
1. ✅ Login come CBL
2. ✅ Dashboard Intercompany → Inbox
3. ✅ Seleziona richiesta PENDING
4. ✅ Click "Approva"
5. ✅ Seleziona "Crea codice temporaneo automaticamente"
6. ✅ Aggiungi note (opzionale)
7. ✅ Conferma

**Verifica Database**:
```sql
-- 1. Reference deve essere ACCEPTED
SELECT Status, TargetProjectId, TargetProjectItemCode
FROM MA_ProjectArticles_References
WHERE ReferenceId = [ID_RICHIESTA]
-- Status = 'ACCEPTED'
-- TargetProjectId = numero
-- TargetProjectItemCode = 'IC_TEMP_...'

-- 2. Progetto CBL deve essere stato creato
SELECT * FROM MA_Projects
WHERE ProjectID = [TargetProjectId dal punto 1]
-- Name deve essere tipo: 'IC - Ricos - NomeProgetto'

-- 3. Articolo temporaneo deve esistere
SELECT * FROM MA_ProjectArticles_Items
WHERE Item = [TargetProjectItemCode dal punto 1]
-- Item tipo: 'IC_TEMP_RICOS_PSQU00000000001_20251025'
```

### Test 3: Approvazione da CBL con Codice Esistente
1. ✅ Dashboard Intercompany → Inbox
2. ✅ Seleziona richiesta PENDING
3. ✅ Click "Approva"
4. ✅ Seleziona "Usa codice esistente"
5. ✅ Inserisci codice articolo CBL (es: "CBL_PROD_001")
6. ✅ Conferma

**Verifica Database**:
```sql
SELECT
    Status,
    TargetProjectId,
    TargetProjectItemCode
FROM MA_ProjectArticles_References
WHERE ReferenceId = [ID_RICHIESTA]
-- TargetProjectItemCode = 'CBL_PROD_001' (non temporaneo)
```

### Test 4: Sostituzione Codice Temporaneo
1. ✅ Dashboard Intercompany → Tab "Articoli Temporanei"
2. ✅ Trova articolo IC_TEMP_*
3. ✅ Click "Sostituisci con codice definitivo"
4. ✅ Inserisci codice definitivo (es: "CBL_PROD_FINAL_001")
5. ✅ Conferma

**Verifica Database**:
```sql
-- 1. References aggiornate
SELECT
    ReferenceId,
    TargetProjectItemCode,
    TargetProjectItemId
FROM MA_ProjectArticles_References
WHERE TargetProjectItemCode = 'CBL_PROD_FINAL_001'

-- 2. Articolo temporaneo disabilitato
SELECT
    Item,
    Disabled,
    Notes
FROM MA_ProjectArticles_Items
WHERE Item LIKE 'IC_TEMP_%'
-- Disabled = 1
-- Notes contiene riferimento alla sostituzione
```

---

## 🚨 Troubleshooting

### Problema: "targetProjectId is null"
**Causa**: Stored procedure non eseguita o errore silenzioso
**Soluzione**:
1. Verifica esistenza SP con query al punto 1
2. Esegui script 03
3. Controlla log backend per errori SQL

### Problema: "Status rimane PENDING"
**Causa**: Stored procedure non aggiorna correttamente lo stato
**Soluzione**:
```sql
-- Verifica lo stato attuale
SELECT ReferenceId, Status, ResponseDate
FROM MA_ProjectArticles_References
WHERE ReferenceId = [ID]

-- Se necessario, aggiorna manualmente per test
UPDATE MA_ProjectArticles_References
SET Status = 'ACCEPTED', ResponseDate = GETDATE()
WHERE ReferenceId = [ID]
```

### Problema: "Articolo MARCO01 non trovato"
**Causa**: Il codice articolo specificato non esiste nel catalogo CBL
**Soluzione**:
- Usa "Crea codice temporaneo" invece di codice manuale
- Oppure verifica che l'articolo esista:
```sql
SELECT Id, Item, Description
FROM MA_ProjectArticles_Items
WHERE Item = 'MARCO01' AND CompanyId = 2  -- 2 = CBL
```

### Problema: "Cliente Intercompany non trovato"
**Causa**: Manca configurazione in MA_CustSupp
**Soluzione**:
```sql
-- Verifica clienti intercompany
SELECT
    CustSupp,
    Description,
    CompanyId,
    IntercompanyId
FROM MA_CustSupp
WHERE CustSuppType = 3211264  -- Cliente
  AND IntercompanyId IS NOT NULL

-- Se manca, aggiungi configurazione (esempio):
-- INSERT INTO MA_CustSupp (CustSupp, Description, CompanyId, CustSuppType, IntercompanyId)
-- VALUES ('IC_RICOS', 'Ricos Intercompany', 2, 3211264, 1)
```

---

## 📝 Checklist Post-Implementazione

- [ ] Script 01 eseguito con successo
- [ ] Script 02 eseguito con successo
- [ ] Script 03 eseguito con successo
- [ ] Script 04 eseguito con successo
- [ ] Tutte le stored procedures esistono (query verifica)
- [ ] Test sincronizzazione da Ricos → reference creata con SourceProjectId
- [ ] Test approvazione con codice temporaneo → progetto creato, articolo creato
- [ ] Test approvazione con codice esistente → progetto creato, articolo associato
- [ ] Test sostituzione temporaneo → references aggiornate, temporaneo disabilitato
- [ ] Dashboard mostra nomi progetti invece di NULL
- [ ] Tab "Articoli Temporanei" mostra lista articoli IC_TEMP_*

---

## 📞 Supporto

Se dopo aver eseguito gli script il problema persiste:

1. Controlla i log del backend Node.js:
   ```bash
   docker logs webapptest-backend-1 --tail 100
   ```

2. Abilita debug SQL aggiungendo in `approveIntercompanyReferenceWithProject`:
   ```javascript
   console.log('SP Parameters:', {
       referenceId, userId, targetItemCode, createTemporaryIfMissing
   });
   console.log('SP Output:', {
       errorCode, errorMessage, targetProjectId, targetItemId
   });
   ```

3. Esegui la SP manualmente in SQL Server:
   ```sql
   DECLARE @TargetProjectId INT
   DECLARE @TargetItemId BIGINT
   DECLARE @ErrorCode INT
   DECLARE @ErrorMessage NVARCHAR(4000)

   EXEC MA_ApproveIntercompanyReference
       @ReferenceID = 2009,
       @UserId = 1,
       @ResponseNotes = 'Test',
       @TargetItemCode = NULL,
       @CreateTemporaryIfMissing = 1,
       @TargetProjectId = @TargetProjectId OUTPUT,
       @TargetItemId = @TargetItemId OUTPUT,
       @ErrorCode = @ErrorCode OUTPUT,
       @ErrorMessage = @ErrorMessage OUTPUT

   SELECT @ErrorCode AS ErrorCode, @ErrorMessage AS ErrorMessage,
          @TargetProjectId AS TargetProjectId, @TargetItemId AS TargetItemId
   ```

---

**Fine Documento**
