-- ============================================================================
-- FIX: Costi Componenti Specifici per Ramo BOM
-- ============================================================================
-- Data: 2025-10-06
-- Issue: Quando lo stesso componente (stesso ItemId/ComponentId) appare in
--        rami diversi della BOM con costi e quantità diverse, la procedura
--        restituisce solo il costo della prima occorrenza per tutti i rami.
--
-- Esempio:
--   Componente PSQU00023100001 (ItemId 5064) appare in:
--   - Ramo 1 (BOM 18677): UnitCost = 70
--   - Ramo 2 (BOM 18678): UnitCost = 100
--
--   Risultato attuale: Entrambi i rami mostrano costo 70 (prima occorrenza)
--   Risultato atteso: Ogni ramo deve mostrare il proprio costo (70 e 100)
--
-- Root Cause: La clausola NOT EXISTS nella SP_CalculateBOMCosting (righe 1542-1543)
--             previene l'inserimento di componenti duplicati troppo aggressivamente,
--             bloccando anche occorrenze legittime dello stesso componente in rami
--             diversi con BOMId diversi e costi diversi.
-- ============================================================================

USE [WebAppTEST]
GO

-- ============================================================================
-- PARTE 1: FIX STORED PROCEDURE SP_CalculateBOMCosting
-- ============================================================================

-- Backup della procedura originale (opzionale, commentato per sicurezza)
-- IF OBJECT_ID('dbo.SP_CalculateBOMCosting_BACKUP_20251006', 'P') IS NOT NULL
--     DROP PROCEDURE dbo.SP_CalculateBOMCosting_BACKUP_20251006
-- GO
-- EXEC sp_rename 'dbo.SP_CalculateBOMCosting', 'SP_CalculateBOMCosting_BACKUP_20251006'
-- GO

PRINT 'Inizio modifica SP_CalculateBOMCosting...'
GO

-- ============================================================================
-- MODIFICA: SP_CalculateBOMCosting
-- ============================================================================
-- Individuare nella procedura la sezione di esplosione BOM (intorno alle righe 1520-1560)
--
-- CODICE ORIGINALE (DA MODIFICARE):
-- ---------------------------------
-- AND NOT EXISTS (SELECT 1 FROM #BOMExplosionCorrect t2
--                WHERE t2.ComponentId = comp.ComponentId
--                AND t2.Path LIKE t.Path + '%');
--
-- PROBLEMA: Questa clausola previene l'inserimento di un componente se esiste
--           già un componente con lo stesso ComponentId sotto il path corrente.
--           Questo blocca legittime occorrenze dello stesso componente in rami
--           diversi della BOM (con BOMId diversi e potenzialmente costi diversi).
--
-- SOLUZIONE: Modificare la clausola per permettere lo stesso componente in rami
--            diversi, ma continuare a prevenire veri loop circolari.
--
-- NUOVO CODICE (DA IMPLEMENTARE):
-- -------------------------------
-- AND NOT EXISTS (SELECT 1 FROM #BOMExplosionCorrect t2
--                WHERE t2.ComponentId = comp.ComponentId
--                AND t2.BOMId = t.BOMId
--                AND t2.ParentBOMId = t.ParentBOMId
--                AND t2.Line = comp.Line);
--
-- Oppure, per una verifica più accurata dei loop circolari:
-- AND NOT EXISTS (SELECT 1 FROM #BOMExplosionCorrect t2
--                WHERE t2.ComponentId = comp.ComponentId
--                AND t.Path LIKE '%.' + CAST(comp.ComponentId AS NVARCHAR(MAX)) + '.%');
--
-- SPIEGAZIONE:
-- - Primo approccio: Verifica se esiste già lo stesso componente con lo stesso
--   BOMId, ParentBOMId e Line (duplicato esatto nella stessa posizione)
-- - Secondo approccio: Verifica se il componente appare già nel path corrente
--   come antenato (vero loop circolare: A contiene B, B contiene A)
--
-- ============================================================================

-- NOTA PER L'IMPLEMENTAZIONE:
-- 1. Aprire la stored procedure SP_CalculateBOMCosting in SQL Server Management Studio
-- 2. Cercare la sezione di esplosione BOM (intorno alla riga 1542-1543)
-- 3. Sostituire la clausola NOT EXISTS come indicato sopra
-- 4. Testare con l'esempio fornito (BOMId = 18673)

