// hooks/useWindowManager.js
import { useState, useEffect, useCallback, useRef } from 'react';

export default function useWindowManager(chatPrefix = 'chat-window-') {
  // Window states storage
  const [windowStates, setWindowStates] = useState({});
  const [zIndexOrder, setZIndexOrder] = useState([]);
  const [activeWindowId, setActiveWindowId] = useState(null);
  const snapDistance = 15; // px within which windows will snap
  
  // Ref per tenere traccia del massimo z-index attuale
  const currentMaxZIndexRef = useRef(1000);
  
  // Load saved window states from localStorage
  useEffect(() => {
    try {
      const savedStates = localStorage.getItem('chat-window-states');
      if (savedStates) {
        const parsed = JSON.parse(savedStates);
        setWindowStates(parsed);
        
        // Extract and restore z-index order
        const sortedIds = Object.keys(parsed).sort((a, b) => {
          return parsed[a].zIndex - parsed[b].zIndex;
        });
        
        setZIndexOrder(sortedIds);
        
        // Restore active window if any
        const activeId = localStorage.getItem('chat-active-window');
        if (activeId && parsed[activeId]) {
          setActiveWindowId(activeId);
        }
        
        // Aggiorna il valore massimo di z-index
        const maxZIndex = Object.values(parsed).reduce(
          (max, window) => Math.max(max, window.zIndex || 1000), 1000
        );
        currentMaxZIndexRef.current = maxZIndex;
      }
    } catch (error) {
      console.error('Error loading window states:', error);
    }
  }, []);
  
  // Save window states to localStorage with debounce
  const saveStateToStorage = useCallback(debounce(() => {
    try {
      localStorage.setItem('chat-window-states', JSON.stringify(windowStates));
      if (activeWindowId) {
        localStorage.setItem('chat-active-window', activeWindowId);
      }
    } catch (error) {
      console.error('Error saving window states:', error);
    }
  }, 300), [windowStates, activeWindowId]);
  
  // Save when window states change
  useEffect(() => {
    saveStateToStorage();
  }, [windowStates, saveStateToStorage]);
  
  // Define activateWindow first, so it's available for createWindow
  const activateWindow = useCallback((id) => {
    console.log(`activateWindow chiamato per ${id}`);
    
    if (!windowStates[id]) {
      console.warn(`Impossibile attivare finestra ${id}: non esiste`);
      return;
    }
    
    // Incrementa lo zIndex massimo
    const newZIndex = currentMaxZIndexRef.current + 1;
    currentMaxZIndexRef.current = newZIndex;
    
    setWindowStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        zIndex: newZIndex,
      }
    }));
    
    setZIndexOrder(prev => [...prev.filter(wId => wId !== id), id]);
    setActiveWindowId(id);
    
    console.log(`Finestra ${id} attivata con nuovo z-index: ${newZIndex}`);
  }, [windowStates]);
  
  // Create window state with centered positioning
  const createWindow = useCallback((id, title, defaultPos = {}) => {
    console.log(`createWindow chiamato per ${id} con titolo: ${title}`);
    
    // Se lo stato esiste già, attiva la finestra e ritorna l'ID
    if (windowStates[id]) {
      console.log(`Finestra ${id} già esistente, attivazione...`);
      activateWindow(id);
      return id;
    }
    
    // Calcola la posizione centrale più in alto, sotto l'header
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const windowWidth = defaultPos.width || 900;
    const windowHeight = defaultPos.height || 700;
    
    // Posizione predefinita: centrata orizzontalmente, sotto l'header
    const defaultX = defaultPos.x !== undefined ? defaultPos.x : Math.floor((viewportWidth - windowWidth) / 2);
    const defaultY = defaultPos.y !== undefined ? defaultPos.y : 20; // 20px sotto il top
    
    // Incrementa lo zIndex massimo
    const newZIndex = currentMaxZIndexRef.current + 1;
    currentMaxZIndexRef.current = newZIndex;
    
    // Crea un nuovo stato finestra
    setWindowStates(prev => ({
      ...prev,
      [id]: {
        id,
        title,
        x: defaultX,
        y: defaultY,
        width: windowWidth,
        height: windowHeight,
        isMaximized: false,
        isMinimized: false,
        zIndex: newZIndex,
        createdAt: Date.now()
      }
    }));
    
    // Aggiungi all'ordine z-index in cima
    setZIndexOrder(prev => [...prev.filter(wId => wId !== id), id]);
    setActiveWindowId(id);
    
    console.log(`Finestra ${id} creata con z-index: ${newZIndex}, posizione: (${defaultX}, ${defaultY})`);
    return id;
  }, [windowStates, activateWindow]);

    // Helper function to check for snapping
  const checkForSnapping = useCallback((id, x, y) => {
    // Validazione iniziale degli input
    if (typeof x !== 'number' || isNaN(x) || typeof y !== 'number' || isNaN(y)) {
      console.warn(`checkForSnapping chiamato con valori non validi: id=${id}, x=${x}, y=${y}`);
      // Ritorna i valori originali senza snapping
      return { snappedX: x || 0, snappedY: y || 0 };
    }
    
    // Get current window dimensions
    const currentWindow = windowStates[id];
    if (!currentWindow) return { snappedX: x, snappedY: y };
    
    const width = currentWindow.width || 900; // Valore predefinito se width manca
    const height = currentWindow.height || 700; // Valore predefinito se height manca
    
    // Get viewport dimensions
    const vpWidth = window.innerWidth;
    const vpHeight = window.innerHeight;
    
    let snappedX = x;
    let snappedY = y;
    
    // Snap to screen edges
    if (Math.abs(x) < snapDistance) {
      snappedX = 0;
    }
    if (Math.abs(x + width - vpWidth) < snapDistance) {
      snappedX = vpWidth - width;
    }
    if (Math.abs(y) < snapDistance) {
      snappedY = 0;
    }
    if (Math.abs(y + height - vpHeight) < snapDistance) {
      snappedY = vpHeight - height;
    }
    
    // Snap to other windows
    Object.entries(windowStates).forEach(([otherId, otherWindow]) => {
      if (otherId === id) return;
      
      // Assicurati che otherWindow abbia le proprietà necessarie
      if (!otherWindow || typeof otherWindow.x !== 'number' || 
          typeof otherWindow.y !== 'number' || 
          typeof otherWindow.width !== 'number' || 
          typeof otherWindow.height !== 'number') {
        return;
      }
      
      // Horizontal snapping
      // Right edge to left edge
      if (Math.abs((x + width) - otherWindow.x) < snapDistance) {
        snappedX = otherWindow.x - width;
      }
      // Left edge to right edge
      if (Math.abs(x - (otherWindow.x + otherWindow.width)) < snapDistance) {
        snappedX = otherWindow.x + otherWindow.width;
      }
      
      // Vertical snapping
      // Bottom edge to top edge
      if (Math.abs((y + height) - otherWindow.y) < snapDistance) {
        snappedY = otherWindow.y - height;
      }
      // Top edge to bottom edge
      if (Math.abs(y - (otherWindow.y + otherWindow.height)) < snapDistance) {
        snappedY = otherWindow.y + otherWindow.height;
      }
    });
    
    // Verifica finale di validità
    if (isNaN(snappedX) || isNaN(snappedY)) {
      console.error(`checkForSnapping ha prodotto valori NaN: snappedX=${snappedX}, snappedY=${snappedY}`);
      // Ritorna i valori originali
      return { snappedX: x, snappedY: y };
    }
    
    return { snappedX, snappedY };
  }, [windowStates, snapDistance]);

  
  // Update window position
