import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ERROR_MESSAGES: Record<string, string> = {
  denied: "Cancelaste la conexión con Mercado Pago.",
  invalid_request: "Faltaron datos en la respuesta de Mercado Pago. Probá de nuevo.",
  invalid_state:
    "El enlace de conexión venció o no es válido. Iniciá el proceso de nuevo.",
  exchange_failed:
    "No pudimos completar la conexión con Mercado Pago. Probá de nuevo en unos minutos.",
};

export default async function MercadoPagoAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { connected, error } = await searchParams;

  const account = await prisma.connectedAccount.findUnique({
    where: { userId: session.user.id },
  });

  const isConnected = account?.status === "CONNECTED";

  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-6 py-24">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Tu cuenta de Mercado Pago
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Para poder cobrar tus ventas necesitás conectar tu cuenta de Mercado
        Pago. El comprador paga con tarjeta, el dinero queda retenido, y se
        te libera automáticamente (menos la comisión) cuando la entrada se
        confirma entregada.
      </p>

      {connected ? (
        <p className="mt-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          ¡Cuenta conectada correctamente!
        </p>
      ) : null}

      {error ? (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {ERROR_MESSAGES[error] ?? "Ocurrió un error conectando tu cuenta."}
        </p>
      ) : null}

      <div className="mt-8 rounded-xl border border-black/10 p-5 dark:border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Estado</span>
          <span
            className={
              isConnected
                ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
                : "rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }
          >
            {account?.status === "ERROR"
              ? "Necesita reconexión"
              : isConnected
                ? "Conectada"
                : "No conectada"}
          </span>
        </div>

        {isConnected ? (
          <form
            className="mt-4"
            action="/api/connected-accounts/disconnect"
            method="post"
          >
            <button
              type="submit"
              className="text-sm font-medium text-red-700 hover:underline dark:text-red-400"
            >
              Desconectar cuenta
            </button>
          </form>
        ) : (
          <a
            href="/api/connected-accounts/oauth/start"
            className="mt-4 flex h-11 w-full items-center justify-center rounded-full bg-brand px-5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
          >
            Conectar con Mercado Pago
          </a>
        )}
      </div>
    </main>
  );
}
