"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignUp() {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState("");
  const [err,setErr]=useState("");

  async function onSubmit(e:any){ e.preventDefault(); setErr("");
    const res = await fetch("/api/auth/signup",{ method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email, password, name }) });
    if(!res.ok){ setErr(await res.text()); return; }
    await signIn("credentials",{ redirect: true, email, password, callbackUrl: "/post-auth" });
  }

  return (
    <div className="max-w-md mx-auto card p-6">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input className="input" placeholder="Name (optional)" value={name} onChange={e=>setName(e.target.value)} />
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <div className="text-red-400 text-sm">{err}</div>}
        <button className="btn-primary w-full">Sign up</button>
      </form>
      <div className="text-[--muted] text-sm mt-4">
        Already have an account? <Link className="underline" href="/auth/signin">Sign in</Link>
      </div>
    </div>
  );
}
