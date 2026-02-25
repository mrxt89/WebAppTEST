// BOMViewer/components/BOMDetailPanel/index.jsx
import React from "react";
import { useBOMViewer } from "../../context/BOMViewerContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Layers, FileText, BarChart, Settings, Calculator } from "lucide-react";
import TabComposition from "./TabComposition";
import TabSummary from "./TabSummary";
import TabDocuments from "./TabDocuments";
import CyclesTab from "./CyclesTab";
import TabCostingParameters from "./TabCostingParameters"; // Nuova tab parametri

const BOMDetailPanel = () => {
  const { activeTab, setActiveTab, selectedNode } = useBOMViewer();

  return (
    <div className="flex flex-col overflow-auto h-100" id="bom-detail-panel" style={{ height: "calc(100vh - 110px)" }}> 
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <div className="border-b px-4">
          <TabsList>
            <TabsTrigger value="composition" className="flex items-center">
              <Layers className="h-4 w-4 mr-2" />
              Composizione
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center">
              <BarChart className="h-4 w-4 mr-2" />
              Sommario
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Documenti
            </TabsTrigger>
            {/* Mostra la tab Cicli solo quando è selezionato un componente (non un ciclo) */}
            {selectedNode && selectedNode.type === "component" && (
              <TabsTrigger value="cycles" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Cicli
              </TabsTrigger>
            )}
            {/* Tab Parametri Costificazione - Visibile quando è selezionato il livello 0 */}
            {(!selectedNode || selectedNode.level === 0) && (
              <TabsTrigger value="costingParams" className="flex items-center">
                <Calculator className="h-4 w-4 mr-2" />
                Parametri Costing
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent
          value="composition"
          className="flex-1 p-0 m-0 overflow-auto"
        >
          <TabComposition selectedNode={selectedNode} />
        </TabsContent>

        <TabsContent value="summary" className="flex-1 p-0 m-0 overflow-auto">
          <TabSummary />
        </TabsContent>

        <TabsContent value="documents" className="flex-1 p-0 m-0 overflow-auto">
          <TabDocuments />
        </TabsContent>

        {/* Nuova tab per i cicli */}
        <TabsContent value="cycles" className="flex-1 p-0 m-0 overflow-auto">
          <CyclesTab />
        </TabsContent>

        {/* Nuova tab per i parametri di costificazione */}
        <TabsContent value="costingParams" className="flex-1 p-0 m-0 overflow-auto">
          <TabCostingParameters />
        </TabsContent>


      </Tabs>
    </div>
  );
};

export default BOMDetailPanel;
