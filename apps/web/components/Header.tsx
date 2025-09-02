import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export default async function Header() {
  const session = await getServerSession(authOptions as any);
  const uid = (session as any)?.uid;

  return (
    <header className="w-full border-b bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold">Altrii Recovery</Link>

        {uid ? (
          <nav className="flex items-center gap-4">
            <Link href="/dashboard/devices" className="hover:underline">Devices</Link>
            <Link href="/dashboard/billing" className="hover:underline">Billing</Link>
          </nav>
        ) : (
          <nav className="flex items-center gap-4">
            <Link href="/auth/signin" className="hover:underline">Sign in</Link>
            <Link href="/auth/signup" className="hover:underline">Sign up</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
