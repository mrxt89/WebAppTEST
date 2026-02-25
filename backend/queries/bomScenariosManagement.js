const sql = require('mssql');
const config = require('../config');

// =============================================
// GET
// =============================================

/**
 * Restituisce tutti gli scenari di un BOMId specifico.
 */
const getScenariosByBOM = async (companyId, bomId) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('CompanyId', sql.Int,    companyId)
            .input('BOMId',     sql.BigInt, bomId)
            .query(`
                SELECT Id, CompanyId, BOMId, Title, Description, CreatedBy, CreatedAt
                FROM dbo.MA_BOM_Scenarios
                WHERE CompanyId = @CompanyId AND BOMId = @BOMId
                ORDER BY CreatedAt DESC
            `);
        return result.recordset;
    } catch (err) {
        console.error('Error in getScenariosByBOM:', err);
        throw err;
    }
};

/**
 * Restituisce lo scenario con tutte le righe di override (componenti + routing).
 * Ritorna null se non trovato o non appartiene all'azienda.
 */
const getScenarioWithDetails = async (companyId, scenarioId) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('CompanyId',  sql.Int,    companyId)
            .input('ScenarioId', sql.BigInt, scenarioId)
            .query(`
                SELECT Id, CompanyId, BOMId, Title, Description, CreatedBy, CreatedAt, PathsSnapshot
                FROM dbo.MA_BOM_Scenarios
                WHERE CompanyId = @CompanyId AND Id = @ScenarioId;

                SELECT Id, ScenarioId, CompanyId, RowType,
                       AncestralPath, BOMId_Rt, RtgStep,
                       Quantity_Sc, UnitCost_Sc, FixedCost_Sc, IsBuy,
                       ProcessingTime_Sc, SetupTime_Sc, Qty_Sc,
                       Notes, ModifiedAt
                FROM dbo.MA_BOM_ScenarioDetails
                WHERE ScenarioId = @ScenarioId
                ORDER BY RowType, AncestralPath, BOMId_Rt, RtgStep;
            `);

        const scenario = result.recordsets[0][0];
        if (!scenario) return null;

        scenario.details = result.recordsets[1];
        return scenario;
    } catch (err) {
        console.error('Error in getScenarioWithDetails:', err);
        throw err;
    }
};

// =============================================
// CREATE / UPDATE / DELETE — SCENARIO HEADER
// =============================================

/**
 * Crea un nuovo scenario per un BOMId.
 * @param {string|null} pathsSnapshot  JSON array dei Path della BOM al momento della creazione.
 */
const createScenario = async (companyId, userId, bomId, title, description, pathsSnapshot) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('CompanyId',     sql.Int,               companyId)
            .input('BOMId',         sql.BigInt,            bomId)
            .input('Title',         sql.NVarChar(200),     title)
            .input('Description',   sql.NVarChar(sql.MAX), description || null)
            .input('CreatedBy',     sql.Int,               userId)
            .input('PathsSnapshot', sql.NVarChar(sql.MAX), pathsSnapshot || null)
            .query(`
                INSERT INTO dbo.MA_BOM_Scenarios
                    (CompanyId, BOMId, Title, Description, CreatedBy, PathsSnapshot)
                OUTPUT INSERTED.Id, INSERTED.CompanyId, INSERTED.BOMId, INSERTED.Title,
                       INSERTED.Description, INSERTED.CreatedBy, INSERTED.CreatedAt,
                       INSERTED.PathsSnapshot
                VALUES (@CompanyId, @BOMId, @Title, @Description, @CreatedBy, @PathsSnapshot)
            `);
        return { success: 1, scenario: result.recordset[0] };
    } catch (err) {
        console.error('Error in createScenario:', err);
        throw err;
    }
};

/**
 * Aggiorna il titolo e la descrizione dello scenario.
 */
