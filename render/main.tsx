import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './style.css'

const container = document.getElementById('app')
if (!container) {
  throw new Error('缺少 #app 挂载节点，检查 render/index.html')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
