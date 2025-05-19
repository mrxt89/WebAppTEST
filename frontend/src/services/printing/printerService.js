// printerService.js
export const printLabel = async (orderDetails) => {
  // Assumendo che l'URL base sia definito in una variabile d'ambiente
  const baseUrl = import.meta.env.VITE_API_URL || "http://10.0.0.129:3000"; // Usa la porta del tuo backend
  try {
    const response = await fetch(`${baseUrl}/api/printer/print`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include", // Se stai usando cookies per l'autenticazione
      body: JSON.stringify({ orderDetails }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Errore durante la stampa" }));
      throw new Error(errorData.message || "Errore durante la stampa");
    }

    return response.json();
  } catch (error) {
    console.error("Printer service error:", error);
    throw error;
  }
};
