// Frontend/src/components/itemAttachments/ItemAttachmentsPanel.js
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  MenuItem,
  List,
  ListItemText,
  ListItemIcon,
  ListItem,
  Divider,
  CircularProgress,
  Menu,
  Tab,
  Tabs,
  Badge,
  Card,
  CardContent,
  CardHeader,
  Alert,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  Visibility as ViewIcon,
  CloudDownload as DownloadAllIcon,
  FileCopy as FileIcon,
  History as HistoryIcon,
  Label as LabelIcon,
  Add as AddIcon,
  MoreVert as MoreIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Restore as RestoreIcon,
  VisibilityOff as HideIcon,
} from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import useItemAttachmentsActions from "../../hooks/useItemAttachmentsActions";
import { useAuthContext } from "../../contexts/AuthContext";
import { formatBytes } from "../../lib/common";
import ItemAttachmentUploader from "./ItemAttachmentUploader";
import ItemAttachmentDetails from "./ItemAttachmentDetails";
import ItemAttachmentVersions from "./ItemAttachmentVersions";
import ItemAttachmentSharing from "./ItemAttachmentSharing";
import ItemAttachmentCategories from "./ItemAttachmentCategories";
import FileViewer from "../ui/fileViewer";

/**
 * ItemAttachmentsPanel - Componente per visualizzare e gestire gli allegati di un articolo
 *
 * @param {string} itemCode - Codice dell'articolo (per articoli da ERP)
 * @param {number} projectItemId - ID dell'articolo progetto (per articoli temporanei)
 * @param {boolean} readOnly - Flag per modalità sola lettura
 * @param {boolean} showHeader - Mostra l'intestazione del componente
 * @param {number} maxHeight - Altezza massima del pannello
 * @param {number} companyId - ID dell'azienda (opzionale, altrimenti usa quello dell'utente corrente)
 */
