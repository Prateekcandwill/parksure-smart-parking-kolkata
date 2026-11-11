import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowLeftRight,
  BadgeCheck,
  Building2,
  Car,
  Cookie,
  FileText,
  FlaskConical,
  Globe2,
  LogOut,
  Mail,
  MessageCircle,
  Moon,
  Phone,
  Pencil,
  ShieldCheck,
  Smartphone,
  Sun,
} from 'lucide-react'
import type { Role } from '@/types'
import { useDB } from '@/api/useDB'
import { useAuthStore } from '@/store/auth'
import { useConsentStore } from '@/store/consent'
import { toast } from '@/store/toast'
import { useUIStore, type Language } from '@/store/ui'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useT } from '@/i18n/useT'
import { languageNames } from '@/i18n/strings'
import { DEMO_CONFIG } from '@/config/env'
import { Avatar } from '@/components/ui/Avatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Switch } from '@/components/ui/Switch'
import { DemoBadge, SimulatedDataNote } from '@/components/ui/DemoBadge'
import { ProfileEditSheet } from '@/components/account/ProfileEditSheet'
import { ROLE_META } from '@/utils/roles'
import { formatDate } from '@/utils/format'
import { haptic } from '@/utils/haptics'

export function AccountPanel({ role }: { role: Role }) {
  const navigate = useNavigate()
  const t = useT()
  const db = useDB()
  const user = useCurrentUser()
  const signOut = useAuthStore((state) => state.signOut)
  const switchRole = useAuthStore((state) => state.switchRole)
  const theme = useUIStore((state) => state.theme)
  const toggleTheme = useUIStore((state) => state.toggleTheme)
  const language = useUIStore((state) => state.language)
  const setLanguage = useUIStore((state) => state.setLanguage)
  const simulationOn = useUIStore((state) => state.simulationOn)
  const setSimulation = useUIStore((state) => state.setSimulation)
  const analyticsConsent = useConsentStore((state) => state.analytics)
  const setAnalyticsConsent = useConsentStore((state) => state.setAnalytics)
  const consentDecidedAt = useConsentStore((state) => state.decidedAt)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  if (!user) return null

  const vehicles = db.vehicles.filter((vehicle) => vehicle.userId === user.id)
  const places = db.places.filter(
    (place) => user.roles.includes('admin') || user.placeIds.length === 0 || user.placeIds.includes(place.id),
  )
  const languages: Language[] = ['en', 'bn', 'hi']

  return (
    <div className="space-y-4">
      <Card strong className="overflow-hidden p-5">
        <div className="flex items-start gap-4">
          <Avatar name={user.name} tone={user.avatarTone} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-semibold text-text">{user.name}</h2>
              <StatusBadge tone="info" label={ROLE_META[role].short} />
            </div>
            <a
              href={`mailto:${user.email}`}
              className="focus-ring mt-1 flex min-h-10 min-w-0 items-center gap-1.5 rounded-lg text-xs text-muted hover:text-text"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="break-all">{user.email}</span>
            </a>
            <a
              href={`tel:${user.phone}`}
              className="focus-ring flex min-h-10 items-center gap-1.5 rounded-lg font-mono text-xs text-muted hover:text-text"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {user.phone}
            </a>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {user.roles.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-line/80 bg-raised/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted"
                >
                  {ROLE_META[item].short}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line/70 pt-4 text-[11px]">
          <div>
            <div className="text-muted">Staff ID</div>
            <div className="mt-0.5 font-mono font-semibold text-text">{user.staffId ?? 'Driver account'}</div>
          </div>
          <div>
            <div className="text-muted">Member since</div>
            <div className="mt-0.5 font-semibold text-text">{formatDate(user.createdAt)}</div>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4 w-full"
          iconLeft={<Pencil className="h-4 w-4" />}
          onClick={() => {
            haptic('tap')
            setProfileOpen(true)
          }}
        >
          Edit profile
        </Button>
      </Card>

      {role === 'driver' && vehicles.length > 0 ? (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Car className="h-4 w-4 text-accent" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-text">Vehicles</h3>
          </div>
          <div className="space-y-2">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line/80 bg-raised/40 px-3 py-2.5"
              >
                <div>
                  <div className="font-mono text-sm font-semibold text-text">{vehicle.plate}</div>
                  <div className="mt-0.5 text-[11px] text-muted">
                    {vehicle.make} {vehicle.model}
                  </div>
                </div>
                <div className="text-right">
                  {vehicle.isDefault ? <StatusBadge tone="success" label="Default" /> : null}
                  {vehicle.fastagId ? (
                    <div className="mt-1 font-mono text-[10px] text-muted">
                      FASTag ₹{vehicle.fastagBalance ?? 0}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {user.roles.some((item) => item !== 'driver') ? (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-accent" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-text">Assigned places</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {places.map((place) => (
              <span
                key={place.id}
                className="rounded-full border border-line/80 bg-raised/50 px-3 py-1.5 text-[11px] font-semibold text-text"
              >
                {place.name}
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
            <BadgeCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            Access is enforced by role guards on every route.
          </div>
        </Card>
      ) : null}

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-accent" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-text">Preferences</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-text">
              {theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              Appearance
            </div>
            <Switch
              checked={theme === 'light'}
              onChange={() => {
                haptic('tap')
                toggleTheme()
              }}
              label="Light theme"
              description="Dark is the default premium theme. Light stays AA contrast checked."
            />
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold text-text">Language</div>
            <div className="flex flex-wrap gap-2">
              {languages.map((item) => (
                <Chip
                  key={item}
                  active={language === item}
                  onClick={() => {
                    haptic('tap')
                    setLanguage(item)
                  }}
                >
                  {languageNames[item]}
                </Chip>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Navigation and key actions are translated. Long-form legal text stays in English for this demo.
            </p>
          </div>
          <Switch
            checked={simulationOn}
            onChange={setSimulation}
            label="Live simulation"
            description="Nudges bay readings, gate queues and alerts every few seconds."
          />
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-accent" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-text">Help and legal</h3>
        </div>
        <div className="space-y-2">
          <Link
            to={`/${role}/support`}
            className="focus-ring flex min-h-12 items-center gap-3 rounded-xl border border-line/80 bg-raised/40 px-3 py-2.5 transition-colors hover:border-accent/35"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-success/25 bg-success/10 text-success">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-text">ParkSure Assist</span>
              <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">
                On-device support for bookings, payments, gates and privacy. No external AI.
              </span>
            </span>
          </Link>

          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              to="/privacy"
              className="focus-ring flex min-h-12 items-center gap-2.5 rounded-xl border border-line/80 bg-raised/40 px-3 text-[12px] font-semibold text-text transition-colors hover:border-accent/35"
            >
              <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
              Privacy policy
            </Link>
            <Link
              to="/terms"
              className="focus-ring flex min-h-12 items-center gap-2.5 rounded-xl border border-line/80 bg-raised/40 px-3 text-[12px] font-semibold text-text transition-colors hover:border-accent/35"
            >
              <FileText className="h-4 w-4 text-accent" aria-hidden="true" />
              Terms and conditions
            </Link>
          </div>

          {role === 'admin' ? (
            <Link
              to="/admin/analytics"
              className="focus-ring flex min-h-12 items-center gap-2.5 rounded-xl border border-line/80 bg-raised/40 px-3 text-[12px] font-semibold text-text transition-colors hover:border-accent/35"
            >
              <Activity className="h-4 w-4 text-accent" aria-hidden="true" />
              Usage analytics
            </Link>
          ) : null}

          <div className="rounded-xl border border-line/80 bg-raised/40 px-3 py-3">
            <Switch
              checked={analyticsConsent}
              onChange={(enabled) => {
                haptic('tap')
                setAnalyticsConsent(enabled)
              }}
              label="Optional usage analytics"
              description="Local-only page views and action names. Off by default; never includes chat text or payment details."
            />
            <p className="mt-2 flex items-start gap-2 text-[10px] leading-relaxed text-muted">
              <Cookie className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
              {consentDecidedAt
                ? `Choice saved ${formatDate(consentDecidedAt)}. You can change it here at any time.`
                : 'No choice saved yet. Use this switch or the consent banner to decide.'}
            </p>
          </div>

          <p className="px-1 text-[10px] leading-relaxed text-muted">
            Questions? Email{' '}
            <a
              href={`mailto:${DEMO_CONFIG.supportEmail}`}
              className="font-semibold text-accent underline-offset-4 hover:underline"
            >
              {DEMO_CONFIG.supportEmail}
            </a>
            . This demo is not a live parking operator.
          </p>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-text">{t('privacy.title')}</h3>
        </div>
        <p className="text-[11px] leading-relaxed text-muted">{db.settings.privacyRetentionText}</p>
        {user.consentAt ? (
          <p className="mt-3 flex items-center gap-2 text-[11px] text-success">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Consent captured {formatDate(user.consentAt)}
          </p>
        ) : null}
      </Card>

      <Card className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-accent" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-text">Session</h3>
        </div>
        <p className="text-[11px] leading-relaxed text-muted">
          Idle logout is {role === 'admin' ? '10 minutes' : '30 minutes'}. A warning appears one minute before
          sign-out. Session persistence follows the “remember this device” choice.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button
            variant="secondary"
            iconLeft={<ArrowLeftRight className="h-4 w-4" />}
            onClick={() => {
              switchRole()
              navigate('/choose-role')
            }}
          >
            Switch role
          </Button>
          <Button variant="danger" iconLeft={<LogOut className="h-4 w-4" />} onClick={() => setSignOutOpen(true)}>
            Sign out
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-accent" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-text">About ParkSure</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DemoBadge />
          <StatusBadge tone="info" label="v1.0.0 demo" />
        </div>
        <p className="mt-3 rounded-xl border border-accent/20 bg-accent/8 px-3 py-2 text-xs font-semibold text-text">
          Demo mode: simulated data
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          ParkSure is a mobile-first smart-parking prototype. Sensors, cameras, ANPR, gates, maps, payments and
          GST invoices are simulated. Nothing is sent to a real payment network.
        </p>
        <SimulatedDataNote className="mt-3" />
      </Card>

      <ProfileEditSheet open={profileOpen} onClose={() => setProfileOpen(false)} user={user} role={role} />

      <BottomSheet
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        title="Sign out?"
        description="Your demo data stays in this browser. You can sign back in with the same credentials."
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" size="lg" onClick={() => setSignOutOpen(false)}>
              Stay signed in
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={() => {
                signOut()
                toast({ tone: 'info', title: 'Signed out', message: 'Your demo data stays in this browser.' })
                navigate('/sign-in', { replace: true })
              }}
            >
              Sign out
            </Button>
          </div>
        }
      >
        <p className="pb-2 text-sm leading-relaxed text-muted">
          The demo resets nothing when you sign out. Payments, bookings and audit events remain available for the
          next session.
        </p>
      </BottomSheet>
    </div>
  )
}
