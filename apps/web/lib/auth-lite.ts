import { prisma } from "./db";

/** DEV-ONLY: resolve a user from x-user header or ENV; auto-creates if missing. */
export async function requireUser(req: Request) {
  const email =
    req.headers.get("x-user") ||
    process.env.DEV_USER_EMAIL ||
    "dev@example.com";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) user = await prisma.user.create({ data: { email, name: "Dev User" } });
  return user;
}
