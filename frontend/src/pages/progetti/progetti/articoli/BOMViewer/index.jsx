// BOMViewer/index.jsx - Aggiornato con supporto drag and drop migliorato e Intercompany

import React, { useRef, useState } from "react";
import { BOMViewerProvider, useBOMViewer } from "./context/BOMViewerContext";
import DndContextProvider from "./components/DndContextProvider";
import BOMHeader from "./components/BOMHeader";
import BOMTreeView from "./components/BOMTreeView";
import BOMDetailPanel from "./components/BOMDetailPanel";
import BOMReferencePanel from "./components/BOMReferencePanel";
import IntercompanySidebar from "./components/IntercompanySidebar";
import IntercompanySyncModal from "./components/IntercompanySyncModal";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import "./BOMViewer.css";

/**
 * Componente interno che ha accesso al context BOMViewer
 */
const BOMViewerContent = () => {
  const {
    item,
    bom,
    project,
    getBOMIntercompanySummary,
    syncIntercompanySharing,
    smartRefresh,
  } = useBOMViewer();

  const [intercompanySidebarCollapsed, setIntercompanySidebarCollapsed] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  return (
    <DndContextProvider>
      {({
        draggingOver,
        dropTarget,
        dropMode,
        activeItem,
        setDragSettings,
      }) => (
        <div className="flex flex-col" id="bom-viewer" style={{ height: "calc(100vh - 275px)" }}>
          {/* Header con codice BOM, descrizione e selettore versione - COMPLETAMENTE FISSO */}
          <div id="bom-header-section" className="flex-shrink-0 bg-white border-b shadow-sm">
            <BOMHeader />
          </div>

          {/* Area principale con 3 pannelli ridimensionabili + sidebar intercompany */}
          <div id="bom-main-content" className="flex-1 min-h-0 flex">
            <ResizablePanelGroup direction="horizontal">
                {/* Pannello sinistro - Vista ad albero (struttura BOM) */}
                <div className="d-grid w-25">
                  <div className="flex-col border-r" id="bom-tree-container">
                    {/* Header del pannello albero - FISSO */}
                    <div id="bom-tree-header" className="flex-shrink-0 p-1 border-b bg-gray-50">
                      <h3 className="text-sm font-medium text-gray-700">Struttura BOM</h3>
                    </div>
                    {/* Contenuto albero - SCROLLABILE INDIPENDENTE */}
                    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" id="bom-tree-content">
                      <BOMTreeView
                        draggingOver={draggingOver}
                        dropTarget={dropTarget}
                        dropMode={dropMode}
                      />
                    </div>
                  </div>
                </div>

                {/* Pannello centrale - Vista dettagli con schede */}
                <div className="d-grid w-50">
                  <div className="flex flex-col border-r" id="bom-detail-container">
                    {/* Header del pannello dettagli - FISSO */}
                    <div id="bom-detail-header" className="flex-shrink-0 p-1 border-b bg-gray-50">
                      <h3 className="text-sm font-medium text-gray-700">Dettagli Componente</h3>
                    </div>
                    {/* Contenuto dettagli - SCROLLABILE INDIPENDENTE */}
                    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" id="bom-detail-content">
                      <BOMDetailPanel />
                    </div>
                  </div>
                </div>

                {/* Pannello destro - BOM di riferimento */}
                <div className="d-grid w-25">
                  <div className="flex flex-col" id="bom-reference-container">
                    {/* Header del pannello riferimento - FISSO */}
                    <div id="bom-reference-header" className="flex-shrink-0 p-1 border-b bg-gray-50">
                      <h3 className="text-sm font-medium text-gray-700">BOM di Riferimento</h3>
                    </div>
                    {/* Contenuto riferimento - SCROLLABILE INDIPENDENTE */}
                    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" id="bom-reference-content">
                      <BOMReferencePanel
                        activeItem={activeItem}
                        setDragSettings={setDragSettings}
                      />
                    </div>
                  </div>
                </div>
              </ResizablePanelGroup>

              {/* Sidebar Intercompany */}
              <IntercompanySidebar
                bomId={bom?.Id}
                getBOMIntercompanySummary={getBOMIntercompanySummary}
                onSyncClick={() => setSyncModalOpen(true)}
                isCollapsed={intercompanySidebarCollapsed}
                onToggleCollapse={() => setIntercompanySidebarCollapsed(!intercompanySidebarCollapsed)}
              />
            </div>

            {/* Modal Sincronizzazione Intercompany */}
            <IntercompanySyncModal
              open={syncModalOpen}
              onOpenChange={setSyncModalOpen}
              bomId={bom?.Id}
              projectId={project?.ProjectID}
              getBOMIntercompanySummary={getBOMIntercompanySummary}
              syncIntercompanySharing={syncIntercompanySharing}
              onSuccess={() => smartRefresh()}
            />
          </div>
        )}
      </DndContextProvider>
    );
};

/**
 * BOMViewer - Componente wrapper esterno
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
      <BOMViewerContent />
    </BOMViewerProvider>
  );
};

// Ottimizzazione per prevenire re-render inutili
export default React.memo(BOMViewer, (prevProps, nextProps) => {
  // Re-render solo se l'ID dell'item è cambiato
  return prevProps.item?.Id === nextProps.item?.Id;
});
