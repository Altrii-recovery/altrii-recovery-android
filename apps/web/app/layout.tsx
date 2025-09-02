import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Altrii Recovery",
  description: "Device filtering & recovery tools",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {/* Conditional nav based on session */}
        {/* Header is a server component that calls getServerSession */}
        {/* It shows Sign in/Sign up when logged out, or Devices/Billing when logged in */}
        {/* Paths: /auth/signin, /auth/signup, /dashboard/devices, /dashboard/billing */}
        {/* If you'd like a footer, add it below */}
        {/* @ts-expect-error Async Server Component */}
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
