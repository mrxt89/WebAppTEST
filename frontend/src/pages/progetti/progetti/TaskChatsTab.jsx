// src/components/tasks/TaskChatsTab.jsx
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageSquare, 
  Plus, 
  ExternalLink, 
  Users,
  Calendar,
  Eye,
  Link2,
  AlertCircle,
  X
} from "lucide-react";
import { swal } from "../../../lib/common";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import NewMessageModal from "@/components/chat/NewMessageModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const TaskChatsTab = ({ task, project, onRefresh }) => {
  const [linkedChats, setLinkedChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [prefillData, setPrefillData] = useState(null);
  const [isUnlinkDialogOpen, setIsUnlinkDialogOpen] = useState(false);
  const [chatToUnlink, setChatToUnlink] = useState(null);

  // Usa l'hook Redux esistente - AGGIUNGI openChat qui!
  const {
    searchChatsByDocument,
    linkDocument,
    unlinkDocument,
    openChat, 
  } = useNotifications();

  // Carica le chat collegate all'attività
  const loadLinkedChats = async () => {
    if (!task?.TaskID || !project?.ProjectID) return;
    console.log("loadLinkedChats. parameters: ", task.TaskID, project.ProjectID)
    setLoading(true);
    try {
      const results = await searchChatsByDocument('Task', {
        projectId: project.ProjectID,
        taskId: task.TaskID
      });
      
      if (results && results.results && Array.isArray(results.results)) {
        setLinkedChats(results.results);
      } else if (results && Array.isArray(results)) {
        setLinkedChats(results);
      } else {
        setLinkedChats([]);
      }
  
    } catch (error) {
      console.error("Error loading linked chats:", error);
      setLinkedChats([]);
    } finally {
      setLoading(false);
    }
  };

  // Apri il modal per creare una nuova chat
  const openNewChatModal = () => {
    const participants = task.Participants 
      ? JSON.parse(task.Participants).map(p => p.userId) 
      : [];
    
    if (task.AssignedTo && !participants.includes(task.AssignedTo)) {
      participants.push(task.AssignedTo);
    }

    setPrefillData({
      title: `${project.Name} - ${task.Title}`,
      participants: participants,
      categoryId: 1,
      linkToTask: {
        projectId: project.ProjectID,
        taskId: task.TaskID
      }
    });
    
    setIsNewMessageModalOpen(true);
  };

  // Gestisci la creazione della chat dal modal
  const handleChatCreated = async (notificationId) => {
    try {
      if (notificationId && prefillData?.linkToTask) {
        await linkDocument(
          notificationId,
          null,
          'Task',
          prefillData.linkToTask.projectId,
          prefillData.linkToTask.taskId
        );
        
        swal.fire({
          title: "Successo",
          text: "Chat creata e collegata all'attività",
          icon: "success",
          timer: 2000,
          showConfirmButton: false
        });
      }
      
      setIsNewMessageModalOpen(false);
      setPrefillData(null);
      
      await loadLinkedChats();
      
      // USA openChat da Redux invece di onOpenChat prop
      openChat(notificationId);
      
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error linking new chat to task:", error);
      swal.fire("Errore", "Chat creata ma errore nel collegamento all'attività", "warning");
    }
  };

  // Scollega una chat dall'attività
  const handleUnlinkChat = async (chatId, linkId) => {
    setChatToUnlink({ chatId, linkId });
    setIsUnlinkDialogOpen(true);
  };

  const confirmUnlinkChat = async () => {
    try {
      await unlinkDocument(chatToUnlink.chatId, chatToUnlink.linkId);
      
      swal.fire({
        title: "Successo",
        text: "Chat scollegata dall'attività",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });
      
      await loadLinkedChats();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error unlinking chat:", error);
      swal.fire("Errore", "Errore nello scollegamento della chat", "error");
    } finally {
      setIsUnlinkDialogOpen(false);
      setChatToUnlink(null);
    }
  };

  useEffect(() => {
    loadLinkedChats();
  }, [task?.TaskID, project?.ProjectID]);

  // Apri una chat esistente - USA openChat da Redux
  const handleOpenChat = (chatId) => {
    openChat(chatId); // <-- USA DIRETTAMENTE openChat da Redux
  };

  const handleCloseModal = () => {
    setIsNewMessageModalOpen(false);
    setPrefillData(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold">
            Chat Collegate ({linkedChats.length})
          </h3>
        </div>
        
        <Button 
          size="sm" 
          onClick={openNewChatModal}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuova Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : linkedChats.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 text-center mb-4">
                Nessuna chat collegata a questa attività
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={openNewChatModal}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Crea prima chat
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {linkedChats.map((chat) => (
              <Card 
                key={`chat-${chat.notificationId}-${chat.LinkId}`}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleOpenChat(chat.notificationId)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: chat.hexColor || "#6366f1" }}
                      />
                      <h4 className="font-medium text-sm truncate">
                        {chat.title}
                      </h4>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!chat.isUserMember && (
                        <Badge variant="outline" className="text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          Sola lettura
                        </Badge>
                      )}
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenChat(chat.notificationId);
                        }}
                        title="Apri chat"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      
                      {chat.isUserMember && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnlinkChat(chat.notificationId, chat.LinkId);
                          }}
                          title="Scollega chat"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {chat.lastMessage && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                      {chat.lastMessage}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {chat.participantCount || 0}
                      </span>
                      
                      {chat.messageCount > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {chat.messageCount} messaggi
                        </span>
                      )}
                    </div>
                    
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(chat.tbCreated).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex gap-2 mt-2">
                    {chat.isClosed && (
                      <Badge variant="secondary" className="text-xs">
                        Completata
                      </Badge>
                    )}
                    
                    {chat.archived && (
                      <Badge variant="outline" className="text-xs text-purple-600">
                        Archiviata
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {linkedChats.some(chat => !chat.isUserMember) && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Alcune chat sono in modalità sola lettura. 
            Puoi visualizzarle ma non puoi inviare messaggi finché non vieni aggiunto come partecipante.
          </p>
        </div>
      )}

      <NewMessageModal
        isOpen={isNewMessageModalOpen}
        onRequestClose={handleCloseModal}
        sidebarVisible={false}
        openChatModal={handleChatCreated}
        prefillData={prefillData}
      />

      <Dialog open={isUnlinkDialogOpen} onOpenChange={setIsUnlinkDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-500" />
              Scollega Chat
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Vuoi scollegare questa chat dall'attività?
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUnlinkDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={confirmUnlinkChat}
            >
              Scollega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskChatsTab;