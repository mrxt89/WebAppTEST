// BOMViewer/components/BOMTreeView/DropIndicator.jsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Replace, ArrowDown, ArrowRight } from 'lucide-react';

/**
 * Componente che mostra un indicatore visivo quando si trascina un elemento sopra un nodo
 * dell'albero, con diversi stili in base al tipo di operazione (replace, addUnder, addSibling)
 */
const DropIndicator = ({ target, mode, debugInfo }) => {
  const [position, setPosition] = useState(null);
  const [element, setElement] = useState(null);
  
  // Quando il target o la modalità cambia, calcola la nuova posizione dell'indicatore
  useEffect(() => {
    if (!target || !target.id) return;
    
    // Cerca l'elemento DOM del nodo target
    const findElement = () => {
      const selector = `[data-node-id="${target.id}"]`;
      return document.querySelector(selector);
    };
    
    const targetElement = findElement();
    
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      
      // Memorizza l'elemento e la posizione
      setElement(targetElement);
      
      // La posizione base è la stessa per le varie modalità
      setPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    }
  }, [target, mode]);
  
  // Se non abbiamo un elemento o una posizione, non mostrare nulla
  if (!element || !position) return null;
  
  // Determina se mostrare le tre modalità o solo due, basandosi sul livello del nodo
  const isRootLevel = 
    (target.level === 0 || target.level === 1) || 
    (target.data && (target.data.Level === 0 || target.data.Level === 1));
  
  const showThreeModes = isRootLevel;
  
  // Stili comuni di base
  const commonStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  };
  
  // Stili specifici per le varie sezioni - REFACTORED to avoid mixing border shorthand and specific properties
  let leftStyles, centerStyles, rightStyles;
  
  if (showThreeModes) {
    // Dividi in tre parti per i nodi di livello radice
    leftStyles = {
      ...commonStyles,
      width: '30%',
      backgroundColor: mode === 'replace' ? 'rgba(219, 234, 254, 0.9)' : 'rgba(219, 234, 254, 0.2)',
      borderTopWidth: '2px',
      borderBottomWidth: '2px',
      borderLeftWidth: '2px',
      borderRightWidth: '0',
      borderStyle: mode === 'replace' ? 'solid' : 'dashed',
      borderColor: mode === 'replace' ? '#3b82f6' : '#3b82f6',
      transition: 'all 0.15s ease',
    };
    
    centerStyles = {
      ...commonStyles,
      width: '40%',
      backgroundColor: mode === 'addUnder' ? 'rgba(220, 252, 231, 0.9)' : 'rgba(220, 252, 231, 0.2)',
      borderTopWidth: '2px',
      borderBottomWidth: '2px',
      borderLeftWidth: '0',
      borderRightWidth: '0',
      borderStyle: mode === 'addUnder' ? 'solid' : 'dashed',
      borderColor: mode === 'addUnder' ? '#22c55e' : '#22c55e',
      transition: 'all 0.15s ease',
    };
    
    rightStyles = {
      ...commonStyles,
      width: '30%',
      backgroundColor: mode === 'addSibling' ? 'rgba(254, 215, 138, 0.95)' : 'rgba(254, 215, 138, 0.3)',
      borderTopWidth: '3px',
      borderBottomWidth: '3px',
      borderLeftWidth: '0',
      borderRightWidth: '3px',
      borderStyle: mode === 'addSibling' ? 'solid' : 'dashed',
      borderColor: mode === 'addSibling' ? '#f59e0b' : '#f59e0b',
      transition: 'all 0.15s ease',
    };
  } else {
    // Dividi in due parti per i nodi non radice (solo replace e addUnder)
    leftStyles = {
      ...commonStyles,
      width: '50%',
      backgroundColor: mode === 'replace' ? 'rgba(219, 234, 254, 0.9)' : 'rgba(219, 234, 254, 0.2)',
      borderTopWidth: '2px',
      borderBottomWidth: '2px',
      borderLeftWidth: '2px',
      borderRightWidth: '0',
      borderStyle: mode === 'replace' ? 'solid' : 'dashed',
      borderColor: mode === 'replace' ? '#3b82f6' : '#3b82f6',
      transition: 'all 0.15s ease',
    };
    
    rightStyles = {
      ...commonStyles,
      width: '50%', 
      backgroundColor: mode === 'addUnder' ? 'rgba(220, 252, 231, 0.9)' : 'rgba(220, 252, 231, 0.2)',
      borderTopWidth: '2px',
      borderBottomWidth: '2px',
      borderLeftWidth: '0',
      borderRightWidth: '2px',
      borderStyle: mode === 'addUnder' ? 'solid' : 'dashed',
      borderColor: mode === 'addUnder' ? '#22c55e' : '#22c55e',
      transition: 'all 0.15s ease',
    };
    
    // Per completezza, definiamo anche centerStyles anche se non sarà visibile per nodi non radice
    centerStyles = { display: 'none' };
  }
  
  // Stili per l'etichetta
  const getLabelStyles = () => {
    let style = {
      position: 'fixed',
      top: `${position.top - 25}px`,
      padding: '3px 10px',
      borderRadius: '4px',
      fontSize: '13px',
      fontWeight: '600',
      pointerEvents: 'none',
      zIndex: 10000,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    };
    
    if (mode === 'replace') {
      return {
        ...style,
        left: `${position.left + 10}px`,
        backgroundColor: '#dbeafe',
        color: '#1d4ed8',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#93c5fd'
      };
    } else if (mode === 'addUnder') {
      return {
        ...style,
        left: `${position.left + (position.width/2) - 50}px`,
        backgroundColor: '#dcfce7',
        color: '#16a34a',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#86efac'
      };
    } else if (mode === 'addSibling') {
      return {
        ...style,
        left: `${position.left + position.width - 120}px`,
        backgroundColor: '#fef08a',
        color: '#ca8a04',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#fde047'
      };
    }
    
    return style;
  };
  
  // Stili per l'icona nell'area attiva
  const getIconStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: '50%',
    padding: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };
  
  // Crea un portale per posizionare l'indicatore sopra il resto dell'interfaccia
  return createPortal(
    <>
      {/* Contenitore principale che copre tutta l'area del nodo */}
      <div
        style={{
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
          height: `${position.height}px`,
          pointerEvents: 'none',
          zIndex: 9999,
          display: 'flex',
          transition: 'all 0.15s ease',
          overflow: 'hidden'
        }}
      >
        {/* Divisione verticale: parte sinistra per sostituire */}
        <div style={leftStyles}>
          {mode === 'replace' && (
            <div style={getIconStyles}>
              <Replace style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
            </div>
          )}
        </div>
        
        {/* Divisione verticale: parte centrale per aggiungere sotto */}
        {showThreeModes && (
          <div style={centerStyles}>
            {mode === 'addUnder' && (
              <div style={getIconStyles}>
                <ArrowDown style={{ width: '20px', height: '20px', color: '#22c55e' }} />
              </div>
            )}
          </div>
        )}
        
        {/* Divisione verticale: parte destra per aggiungere come fratello */}
        <div style={rightStyles}>
          {showThreeModes && mode === 'addSibling' && (
            <div style={getIconStyles}>
              <ArrowRight style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
            </div>
          )}
          {!showThreeModes && mode === 'addUnder' && (
            <div style={getIconStyles}>
              <ArrowDown style={{ width: '20px', height: '20px', color: '#22c55e' }} />
            </div>
          )}
        </div>
      </div>
      
      {/* Etichetta dell'azione corrente */}
      <div style={getLabelStyles()}>
        {mode === 'replace' ? 'SOSTITUISCI' : mode === 'addUnder' ? 'AGGIUNGI SOTTO' : 'AGGIUNGI FRATELLO'}
      </div>


    </>,
    document.body
  );
};

export default DropIndicator;