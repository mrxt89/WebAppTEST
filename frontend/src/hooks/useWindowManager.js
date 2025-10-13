// hooks/useWindowManager.js
import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook for managing windows in the application.
 * Handles positioning, sizing, z-index, minimizing, and maximizing windows.
 *
 * @param {string} chatPrefix - Optional prefix for window IDs
 * @returns {Object} Window management methods and state
 */
export default function useWindowManager(chatPrefix = "chat-window-") {
  // Window states storage
  const [windowStates, setWindowStates] = useState({});
  const [zIndexOrder, setZIndexOrder] = useState([]);
  const [activeWindowId, setActiveWindowId] = useState(null);

  // Refs for optimization and immediate access
  const windowStatesRef = useRef({});
  const maxZIndexRef = useRef(1000);

  // Update ref whenever state changes to avoid stale closures
  useEffect(() => {
    windowStatesRef.current = windowStates;
  }, [windowStates]);

  // Load saved window states from localStorage
  useEffect(() => {
    try {
      const savedStates = localStorage.getItem("chat-window-states");
      if (savedStates) {
        const parsed = JSON.parse(savedStates);
        setWindowStates(parsed);
        windowStatesRef.current = parsed;

        // Extract and restore z-index order
        const sortedIds = Object.keys(parsed).sort(
          (a, b) => (parsed[a].zIndex || 1000) - (parsed[b].zIndex || 1000),
        );

        setZIndexOrder(sortedIds);

        // Restore active window if any
        const activeId = localStorage.getItem("chat-active-window");
        if (activeId && parsed[activeId]) {
          setActiveWindowId(activeId);
        }

        // Update max z-index value
        const maxZIndex = Object.values(parsed).reduce(
          (max, window) => Math.max(max, window.zIndex || 1000),
          1000,
        );
        maxZIndexRef.current = maxZIndex;
      }
    } catch (error) {
      console.error("Error loading window states:", error);
    }
  }, []);

  // Debounce function
  const debounce = useCallback((func, wait) => {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }, []);

  // Save window states to localStorage with debounce
  const saveStateToStorage = useCallback(
    debounce(() => {
      try {
        localStorage.setItem(
          "chat-window-states",
          JSON.stringify(windowStatesRef.current),
        );
        if (activeWindowId) {
          localStorage.setItem("chat-active-window", activeWindowId);
        }
      } catch (error) {
        console.error("Error saving window states:", error);
      }
    }, 300),
    [activeWindowId],
  );

  // Save when window states change
  useEffect(() => {
    if (Object.keys(windowStates).length > 0) {
      saveStateToStorage();
    }
  }, [windowStates, saveStateToStorage]);

  /**
   * Activates a window by bringing it to the front
   * @param {string|number} id - Window identifier
   */
  const activateWindow = useCallback((id) => {
    const stringId = String(id);
    
    if (!windowStatesRef.current[stringId]) {
      console.warn(`Cannot activate window ${stringId}: does not exist`);
      return;
    }

    // Increment max z-index
    const newZIndex = maxZIndexRef.current + 1;
    maxZIndexRef.current = newZIndex;

    setWindowStates((prev) => {
      const updated = {
        ...prev,
        [stringId]: {
          ...prev[stringId],
          zIndex: newZIndex,
        },
      };
      windowStatesRef.current = updated;
      return updated;
    });

    setZIndexOrder((prev) => [...prev.filter((wId) => wId !== stringId), stringId]);
    setActiveWindowId(stringId);
  }, []);

  /**
   * Creates a new window with specified ID and title
   * @param {string|number} id - Window identifier
   * @param {string} title - Window title
   * @param {Object} defaultPos - Optional default position and size
   * @returns {string} The window ID as string
   */
  const createWindow = useCallback(
    (id, title, defaultPos = {}) => {
      const stringId = String(id);
      
      // If window already exists, activate it and return
      if (windowStatesRef.current[stringId]) {
      
        activateWindow(stringId);
        return stringId;
      }

     

      // Calculate centered position
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const windowWidth = defaultPos.width || 900;
      const windowHeight = defaultPos.height || 700;

      const defaultX =
        defaultPos.x !== undefined
          ? defaultPos.x
          : Math.max(0, Math.floor((viewportWidth - windowWidth) / 2));
      const defaultY = defaultPos.y !== undefined ? defaultPos.y : 20;

      // Increment max z-index
      const newZIndex = maxZIndexRef.current + 1;
      maxZIndexRef.current = newZIndex;

      // Create new window state
      const newWindowState = {
        id: stringId,
        title,
        x: defaultX,
        y: defaultY,
        width: windowWidth,
        height: windowHeight,
        isMaximized: false,
        isMinimized: false,
        zIndex: newZIndex,
        createdAt: Date.now(),
      };

      setWindowStates((prev) => {
        const newState = {
          ...prev,
          [stringId]: newWindowState,
        };
        windowStatesRef.current = newState;
        return newState;
      });

      // Update z-index order
      setZIndexOrder((prev) => [...prev.filter((wId) => wId !== stringId), stringId]);
      setActiveWindowId(stringId);

      return stringId;
    },
    [activateWindow],
  );

  /**
   * Updates window position
   * @param {string|number} id - Window identifier
   * @param {number} x - New X position
   * @param {number} y - New Y position
   * @returns {Object} Updated position
   */
  const updatePosition = useCallback((id, x, y) => {
    const stringId = String(id);
    
    if (!windowStatesRef.current[stringId]) {
      console.warn(`Cannot update position for window ${stringId}: does not exist`);
      return { x: x || 0, y: y || 0 };
    }

    // Validate inputs
    const validX = typeof x === 'number' && !isNaN(x) ? x : 0;
    const validY = typeof y === 'number' && !isNaN(y) ? y : 0;

    // Get current window
    const currWindow = windowStatesRef.current[stringId];
    const windowWidth = currWindow.width || 900;
    const windowHeight = currWindow.height || 700;

    // Limit movement within viewport
    const maxX = Math.max(0, window.innerWidth - windowWidth);
    const maxY = Math.max(0, window.innerHeight - windowHeight);

    const boundedX = Math.max(0, Math.min(validX, maxX));
    const boundedY = Math.max(0, Math.min(validY, maxY));

    // Update state with new position
    setWindowStates((prev) => {
      const updated = {
        ...prev,
        [stringId]: {
          ...prev[stringId],
          x: boundedX,
          y: boundedY,
          isMaximized: false, // Moving a window un-maximizes it
        },
      };
      windowStatesRef.current = updated;
      return updated;
    });

    return { x: boundedX, y: boundedY };
  }, []);

  /**
   * Updates window size
   * @param {string|number} id - Window identifier
   * @param {number} width - New width
   * @param {number} height - New height
   */
  const updateSize = useCallback((id, width, height) => {
    const stringId = String(id);
    
    if (!windowStatesRef.current[stringId]) {
      console.warn(`Cannot update size for window ${stringId}: does not exist`);
      return;
    }

    const minWidth = 400;
    const minHeight = 350;
    const maxWidth = Math.min(window.innerWidth * 0.95, window.innerWidth - 20);
    const maxHeight = Math.min(
      window.innerHeight * 0.95,
      window.innerHeight - 80,
    );

    const newWidth = Math.max(minWidth, Math.min(width || minWidth, maxWidth));
    const newHeight = Math.max(minHeight, Math.min(height || minHeight, maxHeight));

    setWindowStates((prev) => {
      const updated = {
        ...prev,
        [stringId]: {
          ...prev[stringId],
          width: newWidth,
          height: newHeight,
          isMaximized: false,
        },
      };
      windowStatesRef.current = updated;
      return updated;
    });
  }, []);

  /**
   * Toggles window maximized state
   * @param {string|number} id - Window identifier
   */
  const toggleMaximize = useCallback(
    (id) => {
      const stringId = String(id);
      
      if (!windowStatesRef.current[stringId]) {
        console.warn(`Cannot maximize window ${stringId}: does not exist`);
        return;
      }

     

      const newState = !windowStatesRef.current[stringId].isMaximized;

      setWindowStates((prev) => {
        const updated = {
          ...prev,
          [stringId]: {
            ...prev[stringId],
            isMaximized: newState,
            isMinimized: false, // Un-minimize if minimized
          },
        };
        windowStatesRef.current = updated;
        return updated;
      });

      activateWindow(stringId);
    },
    [activateWindow],
  );

  /**
   * Toggles window minimized state
   * @param {string|number} id - Window identifier
   */
  const toggleMinimize = useCallback(
    (id) => {
      const stringId = String(id);
      
      if (!windowStatesRef.current[stringId]) {
        console.warn(`Cannot minimize window ${stringId}: does not exist`);
        return;
      }

     

      const currentState = windowStatesRef.current[stringId];
      const newMinimizedState = !currentState.isMinimized;

      setWindowStates((prev) => {
        const updated = {
          ...prev,
          [stringId]: {
            ...prev[stringId],
            isMinimized: newMinimizedState,
            isMaximized: false, // Un-maximize when minimizing
          },
        };
        windowStatesRef.current = updated;
        return updated;
      });

      // If minimizing active window, activate next top window
      if (activeWindowId === stringId && newMinimizedState) {
        const visibleWindows = zIndexOrder.filter(wId => 
          windowStatesRef.current[wId] && !windowStatesRef.current[wId].isMinimized
        );
        const newTopWindowId = visibleWindows[visibleWindows.length - 1];
        
        if (newTopWindowId && newTopWindowId !== stringId) {
          setActiveWindowId(newTopWindowId);
        }
      }
    },
    [activeWindowId, zIndexOrder],
  );

  /**
   * Closes a window
   * @param {string|number} id - Window identifier
   */
  const closeWindow = useCallback(
    (id) => {
      const stringId = String(id);
      
      if (!windowStatesRef.current[stringId]) {
        console.warn(`Cannot close window ${stringId}: does not exist`);
        return;
      }

     

      setWindowStates((prev) => {
        const { [stringId]: removedWindow, ...newStates } = prev;
        windowStatesRef.current = newStates;
        return newStates;
      });

      setZIndexOrder((prev) => prev.filter((wId) => wId !== stringId));

      // If this was active window, activate new top window
      if (activeWindowId === stringId) {
        const remainingWindows = zIndexOrder.filter(wId => wId !== stringId);
        const newTopWindowId = remainingWindows[remainingWindows.length - 1];
        setActiveWindowId(newTopWindowId || null);
      }
    },
    [activeWindowId, zIndexOrder],
  );

  /**
   * Gets z-index for a window
   * @param {string|number} id - Window identifier
   * @returns {number} Z-index value
   */
  const getZIndex = useCallback((id) => {
    const stringId = String(id);
    if (!stringId || !windowStatesRef.current[stringId]) return 1000;
    return windowStatesRef.current[stringId].zIndex || 1000;
  }, []);

  /**
   * Gets all minimized windows
   * @returns {Array} List of minimized windows
   */
  const getMinimizedWindows = useCallback(() => {
    return Object.entries(windowStatesRef.current)
      .filter(([_, state]) => state && state.isMinimized)
      .map(([id, state]) => ({ id, ...state }));
  }, []);

  /**
   * Gets all visible (non-minimized) windows
   * @returns {Array} List of visible windows
   */
  const getVisibleWindows = useCallback(() => {
    const allWindows = Object.entries(windowStatesRef.current);
    const visibleWindows = allWindows
      .filter(([_, state]) => state && !state.isMinimized)
      .map(([id, state]) => ({ id, ...state }));
    
   
    
    return visibleWindows;
  }, []);

  /**
   * Forza un aggiornamento dello stato delle finestre
   */
  const forceUpdate = useCallback(() => {
    setWindowStates(prev => ({ ...prev }));
  }, []);

  /**
   * Arranges windows in a grid pattern
   */
  const arrangeWindowsGrid = useCallback(() => {
   
    
    const visibleWindows = getVisibleWindows();
   
    
    if (visibleWindows.length === 0) {
     
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - 100; // Account for header

    // Calculate grid dimensions
    const count = visibleWindows.length;
    let cols = Math.ceil(Math.sqrt(count));
    let rows = Math.ceil(count / cols);

    // Calculate window size
    const windowWidth = Math.floor(viewportWidth / cols);
    const windowHeight = Math.floor(viewportHeight / rows);

   

    // Batch update all windows
    setWindowStates((prev) => {
      const updates = { ...prev };
      
      visibleWindows.forEach((window, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;

        const x = col * windowWidth;
        const y = row * windowHeight + 60; // Add offset for header

        updates[window.id] = {
          ...prev[window.id],
          x,
          y,
          width: windowWidth,
          height: windowHeight,
          isMaximized: false,
          isMinimized: false,
        };

       
      });

      // Update ref immediately
      windowStatesRef.current = updates;
      return updates;
    });

    // Activate last window after a short delay
    if (visibleWindows.length > 0) {
      const lastWindow = visibleWindows[visibleWindows.length - 1];
      setTimeout(() => {
        activateWindow(lastWindow.id);
      }, 100);
    }
  }, [getVisibleWindows, activateWindow]);

  /**
   * Arranges windows horizontally (side by side)
   */
  const tileWindowsHorizontally = useCallback(() => {
    
    
    const visibleWindows = getVisibleWindows();
    
    if (visibleWindows.length === 0) {
     
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - 100;

    const windowHeight = viewportHeight;
    const windowWidth = Math.floor(viewportWidth / visibleWindows.length);

     

    // Batch update all windows
    setWindowStates((prev) => {
      const updates = { ...prev };
      
      visibleWindows.forEach((window, index) => {
        const x = index * windowWidth;
        const y = 60;

        updates[window.id] = {
          ...prev[window.id],
          x,
          y,
          width: windowWidth,
          height: windowHeight,
          isMaximized: false,
          isMinimized: false,
        };

       
      });

      windowStatesRef.current = updates;
      return updates;
    });

    // Activate last window
    if (visibleWindows.length > 0) {
      const lastWindow = visibleWindows[visibleWindows.length - 1];
      setTimeout(() => {
        activateWindow(lastWindow.id);
      }, 100);
    }
  }, [getVisibleWindows, activateWindow]);

  /**
   * Arranges windows vertically (side by side - Windows terminology)
   */
  const tileWindowsVertically = useCallback(() => {
    
    
    const visibleWindows = getVisibleWindows();
    
    
    if (visibleWindows.length === 0) {
     
      return;
    }

    // Calcola area disponibile
    const headerOffset = 80;
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight - headerOffset;

    // TILE VERTICALE = finestre affiancate orizzontalmente
    // Ogni finestra occupa tutta l'altezza e divide la larghezza
    const windowWidth = Math.floor(availableWidth / visibleWindows.length);
    const windowHeight = availableHeight;


    // Batch update all windows
    setWindowStates((prev) => {
      const updates = { ...prev };
      
      visibleWindows.forEach((window, index) => {
        const x = index * windowWidth; // Affiancate orizzontalmente
        const y = headerOffset; // Tutte alla stessa altezza

        updates[window.id] = {
          ...prev[window.id],
          x,
          y,
          width: windowWidth,
          height: windowHeight,
          isMaximized: false,
          isMinimized: false,
        };

       
      });

      windowStatesRef.current = updates;
      return updates;
    });

    // Activate last window
    if (visibleWindows.length > 0) {
      const lastWindow = visibleWindows[visibleWindows.length - 1];
      setTimeout(() => {
        activateWindow(lastWindow.id);
      }, 100);
    }
  }, [getVisibleWindows, activateWindow]);

  /**
   * Arranges windows in a cascading pattern
   */
  const cascadeWindows = useCallback(() => {
    
    
    const visibleWindows = getVisibleWindows();
    
    
    if (visibleWindows.length === 0) {
      
      return;
    }

    const offset = 40; // Offset for each cascaded window
    const startX = 50;
    const startY = 80;
    const windowWidth = 800;
    const windowHeight = 600;

    

    // Batch update all windows
    setWindowStates((prev) => {
      const updates = { ...prev };
      
      visibleWindows.forEach((window, index) => {
        const x = startX + index * offset;
        const y = startY + index * offset;

        // Ensure window doesn't go off screen
        const maxX = window.innerWidth - windowWidth - 50;
        const maxY = window.innerHeight - windowHeight - 50;
        
        const boundedX = Math.min(x, Math.max(0, maxX));
        const boundedY = Math.min(y, Math.max(80, maxY));

        updates[window.id] = {
          ...prev[window.id],
          x: boundedX,
          y: boundedY,
          width: windowWidth,
          height: windowHeight,
          isMaximized: false,
          isMinimized: false,
        };
        
      });

      windowStatesRef.current = updates;
      return updates;
    });

    // Activate last window
    if (visibleWindows.length > 0) {
      const lastWindow = visibleWindows[visibleWindows.length - 1];
      setTimeout(() => {
        activateWindow(lastWindow.id);
      }, 100);
    }
  }, [getVisibleWindows, activateWindow]);

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
    cascadeWindows,
    forceUpdate,
  };
}