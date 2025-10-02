# 🔧 **Aggiornamento Dettagli Costi BOM**

## 📋 **Panoramica**
Sono state apportate modifiche significative alla gestione dei dettagli dei costi BOM per migliorare la visualizzazione e l'accuratezza dei dati mostrati nel modal dei dettagli.

## 🗄️ **Modifiche Database**

### **Stored Procedure: SP_GetBOMCostingDetails**

#### **1. Informazioni BOM Estese**
```sql
-- Aggiunti nuovi campi per informazioni complete
SELECT 
    bom.Id as BOMId,
    bom.BOM as BOMCode,
    bom.Description as BOMDescription,
    itm.Item as ItemCode,
    itm.Description as ItemDescription,
    bom.UoM as UnitOfMeasure,
    bom.TotalCost as LastCalculatedCost,
    bom.RMCost as LastMaterialCost,
    bom.ProcessingCost as LastProcessingCost,
    bom.ProductionLot,
    -- NUOVI CAMPI
    bom.RMRefillCost as LastMaterialRefillCost,
    bom.ProcessingRefillCost as LastProcessingRefillCost,
    bom.RefillWaste as LastWasteRefillCost,
    bom.RefillDiscount as LastDiscountRefillCost,
    bom.TotalRefill as LastTotalRefillCost,
    bom.TransportRefill as LastTransportRefillCost,
    bom.Details as CostingDetailsJSON,
    bom.Notes as CostingNotes,
    bom.LastCostingUpdatedBy,
    bom.LastCostingUpdatedAt
FROM MA_ProjectArticles_BillOfMaterials bom
```

#### **2. Componenti con Dettagli Avanzati**
```sql
-- Aggiunti campi per analisi dettagliata
SELECT 
    comp.ComponentId as ComponentId,
    comp.Line as ComponentLine,
    comp.ComponentId as ItemId,
    itm.Item as ItemCode,
    itm.Description as ItemDescription,
    itm.Nature as ItemNature, -- NUOVO
    comp.Quantity,
    comp.UoM,
    comp.UnitCost,
    comp.FixedCost,
    comp.TotalCost,
    comp.ComponentType,
    -- NUOVI CAMPI CALCOLATI
    (comp.Quantity * ISNULL(comp.UnitCost, 0)) + ISNULL(comp.FixedCost, 0) as CalculatedTotalCost,
    CASE 
        WHEN comp.Quantity > 0 THEN 
            ((comp.Quantity * ISNULL(comp.UnitCost, 0)) + ISNULL(comp.FixedCost, 0)) / comp.Quantity
        ELSE 0
    END as EffectiveUnitCost,
    CASE 
        WHEN comp.UnitCost > 0 OR comp.FixedCost > 0 THEN 1
        ELSE 0
    END as HasValidCost
FROM MA_ProjectArticles_BOMComponents comp
```

#### **3. Operazioni con Breakdown Dettagliato**
```sql
-- Aggiunti campi per analisi costi operazioni
SELECT 
    rt.RtgStep as RoutingId,
    rt.RtgStep as CycleNumber,
    rt.Operation as OperationCode,
    ISNULL(op.Description, rt.Operation) as OperationDescription,
    rt.WC as WorkCenterCode,
    ISNULL(wc.Description, rt.WC) as WorkCenterDescription,
    rt.Qty as Quantity,
    'PZ' as UoM,
    ISNULL(wc.HourlyCost, 0.0) as HourlyCost,
    ISNULL(op.UnitCost, 0.0) as UnitCost,
    ISNULL(op.FixedCost, 0.0) as AdditionalCost,
    -- NUOVI CAMPI TEMPI
    ISNULL(rt.SetupTime, 0) / 3600.0 as SetupTimeHours,
    ISNULL(rt.ProcessingTime, 0) / 3600.0 as ProcessingTimeHours,
    -- NUOVI CAMPI COSTI SEPARATI
    CASE 
        WHEN wc.HourlyCost > 0 THEN (ISNULL(rt.SetupTime, 0) / 3600.0) * wc.HourlyCost
        ELSE (ISNULL(rt.SetupTime, 0) / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0)
    END as SetupCost,
    CASE 
        WHEN wc.HourlyCost > 0 THEN (ISNULL(rt.ProcessingTime, 0) / 3600.0) * wc.HourlyCost * rt.Qty
        ELSE (ISNULL(rt.ProcessingTime, 0) / 3600.0) * dbo.FN_GetBOMCostingParameter(@CompanyId, 'COSTO_ORARIO_STANDARD', 25.0) * rt.Qty
    END as ProcessingCost,
    -- NUOVO CAMPO STATO
    CASE 
        WHEN op.UnitCost > 0 OR wc.HourlyCost > 0 OR op.FixedCost > 0 THEN 1
        ELSE 0
    END as HasValidCost
FROM MA_ProjectArticles_BOMRouting rt
```

