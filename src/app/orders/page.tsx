import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatArsCents, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Procesando pago",
  PAYMENT_FAILED: "Pago rechazado",
  PAYMENT_HELD: "Pago retenido",
  DELIVERED: "Entregada, esperando liberación",
  RELEASED: "Liberada",
  DISPUTED: "En disputa",
  REFUNDED: "Reembolsada",
  EXPIRED: "Vencida",
  CANCELLED: "Cancelada",
};

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const orders = await prisma.order.findMany({
    where: {
      OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }],
    },
    orderBy: { createdAt: "desc" },
    include: { listing: { select: { title: true } } },
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Mis compras y ventas
      </h1>

      {orders.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">
          Todavía no tenés compras ni ventas.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="flex items-center justify-between rounded-xl border border-black/10 p-4 transition-colors hover:bg-black/[.02] dark:border-white/10 dark:hover:bg-white/[.04]"
              >
                <div>
                  <p className="font-medium text-zinc-950 dark:text-zinc-50">
                    {order.listing.title}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {order.buyerId === session.user.id ? "Compra" : "Venta"} ·{" "}
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatArsCents(order.amountArs)}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
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