function ItemAttachmentsPanel({
  itemCode = null,
  projectItemId = null,
  readOnly = false,
  showHeader = true,
  maxHeight = 400,
  companyId = null,
}) {
  const { authState } = useAuthContext();
  const [userCompanyId] = useState(companyId || authState.user?.CompanyId);

  // Stato locale
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(""); // 'details', 'versions', 'sharing', 'categories'
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [filterPublic, setFilterPublic] = useState(false);
  const [filterErp, setFilterErp] = useState(null); // null = tutti, true = solo ERP, false = solo non ERP
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterVisible, setFilterVisible] = useState(true); // Per mostrare solo allegati visibili di default
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [detailsTabValue, setDetailsTabValue] = useState(0);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Utilizziamo l'hook per le azioni sugli allegati
  const {
    loading,
    attachments,
    categories,
    getAttachmentsByItemCode,
    getAttachmentsByProjectItemId,
    uploadAttachmentByItemCode,
    uploadAttachmentByProjectItemId,
    downloadAttachment,
    deleteAttachment,
    updateAttachment,
    restoreAttachment,
    shareAttachment,
    unshareAttachment,
    getAttachmentSharing,
    getAttachmentCategories,
    addAttachmentCategory,
    getAttachmentsByCategory,
    setAttachmentCategories,
    getAttachmentVersions,
    addAttachmentVersion,
    downloadAllAttachmentsByItemCode,
    downloadAllAttachmentsByProjectItemId,
  } = useItemAttachmentsActions();

  // Caricamento iniziale degli allegati
  useEffect(() => {
    if (itemCode) {
      getAttachmentsByItemCode(itemCode);
    } else if (projectItemId) {
      getAttachmentsByProjectItemId(projectItemId);
    }

    // Carica le categorie se non sono già caricate
    if (categories.length === 0) {
      getAttachmentCategories();
    }
  }, [
    itemCode,
    projectItemId,
    getAttachmentsByItemCode,
    getAttachmentsByProjectItemId,
    getAttachmentCategories,
    categories.length,
  ]);

  // Funzione per filtrare gli allegati
  const filteredAttachments = useCallback(() => {
    return attachments.filter((attachment) => {
      // Filtra per pubblico/privato
      if (filterPublic && !attachment.IsPublic) {
        return false;
      }

      // Filtra per ERP/non ERP
      if (filterErp !== null && attachment.IsErpAttachment !== filterErp) {
        return false;
      }

      // Filtra per visibilità
      if (filterVisible && attachment.IsVisible === false) {
        return false;
      }

      // Filtra per categoria
      if (filterCategory && !attachment.Categories?.includes(filterCategory)) {
        return false;
      }

      return true;
    });
  }, [attachments, filterPublic, filterErp, filterCategory, filterVisible]);

  // Verifica se l'utente può modificare un allegato
  const canEditAttachment = (attachment) => {
    return !readOnly && attachment.OwnerCompanyId === userCompanyId;
  };

  // Gestione apertura menu contestuale
  const handleMenuOpen = (event, attachment) => {
    setSelectedAttachment(attachment);
    setMenuAnchorEl(event.currentTarget);
  };

  // Gestione chiusura menu contestuale
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // Gestione apertura uploader
  const handleUploaderOpen = () => {
    setUploaderOpen(true);
  };

  // Gestione chiusura uploader
  const handleUploaderClose = () => {
    setUploaderOpen(false);
  };

  // Gestione caricamento completato
  const handleUploadComplete = (result) => {
    // Aggiorna la lista degli allegati
    if (itemCode) {
      getAttachmentsByItemCode(itemCode);
    } else if (projectItemId) {
      getAttachmentsByProjectItemId(projectItemId);
    }

    setUploaderOpen(false);
  };

  // Gestione download allegato
  const handleDownload = (attachment) => {
    downloadAttachment(attachment.AttachmentID, attachment.FileName);
    handleMenuClose();
  };

  // Gestione download tutti gli allegati
  const handleDownloadAll = () => {
    if (itemCode) {
      downloadAllAttachmentsByItemCode(itemCode);
    } else if (projectItemId) {
      downloadAllAttachmentsByProjectItemId(projectItemId);
    }
  };

  // Gestione visualizzazione dettagli
  const handleViewDetails = (attachment) => {
    setSelectedAttachment(attachment);
    setDialogType("details");
    setDialogOpen(true);
    handleMenuClose();
  };

  // Gestione visualizzazione anteprima del file
  const handleViewPreview = (attachment) => {
    setSelectedAttachment(attachment);
    setIsPreviewOpen(true);
    handleMenuClose();
  };

  // Gestione modifica allegato
  const handleEdit = (attachment) => {
    if (canEditAttachment(attachment)) {
      setSelectedAttachment(attachment);
      setDialogType("details");
      setDetailsTabValue(1); // Tab di modifica
      setDialogOpen(true);
    }
    handleMenuClose();
  };

  // Gestione eliminazione allegato
  const handleDelete = (attachment) => {
    if (canEditAttachment(attachment)) {
      setSelectedAttachment(attachment);
      setConfirmDeleteOpen(true);
    }
    handleMenuClose();
  };

  // Conferma eliminazione
  const handleConfirmDelete = async () => {
    if (selectedAttachment && canEditAttachment(selectedAttachment)) {
      await deleteAttachment(selectedAttachment.AttachmentID);

      // Aggiorna la lista dopo l'eliminazione
      if (itemCode) {
        getAttachmentsByItemCode(itemCode);
      } else if (projectItemId) {
        getAttachmentsByProjectItemId(projectItemId);
      }
    }

    setConfirmDeleteOpen(false);
  };

  // Gestione ripristino allegato (da soft delete)
  const handleRestore = (attachment) => {
    if (canEditAttachment(attachment)) {
      setSelectedAttachment(attachment);
      setConfirmRestoreOpen(true);
    }
    handleMenuClose();
  };

  // Conferma ripristino
  const handleConfirmRestore = async () => {
    if (selectedAttachment && canEditAttachment(selectedAttachment)) {
      await restoreAttachment(selectedAttachment.AttachmentID);

      // Aggiorna la lista dopo il ripristino
      if (itemCode) {
        getAttachmentsByItemCode(itemCode);
      } else if (projectItemId) {
        getAttachmentsByProjectItemId(projectItemId);
      }
    }

    setConfirmRestoreOpen(false);
  };

  // Gestione condivisione allegato
  const handleShare = (attachment) => {
    if (canEditAttachment(attachment)) {
      setSelectedAttachment(attachment);
      setDialogType("sharing");
      setDialogOpen(true);
    }
    handleMenuClose();
  };

  // Gestione visualizzazione versioni
  const handleVersions = (attachment) => {
    setSelectedAttachment(attachment);
    setDialogType("versions");
    setDialogOpen(true);
    handleMenuClose();
  };

  // Gestione gestione categorie
  const handleCategories = (attachment) => {
    if (canEditAttachment(attachment)) {
      setSelectedAttachment(attachment);
      setDialogType("categories");
      setDialogOpen(true);
    }
    handleMenuClose();
  };

  // Gestione chiusura dialogo
  const handleDialogClose = () => {
    setDialogOpen(false);
    setDetailsTabValue(0); // Reset alla tab di visualizzazione

    // Aggiorna la lista degli allegati se necessario
    if (itemCode) {
      getAttachmentsByItemCode(itemCode);
    } else if (projectItemId) {
      getAttachmentsByProjectItemId(projectItemId);
    }
  };

  // Gestione aggiornamento lista allegati
  const handleRefresh = () => {
    if (itemCode) {
      getAttachmentsByItemCode(itemCode);
    } else if (projectItemId) {
      getAttachmentsByProjectItemId(projectItemId);
    }
  };

  // Icona per tipo di file
  const getFileIcon = (fileType, fileName) => {
    const extension = fileName.split(".").pop().toLowerCase();

    if (fileType && fileType.startsWith("image/")) {
      return (
        <img
          src={`data:${fileType};base64,${attachment?.thumbnail || ""}`}
          alt="thumbnail"
          style={{ width: 40, height: 40, objectFit: "cover" }}
        />
      );
    }

    switch (extension) {
      case "pdf":
        return <FileIcon style={{ color: "red" }} />;
      case "doc":
      case "docx":
        return <FileIcon style={{ color: "blue" }} />;
      case "xls":
      case "xlsx":
        return <FileIcon style={{ color: "green" }} />;
      case "ppt":
      case "pptx":
        return <FileIcon style={{ color: "orange" }} />;
      case "zip":
      case "rar":
        return <FileIcon style={{ color: "purple" }} />;
      case "dwg":
      case "dxf":
      case "step":
      case "stp":
      case "iges":
      case "igs":
        return <FileIcon style={{ color: "teal" }} />;
      default:
        return <FileIcon />;
    }
  };

  // Render dei filtri
  const renderFilters = () => (
    <Box
      sx={{
        mb: 2,
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 1,
      }}
    >
      <FormControlLabel
        control={
          <Switch
            checked={filterPublic}
            onChange={(e) => setFilterPublic(e.target.checked)}
            size="small"
          />
        }
        label="Solo pubblici"
      />

      <FormControlLabel
        control={
          <Switch
            checked={filterVisible}
            onChange={(e) => setFilterVisible(e.target.checked)}
            size="small"
          />
        }
        label="Solo visibili"
      />

      <Box sx={{ display: "flex", alignItems: "center", ml: 2 }}>
        <Typography variant="body2" sx={{ mr: 1 }}>
          Tipo:
        </Typography>
        <Box sx={{ minWidth: 120 }}>
          <TextField
            select
            size="small"
            value={filterErp === null ? "all" : filterErp ? "erp" : "temp"}
            onChange={(e) => {
              const value = e.target.value;
              setFilterErp(value === "all" ? null : value === "erp");
            }}
            variant="outlined"
          >
            <MenuItem value="all">Tutti</MenuItem>
            <MenuItem value="erp">ERP</MenuItem>
            <MenuItem value="temp">Temporanei</MenuItem>
          </TextField>
        </Box>
      </Box>

      {categories.length > 0 && (
        <Box sx={{ display: "flex", alignItems: "center", ml: 2 }}>
          <Typography variant="body2" sx={{ mr: 1 }}>
            Categoria:
          </Typography>
          <Box sx={{ minWidth: 150 }}>
            <TextField
              select
              size="small"
              value={filterCategory || "all"}
              onChange={(e) => {
                const value = e.target.value;
                setFilterCategory(value === "all" ? null : value);
              }}
              variant="outlined"
            >
              <MenuItem value="all">Tutte le categorie</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.CategoryID} value={category.CategoryID}>
                  {category.CategoryName}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </Box>
      )}

      <Button
        variant="outlined"
        size="small"
        startIcon={<RefreshIcon />}
        onClick={() => {
          setFilterPublic(false);
          setFilterErp(null);
          setFilterCategory(null);
          setFilterVisible(true);
          handleRefresh();
        }}
        sx={{ ml: "auto" }}
      >
        Reset
      </Button>
    </Box>
  );

  // Render della lista allegati
  const renderAttachmentsList = () => {
    const filteredList = filteredAttachments();

    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (filteredList.length === 0) {
      return (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "background.default",
            borderRadius: 1,
            border: "1px dashed",
            borderColor: "divider",
          }}
        >
          <InfoIcon color="disabled" sx={{ fontSize: 48, mb: 2 }} />
          <Typography color="textSecondary">
            {attachments.length === 0
              ? "Nessun allegato disponibile per questo articolo"
              : "Nessun allegato corrisponde ai filtri selezionati"}
          </Typography>
          {!readOnly && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<UploadIcon />}
              onClick={handleUploaderOpen}
              sx={{ mt: 2 }}
            >
              Carica un allegato
            </Button>
          )}
        </Paper>
      );
    }

    return (
      <List
        sx={{
          maxHeight: maxHeight,
          overflow: "auto",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          backgroundColor: "background.paper",
        }}
      >
        {filteredList.map((attachment) => (
          <React.Fragment key={attachment.AttachmentID}>
            <ListItem
              sx={{
                "&:hover": {
                  backgroundColor: "action.hover",
                },
                // Aggiunge uno stile visivo se l'allegato è nascosto
                ...(attachment.IsVisible === false && {
                  opacity: 0.6,
                  backgroundColor: "action.disabledBackground",
                }),
              }}
            >
              <ListItemIcon>
                {getFileIcon(attachment.FileType, attachment.FileName)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="body1"
                    component="div"
                    sx={{
                      fontWeight: "medium",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {attachment.FileName}
                    {attachment.IsPublic && (
                      <Tooltip title="Allegato pubblico">
                        <PublicIcon
                          fontSize="small"
                          color="primary"
                          sx={{ ml: 1 }}
                        />
                      </Tooltip>
                    )}
                    {attachment.IsErpAttachment && (
                      <Tooltip title="Allegato da ERP">
                        <Chip
                          label="ERP"
                          color="info"
                          size="small"
                          sx={{ ml: 1, height: 20, fontSize: "0.7rem" }}
                        />
                      </Tooltip>
                    )}
                    {attachment.IsVisible === false && (
                      <Tooltip title="Allegato nascosto (soft delete)">
                        <Chip
                          label="Nascosto"
                          color="error"
                          size="small"
                          sx={{ ml: 1, height: 20, fontSize: "0.7rem" }}
                        />
                      </Tooltip>
                    )}
                  </Typography>
                }
                secondary={
                  <React.Fragment>
                    <Box
                      sx={{ display: "flex", alignItems: "center", mt: 0.5 }}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: "0.75rem" }}
                      >
                        {formatBytes(attachment.FileSizeKB * 1024)} • Caricato{" "}
                        {formatDistanceToNow(new Date(attachment.UploadedAt), {
                          addSuffix: true,
                          locale: it,
                        })}{" "}
                        • Da{" "}
                        {attachment.UploadedByFullName ||
                          attachment.UploadedByUsername}
                        {attachment.OwnerCompanyId !== userCompanyId &&
                          ` (${attachment.OwnerCompanyName})`}
                      </Typography>
                    </Box>
                    {attachment.Description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5, fontSize: "0.75rem" }}
                      >
                        {attachment.Description}
                      </Typography>
                    )}
                    {attachment.Tags && (
                      <Box
                        sx={{
                          mt: 0.5,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 0.5,
                        }}
                      >
                        {attachment.Tags.split(",").map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag.trim()}
                            size="small"
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        ))}
                      </Box>
                    )}
                  </React.Fragment>
                }
              />
              <ListItem>
                <Box sx={{ display: "flex" }}>
                  {/* Per allegati nascosti, mostra un pulsante di ripristino se l'utente è autorizzato */}
                  {attachment.IsVisible === false &&
                    canEditAttachment(attachment) && (
                      <Tooltip title="Ripristina">
                        <IconButton
                          edge="end"
                          aria-label="restore"
                          onClick={() => handleRestore(attachment)}
                          size="small"
                          color="primary"
                        >
                          <RestoreIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}

                  {/* Per gli allegati visibili, mostra le azioni standard */}
                  {attachment.IsVisible !== false && (
                    <>
                      <Tooltip title="Scarica">
                        <IconButton
                          edge="end"
                          aria-label="download"
                          onClick={() => handleDownload(attachment)}
                          size="small"
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Visualizza">
                        <IconButton
                          edge="end"
                          aria-label="preview"
                          onClick={() => handleViewPreview(attachment)}
                          size="small"
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}

                  <IconButton
                    edge="end"
                    aria-label="more"
                    onClick={(e) => handleMenuOpen(e, attachment)}
                    size="small"
                  >
                    <MoreIcon fontSize="small" />
                  </IconButton>
                </Box>
              </ListItem>
            </ListItem>
            <Divider component="li" />
          </React.Fragment>
        ))}
      </List>
    );
  };

  // Render del menu contestuale
  const renderMenu = () => {
    if (!selectedAttachment) return null;

    const isOwner = canEditAttachment(selectedAttachment);
    const isVisible = selectedAttachment.IsVisible !== false;

    return (
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleViewDetails(selectedAttachment)}>
          <ListItemIcon>
            <InfoIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Dettagli</ListItemText>
        </MenuItem>

        {isVisible && (
          <MenuItem onClick={() => handleViewPreview(selectedAttachment)}>
            <ListItemIcon>
              <ViewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Visualizza</ListItemText>
          </MenuItem>
        )}

        {isVisible && (
          <MenuItem onClick={() => handleDownload(selectedAttachment)}>
            <ListItemIcon>
              <DownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Scarica</ListItemText>
          </MenuItem>
        )}

        {isVisible && (
          <MenuItem onClick={() => handleVersions(selectedAttachment)}>
            <ListItemIcon>
              <HistoryIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Versioni</ListItemText>
          </MenuItem>
        )}

        {isOwner && isVisible && (
          <MenuItem onClick={() => handleShare(selectedAttachment)}>
            <ListItemIcon>
              <ShareIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Condividi</ListItemText>
          </MenuItem>
        )}

        {isOwner && isVisible && (
          <MenuItem onClick={() => handleCategories(selectedAttachment)}>
            <ListItemIcon>
              <LabelIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Gestisci categorie</ListItemText>
          </MenuItem>
        )}

        {isOwner && isVisible && (
          <>
            <Divider />
            <MenuItem onClick={() => handleEdit(selectedAttachment)}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Modifica</ListItemText>
            </MenuItem>

            <MenuItem
              onClick={() => handleDelete(selectedAttachment)}
              sx={{ color: "error.main" }}
            >
              <ListItemIcon sx={{ color: "error.main" }}>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Elimina</ListItemText>
            </MenuItem>
          </>
        )}

        {isOwner && !isVisible && (
          <MenuItem
            onClick={() => handleRestore(selectedAttachment)}
            sx={{ color: "success.main" }}
          >
            <ListItemIcon sx={{ color: "success.main" }}>
              <RestoreIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Ripristina</ListItemText>
          </MenuItem>
        )}
      </Menu>
    );
  };

  return (
    <Box sx={{ width: "100%" }}>
      {showHeader && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" component="div">
            Allegati {itemCode ? `(Articolo ${itemCode})` : ""}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Gestisci i documenti e gli allegati associati a questo articolo
          </Typography>
        </Box>
      )}

      {/* Azioni principali */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Box>
          {!readOnly && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<UploadIcon />}
              onClick={handleUploaderOpen}
              sx={{ mr: 1 }}
            >
              Carica
            </Button>
          )}
          {attachments.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<DownloadAllIcon />}
              onClick={handleDownloadAll}
            >
              Scarica tutti
            </Button>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Tooltip title="Aggiorna">
            <IconButton onClick={handleRefresh} size="small" sx={{ mr: 1 }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Badge
            badgeContent={attachments.length}
            color="primary"
            sx={{
              "& .MuiBadge-badge": {
                right: -3,
                top: 3,
              },
            }}
          >
            <Typography variant="body2">
              {attachments.length === 1
                ? "1 allegato"
                : `${attachments.length} allegati`}
            </Typography>
          </Badge>
        </Box>
      </Box>

      {/* Filtri */}
      {attachments.length > 0 && renderFilters()}

      {/* Lista allegati */}
      {renderAttachmentsList()}

      {/* Menu contestuale */}
      {renderMenu()}

      {/* Dialog per i dettagli */}
      {selectedAttachment && dialogOpen && dialogType === "details" && (
        <ItemAttachmentDetails
          open={dialogOpen}
          attachment={selectedAttachment}
          onClose={handleDialogClose}
          tabValue={detailsTabValue}
          onTabChange={setDetailsTabValue}
          readOnly={!canEditAttachment(selectedAttachment)}
          onUpdate={handleDialogClose}
        />
      )}

      {/* Dialog per le versioni */}
      {selectedAttachment && dialogOpen && dialogType === "versions" && (
        <ItemAttachmentVersions
          open={dialogOpen}
          attachment={selectedAttachment}
          onClose={handleDialogClose}
          readOnly={!canEditAttachment(selectedAttachment)}
        />
      )}

      {/* Dialog per la condivisione */}
      {selectedAttachment && dialogOpen && dialogType === "sharing" && (
        <ItemAttachmentSharing
          open={dialogOpen}
          attachment={selectedAttachment}
          onClose={handleDialogClose}
          readOnly={!canEditAttachment(selectedAttachment)}
        />
      )}

      {/* Dialog per le categorie */}
      {selectedAttachment && dialogOpen && dialogType === "categories" && (
        <ItemAttachmentCategories
          open={dialogOpen}
          attachment={selectedAttachment}
          onClose={handleDialogClose}
          readOnly={!canEditAttachment(selectedAttachment)}
        />
      )}

      {/* Dialog per la conferma di eliminazione */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
      >
        <DialogTitle>Conferma eliminazione</DialogTitle>
        <DialogContent>
          <Typography>
            Sei sicuro di voler eliminare l'allegato "
            {selectedAttachment?.FileName}"?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Questa operazione eseguirà una "soft delete" dell'allegato.
            L'allegato non sarà visibile ma potrà essere ripristinato in
            seguito.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Annulla</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
          >
            Elimina
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog per la conferma di ripristino */}
      <Dialog
        open={confirmRestoreOpen}
        onClose={() => setConfirmRestoreOpen(false)}
      >
        <DialogTitle>Conferma ripristino</DialogTitle>
        <DialogContent>
          <Typography>
            Sei sicuro di voler ripristinare l'allegato "
            {selectedAttachment?.FileName}"?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            L'allegato sarà nuovamente visibile a tutti gli utenti autorizzati.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRestoreOpen(false)}>Annulla</Button>
          <Button
            onClick={handleConfirmRestore}
            color="success"
            variant="contained"
          >
            Ripristina
          </Button>
        </DialogActions>
      </Dialog>

      {/* Uploader */}
      <ItemAttachmentUploader
        open={uploaderOpen}
        onClose={handleUploaderClose}
        itemCode={itemCode}
        projectItemId={projectItemId}
        onUploadComplete={handleUploadComplete}
        categories={categories}
      />

      {/* FileViewer per la preview dell'allegato */}
      {isPreviewOpen && selectedAttachment && (
        <FileViewer
          file={{
            AttachmentID: selectedAttachment.AttachmentID,
            FileName: selectedAttachment.FileName,
            FileType: selectedAttachment.FileType,
            FilePath: selectedAttachment.FilePath,
          }}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </Box>
  );
}

export default ItemAttachmentsPanel;
