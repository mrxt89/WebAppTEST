// PollMessage.jsx - File COMPLETO

import React, { useState, useEffect } from 'react';
import { BarChart, Check, CheckCircle, Clock, X } from 'lucide-react';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';
import { swal } from '../../lib/common';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

const PollMessage = ({ poll, onUpdate, showResults = false, currentUserId }) => {
  const [isVoting, setIsVoting] = useState(false);
  const [showingResults, setShowingResults] = useState(showResults);
  const [pollData, setPollData] = useState(poll);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const { votePoll, closePoll } = useNotifications();
  
  // Log poll data when received to help debug
  useEffect(() => {
    if (poll) {
      setPollData(poll);
    }
  }, [poll]);
  
  // Formato per le date
  const formatExpirationDate = (dateString) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: it });
  };
  
  // Calcola percentuali e numeri per la visualizzazione
  const calculateStats = () => {
    if (!pollData) {
      return { max: 0, totalVotes: 0, options: [] };
    }
    
    try {
      // Check if Options exists and parse it if needed
      let options = pollData.Options;
      
      if (!options) {
        return { max: 0, totalVotes: 0, options: [] };
      }
      
      if (typeof options === 'string') {
        try {
          options = JSON.parse(options);
        } catch (e) {
          console.error('Failed to parse options:', e);
          return { max: 0, totalVotes: 0, options: [] };
        }
      }
      
      if (!Array.isArray(options)) {
        console.error('Options is not an array:', options);
        return { max: 0, totalVotes: 0, options: [] };
      }
      
      // Total voters
      const totalVotes = pollData.TotalVoters || 0;
      
      let max = 0;
      
      const optionsWithStats = options.map(option => {
        const voteCount = option.VoteCount || 0;
        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
        
        if (percentage > max) max = percentage;
        
        return {
          ...option,
          percentage,
          voteCount,
          OptionText: option.OptionText || option.optionText || 'Option'
        };
      });
      
      return {
        max,
        totalVotes,
        options: optionsWithStats
      };
    } catch (error) {
      console.error('Error calculating poll stats:', error);
      return { max: 0, totalVotes: 0, options: [] };
    }
  };
  
  const stats = calculateStats();
  
  // Gestisci il voto
  const handleVote = async (optionId) => {
    if (!optionId) {
      console.error('No optionId provided for voting');
      return;
    }
    
    try {
      setIsVoting(true);
      
      // Se non è consentito selezionare più opzioni, resetta la selezione
      if (!pollData.AllowMultipleAnswers) {
        setSelectedOptions([optionId]);
        
        const result = await votePoll(optionId);
        if (result) {
          setPollData(result);
          setShowingResults(true);
          if (onUpdate) onUpdate(result);
        }
      } else {
        // Se è consentito selezionare più opzioni
        let newSelected = [...selectedOptions];
        if (newSelected.includes(optionId)) {
          newSelected = newSelected.filter(id => id !== optionId);
        } else {
          newSelected.push(optionId);
        }
        setSelectedOptions(newSelected);
      }
    } catch (error) {
      console.error('Error voting:', error);
      swal.fire({
        title: 'Errore', 
        text: 'Si è verificato un errore durante il voto', 
        icon: 'error',
        zIndex: 9999
      });
    } finally {
      setIsVoting(false);
    }
  };
  
  // Invia voti multipli
  const submitMultipleVotes = async () => {
    if (selectedOptions.length === 0) return;
    
    try {
      setIsVoting(true);
      
      // Vota per ogni opzione selezionata
      let finalResult;
      for (const optionId of selectedOptions) {
        finalResult = await votePoll(optionId);
      }
      
      if (finalResult) {
        setPollData(finalResult);
        setShowingResults(true);
        if (onUpdate) onUpdate(finalResult);
      }
    } catch (error) {
      console.error('Error submitting multiple votes:', error);
      swal.fire({
        title: 'Errore', 
        text: 'Si è verificato un errore durante il voto', 
        icon: 'error',
        zIndex: 9999
      });
    } finally {
      setIsVoting(false);
    }
  };
  
  // Chiudi il sondaggio (solo per il creatore)
  const handleClosePoll = async () => {
    try {
      const confirmed = await swal.fire({
        title: 'Chiudere il sondaggio?',
        text: 'Questa azione non può essere annullata. Nessun altro potrà più votare.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sì, chiudi il sondaggio',
        cancelButtonText: 'Annulla',
        zIndex: 9999 // Aggiungi questa riga per aumentare lo z-index
      });
      
      if (confirmed.isConfirmed) {
        const result = await closePoll(pollData.PollID);
        if (result) {
          setPollData(result);
          setShowingResults(true);
          if (onUpdate) onUpdate(result);
          swal.fire({
            title: 'Completato', 
            text: 'Il sondaggio è stato chiuso', 
            icon: 'success',
            zIndex: 9999 // Aggiungi questa riga per aumentare lo z-index
          });
        }
      }
    } catch (error) {
      console.error('Error closing poll:', error.response);
      swal.fire({
        title: 'Errore', 
        text: error.response?.data?.message || 'Si è verificato un errore', 
        icon: 'error',
        zIndex: 9999 // Aggiungi questa riga per aumentare lo z-index
      });
    }
  };
  
  // Controlla se l'utente corrente ha già votato
  const hasUserVoted = () => {
    if (!pollData || !pollData.Options) {
      return false;
    }
    
    try {
      // Parse options if needed
      const options = typeof pollData.Options === 'string' 
        ? JSON.parse(pollData.Options) 
        : pollData.Options;
      
      // Check if any option has UserVoted = true
      const voted = options.some(option => option.UserVoted);
      
      return voted;
    } catch (error) {
      console.error('Error checking if user voted:', error);
      return false;
    }
  };
  
  // If poll data is not available or incomplete, show loading
  if (!pollData || !pollData.PollID) {
    return (
      <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center" style={{ zIndex: 1200, position: 'relative' }}>
        <BarChart className="h-5 w-5 text-blue-500 mx-auto mb-2" />
        <p className="text-gray-500">Caricamento sondaggio...</p>
      </div>
    );
  }
  
  // Controlla se l'utente è il creatore del sondaggio
  const isCreator = currentUserId === pollData.CreatedBy;
  const userVoted = hasUserVoted();
  const isPollClosed = pollData.Status === 'Closed';
  
  // Se l'utente ha votato o il sondaggio è chiuso, mostra i risultati
  useEffect(() => {
    if (userVoted || isPollClosed) {
      setShowingResults(true);
    }
  }, [userVoted, isPollClosed]);
  
  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ zIndex: 1200, position: 'relative' }}>
      {/* Intestazione */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BarChart className="h-5 w-5 text-blue-500 mr-2" />
            <h3 className="font-medium text-gray-800">{pollData.Question}</h3>
          </div>
          
          {pollData.Status === 'Closed' && (
            <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-full flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              Chiuso
            </span>
          )}
          
          {pollData.ExpirationDate && pollData.Status !== 'Closed' && (
            <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Scade {formatExpirationDate(pollData.ExpirationDate)}
            </span>
          )}
        </div>
        
        <div className="text-xs text-gray-500 mt-1">
          Creato da {pollData.CreatedByName} • {pollData.TotalVoters || 0} {pollData.TotalVoters === 1 ? 'votante' : 'votanti'}
          {pollData.AllowMultipleAnswers && <span> • Risposte multiple consentite</span>}
        </div>
      </div>
      
      {/* Corpo del sondaggio */}
      <div className="p-4">
        {/* Visualizzazione risultati */}
        {showingResults ? (
          <div className="space-y-3">
            {stats.options.length > 0 ? (
              stats.options.map((option) => (
                <div key={option.OptionID} className="relative">
                  <div className="flex justify-between mb-1 text-dark">
                    <div className="flex items-center text-dark">
                      <span className="text-sm font-medium">
                        {option.OptionText}
                        {option.UserVoted && <Check className="inline-block h-4 w-4 ml-1 text-green-500" />}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{option.percentage}%</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1 text-dark">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ 
                        width: `${option.percentage}%`,
                        backgroundColor: option.UserVoted ? '#10b981' : '#3b82f6'
                      }}
                    ></div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {option.voteCount} {option.voteCount === 1 ? 'voto' : 'voti'}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">Nessuna opzione disponibile</p>
              </div>
            )}
          </div>
        ) : (
          // Visualizzazione opzioni di voto
          <div className="space-y-3">
            {stats.options.length > 0 ? (
              stats.options.map((option) => (
                <button
                  key={option.OptionID}
                  onClick={() => handleVote(option.OptionID)}
                  disabled={isVoting || isPollClosed}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedOptions.includes(option.OptionID)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  } ${isPollClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center text-dark">
                    <div className={`w-5 h-5 flex-shrink-0 rounded-full border mr-3 ${
                      selectedOptions.includes(option.OptionID)
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-400'
                    }`}>
                      {selectedOptions.includes(option.OptionID) && (
                        <Check className="h-4 w-4 text-white mx-auto" />
                      )}
                    </div>
                    <span className="text-sm">{option.OptionText}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">Nessuna opzione disponibile</p>
              </div>
            )}
            
            {/* Pulsante Vota per sondaggi multi-risposta */}
            {pollData.AllowMultipleAnswers && selectedOptions.length > 0 && (
              <button
                onClick={submitMultipleVotes}
                disabled={isVoting}
                className="w-full py-2 mt-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {isVoting ? 'Invio in corso...' : 'Invia voti'}
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Footer con azioni */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between">
        {showingResults && !userVoted && !isPollClosed ? (
          <button 
            onClick={() => setShowingResults(false)}
            className="text-sm text-blue-600 hover:underline"
          >
            Vota
          </button>
        ) : (
          <span></span>
        )}
        
        <div className="flex space-x-3">
          {!showingResults && !isPollClosed && (
            <button 
              onClick={() => setShowingResults(true)}
              className="text-sm text-gray-600 hover:underline"
            >
              Mostra risultati
            </button>
          )}
          
          {isCreator && pollData.Status !== 'Closed' && (
            <button 
              onClick={handleClosePoll}
              className="text-sm text-red-600 hover:underline"
            >
              Chiudi sondaggio
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PollMessage;