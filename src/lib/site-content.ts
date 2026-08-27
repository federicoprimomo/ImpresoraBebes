import { prisma } from "@/lib/prisma";

/**
 * Contenido de texto editable desde /admin/content. Si una key no tiene
 * fila en la base, se usa el default de acá — así el sitio nunca queda en
 * blanco antes de que alguien edite algo, y estos defaults duplican
 * exactamente lo que ya estaba hardcodeado en la landing y en legal/.
 */
export const SITE_CONTENT_DEFAULTS: Record<string, string> = {
  "hero.eyebrow": "Pago retenido con Mercado Pago",
  "hero.title": "Vendé y comprá entradas sin el tira y afloja de siempre",
  "hero.subtitle":
    "El comprador paga, el dinero queda retenido, y recién se libera al vendedor cuando la entrada fue entregada y confirmada. Ninguna de las dos partes tiene que confiar a ciegas en la otra.",

  "problem.title": "El problema de siempre en la reventa",
  "problem.body1":
    "El vendedor no quiere entregar la entrada hasta tener la plata en la mano. El comprador no quiere pagar hasta tener la entrada. Los dos tienen razón en desconfiar — y ese empate es lo que termina frenando ventas legítimas, o peor, abriendo la puerta a estafas.",
  "problem.body2":
    "Escrow.ar existe para romper ese empate: alguien de confianza sostiene el pago en el medio hasta que la entrega quede confirmada.",

  "cta.title": "¿Listo para operar sin desconfianza?",
  "cta.subtitle":
    "Publicá tu entrada o buscá una para comprar — el pago queda protegido de punta a punta.",

  "legal.terminos.body": `# Qué es Escrow.ar

Escrow.ar es una plataforma que intermedia la reventa de entradas digitales entre un comprador y un vendedor. El pago se procesa a través de Mercado Pago: queda autorizado y retenido, y se libera al vendedor recién cuando la entrada fue entregada y confirmada, o vence el plazo de reclamo sin objeciones. Escrow.ar no es la organizadora del evento ni garantiza la validez de la entrada más allá del proceso de entrega y disputa descripto en esta plataforma.

# Cuentas y verificación

Para operar hace falta iniciar sesión con una cuenta de Google. Para vender, además hace falta conectar una cuenta de Mercado Pago propia — el dinero se transfiere directamente entre la tarjeta del comprador y esa cuenta, nunca por una cuenta de Escrow.ar.

# Comisión

Escrow.ar cobra una comisión del 10% sobre el precio de venta, a cargo del vendedor. El comprador paga exactamente el precio publicado, sin nada sumado. La comisión se factura electrónicamente ante ARCA.

Aparte de esa comisión, Mercado Pago cobra su propio costo por procesar el cobro con tarjeta — varía según la cuenta del vendedor y el plazo de acreditación elegido, y no lo fija Escrow.ar. Ese costo también se descuenta de lo que recibe el vendedor. El monto exacto se confirma recién cuando el pago se libera; hasta ese momento, cualquier estimación mostrada en la plataforma es aproximada.

# Entrega y reclamos

El vendedor entrega la entrada subiéndola a la plataforma. El comprador tiene una ventana de tiempo desde la descarga para reportar un problema. Mientras el reclamo esté abierto, el pago permanece retenido. Un administrador de la plataforma revisa cada reclamo y decide si corresponde liberar el pago al vendedor o cancelar la autorización.

# Límites de responsabilidad

Escrow.ar no participa en la organización del evento ni controla la autenticidad de cada entrada más allá de detectar que el mismo archivo no se haya usado en más de una venta. Mercado Pago retiene la autorización de pago por un máximo de 7 días; si un reclamo no se resuelve en ese plazo, la operación se cae automáticamente.

# Contacto

Consultas a hola@escrow.ar.`,

  "legal.privacidad.body": `# Qué datos manejamos

- Nombre, email e imagen de perfil de tu cuenta de Google.
- Si vendés: el token de acceso OAuth de tu cuenta de Mercado Pago, guardado encriptado, para poder crear y liberar pagos en tu nombre.
- Los archivos de entrada que subís para entregarlas, y el hash de su contenido (para detectar reventa duplicada).
- Datos de la operación: precio, comisión, estados y fechas de cada compra/venta, y — si corresponde — el motivo de un reclamo.

# Qué NO manejamos

No vemos ni guardamos el número de tu tarjeta — se tokeniza directo en tu navegador contra Mercado Pago. No tenemos acceso a tu cuenta bancaria.

# Con quién se comparte

- Google, para el inicio de sesión.
- Mercado Pago, para procesar el pago (autorización, retención, liberación).
- ARCA (ex-AFIP), al facturar electrónicamente la comisión cobrada.
- La otra parte de cada operación ve lo estrictamente necesario (nombre, email, y el estado de la orden en común).

# Tus derechos

Podés pedir acceso a tus datos, corregirlos, o pedir que se borren (salvo lo que tengamos que conservar por obligaciones fiscales, como los registros de facturación) escribiendo a hola@escrow.ar.`,
};

/**
 * Fallback si la tabla FaqItem está vacía (recién levantado el sitio, antes
 * de correr el seed o de que el admin cargue algo). No se lee de acá una
 * vez que hay filas reales — ver getFaqItems() en la página de la landing.
 */
