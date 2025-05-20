// BOMViewer/components/BOMReferencePanel/DragOptions.jsx
import React, { useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon, Replace, ArrowDown } from "lucide-react";

/**
 * Componente che mostra le opzioni per il drag and drop
 * Permette all'utente di scegliere se creare un codice temporaneo
 * e se copiare la distinta del componente trascinato.
 */
const DragOptions = ({
  createTempComponent = false,
  setCopyBOM,
  copyBOM = false,
  setCreateTempComponent,
  activeItem = null,
  setDragSettings = null,
}) => {
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

  return (
    <div className="border-b p-2 space-y-3 bg-gray-50">
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
                  Queste opzioni controllano il comportamento quando trascini un
                  componente dalla lista di riferimento sulla struttura della
                  distinta base.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Istruzioni sull'utilizzo del drag and drop */}
      <div className="bg-blue-50 rounded p-2 text-xs text-blue-700">
        <p className="flex items-center gap-1 font-medium mb-1">
          <Replace className="h-3.5 w-3.5" />
          <span>Rilascia a sinistra per sostituire</span>
        </p>
        <p className="flex items-center gap-1 font-medium">
          <ArrowDown className="h-3.5 w-3.5" />
          <span>Rilascia a destra per aggiungere sotto</span>
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="createTempComponent"
          checked={createTempComponent}
          onCheckedChange={handleCreateTempChange}
          className="bg-primary"
        />
        <Label htmlFor="createTempComponent" className="text-sm cursor-pointer">
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

      {activeItem && (
        <div className="px-2 py-2 bg-blue-50 rounded text-xs text-blue-700 mt-1">
          <p className="font-medium">Trascinamento attivo</p>
          <p>
            Stai trascinando:{" "}
            {activeItem.data?.BOM || activeItem.data?.ItemCode || "Componente"}
          </p>
        </div>
      )}
    </div>
  );
};

export default DragOptions;
