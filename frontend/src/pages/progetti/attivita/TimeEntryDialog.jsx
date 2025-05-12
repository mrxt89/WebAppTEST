import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { it, se } from 'date-fns/locale';
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Info, 
  User, 
  Calendar,
  Check
} from 'lucide-react';

const TimeEntryDialog = ({ 
  isOpen, 
  onClose, 
  onSave, 
  entry = null, 
  date = null, 
  tasks = [], 
  userId, 
  isAdmin = false, 
  users = [],
  dialogConfig = {} // Nuovo parametro per ricevere la configurazione del dialog
}) => {
  // Stato del form
  const [formData, setFormData] = useState({
    taskId: '',
    userId: userId,
    workDate: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    hoursWorked: '',
    workType: 'INTERNO',
    notes: ''
  });
  
  // Stati per la UI
  const [loading, setLoading] = useState(false);
  
  // Filtra solo le attività presenti nella griglia
  const gridTasks = useMemo(() => {
    // Se ci sono attività filtrate nella configurazione del dialog, usale
    if (dialogConfig.availableTasks && dialogConfig.availableTasks.length > 0) {
      return dialogConfig.availableTasks;
    }
    
    // Altrimenti usa tutte le attività disponibili
    const uniqueTasks = [];
    const uniqueTaskIds = new Set();
    
    tasks.forEach(task => {
      if (!uniqueTaskIds.has(task.TaskID)) {
        uniqueTaskIds.add(task.TaskID);
        uniqueTasks.push(task);
      }
    });
    
    return uniqueTasks;
  }, [tasks, dialogConfig.availableTasks]);
  
  // Organizza le attività per progetto
  const tasksByProject = useMemo(() => {
    const projectMap = {};
    
    gridTasks.forEach(task => {
      const projectId = task.ProjectID;
      if (!projectMap[projectId]) {
        projectMap[projectId] = {
          projectId,
          projectName: task.ProjectName,
          tasks: []
        };
      }
      projectMap[projectId].tasks.push(task);
    });
    
    return Object.values(projectMap);
  }, [gridTasks]);
  
  // Popola il form con i dati dell'entry o setta la data se fornita
  useEffect(() => {
    if (entry) {
      // Se stiamo modificando un'entry esistente
      setFormData({
        taskId: entry.TaskID.toString(),
        userId: entry.UserID || userId,
        workDate: format(parseISO(entry.WorkDate), 'yyyy-MM-dd'),
        hoursWorked: entry.HoursWorked.toString(),
        workType: entry.WorkType || 'INTERNO',
        notes: entry.Notes || ''
      });
    } else {
      // Per nuove entry
      const initialData = {
        taskId: '',
        userId: userId,
        workDate: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        hoursWorked: '',
        workType: 'INTERNO',
        notes: ''
      };
      
      // Se c'è un taskId preselezionato nella configurazione del dialog, usalo
      if (dialogConfig && dialogConfig.preselectedTaskId) {
        console.log('Preselected task ID:', dialogConfig.preselectedTaskId);
        initialData.taskId = dialogConfig.preselectedTaskId;
      }
      
      setFormData(initialData);
    }
  }, [entry, date, userId, dialogConfig]);
  
  // Gestione della modifica degli input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Gestione della modifica dei select
  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Invio del form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.taskId || !formData.hoursWorked || parseFloat(formData.hoursWorked) <= 0) {
      toast({
        title: "Dati mancanti",
        description: "Completa tutti i campi obbligatori prima di salvare",
        variant: "destructive"
      });
      return;
    }
    
    if (parseFloat(formData.hoursWorked) > 12) {
      toast({
        title: "Ore eccessive",
        description: "Non puoi registrare più di 12 ore per una singola attività in un giorno",
        variant: "destructive"
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
        Notes: formData.notes
      };
      
      await onSave(entry ? entry.EntryID : null, apiData);
      onClose();
    } catch (error) {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante il salvataggio",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Trova l'attività selezionata
  const selectedTask = useMemo(() => {
    if (!formData.taskId) return null;
    return gridTasks.find(task => task.TaskID.toString() === formData.taskId);
  }, [formData.taskId, gridTasks]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{entry ? 'Modifica ore' : 'Aggiungi ore'}</DialogTitle>
          <DialogDescription>
            {entry 
              ? 'Modifica le ore registrate per questa attività' 
              : date ? `Aggiungi ore per ${format(date, 'EEEE d MMMM', { locale: it })}` : 'Aggiungi ore'}
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
                max={format(new Date(), 'yyyy-MM-dd')}
                required
              />
            </div>
            
            {isAdmin && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center">
                  Utente:
                  <User className="h-4 w-4 ml-1 text-gray-400" />
                </label>
                <Select
                  value={formData.userId.toString()}
                  onValueChange={(value) => handleSelectChange('userId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona utente" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.userId} value={user.userId.toString()}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          {/* Selezione Attività - Semplificata */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Attività:</label>
            {tasksByProject.length === 0 ? (
              <div className="text-sm text-gray-500 border rounded-md p-4 text-center">
                Nessuna attività disponibile nel timesheet
              </div>
            ) 
            // Se selectedTask non è null, aggiungi una classe per nascondere 
            : selectedTask ? (
              <div></div>
            ) : (
              <Select
                value={formData.taskId}
                onValueChange={(value) => handleSelectChange('taskId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona un'attività" />
                </SelectTrigger>
                <SelectContent>
                  {tasksByProject.map((project) => (
                    <SelectGroup key={project.projectId}>
                      <SelectLabel>{project.projectName}</SelectLabel>
                      {project.tasks.map((task) => (
                        <SelectItem key={task.TaskID} value={task.TaskID.toString()}>
                          {task.TaskTitle}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Mostra dettaglio attività selezionata */}
            {selectedTask && (
              <div className="text-sm p-2 bg-blue-50 border border-blue-200 rounded-md">
                <div className="font-medium">{selectedTask.TaskTitle}</div>
                <div className="text-xs text-gray-600">Progetto: {selectedTask.ProjectName}</div>
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
              <p className="text-xs text-gray-500">
                Minimo 0.25 ore
              </p>
            </div>
            
            <div className="space-y-2 hidden">
              <label className="text-sm font-medium">Tipo di lavoro:</label>
              <RadioGroup 
                defaultValue={formData.workType} 
                value={formData.workType}
                onValueChange={(value) => handleSelectChange('workType', value)}
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
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
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
                  {entry ? 'Aggiorna' : 'Salva'}
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