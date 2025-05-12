import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle,
  Calendar,
  User,
  Users,
  BellRing,
  Activity
} from 'lucide-react';

const TasksStatistics = ({ tasks, isAdmin = false }) => {
  // Configurazione colori per le visualizzazioni
  const COLORS = {
    status: {
      'DA FARE': '#94a3b8',
      'IN ESECUZIONE': '#3b82f6',
      'COMPLETATA': '#10b981',
      'BLOCCATA': '#ef4444',
      'SOSPESA': '#f59e0b'
    },
    priority: {
      'ALTA': '#ef4444',
      'MEDIA': '#f59e0b',
      'BASSA': '#10b981'
    },
    timeline: {
      'In ritardo': '#ef4444',
      'Questa settimana': '#3b82f6',
      'Più avanti': '#94a3b8'
    },
    default: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']
  };

  // Funzione per renderizzare etichette nei grafici a torta
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Calcola statistiche basate sulle attività filtrate
  const statistics = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        upcomingTasks: 0,
        delayedTasks: 0,
        completionRate: 0,
        statusDistribution: [],
        priorityDistribution: [],
        timelineDistribution: [],
        assigneeDistribution: [],
        participantsCount: 0
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const nextMonth = new Date(today);
    nextMonth.setDate(today.getDate() + 30);

    // Base statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.Status === 'COMPLETATA').length;
    const inProgressTasks = tasks.filter(task => task.Status === 'IN ESECUZIONE').length;
    const upcomingTasks = tasks.filter(task => {
      if (task.Status === 'COMPLETATA') return false;
      if (!task.DueDate) return false;
      const dueDate = new Date(task.DueDate);
      return dueDate >= today && dueDate <= nextWeek;
    }).length;
    const delayedTasks = tasks.filter(task => {
      if (task.Status === 'COMPLETATA') return false;
      if (!task.DueDate) return false;
      const dueDate = new Date(task.DueDate);
      return dueDate < today;
    }).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Status distribution for visualization
    const statusCount = tasks.reduce((acc, task) => {
      acc[task.Status] = (acc[task.Status] || 0) + 1;
      return acc;
    }, {});

    const statusDistribution = Object.entries(statusCount).map(([name, value]) => ({ name, value }));

    // Priority distribution for visualization
    const priorityCount = tasks.reduce((acc, task) => {
      acc[task.Priority] = (acc[task.Priority] || 0) + 1;
      return acc;
    }, {});

    const priorityDistribution = Object.entries(priorityCount).map(([name, value]) => ({ name, value }));

    // Timeline distribution for visualization
    const timelineDistribution = [
      { name: 'In ritardo', value: delayedTasks },
      { name: 'Questa settimana', value: upcomingTasks },
      { name: 'Più avanti', value: totalTasks - completedTasks - delayedTasks - upcomingTasks }
    ].filter(item => item.value > 0);

    // Responsabile/Participanti statistics (solo per admin)
    let assigneeDistribution = [];
    let participantsCount = 0;

    if (isAdmin) {
      // Count per assignee
      const assigneeCount = tasks.reduce((acc, task) => {
        const assigneeName = task.AssignedToName || 'Non assegnato';
        acc[assigneeName] = (acc[assigneeName] || 0) + 1;
        return acc;
      }, {});

      assigneeDistribution = Object.entries(assigneeCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5 assignees

      // Total participants
      participantsCount = tasks.reduce((count, task) => {
        if (task.Participants) {
          try {
            const participants = typeof task.Participants === 'string' 
              ? JSON.parse(task.Participants) 
              : task.Participants;
            
            return count + participants.length;
          } catch (error) {
            console.error('Error parsing participants:', error);
          }
        }
        return count;
      }, 0);
    }
    
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      upcomingTasks,
      delayedTasks,
      completionRate,
      statusDistribution,
      priorityDistribution,
      timelineDistribution,
      assigneeDistribution,
      participantsCount
    };
  }, [tasks, isAdmin]);

  return (
    <div className="space-y-6">
      {/* Statistiche riassuntive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="text-blue-700 mb-2 font-medium flex items-center justify-center">
                <Activity className="h-4 w-4 mr-1" />
                Totale Attività
              </h4>
              <div className="text-3xl font-bold text-blue-600">{statistics.totalTasks}</div>
              <div className="text-sm text-blue-600 mt-1">
                {statistics.completionRate}% completate
              </div>
              {statistics.totalTasks > 0 && (
                <Progress 
                  value={statistics.completionRate} 
                  className="h-1.5 mt-2"
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="text-green-700 mb-2 font-medium flex items-center justify-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Completate
              </h4>
              <div className="text-3xl font-bold text-green-600">{statistics.completedTasks}</div>
              <div className="text-sm text-green-600 mt-1">
                {statistics.totalTasks > 0 ? Math.round((statistics.completedTasks / statistics.totalTasks) * 100) : 0}% del totale
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="text-yellow-700 mb-2 font-medium flex items-center justify-center">
                <Clock className="h-4 w-4 mr-1" />
                In Corso
              </h4>
              <div className="text-3xl font-bold text-yellow-600">{statistics.inProgressTasks}</div>
              <div className="text-sm text-yellow-600 mt-1">
                {statistics.totalTasks > 0 ? Math.round((statistics.inProgressTasks / statistics.totalTasks) * 100) : 0}% del totale
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="text-red-700 mb-2 font-medium flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                In Ritardo
              </h4>
              <div className="text-3xl font-bold text-red-600">{statistics.delayedTasks}</div>
              <div className="text-sm text-red-600 mt-1">
                {statistics.totalTasks > 0 ? Math.round((statistics.delayedTasks / statistics.totalTasks) * 100) : 0}% del totale
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="text-indigo-700 mb-2 font-medium flex items-center justify-center">
                <BellRing className="h-4 w-4 mr-1" />
                In Scadenza
              </h4>
              <div className="text-3xl font-bold text-indigo-600">{statistics.upcomingTasks}</div>
              <div className="text-sm text-indigo-600 mt-1">
                nei prossimi 7 giorni
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafici */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribuzione per stato */}
        <Card>
          <CardContent className="pt-6">
            <h4 className="text-gray-700 mb-4 font-medium text-center">Distribuzione per Stato</h4>
            {statistics.statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statistics.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statistics.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.status[entry.name] || COLORS.default[index % COLORS.default.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Attività']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-gray-400">
                Nessun dato disponibile
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribuzione per priorità */}
        <Card>
          <CardContent className="pt-6">
            <h4 className="text-gray-700 mb-4 font-medium text-center">Distribuzione per Priorità</h4>
            {statistics.priorityDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statistics.priorityDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statistics.priorityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.priority[entry.name] || COLORS.default[index % COLORS.default.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Attività']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-gray-400">
                Nessun dato disponibile
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribuzione per scadenza */}
        <Card>
          <CardContent className="pt-6">
            <h4 className="text-gray-700 mb-4 font-medium text-center">Distribuzione per Scadenza</h4>
            {statistics.timelineDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statistics.timelineDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statistics.timelineDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.timeline[entry.name] || COLORS.default[index % COLORS.default.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Attività']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-gray-400">
                Nessun dato disponibile
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Statistiche aggiuntive per admin */}
      {isAdmin && statistics.assigneeDistribution.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="text-gray-700 mb-4 font-medium text-center">Top 5 Responsabili</h4>
            <div className="flex justify-center">
              <div className="w-full max-w-xl">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={statistics.assigneeDistribution}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                    <Tooltip formatter={(value) => [value, 'Attività']} />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                <Users className="h-4 w-4 mr-1" />
                Totale partecipanti: {statistics.participantsCount}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TasksStatistics;