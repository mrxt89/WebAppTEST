import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { HistoryIcon, Clock } from "lucide-react";
import useProjectActions from "../../../hooks/useProjectManagementActions";

const TaskHistoryTab = ({ task }) => {
  const [history, setHistory] = useState([]);
  const { getTaskHistory } = useProjectActions();

  useEffect(() => {
    const loadHistory = async () => {
      if (task?.TaskID) {
        try {
          const data = await getTaskHistory(task.TaskID);
          setHistory(data);
        } catch (error) {
          console.error("Error loading task history:", error);
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

  // Funzione per evidenziare i cambiamenti
  const renderChanges = (current, previous) => {
    const changes = [];

    // Verifica ogni campo e aggiunge i cambiamenti alla lista
    if (current.Title !== previous?.Title) {
      changes.push({
        field: "Titolo",
        oldValue: previous?.Title,
        newValue: current.Title,
      });
    }

    if (current.Description !== previous?.Description) {
      changes.push({
        field: "Descrizione",
        oldValue: previous?.Description || "Nessuna descrizione",
        newValue: current.Description || "Nessuna descrizione",
      });
    }

    if (current.AssignedToName !== previous?.AssignedToName) {
      changes.push({
        field: "Responsabile",
        oldValue: previous?.AssignedToName,
        newValue: current.AssignedToName,
      });
    }

    if (current.Status !== previous?.Status) {
      changes.push({
        field: "Stato",
        oldValue: previous?.Status,
        newValue: current.Status,
        isBadge: true,
        type: "status",
      });
    }

    if (current.Priority !== previous?.Priority) {
      changes.push({
        field: "Priorità",
        oldValue: previous?.Priority,
        newValue: current.Priority,
        isBadge: true,
        type: "priority",
      });
    }

    if (current.StartDate !== previous?.StartDate) {
      changes.push({
        field: "Data Inizio",
        oldValue: previous?.StartDate
          ? new Date(previous.StartDate).toLocaleDateString()
          : "",
        newValue: new Date(current.StartDate).toLocaleDateString(),
      });
    }

    if (current.DueDate !== previous?.DueDate) {
      changes.push({
        field: "Data Fine",
        oldValue: previous?.DueDate
          ? new Date(previous.DueDate).toLocaleDateString()
          : "",
        newValue: new Date(current.DueDate).toLocaleDateString(),
      });
    }

    return changes;
  };

  return (
    <ScrollArea className="h-[500px] pr-4 mx-4">
      <div className="space-y-6">
        {history.map((entry, index) => {
          const previousEntry = history[index + 1];
          const changes = renderChanges(entry, previousEntry);

          if (changes.length === 0 && index !== history.length - 1) return null;

          return (
            <div
              key={entry.LineID}
              className="relative border-l-2 border-blue-200 pl-5 pb-2 pt-2"
            >
              {/* Cerchio con icona della cronologia */}
              <div className="absolute -left-[7px] top-0 bg-white border-2 border-blue-200 rounded-full p-1">
                <HistoryIcon className="h-4 w-4 text-blue-500" />
              </div>

              {/* Header con utente e data */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                  {entry.Name.split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <div className="font-medium">{entry.Name}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(entry.TBCreated).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Riepilogo modifiche */}
              {index === history.length - 1 ? (
                <div className="bg-blue-50 p-3 rounded-md text-sm">
                  <span className="font-medium">✨ Creazione attività</span>
                </div>
              ) : (
                changes.length > 0 && (
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
                )
              )}
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
