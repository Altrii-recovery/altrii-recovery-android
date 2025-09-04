import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface Params { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
  const id = params.id;
  const ruleSet = await prisma.deviceRuleSet.findFirst({ where: { deviceId: id } });
  const payload = {
    version: ruleSet?.version ?? 1,
    updatedAt: new Date().toISOString(),
    categories: { porn: true, gambling: true, social: true, youtube: true },
    blocklists: { domains: ["example-bad-site.com"], sni: ["bad.example"], ip: [] },
  };
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
