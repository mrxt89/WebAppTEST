import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';
import CostTreeView from './CostTreeView';

/**
 * Modale per visualizzare l'albero dei costi (CostTreeView)
 * Utilizzata sia dalla tabella "Calcolo costi" che dalla scheda "Risultati"
 */
const CostTreeModal = ({ isOpen, treeData, loading, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
         style={{ overflow: 'hidden' }}
         onWheel={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-lg w-full h-[85vh] max-w-[95vw] flex flex-col shadow-xl" 
           style={{ marginTop: '50px' }}
           onWheel={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-1 border-b bg-gray-50 flex-shrink-0">
          <h2 className="text-xl font-semibold">
            Dettaglio Costi - Struttura BOM
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Caricamento dettaglio costi...</span>
            </div>
          ) : treeData ? (
            <CostTreeView costingResult={treeData} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Nessun dettaglio disponibile
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostTreeModal;
