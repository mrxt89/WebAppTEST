// BOMViewer/components/BOMDetailPanel/TabCostingParameters.jsx
import React from "react";
import { useBOMViewer } from "../../context/BOMViewerContext";
import { useCompany } from "@/context/CompanyContext";
import BOMCostingParameters from "./BOMCostingParameters";

const TabCostingParameters = () => {
  const { bom, canEdit } = useBOMViewer();
  const { company } = useCompany();

  if (!bom || !bom.Id) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Nessuna BOM selezionata</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <BOMCostingParameters
        bomId={bom.Id}
        companyId={company?.CompanyId}
        initialParameters={{}}
        readOnly={false}
      />
    </div>
  );
};

export default TabCostingParameters;
