import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "ShieldTimer",
  description: "Timer-locked filtering for focus and recovery",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-40 backdrop-blur border-b border-white/10 bg-black/40">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold text-xl">ShieldTimer</Link>
            <nav className="flex items-center gap-6 text-sm text-[--muted]">
              <Link href="/devices">Devices</Link>
              <Link href="/api/health" target="_blank">Health</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mt-16 border-t border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-[--muted] flex gap-4 justify-between flex-wrap">
            <div>© {new Date().getFullYear()} ShieldTimer</div>
            <div className="flex gap-4">
              <Link href="https://example.com/privacy" className="underline decoration-white/20">Privacy</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
