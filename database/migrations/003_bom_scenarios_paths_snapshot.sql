-- ============================================================
-- Migration 003 – Aggiunta colonna PathsSnapshot a MA_BOM_Scenarios
-- Salva lo snapshot JSON dei Path (AncestralPath) presenti nella BOM
-- al momento della creazione dello scenario.
-- Usato per rilevare componenti aggiunti/rimossi dopo la creazione.
-- ============================================================

IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.MA_BOM_Scenarios')
      AND name = N'PathsSnapshot'
)
BEGIN
    ALTER TABLE dbo.MA_BOM_Scenarios
    ADD PathsSnapshot NVARCHAR(MAX) NULL;

    PRINT 'Colonna PathsSnapshot aggiunta a MA_BOM_Scenarios.';
END
ELSE
BEGIN
    PRINT 'Colonna PathsSnapshot già presente — migration saltata.';
END
