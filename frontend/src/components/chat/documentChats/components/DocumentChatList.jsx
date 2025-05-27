import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import DocumentChatItem from "./DocumentChatItem";

const DocumentChatList = ({
  chats = [],
  loading = false,
  error = null,
  onChatClick,
  onChatUnlink,
  onCreateNew,
  showUnlinkButton = false,
  emptyStateConfig = {},
  maxHeight = "400px",
  className = ""
}) => {
  // Configurazione stato vuoto con valori di default
  const emptyState = {
    icon: MessageSquare,
    title: "Nessuna chat trovata",
    description: "Non ci sono chat collegate a questo documento",
    showCreateButton: true,
    createButtonText: "Crea nuova chat",
    ...emptyStateConfig
  };

  // Gestione stato di caricamento
  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  // Gestione errore
  if (error) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="flex items-center gap-3 p-4">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              Errore nel caricamento
            </p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Stato vuoto
  if (chats.length === 0) {
    const EmptyIcon = emptyState.icon;
    
    return (
      <Card className={`border-dashed ${className}`}>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <EmptyIcon className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-900 mb-1">
            {emptyState.title}
          </p>
          <p className="text-sm text-gray-500 text-center mb-4">
            {emptyState.description}
          </p>
          {emptyState.showCreateButton && onCreateNew && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateNew}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {emptyState.createButtonText}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Lista chat
  const hasReadOnlyChats = chats.some(chat => !chat.isUserMember);

  return (
    <div className={className}>
      <ScrollArea 
        className="w-full rounded-md border"
        style={{ maxHeight }}
      >
        <div className="divide-y divide-gray-200">
          {chats.map((chat) => (
            <DocumentChatItem
              key={`chat-${chat.notificationId}-${chat.LinkId || ''}`}
              chat={chat}
              onClick={onChatClick}
              onUnlink={onChatUnlink}
              showUnlinkButton={showUnlinkButton}
              isReadOnly={false}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Avviso per chat in sola lettura */}
      {hasReadOnlyChats && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Alcune chat sono in modalità sola lettura. 
            Puoi visualizzarle ma non puoi inviare messaggi finché non vieni aggiunto come partecipante.
          </p>
        </div>
      )}
    </div>
  );
};

export default DocumentChatList;