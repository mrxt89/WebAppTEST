import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ListTodo,
  AlertTriangle,
  Calendar,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/components/ui/use-toast";

// TaskCard component con miglioramenti
const TaskCard = ({ task, onClick, onDragStart, isDragging, canDrag }) => {
  const navigate = useNavigate();
  
  const priorityColors = {
    'ALTA': 'text-red-500 border-red-200 bg-red-50',
    'MEDIA': 'text-yellow-500 border-yellow-200 bg-yellow-50',
    'BASSA': 'text-green-500 border-green-200 bg-green-50'
  };

  // Check if task is delayed
  const isDelayed = () => {
    const dueDate = new Date(task.DueDate);
    const today = new Date();
    return dueDate < today && task.Status !== 'COMPLETATA';
  };

  const navigateToProject = (e) => {
    e.stopPropagation();
    navigate(`/progetti/detail/${task.ProjectID}`);
  };

  return (
    <Card 
      className={`p-2 mb-2 transition-all duration-300 border-l-4 hover:scale-[1.01] ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'} ${canDrag ? 'cursor-move' : 'cursor-pointer'} group-hover:shadow-md`}
      style={{ borderLeftColor: task.Priority === 'ALTA' ? '#ef4444' : task.Priority === 'MEDIA' ? '#eab308' : '#22c55e' }}
      onClick={(e) => {
        // Solo se non stiamo trascinando
        if (!isDragging) onClick(task);
        e.stopPropagation();
      }}
      draggable={canDrag}
      onDragStart={(e) => {
        onDragStart(e, task);
        e.stopPropagation();
      }}
    >
      {/* Header con titolo, badge ritardo e priorità */}
      <div className="flex justify-between items-start gap-1 mb-1">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm expandable-text">{task.Title}</h4>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isDelayed() && (
            <Badge variant="" className="flex items-center gap-1 bg-red-100 text-red-500 border-red-200 text-xs h-5 px-1">
              <AlertTriangle className="w-3 h-3" />
            </Badge>
          )}
          <Badge className={`${priorityColors[task.Priority]} text-xs h-5 px-1`}>
            {task.Priority}
          </Badge>
        </div>
      </div>

      {/* Progetto */}
      <div
        className="mb-1 inline-flex items-center gap-1 text-blue-600 hover:underline cursor-pointer text-xs expandable-text"
        onClick={navigateToProject}
      >
        <span>{task.ProjectName}</span>
        <ExternalLink className="h-3 w-3" />
      </div>

      {/* Footer: commenti e date */}
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex justify-between items-center">
          {task.CommentsCount > 0 && (
            <span className="text-gray-500 flex items-center gap-1">
              <span className="text-xs">💬 {task.CommentsCount}</span>
            </span>
          )}
        </div>
        
        {/* Riga date */}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3 h-3 shrink-0" />
          <span className={`text-xs expandable-text ${isDelayed() ? 'text-red-400 font-medium' : ''}`}>
            {new Date(task.StartDate).toLocaleDateString()} → {new Date(task.DueDate).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Card>
  );
};

