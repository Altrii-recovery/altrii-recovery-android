"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function SignIn() {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [err,setErr]=useState("");
  async function onSubmit(e: any){ e.preventDefault(); setErr("");
    const r = await signIn("credentials",{ redirect: true, email, password, callbackUrl: "/post-auth" });
    if ((r as any)?.error) setErr("Invalid credentials");
  }
  return (
    <div className="max-w-md mx-auto card p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <div className="text-red-400 text-sm">{err}</div>}
        <button className="btn-primary w-full">Sign in</button>
      </form>
      <div className="text-[--muted] text-sm mt-4">
        No account? <Link className="underline" href="/auth/signup">Create one</Link>
      </div>
    </div>
  );
}
