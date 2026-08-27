"use client";

import { useState } from "react";

import { formatArsCents } from "@/lib/format";
import type { FeePercentages } from "@/lib/fees";

/**
 * El campo de precio de /listings/new, con el desglose de comisión
 * calculado en el navegador a medida que se escribe — así el vendedor ve
 * antes de publicar cuánto le va a quedar, sin tener que ir a hacer la
 * cuenta a mano ni esperar un round-trip al server por cada tecla.
 *
 * Los porcentajes vienen del server (misma fuente que calculateOrderFees,
 * ver lib/fees.ts) para no hardcodear el 10% acá y desincronizarlo si en
 * algún momento cambia la config.
 */
export function PriceFeeEstimate({
  buyerFeePct,
  sellerFeePct,
  defaultValue = "",
}: FeePercentages & { defaultValue?: string }) {
  const [raw, setRaw] = useState(defaultValue);

  const priceArs = Math.round(Number(raw.replace(",", ".")) * 100);
  const valid = Number.isFinite(priceArs) && priceArs > 0;

  const buyerFeeArs = valid ? Math.round(priceArs * buyerFeePct) : 0;
  const sellerFeeArs = valid ? Math.round(priceArs * sellerFeePct) : 0;
  const amountArs = priceArs + buyerFeeArs;
  const estimatedPayoutArs = priceArs - sellerFeeArs;

  const sellerFeeLabel = (sellerFeePct * 100).toLocaleString("es-AR", {
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm">
        Precio (ARS)
        <input
          name="price"
          required
          inputMode="decimal"
          placeholder="15000"
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
        />
      </label>

      {valid ? (
        <div className="rounded-lg bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-800">
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">El comprador paga</span>
            <span className="font-medium">{formatArsCents(amountArs)}</span>
          </div>
          <div className="mt-1.5 flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">
              − comisión Escrow.ar ({sellerFeeLabel}%)
            </span>
            <span className="font-medium">{formatArsCents(sellerFeeArs)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-black/10 pt-2 font-semibold dark:border-white/10">
            <span>Recibís (aprox.)</span>
            <span>{formatArsCents(estimatedPayoutArs)}</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            No incluye el costo propio de Mercado Pago por procesar el
            cobro con tarjeta (variable, aparte de nuestra comisión) — el
            neto exacto se confirma recién cuando se libera el pago.
          </p>
        </div>
      ) : null}
    </div>
  );
}
