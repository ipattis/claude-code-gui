import React from 'react'
import ReactDOM from 'react-dom/client'
import './lib/web-api' // Initialize Web API client
import { HashRouter } from 'react-router-dom'
import App from './App'
import './assets/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
