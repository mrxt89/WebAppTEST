// Frontend/src/components/itemAttachments/BOMItemAttachments.js
import React, { useState, useEffect, useRef } from 'react';
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
  DialogActions
} from '@mui/material';
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
  Restore as RestoreIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import useItemAttachmentsActions from '../../hooks/useItemAttachmentsActions';
import ItemAttachmentUploader from './ItemAttachmentUploader';
import ItemAttachmentDetails from './ItemAttachmentDetails';
import ItemAttachmentVersions from './ItemAttachmentVersions';
import ItemAttachmentSharing from './ItemAttachmentSharing';
import ItemAttachmentCategories from './ItemAttachmentCategories';
import FileViewer from '../ui/fileViewer';
import { useAuth } from '../../context/AuthContext';

/**
 * BOMItemAttachments - Componente specializzato per mostrare gli allegati nel contesto della distinta base
 * 
 * @param {string} itemCode - Codice dell'articolo (per articoli da ERP)
 * @param {number} projectItemId - ID dell'articolo progetto (per articoli temporanei)
 * @param {boolean} readOnly - Flag per modalità sola lettura
 * @param {boolean} isComponentItem - Flag che indica se l'articolo è un componente della distinta
 * @param {string} componentName - Nome del componente (opzionale)
 * @param {boolean} compact - Flag per modalità compatta (adatta alla visualizzazione in una tab)
 */
