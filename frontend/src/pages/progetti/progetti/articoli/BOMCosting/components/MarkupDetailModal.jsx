import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/bomCostingUtils';

/**
 * Modal per visualizzare il dettaglio dei ricarichi con parametri percentuali
 * e indicatore se i parametri derivano da BOM specifica o default azienda
 */
const MarkupDetailModal = ({ 
  isOpen, 
  costingData, 
  parameters, 
  customMarkups, 
  onClose 
}) => {
  if (!isOpen || !costingData) return null;

  const costing = costingData.costing || {};
  
  // Calcola i totali dei ricarichi
  const totalMarkups = (costing.ricarico_mp_amount || 0) + 
                      (costing.ricarico_ope_amount || 0) + 
                      (costing.ricarico_trasporto_amount || 0) + 
                      (costing.ricarico_scarto_amount || 0) + 
                      (costing.ricarico_totale_amount || 0) + 
                      (costing.ricarico_sconto_amount || 0);

  // Funzione per determinare se un parametro è custom BOM o globale
  const getParameterSource = (parameterName) => {
    const parameter = parameters?.find(p => p.ParameterName === parameterName);
    const value = parameter?.ParameterValue;
    const origin = parameter?.Origin;
    
    return {
      source: origin === 'Custom' ? 'custom' : 'global',
      value: value, // I valori arrivano già come decimali (0.01 = 1%)
      globalValue: value // Per ora usiamo lo stesso valore, potremmo aggiungere il valore globale in futuro
    };
  };

  // Dati dei ricarichi con parametri
  const markupDetails = [
    {
      name: 'Ricarico Materiali',
      amount: costing.ricarico_mp_amount || 0,
      parameter: getParameterSource('RICARICO_MP'),
      description: 'Ricarico sui costi dei materiali'
    },
    {
      name: 'Ricarico Operazioni',
      amount: costing.ricarico_ope_amount || 0,
      parameter: getParameterSource('RICARICO_OPE'),
      description: 'Ricarico sui costi delle operazioni'
    },
    {
      name: 'Ricarico Trasporto',
      amount: costing.ricarico_trasporto_amount || 0,
      parameter: getParameterSource('RICARICO_TRASPORTO'),
      description: 'Ricarico sui costi di trasporto'
    },
    {
      name: 'Ricarico Scarto',
      amount: costing.ricarico_scarto_amount || 0,
      parameter: getParameterSource('RICARICO_SCARTO'),
      description: 'Ricarico per scarto di produzione'
    },
    {
      name: 'Ricarico Totale',
      amount: costing.ricarico_totale_amount || 0,
      parameter: getParameterSource('RICARICO_TOTALE'),
      description: 'Ricarico generale sul totale'
    },
    {
      name: 'Ricarico Sconto',
      amount: costing.ricarico_sconto_amount || 0,
      parameter: getParameterSource('RICARICO_SCONTO'),
      description: 'Sconto applicato (valore negativo)'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col shadow-xl" style={{ marginTop: '50px' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Info className="h-6 w-6 text-orange-600" />
            <h2 className="text-xl font-semibold">
              Dettaglio Ricarichi - Parametri Utilizzati
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Riepilogo totale */}
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-orange-900">Totale Ricarichi</h3>
                <p className="text-sm text-orange-700">Somma di tutti i ricarichi applicati</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-900">
                  {formatCurrency(totalMarkups)}
                </div>
              </div>
            </div>
          </div>

          {/* Dettaglio ricarichi */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Breakdown Ricarichi
            </h3>
            
            {markupDetails.map((markup, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium text-gray-900">{markup.name}</h4>
                    <div className="flex items-center gap-2">
                      {markup.parameter.source === 'custom' ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-xs font-medium">Custom BOM</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-blue-600">
                          <Info className="h-4 w-4 text-danger" />
                          <span className="text-xs font-medium text-danger">Default Azienda</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(markup.amount)}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Parametro utilizzato:</span>
                    <div className="font-medium text-gray-900">
                      {((markup.parameter.value || 0) * 100).toFixed(2)}%
                    </div>
                    {markup.parameter.source === 'custom' && markup.parameter.globalValue && (
                      <div className="text-xs text-gray-500 mt-1">
                        Default azienda: {((markup.parameter.globalValue || 0) * 100).toFixed(2)}%
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-600">Descrizione:</span>
                    <div className="text-gray-700">{markup.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Note informative */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Informazioni sui Parametri</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Custom BOM:</strong> Parametri specifici per questa distinta base</li>
                  <li>• <strong>Default Azienda:</strong> Parametri globali dell'azienda utilizzati come fallback</li>
                  <li>• I parametri custom hanno sempre priorità sui parametri globali</li>
                  <li>• I valori percentuali sono mostrati in formato decimale (es. 0.10 = 10%)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkupDetailModal;
