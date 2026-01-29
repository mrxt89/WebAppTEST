// BOMViewer/components/BOMDetailPanel/TabSummary.jsx
import React from "react";
import { useBOMViewer } from "../../context/BOMViewerContext";
import BOMCostingSummary from "./BOMCostingSummary";

const TabSummary = () => {
  const { bom } = useBOMViewer();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-6 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Riepilogo Distinta Base</h3>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
        <BOMCostingSummary
          bomId={bom?.Id}
          bomCode={bom?.BOM}
          bomVersion={bom?.Version}
        />
      </div>
    </div>
  );
};

export default TabSummary;
