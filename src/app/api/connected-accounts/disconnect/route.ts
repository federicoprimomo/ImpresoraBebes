import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// A propósito NO se arma con `new URL(path, request.url)`: adentro del
// contenedor, detrás del proxy de Coolify, request.url refleja el host
// interno (localhost:puerto), no el dominio público — mandaría al
// navegador a una URL que no existe para él. Mismo motivo que
// oauth/callback y oauth/start.
function redirectTo(path: string) {
  return NextResponse.redirect(new URL(path, process.env.NEXT_PUBLIC_APP_URL));
}

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return redirectTo("/login");
  }

  // No borramos los tokens acá (podría haber una orden en curso que todavía
  // necesite operar contra la cuenta), solo marcamos la desconexión para que
  // no se puedan crear ventas nuevas contra este vendedor.
  await prisma.connectedAccount.updateMany({
    where: { userId: session.user.id },
    data: { status: "DISCONNECTED", disconnectedAt: new Date() },
  });

  return redirectTo("/account/mercadopago");
}
