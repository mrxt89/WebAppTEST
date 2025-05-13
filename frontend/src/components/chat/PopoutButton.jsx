// src/components/chat/PopoutButton.jsx
import React, { useCallback, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useNotifications } from '../../redux/features/notifications/notificationsHooks';
import { swal } from '../../lib/common';

const PopoutButton = ({ notificationId, title, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { registerStandaloneChat, isStandaloneChat, openChatInNewWindow } = useNotifications();
  
  const handlePopout = useCallback(async () => {
    // Evita doppi clic
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      // Verifica se questo id di notifica è valido
      if (!notificationId) {
        console.error('ID notifica mancante per PopoutButton');
        throw new Error('ID notifica mancante');
      }
      
      console.log(`Tentativo di apertura chat ${notificationId} in finestra separata`);
      
      // Verifica se la chat è già aperta in una finestra separata
      if (isStandaloneChat && isStandaloneChat(notificationId)) {
        console.log(`Chat ${notificationId} già aperta in finestra separata, tentativo di focus`);
        
        // Tenta di trovare e attivare la finestra esistente
        const windowName = `chat_${notificationId}`;
        const existingWindow = window.open('', windowName);
        
        if (existingWindow && !existingWindow.closed && existingWindow.location.href !== 'about:blank') {
          existingWindow.focus();
          
          // Chiudi il modale principale se richiesto
          if (onSuccess && typeof onSuccess === 'function') {
            console.log('Chiusura modale principale dopo focus su finestra esistente');
            onSuccess();
          }
          
          setIsLoading(false);
          return;
        }
        
        console.log(`Finestra esistente non trovata, creazione nuova finestra`);
      }
      
      // Registra la chat come aperta in finestra separata prima di aprirla
      if (registerStandaloneChat) {
        registerStandaloneChat(notificationId);
      }
      
      // Prepara URL e dimensioni ottimali
      const url = `/standalone-chat/${notificationId}`;
      
      // Dimensiona la finestra in modo ottimale
      const width = Math.min(window.innerWidth * 0.8, 1200);
      const height = Math.min(window.innerHeight * 0.8, 800);
      
      // Centra la finestra rispetto alla finestra principale
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      // Configura il nome e parametri finestra
      const windowName = `chat_${notificationId}`;
      const windowFeatures = [
        `width=${Math.floor(width)}`,
        `height=${Math.floor(height)}`,
        `left=${Math.floor(left)}`,
        `top=${Math.floor(top)}`,
        'resizable=yes',
        'scrollbars=yes',
        'status=yes',
        'location=yes',
        'toolbar=no',
        'menubar=no'
      ].join(',');
      
      // Apri la nuova finestra
      const newWindow = window.open(url, windowName, windowFeatures);
      
      // Controlla se la finestra è stata bloccata dal browser
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        throw new Error('Il browser ha bloccato l\'apertura della nuova finestra');
      }
      
      // Se l'apertura ha avuto successo e abbiamo una callback, chiama la funzione per chiudere il modale
      if (onSuccess && typeof onSuccess === 'function') {
        console.log('Chiusura modale principale dopo apertura nuova finestra');
        onSuccess();
      }
      
      // Prova a impostare il focus sulla nuova finestra dopo un breve ritardo
      setTimeout(() => {
        if (newWindow && !newWindow.closed) {
          try {
            newWindow.focus();
          } catch (e) {
            console.warn('Errore durante il focus della finestra:', e);
          }
        }
      }, 300);
      
      console.log(`Finestra standalone aperta con successo per chat ${notificationId}`);
    } catch (error) {
      console.error('Errore durante apertura finestra standalone:', error);
      
      // Se la finestra è stata bloccata, mostra un messaggio specifico
      if (error.message.includes('bloccato')) {
        swal.fire({
          icon: 'warning',
          title: 'Popup bloccato',
          text: 'Il browser ha bloccato l\'apertura della nuova finestra. Abilita i popup per questo sito.',
          confirmButtonText: 'OK'
        });
      } else {
        // Messaggio generico per altri errori
        swal.fire({
          icon: 'error',
          title: 'Errore',
          text: 'Si è verificato un errore durante l\'apertura della chat in una nuova finestra.',
          timer: 3000,
          showConfirmButton: false
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [notificationId, title, isLoading, registerStandaloneChat, isStandaloneChat, onSuccess]);
  
  // Componente ottimizzato che mostra un loader durante il caricamento
  return (
    <button
      onClick={handlePopout}
      className="p-2 rounded-full hover:bg-gray-200 transition-colors relative"
      title="Apri in finestra separata"
      data-testid="popout-button"
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
      ) : (
        <ExternalLink className="w-4 h-4 text-gray-600" />
      )}
    </button>
  );
};

export default PopoutButton;