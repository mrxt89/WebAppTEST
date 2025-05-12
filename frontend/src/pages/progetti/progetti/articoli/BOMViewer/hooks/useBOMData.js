// BOMViewer/hooks/useBOMData.js - Fixed version with better routing handling
import { useCallback } from 'react';

// Factory function for creating the BOM data hook with the given dependencies
export const createBOMDataHook = (dependencies) => {
  const {
    selectedBomId,
    setLoading,
    setBom,
    setBomComponents,
    setBomRouting,
    getBOMData
  } = dependencies;
  
  // Load multilevel BOM data
  const loadMultilevelBOM = useCallback(async (options = {}) => {
    if (!selectedBomId) return null;
    
    try {
      setLoading(true);
      
      // Default options
      const mergedOptions = {
        maxLevel: 10,
        includeRouting: true,
        expandPhantoms: true,
        ...options
      };
      
      const data = await getBOMData(
        'GET_BOM_MULTILEVEL',
        selectedBomId, 
        null, // itemId
        null, // version
        mergedOptions
      );
      
      console.log("loadMultilevelBOM data received:", data);
      
      // Process and update state with the data
      if (data) {
        // Update components array
        if (data.components && Array.isArray(data.components)) {
          console.log(`Setting ${data.components.length} components from data.components`);
          setBomComponents(data.components);
        } else if (Array.isArray(data)) {
          console.log(`Setting ${data.length} components from direct array`);
          setBomComponents(data);
        }
        
        // Update routing array - now with the correct structure
        if (data.routing && Array.isArray(data.routing)) {
          console.log(`Setting ${data.routing.length} routing entries`);
          // Process routing data to ensure it has the proper structure
          const processedRouting = data.routing.map(route => ({
            ...route,
            // Make sure BOMId is present for correct matching
            BOMId: route.BOMId || selectedBomId
          }));
          setBomRouting(processedRouting);
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error loading BOM data:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [selectedBomId, getBOMData, setLoading, setBomComponents, setBomRouting]);
  
  // Load BOM components and routing data with full details
  const loadBOMData = useCallback(async (action = 'GET_BOM_FULL', options = {}) => {
    if (!selectedBomId) return;
    
    try {
      setLoading(true);
      
      const data = await getBOMData(
        action,
        selectedBomId,
        null, // itemId
        null, // version
        options
      );
      
      console.log("loadBOMData received:", data);
      
      if (data) {
        // Update header if available
        if (data.header) {
          setBom(data.header);
        }
        
        // Update components
        if (action === 'GET_BOM_FULL') {
          if (Array.isArray(data.components)) {
            setBomComponents(data.components);
          }
          
          if (Array.isArray(data.routing)) {
            // Process routing data to ensure correct BOMId is set
            const processedRouting = data.routing.map(route => ({
              ...route,
              BOMId: route.BOMId || selectedBomId
            }));
            setBomRouting(processedRouting);
          }
        } else if (action === 'GET_BOM_MULTILEVEL') {
          // For multilevel, handle components array which might be directly in data
          if (data.components && Array.isArray(data.components)) {
            setBomComponents(data.components);
          } else if (Array.isArray(data)) {
            setBomComponents(data);
          }
          
          // And handle routing which might be in data.routing
          if (data.routing && Array.isArray(data.routing)) {
            // Process routing data to ensure correct BOMId is set
            const processedRouting = data.routing.map(route => ({
              ...route,
              BOMId: route.BOMId || selectedBomId
            }));
            setBomRouting(processedRouting);
          }
        }
      }
    } catch (error) {
      console.error('Error loading BOM data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedBomId, getBOMData, setLoading, setBom, setBomComponents, setBomRouting]);
  
  // Return the functions that will be available
  return {
    loadMultilevelBOM,
    loadBOMData
  };
};

export default createBOMDataHook;