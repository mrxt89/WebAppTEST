import { config } from "../config.js";

let token = null;

self.onmessage = (event) => {
  if (event.data && event.data.token) {
    token = event.data.token;
  }
};

const updateLastOnline = async () => {
  if (!token) {
    console.error("Token not available");
    return;
  }

  try {
    await fetch(`${config.API_BASE_URL}/update-last-online`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    postMessage({ success: true });
  } catch (error) {
    console.error("Error updating last online:", error);
    postMessage({ success: false });
  }
};

// Esegui updateLastOnline ogni 10 secondi
setInterval(updateLastOnline, 10000);
