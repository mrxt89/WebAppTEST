import { memo, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUnreadCount } from "@/redux/features/notifications/notificationsSlice";
import CompanyLogo from "./CompanyLogo";
import { WikiButton } from "@/components/wiki";

// Componente memoizzato per il pulsante notifiche
const NotificationButton = memo(({ unreadCount, toggleSidebar }) => {
  return (
    <button
      onClick={toggleSidebar}
      className="relative p-2 text-white hover:bg-[var(--secondary)] rounded-full transition-colors"
      id="notification-button"
      aria-label={`Notifiche${unreadCount > 0 ? ` (${unreadCount} non lette)` : ""}`}
    >
      <i className="fas fa-message text-xl"></i>
      {unreadCount > 0 && (
        <span
          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-h-5 min-w-5 h-auto w-auto px-1 flex items-center justify-center animate-pulse"
          id="notification-counter"
          aria-live="polite"
          style={{
            fontSize: unreadCount > 99 ? "0.6rem" : "0.75rem",
            padding: unreadCount > 99 ? "0 2px" : "0",
          }}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
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
  
  // MODIFICA CHIAVE: Usa Redux per ottenere unreadCount direttamente
  const reduxUnreadCount = useSelector(selectUnreadCount);
  const [localUnreadCount, setLocalUnreadCount] = useState(reduxUnreadCount);

  // NUOVO: Ascolta gli eventi di aggiornamento del contatore
  useEffect(() => {
    const handleUnreadCountChanged = (event) => {
      if (event.detail && typeof event.detail.unreadCount === 'number') {
        
        // Se l'evento viene dalla sidebar chiusa o è un refresh forzato, aggiorna sempre
        if (event.detail.source === 'sidebar-closed' || event.detail.forced) {
          setLocalUnreadCount(event.detail.unreadCount);
        } 
        // Altrimenti aggiorna solo se il contatore è maggiore di 0 o se viene dalla sidebar filtrata mentre è aperta
        else if (event.detail.unreadCount > 0 || event.detail.source === 'sidebar-filtered') {
          setLocalUnreadCount(event.detail.unreadCount);
        }
        // Se il contatore è 0 ma non viene dalla sidebar, mantieni il valore Redux
        else {
          console.log('[Header] Ignorando contatore 0, mantengo valore Redux:', reduxUnreadCount);
        }
      }
    };
  
    const handleReadStatusChanged = (event) => {
      if (event.detail && typeof event.detail.unreadCount === 'number') {
        console.log('[Header] Aggiornamento unreadCount da read-status:', event.detail.unreadCount);
        setLocalUnreadCount(event.detail.unreadCount);
      }
    };
  
    const handleNotificationsUpdated = () => {
      console.log('[Header] Notifiche aggiornate, usando valore Redux:', reduxUnreadCount);
      // Usa direttamente il valore Redux quando le notifiche vengono aggiornate
      setLocalUnreadCount(reduxUnreadCount);
    };
  
    // Ascolta tutti gli eventi che potrebbero cambiare il contatore
    document.addEventListener("unread-count-changed", handleUnreadCountChanged);
    document.addEventListener("read-status-changed", handleReadStatusChanged);
    document.addEventListener("notifications-updated", handleNotificationsUpdated);
    document.addEventListener("new-message-received", handleNotificationsUpdated);
    document.addEventListener("chat-message-sent", handleNotificationsUpdated);
  
    return () => {
      document.removeEventListener("unread-count-changed", handleUnreadCountChanged);
      document.removeEventListener("read-status-changed", handleReadStatusChanged);
      document.removeEventListener("notifications-updated", handleNotificationsUpdated);
      document.removeEventListener("new-message-received", handleNotificationsUpdated);
      document.removeEventListener("chat-message-sent", handleNotificationsUpdated);
    };
  }, [reduxUnreadCount]);

  // NUOVO: Sincronizza con Redux quando cambia
  useEffect(() => {
    console.log('[Header] Redux unreadCount cambiato:', reduxUnreadCount);
    // Aggiorna solo se Redux ha un valore valido (>= 0)
    if (reduxUnreadCount >= 0) {
      setLocalUnreadCount(reduxUnreadCount);
    }
  }, [reduxUnreadCount]);

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

  // NUOVO: Forza un refresh del contatore quando la sidebar viene aperta
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
            {/* Wiki Button */}
            <WikiButton />

            {/* Notifications Section */}
            <div className="flex items-center space-x-4">
              <NotificationButton
                unreadCount={localUnreadCount}
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