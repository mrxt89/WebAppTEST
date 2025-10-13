import React from 'react'; // IMPORTANTE: Aggiungi questo import

// Componente principale
export { default as GenericDocumentChats } from './GenericDocumentChats';

// Componenti di supporto
export { default as DocumentChatList } from './components/DocumentChatList';
export { default as DocumentChatItem } from './components/DocumentChatItem';

// Hook personalizzato
export { default as useDocumentChats } from './hooks/useDocumentChats';

// Configurazioni e utility
export { 
  DOCUMENT_TYPES, 
  getDocumentTypeConfig, 
  getAllDocumentTypes 
} from './config/documentTypes';

// Import diretto del componente per la factory
import GenericDocumentChatsComponent from './GenericDocumentChats';

// Factory function per creare componenti specifici per modulo
export const createDocumentChatsComponent = (moduleConfig) => {
  const { 
    documentType,
    title,
    defaultExpanded = true,
    showCreateButton = true,
    showUnlinkButton = true,
    emptyStateConfig = {},
    defaultCategoryId = 1,
    className = "",
    ...otherConfig
  } = moduleConfig;

  return (props) => {
    return React.createElement(GenericDocumentChatsComponent, {
      documentType,
      title,
      defaultExpanded,
      showCreateButton,
      showUnlinkButton,
      emptyStateConfig,
      defaultCategoryId,
      className,
      ...otherConfig,
      ...props
    });
  };
};

// Preset per moduli comuni
export const ModulePresets = {
  // Preset per Progetti/Task
  TaskChats: createDocumentChatsComponent({
    documentType: 'Task',
    title: 'Chat Attività',
    emptyStateConfig: {
      title: 'Nessuna chat collegata',
      description: 'Non ci sono chat collegate a questa attività',
      createButtonText: 'Crea prima chat'
    }
  }),

  // Preset per Ordini di Produzione
  ProductionOrderChats: createDocumentChatsComponent({
    documentType: 'MO',
    title: 'Chat Ordine Produzione',
    defaultCategoryId: 2, // Categoria produzione
    emptyStateConfig: {
      title: 'Nessuna chat collegata',
      description: 'Non ci sono discussioni per questo ordine di produzione',
      createButtonText: 'Inizia discussione'
    }
  }),

  // Preset per Ordini Cliente
  SalesOrderChats: createDocumentChatsComponent({
    documentType: 'SaleOrd',
    title: 'Chat Ordine Cliente',
    defaultCategoryId: 3, // Categoria vendite
    emptyStateConfig: {
      title: 'Nessuna chat collegata',
      description: 'Non ci sono comunicazioni per questo ordine',
      createButtonText: 'Nuova comunicazione'
    }
  }),

  // Preset per Clienti
  CustomerChats: createDocumentChatsComponent({
    documentType: 'Customer',
    title: 'Comunicazioni Cliente',
    showUnlinkButton: false, // Non permettere scollegamento per clienti
    emptyStateConfig: {
      title: 'Nessuna comunicazione',
      description: 'Non ci sono comunicazioni registrate per questo cliente',
      createButtonText: 'Nuova comunicazione'
    }
  }),

  // Preset per Articoli
  ItemChats: createDocumentChatsComponent({
    documentType: 'Item',
    title: 'Discussioni Articolo',
    emptyStateConfig: {
      title: 'Nessuna discussione',
      description: 'Non ci sono discussioni per questo articolo',
      createButtonText: 'Inizia discussione'
    }
  }),

  // Preset per Ticket
  TicketChats: createDocumentChatsComponent({
    documentType: 'Ticket',
    title: 'Chat Ticket',
    defaultCategoryId: 2,
    emptyStateConfig: {
      title: 'Chat Dedicata per il ticket',
      description: 'Configura la nuova chat per il ticket',
      createButtonText: 'Collega chat'
    }
  })
};

// Helper per utilizzo rapido
export const DocumentChats = {
  // Metodo generico
  Generic: GenericDocumentChatsComponent,
  
  // Metodi specifici pre-configurati
  Task: ModulePresets.TaskChats,
  Ticket: ModulePresets.TicketChats,
  ProductionOrder: ModulePresets.ProductionOrderChats,
  SalesOrder: ModulePresets.SalesOrderChats,
  Customer: ModulePresets.CustomerChats,
  Item: ModulePresets.ItemChats
}