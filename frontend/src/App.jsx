import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UserSettingsProvider } from './context/UserSettingsContext';
import { CompanyProvider } from './context/CompanyContext';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { WikiProvider } from './components/wiki/WikiContext';
import Login from './components/Login';
import Register from './pages/user/Register';
import MainPage from './components/main/MainPage';
import ProtectedRoute from './components/ProtectedRoute';
import StandaloneChat from './pages/StandaloneChat';
import ReduxProvider from './redux/ReduxProvider';

const App = () => {
  return (
    <>
      <Router>
        <AuthProvider>
          <Provider store={store}>
            <ReduxProvider>
              <UserSettingsProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  {/* Route per la chat in finestra separata */}
                  <Route 
                    path="/standalone-chat/:id" 
                    element={
                      <ProtectedRoute>
                        <WikiProvider>
                          <StandaloneChat />
                        </WikiProvider>
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Route principale dell'app */}
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute>
                        <CompanyProvider>
                          <WikiProvider>
                            <MainPage />
                          </WikiProvider>
                        </CompanyProvider>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </UserSettingsProvider>
            </ReduxProvider>
          </Provider>
        </AuthProvider>
      </Router>
      <div id="swal-container" style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999 }}></div>
    </>
  );
};

export default App;