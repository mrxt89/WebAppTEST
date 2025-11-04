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
        error: "Questa pagina wiki è già collegata a questa pagina dell'applicazione"
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
        error: "Questa pagina wiki è già collegata a questa pagina dell'applicazione"
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

/**
 * GET /api/wiki/pages
 * Ottiene tutte le pagine wiki dal database WikiJS
 */
router.get("/pages", async (req, res) => {
  try {
    const wikiPages = await wikiManagement.getAllWikiPages();
    res.json(wikiPages);
  } catch (error) {
    console.error("Error getting wiki pages:", error);
    res.status(500).json({ error: "Errore nel recupero delle pagine wiki" });
  }
});

/**
 * GET /api/wiki/pages/:wikiPageId/path
 * Ottiene il path di una pagina wiki dato il suo ID
 */
router.get("/pages/:wikiPageId/path", async (req, res) => {
  try {
    const { wikiPageId } = req.params;
    const wikiPage = await wikiManagement.getWikiPagePath(parseInt(wikiPageId));

    if (!wikiPage) {
      return res.status(404).json({ error: "Pagina wiki non trovata" });
    }

    res.json(wikiPage);
  } catch (error) {
    console.error("Error getting wiki page path:", error);
    res.status(500).json({ error: "Errore nel recupero del path della pagina wiki" });
  }
});

/**
 * GET /api/wiki/pages/route/:route
 * Ottiene una pagina AR_Pages tramite route
 */
router.get("/pages/route/:route(*)", async (req, res) => {
  try {
    const { route } = req.params;
    // Decodifica la route (potrebbe contenere caratteri speciali)
    const decodedRoute = decodeURIComponent(route);
    // Aggiungi slash iniziale se non presente (Express lo consuma nel pattern)
    const normalizedRoute = decodedRoute.startsWith('/') ? decodedRoute : `/${decodedRoute}`;
    console.log('[wikiRoutes] Original route:', route, '| Decoded:', decodedRoute, '| Normalized:', normalizedRoute);
    const page = await wikiManagement.getPageByRoute(normalizedRoute);

    if (!page) {
      return res.status(404).json({ error: "Pagina non trovata per questa route" });
    }

    res.json(page);
  } catch (error) {
    console.error("Error getting page by route:", error);
    res.status(500).json({ error: "Errore nel recupero della pagina per route" });
  }
});

module.exports = router;
