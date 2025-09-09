export default function Download() {
  const checksum = process.env.NEXT_PUBLIC_APK_SHA256 || "";
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Download Altrii for Android</h1>
      <p className="mt-2 text-sm text-gray-500">
        Direct sideload. On your phone, you may need to allow
        <em> Install unknown apps</em> for your browser.
      </p>

      <a
        href="/downloads/altrii.apk"
        className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Download APK
      </a>

      <div className="mt-6 text-sm">
        <p>SHA-256 checksum:</p>
        <pre className="mt-1 rounded bg-black/10 p-3 overflow-auto">
{`${
  process.env.NEXT_PUBLIC_APK_SHA256 || "Populate NEXT_PUBLIC_APK_SHA256 in Railway for easy verification."
}`}
        </pre>
        <p className="mt-3">
          Update feed: <code>/downloads/latest.json</code>
        </p>
      </div>

      <div className="mt-8 space-y-2 text-sm">
        <p><strong>Install steps:</strong></p>
        <ol className="list-decimal ml-4 space-y-1">
          <li>Download the APK using the button above.</li>
          <li>When prompted, allow your browser to install unknown apps.</li>
          <li>Open the APK and tap <em>Install</em>.</li>
          <li>Open Altrii, sign in, and scan the QR from your dashboard.</li>
        </ol>
      </div>
    </div>
  );
}
