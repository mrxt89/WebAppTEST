// frontend/src/services/localAgentService.js
import axios from 'axios';
import { toast } from 'react-toastify';

class LocalAgentService {
  constructor() {
    // Usa 127.0.0.1 invece di localhost per evitare problemi DNS/IPv6
    this.baseURL = 'http://127.0.0.1:7865';
    this.isAvailable = null;
    this.checkInterval = null;
    
    // Configura axios per ignorare errori CORS/SSL in dev
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 3000,
      validateStatus: () => true, // Accetta tutti gli status code
      withCredentials: false // Evita problemi CORS preflight
    });
    
    // Check iniziale
    this.checkAvailability();
    
    // Check periodico ogni 30 secondi
    this.startPeriodicCheck();
  }
  
  startPeriodicCheck() {
    this.checkInterval = setInterval(() => {
      this.checkAvailability();
    }, 30000);
  }
  
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
  
  async checkAvailability() {
    try {
      const response = await this.axiosInstance.get('/ping');
      
      // Verifica che la risposta sia OK e contenga pong
      this.isAvailable = response.status === 200 && response.data?.pong === true;
      return this.isAvailable;
    } catch (error) {
      console.log('Agent not available:', error.message);
      this.isAvailable = false;
      return false;
    }
  }
  
  async getStatus() {
    try {
      const response = await this.axiosInstance.get('/status');
      return response.status === 200 ? response.data : null;
    } catch (error) {
      console.error('Error getting agent status:', error.message);
      throw new Error('Agent non disponibile');
    }
  }
  
  async openFile(fileData) {
    // Verifica disponibilità
    if (!await this.checkAvailability()) {
      throw new Error('AGENT_NOT_AVAILABLE');
    }
    
    try {
      // Prima crea il lock sul server
      console.log('Creating lock for attachment:', fileData.attachmentId);
      console.log('Using server URL:', fileData.serverUrl);
      console.log('Token preview:', fileData.token.substring(0, 30) + '...');
      
      const lockResponse = await axios.post(
        `${fileData.serverUrl}/api/attachment-locks/${fileData.attachmentId}`,
        {},
        {
          headers: {
            'Authorization': fileData.token
          }
        }
      );
      
      console.log('Lock response:', lockResponse.data);
      
      if (!lockResponse.data.success) {
        throw new Error('Errore nella creazione del lock');
      }
      
      // Poi invia la richiesta all'agent
      console.log('Sending file open request to agent...');
      console.log('File data:', fileData);
      
      const response = await this.axiosInstance.post('/open-file', {
        attachmentId: fileData.attachmentId,
        fileName: fileData.fileName,
        filePath: fileData.filePath,
        serverUrl: fileData.serverUrl,
        token: fileData.token,
        lockFile: fileData.lockFile !== false,
        companyId: fileData.companyId,
        userId: fileData.userId,
        projectId: fileData.projectId,
        taskId: fileData.taskId,
        notificationId: fileData.notificationId,
        itemCode: fileData.itemCode,
        projectItemId: fileData.projectItemId,
        lockId: lockResponse.data.lockId
      });
      
      console.log('Agent response:', response.data);
      
      if (response.status === 200 && response.data?.success) {
        // Salva sessionId per tracking
        this.saveSession(response.data.sessionId, fileData);
        
        return response.data;
      } else {
        const error = response.data?.error || response.data?.message || 'Errore apertura file';
        throw new Error(error);
      }
    } catch (error) {
      console.error('Lock error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        headers: error.config?.headers
      });
      
      if (error.response?.data?.error === 'FILE_LOCKED') {
        const data = error.response.data;
        throw {
          code: 'FILE_LOCKED',
          message: `File già in modifica da ${data.lockedBy}`,
          lockedBy: data.lockedBy,
          lockedAt: data.lockedAt
        };
      }
      
      // Se è un errore di lock dal server
      if (error.response?.status === 409) {
        const data = error.response.data;
        throw {
          code: 'FILE_LOCKED',
          message: data.message,
          lockedBy: data.lockedBy,
          lockedByName: data.lockedByName,
          lockedAt: data.lockedAt
        };
      }
      
      // Se è un 400 Bad Request
      if (error.response?.status === 400) {
        console.error('Bad Request error:', error.response.data);
        throw new Error(error.response.data.message || 'Richiesta non valida');
      }
      
      // Se è un 404 Not Found
      if (error.response?.status === 404) {
        throw new Error('Allegato non trovato');
      }
      
      throw error;
    }
  }
  
  async getSessions() {
    try {
      const response = await this.axiosInstance.get('/sessions');
      return response.status === 200 ? (response.data?.sessions || []) : [];
    } catch (error) {
      console.error('Error getting sessions:', error.message);
      return [];
    }
  }
  
  async closeSession(sessionId, forceClose = false, saveChanges = true) {
    try {
      const response = await this.axiosInstance.post(
        `/close-session/${sessionId}`,
        { forceClose, saveChanges }
      );
      
      if (response.status === 200 && response.data?.success) {
        // Rilascia il lock sul server
        try {
          const session = this.getLocalSessions()[sessionId];
          if (session && session.attachmentId) {
            console.log('Releasing lock for attachment:', session.attachmentId);
            
            await axios.delete(
              `${session.serverUrl}/api/attachment-locks/${session.attachmentId}`,
              {
                headers: {
                  'Authorization': session.token
                }
              }
            );
            
            console.log('Lock released successfully');
          }
        } catch (lockError) {
          console.warn('Errore nel rilascio del lock:', lockError);
          // Non bloccare la chiusura se il rilascio del lock fallisce
        }
        
        this.removeSession(sessionId);
        return response.data;
      }
      
      throw new Error(response.data?.message || 'Errore chiusura sessione');
    } catch (error) {
      console.error('Error closing session:', error);
      throw error;
    }
  }
  
  // Gestione sessioni locali
  saveSession(sessionId, fileData) {
    const sessions = this.getLocalSessions();
    sessions[sessionId] = {
      ...fileData,
      openedAt: new Date().toISOString()
    };
    localStorage.setItem('agentSessions', JSON.stringify(sessions));
  }
  
  removeSession(sessionId) {
    const sessions = this.getLocalSessions();
    delete sessions[sessionId];
    localStorage.setItem('agentSessions', JSON.stringify(sessions));
  }
  
  getLocalSessions() {
    try {
      return JSON.parse(localStorage.getItem('agentSessions') || '{}');
    } catch {
      return {};
    }
  }
  
  // Metodo helper per gestire errori comuni
  handleError(error) {
    if (error.code === 'AGENT_NOT_AVAILABLE') {
      return {
        title: 'Local Agent non disponibile',
        message: 'Installa e avvia Local Agent per modificare i file direttamente.',
        showDownload: true
      };
    }
    
    if (error.code === 'FILE_LOCKED') {
      return {
        title: 'File bloccato',
        message: error.message,
        showForceUnlock: true
      };
    }
    
    return {
      title: 'Errore',
      message: error.message || 'Si è verificato un errore'
    };
  }
  
  // URL per download agent
  getDownloadUrl() {
    const platform = navigator.platform.toLowerCase();
    
    if (platform.includes('win')) {
      return '/downloads/webapp-agent-setup.exe';
    } else if (platform.includes('mac')) {
      return '/downloads/webapp-agent.dmg';
    } else {
      return '/downloads/webapp-agent.AppImage';
    }
  }
  
  // Verifica lo stato del lock di un allegato
  async checkAttachmentLock(attachmentId, token) {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/attachment-locks/${attachmentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error checking attachment lock:', error);
      return { success: 0, hasLock: false, lockInfo: null };
    }
  }
  
  // Force release di un lock (per admin)
  async forceReleaseLock(attachmentId, token) {
    try {
      const response = await axios.delete(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/attachment-locks/${attachmentId}/force`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error force releasing lock:', error);
      throw error;
    }
  }
}

// Singleton
export default new LocalAgentService();