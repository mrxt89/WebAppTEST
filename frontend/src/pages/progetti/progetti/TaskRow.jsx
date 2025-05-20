import React, { useState, useEffect, useRef } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  AlertTriangle,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  Loader2,
  ListTodo,
  AlertCircle,
  LockIcon,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";

const UpdatedTaskRow = ({
  task,
  onTaskClick,
  onTaskUpdate,
  canEdit,
  isAdminOrManager,
  project,
  editingCell,
  setEditingCell,
  currentUserId,
}) => {
  const [editValue, setEditValue] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const initialValue = useRef("");

  // Configurazione per gli stati delle task
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

  // Configurazione per le priorità
  const priorityConfig = {
    ALTA: { color: "bg-red-100 text-red-700 border-red-200" },
    MEDIA: { color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    BASSA: { color: "bg-green-100 text-green-700 border-green-200" },
  };

  // Verifica se un task è in ritardo
  const isDelayed = () => {
    if (task.Status === "COMPLETATA") return false;
    const dueDate = new Date(task.DueDate);
    dueDate.setHours(23, 59, 59);
    return dueDate < new Date();
  };

  // Verifica se l'utente può modificare un particolare campo
  const canEditField = (fieldName) => {
    if (!canEdit) return false;

    // Gli admin e manager possono modificare tutti i campi
    if (isAdminOrManager) return true;

    // Gli utenti normali possono modificare solo lo stato delle proprie task
    if (fieldName === "Status") return true;

    // Per tutti gli altri campi, solo admin e manager possono modificarli
    return false;
  };

  // Formatta le date in formato italiano
  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: it });
    } catch (error) {
      return dateString;
    }
  };

  // Restituisce le iniziali di un nome
  const getInitials = (name) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Gestisce il click su una cella per iniziare la modifica
  const handleCellClick = (e, field, currentValue) => {
    e.stopPropagation(); // Ferma la propagazione dell'evento

    if (!canEditField(field) || isUpdating) {
      // Mostra un tooltip o un messaggio per informare l'utente
      if (!canEditField(field)) {
        toast({
          title: "Permessi insufficienti",
          description: "Non hai i permessi per modificare questo campo",
          variant: "destructive",
          duration: 3000,
        });
      }
      return;
    }

    setEditingCell({ taskId: task.TaskID, field });

    if (field === "DueDate" || field === "StartDate") {
      // Per i campi data, formatta in YYYY-MM-DD per l'input di tipo date
      const formattedValue = currentValue ? currentValue.split("T")[0] : "";
      setEditValue(formattedValue);
      initialValue.current = formattedValue;
    } else {
      setEditValue(currentValue);
      initialValue.current = currentValue;
    }
  };

  // Gestisce il cambio di valore durante la modifica
  const handleInputChange = (e) => {
    setEditValue(e.target.value);
  };

  // Gestisce il cambio di valore nei select
  const handleSelectChange = (value) => {
    setEditValue(value);

    // Importante: dobbiamo assicurarci che il valore cambi prima di salvare
    // Quindi facciamo il saveEdit in un timeout per dare tempo allo stato di aggiornarsi
    setTimeout(() => {
      const updatedTask = { ...task };

      if (editingCell.field === "AssignedTo") {
        updatedTask.AssignedTo = parseInt(value);

        let participants = [];
        try {
          if (task.Participants) {
            participants =
              typeof task.Participants === "string"
                ? JSON.parse(task.Participants)
                : task.Participants;
            participants = participants.filter(
              (p) => p.userId.toString() !== task.AssignedTo.toString(),
            );
          }

          const additionalAssignees = JSON.stringify(
            participants
              .map((p) => p.userId)
              .filter((id) => id !== updatedTask.AssignedTo.toString()),
          );

          updatedTask.AdditionalAssignees = additionalAssignees;
        } catch (error) {
          console.error("Error managing participants:", error);
        }
      } else {
        updatedTask[editingCell.field] = value;
      }

      // Aggiungiamo informazioni aggiuntive necessarie
      updatedTask.ProjectID = task.ProjectID;

      // Chiamiamo direttamente onTaskUpdate invece di saveEdit
      onTaskUpdate(updatedTask).then((result) => {
        if (result && result.success) {
          toast({
            title: "Aggiornamento riuscito",
            description: `${
              editingCell.field === "Status"
                ? "Stato"
                : editingCell.field === "AssignedTo"
                  ? "Responsabile"
                  : editingCell.field === "Priority"
                    ? "Priorità"
                    : "Campo"
            } aggiornato con successo`,
            variant: "success",
            duration: 2000,
            style: { backgroundColor: "#2c7a7b", color: "#fff" },
          });
        } else {
          toast({
            title: "Errore",
            description: "Aggiornamento non riuscito",
            variant: "destructive",
            style: {
              backgroundColor: "#fef2f2",
              borderColor: "#ef4444",
              color: "#b91c1c",
            },
          });
        }

        // Chiudiamo la modalità di editing
        setEditingCell({ taskId: null, field: null });
        setEditValue("");
      });
    }, 0);
  };

  // Salva le modifiche
  const saveEdit = async () => {
    if (!canEdit || isUpdating) return;

    // Se il valore non è cambiato, non fare nulla
    if (editValue === initialValue.current) {
      setEditingCell({ taskId: null, field: null });
      setEditValue("");
      return;
    }

    try {
      setIsUpdating(true);

      const updatedTask = { ...task };

      // Verifica se l'utente può modificare questo campo specifico
      if (!canEditField(editingCell.field)) {
        toast({
          title: "Permessi insufficienti",
          description: "Non hai i permessi per modificare questo campo",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      // Aggiorna il campo appropriato in base al tipo di campo
      if (editingCell.field === "AssignedTo") {
        // Per AssignedTo, dobbiamo assicurarci che sia un numero
        updatedTask.AssignedTo = parseInt(editValue);

        let participants = [];

        try {
          // Mantieni i partecipanti esistenti
          if (task.Participants) {
            participants =
              typeof task.Participants === "string"
                ? JSON.parse(task.Participants)
                : task.Participants;

            // Rimuovi l'assegnato precedente e aggiungi il nuovo
            participants = participants.filter(
              (p) => p.userId.toString() !== task.AssignedTo.toString(),
            );
          }

          // Aggiungi l'assegnato come partecipante se non è già presente
          const additionalAssignees = JSON.stringify(
            participants
              .map((p) => p.userId)
              .filter((id) => id !== updatedTask.AssignedTo.toString()),
          );

          updatedTask.AdditionalAssignees = additionalAssignees;
        } catch (error) {
          console.error("Error managing participants:", error);
        }
      } else {
        // Per tutti gli altri campi, usa il valore direttamente
        updatedTask[editingCell.field] = editValue;
      }

      // Aggiungiamo informazioni aggiuntive necessarie
      updatedTask.ProjectID = task.ProjectID;

      // Stampa di debug dei dati che stiamo inviando
      console.log("Inviando aggiornamento task:", updatedTask);

      const result = await onTaskUpdate(updatedTask);

      if (result && result.success) {
        // Mostra un toast di conferma
        toast({
          title: "Aggiornamento riuscito",
          description: `${
            editingCell.field === "Title"
              ? "Titolo"
              : editingCell.field === "Status"
                ? "Stato"
                : editingCell.field === "AssignedTo"
                  ? "Responsabile"
                  : editingCell.field === "Priority"
                    ? "Priorità"
                    : editingCell.field === "DueDate"
                      ? "Scadenza"
                      : "Campo"
          } aggiornato con successo`,
          variant: "success",
          duration: 2000,
          style: { backgroundColor: "#2c7a7b", color: "#fff" },
        });
      } else {
        // Se non c'è un risultato di successo, mostra un errore
        toast({
          title: "Errore",
          description: "Aggiornamento non riuscito",
          variant: "destructive",
          style: {
            backgroundColor: "#fef2f2",
            borderColor: "#ef4444",
            color: "#b91c1c",
          },
        });
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore nell'aggiornamento",
        variant: "destructive",
        style: {
          backgroundColor: "#fef2f2",
          borderColor: "#ef4444",
          color: "#b91c1c",
        },
      });
    } finally {
      setEditingCell({ taskId: null, field: null });
      setEditValue("");
      // Piccolo ritardo per evitare problemi di UI
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  };

  // Gestisce il tasto Invio e Escape durante la modifica
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditingCell({ taskId: null, field: null });
      setEditValue("");
    }
  };

  // Gestisce il click fuori dalla cella durante la modifica
  const handleBlur = () => {
    saveEdit();
  };

  // Se c'è un aggiornamento in corso, disabilita il click sul task
  const handleRowClick = () => {
    if (!isUpdating) {
      onTaskClick(task);
    }
  };

  // Rendering condizionale per elementi bloccati
  const renderEditableOrLocked = (
    field,
    content,
    editableContent,
    locked = !canEditField(field),
  ) => {
    return (
      <div className="relative">
        {locked && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <LockIcon className="h-3 w-3 absolute right-1 top-1 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Solo Admin o Manager possono modificare questo campo</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {content}
      </div>
    );
  };

  return (
    <TableRow
      className={`hover:bg-blue-50 ${isDelayed() ? "bg-red-50/30" : ""}`}
      onClick={handleRowClick}
    >
      {/* Titolo */}
      <TableCell
        className="font-medium cursor-pointer"
        title={task.Description}
      >
        {editingCell.taskId === task.TaskID && editingCell.field === "Title" ? (
          <Input
            value={editValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          renderEditableOrLocked(
            "Title",
            <div
              className="max-w-[250px] truncate"
              onClick={(e) => handleCellClick(e, "Title", task.Title)}
            >
              {task.Title}
            </div>,
          )
        )}
      </TableCell>

      {/* Responsabile */}
      <TableCell>
        {editingCell.taskId === task.TaskID &&
        editingCell.field === "AssignedTo" ? (
          <Select
            value={editValue.toString()}
            onValueChange={handleSelectChange}
          >
            <SelectTrigger
              className="w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue placeholder="Seleziona responsabile" />
            </SelectTrigger>
            <SelectContent>
              {/* Usa tutti gli utenti del sistema invece dei membri del progetto */}
              {project.allUsers?.map((user) => (
                <SelectItem key={user.userId} value={user.userId.toString()}>
                  {user.firstName} {user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          renderEditableOrLocked(
            "AssignedTo",
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={(e) =>
                handleCellClick(
                  e,
                  "AssignedTo",
                  task.AssignedTo?.toString() || "",
                )
              }
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {getInitials(task.AssignedToName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{task.AssignedToName}</span>
            </div>,
          )
        )}
      </TableCell>

      {/* Stato */}
      <TableCell>
        {editingCell.taskId === task.TaskID &&
        editingCell.field === "Status" ? (
          <Select
            value={editValue}
            onValueChange={handleSelectChange}
            onClick={(e) => e.stopPropagation()}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleziona stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DA FARE">
                <div className="flex items-center">
                  <ListTodo className="w-4 h-4 mr-2 text-gray-700" />
                  <span>Da Fare</span>
                </div>
              </SelectItem>
              <SelectItem value="IN ESECUZIONE">
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 text-blue-700" />
                  <span>In Esecuzione</span>
                </div>
              </SelectItem>
              <SelectItem value="COMPLETATA">
                <div className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-700" />
                  <span>Completata</span>
                </div>
              </SelectItem>
              <SelectItem value="BLOCCATA">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-red-700" />
                  <span>Bloccata</span>
                </div>
              </SelectItem>
              <SelectItem value="SOSPESA">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-yellow-700" />
                  <span>Sospesa</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div onClick={(e) => handleCellClick(e, "Status", task.Status)}>
            <Badge
              variant="outline"
              className={`flex items-center cursor-pointer ${statusConfig[task.Status]?.color || "bg-gray-100"}`}
            >
              {statusConfig[task.Status]?.icon}
              {task.Status}
            </Badge>
          </div>
        )}
      </TableCell>

      {/* Scadenza */}
      <TableCell>
        {editingCell.taskId === task.TaskID &&
        editingCell.field === "DueDate" ? (
          <Input
            type="date"
            value={editValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          renderEditableOrLocked(
            "DueDate",
            <div
              className={`flex items-center gap-1 cursor-pointer ${isDelayed() ? "text-red-600" : ""}`}
              onClick={(e) => handleCellClick(e, "DueDate", task.DueDate)}
            >
              <Calendar className="h-4 w-4" />
              <span>{formatDate(task.DueDate)}</span>
              {isDelayed() && (
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
            </div>,
          )
        )}
      </TableCell>

      {/* Priorità */}
      <TableCell>
        {editingCell.taskId === task.TaskID &&
        editingCell.field === "Priority" ? (
          <Select
            value={editValue}
            onValueChange={handleSelectChange}
            onClick={(e) => e.stopPropagation()}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleziona priorità" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALTA">Alta</SelectItem>
              <SelectItem value="MEDIA">Media</SelectItem>
              <SelectItem value="BASSA">Bassa</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          renderEditableOrLocked(
            "Priority",
            <div onClick={(e) => handleCellClick(e, "Priority", task.Priority)}>
              <Badge
                variant="outline"
                className={`cursor-pointer ${priorityConfig[task.Priority]?.color || "bg-gray-100"}`}
              >
                {task.Priority}
              </Badge>
            </div>,
          )
        )}
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
    </TableRow>
  );
};

export default UpdatedTaskRow;
