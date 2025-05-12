// BOMViewer/components/BOMTreeView/index.jsx - Aggiornato per supportare drag and drop su distinte vuote
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useBOMViewer } from '../../context/BOMViewerContext';
import TreeNode from './TreeNode';
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Plus, 
  AlertCircle, 
  RefreshCw,
  Trash,
  Replace,
  Copy,
  Code,
  ClipboardList,
  X,
  Maximize,
  Minimize,
  SquareCheck,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { buildBOMTree } from '../../helpers/bomHelpers';
import EmptyBOMView from './EmptyBOMView';
import { toast } from '@/components/ui/use-toast';

// Dialogs
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';

const BOMTreeView = ({ draggingOver, dropTarget, dropMode, isOverEmptyBOM }) => {
  const { 
    selectedBomId, 
    loading, 
    bomComponents,
    bomRouting,
    expandedNodes,
    setExpandedNodes,
    selectedNode,
    setSelectedNode,
    loadBOMData,
    editMode,
    addComponent,
    getBOMData,
    item,
    selectedComponents,
    setSelectedComponents,
    handleRemoveComponents,
    handleReplaceWithTemporary,
    handleAddComponentBelow,
    smartRefresh,
    getERPItems,
    getAvailableItems,
    getReferenceBOMs,
    replaceWithNewComponent,
    replaceComponent
  } = useBOMViewer();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [treeData, setTreeData] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [directData, setDirectData] = useState(null);
  // Stato per tracciare se la vista è espansa o compressa
  const [isExpanded, setIsExpanded] = useState(false);

  // Nuovo stato per verificare se la distinta è vuota
  const [isEmpty, setIsEmpty] = useState(false);
  
  // Stati per dialoghi
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [replaceOption, setReplaceOption] = useState("");
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [showSelectDialog, setShowSelectDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("erp");
  const [searchDialogQuery, setSearchDialogQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [erpItems, setErpItems] = useState([]);
  const [projectItems, setProjectItems] = useState([]);
  
  const [showAddUnderDialog, setShowAddUnderDialog] = useState(false);
  const [showAddUnderManualDialog, setShowAddUnderManualDialog] = useState(false);
  const [showAddUnderSelectDialog, setShowAddUnderSelectDialog] = useState(false);
  // variabile di stato per il dialogo temporaneo
  const [showTempReplaceDialog, setShowTempReplaceDialog] = useState(false);
  const [tempReplaceCopyBOM, setTempReplaceCopyBOM] = useState(false);
  
  // Stati per i form
  const [manualData, setManualData] = useState({
    code: '',
    description: '',
    nature: '22413312', // Semilavorato di default
    uom: 'PZ',
    quantity: 1,
    copyBOM: false  // Campo per l'opzione di copia distinta
  });
  
  // Verifica componenti bloccati (dall'ERP)
  const hasLockedComponents = selectedComponents.some(comp => 
    comp.data.parentBOMStato_erp === '1' ||
    comp.data.parentBOMStato_erp === 1
  );
  
  // Statistiche sui componenti selezionati
  const lockedCount = selectedComponents.filter(comp => 
    comp.data.parentBOMStato_erp === '1' || 
    comp.data.parentBOMStato_erp === 1
  ).length;
  
  const modifiableCount = selectedComponents.length - lockedCount;
  
  // Ref per tracciare se i dati sono stati caricati per l'ID corrente
  const initialLoadDoneRef = useRef(false);
  
  // Helper per costruire una struttura ad albero dai componenti
  const buildComponentsTree = useCallback((components, routing = []) => {
    // Aggiungi un log iniziale con un contatore specifico per il debug
    const debugId = Date.now().toString().slice(-6);
    
    if (!Array.isArray(components) || components.length === 0) {
      console.warn(`[buildTree-${debugId}] No components or invalid components array`);
      return [];
    }
  
    // Prima clona l'array per evitare di modificare l'originale
    const componentsToProcess = JSON.parse(JSON.stringify(components));

    // Normalizziamo i dati per garantire consistenza
    componentsToProcess.forEach((comp, index) => {
      // Normalizza il campo Level
      if (comp.Level === undefined || comp.Level === null) {
        console.warn(`[buildTree-${debugId}] Component at index ${index} has no Level, setting default`);
        comp.Level = index === 0 ? 0 : 1; // Il primo è root, gli altri sono livello 1
      }
      
      // Normalizza l'ID del componente (può essere in diversi campi)
      if (!comp.ComponentId) {
        if (comp.ItemId) {
          console.warn(`[buildTree-${debugId}] Component at index ${index} has no ComponentId, using ItemId (${comp.ItemId})`);
          comp.ComponentId = comp.ItemId;
        } else {
          console.warn(`[buildTree-${debugId}] Component at index ${index} has no ComponentId or ItemId, generating unique id`);
          comp.ComponentId = `temp-${debugId}-${index}`;
        }
      }
      
      // Assicurati che ci sia un Line (numero riga) valido
      if (comp.Line === undefined || comp.Line === null) {
        console.warn(`[buildTree-${debugId}] Component at index ${index} has no Line, setting to index`);
        comp.Line = index;
      }
      
      // Assicurati che ci sia un Path valido
      if (!comp.Path) {
        if (comp.Level === 0 || comp.Level === 1) {
          comp.Path = comp.ComponentId.toString();
        } else {
          // Per livelli più alti, tenta di costruire il percorso in base ai componenti precedenti
          let pathFound = false;
          
          // Cerca un componente del livello superiore
          for (let i = index - 1; i >= 0; i--) {
            if (componentsToProcess[i].Level === comp.Level - 1) {
              let parentPath = componentsToProcess[i].Path || componentsToProcess[i].ComponentId.toString();
              comp.Path = `${parentPath}.${comp.ComponentId}`;
              pathFound = true;
              break;
            }
          }
          
          if (!pathFound) {
            comp.Path = comp.ComponentId.toString();
            console.warn(`[buildTree-${debugId}] No parent found for level ${comp.Level} component at index ${index}, using simple path: ${comp.Path}`);
          }
        }
      }
      
      // Normalizza altri campi importanti
      comp.ComponentType = comp.ComponentType || 7798784; // Default a "Articolo"
      comp.ComponentItemCode = comp.ComponentItemCode || comp.ComponentCode || '';
      comp.ComponentItemDescription = comp.ComponentItemDescription || comp.Description || comp.ComponentDescription || '';
    });
    
    // Mappa per tener traccia di componenti per Path e ID
    const nodeMap = {};
    const pathMap = {};
    const rootNodes = [];
    
    // Primo passaggio: crea tutti i nodi e mappa i path
    componentsToProcess.forEach((comp, index) => {
      // Crea un ID nodo univoco che includa sia ComponentId che Line
      // Useremo un ID con formato diverso per riconoscere facilmente il tipo di nodo
      const nodeId = `component-${comp.ComponentId}-${comp.Line}-${comp.Path.replace(/\./g, '-')}`;
      
      const node = {
        id: nodeId,
        type: 'component',
        level: comp.Level,
        data: comp,
        children: []
      };
      
      // Memorizza nella mappa per ID
      nodeMap[nodeId] = node;
      
      // Memorizza nella mappa per Path
      if (comp.Path) {
        pathMap[comp.Path] = node;
      }
      
      // Nodi radice (Livello 0 o 1 sono considerati root)
      if (comp.Level === 0 || comp.Level === 1) {
        rootNodes.push(node);
      }
    });
    
    // Secondo passaggio: stabilisci le relazioni padre-figlio
    componentsToProcess.forEach(comp => {
      // Salta i nodi radice
      if (comp.Level <= 1) return;
      
      const nodeId = `component-${comp.ComponentId}-${comp.Line}-${comp.Path.replace(/\./g, '-')}`;
      const currentNode = nodeMap[nodeId];
      
      if (!currentNode) {
        console.warn(`[buildTree-${debugId}] Node not found for ID: ${nodeId}`);
        return;
      }
      
      // Metodo primario: usa Path se disponibile
      let parentFound = false;
      if (comp.Path) {
        const pathParts = comp.Path.split('.');
        pathParts.pop(); // Rimuovi l'ultima parte (componente corrente)
        const parentPath = pathParts.join('.');
        
        if (parentPath) {
          const parentNode = pathMap[parentPath];
          
          if (parentNode) {
            parentNode.children.push(currentNode);
            parentFound = true;
          }
        }
      }
      
      // Se non abbiamo trovato il genitore tramite Path, usiamo il metodo basato sul livello
      if (!parentFound) {
        
        for (let i = index - 1; i >= 0; i--) {
          const potentialParent = componentsToProcess[i];
          if (potentialParent && potentialParent.Level === comp.Level - 1) {
            const parentId = `component-${potentialParent.ComponentId}-${potentialParent.Line}`;
            const parentNode = nodeMap[parentId];
            
            if (parentNode) {
              parentNode.children.push(currentNode);
              parentFound = true;
              break;
            }
          }
        }
        
        // Se non è stato trovato un genitore, aggiungi come nodo radice
        if (!parentFound) {
          console.warn(`[buildTree-${debugId}] No parent found for ${nodeId}, adding to root nodes`);
          if (!rootNodes.includes(currentNode)) {
            rootNodes.push(currentNode);
          }
        }
      }
    });
  
    // Terzo passaggio: ordina i nodi e prepara la struttura finale
    // Ordina i nodi radice per Line
    rootNodes.sort((a, b) => {
      const aLine = a.data.Line || 0;
      const bLine = b.data.Line || 0;
      return aLine - bLine;
    });
    
    // Funzione ricorsiva per ordinare i figli di ciascun nodo
    const sortNodeChildren = (node) => {
      if (node.children && node.children.length > 0) {
        node.children.sort((a, b) => {
          const aLine = a.data.Line || 0;
          const bLine = b.data.Line || 0;
          return aLine - bLine;
        });
        
        // Ordina ricorsivamente anche i figli dei figli
        node.children.forEach(sortNodeChildren);
      }
    };
    
    // Applica l'ordinamento a tutti i nodi radice
    rootNodes.forEach(sortNodeChildren);
    
    // Se non abbiamo nodi radice ma abbiamo componenti, prendi il primo componente come radice
    if (rootNodes.length === 0 && Object.keys(nodeMap).length > 0) {
      console.warn(`[buildTree-${debugId}] No root nodes found, using first component as root`);
      const firstNodeId = Object.keys(nodeMap)[0];
      return [nodeMap[firstNodeId]];
    }
    
    return rootNodes;
  }, []);
  
  // Funzione per caricare i dati direttamente
  const fetchDirectData = useCallback(async () => {
    if (!selectedBomId) return;
    
    try {
      setIsRefreshing(true);
      console.log('Fetching direct data for BOM ID with projectArticlesActions:', selectedBomId);
      const data = await getBOMData(
        'GET_BOM_MULTILEVEL', 
        selectedBomId, 
        null, 
        null, 
        {
          maxLevel: 10,
          includeRouting: true,
          expandPhantoms: true
        }
      );
  
      // Verifica la struttura della risposta ed estrai i componenti
      if (data) {
        let componentsArray = null;
        
        if (data.components && Array.isArray(data.components)) {
          componentsArray = [...data.components];
        } else if (Array.isArray(data)) {
          componentsArray = [...data];
        } else {
          // Cerca qualsiasi proprietà che potrebbe contenere un array di componenti
          if (typeof data === 'object') {
            const arrayProps = Object.keys(data).filter(key => 
              Array.isArray(data[key]) && data[key].length > 0);
            
            if (arrayProps.length > 0) {
              componentsArray = [...data[arrayProps[0]]];
            }
          }
        }
        
        if (componentsArray && componentsArray.length > 0) {
          setDirectData(componentsArray);
          
          // Costruisci subito l'albero usando i dati appena ottenuti
          try {
            const tree = buildBOMTree(componentsArray, data.routing || []);
            setTreeData(tree);
            
            // Espandi automaticamente i nodi di primo livello
            const firstLevelExpanded = {};
            tree.forEach(node => {
              firstLevelExpanded[node.id] = true;
            });
            setExpandedNodes(prev => ({...prev, ...firstLevelExpanded}));
          } catch (treeError) {
            console.error('Error building tree from direct data:', treeError);
          }
        } else {
          setDirectData(null);
          setIsEmpty(true); // Imposta lo stato vuoto quando non ci sono componenti
        }
      } else {
        console.warn('Direct fetch returned no data');
        setDirectData(null);
        setIsEmpty(true); // Imposta lo stato vuoto quando non ci sono componenti
      }
    } catch (error) {
      console.error('Error in direct fetch:', error);
      setLoadError(`Errore nel caricamento diretto dei dati: ${error.message}`);
      setDirectData(null);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedBomId, setDirectData, setTreeData, setExpandedNodes, setLoadError, setIsRefreshing, getBOMData, buildBOMTree]);

  // Reset del flag di caricamento quando cambia il BOM ID
  useEffect(() => {
    // Resetta il flag quando cambia l'ID così che si possa ricaricare
    initialLoadDoneRef.current = false;
  }, [selectedBomId]);
  
  // Caricamento iniziale dei dati
  useEffect(() => {
    const loadData = async () => {
      // Verifica che selectedBomId sia impostato e che non abbiamo già caricato i dati
      if (selectedBomId && !initialLoadDoneRef.current) {
        try {
          setLoadError(null);
          
          // Segnaliamo che il caricamento è stato avviato
          initialLoadDoneRef.current = true;
          
          // Forza immediata esecuzione con terzo parametro a true
          await loadBOMData('GET_BOM_MULTILEVEL', {
            maxLevel: 10,
            includeRouting: true,
            expandPhantoms: true
          }, true);
        } catch (error) {
          console.error('Error in initial BOM data load:', error);
          setLoadError(error.message || 'Errore nel caricamento dei dati della distinta');
          // Permettiamo un nuovo tentativo in caso di errore
          initialLoadDoneRef.current = false;
        }
      } else if (!selectedBomId && item?.Id) {
        // Aspetta un momento e riprova se item è definito ma selectedBomId no
        const timeoutId = setTimeout(() => {
          if (selectedBomId) {
            initialLoadDoneRef.current = false; // Resetta per permettere il caricamento
            loadData();
          } else {
            console.warn('selectedBomId still not set after retry, user may need to click refresh');
          }
        }, 500);
        
        // Cleanup del timeout
        return () => clearTimeout(timeoutId);
      }
    };
    
    loadData();
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBomId, item]);
  
  // Se bomComponents è vuoto ma abbiamo un selectedBomId, prova a caricare dati diretti
  useEffect(() => {
    if (selectedBomId && (!bomComponents || bomComponents.length === 0) && !directData) {
      fetchDirectData();
    }
  }, [selectedBomId, bomComponents, directData, fetchDirectData]);
  
  // Costruisci l'albero quando cambiano i componenti
  useEffect(() => {
    // Determina quali dati utilizzare: bomComponents o directData
    const componentsToUse = bomComponents && bomComponents.length > 0
      ? bomComponents
      : [];
      
    // Imposta isEmpty se non ci sono componenti
    setIsEmpty(componentsToUse.length === 0);
    
    if (componentsToUse && componentsToUse.length > 0) {
      try {
        const tree = buildComponentsTree(componentsToUse, bomRouting);
        setTreeData(tree);
      } catch (error) {
        console.error('Error building component tree:', error);
        setTreeData([]);
        setLoadError(`Errore nella costruzione dell'albero: ${error.message}`);
      }
    } else {
      setTreeData([]);
    }
  }, [bomComponents, bomRouting, directData, buildComponentsTree]);
  
  // Funzione per forzare il ricaricamento dei dati
  const handleRefresh = useCallback(async () => {
    if (!selectedBomId || isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      setLoadError(null);
      
      // Forziamo il ricaricamento con GET_BOM_FULL prima per assicurarci di avere i dati corretti
      await loadBOMData('GET_BOM_FULL');
      
      // Poi carichiamo la vista multilivello
      await loadBOMData('GET_BOM_MULTILEVEL', {
        maxLevel: 10,
        includeRouting: true,
        expandPhantoms: true
      });
      
    } catch (error) {
      console.error('Error during manual refresh:', error);
      setLoadError(error.message || 'Errore nel ricaricamento dei dati');
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedBomId, loadBOMData, isRefreshing]);
  
  // Funzione per handle aggiunta componente
  const handleAddComponent = async () => {
    if (!selectedBomId) return;
    
    try {
      if (item?.bomStato_erp === '1' || item?.bomStato_erp === 1) {
        toast({
          title: "Operazione non consentita",
          description: "Non è possibile aggiungere componenti a una distinta presente in ERP (Mago)",
          variant: "destructive"
        });
        return;
      }
      
      // Per semplicità, aggiungiamo un componente generico temporaneo
      const result = await addComponent(
        {
          createTempComponent: true,
          tempComponentPrefix: "",
          componentDescription: `Nuovo componente temporaneo`,
          quantity: 1,
          nature: 22413312, // Semilavorato
          uom: 'PZ',
          importBOM: true
        }
      );
      
      if (result.success) {
        toast({
          title: "Componente aggiunto",
          description: "Nuovo componente temporaneo aggiunto con successo",
          variant: "success"
        });
        
        // Ricarica i dati della distinta
        await smartRefresh();
      } else {
        throw new Error(result.msg || "Errore durante l'aggiunta del componente");
      }
    } catch (error) {
      console.error('Errore nell\'aggiunta del componente:', error);
      setLoadError(`Errore nell'aggiunta del componente: ${error.message}`);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiunta del componente",
        variant: "destructive"
      });
    }
  };
  
  // Funzioni di utility per la UI
  const deselectAll = () => {
    setSelectedComponents([]);
  };
  
  const expandAll = () => {
    const allNodes = {};
    
    // Funzione ricorsiva per raccogliere tutti gli ID dei nodi
    const collectNodeIds = (nodes) => {
      if (!Array.isArray(nodes)) return;
      
      nodes.forEach(node => {
        if (!node) return;
        allNodes[node.id] = true;
        if (node.children && node.children.length > 0) {
          collectNodeIds(node.children);
        }
      });
    };
    
    collectNodeIds(treeData);
    setExpandedNodes(allNodes);
    setIsExpanded(true);
  };
  
  const collapseAll = () => {
    setExpandedNodes({});
    setIsExpanded(false);
  };
  
  const toggleExpansion = () => {
    if (isExpanded) {
      collapseAll();
    } else {
      expandAll();
    }
  };
  
  // Helper per generare un ID univoco
  const generateUniqueNodeId = (node) => {
    if (!node || node.type !== 'component' || !node.data) {
      return node.id || 'unknown';
    }
    
    // Estrai tutti i dati rilevanti che potrebbero differenziare un nodo da un altro
    const componentId = node.data.ComponentId || '';
    const line = node.data.Line || '';
    const bomId = node.data.BOMId || '';
    
    // CRUCIALE: Utilizza il percorso completo e l'ID del nodo
    // Questo garantisce che due nodi con lo stesso componente ma in posizioni diverse siano distinti
    const path = node.data.Path || '';
    const nodeId = node.id || '';
    
    // Combina tutto in un ID veramente unico che considera la posizione esatta nell'albero
    return `${nodeId}|${bomId}|${componentId}|${line}|${path}`;
  };
  
  // Handler per la selezione dei nodi con checkbox
  const handleNodeCheck = useCallback((node, checked) => {
    if (node.type !== 'component') return;
    
    // Genera un ID realmente univoco che considera sia i dati che la posizione nell'albero
    const uniqueNodeId = generateUniqueNodeId(node);
    
    setSelectedComponents(prev => {
    
      if (checked) {
        // Verifica se questo nodo specifico è già presente nella selezione
        const alreadySelected = prev.some(comp => {
          // Usa l'ID salvato o rigeneralo se necessario
          const compUniqueId = comp._uniqueSelectionId || generateUniqueNodeId(comp);
          return compUniqueId === uniqueNodeId;
        });
        
        if (!alreadySelected) {
          // Aggiungi un nodo con un identificatore univoco incorporato
          const nodeWithUniqueId = {
            ...node,
            _uniqueSelectionId: uniqueNodeId
          };
          const newSelection = [...prev, nodeWithUniqueId];
          return newSelection;
        }
      } else {
        // Rimuovi solo il nodo specifico dalla selezione
        const newSelection = prev.filter(comp => {
          const compUniqueId = comp._uniqueSelectionId || generateUniqueNodeId(comp);
          return compUniqueId !== uniqueNodeId;
        });
        return newSelection;
      }
      return prev;
    });
  }, [setSelectedComponents]);
  
  // Funzioni per la UI
  const handleNodeToggle = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };
  
  const handleNodeSelect = (node) => {
    setSelectedNode(node);
  };
  
  // Filtra i nodi in base alla ricerca
  const filteredTreeData = React.useMemo(() => {
    if (!searchQuery.trim()) return treeData;
    
    const filtered = [];
    
    // Funzione ricorsiva per cercare nei nodi
    const searchInNodes = (nodes, path = []) => {
      if (!Array.isArray(nodes)) return;
      
      for (const node of nodes) {
        if (!node) continue;
        
        // Controlla se il nodo corrisponde alla ricerca
        const nodeText = node.type === 'component' 
          ? (node.data.ComponentItemCode || node.data.ComponentCode || '') + ' ' + 
            (node.data.ComponentItemDescription || node.data.Description || '')
          : `Fase ${node.data.RtgStep || ''} ${node.data.OperationDescription || node.data.Operation || ''}`;
        
        const match = nodeText.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Se corrisponde, aggiungi al risultato
        if (match) {
          // Se il nodo ha un percorso, crea una copia dell'intero percorso
          if (path.length > 0) {
            // Aggiungi tutti i nodi del percorso se non sono già presenti
            for (const pathNode of path) {
              if (!filtered.some(n => n.id === pathNode.id)) {
                filtered.push({...pathNode, children: []});
              }
            }
          }
          
          // Aggiungi il nodo corrente
          if (!filtered.some(n => n.id === node.id)) {
            filtered.push({...node, children: []});
          }
        }
        
        // Ricerca nei figli
        if (node.children && node.children.length > 0) {
          searchInNodes(node.children, [...path, node]);
        }
      }
    };
    
    searchInNodes(treeData);
    return filtered;
  }, [treeData, searchQuery]);
  
  // Funzioni per la ricerca e la manipolazione di articoli
  const handleSearchItems = async () => {
    try {
      setIsSearching(true);
      
      if (activeTab === "erp") {
        const items = await getERPItems(searchDialogQuery);
        setErpItems(Array.isArray(items) ? items : []);
      } else if (activeTab === "projects") {
        const items = await getAvailableItems(searchDialogQuery);
        setProjectItems(Array.isArray(items) ? items : []);
      }
    } catch (error) {
      console.error('Errore nella ricerca articoli:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la ricerca degli articoli",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Renderizzazione del componente
  // Se la distinta è vuota, mostra l'EmptyBOMView
  if (isEmpty) {
    return <EmptyBOMView />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Barra azioni */}
      <div className="p-2 border-b flex flex-col gap-2">
        {/* Barra di ricerca e refresh */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Cerca componenti..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Ricarica dati"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Pulsanti per espansione/aggiunta */}
        <div className="flex gap-1 items-center">
          {/* Toggle espansione/compressione */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleExpansion}
            className="flex-1"
            disabled={treeData.length === 0}
            title={isExpanded ? "Comprimi tutto" : "Espandi tutto"}
          >
            {isExpanded ? (
              <>
                <Minimize className="h-3.5 w-3.5 mr-1" />
                Comprimi
              </>
            ) : (
              <>
                <Maximize className="h-3.5 w-3.5 mr-1" />
                Espandi
              </>
            )}
          </Button>
          
          {/* Pulsante "Deseleziona tutti" */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={deselectAll}
            className="flex-1"
            disabled={selectedComponents.length === 0}
          >
            <SquareCheck className="h-3.5 w-3.5 mr-1" />
            Deseleziona
          </Button>
          
          {/* Dropdown con le azioni */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-shrink-0"
                >
                  <ClipboardList className="h-3.5 w-3.5 mr-1" />
                  Azioni
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setShowReplaceDialog(true)}
                  disabled={hasLockedComponents && modifiableCount === 0}
                >
                  <Replace className="h-4 w-4 mr-2" />
                  Sostituisci componenti
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={() => setShowAddUnderDialog(true)}
                  disabled={selectedComponents.length === 0}
                >
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Aggiungi componente sotto
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600"
                  disabled={hasLockedComponents && modifiableCount === 0}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Rimuovi componenti
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
        
      </div>
      
      {/* Albero distinta */}
      <div className="flex-1 overflow-auto p-2">
        {/* Mostra i risultati filtrati o l'intero albero */}
        {(searchQuery.trim() ? filteredTreeData : treeData).length > 0 ? (
          <div className="mt-2">
            {(searchQuery.trim() ? filteredTreeData : treeData).map(node => (
              <TreeNode
                key={node.id}
                node={node}
                expanded={!!expandedNodes[node.id]}
                selected={selectedNode?.id === node.id}
                onSelect={handleNodeSelect}
                onToggle={handleNodeToggle}
                onNodeCheck={handleNodeCheck}
                draggingOver={draggingOver}
                dropTarget={dropTarget}
                dropMode={dropMode}
              />
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-gray-500 flex flex-col items-center">
            {searchQuery.trim() 
              ? 'Nessun componente corrisponde alla ricerca'
              : (
                <>
                  <p>Nessun componente trovato nella distinta</p>
                  { editMode && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAddComponent}
                      className="mt-4"
                      disabled={item?.bomStato_erp === '1' || item?.bomStato_erp === 1}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Aggiungi un componente
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={fetchDirectData}
                    className="mt-2"
                    disabled={isRefreshing || loading}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Carica i dati direttamente
                  </Button>
                </>
              )
            }
          </div>
        )}
      </div>
      
      {/* Dialog di conferma eliminazione */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Sei sicuro di voler eliminare {modifiableCount} componenti?
            {hasLockedComponents && (
              <div className="mt-2 p-2 bg-amber-50 rounded text-sm flex items-start">
                <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Nota:</strong> {lockedCount} componenti sono protetti e non verranno eliminati.
                </div>
              </div>
            )}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Annulla</Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                await handleRemoveComponents(selectedComponents);
                setShowDeleteConfirm(false);
              }}
            >
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog per scegliere il tipo di operazione (replace) */}
      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Scegli tipo di sostituzione</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div 
              className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
              onClick={() => {
                setReplaceOption("temp");
                setShowReplaceDialog(false);
                setTempReplaceCopyBOM(false);
                setShowTempReplaceDialog(true);
              }}
            >
              <div className="flex items-center gap-2 font-medium text-blue-600">
                <Code className="h-4 w-4" />
                Sostituisci con nuovi codici temporanei
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Ogni componente viene sostituito con un nuovo codice temporaneo
              </p>
            </div>
            
            <div 
              className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
              onClick={() => {
                setReplaceOption("manual");
                setShowReplaceDialog(false);
                setManualData({
                  code: '',
                  description: '',
                  nature: '22413312',
                  uom: 'PZ',
                  copyBOM: true
                });
                setShowManualDialog(true);
              }}
            >
              <div className="flex items-center gap-2 font-medium text-green-600">
                <Copy className="h-4 w-4" />
                Sostituisci tutti con lo stesso codice manuale
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Tutti i componenti selezionati vengono sostituiti con lo stesso codice
              </p>
            </div>
            
            <div 
              className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
              onClick={() => {
                setReplaceOption("existing");
                setShowReplaceDialog(false);
                setShowSelectDialog(true);
                setActiveTab("erp");
                handleSearchItems();
              }}
            >
              <div className="flex items-center gap-2 font-medium text-amber-600">
                <Replace className="h-4 w-4" />
                Sostituisci tutti con un codice esistente
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Tutti i componenti selezionati vengono sostituiti con un codice esistente
              </p>
            </div>
            
            {hasLockedComponents && (
              <div className="mt-2 p-2 bg-amber-50 rounded text-sm flex items-start">
                <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Nota:</strong> {lockedCount} componenti sono protetti e non verranno modificati.
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowReplaceDialog(false)}
            >
              Annulla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per conferma e opzioni di sostituzione con temporaneo */}
      <Dialog
        open={showTempReplaceDialog}
        onOpenChange={setShowTempReplaceDialog}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Opzioni sostituzione con codice temporaneo</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p className="text-sm text-gray-500">
              Stai per sostituire {modifiableCount} componenti con nuovi codici temporanei.
            </p>
            
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="tempCopyBOM" 
                checked={tempReplaceCopyBOM}
                onCheckedChange={(checked) => setTempReplaceCopyBOM(checked)}
                className="h-4 w-4 bg-primary"
              />
              <Label htmlFor="tempCopyBOM" className="cursor-pointer">
                Copia distinta del componente originale
              </Label>
            </div>
            
            {hasLockedComponents && (
              <div className="mt-2 p-2 bg-amber-50 rounded text-sm flex items-start">
                <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Nota:</strong> {lockedCount} componenti sono protetti e non verranno modificati.
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowTempReplaceDialog(false)}
            >
              Annulla
            </Button>
            <Button 
              onClick={async () => {
                // Filtra solo i componenti modificabili
                const componentsToReplace = selectedComponents.filter(comp => 
                  comp.data.parentBOMStato_erp !== '1' &&
                  comp.data.parentBOMStato_erp !== 1
                );
                
                if (componentsToReplace.length === 0) {
                  toast({
                    title: "Nessun componente da sostituire",
                    description: "Tutti i componenti selezionati sono protetti",
                    variant: "warning"
                  });
                  setShowTempReplaceDialog(false);
                  return;
                }
                
                // Mostra indicatore di caricamento
                setIsRefreshing(true);
                
                try {
                  for (const component of componentsToReplace) {
                    await replaceWithNewComponent(
                      component.data.ParentBOMId || component.data.BOMId,
                      component.data.Line,
                      {
                        createTempComponent: true,
                        tempComponentPrefix: "",
                        Description: `Temporaneo per ${component.data.ComponentItemCode || 'componente'}`,
                        Quantity: component.data.Quantity || 1,
                        Nature: 22413312,
                        BaseUoM: component.data.UoM || 'PZ',
                        CopyBOM: tempReplaceCopyBOM
                      }
                    );
                  }
                  
                  // Ricarica i dati
                  await smartRefresh();
                  
                  toast({
                    title: "Sostituzione completata",
                    description: `Sostituiti ${componentsToReplace.length} componenti con codici temporanei`,
                    variant: "success"
                  });
                  
                  // Deseleziona tutti i componenti
                  setSelectedComponents([]);
                } catch (error) {
                  console.error('Errore durante la sostituzione:', error);
                  toast({
                    title: "Errore",
                    description: error.message || "Si è verificato un errore durante la sostituzione",
                    variant: "destructive"
                  });
                } finally {
                  setIsRefreshing(false);
                  setShowTempReplaceDialog(false);
                }
              }}
            >
              Sostituisci
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog per inserimento codice manuale */}
      <Dialog
        open={showManualDialog}
        onOpenChange={setShowManualDialog}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Inserisci nuovo codice manuale per tutti i componenti</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="manualCode">Codice Articolo*</Label>
                <Input 
                  id="manualCode" 
                  value={manualData.code}
                  onChange={(e) => setManualData({...manualData, code: e.target.value})}
                  placeholder="Inserisci un codice univoco"
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="manualDescription">Descrizione*</Label>
                <Input 
                  id="manualDescription" 
                  value={manualData.description}
                  onChange={(e) => setManualData({...manualData, description: e.target.value})}
                  placeholder="Descrizione del nuovo articolo"
                />
              </div>
              
              <div>
                <Label htmlFor="manualNature">Natura</Label>
                <Select 
                  value={manualData.nature}
                  onValueChange={(value) => setManualData({...manualData, nature: value})}
                >
                  <SelectTrigger id="manualNature">
                    <SelectValue placeholder="Natura articolo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="22413312">Semilavorato</SelectItem>
                    <SelectItem value="22413313">Prodotto Finito</SelectItem>
                    <SelectItem value="22413314">Acquisto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="manualUoM">Unità di Misura</Label>
                <Input 
                  id="manualUoM" 
                  value={manualData.uom}
                  onChange={(e) => setManualData({...manualData, uom: e.target.value})}
                  placeholder="PZ"
                />
              </div>
              
              {/* Checkbox per "Copia distinta" */}
              <div className="col-span-2 flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="copyBOM" 
                  checked={manualData.copyBOM}
                  onCheckedChange={(checked) => setManualData({...manualData, copyBOM: checked})}
                  className="h-4 w-4 bg-primary"
                />
                <Label htmlFor="copyBOM" className="cursor-pointer">
                  Copia distinta del componente originale
                </Label>
              </div>
            </div>
            
            {hasLockedComponents && (
              <div className="mt-2 p-2 bg-amber-50 rounded text-sm flex items-start">
                <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Nota:</strong> {lockedCount} componenti sono protetti e non verranno modificati.
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowManualDialog(false)}
            >
              Annulla
            </Button>
            <Button 
              onClick={async () => {
                if (!manualData.code || !manualData.description) {
                  toast({
                    title: "Dati incompleti",
                    description: "Codice e descrizione sono campi obbligatori",
                    variant: "destructive"
                  });
                  return;
                }
                
                // Filtra solo i componenti modificabili
                const componentsToReplace = selectedComponents.filter(comp => 
                  comp.data.parentBOMStato_erp !== '1' &&
                  comp.data.parentBOMStato_erp !== 1
                );
                
                if (componentsToReplace.length === 0) {
                  toast({
                    title: "Nessun componente da sostituire",
                    description: "Tutti i componenti selezionati sono protetti",
                    variant: "warning"
                  });
                  setShowManualDialog(false);
                  return;
                }
                
                setIsRefreshing(true);
                
                try {
                  if (componentsToReplace.length > 0) {
                    // Sostituisci il primo componente creando il nuovo articolo
                    const firstComponent = componentsToReplace[0];
                    
                    const firstResult = await replaceWithNewComponent(
                      firstComponent.data.ParentBOMId || firstComponent.data.BOMId,
                      firstComponent.data.Line,
                      {
                        Item: manualData.code,
                        Description: manualData.description,
                        Nature: parseInt(manualData.nature, 10),
                        BaseUoM: manualData.uom,
                        Quantity: firstComponent.data.Quantity || 1,
                        CopyBOM: manualData.copyBOM
                      }
                    );
                    
                    if (!firstResult.success) {
                      throw new Error(firstResult.msg || "Errore durante la sostituzione");
                    }
                    
                    // Ottieni info sul nuovo componente creato
                    const createdCode = firstResult.createdComponentCode || manualData.code;
                    
                    // Per gli altri componenti, usa replaceComponent con l'ID del componente creato
                    if (componentsToReplace.length > 1) {
                      // Cerca i dettagli del componente appena creato
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      
                      const referenceBOMsResult = await getReferenceBOMs(
                        { search: createdCode },
                        1,
                        50
                      );
                      
                      let newComponentId = null;
                      let newComponentCode = null;
                      
                      // Cerca nelle distinte di riferimento
                      if (referenceBOMsResult && referenceBOMsResult.items && Array.isArray(referenceBOMsResult.items)) {
                        const foundItem = referenceBOMsResult.items.find(b => 
                          b.ItemCode === manualData.code || b.ItemCode === createdCode
                        );
                        
                        if (foundItem) {
                          newComponentId = foundItem.ItemId;
                          newComponentCode = foundItem.ItemCode;
                        }
                      }
                      
                      // Se non trovato, cerca tra gli articoli ERP
                      if (!newComponentId) {
                        const erpItems = await getERPItems(createdCode);
                        
                        if (Array.isArray(erpItems)) {
                          const matchingItem = erpItems.find(item => 
                            item.Item === manualData.code || item.Item === createdCode
                          );
                          
                          if (matchingItem) {
                            newComponentId = matchingItem.Id;
                            newComponentCode = matchingItem.Item;
                          }
                        }
                      }
                      
                      // Se abbiamo trovato l'ID, sostituiamo gli altri componenti
                      if (newComponentId) {
                        for (let i = 1; i < componentsToReplace.length; i++) {
                          const component = componentsToReplace[i];
                          
                          await replaceComponent(
                            component.data.ParentBOMId || component.data.BOMId,
                            component.data.Line,
                            newComponentId,
                            newComponentCode
                          );
                        }
                      }
                    }
                    
                    // Chiudi il dialog e ricarica i dati
                    setShowManualDialog(false);
                    await smartRefresh();
                    
                    toast({
                      title: "Sostituzione completata",
                      description: `Sostituiti ${componentsToReplace.length} componenti con il codice ${manualData.code}`,
                      variant: "success"
                    });
                    
                    // Deseleziona tutti i componenti
                    setSelectedComponents([]);
                  }
                } catch (error) {
                  console.error('Errore durante la sostituzione:', error);
                  toast({
                    title: "Errore",
                    description: error.message || "Si è verificato un errore durante la sostituzione",
                    variant: "destructive"
                  });
                } finally {
                  setIsRefreshing(false);
                }
              }}
            >
              Sostituisci
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per selezione di un codice esistente */}
      <Dialog
        open={showSelectDialog}
        onOpenChange={setShowSelectDialog}
      >
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Seleziona codice esistente</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="erp">Codici ERP</TabsTrigger>
                <TabsTrigger value="projects">Codici Progetti</TabsTrigger>
              </TabsList>
              
              <div className="flex gap-2 mt-4">
                <div className="flex-1">
                  <Input 
                    placeholder="Cerca articolo..." 
                    value={searchDialogQuery}
                    onChange={(e) => setSearchDialogQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchItems()}
                  />
                </div>
                <Button onClick={handleSearchItems} disabled={isSearching}>
                  <Search className="h-4 w-4 mr-2" />
                  Cerca
                </Button>
              </div>
              
              <TabsContent value="erp" className="border rounded mt-2 max-h-[300px] overflow-auto">
                {isSearching ? (
                  <div className="p-4 text-center">
                    <p className="text-gray-500">Caricamento in corso...</p>
                  </div>
                ) : erpItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Nessun risultato trovato. Prova a cercare un codice.
                  </div>
                ) : (
                  <div className="divide-y">
                    {erpItems.map(item => (
                      <div 
                        key={item.Item} 
                        className="p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={async () => {
                          const item = {
                            Id: item.Id,
                            Item: item.Item
                          };
                          
                          // Filtra solo i componenti modificabili
                          const componentsToReplace = selectedComponents.filter(comp => 
                            comp.data.parentBOMStato_erp !== '1' &&
                            comp.data.parentBOMStato_erp !== 1
                          );
                          
                          if (componentsToReplace.length === 0) {
                            toast({
                              title: "Nessun componente da sostituire",
                              description: "Tutti i componenti selezionati sono protetti",
                              variant: "warning"
                            });
                            setShowSelectDialog(false);
                            return;
                          }
                          
                          setIsRefreshing(true);
                          
                          try {
                            for (const component of componentsToReplace) {
                              await replaceComponent(
                                component.data.ParentBOMId || component.data.BOMId,
                                component.data.Line,
                                item.Id,
                                item.Item
                              );
                            }
                            
                            // Chiudi il dialog e ricarica i dati
                            setShowSelectDialog(false);
                            await smartRefresh();
                            
                            toast({
                              title: "Sostituzione completata",
                              description: `Sostituiti ${componentsToReplace.length} componenti con il codice ${item.Item}`,
                              variant: "success"
                            });
                            
                            // Deseleziona tutti i componenti
                            setSelectedComponents([]);
                          } catch (error) {
                            console.error('Errore durante la sostituzione:', error);
                            toast({
                              title: "Errore",
                              description: error.message || "Si è verificato un errore durante la sostituzione",
                              variant: "destructive"
                            });
                          } finally {
                            setIsRefreshing(false);
                          }
                        }}
                      >
                        <div className="font-medium">{item.Item}</div>
                        <div className="text-sm text-gray-500">{item.Description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          UoM: {item.BaseUoM || 'PZ'} | Natura: {
                            item.Nature === 22413312 ? 'Semilavorato' : 
                            item.Nature === 22413313 ? 'Prodotto Finito' : 
                            item.Nature === 22413314 ? 'Acquisto' : 'Altro'
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="projects" className="border rounded mt-2 max-h-[300px] overflow-auto">
                {isSearching ? (
                  <div className="p-4 text-center">
                    <p className="text-gray-500">Caricamento in corso...</p>
                  </div>
                ) : projectItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Nessun risultato trovato. Prova a cercare un codice progetto.
                  </div>
                ) : (
                  <div className="divide-y">
                    {projectItems.map(item => (
                      <div 
                        key={item.Id} 
                        className="p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={async () => {
                          // Logica simile a quella per i codici ERP
                          // ...
                        }}
                      >
                        <div className="font-medium">{item.Item}</div>
                        <div className="text-sm text-gray-500">{item.Description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          UoM: {item.BaseUoM || 'PZ'} | Natura: {
                           item.Nature === 22413312 ? 'Semilavorato' : 
                           item.Nature === 22413313 ? 'Prodotto Finito' : 
                           item.Nature === 22413314 ? 'Acquisto' : 'Altro'
                         }
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </TabsContent>
             
             {hasLockedComponents && (
               <div className="mt-2 p-2 bg-amber-50 rounded text-sm flex items-start">
                 <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                 <div>
                   <strong>Nota:</strong> {lockedCount} componenti sono protetti e non verranno modificati.
                 </div>
               </div>
             )}
           </Tabs>
         </div>

         <DialogFooter>
           <Button 
             variant="outline" 
             onClick={() => setShowSelectDialog(false)}
           >
             Annulla
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>

     {/* Dialog per opzioni di "Aggiungi componente sotto" */}
     <Dialog
       open={showAddUnderDialog}
       onOpenChange={setShowAddUnderDialog}
     >
       <DialogContent className="sm:max-w-[400px]">
         <DialogHeader>
           <DialogTitle>Scegli tipo di componente da aggiungere sotto</DialogTitle>
         </DialogHeader>
         
         <div className="py-4 space-y-4">
           <div 
             className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
             onClick={async () => {
               setShowAddUnderDialog(false);
               
               // Filtra solo i componenti modificabili
               const componentsToModify = selectedComponents.filter(comp => 
                 comp.data.bomStato_erp !== '1' &&
                 comp.data.bomStato_erp !== 1
               );
               
               if (componentsToModify.length === 0) {
                 toast({
                   title: "Nessun componente disponibile",
                   description: "Tutti i componenti selezionati sono protetti",
                   variant: "warning"
                 });
                 return;
               }
               
               setIsRefreshing(true);
               
               try {
                 // Aggiungi un componente temporaneo sotto a ogni componente selezionato
                 for (const component of componentsToModify) {
                   await addComponent(
                     selectedBomId, 
                     {
                       createTempComponent: true,
                       tempComponentPrefix: "",
                       componentDescription: `Temporaneo sotto ${component.data.ComponentItemCode || 'componente'}`,
                       quantity: 1,
                       nature: 22413312, // Semilavorato
                       uom: component.data.UoM || 'PZ',
                       parentComponentId: component.data.ComponentId, // Collegamento al padre
                       importBOM: true
                     }
                   );
                 }
                 
                 // Ricarica i dati
                 await smartRefresh();
                 
                 toast({
                   title: "Operazione completata",
                   description: `Aggiunti ${componentsToModify.length} componenti temporanei`,
                   variant: "success"
                 });
                 
                 // Deseleziona tutti i componenti
                 setSelectedComponents([]);
               } catch (error) {
                 console.error('Errore durante l\'aggiunta:', error);
                 toast({
                   title: "Errore",
                   description: error.message || "Si è verificato un errore durante l'aggiunta dei componenti",
                   variant: "destructive"
                 });
               } finally {
                 setIsRefreshing(false);
               }
             }}
           >
             <div className="flex items-center gap-2 font-medium text-blue-600">
               <Code className="h-4 w-4" />
               Nuovo codice temporaneo
             </div>
             <p className="text-sm text-gray-500 mt-1">
               Crea automaticamente un nuovo codice temporaneo sotto ogni componente selezionato
             </p>
           </div>
           
           <div 
             className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
             onClick={() => {
               setShowAddUnderDialog(false);
               setShowAddUnderManualDialog(true);
               setManualData({
                 code: '',
                 description: '',
                 nature: '22413312',
                 uom: 'PZ',
                 quantity: 1
               });
             }}
           >
             <div className="flex items-center gap-2 font-medium text-green-600">
               <Plus className="h-4 w-4" />
               Nuovo codice manuale
             </div>
             <p className="text-sm text-gray-500 mt-1">
               Inserisci manualmente il codice da aggiungere sotto ogni componente selezionato
             </p>
           </div>
           
           <div 
             className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
             onClick={() => {
               setShowAddUnderDialog(false);
               setShowAddUnderSelectDialog(true);
               setActiveTab("erp");
               handleSearchItems();
             }}
           >
             <div className="flex items-center gap-2 font-medium text-amber-600">
               <Replace className="h-4 w-4" />
               Codice da ERP-Progetti
             </div>
             <p className="text-sm text-gray-500 mt-1">
               Seleziona un codice esistente da aggiungere sotto ogni componente selezionato
             </p>
           </div>
           
           {hasLockedComponents && (
             <div className="mt-2 p-2 bg-amber-50 rounded text-sm flex items-start">
               <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
               <div>
                 <strong>Nota:</strong> {lockedCount} componenti sono protetti e non saranno modificati.
               </div>
             </div>
           )}
         </div>
         
         <DialogFooter>
           <Button 
             variant="outline" 
             onClick={() => setShowAddUnderDialog(false)}
           >
             Annulla
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>

     {/* Dialog per inserimento manuale di un codice da aggiungere sotto */}
     <Dialog
       open={showAddUnderManualDialog}
       onOpenChange={setShowAddUnderManualDialog}
     >
       <DialogContent className="sm:max-w-[500px]">
         <DialogHeader>
           <DialogTitle>Inserisci codice da aggiungere sotto ai componenti selezionati</DialogTitle>
         </DialogHeader>
         
         <div className="py-4 space-y-4">
           <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2">
               <Label htmlFor="bulkAddCode">Codice Articolo*</Label>
               <Input 
                 id="bulkAddCode" 
                 value={manualData.code}
                 onChange={(e) => setManualData({...manualData, code: e.target.value})}
                 placeholder="Inserisci un codice univoco"
               />
             </div>
             
             <div className="col-span-2">
               <Label htmlFor="bulkAddDescription">Descrizione*</Label>
               <Input 
                 id="bulkAddDescription" 
                 value={manualData.description}
                 onChange={(e) => setManualData({...manualData, description: e.target.value})}
                 placeholder="Descrizione del nuovo articolo"
               />
             </div>
             
             <div>
               <Label htmlFor="bulkAddNature">Natura</Label>
               <Select 
                 value={manualData.nature}
                 onValueChange={(value) => setManualData({...manualData, nature: value})}
               >
                 <SelectTrigger id="bulkAddNature">
                   <SelectValue placeholder="Natura articolo" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="22413312">Semilavorato</SelectItem>
                   <SelectItem value="22413313">Prodotto Finito</SelectItem>
                   <SelectItem value="22413314">Acquisto</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             
             <div>
               <Label htmlFor="bulkAddUoM">Unità di Misura</Label>
               <Input 
                 id="bulkAddUoM" 
                 value={manualData.uom}
                 onChange={(e) => setManualData({...manualData, uom: e.target.value})}
                 placeholder="PZ"
               />
             </div>
             
             <div>
               <Label htmlFor="bulkAddQuantity">Quantità</Label>
               <Input 
                 id="bulkAddQuantity" 
                 type="number"
                 step="0.001"
                 min="0.001"
                 value={manualData.quantity}
                 onChange={(e) => setManualData({...manualData, quantity: parseFloat(e.target.value) || 1})}
                 placeholder="1"
               />
             </div>
           </div>
           
           {hasLockedComponents && (
             <div className="mt-2 p-2 bg-amber-50 rounded text-sm flex items-start">
               <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
               <div>
                 <strong>Nota:</strong> {lockedCount} componenti sono protetti e non saranno modificati.
               </div>
             </div>
           )}
         </div>
         
         <DialogFooter>
           <Button 
             variant="outline" 
             onClick={() => setShowAddUnderManualDialog(false)}
           >
             Annulla
           </Button>
           <Button 
             onClick={async () => {
               if (!manualData.code || !manualData.description) {
                 toast({
                   title: "Dati incompleti",
                   description: "Codice e descrizione sono campi obbligatori",
                   variant: "destructive"
                 });
                 return;
               }
               
               // Filtra solo i componenti modificabili
               const componentsToModify = selectedComponents.filter(comp => 
                 comp.data.parentBOMStato_erp !== '1' &&
                 comp.data.parentBOMStato_erp !== 1
               );
               
               if (componentsToModify.length === 0) {
                 toast({
                   title: "Nessun componente disponibile",
                   description: "Tutti i componenti selezionati sono protetti",
                   variant: "warning"
                 });
                 return;
               }
               
               setIsRefreshing(true);
               
               try {
                 for (const component of componentsToModify) {
                   await addComponent(
                     selectedBomId, 
                     {
                       ComponentCode: manualData.code,
                       ComponentDescription: manualData.description,
                       ComponentType: 7798784, // Articolo
                       Quantity: parseFloat(manualData.quantity) || 1,
                       UoM: manualData.uom,
                       Nature: parseInt(manualData.nature, 10),
                       ParentComponentId: component.data.ComponentId, // Collegamento al padre
                       ImportBOM: true,
                       createTempComponent: false
                     }
                   );
                 }
                 
                 // Chiudi il dialog e ricarica i dati
                 setShowAddUnderManualDialog(false);
                 await smartRefresh();
                 
                 toast({
                   title: "Operazione completata",
                   description: `Aggiunti ${componentsToModify.length} componenti manuali`,
                   variant: "success"
                 });
                 
                 // Deseleziona tutti i componenti
                 setSelectedComponents([]);
               } catch (error) {
                 console.error('Errore durante l\'aggiunta:', error);
                 toast({
                   title: "Errore",
                   description: error.message || "Si è verificato un errore durante l'aggiunta dei componenti",
                   variant: "destructive"
                 });
               } finally {
                 setIsRefreshing(false);
               }
             }}
           >
             Aggiungi sotto
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>

     {/* Dialog per selezione di un codice esistente da aggiungere sotto */}
     <Dialog
       open={showAddUnderSelectDialog}
       onOpenChange={setShowAddUnderSelectDialog}
     >
       <DialogContent className="sm:max-w-[650px]">
         <DialogHeader>
           <DialogTitle>Seleziona codice da aggiungere sotto ai componenti selezionati</DialogTitle>
         </DialogHeader>
         
         <div className="py-4 space-y-4">
           <Tabs value={activeTab} onValueChange={setActiveTab}>
             <TabsList className="grid w-full grid-cols-2">
               <TabsTrigger value="erp">Codici ERP</TabsTrigger>
               <TabsTrigger value="projects">Codici Progetti</TabsTrigger>
             </TabsList>
             
             <div className="flex gap-2 mt-4">
               <div className="flex-1">
                 <Input 
                   placeholder="Cerca articolo..." 
                   value={searchDialogQuery}
                   onChange={(e) => setSearchDialogQuery(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleSearchItems()}
                 />
               </div>
               <Button onClick={handleSearchItems} disabled={isSearching}>
                 <Search className="h-4 w-4 mr-2" />
                 Cerca
               </Button>
             </div>
             
             <TabsContent value="erp" className="border rounded mt-2 max-h-[300px] overflow-auto">
               {isSearching ? (
                 <div className="p-4 text-center">
                   <p className="text-gray-500">Caricamento in corso...</p>
                 </div>
               ) : erpItems.length === 0 ? (
                 <div className="p-4 text-center text-gray-500">
                   Nessun risultato trovato. Prova a cercare un codice.
                 </div>
               ) : (
                 <div className="divide-y">
                   {erpItems.map(item => (
                     <div 
                       key={item.Item} 
                       className="p-3 hover:bg-gray-50 cursor-pointer"
                       onClick={async () => {
                         // Filtra solo i componenti modificabili
                         const componentsToModify = selectedComponents.filter(comp => 
                           comp.data.parentBOMStato_erp !== '1' &&
                           comp.data.parentBOMStato_erp !== 1
                         );
                         
                         if (componentsToModify.length === 0) {
                           toast({
                             title: "Nessun componente disponibile",
                             description: "Tutti i componenti selezionati sono protetti",
                             variant: "warning"
                           });
                           return;
                         }
                         
                         setIsRefreshing(true);
                         
                         try {
                           for (const component of componentsToModify) {
                             await addComponent(
                               selectedBomId, 
                               {
                                 ComponentId: item.Id || 0,
                                 ComponentCode: item.Item || '',
                                 ComponentType: 7798784, // Articolo
                                 Quantity: 1,
                                 ParentComponentId: component.data.ComponentId, // Collegamento al padre
                                 ImportBOM: true
                               }
                             );
                           }
                           
                           // Chiudi il dialog e ricarica i dati
                           setShowAddUnderSelectDialog(false);
                           await smartRefresh();
                           
                           toast({
                             title: "Operazione completata",
                             description: `Aggiunti ${componentsToModify.length} componenti esistenti`,
                             variant: "success"
                           });
                           
                           // Deseleziona tutti i componenti
                           setSelectedComponents([]);
                         } catch (error) {
                           console.error('Errore durante l\'aggiunta:', error);
                           toast({
                             title: "Errore",
                             description: error.message || "Si è verificato un errore durante l'aggiunta dei componenti",
                             variant: "destructive"
                           });
                         } finally {
                           setIsRefreshing(false);
                         }
                       }}
                     >
                       <div className="font-medium">{item.Item}</div>
                       <div className="text-sm text-gray-500">{item.Description}</div>
                       <div className="text-xs text-gray-400 mt-1">
                         UoM: {item.BaseUoM || 'PZ'} | Natura: {
                           item.Nature === 22413312 ? 'Semilavorato' : 
                           item.Nature === 22413313 ? 'Prodotto Finito' : 
                           item.Nature === 22413314 ? 'Acquisto' : 'Altro'
                         }
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </TabsContent>
             
             <TabsContent value="projects" className="border rounded mt-2 max-h-[300px] overflow-auto">
               {isSearching ? (
                 <div className="p-4 text-center">
                   <p className="text-gray-500">Caricamento in corso...</p>
                 </div>
               ) : projectItems.length === 0 ? (
                 <div className="p-4 text-center text-gray-500">
                   Nessun risultato trovato. Prova a cercare un codice progetto.
                 </div>
               ) : (
                 <div className="divide-y">
                   {projectItems.map(item => (
                     <div 
                       key={item.Id} 
                       className="p-3 hover:bg-gray-50 cursor-pointer"
                       onClick={async () => {
                         // Logica simile a quella per i codici ERP
                         // ...
                       }}
                     >
                       <div className="font-medium">{item.Item}</div>
                       <div className="text-sm text-gray-500">{item.Description}</div>
                       <div className="text-xs text-gray-400 mt-1">
                         UoM: {item.BaseUoM || 'PZ'} | Natura: {
                           item.Nature === 22413312 ? 'Semilavorato' : 
                           item.Nature === 22413313 ? 'Prodotto Finito' : 
                           item.Nature === 22413314 ? 'Acquisto' : 'Altro'
                         }
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </TabsContent>
             
             {hasLockedComponents && (
               <div className="mt-2 p-2 bg-amber-50 rounded text-sm flex items-start">
                 <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                 <div>
                   <strong>Nota:</strong> {lockedCount} componenti sono protetti e non saranno modificati.
                 </div>
               </div>
             )}
           </Tabs>
         </div>
         
         <DialogFooter>
           <Button 
             variant="outline" 
             onClick={() => setShowAddUnderSelectDialog(false)}
           >
             Annulla
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   </div>
 );
};

export default BOMTreeView;