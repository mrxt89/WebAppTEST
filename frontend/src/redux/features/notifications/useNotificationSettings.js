// Patch per il file useNotificationSettings.js

// src/redux/features/notifications/useNotificationSettings.js
import { useSelector, useDispatch } from "react-redux";
import {
  setNotificationsEnabled,
  setSoundEnabled,
  setWebNotificationsEnabled,
  setWebNotificationsPermission,
} from "./notificationSettingsSlice";
import notificationService from "../../../services/notifications/NotificationService";

/**
 * Hook per accedere e manipolare le impostazioni delle notifiche nello store Redux
 */
export const useNotificationSettings = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.notificationSettings);

  // Metodo per attivare/disattivare le notifiche in-app
  const toggleNotificationsEnabled = (value) => {
    const enabled =
      value !== undefined ? value : !settings.notificationsEnabled;
    dispatch(setNotificationsEnabled(enabled));
    notificationService.setNotificationSetting(enabled);
    return enabled;
  };

  // Metodo per attivare/disattivare i suoni
  const toggleSoundEnabled = (value) => {
    const enabled = value !== undefined ? value : !settings.soundEnabled;
    dispatch(setSoundEnabled(enabled));
    notificationService.setSoundSetting(enabled);

    // Se stiamo attivando il suono, assicuriamoci che l'audio sia inizializzato
    if (enabled) {
      notificationService.initAudio().then((success) => {
        if (success && enabled) {
          // Riproduci un suono di test se l'inizializzazione ha successo
          setTimeout(() => {
            notificationService.playNotificationSound();
          }, 500);
        }
      });
    }

    return enabled;
  };

  // Metodo per attivare/disattivare le notifiche web/desktop
  const toggleWebNotificationsEnabled = async (value) => {
    const newValue =
      value !== undefined ? value : !settings.webNotificationsEnabled;

    // Se stiamo attivando le notifiche e non abbiamo ancora il permesso, richiediamolo
    if (newValue && settings.webNotificationsPermission !== "granted") {
      try {
        const result =
          await notificationService.requestNotificationPermission();
        if (result) {
          dispatch(setWebNotificationsPermission("granted"));
          dispatch(setWebNotificationsEnabled(true));
          notificationService.setWebNotificationSetting(true);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Errore nella richiesta dei permessi:", error);
        return false;
      }
    } else {
      dispatch(setWebNotificationsEnabled(newValue));
      notificationService.setWebNotificationSetting(newValue);
      return newValue;
    }
  };

  // Metodo per riprodurre un suono di test
  const playTestSound = () => {
    if (settings.soundEnabled) {
      notificationService.playNotificationSound();
    }
  };

  // Metodo per mostrare una notifica di test
  const showTestNotification = () => {
    if (
      !settings.webNotificationsEnabled &&
      settings.webNotificationsPermission !== "granted"
    ) {
      // Se le notifiche non sono abilitate, richiedi prima il permesso
      requestNotificationPermission().then((granted) => {
        if (granted) {
          // Solo se il permesso è stato dato, mostra la notifica di test
          notificationService.notifySystem(
            "Notifica di prova",
            "Questo è un esempio di come appariranno le notifiche",
          );
        }
      });
    } else {
      // Se le notifiche sono già abilitate, mostra direttamente la notifica
      notificationService.notifySystem(
        "Notifica di prova",
        "Questo è un esempio di come appariranno le notifiche",
      );
    }
  };

  // Metodo per richiedere i permessi per le notifiche web
  const requestNotificationPermission = async () => {
    try {
      const result = await notificationService.requestNotificationPermission();
      if (result) {
        dispatch(setWebNotificationsPermission("granted"));
        dispatch(setWebNotificationsEnabled(true));
        notificationService.setWebNotificationSetting(true);
      } else {
        dispatch(
          setWebNotificationsPermission(Notification.permission || "denied"),
        );
      }
      return result;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  };

  return {
    // Stati
    notificationsEnabled: settings.notificationsEnabled,
    soundEnabled: settings.soundEnabled,
    webNotificationsEnabled: settings.webNotificationsEnabled,
    webNotificationsPermission: settings.webNotificationsPermission,
    webNotificationsAvailable: "Notification" in window,

    // Azioni
    toggleNotificationsEnabled,
    toggleSoundEnabled,
    toggleWebNotificationsEnabled,
    playTestSound,
    showTestNotification,
    requestNotificationPermission,
  };
};

export default useNotificationSettings;
