-- =============================================
-- CLEANUP BOM COSTING PARAMETERS
-- Rimuove parametri non necessari e mantiene solo quelli essenziali
-- =============================================

USE [WebAppTEST]
GO

-- ========================================
-- 1. RIMUOVI PARAMETRI NON NECESSARI
-- ========================================

-- Rimuovi parametri che non servono per la costificazione base
DELETE FROM MA_BOMCostingParameters 
WHERE CompanyId IN (SELECT CompanyId FROM MA_Companies)
AND ParameterName NOT IN (
    -- Parametri di ricarico essenziali
    'RICARICO_MP',
    'RICARICO_OPE', 
    'RICARICO_TRASPORTO',
    'RICARICO_SCARTO',
    'RICARICO_TOTALE',
    'RICARICO_SCONTO',
    
    -- Parametri base essenziali
    'COSTO_ORARIO_STANDARD',
    'SCARTO_PERCENTUALE_DEFAULT',
    'LOTTO_PRODUZIONE_DEFAULT',
    'USO_DATI_NOTI',
    'USO_RICARICHI_GRANULARI'
);

-- ========================================
-- 2. AGGIORNA DESCRIZIONI PARAMETRI
-- ========================================

UPDATE MA_BOMCostingParameters 
SET Description = 'Ricarico percentuale su materia prima (%)'
WHERE ParameterName = 'RICARICO_MP';

UPDATE MA_BOMCostingParameters 
SET Description = 'Ricarico percentuale su operazioni (%)'
WHERE ParameterName = 'RICARICO_OPE';

UPDATE MA_BOMCostingParameters 
SET Description = 'Ricarico percentuale su trasporto (%)'
WHERE ParameterName = 'RICARICO_TRASPORTO';

UPDATE MA_BOMCostingParameters 
SET Description = 'Ricarico percentuale su scarto (%)'
WHERE ParameterName = 'RICARICO_SCARTO';

UPDATE MA_BOMCostingParameters 
SET Description = 'Ricarico percentuale totale (%)'
WHERE ParameterName = 'RICARICO_TOTALE';

UPDATE MA_BOMCostingParameters 
SET Description = 'Ricarico percentuale sconto (%)'
WHERE ParameterName = 'RICARICO_SCONTO';

-- ========================================
-- 3. IMPOSTA VALORI DEFAULT SE MANCANTI
-- ========================================

-- Inserisci parametri mancanti con valori default
INSERT INTO MA_BOMCostingParameters (CompanyId, ParameterName, ParameterValue, Description, IsActive, TBCreated, TBModified)
SELECT 
    c.CompanyId,
    'RICARICO_MP',
    0.15, -- 15%
    'Ricarico percentuale su materia prima (%)',
    1,
    GETDATE(),
    GETDATE()
FROM MA_Companies c
WHERE NOT EXISTS (
    SELECT 1 FROM MA_BOMCostingParameters p 
    WHERE p.CompanyId = c.CompanyId AND p.ParameterName = 'RICARICO_MP'
);

INSERT INTO MA_BOMCostingParameters (CompanyId, ParameterName, ParameterValue, Description, IsActive, TBCreated, TBModified)
SELECT 
    c.CompanyId,
    'RICARICO_OPE',
    0.20, -- 20%
    'Ricarico percentuale su operazioni (%)',
    1,
    GETDATE(),
    GETDATE()
FROM MA_Companies c
WHERE NOT EXISTS (
    SELECT 1 FROM MA_BOMCostingParameters p 
    WHERE p.CompanyId = c.CompanyId AND p.ParameterName = 'RICARICO_OPE'
);

INSERT INTO MA_BOMCostingParameters (CompanyId, ParameterName, ParameterValue, Description, IsActive, TBCreated, TBModified)
SELECT 
    c.CompanyId,
    'RICARICO_TRASPORTO',
    0.05, -- 5%
    'Ricarico percentuale su trasporto (%)',
    1,
    GETDATE(),
    GETDATE()
FROM MA_Companies c
WHERE NOT EXISTS (
    SELECT 1 FROM MA_BOMCostingParameters p 
    WHERE p.CompanyId = c.CompanyId AND p.ParameterName = 'RICARICO_TRASPORTO'
);

INSERT INTO MA_BOMCostingParameters (CompanyId, ParameterName, ParameterValue, Description, IsActive, TBCreated, TBModified)
SELECT 
    c.CompanyId,
    'RICARICO_SCARTO',
    0.10, -- 10%
    'Ricarico percentuale su scarto (%)',
    1,
    GETDATE(),
    GETDATE()
FROM MA_Companies c
WHERE NOT EXISTS (
    SELECT 1 FROM MA_BOMCostingParameters p 
    WHERE p.CompanyId = c.CompanyId AND p.ParameterName = 'RICARICO_SCARTO'
);

INSERT INTO MA_BOMCostingParameters (CompanyId, ParameterName, ParameterValue, Description, IsActive, TBCreated, TBModified)
SELECT 
    c.CompanyId,
    'RICARICO_TOTALE',
    0.25, -- 25%
    'Ricarico percentuale totale (%)',
    1,
    GETDATE(),
    GETDATE()
FROM MA_Companies c
WHERE NOT EXISTS (
    SELECT 1 FROM MA_BOMCostingParameters p 
    WHERE p.CompanyId = c.CompanyId AND p.ParameterName = 'RICARICO_TOTALE'
);

INSERT INTO MA_BOMCostingParameters (CompanyId, ParameterName, ParameterValue, Description, IsActive, TBCreated, TBModified)
SELECT 
    c.CompanyId,
    'RICARICO_SCONTO',
    0.00, -- 0%
    'Ricarico percentuale sconto (%)',
    1,
    GETDATE(),
    GETDATE()
FROM MA_Companies c
WHERE NOT EXISTS (
    SELECT 1 FROM MA_BOMCostingParameters p 
    WHERE p.CompanyId = c.CompanyId AND p.ParameterName = 'RICARICO_SCONTO'
);

-- ========================================
-- 4. VERIFICA RISULTATO
-- ========================================

SELECT 
    p.CompanyId,
    c.CompanyName,
    p.ParameterName,
    p.ParameterValue,
    p.Description,
    p.IsActive
FROM MA_BOMCostingParameters p
JOIN MA_Companies c ON p.CompanyId = c.CompanyId
ORDER BY p.CompanyId, p.ParameterName;

PRINT '✅ Parametri BOM Costing puliti e ottimizzati!';
PRINT '';
PRINT 'Parametri mantenuti:';
PRINT '- RICARICO_MP (15%)';
PRINT '- RICARICO_OPE (20%)';
PRINT '- RICARICO_TRASPORTO (5%)';
PRINT '- RICARICO_SCARTO (10%)';
PRINT '- RICARICO_TOTALE (25%)';
PRINT '- RICARICO_SCONTO (0%)';
PRINT '';
PRINT 'Parametri rimossi: tutti gli altri non essenziali';
GO
