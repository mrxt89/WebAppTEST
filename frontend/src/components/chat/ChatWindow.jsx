// src/components/chat/ChatWindow.jsx
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Resizable } from "re-resizable";
import ChatTopBar from "./ChatTopBar";
import ChatLayout from "./ChatLayout";
import { useOpenChat } from "@/hooks/useOpenChat";
import { debounce } from "lodash";
import { swal } from "@/lib/common";
import { useDispatch, useSelector } from "react-redux";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";

// Hook personalizzato per la memorizzazione degli utenti
const useMemoizedUsers = (initialUsers = []) => {
  const [users, setUsers] = useState(initialUsers);
  const lastValidUsersRef = useRef(initialUsers);
  const usersLoadedRef = useRef(false);
  const lastUsersFetchTimeRef = useRef(0);
  const MIN_FETCH_INTERVAL = 30000; // 30 secondi
 
  const updateUsers = useCallback((newUsers) => {
    if (Array.isArray(newUsers) && newUsers.length > 0) {
      setUsers(newUsers);
      lastValidUsersRef.current = newUsers;
      usersLoadedRef.current = true;
      lastUsersFetchTimeRef.current = Date.now();
    }
  }, []);
 
  const getUsers = useCallback(() => {
    return users.length > 0 ? users : lastValidUsersRef.current;
  }, [users]);
 
  const shouldFetchUsers = useCallback(() => {
    return (
      !usersLoadedRef.current ||
      Date.now() - lastUsersFetchTimeRef.current > MIN_FETCH_INTERVAL
    );
  }, []);
 
  return {
    users: getUsers(),
    updateUsers,
    shouldFetchUsers,
    usersLoaded: usersLoadedRef.current,
  };
 };

