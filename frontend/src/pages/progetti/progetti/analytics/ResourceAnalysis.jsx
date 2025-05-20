import React, { useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Users, Award, AlertCircle, Clock } from "lucide-react";

// Import skeleton
import ResourceAnalysisSkeleton from "./skeletons/ResourceAnalysisSkeleton";

// Colors for charts
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#8dd1e1",
];

/**
 * Component for resource analysis
 */
const ResourceAnalysis = ({ project, loading, workHoursData = [] }) => {
  const tasks = project.tasks || [];
  const members = project.members || [];

  // Calculate workload per person
  const workloadByPerson = useMemo(() => {
    const workload = {};

    // Add all project members
    members.forEach((member) => {
      workload[member.UserID] = {
        id: member.UserID,
        name: member.userName,
        assigned: 0,
        completed: 0,
        delayed: 0,
        inProgress: 0,
        internalHours: 0,
        externalHours: 0,
      };
    });

    // Add work hours data
    if (workHoursData && workHoursData.length > 0) {
      workHoursData.forEach((entry) => {
        const userId = entry.userId;

        // Ensure the user exists in workload
        if (!workload[userId]) {
          workload[userId] = {
            id: userId,
            name: entry.username,
            assigned: 0,
            completed: 0,
            delayed: 0,
            inProgress: 0,
            internalHours: 0,
            externalHours: 0,
          };
        }

        // Add hours based on work type
        if (entry.WorkType === "INTERNO") {
          workload[userId].internalHours += parseFloat(entry.UserHours) || 0;
        } else if (entry.WorkType === "ESTERNO") {
          workload[userId].externalHours += parseFloat(entry.UserHours) || 0;
        }
      });
    }

    // Calculate statistics for each task
    const today = new Date();
    tasks.forEach((task) => {
      if (!task.AssignedTo) return;

      // If a record doesn't exist for this user yet, create it
      if (!workload[task.AssignedTo]) {
        workload[task.AssignedTo] = {
          id: task.AssignedTo,
          name: task.AssignedToName,
          assigned: 0,
          completed: 0,
          delayed: 0,
          inProgress: 0,
          internalHours: 0,
          externalHours: 0,
        };
      }

      // Update statistics
      workload[task.AssignedTo].assigned++;

      if (task.Status === "COMPLETATA") {
        workload[task.AssignedTo].completed++;
      } else if (task.Status === "IN ESECUZIONE") {
        workload[task.AssignedTo].inProgress++;
      }

      if (new Date(task.DueDate) < today && task.Status !== "COMPLETATA") {
        workload[task.AssignedTo].delayed++;
      }
    });

    // Convert to array and calculate completion percentage
    return Object.values(workload)
      .filter(
        (person) =>
          person.assigned > 0 ||
          person.internalHours > 0 ||
          person.externalHours > 0,
      )
      .map((person) => ({
        ...person,
        completionRate:
          person.assigned > 0
            ? Math.round((person.completed / person.assigned) * 100)
            : 0,
        totalHours: person.internalHours + person.externalHours,
      }))
      .sort((a, b) => b.assigned - a.assigned);
  }, [tasks, members, workHoursData]);

  // Data for workload chart
  const workloadChartData = useMemo(() => {
    return workloadByPerson
      .map((person) => ({
        name: person.name,
        assigned: person.assigned,
        completed: person.completed,
        inProgress: person.inProgress,
        delayed: person.delayed,
      }))
      .slice(0, 10); // Limit to 10 for readability
  }, [workloadByPerson]);

  // Data for hours chart
  const hoursChartData = useMemo(() => {
    return workloadByPerson
      .filter((person) => person.internalHours > 0 || person.externalHours > 0)
      .map((person) => ({
        name: person.name,
        internal: person.internalHours,
        external: person.externalHours,
      }))
      .sort((a, b) => b.internal + b.external - (a.internal + a.external))
      .slice(0, 10); // Limit to 10 for readability
  }, [workloadByPerson]);

  // Data for performance chart
  const performanceChartData = useMemo(() => {
    return workloadByPerson
      .filter((person) => person.assigned >= 2) // Only people with a minimum of tasks
      .map((person) => ({
        name: person.name,
        completionRate: person.completionRate,
      }))
      .sort((a, b) => b.completionRate - a.completionRate);
  }, [workloadByPerson]);

  // Calculate top performers
  const topPerformers = useMemo(() => {
    return [...workloadByPerson]
      .filter((person) => person.assigned >= 2) // Only with enough tasks
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 3); // Top 3
  }, [workloadByPerson]);

  if (loading) {
    return <ResourceAnalysisSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          <span>Analisi delle Risorse</span>
        </h3>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="text-blue-700 mb-2 font-medium">
                Persone Coinvolte
              </h4>
              <div className="text-3xl font-bold text-blue-600">
                {workloadByPerson.length}
              </div>
              <div className="text-sm text-blue-600 mt-1">risorse attive</div>
              <div className="flex justify-center mt-2">
                <Badge className="bg-white text-blue-600 border border-blue-200">
                  <Users className="h-3 w-3 mr-1" />
                  {members.length} membri nel team
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="text-emerald-700 mb-2 font-medium">
                Tasso Medio Completamento
              </h4>
              <div className="text-3xl font-bold text-emerald-600">
                {workloadByPerson.length > 0
                  ? Math.round(
                      workloadByPerson.reduce(
                        (sum, p) => sum + p.completionRate,
                        0,
                      ) / workloadByPerson.length,
                    )
                  : 0}
                %
              </div>
              <div className="text-sm text-emerald-600 mt-1">
                efficienza complessiva
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="text-purple-700 mb-2 font-medium">
                Attività in Corso
              </h4>
              <div className="text-3xl font-bold text-purple-600">
                {tasks.filter((t) => t.Status === "IN ESECUZIONE").length}
              </div>
              <div className="text-sm text-purple-600 mt-1">
                attività in esecuzione
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="text-amber-700 mb-2 font-medium">
                Ore Totali Registrate
              </h4>
              <div className="text-3xl font-bold text-amber-600">
                {workloadByPerson
                  .reduce((sum, p) => sum + p.totalHours, 0)
                  .toFixed(1)}
                h
              </div>
              <div className="text-sm text-amber-600 mt-1">
                su tutte le attività
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Workload */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">
              Distribuzione del Carico di Lavoro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="resource-chart-container">
              {workloadChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350} minHeight={350}>
                  <BarChart
                    data={workloadChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    layout="vertical"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={true}
                      vertical={false}
                    />
                    <XAxis type="number" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <RechartsTooltip />
                    <Legend verticalAlign="top" height={36} />
                    <Bar
                      name="Completate"
                      dataKey="completed"
                      stackId="a"
                      fill="#10b981"
                    />
                    <Bar
                      name="In Corso"
                      dataKey="inProgress"
                      stackId="a"
                      fill="#3b82f6"
                    />
                    <Bar
                      name="In Ritardo"
                      dataKey="delayed"
                      stackId="a"
                      fill="#ef4444"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[350px] text-gray-500">
                  <AlertCircle className="h-12 w-12 mb-2 text-gray-300" />
                  <p className="text-gray-500">
                    Nessun dato sul carico di lavoro
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Assegna delle attività per visualizzare le statistiche
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers.length > 0 ? (
              <div className="space-y-6">
                {topPerformers.map((person, index) => (
                  <div key={person.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <Award className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="font-medium">{person.name}</span>
                      </div>
                      <Badge
                        className={`${
                          person.completionRate >= 75
                            ? "bg-green-100 text-green-700"
                            : person.completionRate >= 50
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {person.completionRate}%
                      </Badge>
                    </div>
                    <Progress
                      value={person.completionRate}
                      className="h-2 bg-gray-100"
                      indicatorClassName={
                        person.completionRate >= 75
                          ? "bg-green-500"
                          : person.completionRate >= 50
                            ? "bg-blue-500"
                            : "bg-amber-500"
                      }
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{person.completed} completate</span>
                      <span>{person.assigned} totali</span>
                    </div>
                  </div>
                ))}

                {/* Additional stats */}
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-500 mb-1">
                        Task Completate
                      </div>
                      <div className="text-xl font-semibold text-green-600">
                        {tasks.filter((t) => t.Status === "COMPLETATA").length}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-500 mb-1">
                        Task Pendenti
                      </div>
                      <div className="text-xl font-semibold text-blue-600">
                        {tasks.filter((t) => t.Status !== "COMPLETATA").length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[350px] text-gray-500">
                <Award className="h-12 w-12 mb-2 text-gray-300" />
                <p className="text-gray-500">Nessun dato sulle performance</p>
                <p className="text-sm text-gray-400 mt-1">
                  Completare più attività per visualizzare i top performer
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hours chart */}
      {hoursChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Distribuzione Ore di Lavoro</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="resource-chart-container">
              <ResponsiveContainer width="100%" height={350} minHeight={350}>
                <BarChart
                  data={hoursChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  layout="vertical"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <RechartsTooltip
                    formatter={(value) => [`${value.toFixed(2)}h`, ""]}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar
                    name="Ore Interne"
                    dataKey="internal"
                    stackId="a"
                    fill="#4682B4"
                  />
                  <Bar
                    name="Ore Esterne"
                    dataKey="external"
                    stackId="a"
                    fill="#82ca9d"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-500">
            Dettaglio Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">
                      Persona
                    </th>
                    <th className="text-center py-2 px-4 text-sm font-medium text-gray-500">
                      Assegnate
                    </th>
                    <th className="text-center py-2 px-4 text-sm font-medium text-gray-500">
                      Completate
                    </th>
                    <th className="text-center py-2 px-4 text-sm font-medium text-gray-500">
                      In Corso
                    </th>
                    <th className="text-center py-2 px-4 text-sm font-medium text-gray-500">
                      In Ritardo
                    </th>
                    <th className="text-center py-2 px-4 text-sm font-medium text-gray-500">
                      Completamento
                    </th>
                    <th className="text-center py-2 px-4 text-sm font-medium text-gray-500">
                      Ore Interne
                    </th>
                    <th className="text-center py-2 px-4 text-sm font-medium text-gray-500">
                      Ore Esterne
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {workloadByPerson.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-4 text-gray-500"
                      >
                        Nessun dato disponibile
                      </td>
                    </tr>
                  ) : (
                    workloadByPerson.map((person) => (
                      <tr key={person.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{person.name}</td>
                        <td className="text-center py-3 px-4">
                          {person.assigned}
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            {person.completed}
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200"
                          >
                            {person.inProgress}
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge
                            variant={
                              person.delayed > 0 ? "destructive" : "outline"
                            }
                            className={
                              person.delayed > 0 ? "" : "text-gray-400"
                            }
                          >
                            {person.delayed}
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge
                            variant="outline"
                            className={`
                              ${
                                person.completionRate > 75
                                  ? "bg-green-100 text-green-700 border-green-200"
                                  : person.completionRate > 50
                                    ? "bg-blue-100 text-blue-700 border-blue-200"
                                    : "bg-amber-100 text-amber-700 border-amber-200"
                              }
                            `}
                          >
                            {person.completionRate}%
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-4">
                          {person.internalHours > 0 ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {person.internalHours.toFixed(1)}h
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          {person.externalHours > 0 ? (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              {person.externalHours.toFixed(1)}h
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResourceAnalysis;
