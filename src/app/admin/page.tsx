import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatArsCents, formatDateTime } from "@/lib/format";
import { getArcaConfig } from "@/lib/arca/config";
import { CheckCircleIcon, XCircleIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

type SetupCheck = { label: string; ok: boolean; hint: string };

function getSetupChecks(): SetupCheck[] {
  return [
    {
      label: "Cuenta de Mercado Pago de la plataforma",
      ok: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN),
      hint: "MERCADOPAGO_ACCESS_TOKEN — la tuya, no la de un vendedor. Es donde cae la comisión de cada venta. Se saca del panel de Mercado Pago Developers, no se \"conecta\" desde acá porque hay una sola.",
    },
    {
      label: "OAuth para que los vendedores conecten su cuenta",
      ok: Boolean(process.env.MERCADOPAGO_CLIENT_ID && process.env.MERCADOPAGO_CLIENT_SECRET),
      hint: "MERCADOPAGO_CLIENT_ID / MERCADOPAGO_CLIENT_SECRET — credenciales de tu aplicación de Mercado Pago (no de una cuenta puntual).",
    },
    {
      label: "Checkout con tarjeta",
      ok: Boolean(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY),
      hint: "NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY — para tokenizar la tarjeta en el navegador del comprador.",
    },
    {
      label: "Webhook de Mercado Pago",
      ok: Boolean(process.env.MERCADOPAGO_WEBHOOK_SECRET),
      hint: "MERCADOPAGO_WEBHOOK_SECRET — valida que las notificaciones de pago sean realmente de Mercado Pago.",
    },
    {
      label: "Login con Google",
      ok: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
      hint: "AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET — sin esto nadie puede iniciar sesión.",
    },
    {
      label: "Worker de liberación automática",
      ok: Boolean(process.env.CRON_SECRET),
      hint: "CRON_SECRET — además hace falta un cron real (Vercel Cron u otro) pegándole a /api/cron/capture-orders cada 15-30 min.",
    },
    {
      label: "Facturación de la comisión en ARCA",
      ok: getArcaConfig() !== null,
      hint: "ARCA_ENABLED=true + CUIT + certificado — opcional, pero sin esto la comisión no se factura sola.",
    },
  ];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Procesando pago",
  PAYMENT_FAILED: "Pago rechazado",
  PAYMENT_HELD: "Pago retenido",
  DELIVERED: "Entregada",
  RELEASED: "Liberada",
  DISPUTED: "En disputa",
  REFUNDED: "Reembolsada",
  EXPIRED: "Vencida",
  CANCELLED: "Cancelada",
};

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-black/10 p-5 dark:border-white/10">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const [
    commissionAgg,
    releasedAgg,
    ordersByStatus,
    connectedSellers,
    openDisputes,
    failedInvoices,
    recentCommissions,
  ] = await Promise.all([
    prisma.commissionLedgerEntry.aggregate({
      _sum: { totalFeeArs: true, buyerFeeArs: true, sellerFeeArs: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { status: "RELEASED" },
      _sum: { amountArs: true },
    }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
    prisma.connectedAccount.count({ where: { status: "CONNECTED" } }),
    prisma.dispute.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
      include: { order: { include: { listing: { select: { title: true } } } } },
    }),
    prisma.invoice.findMany({
      where: { status: "FAILED" },
      orderBy: { updatedAt: "desc" },
      include: { order: { include: { listing: { select: { title: true } } } } },
    }),
    prisma.commissionLedgerEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        order: {
          include: {
            listing: { select: { title: true } },
            buyer: { select: { name: true, email: true } },
            seller: { select: { name: true, email: true } },
          },
        },
      },
    }),
  ]);

  const statusCounts = new Map<string, number>(
    ordersByStatus.map((row) => [row.status, row._count]),
  );

  const setupChecks = getSetupChecks();
  const pendingSetup = setupChecks.filter((check) => !check.ok);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Panel de administración
        </h1>
        <Link
          href="/admin/content"
          className="flex h-9 shrink-0 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.06]"
        >
          Editar contenido del sitio
        </Link>
      </div>

      <div className="mt-6 rounded-xl border border-black/10 p-5 text-sm dark:border-white/10">
        <div className="flex items-center justify-between">
          <p className="font-medium">Configuración de la plataforma</p>
          {pendingSetup.length === 0 ? (
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
              Todo configurado
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {pendingSetup.length} pendiente{pendingSetup.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <ul className="mt-3 flex flex-col gap-3">
          {setupChecks.map((check) => (
            <li key={check.label} className="flex gap-2.5">
              {check.ok ? (
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
              ) : (
                <XCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
              )}
              <div>
                <p className={check.ok ? "text-zinc-950 dark:text-zinc-50" : "font-medium text-zinc-950 dark:text-zinc-50"}>
                  {check.label}
                </p>
                <p className="text-xs text-zinc-500">{check.hint}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Comisión cobrada"
          value={formatArsCents(commissionAgg._sum.totalFeeArs ?? 0)}
          hint={`${commissionAgg._count} orden${commissionAgg._count === 1 ? "" : "es"} liberada${commissionAgg._count === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Volumen transaccionado"
          value={formatArsCents(releasedAgg._sum.amountArs ?? 0)}
          hint="Solo órdenes liberadas"
        />
        <StatCard
          label="Vendedores conectados"
          value={String(connectedSellers)}
        />
        <StatCard
          label="Reclamos abiertos"
          value={String(openDisputes.length)}
        />
      </div>

      <div className="mt-6 rounded-xl border border-black/10 p-5 text-sm dark:border-white/10">
        <p className="font-medium">Órdenes por estado</p>
        <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-zinc-600 sm:grid-cols-3 dark:text-zinc-400">
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <li key={status} className="flex justify-between gap-2">
              <span>{label}</span>
              <span className="font-medium text-zinc-950 dark:text-zinc-50">
                {statusCounts.get(status) ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {openDisputes.length > 0 ? (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm dark:border-amber-900 dark:bg-amber-950">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Reclamos que necesitan resolución
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {openDisputes.map((dispute) => (
              <li key={dispute.id}>
                <Link
                  href={`/orders/${dispute.orderId}`}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 hover:bg-amber-100 dark:bg-zinc-900 dark:hover:bg-amber-900/40"
                >
                  <span>{dispute.order.listing.title}</span>
                  <span className="text-xs text-zinc-500">
                    abierto {formatDateTime(dispute.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {failedInvoices.length > 0 ? (
        <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-5 text-sm dark:border-red-900 dark:bg-red-950">
          <p className="font-medium text-red-900 dark:text-red-200">
            Facturas de ARCA que fallaron
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {failedInvoices.map((invoice) => (
              <li key={invoice.id}>
                <Link
                  href={`/orders/${invoice.orderId}`}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 hover:bg-red-100 dark:bg-zinc-900 dark:hover:bg-red-900/40"
                >
                  <span>{invoice.order.listing.title}</span>
                  <span className="text-xs text-zinc-500">
                    {invoice.errorMessage ?? "sin detalle"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 rounded-xl border border-black/10 p-5 text-sm dark:border-white/10">
        <p className="font-medium">Comisiones recientes</p>
        {recentCommissions.length === 0 ? (
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Todavía no se liberó ninguna orden.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-black/10 text-xs uppercase text-zinc-500 dark:border-white/10">
                  <th className="py-2 pr-3 font-medium">Entrada</th>
                  <th className="py-2 pr-3 font-medium">Vendedor</th>
                  <th className="py-2 pr-3 font-medium">Comisión</th>
                  <th className="py-2 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {recentCommissions.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-2 pr-3">
                      <Link href={`/orders/${entry.orderId}`} className="hover:underline">
                        {entry.order.listing.title}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                      {entry.order.seller.name ?? entry.order.seller.email}
                    </td>
                    <td className="py-2 pr-3">{formatArsCents(entry.totalFeeArs)}</td>
                    <td className="py-2 text-zinc-600 dark:text-zinc-400">
                      {formatDateTime(entry.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
