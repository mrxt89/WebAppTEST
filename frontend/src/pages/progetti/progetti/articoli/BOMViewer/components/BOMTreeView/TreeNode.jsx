// TreeNode.jsx - Versione con supporto drag and drop per gestire le due zone di drop
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
    "#6b7280", // Livello 0 - gray-500
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
const NodeIcon = ({ node }) => {
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
  const { expandedNodes, bomRouting, editMode, selectedComponents, canEdit } =
    useBOMViewer();

  const [nodeCycles, setNodeCycles] = useState([]);
  const [debug, setDebug] = useState(false);

  // Configura la droppable area per questo nodo
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-${node.id}`,
    data: {
      type: "component-node",
      node: node,
    },
  });

  // Determina se il componente è in uno stato che ne impedisce la modifica
  const isLocked =
    node.type === "component" &&
    (node.data.parentBOMStato_erp === "1" ||
      node.data.parentBOMStato_erp === 1);

  // Verifica se il componente ha una distinta in MAGO (ERP)
  const hasMagoBOM =
    node.type === "component" &&
    (node.data.bomStato_erp === "1" || node.data.bomStato_erp === 1);

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

  // Check if node is selected via checkbox
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
    if (onNodeCheck && !isLocked) {
      onNodeCheck(node, e.target.checked);
    }
  };

  // Get text for the node
  const getNodeText = () => {
    if (node.type === "component") {
      // For components, show code and description
      const code = node.data.ComponentItemCode || node.data.ComponentCode || "";
      const description =
        node.data.ComponentItemDescription || node.data.Description || "";

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
    if (node.type === "component" && node.data.Quantity) {
      const qty = parseFloat(node.data.Quantity);
      if (isNaN(qty)) return "";

      // Format without trailing zeros
      const formatted = qty.toString();
      return `${formatted} ${node.data.UoM || ""}`;
    }
    return "";
  };

  // Get node class name with improved styling for cycles and drag states
  const getNodeClassName = () => {
    return cn(
      "flex items-center py-1 rounded cursor-pointer hover:bg-gray-100 transition-colors relative",
      selected && "bg-blue-50 text-blue-700 font-medium",
      node.type === "cycle" && "italic text-green-700", // Special styling for cycles
      isLocked && "opacity-75", // Lower opacity for locked components
      isCurrentDragOver && "ring-1 ring-gray-300", // Sottile bordo per indicare che è possibile fare drop
    );
  };

  // Prepare data attributes
  const getDataAttributes = () => {
    const attrs = {
      "data-node-type": node.type,
      "data-node-id": node.id,
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
    if (!isLocked) return null;

    let message = "Componente non modificabile";

    if (node.data.bomStato_erp === "1" || node.data.bomStato_erp === 1) {
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

  // Render the component
  return (
    <div>
      <div
        ref={setNodeRef}
        className={getNodeClassName()}
        style={{
          paddingLeft: `${indent}px`,
          paddingRight: "8px",
          borderLeft:
            node.type === "component"
              ? `2px solid ${getLevelColor(level)}`
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

        {/* Checkbox for components */}
        {node.type === "component" && (
          <Checkbox
            className={`mr-1.5 h-3.5 w-3.5 ${isChecked ? "bg-primary" : ""}`}
            checked={isChecked}
            disabled={isLocked && editMode}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={(value) => onNodeCheck && onNodeCheck(node, value)}
          />
        )}

        {/* Node icon */}
        <NodeIcon node={node} />

        {/* Node text */}
        <div className="ml-2 flex-1">
          <div
            className="flex items-center justify-between"
            style={{ fontSize: "13px" }}
          >
            <div className="flex items-center">
              <span className="truncate max-w-[280px]">{getNodeText()}</span>
              {isLocked && getLockedTooltip()}
              {hasMagoBOM && getMagoBadge()}
            </div>

            {/* Quantity for components */}
            {node.type === "component" && node.data.Quantity && (
              <span className="text-xs text-gray-500 ml-2">
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
            nodeCycles.map((cycle) => {
              const cycleNode = {
                id: `cycle-${cycle.BOMId}-${cycle.RtgStep}`,
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
