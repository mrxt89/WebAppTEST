import React, { useRef, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ArrowDownUp, Layers, Settings } from 'lucide-react';
import { swal } from '@/lib/common';

// Context and hooks
import { useBOMViewer } from './BOMViewerContext';
import { useBOMData } from './BOMhooks/useBOMData';
import { useBOMDragDrop } from './BOMhooks/useBOMDragDrop';
import { useBOMEdit } from './BOMhooks/useBOMEdit';
import { useBOMRouting } from './BOMhooks/useBOMRouting'; // Import the routing hook

// Components
import BOMHeader from './components/BOMHeader';
import ComponentsTab from './components/BOMTabs/ComponentsTab';
import RoutingTab from './components/BOMTabs/RoutingTab';
import PropertiesTab from './components/BOMTabs/PropertiesTab';
import EmptyBOMState from './components/BOMEmptyState';
import BOMSidebar from './components/BOMSidebar';
import BOMCreationDialog from './components/BOMCreationDialog';

// DnD Kit Provider
import { DndContextProvider } from './components/DragDrop';

// Consumer component that manages UI logic
export const BOMViewerConsumer = () => {
  const {
    bom,
    editMode,
    selectedTab,
    setSelectedTab,
    showCreateDialog,
    setShowCreateDialog,
    selectedBomId,
    item,
    canEdit,
    loading,
    setComponentDragging,
    magonBOMs,
    referenceBOMs
  } = useBOMViewer();

  // Use the various hooks that manage logic
  const { loadAvailableBOMs, loadBomDetails, loadMagonBOMs, loadReferenceBOMs } = useBOMData();
  const { handleCreateBOM } = useBOMEdit();
  
  // Initialize the routing hook (this makes it available to the RoutingTab)
  useBOMRouting();

  const scrollAreaRef = useRef(null);

  // Load data on startup
  useEffect(() => {
    if (item && item.Id) {
      loadAvailableBOMs();
      
      // Carica anche i dati delle sezioni laterali
      loadMagonBOMs();
      loadReferenceBOMs();
    }
  }, [item, loadAvailableBOMs, loadMagonBOMs, loadReferenceBOMs]);

  // Load details when a BOM is selected
  useEffect(() => {
    if (selectedBomId) {
      loadBomDetails();
    }
  }, [selectedBomId, loadBomDetails]);

  useEffect(() => {
    if (selectedTab === 'routing' && selectedBomId) {
      // Carica esplicitamente i dati dei cicli quando si passa alla tab
      loadBomDetails();
    }
  }, [selectedTab, selectedBomId, loadBomDetails]);

  // If there's no data, show "no article selected" message
  if (!item) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-gray-500">Seleziona un articolo per visualizzarne la distinta base</span>
      </div>
    );
  }

  return (
    <DndContextProvider>
      <div className="flex h-full">
        {/* Main panel (2/3 of space) */}
        <div className="w-2/3 border-r h-full flex flex-col">
          <BOMHeader />
          
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          )}
          
          {bom ? (
            <Tabs 
              value={selectedTab} 
              onValueChange={setSelectedTab}
              className="flex-1"
            >
              <div className="px-4 pt-2 border-b">
                <TabsList>
                  <TabsTrigger value="components">
                    <Package className="h-4 w-4 mr-2" />
                    Componenti
                  </TabsTrigger>
                  <TabsTrigger value="routing">
                    <ArrowDownUp className="h-4 w-4 mr-2" />
                    Cicli
                  </TabsTrigger>
                  {editMode && (
                    <TabsTrigger value="properties">
                      <Settings className="h-4 w-4 mr-2" />
                      Proprietà
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <TabsContent value="components" className="flex-1 p-0 m-0 overflow-hidden">
                <ComponentsTab scrollAreaRef={scrollAreaRef} />
              </TabsContent>

              <TabsContent value="routing" className="flex-1 p-0 m-0 overflow-hidden">
                <RoutingTab />
              </TabsContent>

              {editMode && (
                <TabsContent value="properties" className="flex-1 p-0 m-0 overflow-hidden">
                  <PropertiesTab />
                </TabsContent>
              )}
            </Tabs>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyBOMState canEdit={canEdit} />
            </div>
          )}
        </div>
        
        {/* Side panel */}
        <BOMSidebar />
      </div>
      
      {/* Dialog for BOM creation */}
      <BOMCreationDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        item={item}
        onConfirm={handleCreateBOM}
      />
    </DndContextProvider>
  );
};

export default BOMViewerConsumer;