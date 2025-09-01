import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export async function POST(req: Request) {
  const { email, password, name } = await req.json();
  if (!email || !password) return new Response("Missing fields", { status: 400 });
  const existing = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (existing) return new Response("Email already in use", { status: 400 });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email: String(email).toLowerCase().trim(), name: name || null, passwordHash },
  });
  return Response.json({ ok: true, id: user.id });
}
