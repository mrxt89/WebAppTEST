# Fix Sincronizzazione Referenze Intercompany durante Ricodifica

## Problema Risolto

Quando un articolo viene ricodificato dal pannello di gestione BOM nel modulo progetti, le referenze Intercompany nella tabella `MA_ProjectArticles_References` non venivano aggiornate automaticamente. Questo causava che le altre company vedessero ancora il codice vecchio.

## Soluzione Implementata

### 1. Stored Procedure SQL

**File:** `database/FIX_IntercompanyRecodingSync.sql`

#### Nuova Stored Procedure: `MA_UpdateIntercompanyReferencesAfterRecoding`

Questa stored procedure:
- Aggiorna il campo `TargetProjectItemCode` quando l'item ricodificato è il TARGET di una reference
- Aggiorna il campo `TargetProjectItemCode` quando l'item ricodificato è la SOURCE ma il suo codice è memorizzato nel campo
- Registra le modifiche nella tabella `MA_ProjectArticles_ReferencesLog`

**Parametri:**
- `@ItemId` - ID dell'articolo ricodificato
- `@OldCode` - Vecchio codice articolo
- `@NewCode` - Nuovo codice articolo
- `@CompanyId` - Company ID
- `@UserId` - User che ha eseguito la ricodifica
- `@UpdatedCount` (OUTPUT) - Numero di referenze aggiornate

#### Stored Procedure Modificata: `MA_CodingRules_ApplyBatch`

La tua stored procedure esistente è stata modificata per:
- Aggiungere la variabile `@IntercompanyUpdatedCount` per tracciare gli aggiornamenti
- Chiamare `MA_UpdateIntercompanyReferencesAfterRecoding` dopo:
  - Sostituzione con articolo esistente (dopo UPDATE Disabled)
  - Ricodifica normale (dopo UPDATE BillOfMaterials)
- Includere nel log della history il numero di referenze Intercompany aggiornate
- Mantenere tutta la logica esistente:
  - Debug PRINT statements
  - Tabella @TempResults per i risultati
  - Ciclo per trovare sequenziali liberi se codice duplicato
  - Aggiornamento Description nella BillOfMaterials

### 2. Backend JavaScript

**File:** `backend/queries/codingRulesManagement.js`

Modificata la funzione `applyBatchRecodingAlternative` per:
- Aggiornare le referenze Intercompany anche quando la stored procedure non è disponibile
- Gestire sia ricodifiche normali che sostituzioni con articoli esistenti
- Mostrare nel messaggio di successo quante referenze sono state aggiornate

**Logica di aggiornamento:**

```javascript
// 1. Aggiorna quando l'item è il TARGET
UPDATE ref
SET ref.TargetProjectItemCode = @NewCode
FROM MA_ProjectArticles_References ref
INNER JOIN MA_ProjectArticles_Items targetItem
    ON ref.TargetProjectItemId = targetItem.Id
WHERE targetItem.Id = @ItemId;

// 2. Aggiorna quando l'item è SOURCE ma il codice è in TargetProjectItemCode
UPDATE ref
SET ref.TargetProjectItemCode = @NewCode
FROM MA_ProjectArticles_References ref
INNER JOIN MA_ProjectArticles_Items sourceItem
    ON ref.SourceProjectItemId = sourceItem.Id
WHERE sourceItem.Id = @ItemId
    AND ref.TargetProjectItemCode = @OldCode;
```

## Struttura Dati

### Tabella MA_ProjectArticles_References

```sql
CREATE TABLE MA_ProjectArticles_References (
    ReferenceID INT PRIMARY KEY,
    SourceProjectItemId INT NOT NULL,
    SourceCompanyId INT NULL,
    TargetProjectItemId INT NULL,
    TargetCompanyId INT NULL,
    TargetProjectItemCode VARCHAR(50) NULL,  -- <-- Campo aggiornato
    Status VARCHAR(20) NOT NULL,
    -- altri campi...
)
```

**Campi chiave:**
- `SourceProjectItemId` - ID dell'item nella company sorgente
- `TargetProjectItemId` - ID dell'item nella company target
- `TargetProjectItemCode` - **Codice articolo target** (aggiornato dalla ricodifica)
- `Status` - PENDING, ACCEPTED, REJECTED, ecc.

## Flusso di Esecuzione

### Scenario 1: Ricodifica Normale

1. Utente apre BOM dal modulo progetti
2. Seleziona componenti e clicca "Ricodifica"
3. Inserisce nuovo codice nella modale
4. Backend chiama `applyBatchRecoding`
5. Per ogni item ricodificato:
   - Aggiorna `MA_ProjectArticles_Items.Item`
   - Aggiorna `MA_ProjectArticles_BillOfMaterials.BOM`
   - **NUOVO:** Chiama `MA_UpdateIntercompanyReferencesAfterRecoding`
   - Aggiorna `MA_ProjectArticles_References.TargetProjectItemCode`
6. Altre company vedono immediatamente il nuovo codice

### Scenario 2: Sostituzione con Articolo Esistente

1. Utente seleziona "Sostituisci con articolo esistente"
2. Backend sostituisce i riferimenti all'articolo vecchio
3. Disabilita l'articolo vecchio
4. **NUOVO:** Aggiorna le referenze Intercompany con il nuovo codice
5. Altre company vedono il nuovo codice

## Applicazione delle Modifiche

### 1. Database

