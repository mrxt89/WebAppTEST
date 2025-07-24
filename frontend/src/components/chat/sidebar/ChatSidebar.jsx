import React, { useState, useRef, useEffect, forwardRef, useCallback } from "react";
import { ChevronRight, ChevronLeft, Paperclip, Link, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import FileViewer from "@/components/ui/fileViewer";
import DocumentLinker from "../DocumentLinker";

// Import delle tab
import AttachmentsTab from "./tabs/AttachmentsTab";
import DocumentsTab from "./tabs/DocumentsTab";
import HighlightsTab from "./tabs/HighlightsTab";

const ChatSidebar = forwardRef((props, ref) => {
  const {
    notificationId,
    visible = true,
    onToggle,
    isMobile = false,
    hexColor,
    messages,
    users,
    currentUserId,
    selectedMessageId,
    selectedMessageText,
    navigate,
  } = props;

  const [activeTab, setActiveTab] = useState("attachments");
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentLinkerOpen, setDocumentLinkerOpen] = useState(false);

  const {
    getNotificationAttachments,
    refreshAttachments,
    getLinkedDocuments,
    highlights,
    fetchHighlights,
    recordAttachmentView,
  } = useNotifications();

  const [attachments, setAttachments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef(null);
  const categoryColor = hexColor || "#3b82f6";

  // Funzione per caricare gli allegati
  const loadAttachments = useCallback(async () => {
    if (!notificationId) return;
    
    try {
      const data = await getNotificationAttachments(notificationId);
      setAttachments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading attachments:", err);
    }
  }, [notificationId, getNotificationAttachments]);

  // Funzione per caricare i documenti
  const loadDocuments = useCallback(async () => {
    if (!notificationId) return;
    
    try {
      const response = await getLinkedDocuments(notificationId);
      setDocuments(response?.documents || []);
    } catch (err) {
      console.error("Error loading documents:", err);
    }
  }, [notificationId, getLinkedDocuments]);

  // Effect per caricare i dati quando cambia tab
  useEffect(() => {
    const loadTabData = async () => {
      setLoading(true);
      try {
        switch (activeTab) {
          case "attachments":
            await loadAttachments();
            break;
          case "documents":
            await loadDocuments();
            break;
          case "highlights":
            if (notificationId) {
              await fetchHighlights(notificationId);
            }
            break;
        }
      } catch (err) {
        console.error(`Error loading ${activeTab}:`, err);
      } finally {
        setLoading(false);
      }
    };

    loadTabData();
  }, [activeTab, notificationId, loadAttachments, loadDocuments, fetchHighlights]);

  // Listeners per aggiornamenti in tempo reale
  useEffect(() => {
    const handleAttachmentViewed = (event) => {
      const { attachmentId } = event.detail;
      setAttachments(prev => prev.map(att => 
        att.AttachmentID === attachmentId 
          ? { ...att, HasBeenViewed: true, FirstViewedAt: new Date().toISOString() }
          : att
      ));
    };

    const handleAttachmentDownloaded = (event) => {
      const { attachmentId } = event.detail;
      setAttachments(prev => prev.map(att => 
        att.AttachmentID === attachmentId 
          ? { ...att, HasBeenViewed: true, FirstViewedAt: att.FirstViewedAt || new Date().toISOString() }
          : att
      ));
    };

    const handleDocumentLinked = async () => {
      if (activeTab === "documents") {
        await loadDocuments();
      }
    };

    // IMPORTANTE: Handler per quando viene inviato un messaggio
    const handleMessageSent = async (event) => {
      if (activeTab === "attachments" && event.detail?.notificationId === notificationId) {
        // Aspetta un attimo per permettere al server di processare
        setTimeout(async () => {
          await loadAttachments();
        }, 500);
      }
    };

    // IMPORTANTE: Handler per refresh allegati
    const handleRefreshAttachments = async (event) => {
      if (event.detail?.notificationId === notificationId && activeTab === "attachments") {
        await loadAttachments();
      }
    };

    // IMPORTANTE: Handler per quando viene caricato un nuovo allegato
    const handleAttachmentUploaded = async (event) => {
      if (event.detail?.notificationId === notificationId && activeTab === "attachments") {
        await loadAttachments();
      }
    };

    // IMPORTANTE: Handler per reload della chat
    const handleReloadChat = async (event) => {
      if (event.detail?.notificationId === notificationId && activeTab === "attachments") {
        // Aspetta che i dati siano aggiornati
        setTimeout(async () => {
          await loadAttachments();
        }, 300);
      }
    };

    document.addEventListener("attachment-viewed", handleAttachmentViewed);
    document.addEventListener("attachment-downloaded", handleAttachmentDownloaded);
    document.addEventListener("document-linked", handleDocumentLinked);
    document.addEventListener("document-unlinked", handleDocumentLinked);
    document.addEventListener("chat-message-sent", handleMessageSent);
    document.addEventListener("refresh-attachments", handleRefreshAttachments);
    document.addEventListener("attachment-uploaded", handleAttachmentUploaded);
    document.addEventListener("reload-open-chat", handleReloadChat);
    
    return () => {
      document.removeEventListener("attachment-viewed", handleAttachmentViewed);
      document.removeEventListener("attachment-downloaded", handleAttachmentDownloaded);
      document.removeEventListener("document-linked", handleDocumentLinked);
      document.removeEventListener("document-unlinked", handleDocumentLinked);
      document.removeEventListener("chat-message-sent", handleMessageSent);
      document.removeEventListener("refresh-attachments", handleRefreshAttachments);
      document.removeEventListener("attachment-uploaded", handleAttachmentUploaded);
      document.removeEventListener("reload-open-chat", handleReloadChat);
    };
  }, [activeTab, notificationId, loadAttachments, loadDocuments]);

  const handleViewAttachment = useCallback(async (attachment) => {
    setSelectedFile(attachment);
    
    // Se l'allegato non è stato ancora visualizzato, registra la visualizzazione
    if (!attachment.HasBeenViewed) {
      try {
        // Aggiorna immediatamente lo stato locale PRIMA della chiamata API
        setAttachments(prev => prev.map(att => 
          att.AttachmentID === attachment.AttachmentID 
            ? { ...att, HasBeenViewed: true, FirstViewedAt: new Date().toISOString() }
            : att
        ));

        // Poi registra la visualizzazione sul server
        await recordAttachmentView(attachment.AttachmentID);

        // Emetti evento per altri componenti
        document.dispatchEvent(
          new CustomEvent("attachment-viewed", {
            detail: { 
              attachmentId: attachment.AttachmentID,
              notificationId: notificationId 
            },
          })
        );
      } catch (error) {
        console.error("Error recording attachment view:", error);
        // In caso di errore, ripristina lo stato
        setAttachments(prev => prev.map(att => 
          att.AttachmentID === attachment.AttachmentID 
            ? { ...att, HasBeenViewed: false, FirstViewedAt: null }
            : att
        ));
      }
    }
  }, [recordAttachmentView, notificationId]);

  const tabs = [
    { id: "attachments", icon: Paperclip, component: AttachmentsTab },
    { id: "documents", icon: Link, component: DocumentsTab },
    { id: "highlights", icon: Zap, component: HighlightsTab },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "attachments":
        return (
          <AttachmentsTab
            notificationId={notificationId}
            attachments={attachments}
            setAttachments={setAttachments}
            loading={loading}
            onViewAttachment={handleViewAttachment}
            refreshAttachments={async () => {
              await loadAttachments();
              return attachments;
            }}
          />
        );
      case "documents":
        return (
          <DocumentsTab
            notificationId={notificationId}
            documents={documents}
            setDocuments={setDocuments}
            loading={loading}
            onOpenDocumentLinker={() => setDocumentLinkerOpen(true)}
            navigate={navigate}
          />
        );
      case "highlights":
        return (
          <HighlightsTab
            notificationId={notificationId}
            highlights={highlights[notificationId] || []}
            loading={loading}
            currentUserId={currentUserId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute z-2 p-2 rounded-full shadow-md bg-white hover:bg-gray-100 transition-all"
        style={{
          left: visible ? "290px" : "5px",
          opacity: visible ? 1 : 0.8,
          top: "50%",
          transform: "translateY(-50%)",
          transition: "left 0.3s ease-in-out",
        }}
      >
        {visible ? (
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-600" />
        )}
      </button>

      {/* Main Sidebar */}
      <AnimatePresence>
        {visible && (
          <motion.div
            ref={containerRef}
            className="bg-gray-50 border-l border-gray-200 h-full flex flex-col"
            style={{ width: "300px" }}
            initial={{ width: 0, opacity: 0 }}
            animate={{
              width: "300px",
              opacity: 1,
              transition: {
                width: { duration: 0.3 },
                opacity: { duration: 0.2, delay: 0.1 },
              },
            }}
            exit={{
              width: 0,
              opacity: 0,
              transition: {
                width: { duration: 0.3 },
                opacity: { duration: 0.1 },
              },
            }}
          >
            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-200 bg-white">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`flex-1 py-3 text-xs font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? "text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    color: activeTab === tab.id ? categoryColor : undefined,
                  }}
                >
                  <tab.icon className="h-4 w-4 mx-auto" />
                  {activeTab === tab.id && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ backgroundColor: categoryColor }}
                      layoutId="activeTabIndicator"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content area */}
            <div className="flex-1 overflow-hidden">{renderTabContent()}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <FileViewer
        file={selectedFile}
        isOpen={!!selectedFile}
        onClose={() => setSelectedFile(null)}
      />
      <DocumentLinker
        notificationId={notificationId}
        isOpen={documentLinkerOpen}
        onClose={() => setDocumentLinkerOpen(false)}
      />
    </>
  );
});

ChatSidebar.displayName = "ChatSidebar";

export default ChatSidebar;