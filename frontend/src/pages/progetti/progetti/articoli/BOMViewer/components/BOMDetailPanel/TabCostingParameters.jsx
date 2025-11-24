// BOMViewer/components/BOMDetailPanel/TabCostingParameters.jsx
import React from "react";
import { useBOMViewer } from "../../context/BOMViewerContext";
import { useCompany } from "@/context/CompanyContext";
import BOMCostingParameters from "./BOMCostingParameters";

const TabCostingParameters = () => {
  const { bom, loading, selectedBomId } = useBOMViewer();
  const { company } = useCompany();
  const fallbackBomId = bom?.Id || selectedBomId || null;

  if (!fallbackBomId) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Nessuna BOM selezionata</p>
      </div>
    );
  }

  if (loading && !bom?.Id) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Caricamento parametri di costificazione...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <BOMCostingParameters
        bomId={fallbackBomId}
        companyId={company?.CompanyId}
        bom={bom}
        initialParameters={{
          productionLot: bom?.ProductionLot || 1
        }}
        readOnly={false}
      />
    </div>
  );
};

export default TabCostingParameters;
