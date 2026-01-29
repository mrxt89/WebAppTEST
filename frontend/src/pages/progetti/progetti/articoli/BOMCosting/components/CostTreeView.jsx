import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ChevronDown,
  ChevronRight,
  Package,
  Wrench,
  DollarSign,
  TrendingUp,
  Settings,
  Maximize2,
  Minimize2,
  Home,
  ShoppingCart,
  CircuitBoard,
  Factory,
  Search,
  Download,
  FileSpreadsheet,
  Info
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency } from '@/lib/bomCostingUtils';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import MarkupDetailModal from './MarkupDetailModal';

const COLUMN_WIDTHS = {
  name: "40%",
  quantity: "6%",
  uom: "5%",
  lot: "7%",
  unitCost: "8%",
  fixedCost: "7%",
  variableCost: "8%",
  totalTime: "8%",
  setupTime: "6%",
  workCenter: "5%",
};

const getLevelColor = (level) => {
  const LEVEL_COLORS = [
    "#1f2937",
    "#3b82f6",
    "#22c55e",
    "#f59e0b",
    "#a855f7",
    "#ec4899",
    "#6366f1",
    "#ef4444",
    "#06b6d4",
    "#10b981",
  ];

  const colorIndex = level < LEVEL_COLORS.length ? level : level % LEVEL_COLORS.length;
  return LEVEL_COLORS[colorIndex];
};

const parseSeconds = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "string") {
    if (value.includes(":")) {
      const parts = value.split(":").map((p) => parseInt(p, 10) || 0);
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    }
    const parsed = parseFloat(value.replace(",", "."));
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return Number.isFinite(value) ? value : 0;
};

