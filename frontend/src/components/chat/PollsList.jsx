// src/components/chat/PollsList.jsx
import React, { useState, useEffect } from 'react';
import { BarChart, AlertTriangle, Check, Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const PollsList = ({ notificationId, onClose, onSelectPoll, currentUserId }) => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActive, setShowActive] = useState(true);
  const [showClosed, setShowClosed] = useState(true);
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'mostVotes'
  
  const { getNotificationPolls } = useNotificationContext();
  
  // Carica i sondaggi
  useEffect(() => {
    const loadPolls = async () => {
      try {
        setLoading(true);
        const pollsData = await getNotificationPolls(notificationId);
        if (pollsData) {
          setPolls(pollsData);
        }
      } catch (error) {
        console.error('Error loading polls:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (notificationId) {
      loadPolls();
    }
  }, [notificationId, getNotificationPolls]);
  
  // Filtra e ordina i sondaggi
  const filteredPolls = polls.filter(poll => {
    // Filtra per stato
    if (!showActive && poll.Status === 'Active') return false;
    if (!showClosed && poll.Status === 'Closed') return false;
    
    // Filtra per termine di ricerca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return poll.Question.toLowerCase().includes(term);
    }
    
    return true;
  });
  
  // Ordina i sondaggi
  const sortedPolls = [...filteredPolls].sort((a, b) => {
    switch (sortOrder) {
      case 'oldest':
        return new Date(a.CreatedDate) - new Date(b.CreatedDate);
      case 'mostVotes':
        return b.TotalVoters - a.TotalVoters;
      case 'newest':
      default:
        return new Date(b.CreatedDate) - new Date(a.CreatedDate);
    }
  });
  
  // Formatta la data di creazione
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: it });
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
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 w-full max-w-xl mx-auto overflow-hidden max-h-[80vh] flex flex-col">
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
            <label htmlFor="sort-order" className="text-sm text-gray-700 mr-2">Ordina:</label>
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
                ? 'Nessun sondaggio trovato con questi filtri'
                : 'Nessun sondaggio in questa chat'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-blue-600 hover:underline text-sm"
              >
                Cancella ricerca
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPolls.map((poll) => (
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
                        <h4 className="font-medium text-sm truncate max-w-xs">{poll.Question}</h4>
                      </div>
                      {poll.Status === 'Closed' && (
                        <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                          Chiuso
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-gray-500">{formatDate(poll.CreatedDate)}</p>
                      <p className="text-xs text-gray-500">{poll.TotalVoters} {poll.TotalVoters === 1 ? 'voto' : 'voti'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PollsList;