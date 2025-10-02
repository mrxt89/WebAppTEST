-- =============================================
-- Analisi dei costi degli articoli per la costificazione BOM
-- =============================================

PRINT '=== ANALISI COSTI ARTICOLI PER COSTIFICAZIONE ===';

-- 1. Verifica struttura tabella MA_Items (costi disponibili)
PRINT '1. Struttura tabella MA_Items (campi di costo):';

SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    CHARACTER_MAXIMUM_LENGTH,
    NUMERIC_PRECISION,
    NUMERIC_SCALE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'MA_Items'
AND COLUMN_NAME LIKE '%Cost%'
ORDER BY ORDINAL_POSITION;

-- 2. Verifica struttura tabella MA_ProjectArticles_Items
PRINT '2. Struttura tabella MA_ProjectArticles_Items:';

SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    CHARACTER_MAXIMUM_LENGTH,
    NUMERIC_PRECISION,
    NUMERIC_SCALE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'MA_ProjectArticles_Items'
ORDER BY ORDINAL_POSITION;

-- 3. Verifica struttura tabella MA_ProjectArticles_BOMComponents
PRINT '3. Struttura tabella MA_ProjectArticles_BOMComponents (campi di costo):';

SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    CHARACTER_MAXIMUM_LENGTH,
    NUMERIC_PRECISION,
    NUMERIC_SCALE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'MA_ProjectArticles_BOMComponents'
AND (COLUMN_NAME LIKE '%Cost%' OR COLUMN_NAME LIKE '%Price%')
ORDER BY ORDINAL_POSITION;

-- 4. Analisi dati di esempio - MA_Items
PRINT '4. Esempi di costi in MA_Items:';

SELECT TOP 10
    Item,
    Description,
    Nature,
    InhouseProcessingCost,
    OutsourcedProcessingCost,
    SetupCost,
    ProductionCost,
    LastProductionCost,
    BOMCost
FROM MA_Items 
WHERE CompanyId = 1
AND (InhouseProcessingCost > 0 OR OutsourcedProcessingCost > 0 OR SetupCost > 0 OR ProductionCost > 0 OR LastProductionCost > 0 OR BOMCost > 0)
ORDER BY Item;

-- 5. Analisi dati di esempio - MA_ProjectArticles_Items
PRINT '5. Esempi di articoli in MA_ProjectArticles_Items:';

SELECT TOP 10
    Id,
    Item,
    Description,
    Nature,
    BaseUoM
FROM MA_ProjectArticles_Items 
WHERE CompanyId = 1
ORDER BY Item;

-- 6. Analisi dati di esempio - MA_ProjectArticles_BOMComponents
PRINT '6. Esempi di costi in MA_ProjectArticles_BOMComponents:';

SELECT TOP 10
    BOMId,
    Line,
    ComponentId,
    Quantity,
    UnitCost,
    FixedCost,
    TotalCost,
    ComponentType
FROM MA_ProjectArticles_BOMComponents 
WHERE CompanyId = 1
AND (UnitCost > 0 OR FixedCost > 0 OR TotalCost > 0)
ORDER BY BOMId, Line;

-- 7. Verifica relazione tra MA_ProjectArticles_Items e MA_Items
PRINT '7. Verifica relazione tra MA_ProjectArticles_Items e MA_Items:';

SELECT 
    pai.Id as ProjectItemId,
    pai.Item as ProjectItemCode,
    pai.Description as ProjectDescription,
    pai.Nature as ProjectNature,
    mi.Item as MasterItemCode,
    mi.Description as MasterDescription,
    mi.Nature as MasterNature,
    mi.ProductionCost,
    mi.LastProductionCost,
    mi.BOMCost
FROM MA_ProjectArticles_Items pai
LEFT JOIN MA_Items mi ON pai.Item = mi.Item AND pai.CompanyId = mi.CompanyId
WHERE pai.CompanyId = 1
AND mi.Item IS NOT NULL
ORDER BY pai.Item;

-- 8. Analisi componenti di acquisto (Nature = 22413314)
PRINT '8. Componenti di acquisto (Nature = 22413314):';

