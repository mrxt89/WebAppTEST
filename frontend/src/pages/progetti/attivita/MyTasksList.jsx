import React, { useState, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Clock,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ListTodo,
  AlertCircle,
  Filter,
  ArrowUpDown,
  Search,
  X,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { swal } from "@/lib/common";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MyTasksList = ({
  tasks,
  onTaskClick,
  onTaskUpdate,
  checkAdminPermission,
  isOwnTask,
  filtersVisible,
  isAdmin = false,
  columnFilters = {},
  onFilterChange,
}) => {
  const navigate = useNavigate();
  const [showColumnFilters, setShowColumnFilters] = useState(false);

  // Riferimenti ai campi di filtro
  const filterRefs = {
    title: useRef(null),
    project: useRef(null),
    status: useRef(null),
    priority: useRef(null),
    dueDate: useRef(null),
    assignedTo: useRef(null),
    participants: useRef(null),
  };

  // Configurazione stati e priorità
  const statusConfig = {
    "DA FARE": {
      color: "bg-gray-100 text-gray-700 border-gray-200",
      icon: <ListTodo className="h-4 w-4 mr-1" />,
    },
    "IN ESECUZIONE": {
      color: "bg-blue-100 text-blue-700 border-blue-200",
      icon: <Loader2 className="h-4 w-4 mr-1" />,
    },
    COMPLETATA: {
      color: "bg-green-100 text-green-700 border-green-200",
      icon: <CheckCircle2 className="h-4 w-4 mr-1" />,
    },
    BLOCCATA: {
      color: "bg-red-100 text-red-700 border-red-200",
      icon: <AlertCircle className="h-4 w-4 mr-1" />,
    },
    SOSPESA: {
      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
      icon: <AlertCircle className="h-4 w-4 mr-1" />,
    },
  };

  const priorityConfig = {
    ALTA: {
      color: "bg-red-50 text-red-600 border-red-200",
      icon: <AlertTriangle className="h-4 w-4 mr-1" />,
    },
    MEDIA: {
      color: "bg-yellow-50 text-yellow-600 border-yellow-200",
      icon: <AlertTriangle className="h-4 w-4 mr-1" />,
    },
    BASSA: {
      color: "bg-green-50 text-green-600 border-green-200",
      icon: <AlertTriangle className="h-4 w-4 mr-1" />,
    },
  };

  // Controlla se un'attività è in ritardo
  const isTaskDelayed = (task) => {
    if (task.Status === "COMPLETATA") return false;
    const dueDate = new Date(task.DueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  // Calcola i giorni mancanti alla scadenza
  const getDaysToDeadline = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateObj = new Date(dueDate);
    dueDateObj.setHours(0, 0, 0, 0);

    const diffTime = dueDateObj - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  // Formatta la visualizzazione dei giorni alla scadenza
  const formatDaysToDeadline = (task) => {
    if (!task.DueDate) return "Nessuna scadenza";

    const days = getDaysToDeadline(task.DueDate);
    // Se attività completata allora non visualizzo la scadenza
    if (task.Status === "COMPLETATA") {
      return "Completata";
    }
    if (days < 0) {
      return (
        <span className="text-red-500 font-medium">
          In ritardo di {Math.abs(days)} giorni
        </span>
      );
    }
    if (days === 0) {
      return <span className="text-red-500 font-medium">Scade oggi!</span>;
    }
    if (days === 1) {
      return <span className="text-orange-500 font-medium">Scade domani</span>;
    }
    if (days <= 3) {
      return (
        <span className="text-orange-500 font-medium">
          Scade tra {days} giorni
        </span>
      );
    }
    return <span>Scade tra {days} giorni</span>;
  };

  // Funzione per navigare alla pagina del progetto
  const navigateToProject = (e, projectId) => {
    e.stopPropagation();
    navigate(`/progetti/detail/${projectId}`);
  };

  // Funzione per gestire il filtro delle colonne
  const handleColumnFilter = (column, value) => {
    onFilterChange({
      ...columnFilters,
      [column]: value,
    });
  };

  // Funzione per applicare i filtri delle colonne
  const applyColumnFilters = () => {
    const newFilters = {};

    // Raccolta dei valori dai campi di input
    Object.keys(filterRefs).forEach((key) => {
      if (filterRefs[key].current && filterRefs[key].current.value) {
        newFilters[key] = filterRefs[key].current.value;
      }
    });

    onFilterChange({
      ...columnFilters,
      ...newFilters,
    });
  };

  // Funzione per pulire tutti i filtri delle colonne
  const clearColumnFilters = () => {
    // Reset dei campi di input
    Object.keys(filterRefs).forEach((key) => {
      if (filterRefs[key].current) {
        filterRefs[key].current.value = "";
      }
    });

    // Reset dei filtri
    onFilterChange({});
  };

  // Funzione per estrarre i partecipanti se esistono e formattarli
  const getParticipants = (task) => {
    if (!task.Participants) return [];

    try {
      if (typeof task.Participants === "string") {
        const parsed = JSON.parse(task.Participants);
        return parsed;
      }
      return task.Participants;
    } catch (error) {
      console.error("Error parsing participants:", error);
      return [];
    }
  };

  // Altezza della tabella in base a se la sezione dei filtri è aperta o meno
  const tableHeight = filtersVisible ? "h-[calc(100%-4rem)]" : "h-full";

  return (
    <div className="space-y-2">
      <ScrollArea className={tableHeight}>
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHead className="min-w-[250px] max-w-[300px]">
                <div className="flex items-center">
                  <span>Attività</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 ml-1"
                      >
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        onClick={() =>
                          onFilterChange({
                            ...columnFilters,
                            sortBy: "title",
                            sortDirection: "asc",
                          })
                        }
                      >
                        A-Z
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          onFilterChange({
                            ...columnFilters,
                            sortBy: "title",
                            sortDirection: "desc",
                          })
                        }
                      >
                        Z-A
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableHead>
              <TableHead className="min-w-[150px]">
                <div className="flex items-center">
                  <span>Progetto</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 ml-1"
                      >
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        onClick={() =>
                          onFilterChange({
                            ...columnFilters,
                            sortBy: "project",
                            sortDirection: "asc",
                          })
                        }
                      >
                        A-Z
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          onFilterChange({
                            ...columnFilters,
                            sortBy: "project",
                            sortDirection: "desc",
                          })
                        }
                      >
                        Z-A
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableHead>
              <TableHead className="w-[120px]">
                <div className="flex items-center">
                  <span>Stato</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 ml-1"
                      >
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        onClick={() =>
                          onFilterChange({
                            ...columnFilters,
                            sortBy: "status",
                            sortDirection: "asc",
                          })
                        }
                      >
                        A-Z
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          onFilterChange({
                            ...columnFilters,
                            sortBy: "status",
                            sortDirection: "desc",
                          })
                        }
                      >
                        Z-A
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableHead>
              <TableHead className="w-[120px]">
                <div className="flex items-center">
                  <span>Priorità</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 ml-1"
                      >
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        onClick={() =>
                          onFilterChange({
                            ...columnFilters,
                            sortBy: "priority",
                            sortDirection: "asc",
                          })
                        }
                      >
                        Bassa-Alta
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          onFilterChange({
                            ...columnFilters,
                            sortBy: "priority",
                            sortDirection: "desc",
                          })
                        }
                      >
                        Alta-Bassa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableHead>
              <TableHead className="min-w-[170px]">
                <div className="flex items-center">
                  <span>Scadenza</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 ml-1"
                      >
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        onClick={() =>
                          onFilterChange({
                            ...columnFilters,
                            sortBy: "dueDate",
                            sortDirection: "asc",
                          })
                        }
                      >
                        Prima in scadenza
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          onFilterChange({
                            ...columnFilters,
                            sortBy: "dueDate",
                            sortDirection: "desc",
                          })
                        }
                      >
                        Ultime in scadenza
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableHead>

              {/* Colonne aggiuntive per gli admin */}
              {isAdmin && (
                <>
                  <TableHead className="min-w-[150px]">
                    <div className="flex items-center">
                      <span>Responsabile</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 ml-1"
                          >
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem
                            onClick={() =>
                              onFilterChange({
                                ...columnFilters,
                                sortBy: "assignedTo",
                                sortDirection: "asc",
                              })
                            }
                          >
                            A-Z
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              onFilterChange({
                                ...columnFilters,
                                sortBy: "assignedTo",
                                sortDirection: "desc",
                              })
                            }
                          >
                            Z-A
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[170px]">
                    <span>Partecipanti</span>
                  </TableHead>
                </>
              )}

              <TableHead className="text-right w-[120px]">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow
                key={task.TaskID}
                className={`cursor-pointer hover:bg-gray-50 ${
                  isTaskDelayed(task) ? "border-l-2 border-l-red-400" : ""
                }`}
                onClick={() => onTaskClick(task)}
              >
                <TableCell className="max-w-[300px]">
                  <div className="flex flex-col gap-1">
                    <div className="font-medium text-base line-clamp-2">
                      {task.Title}
                    </div>
                    {task.Description && (
                      <div className="text-gray-500 text-sm line-clamp-2">
                        {task.Description}
                      </div>
                    )}
                    {task.CommentsCount > 0 && (
                      <Badge variant="outline" className="text-gray-600 w-fit">
                        💬 {task.CommentsCount} commenti
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div
                    className="flex items-center gap-1 text-blue-600 hover:underline cursor-pointer"
                    onClick={(e) => navigateToProject(e, task.ProjectID)}
                  >
                    {task.ProjectName}
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusConfig[task.Status]?.color}
                  >
                    {statusConfig[task.Status]?.icon}
                    {task.Status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={priorityConfig[task.Priority]?.color}
                  >
                    {priorityConfig[task.Priority]?.icon}
                    {task.Priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div className="whitespace-nowrap">
                      {formatDaysToDeadline(task)}
                    </div>
                  </div>
                </TableCell>

                {/* Colonne aggiuntive per gli admin */}
                {isAdmin && (
                  <>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">
                          {task.AssignedToName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getParticipants(task).length > 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4 text-gray-500" />
                                  <span className="text-gray-600 text-sm">
                                    {getParticipants(task).length} partecipanti
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="max-w-[200px]">
                                  <p className="font-medium mb-1">
                                    Partecipanti:
                                  </p>
                                  <ul className="text-xs">
                                    {getParticipants(task).map(
                                      (participant, index) => (
                                        <li key={index}>
                                          {participant.firstName}{" "}
                                          {participant.lastName} (
                                          {participant.role})
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-gray-400 text-sm">
                            Nessun partecipante
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </>
                )}

                <TableCell className="text-right">
                  <div className="flex items-center justify-end">
                    {task.Status !== "COMPLETATA" &&
                      (checkAdminPermission({
                        AdminPermission: task.AdminPermission,
                      }) ||
                        isOwnTask(task)) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 border-green-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskUpdate({
                              ...task,
                              Status: "COMPLETATA",
                            });
                          }}
                        >
                          <CheckCircle2
                            className="h-4 w-4 mr-1"
                            id="completeTaskBtn"
                          />
                          Completa
                        </Button>
                      )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

export default MyTasksList;
