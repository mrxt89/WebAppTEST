import { useCallback, useState } from "react";
import { useBOMViewer } from "../context/BOMViewerContext";
import { useBOMData } from "./useBOMData";
import { toast } from "@/components/ui/use-toast";
import { swal } from "@/lib/common";
import useProjectArticlesActions from "@/hooks/useProjectArticlesActions";

export const useBOMRouting = () => {
  const { selectedBomId, bomRouting, setBomRouting, setLoading, addUpdateBOM } =
    useBOMViewer();

  // Import the useBOMData hook to access loadBomDetails
  const { loadBOMData } = useBOMData();

  // Import hook with API functions
  const {
    getWorkCenters: apiGetWorkCenters,
    getOperations: apiGetOperations,
    getSuppliers: apiGetSuppliers,
  } = useProjectArticlesActions();

  // State for workcenters, operations, and suppliers loaded from DB
  const [workCenters, setWorkCenters] = useState([]);
  const [operations, setOperations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load master data for dropdowns
  const loadMasterData = useCallback(async () => {
    if (dataLoaded) return { workCenters, operations, suppliers };

    try {
      setLoading(true);

      // Use functions from useProjectArticlesActions hook
      const [wcData, opData, suppData] = await Promise.all([
        apiGetWorkCenters(),
        apiGetOperations(),
        apiGetSuppliers(),
      ]);

      setWorkCenters(wcData || []);
      setOperations(opData || []);
      setSuppliers(suppData || []);
      setDataLoaded(true);

      return {
        workCenters: wcData || [],
        operations: opData || [],
        suppliers: suppData || [],
      };
    } catch (error) {
      console.error("Error loading master data:", error);
      toast({
        title: "Error",
        description: "Unable to load reference data for cycles",
        variant: "destructive",
      });
      return { workCenters: [], operations: [], suppliers: [] };
    } finally {
      setLoading(false);
    }
  }, [
    dataLoaded,
    workCenters,
    operations,
    suppliers,
    setLoading,
    apiGetWorkCenters,
    apiGetOperations,
    apiGetSuppliers,
  ]);

  // Add a new routing step - now using BOMId as the main reference
  const handleAddRouting = useCallback(
    async (routingData) => {
      if (!selectedBomId) {
        console.error("No BOM ID available");
        return;
      }

      try {
        setLoading(true);

        // Find the next available RtgStep if not provided
        if (!routingData.RtgStep) {
          const maxStep = bomRouting.reduce(
            (max, step) => (step.RtgStep > max ? step.RtgStep : max),
            0,
          );
          routingData.RtgStep = maxStep + 10; // Usually step by 10
        }

        // IMPORTANT: Include BOMId in the routing data
        const result = await addUpdateBOM("ADD_ROUTING", {
          Id: selectedBomId,
          ...routingData,
        });

        if (result && result.success) {
          // Reload BOM details
          await loadBOMData("GET_BOM_FULL");

          toast({
            title: "Phase added",
            description: "Cycle phase added successfully",
            variant: "success",
          });

          return result;
        } else {
          throw new Error((result && result.msg) || "Error adding the phase");
        }
      } catch (error) {
        console.error("Error adding routing step:", error);

        toast({
          title: "Error",
          description:
            error.message || "An error occurred while adding the phase",
          variant: "destructive",
        });

        return { success: false, error: error.message };
      } finally {
        setLoading(false);
      }
    },
    [selectedBomId, bomRouting, setLoading, addUpdateBOM, loadBOMData],
  );

  // Update an existing routing step
  const handleUpdateRouting = useCallback(
    async (rtgStep, routingData) => {
      if (!selectedBomId || !rtgStep) {
        console.error("Missing required parameters");
        return;
      }

      try {
        setLoading(true);

        // IMPORTANT: Include BOMId in the routing data
        const result = await addUpdateBOM("UPDATE_ROUTING", {
          Id: selectedBomId,
          RtgStep: rtgStep,
          ...routingData,
        });

        if (result && result.success) {
          // Reload BOM details
          await loadBOMData("GET_BOM_FULL");

          toast({
            title: "Phase updated",
            description: "Cycle phase updated successfully",
            variant: "success",
          });

          return result;
        } else {
          throw new Error((result && result.msg) || "Error updating the phase");
        }
      } catch (error) {
        console.error("Error updating routing step:", error);

        toast({
          title: "Error",
          description:
            error.message || "An error occurred while updating the phase",
          variant: "destructive",
        });

        return { success: false, error: error.message };
      } finally {
        setLoading(false);
      }
    },
    [selectedBomId, setLoading, addUpdateBOM, loadBOMData],
  );

  // Delete a routing step
  const handleDeleteRouting = useCallback(
    async (rtgStep) => {
      if (!selectedBomId || !rtgStep) {
        console.error("Missing required parameters");
        return;
      }

      try {
        // Ask for confirmation before deleting
        const confirmation = await swal.fire({
          title: "Are you sure?",
          text: "This action will delete the selected cycle phase",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes, delete",
          cancelButtonText: "Cancel",
        });

        if (!confirmation.isConfirmed) return;

        setLoading(true);

        const result = await addUpdateBOM("DELETE_ROUTING", {
          Id: selectedBomId,
          RtgStep: rtgStep,
        });

        if (result && result.success) {
          // Reload BOM details
          await loadBOMData("GET_BOM_FULL");

          toast({
            title: "Phase deleted",
            description: "Cycle phase deleted successfully",
            variant: "success",
          });

          return result;
        } else {
          throw new Error((result && result.msg) || "Error deleting the phase");
        }
      } catch (error) {
        console.error("Error deleting routing step:", error);

        toast({
          title: "Error",
          description:
            error.message || "An error occurred while deleting the phase",
          variant: "destructive",
        });

        return { success: false, error: error.message };
      } finally {
        setLoading(false);
      }
    },
    [selectedBomId, setLoading, addUpdateBOM, loadBOMData],
  );

  // Reorder routing steps
  const handleReorderRouting = useCallback(
    async (steps) => {
      if (!selectedBomId || !Array.isArray(steps) || steps.length === 0) {
        console.error("Missing required parameters for reordering");
        return;
      }

      try {
        setLoading(true);

        // First, create a backup of current steps
        const currentSteps = [...bomRouting];

        // Update local state for immediate feedback
        const newRouting = steps.map((step, index) => ({
          ...step,
          RtgStep: (index + 1) * 10, // Standardize step numbering in increments of 10
          BOMId: selectedBomId, // Ensure BOMId is set correctly
        }));

        setBomRouting(newRouting);

        // Sequentially update each step
        let success = true;
        for (const step of newRouting) {
          const result = await addUpdateBOM("UPDATE_ROUTING", {
            Id: selectedBomId,
            RtgStep: step.originalRtgStep || step.RtgStep,
            ...step,
            RtgStep: step.RtgStep, // New step number
          });

          if (!result || !result.success) {
            success = false;
            break;
          }
        }

        if (success) {
          // Final reload to ensure sync
          await loadBOMData("GET_BOM_FULL");

          toast({
            title: "Cycles reordered",
            description: "The cycle phases have been reordered successfully",
            variant: "success",
          });
        } else {
          // Restore original state on failure
          setBomRouting(currentSteps);
          throw new Error("Error reordering phases");
        }
      } catch (error) {
        console.error("Error reordering routing steps:", error);

        toast({
          title: "Error",
          description:
            error.message || "An error occurred while reordering phases",
          variant: "destructive",
        });

        // Make sure to reload to restore correct state
        await loadBOMData("GET_BOM_FULL");
      } finally {
        setLoading(false);
      }
    },
    [
      selectedBomId,
      bomRouting,
      setBomRouting,
      setLoading,
      addUpdateBOM,
      loadBOMData,
    ],
  );

  return {
    loadMasterData,
    handleAddRouting,
    handleUpdateRouting,
    handleDeleteRouting,
    handleReorderRouting,
    workCenters,
    operations,
    suppliers,
    dataLoaded,
  };
};
