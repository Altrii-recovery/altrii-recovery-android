import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t footer-surface">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="link-muted">© {new Date().getFullYear()} Altrii Recovery</p>
        <nav className="flex gap-4">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link href="/faq" className="hover:underline">FAQ</Link>
          <Link href="/contact" className="hover:underline">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
