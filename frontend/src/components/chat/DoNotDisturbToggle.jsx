// components/chat/DoNotDisturbToggle.jsx
import React, { useState, useEffect } from 'react';
import { BellOff, Bell, Info } from 'lucide-react';
import { Switch } from '../ui/switch';
import notificationService from '../../services/notifications/NotificationService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import axios from 'axios';
import { config } from '../../config';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';

const DoNotDisturbToggle = () => {
  const [enabled, setEnabled] = useState(notificationService.isInDoNotDisturbMode());
  const [isUpdating, setIsUpdating] = useState(false);
  const {
    loadNotifications,
    reloadNotifications,
    restartNotificationWorker
  } = useNotifications();
  
  // Effetto per sincronizzare lo stato con il servizio
  useEffect(() => {
    // Funzione per aggiornare lo stato dal servizio
    const updateFromService = (event) => {
      if (event && event.detail) {
        setEnabled(event.detail.enabled);
      } else {
        setEnabled(notificationService.isInDoNotDisturbMode());
      }
    };
    
    // Registra l'event listener per gli aggiornamenti di DND
    document.addEventListener('doNotDisturbChanged', updateFromService);
    
    // Pulisci l'event listener
    return () => {
      document.removeEventListener('doNotDisturbChanged', updateFromService);
    };
  }, []);
  
  // Nuovo listener per il reset forzato delle notifiche
  useEffect(() => {
    const handleForceReset = (event) => {
      console.log("Ricevuto evento di reset forzato delle notifiche");
      
      // Forza un ricaricamento completo delle notifiche dal server
      if (loadNotifications) {
        setTimeout(() => {
          loadNotifications();
        }, 500);
      }
    };
    
    document.addEventListener('forceNotificationReset', handleForceReset);
    
    return () => {
      document.removeEventListener('forceNotificationReset', handleForceReset);
    };
  }, [loadNotifications]);
  
  // Effetto per sincronizzare con il server, se necessario
  useEffect(() => {
    // Ottieni lo stato dal server
    const fetchDndStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await axios.get(`${config.API_BASE_URL}/do-not-disturb/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data && response.data.success) {
          // Aggiorna lo stato locale e il servizio se diverso
          if (response.data.enabled !== enabled) {
            setEnabled(response.data.enabled);
            notificationService.setDoNotDisturbSetting(response.data.enabled);
          }
        }
      } catch (error) {
        console.error('Error fetching Do Not Disturb status:', error);
      }
    };
    
    fetchDndStatus();
  }, [enabled]);
  
  // Gestisci il cambio dello stato con un approccio più aggressivo
  const handleToggle = async () => {
    try {
      if (isUpdating) return; // Previene doppi click
      setIsUpdating(true);
      
      const newState = !enabled;
      console.log(`Cambiando stato Non Disturbare: ${enabled} -> ${newState}`);
      
      // Aggiorna prima l'interfaccia per un feedback immediato
      setEnabled(newState);
      
      // Aggiorna il servizio di notifica
      notificationService.setDoNotDisturbSetting(newState);
      
      // Sincronizza con il server
      const token = localStorage.getItem('token');
      if (token) {
        await axios.post(`${config.API_BASE_URL}/do-not-disturb/toggle`, 
          { enabled: newState },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      // Se stiamo disattivando "Non disturbare", assicuriamoci che TUTTO venga resettato
      if (!newState) {
        console.log("Disattivazione Non Disturbare - Esecuzione reset completo");
        
        // Prima verifica se il metodo esiste per evitare errori
        if (typeof notificationService.resetService === 'function') {
          try {
            notificationService.resetService();
          } catch (e) {
            console.error("Errore durante il reset del servizio di notifica:", e);
          }
        }
        
        // Forza un ricaricamento delle notifiche dal server
        if (loadNotifications) {
          setTimeout(() => {
            console.log("Ricaricamento notifiche dal server...");
            try {
              loadNotifications();
            } catch (e) {
              console.error("Errore durante il ricaricamento delle notifiche:", e);
            }
          }, 300);
        }
        
        // Forza un ricaricamento ad alta priorità
        if (reloadNotifications) {
          setTimeout(() => {
            console.log("Ricaricamento notifiche con alta priorità...");
            try {
              reloadNotifications(true);
            } catch (e) {
              console.error("Errore durante il ricaricamento prioritario:", e);
            }
          }, 500);
        }
        
        // Come ultima risorsa, riavviamo il worker delle notifiche se il metodo esiste
        if (restartNotificationWorker) {
          setTimeout(() => {
            console.log("Riavvio worker delle notifiche...");
            try {
              restartNotificationWorker(true);
            } catch (e) {
              console.error("Errore durante il riavvio del worker:", e);
            }
          }, 800);
        } else {
          console.warn("Impossibile riavviare il worker delle notifiche: metodo non disponibile");
        }
      }
      
      setIsUpdating(false);
    } catch (error) {
      console.error('Error toggling Do Not Disturb mode:', error);
      // Ripristina lo stato precedente in caso di errore
      setEnabled(!enabled);
      setIsUpdating(false);
    }
  };
  
  return (
    <div className="flex items-center justify-between space-y-2 mb-2">
      <div className="flex items-center space-x-2">
        {enabled ? (
          <BellOff className="h-5 w-5 text-red-500" />
        ) : (
          <Bell className="h-5 w-5 text-gray-600" />
        )}
        <span className={`text-sm font-medium ${enabled ? 'text-red-500' : 'text-gray-700'}`}>
          Non disturbare
        </span>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                Quando attivo, non riceverai notifiche push. 
                <strong> I messaggi ricevuti durante questo periodo non genereranno notifiche</strong> anche dopo la disattivazione.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <Switch
        checked={enabled}
        onChange={handleToggle}
        className={`${enabled ? 'bg-red-500' : ''} ${isUpdating ? 'opacity-50' : ''}`}
        aria-label="Toggle Do Not Disturb mode"
        disabled={isUpdating}
      />
    </div>
  );
};

export default DoNotDisturbToggle;