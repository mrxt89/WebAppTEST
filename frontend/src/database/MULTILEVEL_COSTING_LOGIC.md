# 🔧 **Logica di Costificazione Multilivello Corretta**

## 📋 **Panoramica**
Documentazione della logica corretta per la costificazione multilivello delle BOM, con particolare attenzione al calcolo delle quantità e dei costi.

## 🎯 **Problema Identificato**

### **Errore Precedente**
La logica precedente calcolava i costi considerando solo `UnitCost` senza moltiplicare per la `Quantity` o `CalculatedQty`, portando a costi sottostimati.

### **Logica Corretta**
Il costo totale di un componente deve essere: **`UnitCost * CalculatedQty + FixedCost`**

## 📊 **Struttura Dati BOM**

### **Campi Importanti**
- **`UnitCost`**: Costo per unità di misura (€/kg, €/pz, €/m)
- **`Quantity`**: Quantità necessaria per produrre 1 pezzo del prodotto padre
- **`CalculatedQty`**: Quantità calcolata considerando tutti i livelli (esplosione)
- **`FixedCost`**: Costi fissi del componente
- **`ComponentType`**: Tipo componente (Acquisto, Semilavorato, Prodotto Finito)

## 🔢 **Logica di Calcolo**

### **1. Calcolo Quantità Calcolata (CalculatedQty)**
```
CalculatedQty = Quantity * ParentCalculatedQty
```

**Esempio**:
- Livello 1: Semi1 con Quantity = 2.0PZ, CalculatedQty = 2.0PZ
- Livello 2: Purchase2 con Quantity = 2.5PZ, CalculatedQty = 2.5 * 2.0 = 5.0PZ

### **2. Calcolo Costo Totale Componente**
```
CostoTotale = (UnitCost * CalculatedQty) + FixedCost
```

**Esempio**:
- Purchase2: UnitCost = 15.00€/PZ, CalculatedQty = 5.0PZ
- CostoTotale = (15.00 * 5.0) + 0 = 75.00€

### **3. Calcolo Costo Unitario Effettivo**
```
CostoUnitarioEffettivo = (CostoTotale / CalculatedQty)
```

**Esempio**:
- Purchase2: CostoTotale = 75.00€, CalculatedQty = 5.0PZ
- CostoUnitarioEffettivo = 75.00 / 5.0 = 15.00€/PZ

## 🏗️ **Esempio Pratico Multilivello**

### **Struttura BOM**
```
MAIN-ITEM (Livello 0)
├── SEMI-1 (Livello 1) - 2.0PZ
│   ├── SEMI-2 (Livello 2) - 3.0PZ
│   │   └── PURCHASE-3 (Livello 3) - 4.0M @ 8.50€/M
│   └── PURCHASE-2 (Livello 2) - 2.5PZ @ 15.00€/PZ
└── PURCHASE-1 (Livello 1) - 1.5KG @ 25.00€/KG
```

### **Calcolo Quantità Calcolate**
```
Livello 1:
- SEMI-1: CalculatedQty = 2.0PZ
- PURCHASE-1: CalculatedQty = 1.5KG

Livello 2:
- SEMI-2: CalculatedQty = 3.0 * 2.0 = 6.0PZ
- PURCHASE-2: CalculatedQty = 2.5 * 2.0 = 5.0PZ

Livello 3:
- PURCHASE-3: CalculatedQty = 4.0 * 6.0 = 24.0M
```

### **Calcolo Costi Totali**
```
Livello 3:
- PURCHASE-3: (8.50€/M * 24.0M) + 0 = 204.00€

Livello 2:
- PURCHASE-2: (15.00€/PZ * 5.0PZ) + 0 = 75.00€
- SEMI-2: Costo dalla sua BOM + operazioni

Livello 1:
- PURCHASE-1: (25.00€/KG * 1.5KG) + 0 = 37.50€
- SEMI-1: Costo dalla sua BOM + operazioni
```

## 💻 **Implementazione SQL**

### **Calcolo Costo Totale**
```sql
-- Calcola il costo totale per questo componente
CASE 
    WHEN ComponentType IN (22413312, 22413313) THEN
        -- Per semilavorati e prodotti finiti: (costo per pezzo dalla BOM * quantità calcolata) + costi fissi
        (CalculatedQty * ISNULL((
            SELECT 
                (bom_comp.TotalCost / NULLIF(bom_comp.ProductionLot, 0))
            FROM MA_ProjectArticles_BillOfMaterials bom_comp
            WHERE bom_comp.ItemId = ComponentId 
            AND bom_comp.CompanyId = @CompanyId
            AND bom_comp.TotalCost > 0
        ), UnitCost)) + ISNULL(FixedCost, 0)
    ELSE 
        -- Per acquisti: (costo per unità * quantità calcolata) + costi fissi
        (CalculatedQty * ISNULL(UnitCost, 0)) + ISNULL(FixedCost, 0)
END as CalculatedTotalCost
```

