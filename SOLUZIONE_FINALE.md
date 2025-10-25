# ✅ SOLUZIONE FINALE - Approvazione Intercompany

**Data**: 2025-10-25
**Problema**: Approvazione non funziona - targetProjectId rimane null

---

## 🔍 Diagnosi Completa

### ✅ Cosa Funziona
- Stored procedures esistono nel database
- Campi SourceProjectId e TargetProjectId esistono nella tabella
- Backend chiama correttamente la SP
- Frontend invia la richiesta correttamente

### ❌ Problema Identificato

**Le references 2008 e 2009 hanno `SourceProjectId = NULL`**

```sql
ReferenceId    SourceProjectId    Status
2008           NULL               PENDING
2009           NULL               PENDING
```

Queste references sono state create **PRIMA** dell'implementazione del sistema progetti.

La stored procedure `MA_ApproveIntercompanyReference` **RICHIEDE** che SourceProjectId sia popolato, altrimenti:
- Esce prematuramente al controllo (linea 90-96)
- Non imposta correttamente l'errore
- Restituisce errorCode=0 ma targetProjectId=null

---

## 🚀 SOLUZIONI (Scegli UNA)

### ⭐ Soluzione 1: Fix Automatico (CONSIGLIATA)

Esegui questo script SQL che trova automaticamente i progetti e popola SourceProjectId:

```sql
-- File: database/FIX_SourceProjectId_References.sql
-- Esegui questo script in SQL Server Management Studio
```

Lo script:
1. Cerca i progetti che contengono gli articoli delle references
2. Popola automaticamente SourceProjectId
3. Verifica il risultato

**Dopo l'esecuzione**:
- Riavvia backend Node.js
- Prova ad approvare di nuovo dalla Dashboard

---

### ⭐ Soluzione 2: Aggiornamento Manuale

Se conosci i progetti da cui provengono i componenti:

```sql
-- Trova il progetto che contiene il componente
SELECT
    pi.ProjectID,
    p.Name AS ProjectName,
    pi.ItemId,
    i.Item AS ItemCode
FROM MA_ProjectsItems pi
JOIN MA_Projects p ON pi.ProjectID = p.ProjectID
JOIN MA_ProjectArticles_Items i ON pi.ItemId = i.Id
WHERE pi.ItemId IN (5062, 12404)  -- IDs componenti references 2008, 2009
  AND pi.CompanyId = 1  -- Ricos

-- Una volta trovato il ProjectID, aggiorna:
UPDATE MA_ProjectArticles_References
SET SourceProjectId = 123  -- ⬅ Sostituisci con ProjectID reale
WHERE ReferenceId IN (2008, 2009)
```

---

### ⭐ Soluzione 3: Ricrea References (PIÙ PULITA)

Elimina le references vecchie e ricreale dal BOMViewer:

```sql
-- 1. Elimina references vecchie
DELETE FROM MA_ProjectArticles_ReferencesLog
WHERE ReferenceID IN (2008, 2009)

DELETE FROM MA_ProjectArticles_References
WHERE ReferenceId IN (2008, 2009)
```

**Poi nel frontend**:
1. Apri il progetto Ricos nel BOMViewer
2. Click "Sincronizza Intercompany"
3. Seleziona i componenti PSQU00000000001 e TMP0010000000002
4. Conferma

Le nuove references avranno automaticamente SourceProjectId popolato! ✅

---

## 🔧 Fix Aggiuntivi Applicati

### 1. Stored Procedure Aggiornata

Ho creato: `database/03b - Fix SP MA_ApproveIntercompanyReference_OutputParameters.sql`

**Miglioramenti**:
- ✅ Messaggi di errore più dettagliati
- ✅ Migliore gestione parametri OUTPUT
- ✅ Segnala chiaramente quando SourceProjectId manca
- ✅ Include suggerimenti nelle segnalazioni d'errore

**Eseguilo** per avere migliori errori diagnostici:
```sql
-- File: database/03b - Fix SP MA_ApproveIntercompanyReference_OutputParameters.sql
```

### 2. Backend Aggiornato

Ho modificato `backend/queries/projectArticlesManagement.js` per rilevare quando:
- `errorCode = 0` ma `targetProjectId = null`

