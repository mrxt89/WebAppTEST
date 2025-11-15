import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ListTodo,
  AlertTriangle,
  Clock,
  MessageSquare,
  Paperclip,
  Calendar,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { FileSymlink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getPhaseProgressUrl } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const TaskCard = ({
  task,
  onClick,
  onDragStart,
  isDragging,
  isUpdating,
  canDrag,
  onProjectClick,
  currentUserId,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { user } = useAuth();

  const priorityConfig = {
    ALTA: { 
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-700",
      icon: "🔥"
    },
    MEDIA: { 
      color: "from-amber-500 to-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      textColor: "text-amber-700",
      icon: "⚡"
    },
    BASSA: { 
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      textColor: "text-emerald-700",
      icon: "🌱"
    },
  };

  const isDelayed = () => {
    const dueDate = new Date(task.DueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && task.Status !== "COMPLETATA";
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const diffTime = Math.abs(d - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Oggi";
    if (diffDays === 1) return d > today ? "Domani" : "Ieri";
    if (diffDays < 7) return d > today ? `${diffDays}gg` : `${diffDays}gg fa`;
    
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
  };

  const navigateToProject = (e) => {
    e.stopPropagation();
    console.log('[KANBAN] navigateToProject chiamato', {
      taskTitle: task.Title,
      projectID: task.ProjectID,
      projectName: task.ProjectName,
      hasOnProjectClick: !!onProjectClick,
      onProjectClickType: typeof onProjectClick
    });
    if (onProjectClick) {
      console.log('[KANBAN] Chiamando onProjectClick con ProjectID:', task.ProjectID);
      onProjectClick(task.ProjectID);
    } else {
      console.log('[KANBAN] ERRORE: onProjectClick non definito!');
    }
  };

  const priority = priorityConfig[task.Priority] || priorityConfig.BASSA;

  const openExternalLink = (e) => {
    e.stopPropagation();
    const prj = task.ProjectName || "";
    const stp = task.TaskSequence != null ? task.TaskSequence : "";
    const ute = user?.ERPUserId ?? 0;
    const ope = task.Operation || "";
    const companyId = user?.CompanyId || 1; // Default a Ricos se non disponibile
    const url = getPhaseProgressUrl(companyId, prj, stp, ute, ope);
    window.open(url, "_blank", "noopener");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      whileDrag={{ scale: 1.05, rotate: 2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card
        className={`
          relative overflow-hidden transition-all duration-300
          ${isDragging ? "opacity-40" : "hover:shadow-lg"} 
          ${isUpdating ? "animate-pulse" : ""} 
          ${canDrag ? "cursor-move" : "cursor-pointer"}
          bg-white border-gray-200
          ${isHovered ? "z-10" : "z-0"}
        `}
        onClick={(e) => {
          if (!isDragging && !isUpdating) onClick(task);
          e.stopPropagation();
        }}
        draggable={canDrag && !isUpdating}
        onDragStart={(e) => {
          onDragStart(e, task);
          e.stopPropagation();
        }}
      >
        {/* Priority gradient bar */}
        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${priority.color}`} />
        
        {/* Contenuto compatto di default */}
        <div className={`transition-all duration-300 ${isHovered ? 'p-3' : 'p-2.5'}`}>
          {/* Versione compatta - sempre visibile */}
          <div className="space-y-1.5">
            {/* Titolo con indicatore ritardo */}
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2 flex-1">
                {task.Title}
              </h4>
              {isDelayed() && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex-shrink-0"
                >
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </motion.div>
              )}
            </div>

            {/* Progetto e link esterno */}
            <div className="flex items-center justify-between gap-2">
              <div 
                className="inline-flex items-center gap-1 text-blue-600 hover:underline cursor-pointer text-xs"
                onClick={navigateToProject}
              >
                <span className="truncate">{task.ProjectName}</span>
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </div>
              <button
                type="button"
                onClick={openExternalLink}
                title="Apri avanzamento attività"
                className="flex-shrink-0 text-gray-500 hover:text-gray-700"
              >
                <FileSymlink className="h-4 w-4" />
              </button>
            </div>

            {/* Info base: utente e data */}
            <div className="flex items-center justify-between gap-2">
              {/* Assignee */}
              {task.AssignedToName && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <Avatar className="h-5 w-5 flex-shrink-0">
                    <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {task.AssignedToName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-gray-600 truncate">
                    {task.AssignedToName.split(' ')[0]}
                  </span>
                </div>
              )}
              
              {/* Due date */}
              <div className={`flex items-center gap-1 text-xs flex-shrink-0 ${isDelayed() ? "text-red-600 font-medium" : "text-gray-500"}`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDate(task.DueDate)}</span>
              </div>
            </div>
          </div>

          {/* Contenuto espanso al hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-2 mt-2 border-t border-gray-100 space-y-2">
                  {/* Priorità */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Priorità</span>
                    <Badge 
                      variant="secondary"
                      className={`${priority.bgColor} ${priority.textColor} ${priority.borderColor} border text-xs px-2 py-0.5`}
                    >
                      <span className="mr-1">{priority.icon}</span>
                      {task.Priority}
                    </Badge>
                  </div>

                  {/* Descrizione completa */}
                  {task.Description && (
                    <div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {task.Description}
                      </p>
                    </div>
                  )}

                  {/* Date complete */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Inizio: {formatDate(task.StartDate)}</span>
                    </div>
                  </div>

                  {/* Commenti e allegati */}
                  {(task.CommentsCount > 0 || task.AttachmentsCount > 0) && (
                    <div className="flex items-center gap-3 pt-1">
                      {task.CommentsCount > 0 && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="text-xs">{task.CommentsCount}</span>
                        </div>
                      )}
                      {task.AttachmentsCount > 0 && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="text-xs">{task.AttachmentsCount}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Loading overlay */}
        {isUpdating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-xs text-blue-600 font-medium">Aggiornamento...</span>
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
};

const MyTasksKanban = ({
  tasks = [],
  onTaskClick,
  onTaskUpdate,
  checkAdminPermission,
  isOwnTask,
  onProjectClick,
}) => {
  const { user } = useAuth();
  const [localTasks, setLocalTasks] = useState(tasks);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dropTargetStatus, setDropTargetStatus] = useState(null);
  const [updatingTasks, setUpdatingTasks] = useState({});
  const dropTimeoutRef = useRef(null);
  const isUpdatingRef = useRef(false);
  const navigate = useNavigate();

  const TASK_STATES = {
    "DA FARE": "DA FARE",
    "IN ESECUZIONE": "IN ESECUZIONE",
    SOSPESA: "SOSPESA",
    COMPLETATA: "COMPLETATA",
    BLOCCATA: "BLOCCATA",
  };

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    return () => {
      if (dropTimeoutRef.current) {
        clearTimeout(dropTimeoutRef.current);
      }
    };
  }, []);

  const isTaskDelayed = (task) => {
    const dueDate = new Date(task.DueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && task.Status !== "COMPLETATA";
  };

  const tasksByStatus = {
    [TASK_STATES["DA FARE"]]: localTasks.filter((task) => task.Status === "DA FARE"),
    [TASK_STATES["IN ESECUZIONE"]]: localTasks.filter((task) => task.Status === "IN ESECUZIONE"),
    [TASK_STATES["SOSPESA"]]: localTasks.filter((task) => task.Status === "SOSPESA"),
    [TASK_STATES["COMPLETATA"]]: localTasks.filter((task) => task.Status === "COMPLETATA"),
    [TASK_STATES["BLOCCATA"]]: localTasks.filter((task) => task.Status === "BLOCCATA"),
  };

  const statusConfig = {
    [TASK_STATES["DA FARE"]]: {
      label: "Da Fare",
      icon: ListTodo,
      gradient: "from-gray-600 to-gray-700",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-300",
      hoverBg: "hover:bg-gray-100",
      iconBg: "",
      countBg: "bg-gray-200 text-gray-700",
    },
    [TASK_STATES["IN ESECUZIONE"]]: {
      label: "In Corso",
      icon: Loader2,
      gradient: "from-blue-600 to-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-300",
      hoverBg: "hover:bg-blue-100",
      iconBg: "",
      countBg: "bg-blue-200 text-blue-700",
      iconAnimation: "animate-spin",
    },
    [TASK_STATES["SOSPESA"]]: {
      label: "Sospese",
      icon: AlertCircle,
      gradient: "from-amber-600 to-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-300",
      hoverBg: "hover:bg-amber-100",
      iconBg: "",
      countBg: "bg-amber-200 text-amber-700",
    },
    [TASK_STATES["COMPLETATA"]]: {
      label: "Completate",
      icon: CheckCircle2,
      gradient: "from-emerald-600 to-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-300",
      hoverBg: "hover:bg-emerald-100",
      iconBg: "",
      countBg: "bg-emerald-200 text-emerald-700",
    },
    [TASK_STATES["BLOCCATA"]]: {
      label: "Bloccate",
      icon: AlertTriangle,
      gradient: "from-red-600 to-red-700",
      bgColor: "bg-red-50",
      borderColor: "border-red-300",
      hoverBg: "hover:bg-red-100",
      iconBg: "",
      countBg: "bg-red-200 text-red-700",
    },
  };

  const handleDragStart = (e, task) => {
    if (!checkAdminPermission({ AdminPermission: task.AdminPermission }) && !isOwnTask(task)) {
      e.preventDefault();
      return;
    }

    if (updatingTasks[task.TaskID]) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("taskId", task.TaskID);
    e.dataTransfer.setData("currentStatus", task.Status);
    setDraggedTask(task);

    const img = new Image();
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (dropTargetStatus !== status) {
      setDropTargetStatus(status);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();

    if (dropTimeoutRef.current) {
      clearTimeout(dropTimeoutRef.current);
    }

    dropTimeoutRef.current = setTimeout(() => {
      setDropTargetStatus(null);
    }, 100);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDropTargetStatus(null);

    if (dropTimeoutRef.current) {
      clearTimeout(dropTimeoutRef.current);
      dropTimeoutRef.current = null;
    }
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();

    if (isUpdatingRef.current) return;

    const taskId = parseInt(e.dataTransfer.getData("taskId"));
    const currentStatus = e.dataTransfer.getData("currentStatus");
    const task = localTasks.find((t) => t.TaskID === taskId);

    setDraggedTask(null);
    setDropTargetStatus(null);

    if (!task) return;
    if (!checkAdminPermission({ AdminPermission: task.AdminPermission }) && !isOwnTask(task)) {
      toast({
        title: "Permessi insufficienti",
        description: "Non hai il permesso di modificare questo task",
        position: "bottom-right",
        variant: "danger",
      });
      return;
    }

    if (task.Status === newStatus) return;

    try {
      isUpdatingRef.current = true;
      setUpdatingTasks((prev) => ({ ...prev, [task.TaskID]: true }));

      setLocalTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.TaskID === task.TaskID ? { ...t, Status: newStatus } : t,
        ),
      );

      const participants = task.Participants
        ? typeof task.Participants === "string"
          ? JSON.parse(task.Participants)
          : task.Participants
        : [];

      const additionalAssignees = JSON.stringify(
        Array.isArray(participants)
          ? participants
              .map((p) => (typeof p === "object" ? p.userId : p))
              .filter((id) => id !== task.AssignedTo)
          : [],
      );

      const updatedTaskData = {
        ...task,
        Status: newStatus,
        AssignedTo: task.AssignedTo,
        AdditionalAssignees: additionalAssignees,
        ProjectID: task.ProjectID,
        TaskID: task.TaskID,
      };

      const result = await onTaskUpdate(updatedTaskData);

      if (result && result.success) {
        toast({
          title: "Task aggiornato",
          description: `Stato cambiato in "${statusConfig[newStatus].label}"`,
          position: "bottom-right",
          variant: "success",
        });
      } else {
        setLocalTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.TaskID === task.TaskID ? { ...t, Status: currentStatus } : t,
          ),
        );

        toast({
          title: "Errore",
          description: "Non è stato possibile aggiornare lo stato del task",
          variant: "danger",
          position: "bottom-right",
        });
      }
    } catch (error) {
      console.error("Error updating task status:", error);
      setLocalTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.TaskID === task.TaskID ? { ...t, Status: currentStatus } : t,
        ),
      );

      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiornamento",
        variant: "danger",
        position: "bottom-right",
      });
    } finally {
      setUpdatingTasks((prev) => ({ ...prev, [task.TaskID]: false }));
      isUpdatingRef.current = false;
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ height: 'calc(100vh - 110px - 60px - 48px - 40px - 40px)' }}>
      {/* Kanban Board */}
      <div className="flex-1 px-4 pb-4 overflow-hidden">
        <div className="h-full flex gap-3 overflow-x-auto pb-2">
          {Object.entries(tasksByStatus).map(([status, statusTasks], index) => {
            const config = statusConfig[status];
            const StatusIcon = config.icon;
            const delayedInSection = statusTasks.filter(isTaskDelayed).length;
            const isDropTarget = dropTargetStatus === status;

            return (
              <motion.div
                key={status}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex-1 min-w-[280px] flex flex-col"
              >
                <div
                  className={`
                    h-full bg-white rounded-xl border-2 transition-all duration-300
                    ${isDropTarget 
                      ? `${config.borderColor} ${config.bgColor} shadow-2xl scale-[1.02]` 
                      : "border-gray-200 hover:border-gray-300 hover:shadow-lg"
                    }
                    overflow-hidden flex flex-col
                  `}
                  onDragOver={(e) => handleDragOver(e, status)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  {/* Header */}
                  <div className={`bg-gradient-to-r ${config.gradient} p-3`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`${config.iconBg} p-1.5 rounded-lg`}>
                          <StatusIcon className={`w-4 h-4 text-white ${config.iconAnimation || ""}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white text-base">{config.label}</h3>
                          <p className="text-white/80 text-xs">{statusTasks.length} attività</p>
                        </div>
                      </div>
                      {delayedInSection > 0 && status !== "COMPLETATA" && (
                        <Badge className="bg-red-500 text-white border-0 text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {delayedInSection}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Tasks container */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    <AnimatePresence>
                      {statusTasks.length > 0 ? (
                        statusTasks.map((task) => {
                          const canDrag = checkAdminPermission({ AdminPermission: task.AdminPermission }) || isOwnTask(task);
                          const isTaskUpdating = updatingTasks[task.TaskID] || false;

                          return (
                            <TaskCard
                              key={task.TaskID}
                              task={task}
                              onClick={onTaskClick}
                              onDragStart={handleDragStart}
                              isDragging={draggedTask?.TaskID === task.TaskID}
                              isUpdating={isTaskUpdating}
                              canDrag={canDrag && !isTaskUpdating}
                              onProjectClick={onProjectClick || ((projectId) => navigate(`/progetti/detail/${projectId}`))}
                              currentUserId={user?.userId}
                            />
                          );
                        })
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center py-8"
                        >
                          <div className={`${config.iconBg} w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center`}>
                            <Sparkles className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-gray-500 text-sm">Nessuna attività</p>
                          <p className="text-gray-400 text-xs mt-1">Trascina qui per aggiungere</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MyTasksKanban;