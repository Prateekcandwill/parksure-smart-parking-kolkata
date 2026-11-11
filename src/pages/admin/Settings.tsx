import { useState } from 'react'
import {
  BadgeCheck,
  Building2,
  CircleHelp,
  FlaskConical,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react'
import type {
  ConfidenceThresholds,
  PaymentMethod,
  PlaceKind,
  Role,
  User,
} from '@/types'
import { useDB } from '@/api/useDB'
import { resetDB } from '@/api/db'
import {
  addPlace,
  addStaff,
  getAllUsers,
  saveAdminConfig,
  updateUserRoles,
  validateAdminConfig,
  type AdminConfigInput,
} from '@/api/admin'
import { paymentMethodNames } from '@/api/payments'
import { DEMO_CONFIG } from '@/config/env'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatTile } from '@/components/common/StatTile'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { TextField, TextAreaField } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Switch } from '@/components/ui/Switch'
import { DemoBadge, SimulatedDataNote } from '@/components/ui/DemoBadge'
import { ROLE_META, ROLE_ORDER } from '@/utils/roles'
import { formatCurrency, formatDate } from '@/utils/format'
import { haptic } from '@/utils/haptics'
import { toast } from '@/store/toast'

type Tab = 'config' | 'users' | 'places' | 'about'

const thresholdFields: Array<{ key: keyof ConfidenceThresholds; label: string; hint: string }> = [
  { key: 'occupied', label: 'Occupied floor', hint: 'Confidence needed to treat a bay as occupied.' },
  { key: 'free', label: 'Free floor', hint: 'Confidence needed to show a bay as free.' },
  { key: 'reservationLock', label: 'Reservation lock', hint: 'Confidence needed to hold a bay for a booking.' },
  { key: 'pricing', label: 'Pricing floor', hint: 'Occupancy percentage where demand pricing starts.' },
  { key: 'lowConfidence', label: 'Low-confidence alert', hint: 'Below this, the bay becomes unknown and alerts fire.' },
]

const paymentMethods: PaymentMethod[] = ['upi', 'qr', 'card', 'debit', 'fastag', 'cash']

const placeKinds: Array<{ value: PlaceKind; label: string }> = [
  { value: 'multistory', label: 'Multistory' },
  { value: 'surface', label: 'Surface' },
  { value: 'ground', label: 'Open ground' },
]

function buildForm(db: ReturnType<typeof useDB>): AdminConfigInput {
  return {
    thresholds: { ...db.settings.thresholds },
    paymentMethods: { ...db.settings.paymentMethods },
    privacyRetentionText: db.settings.privacyRetentionText,
    placePrices: Object.fromEntries(db.places.map((place) => [place.id, place.pricePerHour])),
    placeActive: Object.fromEntries(db.places.map((place) => [place.id, place.active])),
  }
}

