import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  BadgeIndianRupee,
  Car,
  CheckCircle2,
  CreditCard,
  Languages,
  MapPinned,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { DemoBadge, SimulatedDataNote } from '@/components/ui/DemoBadge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ROLE_META, ROLE_ORDER } from '@/utils/roles'
import { formatCurrency } from '@/utils/format'

const previewPlaces = [
  { name: 'Park Street Centre', area: 'Park Street', price: 60, free: 5, total: 12, tone: 'gold' as const },
  { name: 'Salt Lake Sector V', area: 'Wipro Circle', price: 40, free: 9, total: 16, tone: 'violet' as const },
  { name: 'Howrah Station Forecourt', area: 'Howrah', price: 35, free: 4, total: 10, tone: 'green' as const },
  { name: 'Maidan – Victoria Memorial', area: 'Maidan', price: 30, free: 18, total: 30, tone: 'blue' as const },
]

const features = [
  {
    icon: Zap,
    title: 'Live bay availability',
    body: 'Sensor-fused bay states, confidence scores and camera estimates for open grounds — all simulated locally.',
  },
  {
    icon: BadgeIndianRupee,
    title: 'Dynamic Kolkata pricing',
    body: 'Occupancy, weekday peaks and night windows adjust the hourly rate with a visible base, multiplier and reason.',
  },
  {
    icon: MapPinned,
    title: 'Maps and navigation',
    body: 'OpenStreetMap pins for every place, locate-me, and one-tap OpenStreetMap driving directions.',
  },
  {
    icon: Users,
    title: 'One account, four roles',
    body: 'Driver, Attendant, Operator and Administrator workspaces share one login and one design system.',
  },
  {
    icon: ReceiptText,
    title: 'Payments, GST and refunds',
    body: 'UPI, cards, FASTag and attendant cash, with idempotent payments, GST receipts, PDFs and refunds.',
  },
  {
    icon: MessageCircle,
    title: 'On-device support assistant',
    body: 'ParkSure Assist answers from a built-in help library and your live app context. No external AI call.',
  },
]

const steps = [
  { title: 'Pick a place', body: 'Compare live free bays, distance and the current demand rate on the list or map.' },
  { title: 'Book and pay', body: 'Choose a duration and vehicle, pay with a saved method, then reveal the parking pass.' },
  { title: 'Park and exit', body: 'Follow the live trip timer, extend if needed, and collect a GST receipt in your wallet.' },
]

const toneClasses = {
  gold: 'border-accent/25 bg-accent/10 text-accent',
  violet: 'border-violet/25 bg-violet/10 text-violet',
  green: 'border-success/25 bg-success/10 text-success',
  blue: 'border-info/25 bg-info/10 text-info',
}

