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
import { Calendar, UserPlus, Users } from "lucide-react";
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
    if (showSelectedOnly) {
      return (
        isNotLeader && selectedParticipants.includes(user.userId.toString())
      );
    }
    return isNotLeader;
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

  if (!task) return null;

  return (
    <form id="taskInformationTab" onSubmit={handleSubmit} className="space-y-6">
      {/* Dates Section */}
      <div className="flex gap-6">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Inizio:</span>
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
                className="w-40"
              />
            ) : task?.StartDate ? (
              new Date(task.StartDate).toLocaleDateString()
            ) : (
              ""
            )}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Scadenza:</span>
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
                className="w-40"
              />
            ) : task?.DueDate ? (
              new Date(task.DueDate).toLocaleDateString()
            ) : (
              ""
            )}
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="space-y-2">
        <Label>Descrizione</Label>
        {isEditing ? (
          <Textarea
            value={editedData.Description}
            onChange={(e) =>
              setEditedData((prev) => ({
                ...prev,
                Description: e.target.value,
              }))
            }
            className="min-h-[100px]"
          />
        ) : (
          <p className="text-gray-600 whitespace-pre-wrap">
            {task?.Description}
          </p>
        )}
      </div>

      <div className="d-flex justify-content-between gap-6">
        {/* Assigned To Section */}
        <div className="space-y-2 w-50">
          <Label>Responsabile</Label>
          {isEditing ? (
            <Select
              value={editedData.AssignedTo}
              onValueChange={(value) =>
                setEditedData((prev) => ({ ...prev, AssignedTo: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona responsabile" />
              </SelectTrigger>
              <SelectContent>
                {assignableUsers.map((user) => (
                  <SelectItem key={user.userId} value={user.userId.toString()}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {getInitials(
                    task?.AssignedToFirstName,
                    task?.AssignedToLastName,
                  )}
                </AvatarFallback>
              </Avatar>
              <span>{task?.AssignedToName}</span>
            </div>
          )}
        </div>

        {/* Group Section - solo in modalità modifica */}
        {isEditing && (
          <div className="space-y-2 w-50">
            <Label>Gruppo</Label>
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
                      : "Seleziona gruppo"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">Nessun gruppo</SelectItem>
                {availableGroups.map((group) => (
                  <SelectItem
                    key={group.groupId}
                    value={group.groupId.toString()}
                  >
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      <span>
                        {group.groupName} - {group.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedGroupId && (
              <p className="text-xs text-gray-500">
                L'attività sarà assegnata a tutti i membri del gruppo
              </p>
            )}
          </div>
        )}

        {/* Group display in view mode */}
        {!isEditing && task?.GroupName && (
          <div className="space-y-2 w-50">
            <Label>Gruppo</Label>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-600 border-blue-200 flex items-center"
              >
                <Users className="w-4 h-4 mr-2" />
                {task.GroupName}
              </Badge>
            </div>
          </div>
        )}

        {/* Participants Section */}
        <div className="space-y-2 w-50 flex-grow">
          <div className="flex justify-between items-center">
            <Label>Partecipanti</Label>
            {isEditing && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showSelected"
                  checked={showSelectedOnly}
                  onCheckedChange={setShowSelectedOnly}
                  className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                />
                <Label htmlFor="showSelected" className="text-sm text-gray-500">
                  Mostra solo selezionati
                </Label>
              </div>
            )}
          </div>

          {isEditing ? (
            <ScrollArea className="h-[120px] border rounded-md">
              <div className="p-2">
                {filteredAssignableUsers.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center space-x-2 hover:bg-gray-100 p-2 rounded"
                  >
                    <Checkbox
                      checked={selectedParticipants.includes(
                        user.userId.toString(),
                      )}
                      onCheckedChange={(checked) => {
                        setSelectedParticipants((prev) => {
                          if (checked) {
                            return [...prev, user.userId.toString()];
                          }
                          return prev.filter(
                            (id) => id !== user.userId.toString(),
                          );
                        });
                      }}
                      id={`user-${user.userId}`}
                      className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                    />
                    <Label
                      htmlFor={`user-${user.userId}`}
                      className="flex-grow cursor-pointer text-sm"
                    >
                      {user.firstName} {user.lastName}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-wrap gap-2">
              {getParticipantDetails().length > 0 ? (
                getParticipantDetails().map((participant, index) => (
                  <Badge
                    key={index}
                    variant=""
                    className="flex items-center gap-2 bg-gray-100 text-black"
                  >
                    <span>
                      {participant.firstName} {participant.lastName}
                    </span>
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-gray-500">
                  Nessun partecipante
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Predecessor Section */}
      <div className="space-y-2">
        <Label>Attività precedente</Label>
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
            <SelectTrigger className="h-auto py-1">
              <SelectValue placeholder="Seleziona predecessore" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="0"> Nessuna attività collegata</SelectItem>
              {tasks
                .filter((t) => t.TaskID !== task.TaskID)
                .map((t) => (
                  <SelectItem key={t.TaskID} value={t.TaskID.toString()}>
                    <div className="flex flex-col gap-1 py-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            t.Status === "COMPLETATA"
                              ? "bg-green-100 text-green-700"
                              : t.Status === "IN ESECUZIONE"
                                ? "bg-blue-100 text-blue-700"
                                : t.Status === "BLOCCATA"
                                  ? "bg-red-100 text-red-700"
                                  : t.Status === "SOSPESA"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-gray-100 text-gray-700"
                          }
                        >
                          {t.Status}
                        </Badge>
                        <span className="font-medium truncate">{t.Title}</span>
                      </div>
                      <div className="flex gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Inizio: {new Date(t.StartDate).toLocaleDateString()}
                        </span>
                        <span>→</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Fine: {new Date(t.DueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        ) : predecessorTask ? (
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                predecessorTask.Status === "COMPLETATA"
                  ? "bg-green-100"
                  : predecessorTask.Status === "IN ESECUZIONE"
                    ? "bg-blue-100"
                    : "bg-gray-100"
              }
            >
              {predecessorTask.Title}
            </Badge>
            <span className="text-sm text-gray-500">
              ({new Date(predecessorTask.StartDate).toLocaleDateString()})
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-500">
            {" "}
            Nessuna attività collegata
          </span>
        )}
      </div>

      {/* Hidden submit button to handle form submission */}
      <button type="submit" className="hidden">
        Submit
      </button>
    </form>
  );
};

export default TaskInformationTab;
