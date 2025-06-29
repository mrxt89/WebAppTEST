import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquare,
  Paperclip,
  Users,
  ListTodo,
  Loader2,
  AlertCircle,
  Play,
  Lock,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import useProjectActions from "../../../hooks/useProjectManagementActions";
import useProjectStages from "../../../hooks/useProjectStages";
import { motion, AnimatePresence } from "framer-motion";

// Componente per una task card
const TaskCard = ({ task, onClick, onDragStart, isDragging, isUpdating }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "ALTA":
        return "border-red-200 bg-red-50";
      case "MEDIA":
        return "border-yellow-200 bg-yellow-50";
      case "BASSA":
        return "border-green-200 bg-green-50";
      default:
        return "border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "COMPLETATA":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "IN ESECUZIONE":
        return <Play className="h-4 w-4 text-blue-600 animate-pulse" />;
      case "BLOCCATA":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "SOSPESA":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <ListTodo className="h-4 w-4 text-gray-600" />;
    }
  };

  const isDelayed = () => {
    if (task.Status === "COMPLETATA" || task.TaskDisabled) return false;
    const dueDate = new Date(task.DueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: task.TaskDisabled ? 1 : 1.02 }}
      whileDrag={{ scale: 1.05, rotate: 2 }}
    >
      <Card
        className={`
          p-3 cursor-pointer transition-all duration-200
          ${isDragging ? "opacity-40" : "hover:shadow-md"} 
          ${isUpdating ? "animate-pulse" : ""} 
          ${task.TaskDisabled ? "opacity-50" : ""}
          ${getPriorityColor(task.Priority)}
        `}
        onClick={() => onClick(task)}
        draggable={!task.TaskDisabled && !isUpdating}
        onDragStart={(e) => {
          if (!task.TaskDisabled) {
            onDragStart(e, task);
            e.stopPropagation();
          }
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className={`font-medium text-sm line-clamp-2 ${task.TaskDisabled ? 'line-through' : ''}`}>
              {task.Title}
            </h4>
            
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {getStatusIcon(task.Status)}
                <span className="ml-1">{task.Status}</span>
              </Badge>
              
              {task.AssignedToName && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Users className="h-3 w-3" />
                  <span className="truncate max-w-[100px]">{task.AssignedToName}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <div className={`flex items-center gap-1 ${isDelayed() ? "text-red-600 font-medium" : ""}`}>
                <Clock className="h-3 w-3" />
                <span>{new Date(task.DueDate).toLocaleDateString()}</span>
              </div>
              
              {(task.CommentsCount > 0 || task.AttachmentsCount > 0) && (
                <>
                  {task.CommentsCount > 0 && (
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{task.CommentsCount}</span>
                    </div>
                  )}
                  {task.AttachmentsCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      <span>{task.AttachmentsCount}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {isDelayed() && (
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          )}
        </div>

        {isUpdating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-md"
          >
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
};

// Componente per una colonna di stato
const StatusColumn = ({
  status,
  tasks,
  onTaskClick,
  onDragStart,
  onDragOver,
  onDrop,
  draggedTask,
  updatingTasks,
  isDropTarget,
}) => {
  const statusConfig = {
    "DA FARE": {
      label: "Da Fare",
      icon: ListTodo,
      gradient: "from-gray-600 to-gray-700",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-300",
    },
    "IN ESECUZIONE": {
      label: "In Corso",
      icon: Loader2,
      gradient: "from-blue-600 to-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-300",
      iconAnimation: "animate-spin",
    },
    "SOSPESA": {
      label: "Sospese",
      icon: AlertCircle,
      gradient: "from-amber-600 to-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-300",
    },
    "COMPLETATA": {
      label: "Completate",
      icon: CheckCircle2,
      gradient: "from-emerald-600 to-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-300",
    },
    "BLOCCATA": {
      label: "Bloccate",
      icon: AlertTriangle,
      gradient: "from-red-600 to-red-700",
      bgColor: "bg-red-50",
      borderColor: "border-red-300",
    },
  };

  const config = statusConfig[status] || statusConfig["DA FARE"];
  const StatusIcon = config.icon;

  return (
    <div
      className={`
        min-w-[280px] bg-white rounded-lg border-2 transition-all duration-300
        ${isDropTarget ? `${config.borderColor} ${config.bgColor} shadow-lg scale-[1.02]` : "border-gray-200"}
      `}
      onDragOver={(e) => onDragOver(e, status)}
      onDrop={(e) => onDrop(e, status)}
    >
      <div className={`bg-gradient-to-r ${config.gradient} p-3 rounded-t-md`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-4 h-4 text-white ${config.iconAnimation || ""}`} />
            <h3 className="font-semibold text-white">{config.label}</h3>
          </div>
          <Badge className="bg-white/20 text-white border-0">
            {tasks.length}
          </Badge>
        </div>
      </div>

      <div className="p-3 space-y-2 min-h-[200px]">
        <AnimatePresence>
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <TaskCard
                key={task.TaskID}
                task={task}
                onClick={onTaskClick}
                onDragStart={onDragStart}
                isDragging={draggedTask?.TaskID === task.TaskID}
                isUpdating={updatingTasks[task.TaskID] || false}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-gray-400"
            >
              <StatusIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Nessuna attività</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Componente principale
const ProjectStagesKanban = ({
  project,
  stages,
  unassignedTasks,
  onTaskUpdate,
  onTaskClick,
  onTaskDisable,
  refreshProject,
}) => {
  const [expandedStages, setExpandedStages] = useState({});
  const [draggedTask, setDraggedTask] = useState(null);
  const [dropTargetStatus, setDropTargetStatus] = useState(null);
  const [dropTargetStage, setDropTargetStage] = useState(null);
  const [updatingTasks, setUpdatingTasks] = useState({});
  const { checkAdminPermission, isOwnTask } = useProjectActions();
  const { assignTaskToStage } = useProjectStages();

  // Stati task disponibili
  const TASK_STATES = ["DA FARE", "IN ESECUZIONE", "SOSPESA", "COMPLETATA", "BLOCCATA"];

  useEffect(() => {
    // Espandi tutte le fasi di default
    const expanded = {};
    stages.forEach(stage => {
      expanded[stage.StageID] = true;
    });
    setExpandedStages(expanded);
  }, [stages]);

  const toggleStage = (stageId) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }));
  };

  const handleDragStart = (e, task) => {
    if (!checkAdminPermission(project) && !isOwnTask(task)) {
      e.preventDefault();
      return;
    }

    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, status, stageId = null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetStatus(status);
    setDropTargetStage(stageId);
  };

  const handleDrop = async (e, newStatus, stageId = null) => {
    e.preventDefault();
    
    if (!draggedTask) return;

    const taskId = draggedTask.TaskID;
    setDraggedTask(null);
    setDropTargetStatus(null);
    setDropTargetStage(null);

    try {
      setUpdatingTasks(prev => ({ ...prev, [taskId]: true }));

      // Se stiamo spostando tra fasi diverse
      if (stageId !== draggedTask.StageID) {
        await assignTaskToStage(taskId, stageId);
      }

      // Aggiorna lo stato del task
      if (newStatus !== draggedTask.Status) {
        const updatedTask = {
          ...draggedTask,
          Status: newStatus,
          StageID: stageId,
        };

        const result = await onTaskUpdate(updatedTask, false);
        
        if (!result?.success) {
          throw new Error("Errore nell'aggiornamento del task");
        }
      }

      await refreshProject();
      
      toast({
        title: "✨ Attività aggiornata",
        description: stageId !== draggedTask.StageID 
          ? "L'attività è stata spostata nella nuova fase"
          : `Stato cambiato in "${newStatus}"`,
      });
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Errore",
        description: "Non è stato possibile aggiornare l'attività",
        variant: "destructive",
      });
    } finally {
      setUpdatingTasks(prev => ({ ...prev, [taskId]: false }));
    }
  };

  // Raggruppa task per stato all'interno di ogni fase
  const getTasksByStageAndStatus = (stage) => {
    const tasksByStatus = {};
    TASK_STATES.forEach(status => {
      tasksByStatus[status] = (stage.Tasks || []).filter(task => task.Status === status);
    });
    return tasksByStatus;
  };

  // Raggruppa task non assegnati per stato
  const getUnassignedTasksByStatus = () => {
    const tasksByStatus = {};
    TASK_STATES.forEach(status => {
      tasksByStatus[status] = unassignedTasks.filter(task => task.Status === status);
    });
    return tasksByStatus;
  };

  return (
    <div className="h-full flex flex-col p-4" style={{ height: 'calc(100vh - 110px - 60px - 48px - 40px - 40px)' }}>
      <ScrollArea className="flex-1">
        <div className="space-y-6 pb-4">
          {/* Sezione task non assegnati */}
          {unassignedTasks.length > 0 && (
            <div className="bg-orange-50 rounded-lg border-2 border-orange-200 p-4">
              <Collapsible
                open={expandedStages['unassigned'] !== false}
                onOpenChange={() => toggleStage('unassigned')}
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-orange-100 -m-2 p-2 rounded transition-colors">
                  {expandedStages['unassigned'] !== false ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-semibold flex-1 text-left">
                    Attività da assegnare
                  </h3>
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                    {unassignedTasks.length} attività
                  </Badge>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="mt-4">
                    <ScrollArea orientation="horizontal" className="pb-4">
                      <div className="flex gap-4">
                        {TASK_STATES.map(status => {
                          const tasks = getUnassignedTasksByStatus()[status];
                          return (
                            <StatusColumn
                              key={status}
                              status={status}
                              tasks={tasks}
                              onTaskClick={onTaskClick}
                              onDragStart={handleDragStart}
                              onDragOver={(e) => handleDragOver(e, status, null)}
                              onDrop={(e) => handleDrop(e, status, null)}
                              draggedTask={draggedTask}
                              updatingTasks={updatingTasks}
                              isDropTarget={dropTargetStatus === status && dropTargetStage === null}
                            />
                          );
                        })}
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Fasi del progetto */}
          {stages.map((stage, index) => (
            <div
              key={stage.StageID}
              className={`
                bg-white rounded-lg border-2 p-4 transition-all
                ${stage.GateStatus === "APPROVED" ? "border-green-200 bg-green-50/30" : "border-gray-200"}
              `}
            >
              <Collapsible
                open={expandedStages[stage.StageID]}
                onOpenChange={() => toggleStage(stage.StageID)}
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-gray-50 -m-2 p-2 rounded transition-colors">
                  {expandedStages[stage.StageID] ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: stage.HexColor }}
                  />
                  <Layers className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold flex-1 text-left">
                    {stage.StageName}
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    {stage.IsGateRequired && stage.GateStatus === "APPROVED" && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <Lock className="h-3 w-3 mr-1" />
                        Approvata
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {stage.CompletedTasks || 0}/{stage.TotalTasks || 0} completate
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="mt-4">
                    {stage.StageDescription && (
                      <p className="text-sm text-gray-600 mb-4">{stage.StageDescription}</p>
                    )}
                    
                    <ScrollArea orientation="horizontal" className="pb-4">
                      <div className="flex gap-4">
                        {TASK_STATES.map(status => {
                          const tasks = getTasksByStageAndStatus(stage)[status];
                          return (
                            <StatusColumn
                              key={status}
                              status={status}
                              tasks={tasks}
                              onTaskClick={onTaskClick}
                              onDragStart={handleDragStart}
                              onDragOver={(e) => handleDragOver(e, status, stage.StageID)}
                              onDrop={(e) => handleDrop(e, status, stage.StageID)}
                              draggedTask={draggedTask}
                              updatingTasks={updatingTasks}
                              isDropTarget={dropTargetStatus === status && dropTargetStage === stage.StageID}
                            />
                          );
                        })}
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ProjectStagesKanban;