### **Calcolo Costo Unitario Effettivo**
```sql
-- Calcola il costo unitario effettivo (costo totale / quantità calcolata)
CASE 
    WHEN CalculatedQty > 0 THEN 
        CASE 
            WHEN ComponentType IN (22413312, 22413313) THEN
                -- Per semilavorati: costo per pezzo dalla BOM + (costi fissi / quantità calcolata)
                ISNULL((
                    SELECT 
                        (bom_comp.TotalCost / NULLIF(bom_comp.ProductionLot, 0))
                    FROM MA_ProjectArticles_BillOfMaterials bom_comp
                    WHERE bom_comp.ItemId = ComponentId 
                    AND bom_comp.CompanyId = @CompanyId
                    AND bom_comp.TotalCost > 0
                ), UnitCost) + (ISNULL(FixedCost, 0) / CalculatedQty)
            ELSE 
                -- Per acquisti: costo per unità + (costi fissi / quantità calcolata)
                UnitCost + (ISNULL(FixedCost, 0) / CalculatedQty)
        END
    ELSE 0
END as EffectiveUnitCost
```

## 🧪 **Test di Verifica**

### **File di Test**
- `test_multilevel_costing.sql`: Test completo con BOM a 3 livelli

### **Verifiche da Eseguire**
1. **Quantità Calcolate**: Verificare che `CalculatedQty` sia corretta per ogni livello
2. **Costi Totali**: Verificare che `CalculatedTotalCost = UnitCost * CalculatedQty + FixedCost`
3. **Costi Unitari**: Verificare che `EffectiveUnitCost = CalculatedTotalCost / CalculatedQty`
4. **Esplosione Completa**: Verificare che tutti i livelli siano mostrati

### **Esempio di Verifica**
```sql
-- Verifica manuale per Purchase3 al livello 3
SELECT 
    'Purchase3' as Component,
    4.0 as Quantity,
    6.0 as ParentCalculatedQty, -- Da Semi2
    24.0 as ExpectedCalculatedQty, -- 4.0 * 6.0
    8.50 as UnitCost,
    204.00 as ExpectedTotalCost -- 8.50 * 24.0
```

## ✅ **Benefici della Logica Corretta**

### **1. Accuratezza**
- ✅ **Costi Reali**: I costi riflettono la quantità effettivamente necessaria
- ✅ **Tracciabilità**: Ogni livello è tracciabile e verificabile
- ✅ **Consistenza**: Logica uniforme per tutti i tipi di componente

### **2. Trasparenza**
- ✅ **Breakdown Dettagliato**: Ogni componente mostra quantità e costi
- ✅ **Livelli Visibili**: L'esplosione mostra tutti i livelli
- ✅ **Calcoli Verificabili**: Ogni calcolo è trasparente e verificabile

### **3. Manutenibilità**
- ✅ **Logica Semplice**: Formula chiara e comprensibile
- ✅ **Codice Pulito**: Implementazione SQL pulita e documentata
- ✅ **Test Completi**: Test che verificano ogni aspetto

## 🚀 **Come Testare**

### **1. Esegui Test Database**
```sql
-- Esegui il file di test
EXEC SP_InitializeBOMCostingParameters @CompanyId = 1;
-- Poi esegui test_multilevel_costing.sql
```

### **2. Verifica Frontend**
1. **Seleziona BOM**: Con struttura multilivello
2. **Esegui Calcolo**: Costificazione completa
3. **Apri Modal**: Dettagli costi
4. **Verifica Dati**: 
   - Quantità calcolate corrette
   - Costi totali corretti
   - Livelli visibili

## 📁 **File Modificati**

- ✅ `bom_costing_procedures.sql` - Logica di calcolo corretta
- ✅ `BOMCosting.jsx` - Frontend con colonne multilivello
- ✅ `test_multilevel_costing.sql` - Test completo (NUOVO)
- ✅ `MULTILEVEL_COSTING_LOGIC.md` - Documentazione (NUOVO)

---

**🎯 Obiettivo Raggiunto**: La logica di costificazione multilivello ora calcola correttamente i costi considerando le quantità effettive necessarie a tutti i livelli, garantendo accuratezza e trasparenza nei calcoli.
