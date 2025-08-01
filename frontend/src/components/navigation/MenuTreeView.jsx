import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, Search, X, Home, Folder, FileText, Hash, FolderOpen } from 'lucide-react';

const MenuTreeView = ({ 
  menuItems, 
  currentPath, 
  onNavigate, 
  onClose,
  searchEnabled = true 
}) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredItem, setHoveredItem] = useState(null);

  // Costruisce la struttura ad albero dal flat array
  const buildTree = (items) => {
    const tree = [];
    const itemMap = {};

    // Prima passa: crea una mappa di tutti gli elementi
    items.forEach(item => {
      itemMap[item.pageId] = { ...item, children: [] };
    });

    // Seconda passa: costruisce l'albero
    items.forEach(item => {
      if (item.pageParent === null) {
        tree.push(itemMap[item.pageId]);
      } else if (itemMap[item.pageParent]) {
        itemMap[item.pageParent].children.push(itemMap[item.pageId]);
      }
    });

    return tree;
  };

  // Filtra l'albero basandosi sulla ricerca
  const filterTree = (nodes, query) => {
    if (!query) return nodes;

    const lowerQuery = query.toLowerCase();
    
    const filterNode = (node) => {
      const matchesSearch = node.pageName.toLowerCase().includes(lowerQuery) ||
                          (node.pageDescription && node.pageDescription.toLowerCase().includes(lowerQuery));
      
      const filteredChildren = node.children ? node.children.map(filterNode).filter(Boolean) : [];
      
      if (matchesSearch || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      
      return null;
    };

    return nodes.map(filterNode).filter(Boolean);
  };

  const treeData = useMemo(() => {
    const tree = buildTree(menuItems);
    return searchQuery ? filterTree(tree, searchQuery) : tree;
  }, [menuItems, searchQuery]);

  // Espande automaticamente i nodi per mostrare il percorso corrente
  useEffect(() => {
    if (currentPath) {
      const pathIds = new Set();
      
      const findPath = (nodes, targetId, currentPathIds = []) => {
        for (const node of nodes) {
          if (node.pageRoute === currentPath || node.pageId === targetId) {
            pathIds.add(...currentPathIds);
            return true;
          }
          if (node.children && node.children.length > 0) {
            if (findPath(node.children, targetId, [...currentPathIds, node.pageId])) {
              return true;
            }
          }
        }
        return false;
      };

      findPath(treeData);
      setExpandedNodes(prev => new Set([...prev, ...pathIds]));
    }
  }, [currentPath, treeData]);

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleItemClick = (item, event) => {
    // Aggiungi effetto ripple
    const ripple = event.currentTarget;
    const rect = ripple.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    ripple.style.setProperty('--ripple-x', `${x}px`);
    ripple.style.setProperty('--ripple-y', `${y}px`);
    ripple.classList.add('ripple');
    
    setTimeout(() => {
      ripple.classList.remove('ripple');
    }, 600);

    if (item.children && item.children.length > 0 && !item.pageComponent) {
      toggleNode(item.pageId);
    } else if (item.pageComponent) {
      onNavigate(item);
      onClose();
    }
  };

  const getItemIcon = (item) => {
    if (!item.children || item.children.length === 0) {
      return <FileText className="nav-tree-icon" />;
    }
    const isExpanded = expandedNodes.has(item.pageId);
    return isExpanded ? 
      <FolderOpen className="nav-tree-icon" /> : 
      <Folder className="nav-tree-icon" />;
  };

  const renderTreeNode = (node, level = 0) => {
    const isExpanded = expandedNodes.has(node.pageId);
    const hasChildren = node.children && node.children.length > 0;
    const isActive = node.pageRoute === currentPath;
    const isHovered = hoveredItem === node.pageId;

    return (
      <div key={node.pageId} className="nav-tree-node">
        <div
          className={`nav-tree-item ${isActive ? 'active' : ''}`}
          style={{ 
            paddingLeft: `${level * 24 + 16}px`,
            '--ripple-x': 0,
            '--ripple-y': 0
          }}
          onClick={(e) => handleItemClick(node, e)}
          onMouseEnter={() => setHoveredItem(node.pageId)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          {hasChildren && (
            <ChevronRight 
              className={`nav-tree-chevron ${isExpanded ? 'expanded' : ''}`}
            />
          )}
          
          {!hasChildren && <span style={{ width: '24px' }} />}
          
          {getItemIcon(node)}
          
          <span className="nav-tree-label">
            {node.pageName}
          </span>
          
          {node.pageComponent && (
            <ChevronRight className="nav-tree-arrow" />
          )}
        </div>
        
        {isExpanded && hasChildren && (
          <div className="nav-tree-children">
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const expandAll = () => {
    const allNodeIds = menuItems.map(item => item.pageId);
    setExpandedNodes(new Set(allNodeIds));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  return (
    <>
      {searchEnabled && (
        <div className="nav-search-container">
          <div className="nav-search-wrapper">
            <Search className="nav-search-icon" />
            <input
              type="text"
              className="nav-search-input"
              placeholder="Cerca nel menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="nav-search-clear"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          
          <div className="nav-quick-actions">
            <button
              onClick={expandAll}
              className="nav-quick-action"
            >
              Espandi tutto
            </button>
            <button
              onClick={collapseAll}
              className="nav-quick-action"
            >
              Chiudi tutto
            </button>
          </div>
        </div>
      )}
      
      <div className="nav-tree-container">
        {/* Home item sempre visibile */}
        <div
          className={`nav-tree-item home ${currentPath === '/' ? 'active' : ''}`}
          style={{ '--ripple-x': 0, '--ripple-y': 0 }}
          onClick={(e) => {
            const item = { pageId: null, pageName: 'Home', pageRoute: '/' };
            handleItemClick(item, e);
            onNavigate(item);
            onClose();
          }}
          onMouseEnter={() => setHoveredItem('home')}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <span style={{ width: '24px' }} />
          <Home className="nav-tree-icon" />
          <span className="nav-tree-label">Home</span>
          <ChevronRight className="nav-tree-arrow" />
        </div>
        
        {/* Albero del menu */}
        {treeData.length > 0 ? (
          treeData.map(node => renderTreeNode(node))
        ) : searchQuery ? (
          <div className="nav-tree-empty">
            <Hash className="nav-tree-empty-icon" />
            <p className="nav-tree-empty-text">
              Nessun risultato trovato per<br />
              <strong>"{searchQuery}"</strong>
            </p>
          </div>
        ) : (
          <div className="nav-tree-loading">
            <span>Caricamento...</span>
          </div>
        )}
      </div>
    </>
  );
};

export default MenuTreeView;