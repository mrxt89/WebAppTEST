import React, { useEffect } from "react";
import {
  X,
  Search,
  ChevronDown,
  Link,
  FileText,
  Truck,
  ShoppingCart,
  Clipboard,
  User,
  Eye,
  FileBox,
  MessageSquare,
  Calendar,
  Tag,
} from "lucide-react";
import axios from "axios";
import { config } from "@/config";

const DocumentSearchSection = ({
  isDocumentSearchVisible,
  toggleDocumentSearch,
  documentTab,
  setDocumentTab,
  documentsSearchTerm,
  setDocumentsSearchTerm,
  documentsSearchResults,
  setDocumentsSearchResults,
  documentsLoading,
  setDocumentsLoading,
  documentChats,
  setDocumentChats,
  documentChatsLoading,
  setDocumentChatsLoading,
  selectedDocument,
  setSelectedDocument,
  isDocTypesOpen,
  setIsDocTypesOpen,
  openChatModal,
}) => {
  // Tipi di documento disponibili per la ricerca
  const documentTypes = [
    { id: "customers", label: "Clienti", icon: <User size={16} /> },
    { id: "suppliers", label: "Fornitori", icon: <Truck size={16} /> },
    {
      id: "SaleOrd",
      label: "Ordini Cliente",
      icon: <ShoppingCart size={16} />,
    },
    { id: "SaleDoc", label: "Documenti Vendita", icon: <FileText size={16} /> },
    {
      id: "PurchaseOrd",
      label: "Ordini Fornitore",
      icon: <FileBox size={16} />,
    },
    {
      id: "PurchaseDoc",
      label: "Documenti Acquisto",
      icon: <FileText size={16} />,
    },
    { id: "MO", label: "Ordini Produzione", icon: <Clipboard size={16} /> },
    { id: "BOM", label: "Distinte Base", icon: <Link size={16} /> },
    { id: "Item", label: "Articoli", icon: <Tag size={16} /> },
    { id: "Task", label: "Attività", icon: <Clipboard size={16} /> },
  ];

  const handleDocumentsSearchChange = (event) => {
    setDocumentsSearchTerm(event.target.value);
  };

  const handleClearDocumentsSearch = () => {
    setDocumentsSearchTerm("");
    setDocumentsSearchResults([]);
  };

  // Funzione per cercare documenti in base al tipo e termine di ricerca
  const searchDocuments = async () => {
    if (!documentsSearchTerm.trim() || documentsSearchTerm.trim().length < 2)
      return;

    setDocumentsLoading(true);
    setDocumentsSearchResults([]);
    setSelectedDocument(null);

    try {
      const token = localStorage.getItem("token");
      const searchType =
        documentTab === "customers"
          ? "Customer"
          : documentTab === "suppliers"
            ? "Supplier"
            : documentTab;

      const response = await axios.get(
        `${config.API_BASE_URL}/documents/search?documentType=${searchType}&searchTerm=${encodeURIComponent(documentsSearchTerm)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        setDocumentsSearchResults(response.data.data || []);
      } else {
        console.warn("Document search failed:", response.data.message);
      }
    } catch (error) {
      console.error("Error searching documents:", error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Funzione per cercare chat legate a un documento
  const searchChatsByDocument = async (document) => {
    setSelectedDocument(document);
    setDocumentChatsLoading(true);
    setDocumentChats([]);

    try {
      const token = localStorage.getItem("token");
      const searchType =
        documentTab === "customers"
          ? "Customer"
          : documentTab === "suppliers"
            ? "Supplier"
            : documentTab;

      // Costruisci il valore di ricerca in base al tipo di documento
      let searchValue = "";
      if (documentTab === "customers" || documentTab === "suppliers") {
        searchValue = document.DocumentNumber; // CustSuppCode
      } else if (
        ["SaleOrd", "PurchaseOrd", "SaleDoc", "PurchaseDoc", "MO"].includes(
          documentTab,
        )
      ) {
        searchValue = document.DocumentId.toString();
      } else if (documentTab === "BOM") {
        searchValue = document.DocumentNumber; // BOM code
      } else if (documentTab === "Item") {
        searchValue = document.DocumentNumber; // Item code
      }

      const response = await axios.get(
        `${config.API_BASE_URL}/chats/by-document?searchType=${searchType}&searchValue=${encodeURIComponent(searchValue)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        setDocumentChats(response.data.data || []);
      } else {
        console.warn("Chat search failed:", response.data.message);
      }
    } catch (error) {
      console.error("Error searching chats by document:", error);
    } finally {
      setDocumentChatsLoading(false);
    }
  };

  // Funzione per aprire una chat in modalità sola lettura
  const openChatInReadOnlyMode = async (notificationId) => {
    try {
      setDocumentChatsLoading(true);
      const token = localStorage.getItem("token");
      // Prima aggiungi l'utente in modalità sola lettura
      const response = await axios.post(
        `${config.API_BASE_URL}/chats/${notificationId}/read-only-access`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        // Se l'utente è stato aggiunto con successo o già ha accesso
        // Poi apri la chat
        openChatModal(notificationId);
      } else {
        console.error(
          "Failed to gain read-only access:",
          response.data.message,
        );
      }
    } catch (error) {
      console.error("Error opening chat in read-only mode:", error);
    } finally {
      setDocumentChatsLoading(false);
    }
  };

  // Gestisci click fuori dai tipi documento
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDocTypesOpen && !event.target.closest(".document-type-dropdown")) {
        setIsDocTypesOpen(false);
      }
    };

    if (isDocTypesOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDocTypesOpen, setIsDocTypesOpen]);

  if (!isDocumentSearchVisible) return null;

  return (
    <div className="document-search-section bg-white border-b border-gray-200 p-3">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">Cerca chat per documento</h3>
        <button
          onClick={toggleDocumentSearch}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Document Type Dropdown */}
      <div className="mb-3 relative document-type-dropdown">
        <div
          className="p-2 border rounded-lg flex justify-between items-center cursor-pointer bg-white hover:bg-gray-50"
          onClick={() => setIsDocTypesOpen(!isDocTypesOpen)}
        >
          <div className="flex items-center">
            {React.cloneElement(
              documentTypes.find((t) => t.id === documentTab)?.icon || (
                <Link />
              ),
              { className: "h-4 w-4 mr-2" },
            )}
            <span className="text-sm">
              {documentTypes.find((t) => t.id === documentTab)?.label ||
                "Seleziona categoria"}
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isDocTypesOpen ? "rotate-180" : ""}`}
          />
        </div>

        {/* Dropdown menu */}
        {isDocTypesOpen && (
          <div className="absolute left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 document-type-menu max-h-48 overflow-y-auto">
            {documentTypes.map((type) => (
              <button
                key={type.id}
                className={`w-full flex items-center py-2 px-3 text-sm hover:bg-gray-50 ${
                  documentTab === type.id
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : ""
                }`}
                onClick={() => {
                  setDocumentTab(type.id);
                  setDocumentsSearchResults([]);
                  setSelectedDocument(null);
                  setDocumentChats([]);
                  setIsDocTypesOpen(false);
                }}
              >
                {React.cloneElement(type.icon, {
                  className: "h-4 w-4 mr-2",
                })}
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Document Search Bar */}
      <div className="relative mb-3">
        <input
          type="text"
          placeholder={`Cerca ${documentTypes.find((t) => t.id === documentTab)?.label.toLowerCase() || "documenti"}...`}
          value={documentsSearchTerm}
          onChange={handleDocumentsSearchChange}
          className="w-full p-2 pl-9 pr-9 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="absolute inset-y-0 right-3 flex items-center pl-3 pointer-events-none">
          <Search className="w-4 h-4 text-gray-400" />
        </div>
        {documentsSearchTerm && (
          <button
            onClick={handleClearDocumentsSearch}
            className="absolute inset-y-0 right-5 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <button
        onClick={searchDocuments}
        className="w-full py-2 px-3 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        disabled={documentsSearchTerm.length < 2 || documentsLoading}
      >
        {documentsLoading ? (
          <span className="flex items-center justify-center">
            <i className="bi bi-arrow-repeat spin mr-2"></i> Ricerca in corso...
          </span>
        ) : (
          "Cerca Documenti"
        )}
      </button>

      {/* Document Results and Chat List */}
      <div className="mt-3" style={{ height: "50vh", overflowY: "auto" }}>
        {/* Document Search Results */}
        {documentsSearchResults.length > 0 && (
          <div className="mb-3" style={{ height: "50vh", overflowY: "auto" }}>
            <h4 className="text-xs font-medium text-gray-600 mb-2">
              Documenti trovati ({documentsSearchResults.length})
            </h4>
            <div className="space-y-2 overflow-y-auto pr-1 documents-list">
              {documentsSearchResults.map((doc) => (
                <div
                  key={`doc-${doc.DocumentType}-${doc.DocumentId}`}
                  className={`document-item p-2 border rounded-lg cursor-pointer transition-colors ${
                    selectedDocument?.DocumentId === doc.DocumentId
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                  onClick={() => searchChatsByDocument(doc)}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-2 bg-gray-100 p-1.5 rounded-md">
                      {
                        documentTypes.find((t) => t.id === documentTab)?.icon
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {doc.DocumentNumber}
                        {doc.Status && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 bg-gray-100 rounded-full">
                            {doc.Status}
                          </span>
                        )}
                      </p>

                      {doc.DocumentReference && (
                        <p className="text-xs text-gray-500 truncate">
                          {doc.DocumentReference}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 truncate">
                        {doc.DocumentDescription}
                      </p>
                      {doc.DocumentDate && (
                        <p className="text-xs text-gray-400 flex items-center mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(doc.DocumentDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 transform transition-transform ${
                        selectedDocument?.DocumentId === doc.DocumentId
                          ? "rotate-180"
                          : ""
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document-Related Chats */}
        {selectedDocument && (
          <div className="mt-4">
            <h4 className="text-xs font-medium text-gray-600 mb-2 flex items-center">
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              Chat legate a:
              <span className="ml-1 font-semibold text-blue-600">
                {selectedDocument.DocumentNumber}
              </span>
            </h4>

            {documentChatsLoading ? (
              <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                <i className="bi bi-arrow-repeat spin mr-2"></i>
                <span className="text-sm text-gray-500">
                  Caricamento chat...
                </span>
              </div>
            ) : documentChats.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {documentChats.map((chat, index) => (
                  <div
                    key={`doc-chat-${chat.notificationId}-${index}`}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      chat.isUserMember
                        ? "bg-white border-gray-200 hover:bg-gray-50"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                    onClick={() =>
                      chat.isUserMember
                        ? openChatModal(chat.notificationId)
                        : openChatInReadOnlyMode(chat.notificationId)
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <span
                          className="w-3 h-3 rounded-full mr-2"
                          style={{
                            backgroundColor: chat.hexColor || "#6366f1",
                          }}
                        ></span>
                        <h5 className="text-sm font-medium truncate">
                          {chat.title}
                        </h5>
                      </div>
                      {!chat.isUserMember && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full flex items-center">
                          <Eye className="h-3 w-3 mr-1" />
                          Sola lettura
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                      {chat.lastMessage || "Nessun messaggio"}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {chat.participantCount} partecipanti
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(chat.tbCreated).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
                <MessageSquare className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 text-center">
                  Nessuna chat trovata per questo documento.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty State for Document Search */}
        {!documentsSearchResults.length &&
          !documentsLoading &&
          !selectedDocument &&
          documentsSearchTerm.length >= 2 && (
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg mt-3">
              <Link className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500 text-center">
                Nessun documento trovato. Prova a modificare i criteri di
                ricerca.
              </p>
            </div>
          )}

        {/* Help Text for Document Search */}
        {!documentsSearchResults.length &&
          !documentsLoading &&
          documentsSearchTerm.length < 2 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Suggerimento:</strong> Digita almeno 2 caratteri per
                cercare documenti. Puoi cercare{" "}
                {documentTypes
                  .find((t) => t.id === documentTab)
                  ?.label.toLowerCase()}{" "}
                per codice, descrizione o altri dati rilevanti.
              </p>
            </div>
          )}
      </div>

      {/* CSS per stilizzare la sezione di ricerca documenti */}
      <style>
        {`
          /* Stili per la sezione di ricerca documenti */
          .document-search-section {
            max-height: 80vh;
            overflow-y: auto;
          }

          .documents-list::-webkit-scrollbar {
            width: 5px;
          }

          .documents-list::-webkit-scrollbar-thumb {
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: 3px;
          }

          .documents-list::-webkit-scrollbar-track {
            background-color: rgba(0, 0, 0, 0.05);
          }

          .document-item {
            transition: all 0.2s ease;
          }

          .document-item:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }

          .doc-type-tabs {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .doc-type-tabs::-webkit-scrollbar {
            display: none;
          }

          /* Animazione di caricamento */
          .spin {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default DocumentSearchSection; 