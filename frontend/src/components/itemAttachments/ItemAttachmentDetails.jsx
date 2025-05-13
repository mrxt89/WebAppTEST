// Frontend/src/components/itemAttachments/ItemAttachmentDetails.js
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Tabs,
  Tab,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
  Grid,
  IconButton,
  Divider,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Tooltip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Label as LabelIcon,
  Share as ShareIcon,
  AccountCircle as UserIcon,
  Business as CompanyIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import useItemAttachmentsActions from '../../hooks/useItemAttachmentsActions';
import { formatBytes } from '../../lib/common';
import ItemAttachmentVersions from './ItemAttachmentVersions';
import ItemAttachmentSharing from './ItemAttachmentSharing';
import ItemAttachmentCategories from './ItemAttachmentCategories';
import FileViewer from '../ui/fileViewer';
import { useAuth } from '../../context/AuthContext';

/**
 * ItemAttachmentDetails - Componente per visualizzare e modificare i dettagli di un allegato
 * 
 * @param {boolean} open - Flag per mostrare/nascondere il dialog
 * @param {object} attachment - L'allegato da visualizzare
 * @param {function} onClose - Callback per la chiusura del dialog
 * @param {number} tabValue - Indice della tab da mostrare (0: Visualizza, 1: Modifica)
 * @param {function} onTabChange - Callback per il cambio di tab
 * @param {boolean} readOnly - Flag per la modalità di sola lettura
 * @param {function} onUpdate - Callback per l'aggiornamento dell'allegato
 */
