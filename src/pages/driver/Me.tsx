import { PageHeader } from '@/components/layout/PageHeader'
import { AccountPanel } from '@/components/account/AccountPanel'

export default function DriverMePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Account"
        title="Me"
        description="Profile, vehicles, preferences, privacy and session controls."
      />
      <AccountPanel role="driver" />
    </div>
  )
}
