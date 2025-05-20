/**
 * Builds a tree structure from the BOM component data with proper BOMId propagation
 * @param {Array} components - Array of BOM components
 * @param {Array} routing - Array of BOM routing cycles
 * @returns {Array} - Array of root nodes for the tree
 */
export const buildBOMTree = (components, routing = []) => {
  if (!Array.isArray(components) || components.length === 0) {
    console.warn(
      "buildBOMTree called with invalid or empty components array",
      components,
    );
    return [];
  }

  // Debug ID for tracing function execution
  const debugId = Date.now().toString().slice(-6);
  console.log(
    `[buildTree-${debugId}] Starting tree build with ${components ? components.length : 0} components and ${routing ? routing.length : 0} routing entries`,
  );

  // First, identify all unique BOMIds to create BOM groups
  const bomIds = new Set();
  components.forEach((comp) => {
    if (comp.BOMId) {
      bomIds.add(comp.BOMId);
    }
  });
  console.log(`[buildTree-${debugId}] Detected ${bomIds.size} unique BOMIds`);

  // Create BOM groups indexed by BOMId
  const bomGroups = {};
  bomIds.forEach((bomId) => {
    bomGroups[bomId] = {
      components: components.filter((c) => c.BOMId === bomId),
      cycles: routing.filter((r) => r.BOMId === bomId),
    };
  });

  // Clone components to avoid modifying the original
  const componentsToProcess = JSON.parse(JSON.stringify(components));

  // Normalize data to ensure consistency
  componentsToProcess.forEach((comp) => {
    // Ensure key fields exist
    comp.ComponentId =
      comp.ComponentId ||
      comp.ItemId ||
      `unknown-${Math.random().toString(36).substring(2)}`;
    comp.BOMId = comp.BOMId || null; // Ensure BOMId is available for routing matching
    comp.Line = comp.Line !== undefined ? comp.Line : 0;
    comp.Level = comp.Level !== undefined ? comp.Level : 0;

    // Normalize display fields
    comp.ComponentItemCode = comp.ComponentItemCode || comp.ComponentCode || "";
    comp.ComponentItemDescription =
      comp.ComponentItemDescription ||
      comp.Description ||
      comp.ComponentDescription ||
      "";

    // Generate Path if missing
    if (!comp.Path) {
      comp.Path = comp.ComponentId.toString();
    }
  });

  // First create node map for easy lookup by ID and path
  const nodeMap = {};
  const pathMap = {};
  const rootNodes = [];

  // Insieme per tracciare le chiavi utilizzate e garantire l'unicità
  const usedKeys = new Set();

  // First pass: create all nodes and map paths
  componentsToProcess.forEach((comp, index) => {
    // Crea la chiave base che include ComponentId e Line
    let baseNodeId = `component-${comp.ComponentId}-${comp.Line}`;

    // Se esiste il Path, includilo nella chiave per maggior unicità
    if (comp.Path) {
      baseNodeId = `component-${comp.ComponentId}-${comp.Line}-${comp.Path.replace(/\./g, "-")}`;
    }

    // Se esiste già questo ID, aggiungi un suffisso numerico incrementale
    let nodeId = baseNodeId;
    let suffix = 1;

    while (usedKeys.has(nodeId)) {
      nodeId = `${baseNodeId}-${suffix}`;
      suffix++;
    }

    // Aggiungi l'ID all'insieme delle chiavi utilizzate
    usedKeys.add(nodeId);

    const node = {
      id: nodeId,
      type: "component",
      level: comp.Level,
      data: comp,
      children: [],
    };

    // Store in ID map
    nodeMap[nodeId] = node;

    // If it has a path, store in path map
    if (comp.Path) {
      pathMap[comp.Path] = node;
    }

    // Root nodes (Level 0 or 1 depending on structure)
    if (comp.Level === 0 || comp.Level === 1) {
      rootNodes.push(node);
    }
  });

  // Second pass: build parent-child relationships
  componentsToProcess.forEach((comp) => {
    // Skip root nodes
    if (comp.Level <= 1) return;

    // Find parent using Path if available
    if (comp.Path) {
      const pathParts = comp.Path.split(".");
      // Remove last element to get parent path
      pathParts.pop();
      const parentPath = pathParts.join(".");

      const parentNode = pathMap[parentPath];
      if (parentNode) {
        // Cerca il nodo con il ComponentId e Line corretti
        let nodeToAdd = null;
        for (const [id, node] of Object.entries(nodeMap)) {
          if (
            node.data.ComponentId === comp.ComponentId &&
            node.data.Line === comp.Line &&
            node.data.Path === comp.Path
          ) {
            nodeToAdd = node;
            break;
          }
        }

        if (nodeToAdd) {
          // IMPORTANT: Propagate BOMId from parent to child if not already set
          // This ensures correct cycle association at deeper levels
          if (parentNode.data.BOMId && !nodeToAdd.data.BOMId) {
            nodeToAdd.data.BOMId = parentNode.data.BOMId;
            console.log(
              `[buildTree-${debugId}] Propagated BOMId ${parentNode.data.BOMId} to child ${nodeToAdd.id}`,
            );
          }

          parentNode.children.push(nodeToAdd);
        }
      }
    }
    // Otherwise, try to infer parent from level
    else {
      // Look back in the array until finding a component with level = level-1
      for (let i = componentsToProcess.indexOf(comp) - 1; i >= 0; i--) {
        const potentialParent = componentsToProcess[i];
        if (potentialParent.Level === comp.Level - 1) {
          // Cerca il nodo padre nel nodeMap
          let parentNode = null;
          for (const [id, node] of Object.entries(nodeMap)) {
            if (
              node.data.ComponentId === potentialParent.ComponentId &&
              node.data.Line === potentialParent.Line
            ) {
              parentNode = node;
              break;
            }
          }

          // Cerca il nodo figlio nel nodeMap
          let childNode = null;
          for (const [id, node] of Object.entries(nodeMap)) {
            if (
              node.data.ComponentId === comp.ComponentId &&
              node.data.Line === comp.Line
            ) {
              childNode = node;
              break;
            }
          }

          if (parentNode && childNode) {
            // IMPORTANT: Propagate BOMId from parent to child if not already set
            if (parentNode.data.BOMId && !childNode.data.BOMId) {
              childNode.data.BOMId = parentNode.data.BOMId;
              console.log(
                `[buildTree-${debugId}] Propagated BOMId ${parentNode.data.BOMId} to child ${childNode.id}`,
              );
            }

            parentNode.children.push(childNode);
            break;
          }
        }
      }
    }
  });

  // Sort children of each node by Line
  const sortNodeChildren = (node) => {
    if (node.children && node.children.length > 0) {
      // Sort by Line, but keep cycles at the end
      node.children.sort((a, b) => {
        // If one is a cycle and the other a component, component comes first
        if (a.type === "cycle" && b.type === "component") return 1;
        if (a.type === "component" && b.type === "cycle") return -1;

        // Otherwise sort by Line/RtgStep
        const aLine =
          a.type === "component" ? a.data.Line || 0 : a.data.RtgStep || 0;
        const bLine =
          b.type === "component" ? b.data.Line || 0 : b.data.RtgStep || 0;
        return aLine - bLine;
      });

      // Recursively apply to children
      node.children.forEach(sortNodeChildren);
    }
  };

  // Apply sorting to all root nodes
  rootNodes.forEach(sortNodeChildren);

  // Check BOMId propagation effectiveness
  const nodesWithBOMId = Object.values(nodeMap).filter(
    (node) => node.data.BOMId,
  ).length;
  const totalNodes = Object.values(nodeMap).length;
  console.log(
    `[buildTree-${debugId}] BOMId propagation stats: ${nodesWithBOMId}/${totalNodes} nodes have BOMId (${Math.round((nodesWithBOMId / totalNodes) * 100)}%)`,
  );

  return rootNodes;
};

