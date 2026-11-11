import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { PageMeta, type PageMetaProps } from '@/components/seo/PageMeta'
import { track } from '@/utils/analytics'

interface RouteMetaEntry extends Omit<PageMetaProps, 'path'> {
  match: (pathname: string) => boolean
}

const supportMeta = {
  title: 'ParkSure Assist · Support',
  description: 'Ask the on-device ParkSure assistant about bookings, prices, payments, gates and your workspace.',
  noindex: true,
} satisfies Omit<PageMetaProps, 'path'>

const entries: RouteMetaEntry[] = [
  {
    match: (path) => path === '/',
    title: 'ParkSure — Smart parking in Kolkata, without the wait',
    description:
      'Find live parking around Park Street, Salt Lake, Howrah and the Maidan. Dynamic prices, OpenStreetMap directions, booking, GST receipts and four workspaces in one demo.',
  },
  {
    match: (path) => path === '/sign-in',
    title: 'Sign in · ParkSure',
    description:
      'Sign in with a demo OTP or password and choose Driver, Attendant, Operator or Administrator. One account unlocks every workspace.',
  },
  {
    match: (path) => path === '/register',
    title: 'Create a driver account · ParkSure',
    description:
      'Create a ParkSure driver account with a West Bengal plate and consent. The demo stores everything locally in your browser.',
  },
  {
    match: (path) => path === '/privacy',
    title: 'Privacy policy · ParkSure',
    description:
      'How ParkSure handles local storage, consent, analytics, vehicle plates, parking sessions, receipts and your privacy choices.',
  },
  {
    match: (path) => path === '/terms',
    title: 'Terms and conditions · ParkSure',
    description:
      'The terms for using the ParkSure demo: simulated sensors, gates and payments, acceptable use, liability and governing law.',
  },
  {
    match: (path) => path === '/choose-role',
    title: 'Choose a workspace · ParkSure',
    description: 'Pick a parking workspace. Only roles on your account are unlocked.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/driver/support'),
    ...supportMeta,
  },
  {
    match: (path) => path.startsWith('/attendant/support'),
    ...supportMeta,
  },
  {
    match: (path) => path.startsWith('/operator/support'),
    ...supportMeta,
  },
  {
    match: (path) => path.startsWith('/admin/support'),
    ...supportMeta,
  },
  {
    match: (path) => path.startsWith('/driver/find'),
    title: 'Find parking · ParkSure',
    description: 'Live Kolkata parking with list and map views, dynamic prices and one-tap booking.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/driver/place'),
    title: 'Place details · ParkSure',
    description: 'Live bays, demand pricing, parking rules and OpenStreetMap directions for this Kolkata place.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/driver/book'),
    title: 'Book a bay · ParkSure',
    description: 'See live bays, the demand price breakdown and pay for a parking session.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/driver/trip'),
    title: 'Your trip · ParkSure',
    description: 'Your live parking pass, timer, map and exit controls.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/driver/wallet'),
    title: 'Wallet and receipts · ParkSure',
    description: 'Saved payment methods, FASTag balance, GST receipts and refunds.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/driver/me'),
    title: 'Your account · ParkSure',
    description: 'Edit your profile, review vehicles, preferences, privacy and session controls.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/attendant/gate'),
    title: 'Gate console · ParkSure',
    description: 'ANPR gate decisions, plate checks and cash collection.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/attendant/me'),
    title: 'Your account · ParkSure',
    description: 'Your attendant profile, assigned places, shift notes and session controls.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/operator/lot'),
    title: 'Lot overview · ParkSure',
    description: 'Live bay state, exceptions and reservations for your assigned Kolkata lot.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/operator/alerts'),
    title: 'Alerts · ParkSure',
    description: 'Acknowledge, assign and resolve live lot exceptions.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/operator/log'),
    title: 'Event log · ParkSure',
    description: 'Gate events, payments and audit slices for your lot.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/operator/cash'),
    title: 'Cash reconciliation · ParkSure',
    description: 'Count cash, explain variances and close the shift with an audited record.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/operator/me'),
    title: 'Your account · ParkSure',
    description: 'Your operator profile, assigned places, preferences and session controls.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/admin/analytics'),
    title: 'Usage analytics · ParkSure',
    description: 'Privacy-first, local-only usage analytics for the demo.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/admin/settings'),
    title: 'Global settings · ParkSure',
    description: 'Thresholds, payment methods, people and places for the demo.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/admin/log'),
    title: 'Audit trail · ParkSure',
    description: 'The hash-chained audit trail for every privileged action in the demo.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/admin/me'),
    title: 'Your account · ParkSure',
    description: 'Your administrator profile, preferences and session controls.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/admin'),
    title: 'Administration · ParkSure',
    description: 'Thresholds, payment methods, people, places and the hash-chained audit trail.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/attendant'),
    title: 'Gate console · ParkSure',
    description: 'ANPR gate decisions, plate checks and cash collection.',
    noindex: true,
  },
  {
    match: (path) => path.startsWith('/operator'),
    title: 'Lot operations · ParkSure',
    description: 'Live lot state, exceptions, event logs and cash reconciliation.',
    noindex: true,
  },
]

const fallback: Omit<PageMetaProps, 'path'> = {
  title: 'Page not found · ParkSure',
  description: 'That page is not part of the ParkSure demo. Head back to a workspace or sign in again.',
  noindex: true,
}

function resolve(pathname: string): Omit<PageMetaProps, 'path'> {
  return entries.find((entry) => entry.match(pathname)) ?? fallback
}

export function RouteMeta() {
  const { pathname } = useLocation()
  const meta = resolve(pathname)

  useEffect(() => {
    track('page_view', { path: pathname })
  }, [pathname])

  return <PageMeta {...meta} path={pathname} />
}
