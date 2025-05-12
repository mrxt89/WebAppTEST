// Frontend/src/components/chat/InlineSearchBar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowUp, ArrowDown } from 'lucide-react';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';

const InlineSearchBar = ({ notificationId, onResultSelected, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const inputRef = useRef(null);
  const { filterMessages } = useNotifications();

  // Focus sull'input quando il componente viene montato
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Ricerca messaggi quando cambia il termine di ricerca
  useEffect(() => {
    const searchMessages = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const filteredMessages = await filterMessages(notificationId, { searchText: searchTerm });
        setResults(filteredMessages || []);
        
        // Reset dell'indice corrente
        setCurrentIndex(filteredMessages.length > 0 ? 0 : -1);
        
        // Se abbiamo dei risultati, seleziona il primo
        if (filteredMessages.length > 0) {
          onResultSelected(filteredMessages[0].messageId);
        }
      } catch (error) {
        console.error('Errore durante la ricerca:', error);
      } finally {
        setLoading(false);
      }
    };

    // Usa un debounce per evitare troppe chiamate
    const handler = setTimeout(() => {
      searchMessages();
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, notificationId, filterMessages, onResultSelected]);

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
      // Se premiamo Enter, andiamo al prossimo risultato
      navigateNext();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateNext();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigatePrevious();
    }
  };

  return (
    <div className="absolute top-16 right-4 z-50 flex items-center bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className={`h-4 w-4 ${loading ? 'text-blue-500 animate-pulse' : 'text-gray-400'}`} />
        </div>
        <input
          ref={inputRef}
          type="text"
          className="block w-full pl-10 pr-16 py-2 text-sm border-0 focus:ring-0 focus:outline-none"
          placeholder="Cerca nei messaggi..."
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
        {results.length > 0 && (
          <span className="text-xs text-gray-500 mx-2">
            {currentIndex + 1}/{results.length}
          </span>
        )}
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

export default InlineSearchBar;