const updateScenario = async (companyId, scenarioId, title, description) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('CompanyId',   sql.Int,               companyId)
            .input('ScenarioId',  sql.BigInt,             scenarioId)
            .input('Title',       sql.NVarChar(200),      title)
            .input('Description', sql.NVarChar(sql.MAX),  description || null)
            .query(`
                UPDATE dbo.MA_BOM_Scenarios
                SET Title = @Title, Description = @Description
                WHERE CompanyId = @CompanyId AND Id = @ScenarioId
            `);

        if (result.rowsAffected[0] === 0) {
            return { success: 0, msg: 'Scenario non trovato' };
        }
        return { success: 1, msg: 'Scenario aggiornato' };
    } catch (err) {
        console.error('Error in updateScenario:', err);
        throw err;
    }
};

/**
 * Elimina uno scenario (le righe di dettaglio vengono eliminate
 * in cascata via FK ON DELETE CASCADE).
 */
const deleteScenario = async (companyId, scenarioId) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('CompanyId',  sql.Int,    companyId)
            .input('ScenarioId', sql.BigInt, scenarioId)
            .query(`
                DELETE FROM dbo.MA_BOM_Scenarios
                WHERE CompanyId = @CompanyId AND Id = @ScenarioId
            `);

        if (result.rowsAffected[0] === 0) {
            return { success: 0, msg: 'Scenario non trovato' };
        }
        return { success: 1, msg: 'Scenario eliminato' };
    } catch (err) {
        console.error('Error in deleteScenario:', err);
        throw err;
    }
};

// =============================================
// UPSERT / DELETE — DETTAGLIO OVERRIDE
// =============================================

/**
 * Salva (INSERT o UPDATE) un override di componente o di routing.
 *
 * Logica auto-clean: se tutti i valori di override sono NULL/default,
 * la riga di dettaglio viene eliminata anziché aggiornata
 * (COALESCE restituirebbe comunque il valore ufficiale, ma è meglio tenere
 * il DB pulito).
 *
 * @param {number}  companyId
 * @param {number}  scenarioId
 * @param {object}  detail
 *   RowType = 'C':  AncestralPath, Quantity_Sc, UnitCost_Sc, FixedCost_Sc, IsBuy, Notes
 *   RowType = 'R':  BOMId_Rt, RtgStep, ProcessingTime_Sc, SetupTime_Sc, Qty_Sc, Notes
 */
