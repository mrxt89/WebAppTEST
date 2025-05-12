// spinner.jsx
import React from 'react';
import './ui.css'; // Assicurati che il file CSS sia importato

const Spinner = () => {
  return (
    <div className="spinner-overlay">
      <div className="spinner-container"></div>
    </div>
  );
};

export default Spinner;
