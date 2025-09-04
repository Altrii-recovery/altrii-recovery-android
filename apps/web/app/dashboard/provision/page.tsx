'use client';
import { useState } from 'react';
import QRCode from 'qrcode';

export default function ProvisionPage() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/provision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create token');
      const payload = json.qrPayload || JSON.stringify({ scheme: 'altrii://provision', token: json.token });
      const url = await QRCode.toDataURL(payload);
      setDataUrl(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">Provision a Device</h1>
      <p className="text-sm opacity-80 mb-4">Generate a QR code to enroll an Android device.</p>
      <button onClick={generate} disabled={loading} className="px-4 py-2 rounded bg-black text-white">
        {loading ? 'Generating…' : 'Generate QR'}
      </button>
      {error && <p className="text-red-600 mt-3">{error}</p>}
      {dataUrl && (<div className="mt-6"><img src={dataUrl} alt="Provisioning QR" className="border rounded" /></div>)}
    </div>
  );
}
