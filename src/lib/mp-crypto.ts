import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Encripta/desencripta los tokens OAuth de Mercado Pago de los vendedores
 * (access_token / refresh_token) antes de guardarlos en la base. Nunca se
 * persisten en texto plano — ver ConnectedAccount en el schema de Prisma.
 *
 * AES-256-GCM con una clave de 32 bytes tomada de MP_TOKEN_ENCRYPTION_KEY
 * (base64). Formato guardado: "<iv>.<authTag>.<ciphertext>", todo en base64url.
 */

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.MP_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "Falta MP_TOKEN_ENCRYPTION_KEY. Generala con: openssl rand -base64 32",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "MP_TOKEN_ENCRYPTION_KEY debe decodificar a exactamente 32 bytes (AES-256). " +
        "Generala con: openssl rand -base64 32",
    );
  }
  return key;
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptToken(encoded: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(".");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Formato de token encriptado inválido.");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagB64, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64url")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
