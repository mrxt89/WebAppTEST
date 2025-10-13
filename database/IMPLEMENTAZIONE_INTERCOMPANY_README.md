# Implementazione Condivisione Multicompany - Distinte Base

**Data:** 2025-10-13
**Versione:** 1.0
**Autore:** Claude Code

---

## Panoramica

Questa implementazione gestisce la **condivisione automatica di componenti e allegati** tra company diverse all'interno della webapp multicompany, nel contesto della gestione progetti e distinte base (BOM).

### Scenari Gestiti

1. **Acquisto Intercompany**: Componenti di natura "Acquisto" (Nature = 22413314) il cui fornitore preferenziale è una company intercompany (MA_CustSupp.IntercompanyId IS NOT NULL)

2. **Conto Lavoro Intercompany**: Componenti che hanno fasi di ciclo (routing) con centro di lavoro associato a un fornitore intercompany

---

## File Creati

### 1. `MA_ProjectArticles_GetIntercompanyComponents_1.sql`

**Scopo:** Identifica tutti i componenti intercompany di una BOM

**Parametri:**
- `@BOMId` (BIGINT): ID della distinta base
- `@CompanyId` (INT): ID dell'azienda
- `@ItemId` (BIGINT, opzionale): ID articolo (alternativa a BOMId)
- `@IncludeAttachments` (BIT): Flag per includere allegati condivisi
- `@ErrorCode` (INT OUTPUT): Codice di errore
- `@ErrorMessage` (NVARCHAR OUTPUT): Messaggio di errore

**Output:**
- Tabella principale con tutti i componenti intercompany classificati per tipo (ACQUISTO/CONTO_LAVORO)
- Informazioni su company target, fornitore, natura articolo
- Riferimenti a relazioni esistenti in MA_ProjectArticles_References
- (Opzionale) Lista allegati condivisi

**Utilizzo:**
```sql
DECLARE @ErrorCode INT, @ErrorMessage NVARCHAR(4000);

EXEC MA_ProjectArticles_GetIntercompanyComponents
    @BOMId = 123,
    @CompanyId = 1,
    @IncludeAttachments = 1,
    @ErrorCode = @ErrorCode OUTPUT,
    @ErrorMessage = @ErrorMessage OUTPUT;

SELECT @ErrorCode AS ErrorCode, @ErrorMessage AS ErrorMessage;
```

**Caratteristiche:**
- Gestisce la **logica duale delle BOM** (MainRefBOMId) per identificare la versione corretta dei cicli di produzione
- Distingue chiaramente tra acquisto e conto lavoro intercompany
- Verifica relazioni già esistenti per evitare duplicati

---

### 2. `MA_ProjectArticles_SyncIntercompanySharing_1.sql`

**Scopo:** Sincronizza automaticamente relazioni e allegati quando viene creata/modificata una BOM

**Parametri:**
- `@BOMId` (BIGINT): ID della distinta base
- `@CompanyId` (INT): ID dell'azienda
- `@UserId` (INT, opzionale): ID utente che esegue la sincronizzazione
- `@SyncAttachments` (BIT): Flag per sincronizzare allegati (default: 1)
- `@AutoCreateReferences` (BIT): Flag per creare automaticamente references (default: 1)
- `@ErrorCode` (INT OUTPUT): Codice di errore
- `@ErrorMessage` (NVARCHAR OUTPUT): Messaggio di errore

**Output:**
- Tabella di riepilogo con contatori:
  - `ReferencesCreated`: Numero di nuove relazioni create
  - `ReferencesUpdated`: Numero di relazioni aggiornate
  - `AttachmentsShared`: Numero di allegati condivisi

**Utilizzo:**
```sql
DECLARE @ErrorCode INT, @ErrorMessage NVARCHAR(4000);

EXEC MA_ProjectArticles_SyncIntercompanySharing
    @BOMId = 123,
    @CompanyId = 1,
    @UserId = 10,
    @SyncAttachments = 1,
    @AutoCreateReferences = 1,
    @ErrorCode = @ErrorCode OUTPUT,
    @ErrorMessage = @ErrorMessage OUTPUT;
```

**Comportamento:**
1. Identifica tutti i componenti intercompany (acquisto + conto lavoro)
2. Per ogni componente:
   - Se non esiste una relazione in `MA_ProjectArticles_References`, la crea con Status = 'PENDING'
   - Se esiste una relazione in stato PENDING/DRAFT, la aggiorna
   - Se esiste una relazione in altri stati, non la modifica