/**
 * Restituisce la descrizione della natura dell'articolo
 * @param {number} nature - Codice natura
 * @returns {string} - Descrizione della natura
 */
export const getNatureDescription = (nature) => {
  const natureCode = typeof nature === "string" ? parseInt(nature, 10) : nature;

  switch (natureCode) {
    case 22413312:
      return "Semilavorato";
    case 22413313:
      return "Prodotto Finito";
    case 22413314:
      return "Acquisto";
    default:
      return "Altro";
  }
};

/**
 * Restituisce la descrizione del tipo di componente
 * @param {number} type - Codice tipo componente
 * @returns {string} - Descrizione del tipo componente
 */
export const getComponentTypeDescription = (type) => {
  const typeCode = typeof type === "string" ? parseInt(type, 10) : type;

  switch (typeCode) {
    case 7798784:
      return "Articolo";
    case 7798787:
      return "Fantasma";
    case 7798789:
      return "Nota";
    default:
      return "Articolo";
  }
};

/**
 * Calcola statistiche di riepilogo per una distinta base
 * @param {Object} bom - Dati della testata BOM
 * @param {Array} components - Dati dei componenti BOM
 * @returns {Object} - Statistiche di riepilogo
 */
export const calculateBOMSummary = (bom, components = []) => {
  // Conteggio totale componenti
  const totalComponents = Array.isArray(components) ? components.length : 0;

  // Conteggio per natura
  const purchased = Array.isArray(components)
    ? components.filter((c) => (c.Nature || c.ComponentNature) === 22413314)
        .length
    : 0;

  const semifinished = Array.isArray(components)
    ? components.filter((c) => (c.Nature || c.ComponentNature) === 22413312)
        .length
    : 0;

  const finished = Array.isArray(components)
    ? components.filter((c) => (c.Nature || c.ComponentNature) === 22413313)
        .length
    : 0;

  const other = totalComponents - purchased - semifinished - finished;

  // Calcoli di costo
  const materialCost = bom?.RMCost || 0;
  const processingCost = bom?.ProcessingCost || 0;
  const totalCost = bom?.TotalCost || materialCost + processingCost;

  return {
    totalComponents,
    purchased,
    semifinished,
    finished,
    other,
    materialCost,
    processingCost,
    totalCost,
  };
};

