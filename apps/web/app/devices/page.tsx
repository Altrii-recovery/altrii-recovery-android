"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import clsx from "classnames";

type DeviceSettings = {
  id: string;
  deviceId: string;
  blockAdult: boolean;
  blockGambling: boolean;
  blockSocial: boolean;
  blockYouTube: boolean;
  blockVPN: boolean;
  rulesVersion: number;
};

type Device = {
  id: string;
  name: string;
  platform: "ANDROID" | "IOS" | "WINDOWS" | "MACOS" | "WEB";
  registeredAt: string;
  lockUntil?: string | null;
  settings?: DeviceSettings | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={clsx(
        "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-md p-5 sm:p-6",
        className
      )}
    >
      {children}
    </section>
  );
}

function Pill({
  active,
  children,
  onClick,
  disabled,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "rounded-full px-3 py-1 text-sm border transition",
        active
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-transparent text-gray-200 hover:bg-white/10 border-white/15",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs text-gray-200">
      {children}
    </span>
  );
}

export default function DevicesPage() {
  const { data, mutate } = useSWR<Device[]>("/api/devices", fetcher);
  const devices = data || [];

  // Add device
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<Device["platform"]>("ANDROID");
  const canAdd = useMemo(() => name.trim().length > 0, [name]);

  const isLocked = (d: Device) => !!(d.lockUntil && new Date(d.lockUntil) > new Date());
  const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");

  async function addDevice() {
    if (!canAdd) return;
    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), platform }),
    });
    if (!res.ok) return alert(await res.text().catch(() => "Add failed"));
    setName("");
    await mutate();
  }

  async function deleteDevice(id: string) {
    if (!confirm("Delete this device? This cannot be undone.")) return;
    const res = await fetch(`/api/devices/${id}`, { method: "DELETE" });
    if (!res.ok) return alert(await res.text().catch(() => "Delete failed (device may be locked)"));
    await mutate();
  }

  async function lockForDays(id: string, days: number) {
    const ok = confirm(
      `Lock this device for ${days} day(s)?\n\nWhile locked you cannot change settings or delete the device.`
    );
    if (!ok) return;
    const lockUntil = new Date(Date.now() + days * 86400_000).toISOString();
    const res = await fetch(`/api/devices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lockUntil }),
    });
    if (!res.ok) return alert(await res.text().catch(() => "Lock failed"));
    await mutate();
  }

  async function saveSettings(d: Device, next: Partial<DeviceSettings>) {
    const body = {
      blockAdult: next.blockAdult ?? d.settings?.blockAdult ?? true,
      blockGambling: next.blockGambling ?? d.settings?.blockGambling ?? true,
      blockSocial: next.blockSocial ?? d.settings?.blockSocial ?? false,
      blockYouTube: next.blockYouTube ?? d.settings?.blockYouTube ?? false,
      blockVPN: next.blockVPN ?? d.settings?.blockVPN ?? true,
      rulesVersion: d.settings?.rulesVersion ?? 1,
    };
    const res = await fetch(`/api/devices/${d.id}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return alert(await res.text().catch(() => "Save failed"));
    await mutate();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-white">Devices</h1>
        <p className="text-gray-300 mt-1">
          Register devices, toggle their blocking, and lock them for a focus period.
        </p>
      </header>

      {/* Add Device */}
      <SectionCard>
        <h2 className="text-lg font-medium text-white mb-4">Add a new device</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="w-full sm:w-1/2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white placeholder:text-gray-400"
            placeholder="Device name (required)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            name="deviceName"
            id="deviceName"
          />
          <select
            className="w-full sm:w-44 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Device["platform"])}
          >
            <option value="ANDROID">Android</option>
            <option value="IOS">iOS</option>
            <option value="MACOS">macOS</option>
            <option value="WINDOWS">Windows</option>
            <option value="WEB">Web</option>
          </select>
          <button
            onClick={addDevice}
            disabled={!canAdd}
            className={clsx(
              "rounded-lg px-4 py-2 font-medium border transition",
              canAdd
                ? "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500"
                : "bg-white/10 border-white/15 text-gray-300 cursor-not-allowed"
            )}
          >
            Add device
          </button>
        </div>
      </SectionCard>

      {/* Devices list */}
      <div className="grid gap-4">
        {devices.map((d) => {
          const locked = isLocked(d);
          return (
            <SectionCard key={d.id} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-medium text-white">{d.name}</h3>
                    <Badge>{d.platform}</Badge>
                  </div>
                  <p className="text-sm text-gray-400">
                    Registered {fmt(d.registeredAt)} • Lock until: {fmt(d.lockUntil)}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  {/* Lock presets show only when unlocked */}
                  {!locked && (
                    <div className="flex flex-wrap gap-1.5">
                      {[1, 7, 14, 21, 30].map((days) => (
                        <button
                          key={days}
                          onClick={() => lockForDays(d.id, days)}
                          className="rounded-md border border-indigo-500/40 bg-indigo-500/20 px-2.5 py-1.5 text-xs text-indigo-100 hover:bg-indigo-500/30"
                          title={`Lock for ${days} day(s)`}
                        >
                          {days}d
                        </button>
                      ))}
                    </div>
                  )}
                  {locked && (
                    <span className="text-xs text-amber-300">
                      Locked — unlocks {fmt(d.lockUntil)}
                    </span>
                  )}

                  <button
                    onClick={() => deleteDevice(d.id)}
                    disabled={locked}
                    className={clsx(
                      "rounded-lg border px-3 py-2 text-sm transition",
                      locked
                        ? "border-white/15 bg-white/5 text-gray-400 cursor-not-allowed"
                        : "border-rose-500/40 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30"
                    )}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <h4 className="text-sm font-semibold text-white mb-3">Block settings</h4>
                <div className="flex flex-wrap gap-2">
                  <Pill
                    active={!!d.settings?.blockAdult}
                    disabled={locked}
                    onClick={() =>
                      saveSettings(d, { blockAdult: !(d.settings?.blockAdult ?? true) })
                    }
                  >
                    Adult
                  </Pill>
                  <Pill
                    active={!!d.settings?.blockGambling}
                    disabled={locked}
                    onClick={() =>
                      saveSettings(d, { blockGambling: !(d.settings?.blockGambling ?? true) })
                    }
                  >
                    Gambling
                  </Pill>
                  <Pill
                    active={!!d.settings?.blockSocial}
                    disabled={locked}
                    onClick={() =>
                      saveSettings(d, { blockSocial: !(d.settings?.blockSocial ?? false) })
                    }
                  >
                    Social
                  </Pill>
                  <Pill
                    active={!!d.settings?.blockYouTube}
                    disabled={locked}
                    onClick={() =>
                      saveSettings(d, { blockYouTube: !(d.settings?.blockYouTube ?? false) })
                    }
                  >
                    YouTube
                  </Pill>
                  <Pill
                    active={!!d.settings?.blockVPN}
                    disabled={locked}
                    onClick={() =>
                      saveSettings(d, { blockVPN: !(d.settings?.blockVPN ?? true) })
                    }
                  >
                    VPN
                  </Pill>
                </div>
                {locked && (
                  <p className="text-xs text-amber-300 mt-2">
                    Device is locked — settings are temporarily read-only.
                  </p>
                )}
              </div>
            </SectionCard>
          );
        })}

        {devices.length === 0 && (
          <SectionCard>
            <p className="text-gray-300">No devices yet. Add your first device above.</p>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
