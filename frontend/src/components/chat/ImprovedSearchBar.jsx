// src/components/chat/ImprovedSearchBar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowUp, ArrowDown, Loader } from 'lucide-react';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';

const ImprovedSearchBar = ({ notificationId, onResultSelected, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const { filterMessages } = useNotifications();

  // Focus sull'input quando il componente viene montato
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Funzione di ricerca con debug migliorato
  const searchMessages = async (term) => {
    if (!term || term.length < 2) {
      setResults([]);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const filteredMessages = await filterMessages(notificationId, { searchText: term });
      
      if (!filteredMessages) {
        setResults([]);
        setError('Nessun risultato trovato');
        return;
      }
      
      setResults(filteredMessages);
      
      // Reset dell'indice corrente
      if (filteredMessages.length > 0) {
        setCurrentIndex(0);
        // Seleziona il primo risultato
        onResultSelected(filteredMessages[0].messageId);
      } else {
        setCurrentIndex(-1);
        setError('Nessun risultato trovato');
      }
    } catch (error) {
      console.error('Errore durante la ricerca:', error);
      setError('Errore durante la ricerca');
    } finally {
      setLoading(false);
    }
  };

  // Ricerca messaggi quando cambia il termine di ricerca
  useEffect(() => {
    // Usa un debounce per evitare troppe chiamate
    const handler = setTimeout(() => {
      searchMessages(searchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, notificationId]);

  // Funzioni di navigazione tra i risultati
  const navigateNext = () => {
    if (results.length === 0) return;
    
    const newIndex = (currentIndex + 1) % results.length;
    setCurrentIndex(newIndex);
    onResultSelected(results[newIndex].messageId);
  };

  const navigatePrevious = () => {
    if (results.length === 0) return;
    
    const newIndex = (currentIndex - 1 + results.length) % results.length;
    setCurrentIndex(newIndex);
    onResultSelected(results[newIndex].messageId);
  };

  // Gestione scorciatoie da tastiera
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      // Se premiamo Enter e stiamo effettuando una nuova ricerca
      if (searchTerm !== results[currentIndex]?.message) {
        searchMessages(searchTerm);
      } else {
        // Altrimenti navighiamo al prossimo risultato
        navigateNext();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateNext();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigatePrevious();
    }
  };

  return (
    <div className="absolute top-16 right-4 z-50 flex items-center bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden min-w-[300px]">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loading ? (
            <Loader className="h-4 w-4 text-blue-500 animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          className="block w-full pl-10 pr-16 py-2 text-sm border-0 focus:ring-0 focus:outline-none"
          placeholder="Scrivi almeno 2 caratteri..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-10 flex items-center pr-2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {/* Indicatore risultati e navigazione */}
      <div className="flex items-center px-2 border-l border-gray-200 h-full">
        {results.length > 0 ? (
          <span className="text-xs text-gray-500 mx-2">
            {currentIndex + 1}/{results.length}
          </span>
        ) : error ? (
          <span className="text-xs text-red-500 mx-2">
            {error}
          </span>
        ) : null}
        <div className="flex">
          <button
            onClick={navigatePrevious}
            disabled={results.length === 0}
            className={`p-1 rounded ${
              results.length > 0 ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            onClick={navigateNext}
            disabled={results.length === 0}
            className={`p-1 rounded ${
              results.length > 0 ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-gray-500 hover:bg-gray-100 ml-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ImprovedSearchBar;