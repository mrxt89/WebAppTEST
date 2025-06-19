import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  HistoryIcon, 
  Clock, 
  DollarSign, 
  Link2, 
  MessageSquare,
  Edit,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Play,
  User
} from "lucide-react";
import useProjectActions from "../../../hooks/useProjectManagementActions";

const TaskHistoryTab = ({ task }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getTaskHistory } = useProjectActions();

  useEffect(() => {
    const loadHistory = async () => {
      if (task?.TaskID) {
        try {
          setLoading(true);
          const data = await getTaskHistory(task.TaskID);
          setHistory(data);
        } catch (error) {
          console.error("Error loading task history:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadHistory();
  }, [task?.TaskID]);

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "COMPLETATA":
        return "bg-green-100 text-green-800 border-green-200";
      case "IN ESECUZIONE":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "BLOCCATA":
        return "bg-red-100 text-red-800 border-red-200";
      case "SOSPESA":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case "ALTA":
        return "bg-red-100 text-red-800 border-red-200";
      case "MEDIA":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "BASSA":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getLogIcon = (logType, action) => {
    switch (logType) {
      case "TASK":
        return <Edit className="h-4 w-4 text-blue-500" />;
      case "COST":
        if (action === "INSERT") return <Plus className="h-4 w-4 text-green-500" />;
        if (action === "DELETE") return <Trash2 className="h-4 w-4 text-red-500" />;
        return <DollarSign className="h-4 w-4 text-orange-500" />;
      case "DEPENDENCY":
        return <Link2 className="h-4 w-4 text-purple-500" />;
      case "COMMENT":
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
      default:
        return <HistoryIcon className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLogColor = (logType) => {
    switch (logType) {
      case "TASK":
        return "border-blue-200";
      case "COST":
        return "border-orange-200";
      case "DEPENDENCY":
        return "border-purple-200";
      case "COMMENT":
        return "border-gray-200";
      default:
        return "border-gray-200";
    }
  };

  const renderLogEntry = (entry) => {
    switch (entry.LogType) {
      case "TASK":
        // Per i log TASK, mostriamo sempre i cambiamenti
        return renderTaskChanges(entry);
      
      case "COST":
        return (
          <div className="bg-orange-50 p-3 rounded-md text-sm">
            <div className="font-medium mb-1">{entry.ActionDescription}</div>
            {entry.Details && (
              <div className="text-xs text-gray-600 mt-1">{entry.Details}</div>
            )}
          </div>
        );
      
      case "DEPENDENCY":
        return (
          <div className="bg-purple-50 p-3 rounded-md text-sm">
            <div className="font-medium mb-1">{entry.ActionDescription}</div>
            {entry.Details && (
              <div className="text-xs text-gray-600 mt-1">{entry.Details}</div>
            )}
          </div>
        );
      
      case "COMMENT":
        return (
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-sm font-medium mb-1">Aggiunto commento</div>
            <div className="text-sm text-gray-700 italic">"{entry.Details}"</div>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Funzione per renderizzare i cambiamenti dei task
  const renderTaskChanges = (currentEntry) => {
    // Trova la voce precedente dello stesso tipo TASK
    const taskLogs = history.filter(h => h.LogType === 'TASK').sort((a, b) => 
      new Date(b.ActionDate || b.TBCreated) - new Date(a.ActionDate || a.TBCreated)
    );
    const currentTaskIndex = taskLogs.findIndex(t => t.LogID === currentEntry.LogID);
    const previousEntry = taskLogs[currentTaskIndex + 1];
    
    const changes = [];

    // Se è la prima entry (creazione task)
    if (!previousEntry || currentTaskIndex === taskLogs.length - 1) {
      return (
        <div className="bg-blue-50 p-3 rounded-md text-sm">
          <span className="font-medium">✨ Creazione attività</span>
          {currentEntry.Title && (
            <div className="mt-2 text-xs text-gray-600">
              <div><strong>Titolo:</strong> {currentEntry.Title}</div>
              <div><strong>Stato:</strong> <Badge className={getStatusBadgeColor(currentEntry.Status)}>{currentEntry.Status}</Badge></div>
              <div><strong>Priorità:</strong> <Badge className={getPriorityBadgeColor(currentEntry.Priority)}>{currentEntry.Priority}</Badge></div>
              {currentEntry.AssignedToName && <div><strong>Assegnato a:</strong> {currentEntry.AssignedToName}</div>}
            </div>
          )}
        </div>
      );
    }

    // Confronta i campi per trovare le modifiche (solo se abbiamo i dati)
    if (currentEntry.Title !== undefined && previousEntry?.Title !== undefined && currentEntry.Title !== previousEntry.Title) {
      changes.push({
        field: "Titolo",
        oldValue: previousEntry.Title || "Non impostato",
        newValue: currentEntry.Title || "Non impostato",
      });
    }

    if (currentEntry.Description !== undefined && previousEntry?.Description !== undefined && currentEntry.Description !== previousEntry.Description) {
      changes.push({
        field: "Descrizione",
        oldValue: previousEntry.Description || "Nessuna descrizione",
        newValue: currentEntry.Description || "Nessuna descrizione",
      });
    }

    if (currentEntry.AssignedTo !== undefined && previousEntry?.AssignedTo !== undefined && currentEntry.AssignedTo !== previousEntry.AssignedTo) {
      changes.push({
        field: "Responsabile",
        oldValue: previousEntry.AssignedToName || "Non assegnato",
        newValue: currentEntry.AssignedToName || "Non assegnato",
      });
    }

    if (currentEntry.Status !== undefined && previousEntry?.Status !== undefined && currentEntry.Status !== previousEntry.Status) {
      changes.push({
        field: "Stato",
        oldValue: previousEntry.Status,
        newValue: currentEntry.Status,
        isBadge: true,
        type: "status",
      });
    }

    if (currentEntry.Priority !== undefined && previousEntry?.Priority !== undefined && currentEntry.Priority !== previousEntry.Priority) {
      changes.push({
        field: "Priorità",
        oldValue: previousEntry.Priority,
        newValue: currentEntry.Priority,
        isBadge: true,
        type: "priority",
      });
    }

    if (currentEntry.StartDate !== undefined && previousEntry?.StartDate !== undefined && currentEntry.StartDate !== previousEntry.StartDate) {
      changes.push({
        field: "Data Inizio",
        oldValue: previousEntry.StartDate
          ? new Date(previousEntry.StartDate).toLocaleDateString()
          : "Non impostata",
        newValue: currentEntry.StartDate
          ? new Date(currentEntry.StartDate).toLocaleDateString()
          : "Non impostata",
      });
    }

    if (currentEntry.DueDate !== undefined && previousEntry?.DueDate !== undefined && currentEntry.DueDate !== previousEntry.DueDate) {
      changes.push({
        field: "Data Fine",
        oldValue: previousEntry.DueDate
          ? new Date(previousEntry.DueDate).toLocaleDateString()
          : "Non impostata",
        newValue: currentEntry.DueDate
          ? new Date(currentEntry.DueDate).toLocaleDateString()
          : "Non impostata",
      });
    }

    // Se non ci sono cambiamenti visibili, mostra almeno che c'è stata una modifica
    if (changes.length === 0) {
      return (
        <div className="bg-blue-50 p-3 rounded-md text-sm">
          <span className="font-medium">Attività modificata</span>
          <div className="text-xs text-gray-500 mt-1">
            Nessun cambiamento visibile nei dati principali
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {changes.map((change, i) => (
          <div key={i} className="bg-blue-50 p-3 rounded-md">
            <div className="text-sm font-medium mb-1">
              Ha modificato: {change.field}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex-1">
                <div className="text-gray-500 text-xs">Da:</div>
                {change.isBadge ? (
                  <Badge
                    variant="secondary"
                    className={
                      change.type === "status"
                        ? getStatusBadgeColor(change.oldValue)
                        : getPriorityBadgeColor(change.oldValue)
                    }
                  >
                    {change.oldValue || "Non impostato"}
                  </Badge>
                ) : (
                  <div className="text-gray-700">
                    {change.oldValue || "Non impostato"}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-gray-500 text-xs">A:</div>
                {change.isBadge ? (
                  <Badge
                    variant="secondary"
                    className={
                      change.type === "status"
                        ? getStatusBadgeColor(change.newValue)
                        : getPriorityBadgeColor(change.newValue)
                    }
                  >
                    {change.newValue}
                  </Badge>
                ) : (
                  <div className="text-gray-700">
                    {change.newValue}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Ordina tutti i log per data
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.ActionDate || b.TBCreated) - new Date(a.ActionDate || a.TBCreated)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[65vh]">
        <div className="text-gray-500">Caricamento cronologia...</div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[65vh] pr-4 mx-4">
      <div className="space-y-6">
        {sortedHistory.map((entry, index) => {
          const logColor = getLogColor(entry.LogType);
          const renderedContent = renderLogEntry(entry);
          
          // Se non c'è contenuto da mostrare, non renderizzare l'entry
          if (!renderedContent) return null;

          return (
            <div
              key={`${entry.LogType}-${entry.LogID}`}
              className={`relative border-l-2 ${logColor} pl-5 pb-2 pt-2`}
            >
              {/* Cerchio con icona */}
              <div className={`absolute -left-[7px] top-0 bg-white border-2 ${logColor} rounded-full p-1`}>
                {getLogIcon(entry.LogType, entry.Action)}
              </div>

              {/* Header con utente e data */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                  {entry.ActionByName?.split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <div className="font-medium">{entry.ActionByName}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(entry.ActionDate || entry.TBCreated).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Contenuto del log */}
              {renderedContent}
            </div>
          );
        })}

        {history.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            Nessuna cronologia disponibile
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default TaskHistoryTab;