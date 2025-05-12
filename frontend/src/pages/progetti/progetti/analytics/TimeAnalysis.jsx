import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, PieChart, Pie, 
  CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Calendar, Clock, AlertCircle, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { it } from 'date-fns/locale';

// Import skeleton
import TimeAnalysisSkeleton from './skeletons/TimeAnalysisSkeleton';

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

/**
 * Component for time analysis
 */
const TimeAnalysis = ({ project, loading, workHoursData = [] }) => {
  const tasks = project.tasks || [];
  
  // Data for the temporal distribution of tasks
  const timelineData = useMemo(() => {
    if (tasks.length === 0 || !project.StartDate || !project.EndDate) return [];
    
    // Divide the project period into months
    const projectStart = new Date(project.StartDate);
    const projectEnd = new Date(project.EndDate);
    
    const months = [];
    const currentDate = new Date(projectStart);
    currentDate.setDate(1); // First day of the month
    
    while (currentDate <= projectEnd) {
      months.push(format(currentDate, 'yyyy-MM'));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    // Count tasks for each month
    const tasksByMonth = {};
    months.forEach(month => {
      tasksByMonth[month] = {
        month: format(new Date(month), 'MMM yyyy', { locale: it }),
        planned: 0,
        completed: 0,
        active: 0,
        delayed: 0,
        hours: 0
      };
    });
    
    // Add work hours data to months
    if (workHoursData && workHoursData.length > 0) {
      workHoursData.forEach(entry => {
        // Extract month from work date if available
        if (entry.WorkDate) {
          const workDateMonth = format(new Date(entry.WorkDate), 'yyyy-MM');
          if (tasksByMonth[workDateMonth]) {
            tasksByMonth[workDateMonth].hours += parseFloat(entry.UserHours) || 0;
          }
        }
      });
    }
    
    const today = new Date();
    tasks.forEach(task => {
      const taskStart = new Date(task.StartDate);
      const taskDue = new Date(task.DueDate);
      
      // Find the months in which this task is planned
      months.forEach(month => {
        const [year, monthNum] = month.split('-');
        const monthStart = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
        const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0); // Last day of the month
        
        // Check if the task falls in this month
        if ((taskStart <= monthEnd && taskDue >= monthStart)) {
          tasksByMonth[month].planned++;
          
          // Check status
          if (task.Status === 'COMPLETATA') {
            tasksByMonth[month].completed++;
          } else if (task.Status === 'IN ESECUZIONE') {
            tasksByMonth[month].active++;
          }
          
          // Check if it's delayed
          if (taskDue < today && task.Status !== 'COMPLETATA') {
            tasksByMonth[month].delayed++;
          }
        }
      });
    });
    
    return Object.values(tasksByMonth);
  }, [tasks, project, workHoursData]);
  
  // Calculate delayed tasks
  const delayedTasks = useMemo(() => {
    const today = new Date();
    return tasks.filter(task => {
      const dueDate = new Date(task.DueDate);
      return dueDate < today && task.Status !== 'COMPLETATA';
    });
  }, [tasks]);
  
  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(task => task.Status === 'COMPLETATA').length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks]);

  // Dati per il burndown chart
  const burndownData = useMemo(() => {
    if (tasks.length === 0) return [];
    
    // Ordina le task per data di completamento
    const sortedTasks = [...tasks]
      .filter(task => task.Status === 'COMPLETATA')
      .sort((a, b) => new Date(a.TBModified || a.TBCreated) - new Date(b.TBModified || b.TBCreated));
    
    const result = [];
    let remainingTasks = tasks.length;
    
    // Aggiungi punto iniziale
    if (project.StartDate) {
      result.push({
        date: format(new Date(project.StartDate), 'dd/MM/yyyy'),
        remaining: remainingTasks,
        ideal: remainingTasks
      });
    }
    
    // Aggiungi punti per ogni task completata
    sortedTasks.forEach(task => {
      remainingTasks--;
      result.push({
        date: format(new Date(task.TBModified || task.TBCreated), 'dd/MM/yyyy'),
        remaining: remainingTasks,
        ideal: null // Calcoleremo questo dopo
      });
    });
    
    // Calcola la linea ideale
    if (result.length > 1 && project.EndDate) {
      const totalDays = differenceInDays(new Date(project.EndDate), new Date(project.StartDate));
      const tasksPerDay = tasks.length / totalDays;
      
      result.forEach((point, index) => {
        if (index === 0) return;
        const daysPassed = differenceInDays(
          new Date(point.date.split('/').reverse().join('-')), 
          new Date(result[0].date.split('/').reverse().join('-'))
        );
        point.ideal = Math.max(0, Math.round(tasks.length - (daysPassed * tasksPerDay)));
      });
      
      // Aggiungi punto finale
      result.push({
        date: format(new Date(project.EndDate), 'dd/MM/yyyy'),
        remaining: remainingTasks,
        ideal: 0
      });
    }
    
    return result;
  }, [tasks, project]);

  // Stati delle priorità
  const priorityStats = useMemo(() => {
    const stats = {
      'ALTA': 0,
      'MEDIA': 0,
      'BASSA': 0
    };
    
    tasks.forEach(task => {
      if (stats[task.Priority] !== undefined) {
        stats[task.Priority]++;
      }
    });
    
    return Object.entries(stats).map(([name, value]) => ({
      name,
      value
    }));
  }, [tasks]);

  // Calculate work hours statistics by task
  const workHoursByTask = useMemo(() => {
    if (!workHoursData || workHoursData.length === 0) return {};
    
    const taskHours = {};
    tasks.forEach(task => {
      taskHours[task.TaskID] = {
        taskId: task.TaskID,
        taskTitle: task.Title,
        totalHours: 0,
        internalHours: 0,
        externalHours: 0
      };
    });
    
    // Aggregate hours by task
    workHoursData.forEach(entry => {
      if (!taskHours[entry.TaskID]) return;
      
      taskHours[entry.TaskID].totalHours += parseFloat(entry.UserHours) || 0;
      
      if (entry.WorkType === 'INTERNO') {
        taskHours[entry.TaskID].internalHours += parseFloat(entry.UserHours) || 0;
      } else if (entry.WorkType === 'ESTERNO') {
        taskHours[entry.TaskID].externalHours += parseFloat(entry.UserHours) || 0;
      }
    });
    
    return Object.values(taskHours)
      .filter(task => task.totalHours > 0)
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [workHoursData, tasks]);

  // Calculate total work hours
  const totalWorkHours = useMemo(() => {
    if (!workHoursByTask || workHoursByTask.length === 0) return { total: 0, internal: 0, external: 0 };
    
    return workHoursByTask.reduce(
      (acc, task) => ({
        total: acc.total + task.totalHours,
        internal: acc.internal + task.internalHours,
        external: acc.external + task.externalHours
      }),
      { total: 0, internal: 0, external: 0 }
    );
  }, [workHoursByTask]);

  // Data for task hours chart
  const taskHoursChartData = useMemo(() => {
    return [...workHoursByTask]
      .slice(0, 8) // Limit for readability
      .map(task => ({
        name: task.taskTitle,
        internal: parseFloat(task.internalHours.toFixed(1)),
        external: parseFloat(task.externalHours.toFixed(1))
      }));
  }, [workHoursByTask]);

  // Calculate average task duration
  const averageDuration = useMemo(() => {
    if (tasks.length === 0) return 0;
    
    let totalDuration = 0;
    tasks.forEach(task => {
      const startDate = new Date(task.StartDate);
      const dueDate = new Date(task.DueDate);
      const duration = differenceInDays(dueDate, startDate) + 1; // +1 to include both days
      totalDuration += duration;
    });
    
    return Math.round(totalDuration / tasks.length);
  }, [tasks]);

  // Calculate average hours per task
  const averageHoursPerTask = useMemo(() => {
    if (tasks.length === 0 || totalWorkHours.total === 0) return 0;
    return (totalWorkHours.total / tasks.length).toFixed(1);
  }, [tasks, totalWorkHours]);

  // Statistics on task durations
  const taskDurationStats = useMemo(() => {
    if (tasks.length === 0) return { short: 0, medium: 0, long: 0 };
    
    return tasks.reduce((stats, task) => {
      const startDate = new Date(task.StartDate);
      const dueDate = new Date(task.DueDate);
      const duration = differenceInDays(dueDate, startDate) + 1;
      
      if (duration <= 3) stats.short++;
      else if (duration <= 7) stats.medium++;
      else stats.long++;
      
      return stats;
    }, { short: 0, medium: 0, long: 0 });
  }, [tasks]);

  // Data for the duration chart
  const durationChartData = useMemo(() => [
    { name: '1-3 giorni', value: taskDurationStats.short },
    { name: '4-7 giorni', value: taskDurationStats.medium },
    { name: '8+ giorni', value: taskDurationStats.long }
  ], [taskDurationStats]);

  if (loading) {
    return <TimeAnalysisSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-500" />
          <span>Analisi Temporale</span>
        </h3>
      </div>

      {/* First row: KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="text-blue-700 mb-2 font-medium">Durata del Progetto</h4>
              <div className="text-3xl font-bold text-blue-600">
                {project.StartDate && project.EndDate ? 
                  differenceInDays(new Date(project.EndDate), new Date(project.StartDate)) + 1 : 
                  '-'}
              </div>
              <div className="text-sm text-blue-600 mt-1">giorni</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="text-emerald-700 mb-2 font-medium">Durata Media Attività</h4>
              <div className="text-3xl font-bold text-emerald-600">{averageDuration}</div>
              <div className="text-sm text-emerald-600 mt-1">giorni per attività</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="text-amber-700 mb-2 font-medium">Ore di Lavoro Totali</h4>
              <div className="text-3xl font-bold text-amber-600">{totalWorkHours.total.toFixed(1)}</div>
              <div className="text-sm text-amber-600 mt-1">
                {averageHoursPerTask}h per attività
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Temporal distribution */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Distribuzione Temporale delle Attività</CardTitle>
          </CardHeader>
          <CardContent>
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={timelineData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" orientation="left" label={{ value: 'Attività', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Ore', angle: 90, position: 'insideRight' }} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar yAxisId="left" name="Pianificate" dataKey="planned" stackId="a" fill="#94a3b8" />
                  <Bar yAxisId="left" name="Completate" dataKey="completed" stackId="b" fill="#10b981" />
                  <Bar yAxisId="left" name="In Corso" dataKey="active" stackId="b" fill="#3b82f6" />
                  <Bar yAxisId="left" name="In Ritardo" dataKey="delayed" stackId="b" fill="#ef4444" />
                  <Bar yAxisId="right" name="Ore Lavorate" dataKey="hours" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
                <AlertCircle className="h-12 w-12 mb-2 text-gray-300" />
                <p className="text-gray-500">Dati temporali insufficienti</p>
                <p className="text-sm text-gray-400 mt-1">Il progetto deve avere date di inizio e fine definite</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Duration distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Distribuzione Durate</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={durationChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={true}
                  >
                    <Cell fill="#38bdf8" /> {/* Short */}
                    <Cell fill="#4ade80" /> {/* Medium */}
                    <Cell fill="#f59e0b" /> {/* Long */}
                  </Pie>
                  <Legend />
                  <RechartsTooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <p>Nessuna attività disponibile</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hours distribution by task */}
      {taskHoursChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Distribuzione Ore per Attività</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={taskHoursChartData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={150}
                  tick={{fontSize: 12}}
                />
                <RechartsTooltip formatter={(value) => [`${value}h`, '']} />
                <Legend />
                <Bar name="Ore Interne" dataKey="internal" stackId="a" fill="#4682B4" />
                <Bar name="Ore Esterne" dataKey="external" stackId="a" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {project.StartDate && project.EndDate && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Timeframe del Progetto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Timeline visual */}
              <div className="relative pt-5 pb-3">
                <div className="absolute left-0 right-0 h-1 top-7 bg-gray-200"></div>
                <div className="flex justify-between relative">
                  <div className="text-center">
                    <div className="rounded-full h-5 w-5 bg-blue-500 mx-auto mb-1 relative z-10"></div>
                    <div className="text-sm font-medium">{format(new Date(project.StartDate), 'dd/MM/yyyy')}</div>
                    <div className="text-xs text-gray-500">Inizio</div>
                  </div>
                  <div className="text-center">
                    <div className="rounded-full h-5 w-5 bg-amber-500 mx-auto mb-1 relative z-10"></div>
                    <div className="text-sm font-medium">{format(new Date(), 'dd/MM/yyyy')}</div>
                    <div className="text-xs text-gray-500">Oggi</div>
                  </div>
                  <div className="text-center">
                    <div className="rounded-full h-5 w-5 bg-green-500 mx-auto mb-1 relative z-10"></div>
                    <div className="text-sm font-medium">{format(new Date(project.EndDate), 'dd/MM/yyyy')}</div>
                    <div className="text-xs text-gray-500">Fine</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Temporal details */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-700">Dettagli Temporali</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Data di Inizio:</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {format(new Date(project.StartDate), 'dd MMMM yyyy', { locale: it })}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Data di Fine:</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {format(new Date(project.EndDate), 'dd MMMM yyyy', { locale: it })}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Durata:</span>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {differenceInDays(new Date(project.EndDate), new Date(project.StartDate)) + 1} giorni
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Prima Attività:</span>
                      <Badge variant="outline" className="bg-gray-50 text-gray-700">
                        {tasks.length > 0 ? 
                          format(new Date(Math.min(...tasks.map(t => new Date(t.StartDate)))), 'dd/MM/yyyy') : 
                          'N/A'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Ultima Scadenza:</span>
                      <Badge variant="outline" className="bg-gray-50 text-gray-700">
                        {tasks.length > 0 ? 
                          format(new Date(Math.max(...tasks.map(t => new Date(t.DueDate)))), 'dd/MM/yyyy') : 
                          'N/A'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Hours Details */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-700">Dettagli Ore di Lavoro</h4>
                  {totalWorkHours.total > 0 ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Ore Totali:</span>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {totalWorkHours.total.toFixed(1)}h
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Ore Interne:</span>
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                          {totalWorkHours.internal.toFixed(1)}h ({((totalWorkHours.internal / totalWorkHours.total) * 100).toFixed(1)}%)
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Ore Esterne:</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {totalWorkHours.external.toFixed(1)}h ({((totalWorkHours.external / totalWorkHours.total) * 100).toFixed(1)}%)
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Media per Attività:</span>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {averageHoursPerTask}h
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Attività con Ore:</span>
                        <Badge variant="outline" className="bg-gray-50 text-gray-700">
                          {workHoursByTask.length} di {tasks.length} ({Math.round((workHoursByTask.length / tasks.length) * 100)}%)
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-gray-50 rounded-lg text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>Nessuna ora di lavoro registrata</p>
                      <p className="text-sm mt-1">Utilizza il timesheet per registrare le ore</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Burndown Chart */}
      {burndownData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Burndown Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'Attività Rimanenti', angle: -90, position: 'insideLeft' }} />
                <RechartsTooltip />
                <Legend />
                <Line 
                  type="stepAfter" 
                  dataKey="remaining" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  name="Attività Rimanenti" 
                />
                <Line 
                  type="linear" 
                  dataKey="ideal" 
                  stroke="#94a3b8" 
                  strokeDasharray="5 5" 
                  name="Avanzamento Ideale" 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-500">Dettaglio per Stato</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Object.entries({
              'COMPLETATA': { color: '#10b981', label: 'Completate' },
              'IN ESECUZIONE': { color: '#3b82f6', label: 'In Esecuzione' },
              'BLOCCATA': { color: '#ef4444', label: 'Bloccate' },
              'SOSPESA': { color: '#f59e0b', label: 'Sospese' },
              'DA FARE': { color: '#94a3b8', label: 'Da Fare' }
            }).map(([status, {color, label}]) => {
              const count = tasks.filter(t => t.Status === status).length;
              const percentage = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0;
              
              // Calculate hours for this status
              const hoursForStatus = workHoursByTask
                .filter(t => {
                  const task = tasks.find(task => task.TaskID === t.taskId);
                  return task && task.Status === status;
                })
                .reduce((sum, t) => sum + t.totalHours, 0);
              
              return (
                <div key={status} className="p-3 rounded-lg border" style={{ borderColor: color, backgroundColor: `${color}10` }}>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium" style={{ color }}>{label}</span>
                      <Badge variant="outline" style={{ backgroundColor: 'white', color, borderColor: color }}>
                        {count}
                      </Badge>
                    </div>
                    <Progress value={percentage} className="h-2 mb-1 bg-gray-100" style={{ '--progress-color': color }} />
                    <span className="text-xs text-gray-500 flex justify-between mt-1">
                      <span>{percentage}%</span>
                      {hoursForStatus > 0 && (
                        <span className="font-medium" style={{ color }}>
                          {hoursForStatus.toFixed(1)}h
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeAnalysis;