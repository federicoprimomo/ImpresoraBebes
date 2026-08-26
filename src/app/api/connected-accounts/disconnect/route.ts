import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // No borramos los tokens acá (podría haber una orden en curso que todavía
  // necesite operar contra la cuenta), solo marcamos la desconexión para que
  // no se puedan crear ventas nuevas contra este vendedor.
  await prisma.connectedAccount.updateMany({
    where: { userId: session.user.id },
    data: { status: "DISCONNECTED", disconnectedAt: new Date() },
  });

  return NextResponse.redirect(new URL("/account/mercadopago", request.url));
}
