// frontend/src/pages/progetti/progetti/history/ProjectHistoryTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Search, X, FileText, Package, Clipboard, Calculator, Info } from "lucide-react";
import useProjectActivityLog from "@/hooks/useProjectActivityLog";

const safeParseJson = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const formatJson = (obj) => {
  if (!obj) return "N/D";
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return "N/D";
  }
};

// Helper per ottenere icona in base al tipo di entità
const getEntityIcon = (entityType) => {
  switch (entityType) {
    case 'Item':
      return <Package className="h-3 w-3" />;
    case 'BOM':
    case 'BOMComponent':
      return <Clipboard className="h-3 w-3" />;
    case 'Project':
      return <FileText className="h-3 w-3" />;
    case 'Costing':
      return <Calculator className="h-3 w-3" />;
    case 'Attachment':
      return <FileText className="h-3 w-3" />;
    case 'Task':
      return <Clipboard className="h-3 w-3" />;
    default:
      return <FileText className="h-3 w-3" />;
  }
};

// Helper per ottenere colore badge in base all'azione
const getActionColor = (action) => {
  switch (action?.toUpperCase()) {
    case 'CREATE':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'UPDATE':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'DELETE':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'EXPORT':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'IMPORT':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'LINK':
    case 'UNLINK':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'CALCULATE':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Helper per formattare il tipo attività in modo più leggibile
const formatActivityType = (activityType) => {
  if (!activityType) return '-';
  return activityType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

const toIsoDateOnly = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const ProjectHistoryTab = ({ project }) => {
  const projectId = project?.ProjectID;
  const { getProjectLogs, isLoading, error } = useProjectActivityLog();

  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);

  // Filtri (server-side) + ricerca (client-side)
  const [activityType, setActivityType] = useState("ALL");
  const [entityType, setEntityType] = useState("ALL");
  const [userId, setUserId] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchText, setSearchText] = useState("");

  // Opzioni dinamiche (derivate dai dati caricati) per non introdurre nuove API
  const [knownActivityTypes, setKnownActivityTypes] = useState([]);
  const [knownEntityTypes, setKnownEntityTypes] = useState([]);

  // Modal dettaglio
  const [selectedLog, setSelectedLog] = useState(null);

  const members = Array.isArray(project?.members) ? project.members : [];

  const fetchLogs = async () => {
    if (!projectId) return;

    const params = {
      page: pageNumber,
      pageSize,
      activityType: activityType === "ALL" ? undefined : activityType,
      entityType: entityType === "ALL" ? undefined : entityType,
      userId: userId === "ALL" ? undefined : Number(userId),
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    };

    const res = await getProjectLogs(projectId, params);
    if (res?.success) {
      const newLogs = res.logs || [];
      setLogs(newLogs);
      setTotalCount(res.totalCount || 0);
      setTotalPages(res.totalPages || 0);

      // Aggiorna opzioni dinamiche
      setKnownActivityTypes((prev) => {
        const set = new Set(prev);
        newLogs.forEach((l) => l.ActivityType && set.add(l.ActivityType));
        return Array.from(set).sort();
      });
      setKnownEntityTypes((prev) => {
        const set = new Set(prev);
        newLogs.forEach((l) => l.EntityType && set.add(l.EntityType));
        return Array.from(set).sort();
      });
    } else {
      setLogs([]);
      setTotalCount(0);
      setTotalPages(0);
    }
  };

  // Reset pagina quando cambiano filtri server-side
  useEffect(() => {
    setPageNumber(1);
  }, [activityType, entityType, userId, startDate, endDate, pageSize, projectId]);

  // Fetch con debounce leggero per evitare raffiche
  useEffect(() => {
    if (!projectId) return;
    const t = setTimeout(() => {
      fetchLogs();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, pageNumber, pageSize, activityType, entityType, userId, startDate, endDate]);

  const filteredLogs = useMemo(() => {
    if (!searchText) return logs;
    const s = searchText.toLowerCase();
    return logs.filter((l) => {
      const hay = [
        l.Description,
        l.UserName,
        l.EntityCode,
        l.EntityDisplayName,
        l.ActivityType,
        l.EntityType,
        l.Action,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [logs, searchText]);

  const handleReset = () => {
    setActivityType("ALL");
    setEntityType("ALL");
    setUserId("ALL");
    setStartDate("");
    setEndDate("");
    setSearchText("");
    setKnownActivityTypes([]);
    setKnownEntityTypes([]);
    setPageNumber(1);
  };

  return (
    <div className="h-full overflow-auto p-4">
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-lg">History progetto</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Totale: {totalCount}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs()}
                disabled={isLoading || !projectId}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Aggiorna
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 flex flex-col gap-3">
          {/* Filtri */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <div className="md:col-span-2">
              <div className="relative">
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Cerca (descrizione, utente, entità...)"
                  className="pr-8"
                />
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo attività" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tutte le attività</SelectItem>
                {knownActivityTypes
                  .filter((t) => t)
                  .map((t) => (
                    <SelectItem key={`activity-${t}`} value={t}>
                      {t}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger>
                <SelectValue placeholder="Entità" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tutte le entità</SelectItem>
                {knownEntityTypes
                  .filter((t) => t)
                  .map((t) => (
                    <SelectItem key={`entity-${t}`} value={t}>
                      {t}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Utente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tutti gli utenti</SelectItem>
                {members
                  .filter((m) => m && m.userId)
                  .map((m) => (
                    <SelectItem key={`user-${m.userId}`} value={String(m.userId)}>
                      {m.firstName} {m.lastName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Da"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                title="A"
              />
            </div>

            <div className="flex items-center gap-2 md:col-span-6">
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Righe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 righe</SelectItem>
                  <SelectItem value="50">50 righe</SelectItem>
                  <SelectItem value="100">100 righe</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={handleReset} disabled={isLoading}>
                <X className="h-4 w-4 mr-2" />
                Reset filtri
              </Button>
            </div>
          </div>

          {/* Error / Empty */}
          {error && (
            <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded p-2">
              {error}
            </div>
          )}

          {/* Tabella */}
          <div className="flex-1 min-h-0 overflow-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-gray-50">
                <TableRow>
                  <TableHead className="w-[160px]">Data/Ora</TableHead>
                  <TableHead className="w-[160px]">Utente</TableHead>
                  <TableHead className="w-[160px]">Attività</TableHead>
                  <TableHead className="w-[120px]">Azione</TableHead>
                  <TableHead className="w-[140px]">Entità</TableHead>
                  <TableHead>Dettaglio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Caricamento log...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-gray-500">
                      Nessun log trovato con i filtri correnti.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((l) => (
                    <TableRow
                      key={l.LogId}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedLog(l)}
                    >
                      <TableCell className="text-xs text-gray-700 whitespace-nowrap">
                        {l.Timestamp ? new Date(l.Timestamp).toLocaleString("it-IT") : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-gray-700">
                        {l.UserName || l.UserId || "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary" className="text-xs">
                          {formatActivityType(l.ActivityType) || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getActionColor(l.Action)}`}
                        >
                          {l.Action || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-700">
                        <div className="flex items-center gap-2">
                          {getEntityIcon(l.EntityType)}
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium">{l.EntityType || "-"}</span>
                            <span className="text-gray-500 truncate max-w-[200px]">
                              {l.EntityDisplayName || l.EntityCode || l.EntityId || ""}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-700">
                        <span className="line-clamp-2">
                          {l.Description || "-"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginazione */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-gray-600">
              Pagina <b>{pageNumber}</b> di <b>{Math.max(totalPages, 1)}</b>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={isLoading || pageNumber <= 1}
              >
                Precedente
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageNumber((p) => p + 1)}
                disabled={isLoading || (totalPages > 0 && pageNumber >= totalPages)}
              >
                Successiva
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal dettaglio */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Dettaglio attività</DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="text-sm">
                  <div className="text-xs text-gray-500">Data/Ora</div>
                  <div className="font-medium">
                    {selectedLog.Timestamp
                      ? new Date(selectedLog.Timestamp).toLocaleString("it-IT")
                      : "-"}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-gray-500">Utente</div>
                  <div className="font-medium">{selectedLog.UserName || selectedLog.UserId}</div>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-gray-500">Entità</div>
                  <div className="font-medium">
                    {selectedLog.EntityType} {selectedLog.EntityDisplayName || selectedLog.EntityCode || ""}
                  </div>
                </div>
              </div>

              <div className="text-sm">
                <div className="text-xs text-gray-500">Descrizione</div>
                <div className="font-medium">{selectedLog.Description || "-"}</div>
              </div>

              {(selectedLog.OldValues || selectedLog.NewValues || selectedLog.Metadata) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {selectedLog.OldValues && (
                    <div className="border rounded-md p-3 bg-red-50 border-red-200">
                      <div className="text-xs font-semibold mb-2 text-red-700 flex items-center gap-1">
                        <X className="h-3 w-3" />
                        Valori Precedenti
                      </div>
                      <pre className="text-xs overflow-auto max-h-[260px] bg-white p-2 rounded border">
                        {formatJson(safeParseJson(selectedLog.OldValues))}
                      </pre>
                    </div>
                  )}
                  {selectedLog.NewValues && (
                    <div className="border rounded-md p-3 bg-green-50 border-green-200">
                      <div className="text-xs font-semibold mb-2 text-green-700 flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Valori Nuovi
                      </div>
                      <pre className="text-xs overflow-auto max-h-[260px] bg-white p-2 rounded border">
                        {formatJson(safeParseJson(selectedLog.NewValues))}
                      </pre>
                    </div>
                  )}
                  {selectedLog.Metadata && (
                    <div className="border rounded-md p-3 bg-blue-50 border-blue-200">
                      <div className="text-xs font-semibold mb-2 text-blue-700 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Metadati
                      </div>
                      <pre className="text-xs overflow-auto max-h-[260px] bg-white p-2 rounded border">
                        {formatJson(safeParseJson(selectedLog.Metadata))}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-gray-500">
                Nota: i filtri “Tipo attività” e “Entità” mostrano opzioni derivate dai dati caricati.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectHistoryTab;

