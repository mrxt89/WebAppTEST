// PollsList.jsx - File COMPLETO CORRETTO

import React, { useState, useEffect } from "react";
import {
  BarChart,
  AlertTriangle,
  Check,
  Search,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";

const PollsList = ({
  notificationId,
  onClose,
  onSelectPoll,
  currentUserId,
}) => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showActive, setShowActive] = useState(true);
  const [showClosed, setShowClosed] = useState(true);
  const [sortOrder, setSortOrder] = useState("newest"); // 'newest', 'oldest', 'mostVotes'

  const { getNotificationPolls } = useNotifications();

  // Funzione helper per parsare le opzioni
  const parseOptions = (options) => {
    if (!options) return [];
    
    // Se è già un array, restituiscilo
    if (Array.isArray(options)) {
      return options;
    }
    
    // Se è una stringa, prova a parsarla
    if (typeof options === 'string') {
      try {
        return JSON.parse(options);
      } catch (e) {
        console.error('Errore nel parsing delle opzioni:', e);
        return [];
      }
    }
    
    return [];
  };

  // Carica i sondaggi
  useEffect(() => {
    const loadPolls = async () => {
      try {
        setLoading(true);
        const result = await getNotificationPolls(notificationId);
        console.log("Risultato getNotificationPolls:", result);
        
        // Il risultato è un oggetto con i polls dentro
        if (result && result.polls && Array.isArray(result.polls)) {
          const processedPolls = result.polls.map(poll => {
            console.log("Processing poll:", poll);
            return {
              ...poll,
              Options: parseOptions(poll.Options)
            };
          });
          console.log("processedPolls:", processedPolls);
          setPolls(processedPolls);
        } else if (result && Array.isArray(result)) {
          // Fallback se il risultato è direttamente un array
          const processedPolls = result.map(poll => ({
            ...poll,
            Options: parseOptions(poll.Options)
          }));
          setPolls(processedPolls);
        } else {
          console.log("Nessun sondaggio trovato o formato non valido:", result);
          setPolls([]);
        }
      } catch (error) {
        console.error("Error loading polls:", error);
        setPolls([]);
      } finally {
        setLoading(false);
      }
    };

    if (notificationId) {
      loadPolls();
    }
  }, [notificationId, getNotificationPolls]);

  // Debug: log dello stato corrente
  useEffect(() => {
    console.log("Stato polls aggiornato:", polls);
    console.log("Numero di sondaggi:", polls.length);
  }, [polls]);

  // Filtra e ordina i sondaggi
  const filteredPolls = Array.isArray(polls)
    ? polls.filter((poll) => {
        if (!poll) return false;

        // Filtra per stato
        if (!showActive && poll.Status === "Active") return false;
        if (!showClosed && poll.Status === "Closed") return false;

        // Filtra per termine di ricerca
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return poll.Question?.toLowerCase().includes(term) ?? false;
        }

        return true;
      })
    : [];

  // Ordina i sondaggi
  const sortedPolls = [...filteredPolls].sort((a, b) => {
    switch (sortOrder) {
      case "oldest":
        return new Date(a.CreatedDate) - new Date(b.CreatedDate);
      case "mostVotes":
        return (b.TotalVoters || 0) - (a.TotalVoters || 0);
      case "newest":
      default:
        return new Date(b.CreatedDate) - new Date(a.CreatedDate);
    }
  });

  // Formatta la data di creazione
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy, HH:mm", { locale: it });
    } catch (e) {
      return dateString;
    }
  };

  const handlePollClick = (poll) => {
    if (onSelectPoll) {
      onSelectPoll(poll);
    }
  };

  return (
    <div
      className="bg-white rounded-lg shadow-lg border border-gray-200 w-full max-w-xl mx-auto overflow-hidden max-h-[80vh] flex flex-col"
      style={{ zIndex: 9999, position: "relative" }}
    >
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
        <div className="flex items-center">
          <BarChart className="h-5 w-5 text-blue-500 mr-2" />
          <h3 className="font-medium text-blue-800">Sondaggi in questa chat</h3>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Barra di ricerca e filtri */}
      <div className="p-3 border-b border-gray-200">
        <div className="relative mb-3">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Cerca sondaggi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center">
            <span className="text-sm text-gray-700 mr-2">Filtri:</span>
            <label className="inline-flex items-center mr-3">
              <input
                type="checkbox"
                checked={showActive}
                onChange={() => setShowActive(!showActive)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-1 text-sm text-gray-700">Attivi</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={showClosed}
                onChange={() => setShowClosed(!showClosed)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-1 text-sm text-gray-700">Chiusi</span>
            </label>
          </div>

          <div className="flex items-center ml-auto">
            <label htmlFor="sort-order" className="text-sm text-gray-700 mr-2">
              Ordina:
            </label>
            <select
              id="sort-order"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="newest">Più recenti</option>
              <option value="oldest">Meno recenti</option>
              <option value="mostVotes">Più votati</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista dei sondaggi */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-gray-500">Caricamento in corso...</p>
          </div>
        ) : sortedPolls.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">
              {searchTerm || !showActive || !showClosed
                ? "Nessun sondaggio trovato con questi filtri"
                : "Nessun sondaggio in questa chat"}
            </p>
            {/* Debug info */}
            <div className="mt-4 text-xs text-gray-400">
              <p>Debug: polls.length = {polls.length}</p>
              <p>Debug: filteredPolls.length = {filteredPolls.length}</p>
              <p>Debug: sortedPolls.length = {sortedPolls.length}</p>
              <p>Debug: showActive = {showActive.toString()}, showClosed = {showClosed.toString()}</p>
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="mt-2 text-blue-600 hover:underline text-sm"
              >
                Cancella ricerca
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPolls.map((poll) => {
              // Calcola le percentuali per il rendering
              const totalVotes = poll.TotalVoters || 0;
              const processedOptions = Array.isArray(poll.Options) ? poll.Options.map(option => ({
                ...option,
                percentage: totalVotes > 0 ? Math.round((option.VoteCount / totalVotes) * 100) : 0
              })) : [];

              return (
                <div
                  key={poll.PollID}
                  className="cursor-pointer hover:shadow-md transition-shadow rounded-lg overflow-hidden"
                  onClick={() => handlePollClick(poll)}
                >
                  <div className="border border-gray-200 rounded-lg">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <BarChart className="h-4 w-4 text-blue-500 mr-2" />
                          <h4 className="font-medium text-sm truncate max-w-xs">
                            {poll.Question}
                          </h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          {poll.Status === "Closed" ? (
                            <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                              Chiuso
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                              Attivo
                            </span>
                          )}
                          {poll.AllowMultipleAnswers && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                              Multi-voto
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500">
                        <div className="flex justify-between items-center">
                          <span>Creato da {poll.CreatedByName}</span>
                          <span>{formatDate(poll.CreatedDate)}</span>
                        </div>
                        {poll.ExpirationDate && (
                          <div className="mt-1 text-amber-600">
                            Scade il {formatDate(poll.ExpirationDate)}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 space-y-2">
                        {processedOptions.map((option) => (
                          <div key={option.OptionID} className="flex items-center justify-between text-xs">
                            <div className="flex items-center flex-1 mr-2">
                              <span className="text-gray-600 mr-2 truncate">
                                {option.OptionText}
                              </span>
                              {option.UserVoted === 1 && (
                                <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    option.UserVoted === 1 ? 'bg-green-500' : 'bg-blue-500'
                                  }`}
                                  style={{
                                    width: `${option.percentage}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-700 w-12 text-right">
                                {option.percentage}%
                              </span>
                              <span className="text-xs text-gray-500">
                                ({option.VoteCount})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center">
                        <span>
                          Totale voti: <span className="font-medium">{poll.TotalVoters}</span>
                        </span>
                        <span className={poll.Status === "Active" ? "text-green-600" : "text-gray-600"}>
                          {poll.Status === "Active" ? "In corso" : "Chiuso"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PollsList;