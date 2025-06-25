import React from "react";
import { Link, File, Unlink, Plus } from "lucide-react";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import { swal } from "@/lib/common";

const DocumentsTab = ({ 
  notificationId, 
  documents, 
  setDocuments, 
  loading,
  onOpenDocumentLinker 
}) => {
  const { getLinkedDocuments, unlinkDocument } = useNotifications();

  const handleUnlinkDocument = async (doc) => {
    try {
      if (!notificationId || !doc?.LinkId) {
        swal.fire({
          title: "Errore",
          text: "Dati documento non validi",
          icon: "error",
        });
        return;
      }

      const { isConfirmed } = await swal.fire({
        title: "Conferma scollegamento",
        text: "Sei sicuro di voler scollegare questo documento?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sì, scollega",
        cancelButtonText: "Annulla",
      });

      if (!isConfirmed) return;

      const result = await unlinkDocument(parseInt(notificationId), parseInt(doc.LinkId));

      if (result) {
        // Aggiorna la lista dei documenti
        const updatedDocs = await getLinkedDocuments(notificationId);
        if (updatedDocs && updatedDocs.documents) {
          setDocuments(updatedDocs.documents);
        }

        swal.fire({
          title: "Successo",
          text: "Documento scollegato con successo",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Errore durante lo scollegamento:", error);
      swal.fire({
        title: "Errore",
        text: error.message || "Impossibile scollegare il documento",
        icon: "error",
      });
    }
  };

  return (
    <div className="px-2 py-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 px-2">
        <h3 className="text-sm font-medium">
          Documenti collegati ({documents.length})
        </h3>
        <button
          className="p-1 rounded-full transition-colors hover:bg-gray-100"
          onClick={onOpenDocumentLinker}
          title="Collega un documento"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <Link className="h-10 w-10 text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">
            Nessun documento collegato
          </p>
          <p className="text-xs text-gray-400 mt-1">
            I documenti collegati appariranno qui
          </p>
          <button
            className="mt-4 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition-colors"
            onClick={onOpenDocumentLinker}
          >
            Collega un documento
          </button>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto px-1">
          {documents.map((doc) => (
            <div
              key={doc.LinkId}
              className="bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-2 border-b border-gray-100">
                <div className="flex items-center">
                  <div className="mr-2 p-2 bg-gray-50 rounded-lg">
                    <File className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">
                      <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] mr-1">
                        {doc.DocumentType}
                      </span>
                      {doc.DocumentNumber || ""}
                    </p>
                    <p
                      className="text-xs text-gray-500 truncate"
                      title={doc.DocumentDescription}
                    >
                      {doc.DocumentDescription || ""}
                    </p>
                    {doc.DocumentDate && (
                      <p className="text-[10px] text-gray-400">
                        {new Date(doc.DocumentDate).toLocaleDateString('it-IT')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex text-xs border-t border-gray-50">
                <button
                  className="flex-1 py-1.5 text-red-600 hover:bg-red-50 transition-colors rounded-br-lg flex items-center justify-center"
                  onClick={() => handleUnlinkDocument(doc)}
                >
                  <Unlink className="h-3 w-3 mr-1" />
                  Scollega
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentsTab;