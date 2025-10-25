# Gestione Progetti e Condivisione Codici Intercompany

## Panoramica

Questo documento descrive le modifiche implementate per gestire la condivisione di progetti e articoli tra aziende dello stesso gruppo (Intercompany) con tracciamento completo dei progetti sorgente e target.

## Scenario

- **Ricos** crea un progetto e articoli con distinte base
- Quando sincronizza, se trova componenti di **conto lavoro** o **acquisto Intercompany**, crea riferimenti in `MA_ProjectArticles_References`
- **CBL** riceve le richieste e può approvarle o rifiutarle
- All'approvazione:
  - Si crea automaticamente un **progetto CBL** con cliente = Ricos
  - Gli articoli vengono aggiunti al progetto CBL
  - Se il codice articolo non esiste, viene creato un **codice temporaneo**
  - Componenti successivi dello stesso progetto Ricos vengono accodati allo stesso progetto CBL

## Modifiche Database

### 1. Tabella MA_ProjectArticles_References

**Nuovi campi aggiunti:**

```sql
SourceProjectId INT NULL  -- ID del progetto sorgente (es. progetto Ricos)
TargetProjectId INT NULL  -- ID del progetto target (es. progetto CBL creato all'approvazione)
```

**File:** `01 - Fix table MA_ProjectArticles_References.sql`

Questo script:
- Aggiunge i due nuovi campi se non esistono
- Crea foreign key constraints verso `MA_Projects`
- Crea indici per ottimizzare le query

## Stored Procedures

### 2. MA_CreateTemporaryIntercompanyItem

**File:** `02 - Create SP MA_CreateTemporaryIntercompanyItem.sql`

**Scopo:** Crea automaticamente un codice articolo temporaneo quando CBL approva un componente ma non ha ancora il codice definitivo.

**Parametri:**
- `@SourceItemId`: ID dell'articolo sorgente (Ricos)
- `@SourceCompanyId`: ID azienda sorgente
- `@TargetCompanyId`: ID azienda target (CBL)
- `@UserId`: ID utente che crea l'articolo
- **OUTPUT** `@NewItemId`: ID del nuovo articolo creato
- **OUTPUT** `@NewItemCode`: Codice del nuovo articolo
- **OUTPUT** `@ErrorCode`: 0 = successo
- **OUTPUT** `@ErrorMessage`: Messaggio di esito

**Logica:**
- Genera codice univoco: `IC_TEMP_{CompanyCode}_{SourceItemCode}_{YYYYMMDD}[_{N}]`
- Esempio: `IC_TEMP_RICOS_ML45612DRT_20251025`
- Copia dimensioni e caratteristiche dall'articolo sorgente
- Imposta `Nature = 22413313` (Prodotto Finito)
- Descrizione: `"INTERCOMPANY - {CompanyName} - {SourceCode}"`
- Note: `"CODICE TEMPORANEO INTERCOMPANY - Da sostituire con codice definitivo"`

**Esempio di utilizzo:**

```sql
DECLARE @NewId BIGINT, @NewCode VARCHAR(64), @ErrCode INT, @ErrMsg NVARCHAR(4000);

EXEC MA_CreateTemporaryIntercompanyItem
    @SourceItemId = 12345,
    @SourceCompanyId = 1,  -- Ricos
    @TargetCompanyId = 2,  -- CBL
    @UserId = 100,
    @NewItemId = @NewId OUTPUT,
    @NewItemCode = @NewCode OUTPUT,
    @ErrorCode = @ErrCode OUTPUT,
    @ErrorMessage = @ErrMsg OUTPUT;

SELECT @NewId AS NewItemId, @NewCode AS NewItemCode, @ErrCode AS ErrorCode, @ErrMsg AS ErrorMessage;
```

### 3. MA_ApproveIntercompanyReference

**File:** `03 - Create SP MA_ApproveIntercompanyReference.sql`

**Scopo:** Gestisce l'approvazione completa di un componente Intercompany, creando/utilizzando il progetto target e l'articolo.

**Parametri:**
- `@ReferenceID`: ID della reference da approvare
- `@UserId`: ID utente che approva
- `@ResponseNotes`: Note di risposta (opzionale)
- `@TargetItemCode`: Codice articolo target se già esiste (opzionale)
- `@CreateTemporaryIfMissing`: Se 1, crea codice temporaneo se @TargetItemCode è NULL (default: 1)
- **OUTPUT** `@TargetProjectId`: ID del progetto target creato/utilizzato
- **OUTPUT** `@TargetItemId`: ID dell'articolo target creato/utilizzato
- **OUTPUT** `@ErrorCode`: 0 = successo
- **OUTPUT** `@ErrorMessage`: Messaggio di esito