Ora il backend logga:
```
⚠️ WARNING: SP returned errorCode=0 but targetProjectId is NULL!
This usually means the SP exited early without setting output parameters correctly.
```

E restituisce un errore chiaro al frontend.

---

## 📋 Checklist Post-Fix

Dopo aver applicato una delle soluzioni:

### 1. Verifica Database
```sql
-- Controlla che SourceProjectId sia popolato
SELECT
    ReferenceId,
    SourceProjectId,
    TargetProjectId,
    Status
FROM MA_ProjectArticles_References
WHERE ReferenceId IN (2008, 2009)
```

Deve mostrare:
```
ReferenceId    SourceProjectId    Status
2008           123                PENDING  ← ✅ Non più NULL
2009           456                PENDING  ← ✅ Non più NULL
```

### 2. Riavvia Backend
```bash
# Riavvia il backend Node.js
pm2 restart backend
# oppure
docker restart webapptest-backend-1
```

### 3. Test Approvazione

**Dal Frontend**:
1. Login come CBL
2. Dashboard Intercompany → Inbox
3. Seleziona reference 2009
4. Click "Approva"
5. Seleziona "Crea codice temporaneo automaticamente"
6. Conferma

**Risultato Atteso**:
```json
{
  "success": 1,
  "msg": "Richiesta approvata con successo. Progetto ID: 123, Articolo: IC_TEMP_...",
  "targetProjectId": 123,        ← ✅ Non più null!
  "targetItemId": 5678,          ← ✅ Non più null!
  "targetItemCode": "IC_TEMP_RICOS_PSQU00000000001_20251025"
}
```

### 4. Verifica nel Database

```sql
-- 1. Reference deve essere ACCEPTED
SELECT
    ReferenceId,
    Status,
    TargetProjectId,
    TargetProjectItemId,
    TargetProjectItemCode
FROM MA_ProjectArticles_References
WHERE ReferenceId = 2009

-- Risultato atteso:
-- Status = 'ACCEPTED'
-- TargetProjectId = numero (non NULL)
-- TargetProjectItemId = numero (non NULL)
-- TargetProjectItemCode = 'IC_TEMP_...'

-- 2. Progetto CBL creato
SELECT
    ProjectID,
    Name,
    Description,
    CompanyId
FROM MA_Projects
WHERE Name LIKE 'IC - Ricos%'
ORDER BY TBCreated DESC

-- Deve mostrare il nuovo progetto: "IC - Ricos - [NomeProgettoOriginale]"

-- 3. Articolo temporaneo creato
SELECT
    Id,
    Item,
    Description,
    CompanyId
FROM MA_ProjectArticles_Items
WHERE Item LIKE 'IC_TEMP_RICOS_PSQU%'

-- Deve mostrare l'articolo con codice IC_TEMP_*
```

---

## 🎯 Test Completo End-to-End

### Test 1: Fix References Esistenti
1. ✅ Esegui `FIX_SourceProjectId_References.sql`
2. ✅ Riavvia backend
3. ✅ Approva reference 2009 dalla Dashboard
4. ✅ Verifica che stato diventa ACCEPTED
5. ✅ Verifica creazione progetto CBL
6. ✅ Verifica articolo temporaneo in tab "Articoli Temporanei"

### Test 2: Nuova Sincronizzazione
1. ✅ Crea un nuovo progetto Ricos
2. ✅ Aggiungi componenti al BOM
3. ✅ Marca fornitori come Intercompany (CBL)
4. ✅ Click "Sincronizza Intercompany"
5. ✅ Seleziona componenti
6. ✅ Conferma sincronizzazione
7. ✅ **Verifica nel DB**:
   ```sql
   SELECT TOP 1
       ReferenceId,
       SourceProjectId,  -- ⬅ Deve essere popolato!
       Status
   FROM MA_ProjectArticles_References
   ORDER BY TBCreated DESC
   ```
8. ✅ Login come CBL
9. ✅ Approva la nuova richiesta
10. ✅ Verifica successo

### Test 3: Sostituzione Temporaneo
1. ✅ Dashboard → Tab "Articoli Temporanei"
2. ✅ Trova articolo IC_TEMP_*
3. ✅ Click "Sostituisci"
4. ✅ Inserisci codice definitivo (es: "CBL_PROD_001")
5. ✅ Conferma
6. ✅ Verifica references aggiornate

