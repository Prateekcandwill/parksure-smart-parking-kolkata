import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { ROLE_META } from '@/utils/roles'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { Toaster } from '@/components/ui/Toast'
import { RouteMeta } from '@/components/seo/RouteMeta'
import { CookieConsent } from '@/components/legal/CookieConsent'

const LandingPage = lazy(() => import('@/pages/Landing'))
const SignInPage = lazy(() => import('@/pages/auth/SignIn'))
const RegisterPage = lazy(() => import('@/pages/auth/Register'))
const RoleChooserPage = lazy(() => import('@/pages/auth/RoleChooser'))
const PrivacyPage = lazy(() => import('@/pages/legal/Privacy'))
const TermsPage = lazy(() => import('@/pages/legal/Terms'))
const SupportPage = lazy(() => import('@/pages/support/Support'))
const NotFoundPage = lazy(() => import('@/pages/NotFound'))

const DriverFindPage = lazy(() => import('@/pages/driver/Find'))
const DriverPlaceDetailPage = lazy(() => import('@/pages/driver/PlaceDetail'))
const DriverBookPage = lazy(() => import('@/pages/driver/Book'))
const DriverTripPage = lazy(() => import('@/pages/driver/Trip'))
const DriverWalletPage = lazy(() => import('@/pages/driver/Wallet'))
const DriverMePage = lazy(() => import('@/pages/driver/Me'))

const AttendantGatePage = lazy(() => import('@/pages/attendant/Gate'))
const AttendantMePage = lazy(() => import('@/pages/attendant/Me'))

const OperatorLotPage = lazy(() => import('@/pages/operator/Lot'))
const OperatorAlertsPage = lazy(() => import('@/pages/operator/Alerts'))
const OperatorLogPage = lazy(() => import('@/pages/operator/Log'))
const OperatorCashPage = lazy(() => import('@/pages/operator/CashReconciliation'))
const OperatorMePage = lazy(() => import('@/pages/operator/Me'))

const AdminSettingsPage = lazy(() => import('@/pages/admin/Settings'))
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/Analytics'))
const AdminAuditLogPage = lazy(() => import('@/pages/admin/AuditLog'))
const AdminMePage = lazy(() => import('@/pages/admin/Me'))

function RootRedirect() {
  const userId = useAuthStore((state) => state.userId)
  const activeRole = useAuthStore((state) => state.activeRole)
  if (!userId) return <LandingPage />
  if (!activeRole) return <Navigate to="/choose-role" replace />
  return <Navigate to={ROLE_META[activeRole].home} replace />
}

function RouteFallback() {
  return (
    <div className="min-h-dvh">
      <div className="mx-auto w-full max-w-4xl">
        <PageSkeleton cards={2} />
      </div>
    </div>
  )
}

function ThemeSync() {
  const theme = useUIStore((state) => state.theme)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0B0B0F' : '#F6F4EF')
  }, [theme])

  return null
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ThemeSync />
      <ScrollToTop />
      <RouteMeta />
      <CookieConsent />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/choose-role" element={<RoleChooserPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />

          <Route element={<ProtectedRoute role="driver" />}>
            <Route path="/driver" element={<AppShell role="driver" />}>
              <Route index element={<Navigate to="/driver/find" replace />} />
              <Route path="find" element={<DriverFindPage />} />
              <Route path="place/:placeId" element={<DriverPlaceDetailPage />} />
              <Route path="book/:placeId" element={<DriverBookPage />} />
              <Route path="trip" element={<DriverTripPage />} />
              <Route path="wallet" element={<DriverWalletPage />} />
              <Route path="me" element={<DriverMePage />} />
              <Route path="support" element={<SupportPage role="driver" />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute role="attendant" />}>
            <Route path="/attendant" element={<AppShell role="attendant" />}>
              <Route index element={<Navigate to="/attendant/gate" replace />} />
              <Route path="gate" element={<AttendantGatePage />} />
              <Route path="me" element={<AttendantMePage />} />
              <Route path="support" element={<SupportPage role="attendant" />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute role="operator" />}>
            <Route path="/operator" element={<AppShell role="operator" />}>
              <Route index element={<Navigate to="/operator/lot" replace />} />
              <Route path="lot" element={<OperatorLotPage />} />
              <Route path="alerts" element={<OperatorAlertsPage />} />
              <Route path="log" element={<OperatorLogPage />} />
              <Route path="cash" element={<OperatorCashPage />} />
              <Route path="me" element={<OperatorMePage />} />
              <Route path="support" element={<SupportPage role="operator" />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="/admin" element={<AppShell role="admin" />}>
              <Route index element={<Navigate to="/admin/settings" replace />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="log" element={<AdminAuditLogPage />} />
              <Route path="me" element={<AdminMePage />} />
              <Route path="support" element={<SupportPage role="admin" />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  )
}
