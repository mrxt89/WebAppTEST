import React from 'react';
import { DocumentChats } from '@/components/chat/documentChats';

const IntercompanyChatsTab = ({ selectedRequest, onRefresh }) => {
  // Prepara i dati del documento nel formato richiesto
  const documentData = {
    referenceId: selectedRequest?.ReferenceId,
    componentCode: selectedRequest?.ComponentCode,
    componentDescription: selectedRequest?.ComponentDescription,
    sourceCompanyId: selectedRequest?.SourceCompanyId,
    targetCompanyId: selectedRequest?.TargetCompanyId,
  };

  // Prepara i partecipanti di default per nuove chat
  const getDefaultParticipants = () => {
    const participants = [];
    
    // Per ora non aggiungiamo partecipanti di default
    // L'utente li selezionerà manualmente come richiesto
    
    return participants;
  };

  // Titolo di default per nuove chat
  const defaultChatTitle = selectedRequest 
    ? `Chat Intercompany - ${selectedRequest.ComponentCode}`
    : 'Nuova chat intercompany';

  // Se non abbiamo i dati necessari, mostra un placeholder
  if (!selectedRequest?.ReferenceId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 p-8">
        <p>Seleziona una richiesta per visualizzare le chat collegate</p>
      </div>
    );
  }

  const defaultParticipants = getDefaultParticipants();

  return (
    <DocumentChats.Generic
      documentType="IntercompanyReference"
      documentId={selectedRequest.ReferenceId}
      documentData={documentData}
      showHeader={false} // Non mostriamo l'header perché siamo già in un tab
      defaultChatTitle={defaultChatTitle}
      defaultParticipants={defaultParticipants}
      defaultCategoryId={1} // Userà la categoria intercompany se disponibile
      enableAutoLink={true} // Abilita il collegamento automatico
      allowMultipleChats={true} // Permetti multiple chat per reference
      onChatCreated={(notificationId) => {
        // Callback opzionale quando viene creata una nuova chat
        if (onRefresh) {
          onRefresh();
        }
      }}
      onChatUnlinked={(chat) => {
        // Callback opzionale quando una chat viene scollegata
        if (onRefresh) {
          onRefresh();
        }
      }}
      emptyStateConfig={{
        title: 'Nessuna chat collegata',
        description: 'Non ci sono chat collegate a questa richiesta intercompany',
        createButtonText: 'Crea prima chat'
      }}
      className="h-full"
      maxHeight="none"
      minHeight="400px"
    />
  );
};

export default IntercompanyChatsTab;