SELECT 
    comp.BOMId,
    comp.Line,
    comp.ComponentId,
    comp.Quantity,
    comp.UnitCost as ComponentUnitCost,
    comp.FixedCost as ComponentFixedCost,
    comp.TotalCost as ComponentTotalCost,
    pai.Item as ItemCode,
    pai.Description as ItemDescription,
    pai.Nature as ItemNature,
    mi.ProductionCost as MasterProductionCost,
    mi.LastProductionCost as MasterLastProductionCost,
    mi.BOMCost as MasterBOMCost
FROM MA_ProjectArticles_BOMComponents comp
LEFT JOIN MA_ProjectArticles_Items pai ON comp.ComponentId = pai.Id AND comp.CompanyId = pai.CompanyId
LEFT JOIN MA_Items mi ON pai.Item = mi.Item AND pai.CompanyId = mi.CompanyId
WHERE comp.CompanyId = 1
AND pai.Nature = 22413314  -- Codici di acquisto
ORDER BY comp.BOMId, comp.Line;

-- 9. Proposta di logica per il costo dei materiali di acquisto
PRINT '9. PROPOSTA LOGICA PER COSTO MATERIALI DI ACQUISTO:';
PRINT '';

PRINT 'OPZIONE 1 - Usare MA_Items.ProductionCost:';
PRINT '  - Vantaggio: Costo standard di produzione/acquisto';
PRINT '  - Svantaggio: Potrebbe non essere aggiornato';

PRINT '';
PRINT 'OPZIONE 2 - Usare MA_Items.LastProductionCost:';
PRINT '  - Vantaggio: Ultimo costo effettivo';
PRINT '  - Svantaggio: Potrebbe essere troppo specifico';

PRINT '';
PRINT 'OPZIONE 3 - Usare MA_Items.BOMCost:';
PRINT '  - Vantaggio: Costo calcolato dalla BOM';
PRINT '  - Svantaggio: Potrebbe essere 0 per materiali di acquisto';

PRINT '';
PRINT 'OPZIONE 4 - Priorità: ProductionCost > LastProductionCost > BOMCost > UnitCost (BOM)';
PRINT '  - Vantaggio: Usa il miglior costo disponibile';
PRINT '  - Svantaggio: Logica più complessa';

-- 10. Query di esempio per implementare la logica proposta
PRINT '10. Query di esempio per la logica proposta:';

SELECT 
    comp.BOMId,
    comp.Line,
    comp.ComponentId,
    pai.Item as ItemCode,
    pai.Description as ItemDescription,
    pai.Nature as ItemNature,
    comp.Quantity,
    comp.UnitCost as BOMUnitCost,
    mi.ProductionCost as MasterProductionCost,
    mi.LastProductionCost as MasterLastProductionCost,
    mi.BOMCost as MasterBOMCost,
    
    -- Logica proposta: Priorità dei costi
    CASE 
        WHEN mi.ProductionCost > 0 THEN mi.ProductionCost
        WHEN mi.LastProductionCost > 0 THEN mi.LastProductionCost
        WHEN mi.BOMCost > 0 THEN mi.BOMCost
        WHEN comp.UnitCost > 0 THEN comp.UnitCost
        ELSE 0
    END as SuggestedUnitCost,
    
    -- Calcolo costo totale
    comp.Quantity * 
    CASE 
        WHEN mi.ProductionCost > 0 THEN mi.ProductionCost
        WHEN mi.LastProductionCost > 0 THEN mi.LastProductionCost
        WHEN mi.BOMCost > 0 THEN mi.BOMCost
        WHEN comp.UnitCost > 0 THEN comp.UnitCost
        ELSE 0
    END as SuggestedTotalCost

FROM MA_ProjectArticles_BOMComponents comp
LEFT JOIN MA_ProjectArticles_Items pai ON comp.ComponentId = pai.Id AND comp.CompanyId = pai.CompanyId
LEFT JOIN MA_Items mi ON pai.Item = mi.Item AND pai.CompanyId = mi.CompanyId
WHERE comp.CompanyId = 1
AND pai.Nature = 22413314  -- Codici di acquisto
ORDER BY comp.BOMId, comp.Line;

PRINT '';
PRINT '=== ANALISI COMPLETATA ===';
PRINT 'RACCOMANDAZIONE: Implementare la logica di priorità dei costi per i materiali di acquisto.';
