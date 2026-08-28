import Link from "next/link";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatArsCents, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

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

const STATUS_ORDER = Object.keys(STATUS_LABELS);

/**
 * A diferencia de /orders (que solo muestra las propias), esta es la
 * única pantalla donde un admin puede encontrar CUALQUIER orden del
 * sistema sin tener que ir a la base de datos a mano — antes, una orden
 * sin disputa ni factura fallida (ej. una recién pagada, esperando
 * entrega) no aparecía en ningún lado del panel de admin.
 */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const { status } = await searchParams;
  const statusFilter: OrderStatus | undefined =
    status && STATUS_LABELS[status] ? (status as OrderStatus) : undefined;

  const orders = await prisma.order.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      listing: { select: { title: true } },
      buyer: { select: { name: true, email: true } },
      seller: { select: { name: true, email: true } },
    },
  });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Todas las operaciones
        </h1>
        <Link
          href="/admin"
          className="flex h-9 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.06]"
        >
          Volver al panel
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link
          href="/admin/orders"
          className={
            !statusFilter
              ? "rounded-full bg-brand px-3 py-1 font-medium text-brand-foreground"
              : "rounded-full border border-black/10 px-3 py-1 hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.06]"
          }
        >
          Todas
        </Link>
        {STATUS_ORDER.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={
              statusFilter === s
                ? "rounded-full bg-brand px-3 py-1 font-medium text-brand-foreground"
                : "rounded-full border border-black/10 px-3 py-1 hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.06]"
            }
          >
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">
          No hay operaciones{statusFilter ? " en este estado" : ""}.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="flex flex-col gap-1 rounded-xl border border-black/10 p-4 text-sm transition-colors hover:bg-black/[.02] sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:hover:bg-white/[.04]"
              >
                <div>
                  <p className="font-medium text-zinc-950 dark:text-zinc-50">
                    {order.listing.title}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {order.buyer.name ?? order.buyer.email} → {order.seller.name ?? order.seller.email}
                    {" · "}
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-zinc-950 dark:text-zinc-50">
                    {formatArsCents(order.amountArs)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {STATUS_LABELS[order.status] ?? order.status}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
