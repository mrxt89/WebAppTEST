// BOMViewer/components/BOMDetailPanel/TabSummary.jsx
import React from 'react';
import { useBOMViewer } from '../../context/BOMViewerContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TabSummary = () => {
  const { bom, bomComponents } = useBOMViewer();
  
  // Calculate some summary statistics
  const totalComponents = Array.isArray(bomComponents) ? bomComponents.length : 0;
  const purchasedCount = Array.isArray(bomComponents) 
    ? bomComponents.filter(c => (c.Nature || c.ComponentNature) === 22413314).length 
    : 0;
  const manufacturedCount = totalComponents - purchasedCount;
  
  // Calculate total costs (dummy calculation for illustration)
  const materialCost = bom?.RMCost || 0;
  const processingCost = bom?.ProcessingCost || 0;
  const totalCost = bom?.TotalCost || (materialCost + processingCost);
  
  return (
    <div className="p-6">
      <h3 className="text-lg font-medium mb-4">Riepilogo Distinta Base</h3>
      
      <div className="grid grid-cols-2 gap-6">
        {/* Components Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Componenti</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Totale componenti:</dt>
                <dd className="text-sm font-medium">{totalComponents}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Componenti di acquisto:</dt>
                <dd className="text-sm font-medium">{purchasedCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Componenti di produzione:</dt>
                <dd className="text-sm font-medium">{manufacturedCount}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        
        {/* Cost Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Costi</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Costo materiali:</dt>
                <dd className="text-sm font-medium">€ {materialCost.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Costo lavorazione:</dt>
                <dd className="text-sm font-medium">€ {processingCost.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Costo totale:</dt>
                <dd className="text-sm font-medium">€ {totalCost.toFixed(2)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TabSummary;