import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, AlertCircle, Calculator, Clock, User, Loader2 } from "lucide-react";
import axios from "@/lib/axios";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { formatCurrency, formatPercentage } from "@/lib/bomCostingUtils";
import { cn } from "@/lib/utils";
import CostTreeView from "@/pages/progetti/progetti/articoli/BOMCosting/components/CostTreeView";

const formatValue = (value, formatter, fallback = "-") => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return formatter(value);
};

const BOMCostingSummary = ({ bomId, bomCode, bomVersion }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTreeData, setDetailTreeData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const loadSummary = useCallback(
    async (initial = false) => {
      if (!bomId) {
        setSummary(null);
        return null;
      }

      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const response = await axios.get(`/bom-costing/details/${bomId}`, {
          params: {
            useKnownData: true,
            useGranularMarkups: true,
            updateBOMRecord: false,
            version: bomVersion || 1,
          },
        });

        const payload = response.data?.data || null;
        const record = payload?.bomInfo || null;
        setSummary(record);
        setError(null);
        return record;
      } catch (err) {
        console.error("Errore caricamento riepilogo costi:", err);
        setError("Impossibile recuperare gli ultimi dati di costificazione");
        return null;
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [bomId, bomVersion],
  );

  useEffect(() => {
    loadSummary(true);
  }, [bomId, loadSummary]);

  const handleRecalculate = async () => {
    if (!bomId) return;
    setRefreshing(true);
    try {
      const response = await axios.post(`/bom-costing/calculate/${bomId}`, {
        version: bomVersion || 1,
        useGranularMarkups: true,
        updateBOMRecord: true,
        debug: true,
      });

      if (response.data?.success) {
        await loadSummary(false);
      }
    } catch (err) {
      console.error("Errore durante la ricostificazione:", err);
      setError("Calcolo non riuscito. Controlla la pagina costificazione per i dettagli.");
    } finally {
      setRefreshing(false);
    }
  };

  const costingDetails = React.useMemo(() => {
    if (!summary?.CostingDetailsJSON) return null;
    try {
      return JSON.parse(summary.CostingDetailsJSON);
    } catch {
      return null;
    }
  }, [summary?.CostingDetailsJSON]);

  const detailCostingResult = React.useMemo(() => {
    if (!detailTreeData) return null;
    return {
      costing: detailTreeData.costing || {},
      components: detailTreeData.components || [],
      routing: detailTreeData.routing || [],
      parameters: detailTreeData.parameters || [],
      logs: detailTreeData.logs || [],
      bomCode: detailTreeData.bomCode || bomCode,
      bomDescription: detailTreeData.bomDescription || "",
    };
  }, [detailTreeData, bomCode]);

  const renderSummaryContent = () => {
    if (!bomId) {
      return (
        <div className="text-sm text-gray-500">
          Seleziona una distinta per visualizzare i dati di costificazione.
        </div>
      );
    }

    if (loading) {
      return (
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Caricamento dati di costificazione...
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-sm text-red-600 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      );
    }

    if (!summary) {
      return (
        <div className="text-sm text-gray-500">
          Nessuna costificazione trovata per questa distinta. Premi <span className="font-medium">Ricalcola</span> per generare i dati.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Lotto (ProductionLot)</p>
            <p className="text-sm font-semibold">{formatValue(summary.ProductionLot, (value) => Number(value).toFixed(0))}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Costo totale</p>
            <p className="text-sm font-semibold">
              {formatValue(summary.LastCalculatedCost, formatCurrency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Aggiorna record BOM</p>
            <Badge
              variant="outline"
              className={cn(
                "text-[11px]",
                summary.UpdateBOMRecord ? "text-green-600 border-green-200 bg-green-50" : "text-amber-700 border-amber-200 bg-amber-50",
              )}
            >
              {summary.UpdateBOMRecord ? "Attivo" : "Disattivo"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Costo lavorazioni</p>
            <p className="font-medium">{formatValue(summary.LastProcessingCost, formatCurrency)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Ricarichi totali</p>
            <p className="font-medium">{formatValue(summary.LastTotalRefillCost, formatCurrency)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Ricarico Trasporto</p>
            <p className="font-medium">{formatValue(summary.LastTransportRefillCost, formatCurrency)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Ricarico Scarto</p>
            <p className="font-medium">{formatValue(summary.LastWasteRefillCost, formatCurrency)}</p>
          </div>
        </div>

        {/* Parametri di calcolo “verificabili” (se presenti in Details JSON) */}
        {(costingDetails?.quantita_lotto != null ||
          costingDetails?.ricarico_mp_pct != null ||
          costingDetails?.ricarico_ope_pct != null ||
          costingDetails?.ricarico_trasporto_pct != null ||
          costingDetails?.ricarico_scarto_pct != null ||
          costingDetails?.ricarico_totale_pct != null ||
          costingDetails?.ricarico_sconto_pct != null) && (
          <div className="rounded-md bg-slate-50 border text-xs p-3 text-gray-700">
            <p className="font-medium text-gray-800 mb-2">Parametri calcolo (ultimo salvataggio)</p>
            <div className="grid grid-cols-3 gap-2">
              {costingDetails?.quantita_lotto != null && (
                <div className="col-span-3"><span className="text-gray-500">Quantità LOTTO (per divisione costi fissi):</span> {formatValue(costingDetails.quantita_lotto, (v) => Number(v).toFixed(0))}</div>
              )}
              <div><span className="text-gray-500">Ricarico MP:</span> {formatValue(costingDetails?.ricarico_mp_pct, (v) => `${Number(v).toFixed(2)}%`)}</div>
              <div><span className="text-gray-500">Ricarico OPE:</span> {formatValue(costingDetails?.ricarico_ope_pct, (v) => `${Number(v).toFixed(2)}%`)}</div>
              <div><span className="text-gray-500">Trasporto:</span> {formatValue(costingDetails?.ricarico_trasporto_pct, (v) => `${Number(v).toFixed(2)}%`)}</div>
              <div><span className="text-gray-500">Scarto:</span> {formatValue(costingDetails?.ricarico_scarto_pct, (v) => `${Number(v).toFixed(2)}%`)}</div>
              <div><span className="text-gray-500">Totale:</span> {formatValue(costingDetails?.ricarico_totale_pct, (v) => `${Number(v).toFixed(2)}%`)}</div>
              <div><span className="text-gray-500">Sconto:</span> {formatValue(costingDetails?.ricarico_sconto_pct, (v) => `${Number(v).toFixed(2)}%`)}</div>
            </div>
          </div>
        )}

        {summary.Notes && (
          <div className="rounded-md bg-gray-50 border text-xs p-3 text-gray-600">
            <p className="font-medium text-gray-700 mb-1">Note</p>
            <p className="whitespace-pre-wrap">{summary.Notes}</p>
          </div>
        )}
      </div>
    );
  };

  const handleOpenDetailModal = async () => {
    if (!bomId) return;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const response = await axios.post(`/bom-costing/calculate/${bomId}`, {
        version: bomVersion || 1,
        useGranularMarkups: true,
        updateBOMRecord: false,
        debug: true,
      });

      if (response.data?.success) {
        const payload = response.data?.data || {};
        // Recupera struttura BOM per arricchire i costi come nella pagina di costificazione
        const bomResponse = await axios.get(`/projectArticles/boms/${bomId}`, {
          params: {
            action: "GET_BOM_MULTILEVEL",
            maxLevel: 10,
            expandPhantoms: true,
            includeRouting: true,
          },
        });

        const bomData = bomResponse.data?.data || bomResponse.data || {};
        const bomComponents = bomData.components || [];
        const bomRouting = bomData.routing || [];
        const costComponents = payload.components || [];
        const costRouting = payload.routing || [];
        const productionLot = payload.costing?.production_lot || 1;

        // Map costi operazioni (senza moltiplicare per qta - verrà fatto dopo)
        const operationCostMap = new Map();
        costRouting.forEach((route) => {
          const key = route.BOMId?.toString();
          if (!key) return;
          const existing = operationCostMap.get(key) || {
            ProcessingCost: 0,
            FixedCostTotal: 0,
            OperationCost: 0,
          };
          const processingCost = route.ProcessingCost || 0;
          const setupCost = route.SetupCost || 0;
          existing.ProcessingCost += processingCost;
          existing.FixedCostTotal += setupCost;
          existing.OperationCost += processingCost + setupCost / productionLot;
          operationCostMap.set(key, existing);
        });

        // Map costi materiali
        const materialCostMap = new Map();
        costComponents.forEach((comp) => {
          const key = comp.ComponentId?.toString();
          if (!key) return;
          materialCostMap.set(key, {
            UnitCost: comp.UnitCost || 0,
            CalculatedTotalCost: comp.CalculatedTotalCost || comp.TotalCost || 0,
            Quantity: comp.Quantity || 0,
            FixedCost: comp.FixedCost || 0,
            FixedCostTotal: comp.FixedCostTotal || comp.FixedCost || 0,
          });
        });

        const enrichedComponents = bomComponents.map((component) => {
          const opData = operationCostMap.get(component.BOMId?.toString());
          const materialData = materialCostMap.get(
            component.ComponentId?.toString(),
          );

          // IMPORTANTE: Moltiplica i costi delle operazioni per la qta del semilavorato
          // rispetto al padre, come si fa per i componenti (regola AUREA)
          const componentQuantity = component.Quantity || 1;
          const materialCost = materialData?.CalculatedTotalCost || 0;
          // Moltiplica operationCost per la qta del componente
          const operationCost = (opData?.OperationCost || 0) * componentQuantity;

          return {
            ...component,
            // Moltiplica anche ProcessingCost per la qta (per coerenza)
            OperationCost: (opData?.ProcessingCost || 0) * componentQuantity,
            FixedCost:
              (materialData?.FixedCost || 0) +
              (opData?.FixedCostTotal || 0) / productionLot,
            // FixedCostTotal delle operazioni va moltiplicato per la qta
            FixedCostTotal:
              (materialData?.FixedCostTotal || 0) + (opData?.FixedCostTotal || 0) * componentQuantity,
            MaterialCost: materialCost,
            TotalCost: materialCost + operationCost,
            CalculatedTotalCost: materialCost + operationCost,
            UnitCost: materialData?.UnitCost || 0,
            Quantity: component.Quantity || materialData?.Quantity || 0,
            operations:
              component.operations ||
              bomRouting.filter(
                (route) =>
                  route.BOMId?.toString() === component.BOMId?.toString() ||
                  route.ComponentId?.toString() === component.ComponentId?.toString(),
              ),
          };
        });

        setDetailTreeData({
          costing: payload.costing || {},
          components: enrichedComponents,
          routing: costRouting,
          parameters: payload.parameters || [],
          logs: payload.logs || [],
          bomCode: payload.bomInfo?.ItemCode || payload.bomInfo?.BOMCode || bomCode,
          bomDescription: payload.bomInfo?.ItemDescription || payload.bomInfo?.BOMDescription || "",
        });
      } else {
        setDetailError("Impossibile ottenere il dettaglio costi");
        setDetailTreeData(null);
      }
      setShowDetailModal(true);
    } catch (err) {
      console.error("Errore caricamento dettaglio costi:", err);
      setDetailError("Errore durante il calcolo dettagliato. Riprova dalla pagina di costificazione.");
      setDetailTreeData(null);
      setShowDetailModal(true);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Costificazione
            {bomCode && (
              <Badge variant="outline" className="text-[10px]">
                {bomCode} · v{bomVersion || 1}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleRecalculate}
              disabled={loading || refreshing || !bomId}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", refreshing && "animate-spin")} />
              Ricalcola
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderSummaryContent()}
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenDetailModal}
            disabled={!bomId || refreshing || detailLoading}
          >
            {detailLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Mostra dettaglio costi
          </Button>
        </div>
      </CardContent>

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-[90vw] h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Dettaglio costi {bomCode}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {detailLoading ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-500">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Calcolo in corso...
              </div>
            ) : detailError ? (
              <div className="text-sm text-red-600">{detailError}</div>
            ) : detailCostingResult ? (
              <CostTreeView costingResult={detailCostingResult} />
            ) : (
              <div className="text-sm text-gray-500">Nessun dettaglio disponibile</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BOMCostingSummary;

