import React, { useState } from "react";
import axios from "axios";
import Modal from "react-modal";
import { swal } from "../../lib/common";
import "react-toastify/dist/ReactToastify.css";
import { config } from "../../config"; // Corretto il percorso

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordCheck, setNewPasswordCheck] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== newPasswordCheck) {
      swal.fire({
        title: "Errore",
        text: "Le password non corrispondono",
        icon: "error",
      });
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${config.API_BASE_URL}/change-password`,
        {
          currentPassword,
          newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      swal.fire({
        title: response.data ? "Password cambiata con successo" : "Errore",
        icon: response.data ? "success" : "error",
        ...config.SWEET_ALERT_COLORS,
      });
      // Se la password è stata cambiata con successo, resetta i campi del form
      if (response.data) {
        setCurrentPassword("");
        setNewPassword("");
        setNewPasswordCheck("");
      }
    } catch (error) {
      swal.fire({
        title: "Errore",
        text: "Errore durante il cambio della password",
        icon: "error",
      });
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4">
        <h2 className="text-2xl mb-4">Modifica Password</h2>
        {message && <p>{message}</p>}
        <div className="mb-4">
          <label className="block mb-2">Password Corrente</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2">Nuova Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
              if (!passwordRegex.test(e.target.value)) {
                e.target.setCustomValidity(
                  "La password deve contenere almeno 8 caratteri, un numero, una lettera maiuscola e una minuscola",
                );
              } else {
                e.target.setCustomValidity("");
              }
            }}
            required
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2">Conferma Nuova Password</label>
          <input
            type="password"
            value={newPasswordCheck}
            onChange={(e) => setNewPasswordCheck(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded"
          />
          {newPasswordCheck !== newPassword && (
            <p className="text-red-500">Le password non corrispondono</p>
          )}
        </div>
        <button type="submit" className="w-full primaryButton p-2 rounded">
          Cambia Password
        </button>
      </form>
    </div>
  );
};

export default ChangePassword;
