import { NextRequest, NextResponse } from "next/server";

import { saveConnectedAccount } from "@/lib/connected-account";
import { exchangeOAuthCode } from "@/lib/mercadopago";
import { verifyOAuthState } from "@/lib/oauth-state";
import { captureError } from "@/lib/monitoring";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const error = searchParams.get("error");
  if (error) {
    // El vendedor canceló la autorización, o MP rechazó la solicitud.
    return redirectTo(request, "/account/mercadopago?error=denied");
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return redirectTo(request, "/account/mercadopago?error=invalid_request");
  }

  const userId = verifyOAuthState(state);
  if (!userId) {
    return redirectTo(request, "/account/mercadopago?error=invalid_state");
  }

  try {
    const tokens = await exchangeOAuthCode(code);
    await saveConnectedAccount(userId, tokens);
  } catch (err) {
    console.error("Error intercambiando el código OAuth de Mercado Pago", err);
    captureError(err, { userId });
    return redirectTo(request, "/account/mercadopago?error=exchange_failed");
  }

  return redirectTo(request, "/account/mercadopago?connected=1");
}