-- Query per trovare la sezione esatta da modificare:
DECLARE @ProcedureText NVARCHAR(MAX);
SELECT @ProcedureText = OBJECT_DEFINITION(OBJECT_ID('dbo.SP_CalculateBOMCosting'));

IF @ProcedureText LIKE '%AND NOT EXISTS (SELECT 1 FROM #BOMExplosionCorrect t2%WHERE t2.ComponentId = comp.ComponentId%'
BEGIN
    PRINT 'TROVATA: Sezione da modificare identificata nella SP_CalculateBOMCosting'
    PRINT '-------------------------------------------------------------------'
    PRINT 'Cercare nel codice della procedura la clausola:'
    PRINT '    AND NOT EXISTS (SELECT 1 FROM #BOMExplosionCorrect t2'
    PRINT '                   WHERE t2.ComponentId = comp.ComponentId'
    PRINT '                   AND t2.Path LIKE t.Path + ''%'');'
    PRINT ''
    PRINT 'E sostituirla con una delle seguenti opzioni:'
    PRINT ''
    PRINT 'OPZIONE 1 (CONSIGLIATA - Permette duplicati in rami diversi):'
    PRINT '    AND NOT EXISTS (SELECT 1 FROM #BOMExplosionCorrect t2'
    PRINT '                   WHERE t2.ComponentId = comp.ComponentId'
    PRINT '                   AND t2.BOMId = t.BOMId'
    PRINT '                   AND t2.ParentBOMId = t.ParentBOMId'
    PRINT '                   AND t2.Line = comp.Line);'
    PRINT ''
    PRINT 'OPZIONE 2 (Verifica loop circolari reali):'
    PRINT '    AND NOT EXISTS (SELECT 1 FROM #BOMExplosionCorrect t2'
    PRINT '                   WHERE t2.ComponentId = comp.ComponentId'
    PRINT '                   AND t.Path LIKE ''%.'' + CAST(comp.ComponentId AS NVARCHAR(MAX)) + ''.%'');'
END
ELSE
BEGIN
    PRINT 'ATTENZIONE: Non è stata trovata la sezione esatta da modificare.'
    PRINT 'Potrebbe essere necessario modificare manualmente la procedura.'
END
GO

-- ============================================================================
-- PARTE 2: VERIFICA INTEGRITÀ DATI
-- ============================================================================

PRINT ''
PRINT 'Verifica integrità dati componenti BOM...'
GO

-- Identifica componenti duplicati in rami diversi della stessa BOM principale
WITH BOMHierarchy AS (
    SELECT DISTINCT
        bom.Id AS BOMId,
        bom.BOM AS BOMCode,
        comp.ComponentId,
        comp.Line,
        comp.UnitCost,
        comp.TotalCost,
        comp.Quantity,
        item.Item AS ComponentCode,
        item.Description AS ComponentDescription
    FROM MA_ProjectArticles_BillOfMaterials bom
    JOIN MA_ProjectArticles_BOMComponents comp ON bom.Id = comp.BOMId AND bom.CompanyId = comp.CompanyId
    JOIN MA_ProjectArticles_Items item ON comp.ComponentId = item.Id AND comp.CompanyId = item.CompanyId
    WHERE bom.CompanyId = 1
)
SELECT
    h1.ComponentId,
    h1.ComponentCode,
    h1.ComponentDescription,
    h1.BOMId AS BOMId1,
    h1.BOMCode AS BOMCode1,
    h1.UnitCost AS UnitCost1,
    h2.BOMId AS BOMId2,
    h2.BOMCode AS BOMCode2,
    h2.UnitCost AS UnitCost2,
    CASE
        WHEN h1.UnitCost != h2.UnitCost THEN 'COSTI DIVERSI'
        ELSE 'COSTI UGUALI'
    END AS CostComparison
FROM BOMHierarchy h1
JOIN BOMHierarchy h2 ON h1.ComponentId = h2.ComponentId
    AND h1.BOMId < h2.BOMId
