// src/pages/progetti/progetti/TaskChatsTab.jsx
import React from "react";
import { DocumentChats } from "@/components/chat/documentChats";

const TaskChatsTab = ({ task, project, onRefresh }) => {
  // Prepara i dati del documento nel formato richiesto
  const documentData = {
    projectId: project?.ProjectID,
    taskId: task?.TaskID,
    Title: task?.Title,
    // Altri dati che potrebbero servire per la visualizzazione
  };

  // Prepara i partecipanti di default per nuove chat
  const getDefaultParticipants = () => {
    const participants = task?.Participants 
      ? JSON.parse(task.Participants).map(p => p.userId) 
      : [];
    
    if (task?.AssignedTo && !participants.includes(task.AssignedTo)) {
      participants.push(task.AssignedTo);
    }
    
    return participants;
  };

  // Titolo di default per nuove chat
  const defaultChatTitle = project && task 
    ? `${project.Name} - ${task.Title}`
    : 'Nuova discussione attività';

  // Se non abbiamo i dati necessari, mostra un placeholder
  if (!task?.TaskID || !project?.ProjectID) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Seleziona un'attività per visualizzare le chat collegate</p>
      </div>
    );
  }

  return (
    <DocumentChats.Task
      documentId={task.TaskID}
      documentData={documentData}
      showHeader={false} // Non mostriamo l'header perché siamo già in un tab
      defaultChatTitle={defaultChatTitle}
      defaultParticipants={getDefaultParticipants()}
      defaultCategoryId={1}
      onChatCreated={(notificationId) => {
        // Callback opzionale quando viene creata una nuova chat
        console.log('Nuova chat creata:', notificationId);
        if (onRefresh) {
          onRefresh();
        }
      }}
      onChatUnlinked={(chat) => {
        // Callback opzionale quando una chat viene scollegata
        console.log('Chat scollegata:', chat);
        if (onRefresh) {
          onRefresh();
        }
      }}
      emptyStateConfig={{
        title: "Nessuna chat collegata",
        description: "Non ci sono chat collegate a questa attività",
        createButtonText: "Crea prima chat"
      }}
      className="h-full"
    />
  );
};

export default TaskChatsTab;