import React, { useState, useEffect } from 'react';

/**
 * WikiEmbed Component
 *
 * Mostra Wiki.js in un iframe responsive all'interno della webapp
 *
 * @param {string} path - Percorso pagina wiki (default: "/")
 * @param {string} height - Altezza iframe (default: "calc(100vh - 100px)")
 * @param {boolean} showToolbar - Mostra toolbar con controlli (default: true)
 */
const WikiEmbed = ({
  path = "/",
  height = "calc(100vh - 100px)",
  showToolbar = true
}) => {
  const [iframeUrl, setIframeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Costruisci URL wiki
    const baseUrl = window.location.origin; // http://localhost o https://localhost
    const wikiPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = `${baseUrl}/wiki${wikiPath}`;

    setIframeUrl(fullUrl);
  }, [path]);

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Impossibile caricare il wiki. Verifica che il servizio sia attivo.');
  };

  const handleOpenNewTab = () => {
    window.open(iframeUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%'
    }}>
      {/* Toolbar (opzionale) */}
      {showToolbar && (
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          alignItems: 'center'
        }}>
          <button
            onClick={handleOpenNewTab}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
          >
            🔗 Apri in nuova finestra
          </button>

          <div style={{ flex: 1 }} />

          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            📚 Documentazione
          </span>
        </div>
      )}

      {/* Container iframe */}
      <div style={{
        position: 'relative',
        flex: 1,
        width: '100%',
        height: showToolbar ? 'calc(100% - 50px)' : '100%',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'white'
      }}>
        {/* Loading indicator */}
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            zIndex: 10
          }}>
            <div style={{
              border: '4px solid #f3f4f6',
              borderTop: '4px solid #3b82f6',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 12px'
            }} />
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Caricamento documentazione...
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            padding: '20px',
            zIndex: 10
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <p style={{ color: '#ef4444', marginBottom: '12px', fontSize: '16px' }}>
              {error}
            </p>
            <button
              onClick={handleOpenNewTab}
              style={{
                padding: '8px 16px',
                color: '#3b82f6',
                textDecoration: 'underline',
                cursor: 'pointer',
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '14px'
              }}
            >
              Apri wiki in nuova finestra
            </button>
          </div>
        )}

        {/* Iframe */}
        {iframeUrl && (
          <iframe
            src={iframeUrl}
            title="Wiki.js - Documentazione"
            style={{
              width: '100%',
              height: height,
              border: 'none',
              display: isLoading || error ? 'none' : 'block'
            }}
            onLoad={handleLoad}
            onError={handleError}
            allow="fullscreen"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        )}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default WikiEmbed;
