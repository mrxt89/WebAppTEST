import React, { useState, useRef, useEffect } from 'react';
import Modal from 'react-modal';
import ChatTopBar from './ChatTopBar';
import ChatBottomBar from './ChatBottomBar';
import ChatLayout from './ChatLayout';
// Utilizziamo AttachmentsList al posto di AttachmentsPanel per evitare problemi di importazione
import AttachmentsList from './AttachmentsList';
import AttachmentUploader from './AttachmentUploader';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';
import { swal } from '../../lib/common';
import { Paperclip, X, ChevronRight, ChevronLeft } from 'lucide-react';

Modal.setAppElement('#root');

const NewMessageModal = ({ isOpen, onRequestClose, sidebarVisible, openChatModal, reply, type, notificationCategoryId }) => {
  const { sendNotification, fetchUsers, fetchResponseOptions, notificationAttachments } = useNotifications();
  
  // Utilizziamo useState per questi valori per assicurarci di avere dei valori iniziali validi
  const [users, setUsers] = useState([]);
  const [responseOptions, setResponseOptions] = useState([]);
  
  const [title, setTitle] = useState('');
  const [receivers, setReceivers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [fetchedUsers, setFetchedUsers] = useState([]);
  const [fetchedResponseOptions, setFetchedResponseOptions] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Inizialmente chiusa, ora è per gli allegati
  const [isMobile, setIsMobile] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [attachmentsLoaded, setAttachmentsLoaded] = useState(false);
  const [currentNotificationCategoryId, setCurrentNotificationCategoryId] = useState(notificationCategoryId);
  const [modalStyle, setModalStyle] = useState({});
  const chatListRef = useRef(null);

  // Funzione per caricare gli utenti
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await fetchUsers();
        if (usersData) {
          setUsers(usersData);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    const loadResponseOptions = async () => {
      try {
        const options = await fetchResponseOptions();
        if (options) {
          setResponseOptions(options);
        }
      } catch (error) {
        console.error('Error fetching response options:', error);
      }
    };

    if (isOpen) {
      loadUsers();
      loadResponseOptions();
    }
  }, [isOpen, fetchUsers, fetchResponseOptions]);

  // Controlla se il dispositivo è mobile e aggiorna lo stile del modale di conseguenza
  useEffect(() => {
    const updateModalStyle = () => {
      const screenWidth = window.innerWidth;
      const isVeryNarrow = screenWidth <= 480;
      const isMobileDevice = screenWidth <= 768;
      setIsMobile(isMobileDevice);

      if (isVeryNarrow || isMobileDevice) {
        // Stile per dispositivi mobili e molto stretti
        setModalStyle({
          overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 2000
          },
          content: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: 'none',
            background: '#fff',
            overflow: 'hidden',
            width: '100%',
            height: '100%',
            padding: 0,
            margin: 0,
            borderRadius: 0,
            transform: 'none'
          }
        });
      } else {
        // Stile per desktop
        const sidebarOffset = sidebarVisible ? 350 : 0;
        const horizontalPadding = Math.min(150, screenWidth * 0.1);
        
        setModalStyle({
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 1000
          },
          content: {
            position: 'absolute',
            top: '50%',
            left: `${horizontalPadding}px`,
            right: `${sidebarOffset + horizontalPadding}px`,
            transform: 'translateY(-50%)',
            height: '80%',
            width: 'calc(100% - ${horizontalPadding * 2 + sidebarOffset}px)',
            padding: '0',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(10px)',
            overflow: 'hidden'
          }
        });
      }
    };

    updateModalStyle();
    window.addEventListener('resize', updateModalStyle);
    return () => window.removeEventListener('resize', updateModalStyle);
  }, [sidebarVisible]);

  // useEffect per gestire il reset
