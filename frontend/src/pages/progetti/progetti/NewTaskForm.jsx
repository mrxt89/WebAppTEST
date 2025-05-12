import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, User } from 'lucide-react';
import { config } from '../../../config';
import useUsers from '../../../hooks/useUsersActions';
import { swal } from '../../../lib/common';

const NewTaskForm = ({ onSubmit, onCancel, projectTasks = [] }) => {
  const { users, loading: loadingUsers, fetchUsers } = useUsers();
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [assignmentType, setAssignmentType] = useState('individual'); // 'individual' o 'group'
  const [availableGroups, setAvailableGroups] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  
  const [taskData, setTaskData] = useState({
    Title: '',
    Description: '',
    AssignedTo: '',
    Participants: [],
    Priority: 'MEDIA',
    StartDate: new Date().toISOString().split('T')[0], // Set current date as default
    DueDate: '',
    Status: 'DA FARE',
    PredecessorTaskID: null,
    DefaultGroupId: null
  });

  useEffect(() => {
    fetchUsers();
    fetchGroups();
  }, [fetchUsers]);

  // Funzione per caricare i gruppi
  const fetchGroups = useCallback(async () => {
    try {
      setIsLoadingGroups(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_BASE_URL}/groups`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error fetching groups');
      }

      const data = await response.json();
      setAvailableGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setIsLoadingGroups(false);
    }
  }, []);

  // Funzione per gestire la selezione di un gruppo
  const handleGroupChange = async (groupId) => {
    try {
      // Se viene selezionato "nessun gruppo"
      if (groupId === "null") {
        setSelectedGroupId(null);
        setTaskData(prev => ({
          ...prev,
          DefaultGroupId: null,
          Participants: []
        }));
        return;
      }
      
      const numericGroupId = parseInt(groupId);
      setSelectedGroupId(numericGroupId);
      
      // Aggiorna il DefaultGroupId nel taskData
      setTaskData(prev => ({
        ...prev,
        DefaultGroupId: numericGroupId
      }));
      
      // Carica i membri del gruppo selezionato
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_BASE_URL}/groups/${numericGroupId}/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error fetching group members');
      }

      const groupMembers = await response.json();
      
      // Se ci sono membri nel gruppo, imposta il primo come responsabile
      if (groupMembers.length > 0) {
        const firstMemberId = groupMembers[0].userId.toString();
        
        // Imposta l'AssignedTo e i partecipanti aggiuntivi
        setTaskData(prev => {
          // Ottieni tutti gli ID degli utenti tranne il primo
          const otherMemberIds = groupMembers
            .filter(member => member.userId.toString() !== firstMemberId)
            .map(member => member.userId.toString());
          
          return {
            ...prev,
            AssignedTo: firstMemberId,
            Participants: otherMemberIds
          };
        });
      }
    } catch (error) {
      console.error('Error loading group members:', error);
      swal.fire('Errore', 'Errore nel caricamento dei membri del gruppo', 'error');
    }
  };

  const handleSubmit = () => {
    if (!taskData.Title || !taskData.DueDate || !taskData.StartDate || !taskData.AssignedTo) {
      swal.fire('Attenzione', 'Compila i campi obbligatori (Titolo, Data Inizio, Data Scadenza e Responsabile)', 'warning');
      return;
    }
    
    const formattedData = {
      ...taskData,
      AssignedTo: parseInt(taskData.AssignedTo),
      PredecessorTaskID: taskData.PredecessorTaskID ? parseInt(taskData.PredecessorTaskID) : null,
      AdditionalAssignees: JSON.stringify(taskData.Participants.map(id => parseInt(id))),
      DefaultGroupId: taskData.DefaultGroupId  // Include il gruppo selezionato
    };
    
    onSubmit(formattedData);
  };

  // Filtra gli utenti per la ricerca del responsabile
  const filterUsers = users.filter(user => {
    if (!searchValue) return true;
    const search = searchValue.toLowerCase();
    return (
      user.firstName?.toLowerCase().includes(search) ||
      user.lastName?.toLowerCase().includes(search) ||
      user.role?.toLowerCase().includes(search)
    );
  });

  // Filtra i partecipanti in base a showSelectedOnly
  const filteredParticipants = users.filter(user => {
    const isNotLeader = user.userId.toString() !== taskData.AssignedTo;
    if (showSelectedOnly) {
      return isNotLeader && taskData.Participants.includes(user.userId.toString());
    }
    return isNotLeader;
  });

  const getSelectedUser = (userId) => {
    return users.find(user => user.userId.toString() === userId);
  };

  const getSelectedGroup = (groupId) => {
    if (!groupId) return null;
    return availableGroups.find(group => group.groupId === groupId);
  };

  if (loadingUsers) {
    return <div className="p-4 text-center">Caricamento utenti...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="taskTitle">Titolo *</Label>
        <Input
          id="taskTitle"
          value={taskData.Title}
          onChange={(e) => setTaskData({ ...taskData, Title: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="taskDescription">Descrizione</Label>
        <Textarea
          id="taskDescription"
          value={taskData.Description}
          onChange={(e) => setTaskData({ ...taskData, Description: e.target.value })}
        />
      </div>

      {/* Tabs per la selezione dell'assegnazione */}
      <div>
        <Label className="mb-2 block">Tipo di assegnazione</Label>
        <Tabs value={assignmentType} onValueChange={setAssignmentType} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Utente</span>
            </TabsTrigger>
            <TabsTrigger value="group" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Gruppo</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="individual" className="pt-4">
            <div>
              <Label htmlFor="taskAssignedTo">Responsabile *</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between"
                  >
                    {taskData.AssignedTo
                      ? getSelectedUser(taskData.AssignedTo)
                        ? `${getSelectedUser(taskData.AssignedTo).firstName} ${getSelectedUser(taskData.AssignedTo).lastName}`
                        : "Seleziona responsabile"
                      : "Seleziona responsabile"}
                    <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Cerca per nome, cognome o ruolo..." 
                      value={searchValue}
                      onValueChange={setSearchValue}
                    />
                    <CommandEmpty>Nessun utente trovato.</CommandEmpty>
                    <CommandGroup className="max-h-[100px] overflow-auto">
                      {filterUsers.map(user => (
                        <CommandItem
                          key={user.userId}
                          value={user.userId.toString()}
                          onSelect={(value) => {
                            setTaskData(prev => ({ ...prev, AssignedTo: value, DefaultGroupId: null }));
                            setOpenCombobox(false);
                            setSearchValue("");
                          }}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 h-4 w-4",
                              taskData.AssignedTo === user.userId.toString() ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {user.firstName} {user.lastName} - {user.role}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </TabsContent>
          
          <TabsContent value="group" className="pt-4 space-y-4">
            <div>
              <Label htmlFor="taskGroupId">Gruppo *</Label>
              <Select
                value={selectedGroupId?.toString() || "null"}
                onValueChange={handleGroupChange}
                disabled={isLoadingGroups}
              >
                <SelectTrigger className="w-full" id="taskGroupId">
                  <SelectValue placeholder={isLoadingGroups ? "Caricamento gruppi..." : "Seleziona gruppo"}>
                    {selectedGroupId ? 
                      getSelectedGroup(selectedGroupId)?.groupName : 
                      "Seleziona gruppo"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Nessun gruppo</SelectItem>
                  {availableGroups.map(group => (
                    <SelectItem key={group.groupId} value={group.groupId.toString()}>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        <span>{group.groupName} - {group.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                L'attività verrà assegnata a tutti i membri del gruppo
              </p>
            </div>
            
            <div>
              <Label htmlFor="groupAssignedTo">Responsabile principale *</Label>
              <Popover open={openCombobox && assignmentType === 'group'} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox && assignmentType === 'group'}
                    className="w-full justify-between"
                    disabled={!selectedGroupId}
                  >
                    {taskData.AssignedTo && assignmentType === 'group'
                      ? getSelectedUser(taskData.AssignedTo)
                        ? `${getSelectedUser(taskData.AssignedTo).firstName} ${getSelectedUser(taskData.AssignedTo).lastName}`
                        : "Seleziona responsabile"
                      : "Seleziona responsabile"}
                    <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Cerca per nome, cognome o ruolo..." 
                      value={searchValue}
                      onValueChange={setSearchValue}
                    />
                    <CommandEmpty>Nessun utente trovato.</CommandEmpty>
                    <CommandGroup className="max-h-[100px] overflow-auto">
                      {filterUsers.map(user => (
                        <CommandItem
                          key={user.userId}
                          value={user.userId.toString()}
                          onSelect={(value) => {
                            setTaskData(prev => ({ ...prev, AssignedTo: value }));
                            setOpenCombobox(false);
                            setSearchValue("");
                          }}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 h-4 w-4",
                              taskData.AssignedTo === user.userId.toString() ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {user.firstName} {user.lastName} - {user.role}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Mostra partecipanti solo se è selezionato "individual" */}
      {assignmentType === 'individual' && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label>Partecipanti</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showSelected"
                className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                checked={showSelectedOnly}
                onCheckedChange={(checked) => setShowSelectedOnly(checked)}
              />
              <Label 
                htmlFor="showSelected"
                className="text-sm text-gray-500 cursor-pointer"
              >
                Mostra solo selezionati
              </Label>
            </div>
          </div>
          <ScrollArea className="h-[100px] border rounded-md">
            <div className="p-2">
              {filteredParticipants.map(user => (
                <div key={user.userId} className="flex items-center space-x-2 hover:bg-gray-100 p-2 rounded">
                  <Checkbox
                    className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                    checked={taskData.Participants.includes(user.userId.toString())}
                    onCheckedChange={(checked) => {
                      setTaskData(prev => ({
                        ...prev,
                        Participants: checked 
                          ? [...prev.Participants, user.userId.toString()]
                          : prev.Participants.filter(id => id !== user.userId.toString())
                      }));
                    }}
                    id={`user-${user.userId}`}
                  />
                  <Label 
                    htmlFor={`user-${user.userId}`}
                    className="flex-grow cursor-pointer text-sm"
                  >
                    {user.firstName} {user.lastName} - {user.role}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <div>
        <Label htmlFor="predecessorTask">Attività Precedente</Label>
        <Select
          value={taskData.PredecessorTaskID?.toString() || "0"}
          onValueChange={(value) => setTaskData(prev => ({ 
            ...prev, 
            PredecessorTaskID: value === "0" ? null : parseInt(value)
          }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona predecessore" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Nessuna attività collegata</SelectItem>
            {projectTasks.map(t => (
              <SelectItem key={t.TaskID} value={t.TaskID.toString()}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={
                      t.Status === 'COMPLETATA' ? 'bg-green-100 text-green-700' : 
                      t.Status === 'IN ESECUZIONE' ? 'bg-blue-100 text-blue-700' : 
                      'bg-gray-100 text-gray-700'
                    }>
                      {t.Status}
                    </Badge>
                    <span className="font-medium truncate">{t.Title}</span>
                  </div>
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span>
                      Inizio: {new Date(t.StartDate).toLocaleDateString()}
                    </span>
                    <span>→</span>
                    <span>
                      Fine: {new Date(t.DueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="taskPriority">Priorità</Label>
        <Select
          value={taskData.Priority}
          onValueChange={(value) => setTaskData({ ...taskData, Priority: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona priorità" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BASSA">Bassa</SelectItem>
            <SelectItem value="MEDIA">Media</SelectItem>
            <SelectItem value="ALTA">Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Label htmlFor="taskStartDate">Data Inizio *</Label>
          <Input
            id="taskStartDate"
            type="date"
            value={taskData.StartDate}
            onChange={(e) => {
              const startDate = e.target.value;
              setTaskData(prev => ({
                ...prev,
                StartDate: startDate,
                DueDate: prev.DueDate && prev.DueDate < startDate ? startDate : prev.DueDate
              }));
            }}
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="taskDueDate">Data Scadenza *</Label>
          <Input
            id="taskDueDate"
            type="date"
            value={taskData.DueDate}
            min={taskData.StartDate}
            onChange={(e) => setTaskData({ ...taskData, DueDate: e.target.value })}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button 
          className="flex-1" 
          onClick={handleSubmit}
          disabled={!taskData.Title || !taskData.DueDate || !taskData.AssignedTo}
        >
          Aggiungi
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Annulla
        </Button>
      </div>
    </div>
  );
};

export default NewTaskForm;