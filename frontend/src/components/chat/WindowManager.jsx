import React, { useState, useEffect, useCallback } from 'react';
import ChatWindow from './ChatWindow';

/**
 * WindowManager component manages multiple chat windows
 * providing position tracking, z-index ordering, and window controls
 * 
 * @param {Array} openChats - Array of open chat notification objects
 * @param {Function} onCloseChat - Callback when a chat is closed
 * @param {Function} onMinimizeChat - Callback when a chat is minimized
 * @param {Function} restoreChat - Callback to restore a minimized chat
 */
const WindowManager = ({ openChats, onCloseChat, onMinimizeChat, restoreChat }) => {
  // Track active window to bring to front
  const [activeWindowId, setActiveWindowId] = useState(null);
  // Track z-index order
  const [zIndexOrder, setZIndexOrder] = useState([]);
  // Store window positions and sizes
  const [windowStates, setWindowStates] = useState({});
  
  // Initialize z-index order when chats change
  useEffect(() => {
    const newIds = openChats.map(chat => chat.notificationId);
    setZIndexOrder(prev => {
      // Remove closed windows
      const filtered = prev.filter(id => newIds.includes(id));
      // Add new windows to the end (top)
      const toAdd = newIds.filter(id => !filtered.includes(id));
      return [...filtered, ...toAdd];
    });
    
    // Initialize new windows with default state
    newIds.forEach(id => {
      if (!windowStates[id]) {
        setWindowStates(prev => ({
          ...prev,
          [id]: {
            id,
            x: Math.max(0, (window.innerWidth - 900) / 2),
            y: 0, // Posizione più in alto
            width: 900,
            height: 700,
            isMaximized: false,
            isMinimized: false
          }
        }));
      }
    });
  }, [openChats, windowStates]);
  
  // Bring a window to the front (higher z-index)
  const activateWindow = useCallback((id) => {
    setActiveWindowId(id);
    setZIndexOrder(prev => [
      ...prev.filter(windowId => windowId !== id),
      id
    ]);
  }, []);
  
  // Get z-index for a window based on its position in the z-order array
  const getZIndex = useCallback((id) => {
    const index = zIndexOrder.indexOf(id);
    if (index === -1) return 1000; // Base z-index for windows not in z-order
    return 1000 + index; // Higher index = higher z-index
  }, [zIndexOrder]);
  
  // Toggle window maximize state
  const toggleMaximize = useCallback((id) => {
    setWindowStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isMaximized: !prev[id]?.isMaximized,
        isMinimized: false // Ensure it's not minimized when maximized
      }
    }));
    
    // Always bring maximized window to front
    activateWindow(id);
  }, [activateWindow]);
  
  // Toggle window minimize state
  const toggleMinimize = useCallback((id) => {
    console.log(`Toggle minimize called for window ID: ${id}`); // Log di debug
    
    // Ottieni lo stato corrente prima di cambiarlo
    const currentState = windowStates[id];
    const currentlyMinimized = currentState?.isMinimized || false;
    
    console.log(`Current minimized state: ${currentlyMinimized}`);
    
    // Aggiorna lo stato con il toggle corretto
    setWindowStates(prev => {
      // Se lo stato per questo ID non esiste, crealo con valori di default
      if (!prev[id]) {
        console.log(`Creating new window state for ID: ${id}`);
        return {
          ...prev,
          [id]: {
            id,
            x: Math.max(0, (window.innerWidth - 900) / 2),
            y: 0,
            width: 900,
            height: 700,
            isMaximized: false,
            isMinimized: !currentlyMinimized // Toggle rispetto allo stato corrente
          }
        };
      }
      
      // Altrimenti aggiorna lo stato esistente
      console.log(`Updating window state, new minimized state: ${!currentlyMinimized}`);
      return {
        ...prev,
        [id]: {
          ...prev[id],
          isMinimized: !prev[id].isMinimized,
          isMaximized: false // Un-maximize if minimizing
        }
      };
    });
    
    // If minimizing active window, activate another window
    if (activeWindowId === id && !currentlyMinimized) {
      const nextActiveId = zIndexOrder
        .filter(wId => wId !== id && !windowStates[wId]?.isMinimized)
        .pop();
      
      if (nextActiveId) {
        activateWindow(nextActiveId);
      }
    }
    
    // Se stiamo ripristinando una finestra minimizzata, attiviamola
    if (currentlyMinimized) {
      activateWindow(id);
    }
  }, [activeWindowId, activateWindow, zIndexOrder, windowStates]);
  
  // Update window position
  const updatePosition = useCallback((id, x, y) => {
    // Ensure window stays within viewport
    const maxX = window.innerWidth - (windowStates[id]?.width || 900);
    const maxY = window.innerHeight - 50;
    
    const boundedX = Math.max(0, Math.min(x, maxX));
    const boundedY = Math.max(60, Math.min(y, maxY)); // Keep below header
    
    setWindowStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        x: boundedX,
        y: boundedY,
        isMaximized: false // Moving un-maximizes
      }
    }));
  }, [windowStates]);
  
  // Update window size
  const updateSize = useCallback((id, width, height) => {
    // Enforce minimum and maximum dimensions
    const minWidth = 400;
    const minHeight = 350;
    const maxWidth = window.innerWidth * 0.95;
    const maxHeight = window.innerHeight * 0.95;
    
    // Apply constraints
    const constrainedWidth = Math.max(minWidth, Math.min(width, maxWidth));
    const constrainedHeight = Math.max(minHeight, Math.min(height, maxHeight));
    
    setWindowStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        width: constrainedWidth,
        height: constrainedHeight,
        isMaximized: false // Resizing un-maximizes
      }
    }));
  }, []);
  
  // Close window
  const closeWindow = useCallback((id) => {
    // Remove from state
    setWindowStates(prev => {
      const { [id]: removedWindow, ...rest } = prev;
      return rest;
    });
    
    // Remove from z-index order
    setZIndexOrder(prev => prev.filter(wId => wId !== id));
    
    // Update active window if this was active
    if (activeWindowId === id) {
      const nextActiveId = zIndexOrder
        .filter(wId => wId !== id)
        .pop();
      
      if (nextActiveId) {
        setActiveWindowId(nextActiveId);
      } else {
        setActiveWindowId(null);
      }
    }
  }, [activeWindowId, zIndexOrder]);
  
  // Get all visible windows
  const getVisibleWindows = useCallback(() => {
    return Object.entries(windowStates)
      .filter(([_, state]) => !state.isMinimized)
      .map(([id, state]) => ({ id: parseInt(id), ...state }));
  }, [windowStates]);
  
  // Get all minimized windows
  const getMinimizedWindows = useCallback(() => {
    return Object.entries(windowStates)
      .filter(([_, state]) => state.isMinimized)
      .map(([id, state]) => ({ id: parseInt(id), ...state }));
  }, [windowStates]);
  
  // Cascade windows
  const cascadeWindows = useCallback(() => {
    const visibleChats = openChats.filter(chat => 
      !windowStates[chat.notificationId]?.isMinimized
    );
    
    if (visibleChats.length === 0) return;
    
    const offset = 40;
    const startX = 80;
    const startY = 80; // Start below header
    
    visibleChats.forEach((chat, index) => {
      const x = startX + (index * offset);
      const y = startY + (index * offset);
      
      // Ensure window stays within viewport
      const maxX = window.innerWidth - 900;
      const maxY = window.innerHeight - 450;
      
      const boundedX = Math.min(x, maxX);
      const boundedY = Math.min(y, maxY);
      
      setWindowStates(prev => ({
        ...prev,
        [chat.notificationId]: {
          ...prev[chat.notificationId],
          x: boundedX,
          y: boundedY,
          width: 900,
          height: 700,
          isMaximized: false,
          isMinimized: false
        }
      }));
      
      // Bring to front in order (last one on top)
      setTimeout(() => {
        activateWindow(chat.notificationId);
      }, index * 100);
    });
  }, [windowStates, openChats, activateWindow]);
  
  // Tile windows horizontally
  const tileWindowsHorizontally = useCallback(() => {
    const visibleChats = openChats.filter(chat => 
      !windowStates[chat.notificationId]?.isMinimized
    );
    
    if (visibleChats.length === 0) return;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - 80; // Account for header
    
    const windowWidth = Math.floor(viewportWidth / visibleChats.length);
    const windowHeight = viewportHeight;
    
    visibleChats.forEach((chat, index) => {
      const x = index * windowWidth;
      const y = 80; // Below header
      
      setWindowStates(prev => ({
        ...prev,
        [chat.notificationId]: {
          ...prev[chat.notificationId],
          x,
          y,
          width: windowWidth,
          height: windowHeight,
          isMaximized: false,
          isMinimized: false
        }
      }));
    });
  }, [windowStates, openChats]);
  
  // Tile windows vertically
  const tileWindowsVertically = useCallback(() => {
    const visibleChats = openChats.filter(chat => 
      !windowStates[chat.notificationId]?.isMinimized
    );
    
    if (visibleChats.length === 0) return;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - 80; // Account for header
    
    const windowWidth = viewportWidth;
    const windowHeight = Math.floor(viewportHeight / visibleChats.length);
    
    visibleChats.forEach((chat, index) => {
      const x = 0;
      const y = 80 + (index * windowHeight); // Header offset + position
      
      setWindowStates(prev => ({
        ...prev,
        [chat.notificationId]: {
          ...prev[chat.notificationId],
          x,
          y,
          width: windowWidth,
          height: windowHeight,
          isMaximized: false,
          isMinimized: false
        }
      }));
    });
  }, [windowStates, openChats]);
  
  // Arrange windows in a grid
  const arrangeWindowsGrid = useCallback(() => {
    const visibleChats = openChats.filter(chat => 
      !windowStates[chat.notificationId]?.isMinimized
    );
    
    if (visibleChats.length === 0) return;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - 80; // Account for header
    
    // Calculate grid dimensions
    const count = visibleChats.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    // Calculate window size
    const windowWidth = Math.floor(viewportWidth / cols);
    const windowHeight = Math.floor(viewportHeight / rows);
    
    // Update each window
    visibleChats.forEach((chat, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      const x = col * windowWidth;
      const y = 80 + (row * windowHeight); // Add offset for header
      
      setWindowStates(prev => ({
        ...prev,
        [chat.notificationId]: {
          ...prev[chat.notificationId],
          x,
          y,
          width: windowWidth,
          height: windowHeight,
          isMaximized: false,
          isMinimized: false
        }
      }));
    });
  }, [windowStates, openChats]);
  
  // Create window management object
  const windowManager = {
    activateWindow,
    toggleMaximize,
    toggleMinimize,
    updatePosition,
    updateSize,
    getZIndex,
    closeWindow,
    windowStates,
    getVisibleWindows,
    getMinimizedWindows,
    cascadeWindows,
    tileWindowsHorizontally,
    tileWindowsVertically,
    arrangeWindowsGrid
  };
  
  return (
    <div className="chat-windows-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {openChats.map(chat => (
        <ChatWindow
          key={`chat-window-${chat.notificationId}`}
          notification={chat}
          onClose={onCloseChat}
          onMinimize={onMinimizeChat}
          windowManager={windowManager}
        />
      ))}
    </div>
  );
};

export default WindowManager;