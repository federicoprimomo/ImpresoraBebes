import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Genera y valida el parámetro `state` del flujo OAuth de Mercado Pago
 * (protección CSRF: evita que alguien complete el vínculo OAuth de otra
 * persona pegándole un `code` ajeno). Es un HMAC firmado con AUTH_SECRET,
 * sin estado en el servidor (no necesita tabla ni cookie de sesión aparte).
 */

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutos — tiempo de sobra para el redirect a MP y vuelta.

type StatePayload = {
  userId: string;
  nonce: string;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Falta AUTH_SECRET (se reutiliza para firmar el state de OAuth).");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createOAuthState(userId: string): string {
  const payload: StatePayload = {
    userId,
    nonce: randomBytes(12).toString("base64url"),
    exp: Date.now() + STATE_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

/**
 * Valida el state recibido en el callback. Devuelve el userId si es válido,
 * o null si está vencido, mal formado, o la firma no coincide.
 */
export function verifyOAuthState(state: string): string | null {
  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as StatePayload;
    if (Date.now() > payload.exp) return null;
    return payload.userId;
  } catch {
    return null;
  }
}
