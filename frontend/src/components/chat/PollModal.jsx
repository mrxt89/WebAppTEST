// src/components/chat/PollModal.jsx
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectMessagePoll } from '@/redux/features/notifications/pollsSlice';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';
import PollMessage from './PollMessage';

const PollModal = ({ pollId, messageId, notificationId, currentUserId }) => {
  const [pollData, setPollData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { getNotificationPolls, getPoll } = useNotifications();
  
  // Selettore per ottenere il sondaggio dal Redux store
  const pollFromStore = useSelector(state => 
    selectMessagePoll(state, notificationId, messageId)
  );

  useEffect(() => {
    const loadPollData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Se abbiamo già i dati del sondaggio dallo store, usali
        if (pollFromStore) {
          console.log(`✅ Sondaggio trovato nello store per messaggio ${messageId}:`, pollFromStore);
          setPollData(pollFromStore);
          setLoading(false);
          return;
        }

        // Se abbiamo un pollId specifico, carica quel sondaggio
        if (pollId) {
          console.log(`📊 Caricamento sondaggio ${pollId} dal server...`);
          const poll = await getPoll(pollId);
          if (poll) {
            setPollData(poll);
          } else {
            setError('Sondaggio non trovato');
          }
        } 
        // Altrimenti carica tutti i sondaggi della notifica e trova quello giusto
        else if (notificationId && messageId) {
          console.log(`📊 Caricamento sondaggi per notifica ${notificationId}...`);
          const response = await getNotificationPolls(notificationId);
          const polls = response?.data?.polls || [];
          
          // Trova il sondaggio con questo messageId
          const messagePoll = polls.find(p => p.MessageID === messageId);
          if (messagePoll) {
            console.log(`✅ Trovato sondaggio per messaggio ${messageId}:`, messagePoll);
            setPollData(messagePoll);
          } else {
            console.log(`⚠️ Nessun sondaggio trovato per messaggio ${messageId}`);
            setError('Sondaggio non trovato per questo messaggio');
          }
        } else {
          setError('Dati insufficienti per caricare il sondaggio');
        }
      } catch (err) {
        console.error('Errore nel caricamento del sondaggio:', err);
        setError('Errore nel caricamento del sondaggio');
      } finally {
        setLoading(false);
      }
    };

    loadPollData();
  }, [pollId, messageId, notificationId, pollFromStore, getNotificationPolls, getPoll]);

  // Stati di caricamento ed errore
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-500">Caricamento sondaggio...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!pollData) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">Sondaggio non disponibile</p>
      </div>
    );
  }

  // Renderizza il componente PollMessage con i dati
  return (
    <PollMessage
      poll={pollData}
      currentUserId={currentUserId}
      onUpdate={async (updatedPoll) => {
        setPollData(updatedPoll);
        // Ricarica i sondaggi per aggiornare lo store
        if (notificationId) {
          await getNotificationPolls(notificationId);
        }
      }}
    />
  );
};

export default PollModal;