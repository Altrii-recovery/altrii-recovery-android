import { SignJWT, jwtVerify } from "jose";

const ALG = "HS256";
const ISS = process.env.JWT_ISSUER ?? "altrii";
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "change-me");

type BaseClaims = { deviceId: string; ownerId: string; aud: string; };

export async function signProvisioningToken(input: BaseClaims & { expSeconds: number }) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ typ: "provision" })
    .setProtectedHeader({ alg: ALG })
    .setIssuer(ISS).setAudience(input.aud).setSubject(input.deviceId)
    .setIssuedAt(now).setExpirationTime(now + input.expSeconds)
    .setJti(`${input.ownerId}:${input.deviceId}:${now}`)
    .sign(SECRET);
}

export async function signLockToken(input: BaseClaims & { lockUntil: number, issuedAtServer: number }) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ typ: "lock", lockUntil: input.lockUntil, issuedAtServer: input.issuedAtServer })
    .setProtectedHeader({ alg: ALG })
    .setIssuer(ISS).setAudience(input.aud).setSubject(input.deviceId)
    .setIssuedAt(now).setExpirationTime(input.lockUntil + 300)
    .setJti(`${input.ownerId}:${input.deviceId}:${now}`)
    .sign(SECRET);
}

export async function verifyToken<T = any>(token: string) {
  const { payload } = await jwtVerify(token, SECRET, { issuer: ISS });
  return payload as T;
}
