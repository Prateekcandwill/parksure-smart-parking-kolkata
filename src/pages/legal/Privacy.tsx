import { LegalLayout } from '@/components/legal/LegalLayout'
import { DEMO_CONFIG } from '@/config/env'

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy policy"
      updated="10 November 2026"
      summary="ParkSure is a local-first demonstration. This page explains exactly what the demo stores in your browser, why it stores it, and how to take it back."
    >
      <section>
        <h2>1. Who this policy covers</h2>
        <p>
          ParkSure is a demonstration smart-parking app for Kolkata. It is not a live parking operator and does not
          process real bookings, gates or payments. This policy covers the web app, the installable PWA and the Android
          build. In this document, “ParkSure”, “we” and “us” mean the demo project.
        </p>
      </section>

      <section>
        <h2>2. The short version</h2>
        <ul>
          <li>Everything you enter is stored locally in your browser or app storage. There is no ParkSure account server.</li>
          <li>No real OTP, email, SMS, payment, bank, ANPR camera or gate service is contacted.</li>
          <li>Optional usage analytics are <strong>off until you opt in</strong> and stay on your device.</li>
          <li>There are no advertising cookies, cross-site trackers or data sales.</li>
          <li>You can correct your profile in the app, clear analytics in Admin → Usage analytics, or reset the whole demo in Admin → Settings.</li>
        </ul>
      </section>

      <section>
        <h2>3. What the demo stores</h2>
        <p>ParkSure uses browser storage rather than server-side accounts. The main keys are:</p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-line/80">
          <table className="w-full table-fixed border-collapse text-left text-[11px] sm:text-[12px]">
            <thead className="bg-raised/70 text-[10px] uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="w-[34%] px-2 py-2.5 font-semibold sm:px-3">Storage key</th>
                <th className="w-[40%] px-2 py-2.5 font-semibold sm:px-3">What it holds</th>
                <th className="w-[26%] px-2 py-2.5 font-semibold sm:px-3">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              <tr>
                <td className="break-anywhere px-2 py-2.5 font-mono text-[10px] text-text sm:px-3 sm:text-[11px]">parksure.session.v1</td>
                <td className="px-2 py-2.5 sm:px-3">Demo user ID, active role, remember-device choice, last activity</td>
                <td className="px-2 py-2.5 sm:px-3">Keep you signed in and enforce idle logout</td>
              </tr>
              <tr>
                <td className="break-anywhere px-2 py-2.5 font-mono text-[10px] text-text sm:px-3 sm:text-[11px]">parksure.db.v2</td>
                <td className="px-2 py-2.5 sm:px-3">
                  Demo users, vehicles, places, bays, reservations, sessions, payments, receipts, alerts, gate events,
                  shifts and audit events
                </td>
                <td className="px-2 py-2.5 sm:px-3">Run the simulated parking experience</td>
              </tr>
              <tr>
                <td className="break-anywhere px-2 py-2.5 font-mono text-[10px] text-text sm:px-3 sm:text-[11px]">parksure.ui.v1</td>
                <td className="px-2 py-2.5 sm:px-3">Theme, language, simulation pause and selected place</td>
                <td className="px-2 py-2.5 sm:px-3">Remember your preferences</td>
              </tr>
              <tr>
                <td className="break-anywhere px-2 py-2.5 font-mono text-[10px] text-text sm:px-3 sm:text-[11px]">parksure.consent.v1</td>
                <td className="px-2 py-2.5 sm:px-3">Analytics choice and the time you made it</td>
                <td className="px-2 py-2.5 sm:px-3">Respect your privacy choice</td>
              </tr>
              <tr>
                <td className="break-anywhere px-2 py-2.5 font-mono text-[10px] text-text sm:px-3 sm:text-[11px]">parksure.analytics.v1</td>
                <td className="px-2 py-2.5 sm:px-3">Opt-in page views and in-app actions, with timestamps and route</td>
                <td className="px-2 py-2.5 sm:px-3">Show privacy-first usage analytics in the admin workspace</td>
              </tr>
              <tr>
                <td className="break-anywhere px-2 py-2.5 font-mono text-[10px] text-text sm:px-3 sm:text-[11px]">parksure.abuse.v1</td>
                <td className="px-2 py-2.5 sm:px-3">Recent form-attempt timestamps per action</td>
                <td className="px-2 py-2.5 sm:px-3">Basic local rate limiting and spam protection</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          The profile form can store a name, email address, Indian mobile number and avatar tone. The demo database also
          contains seeded fictional identities, vehicles and receipts. Do not enter real sensitive information into this
          demo.
        </p>
      </section>

      <section>
        <h2>4. Cookies and local storage</h2>
        <p>
          ParkSure does not set advertising or cross-site cookies. It uses <strong>localStorage</strong> and, when you do
          not choose “remember this device”, <strong>sessionStorage</strong> for the demo session. These are technically
          necessary to keep you signed in and to preserve your preferences. The only optional storage is the
          <strong> parksure.analytics.v1</strong> event log, which is written only after you choose “Accept all”.
        </p>
      </section>

      <section>
        <h2>5. Analytics</h2>
        <p>
          Analytics are opt-in and privacy-first. When enabled, ParkSure records the route you visited and a small set of
          in-app action names (for example “booking_created” or “profile_update”) in local storage. It does not record
          free-text chat messages, payment details, precise location or device fingerprints.
        </p>
        <p>
          If the deployment sets <code className="rounded bg-raised px-1.5 py-0.5 font-mono text-[11px] text-text">VITE_ANALYTICS_ENDPOINT</code>,
          the same small JSON event is sent to that first-party endpoint. No third-party analytics script is loaded. You
          can withdraw consent at any time from <strong>Me → Privacy and preferences → Cookie preferences</strong>.
        </p>
      </section>

      <section>
        <h2>6. Third-party requests</h2>
        <p>
          The app itself is self-hosted. When you are online, a few features load public resources:
        </p>
        <ul>
          <li><strong>Google Fonts</strong> serves the Space Grotesk, Inter and JetBrains Mono typefaces.</li>
          <li><strong>CARTO / OpenStreetMap</strong> serves map tiles for the Kolkata map.</li>
          <li><strong>OpenStreetMap</strong> directions open in a new tab when you tap a navigation link.</li>
        </ul>
        <p>
          Those providers receive your IP address and standard request metadata under their own policies. ParkSure does
          not send them your profile, plate, booking or payment data. The app shell still opens offline once installed.
        </p>
      </section>

      <section>
        <h2>7. How long data is kept</h2>
        <p>
          Demo data stays until you clear site data, reset the demo, or your browser evicts storage. The session expires
          after the idle timeout (10 minutes for Admin, 30 minutes for other roles). Analytics keeps the most recent 250
          events. The audit trail keeps the seeded and newly created events until a reset.
        </p>
      </section>

      <section>
        <h2>8. Your choices and rights</h2>
        <ul>
          <li><strong>Access and correction:</strong> open <strong>Me → Edit profile</strong> to view and change your name, email, phone and avatar tone.</li>
          <li><strong>Withdraw analytics consent:</strong> open <strong>Me → Cookie preferences</strong> or use the consent banner.</li>
          <li><strong>Delete demo data:</strong> an administrator can use <strong>Admin → Settings → Reset demo data</strong>. You can also clear site data in your browser.</li>
          <li><strong>Object or ask a question:</strong> email <a href={`mailto:${DEMO_CONFIG.supportEmail}`}>{DEMO_CONFIG.supportEmail}</a>.</li>
        </ul>
        <p>
          Because this is a local demo, ParkSure cannot retrieve data from a server — there is no server copy to retrieve.
          For a production deployment in India, the operator would need to honour applicable rights under the Digital
          Personal Data Protection Act, 2023 and other applicable law.
        </p>
      </section>

      <section>
        <h2>9. Security</h2>
        <p>
          The production build is served over HTTPS and includes HSTS, a content security policy, frame protection and
          referrer controls. The demo contains no production secrets: the OTP, password and 3-D Secure code are public
          demo values, and real gateway keys must never be shipped to the browser. See the security notes in the project
          documentation for the deployment checklist.
        </p>
      </section>

      <section>
        <h2>10. Children</h2>
        <p>
          ParkSure is a general-audience demonstration and is not directed at children under 13. Do not create an account
          with a child’s personal information.
        </p>
      </section>

      <section>
        <h2>11. Changes to this policy</h2>
        <p>
          If the demo’s data practices change, this page will be updated with a new “last updated” date. Material changes
          will also be reflected in the consent banner.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          Questions, corrections or deletion requests: <a href={`mailto:${DEMO_CONFIG.supportEmail}`}>{DEMO_CONFIG.supportEmail}</a>.
          This demo is operated from Kolkata, West Bengal, India.
        </p>
      </section>
    </LegalLayout>
  )
}
