/**
 * Cálculo de la comisión de la plataforma, dividida entre comprador y
 * vendedor (ver PLATFORM_FEE_BUYER_PCT / PLATFORM_FEE_SELLER_PCT).
 *
 * Todos los montos están en centavos de ARS (enteros) para evitar errores
 * de punto flotante. `application_fee` de Mercado Pago es lo que la
 * plataforma se queda del monto total cobrado — acá es la suma de ambas
 * comisiones, porque el comprador ya pagó la suya "de más" al momento de
 * pagar, y el vendedor la suya se descuenta al liberar:
 *
 *   amountArs (cobrado al comprador) = precio + buyerFeeArs
 *   sellerPayoutArs (lo que recibe el vendedor) = precio - sellerFeeArs
 *   applicationFeeArs (lo que retiene la plataforma) = amountArs - sellerPayoutArs
 *                                                     = buyerFeeArs + sellerFeeArs
 */

export type OrderFees = {
  priceArs: number;
  buyerFeeArs: number;
  sellerFeeArs: number;
  amountArs: number;
  sellerPayoutArs: number;
  applicationFeeArs: number;
};

function getFeePct(envVar: string, fallback: number): number {
  const raw = process.env[envVar];
  if (!raw) return fallback;
  const pct = Number(raw);
  if (!Number.isFinite(pct) || pct < 0 || pct >= 1) {
    throw new Error(`${envVar} inválida: "${raw}" (debe ser una fracción entre 0 y 1)`);
  }
  return pct;
}

export function calculateOrderFees(priceArs: number): OrderFees {
  const buyerFeePct = getFeePct("PLATFORM_FEE_BUYER_PCT", 0.04);
  const sellerFeePct = getFeePct("PLATFORM_FEE_SELLER_PCT", 0.04);

  const buyerFeeArs = Math.round(priceArs * buyerFeePct);
  const sellerFeeArs = Math.round(priceArs * sellerFeePct);

  const amountArs = priceArs + buyerFeeArs;
  const sellerPayoutArs = priceArs - sellerFeeArs;
  const applicationFeeArs = buyerFeeArs + sellerFeeArs;

  return {
    priceArs,
    buyerFeeArs,
    sellerFeeArs,
    amountArs,
    sellerPayoutArs,
    applicationFeeArs,
  };
}

/** Mercado Pago espera los montos en la unidad mayor de la moneda (pesos, no centavos). */
export function centsToMpAmount(cents: number): number {
  return Math.round(cents) / 100;
}
