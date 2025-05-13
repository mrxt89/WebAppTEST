import React, { useState, useEffect, useRef } from 'react';
import Modal from 'react-modal';
import { CheckCircle, XCircle, AlertTriangle, Clock, AtSign, Smile } from 'lucide-react';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';
import { swal } from '../../lib/common';
import EmojiPicker from './Emoji-picker';
import '@/styles/chat-components.css';

Modal.setAppElement('#root');

const EditMessageModal = ({ isOpen, onClose, message, onMessageUpdated, users = [] }) => {
  const { users: contextUsers } = useNotifications();
  const [loadedUsers, setLoadedUsers] = useState(users || []);
  const [editedMessage, setEditedMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionIndex, setMentionIndex] = useState(null);
  const [cursorPosition, setCursorPosition] = useState(null);
  
  const textareaRef = useRef(null);
  
  const { editMessage } = useNotifications();
  
  useEffect(() => {
    if (message && message.message) {
      setEditedMessage(message.message);
    }
  }, [message]);
  
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          textareaRef.current.value.length,
          textareaRef.current.value.length
        );
      }, 100);
    }
  }, [isOpen]);

useEffect(() => {
  // Usa gli utenti già presenti nel contesto senza chiamare fetchUsers
  if (contextUsers && contextUsers.length > 0) {
    setLoadedUsers(contextUsers.filter(user => !user.userDisabled));
  }
  
}, [contextUsers]);
  
  const handleTextChange = (e) => {
    const value = e.target.value;
    setEditedMessage(value);
    
    // Gestione delle menzioni
    const mentionTriggerIndex = value.lastIndexOf('@', value.length - 1);
    if (mentionTriggerIndex > -1) {
      const mentionQuery = value.slice(mentionTriggerIndex + 1).toLowerCase();
      if (mentionQuery) {
        const filteredUsers = loadedUsers.filter(user => 
          user.username?.toLowerCase().startsWith(mentionQuery)
        );
        setMentionSuggestions(filteredUsers);
        setMentionIndex(mentionTriggerIndex);
      } else {
        setMentionSuggestions([]);
        setMentionIndex(null);
      }
    } else {
      setMentionSuggestions([]);
      setMentionIndex(null);
    }
  };
  
  const handleMentionClick = (user) => {
    if (mentionIndex === null) return;
    
    // Ottieni il testo della query dopo il simbolo @
    const queryText = editedMessage.slice(mentionIndex).split(/\s+/)[0];
    
    // Calcola il nuovo messaggio con la menzione
    // Rimuove la parte di query digitata (@ila) e la sostituisce con la menzione completa
    const beforeMention = editedMessage.slice(0, mentionIndex);
    const afterMention = editedMessage.slice(mentionIndex + queryText.length);
    const mention = `@${user.username} `;
    const newMessage = beforeMention + mention + afterMention;
    
    // Imposta il messaggio modificato
    setEditedMessage(newMessage);
    
    // Calcola la nuova posizione del cursore
    const newPosition = mentionIndex + mention.length;
    
    // Aggiorna il focus e il cursore
    if (textareaRef.current) {
      setTimeout(() => {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }, 10);
    }
    
    // Reimposta i suggerimenti di menzione
    setMentionSuggestions([]);
    setMentionIndex(null);
  };
  
  const handleEmojiSelect = (emoji) => {
    // Ottiene la posizione corrente del cursore
    const cursorPos = textareaRef.current.selectionStart;
    
    // Inserisce l'emoji nella posizione del cursore
    const before = editedMessage.slice(0, cursorPos);
    const after = editedMessage.slice(cursorPos);
    const newMessage = before + emoji + after;
    
    // Aggiorna lo stato del messaggio
    setEditedMessage(newMessage);
    
    // Riposiziona il cursore dopo l'emoji
    const newCursorPos = cursorPos + emoji.length;
    setTimeout(() => {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };
  
  const handleSaveEdit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      if (!editedMessage.trim()) {
        setError('Il messaggio non può essere vuoto');
        return;
      }
      
      // Non modificare se il messaggio non è cambiato
      if (editedMessage === message.message) {
        onClose();
        return;
      }
      
      const result = await editMessage(message.messageId, editedMessage);
      
      if (result && result.success) {
        // Emetti l'evento di aggiornamento con l'ID della notifica
        const event = new CustomEvent('message-updated', { 
          detail: { 
            notificationId: result.notificationId,
            messageId: message.messageId 
          } 
        });
        document.dispatchEvent(event);
        
        // Chiama la callback se esiste
        if (typeof onMessageUpdated === 'function') {
          onMessageUpdated(result.notificationId);
        }
        
        // Chiudi il modale
        onClose();
        
        // Feedback positivo all'utente
        swal.fire({
          title: 'Messaggio aggiornato',
          text: 'Il messaggio è stato modificato con successo',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        throw new Error(result?.message || 'Errore durante la modifica del messaggio');
      }
    } catch (error) {
      console.error('Errore durante il salvataggio delle modifiche:', error);
      setError(error.message || 'Si è verificato un errore durante la modifica del messaggio');
      
      swal.fire({
        title: 'Errore',
        text: error.message || 'Si è verificato un errore durante la modifica del messaggio',
        icon: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleKeyDown = (e) => {
    // Ctrl+Enter o Cmd+Enter per salvare
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    }
    
    // Escape per annullare
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Modifica messaggio"
      className="edit-message-modal-content"
      overlayClassName="edit-message-modal-overlay"
      shouldCloseOnOverlayClick={!submitting}
      shouldCloseOnEsc={!submitting}
      style={{
        overlay: {
          zIndex: 9999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        content: {
          position: 'relative',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxHeight: '80vh',
          width: '100%',
          maxWidth: '500px',
          border: 'none',
          borderRadius: '8px',
          outline: 'none',
          padding: '20px',
          backgroundColor: 'white',
          inset: 'auto',
        }
      }}
    >
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center border-b pb-2 mb-4">
          <h3 className="text-lg font-medium">Modifica messaggio</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200"
            disabled={submitting}
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        
        {message && (
          <div className="flex-1 overflow-y-auto">
            {message.isEdited && (
              <div className="mb-4 bg-blue-50 p-2 rounded-md flex items-center">
                <Clock className="h-4 w-4 mr-2 text-blue-500" />
                <span className="text-sm text-blue-700">
                  Questo messaggio è già stato modificato {message.editCount || 1} volt{message.editCount !== 1 ? 'e' : 'a'}
                </span>
              </div>
            )}
            
            <div className="mb-4 relative">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Testo del messaggio
              </label>
              <div className="relative">
                {mentionSuggestions.length > 0 && (
                  <div className="mention-suggestions">
                    {mentionSuggestions.map((user) => (
                      <div
                        key={user.userId}
                        className=""
                        onClick={() => handleMentionClick(user)}
                      >
                        <div className="font-medium">{user.username}</div>
                        <div className="text-xs text-gray-500">{user.role}</div>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={editedMessage}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  className="w-full h-40 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Inserisci il testo del messaggio..."
                  disabled={submitting}
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                  <button 
                    type="button"
                    className="emoji-button p-1 rounded-full hover:bg-gray-100"
                    title="Inserisci emoji"
                  >
                    <div className="emoji-picker-container">
                      <EmojiPicker onChange={handleEmojiSelect} />
                    </div>
                  </button>
                </div>
              </div>
              {error && (
                <div className="mt-2 text-red-600 text-sm flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {error}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Premi Ctrl+Enter per salvare, Esc per annullare
              </p>
              <div className="mt-2 text-xs text-gray-500 flex items-center">
                <AtSign className="h-3 w-3 mr-1" />
                <span>Usa @ per menzionare gli utenti</span>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 transition-colors"
                onClick={onClose}
                disabled={submitting}
              >
                Annulla
              </button>
              <button
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 transition-colors flex items-center"
                onClick={handleSaveEdit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Salva
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default EditMessageModal;