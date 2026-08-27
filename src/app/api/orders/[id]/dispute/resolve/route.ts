import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { DisputeError, resolveDispute } from "@/lib/dispute";
import { OrderExpiredError, OrderNotCapturableError } from "@/lib/capture-order";
import { captureError } from "@/lib/monitoring";

type Body = { resolution?: "RELEASE" | "REFUND"; note?: string };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as Body;

  if (body.resolution !== "RELEASE" && body.resolution !== "REFUND") {
    return NextResponse.json(
      { error: "resolution tiene que ser RELEASE o REFUND." },
      { status: 400 },
    );
  }

  try {
    await resolveDispute({
      orderId: id,
      adminId: session.user.id,
      resolution: body.resolution,
      note: body.note,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof DisputeError ||
      error instanceof OrderNotCapturableError ||
      error instanceof OrderExpiredError
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Error resolviendo disputa", error);
    captureError(error, { orderId: id });
    return NextResponse.json(
      { error: "No pudimos resolver el reclamo." },
      { status: 502 },
    );
  }
}
