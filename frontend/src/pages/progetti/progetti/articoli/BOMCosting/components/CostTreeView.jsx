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
  Search
} from 'lucide-react';
import { formatCurrency } from '@/lib/bomCostingUtils';
import { cn } from '@/lib/utils';

// Helper per ottenere un colore in base al livello
const getLevelColor = (level) => {
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

  const colorIndex = level < LEVEL_COLORS.length ? level : level % LEVEL_COLORS.length;
  return LEVEL_COLORS[colorIndex];
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
const CycleNode = ({ cycle, level, expanded, onToggle }) => {
  const baseIndent = 8;
  const indentPerLevel = 32; // Aumentato da 24 a 32
  const indent = level * indentPerLevel + baseIndent;

  // Estrai i dati del ciclo
  const operationName = cycle.Operation || cycle.OperationDescription || `Fase ${cycle.RtgStep || ''}`;
  const workCenter = cycle.WorkCenter || cycle.WC || '';
  const quantity = cycle.Qty || 1;
  const unitCost = cycle.UnitCost || 0;
  const fixedCost = cycle.FixedCost || 0;
  
  // Calcola il costo totale: (Costo Unitario × Quantità) + Costi Fissi
  const totalCost = cycle.TotalCost || cycle.CycleCost || 
    ((unitCost * quantity) + fixedCost);

  return (
    <div>
      <div
        className={cn(
          "flex items-center py-1 px-2 rounded cursor-pointer hover:bg-green-50 transition-colors",
          "border-l-2",
          expanded && "bg-green-50"
        )}
        style={{
          paddingLeft: `${indent}px`,
          borderLeftColor: getLevelColor(level)
        }}
        onClick={onToggle}
      >
        {/* Toggle icon */}
        <div className="mr-1">
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-gray-500" />
          ) : (
            <ChevronRight className="h-3 w-3 text-gray-500" />
          )}
        </div>

        {/* Cycle icon */}
        <Factory className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />

        {/* Cycle info - Layout tabellare */}
        <div className="flex-1 flex items-center ml-2 min-w-0">
          {/* Colonna 1: Operazione e Centro di Lavoro (60%) */}
          <div className="flex items-center gap-2 min-w-0" style={{ width: '60%' }}>
            <span className="font-medium text-green-800 truncate">
              {operationName}
            </span>
            {workCenter && (
              <span className="text-xs text-green-600">({workCenter})</span>
            )}
          </div>

          {/* Colonna 2: Quantità (8%) */}
          <div className="text-xs text-gray-700 text-right flex-shrink-0" style={{ width: '8%' }}>
            {quantity}
          </div>

          {/* Colonna 3: UM (5%) */}
          <div className="text-xs text-gray-600 text-center flex-shrink-0" style={{ width: '5%' }}>
            -
          </div>

          {/* Colonna 4: Costo Unitario (9%) */}
          <div className="text-xs font-medium text-gray-900 text-right flex-shrink-0" style={{ width: '9%' }}>
            {formatCurrency(unitCost)}
          </div>

          {/* Colonna 5: Costo Fisso (9%) */}
          <div className="text-xs font-medium text-orange-700 text-right flex-shrink-0" style={{ width: '9%' }}>
            -
          </div>

          {/* Colonna 6: Costo Totale (9%) */}
          <div className="text-xs font-semibold text-green-900 text-right flex-shrink-0" style={{ width: '9%' }}>
            {formatCurrency(totalCost)}
          </div>
        </div>
      </div>

      {/* Dettagli ciclo espansi */}
      {expanded && (
        <div
          className="py-1 px-2 bg-green-50/50 border-l-2 text-xs space-y-1"
          style={{
            paddingLeft: `${indent + 32}px`,
            borderLeftColor: getLevelColor(level)
          }}
        >
          {cycle.CycleTime !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600">Tempo Ciclo:</span>
              <span className="font-medium">{cycle.CycleTime} min</span>
            </div>
          )}
          {cycle.HourlyCost !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600">Costo Orario:</span>
              <span className="font-medium">{formatCurrency(cycle.HourlyCost)}/h</span>
            </div>
          )}
          {cycle.UnitCost !== undefined && (
            <div className="flex justify-between font-medium">
              <span className="text-green-700">Costo Unitario:</span>
              <span className="text-green-900">{formatCurrency(cycle.UnitCost)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Componente per un nodo componente
const ComponentNode = ({ node, level, expanded, onToggle, children, searchQuery }) => {
  const baseIndent = 8;
  const indentPerLevel = 32; // Aumentato da 24 a 32 per migliore leggibilità
  const indent = level * indentPerLevel + baseIndent;

  const isRootNode = node.data.Level === 0;
  const hasChildren = node.children && node.children.length > 0;

  // Calcola i costi del componente
  const unitCost = node.data.UnitCost || 0;
  const fixedCost = node.data.FixedCost || 0;
  const quantity = node.data.Quantity || (isRootNode ? 1 : 0);
  
  // Calcola il costo totale: (Costo Unitario × Quantità) + Costi Fissi
  const totalCost = node.data.TotalCost || node.data.CalculatedTotalCost || 
    ((unitCost * quantity) + fixedCost);
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
          paddingLeft: `${indent}px`,
          borderLeftColor: getLevelColor(level)
        }}
        onClick={onToggle}
      >
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
          {/* Colonna 1: Codice e Descrizione (60%) */}
          <div className="flex items-center gap-2 min-w-0" style={{ width: '60%' }}>
            <span className={cn(
              "truncate",
              isRootNode ? "text-purple-900 font-semibold" : "text-blue-900"
            )}>
              {highlightText(nodeText)}
            </span>

            {/* Badge livello */}
            {!isRootNode && (
              <Badge variant="outline" className="flex-shrink-0 h-4 text-xs">
                Liv. {node.data.Level}
              </Badge>
            )}
            {isRootNode && (
              <Badge variant="outline" className="flex-shrink-0 h-4 text-xs bg-purple-100">
                PF
              </Badge>
            )}

          </div>

          {/* Colonna 2: Quantità e UM (8%) */}
          <div className="text-xs text-gray-700 text-right flex-shrink-0" style={{ width: '8%' }}>
            {!isRootNode && quantity > 0 ? (
              <>{quantity.toFixed(3)}</>
            ) : (
              <>1</>
            )}
          </div>

          {/* Colonna 3: UM (5%) */}
          <div className="text-xs text-gray-600 text-center flex-shrink-0" style={{ width: '5%' }}>
            {uom}
          </div>

          {/* Colonna 4: Costo Unitario (9%) */}
          <div className="text-xs font-medium text-gray-900 text-right flex-shrink-0" style={{ width: '9%' }}>
            {formatCurrency(unitCost)}
          </div>

          {/* Colonna 5: Costo Fisso (9%) */}
          <div className="text-xs font-medium text-orange-700 text-right flex-shrink-0" style={{ width: '9%' }}>
            {fixedCost > 0 ? formatCurrency(fixedCost) : '-'}
          </div>

          {/* Colonna 6: Costo Totale (9%) */}
          <div className={cn(
            "text-xs font-semibold text-right flex-shrink-0",
            isRootNode ? "text-purple-900 text-sm" : "text-blue-900"
          )} style={{ width: '9%' }}>
            {formatCurrency(totalCost)}
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
    return (
      <CycleNode
        cycle={node.data}
        level={level}
        expanded={isExpanded}
        onToggle={() => onToggle(node.id)}
      />
    );
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

  // Costruisci l'albero dai dati di costificazione
  const treeData = useMemo(() => {
    console.log('CostTreeView - costingResult:', costingResult);

    if (!costingResult || !costingResult.components) {
      console.log('CostTreeView - No costingResult or components');
      return [];
    }

    const components = costingResult.components;
    const costing = costingResult.costing || {};

    // Mappa per tenere traccia dei nodi
    const nodeMap = {};
    const rootNodes = [];

    // Primo passaggio: crea tutti i nodi componente
    components.forEach((comp, index) => {
      const nodeId = `component-${comp.ComponentId || index}-${comp.Level}-${index}`;

      const node = {
        id: nodeId,
        type: "component",
        level: comp.Level || 0,
        data: {
          ...comp,
          // Assicurati che i campi importanti siano presenti
          ComponentId: comp.ComponentId || index,
          Level: comp.Level || 0,
          Path: comp.Path || String(comp.ComponentId || index)
        },
        children: []
      };

      nodeMap[nodeId] = node;

      // I nodi di livello 0 o 1 sono root
      if (comp.Level === 0 || comp.Level === 1) {
        rootNodes.push(node);
      }
    });

    // Secondo passaggio: aggiungi i cicli ai componenti
    components.forEach((comp, index) => {
      const nodeId = `component-${comp.ComponentId || index}-${comp.Level}-${index}`;
      const componentNode = nodeMap[nodeId];

      if (comp.operations && Array.isArray(comp.operations)) {
        comp.operations.forEach((op, opIndex) => {
          const cycleNode = {
            id: `cycle-${nodeId}-${opIndex}`,
            type: "cycle",
            level: comp.Level + 1,
            data: op,
            children: []
          };
          componentNode.children.push(cycleNode);
        });
      }
    });

    // Terzo passaggio: costruisci la gerarchia
    components.forEach((comp, index) => {
      if (comp.Level <= 1) return; // Skip root nodes

      const nodeId = `component-${comp.ComponentId || index}-${comp.Level}-${index}`;
      const currentNode = nodeMap[nodeId];

      if (!currentNode) return;

      // Trova il parent tramite il Path
      if (comp.Path) {
        const pathParts = comp.Path.split(".");
        pathParts.pop(); // Rimuovi l'ultimo elemento (nodo corrente)
        const parentPath = pathParts.join(".");

        // Cerca un nodo con Path uguale al parentPath
        const parentNode = Object.values(nodeMap).find(n => n.data.Path === parentPath);

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

    console.log('CostTreeView - Built tree with', rootNodes.length, 'root nodes');
    console.log('CostTreeView - Tree structure:', rootNodes);

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
            <div className="text-center p-2 bg-orange-100 rounded">
              <div className="text-gray-600">Ricarichi</div>
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
            <div style={{ width: '60%' }}>Componente / Operazione</div>
            <div style={{ width: '8%' }} className="text-right">Q.tà</div>
            <div style={{ width: '5%' }} className="text-center">UM</div>
            <div style={{ width: '9%' }} className="text-right">Costo Unit.</div>
            <div style={{ width: '9%' }} className="text-right">Costi Fissi</div>
            <div style={{ width: '9%' }} className="text-right">Costo Tot.</div>
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
  );
};

export default CostTreeView;
