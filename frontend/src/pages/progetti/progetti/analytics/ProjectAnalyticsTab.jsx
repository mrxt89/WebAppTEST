import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  PieChartIcon,
  RefreshCw,
  Download,
  Clock,
} from "lucide-react";
import { differenceInDays } from "date-fns";
import useProjectActions from "../../../../hooks/useProjectManagementActions";
import { swal } from "../../../../lib/common";
import { config } from "../../../../config";

// Import child components
import CostAnalysis from "./CostAnalysis";
import ProgressAnalysis from "./ProgressAnalysis";
import ResourceAnalysis from "./ResourceAnalysis";
import TimeAnalysis from "./TimeAnalysis";

/**
 * Main component for Analytics Tab
 */
const ProjectAnalyticsTab = ({ project, refreshProject }) => {
  const [activeTab, setActiveTab] = useState("costs");
  const [isLoading, setIsLoading] = useState(false);
  const { getTaskCosts } = useProjectActions();
  const [costData, setCostData] = useState([]);
  const [workHoursData, setWorkHoursData] = useState([]);
  const loadedTaskIds = useRef(new Set());

  // Force re-mount of components by changing a key
  const [forceRefresh, setForceRefresh] = useState(0);

  // Fetch work hours data for the project
  const fetchWorkHoursData = async (projectId) => {
    try {
      if (!projectId) return [];

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/timetracking/projects/${projectId}/summary`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch work hours data");
      }

      const data = await response.json();
      return data.userBreakdown || [];
    } catch (error) {
      console.error("Error fetching work hours:", error);
      return [];
    }
  };

  // Load required data when the project changes
  useEffect(() => {
    const loadData = async () => {
      if (!project || !project.tasks) return;

      setIsLoading(true);
      try {
        // Load costs for all tasks
        const allCosts = [];

        for (const task of project.tasks) {
          // Skip tasks for which we've already loaded the costs
          if (loadedTaskIds.current.has(task.TaskID)) continue;

          try {
            const taskCosts = await getTaskCosts(task.TaskID);
            if (Array.isArray(taskCosts) && taskCosts.length > 0) {
              allCosts.push(...taskCosts);
            }
            // Mark this task as loaded
            loadedTaskIds.current.add(task.TaskID);
          } catch (error) {
            console.error(
              `Error loading costs for task ${task.TaskID}:`,
              error,
            );
          }
        }

        // Also load work hours data
        const hoursData = await fetchWorkHoursData(project.ProjectID);
        setWorkHoursData(hoursData);

        if (allCosts.length > 0) {
          setCostData(allCosts);
          setForceRefresh(Date.now());
        }
      } catch (error) {
        console.error("Error loading analytics data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [project?.ProjectID]);

  // Handle data refresh
  const handleRefresh = async () => {
    setIsLoading(true);

    try {
      await refreshProject();

      // Reset loaded task IDs
      loadedTaskIds.current.clear();

      // Reload all costs
      const allCosts = [];

      if (project && project.tasks) {
        for (const task of project.tasks) {
          try {
            const taskCosts = await getTaskCosts(task.TaskID);
            if (Array.isArray(taskCosts) && taskCosts.length > 0) {
              allCosts.push(...taskCosts);
            }
            loadedTaskIds.current.add(task.TaskID);
          } catch (error) {
            console.error(
              `Error loading costs for task ${task.TaskID}:`,
              error,
            );
          }
        }
      }

      // Reload work hours data
      const hoursData = await fetchWorkHoursData(project.ProjectID);
      setWorkHoursData(hoursData);

      setCostData(allCosts);

      // Forza il re-render
      setForceRefresh((prev) => prev + 1);

      swal.fire({
        title: "Aggiornato",
        text: "Dati aggiornati con successo",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      swal.fire("Errore", "Errore nell'aggiornamento dei dati", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Download a report in CSV format
  const handleDownloadReport = () => {
    try {
      let csvContent = "";
      let filename = "";

      switch (activeTab) {
        case "costs":
          filename = `costi-progetto-${project.ProjectID}.csv`;
          csvContent =
            "Categoria,Descrizione,Quantità,UoM,Costo Unitario,Costo Totale\n";
          costData.forEach((cost) => {
            csvContent += `"${cost.Category || ""}","${cost.Description || ""}",${cost.Qty || 0},"${cost.UoM || ""}",${cost.UnitCost || 0},${cost.TotalCost || 0}\n`;
          });
          break;

        case "progress":
          filename = `avanzamento-progetto-${project.ProjectID}.csv`;
          csvContent =
            "Titolo,Stato,Priorità,Assegnato a,Data Inizio,Data Fine,Giorni\n";
          project.tasks.forEach((task) => {
            csvContent += `"${task.Title || ""}","${task.Status || ""}","${task.Priority || ""}","${task.AssignedToName || ""}","${task.StartDate || ""}","${task.DueDate || ""}",${task.StartDate && task.DueDate ? differenceInDays(new Date(task.DueDate), new Date(task.StartDate)) + 1 : 0}\n`;
          });
          break;

        case "resources":
          filename = `risorse-progetto-${project.ProjectID}.csv`;
          csvContent =
            "Risorsa,Attività Assegnate,Completate,In Corso,In Ritardo,Tasso Completamento,Ore Interne,Ore Esterne\n";

          // Raggruppa le risorse dai dati delle ore lavorate
          const resourcesFromHours = {};
          if (workHoursData && workHoursData.length > 0) {
            workHoursData.forEach((entry) => {
              const userId = entry.userId;
              if (!resourcesFromHours[userId]) {
                resourcesFromHours[userId] = {
                  name: entry.username,
                  internalHours: 0,
                  externalHours: 0,
                };
              }

              if (entry.WorkType === "INTERNO") {
                resourcesFromHours[userId].internalHours +=
                  parseFloat(entry.UserHours) || 0;
              } else if (entry.WorkType === "ESTERNO") {
                resourcesFromHours[userId].externalHours +=
                  parseFloat(entry.UserHours) || 0;
              }
            });
          }

          // Calculate resource statistics
          const workload = {};
          const today = new Date();

          project.tasks.forEach((task) => {
            if (!task.AssignedTo) return;

            if (!workload[task.AssignedTo]) {
              workload[task.AssignedTo] = {
                name: task.AssignedToName,
                assigned: 0,
                completed: 0,
                inProgress: 0,
                delayed: 0,
                internalHours:
                  resourcesFromHours[task.AssignedTo]?.internalHours || 0,
                externalHours:
                  resourcesFromHours[task.AssignedTo]?.externalHours || 0,
              };
            }

            workload[task.AssignedTo].assigned++;

            if (task.Status === "COMPLETATA") {
              workload[task.AssignedTo].completed++;
            } else if (task.Status === "IN ESECUZIONE") {
              workload[task.AssignedTo].inProgress++;
            }

            if (
              new Date(task.DueDate) < today &&
              task.Status !== "COMPLETATA"
            ) {
              workload[task.AssignedTo].delayed++;
            }
          });

          Object.values(workload).forEach((resource) => {
            const completionRate =
              resource.assigned > 0
                ? Math.round((resource.completed / resource.assigned) * 100)
                : 0;

            csvContent += `"${resource.name}",${resource.assigned},${resource.completed},${resource.inProgress},${resource.delayed},${completionRate}%,${resource.internalHours},${resource.externalHours}\n`;
          });
          break;

        case "timeline":
          filename = `timeline-progetto-${project.ProjectID}.csv`;
          csvContent =
            "Titolo,Data Inizio,Data Fine,Durata (giorni),Stato,Ore Lavorate\n";

          // Raggruppa le ore per attività
          const taskHours = {};
          if (workHoursData && workHoursData.length > 0) {
            project.tasks.forEach((task) => {
              const taskEntries = workHoursData.filter(
                (e) => e.TaskID === task.TaskID,
              );
              const totalHours = taskEntries.reduce(
                (sum, entry) => sum + (parseFloat(entry.UserHours) || 0),
                0,
              );
              taskHours[task.TaskID] = totalHours;
            });
          }

          project.tasks.forEach((task) => {
            csvContent += `"${task.Title || ""}","${task.StartDate || ""}","${task.DueDate || ""}",${task.StartDate && task.DueDate ? differenceInDays(new Date(task.DueDate), new Date(task.StartDate)) + 1 : 0},"${task.Status || ""}",${taskHours[task.TaskID] || 0}\n`;
          });
          break;
      }

      // Create a blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      swal.fire({
        title: "Download completato",
        text: "Il report è stato scaricato con successo",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error downloading report:", error);
      swal.fire("Errore", "Errore nel download del report", "error");
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-blue-500" />
            <span>Dashboard di Analisi</span>
          </CardTitle>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              <span>{isLoading ? "Aggiornamento..." : "Aggiorna"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleDownloadReport}
              disabled={isLoading}
            >
              <Download className="h-4 w-4" />
              <span>Esporta CSV</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="flex-grow flex flex-col overflow-hidden">
        <div className="px-6 py-3 border-b">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="costs" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>Costi</span>
              </TabsTrigger>
              <TabsTrigger value="progress" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>Avanzamento</span>
              </TabsTrigger>
              <TabsTrigger
                value="resources"
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                <span>Risorse</span>
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Tempi</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-grow p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="h-10 w-10 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Caricamento dati in corso...</p>
              </div>
            </div>
          ) : (
            <>
              <TabsContent
                value="costs"
                className="m-0 outline-none"
                forceMount={activeTab === "costs"}
              >
                <CostAnalysis
                  key={`cost-analysis-${forceRefresh}`}
                  project={project}
                  costData={costData || []}
                  workHoursData={workHoursData || []}
                  loading={isLoading}
                />
              </TabsContent>

              <TabsContent
                value="progress"
                className="m-0 outline-none"
                forceMount={activeTab === "progress"}
              >
                <ProgressAnalysis
                  key={`progress-analysis-${forceRefresh}`}
                  project={project}
                  costData={costData || []}
                  loading={isLoading}
                />
              </TabsContent>

              <TabsContent
                value="resources"
                className="m-0 outline-none"
                forceMount={activeTab === "resources"}
              >
                <ResourceAnalysis
                  key={`resource-analysis-${forceRefresh}`}
                  costData={costData || []}
                  project={project}
                  workHoursData={workHoursData || []}
                  loading={isLoading}
                />
              </TabsContent>

              <TabsContent
                value="timeline"
                className="m-0 outline-none"
                forceMount={activeTab === "timeline"}
              >
                <TimeAnalysis
                  key={`time-analysis-${forceRefresh}`}
                  costData={costData || []}
                  project={project}
                  workHoursData={workHoursData || []}
                  loading={isLoading}
                />
              </TabsContent>
            </>
          )}
        </ScrollArea>
      </div>
    </Card>
  );
};

export default ProjectAnalyticsTab;
