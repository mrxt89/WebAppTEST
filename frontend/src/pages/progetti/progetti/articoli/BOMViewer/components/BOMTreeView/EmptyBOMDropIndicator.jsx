// BOMViewer/components/BOMTreeView/EmptyBOMDropIndicator.jsx
import React from 'react';
import { createPortal } from 'react-dom';
import { Plus, Package } from 'lucide-react';

/**
 * Component that renders a drop indicator for empty BOM
 * The indicator shows a highlighted area with a message indicating 
 * that a component will be added as the root of the BOM
 */
const EmptyBOMDropIndicator = ({ active = false }) => {
  if (!active) return null;
  
  // Find the empty BOM drop area in the DOM
  const emptyBOMArea = document.querySelector('[data-empty-bom="true"]');
  if (!emptyBOMArea) return null;
  
  // Get position and dimensions of the empty BOM area
  const rect = emptyBOMArea.getBoundingClientRect();
  
  // Create a portal for the drop indicator
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        backgroundColor: 'rgba(219, 234, 254, 0.7)',
        border: '2px dashed #3b82f6',
        borderRadius: '8px',
        zIndex: 1000,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'all 0.15s ease'
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '50%',
          padding: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '16px'
        }}
      >
        <Package style={{ width: '32px', height: '32px', color: '#3b82f6' }} />
      </div>
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '8px 16px',
          borderRadius: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontWeight: 'bold',
          color: '#1e40af',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <Plus size={16} />
        <span>Aggiungi come radice della distinta</span>
      </div>
    </div>,
    document.body
  );
};

export default EmptyBOMDropIndicator;