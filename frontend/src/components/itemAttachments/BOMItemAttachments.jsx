// Frontend/src/components/itemAttachments/BOMItemAttachments.js
import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Paper,
  Badge,
  Divider,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  MoreVert as MoreIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Info as InfoIcon,
  FileCopy as FileIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Label as LabelIcon,
  Share as ShareIcon,
  Restore as RestoreIcon,
} from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import useItemAttachmentsActions from "../../hooks/useItemAttachmentsActions";
import ItemAttachmentUploader from "./ItemAttachmentUploader";
import ItemAttachmentDetails from "./ItemAttachmentDetails";
import ItemAttachmentVersions from "./ItemAttachmentVersions";
import ItemAttachmentSharing from "./ItemAttachmentSharing";
import ItemAttachmentCategories from "./ItemAttachmentCategories";
import FileViewer from "../ui/fileViewer";
import { useAuth } from "../../context/AuthContext";
import { swal } from "@/lib/common";

/**
 * BOMItemAttachments - Componente specializzato per mostrare gli allegati nel contesto della distinta base
 * Versione minimal per integrazione BOM
 */
function BOMItemAttachments({
  itemCode = null,
  projectItemId = null,
  readOnly = false,
  isComponentItem = false,
  componentName = null,
  compact = true,
  autoLoad = true,
  initialAttachments = null,
}) {
  // Stati del componente
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [attachmentToView, setAttachmentToView] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [dialogType, setDialogType] = useState(""); // 'details', 'versions', 'sharing', 'categories'
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [detailsTabValue, setDetailsTabValue] = useState(0);
  const auth = useAuth();
  const userCompanyId = auth.user?.CompanyId;
  
  // Ref per tracciare se abbiamo già impostato gli allegati iniziali
  const initialAttachmentsSet = useRef(false);
  
  // Hook per le azioni sugli allegati
  const {
    loading,
    attachments,
    setAttachments,
    getAttachmentsByItemCode,
    getAttachmentsByProjectItemId,
    downloadAttachment,
    downloadAllAttachmentsByItemCode,
    downloadAllAttachmentsByProjectItemId,
    deleteAttachment,
    updateAttachment,
    restoreAttachment,
    shareAttachment,
    unshareAttachment,
    getAttachmentSharing,
    getAttachmentCategories,
    setAttachmentCategories,
    getAttachmentVersions,
    addAttachmentVersion,
  } = useItemAttachmentsActions();

  // Reset del flag quando cambiano i parametri del componente
  useEffect(() => {
    initialAttachmentsSet.current = false;
  }, [itemCode, projectItemId]);

  // Gestione degli allegati iniziali
  useEffect(() => {
    if (initialAttachments && initialAttachments.length >= 0 && !initialAttachmentsSet.current) {
      setAttachments(initialAttachments);
      initialAttachmentsSet.current = true;
    }
  }, [initialAttachments, setAttachments]);

  // Caricamento automatico degli allegati
  useEffect(() => {
    if (autoLoad && !initialAttachmentsSet.current) {
      if (itemCode) {
        getAttachmentsByItemCode(itemCode);
      } else if (projectItemId) {
        getAttachmentsByProjectItemId(projectItemId);
      }
    }
  }, [autoLoad, itemCode, projectItemId, getAttachmentsByItemCode, getAttachmentsByProjectItemId]);

  // Gestione apertura uploader
  const handleUploaderOpen = () => {
    setUploaderOpen(true);
  };

  // Gestione chiusura uploader
  const handleUploaderClose = () => {
    setUploaderOpen(false);
    refreshAttachments();
  };

  // Download di tutti gli allegati
  const handleDownloadAll = () => {
    if (itemCode) {
      downloadAllAttachmentsByItemCode(itemCode);
    } else if (projectItemId) {
      downloadAllAttachmentsByProjectItemId(projectItemId);
    }
  };

  // Gestione versioni allegato
  const handleVersions = (attachment) => {
    setSelectedAttachment(attachment);
    setDialogType("versions");
    setDialogOpen(true);
    handleMenuClose();
  };

  // Gestione condivisione allegato
  const handleShare = (attachment) => {
    setSelectedAttachment(attachment);
    setDialogType("sharing");
    setDialogOpen(true);
    handleMenuClose();
  };

  // Gestione categorie allegato
  const handleCategories = (attachment) => {
    setSelectedAttachment(attachment);
    setDialogType("categories");
    setDialogOpen(true);
    handleMenuClose();
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

  // Refresh degli allegati
  const refreshAttachments = () => {
    if (itemCode) {
      getAttachmentsByItemCode(itemCode);
    } else if (projectItemId) {
      getAttachmentsByProjectItemId(projectItemId);
    }
  };

  // Download di un allegato
  const handleDownload = (attachment) => {
    downloadAttachment(attachment.AttachmentID, attachment.FileName);
    handleMenuClose();
  };

  // Visualizza anteprima dell'allegato
  const handleViewPreview = (attachment) => {
    setSelectedAttachment(attachment);
    setIsPreviewOpen(true);
    handleMenuClose();
  };

  // Visualizza dettagli allegato
  const handleViewDetails = (attachment) => {
    setSelectedAttachment(attachment);
    setDialogType("details");
    setDetailsTabValue(0);
    setDialogOpen(true);
    handleMenuClose();
  };

  // Modifica dell'allegato
  const handleEdit = (attachment) => {
    if (!readOnly) {
      setSelectedAttachment(attachment);
      setDialogType("details");
      setDetailsTabValue(1);
      setDialogOpen(true);
    } else {
      setSelectedAttachment(attachment);
      setDialogType("details");
      setDetailsTabValue(0);
      setDialogOpen(true);
    }
    handleMenuClose();
  };

  // Eliminazione dell'allegato
  const handleDelete = (attachment) => {
    setSelectedAttachment(attachment);

    swal
      .fire({
        title: "Conferma eliminazione",
        text: `Sei sicuro di voler eliminare l'allegato "${attachment.FileName}"?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sì, elimina",
        cancelButtonText: "Annulla",
        confirmButtonColor: "#d33",
      })
      .then((result) => {
        if (result.isConfirmed) {
          performDelete(attachment);
        }
      });

    handleMenuClose();
  };

  // Funzione di supporto per eseguire l'eliminazione
  const performDelete = (attachment) => {
    deleteAttachment(attachment.AttachmentID)
      .then(() => {
        refreshAttachments();
        swal.fire("Eliminato!", "L'allegato è stato eliminato con successo.", "success");
      })
      .catch((error) => {
        console.error("Errore nell'eliminazione dell'allegato:", error);
        swal.fire("Errore", "Si è verificato un errore durante l'eliminazione dell'allegato.", "error");
      });
  };

  // Gestione chiusura dialogo
  const handleDialogClose = () => {
    setDialogOpen(false);
    refreshAttachments();
  };

  // Formatta dimensione file
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Icona per tipo di file
  const getFileIcon = (fileType, fileName) => {
    return <FileIcon sx={{ fontSize: 14 }} />;
  };

  return (
    <Box>
      {/* Header minimal con pulsanti essenziali */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5, px: 0.5 }}>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<UploadIcon />}
            onClick={handleUploaderOpen}
            sx={{ 
              height: 24, 
              fontSize: '0.9rem', 
              px: 1,
              minWidth: 'auto',
              '& .MuiButton-startIcon': { 
                marginRight: 0.5,
                '& svg': { fontSize: '0.9rem' }
              }
            }}
          >
            Carica
          </Button>
          {attachments.length > 0 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadAll}
              sx={{ 
                height: 24, 
                fontSize: '0.9rem', 
                px: 1,
                minWidth: 'auto',
                '& .MuiButton-startIcon': { 
                  marginRight: 0.5,
                  '& svg': { fontSize: '0.9rem' }
                }
              }}
            >
              Tutti
            </Button>
          )}
        </Box>
        
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
          {attachments.length} file
        </Typography>
      </Box>

      {/* Lista allegati con altezza dinamica */}
      <List disablePadding sx={{  overflow: 'auto' }}>
        {attachments.map((attachment, index) => (
          <React.Fragment key={attachment.AttachmentID}>
            <ListItem
              sx={{
                py: 0.25,
                px: 0.5,
                minHeight: 28,
                "&:hover": { backgroundColor: "action.hover" },
                ...(attachment.IsVisible === false && {
                  opacity: 0.6,
                  backgroundColor: "action.disabledBackground",
                }),
              }}
            >
              <ListItemIcon sx={{ minWidth: 58 }}>
                {getFileIcon(attachment.FileType, attachment.FileName)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="caption"
                    component="div"
                    sx={{ 
                      fontSize: '0.9rem',
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '400px'
                    }}
                  >
                    {attachment.FileName}
                  </Typography>
                }
                secondary={
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ 
                      fontSize: '0.75rem',
                      lineHeight: 1.1,
                    }}
                  >
                    {formatBytes(attachment.FileSizeKB * 1024)}
                  </Typography>
                }
              />
              <ListItemSecondaryAction>
                <Box sx={{ display: "flex", gap: 1.55 }}>
                  {attachment.IsVisible !== false ? (
                    <>
                      <Tooltip title="Scarica">
                        <IconButton
                          edge="end"
                          onClick={() => handleDownload(attachment)}
                          size="small"
                          sx={{ width: 18, height: 18, p: 1 }}
                        >
                          <DownloadIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Visualizza">
                        <IconButton
                          edge="end"
                          onClick={() => handleViewPreview(attachment)}
                          size="small"
                          sx={{ width: 18, height: 18, p: 1 }}
                        >
                          <ViewIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Modifica">
                        <IconButton
                          edge="end"
                          onClick={() => handleEdit(attachment)}
                          size="small"
                          sx={{ width: 18, height: 18, p: 0 }}
                        >
                          <EditIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Elimina">
                        <IconButton
                          edge="end"
                          onClick={() => handleDelete(attachment)}
                          size="small"
                          color="error"
                          sx={{ width: 18, height: 18, p: 1 }}
                        >
                          <DeleteIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Altro">
                        <IconButton
                          edge="end"
                          onClick={(e) => handleMenuOpen(e, attachment)}
                          size="small"
                          sx={{ width: 18, height: 18, p: 1 }}
                        >
                          <MoreIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : (
                    <Tooltip title="Ripristina">
                      <IconButton
                        edge="end"
                        onClick={() => {/* handle restore */}}
                        size="small"
                        color="primary"
                        sx={{ width: 18, height: 18, p: 1 }}
                      >
                        <RestoreIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
            {index < attachments.length - 1 && <Divider component="li" sx={{ my: 0 }} />}
          </React.Fragment>
        ))}
      </List>

      {/* Uploader */}
      <ItemAttachmentUploader
        open={uploaderOpen}
        onClose={handleUploaderClose}
        itemCode={itemCode}
        projectItemId={projectItemId}
        onUploadComplete={() => {
          refreshAttachments();
          setUploaderOpen(false);
        }}
      />

      {/* Menu contestuale completo */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { minWidth: 180 }
        }}
      >
        <MenuItem onClick={() => handleViewDetails(selectedAttachment)} sx={{ py: 0.75, fontSize: '0.85rem' }}>
          <InfoIcon sx={{ fontSize: 16, mr: 1 }} />
          Dettagli
        </MenuItem>
        <MenuItem onClick={() => handleDownload(selectedAttachment)} sx={{ py: 0.75, fontSize: '0.85rem' }}>
          <DownloadIcon sx={{ fontSize: 16, mr: 1 }} />
          Scarica
        </MenuItem>
        <MenuItem onClick={() => handleViewPreview(selectedAttachment)} sx={{ py: 0.75, fontSize: '0.85rem' }}>
          <ViewIcon sx={{ fontSize: 16, mr: 1 }} />
          Visualizza
        </MenuItem>
        <MenuItem onClick={() => handleVersions(selectedAttachment)} sx={{ py: 0.75, fontSize: '0.85rem' }}>
          <HistoryIcon sx={{ fontSize: 16, mr: 1 }} />
          Versioni
        </MenuItem>
        {!readOnly && (
          <>
            <MenuItem onClick={() => handleShare(selectedAttachment)} sx={{ py: 0.75, fontSize: '0.85rem' }}>
              <ShareIcon sx={{ fontSize: 16, mr: 1 }} />
              Condividi
            </MenuItem>
            <MenuItem onClick={() => handleCategories(selectedAttachment)} sx={{ py: 0.75, fontSize: '0.85rem' }}>
              <LabelIcon sx={{ fontSize: 16, mr: 1 }} />
              Categorie
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Dialog per le versioni */}
      {selectedAttachment && dialogOpen && dialogType === "versions" && (
        <ItemAttachmentVersions
          open={dialogOpen}
          attachment={selectedAttachment}
          onClose={handleDialogClose}
          readOnly={readOnly}
        />
      )}

      {/* Dialog per la condivisione */}
      {selectedAttachment && dialogOpen && dialogType === "sharing" && (
        <ItemAttachmentSharing
          open={dialogOpen}
          attachment={selectedAttachment}
          onClose={handleDialogClose}
          readOnly={readOnly}
        />
      )}

      {/* Dialog per le categorie */}
      {selectedAttachment && dialogOpen && dialogType === "categories" && (
        <ItemAttachmentCategories
          open={dialogOpen}
          attachment={selectedAttachment}
          onClose={handleDialogClose}
          readOnly={readOnly}
        />
      )}

      {/* FileViewer per la preview dell'allegato */}
      {isPreviewOpen && selectedAttachment && (
        <FileViewer
          file={{
            AttachmentID: selectedAttachment.AttachmentID,
            FileName: selectedAttachment.FileName,
            FileType: selectedAttachment.FileType,
            FilePath: selectedAttachment.FilePath,
            ItemCode: selectedAttachment.ItemCode,
          }}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </Box>
  );
}

export default BOMItemAttachments;