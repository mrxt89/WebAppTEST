# Fix Export ERP - Validazione e Codice Item

## Modifiche Implementate

### 1. Validazione Codici 15 Caratteri

**Problema risolto:**
- Prima dell'esportazione non veniva controllata la lunghezza dei codici articolo
- Questo causava errori durante l'inserimento nell'ERP

**Soluzione implementata:**
- Aggiunta validazione che **tutti i codici devono essere esattamente di 15 caratteri**
- La validazione viene effettuata sia per:
  - **Articoli singoli** (MA_ExportItemToERP)
  - **Distinte base** (codice Item della distinta)
  - **Componenti della distinta** (tutti i componenti)

**Comportamento:**
- Se un codice non è di 15 caratteri, l'esportazione viene **bloccata**
- Viene mostrato un messaggio di errore chiaro che indica:
  - Quale codice ha il problema
  - La lunghezza attuale del codice
  - Per le distinte: esempi dei componenti con problemi

### 2. Uso Codice Item per Distinte Base

**Problema risolto:**
- Le distinte base usavano il codice BOM invece del codice Item collegato
- Questo poteva causare inconsistenze tra articoli e distinte

**Soluzione implementata:**
- Modificata la stored procedure `MA_ExportBOMToERP` per:
  - Recuperare il codice dall'Item collegato tramite `ItemId`
  - Usare `MA_ProjectArticles_Items.Item` come codice BOM nell'ERP
  - Verificare che questo codice non esista già come distinta nell'ERP

**Flusso modificato:**
```sql
-- PRIMA:
SELECT @BOMCode = BOM FROM MA_ProjectArticles_BillOfMaterials

-- ADESSO:
SELECT @ItemCode = Item
FROM MA_ProjectArticles_Items
WHERE Id = (SELECT ItemId FROM MA_ProjectArticles_BillOfMaterials WHERE Id = @BOMId)
```

## File Modificati

### Database
- **FIX_ExportERP_ValidationAndItemCode.sql** - Script con stored procedures aggiornate
  - `MA_ExportItemToERP` - Aggiunta validazione lunghezza codice
  - `MA_ExportBOMToERP` - Uso codice Item + validazione completa

### Backend
- **backend/queries/erpExportManagement.js**
  - `checkItemExportability()` - Aggiunta validazione lunghezza 15 caratteri
  - `checkBOMExportability()` - Validazione codice Item e tutti i componenti

### Frontend
- **Nessuna modifica necessaria** - Il frontend gestisce già correttamente gli errori di validazione

## Come Applicare le Modifiche

### 1. Database
Eseguire lo script SQL sul database:

```bash
sqlcmd -S server -d WebAppTEST -i database/FIX_ExportERP_ValidationAndItemCode.sql
```

Oppure tramite SQL Server Management Studio:
1. Aprire il file `FIX_ExportERP_ValidationAndItemCode.sql`
2. Eseguire lo script

### 2. Backend
Il backend è già stato aggiornato, nessuna azione necessaria.

### 3. Restart del Backend
Riavviare il server backend per applicare le modifiche:

```bash
cd backend
npm restart
```

## Messaggi di Errore

### Articolo singolo
```
Il codice articolo deve essere esattamente di 15 caratteri (attuale: 12)
```

### Distinta base - Codice Item
```
Il codice articolo della distinta deve essere esattamente di 15 caratteri (attuale: 10)
```

### Distinta base - Componenti
```
5 componenti con codice non di 15 caratteri.
Esempi: ABC123 (6 car.), ITEM_001 (8 car.), COMPONENT_X (11 car.)
```

## Test

### Test Articolo Singolo
1. Creare un articolo con codice != 15 caratteri
2. Tentare di esportarlo
3. Verificare che l'errore venga mostrato

### Test Distinta Base
1. Creare una distinta con Item code != 15 caratteri
2. Tentare di esportarla
3. Verificare che l'errore venga mostrato

### Test Componenti
1. Creare una distinta con componenti con codici != 15 caratteri
2. Tentare di esportarla
3. Verificare che vengano elencati i componenti problematici

## Note Tecniche

### Validazione Pre-Export
La validazione avviene in 2 momenti:
1. **Backend (JavaScript)** - Prima di chiamare la stored procedure
2. **Database (SQL)** - All'interno della stored procedure

Questo garantisce una doppia sicurezza e messaggi di errore chiari.

### Codice Item vs Codice BOM
**IMPORTANTE:** Dopo questa modifica, il codice BOM esportato nell'ERP sarà sempre il codice dell'Item collegato, NON il codice BOM della tabella MA_ProjectArticles_BillOfMaterials.

Esempio:
- Item: `ABC123456789012` (15 caratteri)
- BOM: `BOM-001`
- **ERP riceverà:** `ABC123456789012` come codice BOM

### Compatibilità Retroattiva
Le distinte già esportate non sono influenzate da questa modifica.
Solo le nuove esportazioni useranno il codice Item.

## Verifica Successo

Dopo aver applicato le modifiche, verificare:
1. Gli script SQL sono stati eseguiti senza errori
2. Il backend si avvia correttamente
3. L'esportazione di articoli con codici di 15 caratteri funziona
4. L'esportazione viene bloccata per codici != 15 caratteri
5. I messaggi di errore sono chiari e informativi

## Rollback

In caso di problemi, per tornare alla versione precedente:

```sql
-- Ripristinare le stored procedures dal file ProgettiIntercompany.sql originale
-- Eseguire la query per MA_ExportItemToERP e MA_ExportBOMToERP
```

Poi riavviare il backend con il codice precedente dal version control.
