import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/mp-crypto";
import { refreshOAuthTokens, type OAuthTokens } from "@/lib/mercadopago";

// Margen de seguridad: renovamos el token antes de que venza, no cuando ya venció.
const REFRESH_MARGIN_MS = 10 * 60 * 1000; // 10 minutos

export async function saveConnectedAccount(userId: string, tokens: OAuthTokens) {
  const accessTokenExpiresAt = tokens.expiresInSeconds
    ? new Date(Date.now() + tokens.expiresInSeconds * 1000)
    : null;

  return prisma.connectedAccount.upsert({
    where: { userId },
    create: {
      userId,
      mpUserId: tokens.mpUserId !== undefined ? BigInt(tokens.mpUserId) : undefined,
      accessTokenEnc: encryptToken(tokens.accessToken),
      refreshTokenEnc: encryptToken(tokens.refreshToken),
      accessTokenExpiresAt,
      publicKey: tokens.publicKey,
      scope: tokens.scope,
      liveMode: tokens.liveMode,
      status: "CONNECTED",
    },
    update: {
      mpUserId: tokens.mpUserId !== undefined ? BigInt(tokens.mpUserId) : undefined,
      accessTokenEnc: encryptToken(tokens.accessToken),
      refreshTokenEnc: encryptToken(tokens.refreshToken),
      accessTokenExpiresAt,
      publicKey: tokens.publicKey,
      scope: tokens.scope,
      liveMode: tokens.liveMode,
      status: "CONNECTED",
      disconnectedAt: null,
    },
  });
}

export class SellerNotConnectedError extends Error {
  constructor(sellerId: string) {
    super(
      `El vendedor ${sellerId} no tiene una cuenta de Mercado Pago conectada.`,
    );
    this.name = "SellerNotConnectedError";
  }
}

/**
 * Devuelve el access_token en claro de la cuenta de Mercado Pago del
 * vendedor, renovándolo primero si está por vencer. Lanza
 * SellerNotConnectedError si el vendedor nunca conectó una cuenta o la
 * desconectó.
 */
export async function getSellerAccessToken(sellerId: string): Promise<string> {
  const account = await prisma.connectedAccount.findUnique({
    where: { userId: sellerId },
  });

  if (!account || account.status !== "CONNECTED") {
    throw new SellerNotConnectedError(sellerId);
  }

  const aboutToExpire =
    account.accessTokenExpiresAt !== null &&
    account.accessTokenExpiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS;

  if (!aboutToExpire) {
    return decryptToken(account.accessTokenEnc);
  }

  try {
    const refreshToken = decryptToken(account.refreshTokenEnc);
    const tokens = await refreshOAuthTokens(refreshToken);
    await saveConnectedAccount(sellerId, tokens);
    return tokens.accessToken;
  } catch (error) {
    // Si no se puede renovar, marcamos la cuenta en error para que el
    // vendedor tenga que reconectar — mejor eso que quedarnos con un token
    // vencido intentando cobrar en silencio.
    await prisma.connectedAccount.update({
      where: { userId: sellerId },
      data: { status: "ERROR" },
    });
    throw error;
  }
}
