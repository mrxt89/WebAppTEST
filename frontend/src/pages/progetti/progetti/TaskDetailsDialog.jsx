import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  AlertCircle,
  ListTodo,
  Loader2,
} from "lucide-react";
import TaskInformationTab from "./TaskInformationTab";
import TaskCommentsTab from "./TaskCommentsTab";
import TaskCostsTab from "./TaskCostsTab";
import TaskHistoryTab from "./TaskHistoryTab";
import TaskAttachmentsTab from "./TaskAttachmentsTab";
import useProjectActions from "../../../hooks/useProjectManagementActions";
import useCalendar from "../../../hooks/useCalendar";
import { swal } from "../../../lib/common";
import CalendarIntegration from "../../../components/calendar/CalendarIntegration";

const TaskDetailsDialog = ({
  project,
  task = {},
  tasks = [],
  isOpen = false,
  onClose,
  onUpdate,
  onAddComment,
  assignableUsers = [],
  refreshProject,
}) => {
  const isRefreshing = useRef(false);
  const [editedTask, setEditedTask] = useState(task);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("information");
  const { checkAdminPermission, isOwnTask } = useProjectActions();
  const { syncCalendarEvent } = useCalendar();
  const canEdit = checkAdminPermission(project) || isOwnTask(task);

  // Stato calendario consolidato
  const [calendarState, setCalendarState] = useState({
    eventSynced: false,
    reminderTime: "30",
    selectedParticipants: [],
    loading: false,
    error: null,
  });

  // Gestione calendario
  const handleCalendarUpdate = async (participants) => {
    setCalendarState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await syncCalendarEvent(
        task.TaskID,
        participants,
        calendarState.reminderTime,
      );
      toast({
        title: "Successo",
        description: "Inviti calendario inviati con successo",
        variant: "success",
        style: { backgroundColor: "#44917a" },
      });
      refreshProject();
    } catch (error) {
      console.error("Error updating calendar:", error);
      setCalendarState((prev) => ({
        ...prev,
        error: error.message || "Errore nell'invio degli inviti calendario",
      }));
      toast({
        title: "Errore",
        description: "Errore nell'invio degli inviti calendario",
        variant: "destructive",
      });
    } finally {
      setCalendarState((prev) => ({ ...prev, loading: false }));
    }
  };

  // Sincronizza editedTask con il task in ingresso
  useEffect(() => {
    if (task && Object.keys(task).length > 0) {
      setEditedTask({
        ...task,
        PredecessorTaskID: task.PredecessorTaskID,
      });

      // Aggiorna lo stato del calendario se ci sono eventi
      if (task.CalendarEventsCount > 0) {
        setCalendarState((prev) => ({ ...prev, eventSynced: true }));
      }
    }
  }, [task]);

  // Reset stato al chiudere
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setActiveTab("information");
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      isRefreshing.current = false;
    };
  }, []);

  const handleCloseDialog = () => {
    if (isRefreshing.current) return;
    setIsEditing(false);
    onClose();
  };

  const handleCostOperation = async (operation) => {
    try {
      await operation();
      const result = await onUpdate(editedTask);
      if (result?.success && result?.task) {
        setEditedTask(result.task);
      }
    } catch (error) {
      console.error("Error in cost operation:", error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!editedTask?.TaskID) return;

    try {
      const participants = editedTask.Participants
        ? JSON.parse(editedTask.Participants)
        : [];
      const additionalAssignees = JSON.stringify(
        participants
          .map((p) => p.userId)
          .filter((id) => id !== editedTask.AssignedTo),
      );

      const updatedTaskData = {
        ...editedTask,
        Status: newStatus,
        AssignedTo: editedTask.AssignedTo,
        AdditionalAssignees: additionalAssignees,
      };

      const result = await onUpdate(updatedTaskData);
      if (result?.success && result?.task) {
        setEditedTask(result.task);
        if (result.task.Status !== editedTask.Status) {
          onClose();
        }
        refreshProject?.();
      }
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handlePriorityChange = async (newPriority) => {
    if (!editedTask?.TaskID) return;

    try {
      const participants = editedTask.Participants
        ? JSON.parse(editedTask.Participants)
        : [];
      const additionalAssignees = JSON.stringify(
        participants
          .map((p) => p.userId)
          .filter((id) => id !== editedTask.AssignedTo),
      );

      const updatedTaskData = {
        ...editedTask,
        Priority: newPriority,
        AssignedTo: editedTask.AssignedTo,
        AdditionalAssignees: additionalAssignees,
      };

      const result = await onUpdate(updatedTaskData);
      if (result?.success && result?.task) {
        setEditedTask(result.task);
        refreshProject?.();
      }
    } catch (error) {
      console.error("Error updating task priority:", error);
    }
  };

  const handleSave = async (updatedData) => {
    try {
      if (isRefreshing.current) return;
      isRefreshing.current = true;

      const dataToUpdate = {
        ...editedTask,
        ...updatedData,
        TaskID: editedTask.TaskID,
        ProjectID: editedTask.ProjectID,
        Title: editedTask.Title,
        Status: editedTask.Status,
        Priority: editedTask.Priority,
        Description: updatedData.Description,
        StartDate: updatedData.StartDate,
        DueDate: updatedData.DueDate,
        AssignedTo: updatedData.AssignedTo,
        PredecessorTaskID: updatedData.PredecessorTaskID,
        AdditionalAssignees: updatedData.AdditionalAssignees,
      };

      const result = await onUpdate(dataToUpdate, false);

      if (result?.success) {
        setIsEditing(false);
        if (result.task) {
          setEditedTask(result.task);
        }
      }
    } catch (error) {
      console.error("Error saving task:", error);
      swal.fire("Errore", "Errore nel salvataggio delle modifiche", "error");
    } finally {
      isRefreshing.current = false;
    }
  };

  const handleCancel = () => {
    setEditedTask(task);
    setIsEditing(false);
  };

  // Status configuration with icons and colors - aligned with TasksKanban
  const statusConfig = {
    COMPLETATA: {
      color: "bg-green-100 text-green-700 border border-green-200",
      icon: <CheckCircle2 className="w-4 h-4 mr-1" />,
    },
    "DA FARE": {
      color: "bg-gray-100 text-gray-700 border border-gray-200",
      icon: <ListTodo className="w-4 h-4 mr-1" />,
    },
    "IN ESECUZIONE": {
      color: "bg-blue-100 text-blue-700 border border-blue-200",
      icon: <Loader2 className="w-4 h-4 mr-1" />,
    },
    BLOCCATA: {
      color: "bg-red-100 text-red-700 border border-red-200",
      icon: <AlertCircle className="w-4 h-4 mr-1" />,
    },
    SOSPESA: {
      color: "bg-yellow-100 text-yellow-700 border border-yellow-200",
      icon: <AlertCircle className="w-4 h-4 mr-1" />,
    },
  };

  // Priority configuration with icons and colors
  const priorityConfig = {
    ALTA: {
      color: "text-red-500 border-red-200 bg-red-50",
      icon: <AlertTriangle className="w-4 h-4 mr-1 text-red-500" />,
    },
    MEDIA: {
      color: "text-yellow-500 border-yellow-200 bg-yellow-50",
      icon: <AlertTriangle className="w-4 h-4 mr-1 text-yellow-500" />,
    },
    BASSA: {
      color: "text-green-500 border-green-200 bg-green-50",
      icon: <AlertTriangle className="w-4 h-4 mr-1 text-green-500" />,
    },
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
      <DialogContent className="max-w-2xl h-[800px] flex flex-col p-0 rounded-xl">
        <DialogHeader className="p-6 pb-2 border-b shrink-0 bg-white rounded-t-xl">
          <DialogTitle className="sr-only">
            Dettagli Attività: {editedTask?.Title}
          </DialogTitle>
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              {isEditing ? (
                <Input
                  value={editedTask?.Title || ""}
                  onChange={(e) =>
                    setEditedTask((prev) => ({
                      ...prev,
                      Title: e.target.value,
                    }))
                  }
                  className="text-2xl font-bold"
                  aria-label="Titolo attività"
                />
              ) : (
                <h2 className="text-2xl font-bold">{editedTask?.Title}</h2>
              )}
              <div className="flex gap-4 items-center mt-3 justify-content-around">
                {/* Status Card - Material Design inspired */}
                <div className="flex flex-col ">
                  <label className="text-sm text-gray-500 mb-1 font-medium">
                    Stato
                  </label>
                  <Select
                    value={editedTask?.Status || ""}
                    onValueChange={handleStatusChange}
                    disabled={!canEdit}
                  >
                    <SelectTrigger
                      className={`cursor-pointer px-3 py-2 w-48 rounded-full shadow-sm flex items-center justify-between ${statusConfig[editedTask?.Status]?.color || "bg-gray-100 text-gray-700 border border-gray-200"}`}
                    >
                      {statusConfig[editedTask?.Status]?.icon}
                      <span>{editedTask?.Status || "DA FARE"}</span>
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
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
                </div>

                {/* Priority Card - Material Design inspired */}
                <div className="flex flex-col ">
                  <label className="text-sm text-gray-500 mb-1 font-medium ">
                    Priorità
                  </label>
                  <Select
                    value={editedTask?.Priority || ""}
                    onValueChange={handlePriorityChange}
                    disabled={!canEdit}
                  >
                    <SelectTrigger
                      className={`cursor-pointer px-3 py-2 w-48 rounded-full shadow-sm flex items-center justify-between ${priorityConfig[editedTask?.Priority]?.color || "bg-gray-100 text-gray-700 border border-gray-200"}`}
                    >
                      {priorityConfig[editedTask?.Priority]?.icon}
                      <span>{editedTask?.Priority || "MEDIA"}</span>
                    </SelectTrigger>
                    <SelectContent className="rounded-lg justify-between">
                      <SelectItem value="BASSA">
                        <div className="flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-2 text-green-500" />
                          <span>Bassa</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="MEDIA">
                        <div className="flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" />
                          <span>Media</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="ALTA">
                        <div className="flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                          <span>Alta</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col"
          >
            <TabsList className="px-6 border-b shrink-0 bg-gray-50">
              <TabsTrigger
                value="information"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
              >
                Informazioni
              </TabsTrigger>
              <TabsTrigger
                value="comments"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
              >
                Commenti
              </TabsTrigger>
              <TabsTrigger
                value="costs"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
              >
                Costi
              </TabsTrigger>
              <TabsTrigger
                value="attachments"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
              >
                Allegati
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
              >
                Storico
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
              >
                Calendario
                {task?.CalendarEventsCount > 0 && (
                  <Badge
                    variant=""
                    className="ml-2 bg-blue-100 text-blue-600 rounded-full"
                  >
                    {task.CalendarEventsCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto relative">
              <TabsContent
                value="information"
                className="p-6 m-0 absolute inset-0"
              >
                <div className="h-full flex flex-col">
                  <div className="flex-1">
                    <TaskInformationTab
                      task={editedTask}
                      isEditing={isEditing}
                      canEdit={canEdit}
                      onSave={handleSave}
                      onCancel={handleCancel}
                      assignableUsers={assignableUsers}
                      tasks={tasks}
                    />
                  </div>
                  <div className="shrink-0 pt-4 flex justify-end">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Button
                          variant=""
                          onClick={handleCancel}
                          className="rounded-full px-5 hover:bg-red-500"
                        >
                          Annulla
                        </Button>
                        <Button
                          onClick={() => {
                            const form =
                              document.getElementById("taskInformationTab");
                            if (form) {
                              form.dispatchEvent(
                                new Event("submit", {
                                  bubbles: true,
                                  cancelable: true,
                                }),
                              );
                            }
                          }}
                          className="rounded-full px-5 hover:bg-emerald-500"
                        >
                          Salva Modifiche
                        </Button>
                      </div>
                    ) : (
                      canEdit && (
                        <Button
                          className="rounded-full px-5 bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
                          variant=""
                          onClick={() => setIsEditing(true)}
                          aria-label="Modifica attività"
                        >
                          Modifica
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="comments"
                className="p-6 m-0 absolute inset-0"
              >
                <TaskCommentsTab
                  task={editedTask}
                  onAddComment={onAddComment}
                />
              </TabsContent>

              <TabsContent value="costs" className="p-6 m-0 absolute inset-0">
                <TaskCostsTab
                  task={editedTask}
                  canEdit={canEdit}
                  onCostChange={handleCostOperation}
                />
              </TabsContent>

              <TabsContent
                value="attachments"
                className="p-6 m-0 absolute inset-0"
              >
                <TaskAttachmentsTab
                  task={editedTask}
                  canEdit={canEdit}
                  onAttachmentChange={refreshProject}
                />
              </TabsContent>

              <TabsContent value="history" className="p-6 m-0 absolute inset-0">
                <TaskHistoryTab task={editedTask} />
              </TabsContent>

              <TabsContent
                value="calendar"
                className="p-6 m-0 absolute inset-0"
              >
                <div className="h-full flex flex-col">
                  <CalendarIntegration
                    task={task}
                    assignedUsers={assignableUsers}
                    onUpdateEvent={handleCalendarUpdate}
                    canEdit={canEdit}
                    calendarState={calendarState}
                    setCalendarState={setCalendarState}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailsDialog;
