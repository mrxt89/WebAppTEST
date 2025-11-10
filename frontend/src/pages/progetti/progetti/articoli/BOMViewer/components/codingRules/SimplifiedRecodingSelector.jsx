// SimplifiedRecodingSelector.jsx
// Componente per ricodifica semplificata - mostra solo preview codici

import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, CircularProgress, Chip } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

const SimplifiedRecodingSelector = ({
  item,
  charactersToKeep,
  onPreviewGenerated,
  disabled = false
}) => {
  const [previewCode, setPreviewCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Genera preview automaticamente quando cambia il numero di caratteri
  useEffect(() => {
    if (item?.ComponentItemCode && charactersToKeep) {
      generatePreview();
    }
  }, [item, charactersToKeep]);

  const generatePreview = async () => {
    try {
      setLoading(true);
      setError(null);

      const originalCode = item.ComponentItemCode;
      const prefix = originalCode.substring(0, charactersToKeep);

      // Simula calcolo preview (il backend farà la chiamata reale)
      // Per ora generiamo una preview locale
      const zeroPadding = '0'.repeat(15 - charactersToKeep - 3);
      const mockSequential = '000'; // Il backend darà il sequenziale reale
      const preview = prefix + zeroPadding + mockSequential;

      setPreviewCode(preview);

      // Notifica il parent component
      if (onPreviewGenerated) {
        onPreviewGenerated({
          itemId: item.ComponentId,
          originalCode: originalCode,
          previewCode: preview,
          prefix: prefix
        });
      }
    } catch (err) {
      console.error('Error generating preview:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Generazione preview...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 1 }}>
        {error}
      </Alert>
    );
  }

  const originalCode = item?.ComponentItemCode || '';
  const prefix = originalCode.substring(0, charactersToKeep);

  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
      {/* Info Badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <InfoIcon fontSize="small" color="primary" />
        <Typography variant="caption" color="text.secondary">
          Modalità Semplificata: mantiene i primi {charactersToKeep} caratteri
        </Typography>
      </Box>

      {/* Codice Originale */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          Codice Originale
        </Typography>
        <Box sx={{
          p: 1.5,
          bgcolor: 'grey.50',
          borderRadius: 1,
          fontFamily: 'monospace',
          fontSize: '0.95rem'
        }}>
          {originalCode}
        </Box>
      </Box>

      {/* Visualizzazione Breakdown */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          Composizione Nuovo Codice
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', fontFamily: 'monospace' }}>
          {/* Prefisso mantenuto */}
          <Chip
            label={prefix}
            size="small"
            color="primary"
            sx={{
              fontFamily: 'monospace',
              fontWeight: 600
            }}
          />
          <Typography variant="body2" color="text.secondary">+</Typography>
          {/* Zeri */}
          <Chip
            label={'0'.repeat(15 - charactersToKeep - 3)}
            size="small"
            sx={{
              fontFamily: 'monospace',
              bgcolor: 'grey.200',
              color: 'grey.600'
            }}
          />
          <Typography variant="body2" color="text.secondary">+</Typography>
          {/* Sequenziale */}
          <Chip
            label="XXX"
            size="small"
            color="success"
            sx={{
              fontFamily: 'monospace',
              fontWeight: 600
            }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          <strong>Prefisso:</strong> Primi {charactersToKeep} caratteri mantentuti |{' '}
          <strong>Zeri:</strong> Padding |{' '}
          <strong>Sequenziale:</strong> Numero progressivo per prefisso
        </Typography>
      </Box>

      {/* Preview Finale */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          Preview Nuovo Codice (sequenziale sarà calcolato al momento)
        </Typography>
        <Box sx={{
          p: 1.5,
          bgcolor: previewCode ? 'success.50' : 'grey.50',
          borderRadius: 1,
          border: previewCode ? '2px solid' : '1px solid',
          borderColor: previewCode ? 'success.main' : 'grey.300',
          fontFamily: 'monospace',
          fontSize: '0.95rem',
          fontWeight: 600,
          color: previewCode ? 'success.dark' : 'text.secondary'
        }}>
          {previewCode || 'In attesa...'}
        </Box>
      </Box>

      {/* Descrizione */}
      {item?.ComponentDescription && (
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            Descrizione (verrà mantenuta)
          </Typography>
          <Typography variant="body2">
            {item.ComponentDescription}
          </Typography>
        </Box>
      )}

      {/* Warning per articoli bloccati */}
      {item?.stato_erp === 1 && (
        <Alert severity="warning" sx={{ mt: 2 }} icon={false}>
          <Typography variant="caption">
            ⚠️ Articolo sincronizzato con ERP - non ricodificabile
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default SimplifiedRecodingSelector;
