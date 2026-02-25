// src/pages/progetti/progetti/articoli/BOMViewer/components/BOMTreeView/TreeNode.jsx

import React, { useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  ChevronRight,
  ChevronDown,
  Package,
  ShoppingCart,
  CircuitBoard,
  FileText,
  Settings,
  Factory,
  AlertTriangle,
  Home,
  Edit2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBOMViewer } from "../../context/BOMViewerContext";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// Helper per ottenere un colore in base al livello
const getLevelColor = (level) => {
  // Colori per i vari livelli
  const LEVEL_COLORS = [
    "#1f2937", // Livello 0 - gray-800 (più scuro per il root)
    "#3b82f6", // Livello 1 - blue-500
    "#22c55e", // Livello 2 - green-500
    "#f59e0b", // Livello 3 - amber-500
    "#a855f7", // Livello 4 - purple-500
    "#ec4899", // Livello 5 - pink-500
    "#6366f1", // Livello 6 - indigo-500
    "#ef4444", // Livello 7 - red-500
    "#06b6d4", // Livello 8 - cyan-500
    "#10b981", // Livello 9 - emerald-500
  ];

  // Limita l'indice al numero di colori disponibili
  const colorIndex =
    level < LEVEL_COLORS.length ? level : level % LEVEL_COLORS.length;
  return LEVEL_COLORS[colorIndex];
};

// Component for node icon based on type
const NodeIcon = ({ node, isRootNode }) => {
  // NUOVO: Icona speciale per il livello 0
  if (isRootNode) {
    return <Home className="h-4 w-4 text-gray-700" />;
  }

  if (node.type === "cycle") {
    return <Factory className="h-4 w-4 text-green-500" />;
  }

  // Component icons based on nature
  const nature = node.data.ComponentNature || node.data.Nature;

  switch (Number(nature)) {
    case 22413312: // Semi-finished
      return <CircuitBoard className="h-4 w-4 text-blue-500" />;
    case 22413313: // Finished product
      return <Package className="h-4 w-4 text-green-500" />;
    case 22413314: // Purchase
      return <ShoppingCart className="h-4 w-4 text-amber-500" />;
    default:
      if (node.data.ComponentType === 7798789) {
        // Note
        return <FileText className="h-4 w-4 text-gray-500" />;
      }
      return <Package className="h-4 w-4 text-gray-500" />;
  }
};

// Helper function to get nature badge for components
const getNatureBadge = (node) => {
  if (node.type === "cycle") return null;

  const nature = node.data.ComponentNature || node.data.Nature;

  switch (Number(nature)) {
    case 22413312: // Semi-finished
      return (
        <Badge
          variant="outline"
          className="ml-1.5 px-1 py-0 h-4 text-[10px] bg-blue-50 text-blue-700 border-blue-300 font-semibold"
        >
          SML
        </Badge>
      );
    case 22413313: // Finished product
      return (
        <Badge
          variant="outline"
          className="ml-1.5 px-1 py-0 h-4 text-[10px] bg-green-50 text-green-700 border-green-300 font-semibold"
        >
          PF
        </Badge>
      );
    case 22413314: // Purchase
      return (
        <Badge
          variant="outline"
          className="ml-1.5 px-1 py-0 h-4 text-[10px] bg-amber-50 text-amber-700 border-amber-300 font-semibold"
        >
          ACQ
        </Badge>
      );
    default:
      return null;
  }
};

// Funzione helper al componente TreeNode
const generateUniqueNodeId = (node) => {
  if (!node || node.type !== "component" || !node.data) {
    return node.id || "unknown";
  }

  // Estrai tutti i dati rilevanti che potrebbero differenziare un nodo da un altro
  const componentId = node.data.ComponentId || "";
  const line = node.data.Line || "";
  const bomId = node.data.BOMId || "";

  // CRUCIALE: Utilizza il percorso completo e l'ID del nodo
  // Questo garantisce che due nodi con lo stesso componente ma in posizioni diverse siano distinti
  const path = node.data.Path || "";
  const nodeId = node.id || "";

  // Combina tutto in un ID veramente unico che considera la posizione esatta nell'albero
  return `${nodeId}|${bomId}|${componentId}|${line}|${path}`;
};

