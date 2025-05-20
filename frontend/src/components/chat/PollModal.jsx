// PollModal.jsx - File COMPLETO

import React from "react";
import Modal from "react-modal";

// Componente wrapper per i modali dei sondaggi con z-index più alto
const PollModal = ({ isOpen, onRequestClose, children }) => {
  // Stili con z-index elevato
  const pollModalStyles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      zIndex: 3000, // Valore più alto dello z-index della chat
    },
    content: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      maxWidth: "600px",
      width: "90%",
      maxHeight: "90vh",
      padding: 0,
      border: "none",
      background: "transparent",
      overflow: "visible",
      borderRadius: "10px",
      outline: "none",
    },
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={pollModalStyles}
      contentLabel="Poll Modal"
      ariaHideApp={false} // Per evitare warning in ambiente di sviluppo
    >
      <div className="poll-modal-content">{children}</div>
    </Modal>
  );
};

export default PollModal;
