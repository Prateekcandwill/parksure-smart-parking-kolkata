import { useEffect, useState } from 'react'
import { BadgeCheck, Mail, Phone, UserRound } from 'lucide-react'
import type { Role, User } from '@/types'
import { AuthError, updateProfile } from '@/api/auth'
import { toast } from '@/store/toast'
import { avatarTones, profileSchema, type ProfileInput } from '@/utils/validation'
import { haptic } from '@/utils/haptics'
import { Avatar } from '@/components/ui/Avatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Input'
import { cn } from '@/utils/cn'

interface ProfileEditSheetProps {
  open: boolean
  onClose: () => void
  user: User
  role: Role
}

const toneLabels: Record<(typeof avatarTones)[number], string> = {
  gold: 'Gold',
  violet: 'Violet',
  green: 'Green',
  blue: 'Blue',
}

const emptyErrors: Partial<Record<keyof ProfileInput, string>> = {}

export function ProfileEditSheet({ open, onClose, user, role }: ProfileEditSheetProps) {
  const [form, setForm] = useState<ProfileInput>({
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarTone: user.avatarTone ?? 'gold',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileInput, string>>>(emptyErrors)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarTone: user.avatarTone ?? 'gold',
    })
    setErrors(emptyErrors)
    setSaving(false)
  }, [open, user])

  const update = <Key extends keyof ProfileInput>(key: Key, value: ProfileInput[Key]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const submit = async () => {
    const parsed = profileSchema.safeParse(form)
    if (!parsed.success) {
      const next: Partial<Record<keyof ProfileInput, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ProfileInput | undefined
        if (key && !next[key]) next[key] = issue.message
      }
      setErrors(next)
      haptic('error')
      toast({
        tone: 'error',
        title: 'Check the highlighted fields',
        message: 'Use a valid name, email address and Indian mobile number.',
      })
      return
    }

    setSaving(true)
    try {
      await updateProfile(user.id, parsed.data, role)
      haptic('success')
      toast({
        tone: 'success',
        title: 'Profile updated',
        message: 'Your name, contact details and avatar tone are saved in this browser.',
      })
      onClose()
    } catch (caught) {
      const message =
        caught instanceof AuthError || caught instanceof Error ? caught.message : 'Could not save the profile.'
      setErrors({ email: message })
      haptic('error')
      toast({ tone: 'error', title: 'Profile not saved', message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Edit profile"
      description="Changes apply to every workspace on this account and are recorded in the audit trail."
      size="lg"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" size="lg" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="lg" loading={saving} onClick={() => void submit()} iconLeft={<BadgeCheck className="h-4 w-4" />}>
            Save changes
          </Button>
        </div>
      }
    >
      <div className="space-y-5 pb-2">
        <div className="flex items-center gap-4 rounded-2xl border border-line/80 bg-raised/40 p-4">
          <Avatar name={form.name || user.name} tone={form.avatarTone} size="lg" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text">{form.name || 'Your name'}</div>
            <div className="mt-0.5 truncate text-[11px] text-muted">{form.email || 'you@example.com'}</div>
            <div className="mt-1 font-mono text-[11px] text-muted">{form.phone || '10-digit mobile'}</div>
          </div>
        </div>

        <TextField
          label="Full name"
          value={form.name}
          onChange={(event) => update('name', event.target.value)}
          icon={<UserRound className="h-4 w-4" />}
          autoComplete="name"
          maxLength={60}
          error={errors.name}
          hint="Shown on the top bar, account panel and receipts."
        />
        <TextField
          label="Email address"
          type="email"
          value={form.email}
          onChange={(event) => update('email', event.target.value)}
          icon={<Mail className="h-4 w-4" />}
          autoComplete="email"
          inputMode="email"
          maxLength={120}
          error={errors.email}
          hint="Used only to identify this demo account. No email is ever sent."
        />
        <TextField
          label="Mobile number"
          type="tel"
          value={form.phone}
          onChange={(event) => update('phone', event.target.value)}
          icon={<Phone className="h-4 w-4" />}
          autoComplete="tel"
          inputMode="tel"
          maxLength={16}
          error={errors.phone}
          hint="Indian mobile numbers only in this demo. Nothing is sent by SMS."
        />

        <fieldset>
          <legend className="text-[12px] font-semibold text-muted">Avatar tone</legend>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {avatarTones.map((tone) => {
              const active = form.avatarTone === tone
              return (
                <button
                  key={tone}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    haptic('tap')
                    update('avatarTone', tone)
                  }}
                  className={cn(
                    'focus-ring flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[10px] font-semibold transition-colors',
                    active
                      ? 'border-accent/50 bg-accent/10 text-text'
                      : 'border-line/80 bg-raised/40 text-muted hover:border-accent/30',
                  )}
                >
                  <Avatar name={form.name || user.name} tone={tone} size="sm" />
                  {toneLabels[tone]}
                </button>
              )
            })}
          </div>
        </fieldset>

        <p className="rounded-xl border border-line/80 bg-raised/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted">
          Your profile is stored in this browser&apos;s local demo database. Editing it does not contact a server, and
          the change is added to the hash-chained audit log.
        </p>
      </div>
    </BottomSheet>
  )
}
