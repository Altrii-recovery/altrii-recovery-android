'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Lock, Unlock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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

  useEffect(() => {
    fetch('/api/devices')
      .then((r) => r.json())
      .then(setDevices)
      .catch(() => toast.error('Failed to load devices'));
  }, []);

  async function updateSettings(id: string, settings: Partial<Device['settings']>) {
    const res = await fetch(`/api/devices/${id}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) return toast.error('Failed to update settings');
    toast.success('Settings saved');
    const updated = await res.json();
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, settings: updated } : d)));
  }

  async function lockDevice(dev: Device) {
    const until = new Date(Date.now() + lockDays * 86400_000).toISOString();
    const res = await fetch(`/api/devices/${dev.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lockUntil: until }),
    });
    if (!res.ok) return toast.error('Lock failed');
    const data = await res.json();
    toast.success(`Locked ${dev.name} for ${lockDays}d`);
    setDevices((prev) => prev.map((d) => (d.id === dev.id ? { ...d, lockUntil: data.lockUntil } : d)));
    setSelected(null);
  }

  async function deleteDevice(id: string) {
    const res = await fetch(`/api/devices/${id}`, { method: 'DELETE' });
    if (!res.ok) return toast.error('Delete failed');
    setDevices((prev) => prev.filter((d) => d.id !== id));
    toast.success('Device deleted');
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <h1 className="text-3xl font-semibold">My Devices</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((d) => {
          const locked = d.lockUntil && new Date(d.lockUntil) > new Date();
          return (
            <Card key={d.id} className="rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {d.name}
                  {locked ? (
                    <span className="rounded-full bg-red-500/20 text-red-500 px-3 py-1 text-xs">
                      Locked
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-500/20 text-green-500 px-3 py-1 text-xs">
                      Unlocked
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <FilterSwitch label="Block Adult (always on)" checked={true} disabled onChange={() => {}} />
                  <FilterSwitch label="Block Social Media" checked={d.settings.blockSocial} onChange={(v) => updateSettings(d.id, { blockSocial: v })} />
                  <FilterSwitch label="Block YouTube" checked={d.settings.blockYouTube} onChange={(v) => updateSettings(d.id, { blockYouTube: v })} />
                  <FilterSwitch label="Block Gambling" checked={d.settings.blockGambling} onChange={(v) => updateSettings(d.id, { blockGambling: v })} />
                  <FilterSwitch label="Block VPN" checked={d.settings.blockVPN} onChange={(v) => updateSettings(d.id, { blockVPN: v })} />
                </div>
                <div className="flex justify-between gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setSelected(d)}>
                    {locked ? <Unlock className="mr-1 h-4 w-4" /> : <Lock className="mr-1 h-4 w-4" />}
                    {locked ? 'Unlock' : 'Lock'}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteDevice(d.id)}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lock {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label className="text-sm font-medium">
              Duration (days)
              <input
                type="number"
                min={1}
                max={30}
                value={lockDays}
                onChange={(e) => setLockDays(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border bg-gray-50 p-2 text-sm"
              />
            </label>
            <DialogFooter>
              <Button onClick={() => selected && lockDevice(selected)}>Confirm</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterSwitch({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