// Function to find routing cycles for a component with proper type conversion
const findRoutingsForComponent = (componentNode, bomRouting) => {
  if (!Array.isArray(bomRouting) || bomRouting.length === 0) {
    return [];
  }

  if (!componentNode || componentNode.type !== "component") {
    return [];
  }

  // Extract component data
  const bomId = componentNode.data.BOMId;
  const level = componentNode.data.Level || 0;

  if (!bomId) {
    return [];
  }

  // Normalize for comparison function
  const normalizeForComparison = (val1, val2) => {
    // Convert both to strings for safer comparison
    const str1 = val1 !== undefined && val1 !== null ? String(val1) : "";
    const str2 = val2 !== undefined && val2 !== null ? String(val2) : "";

    return str1 === str2;
  };

  // Filter routing cycles with proper logic
  const matchedCycles = bomRouting.filter((cycle) => {
    // Special case for level 0 cycles (parent BOM cycles)
    if (cycle.Level === 0) {
      // Only match level 0 cycles with the root component
      // They should only appear at the root level, not for all components with the same BOMId
      return (
        normalizeForComparison(cycle.BOMId, bomId) &&
        (level === 0 || level === 1) &&
        // This additional check ensures level 0 cycles are ONLY associated with the direct parent item
        normalizeForComparison(
          componentNode.data.ItemId || componentNode.data.ComponentId,
          cycle.ItemId,
        )
      );
    }
    // For regular component cycles
    else {
      // For normal cycles, do an exact match on BOMId
      // Plus additional verification to ensure we're not showing cycles intended for other components
      return (
        normalizeForComparison(cycle.BOMId, bomId) &&
        (cycle.ComponentId === undefined ||
          normalizeForComparison(
            cycle.ComponentId,
            componentNode.data.ComponentId,
          ) ||
          normalizeForComparison(
            cycle.ItemId,
            componentNode.data.ItemId || componentNode.data.ComponentId,
          ))
      );
    }
  });

  // Sort by RtgStep
  matchedCycles.sort((a, b) => {
    const aStep = parseInt(a.RtgStep) || 0;
    const bStep = parseInt(b.RtgStep) || 0;
    return aStep - bStep;
  });

  return matchedCycles;
};

