import Link from "next/link";

import {
  BuildingBankIcon,
  CardIcon,
  ClockIcon,
  LockIcon,
  ReceiptIcon,
  ScaleIcon,
  ShieldCheckIcon,
  UploadIcon,
} from "@/components/icons";

const buyerSteps = [
  {
    icon: CardIcon,
    title: "Pagás con tarjeta",
    body: "El monto queda autorizado y retenido por Mercado Pago. Todavía no le llega un peso al vendedor.",
  },
  {
    icon: ClockIcon,
    title: "Esperás la entrada",
    body: "El vendedor la sube a la plataforma. La descargás vos, directo desde acá — nunca por WhatsApp ni por fuera del sitio.",
  },
  {
    icon: ScaleIcon,
    title: "Confirmás o reclamás",
    body: "Si está todo bien, no hacés nada: se libera sola. Si algo no cierra, abrís un reclamo y lo revisa una persona antes de que se le pague al vendedor.",
  },
];

const sellerSteps = [
  {
    icon: BuildingBankIcon,
    title: "Conectás tu Mercado Pago",
    body: "Autorizás a Escrow.ar a operar sobre tu propia cuenta. La plata nunca pasa por una cuenta nuestra — va directo de Mercado Pago a la tuya.",
  },
  {
    icon: UploadIcon,
    title: "Publicás y subís la entrada",
    body: "Cuando alguien compra, subís el archivo o código de la entrada a la plataforma para que la reciba.",
  },
  {
    icon: LockIcon,
    title: "Cobrás cuando se confirma",
    body: "Apenas se confirma la entrega (o pasa el plazo sin reclamos), Mercado Pago te libera el pago automáticamente, menos la comisión.",
  },
];

const trustPoints = [
  {
    icon: LockIcon,
    title: "La plata nunca es nuestra",
    body: "No tenemos una cuenta bancaria propia por donde pasa tu dinero. Todo el flujo de pago — autorización, retención y liberación — corre sobre la infraestructura de Mercado Pago, con tu propia tarjeta y la cuenta del vendedor.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Nadie se mueve primero",
    body: "El clásico problema de la reventa: el vendedor no entrega hasta cobrar, el comprador no paga hasta recibir. Acá el pago se autoriza antes de la entrega, pero se libera recién después — ninguna de las dos partes queda expuesta.",
  },
  {
    icon: ClockIcon,
    title: "Reglas claras, no promesas",
    body: "Mercado Pago retiene el pago autorizado por un máximo de 7 días. Ese plazo, y la ventana para reclamar después de descargar la entrada, están fijados de antemano — no dependen de la buena voluntad de nadie.",
  },
  {
    icon: ReceiptIcon,
    title: "Comisión facturada, no en negro",
    body: "Cada comisión que cobramos se factura electrónicamente ante ARCA (ex-AFIP), con CAE. Es una operación formal, con respaldo fiscal — no un cobro informal por transferencia.",
  },
];

