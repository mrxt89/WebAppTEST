// src/components/DoNotDisturbIndicator.jsx
import React, { useState, useEffect } from "react";
import { BellOff } from "lucide-react";
import notificationService from "../../services/notifications/NotificationService";

const DoNotDisturbIndicator = () => {
  const [isActive, setIsActive] = useState(
    notificationService.isInDoNotDisturbMode(),
  );

  useEffect(() => {
    // Aggiorna lo stato quando cambia l'impostazione
    const handleStatusChange = (event) => {
      setIsActive(event.detail.enabled);
    };

    document.addEventListener("doNotDisturbChanged", handleStatusChange);

    // Controlla periodicamente lo stato
    const interval = setInterval(() => {
      setIsActive(notificationService.isInDoNotDisturbMode());
    }, 10000);

    // Controlla anche se lo stato cambia esternamente
    const checkNotificationService = () => {
      const currentState = notificationService.isInDoNotDisturbMode();
      if (currentState !== isActive) {
        setIsActive(currentState);
      }
    };

    // Controlla anche quando l'utente torna alla pagina
    window.addEventListener("focus", checkNotificationService);

    return () => {
      document.removeEventListener("doNotDisturbChanged", handleStatusChange);
      window.removeEventListener("focus", checkNotificationService);
      clearInterval(interval);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-red-100 text-red-800 px-3 py-2 rounded-full shadow-md flex items-center space-x-2 z-50 animate-pulse">
      <BellOff className="w-4 h-4" />
      <span className="text-xs font-medium">Non disturbare attivo</span>
    </div>
  );
};

export default DoNotDisturbIndicator;
