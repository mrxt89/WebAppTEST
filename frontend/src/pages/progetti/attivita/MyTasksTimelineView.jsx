import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Calendar,
  ExternalLink
} from 'lucide-react';

const MyTasksTimelineView = ({ tasks = [], onTaskClick, onTaskUpdate, checkAdminPermission, isOwnTask }) => {
  const [openSection, setOpenSection] = useState(null);
  const navigate = useNavigate();

  // Funzioni per classificare le attività in base al tempo
  const isTaskDelayed = (task) => {
    const dueDate = new Date(task.DueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && task.Status !== 'COMPLETATA';
  };

  const isTaskDueToday = (task) => {
    const dueDate = new Date(task.DueDate);
    const today = new Date();
    
    return dueDate.getDate() === today.getDate() &&
           dueDate.getMonth() === today.getMonth() &&
           dueDate.getFullYear() === today.getFullYear() &&
           task.Status !== 'COMPLETATA';
  };

  const isTaskDueThisWeek = (task) => {
    if (isTaskDueToday(task)) return false; // Exclude tasks due today
    
    const dueDate = new Date(task.DueDate);
    const today = new Date();
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    
    return dueDate > today && dueDate <= endOfWeek && task.Status !== 'COMPLETATA';
  };

  const isTaskDueThisMonth = (task) => {
    if (isTaskDueToday(task) || isTaskDueThisWeek(task)) return false; // Exclude tasks due today or this week
    
    const dueDate = new Date(task.DueDate);
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    return dueDate > today && dueDate <= endOfMonth && task.Status !== 'COMPLETATA';
  };

  const isTaskDueNextMonth = (task) => {
    const dueDate = new Date(task.DueDate);
    const today = new Date();
    const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    
    return dueDate >= startOfNextMonth && dueDate <= endOfNextMonth && task.Status !== 'COMPLETATA';
  };

  const isTaskDueLater = (task) => {
    const dueDate = new Date(task.DueDate);
    const today = new Date();
    const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    
    return dueDate > endOfNextMonth && task.Status !== 'COMPLETATA';
  };

  const isTaskWithoutDueDate = (task) => {
    return !task.DueDate && task.Status !== 'COMPLETATA';
  };

  const isTaskCompleted = (task) => {
    return task.Status === 'COMPLETATA';
  };

  // Organizza i tasks per periodo temporale
  const tasksByTimeline = {
    'overdue': tasks.filter(isTaskDelayed),
    'today': tasks.filter(isTaskDueToday),
    'thisWeek': tasks.filter(isTaskDueThisWeek),
    'thisMonth': tasks.filter(isTaskDueThisMonth),
    'nextMonth': tasks.filter(isTaskDueNextMonth),
    'later': tasks.filter(isTaskDueLater),
    'noDueDate': tasks.filter(isTaskWithoutDueDate),
    'completed': tasks.filter(isTaskCompleted)
  };

  // Configurazione per ogni categoria temporale
  const timelineConfig = {
    'overdue': {
      label: 'Scadute',
      icon: AlertTriangle,
      color: 'bg-red-100 hover:bg-red-200',
      headerColor: 'text-red-700'
    },
    'today': {
      label: 'Oggi',
      icon: Clock,
      color: 'bg-orange-100 hover:bg-orange-200',
      headerColor: 'text-orange-700'
    },
    'thisWeek': {
      label: 'Questa settimana',
      icon: CalendarDays,
      color: 'bg-blue-100 hover:bg-blue-200',
      headerColor: 'text-blue-700'
    },
    'thisMonth': {
      label: 'Questo mese',
      icon: Calendar,
      color: 'bg-indigo-100 hover:bg-indigo-200',
      headerColor: 'text-indigo-700'
    },
    'nextMonth': {
      label: 'Mese prossimo',
      icon: Calendar,
      color: 'bg-purple-100 hover:bg-purple-200',
      headerColor: 'text-purple-700'
    },
    'later': {
      label: 'Più tardi',
      icon: Calendar,
      color: 'bg-gray-100 hover:bg-gray-200',
      headerColor: 'text-gray-700'
    },
    'noDueDate': {
      label: 'Senza data',
      icon: Calendar,
      color: 'bg-gray-100 hover:bg-gray-200',
      headerColor: 'text-gray-700'
    },
    'completed': {
      label: 'Completate',
      icon: Calendar,
      color: 'bg-green-100 hover:bg-green-200',
      headerColor: 'text-green-700'
    }
  };

  // Implementazione locale della card dei task
  const TaskCard = ({ task }) => {
    const priorityColors = {
      'ALTA': 'text-red-500 border-red-200 bg-red-50',
      'MEDIA': 'text-yellow-500 border-yellow-200 bg-yellow-50',
      'BASSA': 'text-green-500 border-green-200 bg-green-50'
    };

    const navigateToProject = (e) => {
      e.stopPropagation();
      navigate(`/progetti/detail/${task.ProjectID}`);
    };

    return (
      <Card 
        className="p-3 sm:p-4 mb-2 cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 hover:scale-[1.01]"
        style={{ borderLeftColor: task.Priority === 'ALTA' ? '#ef4444' : task.Priority === 'MEDIA' ? '#eab308' : '#22c55e' }}
        onClick={() => onTaskClick(task)}
      >
        {/* Header con titolo, badge ritardo e priorità */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-0 sm:justify-between mb-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-sm sm:text-base">{task.Title}</h4>
            {isTaskDelayed(task) && (
              <Badge variant="" className="flex items-center gap-1 bg-red-100 text-red-500 border-red-200 text-xs">
                <AlertTriangle className="w-3 h-3" />
                <span className="hidden sm:inline">In ritardo</span>
                <span className="sm:hidden">Ritardo</span>
              </Badge>
            )}
          </div>
          <Badge className={`${priorityColors[task.Priority]} text-xs sm:text-sm whitespace-nowrap`}>
            {task.Priority}
          </Badge>
        </div>

        {/* Descrizione */}
        <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{task.Description}</p>

        {/* Progetto */}
        <div className="mb-2">
          <div 
            className="inline-flex items-center gap-1 text-blue-600 hover:underline cursor-pointer text-sm"
            onClick={navigateToProject}
          >
            <span>{task.ProjectName}</span>
            <ExternalLink className="h-3 w-3" />
          </div>
        </div>

        {/* Footer con date */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            {task.CommentsCount > 0 && (
              <span className="text-gray-500 flex items-center gap-1">
                <span className="text-xs">💬 {task.CommentsCount}</span>
              </span>
            )}
            <div className="flex items-center gap-1 min-w-0">
              <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 text-gray-400" />
              <span className="text-gray-500">
                {new Date(task.StartDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <Clock className={`w-3 h-3 sm:w-4 sm:h-4 shrink-0 ${isTaskDelayed(task) ? 'text-red-400' : 'text-gray-400'}`} />
              <span className={`${isTaskDelayed(task) ? 'text-red-400 font-medium' : 'text-gray-500'}`}>
                {task.DueDate ? new Date(task.DueDate).toLocaleDateString() : 'Nessuna scadenza'}
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  // Imposta lo stato iniziale dell'accordion
  useEffect(() => {
    // Apri la prima sezione che ha task
    for (const [timeline, timelineTasks] of Object.entries(tasksByTimeline)) {
      if (timelineTasks.length > 0) {
        setOpenSection(timeline);
        break;
      }
    }
  }, []);

  return (
    <div className="space-y-2 sm:space-y-4 mx-auto max-w-5xl px-2 sm:px-4">
      {/* Timeline View */}
      <Accordion 
        type="single" 
        collapsible 
        className="space-y-2 sm:space-y-4"
        value={openSection}
        onValueChange={setOpenSection}
      >
        {Object.entries(tasksByTimeline).map(([timeline, timelineTasks]) => {
          const TimelineIcon = timelineConfig[timeline]?.icon || AlertTriangle;
          
          return (
            <AccordionItem 
              value={timeline} 
              key={timeline}
              className={`rounded-lg border-none shadow-sm ${timelineConfig[timeline].color} transition-all duration-200`}
            >
              <AccordionTrigger className="flex items-center justify-between px-4 py-3 hover:no-underline [&[data-state=open]>div]:text-opacity-100 [&[data-state=closed]>div]:text-opacity-75">
                <div className={`flex items-center gap-3 w-full ${timelineConfig[timeline].headerColor}`}>
                  <div className="flex items-center gap-2 w-full">
                      <TimelineIcon className="w-5 h-5" />
                      <span className="font-medium">{timelineConfig[timeline].label}</span>
                      <Badge 
                        variant="outline" 
                        className={`${timelineConfig[timeline].headerColor} border-current`}
                      >
                        {timelineTasks.length}
                      </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2 sm:space-y-4 mx-auto">
                  {timelineTasks.length > 0 ? (
                    timelineTasks.map(task => (
                      <div
                        key={task.TaskID}
                        draggable={checkAdminPermission({ AdminPermission: task.AdminPermission }) || isOwnTask(task)}
                        className={!checkAdminPermission({ AdminPermission: task.AdminPermission }) && !isOwnTask(task) ? 'cursor-default' : 'cursor-move'}
                      >
                        <TaskCard task={task} />
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-6 bg-white/50 rounded-lg">
                      Nessuna attività presente
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default MyTasksTimelineView;