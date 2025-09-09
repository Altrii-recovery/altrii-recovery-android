'use client';

import { useState, useEffect } from 'react';

type Device = {
  id: string;
  name: string;
  lockUntil: string | null;
  settings: {
    blockAdult: boolean;
    blockSocial: boolean;
    blockYouTube: boolean;
    blockGambling: boolean;
    blockVPN: boolean;
  };
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selected, setSelected] = useState<Device | null>(null);
  const [lockDays, setLockDays] = useState(1);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    fetch('/api/devices')
      .then((r) => r.json())
      .then(setDevices)
      .catch(() => setMsg("Failed to load devices"));
  }, []);

  async function updateSettings(id: string, settings: Partial<Device['settings']>) {
    setMsg("");
    const res = await fetch(`/api/devices/${id}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) return setMsg("Failed to update settings");
    const updated = await res.json();
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, settings: updated } : d)));
    setMsg("Settings saved");
  }

  async function lockDevice(dev: Device) {
    setMsg("");
    const until = new Date(Date.now() + lockDays * 86400_000).toISOString();
    const res = await fetch(`/api/devices/${dev.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lockUntil: until }),
    });
    if (!res.ok) return setMsg("Lock failed");
    const data = await res.json();
    setDevices((prev) => prev.map((d) => (d.id === dev.id ? { ...d, lockUntil: data.lockUntil } : d)));
    setSelected(null);
    setMsg(`Locked ${dev.name} for ${lockDays} day(s)`);
  }

  async function deleteDevice(id: string) {
    setMsg("");
    const res = await fetch(`/api/devices/${id}`, { method: 'DELETE' });
    if (!res.ok) return setMsg("Delete failed");
    setDevices((prev) => prev.filter((d) => d.id !== id));
    setMsg("Device deleted");
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <h1 className="text-3xl font-semibold">My Devices</h1>

      {msg && <div className="rounded-lg bg-blue-50 text-blue-700 px-4 py-2">{msg}</div>}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((d) => {
          const locked = d.lockUntil && new Date(d.lockUntil) > new Date();
          return (
            <div key={d.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">{d.name}</div>
                <span className={`rounded-full px-3 py-1 text-xs ${locked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {locked ? 'Locked' : 'Unlocked'}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <Toggle label="Block Adult (always on)" checked={true} disabled onChange={() => {}} />
                <Toggle label="Block Social Media" checked={d.settings.blockSocial} onChange={(v) => updateSettings(d.id, { blockSocial: v })} />
                <Toggle label="Block YouTube" checked={d.settings.blockYouTube} onChange={(v) => updateSettings(d.id, { blockYouTube: v })} />
                <Toggle label="Block Gambling" checked={d.settings.blockGambling} onChange={(v) => updateSettings(d.id, { blockGambling: v })} />
                <Toggle label="Block VPN" checked={d.settings.blockVPN} onChange={(v) => updateSettings(d.id, { blockVPN: v })} />
              </div>

              <div className="mt-4 flex justify-between gap-2">
                <button
                  onClick={() => setSelected(d)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  {locked ? 'Unlock / Relock' : 'Lock'}
                </button>
                <button
                  onClick={() => deleteDevice(d.id)}
                  className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Simple dependency-free modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Lock {selected?.name}</h2>
            <label className="mt-4 block text-sm">
              Duration (days)
              <input
                type="number"
                min={1}
                max={30}
                value={lockDays}
                onChange={(e) => setLockDays(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm"
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setSelected(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => selected && lockDevice(selected)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({
  label, checked, onChange, disabled = false,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between ${disabled ? 'opacity-60' : ''}`}>
      <span>{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4 accent-blue-600"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
    </label>
  );
}
