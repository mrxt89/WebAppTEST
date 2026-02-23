import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  User,
  MoreVertical,
  Sparkles,
  Ban,
  Eye,
} from "lucide-react";
import { FileSymlink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getPhaseProgressUrl } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import useProjectActions from "../../../hooks/useProjectManagementActions";
import { motion, AnimatePresence } from "framer-motion";

const TaskCard = ({
  task,
  project,
  onClick,
  onDragStart,
  onTaskDisable,
  isDragging,
  isUpdating,
  canDrag,
  canManage,
  currentUserId,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const mouseEnterTimeRef = useRef(null);
  const lastMousePositionRef = useRef({ x: 0, y: 0 });
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
    if (task.TaskDisabled) return false;
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

  const priority = priorityConfig[task.Priority] || priorityConfig.BASSA;

  const openExternalLink = (e) => {
    e.stopPropagation();
    const prj = task.ProjectErpID || project?.ProjectErpID || "";
    const stp = task.TaskSequence != null ? task.TaskSequence : "";
    const ute = user?.ERPUserId ?? 0;
    const ope = task.Operation || "";
    const companyId = user?.CompanyId || 1;
    const url = getPhaseProgressUrl(companyId, prj, stp, ute, ope);
    window.open(url, "_blank", "noopener");
  };

  // Funzioni per gestire il delay di hover
  const handleMouseEnter = (e) => {
    // Non attivare hover se la card è in drag o in aggiornamento
    if (isDragging || isUpdating || task.TaskDisabled) {
      return;
    }
    
    // Registra il tempo di entrata e la posizione del mouse
    mouseEnterTimeRef.current = Date.now();
    lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
    
    // Cancella eventuali timeout precedenti
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Imposta un delay di 200ms prima di attivare l'hover
    hoverTimeoutRef.current = setTimeout(() => {
      // Verifica nuovamente che non sia in drag/update prima di attivare
      if (!isDragging && !isUpdating && !task.TaskDisabled) {
        setIsHovered(true);
      }
    }, 200);
  };

  const handleMouseMove = (e) => {
    // Se il mouse si muove troppo velocemente, cancella l'hover
    if (mouseEnterTimeRef.current && lastMousePositionRef.current) {
      const timeDiff = Date.now() - mouseEnterTimeRef.current;
      const distance = Math.sqrt(
        Math.pow(e.clientX - lastMousePositionRef.current.x, 2) + 
        Math.pow(e.clientY - lastMousePositionRef.current.y, 2)
      );
      
      // Se il mouse si muove più di 50px in meno di 100ms, cancella l'hover
      if (timeDiff < 100 && distance > 50) {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        setIsHovered(false);
      }
    }
    
    // Aggiorna la posizione del mouse
    lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseLeave = () => {
    // Cancella il timeout se il mouse esce prima del delay
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    // Reset dei ref
    mouseEnterTimeRef.current = null;
    lastMousePositionRef.current = { x: 0, y: 0 };
    
    // Disattiva immediatamente l'hover
    setIsHovered(false);
  };

  // Cleanup del timeout quando il componente viene smontato
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Disattiva hover quando inizia il drag o l'aggiornamento
  useEffect(() => {
    if (isDragging || isUpdating) {
      setIsHovered(false);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    }
  }, [isDragging, isUpdating]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ 
        scale: task.TaskDisabled ? 1 : 1.02,
        y: task.TaskDisabled ? 0 : -2,
        transition: { duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }
      }}
      whileDrag={{ scale: 1.05, rotate: 2 }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      transition={{ 
        layout: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] },
        default: { duration: 0.2, ease: "easeOut" }
      }}
    >
      <Card
        className={`
          relative overflow-hidden transition-all duration-300
          ${isDragging ? "opacity-40" : "hover:shadow-lg"} 
          ${isUpdating ? "animate-pulse" : ""} 
          ${canDrag && !task.TaskDisabled ? "cursor-move" : "cursor-pointer"}
          ${task.TaskDisabled ? "bg-gray-50 opacity-60" : "bg-white"}
          border-gray-200
          ${isHovered && !task.TaskDisabled ? "z-10" : "z-0"}
        `}
        onClick={(e) => {
          if (!isDragging && !isUpdating) onClick(task);
          e.stopPropagation();
        }}
        draggable={canDrag && !isUpdating && !task.TaskDisabled}
        onDragStart={(e) => {
          if (!task.TaskDisabled) {
            onDragStart(e, task);
            e.stopPropagation();
          }
        }}
      >
        {/* Priority gradient bar - sempre visibile ma sottile */}
        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${priority.color} ${task.TaskDisabled ? 'opacity-30' : ''}`} />
        
        {/* Badge disabilitata */}
        {task.TaskDisabled && (
          <div className="absolute top-2 right-2 z-10">
            <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
              <Ban className="w-3 h-3 mr-1" />
              Disabilitata
            </Badge>
          </div>
        )}
        
        {/* Menu azioni */}
        {canManage && onTaskDisable && (
          <div className="absolute bottom-2 right-2 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick(task);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Visualizza
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskDisable(task);
                  }}
                  className={task.TaskDisabled ? "text-green-600" : "text-red-600"}
                >
                  {task.TaskDisabled ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Riabilita
                    </>
                  ) : (
                    <>
                      <Ban className="mr-2 h-4 w-4" />
                      Disabilita
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        
        {/* Contenuto compatto di default */}
        <div className={`group transition-all duration-200 ${isHovered ? 'p-3' : 'p-2.5'}`}>
          {/* Versione compatta - sempre visibile */}
          <div className="space-y-1.5">
            {/* Titolo con indicatore ritardo */}
            <div className="flex items-start justify-between gap-2">
              <h4 className={`font-medium text-gray-900 text-sm leading-tight line-clamp-2 flex-1 ${task.TaskDisabled ? 'line-through' : ''}`}>
                {task.Title}
              </h4>
              {isDelayed() && (
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 500, 
                    damping: 25,
                    delay: 0.1
                  }}
                  className="flex-shrink-0"
                >
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </motion.div>
              )}
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
                    <AvatarFallback className={`text-[10px] ${task.TaskDisabled ? 'bg-gray-400' : 'bg-gradient-to-br from-blue-500 to-purple-600'} text-white`}>
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
            {isHovered && !task.TaskDisabled && (
              <motion.div
                initial={{ 
                  opacity: 0, 
                  height: 0
                }}
                animate={{ 
                  opacity: 1, 
                  height: "auto"
                }}
                exit={{ 
                  opacity: 0, 
                  height: 0
                }}
                transition={{ 
                  duration: 0.25,
                  ease: [0.4, 0.0, 0.2, 1]
                }}
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
                  
                  {/* Info disabilitazione */}
                  {task.TaskDisabled && task.DisabledByName && (
                    <div className="text-xs text-red-600 pt-1 border-t">
                      Disabilitata da {task.DisabledByName}
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

const TasksKanban = ({
  project,
  tasks = [],
  onTaskClick,
  onTaskUpdate,
  onTaskDisable,
  projectId,
  refreshProject,
}) => {
  const { user } = useAuth();
  const [localTasks, setLocalTasks] = useState(tasks);
  const [showDelayedOnly, setShowDelayedOnly] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dropTargetStatus, setDropTargetStatus] = useState(null);
  const [updatingTasks, setUpdatingTasks] = useState({});
  const { checkAdminPermission, isOwnTask } = useProjectActions();
  const dropTimeoutRef = useRef(null);
  const isUpdatingRef = useRef(false);

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

  const delayedTasksCount = tasks.filter((task) => {
    if (task.TaskDisabled) return false;
    const dueDate = new Date(task.DueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && task.Status !== "COMPLETATA";
  }).length;

  const isTaskDelayed = (task) => {
    if (task.TaskDisabled) return false;
    const dueDate = new Date(task.DueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && task.Status !== "COMPLETATA";
  };

  const tasksByStatus = {
    [TASK_STATES["DA FARE"]]: localTasks.filter((task) => {
      const isCorrectStatus = task.Status === "DA FARE";
      if (showDelayedOnly) {
        return isCorrectStatus && isTaskDelayed(task);
      }
      return isCorrectStatus;
    }),
    [TASK_STATES["IN ESECUZIONE"]]: localTasks.filter((task) => {
      const isCorrectStatus = task.Status === "IN ESECUZIONE";
      if (showDelayedOnly) {
        return isCorrectStatus && isTaskDelayed(task);
      }
      return isCorrectStatus;
    }),
    [TASK_STATES["SOSPESA"]]: localTasks.filter((task) => {
      const isCorrectStatus = task.Status === "SOSPESA";
      if (showDelayedOnly) {
        return isCorrectStatus && isTaskDelayed(task);
      }
      return isCorrectStatus;
    }),
    [TASK_STATES["COMPLETATA"]]: localTasks.filter(
      (task) => task.Status === "COMPLETATA",
    ),
    [TASK_STATES["BLOCCATA"]]: localTasks.filter((task) => {
      const isCorrectStatus = task.Status === "BLOCCATA";
      if (showDelayedOnly) {
        return isCorrectStatus && isTaskDelayed(task);
      }
      return isCorrectStatus;
    }),
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
    if (!checkAdminPermission(project) && !isOwnTask(task)) {
      e.preventDefault();
      return;
    }

    if (updatingTasks[task.TaskID] || task.TaskDisabled) {
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

    if (!task || task.TaskDisabled) return;
    
    if (!checkAdminPermission(project) && !isOwnTask(task)) {
      toast({
        title: "Permessi insufficienti",
        description: "Non hai il permesso di modificare questo task",
        variant: "destructive",
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

      const updatedTaskData = {
        ...task,
        Status: newStatus,
        ProjectID: task.ProjectID,
        TaskID: task.TaskID,
      };

      const result = await onTaskUpdate(updatedTaskData, false);

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
        <div className="h-full flex gap-1 overflow-x-auto pb-2">
          {Object.entries(tasksByStatus).map(([status, statusTasks], index) => {
            const config = statusConfig[status];
            const StatusIcon = config.icon;
            const delayedInSection = statusTasks.filter(t => !t.TaskDisabled && isTaskDelayed(t)).length;
            const disabledInSection = statusTasks.filter(t => t.TaskDisabled).length;
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
                    h-full bg-white/80 backdrop-blur-sm rounded-2xl border transition-all duration-300
                    ${isDropTarget 
                      ? `${config.borderColor} ${config.bgColor} shadow-2xl scale-[1.02] border-2` 
                      : "border-gray-200/60 hover:border-gray-300/80 hover:shadow-xl hover:bg-white/90"
                    }
                    overflow-hidden flex flex-col relative
                    before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/40 before:to-transparent before:pointer-events-none
                    shadow-gray-200/50
                  `}
                  onDragOver={(e) => handleDragOver(e, status)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  {/* Header moderno con glassmorphism */}
                  <div className={`bg-gradient-to-r ${config.gradient} p-2 relative overflow-hidden`}>
                    {/* Effetto glassmorphism */}
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
                    
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                          <StatusIcon className={`w-5 h-5 text-white ${config.iconAnimation || ""}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg tracking-tight">{config.label}</h3>
                          <p className="text-white/90 text-sm font-medium">{statusTasks.length} attività</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {disabledInSection > 0 && (
                          <Badge className="bg-gray-600/90 text-white border-0 text-xs px-2 py-1 rounded-full shadow-lg backdrop-blur-sm">
                            <Ban className="w-3 h-3 mr-1" />
                            {disabledInSection}
                          </Badge>
                        )}
                        {delayedInSection > 0 && status !== "COMPLETATA" && (
                          <Badge className="bg-red-500/90 text-white border-0 text-xs px-2 py-1 rounded-full shadow-lg backdrop-blur-sm">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {delayedInSection}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tasks container moderno */}
                  <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 bg-gradient-to-b from-transparent to-gray-50/30">
                    <AnimatePresence>
                      {statusTasks.length > 0 ? (
                        statusTasks.map((task) => {
                          const canDrag = (checkAdminPermission(project) || isOwnTask(task)) && !task.TaskDisabled;
                          const canManage = checkAdminPermission(project) || isOwnTask(task);
                          const isTaskUpdating = updatingTasks[task.TaskID] || false;

                          return (
                            <TaskCard
                              key={task.TaskID}
                              task={task}
                              project={project}
                              onClick={onTaskClick}
                              onDragStart={handleDragStart}
                              onTaskDisable={onTaskDisable}
                              isDragging={draggedTask?.TaskID === task.TaskID}
                              isUpdating={isTaskUpdating}
                              canDrag={canDrag && !isTaskUpdating}
                              canManage={canManage}
                              currentUserId={user?.userId}
                            />
                          );
                        })
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-center py-12"
                        >
                          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 shadow-lg">
                            <Sparkles className="w-8 h-8 text-gray-500" />
                          </div>
                          <p className="text-gray-600 text-sm font-medium mb-1">Nessuna attività</p>
                          <p className="text-gray-400 text-xs">Trascina qui per aggiungere</p>
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

export default TasksKanban;