export default function AdminSettingsPage() {
  const db = useDB()
  const user = useCurrentUser()
  const [tab, setTab] = useState<Tab>('config')
  const [form, setForm] = useState<AdminConfigInput>(() => buildForm(db))
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const [roleTarget, setRoleTarget] = useState<User | null>(null)
  const [roleDraft, setRoleDraft] = useState<Role[]>([])
  const [roleReason, setRoleReason] = useState('')
  const [roleSaving, setRoleSaving] = useState(false)

  const [staffOpen, setStaffOpen] = useState(false)
  const [staffName, setStaffName] = useState('')
  const [staffEmail, setStaffEmail] = useState('')
  const [staffPhone, setStaffPhone] = useState('')
  const [staffRoles, setStaffRoles] = useState<Role[]>(['attendant'])
  const [staffReason, setStaffReason] = useState('')
  const [staffSaving, setStaffSaving] = useState(false)

  const [placeOpen, setPlaceOpen] = useState(false)
  const [placeName, setPlaceName] = useState('')
  const [placeKind, setPlaceKind] = useState<PlaceKind>('surface')
  const [placeAddress, setPlaceAddress] = useState('')
  const [placePrice, setPlacePrice] = useState('40')
  const [placeBays, setPlaceBays] = useState('20')
  const [placeReason, setPlaceReason] = useState('')
  const [placeSaving, setPlaceSaving] = useState(false)

  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  const users = getAllUsers()
  const validationError = validateAdminConfig(form)

  if (!user) return null

  const setThreshold = (key: keyof ConfidenceThresholds, value: string) => {
    const numeric = Number(value)
    setForm((current) => ({
      ...current,
      thresholds: { ...current.thresholds, [key]: Number.isFinite(numeric) ? numeric : 0 },
    }))
  }

  const saveConfig = async () => {
    if (validationError) {
      toast({ tone: 'warning', title: 'Check the configuration', message: validationError })
      return
    }
    if (reason.trim().length < 3) {
      toast({ tone: 'warning', title: 'Reason required', message: 'Add at least 3 characters for the audit trail.' })
      return
    }
    setSaving(true)
    try {
      await saveAdminConfig({ config: form, actor: user, reason: reason.trim() })
      haptic('success')
      toast({ tone: 'success', title: 'Configuration saved', message: 'Audited and applied immediately.' })
      setReason('')
    } catch (caught) {
      toast({
        tone: 'error',
        title: 'Could not save',
        message: caught instanceof Error ? caught.message : 'Try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  const openRoles = (target: User) => {
    haptic('tap')
    setRoleTarget(target)
    setRoleDraft([...target.roles])
    setRoleReason('')
  }

  const saveRoles = async () => {
    if (!roleTarget) return
    if (roleDraft.length === 0) {
      toast({ tone: 'warning', title: 'Pick at least one role', message: 'A user needs access to something.' })
      return
    }
    setRoleSaving(true)
    try {
      await updateUserRoles({
        userId: roleTarget.id,
        roles: roleDraft,
        actor: user,
        reason: roleReason.trim() || 'Role management',
      })
      haptic('success')
      toast({ tone: 'success', title: 'Roles updated', message: roleTarget.name })
      setRoleTarget(null)
    } catch (caught) {
      toast({
        tone: 'error',
        title: 'Could not update roles',
        message: caught instanceof Error ? caught.message : 'Try again.',
      })
    } finally {
      setRoleSaving(false)
    }
  }

  const saveStaff = async () => {
    setStaffSaving(true)
    try {
      await addStaff({
        name: staffName,
        email: staffEmail,
        phone: staffPhone,
        roles: staffRoles,
        actor: user,
        reason: staffReason.trim() || 'New staff onboarding',
      })
      haptic('success')
      toast({ tone: 'success', title: 'Staff account created', message: staffEmail })
      setStaffOpen(false)
      setStaffName('')
      setStaffEmail('')
      setStaffPhone('')
      setStaffRoles(['attendant'])
      setStaffReason('')
    } catch (caught) {
      toast({
        tone: 'error',
        title: 'Could not create the account',
        message: caught instanceof Error ? caught.message : 'Try again.',
      })
    } finally {
      setStaffSaving(false)
    }
  }

  const savePlace = async () => {
    setPlaceSaving(true)
    try {
      await addPlace({
        name: placeName,
        kind: placeKind,
        address: placeAddress,
        pricePerHour: Number(placePrice),
        totalBays: Number(placeBays),
        actor: user,
        reason: placeReason.trim() || 'New place onboarding',
      })
      haptic('success')
      toast({ tone: 'success', title: 'Place created', message: placeName })
      setPlaceOpen(false)
      setPlaceName('')
      setPlaceAddress('')
      setPlacePrice('40')
      setPlaceBays('20')
      setPlaceReason('')
    } catch (caught) {
      toast({
        tone: 'error',
        title: 'Could not create the place',
        message: caught instanceof Error ? caught.message : 'Try again.',
      })
    } finally {
      setPlaceSaving(false)
    }
  }

  const doReset = async () => {
    setResetting(true)
    try {
      const next = resetDB()
      setForm(buildForm(next))
      setReason('')
      haptic('success')
      toast({ tone: 'success', title: 'Demo data reset', message: 'Seed users, bays, payments and audit trail restored.' })
      setResetOpen(false)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Settings"
        title="Administration"
        description="Thresholds, payments, pricing, people and places — every change is reason-gated and audited."
        action={<DemoBadge />}
      />

      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
        <StatTile label="Users" value={String(users.length)} icon={<Users className="h-4 w-4" />} tone="info" />
        <StatTile
          label="Places"
          value={String(db.places.length)}
          icon={<Building2 className="h-4 w-4" />}
          tone="accent"
        />
        <StatTile
          label="Audit events"
          value={String(db.auditEvents.length)}
          icon={<ShieldCheck className="h-4 w-4" />}
          tone="success"
        />
      </div>

      <SegmentedControl
        ariaLabel="Administration sections"
        value={tab}
        onChange={(value) => {
          haptic('tap')
          setTab(value)
        }}
        options={[
          { value: 'config', label: 'Config' },
          { value: 'users', label: 'Users' },
          { value: 'places', label: 'Places' },
          { value: 'about', label: 'About' },
        ]}
      />

      {tab === 'config' ? (
        <>
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-accent" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-text">Confidence thresholds</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {thresholdFields.map((field) => (
                <TextField
                  key={field.key}
                  label={field.label}
                  type="number"
                  inputMode="numeric"
                  value={String(form.thresholds[field.key])}
                  onChange={(event) => setThreshold(field.key, event.target.value)}
                  hint={field.hint}
                />
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-accent" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-text">Payment methods</h3>
            </div>
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <Switch
                  key={method}
                  checked={form.paymentMethods[method]}
                  onChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      paymentMethods: { ...current.paymentMethods, [method]: checked },
                    }))
                  }
                  label={paymentMethodNames[method]}
                  description={
                    method === 'cash'
                      ? 'Attendant-only. Never available for pre-booked slots.'
                      : method === 'fastag'
                        ? 'Requires a linked FASTag and sufficient balance.'
                        : 'Shown in the driver payment sheet when enabled.'
                  }
                />
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              At least one online method must stay enabled. Cash is always blocked for pre-booked slots.
            </p>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-text">Privacy retention</h3>
            </div>
            <TextAreaField
              label="Retention wording"
              value={form.privacyRetentionText}
              onChange={(event) =>
                setForm((current) => ({ ...current, privacyRetentionText: event.target.value }))
              }
              rows={4}
              hint="Shown on every account screen. At least 20 characters."
            />
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Save className="h-4 w-4 text-accent" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-text">Reason for change</h3>
            </div>
            <TextField
              label="Reason"
              placeholder="Quarterly pricing review"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              hint="Required. Written to the hash-chained audit trail."
            />
            {validationError ? (
              <p className="mt-3 rounded-xl border border-warning/30 bg-warning/8 px-3 py-2 text-xs text-warning" role="alert">
                {validationError}
              </p>
            ) : (
              <p className="mt-3 rounded-xl border border-success/25 bg-success/8 px-3 py-2 text-xs text-success">
                Configuration is valid and ready to save.
              </p>
            )}
            <Button
              className="mt-4 w-full"
              size="lg"
              loading={saving}
              iconLeft={<Save className="h-4 w-4" />}
              onClick={() => void saveConfig()}
            >
              Save configuration
            </Button>
          </Card>
        </>
      ) : null}

      {tab === 'users' ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-text">People & roles</h2>
            <Button size="sm" iconLeft={<Plus className="h-4 w-4" />} onClick={() => setStaffOpen(true)}>
              Add staff
            </Button>
          </div>
          <ul className="space-y-3">
            {users.map((member) => (
              <li key={member.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-text">{member.name}</span>
                        {member.id === user.id ? <StatusBadge tone="info" label="You" /> : null}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-muted">{member.email}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted">
                        {member.staffId ?? 'Driver account'} · joined {formatDate(member.createdAt)}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {member.roles.map((role) => (
                          <span
                            key={role}
                            className="rounded-full border border-line/80 bg-raised/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted"
                          >
                            {ROLE_META[role].short}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => openRoles(member)}>
                      Edit roles
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {tab === 'places' ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-text">Places & pricing</h2>
            <Button size="sm" iconLeft={<Plus className="h-4 w-4" />} onClick={() => setPlaceOpen(true)}>
              Add place
            </Button>
          </div>
          <ul className="space-y-3">
            {db.places.map((place) => (
              <li key={place.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-text">{place.name}</span>
                        <StatusBadge tone={place.active ? 'success' : 'neutral'} label={place.active ? 'Active' : 'Paused'} />
                        {place.cameraOnly ? <StatusBadge tone="warning" label="Camera only" /> : null}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted">
                        {place.kind} · {place.totalBays} bays · {place.address}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <TextField
                      label="Hourly price"
                      type="number"
                      inputMode="decimal"
                      value={String(form.placePrices[place.id] ?? place.pricePerHour)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          placePrices: {
                            ...current.placePrices,
                            [place.id]: Number(event.target.value),
                          },
                        }))
                      }
                      hint={formatCurrency(form.placePrices[place.id] ?? place.pricePerHour)}
                    />
                    <div className="flex items-end pb-1">
                      <Switch
                        checked={form.placeActive[place.id] ?? place.active}
                        onChange={(checked) =>
                          setForm((current) => ({
                            ...current,
                            placeActive: { ...current.placeActive, [place.id]: checked },
                          }))
                        }
                        label="Accepting bookings"
                      />
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <Card className="p-5">
            <p className="text-[11px] leading-relaxed text-muted">
              Price and active changes are saved with the configuration on the Config tab. Open the Config tab, add a
              reason and save to apply them.
            </p>
            <Button
              className="mt-3 w-full"
              variant="secondary"
              onClick={() => {
                haptic('tap')
                setTab('config')
              }}
            >
              Go to configuration
            </Button>
          </Card>

          <Card className="border-danger/30 p-5">
            <div className="mb-2 flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-danger" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-text">Reset demo data</h3>
            </div>
            <p className="text-[11px] leading-relaxed text-muted">
              Restores the seeded users, places, bays, payments, receipts, shifts and audit chain. Your session stays
              signed in. This cannot be undone.
            </p>
            <Button
              className="mt-3 w-full"
              variant="danger"
              iconLeft={<RotateCcw className="h-4 w-4" />}
              onClick={() => setResetOpen(true)}
            >
              Reset everything
            </Button>
          </Card>
        </>
      ) : null}

      {tab === 'about' ? (
        <>
          <Card strong className="p-5">
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
              Every sensor, camera, ANPR read, barrier, map, payment and GST invoice in this build is simulated and
              stored in this browser. Nothing is sent to a real payment network, parking operator or bank.
            </p>
            <SimulatedDataNote className="mt-3" />
          </Card>

          <Card className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <CircleHelp className="h-4 w-4 text-accent" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-text">Demo credentials</h3>
            </div>
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-muted">
              <li>
                <span className="font-mono text-text">driver@demo</span> · driver
              </li>
              <li>
                <span className="font-mono text-text">attendant@demo</span> · attendant
              </li>
              <li>
                <span className="font-mono text-text">operator@demo</span> · operator
              </li>
              <li>
                <span className="font-mono text-text">admin@demo</span> · all roles
              </li>
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              OTP <span className="font-mono text-text">{DEMO_CONFIG.otp}</span> · password{' '}
              <span className="font-mono text-text">{DEMO_CONFIG.password}</span>
            </p>
          </Card>
        </>
      ) : null}

      <BottomSheet
        open={Boolean(roleTarget)}
        onClose={() => setRoleTarget(null)}
        title={`Edit roles · ${roleTarget?.name ?? ''}`}
        description="Role guards apply immediately on every route."
        footer={
          <Button size="lg" className="w-full" loading={roleSaving} onClick={() => void saveRoles()}>
            Save roles
          </Button>
        }
      >
        <div className="space-y-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {ROLE_ORDER.map((role) => (
              <Chip
                key={role}
                active={roleDraft.includes(role)}
                onClick={() => {
                  haptic('tap')
                  setRoleDraft((current) =>
                    current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
                  )
                }}
              >
                {ROLE_META[role].label}
              </Chip>
            ))}
          </div>
          <TextField
            label="Reason"
            placeholder="Promoted to operator for weekend coverage"
            value={roleReason}
            onChange={(event) => setRoleReason(event.target.value)}
          />
        </div>
      </BottomSheet>

      <BottomSheet
        open={staffOpen}
        onClose={() => setStaffOpen(false)}
        title="Add staff account"
        description="New staff sign in with the demo OTP or password."
        footer={
          <Button size="lg" className="w-full" loading={staffSaving} onClick={() => void saveStaff()}>
            Create account
          </Button>
        }
      >
        <div className="space-y-3 pb-2">
          <TextField label="Full name" value={staffName} onChange={(event) => setStaffName(event.target.value)} />
          <TextField
            label="Email"
            type="email"
            value={staffEmail}
            onChange={(event) => setStaffEmail(event.target.value)}
            placeholder="name@parksure.demo"
          />
          <TextField
            label="Phone"
            inputMode="numeric"
            value={staffPhone}
            onChange={(event) => setStaffPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="9876500005"
          />
          <div>
            <div className="label-caps mb-2">Roles</div>
            <div className="flex flex-wrap gap-2">
              {ROLE_ORDER.map((role) => (
                <Chip
                  key={role}
                  active={staffRoles.includes(role)}
                  onClick={() => {
                    haptic('tap')
                    setStaffRoles((current) =>
                      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
                    )
                  }}
                >
                  {ROLE_META[role].label}
                </Chip>
              ))}
            </div>
          </div>
          <TextField
            label="Reason"
            placeholder="New gate attendant"
            value={staffReason}
            onChange={(event) => setStaffReason(event.target.value)}
          />
        </div>
      </BottomSheet>

      <BottomSheet
        open={placeOpen}
        onClose={() => setPlaceOpen(false)}
        title="Add a parking place"
        description="Ground places are camera-only. Other kinds get simulated bays and sensors."
        footer={
          <Button size="lg" className="w-full" loading={placeSaving} onClick={() => void savePlace()}>
            Create place
          </Button>
        }
      >
        <div className="space-y-3 pb-2">
          <TextField label="Name" value={placeName} onChange={(event) => setPlaceName(event.target.value)} />
          <div>
            <div className="label-caps mb-2">Kind</div>
            <div className="flex flex-wrap gap-2">
              {placeKinds.map((kind) => (
                <Chip
                  key={kind.value}
                  active={placeKind === kind.value}
                  onClick={() => {
                    haptic('tap')
                    setPlaceKind(kind.value)
                  }}
                >
                  {kind.label}
                </Chip>
              ))}
            </div>
          </div>
          <TextField label="Address" value={placeAddress} onChange={(event) => setPlaceAddress(event.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Price / hour"
              type="number"
              inputMode="decimal"
              value={placePrice}
              onChange={(event) => setPlacePrice(event.target.value)}
            />
            <TextField
              label="Total bays"
              type="number"
              inputMode="numeric"
              value={placeBays}
              onChange={(event) => setPlaceBays(event.target.value)}
            />
          </div>
          <TextField
            label="Reason"
            placeholder="New mall partnership"
            value={placeReason}
            onChange={(event) => setPlaceReason(event.target.value)}
          />
        </div>
      </BottomSheet>

      <BottomSheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset the demo database?"
        description="This restores the seed data and discards every change made in this browser."
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" size="lg" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="lg" loading={resetting} onClick={() => void doReset()}>
              Reset data
            </Button>
          </div>
        }
      >
        <div className="space-y-3 pb-2">
          <div className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/8 p-3 text-xs leading-relaxed text-danger">
            <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Bookings, payments, alerts, shifts and audit events created in this browser will be removed.
          </div>
          {db.places.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" aria-hidden="true" />}
              title="No places"
              body="Resetting restores the four seeded places."
            />
          ) : null}
        </div>
      </BottomSheet>
    </div>
  )
}
