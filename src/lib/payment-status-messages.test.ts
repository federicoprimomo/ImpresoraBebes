import { describe, expect, it } from "vitest";

import { describePaymentRejection } from "./payment-status-messages";

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
