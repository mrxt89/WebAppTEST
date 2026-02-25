// BOMViewer/components/BOMDetailPanel/TabScenari.jsx
// Gestione scenari di costificazione BOM:
//   - Creazione / selezione / eliminazione scenari
//   - Override manuale di Quantity, UnitCost, FixedCost, IsBuy per componenti
//   - Override manuale di ProcessingTime, SetupTime, Qty per cicli routing
//   - Calcolo costo scenario via SP_CalculateBOMCosting(@ScenarioId)

import React, { useState, useEffect } from "react";
import axios from "@/lib/axios";
import { useBOMViewer } from "../../context/BOMViewerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import {
  Plus,
  Trash2,
  Calculator,
  Save,
  X,
  AlertTriangle,
  ShoppingCart,
  Edit2,
  RefreshCw,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) =>
  v != null
    ? new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v)
    : "—";

const fmtPct = (v) => (v != null ? `${(v * 100).toFixed(1)}%` : "—");

const nullIfEmpty = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

// ── small display component ───────────────────────────────────────────────────
const CostRow = ({ label, value, bold }) => (
  <>
    <div className={`text-gray-600 ${bold ? "font-semibold" : ""}`}>{label}</div>
    <div className={`text-right tabular-nums ${bold ? "font-semibold text-gray-900" : "text-gray-700"}`}>
      {value}
    </div>
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
// TabScenari
// ─────────────────────────────────────────────────────────────────────────────
const TabScenari = () => {
  const { bom, selectedNode } = useBOMViewer();
  const bomId = bom?.Id;

  // ── scenarios list ────────────────────────────────────────────────────────
  const [scenarios, setScenarios] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const [activeScenario, setActiveScenario] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── create dialog ─────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // ── node override form ────────────────────────────────────────────────────
  const [overrideForm, setOverrideForm] = useState(null); // null = no node selected
  const [savingOverride, setSavingOverride] = useState(false);

  // ── calculate ─────────────────────────────────────────────────────────────
  const [calculating, setCalculating] = useState(false);
  const [costResult, setCostResult] = useState(null);

  // ── effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bomId) return;
    setActiveScenarioId(null);
    setActiveScenario(null);
    setCostResult(null);
    loadScenarios();
  }, [bomId]);

  useEffect(() => {
    if (!activeScenarioId) {
      setActiveScenario(null);
      return;
    }
    loadScenarioDetail(activeScenarioId);
    setCostResult(null);
  }, [activeScenarioId]);

  // Rebuild override form whenever the active scenario or selected node changes
  useEffect(() => {
    if (!activeScenario || !selectedNode) {
      setOverrideForm(null);
      return;
    }
    buildOverrideForm(activeScenario, selectedNode);
  }, [activeScenario, selectedNode]);

  // ── API helpers ───────────────────────────────────────────────────────────
  const loadScenarios = async () => {
    if (!bomId) return;
    setLoadingList(true);
    try {
      const res = await axios.get(`/api/bom-scenarios/bom/${bomId}`);
      setScenarios(res.data.data || []);
    } catch (err) {
      toast({
        title: "Errore caricamento scenari",
        description: err.response?.data?.msg || err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingList(false);
    }
  };

  const loadScenarioDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const res = await axios.get(`/api/bom-scenarios/${id}`);
      setActiveScenario(res.data.data);
    } catch (err) {
      toast({
        title: "Errore caricamento scenario",
        description: err.response?.data?.msg || err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── override form builder ─────────────────────────────────────────────────
  const buildOverrideForm = (scenario, node) => {
    const details = scenario?.details || [];

    if (node.type === "component") {
      const path = node.data?.Path;
      const existing = details.find(
        (d) => d.RowType === "C" && d.AncestralPath === path
      );
      setOverrideForm({
        RowType: "C",
        AncestralPath: path,
        label: node.data?.ComponentItemCode || path || "Componente",
        sublabel: node.data?.ComponentDescription || "",
        existing,
        Quantity_Sc: existing?.Quantity_Sc ?? "",
        UnitCost_Sc: existing?.UnitCost_Sc ?? "",
        FixedCost_Sc: existing?.FixedCost_Sc ?? "",
        IsBuy: existing?.IsBuy ?? false,
        Notes: existing?.Notes ?? "",
      });
    } else if (node.type === "cycle") {
      const bomIdRt = node.data?.BOMId;
      const rtgStep = node.data?.RtgStep;
      const existing = details.find(
        (d) =>
          d.RowType === "R" &&
          String(d.BOMId_Rt) === String(bomIdRt) &&
          String(d.RtgStep) === String(rtgStep)
      );
      setOverrideForm({
        RowType: "R",
        BOMId_Rt: bomIdRt,
        RtgStep: rtgStep,
        label: node.data?.Operation || `Step ${rtgStep}`,
        sublabel: `BOM ${bomIdRt} / Step ${rtgStep}`,
        existing,
        ProcessingTime_Sc: existing?.ProcessingTime_Sc ?? "",
        SetupTime_Sc: existing?.SetupTime_Sc ?? "",
        Qty_Sc: existing?.Qty_Sc ?? "",
        Notes: existing?.Notes ?? "",
      });
    } else {
      setOverrideForm(null);
    }
  };

  // ── CRUD actions ──────────────────────────────────────────────────────────
  const handleCreateScenario = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await axios.post("/api/bom-scenarios", {
        bomId,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
      });
      const created = res.data.scenario;
      setScenarios((prev) => [created, ...prev]);
      setActiveScenarioId(created.Id);
      setCreateOpen(false);
      setNewTitle("");
      setNewDesc("");
      toast({ title: "Scenario creato", description: created.Title });
    } catch (err) {
      toast({
        title: "Errore creazione scenario",
        description: err.response?.data?.msg || err.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteScenario = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`/api/bom-scenarios/${id}`);
      setScenarios((prev) => prev.filter((s) => s.Id !== id));
      if (activeScenarioId === id) {
        setActiveScenarioId(null);
        setActiveScenario(null);
        setCostResult(null);
      }
      toast({ title: "Scenario eliminato" });
    } catch (err) {
      toast({
        title: "Errore eliminazione",
        description: err.response?.data?.msg || err.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveOverride = async () => {
    if (!activeScenarioId || !overrideForm?.RowType) return;
    setSavingOverride(true);
    try {
      const body = {
        RowType: overrideForm.RowType,
        Notes: overrideForm.Notes || null,
      };
      if (overrideForm.RowType === "C") {
        body.AncestralPath = overrideForm.AncestralPath;
        body.Quantity_Sc   = nullIfEmpty(overrideForm.Quantity_Sc);
        body.UnitCost_Sc   = nullIfEmpty(overrideForm.UnitCost_Sc);
        body.FixedCost_Sc  = nullIfEmpty(overrideForm.FixedCost_Sc);
        body.IsBuy         = !!overrideForm.IsBuy;
      } else {
        body.BOMId_Rt          = overrideForm.BOMId_Rt;
        body.RtgStep           = overrideForm.RtgStep;
        body.ProcessingTime_Sc = nullIfEmpty(overrideForm.ProcessingTime_Sc);
        body.SetupTime_Sc      = nullIfEmpty(overrideForm.SetupTime_Sc);
        body.Qty_Sc            = nullIfEmpty(overrideForm.Qty_Sc);
      }
      await axios.put(`/api/bom-scenarios/${activeScenarioId}/details`, body);
      await loadScenarioDetail(activeScenarioId);
      toast({ title: "Override salvato" });
    } catch (err) {
      toast({
        title: "Errore salvataggio override",
        description: err.response?.data?.msg || err.message,
        variant: "destructive",
      });
    } finally {
      setSavingOverride(false);
    }
  };

  const handleDeleteOverride = async (detailId) => {
    try {
      await axios.delete(`/api/bom-scenarios/${activeScenarioId}/details/${detailId}`);
      await loadScenarioDetail(activeScenarioId);
      toast({ title: "Override rimosso" });
    } catch (err) {
      toast({
        title: "Errore rimozione override",
        description: err.response?.data?.msg || err.message,
        variant: "destructive",
      });
    }
  };

  const handleCalculate = async () => {
    if (!activeScenarioId || !bomId) return;
    setCalculating(true);
    setCostResult(null);
    try {
      const res = await axios.post(`/api/bom-scenarios/${activeScenarioId}/calculate`, {
        bomId,
      });
      setCostResult(res.data.result);
    } catch (err) {
      toast({
        title: "Errore calcolo costo",
        description: err.response?.data?.msg || err.message,
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  // ── derived state ─────────────────────────────────────────────────────────
  const overrideExists = !!overrideForm?.existing;

  const findCurrentDetail = () => {
    if (!activeScenario?.details || !overrideForm) return null;
    return activeScenario.details.find((d) => {
      if (overrideForm.RowType === "C")
        return d.RowType === "C" && d.AncestralPath === overrideForm.AncestralPath;
      return (
        d.RowType === "R" &&
        String(d.BOMId_Rt) === String(overrideForm.BOMId_Rt) &&
        String(d.RtgStep) === String(overrideForm.RtgStep)
      );
    });
  };

  // ── guards ────────────────────────────────────────────────────────────────
  if (!bomId) {
    return (
      <div className="p-6 text-center text-gray-400 text-sm">
        Nessuna BOM selezionata
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-5">

      {/* ================================================================
          SEZIONE 1 — Lista scenari + selezione
          ================================================================ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Scenari di simulazione</h3>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={loadScenarios} disabled={loadingList}>
              <RefreshCw className={`h-3 w-3 ${loadingList ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3 w-3 mr-1" /> Nuovo
            </Button>
          </div>
        </div>

        {loadingList ? (
          <p className="text-xs text-gray-400">Caricamento...</p>
        ) : scenarios.length === 0 ? (
          <div className="text-center py-4 border border-dashed rounded-md">
            <p className="text-xs text-gray-400">Nessuno scenario per questa BOM.</p>
            <Button
              size="sm" variant="link" className="text-xs mt-1"
              onClick={() => setCreateOpen(true)}
            >
              Crea il primo scenario
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {scenarios.map((s) => (
              <div
                key={s.Id}
                className={`flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer text-sm transition-colors select-none
                  ${activeScenarioId === s.Id
                    ? "bg-blue-50 border-blue-300 ring-1 ring-blue-200"
                    : "hover:bg-gray-50 border-gray-200"}`}
                onClick={() =>
                  setActiveScenarioId((prev) => (prev === s.Id ? null : s.Id))
                }
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate text-xs">{s.Title}</p>
                  {s.Description && (
                    <p className="text-xs text-gray-400 truncate">{s.Description}</p>
                  )}
                </div>
                <Button
                  size="sm" variant="ghost"
                  className="h-6 w-6 p-0 ml-2 flex-shrink-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={(e) => handleDeleteScenario(s.Id, e)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================================================================
          SEZIONE 2 — Contenuto dello scenario attivo
          ================================================================ */}
      {activeScenarioId && (
        <>
          {loadingDetail ? (
            <p className="text-xs text-gray-400">Caricamento scenario...</p>
          ) : (
            <div className="space-y-4">

              {/* ── Override del nodo selezionato ── */}
              {overrideForm ? (
                <div className="border rounded-md p-3 bg-amber-50 border-amber-200 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Edit2 className="h-3.5 w-3.5 text-amber-700 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-amber-800 truncate">
                          {overrideForm.RowType === "C" ? "Componente" : "Ciclo"}: {overrideForm.label}
                        </p>
                        {overrideForm.sublabel && (
                          <p className="text-xs text-amber-600 truncate">{overrideForm.sublabel}</p>
                        )}
                      </div>
                    </div>
                    {overrideExists && (
                      <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-300 flex-shrink-0">
                        modificato
                      </Badge>
                    )}
                  </div>

                  {/* Component fields */}
                  {overrideForm.RowType === "C" && (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs text-gray-600">Quantità</Label>
                          <Input
                            type="number" min="0" step="any" placeholder="—"
                            className="h-7 text-xs mt-0.5"
                            value={overrideForm.Quantity_Sc}
                            onChange={(e) =>
                              setOverrideForm((f) => ({ ...f, Quantity_Sc: e.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Costo unit. (€)</Label>
                          <Input
                            type="number" min="0" step="any" placeholder="—"
                            className="h-7 text-xs mt-0.5"
                            value={overrideForm.UnitCost_Sc}
                            onChange={(e) =>
                              setOverrideForm((f) => ({ ...f, UnitCost_Sc: e.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Costo fisso (€)</Label>
                          <Input
                            type="number" min="0" step="any" placeholder="—"
                            className="h-7 text-xs mt-0.5"
                            value={overrideForm.FixedCost_Sc}
                            onChange={(e) =>
                              setOverrideForm((f) => ({ ...f, FixedCost_Sc: e.target.value }))
                            }
                          />
                        </div>
                      </div>

                      {/* IsBuy toggle */}
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={!!overrideForm.IsBuy}
                          onCheckedChange={(v) =>
                            setOverrideForm((f) => ({ ...f, IsBuy: v }))
                          }
                        />
                        <Label className="text-xs flex items-center gap-1 cursor-pointer">
                          <ShoppingCart className="h-3 w-3" />
                          Tratta come acquisto (IsBuy)
                        </Label>
                      </div>

                      {overrideForm.IsBuy && (
                        <div className="flex items-start gap-2 bg-amber-100 rounded p-2 text-xs text-amber-800">
                          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>
                            IsBuy attivo: tutti i sotto-componenti e cicli di questo
                            articolo vengono esclusi dal calcolo. Il costo utilizzato
                            sarà il "Costo unit." indicato sopra.
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Routing fields */}
                  {overrideForm.RowType === "R" && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs text-gray-600">T. ciclo (sec)</Label>
                        <Input
                          type="number" min="0" placeholder="—"
                          className="h-7 text-xs mt-0.5"
                          value={overrideForm.ProcessingTime_Sc}
                          onChange={(e) =>
                            setOverrideForm((f) => ({
                              ...f,
                              ProcessingTime_Sc: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">T. setup (sec)</Label>
                        <Input
                          type="number" min="0" placeholder="—"
                          className="h-7 text-xs mt-0.5"
                          value={overrideForm.SetupTime_Sc}
                          onChange={(e) =>
                            setOverrideForm((f) => ({
                              ...f,
                              SetupTime_Sc: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Qty ciclo</Label>
                        <Input
                          type="number" min="0" step="any" placeholder="—"
                          className="h-7 text-xs mt-0.5"
                          value={overrideForm.Qty_Sc}
                          onChange={(e) =>
                            setOverrideForm((f) => ({ ...f, Qty_Sc: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Notes (shared) */}
                  <div>
                    <Label className="text-xs text-gray-600">Note</Label>
                    <Textarea
                      rows={1} placeholder="Note opzionali..."
                      className="text-xs resize-none mt-0.5"
                      value={overrideForm.Notes}
                      onChange={(e) =>
                        setOverrideForm((f) => ({ ...f, Notes: e.target.value }))
                      }
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm" className="h-7 text-xs"
                      onClick={handleSaveOverride}
                      disabled={savingOverride}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      {savingOverride ? "Salvataggio..." : "Salva override"}
                    </Button>
                    {overrideExists && (
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          const d = findCurrentDetail();
                          if (d) handleDeleteOverride(d.Id);
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Rimuovi
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-3 border border-dashed rounded-md">
                  Seleziona un nodo nell'albero BOM per modificarne i valori.
                </p>
              )}

              {/* ── Tabella riepilogo override ── */}
              {activeScenario?.details?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-600 mb-1.5">
                    Override attivi ({activeScenario.details.length})
                  </h4>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs py-1.5 font-medium">Tipo</TableHead>
                          <TableHead className="text-xs py-1.5 font-medium">Nodo</TableHead>
                          <TableHead className="text-xs py-1.5 font-medium">Valori</TableHead>
                          <TableHead className="text-xs py-1.5 w-7" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeScenario.details.map((d) => (
                          <TableRow key={d.Id} className="text-xs">
                            <TableCell className="py-1.5">
                              <div className="flex flex-col gap-0.5">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] w-fit"
                                >
                                  {d.RowType === "C" ? "Comp." : "Ciclo"}
                                </Badge>
                                {d.IsBuy === true && (
                                  <Badge className="text-[10px] w-fit bg-blue-100 text-blue-700 border-blue-200">
                                    Buy
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-1.5 font-mono text-[10px] max-w-[110px]">
                              <span className="truncate block" title={
                                d.RowType === "C"
                                  ? d.AncestralPath
                                  : `BOM ${d.BOMId_Rt} / Step ${d.RtgStep}`
                              }>
                                {d.RowType === "C"
                                  ? d.AncestralPath
                                  : `${d.BOMId_Rt}/${d.RtgStep}`}
                              </span>
                            </TableCell>
                            <TableCell className="py-1.5 text-[10px] text-gray-600">
                              {d.RowType === "C" && (
                                <span className="space-x-1">
                                  {d.Quantity_Sc != null && <span>Q:{d.Quantity_Sc}</span>}
                                  {d.UnitCost_Sc != null && <span>€:{d.UnitCost_Sc}</span>}
                                  {d.FixedCost_Sc != null && <span>FC:{d.FixedCost_Sc}</span>}
                                  {d.Quantity_Sc == null && d.UnitCost_Sc == null && d.FixedCost_Sc == null && !d.IsBuy && "—"}
                                </span>
                              )}
                              {d.RowType === "R" && (
                                <span className="space-x-1">
                                  {d.ProcessingTime_Sc != null && <span>T:{d.ProcessingTime_Sc}s</span>}
                                  {d.SetupTime_Sc != null && <span>S:{d.SetupTime_Sc}s</span>}
                                  {d.Qty_Sc != null && <span>Q:{d.Qty_Sc}</span>}
                                  {d.ProcessingTime_Sc == null && d.SetupTime_Sc == null && d.Qty_Sc == null && "—"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-1.5 pr-2">
                              <Button
                                size="sm" variant="ghost"
                                className="h-5 w-5 p-0 text-red-400 hover:text-red-600"
                                onClick={() => handleDeleteOverride(d.Id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* ── Calcola costo ── */}
              <div className="pt-1 border-t">
                <Button
                  className="w-full"
                  onClick={handleCalculate}
                  disabled={calculating}
                  variant={costResult ? "outline" : "default"}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {calculating ? "Calcolo in corso..." : "Calcola costo scenario"}
                </Button>
              </div>

              {/* ── Risultato calcolo ── */}
              {costResult && (
                <div className="border rounded-md p-3 bg-green-50 border-green-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
                      <Calculator className="h-4 w-4" />
                      Risultato costificazione
                    </h4>
                    <Badge variant="outline" className="text-xs border-green-300 text-green-700 bg-green-100">
                      Scenario
                    </Badge>
                  </div>

                  {costResult.status_note !== "OK" && (
                    <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                      {costResult.status_note}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs">
                    {/* BOM info */}
                    <div className="col-span-2 pb-1.5 mb-0.5 border-b">
                      <span className="font-semibold text-gray-800">{costResult.bom_code}</span>
                      <span className="text-gray-500 ml-2 text-[11px]">{costResult.bom_description}</span>
                    </div>

                    {/* Costi base */}
                    <CostRow label="Costi MP" value={fmt(costResult.variable_costs_material)} />
                    <CostRow label="Costi Operazioni" value={fmt(costResult.variable_costs_operations)} />
                    <CostRow label="Costi Fissi / Lotto" value={fmt(costResult.fixed_costs_per_lot)} />
                    <CostRow label="Costo base" value={fmt(costResult.base_cost)} bold />

                    {/* Ricarichi */}
                    <div className="col-span-2 border-t my-1" />
                    <CostRow
                      label={`Ric. MP (${fmtPct(costResult.ricarico_mp_pct)})`}
                      value={fmt(costResult.ricarico_mp_amount)}
                    />
                    <CostRow
                      label={`Ric. OPE (${fmtPct(costResult.ricarico_ope_pct)})`}
                      value={fmt(costResult.ricarico_ope_amount)}
                    />
                    <CostRow
                      label={`Ric. Trasporto (${fmtPct(costResult.ricarico_trasporto_pct)})`}
                      value={fmt(costResult.ricarico_trasporto_amount)}
                    />
                    <CostRow
                      label={`Ric. Scarto (${fmtPct(costResult.ricarico_scarto_pct)})`}
                      value={fmt(costResult.ricarico_scarto_amount)}
                    />

                    {/* Totali */}
                    <div className="col-span-2 border-t my-1" />
                    <CostRow
                      label={`Costo unit. finale (lotto ${costResult.production_lot})`}
                      value={fmt(costResult.unit_cost_final)}
                      bold
                    />
                    <CostRow label="Prezzo unit. finale" value={fmt(costResult.unit_price_final)} bold />
                  </div>
                </div>
              )}

            </div>
          )}
        </>
      )}

      {/* ================================================================
          DIALOG — Crea nuovo scenario
          ================================================================ */}
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
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateScenario()}
              />
            </div>
            <div>
              <Label className="text-sm">Descrizione</Label>
              <Textarea
                className="mt-1" rows={2}
                placeholder="Descrizione opzionale dello scenario..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleCreateScenario}
              disabled={creating || !newTitle.trim()}
            >
              {creating ? "Creazione..." : "Crea scenario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default TabScenari;