const MyTasksKanban = ({ tasks = [], onTaskClick, onTaskUpdate, checkAdminPermission, isOwnTask }) => {
  const [localTasks, setLocalTasks] = useState(tasks);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dropTargetStatus, setDropTargetStatus] = useState(null);
  const dropTimeoutRef = useRef(null);
  const isUpdatingRef = useRef(false);
  
  const TASK_STATES = {
    'DA FARE': 'DA FARE',
    'IN ESECUZIONE': 'IN ESECUZIONE',
    'SOSPESA': 'SOSPESA',
    'COMPLETATA': 'COMPLETATA',
    'BLOCCATA': 'BLOCCATA'
  };

  // Aggiorna i task locali quando cambiano quelli in props
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Cleanup del timeout al dismontaggio del componente
  useEffect(() => {
    return () => {
      if (dropTimeoutRef.current) {
        clearTimeout(dropTimeoutRef.current);
      }
    };
  }, []);

  // Calcola il numero di task in ritardo
  const isTaskDelayed = (task) => {
    const dueDate = new Date(task.DueDate);
    const today = new Date();
    return dueDate < today && task.Status !== 'COMPLETATA';
  };

  // Organizza i tasks per stato
  const tasksByStatus = {
    [TASK_STATES['DA FARE']]: tasks.filter(task => task.Status === 'DA FARE'),
    [TASK_STATES['IN ESECUZIONE']]: tasks.filter(task => task.Status === 'IN ESECUZIONE'),
    [TASK_STATES['SOSPESA']]: tasks.filter(task => task.Status === 'SOSPESA'),
    [TASK_STATES['COMPLETATA']]: tasks.filter(task => task.Status === 'COMPLETATA'),
    [TASK_STATES['BLOCCATA']]: tasks.filter(task => task.Status === 'BLOCCATA')
  };

  // Configurazione per lo stile delle diverse sezioni
  const statusConfig = {
    [TASK_STATES['DA FARE']]: {
      label: 'Da Fare',
      icon: ListTodo,
      color: 'bg-gray-100',
      hoverColor: 'bg-gray-200',
      activeColor: 'bg-gray-300 border-gray-400',
      headerColor: 'text-gray-700'
    },
    [TASK_STATES['IN ESECUZIONE']]: {
      label: 'In Corso',
      icon: Loader2,
      color: 'bg-blue-100',
      hoverColor: 'bg-blue-200',
      activeColor: 'bg-blue-300 border-blue-400',
      headerColor: 'text-blue-700'
    },
    [TASK_STATES['SOSPESA']]: {
      label: 'Sospese',
      icon: AlertCircle,
      color: 'bg-yellow-100',
      hoverColor: 'bg-yellow-200',
      activeColor: 'bg-yellow-300 border-yellow-400',
      headerColor: 'text-yellow-700'
    },
    [TASK_STATES['COMPLETATA']]: {
      label: 'Completate',
      icon: CheckCircle2,
      color: 'bg-green-100',
      hoverColor: 'bg-green-200',
      activeColor: 'bg-green-300 border-green-400',
      headerColor: 'text-green-700'
    },
    [TASK_STATES['BLOCCATA']]: {
      label: 'Bloccate',
      icon: AlertCircle,
      color: 'bg-red-100',
      hoverColor: 'bg-red-200',
      activeColor: 'bg-red-300 border-red-400',
      headerColor: 'text-red-700'
    }
  };

  const handleDragStart = (e, task) => {
    // Verifica permessi
    if (!checkAdminPermission({ AdminPermission: task.AdminPermission }) && !isOwnTask(task)) {
      e.preventDefault();
      return;
    }
    
    // Imposta l'effetto di trascinamento
    e.dataTransfer.effectAllowed = 'move';
    
    // Memorizza l'ID del task e lo stato attuale
    e.dataTransfer.setData('taskId', task.TaskID);
    e.dataTransfer.setData('currentStatus', task.Status);
    
    // Imposta il task trascinato per effetti visivi
    setDraggedTask(task);
    
    // Imposta un'immagine trasparente per il trascinamento personalizzato
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1px transparent GIF
    e.dataTransfer.setDragImage(img, 0, 0);
    
    // Aggiunge una classe al documento per lo stile durante il trascinamento
    document.body.classList.add('dragging-task');
  };

  const handleDragOver = (e, status) => {
    // Previene il comportamento predefinito e consente il rilascio
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Imposta lo stato di destinazione per evidenziare la colonna
    if (dropTargetStatus !== status) {
      setDropTargetStatus(status);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    
    // Pulisci lo stato di destinazione con un ritardo per evitare sfarfallio
    if (dropTimeoutRef.current) {
      clearTimeout(dropTimeoutRef.current);
    }
    
    dropTimeoutRef.current = setTimeout(() => {
      setDropTargetStatus(null);
    }, 100);
  };

  const handleDragEnd = () => {
    // Pulisci tutti gli stati di trascinamento
    setDraggedTask(null);
    setDropTargetStatus(null);
    document.body.classList.remove('dragging-task');
    
    if (dropTimeoutRef.current) {
      clearTimeout(dropTimeoutRef.current);
      dropTimeoutRef.current = null;
    }
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    
    // Se già stiamo aggiornando un task, blocca
    if (isUpdatingRef.current) return;
    
    // Estrai i dati del task
    const taskId = e.dataTransfer.getData('taskId');
    const currentStatus = e.dataTransfer.getData('currentStatus');
    const task = localTasks.find(t => t.TaskID.toString() === taskId);
    
    // Pulisci gli stati di trascinamento
    setDraggedTask(null);
    setDropTargetStatus(null);
    document.body.classList.remove('dragging-task');
    
    // Verifica se il task esiste e se l'utente ha i permessi
    if (!task) return;
    if (!checkAdminPermission({ AdminPermission: task.AdminPermission }) && !isOwnTask(task)) {
      toast({
        title: "Permessi insufficienti",
        description: "Non hai il permesso di modificare questo task",
        variant: "destructive"
      });
      return;
    }
    
    // Se lo stato non è cambiato, non fare nulla
    if (task.Status === newStatus) return;
    
    try {
      // Imposta il flag di aggiornamento
      isUpdatingRef.current = true;
      
      // Ottimistic UI update: aggiorna localmente per feedback immediato
      setLocalTasks(prevTasks => 
        prevTasks.map(t => t.TaskID === task.TaskID ? {...t, Status: newStatus} : t)
      );
      
      // Preparazione simile a quella di TaskDetailsDialog
      // Estrae i partecipanti e mantiene le assegnazioni aggiuntive
      const participants = task.Participants ? 
        (typeof task.Participants === 'string' ? JSON.parse(task.Participants) : task.Participants) 
        : [];
      
      const additionalAssignees = JSON.stringify(
        Array.isArray(participants) 
          ? participants
              .map(p => typeof p === 'object' ? p.userId : p)
              .filter(id => id !== task.AssignedTo)
          : []
      );
      
      // Prepara i dati del task per l'aggiornamento
      const updatedTaskData = {
        ...task,
        Status: newStatus,
        AssignedTo: task.AssignedTo,
        AdditionalAssignees: additionalAssignees,
        ProjectID: task.ProjectID,
        TaskID: task.TaskID
      };
      
      // Chiama la funzione di aggiornamento reale
      const result = await onTaskUpdate(updatedTaskData);
      
      // Feedback di successo
      if (result && result.success) {
        toast({
          title: "Task aggiornato",
          description: `Stato cambiato in "${newStatus}"`,
          variant: "default"
        });
      } else {
        // Ripristina lo stato precedente in caso di errore
        setLocalTasks(prevTasks => 
          prevTasks.map(t => t.TaskID === task.TaskID ? {...t, Status: currentStatus} : t)
        );
        
        toast({
          title: "Errore",
          description: "Non è stato possibile aggiornare lo stato del task",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      
      // Ripristina lo stato precedente in caso di errore
      setLocalTasks(prevTasks => 
        prevTasks.map(t => t.TaskID === task.TaskID ? {...t, Status: currentStatus} : t)
      );
      
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiornamento",
        variant: "destructive"
      });
    } finally {
      // Ripulisci il flag di aggiornamento
      isUpdatingRef.current = false;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Container per la visualizzazione kanban orizzontale */}
      <div className="kanban-container">
        {Object.entries(tasksByStatus).map(([status, statusTasks]) => {
          const StatusIcon = statusConfig[status]?.icon || ListTodo;
          const delayedInSection = statusTasks.filter(isTaskDelayed).length;
          const isDropTarget = dropTargetStatus === status;
          
          return (
            <div 
              key={status}
              className={`
                kanban-column group
                ${isDropTarget 
                  ? `${statusConfig[status].activeColor} border-2 border-dashed` 
                  : `border ${statusConfig[status].color} shadow-sm`
                }
              `}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
              onDragEnd={handleDragEnd}
            >
              {/* Header della colonna */}
              <div 
                className={`
                  flex items-center justify-between px-3 py-2 border-b
                  ${statusConfig[status].headerColor} 
                  transition-colors duration-300
                `}
              >
                <div className="flex items-center gap-2">
                  <StatusIcon className="w-4 h-4" />
                  <span className="font-medium text-sm expandable-text">{statusConfig[status].label}</span>
                  <Badge 
                    variant="outline" 
                    className={`${statusConfig[status].headerColor} border-current text-xs h-5 px-1.5`}
                  >
                    {statusTasks.length}
                  </Badge>
                </div>
                
                {delayedInSection > 0 && status !== 'COMPLETATA' && (
                  <Badge variant="" className="flex items-center gap-1 bg-red-100 text-red-500 border-red-200 text-xs h-5 px-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    {delayedInSection}
                  </Badge>
                )}
              </div>

              {/* Contenuto della colonna con scrolling */}
              <div className="overflow-y-auto p-2 flex-1 transition-all duration-300 group-hover:p-3">
                {statusTasks.length > 0 ? (
                  <div className="space-y-2">
                    {statusTasks.map(task => {
                      const canDrag = checkAdminPermission({ AdminPermission: task.AdminPermission }) || isOwnTask(task);
                      return (
                        <div
                          key={task.TaskID}
                          className={`transition-all duration-300 ${
                            draggedTask?.TaskID === task.TaskID ? 'opacity-50 scale-95' : 'opacity-100'
                          }`}
                        >
                          <TaskCard
                            task={task}
                            onClick={onTaskClick}
                            onDragStart={handleDragStart}
                            isDragging={draggedTask?.TaskID === task.TaskID}
                            canDrag={canDrag}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-6 bg-white/50 rounded-lg">
                    Nessuna attività
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CSS per kanban orizzontale e effetti di espansione */}
      <style dangerouslySetInnerHTML={{
        __html: `
          body.dragging-task {
            cursor: grabbing !important;
          }
          body.dragging-task * {
            cursor: grabbing !important;
          }
          
          /* Container kanban con display flex per layout orizzontale */
          .kanban-container {
            display: flex;
            height: calc(100vh - 250px);
            width: 100%;
            gap: 8px;
            overflow-x: auto;
            padding-bottom: 8px;
          }
          
          /* Colonne kanban con flex-grow per espansione */
          .kanban-column {
            flex: 1;
            min-width: 260px;
            border-radius: 0.5rem;
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
            transition: flex 0.5s cubic-bezier(0.25, 1, 0.5, 1);
            position: relative;
          }
          
          /* Espansione al passaggio del mouse */
          .kanban-column:hover {
            flex: 1.6;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            z-index: 10;
          }
          
          /* Assicura che gli altri elementi si restringano proporzionalmente */
          .kanban-column:not(:hover) {
            transition: flex 0.5s cubic-bezier(0.25, 1, 0.5, 1);
          }
          
          /* Stile per i testi che si possono espandere */
          .expandable-text {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            transition: all 0.3s ease;
          }
          
          .kanban-column:hover .expandable-text {
            white-space: normal;
            overflow: visible;
          }
          
          /* Animazione per il bordo durante il trascinamento */
          @keyframes pulse-border {
            0%, 100% {
              border-color: rgba(99, 102, 241, 0.5);
            }
            50% {
              border-color: rgba(99, 102, 241, 1);
            }
          }
          
          .border-dashed {
            animation: pulse-border 1.5s ease-in-out infinite;
          }
        `
      }} />
    </div>
  );
};

export default MyTasksKanban;