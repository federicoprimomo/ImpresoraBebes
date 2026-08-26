import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateOrderFees } from "@/lib/fees";
import { formatArsCents } from "@/lib/format";
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

  const fees = calculateOrderFees(listing.priceArs);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Pagar con tarjeta
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {listing.title}
      </p>

      <div className="mt-4 rounded-lg bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-900">
        <div className="flex justify-between">
          <span>Precio</span>
          <span>{formatArsCents(fees.priceArs)}</span>
        </div>
        <div className="flex justify-between">
          <span>Comisión de la plataforma</span>
          <span>{formatArsCents(fees.buyerFeeArs)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-black/10 pt-1 font-semibold dark:border-white/10">
          <span>Total</span>
          <span>{formatArsCents(fees.amountArs)}</span>
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
        Este pago se retiene y solo se libera al vendedor cuando la entrada
        se confirma entregada. Solo se acepta tarjeta.
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