---

## 🐛 Troubleshooting

### Problema: "SourceProjectId ancora NULL dopo fix"

**Causa**: Gli articoli non sono associati a nessun progetto

**Verifica**:
```sql
SELECT
    pi.ProjectID,
    pi.ItemId,
    i.Item
FROM MA_ProjectsItems pi
JOIN MA_ProjectArticles_Items i ON pi.ItemId = i.Id
WHERE pi.ItemId IN (5062, 12404)
  AND pi.CompanyId = 1
```

Se non torna nessuna riga → **Gli articoli non sono in nessun progetto**

**Soluzione**: Usa Soluzione 3 (ricrea references)

---

### Problema: "Cliente Intercompany non trovato"

**Errore**:
```
Cliente Intercompany non trovato per Ricos nella company target
```

**Verifica**:
```sql
SELECT
    CustSupp,
    Description,
    CompanyId,
    IntercompanyId
FROM MA_CustSupp
WHERE CustSuppType = 3211264  -- Cliente
  AND IntercompanyId = 1  -- Ricos
  AND CompanyId = 2  -- CBL
```

**Se manca**, aggiungi:
```sql
-- Trova un codice cliente libero
SELECT MAX(CustSupp) FROM MA_CustSupp WHERE CompanyId = 2

-- Inserisci cliente Intercompany
INSERT INTO MA_CustSupp (
    CustSupp,
    Description,
    CompanyId,
    CustSuppType,
    IntercompanyId,
    TBCreated
)
VALUES (
    '00999',  -- Codice cliente (verifica che sia libero)
    'Ricos - Intercompany',
    2,  -- CBL
    3211264,  -- Tipo Cliente
    1,  -- ID Company Ricos
    GETDATE()
)
```

---

### Problema: Backend ancora torna null

**Log backend**:
```
⚠️ WARNING: SP returned errorCode=0 but targetProjectId is NULL!
```

**Causa**: SP ancora usa la versione vecchia

**Soluzione**:
1. Esegui `03b - Fix SP MA_ApproveIntercompanyReference_OutputParameters.sql`
2. Riavvia backend
3. Riprova

Se persiste:
```sql
-- Debug manuale SP
DECLARE @TargetProjectId INT
DECLARE @TargetItemId BIGINT
DECLARE @ErrorCode INT
DECLARE @ErrorMessage NVARCHAR(4000)

EXEC MA_ApproveIntercompanyReference
    @ReferenceID = 2009,
    @UserId = 24,
    @ResponseNotes = NULL,
    @TargetItemCode = NULL,
    @CreateTemporaryIfMissing = 1,
    @TargetProjectId = @TargetProjectId OUTPUT,
    @TargetItemId = @TargetItemId OUTPUT,
    @ErrorCode = @ErrorCode OUTPUT,
    @ErrorMessage = @ErrorMessage OUTPUT

-- Mostra output
SELECT
    @ErrorCode AS ErrorCode,
    @ErrorMessage AS ErrorMessage,
    @TargetProjectId AS TargetProjectId,
    @TargetItemId AS TargetItemId
```

Se ErrorCode != 0, leggi ErrorMessage per capire il problema.

---

## 📞 Supporto

Se dopo tutti i fix il problema persiste:

1. **Esegui script verifica**:
   ```sql
   -- database/00 - VERIFICA_INSTALLAZIONE.sql
   ```

2. **Controlla log backend** per errori SQL dettagliati

3. **Esegui debug manuale SP** (query sopra)

4. **Verifica configurazione MA_CustSupp** (clienti Intercompany)

---

## ✅ Checklist Finale

- [ ] Eseguito FIX_SourceProjectId_References.sql (o scelta alternativa)
- [ ] SourceProjectId popolato nelle references
- [ ] Eseguito 03b - Fix SP (opzionale ma consigliato)
- [ ] Backend riavviato
- [ ] Test approvazione reference esistente → successo
- [ ] Test nuova sincronizzazione → SourceProjectId popolato automaticamente
- [ ] Test approvazione nuova reference → progetto creato
- [ ] Dashboard mostra nomi progetti correttamente
- [ ] Tab "Articoli Temporanei" funziona
- [ ] Test sostituzione codice temporaneo → successo

---

**Fine Documento - Implementazione Completa**
