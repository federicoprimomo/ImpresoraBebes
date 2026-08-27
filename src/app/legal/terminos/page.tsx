export const metadata = { title: "Términos y condiciones — Escrow.ar" };

export default function TerminosPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Términos y condiciones
      </h1>
      <p className="mt-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Borrador de referencia — describe cómo funciona el servicio tal
        como está construido hoy. No reemplaza una revisión por un
        abogado antes de publicarse como términos vinculantes.
      </p>

      <div className="prose prose-zinc mt-8 flex flex-col gap-6 text-sm text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            1. Qué es Escrow.ar
          </h2>
          <p className="mt-2">
            Escrow.ar es una plataforma que intermedia la reventa de
            entradas digitales entre un comprador y un vendedor. El pago
            se procesa a través de Mercado Pago: queda autorizado y
            retenido, y se libera al vendedor recién cuando la entrada fue
            entregada y confirmada, o vence el plazo de reclamo sin
            objeciones. Escrow.ar no es la organizadora del evento ni
            garantiza la validez de la entrada más allá del proceso de
            entrega y disputa descripto en esta plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            2. Cuentas y verificación
          </h2>
          <p className="mt-2">
            Para operar hace falta iniciar sesión con una cuenta de
            Google. Para vender, además hace falta conectar una cuenta de
            Mercado Pago propia — el dinero se transfiere directamente
            entre la tarjeta del comprador y esa cuenta, nunca por una
            cuenta de Escrow.ar.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            3. Comisión
          </h2>
          <p className="mt-2">
            Escrow.ar cobra una comisión sobre cada operación, dividida
            entre comprador y vendedor. El desglose se muestra antes de
            confirmar el pago. La comisión se factura electrónicamente
            ante ARCA.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            4. Entrega y reclamos
          </h2>
          <p className="mt-2">
            El vendedor entrega la entrada subiéndola a la plataforma. El
            comprador tiene una ventana de tiempo desde la descarga para
            reportar un problema. Mientras el reclamo esté abierto, el
            pago permanece retenido. Un administrador de la plataforma
            revisa cada reclamo y decide si corresponde liberar el pago al
            vendedor o cancelar la autorización.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            5. Límites de responsabilidad
          </h2>
          <p className="mt-2">
            Escrow.ar no participa en la organización del evento ni
            controla la autenticidad de cada entrada más allá de detectar
            que el mismo archivo no se haya usado en más de una venta.
            Mercado Pago retiene la autorización de pago por un máximo de
            7 días; si un reclamo no se resuelve en ese plazo, la
            operación se cae automáticamente.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            6. Contacto
          </h2>
          <p className="mt-2">
            Consultas a{" "}
            <a href="mailto:hola@escrow.ar" className="underline">
              hola@escrow.ar
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
