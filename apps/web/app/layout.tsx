import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Altrii Recovery",
  description: "Device filtering & recovery tools",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* @ts-ignore Async Server Component */}
        <Header />
        <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
