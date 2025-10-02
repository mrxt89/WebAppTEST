import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import {
  ChevronRight,
  Menu,
  Loader2,
} from "lucide-react";
import { Helmet } from "react-helmet";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import ProtectedRoute from "../ProtectedRoute";

// Lazy load dei componenti route più pesanti
const AdminDashboard = lazy(() => import("../../pages/admin/AdminDashboard"));
const ProjectManagementSplitView = lazy(() => import("../../pages/progetti/progetti/ProjectManagementSplitView"));
const MyTasksPage = lazy(() => import("../../pages/progetti/attivita/MyTasksPage"));
const BOMCosting = lazy(() => import("../../pages/progetti/progetti/articoli/BOMCosting"));

// Import normali per componenti più leggeri
import CategoriesPage from "../../pages/progetti/categorie/ProjectCategories";
import TemplatesPage from "../../pages/progetti/templates/projectTemplates";
import ProjectCustomers from "../../pages/progetti/clienti/ProjectCustomers";
import ArticlePage from "../../pages/progetti/progetti/articoli/ArticlePage";
import ChangePassword from "../../pages/user/ChangePassword";
import UserProfile from "../../pages/user/UserProfile";
import MainMenu from "../MainMenu";
import NavigationDrawer from "../navigation/NavigationDrawer";
import "../../styles/navigation-drawer.css";

// Import the NotificationProvider (which is now a placeholder function)
import { NotificationProvider } from "@/redux/features/notifications/NotificationProvider";

// Componente Loading Spinner elegante
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      <p className="text-sm text-gray-500">Caricamento...</p>
    </div>
  </div>
);

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
                      <Suspense fallback={<PageLoader />}>
                        <AdminDashboard onExit={navigateToPreviousLevel} />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/progetti/dashboard"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoader />}>
                        <ProjectManagementSplitView
                          onExit={navigateToPreviousLevel}
                        />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/progetti/attivita"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoader />}>
                        <MyTasksPage onExit={navigateToPreviousLevel} />
                      </Suspense>
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
                <Route
                  path="/progetti/articoli"
                  element={
                    <ProtectedRoute>
                      <ArticlePage onExit={navigateToPreviousLevel} />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/progetti/articoli/bom-costing"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoader />}>
                        <BOMCosting onExit={navigateToPreviousLevel} />
                      </Suspense>
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
