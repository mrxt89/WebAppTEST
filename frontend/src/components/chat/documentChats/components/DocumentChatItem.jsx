import React from "react";
import { MessageSquare, Users, Info, Calendar, Eye, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getDocumentTypeConfig } from "../config/documentTypes";

const DocumentChatItem = ({ 
  chat, 
  onClick, 
  onUnlink,
  showUnlinkButton = false,
  isReadOnly = false 
}) => {
  // Estrai informazioni sui documenti collegati
  const getLinkedDocuments = () => {
    const docs = [];
    
    if (chat.DocumentType) {
      const config = getDocumentTypeConfig(chat.DocumentType);
      if (config) {
        docs.push({
          type: chat.DocumentType,
          display: config.displayFormat(chat),
          color: config.color
        });
      }
    }
    
    // Aggiungi altri documenti se presenti
    if (chat.BOM) docs.push({ type: 'BOM', display: `DB: ${chat.BOM}`, color: 'gray' });
    if (chat.SaleOrdId > 0) docs.push({ type: 'SaleOrd', display: `OC: ${chat.SaleOrdId}`, color: 'indigo' });
    if (chat.MOId > 0) docs.push({ type: 'MO', display: `ODP: ${chat.MOId}`, color: 'purple' });
    if (chat.ItemCode) docs.push({ type: 'Item', display: `Art: ${chat.ItemCode}`, color: 'yellow' });
    
    return docs;
  };

  const linkedDocs = getLinkedDocuments();
  const isUserMember = chat.isUserMember !== false; // Default true per retrocompatibilità

  return (
    <div
      className={`
        p-4 hover:bg-gray-50 transition-colors cursor-pointer
        ${isUserMember ? "border-l-4 border-green-500" : ""}
        ${isReadOnly ? "opacity-75" : ""}
      `}
      onClick={() => !isReadOnly && onClick(chat)}
    >
      <div className="flex items-start gap-3">
        {/* Icona Chat */}
        <div className="flex-shrink-0">
          <div
            className="p-2 rounded-full"
            style={{ backgroundColor: chat.hexColor || "#6366f1" }}
          >
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
        </div>

        {/* Contenuto principale */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-sm truncate pr-2">
              {chat.title}
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 whitespace-nowrap">
                <Calendar className="h-3 w-3 inline mr-1" />
                {new Date(chat.tbCreated).toLocaleDateString()}
              </span>
              {showUnlinkButton && onUnlink && !isReadOnly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnlink(chat);
                  }}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Scollega chat"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Ultimo messaggio */}
          {chat.lastMessage && (
            <p className="text-xs text-gray-600 truncate mb-2">
              {chat.lastMessage}
            </p>
          )}

          {/* Badges informativi */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">
              {chat.categoryName || "Generale"}
            </Badge>
            
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {chat.participantCount || 0}
            </Badge>

            {chat.messageCount > 0 && (
              <Badge variant="outline" className="text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />
                {chat.messageCount}
              </Badge>
            )}

            {chat.isClosed && (
              <Badge variant="destructive" className="text-xs">
                Chiusa
              </Badge>
            )}

            {chat.archived && (
              <Badge variant="secondary" className="text-xs text-purple-600">
                Archiviata
              </Badge>
            )}

            {!isUserMember && (
              <Badge variant="warning" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                Sola lettura
              </Badge>
            )}
          </div>

          {/* Documenti collegati */}
          {linkedDocs.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {linkedDocs.map((doc, index) => (
                <Badge
                  key={`${doc.type}-${index}`}
                  variant="outline"
                  className={`text-xs bg-${doc.color}-50 text-${doc.color}-700 border-${doc.color}-200`}
                >
                  {doc.display}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentChatItem;