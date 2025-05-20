import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  User, 
  FileText, 
  Calendar, 
  ListTodo,
  Clock,
  AlertTriangle,
  Flag
} from "lucide-react";
import { config } from "../../../config";
import useUsers from "../../../hooks/useUsersActions";
import { swal } from "../../../lib/common";

const NewTaskForm = ({ onSubmit, onCancel, projectTasks = [] }) => {
  const { users, loading: loadingUsers, fetchUsers } = useUsers();
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [assignmentType, setAssignmentType] = useState("individual"); // 'individual' o 'group'
  const [availableGroups, setAvailableGroups] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  // Ottieni l'utente loggato dal localStorage
  const [currentUserId, setCurrentUserId] = useState(() => {
    try {
      const userString = localStorage.getItem("user");
      if (userString) {
        const userData = JSON.parse(userString);
        return userData.userId.toString();
      }
      return null;
    } catch (error) {
      console.error("Error parsing user data from localStorage:", error);
      return null;
    }
  });

  const [taskData, setTaskData] = useState({
    Title: "",
    Description: "",
    AssignedTo: currentUserId, // Imposta l'utente corrente come default
    Participants: [],
    Priority: "MEDIA",
    StartDate: new Date().toISOString().split("T")[0], // Set current date as default
    DueDate: "",
    Status: "DA FARE",
    PredecessorTaskID: null,
    DefaultGroupId: null,
  });

  useEffect(() => {
    fetchUsers();
    fetchGroups();
  }, [fetchUsers]);

  // Funzione per caricare i gruppi
  const fetchGroups = useCallback(async () => {
    try {
      setIsLoadingGroups(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/groups`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Error fetching groups");
      }

      const data = await response.json();
      setAvailableGroups(data);
    } catch (error) {
      console.error("Error fetching groups:", error);
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
        setTaskData((prev) => ({
          ...prev,
          DefaultGroupId: null,
          Participants: [],
        }));
        return;
      }

      const numericGroupId = parseInt(groupId);
      setSelectedGroupId(numericGroupId);

      // Aggiorna il DefaultGroupId nel taskData
      setTaskData((prev) => ({
        ...prev,
        DefaultGroupId: numericGroupId,
      }));

      // Carica i membri del gruppo selezionato
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/groups/${numericGroupId}/members`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Error fetching group members");
      }

      const groupMembers = await response.json();

      // Se ci sono membri nel gruppo, imposta il primo come responsabile
      if (groupMembers.length > 0) {
        const firstMemberId = groupMembers[0].userId.toString();

        // Imposta l'AssignedTo e i partecipanti aggiuntivi
        setTaskData((prev) => {
          // Ottieni tutti gli ID degli utenti tranne il primo
          const otherMemberIds = groupMembers
            .filter((member) => member.userId.toString() !== firstMemberId)
            .map((member) => member.userId.toString());

          return {
            ...prev,
            AssignedTo: firstMemberId,
            Participants: otherMemberIds,
          };
        });
      }
    } catch (error) {
      console.error("Error loading group members:", error);
      swal.fire(
        "Errore",
        "Errore nel caricamento dei membri del gruppo",
        "error",
      );
    }
  };

  const handleSubmit = () => {
    if (
      !taskData.Title ||
      !taskData.DueDate ||
      !taskData.StartDate ||
      !taskData.AssignedTo
    ) {
      swal.fire(
        "Attenzione",
        "Compila i campi obbligatori (Titolo, Data Inizio, Data Scadenza e Responsabile)",
        "warning",
      );
      return;
    }

    const formattedData = {
      ...taskData,
      AssignedTo: parseInt(taskData.AssignedTo),
      PredecessorTaskID: taskData.PredecessorTaskID
        ? parseInt(taskData.PredecessorTaskID)
        : null,
      AdditionalAssignees: JSON.stringify(
        taskData.Participants.map((id) => parseInt(id)),
      ),
      DefaultGroupId: taskData.DefaultGroupId, // Include il gruppo selezionato
    };

    onSubmit(formattedData);
  };

  // Filtra gli utenti per la ricerca del responsabile
  const filterUsers = users.filter((user) => {
    if (!searchValue) return true;
    const search = searchValue.toLowerCase();
    return (
      user.firstName?.toLowerCase().includes(search) ||
      user.lastName?.toLowerCase().includes(search) ||
      user.role?.toLowerCase().includes(search)
    );
  });

  // Filtra i partecipanti in base a showSelectedOnly
  const filteredParticipants = users.filter((user) => {
    const isNotLeader = user.userId.toString() !== taskData.AssignedTo;
    if (showSelectedOnly) {
      return (
        isNotLeader && taskData.Participants.includes(user.userId.toString())
      );
    }
    return isNotLeader;
  });

  const getSelectedUser = (userId) => {
    return users.find((user) => user.userId.toString() === userId);
  };

  const getSelectedGroup = (groupId) => {
    if (!groupId) return null;
    return availableGroups.find((group) => group.groupId === groupId);
  };

  if (loadingUsers) {
    return <div className="p-4 text-center">Caricamento utenti...</div>;
  }

  return (
    <div className="flex flex-col max-h-[70vh]">
      <div className="border-b-2 border-black mb-2" />
      <ScrollArea className="flex-grow overflow-y-auto pr-2">
        <div className="space-y-3 pb-2">
          {/* Dati principali */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <h3 className="text-xs font-medium text-gray-500">Informazioni attività</h3>
            
            <div>
              <Label htmlFor="taskTitle" className="flex items-center text-sm">
                <FileText className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                Titolo <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="taskTitle"
                value={taskData.Title}
                onChange={(e) => setTaskData({ ...taskData, Title: e.target.value })}
                className="mt-1"
                placeholder="Inserisci titolo attività"
              />
            </div>

            <div>
              <Label htmlFor="taskDescription" className="flex items-center text-sm">
                <FileText className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                Descrizione
              </Label>
              <Textarea
                id="taskDescription"
                value={taskData.Description}
                onChange={(e) =>
                  setTaskData({ ...taskData, Description: e.target.value })
                }
                className="mt-1"
                placeholder="Inserisci descrizione dell'attività"
                rows={2}
              />
            </div>
          </div>

          {/* Date e priorità */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <h3 className="text-xs font-medium text-gray-500">Date e priorità</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="taskStartDate" className="flex items-center text-sm">
                  <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                  Data Inizio <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="taskStartDate"
                  type="date"
                  value={taskData.StartDate}
                  onChange={(e) => {
                    const startDate = e.target.value;
                    setTaskData((prev) => ({
                      ...prev,
                      StartDate: startDate,
                      DueDate:
                        prev.DueDate && prev.DueDate < startDate
                          ? startDate
                          : prev.DueDate,
                    }));
                  }}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="taskDueDate" className="flex items-center text-sm">
                  <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                  Data Scadenza <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="taskDueDate"
                  type="date"
                  value={taskData.DueDate}
                  min={taskData.StartDate}
                  onChange={(e) =>
                    setTaskData({ ...taskData, DueDate: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="taskPriority" className="flex items-center text-sm">
                  <Flag className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                  Priorità
                </Label>
                <Select
                  value={taskData.Priority}
                  onValueChange={(value) =>
                    setTaskData({ ...taskData, Priority: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleziona priorità" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BASSA">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        Bassa
                      </div>
                    </SelectItem>
                    <SelectItem value="MEDIA">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                        Media
                      </div>
                    </SelectItem>
                    <SelectItem value="ALTA">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                        Alta
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="predecessorTask" className="flex items-center text-sm">
                  <ListTodo className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                  Attività Precedente
                </Label>
                <Select
                  value={taskData.PredecessorTaskID?.toString() || "0"}
                  onValueChange={(value) =>
                    setTaskData((prev) => ({
                      ...prev,
                      PredecessorTaskID: value === "0" ? null : parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleziona predecessore" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Nessuna attività collegata</SelectItem>
                    {projectTasks.map((t) => (
                      <SelectItem key={t.TaskID} value={t.TaskID.toString()}>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={
                                t.Status === "COMPLETATA"
                                  ? "bg-green-100 text-green-700"
                                  : t.Status === "IN ESECUZIONE"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-700"
                              }
                            >
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
            </div>
          </div>

          {/* Assegnazione */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <h3 className="text-xs font-medium text-gray-500">Assegnazione</h3>
            
            {/* Tabs per la selezione dell'assegnazione */}
            <div>
              <Tabs
                value={assignmentType}
                onValueChange={setAssignmentType}
                className="w-full"
              >
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

                <TabsContent value="individual" className="pt-3 space-y-2">
                  <div>
                    <Label htmlFor="taskAssignedTo" className="flex items-center text-sm">
                      <User className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                      Responsabile <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCombobox}
                          className="w-full justify-between mt-1"
                        >
                          {taskData.AssignedTo
                            ? getSelectedUser(taskData.AssignedTo)
                              ? `${getSelectedUser(taskData.AssignedTo).firstName} ${getSelectedUser(taskData.AssignedTo).lastName}`
                              : "Seleziona responsabile"
                            : "Seleziona responsabile"}
                          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-full p-0"
                        style={{ maxHeight: "250px" }}
                      >
                        <Command>
                          <CommandInput
                            placeholder="Cerca per nome, cognome o ruolo..."
                            value={searchValue}
                            onValueChange={setSearchValue}
                          />
                          <CommandEmpty>Nessun utente trovato.</CommandEmpty>
                          <CommandGroup className="max-h-[200px] overflow-auto">
                            {filterUsers.map((user) => (
                              <CommandItem
                                key={user.userId}
                                value={user.userId.toString()}
                                onSelect={(value) => {
                                  setTaskData((prev) => ({
                                    ...prev,
                                    AssignedTo: value,
                                    DefaultGroupId: null,
                                  }));
                                  setOpenCombobox(false);
                                  setSearchValue("");
                                }}
                              >
                                <CheckIcon
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    taskData.AssignedTo === user.userId.toString()
                                      ? "opacity-100"
                                      : "opacity-0",
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

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label className="flex items-center text-sm">
                        <Users className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                        Partecipanti
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="showSelected"
                          className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                          checked={showSelectedOnly}
                          onCheckedChange={(checked) => setShowSelectedOnly(checked)}
                        />
                        <Label
                          htmlFor="showSelected"
                          className="text-xs text-gray-500 cursor-pointer"
                        >
                          Mostra solo selezionati
                        </Label>
                      </div>
                    </div>
                    <ScrollArea className="h-[80px] border rounded-md bg-white">
                      <div className="p-2">
                        {filteredParticipants.map((user) => (
                          <div
                            key={user.userId}
                            className="flex items-center space-x-2 hover:bg-gray-100 p-1 rounded"
                          >
                            <Checkbox
                              className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                              checked={taskData.Participants.includes(
                                user.userId.toString(),
                              )}
                              onCheckedChange={(checked) => {
                                setTaskData((prev) => ({
                                  ...prev,
                                  Participants: checked
                                    ? [...prev.Participants, user.userId.toString()]
                                    : prev.Participants.filter(
                                        (id) => id !== user.userId.toString(),
                                      ),
                                }));
                              }}
                              id={`user-${user.userId}`}
                            />
                            <Label
                              htmlFor={`user-${user.userId}`}
                              className="flex-grow cursor-pointer text-xs"
                            >
                              {user.firstName} {user.lastName} - {user.role}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="group" className="pt-3 space-y-2">
                  <div>
                    <Label htmlFor="taskGroupId" className="flex items-center text-sm">
                      <Users className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                      Gruppo <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Select
                      value={selectedGroupId?.toString() || "null"}
                      onValueChange={handleGroupChange}
                      disabled={isLoadingGroups}
                    >
                      <SelectTrigger className="w-full mt-1" id="taskGroupId">
                        <SelectValue
                          placeholder={
                            isLoadingGroups
                              ? "Caricamento gruppi..."
                              : "Seleziona gruppo"
                          }
                        >
                          {selectedGroupId
                            ? getSelectedGroup(selectedGroupId)?.groupName
                            : "Seleziona gruppo"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Nessun gruppo</SelectItem>
                        {availableGroups.map((group) => (
                          <SelectItem
                            key={group.groupId}
                            value={group.groupId.toString()}
                          >
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-2 text-gray-500" />
                              <span>
                                {group.groupName} - {group.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1 px-1 py-1 bg-blue-50 rounded border border-blue-100">
                      <AlertTriangle className="h-3 w-3 inline mr-1 text-blue-500" />
                      L'attività verrà assegnata a tutti i membri del gruppo
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="groupAssignedTo" className="flex items-center text-sm">
                      <User className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                      Responsabile principale <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Popover
                      open={openCombobox && assignmentType === "group"}
                      onOpenChange={setOpenCombobox}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCombobox && assignmentType === "group"}
                          className="w-full justify-between mt-1"
                          disabled={!selectedGroupId}
                        >
                          {taskData.AssignedTo && assignmentType === "group"
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
                          <CommandGroup className="max-h-[200px] overflow-auto">
                            {filterUsers.map((user) => (
                              <CommandItem
                                key={user.userId}
                                value={user.userId.toString()}
                                onSelect={(value) => {
                                  setTaskData((prev) => ({
                                    ...prev,
                                    AssignedTo: value,
                                  }));
                                  setOpenCombobox(false);
                                  setSearchValue("");
                                }}
                              >
                                <CheckIcon
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    taskData.AssignedTo === user.userId.toString()
                                      ? "opacity-100"
                                      : "opacity-0",
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
          </div>
        </div>
      </ScrollArea>

      <div className="flex gap-2 pt-3 mt-2 border-t shrink-0">
        <Button
          className="flex-1 shadow-sm"
          onClick={handleSubmit}
          disabled={
            !taskData.Title || !taskData.DueDate || !taskData.AssignedTo
          }
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