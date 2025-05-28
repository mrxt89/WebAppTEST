import { useState, useCallback } from "react";
import { config } from "../config";
import useApiRequest from "./useApiRequest";

const useProjectArticlesActions = () => {
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [itemStatuses, setItemStatuses] = useState([]);
  const { makeRequest } = useApiRequest();

  // Ottieni stati degli articoli
  const fetchItemStatuses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await makeRequest(
        `${config.API_BASE_URL}/projectArticles/statuses`,
      );
      if (data) {
        setItemStatuses(data);
      }
      return data;
    } catch (err) {
      setError(err.message);
      console.error("Error fetching item statuses:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  // Ottieni articoli con paginazione e filtri
  const fetchItems = useCallback(
    async (page = 0, pageSize = 50, filters = {}) => {
      try {
        setLoading(true);
        const url = `${config.API_BASE_URL}/projectArticles/items/paginated?page=${page}&pageSize=${pageSize}&filters=${encodeURIComponent(JSON.stringify(filters))}`;

        const data = await makeRequest(url);

        if (data) {
          setItems(data.items);
          setTotalPages(data.totalPages);
          setTotalRecords(data.total);
          return data;
        }
        return { items: [], total: 0, totalPages: 0 };
      } catch (err) {
        setError(err.message);
        console.error("Error fetching items:", err);
        setItems([]);
        return { items: [], total: 0, totalPages: 0 };
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Ottieni dettagli di un articolo
  // Ottieni dettagli di un articolo
  const getItemById = useCallback(
    async (itemId) => {
      if (!itemId) {
        console.error("getItemById called with no itemId");
        return null;
      }

      try {
        setLoading(true);
        const response = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/items/${itemId}`,
        );

        // Make sure we're not accidentally treating a valid response as falsy
        if (response === null || response === undefined) {
          console.warn(`No data returned from API for item #${itemId}`);
          return null;
        }

        // Check if the response is an error object
        if (response.success === 0) {
          console.warn(`API returned error for item #${itemId}:`, response.msg);
          return null;
        }

        // Make sure we have a valid item object
        if (typeof response !== "object" || !("Id" in response)) {
          console.warn(
            `API returned invalid data structure for item #${itemId}:`,
            response,
          );
          return null;
        }

        return response;
      } catch (err) {
        console.error(`Error fetching item #${itemId} details:`, err);
        setError(err.message || "Errore nel recupero dei dettagli articolo");

        // Check if the error is due to item not found (404)
        if (err.status === 404) {
          return null;
        }

        // For other errors, propagate the exception
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Crea un nuovo articolo
  const addItem = useCallback(
    async (itemData, projectId) => {
      try {
        setLoading(true);
        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/items`,
          {
            method: "POST",
            body: JSON.stringify({
              action: "ADD",
              itemData,
              projectId,
            }),
          },
        );
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error adding item:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Aggiorna un articolo esistente
  const updateItem = useCallback(
    async (itemData) => {
      try {
        setLoading(true);
        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/items`,
          {
            method: "POST",
            body: JSON.stringify({
              action: "UPDATE",
              itemData,
            }),
          },
        );
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error updating item:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Copia un articolo esistente
  const copyItem = useCallback(
    async (itemData, projectId, sourceItemId) => {
      try {
        setLoading(true);
        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/items`,
          {
            method: "POST",
            body: JSON.stringify({
              action: "COPY",
              itemData,
              projectId,
              sourceItemId,
            }),
          },
        );
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error copying item:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Visualizzazione distinte base
  const getBOMData = async (
    action,
    id,
    itemId = null,
    version = null,
    options = {},
  ) => {
    try {
      let url;

      // If we have a BOM ID, use the /boms/:id endpoint
      if (id) {
        url = `${config.API_BASE_URL}/projectArticles/boms/${id}?action=${action}`;
      }
      // Otherwise if we have an ItemId, use the /boms/item/:itemId endpoint
      else if (itemId) {
        url = `${config.API_BASE_URL}/projectArticles/boms/item/${itemId}?action=${action}`;
        if (version) url += `&version=${version}`;
      } else {
        console.error("Neither Id nor ItemId provided for getBOMData");
        throw new Error("Either Id or ItemId must be provided");
      }

      // Add other parameters to the URL
      if (options.maxLevel) url += `&maxLevel=${options.maxLevel}`;
      if (options.includeDisabled !== undefined)
        url += `&includeDisabled=${options.includeDisabled}`;
      if (options.expandPhantoms !== undefined)
        url += `&expandPhantoms=${options.expandPhantoms}`;
      if (options.includeRouting !== undefined)
        url += `&includeRouting=${options.includeRouting}`;

      // Make the request
      const data = await makeRequest(url);

      // Process data based on action
      let processedResult = data;

      if (action === "GET_BOM_MULTILEVEL" && data) {
        // IMPORTANT: Process data to ensure BOMId is correctly set on all components and routing entries

        let components = [];
        let routing = [];

        // Extract components
        if (data.components && Array.isArray(data.components)) {
          components = data.components;
        } else if (Array.isArray(data)) {
          components = data;
        }

        // Extract routing
        if (data.routing && Array.isArray(data.routing)) {
          routing = data.routing;
        }

        // Ensure BOMId is set on all components
        if (components.length > 0) {
          // Find unique BOMIds in the data
          const bomIds = new Set();
          components.forEach((comp) => {
            if (comp.BOMId) bomIds.add(comp.BOMId);
          });

          // If no BOMIds found but we have an id parameter, use that
          if (bomIds.size === 0 && id) {
            // Apply BOMId to all components based on level
            components = components.map((comp) => ({
              ...comp,
              BOMId: id,
            }));

            // Apply BOMId to all routing entries
            routing = routing.map((route) => ({
              ...route,
              BOMId: id,
            }));
          }
          // If we have multiple BOMIds, ensure proper parent-child BOMId propagation
          else if (bomIds.size > 0) {
            // Create a map to track component hierarchy
            const pathMap = {};
            components.forEach((comp) => {
              if (comp.Path) {
                pathMap[comp.Path] = comp;
              }
            });

            // Propagate BOMIds through the hierarchy
            components.forEach((comp) => {
              if (!comp.BOMId && comp.Path) {
                const pathParts = comp.Path.split(".");
                if (pathParts.length > 1) {
                  // Remove last element (current component)
                  pathParts.pop();
                  // Try to find parent with a BOMId
                  while (pathParts.length > 0) {
                    const parentPath = pathParts.join(".");
                    const parent = pathMap[parentPath];
                    if (parent && parent.BOMId) {
                      comp.BOMId = parent.BOMId;

                      break;
                    }
                    pathParts.pop();
                  }
                }
              }
            });
          }
        }

        // Return the processed data
        processedResult = {
          components: components,
          routing: routing,
        };
      } else if (action === "GET_BOM_FULL" && data) {
        // For full BOM data, ensure routing entries have BOMId
        if (data.routing && Array.isArray(data.routing)) {
          data.routing = data.routing.map((route) => ({
            ...route,
            BOMId: route.BOMId || id, // Use provided id as default
          }));
        }

        // Also ensure components have BOMId
        if (data.components && Array.isArray(data.components)) {
          data.components = data.components.map((comp) => ({
            ...comp,
            BOMId: comp.BOMId || id, // Use provided id as default
          }));
        }

        processedResult = data;
      }

      return processedResult;
    } catch (err) {
      console.error(`Error in getBOMData (${action}):`, err);
      throw err;
    }
  };

  // Ottieni BOM per ItemId
  const getBOMByItemId = useCallback(
    async (itemId, version = null, action = "GET_BOM_FULL", options = {}) => {
      try {
        if (!itemId) {
          console.error("getBOMByItemId called with no itemId");
          return null;
        }

        setLoading(true);
        let url = `${config.API_BASE_URL}/projectArticles/boms/item/${itemId}?action=${action}`;

        // Aggiungi versione se specificata
        if (version) url += `&version=${version}`;

        // Aggiungi parametri opzionali all'URL
        if (options.maxLevel) url += `&maxLevel=${options.maxLevel}`;
        if (options.includeDisabled !== undefined)
          url += `&includeDisabled=${options.includeDisabled}`;
        if (options.expandPhantoms !== undefined)
          url += `&expandPhantoms=${options.expandPhantoms}`;
        if (options.includeRouting !== undefined)
          url += `&includeRouting=${options.includeRouting}`;

        const data = await makeRequest(url);
        // Add explicit checking for the response format
        if (data === null || data === undefined) {
          console.warn(`No data returned from API for item #${itemId}`);
          return {
            header: null,
            components: [],
            routing: [],
            availableVersions: [1],
          };
        }

        // If it's an error response with success=0, handle it gracefully
        if (data.success === 0) {
          console.warn(`API returned error for item #${itemId}: ${data.msg}`);
          return {
            header: null,
            components: [],
            routing: [],
            availableVersions: [1],
          };
        }

        // Check and transform response if needed
        if (
          data &&
          !data.header &&
          !data.components &&
          !Array.isArray(data.components)
        ) {
          // Try to normalize the response
          const normalizedData = {
            header: data.header || null,
            components: Array.isArray(data.components)
              ? data.components
              : Array.isArray(data)
                ? data
                : [],
            routing: Array.isArray(data.routing) ? data.routing : [],
            availableVersions: data.availableVersions || [1],
          };

          return normalizedData;
        }

        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error fetching BOM by item ID:", err);

        // Return a valid empty structure instead of null
        return {
          header: null,
          components: [],
          routing: [],
          availableVersions: [1],
        };
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Crea o aggiorna una distinta base
  const addUpdateBOM = useCallback(
    async (action, bomData) => {
      try {
        setLoading(true);
        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/boms`,
          {
            method: "POST",
            body: JSON.stringify({
              action,
              bomData,
            }),
          },
        );
        return data;
      } catch (err) {
        setError(err.message);
        console.error(`Error in BOM ${action} operation:`, err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // NUOVO: Copia la distinta base da un articolo sorgente a un articolo target
  const copyBOMFromItem = useCallback(
    async (
      projectId,
      targetItemId,
      sourceItemId = null,
      sourceType = "temporary",
    ) => {
      try {
        setLoading(true);

        // Prima verifica se l'articolo sorgente ha una distinta base
        let sourceBomId = null;

        if (sourceItemId && sourceType === "temporary") {
          // Se è un articolo temporaneo, ottieni la sua distinta base
          const sourceBom = await getBOMByItemId(sourceItemId);

          if (sourceBom && sourceBom.header) {
            sourceBomId = sourceBom.header.Id;
          } else {
            // L'articolo sorgente non ha una distinta base
            return {
              success: 0,
              msg: "L'articolo sorgente non ha una distinta base",
            };
          }
        } else if (sourceType === "defined") {
          // Per articoli dal gestionale, cerchiamo distinte base nel gestionale
          // Questo è attualmente gestito nel backend
          // Implementeremo un endpoint specifico per questa funzionalità
        }

        // Crea la distinta base con l'azione COPY
        const bomData = {
          ItemId: targetItemId,
          SourceBOMId: sourceBomId,
          CopyComponents: true,
          CopyRouting: true,
        };

        // Se non c'è un sourceBomId, usa un'azione diversa per cercare nel gestionale
        const action = sourceBomId ? "COPY" : "IMPORT_FROM_ERP";

        // Chiama l'endpoint per copiare la distinta base
        const response = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/boms`,
          {
            method: "POST",
            body: JSON.stringify({
              action: action,
              bomData: bomData,
            }),
          },
        );

        return response;
      } catch (err) {
        setError(err.message);
        console.error("Error copying BOM from item:", err);
        return {
          success: 0,
          msg: err.message || "Errore nella copia della distinta base",
        };
      } finally {
        setLoading(false);
      }
    },
    [makeRequest, getBOMByItemId],
  );

  // NUOVO: Ottieni distinte dal gestionale ERP (Mago)
  const getERPBOMs = useCallback(
    async (search = "") => {
      try {
        setLoading(true);
        let url = `${config.API_BASE_URL}/projectArticles/erp-boms`;

        // Aggiungi parametri di query
        const params = new URLSearchParams();

        if (search) params.append("search", search);

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const data = await makeRequest(url);
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error fetching ERP BOMs:", err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // NUOVO: Ottieni distinte di riferimento
  const getReferenceBOMs = useCallback(
    async (filters = {}, page = 1, pageSize = 10) => {
      try {
        setLoading(true);

        // Costruisci i parametri di query
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("pageSize", pageSize);

        if (filters.category) params.append("category", filters.category);
        if (filters.search) params.append("search", filters.search);
        if (filters.nature) params.append("nature", filters.nature);
        if (filters.onlyAvailable !== undefined)
          params.append("onlyAvailable", filters.onlyAvailable);

        const url = `${config.API_BASE_URL}/projectArticles/reference-boms?${params.toString()}`;

        const data = await makeRequest(url);
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error fetching reference BOMs:", err);
        return {
          items: [],
          pagination: { currentPage: 1, totalPages: 1, totalItems: 0 },
        };
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // NUOVO: Riordina componenti di una distinta
  const reorderBOMComponents = useCallback(
    async (bomId, components) => {
      try {
        setLoading(true);
        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/boms/${bomId}/reorder`,
          {
            method: "POST",
            body: JSON.stringify({ components }),
          },
        );
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error reordering BOM components:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Gestisci riferimenti intercompany
  const manageReferences = useCallback(
    async (action, referenceData) => {
      try {
        setLoading(true);
        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/references`,
          {
            method: "POST",
            body: JSON.stringify({
              action,
              referenceData,
            }),
          },
        );
        return data;
      } catch (err) {
        setError(err.message);
        console.error(`Error in references ${action} operation:`, err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Ottieni riferimenti per un articolo
  const getItemReferences = useCallback(
    async (companyId, itemId) => {
      try {
        setLoading(true);
        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/references/item/${companyId}/${itemId}`,
        );
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error fetching item references:", err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Aggiungi componente a una distinta
  const addComponent = useCallback(
    async (bomId, componentData = null) => {
      try {
        // Se componentData è null, bomId contiene tutti i dati
        // Se componentData è definito, bomId è l'ID della distinta
        let data;

        if (componentData === null) {
          // Formato vecchio: addComponent(dataConBomId)
          data = bomId;

          if (!data || !data.Id) {
            throw new Error("Missing BOM ID for adding component");
          }
        } else {
          // Formato nuovo: addComponent(bomId, componentData)
          data = { ...componentData, Id: bomId };
        }

        // Ora controlliamo se è richiesta la creazione di un componente temporaneo
        if (data.createTempComponent) {
          // Se vogliamo creare un componente temporaneo, non abbiamo bisogno di ComponentId o ComponentCode
          const payload = {
            Id: data.Id, // Usa l'ID distinta passato come primo parametro o contenuto nei dati
            CreateTempComponent: true,
            // Se presenti, passiamo i parametri opzionali per il componente temporaneo
            ComponentDescription: data.componentDescription,
            ComponentNatureValue: data.nature,
            ComponentUoM: data.uom,
            Quantity: data.quantity,
            // Se è fornito, passiamo il prefisso personalizzato
            TempComponentPrefix: data.tempComponentPrefix,
            // Altri parametri opzionali
            ImportBOM: data.importBOM !== undefined ? data.importBOM : true,
            MaxLevels: data.maxLevels || 1,
            ParentComponentId: data.parentComponentId,
            // IMPORTANTE: Passa l'ID del componente sorgente per copiare la distinta
            SourceComponentId: data.sourceComponentId || 0,
            // NUOVO: Passa direttamente l'ID della distinta sorgente se disponibile
            SourceBOMId: data.sourceBOMId || 0,
            SourceItemCode: data.sourceItemCode || null,
          };

          return await addUpdateBOM("ADD_COMPONENT", payload);
        } else {
          // Comportamento originale per l'aggiunta di componenti esistenti
          if (!data.ComponentId && !data.ComponentCode) {
            throw new Error(
              "ComponentId or ComponentCode required for the ADD_COMPONENT action",
            );
          }

          // Crea il payload per l'API
          const payload = {
            Id: data.Id, // Usa l'ID distinta passato come primo parametro
            ...data,
          };

          return await addUpdateBOM("ADD_COMPONENT", payload);
        }
      } catch (error) {
        console.error("Error in addComponent:", error);
        throw error;
      }
    },
    [addUpdateBOM],
  );

  // Aggiorna componente di una distinta
  const updateComponent = useCallback(
    async (bomId, line, componentData) => {
      return addUpdateBOM("UPDATE_COMPONENT", {
        Id: bomId,
        Line: line,
        ...componentData,
      });
    },
    [addUpdateBOM],
  );

  // Elimina componente da una distinta
  const deleteComponent = useCallback(
    async (bomId, line) => {
      return addUpdateBOM("DELETE_COMPONENT", {
        Id: bomId,
        Line: line,
      });
    },
    [addUpdateBOM],
  );

  // Aggiungi fase di ciclo a una distinta
  const addRouting = useCallback(
    async (bomId, routingData) => {
      try {
        setLoading(true);
        const data = await addUpdateBOM("ADD_ROUTING", {
          Id: bomId,
          ...routingData,
        });
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error adding routing:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [addUpdateBOM],
  );

  // Aggiorna fase di ciclo di una distinta
  const updateRouting = useCallback(
    async (bomId, rtgStep, routingData) => {
      try {
        setLoading(true);
        const data = await addUpdateBOM("UPDATE_ROUTING", {
          Id: bomId,
          RtgStep: rtgStep,
          ...routingData,
        });
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error updating routing:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [addUpdateBOM],
  );

  // Elimina fase di ciclo da una distinta
  const deleteRouting = useCallback(
    async (bomId, rtgStep) => {
      try {
        setLoading(true);
        const data = await addUpdateBOM("DELETE_ROUTING", {
          Id: bomId,
          RtgStep: rtgStep,
        });
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error deleting routing:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [addUpdateBOM],
  );

  // Helper per tradurre nature articoli
  const getNatureDescription = useCallback((natureCode) => {
    switch (parseInt(natureCode)) {
      case 22413312:
        return "Semilavorato";
      case 22413313:
        return "Prodotto Finito";
      case 22413314:
        return "Acquisto";
      default:
        return "Altro";
    }
  }, []);

  // Helper per tradurre stati articoli
  const getStatusDescription = useCallback(
    (statusId) => {
      const status = itemStatuses.find((s) => s.Id === parseInt(statusId));
      return status ? status.Description : "Sconosciuto";
    },
    [itemStatuses],
  );

  // Ottiene gli articoli temporanei disponibili (non già associati al progetto specificato)
  const getAvailableItems = useCallback(
    async (projectId) => {
      try {
        setLoading(true);
        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/items/available?projectId=${projectId}`,
        );
        return data || [];
      } catch (err) {
        setError(err.message);
        console.error("Error fetching available items:", err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Ottiene gli articoli dal gestionale
  const getERPItems = useCallback(
    async (search = "") => {
      try {
        setLoading(true);
        let url = `${config.API_BASE_URL}/projectArticles/erp-items`;

        if (search) {
          url += `?search=${encodeURIComponent(search)}`;
        }

        const data = await makeRequest(url);
        return data || [];
      } catch (err) {
        setError(err.message);
        console.error("Error fetching ERP items:", err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Importa un articolo dal gestionale e lo associa al progetto
  const importERPItem = useCallback(
    async (
      projectId,
      erpItem,
      importBOM = false,
      processMultilevelBOM = true,
      maxLevels = 10,
    ) => {
      try {
        setLoading(true);
        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/items/import`,
          {
            method: "POST",
            body: JSON.stringify({
              action: "IMPORT",
              projectId,
              erpItem,
              importBOM,
              processMultilevelBOM,
              maxLevels,
            }),
          },
        );
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error importing ERP item:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Associa un articolo temporaneo esistente a un progetto
  const linkItemToProject = useCallback(
    async (projectId, itemId) => {
      try {
        setLoading(true);
        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/items/link`,
          {
            method: "POST",
            body: JSON.stringify({
              action: "LINK",
              projectId,
              itemId,
            }),
          },
        );
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error linking item to project:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Sostituisci un componente con un componente esistente
  const replaceComponent = useCallback(
    async (bomId, componentLine, newComponentId = 0, newComponentCode = "") => {
      try {
        setLoading(true);
        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/boms/${bomId}/replaceComponent`,
          {
            method: "POST",
            body: JSON.stringify({
              componentLine,
              newComponentId,
              newComponentCode,
            }),
          },
        );
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error replacing component:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Sostituisci un componente con un nuovo componente temporaneo
  const replaceWithNewComponent = useCallback(
    async (bomId, componentLine, newComponentData) => {
      try {
        setLoading(true);

        // Controlliamo se si vuole usare la creazione automatica
        const payload = {
          componentLine,
        };

        if (newComponentData.createTempComponent) {
          // Utilizziamo la generazione automatica del codice
          payload.createTempComponent = true;

          // Passiamo i parametri opzionali
          if (newComponentData.tempComponentPrefix) {
            payload.tempComponentPrefix = newComponentData.tempComponentPrefix;
          }

          // Prepariamo i dati minimi per il nuovo componente
          payload.newComponentData = {
            Description:
              newComponentData.Description || "Componente temporaneo",
            Nature: newComponentData.Nature || 22413312, // Default: Semilavorato
            BaseUoM: newComponentData.BaseUoM || "PZ",
            Quantity: newComponentData.Quantity || 1,
            CopyBOM: newComponentData.CopyBOM || false, // Supporto per copiare la distinta
          };
        } else {
          // Comportamento originale
          payload.newComponentData = {
            ...newComponentData,
            CopyBOM: newComponentData.CopyBOM || false, // Assicuriamoci che CopyBOM sia sempre definito
          };
        }

        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/boms/${bomId}/replaceWithNewComponent`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );

        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error replacing with new component:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Rimuove l'associazione tra un articolo e un progetto
  const unlinkItemFromProject = useCallback(
    async (projectId, itemId) => {
      try {
        setLoading(true);
        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/items/${itemId}/project/${projectId}`,
          {
            method: "DELETE",
          },
        );
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error unlinking item from project:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Disabilita un articolo temporaneo
  const disableTemporaryItem = useCallback(
    async (itemId) => {
      try {
        setLoading(true);
        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/items/${itemId}/disable`,
          {
            method: "PUT",
          },
        );
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error disabling temporary item:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Verifica se un articolo può essere disabilitato
  const canDisableItem = useCallback(
    async (itemId) => {
      try {
        setLoading(true);
        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/items/${itemId}/canDisable`,
        );
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error checking if item can be disabled:", err);
        return { canDisable: false, reason: err.message };
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Ottieni centri di lavoro
  const getWorkCenters = useCallback(async () => {
    try {
      setLoading(true);
      const data = await makeRequest(
        `${config.API_BASE_URL}/projectArticles/routing/workcenters`,
      );
      return data || [];
    } catch (err) {
      setError(err.message);
      console.error("Error fetching work centers:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  // Ottieni operazioni
  const getOperations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await makeRequest(
        `${config.API_BASE_URL}/projectArticles/routing/operations`,
      );
      return data || [];
    } catch (err) {
      setError(err.message);
      console.error("Error fetching operations:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  // Ottieni fornitori
  const getSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await makeRequest(
        `${config.API_BASE_URL}/projectArticles/routing/suppliers`,
      );
      return data || [];
    } catch (err) {
      setError(err.message);
      console.error("Error fetching suppliers:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  // Ottieni versioni di una distinta base per un articolo
  const getBOMVersions = useCallback(
    async (itemId) => {
      try {
        setLoading(true);
        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/boms/versions/${itemId}`,
        );
        return data || [];
      } catch (err) {
        setError(err.message);
        console.error("Error fetching BOM versions:", err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Riordinamento batch dei cicli
  const reorderBOMRoutings = useCallback(
    async (bomId, cycles) => {
      try {
        setLoading(true);
        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/boms/${bomId}/reorderRoutings`,
          {
            method: "POST",
            body: JSON.stringify({ cycles }),
          },
        );
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error reordering routing cycles:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Funzione per ottenere le unità di misura
  const getUnitsOfMeasure = useCallback(async () => {
    try {
      setLoading(true);
      const data = await makeRequest(
        `${config.API_BASE_URL}/projectArticles/unitsOfMeasure`,
      );
      return data || [];
    } catch (err) {
      setError(err.message);
      console.error("Error fetching units of measure:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  // Funzione per aggiornare i dettagli di un articolo
  const updateItemDetails = useCallback(
    async (itemId, itemData) => {
      try {
        setLoading(true);
        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/items/${itemId}/details`,
          {
            method: "PUT",
            body: JSON.stringify(itemData),
          },
        );
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error updating item details:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Importa un articolo dal gestionale con selezione dei componenti
const importERPItemWithSelection = useCallback(
  async (projectId, importData) => {
    try {
      setLoading(true);
      
      // Validazione dati di input
      if (!projectId || !importData || !importData.sourceItem) {
        throw new Error("Dati insufficienti per l'importazione");
      }

      // Prepara il payload per l'API
      const payload = {
        action: "IMPORT_WITH_SELECTION",
        projectId: parseInt(projectId),
        sourceItem: importData.sourceItem,
        createNewBOM: importData.createNewBOM || false,
        components: importData.components || [],
      };

      // Chiama l'endpoint
      const data = await makeRequest(
        `${config.API_BASE_URL}/projectArticles/items/import-with-selection`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      if (data && data.success) {
        return {
          success: true,
          item: data.item,
          bomId: data.bomId,
          importedComponents: data.importedComponents || [],
          msg: data.msg || "Importazione completata con successo"
        };
      } else {
        throw new Error(data?.msg || "Errore durante l'importazione");
      }
    } catch (err) {
      setError(err.message);
      console.error("Error importing ERP item with selection:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  },
  [makeRequest]
);

// Aggiungi anche questa funzione helper per ottenere la struttura BOM multilivello per il wizard
const getBOMStructureForWizard = useCallback(
  async (itemId, itemCode = null) => {
    try {
      setLoading(true);
      
      // Se abbiamo un itemId (articolo temporaneo), usa quello
      if (itemId) {
        const data = await getBOMData(
          "GET_BOM_MULTILEVEL",
          null,
          itemId,
          null,
          {
            maxLevel: 10,
            includeRouting: true,
            expandPhantoms: true,
          }
        );
        return data;
      } 
      // Altrimenti, se abbiamo un itemCode (articolo ERP), usa un endpoint specifico
      else if (itemCode) {
        const data = await makeRequest(
          `${config.API_BASE_URL}/projectArticles/erp-items/${encodeURIComponent(itemCode)}/bom-structure`
        );
        return data;
      }
      
      throw new Error("Né itemId né itemCode forniti per getBOMStructureForWizard");
    } catch (err) {
      setError(err.message);
      console.error("Error fetching BOM structure for wizard:", err);
      return null;
    } finally {
      setLoading(false);
    }
  },
  [makeRequest, getBOMData]
);

// Aggiungi questa funzione per validare se un articolo ERP ha una distinta
const checkERPItemHasBOM = useCallback(
  async (itemCode) => {
    try {
      setLoading(true);
      
      const data = await makeRequest(
        `${config.API_BASE_URL}/projectArticles/erp-items/${encodeURIComponent(itemCode)}/has-bom`
      );
      
      return data?.hasBOM || false;
    } catch (err) {
      console.error("Error checking ERP item BOM:", err);
      return false;
    } finally {
      setLoading(false);
    }
  },
  [makeRequest]
);

  // Ottiene gli articoli dal gestionale con paginazione
  const getERPItemsPaginated = useCallback(
    async (search = "", page = 0, pageSize = 50) => {
      try {
        setLoading(true);
        let url = `${config.API_BASE_URL}/projectArticles/erp-items/paginated?page=${page}&pageSize=${pageSize}`;

        if (search) {
          url += `&search=${encodeURIComponent(search)}`;
        }

        const data = await makeRequest(url);
        return data || { items: [], total: 0, totalPages: 0 };
      } catch (err) {
        setError(err.message);
        console.error("Error fetching ERP items:", err);
        return { items: [], total: 0, totalPages: 0 };
      } finally {
        setLoading(false);
      }
    },
    [makeRequest],
  );

  // Valida un codice articolo
const validateItemCode = useCallback(
  async (itemCode, excludeItemId = null) => {
    try {
      if (!itemCode || itemCode.trim() === '') {
        return {
          isValid: false,
          message: 'Codice articolo richiesto',
          isWarning: false
        };
      }

      const data = await makeRequest(
        `${config.API_BASE_URL}/projectArticles/items/validate-code`,
        {
          method: "POST",
          body: JSON.stringify({
            itemCode: itemCode.trim(),
            excludeItemId
          }),
        }
      );

      return {
        isValid: data.isValid || false,
        message: data.message || '',
        isWarning: data.isWarning || false
      };
    } catch (err) {
      console.error("Error validating item code:", err);
      return {
        isValid: false,
        message: err.message || 'Errore durante la validazione del codice',
        isWarning: false
      };
    }
  },
  [makeRequest]
);

// Verifica disponibilità di un codice articolo
const checkItemCodeAvailability = useCallback(
  async (itemCode, excludeItemId = null) => {
    try {
      if (!itemCode || itemCode.trim() === '') {
        return {
          canUse: false,
          exists: { inProjects: false, inERP: false },
          message: 'Codice articolo richiesto'
        };
      }

      let url = `${config.API_BASE_URL}/projectArticles/items/check-code/${encodeURIComponent(itemCode.trim())}`;
      
      if (excludeItemId) {
        url += `?excludeItemId=${excludeItemId}`;
      }

      const data = await makeRequest(url);

      return {
        canUse: data.canUse || false,
        exists: data.exists || { inProjects: false, inERP: false },
        message: data.message || ''
      };
    } catch (err) {
      console.error("Error checking item code availability:", err);
      return {
        canUse: false,
        exists: { inProjects: true, inERP: false }, // Per sicurezza
        message: err.message || 'Errore durante la verifica del codice'
      };
    }
  },
  [makeRequest]
);

// Valida un codice articolo in tempo reale (con debounce)
const [validationCache, setValidationCache] = useState({});
const [validationTimeouts, setValidationTimeouts] = useState({});

const validateItemCodeRealTime = useCallback(
  (itemCode, excludeItemId = null, callback, delay = 500) => {
    const key = `${itemCode}_${excludeItemId || 'null'}`;
    
    // Cancella timeout precedente
    if (validationTimeouts[key]) {
      clearTimeout(validationTimeouts[key]);
    }
    
    // Se il risultato è nella cache, usalo immediatamente
    if (validationCache[key]) {
      callback(validationCache[key]);
      return;
    }
    
    // Imposta nuovo timeout
    const timeoutId = setTimeout(async () => {
      try {
        const result = await validateItemCode(itemCode, excludeItemId);
        
        // Salva in cache
        setValidationCache(prev => ({
          ...prev,
          [key]: result
        }));
        
        // Chiama callback
        callback(result);
        
        // Pulisci timeout
        setValidationTimeouts(prev => {
          const newTimeouts = { ...prev };
          delete newTimeouts[key];
          return newTimeouts;
        });
      } catch (error) {
        console.error('Error in real-time validation:', error);
        callback({
          isValid: false,
          message: 'Errore durante la validazione',
          isWarning: false
        });
      }
    }, delay);
    
    setValidationTimeouts(prev => ({
      ...prev,
      [key]: timeoutId
    }));
  },
  [validateItemCode, validationCache, validationTimeouts]
);

// Pulisci cache di validazione quando necessario
const clearValidationCache = useCallback(() => {
  setValidationCache({});
  Object.values(validationTimeouts).forEach(timeoutId => {
    clearTimeout(timeoutId);
  });
  setValidationTimeouts({});
}, [validationTimeouts]);

// Aggiorna la funzione updateItemDetails esistente
const updateItemDetailsValidated = useCallback(
  async (itemId, itemData) => {
    try {
      setLoading(true);
      
      // Se viene modificato il codice, prima validalo
      if (itemData.Code !== undefined) {
        const validation = await validateItemCode(itemData.Code, itemId);
        
        if (!validation.isValid) {
          return {
            success: 0,
            msg: validation.message,
            field: 'Code'
          };
        }
      }
      
      const data = await makeRequest(
        `${config.API_BASE_URL}/projectArticles/items/${itemId}/details`,
        {
          method: "PUT",
          body: JSON.stringify(itemData),
        }
      );
      
      // Pulisci cache se il codice è stato modificato con successo
      if (data.success && itemData.Code !== undefined) {
        clearValidationCache();
      }
      
      return data;
    } catch (err) {
      setError(err.message);
      console.error("Error updating item details:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  },
  [makeRequest, validateItemCode, clearValidationCache]
);

  return {
    // Stati
    items,
    loading,
    error,
    totalPages,
    totalRecords,
    itemStatuses,

    // Funzioni principali
    fetchItemStatuses,
    fetchItems,
    getItemById,
    addItem,
    updateItem,
    copyItem,

    // Funzioni BOM
    getBOMData,
    getBOMByItemId,
    addUpdateBOM,
    copyBOMFromItem,

    // Nuove funzioni BOM
    getERPBOMs,
    getReferenceBOMs,
    reorderBOMComponents,

    // Funzioni componenti
    addComponent,
    updateComponent,
    deleteComponent,

    // Funzioni cicli
    addRouting,
    updateRouting,
    deleteRouting,

    // Funzioni riferimenti
    manageReferences,
    getItemReferences,

    // Helper
    getNatureDescription,
    getStatusDescription,

    // Funzioni specifiche
    getAvailableItems,
    getERPItems,
    importERPItem,
    linkItemToProject,

    replaceComponent,
    replaceWithNewComponent,
    unlinkItemFromProject,
    disableTemporaryItem,
    canDisableItem,

    getWorkCenters,
    getOperations,
    getSuppliers,
    getBOMVersions,
    reorderBOMRoutings,

    getUnitsOfMeasure,
    validateItemCode,
    checkItemCodeAvailability,
    validateItemCodeRealTime,
    clearValidationCache,
    updateItemDetails: updateItemDetailsValidated, 

    importERPItemWithSelection,
    getBOMStructureForWizard,
    checkERPItemHasBOM,

    getERPItemsPaginated,
  };
};

export default useProjectArticlesActions;
