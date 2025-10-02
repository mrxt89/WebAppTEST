# 🔧 **Aggiornamento Costificazione Componenti BOM**

## 📋 **Panoramica**
Sono state apportate modifiche significative alla stored procedure `SP_GetBOMCostingDetails` per implementare la costificazione corretta dei componenti semilavorati e prodotti finiti, considerando le loro fasi di lavorazione.

## 🎯 **Problema Risolto**

### **Problema Precedente**
La stored procedure `SP_GetBOMCostingDetails` restituiva solo i costi memorizzati in `MA_ProjectArticles_BOMComponents`, ma non costificava correttamente i componenti semilavorati e prodotti finiti considerando le loro fasi di lavorazione.

### **Soluzione Implementata**
- ✅ **Costificazione Componenti**: I componenti semilavorati/prodotti finiti vengono costificati dalla loro BOM
- ✅ **Operazioni Complete**: Include le operazioni sia della BOM principale che dei componenti
- ✅ **Breakdown Dettagliato**: Separazione chiara tra operazioni BOM principale e componenti

## 🗄️ **Modifiche Database**

### **Stored Procedure: SP_GetBOMCostingDetails**

#### **1. Costificazione Componenti Migliorata**
```sql
-- Nuova logica con CTE per costificazione componenti
WITH ComponentCosting AS (
    SELECT 
        comp.ComponentId,
        comp.Line,
        -- ... altri campi ...
        -- Calcola il costo del componente considerando la sua BOM
        CASE 
            WHEN comp.ComponentType IN (22413312, 22413313) THEN
                -- Per semilavorati e prodotti finiti, calcola il costo dalla loro BOM
                ISNULL((
                    SELECT 
                        (bom_comp.TotalCost / NULLIF(bom_comp.ProductionLot, 0))
                    FROM MA_ProjectArticles_BillOfMaterials bom_comp
                    WHERE bom_comp.ItemId = comp.ComponentId 
                    AND bom_comp.CompanyId = @CompanyId
                    AND bom_comp.TotalCost > 0
                ), comp.UnitCost)
            ELSE 
                -- Per acquisti, usa il costo unitario diretto
                comp.UnitCost
        END as CalculatedUnitCost
    FROM MA_ProjectArticles_BOMComponents comp
)
```

#### **2. Operazioni Complete con UNION ALL**
```sql
-- Include operazioni BOM principale E componenti
WITH AllOperations AS (
    -- Operazioni della BOM principale
    SELECT 
        rt.RtgStep as RoutingId,
        -- ... campi operazioni ...
        0 as IsComponentOperation, -- 0 = operazione BOM principale
        NULL as ComponentCode,
        NULL as ComponentDescription
    FROM MA_ProjectArticles_BOMRouting rt
    WHERE rt.BOMId = @BOMId AND rt.CompanyId = @CompanyId
    
    UNION ALL
    
    -- Operazioni dei componenti semilavorati/prodotti finiti
    SELECT 
        rt_comp.RtgStep + 1000 as RoutingId, -- Offset per distinguere
        -- ... campi operazioni ...
        1 as IsComponentOperation, -- 1 = operazione componente
        itm_comp.Item as ComponentCode,
        itm_comp.Description as ComponentDescription
    FROM MA_ProjectArticles_BOMComponents comp
    LEFT JOIN MA_ProjectArticles_BillOfMaterials bom_comp ON comp.ComponentId = bom_comp.ItemId
    LEFT JOIN MA_ProjectArticles_BOMRouting rt_comp ON bom_comp.Id = rt_comp.BOMId
    WHERE comp.BOMId = @BOMId 
    AND comp.ComponentType IN (22413312, 22413313) -- Solo semilavorati e prodotti finiti
)
```

## 🎨 **Modifiche Frontend**

### **Tabella Componenti Migliorata**

#### **Nuova Colonna: Fonte**
```jsx
<TableHead>Fonte</TableHead>

// Nel corpo della tabella
<TableCell>
  <Badge 
    variant={comp.CostFromBOM ? "secondary" : "outline"}
    className={comp.CostFromBOM ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}
  >
    {comp.CostFromBOM ? "BOM" : "DIRETTO"}
  </Badge>
</TableCell>
```

### **Tabella Operazioni Migliorata**

#### **Nuova Colonna: Fonte**
```jsx
<TableHead>Fonte</TableHead>

// Nel corpo della tabella
<TableCell>
  <div className="flex flex-col gap-1">
    <Badge 
      variant={rt.IsComponentOperation ? "secondary" : "outline"}
      className={rt.IsComponentOperation ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}
    >
      {rt.IsComponentOperation ? "COMPONENTE" : "BOM PRINCIPALE"}
    </Badge>
    {rt.IsComponentOperation && rt.ComponentCode && (
      <span className="text-xs text-gray-600">
        {rt.ComponentCode}
      </span>
    )}
  </div>
</TableCell>
```

## 📊 **Struttura Dati Migliorata**

### **Componenti con Costificazione Completa**
```json
{
  "ComponentId": 2002,
  "ComponentLine": 10,
  "ItemCode": "SEMI-ITEM-001",
  "ItemDescription": "Componente Semilavorato",
  "ComponentType": 22413312,
  "ComponentTypeDescription": "Semilavorato",
  "Quantity": 2.0,
  "UnitCost": 0.00,           // Costo diretto (non usato)
  "CalculatedUnitCost": 15.50, // Costo calcolato dalla BOM
  "CalculatedTotalCost": 31.00, // Costo totale calcolato
  "EffectiveUnitCost": 15.50,   // Costo unitario effettivo
  "HasValidCost": 1,           // Ha costo valido
  "CostFromBOM": 1             // Costo calcolato dalla BOM
}
```

