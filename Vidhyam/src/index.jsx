// src/index.js

import React from "react";
import ReactDOM from "react-dom/client";

// Import Tailwind CSS
import "./index.css";

import App from "./App";

import { Provider } from 'react-redux';
import { store } from './app/store';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