const updatePosition = useCallback((id, x, y) => {
  if (!windowStates[id]) return;
  
  // Applica snapping se necessario
  const { snappedX, snappedY } = checkForSnapping(id, x, y);
  
  // Limita il movimento all'interno del viewport
  const maxX = window.innerWidth - windowStates[id].width;
  const maxY = window.innerHeight - windowStates[id].height;
  
  const boundedX = Math.max(0, Math.min(snappedX, maxX));
  const boundedY = Math.max(0, Math.min(snappedY, maxY));
  
  // Crea una copia dello stato corrente
  const updatedState = {
    ...windowStates[id],
    x: boundedX,
    y: boundedY,
    isMaximized: false // Moving a window un-maximizes it
  };
  
  // Aggiorna lo stato con la nuova posizione
  setWindowStates(prev => ({
    ...prev,
    [id]: updatedState
  }));
  
  console.log(`Posizione finestra ${id} aggiornata a: (${boundedX}, ${boundedY})`);
  
  return { x: boundedX, y: boundedY }; // Ritorna la posizione effettiva
}, [windowStates, checkForSnapping]);
  

  // Additional functions for window management
  const updateSize = useCallback((id, width, height) => {
    if (!windowStates[id]) return;
    
    const newWidth = Math.max(width, 300); // Minimum width
    const newHeight = Math.max(height, 400); // Minimum height
    
    setWindowStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        width: newWidth,
        height: newHeight,
        isMaximized: false // Resizing a window un-maximizes it
      }
    }));
    
    console.log(`Dimensioni finestra ${id} aggiornate a: ${newWidth}x${newHeight}`);
  }, [windowStates]);
  
  const toggleMaximize = useCallback((id) => {
    if (!windowStates[id]) return;
    
    const newState = !windowStates[id].isMaximized;
    
    setWindowStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isMaximized: newState,
        isMinimized: false // Un-minimize if was minimized
      }
    }));
    
    activateWindow(id);
    
    console.log(`Finestra ${id} ${newState ? 'massimizzata' : 'ripristinata'}`);
  }, [windowStates, activateWindow]);
  
  const toggleMinimize = useCallback((id) => {
    if (!windowStates[id]) return;
    
    const newState = !windowStates[id].isMinimized;
    
    setWindowStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isMinimized: newState,
      }
    }));
    
    // If minimizing the active window, activate the next top window
    if (activeWindowId === id && newState) {
      const newTopWindowId = zIndexOrder[zIndexOrder.length - 2]; // Get second to last
      if (newTopWindowId) {
        setActiveWindowId(newTopWindowId);
      }
    }
    
    console.log(`Finestra ${id} ${newState ? 'minimizzata' : 'ripristinata'}`);
  }, [windowStates, activeWindowId, zIndexOrder]);
  
  const closeWindow = useCallback((id) => {
    console.log(`closeWindow chiamato per ${id}`);
    
    if (!windowStates[id]) {
      console.warn(`Impossibile chiudere finestra ${id}: non esiste`);
      return;
    }
    
    setWindowStates(prev => {
      const newStates = {...prev};
      delete newStates[id];
      return newStates;
    });
    
    setZIndexOrder(prev => prev.filter(wId => wId !== id));
    
    // If this was the active window, activate the new top window
    if (activeWindowId === id) {
      const newTopWindowId = zIndexOrder[zIndexOrder.length - 2]; // Get second to last
      setActiveWindowId(newTopWindowId);
    }
    
    console.log(`Finestra ${id} chiusa, nuova finestra attiva: ${activeWindowId !== id ? activeWindowId : 'nessuna'}`);
  }, [windowStates, activeWindowId, zIndexOrder]);
  
  // Add the missing getZIndex function
  const getZIndex = useCallback((id) => {
    if (!id || !windowStates[id]) return 1000; // Default z-index
    
    return windowStates[id].zIndex || 1000;
  }, [windowStates]);
  
  // Add functions to get minimized and visible windows
  const getMinimizedWindows = useCallback(() => {
    return Object.entries(windowStates)
      .filter(([_, state]) => state.isMinimized)
      .map(([id, state]) => ({ id, ...state }));
  }, [windowStates]);
  
  const getVisibleWindows = useCallback(() => {
    return Object.entries(windowStates)
      .filter(([_, state]) => !state.isMinimized)
      .map(([id, state]) => ({ id, ...state }));
  }, [windowStates]);
  
  // Add window arrangement functions
  const arrangeWindowsGrid = useCallback(() => {
    const visibleWindows = getVisibleWindows();
    if (visibleWindows.length === 0) return;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - 100; // Account for header
    
    // Calculate grid dimensions
    const count = visibleWindows.length;
    let cols = Math.ceil(Math.sqrt(count));
    let rows = Math.ceil(count / cols);
    
    // Calculate window size
    const maxWidth = Math.floor(viewportWidth / cols);
    const maxHeight = Math.floor(viewportHeight / rows);
    
    // Update each window
    visibleWindows.forEach((window, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      const x = col * maxWidth;
      const y = row * maxHeight + 60; // Add offset for header
      
      setWindowStates(prev => ({
        ...prev,
        [window.id]: {
          ...prev[window.id],
          x,
          y,
          width: maxWidth,
          height: maxHeight,
          isMaximized: false
        }
      }));
    });
    
    console.log(`Disposizione a griglia applicata a ${visibleWindows.length} finestre`);
  }, [getVisibleWindows, setWindowStates]);
  
  const tileWindowsHorizontally = useCallback(() => {
    const visibleWindows = getVisibleWindows();
    if (visibleWindows.length === 0) return;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - 100; // Account for header
    
    const windowHeight = viewportHeight;
    const windowWidth = Math.floor(viewportWidth / visibleWindows.length);
    
    visibleWindows.forEach((window, index) => {
      const x = index * windowWidth;
      const y = 60; // Add offset for header
      
      setWindowStates(prev => ({
        ...prev,
        [window.id]: {
          ...prev[window.id],
          x,
          y,
          width: windowWidth,
          height: windowHeight,
          isMaximized: false
        }
      }));
    });
    
    console.log(`Disposizione orizzontale applicata a ${visibleWindows.length} finestre`);
  }, [getVisibleWindows, setWindowStates]);
  
  const tileWindowsVertically = useCallback(() => {
    const visibleWindows = getVisibleWindows();
    if (visibleWindows.length === 0) return;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - 100; // Account for header
    
    const windowWidth = viewportWidth;
    const windowHeight = Math.floor(viewportHeight / visibleWindows.length);
    
    visibleWindows.forEach((window, index) => {
      const x = 0;
      const y = 60 + (index * windowHeight); // Add offset for header
      
      setWindowStates(prev => ({
        ...prev,
        [window.id]: {
          ...prev[window.id],
          x,
          y,
          width: windowWidth,
          height: windowHeight,
          isMaximized: false
        }
      }));
    });
    
    console.log(`Disposizione verticale applicata a ${visibleWindows.length} finestre`);
  }, [getVisibleWindows, setWindowStates]);
  
  const cascadeWindows = useCallback(() => {
    const visibleWindows = getVisibleWindows();
    if (visibleWindows.length === 0) return;
    
    const offset = 30; // Offset for each cascaded window
    const startX = 50;
    const startY = 80; // Account for header
    
    // Sort windows by z-index order for natural cascade
    const sortedWindows = [...visibleWindows].sort((a, b) => {
      return zIndexOrder.indexOf(a.id) - zIndexOrder.indexOf(b.id);
    });
    
    sortedWindows.forEach((window, index) => {
      setWindowStates(prev => ({
        ...prev,
        [window.id]: {
          ...prev[window.id],
          x: startX + (index * offset),
          y: startY + (index * offset),
          width: 600, // Default width
          height: 500, // Default height
          isMaximized: false
        }
      }));
    });
    
    console.log(`Disposizione a cascata applicata a ${visibleWindows.length} finestre`);
  }, [getVisibleWindows, zIndexOrder, setWindowStates]);
  
  // Function for debouncing
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  return {
    windowStates,
    createWindow,
    updatePosition,
    updateSize,
    activateWindow,
    toggleMaximize,
    toggleMinimize,
    closeWindow,
    zIndexOrder,
    activeWindowId,
    getZIndex,
    getMinimizedWindows,
    getVisibleWindows,
    arrangeWindowsGrid,
    tileWindowsHorizontally,
    tileWindowsVertically,
    cascadeWindows
  };
}