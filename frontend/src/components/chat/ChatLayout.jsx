import React, { useState, useEffect, useRef } from "react";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import ModernChatList from "./ModernChatList";
import { motion, AnimatePresence } from "framer-motion";
import FileViewer from "../ui/fileViewer";
import ChatSidebar from "./ChatSidebar";
import ChatBottomBar from "./ChatBottomBar"; // Aggiungi import per ChatBottomBar

const ChatLayout = ({
  messages,
  sending,
  notificationId,
  isReadByUser,
  markMessageAsRead,
  chatListRef,
  membersInfo,
  updateReceiversList,
  users,
  receivers,
  onReply,
  isClosed,
  closingUser_Name,
  closingDate,
  title,
  notificationCategoryId,
  hexColor,
  hasLeftChat,
  initialSidebarOpen = true, // Nuovo parametro per decidere se aprire inizialmente la sidebar
  selectedMessageId = null, // Nuovo parametro per evidenziare un messaggio specifico
  onEditMessage,
  onViewVersionHistory,
  onReactionSelect,
  replyToMessage, // Aggiungi per ricevere replyToMessage
  setReplyToMessage, // Aggiungi per ricevere setReplyToMessage
  setSending, // Aggiungi per ricevere setSending
  onSend, // Aggiungi per ricevere onSend
  responseOptions, // Aggiungi per ricevere responseOptions
  uploadNotificationAttachment, // Aggiungi per l'upload di allegati
  captureAndUploadPhoto, // Aggiungi per la cattura foto
  hasNewMessages,
  reopenChat,
  closeChat,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(initialSidebarOpen);
  const [selectedUsers, setSelectedUsers] = useState(
    typeof receivers === "string" ? receivers.split("-").filter(Boolean) : [],
  );
  const [selectedMessageText, setSelectedMessageText] = useState("");
  // Calcola online status per compatibilità con vecchio componente
  const [onlineStatus, setOnlineStatus] = useState({});
  const sidebarRef = useRef(null);

  // Gestione della visualizzazione mobile/desktop
  useEffect(() => {
    const checkScreenWidth = () => setIsMobile(window.innerWidth <= 768);
    checkScreenWidth();
    window.addEventListener("resize", checkScreenWidth);

    return () => window.removeEventListener("resize", checkScreenWidth);
  }, []);

  // All'inizializzazione, imposta la sidebar aperta se richiesto
  useEffect(() => {
    setIsSidebarOpen(initialSidebarOpen);
  }, [initialSidebarOpen, notificationId]);

  // Calcolo dello stato online degli utenti
  useEffect(() => {
    const calculateOnlineStatus = () => {
      const currentTime = new Date();
      const status = membersInfo.reduce((acc, user) => {
        if (!user || !user.lastOnline) return acc;

        const lastOnline = new Date(user.lastOnline);
        const diffMinutes = Math.floor((currentTime - lastOnline) / 60000);

        if (diffMinutes <= 5) {
          acc[user.username] = "green";
        } else if (diffMinutes <= 30) {
          acc[user.username] = "yellow";
        } else {
          acc[user.username] = "red";
        }
        return acc;
      }, {});
      setOnlineStatus(status);
    };

    calculateOnlineStatus();
    const interval = setInterval(calculateOnlineStatus, 60000);

    return () => clearInterval(interval);
  }, [membersInfo]);

  // Gestione dei destinatari selezionati
  const handleReceiversUpdate = (updatedList) => {
    let newList;

    if (Array.isArray(updatedList)) {
      newList = updatedList;
    } else if (typeof updatedList === "string") {
      newList = updatedList.split("-").filter(Boolean);
    } else {
      newList = [];
    }

    setSelectedUsers(newList);
    updateReceiversList(
      Array.isArray(updatedList) ? updatedList.join("-") : updatedList,
    );
  };

  // Aggiorna selectedMessageId quando cambia esternamente
  useEffect(() => {
    if (selectedMessageId) {
      // Trova il messaggio corrispondente per ottenere il testo
      const message = messages.find((m) => m.messageId === selectedMessageId);
      if (message) {
        setSelectedMessageText(message.message);
      }

      // Informa la sidebar
      if (
        sidebarRef.current &&
        typeof sidebarRef.current.handleMessageSelection === "function"
      ) {
        sidebarRef.current.handleMessageSelection(selectedMessageId);
      }
    }
  }, [selectedMessageId, messages]);

  // Funzione per gestire la selezione di un messaggio per i segnalibri
  const handleMessageSelect = (messageId, messageText) => {
    if (hasLeftChat) return; // Non consentire la selezione se l'utente ha abbandonato la chat

    setSelectedMessageId(messageId);
    setSelectedMessageText(messageText);

    // Apri la sidebar se non è già aperta
    if (!isSidebarOpen) {
      setIsSidebarOpen(true);
    }

    // Informa il componente ChatSidebar della selezione (usando il ref)
    if (
      sidebarRef.current &&
      typeof sidebarRef.current.handleMessageSelection === "function"
    ) {
      sidebarRef.current.handleMessageSelection(messageId);
    }
  };

  return (
    <div className="chat-background flex h-full relative overflow-visible">
      {/* Solo se l'utente non ha abbandonato la chat, mostra la sidebar */}
      {!hasLeftChat && (
        <ChatSidebar
          ref={sidebarRef}
          notificationId={notificationId}
          visible={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          isMobile={isMobile}
          hexColor={hexColor}
          selectedMessageId={selectedMessageId}
          selectedMessageText={selectedMessageText}
          messages={messages}
          users={users}
          currentUserId={messages[0]?.selectedUser || 0}
        />
      )}

      {/* Main chat area */}
      <div
        className={`flex-1 transition-all ${isSidebarOpen && !isMobile && !hasLeftChat ? "ml-4" : ""} flex flex-col`}
        style={{
          marginLeft:
            isSidebarOpen && !hasLeftChat ? (isMobile ? "0" : "") : "0",
          transition: "margin-left 0.3s ease-in-out",
        }}
      >
        <div className="flex-1 overflow-hidden">
          <ModernChatList
            messages={messages}
            chatListRef={chatListRef}
            sending={sending}
            notificationId={notificationId}
            isReadByUser={isReadByUser}
            markMessageAsRead={markMessageAsRead}
            onReply={onReply}
            onMessageSelect={handleMessageSelect}
            categoryColor={hexColor}
            hasLeftChat={hasLeftChat}
            selectedMessageId={selectedMessageId}
            onEditMessage={onEditMessage}
            onViewVersionHistory={onViewVersionHistory}
            onReactionSelect={onReactionSelect}
            users={users} // Assicuriamoci di passare gli utenti
            newMessage={hasNewMessages}
          />
        </div>

        {/* Aggiungiamo ChatBottomBar qui, passando tutte le props necessarie */}
        <div style={{ height: "auto" }}>
          {hasLeftChat ? (
            <div className="p-4 bg-gray-50 border-t border-gray-200 text-center text-gray-500">
              <p>
                Hai abbandonato questa chat il {new Date().toLocaleDateString()}{" "}
                e non puoi più inviare messaggi.
              </p>
            </div>
          ) : (
            <ChatBottomBar
              notificationId={notificationId}
              title={title}
              notificationCategoryId={notificationCategoryId}
              hexColor={hexColor}
              disabled={hasLeftChat}
              setSending={setSending}
              onSend={onSend}
              replyToMessage={replyToMessage}
              setReplyToMessage={setReplyToMessage}
              users={users}
              responseOptions={responseOptions}
              receiversList={receivers}
              updateReceiversList={updateReceiversList}
              uploadNotificationAttachment={uploadNotificationAttachment}
              captureAndUploadPhoto={captureAndUploadPhoto}
              reopenChat={reopenChat}
              closeChat={closeChat}
              isClosed={isClosed}
              closingUser_Name={closingUser_Name}
              closingDate={closingDate}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatLayout;
