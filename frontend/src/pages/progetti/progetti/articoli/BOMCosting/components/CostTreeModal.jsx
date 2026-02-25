// CostTreeModal.jsx – Dettaglio costi BOM con gestione scenari di simulazione
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { X, Loader2, FlaskConical, Plus, Calculator, Trash2 } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import axios from '@/lib/axios';
import { formatCurrency } from '@/lib/bomCostingUtils';
import CostTreeView from './CostTreeView';

/**
 * Modale principale "Dettaglio Costi – Struttura BOM".
 * Incorpora la scenario bar: selezione/creazione scenario, calcolo costo simulato,
 * e passa activeScenario a CostTreeView per le colonne di override inline.
 */
const CostTreeModal = ({ isOpen, treeData, loading, onClose, bomId }) => {
  // ── Scenario state ────────────────────────────────────────────────────────
  const [scenarios,          setScenarios]      = useState([]);
  const [selectedScenarioId, setSelectedId]     = useState(null);
  // Ref sempre aggiornato per evitare stale closure nelle callback async
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selectedScenarioId;
  const [activeScenario,     setActiveScenario] = useState(null);
  const [loadingScen,        setLoadingScen]    = useState(false);
  const [loadingDetail,      setLoadingDetail]  = useState(false);
  const [calculating,        setCalculating]    = useState(false);
  const [scenarioCost,       setScenarioCost]   = useState(null);

  // ── Create-scenario dialog ─────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle,   setNewTitle]   = useState('');
  const [newDesc,    setNewDesc]    = useState('');
  const [creating,   setCreating]   = useState(false);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !bomId) {
      setScenarios([]);
      setSelectedId(null);
      setActiveScenario(null);
      setScenarioCost(null);
      return;
    }
    loadScenarios();
  }, [isOpen, bomId]);

  useEffect(() => {
    if (!selectedScenarioId) {
      setActiveScenario(null);
      setScenarioCost(null);
      return;
    }
    loadDetail(selectedScenarioId);
    setScenarioCost(null);
  }, [selectedScenarioId]);

  // ── API helpers ───────────────────────────────────────────────────────────
  const loadScenarios = async () => {
    setLoadingScen(true);
    try {
      const res = await axios.get(`/bom-scenarios/bom/${bomId}`);
      setScenarios(res.data.data || []);
    } catch {
      toast({ title: 'Errore caricamento scenari', variant: 'destructive' });
    } finally {
      setLoadingScen(false);
    }
  };

  const loadDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const res = await axios.get(`/bom-scenarios/${id}`);
      setActiveScenario(res.data.data);
    } catch {
      toast({ title: 'Errore caricamento scenario', variant: 'destructive' });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await axios.post('/bom-scenarios', {
        bomId, title: newTitle.trim(), description: newDesc.trim() || null,
      });
      const created = res.data.scenario;
      setScenarios(prev => [created, ...prev]);
      setSelectedId(Number(created.Id));
      setCreateOpen(false);
      setNewTitle('');
      setNewDesc('');
      toast({ title: 'Scenario creato', description: created.Title });
    } catch (err) {
      toast({ title: 'Errore', description: err.response?.data?.msg || err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteScenario = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`/bom-scenarios/${id}`);
      // Prima svuota la selezione (previene qualsiasi ricaricamento dello scenario)
      if (Number(selectedScenarioId) === Number(id)) {
        setSelectedId(null);
        setActiveScenario(null);
        setScenarioCost(null);
      }
      // Poi aggiorna la lista (Number() garantisce confronto per tipo corretto)
      setScenarios(prev => prev.filter(s => Number(s.Id) !== Number(id)));
      toast({ title: 'Scenario eliminato' });
    } catch (err) {
      toast({ title: 'Errore eliminazione', description: err.response?.data?.msg || err.message, variant: 'destructive' });
    }
  };

  const handleUpsertOverride = async (detail) => {
    if (!selectedScenarioId) return;
    const id = selectedScenarioId; // cattura il valore corrente
    try {
      await axios.put(`/bom-scenarios/${id}/details`, detail);
      // Ricarica solo se lo scenario è ancora quello selezionato
      // (usa il ref per leggere il valore aggiornato dopo l'await)
      if (selectedIdRef.current === id) {
        await loadDetail(id);
      }
    } catch (err) {
      toast({ title: 'Errore salvataggio override', description: err.response?.data?.msg || err.message, variant: 'destructive' });
    }
  };

  const handleDeleteOverride = async (detailId) => {
    if (!selectedScenarioId) return;
    try {
      await axios.delete(`/bom-scenarios/${selectedScenarioId}/details/${detailId}`);
      await loadDetail(selectedScenarioId);
    } catch (err) {
      toast({ title: 'Errore rimozione override', description: err.response?.data?.msg || err.message, variant: 'destructive' });
    }
  };

  const handleCalculate = async () => {
    if (!selectedScenarioId || !bomId) return;
    setCalculating(true);
    setScenarioCost(null);
    try {
      const res = await axios.post(`/bom-scenarios/${selectedScenarioId}/calculate`, { bomId });
      setScenarioCost(res.data.result);
    } catch (err) {
      toast({ title: 'Errore calcolo scenario', description: err.response?.data?.msg || err.message, variant: 'destructive' });
    } finally {
      setCalculating(false);
    }
  };

  if (!isOpen) return null;

  const hasScenario    = !!activeScenario;
  const overrideCount  = activeScenario?.details?.length ?? 0;
  const official       = treeData?.costing;
  const sc             = scenarioCost;

  // ── Comparison card ────────────────────────────────────────────────────────
  const CompCard = ({ label, off, scVal, colorClass }) => {
    const delta = (scVal ?? 0) - (off ?? 0);
    const pct   = off ? (delta / off * 100) : 0;
    return (
      <div className={`${colorClass} rounded p-2 text-center`}>
        <div className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">{label}</div>
        <div className="text-gray-400 line-through text-[10px] font-mono">{formatCurrency(off ?? 0)}</div>
        <div className="font-semibold text-sm font-mono">{formatCurrency(scVal ?? 0)}</div>
        {Math.abs(delta) > 0.001 && (
          <div className={`text-[10px] font-semibold font-mono ${delta < 0 ? 'text-green-700' : 'text-red-600'}`}>
            {delta > 0 ? '+' : ''}{formatCurrency(delta)}
            <span className="ml-1 opacity-75">({delta > 0 ? '+' : ''}{pct.toFixed(1)}%)</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      style={{ overflow: 'hidden' }}
      onWheel={e => e.stopPropagation()}
    >
      <div
        className="bg-white rounded-lg w-full flex flex-col shadow-xl"
        style={{ height: '90vh', maxWidth: '95vw', marginTop: '40px' }}
        onWheel={e => e.stopPropagation()}
      >
        {/* ── Modal header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50 flex-shrink-0">
          <span className="text-sm font-medium text-gray-500 tracking-wide">
            Dettaglio Costi – Struttura BOM
          </span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* ── Scenario bar ─────────────────────────────────────────────────── */}
        <div
          className={`flex items-center gap-3 px-4 py-2 border-b flex-shrink-0 flex-wrap
            ${hasScenario
              ? 'bg-blue-50 border-blue-200'
              : 'bg-gray-50 border-gray-200'}`}
        >
          <FlaskConical
            className={`h-4 w-4 flex-shrink-0 ${hasScenario ? 'text-blue-600' : 'text-gray-400'}`}
          />
          <span className={`text-xs font-semibold uppercase tracking-wider ${hasScenario ? 'text-blue-700' : 'text-gray-400'}`}>
            Scenario
          </span>

          <Select
            value={selectedScenarioId ? String(selectedScenarioId) : 'none'}
            onValueChange={v => setSelectedId(v === 'none' ? null : Number(v))}
            disabled={loadingScen}
          >
            <SelectTrigger
              className={`h-7 w-64 text-xs ${hasScenario ? 'border-blue-400 text-blue-700 font-semibold' : ''}`}
            >
              <SelectValue placeholder="— Nessuno (Ufficiale)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Nessuno (Ufficiale)</SelectItem>
              {scenarios.map(s => (
                <SelectItem key={s.Id} value={String(s.Id)}>{s.Title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {loadingDetail && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 flex-shrink-0" />
          )}
          {hasScenario && !loadingDetail && (
            <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-300 flex-shrink-0">
              {overrideCount} {overrideCount === 1 ? 'modifica' : 'modifiche'}
            </Badge>
          )}

          {hasScenario && selectedScenarioId && (
            <Button
              size="sm" variant="ghost"
              className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
              title="Elimina scenario selezionato"
              onClick={e => handleDeleteScenario(selectedScenarioId, e)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}

          <div className="ml-auto flex gap-2">
            <Button
              size="sm" variant="outline"
              className="h-7 text-xs"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Nuovo Scenario
            </Button>

            {hasScenario && (
              <Button
                size="sm"
                className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                onClick={handleCalculate}
                disabled={calculating || loadingDetail}
              >
                <Calculator className="h-3 w-3 mr-1" />
                {calculating ? 'Calcolo...' : 'Calcola costo'}
              </Button>
            )}
          </div>
        </div>

        {/* ── Cost comparison cards (after calculate) ───────────────────────── */}
        {sc && official && (
          <div className="px-4 py-2 border-b bg-gradient-to-r from-green-50 to-blue-50 flex-shrink-0">
            <div className="grid grid-cols-4 gap-2">
              <CompCard
                label="Materiali"
                off={official.variable_costs_material}
                scVal={sc.variable_costs_material}
                colorClass="bg-blue-50 border border-blue-200"
              />
              <CompCard
                label="Operazioni"
                off={official.variable_costs_operations}
                scVal={sc.variable_costs_operations}
                colorClass="bg-green-50 border border-green-200"
              />
              <CompCard
                label="C. Fissi / Lotto"
                off={official.fixed_costs_per_lot}
                scVal={sc.fixed_costs_per_lot}
                colorClass="bg-gray-100 border border-gray-200"
              />
              <CompCard
                label="Costo unit. finale"
                off={official.unit_cost_final}
                scVal={sc.unit_cost_final}
                colorClass="bg-purple-50 border border-purple-200"
              />
            </div>
          </div>
        )}

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Caricamento...</span>
            </div>
          ) : treeData ? (
            <CostTreeView
              costingResult={treeData}
              activeScenario={hasScenario ? activeScenario : null}
              onUpsertOverride={handleUpsertOverride}
              onDeleteOverride={handleDeleteOverride}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Nessun dettaglio disponibile
            </div>
          )}
        </div>
      </div>

      {/* ── Create Scenario Dialog ────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo scenario di simulazione</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-sm">Titolo *</Label>
              <Input
                className="mt-1"
                placeholder="Es. Riduzione costo MP del 10%"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <Label className="text-sm">Descrizione</Label>
              <Textarea
                className="mt-1" rows={2}
                placeholder="Descrizione opzionale..."
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={creating || !newTitle.trim()}>
              {creating ? 'Creazione...' : 'Crea scenario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CostTreeModal;
