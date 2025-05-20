// Frontend/src/hooks/useAttachmentsActions.js
import { useState } from "react";
import axios from "axios";
import { config } from "../config";

const useAttachmentsActions = () => {
  const [loading, setLoading] = useState(false);

  const getAttachments = async (projectId, taskId = 0) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${config.API_BASE_URL}/attachments/${projectId}${taskId ? `/${taskId}` : ""}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching attachments:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Allegati codici temporanei
  const getItemCodeAttachments = async (itemCode) => {
    if (!itemCode) {
      console.error("itemCode is required for getItemCodeAttachments");
      throw new Error("itemCode is required");
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${config.API_BASE_URL}/attachments/itemCode`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ itemCode }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching attachments:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Upload per progetto/task o per itemCode, con l'utente che passa un parametro che indica il tipo
  const uploadAttachment = async (file, options = {}) => {
    const { projectId, taskId, itemCode } = options;
    if (!file) {
      throw new Error("No file provided");
    }

    if (!projectId && !itemCode) {
      throw new Error("Either projectId or itemCode must be provided");
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      // Costruisci l'URL in base al tipo di allegato
      let url;
      if (itemCode) {
        url = `${config.API_BASE_URL}/attachments/itemCode/upload/${itemCode}`;
      } else {
        url = `${config.API_BASE_URL}/attachments/${projectId}${taskId ? `/${taskId}` : ""}`;
      }

      const response = await axios.post(url, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });
      // Dispatch a custom event for attachment updates
      if (response.data && response.data.success) {
        // Create and dispatch a custom event to notify other components
        const attachmentEvent = new CustomEvent("attachment-updated", {
          detail: {
            notificationId: projectId || itemCode,
            attachmentId: response.data.attachmentId,
          },
        });
        document.dispatchEvent(attachmentEvent);
      }

      return response.data;
    } catch (error) {
      console.error("Error uploading attachment:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Mantiene la retrocompatibilità
  const uploadAttachmentLegacy = async (
    projectId,
    taskId = 0,
    file,
    articleCode = null,
  ) => {
    if (articleCode) {
      return uploadAttachment(file, { itemCode: articleCode });
    } else {
      return uploadAttachment(file, { projectId, taskId });
    }
  };

  const deleteAttachment = async (attachmentId) => {
    try {
      setLoading(true);
      const response = await axios.delete(
        `${config.API_BASE_URL}/attachments/${attachmentId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error deleting attachment:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const downloadAttachment = async (attachmentId, fileName) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${config.API_BASE_URL}/attachments/${attachmentId}/download`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          responseType: "blob",
        },
      );

      // Crea un URL per il blob e avvia il download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const downloadAllAttachments = async (options = {}) => {
    const { projectId, taskId, itemCode } = options;

    if (!projectId && !itemCode) {
      throw new Error("Either projectId or itemCode must be provided");
    }

    try {
      setLoading(true);

      let url;
      let fileName;

      if (itemCode) {
        url = `${config.API_BASE_URL}/attachments/itemCode/${itemCode}/download-all`;
        fileName = `ItemCode_${itemCode}_Attachments.zip`;
      } else {
        url = `${config.API_BASE_URL}/attachments/${projectId}${taskId ? `/${taskId}` : ""}/download-all`;
        fileName = taskId
          ? `Task_${taskId}_Attachments.zip`
          : `Project_${projectId}_Attachments.zip`;
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading attachments:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Mantiene la retrocompatibilità
  const downloadAllAttachmentsLegacy = async (projectId, taskId = 0) => {
    return downloadAllAttachments({ projectId, taskId });
  };

  return {
    loading,
    getAttachments,
    getItemCodeAttachments,
    uploadAttachment,
    uploadAttachmentLegacy, // Retrocompatibilità
    deleteAttachment,
    downloadAttachment,
    downloadAllAttachments,
    downloadAllAttachmentsLegacy, // Retrocompatibilità
  };
};

export default useAttachmentsActions;