3. Sincronizza gli allegati:
   - Per ogni componente intercompany, condivide gli allegati con la company target
   - Inserisce record in `MA_ItemAttachmentSharing` se non esistono già
   - AccessLevel di default: 'READ'

**Caratteristiche:**
- Operazione **transazionale** (ROLLBACK in caso di errore)
- Gestisce la **logica duale delle BOM** per routing corretti
- Evita duplicati controllando relazioni e condivisioni esistenti
- Log dettagliato delle operazioni effettuate

---

### 3. `MA_ProjectArticles_GetBOMDatas_1.sql`

**Scopo:** Versione migliorata della stored procedure esistente con gestione corretta del routing intercompany

**Modifiche Principali:**

#### A) Sezione `GET_BOM_ROUTING`
Aggiunge campi per identificare fasi di conto lavoro intercompany:
- `WCSupplier`: Fornitore associato al centro di lavoro
- `IsIntercompany`: Flag 'Sì'/'No' se è intercompany
- `IntercompanyTargetId`: CompanyId della company target
- `IntercompanyTargetName`: Nome della company target
- `IsIntercompanySubcontracting`: Flag specifico per conto lavoro intercompany

#### B) Sezione `GET_BOM_FULL`
Stesse modifiche applicate alla query dei cicli nella modalità GET_BOM_FULL

#### C) Nuova Action: `GET_BOM_INTERCOMPANY_SUMMARY`
Restituisce un riepilogo dei componenti intercompany:
- Prima tabella: Dettaglio componenti per tipo (ACQUISTO/CONTO_LAVORO)
- Seconda tabella: Conteggio aggregato per tipo e company target

**Utilizzo:**
```sql
-- Riepilogo intercompany
DECLARE @ErrorCode INT, @ErrorMessage NVARCHAR(4000);

EXEC MA_ProjectArticles_GetBOMDatas
    @Action = 'GET_BOM_INTERCOMPANY_SUMMARY',
    @CompanyId = 1,
    @Id = 123,
    @ErrorCode = @ErrorCode OUTPUT,
    @ErrorMessage = @ErrorMessage OUTPUT;

-- Routing con info intercompany
EXEC MA_ProjectArticles_GetBOMDatas
    @Action = 'GET_BOM_ROUTING',
    @CompanyId = 1,
    @Id = 123,
    @ErrorCode = @ErrorCode OUTPUT,
    @ErrorMessage = @ErrorMessage OUTPUT;
```

**Nota:** Questo file contiene le **modifiche da applicare** alla stored esistente. Non è una stored completa ma un template con le sezioni da sostituire/aggiungere.

---

## Struttura Database Coinvolta

### Tabelle Principali

#### `MA_ProjectArticles_BOMComponents`
Componenti delle distinte base

#### `MA_ProjectArticles_BOMRouting`
Cicli di produzione delle distinte base

#### `MA_ProjectArticles_BillOfMaterials`
Testata delle distinte base (con MainRefBOMId per logica duale)

#### `MA_ProjectArticles_Items`
Articoli di progetto

#### `MA_Items`
Articoli master con natura (Nature)
- `22413314` = Acquisto
- `22413312` = Semilavorato
- `22413313` = Prodotto Finito

#### `MA_ItemsGoodsData`
Dati merceologici articoli (con fornitore preferenziale)

#### `MA_ItemSuppliers`
Fornitori preferenziali per articolo

#### `MA_CustSupp`
Anagrafica clienti/fornitori
- **Colonna chiave:** `IntercompanyId` - Identifica se è una company intercompany

#### `MA_WorkCenters`
Centri di lavoro
- **Colonna:** `Supplier` - Fornitore associato al centro di lavoro (per conto lavoro)

#### `MA_ProjectArticles_References`
**Relazioni intercompany tra articoli**
- `SourceProjectItemId`: ID articolo sorgente
- `SourceCompanyId`: Company sorgente
- `TargetProjectItemId`: ID articolo target (popolato dalla company target)
- `TargetCompanyId`: Company target
- `Status`: PENDING, DRAFT, APPROVED, REJECTED, ecc.
- `Nature`: Natura dell'articolo
- `RequestNotes`: Note della richiesta di condivisione

#### `MA_ItemAttachments`
Allegati degli articoli

#### `MA_ItemAttachmentSharing`
**Condivisione allegati tra company**
- `AttachmentID`: ID allegato
- `TargetCompanyId`: Company con cui è condiviso
- `SharedBy`: Utente che ha condiviso
- `AccessLevel`: Livello di accesso (READ, WRITE, ecc.)

#### `AR_Companies`
Anagrafica company

---

