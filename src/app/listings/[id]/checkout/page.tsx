import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateOrderFees } from "@/lib/fees";
import { formatArsCents } from "@/lib/format";
import { isEventPast } from "@/lib/listing";
import { CardCheckoutForm } from "@/components/card-checkout-form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=/listings/${id}/checkout`);
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { seller: { include: { connectedAccount: true } } },
  });

  if (!listing) notFound();

  if (listing.sellerId === session.user.id) {
    redirect(`/listings/${id}`);
  }
  if (listing.status !== "ACTIVE") {
    redirect(`/listings/${id}`);
  }
  if (listing.seller.connectedAccount?.status !== "CONNECTED") {
    redirect(`/listings/${id}`);
  }
  if (isEventPast(listing.eventDate)) {
    redirect(`/listings/${id}`);
  }

  const fees = calculateOrderFees(listing.priceArs);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Pagar con tarjeta
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {listing.title}
      </p>

      <div className="mt-4 rounded-lg bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-800">
        <div className="flex justify-between font-semibold">
          <span>Total a pagar</span>
          <span>{formatArsCents(fees.amountArs)}</span>
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
        Se paga con tarjeta de crédito o débito — no se acepta el saldo de
        tu cuenta de Mercado Pago, transferencia ni efectivo. La comisión
        de la plataforma la paga el vendedor, nunca se te suma acá. Si
        elegís pagar en cuotas con interés, el total que te cobre tu
        tarjeta va a ser mayor al precio publicado — eso es financiación
        del banco, no algo que cobremos nosotros ni Mercado Pago.
      </p>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
        El pago se retiene y solo se libera al vendedor cuando la entrada
        se confirma entregada.
      </p>

      <div className="mt-6">
        <CardCheckoutForm
          listingId={listing.id}
          amountArs={fees.amountArs}
          publicKey={process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? null}
        />
      </div>
    </main>
  );
}
