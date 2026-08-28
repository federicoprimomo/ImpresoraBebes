import { MercadoPagoConfig, OAuth, Payment } from "mercadopago";
import type { PaymentCreateRequest } from "mercadopago/dist/clients/payment/create/types";
import type { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";

/**
 * Wrapper fino sobre el SDK oficial de Mercado Pago para el modelo
 * Marketplace: cada vendedor conecta su propia cuenta vía OAuth, y los
 * pagos se crean/capturan usando el access_token de esa cuenta (no el de
 * la plataforma), con `application_fee` para quedarnos con la comisión.
 */

function platformConfig(): MercadoPagoConfig {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN.");
  }
  return new MercadoPagoConfig({ accessToken });
}

function sellerConfig(sellerAccessToken: string): MercadoPagoConfig {
  return new MercadoPagoConfig({ accessToken: sellerAccessToken });
}

// --- OAuth (conectar la cuenta del vendedor) --------------------------------

// Nuestra aplicación de Mercado Pago no tiene un Client ID/Client Secret
// separado para pruebas (solo existen en "Credenciales de producción") —
// sin esto, /oauth/token siempre devuelve tokens en live_mode: true sin
// importar con qué cuenta se autorice, aunque sea una Cuenta de Prueba.
// El SDK expone `requestOptions.testToken` (tipado en `Options`, ver
// node_modules/mercadopago/dist/types.d.ts) que manda el header
// `X-Test-Token` — es el mecanismo real para pedir un token de sandbox
// (un intento anterior mandando `test: true` en el body no tuvo efecto:
// no es un campo del body, es este header). Sacar esta env var (o
// ponerla en "false") antes de conectar cuentas reales.
const OAUTH_TEST_MODE = process.env.MERCADOPAGO_OAUTH_TEST_MODE === "true";
const oauthRequestOptions = OAUTH_TEST_MODE ? { testToken: true } : undefined;

function requireOAuthCredentials() {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Faltan MERCADOPAGO_CLIENT_ID / MERCADOPAGO_CLIENT_SECRET.",
    );
  }
  return { clientId, clientSecret };
}

export function getOAuthRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("Falta NEXT_PUBLIC_APP_URL.");
  }
  return `${appUrl}/api/connected-accounts/oauth/callback`;
}

export function buildAuthorizationUrl(state: string): string {
  const { clientId } = requireOAuthCredentials();
  const oauth = new OAuth(platformConfig());
  return oauth.getAuthorizationURL({
    options: {
      client_id: clientId,
      redirect_uri: getOAuthRedirectUri(),
      state,
    },
  });
}

export type OAuthTokens = {
  accessToken: string;
  refreshToken: string;
  publicKey?: string;
  liveMode: boolean;
  mpUserId?: number;
  scope?: string;
  expiresInSeconds?: number;
};

export async function exchangeOAuthCode(code: string): Promise<OAuthTokens> {
  const { clientId, clientSecret } = requireOAuthCredentials();
  const oauth = new OAuth(platformConfig());

  const response = await oauth.create({
    body: {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: getOAuthRedirectUri(),
    },
    requestOptions: oauthRequestOptions,
  });

  if (!response.access_token || !response.refresh_token) {
    throw new Error("Mercado Pago no devolvió access_token/refresh_token.");
  }

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    publicKey: response.public_key,
    liveMode: response.live_mode ?? false,
    mpUserId: response.user_id,
    scope: response.scope,
    expiresInSeconds: response.expires_in,
  };
}

export async function refreshOAuthTokens(
  refreshToken: string,
): Promise<OAuthTokens> {
  const { clientId, clientSecret } = requireOAuthCredentials();
  const oauth = new OAuth(platformConfig());

  const response = await oauth.refresh({
    body: {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    },
    requestOptions: oauthRequestOptions,
  });

  if (!response.access_token || !response.refresh_token) {
    throw new Error("Mercado Pago no devolvió access_token/refresh_token al renovar.");
  }

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    publicKey: response.public_key,
    liveMode: response.live_mode ?? false,
    mpUserId: response.user_id,
    scope: response.scope,
    expiresInSeconds: response.expires_in,
  };
}

