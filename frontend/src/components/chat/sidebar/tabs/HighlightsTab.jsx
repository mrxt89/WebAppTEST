import React, { useState, useRef, useEffect } from "react";
import { Zap, ZapOff, Plus, Clock, X } from "lucide-react";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import { swal } from "@/lib/common";
import useAIActions from "@/hooks/useAIActions";

const HighlightsTab = ({ 
  notificationId, 
  highlights, 
  loading: parentLoading,
  currentUserId 
}) => {
  const [newHighlightText, setNewHighlightText] = useState("");
  const [showHighlightInput, setShowHighlightInput] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  const highlightInputRef = useRef(null);

  const {
    loadingHighlights,
    addHighlight,
    removeHighlight,
    fetchHighlights,
  } = useNotifications();

  const { generateConversationSummary, loading: aiLoading } = useAIActions();

  useEffect(() => {
    if (showHighlightInput && highlightInputRef.current) {
      highlightInputRef.current.focus();
    }
  }, [showHighlightInput]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const handleAddHighlight = async () => {
    if (!newHighlightText.trim()) {
      swal.fire("Attenzione", "Inserisci il testo", "warning");
      return;
    }

    try {
      await addHighlight(notificationId, newHighlightText, false);
      setNewHighlightText("");
      setShowHighlightInput(false);
      swal.fire({
        title: "Punto aggiunto",
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
      });
    } catch (error) {
      console.error("Error adding highlight:", error);
      swal.fire("Errore", "Impossibile aggiungere il testo", "error");
    }
  };

  const handleRemoveHighlight = async (highlightId) => {
    try {
      const { isConfirmed } = await swal.fire({
        title: "Conferma eliminazione",
        text: "Sei sicuro di voler eliminare questo testo?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sì, elimina",
        cancelButtonText: "Annulla",
      });

      if (isConfirmed) {
        await removeHighlight(highlightId, notificationId);
        swal.fire({
          title: "Punto eliminato",
          icon: "success",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
        });
      }
    } catch (error) {
      console.error("Error removing highlight:", error);
      swal.fire("Errore", "Impossibile eliminare il testo", "error");
    }
  };

  const handleGenerateHighlights = async () => {
    try {
      setSummaryLoading(true);

      if (!currentUserId) {
        throw new Error("Impossibile identificare l'utente corrente");
      }

      const response = await generateConversationSummary(notificationId, currentUserId);
      const summaryPoints = response.generatedHighlights || response;

      if (summaryPoints && summaryPoints.length > 0) {
        await fetchHighlights(notificationId);

        swal.fire({
          title: "Riepilogo generato",
          icon: "success",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
        });
      } else {
        swal.fire({
          title: "Attenzione",
          text: "Non è stato possibile generare un riepilogo significativo per questa conversazione",
          icon: "warning",
          timer: 3000,
        });
      }
    } catch (error) {
      console.error("Error generating highlights:", error);
      swal.fire("Errore", "Impossibile generare il riepilogo", "error");
    } finally {
      setSummaryLoading(false);
    }
  };

  const loading = parentLoading || loadingHighlights;

  return (
    <div className="px-2 py-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 px-2">
        <h3 className="text-sm font-medium">
          Consigli ({highlights.length})
        </h3>
        <div className="flex gap-1">
          <button
            className="p-1 rounded-full transition-colors hover:bg-gray-100"
            onClick={() => setShowHighlightInput(true)}
            title="Aggiungi punto di riepilogo"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            className={`p-1 rounded-full transition-colors ${
              summaryLoading || aiLoading
                ? "bg-blue-100 text-blue-600 animate-pulse"
                : "hover:bg-gray-100"
            }`}
            onClick={handleGenerateHighlights}
            disabled={summaryLoading || aiLoading}
            title="Genera riepilogo"
          >
            <Zap className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Input per aggiungere un nuovo punto importante */}
      {showHighlightInput && (
        <div className="mb-3 p-2 border border-gray-200 rounded-lg">
          <textarea
            ref={highlightInputRef}
            value={newHighlightText}
            onChange={(e) => setNewHighlightText(e.target.value)}
            placeholder="Inserisci il testo..."
            className="w-full p-2 border border-gray-300 rounded text-sm mb-2"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <button
              className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
              onClick={() => {
                setShowHighlightInput(false);
                setNewHighlightText("");
              }}
            >
              Annulla
            </button>
            <button
              className="px-3 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded"
              onClick={handleAddHighlight}
            >
              Salva
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-sm text-gray-500">Caricamento in corso...</p>
        </div>
      ) : highlights.length > 0 ? (
        <div className="space-y-3 flex-1 overflow-y-auto px-1">
          {highlights.map((highlight) => (
            <div
              key={highlight.HighlightID}
              className={`border border-gray-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow ${
                highlight.IsAutoGenerated
                  ? "border-l-4 border-l-blue-400 bg-white"
                  : "bg-gray-200"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <button
                  className="text-red-500 hover:text-red-700 p-1"
                  onClick={() => handleRemoveHighlight(highlight.HighlightID)}
                >
                  <X className="h-3 w-3" />
                </button>
                {highlight.IsAutoGenerated && (
                  <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">
                    Auto
                  </span>
                )}
              </div>
              <p className="text-sm">{highlight.HighlightText}</p>
              <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDate(highlight.HighlightCreated)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <ZapOff className="h-10 w-10 text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">
            Nessun punto evidenziato
          </p>
          <div className="flex gap-2 mt-3">
            <button
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200 transition-colors"
              onClick={() => setShowHighlightInput(true)}
            >
              Aggiungi manualmente
            </button>
            <button
              className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition-colors"
              onClick={handleGenerateHighlights}
            >
              Genera automaticamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HighlightsTab;