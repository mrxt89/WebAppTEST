// Modifiche a Login.jsx per inizializzare le notifiche dopo il login

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { config } from '../config';
import notificationService from '../services/notifications/NotificationService'; // Importa il servizio notifiche

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingCompanies, setFetchingCompanies] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [error, setError] = useState('');
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Funzione per inizializzare le notifiche audio e web
  const initializeNotifications = async () => {
    try {
      // Inizializza l'audio
      await notificationService.initAudio();
      
      // Richiedi autorizzazione per le notifiche web
      if (notificationService.webNotificationsEnabled) {
        await notificationService.requestNotificationPermission();
      }
      
      // Riproduci un suono di test silenziosamente (volume a 0) per inizializzare l'audio
      const originalVolume = notificationService.audioContext?.createGain().gain.value;
      if (notificationService.audioContext) {
        const gainNode = notificationService.audioContext.createGain();
        gainNode.gain.value = 0; // Volume a 0
        
        const source = notificationService.audioContext.createBufferSource();
        if (notificationService.decodedAudioData) {
          source.buffer = notificationService.decodedAudioData;
          source.connect(gainNode);
          gainNode.connect(notificationService.audioContext.destination);
          source.start(0);
        }
      }
    } catch (error) {
      console.warn('Non è stato possibile inizializzare le notifiche:', error);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const fetchUserCompanies = async (username) => {
    if (!username.trim()) return;
    
    setFetchingCompanies(true);
    setError('');
    
    try {
      // Usa il nuovo endpoint che accetta username
      const response = await axios.get(`${config.API_BASE_URL}/user-companies-by-username/${username}`);
      setCompanies(response.data);
      
      // Se c'è solo un'azienda, selezionala automaticamente
      if (response.data.length === 1) {
        setSelectedCompanyId(response.data[0].CompanyId);
      } else if (response.data.length === 0) {
        setError('Nessuna azienda disponibile per questo utente');
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      setError('Errore nel recupero delle aziende');
    } finally {
      setFetchingCompanies(false);
    }
  };

  const handleUsernameBlur = () => {
    if (username.trim()) {
      fetchUserCompanies(username);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim()) {
      setError('Inserisci il nome utente');
      return;
    }
    
    if (!password.trim()) {
      setError('Inserisci la password');
      return;
    }
    
    if (companies.length > 0 && !selectedCompanyId) {
      setError('Seleziona un\'azienda');
      return;
    }
    
    setIsLoading(true);

    try {
      const success = await login(username, password, selectedCompanyId);
      if (success) {
        // Inizializza le notifiche prima di navigare
        await initializeNotifications();
        navigate('/');
      }
    } catch (error) {
      if (error.response) {
        // Errore di risposta dal server
        if (error.response.status === 401) {
          setError('Username o password non validi');
        } else {
          setError(error.response.data.message || 'Errore durante il login');
        }
      } else if (error.request) {
        // Errore di rete
        setError('Impossibile contattare il server');
      } else {
        setError('Si è verificato un errore durante il login');
      }
      console.error('Login Error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (isAuthenticated()) {
      // Se l'utente è già autenticato, inizializza le notifiche
      initializeNotifications().then(() => {
        navigate('/');
      });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="login-background">
      <div className="login-overlay">
        <form onSubmit={handleSubmit} className="p-6 rounded-lg shadow-lg w-80">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-center mb-4">Login</h1>
            <label className="block mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={handleUsernameBlur}
              required
              className="w-full p-2 border border-gray-300 rounded"
              autoComplete="username"
            />
          </div>
          
          {fetchingCompanies && (
            <div className="mb-4 text-center">
              <p>Caricamento aziende...</p>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block mb-2">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-2 border border-gray-300 rounded pr-10"
                autoComplete="current-password"
              />
              <span
                onClick={toggleShowPassword}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'pointer'
                }}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </span>
            </div>
          </div>

          
            <div className="mb-4">
              <label className="block mb-2">Azienda</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                required
              >
                <option value="">Seleziona un'azienda</option>
                {companies.map((company) => (
                  <option key={company.CompanyId} value={company.CompanyId}>
                    {company.Description}
                  </option>
                ))}
              </select>
            </div>
          

          <div id="loginError" className="text-center my-7" style={{ height: '2rem' }}>
            {error && <p className="text-center mb-4 bg-red-200 text-red-700 p-2 rounded">{error}</p>}
          </div>
          
          <button 
            type="submit" 
            className="w-full primaryButton text-white p-2 rounded mt-3"
            disabled={isLoading || fetchingCompanies}
          >
            {isLoading ? 'Login in corso...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;