/**
 * Genera un ID univoco per un componente BOM
 * @param {string} prefix - Prefisso per l'ID
 * @returns {string} - ID univoco
 */
export const generateUniqueId = (prefix = "comp") => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Formatta un valore numerico come quantità
 * @param {number} value - Valore da formattare
 * @param {number} decimals - Numero di decimali
 * @returns {string} - Valore formattato
 */
export const formatQuantity = (value, decimals = 3) => {
  if (value === null || value === undefined) return "";

  const numValue = parseFloat(value);
  if (isNaN(numValue)) return "";

  return numValue.toFixed(decimals).replace(/\.?0+$/, "");
};

/**
 * Formatta un valore numerico come prezzo
 * @param {number} value - Valore da formattare
 * @param {string} currency - Simbolo valuta
 * @returns {string} - Valore formattato
 */
export const formatPrice = (value, currency = "€") => {
  if (value === null || value === undefined) return "";

  const numValue = parseFloat(value);
  if (isNaN(numValue)) return "";

  return `${currency} ${numValue.toFixed(2)}`;
};

/**
 * Controlla se ci sono modifiche pendenti nel contesto
 * @param {Object} pendingChanges - Oggetto contenente le modifiche pendenti
 * @returns {boolean} - True se ci sono modifiche pendenti
 */
export const hasPendingChanges = (pendingChanges) => {
  // Se l'oggetto non esiste o è vuoto, non ci sono modifiche
  if (!pendingChanges || Object.keys(pendingChanges).length === 0) {
    return false;
  }

  // Verifica ogni chiave per vedere se contiene modifiche effettive
  for (const key in pendingChanges) {
    const changes = pendingChanges[key];

    // Se è una modifica di ciclo
    if (key.startsWith("cycle-")) {
      // Verifica se ci sono cicli nuovi
      if (changes.newCycles && changes.newCycles.length > 0) {
        return true;
      }

      // Verifica se ci sono cicli eliminati
      if (changes.deletedCycles && changes.deletedCycles.length > 0) {
        return true;
      }

      // Verifica se ci sono cambiamenti nei cicli esistenti
      if (
        changes.cycleChanges &&
        Object.keys(changes.cycleChanges).length > 0
      ) {
        return true;
      }

      // Verifica se c'è un nuovo ordine
      if (changes.newOrder && changes.newOrder.length > 0) {
        return true;
      }
    } else {
      // Se è una modifica a un componente

      // Verifica cambiamenti al componente della distinta
      if (
        changes.bomComponentChanges &&
        Object.keys(changes.bomComponentChanges).length > 0
      ) {
        return true;
      }

      // Verifica cambiamenti ai dettagli dell'articolo
      if (
        changes.itemDetailsChanges &&
        Object.keys(changes.itemDetailsChanges).length > 0
      ) {
        return true;
      }
    }
  }

  // Se nessuna delle verifiche ha trovato modifiche, restituisci false
  return false;
};

/**
 * Resetta tutte le modifiche pendenti nel contesto
 * @param {Object} pendingChanges - Oggetto contenente le modifiche pendenti
 * @param {Function} setPendingChanges - Funzione per aggiornare le modifiche pendenti
 * @param {string|number} componentId - ID del componente (opzionale)
 */
export const resetPendingChanges = (
  pendingChanges,
  setPendingChanges,
  componentId = null,
) => {
  if (componentId) {
    // Resetta solo le modifiche per un componente specifico
    setPendingChanges((prev) => {
      const newChanges = { ...prev };
      // Rimuovi le modifiche dirette del componente
      if (newChanges[componentId]) {
        delete newChanges[componentId];
      }

      // Rimuovi anche le modifiche ai cicli di questo componente
      const cycleKey = `cycle-${componentId}`;
      if (newChanges[cycleKey]) {
        delete newChanges[cycleKey];
      }

      return newChanges;
    });
  } else {
    // Resetta tutte le modifiche
    setPendingChanges({});
  }
};

/**
 * Funzione più avanzata per verificare modifiche specifiche per un componente
 * @param {Object} pendingChanges - Oggetto contenente le modifiche pendenti
 * @param {string|number} componentId - ID del componente
 * @returns {boolean} - True se ci sono modifiche pendenti per questo componente
 */
export const hasComponentChanges = (pendingChanges, componentId) => {
  if (!pendingChanges || !componentId) {
    return false;
  }

  // Controlla modifiche dirette al componente
  if (
    pendingChanges[componentId] &&
    ((pendingChanges[componentId].bomComponentChanges &&
      Object.keys(pendingChanges[componentId].bomComponentChanges).length >
        0) ||
      (pendingChanges[componentId].itemDetailsChanges &&
        Object.keys(pendingChanges[componentId].itemDetailsChanges).length > 0))
  ) {
    return true;
  }

  // Controlla modifiche ai cicli del componente
  const cycleKey = `cycle-${componentId}`;
  if (pendingChanges[cycleKey]) {
    const cycleChanges = pendingChanges[cycleKey];

    if (
      (cycleChanges.newCycles && cycleChanges.newCycles.length > 0) ||
      (cycleChanges.deletedCycles && cycleChanges.deletedCycles.length > 0) ||
      (cycleChanges.cycleChanges &&
        Object.keys(cycleChanges.cycleChanges).length > 0) ||
      (cycleChanges.newOrder && cycleChanges.newOrder.length > 0)
    ) {
      return true;
    }
  }

  return false;
};
