import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatArsCents, formatDateTime } from "@/lib/format";
import { AdminCaptureButton } from "@/components/admin-capture-button";
import { AdminInvoiceButton } from "@/components/admin-invoice-button";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Procesando pago",
  PAYMENT_FAILED: "Pago rechazado",
  PAYMENT_HELD: "Pago retenido — esperando que el vendedor entregue",
  DELIVERED: "Entregada — esperando confirmación o vencimiento del plazo",
  RELEASED: "Liberada — el vendedor ya cobró",
  DISPUTED: "En disputa",
  REFUNDED: "Reembolsada al comprador",
  EXPIRED: "Vencida (venció el plazo de Mercado Pago sin capturarse)",
  CANCELLED: "Cancelada",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      listing: true,
      buyer: { select: { name: true, email: true } },
      seller: { select: { name: true, email: true } },
      invoice: true,
    },
  });

  if (!order) notFound();

  const isParticipant =
    order.buyerId === session.user.id || order.sellerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isParticipant && !isAdmin) {
    notFound();
  }

  const isBuyer = order.buyerId === session.user.id;
  const canManuallyCapture =
    isAdmin && (order.status === "PAYMENT_HELD" || order.status === "DELIVERED");
  const canManageInvoice = isAdmin && order.status === "RELEASED";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <p className="text-sm text-zinc-500">
        {isBuyer ? "Compra" : "Venta"} · {order.listing.title}
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        {STATUS_LABELS[order.status] ?? order.status}
      </h1>

      {order.lastPaymentError ? (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {order.lastPaymentError}
        </p>
      ) : null}

      <div className="mt-6 rounded-xl border border-black/10 p-5 dark:border-white/10">
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-600 dark:text-zinc-400">Comprador</dt>
            <dd>{order.buyer.name ?? order.buyer.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-600 dark:text-zinc-400">Vendedor</dt>
            <dd>{order.seller.name ?? order.seller.email}</dd>
          </div>
          <div className="mt-2 flex justify-between border-t border-black/10 pt-2 dark:border-white/10">
            <dt className="text-zinc-600 dark:text-zinc-400">Total pagado</dt>
            <dd>{formatArsCents(order.amountArs)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-600 dark:text-zinc-400">
              Comisión de la plataforma
            </dt>
            <dd>{formatArsCents(order.buyerFeeArs + order.sellerFeeArs)}</dd>
          </div>
          {order.sellerPayoutArs !== null ? (
            <div className="flex justify-between font-semibold">
              <dt>Recibe el vendedor</dt>
              <dd>{formatArsCents(order.sellerPayoutArs)}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="mt-6 rounded-xl border border-black/10 p-5 text-sm dark:border-white/10">
        <p className="font-medium">Línea de tiempo</p>
        <ul className="mt-3 flex flex-col gap-1 text-zinc-600 dark:text-zinc-400">
          <li>Creada: {formatDateTime(order.createdAt)}</li>
          <li>Pago autorizado: {formatDateTime(order.authorizedAt)}</li>
          <li>Entregada: {formatDateTime(order.deliveredAt)}</li>
          <li>Descargada: {formatDateTime(order.downloadedAt)}</li>
          <li>Liberación programada para: {formatDateTime(order.releaseDueAt)}</li>
          <li>Liberada: {formatDateTime(order.releasedAt)}</li>
        </ul>
      </div>

      {!isBuyer && order.invoice ? (
        <div className="mt-6 rounded-xl border border-black/10 p-5 text-sm dark:border-white/10">
          <p className="font-medium">Factura de la comisión (ARCA)</p>
          {order.invoice.status === "ISSUED" ? (
            <dl className="mt-3 flex flex-col gap-1 text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between">
                <dt>Comprobante</dt>
                <dd>
                  Factura C {String(order.invoice.puntoVenta).padStart(4, "0")}-
                  {String(order.invoice.numero).padStart(8, "0")}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>CAE</dt>
                <dd>{order.invoice.cae}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Vencimiento CAE</dt>
                <dd>{formatDateTime(order.invoice.caeVencimiento)}</dd>
              </div>
            </dl>
          ) : order.invoice.status === "FAILED" ? (
            <p className="mt-2 text-red-700 dark:text-red-400">
              No se pudo emitir: {order.invoice.errorMessage}
            </p>
          ) : (
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">Pendiente de emisión.</p>
          )}
        </div>
      ) : null}

      {canManuallyCapture ? (
        <div className="mt-6">
          <AdminCaptureButton orderId={order.id} />
        </div>
      ) : null}

      {canManageInvoice ? (
        <div className="mt-3">
          <AdminInvoiceButton orderId={order.id} />
        </div>
      ) : null}
    </main>
  );
}
