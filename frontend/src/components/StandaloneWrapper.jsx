// src/components/StandaloneWrapper.jsx
import React from 'react';
import { Provider } from 'react-redux';
import { store } from '../redux/store';
import { BrowserRouter } from 'react-router-dom';
import StandaloneChat from '../pages/StandaloneChat';

// Wrapper per rendere disponibile lo store in finestre separate
const StandaloneWrapper = () => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <StandaloneChat />
      </BrowserRouter>
    </Provider>
  );
};

export default StandaloneWrapper;