// BOMViewer/components/BOMDetailPanel/TabDocuments.jsx
import React, { useState, useEffect } from "react";
import { useBOMViewer } from "../../context/BOMViewerContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileBox, Cloud } from "lucide-react";
import BOMItemAttachments from "@/components/itemAttachments/BOMItemAttachments";

const TabDocuments = () => {
  const { editMode, selectedNode, bom, item } = useBOMViewer();

  const [activeTab, setActiveTab] = useState("item");

  // Determinare quale item visualizzare
  // - Se è selezionato un nodo, mostra gli allegati del componente selezionato
  // - Altrimenti, mostra gli allegati dell'articolo principale
  const targetItem = selectedNode?.data || item;

  // Reset della tab quando cambia il nodo selezionato
  useEffect(() => {
    setActiveTab("item");
  }, [selectedNode]);

  // Determina se l'articolo è da ERP o dal sistema progetti
  const isFromERP =
    selectedNode?.data?.IsErpItem || targetItem?.stato_erp === 1;

  // Ottieni il codice o l'ID appropriato per l'articolo
  const itemCode = isFromERP
    ? targetItem?.Item || targetItem?.ComponentItemCode
    : null;
  const projectItemId = !isFromERP
    ? targetItem?.Id || targetItem?.ComponentId
    : null;

  // Nome visualizzato dell'articolo o componente
  const displayName = selectedNode?.data
    ? selectedNode.data.ComponentItemCode ||
      selectedNode.data.Item ||
      "(Senza nome)"
    : item?.Item || "(Articolo principale)";

  // Flag che indica se stiamo visualizzando un componente della distinta
  const isComponentItem = !!selectedNode;

  return (
    <div className="h-full flex flex-col">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <TabsContent value="item" className="flex-1 p-0 m-0 overflow-auto">
          {/* Mostra gli allegati dell'articolo o componente */}
          <div className="p-4 h-full">
            <BOMItemAttachments
              itemCode={itemCode}
              projectItemId={projectItemId}
              readOnly={!editMode}
              isComponentItem={isComponentItem}
              componentName={displayName}
              compact={true}
            />
          </div>
        </TabsContent>

        <TabsContent value="bom" className="flex-1 p-0 m-0 overflow-auto">
          {/* Mostra gli allegati della distinta (se implementato in futuro) */}
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8 max-w-md">
              <Cloud className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">
                Allegati della Distinta Base
              </h3>
              <p className="text-sm text-gray-500">
                Gli allegati associati direttamente alla distinta base non sono
                ancora supportati in questa versione. Saranno implementati in un
                futuro aggiornamento.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TabDocuments;
