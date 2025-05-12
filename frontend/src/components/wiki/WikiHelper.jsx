import React from 'react';
import WikiModal from './WikiModal';
import WikiTour from './WikiTour';
import { useWikiContext } from './WikiContext';

/**
 * Componente principale che gestisce il sistema Wiki
 * Include sia il modale che il tour guidato
 */
const WikiHelper = () => {
  const { isWikiOpen, isTourActive } = useWikiContext();
  
  return (
    <>
      {/* Modale principale della wiki */}
      {isWikiOpen && <WikiModal />}
      
      {/* Tour guidato */}
      {isTourActive && <WikiTour />}
    </>
  );
};

export default WikiHelper;