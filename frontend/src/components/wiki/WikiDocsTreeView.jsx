import React, { useState, useMemo } from 'react';
import { ChevronRight, FileText, Search, X, ExternalLink } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const WIKI_BASE_URL = import.meta.env.VITE_WIKI_BASE_URL || 'http://192.168.42.122:3003/it/';

const WikiDocsTreeView = ({ components, wikiPages = [], currentComponentKey, onClose, getWikiPagePath }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Create a map of wikiPageId -> path for quick lookup
  const wikiPageMap = useMemo(() => {
    const map = new Map();
    wikiPages.forEach(page => {
      map.set(page.id, page.path);
    });
    return map;
  }, [wikiPages]);

  // Auto-expand all by default
  useMemo(() => {
    if (components.length > 0) {
      const allIds = new Set(components.map(c => c.componentId));
      setExpandedIds(allIds);
    }
  }, [components]);

  // Filter components based on search
  const filteredComponents = useMemo(() => {
    if (!searchQuery) return components;

    const query = searchQuery.toLowerCase();
    return components.filter(c =>
      c.componentName.toLowerCase().includes(query) ||
      c.componentKey.toLowerCase().includes(query) ||
      (c.componentDescription && c.componentDescription.toLowerCase().includes(query))
    );
  }, [components, searchQuery]);

  // Get icon from iconName string
  const getIcon = (iconName) => {
    if (!iconName) return FileText;
    const Icon = LucideIcons[iconName];
    return Icon || FileText;
  };

  // Toggle expand/collapse
  const toggleExpand = (componentId, event) => {
    event.stopPropagation();
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(componentId)) {
      newExpanded.delete(componentId);
    } else {
      newExpanded.add(componentId);
    }
    setExpandedIds(newExpanded);
  };

  // Handle component click
  const handleClick = async (component, event) => {
    // Priorità 1: usa wikiPageId per recuperare il path dal DB WikiJS
    if (component.wikiPageId) {
      const wikiPath = wikiPageMap.get(component.wikiPageId);
      try {
        let resolvedPath = wikiPath;
        // Fallback on-demand: se non presente nella mappa, chiedi il path al backend
        if (!resolvedPath && typeof getWikiPagePath === 'function') {
          resolvedPath = await getWikiPagePath(component.wikiPageId);
          // opzionale: non aggiorniamo la mappa locale per evitare side effects
        }

        if (resolvedPath) {
          const wikiUrl = `${WIKI_BASE_URL}${resolvedPath}`;
          window.open(wikiUrl, '_blank', 'noopener,noreferrer');
          if (!(event.ctrlKey || event.metaKey)) {
            onClose();
          }
          return;
        }
      } catch (err) {
        // Silenzioso: se fallisce, proveremo il fallback slug sotto
      }
    }

    // Fallback: usa wikiSlug (retrocompatibilità)
    if (component.wikiSlug) {
      const wikiUrl = `${WIKI_BASE_URL}${component.wikiSlug}`;
      window.open(wikiUrl, '_blank', 'noopener,noreferrer');
      if (!(event.ctrlKey || event.metaKey)) {
        onClose(); // Chiudi il drawer se non è Ctrl/Cmd+Click
      }
      return;
    }
  };

  // Render tree nodes recursively
  const renderTree = (parentId = null, level = 0) => {
    const children = filteredComponents.filter(c => c.parentComponentId === parentId);

    return children.map(component => {
      const hasChildren = components.some(c => c.parentComponentId === component.componentId);
      const isExpanded = expandedIds.has(component.componentId);
      const isActive = currentComponentKey === component.componentKey;
      const Icon = getIcon(component.iconName);

      const paddingLeft = 16 + (level * 20);

      const hasWikiLink = !!(component.wikiPageId || component.wikiSlug);

      return (
        <div key={component.componentId} className="nav-tree-node">
          <div
            className={`nav-tree-item ${isActive ? 'active' : ''} ${!hasWikiLink ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={(e) => hasWikiLink && handleClick(component, e)}
            style={{ paddingLeft: `${paddingLeft}px` }}
            title={component.componentDescription || ''}
          >
            {/* Chevron for expandable items */}
            {hasChildren ? (
              <ChevronRight
                className={`nav-tree-chevron ${isExpanded ? 'expanded' : ''}`}
                onClick={(e) => toggleExpand(component.componentId, e)}
              />
            ) : (
              <span style={{ width: '20px', marginRight: '4px' }} />
            )}

            {/* Icon */}
            <Icon className="nav-tree-icon" />

            {/* Label */}
            <span className="nav-tree-label">{component.componentName}</span>

            {/* Active indicator or external link icon */}
            {hasWikiLink && (
              <ExternalLink className="nav-tree-arrow" style={{ width: '14px', height: '14px' }} />
            )}
          </div>

          {/* Children (recursive) */}
          {hasChildren && isExpanded && (
            <div className="nav-tree-children">
              {renderTree(component.componentId, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Handle expand all / collapse all
  const handleExpandAll = () => {
    const allIds = new Set(components.map(c => c.componentId));
    setExpandedIds(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  return (
    <>
      {/* Search Section */}
      <div className="nav-search-container">
        <div className="nav-search-wrapper">
          <input
            type="text"
            className="nav-search-input"
            placeholder="Cerca nella documentazione..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="nav-search-icon" style={{ width: '18px', height: '18px' }} />
          {searchQuery && (
            <button className="nav-search-clear" onClick={handleClearSearch}>
              <X style={{ width: '14px', height: '14px' }} />
            </button>
          )}
        </div>

        {/* Quick Actions */}
        <div className="nav-quick-actions">
          <button className="nav-quick-action" onClick={handleExpandAll}>
            Espandi tutto
          </button>
          <button className="nav-quick-action" onClick={handleCollapseAll}>
            Comprimi tutto
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="nav-tree-container">
        {filteredComponents.length === 0 ? (
          <div className="nav-tree-empty">
            <FileText className="nav-tree-empty-icon" />
            <p className="nav-tree-empty-text">
              {searchQuery
                ? 'Nessun risultato trovato'
                : 'Nessuna documentazione disponibile per questa pagina'}
            </p>
          </div>
        ) : (
          renderTree()
        )}
      </div>
    </>
  );
};

export default WikiDocsTreeView;
