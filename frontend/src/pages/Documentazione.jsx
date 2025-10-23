import React from 'react';
import WikiEmbed from '../components/wiki/WikiEmbed';

/**
 * Pagina Documentazione
 *
 * Mostra il Wiki.js integrato nella webapp
 * Segue lo stile standard delle altre pagine
 */
const Documentazione = ({ onExit }) => {
  return (
    <div style={{
      width: '100%',
      height: 'calc(100vh - 120px)', // Compenso per header MainContainer
      padding: '16px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Wiki Container - fullscreen */}
      <div style={{
        flex: 1,
        width: '100%',
        overflow: 'hidden'
      }}>
        <WikiEmbed
          path="/"
          height="100%"
          showToolbar={true}
        />
      </div>
    </div>
  );
};

export default Documentazione;
