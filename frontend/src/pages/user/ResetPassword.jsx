import React, { useState } from "react";
import axios from "axios";
import { Input, Button, Card, Alert } from "@/components/ui";
import { useParams } from "react-router-dom";
import { config } from "../../config";
import { swal } from "../../lib/common";

const ResetPassword = () => {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    try {
      const response = await axios.post(
        `${config.API_BASE_URL}/reset-password`,
        {
          token,
          newPassword,
        },
      );
      console.log("Password reset successful:", response.data);
      setMessage("Password reset successful.");
    } catch (error) {
      console.error("Error resetting password:", error);
      setMessage("Error resetting password.");
    }
  };

  return (
    <Card className="p-6 max-w-md mx-auto my-10">
      <h2 className="text-2xl font-semibold text-center">Reset Password</h2>
      <p className="text-center mb-6">Please enter your new password.</p>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block mb-1">New Password</label>
          <Input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Confirm Password</label>
          <Input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full">
          Reset Password
        </Button>
        {message && <Alert variant="destructive">{message}</Alert>}
      </form>
    </Card>
  );
};

export default ResetPassword;
