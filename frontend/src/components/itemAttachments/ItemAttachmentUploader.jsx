// Frontend/src/components/itemAttachments/ItemAttachmentUploader.js
import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  LinearProgress,
  Paper,
  Chip,
  IconButton,
  Grid,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  Autocomplete,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  AttachFile as AttachFileIcon,
  Clear as ClearIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import FileDropZone from '../ui/FileDropZone';
import useItemAttachmentsActions from '../../hooks/useItemAttachmentsActions';
import { formatBytes } from '../../lib/common';
import { useAuth } from '../../context/AuthContext';

/**
 * ItemAttachmentUploader - Componente per il caricamento di allegati per articoli
 * 
 * @param {boolean} open - Flag per mostrare/nascondere il dialog
 * @param {function} onClose - Callback per la chiusura del dialog
 * @param {string} itemCode - Codice articolo (per articoli da ERP)
 * @param {number} projectItemId - ID dell'articolo progetto (per articoli temporanei)
 * @param {function} onUploadComplete - Callback per il completamento del caricamento
 * @param {Array} categories - Lista delle categorie disponibili
 */
function ItemAttachmentUploader({ 
  open, 
  onClose, 
  itemCode = null, 
  projectItemId = null,
  onUploadComplete,
  categories = []
}) {
  // Auth context per ottenere l'utente corrente
  const auth = useAuth();
  
  // Stati per il form
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isErpAttachment, setIsErpAttachment] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  
  // Stati per il caricamento
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Hook per le azioni sugli allegati
  const { 
    uploadAttachmentByItemCode, 
    uploadAttachmentByProjectItemId,
    loading 
  } = useItemAttachmentsActions();

  // Gestione selezione file
  const handleFileSelect = (file) => {
    if (file) {
      setSelectedFile(file);
    }
  };

  // Gestione caricamento file
  const handleFileUpload = async () => {
    if (!selectedFile) {
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Prepara i metadati
      const metadata = {
        description: description || null,
        isPublic: isPublic.toString(),
        isErpAttachment: isErpAttachment.toString(),
        tags: tags.length > 0 ? tags.join(', ') : null,
        categoryIds: selectedCategories.map(cat => cat.CategoryID || cat).join(',')
      };
      
      console.log("Uploading file with metadata:", metadata);
      
      let result;
      
      // Simula la progress bar
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);
      
      // Carica l'allegato in base al tipo di articolo
      if (itemCode) {
        result = await uploadAttachmentByItemCode(
          itemCode,
          selectedFile,
          metadata
        );
      } else if (projectItemId) {
        result = await uploadAttachmentByProjectItemId(
          projectItemId,
          selectedFile,
          metadata
        );
      }
      
      // Completa la progress bar
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Notifica il completamento
      if (onUploadComplete) {
        onUploadComplete(result);
      }
      
      // Reset del form
      resetForm();
    } catch (error) {
      console.error('Error uploading file:', error);
      
      // Mostra notifica di errore
      if (window.swal && window.swal.fire) {
        window.swal.fire({
          title: 'Errore',
          text: 'Si è verificato un errore durante il caricamento',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    } finally {
      setIsUploading(false);
    }
  };
  
  // Gestione tag
  const handleTagInputChange = (event) => {
    setTagInput(event.target.value);
  };
  
  const handleTagInputKeyDown = (event) => {
    if (event.key === 'Enter' && tagInput.trim()) {
      event.preventDefault();
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };
  
  const handleTagDelete = (tagToDelete) => {
    setTags(tags.filter(tag => tag !== tagToDelete));
  };
  
  // Reset del form
  const resetForm = () => {
    setSelectedFile(null);
    setDescription('');
    setIsPublic(false);
    setIsErpAttachment(false);
    setTags([]);
    setTagInput('');
    setSelectedCategories([]);
    setUploadProgress(0);
  };
  
  // Gestione chiusura
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  // Funzione per renderizzare la preview del file
  const renderFilePreview = () => {
    if (!selectedFile) {
      return (
        <FileDropZone
          onFilesSelected={handleFileSelect}
          disabled={isUploading}
          acceptedFileTypes={[
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/*',
            'text/plain',
            'text/csv',
            '.dxf',
            '.dwg',
            '.step',
            '.stp',
            '.iges',
            '.igs',
            '.stl'
          ]}
          sx={{
            height: 200,
            mb: 3
          }}
        />
      );
    }
    
    const isImage = selectedFile.type.startsWith('image/');
    
    return (
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          mb: 3,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isImage ? (
            <Box 
              component="img" 
              src={URL.createObjectURL(selectedFile)} 
              alt="Preview" 
              sx={{ 
                width: 60, 
                height: 60, 
                borderRadius: 1, 
                mr: 2,
                objectFit: 'cover'
              }} 
            />
          ) : (
            <DescriptionIcon sx={{ fontSize: 50, mr: 2, color: 'primary.main' }} />
          )}
          <Box>
            <Typography variant="subtitle1" noWrap>
              {selectedFile.name}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {formatBytes(selectedFile.size)}
            </Typography>
          </Box>
        </Box>
        <IconButton 
          size="small" 
          onClick={() => setSelectedFile(null)}
          disabled={isUploading}
          color="error"
        >
          <ClearIcon fontSize="small" />
        </IconButton>
      </Paper>
    );
  };
  
  // Render delle categorie
  const renderCategories = () => {
    if (categories.length === 0) {
      return (
        <Typography variant="body2" color="textSecondary">
          Non ci sono categorie disponibili
        </Typography>
      );
    }
    
    return (
      <FormControl fullWidth>
        <InputLabel id="categories-label">Categorie</InputLabel>
        <Select
          labelId="categories-label"
          multiple
          value={selectedCategories}
          onChange={(e) => setSelectedCategories(e.target.value)}
          disabled={isUploading}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((category) => (
                <Chip 
                  key={category.CategoryID || category} 
                  label={category.CategoryName || categories.find(c => c.CategoryID === category)?.CategoryName || category} 
                  size="small" 
                />
              ))}
            </Box>
          )}
        >
          {categories.map((category) => (
            <MenuItem key={category.CategoryID} value={category}>
              {category.CategoryName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={isUploading ? null : handleClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          height: '90vh',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Carica un nuovo allegato
            {itemCode && <Typography component="span" variant="subtitle1" sx={{ ml: 1 }}>
              per l'articolo {itemCode}
            </Typography>}
            {projectItemId && <Typography component="span" variant="subtitle1" sx={{ ml: 1 }}>
              per l'articolo progetto #{projectItemId}
            </Typography>}
          </Typography>
          {!isUploading && (
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ flex: 1, overflowY: 'auto' }}>
        <Box sx={{ pt: 1 }}>
          {/* File upload area */}
          {renderFilePreview()}
          
          {/* Progress bar */}
          {isUploading && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Caricamento in corso...
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress} 
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="body2" align="right" sx={{ mt: 0.5 }}>
                {uploadProgress}%
              </Typography>
            </Box>
          )}
          
          {/* Metadata form */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>Informazioni generali</Typography>
                
                <TextField
                  label="Descrizione"
                  fullWidth
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isUploading}
                  multiline
                  rows={3}
                  placeholder="Aggiungi una descrizione opzionale per questo allegato"
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  label="Tag"
                  fullWidth
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagInputKeyDown}
                  disabled={isUploading}
                  placeholder="Digita un tag e premi Enter per aggiungerlo"
                  helperText="I tag aiutano a categorizzare e trovare più facilmente gli allegati"
                  sx={{ mb: 2 }}
                />
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 3 }}>
                  {tags.map((tag, index) => (
                    <Chip 
                      key={index} 
                      label={tag} 
                      onDelete={() => handleTagDelete(tag)}
                      disabled={isUploading}
                      size="small"
                    />
                  ))}
                </Box>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      disabled={isUploading}
                    />
                  }
                  label="Allegato pubblico (visibile a tutte le aziende)"
                  sx={{ mb: 1, display: 'block' }}
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={isErpAttachment}
                      onChange={(e) => setIsErpAttachment(e.target.checked)}
                      disabled={isUploading}
                    />
                  }
                  label="Allegato da gestionale (ERP)"
                  sx={{ display: 'block' }}
                />
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>Categorie</Typography>
                {renderCategories()}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ 
        borderTop: '1px solid',
        borderColor: 'divider',
        padding: 2
      }}>
        <Button 
          onClick={handleClose} 
          disabled={isUploading}
        >
          Annulla
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleFileUpload}
          disabled={!selectedFile || isUploading}
          startIcon={isUploading ? <CircularProgress size={16} /> : <UploadIcon />}
        >
          {isUploading ? 'Caricamento in corso...' : 'Carica allegato'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ItemAttachmentUploader;