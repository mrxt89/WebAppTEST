// BOMViewer/hooks/useBOMDragDrop.js
import { useCallback } from "react";
// Don't import useBOMViewer here to avoid circular dependencies

export const createBOMDragDropHook = (dependencies) => {
  const {
    selectedBomId,
    addComponent,
    reorderBOMComponents,
    setLoading,
    toast,
  } = dependencies;

  // Handle dropping a component from the reference panel
  const handleDrop = useCallback(
    async (droppedItem) => {
      if (!selectedBomId) {
        toast({
          title: "Error",
          description: "No BOM selected for component addition",
          variant: "destructive",
        });
        return;
      }

      try {
        setLoading(true);

        // Determine the type of dropped item
        const itemType = droppedItem.type;
        const itemData = droppedItem.data;

        if (itemType === "component") {
          // Prepare component data for addition
          const componentData = {
            ComponentCode: itemData.Component || itemData.ComponentCode,
            ComponentType: itemData.ComponentType || 7798784, // Default to Article
            Quantity: itemData.Quantity || 1,
            UoM: itemData.UoM || "PZ",
            Details: itemData.Description || "Component",
            ImportBOM: true, // Automatically import BOM if available
            ProcessMultilevelBOM: true,
            MaxLevels: 5,
          };

          // Call addComponent function to add the component
          await addComponent(componentData);

          toast({
            title: "Component added",
            description: "Component successfully added to the BOM",
            variant: "success",
          });
        } else if (itemType === "bom") {
          // If a full BOM was dropped, add its root component
          if (itemData.Components && itemData.Components.length > 0) {
            // Add the BOM's root component
            const componentData = {
              ComponentCode: itemData.BOM,
              ComponentType: 7798784, // Article
              Quantity: 1,
              UoM: itemData.UoM || "PZ",
              Details: itemData.Description || "BOM",
              ImportBOM: true,
              ProcessMultilevelBOM: true,
              MaxLevels: 5,
            };

            await addComponent(componentData);

            toast({
              title: "BOM added",
              description: "BOM successfully added as a component",
              variant: "success",
            });
          } else {
            toast({
              title: "Empty BOM",
              description: "The selected BOM contains no components",
              variant: "warning",
            });
          }
        }
      } catch (error) {
        console.error("Error handling drop:", error);
        toast({
          title: "Error",
          description:
            error.message || "An error occurred while adding the component",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [selectedBomId, addComponent, setLoading, toast],
  );

  // Reorder components function
  const reorderComponents = useCallback(
    async (componentIds) => {
      if (
        !selectedBomId ||
        !Array.isArray(componentIds) ||
        componentIds.length === 0
      ) {
        return;
      }

      // Verify that reorderBOMComponents is defined
      if (!reorderBOMComponents) {
        console.error(
          "reorderBOMComponents function is not defined in context",
        );
        toast({
          title: "Error",
          description: "Reorder function not available",
          variant: "destructive",
        });
        return;
      }

      try {
        setLoading(true);

        // Prepare data for reordering
        const reorderData = componentIds.map((id, index) => {
          // Extract line number from id (format: component-{componentId}-{line})
          const linePart = id.split("-")[2];
          return {
            Line: parseInt(linePart, 10),
            NewOrder: (index + 1) * 10, // Step by 10 to leave room for future insertions
          };
        });

        // Call API to reorder components
        const result = await reorderBOMComponents(selectedBomId, reorderData);

        if (result.success) {
          toast({
            title: "Components reordered",
            description: "Components were successfully reordered",
            variant: "success",
          });
        } else {
          throw new Error(result.msg || "Error reordering components");
        }
      } catch (error) {
        console.error("Error reordering components:", error);
        toast({
          title: "Error",
          description:
            error.message || "An error occurred while reordering components",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [selectedBomId, reorderBOMComponents, setLoading, toast],
  );

  // Return only plain functions, not hooks
  return {
    handleDrop,
    reorderComponents,
  };
};

// Export the factory function
export default createBOMDragDropHook;
