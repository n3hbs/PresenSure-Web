import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Ensure root element never carries the dark class, keeping all app containers in light mode
if (typeof document !== 'undefined') {
  document.documentElement.classList.remove('dark')
  document.body.classList.remove('dark')
}

createRoot(document.getElementById('root')).render(
  <App />
)
