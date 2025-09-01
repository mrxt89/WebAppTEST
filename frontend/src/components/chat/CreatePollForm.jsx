// CreatePollForm.jsx - Versione completa con tutto lo stile originale

import React, { useState } from "react";
import { X, Plus, Trash2, Calendar, Users, BarChart, AlertCircle, Sparkles } from "lucide-react";
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
    <div className="poll-modal-overlay">
      <div className="poll-modal-container">
        {/* Header con gradiente moderno */}
        <div className="poll-modal-header">
          <div className="poll-header-content">
            <div className="poll-header-icon">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="poll-header-text">
              <h3 className="poll-title">Crea nuovo sondaggio</h3>
              <p className="poll-subtitle">Raccogli feedback dalla tua squadra</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="poll-close-button"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="poll-form">
          {/* Sezione Domanda */}
          <div className="poll-section">
            <div className="poll-section-header">
              <BarChart className="h-5 w-5 text-blue-600" />
              <h4 className="poll-section-title">Domanda del sondaggio</h4>
            </div>
            
            <div className="poll-input-group">
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
                className={`poll-input ${errors.question ? 'poll-input-error' : ''}`}
                placeholder="Es: Qual è il tuo colore preferito?"
                disabled={isSubmitting}
                maxLength={500}
              />
              {errors.question && (
                <div className="poll-error-icon">
                  <AlertCircle className="h-5 w-5" />
                </div>
              )}
            </div>
            
            <div className="poll-input-footer">
              {errors.question && (
                <p className="poll-error-text">{errors.question}</p>
              )}
              <p className="poll-char-count">
                {question.length}/500 caratteri
              </p>
            </div>
          </div>

          {/* Sezione Opzioni */}
          <div className="poll-section">
            <div className="poll-section-header">
              <div className="">
                <span className="poll-option-number">1</span>
              </div>
              <div className="poll-section-title">Opzioni di risposta </div>
            </div>
            
            {errors.options && (
              <div className="poll-alert poll-alert-error">
                <AlertCircle className="h-4 w-4" />
                <p>{errors.options}</p>
              </div>
            )}
            
            {errors.duplicates && (
              <div className="poll-alert poll-alert-warning">
                <AlertCircle className="h-4 w-4" />
                <p>{errors.duplicates}</p>
              </div>
            )}
            
            <div className="poll-options-container">
              {options.map((option, index) => (
                <div key={index} className="poll-option-item">
                  <div className="poll-option-number-badge">
                    {index + 1}
                  </div>
                  <div className="poll-option-input-wrapper">
                    <input
                      type="text"
                      name={`option_${index}`}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className={`poll-option-input ${errors[`option_${index}`] ? 'poll-input-error' : ''}`}
                      placeholder={`Opzione ${index + 1}`}
                      disabled={isSubmitting}
                      maxLength={200}
                    />
                    {errors[`option_${index}`] && (
                      <div className="poll-error-icon">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="poll-remove-button"
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
                className="poll-add-button"
                disabled={isSubmitting}
              >
                <Plus className="h-4 w-4" />
                <span>Aggiungi opzione</span>
              </button>
            )}
          
          </div>

          {/* Sezione Impostazioni */}
          <div className="poll-settings-section">
            <div className="poll-section-header">
              <div className="poll-settings-icon">
                <span className="poll-settings-dot"></span>
              </div>
              <h4 className="poll-section-title">Impostazioni aggiuntive</h4>
            </div>
            
            <div className="poll-settings-grid">
              {/* Risposte multiple */}
              <label className="poll-checkbox-item">
                <input
                  type="checkbox"
                  id="multipleAnswers"
                  checked={allowMultipleAnswers}
                  onChange={(e) => setAllowMultipleAnswers(e.target.checked)}
                  onKeyDown={(e) => handleCheckboxKeyDown(e, 'hasExpiration')}
                  className="poll-checkbox"
                  disabled={isSubmitting}
                />
                <div className="poll-checkbox-content">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span>Consenti risposte multiple</span>
                </div>
              </label>

              {/* Scadenza */}
              <div className="poll-expiration-group">
                <label className="poll-checkbox-item">
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
                    className="poll-checkbox"
                    disabled={isSubmitting}
                  />
                  <div className="poll-checkbox-content">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>Imposta data di scadenza</span>
                  </div>
                </label>

                {hasExpiration && (
                  <div className="poll-date-picker-wrapper">
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
                      className={`poll-date-picker ${errors.expiration ? 'poll-input-error' : ''}`}
                      placeholderText="Seleziona data e ora"
                      disabled={isSubmitting}
                    />
                    {errors.expiration && (
                      <p className="poll-error-text">{errors.expiration}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pulsanti azione */}
          <div className="poll-actions">
            <button
              type="button"
              onClick={onCancel}
              className="poll-button poll-button-secondary"
              disabled={isSubmitting}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="poll-button poll-button-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="poll-spinner"></div>
                  <span>Creazione in corso...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Crea sondaggio</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePollForm;