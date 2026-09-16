import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './gaya/index.css';
import { inisialisasiSinkronisasiOtomatis } from './lib/antrean.js';

// Inisialisasi pendengar online/offline dan polling sinkronisasi berkala (OF-04)
inisialisasiSinkronisasiOtomatis();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
