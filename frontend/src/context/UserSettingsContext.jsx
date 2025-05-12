import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { config } from '../config';


const UserSettingsContext = createContext();

export const useUserSettings = () => useContext(UserSettingsContext);

export const UserSettingsProvider = ({ children }) => {

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ref per il worker
  const workerRef = useRef(null);




  return (
    <UserSettingsContext.Provider
      value={{

      }}
    >
      {children}
    </UserSettingsContext.Provider>
  );
};

export default UserSettingsProvider;