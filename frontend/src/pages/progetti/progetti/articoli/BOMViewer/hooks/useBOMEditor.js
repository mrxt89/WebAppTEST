// BOMViewer/hooks/useBOMEditor.js
import { useCallback } from 'react';
// Don't import useBOMViewer here to avoid circular dependencies

export const createBOMEditorHook = (dependencies) => {
  const {
    selectedBomId,
    setLoading,
    addUpdateBOM,
    loadBOMData,
    toast
  } = dependencies;
  
  // Add a component to the BOM
  const addComponent = useCallback(async (componentData) => {
    if (!selectedBomId) {
      toast({
        title: "Error",
        description: "No BOM selected",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const result = await addUpdateBOM('ADD_COMPONENT', {
        Id: selectedBomId,
        ...componentData
      });
      
      if (result.success) {
        toast({
          title: "Component added",
          description: "The component has been added successfully",
          variant: "success"
        });
        
        // Reload BOM data
        await loadBOMData();
      } else {
        throw new Error(result.msg || "Error adding the component");
      }
    } catch (error) {
      console.error('Error adding component:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while adding the component",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedBomId, addUpdateBOM, setLoading, loadBOMData, toast]);
  
  // Update a component
  const updateComponent = useCallback(async (line, componentData) => {
    if (!selectedBomId) {
      toast({
        title: "Error",
        description: "No BOM selected",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const result = await addUpdateBOM('UPDATE_COMPONENT', {
        Id: selectedBomId,
        Line: line,
        ...componentData
      });
      
      if (result.success) {
        toast({
          title: "Component updated",
          description: "The component has been updated successfully",
          variant: "success"
        });
        
        // Reload BOM data
        await loadBOMData();
      } else {
        throw new Error(result.msg || "Error updating the component");
      }
    } catch (error) {
      console.error('Error updating component:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while updating the component",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedBomId, addUpdateBOM, setLoading, loadBOMData, toast]);
  
  // Delete a component
  const deleteComponent = useCallback(async (line) => {
    if (!selectedBomId) {
      toast({
        title: "Error",
        description: "No BOM selected",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const result = await addUpdateBOM('DELETE_COMPONENT', {
        Id: selectedBomId,
        Line: line
      });
      
      if (result.success) {
        toast({
          title: "Component deleted",
          description: "The component has been deleted successfully",
          variant: "success"
        });
        
        // Reload BOM data
        await loadBOMData();
      } else {
        throw new Error(result.msg || "Error deleting the component");
      }
    } catch (error) {
      console.error('Error deleting component:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while deleting the component",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedBomId, addUpdateBOM, setLoading, loadBOMData, toast]);
  
  // Add a routing step
  const addRouting = useCallback(async (routingData) => {
    if (!selectedBomId) {
      toast({
        title: "Error",
        description: "No BOM selected",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const result = await addUpdateBOM('ADD_ROUTING', {
        Id: selectedBomId,
        ...routingData
      });
      
      if (result.success) {
        toast({
          title: "Routing added",
          description: "The routing step has been added successfully",
          variant: "success"
        });
        
        // Reload BOM data
        await loadBOMData();
      } else {
        throw new Error(result.msg || "Error adding the routing step");
      }
    } catch (error) {
      console.error('Error adding routing:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while adding the routing step",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedBomId, addUpdateBOM, setLoading, loadBOMData, toast]);
  
  // Update a routing step
  const updateRouting = useCallback(async (rtgStep, routingData) => {
    if (!selectedBomId) {
      toast({
        title: "Error",
        description: "No BOM selected",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const result = await addUpdateBOM('UPDATE_ROUTING', {
        Id: selectedBomId,
        RtgStep: rtgStep,
        ...routingData
      });
      
      if (result.success) {
        toast({
          title: "Routing updated",
          description: "The routing step has been updated successfully",
          variant: "success"
        });
        
        // Reload BOM data
        await loadBOMData();
      } else {
        throw new Error(result.msg || "Error updating the routing step");
      }
    } catch (error) {
      console.error('Error updating routing:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while updating the routing step",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedBomId, addUpdateBOM, setLoading, loadBOMData, toast]);
  
  // Delete a routing step
  const deleteRouting = useCallback(async (rtgStep) => {
    if (!selectedBomId) {
      toast({
        title: "Error",
        description: "No BOM selected",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const result = await addUpdateBOM('DELETE_ROUTING', {
        Id: selectedBomId,
        RtgStep: rtgStep
      });
      
      if (result.success) {
        toast({
          title: "Routing deleted",
          description: "The routing step has been deleted successfully",
          variant: "success"
        });
        
        // Reload BOM data
        await loadBOMData();
      } else {
        throw new Error(result.msg || "Error deleting the routing step");
      }
    } catch (error) {
      console.error('Error deleting routing:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while deleting the routing step",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedBomId, addUpdateBOM, setLoading, loadBOMData, toast]);
  
  // Return only plain functions, not hooks
  return {
    addComponent,
    updateComponent,
    deleteComponent,
    addRouting,
    updateRouting,
    deleteRouting
  };
};

// Export the factory function
export default createBOMEditorHook;