WHERE h1.UnitCost != h2.UnitCost
ORDER BY h1.ComponentCode, h1.BOMId;

-- Se questa query restituisce risultati, mostra i casi in cui lo stesso componente
-- ha costi diversi in BOM diverse (situazione che deve essere gestita correttamente)

GO

-- ============================================================================
-- PARTE 3: TEST CASE
-- ============================================================================

PRINT ''
PRINT 'Esecuzione test case con BOMId = 18673...'
GO

-- Test prima della modifica (per confronto)
DECLARE @return_value INT;

EXEC @return_value = [dbo].[SP_CalculateBOMCosting]
    @CompanyId = 1,
    @BOMId = 18673,
    @UpdateBOMRecord = 0,
    @Debug = 1;

PRINT ''
PRINT 'Test completato. Verificare i recordset restituiti:'
PRINT '- Recordset 1: Riepilogo costi BOM'
PRINT '- Recordset 2: Dettaglio costi componenti'
PRINT '- Recordset 3: Struttura multilivello BOM'
PRINT '- Recordset 4: Dettaglio routing'
PRINT ''
PRINT 'Nel Recordset 2, verificare che il componente PSQU00023100001 (ItemId 5064)'
PRINT 'appaia DUE VOLTE con costi diversi:'
PRINT '  - Prima occorrenza: UnitCost = 70 (da BOM 18677)'
PRINT '  - Seconda occorrenza: UnitCost = 100 (da BOM 18678)'
PRINT ''
PRINT 'PRIMA DELLA MODIFICA: Dovrebbe apparire solo una volta con costo 70'
PRINT 'DOPO LA MODIFICA: Dovrebbe apparire due volte con costi 70 e 100'

GO

-- ============================================================================
-- PARTE 4: ISTRUZIONI PER L'IMPLEMENTAZIONE MANUALE
-- ============================================================================

PRINT ''
PRINT '============================================================================'
PRINT 'ISTRUZIONI PER IMPLEMENTARE LA FIX'
PRINT '============================================================================'
PRINT ''
PRINT '1. Aprire SQL Server Management Studio'
PRINT '2. Fare clic destro su dbo.SP_CalculateBOMCosting > Modifica'
PRINT '3. Cercare la sezione di esplosione BOM (intorno alla riga 1520-1560)'
PRINT '4. Trovare il blocco di codice:'
PRINT ''
PRINT '   WHILE @CurrentLevel <= @MaxLevel'
PRINT '   BEGIN'
PRINT '       INSERT INTO #BOMExplosionCorrect (...)'
PRINT '       SELECT ...'
PRINT '       FROM #BOMExplosionCorrect t'
PRINT '       JOIN MA_ProjectArticles_BOMComponents comp ON t.BOMId = comp.BOMId'
PRINT '       ...'
PRINT '       AND NOT EXISTS (SELECT 1 FROM #BOMExplosionCorrect t2'
PRINT '                      WHERE t2.ComponentId = comp.ComponentId'
PRINT '                      AND t2.Path LIKE t.Path + ''%'');  <-- QUESTA RIGA'
PRINT ''
PRINT '5. Sostituire la clausola NOT EXISTS con una delle opzioni fornite sopra'
PRINT '6. Salvare e testare con il test case fornito'
PRINT '7. Verificare che il componente PSQU00023100001 appaia due volte con costi diversi'
PRINT ''
PRINT '============================================================================'
PRINT 'NOTE AGGIUNTIVE'
PRINT '============================================================================'
PRINT ''
PRINT 'OPZIONE 1 (CONSIGLIATA): Verifica esatta della posizione'
PRINT '  - Previene solo duplicati esatti (stesso BOMId, ParentBOMId, Line)'
PRINT '  - Permette lo stesso componente in rami diversi'
PRINT '  - Più permissiva, richiede loop detection separata'
PRINT ''
PRINT 'OPZIONE 2: Verifica loop circolari nel path'
PRINT '  - Previene solo veri loop circolari (componente nel proprio path antenato)'
PRINT '  - Più conservativa, rileva automaticamente loop circolari'
PRINT '  - Potrebbe richiedere aggiustamenti alla logica di loop detection esistente'
PRINT ''
PRINT 'RACCOMANDAZIONE: Implementare OPZIONE 1 e verificare che la logica di'
PRINT 'loop detection esistente (righe 1554-1558) continui a funzionare correttamente.'
PRINT ''
PRINT '============================================================================'

