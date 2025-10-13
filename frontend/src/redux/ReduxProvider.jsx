// src/redux/ReduxProvider.jsx
import { useEffect, useRef } from "react";
import { Provider, useDispatch } from "react-redux";
import { store } from "./store";
import { initializeNotificationsWorker } from "./features/notifications/notificationsActions";

// Inner component to initialize tools and services after the store is available
const ReduxInitializer = ({ children }) => {
  const dispatch = useDispatch();
  const initialized = useRef(false);

  useEffect(() => {
    // Inizializza il worker solo una volta
    if (!initialized.current && !window.notificationWorker) {
      initialized.current = true;
      dispatch(initializeNotificationsWorker());
    }

    // Clean up on unmount
    return () => {
      if (initialized.current) {
        dispatch({ type: "notifications/stopWorker" });
      }
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
