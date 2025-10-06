-- ============================================================================
-- MODIFICHE MANUALI DA APPLICARE A SP_CalculateBOMCosting
-- ============================================================================
-- Data: 2025-10-06
-- Istruzioni: Aprire SQL Server Management Studio e applicare le seguenti
--             modifiche alla stored procedure SP_CalculateBOMCosting
-- ============================================================================

USE [WebAppTEST]
GO

-- ============================================================================
-- MODIFICA 1: Clausola NOT EXISTS (PRIORITÀ ALTA)
-- ============================================================================
-- Posizione: Circa riga 1542-1543 nella sezione di esplosione BOM
-- Descrizione: Permette lo stesso componente in rami diversi con costi diversi
-- ============================================================================

/*
CERCA QUESTO CODICE:
------------------

WHILE @CurrentLevel <= @MaxLevel
BEGIN
    INSERT INTO #BOMExplosionCorrect (
        Level, ItemId, ComponentId, ParentId, BOMId, ParentBOMId, Line, ComponentType,
        Path, Quantity, CalculatedQty, UoM, UnitCost, TotalCost, FixedCost,
        ComponentNature, ComponentItemCode, ComponentDescription, IsLoop
    )
    SELECT
        @CurrentLevel,
        comp.ComponentId,
        comp.ComponentId,
        t.ItemId,
        compBOMCorrect.BOMId,
        t.BOMId,
        comp.Line,
        comp.ComponentType,
        t.Path + '.' + CAST(comp.ComponentId AS NVARCHAR(MAX)),
        comp.Quantity,
        t.CalculatedQty * comp.Quantity,
        comp.UoM,
        comp.UnitCost,
        comp.TotalCost,
        comp.FixedCost,
        item.Nature,
        item.Item,
        item.Description,
        0
    FROM #BOMExplosionCorrect t
    JOIN MA_ProjectArticles_BOMComponents comp ON t.BOMId = comp.BOMId AND comp.CompanyId = @CompanyId
    ... altre join ...
    WHERE t.Level = @CurrentLevel - 1
    AND NOT EXISTS (SELECT 1 FROM #BOMExplosionCorrect t2
                   WHERE t2.ComponentId = comp.ComponentId
                   AND t2.Path LIKE t.Path + '%');   <-- QUESTA È LA RIGA DA MODIFICARE

    SET @CurrentLevel = @CurrentLevel + 1;
END


SOSTITUISCI LA CLAUSOLA NOT EXISTS CON:
---------------------------------------

    AND NOT EXISTS (SELECT 1 FROM #BOMExplosionCorrect t2
                   WHERE t2.ComponentId = comp.ComponentId
                   AND t2.BOMId = t.BOMId
                   AND t2.ParentBOMId = t.ParentBOMId
                   AND t2.Line = comp.Line);


SPIEGAZIONE:
-----------
La vecchia clausola impediva l'inserimento se esisteva già un componente con lo
stesso ComponentId sotto il path corrente, anche se proveniva da un BOM diverso.

La nuova clausola verifica se esiste già ESATTAMENTE lo stesso componente nella
stessa posizione (stesso BOMId, ParentBOMId e Line), permettendo lo stesso
componente in rami diversi della BOM con costi diversi.
*/

-- ============================================================================
-- MODIFICA 2: Aggiungere Path e ParentBOMId al Debug Output (PRIORITÀ ALTA)
-- ============================================================================
-- Posizione: Circa riga 1758-1765 nella sezione debug output
-- Descrizione: Aggiunge Path e ParentBOMId al recordset 2 per matching frontend
-- ============================================================================

/*
CERCA QUESTO CODICE:
------------------

IF @Debug = 1
BEGIN
    SELECT exp.ComponentId, exp.Line as ComponentLine, exp.ComponentId as ItemId,
        exp.ComponentItemCode as ItemCode, exp.ComponentDescription as ItemDescription,
        exp.Quantity, exp.UoM, exp.UnitCost, exp.FixedCost, exp.TotalCost, exp.ComponentType,
        (exp.CalculatedQty * ISNULL(exp.UnitCost, 0)) + (ISNULL(exp.FixedCost, 0) / @ProductionLot * exp.CalculatedQty) as CalculatedTotalCost
    FROM #BOMExplosionCorrect exp
    WHERE exp.IsLoop = 0 AND exp.Level > 0
    ORDER BY exp.Line;


SOSTITUISCI CON:
---------------

IF @Debug = 1
BEGIN
    SELECT exp.ComponentId, exp.Line as ComponentLine, exp.ComponentId as ItemId,
        exp.ComponentItemCode as ItemCode, exp.ComponentDescription as ItemDescription,
        exp.Quantity, exp.UoM, exp.UnitCost, exp.FixedCost, exp.TotalCost, exp.ComponentType,
        (exp.CalculatedQty * ISNULL(exp.UnitCost, 0)) + (ISNULL(exp.FixedCost, 0) / @ProductionLot * exp.CalculatedQty) as CalculatedTotalCost,
        exp.Path,
        exp.ParentBOMId
    FROM #BOMExplosionCorrect exp
    WHERE exp.IsLoop = 0 AND exp.Level > 0
    ORDER BY exp.Line;


SPIEGAZIONE:
-----------
Aggiunge due colonne al recordset di debug:
- Path: Il percorso gerarchico univoco del componente (es. "12295.12306.5064")
- ParentBOMId: L'ID della BOM parent per aiutare il matching

Questo permette al frontend di distinguere lo stesso componente quando appare
in rami diversi dell'albero BOM.
*/

