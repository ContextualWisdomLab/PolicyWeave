import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthoringFocusController } from './AuthoringFocusController'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthoringFocusController />
    <App />
  </StrictMode>,
)
