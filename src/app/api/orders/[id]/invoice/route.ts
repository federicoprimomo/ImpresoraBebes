import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { issueCommissionInvoice } from "@/lib/arca/invoice";

/**
 * Emite (o reintenta) manualmente la factura de comisión de una orden ya
 * liberada. Útil cuando ARCA_AUTO_INVOICE_ON_RELEASE está en false, o
 * cuando el intento automático falló y hace falta reintentar.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "La orden no existe." }, { status: 404 });
  }
  if (order.status !== "RELEASED") {
    return NextResponse.json(
      { error: "Solo se puede facturar una orden ya liberada." },
      { status: 409 },
    );
  }

  const invoice = await issueCommissionInvoice(order);
  if (!invoice) {
    return NextResponse.json(
      { error: "La facturación con ARCA está desactivada (ARCA_ENABLED)." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    status: invoice.status,
    cae: invoice.cae,
    errorMessage: invoice.errorMessage,
  });
}