**IMPORTANTE:** Lo script modifica la stored procedure `MA_CodingRules_ApplyBatch` che hai già in ProgettiIntercompany.sql. La modifica è minimale e aggiunge solo la sincronizzazione Intercompany senza toccare la tua logica esistente.

Eseguire lo script SQL:

```bash
sqlcmd -S server -d WebAppTEST -i database/FIX_IntercompanyRecodingSync.sql
```

Oppure tramite SQL Server Management Studio:
1. Aprire `FIX_IntercompanyRecodingSync.sql`
2. Eseguire lo script

Lo script eseguirà:
- `CREATE OR ALTER` di `MA_UpdateIntercompanyReferencesAfterRecoding` (nuova)
- `ALTER` di `MA_CodingRules_ApplyBatch` (modifica la tua esistente)

### 2. Backend

Il codice backend è già stato aggiornato, basta riavviare il server:

```bash
cd backend
npm restart
```

## Casi d'Uso

### Caso 1: Company A ricodifica un componente condiviso con Company B

**Prima:**
- Company A: Item ID 100, Codice "ABC123"
- Company B vede: Reference con TargetProjectItemCode "ABC123"
- Company A ricodifica in "XYZ789"
- Company B continua a vedere "ABC123" ❌

**Dopo:**
- Company A: Item ID 100, Codice "ABC123"
- Company B vede: Reference con TargetProjectItemCode "ABC123"
- Company A ricodifica in "XYZ789"
- Reference aggiornata automaticamente: TargetProjectItemCode "XYZ789" ✅
- Company B vede immediatamente "XYZ789" ✅

### Caso 2: Company B ricodifica un articolo ricevuto da Company A

Funziona allo stesso modo, indipendentemente da chi è source o target.

## Test

### Test Manuale

1. **Setup:**
   - Creare una reference Intercompany tra due company
   - Verificare che `TargetProjectItemCode` contenga il codice originale

2. **Test Ricodifica:**
   - Aprire BOM nella company sorgente o target
   - Selezionare il componente condiviso
   - Ricodificare con un nuovo codice
   - Verificare che `TargetProjectItemCode` sia aggiornato

3. **Verifica:**
   ```sql
   SELECT
       ReferenceID,
       SourceProjectItemId,
       TargetProjectItemId,
       TargetProjectItemCode,
       Status,
       TBModified
   FROM MA_ProjectArticles_References
   WHERE TargetProjectItemCode = 'NUOVO_CODICE'
   ```

### Test con Sostituzione

1. Ricodificare sostituendo con articolo esistente
2. Verificare che le referenze vengano aggiornate
3. Verificare che l'articolo vecchio sia disabilitato

## Log e Debugging

### Console Log Backend

Il backend stampa:
```
Aggiornate X referenze Intercompany per item 12345
```

### Tabella Log

Le modifiche vengono registrate in `MA_ProjectArticles_ReferencesLog`:

```sql
SELECT
    LogID,
    ReferenceID,
    Action,
    UserId,
    ActionDate
FROM MA_ProjectArticles_ReferencesLog
WHERE Action = 'RECODE'
ORDER BY ActionDate DESC
```

### History

La tabella `MA_CodingRules_History` ora include:
```
Ricodifica batch da ABC123 a XYZ789 (Aggiornate 3 referenze Intercompany)
```

## Limitazioni e Note

1. **Solo TargetProjectItemCode:**
   - Viene aggiornato solo il campo `TargetProjectItemCode`
   - Gli ID (`TargetProjectItemId`) rimangono invariati

2. **Transazionalità:**
   - L'aggiornamento delle referenze è transazionale con la ricodifica
   - Se la ricodifica fallisce, anche l'aggiornamento Intercompany viene annullato

3. **Errori Intercompany non bloccanti:**
   - Se l'aggiornamento Intercompany fallisce, la ricodifica continua
   - L'errore viene loggato ma non blocca l'operazione principale

4. **Performance:**
   - Per batch di molti item, l'aggiornamento è ottimizzato con UPDATE set-based
   - Non ci sono cicli o cursor aggiuntivi

## Rollback

In caso di problemi, per tornare indietro:

1. **Ripristino Stored Procedure:**
   ```sql
   -- Eliminare la nuova SP
   DROP PROCEDURE IF EXISTS MA_UpdateIntercompanyReferencesAfterRecoding;

   -- Ripristinare MA_CodingRules_ApplyBatch dal backup
   -- (conservare una copia prima di eseguire lo script)
   ```

2. **Codice Backend:**
   - Ripristinare `codingRulesManagement.js` dal version control
   - Riavviare il backend

## Supporto

Per problemi o domande:
1. Verificare i log del backend
2. Controllare `MA_ProjectArticles_ReferencesLog` per vedere se l'aggiornamento è avvenuto
3. Verificare che lo script SQL sia stato eseguito correttamente
4. Controllare che la stored procedure `MA_UpdateIntercompanyReferencesAfterRecoding` esista

## Changelog

### Versione 1.0 (2025-10-29)
- ✅ Creata stored procedure `MA_UpdateIntercompanyReferencesAfterRecoding`
- ✅ Modificata `MA_CodingRules_ApplyBatch` per chiamare la nuova SP
- ✅ Aggiornato `applyBatchRecodingAlternative` in codingRulesManagement.js
- ✅ Aggiunto logging delle referenze aggiornate
- ✅ Supporto sia per ricodifica normale che sostituzione con esistente
