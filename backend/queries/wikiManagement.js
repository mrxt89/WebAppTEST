const sql = require("mssql");
const config = require("../config");

/**
 * Ottiene tutti i componenti di una pagina con struttura gerarchica
 * @param {number} pageId - ID della pagina
 * @returns {Promise<Array>} Array di componenti
 */
async function getPageComponents(pageId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool
      .request()
      .input("pageId", sql.Int, pageId)
      .query(`
        ;WITH ComponentTree AS (
          -- Livello 0: componenti root
          SELECT
            c.componentId,
            c.pageId,
            c.parentComponentId,
            c.componentKey,
            c.componentName,
            c.componentDescription,
            c.wikiSlug,
            c.sequence,
            c.iconName,
            c.isActive,
            0 as level,
            CAST(c.sequence AS VARCHAR(MAX)) as sortPath
          FROM AR_Pages_Components c
          WHERE c.pageId = @pageId AND c.parentComponentId IS NULL

          UNION ALL

          -- Livelli successivi: componenti figli
          SELECT
            c.componentId,
            c.pageId,
            c.parentComponentId,
            c.componentKey,
            c.componentName,
            c.componentDescription,
            c.wikiSlug,
            c.sequence,
            c.iconName,
            c.isActive,
            ct.level + 1,
            ct.sortPath + '.' + CAST(c.sequence AS VARCHAR(MAX))
          FROM AR_Pages_Components c
          JOIN ComponentTree ct ON c.parentComponentId = ct.componentId
          WHERE c.pageId = @pageId
        )
        SELECT
          componentId,
          pageId,
          parentComponentId,
          componentKey,
          componentName,
          componentDescription,
          wikiSlug,
          sequence,
          iconName,
          isActive,
          level
        FROM ComponentTree
        ORDER BY sortPath
      `);

    return result.recordset;
  } catch (error) {
    console.error("Error in getPageComponents:", error);
    throw error;
  }
}

/**
 * Ottiene un componente specifico tramite pageId e componentKey
 * @param {number} pageId - ID della pagina
 * @param {string} componentKey - Chiave del componente
 * @returns {Promise<Object|null>} Componente trovato o null
 */
async function getComponentByKey(pageId, componentKey) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool
      .request()
      .input("pageId", sql.Int, pageId)
      .input("componentKey", sql.NVarChar(100), componentKey)
      .query(`
        SELECT
          componentId,
          pageId,
          parentComponentId,
          componentKey,
          componentName,
          componentDescription,
          wikiSlug,
          sequence,
          iconName,
          isActive
        FROM AR_Pages_Components
        WHERE pageId = @pageId AND componentKey = @componentKey
      `);

    return result.recordset.length > 0 ? result.recordset[0] : null;
  } catch (error) {
    console.error("Error in getComponentByKey:", error);
    throw error;
  }
}

/**
 * Ottiene tutti i componenti di tutte le pagine (per dashboard admin)
 * @returns {Promise<Array>} Array di componenti con info pagina
 */
async function getAllComponents() {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool.request().query(`
      SELECT
        c.componentId,
        c.pageId,
        p.pageName,
        p.pageRoute,
        c.parentComponentId,
        c.componentKey,
        c.componentName,
        c.componentDescription,
        c.wikiSlug,
        c.sequence,
        c.iconName,
        c.isActive
      FROM AR_Pages_Components c
      JOIN AR_Pages p ON c.pageId = p.pageId
      ORDER BY p.pageName, c.sequence
    `);

    return result.recordset;
  } catch (error) {
    console.error("Error in getAllComponents:", error);
    throw error;
  }
}

/**
 * Crea un nuovo componente
 * @param {Object} component - Dati del componente
 * @returns {Promise<Object>} Componente creato
 */
async function createComponent(component) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool
      .request()
      .input("pageId", sql.Int, component.pageId)
      .input("parentComponentId", sql.Int, component.parentComponentId || null)
      .input("componentKey", sql.NVarChar(100), component.componentKey)
      .input("componentName", sql.NVarChar(200), component.componentName)
      .input("componentDescription", sql.NVarChar(500), component.componentDescription || null)
      .input("wikiSlug", sql.NVarChar(500), component.wikiSlug || null)
      .input("sequence", sql.Int, component.sequence || 0)
      .input("iconName", sql.NVarChar(50), component.iconName || null)
      .input("isActive", sql.Bit, component.isActive !== undefined ? component.isActive : 1)
      .query(`
        INSERT INTO AR_Pages_Components (
          pageId,
          parentComponentId,
          componentKey,
          componentName,
          componentDescription,
          wikiSlug,
          sequence,
          iconName,
          isActive
        )
        VALUES (
          @pageId,
          @parentComponentId,
          @componentKey,
          @componentName,
          @componentDescription,
          @wikiSlug,
          @sequence,
          @iconName,
          @isActive
        );

        SELECT
          componentId,
          pageId,
          parentComponentId,
          componentKey,
          componentName,
          componentDescription,
          wikiSlug,
          sequence,
          iconName,
          isActive
        FROM AR_Pages_Components
        WHERE componentId = SCOPE_IDENTITY();
      `);

    return result.recordset[0];
  } catch (error) {
    console.error("Error in createComponent:", error);
    throw error;
  }
}

