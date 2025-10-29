import React, { useEffect, useRef } from 'react';
import { X, BookOpen } from 'lucide-react';
import WikiDocsTreeView from './WikiDocsTreeView';
import { createPortal } from 'react-dom';
import useWikiManagement from '@/hooks/useWikiManagement';
import '../../styles/navigation-drawer.css';

const WikiDocsPanel = ({
  isOpen,
  onClose,
  pageId,
  currentComponentKey,
  triggerRef
}) => {
  const drawerRef = useRef(null);
  const overlayRef = useRef(null);

  // Use custom hook to fetch components and wiki pages
  const { components, loading, fetchComponentsByPage, fetchWikiPages, getWikiPagePath } = useWikiManagement();
  const [wikiPages, setWikiPages] = React.useState([]);
  const [loadingWikiPages, setLoadingWikiPages] = React.useState(false);

  // Load wiki pages on mount
  useEffect(() => {
    const loadWikiPages = async () => {
      setLoadingWikiPages(true);
      const pages = await fetchWikiPages();
      setWikiPages(pages);
      setLoadingWikiPages(false);
    };
    loadWikiPages();
  }, [fetchWikiPages]);

  // Load components when panel opens
  useEffect(() => {
    if (isOpen && pageId) {
      fetchComponentsByPage(pageId);
    }
  }, [isOpen, pageId, fetchComponentsByPage]);

  // Handle click outside drawer
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Non chiudere se il click è sul trigger button
      if (triggerRef?.current?.contains(event.target)) {
        return;
      }

      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Previene lo scroll del body quando il drawer è aperto
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, triggerRef]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      const focusableElements = drawerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }
  }, [isOpen]);

  const content = (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className={`nav-drawer-overlay ${isOpen ? 'open' : ''}`}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer */}
      <nav
        ref={drawerRef}
        className={`nav-drawer ${isOpen ? 'open' : ''}`}
        role="navigation"
        aria-modal="true"
        aria-label="Menu documentazione wiki"
      >
        {/* Header con gradiente */}
        <div className="nav-drawer-header">
          <div className="nav-drawer-title">
            <BookOpen style={{ width: '24px', height: '24px' }} />
            <span>Documentazione</span>
          </div>
          <button
            onClick={onClose}
            className="nav-drawer-close"
            aria-label="Chiudi documentazione"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-73px)] flex flex-col">
          {(loading || loadingWikiPages) ? (
            <div className="nav-tree-loading">
              Caricamento...
            </div>
          ) : (
            <WikiDocsTreeView
              components={components}
              wikiPages={wikiPages}
              currentComponentKey={currentComponentKey}
              onClose={onClose}
              getWikiPagePath={getWikiPagePath}
            />
          )}
        </div>

        {/* Footer */}
        <div className="nav-drawer-footer">
          <p className="nav-footer-text">
            Usa <kbd className="nav-footer-kbd bg-dark">ESC</kbd> per chiudere
          </p>
        </div>
      </nav>
    </>
  );

  // Usa un portal per renderizzare il drawer fuori dal DOM tree principale
  return createPortal(content, document.body);
};

export default WikiDocsPanel;
