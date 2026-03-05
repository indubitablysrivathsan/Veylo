import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Ensure dark background immediately (Tailwind v4 CSS processing can delay custom base styles)
document.documentElement.style.backgroundColor = '#06060F'
document.body.style.backgroundColor = '#06060F'
document.body.style.color = '#F1F5F9'
document.body.style.fontFamily = "'Inter', sans-serif"
document.body.style.minHeight = '100vh'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
