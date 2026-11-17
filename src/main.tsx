import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { isFirebaseConfigured } from './services/firebase/config'
import './index.css'
import { Alert } from './components/common/UI'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {!isFirebaseConfigured && (
          <div className="fixed inset-x-0 top-0 z-50 p-3">
            <div className="mx-auto max-w-3xl"><Alert>Firebase is not configured. Copy <code>.env.example</code> to <code>.env</code> and add your Firebase web app settings.</Alert></div>
          </div>
        )}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
