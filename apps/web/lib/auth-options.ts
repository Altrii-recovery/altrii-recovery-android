import type { AuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export const authOptions: AuthOptions = {
  // Make secret explicit so prod won't guess it
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = (creds?.email || "").toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await verifyPassword(String(creds?.password || ""), user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name || null } as any;
      },
    }),
  ],
  pages: { signIn: "/auth/signin" },
  callbacks: {
    async jwt({ token, user }) {
      if ((user as any)?.id) (token as any).uid = (user as any).id;
      return token;
    },
    async session({ session, token }) {
      if ((token as any)?.uid) (session as any).uid = (token as any).uid;
      return session;
    },
  },
  debug: process.env.NEXTAUTH_DEBUG === "true",
};
