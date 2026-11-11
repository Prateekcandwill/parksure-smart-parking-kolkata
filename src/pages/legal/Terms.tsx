import { LegalLayout } from '@/components/legal/LegalLayout'
import { DEMO_CONFIG } from '@/config/env'

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms and conditions"
      updated="10 November 2026"
      summary="These terms explain what the ParkSure demo is, what it is not, and the rules for using it. By using the demo you agree to them."
    >
      <section>
        <h2>1. Acceptance</h2>
        <p>
          By opening ParkSure, signing in with a demo account or installing the app, you agree to these terms. If you do
          not agree, do not use the demo.
        </p>
      </section>

      <section>
        <h2>2. This is a demonstration, not a parking service</h2>
        <p>
          ParkSure is a prototype. Every sensor, camera, ANPR read, barrier, bay, map position, price, booking, payment,
          receipt, refund and audit event is <strong>simulated</strong>. No real parking space is reserved, no barrier
          will open, no vehicle is tracked and no money moves. The phrase “Demo mode: simulated data” appears throughout
          the app for this reason.
        </p>
      </section>

      <section>
        <h2>3. Eligibility</h2>
        <p>
          You may use the demo if you can form a binding contract in your jurisdiction. The demo is intended for adults
          evaluating the product. Do not enter real personal, financial or vehicle information.
        </p>
      </section>

      <section>
        <h2>4. Demo accounts and roles</h2>
        <ul>
          <li>One account can hold Driver, Attendant, Operator and Administrator roles. Only roles on the account are unlocked.</li>
          <li>The demo credentials are public and intentionally weak. Never reuse a real password.</li>
          <li>You are responsible for activity performed with the demo account on your device.</li>
          <li>Administrators can edit roles, thresholds, payment methods and demo data. Those actions are audited locally.</li>
        </ul>
      </section>

      <section>
        <h2>5. Bookings, payments and refunds</h2>
        <p>
          Booking, payment, GST invoice, FASTag, UPI, card and cash flows are simulations. No payment network is
          contacted. The 3-D Secure step accepts the public demo code. Refunds are recorded as simulated ledger entries.
          Nothing in the app creates a real financial obligation.
        </p>
      </section>

      <section>
        <h2>6. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>use the demo for unlawful, fraudulent or harmful activity;</li>
          <li>attempt to disrupt, overload or reverse-engineer the demo beyond normal evaluation;</li>
          <li>upload malware or attempt to access data belonging to another person;</li>
          <li>remove copyright, attribution or “demo” notices;</li>
          <li>misrepresent the demo as a live parking operator or as financial advice.</li>
        </ul>
      </section>

      <section>
        <h2>7. Intellectual property</h2>
        <p>
          The ParkSure name, interface, copy and code are provided for demonstration and evaluation. Open-source
          dependencies remain under their own licences, including React, Vite, Tailwind CSS, Leaflet, OpenStreetMap data,
          CARTO tiles and the icon sets. Map data is © OpenStreetMap contributors.
        </p>
      </section>

      <section>
        <h2>8. Third-party links and services</h2>
        <p>
          Navigation buttons open OpenStreetMap directions in a new tab or the native browser. OpenStreetMap data is
          © OpenStreetMap contributors and is governed by its own terms and privacy policy. ParkSure is not responsible
          for its content or availability.
        </p>
      </section>

      <section>
        <h2>9. Availability and changes</h2>
        <p>
          The demo is provided as-is and may change, break or be withdrawn at any time without notice. Features described
          in the documentation may differ from the current build. We may update these terms; the “last updated” date will
          change when we do.
        </p>
      </section>

      <section>
        <h2>10. Disclaimers</h2>
        <p>
          To the maximum extent permitted by law, the demo is provided without warranties of any kind, express or
          implied, including merchantability, fitness for a particular purpose, accuracy and non-infringement. Prices,
          availability, routes and receipts are illustrative only.
        </p>
      </section>

      <section>
        <h2>11. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, ParkSure and its contributors are not liable for indirect, incidental,
          special, consequential or punitive damages, or for lost profits, data, goodwill or parking time, arising from
          use of the demo. Nothing in these terms limits liability that cannot be limited by law.
        </p>
      </section>

      <section>
        <h2>12. Indemnity</h2>
        <p>
          You agree to indemnify ParkSure and its contributors against claims arising from your misuse of the demo or
          breach of these terms, to the extent permitted by law.
        </p>
      </section>

      <section>
        <h2>13. Governing law and jurisdiction</h2>
        <p>
          These terms are governed by the laws of India. Subject to applicable law, the courts at Kolkata, West Bengal
          have exclusive jurisdiction over disputes relating to the demo.
        </p>
      </section>

      <section>
        <h2>14. Contact</h2>
        <p>
          Questions about these terms: <a href={`mailto:${DEMO_CONFIG.supportEmail}`}>{DEMO_CONFIG.supportEmail}</a>.
        </p>
      </section>
    </LegalLayout>
  )
}
