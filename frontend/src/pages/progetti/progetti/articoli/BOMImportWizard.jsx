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
  Maximize2,
  Minimize2,
  ArrowLeft,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import useProjectArticlesActions from "@/hooks/useProjectArticlesActions";
import BOMVersionSelector from "./BOMVersionSelector";

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
  
  // Stati per la selezione delle versioni
  const [showVersionSelector, setShowVersionSelector] = useState(false);
  const [selectedBOMVersion, setSelectedBOMVersion] = useState(null);
  const [currentStep, setCurrentStep] = useState('version-selection'); // 'version-selection' o 'bom-structure'

  const { getBOMData } = useProjectArticlesActions();

  // Funzione per troncare il testo
  const truncateText = (text, maxLength = 128) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Reset degli stati quando si apre/chiude il dialog
  useEffect(() => {
    if (isOpen && sourceItem) {
      // Solo se non siamo già in un processo di selezione
      if (currentStep === 'version-selection') {
        setSelectedBOMVersion(null);
        setBomStructure(null);
        setExpandedNodes({});
        setSelectedComponents({});
        setComponentOptions({});
      }
    } else if (!isOpen) {
      setCurrentStep('version-selection');
      setSelectedBOMVersion(null);
      setBomStructure(null);
    }
  }, [isOpen, sourceItem]);

  const loadBOMStructure = async (bomVersion) => {
    try {
      setLoading(true);
      
      // Carica la struttura multilivello della distinta usando il BOMId
      const data = await getBOMData(
        "GET_BOM_MULTILEVEL",
        bomVersion.Id, // Usa il BOMId invece dell'ItemId
        null, // ItemId non più necessario
        bomVersion.Version, // Passa la versione specifica
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
          allOptions[node.id] = { useOriginalCode: false };
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

  // Gestisce la selezione di una versione BOM
  const handleVersionSelected = async (bomVersion) => {
    setSelectedBOMVersion(bomVersion);
    setCurrentStep('bom-structure');
    
    // Carica la struttura BOM per la versione selezionata
    await loadBOMStructure(bomVersion);
  };

  // Torna alla selezione delle versioni
  const handleBackToVersionSelection = () => {
    setCurrentStep('version-selection');
    setSelectedBOMVersion(null);
    setBomStructure(null);
    setExpandedNodes({});
    setSelectedComponents({});
    setComponentOptions({});
  };

  // Costruisce la struttura ad albero dai componenti flat
  const buildTreeStructure = (components) => {
    const nodeMap = {};
    const rootNodes = [];

    // Prima passa: crea tutti i nodi
    components.forEach(comp => {
      // Usa il Path come ID univoco quando disponibile
      // Il Path dalla stored procedure è nel formato: "rootId.childId1.childId2"
      const uniqueId = comp.Path || `${comp.ComponentId}-${comp.Line}`;
      const node = {
        id: uniqueId,
        data: comp,
        children: [],
      };
      nodeMap[uniqueId] = node;
    });

    // Seconda passa: costruisci la gerarchia
    components.forEach(comp => {
      const nodeId = comp.Path || `${comp.ComponentId}-${comp.Line}`;
      const node = nodeMap[nodeId];
      
      if (comp.Level === 0 || comp.Level === 1) {
        rootNodes.push(node);
      } else {
        // Trova il padre basandosi sul Path
        const parentNode = findParentNode(comp, components, nodeMap);
        if (parentNode) {
          parentNode.children.push(node);
        }
      }
    });

    return rootNodes;
  };

  // Trova il nodo padre basandosi sul Path
  const findParentNode = (component, allComponents, nodeMap) => {
    if (!component.Path) return null;
    
    // Il Path è nel formato "rootId.childId1.childId2"
    const pathParts = component.Path.split('.');
    if (pathParts.length < 2) return null;
    
    // Rimuovi l'ultimo elemento per ottenere il path del padre
    pathParts.pop();
    const parentPath = pathParts.join('.');
    
    // Cerca il componente padre con questo path
    const parentComponent = allComponents.find(
      comp => comp.Path === parentPath && comp.Level === component.Level - 1
    );
    
    if (parentComponent) {
      const parentId = parentComponent.Path || `${parentComponent.ComponentId}-${parentComponent.Line}`;
      return nodeMap[parentId];
    }
    
    return null;
  };

  // Toggle espansione nodo
  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Espandi/comprimi tutti i nodi
  const toggleAllNodes = (expand) => {
    const newExpanded = {};
    
    const processNode = (node) => {
      if (node.children && node.children.length > 0) {
        newExpanded[node.id] = expand;
        node.children.forEach(processNode);
      }
    };
    
    if (bomStructure) {
      bomStructure.forEach(processNode);
    }
    
    setExpandedNodes(newExpanded);
  };

  // Gestione selezione componente con logica padre-figlio
  const handleComponentSelection = (nodeId, checked) => {
    const newSelected = { ...selectedComponents };
    const newOptions = { ...componentOptions };
    
    if (checked) {
      // Se seleziono un componente, devo selezionare tutti i suoi padri
      selectWithParents(nodeId, newSelected);
      
      // Se il padre ha codice originale, forzo anche questo componente ad averlo
      const parentId = findParentIdFromTree(nodeId);
      if (parentId && newOptions[parentId]?.useOriginalCode) {
        newOptions[nodeId] = {
          ...newOptions[nodeId],
          useOriginalCode: true
        };
      }
    } else {
      // Se deseleziono un componente, devo deselezionare tutti i suoi figli
      deselectWithChildren(nodeId, newSelected, newOptions);
    }
    
    setSelectedComponents(newSelected);
    setComponentOptions(newOptions);
  };

  const selectWithParents = (nodeId, selectedMap) => {
    selectedMap[nodeId] = true;
    
    // Trova e seleziona solo i padri diretti nella gerarchia
    const findAndSelectParent = (currentId) => {
      const parentId = findParentIdFromTree(currentId);
      
      if (parentId && !selectedMap[parentId]) {
        selectedMap[parentId] = true;
        findAndSelectParent(parentId);
      }
    };
    
    findAndSelectParent(nodeId);
  };

  const deselectWithChildren = (nodeId, selectedMap, optionsMap) => {
    selectedMap[nodeId] = false;
    
    // Resetta anche le opzioni quando deseleziono
    if (optionsMap) {
      optionsMap[nodeId] = { useOriginalCode: false };
    }
    
    // Trova e deseleziona solo i figli diretti
    const node = findNodeById(nodeId, bomStructure);
    if (node && node.children) {
      node.children.forEach(child => {
        deselectWithChildren(child.id, selectedMap, optionsMap);
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
    // Trova il nodo corrente
    const node = findNodeById(nodeId, bomStructure);
    if (!node || !node.data.Path) return null;
    
    // Il Path è nel formato "rootId.childId1.childId2"
    const pathParts = node.data.Path.split('.');
    if (pathParts.length < 2) return null;
    
    // Rimuovi l'ultimo elemento per ottenere il path del padre
    pathParts.pop();
    const parentPath = pathParts.join('.');
    
    // Trova il nodo padre che ha questo path
    const findNodeByPath = (nodes, targetPath) => {
      for (const n of nodes) {
        if (n.data.Path === targetPath) {
          return n.id;
        }
        if (n.children) {
          const found = findNodeByPath(n.children, targetPath);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findNodeByPath(bomStructure, parentPath);
  };

  // Toggle opzione codice originale/temporaneo
  const toggleCodeOption = (nodeId) => {
    const currentOption = componentOptions[nodeId]?.useOriginalCode;
    const newOption = !currentOption;
    
    const newOptions = { ...componentOptions };
    
    if (newOption) {
      // Se sto passando a "mantieni codice originale"
      // Devo forzare tutti i figli a mantenere il codice originale
      forceChildrenToOriginalCode(nodeId, newOptions);
    } else {
      // Se sto passando a "codice temporaneo"
      // Devo verificare che il padre non abbia codice originale
      const parentId = findParentIdFromTree(nodeId);
      if (parentId && componentOptions[parentId]?.useOriginalCode) {
        // Il padre ha codice originale, non posso cambiare
        toast({
          title: "Operazione non consentita",
          description: "Non puoi creare un codice temporaneo per un componente il cui padre mantiene il codice originale. Cambia prima l'opzione del padre.",
          variant: "destructive",
        });
        return;
      }
    }
    
    newOptions[nodeId] = {
      ...newOptions[nodeId],
      useOriginalCode: newOption
    };
    
    setComponentOptions(newOptions);
  };
  
  // Forza tutti i figli a mantenere il codice originale
  const forceChildrenToOriginalCode = (nodeId, optionsMap) => {
    const node = findNodeById(nodeId, bomStructure);
    if (node && node.children) {
      node.children.forEach(child => {
        if (selectedComponents[child.id]) {
          optionsMap[child.id] = {
            ...optionsMap[child.id],
            useOriginalCode: true
          };
          forceChildrenToOriginalCode(child.id, optionsMap);
        }
      });
    }
  };

  // Renderizza un nodo dell'albero
  const renderNode = (node, level = 0) => {
    const isExpanded = expandedNodes[node.id];
    const isSelected = selectedComponents[node.id];
    const useOriginalCode = componentOptions[node.id]?.useOriginalCode;
    const hasChildren = node.children && node.children.length > 0;
    
    const nature = node.data.ComponentNature || node.data.Nature;
    const isAcquisto = nature === 22413314;

    // Non renderizzare componenti di livello 0 (root)
    if (node.data.Level === 0) {
      return null;
    }

    return (
      <div key={node.id} className="select-none">
        <div 
          className={`py-2 px-3 hover:bg-gray-50 rounded-lg transition-all duration-200 ${
            level > 0 ? 'border-l-4' : ''
          }`}
          style={{ 
            marginLeft: `${level * 1.5}rem`,
            borderLeftColor: level > 0 ? `rgb(59, 130, 246, ${Math.min(0.3 + level * 0.15, 1)})` : 'transparent',
          }}
        >
          {/* Prima riga: controlli, codice e pulsante */}
          <div className="flex items-center gap-2 mb-1">
            {/* Expand/Collapse button */}
            {hasChildren && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-white/50"
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
              className={`h-5 w-5 ${isSelected ? 'bg-primary' : ''}`}
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

            {/* Codice componente */}
            <span className="font-medium text-sm">
              {node.data.ComponentItemCode || node.data.Item}
            </span>

            {/* Badge livello */}
            {node.data.Level > 0 && (
              <Badge 
                variant="outline" 
                className="text-xs"
                style={{
                  backgroundColor: `rgba(59, 130, 246, ${0.1 + node.data.Level * 0.05})`,
                  borderColor: `rgba(59, 130, 246, ${0.3 + node.data.Level * 0.1})`,
                }}
              >
                L{node.data.Level}
              </Badge>
            )}

            {/* Spazio flessibile per spingere il pulsante a destra */}
            <div className="flex-1" />

            {/* Toggle codice originale/temporaneo */}
            {isSelected && (
              <div className="flex items-center gap-2">
                {(() => {
                  const parentId = findParentIdFromTree(node.id);
                  const parentHasOriginalCode = parentId && componentOptions[parentId]?.useOriginalCode;
                  const isDisabled = parentHasOriginalCode && !useOriginalCode;
                  
                  return (
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-7 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => toggleCodeOption(node.id)}
                      disabled={isDisabled}
                      title={isDisabled ? "Il padre mantiene il codice originale, non puoi creare un codice temporaneo" : ""}
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
                  );
                })()}
              </div>
            )}

            {/* Quantità */}
            <div className="text-sm text-gray-500 min-w-[80px] text-right">
              Qtà: {node.data.Quantity || 1} {node.data.UoM || 'PZ'}
            </div>
          </div>

          {/* Seconda riga: descrizione */}
          <div className="flex items-start gap-2 ml-12">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-gray-600 cursor-help">
                    {truncateText(node.data.ComponentItemDescription || node.data.Description)}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-md">
                  <p>{node.data.ComponentItemDescription || node.data.Description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Renderizza i figli se espanso */}
        {isExpanded && hasChildren && (
          <div className="mt-1">
            {node.children.map((child) => renderNode(child, level + 1))}
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
      selectedBOMVersion, // Aggiungi le informazioni della versione selezionata
      components: [],
    };

    // Raccogli tutti i componenti selezionati
    const collectSelectedComponents = (nodes) => {
      nodes.forEach(node => {
        // Escludi i componenti di livello 0 dalla raccolta
        if (selectedComponents[node.id] && node.data.Level > 0) {
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

    onConfirm(importData);
  };

  const getSelectedCount = () => {
    return Object.values(selectedComponents).filter(v => v).length;
  };

  const getTotalCount = () => {
    let count = 0;
    const countNodes = (nodes) => {
      nodes.forEach(node => {
        // Escludi i componenti di livello 0 dal conteggio
        if (node.data.Level > 0) {
          count++;
        }
        if (node.children) countNodes(node.children);
      });
    };
    if (bomStructure) countNodes(bomStructure);
    return count;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            {currentStep === 'version-selection' 
              ? 'Seleziona Versione BOM da Copiare'
              : 'Importazione Distinta Base'
            }
          </DialogTitle>
          {currentStep === 'bom-structure' && selectedBOMVersion && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Versione selezionata:</span>
              <Badge variant="outline">
                Versione {selectedBOMVersion.Version} - {selectedBOMVersion.Description}
              </Badge>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {currentStep === 'version-selection' ? (
            // Mostra il selettore di versioni
            <BOMVersionSelector
              isOpen={true}
              onClose={onClose}
              sourceItem={sourceItem}
              onVersionSelected={handleVersionSelected}
              project={project}
            />
          ) : (
            // Mostra la struttura BOM
            <>
              {/* Info articolo sorgente */}
              <div className="p-4 bg-gray-50 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBackToVersionSelection}
                      className="flex items-center"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Torna alle Versioni
                    </Button>
                    <div>
                      <h3 className="font-medium">{sourceItem?.Item || sourceItem?.BOM}</h3>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm text-gray-600 cursor-help">
                              {truncateText(sourceItem?.Description || sourceItem?.ItemDescription)}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-md">
                            <p>{sourceItem?.Description || sourceItem?.ItemDescription}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllNodes(true)}
                    title="Espandi tutto"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllNodes(false)}
                    title="Comprimi tutto"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="createNewBOM"
                    checked={createNewBOM}
                    onCheckedChange={setCreateNewBOM}
                    className="h-5 w-5 bg-primary"
                  />
                  <Label htmlFor="createNewBOM" className="cursor-pointer">
                    Crea nuovo codice distinta
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Istruzioni */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-700 rounded mb-4">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p>Seleziona i componenti da importare. I cicli verranno sempre importati.</p>
              <p className="mt-1">
                <strong>Nota:</strong> Se un componente mantiene il codice originale, tutti i suoi figli dovranno mantenerlo.
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
                {bomStructure.map(node => {
                  // Se il nodo è di livello 0, renderizza solo i suoi figli
                  if (node.data.Level === 0) {
                    return node.children ? node.children.map(child => renderNode(child, 1)) : null;
                  }
                  // Altrimenti renderizza normalmente
                  return renderNode(node, 0);
                })}
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
            </>
          )}
        </div>

        {currentStep === 'bom-structure' && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={loading || getSelectedCount() === 0}
            >
              Importa Selezione
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BOMImportWizard;