// src/components/main/Header.jsx
import { memo, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUnreadCount } from "@/redux/features/notifications/notificationsSlice";
import CompanyLogo from "./CompanyLogo";
import { WikiButton } from "@/components/wiki";
import { AgentStatusBadge, openAgentWindow } from "@/components/LocalAgentMonitor";

// Componente memoizzato per il pulsante notifiche
const NotificationButton = memo(({ unreadCount, toggleSidebar }) => {
  // Stato locale per gestire il contatore con transizioni fluide
  const [displayCount, setDisplayCount] = useState(unreadCount);
  const [pendingCount, setPendingCount] = useState(null);
  
  // Aggiorna displayCount quando cambia unreadCount da Redux
  useEffect(() => {
    // Se non c'è un conteggio pendente, usa il valore Redux
    if (pendingCount === null) {
      setDisplayCount(unreadCount);
    }
  }, [unreadCount, pendingCount]);
  
  // Gestisci gli eventi di aggiornamento
  useEffect(() => {
    const handleUnreadCountChanged = (event) => {
      if (event.detail && typeof event.detail.unreadCount === 'number') {
        console.log('[NotificationButton] Evento ricevuto:', event.detail);
        
        // Se è un aggiornamento forzato (da toggle read/unread)
        if (event.detail.forced && event.detail.source?.includes('sidebar-toggle')) {
          setPendingCount(event.detail.unreadCount);
          setDisplayCount(event.detail.unreadCount);
          
          // Mantieni il valore pendente per 3 secondi
          setTimeout(() => {
            setPendingCount(null);
          }, 3000);
        }
        // Altri eventi forzati
        else if (event.detail.forced) {
          setDisplayCount(event.detail.unreadCount);
        }
      }
    };
    
    document.addEventListener("unread-count-changed", handleUnreadCountChanged);
    
    return () => {
      document.removeEventListener("unread-count-changed", handleUnreadCountChanged);
    };
  }, []);
  
  return (
    <button
      onClick={toggleSidebar}
      className="relative p-2 text-white hover:bg-[var(--secondary)] rounded-full transition-colors"
      id="notification-button"
      aria-label={`Notifiche${displayCount > 0 ? ` (${displayCount} non lette)` : ""}`}
    >
      <i className="fas fa-message text-xl"></i>
      {displayCount > 0 && (
        <span
          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-h-5 min-w-5 h-auto w-auto px-1 flex items-center justify-center animate-pulse"
          id="notification-counter"
          aria-live="polite"
          style={{
            fontSize: displayCount > 99 ? "0.6rem" : "0.75rem",
            padding: displayCount > 99 ? "0 2px" : "0",
          }}
        >
          {displayCount > 99 ? "99+" : displayCount}
        </span>
      )}
    </button>
  );
});

// Aggiungi displayName per il debug
NotificationButton.displayName = 'NotificationButton';

const Header = ({
  user,
  toggleSidebar,
  toggleDropdown,
  handleHomeClick,
  dropdownVisible,
  handleLogout,
  dropdownRef,
  setIsPageComponent,
  setBreadcrumb,
  setPageTitle,
}) => {
  const navigate = useNavigate();
  
  // Usa Redux per ottenere unreadCount direttamente
  const reduxUnreadCount = useSelector(selectUnreadCount);

  // Funzione per gestire l'apertura del dropdown e la chiusura della sidebar
  const handleDropdownToggle = () => {
    toggleDropdown();
    if (!dropdownVisible) {
      toggleSidebar(false); // Chiude la sidebar quando si apre il menu
    }
  };

  // Funzione per gestire la navigazione ai percorsi del profilo utente
  const handleProfileNavigation = (route, title) => {
    setIsPageComponent(true);
    setPageTitle(title);
    setBreadcrumb([]);
    navigate(route);
    toggleDropdown();
  };

  // Forza un refresh del contatore quando la sidebar viene aperta
  const handleToggleSidebar = () => {
    toggleSidebar();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 shadow-md h-16 bg-[var(--primary)]">
      <div className="mx-auto px-4 h-full">
        <div className="flex justify-between items-center h-full">
          {/* Logo Section */}
          <div className="flex-shrink-0">
            <Link
              to="/"
              className="flex items-center"
              onClick={handleHomeClick}
            >
              <CompanyLogo className="h-10 w-auto" />
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">

            {/* Agent Status Badge */}
            <AgentStatusBadge />
            
            {/* Wiki Button */}
            <WikiButton />

            {/* Notifications Section */}
            <div className="flex items-center space-x-4">
              <NotificationButton
                unreadCount={reduxUnreadCount}
                toggleSidebar={handleToggleSidebar}
              />
            </div>

            {/* User Menu */}
            {user && (
              <div className="relative">
                <button
                  onClick={handleDropdownToggle}
                  className="user-dropdown-button flex items-center space-x-2 text-white hover:bg-[var(--secondary)] px-3 py-2 rounded-lg transition-colors"
                >
                  <span className="text-sm font-medium hidden sm:block">
                    {user.username}
                  </span>
                  <i className="fas fa-caret-down"></i>
                </button>

                {/* Dropdown Menu */}
                <div
                  ref={dropdownRef}
                  className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50 ${dropdownVisible ? "block" : "hidden"}`}
                >
                  <button
                    onClick={() =>
                      handleProfileNavigation(
                        "/user/profile",
                        "Modifica Profilo",
                      )
                    }
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Modifica Profilo
                  </button>
                  <button
                    onClick={() =>
                      handleProfileNavigation(
                        "/user/change-password",
                        "Cambia Password",
                      )
                    }
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Cambia Password
                  </button>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Esci
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;