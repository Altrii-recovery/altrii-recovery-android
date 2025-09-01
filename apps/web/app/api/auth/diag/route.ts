export const runtime = "nodejs";
export async function GET() {
  const data = {
    ok: true,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ? "set" : "missing",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "set" : "missing",
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST || "unset",
    PORT: process.env.PORT || "unset",
  };
  return Response.json(data);
}
