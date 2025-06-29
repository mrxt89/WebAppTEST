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
    const participants = [];
    
    // 1. Aggiungi i partecipanti dell'attività
    if (task?.Participants) {
      try {
        const taskParticipants = typeof task.Participants === 'string' 
          ? JSON.parse(task.Participants) 
          : task.Participants;
        
        if (Array.isArray(taskParticipants)) {
          taskParticipants.forEach(p => {
            const userId = p.userId || p;
            if (userId && !participants.includes(userId)) {
              participants.push(userId);
            }
          });
        }
      } catch (e) {
        console.error("Errore nel parsing dei partecipanti:", e);
      }
    }
    
    // 2. Aggiungi il responsabile dell'attività se non è già presente
    if (task?.AssignedTo && !participants.includes(task.AssignedTo)) {
      participants.push(task.AssignedTo);
    }
    
    // 3. Aggiungi tutti gli admin e manager del progetto
    if (project?.members && Array.isArray(project.members)) {
      project.members.forEach(member => {
        // Aggiungi solo admin e manager
        if ((member.Role === 'ADMIN' || member.Role === 'MANAGER') && 
            member.UserID && 
            !participants.includes(member.UserID)) {
          participants.push(member.UserID);
        }
      });
    }
    
    // 4. Aggiungi il creatore del progetto se non è già presente
    if (project?.TBCreatedId && !participants.includes(project.TBCreatedId)) {
      participants.push(project.TBCreatedId);
    }
    
    // Converti tutti gli ID in stringhe e rimuovi duplicati
    return [...new Set(participants.map(id => String(id)))];
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

  const defaultParticipants = getDefaultParticipants();

  return (
    <DocumentChats.Task
      documentId={task.TaskID}
      documentData={documentData}
      showHeader={false} // Non mostriamo l'header perché siamo già in un tab
      defaultChatTitle={defaultChatTitle}
      defaultParticipants={defaultParticipants}
      defaultCategoryId={1}
      enableAutoLink={true} // Abilita il collegamento automatico
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
        title: "Nessuna chat collegata",
        description: "Non ci sono chat collegate a questa attività",
        createButtonText: "Crea prima chat"
      }}
      className="h-full"
    />
  );
};

export default TaskChatsTab;