export default function LandingPage() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <a
        href="#landing-main"
        className="focus-ring fixed left-3 top-3 z-[100] -translate-y-24 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-ink transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
        style={{
          backgroundImage:
            'radial-gradient(900px 520px at 82% -10%, rgb(var(--accent) / .15), transparent 62%), radial-gradient(760px 520px at -10% 24%, rgb(var(--violet) / .11), transparent 64%)',
        }}
      />

      <header className="safe-top sticky top-0 z-30">
        <div className="glass border-b border-line/70">
          <div className="mx-auto flex h-[66px] w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link to="/" className="focus-ring flex items-center gap-2.5 rounded-xl" aria-label="ParkSure home">
              <Logo size={34} showWordmark={false} />
              <span className="font-display text-[1.12rem] font-semibold tracking-tighter2 text-text">
                Park<span className="text-accent">Sure</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <DemoBadge className="hidden sm:inline-flex" />
              <Link
                to="/sign-in"
                className="focus-ring inline-flex min-h-11 items-center rounded-xl border border-line/80 bg-raised px-4 text-[12px] font-semibold text-text hover:border-accent/35"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main id="landing-main">
        <section className="mx-auto grid w-full max-w-5xl gap-8 px-5 pb-10 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-12">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Kolkata · smart parking demo
              </span>
              <DemoBadge />
            </div>
            <h1 className="font-display text-[2.9rem] font-semibold leading-[0.98] tracking-tighter2 text-text sm:text-[4.2rem]">
              Park without
              <br />
              the wait.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              Find a live bay around Park Street, Salt Lake, Howrah or the Maidan, see the real-time demand rate, and pay
              in seconds. Then switch into the gate, lot or admin workspace — one account, four roles, one premium
              interface.
            </p>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Link to="/sign-in" className="focus-ring block">
                <Button size="lg" className="w-full sm:w-auto" iconRight={<ArrowRight className="h-4 w-4" />}>
                  Explore the live demo
                </Button>
              </Link>
              <Link to="/register" className="focus-ring block">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto" iconLeft={<Car className="h-4 w-4" />}>
                  Create a driver account
                </Button>
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                No real payments
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                Runs in your browser
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                PWA + Android
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Card strong className="overflow-hidden p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="label-caps">Live near you</div>
                  <div className="mt-1 font-display text-lg font-semibold tracking-tight text-text">Kolkata network</div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  Simulated live
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {previewPlaces.map((place) => (
                  <div
                    key={place.name}
                    className="flex items-center gap-3 rounded-2xl border border-line/80 bg-raised/40 p-3"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${toneClasses[place.tone]}`}
                      aria-hidden="true"
                    >
                      <Car className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-text">{place.name}</div>
                      <div className="mt-0.5 text-[10px] text-muted">
                        {place.area} · {place.free} of {place.total} free
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold text-text">{formatCurrency(place.price)}</div>
                      <div className="text-[9px] uppercase tracking-[0.1em] text-muted">per hour</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/8 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-text">Demo mode: simulated data</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                  Sensors, cameras, gates, maps and payments are simulated. Nothing is sent to a real network.
                </p>
              </div>
            </Card>
          </motion.div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 sm:py-12" aria-labelledby="features-title">
          <div className="mb-5">
            <div className="label-caps">Everything in one demo</div>
            <h2 id="features-title" className="mt-1 font-display text-2xl font-semibold tracking-tighter2 text-text sm:text-3xl">
              Built like a real parking product.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Card key={feature.title} className="p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-text">{feature.title}</h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{feature.body}</p>
                </Card>
              )
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 sm:py-12" aria-labelledby="how-title">
          <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <div>
              <div className="label-caps">The parking loop</div>
              <h2 id="how-title" className="mt-1 font-display text-2xl font-semibold tracking-tighter2 text-text sm:text-3xl">
                Three steps. No queue.
              </h2>
              <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted">
                The driver experience covers the full loop: discover, book, pay, reveal a pass, park, extend and exit with
                a receipt.
              </p>
              <Link to="/sign-in" className="focus-ring mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl text-xs font-semibold text-accent">
                Try the driver demo
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {steps.map((step, index) => (
                <Card key={step.title} className="p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/25 bg-accent/10 font-mono text-sm font-semibold text-accent">
                    {index + 1}
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-text">{step.title}</h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{step.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 sm:py-12" aria-labelledby="roles-title">
          <div className="mb-5">
            <div className="label-caps">One account</div>
            <h2 id="roles-title" className="mt-1 font-display text-2xl font-semibold tracking-tighter2 text-text sm:text-3xl">
              Four workspaces. One design system.
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
              Sign in once, then choose the workspace you need. The web app, PWA and Android build share the same
              features, components and interaction patterns.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ROLE_ORDER.map((role) => {
              const meta = ROLE_META[role]
              return (
                <Card key={role} className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line/80 bg-raised text-accent">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-text">{meta.label}</div>
                      <div className="text-[10px] text-muted">{meta.description}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-muted">{meta.unlocks}</p>
                </Card>
              )
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-5 pb-14 pt-6 sm:px-6 sm:pb-20">
          <Card strong className="relative overflow-hidden p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
            <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <div className="label-caps">Ready when you are</div>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tighter2 text-text sm:text-3xl">
                  Explore every role in under a minute.
                </h2>
                <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted">
                  Use the demo accounts on the sign-in screen. The OTP and password are shown in the app, and nothing is
                  sent anywhere.
                </p>
              </div>
              <Link to="/sign-in" className="focus-ring block w-full shrink-0 sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto" iconRight={<ArrowRight className="h-4 w-4" />}>
                  Open the demo
                </Button>
              </Link>
            </div>
            <div className="relative mt-5 grid gap-2 text-[11px] text-muted sm:grid-cols-3">
              <span className="inline-flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                Simulated UPI, card, FASTag and cash
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                English, বাংলা and हिन्दी navigation
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                Privacy-first, local-only data
              </span>
            </div>
          </Card>
          <SimulatedDataNote className="mt-4 justify-center text-center" />
        </section>
      </main>

      <SiteFooter className="max-w-5xl px-5 pt-6 sm:px-6" />
    </div>
  )
}