## Logica Duale delle BOM (MainRefBOMId)

La webapp gestisce **versioni multiple** delle distinte base per lo stesso articolo.

### Concetto
- Ogni BOM ha un `MainRefBOMId` che identifica la BOM principale a cui si riferisce
- Quando si crea una nuova versione di una BOM, il `MainRefBOMId` punta alla versione principale
- La BOM "base" ha `MainRefBOMId = NULL` (o auto-riferimento `MainRefBOMId = Id`)

### Logica di Selezione Componenti
Per ogni componente in una BOM, quando si deve determinare quale versione della distinta del componente utilizzare:

1. **Priorità 1:** Cerca versioni con lo stesso `MainRefBOMId` della BOM padre
2. **Priorità 2:** Se non trova, usa la versione base (Version = 1)

Questa logica è implementata con:
```sql
CASE
    WHEN bom.MainRefBOMId = @ParentMainRefBOMId THEN 1
    ELSE 2
END AS Priority
```

E poi:
```sql
ROW_NUMBER() OVER(PARTITION BY ComponentId ORDER BY Priority, Version DESC) AS rn
```

### Importanza per Routing Intercompany
Questa logica è **fondamentale** per identificare correttamente le fasi di conto lavoro intercompany, perché:
- Il routing è associato alla BOM del componente, non al componente stesso
- Bisogna trovare la versione corretta della BOM del componente per leggere il suo routing
- Solo con il routing corretto si può identificare se c'è un centro di lavoro con fornitore intercompany

---

## Flusso di Lavoro Consigliato

### 1. Creazione/Modifica BOM

Quando l'utente crea o modifica una BOM:

```sql
-- Dopo aver salvato la BOM
DECLARE @ErrorCode INT, @ErrorMessage NVARCHAR(4000);

EXEC MA_ProjectArticles_SyncIntercompanySharing
    @BOMId = @NewBOMId,
    @CompanyId = @CurrentCompanyId,
    @UserId = @CurrentUserId,
    @SyncAttachments = 1,
    @AutoCreateReferences = 1,
    @ErrorCode = @ErrorCode OUTPUT,
    @ErrorMessage = @ErrorMessage OUTPUT;

IF @ErrorCode <> 0
BEGIN
    -- Gestisci errore
    PRINT @ErrorMessage;
END
```

### 2. Visualizzazione Componenti Intercompany

Per mostrare all'utente quali componenti sono condivisi:

```sql
DECLARE @ErrorCode INT, @ErrorMessage NVARCHAR(4000);

EXEC MA_ProjectArticles_GetIntercompanyComponents
    @BOMId = @CurrentBOMId,
    @CompanyId = @CurrentCompanyId,
    @IncludeAttachments = 1,
    @ErrorCode = @ErrorCode OUTPUT,
    @ErrorMessage = @ErrorMessage OUTPUT;
```

### 3. Riepilogo Intercompany nella Dashboard

Per mostrare un summary delle relazioni intercompany:

```sql
DECLARE @ErrorCode INT, @ErrorMessage NVARCHAR(4000);

EXEC MA_ProjectArticles_GetBOMDatas
    @Action = 'GET_BOM_INTERCOMPANY_SUMMARY',
    @CompanyId = @CurrentCompanyId,
    @Id = @CurrentBOMId,
    @ErrorCode = @ErrorCode OUTPUT,
    @ErrorMessage = @ErrorMessage OUTPUT;
```

### 4. Approvazione Condivisione (Company Target)

Quando la company target vuole approvare una richiesta:

```sql
-- La company target collega il suo articolo
UPDATE MA_ProjectArticles_References
SET TargetProjectItemId = @TargetItemId,
    Status = 'APPROVED',
    ResponseDate = GETDATE(),
    ResponseNotes = @Notes
WHERE ReferenceID = @ReferenceId
  AND TargetCompanyId = @CurrentCompanyId;
```

---

## Query di Supporto

### Verificare Fornitori Intercompany

```sql
SELECT
    cs.CustSupp,
    cs.CompanyName AS SupplierName,
    cs.CompanyId AS SourceCompanyId,
    cs.IntercompanyId AS TargetCompanyId,
    targetComp.CompanyName AS TargetCompanyName,
    cs.CustSuppType
FROM MA_CustSupp cs
JOIN AR_Companies targetComp ON cs.IntercompanyId = targetComp.CompanyId
WHERE cs.IntercompanyId IS NOT NULL
  AND cs.CustSuppType = 3211265  -- Fornitore
ORDER BY cs.CompanyName;
```

