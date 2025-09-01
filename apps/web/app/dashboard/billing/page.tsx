'use client';
import { useState } from 'react';

export default function Billing() {
  const [loading, setLoading] = useState<'checkout'|'portal'|''>('');

  async function goCheckout(plan: 'monthly'|'quarterly'|'semiannual'|'annual') {
    try {
      setLoading('checkout');
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user': 'dev@example.com', // DEV auth header
        },
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
        headers: { 'x-user': 'dev@example.com' }, // DEV auth header
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
      <p className="text-[--muted] mt-2">Subscribe or open your customer portal.</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button className="btn-primary" disabled={loading==='checkout'} onClick={() => goCheckout('monthly')}>Subscribe – Monthly</button>
        <button className="btn-ghost" disabled={loading==='checkout'} onClick={() => goCheckout('quarterly')}>Quarterly</button>
        <button className="btn-ghost" disabled={loading==='checkout'} onClick={() => goCheckout('semiannual')}>6 Months</button>
        <button className="btn-ghost" disabled={loading==='checkout'} onClick={() => goCheckout('annual')}>Annual</button>
      </div>

      <div className="mt-6">
        <button className="btn-primary" onClick={openPortal} disabled={loading==='portal'}>
          Open Customer Portal
        </button>
      </div>
    </div>
  );
}
