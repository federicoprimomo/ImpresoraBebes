"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminInvoiceButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/invoice`, {
        method: "POST",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "No se pudo emitir la factura.");
      }
      router.refresh();
      setStatus("idle");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error inesperado.");
      setStatus("error");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/[.06]"
      >
        {status === "loading" ? "Emitiendo..." : "Emitir/reintentar factura ARCA (admin)"}
      </button>
      {errorMessage ? (
        <p className="mt-2 text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
      ) : null}
    </div>
  );
}
