// Frontend/src/components/itemAttachments/ItemAttachmentVersions.js
import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Paper,
  CircularProgress,
  Tooltip,
  TextField,
  Grid,
  Tabs,
  Tab,
  Alert,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  History as HistoryIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Restore as RestoreIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import useItemAttachmentsActions from "../../hooks/useItemAttachmentsActions";
import { formatBytes } from "../../lib/common";
import localAgentService from "@/services/localAgentService";
import { config } from "@/config";

/**
 * ItemAttachmentVersions - Componente per la gestione delle versioni di un allegato
 *
 * @param {boolean} open - Flag per mostrare/nascondere il dialog (se non inline)
 * @param {object} attachment - L'allegato di cui gestire le versioni
 * @param {function} onClose - Callback per la chiusura del dialog (se non inline)
 * @param {boolean} readOnly - Flag per la modalità di sola lettura
 * @param {boolean} inline - Flag per visualizzazione inline (senza dialog)
 */
function ItemAttachmentVersions({
  open,
  attachment,
  onClose,
  readOnly = false,
  inline = false,
}) {
  // Stati
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [changeNotes, setChangeNotes] = useState("");
  const [creationMode, setCreationMode] = useState("upload"); // 'upload' | 'clone'
  const [cloneNotes, setCloneNotes] = useState("");
  const [cloneLoading, setCloneLoading] = useState(false);
  const [agentAvailable, setAgentAvailable] = useState(false);
  const hasVersions = versions.length > 0;

  // Ref per input file
  const fileInputRef = useRef(null);

  // Hook per le azioni sugli allegati
  const {
    getAttachmentVersions,
    addAttachmentVersion,
    downloadAttachmentVersion,
    restoreAttachmentVersion,
    getItemAttachmentById,
  } = useItemAttachmentsActions();

  // Carica le versioni dell'allegato
  useEffect(() => {
    const loadVersions = async () => {
      if (!attachment || !attachment.AttachmentID) return;

      try {
        setLoading(true);
        const result = await getAttachmentVersions(attachment.AttachmentID);
        setVersions(result || []);
      } catch (error) {
        console.error("Error loading attachment versions:", error);
      } finally {
        setLoading(false);
      }
    };

    if ((open || inline) && attachment) {
      loadVersions();
    }
  }, [attachment, open, inline, getAttachmentVersions]);

  useEffect(() => {
    const checkAgent = async () => {
      const available = await localAgentService.checkAvailability();
      setAgentAvailable(available);
    };
    checkAgent();
  }, []);

  // Gestione selezione file
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Gestione caricamento nuova versione
  const handleUploadVersion = async () => {
    if (!selectedFile || !attachment) {
      return;
    }

    try {
      setUploading(true);
      await addAttachmentVersion(
        attachment.AttachmentID,
        selectedFile,
        changeNotes,
      );

      // Aggiorna la lista delle versioni
      const result = await getAttachmentVersions(attachment.AttachmentID);
      setVersions(result || []);

      // Reset del form
      setSelectedFile(null);
      setChangeNotes("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading new version:", error);
    } finally {
      setUploading(false);
    }
  };

  // Gestione download versione
  const handleDownloadVersion = (version) => {
    // Usa la funzione specifica per download versioni che usa VersionID
    if (version.VersionID) {
      downloadAttachmentVersion(version.VersionID, version.FileName);
    } else {
      // Fallback per versione corrente (che non ha VersionID)
      // In questo caso scarichiamo l'allegato principale
      window.open(
        `${process.env.REACT_APP_API_BASE_URL || ""}/api/item-attachments/${version.AttachmentID}/download`,
        "_blank",
      );
    }
  };

  // Gestione ripristino versione
  const handleRestoreVersion = async (version) => {
    if (!version.VersionID || !attachment) return;

    // Conferma con l'utente
    const confirm = await window.confirm(
      `Sei sicuro di voler ripristinare la versione ${version.VersionNumber}? La versione corrente sarà salvata nello storico.`,
    );

    if (!confirm) return;

    try {
      await restoreAttachmentVersion(attachment.AttachmentID, version.VersionID);

      // Ricarica le versioni
      const result = await getAttachmentVersions(attachment.AttachmentID);
      setVersions(result || []);
    } catch (error) {
      console.error("Error restoring version:", error);
    }
  };

  const downloadVersionBlob = async (version) => {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Token di autenticazione mancante");
    }

    const url = version?.VersionID
      ? `${config.API_BASE_URL}/item-attachments/versions/${version.VersionID}/download`
      : `${config.API_BASE_URL}/item-attachments/${attachment.AttachmentID}/download`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Download versione fallito (${response.status} ${response.statusText}) ${text}`,
      );
    }

    return response.blob();
  };

  const openAttachmentWithAgent = async () => {
    if (!attachment?.AttachmentID) return;

    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const freshAttachment = await getItemAttachmentById(attachment.AttachmentID);
      const serverUrl = config.API_BASE_URL.startsWith("http")
        ? config.API_BASE_URL.replace("/api", "")
        : window.location.origin;

      const fileData = {
        attachmentId: freshAttachment?.AttachmentID || attachment.AttachmentID,
        fileName: freshAttachment?.FileName || attachment.FileName,
        filePath: freshAttachment?.FilePath || attachment.FilePath,
        serverUrl,
        token: `Bearer ${token}`,
        companyId: user.CompanyId,
        userId: user.userId,
        projectId: freshAttachment?.ProjectID,
        taskId: freshAttachment?.TaskID,
        notificationId: freshAttachment?.NotificationID,
        itemCode: freshAttachment?.ItemCode,
        projectItemId: freshAttachment?.ProjectItemId,
        lockFile: true,
      };

      await localAgentService.openFile(fileData);
    } catch (error) {
      console.error("Errore apertura con agent:", error);
      const info = localAgentService.handleError?.(error);
      alert(info?.message || error.message || "Impossibile aprire il file con Agent");
    }
  };

  const handleCloneAndAgent = async () => {
    if (!attachment || !versions.length) return;

    const latestVersion = versions[0];
    const notesText = cloneNotes.trim();
    if (!notesText) {
      alert("Inserisci una nota per tracciare la modifica.");
      return;
    }

    try {
      setCloneLoading(true);
      const blob = await downloadVersionBlob(latestVersion);
      const originalName = attachment.FileName || latestVersion.FileName || "allegato";
      const clonedName = originalName.replace(/(\.[^.]+)?$/, "-copia$1");
      const fileType = blob.type || "application/octet-stream";
      const clonedFile = new File([blob], clonedName, { type: fileType });

      await addAttachmentVersion(attachment.AttachmentID, clonedFile, notesText);
      const refreshed = await getAttachmentVersions(attachment.AttachmentID);
      setVersions(refreshed || []);
      setSelectedFile(null);
      setChangeNotes("");
      setCloneNotes("");

      if (agentAvailable) {
        await openAttachmentWithAgent();
      } else {
        alert("Versione duplicata. Avvia Local Agent per modificare il file.");
      }
    } catch (error) {
      console.error("Errore durante la duplicazione:", error);
      alert(error.message || "Errore nella duplicazione della versione");
    } finally {
      setCloneLoading(false);
    }
  };

  // Render del form per nuova versione
  const renderUploadForm = () => (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
      }}
    >
      <Typography variant="subtitle1" gutterBottom>
        Crea nuova versione
      </Typography>

      <Tabs
        value={creationMode}
        onChange={(_, val) => setCreationMode(val)}
        sx={{ mb: 2 }}
      >
        <Tab label="Carica nuovo file" value="upload" />
        <Tab
          label="Duplica versione attuale"
          value="clone"
        />
      </Tabs>

      {creationMode === "upload" ? (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                disabled={uploading}
              >
                Seleziona file
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  onChange={handleFileSelect}
                />
              </Button>

              {selectedFile && (
                <Typography variant="body2" sx={{ ml: 2 }}>
                  {selectedFile.name} ({formatBytes(selectedFile.size)})
                </Typography>
              )}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Note sulla modifica"
              fullWidth
              required
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              disabled={uploading || !selectedFile}
              placeholder="Descrivi le modifiche in questa versione (obbligatorio)"
              multiline
              rows={2}
              error={selectedFile && !changeNotes}
              helperText={
                selectedFile && !changeNotes
                  ? "Le note sono obbligatorie per nuove versioni"
                  : "Descrivi cosa è cambiato rispetto alla versione precedente"
              }
            />
          </Grid>

          <Grid item xs={12} sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<UploadIcon />}
              onClick={handleUploadVersion}
              disabled={uploading || !selectedFile || !changeNotes.trim()}
            >
              {uploading ? "Caricamento..." : "Carica versione"}
            </Button>
          </Grid>
        </Grid>
      ) : (
        <Box>
          <Alert severity={hasVersions ? "info" : "warning"} sx={{ mb: 2 }}>
            {hasVersions
              ? "Duplicherai la versione attuale e potrai modificarla subito con Local Agent."
              : "Non esistono ancora versioni storiche: verrà duplicato direttamente il file corrente (versione 0)."}
          </Alert>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Inserisci sempre una nota per tracciare la modifica.
          </Typography>

          <TextField
            label="Note sulla modifica"
            fullWidth
            required
            value={cloneNotes}
            onChange={(e) => setCloneNotes(e.target.value)}
            multiline
            rows={2}
            placeholder="Esempio: Copia per modifica CAD"
          />

          {!agentAvailable && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Local Agent non è attivo: la nuova versione verrà creata comunque e potrai aprirla manualmente più tardi.
            </Alert>
          )}

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2, gap: 1 }}>
            <Button
              variant="outlined"
              onClick={openAttachmentWithAgent}
              disabled={!agentAvailable || cloneLoading || uploading}
            >
              Apri versione corrente
            </Button>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={handleCloneAndAgent}
              disabled={cloneLoading || uploading || !cloneNotes.trim() || !attachment?.AttachmentID}
            >
              {cloneLoading ? "Preparazione..." : "Duplica e apri con Agent"}
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );

  // Render della lista versioni
  const renderVersionsList = () => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (versions.length === 0) {
      return (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <InfoIcon color="disabled" sx={{ fontSize: 40, mb: 2 }} />
          <Typography color="textSecondary">
            Nessuna versione precedente disponibile per questo allegato
          </Typography>
        </Paper>
      );
    }

    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <List disablePadding>
          {versions.map((version, index) => (
            <React.Fragment key={version.VersionID}>
              <ListItem
                sx={{
                  backgroundColor:
                    index === 0 ? "action.hover" : "background.paper",
                  "&:hover": { backgroundColor: "action.hover" },
                }}
              >
                <ListItemIcon>
                  <HistoryIcon color={index === 0 ? "primary" : "action"} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Typography variant="subtitle2">
                        {index === 0
                          ? "Versione corrente"
                          : `Versione ${versions.length - index}`}
                      </Typography>
                      {index === 0 && (
                        <Typography
                          variant="caption"
                          sx={{
                            ml: 1,
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                          }}
                        >
                          Attuale
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={
                    <React.Fragment>
                      <Typography variant="body2" component="span">
                        {format(
                          new Date(version.UploadedAt),
                          "dd/MM/yyyy HH:mm",
                          { locale: it },
                        )}{" "}
                        • {formatBytes(version.FileSizeKB * 1024)}
                      </Typography>
                      <Typography variant="body2" component="div">
                        Da:{" "}
                        {version.UploadedByFullName ||
                          version.UploadedByUsername}
                      </Typography>
                      {version.ChangeNotes && (
                        <Typography
                          variant="body2"
                          component="div"
                          sx={{
                            mt: 1,
                            p: 1,
                            bgcolor: "background.default",
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          {version.ChangeNotes}
                        </Typography>
                      )}
                    </React.Fragment>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Scarica questa versione">
                    <IconButton
                      edge="end"
                      onClick={() => handleDownloadVersion(version)}
                      size="small"
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {index !== 0 && !readOnly && (
                    <Tooltip title="Ripristina questa versione">
                      <IconButton
                        edge="end"
                        onClick={() => handleRestoreVersion(version)}
                        size="small"
                        sx={{ ml: 1 }}
                        color="primary"
                      >
                        <RestoreIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
              {index < versions.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    );
  };

  // Contenuto principale
  const content = (
    <Box>
      {!readOnly && renderUploadForm()}

      <Typography variant="subtitle1" gutterBottom>
        Cronologia versioni
      </Typography>

      {renderVersionsList()}
    </Box>
  );

  // Se inline, renderizza direttamente il contenuto
  if (inline) {
    return content;
  }

  // Altrimenti, renderizza all'interno di un Dialog
  return (
    <Dialog
      open={open}
      onClose={uploading ? null : onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Versioni dell'allegato: {attachment?.FileName}
          </Typography>
          <IconButton size="small" onClick={onClose} disabled={uploading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>{content}</DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={uploading}>
          Chiudi
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ItemAttachmentVersions;
