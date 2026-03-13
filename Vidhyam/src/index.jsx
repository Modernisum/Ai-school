// src/index.js

import React from "react";
import ReactDOM from "react-dom/client";

// Import Tailwind CSS
import "./index.css";

import App from "./App";

import { Provider } from 'react-redux';
import { store } from './app/store';
import ErrorBoundary from './components/ErrorBoundary';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <App />
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
);