## 🎨 **Modifiche Frontend**

### **Modal Dettagli Costi Migliorato**

#### **1. Informazioni BOM Estese**
- ✅ **Lotto di Produzione**: Mostra il lotto di produzione
- ✅ **Ultimo Aggiornamento**: Data/ora dell'ultimo calcolo costi
- ✅ **Dettagli JSON**: Visualizzazione formattata dei dettagli costificazione
- ✅ **Note**: Mostra le note di costificazione

#### **2. Tabella Componenti Migliorata**
```jsx
// Nuove colonne aggiunte
<TableHead>Costo Effettivo</TableHead>  // Costo unitario effettivo
<TableHead>Stato</TableHead>            // Badge OK/NO COSTO

// Nuovi campi visualizzati
<TableCell>{formatCurrency(comp.EffectiveUnitCost || 0)}</TableCell>
<TableCell>
  <Badge 
    variant={comp.HasValidCost ? "default" : "destructive"}
    className={comp.HasValidCost ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
  >
    {comp.HasValidCost ? "OK" : "NO COSTO"}
  </Badge>
</TableCell>
```

#### **3. Tabella Operazioni Migliorata**
```jsx
// Nuove colonne aggiunte
<TableHead>Setup (h)</TableHead>        // Tempo setup in ore
<TableHead>Processing (h)</TableHead>   // Tempo processing in ore
<TableHead>Costo Setup</TableHead>      // Costo setup separato
<TableHead>Costo Processing</TableHead> // Costo processing separato
<TableHead>Stato</TableHead>            // Badge OK/NO COSTO

// Nuovi campi visualizzati
<TableCell>{rt.SetupTimeHours?.toFixed(2) || '0.00'}</TableCell>
<TableCell>{rt.ProcessingTimeHours?.toFixed(2) || '0.00'}</TableCell>
<TableCell>{formatCurrency(rt.SetupCost || 0)}</TableCell>
<TableCell>{formatCurrency(rt.ProcessingCost || 0)}</TableCell>
```

## 🧪 **File di Test**

### **test_bom_cost_details.sql**
Creato file di test completo che:
- ✅ Inizializza parametri di costificazione
- ✅ Crea dati di test (BOM, componenti, operazioni, centri di lavoro)
- ✅ Esegue calcolo costificazione
- ✅ Testa la stored procedure SP_GetBOMCostingDetails
- ✅ Verifica gestione errori
- ✅ Pulisce i dati di test

## 📊 **Struttura Dati Restituiti**

### **Recordset 1: Informazioni BOM**
```json
{
  "BOMId": 2001,
  "BOMCode": "BOM-TEST-001",
  "BOMDescription": "BOM di Test",
  "ItemCode": "TEST-ITEM-001",
  "ItemDescription": "Articolo di Test",
  "UnitOfMeasure": "PZ",
  "LastCalculatedCost": 91.86,
  "LastMaterialCost": 2.77,
  "LastProcessingCost": 30.55,
  "ProductionLot": 10,
  "LastMaterialRefillCost": 0.41,
  "LastProcessingRefillCost": 4.58,
  "LastWasteRefillCost": 1.39,
  "LastDiscountRefillCost": 40.42,
  "LastTotalRefillCost": 8.07,
  "LastTransportRefillCost": 0.67,
  "CostingDetailsJSON": "{...}",
  "CostingNotes": "|| lotto(rif): 10 | Prezzo(rif): 91.86 | Costo(rif): 91.86 ||",
  "LastCostingUpdatedBy": 1,
  "LastCostingUpdatedAt": "2024-01-15T10:30:00"
}
```

