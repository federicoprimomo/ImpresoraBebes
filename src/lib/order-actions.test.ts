import { describe, expect, it } from "vitest";

import { orderNeedsAction } from "./order-actions";

const base = { sellerId: "seller-1", buyerId: "buyer-1" };

describe("orderNeedsAction", () => {
  it("el vendedor tiene que subir la entrega con el pago retenido", () => {
    expect(
      orderNeedsAction({ ...base, status: "PAYMENT_HELD" }, "seller-1"),
    ).toBe(true);
  });

  it("el vendedor no tiene nada que hacer en otros estados", () => {
    expect(orderNeedsAction({ ...base, status: "DELIVERED" }, "seller-1")).toBe(
      false,
    );
    expect(orderNeedsAction({ ...base, status: "RELEASED" }, "seller-1")).toBe(
      false,
    );
  });

  it("el comprador tiene que descargar la entrega una vez entregada", () => {
    expect(orderNeedsAction({ ...base, status: "DELIVERED" }, "buyer-1")).toBe(
      true,
    );
  });

  it("el comprador no tiene nada que hacer en otros estados", () => {
    expect(
      orderNeedsAction({ ...base, status: "PAYMENT_HELD" }, "buyer-1"),
    ).toBe(false);
    expect(orderNeedsAction({ ...base, status: "RELEASED" }, "buyer-1")).toBe(
      false,
    );
  });

  it("da false para alguien que no es ni comprador ni vendedor", () => {
    expect(
      orderNeedsAction({ ...base, status: "PAYMENT_HELD" }, "otro-usuario"),
    ).toBe(false);
  });
});
