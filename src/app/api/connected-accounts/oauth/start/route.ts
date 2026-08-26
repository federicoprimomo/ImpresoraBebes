import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { buildAuthorizationUrl } from "@/lib/mercadopago";
import { createOAuthState } from "@/lib/oauth-state";

/**
 * Punto de entrada para "Conectar Mercado Pago": redirige al vendedor a la
 * pantalla de autorización de MP. El `state` lleva su userId firmado para
 * poder validarlo en el callback (protección CSRF).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  }

  const state = createOAuthState(session.user.id);
  const authorizationUrl = buildAuthorizationUrl(state);

  return NextResponse.redirect(authorizationUrl);
}
