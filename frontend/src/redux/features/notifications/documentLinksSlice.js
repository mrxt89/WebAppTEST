// src/redux/features/notifications/documentLinksSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { config } from "../../../config";

// Async thunk for getting linked documents for a notification
export const getLinkedDocuments = createAsyncThunk(
  "documentLinks/getLinkedDocuments",
  async (notificationId, { rejectWithValue }) => {
    try {
      if (!notificationId) {
        return rejectWithValue("Invalid notification ID");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        return rejectWithValue("No authentication token available");
      }

      const response = await axios.get(
        `${config.API_BASE_URL}/notifications/${notificationId}/documents`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data && response.data.success) {
        return {
          notificationId,
          documents: response.data.data || [],
        };
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to get linked documents",
        );
      }
    } catch (error) {
      console.error("Error getting linked documents:", error);
      return rejectWithValue(error.message || "Failed to get linked documents");
    }
  },
);

// Async thunk for searching documents
export const searchDocuments = createAsyncThunk(
  "documentLinks/searchDocuments",
  async ({ documentType, searchTerm }, { rejectWithValue }) => {
    try {
      if (!documentType || !searchTerm) {
        return rejectWithValue(
          "Tipo documento e termine di ricerca sono campi obbligatori",
        );
      }

      const token = localStorage.getItem("token");
      if (!token) {
        return rejectWithValue("No authentication token available");
      }

      const response = await axios.get(
        `${config.API_BASE_URL}/documents/search?documentType=${encodeURIComponent(documentType)}&searchTerm=${encodeURIComponent(searchTerm)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data && response.data.success) {
        return {
          documentType,
          searchTerm,
          results: response.data.data || [],
        };
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to search documents",
        );
      }
    } catch (error) {
      console.error("Error searching documents:", error);
      return rejectWithValue(error.message || "Failed to search documents");
    }
  },
);

// Async thunk for linking a document to a notification
export const linkDocument = createAsyncThunk(
  "documentLinks/linkDocument",
  async (
    { notificationId, documentId, documentType },
    { rejectWithValue, dispatch },
  ) => {
    try {
      if (!notificationId || !documentId || !documentType) {
        return rejectWithValue("Missing required parameters");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        return rejectWithValue("No authentication token available");
      }

      const response = await axios.post(
        `${config.API_BASE_URL}/notifications/${notificationId}/documents`,
        {
          documentType,
          moId: documentType === "MO" ? documentId : undefined,
          saleOrdId: documentType === "SaleOrd" ? documentId : undefined,
          purchaseOrdId:
            documentType === "PurchaseOrd" ? documentId : undefined,
          saleDocId: documentType === "SaleDoc" ? documentId : undefined,
          purchaseDocId:
            documentType === "PurchaseDoc" ? documentId : undefined,
          itemCode: documentType === "Item" ? documentId : undefined,
          custSuppCode: documentType === "CustSupp" ? documentId : undefined,
          custSuppType: documentType === "CustSupp" ? 3211264 : undefined,
          bom: documentType === "BillOfMaterials" ? documentId : undefined,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data && response.data.success) {
        // Update linked documents list
        dispatch(getLinkedDocuments(notificationId));

        // Emit an event for other components
        const event = new CustomEvent("document-linked", {
          detail: {
            notificationId,
            documentId,
            document: response.data.document,
          },
        });
        document.dispatchEvent(event);

        return {
          success: true,
          notificationId,
          documentId,
          document: response.data.document,
        };
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to link document",
        );
      }
    } catch (error) {
      console.error("Error linking document:", error);
      return rejectWithValue(error.message || "Failed to link document");
    }
  },
);

// Async thunk for unlinking a document from a notification
export const unlinkDocument = createAsyncThunk(
  "documentLinks/unlinkDocument",
  async ({ notificationId, linkId }, { rejectWithValue, dispatch }) => {
    try {
      if (!notificationId || !linkId) {
        return rejectWithValue("Missing required parameters");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        return rejectWithValue("No authentication token available");
      }

      const response = await axios.delete(
        `${config.API_BASE_URL}/notifications/${notificationId}/documents/${linkId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data && response.data.success) {
        // Update linked documents list
        dispatch(getLinkedDocuments(notificationId));

        // Emit an event for other components
        const event = new CustomEvent("document-unlinked", {
          detail: {
            notificationId,
            linkId,
          },
        });
        document.dispatchEvent(event);

        return {
          success: true,
          notificationId,
          linkId,
        };
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to unlink document",
        );
      }
    } catch (error) {
      console.error("Error unlinking document:", error);
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to unlink document",
      );
    }
  },
);

