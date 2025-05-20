import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, BarChart as BarChart2 } from "lucide-react";
import EnhancedTimesheet from "./EnhancedTimesheet";
import TimeReportsView from "./TimeReportsView";
import useTimeTracking from "../../../hooks/useTimeTracking";

// Componente principale per la scheda di tracciamento del tempo
const MyTasksTimeTracking = ({
  currentUserId,
  isAdmin = false,
  users = [],
}) => {
  const [activeView, setActiveView] = useState("timesheet");
  const { isUserAdmin } = useTimeTracking();

  // Verifica se l'utente è effettivamente admin (usando i gruppi)
  const userHasAdminRights = isAdmin || isUserAdmin();

  return (
    <div className="space-y-6" id="task-time-tracking">
      {/* Header con sezioni */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Clock className="mr-2 h-6 w-6 text-blue-600" />
            Timesheet e reportistica
          </h2>
          <p className="text-gray-500 mt-1">
            Gestisci e monitora le ore lavorate sui progetti
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tabs
            defaultValue="timesheet"
            className="w-[300px]"
            onValueChange={setActiveView}
          >
            <TabsList className="grid grid-cols-2">
              <TabsTrigger
                value="timesheet"
                className="flex items-center gap-1"
              >
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Quadratura</span>
              </TabsTrigger>
              <TabsTrigger value="report" className="flex items-center gap-1">
                <BarChart2 className="h-4 w-4" />
                <span className="hidden sm:inline">Report</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Contenuto principale */}
      <div>
        {activeView === "timesheet" && (
          <EnhancedTimesheet
            currentUserId={currentUserId}
            isAdmin={userHasAdminRights}
            users={users}
          />
        )}

        {activeView === "report" && (
          <TimeReportsView
            currentUserId={currentUserId}
            isAdmin={userHasAdminRights}
            users={users}
          />
        )}
      </div>
    </div>
  );
};

export default MyTasksTimeTracking;
