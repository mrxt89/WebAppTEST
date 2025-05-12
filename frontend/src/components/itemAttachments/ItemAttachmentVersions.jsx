// Frontend/src/components/itemAttachments/ItemAttachmentVersions.js
import React, { useState, useEffect, useRef } from 'react';
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
  Grid
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  History as HistoryIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Restore as RestoreIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import useItemAttachmentsActions from '../../hooks/useItemAttachmentsActions';
import { formatBytes } from '../../lib/common';

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
  inline = false
}) {
  // Stati
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [changeNotes, setChangeNotes] = useState('');
  
  // Ref per input file
  const fileInputRef = useRef(null);
  
  // Hook per le azioni sugli allegati
  const {
    getAttachmentVersions,
    addAttachmentVersion,
    downloadAttachment
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
        console.error('Error loading attachment versions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if ((open || inline) && attachment) {
      loadVersions();
    }
  }, [attachment, open, inline, getAttachmentVersions]);
  
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
        changeNotes
      );
      
      // Aggiorna la lista delle versioni
      const result = await getAttachmentVersions(attachment.AttachmentID);
      setVersions(result || []);
      
      // Reset del form
      setSelectedFile(null);
      setChangeNotes('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading new version:', error);
    } finally {
      setUploading(false);
    }
  };
  
  // Gestione download versione
  const handleDownloadVersion = (version) => {
    downloadAttachment(version.AttachmentID, version.FileName);
  };
  
  // Render del form per nuova versione
  const renderUploadForm = () => (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 2, 
        mb: 2, 
        border: '1px solid', 
        borderColor: 'divider',
        borderRadius: 1
      }}
    >
      <Typography variant="subtitle1" gutterBottom>
        Carica una nuova versione
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              mb: 2
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
                style={{ display: 'none' }}
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
            value={changeNotes}
            onChange={(e) => setChangeNotes(e.target.value)}
            disabled={uploading || !selectedFile}
            placeholder="Descrivi le modifiche in questa versione"
            multiline
            rows={2}
          />
        </Grid>
        
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<UploadIcon />}
            onClick={handleUploadVersion}
            disabled={uploading || !selectedFile}
          >
            {uploading ? 'Caricamento...' : 'Carica versione'}
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
  
  // Render della lista versioni
  const renderVersionsList = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
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
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider'
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
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <List disablePadding>
          {versions.map((version, index) => (
            <React.Fragment key={version.VersionID}>
              <ListItem
                sx={{
                  backgroundColor: index === 0 ? 'action.hover' : 'background.paper',
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ListItemIcon>
                  <HistoryIcon color={index === 0 ? 'primary' : 'action'} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="subtitle2">
                        {index === 0 ? 'Versione corrente' : `Versione ${versions.length - index}`}
                      </Typography>
                      {index === 0 && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            ml: 1, 
                            bgcolor: 'primary.main', 
                            color: 'primary.contrastText',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1
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
                        {format(new Date(version.UploadedAt), 'dd/MM/yyyy HH:mm', { locale: it })} • {formatBytes(version.FileSizeKB * 1024)}
                      </Typography>
                      <Typography variant="body2" component="div">
                        Da: {version.UploadedByFullName || version.UploadedByUsername}
                      </Typography>
                      {version.ChangeNotes && (
                        <Typography 
                          variant="body2" 
                          component="div"
                          sx={{ 
                            mt: 1, 
                            p: 1, 
                            bgcolor: 'background.default',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider'
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
                        // onClick={() => handleRestoreVersion(version)}
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
              {index < versions.length - 1 && (
                <Divider component="li" />
              )}
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
      
      <DialogContent>
        {content}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={uploading}>
          Chiudi
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ItemAttachmentVersions;