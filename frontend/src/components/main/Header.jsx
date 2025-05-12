import React, { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CompanyLogo from './CompanyLogo';
import { WikiButton } from '../wiki';

// Componente memoizzato per il pulsante notifiche
const NotificationButton = memo(({ unreadCount, toggleSidebar }) => {
  return (
    <button 
      onClick={toggleSidebar}
      className="relative p-2 text-white hover:bg-[var(--secondary)] rounded-full transition-colors"
      id="notification-button"
      aria-label={`Notifiche${unreadCount > 0 ? ` (${unreadCount} non lette)` : ''}`}
    >
      <i className="fas fa-message text-xl"></i>
      {unreadCount > 0 && (
        <span 
          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-h-5 min-w-5 h-auto w-auto px-1 flex items-center justify-center animate-pulse"
          id="notification-counter"
          aria-live="polite"
          style={{ 
            fontSize: unreadCount > 99 ? '0.6rem' : '0.75rem',
            padding: unreadCount > 99 ? '0 2px' : '0'
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
});

const Header = ({ 
  user, 
  unreadCount, 
  toggleSidebar, 
  toggleDropdown,
  handleHomeClick,
  dropdownVisible,
  handleLogout,
  dropdownRef,
  setIsPageComponent,
  setBreadcrumb,     
  setPageTitle      
}) => {
  const navigate = useNavigate();
  
  // Funzione per gestire la navigazione ai percorsi del profilo utente
  const handleProfileNavigation = (route, title) => {
    setIsPageComponent(true);
    setPageTitle(title);     
    setBreadcrumb([]);        
    navigate(route);         
    toggleDropdown();        
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
                unreadCount={unreadCount} 
                toggleSidebar={toggleSidebar} 
              />
            </div>

            {/* User Menu */}
            {user && (
              <div className="relative">
                <button
                  onClick={toggleDropdown}
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
                  className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 ${dropdownVisible ? 'block' : 'hidden'}`}
                >
                  <button
                    onClick={() => handleProfileNavigation('/user/profile', 'Modifica Profilo')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Modifica Profilo
                  </button>
                  <button
                    onClick={() => handleProfileNavigation('/user/change-password', 'Cambia Password')}
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