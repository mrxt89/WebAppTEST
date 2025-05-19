// BOMViewer/index.jsx - Aggiornato con supporto drag and drop migliorato

import React, { useRef } from "react";
import { BOMViewerProvider } from "./context/BOMViewerContext";
import DndContextProvider from "./components/DndContextProvider";
import BOMHeader from "./components/BOMHeader";
import BOMTreeView from "./components/BOMTreeView";
import BOMDetailPanel from "./components/BOMDetailPanel";
import BOMReferencePanel from "./components/BOMReferencePanel";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

/**
 * BOMViewer - Componente principale per la visualizzazione e modifica delle distinte base
 * @param {Object} item - Oggetto contenente i dati dell'articolo selezionato
 * @param {Object} project - Oggetto contenente i dati del progetto
 * @param {boolean} canEdit - Flag che indica se l'utente ha i permessi di modifica
 * @param {Function} onRefresh - Callback da chiamare quando è necessario aggiornare i dati
 */
const BOMViewer = ({ item, project, canEdit = false, onRefresh }) => {
  // Ref per tracciare l'ultimo item renderizzato e prevenire re-render inutili
  const lastItemIdRef = useRef(null);

  // Preveni il rendering se non c'è un item selezionato
  if (!item?.Id) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center border rounded-md">
        <div>
          <h3 className="text-lg font-medium mb-2">
            Nessun articolo selezionato
          </h3>
          <p className="text-gray-500">
            Seleziona un articolo per visualizzare la distinta base
          </p>
        </div>
      </div>
    );
  }

  // Genera una key basata sull'ID dell'item - IMPORTANTE per forzare il reset del provider
  // quando cambia completamente l'item
  const providerKey = `bom-viewer-${item.Id}`;

  // Aggiorna il riferimento all'ultimo item
  lastItemIdRef.current = item.Id;

  return (
    <BOMViewerProvider
      key={providerKey}
      item={item}
      project={project}
      canEdit={canEdit}
      onRefresh={onRefresh}
    >
      <DndContextProvider>
        {({
          draggingOver,
          dropTarget,
          dropMode,
          activeItem,
          setDragSettings,
        }) => (
          <div className="flex flex-col h-full border rounded-md overflow-hidden">
            {/* Header con codice BOM, descrizione e selettore versione */}
            <BOMHeader />

            {/* Area principale con 3 pannelli ridimensionabili */}
            <ResizablePanelGroup direction="horizontal" className="flex-1">
              {/* Pannello sinistro - Vista ad albero (struttura BOM) */}
              <ResizablePanel defaultSize={30} minSize={30} maxSize={40}>
                <div className="h-full overflow-auto border-r">
                  <BOMTreeView
                    draggingOver={draggingOver}
                    dropTarget={dropTarget}
                    dropMode={dropMode}
                  />
                </div>
              </ResizablePanel>

              {/* Pannello centrale - Vista dettagli con schede */}
              <ResizablePanel defaultSize={50}>
                <div className="h-full overflow-auto border-r">
                  <BOMDetailPanel />
                </div>
              </ResizablePanel>

              {/* Pannello destro - BOM di riferimento */}
              <ResizablePanel defaultSize={20} minSize={20} maxSize={20}>
                <div className="h-full overflow-auto">
                  <BOMReferencePanel
                    activeItem={activeItem}
                    setDragSettings={setDragSettings}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}
      </DndContextProvider>
    </BOMViewerProvider>
  );
};

// Ottimizzazione per prevenire re-render inutili
export default React.memo(BOMViewer, (prevProps, nextProps) => {
  // Re-render solo se l'ID dell'item è cambiato
  return prevProps.item?.Id === nextProps.item?.Id;
});
