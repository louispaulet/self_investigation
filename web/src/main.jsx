import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

if (window.location.pathname !== '/' && !window.location.hash) {
  const path = window.location.pathname.replace(/\/$/, '')
  window.history.replaceState(null, '', `/#${path}${window.location.search}`)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
