// src/redux/ReduxProvider.jsx
import React, { useEffect } from "react";
import { Provider, useDispatch } from "react-redux";
import { store } from "./store";
import { initializeNotificationsWorker } from "./features/notifications/notificationsActions";

// Inner component to initialize tools and services after the store is available
const ReduxInitializer = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Inizializza il worker solo se non è già presente
    if (!window.notificationWorker) {
      dispatch(initializeNotificationsWorker());
    }

    // Clean up on unmount
    return () => {
      dispatch({ type: "notifications/stopWorker" });
    };
  }, [dispatch]);

  return <>{children}</>;
};

// Main ReduxProvider component
const ReduxProvider = ({ children }) => {
  return (
    <Provider store={store}>
      <ReduxInitializer>{children}</ReduxInitializer>
    </Provider>
  );
};

export default ReduxProvider;