### Verificare Articoli di Acquisto con Fornitore Preferenziale

```sql
SELECT
    item.Item,
    item.Description,
    item.CompanyId,
    goodsData.Supplier,
    cs.CompanyName AS SupplierName,
    cs.IntercompanyId,
    targetComp.CompanyName AS IntercompanyTargetName
FROM MA_Items item
JOIN MA_ItemsGoodsData goodsData ON item.Item = goodsData.Item AND item.CompanyId = goodsData.CompanyId
JOIN MA_CustSupp cs ON goodsData.Supplier = cs.CustSupp AND item.CompanyId = cs.CompanyId
LEFT JOIN AR_Companies targetComp ON cs.IntercompanyId = targetComp.CompanyId
WHERE item.Nature = 22413314  -- Acquisto
  AND cs.CustSuppType = 3211265  -- Fornitore
ORDER BY item.Item;
```

### Verificare Centri di Lavoro con Fornitore Intercompany

```sql
SELECT
    wc.WC,
    wc.Description AS WCDescription,
    wc.CompanyId,
    wc.Supplier,
    cs.CompanyName AS SupplierName,
    cs.IntercompanyId,
    targetComp.CompanyName AS IntercompanyTargetName
FROM MA_WorkCenters wc
JOIN MA_CustSupp cs ON wc.Supplier = cs.CustSupp AND wc.CompanyId = cs.CompanyId
LEFT JOIN AR_Companies targetComp ON cs.IntercompanyId = targetComp.CompanyId
WHERE cs.IntercompanyId IS NOT NULL
  AND cs.CustSuppType = 3211265  -- Fornitore
ORDER BY wc.WC;
```

### Verificare Relazioni Intercompany per una Company

```sql
SELECT
    ref.ReferenceID,
    ref.SourceProjectItemId,
    sourceItem.Item AS SourceItemCode,
    sourceItem.Description AS SourceItemDescription,
    ref.SourceCompanyId,
    sourceComp.CompanyName AS SourceCompanyName,
    ref.TargetProjectItemId,
    targetItem.Item AS TargetItemCode,
    targetItem.Description AS TargetItemDescription,
    ref.TargetCompanyId,
    targetComp.CompanyName AS TargetCompanyName,
    ref.Status,
    ref.RequestDate,
    ref.ResponseDate
FROM MA_ProjectArticles_References ref
LEFT JOIN MA_ProjectArticles_Items sourceItem
    ON ref.SourceProjectItemId = sourceItem.Id
    AND ref.SourceCompanyId = sourceItem.CompanyId
LEFT JOIN MA_ProjectArticles_Items targetItem
    ON ref.TargetProjectItemId = targetItem.Id
    AND ref.TargetCompanyId = targetItem.CompanyId
LEFT JOIN AR_Companies sourceComp ON ref.SourceCompanyId = sourceComp.CompanyId
LEFT JOIN AR_Companies targetComp ON ref.TargetCompanyId = targetComp.CompanyId
WHERE ref.SourceCompanyId = 1 OR ref.TargetCompanyId = 1  -- Sostituisci con CompanyId desiderato
ORDER BY ref.RequestDate DESC;
```

### Verificare Allegati Condivisi

```sql
SELECT
    att.AttachmentID,
    att.Item,
    att.CompanyId AS SourceCompanyId,
    sourceComp.CompanyName AS SourceCompanyName,
    att.FileName,
    share.TargetCompanyId,
    targetComp.CompanyName AS TargetCompanyName,
    share.SharedAt,
    share.AccessLevel,
    share.SharedBy
FROM MA_ItemAttachments att
JOIN MA_ItemAttachmentSharing share ON att.AttachmentID = share.AttachmentID
LEFT JOIN AR_Companies sourceComp ON att.CompanyId = sourceComp.CompanyId
LEFT JOIN AR_Companies targetComp ON share.TargetCompanyId = targetComp.CompanyId
WHERE att.CompanyId = 1 OR share.TargetCompanyId = 1  -- Sostituisci con CompanyId desiderato
ORDER BY att.Item, share.SharedAt DESC;
```

---

## Considerazioni e Best Practices

### 1. Performance
- Le stored procedure utilizzano **CTE** per query complesse e leggibili
- La logica duale delle BOM è ottimizzata con `ROW_NUMBER()` per evitare subquery multiple
- Gli indici sulle colonne `IntercompanyId`, `MainRefBOMId`, `BOMId`, `CompanyId` sono fondamentali

### 2. Transazionalità
- `MA_ProjectArticles_SyncIntercompanySharing` è completamente transazionale
- In caso di errore, tutto viene rollback (references + allegati)

