/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_OTP?: string
  readonly VITE_DEMO_PASSWORD?: string
  readonly VITE_DEMO_3DS_CODE?: string
  readonly VITE_SUPPORT_EMAIL?: string
  readonly VITE_SUPPORT_PHONE?: string
  readonly VITE_SUPPORT_PHONE_DISPLAY?: string
  readonly VITE_SITE_URL?: string
  readonly VITE_ANALYTICS_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
