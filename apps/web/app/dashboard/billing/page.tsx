'use client';
import { useState } from 'react';

export default function Billing() {
  const [loading, setLoading] = useState<'checkout'|'portal'|''>('');

  async function goCheckout(plan: 'monthly'|'quarterly'|'semiannual'|'annual') {
    try {
      setLoading('checkout');
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const { url } = await res.json();
      window.location.href = url;
    } finally {
      setLoading('');
    }
  }

  async function openPortal() {
    try {
      setLoading('portal');
      const res = await fetch('/api/billing/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const { url } = await res.json();
      window.location.href = url;
    } finally {
      setLoading('');
    }
  }

  return (
    <div className="card p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Manage Billing</h1>
      <p className="text-[--muted] mt-2">
        Subscribe or open your billing portal to manage your plan.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <button
          disabled={loading === 'checkout'}
          onClick={() => goCheckout('monthly')}
          className="btn-primary"
        >
          {loading === 'checkout' ? 'Loading…' : 'Subscribe Monthly'}
        </button>
        <button
          disabled={loading === 'portal'}
          onClick={openPortal}
          className="btn-secondary"
        >
          {loading === 'portal' ? 'Loading…' : 'Open Billing Portal'}
        </button>
      </div>
    </div>
  );
}