export const FAQ_DEFAULTS: Array<{ question: string; answer: string }> = [
  {
    question: "¿Por qué tengo que pagar antes de recibir la entrada?",
    answer:
      "Porque el pago no se le entrega al vendedor en ese momento — queda autorizado y retenido por Mercado Pago. Es la única forma de que el vendedor tenga la garantía de que existe un pago real antes de entregar, sin que vos pierdas el control de tu plata: si algo sale mal, todavía no se le pagó a nadie.",
  },
  {
    question: "¿Qué pasa si la entrada que me mandaron es falsa o ya fue usada?",
    answer:
      "Tenés una ventana de tiempo después de descargarla para reclamar. Mientras el reclamo esté abierto, el pago sigue retenido — no se libera. Un administrador revisa el caso y decide si corresponde liberar el pago al vendedor o cancelar la operación.",
  },
  {
    question: "¿Qué pasa si el vendedor nunca sube la entrada?",
    answer:
      "El pago sigue retenido, nunca capturado. Podés abrir un reclamo en cualquier momento mientras esperás, y si nadie lo resuelve antes de los 7 días que da Mercado Pago, la autorización se cae sola — no se le cobra nada a tu tarjeta más allá de esa retención temporal.",
  },
  {
    question: "¿Ustedes tienen acceso a mi tarjeta o a mi cuenta bancaria?",
    answer:
      "No. La tarjeta se tokeniza directo en tu navegador contra Mercado Pago (nunca toca nuestros servidores), y el dinero se mueve entre tu tarjeta y la cuenta de Mercado Pago del vendedor. Nosotros solo indicamos cuándo liberar ese pago ya autorizado.",
  },
  {
    question: "¿Por qué no acepta transferencia o efectivo?",
    answer:
      'Porque la retención del pago (autorizar sin capturar) es una función específica de los pagos con tarjeta. Una transferencia se acredita en el momento y no se puede "retener" de la misma forma, así que perdería el sentido del escrow.',
  },
  {
    question: "¿Cuánto tarda en liberarse el pago al vendedor?",
    answer:
      "Apenas se confirma la entrega, o automáticamente al vencer la ventana de reclamo si el comprador no dijo nada. Mercado Pago pone un límite máximo de 7 días desde el pago para capturarlo — pasado ese plazo sin resolverse, la operación se cae y nadie cobra.",
  },
  {
    question: "¿Quién paga la comisión, el comprador o el vendedor?",
    answer:
      "La nuestra la paga el vendedor: es un 10% sobre el precio de venta, que se descuenta al liberarse el pago. El comprador paga exactamente el precio publicado, sin nada sumado — sin letra chica. Aparte de eso, Mercado Pago cobra su propio costo por procesar el cobro con tarjeta (variable, según la cuenta del vendedor), que también sale del lado del vendedor — el monto final exacto se confirma cuando se libera el pago.",
  },
  {
    question: "¿Esto es legal?",
    answer:
      "Sí. El dinero nunca pasa por una cuenta propia de la plataforma — corre sobre Mercado Pago, que es quien está habilitado para procesar pagos de terceros. Y la comisión que cobramos se factura electrónicamente ante ARCA con CAE, como cualquier otro servicio formal.",
  },
  {
    question: "¿Qué pasa con mis datos?",
    answer:
      "Los datos de pago los maneja directamente Mercado Pago. Los tokens de acceso de los vendedores conectados se guardan encriptados, y no se comparten con nadie más que con las partes involucradas en cada operación.",
  },
];

export async function getFaqItems() {
  const items = await prisma.faqItem.findMany({ orderBy: { order: "asc" } });
  if (items.length > 0) return items;
  return FAQ_DEFAULTS.map((item, index) => ({
    id: `default-${index}`,
    question: item.question,
    answer: item.answer,
    order: index,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }));
}

export async function getSiteContent(key: string): Promise<string> {
  const row = await prisma.siteContent.findUnique({ where: { key } });
  return row?.value ?? SITE_CONTENT_DEFAULTS[key] ?? "";
}

export async function getSiteContentMap<K extends string>(
  keys: K[],
): Promise<Record<K, string>> {
  const rows = await prisma.siteContent.findMany({ where: { key: { in: keys } } });
  const stored = new Map(rows.map((row) => [row.key, row.value]));

  return Object.fromEntries(
    keys.map((key) => [key, stored.get(key) ?? SITE_CONTENT_DEFAULTS[key] ?? ""]),
  ) as Record<K, string>;
}

export async function setSiteContent(key: string, value: string): Promise<void> {
  await prisma.siteContent.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/**
 * SiteContent guarda texto, pero alcanza para un booleano simple guardando
 * "true"/"false" — no vale la pena una tabla aparte solo para esto.
 */
const LISTINGS_PUBLIC_BROWSING_KEY = "listings.publicBrowsingEnabled";

/** Si está apagado, /listings (el buscador público) queda oculto para
 * cualquiera que no sea admin — publicar y los links directos a una
 * entrada puntual siguen andando igual, esto no los toca. */
export async function isPublicBrowsingEnabled(): Promise<boolean> {
  const value = await getSiteContent(LISTINGS_PUBLIC_BROWSING_KEY);
  return value !== "false"; // default: habilitado
}

export async function setPublicBrowsingEnabled(enabled: boolean): Promise<void> {
  await setSiteContent(LISTINGS_PUBLIC_BROWSING_KEY, enabled ? "true" : "false");
}
