// BOMViewer/components/BOMDetailPanel/index.jsx
import React from "react";
import { useBOMViewer } from "../../context/BOMViewerContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Layers, FileText, BarChart, Settings } from "lucide-react";
import TabComposition from "./TabComposition";
import TabSummary from "./TabSummary";
import TabDocuments from "./TabDocuments";
import CyclesTab from "./CyclesTab"; // Importa il nuovo componente

const BOMDetailPanel = () => {
  const { activeTab, setActiveTab, selectedNode } = useBOMViewer();

  return (
    <div className="h-full flex flex-col">
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
      </Tabs>
    </div>
  );
};

export default BOMDetailPanel;
