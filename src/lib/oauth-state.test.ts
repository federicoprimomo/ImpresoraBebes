import { beforeAll, describe, expect, it } from "vitest";

import { createOAuthState, verifyOAuthState } from "./oauth-state";

describe("createOAuthState / verifyOAuthState", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "test-secret-para-firmar-el-state";
  });

  it("un state recién creado es válido y devuelve el userId original", () => {
    const state = createOAuthState("user-123");
    expect(verifyOAuthState(state)).toBe("user-123");
  });

  it("dos states para el mismo usuario no son iguales (nonce distinto)", () => {
    const a = createOAuthState("user-123");
    const b = createOAuthState("user-123");
    expect(a).not.toBe(b);
  });

  it("rechaza un state con la firma alterada", () => {
    const state = createOAuthState("user-123");
    const [payload] = state.split(".");
    const tampered = `${payload}.firma-invalida`;
    expect(verifyOAuthState(tampered)).toBeNull();
  });

  it("rechaza un state con el payload alterado (firma ya no coincide)", () => {
    const state = createOAuthState("user-123");
    const [payload, signature] = state.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    decoded.userId = "otro-usuario";
    const tamperedPayload = Buffer.from(JSON.stringify(decoded)).toString("base64url");
    expect(verifyOAuthState(`${tamperedPayload}.${signature}`)).toBeNull();
  });

  it("rechaza un state mal formado (sin el separador)", () => {
    expect(verifyOAuthState("no-tiene-punto")).toBeNull();
    expect(verifyOAuthState("")).toBeNull();
  });

  it("rechaza un state vencido", () => {
    const realNow = Date.now;
    try {
      Date.now = () => new Date("2020-01-01T00:00:00Z").getTime();
      const state = createOAuthState("user-123");

      Date.now = () => new Date("2020-01-01T01:00:00Z").getTime(); // +1h, bien pasado el TTL de 10 min
      expect(verifyOAuthState(state)).toBeNull();
    } finally {
      Date.now = realNow;
    }
  });
});
