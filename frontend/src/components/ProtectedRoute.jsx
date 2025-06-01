import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, isAuthenticated, forceLogout } = useAuth();
  
  useEffect(() => {
    // Verifica il token ad ogni render del componente
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const tokenExpiryTime = localStorage.getItem('tokenExpiryTime');
      
      if (!token || (tokenExpiryTime && Date.now() > parseInt(tokenExpiryTime))) {
        console.log('⚠️ Token scaduto o mancante in ProtectedRoute');
        forceLogout("La tua sessione è scaduta. Effettua nuovamente il login.");
      }
    };
    
    checkAuth();
    
    // Verifica anche quando la finestra torna in focus
    const handleFocus = () => {
      checkAuth();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [forceLogout]);

  if (!user || !isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;