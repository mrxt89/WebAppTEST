// BOMViewer/hooks/useBOMTreeView.js - Fixed version
import { useState, useCallback, useEffect } from 'react';
import { useBOMViewer } from '../context/BOMViewerContext';
import { buildBOMTree } from '../helpers/bomHelpers';

// This is a standard hook, not a factory function, as it directly imports and uses the context
export const useBOMTreeView = () => {
  // Use the context directly
  const {
    bomComponents,
    bomRouting,
    expandedNodes,
    setExpandedNodes,
    selectedNode,
    setSelectedNode,
    loadBOMData,
    selectedBomId
  } = useBOMViewer();
  
  const [treeData, setTreeData] = useState([]);
  const [routingMap, setRoutingMap] = useState({});
  
  // Build the routing map for easy lookup
  useEffect(() => {
    if (Array.isArray(bomRouting) && bomRouting.length > 0) {
      // Create a map of BOMId -> array of cycles to help with component-cycle association
      const newRoutingMap = {};
      
      bomRouting.forEach(cycle => {
        // Use BOMId as the primary key for mapping
        const bomId = cycle.BOMId;
        if (bomId) {
          if (!newRoutingMap[bomId]) {
            newRoutingMap[bomId] = [];
          }
          newRoutingMap[bomId].push(cycle);
        }
        
        // Also map by Level 0 for root-level cycles
        if (cycle.Level === 0) {
          const rootKey = 'level-0';
          if (!newRoutingMap[rootKey]) {
            newRoutingMap[rootKey] = [];
          }
          newRoutingMap[rootKey].push(cycle);
        }
      });
      
      console.log('Routing map created:', newRoutingMap);
      setRoutingMap(newRoutingMap);
    } else {
      setRoutingMap({});
    }
  }, [bomRouting]);
  
  // Build tree when data changes
  useEffect(() => {
    const tree = buildBOMTree(bomComponents, bomRouting);
    setTreeData(tree);
    
    // Automatically expand first level
    if (tree.length > 0) {
      const firstLevelNodes = {};
      tree.forEach(node => {
        firstLevelNodes[node.id] = true;
      });
      
      setExpandedNodes(prev => ({
        ...prev,
        ...firstLevelNodes
      }));
    }
  }, [bomComponents, bomRouting, setExpandedNodes]);
  
  // Load multilevel BOM data
  const loadBOMTree = useCallback(async () => {
    if (!selectedBomId) return;
    
    await loadBOMData('GET_BOM_MULTILEVEL', {
      maxLevel: 10,
      includeRouting: true,
      expandPhantoms: true
    });
  }, [selectedBomId, loadBOMData]);
  
  // Handle node expansion/collapse
  const handleNodeToggle = useCallback((nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  }, [setExpandedNodes]);
  
  // Handle node selection
  const handleNodeSelect = useCallback((node) => {
    setSelectedNode(node);
  }, [setSelectedNode]);
  
  // Expand all nodes
  const expandAll = useCallback(() => {
    const allNodes = {};
    
    // Recursive function to collect all node IDs
    const collectNodeIds = (nodes) => {
      nodes.forEach(node => {
        allNodes[node.id] = true;
        if (node.children && node.children.length > 0) {
          collectNodeIds(node.children);
        }
      });
    };
    
    collectNodeIds(treeData);
    setExpandedNodes(allNodes);
  }, [treeData, setExpandedNodes]);
  
  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedNodes({});
  }, [setExpandedNodes]);
  
  // Find node by ID
  const findNodeById = useCallback((nodeId, nodes = treeData) => {
    for (const node of nodes) {
      if (node.id === nodeId) {
        return node;
      }
      
      if (node.children && node.children.length > 0) {
        const foundNode = findNodeById(nodeId, node.children);
        if (foundNode) {
          return foundNode;
        }
      }
    }
    
    return null;
  }, [treeData]);
  
  // Find node by ComponentId
  const findNodeByComponentId = useCallback((componentId, nodes = treeData) => {
    for (const node of nodes) {
      if (node.type === 'component' && 
          node.data.ComponentId === componentId) {
        return node;
      }
      
      if (node.children && node.children.length > 0) {
        const foundNode = findNodeByComponentId(componentId, node.children);
        if (foundNode) {
          return foundNode;
        }
      }
    }
    
    return null;
  }, [treeData]);
  
  // Find routing cycles for a component
  const findCyclesForComponent = useCallback((node) => {
    if (node.type !== 'component') return [];
    
    // Get BOMId from the component
    const bomId = node.data.BOMId;
    
    // Return cycles from the routing map
    return bomId && routingMap[bomId] ? routingMap[bomId] : [];
  }, [routingMap]);
  
  // Expand path to specific node
  const expandPathToNode = useCallback((nodeId) => {
    // First find the node
    const node = findNodeById(nodeId);
    if (!node) return;
    
    // Then build the path from the node's Path data
    const pathParts = node.data.Path ? node.data.Path.split('.') : [];
    const nodesToExpand = {};
    
    // Add each path node to expanded
    const currentPath = [];
    for (const part of pathParts) {
      currentPath.push(part);
      
      // Find the node with this path
      const currentPathStr = currentPath.join('.');
      const nodes = treeData.flatMap(n => [n, ...(n.children || [])]);
      
      for (const n of nodes) {
        if (n.data.Path === currentPathStr) {
          nodesToExpand[n.id] = true;
          break;
        }
      }
    }
    
    // Expand all nodes along the path
    setExpandedNodes(prev => ({
      ...prev,
      ...nodesToExpand
    }));
  }, [treeData, findNodeById, setExpandedNodes]);
  
  return {
    treeData,
    expandedNodes,
    selectedNode,
    routingMap,
    handleNodeToggle,
    handleNodeSelect,
    loadBOMTree,
    expandAll,
    collapseAll,
    findNodeById,
    findNodeByComponentId,
    findCyclesForComponent,
    expandPathToNode
  };
};

export default useBOMTreeView;