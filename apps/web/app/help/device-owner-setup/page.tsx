// Renders a QR for /provisioning/do_payload.json using a tiny client-side library.
"use client";

import { useEffect, useRef, useState } from "react";

export default function DeviceOwnerSetup() {
  const [payload, setPayload] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/provisioning/do_payload.json").then(async (r) => {
      const txt = await r.text();
      setPayload(txt);

      // Load QR library dynamically
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js";
      s.onload = () => {
        // @ts-ignore
        new QRCode(qrRef.current, { text: txt, width: 288, height: 288 });
      };
      document.body.appendChild(s);
    });
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <h1 className="text-3xl font-semibold">Set Altrii as Device Owner</h1>

      <ol className="list-decimal pl-6 space-y-3">
        <li>Factory reset the device (Settings → System → Reset → Erase all data).</li>
        <li>On the very first screen of setup, tap the screen <strong>6 times</strong> (or choose “Set up via QR code”).</li>
        <li>Scan the QR below. The device will download and verify Altrii, then set it as <strong>Device Owner</strong>.</li>
        <li>Follow the prompts; Altrii will open automatically to complete setup.</li>
      </ol>

      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-medium mb-4">Provisioning QR</h2>
        <div ref={qrRef} className="w-[288px] h-[288px]" />
        <p className="text-sm text-gray-500 mt-3">
          If the QR fails to scan, download the JSON and generate a QR locally:&nbsp;
          <a className="underline" href="/provisioning/do_payload.json" download>do_payload.json</a>
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="font-medium mb-2">Troubleshooting</h3>
        <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
          <li>Provisioning only works on a fresh device (out-of-box or after factory reset).</li>
          <li>The QR references <code>/downloads/altrii.apk</code> and a checksum—if you re-upload a new APK, revisit this page to update the QR.</li>
          <li>Wi-Fi may be required during setup to download the APK.</li>
        </ul>
      </div>
    </div>
  );
}