const faqs = [
  {
    q: "¿Por qué tengo que pagar antes de recibir la entrada?",
    a: "Porque el pago no se le entrega al vendedor en ese momento — queda autorizado y retenido por Mercado Pago. Es la única forma de que el vendedor tenga la garantía de que existe un pago real antes de entregar, sin que vos pierdas el control de tu plata: si algo sale mal, todavía no se le pagó a nadie.",
  },
  {
    q: "¿Qué pasa si la entrada que me mandaron es falsa o ya fue usada?",
    a: "Tenés una ventana de tiempo después de descargarla para reclamar. Mientras el reclamo esté abierto, el pago sigue retenido — no se libera. Un administrador revisa el caso y decide si corresponde liberar el pago al vendedor o reembolsarte.",
  },
  {
    q: "¿Ustedes tienen acceso a mi tarjeta o a mi cuenta bancaria?",
    a: "No. La tarjeta se tokeniza directo en tu navegador contra Mercado Pago (nunca toca nuestros servidores), y el dinero se mueve entre tu tarjeta y la cuenta de Mercado Pago del vendedor. Nosotros solo indicamos cuándo liberar ese pago ya autorizado.",
  },
  {
    q: "¿Por qué no acepta transferencia o efectivo?",
    a: "Porque la retención del pago (autorizar sin capturar) es una función específica de los pagos con tarjeta. Una transferencia se acredita en el momento y no se puede \"retener\" de la misma forma, así que perdería el sentido del escrow.",
  },
  {
    q: "¿Cuánto tarda en liberarse el pago al vendedor?",
    a: "Apenas se confirma la entrega, o automáticamente al vencer la ventana de reclamo si el comprador no dijo nada. Mercado Pago pone un límite máximo de 7 días desde el pago para capturarlo — pasado ese plazo sin resolverse, la operación se cae y nadie cobra.",
  },
  {
    q: "¿La comisión es la misma para el comprador y el vendedor?",
    a: "La comisión se reparte entre las dos partes: una parte se suma al precio que paga el comprador, y la otra se descuenta de lo que cobra el vendedor. Se ve desglosado antes de pagar, sin letra chica.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="border-b border-black/10 bg-zinc-50 px-6 py-20 dark:border-white/10 dark:bg-black">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-white/10 dark:text-zinc-400">
            <LockIcon className="h-3.5 w-3.5" />
            Pago retenido con Mercado Pago
          </span>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
            Vendé y comprá entradas sin el tira y afloja de siempre
          </h1>
          <p className="mt-5 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
            El comprador paga, el dinero queda retenido, y recién se libera al
            vendedor cuando la entrada fue entregada y confirmada. Ninguna de
            las dos partes tiene que confiar a ciegas en la otra.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/listings"
              className="flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Ver entradas en venta
            </Link>
            <Link
              href="/listings/new"
              className="flex h-12 items-center justify-center rounded-full border border-black/10 px-6 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.06]"
            >
              Publicar una entrada
            </Link>
          </div>
        </div>
      </section>

      {/* El problema */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            El problema de siempre en la reventa
          </h2>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            El vendedor no quiere entregar la entrada hasta tener la plata en
            la mano. El comprador no quiere pagar hasta tener la entrada. Los
            dos tienen razón en desconfiar — y ese empate es lo que termina
            frenando ventas legítimas, o peor, abriendo la puerta a
            estafas.
          </p>
          <p className="mt-4 font-medium text-zinc-800 dark:text-zinc-200">
            Escrow.ar existe para romper ese empate: alguien de confianza
            sostiene el pago en el medio hasta que la entrega quede
            confirmada.
          </p>
        </div>
      </section>

      {/* Cómo funciona — comprador / vendedor */}
      <section className="border-y border-black/10 bg-zinc-50 px-6 py-16 dark:border-white/10 dark:bg-zinc-950">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Cómo funciona
          </h2>

          <div className="mt-10 grid gap-10 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Si comprás
              </h3>
              <ol className="mt-4 flex flex-col gap-5">
                {buyerSteps.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm dark:bg-zinc-900 dark:text-zinc-300">
                      <step.icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-500">
                        Paso {i + 1}
                      </p>
                      <p className="font-medium text-zinc-950 dark:text-zinc-50">
                        {step.title}
                      </p>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Si vendés
              </h3>
              <ol className="mt-4 flex flex-col gap-5">
                {sellerSteps.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm dark:bg-zinc-900 dark:text-zinc-300">
                      <step.icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-500">
                        Paso {i + 1}
                      </p>
                      <p className="font-medium text-zinc-950 dark:text-zinc-50">
                        {step.title}
                      </p>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Confianza */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Por qué es seguro
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {trustPoints.map((point) => (
              <div
                key={point.title}
                className="rounded-xl border border-black/10 p-5 dark:border-white/10"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <point.icon className="h-4.5 w-4.5" />
                </div>
                <p className="mt-3 font-medium text-zinc-950 dark:text-zinc-50">
                  {point.title}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {point.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-black/10 bg-zinc-50 px-6 py-16 dark:border-white/10 dark:bg-zinc-950">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Preguntas frecuentes
          </h2>
          <div className="mt-8 flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {faqs.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-zinc-950 marker:content-none dark:text-zinc-50">
                  {item.q}
                  <span className="shrink-0 text-zinc-400 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-20">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            ¿Listo para operar sin desconfianza?
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/listings"
              className="flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Ver entradas en venta
            </Link>
            <Link
              href="/listings/new"
              className="flex h-12 items-center justify-center rounded-full border border-black/10 px-6 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.06]"
            >
              Publicar una entrada
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/10 px-6 py-8 text-center text-xs text-zinc-500 dark:border-white/10">
        <p>
          Escrow.ar — pago retenido para reventa de entradas. Los pagos se
          procesan a través de Mercado Pago; la plataforma nunca tiene
          acceso a tus datos de tarjeta ni a fondos de terceros en una
          cuenta propia.
        </p>
      </footer>
    </main>
  );
}