useEffect(() => {
  // Funzione per resettare tutti gli stati del modale
  const handleReset = () => {
    resetFields();
  };

  // Ascolta l'evento reset-new-message-modal
  document.addEventListener('reset-new-message-modal', handleReset);

  // Cleanup
  return () => {
    document.removeEventListener('reset-new-message-modal', handleReset);
  };
}, []);

  // Update receivers list based on recipientsJSON in responseOptions
  useEffect(() => {
    if (notificationCategoryId && responseOptions?.length > 0) {
      const currentResponseOption = responseOptions.find(option => option.notificationCategoryId == notificationCategoryId);
      
      if (currentResponseOption && currentResponseOption.recipientsJSON) {
        try {
          const parsedRecipients = JSON.parse(currentResponseOption.recipientsJSON).map(recipient => recipient.userId.toString());
          setReceivers(parsedRecipients);
        } catch (e) {
          console.error('Errore nel parsing dei destinatari:', e);
          setReceivers([]);
        }
      } else {
        setReceivers([]);
      }
    }
  }, [notificationCategoryId, responseOptions]);

  const resetFields = () => {
    setTitle('');
    setReceivers([]);
    setMessages([]);
    setCurrentNotificationCategoryId(notificationCategoryId || 1);
  };

  useEffect(() => {
    if (!isOpen) {
      // Resetta i campi quando il modale viene chiuso
      resetFields();
    }
  }, [isOpen]);
  
  const handleSend = async (notificationData) => {
    if (!notificationData.title || !notificationData.message) {
      swal.fire('Errore', 'Assicurati che tutti i campi siano compilati', 'error');
      return;
    }
    
    if (!notificationData.receiversList && currentNotificationCategoryId == 1) {
      swal.fire('Errore', 'Seleziona almeno un destinatario', 'error');
      return;
    }
  
    const updatedNotificationData = {
      ...notificationData,
      notificationCategoryId: currentNotificationCategoryId || 1
    };

    try {
      const newNotification = await sendNotification(updatedNotificationData);
      if (newNotification) {
        // Prima resetta i campi
        resetFields();
        // Poi chiudi il modale
        onRequestClose(); 
        // Infine apri la nuova chat
        openChatModal(newNotification.notificationId);
      }
    } catch (error) {
      console.error('Errore nell\'invio del messaggio:', error);
      swal.fire('Errore', 'Si è verificato un errore durante l\'invio del messaggio', 'error');
    }
  };

  // Update receivers list based on recipientsJSON in responseOptions
  useEffect(() => {
    if (currentNotificationCategoryId && responseOptions?.length > 0) {
      const currentResponseOption = responseOptions.find(option => option.notificationCategoryId == currentNotificationCategoryId);
      
      if (currentResponseOption && currentResponseOption.recipientsJSON) {
        try {
          const parsedRecipients = JSON.parse(currentResponseOption.recipientsJSON).map(recipient => recipient.userId.toString());
          setReceivers(parsedRecipients);
        } catch (e) {
          console.error('Errore nel parsing dei destinatari:', e);
          setReceivers([]);
        }
      } else {
        setReceivers([]);
      }
    }
  }, [currentNotificationCategoryId, responseOptions]);

  // funzione per aggiornare il notificationCategoryId
  const handleUpdateCategoryId = (newCategoryId) => {
    setCurrentNotificationCategoryId(newCategoryId);
    
    // Possiamo anche aggiornare altre proprietà in base alla categoria,
    // come ad esempio il colore o il titolo predefinito
    const selectedCategory = responseOptions.find(o => o.notificationCategoryId == newCategoryId);
    if (selectedCategory && selectedCategory.defaultTitle && !title) {
      setTitle(selectedCategory.defaultTitle);
    }
  };

  const handleReceiversUpdate = (updatedList) => {
    // Converti sempre updatedList in array se non lo è già
    const newList = Array.isArray(updatedList) ? updatedList : updatedList.split('-');
    setReceivers(newList);
  };
  
  // Ottieni una categoria dal responseOptions per il colore
  const getCurrentCategoryColor = () => {
    if (currentNotificationCategoryId && responseOptions?.length > 0) {
      const category = responseOptions.find(option => option.notificationCategoryId == currentNotificationCategoryId);
      return category?.hexColor || '#3b82f6';
    }
    return '#3b82f6';
  };
  
  const hexColor = getCurrentCategoryColor();
  
  // Gestisce il caricamento di un allegato
  const handleAttachmentUploaded = () => {
    // Aggiorna lo stato di caricamento allegati
    setAttachmentsLoaded(true);
  };

  // Assicurati che users sia un array prima di applicare .filter
  const filteredUsers = Array.isArray(users) ? users.filter(user => !user.userDisabled) : [];

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      shouldCloseOnOverlayClick={false}
      shouldCloseOnEsc={false}
      contentLabel="New Message Modal"
      style={modalStyle}
    >
      <div className="flex flex-col justify-between w-full h-full">
      <ChatTopBar 
          title={title} 
          setTitle={setTitle} 
          closeChat={onRequestClose} 
          users={filteredUsers}
          isNewMessage={true}
          updateReceiversList={handleReceiversUpdate}
          hexColor={hexColor}
          notificationCategoryId={currentNotificationCategoryId}  // Usiamo lo stato aggiornato
          notificationCategoryName={responseOptions.find(o => o.notificationCategoryId == currentNotificationCategoryId)?.name}
          receiversList={receivers.join('-')}
          onUpdateCategoryId={handleUpdateCategoryId}  // Passiamo la funzione per aggiornare il valore
        />
        
        <div className="flex-1 flex overflow-hidden relative">


          {/* Main chat area */}
          <div 
            className={`flex-1 overflow-hidden transition-all`}
            style={{ 
              marginLeft: isSidebarOpen ? (isMobile ? '0' : '18rem') : '0',
              opacity: isMobile && isSidebarOpen ? 0.3 : 1 
            }}
          >
            <div className="flex flex-col h-full">
              {/* Area per visualizzare i destinatari selezionati */}
              {receivers.length > 0 && (
                <div className="p-2 bg-gray-50 border-b flex flex-wrap gap-1">
                  <div className="flex items-center">
                    <span className="text-xs text-gray-600 mr-2">Destinatari:</span>
                    <div className="flex flex-wrap gap-1 max-w-[600px] overflow-hidden">
                      {receivers.length <= 3 ? (
                        receivers.map(userId => {
                          const user = users.find(u => u.userId == userId);
                          if (!user) return null;
                          return (
                            <span key={userId} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              {user.firstName} {user.lastName}
                            </span>
                          );
                        })
                      ) : (
                        <>
                          {receivers.slice(0, 2).map(userId => {
                            const user = users.find(u => u.userId == userId);
                            if (!user) return null;
                            return (
                              <span key={userId} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                {user.firstName} {user.lastName}
                              </span>
                            );
                          })}
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                            +{receivers.length - 2} altri
                          </span>
                        </>
                      )}
                    </div>
                    <button 
                      className="ml-2 text-xs text-blue-600 hover:underline"
                      onClick={() => setTitle(document.querySelector('[data-info-button]')?.click())} // Apre il menu info
                    >
                      Modifica
                    </button>
                  </div>
                </div>
              )}
              
              {/* Chat layout che mostra un messaggio placeholder quando vuoto */}
              <div className="flex-1 overflow-y-auto" ref={chatListRef}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                    <div className="bg-gray-100 rounded-full p-6 mb-4">
                      <div style={{ color: hexColor }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                          <line x1="9" y1="10" x2="15" y2="10"></line>
                          <line x1="12" y1="7" x2="12" y2="13"></line>
                        </svg>
                      </div>
                    </div>
                    <p className="text-center text-lg font-medium mb-2">Nuovo messaggio</p>
                    <p className="text-center text-sm max-w-md">
                      Compila il titolo, seleziona i destinatari dal menu info (in alto a destra) e scrivi il tuo messaggio.
                      {!isSidebarOpen && (
                        <span> Se necessario, puoi aggiungere degli allegati cliccando sul pulsante a sinistra.</span>
                      )}
                    </p>
                  </div>
                ) : (
                  <ChatLayout 
                    messages={messages}
                    sending={sending}
                    notificationId={0}
                    isReadByUser={false}
                    chatListRef={chatListRef}
                    membersInfo={[]}
                    updateReceiversList={handleReceiversUpdate}
                    users={filteredUsers}
                    currentUser={null}
                    receivers={receivers.join('-')}
                    hexColor={hexColor}
                    title={title}
                    notificationCategoryId={notificationCategoryId}
                    notificationCategoryName={responseOptions.find(o => o.notificationCategoryId == notificationCategoryId)?.name}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        
        <ChatBottomBar 
          notificationId={0} 
          title={title} 
          notificationCategoryId={currentNotificationCategoryId}  // Usiamo lo stato aggiornato
          responseOptions={responseOptions}
          receiversList={receivers.join('-')} 
          users={filteredUsers}
          updateReceiversList={handleReceiversUpdate}
          setSending={setSending}
          onSend={handleSend}
          isNewMessage={true}
          replyToMessage={replyToMessage}
          setReplyToMessage={setReplyToMessage}
          hexColor={hexColor}
          onRequestClose={onRequestClose}
          openChatModal={openChatModal}    
        />
      </div>
    </Modal>
  );
};

export default NewMessageModal;