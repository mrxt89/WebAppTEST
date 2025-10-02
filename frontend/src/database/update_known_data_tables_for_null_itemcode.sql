-- =============================================
-- Script per aggiornare le tabelle dei dati noti
-- per permettere ItemCode NULL
-- =============================================

-- Aggiorna la tabella MA_BOMCostingKnownData
ALTER TABLE MA_BOMCostingKnownData 
ALTER COLUMN ItemCode VARCHAR(64) NULL;

-- Aggiorna la tabella MA_BOMCostingFormulas
ALTER TABLE MA_BOMCostingFormulas 
ALTER COLUMN ItemCode VARCHAR(64) NULL;

-- Aggiorna la tabella MA_BOMCostingMatchingRules
ALTER TABLE MA_BOMCostingMatchingRules 
ALTER COLUMN ItemCode VARCHAR(64) NULL;

PRINT 'Tabelle aggiornate per permettere ItemCode NULL';
