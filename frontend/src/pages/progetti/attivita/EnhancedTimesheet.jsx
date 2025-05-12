import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, addDays, subWeeks, addWeeks, isToday, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Info,
  Plus,
  Edit,
  Trash,
  AlertCircle,
  User,
  Search,
  Filter
} from 'lucide-react';
import { swal } from '../../../lib/common';
import TimeEntryDialog from './TimeEntryDialog';
import useTimeTracking from '../../../hooks/useTimeTracking';

const EnhancedTimesheet = ({ currentUserId, isAdmin = false, users = [] }) => {
  const {
    loading: apiLoading,
    getUserTimeWeekly,
    getUserAvailableTasks,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    canViewUserData
  } = useTimeTracking();
  
  const [loading, setLoading] = useState(true);
  const [weekStartDate, setWeekStartDate] = useState(() => {
    // Inizia dal lunedì della settimana corrente (weekStartsOn: 1 significa lunedì)
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  });
  
  const [weekData, setWeekData] = useState({
    dailyEntries: [],
    weeklyTotals: [],
    dailyTotals: []
  });
  
  const [selectedUserId, setSelectedUserId] = useState(currentUserId);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({
    preselectedTaskId: null,
    availableTasks: []
  });
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Funzione per caricare i dati della settimana corrente
  const loadWeekData = async () => {
    try {
      setLoading(true);
      
      // Verifica dei permessi
      if (!canViewUserData(selectedUserId)) {
        toast({
          title: "Errore di permessi",
          description: "Non hai i permessi per visualizzare i dati di questo utente",
          variant: "destructive"
        });
        return;
      }
      
      const data = await getUserTimeWeekly(selectedUserId, weekStartDate);
      setWeekData({
        dailyEntries: data[0] || [],
        weeklyTotals: data[1] || [],
        dailyTotals: data[2] || []
      });
      
      // Carica anche le attività disponibili per l'utente
      const tasks = await getUserAvailableTasks(selectedUserId);
      setAvailableTasks(tasks);
    } catch (error) {
      console.error('Errore nel caricamento dei dati settimanali:', error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile caricare i dati delle ore",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Carica i dati all'avvio e quando cambiano le date o l'utente selezionato
  useEffect(() => {
    loadWeekData();
  }, [weekStartDate, selectedUserId]);
  
  // Funzione per navigare alla settimana precedente
  const navigateToPreviousWeek = () => {
    setWeekStartDate(prev => subWeeks(prev, 1));
  };
  
  // Funzione per navigare alla settimana successiva
  const navigateToNextWeek = () => {
    const nextWeek = addWeeks(weekStartDate, 1);
    // Non permettere di andare oltre la settimana corrente
    if (nextWeek <= startOfWeek(new Date(), { weekStartsOn: 1 })) {
      setWeekStartDate(nextWeek);
    }
  };
  
  // Calcola le date della settimana attuale - da lunedì a domenica
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStartDate, i));
    }
    return days;
  }, [weekStartDate]);
  
  // Controlla se un giorno è nel futuro
  const isFutureDay = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };
  
  // Funzione per aprire il dialog per aggiungere ore
  const openAddDialog = (date, taskId = null) => {
    setSelectedDate(date);
    setSelectedEntry(null);
    
    // Filtra le attività da mostrare nel dialog
    // Quando si è cliccato su una cella della riga di un'attività specifica (taskId fornito),
    // mostra solo l'attività su cui si è cliccato preselezionandola
    // Quando si è cliccato sulla riga dei totali, mostra tutte le attività disponibili
    let filteredTasks = availableTasks;
    let preselectedTaskId = null;
    
    if (taskId) {
      // Se si è cliccato su una cella di un'attività specifica
      // Trova l'attività corrispondente
      const selectedTask = weekData.dailyEntries.find(entry => entry.TaskID === taskId) ||
                         weekData.weeklyTotals.find(task => task.TaskID === taskId);
      
      console.log("Selected task:", selectedTask);
      
      if (selectedTask) {
        preselectedTaskId = selectedTask.TaskID.toString();
      }
    } else {
      // Se si è cliccato sulla riga dei totali, mostra solo le attività presenti nella griglia
      filteredTasks = availableTasks.filter(task => 
        weekData.weeklyTotals.some(t => t.TaskID === task.TaskID)
      );
    }
    
    // Imposta la configurazione del dialogo
    setDialogConfig({
      preselectedTaskId,
      availableTasks: filteredTasks
    });
    
    // Apri il dialogo
    setIsDialogOpen(true);
  };
  
  // Funzione per aprire il dialog per modificare ore
  const openEditDialog = (entry) => {
    setSelectedEntry(entry);
    setSelectedDate(null);
    
    // Filtra le attività da mostrare nel dialog
    // Mostra solo le attività che sono già presenti nella griglia del timesheet
    const filteredTasks = availableTasks.filter(task => 
      weekData.weeklyTotals.some(t => t.TaskID === task.TaskID)
    );
    
    // Imposta la configurazione del dialogo
    setDialogConfig({
      preselectedTaskId: null,
      availableTasks: filteredTasks
    });
    
    // Apri il dialogo
    setIsDialogOpen(true);
  };
  
  // Funzione per salvare o aggiornare le ore
  const handleSaveEntry = async (entryId, entryData) => {
    try {
      if (entryId) {
        await updateTimeEntry(entryId, entryData);
        toast({
          title: "Ore aggiornate",
          description: "Le ore sono state aggiornate con successo",
          style: { backgroundColor: '#2c7a7b', color: '#fff' }
        });
      } else {
        await addTimeEntry(entryData);
        toast({
          title: "Ore aggiunte",
          description: "Le ore sono state registrate con successo",
          style: { backgroundColor: '#2c7a7b', color: '#fff' }
        });
      }
      
      // Ricarica i dati della settimana
      await loadWeekData();
    } catch (error) {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante il salvataggio",
        variant: "destructive"
      });
      throw error; // Propagare l'errore per gestirlo nel componente dialog
    }
  };
  
  // Funzione per eliminare un'entrata
  const handleDeleteEntry = async (entry) => {
    const result = await swal.fire({
      title: 'Sei sicuro?',
      text: "Questa operazione non può essere annullata",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sì, elimina',
      cancelButtonText: 'Annulla'
    });
    
    if (result.isConfirmed) {
      try {
        await deleteTimeEntry(entry.EntryID);
        toast({
          title: "Ore eliminate",
          description: "Le ore sono state eliminate con successo",
        });
        
        // Ricarica i dati della settimana
        await loadWeekData();
      } catch (error) {
        toast({
          title: "Errore",
          description: error.message || "Si è verificato un errore durante l'eliminazione",
          variant: "destructive"
        });
      }
    }
  };
  
  // Filtra le entrate giornaliere per la data specificata
  const getEntriesForDay = (date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return weekData.dailyEntries.filter(entry => 
      format(parseISO(entry.WorkDate), 'yyyy-MM-dd') === formattedDate
    );
  };
  
  // Trova il totale per il giorno specificato
  const getTotalForDay = (date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const dayTotal = weekData.dailyTotals.find(
      day => format(parseISO(day.WorkDate), 'yyyy-MM-dd') === formattedDate
    );
    return dayTotal ? dayTotal.TotalHours : 0;
  };
  
  // Calcola quanto manca per arrivare alle 8 ore
  const getRemainingHours = (date) => {
    const total = getTotalForDay(date);
    return Math.max(0, 8 - total);
  };
  
  // Formatta l'indicatore di ore
  const formatHoursIndicator = (hours) => {
    if (hours === 0) return '0h';
    if (hours % 1 === 0) return `${hours}h`;
    return `${hours}h`;
  };
  
  // Recupera la classe CSS per la cella in base al totale di ore
  const getCellClass = (date, total) => {
    if (isFutureDay(date)) return 'bg-gray-50 text-gray-400';
    if (total === 0) return 'bg-red-50';
    if (total < 8) return 'bg-yellow-50';
    if (total === 8) return 'bg-green-50';
    return 'bg-blue-50'; // > 8 ore
  };
  
  // Genera un riepilogo settimanale
  const weekSummary = useMemo(() => {
    const totalHours = weekData.dailyTotals.reduce((sum, day) => sum + day.TotalHours, 0);
    const completeDays = weekData.dailyTotals.filter(day => day.TotalHours >= 8).length;
    const incompleteDays = weekData.dailyTotals.filter(day => day.TotalHours > 0 && day.TotalHours < 8).length;
    const emptyDays = 7 - completeDays - incompleteDays;
    
    return {
      totalHours,
      completeDays,
      incompleteDays,
      emptyDays,
      weeklyTarget: 40,
      progress: Math.min(100, (totalHours / 40) * 100)
    };
  }, [weekData.dailyTotals]);
  
  return (
    <div className="space-y-4">
      {/* Intestazione */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">

        
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="relative border rounded-md bg-white">
              <select
                value={selectedUserId.toString()}
                onChange={(e) => setSelectedUserId(parseInt(e.target.value))}
                className="appearance-none w-[200px] pl-8 pr-8 py-2 rounded-md text-sm"
              >
                {users.map(user => (
                  <option key={user.userId} value={user.userId.toString()}>
                    {user.username}
                  </option>
                ))}
              </select>
              <User className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
          
          <div className="flex items-center rounded-md border bg-white">
            <Button
              variant="ghost"
              size="icon"
              onClick={navigateToPreviousWeek}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="px-3 py-1 font-medium text-sm">
              {format(weekStartDate, 'dd MMM', { locale: it })} - {format(addDays(weekStartDate, 6), 'dd MMM yyyy', { locale: it })}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={navigateToNextWeek}
              disabled={weekStartDate >= startOfWeek(new Date(), { weekStartsOn: 1 })}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Vista settimanale */}
      <Card>
        <CardHeader className="pb-2 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">
              Vista settimanale
              {loading && (
                <span className="ml-2 text-gray-500 text-sm font-normal">
                  <Clock className="inline h-4 w-4 animate-spin mr-1" />
                  Caricamento...
                </span>
              )}
            </CardTitle>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm">
                <div className="w-3 h-3 bg-red-200 border border-red-50 rounded-sm mr-1"></div>
                <span>0h</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-3 h-3 bg-yellow-200 border border-yellow-50 rounded-sm mr-1"></div>
                <span>&lt;8h</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-3 h-3 bg-green-200 border border-green-200 rounded-sm mr-1"></div>
                <span>8h</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-3 h-3 bg-blue-200 border border-blue-200 rounded-sm mr-1"></div>
                <span>&gt;8h</span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 overflow-auto">
          <div className="relative" style={{ overflowX: 'auto', overflowY: 'visible' }}>
            <Table className="min-w-[800px]">
              <TableHeader className="sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[250px] bg-white">
                    <div className="sticky left-0 bg-white w-full h-full px-4 py-3 z-20">
                      Progetto / Attività
                    </div>
                  </TableHead>
                  {weekDays.map((day) => (
                    <TableHead 
                      key={format(day, 'yyyy-MM-dd')}
                      className={`w-[100px] h-16 text-center ${isToday(day) ? 'bg-blue-50 font-medium' : 'bg-white'} ${isFutureDay(day) ? 'bg-gray-50 text-gray-400' : ''}`}
                    >
                      <div className="flex flex-col items-center h-full justify-center">
                        <span className="text-xs uppercase">{format(day, 'EEE', { locale: it })}</span>
                        <span className="font-medium">{format(day, 'dd/MM')}</span>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-[100px] text-center bg-gray-50 sticky right-0 z-10">
                    <div className="px-4 py-3">Totale</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {weekData.weeklyTotals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <Clock className="h-12 w-12 mb-2 text-gray-300" />
                        <p>Nessuna attività registrata in questa settimana</p>
                        <p className="text-sm mt-1">Clicca su un giorno per registrare ore</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {weekData.weeklyTotals.map((taskTotal, index) => (
                      <TableRow key={`${taskTotal.ProjectID}-${taskTotal.TaskID}`}>
                        <TableCell className="border-r sticky left-0 bg-white z-10">
                          <div className="pl-4 pr-4 max-w-[230px]">
                            <div className="text-xs text-gray-500 truncate">{taskTotal.ProjectName}</div>
                            <div className="font-medium truncate" title={taskTotal.TaskTitle}>
                              {taskTotal.TaskTitle}
                            </div>
                          </div>
                        </TableCell>
                        
                        {weekDays.map((day) => {
                          const entries = getEntriesForDay(day).filter(e => 
                            e.TaskID === taskTotal.TaskID
                          );
                          
                          const dayTotal = entries.reduce((sum, entry) => 
                            sum + entry.HoursWorked, 0
                          );
                          
                          return (
                            <TableCell 
                              key={format(day, 'yyyy-MM-dd')} 
                              className={`text-center border-r h-16 ${dayTotal > 0 ? 'bg-blue-50' : ''} ${isFutureDay(day) ? 'bg-gray-50' : ''}`}
                            >
                              {isFutureDay(day) ? (
                                <span className="text-gray-400">-</span>
                              ) : dayTotal > 0 ? (
                                <div className="flex flex-col items-center h-full justify-center">
                                  <Badge className="bg-white border border-blue-200 text-blue-700">
                                    {formatHoursIndicator(dayTotal)}
                                  </Badge>
                                  
                                  <div className="flex items-center justify-center mt-1 space-x-1">
                                    {entries.map((entry) => (
                                      <div key={entry.EntryID} className="flex space-x-1">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => openEditDialog(entry)}
                                              >
                                                <Edit className="h-3 w-3 text-gray-500" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Modifica registrazione</p>
                                              <p className="text-xs">{entry.WorkType} - {entry.Notes}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                        
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteEntry(entry);
                                                }}
                                              >
                                                <Trash className="h-3 w-3 text-red-500" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Elimina registrazione</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                    ))}
                                    
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => openAddDialog(day, taskTotal.TaskID)}
                                          >
                                            <Plus className="h-3 w-3 text-gray-500" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Aggiungi ore</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-75 rounded-full"
                                  onClick={() => openAddDialog(day, taskTotal.TaskID)}
                                >
                                  <Plus className="h-4 w-4 text-gray-400" />
                                </Button>
                              )}
                            </TableCell>
                          );
                        })}
                        
                        <TableCell className="text-center font-medium bg-gray-50 sticky right-0 z-10">
                          {taskTotal.TotalHoursForWeek > 0 ? (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                              {formatHoursIndicator(taskTotal.TotalHoursForWeek)}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {/* Riga dei totali giornalieri */}
                    <TableRow className="font-medium total-row">
                      <TableCell className="border-t-2 border-gray-300 bg-gray-50 sticky left-0 z-10">
                        <div className="pl-4">Totale giornaliero</div>
                      </TableCell>
                      
                      {weekDays.map((day) => {
                        const total = getTotalForDay(day);
                        return (
                          <TableCell 
                            key={format(day, 'yyyy-MM-dd')} 
                            className={`border-t-2 border-gray-300 text-center h-16 ${getCellClass(day, total)}`}
                          >
                            {isFutureDay(day) ? (
                              <span className="text-gray-400">-</span>
                            ) : (
                              <div className="flex flex-col items-center h-full justify-center">
                                <span className="font-bold">{formatHoursIndicator(total)}</span>
                                
                                {!isFutureDay(day) && total < 8 && (
                                  <span className="text-xs text-gray-500">
                                    (+{formatHoursIndicator(getRemainingHours(day))})
                                  </span>
                                )}
                                
                                {!isFutureDay(day) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-1 h-6 text-xs"
                                    onClick={() => openAddDialog(day)}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Aggiungi
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                      
                      <TableCell className="border-t-2 border-gray-300 font-bold text-center bg-blue-50 sticky right-0 z-10">
                        {formatHoursIndicator(weekSummary.totalHours)}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        
        <CardFooter className="border-t bg-gray-50 p-4">
          <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-gray-500">Totale ore:</span>{' '}
                <span className="font-bold">{formatHoursIndicator(weekSummary.totalHours)}</span>
                <span className="text-gray-500 ml-1">/ 40h</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-sm">
                  <span className="text-green-600">{weekSummary.completeDays}</span> complete
                </div>
                <div className="text-sm">
                  <span className="text-yellow-600">{weekSummary.incompleteDays}</span> parziali
                </div>
                <div className="text-sm">
                  <span className="text-red-600">{weekSummary.emptyDays}</span> vuote
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {weekSummary.totalHours < 40 && (
                <div className="text-sm">
                  <AlertCircle className="inline-block h-4 w-4 text-yellow-500 mr-1" />
                  <span className="text-yellow-700">
                    Mancano {formatHoursIndicator(40 - weekSummary.totalHours)} per completare le 40 ore settimanali
                  </span>
                </div>
              )}
              
              {weekSummary.totalHours >= 40 && (
                <Badge className="bg-green-50 text-green-700 border-green-200">
                  Settimana completata
                </Badge>
              )}
            </div>
          </div>
        </CardFooter>
      </Card>
      
      {/* Dialog per aggiungere/modificare ore */}
      <TimeEntryDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveEntry}
        entry={selectedEntry}
        date={selectedDate}
        tasks={availableTasks}
        userId={selectedUserId}
        isAdmin={isAdmin}
        users={users}
        dialogConfig={dialogConfig}
      />
      
      {/* Stile CSS per la tabella fixed */}
      <style>
        {`
            .sticky {
            position: sticky;
            }
            
            .table-container {
            max-height: 600px;
            overflow: auto;
            }
            
            /* Uniforma l'altezza di riga */
            .table-body-row {
            height: 64px;
            }
            
            /* Migliora la visualizzazione su dispositivi mobili */
            @media (max-width: 640px) {
            .table-container {
                max-height: 500px;
            }
            }
        `}
        </style>
    </div>
  );

};

export default EnhancedTimesheet;