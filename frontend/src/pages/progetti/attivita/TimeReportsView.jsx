import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import AdaptiveDatePicker from '@/components/ui/AdaptiveDatePicker';
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Label
} from 'recharts';
import { 
  Calendar as CalendarIcon, 
  Download, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  BarChart2,
  PieChart as PieChartIcon,
  RefreshCw,
  User,
  Users,
  Calendar as CalendarIconSolid
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isToday, parseISO, getWeek, startOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { config } from '../../../config';
import useTimeTracking from '../../../hooks/useTimeTracking';

// Definisci i colori per i grafici
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const TimeReportsView = ({ currentUserId, isAdmin = false, users = [] }) => {
  const { currentUserId: loggedInUser } = useTimeTracking();
  const [loading, setLoading] = useState(false);
  
  // Selezione periodi
  const [timeBucket, setTimeBucket] = useState('month');
  const [selectedUserId, setSelectedUserId] = useState(currentUserId);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reportData, setReportData] = useState(null);
  const [viewMode, setViewMode] = useState('charts'); // 'charts', 'details', 'table'
  
  // Calcola il periodo selezionato in base al tipo e alla data
  const periodSelector = useMemo(() => {
    if (timeBucket === 'day') {
      return format(selectedDate, 'yyyy-MM-dd');
    } else if (timeBucket === 'week') {
      // Use getWeek from date-fns to get the ISO week number
      const weekNumber = getWeek(selectedDate, { weekStartsOn: 1 });
      const year = format(selectedDate, 'yyyy');
      return `${year}-W${String(weekNumber).padStart(2, '0')}`;
    } else if (timeBucket === 'month') {
      return format(selectedDate, 'yyyy-MM');
    } else if (timeBucket === 'quarter') {
      const quarter = Math.floor(selectedDate.getMonth() / 3) + 1;
      return `${format(selectedDate, 'yyyy')}-Q${quarter}`;
    } else if (timeBucket === 'year') {
      return format(selectedDate, 'yyyy');
    }
    
    return format(selectedDate, 'yyyy-MM'); // Default a month
  }, [selectedDate, timeBucket]);
  
  // Formatta il periodo per mostrarla in modo leggibile
  const formattedPeriod = useMemo(() => {
    if (timeBucket === 'day') {
      return format(selectedDate, 'EEEE d MMMM yyyy', { locale: it });
    } else if (timeBucket === 'week') {
      // Get the start of the week (Monday)
      const startOfWeekDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
      
      // Calculate end of week (Sunday)
      const endOfWeekDate = new Date(startOfWeekDate);
      endOfWeekDate.setDate(startOfWeekDate.getDate() + 6);
      
      return `${format(startOfWeekDate, 'd MMM', { locale: it })} - ${format(endOfWeekDate, 'd MMM yyyy', { locale: it })}`;
    } else if (timeBucket === 'month') {
      return format(selectedDate, 'MMMM yyyy', { locale: it });
    } else if (timeBucket === 'quarter') {
      const quarter = Math.floor(selectedDate.getMonth() / 3) + 1;
      return `${quarter}° trimestre ${format(selectedDate, 'yyyy')}`;
    } else if (timeBucket === 'year') {
      return format(selectedDate, 'yyyy');
    }
    
    return format(selectedDate, 'MMMM yyyy', { locale: it });
  }, [selectedDate, timeBucket]);
  
  // Naviga al periodo precedente
  const goToPreviousPeriod = () => {
    if (timeBucket === 'day') {
      const prevDay = new Date(selectedDate);
      prevDay.setDate(selectedDate.getDate() - 1);
      setSelectedDate(prevDay);
    } else if (timeBucket === 'week') {
      const prevWeek = new Date(selectedDate);
      prevWeek.setDate(selectedDate.getDate() - 7);
      setSelectedDate(prevWeek);
    } else if (timeBucket === 'month') {
      setSelectedDate(subMonths(selectedDate, 1));
    } else if (timeBucket === 'quarter') {
      const prevQuarter = new Date(selectedDate);
      prevQuarter.setMonth(selectedDate.getMonth() - 3);
      setSelectedDate(prevQuarter);
    } else if (timeBucket === 'year') {
      const prevYear = new Date(selectedDate);
      prevYear.setFullYear(selectedDate.getFullYear() - 1);
      setSelectedDate(prevYear);
    }
  };
  
  // Naviga al periodo successivo
  const goToNextPeriod = () => {
    // Non permettere di andare oltre la data odierna
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (timeBucket === 'day') {
      const nextDay = new Date(selectedDate);
      nextDay.setDate(selectedDate.getDate() + 1);
      if (nextDay <= today) {
        setSelectedDate(nextDay);
      }
    } else if (timeBucket === 'week') {
      const nextWeek = new Date(selectedDate);
      nextWeek.setDate(selectedDate.getDate() + 7);
      if (nextWeek <= today) {
        setSelectedDate(nextWeek);
      }
    } else if (timeBucket === 'month') {
      const nextMonth = addMonths(selectedDate, 1);
      if (startOfMonth(nextMonth) <= today) {
        setSelectedDate(nextMonth);
      }
    } else if (timeBucket === 'quarter') {
      const nextQuarter = new Date(selectedDate);
      nextQuarter.setMonth(selectedDate.getMonth() + 3);
      if (nextQuarter <= today) {
        setSelectedDate(nextQuarter);
      }
    } else if (timeBucket === 'year') {
      const nextYear = new Date(selectedDate);
      nextYear.setFullYear(selectedDate.getFullYear() + 1);
      if (nextYear <= today) {
        setSelectedDate(nextYear);
      }
    }
  };
  
  // Scarica il report nel formato specificato
  const downloadReport = async (format) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const url = `${config.API_BASE_URL}/timetracking/reports/export/${selectedUserId}?timeBucket=${timeBucket}&period=${periodSelector}&format=${format}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Errore durante il download: ${response.statusText}`);
      }
      
      // Crea un URL per il blob scaricato
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // Crea un link temporaneo e simula un click per scaricare il file
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `timesheet_${selectedUserId}_${timeBucket}_${periodSelector}.${format}`;
      document.body.appendChild(a);
      a.click();
      
      // Pulisci
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      toast({
        title: "Download completato",
        description: `Report esportato in formato ${format.toUpperCase()}`,
        style: { backgroundColor: '#2c7a7b', color: '#fff' }
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il download del report",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Carica i dati del report
  const loadReportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const url = `${config.API_BASE_URL}/timetracking/reports/${selectedUserId}?timeBucket=${timeBucket}&period=${periodSelector}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Errore durante il caricamento dei dati: ${response.statusText}`);
      }
      
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error loading report data:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il caricamento dei dati",
        variant: "destructive"
      });
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };
  
  // Carica i dati quando cambiano i parametri di selezione
  useEffect(() => {
    loadReportData();
  }, [selectedUserId, timeBucket, periodSelector]);
  
  // Funzione personalizzata per renderizzare etichette nei grafici a torta
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    // Non mostrare etichette per fette troppo piccole
    if (percent < 0.05) return null;
    
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  // Funzione per formattare le date sull'asse X del grafico
  const formatXAxisDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'dd/MM');
    } catch (e) {
      return dateStr;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Controlli per la selezione del periodo e dell'utente */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Selezione utente (solo per admin) */}
            {isAdmin && (
              <div>
                <label className="text-sm font-medium mb-2 block">Utente:</label>
                <Select 
                  value={selectedUserId.toString()}
                  onValueChange={(value) => setSelectedUserId(parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona utente" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.userId} value={user.userId.toString()}>
                        {user.username || `${user.firstName} ${user.lastName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Selezione tipo di periodo */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo periodo:</label>
              <Select 
                value={timeBucket}
                onValueChange={setTimeBucket}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Giornaliero</SelectItem>
                  <SelectItem value="week">Settimanale</SelectItem>
                  <SelectItem value="month">Mensile</SelectItem>
                  <SelectItem value="quarter">Trimestrale</SelectItem>
                  <SelectItem value="year">Annuale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Navigazione periodo */}
            <div>
              <label className="text-sm font-medium mb-2 block">Periodo selezionato:</label>
              <div className="flex items-center border rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPreviousPeriod}
                  className="h-10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex-1 text-center">
                  <AdaptiveDatePicker
                    timeBucket={timeBucket}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    formattedPeriod={formattedPeriod}
                  />
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextPeriod}
                  className="h-10"
                  disabled={timeBucket === 'day' 
                    ? isToday(selectedDate) 
                    : timeBucket === 'month' 
                      ? selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear() 
                      : false}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Visualizzazione e download */}
          <div className="flex flex-wrap justify-between mt-6">
            <div className="space-x-2 d-flex">
              <Button 
                variant={viewMode === 'charts' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('charts')}
              >
                <PieChartIcon className="h-4 w-4 mr-1" />
              </Button>
              <Button 
                variant={viewMode === 'details' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('details')}
              >
                <FileText className="h-4 w-4 mr-1" />
              </Button>
              <Button 
                variant={viewMode === 'table' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <BarChart2 className="h-4 w-4 mr-1" />
              </Button>
            </div>
            
            <div className="space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadReport('csv')}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadReport('xlsx')}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-1" />
                Excel
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={loadReportData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Aggiorna
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Visualizzazione dei dati */}
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-md border shadow">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Caricamento report in corso...</span>
        </div>
      ) : !reportData || !reportData.summary ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-md border shadow">
          <CalendarIconSolid className="h-10 w-10 text-gray-300 mb-2" />
          <p className="text-gray-500">Nessun dato disponibile per il periodo selezionato</p>
          <p className="text-sm text-gray-400 mt-1">Prova a selezionare un periodo differente</p>
        </div>
      ) : (
        <>
          {/* Riepilogo generale */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50">
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-blue-700 mb-1">Ore totali</h3>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold">{reportData.summary.TotalHours.toFixed(1)}h</div>
                  <div className="text-sm text-blue-500">
                    {reportData.summary.TotalHours > 0 && reportData.summary.TargetHours > 0 
                      ? `${((reportData.summary.TotalHours / reportData.summary.TargetHours) * 100).toFixed(0)}%`
                      : '0%'
                    } del target
                  </div>
                </div>
                <div className="text-xs text-blue-500 mt-2">
                  Target: {reportData.summary.TargetHours.toFixed(1)}h
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50">
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-green-700 mb-1">Progetti attivi</h3>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold">{reportData.summary.ActiveProjects}</div>
                  <div className="text-sm text-green-500">
                    {reportData.summary.InProgressProjects} in corso
                  </div>
                </div>
                <div className="text-xs text-green-500 mt-2">
                  {reportData.summary.CompletedProjects} completati nel periodo
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-amber-50">
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-amber-700 mb-1">Efficienza</h3>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold">{reportData.summary.Efficiency.toFixed(0)}%</div>
                  <div className="text-sm text-amber-500">
                    Utilizzo del tempo
                  </div>
                </div>
                <div className="text-xs text-amber-500 mt-2">
                  Basato sul target di {reportData.summary.TargetHours.toFixed(1)}h
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-purple-50">
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-purple-700 mb-1">Media giornaliera</h3>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold">{reportData.summary.AverageDaily.toFixed(1)}h</div>
                  <div className="text-sm text-purple-500">
                    per giorno lavorativo
                  </div>
                </div>
                <div className="text-xs text-purple-500 mt-2">
                  Target: 8h per giorno lavorativo
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Visualizzazione grafica */}
          {viewMode === 'charts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Distribuzione per progetto */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Distribuzione per progetto</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-[300px]">
                    {reportData.projectDistribution && reportData.projectDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportData.projectDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="HoursWorked"
                            nameKey="ProjectName"
                          >
                            {reportData.projectDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [`${value.toFixed(1)}h (${((value / reportData.summary.TotalHours) * 100).toFixed(1)}%)`, 'Ore']}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        Nessun dato disponibile
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Andamento giornaliero */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Andamento giornaliero</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-[300px]">
                    {reportData.dailyDistribution && reportData.dailyDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={reportData.dailyDistribution}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="Date" 
                            tickFormatter={formatXAxisDate}
                          />
                          <YAxis>
                            <Label
                              value="Ore"
                              angle={-90}
                              position="insideLeft"
                              style={{ textAnchor: 'middle' }}
                            />
                          </YAxis>
                          <Tooltip 
                            formatter={(value) => [`${value.toFixed(1)}h`, 'Ore lavorate']}
                            labelFormatter={(label) => {
                              try {
                                return format(new Date(label), 'EEEE d MMMM yyyy', { locale: it });
                              } catch (e) {
                                return label;
                              }
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="HoursWorked" 
                            stroke="#8884d8" 
                            activeDot={{ r: 8 }}
                            name="Ore giornaliere"
                          />
                          {/* Linea di riferimento per le 8 ore */}
                          <Line 
                            type="monotone" 
                            dataKey={() => 8} 
                            stroke="#82ca9d" 
                            strokeDasharray="3 3"
                            name="Target (8h)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        Nessun dato disponibile
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Visualizzazione dettagliata */}
          {viewMode === 'details' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Dettaglio attività per progetto</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {reportData.projectDetails && reportData.projectDetails.length > 0 ? (
                    reportData.projectDetails.map((project, index) => (
                      <div key={index} className="border rounded-md overflow-hidden">
                        <div className="bg-blue-50 px-4 py-2 border-b">
                          <div className="flex justify-between items-center">
                            <h3 className="font-medium">{project.projectName}</h3>
                            <Badge variant="outline" className="bg-blue-100 text-blue-700">
                              {project.totalHours.toFixed(1)}h
                            </Badge>
                          </div>
                        </div>
                        <div className="p-2">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attività</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ore</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {project.tasks.map((task, taskIndex) => (
                                <tr key={taskIndex} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 text-sm">{task.taskTitle}</td>
                                  <td className="px-3 py-2 text-sm">
                                    <Badge variant="outline" className={
                                      task.workType === 'INTERNO' 
                                        ? 'bg-green-50 text-green-700 border-green-200' 
                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }>
                                      {task.workType}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 text-sm text-right font-medium">{task.hoursWorked.toFixed(1)}h</td>
                                </tr>
                              ))}
                              <tr className="bg-gray-50">
                                <td className="px-3 py-2 text-sm font-medium" colSpan="2">Totale progetto</td>
                                <td className="px-3 py-2 text-sm text-right font-bold">{project.totalHours.toFixed(1)}h</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-32 text-gray-400">
                      Nessun dettaglio disponibile per il periodo selezionato
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Visualizzazione tabellare */}
          {viewMode === 'table' && reportData.timeEntries && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Registrazioni giornaliere</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="rounded-md border overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progetto</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attività</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ore</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.timeEntries.length > 0 ? (
                        reportData.timeEntries.map((entry, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              {format(new Date(entry.WorkDate), 'EEEE d MMM yyyy', { locale: it })}
                            </td>
                            <td className="px-4 py-3 text-sm">{entry.ProjectName}</td>
                            <td className="px-4 py-3 text-sm">{entry.TaskTitle}</td>
                            <td className="px-4 py-3 text-sm">
                              <Badge variant="outline" className={
                                entry.WorkType === 'INTERNO' 
                                  ? 'bg-green-50 text-green-700 border-green-200' 
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }>
                                {entry.WorkType}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium">{entry.HoursWorked.toFixed(1)}h</td>
                            <td className="px-4 py-3 text-sm">{entry.Notes || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                            Nessuna registrazione disponibile per il periodo selezionato
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium">Totale</td>
                        <td colSpan="3" className="px-4 py-3 text-sm"></td>
                        <td className="px-4 py-3 text-sm text-right font-bold">{reportData.summary.TotalHours.toFixed(1)}h</td>
                        <td className="px-4 py-3 text-sm"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default TimeReportsView;