/**
 * Traducción de los `status_detail` más comunes que devuelve Mercado Pago
 * para pagos con tarjeta rechazados. Lista no exhaustiva — el resto cae en
 * el mensaje genérico.
 *
 * Referencia: https://www.mercadopago.com.ar/developers/es/docs/checkout-api-payments/additional-content/your-integrations/response-handling
 */
const MESSAGES: Record<string, string> = {
  cc_rejected_bad_filled_card_number: "Revisá el número de la tarjeta.",
  cc_rejected_bad_filled_date: "Revisá la fecha de vencimiento.",
  cc_rejected_bad_filled_security_code: "Revisá el código de seguridad.",
  cc_rejected_bad_filled_other: "Revisá los datos de la tarjeta.",
  cc_rejected_call_for_authorize:
    "Tu banco requiere que autorices el pago directamente con ellos.",
  cc_rejected_card_disabled:
    "La tarjeta está deshabilitada. Contactá a tu banco.",
  cc_rejected_duplicated_payment: "Ya se hizo un pago por ese mismo monto.",
  cc_rejected_high_risk: "El pago fue rechazado por seguridad.",
  cc_rejected_insufficient_amount: "La tarjeta no tiene fondos suficientes.",
  cc_rejected_invalid_installments:
    "La tarjeta no admite la cantidad de cuotas seleccionada.",
  cc_rejected_max_attempts:
    "Superaste el límite de intentos permitidos. Probá con otra tarjeta.",
  cc_rejected_other_reason: "El pago fue rechazado.",
};

export function describePaymentRejection(statusDetail?: string | null): string {
  if (!statusDetail) return "El pago fue rechazado.";
  return MESSAGES[statusDetail] ?? "El pago fue rechazado.";
}
