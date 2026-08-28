import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatArsCents, formatDateTime } from "@/lib/format";
import { DeliveryError, uploadDelivery } from "@/lib/delivery";
import { DisputeError, openDispute } from "@/lib/dispute";
import { AdminCaptureButton } from "@/components/admin-capture-button";
import { ConfirmDownloadLink } from "@/components/confirm-download-link";
import { AdminInvoiceButton } from "@/components/admin-invoice-button";
import { AdminDisputeResolution } from "@/components/admin-dispute-resolution";

export const dynamic = "force-dynamic";

/**
 * En 2da persona para quien corresponda ("tenés que subir", "ya cobraste")
 * en vez de siempre en 3ra persona — antes decía "el vendedor ya cobró"
 * incluso mirándolo desde la cuenta del propio vendedor. Un admin que no
 * es ninguna de las dos partes sigue viendo la versión neutra en 3ra
 * persona (ver default en cada branch).
 */
function getStatusLabel(
  status: string,
  viewer: { isBuyer: boolean; isSeller: boolean },
): string {
  switch (status) {
    case "PENDING_PAYMENT":
      return "Procesando pago";
    case "PAYMENT_FAILED":
      return "Pago rechazado";
    case "PAYMENT_HELD":
      return viewer.isSeller
        ? "Pago retenido — subí la entrada para poder cobrar"
        : "Pago retenido — esperando que el vendedor entregue";
    case "DELIVERED":
      return viewer.isBuyer
        ? "Entregada — descargala para confirmar"
        : "Entregada — esperando que el comprador confirme";
    case "RELEASED":
      return viewer.isSeller ? "Liberada — ya cobraste" : "Liberada — el vendedor ya cobró";
    case "DISPUTED":
      return "En disputa";
    case "REFUNDED":
      return viewer.isBuyer ? "Reembolsada — te devolvimos el pago" : "Reembolsada al comprador";
    case "EXPIRED":
      return "Vencida (venció el plazo de Mercado Pago sin capturarse)";
    case "CANCELLED":
      return "Cancelada";
    default:
      return status;
  }
}

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
      delivery: true,
      dispute: true,
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
  const isSeller = order.sellerId === session.user.id;
  const canManuallyCapture =
    isAdmin && (order.status === "PAYMENT_HELD" || order.status === "DELIVERED");
  const canManageInvoice = isAdmin && order.status === "RELEASED";

  const canUploadDelivery =
    isSeller &&
    !order.downloadedAt &&
    (order.status === "PAYMENT_HELD" || order.status === "DELIVERED");
  const canDownloadDelivery = isBuyer && Boolean(order.delivery);
  // Descargar la entrada es la confirmación del comprador de que está
  // conforme (se le avisa explícitamente en el checkbox antes de bajar el
  // archivo) — a partir de ahí ya no puede abrir un reclamo, mismo criterio
  // que aplica openDispute() del lado del server.
  const canOpenDispute =
    isBuyer &&
    !order.dispute &&
    !order.downloadedAt &&
    (order.status === "PAYMENT_HELD" || order.status === "DELIVERED");

  async function deliver(formData: FormData) {
    "use server";

    const uploaderSession = await auth();
    if (!uploaderSession?.user) redirect("/login");

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Elegí un archivo para subir.");
    }

    try {
      await uploadDelivery({
        orderId: id,
        sellerId: uploaderSession.user.id,
        fileName: file.name,
        contentType: file.type,
        data: Buffer.from(await file.arrayBuffer()),
      });
    } catch (error) {
      throw new Error(
        error instanceof DeliveryError ? error.message : "No pudimos subir el archivo.",
      );
    }

    revalidatePath(`/orders/${id}`);
  }

  async function reportIssue(formData: FormData) {
    "use server";

    const buyerSession = await auth();
    if (!buyerSession?.user) redirect("/login");

    try {
      await openDispute({
        orderId: id,
        buyerId: buyerSession.user.id,
        reason: String(formData.get("reason") ?? ""),
        evidence: String(formData.get("evidence") ?? ""),
      });
    } catch (error) {
      throw new Error(
        error instanceof DisputeError ? error.message : "No pudimos abrir el reclamo.",
      );
    }

    revalidatePath(`/orders/${id}`);
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <p className="text-sm text-zinc-500">
        {isBuyer ? "Compra" : "Venta"} · {order.listing.title}
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        {getStatusLabel(order.status, { isBuyer, isSeller })}
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
              Comisión de Escrow.ar
            </dt>
            <dd>{formatArsCents(order.buyerFeeArs + order.sellerFeeArs)}</dd>
          </div>
          {order.mpFeeArs !== null ? (
            <div className="flex justify-between">
              <dt className="text-zinc-600 dark:text-zinc-400">
                Costo de Mercado Pago
              </dt>
              <dd>{formatArsCents(order.mpFeeArs)}</dd>
            </div>
          ) : null}
          {order.sellerPayoutArs !== null ? (
            <div className="flex justify-between font-semibold">
              <dt>
                Recibe el vendedor
                {order.mpFeeArs === null ? (
                  <span className="ml-1 font-normal text-zinc-500">(estimado)</span>
                ) : null}
              </dt>
              <dd>{formatArsCents(order.sellerPayoutArs)}</dd>
            </div>
          ) : null}
        </dl>
        {order.mpFeeArs === null ? (
          <p className="mt-3 text-xs text-zinc-500">
            El monto estimado todavía no descuenta el costo propio de Mercado
            Pago por procesar el cobro (variable, aparte de nuestra comisión).
            El neto exacto se confirma al liberarse el pago.
          </p>
        ) : null}
      </div>

      {canUploadDelivery ? (
        <div className="mt-6 rounded-xl border border-black/10 p-5 text-sm dark:border-white/10">
          <p className="font-medium">
            {order.delivery ? "Reemplazar la entrada subida" : "Subir la entrada"}
          </p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            PDF, PNG, JPG o WEBP, hasta 8MB. Al subirla, le avisamos por mail
            al comprador para que la descargue — recién ahí arranca el
            plazo para liberar el pago. Una vez que la descargue, no se va
            a poder reemplazar.
          </p>
          <form action={deliver} className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="file"
              name="file"
              required
              accept="application/pdf,image/png,image/jpeg,image/webp"
              className="flex-1 text-sm"
            />
            <button
              type="submit"
              className="flex h-10 shrink-0 items-center justify-center rounded-full bg-brand px-5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
            >
              {order.delivery ? "Reemplazar" : "Subir"}
            </button>
          </form>
        </div>
      ) : null}

      {isSeller && order.delivery && order.downloadedAt ? (
        <div className="mt-6 rounded-xl border border-black/10 p-5 text-sm dark:border-white/10">
          <p className="font-medium">Entrada entregada</p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {order.delivery.fileName} · el comprador ya la descargó.
          </p>
        </div>
      ) : null}

      {canDownloadDelivery ? (
        <div className="mt-6 rounded-xl border border-black/10 p-5 text-sm dark:border-white/10">
          <p className="font-medium">Tu entrada</p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {order.delivery!.fileName}
            {order.downloadedAt
              ? " — ya la descargaste."
              : " — descargala para confirmar la recepción."}
          </p>
          {order.downloadedAt ? (
            <a
              href={`/api/orders/${order.id}/download`}
              className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-brand px-5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
            >
              Descargar entrada
            </a>
          ) : (
            <>
              <ConfirmDownloadLink
                href={`/api/orders/${order.id}/download`}
                confirmMessage={
                  "Al descargar la entrada confirmás que:\n\n" +
                  "• Revisaste que la entrada es correcta y estás conforme con lo que recibiste.\n" +
                  "• Le das el visto bueno a esta compra: a partir de ahora ya NO vas a poder abrir un reclamo, ni contra el vendedor ni contra Escrow.ar.\n" +
                  "• El pago se libera al vendedor en este mismo momento — no hay vuelta atrás.\n\n" +
                  "¿Confirmás que querés descargarla?"
                }
                className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-brand px-5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
              >
                Descargar entrada
              </ConfirmDownloadLink>
              <p className="mt-3 text-xs text-zinc-500">
                Revisá la entrada ANTES de descargar — al hacerlo, das tu
                consentimiento de que la recibiste correctamente y renunciás
                a reclamar (ni al vendedor, ni a Escrow.ar). El pago se
                libera al vendedor en el momento, sin plazo de espera.
              </p>
            </>
          )}
        </div>
      ) : null}

      {order.dispute ? (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm dark:border-amber-900 dark:bg-amber-950">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Reclamo{" "}
            {order.dispute.status === "OPEN"
              ? "abierto"
              : order.dispute.status === "RESOLVED_RELEASE"
                ? "resuelto: se liberó el pago al vendedor"
                : "resuelto: se canceló el pago y vuelve al comprador"}
          </p>
          <p className="mt-2 text-amber-900 dark:text-amber-200">
            <span className="font-medium">Motivo:</span> {order.dispute.reason}
          </p>
          {order.dispute.evidence ? (
            <p className="mt-1 text-amber-900 dark:text-amber-200">
              <span className="font-medium">Evidencia:</span> {order.dispute.evidence}
            </p>
          ) : null}
          {order.dispute.resolution ? (
            <p className="mt-1 text-amber-900 dark:text-amber-200">
              <span className="font-medium">Nota de resolución:</span>{" "}
              {order.dispute.resolution}
            </p>
          ) : null}

          {isAdmin && order.dispute.status === "OPEN" ? (
            <div className="mt-4">
              <AdminDisputeResolution orderId={order.id} />
            </div>
          ) : null}
        </div>
      ) : null}

      {canOpenDispute ? (
        <div className="mt-6 rounded-xl border border-black/10 p-5 text-sm dark:border-white/10">
          <p className="font-medium">¿Algo no está bien?</p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Si la entrada no llegó, es inválida, o algo no cierra, contanos
            antes de descargarla — una vez que la descargues, ya no vas a
            poder abrir un reclamo. Un admin lo va a revisar.
          </p>
          <form action={reportIssue} className="mt-3 flex flex-col gap-3">
            <textarea
              name="reason"
              required
              rows={2}
              placeholder="¿Qué pasó?"
              className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
            />
            <textarea
              name="evidence"
              rows={2}
              placeholder="Evidencia (opcional): links, referencias, lo que ayude"
              className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
            />
            <button
              type="submit"
              className="flex h-10 items-center justify-center rounded-full border border-red-300 px-5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              Abrir reclamo
            </button>
          </form>
        </div>
      ) : null}

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
