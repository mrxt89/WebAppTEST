import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { config } from '../../config';

/**
 * WikiDocLink Component
 *
 * Pulsante per aprire la documentazione wiki della pagina corrente
 * Usa il wikiSlug per costruire automaticamente l'URL corretto
 * L'URL del wiki viene preso dalla configurazione centralizzata (config.WIKI_URL)
 *
 * @param {string} wikiSlug - Slug della pagina wiki (es: "dashboard/permessi")
 * @param {string} size - Dimensione icona ('small', 'medium', 'large')
 * @param {string} color - Colore icona
 * @param {string} tooltip - Testo del tooltip
 */
const WikiDocLink = ({
  wikiSlug,
  size = 'small',
  color = 'primary',
  tooltip = 'Apri documentazione'
}) => {

  // Se non c'è wikiSlug, non mostrare il pulsante
  if (!wikiSlug) {
    return null;
  }

  /**
   * Apri documentazione in nuova finestra
   */
  const openWikiDoc = () => {
    // Costruisce l'URL usando la configurazione centralizzata
    const wikiUrl = `${config.WIKI_URL}/it/${wikiSlug}`;
    console.log('wikiUrl', wikiUrl);  
    window.open(wikiUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Tooltip title={tooltip} arrow>
      <IconButton
        onClick={openWikiDoc}
        size={size}
        color={color}
        aria-label="documentazione"
        sx={{
          ml: 1,
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.08)'
          }
        }}
      >
        <MenuBookIcon fontSize={size} />
      </IconButton>
    </Tooltip>
  );
};

export default WikiDocLink;
