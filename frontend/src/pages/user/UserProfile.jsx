import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { config } from "../../config";
import { swal } from "../../lib/common";

const UserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    userId: user.userId,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    address: user.address,
    role: user.role,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${config.API_BASE_URL}/user/${user.UserId}`,
        profile,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.status !== 200) {
        swal.fire({
          icon: "error",
          title: "Errore Aggiornamento Profilo",
          showConfirmButton: false,
          timer: 1500,
        });
      } else {
        swal.fire({
          icon: "success",
          title: "Profilo Aggiornato",
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } catch (error) {
      setError("Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-2xl mb-3">Modifica Profilo</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="block mb-2">Username</label>
          <input
            type="text"
            name="username"
            value={profile.username}
            disabled
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div className="mb-3">
          <label className="block mb-2">Nome</label>
          <input
            type="text"
            name="firstName"
            value={profile.firstName}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div className="mb-3">
          <label className="block mb-2">Cognome</label>
          <input
            type="text"
            name="lastName"
            value={profile.lastName}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div className="mb-3">
          <label className="block mb-2">Email</label>
          <input
            type="email"
            name="email"
            value={profile.email}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div className="mb-3">
          <label className="block mb-2">Numero di Telefono</label>
          <input
            type="text"
            name="phoneNumber"
            value={profile.phoneNumber}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div className="mb-3">
          <label className="block mb-2">Ruolo</label>
          <input
            type="text"
            name="role"
            value={profile.role}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            disabled
          />
        </div>
        <button type="submit" className="w-full primaryButton  p-2 rounded">
          Aggiorna Profilo
        </button>
      </form>
    </div>
  );
};

export default UserProfile;
