import React from "react";
import { Helmet } from "react-helmet";
import { Routes, Route, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  return (
    <NotificationProvider>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <div className="flex-grow w-full main-container relative">
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
          </div>
        ) : (
          <div className="breadcrumb-container">
            <ol className="breadcrumb">
              <li className="breadcrumb-item ml-3">
                <button onClick={handleHomeClick}>
                  <i className="fas fa-home p-1 colorSecondary "></i>
                  <h6 className="m-auto colorSecondary fs-5"> Home</h6>
                </button>
              </li>
              {breadcrumb.map((item, index) => (
                <div key={item.pageId} className="breadcrumb-item">
                  <button onClick={() => handleBreadcrumbClick(index)}>
                    <h6 className="m-auto colorSecondary fs-5">
                      {item.pageName}
                    </h6>
                  </button>
                </div>
              ))}
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
      </div>
    </NotificationProvider>
  );
};

export default MainContainer;
