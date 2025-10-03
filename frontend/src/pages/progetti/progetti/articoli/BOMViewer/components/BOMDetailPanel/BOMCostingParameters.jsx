import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Save,
  History,
  Calculator,
  AlertCircle,
  Info,
  Clock,
  User,
  TrendingUp,
  FileText
} from 'lucide-react';
import { swal } from '@/lib/common';
import axios from '@/lib/axios';
import { formatCurrency, formatPercentage } from '@/lib/bomCostingUtils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Componente per la gestione dei parametri di costificazione BOM
 * con storico e visualizzazione modifiche
 */
const BOMCostingParameters = ({
  bomId,
  companyId,
  initialParameters = {},
  onParametersChange,
  readOnly = false
}) => {
  const [parameters, setParameters] = useState({
    orderQuantity: initialParameters.orderQuantity || '',
    scrapPercentage: initialParameters.scrapPercentage || '',
    useGranularMarkups: initialParameters.useGranularMarkups ?? true,
    updateBOMRecord: initialParameters.updateBOMRecord ?? true,
    notes: initialParameters.notes || ''
  });

  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [globalParameters, setGlobalParameters] = useState([]);
  const [loadingParameters, setLoadingParameters] = useState(false);
  const [customMarkups, setCustomMarkups] = useState({
    markupRM: '',           // RICARICO_MP
    markupOperations: '',   // RICARICO_OPE  
    markupExternalOps: '',  // RICARICO_TRASPORTO
    markupInternalOps: '',  // RICARICO_SCARTO
    markupOverhead: '',     // RICARICO_TOTALE
    markupSconto: ''        // RICARICO_SCONTO
  });

  useEffect(() => {
    if (bomId) {
      loadHistory();
      loadGlobalParameters();
      loadCustomMarkups();
    }
  }, [bomId]);

  const loadHistory = async () => {
    if (!bomId) return;

    try {
      setLoadingHistory(true);
      const response = await axios.get(`/bom-costing/history`, {
        params: {
          bomId: bomId,
          top: 10,
          orderBy: 'CostingDate DESC'
        }
      });

      if (response.data.success) {
        setHistory(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading costing history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadGlobalParameters = async () => {
    try {
      setLoadingParameters(true);
      const response = await axios.get('/bom-costing/parameters');

      if (response.data.success) {
        setGlobalParameters(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading global parameters:', error);
    } finally {
      setLoadingParameters(false);
    }
  };

  const loadCustomMarkups = async () => {
    if (!bomId) return;

    try {
      // Carica l'ultimo record dello storico per questa BOM
      const response = await axios.get('/bom-costing/history', {
        params: {
          bomId: bomId,
          top: 1,
          orderBy: 'CostingDate DESC'
        }
      });

      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const lastRecord = response.data.data[0];

        // Carica i ricarichi custom se presenti (converti da decimale a percentuale per visualizzazione: 0.07 -> 7)
        setCustomMarkups({
          markupRM: lastRecord.CustomMarkupRM ? (lastRecord.CustomMarkupRM * 100) : '',
          markupOperations: lastRecord.CustomMarkupOperations ? (lastRecord.CustomMarkupOperations * 100) : '',
          markupExternalOps: lastRecord.CustomMarkupExternalOps ? (lastRecord.CustomMarkupExternalOps * 100) : '',
          markupInternalOps: lastRecord.CustomMarkupInternalOps ? (lastRecord.CustomMarkupInternalOps * 100) : '',
          markupOverhead: lastRecord.CustomMarkupOverhead ? (lastRecord.CustomMarkupOverhead * 100) : '',
          markupSconto: lastRecord.CustomMarkupSconto ? (lastRecord.CustomMarkupSconto * 100) : ''
        });
      }
    } catch (error) {
      console.error('Error loading custom markups:', error);
    }
  };

  const handleParameterChange = (field, value) => {
    const newParams = { ...parameters, [field]: value };
    setParameters(newParams);

    if (onParametersChange) {
      onParametersChange(newParams);
    }
  };

  const handleSave = async () => {
    if (!bomId) {
      swal.fire('Attenzione', 'Seleziona una BOM prima di salvare i parametri', 'warning');
      return;
    }

    try {
      setSaving(true);

      const costingData = {
        orderQuantity: parameters.orderQuantity ? parseFloat(parameters.orderQuantity) : null,
        scrapPercentage: parameters.scrapPercentage ? parseFloat(parameters.scrapPercentage) : null,
        useGranularMarkups: parameters.useGranularMarkups,
        updateBOMRecord: parameters.updateBOMRecord,
        notes: parameters.notes,
        // Aggiungi ricarichi custom solo se almeno uno è impostato (converti da percentuale a decimale: 7 -> 0.07)
        customMarkups: (customMarkups.markupRM || customMarkups.markupOperations ||
                       customMarkups.markupExternalOps || customMarkups.markupInternalOps ||
                       customMarkups.markupOverhead || customMarkups.markupSconto) ? {
          markupRM: customMarkups.markupRM ? parseFloat(customMarkups.markupRM) / 100 : null,
          markupOperations: customMarkups.markupOperations ? parseFloat(customMarkups.markupOperations) / 100 : null,
          markupExternalOps: customMarkups.markupExternalOps ? parseFloat(customMarkups.markupExternalOps) / 100 : null,
          markupInternalOps: customMarkups.markupInternalOps ? parseFloat(customMarkups.markupInternalOps) / 100 : null,
          markupOverhead: customMarkups.markupOverhead ? parseFloat(customMarkups.markupOverhead) / 100 : null,
          markupSconto: customMarkups.markupSconto ? parseFloat(customMarkups.markupSconto) / 100 : null
        } : null
      };

      const response = await axios.post('/bom-costing/history', {
        bomId: bomId,
        costingData: costingData
      });

      if (response.data.success) {
        swal.fire('Successo', 'Parametri salvati con successo', 'success');
        await loadHistory();
      }
    } catch (error) {
      console.error('Error saving parameters:', error);
      swal.fire('Errore', 'Errore nel salvataggio dei parametri', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sezione Parametri Correnti */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Parametri di Costificazione
            </CardTitle>
            {!readOnly && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !bomId}
              >
                <Save className="h-4 w-4 mr-1" />
                Salva Parametri
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quantità Ordine */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderQuantity">Quantità Ordine</Label>
              <Input
                id="orderQuantity"
                type="number"
                step="0.01"
                value={parameters.orderQuantity}
                onChange={(e) => handleParameterChange('orderQuantity', e.target.value)}
                disabled={readOnly}
                placeholder="Es: 100"
              />
            </div>

            {/* Percentuale Scarto */}
            <div className="space-y-2">
              <Label htmlFor="scrapPercentage">Scarto (%)</Label>
              <Input
                id="scrapPercentage"
                type="number"
                step="0.01"
                value={parameters.scrapPercentage}
                onChange={(e) => handleParameterChange('scrapPercentage', e.target.value)}
                disabled={readOnly}
                placeholder="Es: 5"
              />
            </div>
          </div>

          {/* Opzioni */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="useGranularMarkups">Ricarichi Granulari</Label>
                <p className="text-xs text-gray-500">
                  Applica ricarichi specifici per categoria
                </p>
              </div>
              <Switch
                id="useGranularMarkups"
                checked={parameters.useGranularMarkups}
                onCheckedChange={(checked) => handleParameterChange('useGranularMarkups', checked)}
                disabled={readOnly}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="updateBOMRecord">Aggiorna Record BOM</Label>
                <p className="text-xs text-gray-500">
                  Salva i costi calcolati nel record della BOM
                </p>
              </div>
              <Switch
                id="updateBOMRecord"
                checked={parameters.updateBOMRecord}
                onCheckedChange={(checked) => handleParameterChange('updateBOMRecord', checked)}
                disabled={readOnly}
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="notes">Note</Label>
            <textarea
              id="notes"
              className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={parameters.notes}
              onChange={(e) => handleParameterChange('notes', e.target.value)}
              disabled={readOnly}
              placeholder="Aggiungi note sui parametri di costificazione..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Sezione Ricarichi Custom BOM */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Ricarichi Custom BOM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ricarico MP */}
            <div className="space-y-2">
              <Label htmlFor="markupRM">
                Ricarico MP (%)
                <span className="text-xs text-gray-500 ml-2">
                  {globalParameters.find(p => p.ParameterName === 'RICARICO_MP')?.ParameterValue
                    ? `(Globale: ${formatPercentage(globalParameters.find(p => p.ParameterName === 'RICARICO_MP').ParameterValue * 100)})`
                    : ''}
                </span>
              </Label>
              <Input
                id="markupRM"
                type="number"
                step="0.01"
                value={customMarkups.markupRM}
                onChange={(e) => setCustomMarkups({...customMarkups, markupRM: e.target.value})}
                disabled={readOnly}
                placeholder="Es: 15 (per 15%)"
              />
            </div>

            {/* Ricarico OPE */}
            <div className="space-y-2">
              <Label htmlFor="markupOperations">
                Ricarico OPE (%)
                <span className="text-xs text-gray-500 ml-2">
                  {globalParameters.find(p => p.ParameterName === 'RICARICO_OPE')?.ParameterValue
                    ? `(Globale: ${formatPercentage(globalParameters.find(p => p.ParameterName === 'RICARICO_OPE').ParameterValue * 100)})`
                    : ''}
                </span>
              </Label>
              <Input
                id="markupOperations"
                type="number"
                step="0.01"
                value={customMarkups.markupOperations}
                onChange={(e) => setCustomMarkups({...customMarkups, markupOperations: e.target.value})}
                disabled={readOnly}
                placeholder="Es: 20"
              />
            </div>

            {/* Ricarico Trasporto */}
            <div className="space-y-2">
              <Label htmlFor="markupExternalOps">
                Ricarico Trasporto (%)
                <span className="text-xs text-gray-500 ml-2">
                  {globalParameters.find(p => p.ParameterName === 'RICARICO_TRASPORTO')?.ParameterValue
                    ? `(Globale: ${formatPercentage(globalParameters.find(p => p.ParameterName === 'RICARICO_TRASPORTO').ParameterValue * 100)})`
                    : ''}
                </span>
              </Label>
              <Input
                id="markupExternalOps"
                type="number"
                step="0.01"
                value={customMarkups.markupExternalOps}
                onChange={(e) => setCustomMarkups({...customMarkups, markupExternalOps: e.target.value})}
                disabled={readOnly}
                placeholder="Es: 5"
              />
            </div>

            {/* Ricarico Scarto */}
            <div className="space-y-2">
              <Label htmlFor="markupInternalOps">
                Ricarico Scarto (%)
                <span className="text-xs text-gray-500 ml-2">
                  {globalParameters.find(p => p.ParameterName === 'RICARICO_SCARTO')?.ParameterValue
                    ? `(Globale: ${formatPercentage(globalParameters.find(p => p.ParameterName === 'RICARICO_SCARTO').ParameterValue * 100)})`
                    : ''}
                </span>
              </Label>
              <Input
                id="markupInternalOps"
                type="number"
                step="0.01"
                value={customMarkups.markupInternalOps}
                onChange={(e) => setCustomMarkups({...customMarkups, markupInternalOps: e.target.value})}
                disabled={readOnly}
                placeholder="Es: 10"
              />
            </div>

            {/* Ricarico Totale */}
            <div className="space-y-2">
              <Label htmlFor="markupOverhead">
                Ricarico Totale (%)
                <span className="text-xs text-gray-500 ml-2">
                  {globalParameters.find(p => p.ParameterName === 'RICARICO_TOTALE')?.ParameterValue
                    ? `(Globale: ${formatPercentage(globalParameters.find(p => p.ParameterName === 'RICARICO_TOTALE').ParameterValue * 100)})`
                    : ''}
                </span>
              </Label>
              <Input
                id="markupOverhead"
                type="number"
                step="0.01"
                value={customMarkups.markupOverhead}
                onChange={(e) => setCustomMarkups({...customMarkups, markupOverhead: e.target.value})}
                disabled={readOnly}
                placeholder="Es: 25"
              />
            </div>

            {/* Ricarico Sconto */}
            <div className="space-y-2">
              <Label htmlFor="markupSconto">
                Ricarico Sconto (%)
                <span className="text-xs text-gray-500 ml-2">
                  {globalParameters.find(p => p.ParameterName === 'RICARICO_SCONTO')?.ParameterValue
                    ? `(Globale: ${formatPercentage(globalParameters.find(p => p.ParameterName === 'RICARICO_SCONTO').ParameterValue * 100)})`
                    : ''}
                </span>
              </Label>
              <Input
                id="markupSconto"
                type="number"
                step="0.01"
                value={customMarkups.markupSconto}
                onChange={(e) => setCustomMarkups({...customMarkups, markupSconto: e.target.value})}
                disabled={readOnly}
                placeholder="Es: 0"
              />
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded p-3">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-900 mb-1">Ricarichi Custom BOM</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                <li>Lascia vuoto per usare il ricarico globale dell'azienda</li>
                <li>Inserisci un valore per sovrascrivere il ricarico globale per questa BOM specifica</li>
                <li>Il valore globale è mostrato tra parentesi come riferimento</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sezione Storico */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Storico Parametri
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? 'Nascondi' : 'Mostra'} Storico
            </Button>
          </div>
        </CardHeader>

        {showHistory && (
          <CardContent>
            {loadingHistory ? (
              <div className="text-center py-4 text-sm text-gray-500">
                Caricamento storico...
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Nessuno storico disponibile
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Data</TableHead>
                      <TableHead>Qtà</TableHead>
                      <TableHead>Scarto%</TableHead>
                      <TableHead>Costo Tot.</TableHead>
                      <TableHead>Utente</TableHead>
                      <TableHead className="w-[80px]">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((record) => (
                      <TableRow key={record.Id}>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(record.CostingDate), 'dd/MM/yyyy HH:mm', { locale: it })}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {record.OrderQuantity ? record.OrderQuantity.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {record.ScrapPercentage ? formatPercentage(record.ScrapPercentage) : '-'}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {record.TotalCost ? formatCurrency(record.TotalCost) : '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {record.CalculatedByName || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => {
                              setParameters({
                                orderQuantity: record.OrderQuantity || '',
                                scrapPercentage: record.ScrapPercentage || '',
                                useGranularMarkups: record.UseGranularMarkups ?? true,
                                updateBOMRecord: record.UpdateBOMRecord ?? true,
                                notes: record.Notes || ''
                              });
                              swal.fire('Info', 'Parametri ripristinati dallo storico', 'info');
                            }}
                          >
                            <TrendingUp className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Info Box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="flex gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-xs text-blue-800">
            <p className="font-medium mb-1">Come funziona:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-1">
              <li>I parametri vengono salvati automaticamente ad ogni costificazione</li>
              <li>Lo storico mantiene tutte le versioni precedenti</li>
              <li>Puoi ripristinare parametri precedenti cliccando sull'icona nella tabella</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BOMCostingParameters;
