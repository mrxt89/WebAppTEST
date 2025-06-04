import React, { useState, useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, Info, User, Calendar, Check, Search, X } from "lucide-react";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Componente personalizzato per il select con ricerca
const TaskSelectWithSearch = ({ value, onValueChange, tasksByProject }) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Filtra i progetti e le attività in base alla ricerca
  const filteredProjects = useMemo(() => {
    if (!searchValue) return tasksByProject;

    const searchLower = searchValue.toLowerCase();

    const filtered = tasksByProject
      .map((project) => {
        const filteredTasks = project.tasks.filter((task) => {
          const taskTitle = String(task.Title || '').toLowerCase();
          const projectName = String(project.projectName || '').toLowerCase();
          const matches = taskTitle.includes(searchLower) || projectName.includes(searchLower);
            return matches;
        });

        return {
          ...project,
          tasks: filteredTasks
        };
      })
      .filter((project) => project.tasks.length > 0);

    return filtered;
  }, [tasksByProject, searchValue]);

  // Trova l'attività selezionata per mostrare il suo titolo
  const selectedTaskTitle = useMemo(() => {
    if (!value) return null;
    for (const project of tasksByProject) {
      const task = project.tasks.find((t) => t.TaskID.toString() === value);
      if (task) return String(task.Title || '');
    }
    return null;
  }, [value, tasksByProject]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedTaskTitle || "Seleziona un'attività"}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Cerca attività..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            {!filteredProjects || filteredProjects.length === 0 ? (
              <CommandEmpty>
                {searchValue ? "Nessuna attività trovata." : "Nessuna attività disponibile."}
              </CommandEmpty>
            ) : (
              <>
                {filteredProjects.map((project) => {
                  if (!project || !project.tasks) {
                    return null;
                  }
                  return (
                    <CommandGroup 
                      key={project.projectId} 
                      heading={project.projectName || `Progetto ${project.projectId}`}
                    >
                      {project.tasks.map((task) => {
                        if (!task || !task.TaskID) {
                          return null;
                        }
                        return (
                          <CommandItem
                            key={task.TaskID}
                            value={task.TaskID.toString()}
                            onSelect={(currentValue) => {
                              onValueChange(currentValue);
                              setOpen(false);
                              setSearchValue("");
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                value === task.TaskID.toString() ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {task.Title || 'Attività senza titolo'}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  );
                })}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const TimeEntryDialog = ({
  isOpen,
  onClose,
  onSave,
  entry = null,
  date = null,
  tasks = [],
  userId,
  isAdmin = false,
  dialogConfig = {}, // Nuovo parametro per ricevere la configurazione del dialog
}) => {
  // Stato del form
  const [formData, setFormData] = useState({
    taskId: "",
    userId: userId,
    workDate: date
      ? format(date, "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"),
    hoursWorked: "",
    workType: "INTERNO",
    notes: "",
  });

  // Stati per la UI
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const { fetchUsers } = useNotifications();

  // Carica gli utenti quando il dialog viene aperto (solo se admin)
  useEffect(() => {
    if (isOpen && isAdmin && users.length === 0) {
      loadUsers();
    }
  }, [isOpen, isAdmin]);

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const fetchedUsers = await fetchUsers();
      setUsers(fetchedUsers || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare gli utenti",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // Filtra solo le attività presenti nella griglia
  const gridTasks = useMemo(() => {
    // Se ci sono attività filtrate nella configurazione del dialog, usale
    if (dialogConfig.availableTasks && dialogConfig.availableTasks.length > 0) {
      return dialogConfig.availableTasks;
    }

    // Altrimenti usa tutte le attività disponibili
    const uniqueTasks = [];
    const uniqueTaskIds = new Set();
    
    // Verifica che tasks sia un array prima di iterarlo
    if (Array.isArray(tasks)) {
      tasks.forEach((task) => {
        if (!uniqueTaskIds.has(task.TaskID)) {
          uniqueTaskIds.add(task.TaskID);
          uniqueTasks.push(task);
        }
      });
    }

    return uniqueTasks;
  }, [tasks, dialogConfig.availableTasks]);

  // Organizza le attività per progetto
  const tasksByProject = useMemo(() => {
    const projectMap = {};
    gridTasks.forEach((task) => {
      const projectId = task.ProjectID;
      if (!projectMap[projectId]) {
        projectMap[projectId] = {
          projectId,
          projectName: task.ProjectName || task.projectName || `Progetto ${projectId}`,
          tasks: [],
        };
      }
      projectMap[projectId].tasks.push(task);
    });

    const result = Object.values(projectMap);
    return result;
  }, [gridTasks]);

  // Popola il form con i dati dell'entry o setta la data se fornita
  useEffect(() => {
    if (entry) {
      // Se stiamo modificando un'entry esistente
      setFormData({
        taskId: entry.TaskID.toString(),
        userId: entry.UserID || userId,
        workDate: format(parseISO(entry.WorkDate), "yyyy-MM-dd"),
        hoursWorked: entry.HoursWorked.toString(),
        workType: entry.WorkType || "INTERNO",
        notes: entry.Notes || "",
      });
    } else {
      // Per nuove entry
      const initialData = {
        taskId: "",
        userId: userId,
        workDate: date
          ? format(date, "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd"),
        hoursWorked: "",
        workType: "INTERNO",
        notes: "",
      };

      // Se c'è un taskId preselezionato nella configurazione del dialog, usalo
      if (dialogConfig && dialogConfig.preselectedTaskId) {
        initialData.taskId = dialogConfig.preselectedTaskId;
      }

      setFormData(initialData);
    }
  }, [entry, date, userId, dialogConfig]);

  // Gestione della modifica degli input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Gestione della modifica dei select
  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Invio del form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.taskId ||
      !formData.hoursWorked ||
      parseFloat(formData.hoursWorked) <= 0
    ) {
      toast({
        title: "Dati mancanti",
        description: "Completa tutti i campi obbligatori prima di salvare",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(formData.hoursWorked) > 12) {
      toast({
        title: "Ore eccessive",
        description:
          "Non puoi registrare più di 12 ore per una singola attività in un giorno",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Prepara i dati per l'API
      const apiData = {
        TaskID: parseInt(formData.taskId),
        UserID: parseInt(formData.userId),
        WorkDate: formData.workDate,
        HoursWorked: parseFloat(formData.hoursWorked),
        WorkType: formData.workType,
        Notes: formData.notes,
      };

      await onSave(entry ? entry.EntryID : null, apiData);
      onClose();
    } catch (error) {
      toast({
        title: "Errore",
        description:
          error.message || "Si è verificato un errore durante il salvataggio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Trova l'attività selezionata
  const selectedTask = useMemo(() => {
    if (!formData.taskId) return null;
    return gridTasks.find((task) => task.TaskID.toString() === formData.taskId);
  }, [formData.taskId, gridTasks]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{entry ? "Modifica ore" : "Aggiungi ore"}</DialogTitle>
          <DialogDescription>
            {entry
              ? "Modifica le ore registrate per questa attività"
              : date
                ? `Aggiungi ore per ${format(date, "EEEE d MMMM", { locale: it })}`
                : "Aggiungi ore"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          {/* Data e Utente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                Data:
                <Calendar className="h-4 w-4 ml-1 text-gray-400" />
              </label>
              <Input
                type="date"
                name="workDate"
                value={formData.workDate}
                onChange={handleInputChange}
                max={format(new Date(), "yyyy-MM-dd")}
                required
              />
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center">
                  Utente:
                  <User className="h-4 w-4 ml-1 text-gray-400" />
                </label>
                {usersLoading ? (
                  <div className="flex items-center justify-center p-2">
                    <Clock className="h-4 w-4 animate-spin mr-2" />
                    Caricamento utenti...
                  </div>
                ) : (
                  <Select
                    value={formData.userId.toString()}
                    onValueChange={(value) => handleSelectChange("userId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona utente" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem
                          key={user.userId}
                          value={user.userId.toString()}
                        >
                          {user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          {/* Selezione Attività con Ricerca */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Attività:</label>
            {tasksByProject.length === 0 ? (
              <div className="text-sm text-gray-500 border rounded-md p-4 text-center">
                Nessuna attività disponibile nel timesheet
              </div>
            ) : selectedTask ? (
              <div></div>
            ) : (
              <TaskSelectWithSearch
                value={formData.taskId}
                onValueChange={(value) => handleSelectChange("taskId", value)}
                tasksByProject={tasksByProject}
              />
            )}

            {/* Mostra dettaglio attività selezionata */}
            {selectedTask && (
              <div className="text-sm p-2 bg-blue-50 border border-blue-200 rounded-md">
                <div className="font-medium">{selectedTask.Title}</div>
                <div className="text-xs text-gray-600">
                  Progetto: {selectedTask.ProjectName || selectedTask.projectName}
                </div>
              </div>
            )}
          </div>

          {/* Ore e Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                Ore lavorate:
                <Clock className="h-4 w-4 ml-1 text-gray-400" />
              </label>
              <Input
                type="number"
                name="hoursWorked"
                value={formData.hoursWorked}
                onChange={handleInputChange}
                min="0.25"
                max="12"
                step="0.25"
                required
                className="text-center"
              />
              <p className="text-xs text-gray-500">Minimo 0.25 ore</p>
            </div>

            <div className="space-y-2 hidden">
              <label className="text-sm font-medium">Tipo di lavoro:</label>
              <RadioGroup
                defaultValue={formData.workType}
                value={formData.workType}
                onValueChange={(value) => handleSelectChange("workType", value)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="INTERNO" id="interno" />
                  <Label htmlFor="interno">Interno</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ESTERNO" id="esterno" />
                  <Label htmlFor="esterno">Esterno</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Note (opzionale):</label>
            <Textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Descrivi brevemente l'attività svolta"
              rows={2}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading || !formData.taskId}>
              {loading ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {entry ? "Aggiorna" : "Salva"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TimeEntryDialog;