**Logica:**

1. **Verifica stato** - Solo reference in stato `PENDING` possono essere approvate

2. **Progetto Target:**
   - Verifica se esiste già un progetto CBL per quel `SourceProjectId`
   - Se NO: crea nuovo progetto con:
     - Nome: `"IC - {SourceCompanyName} - {SourceProjectName}"`
     - Cliente: Ricos (cercato in `MA_CustSupp` dove `IntercompanyId = SourceCompanyId`)
     - Member principale: utente che approva
   - Se SI: usa il progetto esistente

3. **Articolo Target:**
   - Se `@TargetItemCode` fornito: verifica esistenza
   - Se NULL e `@CreateTemporaryIfMissing = 1`: chiama `MA_CreateTemporaryIntercompanyItem`
   - Associa l'articolo al progetto in `MA_ProjectsItems`

4. **Aggiorna Reference:**
   - Status = `ACCEPTED`
   - Imposta `TargetProjectId` e `TargetProjectItemId`
   - Registra nel log

**Esempio di utilizzo - Con codice esistente:**

```sql
DECLARE @TgtProjectId INT, @TgtItemId BIGINT, @ErrCode INT, @ErrMsg NVARCHAR(4000);

EXEC MA_ApproveIntercompanyReference
    @ReferenceID = 567,
    @UserId = 100,
    @ResponseNotes = 'Approvato da operatore CBL',
    @TargetItemCode = 'CBL_PROD_001',  -- Codice già esistente
    @CreateTemporaryIfMissing = 0,
    @TargetProjectId = @TgtProjectId OUTPUT,
    @TargetItemId = @TgtItemId OUTPUT,
    @ErrorCode = @ErrCode OUTPUT,
    @ErrorMessage = @ErrMsg OUTPUT;

SELECT @TgtProjectId AS TargetProjectId, @TgtItemId AS TargetItemId, @ErrCode AS ErrorCode, @ErrMsg AS ErrorMessage;
```

**Esempio di utilizzo - Con creazione automatica:**

```sql
DECLARE @TgtProjectId INT, @TgtItemId BIGINT, @ErrCode INT, @ErrMsg NVARCHAR(4000);

EXEC MA_ApproveIntercompanyReference
    @ReferenceID = 568,
    @UserId = 100,
    @ResponseNotes = 'Approvato - codice temporaneo',
    @TargetItemCode = NULL,  -- Creerà automaticamente codice temporaneo
    @CreateTemporaryIfMissing = 1,
    @TargetProjectId = @TgtProjectId OUTPUT,
    @TargetItemId = @TgtItemId OUTPUT,
    @ErrorCode = @ErrCode OUTPUT,
    @ErrorMessage = @ErrMsg OUTPUT;

SELECT @TgtProjectId AS TargetProjectId, @TgtItemId AS TargetItemId, @ErrCode AS ErrorCode, @ErrMsg AS ErrorMessage;
```

### 4. MA_ProjectArticles_SyncIntercompanyComponents (Aggiornata)

**File:** `04 - Update SP MA_ProjectArticles_SyncIntercompanyComponents.sql`

**Scopo:** Sincronizza i componenti Intercompany da Ricos verso CBL, tracciando il `SourceProjectId` e gestendo componenti già sincronizzati.

**Modifiche principali:**

1. **Nuovo parametro obbligatorio:**
   ```sql
   @ProjectId INT  -- ID del progetto sorgente
   ```

2. **Tracciamento progetto:**
   - Popola sempre `SourceProjectId` nelle references create/aggiornate

3. **Gestione componenti già sincronizzati:**
   - Verifica se esiste già una reference per quel componente verso la stessa company target
   - Se il progetto corrente è **più recente** (confronto su `TBCreated`):
     - Aggiorna `SourceProjectId`
     - Resetta `TargetProjectId = NULL`
     - Resetta `TargetProjectItemId = NULL`
     - Cambia `Status = PENDING`
     - CBL deve riapprovare
   - Se il progetto esistente è più recente: ignora

4. **Nuovo contatore:**
   - `@ReferencesReset`: numero di references resettate per progetto più recente

