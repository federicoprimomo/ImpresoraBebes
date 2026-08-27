import { describe, expect, it } from "vitest";

import { extractSettlementInfo } from "@/lib/mercadopago";

// Casts a mano en vez de armar un PaymentResponse completo — acá solo nos
// interesan fee_details/transaction_details, el resto del tipo no importa
// para esta función.
function fakePayment(overrides: Record<string, unknown>) {
  return overrides as unknown as Parameters<typeof extractSettlementInfo>[0];
}

describe("extractSettlementInfo", () => {
  it("extrae el costo de Mercado Pago y el neto real cuando la API los informa", () => {
    const info = extractSettlementInfo(
      fakePayment({
        fee_details: [
          { type: "mercadopago_fee", amount: 78.5, fee_payer: "collector" },
          { type: "application_fee", amount: 100, fee_payer: "collector" },
        ],
        transaction_details: { net_received_amount: 821.5 },
      }),
    );

    expect(info.mpFeeArs).toBe(7850);
    expect(info.netReceivedArs).toBe(82150);
  });

  it("da null (no cero) cuando Mercado Pago no informa esos campos", () => {
    const info = extractSettlementInfo(fakePayment({}));

    expect(info.mpFeeArs).toBeNull();
    expect(info.netReceivedArs).toBeNull();
  });

  it("suma todos los ítems mercadopago_fee, no solo el primero (ej. pagos en cuotas)", () => {
    const info = extractSettlementInfo(
      fakePayment({
        fee_details: [
          { type: "mercadopago_fee", amount: 50 },
          { type: "mercadopago_fee", amount: 28.5 },
        ],
      }),
    );

    expect(info.mpFeeArs).toBe(7850);
  });

  it("ignora otros tipos de fee_details (financing_fee, coupon_fee, etc.)", () => {
    const info = extractSettlementInfo(
      fakePayment({
        fee_details: [{ type: "financing_fee", amount: 12.3 }],
        transaction_details: {},
      }),
    );

    expect(info.mpFeeArs).toBeNull();
    expect(info.netReceivedArs).toBeNull();
  });
});