### **Recordset 2: Componenti**
```json
{
  "ComponentId": 1002,
  "ComponentLine": 1,
  "ItemCode": "COMP-TEST-001",
  "ItemDescription": "Componente di Test",
  "ItemNature": 22413314,
  "Quantity": 2.5,
  "UoM": "KG",
  "UnitCost": 15.50,
  "FixedCost": 0.00,
  "TotalCost": 38.75,
  "ComponentType": 22413314,
  "ComponentTypeDescription": "Acquisto",
  "CalculatedTotalCost": 38.75,
  "EffectiveUnitCost": 15.50,
  "HasValidCost": 1
}
```

### **Recordset 3: Operazioni**
```json
{
  "RoutingId": 1,
  "CycleNumber": 1,
  "OperationCode": "OP-TEST-001",
  "OperationDescription": "Operazione Test",
  "WorkCenterCode": "WC-TEST-001",
  "WorkCenterDescription": "Centro Lavoro Test",
  "Quantity": 1,
  "UoM": "PZ",
  "HourlyCost": 35.00,
  "UnitCost": 0.0,
  "AdditionalCost": 0.0,
  "SetupTimeHours": 0.25,
  "ProcessingTimeHours": 0.50,
  "SetupCost": 8.75,
  "ProcessingCost": 17.50,
  "CalculatedTotalCost": 26.25,
  "HasValidCost": 1
}
```

## ✅ **Benefici delle Modifiche**

### **1. Trasparenza Completa**
- 📊 **Breakdown Dettagliato**: Separazione chiara tra costi setup e processing
- 🔍 **Stato Costi**: Indicatori visivi per componenti/operazioni senza costo
- 📝 **Tracciabilità**: Informazioni complete su chi e quando ha aggiornato i costi

### **2. Analisi Avanzata**
- ⏱️ **Tempi Separati**: Visualizzazione setup vs processing time
- 💰 **Costi Separati**: Breakdown dettagliato dei costi operazioni
- 📈 **Costo Effettivo**: Calcolo del costo unitario effettivo per componente

### **3. Debugging Migliorato**
- 🐛 **Identificazione Problemi**: Badge per componenti/operazioni senza costo
- 📋 **Dettagli JSON**: Accesso completo ai dettagli di costificazione
- 📝 **Note**: Informazioni aggiuntive sui calcoli

### **4. User Experience**
- 🎨 **Interfaccia Intuitiva**: Badge colorati per stato costi
- 📱 **Responsive**: Tabelle ottimizzate per diverse dimensioni schermo
- 🔄 **Aggiornamenti Real-time**: Informazioni sempre aggiornate

## 🚀 **Prossimi Passi**

1. **Test Completo**: Eseguire il file di test per verificare il funzionamento
2. **Validazione Dati**: Verificare che i dati vengano restituiti correttamente
3. **Ottimizzazione**: Eventuali miglioramenti basati sui test
4. **Documentazione**: Aggiornare la documentazione utente

## 📁 **File Modificati**

- ✅ `frontend/src/database/bom_costing_procedures.sql` - Stored procedure migliorata
- ✅ `frontend/src/pages/progetti/progetti/articoli/BOMCosting.jsx` - Frontend aggiornato
- ✅ `frontend/src/database/test_bom_cost_details.sql` - File di test (NUOVO)
- ✅ `frontend/src/database/BOM_COST_DETAILS_UPDATE.md` - Documentazione (NUOVO)

---

**🎯 Obiettivo Raggiunto**: I dettagli dei costi BOM ora forniscono una visione completa e trasparente di tutti gli aspetti della costificazione, con informazioni dettagliate per debugging e analisi avanzata.