### **Operazioni Complete**
```json
{
  "RoutingId": 1,
  "CycleNumber": 1,
  "OperationCode": "OP-MAIN-001",
  "OperationDescription": "Operazione Principale",
  "WorkCenterCode": "WC-MAIN-001",
  "Quantity": 1,
  "SetupTimeHours": 0.17,
  "ProcessingTimeHours": 0.33,
  "SetupCost": 6.67,
  "ProcessingCost": 13.33,
  "CalculatedTotalCost": 20.00,
  "HasValidCost": 1,
  "IsComponentOperation": 0,    // 0 = BOM principale
  "ComponentCode": null,
  "ComponentDescription": null
}
```

### **Operazioni Componenti**
```json
{
  "RoutingId": 1001,           // Offset +1000 per distinguere
  "CycleNumber": 1,
  "OperationCode": "OP-SEMI-001",
  "OperationDescription": "Operazione Semilavorato",
  "WorkCenterCode": "WC-SEMI-001",
  "Quantity": 2.0,             // Moltiplicato per quantità componente
  "SetupTimeHours": 0.08,
  "ProcessingTimeHours": 0.25,
  "SetupCost": 2.92,           // Setup non moltiplicato
  "ProcessingCost": 17.50,     // Processing moltiplicato per quantità
  "CalculatedTotalCost": 20.42,
  "HasValidCost": 1,
  "IsComponentOperation": 1,    // 1 = operazione componente
  "ComponentCode": "SEMI-ITEM-001",
  "ComponentDescription": "Componente Semilavorato"
}
```

## 🧪 **File di Test**

### **test_component_costing.sql**
Creato file di test completo che:
- ✅ **BOM Multilivello**: Crea BOM principale con componente semilavorato
- ✅ **Costificazione Sequenziale**: Prima il semilavorato, poi il principale
- ✅ **Verifica Costi**: Controlla che i componenti siano costificati correttamente
- ✅ **Test Operazioni**: Verifica che le operazioni dei componenti siano incluse
- ✅ **Pulizia**: Rimuove tutti i dati di test

## ✅ **Benefici delle Modifiche**

### **1. Costificazione Corretta**
- 🎯 **Componenti Semilavorati**: Costificati dalla loro BOM, non dal costo diretto
- 🎯 **Componenti Acquisto**: Usano il costo diretto memorizzato
- 🎯 **Tracciabilità**: Badge per identificare la fonte del costo

### **2. Operazioni Complete**
- 📊 **BOM Principale**: Operazioni del prodotto finale
- 📊 **Componenti**: Operazioni dei semilavorati/prodotti finiti
- 📊 **Breakdown**: Separazione chiara tra le due fonti

### **3. Analisi Avanzata**
- 🔍 **Fonte Costi**: Identificazione immediata della fonte
- 🔍 **Costi Reali**: Costi effettivi considerando tutte le fasi
- 🔍 **Debugging**: Facilità nell'identificare problemi di costificazione

### **4. User Experience**
- 🎨 **Badge Colorati**: Identificazione visiva immediata
- 🎨 **Informazioni Complete**: Tutti i dettagli necessari
- 🎨 **Organizzazione**: Operazioni ordinate per fonte

## 🚀 **Come Testare**

### **1. Test Database**
```sql
-- Esegui il file di test
EXEC SP_InitializeBOMCostingParameters @CompanyId = 1;
-- Poi esegui il contenuto di test_component_costing.sql
```

### **2. Test Frontend**
1. **Seleziona BOM**: Con componenti semilavorati
2. **Esegui Calcolo**: Costificazione completa
3. **Apri Modal**: Clicca su "Costo Materiali" o "Costo Operazioni"
4. **Verifica Dati**: 
   - Componenti con badge "BOM" per semilavorati
   - Operazioni con badge "COMPONENTE" per operazioni componenti

## 📁 **File Modificati**

- ✅ `frontend/src/database/bom_costing_procedures.sql` - Stored procedure migliorata
- ✅ `frontend/src/pages/progetti/progetti/articoli/BOMCosting.jsx` - Frontend aggiornato
- ✅ `frontend/src/database/test_component_costing.sql` - File di test (NUOVO)
- ✅ `frontend/src/database/COMPONENT_COSTING_UPDATE.md` - Documentazione (NUOVO)

## 🎯 **Risultato Atteso**

Ora quando chiami `/api/bom-costing/history/5652`, otterrai:

1. **Componenti Costificati Correttamente**:
   - Semilavorati: Costo calcolato dalla loro BOM
   - Acquisti: Costo diretto memorizzato
   - Badge "BOM" o "DIRETTO" per identificare la fonte

2. **Operazioni Complete**:
   - Operazioni BOM principale
   - Operazioni componenti semilavorati
   - Badge "BOM PRINCIPALE" o "COMPONENTE" per identificare la fonte

3. **Dati Completi**:
   - Costi effettivi considerando tutte le fasi
   - Breakdown dettagliato per analisi
   - Tracciabilità completa della costificazione

---

**🎯 Obiettivo Raggiunto**: I componenti ora vengono costificati correttamente considerando le loro fasi di lavorazione, e le operazioni includono sia quelle della BOM principale che dei componenti semilavorati/prodotti finiti.
