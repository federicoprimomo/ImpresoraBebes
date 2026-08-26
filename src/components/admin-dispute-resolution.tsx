"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminDisputeResolution({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function resolve(resolution: "RELEASE" | "REFUND") {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/dispute/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution, note }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "No pudimos resolver el reclamo.");
      }
      router.refresh();
      setStatus("idle");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error inesperado.");
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder="Nota de resolución (opcional, queda guardada)"
        className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-transparent"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => resolve("RELEASE")}
          disabled={status === "loading"}
          className="flex h-10 flex-1 items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          Liberar pago al vendedor
        </button>
        <button
          type="button"
          onClick={() => resolve("REFUND")}
          disabled={status === "loading"}
          className="flex h-10 flex-1 items-center justify-center rounded-full border border-red-300 px-4 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          Cancelar y devolver al comprador
        </button>
      </div>
      {errorMessage ? (
        <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
      ) : null}
    </div>
  );
}
