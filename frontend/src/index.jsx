import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
import 'bootstrap/dist/css/bootstrap.min.css';

// Importa gli stili
import './styles/global.css';
import './styles/themes.css';

// Importa il provider Redux
import ReduxProvider from './redux/ReduxProvider';
import App from './App';

// Imposta la classe dell'ambiente sul root HTML
document.documentElement.classList.add(import.meta.env.MODE);

// Aggiungi un helper per il debug delle chiamate API
if (import.meta.env.MODE === 'development') {
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    return originalFetch.apply(this, args);
  };
}

const container = document.getElementById('root');
container.classList.add('w-full');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ReduxProvider>
      <App />
    </ReduxProvider>
  </React.StrictMode>
);