const upsertScenarioDetail = async (companyId, scenarioId, detail) => {
    const {
        RowType,
        // Component
        AncestralPath = null,
        Quantity_Sc   = null,
        UnitCost_Sc   = null,
        FixedCost_Sc  = null,
        IsBuy         = false,
        // Routing
        BOMId_Rt          = null,
        RtgStep           = null,
        ProcessingTime_Sc = null,
        SetupTime_Sc      = null,
        Qty_Sc            = null,
        // Common
        Notes = null,
    } = detail;

    // Auto-clean: nessun override effettivo → elimina la riga se esiste
    const isEmptyComponent = RowType === 'C'
        && Quantity_Sc   === null
        && UnitCost_Sc   === null
        && FixedCost_Sc  === null
        && !IsBuy
        && !Notes;

    const isEmptyRouting = RowType === 'R'
        && ProcessingTime_Sc === null
        && SetupTime_Sc      === null
        && Qty_Sc            === null
        && !Notes;

    try {
        const pool = await sql.connect(config.database);

        if (RowType === 'C') {
            if (isEmptyComponent) {
                await pool.request()
                    .input('ScenarioId',    sql.BigInt,       scenarioId)
                    .input('AncestralPath', sql.NVarChar(500), AncestralPath)
                    .query(`
                        DELETE FROM dbo.MA_BOM_ScenarioDetails
                        WHERE ScenarioId = @ScenarioId AND AncestralPath = @AncestralPath
                    `);
                return { success: 1, detail: null, msg: 'Override rimosso (nessun valore modificato)' };
            }

            const result = await pool.request()
                .input('CompanyId',     sql.Int,            companyId)
                .input('ScenarioId',    sql.BigInt,         scenarioId)
                .input('AncestralPath', sql.NVarChar(500),  AncestralPath)
                .input('Quantity_Sc',   sql.Decimal(18, 5), Quantity_Sc)
                .input('UnitCost_Sc',   sql.Float,          UnitCost_Sc)
                .input('FixedCost_Sc',  sql.Float,          FixedCost_Sc)
                .input('IsBuy',         sql.Bit,            IsBuy ? 1 : 0)
                .input('Notes',         sql.NVarChar(sql.MAX), Notes)
                .query(`
                    MERGE dbo.MA_BOM_ScenarioDetails AS tgt
                    USING (
                        SELECT @ScenarioId    AS ScenarioId,
                               @AncestralPath AS AncestralPath
                        WHERE EXISTS (
                            SELECT 1 FROM dbo.MA_BOM_Scenarios
                            WHERE Id = @ScenarioId AND CompanyId = @CompanyId
                        )
                    ) AS src
                        ON tgt.ScenarioId = src.ScenarioId
                       AND tgt.AncestralPath = src.AncestralPath
                    WHEN MATCHED THEN
                        UPDATE SET
                            Quantity_Sc  = @Quantity_Sc,
                            UnitCost_Sc  = @UnitCost_Sc,
                            FixedCost_Sc = @FixedCost_Sc,
                            IsBuy        = @IsBuy,
                            Notes        = @Notes,
                            ModifiedAt   = GETDATE()
                    WHEN NOT MATCHED THEN
                        INSERT (ScenarioId, CompanyId, RowType, AncestralPath,
                                Quantity_Sc, UnitCost_Sc, FixedCost_Sc, IsBuy, Notes)
                        VALUES (@ScenarioId, @CompanyId, 'C', @AncestralPath,
                                @Quantity_Sc, @UnitCost_Sc, @FixedCost_Sc, @IsBuy, @Notes)
                    OUTPUT INSERTED.*;
                `);
            return { success: 1, detail: result.recordset[0] || null };

        } else if (RowType === 'R') {
            if (isEmptyRouting) {
                await pool.request()
                    .input('ScenarioId', sql.BigInt,   scenarioId)
                    .input('BOMId_Rt',   sql.BigInt,   BOMId_Rt)
                    .input('RtgStep',    sql.SmallInt, RtgStep)
                    .query(`
                        DELETE FROM dbo.MA_BOM_ScenarioDetails
                        WHERE ScenarioId = @ScenarioId
                          AND BOMId_Rt = @BOMId_Rt
                          AND RtgStep  = @RtgStep
                    `);
                return { success: 1, detail: null, msg: 'Override rimosso (nessun valore modificato)' };
            }

            const result = await pool.request()
                .input('CompanyId',        sql.Int,            companyId)
                .input('ScenarioId',       sql.BigInt,         scenarioId)
                .input('BOMId_Rt',         sql.BigInt,         BOMId_Rt)
                .input('RtgStep',          sql.SmallInt,       RtgStep)
                .input('ProcessingTime_Sc', sql.Int,           ProcessingTime_Sc)
                .input('SetupTime_Sc',     sql.Int,            SetupTime_Sc)
                .input('Qty_Sc',           sql.Float,          Qty_Sc)
                .input('Notes',            sql.NVarChar(sql.MAX), Notes)
                .query(`
                    MERGE dbo.MA_BOM_ScenarioDetails AS tgt
                    USING (
                        SELECT @ScenarioId AS ScenarioId,
                               @BOMId_Rt   AS BOMId_Rt,
                               @RtgStep    AS RtgStep
                        WHERE EXISTS (
                            SELECT 1 FROM dbo.MA_BOM_Scenarios
                            WHERE Id = @ScenarioId AND CompanyId = @CompanyId
                        )
                    ) AS src
                        ON tgt.ScenarioId = src.ScenarioId
                       AND tgt.BOMId_Rt   = src.BOMId_Rt
                       AND tgt.RtgStep    = src.RtgStep
                    WHEN MATCHED THEN
                        UPDATE SET
                            ProcessingTime_Sc = @ProcessingTime_Sc,
                            SetupTime_Sc      = @SetupTime_Sc,
                            Qty_Sc            = @Qty_Sc,
                            Notes             = @Notes,
                            ModifiedAt        = GETDATE()
                    WHEN NOT MATCHED THEN
                        INSERT (ScenarioId, CompanyId, RowType, BOMId_Rt, RtgStep,
                                ProcessingTime_Sc, SetupTime_Sc, Qty_Sc, Notes)
                        VALUES (@ScenarioId, @CompanyId, 'R', @BOMId_Rt, @RtgStep,
                                @ProcessingTime_Sc, @SetupTime_Sc, @Qty_Sc, @Notes)
                    OUTPUT INSERTED.*;
                `);
            return { success: 1, detail: result.recordset[0] || null };
        }

        return { success: 0, msg: 'RowType non valido (usa C o R)' };
    } catch (err) {
        console.error('Error in upsertScenarioDetail:', err);
        throw err;
    }
};

