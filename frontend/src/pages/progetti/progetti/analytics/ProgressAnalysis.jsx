import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import { PieChart, Pie, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

// Importa lo skeleton
import ProgressAnalysisSkeleton from './skeletons/ProgressAnalysisSkeleton';

// Colori per i grafici
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];
const STATUS_COLORS = {
  'COMPLETATA': '#10b981',
  'IN ESECUZIONE': '#3b82f6',
  'BLOCCATA': '#ef4444',
  'SOSPESA': '#f59e0b',
  'DA FARE': '#94a3b8'
};

/**
 * Componente per l'analisi di avanzamento
 */
const ProgressAnalysis = ({ project, loading }) => {
  const tasks = project.tasks || [];
  
  // Calcola statistiche sullo stato delle attività
  const statusStats = useMemo(() => {
    const stats = {
      'COMPLETATA': 0,
      'IN ESECUZIONE': 0,
      'BLOCCATA': 0,
      'SOSPESA': 0,
      'DA FARE': 0
    };
    
    tasks.forEach(task => {
      if (stats[task.Status] !== undefined) {
        stats[task.Status]++;
      }
    });
    
    return Object.entries(stats).map(([name, value]) => ({
      name,
      value
    }));
  }, [tasks]);
  
  // Calcola le attività in ritardo
  const delayedTasks = useMemo(() => {
    const today = new Date();
    return tasks.filter(task => {
      const dueDate = new Date(task.DueDate);
      return dueDate < today && task.Status !== 'COMPLETATA';
    });
  }, [tasks]);
  
  // Calcola il completamento percentuale
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

  if (loading) {
    return <ProgressAnalysisSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          <span>Analisi di Avanzamento</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="text-blue-700 mb-2 font-medium">Completamento</h4>
              <div className="text-3xl font-bold text-blue-600">{completionPercentage}%</div>
              <div className="text-sm text-blue-600 mt-1">
                {tasks.filter(t => t.Status === 'COMPLETATA').length} di {tasks.length} attività
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="text-red-700 mb-2 font-medium">Attività in Ritardo</h4>
              <div className="text-3xl font-bold text-red-600">{delayedTasks.length}</div>
              <div className="text-sm text-red-600 mt-1">
                {tasks.length > 0 ? Math.round((delayedTasks.length / tasks.length) * 100) : 0}% del totale
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="text-green-700 mb-2 font-medium">Completate</h4>
              <div className="text-3xl font-bold text-green-600">
                {tasks.filter(t => t.Status === 'COMPLETATA').length}
              </div>
              <div className="text-sm text-green-600 mt-1">
                attività
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="text-yellow-700 mb-2 font-medium">In Esecuzione</h4>
              <div className="text-3xl font-bold text-yellow-600">
                {tasks.filter(t => t.Status === 'IN ESECUZIONE').length}
              </div>
              <div className="text-sm text-yellow-600 mt-1">
                attività
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Stato delle Attività</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                {statusStats.some(s => s.value > 0) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={statusStats.filter(s => s.value > 0)}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusStats.filter(s => s.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-gray-500">
                    <span>Nessuna attività disponibile</span>
                  </div>
                )}
              </div>
              <div>
                {priorityStats.some(s => s.value > 0) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={priorityStats.filter(s => s.value > 0)}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#ef4444" /> {/* ALTA */}
                        <Cell fill="#f59e0b" /> {/* MEDIA */}
                        <Cell fill="#10b981" /> {/* BASSA */}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-gray-500">
                    <span>Nessuna attività disponibile</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Burndown Chart</CardTitle>
          </CardHeader>
          <CardContent>
            {burndownData.length > 1 ? (
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
            ) : (
              <div className="flex items-center justify-center h-[250px] text-gray-500">
                <span>Dati insufficienti per il burndown chart</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Dettaglio per Stato</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {Object.entries(STATUS_COLORS).map(([status, color]) => {
                    const count = tasks.filter(t => t.Status === status).length;
                    const percentage = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0;
                    
                    return (
                      <div key={status} className="p-3 rounded-lg border" style={{ borderColor: color, backgroundColor: `${color}10` }}>
                        <div className="flex flex-col h-full">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium" style={{ color }}>{status}</span>
                            <Badge variant="outline" style={{ backgroundColor: 'white', color, borderColor: color }}>
                              {count}
                            </Badge>
                          </div>
                          <Progress value={percentage} className="h-2 mb-1 bg-gray-100" style={{ '--progress-color': color }} />
                          <span className="text-xs text-gray-500 mt-auto">{percentage}%</span>
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

export default ProgressAnalysis;