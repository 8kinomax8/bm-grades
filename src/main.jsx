import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import { AuthProvider } from 'react-oidc-context'
import { FRONTEND_CONFIG } from '../config.js'

const cognitoAuthConfig = {
  authority: FRONTEND_CONFIG.COGNITO.authority,
  client_id: FRONTEND_CONFIG.COGNITO.clientId,
  redirect_uri: FRONTEND_CONFIG.COGNITO.redirectUri,
  response_type: FRONTEND_CONFIG.COGNITO.responseType,
  scope: FRONTEND_CONFIG.COGNITO.scope,
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </StrictMode>,
)
