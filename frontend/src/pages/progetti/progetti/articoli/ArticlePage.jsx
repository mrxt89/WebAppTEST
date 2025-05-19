import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ArticleForm from "./ArticleForm";
import { swal } from "@/lib/common";
import { config } from "@/config";
import { AlertCircle, Loader2 } from "lucide-react";

/**
 * ArticlePage - Pagina per la gestione degli articoli di progetto
 * Gestisce tutti i parametri URL e i dati necessari per ArticleForm
 */
const ArticlePage = () => {
  const { mode, projectId, itemId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [project, setProject] = useState(null);

  // Effetto per validare i parametri e caricare i dati iniziali
  useEffect(() => {
    const validateAndLoad = async () => {
      try {
        setLoading(true);
        setError(null);

        // Verifica che il mode sia valido
        if (!["new", "edit", "copy"].includes(mode)) {
          throw new Error(`Modalità non valida: ${mode}`);
        }

        // Verifica che il projectId sia valido
        if (!projectId) {
          throw new Error("ID progetto non specificato");
        }

        // Se in modalità edit o copy, verifica che l'itemId sia valido
        if ((mode === "edit" || mode === "copy") && !itemId) {
          throw new Error(
            "ID articolo non specificato per la modalità " + mode,
          );
        }

        // Carica informazioni progetto (per verificare che esista)
        await loadProject(projectId);

        // Tutto ok, rimuovi loading
        setLoading(false);
      } catch (error) {
        console.error("Error validating parameters:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    validateAndLoad();
  }, [mode, projectId, itemId]);

  // Funzione per caricare informazioni progetto
  const loadProject = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/projects/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Progetto non trovato");
        }
        throw new Error("Errore nel caricamento del progetto");
      }

      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error("Error loading project:", error);
      throw error;
    }
  };

  // Gestione casi di loading e errore
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-lg text-gray-600">Caricamento in corso...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-md text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-red-600 mb-2">
            Si è verificato un errore
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Torna indietro
          </button>
        </div>
      </div>
    );
  }

  // Tutto ok, renderizza l'ArticleForm
  return <ArticleForm />;
};

export default ArticlePage;
