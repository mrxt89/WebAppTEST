// Frontend/src/components/itemAttachments/ItemAttachmentCategories.js
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  CircularProgress,
  TextField,
  IconButton,
  Grid,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Tooltip,
} from "@mui/material";
import {
  Label as LabelIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import useItemAttachmentsActions from "../../hooks/useItemAttachmentsActions";

/**
 * ItemAttachmentCategories - Componente per la gestione delle categorie di un allegato
 *
 * @param {boolean} open - Flag per mostrare/nascondere il dialog (se non inline)
 * @param {object} attachment - L'allegato di cui gestire le categorie
 * @param {function} onClose - Callback per la chiusura del dialog (se non inline)
 * @param {boolean} readOnly - Flag per la modalità di sola lettura
 * @param {boolean} inline - Flag per visualizzazione inline (senza dialog)
 */
function ItemAttachmentCategories({
  open,
  attachment,
  onClose,
  readOnly = false,
  inline = false,
}) {
  // Stati
  const [attachmentCategories, setAttachmentCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Stati per il form di aggiunta categoria
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#1b263b");

  // Stati per la selezione delle categorie
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Hook per le azioni sugli allegati
  const {
    getAttachmentCategories,
    addAttachmentCategory,
    setAttachmentCategories: saveAttachmentCategories,
    getItemAttachmentById,
  } = useItemAttachmentsActions();

  // Carica le categorie dell'allegato e tutte le categorie disponibili
  useEffect(() => {
    const loadCategories = async () => {
      if (!attachment || !attachment.AttachmentID) return;

      try {
        setLoading(true);

        // Carica tutte le categorie disponibili
        const categories = await getAttachmentCategories();
        setAllCategories(categories || []);

        // Carica l'allegato completo per ottenere le sue categorie
        const fullAttachment = await getItemAttachmentById(
          attachment.AttachmentID,
        );

        // Se l'allegato ha delle categorie, le impostiamo
        if (fullAttachment && fullAttachment.Categories) {
          const attachmentCategoryIds = Array.isArray(fullAttachment.Categories)
            ? fullAttachment.Categories
            : fullAttachment.Categories.split(",")
                .map((id) => parseInt(id.trim()))
                .filter((id) => !isNaN(id));

          setAttachmentCategories(attachmentCategoryIds);
          setSelectedCategories(attachmentCategoryIds);
        } else {
          setAttachmentCategories([]);
          setSelectedCategories([]);
        }
      } catch (error) {
        console.error("Error loading categories:", error);
      } finally {
        setLoading(false);
      }
    };

    if ((open || inline) && attachment) {
      loadCategories();
    }
  }, [
    attachment,
    open,
    inline,
    getAttachmentCategories,
    getItemAttachmentById,
  ]);

  // Controlla se ci sono cambiamenti nelle categorie selezionate
  useEffect(() => {
    // Converte in insiemi per un confronto più semplice
    const attachmentCatsSet = new Set(attachmentCategories);
    const selectedCatsSet = new Set(selectedCategories);

    // Controlla se gli insiemi hanno dimensioni diverse
    if (attachmentCatsSet.size !== selectedCatsSet.size) {
      setHasChanges(true);
      return;
    }

    // Controlla se ogni elemento del primo insieme è presente nel secondo
    let changes = false;
    attachmentCatsSet.forEach((cat) => {
      if (!selectedCatsSet.has(cat)) {
        changes = true;
      }
    });

    setHasChanges(changes);
  }, [attachmentCategories, selectedCategories]);

  // Gestione selezione/deselezione categoria
  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  // Gestione salvataggio categorie
  const handleSaveCategories = async () => {
    if (!attachment || !attachment.AttachmentID) return;

    try {
      setSaving(true);

      // Salva le categorie selezionate
      await saveAttachmentCategories(
        attachment.AttachmentID,
        selectedCategories.join(","),
      );

      // Aggiorna le categorie dell'allegato
      setAttachmentCategories(selectedCategories);
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving categories:", error);
    } finally {
      setSaving(false);
    }
  };

  // Gestione aggiunta nuova categoria
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      setSaving(true);

      // Aggiungi la nuova categoria
      const result = await addAttachmentCategory(
        newCategoryName,
        newCategoryDescription,
        newCategoryColor,
      );

      // Aggiorna l'elenco delle categorie
      const categories = await getAttachmentCategories();
      setAllCategories(categories || []);

      // Reset del form
      setNewCategoryName("");
      setNewCategoryDescription("");
      setNewCategoryColor("#1b263b");
      setShowAddForm(false);

      // Seleziona automaticamente la nuova categoria
      if (result && result.CategoryID) {
        setSelectedCategories((prev) => [...prev, result.CategoryID]);
      }
    } catch (error) {
      console.error("Error adding category:", error);
    } finally {
      setSaving(false);
    }
  };

  // Render del form per nuova categoria
  const renderAddCategoryForm = () => {
    if (!showAddForm) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setShowAddForm(true)}
            disabled={saving}
          >
            Nuova categoria
          </Button>
        </Box>
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="subtitle1">Aggiungi nuova categoria</Typography>
          <IconButton
            size="small"
            onClick={() => setShowAddForm(false)}
            disabled={saving}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Nome categoria"
              fullWidth
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              disabled={saving}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Colore"
              fullWidth
              type="color"
              value={newCategoryColor}
              onChange={(e) => setNewCategoryColor(e.target.value)}
              disabled={saving}
              InputProps={{
                startAdornment: (
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      mr: 1,
                      borderRadius: "50%",
                      backgroundColor: newCategoryColor,
                    }}
                  />
                ),
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Descrizione"
              fullWidth
              value={newCategoryDescription}
              onChange={(e) => setNewCategoryDescription(e.target.value)}
              disabled={saving}
              multiline
              rows={2}
            />
          </Grid>

          <Grid
            item
            xs={12}
            sx={{ display: "flex", justifyContent: "flex-end" }}
          >
            <Button
              variant="text"
              onClick={() => setShowAddForm(false)}
              disabled={saving}
              sx={{ mr: 1 }}
            >
              Annulla
            </Button>

            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddCategory}
              disabled={saving || !newCategoryName.trim()}
            >
              {saving ? "Salvataggio..." : "Aggiungi categoria"}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  // Render della lista di categorie
  const renderCategoriesList = () => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (allCategories.length === 0) {
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
          <Typography color="textSecondary" align="center">
            Nessuna categoria disponibile
          </Typography>
          <Typography
            variant="body2"
            color="textSecondary"
            align="center"
            sx={{ mt: 1 }}
          >
            Crea nuove categorie per organizzare meglio i tuoi allegati
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
          {allCategories.map((category, index) => (
            <React.Fragment key={category.CategoryID}>
              <ListItem
                sx={{
                  "&:hover": { backgroundColor: "action.hover" },
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      backgroundColor: category.ColorHex || "#1b263b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <LabelIcon sx={{ color: "white", fontSize: 16 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2">
                      {category.CategoryName}
                    </Typography>
                  }
                  secondary={
                    <React.Fragment>
                      {category.Description && (
                        <Typography variant="body2" component="div">
                          {category.Description}
                        </Typography>
                      )}
                      <Typography variant="body2" color="textSecondary">
                        {category.AttachmentCount} allegati
                      </Typography>
                    </React.Fragment>
                  }
                />
                {!readOnly && (
                  <Checkbox
                    edge="end"
                    checked={selectedCategories.includes(category.CategoryID)}
                    onChange={() => handleCategoryToggle(category.CategoryID)}
                    disabled={saving}
                    color="primary"
                  />
                )}
              </ListItem>
              {index < allCategories.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    );
  };

  // Contenuto principale
  const content = (
    <Box>
      {!readOnly && renderAddCategoryForm()}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="subtitle1">Categorie disponibili</Typography>

        {!readOnly && hasChanges && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSaveCategories}
            disabled={saving || loading}
            size="small"
          >
            {saving ? "Salvataggio..." : "Salva modifiche"}
          </Button>
        )}
      </Box>

      {renderCategoriesList()}

      {selectedCategories.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Categorie selezionate
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {selectedCategories.map((categoryId) => {
              const category = allCategories.find(
                (c) => c.CategoryID === categoryId,
              );
              if (!category) return null;

              return (
                <Chip
                  key={categoryId}
                  label={category.CategoryName}
                  size="small"
                  onDelete={
                    !readOnly
                      ? () => handleCategoryToggle(categoryId)
                      : undefined
                  }
                  sx={{
                    backgroundColor: category.ColorHex
                      ? `${category.ColorHex}33`
                      : "default", // aggiunge trasparenza
                    borderColor: category.ColorHex,
                    color: category.ColorHex,
                  }}
                />
              );
            })}
          </Box>
        </Box>
      )}
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
      onClose={loading || saving ? null : onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Categorie per: {attachment?.FileName}
          </Typography>
          <IconButton
            size="small"
            onClick={onClose}
            disabled={loading || saving}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>{content}</DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading || saving}>
          Chiudi
        </Button>
        {!readOnly && hasChanges && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveCategories}
            disabled={saving || loading}
            startIcon={<SaveIcon />}
          >
            {saving ? "Salvataggio..." : "Salva modifiche"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default ItemAttachmentCategories;
