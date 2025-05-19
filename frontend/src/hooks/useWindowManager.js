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

  // Refs for optimization
  const windowStatesRef = useRef({});
  const maxZIndexRef = useRef(1000);
  const snapDistance = 15; // px within which windows will snap

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
          (a, b) => parsed[a].zIndex - parsed[b].zIndex,
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
          JSON.stringify(windowStates),
        );
        if (activeWindowId) {
          localStorage.setItem("chat-active-window", activeWindowId);
        }
      } catch (error) {
        console.error("Error saving window states:", error);
      }
    }, 300),
    [windowStates, activeWindowId],
  );

  // Save when window states change
  useEffect(() => {
    saveStateToStorage();
  }, [windowStates, saveStateToStorage]);

  /**
   * Activates a window by bringing it to the front
   * @param {string|number} id - Window identifier
   */
  const activateWindow = useCallback((id) => {
    if (!windowStatesRef.current[id]) {
      console.warn(`Cannot activate window ${id}: does not exist`);
      return;
    }

    // Increment max z-index
    const newZIndex = maxZIndexRef.current + 1;
    maxZIndexRef.current = newZIndex;

    setWindowStates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        zIndex: newZIndex,
      },
    }));

    setZIndexOrder((prev) => [...prev.filter((wId) => wId !== id), id]);
    setActiveWindowId(id);
  }, []);

  /**
   * Creates a new window with specified ID and title
   * @param {string|number} id - Window identifier
   * @param {string} title - Window title
   * @param {Object} defaultPos - Optional default position and size
   * @returns {string|number} The window ID
   */
  const createWindow = useCallback(
    (id, title, defaultPos = {}) => {
      // If window already exists, activate it and return
      if (windowStatesRef.current[id]) {
        activateWindow(id);
        return id;
      }

      // Calculate centered position
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const windowWidth = defaultPos.width || 900;
      const windowHeight = defaultPos.height || 700;

      const defaultX =
        defaultPos.x !== undefined
          ? defaultPos.x
          : Math.floor((viewportWidth - windowWidth) / 2);
      const defaultY = defaultPos.y !== undefined ? defaultPos.y : 20; // 20px from top

      // Increment max z-index
      const newZIndex = maxZIndexRef.current + 1;
      maxZIndexRef.current = newZIndex;

      // Create new window state
      setWindowStates((prev) => {
        const newState = {
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
            createdAt: Date.now(),
          },
        };

        // Update ref for immediate access
        windowStatesRef.current = newState;
        return newState;
      });

      // Update z-index order
      setZIndexOrder((prev) => [...prev.filter((wId) => wId !== id), id]);
      setActiveWindowId(id);

      return id;
    },
    [activateWindow],
  );

  /**
   * Checks if window position should snap to edges or other windows
   * @param {string|number} id - Window identifier
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {Object} Snapped coordinates
   */
  const checkForSnapping = useCallback((id, x, y) => {
    // Input validation
    if (
      typeof x !== "number" ||
      isNaN(x) ||
      typeof y !== "number" ||
      isNaN(y)
    ) {
      console.warn(
        `Invalid values in checkForSnapping: id=${id}, x=${x}, y=${y}`,
      );
      return { snappedX: x || 0, snappedY: y || 0 };
    }

    // Get current window dimensions
    const currentWindow = windowStatesRef.current[id];
    if (!currentWindow) return { snappedX: x, snappedY: y };

    const width = currentWindow.width || 900;
    const height = currentWindow.height || 700;

    // Get viewport dimensions
    const vpWidth = window.innerWidth;
    const vpHeight = window.innerHeight;

    let snappedX = x;
    let snappedY = y;

    // Snap to screen edges
    if (Math.abs(x) < snapDistance) snappedX = 0;
    if (Math.abs(x + width - vpWidth) < snapDistance)
      snappedX = vpWidth - width;
    if (Math.abs(y) < snapDistance) snappedY = 0;
    if (Math.abs(y + height - vpHeight) < snapDistance)
      snappedY = vpHeight - height;

    // Snap to other windows
    Object.entries(windowStatesRef.current).forEach(
      ([otherId, otherWindow]) => {
        if (otherId === id) return;

        // Ensure otherWindow has needed properties
        if (
          !otherWindow ||
          typeof otherWindow.x !== "number" ||
          typeof otherWindow.y !== "number" ||
          typeof otherWindow.width !== "number" ||
          typeof otherWindow.height !== "number"
        ) {
          return;
        }

        // Horizontal snapping
        // Right edge to left edge
        if (Math.abs(x + width - otherWindow.x) < snapDistance) {
          snappedX = otherWindow.x - width;
        }
        // Left edge to right edge
        if (Math.abs(x - (otherWindow.x + otherWindow.width)) < snapDistance) {
          snappedX = otherWindow.x + otherWindow.width;
        }

        // Vertical snapping
        // Bottom edge to top edge
        if (Math.abs(y + height - otherWindow.y) < snapDistance) {
          snappedY = otherWindow.y - height;
        }
        // Top edge to bottom edge
        if (Math.abs(y - (otherWindow.y + otherWindow.height)) < snapDistance) {
          snappedY = otherWindow.y + otherWindow.height;
        }
      },
    );

    // Final validation
    if (isNaN(snappedX) || isNaN(snappedY)) {
      console.error(
        `Calculated NaN values in checkForSnapping: snappedX=${snappedX}, snappedY=${snappedY}`,
      );
      return { snappedX: x, snappedY: y };
    }

    return { snappedX, snappedY };
  }, []);

  /**
   * Updates window position
   * @param {string|number} id - Window identifier
   * @param {number} x - New X position
   * @param {number} y - New Y position
   * @returns {Object} Updated position
   */
  const updatePosition = useCallback(
    (id, x, y) => {
      if (!windowStatesRef.current[id]) return;

      // Apply snapping if needed
      const { snappedX, snappedY } = checkForSnapping(id, x, y);

      // Limit movement within viewport
      const currWindow = windowStatesRef.current[id];
      const maxX = window.innerWidth - currWindow.width;
      const maxY = window.innerHeight - currWindow.height;

      const boundedX = Math.max(0, Math.min(snappedX, maxX));
      const boundedY = Math.max(0, Math.min(snappedY, maxY));

      // Update state with new position
      setWindowStates((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          x: boundedX,
          y: boundedY,
          isMaximized: false, // Moving a window un-maximizes it
        },
      }));

      return { x: boundedX, y: boundedY }; // Return actual position
    },
    [checkForSnapping],
  );

  /**
   * Updates window size
   * @param {string|number} id - Window identifier
   * @param {number} width - New width
   * @param {number} height - New height
   */
  const updateSize = useCallback((id, width, height) => {
    if (!windowStatesRef.current[id]) return;

    const minWidth = 400;
    const minHeight = 350;
    const maxWidth = Math.min(window.innerWidth * 0.95, window.innerWidth - 20);
    const maxHeight = Math.min(
      window.innerHeight * 0.95,
      window.innerHeight - 80,
    );

    const newWidth = Math.max(minWidth, Math.min(width, maxWidth));
    const newHeight = Math.max(minHeight, Math.min(height, maxHeight));

    setWindowStates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        width: newWidth,
        height: newHeight,
        isMaximized: false,
      },
    }));
  }, []);

  /**
   * Toggles window maximized state
   * @param {string|number} id - Window identifier
   */
  const toggleMaximize = useCallback(
    (id) => {
      if (!windowStatesRef.current[id]) return;

      const newState = !windowStatesRef.current[id].isMaximized;

      setWindowStates((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          isMaximized: newState,
          isMinimized: false, // Un-minimize if minimized
        },
      }));

      activateWindow(id);
    },
    [activateWindow],
  );

  /**
   * Toggles window minimized state
   * @param {string|number} id - Window identifier
   */
  const toggleMinimize = useCallback(
    (id) => {
      if (!windowStatesRef.current[id]) return;

      const newState = !windowStatesRef.current[id].isMinimized;

      setWindowStates((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          isMinimized: newState,
        },
      }));

      // If minimizing active window, activate next top window
      if (activeWindowId === id && newState) {
        const newTopWindowId = zIndexOrder[zIndexOrder.length - 2]; // Get second to last
        if (newTopWindowId) {
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
      if (!windowStatesRef.current[id]) return;

      setWindowStates((prev) => {
        const newStates = { ...prev };
        delete newStates[id];

        // Update ref for immediate access
        windowStatesRef.current = newStates;
        return newStates;
      });

      setZIndexOrder((prev) => prev.filter((wId) => wId !== id));

      // If this was active window, activate new top window
      if (activeWindowId === id) {
        const newTopWindowId = zIndexOrder[zIndexOrder.length - 2]; // Get second to last
        setActiveWindowId(newTopWindowId);
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
    if (!id || !windowStatesRef.current[id]) return 1000; // Default z-index
    return windowStatesRef.current[id].zIndex || 1000;
  }, []);

  /**
   * Gets all minimized windows
   * @returns {Array} List of minimized windows
   */
  const getMinimizedWindows = useCallback(() => {
    return Object.entries(windowStatesRef.current)
      .filter(([_, state]) => state.isMinimized)
      .map(([id, state]) => ({ id, ...state }));
  }, []);

  /**
   * Gets all visible (non-minimized) windows
   * @returns {Array} List of visible windows
   */
  const getVisibleWindows = useCallback(() => {
    return Object.entries(windowStatesRef.current)
      .filter(([_, state]) => !state.isMinimized)
      .map(([id, state]) => ({ id, ...state }));
  }, []);

  /**
   * Arranges windows in a grid pattern
   */
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
    const updates = {};
    visibleWindows.forEach((window, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      const x = col * maxWidth;
      const y = row * maxHeight + 60; // Add offset for header

      updates[window.id] = {
        ...windowStatesRef.current[window.id],
        x,
        y,
        width: maxWidth,
        height: maxHeight,
        isMaximized: false,
      };
    });

    // Batch update all windows at once
    setWindowStates((prev) => ({
      ...prev,
      ...updates,
    }));
  }, [getVisibleWindows]);

  /**
   * Arranges windows horizontally (side by side)
   */
  const tileWindowsHorizontally = useCallback(() => {
    const visibleWindows = getVisibleWindows();
    if (visibleWindows.length === 0) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - 100; // Account for header

    const windowHeight = viewportHeight;
    const windowWidth = Math.floor(viewportWidth / visibleWindows.length);

    // Update all windows at once
    const updates = {};
    visibleWindows.forEach((window, index) => {
      const x = index * windowWidth;
      const y = 60; // Add offset for header

      updates[window.id] = {
        ...windowStatesRef.current[window.id],
        x,
        y,
        width: windowWidth,
        height: windowHeight,
        isMaximized: false,
      };
    });

    setWindowStates((prev) => ({
      ...prev,
      ...updates,
    }));
  }, [getVisibleWindows]);

  /**
   * Arranges windows vertically (stacked)
   */
  const tileWindowsVertically = useCallback(() => {
    const visibleWindows = getVisibleWindows();
    if (visibleWindows.length === 0) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - 100; // Account for header

    const windowWidth = viewportWidth;
    const windowHeight = Math.floor(viewportHeight / visibleWindows.length);

    // Update all windows at once
    const updates = {};
    visibleWindows.forEach((window, index) => {
      const x = 0;
      const y = 60 + index * windowHeight; // Add offset for header

      updates[window.id] = {
        ...windowStatesRef.current[window.id],
        x,
        y,
        width: windowWidth,
        height: windowHeight,
        isMaximized: false,
      };
    });

    setWindowStates((prev) => ({
      ...prev,
      ...updates,
    }));
  }, [getVisibleWindows]);

  /**
   * Arranges windows in a cascading pattern
   */
  const cascadeWindows = useCallback(() => {
    const visibleWindows = getVisibleWindows();
    if (visibleWindows.length === 0) return;

    const offset = 30; // Offset for each cascaded window
    const startX = 50;
    const startY = 80; // Account for header

    // Sort windows by z-index order for natural cascade
    const sortedWindows = [...visibleWindows].sort(
      (a, b) => zIndexOrder.indexOf(a.id) - zIndexOrder.indexOf(b.id),
    );

    // Update all windows at once
    const updates = {};
    sortedWindows.forEach((window, index) => {
      updates[window.id] = {
        ...windowStatesRef.current[window.id],
        x: startX + index * offset,
        y: startY + index * offset,
        width: 600, // Default width
        height: 500, // Default height
        isMaximized: false,
      };
    });

    setWindowStates((prev) => ({
      ...prev,
      ...updates,
    }));
  }, [getVisibleWindows, zIndexOrder]);

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
  };
}
