// Frontend/src/components/ui/FileDropZone.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { 
  CloudUpload as UploadIcon,
  FilePresent as FileIcon 
} from '@mui/icons-material';

/**
 * Componente per il caricamento di file tramite drag and drop
 * 
 * @param {Function} onFilesSelected - Callback quando i file vengono selezionati
 * @param {boolean} disabled - Flag per disabilitare il componente
 * @param {boolean} multiple - Flag per permettere la selezione di più file
 * @param {string[]} acceptedFileTypes - Array di tipi MIME accettati
 * @param {ReactNode} children - Contenuto aggiuntivo da mostrare dentro il dropzone
 * @param {number} maxSize - Dimensione massima in bytes (default: 50MB)
 */
const FileDropZone = ({ 
  onFilesSelected,
  disabled = false,
  multiple = false,
  acceptedFileTypes = [],
  children,
  maxSize = 50 * 1024 * 1024, // 50MB default
  ...props 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  
  // Gestione drag enter
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    setDragCounter(prev => prev + 1);
    setIsDragging(true);
  };
  
  // Gestione drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    e.dataTransfer.dropEffect = 'copy';
  };
  
  // Gestione drag leave
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    setDragCounter(prev => prev - 1);
    
    if (dragCounter <= 1) {
      setDragCounter(0);
      setIsDragging(false);
    }
  };
  
  // Gestione drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(0);
    setIsDragging(false);
    
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };
  
  // Gestione click
  const handleClick = () => {
    if (disabled) return;
    
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Gestione cambio input file
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };
  
  // Gestione validazione e output dei file
  const handleFiles = (files) => {
    const validFiles = Array.from(files).filter(file => {
      // Verifica dimensione
      if (file.size > maxSize) {
        console.warn(`File "${file.name}" troppo grande (${file.size} bytes). Dimensione massima: ${maxSize} bytes.`);
        return false;
      }
      
      // Verifica tipo MIME se specificato
      if (acceptedFileTypes.length > 0) {
        const fileType = file.type.toLowerCase();
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        // Verifica sia per tipo MIME che per estensione
        const isAccepted = acceptedFileTypes.some(type => {
          // Supporto per wildcard (e.g., "image/*")
          if (type.endsWith('/*')) {
            const category = type.split('/')[0];
            return fileType.startsWith(`${category}/`);
          }
          
          // Verifica estensione (e.g., ".pdf")
          if (type.startsWith('.')) {
            return `.${fileExtension}` === type.toLowerCase();
          }
          
          // Verifica tipo MIME esatto
          return fileType === type.toLowerCase();
        });
        
        if (!isAccepted) {
          console.warn(`Tipo di file "${file.type}" non accettato per "${file.name}"`);
          return false;
        }
      }
      
      return true;
    });
    
    if (validFiles.length > 0) {
      // Chiamata callback con i file validi
      onFilesSelected(multiple ? validFiles : validFiles[0]);
      
      // Reset input file per permettere di selezionare lo stesso file più volte
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Registrazione eventi drag and drop
  useEffect(() => {
    const currentDropZone = dropZoneRef.current;
    
    if (currentDropZone) {
      currentDropZone.addEventListener('dragenter', handleDragEnter);
      currentDropZone.addEventListener('dragover', handleDragOver);
      currentDropZone.addEventListener('dragleave', handleDragLeave);
      currentDropZone.addEventListener('drop', handleDrop);
    }
    
    return () => {
      if (currentDropZone) {
        currentDropZone.removeEventListener('dragenter', handleDragEnter);
        currentDropZone.removeEventListener('dragover', handleDragOver);
        currentDropZone.removeEventListener('dragleave', handleDragLeave);
        currentDropZone.removeEventListener('drop', handleDrop);
      }
    };
  }, [disabled, dragCounter]);
  
  return (
    <Paper
      ref={dropZoneRef}
      onClick={handleClick}
      sx={{
        position: 'relative',
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 1,
        border: '2px dashed',
        borderColor: isDragging ? 'primary.main' : 'divider',
        backgroundColor: isDragging ? 'action.hover' : 'background.paper',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          backgroundColor: disabled ? 'background.paper' : 'action.hover',
          borderColor: disabled ? 'divider' : 'primary.main'
        },
        ...props.sx
      }}
      {...props}
    >
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        multiple={multiple}
        accept={acceptedFileTypes.join(',')}
        onChange={handleFileInputChange}
        disabled={disabled}
      />
      
      {/* Overlay durante drag */}
      {isDragging && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(25, 118, 210, 0.05)',
            zIndex: 10,
            borderRadius: 1
          }}
        >
          <UploadIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" color="primary">
            Rilascia per caricare
          </Typography>
        </Box>
      )}
      
      {/* Contenuto predefinito */}
      {!children && (
        <>
          {isDragging ? null : (
            <>
              <UploadIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6" align="center" gutterBottom>
                Trascina i file qui o clicca per selezionare
              </Typography>
              <Typography variant="body2" color="textSecondary" align="center">
                {multiple ? 'È possibile caricare più file contemporaneamente' : 'È possibile caricare un solo file'}
              </Typography>
              {acceptedFileTypes.length > 0 && (
                <Typography variant="caption" color="textSecondary" align="center" sx={{ mt: 1 }}>
                  Tipi di file accettati: {acceptedFileTypes.join(', ')}
                </Typography>
              )}
            </>
          )}
        </>
      )}
      
      {/* Contenuto personalizzato */}
      {children && !isDragging && children}
    </Paper>
  );
};

export default FileDropZone;