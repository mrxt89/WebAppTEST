import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, AlertCircle, Clock } from 'lucide-react';

// Import skeleton
import CostAnalysisSkeleton from './skeletons/CostAnalysisSkeleton';

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

/**
 * Component for project cost analysis
 */
const CostAnalysis = ({ project, costData, workHoursData = [], loading }) => {
  const [viewType, setViewType] = useState('category');
  const [showWorkHours, setShowWorkHours] = useState(true);

  // Prepare data for charts based on selected view
  const chartData = useMemo(() => {
    if (!costData || costData.length === 0) return [];
    
    try {
      switch (viewType) {
        case 'category': {
          // Group costs by category
          const categoryMap = {};
          costData.forEach(cost => {
            try {
              const category = cost.Category || 'Non categorizzato';
              if (!categoryMap[category]) {
                categoryMap[category] = 0;
              }
              
              // Ensure TotalCost is a valid number
              const totalCost = parseFloat(cost.TotalCost) || 0;
              categoryMap[category] += totalCost;
            } catch (err) {
              console.error("Errore processando cost:", cost, err);
            }
          });
          
          // Format for chart
          return Object.entries(categoryMap)
            .map(([name, value]) => ({
              name,
              value: parseFloat(value.toFixed(2))
            }))
            .sort((a, b) => b.value - a.value);
        }
        case 'task': {
          // Group costs by task
          const taskMap = {};
          costData.forEach(cost => {
            try {
              const taskId = cost.TaskID || 0;
              const taskName = project.tasks?.find(t => t.TaskID === taskId)?.Title || 'Sconosciuto';
              
              if (!taskMap[taskName]) {
                taskMap[taskName] = 0;
              }
              
              const totalCost = parseFloat(cost.TotalCost) || 0;
              taskMap[taskName] += totalCost;
            } catch (err) {
              console.error("Errore processando task cost:", cost, err);
            }
          });
          
          // Format for chart and sort by value
          return Object.entries(taskMap)
            .map(([name, value]) => ({
              name,
              value: parseFloat(value.toFixed(2))
            }))
            .sort((a, b) => b.value - a.value);
        }
        default:
          return [];
      }
    } catch (error) {
      console.error("Errore generale in chartData:", error);
      return [];
    }
  }, [costData, viewType, project.tasks]);

  // Prepare work hours data for charts
  const workHoursChartData = useMemo(() => {
    if (!workHoursData || workHoursData.length === 0) return [];
    
    try {
      // Group hours by user
      const userMap = {};
      workHoursData.forEach(entry => {
        const userName = entry.username || 'Sconosciuto';
        if (!userMap[userName]) {
          userMap[userName] = {
            internal: 0,
            external: 0
          };
        }
        
        // Distinguish between internal and external work
        if (entry.WorkType === 'INTERNO') {
          userMap[userName].internal += parseFloat(entry.UserHours) || 0;
        } else if (entry.WorkType === 'ESTERNO') {
          userMap[userName].external += parseFloat(entry.UserHours) || 0;
        }
      });
      
      // Format for chart
      return Object.entries(userMap)
        .map(([name, hours]) => ({
          name,
          internal: parseFloat(hours.internal.toFixed(2)),
          external: parseFloat(hours.external.toFixed(2)),
          total: parseFloat((hours.internal + hours.external).toFixed(2))
        }))
        .sort((a, b) => b.total - a.total);
    } catch (error) {
      console.error("Errore nel processare i dati delle ore:", error);
      return [];
    }
  }, [workHoursData]);

  // Calculate total cost
  const totalCost = useMemo(() => {
    if (!costData || costData.length === 0) return '0.00';
    
    try {
      const total = costData.reduce((sum, cost) => {
        const value = parseFloat(cost.TotalCost) || 0;
        return sum + value;
      }, 0);
      
      return total.toFixed(2);
    } catch (error) {
      console.error("Errore nel calcolo del costo totale:", error);
      return '0.00';
    }
  }, [costData]);

  // Calculate total work hours
  const totalWorkHours = useMemo(() => {
    if (!workHoursData || workHoursData.length === 0) return '0.00';
    
    try {
      const internal = workHoursData.reduce((sum, entry) => {
        const value = entry.WorkType === 'INTERNO' ? (parseFloat(entry.UserHours) || 0) : 0;
        return sum + value;
      }, 0);
      
      const external = workHoursData.reduce((sum, entry) => {
        const value = entry.WorkType === 'ESTERNO' ? (parseFloat(entry.UserHours) || 0) : 0;
        return sum + value;
      }, 0);
      
      return {
        internal: internal.toFixed(2),
        external: external.toFixed(2),
        total: (internal + external).toFixed(2)
      };
    } catch (error) {
      console.error("Errore nel calcolo delle ore totali:", error);
      return { internal: '0.00', external: '0.00', total: '0.00' };
    }
  }, [workHoursData]);

  // Format pie chart label
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (!percent) return null;
    
    try {
      const RADIAN = Math.PI / 180;
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
      return (
        <text 
          x={x} 
          y={y} 
          fill="#FFFFFF"
          textAnchor={x > cx ? 'start' : 'end'} 
          dominantBaseline="central"
          fontSize={12}
          fontWeight="bold"
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      );
    } catch (error) {
      console.error("Errore nel renderCustomizedLabel:", error);
      return null;
    }
  };

  if (loading) {
    return <CostAnalysisSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-500" />
          <span>Analisi dei Costi e delle Ore</span>
        </h3>
        <div className="flex items-center gap-2">
          <Select
            value={viewType}
            onValueChange={setViewType}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Visualizza per" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="category">Per Categoria</SelectItem>
              <SelectItem value="task">Per Attività</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={showWorkHours ? 'both' : 'costs'}
            onValueChange={(value) => setShowWorkHours(value === 'both')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo di dati" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="costs">Solo Costi</SelectItem>
              <SelectItem value="both">Costi e Ore</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cost Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart area */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">
              {viewType === 'category' ? 'Distribuzione dei Costi per Categoria' : 'Costi per Attività'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {chartData && chartData.length > 0 ? (
              <div className="h-[300px] w-full">
                {viewType === 'category' ? (
                  <ResponsiveContainer width="100%" height={300} minHeight={300} minWidth={200}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                            stroke="#FFFFFF"
                            strokeWidth={1}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value) => [`€ ${value.toLocaleString('it-IT', {minimumFractionDigits: 2})}`, 'Importo']} 
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={300} minHeight={300} minWidth={200}>
                    <BarChart
                      data={chartData.slice(0, 8)} // Limit for readability
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={150}
                        tick={{fontSize: 12}}
                      />
                      <RechartsTooltip 
                        formatter={(value) => [`€ ${value.toLocaleString('it-IT', {minimumFractionDigits: 2})}`, 'Importo']} 
                      />
                      <Bar dataKey="value" fill="#3b82f6">
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
                <AlertCircle className="h-12 w-12 mb-2 text-gray-300" />
                <p className="text-gray-500 mb-1">Nessun dato sui costi disponibile</p>
                <p className="text-sm text-gray-400">Aggiungi costi alle attività per visualizzarli qui</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary and KPIs */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Riepilogo Costi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md text-center">
                <h4 className="text-lg text-blue-800 mb-1">Costo Totale</h4>
                <div className="text-3xl font-bold text-blue-600">
                  € {Number(totalCost).toLocaleString('it-IT', {minimumFractionDigits: 2})}
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="text-sm font-medium text-gray-500">Top 5 Costi</h4>
                {chartData.length === 0 ? (
                  <div className="text-center p-4 text-sm text-gray-400">
                    Nessun costo registrato
                  </div>
                ) : (
                  chartData.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm font-medium truncate max-w-[120px]">
                                {item.name}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{item.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-sm">€ {item.value.toLocaleString('it-IT', {minimumFractionDigits: 2})}</div>
                    </div>
                  ))
                )}
                
                {chartData.length > 5 && (
                  <div className="text-xs text-center text-gray-500 mt-2 italic">
                    + {chartData.length - 5} {viewType === 'category' ? 'categorie' : 'attività'} aggiuntive
                  </div>
                )}
              </div>
              
              {/* Additional statistics */}
              {costData.length > 0 && (
                <div className="pt-3 border-t">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 p-2 rounded text-center">
                      <div className="text-xs text-gray-500 mb-1">Costo medio</div>
                      <div className="font-medium">
                        € {(parseFloat(totalCost) / (project.tasks?.filter(t => t.Status !== 'SOSPESA').length || 1)).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded text-center">
                      <div className="text-xs text-gray-500 mb-1">Elementi</div>
                      <div className="font-medium">{costData.length}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work Hours Analysis - Only show if requested */}
      {showWorkHours && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>Ore di Lavoro per Utente</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {workHoursChartData && workHoursChartData.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height={300} minHeight={300} minWidth={200}>
                    <BarChart
                      data={workHoursChartData.slice(0, 8)} // Limit for readability
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={150}
                        tick={{fontSize: 12}}
                      />
                      <RechartsTooltip formatter={(value) => [`${value.toFixed(2)}h`, '']} />
                      <Legend />
                      <Bar name="Ore Interne" dataKey="internal" stackId="a" fill="#4682B4" />
                      <Bar name="Ore Esterne" dataKey="external" stackId="a" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
                  <Clock className="h-12 w-12 mb-2 text-gray-300" />
                  <p className="text-gray-500 mb-1">Nessun dato sulle ore disponibile</p>
                  <p className="text-sm text-gray-400">Registra ore di lavoro per visualizzarle qui</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Riepilogo Ore</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-blue-800">Ore totali</h4>
                    <div className="text-xl font-bold text-blue-600">
                      {totalWorkHours.total}h
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex flex-col">
                      <span className="text-gray-500">Ore interne:</span>
                      <span className="font-medium text-blue-600">{totalWorkHours.internal}h</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500">Ore esterne:</span>
                      <span className="font-medium text-green-600">{totalWorkHours.external}h</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  <h4 className="text-sm font-medium text-gray-500">Top Contributori</h4>
                  {workHoursChartData.length === 0 ? (
                    <div className="text-center p-4 text-sm text-gray-400">
                      Nessuna ora registrata
                    </div>
                  ) : (
                    workHoursChartData.slice(0, 5).map((user, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm font-medium">{user.name}</span>
                        </div>
                        <div className="text-sm">{user.total.toFixed(2)}h</div>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Additional work hours statistics */}
                {workHoursChartData.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <div className="text-xs text-gray-500 mb-1">Ore medie per utente</div>
                        <div className="font-medium">
                          {(parseFloat(totalWorkHours.total) / workHoursChartData.length).toFixed(2)}h
                        </div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <div className="text-xs text-gray-500 mb-1">Persone coinvolte</div>
                        <div className="font-medium">{workHoursChartData.length}</div>
                      </div>
                    </div>
                    
                    {/* Estimated cost calculation based on work hours */}
                    <div className="mt-3 p-2 rounded bg-green-50 border border-green-200">
                      <div className="text-xs text-green-700 mb-1 font-medium">Stima costo ore di lavoro</div>
                      <div className="text-sm">
                        Int.: <span className="font-medium">€ {(parseFloat(totalWorkHours.internal) * 35).toFixed(2)}</span>
                        <span className="text-xs ml-1 text-gray-500">(35€/h)</span>
                      </div>
                      <div className="text-sm">
                        Est.: <span className="font-medium">€ {(parseFloat(totalWorkHours.external) * 50).toFixed(2)}</span>
                        <span className="text-xs ml-1 text-gray-500">(50€/h)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CostAnalysis;