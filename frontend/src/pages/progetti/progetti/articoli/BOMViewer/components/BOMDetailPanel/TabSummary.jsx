// BOMViewer/components/BOMDetailPanel/TabSummary.jsx
import React from "react";
import { useBOMViewer } from "../../context/BOMViewerContext";
import BOMCostingSummary from "./BOMCostingSummary";

const TabSummary = () => {
  const { bom } = useBOMViewer();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Riepilogo Distinta Base</h3>
      </div>

      <BOMCostingSummary
        bomId={bom?.Id}
        bomCode={bom?.BOM}
        bomVersion={bom?.Version}
      />
    </div>
  );
};

export default TabSummary;
