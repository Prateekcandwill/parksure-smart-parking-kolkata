import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { registerSW } from 'virtual:pwa-register'
import './styles/index.css'
import App from './App'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { setupNativeChrome } from '@/utils/native'
import { installSecurity } from '@/utils/security'

installSecurity()

if (!Capacitor.isNativePlatform()) {
  registerSW({ immediate: true })
}

void setupNativeChrome()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
