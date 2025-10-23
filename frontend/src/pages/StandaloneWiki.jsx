import React from 'react';
import WikiEmbed from '../components/wiki/WikiEmbed';

/**
 * StandaloneWiki Component
 *
 * Pagina standalone per visualizzare Wiki.js
 * Bypassa MainPage per evitare conflitti di routing
 * Simile a StandaloneChat
 */
const StandaloneWiki = () => {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      backgroundColor: '#ffffff'
    }}>
      {/* Wiki fullscreen - senza toolbar per massimizzare spazio */}
      <WikiEmbed
        path="/"
        height="100vh"
        showToolbar={false}
      />
    </div>
  );
};

export default StandaloneWiki;
