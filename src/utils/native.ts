import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'

/**
 * Small native-only chrome pass. Everything is wrapped so the web build and
 * browsers without the plugins keep working.
 */
export async function setupNativeChrome(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    await StatusBar.setOverlaysWebView({ overlay: false })
    await StatusBar.setBackgroundColor({ color: '#0B0B0F' })
    await StatusBar.setStyle({ style: Style.Light })
  } catch {
    // Status bar is Android/iOS only.
  }

  try {
    await SplashScreen.hide({ fadeOutDuration: 250 })
  } catch {
    // Splash screen is native only.
  }
}
