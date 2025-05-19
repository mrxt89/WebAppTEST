// BOMViewer/components/BOMReferencePanel/index.jsx
import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Database, Folder, ClipboardList, InfoIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ERPBOMs from "./ERPBOMs";
import ProjectBOMs from "./ProjectBOMs";
import ReferenceBOMs from "./ReferenceBOMs";
import { useBOMViewer } from "../../context/BOMViewerContext";

const BOMReferencePanel = ({ activeItem = null, setDragSettings = null }) => {
  const [activeTab, setActiveTab] = useState("erp");
  const [createTempComponent, setCreateTempComponent] = useState(false);
  const [copyBOM, setCopyBOM] = useState(false);

  // Gestore per il cambio dello stato "Crea codice temporaneo"
  const handleCreateTempChange = (checked) => {
    setCreateTempComponent(checked);
    // Se disattiviamo "Crea codice temporaneo", disattiviamo anche "Copia distinta"
    if (!checked) {
      setCopyBOM(false);
    }

    // Aggiorna anche le impostazioni dell'elemento attualmente trascinato
    if (activeItem && setDragSettings) {
      setDragSettings({
        createTempComponent: checked,
        copyBOM: checked ? copyBOM : false,
      });
    }
  };

  // Gestore per il cambio dello stato "Copia distinta"
  const handleCopyBOMChange = (checked) => {
    setCopyBOM(checked);

    // Aggiorna anche le impostazioni dell'elemento attualmente trascinato
    if (activeItem && setDragSettings) {
      setDragSettings({
        createTempComponent,
        copyBOM: checked,
      });
    }
  };

  // Aggiornamento automatico delle impostazioni quando inizia un trascinamento
  useEffect(() => {
    if (activeItem && setDragSettings) {
      setDragSettings({
        createTempComponent,
        copyBOM,
      });
    }
  }, [activeItem, setDragSettings, createTempComponent, copyBOM]);

  // Opzioni di importazione comuni a tutte le tab
  const importOptions = {
    createTempComponent,
    copyBOM,
  };

  return (
    <div className="h-full flex flex-col">
      {/* Opzioni comuni a tutte le tab, rinnovate con tooltip e indicazioni per il drag & drop */}
      <div className="border-b p-2 space-y-2 bg-gray-50">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Opzioni Drag & Drop</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="h-4 w-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-xs">
                    Queste opzioni controllano il comportamento quando trascini
                    un componente dalla lista di riferimento sulla struttura
                    della distinta base.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Istruzioni sull'utilizzo del drag and drop - Nuova sezione */}
        <div className="bg-blue-50 rounded p-2 text-xs text-blue-700">
          <p className="font-medium mb-1">Modalità di trascinamento:</p>
          <p>
            • <strong>Area sinistra</strong>: Sostituisci il componente
          </p>
          <p>
            • <strong>Area destra</strong>: Aggiungi sotto al componente
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="createTempComponent"
            checked={createTempComponent}
            onCheckedChange={handleCreateTempChange}
            className="bg-primary"
          />
          <Label
            htmlFor="createTempComponent"
            className="text-sm cursor-pointer"
          >
            Crea codice temporaneo
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="copyBOM"
            checked={copyBOM}
            disabled={!createTempComponent}
            onCheckedChange={handleCopyBOMChange}
            className={!createTempComponent ? "bg-primary" : "bg-primary"}
          />
          <Label
            htmlFor="copyBOM"
            className={`text-sm cursor-pointer ${!createTempComponent ? "text-gray-400" : ""}`}
          >
            Copia distinta
          </Label>
        </div>

        {/* Informazioni sul componente attualmente trascinato */}
        {activeItem && (
          <div className="px-2 py-2 bg-blue-50 rounded text-xs text-blue-700 mt-1">
            <p className="font-medium">Trascinamento attivo</p>
            <p>
              Stai trascinando:{" "}
              {activeItem.data?.BOM ||
                activeItem.data?.ItemCode ||
                "Componente"}
            </p>
          </div>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <div className="border-b px-4">
          <TabsList className="w-full">
            <TabsTrigger
              value="erp"
              className="flex-1 flex items-center justify-center"
            >
              <Database className="h-4 w-4 mr-2" />
              ERP
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="flex-1 flex items-center justify-center"
            >
              <Folder className="h-4 w-4 mr-2" />
              Progetti
            </TabsTrigger>
            <TabsTrigger
              value="reference"
              className="flex-1 flex items-center justify-center"
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Riferimenti
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="erp" className="flex-1 p-0 m-0 overflow-hidden">
          <ERPBOMs importOptions={importOptions} />
        </TabsContent>

        <TabsContent
          value="projects"
          className="flex-1 p-0 m-0 overflow-hidden"
        >
          <ProjectBOMs importOptions={importOptions} />
        </TabsContent>

        <TabsContent
          value="reference"
          className="flex-1 p-0 m-0 overflow-hidden"
        >
          <ReferenceBOMs importOptions={importOptions} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BOMReferencePanel;
