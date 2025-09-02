"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";

type Device = {
  id: string;
  name: string;
  platform: "ANDROID" | "IOS" | "MACOS" | "WINDOWS" | "LINUX" | "OTHER";
  registeredAt: string;
  lastSeenAt?: string | null;
  lockUntil?: string | null; // ISO from API
};

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Failed to fetch");
  return r.json();
});

function isLocked(lockUntil?: string | null) {
  if (!lockUntil) return false;
  const t = new Date(lockUntil).getTime();
  return Number.isFinite(t) && t > Date.now();
}

export default function DevicesPage() {
  const { data, error, isLoading, mutate } = useSWR<Device[]>("/api/devices", fetcher);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<Device["platform"]>("ANDROID");

  const devices = useMemo(() => data ?? [], [data]);

  const addDevice = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      alert("Please enter a device name.");
      return;
    }
    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, platform }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "Failed");
      alert(`Add failed: ${msg}`);
      return;
    }
    setName("");
    await mutate();
  };

  const deleteDevice = async (id: string) => {
    if (!confirm("Delete this device? This cannot be undone.")) return;
    const res = await fetch(`/api/devices/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const msg = await res.text().catch(() => "Failed");
      alert(`Delete failed: ${msg}`);
      return;
    }
    await mutate();
  };

  const lockDevice = async (id: string) => {
    const input = prompt("Lock for how many days? (1–30)");
    if (!input) return;
    const days = Math.max(1, Math.min(30, Math.floor(Number(input))));
    if (!Number.isFinite(days)) return alert("Please enter a number of days (1–30).");
    if (!confirm(`Are you sure you want to lock this device for ${days} day(s)? You won't be able to delete it until the lock expires.`)) return;

    const lockUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const res = await fetch(`/api/devices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lockUntil }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "Failed");
      alert(`Lock failed: ${msg}`);
      return;
    }
    await mutate();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Devices</h1>

      <div className="flex flex-col md:flex-row gap-2 md:items-end">
        <div className="flex-1">
          <label className="block text-sm mb-1">Device name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Alex’s Pixel 8"
            className="w-full rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--fg)]"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Platform</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Device["platform"])}
            className="rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--fg)]"
          >
            <option value="ANDROID">Android</option>
            <option value="IOS">iOS</option>
            <option value="MACOS">macOS</option>
            <option value="WINDOWS">Windows</option>
            <option value="LINUX">Linux</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <button onClick={addDevice} className="btn-primary h-[42px]">Add Device</button>
      </div>

      {isLoading && <p>Loading…</p>}
      {error && <p className="text-red-400">Failed to load devices.</p>}

      <ul className="space-y-3">
        {devices.map((d) => {
          const locked = isLocked(d.lockUntil);
          return (
            <li key={d.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
              <div>
                <div className="font-medium">{d.name}</div>
                <div className="text-sm link-muted">
                  {d.platform} • Registered {new Date(d.registeredAt).toLocaleDateString()}
                  {" • "}
                  {locked
                    ? `Locked until ${new Date(d.lockUntil as string).toLocaleString()}`
                    : "Unlocked"}
                </div>
              </div>
              <div className="flex gap-2">
                {!locked && (
                  <button
                    onClick={() => deleteDevice(d.id)}
                    className="rounded bg-red-600 px-3 py-1 text-white"
                    title="Delete device (only when unlocked)"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={() => lockDevice(d.id)}
                  className="rounded bg-gray-700 px-3 py-1 text-white"
                >
                  {locked ? "Locked" : "Lock…"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
