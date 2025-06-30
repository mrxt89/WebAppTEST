import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  X,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  AlertCircle,
  ListTodo,
  Loader2,
  Calendar,
  Users,
  MessageSquare,
  Paperclip,
  History,
  DollarSign,
  CalendarClock,
  Pin,
  PinOff,
  Ban,
  Trash,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import TaskInformationTab from "./TaskInformationTab";
import TaskChatsTab from "./TaskChatsTab";
import TaskCostsTab from "./TaskCostsTab";
import TaskHistoryTab from "./TaskHistoryTab";
import TaskAttachmentsTab from "./TaskAttachmentsTab";
import CalendarIntegration from "../../../components/calendar/CalendarIntegration";
import useProjectActions from "../../../hooks/useProjectManagementActions";
import useCalendar from "../../../hooks/useCalendar";
import { swal } from "../../../lib/common";

const TaskDetailsPanel = ({
  project,
  task,
  tasks = [],
  isOpen,
  onClose,
  onUpdate,
  onAddComment,
  assignableUsers = [],
  refreshProject,
  activeTabOnReopen = null,
  onTabChange,
  position = "right", // "right", "bottom", o "fullscreen"
  defaultWidth = 700,
  minWidth = 400,
  maxWidth = 1200,
  topOffset = null, 
}) => {
  const panelRef = useRef(null);
  const resizeRef = useRef(null);
  const dragControls = useDragControls();
  
  // Stati principali
  const [editedTask, setEditedTask] = useState(task);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState(activeTabOnReopen || "information");
  const [panelWidth, setPanelWidth] = useState(position === "right" ? 700 : defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [panelPosition, setPanelPosition] = useState(position);
  
  // Stati per animazioni e transizioni
  const [isClosing, setIsClosing] = useState(false);
  const [showContent, setShowContent] = useState(false);
  
  const { checkAdminPermission, isOwnTask, toggleTaskDisabled } = useProjectActions();
  const { syncCalendarEvent } = useCalendar();
  const canEdit = checkAdminPermission(project) || isOwnTask(task);

  // Stato calendario
  const [calendarState, setCalendarState] = useState({
    eventSynced: false,
    reminderTime: "30",
    selectedParticipants: [],
    loading: false,
    error: null,
  });

  // Configurazione stati e priorità
  const statusConfig = {
    COMPLETATA: {
      color: "bg-green-100 text-green-700 border border-green-200",
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    "DA FARE": {
      color: "bg-gray-100 text-gray-700 border border-gray-200",
      icon: <ListTodo className="w-4 h-4" />,
    },
    "IN ESECUZIONE": {
      color: "bg-blue-100 text-blue-700 border border-blue-200",
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
    },
    BLOCCATA: {
      color: "bg-red-100 text-red-700 border border-red-200",
      icon: <AlertCircle className="w-4 h-4" />,
    },
    SOSPESA: {
      color: "bg-yellow-100 text-yellow-700 border border-yellow-200",
      icon: <AlertCircle className="w-4 h-4" />,
    },
  };

  const priorityConfig = {
    ALTA: {
      color: "text-red-500 border-red-200 bg-red-50",
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
    },
    MEDIA: {
      color: "text-yellow-500 border-yellow-200 bg-yellow-50",
      icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    },
    BASSA: {
      color: "text-green-500 border-green-200 bg-green-50",
      icon: <AlertTriangle className="w-4 h-4 text-green-500" />,
    },
  };

  // Calcola l'offset top dinamicamente
  const calculateTopOffset = useCallback(() => {
    if (topOffset !== null) {
      return topOffset;
    }
    
    // Cerca l'header principale o il breadcrumb per calcolare l'offset
    const header = document.querySelector('.breadcrumb-container, .breadcrumb');
    if (header) {
      const headerRect = header.getBoundingClientRect();
      return headerRect.bottom;
    }
    
    // Default fallback
    return 100;
  }, [topOffset]);

  const [calculatedTopOffset, setCalculatedTopOffset] = useState(100);

  useEffect(() => {
    if (isOpen) {
      const offset = calculateTopOffset();
      setCalculatedTopOffset(offset);
    }
  }, [isOpen, calculateTopOffset]);

  // Sincronizza task quando cambia
  useEffect(() => {
    if (task && Object.keys(task).length > 0) {
      setEditedTask({
        ...task,
        PredecessorTaskID: task.PredecessorTaskID,
      });
      if (task.CalendarEventsCount > 0) {
        setCalendarState((prev) => ({ ...prev, eventSynced: true }));
      }
    }
  }, [task]);

  // Effetto per mostrare contenuto con delay per animazione
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  // Reset stato quando si chiude
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setIsClosing(false);
      setShowContent(false);
    }
  }, [isOpen]);

  // Gestione resize del pannello
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.pageX;
    const startWidth = panelWidth;

    const handleMouseMove = (e) => {
      if (panelPosition === "right") {
        const newWidth = startWidth - (e.pageX - startX);
        setPanelWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "ew-resize";
  }, [panelWidth, panelPosition, minWidth, maxWidth]);

  // Gestione chiusura con animazione
  const handleClose = useCallback(() => {
    if (isEditing && !editedTask?.TaskDisabled) {
      swal.fire({
        title: "Modifiche non salvate",
        text: "Vuoi salvare le modifiche prima di chiudere?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Salva",
        cancelButtonText: "Chiudi senza salvare",
        showDenyButton: true,
        denyButtonText: "Annulla",
      }).then((result) => {
        if (result.isConfirmed) {
          handleSave();
        } else if (result.dismiss === swal.DismissReason.cancel) {
          setIsClosing(true);
          setTimeout(() => {
            onClose();
          }, 300);
        }
      });
    } else {
      setIsClosing(true);
      setTimeout(() => {
        onClose();
      }, 300);
    }
  }, [isEditing, onClose, editedTask]);

  // Gestione cambio tab
  const handleTabChange = useCallback((value) => {
    setActiveTab(value);
    if (onTabChange) {
      onTabChange(value);
    }
  }, [onTabChange]);

  // Gestione salvataggio
  const handleSave = async (updatedData) => {
    try {
      const dataToUpdate = {
        ...editedTask,
        ...updatedData,
        TaskID: editedTask.TaskID,
        ProjectID: editedTask.ProjectID,
      };

      const result = await onUpdate(dataToUpdate, false);

      if (result?.success) {
        setIsEditing(false);
        if (result.task) {
          setEditedTask(result.task);
        }
        toast({
          title: "Modifiche salvate",
          description: "Le modifiche sono state salvate con successo",
          variant: "success",
        });
        
        // Chiama refreshProject per aggiornare il Gantt mantenendo lo stato
        if (refreshProject) {
          refreshProject(() => {
            // Il Gantt manterrà automaticamente il suo stato grazie al sessionStorage
          });
        }
      }
    } catch (error) {
      console.error("Error saving task:", error);
      swal.fire("Errore", "Errore nel salvataggio delle modifiche", "error");
    }
  };

  // Gestione cambio stato
  const handleStatusChange = async (newStatus) => {
    if (!editedTask?.TaskID || editedTask?.TaskDisabled) return;

    try {
      const updatedTaskData = {
        ...editedTask,
        Status: newStatus,
      };

      const result = await onUpdate(updatedTaskData);
      if (result?.success && result?.task) {
        setEditedTask(result.task);
        refreshProject(activeTab);
      }
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  // Gestione cambio priorità
  const handlePriorityChange = async (newPriority) => {
    if (!editedTask?.TaskID || editedTask?.TaskDisabled) return;

    try {
      const updatedTaskData = {
        ...editedTask,
        Priority: newPriority,
      };

      const result = await onUpdate(updatedTaskData);
      if (result?.success && result?.task) {
        setEditedTask(result.task);
        refreshProject(activeTab);
      }
    } catch (error) {
      console.error("Error updating task priority:", error);
    }
  };

  // Gestione disabilitazione task
  const handleToggleDisabled = async () => {
    try {
      const result = await swal.fire({
        title: editedTask.TaskDisabled ? "Riabilitare attività?" : "Disabilitare attività?",
        text: editedTask.TaskDisabled 
          ? "L'attività tornerà visibile nelle viste di default."
          : "L'attività non sarà più visibile nelle viste di default.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: editedTask.TaskDisabled ? "Riabilita" : "Disabilita",
        cancelButtonText: "Annulla",
        confirmButtonColor: editedTask.TaskDisabled ? "#10B981" : "#EF4444",
      });

      if (result.isConfirmed) {
        const response = await toggleTaskDisabled(editedTask.TaskID, !editedTask.TaskDisabled);
        if (response.success) {
          toast({
            title: "Successo",
            description: response.msg,
            variant: "success",
          });
          // Chiudi il pannello e ricarica il progetto
          handleClose();
          if (refreshProject) {
            refreshProject();
          }
        } else {
          throw new Error(response.msg);
        }
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: error.message || "Errore nella modifica dello stato dell'attività",
        variant: "destructive",
      });
    }
  };

  // Gestione fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setPanelPosition("fullscreen");
    } else {
      setPanelPosition(position);
    }
  };

  // Gestione minimize
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Calcola posizione e dimensioni del pannello
  const getPanelStyles = () => {
    if (panelPosition === "fullscreen") {
      return {
        position: "fixed",
        top: calculatedTopOffset,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: `calc(100% - ${calculatedTopOffset}px)`,
        zIndex: 1050,
      };
    }

    if (panelPosition === "right") {
      return {
        position: "fixed",
        top: calculatedTopOffset,
        right: 0,
        bottom: 0,
        width: isMinimized ? 60 : panelWidth,
        height: `calc(100% - ${calculatedTopOffset}px)`,
        zIndex: 1040,
      };
    }

    if (panelPosition === "bottom") {
      return {
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: isMinimized ? 60 : `calc(100vh - ${calculatedTopOffset}px)`,
        width: "100%",
        zIndex: 1040,
      };
    }
  };


  if (!isOpen || !task) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          {!isPinned && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm"
              style={{ zIndex: 1039 }}
              onClick={handleClose}
            />
          )}

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{
              x: panelPosition === "right" ? "100%" : 0,
              y: panelPosition === "bottom" ? "100%" : 0,
              opacity: 0,
            }}
            animate={{
              x: isClosing && panelPosition === "right" ? "100%" : 0,
              y: isClosing && panelPosition === "bottom" ? "100%" : 0,
              opacity: 1,
            }}
            exit={{
              x: panelPosition === "right" ? "100%" : 0,
              y: panelPosition === "bottom" ? "100%" : 0,
              opacity: 0,
            }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
            }}
            className={`
              bg-white shadow-2xl flex flex-col overflow-hidden
              ${panelPosition === "right" ? "border-l" : ""}
              ${panelPosition === "bottom" ? "border-t" : ""}
              ${isResizing ? "select-none" : ""}
              ${isMinimized ? "cursor-pointer" : ""}
            `}
            style={getPanelStyles()}
            onClick={isMinimized ? toggleMinimize : undefined}
          >
            {/* Resize handle */}
            {panelPosition === "right" && !isFullscreen && !isMinimized && (
              <div
                ref={resizeRef}
                className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 transition-colors"
                onMouseDown={handleResizeStart}
              >
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <GripVertical className="h-8 w-4 text-gray-400" />
                </div>
              </div>
            )}

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`
                flex items-center justify-between p-4 border-b bg-gradient-to-r from-gray-50 to-white
                ${isMinimized ? "cursor-pointer" : ""}
              `}
            >
              <div className={`flex items-center gap-3 ${isMinimized ? "flex-col" : ""}`}>
                {/* Icona stato/priorità quando minimizzato */}
                {isMinimized ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className={`p-2 rounded-full ${statusConfig[editedTask?.Status]?.color}`}>
                      {statusConfig[editedTask?.Status]?.icon}
                    </div>
                    <div className={`p-1 rounded ${priorityConfig[editedTask?.Priority]?.color}`}>
                      {priorityConfig[editedTask?.Priority]?.icon}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Titolo attività */}
                    <h2 className="text-xl font-bold text-gray-800 truncate max-w-md">
                      {editedTask?.Title}
                    </h2>
                    {/* Badge disabilitata */}
                    {editedTask?.TaskDisabled && (
                      <Badge 
                        variant="destructive" 
                        className="bg-red-100 text-red-700 border-red-200"
                      >
                        <Ban className="w-3 h-3 mr-1" />
                        Disabilitata
                      </Badge>
                    )}
                  </>
                )}
              </div>

              {/* Controlli header */}
              {!isMinimized && (
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    {/* Toggle Disable/Enable */}
                    {canEdit && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={editedTask?.TaskDisabled ? "default" : "destructive"}
                            size="icon"
                            onClick={handleToggleDisabled}
                            className="h-8 w-8"
                          >
                            {editedTask?.TaskDisabled ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Trash className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {editedTask?.TaskDisabled ? "Riabilita attività" : "Disabilita attività"}
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {/* Pin/Unpin */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsPinned(!isPinned)}
                          className="h-8 w-8"
                        >
                          {isPinned ? (
                            <PinOff className="h-4 w-4" />
                          ) : (
                            <Pin className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isPinned ? "Sblocca pannello" : "Blocca pannello"}
                      </TooltipContent>
                    </Tooltip>

                    {/* Minimize */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleMinimize}
                          className="h-8 w-8"
                        >
                          <Minimize2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Minimizza</TooltipContent>
                    </Tooltip>

                    {/* Fullscreen */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleFullscreen}
                          className="h-8 w-8"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isFullscreen ? "Esci da schermo intero" : "Schermo intero"}
                      </TooltipContent>
                    </Tooltip>

                    {/* Close */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleClose}
                          className="h-8 w-8 hover:bg-red-100 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Chiudi</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </motion.div>

            {/* Alert disabilitazione */}
            {!isMinimized && showContent && editedTask?.TaskDisabled && (
              <Alert className="m-4 mb-0 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Attività Disabilitata</AlertTitle>
                <AlertDescription className="text-red-700">
                  Questa attività è stata disabilitata da {editedTask.DisabledByName} 
                  il {new Date(editedTask.TaskDisabledAt).toLocaleString()}.
                  Le attività disabilitate non sono visibili nelle viste di default.
                </AlertDescription>
              </Alert>
            )}

            {/* Quick actions bar */}
            {!isMinimized && showContent && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b"
              >
                <div className="flex items-center gap-3">
                  {/* Cambio rapido stato e priorità */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={editedTask?.Status || ""}
                      onValueChange={handleStatusChange}
                      disabled={!canEdit || editedTask?.TaskDisabled}
                    >
                      <SelectTrigger className="h-7 w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([status, config]) => (
                          <SelectItem key={status} value={status} className="text-xs">
                            <div className="flex items-center gap-1.5">
                              {config.icon}
                              <span>{status}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={editedTask?.Priority || ""}
                      onValueChange={handlePriorityChange}
                      disabled={!canEdit || editedTask?.TaskDisabled}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityConfig).map(([priority, config]) => (
                          <SelectItem key={priority} value={priority} className="text-xs">
                            <div className="flex items-center gap-1.5">
                              {config.icon}
                              <span>{priority}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date info */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Scadenza: {editedTask?.DueDate 
                        ? new Date(editedTask.DueDate).toLocaleDateString() 
                        : "Non definita"}
                    </span>
                  </div>
                </div>

                {/* Azioni */}
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditing(false)}
                      >
                        Annulla
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          const form = document.getElementById("taskInformationTab");
                          if (form) {
                            form.dispatchEvent(
                              new Event("submit", {
                                bubbles: true,
                                cancelable: true,
                              }),
                            );
                          }
                        }}
                      >
                        Salva
                      </Button>
                    </>
                  ) : (
                    canEdit && !editedTask?.TaskDisabled && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                      >
                        Modifica
                      </Button>
                    )
                  )}
                </div>
              </motion.div>
            )}

            {/* Content */}
            {!isMinimized && showContent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex-1 overflow-hidden flex flex-col"
              >
                <Tabs
                  value={activeTab}
                  onValueChange={handleTabChange}
                  className="flex-1 flex flex-col"
                >
                  <TabsList className="px-4 h-16 justify-between overflow-x-auto flex-nowrap">
                    <TabsTrigger value="information" className="flex items-center gap-2">
                      <ListTodo className="h-4 w-4" />
                      Info
                    </TabsTrigger>
                    <TabsTrigger value="comments" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Chat
                      {editedTask?.UnreadComments > 0 && (
                        <Badge variant="destructive" className="ml-1 h-5 px-1">
                          {editedTask.UnreadComments}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="costs" className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Costi
                    </TabsTrigger>
                    <TabsTrigger value="attachments" className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Allegati
                      {editedTask?.AttachmentsCount > 0 && (
                        <Badge variant="outline" className="ml-1 h-5 px-1">
                          {editedTask.AttachmentsCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Storico
                    </TabsTrigger>
                    <TabsTrigger value="calendar" className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4" />
                      Calendario
                      {editedTask?.CalendarEventsCount > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1">
                          {editedTask.CalendarEventsCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex-1 overflow-y-auto">
                    <TabsContent value="information" className="p-4 m-0 h-1">
                      <TaskInformationTab
                        task={editedTask}
                        isEditing={isEditing && !editedTask?.TaskDisabled}
                        canEdit={canEdit && !editedTask?.TaskDisabled}
                        onSave={handleSave}
                        onCancel={() => setIsEditing(false)}
                        assignableUsers={assignableUsers}
                        tasks={tasks}
                      />
                    </TabsContent>

                    <TabsContent value="comments" className="p-4 m-0 h-full">
                      <TaskChatsTab
                        task={editedTask}
                        project={project}
                        onAddComment={onAddComment}
                        disabled={editedTask?.TaskDisabled}
                      />
                    </TabsContent>

                    <TabsContent value="costs" className="p-4 m-0">
                      <TaskCostsTab
                        task={editedTask}
                        canEdit={canEdit && !editedTask?.TaskDisabled}
                        onCostChange={async (operation) => {
                          await operation();
                          await refreshProject(activeTab);
                        }}
                      />
                    </TabsContent>

                    <TabsContent value="attachments" className="p-4 m-0">
                      <TaskAttachmentsTab
                        task={editedTask}
                        canEdit={canEdit && !editedTask?.TaskDisabled}
                        onAttachmentChange={() => refreshProject(activeTab)}
                      />
                    </TabsContent>

                    <TabsContent value="history" className="p-4 m-0">
                      <TaskHistoryTab task={editedTask} />
                    </TabsContent>

                    <TabsContent value="calendar" className="p-4 m-0">
                      <CalendarIntegration
                        task={editedTask}
                        assignedUsers={assignableUsers}
                        onUpdateEvent={async (participants) => {
                          setCalendarState((prev) => ({ ...prev, loading: true }));
                          try {
                            await syncCalendarEvent(
                              editedTask.TaskID,
                              participants,
                              calendarState.reminderTime,
                            );
                            toast({
                              title: "Successo",
                              description: "Inviti calendario inviati con successo",
                            });
                            refreshProject(activeTab);
                          } catch (error) {
                            console.error("Error updating calendar:", error);
                            toast({
                              title: "Errore",
                              description: "Errore nell'invio degli inviti",
                              variant: "destructive",
                            });
                          } finally {
                            setCalendarState((prev) => ({ ...prev, loading: false }));
                          }
                        }}
                        canEdit={canEdit && !editedTask?.TaskDisabled}
                        calendarState={calendarState}
                        setCalendarState={setCalendarState}
                      />
                    </TabsContent>
                  </div>
                </Tabs>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TaskDetailsPanel;