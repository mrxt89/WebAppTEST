// src/components/settings/NotificationSettings.jsx
import React from "react";
import { Bell, Volume2, VolumeX, Monitor } from "lucide-react";
import useNotificationSettings from "../../redux/features/notifications/useNotificationSettings";

function NotificationSettings() {
  // Utilizziamo il nostro hook personalizzato per gestire le impostazioni
  const {
    notificationsEnabled,
    soundEnabled,
    webNotificationsEnabled,
    webNotificationsPermission,
    webNotificationsAvailable,
    toggleNotificationsEnabled,
    toggleSoundEnabled,
    toggleWebNotificationsEnabled,
    playTestSound,
    showTestNotification,
    requestNotificationPermission,
  } = useNotificationSettings();

  // Mostra lo stato del permesso per le notifiche web
  const renderWebNotificationStatus = () => {
    if (!webNotificationsAvailable) {
      return (
        <span className="text-gray-500 text-xs">
          Non supportate dal browser
        </span>
      );
    }

    switch (webNotificationsPermission) {
      case "granted":
        return (
          <span className="text-green-600 text-xs">Permesso concesso</span>
        );
      case "denied":
        return (
          <span className="text-red-600 text-xs">
            Permesso negato nel browser
          </span>
        );
      default:
        return (
          <span className="text-yellow-600 text-xs">In attesa di permesso</span>
        );
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Impostazioni Notifiche
      </h3>

      <div className="space-y-4">
        {/* Toggle per le notifiche in-app */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Bell className="h-5 w-5 text-gray-500 mr-2" />
            <span className="text-sm text-gray-700">Notifiche in-app</span>
          </div>
          <button
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              notificationsEnabled ? "bg-blue-600" : "bg-gray-200"
            }`}
            onClick={() => toggleNotificationsEnabled()}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                notificationsEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Toggle per i suoni */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {soundEnabled ? (
              <Volume2 className="h-5 w-5 text-gray-500 mr-2" />
            ) : (
              <VolumeX className="h-5 w-5 text-gray-500 mr-2" />
            )}
            <span className="text-sm text-gray-700">Suoni di notifica</span>
          </div>
          <button
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              soundEnabled ? "bg-blue-600" : "bg-gray-200"
            }`}
            onClick={() => toggleSoundEnabled()}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                soundEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Toggle per le notifiche web (desktop) */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center">
              <Monitor className="h-5 w-5 text-gray-500 mr-2" />
              <span className="text-sm text-gray-700">Notifiche desktop</span>
            </div>
            {renderWebNotificationStatus()}
          </div>
          <button
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              webNotificationsEnabled &&
              webNotificationsPermission === "granted"
                ? "bg-blue-600"
                : "bg-gray-200"
            }`}
            onClick={() => toggleWebNotificationsEnabled()}
            disabled={webNotificationsPermission === "denied"}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                webNotificationsEnabled &&
                webNotificationsPermission === "granted"
                  ? "translate-x-6"
                  : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Pulsanti di test */}
        <div className="flex space-x-4 mt-4 pt-4 border-t border-gray-200">
          <button
            className="px-3 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={showTestNotification}
          >
            Testa notifica
          </button>

          <button
            className="px-3 py-2 text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={playTestSound}
            disabled={!soundEnabled}
          >
            Testa suono
          </button>

          {webNotificationsAvailable &&
            webNotificationsPermission === "default" && (
              <button
                className="px-3 py-2 text-sm font-medium rounded-md text-green-600 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                onClick={requestNotificationPermission}
              >
                Consenti notifiche
              </button>
            )}
        </div>
      </div>
    </div>
  );
}

// Esportiamo il componente come default export
export default NotificationSettings;
