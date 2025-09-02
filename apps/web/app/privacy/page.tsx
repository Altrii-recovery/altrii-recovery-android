export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 py-10 text-gray-200">
      <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
      <p>Last updated: 2 September 2025</p>

      <p>
        ShieldTimer is operated by Altrii Recovery (“we”, “us”, “our”). We are committed to protecting your privacy and handling your personal data in accordance with the UK GDPR and the Data Protection Act 2018.
      </p>

      <h2 className="text-xl font-semibold text-white">1. Data Controller</h2>
      <p>
        Altrii Recovery is the data controller for your personal data. Contact:{" "}
        <a href="mailto:hello@altriirecovery.com" className="text-indigo-400 underline">hello@altriirecovery.com</a>.
      </p>

      <h2 className="text-xl font-semibold text-white">2. Data We Collect</h2>
      <ul className="list-disc ml-6">
        <li><span className="font-medium">Account data</span>: email, password hash, display name (optional).</li>
        <li><span className="font-medium">Subscription/billing</span>: Stripe customer ID, subscription status, plan, renewal dates (we do not store full card details).</li>
        <li><span className="font-medium">Device data</span>: device name, platform (Android/iOS/macOS/Windows/Web), settings (block toggles), and lock timers.</li>
        <li><span className="font-medium">Technical data</span>: IP address, user agent, logs/diagnostics for security and debugging.</li>
      </ul>

      <h2 className="text-xl font-semibold text-white">3. How We Use Your Data</h2>
      <ul className="list-disc ml-6">
        <li>Provide, maintain, and secure the ShieldTimer service (device blocking/locking, account features).</li>
        <li>Process payments and manage subscriptions via Stripe.</li>
        <li>Detect, prevent, and investigate fraud, abuse, or service issues.</li>
        <li>Comply with legal obligations (e.g., accounting/records).</li>
        <li>Communicate essential service messages (invoices, service updates). Marketing emails only with your consent.</li>
      </ul>

      <h2 className="text-xl font-semibold text-white">4. Legal Bases for Processing</h2>
      <ul className="list-disc ml-6">
        <li><span className="font-medium">Contract</span>: to deliver the service you sign up for.</li>
        <li><span className="font-medium">Legitimate interests</span>: service safety, improvement, and analytics proportionate to your privacy.</li>
        <li><span className="font-medium">Legal obligation</span>: tax, accounting, and regulatory requirements.</li>
        <li><span className="font-medium">Consent</span>: where required (e.g., marketing). You can withdraw at any time.</li>
      </ul>

      <h2 className="text-xl font-semibold text-white">5. Sharing Your Data</h2>
      <p>
        We share data with trusted processors who help us run the service, under contracts that protect your data:
      </p>
      <ul className="list-disc ml-6">
        <li><span className="font-medium">Stripe</span> (payments and subscriptions)</li>
        <li>Hosting, databases, and infrastructure providers</li>
        <li>Analytics/error reporting and logging (minimal personal data)</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2 className="text-xl font-semibold text-white">6. International Transfers</h2>
      <p>
        If data is transferred outside the UK, we use appropriate safeguards such as the UK Addendum to the EU Standard Contractual Clauses or other approved mechanisms.
      </p>

      <h2 className="text-xl font-semibold text-white">7. Data Retention</h2>
      <p>
        We keep your personal data only as long as necessary for the purposes above. If you close your account, we aim to delete or anonymise personal data within 30 days, except where we must retain it to meet legal obligations.
      </p>

      <h2 className="text-xl font-semibold text-white">8. Security</h2>
      <p>
        We use administrative, technical, and organisational safeguards (encryption, access controls, monitoring). No system is perfectly secure; please use strong, unique passwords and keep them confidential.
      </p>

      <h2 className="text-xl font-semibold text-white">9. Your Rights (UK GDPR)</h2>
      <ul className="list-disc ml-6">
        <li>Access your data</li>
        <li>Rectify inaccurate data</li>
        <li>Erase your data (where applicable)</li>
        <li>Restrict or object to processing (where applicable)</li>
        <li>Data portability</li>
      </ul>
      <p>
        To exercise your rights, email{" "}
        <a href="mailto:hello@altriirecovery.com" className="text-indigo-400 underline">hello@altriirecovery.com</a>. We may ask for verification.
      </p>

      <h2 className="text-xl font-semibold text-white">10. Cookies & Similar Technologies</h2>
      <p>
        We use essential cookies for authentication and session management. Analytics and performance cookies (if used) operate on a minimal basis. You can control cookies in your browser settings.
      </p>

      <h2 className="text-xl font-semibold text-white">11. Children</h2>
      <p>
        ShieldTimer is for adults. If you believe a child has provided personal data to us, please contact us so we can delete it.
      </p>

      <h2 className="text-xl font-semibold text-white">12. Changes</h2>
      <p>
        We may update this policy from time to time. We will post the updated version here with a new “Last updated” date, and notify you where appropriate.
      </p>

      <h2 className="text-xl font-semibold text-white">13. Complaints</h2>
      <p>
        You can complain to the Information Commissioner’s Office (ICO):{" "}
        <a className="text-indigo-400 underline" href="https://ico.org.uk" target="_blank">https://ico.org.uk</a>.
      </p>
    </div>
  );
}
