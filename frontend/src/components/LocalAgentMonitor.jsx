// frontend/src/components/LocalAgentMonitor.jsx
import React, { useState, useEffect } from 'react';
import { X, FileText, AlertCircle, Check, Clock, ChevronDown } from 'lucide-react';
import localAgentService from '@/services/localAgentService';
import { toast } from 'react-toastify';

// Stato globale per la visibilità della finestra
let globalWindowVisible = true;
let globalSetWindowVisible = null;

// Evento custom per aprire la finestra
export const openAgentWindow = () => {
  if (globalSetWindowVisible) {
    globalSetWindowVisible(true);
  }
};

const LocalAgentMonitor = () => {
  const [sessions, setSessions] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [agentStatus, setAgentStatus] = useState('checking');
  const [openMenus, setOpenMenus] = useState({}); // Per gestire i menu a tendina
  const [menuPositions, setMenuPositions] = useState({}); // Per gestire il posizionamento dei menu
  
  // Aggiorna il riferimento globale
  globalSetWindowVisible = setIsVisible;
  
  useEffect(() => {
    checkAgentAndSessions();
    const interval = setInterval(checkAgentAndSessions, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Chiudi menu quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenus({});
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
  const checkAgentAndSessions = async () => {
    try {
      // Usa un timeout breve per evitare lunghe attese
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const available = await localAgentService.checkAvailability();
      clearTimeout(timeoutId);
      
      if (available) {
        setAgentStatus('online');
        const activeSessions = await localAgentService.getSessions();
        setSessions(activeSessions);
        // Mostra la finestra solo se ci sono sessioni E l'utente non l'ha chiusa manualmente
        setIsVisible(activeSessions.length > 0 && globalWindowVisible);
      } else {
        setAgentStatus('offline');
        setSessions([]);
        setIsVisible(false);
      }
    } catch (error) {
      // Ignora silenziosamente gli errori CORS/network durante il caricamento
      setAgentStatus('offline');
      setSessions([]);
      setIsVisible(false);
    }
  };
  
  const handleCloseSession = async (sessionId, fileName) => {
    if (!window.confirm(`Chiudere ${fileName}? Le modifiche verranno sincronizzate.`)) {
      return;
    }
    
    try {
      const result = await localAgentService.closeSession(sessionId);
      
      if (result.success) {
        toast.success(`File chiuso: ${fileName}`, {
          position: 'bottom-right'
        });
        
        if (result.uploaded) {
          toast.info('Modifiche sincronizzate', {
            position: 'bottom-right',
            autoClose: 2000
          });
        }
        
        // Aggiorna lista sessioni
        checkAgentAndSessions();
      }
    } catch (error) {
      toast.error(`Errore chiusura file: ${error.message}`);
    }
  };

  const handleCloseWithoutSaving = async (sessionId, fileName) => {
    if (!window.confirm(`Chiudere ${fileName} SENZA salvare le modifiche? Questa azione non può essere annullata.`)) {
      return;
    }
    
    try {
      const result = await localAgentService.closeSession(sessionId, false, false); // saveChanges = false
      
      if (result.success) {
        toast.success(`File chiuso senza salvare: ${fileName}`, {
          position: 'bottom-right'
        });
        
        // Aggiorna lista sessioni
        checkAgentAndSessions();
      }
    } catch (error) {
      toast.error(`Errore chiusura file: ${error.message}`);
    }
  };
  
  const handleCloseWindow = () => {
    setIsVisible(false);
    globalWindowVisible = false; // Mantieni chiusa
  };
  
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60); // minuti
    
    if (diff < 1) return 'Adesso';
    if (diff < 60) return `${diff} min fa`;
    if (diff < 1440) return `${Math.floor(diff / 60)} ore fa`;
    return date.toLocaleDateString('it-IT');
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-20 right-4 z-40">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 w-[400px]">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">File in modifica</span>
            <span className="text-xs text-gray-500">({sessions.length})</span>
          </div>
          <button
            onClick={handleCloseWindow}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Sessions List */}
        <div className="max-h-64 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.sessionId}
              className="p-3 border-b last:border-b-0 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {session.fileName}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(session.openedAt)}
                    </span>
                    
                    {session.hasChanges && (
                      <span className="text-xs text-orange-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Modificato
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleCloseSession(session.sessionId, session.fileName)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Chiudi
                  </button>
                  <button
                    onClick={() => handleCloseWithoutSaving(session.sessionId, session.fileName)}
                    className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 rounded text-red-700"
                  >
                    Chiudi senza salvare
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <div className="p-2 border-t bg-gray-50">
          <p className="w-full text-xs text-blue-600 hover:text-blue-800">Utilizza l'app agent per gestire le sessioni</p>
        </div>
      </div>
    </div>
  );
};

export default LocalAgentMonitor;

// ============================================
// Badge per mostrare stato agent nella navbar
// ============================================

export const AgentStatusBadge = () => {
  const [status, setStatus] = useState('checking');
  const [sessionCount, setSessionCount] = useState(0);
  const [isClicked, setIsClicked] = useState(false);
  
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const statusData = await localAgentService.getStatus();
        if (statusData) {
          setStatus('online');
          // Gestisci sia il caso in cui sessions è un numero che un array
          if (typeof statusData.sessions === 'number') {
            setSessionCount(statusData.sessions);
          } else if (Array.isArray(statusData.sessions)) {
            setSessionCount(statusData.sessions.length);
          } else {
            setSessionCount(0);
          }
        } else {
          setStatus('offline');
          setSessionCount(0);
        }
      } catch (error) {
        // Ignora silenziosamente errori di connessione
        setStatus('offline');
        setSessionCount(0);
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  const getStatusColor = () => {
    switch (status) {
      case 'online': return 'bg-emerald-500';
      case 'offline': return 'bg-slate-400';
      case 'checking': return 'bg-amber-500';
      default: return 'bg-slate-400';
    }
  };
  
  const getStatusIcon = () => {
    switch (status) {
      case 'online': return '●';
      case 'offline': return '○';
      case 'checking': return '⟳';
      default: return '○';
    }
  };
  
  const getStatusText = () => {
    switch (status) {
      case 'online': return sessionCount > 0 ? `${sessionCount} file` : 'Agent Pronto';
      case 'offline': return 'Agent Offline';
      case 'checking': return 'Verifica...';
      default: return 'Agent Sconosciuto';
    }
  };
  
  const getStatusBg = () => {
    switch (status) {
      case 'online': return 'bg-emerald-50 border-emerald-200';
      case 'offline': return 'bg-slate-50 border-slate-200';
      case 'checking': return 'bg-amber-50 border-amber-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  };
  
  const handleBadgeClick = () => {
    if (status === 'online' && sessionCount > 0) {
      setIsClicked(true);
      openAgentWindow();
      
      // Reset dell'effetto click dopo 200ms
      setTimeout(() => setIsClicked(false), 200);
    }
  };

  return (
    <div 
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 ${getStatusBg()} hover:shadow-sm group relative ${
        status === 'online' && sessionCount > 0 ? 'cursor-pointer hover:scale-105' : 'cursor-help'
      } ${isClicked ? 'scale-95' : ''}`}
      title={`Local Agent: ${status === 'online' ? 'Connesso e funzionante' : status === 'offline' ? 'Non disponibile' : 'Verifica in corso'}`}
      onClick={handleBadgeClick}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()} ${status === 'checking' ? 'animate-pulse' : status === 'online' ? 'animate-pulse' : ''}`} />
      <span className="text-xs font-medium text-slate-700">{getStatusText()}</span>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        {status === 'online' ? 
          sessionCount > 0 ? 
            `Clicca per vedere i ${sessionCount} file aperti` : 
            'Local Agent attivo' : 
          status === 'offline' ? 
          'Local Agent non disponibile' : 
          'Verifica connessione...'
        }
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
      </div>
    </div>
  );
};