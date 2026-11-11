import type { Role } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { SupportChat } from '@/components/support/SupportChat'
import { Card } from '@/components/ui/Card'
import { SimulatedDataNote } from '@/components/ui/DemoBadge'
import { DEMO_CONFIG } from '@/config/env'
import { ROLE_META } from '@/utils/roles'

export default function SupportPage({ role }: { role: Role }) {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Help"
        title="ParkSure Assist"
        description={`On-device support for the ${ROLE_META[role].label.toLowerCase()} workspace. Ask about bookings, prices, payments, gates, alerts, audit or privacy.`}
      />

      <SupportChat role={role} />

      <Card className="p-4">
        <h2 className="text-sm font-semibold text-text">How this assistant works</h2>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          ParkSure Assist is deterministic and runs entirely in your browser or Android app. It matches your question
          against a curated help library and enriches the answer with your live demo context — your active booking,
          vehicle, wallet, alerts or shift. There is no external AI provider, no API key and no network request.
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Because the assistant is local, it can answer common questions offline. It cannot look up real parking
          records, and it never sends your chat text anywhere. For project questions, email{' '}
          <a
            href={`mailto:${DEMO_CONFIG.supportEmail}`}
            className="font-semibold text-accent underline-offset-4 hover:underline"
          >
            {DEMO_CONFIG.supportEmail}
          </a>
          .
        </p>
        <SimulatedDataNote className="mt-3" />
      </Card>
    </div>
  )
}
