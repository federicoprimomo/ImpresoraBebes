import { describe, expect, it } from "vitest";

import { describePaymentApiError, describePaymentRejection } from "./payment-status-messages";

describe("describePaymentRejection", () => {
  it("devuelve un mensaje específico para códigos conocidos", () => {
    expect(describePaymentRejection("cc_rejected_insufficient_amount")).toBe(
      "La tarjeta no tiene fondos suficientes.",
    );
    expect(describePaymentRejection("cc_rejected_bad_filled_card_number")).toBe(
      "Revisá el número de la tarjeta.",
    );
  });

  it("cae al mensaje genérico con un código desconocido", () => {
    expect(describePaymentRejection("algo_que_no_existe")).toBe(
      "El pago fue rechazado.",
    );
  });

  it("cae al mensaje genérico sin status_detail", () => {
    expect(describePaymentRejection(null)).toBe("El pago fue rechazado.");
    expect(describePaymentRejection(undefined)).toBe("El pago fue rechazado.");
    expect(describePaymentRejection("")).toBe("El pago fue rechazado.");
  });
});

describe("describePaymentApiError", () => {
  it("explica que la tarjeta de débito no es compatible con el modelo de retención", () => {
    // Caso real: Mercado Pago tira este mensaje en inglés cuando la
    // tarjeta/medio de pago no admite capture: false (autorizar sin
    // capturar) — típicamente débito en Argentina.
    expect(describePaymentApiError("deferred capture not supported")).toContain(
      "no admite este tipo de pago",
    );
    // No debería importar mayúsculas/minúsculas exactas del mensaje del SDK.
    expect(describePaymentApiError("Deferred Capture Not Supported")).toContain(
      "no admite este tipo de pago",
    );
  });

  it("cae al mensaje genérico para cualquier otro error", () => {
    expect(describePaymentApiError("algo completamente distinto")).toBe(
      "No pudimos procesar el pago. Probá de nuevo.",
    );
  });
});