const TreeNode = ({
  node,
  expanded,
  selected,
  onSelect,
  onToggle,
  level = 0,
  onNodeCheck,
  draggingOver, // Prop per il nodo su cui si sta trascinando
  dropTarget, // Prop per il target di drop attuale
  dropMode, // Prop per la modalità di drop
}) => {
  const { expandedNodes, bomRouting, editMode, selectedComponents, canEdit, pendingChanges, bom } =
    useBOMViewer();

  const [nodeCycles, setNodeCycles] = useState([]);
  const [debug, setDebug] = useState(false);

  // NUOVO: Verifica se è il nodo root (livello 0)
  const isRootNode = node.type === "component" && node.data.Level === 0;

  // Configura la droppable area per questo nodo
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-${node.id}`,
    data: {
      type: "component-node",
      node: node,
    },
  });

  // Verifica se la BOM corrente (root) NON è esportata in ERP
  const isRootBOMNotExported = bom && bom.stato_erp != "1" && bom.stato_erp !== 1;

  // Blocco per MODIFICA DIRETTA dei campi - resta come prima
  const isLocked =
    (isRootNode && !editMode) || // Root bloccato solo se non in edit mode
    (node.type === "component" &&
      (node.data.parentBOMStato_erp === "1" ||
        node.data.parentBOMStato_erp === 1));

  // Blocco per SELEZIONE (checkbox per azioni bulk come sostituzione/copia)
  // Se la BOM root non è esportata, i componenti ERP possono essere SELEZIONATI per sostituzione
  const isLockedForSelection =
    (isRootNode && !editMode) || // Root bloccato solo se non in edit mode
    (!isRootBOMNotExported && node.type === "component" &&
      (node.data.parentBOMStato_erp === "1" ||
        node.data.parentBOMStato_erp === 1));

  // NUOVO: Flag per indicare se il root può essere ricodificato
  const canRecodeRoot = isRootNode && editMode && node.data.stato_erp !== 1;

  // Verifica se il componente ha una distinta in MAGO (ERP)
  const hasMagoBOM =
    node.type === "component" &&
    (node.data.bomStato_erp === "1" || node.data.bomStato_erp === 1);

  // NUOVO: Verifica se il componente ha modifiche pendenti
  const hasComponentChanges = node.type === "component" && pendingChanges[node.data.ComponentId] && (
    (pendingChanges[node.data.ComponentId].bomComponentChanges && 
     Object.keys(pendingChanges[node.data.ComponentId].bomComponentChanges).length > 0) ||
    (pendingChanges[node.data.ComponentId].itemDetailsChanges &&
     Object.keys(pendingChanges[node.data.ComponentId].itemDetailsChanges).length > 0)
  );

  // NUOVO: Verifica se i cicli hanno modifiche pendenti
  const hasCycleChanges = node.type === "component" && 
    pendingChanges[`cycle-${node.data.ComponentId}`] &&
    (
      (pendingChanges[`cycle-${node.data.ComponentId}`].newCycles && 
       pendingChanges[`cycle-${node.data.ComponentId}`].newCycles.length > 0) ||
      (pendingChanges[`cycle-${node.data.ComponentId}`].deletedCycles &&
       pendingChanges[`cycle-${node.data.ComponentId}`].deletedCycles.length > 0) ||
      (pendingChanges[`cycle-${node.data.ComponentId}`].cycleChanges &&
       Object.keys(pendingChanges[`cycle-${node.data.ComponentId}`].cycleChanges).length > 0) ||
      (pendingChanges[`cycle-${node.data.ComponentId}`].newOrder &&
       pendingChanges[`cycle-${node.data.ComponentId}`].newOrder.length > 0)
    );

  // NUOVO: Ha qualsiasi modifica pendente
  const hasPendingChanges = hasComponentChanges || hasCycleChanges;

  // Find associated cycles when component mounts or routing changes
  useEffect(() => {
    if (node.type === "component") {
      const cycles = findRoutingsForComponent(node, bomRouting);
      setNodeCycles(cycles);
    }
  }, [node, bomRouting, debug]);

  const hasRoutingCycles = nodeCycles.length > 0;
  const hasChildren =
    (node.children && node.children.length > 0) || hasRoutingCycles;

  // MIGLIORATO: Sistema di indentazione progressivo
  // Calcola l'indentazione in base al livello del nodo
  const baseIndent = 8; // Indentazione base in pixel
  const indentPerLevel = 24; // Pixel di indentazione per ogni livello
  const indent = level * indentPerLevel + baseIndent;

  // MODIFICA: Permetti la selezione del root solo in editMode
  const isChecked =
    node.type === "component" &&
    selectedComponents.some((comp) => {
      const compUniqueId =
        comp._uniqueSelectionId || generateUniqueNodeId(comp);
      const nodeUniqueId = generateUniqueNodeId(node);
      return compUniqueId === nodeUniqueId;
    });

  // Check if this node is the current drop target and determine the style to apply
  const isCurrentDropTarget = dropTarget && dropTarget.id === node.id;
  const isCurrentDragOver = draggingOver === `droppable-${node.id}`;

  const handleToggle = (e) => {
    e.stopPropagation();
    onToggle(node.id);
  };

  const handleSelect = () => {
    onSelect(node);

    // Enable debug logs if needed
    if (node.type === "component" && !debug) {
      setDebug(true);
    }
  };

  const handleCheckboxChange = (e) => {
    e.stopPropagation(); // Prevent node selection
    // MODIFICA: Permetti la selezione del root solo se siamo in editMode e può essere ricodificato
    if (onNodeCheck && !isLockedForSelection) {
      onNodeCheck(node, e.target.checked);
    }
  };

  let latestComponentCode = null;

  // Get text for the node
  const getNodeText = () => {
    if (node.type === "component") {
      // NUOVO: Controlla se c'è una modifica pendente per il codice
      let code = node.data.ComponentItemCode || node.data.ComponentCode || node.data.Item || "";
      let description = node.data.ComponentItemDescription || node.data.Description || "";

      // Se ci sono modifiche pendenti, usa i valori modificati
      if (pendingChanges[node.data.ComponentId]) {
        const changes = pendingChanges[node.data.ComponentId];
        
        // Controlla le modifiche dei dettagli dell'articolo
        if (changes.itemDetailsChanges) {
          if (changes.itemDetailsChanges.Code !== undefined) {
            code = changes.itemDetailsChanges.Code;
          }
          if (changes.itemDetailsChanges.Description !== undefined) {
            description = changes.itemDetailsChanges.Description;
          }
        }
      }

      latestComponentCode = code;

      // If there's a code, show "Code - Description"
      if (code) {
        if (code === description) {
          return code;
        }
        return `${code} - ${description}`;
      }

      // Otherwise just description
      return description;
    } else {
      // For cycles, show Operation format
      const step = node.data.RtgStep || "";
      const operation =
        node.data.OperationDescription || node.data.Operation || "";

      return `${operation}`;
    }
  };

  // Get formatted quantity
  const getQuantity = () => {
    if (node.type === "component" && node.data.Quantity && !isRootNode) {
      let qty = node.data.Quantity;
      
      // NUOVO: Se c'è una modifica pendente alla quantità, usala
      if (pendingChanges[node.data.ComponentId]?.bomComponentChanges?.Quantity !== undefined) {
        qty = pendingChanges[node.data.ComponentId].bomComponentChanges.Quantity;
      }
      
      const qtyNum = parseFloat(qty);
      if (isNaN(qtyNum)) return "";

      // Format without trailing zeros
      const formatted = qtyNum.toString();
      
      // NUOVO: Recupera anche l'unità di misura modificata se presente
      let uom = node.data.UoM || "";
      if (pendingChanges[node.data.ComponentId]?.bomComponentChanges?.UoM !== undefined) {
        uom = pendingChanges[node.data.ComponentId].bomComponentChanges.UoM;
      }
      
      return `${formatted} ${uom}`;
    }
    return "";
  };

  // Get node class name with improved styling for cycles and drag states
  const getNodeClassName = () => {
    return cn(
      "flex items-center py-1 rounded cursor-pointer hover:bg-gray-100 transition-colors relative",
      selected && "bg-blue-50 text-blue-700 font-medium",
      node.type === "cycle" && "italic text-green-700", // Special styling for cycles
      isLocked && !canRecodeRoot && "opacity-75", // Lower opacity for locked components (ma non per il root se può essere ricodificato)
      isRootNode && "bg-gray-50 hover:bg-gray-100", // Sfondo speciale per il root
      isCurrentDragOver && "ring-1 ring-gray-300", // Sottile bordo per indicare che è possibile fare drop
      hasPendingChanges && editMode && "bg-amber-50 hover:bg-amber-100", // NUOVO: Evidenzia le righe con modifiche
    );
  };

  // Prepare data attributes
  const getDataAttributes = () => {
    const attrs = {
      "data-node-type": node.type,
      "data-node-id": node.id,
      "data-is-root": isRootNode ? "true" : "false",
    };

    if (node.type === "component") {
      attrs["data-component-id"] = node.data.ComponentId || "";
      attrs["data-bom-id"] = node.data.BOMId || "";
      attrs["data-item-id"] = node.data.ItemId || node.data.ComponentId || "";
      attrs["data-line"] = node.data.Line || "";
      attrs["data-level"] = node.data.Level || 0;
      attrs["data-has-cycles"] = hasRoutingCycles ? "true" : "false";
      attrs["data-locked"] = isLocked ? "true" : "false";
      attrs["data-mago-bom"] = hasMagoBOM ? "true" : "false";
      attrs["data-has-changes"] = hasPendingChanges ? "true" : "false"; // NUOVO
      attrs["data-can-recode"] = canRecodeRoot ? "true" : "false"; // NUOVO

      if (node.data.Path) {
        const pathParts = node.data.Path.split(".");
        if (pathParts.length > 1) {
          pathParts.pop();
          attrs["data-parent-path"] = pathParts.join(".");
          attrs["data-parent-component-id"] = pathParts[pathParts.length - 1];
        }
      }
    } else if (node.type === "cycle") {
      attrs["data-cycle-step"] = node.data.RtgStep || "";
      attrs["data-bom-id"] = node.data.BOMId || "";
      attrs["data-cycle-level"] = node.data.Level || "";
    }

    return attrs;
  };

  // Costruisci un tooltip per componenti bloccati
  const getLockedTooltip = () => {
    if (!isLocked && !isRootNode) return null;

    let message = "Componente non modificabile";

    if (isRootNode && !editMode) {
      message = "Entra in modalità modifica per ricodificare l'articolo principale";
    } else if (isRootNode && node.data.stato_erp === 1) {
      message = "L'articolo principale è presente in ERP e non può essere ricodificato";
    } else if (isRootNode && canRecodeRoot) {
      message = "L'articolo principale può essere ricodificato ma non eliminato";
    } else if (node.data.bomStato_erp === "1" || node.data.bomStato_erp === 1) {
      message =
        "Questo componente è presente in ERP (Mago) e non può essere modificato";
    } else if (
      node.data.parentBOMStato_erp === "1" ||
      node.data.parentBOMStato_erp === 1
    ) {
      message =
        "Il componente padre è presente in ERP (Mago) e blocca le modifiche ai figli";
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertTriangle className="h-3.5 w-3.5 ml-1 text-amber-500" />
          </TooltipTrigger>
          <TooltipContent>
            <p>{message}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Render il badge MAGO per i componenti con distinta in ERP
  const getMagoBadge = () => {
    if (!hasMagoBOM) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="ml-2 px-1 py-0 h-4 text-xs bg-blue-50 text-blue-800 border-blue-200"
            >
              MAGO
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Questo componente ha una distinta presente in ERP (Mago)</p>
            <p className="text-xs text-gray-500 mt-1">
              I componenti di questa distinta non sono modificabili
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // NUOVO: Badge per il livello 0
  const getRootBadge = () => {
    if (!isRootNode) return null;

    return (
      <Badge
        variant="outline"
        className="ml-2 px-1 py-0 h-4 text-xs bg-gray-50 text-gray-800 border-gray-300"
      >
        PRINCIPALE
      </Badge>
    );
  };

  const nodeLabel = getNodeText();
  const hasInvalidCodeLength =
    node.type === "component" &&
    latestComponentCode &&
    latestComponentCode.length !== 15;
  const invalidCodeLengthValue = latestComponentCode
    ? latestComponentCode.length
    : 0;

  // NUOVO: Indicatore di modifiche pendenti
  const getModifiedIndicator = () => {
    if (!hasPendingChanges || !editMode) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Edit2 className="h-3.5 w-3.5 ml-1 text-amber-600" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Questo componente ha modifiche non salvate</p>
            {hasComponentChanges && <p className="text-xs mt-1">- Dettagli componente modificati</p>}
            {hasCycleChanges && <p className="text-xs">- Cicli di produzione modificati</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Render the component
  return (
    <div>
      <div
        ref={setNodeRef}
        className={getNodeClassName()}
        style={{
          paddingLeft: `${indent}px`,
          paddingRight: "8px",
          // MODIFICA: Bordo diverso per il livello 0
          borderLeft:
            node.type === "component"
              ? isRootNode
                ? `3px solid #1f2937` // Bordo più spesso e scuro per il root
                : hasPendingChanges && editMode
                  ? `3px solid #f59e0b` // NUOVO: Bordo ambra per componenti modificati
                  : `2px solid ${getLevelColor(level)}`
              : "none",
        }}
        onClick={handleSelect}
        {...getDataAttributes()}
      >
        {/* Expand/collapse button */}
        <div
          className="w-5 h-5 flex items-center justify-center mr-1"
          onClick={hasChildren ? handleToggle : undefined}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )
          ) : (
            <span className="w-4" />
          )}
        </div>

        {/* MODIFICA: Checkbox visibile anche per root se in editMode e non bloccato da ERP */}
        {node.type === "component" && (
          <>
            {(editMode && canRecodeRoot) || !isRootNode ? (
              <Checkbox
                className={`mr-1.5 h-3.5 w-3.5 ${isChecked ? "bg-primary" : ""}`}
                checked={isChecked}
                disabled={isLockedForSelection || (isRootNode && node.data.stato_erp === 1)}
                onClick={(e) => e.stopPropagation()}
                onCheckedChange={(value) => onNodeCheck && onNodeCheck(node, value)}
              />
            ) : (
              <span className="w-5 h-3.5 mr-1.5" />
            )}
          </>
        )}

        {/* Node icon */}
        <NodeIcon node={node} isRootNode={isRootNode} />

        {/* Node text */}
        <div className="ml-2 flex-1">
          <div
            className="flex items-center justify-between"
            style={{ fontSize: isRootNode ? "14px" : "13px" }}
          >
            <div className="flex items-center">
              <span
                className={cn(
                  "truncate max-w-[280px]",
                  isRootNode && "font-semibold text-gray-800",
                  hasPendingChanges && editMode && "text-amber-700 font-medium", // NUOVO: Testo ambra per componenti modificati
                  hasInvalidCodeLength && "text-rose-600 font-semibold",
                )}
              >
                {nodeLabel}
              </span>
              {node.type === "component" && !isRootNode && getNatureBadge(node)}
              {hasInvalidCodeLength && (
                <Badge className="ml-2 bg-rose-100 text-rose-700 border border-rose-200 text-[10px]">
                  {invalidCodeLengthValue}/15
                </Badge>
              )}
              {getModifiedIndicator()}
              {(isLocked || (isRootNode && !canRecodeRoot)) && getLockedTooltip()}
              {hasMagoBOM && getMagoBadge()}
              {getRootBadge()}
            </div>

            {/* Quantity for components - nascosta per il root */}
            {node.type === "component" &&
              node.data.Quantity &&
              !isRootNode && (
                <span className={cn(
                  "text-xs text-gray-500 ml-2",
                  hasPendingChanges && editMode && "text-amber-600 font-medium" // NUOVO: Evidenzia anche la quantità se modificata
                )}>
                  {getQuantity()}
                </span>
              )}
          </div>
        </div>
      </div>

      {/* When expanded, first show cycles, then component children */}
      {expanded && (
        <div>
          {/* 1. First show associated cycles */}
          {node.type === "component" &&
            hasRoutingCycles &&
            nodeCycles.map((cycle, index) => {
              const cycleNode = {
                id: `cycle-${cycle.BOMId}-${cycle.RtgStep}-${index}`,
                type: "cycle",
                level: node.level + 1,
                data: cycle,
                children: [],
              };

              return (
                <TreeNode
                  key={cycleNode.id}
                  node={cycleNode}
                  expanded={!!expandedNodes[cycleNode.id]}
                  selected={selected && selected === cycleNode.id}
                  onSelect={onSelect}
                  onToggle={onToggle}
                  onNodeCheck={onNodeCheck}
                  level={level + 1}
                />
              );
            })}

          {/* 2. Then show regular component children */}
          {node.children &&
            node.children.length > 0 &&
            node.children.map((childNode) => (
              <TreeNode
                key={childNode.id}
                node={childNode}
                expanded={!!expandedNodes[childNode.id]}
                selected={selected && selected === childNode.id}
                onSelect={onSelect}
                onToggle={onToggle}
                onNodeCheck={onNodeCheck}
                level={level + 1}
                draggingOver={draggingOver}
                dropTarget={dropTarget}
                dropMode={dropMode}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export default TreeNode;