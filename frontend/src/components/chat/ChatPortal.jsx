import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

const ChatPortal = ({ children, isOpen = true }) => {
  const [portalElement, setPortalElement] = useState(null);

  useEffect(() => {
    // Crea o trova il container del portal
    let element = document.getElementById('chat-portal-root');
    
    if (!element) {
      element = document.createElement('div');
      element.id = 'chat-portal-root';
      element.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10000;
        isolation: isolate;
      `;
      document.body.appendChild(element);
    }

    setPortalElement(element);

    // Cleanup
    return () => {
      // Non rimuoviamo l'elemento perché potrebbe essere usato da altre istanze
      // Solo se non ci sono più figli, rimuoviamo l'elemento
      if (element && element.children.length === 0) {
        const timer = setTimeout(() => {
          if (element.children.length === 0 && element.parentNode) {
            element.parentNode.removeChild(element);
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    };
  }, []);

  // Gestione eventi globali per non bloccare l'interazione
  useEffect(() => {
    if (!portalElement) return;

    const handlePortalInteraction = (e) => {
      // Se l'evento proviene dal portal, non fare nulla di speciale
      // Lascia che l'evento si propaghi normalmente
      if (portalElement.contains(e.target)) {
        // Marca l'evento come proveniente dal portal
        if (e.nativeEvent) {
          e.nativeEvent.fromChatPortal = true;
        }
      }
    };

    // Aggiungi listener solo per marcare gli eventi, non per bloccarli
    document.addEventListener('mousedown', handlePortalInteraction);
    document.addEventListener('click', handlePortalInteraction);
    document.addEventListener('focusin', handlePortalInteraction);

    return () => {
      document.removeEventListener('mousedown', handlePortalInteraction);
      document.removeEventListener('click', handlePortalInteraction);
      document.removeEventListener('focusin', handlePortalInteraction);
    };
  }, [portalElement]);

  if (!portalElement || !isOpen) return null;

  return ReactDOM.createPortal(
    <div 
      style={{ 
        pointerEvents: 'auto', 
        width: '100%', 
        height: '100%',
        position: 'relative',
      }}
    >
      {children}
    </div>,
    portalElement
  );
};

export default ChatPortal;