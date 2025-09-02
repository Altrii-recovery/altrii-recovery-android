export default function FAQPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-10 text-gray-200">
      <h1 className="text-3xl font-bold text-white">Frequently Asked Questions</h1>

      <section>
        <h2 className="text-xl font-semibold text-white">What is ShieldTimer?</h2>
        <p>ShieldTimer (by Altrii Recovery) helps adults reduce compulsive online behaviours by blocking adult content, social media, YouTube (optional), gambling, and VPNs, and by locking devices for chosen periods.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">How do subscriptions work?</h2>
        <p>Plans: 1 month (£12), 3 months (£30), 6 months (£50), 12 months (£90). Billing is handled by Stripe. You can manage or cancel anytime from the Billing page.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">How many devices can I add?</h2>
        <p>Up to 3 devices per account. Each device has its own settings and lock status.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Can I remove the lock early?</h2>
        <p>No. The lock is designed to be non-bypassable for the time you set (up to 30 days). This is key to avoiding impulsive changes.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">What platforms are supported?</h2>
        <p>We’re starting with Android. iOS, macOS, and Windows will follow. The web dashboard lets you manage device settings and subscriptions.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">Is my data private?</h2>
        <p>Yes. We keep data to the minimum needed to provide the service. Passwords are hashed. Payments are processed by Stripe. Read our <a href="/privacy" className="text-indigo-400 underline">Privacy Policy</a>.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">I need help—how do I contact you?</h2>
        <p>Email us at <a className="text-indigo-400 underline" href="mailto:hello@altriirecovery.com">hello@altriirecovery.com</a>. We aim to respond promptly.</p>
      </section>
    </div>
  );
}
