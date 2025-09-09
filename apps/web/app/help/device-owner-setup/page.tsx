// Renders a QR for /provisioning/do_payload.json using a tiny client-side library.
"use client";

import { useEffect, useRef, useState } from "react";

export default function DeviceOwnerSetup() {
  const [payload, setPayload] = useState<string | null>(null);
  const [copied, setCopied] = useState<"idle" | "ok" | "err">("idle");
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/provisioning/do_payload.json").then(async (r) => {
      const txt = await r.text();
      setPayload(txt);

      // Load QR library dynamically (no build deps)
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js";
      s.onload = () => {
        // @ts-ignore
        new QRCode(qrRef.current, { text: txt, width: 288, height: 288 });
      };
      document.body.appendChild(s);
    });
  }, []);

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(payload ?? "");
      setCopied("ok");
      setTimeout(() => setCopied("idle"), 1800);
    } catch {
      setCopied("err");
      setTimeout(() => setCopied("idle"), 1800);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <h1 className="text-3xl font-semibold">Set Altrii as Device Owner</h1>

      <ol className="list-decimal pl-6 space-y-3">
        <li>Factory reset the device (see “How to factory reset” below).</li>
        <li>On the very first screen of setup, tap the screen <strong>6 times</strong> (or choose “Set up via QR code”).</li>
        <li>Scan the QR below. The device will download and verify Altrii, then set it as <strong>Device Owner</strong>.</li>
        <li>Follow the prompts; Altrii will open automatically to complete setup.</li>
      </ol>

      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-xl font-medium">Provisioning QR</h2>
        <div ref={qrRef} className="w-[288px] h-[288px]" />

        <div className="flex items-center gap-3">
          <a
            className="inline-flex rounded-md bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
            href="/provisioning/do_payload.json"
            download
          >
            Download JSON
          </a>
          <button
            onClick={copyJson}
            disabled={!payload}
            className="inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {copied === "ok" ? "Copied ✓" : copied === "err" ? "Copy failed" : "Copy JSON"}
          </button>
          <a
            className="inline-flex rounded-md bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
            href="/provisioning/do_payload.json"
            target="_blank"
            rel="noreferrer"
          >
            Open JSON
          </a>
        </div>

        <p className="text-sm text-gray-500">
          If the QR fails to scan, you can download the JSON and generate a QR locally using any QR tool.
        </p>
      </div>

      <details className="rounded-lg border p-4">
        <summary className="cursor-pointer text-base font-medium">How to factory reset (fresh setup required)</summary>
        <div className="mt-3 text-sm text-gray-700 space-y-2">
          <p><strong>On most Android devices:</strong></p>
          <ol className="list-decimal pl-6 space-y-1">
            <li>Open <em>Settings</em> → <em>System</em> → <em>Reset options</em> (or <em>Backup & reset</em>).</li>
            <li>Choose <em>Erase all data (factory reset)</em>.</li>
            <li>Confirm to erase. The phone will reboot into setup.</li>
          </ol>
          <p className="text-gray-500">
            Tip: Ensure the device has Wi-Fi during setup so it can download the Altrii APK automatically.
          </p>
        </div>
      </details>

      <div className="rounded-lg border p-4">
        <h3 className="font-medium mb-2">Troubleshooting</h3>
        <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
          <li>Provisioning only works on a fresh device (out-of-box or after factory reset).</li>
          <li>If you update Altrii, revisit this page so the QR reflects the new checksum.</li>
          <li>Some OEMs hide the “tap 6 times” gesture; look for <em>Set up via QR</em> instead.</li>
        </ul>
      </div>
    </div>
  );
}
