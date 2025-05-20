import React from "react";
import {
  LayoutGrid,
  List,
  Calendar,
  PieChart,
  SlidersHorizontal,
} from "lucide-react";

const TasksViewToggler = ({
  viewMode,
  setViewMode,
  showFilters,
  toggleFilters,
}) => {
  return (
    <div className="flex items-center space-x-2" id="tasks-view-toggler">
      {/* Toggler per mostrare/nascondere i filtri */}
      <button
        onClick={toggleFilters}
        className={`flex items-center justify-center p-2 border rounded-md ${
          showFilters
            ? "bg-blue-50 text-blue-600 border-blue-200"
            : "bg-white text-gray-500 hover:bg-gray-100 border-gray-200"
        }`}
        title={showFilters ? "Nascondi filtri" : "Mostra filtri"}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>

      {/* Toggler per le visualizzazioni */}
      <div className="flex items-center bg-white border rounded-md shadow-sm">
        <button
          onClick={() => setViewMode("list")}
          className={`flex items-center justify-center p-2 ${
            viewMode === "list"
              ? "bg-blue-50 text-blue-600 border-blue-200"
              : "text-gray-500 hover:bg-gray-100"
          }`}
          title="Visualizzazione lista"
        >
          <List className="h-4 w-4" />
        </button>

        <button
          onClick={() => setViewMode("kanban")}
          className={`flex items-center justify-center p-2 ${
            viewMode === "kanban"
              ? "bg-blue-50 text-blue-600 border-blue-200"
              : "text-gray-500 hover:bg-gray-100"
          }`}
          title="Visualizzazione kanban"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>

        <button
          onClick={() => setViewMode("timeline")}
          className={`flex items-center justify-center p-2 ${
            viewMode === "timeline"
              ? "bg-blue-50 text-blue-600 border-blue-200"
              : "text-gray-500 hover:bg-gray-100"
          }`}
          title="Visualizzazione scadenze"
        >
          <Calendar className="h-4 w-4" />
        </button>

        <button
          onClick={() => setViewMode("statistics")}
          className={`flex items-center justify-center p-2 ${
            viewMode === "statistics"
              ? "bg-blue-50 text-blue-600 border-blue-200"
              : "text-gray-500 hover:bg-gray-100"
          }`}
          title="Visualizzazione statistiche"
        >
          <PieChart className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default TasksViewToggler;
