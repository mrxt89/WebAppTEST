// CreatePollForm.jsx - Versione corretta

import React, { useState } from "react";
import {
  BarChart,
  PlusCircle,
  XCircle,
  Calendar,
  AlertTriangle,
  Check,
} from "lucide-react";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import { swal } from "../../lib/common";

const CreatePollForm = ({ notificationId, onSuccess, onCancel }) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");
  const [loading, setLoading] = useState(false);

  // Aggiungi una nuova opzione
  const addOption = () => {
    if (options.length < 10) {
      // Massimo 10 opzioni
      setOptions([...options, ""]);
    } else {
      swal.fire({
        title: "Limite raggiunto",
        text: "Puoi inserire massimo 10 opzioni",
        icon: "warning",
        zIndex: 9999, // Assicura che il modal appaia sopra tutto
      });
    }
  };

  // Rimuovi un'opzione
  const removeOption = (index) => {
    // Mantieni almeno 2 opzioni
    if (options.length > 2) {
      const newOptions = [...options];
      newOptions.splice(index, 1);
      setOptions(newOptions);
    } else {
      swal.fire({
        title: "Non consentito",
        text: "Il sondaggio deve avere almeno 2 opzioni",
        icon: "warning",
        zIndex: 9999, // Assicura che il modal appaia sopra tutto
      });
    }
  };

  // Aggiorna il testo di un'opzione
  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  // Invia il sondaggio
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validazione
    if (!question.trim()) {
      swal.fire({
        title: "Attenzione",
        text: "Inserisci una domanda",
        icon: "warning",
        zIndex: 9999,
      });
      return;
    }

    // Controlla che tutte le opzioni abbiano del testo
    const filledOptions = options.filter((opt) => opt.trim() !== "");
    if (filledOptions.length < 2) {
      swal.fire({
        title: "Attenzione",
        text: "Inserisci almeno 2 opzioni valide",
        icon: "warning",
        zIndex: 9999,
      });
      return;
    }

    try {
      setLoading(true);

      // Formatta la data di scadenza se presente
      let expiration = null;
      if (expirationDate) {
        expiration = new Date(expirationDate);

        // Verifica che la data sia nel futuro
        if (expiration <= new Date()) {
          swal.fire({
            title: "Data non valida",
            text: "La data di scadenza deve essere nel futuro",
            icon: "error",
          });
          setLoading(false);
          return;
        }
      }

      // Preparazione dei dati del sondaggio
      const pollData = {
        notificationId: notificationId,
        question: question.trim(),
        options: filledOptions,
        allowMultipleAnswers,
        expirationDate: expiration,
      };

      if (result) {
        swal.fire({
          title: "Completato",
          text: "Sondaggio creato con successo",
          icon: "success",
        });
        if (onSuccess) onSuccess(result);
      }

      // Feedback di successo
      swal.fire({
        title: "Completato",
        text: "Sondaggio creato con successo",
        icon: "success",
      });
    } catch (error) {
      console.error("Error creating poll:", error);
      swal.fire({
        title: "Errore",
        text: "Si è verificato un errore durante la creazione del sondaggio",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative"
      style={{ zIndex: 9999 }}
    >
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-center">
        <BarChart className="h-5 w-5 text-blue-500 mr-2" />
        <h3 className="font-medium text-blue-800">Crea nuovo sondaggio</h3>
      </div>

      <form onSubmit={handleSubmit} className="p-4">
        <div className="space-y-4">
          {/* Domanda */}
          <div>
            <label
              htmlFor="question"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Domanda
            </label>
            <input
              type="text"
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Es. Quale data preferisci per la riunione?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
              maxLength={500}
            />
          </div>

          {/* Opzioni */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opzioni
            </label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Opzione ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                    maxLength={200}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="ml-2 text-gray-400 hover:text-red-500"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              ))}

              {options.length < 10 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Aggiungi opzione
                </button>
              )}
            </div>
          </div>

          {/* Impostazioni aggiuntive */}
          <div className="space-y-3 pt-2 border-t border-gray-200">
            {/* Opzione per consentire risposte multiple */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="multiple-answers"
                checked={allowMultipleAnswers}
                onChange={(e) => setAllowMultipleAnswers(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="multiple-answers"
                className="ml-2 block text-sm text-gray-700"
              >
                Consenti risposte multiple
              </label>
            </div>

            {/* Data di scadenza (opzionale) */}
            <div>
              <label
                htmlFor="expiration-date"
                className="flex items-center text-sm text-gray-700 mb-1"
              >
                <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                Data di scadenza (opzionale)
              </label>
              <input
                type="datetime-local"
                id="expiration-date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Note informative */}
          <div className="px-4 py-3 bg-gray-50 rounded-lg flex items-start">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-600">
              <p>
                Una volta creato, il sondaggio sarà visibile a tutti i
                partecipanti della chat.
              </p>
              <p className="mt-1">
                Solo tu potrai chiudere il sondaggio in qualsiasi momento.
              </p>
            </div>
          </div>

          {/* Pulsanti azione */}
          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={loading}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2 align-middle"></span>
                  Creazione...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1 inline-block" />
                  Crea sondaggio
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePollForm;
