import React, { useState, useRef } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { config } from '../../config';
import { useWikiDocs } from '@/context/WikiDocsContext';
import WikiDocsPanel from './WikiDocsPanel';

/**
 * WikiDocLink Component
 *
 * Pulsante per aprire il pannello laterale con la documentazione wiki
 * Se ci sono componenti documentati per la pagina, mostra il pannello laterale
 * Altrimenti apre direttamente il wiki della pagina (fallback)
 *
 * @param {string} wikiSlug - Slug della pagina wiki (es: "dashboard/permessi") - FALLBACK
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
  const [panelOpen, setPanelOpen] = useState(false);
  const { pageId, componentKey } = useWikiDocs();
  const triggerRef = useRef(null);

  /**
   * Apri pannello laterale documentazione o wiki diretto
   */
  const handleClick = () => {
    if (pageId) {
      // Se c'è un pageId, apri il pannello laterale con i componenti
      setPanelOpen(true);
    } else if (wikiSlug) {
      // Fallback: apri direttamente il wiki se non c'è pageId
      const wikiUrl = `${config.WIKI_URL}/it/${wikiSlug}`;
      window.open(wikiUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Se non c'è né pageId né wikiSlug, non mostrare il pulsante
  if (!pageId && !wikiSlug) {
    return null;
  }

  return (
    <>
      <Tooltip title={tooltip} arrow>
        <IconButton
          ref={triggerRef}
          onClick={handleClick}
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

      {/* Pannello laterale con lista componenti */}
      {pageId && (
        <WikiDocsPanel
          isOpen={panelOpen}
          onClose={() => setPanelOpen(false)}
          pageId={pageId}
          currentComponentKey={componentKey}
          triggerRef={triggerRef}
        />
      )}
    </>
  );
};

export default WikiDocLink;
