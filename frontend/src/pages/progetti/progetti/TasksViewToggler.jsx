import React from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  LayoutGrid,
  List,
  AlertTriangle,
  Clock,
  GanttChartSquare,
  LayoutDashboard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TasksViewToggler = ({
  viewMode,
  setViewMode,
  tasks = [],
  showLegend = true,
}) => {
  // Calcola il numero di task in ritardo
  const delayedTasksCount = tasks.filter((task) => {
    const dueDate = new Date(task.DueDate);
    const today = new Date();
    return dueDate < today && task.Status !== "COMPLETATA";
  }).length;

  // Calcola le statistiche delle task per stato
  const taskStats = {
    "DA FARE": tasks.filter((t) => t.Status === "DA FARE").length,
    "IN ESECUZIONE": tasks.filter((t) => t.Status === "IN ESECUZIONE").length,
    COMPLETATA: tasks.filter((t) => t.Status === "COMPLETATA").length,
    BLOCCATA: tasks.filter((t) => t.Status === "BLOCCATA").length,
    SOSPESA: tasks.filter((t) => t.Status === "SOSPESA").length,
  };

  // Configurazione per gli stati delle task (colori e icone)
  const statusConfig = {
    "DA FARE": {
      label: "Da Fare",
      color: "bg-gray-100 text-gray-700 border-gray-200",
    },
    "IN ESECUZIONE": {
      label: "In Corso",
      color: "bg-blue-100 text-blue-700 border-blue-200",
    },
    COMPLETATA: {
      label: "Completate",
      color: "bg-green-100 text-green-700 border-green-200",
    },
    BLOCCATA: {
      label: "Bloccate",
      color: "bg-red-100 text-red-700 border-red-200",
    },
    SOSPESA: {
      label: "Sospese",
      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <RadioGroup
          value={viewMode}
          onValueChange={setViewMode}
          id="project-tasks-view"
          className="flex items-center space-x-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="kanban" id="kanban" />
            <Label
              htmlFor="kanban"
              className="flex items-center gap-2 cursor-pointer"
            >
              <LayoutDashboard className="h-4 w-4" />
              Lavagna
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <RadioGroupItem value="table" id="table" />
            <Label
              htmlFor="table"
              className="flex items-center gap-2 cursor-pointer"
            >
              <List className="h-4 w-4" />
              Tabella
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <RadioGroupItem value="gantt" id="gantt" />
            <Label
              htmlFor="gantt"
              className="flex items-center gap-2 cursor-pointer"
            >
              <GanttChartSquare className="h-4 w-4" />
              Gantt
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};

export default TasksViewToggler;