-- ============================================================================
-- COME APPLICARE LE MODIFICHE
-- ============================================================================

PRINT '============================================================================'
PRINT 'ISTRUZIONI PER APPLICARE LE MODIFICHE'
PRINT '============================================================================'
PRINT ''
PRINT 'Passo 1: Aprire SQL Server Management Studio'
PRINT ''
PRINT 'Passo 2: Connettersi al database WebAppTEST'
PRINT ''
PRINT 'Passo 3: Fare click destro su dbo.SP_CalculateBOMCosting > Modifica'
PRINT ''
PRINT 'Passo 4: Cercare la sezione di esplosione BOM (CTRL+F cerca "WHILE @CurrentLevel")'
PRINT '         Trovare la clausola NOT EXISTS e sostituirla come indicato sopra'
PRINT ''
PRINT 'Passo 5: Cercare la sezione debug output (CTRL+F cerca "IF @Debug = 1")'
PRINT '         Aggiungere exp.Path e exp.ParentBOMId al SELECT come indicato sopra'
PRINT ''
PRINT 'Passo 6: Cliccare su "Esegui" (o premere F5) per salvare le modifiche'
PRINT ''
PRINT 'Passo 7: Testare con:'
PRINT '         EXEC SP_CalculateBOMCosting @CompanyId=1, @BOMId=18673, @Debug=1'
PRINT ''
PRINT 'Passo 8: Verificare nel recordset 2 che il componente PSQU00023100001'
PRINT '         appaia DUE volte con:'
PRINT '         - Path: 12295.12306.5064, UnitCost: 70'
PRINT '         - Path: 12295.12307.5064, UnitCost: 100'
PRINT ''
PRINT '============================================================================'
PRINT 'NOTA IMPORTANTE'
PRINT '============================================================================'
PRINT ''
PRINT 'Se preferisci creare un backup prima di modificare:'
PRINT ''
PRINT 'EXEC sp_rename ''dbo.SP_CalculateBOMCosting'', ''SP_CalculateBOMCosting_BACKUP_20251006'''
PRINT ''
PRINT 'Poi ricrea la procedura con le modifiche.'
PRINT ''
PRINT '============================================================================'

GO

-- ============================================================================
-- TEST QUERY PER VERIFICARE LE MODIFICHE
-- ============================================================================

PRINT ''
PRINT 'Test query per verificare le modifiche:'
PRINT ''

/*
-- Esegui questa query DOPO aver applicato le modifiche
DECLARE @return_value INT;

EXEC @return_value = [dbo].[SP_CalculateBOMCosting]
    @CompanyId = 1,
    @BOMId = 18673,
    @UpdateBOMRecord = 0,
    @Debug = 1;

-- Verifica il recordset 2 (componenti)
-- Cerca il componente con ItemCode = 'PSQU00023100001'
-- Dovrebbe apparire DUE volte con:
--   1. Path = '12295.12306.5064', UnitCost = 70, ParentBOMId = 18677
--   2. Path = '12295.12307.5064', UnitCost = 100, ParentBOMId = 18678
*/

GO

-- ============================================================================
-- RIEPILOGO MODIFICHE
-- ============================================================================

PRINT ''
PRINT '============================================================================'
PRINT 'RIEPILOGO DELLE DUE MODIFICHE DA APPLICARE'
PRINT '============================================================================'
PRINT ''
PRINT 'MODIFICA 1: Clausola NOT EXISTS (~riga 1542-1543)'
PRINT '  VECCHIO: WHERE t2.ComponentId = comp.ComponentId AND t2.Path LIKE t.Path + ''%'''
PRINT '  NUOVO:   WHERE t2.ComponentId = comp.ComponentId'
PRINT '           AND t2.BOMId = t.BOMId'
PRINT '           AND t2.ParentBOMId = t.ParentBOMId'
PRINT '           AND t2.Line = comp.Line'
PRINT ''
PRINT 'MODIFICA 2: Debug Output (~riga 1758-1765)'
PRINT '  AGGIUNGERE dopo CalculatedTotalCost:'
PRINT '    exp.Path,'
PRINT '    exp.ParentBOMId'
PRINT ''
PRINT '============================================================================'

GO
