// Frontend/src/components/ui/FileDropZone.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Box, Typography, Paper } from "@mui/material";
import {
  CloudUpload as UploadIcon,
  FilePresent as FileIcon,
} from "@mui/icons-material";

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

/**
* Componente per il caricamento di file tramite drag and drop
*
* @param {Function} onFileSelect - Callback quando i file vengono selezionati
* @param {boolean} disabled - Flag per disabilitare il componente
* @param {boolean} multiple - Flag per permettere la selezione di più file
* @param {string[]} acceptedFileTypes - Array di tipi MIME accettati
* @param {ReactNode} children - Contenuto aggiuntivo da mostrare dentro il dropzone
 * @param {number} maxSize - Dimensione massima in bytes (default: 800MB)
*/
const FileDropZone = ({
  onFileSelect,
  disabled = false,
  multiple = false,
  acceptedFileTypes = [],
  children,
  maxSize = 800 * 1024 * 1024, // 800MB default (coerente con gli altri uploader)
  ...props
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Gestione validazione e output dei file (definito prima per essere usato in handleDrop)
  const handleFiles = useCallback((files) => {
    const validFiles = Array.from(files).filter((file) => {
      // Verifica dimensione
      if (file.size > maxSize) {
        console.warn(
          `File "${file.name}" troppo grande (${formatFileSize(file.size)}). Dimensione massima: ${formatFileSize(maxSize)}.`,
        );
        return false;
      }

      // Verifica tipo MIME se specificato
      if (acceptedFileTypes.length > 0) {
        const fileType = file.type.toLowerCase();
        const fileExtension = file.name.split(".").pop().toLowerCase();

        // Verifica sia per tipo MIME che per estensione
        const isAccepted = acceptedFileTypes.some((type) => {
          // Supporto per wildcard (e.g., "image/*")
          if (type.endsWith("/*")) {
            const category = type.split("/")[0];
            return fileType.startsWith(`${category}/`);
          }

          // Verifica estensione (e.g., ".pdf")
          if (type.startsWith(".")) {
            return `.${fileExtension}` === type.toLowerCase();
          }

          // Verifica tipo MIME esatto
          return fileType === type.toLowerCase();
        });

        if (!isAccepted) {
          console.warn(
            `Tipo di file "${file.type}" non accettato per "${file.name}"`,
          );
          return false;
        }
      }

      return true;
    });

    if (validFiles.length > 0) {
      // Chiamata callback con i file validi
      onFileSelect(multiple ? validFiles : validFiles[0]);

      // Reset input file per permettere di selezionare lo stesso file più volte
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [maxSize, acceptedFileTypes, multiple, onFileSelect]);

  // Gestione drag enter
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;
    
    // Verifica che sia un file drag
    if (!e.dataTransfer?.types?.includes('Files')) {
      return;
    }

    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  }, [disabled]);

  // Gestione drag over
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;
    
    // Verifica che sia un file drag
    if (!e.dataTransfer?.types?.includes('Files')) {
      return;
    }

    e.dataTransfer.dropEffect = "copy";
  }, [disabled]);

  // Gestione drag leave
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    // Controlla se stiamo uscendo effettivamente dal dropzone
    // (non solo passando su un elemento figlio)
    const currentTarget = e.currentTarget;
    const relatedTarget = e.relatedTarget;
    
    if (!currentTarget.contains(relatedTarget)) {
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    }
  }, [disabled]);

  // Reset dello stato quando il drag viene interrotto (es. ESC o uscita dalla finestra)
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      dragCounterRef.current = 0;
      setIsDragging(false);
    };

    // Aggiungi listener globale per il dragend
    document.addEventListener('dragend', handleGlobalDragEnd);
    
    // Aggiungi anche listener per quando si esce dalla finestra
    const handleVisibilityChange = () => {
      if (document.hidden) {
        dragCounterRef.current = 0;
        setIsDragging(false);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Gestione drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current = 0;
    setIsDragging(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [disabled, handleFiles]);

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

  // Registrazione eventi drag and drop
  useEffect(() => {
    const currentDropZone = dropZoneRef.current;

    if (currentDropZone && !disabled) {
      currentDropZone.addEventListener("dragenter", handleDragEnter, false);
      currentDropZone.addEventListener("dragover", handleDragOver, false);
      currentDropZone.addEventListener("dragleave", handleDragLeave, false);
      currentDropZone.addEventListener("drop", handleDrop, false);
    }

    return () => {
      if (currentDropZone) {
        currentDropZone.removeEventListener("dragenter", handleDragEnter, false);
        currentDropZone.removeEventListener("dragover", handleDragOver, false);
        currentDropZone.removeEventListener("dragleave", handleDragLeave, false);
        currentDropZone.removeEventListener("drop", handleDrop, false);
      }
    };
  }, [disabled, handleDragEnter, handleDragOver, handleDragLeave, handleDrop]);

  // Reset quando si clicca fuori dal dropzone durante un drag
  useEffect(() => {
    if (!isDragging) return;

    const handleClickOutside = (e) => {
      if (dropZoneRef.current && !dropZoneRef.current.contains(e.target)) {
        // Se c'è un drag in corso e si clicca fuori, resetta
        dragCounterRef.current = 0;
        setIsDragging(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape' && isDragging) {
        dragCounterRef.current = 0;
        setIsDragging(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDragging]);

  return (
    <Paper
      ref={dropZoneRef}
      onClick={handleClick}
      data-dropzone="true"
      sx={{
        position: "relative",
        p: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 1,
        border: "2px dashed",
        borderColor: isDragging ? "primary.main" : "divider",
        backgroundColor: isDragging ? "action.hover" : "background.paper",
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          backgroundColor: disabled ? "background.paper" : "action.hover",
          borderColor: disabled ? "divider" : "primary.main",
        },
        ...props.sx,
      }}
      {...props}
    >
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        multiple={multiple}
        accept={acceptedFileTypes.join(",")}
        onChange={handleFileInputChange}
        disabled={disabled}
      />

      {/* Overlay durante drag */}
      {isDragging && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(25, 118, 210, 0.05)",
            zIndex: 10,
            borderRadius: 1,
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
                {multiple
                  ? "È possibile caricare più file contemporaneamente"
                  : "È possibile caricare un solo file"}
              </Typography>
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
