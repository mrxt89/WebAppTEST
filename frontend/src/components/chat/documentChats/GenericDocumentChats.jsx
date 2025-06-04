import React, { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Plus, 
  RefreshCw, 
  ChevronDown,
  ChevronUp,
  Link2 
} from "lucide-react";
import DocumentChatList from "./components/DocumentChatList";
import useDocumentChats from "./hooks/useDocumentChats";
import { getDocumentTypeConfig } from "./config/documentTypes";

const GenericDocumentChats = ({
  documentType,
  documentId,
  documentData = {},
  title,
  defaultExpanded = true,
  showHeader = true,
  showCreateButton = true,
  showRefreshButton = true,
  showUnlinkButton = true,
  maxHeight = "400px",
  emptyStateConfig = {},
  onChatCreated,
  onChatUnlinked,
  className = "",
  headerActions = null,
  defaultChatTitle = null,
  defaultParticipants = [],
  defaultCategoryId = 1,
  enableAutoLink = true // Nuovo parametro per abilitare/disabilitare il collegamento automatico
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const {
    chats,
    loading,
    error,
    openChat,
    unlinkChat,
    createAndLinkChat,
    refresh
  } = useDocumentChats({
    documentType,
    documentId,
    documentData,
    autoLoad: true,
    onChatCreated,
    onChatUnlinked
  });

  // Ottieni la configurazione del tipo di documento
  const docTypeConfig = getDocumentTypeConfig(documentType);
  
  // Titolo del pannello
  const panelTitle = title || `Chat collegate - ${docTypeConfig?.label || documentType}`;

  // Gestione apertura finestra nuova chat
  const handleCreateNewChat = () => {
    const chatTitle = defaultChatTitle || 
      (docTypeConfig && documentData ? 
        docTypeConfig.displayFormat(documentData) : 
        `${documentType} - ${documentId}`);

    // Prepara i dati per la nuova finestra
    const newChatData = {
      defaultTitle: chatTitle,
      defaultReceivers: defaultParticipants,
      notificationCategoryId: defaultCategoryId,
      documentType,
      documentId,
      documentData,
      enableAutoLink, // Passa il flag per il collegamento automatico
      metadata: {
        documentType,
        documentId,
        ...documentData,
        autoLink: enableAutoLink, // Segnala che deve fare il collegamento automatico
        onChatCreated: async (notificationId) => {
          // Il collegamento verrà gestito nel NewMessageWindow o ChatWindow
          // basandosi sul flag autoLink
          
          await refresh();
          
          if (onChatCreated) {
            onChatCreated(notificationId);
          }
          
          // Apri la chat appena creata
          openChat({ notificationId });
        }
      }
    };

    // Emetti evento per aprire nuova finestra chat
    document.dispatchEvent(
      new CustomEvent("openNewMessageModal", {
        detail: newChatData
      })
    );
  };

  // Contenuto del pannello
  const content = (
    <>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {docTypeConfig?.icon && (
                <docTypeConfig.icon className="h-5 w-5 text-gray-600" />
              )}
              <h3 className="text-lg font-semibold">
                {panelTitle}
              </h3>
              {chats.length > 0 && (
                <span className="text-sm text-gray-500">
                  ({chats.length})
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {headerActions}
              
              {showRefreshButton && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={refresh}
                  disabled={loading}
                  title="Aggiorna lista"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              )}
              
              {showCreateButton && (
                <Button 
                  size="sm" 
                  onClick={handleCreateNewChat}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Nuova Chat
                </Button>
              )}
              
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      )}

      {expanded && (
        <CardContent className={showHeader ? "pt-0" : ""}>
          <DocumentChatList
            chats={chats}
            loading={loading}
            error={error}
            onChatClick={openChat}
            onChatUnlink={showUnlinkButton ? unlinkChat : undefined}
            onCreateNew={showCreateButton ? handleCreateNewChat : undefined}
            showUnlinkButton={showUnlinkButton}
            emptyStateConfig={emptyStateConfig}
            maxHeight={maxHeight}
          />
        </CardContent>
      )}
    </>
  );

  // Se non mostra header, renderizza solo il contenuto
  if (!showHeader) {
    return <div className={className}>{content}</div>;
  }

  // Altrimenti renderizza dentro una Card
  return (
    <Card className={className}>
      {content}
    </Card>
  );
};

export default GenericDocumentChats;