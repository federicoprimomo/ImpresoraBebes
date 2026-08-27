/**
 * Cálculo de la comisión de la plataforma. Por default es una comisión
 * única del 10% sobre el precio, a cargo del vendedor — el comprador paga
 * exactamente el precio publicado, sin nada sumado. `buyerFeeArs` y
 * `PLATFORM_FEE_BUYER_PCT` siguen existiendo por si en algún momento hace
 * falta volver a repartirla, pero el comportamiento por default es 0%
 * comprador / 10% vendedor.
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
 *
 * IMPORTANTE — esto NO incluye el costo propio de Mercado Pago por procesar
 * el cobro con tarjeta (su comisión de cobro, variable según cuenta y
 * plazo de acreditación elegido). Como el pago se crea con el access_token
 * del vendedor (modelo Marketplace), ese costo lo termina pagando el
 * vendedor, aparte de sellerFeeArs — nosotros solo nos quedamos con
 * applicationFeeArs. `sellerPayoutArs` calculado acá es una ESTIMACIÓN
 * previa a la captura; el neto real (ya descontado el costo de Mercado
 * Pago) se conoce recién cuando se libera el pago y queda guardado en
 * `Order.sellerPayoutArs`/`Order.mpFeeArs` — ver extractSettlementInfo()
 * en lib/mercadopago.ts.
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
  const buyerFeePct = getFeePct("PLATFORM_FEE_BUYER_PCT", 0);
  const sellerFeePct = getFeePct("PLATFORM_FEE_SELLER_PCT", 0.1);

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
