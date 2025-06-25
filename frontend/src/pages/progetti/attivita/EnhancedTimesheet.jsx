import React, { useState, useEffect, useMemo } from "react";
import {
  format,
  startOfWeek,
  addDays,
  subWeeks,
  addWeeks,
  isToday,
  parseISO,
} from "date-fns";
import { it } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
  Filter,
  Users,
  ChevronDown,
  CheckCircle2,
  ListTodo,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { swal } from "../../../lib/common";
import TimeEntryDialog from "./TimeEntryDialog";
import TimesheetTaskPanel from "../attivita/TimesheetTaskPanel";
import useTimeTracking from "../../../hooks/useTimeTracking";
import useProjectActions from "../../../hooks/useProjectManagementActions";
import useUsers from "../../../hooks/useUsersActions";
import { config } from "../../../config";

const EnhancedTimesheet = ({ currentUserId, isAdmin = false }) => {
  const {
    loading: apiLoading,
    getUserTimeWeekly,
    getUserAvailableTasks,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    canViewUserData,
  } = useTimeTracking();

  const { addUpdateProjectTask } = useProjectActions();
  const { users: allUsers, loading: loadingUsers, fetchUsers } = useUsers();

  const [loading, setLoading] = useState(true);
  const [weekStartDate, setWeekStartDate] = useState(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  });

  const [weekData, setWeekData] = useState({
    dailyEntries: [],
    weeklyTotals: [],
    dailyTotals: [],
  });

  const [selectedUserId, setSelectedUserId] = useState(currentUserId);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({
    preselectedTaskId: null,
    availableTasks: [],
  });
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Nuovi stati per il filtro migliorato
  const [userSearchText, setUserSearchText] = useState("");
  const [selectedViewMode, setSelectedViewMode] = useState("users"); // "users" o "groups"

  // Stati per la modifica dello stato delle attività
  const [editingTaskStatus, setEditingTaskStatus] = useState({});

  // Configurazione stati attività
  const statusConfig = {
    COMPLETATA: {
      color: "bg-green-100 text-green-700 border border-green-200",
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    "DA FARE": {
      color: "bg-gray-100 text-gray-700 border border-gray-200",
      icon: <ListTodo className="w-4 h-4" />,
    },
    "IN ESECUZIONE": {
      color: "bg-blue-100 text-blue-700 border border-blue-200",
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
    },
    BLOCCATA: {
      color: "bg-red-100 text-red-700 border border-red-200",
      icon: <AlertCircle className="w-4 h-4" />,
    },
    SOSPESA: {
      color: "bg-yellow-100 text-yellow-700 border border-yellow-200",
      icon: <AlertCircle className="w-4 h-4" />,
    },
  };

  const loadGroups = async () => {
    try {
      console.log("Loading groups...");
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/groups`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("Failed to load groups:", response.status, response.statusText);
        throw new Error("Error fetching groups");
      }
      
      const data = await response.json();
      console.log("Groups loaded:", data);
      
      setGroups(data || []);
    } catch (error) {
      console.error("Error fetching groups:", error);
      setGroups([]);
    }
  };

  // Carica gli utenti all'avvio se l'utente è admin
  useEffect(() => {
    if (isAdmin) {
      console.log("Loading users and groups for admin...");
      fetchUsers();
      loadGroups();
    }
  }, [isAdmin, fetchUsers]);

  // Associa gli utenti ai gruppi dopo che entrambi sono stati caricati
  useEffect(() => {
    const associateUsersToGroups = async () => {
      if (allUsers && allUsers.length > 0 && groups && groups.length > 0 && !loadingUsers) {
        try {
          console.log("Starting user-group association...");
          console.log("All users:", allUsers);
          console.log("Groups:", groups);
          
          // I gruppi già contengono i membri, non serve fare chiamate separate
          const usersWithGroups = allUsers.map(user => {
            const userGroups = groups
              .filter(group => {
                // Verifica se l'utente è nel gruppo
                if (group.users) {
                  try {
                    // Parsa la stringa JSON in array di oggetti
                    const groupUsers = JSON.parse(group.users);
                    if (Array.isArray(groupUsers)) {
                      return groupUsers.some(member => member.userId === user.userId);
                    }
                  } catch (error) {
                    console.error(`Error parsing users for group ${group.groupId}:`, error);
                  }
                }
                return false;
              })
              .map(group => ({ groupId: group.groupId, groupName: group.groupName }));
            
            console.log(`User ${user.userId} (${user.username}) groups:`, userGroups);
            
            return {
              ...user,
              groups: userGroups
            };
          });

          // Filtra solo utenti attivi e ordina alfabeticamente
          const activeUsers = usersWithGroups
            .filter(user => !user.userDisabled)
            .sort((a, b) => {
              const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
              const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
              return nameA.localeCompare(nameB);
            });
          
          console.log("Final users with groups:", activeUsers);
          setUsers(activeUsers);
        } catch (error) {
          console.error("Error associating users to groups:", error);
        }
      } else {
        console.log("Cannot associate users to groups:", {
          allUsers: allUsers?.length,
          groups: groups?.length,
          loadingUsers
        });
      }
    };

    associateUsersToGroups();
  }, [allUsers, groups, loadingUsers]);

  // Filtra gli utenti in base alla ricerca
  const filteredUsers = useMemo(() => {
    if (!userSearchText) return users;
    
    const search = userSearchText.toLowerCase();
    return users.filter(user => 
      user.username?.toLowerCase().includes(search) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search)
    );
  }, [users, userSearchText]);

  // Organizza gli utenti per gruppo
  const usersByGroup = useMemo(() => {
    const grouped = {};
    
    // Aggiungi log per debug
    console.log("Organizing users by group. Groups:", groups, "Users:", filteredUsers);
    
    // Inizializza i gruppi
    if (groups && Array.isArray(groups)) {
      groups.forEach(group => {
        grouped[group.groupId] = {
          ...group,
          users: []
        };
      });
    }
    
    // Aggiungi gruppo per utenti senza gruppo
    grouped['no-group'] = {
      groupId: 'no-group',
      groupName: 'Senza gruppo',
      users: []
    };
    
    // Assegna gli utenti ai gruppi
    filteredUsers.forEach(user => {
      let hasGroup = false;
      
      // Verifica che groups sia un array valido
      if (user.groups && Array.isArray(user.groups) && user.groups.length > 0) {
        user.groups.forEach(userGroup => {
          if (userGroup && userGroup.groupId && grouped[userGroup.groupId]) {
            grouped[userGroup.groupId].users.push(user);
            hasGroup = true;
          }
        });
      }
      
      // Se l'utente non ha gruppi, aggiungilo a "Senza gruppo"
      if (!hasGroup) {
        grouped['no-group'].users.push(user);
      }
    });
    
    // Rimuovi gruppi vuoti (eccetto "Senza gruppo")
    Object.keys(grouped).forEach(key => {
      if (grouped[key].users.length === 0 && key !== 'no-group') {
        delete grouped[key];
      }
    });
    
    console.log("Final grouped users:", grouped);
    
    return grouped;
  }, [filteredUsers, groups]);

  // Toggle gruppo espanso
  const toggleGroupExpansion = (groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Funzione per caricare i dati della settimana corrente
  const loadWeekData = async () => {
    try {
      setLoading(true);

      if (!canViewUserData(selectedUserId)) {
        toast({
          title: "Errore di permessi",
          description: "Non hai i permessi per visualizzare i dati di questo utente",
          variant: "destructive",
        });
        return;
      }

      const data = await getUserTimeWeekly(selectedUserId, weekStartDate);
      setWeekData({
        dailyEntries: data[0] || [],
        weeklyTotals: data[1] || [],
        dailyTotals: data[2] || [],
      });

      const tasks = await getUserAvailableTasks(selectedUserId);
      setAvailableTasks(tasks);
    } catch (error) {
      console.error("Errore nel caricamento dei dati settimanali:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile caricare i dati delle ore",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Carica i dati all'avvio e quando cambiano le date o l'utente selezionato
  useEffect(() => {
    loadWeekData();
  }, [weekStartDate, selectedUserId]);

// Gestione cambio stato attività
const handleTaskStatusChange = async (taskId, projectId, newStatus, taskData) => {
  try {
    setEditingTaskStatus(prev => ({ ...prev, [taskId]: true }));
    
    // Prepara il payload completo per l'aggiornamento
    const updatePayload = {
      TaskID: taskId,
      ProjectID: projectId,
      Title: taskData.TaskTitle || taskData.Title,
      Description: taskData.Description || '',
      Status: newStatus,
      Priority: taskData.Priority || 'MEDIA',
      AssignedTo: taskData.AssignedTo || null,
      StartDate: taskData.StartDate || null,
      DueDate: taskData.DueDate || null,
      PredecessorTaskID: taskData.PredecessorTaskID || null,
      AdditionalAssignees: taskData.AdditionalAssignees || JSON.stringify([]),
      PredecessorTasks: taskData.PredecessorTasks || null
    };

    // Usa addUpdateProjectTask invece di updateTaskStatus
    const result = await addUpdateProjectTask(updatePayload);

    if (result?.success) {
      toast({
        title: "✨ Stato aggiornato",
        description: "Lo stato dell'attività è stato aggiornato con successo",
      });
      
      // Ricarica i dati
      await loadWeekData();
    } else {
      throw new Error(result?.msg || "Errore nell'aggiornamento");
    }
  } catch (error) {
    console.error("Error updating task status:", error);
    toast({
      title: "Errore",
      description: error.message || "Errore nell'aggiornamento dello stato",
      variant: "destructive",
    });
  } finally {
    setEditingTaskStatus(prev => ({ ...prev, [taskId]: false }));
  }
};

  // Funzioni di navigazione settimana
  const navigateToPreviousWeek = () => {
    setWeekStartDate((prev) => subWeeks(prev, 1));
  };

  const navigateToNextWeek = () => {
    const nextWeek = addWeeks(weekStartDate, 1);
    if (nextWeek <= startOfWeek(new Date(), { weekStartsOn: 1 })) {
      setWeekStartDate(nextWeek);
    }
  };

  // Calcola le date della settimana attuale
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStartDate, i));
    }
    return days;
  }, [weekStartDate]);

  // Utility functions
  const isFutureDay = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  const getEntriesForDay = (date) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    return weekData.dailyEntries.filter(
      (entry) =>
        format(parseISO(entry.WorkDate), "yyyy-MM-dd") === formattedDate,
    );
  };

  const getTotalForDay = (date) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    const dayTotal = weekData.dailyTotals.find(
      (day) => format(parseISO(day.WorkDate), "yyyy-MM-dd") === formattedDate,
    );
    return dayTotal ? dayTotal.TotalHours : 0;
  };

  const getRemainingHours = (date) => {
    const total = getTotalForDay(date);
    return Math.max(0, 8 - total);
  };

  const formatHoursIndicator = (hours) => {
    if (hours === 0) return "0h";
    if (hours % 1 === 0) return `${hours}h`;
    return `${hours}h`;
  };

  const getCellClass = (date, total) => {
    if (isFutureDay(date)) return "bg-gray-50 text-gray-400";
    if (total === 0) return "bg-red-50";
    if (total < 8) return "bg-yellow-50";
    if (total === 8) return "bg-green-50";
    return "bg-blue-50";
  };

  // Funzioni per il dialog
  const openAddDialog = async (date, taskId = null) => {
    setSelectedDate(date);
    setSelectedEntry(null);

    try {
      if (availableTasks.length === 0) {
        const tasks = await getUserAvailableTasks(selectedUserId);
        setAvailableTasks(tasks);
      }

      let filteredTasks = [];
      let preselectedTaskId = null;
      let taskData = null;

      if (taskId) {
        const selectedTask =
          weekData.dailyEntries.find((entry) => entry.TaskID === taskId) ||
          weekData.weeklyTotals.find((task) => task.TaskID === taskId);

        if (selectedTask) {
          preselectedTaskId = selectedTask.TaskID.toString();
          taskData = {
            projectName: selectedTask.ProjectName,
            taskName: selectedTask.TaskTitle
          };
        }
        
        filteredTasks = availableTasks.filter((task) =>
          weekData.weeklyTotals.some((t) => t.TaskID === task.TaskID)
        );
      } else {
        filteredTasks = availableTasks;
        
        if (filteredTasks.length === 0) {
          const tasks = await getUserAvailableTasks(selectedUserId);
          filteredTasks = tasks;
          setAvailableTasks(tasks);
        }
      }

      setDialogConfig({
        preselectedTaskId,
        availableTasks: filteredTasks,
        taskData
      });

      setIsDialogOpen(true);
    } catch (error) {
      console.error("Errore nel caricamento delle attività:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le attività disponibili",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (entry) => {
    setSelectedEntry(entry);
    setSelectedDate(null);

    const filteredTasks = availableTasks.filter((task) =>
      weekData.weeklyTotals.some((t) => t.TaskID === task.TaskID),
    );

    setDialogConfig({
      preselectedTaskId: null,
      availableTasks: filteredTasks,
    });

    setIsDialogOpen(true);
  };

  const handleSaveEntry = async (entryId, entryData) => {
    try {
      if (entryId) {
        await updateTimeEntry(entryId, entryData);
        toast({
          title: "Attività aggiornata",
          description: "Attività aggiornata con successo",
          style: { backgroundColor: "#2c7a7b", color: "#fff" },
        });
      } else {
        await addTimeEntry(entryData);
        toast({
          title: "Attività registrata",
          description: "Attività registrata con successo",
          style: { backgroundColor: "#2c7a7b", color: "#fff" },
        });
      }

      await loadWeekData();
    } catch (error) {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante il salvataggio",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteEntry = async (entry) => {
    const result = await swal.fire({
      title: "Sei sicuro?",
      text: "Questa operazione non può essere annullata",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sì, elimina",
      cancelButtonText: "Annulla",
    });

    if (result.isConfirmed) {
      try {
        await deleteTimeEntry(entry.EntryID);
        toast({
          title: "Ore eliminate",
          description: "Le ore sono state eliminate con successo",
        });

        await loadWeekData();
      } catch (error) {
        toast({
          title: "Errore",
          description: error.message || "Si è verificato un errore durante l'eliminazione",
          variant: "destructive",
        });
      }
    }
  };

  // Riepilogo settimanale
  const weekSummary = useMemo(() => {
    const totalHours = weekData.dailyTotals.reduce(
      (sum, day) => sum + day.TotalHours,
      0,
    );
    const completeDays = weekData.dailyTotals.filter(
      (day) => day.TotalHours >= 8,
    ).length;
    const incompleteDays = weekData.dailyTotals.filter(
      (day) => day.TotalHours > 0 && day.TotalHours < 8,
    ).length;
    const emptyDays = 7 - completeDays - incompleteDays;

    return {
      totalHours,
      completeDays,
      incompleteDays,
      emptyDays,
      weeklyTarget: 40,
      progress: Math.min(100, (totalHours / 40) * 100),
    };
  }, [weekData.dailyTotals]);

  // Debug per monitorare il caricamento degli utenti
  useEffect(() => {
    console.log("allUsers changed:", {
      count: allUsers?.length,
      loading: loadingUsers,
      users: allUsers?.slice(0, 2) // Mostra solo i primi 2 utenti per debug
    });
  }, [allUsers, loadingUsers]);

  return (
    <div className="" style={{ height: "calc(100vh - 105px)" }}>
      {/* Intestazione */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="relative">
              <Popover open={showUserDropdown} onOpenChange={setShowUserDropdown}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[250px] justify-between"
                    disabled={loadingUsers}
                  >
                    {loadingUsers ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin mr-2" />
                        Caricamento...
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="truncate">
                            {users.find(u => u.userId === selectedUserId)?.username || "Seleziona utente"}
                          </span>
                        </div>
                        <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                      </>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <div className="p-3 border-b">
                    <div className="space-y-3">
                      {/* Tabs per modalità visualizzazione */}
                      <Tabs value={selectedViewMode} onValueChange={setSelectedViewMode}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="users" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Utenti
                          </TabsTrigger>
                          <TabsTrigger value="groups" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Gruppi
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>

                      {/* Campo di ricerca */}
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Cerca utente..."
                          value={userSearchText}
                          onChange={(e) => setUserSearchText(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="h-[400px]">
                    {selectedViewMode === "users" ? (
                      // Vista utenti
                      <div className="p-2">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <button
                              key={user.userId}
                              onClick={() => {
                                setSelectedUserId(user.userId);
                                setShowUserDropdown(false);
                                setUserSearchText("");
                              }}
                              className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-3 ${
                                user.userId === selectedUserId ? "bg-blue-50 text-blue-700" : ""
                              }`}
                            >
                              <div className="flex-1">
                                <div className="font-medium">{user.username}</div>
                                <div className="text-sm text-gray-500">
                                  {user.firstName} {user.lastName}
                                </div>
                                {user.email && (
                                  <div className="text-xs text-gray-400">{user.email}</div>
                                )}
                              </div>
                              {user.groups && Array.isArray(user.groups) && user.groups.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {user.groups.slice(0, 2).map((group, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {group.groupName}
                                    </Badge>
                                  ))}
                                  {user.groups.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{user.groups.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <User className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                            <p>Nessun utente trovato</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Vista gruppi
                      <div className="p-2">
                        {Object.values(usersByGroup).map((group) => (
                          <div key={group.groupId} className="mb-2">
                            <button
                              onClick={() => toggleGroupExpansion(group.groupId)}
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-md transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform ${
                                    expandedGroups.includes(group.groupId) ? "rotate-180" : ""
                                  }`}
                                />
                                <Users className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">{group.groupName}</span>
                                <Badge variant="primary" className="ml-2">
                                  {group.users.length}
                                </Badge>
                              </div>
                            </button>
                            
                            {expandedGroups.includes(group.groupId) && (
                              <div className="ml-6 mt-1 space-y-1">
                                {group.users.map((user) => (
                                  <button
                                    key={user.userId}
                                    onClick={() => {
                                      setSelectedUserId(user.userId);
                                      setShowUserDropdown(false);
                                      setUserSearchText("");
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors ${
                                      user.userId === selectedUserId ? "bg-blue-50 text-blue-700" : ""
                                    }`}
                                  >
                                    <div className="font-medium text-sm">{user.username}</div>
                                    <div className="text-xs text-gray-500">
                                      {user.firstName} {user.lastName}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
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
              {format(weekStartDate, "dd MMM", { locale: it })} -{" "}
              {format(addDays(weekStartDate, 6), "dd MMM yyyy", { locale: it })}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={navigateToNextWeek}
              disabled={
                weekStartDate >= startOfWeek(new Date(), { weekStartsOn: 1 })
              }
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

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setIsTaskPanelOpen(true)}
                className="text-sm flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
              >
                <Plus className="h-4 w-4" />
                Crea attività
              </Button>

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
          <div
            className="relative"
            style={{ overflowX: "auto", overflowY: "visible" }}
          >
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
                      key={format(day, "yyyy-MM-dd")}
                      className={`w-[100px] h-16 text-center ${isToday(day) ? "bg-blue-50 font-medium" : "bg-white"} ${isFutureDay(day) ? "bg-gray-50 text-gray-400" : ""}`}
                    >
                      <div className="flex flex-col items-center h-full justify-center">
                        <span className="text-xs uppercase">
                          {format(day, "EEE", { locale: it })}
                        </span>
                        <span className="font-medium">
                          {format(day, "dd/MM")}
                        </span>
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
                    <TableCell
                      colSpan={9}
                      className="text-center py-8 text-gray-500"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <Clock className="h-12 w-12 mb-2 text-gray-300" />
                        <p>Nessuna attività registrata in questa settimana</p>
                        <p className="text-sm mt-1">
                          Clicca su un giorno per registrare ore
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {weekData.weeklyTotals.map((taskTotal, index) => (
                      <TableRow
                        key={`${taskTotal.ProjectID}-${taskTotal.TaskID}`}
                      >
                        <TableCell className="border-r sticky left-0 bg-white z-10">
                          <div className="pl-4 pr-4 max-w-[230px]">
                            <div className="text-xs text-gray-500 truncate">
                              {taskTotal.ProjectName}
                            </div>
                            <div className="font-medium truncate mt-1" title={taskTotal.TaskTitle}>
                              {taskTotal.TaskTitle}
                            </div>
                            
{/* Select per lo stato dell'attività */}
<div className="mt-1">
  <Select
    value={taskTotal.Status || "DA FARE"}
    onValueChange={(value) => 
      handleTaskStatusChange(taskTotal.TaskID, taskTotal.ProjectID, value, taskTotal)
    }
    disabled={editingTaskStatus[taskTotal.TaskID]}
  >
    <SelectTrigger className="h-7 w-full">
      <SelectValue>
        {taskTotal.Status && statusConfig[taskTotal.Status] ? (
          <div className="flex items-center gap-1">
            {statusConfig[taskTotal.Status].icon}
            <span className="text-xs">{taskTotal.Status}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-500">Seleziona stato</span>
        )}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      {Object.entries(statusConfig).map(([status, config]) => (
        <SelectItem key={status} value={status}>
          <div className="flex items-center gap-1">
            {config.icon}
            <span className="text-xs">{status}</span>
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
                          </div>
                        </TableCell>

                        {weekDays.map((day) => {
                          const entries = getEntriesForDay(day).filter(
                            (e) => e.TaskID === taskTotal.TaskID,
                          );

                          const dayTotal = entries.reduce(
                            (sum, entry) => sum + entry.HoursWorked,
                            0,
                          );

                          return (
                            <TableCell
                              key={format(day, "yyyy-MM-dd")}
                              className={`text-center border-r h-16 ${
                                dayTotal > 0 
                                  ? "bg-green-50" 
                                  : entries.some(e => e.EntryID > 0) 
                                    ? "bg-green-50" 
                                    : ""
                              } ${isFutureDay(day) ? "bg-gray-50" : ""}`}
                            >
                              {isFutureDay(day) ? (
                                <span className="text-gray-400">-</span>
                              ) : dayTotal > 0 ? (
                                <div className="flex flex-col items-center h-full justify-center">
                                  <Badge className="bg-white border border-green-200 text-green-700">
                                    {formatHoursIndicator(dayTotal)}
                                  </Badge>

                                  <div className="flex items-center justify-center mt-1 space-x-1">
                                    {entries.map((entry) => (
                                      <div
                                        key={entry.EntryID}
                                        className="flex space-x-1"
                                      >
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() =>
                                                  openEditDialog(entry)
                                                }
                                              >
                                                <Edit className="h-3 w-3 text-gray-500" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Modifica registrazione</p>
                                              <p className="text-xs">
                                                {entry.WorkType} - {entry.Notes}
                                              </p>
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
                                            onClick={() =>
                                              openAddDialog(
                                                day,
                                                taskTotal.TaskID,
                                              )
                                            }
                                          >
                                            <Plus className="h-3 w-3 text-gray-500" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Inserisci attività svolta</p>
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
                                  onClick={() =>
                                    openAddDialog(day, taskTotal.TaskID)
                                  }
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
                              {formatHoursIndicator(
                                taskTotal.TotalHoursForWeek,
                              )}
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
                            key={format(day, "yyyy-MM-dd")}
                            className={`border-t-2 border-gray-300 text-center h-16 ${getCellClass(day, total)}`}
                          >
                            {isFutureDay(day) ? (
                              <span className="text-gray-400">-</span>
                            ) : (
                              <div className="flex flex-col items-center h-full justify-center">
                                <span className="font-bold">
                                  {formatHoursIndicator(total)}
                                </span>

                                {!isFutureDay(day) && total < 8 && (
                                  <span className="text-xs text-gray-500">
                                    (+
                                    {formatHoursIndicator(
                                      getRemainingHours(day),
                                    )}
                                    )
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
        dialogConfig={dialogConfig}
      />

      {/* Panel per creare nuova attività */}
      <TimesheetTaskPanel
        isOpen={isTaskPanelOpen}
        onClose={() => setIsTaskPanelOpen(false)}
        onTaskCreated={loadWeekData}
        position={window.innerWidth < 768 ? "bottom" : "right"}
        defaultWidth={600}
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