// Async thunk for searching chats by document
export const searchChatsByDocument = createAsyncThunk(
  "documentLinks/searchChatsByDocument",
  async ({ searchType, searchValue }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return rejectWithValue("No authentication token available");
      }

      const url = `${config.API_BASE_URL}/chats/by-document?searchType=${encodeURIComponent(searchType)}${searchValue ? `&searchValue=${encodeURIComponent(searchValue)}` : ""}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data && response.data.success) {
        return {
          searchType,
          searchValue,
          results: response.data.data || [],
        };
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to search chats by document",
        );
      }
    } catch (error) {
      console.error("Error searching chats by document:", error);
      return rejectWithValue(
        error.message || "Failed to search chats by document",
      );
    }
  },
);

// Async thunk for accessing a chat in read-only mode
export const openChatInReadOnlyMode = createAsyncThunk(
  "documentLinks/openChatInReadOnlyMode",
  async (notificationId, { rejectWithValue, dispatch }) => {
    try {
      if (!notificationId) {
        return rejectWithValue("Invalid notification ID");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        return rejectWithValue("No authentication token available");
      }

      const response = await axios.post(
        `${config.API_BASE_URL}/chats/${notificationId}/read-only-access`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.data && response.data.success) {
        // Update notifications list to include this one
        dispatch({ type: "notifications/fetchNotifications" });

        return {
          success: true,
          notificationId,
        };
      } else {
        return rejectWithValue(
          response.data?.message || "Failed to access chat in read-only mode",
        );
      }
    } catch (error) {
      console.error("Error accessing chat in read-only mode:", error);
      return rejectWithValue(
        error.message || "Failed to access chat in read-only mode",
      );
    }
  },
);

// Document links slice
const documentLinksSlice = createSlice({
  name: "documentLinks",
  initialState: {
    linkedDocuments: {}, // Organized by notificationId
    searchResults: {}, // Organized by searchQuery
    chatsByDocument: {}, // Organized by searchType + searchValue
    loading: false,
    error: null,
  },
  reducers: {
    clearLinkedDocuments: (state, action) => {
      if (action.payload) {
        // Clear linked documents for a specific notification
        const notificationId = action.payload;
        delete state.linkedDocuments[notificationId];
      } else {
        // Clear all linked documents
        state.linkedDocuments = {};
      }
    },
    clearDocumentSearchResults: (state) => {
      state.searchResults = {};
    },
    clearChatsByDocument: (state) => {
      state.chatsByDocument = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Get linked documents
      .addCase(getLinkedDocuments.pending, (state) => {
        state.loading = true;
      })
      .addCase(getLinkedDocuments.fulfilled, (state, action) => {
        state.loading = false;
        const { notificationId, documents } = action.payload;
        state.linkedDocuments[notificationId] = documents;
      })
      .addCase(getLinkedDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Search documents
      .addCase(searchDocuments.pending, (state) => {
        state.loading = true;
      })
      .addCase(searchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        const { documentType, searchTerm, results } = action.payload;
        const key = `${documentType}_${searchTerm}`;
        state.searchResults[key] = results;
      })
      .addCase(searchDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Link document
      .addCase(linkDocument.pending, (state) => {
        state.loading = true;
      })
      .addCase(linkDocument.fulfilled, (state, action) => {
        state.loading = false;
        // No state update needed here, as we call getLinkedDocuments
      })
      .addCase(linkDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Unlink document
      .addCase(unlinkDocument.pending, (state) => {
        state.loading = true;
      })
      .addCase(unlinkDocument.fulfilled, (state, action) => {
        state.loading = false;
        // No state update needed here, as we call getLinkedDocuments
      })
      .addCase(unlinkDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Search chats by document
      .addCase(searchChatsByDocument.pending, (state) => {
        state.loading = true;
      })
      .addCase(searchChatsByDocument.fulfilled, (state, action) => {
        state.loading = false;
        const { searchType, searchValue, results } = action.payload;
        const key = `${searchType}_${searchValue || "all"}`;
        state.chatsByDocument[key] = results;
      })
      .addCase(searchChatsByDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Open chat in read-only mode
      .addCase(openChatInReadOnlyMode.pending, (state) => {
        state.loading = true;
      })
      .addCase(openChatInReadOnlyMode.fulfilled, (state, action) => {
        state.loading = false;
        // No state update needed here, as we call fetchNotifications
      })
      .addCase(openChatInReadOnlyMode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export actions
export const {
  clearLinkedDocuments,
  clearDocumentSearchResults,
  clearChatsByDocument,
} = documentLinksSlice.actions;

// Export selectors
export const selectLinkedDocuments = (state, notificationId) =>
  state.documentLinks.linkedDocuments[notificationId] || [];
export const selectDocumentSearchResults = (
  state,
  documentType,
  searchTerm,
) => {
  const key = `${documentType}_${searchTerm}`;
  return state.documentLinks.searchResults[key] || [];
};
export const selectChatsByDocument = (state, searchType, searchValue) => {
  const key = `${searchType}_${searchValue || "all"}`;
  return state.documentLinks.chatsByDocument[key] || [];
};
export const selectDocumentLinksLoading = (state) =>
  state.documentLinks.loading;
export const selectDocumentLinksError = (state) => state.documentLinks.error;

export default documentLinksSlice.reducer;
