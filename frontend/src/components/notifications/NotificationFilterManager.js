// NotificationFilterManager.js - Nuovo file per gestire i filtri in modo centralizzato
import { useState, useCallback, useRef, useEffect } from 'react';

class FilterManager {
  constructor() {
    this.filters = {
      filterMentioned: false,
      filterMessagesSent: false,
      showUnreadOnly: false,
      searchTerm: "",
      selectedCategory: "all",
      filterFavorites: false,
      completedFilter: "all",
      filterLeftChats: false,
      filterArchivedChats: false,
      filterMutedChats: false,
    };
    
    this.listeners = new Set();
    this.locked = false;
    this.scrollPosition = 0;
  }

  // Blocca temporaneamente gli aggiornamenti dei filtri
  lock() {
    this.locked = true;
  }

  unlock() {
    this.locked = false;
  }

  // Aggiorna un singolo filtro
  updateFilter(key, value) {
    if (this.locked) return false;
    
    if (this.filters[key] !== value) {
      this.filters[key] = value;
      this.notifyListeners();
      this.persist();
      return true;
    }
    return false;
  }

  // Aggiorna multipli filtri
  updateFilters(updates) {
    if (this.locked) return false;
    
    let hasChanges = false;
    Object.entries(updates).forEach(([key, value]) => {
      if (this.filters[key] !== value) {
        this.filters[key] = value;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      this.notifyListeners();
      this.persist();
    }
    return hasChanges;
  }

  // Ottieni tutti i filtri
  getFilters() {
    return { ...this.filters };
  }

  // Reset tutti i filtri
  resetFilters() {
    this.filters = {
      filterMentioned: false,
      filterMessagesSent: false,
      showUnreadOnly: false,
      searchTerm: "",
      selectedCategory: "all",
      filterFavorites: false,
      completedFilter: "all",
      filterLeftChats: false,
      filterArchivedChats: false,
      filterMutedChats: false,
    };
    this.notifyListeners();
    this.persist();
  }

  // Salva i filtri in localStorage
  persist() {
    localStorage.setItem('notificationFilters', JSON.stringify(this.filters));
    localStorage.setItem('notificationFiltersTimestamp', Date.now().toString());
  }

  // Carica i filtri da localStorage
  restore() {
    try {
      const saved = localStorage.getItem('notificationFilters');
      const timestamp = localStorage.getItem('notificationFiltersTimestamp');
      
      if (saved && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        // Mantieni i filtri per 30 minuti
        if (age < 30 * 60 * 1000) {
          this.filters = JSON.parse(saved);
          return true;
        }
      }
    } catch (e) {
      console.error('Error restoring filters:', e);
    }
    return false;
  }

  // Gestione listener
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.filters));
  }

  // Salva/ripristina posizione scroll
  saveScrollPosition(position) {
    this.scrollPosition = position;
  }

  getScrollPosition() {
    return this.scrollPosition;
  }
}

// Singleton instance
const filterManager = new FilterManager();

// Hook personalizzato per usare il FilterManager
export const useNotificationFilters = () => {
  const [filters, setFilters] = useState(filterManager.getFilters());
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Ripristina i filtri al primo mount
    if (isInitialMount.current) {
      filterManager.restore();
      setFilters(filterManager.getFilters());
      isInitialMount.current = false;
    }

    // Sottoscrivi agli aggiornamenti
    const unsubscribe = filterManager.subscribe((newFilters) => {
      setFilters(newFilters);
    });

    return unsubscribe;
  }, []);

  const updateFilter = useCallback((key, value) => {
    filterManager.updateFilter(key, value);
  }, []);

  const updateFilters = useCallback((updates) => {
    filterManager.updateFilters(updates);
  }, []);

  const resetFilters = useCallback(() => {
    filterManager.resetFilters();
  }, []);

  const lockFilters = useCallback(() => {
    filterManager.lock();
  }, []);

  const unlockFilters = useCallback(() => {
    filterManager.unlock();
  }, []);

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    lockFilters,
    unlockFilters,
    filterManager
  };
};

export default filterManager;