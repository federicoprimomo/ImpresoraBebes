import { NextRequest, NextResponse } from "next/server";

import { saveConnectedAccount } from "@/lib/connected-account";
import { exchangeOAuthCode } from "@/lib/mercadopago";
import { verifyOAuthState } from "@/lib/oauth-state";
import { captureError } from "@/lib/monitoring";

// A propósito NO se arma con `new URL(path, request.url)`: adentro del
// contenedor, detrás del proxy de Coolify, `request.url` refleja el host
// interno (localhost:puerto), no el dominio público — mandaría al
// navegador a una URL que no existe para él. NEXT_PUBLIC_APP_URL es la
// misma fuente que ya usa oauth/start para este mismo motivo.
function redirectTo(path: string) {
  return NextResponse.redirect(new URL(path, process.env.NEXT_PUBLIC_APP_URL));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const error = searchParams.get("error");
  if (error) {
    // El vendedor canceló la autorización, o MP rechazó la solicitud.
    return redirectTo("/account/mercadopago?error=denied");
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return redirectTo("/account/mercadopago?error=invalid_request");
  }

  const userId = verifyOAuthState(state);
  if (!userId) {
    return redirectTo("/account/mercadopago?error=invalid_state");
  }

  try {
    const tokens = await exchangeOAuthCode(code);
    await saveConnectedAccount(userId, tokens);
  } catch (err) {
    console.error("Error intercambiando el código OAuth de Mercado Pago", err);
    captureError(err, { userId });
    return redirectTo("/account/mercadopago?error=exchange_failed");
  }

  return redirectTo("/account/mercadopago?connected=1");
}
