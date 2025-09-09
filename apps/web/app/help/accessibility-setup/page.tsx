export default function AccessibilitySetup() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <h1 className="text-3xl font-semibold">Enable Accessibility Protection</h1>
      <p className="text-gray-600">
        If your phone isn’t provisioned with Altrii as <strong>Device Owner</strong>,
        enable our Accessibility service to block apps at the launcher level.
      </p>
      <ol className="list-decimal pl-6 space-y-2">
        <li>Open <em>Settings</em> → <em>Accessibility</em>.</li>
        <li>Find <strong>Altrii</strong> in the services list and turn it on.</li>
        <li>Confirm the permission.</li>
      </ol>
      <div className="rounded-lg border p-4 text-sm text-gray-700">
        <p className="mb-2">If your device supports it, use the Device Owner setup instead:</p>
        <a className="underline" href="/help/device-owner-setup">Device Owner (QR) setup</a>
      </div>
      <div className="rounded-lg border p-4 text-sm text-gray-600">
        <p><strong>Deep link:</strong> open Accessibility settings on your phone and search for Altrii.</p>
        <code className="block mt-2 bg-gray-100 p-2 rounded">
          Intent action: android.settings.ACCESSIBILITY_SETTINGS
        </code>
      </div>
    </div>
  );
}