// --- Pagos (reserva + captura) ----------------------------------------------

export type CreateReservePaymentInput = {
  sellerAccessToken: string;
  idempotencyKey: string;
  transactionAmount: number; // en la unidad mayor de la moneda (pesos), no centavos
  applicationFee: number; // idem — comisión total que retiene la plataforma
  cardToken: string;
  installments: number;
  paymentMethodId?: string;
  issuerId?: number;
  payer: {
    email: string;
    identification?: { type: string; number: string };
  };
  externalReference: string; // id de nuestra Order, para trazabilidad
  description: string;
  notificationUrl?: string;
};

export async function createReservePayment(input: CreateReservePaymentInput) {
  const payment = new Payment(sellerConfig(input.sellerAccessToken));

  const body: PaymentCreateRequest = {
    transaction_amount: input.transactionAmount,
    token: input.cardToken,
    installments: input.installments,
    payment_method_id: input.paymentMethodId,
    issuer_id: input.issuerId,
    capture: false, // autorizar y retener, sin capturar todavía
    application_fee: input.applicationFee,
    binary_mode: true, // o se aprueba o se rechaza; nada de "pendiente"
    description: input.description,
    external_reference: input.externalReference,
    notification_url: input.notificationUrl,
    payer: {
      email: input.payer.email,
      identification: input.payer.identification,
    },
  };

  return payment.create({
    body,
    requestOptions: { idempotencyKey: input.idempotencyKey },
  });
}

export async function capturePayment(input: {
  sellerAccessToken: string;
  mpPaymentId: string;
  idempotencyKey: string;
}) {
  const payment = new Payment(sellerConfig(input.sellerAccessToken));
  return payment.capture({
    id: input.mpPaymentId,
    requestOptions: { idempotencyKey: input.idempotencyKey },
  });
}

export async function cancelPayment(input: {
  sellerAccessToken: string;
  mpPaymentId: string;
  idempotencyKey?: string;
}) {
  const payment = new Payment(sellerConfig(input.sellerAccessToken));
  return payment.cancel({
    id: input.mpPaymentId,
    requestOptions: input.idempotencyKey
      ? { idempotencyKey: input.idempotencyKey }
      : undefined,
  });
}

export async function getPayment(input: {
  sellerAccessToken: string;
  mpPaymentId: string;
}) {
  const payment = new Payment(sellerConfig(input.sellerAccessToken));
  return payment.get({ id: input.mpPaymentId });
}

export type SettlementInfo = {
  /** Lo que cobró Mercado Pago por procesar el pago — a cargo del
   * vendedor, aparte de nuestro `application_fee`. */
  mpFeeArs: number | null;
  /** Lo que finalmente le queda al vendedor una vez descontados el costo
   * de Mercado Pago y nuestra comisión — el número real, no el estimado. */
  netReceivedArs: number | null;
};

/**
 * `fee_details`/`transaction_details` no siempre vienen completos (depende
 * del medio de pago y de si ya se liquidó), así que cualquiera de los dos
 * campos puede dar `null` acá — hay que tratarlo como "todavía no lo
 * sabemos", nunca como si el costo fuera cero.
 */
export function extractSettlementInfo(payment: PaymentResponse): SettlementInfo {
  // .filter + suma en vez de .find: en pagos en cuotas Mercado Pago puede
  // devolver más de un ítem "mercadopago_fee" en fee_details — quedarse
  // con el primero subestimaría el costo real.
  const mpFeeAmounts = (payment.fee_details ?? [])
    .filter((fee) => fee.type === "mercadopago_fee")
    .map((fee) => fee.amount)
    .filter((amount): amount is number => typeof amount === "number");

  const netReceivedAmount = payment.transaction_details?.net_received_amount;

  return {
    mpFeeArs:
      mpFeeAmounts.length > 0
        ? Math.round(mpFeeAmounts.reduce((sum, amount) => sum + amount, 0) * 100)
        : null,
    netReceivedArs:
      typeof netReceivedAmount === "number" ? Math.round(netReceivedAmount * 100) : null,
  };
}