/**
 * Elimina un singolo override per Id.
 * Il JOIN su MA_BOM_Scenarios garantisce l'isolamento per CompanyId.
 */
const deleteScenarioDetail = async (companyId, scenarioId, detailId) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('CompanyId',  sql.Int,    companyId)
            .input('ScenarioId', sql.BigInt, scenarioId)
            .input('DetailId',   sql.BigInt, detailId)
            .query(`
                DELETE sd
                FROM dbo.MA_BOM_ScenarioDetails sd
                JOIN dbo.MA_BOM_Scenarios s
                    ON s.Id = sd.ScenarioId AND s.CompanyId = @CompanyId
                WHERE sd.Id = @DetailId AND sd.ScenarioId = @ScenarioId
            `);

        if (result.rowsAffected[0] === 0) {
            return { success: 0, msg: 'Override non trovato' };
        }
        return { success: 1, msg: 'Override eliminato' };
    } catch (err) {
        console.error('Error in deleteScenarioDetail:', err);
        throw err;
    }
};

// =============================================
// CALCOLO COSTO SCENARIO
// =============================================

/**
 * Calcola la costificazione BOM applicando gli override dello scenario.
 * Chiama SP_CalculateBOMCosting con @ScenarioId.
 * UpdateBOMRecord è sempre 0: il calcolo scenario non sovrascrive la BOM ufficiale.
 */
const calculateScenarioCost = async (companyId, bomId, scenarioId, options = {}) => {
    const {
        orderQuantity   = null,
        scrapPercentage = null,
        useKnownData    = true,
        debug           = false,
    } = options;

    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('CompanyId',       sql.Int,           companyId)
            .input('BOMId',           sql.BigInt,        bomId)
            .input('OrderQuantity',   sql.Decimal(18, 5), orderQuantity)
            .input('ScrapPercentage', sql.Float,         scrapPercentage)
            .input('UseKnownData',    sql.Bit,           useKnownData ? 1 : 0)
            .input('UpdateBOMRecord', sql.Bit,           0)
            .input('Debug',           sql.Bit,           debug ? 1 : 0)
            .input('ScenarioId',      sql.BigInt,        scenarioId)
            .execute('SP_CalculateBOMCosting');

        return { success: 1, result: result.recordset[0] || null };
    } catch (err) {
        console.error('Error in calculateScenarioCost:', err);
        throw err;
    }
};

module.exports = {
    getScenariosByBOM,
    getScenarioWithDetails,
    createScenario,
    updateScenario,
    deleteScenario,
    upsertScenarioDetail,
    deleteScenarioDetail,
    calculateScenarioCost,
};
