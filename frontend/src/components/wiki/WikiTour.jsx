import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useWikiContext } from './WikiContext';
import '@/styles/WikiTour.css';  // Importo il nuovo file CSS

/**
 * Componente Tour guidato
 * Mostra i passaggi del tour con puntatori e overlay
 */
const WikiTour = () => {
  // Context e state
  const { 
    isTourActive,
    currentTour, 
    currentStep, 
    nextStep, 
    prevStep, 
    endTour,
    currentWikiContent,
    openedFromNotificationSidebar
  } = useWikiContext();
  
  const [targetElement, setTargetElement] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [currentStepData, setCurrentStepData] = useState(null);
  
  const tooltipRef = useRef(null);
  const overlayRef = useRef(null);
  
  // Z-index elevati per assicurarsi che il tour sia sopra tutto
  const Z_INDEX = {
    overlay: 10000,
    tooltip: 10001,
    highlightedElement: 10002
  };
  
  // Imposta lo step corrente
  useEffect(() => {
    if (isTourActive && currentTour && currentTour.length > 0 && currentStep < currentTour.length) {
      setCurrentStepData(currentTour[currentStep]);
    } else {
      setCurrentStepData(null);
    }
  }, [isTourActive, currentTour, currentStep]);
  
  // Funzione per trovare l'elemento target in base al selettore
  useEffect(() => {
    let timeoutId = null;
    
    if (isTourActive && currentStepData?.selector) {
      // Piccolo timeout per assicurarsi che il DOM sia pronto
      timeoutId = setTimeout(() => {
        try {
          // Controlla il tipo di visualizzazione per selezionare correttamente gli elementi
          const viewType = currentWikiContent?._viewType || '';
        
          
          // Tenta di trovare l'elemento con il selettore specificato
          let element = null;
          
          // Se abbiamo selettori alternativi separati da virgola, proviamo ciascuno
          if (currentStepData.selector.includes(',')) {
            const selectors = currentStepData.selector.split(',').map(s => s.trim());
            for (const selector of selectors) {
              element = document.querySelector(selector);
              if (element) break;
            }
          } else {
            element = document.querySelector(currentStepData.selector);
          }
          
          // Se non abbiamo trovato l'elemento, proviamo selettori più specifici in base alla visualizzazione
          if (!element && viewType) {
            if (viewType === 'notifications') {
              // Per le notifiche, cerchiamo all'interno della sidebar
              const sidebarElement = document.getElementById('notification-sidebar');
              if (sidebarElement) {
                // Estrai la parte di selettore dopo l'ultimo spazio (generalmente l'elemento finale)
                const simpleSelector = currentStepData.selector.split(' ').pop();
                if (simpleSelector) {
                  element = sidebarElement.querySelector(simpleSelector);
                }
              }
            } else if (viewType === 'chatmodal') {
              // Per la chat modale, cerchiamo all'interno del dialog
              const chatElement = document.querySelector('.chat-page, .chat-modal, [id^="chat-"]');
              if (chatElement) {
                const simpleSelector = currentStepData.selector.split(' ').pop();
                if (simpleSelector) {
                  element = chatElement.querySelector(simpleSelector);
                }
              }
            } else {
              // Per altre viste, proviamo nelle schede attive
              const activeTabPanel = document.querySelector(`div[value="${viewType}"], div[data-state="active"][role="tabpanel"]`);
              if (activeTabPanel) {
                // Estrai la parte di selettore dopo l'ultimo spazio (generalmente l'elemento finale)
                const simpleSelector = currentStepData.selector.split(' ').pop();
                if (simpleSelector) {
                  element = activeTabPanel.querySelector(simpleSelector);
                }
              }
            }
          }
          
          if (element) {
            setTargetElement(element);
            
            // Posiziona il tooltip vicino all'elemento target
            positionTooltip(element, currentStepData);
            
            // Scorri fino all'elemento se necessario
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Aggiungi una classe per evidenziare l'elemento
            element.classList.add('wiki-tour-highlight');
            
            // Salva lo z-index originale
            const originalZIndex = element.style.zIndex;
            element.dataset.originalZIndex = originalZIndex;
            
            // Imposta uno z-index molto alto per essere sicuri che sia sopra tutto
            element.style.zIndex = Z_INDEX.highlightedElement;
            
            // Quando il tour finisce, ripristina il z-index originale
            return () => {
              if (element) {
                const origZIndex = element.dataset.originalZIndex;
                if (origZIndex) {
                  element.style.zIndex = origZIndex;
                } else {
                  element.style.zIndex = '';
                }
                delete element.dataset.originalZIndex;
              }
            };
          } else {
            console.warn(`Elemento non trovato per il selettore: ${currentStepData.selector}`);
            setTargetElement(null);
          }
        } catch (error) {
          console.error('Errore nel trovare l\'elemento target:', error);
          setTargetElement(null);
        }
      }, 300); // Aumentato il timeout per dare più tempo al DOM di aggiornarsi
    } else {
      setTargetElement(null);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Rimuovi la classe di evidenziazione da tutti gli elementi
      document.querySelectorAll('.wiki-tour-highlight').forEach(el => {
        el.classList.remove('wiki-tour-highlight');
        const origZIndex = el.dataset.originalZIndex;
        if (origZIndex) {
          el.style.zIndex = origZIndex;
        } else {
          el.style.zIndex = '';
        }
        delete el.dataset.originalZIndex;
      });
    };
  }, [isTourActive, currentStepData, currentWikiContent]);
  
  // Ridimensiona il tooltip quando cambia la finestra
  useEffect(() => {
    const handleResize = () => {
      if (targetElement && currentStepData) {
        positionTooltip(targetElement, currentStepData);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [targetElement, currentStepData]);
  
  // Funzione per posizionare il tooltip vicino all'elemento target
  const positionTooltip = (element, stepData) => {
    if (!element || !tooltipRef.current) return;
    
    const rect = element.getBoundingClientRect();
    const tooltipHeight = tooltipRef.current.offsetHeight || 200;
    const tooltipWidth = tooltipRef.current.offsetWidth || 300;
    
    // Decide dove posizionare il tooltip (sopra, sotto, a destra, a sinistra)
    let top, left;
    const position = stepData?.position || 'bottom';
    
    // Verifichiamo se siamo in un contesto di sidebar delle notifiche
    const sidebarOffset = document.getElementById('notification-sidebar')?.getBoundingClientRect().left || 0;
    const isInNotificationSidebar = openedFromNotificationSidebar || 
      (currentWikiContent?._viewType === 'notifications') || 
      (element.closest('#notification-sidebar') !== null);
    
    // Adattiamo il posizionamento se siamo nella sidebar notifiche
    switch (position) {
      case 'top':
        top = rect.top - tooltipHeight - 10;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        if (isInNotificationSidebar && left < sidebarOffset) {
          left = sidebarOffset + 20;
        }
        break;
      case 'bottom':
        top = rect.bottom + 10;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        if (isInNotificationSidebar && left < sidebarOffset) {
          left = sidebarOffset + 20;
        }
        break;
      case 'left':
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        left = rect.left - tooltipWidth - 10;
        // Se siamo nella sidebar e non c'è spazio a sinistra, spostiamo a destra
        if (isInNotificationSidebar && left < 20) {
          left = rect.right + 10;
        }
        break;
      case 'right':
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        left = rect.right + 10;
        break;
      case 'center':
        // Per il positioning al centro, mettiamo il tooltip al centro della viewport
        top = (window.innerHeight - tooltipHeight) / 2;
        left = (window.innerWidth - tooltipWidth) / 2;
        break;
      default:
        top = rect.bottom + 10;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        if (isInNotificationSidebar && left < sidebarOffset) {
          left = sidebarOffset + 20;
        }
    }
    
    // Assicuriamoci che il tooltip non esca dalla finestra
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Aggiustamenti orizzontali
    if (left < 20) left = 20;
    if (left + tooltipWidth > windowWidth - 20) left = windowWidth - tooltipWidth - 20;
    
    // Aggiustamenti verticali
    if (top < 20) top = 20;
    if (top + tooltipHeight > windowHeight - 20) top = windowHeight - tooltipHeight - 20;
    
    setTooltipPosition({ top, left });
  };
  
  // Funzione per creare un svg path per la linea che collega al target
  const createConnectorPath = () => {
    if (!targetElement || !tooltipRef.current || !currentStepData) return null;
    
    // Se siamo in posizione center, non mostriamo il connettore
    if (currentStepData.position === 'center') return null;
    
    const targetRect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    // Verifichiamo se siamo in un contesto di sidebar delle notifiche
    const isInNotificationSidebar = openedFromNotificationSidebar || 
      (currentWikiContent?._viewType === 'notifications') || 
      (targetElement.closest('#notification-sidebar') !== null);
    
    // Punto centrale dell'elemento target
    const targetX = targetRect.left + (targetRect.width / 2);
    const targetY = targetRect.top + (targetRect.height / 2);
    
    // Punto più vicino sul tooltip
    let tooltipX, tooltipY;
    
    // Determina il punto sul tooltip da cui parte la linea
    const position = currentStepData.position || 'bottom';
    switch (position) {
      case 'top':
        tooltipX = tooltipRect.left + (tooltipRect.width / 2);
        tooltipY = tooltipRect.bottom;
        break;
      case 'bottom':
        tooltipX = tooltipRect.left + (tooltipRect.width / 2);
        tooltipY = tooltipRect.top;
        break;
      case 'left':
        tooltipX = tooltipRect.right;
        tooltipY = tooltipRect.top + (tooltipRect.height / 2);
        break;
      case 'right':
        tooltipX = tooltipRect.left;
        tooltipY = tooltipRect.top + (tooltipRect.height / 2);
        break;
      default:
        tooltipX = tooltipRect.left + (tooltipRect.width / 2);
        tooltipY = tooltipRect.top;
    }
    
    // Adatta il percorso se siamo nella sidebar notifiche per evitare linee troppo lunghe
    if (isInNotificationSidebar) {
      // Usa una curva più semplice per la sidebar
      return `M${tooltipX},${tooltipY} Q${(tooltipX + targetX) / 2},${(tooltipY + targetY) / 2} ${targetX},${targetY}`;
    } else {
      // Crea una curva di Bezier per la connessione
      return `M${tooltipX},${tooltipY} C${tooltipX},${targetY} ${targetX},${tooltipY} ${targetX},${targetY}`;
    }
  };
  
  // Se non c'è un tour attivo, renderizza un elemento vuoto
  if (!isTourActive || !currentStepData) {
    return null;
  }
  
  const renderOverlay = () => {
    if (!targetElement && currentStepData.position !== 'center') return null;
    
    // Generiamo un ID univoco per questa maschera per evitare conflitti
    const maskId = `mask-${Date.now()}`;
    
    // Verifichiamo se siamo in un contesto di sidebar delle notifiche
    const isInNotificationSidebar = openedFromNotificationSidebar || 
      (currentWikiContent?._viewType === 'notifications') || 
      (targetElement?.closest('#notification-sidebar') !== null);
    
    // Usiamo un'opacità minore per l'overlay in modo da poter vedere l'interfaccia
    const overlayColor = isInNotificationSidebar 
      ? 'rgba(0, 0, 0, 0.2)' // Opacità ridotta per sidebar
      : 'rgba(0, 0, 0, 0.4)'; // Opacità ridotta per il resto dell'interfaccia
    
    if (currentStepData.position === 'center') {
      // Per la posizione center, non mostriamo un buco ma solo un overlay pieno
      return (
        <div 
          ref={overlayRef}
          className="fixed inset-0 pointer-events-none"
          style={{ 
            backgroundColor: overlayColor,
            transition: 'all 0.3s ease-in-out',
            zIndex: Z_INDEX.overlay
          }}
        />
      );
    }
    
    // Ottieni le dimensioni e la posizione dell'elemento target
    const rect = targetElement.getBoundingClientRect();
    
    // Crea un SVG con un "buco" per l'elemento target
    return (
      <div 
        ref={overlayRef}
        className="fixed inset-0 pointer-events-none"
        style={{ 
          backgroundColor: 'transparent', // Sfondo trasparente all'inizio
          transition: 'all 0.3s ease-in-out',
          zIndex: Z_INDEX.overlay
        }}
      >
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <mask id={maskId}>
              <rect width="100%" height="100%" fill="white" />
              <rect 
                x={rect.left - 6} // Un po' più grande per dare più spazio
                y={rect.top - 6}
                width={rect.width + 12}
                height={rect.height + 12}
                fill="black"
                rx="6"
                ry="6"
              />
            </mask>
          </defs>
          <rect 
            width="100%" 
            height="100%" 
            fill={overlayColor}
            mask={`url(#${maskId})`}
          />
          
          {/* Contorno attorno all'elemento target - più spesso e con glow */}
          <rect
            x={rect.left - 4}
            y={rect.top - 4}
            width={rect.width + 8}
            height={rect.height + 8}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
            rx="6"
            ry="6"
            filter="drop-shadow(0 0 3px rgba(59, 130, 246, 0.7))"
          />
          
          {/* Linea che collega l'elemento al tooltip - più visibile */}
          <path
            d={createConnectorPath()}
            stroke="#3b82f6"
            strokeWidth="2"
            fill="none"
            strokeDasharray="4,3" // Dash più corto per maggiore leggibilità
            strokeLinecap="round"
            filter="drop-shadow(0 0 1px rgba(59, 130, 246, 0.5))" // Aggiunta glow alla linea
          />
        </svg>
      </div>
    );
  };
  
  // JSX per il tooltip del tour
  const renderTooltip = () => {
    if (!currentStepData) return null;
    
    // Verifichiamo se siamo in un contesto di sidebar delle notifiche
    const isInNotificationSidebar = openedFromNotificationSidebar || 
      (currentWikiContent?._viewType === 'notifications') || 
      (targetElement?.closest('#notification-sidebar') !== null);
    
    return (
      <div
        ref={tooltipRef}
        className={`fixed bg-white rounded-lg shadow-lg p-4 w-72 md:w-80 transition-all duration-300 tour-tooltip ${isInNotificationSidebar ? 'notification-tooltip' : ''}`}
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          zIndex: Z_INDEX.tooltip,
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
        }}
        onClick={(e) => e.stopPropagation()} // Previene la propagazione del click per mantenere aperta la sidebar
      >
        {/* Header con titolo e pulsante di chiusura */}
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-lg">{currentStepData.title}</h3>
          <button
            onClick={endTour}
            className="text-gray-500 hover:text-gray-700 rounded-full p-1"
            aria-label="Chiudi tour"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Descrizione */}
        <div className="mb-4">
          <p>{currentStepData.description}</p>
          
          {/* Link esterno per ulteriori informazioni */}
          {currentStepData.learnMoreUrl && (
            <a
              href={currentStepData.learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm flex items-center mt-2"
            >
              Scopri di più <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          )}
        </div>
        
        {/* Footer con indicatore di progresso e pulsanti di navigazione */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {currentStep + 1} di {currentTour.length}
          </div>
          <div className="flex space-x-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Indietro
              </Button>
            )}
            {currentStep < currentTour.length - 1 ? (
              <Button size="sm" onClick={nextStep}>
                Avanti <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={endTour}>
                Fine
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Usa createPortal per renderizzare overlay e tooltip direttamente nel body
  return createPortal(
    <>
      {renderOverlay()}
      {renderTooltip()}
    </>,
    document.body
  );
};

export default WikiTour;