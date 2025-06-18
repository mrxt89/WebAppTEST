// PollButton.jsx - Versione corretta senza doppia chiamata

import React, { useState, useEffect, useCallback } from "react";
import { BarChart } from "lucide-react";
import Modal from "react-modal";
import CreatePollForm from "./CreatePollForm";
import PollsList from "./PollsList";
import { useNotifications } from "@/redux/features/notifications/notificationsHooks";
import { swal } from "@/lib/common";

// Assicurati che Modal sia configurato correttamente
Modal.setAppElement("#root");

const PollButton = ({ notificationId, onPollCreated, currentUserId }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState(null);

  const { sendNotification } = useNotifications();

  // Usa useCallback per memorizzare le funzioni tra i render
  const handleShowPollModal = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleShowPollsList = useCallback(() => {
    setIsListModalOpen(true);
  }, []);

  // Aggiungi gli event listener con dipendenze appropriate
  useEffect(() => {
    // Aggiungi gli event listener
    document.addEventListener("show-poll-modal", handleShowPollModal);
    document.addEventListener("show-polls-list", handleShowPollsList);

    // Cleanup: rimuovi gli event listener quando il componente viene smontato
    return () => {
      document.removeEventListener("show-poll-modal", handleShowPollModal);
      document.removeEventListener("show-polls-list", handleShowPollsList);
    };
  }, [handleShowPollModal, handleShowPollsList]);

  // Aggiungi un handler diretto per il click sul pulsante
  const handlePollButtonClick = () => {
    setIsCreateModalOpen(true);
  };

  // Stile per il modale
  const modalStyle = {
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      zIndex: 10000,
    },
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
      padding: "0",
      border: "none",
      borderRadius: "8px",
      maxWidth: "90%",
      maxHeight: "90%",
      overflow: "hidden",
    },
  };

  // IMPORTANTE: Gestisci solo la creazione del sondaggio
  // Il componente CreatePollForm si occuperà di tutto il resto
  const handlePollCreated = async (pollData, result) => {
    setIsCreateModalOpen(false);
    
    // Se abbiamo una callback, chiamala con i dati del sondaggio
    if (typeof onPollCreated === "function") {
      onPollCreated(pollData, result);
    }
    
    // Mostra un messaggio di successo
    swal.fire({
      title: "Sondaggio creato",
      text: `Il sondaggio "${pollData.question}" è stato creato con successo`,
      icon: "success",
      timer: 2000,
      showConfirmButton: false
    });
    
    return true;
  };

  // Gestisci la selezione di un sondaggio dalla lista
  const handlePollSelected = (poll) => {
    setSelectedPoll(poll);
    setIsListModalOpen(false);

    // Scorri al messaggio contenente il sondaggio
    if (poll && poll.MessageID) {
      const messageElement = document.getElementById(
        `message-${poll.MessageID}`,
      );
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });

        // Evidenzia il messaggio
        messageElement.classList.add("highlight-message");
        setTimeout(() => {
          messageElement.classList.remove("highlight-message");
        }, 2000);
      }
    }
  };

  return (
    <>
      <div className="relative inline-block">
        <div className="flex">
          <button
            onClick={handlePollButtonClick}
            className="p-2 rounded-l-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
            title="Crea sondaggio"
            data-testid="create-poll-button"
          >
            <BarChart className="h-5 w-5" />
          </button>

          <button
            onClick={() => setIsListModalOpen(true)}
            className="p-2 rounded-r-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 border-l-0"
            title="Visualizza sondaggi"
            data-testid="view-polls-button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 6h13"></path>
              <path d="M8 12h13"></path>
              <path d="M8 18h13"></path>
              <path d="M3 6h.01"></path>
              <path d="M3 12h.01"></path>
              <path d="M3 18h.01"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Modale per la creazione di un sondaggio */}
      <Modal
        isOpen={isCreateModalOpen}
        onRequestClose={() => setIsCreateModalOpen(false)}
        style={modalStyle}
        contentLabel="Crea Sondaggio"
      >
        <CreatePollForm
          notificationId={notificationId}
          onSuccess={handlePollCreated}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Modale per la lista dei sondaggi */}
      <Modal
        isOpen={isListModalOpen}
        onRequestClose={() => setIsListModalOpen(false)}
        style={modalStyle}
        contentLabel="Lista Sondaggi"
      >
        <PollsList
          notificationId={notificationId}
          onClose={() => setIsListModalOpen(false)}
          onSelectPoll={handlePollSelected}
          currentUserId={currentUserId}
        />
      </Modal>
    </>
  );
};

export default PollButton;