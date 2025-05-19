import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import useProjectArticlesActions from "@/hooks/useProjectArticlesActions";
import { toast } from "@/components/ui/use-toast";

// Import the factory functions but DON'T call them yet
import createBOMDataHook from "../hooks/useBOMData";
import createBOMEditorHook from "../hooks/useBOMEditor";
import createBOMDragDropHook from "../hooks/useBOMDragDrop";

// Create the context
const BOMViewerContext = createContext(null);

// Provider component
export const BOMViewerProvider = ({
  children,
  item,
  project,
  canEdit = false,
  onRefresh,
}) => {
  // Import API actions
  const projectArticlesActions = useProjectArticlesActions();

  // Ref per prevenire richieste multiple e controllare il ciclo di vita
  const isMounted = useRef(true);
  const didFetchRef = useRef(false); // Usa questo nome coerente per tutti i controlli
  const apiRequestCount = useRef(0);
  const lastLoadedBomId = useRef(null);
  const loadInProgress = useRef(false); // Aggiunto il ref mancante
  const currentVersionRef = useRef(null); // Track current loading version

  // BOM data state
  const [loading, setLoading] = useState(false);
  const [bom, setBom] = useState(null);
  const [bomComponents, setBomComponents] = useState([]);
  const [bomRouting, setBomRouting] = useState([]);
  const [selectedBomId, setSelectedBomId] = useState(null);
  const [selectedBomVersion, setSelectedBomVersion] = useState(1);
  const [availableVersions, setAvailableVersions] = useState([1]);
  const [selectedComponents, setSelectedComponents] = useState([]);

  // Stato per unità di misura
  const [unitsOfMeasure, setUnitsOfMeasure] = useState([]);

  // Tree view state
  const [expandedNodes, setExpandedNodes] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("composition");
  const [pendingChanges, setPendingChanges] = useState({});

  // Reference panels state
  const [erpBOMs, setErpBOMs] = useState([]);
  const [projectBOMs, setProjectBOMs] = useState([]);
  const [referenceBOMs, setReferenceBOMs] = useState([]);

  // Filter and pagination for reference BOMs
  const [referenceFilter, setReferenceFilter] = useState({
    category: "all",
    search: "",
    onlyAvailable: true,
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });

  // Master data state
  const [workCenters, setWorkCenters] = useState([]);
  const [operations, setOperations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Funzione per caricare le unità di misura
  const loadUnitsOfMeasure = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      setLoading(true);

      // Chiamata all'API per caricare le unità di misura
      const data = await projectArticlesActions.getUnitsOfMeasure();

      if (Array.isArray(data) && isMounted.current) {
        setUnitsOfMeasure(data);
      }
    } catch (error) {
      console.error("Error loading units of measure:", error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [projectArticlesActions, setLoading]);

  // Ottieni le versioni di distinta disponibili per un item
  const getBOMVersions = useCallback(
    async (itemId) => {
      if (!itemId || !isMounted.current) return [];

      try {
        setLoading(true);

        // Chiama l'API per ottenere le versioni
        const versions = await projectArticlesActions.getBOMVersions(itemId);

        if (!versions || !Array.isArray(versions) || versions.length === 0) {
          return [];
        }

        // Elabora i risultati e assicurati che le versioni siano numeri
        const processedVersions = versions.map((v) => ({
          ...v,
          Version:
            typeof v.Version === "number" ? v.Version : parseInt(v.Version, 10),
        }));

        return processedVersions;
      } catch (error) {
        console.error(`Error getting BOM versions for item ${itemId}:`, error);
        return [];
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [projectArticlesActions, setLoading],
  );

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Reset on item change
  useEffect(() => {
    if (item?.Id) {
      // Reset only if item actually changed
      if (bom && bom.ItemId !== item.Id) {
        // Reset all state when item changes
        didFetchRef.current = false;
        lastLoadedBomId.current = null;
        currentVersionRef.current = null;
        setBom(null);
        setBomComponents([]);
        setBomRouting([]);
      }
    }
  }, [item?.Id, bom]);

  // Load master data function
  const loadMasterData = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      // Load work centers if not already loaded
      if (!workCenters.length) {
        const wcData = await projectArticlesActions.getWorkCenters();
        if (Array.isArray(wcData) && isMounted.current) setWorkCenters(wcData);
      }

      // Load operations if not already loaded
      if (!operations.length) {
        const opData = await projectArticlesActions.getOperations();
        if (Array.isArray(opData) && isMounted.current) setOperations(opData);
      }

      // Load suppliers if not already loaded
      if (!suppliers.length) {
        const supData = await projectArticlesActions.getSuppliers();
        if (Array.isArray(supData) && isMounted.current) setSuppliers(supData);
      }
    } catch (error) {
      console.error("Error loading master data:", error);
    }
  }, [
    projectArticlesActions,
    workCenters.length,
    operations.length,
    suppliers.length,
  ]);

  // carica i dati iniziali per le unità di misura e i dati di master
  useEffect(() => {
    // Aggiungi un controllo per verificare se le unità di misura sono già state caricate
    if (unitsOfMeasure.length === 0 && isMounted.current) {
      const fetchInitialData = async () => {
        try {
          await loadUnitsOfMeasure();
        } catch (error) {
          console.error("Error loading units of measure:", error);
        }
      };

      fetchInitialData();
    }
    // Array di dipendenze vuoto per eseguire l'effect solo al mount
  }, []);

  // Questa verrà eseguita solo quando cambia l'item o selectedBomId
  useEffect(() => {
    const initialLoad = async () => {
      // Non fare nulla se il componente è smontato o se abbiamo già caricato questi dati
      if (!isMounted.current) return;
      if (!item?.Id && !selectedBomId) return;

      // Se abbiamo già caricato per questo BOM ID e versione, non ricaricare
      if (
        didFetchRef.current &&
        lastLoadedBomId.current === selectedBomId &&
        currentVersionRef.current === selectedBomVersion
      ) {
        return;
      }

      try {
        setLoading(true);

        // PARTE 1: Se abbiamo un item ma non un BOM ID, prima carica il BOM per l'item
        if (item?.Id && !selectedBomId) {
          console.log("Caricamento BOM per l'articolo:", item.Id);

          // Resetta gli stati per evitare dati residui
          setBom(null);
          setBomComponents([]);
          setBomRouting([]);

          const data = await projectArticlesActions.getBOMByItemId(item.Id);

          if (!isMounted.current) return;

          if (data && data.header) {
            setBom(data.header);
            setSelectedBomId(data.header.Id);
            setSelectedBomVersion(data.header.Version || 1);
            setAvailableVersions(
              data.availableVersions || [data.header.Version || 1],
            );

            // Salva la versione corrente
            currentVersionRef.current = data.header.Version || 1;

            // Se abbiamo ricevuto anche componenti e cicli, impostali
            if (Array.isArray(data.components)) {
              setBomComponents(data.components);
            } else {
              // Resetta esplicitamente se non ci sono componenti
              setBomComponents([]);
            }

            if (Array.isArray(data.routing)) {
              setBomRouting(data.routing);
            } else {
              // Resetta esplicitamente se non ci sono cicli
              setBomRouting([]);
            }

            lastLoadedBomId.current = data.header.Id;
          } else {
            setBom(null);
            setSelectedBomId(null);
            setBomComponents([]);
            setBomRouting([]);

            // Non abbiamo trovato una distinta, imposta comunque come caricato
            didFetchRef.current = true;
            return;
          }
        }

        // PARTE 2: Se abbiamo un BOM ID, carica la struttura multilivello
        if (selectedBomId) {
          // Carica la struttura multilivello
          const bomId =
            typeof selectedBomId === "object"
              ? selectedBomId.Id
              : selectedBomId;

          // Incrementa il contatore delle chiamate API
          const requestId = ++apiRequestCount.current;

          console.log(
            `Caricamento dati multilivello per BOM ID: ${bomId}, versione: ${selectedBomVersion}`,
          );

          // Effettua la chiamata API
          const data = await projectArticlesActions.getBOMData(
            "GET_BOM_MULTILEVEL",
            bomId,
            null, // itemId
            selectedBomVersion, // Passa esplicitamente la versione
            {
              maxLevel: 10,
              includeRouting: true,
              expandPhantoms: true,
            },
          );

          // Se il componente è stato smontato durante la chiamata, esci
          if (!isMounted.current) {
            return;
          }

          // Se abbiamo dati, aggiorna lo stato
          if (data) {
            // Gestiamo i componenti
            if (data.components && Array.isArray(data.components)) {
              setBomComponents(data.components);
            } else if (Array.isArray(data)) {
              setBomComponents(data);
            } else {
              // Se non ci sono dati, resetta esplicitamente i componenti
              setBomComponents([]);
            }

            // Gestiamo il routing
            if (data.routing && Array.isArray(data.routing)) {
              setBomRouting(data.routing);
            } else {
              // Se non ci sono dati, resetta esplicitamente il routing
              setBomRouting([]);
            }
          } else {
            // Se non ci sono dati, resetta esplicitamente
            setBomComponents([]);
            setBomRouting([]);
          }

          // Imposta l'ultimo BOM ID e la versione caricata
          lastLoadedBomId.current = bomId;
          currentVersionRef.current = selectedBomVersion;
        }

        // Imposta il flag di caricamento completato
        didFetchRef.current = true;
      } catch (error) {
        console.error("Error in initial data load:", error);
        if (isMounted.current) {
          toast({
            title: "Error",
            description:
              "Unable to load BOM data: " + (error.message || "Unknown error"),
            variant: "destructive",
          });

          // In caso di errore, resetta i dati
          setBomComponents([]);
          setBomRouting([]);
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    initialLoad();
  }, [item?.Id, selectedBomId, selectedBomVersion, projectArticlesActions]);

  // Funzione loadBOMData corretta
  const loadBOMData = useCallback(
    async (action = "GET_BOM_FULL", options = {}, forceLoad = false) => {
      // Se non c'è un BOM ID o siamo smontati, esci
      if (!selectedBomId || !isMounted.current) {
        return null;
      }

      // Assicurati che selectedBomId sia un numero e non un oggetto
      const bomId =
        typeof selectedBomId === "object" ? selectedBomId.Id : selectedBomId;

      // Usa la versione dalle opzioni se fornita, altrimenti usa quella corrente
      const versionToUse =
        options.version !== undefined ? options.version : selectedBomVersion;

      // MODIFICA: Se forceLoad è true, ignora il controllo sui dati già caricati
      // Altrimenti verifica che non stiamo ricaricando gli stessi dati
      if (
        !forceLoad &&
        didFetchRef.current &&
        lastLoadedBomId.current === bomId &&
        currentVersionRef.current === versionToUse
      ) {
        console.log(
          `Saltato caricamento dati per BOM ID ${bomId}, versione ${versionToUse} - già caricato`,
        );
        return null;
      }

      const requestId = ++apiRequestCount.current;

      try {
        setLoading(true);

        console.log(
          `[${requestId}] Caricamento ${action} per BOM ID: ${bomId}, versione: ${versionToUse}`,
        );

        // Prima di caricare nuovi dati, resetta gli stati se si tratta di una nuova versione
        if (currentVersionRef.current !== versionToUse) {
          if (action === "GET_BOM_FULL") {
            setBom(null);
          }
          if (action === "GET_BOM_MULTILEVEL" || action === "GET_BOM_FULL") {
            setBomComponents([]);
            setBomRouting([]);
          }
        }

        // Set default options
        const mergedOptions = {
          maxLevel: 10,
          includeRouting: true,
          expandPhantoms: true,
          ...options,
        };

        // Fai la richiesta API passando ESPLICITAMENTE la versione da usare
        const data = await projectArticlesActions.getBOMData(
          action,
          bomId,
          null, // itemId
          versionToUse, // passa esplicitamente la versione corretta
          mergedOptions, // options
        );

        // Se il componente è stato smontato durante la chiamata, esci
        if (!isMounted.current) {
          return null;
        }

        // Log della risposta per debug
        console.log(
          `[${requestId}] Risposta per ${action}:`,
          data ? "Dati ricevuti" : "Nessun dato",
        );

        // Se abbiamo dati, aggiorna lo stato
        if (data) {
          // Aggiorna lo stato in base al tipo di azione
          if (action === "GET_BOM_MULTILEVEL") {
            // Gestione dei dati multilivello
            if (data.components && Array.isArray(data.components)) {
              setBomComponents(data.components);
            } else if (Array.isArray(data)) {
              setBomComponents(data);
            } else {
              // Se non ci sono componenti, resetta esplicitamente
              setBomComponents([]);
            }

            if (data.routing && Array.isArray(data.routing)) {
              setBomRouting(data.routing);
            } else {
              // Se non ci sono cicli, resetta esplicitamente
              setBomRouting([]);
            }
          } else if (action === "GET_BOM_FULL") {
            // Aggiorniamo i dati completi
            if (data.header) {
              // Verifica che la versione corrisponda a quella richiesta
              const headerVersion = parseInt(data.header.Version, 10) || 1;
              const requestedVersion = parseInt(versionToUse, 10) || 1;

              console.log(
                `[${requestId}] Versione header: ${headerVersion}, richiesta: ${requestedVersion}`,
              );

              if (headerVersion === requestedVersion) {
                // Aggiorna l'header
                setBom(data.header);
                // Assicurati che selectedBomVersion e selectedBomId siano sincronizzati
                setSelectedBomVersion(headerVersion);
                setSelectedBomId(data.header.Id);
              } else {
                console.warn(
                  `[${requestId}] Versione nei dati ricevuti (${headerVersion}) non corrisponde a quella richiesta (${requestedVersion})`,
                );
              }
            } else {
              // Se non c'è header, resetta
              setBom(null);
            }

            // Gestisci i componenti e i cicli
            if (Array.isArray(data.components)) {
              setBomComponents(data.components);
            } else {
              // Se non ci sono componenti, resetta esplicitamente
              setBomComponents([]);
            }

            if (Array.isArray(data.routing)) {
              setBomRouting(data.routing);
            } else {
              // Se non ci sono cicli, resetta esplicitamente
              setBomRouting([]);
            }
          }

          // Imposta il flag di caricamento completato e l'ultimo BOM ID
          didFetchRef.current = true;
          lastLoadedBomId.current = bomId;
          currentVersionRef.current = versionToUse;
        } else {
          // Se non ci sono dati, resetta gli stati
          if (action === "GET_BOM_FULL") {
            setBom(null);
          }
          setBomComponents([]);
          setBomRouting([]);
        }

        return data;
      } catch (error) {
        console.error(`Error in loadBOMData #${requestId}:`, error);
        if (isMounted.current) {
          toast({
            title: "Error",
            description:
              "Unable to load BOM data: " + (error.message || "Unknown error"),
            variant: "destructive",
          });

          // In caso di errore, resetta gli stati
          if (action === "GET_BOM_FULL") {
            setBom(null);
          }
          setBomComponents([]);
          setBomRouting([]);
        }
        return null;
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [
      selectedBomId,
      projectArticlesActions,
      selectedBomVersion,
      toast,
      setBom,
      setBomComponents,
      setBomRouting,
      setLoading,
      setSelectedBomVersion,
      setSelectedBomId,
    ],
  );

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      // Carica solo se abbiamo un BOM ID e non abbiamo già caricato
      if (
        selectedBomId &&
        !didFetchRef.current &&
        isMounted.current &&
        !loadInProgress.current
      ) {
        // Imposta flag per prevenire chiamate parallele
        loadInProgress.current = true;

        try {
          // Resetta gli stati per evitare dati residui
          setBomComponents([]);
          setBomRouting([]);

          console.log(
            "Caricamento dati iniziale con selectedBomVersion:",
            selectedBomVersion,
          );

          // Prima carica i dati completi
          await loadBOMData(
            "GET_BOM_FULL",
            { version: selectedBomVersion },
            true,
          );

          // Poi carica la struttura multilivello
          if (isMounted.current) {
            await loadBOMData(
              "GET_BOM_MULTILEVEL",
              {
                version: selectedBomVersion,
                maxLevel: 10,
                includeRouting: true,
                expandPhantoms: true,
              },
              true,
            );
          }

          // Imposta flag di completamento
          didFetchRef.current = true;
          currentVersionRef.current = selectedBomVersion;
        } catch (error) {
          console.error("Error in initial load:", error);

          // Resetta gli stati in caso di errore
          setBom(null);
          setBomComponents([]);
          setBomRouting([]);
        } finally {
          loadInProgress.current = false;
        }
      }
    };

    loadInitialData();

    // Dipendenza da selectedBomId E selectedBomVersion per ricaricare quando cambia versione
  }, [selectedBomId, selectedBomVersion]);

  // Get BOM by ItemId function migliorata
  const getBOMByItemId = useCallback(
    async (itemId, version = null, action = "GET_BOM_FULL", options = {}) => {
      if (!isMounted.current) return null;

      try {
        setLoading(true);

        // Get BOM data for the item, assicurandosi che la versione sia passata correttamente
        const versionToUse =
          version !== null ? version : selectedBomVersion || 1;

        console.log(
          `Richiesta getBOMByItemId per item ${itemId}, versione ${versionToUse}`,
        );

        const data = await projectArticlesActions.getBOMByItemId(
          itemId,
          versionToUse, // Usa la versione specificata o fallback a quella corrente o 1
          action,
          options,
        );

        // Aggiorna la versione corrente nelle referenze
        if (version !== null) {
          currentVersionRef.current = version;
        }

        return data;
      } catch (error) {
        console.error(`Error getting BOM for ItemId (${action}):`, error);
        return null;
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [projectArticlesActions, selectedBomVersion],
  );

  // Refresh reference lists function
  const refreshReferenceLists = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      // Load BOMs from ERP
      const erpData = await projectArticlesActions.getERPBOMs();
      if (Array.isArray(erpData) && isMounted.current) {
        setErpBOMs(erpData);
      }

      // In a real implementation, we would also load:
      // - Project BOMs
      // - Reference BOMs
    } catch (error) {
      console.error("Error loading reference lists:", error);
    }
  }, [projectArticlesActions]);

  // In BOMViewerContext.jsx - funzione di refresh intelligente per operazioni CRUD
  const smartRefresh = useCallback(async () => {
    if (!selectedBomId || !isMounted.current) return;

    try {
      // 1. Salva lo stato corrente dell'interfaccia
      const currentState = {
        expandedNodes: { ...expandedNodes },
        selectedNodeId: selectedNode?.id,
        activeTab,
        searchQuery: "", // Questo dovrà essere passato dal componente che ha il campo di ricerca
      };

      // 2. Resetta flag per permettere il ricaricamento dei dati
      didFetchRef.current = false;

      // 3. Esegui il refresh dei dati
      setLoading(true);

      // Prima aggiorna l'header con la versione corrente
      const headerData = await projectArticlesActions.getBOMByItemId(
        item.Id,
        selectedBomVersion,
      );

      if (headerData && headerData.header) {
        setBom(headerData.header);
      } else {
        // Se non ci sono dati, resetta l'header
        setBom(null);
      }

      // Poi carica i dettagli completi
      await loadBOMData("GET_BOM_FULL", { version: selectedBomVersion }, true);

      // Carica anche la struttura multilivello per aggiornare la vista dell'albero
      await loadBOMData(
        "GET_BOM_MULTILEVEL",
        {
          version: selectedBomVersion,
          maxLevel: 10,
          includeRouting: true,
          expandPhantoms: true,
        },
        true,
      );

      // 4. Ripristina lo stato dell'interfaccia
      if (isMounted.current) {
        // Ripristina i nodi espansi
        setExpandedNodes(currentState.expandedNodes);

        // Se c'era un nodo selezionato, trova il nuovo nodo corrispondente
        if (currentState.selectedNodeId) {
          // Cerca il nodo con lo stesso ID nei nuovi dati
          // Questo richiede un helper per cercare nei nuovi dati dell'albero
          const findNodeInNewData = (nodeId) => {
            // Implementazione della ricerca (potresti estrarre questo in una funzione helper)
            // Cerca prima per id diretto, poi per path o altri attributi
            const parts = nodeId.split("-");
            if (parts.length >= 3) {
              const compId = parts[1];
              const line = parts[2];

              // Cerca nei componenti caricati
              for (const comp of bomComponents) {
                if (
                  comp.ComponentId === parseInt(compId) &&
                  comp.Line === parseInt(line)
                ) {
                  return {
                    id: nodeId,
                    data: comp,
                  };
                }
              }
            }
            return null;
          };

          const newSelectedNode = findNodeInNewData(
            currentState.selectedNodeId,
          );
          if (newSelectedNode) {
            setSelectedNode(newSelectedNode);
          }
        }

        // Ripristina la tab attiva
        setActiveTab(currentState.activeTab);
      }

      return true;
    } catch (error) {
      console.error("Error during smart refresh:", error);
      return false;
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [
    selectedBomId,
    expandedNodes,
    selectedNode,
    activeTab,
    loadBOMData,
    item,
    selectedBomVersion,
    projectArticlesActions,
    bomComponents,
    setBom,
    didFetchRef,
  ]);

  // funzione per aggiornare i dettagli dell'articolo
  const updateItemDetails = useCallback(
    async (itemId, itemData) => {
      if (!itemId || !isMounted.current) return false;

      try {
        setLoading(true);

        // Chiama l'API per aggiornare i dettagli dell'articolo
        const result = await projectArticlesActions.updateItemDetails(
          itemId,
          itemData,
        );

        if (result.success) {
          // Mostra un messaggio di successo
          toast({
            title: "Dettagli articolo aggiornati",
            description:
              "I dettagli dell'articolo sono stati aggiornati con successo",
            variant: "success",
          });

          // Ricarica i dati aggiornati
          await smartRefresh();
          return true;
        } else {
          throw new Error(
            result.msg || "Errore nell'aggiornamento dei dettagli articolo",
          );
        }
      } catch (error) {
        console.error("Error updating item details:", error);

        if (isMounted.current) {
          toast({
            title: "Errore",
            description:
              error.message ||
              "Si è verificato un errore durante l'aggiornamento dei dettagli articolo",
            variant: "destructive",
          });
        }

        return false;
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [projectArticlesActions, smartRefresh, toast, setLoading],
  );

  // Get ERP BOMs function
  const getERPBOMs = useCallback(
    async (search = "") => {
      try {
        const data = await projectArticlesActions.getERPBOMs(search);
        return data;
      } catch (error) {
        console.error("Error getting ERP BOMs:", error);
        return [];
      }
    },
    [projectArticlesActions],
  );

  // Get reference BOMs function
  const getReferenceBOMs = useCallback(
    async (filters = {}, page = 1, pageSize = 10) => {
      try {
        const data = await projectArticlesActions.getReferenceBOMs(
          filters,
          page,
          pageSize,
        );
        return data;
      } catch (error) {
        console.error("Error getting reference BOMs:", error);
        return {
          items: [],
          pagination: { currentPage: page, totalPages: 1, totalItems: 0 },
        };
      }
    },
    [projectArticlesActions],
  );

  // Handle component action function
  const handleComponentAction = useCallback(
    async (action, data) => {
      if (!selectedBomId) {
        toast({
          title: "Error",
          description: "No BOM selected",
          variant: "destructive",
        });
        return false;
      }
      console.log(`FUNZIONE handleComponentAction `);
      if (!isMounted.current) return false;

      try {
        setLoading(true);

        // Prepare data with BOM ID
        const componentData = {
          Id: selectedBomId,
          ...data,
        };
        console.log(`Handling action: ${action}`, componentData);
        // Execute the requested action
        const result = await projectArticlesActions.addUpdateBOM(
          action,
          componentData,
        );

        if (result && result.success && isMounted.current) {
          // Action completed successfully
          const messages = {
            ADD_COMPONENT: "Component added successfully",
            UPDATE_COMPONENT: "Component updated successfully",
            DELETE_COMPONENT: "Component deleted successfully",
            ADD_ROUTING: "Routing added successfully",
            UPDATE_ROUTING: "Routing updated successfully",
            DELETE_ROUTING: "Routing deleted successfully",
          };

          toast({
            title: "Operation completed",
            description: messages[action] || "Operation completed successfully",
            variant: "success",
          });

          // Usa smartRefresh invece di loadBOMData
          await smartRefresh();

          // Execute refresh callback if provided
          if (onRefresh) onRefresh();

          return true;
        } else {
          throw new Error(result?.msg || `Error during ${action} operation`);
        }
      } catch (error) {
        console.error(`Error in ${action} operation:`, error);
        if (isMounted.current) {
          toast({
            title: "Error",
            description:
              error.message || `An error occurred during ${action} operation`,
            variant: "destructive",
          });
        }
        return false;
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [selectedBomId, projectArticlesActions, smartRefresh, onRefresh, toast],
  );

  // Gestione rimozione componenti selezionati
  const handleRemoveComponents = useCallback(
    async (components) => {
      if (!selectedBomId || !components.length) return;

      try {
        setLoading(true);

        // Elimina un componente alla volta
        for (const component of components) {
          if (component.data && component.data.Line) {
            // Usa il BOMId specifico del componente o del suo padre
            const bomIdToUse =
              component.data.ParentBOMId ||
              component.data.BOMId ||
              selectedBomId;
            console.log(
              `Rimozione componente ${component.data.Line} da BOM ID ${bomIdToUse}`,
            );
            await projectArticlesActions.addUpdateBOM("DELETE_COMPONENT", {
              Id: bomIdToUse, // Ora usa il BOMId corretto per questo specifico componente
              Line: component.data.Line,
            });
          }
        }

        // Ricarica i dati con smartRefresh
        await smartRefresh();

        // Deseleziona tutti i componenti
        setSelectedComponents([]);

        toast({
          title: "Componenti rimossi",
          description: `${components.length} componenti rimossi con successo`,
          variant: "success",
        });
      } catch (error) {
        console.error("Errore nella rimozione dei componenti:", error);
        toast({
          title: "Errore",
          description: `Errore nella rimozione dei componenti: ${error.message}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [selectedBomId, smartRefresh, projectArticlesActions, toast],
  );

  // Gestione aggiunta componente sotto a un componente selezionato
  const handleAddComponentBelow = useCallback(
    async (component) => {
      if (!selectedBomId || !component) return;

      try {
        setLoading(true);

        // Ottieni il codice componente nuovo
        const newComponentCode = prompt(
          "Inserisci il codice del nuovo componente:",
        );
        if (!newComponentCode) return;

        // Crea il nuovo componente subito dopo il componente selezionato
        const currentLine = component.data.Line || 0;

        // Se necessario, riordina gli altri componenti per fare spazio
        // Questo è un esempio semplice, in una implementazione reale useresti la logica di riordinamento

        // Aggiungi il nuovo componente
        await projectArticlesActions.addUpdateBOM("ADD_COMPONENT", {
          Id: selectedBomId,
          ComponentCode: newComponentCode,
          ComponentType: 7798784, // Articolo
          Quantity: 1,
          UoM: "PZ",
          ParentComponentId: component.data.ComponentId, // Indica che questo è un figlio del componente selezionato
        });

        // Ricarica i dati con smartRefresh
        await smartRefresh();

        // Deseleziona tutti i componenti
        setSelectedComponents([]);

        toast({
          title: "Componente aggiunto",
          description: "Nuovo componente aggiunto con successo",
          variant: "success",
        });
      } catch (error) {
        console.error("Errore nell'aggiunta del componente:", error);
        toast({
          title: "Errore",
          description: `Errore nell'aggiunta del componente: ${error.message}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      selectedBomId,
      smartRefresh,
      projectArticlesActions,
      toast,
      setSelectedComponents,
    ],
  );

  // Component-specific functions
  const addComponent = useCallback(
    (data) => {
      return handleComponentAction("ADD_COMPONENT", data);
    },
    [handleComponentAction],
  );

  const updateComponent = useCallback(
    (line, data) => {
      return handleComponentAction("UPDATE_COMPONENT", { Line: line, ...data });
    },
    [handleComponentAction],
  );

  const reorderBOMRoutings = useCallback(
    async (bomId, cycles) => {
      if (!bomId || !Array.isArray(cycles)) {
        toast({
          title: "Errore",
          description: "Parametri non validi per il riordinamento",
          variant: "destructive",
        });
        return { success: 0 };
      }

      try {
        setLoading(true);
        const result = await projectArticlesActions.reorderBOMRoutings(
          bomId,
          cycles,
        );

        if (result.success) {
          // Ricarica i dati con smartRefresh per aggiornare anche i componenti
          await smartRefresh();
        }

        return result;
      } catch (error) {
        console.error("Errore nel riordinamento dei cicli:", error);
        toast({
          title: "Errore",
          description:
            error.message ||
            "Si è verificato un errore durante il riordinamento dei cicli",
          variant: "destructive",
        });
        return { success: 0 };
      } finally {
        setLoading(false);
      }
    },
    [projectArticlesActions, smartRefresh, setLoading, toast],
  );

  // Create the functions from the hook factories OUTSIDE the component
  // We're only using the factory functions to create regular functions, not hooks
  const bomDataFunctions = createBOMDataHook({
    selectedBomId,
    setLoading,
    setBom,
    setBomComponents,
    setBomRouting,
    getBOMData: projectArticlesActions.getBOMData,
  });

  const bomEditorFunctions = createBOMEditorHook({
    selectedBomId,
    setLoading,
    addUpdateBOM: projectArticlesActions.addUpdateBOM,
    loadBOMData,
    toast,
  });

  const bomDragDropFunctions = createBOMDragDropHook({
    selectedBomId,
    addComponent,
    reorderBOMComponents: projectArticlesActions.reorderBOMComponents,
    setLoading,
    toast,
  });

  // Prepare the context value with all functionality
  const contextValue = {
    // Props
    item,
    project,
    canEdit,
    onRefresh,

    // BOM data
    loading,
    setLoading,
    bom,
    setBom,
    bomComponents,
    setBomComponents,
    bomRouting,
    setBomRouting,
    selectedBomId,
    setSelectedBomId,
    selectedBomVersion,
    setSelectedBomVersion,
    availableVersions,
    setAvailableVersions,

    // Tree view state
    expandedNodes,
    setExpandedNodes,
    selectedNode,
    setSelectedNode,

    // Edit mode
    editMode,
    setEditMode,
    activeTab,
    setActiveTab,

    // Reference BOMs
    erpBOMs,
    setErpBOMs,
    projectBOMs,
    setProjectBOMs,
    referenceBOMs,
    setReferenceBOMs,
    referenceFilter,
    setReferenceFilter,
    pagination,
    setPagination,

    // Master data
    workCenters,
    operations,
    suppliers,
    loadMasterData,

    // API functions
    loadBOMData,
    getBOMByItemId,
    getERPBOMs,
    getReferenceBOMs,
    refreshReferenceLists,
    smartRefresh,

    // Component operations
    addComponent,
    updateComponent,

    // Routing operations
    getBOMVersions,
    // Functions from hook factories
    loadMultilevelBOM: bomDataFunctions.loadMultilevelBOM,
    handleDrop: bomDragDropFunctions.handleDrop,
    reorderComponents: bomDragDropFunctions.reorderComponents,

    selectedComponents,
    setSelectedComponents,
    handleRemoveComponents,
    handleAddComponentBelow,

    // Include other useful functions from the API
    ...projectArticlesActions,

    reorderBOMRoutings,

    unitsOfMeasure,
    loadUnitsOfMeasure,
    updateItemDetails,

    pendingChanges,
    setPendingChanges,
  };

  return (
    <BOMViewerContext.Provider value={contextValue}>
      {children}
    </BOMViewerContext.Provider>
  );
};

// Custom hook to use the context
export const useBOMViewer = () => {
  const context = useContext(BOMViewerContext);
  if (context === null) {
    throw new Error("useBOMViewer must be used within a BOMViewerProvider");
  }
  return context;
};