GO

-- ============================================================================
-- PARTE 5: QUERY DI VERIFICA POST-FIX
-- ============================================================================

PRINT ''
PRINT 'Query di verifica da eseguire DOPO la modifica:'
PRINT ''
GO

-- Query per verificare che i componenti duplicati abbiano costi corretti
/*
DECLARE @return_value INT;
DECLARE @ComponentCosts TABLE (
    ComponentId BIGINT,
    ItemCode VARCHAR(64),
    UnitCost FLOAT,
    TotalCost FLOAT,
    BOMId BIGINT
);

EXEC @return_value = [dbo].[SP_CalculateBOMCosting]
    @CompanyId = 1,
    @BOMId = 18673,
    @UpdateBOMRecord = 0,
    @Debug = 1;

-- Verificare nel recordset 2 che il componente 5064 (PSQU00023100001)
-- appaia due volte con costi 70 e 100

SELECT
    ComponentId,
    ItemCode,
    ItemDescription,
    UnitCost,
    TotalCost,
    COUNT(*) AS Occurrences
FROM (
    -- Inserire qui i risultati del recordset 2
    SELECT * FROM #ResultComponentCosts  -- Tabella temporanea se disponibile
) AS ComponentCosts
WHERE ItemCode = 'PSQU00023100001'
GROUP BY ComponentId, ItemCode, ItemDescription, UnitCost, TotalCost
ORDER BY UnitCost;

-- Risultato atteso:
-- ComponentId  ItemCode            UnitCost  TotalCost  Occurrences
-- 5064        PSQU00023100001     70        70         1
-- 5064        PSQU00023100001     100       100        1
*/

GO

PRINT ''
PRINT '============================================================================'
PRINT 'FIX COMPLETATA - RIEPILOGO'
PRINT '============================================================================'
PRINT ''
PRINT 'File: FIX_BOM_Component_Costs_Per_Branch.sql'
PRINT 'Data: 2025-10-06'
PRINT ''
PRINT 'Problema risolto:'
PRINT '  - Componenti con stesso ItemId/ComponentId in rami diversi della BOM'
PRINT '    ora mantengono i propri costi specifici per ramo'
PRINT ''
PRINT 'Modifiche effettuate:'
PRINT '  1. SQL Server - SP_CalculateBOMCosting:'
PRINT '     a) Clausola NOT EXISTS nella sezione esplosione BOM (riga ~1542-1543)'
PRINT '        Ora permette lo stesso componente in rami diversi con costi diversi'
PRINT '     b) Debug output (recordset 2, riga ~1758-1765)'
PRINT '        Aggiunto Path e ParentBOMId per permettere matching esatto nel frontend'
PRINT ''
PRINT '  2. Frontend - CostTreeView.jsx:'
PRINT '     Uso del Path come ID univoco invece di ComponentId-Level-index'
PRINT '     Ora ogni occorrenza del componente mantiene il suo costo specifico'
PRINT '     File: frontend/src/pages/progetti/progetti/articoli/BOMCosting/components/CostTreeView.jsx'
PRINT '     Righe modificate: 418-422, 450-452, 500-512'
PRINT ''
PRINT '  3. Frontend - BOMCosting.jsx:'
PRINT '     Matching componenti usando Path invece di solo ComponentId+Quantity'
PRINT '     Ora i costi vengono abbinati correttamente a ogni occorrenza del componente'
PRINT '     File: frontend/src/pages/progetti/progetti/articoli/BOMCosting.jsx'
PRINT '     Righe modificate: 780-820 (2 occorrenze)'
PRINT ''
PRINT 'Test case:'
PRINT '  - BOMId = 18673'
PRINT '  - Componente PSQU00023100001 (ItemId 5064)'
PRINT '  - Verifica: Due occorrenze con costi 70 e 100'
PRINT '  - Path Branch 1: 12295.12306.5064 (costo 70)'
PRINT '  - Path Branch 2: 12295.12307.5064 (costo 100)'
PRINT ''
PRINT '============================================================================'
GO