**Esempio di chiamata aggiornata:**

```sql
DECLARE @ErrCode INT, @ErrMsg NVARCHAR(4000);

EXEC MA_ProjectArticles_SyncIntercompanyComponents
    @CompanyId = 1,  -- Ricos
    @ProjectId = 789,  -- NUOVO PARAMETRO
    @UserId = 100,
    @Components = '[{"ComponentId":12345,"ComponentCode":"ML45612DRT","ComponentDescription":"Descrizione","TargetCompanyId":2,"TargetCompanyName":"CBL","IntercompanyType":"Acquisto","SupplierCode":"FORN001","Nature":22413314}]',
    @SyncAttachments = 1,
    @ErrorCode = @ErrCode OUTPUT,
    @ErrorMessage = @ErrMsg OUTPUT;

SELECT @ErrCode AS ErrorCode, @ErrMsg AS ErrorMessage;
```

## Flusso Operativo Completo

### Scenario 1: Prima sincronizzazione per un nuovo progetto

1. **Ricos** crea progetto `PRJ_001` con articoli e BOM
2. **Ricos** sincronizza chiamando:
   ```sql
   EXEC MA_ProjectArticles_SyncIntercompanyComponents
       @CompanyId = 1,
       @ProjectId = 100,  -- PRJ_001
       @Components = '[...]'
   ```
   - Crea references con `SourceProjectId = 100`, `Status = PENDING`

3. **CBL** visualizza le richieste nella pagina "Intercompany"

4. **CBL** approva la prima richiesta:
   ```sql
   EXEC MA_ApproveIntercompanyReference
       @ReferenceID = 1,
       @UserId = 50,
       @TargetItemCode = NULL  -- Crea automatico
   ```
   - Crea progetto CBL `IC - Ricos - PRJ_001`
   - Crea articolo temporaneo `IC_TEMP_RICOS_ML45612DRT_20251025`
   - Imposta `TargetProjectId` nella reference

5. **CBL** approva la seconda richiesta dello stesso progetto Ricos:
   ```sql
   EXEC MA_ApproveIntercompanyReference
       @ReferenceID = 2,
       @UserId = 50
   ```
   - Riusa lo stesso progetto CBL creato al punto 4
   - Accoda il nuovo articolo

### Scenario 2: Stesso componente in un nuovo progetto più recente

1. **Ricos** crea nuovo progetto `PRJ_002` (più recente di `PRJ_001`)
2. **Ricos** usa lo stesso componente `ML45612DRT` già sincronizzato
3. **Ricos** sincronizza:
   ```sql
   EXEC MA_ProjectArticles_SyncIntercompanyComponents
       @CompanyId = 1,
       @ProjectId = 200,  -- PRJ_002 (più recente)
       @Components = '[...ML45612DRT...]'
   ```
   - Trova la reference esistente per `ML45612DRT` verso CBL
   - Confronta date: `PRJ_002.TBCreated` > `PRJ_001.TBCreated`
   - **Resetta** la reference:
     - `SourceProjectId = 200`
     - `TargetProjectId = NULL`
     - `Status = PENDING`

4. **CBL** deve approvare nuovamente per il nuovo progetto

### Scenario 3: Approvazione con codice esistente

```sql
-- CBL ha già il codice CBL_PROD_123 nel suo catalogo
EXEC MA_ApproveIntercompanyReference
    @ReferenceID = 3,
    @UserId = 50,
    @TargetItemCode = 'CBL_PROD_123',
    @CreateTemporaryIfMissing = 0  -- Non serve creare temporaneo
```

## Query Utili

### Visualizza tutte le references con progetti

```sql
SELECT
    r.ReferenceID,
    r.Status,
    srcProj.Name AS SourceProjectName,
    srcProj.ProjectID AS SourceProjectId,
    tgtProj.Name AS TargetProjectName,
    tgtProj.ProjectID AS TargetProjectId,
    srcItem.Item AS SourceItemCode,
    srcItem.Description AS SourceItemDescription,
    tgtItem.Item AS TargetItemCode,
    tgtItem.Description AS TargetItemDescription,
    srcComp.Description AS SourceCompanyName,
    tgtComp.Description AS TargetCompanyName,
    r.RequestDate,
    r.ResponseDate
FROM MA_ProjectArticles_References r
LEFT JOIN MA_Projects srcProj ON r.SourceProjectId = srcProj.ProjectID
LEFT JOIN MA_Projects tgtProj ON r.TargetProjectId = tgtProj.ProjectID
LEFT JOIN MA_ProjectArticles_Items srcItem ON r.SourceProjectItemId = srcItem.Id AND r.SourceCompanyId = srcItem.CompanyId
LEFT JOIN MA_ProjectArticles_Items tgtItem ON r.TargetProjectItemId = tgtItem.Id AND r.TargetCompanyId = tgtItem.CompanyId
LEFT JOIN AR_Companies srcComp ON r.SourceCompanyId = srcComp.CompanyId
LEFT JOIN AR_Companies tgtComp ON r.TargetCompanyId = tgtComp.CompanyId
ORDER BY r.RequestDate DESC;
```

