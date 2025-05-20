// Frontend/src/components/itemAttachments/ItemAttachmentSharing.js
import React, { useState, useEffect } from "react";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from "@mui/material";
import {
  Share as ShareIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Delete as DeleteIcon,
  Business as CompanyIcon,
  Person as PersonIcon,
  Visibility as ReadIcon,
  GetApp as DownloadIcon,
  Edit as EditIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import useItemAttachmentsActions from "../../hooks/useItemAttachmentsActions";

/**
 * ItemAttachmentSharing - Componente per la gestione delle condivisioni di un allegato
 *
 * @param {boolean} open - Flag per mostrare/nascondere il dialog (se non inline)
 * @param {object} attachment - L'allegato di cui gestire le condivisioni
 * @param {function} onClose - Callback per la chiusura del dialog (se non inline)
 * @param {boolean} readOnly - Flag per la modalità di sola lettura
 * @param {boolean} inline - Flag per visualizzazione inline (senza dialog)
 */
function ItemAttachmentSharing({
  open,
  attachment,
  onClose,
  readOnly = false,
  inline = false,
}) {
  // Stati
  const [sharing, setSharing] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);

  // Stati per il form di condivisione
  const [selectedCompany, setSelectedCompany] = useState("");
  const [accessLevel, setAccessLevel] = useState("read");

  // Hook per le azioni sugli allegati
  const { getAttachmentSharing, shareAttachment, unshareAttachment } =
    useItemAttachmentsActions();

  // Carica le condivisioni dell'allegato
  useEffect(() => {
    const loadSharing = async () => {
      if (!attachment || !attachment.AttachmentID) return;

      try {
        setLoading(true);
        const result = await getAttachmentSharing(attachment.AttachmentID);
        setSharing(result || []);
      } catch (error) {
        console.error("Error loading attachment sharing:", error);
      } finally {
        setLoading(false);
      }
    };

    if ((open || inline) && attachment) {
      loadSharing();

      // Carica anche l'elenco delle aziende disponibili
      // In un'implementazione reale, questo dovrebbe essere un servizio API separato
      setCompanies([
        { CompanyId: 1, Description: "CBL" },
        { CompanyId: 2, Description: "Ricos" },
        { CompanyId: 3, Description: "Tecnoline" },
      ]);
    }
  }, [attachment, open, inline, getAttachmentSharing]);

  // Gestione condivisione con una nuova azienda
  const handleShare = async () => {
    if (!selectedCompany) return;

    try {
      setSharing(true);
      await shareAttachment(
        attachment.AttachmentID,
        parseInt(selectedCompany),
        accessLevel,
      );

      // Aggiorna la lista delle condivisioni
      const result = await getAttachmentSharing(attachment.AttachmentID);
      setSharing(result || []);

      // Reset del form
      setSelectedCompany("");
      setAccessLevel("read");
    } catch (error) {
      console.error("Error sharing attachment:", error);
    } finally {
      setSharing(false);
    }
  };

  // Gestione rimozione condivisione
  const handleUnshare = async (targetCompanyId) => {
    try {
      setLoading(true);
      await unshareAttachment(attachment.AttachmentID, targetCompanyId);

      // Aggiorna la lista delle condivisioni
      const result = await getAttachmentSharing(attachment.AttachmentID);
      setSharing(result || []);
    } catch (error) {
      console.error("Error unsharing attachment:", error);
    } finally {
      setLoading(false);
    }
  };

  // Ottieni l'icona per il livello di accesso
  const getAccessLevelIcon = (level) => {
    switch (level) {
      case "read":
        return <ReadIcon fontSize="small" />;
      case "download":
        return <DownloadIcon fontSize="small" />;
      case "manage":
        return <EditIcon fontSize="small" />;
      default:
        return <ReadIcon fontSize="small" />;
    }
  };

  // Ottieni la descrizione per il livello di accesso
  const getAccessLevelName = (level) => {
    switch (level) {
      case "read":
        return "Sola lettura";
      case "download":
        return "Download";
      case "manage":
        return "Gestione completa";
      default:
        return "Sconosciuto";
    }
  };

  // Render del form per nuova condivisione
  const renderShareForm = () => {
    // Filtra le aziende già condivise e l'azienda proprietaria
    const availableCompanies = companies.filter((company) => {
      const isOwner = company.CompanyId === attachment.OwnerCompanyId;
      const isShared = sharing.some(
        (s) => s.TargetCompanyId === company.CompanyId,
      );
      return !isOwner && !isShared;
    });

    if (availableCompanies.length === 0) {
      return (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            bgcolor: "background.default",
          }}
        >
          <Typography variant="body2" color="textSecondary" align="center">
            L'allegato è già condiviso con tutte le aziende disponibili
          </Typography>
        </Paper>
      );
    }

    return (
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
          Condividi con un'altra azienda
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="company-select-label">Azienda</InputLabel>
              <Select
                labelId="company-select-label"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                label="Azienda"
                disabled={sharing}
              >
                {availableCompanies.map((company) => (
                  <MenuItem key={company.CompanyId} value={company.CompanyId}>
                    {company.Description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="access-level-label">
                Livello di accesso
              </InputLabel>
              <Select
                labelId="access-level-label"
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value)}
                label="Livello di accesso"
                disabled={sharing}
              >
                <MenuItem value="read">Sola lettura</MenuItem>
                <MenuItem value="download">Download</MenuItem>
                <MenuItem value="manage">Gestione completa</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid
            item
            xs={12}
            sx={{ display: "flex", justifyContent: "flex-end" }}
          >
            <Button
              variant="contained"
              color="primary"
              startIcon={<ShareIcon />}
              onClick={handleShare}
              disabled={sharing || !selectedCompany}
            >
              {sharing ? "Condivisione..." : "Condividi"}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  // Render della lista delle condivisioni
  const renderSharingList = () => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (sharing.length === 0) {
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
            Questo allegato non è condiviso con altre aziende
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
          {sharing.map((share, index) => (
            <React.Fragment key={share.SharingID}>
              <ListItem
                sx={{
                  "&:hover": { backgroundColor: "action.hover" },
                }}
              >
                <ListItemIcon>
                  <CompanyIcon />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2">
                      {share.TargetCompanyName}
                    </Typography>
                  }
                  secondary={
                    <React.Fragment>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mt: 0.5 }}
                      >
                        {getAccessLevelIcon(share.AccessLevel)}
                        <Typography variant="body2" sx={{ ml: 0.5 }}>
                          {getAccessLevelName(share.AccessLevel)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" component="div">
                        Condiviso da:{" "}
                        {share.SharedByFullName || share.SharedByUsername}
                      </Typography>
                      <Typography variant="body2" component="div">
                        Data:{" "}
                        {format(new Date(share.SharedAt), "dd/MM/yyyy HH:mm", {
                          locale: it,
                        })}
                      </Typography>
                    </React.Fragment>
                  }
                />
                {!readOnly && (
                  <ListItemSecondaryAction>
                    <Tooltip title="Rimuovi condivisione">
                      <IconButton
                        edge="end"
                        onClick={() => handleUnshare(share.TargetCompanyId)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
              {index < sharing.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    );
  };

  // Se l'allegato è pubblico, mostra un messaggio
  const isPublicMessage = attachment?.IsPublic && (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2,
        border: "1px solid",
        borderColor: "success.light",
        borderRadius: 1,
        bgcolor: "success.light",
        color: "success.contrastText",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <InfoIcon sx={{ mr: 1 }} />
        <Typography>
          Questo allegato è contrassegnato come <strong>pubblico</strong>,
          quindi è visibile a tutte le aziende indipendentemente dalle
          condivisioni specifiche.
        </Typography>
      </Box>
    </Paper>
  );

  // Contenuto principale
  const content = (
    <Box>
      {isPublicMessage}

      {!readOnly && renderShareForm()}

      <Typography variant="subtitle1" gutterBottom>
        Condivisioni attuali
      </Typography>

      {renderSharingList()}
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
      onClose={loading || sharing ? null : onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Condivisioni per: {attachment?.FileName}
          </Typography>
          <IconButton
            size="small"
            onClick={onClose}
            disabled={loading || sharing}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>{content}</DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading || sharing}>
          Chiudi
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ItemAttachmentSharing;