const formatDurationHuman = (seconds) => {
  const totalSeconds = Math.max(0, Math.round(seconds || 0));
  if (totalSeconds === 0) return "-";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs.toString().padStart(2, "0")}s`;
  }
  return `${secs}s`;
};

const formatDurationDigital = (seconds) => {
  const totalSeconds = Math.max(0, Math.round(seconds || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    secs.toString().padStart(2, "0"),
  ].join(":");
};

// Component per l'icona del nodo
const NodeIcon = ({ node, isRootNode }) => {
  if (isRootNode) {
    return <Home className="h-4 w-4 text-gray-700" />;
  }

  if (node.type === "cycle") {
    return <Factory className="h-4 w-4 text-green-500" />;
  }

  const nature = node.data.ComponentNature || node.data.Nature;

  switch (Number(nature)) {
    case 22413312: // Semi-finished
      return <CircuitBoard className="h-4 w-4 text-blue-500" />;
    case 22413313: // Finished product
      return <Package className="h-4 w-4 text-green-500" />;
    case 22413314: // Purchase
      return <ShoppingCart className="h-4 w-4 text-amber-500" />;
    default:
      return <Package className="h-4 w-4 text-gray-500" />;
  }
};

// Componente per un nodo ciclo
const CycleNode = ({ cycle, level }) => {
  const baseIndent = 8;
  const indentPerLevel = 24;
  const indent = level * indentPerLevel + baseIndent;

  const operationName = cycle.Operation || cycle.OperationDescription || `Fase ${cycle.RtgStep || ''}`;
  const workCenter = cycle.WorkCenterDescription || cycle.WorkCenter || cycle.WC || '';
  const quantity = cycle.Qty || 1;
  const unitCost = cycle.UnitCost || 0;
  const fixedCost = cycle.FixedCost || 0;
  const productionLot = Number(cycle.ProductionLot) || 1;
  const processingSeconds = parseSeconds(cycle.ProcessingTime);
  const setupSeconds = parseSeconds(cycle.SetupTime);
  const totalProcessingSeconds = processingSeconds * productionLot;
  const variableCost = unitCost * quantity;

  return (
    <div>
      <div
        className={cn("flex items-center py-1 px-2 rounded hover:bg-green-50 transition-colors", "border-l-2")}
        style={{
          borderLeftColor: getLevelColor(level),
          backgroundColor: level > 0 ? `${getLevelColor(level)}05` : undefined
        }}
      >
        {level > 0 && (
          <div
            className="flex items-center justify-center w-4 h-4 mr-2 text-xs font-medium rounded-full flex-shrink-0"
            style={{
              backgroundColor: getLevelColor(level),
              color: 'white',
              fontSize: '8px'
            }}
            title={`Livello ${level} - Ciclo`}
          >
            {level}
          </div>
        )}

        <div className="w-3 mr-1" />

        <Factory className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />

        <div className="flex-1 flex items-center ml-2 min-w-0">
          <div
            className="flex items-center gap-2 min-w-0"
            style={{
              width: COLUMN_WIDTHS.name,
              paddingLeft: `${indent}px`
            }}
          >
            <span className="font-medium text-green-800 truncate">
              {operationName}
            </span>
            {workCenter && (
              <span className="text-xs text-green-600">({workCenter})</span>
            )}
          </div>

          <div className="text-xs text-gray-700 text-right flex-shrink-0" style={{ width: COLUMN_WIDTHS.quantity }}>
            {quantity}
          </div>

          <div className="text-xs text-gray-600 text-center flex-shrink-0" style={{ width: COLUMN_WIDTHS.uom }}>
            -
          </div>

          <div className="text-xs text-gray-700 text-right flex-shrink-0" style={{ width: COLUMN_WIDTHS.lot }}>
            {cycle.ProductionLot || '-'}
          </div>

          <div className="text-xs font-medium text-gray-900 text-right flex-shrink-0" style={{ width: COLUMN_WIDTHS.unitCost }}>
            {formatCurrency(unitCost)}
          </div>

          <div className="text-xs font-medium text-orange-700 text-right flex-shrink-0" style={{ width: COLUMN_WIDTHS.fixedCost }}>
            {fixedCost > 0 ? formatCurrency(fixedCost) : '-'}
          </div>

          <div className="text-xs font-semibold text-green-900 text-right flex-shrink-0" style={{ width: COLUMN_WIDTHS.variableCost }}>
            {formatCurrency(variableCost)}
          </div>

          <div className="text-xs text-gray-900 text-right flex-shrink-0" style={{ width: COLUMN_WIDTHS.totalTime }}>
            {formatDurationHuman(totalProcessingSeconds)}
          </div>

          <div className="text-xs text-gray-900 text-right flex-shrink-0" style={{ width: COLUMN_WIDTHS.setupTime }}>
            {formatDurationHuman(setupSeconds)}
          </div>

          <div
            className="text-xs text-gray-700 text-left flex-shrink-0 truncate"
            style={{ width: COLUMN_WIDTHS.workCenter }}
            title={workCenter || ''}
          >
            {workCenter || '-'}
          </div>
        </div>
      </div>
    </div>
  );
};

const calculateChildrenCost = (node, parentLot = 100) => {
  if (!node.children || node.children.length === 0) {
    return { variableCost: 0, fixedCostTotal: 0 };
  }

  // Somma i costi variabili e i costi fissi totali separatamente
  const result = node.children.reduce((acc, child) => {
    // Se il figlio è un'operazione (cycle), aggiungi il suo costo
    if (child.type === "cycle") {
      const cycleProcessingCost = child.data.UnitCost || 0; // Costo variabile dell'operazione
      // IMPORTANTE: I costi fissi sono già unitari, usa FixedCost (non FixedCostTotal)
      const cycleFixedCost = child.data.FixedCost || 0;
      return {
        variableCost: acc.variableCost + cycleProcessingCost,
        fixedCostTotal: acc.fixedCostTotal + cycleFixedCost
      };
    }

    // Se il figlio è un componente:
    // - Se ha figli propri → somma SOLO i costi dei suoi figli (ricorsivo)
    // - Se NON ha figli (foglia) → usa MaterialCost + OperationCost + FixedCostTotal
    if (child.type === "component") {
      const hasGrandChildren = child.children && child.children.length > 0;

      if (hasGrandChildren) {
        // Ha figli: somma solo i costi dei figli (i costi propri sarebbero duplicati)
        // NON sommare childFixedCostTotal perché i costi fissi sono già inclusi nei figli
        // Usa il lotto del componente figlio per il calcolo ricorsivo
        const childLot = child.data.ProductionLot || child.data.BOMProductionLot || parentLot;
        const childrenResult = calculateChildrenCost(child, childLot);
        // NON sommare childFixedCostTotal perché i costi fissi del componente con figli
        // sono già distribuiti nei suoi figli (ricorsivamente)
        return {
          variableCost: acc.variableCost + childrenResult.variableCost,
          fixedCostTotal: acc.fixedCostTotal + childrenResult.fixedCostTotal
        };
      } else {
        // Foglia: usa i dati RAW originali
        // NOTA: I cicli del componente foglia sono già processati come child.type === "cycle"
        // quindi non vanno aggiunti di nuovo qui
        const materialCost = child.data.MaterialCost || 0;
        const operationCost = child.data.OperationCost || 0;
        
        // IMPORTANTE: I costi fissi sono già unitari, usa sempre FixedCost (non FixedCostTotal)
        const childFixedCost = child.data.FixedCost !== undefined && child.data.FixedCost !== null
          ? child.data.FixedCost
          : 0;
        
        return {
          variableCost: acc.variableCost + materialCost + operationCost,
          fixedCostTotal: acc.fixedCostTotal + childFixedCost
        };
      }
    }

    return acc;
  }, { variableCost: 0, fixedCostTotal: 0 });

  return result;
};

// Componente per un nodo componente
const ComponentNode = ({ node, level, expanded, onToggle, children, searchQuery }) => {
  // MIGLIORATO: Sistema di indentazione progressivo
  // Calcola l'indentazione in base al livello del nodo
  const baseIndent = 8; // Indentazione base in pixel
  const indentPerLevel = 24; // Pixel di indentazione per ogni livello
  const indent = level * indentPerLevel + baseIndent;

  const isRootNode = node.data.Level === 0;
  const hasChildren = node.children && node.children.length > 0;

  // Verifica se ha figli COMPONENTI (non solo cicli)
  const hasComponentChildren = node.children && node.children.some(child => child.type === "component");

  // Logica di visualizzazione dei costi:
  // 1. Se ESPANSO e ha figli COMPONENTI → mostra solo il FixedCost del componente, i costi variabili sono nei figli
  // 2. Se COMPRESSO e ha figli COMPONENTI → mostra la somma ricorsiva di tutti i costi dei figli + FixedCost proprio
  // 3. Se NON ha figli COMPONENTI (foglia) → mostra tutti i costi propri (anche se ha cicli)

  const ownCost = node.data.CalculatedTotalCost || node.data.TotalCost || 0;
  const ownUnitCost = node.data.UnitCost || 0;
  const componentLot = node.data.ProductionLot || node.data.BOMProductionLot || 1;
  
  // Calcola i costi fissi PROPRI del componente (solo dai suoi cicli diretti, non accumulati dai figli)
  // Per componenti con figli, i costi fissi propri sono solo quelli dei cicli (operazioni) diretti
  const ownFixedCostFromCycles = node.children && node.children.length > 0
    ? node.children
        .filter(child => child.type === "cycle")
        .reduce((sum, cycle) => sum + (cycle.data.FixedCost || 0), 0)
    : 0;
  
  // Usa i costi fissi dai cicli se disponibili, altrimenti usa FixedCost dal backend
  // IMPORTANTE: FixedCost è già unitario, non va diviso per il lotto
  const ownFixedCost = ownFixedCostFromCycles > 0 
    ? ownFixedCostFromCycles
    : (node.data.FixedCost !== undefined ? node.data.FixedCost : 
       (componentLot > 0 && node.data.FixedCostTotal ? (node.data.FixedCostTotal / componentLot) : 0));
  
  const ownMaterialCost = node.data.MaterialCost || 0;
  const ownOperationCost = node.data.OperationCost || 0;
  let ownVariableCost = ownMaterialCost + ownOperationCost;
  if (ownVariableCost === 0) {
    ownVariableCost = Math.max(ownCost - ownFixedCost, 0);
  }

  let variableCost, unitCost, fixedCost;

  if (hasComponentChildren) {
    // Ha figli COMPONENTI (altri articoli nella distinta)
    if (expanded) {
      // Espanso con figli componenti → i costi variabili sono visualizzati nei figli componenti.
      // NON mostrare costi fissi perché:
      // 1. I cicli (operazioni) del componente sono già mostrati come nodi separati
      // 2. I costi fissi dei componenti figli sono già mostrati nei componenti figli
      variableCost = 0; // I costi variabili sono visualizzati nei figli
      unitCost = 0; // I costi unitari sono nei figli
      fixedCost = 0; // I costi fissi sono nei cicli (mostrati separatamente) e nei componenti figli
    } else {
      // Compresso con figli componenti → mostra SOLO la somma ricorsiva dei costi fissi dei figli
      // NON sommare ownFixedCost perché i costi fissi appartengono solo ai componenti foglia
      const childrenCostResult = calculateChildrenCost(node, componentLot);

      // IMPORTANTE: I costi fissi sono già unitari, fixedCostTotal è già la somma dei costi fissi unitari
      // NON dividere per il lotto!
      const fixedCostUnitFromChildren = childrenCostResult.fixedCostTotal || 0;

      variableCost = childrenCostResult.variableCost;
      unitCost = 0; // Il costo unitario non ha senso per un aggregato
      fixedCost = fixedCostUnitFromChildren; // Solo costi fissi dei figli, NON del componente padre
    }
  } else {
    // Foglia senza figli COMPONENTI (può avere solo cicli o niente)
    // → mostra TUTTI i costi propri, incluso il FixedCost
    variableCost = ownVariableCost;
    unitCost = ownUnitCost;
    fixedCost = ownFixedCost; // FixedCost del componente
  }

  const uom = node.data.UoM || '';

  // Testo del nodo
  const nodeCode = node.data.ComponentItemCode || node.data.ItemCode || node.data.ComponentCode || '';
  const nodeDesc = node.data.ComponentItemDescription || node.data.Description || node.data.ComponentDescription || '';
  const nodeText = nodeCode ? `${nodeCode} - ${nodeDesc}` : nodeDesc;

  // Evidenzia il testo in base alla ricerca
  const highlightText = (text) => {
    if (!searchQuery) return text;

    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ?
        <mark key={i} className="bg-yellow-200">{part}</mark> : part
    );
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center py-1 px-2 rounded cursor-pointer hover:bg-blue-50 transition-colors",
          "border-l-2",
          expanded && "bg-blue-50",
          isRootNode && "bg-purple-50 hover:bg-purple-100 font-semibold"
        )}
        style={{
          borderLeftColor: getLevelColor(level),
          backgroundColor: level > 0 ? `${getLevelColor(level)}05` : undefined // Colore più tenue per la card
        }}
        onClick={onToggle}
      >
        {/* NUOVO: Numero del livello a sinistra */}
        {level > 0 && (
          <div
            className="flex items-center justify-center w-4 h-4 mr-2 text-xs font-medium rounded-full flex-shrink-0"
            style={{
              backgroundColor: getLevelColor(level),
              color: 'white',
              fontSize: '8px'
            }}
            title={`Livello ${level}`}
          >
            {level}
          </div>
        )}

        {/* Toggle icon */}
        <div className="mr-1">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-3 w-3 text-gray-500" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-500" />
            )
          ) : (
            <div className="w-3" /> // Spacer
          )}
        </div>

        {/* Component icon */}
        <NodeIcon node={node} isRootNode={isRootNode} />

        {/* Component info - Layout tabellare */}
        <div className="flex-1 flex items-center ml-2 min-w-0">
          <div 
            className="flex items-center gap-2 min-w-0" 
            style={{ 
              width: COLUMN_WIDTHS.name,
              paddingLeft: `${indent}px`
            }}
          >
            <span className={cn(
              "truncate",
              isRootNode ? "text-purple-900 font-semibold" : "text-blue-900"
            )}>
              {highlightText(nodeText)}
            </span>
            {isRootNode && (
              <Badge variant="outline" className="flex-shrink-0 h-4 text-xs bg-purple-100">
                PF
              </Badge>
            )}

          </div>

          <div className="text-xs text-gray-700 text-right flex-shrink-0" style={{ width: COLUMN_WIDTHS.quantity }}>
            {!isRootNode && node.data.Quantity > 0 ? (
              <>{node.data.Quantity.toFixed(3)}</>
            ) : (
              <>1</>
            )}
          </div>

          <div className="text-xs text-gray-600 text-center flex-shrink-0" style={{ width: COLUMN_WIDTHS.uom }}>
            {uom}
          </div>

          <div className="text-xs text-gray-700 text-right flex-shrink-0" style={{ width: COLUMN_WIDTHS.lot }}>
            {node.data.ProductionLot ?? node.data.BOMProductionLot ?? '-'}
          </div>

          <div className="text-xs font-medium text-gray-900 text-right flex-shrink-0" style={{ width: COLUMN_WIDTHS.unitCost }}>
            {formatCurrency(unitCost)}
          </div>

          <div className="text-xs font-medium text-orange-700 text-right flex-shrink-0" style={{ width: COLUMN_WIDTHS.fixedCost }}>
            {fixedCost > 0 ? formatCurrency(fixedCost) : '-'}
          </div>

          {/* Colonna Costo Variabile */}
          <div className={cn(
            "text-xs font-semibold text-right flex-shrink-0",
            isRootNode ? "text-purple-900 text-sm" : "text-blue-900"
          )} style={{ width: COLUMN_WIDTHS.variableCost }}>
            {formatCurrency(variableCost)}
          </div>

          <div className="text-xs text-gray-500 text-center flex-shrink-0" style={{ width: COLUMN_WIDTHS.totalTime }}>
            -
          </div>

          <div className="text-xs text-gray-500 text-center flex-shrink-0" style={{ width: COLUMN_WIDTHS.setupTime }}>
            -
          </div>

          <div className="text-xs text-gray-500 text-left flex-shrink-0" style={{ width: COLUMN_WIDTHS.workCenter }}>
            -
          </div>
        </div>
      </div>


      {/* Render children */}
      {expanded && children}
    </div>
  );
};

// Componente principale TreeNode ricorsivo
const TreeNode = ({ node, level = 0, expandedNodes, onToggle, searchQuery }) => {
  const isExpanded = expandedNodes.has(node.id);

  if (node.type === "cycle") {
    return <CycleNode cycle={node.data} level={level} />;
  }

  // Render component node con eventuali figli
  return (
    <ComponentNode
      node={node}
      level={level}
      expanded={isExpanded}
      onToggle={() => onToggle(node.id)}
      searchQuery={searchQuery}
    >
      {node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </ComponentNode>
  );
};

/**
 * Componente per visualizzare la struttura ad albero dei costi BOM
 * Utilizza la stessa logica grafica della BOMTreeView ma con i dati di costificazione
 */
const CostTreeView = ({ costingResult }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMarkupDetail, setShowMarkupDetail] = useState(false);
  const [showCostingRules, setShowCostingRules] = useState(false);

  // Costruisci l'albero dai dati di costificazione
  const treeData = useMemo(() => {
    console.log('CostTreeView - costingResult:', costingResult);

    if (!costingResult || !costingResult.components) {
      console.log('CostTreeView - No costingResult or components');
      return [];
    }

    const components = costingResult.components;
    const costing = costingResult.costing || {};
    const routing = costingResult.routing || [];
    const productionLot = costing.production_lot || 100;

    // I costi sono nell'oggetto costing, non nei dati di routing
    // I dati di routing contengono solo i tempi, non i costi


    // Mappa per tenere traccia dei nodi
    const nodeMap = {};
    const rootNodes = [];

    // Primo passaggio: crea tutti i nodi componente
    components.forEach((comp, index) => {
      // USA IL PATH COME ID UNIVOCO per distinguere lo stesso componente in rami diversi
      // Se Path non è disponibile, fallback al vecchio metodo
      const nodeId = comp.Path
        ? `component-path-${comp.Path}`
        : `component-${comp.ComponentId || index}-${comp.Level}-${index}`;

      // IMPORTANTE: Usa i costi che arrivano direttamente dal backend SENZA ricalcolarli
      // Il backend restituisce già: UnitCost, FixedCost, TotalCost, CalculatedTotalCost
      // MaterialCost, OperationCost già calcolati dalla stored procedure

      // I dati vengono passati correttamente dal backend con tutti i campi inclusi FixedCost

      const node = {
        id: nodeId,
        type: "component",
        level: comp.Level || 0,
        data: {
          ...comp,
          // Mantieni TUTTI i campi del backend inclusi i costi pre-calcolati
          // NON sovrascrivere i costi, usa direttamente quelli del backend
          // Usa il ProductionLot specifico del componente dalla sua BOM
          // Solo per il nodo root (Level 0) usa il productionLot principale se non presente
          ProductionLot: comp.ProductionLot || comp.BOMProductionLot || (comp.Level === 0 ? productionLot : undefined),
          BOMProductionLot: comp.BOMProductionLot || (comp.Level === 0 ? productionLot : undefined)
        },
        children: []
      };

      nodeMap[nodeId] = node;

      // Solo i nodi di livello 0 sono root
      if (comp.Level === 0) {
        rootNodes.push(node);
      }
    });

    // Secondo passaggio: aggiungi i cicli ai componenti (usa SOLO routing, no comp.operations per evitare duplicati)
    components.forEach((comp, index) => {
      const nodeId = comp.Path
        ? `component-path-${comp.Path}`
        : `component-${comp.ComponentId || index}-${comp.Level}-${index}`;
      const componentNode = nodeMap[nodeId];

      // Aggiungi i cicli di routing per questo componente
      const componentRouting = routing.filter(route => String(route.BOMId) === String(comp.BOMId));

      // Dedup per chiave (BOMId+RtgStep+Operation)
      const seenKeys = new Set();
      componentRouting.forEach((route, opIndex) => {
        const key = `${route.BOMId}|${route.RtgStep}|${route.Operation}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        // IMPORTANTE: Usa i costi che arrivano dal backend nelle operazioni di routing
        // Il backend restituisce già ProcessingCost e SetupCost calcolati
        // REGOLA: Per i costi fissi delle operazioni si usa il costo TOTALE di setup, non diviso per lotto
        const componentProductionLot = comp.ProductionLot || comp.BOMProductionLot || productionLot;
        const processingCost = route.ProcessingCost || 0;
        const setupCostTotal = route.SetupCost || 0; // Costo fisso totale per il lotto
        // NON dividere per il lotto - usiamo il costo totale
        const totalCost = route.TotalCost || (processingCost + setupCostTotal);

        const cycleNode = {
          id: `cycle-${nodeId}-${opIndex}`,
          type: "cycle",
          level: comp.Level + 1,
          data: {
            ...route,
            // Usa i costi pre-calcolati dal backend
            UnitCost: processingCost,
            FixedCost: setupCostTotal, // Costo fisso TOTALE (non diviso per lotto)
            FixedCostTotal: setupCostTotal, // Mantieni anche il totale
            TotalCost: totalCost,
            Operation: route.Operation,
            OperationDescription: route.OperationDescription,
            WorkCenter: route.WorkCenter,
            WorkCenterDescription: route.WorkCenterDescription,
            Qty: route.Qty || 1,
            ProductionLot: componentProductionLot // Usa il lotto del componente, non quello principale
          },
          children: []
        };
        componentNode.children.push(cycleNode);
      });
    });

    // Terzo passaggio: costruisci la gerarchia
    components.forEach((comp, index) => {
      if (comp.Level === 0) return; // Skip solo il nodo root (livello 0)

      const nodeId = comp.Path
        ? `component-path-${comp.Path}`
        : `component-${comp.ComponentId || index}-${comp.Level}-${index}`;
      const currentNode = nodeMap[nodeId];

      if (!currentNode) return;

      // Trova il parent tramite il Path
      if (comp.Path) {
        const pathParts = comp.Path.split(".");
        pathParts.pop(); // Rimuovi l'ultimo elemento (nodo corrente)
        const parentPath = pathParts.join(".");
        const parentNodeId = `component-path-${parentPath}`;

        // Cerca il nodo parent usando l'ID generato dal Path
        const parentNode = nodeMap[parentNodeId];

        if (parentNode) {
          parentNode.children.push(currentNode);
        } else {
          // Se non trovato, aggiungi come root
          if (!rootNodes.includes(currentNode)) {
            rootNodes.push(currentNode);
          }
        }
      } else {
        // Fallback: cerca il parent per livello
        const parentLevel = comp.Level - 1;
        const parentNodes = Object.values(nodeMap).filter(n => n.level === parentLevel);

        if (parentNodes.length > 0) {
          const lastParent = parentNodes[parentNodes.length - 1];
          lastParent.children.push(currentNode);
        } else {
          if (!rootNodes.includes(currentNode)) {
            rootNodes.push(currentNode);
          }
        }
      }
    });

    // Se non ci sono componenti, crea un nodo root con i dati di costing
    if (rootNodes.length === 0) {
      const rootNode = {
        id: 'root',
        type: 'component',
        level: 0,
        data: {
          ComponentId: 0,
          Level: 0,
          ComponentItemCode: costingResult.bomCode || 'Prodotto Finito',
          ComponentItemDescription: costingResult.bomDescription || '',
          TotalCost: costing.unit_cost_final || 0,
          UnitCost: costing.unit_cost_final || 0,
          MaterialCost: costing.variable_costs_material || 0,
          OperationCost: costing.variable_costs_operations || 0,
          FixedCost: costing.fixed_costs_per_lot || 0
        },
        children: []
      };
      rootNodes.push(rootNode);
    } else if (rootNodes.length > 0 && rootNodes[0].level === 0) {
      // Arricchisci il nodo root con i dati di costing
      rootNodes[0].data = {
        ...rootNodes[0].data,
        TotalCost: costing.unit_cost_final || rootNodes[0].data.TotalCost || 0,
        MaterialCost: costing.variable_costs_material || 0,
        OperationCost: costing.variable_costs_operations || 0,
        FixedCost: costing.fixed_costs_per_lot || 0
      };
    }

    // Ordina i nodi
    const sortNodes = (nodes) => {
      nodes.sort((a, b) => (a.data.Line || 0) - (b.data.Line || 0));
      nodes.forEach(node => {
        if (node.children.length > 0) {
          sortNodes(node.children);
        }
      });
    };
    sortNodes(rootNodes);

    // Log strutturati per debug rapido
    try {
      const compTable = components.map(c => ({
        ComponentId: c.ComponentId,
        BOMId: c.BOMId,
        Level: c.Level,
        Qty: c.Quantity,
        UnitCost: c.UnitCost,
        FixedCost: c.FixedCost,
        TotalCost: c.TotalCost,
        MaterialCost: c.MaterialCost,
        OperationCost: c.OperationCost
      }));
      console.group('BOM Costing Debug');
      console.log('costingResult:', costingResult);
      console.log('BOM:', costingResult.bomCode, 'Items:', components.length, 'Routing:', routing.length);
      console.table(compTable);
      const routingTable = routing.map(r => ({
        BOMId: r.BOMId,
        ComponentId: r.ComponentId,
        RtgStep: r.RtgStep,
        Operation: r.Operation,
        ProcTime_s: r.ProcessingTime,
        SetupTime_s: r.SetupTime,
        WC: r.WC || r.WorkCenter
      }));
      console.table(routingTable);
      console.groupEnd();
    } catch(_e) {}

    return rootNodes;
  }, [costingResult]);

  // Filtra i nodi in base alla ricerca
  const filteredTreeData = useMemo(() => {
    if (!searchQuery.trim()) return treeData;

    const matchesSearch = (node) => {
      const text = node.type === "component"
        ? `${node.data.ComponentItemCode || ''} ${node.data.ComponentItemDescription || ''}`
        : `${node.data.Operation || ''} ${node.data.OperationDescription || ''}`;

      return text.toLowerCase().includes(searchQuery.toLowerCase());
    };

    const filterNodes = (nodes) => {
      const filtered = [];

      for (const node of nodes) {
        if (matchesSearch(node)) {
          filtered.push({ ...node });
        } else if (node.children && node.children.length > 0) {
          const filteredChildren = filterNodes(node.children);
          if (filteredChildren.length > 0) {
            filtered.push({ ...node, children: filteredChildren });
          }
        }
      }

      return filtered;
    };

    return filterNodes(treeData);
  }, [treeData, searchQuery]);

  // Toggle nodo
  const toggleNode = useCallback((nodeId) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // Espandi tutto
  const expandAll = useCallback(() => {
    const allNodeIds = new Set();

    const collectIds = (nodes) => {
      nodes.forEach(node => {
        allNodeIds.add(node.id);
        if (node.children && node.children.length > 0) {
          collectIds(node.children);
        }
      });
    };

    collectIds(treeData);
    setExpandedNodes(allNodeIds);
  }, [treeData]);

  // Comprimi tutto
  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set(['root']));
  }, []);

  // Esporta in Excel
  const exportToExcel = useCallback(() => {
    if (!costingResult) return;

    // Funzione ricorsiva per appiattire l'albero in righe Excel
    const flattenTree = (nodes, level = 0, parentPath = '') => {
      const rows = [];

      nodes.forEach((node, index) => {
        if (node.type === 'component') {
          const itemCode = node.data.ComponentItemCode || node.data.ItemCode || '';
          const description = node.data.ComponentItemDescription || node.data.Description || '';
          const quantity = node.data.Quantity || 1;
          const uom = node.data.UoM || '';
          const isRoot = node.data.Level === 0;

          // Verifica se ha figli (componenti o cicli)
          const hasChildren = node.children && node.children.length > 0;

          const componentLot = node.data.ProductionLot || node.data.BOMProductionLot || 1;
          const ownFixedCostTotal = node.data.FixedCostTotal || (node.data.FixedCost * componentLot) || 0;
          const ownFixedCost = componentLot > 0 ? (ownFixedCostTotal / componentLot) : (node.data.FixedCost || 0);
          const materialCost = node.data.MaterialCost || 0;
          const operationCost = node.data.OperationCost || 0;
          let ownVariableCost = materialCost + operationCost;
          if (ownVariableCost === 0) {
            const total = node.data.CalculatedTotalCost || node.data.TotalCost || 0;
            ownVariableCost = Math.max(total - ownFixedCost, 0);
          }

          let unitCost;
          let fixedCost;
          let variableCost;

          if (hasChildren) {
            const childrenCosts = calculateChildrenCost(node, componentLot);
            const fixedFromChildren = componentLot > 0 ? (childrenCosts.fixedCostTotal / componentLot) : 0;

            unitCost = 0;
            variableCost = childrenCosts.variableCost;
            fixedCost = fixedFromChildren + ownFixedCost;
          } else {
            unitCost = node.data.UnitCost || 0;
            variableCost = ownVariableCost;
            fixedCost = ownFixedCost;
          }

          rows.push({
            'Livello': level,
            'Tipo': isRoot ? 'Prodotto Finito' : 'Componente',
            'Codice': itemCode,
            'Descrizione': description,
            'Quantità': quantity,
            'UM': uom,
            'Costo Unitario (€)': unitCost,
            'C. Fissi (€)': fixedCost > 0 ? fixedCost : null,
            'Costo Variabile (€)': variableCost,
            'Tempo Totale (hh:mm:ss)': '',
            'Tempo Setup (hh:mm:ss)': '',
            'CDL': ''
          });

          // Aggiungi i cicli (operazioni) del componente
          if (node.children) {
            node.children.forEach(child => {
              if (child.type === 'cycle') {
                const operation = child.data.Operation || child.data.OperationDescription || '';
                const workCenter = child.data.WorkCenterDescription || child.data.WorkCenter || child.data.WC || '';
                const cycleQty = child.data.Qty || 1;
                const cycleUnitCost = child.data.UnitCost || 0;
                const cycleFixedCost = child.data.FixedCost || 0;
                const cycleVariableCost = cycleUnitCost * cycleQty;
                const productionLot = Number(child.data.ProductionLot) || 1;
                const totalProcessingSeconds = parseSeconds(child.data.ProcessingTime) * productionLot;
                const setupSeconds = parseSeconds(child.data.SetupTime);

                rows.push({
                  'Livello': level + 1,
                  'Tipo': 'Operazione',
                  'Codice': `${operation} (${workCenter})`,
                  'Descrizione': child.data.OperationDescription || '',
                  'Quantità': cycleQty,
                  'UM': '-',
                  'Costo Unitario (€)': cycleUnitCost,
                  'Costi Fissi (€)': cycleFixedCost > 0 ? cycleFixedCost : null,
                  'Costo Variabile (€)': cycleVariableCost,
                  'Tempo Totale (hh:mm:ss)': formatDurationDigital(totalProcessingSeconds),
                  'Tempo Setup (hh:mm:ss)': formatDurationDigital(setupSeconds),
                  'CDL': workCenter
                });
              }
            });

            // Ricorsione sui componenti figli
            const childComponents = node.children.filter(c => c.type === 'component');
            if (childComponents.length > 0) {
              rows.push(...flattenTree(childComponents, level + 1, `${parentPath}${itemCode}/`));
            }
          }
        }
      });

      return rows;
    };

    // Genera i dati per l'Excel
    const flatData = flattenTree(treeData);

    // Aggiungi un header con informazioni riepilogative
    const costing = costingResult.costing || {};
    const summaryRows = [
      {
        'Livello': 'RIEPILOGO COSTI',
        'Tipo': '',
        'Codice': costingResult.bomCode || '',
        'Descrizione': costingResult.bomDescription || '',
        'Quantità': null,
        'UM': '',
        'Costo Unitario (€)': null,
        'C. Fissi (€)': costing.fixed_costs_per_lot || 0,
        'C. Variabile (€)': costing.total_variable_costs ||
          ((costing.variable_costs_material || 0) + (costing.variable_costs_operations || 0)),
        'Tempo Totale (hh:mm:ss)': '',
        'Tempo Setup (hh:mm:ss)': '',
        'CDL': ''
      },
      {
        'Livello': 'Lotto Produzione',
        'Tipo': '',
        'Codice': '',
        'Descrizione': '',
        'Quantità': costing.production_lot || 100,
        'UM': 'NR',
        'Costo Unitario (€)': null,
        'C. Fissi (€)': null,
        'Costo Variabile (€)': null,
        'Tempo Totale (hh:mm:ss)': '',
        'Tempo Setup (hh:mm:ss)': '',
        'CDL': ''
      },
      {
        'Livello': 'Materiali',
        'Tipo': '',
        'Codice': '',
        'Descrizione': '',
        'Quantità': null,
        'UM': '',
        'Costo Unitario (€)': null,
        'C. Fissi (€)': null,
        'C. Variabile (€)': costing.variable_costs_material || 0,
        'Tempo Totale (hh:mm:ss)': '',
        'Tempo Setup (hh:mm:ss)': '',
        'CDL': ''
      },
      {
        'Livello': 'Operazioni',
        'Tipo': '',
        'Codice': '',
        'Descrizione': '',
        'Quantità': null,
        'UM': '',
        'Costo Unitario (€)': null,
        'C. Fissi (€)': null,
        'C. Variabile (€)': costing.variable_costs_operations || 0,
        'Tempo Totale (hh:mm:ss)': '',
        'Tempo Setup (hh:mm:ss)': '',
        'CDL': ''
      },
      {
        'Livello': 'Fissi',
        'Tipo': '',
        'Codice': '',
        'Descrizione': '',
        'Quantità': null,
        'UM': '',
        'Costo Unitario (€)': null,
        'C. Fissi (€)': costing.fixed_costs_per_lot || 0,
        'C. Variabile (€)': null,
        'Tempo Totale (hh:mm:ss)': '',
        'Tempo Setup (hh:mm:ss)': '',
        'CDL': ''
      },
      {
        'Livello': 'Ricarichi',
        'Tipo': '',
        'Codice': '',
        'Descrizione': '',
        'Quantità': null,
        'UM': '',
        'Costo Unitario (€)': null,
        'Costi Fissi (€)': null,
        'C. Variabile (€)': (costing.ricarico_mp_amount || 0) +
          (costing.ricarico_ope_amount || 0) +
          (costing.ricarico_trasporto_amount || 0) +
          (costing.ricarico_scarto_amount || 0) +
          (costing.ricarico_totale_amount || 0) +
          (costing.ricarico_sconto_amount || 0),
        'Tempo Totale (hh:mm:ss)': '',
        'Tempo Setup (hh:mm:ss)': '',
        'CDL': ''
      },
      {}, // Riga vuota
      {
        'Livello': 'DETTAGLIO COMPONENTI',
        'Tipo': '',
        'Codice': '',
        'Descrizione': '',
        'Quantità': null,
        'UM': '',
        'Costo Unitario (€)': null,
        'C. Fissi (€)': null,
        'C. Variabile (€)': null,
        'Tempo Totale (hh:mm:ss)': '',
        'Tempo Setup (hh:mm:ss)': '',
        'CDL': ''
      },
      {
        'Livello': 'Livello',
        'Tipo': 'Tipo',
        'Codice': 'Codice',
        'Descrizione': 'Descrizione',
        'Quantità': 'Quantità',
        'UM': 'UM',
        'Costo Unitario (€)': 'Costo Unitario (€)',
        'C. Fissi (€)': 'C. Fissi (€)',
        'C. Variabile (€)': 'C. Variabile (€)',
        'Tempo Totale (hh:mm:ss)': 'Tempo Totale (hh:mm:ss)',
        'Tempo Setup (hh:mm:ss)': 'Tempo Setup (hh:mm:ss)',
        'CDL': 'CDL'
      }
    ];

    const allData = [...summaryRows, ...flatData];

    // Crea il workbook senza header automatico
    const worksheet = XLSX.utils.json_to_sheet(allData, { skipHeader: true });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Costificazione BOM');

    // Imposta larghezza colonne
    const colWidths = [
      { wch: 10 },  // Livello
      { wch: 15 },  // Tipo
      { wch: 25 },  // Codice
      { wch: 40 },  // Descrizione
      { wch: 10 },  // Quantità
      { wch: 5 },   // UM
      { wch: 18 },  // Costo Unitario
      { wch: 15 },  // Costi Fissi
      { wch: 16 },  // Costo Variabile
      { wch: 18 },  // Tempo Totale
      { wch: 16 },  // Tempo Setup
      { wch: 14 },  // CDL
    ];
    worksheet['!cols'] = colWidths;

    // Formatta le celle numeriche (formato italiano con zero iniziale)
    // Le colonne numeriche sono: E (Quantità - indice 4), G (Costo Unitario - indice 6),
    // H (Costi Fissi - indice 7), I (Costo Variabile - indice 8)
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let row = range.s.r; row <= range.e.r; row++) {
      // Formatta Quantità (colonna E, indice 4) - 3 decimali
      const qtyCell = XLSX.utils.encode_cell({ r: row, c: 4 });
      if (worksheet[qtyCell] && typeof worksheet[qtyCell].v === 'number') {
        worksheet[qtyCell].z = '0.000';
        worksheet[qtyCell].t = 'n';
      }

      // Formatta Costo Unitario (colonna G, indice 6) - fino a 3 decimali
      const unitCostCell = XLSX.utils.encode_cell({ r: row, c: 6 });
      if (worksheet[unitCostCell] && typeof worksheet[unitCostCell].v === 'number') {
        worksheet[unitCostCell].z = '0.000 "€"';
        worksheet[unitCostCell].t = 'n';
      }

      // Formatta Costi Fissi (colonna H, indice 7) - fino a 3 decimali
      const fixedCostCell = XLSX.utils.encode_cell({ r: row, c: 7 });
      if (worksheet[fixedCostCell] && typeof worksheet[fixedCostCell].v === 'number') {
        worksheet[fixedCostCell].z = '0.000 "€"';
        worksheet[fixedCostCell].t = 'n';
      }

      // Formatta Costo Variabile (colonna I, indice 8) - fino a 3 decimali
      const variableCostCell = XLSX.utils.encode_cell({ r: row, c: 8 });
      if (worksheet[variableCostCell] && typeof worksheet[variableCostCell].v === 'number') {
        worksheet[variableCostCell].z = '0.000 "€"';
        worksheet[variableCostCell].t = 'n';
      }
    }

    // Genera e scarica il file
    const fileName = `BOM_Costing_${costingResult.bomCode || 'Export'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName, { bookType: 'xlsx', cellStyles: true });
  }, [costingResult, treeData]);

  if (!costingResult) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Nessun risultato di costificazione disponibile
        </CardContent>
      </Card>
    );
  }

  const costing = costingResult.costing || {};

  return (
    <>
      <Card className={isFullscreen ? 'fixed inset-4 z-50 flex flex-col' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Dettaglio costi
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={expandAll}
          >
            Espandi Tutto
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={collapseAll}
          >
            Comprimi Tutto
          </Button>

          {/* Dropdown per esportazione */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Esporta
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Esporta in Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            className="d-none"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className={cn("p-4", isFullscreen && 'flex-1 overflow-hidden flex flex-col')}>
        {/* Barra ricerca */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cerca componenti o cicli..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Riepilogo costi root */}
        <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-purple-900">
              {costingResult.bomCode || 'Prodotto Finito'}
            </span>
            <span className="text-xl font-bold text-purple-900">
              {formatCurrency(costing.unit_cost_final || 0)}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="text-center p-2 bg-blue-100 rounded">
              <div className="text-gray-600">Materiali</div>
              <div className="font-semibold text-blue-900">
                {formatCurrency(costing.variable_costs_material || 0)}
              </div>
            </div>
            <div className="text-center p-2 bg-green-100 rounded">
              <div className="text-gray-600">Operazioni</div>
              <div className="font-semibold text-green-900">
                {formatCurrency(costing.variable_costs_operations || 0)}
              </div>
            </div>
            <div className="text-center p-2 bg-gray-100 rounded">
              <div className="text-gray-600">Fissi</div>
              <div className="font-semibold text-gray-900">
                {formatCurrency(costing.fixed_costs_per_lot || 0)}
              </div>
            </div>
            <div 
              className="text-center p-2 bg-orange-100 rounded cursor-pointer hover:bg-orange-200 transition-colors"
              onClick={() => setShowMarkupDetail(true)}
              title="Clicca per vedere il dettaglio dei ricarichi"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="text-gray-600">Ricarichi</div>
                <Info className="h-4 w-4 text-orange-600" />
              </div>
              <div className="font-semibold text-orange-900">
                {formatCurrency(
                  (costing.ricarico_mp_amount || 0) +
                  (costing.ricarico_ope_amount || 0) +
                  (costing.ricarico_trasporto_amount || 0) +
                  (costing.ricarico_scarto_amount || 0) +
                  (costing.ricarico_totale_amount || 0) +
                  (costing.ricarico_sconto_amount || 0)
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Header colonne */}
        <div className="flex items-center text-xs font-semibold text-gray-600 pb-2 border-b sticky top-0 bg-white z-10">
          <div className="w-8"></div> {/* Spazio per toggle */}
          <div className="w-6"></div> {/* Spazio per icona */}
          <div className="flex-1 flex items-center ml-2">
            <div style={{ width: COLUMN_WIDTHS.name }}>Componente / Operazione</div>
            <div style={{ width: COLUMN_WIDTHS.quantity }} className="text-right">Q.tà</div>
            <div style={{ width: COLUMN_WIDTHS.uom }} className="text-center">UM</div>
            <div style={{ width: COLUMN_WIDTHS.lot }} className="text-right">Lotto</div>
            <div style={{ width: COLUMN_WIDTHS.unitCost }} className="text-right">Costo Unit.</div>
            <div style={{ width: COLUMN_WIDTHS.fixedCost }} className="text-right">C. Fissi</div>
            <div style={{ width: COLUMN_WIDTHS.variableCost }} className="text-right">C. Variabile</div>
            <div style={{ width: COLUMN_WIDTHS.totalTime }} className="text-right">Tempo Totale</div>
            <div style={{ width: COLUMN_WIDTHS.setupTime }} className="text-right">Setup</div>
            <div style={{ width: COLUMN_WIDTHS.workCenter }} className="text-left">CDL</div>
          </div>
        </div>

        {/* Albero componenti */}
        <div className={cn("space-y-1 mt-2", isFullscreen && 'flex-1 overflow-y-auto')}>
          {(searchQuery.trim() ? filteredTreeData : treeData).length > 0 ? (
            (searchQuery.trim() ? filteredTreeData : treeData).map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                level={0}
                expandedNodes={expandedNodes}
                onToggle={toggleNode}
                searchQuery={searchQuery}
              />
            ))
          ) : (
            <div className="py-10 text-center text-gray-500">
              {searchQuery.trim() ?
                'Nessun componente corrisponde alla ricerca' :
                'Nessun componente disponibile'
              }
            </div>
          )}
        </div>
      </CardContent>
    </Card>

      {/* Modal Dettaglio Ricarichi */}
      <MarkupDetailModal
        isOpen={showMarkupDetail}
        costingData={costingResult}
        parameters={costingResult?.parameters || []}
        customMarkups={costingResult?.bomInfo?.customMarkups || {}}
        onClose={() => setShowMarkupDetail(false)}
      />
    </>
  );
};

export default CostTreeView;
