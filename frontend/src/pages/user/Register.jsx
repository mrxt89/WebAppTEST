import React, { useState } from "react";
import axios from "axios";
import { Input, Button, Card, Alert } from "@/components/ui";
import { config } from "../../config";
import { swal } from "../../lib/common";

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post(`${config.API_BASE_URL}/register`, {
        username,
        password,
        email,
      });
      console.log("Registration successful:", response.data);
      setSuccess("Registrazione avvenuta con successo!");
      setError(null);
      // Pulisce i campi del form dopo la registrazione
      setUsername("");
      setPassword("");
      setEmail("");
    } catch (error) {
      console.error("Error registering:", error);
      setError("Registration failed. Please try again.");
      setSuccess(null);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <Card className="p-6 shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-4">Register</h2>
        <p className="text-center mb-6"></p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Username</label>
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Password</label>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                // Verifica se la password contiene almeno 8 caratteri, un numero, una lettera maiuscola e una minuscola. Se non soddisfa i requisiti, mostra un errore
                {
                  setPassword(e.target.value);
                  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
                  if (!passwordRegex.test(e.target.value)) {
                    setError(
                      "La password deve contenere almeno 8 caratteri, un numero, una lettera maiuscola e una minuscola.",
                    );
                  } else {
                    setError(null);
                  }
                }
              }
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full mt-4">
            Registra
          </Button>
          {error && (
            <Alert variant="destructive" className="mt-4">
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" className="mt-4">
              {success}
            </Alert>
          )}
        </form>
      </Card>
    </div>
  );
};

export default Register;