/**
 * Aggiorna un componente esistente
 * @param {number} componentId - ID del componente
 * @param {Object} component - Nuovi dati del componente
 * @returns {Promise<Object>} Componente aggiornato
 */
async function updateComponent(componentId, component) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const result = await pool
      .request()
      .input("componentId", sql.Int, componentId)
      .input("parentComponentId", sql.Int, component.parentComponentId || null)
      .input("componentKey", sql.NVarChar(100), component.componentKey)
      .input("componentName", sql.NVarChar(200), component.componentName)
      .input("componentDescription", sql.NVarChar(500), component.componentDescription || null)
      .input("wikiSlug", sql.NVarChar(500), component.wikiSlug || null)
      .input("sequence", sql.Int, component.sequence || 0)
      .input("iconName", sql.NVarChar(50), component.iconName || null)
      .input("isActive", sql.Bit, component.isActive !== undefined ? component.isActive : 1)
      .query(`
        UPDATE AR_Pages_Components
        SET
          parentComponentId = @parentComponentId,
          componentKey = @componentKey,
          componentName = @componentName,
          componentDescription = @componentDescription,
          wikiSlug = @wikiSlug,
          sequence = @sequence,
          iconName = @iconName,
          isActive = @isActive
        WHERE componentId = @componentId;

        SELECT
          componentId,
          pageId,
          parentComponentId,
          componentKey,
          componentName,
          componentDescription,
          wikiSlug,
          sequence,
          iconName,
          isActive
        FROM AR_Pages_Components
        WHERE componentId = @componentId;
      `);

    return result.recordset[0];
  } catch (error) {
    console.error("Error in updateComponent:", error);
    throw error;
  }
}

/**
 * Elimina un componente e tutti i suoi figli (ricorsivo tramite CASCADE)
 * @param {number} componentId - ID del componente
 * @returns {Promise<void>}
 */
async function deleteComponent(componentId) {
  try {
    let pool = await sql.connect(config.dbConfig);
    await pool
      .request()
      .input("componentId", sql.Int, componentId)
      .query(`
        DELETE FROM AR_Pages_Components
        WHERE componentId = @componentId
      `);
  } catch (error) {
    console.error("Error in deleteComponent:", error);
    throw error;
  }
}

/**
 * Ottiene i componenti disponibili come parent per una pagina
 * (esclude il componente stesso e i suoi discendenti per evitare loop)
 * @param {number} pageId - ID della pagina
 * @param {number|null} excludeComponentId - ID del componente da escludere
 * @returns {Promise<Array>} Array di componenti disponibili come parent
 */
async function getAvailableParents(pageId, excludeComponentId = null) {
  try {
    let pool = await sql.connect(config.dbConfig);
    const request = pool
      .request()
      .input("pageId", sql.Int, pageId);

    let query = `
      ;WITH ComponentDescendants AS (
        SELECT componentId
        FROM AR_Pages_Components
        WHERE componentId = @excludeComponentId

        UNION ALL

        SELECT c.componentId
        FROM AR_Pages_Components c
        JOIN ComponentDescendants cd ON c.parentComponentId = cd.componentId
      )
      SELECT
        c.componentId,
        c.componentKey,
        c.componentName,
        c.parentComponentId
      FROM AR_Pages_Components c
      WHERE c.pageId = @pageId
    `;

    if (excludeComponentId) {
      request.input("excludeComponentId", sql.Int, excludeComponentId);
      query += `
        AND c.componentId NOT IN (SELECT componentId FROM ComponentDescendants)
      `;
    }

    query += ` ORDER BY c.sequence`;

    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error("Error in getAvailableParents:", error);
    throw error;
  }
}

/**
 * Risolve l'URL wiki completo per una pagina e un componente
 * @param {number} pageId - ID della pagina
 * @param {string|null} componentKey - Chiave del componente (opzionale)
 * @returns {Promise<Object>} Oggetto con wikiSlug e info
 */
async function resolveWikiUrl(pageId, componentKey = null) {
  try {
    let pool = await sql.connect(config.dbConfig);

    if (componentKey) {
      // Cerca il componente specifico
      const component = await getComponentByKey(pageId, componentKey);
      if (component && component.wikiSlug) {
        return {
          wikiSlug: component.wikiSlug,
          source: 'component',
          componentName: component.componentName
        };
      }
    }

    // Fallback: cerca wikiSlug della pagina principale
    const result = await pool
      .request()
      .input("pageId", sql.Int, pageId)
      .query(`
        SELECT wikiSlug, pageName
        FROM AR_Pages
        WHERE pageId = @pageId
      `);

    if (result.recordset.length > 0 && result.recordset[0].wikiSlug) {
      return {
        wikiSlug: result.recordset[0].wikiSlug,
        source: 'page',
        pageName: result.recordset[0].pageName
      };
    }

    return null;
  } catch (error) {
    console.error("Error in resolveWikiUrl:", error);
    throw error;
  }
}

module.exports = {
  getPageComponents,
  getComponentByKey,
  getAllComponents,
  createComponent,
  updateComponent,
  deleteComponent,
  getAvailableParents,
  resolveWikiUrl
};