const ChatWindow = ({
  notification,
  onClose,
  onMinimize,
  windowManager,
  isStandalone = false,
  standaloneData = null,
  navigate,
}) => {
  const dispatch = useDispatch();
  
  // Usa useOpenChat per gestire tutti i dati e le operazioni della chat
  const {
    chatData,
    messages,
    membersInfo,
    messageStats,
    hasFullData,
    hasNewMessages,
    isLoadingMore,
    loadInitialData,
    loadMore,
    refreshData,
    refreshParticipants,
    sendMessage,
    markAsInteracted,
    getCurrentUser,
    // Azioni chat
    togglePin,
    toggleFavorite,
    toggleMute,
    updateTitle,
    archive,
    unarchive,
    leave,
    reopen,
    close,
    uploadAttachment,

  } = useOpenChat(notification?.notificationId, {
    autoRefresh: !isStandalone,
    playSound: true
  });

  // Hook per funzionalità aggiuntive non coperte da useOpenChat
  const {
    toggleReadUnread,
    fetchUsers,
    fetchResponseOptions,
    captureAndUploadPhoto,
    users: hookUsers,
    responseOptions: hookResponseOptions,
  } = useNotifications();

  // Stati locali per UI
  const [chatTitle, setChatTitle] = useState(notification?.title || "");
  const [isClosed, setIsClosed] = useState(false);
  const [hasLeftChat, setHasLeftChat] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [receiversList, setReceiversList] = useState(chatData?.receiversList || "");
  const [chatUsers, setChatUsers] = useState([]);
  const {
    users: memoizedUsers,
    updateUsers,
    shouldFetchUsers,
  } = useMemoizedUsers(standaloneData?.users || hookUsers);

  // Stati per finestra - SINCRONIZZATI CON WINDOWMANAGER
  const windowRef = useRef(null);
  const nodeRef = useRef(null);
  const dragHandleRef = useRef(null);
  const isDraggingRef = useRef(false);
  const sizeRef = useRef({ width: 900, height: 700 });
  const chatListRef = useRef(null);
  
  // IMPORTANTE: Usa sempre lo stato del windowManager come fonte di verità
  const windowState = windowManager?.windowStates?.[notification?.notificationId];
  
  const initialX = Math.max(0, Math.floor((window.innerWidth - 900) / 2));
  const initialY = Math.max(0, Math.floor(20));

  // Posizione e dimensione dalla windowManager o valori di default
  const [position, setPosition] = useState({
    x: windowState?.x ?? (isNaN(initialX) ? 0 : initialX),
    y: windowState?.y ?? (isNaN(initialY) ? 0 : initialY)
  });
  
  const [size, setSize] = useState({ 
    width: windowState?.width ?? 900, 
    height: windowState?.height ?? 700 
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  // CRITICO: Usa sempre lo stato del windowManager per questi valori
  const isMinimized = windowState?.isMinimized ?? false;
  const isMaximized = windowState?.isMaximized ?? false;
  const zIndex = windowState?.zIndex ?? 1000;
  
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Usa i dati standalone se disponibili, altrimenti usa quelli dall'hook
  const users = useMemo(() => 
    isStandalone && standaloneData?.users ? standaloneData.users : hookUsers,
    [isStandalone, standaloneData?.users, hookUsers]
  );
  
  const responseOptions = useMemo(() =>
    isStandalone && standaloneData?.responseOptions
      ? standaloneData.responseOptions
      : hookResponseOptions,
    [isStandalone, standaloneData?.responseOptions, hookResponseOptions]
  );

  // NUOVO: Sincronizzazione automatica con windowManager
  useEffect(() => {
    if (!windowManager || !notification?.notificationId || isStandalone) return;

    const windowState = windowManager.windowStates?.[notification.notificationId];
    if (!windowState) return;

    // Aggiorna posizione se è cambiata
    if (windowState.x !== position.x || windowState.y !== position.y) {

      setPosition({ x: windowState.x, y: windowState.y });
      
      // Applica immediatamente al DOM se nodeRef esiste
      if (nodeRef.current) {
        nodeRef.current.style.left = `${windowState.x}px`;
        nodeRef.current.style.top = `${windowState.y}px`;
      }
    }

    // Aggiorna dimensioni se sono cambiate
    if (windowState.width !== size.width || windowState.height !== size.height) {

      
      setSize({ width: windowState.width, height: windowState.height });
      sizeRef.current = { width: windowState.width, height: windowState.height };
      
      // Applica immediatamente al DOM se nodeRef esiste
      if (nodeRef.current) {
        nodeRef.current.style.width = `${windowState.width}px`;
        nodeRef.current.style.height = `${windowState.height}px`;
      }
    }
  }, [windowManager?.windowStates, notification?.notificationId, position, size, isStandalone]);

  // NUOVO: Handler per marcare come interagito
  const handleMarkAsInteracted = useCallback(() => {
    markAsInteracted();
  }, [markAsInteracted]);

  // Funzione dedicata per il caricamento degli utenti
  const loadUsers = useCallback(async () => {
    if (!shouldFetchUsers()) return;

    try {
      const fetchedUsers = await fetchUsers();
      if (Array.isArray(fetchedUsers) && fetchedUsers.length > 0) {
        updateUsers(fetchedUsers);
        setChatUsers(fetchedUsers);
      }
    } catch (error) {
      console.error("Errore nel caricamento degli utenti:", error);
    }
  }, [fetchUsers, shouldFetchUsers, updateUsers]);

  // Effetto per il caricamento iniziale degli utenti
  useEffect(() => {
    if (notification?.notificationId) {
      loadUsers();
    }
  }, [notification?.notificationId, loadUsers]);

  // Funzione di utilità per filtrare gli utenti disabilitati in modo sicuro
  const getFilteredUsers = useCallback(() => {
    const usersToFilter = chatUsers.length > 0 ? chatUsers : memoizedUsers;
    return Array.isArray(usersToFilter)
      ? usersToFilter.filter((user) => user && !user.userDisabled)
      : [];
  }, [chatUsers, memoizedUsers]);

  // Caricamento iniziale dei dati
  useEffect(() => {
    if (notification?.notificationId && !hasFullData) {
      loadInitialData(true);
    }
  }, [notification?.notificationId, hasFullData, loadInitialData]);

  // Aggiorna stati locali quando i dati cambiano
  useEffect(() => {
    if (chatData) {
      setChatTitle(chatData.title || notification?.title || "");
      setIsClosed(chatData.isClosed || false);
      setHasLeftChat(chatData.chatLeft === 1 || chatData.chatLeft === true);
      setIsArchived(chatData.archived === 1 || chatData.archived === true);
      setReceiversList(chatData.receiversList || "");
    }
  }, [chatData, notification?.title]);

  // Carica utenti e opzioni di risposta
  useEffect(() => {
    if (notification?.notificationId && !isStandalone) {
      fetchUsers();
      fetchResponseOptions();
    }
  }, [notification?.notificationId, isStandalone, fetchUsers, fetchResponseOptions]);

  // Handler per le azioni
  const handleMaximize = useCallback(() => {
    if (windowManager?.toggleMaximize && notification?.notificationId) {
      windowManager.toggleMaximize(notification.notificationId);
    }
  }, [windowManager, notification]);

  const handleMinimize = useCallback(() => {
    if (onMinimize && notification) {

      onMinimize(notification);
    }
  }, [onMinimize, notification]);

  const handleClose = useCallback(() => {
    // Salva l'ultimo messaggio letto quando chiudi la chat
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage._isTemporary) {
        localStorage.setItem(`lastReadMessage_${notification.notificationId}`, lastMessage.messageId);
      }
    }
    
    if (onClose && notification?.notificationId) {
      onClose(notification.notificationId);
    }
  }, [onClose, notification, messages]);

  const handleActivate = useCallback((e) => {
    // Non attivare se stiamo facendo drag o resize
    if (isDragging || isResizing || isDraggingRef.current) {
      return;
    }
    
    // Non attivare se l'evento proviene da elementi interattivi specifici
    if (e && e.target) {
      const target = e.target;
      const isInteractiveElement = target.closest('button, input, textarea, select, a, [role="button"], [onclick]');
      
      // Se è un elemento interattivo, non attivare la finestra
      if (isInteractiveElement) {
        return;
      }
    }
    
    if (windowManager?.activateWindow && notification?.notificationId) {
     
      windowManager.activateWindow(notification.notificationId);
    }
  }, [windowManager, notification, isDragging, isResizing]);

  const handleReply = useCallback((message) => {
    setReplyToMessage(message);
  }, []);

  // Handler per invio messaggi con wrapper per gestire stati locali
  const handleSendMessage = useCallback(async (notificationData) => {
    if (!notification?.notificationId) return;

    try {
      setSending(true);
      
      // IMPORTANTE: Assicurati che receiversList sia incluso
      const dataToSend = {
        ...notificationData,
        receiversList: notificationData.receiversList || receiversList || ""
      };
      
      // Usa sendMessage da useOpenChat
      const result = await sendMessage({
        message: dataToSend.message,
        attachments: dataToSend.attachments || [],
        replyToMessageId: dataToSend.replyToMessageId || null,
        receiversList: dataToSend.receiversList // Passa anche receiversList
      });

      if (result) {
        setReplyToMessage(null);
        setReceiversList(""); // Reset receivers dopo invio
        
        // Marca come interagito per rimuovere indicatore nuovi messaggi
        markAsInteracted();
      }

      return result;
    } catch (error) {
      console.error("Errore durante l'invio del messaggio:", error);
      throw error;
    } finally {
      setSending(false);
    }
  }, [notification, sendMessage, markAsInteracted, receiversList]);

  // Handler per aggiornamento destinatari
  const handleReceiversUpdate = useCallback((updatedList) => {
    setReceiversList(updatedList);
  }, []);

  // Handler per lasciare la chat
  const handleLeaveChat = useCallback(async (notificationId) => {
    if (!notification || !notificationId) return;

    try {
      swal.fire({
        title: "Abbandono in corso...",
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          swal.showLoading();
        },
      });

      const result = await leave();

      if (result) {
        setHasLeftChat(true);
        
        swal.fire({
          title: "Chat abbandonata",
          text: "Hai abbandonato questa conversazione",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });

        document.dispatchEvent(
          new CustomEvent("chat-status-changed", {
            detail: {
              notificationId,
              action: "left",
              timestamp: new Date().getTime(),
            },
          }),
        );
      }
    } catch (error) {
      console.error("Errore nell'abbandono della chat:", error);
      swal.fire({
        icon: "error",
        title: "Errore",
        text: error.message || "Si è verificato un errore durante l'abbandono della chat",
      });
    }
  }, [notification, leave]);

  // Handler per archiviare la chat
  const handleArchiveChat = useCallback(async () => {
    if (!notification?.notificationId) return;

    try {
      swal.fire({
        title: "Archiviazione in corso...",
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          swal.showLoading();
        },
      });

      const result = await archive();

      if (result) {
        setIsArchived(true);
        
        swal.fire({
          icon: "success",
          title: "Chat archiviata",
          text: "La chat è stata archiviata con successo",
          timer: 2000,
          showConfirmButton: false,
        });

        document.dispatchEvent(
          new CustomEvent("chat-status-changed", {
            detail: {
              notificationId: notification.notificationId,
              action: "archived",
              timestamp: new Date().getTime(),
            },
          }),
        );
      }
    } catch (error) {
      console.error("Error archiving chat:", error);
      swal.fire({
        icon: "error",
        title: "Errore",
        text: error.message || "Si è verificato un errore durante l'archiviazione",
      });
    }
  }, [notification, archive]);

  // Handler per rimuovere dall'archivio
  const handleUnarchiveChat = useCallback(async () => {
    if (!notification?.notificationId) return;

    try {
      swal.fire({
        title: "Rimozione dall'archivio in corso...",
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          swal.showLoading();
        },
      });

      const result = await unarchive();

      if (result) {
        setIsArchived(false);
        
        swal.fire({
          icon: "success",
          title: "Chat recuperata",
          text: "La chat è stata rimossa dall'archivio",
          timer: 2000,
          showConfirmButton: false,
        });

        document.dispatchEvent(
          new CustomEvent("chat-status-changed", {
            detail: {
              notificationId: notification.notificationId,
              action: "unarchived",
              timestamp: new Date().getTime(),
            },
          }),
        );
      }
    } catch (error) {
      console.error("Error unarchiving chat:", error);
      swal.fire({
        icon: "error",
        title: "Errore",
        text: error.message || "Si è verificato un errore durante la rimozione dall'archivio",
      });
    }
  }, [notification, unarchive]);

  // Handler per scroll
  const handleChatScrollToBottom = useCallback(() => {
    markAsInteracted();
  }, [markAsInteracted]);

  // Gestione drag della finestra - AGGIORNATO per sincronizzare con windowManager
  const handleDragStart = useCallback((e) => {
    const isHandleElement = e.target.closest(".chat-window-handle");
    if (!isHandleElement) return;

    if (e.type === "mousedown") {
      e.preventDefault();
      e.stopPropagation();
    }

    setIsDragging(true);
    isDraggingRef.current = true;
    
    // Attiva la finestra solo all'inizio del drag, non durante
    if (windowManager?.activateWindow && notification?.notificationId) {
      windowManager.activateWindow(notification.notificationId);
    }

    const startX = e.clientX;
    const startY = e.clientY;

    if (!nodeRef.current) {
      console.error("nodeRef.current è null durante il trascinamento");
      setIsDragging(false);
      isDraggingRef.current = false;
      return;
    }

    let startWindowX = position.x;
    let startWindowY = position.y;

    if (isNaN(startWindowX) || isNaN(startWindowY)) {
      const computedStyle = window.getComputedStyle(nodeRef.current);
      startWindowX = parseFloat(computedStyle.left);
      startWindowY = parseFloat(computedStyle.top);

      setPosition({
        x: startWindowX,
        y: startWindowY,
      });
    }

    const handleMouseMove = (moveEvent) => {
      if (!isDraggingRef.current || !nodeRef.current) return;

      moveEvent.preventDefault();
      moveEvent.stopPropagation();

      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const newX = startWindowX + deltaX;
      const newY = startWindowY + deltaY;

      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - size.height;

      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));

      if (!isNaN(boundedX) && !isNaN(boundedY)) {
        nodeRef.current.style.left = `${boundedX}px`;
        nodeRef.current.style.top = `${boundedY}px`;
      }
    };

    const handleMouseUp = (upEvent) => {
      if (upEvent) {
        upEvent.preventDefault();
        upEvent.stopPropagation();
      }
      
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      setIsDragging(false);
      isDraggingRef.current = false;

      if (nodeRef.current) {
        const computedStyle = window.getComputedStyle(nodeRef.current);
        const leftValue = computedStyle.left;
        const topValue = computedStyle.top;

        let finalX = parseFloat(leftValue);
        let finalY = parseFloat(topValue);

        if (isNaN(finalX) || isNaN(finalY)) {
          console.warn("Valori di posizione non validi dopo il trascinamento");
          finalX = position.x;
          finalY = position.y;
        }

        setPosition({
          x: finalX,
          y: finalY,
        });

        // IMPORTANTE: Aggiorna il windowManager con la nuova posizione
        if (windowManager?.updatePosition && notification?.notificationId) {
          windowManager.updatePosition(notification.notificationId, finalX, finalY);
        }
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [position, size.width, size.height, windowManager, notification]);

  // Gestione resize - AGGIORNATO per sincronizzare con windowManager
  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
    // Attiva la finestra quando inizia il resize
    if (windowManager?.activateWindow && notification?.notificationId) {
      windowManager.activateWindow(notification.notificationId);
    }
  }, [windowManager, notification]);

  const handleResize = useCallback((e, direction, ref, d) => {
    const newWidth = sizeRef.current.width + d.width;
    const newHeight = sizeRef.current.height + d.height;

    const maxWidth = window.innerWidth * 0.95;
    const maxHeight = window.innerHeight * 0.95;
    const minWidth = 400;
    const minHeight = 350;

    const constrainedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
    const constrainedHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));

    if (ref) {
      ref.style.width = `${constrainedWidth}px`;
      ref.style.height = `${constrainedHeight}px`;
    }

    setSize({
      width: constrainedWidth,
      height: constrainedHeight,
    });
  }, []);

  const handleResizeStop = useCallback((e, direction, ref, d) => {
    setIsResizing(false);

    let finalWidth = ref ? parseFloat(ref.style.width) : sizeRef.current.width + d.width;
    let finalHeight = ref ? parseFloat(ref.style.height) : sizeRef.current.height + d.height;

    if (isNaN(finalWidth)) finalWidth = size.width + d.width;
    if (isNaN(finalHeight)) finalHeight = size.height + d.height;

    sizeRef.current = {
      width: finalWidth,
      height: finalHeight,
    };

    setSize({
      width: finalWidth,
      height: finalHeight,
    });

    // IMPORTANTE: Aggiorna il windowManager con la nuova dimensione
    if (windowManager?.updateSize && notification?.notificationId) {
      windowManager.updateSize(notification.notificationId, finalWidth, finalHeight);
    }
  }, [size, windowManager, notification]);

  // Sincronizza stato con windowManager all'inizializzazione
  useEffect(() => {
    if (windowManager && notification && !initialLoaded) {
      const windowId = notification.notificationId;
      const windowState = windowManager.windowStates?.[windowId];

      if (windowState) {
        const newPosition = { 
          x: windowState.x !== undefined ? windowState.x : initialX, 
          y: windowState.y !== undefined ? windowState.y : initialY
        };
        
        const newSize = {
          width: windowState.width || 900,
          height: windowState.height || 700,
        };

        setPosition(newPosition);
        setSize(newSize);
        sizeRef.current = newSize;

      }

      if (windowManager.activateWindow) {
        windowManager.activateWindow(windowId);
      }

      setInitialLoaded(true);
    }
  }, [windowManager, notification, initialX, initialY, initialLoaded]);

  // Segna come letto all'apertura
  useEffect(() => {
    if (notification?.notificationId && !chatData?.isReadByUser) {
      toggleReadUnread(notification.notificationId, true);
    }
  }, [notification?.notificationId, chatData?.isReadByUser, toggleReadUnread]);

  // IMPORTANTE: Return null se minimizzata o non c'è notification
  if (!notification || isMinimized) {
    return null;
  }

  // Contenuto della finestra
  const windowContent = (
    <div 
      className="flex flex-col w-full h-full overflow-hidden" 
      onClick={handleActivate}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        className={`${isStandalone ? "" : "chat-window-handle cursor-move border-b"}`}
        ref={dragHandleRef}
        onMouseDown={isStandalone ? null : handleDragStart}
      >
        <ChatTopBar
          title={chatTitle}
          setTitle={setChatTitle}
          closeChat={handleClose}
          onMinimize={handleMinimize}
          onMaximize={isStandalone ? null : handleMaximize}
          isMaximized={isMaximized}
          membersInfo={membersInfo}
          users={getFilteredUsers()}
          currentUser={getCurrentUser()}
          notificationId={notification.notificationId}
          notificationCategoryId={notification.notificationCategoryId}
          notificationCategoryName={notification.notificationCategoryName}
          hexColor={notification.hexColor}
          tbCreated={notification.tbCreated}
          hasLeftChat={hasLeftChat}
          isArchived={isArchived}
          receiversList={receiversList}
          updateReceiversList={handleReceiversUpdate}
          leaveChat={handleLeaveChat}
          archiveChat={handleArchiveChat}
          unarchiveChat={handleUnarchiveChat}
          isStandalone={isStandalone}
        />
      </div>

      <div className="flex-1 overflow-hidden" onClick={handleActivate}>
        <ChatLayout
          messages={messages}
          sending={sending}
          notificationId={notification.notificationId}
          isReadByUser={chatData?.isReadByUser}
          markMessageAsRead={toggleReadUnread}
          chatListRef={chatListRef}
          membersInfo={membersInfo}
          users={getFilteredUsers()}
          currentUser={getCurrentUser()}
          updateReceiversList={handleReceiversUpdate}
          receivers={receiversList}
          onReply={handleReply}
          title={notification.title}
          createdAt={notification.tbCreated}
          notificationCategoryId={notification.notificationCategoryId}
          notificationCategoryName={notification.notificationCategoryName}
          hexColor={notification.hexColor}
          hasLeftChat={hasLeftChat}
          onScrollToBottom={handleChatScrollToBottom}
          replyToMessage={replyToMessage}
          setReplyToMessage={setReplyToMessage}
          setSending={setSending}
          onSend={handleSendMessage}
          responseOptions={responseOptions || []}
          uploadNotificationAttachment={uploadAttachment}
          captureAndUploadPhoto={captureAndUploadPhoto}
          isClosed={isClosed}
          closingUser_Name={chatData?.closingUser_Name}
          closingDate={chatData?.closingDate}
          hasNewMessages={hasNewMessages}
          onMarkAsInteracted={handleMarkAsInteracted}
          navigate={navigate}
          reopenChat={async () => {
            const res = await reopen();
            if (res) {
              setIsClosed(false);
              
              document.dispatchEvent(
                new CustomEvent("chat-status-changed", {
                  detail: {
                    notificationId: notification.notificationId,
                    action: "reopened",
                    timestamp: new Date().getTime(),
                  },
                }),
              );

              swal.fire({
                text: "Chat riaperta con successo",
                icon: "success",
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
              });
            }
          }}
          closeChat={async () => {
            const res = await close();
            if (res) {
              handleClose();
              swal.fire({
                text: "Chat chiusa con successo",
                icon: "success",
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
              });
            }
          }}
          onLoadMore={loadMore}
          hasMoreMessages={messageStats.hasMoreMessages}
          isLoadingMore={isLoadingMore}
          totalMessageCount={messageStats.totalCount}
        />
      </div>
    </div>
  );

  // Render per standalone
  if (isStandalone) {
    return (
      <div
        ref={nodeRef}
        className="chat-window standalone-chat"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 9999,
          boxShadow: "none",
          border: "none",
          borderRadius: 0,
        }}
      >
        {windowContent}
      </div>
    );
  }

  // Render per finestra maximized
  if (isMaximized) {
    return (
      <div
        className="fixed inset-0 z-[1100]"
        ref={windowRef}
        onClick={handleActivate}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(4px)'
        }}
      >
        {windowContent}
      </div>
    );
  }

  // Render normale con resize
  return (
      <div
        ref={nodeRef}
        className={`chat-window ${isDragging ? "dragging" : ""}`}
        style={{
          position: "absolute",
          top: position.y,
          left: position.x,
          width: size.width,
          height: size.height,
          zIndex: zIndex,
          cursor: isDragging ? "grabbing" : "auto",
        }}
    >
      <Resizable
        size={size}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeStop={handleResizeStop}
        minWidth={400}
        minHeight={350}
        maxWidth="95vw"
        maxHeight="95vh"
        enable={{
          top: true,
          right: true,
          bottom: true,
          left: true,
          topRight: true,
          bottomRight: true,
          bottomLeft: true,
          topLeft: true,
        }}
        handleStyles={{
          topRight: { cursor: "ne-resize" },
          bottomRight: { cursor: "se-resize" },
          bottomLeft: { cursor: "sw-resize" },
          topLeft: { cursor: "nw-resize" },
        }}
        handleWrapperStyle={{ opacity: 1 }}
        resizeRatio={1}
      >
        <div
          className="absolute overflow-hidden rounded-lg"
          style={{
            width: "100%",
            height: "100%",
            zIndex: zIndex,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            border: "1px solid #e5e7eb",
            transition: "box-shadow 0.2s ease, border-color 0.2s ease",
          }}
        >
          {windowContent}
        </div>
      </Resizable>
    </div>
  );
};

export default ChatWindow;