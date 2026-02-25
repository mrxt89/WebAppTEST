# Changelog - Simulazione BOM e Fix varie
**Data:** 2026-02-23
**Sessione:** Analisi e implementazione simulazione BOM su versioni esportate + fix ProductionLot/CostingHistory + sync puntuale

---

## Contesto del problema

Quando si crea una nuova versione (es. v7) di una BOM già esportata a ERP (Mago), i componenti ereditati dalla versione esportata sono bloccati nel frontend (controllo `stato_erp = 1` su `parentBOMStato_erp`). Questo impedisce di selezionarli per sostituirli con codici temporanei ai fini di **simulazione di costificazione**.

### Soluzione scelta
**Sostituzione con codici temporanei** (non modifica diretta). Quando la BOM root ha `stato_erp = 0` (non esportata), i componenti con `parentBOMStato_erp = 1` vengono sbloccati per la **selezione** (checkbox), ma restano bloccati per la modifica diretta. L'utente li seleziona e usa "Azioni -> Sostituisci componenti" per creare copie temporanee modificabili.

### Soluzioni valutate e scartate
- **Nuove versioni BOM via MainRefBOMId**: Rischio di impatto su altre BOM, più complesso
- **Tabelle di simulazione Excel-like**: Richiedeva modifica di 5-8 stored procedure (soprattutto quelle di costificazione non presenti in script.sql), troppo invasivo

---

## 1. Sblocco selezione componenti ERP in nuove versioni

### File: `frontend/src/pages/progetti/progetti/articoli/BOMViewer/components/BOMTreeView/TreeNode.jsx`

**Cosa è cambiato:**
- Aggiunto `bom` dal context `useBOMViewer()`
- Aggiunto flag `isRootBOMNotExported`: `bom && bom.stato_erp != "1" && bom.stato_erp !== 1`
- Separata la logica di blocco in due variabili:
  - `isLocked`: blocco visivo/modifica (invariato, usato per stile e azioni)
  - `isLockedForSelection`: blocco checkbox (sbloccato quando root BOM non esportata)
- Checkbox `disabled` usa `isLockedForSelection` invece di `isLocked`
- `handleCheckboxChange` usa `isLockedForSelection`

**Logica:**
```javascript
const isRootBOMNotExported = bom && bom.stato_erp != "1" && bom.stato_erp !== 1;

const isLocked =
  (isRootNode && !editMode) ||
  (node.type === "component" &&
    (node.data.parentBOMStato_erp === "1" || node.data.parentBOMStato_erp === 1));

const isLockedForSelection =
  (isRootNode && !editMode) ||
  (!isRootBOMNotExported && node.type === "component" &&
    (node.data.parentBOMStato_erp === "1" || node.data.parentBOMStato_erp === 1));
```

### File: `frontend/src/pages/progetti/progetti/articoli/BOMViewer/components/BOMTreeView/index.jsx`

**Cosa è cambiato:**
- Aggiunto `bom` dal context, import `Info` da lucide-react, `cn` da utils
- Aggiunta funzione centralizzata `isComponentLocked()`:
  ```javascript
  const isRootBOMNotExported = bom && bom.stato_erp != "1" && bom.stato_erp !== 1;
  const isComponentLocked = (comp) =>
    !isRootBOMNotExported &&
    (comp.data.parentBOMStato_erp === "1" || comp.data.parentBOMStato_erp === 1);
  ```
- Sostituite **7 occorrenze** inline di filtro `parentBOMStato_erp` con `isComponentLocked()`
- Aggiunto stato `tempReplaceDeep` per checkbox "Includi sottolivelli"
- Dialog sostituzione temp riscritta con:
  - **Loading overlay** (Loader2 spinner) che blocca interazione durante processing
  - **Checkbox "Includi sottolivelli"** con messaggio informativo
  - **Deep replace multilivello**: ordina top-down per Level/Path, mantiene `bomIdMapping` per parent-child
  - **Nature preservata** dall'originale (`component.data.Nature || component.data.ComponentNature || 22413312`)

**Deep replace - logica core:**
```javascript
const sorted = [...componentsToReplace].sort((a, b) => {
  const levelDiff = (a.data.Level || 0) - (b.data.Level || 0);
  if (levelDiff !== 0) return levelDiff;
  return (a.data.Path || "").localeCompare(b.data.Path || "");
});
const bomIdMapping = {};
for (const component of sorted) {
  let targetBOMId = component.data.ParentBOMId || component.data.BOMId;
  if (bomIdMapping[targetBOMId]) {
    targetBOMId = bomIdMapping[targetBOMId];
  }
  const originalNature = component.data.Nature || component.data.ComponentNature || 22413312;
  const result = await replaceWithNewComponent(targetBOMId, component.data.Line, {
    createTempComponent: true, CopyBOM: true, Nature: originalNature, ...
  });
  if (result && result.tempBOMId && component.data.BOMId) {
    bomIdMapping[component.data.BOMId] = result.tempBOMId;
  }
}
```

### File: `frontend/src/pages/progetti/progetti/articoli/BOMViewer/components/BOMDetailPanel/ComponentDetail.jsx`

**Cosa è cambiato:**
- Alert ERP reso contestuale: quando root BOM non esportata, suggerisce "Azioni -> Sostituisci componenti" invece di dire solo "non modificabile"

---

## 2. Backend - Lookup tempBOMId per deep replace

### File: `backend/queries/projectArticlesManagement.js`

**Cosa è cambiato (funzione `replaceWithNewComponent`, ~riga 2540):**
- Dopo il replace con successo, aggiunta query di lookup per recuperare `tempBOMId` e `tempItemId` del nuovo componente temporaneo
- Questi valori servono al frontend per il `bomIdMapping` nel deep replace multilivello

```javascript
const bomLookup = await pool.request()
    .input('CompanyId', sql.Int, companyId)
    .input('TempCode', sql.VarChar(64), result.createdComponentCode)
    .query(`
        SELECT TOP 1 bom.Id AS TempBOMId, i.Id AS TempItemId
        FROM dbo.MA_ProjectArticles_Items i
        LEFT JOIN dbo.MA_ProjectArticles_BillOfMaterials bom
            ON bom.ItemId = i.Id AND bom.CompanyId = i.CompanyId
        WHERE i.CompanyId = @CompanyId AND i.Item = @TempCode
        ORDER BY bom.Version DESC
    `);
```

---

## 3. Fix ProductionLot non trasportato

### File: `database/script.sql` (SP `MA_ProjectArticles_AddUpdateBOM`)

**Problema 1 - COPY (nuove versioni):**
Il parametro `@ProductionLot` aveva default `= 1`. Quando il frontend non lo passa, la riga `ISNULL(@ProductionLot, ISNULL(ProductionLot,0))` usava 1 anziché copiare dal sorgente.

**Fix:** Cambiato default da `@ProductionLot INT = 1` a `@ProductionLot INT = NULL` (riga ~515).
Ora `ISNULL(NULL, ISNULL(ProductionLot,0))` copia correttamente il valore dalla BOM sorgente.

**Problema 2 - REPLACE_WITH_NEW_COMPONENT (codici temporanei):**
ProductionLot hardcoded a 1 nella creazione BOM per componenti temporanei.

**Fix:** Aggiunta variabile `@OriginalProductionLot` che legge da `@OriginalComponentBOMId` (righe ~2468-2496):
```sql
DECLARE @OriginalProductionLot INT = 1;
IF @OriginalComponentHasBOM = 1 AND @OriginalComponentBOMId IS NOT NULL
BEGIN
    SELECT @OriginalProductionLot = ISNULL(ProductionLot, 1)
    FROM dbo.MA_ProjectArticles_BillOfMaterials
    WHERE Id = @OriginalComponentBOMId AND CompanyId = @CompanyId;
END
```

**Note:** Le altre 4 occorrenze hardcoded (righe ~2861, 2980, 3175 per Items ADD/UPDATE/COPY auto-create BOM) sono per creazioni "da zero" senza BOM sorgente, quindi il default 1 resta accettabile.

---

## 4. Copia CostingHistory (ricarichi custom) nelle nuove versioni

### File: `database/script.sql` (SP `MA_ProjectArticles_AddUpdateBOM`, action COPY)

**Problema:** Quando si crea una nuova versione (COPY), i ricarichi custom dalla tabella `MA_BOMCostingHistory` (CustomMarkupRM, CustomMarkupOperations, CustomMarkupExternalOps, CustomMarkupInternalOps, CustomMarkupOverhead, CustomMarkupSconto, ecc.) NON venivano copiati. La nuova versione partiva con solo i ricarichi globali da `MA_BOMCostingParameters`.

**Fix:** Aggiunto blocco dopo la copia dei cicli (righe ~1414-1460) che:
1. Cerca l'ultimo record "ufficiale" (`UpdateBOMRecord = 1`) in `MA_BOMCostingHistory` per la BOM sorgente
2. Se non esiste, fa fallback sull'ultimo record qualsiasi
3. Copia tutti i campi Custom Markup sulla nuova BOM con `UpdateBOMRecord = 0` e nota "Copiato da versione precedente"

**Tabella `MA_BOMCostingHistory` - campi copiati:**
- `CustomMarkupRM`, `CustomMarkupRMPurchase`, `CustomMarkupRMProduction`
- `CustomMarkupOperations`, `CustomMarkupInternalOps`, `CustomMarkupExternalOps`
- `CustomMarkupOverhead`, `CustomMarkupSconto`, `CustomMarkupsJSON`
- `OrderQuantity`, `ScrapPercentage`, `UseGranularMarkups`
- `ParametersSnapshot`, `RMCost`, `ProcessingCost`, `TotalCost`, `TotalPrice`

