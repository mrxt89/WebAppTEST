// Frontend/src/components/itemAttachments/ItemAttachmentUploader.js
import React, { useState, useRef, useEffect } from "react";
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
  Divider,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  AttachFile as AttachFileIcon,
  Clear as ClearIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import FileDropZone from "../ui/FileDropZone";
import useItemAttachmentsActions from "../../hooks/useItemAttachmentsActions";
import { formatBytes } from "../../lib/common";
import { useAuth } from "../../context/AuthContext";

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
  categories = [],
}) {
  // Auth context per ottenere l'utente corrente
  const auth = useAuth();

  // Stati per il form
  const [selectedFiles, setSelectedFiles] = useState([]); // [{ id, file, description }]
  const [isPublic, setIsPublic] = useState(false);
  const [isErpAttachment, setIsErpAttachment] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categoriesSelectOpen, setCategoriesSelectOpen] = useState(false);

  // Stati per il caricamento
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({}); // { fileName: 'uploading' | 'success' | 'error' }

  // Hook per le azioni sugli allegati
  const {
    uploadAttachmentByItemCode,
    uploadAttachmentByProjectItemId,
    loading,
    categories: hookCategories,
    getAttachmentCategories,
  } = useItemAttachmentsActions();

  const [availableCategories, setAvailableCategories] = useState(
    categories || [],
  );

  useEffect(() => {
    if (categories && categories.length > 0) {
      setAvailableCategories(categories);
    }
  }, [categories]);

  useEffect(() => {
    if ((!categories || categories.length === 0) && hookCategories.length > 0) {
      setAvailableCategories(hookCategories);
    }
  }, [hookCategories, categories]);

  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      try {
        const data = await getAttachmentCategories();
        if (isMounted && data) {
          setAvailableCategories(data);
        }
      } catch (error) {
        console.error("Errore nel recupero delle categorie:", error);
      }
    };

    if (
      open &&
      (!availableCategories || availableCategories.length === 0) &&
      getAttachmentCategories
    ) {
      fetchCategories();
    }

    return () => {
      isMounted = false;
    };
  }, [
    open,
    availableCategories?.length,
    getAttachmentCategories,
  ]);

  const createFileEntry = (file) => ({
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
      .toString(36)
      .slice(2, 9)}`,
    file,
    description: "",
  });

  // Gestione selezione file (supporta sia singolo che multiplo)
  const handleFileSelect = (fileOrFiles) => {
    if (!fileOrFiles) return;

    const normalizedFiles = Array.isArray(fileOrFiles)
      ? fileOrFiles
      : fileOrFiles?.target?.files
      ? Array.from(fileOrFiles.target.files)
      : fileOrFiles?.name
      ? [fileOrFiles]
      : [];

    if (!normalizedFiles.length) {
      return;
    }

    setSelectedFiles((prev) => {
      const existing = prev || [];
      const newEntries = normalizedFiles
        .filter(
          (file) =>
            !existing.some(
              (entry) =>
                entry.file.name === file.name &&
                entry.file.size === file.size &&
                entry.file.lastModified === file.lastModified
            )
        )
        .map((file) => createFileEntry(file));

      return [...existing, ...newEntries];
    });
  };

  // Rimuovi un file dalla lista
  const handleRemoveFile = (entryId) => {
    setSelectedFiles((prev) => prev.filter((entry) => entry.id !== entryId));
    setUploadStatus((prev) => {
      const { [entryId]: _, ...rest } = prev || {};
      return rest;
    });
  };

  const handleDescriptionChange = (entryId, value) => {
    setSelectedFiles((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, description: value } : entry
      )
    );
  };

  // Gestione caricamento file multipli
  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) {
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus({});

    try {
      const commonMetadata = {
        isPublic: isPublic.toString(),
        isErpAttachment: isErpAttachment.toString(),
        tags: tags.length > 0 ? tags.join(", ") : null,
        categoryIds: selectedCategories
          .map((cat) => cat.CategoryID || cat)
          .join(","),
      };

      const results = [];
      const totalFiles = selectedFiles.length;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        const entry = selectedFiles[i];
        const { id, file, description } = entry;

        setUploadStatus((prev) => ({
          ...prev,
          [id]: "uploading",
        }));

        try {
          const metadata = {
            ...commonMetadata,
            description: description?.trim() ? description.trim() : null,
          };

          let result;
          if (itemCode) {
            result = await uploadAttachmentByItemCode(itemCode, file, metadata);
          } else if (projectItemId) {
            result = await uploadAttachmentByProjectItemId(
              projectItemId,
              file,
              metadata,
            );
          }

          results.push({ file: file.name, success: true, result });
          successCount++;

          setUploadStatus((prev) => ({
            ...prev,
            [id]: "success",
          }));
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          errorCount++;
          results.push({
            file: file.name,
            success: false,
            error: error.message,
          });

          setUploadStatus((prev) => ({
            ...prev,
            [id]: "error",
          }));
        }

        const progress = ((i + 1) / totalFiles) * 100;
        setUploadProgress(progress);
      }

      if (onUploadComplete) {
        onUploadComplete(results);
      }

      if (window.swal && window.swal.fire) {
        if (errorCount === 0) {
          window.swal.fire({
            title: "Successo",
            text: `Tutti i ${successCount} file sono stati caricati con successo`,
            icon: "success",
            timer: 2000,
          });
        } else {
          const errorList = results
            .filter((r) => !r.success)
            .slice(0, 5)
            .map((r) => `<li>${r.file}: ${r.error}</li>`)
            .join("");
          window.swal.fire({
            title: "Caricamento completato",
            html: `
              <p>Caricati con successo: <strong>${successCount}</strong></p>
              <p>Errori: <strong>${errorCount}</strong></p>
              ${
                errorCount > 0
                  ? `<ul style="text-align:left;margin-top:8px;">${errorList}${
                      errorCount > 5
                        ? `<li>...altri ${errorCount - 5} file</li>`
                        : ""
                    }</ul>`
                  : ""
              }
            `,
            icon: successCount > 0 ? "warning" : "error",
            confirmButtonText: "OK",
          });
        }
      }

      if (errorCount === 0) {
        resetForm();
      }
    } catch (error) {
      console.error("Error in upload process:", error);
      if (window.swal && window.swal.fire) {
        window.swal.fire({
          title: "Errore",
          text: "Si è verificato un errore durante il caricamento",
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  // Gestione tag
  const handleTagInputChange = (event) => {
    setTagInput(event.target.value);
  };

  const handleTagInputKeyDown = (event) => {
    if (event.key === "Enter" && tagInput.trim()) {
      event.preventDefault();
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput("");
    }
  };

  const handleTagDelete = (tagToDelete) => {
    setTags(tags.filter((tag) => tag !== tagToDelete));
  };

  // Reset del form
  const resetForm = () => {
    setSelectedFiles([]);
    setIsPublic(false);
    setIsErpAttachment(false);
    setTags([]);
    setTagInput("");
    setSelectedCategories([]);
    setUploadProgress(0);
    setUploadStatus({});
  };

  // Gestione chiusura
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Funzione per renderizzare la preview dei file
  const renderFilePreview = () => {
    if (selectedFiles.length === 0) {
      return (
        <FileDropZone
          onFileSelect={handleFileSelect}
          disabled={isUploading}
          multiple={true}
          acceptedFileTypes={[
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "image/*",
            "text/plain",
            "text/csv",
            ".dxf",
            ".dwg",
            ".step",
            ".stp",
            ".iges",
            ".igs",
            ".stl",
            ".3dm",
            ".3ds",
            ".fbx",
            ".obj",
            ".gltf",
            ".glb",
            ".ply",
            ".dae",
            ".ipt",
            ".iam",
            ".idw",
            ".sldprt",
            ".sldasm",
            ".slddrw",
            ".x_t",
            ".x_b",
            ".par",
            ".asm",
            ".CATPart",
            ".CATProduct",
            ".wrl",
            ".jt",
            ".skp",
            ".blend",
            ".f3d",
            ".f3z",
          ]}
          sx={{
            height: 200,
            mb: 3,
          }}
        />
      );
    }

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          File selezionati ({selectedFiles.length})
        </Typography>
        <Box
          sx={{
            maxHeight: 320,
            overflowY: "auto",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            p: 1,
          }}
        >
          {selectedFiles.map((entry) => {
            const { id, file, description } = entry;
            const isImage = file.type?.startsWith("image/");
            const fileStatus = uploadStatus[id];
            const isUploadingFile = fileStatus === "uploading";
            const isSuccess = fileStatus === "success";
            const isError = fileStatus === "error";

            return (
              <Paper
                key={id}
                elevation={0}
                sx={{
                  p: 1.5,
                  mb: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: isError
                    ? "error.main"
                    : isSuccess
                    ? "success.main"
                    : "divider",
                  backgroundColor: isUploadingFile
                    ? "action.hover"
                    : isSuccess
                    ? "success.light"
                    : isError
                    ? "error.light"
                    : "background.paper",
                }}
              >
                <Box
                  display="flex"
                  alignItems="center"
                  gap={2}
                  sx={{ width: "100%" }}
                >
                  {isImage ? (
                    <Box
                      component="img"
                      src={URL.createObjectURL(file)}
                      alt="Preview"
                      sx={{
                        width: 50,
                        height: 50,
                        borderRadius: 1,
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <DescriptionIcon
                      sx={{
                        fontSize: 40,
                        color: isError
                          ? "error.main"
                          : isSuccess
                          ? "success.main"
                          : "primary.main",
                      }}
                    />
                  )}
                  <Box flex={1}>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      {file.name}
                      {isUploadingFile && (
                        <CircularProgress size={14} sx={{ ml: 1 }} />
                      )}
                      {isSuccess && (
                        <Typography
                          component="span"
                          variant="caption"
                          color="success.main"
                        >
                          ✓
                        </Typography>
                      )}
                      {isError && (
                        <Typography
                          component="span"
                          variant="caption"
                          color="error.main"
                        >
                          ✗
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {formatBytes(file.size)}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveFile(id)}
                    disabled={isUploading && isUploadingFile}
                    color="error"
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Box>
                <TextField
                  label="Descrizione (opzionale)"
                  fullWidth
                  value={description}
                  onChange={(e) => handleDescriptionChange(id, e.target.value)}
                  disabled={isUploading}
                  size="small"
                  multiline
                  minRows={2}
                  placeholder="Aggiungi una descrizione personalizzata per questo file"
                />
              </Paper>
            );
          })}
        </Box>
      </Box>
    );
  };

  // Render delle categorie
  const renderCategories = () => {
    if (!availableCategories || availableCategories.length === 0) {
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
          onChange={(e) => {
            setSelectedCategories(e.target.value);
            setCategoriesSelectOpen(false);
          }}
          disabled={isUploading}
          open={categoriesSelectOpen}
          onClose={() => setCategoriesSelectOpen(false)}
          onOpen={() => setCategoriesSelectOpen(true)}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected.length === 0 && (
                <Typography variant="body2" color="textSecondary">
                  Nessuna categoria selezionata
                </Typography>
              )}
              {selected.map((category) => {
                const categoryObj =
                  category.CategoryID && category.CategoryName
                    ? category
                    : availableCategories.find(
                        (c) =>
                          c.CategoryID === (category.CategoryID || category),
                      );

                const label =
                  categoryObj?.CategoryName ||
                  category.CategoryName ||
                  category;

                const categoryId = categoryObj?.CategoryID || category;

                return (
                  <Chip
                    key={categoryId}
                    label={label}
                    size="small"
                    onDelete={
                      isUploading
                        ? undefined
                        : (event) => {
                            event.stopPropagation();
                            setSelectedCategories((prev) =>
                              prev.filter(
                                (cat) =>
                                  (cat.CategoryID || cat) !== categoryId,
                              ),
                            );
                          }
                    }
                    deleteIcon={
                      !isUploading ? <ClearIcon fontSize="small" /> : undefined
                    }
                  />
                );
              })}
            </Box>
          )}
        >
          {availableCategories.map((category) => (
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
        "& .MuiDialog-paper": {
          height: "90vh",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Carica un nuovo allegato
            {itemCode && (
              <Typography component="span" variant="subtitle1" sx={{ ml: 1 }}>
                per l'articolo {itemCode}
              </Typography>
            )}
            {projectItemId && (
              <Typography component="span" variant="subtitle1" sx={{ ml: 1 }}>
                per l'articolo progetto #{projectItemId}
              </Typography>
            )}
          </Typography>
          {!isUploading && (
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ flex: 1, overflowY: "auto" }}>
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
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Informazioni generali
                </Typography>

                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Le impostazioni seguenti saranno applicate a tutti i file selezionati.
                  Puoi specificare una descrizione individuale per ciascun file direttamente nella lista.
                </Typography>

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

                <Box
                  sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 3 }}
                >
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
                  sx={{ mb: 1, display: "block" }}
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
                  sx={{ display: "block" }}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Categorie
                </Typography>
                {renderCategories()}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          borderTop: "1px solid",
          borderColor: "divider",
          padding: 2,
        }}
      >
        <Button onClick={handleClose} disabled={isUploading}>
          Annulla
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleFileUpload}
          disabled={selectedFiles.length === 0 || isUploading}
          startIcon={
            isUploading ? <CircularProgress size={16} /> : <UploadIcon />
          }
        >
          {isUploading
            ? `Caricamento... (${selectedFiles.length} file)`
            : selectedFiles.length > 0
            ? `Carica ${selectedFiles.length} ${selectedFiles.length === 1 ? "allegato" : "allegati"}`
            : "Carica allegato"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ItemAttachmentUploader;
