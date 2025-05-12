// Frontend/src/components/chat/ChatFilter.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Filter, Circle, BarChart } from 'lucide-react';
import { useNotifications } from '../../redux/features/notifications/notificationsHooks';

const ChatFilter = ({ notificationId, onFilterChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [messageTypeFilter, setMessageTypeFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { filterMessages } = useNotifications();
  const filterRef = useRef(null);
  
  // Colori disponibili per il filtro
  /*
    '#ba2702', // Rosso
    '#00944a', // Verde
    '#003e94', // Blu
    '#839400', // Giallo
    */
  const colors = [
    { value: '#ba2702', label: 'Rosso' },
    { value: '#00944a', label: 'Verde' },
    { value: '#003e94', label: 'Blu' },
    { value: '#839400', label: 'Giallo' }
  ];
  
  // Chiudi il filtro quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Esegui il filtro quando cambiano searchText, selectedColor o messageTypeFilter
  useEffect(() => {
    if (!isOpen) return;
    
    const executeFilter = async () => {
      if (!notificationId) return;
      
      // Se tutti i filtri sono vuoti, non fare nulla
      if (!searchText && !selectedColor && messageTypeFilter === 'all') {
        setResults([]);
        onFilterChange && onFilterChange([]);
        return;
      }
      
      try {
        setLoading(true);
        const filteredMessages = await filterMessages(notificationId, {
          color: selectedColor,
          searchText: searchText,
          messageType: messageTypeFilter !== 'all' ? messageTypeFilter : null
        });
        
        setResults(filteredMessages);
        onFilterChange && onFilterChange(filteredMessages);
      } catch (error) {
        console.error('Errore durante il filtraggio:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Usa un timeout per evitare troppe chiamate durante la digitazione
    const handler = setTimeout(() => {
      executeFilter();
    }, 500);
    
    return () => {
      clearTimeout(handler);
    };
  }, [searchText, selectedColor, messageTypeFilter, notificationId, isOpen, filterMessages, onFilterChange]);
  
  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
  };
  
  const handleColorSelect = (color) => {
    setSelectedColor(color === selectedColor ? '' : color);
  };
  
  const handleMessageTypeChange = (type) => {
    setMessageTypeFilter(type);
  };
  
  const handleClearFilters = () => {
    setSearchText('');
    setSelectedColor('');
    setMessageTypeFilter('all');
    setResults([]);
    onFilterChange && onFilterChange([]);
  };
  
  const toggleFilter = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      handleClearFilters();
    }
  };
  
  return (
    <div className="relative" ref={filterRef}>
      <button
        className={`flex items-center gap-1 p-2 rounded border ${isOpen ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
        onClick={toggleFilter}
      >
        <Filter className="h-4 w-4" />
        <span className="text-sm">Filtro</span>
        {(searchText || selectedColor || messageTypeFilter !== 'all') && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
            {results.length}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg z-50">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cerca messaggio
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchText}
                onChange={handleSearchChange}
                placeholder="Cerca nelle chat..."
                className="block w-full rounded-md border-gray-300 pl-10 pr-10 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {searchText && (
                <button
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setSearchText('')}
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filtra per colore
            </label>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color.value}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                    selectedColor === color.value ? 'border-blue-500' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => handleColorSelect(color.value)}
                  title={color.label}
                >
                  {selectedColor === color.value && (
                    <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center">
                      <Circle className="h-3 w-3 fill-current" />
                    </div>
                  )}
                </button>
              ))}
              <button
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white ${
                  !selectedColor ? 'border-blue-500' : 'border-gray-200'
                }`}
                onClick={() => setSelectedColor('')}
                title="Tutti i colori"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo di messaggio
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-2 py-1 rounded-md text-xs ${
                  messageTypeFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
                onClick={() => handleMessageTypeChange('all')}
              >
                Tutti
              </button>
              <button
                className={`px-2 py-1 rounded-md text-xs flex items-center ${
                  messageTypeFilter === 'polls' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
                onClick={() => handleMessageTypeChange('polls')}
              >
                <BarChart className="h-3 w-3 mr-1" />
                Sondaggi
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <button
              className="text-sm text-gray-600 hover:text-gray-900"
              onClick={handleClearFilters}
            >
              Cancella filtri
            </button>
            
            <div className="text-sm text-gray-600">
              {loading ? 'Ricerca...' : `${results.length} risultati`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatFilter;