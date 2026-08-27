import { afterEach, describe, expect, it } from "vitest";

import { calculateOrderFees, centsToMpAmount } from "./fees";

describe("calculateOrderFees", () => {
  afterEach(() => {
    delete process.env.PLATFORM_FEE_BUYER_PCT;
    delete process.env.PLATFORM_FEE_SELLER_PCT;
  });

  it("usa 0%/10% por default cuando no hay env vars (comisión única a cargo del vendedor)", () => {
    const fees = calculateOrderFees(1500000); // $15.000 en centavos

    expect(fees.buyerFeeArs).toBe(0);
    expect(fees.sellerFeeArs).toBe(150000); // 10% de 1.500.000
    expect(fees.amountArs).toBe(1500000); // el comprador paga el precio tal cual
    expect(fees.sellerPayoutArs).toBe(1350000); // precio - comisión vendedor
    expect(fees.applicationFeeArs).toBe(150000); // suma de ambas comisiones
  });

  it("la comisión total siempre es lo que paga el comprador de más, menos lo que recibe el vendedor de menos", () => {
    const fees = calculateOrderFees(999999); // precio "feo" a propósito, para chequear el redondeo
    expect(fees.applicationFeeArs).toBe(
      fees.amountArs - fees.sellerPayoutArs,
    );
    expect(fees.applicationFeeArs).toBe(fees.buyerFeeArs + fees.sellerFeeArs);
  });

  it("respeta PLATFORM_FEE_BUYER_PCT / PLATFORM_FEE_SELLER_PCT si están seteadas", () => {
    process.env.PLATFORM_FEE_BUYER_PCT = "0.1";
    process.env.PLATFORM_FEE_SELLER_PCT = "0.02";

    const fees = calculateOrderFees(1000000);
    expect(fees.buyerFeeArs).toBe(100000);
    expect(fees.sellerFeeArs).toBe(20000);
  });

  it("tira si la fracción configurada no es válida (>= 1, negativa, o no numérica)", () => {
    process.env.PLATFORM_FEE_BUYER_PCT = "1";
    expect(() => calculateOrderFees(100000)).toThrow();

    process.env.PLATFORM_FEE_BUYER_PCT = "-0.1";
    expect(() => calculateOrderFees(100000)).toThrow();

    process.env.PLATFORM_FEE_BUYER_PCT = "no-numero";
    expect(() => calculateOrderFees(100000)).toThrow();
  });

  it("precio 0 da comisiones 0 (caso límite)", () => {
    const fees = calculateOrderFees(0);
    expect(fees.amountArs).toBe(0);
    expect(fees.sellerPayoutArs).toBe(0);
    expect(fees.applicationFeeArs).toBe(0);
  });
});

describe("centsToMpAmount", () => {
  it("convierte centavos a la unidad mayor que espera Mercado Pago", () => {
    expect(centsToMpAmount(1560000)).toBe(15600);
    expect(centsToMpAmount(150)).toBe(1.5);
  });

  it("redondea antes de dividir, no trunca (evita arrastrar centavos de más)", () => {
    expect(centsToMpAmount(150.6)).toBe(1.51);
  });
});
