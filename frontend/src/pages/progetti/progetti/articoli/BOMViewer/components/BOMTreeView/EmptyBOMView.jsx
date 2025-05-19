// BOMViewer/components/BOMTreeView/EmptyBOMView.jsx
import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Package, ArrowDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBOMViewer } from "../../context/BOMViewerContext";

/**
 * Component displayed when a BOM is empty
 * Provides a drop zone for adding the first component
 */
const EmptyBOMView = () => {
  const { selectedBomId, addComponent, smartRefresh, item, editMode } =
    useBOMViewer();

  // Configure droppable area
  const { setNodeRef, isOver } = useDroppable({
    id: "empty-bom-drop-area",
    data: {
      isEmptyBOM: true,
    },
  });

  // Handle manual add component button
  const handleAddComponent = async () => {
    try {
      // Create a temporary component as the root component
      const result = await addComponent(selectedBomId, {
        createTempComponent: true,
        tempComponentPrefix: "",
        componentDescription: "Nuovo componente radice",
        quantity: 1,
        nature: 22413312, // Semilavorato
        uom: "PZ",
        importBOM: true,
      });

      if (result.success) {
        // Reload BOM data
        await smartRefresh();
      }
    } catch (error) {
      console.error("Error adding root component:", error);
    }
  };

  // Check if item is in ERP (Mago)
  const isItemInERP = item?.bomStato_erp === "1" || item?.bomStato_erp === 1;

  return (
    <div
      ref={setNodeRef}
      data-empty-bom="true"
      className={`
        h-full flex flex-col items-center justify-center p-8 
        ${isOver ? "bg-blue-50" : "bg-white"}
        ${isOver ? "border-2 border-dashed border-blue-400" : "border border-dashed border-gray-300"}
        rounded-md transition-colors duration-150
      `}
    >
      <div className="bg-blue-50 p-4 rounded-full mb-6">
        <Package className="h-12 w-12 text-blue-500" />
      </div>

      <h3 className="text-xl font-medium text-gray-700 mb-3">
        Distinta base vuota
      </h3>

      <p className="text-center text-gray-500 max-w-md mb-6">
        Questa distinta base non contiene ancora componenti.
        {editMode
          ? " Puoi aggiungere un componente manualmente o trascinarne uno dal pannello di riferimento."
          : " Puoi aggiungere componenti attivando la modalità di modifica."}
      </p>

      {editMode && (
        <div className="flex flex-col items-center gap-4">
          <Button
            onClick={handleAddComponent}
            disabled={isItemInERP}
            className="flex items-center gap-2"
            size="lg"
          >
            <Package className="h-4 w-4" />
            <span>Aggiungi componente radice</span>
          </Button>

          <div className="flex items-start gap-2 mt-2 text-blue-600 bg-blue-50 p-4 rounded">
            <ArrowDown className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm">
              <span className="font-medium">Suggerimento:</span> Puoi anche
              trascinare un componente dal pannello di riferimento sulla destra
              e rilasciarlo qui per aggiungerlo come radice della distinta.
            </p>
          </div>
        </div>
      )}

      {isItemInERP && (
        <div className="flex items-start gap-2 mt-4 text-amber-700 bg-amber-50 p-4 rounded">
          <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">
            <span className="font-medium">Nota:</span> Questo articolo è
            presente in Mago e la sua distinta non può essere modificata in
            questo sistema.
          </p>
        </div>
      )}
    </div>
  );
};

export default EmptyBOMView;
