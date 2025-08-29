import React, { useState, useEffect, useRef } from "react";
import {
  ChevronRight,
  Menu,
} from "lucide-react";
import { Helmet } from "react-helmet";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import ProtectedRoute from "../ProtectedRoute";
import AdminDashboard from "../../pages/admin/AdminDashboard";
import ProjectManagementSplitView from "../../pages/progetti/progetti/ProjectManagementSplitView";
import CategoriesPage from "../../pages/progetti/categorie/ProjectCategories";
import TemplatesPage from "../../pages/progetti/templates/projectTemplates";
import ProjectCustomers from "../../pages/progetti/clienti/ProjectCustomers";
import MyTasksPage from "../../pages/progetti/attivita/MyTasksPage";
import ChangePassword from "../../pages/user/ChangePassword";
import UserProfile from "../../pages/user/UserProfile";
import MainMenu from "../MainMenu";
import NavigationDrawer from "../navigation/NavigationDrawer";
import "../../styles/navigation-drawer.css";

// Import the NotificationProvider (which is now a placeholder function)
import { NotificationProvider } from "@/redux/features/notifications/NotificationProvider";

const MainContainer = ({
  menuItems,
  breadcrumb = [], // Ensure breadcrumb is an array
  handleNavigate,
  handleBreadcrumbClick,
  handleHomeClick,
  isPageComponent,
  pageTitle,
  navigateToPreviousLevel,
  currentLevelItems,
  children, // Aggiungo il supporto per i children
}) => {
    useNavigate();
    const location = useLocation();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerTriggerRef = useRef(null);
  
  // Monitora l'apertura dei dialog per gestire correttamente l'accessibilità
  useEffect(() => {
    const checkDialogState = () => {
      // Verifica se c'è un elemento dialog[data-state="open"]
      const openDialogs = document.querySelectorAll('[role="dialog"][data-state="open"]');
      setIsDialogOpen(openDialogs.length > 0);
    };
    
    // Esegui al mount
    checkDialogState();
    
    // Crea un observer per rilevare le modifiche ai dialog
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' || mutation.type === 'childList') {
          checkDialogState();
        }
      }
    });
    
    // Osserva le modifiche al DOM
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state']
    });
    
    return () => observer.disconnect();
  }, []);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const handleDrawerNavigate = (item) => {
    if (item.pageRoute === '/') {
      handleHomeClick();
    } else {
      handleNavigate(item);
    }
    setIsDrawerOpen(false);
  };

  return (
    <NotificationProvider>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <div 
        className="flex-grow w-full main-container relative"
        // Utilizziamo l'attributo inert invece di aria-hidden per il contenitore principale
        // quando ci sono dialoghi aperti, perché è più sicuro per l'accessibilità
        inert={isDialogOpen ? "" : undefined}
      >
        {/* Mostra il menu principale solo quando NON siamo su una pagina componente */}
        {!isPageComponent && (
          <MainMenu menuItems={currentLevelItems} onNavigate={handleNavigate} />
        )}

        {/* Mostra la navigazione appropriata a seconda del tipo di pagina */}
        {isPageComponent ? (
          <div className="flex items-center justify-between breadcrumb">
            <button
              className="breadcrumb-item mx-4 text-2xl"
              style={{ width: "100px" }}
              onClick={navigateToPreviousLevel}
            >
              <i className="fas fa-arrow-left p-1 colorSecondary fs-5"></i>
              <h6 className="colorSecondary m-auto mx-2 fs-5">Menu</h6>
            </button>
            <div className="text-center font-medium fs-5 mx-4">{pageTitle}</div>
            {/* Icona per aprire il navigation drawer */}
              <Menu 
                className="w-5 h-5 relative z-10 text-black mr-5" 
                ref={drawerTriggerRef}
                onClick={toggleDrawer}
                title="Apri menu di navigazione"
                aria-label="Apri menu di navigazione"
              />
              
             
          </div>
        ) : (
          <div className="breadcrumb-container">
            <ol className="breadcrumb">
              <li className="breadcrumb-item ml-3">
                <button 
                  onClick={handleHomeClick}
                  className="breadcrumb-button home-button"
                >
                  <i className="fas fa-home p-1 colorSecondary"></i>
                  <h6 className="m-auto colorSecondary fs-5">Home</h6>
                </button>
              </li>
              {breadcrumb.map((item, index) => (
                <React.Fragment key={item.pageId}>
                  <li className="breadcrumb-separator">
                    <ChevronRight className="text-gray-400 mx-2 h-4 w-4" />
                  </li>
                  <li className="breadcrumb-item">
                    <button 
                      onClick={() => handleBreadcrumbClick(index)}
                      className="breadcrumb-button"
                    >
                      <h6 className="m-auto colorSecondary fs-5">
                        {item.pageName}
                      </h6>
                    </button>
                  </li>
                </React.Fragment>
              ))}
              {/* Icona menu anche nel breadcrumb normale, all'estrema destra */}
              {breadcrumb.length > 0 && (
                <li className="ml-auto mr-3">
                 
                  
                    <Menu 
                     ref={drawerTriggerRef}
                     onClick={toggleDrawer}
                     title="Apri menu di navigazione"
                     aria-label="Apri menu di navigazione"
                      className="w-4 h-4 relative z-10 text-black mr-5" 
                    
                    />
                    
                
                </li>
              )}
            </ol>
          </div>
        )}

        <main className="page-content">
          {/* Posiziona Routes in modo che funzioni in entrambi i casi */}
          <Routes>
            <Route path="/" element={<ProtectedRoute />} />

            {/* Pagine profilo utente */}
            <Route
              path="/user/change-password"
              element={
                <ProtectedRoute>
                  <ChangePassword onExit={navigateToPreviousLevel} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/profile"
              element={
                <ProtectedRoute>
                  <UserProfile onExit={navigateToPreviousLevel} />
                </ProtectedRoute>
              }
            />

            {/* Rendering condizionale delle altre rotte solo quando isPageComponent è true */}
            {isPageComponent && (
              <>
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute>
                      <AdminDashboard onExit={navigateToPreviousLevel} />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/progetti/dashboard"
                  element={
                    <ProtectedRoute>
                      <ProjectManagementSplitView
                        onExit={navigateToPreviousLevel}
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/progetti/attivita"
                  element={
                    <ProtectedRoute>
                      <MyTasksPage onExit={navigateToPreviousLevel} />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/progetti/templates"
                  element={
                    <ProtectedRoute>
                      <TemplatesPage onExit={navigateToPreviousLevel} />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/progetti/categorie"
                  element={
                    <ProtectedRoute>
                      <CategoriesPage onExit={navigateToPreviousLevel} />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/progetti/clienti"
                  element={
                    <ProtectedRoute>
                      <ProjectCustomers onExit={navigateToPreviousLevel} />
                    </ProtectedRoute>
                  }
                />
              </>
            )}
          </Routes>
        </main>

        {/* Renderizza i children */}
        {children}

        {/* Navigation Drawer */}
        <NavigationDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          menuItems={menuItems}
          currentPath={location.pathname}
          onNavigate={handleDrawerNavigate}
          triggerRef={drawerTriggerRef}
        />
      </div>
    </NotificationProvider>
  );
};

export default MainContainer;
