-- =============================================================================
-- FIX: MA_ProjectArticles_SyncIntercompanySharing - Componenti Temporanei
-- =============================================================================
-- Creato: 2025-01-16
-- Descrizione: Aggiorna la sezione COMPONENTI DI ACQUISTO INTERCOMPANY della
--              stored procedure MA_ProjectArticles_SyncIntercompanySharing
--              per considerare anche i componenti temporanei con TempSupplierId
-- Problema: La sync crea 0 references perché considera solo componenti già
--           presenti nel gestionale, ignorando i temporanei
-- Soluzione: Usare fn_GetComponentSupplier per logica duale
-- =============================================================================

USE [WebApp]
GO

-- =============================================================================
-- SEZIONE DA SOSTITUIRE: Componenti di Acquisto Intercompany
-- =============================================================================
-- Trovare la riga ~5352 nella stored procedure MA_ProjectArticles_SyncIntercompanySharing:
--   -- A) COMPONENTI DI ACQUISTO INTERCOMPANY
-- E sostituire l'intera query INSERT INTO @IntercompanyComponents con questa:
-- =============================================================================

/*

-- A) COMPONENTI DI ACQUISTO INTERCOMPANY
-- VERSIONE AGGIORNATA: Usa fn_GetComponentSupplier per logica duale
INSERT INTO @IntercompanyComponents (
    ComponentId, ComponentCode, ComponentDescription, TargetCompanyId,
    TargetCompanyName, IntercompanyType, SupplierCode, Nature, ExistingReferenceId
)
SELECT DISTINCT
    comp.ComponentId,
    item.Item,
    item.Description,
    -- USA LA FUNZIONE per ottenere IntercompanyTargetId
    supplier.IntercompanyTargetId,
    targetComp.Description AS CompanyName,
    'ACQUISTO',
    supplier.SupplierId AS CustSupp,
    item.Nature,
    ref.ReferenceID
FROM dbo.MA_ProjectArticles_BOMComponents comp
INNER JOIN dbo.MA_ProjectArticles_Items item
    ON comp.ComponentId = item.Id
    AND comp.CompanyId = item.CompanyId

-- USA LA FUNZIONE per ottenere il fornitore (gestionale o temporaneo)
CROSS APPLY dbo.fn_GetComponentSupplier(item.Id, item.CompanyId) supplier

-- Join per ottenere il nome dell'azienda target
LEFT JOIN dbo.AR_Companies targetComp
    ON supplier.IntercompanyTargetId = targetComp.CompanyId

-- Verifica se esiste già una reference
LEFT JOIN dbo.MA_ProjectArticles_References ref
    ON ref.SourceProjectItemId = comp.ComponentId
    AND ref.SourceCompanyId = @CompanyId
    AND ref.TargetCompanyId = supplier.IntercompanyTargetId

WHERE
    comp.BOMId = @BOMId
    AND comp.CompanyId = @CompanyId
    AND item.Nature = 22413314  -- Natura = Acquisto
    AND supplier.IntercompanyTargetId IS NOT NULL;  -- Solo Intercompany

*/

-- =============================================================================
-- BENEFICI DELLA MODIFICA
-- =============================================================================
-- 1. Considera ENTRAMBI i tipi di componenti:
--    - Componenti già nel gestionale (dati da MA_Items, MA_ItemsGoodsData, MA_ItemSuppliers)
--    - Componenti temporanei (dati da TempSupplierId, TempIntercompanyTargetId)
--
-- 2. Logica centralizzata in fn_GetComponentSupplier:
--    - Se esiste nel gestionale → usa quei dati
--    - Se è solo temporaneo → usa TempSupplierId e TempIntercompanyTargetId
--
-- 3. Query molto più semplice e manutenibile
--
-- 4. La sezione B) CONTO LAVORO non necessita modifiche perché usa i cicli
--    che sono già nel gestionale
-- =============================================================================

-- =============================================================================
-- CONFRONTO: Prima e Dopo
-- =============================================================================

PRINT '=============================================================================';
PRINT 'PRIMA (query originale):';
PRINT '=============================================================================';
PRINT 'LEFT JOIN dbo.MA_Items maItem';
PRINT '    ON item.Item = maItem.Item';
PRINT '    AND item.CompanyId = maItem.CompanyId';
PRINT 'LEFT JOIN dbo.MA_ItemsGoodsData goodsData ...';
PRINT 'LEFT JOIN dbo.MA_ItemSuppliers itemSupp ...';
PRINT 'LEFT JOIN dbo.MA_CustSupp cs ...';
PRINT 'WHERE ... AND maItem.Nature = 22413314  -- PROBLEMA: solo gestionale!';
PRINT '      AND cs.IntercompanyId IS NOT NULL';
PRINT '';
PRINT '=============================================================================';
PRINT 'DOPO (query aggiornata):';
PRINT '=============================================================================';
PRINT 'CROSS APPLY dbo.fn_GetComponentSupplier(item.Id, item.CompanyId) supplier';
PRINT 'WHERE ... AND item.Nature = 22413314  -- Verifica sulla tabella corretta';
PRINT '      AND supplier.IntercompanyTargetId IS NOT NULL  -- Gestionale O temporaneo';
PRINT '';
PRINT '=============================================================================';
PRINT 'La funzione fn_GetComponentSupplier restituisce:';
PRINT '- SupplierId: dal gestionale o da TempSupplierId';
PRINT '- IntercompanyTargetId: dal gestionale o da TempIntercompanyTargetId';
PRINT '- SupplierName: nome del fornitore';
PRINT '- IntercompanyTargetName: nome azienda target';
PRINT '- DataSource: ''GESTIONALE'' o ''TEMPORANEO''';
PRINT '=============================================================================';
GO

-- =============================================================================
-- ISTRUZIONI PER L'APPLICAZIONE
-- =============================================================================
-- 1. Apri SQL Server Management Studio
-- 2. Connettiti al database WebApp
-- 3. Trova e apri la stored procedure MA_ProjectArticles_SyncIntercompanySharing
-- 4. Cerca la sezione (circa riga 5352):
--    -- A) COMPONENTI DI ACQUISTO INTERCOMPANY
--    INSERT INTO @IntercompanyComponents ...
-- 5. Sostituisci la query INSERT con la versione commentata qui sopra
-- 6. Esegui ALTER PROCEDURE per salvare
-- 7. Testa con lo script TEST_SyncIntercompany.sql
-- =============================================================================

PRINT '';
PRINT 'Script preparato per il fix di MA_ProjectArticles_SyncIntercompanySharing';
PRINT 'Sostituire la sezione A) COMPONENTI DI ACQUISTO INTERCOMPANY';
PRINT 'con la versione modificata che usa fn_GetComponentSupplier';
GO
