import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clock, AlertTriangle, MessageSquare, Paperclip, CheckCircle2, Loader2, ListTodo, AlertCircle, Search } from 'lucide-react';

const TasksLegend = ({ tasks = [], searchValue = '', onSearchChange }) => {
  // Calcola le statistiche delle task per stato
  const taskStats = {
    'DA FARE': tasks.filter(t => t.Status === 'DA FARE').length,
    'IN ESECUZIONE': tasks.filter(t => t.Status === 'IN ESECUZIONE').length,
    'COMPLETATA': tasks.filter(t => t.Status === 'COMPLETATA').length,
    'BLOCCATA': tasks.filter(t => t.Status === 'BLOCCATA').length,
    'SOSPESA': tasks.filter(t => t.Status === 'SOSPESA').length
  };

  // Calcola il numero di task in ritardo
  const delayedTasksCount = tasks.filter(task => {
    const dueDate = new Date(task.DueDate);
    const today = new Date();
    return dueDate < today && task.Status !== 'COMPLETATA';
  }).length;

  // Configurazione per gli stati delle task (colori e icone)
  const statusConfig = {
    'DA FARE': { 
      label: 'Da Fare',
      icon: <ListTodo className="w-3 h-3 mr-1" />,
      color: 'bg-gray-100 text-gray-700 border-gray-200' 
    },
    'IN ESECUZIONE': { 
      label: 'In Corso',
      icon: <Loader2 className="w-3 h-3 mr-1" />,
      color: 'bg-blue-100 text-blue-700 border-blue-200' 
    },
    'COMPLETATA': { 
      label: 'Completate',
      icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
      color: 'bg-green-100 text-green-700 border-green-200' 
    },
    'BLOCCATA': { 
      label: 'Bloccate',
      icon: <AlertCircle className="w-3 h-3 mr-1" />,
      color: 'bg-red-100 text-red-700 border-red-200' 
    },
    'SOSPESA': { 
      label: 'Sospese',
      icon: <AlertCircle className="w-3 h-3 mr-1" />,
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200' 
    }
  };

  return (
    <div className="bg-gray-50 p-3 rounded-md border">
      <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
        {/* Prima sezione: Legenda stati */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-2">
          <span className="text-gray-500 font-medium mr-1">Legenda:</span>
          
          {Object.entries(statusConfig).map(([status, config]) => (
            <Badge 
              key={status} 
              variant="outline" 
              className={`flex items-center ${config.color}`}
            >
              {config.icon}
              {config.label}: {taskStats[status]}
            </Badge>
          ))}
          
          {delayedTasksCount > 0 && (
            <Badge 
              variant="outline" 
              className="flex items-center bg-red-50 text-red-700 border-red-200"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              <span>In ritardo: {delayedTasksCount}</span>
            </Badge>
          )}
        </div>
        
        {/* Sezione centrale: Campo di ricerca */}
        <div className="flex-grow mx-2 max-w-xs">
          <div className="relative">
            <Input
              placeholder="Cerca nelle attività..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 h-9 bg-white"
            />
          </div>
        </div>
        
        {/* Terza sezione: Icone e loro significato */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 text-gray-600 text-sm">
            <MessageSquare className="h-3 w-3" />
            <span>Commenti</span>
          </div>
          
          <div className="flex items-center gap-1 text-gray-600 text-sm">
            <Paperclip className="h-3 w-3" />
            <span>Allegati</span>
          </div>
          
          <div className="flex items-center gap-1 text-gray-600 text-sm">
            <Clock className="h-3 w-3" />
            <span>Scadenza</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksLegend;