import Link from "next/link";

import {
  BuildingBankIcon,
  CardIcon,
  CheckCircleIcon,
  ClockIcon,
  LockIcon,
  ReceiptIcon,
  ScaleIcon,
  ShieldCheckIcon,
  UploadIcon,
  XCircleIcon,
} from "@/components/icons";
import { calculateOrderFees } from "@/lib/fees";
import { formatArsCents } from "@/lib/format";

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

const moneyTimeline = [
  { label: "Autorizado", detail: "El comprador paga; Mercado Pago retiene el monto." },
  { label: "Entregado", detail: "El vendedor sube la entrada a la plataforma." },
  { label: "Ventana de reclamo", detail: "El comprador descarga y tiene tiempo para avisar si algo no cierra." },
  { label: "Liberado", detail: "Sin reclamos, el pago pasa a la cuenta del vendedor solo." },
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

const comparisonRows = [
  {
    old: "El vendedor pide la plata por adelantado, por transferencia, y confía en que el comprador no se arrepienta.",
    escrow: "El pago queda autorizado en el momento y retenido — ninguna de las dos partes entrega nada a ciegas.",
  },
  {
    old: "El comprador manda captura del comprobante de pago y espera que le llegue la entrada por WhatsApp.",
    escrow: "La entrada se sube y se descarga adentro de la plataforma. Queda registrado quién subió qué y cuándo.",
  },
  {
    old: "Si alguien se hace humo, no hay mucho más que hacer que denunciar y esperar.",
    escrow: "El pago sigue retenido durante todo el proceso. Si algo falla, la plata todavía no salió de la tarjeta.",
  },
  {
    old: "La misma entrada se puede mandar (o vender) más de una vez sin que nadie se entere hasta el día del evento.",
    escrow: "Cada archivo de entrega se identifica por su contenido — si ya se usó en otra venta, la plataforma la rechaza.",
  },
];

const faqs = [
  {
    q: "¿Por qué tengo que pagar antes de recibir la entrada?",
    a: "Porque el pago no se le entrega al vendedor en ese momento — queda autorizado y retenido por Mercado Pago. Es la única forma de que el vendedor tenga la garantía de que existe un pago real antes de entregar, sin que vos pierdas el control de tu plata: si algo sale mal, todavía no se le pagó a nadie.",
  },
  {
    q: "¿Qué pasa si la entrada que me mandaron es falsa o ya fue usada?",
    a: "Tenés una ventana de tiempo después de descargarla para reclamar. Mientras el reclamo esté abierto, el pago sigue retenido — no se libera. Un administrador revisa el caso y decide si corresponde liberar el pago al vendedor o cancelar la operación.",
  },
  {
    q: "¿Qué pasa si el vendedor nunca sube la entrada?",
    a: "El pago sigue retenido, nunca capturado. Podés abrir un reclamo en cualquier momento mientras esperás, y si nadie lo resuelve antes de los 7 días que da Mercado Pago, la autorización se cae sola — no se le cobra nada a tu tarjeta más allá de esa retención temporal.",
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
  {
    q: "¿Esto es legal?",
    a: "Sí. El dinero nunca pasa por una cuenta propia de la plataforma — corre sobre Mercado Pago, que es quien está habilitado para procesar pagos de terceros. Y la comisión que cobramos se factura electrónicamente ante ARCA con CAE, como cualquier otro servicio formal.",
  },
  {
    q: "¿Qué pasa con mis datos?",
    a: "Los datos de pago los maneja directamente Mercado Pago. Los tokens de acceso de los vendedores conectados se guardan encriptados, y no se comparten con nadie más que con las partes involucradas en cada operación.",
  },
];

export default function Home() {
  const example = calculateOrderFees(1500000); // ejemplo: entrada de $15.000

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-black/10 bg-zinc-50 px-6 py-20 dark:border-white/10 dark:bg-black">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-brand/20 blur-3xl dark:bg-brand/10"
        />
        <div className="relative mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-zinc-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
              <LockIcon className="h-3.5 w-3.5 text-brand" />
              Pago retenido con Mercado Pago
            </span>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
              Vendé y comprá entradas sin el tira y afloja de siempre
            </h1>
            <p className="mt-5 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
              El comprador paga, el dinero queda retenido, y recién se libera
              al vendedor cuando la entrada fue entregada y confirmada.
              Ninguna de las dos partes tiene que confiar a ciegas en la
              otra.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/listings"
                className="flex h-12 items-center justify-center rounded-full bg-brand px-6 text-sm font-medium text-brand-foreground shadow-md shadow-brand/20 transition-colors hover:bg-brand-hover"
              >
                Ver entradas en venta
              </Link>
              <Link
                href="/listings/new"
                className="flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-6 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/10 dark:bg-transparent dark:hover:bg-white/[.06]"
              >
                Publicar una entrada
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-zinc-500 lg:justify-start dark:text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <BuildingBankIcon className="h-4 w-4" /> Procesado por Mercado Pago
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ReceiptIcon className="h-4 w-4" /> Comisión facturada en ARCA
              </span>
              <span className="inline-flex items-center gap-1.5">
                <LockIcon className="h-4 w-4" /> Sin acceso a tu tarjeta
              </span>
            </div>
          </div>

          {/* Mockup del estado de una orden */}
          <div className="relative hidden lg:block">
            <div
              aria-hidden="true"
              className="absolute -inset-6 -z-10 rounded-[2rem] bg-brand/10 blur-2xl dark:bg-brand/15"
            />
            <div className="mx-auto w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-zinc-400">Orden #A8F3K2</span>
                <span className="rounded-full bg-brand-muted px-2.5 py-1 text-xs font-medium text-brand-muted-foreground">
                  Pago retenido
                </span>
              </div>

              <p className="mt-5 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
                {formatArsCents(example.amountArs)}
              </p>
              <p className="text-xs text-zinc-500">Total pagado por el comprador</p>

              <div className="mt-5 flex items-center gap-1.5">
                {[true, true, false, false].map((active, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${active ? "bg-brand" : "bg-zinc-100 dark:bg-zinc-800"}`}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">Entregada — esperando confirmación</p>

              <div className="mt-5 flex flex-col gap-2 border-t border-black/10 pt-4 text-sm dark:border-white/10">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Recibe el vendedor</span>
                  <span className="font-medium text-zinc-950 dark:text-zinc-50">
                    {formatArsCents(example.sellerPayoutArs)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Comisión Escrow.ar</span>
                  <span className="font-medium text-zinc-950 dark:text-zinc-50">
                    {formatArsCents(example.applicationFeeArs)}
                  </span>
                </div>
              </div>

              <p className="mt-5 flex items-center gap-1.5 text-xs text-zinc-500">
                <LockIcon className="h-3.5 w-3.5" />
                Se libera solo al confirmarse la entrega
              </p>
            </div>
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

      {/* Línea de tiempo del dinero */}
      <section className="border-y border-black/10 px-6 py-16 dark:border-white/10">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            El recorrido de tu pago
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-4">
            {moneyTimeline.map((step, i) => (
              <div key={step.label} className="relative">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-foreground">
                    {i + 1}
                  </div>
                  {i < moneyTimeline.length - 1 ? (
                    <div className="hidden h-px flex-1 bg-black/10 sm:block dark:bg-white/10" />
                  ) : null}
                </div>
                <p className="mt-3 font-medium text-zinc-950 dark:text-zinc-50">
                  {step.label}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {step.detail}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-zinc-500">
            Si el comprador reclama antes de que se libere, el recorrido se
            frena ahí: un admin decide si sigue hasta &quot;Liberado&quot; o si la
            autorización se cancela y la plata nunca sale de la tarjeta.
          </p>
        </div>
      </section>

      {/* Cómo funciona — comprador / vendedor */}
      <section className="bg-zinc-50 px-6 py-16 dark:bg-zinc-950">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Cómo funciona, paso a paso
          </h2>

          <div className="mt-10 grid gap-10 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Si comprás
              </h3>
              <ol className="mt-4 flex flex-col gap-5">
                {buyerSteps.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-muted text-brand-muted-foreground shadow-sm">
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
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-muted text-brand-muted-foreground shadow-sm">
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

      {/* Ejemplo de comisión */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            La comisión, sin letra chica
          </h2>
          <p className="mt-4 text-center text-zinc-600 dark:text-zinc-400">
            Se reparte entre las dos partes, y se ve desglosada antes de
            pagar. Por ejemplo, para una entrada de {formatArsCents(example.priceArs)}:
          </p>

          <div className="mt-8 overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
            <div className="flex flex-col gap-3 p-6 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Precio publicado por el vendedor
                </span>
                <span className="font-medium">{formatArsCents(example.priceArs)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">
                  + comisión que suma el comprador
                </span>
                <span className="font-medium">{formatArsCents(example.buyerFeeArs)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-brand-muted px-6 py-3 text-sm font-semibold text-brand-muted-foreground">
              <span>Total que paga el comprador</span>
              <span>{formatArsCents(example.amountArs)}</span>
            </div>
            <div className="flex flex-col gap-3 p-6 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">
                  − comisión que descuenta el vendedor
                </span>
                <span className="font-medium">{formatArsCents(example.sellerFeeArs)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-brand-muted px-6 py-3 text-sm font-semibold text-brand-muted-foreground">
              <span>Recibe el vendedor</span>
              <span>{formatArsCents(example.sellerPayoutArs)}</span>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-zinc-500">
            En total, Escrow.ar se queda con{" "}
            {formatArsCents(example.applicationFeeArs)} de comisión sobre
            esta venta — facturados electrónicamente en ARCA.
          </p>
        </div>
      </section>

      {/* Confianza */}
      <section className="border-y border-black/10 bg-zinc-50 px-6 py-16 dark:border-white/10 dark:bg-zinc-950">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Por qué es seguro
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {trustPoints.map((point) => (
              <div
                key={point.title}
                className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-900"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-muted text-brand-muted-foreground">
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

      {/* Comparación */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Antes vs. con Escrow.ar
          </h2>
          <div className="mt-10 overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
            <div className="grid grid-cols-2 border-b border-black/10 text-sm font-semibold dark:border-white/10">
              <div className="border-r border-black/10 px-4 py-3 text-zinc-500 dark:border-white/10">
                Por WhatsApp / transferencia
              </div>
              <div className="px-4 py-3 text-zinc-950 dark:text-zinc-50">
                Con Escrow.ar
              </div>
            </div>
            {comparisonRows.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-2 border-b border-black/10 text-sm last:border-b-0 dark:border-white/10"
              >
                <div className="flex items-start gap-2 border-r border-black/10 px-4 py-4 text-zinc-600 dark:border-white/10 dark:text-zinc-400">
                  <XCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                  {row.old}
                </div>
                <div className="flex items-start gap-2 px-4 py-4 text-zinc-800 dark:text-zinc-200">
                  <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  {row.escrow}
                </div>
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
        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 px-8 py-16 text-center shadow-xl">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            ¿Listo para operar sin desconfianza?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-indigo-100">
            Publicá tu entrada o buscá una para comprar — el pago queda
            protegido de punta a punta.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/listings"
              className="flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-medium text-indigo-700 shadow-md transition-colors hover:bg-indigo-50"
            >
              Ver entradas en venta
            </Link>
            <Link
              href="/listings/new"
              className="flex h-12 items-center justify-center rounded-full border border-white/30 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Publicar una entrada
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/10 px-6 py-12 text-sm dark:border-white/10">
        <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-3">
          <div>
            <p className="font-semibold text-zinc-950 dark:text-zinc-50">Escrow.ar</p>
            <p className="mt-2 text-xs text-zinc-500">
              Pago retenido para reventa de entradas. Los pagos se procesan a
              través de Mercado Pago; la plataforma nunca tiene acceso a tus
              datos de tarjeta ni a fondos de terceros en una cuenta propia.
            </p>
          </div>
          <div>
            <p className="font-medium text-zinc-950 dark:text-zinc-50">Producto</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-zinc-600 dark:text-zinc-400">
              <li>
                <Link href="/listings" className="hover:underline">
                  Ver entradas en venta
                </Link>
              </li>
              <li>
                <Link href="/listings/new" className="hover:underline">
                  Publicar una entrada
                </Link>
              </li>
              <li>
                <Link href="/account/mercadopago" className="hover:underline">
                  Conectar Mercado Pago
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-zinc-950 dark:text-zinc-50">Legal</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-zinc-600 dark:text-zinc-400">
              <li>
                <Link href="/legal/terminos" className="hover:underline">
                  Términos y condiciones
                </Link>
              </li>
              <li>
                <Link href="/legal/privacidad" className="hover:underline">
                  Privacidad
                </Link>
              </li>
              <li>
                <a href="mailto:hola@escrow.ar" className="hover:underline">
                  hola@escrow.ar
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </main>
  );
}