### Trova articoli temporanei da sistemare

```sql
SELECT
    i.Id,
    i.Item AS TemporaryCode,
    i.Description,
    i.CompanyId,
    c.Description AS CompanyName,
    i.TBCreated AS CreatedDate
FROM MA_ProjectArticles_Items i
JOIN AR_Companies c ON i.CompanyId = c.CompanyId
WHERE i.Item LIKE 'IC_TEMP_%'
  AND i.Disabled = 0
ORDER BY i.TBCreated DESC;
```

### References in PENDING per una company target

```sql
SELECT
    r.ReferenceID,
    srcProj.Name AS SourceProjectName,
    srcItem.Item AS SourceItemCode,
    srcItem.Description AS SourceItemDescription,
    r.RequestNotes,
    r.RequestDate,
    r.Priority
FROM MA_ProjectArticles_References r
LEFT JOIN MA_Projects srcProj ON r.SourceProjectId = srcProj.ProjectID
LEFT JOIN MA_ProjectArticles_Items srcItem ON r.SourceProjectItemId = srcItem.Id AND r.SourceCompanyId = srcItem.CompanyId
WHERE r.TargetCompanyId = 2  -- CBL
  AND r.Status = 'PENDING'
ORDER BY r.Priority DESC, r.RequestDate ASC;
```

## Note Importanti

1. **Nature dei codici:**
   - `22413314` = Acquisto
   - `22413312` = Conto lavoro
   - `22413313` = Prodotto Finito (usato per codici temporanei CBL)

2. **Stati delle References:**
   - `PENDING` = In attesa di approvazione
   - `ACCEPTED` = Approvato (progetto e articolo target creati)
   - `REJECTED` = Rifiutato
   - `COMPLETED` = Completato

3. **Codici Temporanei:**
   - Prefisso: `IC_TEMP_`
   - Devono essere sostituiti con codici definitivi
   - Query sopra per trovarli facilmente

4. **Cliente Intercompany:**
   - Deve esistere in `MA_CustSupp` con:
     - `CustSuppType = 3211264` (Cliente)
     - `IntercompanyId` = ID della company sorgente
   - Se manca, l'approvazione fallisce

## Installazione

Eseguire gli script nell'ordine:

```bash
1. 01 - Fix table MA_ProjectArticles_References.sql
2. 02 - Create SP MA_CreateTemporaryIntercompanyItem.sql
3. 03 - Create SP MA_ApproveIntercompanyReference.sql
4. 04 - Update SP MA_ProjectArticles_SyncIntercompanyComponents.sql
```

## Backward Compatibility

⚠️ **ATTENZIONE**: La stored procedure `MA_ProjectArticles_SyncIntercompanyComponents` ha un nuovo parametro obbligatorio `@ProjectId`.

**Tutte le chiamate esistenti devono essere aggiornate** per includere questo parametro.

## Supporto e Troubleshooting

### Errore: "Cliente Intercompany non trovato"

Verificare che in `MA_CustSupp` esista:
```sql
SELECT * FROM MA_CustSupp
WHERE CompanyId = @TargetCompanyId
  AND CustSuppType = 3211264
  AND IntercompanyId = @SourceCompanyId;
```

### Errore: "SourceProjectId non presente"

La reference è stata creata prima dell'aggiornamento. Aggiornare manualmente:
```sql
UPDATE MA_ProjectArticles_References
SET SourceProjectId = [ID_PROGETTO]
WHERE ReferenceID = [ID_REFERENCE];
```

### Articoli temporanei non sostituiti

Usare la query sopra per trovarli e sostituirli manualmente via interfaccia.

---

**Autore:** Claude Code
**Data:** 2025-10-25
**Versione:** 1.0
