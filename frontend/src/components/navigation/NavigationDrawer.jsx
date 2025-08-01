import React, { useEffect, useRef } from 'react';
import { X, Menu, Layers, ShipWheel } from 'lucide-react';
import MenuTreeView from './MenuTreeView';
import { createPortal } from 'react-dom';
import '../../styles/navigation-drawer.css';

const NavigationDrawer = ({ 
  isOpen, 
  onClose, 
  menuItems, 
  currentPath, 
  onNavigate,
  triggerRef 
}) => {
  const drawerRef = useRef(null);
  const overlayRef = useRef(null);

  // Gestisce il click fuori dal drawer
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

  // Gestisce la navigazione da tastiera
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
        aria-label="Menu di navigazione principale"
      >
        {/* Header con gradiente */}
        <div className="nav-drawer-header">
          <div className="nav-drawer-title">
           
            <span>Pagine</span>
          </div>
          <button
            onClick={onClose}
            className="nav-drawer-close"
            aria-label="Chiudi menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-73px)] flex flex-col">
          <MenuTreeView
            menuItems={menuItems}
            currentPath={currentPath}
            onNavigate={onNavigate}
            onClose={onClose}
            searchEnabled={true}
          />
        </div>

        {/* Footer */}
        <div className="nav-drawer-footer">
          <p className="nav-footer-text">
            Usa <kbd className="nav-footer-kbd">ESC</kbd> per chiudere
          </p>
        </div>
      </nav>
    </>
  );

  // Usa un portal per renderizzare il drawer fuori dal DOM tree principale
  return createPortal(content, document.body);
};

export default NavigationDrawer;