function ItemAttachmentDetails({
  open,
  attachment,
  onClose,
  tabValue = 0,
  onTabChange,
  readOnly = false,
  onUpdate
}) {
  // Auth context per ottenere l'utente corrente
  const auth = useAuth();
  
  // Stati per il form di modifica
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isErpAttachment, setIsErpAttachment] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Stato per le tabs interne (versioni, condivisione, categorie)
  const [innerTab, setInnerTab] = useState('overview');
  
  // Stati per la gestione delle condivisioni
  const [sharing, setSharing] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [accessLevel, setAccessLevel] = useState('read');
  const [sharingLoading, setSharingLoading] = useState(false);
  
  // Stato per verificare se l'utente può modificare l'allegato
  const [canEdit, setCanEdit] = useState(false);
  
  // Hook per le azioni sugli allegati
  const {
    downloadAttachment,
    updateAttachment,
    getAttachmentSharing,
    shareAttachment,
    unshareAttachment,
    loading
  } = useItemAttachmentsActions();
  
  // Verifica se l'utente può modificare l'allegato
  useEffect(() => {
    if (attachment && auth.user) {
      const userCompanyId = auth.user.CompanyId;
      // L'utente può modificare se appartiene all'azienda proprietaria
      const hasEditPermission = !readOnly && userCompanyId === attachment.OwnerCompanyId;
      setCanEdit(hasEditPermission);
      
      // Se l'utente non può modificare ma il tab è impostato per modifica, forzare il ritorno a visualizzazione
      if (!hasEditPermission && tabValue === 1 && onTabChange) {
        onTabChange(0);
      }
    }
  }, [attachment, readOnly, auth.user, tabValue, onTabChange]);
  
  // Aggiorna i campi del form quando cambia l'allegato
  useEffect(() => {
    if (attachment) {
      setDescription(attachment.Description || '');
      setIsPublic(attachment.IsPublic || false);
      setIsVisible(attachment.IsVisible !== false); // di default è true a meno che non sia esplicitamente false
      setIsErpAttachment(attachment.IsErpAttachment || false);
      setTags(attachment.Tags ? attachment.Tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []);
      
      // Carica le condivisioni e le aziende 
      if (innerTab === 'sharing' || tabValue === 1) {
        loadSharingInfo();
      }
    }
  }, [attachment, innerTab, tabValue]);
  
  // Carica le informazioni sulla condivisione
  const loadSharingInfo = async () => {
    if (!attachment || !attachment.AttachmentID) return;
    
    try {
      setSharingLoading(true);
      
      // Carica le condivisioni attuali
      const sharingData = await getAttachmentSharing(attachment.AttachmentID);
      setSharing(sharingData || []);
      
      // Mock per le aziende disponibili - in un'implementazione reale dovrebbe essere una API
      // In produzione sostituire con una vera chiamata API per ottenere le aziende
      setCompanies([
        { CompanyId: 1, Description: 'Ricos' },
        { CompanyId: 2, Description: 'CBL' },
        { CompanyId: 3, Description: 'Tecnoline' }
      ]);
    } catch (error) {
      console.error('Error loading sharing info:', error);
    } finally {
      setSharingLoading(false);
    }
  };
  
  // Gestione cambio tab principale
  const handleTabChange = (event, newValue) => {
    if (onTabChange) {
      onTabChange(newValue);
    }
  };
  
  // Gestione cambio tab interna
  const handleInnerTabChange = (tab) => {
    setInnerTab(tab);
    
    // Carica le condivisioni quando si passa alla tab condivisioni
    if (tab === 'sharing') {
      loadSharingInfo();
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
  
  // Gestione download
  const handleDownload = () => {
    downloadAttachment(attachment.AttachmentID, attachment.FileName);
  };
  
  // Gestione condivisione con una nuova azienda
  const handleShare = async () => {
    if (!selectedCompany) return;
    
    try {
      setSharingLoading(true);
      await shareAttachment(
        attachment.AttachmentID,
        parseInt(selectedCompany),
        accessLevel
      );
      
      // Aggiorna la lista delle condivisioni
      const result = await getAttachmentSharing(attachment.AttachmentID);
      setSharing(result || []);
      
      // Reset del form
      setSelectedCompany('');
      setAccessLevel('read');
    } catch (error) {
      console.error('Error sharing attachment:', error);
    } finally {
      setSharingLoading(false);
    }
  };
  
  // Gestione rimozione condivisione
  const handleUnshare = async (targetCompanyId) => {
    try {
      setSharingLoading(true);
      await unshareAttachment(
        attachment.AttachmentID,
        targetCompanyId
      );
      
      // Aggiorna la lista delle condivisioni
      const result = await getAttachmentSharing(attachment.AttachmentID);
      setSharing(result || []);
    } catch (error) {
      console.error('Error unsharing attachment:', error);
    } finally {
      setSharingLoading(false);
    }
  };
  
  // Gestione salvataggio modifiche
  const handleSave = async () => {
    if (!canEdit || loading) return;
    
    try {
      const result = await updateAttachment(
        attachment.AttachmentID,
        {
          description,
          isPublic,
          isVisible,
          isErpAttachment,
          tags: tags.length > 0 ? tags.join(', ') : null // Usiamo null invece di stringa vuota
        }
      );
      
      // Mostra notifica di successo
      if (window.swal && window.swal.fire) {
        window.swal.fire({
          title: 'Salvato!',
          text: 'Le modifiche sono state salvate con successo',
          icon: 'success',
          confirmButtonText: 'OK'
        });
      }
      
      if (onUpdate) {
        onUpdate(result);
      }
    } catch (error) {
      console.error('Error updating attachment:', error);
      
      // Mostra notifica di errore
      if (window.swal && window.swal.fire) {
        window.swal.fire({
          title: 'Errore',
          text: 'Si è verificato un errore durante il salvataggio',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    }
  };

  // Apre la preview del file
  const handleViewFile = () => {
    setIsPreviewOpen(true);
  };
  
  // Ottieni l'icona per il livello di accesso
  const getAccessLevelIcon = (level) => {
    switch (level) {
      case 'read':
        return <ViewIcon fontSize="small" />;
      case 'download':
        return <DownloadIcon fontSize="small" />;
      case 'manage':
        return <EditIcon fontSize="small" />;
      default:
        return <ViewIcon fontSize="small" />;
    }
  };
  
  // Ottieni la descrizione per il livello di accesso
  const getAccessLevelName = (level) => {
    switch (level) {
      case 'read':
        return 'Sola lettura';
      case 'download':
        return 'Download';
      case 'manage':
        return 'Gestione completa';
      default:
        return 'Sconosciuto';
    }
  };
  
  // Gestione preview del file
  const renderFilePreview = () => {
    if (!attachment) return null;
    
    const isImage = attachment.FileType && attachment.FileType.startsWith('image/');
    const isPdf = attachment.FileType === 'application/pdf';
    
    if (isImage) {
      return (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            mb: 2
          }}
        >
          <img 
            src={`/api/item-attachments/${attachment.AttachmentID}/download`} 
            alt={attachment.FileName}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '300px', 
              objectFit: 'contain',
              cursor: 'pointer'
            }}
            onClick={handleViewFile}
          />
        </Box>
      );
    }
    
    // Per altri tipi di file
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          mb: 2,
          minHeight: 200
        }}
      >
        <Typography variant="body1" color="textSecondary" align="center">
          {isPdf ? "Anteprima PDF non disponibile" : "Anteprima non disponibile per questo tipo di file"}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button 
            startIcon={<ViewIcon />}
            onClick={handleViewFile}
          >
            Visualizza
          </Button>
          <Button 
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
          >
            Scarica file
          </Button>
        </Box>
      </Box>
    );
  };
  
  // Render delle informazioni dell'allegato
  const renderAttachmentInfo = () => {
    if (!attachment) return null;
    
    // Messaggio di avviso se l'allegato non è visibile
    const visibilityWarning = !attachment.IsVisible && (
      <Alert severity="warning" sx={{ mb: 2 }}>
        Questo allegato è stato contrassegnato come non visibile (soft delete)
      </Alert>
    );
    
    return (
      <>
        {visibilityWarning}
        <List disablePadding>
          <ListItem>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Nome file" 
              secondary={attachment.FileName} 
            />
          </ListItem>
          <Divider component="li" />
          <ListItem>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Tipo file" 
              secondary={attachment.FileType || 'Sconosciuto'} 
            />
          </ListItem>
          <Divider component="li" />
          <ListItem>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Dimensione" 
              secondary={formatBytes(attachment.FileSizeKB * 1024)} 
            />
          </ListItem>
          <Divider component="li" />
          <ListItem>
            <ListItemIcon>
              <UserIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Caricato da" 
              secondary={attachment.UploadedByFullName || attachment.UploadedByUsername} 
            />
          </ListItem>
          <Divider component="li" />
          <ListItem>
            <ListItemIcon>
              <CompanyIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Azienda proprietaria" 
              secondary={attachment.OwnerCompanyName} 
            />
          </ListItem>
          <Divider component="li" />
          <ListItem>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Data caricamento" 
              secondary={format(new Date(attachment.UploadedAt), 'dd/MM/yyyy HH:mm', { locale: it })} 
            />
          </ListItem>
          <Divider component="li" />
          <ListItem>
            <ListItemIcon>
              {attachment.IsPublic ? <PublicIcon color="primary" /> : <LockIcon />}
            </ListItemIcon>
            <ListItemText 
              primary="Visibilità" 
              secondary={attachment.IsPublic ? 'Pubblico (visibile a tutte le aziende)' : 'Privato (visibile solo all\'azienda proprietaria)'} 
            />
          </ListItem>
          <Divider component="li" />
          <ListItem>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Origine" 
              secondary={attachment.IsErpAttachment ? 'Da gestionale (ERP)' : 'Caricato manualmente'} 
            />
          </ListItem>
          <Divider component="li" />
          <ListItem>
            <ListItemIcon>
              {attachment.IsVisible ? <ViewIcon /> : <HideIcon color="error" />}
            </ListItemIcon>
            <ListItemText 
              primary="Stato" 
              secondary={attachment.IsVisible ? 'Visibile' : 'Nascosto (soft delete)'} 
            />
          </ListItem>
          {attachment.Description && (
            <>
              <Divider component="li" />
              <ListItem>
                <ListItemIcon>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Descrizione" 
                  secondary={attachment.Description} 
                />
              </ListItem>
            </>
          )}
        </List>
      </>
    );
  };
  
  // Render del form per condivisione
  const renderSharingForm = () => {
    // Filtra le aziende già condivise e l'azienda proprietaria
    const availableCompanies = companies.filter(company => {
      const isOwner = company.CompanyId === attachment.OwnerCompanyId;
      const isShared = sharing.some(s => s.TargetCompanyId === company.CompanyId);
      return !isOwner && !isShared;
    });
    
    if (availableCompanies.length === 0) {
      return (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            mb: 2, 
            border: '1px solid', 
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.default'
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
          border: '1px solid', 
          borderColor: 'divider',
          borderRadius: 1
        }}
      >
        <Typography variant="subtitle1" gutterBottom>
          Condividi con un'altra azienda
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} width={'50%'}>
            <FormControl fullWidth>
              <InputLabel id="company-select-label">Azienda</InputLabel>
              <Select
                labelId="company-select-label"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                label="Azienda"
                disabled={sharingLoading}
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
              <InputLabel id="access-level-label">Livello di accesso</InputLabel>
              <Select
                labelId="access-level-label"
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value)}
                label="Livello di accesso"
                disabled={sharingLoading}
              >
                <MenuItem value="read">Sola lettura</MenuItem>
                <MenuItem value="download">Download</MenuItem>
                <MenuItem value="manage">Gestione completa</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<ShareIcon />}
              onClick={handleShare}
              disabled={sharingLoading || !selectedCompany}
            >
              {sharingLoading ? 'Condivisione...' : 'Condividi'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    );
  };
  
  // Render della lista delle condivisioni
  const renderSharingList = () => {
    if (sharingLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
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
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <List disablePadding>
          {sharing.map((share, index) => (
            <React.Fragment key={share.SharingID}>
              <ListItem
                sx={{
                  '&:hover': { backgroundColor: 'action.hover' }
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
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        {getAccessLevelIcon(share.AccessLevel)}
                        <Typography variant="body2" sx={{ ml: 0.5 }}>
                          {getAccessLevelName(share.AccessLevel)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" component="div">
                        Condiviso da: {share.SharedByFullName || share.SharedByUsername}
                      </Typography>
                      <Typography variant="body2" component="div">
                        Data: {format(new Date(share.SharedAt), 'dd/MM/yyyy HH:mm', { locale: it })}
                      </Typography>
                    </React.Fragment>
                  }
                />
                {canEdit && (
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
              {index < sharing.length - 1 && (
                <Divider component="li" />
              )}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    );
  };
  
  // Rendering delle condivisioni
  const renderSharingSection = () => {
    // Se l'allegato è pubblico, mostra un messaggio
    const isPublicMessage = attachment?.IsPublic && (
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          mb: 2, 
          border: '1px solid', 
          borderColor: 'success.light',
          borderRadius: 1,
          bgcolor: 'success.light',
          color: 'success.contrastText'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <InfoIcon sx={{ mr: 1 }} />
          <Typography>
            Questo allegato è contrassegnato come <strong>pubblico</strong>, quindi è visibile a tutte le aziende indipendentemente dalle condivisioni specifiche.
          </Typography>
        </Box>
      </Paper>
    );
    
    return (
      <Box>
        {isPublicMessage}
        
        {canEdit && renderSharingForm()}
        
        <Typography variant="subtitle1" gutterBottom>
          Condivisioni attuali
        </Typography>
        
        {renderSharingList()}
      </Box>
    );
  };
  
  // Contenuto della tab di visualizzazione
  const renderViewTab = () => (
    <Box>
      {renderFilePreview()}
      
      <Box sx={{ display: 'flex', mb: 2 }}>
        <Button
          variant={innerTab === 'overview' ? 'contained' : 'outlined'}
          onClick={() => handleInnerTabChange('overview')}
          size="small"
          sx={{ mr: 1 }}
        >
          Panoramica
        </Button>
        
        <Button
          variant={innerTab === 'versions' ? 'contained' : 'outlined'}
          onClick={() => handleInnerTabChange('versions')}
          size="small"
          sx={{ mr: 1 }}
          startIcon={<HistoryIcon />}
        >
          Versioni
        </Button>
        
        <Button
          variant={innerTab === 'sharing' ? 'contained' : 'outlined'}
          onClick={() => handleInnerTabChange('sharing')}
          size="small"
          sx={{ mr: 1 }}
          startIcon={<ShareIcon />}
        >
          Condivisioni
        </Button>
        
        <Button
          variant={innerTab === 'categories' ? 'contained' : 'outlined'}
          onClick={() => handleInnerTabChange('categories')}
          size="small"
          startIcon={<LabelIcon />}
        >
          Categorie
        </Button>
      </Box>
      
      {innerTab === 'overview' && (
        <Paper elevation={0} sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          {renderAttachmentInfo()}
        </Paper>
      )}
      
      {innerTab === 'versions' && (
        <ItemAttachmentVersions
          attachment={attachment}
          inline={true}
          readOnly={!canEdit}
        />
      )}
      
      {innerTab === 'sharing' && renderSharingSection()}
      
      {innerTab === 'categories' && (
        <ItemAttachmentCategories
          attachment={attachment}
          inline={true}
          readOnly={!canEdit}
        />
      )}
      
      {/* Tag */}
      {attachment.Tags && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Tag
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {attachment.Tags.split(',').map((tag, index) => (
              <Chip 
                key={index} 
                label={tag.trim()} 
                size="small" 
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
  
  // Contenuto della tab di modifica
  const renderEditTab = () => (
    <Box>
      {/* Messaggio se l'utente non ha i permessi */}
      {!canEdit && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Non hai i permessi per modificare questo allegato. Solo gli utenti dell'azienda proprietaria possono modificarlo.
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>Informazioni generali</Typography>
            
            <TextField
              label="Descrizione"
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
              disabled={loading || !canEdit}
              placeholder="Aggiungi una descrizione opzionale per questo allegato"
              sx={{ mb: 2 }}
            />
            
            <TextField
              label="Tag"
              fullWidth
              value={tagInput}
              onChange={handleTagInputChange}
              onKeyDown={handleTagInputKeyDown}
              disabled={loading || !canEdit}
              placeholder="Digita un tag e premi Enter per aggiungerlo"
              helperText="I tag aiutano a categorizzare e trovare più facilmente gli allegati"
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
              {tags.map((tag, index) => (
                <Chip 
                  key={index} 
                  label={tag} 
                  onDelete={canEdit ? () => handleTagDelete(tag) : undefined}
                  disabled={loading || !canEdit}
                  size="small"
                />
              ))}
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  disabled={loading || !canEdit}
                />
              }
              label="Allegato pubblico (visibile a tutte le aziende)"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={isVisible}
                  onChange={(e) => setIsVisible(e.target.checked)}
                  disabled={loading || !canEdit}
                />
              }
              label="Allegato visibile"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={isErpAttachment}
                  onChange={(e) => setIsErpAttachment(e.target.checked)}
                  disabled={loading || !canEdit}
                />
              }
              label="Allegato da gestionale (ERP)"
            />
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6} className="w-100">
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>Condivisione con altre aziende</Typography>
            
            {renderSharingSection()}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
  
  return (
    <>
      <Dialog 
        open={open} 
        onClose={loading ? null : onClose}
        maxWidth=""
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            height: '100vh',
            maxHeight: '100vh',
            width: '60%',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" noWrap>
              {tabValue === 0 ? 'Dettagli allegato' : 'Modifica allegato'}: {attachment?.FileName}
            </Typography>
            <IconButton size="small" onClick={onClose} disabled={loading}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="attachment details tabs"
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<ViewIcon />} iconPosition="start" label="Visualizza" />
          {canEdit && <Tab icon={<EditIcon />} iconPosition="start" label="Modifica" />}
        </Tabs>
        
        <DialogContent sx={{ 
          flex: 1, 
          overflowY: 'auto',
          padding: 2
        }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ pt: 2 }}>
              {tabValue === 0 && renderViewTab()}
              {tabValue === 1 && renderEditTab()}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ 
          borderTop: '1px solid',
          borderColor: 'divider',
          padding: 2
        }}>
          {tabValue === 0 ? (
            <>
              <Button 
                onClick={handleDownload}
                startIcon={<DownloadIcon />}
              >
                Scarica
              </Button>
              <Button 
                onClick={onClose}
              >
                Chiudi
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={onClose}
                disabled={loading}
              >
                Annulla
              </Button>
              {canEdit && (
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleSave}
                  disabled={loading}
                  startIcon={<SaveIcon />}
                >
                  Salva modifiche
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Componente FileViewer per la visualizzazione completa del file */}
      {isPreviewOpen && attachment && (
        <FileViewer
          file={{
            AttachmentID: attachment.AttachmentID,
            FileName: attachment.FileName,
            FileType: attachment.FileType,
            FilePath: attachment.FilePath
          }}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </>
  );
}

export default ItemAttachmentDetails;