---

## 5. Sync puntuale BOM da Mago

### File: `database/script.sql` (SP `SP_SyncBOMFromMagoToProjectArticles`)

**Problema:** La SP accettava solo `@CompanyId` e faceva sync massiva di tutte le BOM. Michele necessitava di poter allineare anche una singola BOM specifica.

**Fix:** Aggiunto parametro `@BOMCode VARCHAR(50) = NULL`:
- `NULL` (default) = sync massiva (comportamento invariato)
- Valorizzato = sync puntuale della singola BOM

**Implementazione:**
- All'inizio della SP, risolve `@BOMCode` in `@FilterItemId` tramite lookup su `MA_ProjectArticles_Items`
- Filtri aggiunti in tutti gli step:
  - **STEP 1** (versioni multiple): `@FilterItemId IS NULL OR ItemId = @FilterItemId`
  - **STEP 2** (hash Mago): `@BOMCode IS NULL OR bom.BOM = @BOMCode`
  - **STEP 2** (hash WebApp componenti + routing): `@FilterItemId IS NULL OR pab.ItemId = @FilterItemId`
  - **STEP 3** (distinte eliminate): `@FilterItemId IS NULL OR pab.ItemId = @FilterItemId`
  - **STEP 4** (creazione nuove versioni): filtrato automaticamente via `#BOMComparison`
  - **STEP 5** (BOM mancanti semilavorati): `@BOMCode IS NULL OR bom.BOM IN (componenti della BOM specifica)`

**Utilizzo da SSMS:**
```sql
-- Sync puntuale
EXEC SP_SyncBOMFromMagoToProjectArticles @CompanyId = 1, @BOMCode = 'CODICE_ARTICOLO', @Debug = 1

-- Sync massiva (invariata)
EXEC SP_SyncBOMFromMagoToProjectArticles @CompanyId = 1, @Debug = 1
```

---

## File creati/modificati - Riepilogo

| File | Tipo modifica |
|------|---------------|
| `frontend/.../BOMTreeView/TreeNode.jsx` | Modificato - sblocco selezione |
| `frontend/.../BOMTreeView/index.jsx` | Modificato - isComponentLocked, deep replace, loading |
| `frontend/.../BOMDetailPanel/ComponentDetail.jsx` | Modificato - alert contestuale |
| `backend/queries/projectArticlesManagement.js` | Modificato - lookup tempBOMId |
| `database/script.sql` | Modificato - ProductionLot default NULL, @OriginalProductionLot, copia CostingHistory in COPY, @BOMCode in sync SP |
| `database/FIX_ProductionLot_And_CostingHistory_Transport.sql` | Creato - istruzioni e query di verifica |

---

## Architettura e concetti chiave

### Tabelle principali
- `MA_ProjectArticles_Items`: Anagrafica articoli WebApp (Id, Item, Description, Nature, stato_erp)
- `MA_ProjectArticles_BillOfMaterials`: Distinte WebApp (Id, ItemId, Version, stato_erp, MainRefBOMId, ProductionLot)
- `MA_ProjectArticles_BOMComponents`: Componenti distinta (BOMId, Line, ComponentId, Quantity)
- `MA_ProjectArticles_BOMRouting`: Cicli di lavorazione
- `MA_BOMCostingHistory`: Storico costificazioni con ricarichi custom per BOM
- `MA_BOMCostingParameters`: Ricarichi globali azienda (RICARICO_MP, RICARICO_OPE, ecc.)
- `MA_BillOfMaterials` / `MA_BillOfMaterialsComp` / `MA_BillOfMaterialsRouting`: Tabelle Mago (ERP)

### Stored Procedure principali
- `MA_ProjectArticles_AddUpdateBOM`: Gestione BOM (ADD, UPDATE, COPY, ADD_COMPONENT, UPDATE_COMPONENT, DELETE_COMPONENT, REPLACE_COMPONENT, REPLACE_WITH_NEW_COMPONENT)
- `SP_SyncBOMFromMagoToProjectArticles`: Sincronizzazione Mago -> WebApp
- `SP_CalculateBOMCosting`: Costificazione ricorsiva (NON in script.sql, vive nel DB)
- `SP_GetEffectiveBOMMarkups`: Recupera ricarichi effettivi (custom > globali)
- `MA_CodingRules_GenerateCodeUnified`: Generazione codici temporanei

### Codici Nature
- `22413312` = Semilavorato
- `22413313` = Prodotto Finito
- `22413314` = Materia Prima (Acquisto)

### stato_erp
- `0` = locale/non esportato
- `1` = esportato a ERP (Mago)

### MainRefBOMId
Collega versioni BOM della stessa "famiglia". Usato nella logica duale di selezione BOM:
1. Priorità 1: stessa famiglia (MainRefBOMId)
2. Priorità 2: versione esportata (stato_erp=1)
3. Priorità 3: altre versioni
