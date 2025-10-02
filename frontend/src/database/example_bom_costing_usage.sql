-- =============================================
-- ESEMPI DI UTILIZZO DELLA STORED PROCEDURE AGGIORNATA
-- =============================================

-- 1. INIZIALIZZA I PARAMETRI
EXEC SP_InitializeBOMCostingParameters @CompanyId = 1;

-- 2. CALCOLO CON AGGIORNAMENTO DEL RECORD BOM (default)
DECLARE @BOMId BIGINT = 1; -- Sostituisci con l'ID della tua BOM
EXEC SP_CalculateBOMCosting 
    @CompanyId = 1,
    @BOMId = @BOMId,
    @OrderQuantity = 100,
    @ScrapPercentage = NULL,
    @UseGranularMarkups = 1,
    @UpdateBOMRecord = 1, -- Aggiorna il record BOM
    @Debug = 1;

-- 3. SOLO CALCOLO SENZA AGGIORNAMENTO
EXEC SP_CalculateBOMCosting 
    @CompanyId = 1,
    @BOMId = @BOMId,
    @OrderQuantity = 100,
    @ScrapPercentage = NULL,
    @UseGranularMarkups = 1,
    @UpdateBOMRecord = 0, -- NON aggiorna il record BOM
    @Debug = 1;

-- 4. BATCH CALCULATION CON AGGIORNAMENTO
EXEC SP_BatchCalculateBOMCosting 
    @CompanyId = 1,
    @BOMIds = '1,2,3', -- Lista di BOM IDs
    @OrderQuantity = 100,
    @ScrapPercentage = NULL,
    @UpdateBOMRecord = 1; -- Aggiorna tutti i record

-- 5. VERIFICA I RISULTATI NEL RECORD BOM
SELECT 
    Id,
    BOM,
    Description,
    ProductionLot,
    RMCost,
    ProcessingCost,
    RMRefillCost,
    ProcessingRefillCost,
    TotalCost,
    TotalPrice,
    RefillWaste,
    RefillDiscount,
    TotalRefill,
    TransportRefill,
    Details, -- JSON con dettagli
    Notes    -- Note con riferimenti
FROM MA_ProjectArticles_BillOfMaterials 
WHERE CompanyId = 1 AND Id = @BOMId;

-- 6. PARSING DEL JSON DAI DETTAGLI
SELECT 
    Id,
    BOM,
    JSON_VALUE(Details, '$.prezzo') as Prezzo,
    JSON_VALUE(Details, '$.costo_mp') as CostoMP,
    JSON_VALUE(Details, '$.costo_ope') as CostoOPE,
    JSON_VALUE(Details, '$.costi_fissi') as CostiFissi,
    JSON_VALUE(Details, '$.ricarico_mp') as RicaricoMP,
    JSON_VALUE(Details, '$.ricarico_op') as RicaricoOPE,
    JSON_VALUE(Details, '$.ricarico_tr') as RicaricoTrasporto,
    JSON_VALUE(Details, '$.costo_totale') as CostoTotale,
    JSON_VALUE(Details, '$.ricarico_scarto') as RicaricoScarto,
    JSON_VALUE(Details, '$.ricarico_sconto') as RicaricoSconto,
    JSON_VALUE(Details, '$.ricarico_totale') as RicaricoTotale,
    Notes
FROM MA_ProjectArticles_BillOfMaterials 
WHERE CompanyId = 1 AND Details IS NOT NULL;
