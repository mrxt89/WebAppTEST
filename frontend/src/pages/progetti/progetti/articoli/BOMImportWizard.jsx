import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronRight,
  ChevronDown,
  Package,
  ShoppingCart,
  Code,
  Copy,
  AlertCircle,
  Layers,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import useProjectArticlesActions from "@/hooks/useProjectArticlesActions";

const BOMImportWizard = ({
  isOpen,
  onClose,
  sourceItem,
  onConfirm,
  project,
}) => {
  const [bomStructure, setBomStructure] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [selectedComponents, setSelectedComponents] = useState({});
  const [componentOptions, setComponentOptions] = useState({});
  const [loading, setLoading] = useState(false);
  const [createNewBOM, setCreateNewBOM] = useState(true);

  const { getBOMData } = useProjectArticlesActions();

  // Carica la struttura completa della distinta
  useEffect(() => {
    if (isOpen && sourceItem) {
      loadBOMStructure();
    }
  }, [isOpen, sourceItem]);

  const loadBOMStructure = async () => {
    try {
      setLoading(true);
      
      // Carica la struttura multilivello della distinta
      const data = await getBOMData(
        "GET_BOM_MULTILEVEL",
        null,
        sourceItem.Id || sourceItem.ItemId,
        null,
        {
          maxLevel: 10,
          includeRouting: true,
          expandPhantoms: true,
        }
      );

      if (data) {
        // Costruisci la struttura ad albero
        const tree = buildTreeStructure(data.components || data);
        setBomStructure(tree);
        
        // Espandi automaticamente il primo livello
        const firstLevelExpanded = {};
        tree.forEach(node => {
          firstLevelExpanded[node.id] = true;
        });
        setExpandedNodes(firstLevelExpanded);
        
        // Inizializza tutto come deselezionato
        const allSelected = {};
        const allOptions = {};
        const processNode = (node) => {
          allSelected[node.id] = false;
          allOptions[node.id] = { useOriginalCode: true };
          if (node.children) {
            node.children.forEach(processNode);
          }
        };
        tree.forEach(processNode);
        setSelectedComponents(allSelected);
        setComponentOptions(allOptions);
      }
    } catch (error) {
      console.error("Errore nel caricamento della distinta:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare la struttura della distinta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Costruisce la struttura ad albero dai componenti flat
  const buildTreeStructure = (components) => {
    const nodeMap = {};
    const rootNodes = [];

    // Prima passa: crea tutti i nodi
    components.forEach(comp => {
      const node = {
        id: `${comp.ComponentId}-${comp.Line}`,
        data: comp,
        children: [],
      };
      nodeMap[node.id] = node;
    });

    // Seconda passa: costruisci la gerarchia
    components.forEach(comp => {
      const nodeId = `${comp.ComponentId}-${comp.Line}`;
      const node = nodeMap[nodeId];
      
      if (comp.Level === 0 || comp.Level === 1) {
        rootNodes.push(node);
      } else {
        // Trova il padre basandosi sul Path
        const parentId = findParentId(comp, components);
        if (parentId && nodeMap[parentId]) {
          nodeMap[parentId].children.push(node);
        }
      }
    });

    return rootNodes;
  };

  const findParentId = (component, allComponents) => {
    if (!component.Path) return null;
    
    const pathParts = component.Path.split('.');
    if (pathParts.length < 2) return null;
    
    pathParts.pop();
    const parentPath = pathParts.join('.');
    
    const parent = allComponents.find(
      comp => comp.Path === parentPath && comp.Level === component.Level - 1
    );
    
    return parent ? `${parent.ComponentId}-${parent.Line}` : null;
  };

  // Toggle espansione nodo
  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Gestione selezione componente con logica padre-figlio
  const handleComponentSelection = (nodeId, checked) => {
    const newSelected = { ...selectedComponents };
    
    if (checked) {
      // Se seleziono un componente, devo selezionare tutti i suoi padri
      selectWithParents(nodeId, newSelected);
    } else {
      // Se deseleziono un componente, devo deselezionare tutti i suoi figli
      deselectWithChildren(nodeId, newSelected);
    }
    
    setSelectedComponents(newSelected);
  };

  const selectWithParents = (nodeId, selectedMap) => {
    selectedMap[nodeId] = true;
    
    // Trova e seleziona i padri
    const findAndSelectParent = (currentId) => {
      const node = findNodeById(currentId, bomStructure);
      if (!node) return;
      
      const parentId = findParentIdFromTree(currentId);
      if (parentId && !selectedMap[parentId]) {
        selectedMap[parentId] = true;
        findAndSelectParent(parentId);
      }
    };
    
    findAndSelectParent(nodeId);
  };

  const deselectWithChildren = (nodeId, selectedMap) => {
    selectedMap[nodeId] = false;
    
    // Trova e deseleziona i figli
    const node = findNodeById(nodeId, bomStructure);
    if (node && node.children) {
      node.children.forEach(child => {
        deselectWithChildren(child.id, selectedMap);
      });
    }
  };

  const findNodeById = (nodeId, nodes) => {
    for (const node of nodes) {
      if (node.id === nodeId) return node;
      if (node.children) {
        const found = findNodeById(nodeId, node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const findParentIdFromTree = (nodeId) => {
    const findParent = (nodes, parentId = null) => {
      for (const node of nodes) {
        if (node.id === nodeId) return parentId;
        if (node.children) {
          const found = findParent(node.children, node.id);
          if (found !== null) return found;
        }
      }
      return null;
    };
    
    return findParent(bomStructure);
  };

  // Toggle opzione codice originale/temporaneo
  const toggleCodeOption = (nodeId) => {
    setComponentOptions(prev => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        useOriginalCode: !prev[nodeId]?.useOriginalCode
      }
    }));
  };

  // Renderizza un nodo dell'albero
  const renderNode = (node, level = 0) => {
    const isExpanded = expandedNodes[node.id];
    const isSelected = selectedComponents[node.id];
    const useOriginalCode = componentOptions[node.id]?.useOriginalCode;
    const hasChildren = node.children && node.children.length > 0;
    
    const nature = node.data.ComponentNature || node.data.Nature;
    const isAcquisto = nature === 22413314;

    return (
      <div key={node.id} className="select-none">
        <div 
          className={`flex items-center gap-2 py-2 px-2 hover:bg-gray-50 rounded`}
          style={{ marginLeft: `${level * 2}rem` }}
        >
          {/* Expand/Collapse button */}
          {hasChildren && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => toggleNode(node.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          {!hasChildren && <div className="w-6" />}

          {/* Checkbox selezione */}
          <Checkbox
            className={`h-6 w-6 ${isSelected ? 'bg-primary' : 'bg-gray-200'}`}
            checked={isSelected}
            onCheckedChange={(checked) => handleComponentSelection(node.id, checked)}
            disabled={loading}
          />

          {/* Icona natura */}
          {isAcquisto ? (
            <ShoppingCart className="h-4 w-4 text-amber-600" />
          ) : (
            <Package className="h-4 w-4 text-blue-600" />
          )}

          {/* Info componente */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {node.data.ComponentItemCode || node.data.Item}
              </span>
              <span className="text-sm text-gray-500">
                {node.data.ComponentItemDescription || node.data.Description}
              </span>
              {node.data.Level > 0 && (
                <Badge variant="outline" className="text-xs">
                  Livello {node.data.Level}
                </Badge>
              )}
            </div>
          </div>

          {/* Toggle codice originale/temporaneo */}
          {isSelected && !isAcquisto && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => toggleCodeOption(node.id)}
              >
                {useOriginalCode ? (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Mantieni codice
                  </>
                ) : (
                  <>
                    <Code className="h-3 w-3 mr-1" />
                    Nuovo temporaneo
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Quantità */}
          <div className="text-sm text-gray-500">
            Qtà: {node.data.Quantity || 1} {node.data.UoM || 'PZ'}
          </div>
        </div>

        {/* Renderizza i figli se espanso */}
        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

// Conferma la selezione
const handleConfirm = () => {
    // Prepara i dati per l'importazione
    const importData = {
      createNewBOM,
      sourceItem,
      components: [],
    };

    // Raccogli tutti i componenti selezionati
    const collectSelectedComponents = (nodes) => {
      nodes.forEach(node => {
        if (selectedComponents[node.id]) {
          // Assicuriamoci che i dati abbiano tutti i campi necessari
          const componentData = {
            ComponentItemCode: node.data.ComponentItemCode || node.data.Component || node.data.Item,
            Level: node.data.Level,
            Path: node.data.Path,
            UseOriginalCode: componentOptions[node.id]?.useOriginalCode ? 1 : 0,
            Quantity: node.data.Quantity || 1,
            ComponentType: node.data.ComponentType || 7798784,
            Nature: node.data.Nature || node.data.ComponentNature || 22413312,
            UoM: node.data.UoM || 'PZ',
            // Dati aggiuntivi per debug/riferimento
            nodeId: node.id,
            OriginalData: node.data
          };
          importData.components.push(componentData);
        }
        if (node.children) {
          collectSelectedComponents(node.children);
        }
      });
    };

    if (bomStructure) {
      collectSelectedComponents(bomStructure);
    }

    console.log('Import data being sent:', importData); // Debug
    onConfirm(importData);
  };

  const getSelectedCount = () => {
    return Object.values(selectedComponents).filter(v => v).length;
  };

  const getTotalCount = () => {
    let count = 0;
    const countNodes = (nodes) => {
      nodes.forEach(node => {
        count++;
        if (node.children) countNodes(node.children);
      });
    };
    if (bomStructure) countNodes(bomStructure);
    return count;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Importazione Distinta Base
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Info articolo sorgente */}
          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{sourceItem?.Item || sourceItem?.BOM}</h3>
                <p className="text-sm text-gray-600">
                  {sourceItem?.Description || sourceItem?.ItemDescription}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="createNewBOM"
                  className={`${createNewBOM ? 'bg-primary' : 'bg-gray-200'}`}
                  checked={createNewBOM}
                  onCheckedChange={setCreateNewBOM}
                />
                <Label htmlFor="createNewBOM" className="cursor-pointer">
                  Crea nuovo codice distinta
                </Label>
              </div>
            </div>
          </div>

          {/* Istruzioni */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-700 rounded mb-4">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p>Seleziona i componenti da importare. I cicli verranno sempre importati.</p>
              <p className="mt-1">
                Quando selezioni un componente, tutti i suoi padri vengono selezionati automaticamente.
              </p>
            </div>
          </div>

          {/* Albero componenti */}
          <ScrollArea className="flex-1 border rounded-lg p-2">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : bomStructure && bomStructure.length > 0 ? (
              <div className="space-y-1">
                {bomStructure.map(node => renderNode(node))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Nessun componente trovato nella distinta
              </div>
            )}
          </ScrollArea>

          {/* Contatore selezione */}
          <div className="mt-4 text-sm text-gray-600">
            Selezionati {getSelectedCount()} componenti su {getTotalCount()}
            {getSelectedCount() === 0 && (
              <span className="ml-2 text-amber-600">
                - Seleziona almeno un componente per procedere
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading || getSelectedCount() === 0}
            className={getSelectedCount() === 0 ? "opacity-50 cursor-not-allowed" : ""}
          >
            Importa Selezione
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BOMImportWizard;