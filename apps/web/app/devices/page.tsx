"use client";
import { useEffect, useState } from "react";

type Settings = {
  blockAdult: boolean; blockGambling: boolean; blockSocial: boolean;
  blockYouTube: boolean; blockVPN: boolean;
};
type Device = {
  id: string; name: string; platform: string; lockUntil?: string | null; settings: Settings;
};

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [creating, setCreating] = useState(false);

  async function load() {
    const r = await fetch("/api/devices", { headers: { "x-user": "dev@example.com" } });
    setDevices(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function createDevice() {
    setCreating(true);
    await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user": "dev@example.com" },
      body: JSON.stringify({ name: "My Android", platform: "ANDROID" })
    });
    setCreating(false);
    load();
  }

  async function toggle(id: string, key: keyof Settings) {
    const d = devices.find(x => x.id === id)!;
    const s = { ...d.settings, [key]: !d.settings[key] };
    await fetch(`/api/devices/${id}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user": "dev@example.com" },
      body: JSON.stringify(s)
    });
    load();
  }

  async function lock(id: string, days: number) {
    await fetch(`/api/devices/${id}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user": "dev@example.com" },
      body: JSON.stringify({ days })
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your devices</h1>
        <button className="btn-primary" onClick={createDevice} disabled={creating}>
          {creating ? "Creating…" : "Add Android device"}
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {devices.map(d => (
          <div key={d.id} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{d.name}</div>
                <div className="text-[--muted] text-sm">{d.platform}</div>
              </div>
              <div className="text-sm">
                {d.lockUntil
                  ? <span className="text-emerald-300">Locked until {new Date(d.lockUntil).toLocaleDateString()}</span>
                  : <span className="text-[--muted]">Unlocked</span>}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(["blockAdult","blockGambling","blockSocial","blockYouTube","blockVPN"] as const).map(k => (
                <button key={k}
                  className={`btn ${d.settings[k] ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => toggle(d.id, k)}>
                  {d.settings[k] ? "✓" : "✕"} {k.replace("block", "Block ")}
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="label">Start lock for:</span>
              {[1,3,7,14,30].map(n => (
                <button key={n} className="btn-ghost" onClick={() => lock(d.id, n)}>{n}d</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
