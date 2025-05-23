import React, { useState, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  UserPlus, 
  Users, 
  User, 
  Link2, 
  FileText,
  CalendarDays,
  UserCheck,
  Info
} from "lucide-react";
import { config } from "../../../config";

const TaskInformationTab = ({
  task,
  isEditing,
  canEdit,
  onSave,
  onCancel,
  assignableUsers,
  tasks,
}) => {
  const [editedData, setEditedData] = useState({
    Description: "",
    StartDate: "",
    DueDate: "",
    AssignedTo: "",
    PredecessorTaskID: null,
  });

  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");

  // Funzione per normalizzare i partecipanti in un formato consistente
  const normalizeParticipants = (participants) => {
    if (!participants) return [];

    try {
      if (typeof participants === "string") {
        participants = JSON.parse(participants);
      }

      // Se è un array di oggetti con userId
      if (Array.isArray(participants) && participants[0]?.userId) {
        return participants.map((p) => p.userId.toString());
      }

      // Se è un array di ID
      if (Array.isArray(participants)) {
        return participants.map((p) => p.toString());
      }

      return [];
    } catch (error) {
      console.error("Error normalizing participants:", error);
      return [];
    }
  };

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

      // Imposta il gruppo selezionato dal task se esiste
      if (task && task.DefaultGroupId) {
        setSelectedGroupId(task.DefaultGroupId);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setIsLoadingGroups(false);
    }
  }, [task]);

  // Effetto per inizializzare i dati del task
  useEffect(() => {
    if (task) {
      setEditedData({
        Description: task.Description || "",
        StartDate: task.StartDate?.split("T")[0] || "",
        DueDate: task.DueDate?.split("T")[0] || "",
        AssignedTo: task.AssignedTo?.toString() || "",
        PredecessorTaskID: task.PredecessorTaskID || null,
      });

      const normalizedParticipants = normalizeParticipants(task.Participants);
      setSelectedParticipants(normalizedParticipants);

      // Resetta lo stato del gruppo
      setSelectedGroupId(task.DefaultGroupId || null);
    }
  }, [task]);

  // Carica i gruppi quando si entra in modalità modifica
  useEffect(() => {
    if (isEditing) {
      fetchGroups();
    }
  }, [isEditing, fetchGroups]);

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  // Funzione che gestisce la selezione di un gruppo
  const handleGroupChange = async (groupId) => {
    try {
      // Se viene deselezionato il gruppo (grupId === "null")
      if (groupId === "null") {
        setSelectedGroupId(null);
        return;
      }

      const numericGroupId = parseInt(groupId);
      setSelectedGroupId(numericGroupId);

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

      // Aggiorna la lista dei partecipanti con i membri del gruppo
      // (ma esclude l'AssignedTo se è già impostato)
      const assignedToId = editedData.AssignedTo;
      const memberIds = groupMembers
        .map((member) => member.userId.toString())
        .filter((id) => id !== assignedToId);

      // Aggiorna la lista dei partecipanti
      setSelectedParticipants(memberIds);
    } catch (error) {
      console.error("Error loading group members:", error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const saveData = {
      ...editedData,
      AdditionalAssignees: JSON.stringify(selectedParticipants),
      DefaultGroupId: selectedGroupId, // Aggiungi il gruppo selezionato
    };
    onSave(saveData);
  };

  const predecessorTask = task?.PredecessorTaskID
    ? tasks.find((t) => t.TaskID === task.PredecessorTaskID)
    : null;

  // Filtra gli utenti disponibili per i partecipanti
  const filteredAssignableUsers = assignableUsers.filter((user) => {
    const isNotLeader = user.userId.toString() !== editedData.AssignedTo;
    const matchesSearch = participantSearch
      ? `${user.firstName} ${user.lastName}`
          .toLowerCase()
          .includes(participantSearch.toLowerCase())
      : true;
    
    if (showSelectedOnly) {
      return (
        isNotLeader && 
        matchesSearch &&
        selectedParticipants.includes(user.userId.toString())
      );
    }
    return isNotLeader && matchesSearch;
  });

  // Ottiene i dati completi dei partecipanti per la visualizzazione
  const getParticipantDetails = () => {
    if (!selectedParticipants.length) return [];

    return selectedParticipants
      .map((participantId) => {
        const user = assignableUsers.find(
          (u) => u.userId.toString() === participantId,
        );
        return user
          ? {
              userId: user.userId,
              firstName: user.firstName,
              lastName: user.lastName,
            }
          : null;
      })
      .filter(Boolean);
  };

  // Calcola la durata in giorni
  const calculateDuration = () => {
    if (editedData.StartDate && editedData.DueDate) {
      const start = new Date(editedData.StartDate);
      const end = new Date(editedData.DueDate);
      const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      return diff >= 0 ? `${diff + 1} giorni` : "Date non valide";
    }
    return "-";
  };

  if (!task) return null;

  return (
    <form id="taskInformationTab" onSubmit={handleSubmit} className="space-y-2">
      {/* Date Section con Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Date e Scadenze</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Data Inizio
              </Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editedData.StartDate}
                  onChange={(e) =>
                    setEditedData((prev) => ({
                      ...prev,
                      StartDate: e.target.value,
                    }))
                  }
                  className="w-full"
                />
              ) : (
                <div className="text-sm font-medium text-gray-700">
                  {task?.StartDate
                    ? new Date(task.StartDate).toLocaleDateString("it-IT", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "-"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Data Scadenza
              </Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editedData.DueDate}
                  min={editedData.StartDate}
                  onChange={(e) =>
                    setEditedData((prev) => ({
                      ...prev,
                      DueDate: e.target.value,
                    }))
                  }
                  className="w-full"
                />
              ) : (
                <div className="text-sm font-medium text-gray-700">
                  {task?.DueDate
                    ? new Date(task.DueDate).toLocaleDateString("it-IT", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "-"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Durata</Label>
              <div className="text-sm font-medium text-gray-700">
                {calculateDuration()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description Section con Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Descrizione</h3>
          </div>
          
          {isEditing ? (
            <Textarea
              value={editedData.Description}
              onChange={(e) =>
                setEditedData((prev) => ({
                  ...prev,
                  Description: e.target.value,
                }))
              }
              placeholder="Inserisci una descrizione dettagliata dell'attività..."
              className="min-h-[120px] resize-none"
            />
          ) : (
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">
                {task?.Description || (
                  <span className="text-gray-400 italic">
                    Nessuna descrizione disponibile
                  </span>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

    {/* Assignments Section con Card */}
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-3">
          <UserCheck className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Assegnazioni</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colonna sinistra - Partecipanti */}
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <UserPlus className="h-3 w-3" />
                Partecipanti ({selectedParticipants.length})
              </Label>
              {isEditing && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showSelected"
                    checked={showSelectedOnly}
                    onCheckedChange={setShowSelectedOnly}
                    className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                  />
                  <Label htmlFor="showSelected" className="text-sm text-gray-600 cursor-pointer">
                    Solo selezionati
                  </Label>
                </div>
              )}
            </div>

            {isEditing && (
              <Input
                placeholder="Cerca partecipante..."
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                className="w-full mb-2"
              />
            )}

            {isEditing ? (
              <Card className="border-dashed">
                <ScrollArea className="h-[280px]">
                  <div className="p-2 space-y-1">
                    {filteredAssignableUsers.length > 0 ? (
                      filteredAssignableUsers.map((user) => {
                        const isChecked = selectedParticipants.includes(user.userId.toString());
                        return (
                          <div
                            key={user.userId}
                            className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded-md transition-colors"
                          >
                            <input
                              type="checkbox"
                              id={`user-${user.userId}`}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={isChecked}
                              onChange={(e) => {
                                e.stopPropagation();
                                setSelectedParticipants((prev) => {
                                  const userId = user.userId.toString();
                                  if (prev.includes(userId)) {
                                    return prev.filter((id) => id !== userId);
                                  }
                                  return [...prev, userId];
                                });
                              }}
                            />
                            <label
                              htmlFor={`user-${user.userId}`}
                              className="flex-grow cursor-pointer font-normal"
                              onClick={(e) => {
                                e.preventDefault();
                                const checkbox = document.getElementById(`user-${user.userId}`);
                                if (checkbox) {
                                  checkbox.click();
                                }
                              }}
                            >
                              {user.firstName} {user.lastName}
                            </label>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-sm text-gray-500">
                        {participantSearch
                          ? "Nessun partecipante trovato"
                          : "Nessun partecipante disponibile"}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </Card>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 min-h-[280px]">
                <div className="flex flex-wrap gap-2">
                  {getParticipantDetails().length > 0 ? (
                    getParticipantDetails().map((participant, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-white px-3 py-2 rounded-md border border-gray-200"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(participant.firstName, participant.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {participant.firstName} {participant.lastName}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 italic">
                      Nessun partecipante aggiuntivo
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Colonna destra - Responsabile e Gruppo */}
          <div className="space-y-1">
            {/* Responsabile */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <User className="h-3 w-3" />
                Responsabile
              </Label>
              {isEditing ? (
                <Select
                  value={editedData.AssignedTo}
                  onValueChange={(value) =>
                    setEditedData((prev) => ({ ...prev, AssignedTo: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona il responsabile dell'attività" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers.map((user) => (
                      <SelectItem key={user.userId} value={user.userId.toString()}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(user.firstName, user.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.firstName} {user.lastName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium">{task?.AssignedToName}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full border-t border-gray-200" />

            {/* Gruppo */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Users className="h-3 w-3" />
                Gruppo
              </Label>
              {isEditing ? (
                <div className="space-y-2">
                  <Select
                    value={selectedGroupId?.toString() || "null"}
                    onValueChange={handleGroupChange}
                    disabled={isLoadingGroups}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          isLoadingGroups
                            ? "Caricamento gruppi..."
                            : "Seleziona un gruppo di lavoro"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">
                        <span className="text-gray-500">Nessun gruppo</span>
                      </SelectItem>
                      {availableGroups.map((group) => (
                        <SelectItem
                          key={group.groupId}
                          value={group.groupId.toString()}
                        >
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <div>
                              <p className="font-medium">{group.groupName}</p>
                              <p className="text-xs text-gray-500">{group.description}</p>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedGroupId && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                      <Info className="h-4 w-4 text-blue-600" />
                      <p className="text-xs text-blue-700">
                        Selezionando un gruppo, l'attività sarà automaticamente assegnata a tutti i membri
                      </p>
                    </div>
                  )}
                </div>
              ) : task?.GroupName ? (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <Users className="h-4 w-4 text-gray-600" />
                  <div>
                    <p className="font-medium">{task.GroupName}</p>
                    <p className="text-xs text-gray-500">Gruppo assegnato</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500 italic">Nessun gruppo assegnato</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

      {/* Collegamenti Section con Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Collegamenti</h3>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Attività precedente</Label>
            {isEditing ? (
              <Select
                value={editedData.PredecessorTaskID?.toString() || "0"}
                onValueChange={(value) =>
                  setEditedData((prev) => ({
                    ...prev,
                    PredecessorTaskID: value === "0" ? null : parseInt(value),
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona un'attività collegata" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="0">
                    <span className="text-gray-500">Nessuna attività collegata</span>
                  </SelectItem>
                  {tasks
                    .filter((t) => t.TaskID !== task.TaskID)
                    .map((t) => (
                      <SelectItem key={t.TaskID} value={t.TaskID.toString()}>
                        <div className="flex flex-col gap-1 py-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                t.Status === "COMPLETATA"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : t.Status === "IN ESECUZIONE"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : t.Status === "BLOCCATA"
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : t.Status === "SOSPESA"
                                        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                        : "bg-gray-50 text-gray-700 border-gray-200"
                              }`}
                            >
                              {t.Status}
                            </Badge>
                            <span className="font-medium truncate max-w-[300px]">
                              {t.Title}
                            </span>
                          </div>
                          <div className="flex gap-3 text-xs text-gray-500 ml-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(t.StartDate).toLocaleDateString("it-IT")}
                            </span>
                            <span>→</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(t.DueDate).toLocaleDateString("it-IT")}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : predecessorTask ? (
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        predecessorTask.Status === "COMPLETATA"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : predecessorTask.Status === "IN ESECUZIONE"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-gray-50 text-gray-700 border-gray-200"
                      }`}
                    >
                      {predecessorTask.Status}
                    </Badge>
                    <span className="font-medium">{predecessorTask.Title}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(predecessorTask.StartDate).toLocaleDateString("it-IT")}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                Nessuna attività collegata
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hidden submit button to handle form submission */}
      <button type="submit" className="hidden">
        Submit
      </button>
    </form>
  );
};

export default TaskInformationTab;