function BOMItemAttachments({ 
  itemCode = null,
  projectItemId = null,
  readOnly = false,
  isComponentItem = false,
  componentName = null,
  compact = true
}) {
  // Stati del componente
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [attachmentToView, setAttachmentToView] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [dialogType, setDialogType] = useState(''); // 'details', 'versions', 'sharing', 'categories'
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  // Stati per dialoghi rimossi, utilizziamo SweetAlert
  const [detailsTabValue, setDetailsTabValue] = useState(0);
  const auth = useAuth();
  const userCompanyId = auth.user?.CompanyId;
  // Hook per le azioni sugli allegati
  const {
    loading,
    attachments,
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
    addAttachmentVersion
  } = useItemAttachmentsActions();

  // Caricamento iniziale degli allegati
  useEffect(() => {
    if (itemCode) {
      getAttachmentsByItemCode(itemCode);
    } else if (projectItemId) {
      getAttachmentsByProjectItemId(projectItemId);
    }
  }, [itemCode, projectItemId, getAttachmentsByItemCode, getAttachmentsByProjectItemId]);

  // Gestione apertura uploader
  const handleUploaderOpen = () => {
    setUploaderOpen(true);
  };

  // Gestione chiusura uploader
  const handleUploaderClose = () => {
    setUploaderOpen(false);
    refreshAttachments();
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

  // Download di tutti gli allegati
  const handleDownloadAll = () => {
    if (itemCode) {
      downloadAllAttachmentsByItemCode(itemCode);
    } else if (projectItemId) {
      downloadAllAttachmentsByProjectItemId(projectItemId);
    }
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
    setDialogType('details');
    setDetailsTabValue(0); // Tab di visualizzazione
    setDialogOpen(true);
    handleMenuClose();
  };

  // Modifica dell'allegato
  const handleEdit = (attachment) => {
    // Controlla se l'utente può modificare l'allegato (proprietario dell'allegato)
    if (!readOnly) {
      setSelectedAttachment(attachment);
      setDialogType('details');
      setDetailsTabValue(1); // Tab di modifica
      setDialogOpen(true);
    } else {
      // Se in modalità sola lettura, mostra solo i dettagli
      setSelectedAttachment(attachment);
      setDialogType('details');
      setDetailsTabValue(0); // Tab di visualizzazione
      setDialogOpen(true);
    }
    handleMenuClose();
  };

  // Gestione versioni allegato
  const handleVersions = (attachment) => {
    setSelectedAttachment(attachment);
    setDialogType('versions');
    setDialogOpen(true);
    handleMenuClose();
  };

  // Gestione condivisione allegato
  const handleShare = (attachment) => {
    setSelectedAttachment(attachment);
    setDialogType('sharing');
    setDialogOpen(true);
    handleMenuClose();
  };

  // Gestione categorie allegato
  const handleCategories = (attachment) => {
    setSelectedAttachment(attachment);
    setDialogType('categories');
    setDialogOpen(true);
    handleMenuClose();
  };

  // Eliminazione dell'allegato
  const handleDelete = (attachment) => {
    if (readOnly) return; // Non permettere eliminazione in modalità sola lettura
    
    setSelectedAttachment(attachment);
    
    // Usiamo sempre SweetAlert
    if (window.swal && window.swal.fire) {
      window.swal.fire({
        title: 'Conferma eliminazione',
        text: `Sei sicuro di voler eliminare l'allegato "${attachment.FileName}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sì, elimina',
        cancelButtonText: 'Annulla',
        confirmButtonColor: '#d33',
      }).then((result) => {
        if (result.isConfirmed) {
          performDelete(attachment);
        }
      });
    } else {
      // Fallback su conferma standard se swal non è disponibile
      if (window.confirm(`Sei sicuro di voler eliminare l'allegato "${attachment.FileName}"?`)) {
        performDelete(attachment);
      }
    }
    
    handleMenuClose();
  };

  // Funzione di supporto per eseguire l'eliminazione
  const performDelete = (attachment) => {
    deleteAttachment(attachment.AttachmentID)
      .then(() => {
        // Aggiorna la lista degli allegati dopo l'eliminazione
        refreshAttachments();
        
        // Mostra messaggio di successo
        if (window.swal && window.swal.fire) {
          window.swal.fire('Eliminato!', 'L\'allegato è stato eliminato con successo.', 'success');
        }
      })
      .catch(error => {
        console.error('Errore nell\'eliminazione dell\'allegato:', error);
        
        // Mostra messaggio di errore
        if (window.swal && window.swal.fire) {
          window.swal.fire('Errore', 'Si è verificato un errore durante l\'eliminazione dell\'allegato.', 'error');
        } else {
          alert('Errore nell\'eliminazione dell\'allegato');
        }
      });
  };

  // Conferma eliminazione (dialog standard)
  const handleConfirmDelete = () => {
    if (selectedAttachment) {
      performDelete(selectedAttachment);
    }
    setConfirmDeleteOpen(false);
  };

  // Gestione ripristino allegato (da soft delete)
  const handleRestore = (attachment) => {
    if (readOnly) return; // Non permettere ripristino in modalità sola lettura
    
    setSelectedAttachment(attachment);
    
    // Usiamo sempre SweetAlert
    if (window.swal && window.swal.fire) {
      window.swal.fire({
        title: 'Conferma ripristino',
        text: `Sei sicuro di voler ripristinare l'allegato "${attachment.FileName}"?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sì, ripristina',
        cancelButtonText: 'Annulla',
        confirmButtonColor: '#4caf50',
      }).then((result) => {
        if (result.isConfirmed) {
          performRestore(attachment);
        }
      });
    } else {
      // Fallback su conferma standard
      if (window.confirm(`Sei sicuro di voler ripristinare l'allegato "${attachment.FileName}"?`)) {
        performRestore(attachment);
      }
    }
    
    handleMenuClose();
  };

  // Funzione di supporto per eseguire il ripristino
  const performRestore = (attachment) => {
    restoreAttachment(attachment.AttachmentID)
      .then(() => {
        // Aggiorna la lista degli allegati dopo il ripristino
        refreshAttachments();
        
        // Mostra messaggio di successo
        if (window.swal && window.swal.fire) {
          window.swal.fire('Ripristinato!', 'L\'allegato è stato ripristinato con successo.', 'success');
        }
      })
      .catch(error => {
        console.error('Errore nel ripristino dell\'allegato:', error);
        
        // Mostra messaggio di errore
        if (window.swal && window.swal.fire) {
          window.swal.fire('Errore', 'Si è verificato un errore durante il ripristino dell\'allegato.', 'error');
        } else {
          alert('Errore nel ripristino dell\'allegato');
        }
      });
  };

  // Conferma ripristino (dialog standard)
  const handleConfirmRestore = () => {
    if (selectedAttachment) {
      performRestore(selectedAttachment);
    }
    setConfirmRestoreOpen(false);
  };

  // Gestione chiusura dialogo
  const handleDialogClose = () => {
    setDialogOpen(false);
    refreshAttachments();
  };

  // Formatta dimensione file
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Icona per tipo di file
  const getFileIcon = (fileType, fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    return <FileIcon />;
  };

  // Contenuto principale del componente
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Intestazione con indicazione del componente selezionato */}
      {isComponentItem && componentName && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 1.5, 
            mb: 2, 
            display: 'flex', 
            alignItems: 'center',
            backgroundColor: 'info.light', 
            color: 'info.contrastText' 
          }}
        >
          <InfoIcon sx={{ mr: 1, fontSize: 18 }} />
          <Typography variant="body2">
            Allegati del componente: <strong>{componentName}</strong>
          </Typography>
        </Paper>
      )}
      
      {/* Barra delle azioni */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 1.5 
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!readOnly && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<UploadIcon />}
              onClick={handleUploaderOpen}
              size={compact ? "small" : "medium"}
            >
              Carica
            </Button>
          )}
          
          {attachments.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadAll}
              size={compact ? "small" : "medium"}
            >
              Scarica tutti
            </Button>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Aggiorna">
            <IconButton onClick={refreshAttachments} size="small">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Lista allegati */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : attachments.length === 0 ? (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'background.default',
            borderRadius: 1,
            border: '1px dashed',
            borderColor: 'divider',
            flex: 1
          }}
        >
          <InfoIcon color="disabled" sx={{ fontSize: 48, mb: 2 }} />
          <Typography color="textSecondary">
            Nessun allegato disponibile per questo {isComponentItem ? 'componente' : 'articolo'}
          </Typography>
          {!readOnly && (
            <Button 
              variant="outlined" 
              color="primary" 
              startIcon={<UploadIcon />} 
              onClick={handleUploaderOpen}
              sx={{ mt: 2 }}
              size="small"
            >
              Carica un allegato
            </Button>
          )}
        </Paper>
      ) : (
        <List 
          sx={{ 
            maxHeight: compact ? 300 : 'auto', 
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            backgroundColor: 'background.paper',
            flex: 1
          }}
        >
          {attachments.map((attachment) => (
            <React.Fragment key={attachment.AttachmentID}>
              <ListItem 
                sx={{ 
                  '&:hover': { 
                    backgroundColor: 'action.hover' 
                  },
                  // Aggiunge uno stile visivo se l'allegato è nascosto
                  ...(attachment.IsVisible === false && {
                    opacity: 0.6,
                    backgroundColor: 'action.disabledBackground'
                  })
                }}
              >
                <ListItemIcon>
                  {getFileIcon(attachment.FileType, attachment.FileName)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      component="div"
                      sx={{
                        fontWeight: 'medium',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {attachment.FileName}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {formatBytes(attachment.FileSizeKB * 1024)} • 
                      {formatDistanceToNow(new Date(attachment.UploadedAt), { addSuffix: true, locale: it })}
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex' }}>
                    {/* Per allegati nascosti (con soft delete), mostra pulsante di ripristino */}
                    {attachment.IsVisible === false && !readOnly ? (
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
                    ) : (
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
                        {!readOnly && (
                          <>
                            <Tooltip title="Modifica">
                              <IconButton
                                edge="end"
                                aria-label="edit"
                                onClick={() => handleEdit(attachment)}
                                size="small"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Elimina">
                              <IconButton
                                edge="end"
                                aria-label="delete"
                                onClick={() => handleDelete(attachment)}
                                size="small"
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title="Altre opzioni">
                          <IconButton
                            edge="end"
                            aria-label="more"
                            onClick={(e) => handleMenuOpen(e, attachment)}
                            size="small"
                          >
                            <MoreIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      )}
      
      {/* Menu contestuale */}
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
        
        <MenuItem onClick={() => handleDownload(selectedAttachment)}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Scarica</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleViewPreview(selectedAttachment)}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Visualizza</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleVersions(selectedAttachment)}>
          <ListItemIcon>
            <HistoryIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Versioni</ListItemText>
        </MenuItem>
        
        {!readOnly && (
          <>
            <MenuItem onClick={() => handleShare(selectedAttachment)}>
              <ListItemIcon>
                <ShareIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Condividi</ListItemText>
            </MenuItem>
            
            <MenuItem onClick={() => handleCategories(selectedAttachment)}>
              <ListItemIcon>
                <LabelIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Categorie</ListItemText>
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={() => handleEdit(selectedAttachment)}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Modifica</ListItemText>
            </MenuItem>
            
            <MenuItem 
              onClick={() => handleDelete(selectedAttachment)}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon sx={{ color: 'error.main' }}>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Elimina</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
      
      {/* Rimossi dialog di conferma, utilizziamo SweetAlert */}
      
      {/* Dialog uploader */}
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
      
      {/* Dialog per i dettagli */}
      {selectedAttachment && dialogOpen && dialogType === 'details' && (
        <ItemAttachmentDetails
          open={dialogOpen}
          attachment={selectedAttachment}
          onClose={handleDialogClose}
          tabValue={detailsTabValue}
          onTabChange={setDetailsTabValue}
          readOnly={readOnly}
          onUpdate={handleDialogClose}
        />
      )}
      
      {/* Dialog per le versioni */}
      {selectedAttachment && dialogOpen && dialogType === 'versions' && (
        <ItemAttachmentVersions
          open={dialogOpen}
          attachment={selectedAttachment}
          onClose={handleDialogClose}
          readOnly={readOnly}
        />
      )}
      
      {/* Dialog per la condivisione */}
      {selectedAttachment && dialogOpen && dialogType === 'sharing' && (
        <ItemAttachmentSharing
          open={dialogOpen}
          attachment={selectedAttachment}
          onClose={handleDialogClose}
          readOnly={readOnly}
        />
      )}
      
      {/* Dialog per le categorie */}
      {selectedAttachment && dialogOpen && dialogType === 'categories' && (
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