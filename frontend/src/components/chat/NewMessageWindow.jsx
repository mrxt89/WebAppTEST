// src/components/chat/NewMessageWindow.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Resizable } from "re-resizable";
import ChatTopBar from "./ChatTopBar";
import ChatBottomBar from "./ChatBottomBar";
import ChatLayout from "./ChatLayout";

import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import { swal } from "@/lib/common";
import { Paperclip, X, ChevronRight, ChevronLeft } from "lucide-react";
import axios from "axios";
import { config } from "@/config";

const NewMessageWindow = ({
  windowId,
  onClose,
  onMinimize,
  windowManager,
  openChatModal,
  type = "standard",
  notificationCategoryId = 1,
  defaultTitle = "",
  defaultReceivers = [],
  metadata = {},
}) => {
  const {
    sendNotification,
    fetchUsers,
    fetchResponseOptions,
    notificationAttachments,
  } = useNotifications();

  // Stati esistenti dal modal
  const [users, setUsers] = useState([]);
  const [responseOptions, setResponseOptions] = useState([]);
  const [title, setTitle] = useState(defaultTitle);
  const [receivers, setReceivers] = useState(defaultReceivers);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [fetchedUsers, setFetchedUsers] = useState([]);
  const [fetchedResponseOptions, setFetchedResponseOptions] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [attachmentsLoaded, setAttachmentsLoaded] = useState(false);
  const [currentNotificationCategoryId, setCurrentNotificationCategoryId] = useState(notificationCategoryId);
  const chatListRef = useRef(null);

  // Stati per la finestra
  const windowRef = useRef(null);
  const nodeRef = useRef(null);
  const dragHandleRef = useRef(null);
  const isDraggingRef = useRef(false);
  const sizeRef = useRef({ width: 900, height: 700 });
  
  const initialX = Math.max(0, Math.floor((window.innerWidth - 900) / 2));
  const initialY = Math.max(0, Math.floor(50));

  const [position, setPosition] = useState({
    x: isNaN(initialX) ? 0 : initialX,
    y: isNaN(initialY) ? 0 : initialY
  });
  const [size, setSize] = useState({ width: 900, height: 700 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [zIndex, setZIndex] = useState(1000);

  // Per evitare reset del titolo
  const [wasOpen, setWasOpen] = useState(false);

  // Inizializzazione una tantum
  useEffect(() => {
    if (!wasOpen) {
      setTitle(defaultTitle || "");
      setReceivers(defaultReceivers || []);
      setCurrentNotificationCategoryId(notificationCategoryId || 1);
      setWasOpen(true);
    }
  }, [wasOpen, defaultTitle, defaultReceivers, notificationCategoryId]);

  // Carica utenti e opzioni
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await fetchUsers();
        if (usersData) {
          setUsers(usersData);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    const loadResponseOptions = async () => {
      try {
        const options = await fetchResponseOptions();
        if (options) {
          setResponseOptions(options);
        }
      } catch (error) {
        console.error("Error fetching response options:", error);
      }
    };

    loadUsers();
    loadResponseOptions();
  }, [fetchUsers, fetchResponseOptions]);

  // Controlla se mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Update receivers basato su responseOptions
  useEffect(() => {
    if (type === "standard" && currentNotificationCategoryId && responseOptions?.length > 0) {
      const currentResponseOption = responseOptions.find(
        (option) => option.notificationCategoryId == currentNotificationCategoryId,
      );

      if (currentResponseOption && currentResponseOption.recipientsJSON) {
        try {
          const parsedRecipients = JSON.parse(
            currentResponseOption.recipientsJSON,
          ).map((recipient) => recipient.userId.toString());
          setReceivers(parsedRecipients);
        } catch (e) {
          console.error("Errore nel parsing dei destinatari:", e);
          setReceivers([]);
        }
      } else {
        setReceivers([]);
      }
    }
  }, [currentNotificationCategoryId, responseOptions, type]);

  const resetFields = () => {
    setTitle("");
    setReceivers([]);
    setMessages([]);
    setCurrentNotificationCategoryId(notificationCategoryId || 1);
  };

  const handleSend = async (notificationData) => {
    if (!notificationData.title || !notificationData.message) {
      swal.fire(
        "Errore",
        "Assicurati che tutti i campi siano compilati",
        "error",
      );
      return;
    }

    if (!notificationData.receiversList && currentNotificationCategoryId == 1) {
      swal.fire("Errore", "Seleziona almeno un destinatario", "error");
      return;
    }

    const updatedNotificationData = {
      ...notificationData,
      notificationCategoryId: currentNotificationCategoryId || 1,
    };

    try {
      const newNotification = await sendNotification(updatedNotificationData);
      if (newNotification) {
        if (type === "task" && metadata.taskId) {
          try {
            const token = localStorage.getItem("token");
            await axios.post(
              `${config.API_BASE_URL}/notifications/${newNotification.notificationId}/link/task/${metadata.taskId}`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
          } catch (error) {
            console.error("Errore nel collegamento della chat al task:", error);
          }
        }

        resetFields();
        onClose();
        openChatModal(newNotification.notificationId);
      }
    } catch (error) {
      console.error("Errore nell'invio del messaggio:", error);
      swal.fire(
        "Errore",
        "Si è verificato un errore durante l'invio del messaggio",
        "error",
      );
    }
  };

  const handleUpdateCategoryId = (newCategoryId) => {
    setCurrentNotificationCategoryId(newCategoryId);

    const selectedCategory = responseOptions.find(
      (o) => o.notificationCategoryId == newCategoryId,
    );
    if (selectedCategory && selectedCategory.defaultTitle && !title) {
      setTitle(selectedCategory.defaultTitle);
    }
  };

  const handleReceiversUpdate = (updatedList) => {
    const newList = Array.isArray(updatedList)
      ? updatedList
      : updatedList.split("-");
    setReceivers(newList);
  };

  const getCurrentCategoryColor = () => {
    if (currentNotificationCategoryId && responseOptions?.length > 0) {
      const category = responseOptions.find(
        (option) =>
          option.notificationCategoryId == currentNotificationCategoryId,
      );
      return category?.hexColor || "#3b82f6";
    }
    return "#3b82f6";
  };

  const hexColor = getCurrentCategoryColor();

  const handleAttachmentUploaded = () => {
    setAttachmentsLoaded(true);
  };

  const filteredUsers = Array.isArray(users)
    ? users.filter((user) => !user.userDisabled)
    : [];

  const modalTitle = type === "task" 
    ? `Nuova chat per: ${title}` 
    : "Nuovo messaggio";

  // Gestione drag della finestra
  const handleDragStart = useCallback((e) => {
    const isHandleElement = e.target.closest(".chat-window-handle");
    if (!isHandleElement) return;

    if (e.type === "mousedown") {
      e.preventDefault();
    }

    setIsDragging(true);
    isDraggingRef.current = true;
    
    if (windowManager?.activateWindow) {
      windowManager.activateWindow(windowId);
    }

    const startX = e.clientX;
    const startY = e.clientY;

    if (!nodeRef.current) {
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

    const handleMouseUp = () => {
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
          finalX = position.x;
          finalY = position.y;
        }

        setPosition({
          x: finalX,
          y: finalY,
        });

        if (windowManager?.updatePosition) {
          windowManager.updatePosition(windowId, finalX, finalY);
        }
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [position, size.width, size.height, windowManager, windowId]);

  // Gestione resize
  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
    if (windowManager?.activateWindow) {
      windowManager.activateWindow(windowId);
    }
  }, [windowManager, windowId]);

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

    if (windowManager?.updateSize) {
      windowManager.updateSize(windowId, finalWidth, finalHeight);
    }
  }, [size, windowManager, windowId]);

  // Sincronizza con window manager
  useEffect(() => {
    if (windowManager && windowId) {
      const windowState = windowManager.windowStates?.[windowId];

      if (windowState) {
        setPosition({ 
          x: windowState.x !== undefined ? windowState.x : initialX, 
          y: windowState.y !== undefined ? windowState.y : initialY
        });

        setSize({
          width: windowState.width || 900,
          height: windowState.height || 700,
        });

        sizeRef.current = {
          width: windowState.width || 900,
          height: windowState.height || 700,
        };

        setIsMinimized(windowState.isMinimized || false);
        setIsMaximized(windowState.isMaximized || false);
      }

      if (windowManager.getZIndex) {
        setZIndex(windowManager.getZIndex(windowId));
      }
    }
  }, [windowManager, windowId, initialX, initialY]);

  // Se minimizzata, non renderizzare
  if (isMinimized) {
    return null;
  }

  // Contenuto della finestra
  const windowContent = (
    <div className="flex flex-col w-full h-full bg-white overflow-hidden">
      <div
        className="chat-window-handle cursor-move"
        ref={dragHandleRef}
        onMouseDown={handleDragStart}
      >
        <ChatTopBar
          title={title}
          setTitle={setTitle}
          closeChat={onClose}
          onMinimize={onMinimize}
          membersInfo={[]}
          users={filteredUsers}
          isNewMessage={true}
          updateReceiversList={handleReceiversUpdate}
          hexColor={hexColor}
          notificationCategoryId={currentNotificationCategoryId}
          notificationCategoryName={
            responseOptions.find(
              (o) => o.notificationCategoryId == currentNotificationCategoryId,
            )?.name
          }
          receiversList={receivers.join("-")}
          onUpdateCategoryId={handleUpdateCategoryId}
          disableTitleEdit={type === "task"}
        />
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 overflow-hidden transition-all">
          <div className="flex flex-col h-full">
            {type === "task" && metadata.projectId && (
              <div className="p-2 bg-blue-50 border-b">
                <p className="text-xs text-blue-700">
                  Questa chat sarà collegata all'attività selezionata
                </p>
              </div>
            )}

            {receivers.length > 0 && (
              <div className="p-2 bg-gray-50 border-b flex flex-wrap gap-1">
                <div className="flex items-center">
                  <span className="text-xs text-gray-600 mr-2">
                    Destinatari:
                  </span>
                  <div className="flex flex-wrap gap-1 max-w-[600px] overflow-hidden">
                    {receivers.length <= 3 ? (
                      receivers.map((userId) => {
                        const user = users.find((u) => u.userId == userId);
                        if (!user) return null;
                        return (
                          <span
                            key={userId}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full"
                          >
                            {user.firstName} {user.lastName}
                          </span>
                        );
                      })
                    ) : (
                      <>
                        {receivers.slice(0, 2).map((userId) => {
                          const user = users.find((u) => u.userId == userId);
                          if (!user) return null;
                          return (
                            <span
                              key={userId}
                              className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full"
                            >
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
                    onClick={() =>
                      document.querySelector("[data-info-button]")?.click()
                    }
                  >
                    Modifica
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto" ref={chatListRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                  <div className="bg-gray-100 rounded-full p-6 mb-4">
                    <div style={{ color: hexColor }}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        <line x1="9" y1="10" x2="15" y2="10"></line>
                        <line x1="12" y1="7" x2="12" y2="13"></line>
                      </svg>
                    </div>
                  </div>
                  <p className="text-center text-lg font-medium mb-2">
                    {type === "task" ? "Nuova chat per l'attività" : "Nuovo messaggio"}
                  </p>
                  <p className="text-center text-sm max-w-md">
                    {type === "task"
                      ? "Scrivi il primo messaggio per iniziare la discussione su questa attività."
                      : "Compila il titolo, seleziona i destinatari dal menu info (in alto a destra) e scrivi il tuo messaggio."
                    }
                    {!isSidebarOpen && (
                      <span>
                        {" "}
                        Se necessario, puoi aggiungere degli allegati
                        cliccando sul pulsante a sinistra.
                      </span>
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
                  receivers={receivers.join("-")}
                  hexColor={hexColor}
                  title={title}
                  notificationCategoryId={notificationCategoryId}
                  notificationCategoryName={
                    responseOptions.find(
                      (o) =>
                        o.notificationCategoryId == notificationCategoryId,
                    )?.name
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <ChatBottomBar
        notificationId={0}
        title={title}
        notificationCategoryId={currentNotificationCategoryId}
        responseOptions={responseOptions}
        receiversList={receivers.join("-")}
        users={filteredUsers}
        updateReceiversList={handleReceiversUpdate}
        setSending={setSending}
        onSend={handleSend}
        isNewMessage={true}
        replyToMessage={replyToMessage}
        setReplyToMessage={setReplyToMessage}
        hexColor={hexColor}
        onRequestClose={onClose}
        openChatModal={openChatModal}
        metadata={metadata}
      />
    </div>
  );

  // Render per finestra maximized
  if (isMaximized) {
    return (
      <div
        className="fixed inset-0 z-[1100] bg-white"
        ref={windowRef}
        onClick={() => windowManager?.activateWindow(windowId)}
      >
        {windowContent}
      </div>
    );
  }

  // Render normale con resize
  return (
    <div
      ref={nodeRef}
      className="chat-window new-message-window"
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
          onClick={() => windowManager?.activateWindow(windowId)}
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

export default NewMessageWindow;