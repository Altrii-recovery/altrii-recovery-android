import Link from "next/link";

export default function HomePage() {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      <div>
        <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
          Regain focus with a timer-locked internet filter
        </h1>
        <p className="mt-4 text-[--muted]">
          Block adult content, gambling, and optional social media & YouTube. Manage up to 3 devices from one dashboard.
        </p>
        <div className="mt-6 flex gap-3">
          <Link className="btn-primary" href="/devices">Open Devices</Link>
          <a className="btn-ghost" href="/api/health" target="_blank">API Health</a>
        </div>
      </div>
      <div className="card p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white/5">
            <div className="text-2xl font-bold">3</div>
            <div className="text-sm text-[--muted]">Devices included</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5">
            <div className="text-2xl font-bold">30 days</div>
            <div className="text-sm text-[--muted]">Max lock timer</div>
          </div>
        </div>
      </div>
    </div>
  );
}
