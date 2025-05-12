import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserSettingsProvider } from './context/UserSettingsContext';
import { CompanyProvider } from './context/CompanyContext';
import Login from './components/Login';
import Register from './pages/user/Register';
import MainPage from './components/main/MainPage';
import ProtectedRoute from './components/ProtectedRoute';

// Rimosso l'import di NotificationProvider perché ora usiamo Redux

const App = () => {
  return (
    <>
      <Router>
        <AuthProvider>
          <UserSettingsProvider>
            <CompanyProvider>
              <AppRoutes />
            </CompanyProvider>
          </UserSettingsProvider>
        </AuthProvider>
      </Router>
      <div id="swal-container" style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999 }}></div>
    </>
  );
};

const AppRoutes = () => {
  const { resetSessionTimeout } = useAuth();

  useEffect(() => {
    window.addEventListener('click', resetSessionTimeout);
    window.addEventListener('keydown', resetSessionTimeout);

    return () => {
      window.removeEventListener('click', resetSessionTimeout);
      window.removeEventListener('keydown', resetSessionTimeout);
    };
  }, [resetSessionTimeout]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
          
            <MainPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;