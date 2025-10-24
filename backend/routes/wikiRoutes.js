const express = require("express");
const router = express.Router();
const wikiManagement = require("../queries/wikiManagement");

/**
 * GET /api/wiki/components/page/:pageId
 * Ottiene tutti i componenti di una pagina specifica
 */
router.get("/components/page/:pageId", async (req, res) => {
  try {
    const { pageId } = req.params;
    const components = await wikiManagement.getPageComponents(parseInt(pageId));
    res.json(components);
  } catch (error) {
    console.error("Error getting page components:", error);
    res.status(500).json({ error: "Errore nel recupero dei componenti" });
  }
});

/**
 * GET /api/wiki/components/all
 * Ottiene tutti i componenti di tutte le pagine
 */
router.get("/components/all", async (req, res) => {
  try {
    const components = await wikiManagement.getAllComponents();
    res.json(components);
  } catch (error) {
    console.error("Error getting all components:", error);
    res.status(500).json({ error: "Errore nel recupero dei componenti" });
  }
});

/**
 * GET /api/wiki/components/:componentId
 * Ottiene un singolo componente per ID
 */
router.get("/components/:componentId", async (req, res) => {
  try {
    const { componentId } = req.params;
    const components = await wikiManagement.getAllComponents();
    const component = components.find(c => c.componentId === parseInt(componentId));

    if (!component) {
      return res.status(404).json({ error: "Componente non trovato" });
    }

    res.json(component);
  } catch (error) {
    console.error("Error getting component:", error);
    res.status(500).json({ error: "Errore nel recupero del componente" });
  }
});

/**
 * GET /api/wiki/resolve/:pageId/:componentKey?
 * Risolve l'URL wiki per una pagina e (opzionalmente) un componente
 */
router.get("/resolve/:pageId/:componentKey?", async (req, res) => {
  try {
    const { pageId, componentKey } = req.params;
    const wikiInfo = await wikiManagement.resolveWikiUrl(
      parseInt(pageId),
      componentKey || null
    );

    if (!wikiInfo) {
      return res.status(404).json({
        error: "Nessuna documentazione wiki trovata per questa pagina"
      });
    }

    res.json(wikiInfo);
  } catch (error) {
    console.error("Error resolving wiki URL:", error);
    res.status(500).json({ error: "Errore nella risoluzione dell'URL wiki" });
  }
});

/**
 * GET /api/wiki/components/page/:pageId/available-parents/:componentId?
 * Ottiene i componenti disponibili come parent per una pagina
 */
router.get("/components/page/:pageId/available-parents/:componentId?", async (req, res) => {
  try {
    const { pageId, componentId } = req.params;
    const parents = await wikiManagement.getAvailableParents(
      parseInt(pageId),
      componentId ? parseInt(componentId) : null
    );
    res.json(parents);
  } catch (error) {
    console.error("Error getting available parents:", error);
    res.status(500).json({ error: "Errore nel recupero dei parent disponibili" });
  }
});

/**
 * POST /api/wiki/components
 * Crea un nuovo componente
 */
router.post("/components", async (req, res) => {
  try {
    const component = await wikiManagement.createComponent(req.body);
    res.status(201).json(component);
  } catch (error) {
    console.error("Error creating component:", error);
    if (error.message && error.message.includes("UNIQUE")) {
      res.status(400).json({
        error: "Esiste già un componente con questa chiave per questa pagina"
      });
    } else {
      res.status(500).json({ error: "Errore nella creazione del componente" });
    }
  }
});

/**
 * PUT /api/wiki/components/:componentId
 * Aggiorna un componente esistente
 */
router.put("/components/:componentId", async (req, res) => {
  try {
    const { componentId } = req.params;
    const component = await wikiManagement.updateComponent(
      parseInt(componentId),
      req.body
    );

    if (!component) {
      return res.status(404).json({ error: "Componente non trovato" });
    }

    res.json(component);
  } catch (error) {
    console.error("Error updating component:", error);
    if (error.message && error.message.includes("UNIQUE")) {
      res.status(400).json({
        error: "Esiste già un componente con questa chiave per questa pagina"
      });
    } else {
      res.status(500).json({ error: "Errore nell'aggiornamento del componente" });
    }
  }
});

/**
 * DELETE /api/wiki/components/:componentId
 * Elimina un componente (e tutti i suoi figli ricorsivamente)
 */
router.delete("/components/:componentId", async (req, res) => {
  try {
    const { componentId } = req.params;
    await wikiManagement.deleteComponent(parseInt(componentId));
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting component:", error);
    res.status(500).json({ error: "Errore nell'eliminazione del componente" });
  }
});

module.exports = router;
