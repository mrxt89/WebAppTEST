import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Calendar,
  AlertTriangle,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  Loader2,
  ListTodo,
  AlertCircle,
  MoreVertical,
  Eye,
  Pin,
  PinOff,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  ArrowUpDown,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import useProjectActions from "../../../hooks/useProjectManagementActions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MyTasksList = ({
  tasks,
  onTaskClick,
  onTaskUpdate,
  checkAdminPermission,
  isOwnTask,
  filtersVisible,
  isAdmin,
  columnFilters,
  onFilterChange,
  onProjectClick,
}) => {
  const { user } = useAuth();
  const { manageTaskPin } = useProjectActions();
  
  // Stati per gestire i pin
  const [pinnedTasks, setPinnedTasks] = useState(new Set());
  const [pinLoading, setPinLoading] = useState(null);
  
  // Stati per il ridimensionamento delle colonne
  const [columnWidths, setColumnWidths] = useState([
    250, // title
    180, // project
    150, // assignedTo
    150, // participants
    120, // status
    120, // dueDate
    100, // priority
    80,  // comments
    80,  // attachments
    60   // actions
  ]);
  const [isResizing, setIsResizing] = useState(null);
  const tableRef = useRef(null);
  
  // Stati per i filtri di colonna
  const [localFilters, setLocalFilters] = useState({
    title: "",
    project: "",
    assignedTo: "",
    participants: "",
    status: "",
    dueDate: "",
    priority: ""
  });
  
  // Stati per l'ordinamento
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc"
  });

  // Popover aperto per filtri
  const [openFilterPopover, setOpenFilterPopover] = useState(null);

  // Carica i task pinnati all'avvio
  useEffect(() => {
    const pinned = new Set(
      tasks.filter(task => task.IsPinned).map(task => task.TaskID)
    );
    setPinnedTasks(pinned);
  }, [tasks]);

  // Configurazione stati e priorità
  const statusConfig = {
    "DA FARE": {
      icon: <ListTodo className="w-4 h-4 mr-1" />,
      color: "bg-gray-100 text-gray-700 border-gray-200",
    },
    "IN ESECUZIONE": {
      icon: <Loader2 className="w-4 h-4 mr-1" />,
      color: "bg-blue-100 text-blue-700 border-blue-200",
    },
    COMPLETATA: {
      icon: <CheckCircle2 className="w-4 h-4 mr-1" />,
      color: "bg-green-100 text-green-700 border-green-200",
    },
    BLOCCATA: {
      icon: <AlertCircle className="w-4 h-4 mr-1" />,
      color: "bg-red-100 text-red-700 border-red-200",
    },
    SOSPESA: {
      icon: <AlertCircle className="w-4 h-4 mr-1" />,
      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    },
  };

  const priorityConfig = {
    ALTA: { color: "bg-red-100 text-red-700 border-red-200" },
    MEDIA: { color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    BASSA: { color: "bg-green-100 text-green-700 border-green-200" },
  };

  // Funzioni helper
  const isDelayed = (task) => {
    if (task.Status === "COMPLETATA") return false;
    const dueDate = new Date(task.DueDate);
    dueDate.setHours(23, 59, 59);
    return dueDate < new Date();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: it });
    } catch (error) {
      return dateString;
    }
  };

  const getInitials = (name) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Gestione pin
  const handlePinTask = async (taskId, isPinned) => {
    try {
      setPinLoading(taskId);
      const action = isPinned ? 'UNPIN' : 'PIN';
      const result = await manageTaskPin(taskId, action);
      
      if (result.success) {
        setPinnedTasks(prev => {
          const newSet = new Set(prev);
          if (isPinned) {
            newSet.delete(taskId);
          } else {
            newSet.add(taskId);
          }
          return newSet;
        });
        
        toast({
          title: isPinned ? "Pin rimosso" : "Attività fissata",
          description: result.msg,
          variant: "success",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Error pinning task:", error);
      toast({
        title: "Errore",
        description: "Errore nella gestione del pin",
        variant: "destructive",
      });
    } finally {
      setPinLoading(null);
    }
  };

  // Gestione ridimensionamento colonne
  const handleMouseDown = (e, index) => {
    e.preventDefault();
    setIsResizing(index);
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (isResizing === null) return;

      const table = tableRef.current?.querySelector('table');
      if (!table) return;

      const ths = table.querySelectorAll('thead th');
      const startX = ths[isResizing].getBoundingClientRect().left;
      const currentX = e.clientX;
      const diff = currentX - startX;
      
      setColumnWidths(prev => {
        const newWidths = [...prev];
        newWidths[isResizing] = Math.max(80, diff);
        return newWidths;
      });
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (isResizing !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Gestione filtri locali
  const handleLocalFilterChange = (field, value) => {
    const newFilters = { ...localFilters, [field]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearLocalFilter = (field) => {
    const newFilters = { ...localFilters, [field]: "" };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Gestione ordinamento
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    onFilterChange({ ...localFilters, sortBy: key, sortDirection: direction });
  };

  // Filtro e ordinamento tasks
  const sortedTasks = useMemo(() => {
    // Separa tasks pinnati da non pinnati
    const pinnedTasksList = tasks.filter(task => pinnedTasks.has(task.TaskID));
    const unpinnedTasksList = tasks.filter(task => !pinnedTasks.has(task.TaskID));

    // Ordina i task pinnati per PinOrder
    pinnedTasksList.sort((a, b) => (a.PinOrder || 0) - (b.PinOrder || 0));

    // Ordina i task non pinnati secondo il criterio selezionato
    if (sortConfig.key) {
      unpinnedTasksList.sort((a, b) => {
        let valueA, valueB;

        switch (sortConfig.key) {
          case "Title":
            valueA = a.Title || "";
            valueB = b.Title || "";
            break;
          case "ProjectName":
            valueA = a.ProjectName || "";
            valueB = b.ProjectName || "";
            break;
          case "AssignedToName":
            valueA = a.AssignedToName || "";
            valueB = b.AssignedToName || "";
            break;
          case "Status":
            valueA = a.Status || "";
            valueB = b.Status || "";
            break;
          case "DueDate":
            valueA = new Date(a.DueDate || 0).getTime();
            valueB = new Date(b.DueDate || 0).getTime();
            break;
          case "Priority":
            const priorityWeight = { ALTA: 3, MEDIA: 2, BASSA: 1 };
            valueA = priorityWeight[a.Priority] || 0;
            valueB = priorityWeight[b.Priority] || 0;
            break;
          default:
            return 0;
        }

        if (typeof valueA === "string" && typeof valueB === "string") {
          return sortConfig.direction === "asc"
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        }

        return sortConfig.direction === "asc" ? valueA - valueB : valueB - valueA;
      });
    }

    return [...pinnedTasksList, ...unpinnedTasksList];
  }, [tasks, pinnedTasks, sortConfig]);

  // Render filtro colonna
  const renderColumnFilter = (field, type = "text") => {
    const hasFilter = localFilters[field] && localFilters[field] !== "";
    
    return (
      <Popover open={openFilterPopover === field} onOpenChange={(open) => setOpenFilterPopover(open ? field : null)}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 w-6 p-0 ml-1 transition-colors ${
              hasFilter 
                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">
                Filtra {field === "title" ? "titolo" : 
                       field === "project" ? "progetto" : 
                       field === "assignedTo" ? "assegnato a" : 
                       field === "participants" ? "partecipanti" : 
                       field === "status" ? "stato" : 
                       field === "dueDate" ? "scadenza" : 
                       field === "priority" ? "priorità" : field}
              </h4>
              {hasFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => clearLocalFilter(field)}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancella
                </Button>
              )}
            </div>
            
            {type === "text" && (
              <div className="space-y-2">
                <Input
                  placeholder={`Cerca ${field === "title" ? "nel titolo..." : 
                               field === "project" ? "nel progetto..." : 
                               field === "assignedTo" ? "l'utente..." : 
                               field === "participants" ? "i partecipanti..." : "..."}`}
                  value={localFilters[field] || ""}
                  onChange={(e) => handleLocalFilterChange(field, e.target.value)}
                  className="h-8"
                />
              </div>
            )}
            
            {type === "select" && field === "status" && (
              <div className="space-y-2">
                <Select
                  value={localFilters[field] || "all"}
                  onValueChange={(value) => handleLocalFilterChange(field, value === "all" ? "" : value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Seleziona stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="DA FARE">
                      <div className="flex items-center gap-2">
                        <ListTodo className="h-3 w-3" />
                        Da Fare
                      </div>
                    </SelectItem>
                    <SelectItem value="IN ESECUZIONE">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3" />
                        In Esecuzione
                      </div>
                    </SelectItem>
                    <SelectItem value="COMPLETATA">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3" />
                        Completata
                      </div>
                    </SelectItem>
                    <SelectItem value="BLOCCATA">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-3 w-3" />
                        Bloccata
                      </div>
                    </SelectItem>
                    <SelectItem value="SOSPESA">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-3 w-3" />
                        Sospesa
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {type === "select" && field === "priority" && (
              <div className="space-y-2">
                <Select
                  value={localFilters[field] || "all"}
                  onValueChange={(value) => handleLocalFilterChange(field, value === "all" ? "" : value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Seleziona priorità" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le priorità</SelectItem>
                    <SelectItem value="ALTA">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        Alta
                      </div>
                    </SelectItem>
                    <SelectItem value="MEDIA">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        Media
                      </div>
                    </SelectItem>
                    <SelectItem value="BASSA">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Bassa
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {type === "select" && field === "dueDate" && (
              <div className="space-y-2">
                <Select
                  value={localFilters[field] || "all"}
                  onValueChange={(value) => handleLocalFilterChange(field, value === "all" ? "" : value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Seleziona periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le date</SelectItem>
                    <SelectItem value="inRitardo">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                        In ritardo
                      </div>
                    </SelectItem>
                    <SelectItem value="oggi">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Oggi
                      </div>
                    </SelectItem>
                    <SelectItem value="domani">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Domani
                      </div>
                    </SelectItem>
                    <SelectItem value="settimana">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Questa settimana
                      </div>
                    </SelectItem>
                    <SelectItem value="mese">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Questo mese
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {hasFilter && (
              <div className="pt-2 border-t">
                <div className="text-xs text-gray-500">
                  Filtro attivo: <span className="font-medium text-gray-700">{localFilters[field]}</span>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div 
      className="border rounded-md h-full overflow-hidden" 
      ref={tableRef}
      style={{ 
        height: filtersVisible 
          ? 'calc(100vh - 105px - 60px - 48px - 40px - 240px)' 
          : 'calc(100vh - 105px - 60px - 48px - 40px - 180px)'
      }}
    >
      <div className="relative w-full h-full overflow-auto overflow-x-auto">
        <Table 
          className="w-full"
          style={{ 
            minWidth: `${columnWidths.reduce((sum, width) => sum + width, 0)}px` 
          }}
        >
          <TableHeader className="sticky top-0 z-10 bg-gray-50">
            <TableRow>
              <TableHead
                style={{ width: `${columnWidths[0]}px`, position: 'relative' }}
                className="cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center flex-1"
                    onClick={() => handleSort("Title")}
                  >
                    <span>Titolo</span>
                    {sortConfig.key === "Title" && (
                      sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                  {renderColumnFilter("title")}
                </div>
                {localFilters.title && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => handleMouseDown(e, 0)}
                />
              </TableHead>
              
              <TableHead
                style={{ width: `${columnWidths[1]}px`, position: 'relative' }}
                className="cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center flex-1"
                    onClick={() => handleSort("ProjectName")}
                  >
                    <span>Progetto</span>
                    {sortConfig.key === "ProjectName" && (
                      sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                  {renderColumnFilter("project")}
                </div>
                {localFilters.project && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => handleMouseDown(e, 1)}
                />
              </TableHead>
              
              {isAdmin && (
                <TableHead
                  style={{ width: `${columnWidths[2]}px`, position: 'relative' }}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center flex-1"
                      onClick={() => handleSort("AssignedToName")}
                    >
                      <span>Assegnato a</span>
                      {sortConfig.key === "AssignedToName" && (
                        sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                    {renderColumnFilter("assignedTo")}
                  </div>
                  {localFilters.assignedTo && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown(e, 2)}
                  />
                </TableHead>
              )}
              
              {isAdmin && (
                <TableHead
                  style={{ width: `${columnWidths[3]}px`, position: 'relative' }}
                  className="hover:bg-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <span>Partecipanti</span>
                    {renderColumnFilter("participants")}
                  </div>
                  {localFilters.participants && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown(e, 3)}
                  />
                </TableHead>
              )}
              
              <TableHead
                style={{ width: `${columnWidths[4]}px`, position: 'relative' }}
                className="cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center flex-1"
                    onClick={() => handleSort("Status")}
                  >
                    <span>Stato</span>
                    {sortConfig.key === "Status" && (
                      sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                  {renderColumnFilter("status", "select")}
                </div>
                {localFilters.status && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => handleMouseDown(e, 4)}
                />
              </TableHead>
              
              <TableHead
                style={{ width: `${columnWidths[5]}px`, position: 'relative' }}
                className="cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center flex-1"
                    onClick={() => handleSort("DueDate")}
                  >
                    <span>Scadenza</span>
                    {sortConfig.key === "DueDate" && (
                      sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                  {renderColumnFilter("dueDate", "select")}
                </div>
                {localFilters.dueDate && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => handleMouseDown(e, 5)}
                />
              </TableHead>
              
              <TableHead
                style={{ width: `${columnWidths[6]}px`, position: 'relative' }}
                className="cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center flex-1"
                    onClick={() => handleSort("Priority")}
                  >
                    <span>Priorità</span>
                    {sortConfig.key === "Priority" && (
                      sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                  {renderColumnFilter("priority", "select")}
                </div>
                {localFilters.priority && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => handleMouseDown(e, 6)}
                />
              </TableHead>
              
              <TableHead 
                style={{ width: `${columnWidths[7]}px`, position: 'relative' }}
                className="text-center"
              >
                Commenti
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => handleMouseDown(e, 7)}
                />
              </TableHead>
              
              <TableHead 
                style={{ width: `${columnWidths[8]}px`, position: 'relative' }}
                className="text-center"
              >
                Allegati
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => handleMouseDown(e, 8)}
                />
              </TableHead>
              
              <TableHead style={{ width: `${columnWidths[9]}px` }} className="text-center">
                Azioni
              </TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {sortedTasks.map((task) => {
              const isPinned = pinnedTasks.has(task.TaskID);
              const canEdit = isOwnTask(task) || checkAdminPermission(task);
              
              return (
                <TableRow 
                  key={task.TaskID}
                  className={`
                    cursor-pointer hover:bg-gray-50
                    ${isPinned ? 'bg-yellow-50 border-l-4 border-l-yellow-400' : ''}
                  `}
                  onClick={() => onTaskClick(task)}
                >
                  {/* Titolo */}
                  <TableCell className="font-medium" title={task.Description}>
                    <div className="max-w-[250px] truncate flex items-center gap-2">
                      {isPinned && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Pin className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Attività fissata</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {task.Title}
                    </div>
                  </TableCell>
                  
                  {/* Progetto */}
                  <TableCell>
                    <Button
                      variant="link"
                      className="p-0 h-auto font-normal text-blue-600 hover:text-blue-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        onProjectClick(task.ProjectID);
                      }}
                    >
                      {task.ProjectName}
                    </Button>
                  </TableCell>
                  
                  {/* Assegnato a (solo per admin) */}
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {getInitials(task.AssignedToName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{task.AssignedToName}</span>
                      </div>
                    </TableCell>
                  )}
                  
                  {/* Partecipanti (solo per admin) */}
                  {isAdmin && (
                    <TableCell>
                     
                      {task.Participants && task.Participants !== "[]" ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">
                                  {(() => {
                                    try {
                                      const participants = typeof task.Participants === 'string' 
                                        ? JSON.parse(task.Participants) 
                                        : task.Participants;
                                      return participants.length;
                                    } catch (e) {
                                      return 0;
                                    }
                                  })()}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-medium text-xs">Partecipanti:</p>
                                <div className="text-xs">
                                  {(() => {
                                    try {
                                      const participants = typeof task.Participants === 'string' 
                                        ? JSON.parse(task.Participants) 
                                        : task.Participants;
                                      return participants.map((participant, index) => (
                                        <div key={index} className="flex items-center gap-2 py-1">
                                          <Avatar className="h-4 w-4">
                                            <AvatarFallback className="text-xs">
                                              {getInitials(`${participant.firstName} ${participant.lastName}`)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="flex flex-col">
                                            <span className="font-medium">
                                              {participant.firstName} {participant.lastName}
                                            </span>
                                          </div>
                                        </div>
                                      ));
                                    } catch (e) {
                                      return <span className="text-gray-500">Errore nel caricamento</span>;
                                    }
                                  })()}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  )}
                  
                  {/* Stato */}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`flex items-center ${statusConfig[task.Status]?.color || "bg-gray-100"}`}
                    >
                      {statusConfig[task.Status]?.icon}
                      {task.Status}
                    </Badge>
                  </TableCell>
                  
                  {/* Scadenza */}
                  <TableCell>
                    <div className={`flex items-center gap-1 ${isDelayed(task) ? "text-red-600" : ""}`}>
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(task.DueDate)}</span>
                      {isDelayed(task) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Attività in ritardo</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Priorità */}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={priorityConfig[task.Priority]?.color || "bg-gray-100"}
                    >
                      {task.Priority}
                    </Badge>
                  </TableCell>
                  
                  {/* Commenti */}
                  <TableCell className="text-center">
                    {task.CommentsCount > 0 ? (
                      <Badge
                        variant="outline"
                        className="flex items-center justify-center mx-auto gap-1 bg-blue-50 text-blue-600"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{task.CommentsCount}</span>
                      </Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  
                  {/* Allegati */}
                  <TableCell className="text-center">
                    {task.AttachmentsCount > 0 ? (
                      <Badge
                        variant="outline"
                        className="flex items-center justify-center mx-auto gap-1 bg-blue-50 text-blue-600"
                      >
                        <Paperclip className="w-3 h-3" />
                        <span>{task.AttachmentsCount}</span>
                      </Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  
                  {/* Azioni */}
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskClick(task);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizza
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePinTask(task.TaskID, isPinned);
                          }}
                          disabled={pinLoading === task.TaskID}
                        >
                          {isPinned ? (
                            <>
                              <PinOff className="mr-2 h-4 w-4" />
                              Rimuovi pin
                            </>
                          ) : (
                            <>
                              <Pin className="mr-2 h-4 w-4" />
                              Fissa in alto
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {sortedTasks.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 10 : 8}
                  className="text-center py-10 text-gray-500"
                >
                  Nessuna attività trovata
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MyTasksList;