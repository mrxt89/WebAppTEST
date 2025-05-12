import React, { useState, useEffect, useRef } from 'react';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';
import { Loader2 } from 'lucide-react';

// Raggruppa le reazioni per tipo
const groupReactionsByType = (reactions) => {
  const grouped = {};
  
  if (!reactions || !Array.isArray(reactions) || reactions.length === 0) {
    return {};
  }
  
  reactions.forEach(reaction => {
    if (!grouped[reaction.ReactionType]) {
      grouped[reaction.ReactionType] = [];
    }
    grouped[reaction.ReactionType].push(reaction);
  });
  
  return grouped;
};

const MessageReactions = ({ messageId, notificationId, onReactionUpdated }) => {
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); 
  const { getMessageReactions, toggleMessageReaction, removeMessageReaction } = useNotifications();
  
  // Riferimento per gestire l'intervallo di polling
  const pollingIntervalRef = useRef(null);
  // Riferimento alle reazioni correnti per confronto
  const currentReactionsRef = useRef([]);
  
  // Ottieni l'ID dell'utente corrente
  const getCurrentUserId = () => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const parsedUser = JSON.parse(user);
        return parsedUser.UserId;
      } catch (e) {
        console.error('Error parsing user from localStorage', e);
      }
    }
    return null;
  };
  
  const currentUserId = getCurrentUserId();
  
  // Carica le reazioni per il messaggio
  const loadReactions = async (silent = false) => {
    if (!messageId) {
      console.error('No messageId provided to loadReactions');
      return;
    }
    
    try {
      if (!silent) {
        setLoading(true);
      }
      
      if (!getMessageReactions) {
        console.error('getMessageReactions function not available');
        if (!silent) setLoading(false);
        return;
      }
      
      const result = await getMessageReactions(messageId);
      
      if (result && Array.isArray(result)) {
        // Controlla se ci sono cambiamenti
        const hasChanges = JSON.stringify(result) !== JSON.stringify(currentReactionsRef.current);
        
        if (hasChanges) {
          setReactions(result);
          currentReactionsRef.current = result;
          
          if (onReactionUpdated && !silent) {
            onReactionUpdated();
          }
        }
      } else {
        console.warn('No reactions returned from API or invalid format');
        setReactions([]);
        currentReactionsRef.current = [];
      }
    } catch (err) {
      console.error('Error loading reactions:', err);
      if (!silent) {
        setError('Error loading reactions');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };
  
  // Imposta l'intervallo di polling all'avvio
  useEffect(() => {
    if (messageId) {
      // Carica le reazioni all'avvio
      loadReactions();
      
      // Imposta un intervallo per il polling (ogni 10 secondi)
      pollingIntervalRef.current = setInterval(() => {
        loadReactions(true);
      }, 10000);
    }
    
    // Pulisci l'intervallo quando il componente si smonta
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [messageId]);
  
  // Carica le reazioni anche quando cambia il refreshKey
  useEffect(() => {
    if (messageId && refreshKey > 0) {
      loadReactions();
    }
  }, [refreshKey]);
  
  // Ascolta gli aggiornamenti delle reazioni da eventi
  useEffect(() => {
    const handleReactionUpdate = (event) => {
      const eventMessageId = event.detail?.messageId;
      const eventNotificationId = event.detail?.notificationId;
      
      if (eventMessageId === messageId || (eventNotificationId && eventNotificationId === notificationId)) {
  
        setRefreshKey(prevKey => prevKey + 1);
      }
    };
    
    document.addEventListener('message-reaction-updated', handleReactionUpdate);
    
    return () => {
      document.removeEventListener('message-reaction-updated', handleReactionUpdate);
    };
  }, [messageId, notificationId]);
  
  // Gestisce il clic su una reazione
  const handleReactionClick = async (reactionType, userReactionId = null) => {
    try {
      setLoading(true);
      
      if (!toggleMessageReaction) {
        throw new Error('toggleMessageReaction function not available');
      }
      
      // Importante: verifica se l'utente sta cliccando sulla SUA reazione
      // (in quel caso rimuovila) oppure su una reazione altrui (non fare nulla)
      if (userReactionId) {
        // L'utente ha già questa reazione (è la sua), quindi rimuovila
        if (removeMessageReaction) {
          await removeMessageReaction(userReactionId);
        } else {
          // Fallback al toggle se removeMessageReaction non è disponibile
          await toggleMessageReaction(messageId, reactionType);
        }
      } else {
        // L'utente non ha questa reazione, aggiungiamola (ma solo se non ha già un'altra reazione)
        const userHasAnyReaction = Object.values(groupReactionsByType(reactions)).some(
          reactorGroup => reactorGroup.some(reactor => reactor.UserID === currentUserId)
        );
        
        if (!userHasAnyReaction) {
          await toggleMessageReaction(messageId, reactionType);
        } else {
          // L'utente ha già una reazione diversa, non fare nulla

          setLoading(false);
          return;
        }
      }
      
      // Ricarica le reazioni
      await loadReactions();
      
      if (onReactionUpdated) {
        onReactionUpdated();
      }
      
      // Invia evento di aggiornamento
      const event = new CustomEvent('message-reaction-updated', { 
        detail: { messageId, notificationId } 
      });
      document.dispatchEvent(event);
      
    } catch (err) {
      console.error('Error handling reaction click:', err);
      setError('Error updating reaction');
    } finally {
      setLoading(false);
    }
  };
  
  // Raggruppa le reazioni per tipo
  const groupedReactions = groupReactionsByType(reactions);
  
  if (loading && reactions.length === 0) {
    return <div className="flex justify-center py-1"><Loader2 className="h-4 w-4 animate-spin text-gray-400" /></div>;
  }
  
  if (error && reactions.length === 0) {
    return <div className="text-xs text-red-500">{error}</div>;
  }
  
  if (!reactions || reactions.length === 0) {
    return null;
  }
  
  return (
    <div className={`message-reactions flex flex-wrap gap-1 mt-1 ${loading ? 'opacity-60' : ''}`}>
      {Object.entries(groupedReactions).map(([reactionType, reactors]) => {
        // Trova la reazione dell'utente corrente, se presente
        const userReaction = reactors.find(r => r.UserID === currentUserId);
        const hasCurrentUserReacted = !!userReaction;
        
        // Crea una lista di utenti per il tooltip
        const userNames = reactors.map(r => r.UserName).join(', ');
        
        return (
          <button
            key={reactionType}
            className={`reaction-badge flex items-center rounded-full px-1.5 py-0.5 text-xs ${
              hasCurrentUserReacted ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-black'
            }`}
            onClick={() => handleReactionClick(
              reactionType, 
              hasCurrentUserReacted ? userReaction.ReactionID : null // Passa l'ID solo se è la propria reazione
            )}
            title={userNames}
            disabled={loading}
          >
            <span className="mr-1">{reactionType}</span>
            <span className="reaction-count">{reactors.length}</span>
          </button>
        );
      })}
    </div>
  );
};

export default MessageReactions;