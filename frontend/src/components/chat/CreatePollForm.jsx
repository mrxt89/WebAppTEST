// CreatePollForm.jsx - Versione completa con tutto lo stile originale

import React, { useState } from "react";
import { X, Plus, Trash2, Calendar, Users, BarChart, AlertCircle } from "lucide-react";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import { swal } from "@/lib/common";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { it } from "date-fns/locale";

const CreatePollForm = ({ notificationId, onSuccess, onCancel }) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const { sendNotification, createPoll } = useNotifications();

  // Aggiungi opzione
  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  // Rimuovi opzione
  const removeOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  // Aggiorna testo opzione
  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
    
    // Rimuovi errore se presente
    if (errors[`option_${index}`]) {
      const newErrors = { ...errors };
      delete newErrors[`option_${index}`];
      setErrors(newErrors);
    }
  };

  // Gestione tasti speciali (Tab, Enter)
  const handleKeyDown = (e, index) => {
    if (e.key === "Tab" && !e.shiftKey) {
      if (index === options.length - 1) {
        // Se siamo sull'ultima opzione e premiamo Tab, aggiungi una nuova opzione
        if (options.length < 10 && options[index].trim() !== "") {
          e.preventDefault();
          addOption();
          // Focus sulla nuova opzione dopo un breve delay
          setTimeout(() => {
            const inputs = document.querySelectorAll('input[name^="option_"]');
            if (inputs[index + 1]) {
              inputs[index + 1].focus();
            }
          }, 100);
        }
      } else if (index === options.length - 2) {
        // Se siamo sulla penultima opzione, passa al checkbox delle risposte multiple
        e.preventDefault();
        document.getElementById('multipleAnswers').focus();
      }
    }
  };

  // Gestione tabulazione per i checkbox
  const handleCheckboxKeyDown = (e, nextElementId) => {
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const nextElement = document.getElementById(nextElementId);
      if (nextElement) {
        nextElement.focus();
      }
    }
  };

  // Validazione form
  const validateForm = () => {
    const newErrors = {};
    
    if (!question.trim()) {
      newErrors.question = "La domanda è obbligatoria";
    }

    const validOptions = options.filter((opt) => opt.trim());
    if (validOptions.length < 2) {
      newErrors.options = "Inserisci almeno 2 opzioni";
    }

    // Controlla opzioni vuote
    options.forEach((opt, index) => {
      if (index < 2 && !opt.trim()) {
        newErrors[`option_${index}`] = "Questa opzione è obbligatoria";
      }
    });

    // Controlla duplicati
    const uniqueOptions = new Set(validOptions.map((opt) => opt.toLowerCase().trim()));
    if (uniqueOptions.size !== validOptions.length) {
      newErrors.duplicates = "Le opzioni devono essere uniche";
    }

    if (hasExpiration && (!expirationDate || expirationDate <= new Date())) {
      newErrors.expiration = "La data di scadenza deve essere nel futuro";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // FASE 1: Invia prima il messaggio nella chat
      const pollMessage = `📊 **Sondaggio**: "${question}"`;
      
      const messageResult = await sendNotification({
        notificationId: notificationId,
        message: pollMessage,
        messageType: "poll",
      });

      if (!messageResult || !messageResult.notificationId) {
        throw new Error("Errore durante l'invio del messaggio per il sondaggio");
      }

      // Estrai il messageId dal risultato
      let messageId = null;
      
      // Il backend dovrebbe restituire il realMessageId se disponibile
      if (messageResult.realMessageId) {
        messageId = messageResult.realMessageId;
      } else if (messageResult.messageId) {
        messageId = messageResult.messageId;
      } else if (messageResult.lastMessage && messageResult.lastMessage.messageId) {
        messageId = messageResult.lastMessage.messageId;
      }

      if (!messageId) {
        console.error("Impossibile trovare il messageId nel risultato:", messageResult);
        throw new Error("Impossibile trovare l'ID del messaggio per il sondaggio");
      }

      console.log("Messaggio creato con ID:", messageId);

      // FASE 2: Crea il sondaggio associato al messaggio
      const validOptions = options
        .filter((opt) => opt.trim())
        .map((opt, index) => ({
          text: opt.trim(),
          order: index + 1,
        }));

      // Debug: verifica il formato delle opzioni
      console.log("Opzioni da inviare:", JSON.stringify(validOptions));

      // IMPORTANTE: Passa i parametri direttamente, non come oggetto annidato
      const pollResult = await createPoll({
        notificationId: notificationId,
        messageId: messageId,
        question: question.trim(),
        options: validOptions,
        allowMultipleAnswers: allowMultipleAnswers,
        expirationDate: hasExpiration ? expirationDate : null,
      });

      if (pollResult && pollResult.success) {
        // Chiama onSuccess con i dati del sondaggio
        if (onSuccess) {
          // Mantieni pollData per riferimento
          const pollData = {
            notificationId: notificationId,
            messageId: messageId,
            question: question.trim(),
            options: validOptions,
            allowMultipleAnswers: allowMultipleAnswers,
            expirationDate: hasExpiration ? expirationDate : null,
          };
          
          onSuccess(pollData, {
            ...messageResult,
            pollId: pollResult.poll?.id,
            poll: pollResult.poll
          });
        }
      } else {
        throw new Error("Errore durante la creazione del sondaggio");
      }

    } catch (error) {
      console.error("Errore completo:", error);
      swal.fire(
        "Errore",
        error.message || "Si è verificato un errore durante la creazione del sondaggio",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BarChart className="h-6 w-6 text-white mr-3" />
            <h3 className="text-xl font-semibold text-white">
              Crea nuovo sondaggio
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-white hover:text-gray-200 transition-colors"
            disabled={isSubmitting}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {/* Domanda */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Domanda del sondaggio <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                if (errors.question) {
                  const newErrors = { ...errors };
                  delete newErrors.question;
                  setErrors(newErrors);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Tab" && !e.shiftKey) {
                  e.preventDefault();
                  const firstOption = document.querySelector('input[name="option_0"]');
                  if (firstOption) {
                    firstOption.focus();
                  }
                }
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.question 
                  ? "border-red-300 focus:ring-red-500" 
                  : "border-gray-300 focus:ring-blue-500"
              }`}
              placeholder="Es: Qual è il tuo colore preferito?"
              disabled={isSubmitting}
              maxLength={500}
            />
            {errors.question && (
              <div className="absolute right-3 top-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
            )}
          </div>
          <div className="flex justify-between items-center mt-1">
            {errors.question && (
              <p className="text-sm text-red-500">{errors.question}</p>
            )}
            <p className="text-xs text-gray-500 ml-auto">
              {question.length}/500 caratteri
            </p>
          </div>
        </div>

        {/* Opzioni */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Opzioni di risposta <span className="text-red-500">*</span>
          </label>
          {errors.options && (
            <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
              <p className="text-sm text-red-700">{errors.options}</p>
            </div>
          )}
          {errors.duplicates && (
            <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center">
              <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
              <p className="text-sm text-yellow-700">{errors.duplicates}</p>
            </div>
          )}
          
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-3 group">
                <span className="text-sm font-medium text-gray-500 w-6 text-center">
                  {index + 1}.
                </span>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    name={`option_${index}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      errors[`option_${index}`]
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500 hover:border-gray-400"
                    }`}
                    placeholder={`Opzione ${index + 1}`}
                    disabled={isSubmitting}
                    maxLength={200}
                  />
                  {errors[`option_${index}`] && (
                    <div className="absolute right-3 top-2.5">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                </div>
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {options.length < 10 && (
            <button
              type="button"
              onClick={addOption}
              className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
              disabled={isSubmitting}
            >
              <div className="p-1 bg-blue-100 rounded">
                <Plus className="h-4 w-4" />
              </div>
              <span>Aggiungi opzione</span>
            </button>
          )}
          
          <p className="text-xs text-gray-500 mt-2">
            Suggerimento: premi Tab sull'ultima opzione per aggiungerne una nuova
          </p>
        </div>

        {/* Impostazioni aggiuntive */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Impostazioni aggiuntive
          </h4>
          
          {/* Risposte multiple */}
          <label className="flex items-center cursor-pointer group">
            <input
              type="checkbox"
              id="multipleAnswers"
              checked={allowMultipleAnswers}
              onChange={(e) => setAllowMultipleAnswers(e.target.checked)}
              onKeyDown={(e) => handleCheckboxKeyDown(e, 'hasExpiration')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
              disabled={isSubmitting}
            />
            <div className="ml-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                Consenti risposte multiple
              </span>
            </div>
          </label>

          {/* Scadenza */}
          <div>
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                id="hasExpiration"
                checked={hasExpiration}
                onChange={(e) => {
                  setHasExpiration(e.target.checked);
                  if (!e.target.checked) {
                    setExpirationDate(null);
                    if (errors.expiration) {
                      const newErrors = { ...errors };
                      delete newErrors.expiration;
                      setErrors(newErrors);
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Tab" && !e.shiftKey) {
                    e.preventDefault();
                    document.querySelector('button[type="submit"]').focus();
                  }
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                disabled={isSubmitting}
              />
              <div className="ml-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  Imposta data di scadenza
                </span>
              </div>
            </label>

            {hasExpiration && (
              <div className="ml-7 mt-3">
                <DatePicker
                  selected={expirationDate}
                  onChange={(date) => {
                    setExpirationDate(date);
                    if (errors.expiration) {
                      const newErrors = { ...errors };
                      delete newErrors.expiration;
                      setErrors(newErrors);
                    }
                  }}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="dd/MM/yyyy HH:mm"
                  minDate={new Date()}
                  locale={it}
                  className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    errors.expiration
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  placeholderText="Seleziona data e ora"
                  disabled={isSubmitting}
                />
                {errors.expiration && (
                  <p className="text-sm text-red-500 mt-1">{errors.expiration}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pulsanti azione */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all font-medium"
            disabled={isSubmitting}
          >
            Annulla
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Creazione in corso...</span>
              </>
            ) : (
              <>
                <BarChart className="h-4 w-4" />
                <span>Crea sondaggio</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePollForm;