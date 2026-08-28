import { Resend } from "resend";

import { prisma } from "@/lib/prisma";
import { formatArsCents } from "@/lib/format";
import { simpleMarkdownToHtml, simpleMarkdownToPlainText } from "@/lib/simple-markdown";
import { captureError } from "@/lib/monitoring";

/**
 * Notificaciones por mail de los eventos del flujo de una orden. Sigue el
 * mismo patrón "apagado si falta configurar" que ARCA (ver
 * lib/arca/config.ts): sin RESEND_API_KEY, notify() no hace nada más que
 * loguear — nunca rompe el pago/entrega/disputa que la disparó.
 */

export type EmailTemplateKey =
  | "order-created"
  | "payment-held"
  | "delivery-ready"
  | "delivery-downloaded"
  | "payment-released"
  | "dispute-opened"
  | "dispute-resolved"
  | "order-expired";

export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateKey, string> = {
  "order-created": "Nueva venta (al vendedor)",
  "payment-held": "Pago retenido (al comprador)",
  "delivery-ready": "Entrada lista para descargar (al comprador)",
  "delivery-downloaded": "El comprador descargó (al vendedor)",
  "payment-released": "Se liberó el pago (al vendedor)",
  "dispute-opened": "Se abrió un reclamo (al vendedor)",
  "dispute-resolved": "Reclamo resuelto (a comprador y vendedor)",
  "order-expired": "La orden venció (a comprador y vendedor)",
};

/**
 * Variables disponibles en cada plantilla, como {{listingTitle}}: título de
 * la entrada, {{amount}} monto formateado en pesos, {{orderUrl}} link a la
 * orden, y {{resolutionSummary}} (solo en dispute-resolved) el resultado.
 */
export const EMAIL_TEMPLATE_DEFAULTS: Record<
  EmailTemplateKey,
  { subject: string; body: string }
> = {
  "order-created": {
    subject: 'Vendiste "{{listingTitle}}" en Escrow.ar',
    body: `Alguien compró tu entrada "{{listingTitle}}" por {{amount}}.

El pago ya quedó autorizado y retenido por Mercado Pago — todavía no te llega nada. Subí la entrada a la plataforma para que el comprador la reciba y arranque el proceso de liberación.

Ver la orden: {{orderUrl}}`,
  },
  "payment-held": {
    subject: 'Tu pago por "{{listingTitle}}" quedó retenido',
    body: `Tu pago de {{amount}} por "{{listingTitle}}" quedó autorizado y retenido por Mercado Pago. Todavía no se le pagó nada al vendedor.

Te avisamos apenas suba la entrada para que la descargues.

Ver la orden: {{orderUrl}}`,
  },
  "delivery-ready": {
    subject: 'Tu entrada de "{{listingTitle}}" ya está lista',
    body: `El vendedor subió la entrada de "{{listingTitle}}". Revisala bien ANTES de descargar: al descargarla confirmás que la recibiste correctamente, y ya no vas a poder abrir un reclamo (ni al vendedor, ni a Escrow.ar) — el pago se libera al vendedor en ese mismo momento. Si algo no cierra, reportalo antes de descargar.

Descargar: {{orderUrl}}`,
  },
  "delivery-downloaded": {
    subject: 'El comprador descargó la entrada de "{{listingTitle}}"',
    body: `El comprador descargó la entrada de "{{listingTitle}}", confirmando que la recibió correctamente. Estamos liberando el pago a tu cuenta ahora mismo — te llega otro mail apenas se acredite.

Ver la orden: {{orderUrl}}`,
  },
  "payment-released": {
    subject: 'Se liberó el pago de "{{listingTitle}}"',
    body: `Se liberó a tu cuenta de Mercado Pago el pago de "{{listingTitle}}": {{amount}}.

Ver la orden: {{orderUrl}}`,
  },
  "dispute-opened": {
    subject: 'Se abrió un reclamo sobre "{{listingTitle}}"',
    body: `El comprador abrió un reclamo sobre la venta de "{{listingTitle}}". El pago queda retenido hasta que un administrador lo revise.

Ver la orden: {{orderUrl}}`,
  },
  "dispute-resolved": {
    subject: 'Se resolvió el reclamo sobre "{{listingTitle}}"',
    body: `Un administrador resolvió el reclamo sobre "{{listingTitle}}": {{resolutionSummary}}.

Ver la orden: {{orderUrl}}`,
  },
  "order-expired": {
    subject: 'La orden de "{{listingTitle}}" venció',
    body: `La orden de "{{listingTitle}}" venció sin resolverse dentro del plazo y se canceló. Si se llegó a autorizar un pago, la autorización se cae sola y no se cobra nada.

Ver la orden: {{orderUrl}}`,
  },
};

type EmailConfig = { apiKey: string; from: string };
let cachedConfig: EmailConfig | null | undefined;

export function getEmailConfig(): EmailConfig | null {
  if (cachedConfig !== undefined) return cachedConfig;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    cachedConfig = null;
    return cachedConfig;
  }

  cachedConfig = {
    apiKey,
    from: process.env.EMAIL_FROM || "Escrow.ar <notificaciones@escrow.ar>",
  };
  return cachedConfig;
}

/** Solo para tests — evita que la config quede cacheada entre casos. */
export function resetEmailConfigCache() {
  cachedConfig = undefined;
}

/** Exportado solo para tests — el resto del código usa notify()/notifyOrderEvent(). */
export function renderTemplate(
  template: { subject: string; body: string },
  vars: Record<string, string>,
) {
  const replace = (source: string) =>
    source.replace(/{{\s*(\w+)\s*}}/g, (_match, key: string) => vars[key] ?? "");
  return { subject: replace(template.subject), body: replace(template.body) };
}

/** Plantilla editable desde /admin/emails, o el default si nadie la tocó. */
export async function getEmailTemplate(key: EmailTemplateKey) {
  const row = await prisma.emailTemplate.findUnique({ where: { key } });
  if (row) return row;

  const fallback = EMAIL_TEMPLATE_DEFAULTS[key];
  return { key, subject: fallback.subject, body: fallback.body, enabled: true, updatedAt: new Date(0) };
}

/**
 * Envía un email a partir de una plantilla. Nunca lanza: sin
 * RESEND_API_KEY, o si la plantilla está desactivada, o si Resend
 * responde con un error, solo se loguea — una notificación caída no puede
 * tirar abajo el pago/entrega/disputa que la disparó.
 */
export async function notify(
  key: EmailTemplateKey,
  input: { to: string; vars: Record<string, string> },
) {
  const config = getEmailConfig();
  if (!config) {
    console.log(
      `[email] RESEND_API_KEY no configurada — no se envía "${key}" a ${input.to}.`,
    );
    return;
  }

  try {
    const template = await getEmailTemplate(key);
    if (!template.enabled) return;

    const { subject, body } = renderTemplate(template, input.vars);
    const resend = new Resend(config.apiKey);
    await resend.emails.send({
      from: config.from,
      to: input.to,
      subject,
      html: simpleMarkdownToHtml(body),
      text: simpleMarkdownToPlainText(body),
    });
  } catch (error) {
    console.error(`[email] Error enviando "${key}" a ${input.to}`, error);
    captureError(error, { template: key, to: input.to });
  }
}

type NotifyRecipient = "buyer" | "seller" | "both";

/**
 * Atajo para los eventos de una orden: busca lo que necesitan las
 * plantillas (título, monto, link) y llama a notify() para cada
 * destinatario que corresponda. Tampoco lanza nunca — se usa desde el
 * medio de flujos de pago/entrega/disputa que no pueden fallar por esto.
 */
export async function notifyOrderEvent(
  key: EmailTemplateKey,
  orderId: string,
  options: { to: NotifyRecipient; extraVars?: Record<string, string> },
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        listing: { select: { title: true } },
        buyer: { select: { email: true } },
        seller: { select: { email: true } },
      },
    });
    if (!order) return;

    const vars: Record<string, string> = {
      listingTitle: order.listing.title,
      amount: formatArsCents(order.amountArs),
      orderUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/orders/${order.id}`,
      ...options.extraVars,
    };

    if ((options.to === "buyer" || options.to === "both") && order.buyer.email) {
      await notify(key, { to: order.buyer.email, vars });
    }
    if ((options.to === "seller" || options.to === "both") && order.seller.email) {
      await notify(key, { to: order.seller.email, vars });
    }
  } catch (error) {
    console.error(
      `[email] Error preparando la notificación "${key}" para la orden ${orderId}`,
      error,
    );
    captureError(error, { template: key, orderId });
  }
}