### 3. Stati delle References
- **PENDING**: Richiesta creata, in attesa di risposta dalla company target
- **DRAFT**: In lavorazione
- **APPROVED**: Approvata e collegata
- **REJECTED**: Rifiutata
- Altri stati personalizzati possono essere aggiunti

### 4. Livelli di Accesso Allegati
- **READ**: Solo lettura (default per condivisione automatica)
- **WRITE**: Modifica
- Altri livelli possono essere definiti

### 5. Gestione Errori
- Tutte le stored hanno parametri OUTPUT per gestire errori
- ErrorCode = 0 significa successo
- ErrorCode > 0 significa errore (con messaggio descrittivo)

---

## Prossimi Passi Frontend

### 1. Interfaccia Visualizzazione Componenti Intercompany
- Lista componenti con badge per tipo (ACQUISTO/CONTO_LAVORO)
- Indicatore company target
- Status della relazione (PENDING, APPROVED, ecc.)
- Link agli allegati condivisi

### 2. Dashboard Intercompany
- Riepilogo delle condivisioni attive
- Richieste pending in entrata (da approvare)
- Richieste pending in uscita (in attesa di approvazione)

### 3. Workflow Approvazione
- Notifiche per la company target quando arriva una richiesta
- Form per collegare l'articolo target
- Approvazione/rifiuto con note

### 4. Sincronizzazione Automatica
- Trigger automatico dopo salvataggio BOM
- Opzione manuale "Sincronizza condivisioni"
- Log delle sincronizzazioni

### 5. Gestione Allegati
- Visualizzazione allegati condivisi nelle altre company
- Controllo livello di accesso
- Revoca condivisione

---

## Domande Aperte / Da Verificare

1. ⚠️ La tabella `MA_Items` ha la colonna `Nature` o bisogna joinare con un'altra tabella?
   - **Verificato:** La colonna esiste in MA_Items

2. ⚠️ Il campo `MA_WorkCenters.Supplier` è effettivamente usato per identificare il conto lavoro?
   - **Da verificare:** Potrebbe essere che il supplier sia solo in `MA_ProjectArticles_BOMRouting.Supplier`

3. ⚠️ Gli allegati sono già condivisi correttamente o serve revisione?
   - **Da verificare:** La logica sembra OK ma va testata

4. ⚠️ Serve gestire la rimozione di componenti da una BOM (cleanup delle references)?
   - **Da implementare:** Trigger o stored per rimuovere references quando si rimuove un componente

5. ⚠️ Gestione cambio fornitore preferenziale o cambio centro di lavoro?
   - **Da valutare:** Cosa succede alle references esistenti?

---

## Testing Suggerito

### Test Case 1: Componente di Acquisto Intercompany
1. Company 1 crea articolo "Componente A" con Nature = Acquisto (22413314)
2. Imposta fornitore preferenziale = "COMPANY2" (che è intercompany)
3. Crea BOM che include "Componente A"
4. Esegue `SyncIntercompanySharing`
5. Verifica creazione reference verso Company 2
6. Verifica condivisione allegati (se presenti)

### Test Case 2: Componente di Conto Lavoro Intercompany
1. Company 1 crea articolo "Componente B"
2. Crea BOM per "Componente B" con ciclo di produzione
3. Nel ciclo, fase con centro di lavoro che ha Supplier = "COMPANY3" (intercompany)
4. Include "Componente B" in un'altra BOM
5. Esegue `SyncIntercompanySharing`
6. Verifica creazione reference verso Company 3

### Test Case 3: Logica Duale BOM
1. Company 1 crea BOM v1 per articolo "Prodotto X"
2. Crea BOM v2 per articolo "Prodotto X" (con MainRefBOMId verso v1)
3. Nella v2 include componente "Componente C"
4. "Componente C" ha anch'esso BOM v1 e v2
5. Verifica che il sistema selezioni la v2 del "Componente C" per leggere il routing

### Test Case 4: Approvazione dalla Company Target
1. Company 2 riceve richiesta da Company 1
2. Visualizza richieste pending
3. Crea/collega articolo target
4. Approva la richiesta
5. Verifica che lo status cambi e il TargetProjectItemId sia popolato

---

## Log delle Modifiche

| Data       | Versione | Descrizione                                          |
|------------|----------|------------------------------------------------------|
| 2025-10-13 | 1.0      | Implementazione iniziale con 3 stored procedures     |

---

## Contatti

Per domande o chiarimenti su questa implementazione, contattare il team di sviluppo.

---

**Fine Documento**
